import { supabase } from './supabase';
import { notificationService } from './notifications';
import { slackMessaging } from './slackMessaging';

export interface AdminAlert {
  id: string;
  alertType: 'consultation_booked' | 'ai_booking_complete' | 'payment_received' | 'customer_issue';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId?: string;
  jobId?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export const adminNotificationService = {
  // Send consultation booking alert
  sendConsultationBookedAlert: async (consultationData: {
    customerName: string;
    customerEmail: string;
    consultationDate: string;
    consultationType: 'video' | 'ai';
    estimatedCost?: number;
  }): Promise<boolean> => {
    try {
      const alert: Omit<AdminAlert, 'id' | 'createdAt'> = {
        alertType: 'consultation_booked',
        title: 'New Consultation Booked',
        message: `${consultationData.customerName} (${consultationData.customerEmail}) has booked a ${consultationData.consultationType} consultation for ${new Date(consultationData.consultationDate).toLocaleDateString()}.`,
        priority: 'medium',
        metadata: consultationData,
        isRead: false,
      };

      // Store in admin alerts table
      const { error } = await supabase
        .from('admin_alerts')
        .insert(alert);

      if (error) {
        console.error('Store admin alert error:', error);
      }

      console.log('ADMIN ALERT:', alert.title, '-', alert.message);

      await slackMessaging.sendNotification({
        text: `New Consultation Booked`,
        attachments: [
          {
            fallback: alert.message,
            color: '#3b82f6',
            title: alert.title,
            text: alert.message,
            fields: [
              {
                title: 'Customer',
                value: consultationData.customerName,
                short: true,
              },
              {
                title: 'Type',
                value: consultationData.consultationType,
                short: true,
              },
              {
                title: 'Date',
                value: new Date(consultationData.consultationDate).toLocaleDateString(),
                short: true,
              },
              {
                title: 'Estimated Cost',
                value: consultationData.estimatedCost ? `$${consultationData.estimatedCost}` : 'TBD',
                short: true,
              },
            ],
            footer: 'IN&OUT Moving Admin',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      });

      return true;
    } catch (error) {
      console.error('Send consultation booked alert error:', error);
      return false;
    }
  },

  // Send AI booking completion alert
  sendAIBookingAlert: async (bookingData: {
    customerName: string;
    customerEmail: string;
    analysis: any;
    detectedItems: any;
    estimatedCost: number;
  }): Promise<boolean> => {
    try {
      const alert: Omit<AdminAlert, 'id' | 'createdAt'> = {
        alertType: 'ai_booking_complete',
        title: 'AI Booking Requires Family Partner Approval',
        message: `${bookingData.customerName} completed AI booking analysis. Estimated cost: $${bookingData.estimatedCost}. Review required for Family Partner approval.`,
        priority: 'high',
        metadata: {
          ...bookingData,
          requiresApproval: true,
          approvalType: 'family_partner',
        },
        isRead: false,
      };

      // Store in admin alerts table
      const { error } = await supabase
        .from('admin_alerts')
        .insert(alert);

      if (error) {
        console.error('Store admin alert error:', error);
      }

      console.log('URGENT ADMIN ALERT:', alert.title, '-', alert.message);

      await slackMessaging.sendUrgentAlert(
        'AI Booking Requires Family Partner Approval',
        alert.message,
        {
          Customer: `${bookingData.customerName} (${bookingData.customerEmail})`,
          'Estimated Cost': `$${bookingData.estimatedCost}`,
          'Detected Items': JSON.stringify(bookingData.detectedItems).slice(0, 100),
          Status: 'Pending Approval',
        }
      );

      return true;
    } catch (error) {
      console.error('Send AI booking alert error:', error);
      return false;
    }
  },

  // Get unread admin alerts
  getUnreadAlerts: async (): Promise<AdminAlert[]> => {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data?.map(alert => ({
        id: alert.id,
        alertType: alert.alert_type,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        customerId: alert.customer_id,
        jobId: alert.job_id,
        metadata: alert.metadata,
        isRead: alert.is_read,
        createdAt: alert.created_at,
      })) || [];
    } catch (error) {
      console.error('Get unread alerts error:', error);
      return [];
    }
  },

  // Mark alert as read
  markAlertAsRead: async (alertId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Mark alert as read error:', error);
      return false;
    }
  },
};