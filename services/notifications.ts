import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  // Request notification permissions
  requestPermissions: async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for notifications');
    }

    return finalStatus;
  },

  // Get push notification token
  getPushToken: async () => {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'demo-project-id', // Replace with your actual project ID when ready
      });
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  // Schedule local notification
  scheduleNotification: async (title: string, body: string, trigger?: Notifications.NotificationTriggerInput) => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: trigger || null,
      });
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  },

  // Send move update notification
  sendMoveUpdate: async (moveId: string, status: string, message: string) => {
    return notificationService.scheduleNotification(
      `Move Update - ${moveId}`,
      `Status: ${status} - ${message}`
    );
  },

  // Send ETA notification
  sendETAUpdate: async (eta: string, location: string) => {
    return notificationService.scheduleNotification(
      'ETA Update',
      `Your moving team will arrive at ${location} in ${eta}`
    );
  },
};