import * as Location from 'expo-location';
import { supabase } from './supabase';

export interface TrackingData {
  id: string;
  moveId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  status: 'loading' | 'in_transit' | 'unloading' | 'completed';
}

export const trackingService = {
  // Request location permissions
  requestLocationPermissions: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }
    return status;
  },

  // Get current location
  getCurrentLocation: async (): Promise<Location.LocationObject | null> => {
    try {
      await trackingService.requestLocationPermissions();
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  },

  // Start tracking (for driver app)
  startTracking: async (moveId: string) => {
    try {
      await trackingService.requestLocationPermissions();
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Update every 50 meters
        },
        async (location) => {
          await trackingService.updateLocation(moveId, location);
        }
      );

      return subscription;
    } catch (error) {
      console.error('Error starting tracking:', error);
      return null;
    }
  },

  // Update location in database
  updateLocation: async (moveId: string, location: Location.LocationObject) => {
    try {
      const trackingData: Partial<TrackingData> = {
        moveId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
      };

      const { error } = await supabase
        .from('tracking')
        .insert(trackingData);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating location:', error);
    }
  },

  // Get tracking data for a move
  getTrackingData: async (moveId: string): Promise<TrackingData[]> => {
    try {
      const { data, error } = await supabase
        .from('tracking')
        .select('*')
        .eq('moveId', moveId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting tracking data:', error);
      return [];
    }
  },

  // Calculate ETA based on current location and destination
  calculateETA: async (currentLat: number, currentLng: number, destLat: number, destLng: number) => {
    try {
      // This is a simplified calculation - in production, use Google Maps API or similar
      const distance = trackingService.calculateDistance(currentLat, currentLng, destLat, destLng);
      const averageSpeed = 30; // mph average city driving
      const etaHours = distance / averageSpeed;
      const etaMinutes = Math.round(etaHours * 60);
      
      return etaMinutes;
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },
};