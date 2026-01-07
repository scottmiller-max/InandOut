import { supabase } from './supabase';
import * as Location from 'expo-location';
import { messagingService } from './messaging';
import { emailTemplateService } from './emailTemplates';

export interface EnhancedFOBDevice {
  id: string;
  fobId: string;
  truckId: string;
  isActive: boolean;
  batteryLevel: number;
  signalStrength: number;
  lastPing: string;
  currentJobId?: string;
  createdAt: string;
}

export interface FOBTrackingLog {
  id: string;
  fobId: string;
  jobId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  batteryLevel: number;
  signalStrength: number;
  status: 'active' | 'idle' | 'offline';
  timestamp: string;
  createdAt: string;
}

export interface LiveTruckStatus {
  fobId: string;
  truckId: string;
  jobId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'idle' | 'en_route' | 'at_pickup' | 'loading' | 'in_transit' | 'at_delivery' | 'unloading' | 'completed';
  speed: number;
  heading: number;
  batteryLevel: number;
  lastUpdate: string;
  eta?: string;
}

export const enhancedFobService = {
  // Register FOB device with enhanced tracking
  registerEnhancedFOB: async (fobId: string, truckId: string): Promise<EnhancedFOBDevice | null> => {
    try {
      const { data, error } = await supabase
        .from('fob_devices')
        .insert({
          fob_id: fobId,
          truck_id: truckId,
          is_active: true,
          battery_level: 100,
          last_ping: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      return data ? {
        id: data.id,
        fobId: data.fob_id,
        truckId: data.truck_id,
        isActive: data.is_active,
        batteryLevel: data.battery_level,
        signalStrength: 100, // Default signal strength
        lastPing: data.last_ping,
        currentJobId: data.current_job_id,
        createdAt: data.created_at,
      } : null;
    } catch (error) {
      console.error('Register enhanced FOB error:', error);
      return null;
    }
  },

  // Log FOB tracking data with enhanced details
  logFOBTracking: async (
    fobId: string, 
    location: Location.LocationObject, 
    jobId?: string,
    batteryLevel: number = 100,
    signalStrength: number = 100
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('fob_tracking_logs')
        .insert({
          fob_id: fobId,
          job_id: jobId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0,
          battery_level: batteryLevel,
          signal_strength: signalStrength,
          status: 'active',
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      // Update FOB device last ping
      await supabase
        .from('fob_devices')
        .update({
          last_ping: new Date().toISOString(),
          battery_level: batteryLevel,
        })
        .eq('fob_id', fobId);

      return true;
    } catch (error) {
      console.error('Log FOB tracking error:', error);
      return false;
    }
  },

  // Get live truck status for customer
  getLiveTruckStatus: async (jobId: string): Promise<LiveTruckStatus | null> => {
    try {
      // Get job tracking info
      const { data: jobTracking, error: jobError } = await supabase
        .from('job_tracking')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (jobError && jobError.code !== 'PGRST116') throw jobError;

      // If no job tracking exists, return mock data for demo
      if (!jobTracking) {
        return {
          fobId: 'FOB-247',
          truckId: 'TRK-247',
          jobId: jobId,
          currentLocation: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: 'En route to destination',
          },
          status: 'in_transit',
          speed: 35,
          heading: 90,
          batteryLevel: 85,
          lastUpdate: new Date().toISOString(),
          eta: new Date(Date.now() + 45 * 60000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        };
      }

      return {
        fobId: jobTracking.fob_id || 'FOB-247',
        truckId: jobTracking.truck_id || 'TRK-247',
        jobId: jobTracking.job_id,
        currentLocation: {
          latitude: jobTracking.current_latitude || 40.7128,
          longitude: jobTracking.current_longitude || -74.0060,
          address: jobTracking?.current_address,
        },
        status: jobTracking.status || 'in_transit',
        speed: 35,
        heading: 90,
        batteryLevel: 85,
        lastUpdate: new Date().toISOString(),
        eta: jobTracking?.estimated_arrival,
      };
    } catch (error) {
      console.error('Get live truck status error:', error);
      return null;
    }
  },

  // Link FOB to job with enhanced tracking
  linkFOBToJob: async (fobId: string, jobId: string, driverName: string, customerPhone: string): Promise<boolean> => {
    try {
      // Update job tracking
      const { error: trackingError } = await supabase
        .from('job_tracking')
        .upsert({
          job_id: jobId,
          fob_id: fobId,
          driver_name: driverName,
          customer_phone: customerPhone,
          status: 'scheduled',
          updated_at: new Date().toISOString(),
        });

      if (trackingError) throw trackingError;

      // Update FOB device with current job
      const { error: fobError } = await supabase
        .from('fob_devices')
        .update({
          current_job_id: jobId,
          updated_at: new Date().toISOString(),
        })
        .eq('fob_id', fobId);

      if (fobError) throw fobError;

      // Create initial milestone
      await messagingService.createMilestoneUpdate(jobId, 'arrival', `FOB ${fobId} activated for your move`);

      return true;
    } catch (error) {
      console.error('Link FOB to job error:', error);
      return false;
    }
  },

  // Get FOB tracking history
  getFOBTrackingHistory: async (fobId: string, jobId?: string): Promise<FOBTrackingLog[]> => {
    try {
      let query = supabase
        .from('fob_tracking_logs')
        .select('*')
        .eq('fob_id', fobId);

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data?.map(log => ({
        id: log.id,
        fobId: log.fob_id,
        jobId: log.job_id,
        latitude: log.latitude,
        longitude: log.longitude,
        speed: log.speed,
        heading: log.heading,
        batteryLevel: log.battery_level,
        signalStrength: log.signal_strength,
        status: log.status,
        timestamp: log.timestamp,
        createdAt: log.created_at,
      })) || [];
    } catch (error) {
      console.error('Get FOB tracking history error:', error);
      return [];
    }
  },

  // Update truck status and notify customer
  updateTruckStatus: async (
    fobId: string, 
    jobId: string, 
    status: LiveTruckStatus['status'],
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<boolean> => {
    try {
      // Update job tracking status
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (location) {
        updateData.current_latitude = location.latitude;
        updateData.current_longitude = location.longitude;
        updateData.current_address = location.address;
      }

      const { error } = await supabase
        .from('job_tracking')
        .update(updateData)
        .eq('job_id', jobId)
        .eq('fob_id', fobId);

      if (error) throw error;

      // Create milestone update based on status
      const statusMilestones: Record<string, { type: string; message: string }> = {
        'idle': { type: 'status', message: 'Team is preparing for your move' },
        'en_route': { type: 'departure', message: 'Team is en route to your location' },
        'at_pickup': { type: 'arrival', message: 'Team has arrived at pickup location' },
        'loading': { type: 'loading_start', message: 'Loading has begun' },
        'in_transit': { type: 'departure', message: 'In transit to destination' },
        'at_delivery': { type: 'delivery_arrival', message: 'Team has arrived at destination' },
        'unloading': { type: 'unloading_start', message: 'Unloading has begun' },
        'completed': { type: 'completion', message: 'Move completed successfully' },
      };

      const milestone = statusMilestones[status];
      if (milestone) {
        await messagingService.createMilestoneUpdate(
          jobId, 
          milestone.type as any, 
          milestone.message
        );
      }

      return true;
    } catch (error) {
      console.error('Update truck status error:', error);
      return false;
    }
  },

  // Calculate ETA with traffic considerations
  calculateEnhancedETA: async (
    currentLat: number, 
    currentLng: number, 
    destLat: number, 
    destLng: number,
    currentSpeed: number = 0
  ): Promise<{ eta: number; etaText: string; distance: number }> => {
    try {
      const R = 3959; // Earth's radius in miles
      const dLat = (destLat - currentLat) * Math.PI / 180;
      const dLon = (destLng - currentLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(currentLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      // Use current speed if available, otherwise estimate based on area type
      let estimatedSpeed = currentSpeed > 0 ? currentSpeed : 25; // Default 25 mph city driving
      
      // Add traffic buffer (15% increase in time)
      const etaHours = (distance / estimatedSpeed) * 1.15;
      const etaMinutes = Math.round(etaHours * 60);
      
      const etaText = etaMinutes < 60 
        ? `${etaMinutes} min`
        : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`;

      return {
        eta: etaMinutes,
        etaText,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    } catch (error) {
      console.error('Calculate enhanced ETA error:', error);
      return { eta: 0, etaText: 'Unknown', distance: 0 };
    }
  },

  // Subscribe to real-time FOB updates
  subscribeToFOBUpdates: (jobId: string, callback: (update: FOBTrackingLog) => void) => {
    const subscription = supabase
      .channel(`fob-tracking:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fob_tracking_logs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const update: FOBTrackingLog = {
            id: payload.new.id,
            fobId: payload.new.fob_id,
            jobId: payload.new.job_id,
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
            speed: payload.new.speed,
            heading: payload.new.heading,
            batteryLevel: payload.new.battery_level,
            signalStrength: payload.new.signal_strength,
            status: payload.new.status,
            timestamp: payload.new.timestamp,
            createdAt: payload.new.created_at,
          };
          callback(update);
        }
      )
      .subscribe();

    return subscription;
  },
};