import { Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';

export const phoneActions = {
  // Make phone calls
  makeCall: async (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Phone calls are not supported on this device');
    }
  },

  // Send SMS
  sendSMS: async (phoneNumber: string, message?: string) => {
    const url = `sms:${phoneNumber}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'SMS is not supported on this device');
    }
  },

  // Open maps for navigation
  openMaps: async (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    
    if (Platform.OS === 'ios') {
      const url = `maps://app?daddr=${encodedAddress}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to Apple Maps web
        await Linking.openURL(`https://maps.apple.com/?daddr=${encodedAddress}`);
      }
    } else {
      // Android - Google Maps
      const url = `google.navigation:q=${encodedAddress}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`);
      }
    }
  },

  // Get current location
  getCurrentLocation: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for GPS tracking');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };
    } catch (error) {
      Alert.alert('Error', 'Unable to get current location');
      return null;
    }
  },

  // Open email client
  sendEmail: async (email: string, subject?: string, body?: string) => {
    const url = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Email is not supported on this device');
    }
  },
};