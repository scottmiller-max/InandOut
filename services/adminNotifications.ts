import { supabase } from './supabase';
import { notificationService } from './notifications';

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

      // Send immediate notification to admin team
      console.log('🔔 ADMIN ALERT:', alert.title, '-', alert.message);

      // In production, integrate with Slack, email, or push notifications
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

      // Send urgent notification to Family Partner
      console.log('🚨 URGENT ADMIN ALERT:', alert.title, '-', alert.message);
      console.log('📋 Booking Details:', {
        customer: `${bookingData.customerName} (${bookingData.customerEmail})`,
        detectedItems: bookingData.detectedItems,
        estimatedCost: `$${bookingData.estimatedCost}`,
        requiresApproval: true,
      });

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