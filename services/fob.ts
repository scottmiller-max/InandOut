import { supabase } from './supabase';
import * as Location from 'expo-location';
import { messagingService } from './messaging';

export interface FOBDevice {
  id: string;
  fobId: string;
  truckId: string;
  isActive: boolean;
  batteryLevel: number;
  lastPing: string;
  createdAt: string;
}

export interface TruckLocation {
  id: string;
  fobId: string;
  truckId: string;
  jobId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
  status: 'idle' | 'en_route' | 'at_pickup' | 'loading' | 'in_transit' | 'at_delivery' | 'unloading' | 'completed';
}

export interface JobTracking {
  id: string;
  jobId: string;
  fobId: string;
  truckId: string;
  driverName: string;
  customerPhone: string;
  estimatedArrival: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: string;
  milestones: Array<{
    id: string;
    type: 'arrival' | 'paperwork' | 'packing_start' | 'packing_finish' | 'loading_start' | 'loading_finish' | 'departure' | 'delivery_arrival' | 'unloading_start' | 'unloading_finish' | 'completion';
    timestamp: string;
    description: string;
    location?: string;
  }>;
}

export const fobService = {
  // Register new FOB device
  registerFOB: async (fobId: string, truckId: string): Promise<FOBDevice | null> => {
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
        lastPing: data.last_ping,
        createdAt: data.created_at,
      } : null;
    } catch (error) {
      console.error('Register FOB error:', error);
      return null;
    }
  },

  // Update FOB location
  updateFOBLocation: async (fobId: string, location: Location.LocationObject, status: TruckLocation['status']): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('truck_locations')
        .insert({
          fob_id: fobId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0,
          timestamp: new Date().toISOString(),
          status,
        });

      if (error) throw error;

      // Update FOB last ping
      await supabase
        .from('fob_devices')
        .update({
          last_ping: new Date().toISOString(),
        })
        .eq('fob_id', fobId);

      return true;
    } catch (error) {
      console.error('Update FOB location error:', error);
      return false;
    }
  },

  // Get job tracking data
  getJobTracking: async (jobId: string): Promise<JobTracking | null> => {
    try {
      const { data, error } = await supabase
        .from('job_tracking')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Return mock data if no job tracking exists
      if (!data) {
        return {
          id: 'mock-tracking-id',
          jobId: jobId,
          fobId: 'FOB-247',
          truckId: 'TRK-247',
          driverName: 'Mike Rodriguez',
          customerPhone: '+1 (555) 123-4567',
          estimatedArrival: new Date(Date.now() + 45 * 60000).toISOString(),
          currentLocation: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: 'En route to Brooklyn, NY',
          },
          status: 'in_transit',
          milestones: [
            {
              id: 'milestone-1',
              type: 'departure',
              timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
              description: 'Team departed from origin',
              location: '123 Oak Street, New York, NY',
            },
            {
              id: 'milestone-2',
              type: 'loading_finish',
              timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
              description: 'All items loaded and secured',
              location: '123 Oak Street, New York, NY',
            },
          ],
        };
      }

      return {
        id: data.id,
        jobId: data.job_id,
        fobId: data.fob_id,
        truckId: data.truck_id,
        driverName: data.driver_name,
        customerPhone: data.customer_phone,
        estimatedArrival: data.estimated_arrival,
        currentLocation: {
          latitude: data.current_latitude,
          longitude: data.current_longitude,
          address: data.current_address,
        },
        status: data.status,
        milestones: [],
      };
    } catch (error) {
      console.error('Get job tracking error:', error);
      return null;
    }
  },

  // Create job milestone
  createMilestone: async (jobId: string, type: JobTracking['milestones'][0]['type'], description: string, location?: string): Promise<boolean> => {
    try {
      // Use messaging service to create milestone update
      await messagingService.createMilestoneUpdate(jobId, type, description);
      return true;
    } catch (error) {
      console.error('Create milestone error:', error);
      return false;
    }
  },

  // Calculate ETA based on current location and destination
  calculateETA: (currentLat: number, currentLng: number, destLat: number, destLng: number, averageSpeed: number = 30): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (destLat - currentLat) * Math.PI / 180;
    const dLon = (destLng - currentLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Return ETA in minutes
    return Math.round((distance / averageSpeed) * 60);
  },

  // Start FOB tracking for a job
  startJobTracking: async (jobId: string, fobId: string, truckId: string, driverName: string, customerPhone: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('job_tracking')
        .insert({
          job_id: jobId,
          fob_id: fobId,
          truck_id: truckId,
          driver_name: driverName,
          customer_phone: customerPhone,
          status: 'en_route',
        });

      if (error) throw error;

      // Create initial milestone
      await fobService.createMilestone(jobId, 'departure', 'Moving team has departed and is en route to your location');

      return true;
    } catch (error) {
      console.error('Start job tracking error:', error);
      return false;
    }
  },

  // Link FOB to specific job
  linkFOBToJob: async (fobId: string, jobId: string, truckId: string): Promise<boolean> => {
    try {
      // Update truck location with job ID
      const { error } = await supabase
        .from('truck_locations')
        .update({ job_id: jobId, truck_id: truckId })
        .eq('fob_id', fobId);

      if (error) throw error;

      // Create milestone for FOB activation
      await fobService.createMilestone(jobId, 'departure', `FOB ${fobId} activated for truck ${truckId}`);

      return true;
    } catch (error) {
      console.error('Link FOB to job error:', error);
      return false;
    }
  },

  // Get active FOB devices
  getActiveFOBs: async (): Promise<FOBDevice[]> => {
    try {
      const { data, error } = await supabase
        .from('fob_devices')
        .select('*')
        .eq('is_active', true)
        .order('last_ping', { ascending: false });

      if (error) throw error;

      return data?.map(fob => ({
        id: fob.id,
        fobId: fob.fob_id,
        truckId: fob.truck_id,
        isActive: fob.is_active,
        batteryLevel: fob.battery_level,
        lastPing: fob.last_ping,
        createdAt: fob.created_at,
      })) || [];
    } catch (error) {
      console.error('Get active FOBs error:', error);
      return [];
    }
  },
};