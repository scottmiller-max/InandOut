import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { emailService } from './email';
import { supabase } from './supabase';
import { sendBookingConfirmationEmail } from './bookingEmail';

// Configure notification behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

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

  notifyJobBooked: async (jobId: string, jobStatus?: string) => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('*, customers(*)')
        .eq('id', jobId)
        .single();

      if (!job || !job.customers) return;

      // Only send booking confirmation email when status is 'confirmed' or 'scheduled'
      const status = jobStatus || job.status;
      if (status === 'confirmed' || status === 'scheduled') {
        const emailResult = await sendBookingConfirmationEmail(jobId);

        if (!emailResult.success) {
          console.error('Failed to send booking confirmation email:', emailResult.error);
        }
      }

      const customer = job.customers;
      const moveDate = new Date(job.move_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Send push notification
      await notificationService.scheduleNotification(
        'Booking Confirmed!',
        `Your move on ${moveDate} has been confirmed. Job #${job.job_number}`
      );
    } catch (error) {
      console.error('Error sending job booked notification:', error);
    }
  },

  // Manual resend for admin use - skips throttle check
  resendBookingConfirmation: async (jobId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await sendBookingConfirmationEmail(jobId, { skipThrottle: true });
      return result;
    } catch (error) {
      console.error('Error resending booking confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  notifyJobStatusChange: async (jobId: string, status: string, message: string) => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('*, customers(*)')
        .eq('id', jobId)
        .single();

      if (!job || !job.customers) return;

      const customer = job.customers;

      await emailService.sendJobStatusUpdate({
        customerEmail: customer.email,
        customerName: `${customer.first_name} ${customer.last_name}`,
        jobNumber: job.job_number,
        status: status.toUpperCase(),
        message,
        userId: customer.user_id,
        jobId: jobId,
      });

      await notificationService.scheduleNotification(
        `Job Update - ${status}`,
        message
      );
    } catch (error) {
      console.error('Error sending job status notification:', error);
    }
  },

  notifyTeamAssigned: async (jobId: string, teamLeadId: string) => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      const { data: teamLead } = await supabase
        .from('users')
        .select('*')
        .eq('id', teamLeadId)
        .single();

      if (!job || !teamLead) return;

      const moveDate = new Date(job.move_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await emailService.sendTeamAssignment({
        teamEmail: teamLead.email,
        teamMemberName: `${teamLead.first_name} ${teamLead.last_name}`,
        jobNumber: job.job_number,
        moveDate,
        fromAddress: job.from_address,
        toAddress: job.to_address,
        userId: teamLeadId,
        jobId: jobId,
      });
    } catch (error) {
      console.error('Error sending team assignment notification:', error);
    }
  },

  notifyPaymentReceived: async (jobId: string, amount: number, paymentMethod: string, transactionId: string) => {
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('*, customers(*)')
        .eq('id', jobId)
        .single();

      if (!job || !job.customers) return;

      const customer = job.customers;

      await emailService.sendPaymentReceipt({
        customerEmail: customer.email,
        customerName: `${customer.first_name} ${customer.last_name}`,
        jobNumber: job.job_number,
        amount: `$${amount.toFixed(2)}`,
        paymentMethod,
        transactionId,
        userId: customer.user_id,
        jobId: jobId,
      });

      await notificationService.scheduleNotification(
        'Payment Received',
        `Thank you! Your payment of $${amount.toFixed(2)} has been received.`
      );
    } catch (error) {
      console.error('Error sending payment notification:', error);
    }
  },
};