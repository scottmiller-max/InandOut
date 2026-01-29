/**
 * Email Monitoring Service
 * Provides monitoring, analytics, and logging for email notifications
 */

import { supabase } from './supabase';

export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  successRate: number;
  lastSentAt: string | null;
  lastFailedAt: string | null;
}

export interface EmailNotificationRecord {
  id: string;
  job_id: string | null;
  user_id: string;
  notification_type: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  metadata: any;
}

export interface DailyEmailStats {
  date: string;
  sent_count: number;
  failed_count: number;
  success_rate: number;
}

export interface ThrottleInfo {
  user_id: string;
  job_id: string;
  notification_type: string;
  last_sent_at: string;
  send_count: number;
  blocked_count: number;
}

export const emailMonitoring = {
  /**
   * Get overall email statistics for booking confirmations
   */
  getBookingEmailStats: async (): Promise<EmailStats> => {
    try {
      const { data, error } = await supabase
        .from('job_notifications')
        .select('status, sent_at, created_at')
        .eq('notification_type', 'booking_confirmation')
        .eq('channel', 'email');

      if (error) {
        console.error('Error fetching email stats:', error);
        return {
          totalSent: 0,
          totalFailed: 0,
          totalPending: 0,
          successRate: 0,
          lastSentAt: null,
          lastFailedAt: null,
        };
      }

      const totalSent = data?.filter(n => n.status === 'sent').length || 0;
      const totalFailed = data?.filter(n => n.status === 'failed').length || 0;
      const totalPending = data?.filter(n => n.status === 'pending').length || 0;
      const successRate = totalSent + totalFailed > 0
        ? (totalSent / (totalSent + totalFailed)) * 100
        : 0;

      const sentNotifications = data?.filter(n => n.status === 'sent' && n.sent_at);
      const lastSentAt = sentNotifications && sentNotifications.length > 0
        ? sentNotifications.sort((a, b) =>
            new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime()
          )[0].sent_at
        : null;

      const failedNotifications = data?.filter(n => n.status === 'failed');
      const lastFailedAt = failedNotifications && failedNotifications.length > 0
        ? failedNotifications.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0].created_at
        : null;

      return {
        totalSent,
        totalFailed,
        totalPending,
        successRate: Math.round(successRate * 100) / 100,
        lastSentAt,
        lastFailedAt,
      };
    } catch (error) {
      console.error('Error calculating email stats:', error);
      return {
        totalSent: 0,
        totalFailed: 0,
        totalPending: 0,
        successRate: 0,
        lastSentAt: null,
        lastFailedAt: null,
      };
    }
  },

  /**
   * Get daily email statistics for the last N days
   */
  getDailyEmailStats: async (days: number = 7): Promise<DailyEmailStats[]> => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('job_notifications')
        .select('status, sent_at, created_at')
        .eq('notification_type', 'booking_confirmation')
        .eq('channel', 'email')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching daily stats:', error);
        return [];
      }

      // Group by date
      const statsByDate: { [key: string]: { sent: number; failed: number } } = {};

      data?.forEach(notification => {
        const date = new Date(notification.created_at).toISOString().split('T')[0];

        if (!statsByDate[date]) {
          statsByDate[date] = { sent: 0, failed: 0 };
        }

        if (notification.status === 'sent') {
          statsByDate[date].sent++;
        } else if (notification.status === 'failed') {
          statsByDate[date].failed++;
        }
      });

      // Convert to array and calculate success rate
      return Object.entries(statsByDate).map(([date, stats]) => ({
        date,
        sent_count: stats.sent,
        failed_count: stats.failed,
        success_rate: stats.sent + stats.failed > 0
          ? Math.round((stats.sent / (stats.sent + stats.failed)) * 100)
          : 0,
      })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error calculating daily stats:', error);
      return [];
    }
  },

  /**
   * Get recent failed email notifications
   */
  getRecentFailures: async (limit: number = 10): Promise<EmailNotificationRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('job_notifications')
        .select('*')
        .eq('notification_type', 'booking_confirmation')
        .eq('channel', 'email')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent failures:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent failures:', error);
      return [];
    }
  },

  /**
   * Get email notifications for a specific job
   */
  getJobEmailHistory: async (jobId: string): Promise<EmailNotificationRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('job_notifications')
        .select('*')
        .eq('job_id', jobId)
        .eq('notification_type', 'booking_confirmation')
        .eq('channel', 'email')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching job email history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching job email history:', error);
      return [];
    }
  },

  /**
   * Get users who have opted out of booking confirmations
   */
  getOptedOutUsers: async (): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select(`
          *,
          customers:user_id (
            email,
            first_name,
            last_name
          )
        `)
        .or('email_enabled.eq.false,booking_confirmations.eq.false');

      if (error) {
        console.error('Error fetching opted out users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching opted out users:', error);
      return [];
    }
  },

  /**
   * Get throttle information for monitoring
   */
  getThrottleInfo: async (limit: number = 20): Promise<ThrottleInfo[]> => {
    try {
      const { data, error } = await supabase
        .from('email_throttle_log')
        .select('*')
        .eq('notification_type', 'booking_confirmation')
        .order('last_sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching throttle info:', error);
        return [];
      }

      return data?.map(log => ({
        user_id: log.user_id,
        job_id: log.job_id,
        notification_type: log.notification_type,
        last_sent_at: log.last_sent_at,
        send_count: log.send_count,
        blocked_count: 0, // We don't track this currently, but could add it
      })) || [];
    } catch (error) {
      console.error('Error fetching throttle info:', error);
      return [];
    }
  },

  /**
   * Get most common error messages
   */
  getCommonErrors: async (limit: number = 5): Promise<{ error: string; count: number }[]> => {
    try {
      const { data, error } = await supabase
        .from('job_notifications')
        .select('error_message')
        .eq('notification_type', 'booking_confirmation')
        .eq('channel', 'email')
        .eq('status', 'failed')
        .not('error_message', 'is', null);

      if (error) {
        console.error('Error fetching common errors:', error);
        return [];
      }

      // Count occurrences of each error message
      const errorCounts: { [key: string]: number } = {};
      data?.forEach(notification => {
        const errorMsg = notification.error_message || 'Unknown error';
        errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
      });

      // Convert to array and sort by count
      return Object.entries(errorCounts)
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error calculating common errors:', error);
      return [];
    }
  },

  /**
   * Log email monitoring event
   */
  logMonitoringEvent: async (
    eventType: string,
    details: any
  ): Promise<void> => {
    try {
      console.log(`[Email Monitoring] ${eventType}:`, JSON.stringify(details, null, 2));

      // In production, you might want to log these to a dedicated monitoring table
      // or send to an external monitoring service like Sentry, DataDog, etc.
    } catch (error) {
      console.error('Error logging monitoring event:', error);
    }
  },

  /**
   * Check email system health
   */
  checkEmailSystemHealth: async (): Promise<{
    healthy: boolean;
    issues: string[];
    stats: EmailStats;
  }> => {
    try {
      const stats = await emailMonitoring.getBookingEmailStats();
      const issues: string[] = [];

      // Check success rate
      if (stats.successRate < 95 && stats.totalSent + stats.totalFailed > 10) {
        issues.push(`Low success rate: ${stats.successRate.toFixed(1)}%`);
      }

      // Check for pending emails stuck for too long
      if (stats.totalPending > 0) {
        issues.push(`${stats.totalPending} pending emails`);
      }

      // Check if emails are being sent recently
      if (stats.lastSentAt) {
        const lastSent = new Date(stats.lastSentAt);
        const hoursSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastSent > 24) {
          issues.push('No emails sent in the last 24 hours');
        }
      }

      const healthy = issues.length === 0;

      if (!healthy) {
        await emailMonitoring.logMonitoringEvent('health_check_failed', {
          issues,
          stats,
        });
      }

      return {
        healthy,
        issues,
        stats,
      };
    } catch (error) {
      console.error('Error checking email system health:', error);
      return {
        healthy: false,
        issues: ['Error checking system health'],
        stats: {
          totalSent: 0,
          totalFailed: 0,
          totalPending: 0,
          successRate: 0,
          lastSentAt: null,
          lastFailedAt: null,
        },
      };
    }
  },
};
