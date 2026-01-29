/**
 * Booking Email Status Component
 * Displays booking confirmation email status and provides resend functionality for admins
 */

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { notificationService } from '@/services/notifications';

interface EmailNotification {
  id: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface BookingEmailStatusProps {
  jobId: string;
  showResendButton?: boolean;
}

export function BookingEmailStatus({ jobId, showResendButton = false }: BookingEmailStatusProps) {
  const [notification, setNotification] = useState<EmailNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    loadEmailStatus();
  }, [jobId]);

  const loadEmailStatus = async () => {
    try {
      setLoading(true);

      // Get the most recent booking confirmation email notification for this job
      const { data, error } = await supabase
        .from('job_notifications')
        .select('*')
        .eq('job_id', jobId)
        .eq('notification_type', 'booking_confirmation')
        .eq('channel', 'email')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading email status:', error);
        return;
      }

      setNotification(data);
    } catch (error) {
      console.error('Error loading email status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    Alert.alert(
      'Resend Confirmation',
      'Are you sure you want to resend the booking confirmation email?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Resend',
          onPress: async () => {
            try {
              setResending(true);
              const result = await notificationService.resendBookingConfirmation(jobId);

              if (result.success) {
                Alert.alert('Success', 'Booking confirmation email sent successfully');
                // Reload status to show new send attempt
                await loadEmailStatus();
              } else {
                Alert.alert('Error', result.error || 'Failed to send booking confirmation email');
              }
            } catch (error) {
              console.error('Error resending email:', error);
              Alert.alert('Error', 'Failed to send booking confirmation email');
            } finally {
              setResending(false);
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = () => {
    if (!notification) {
      return <AlertCircle size={18} color="#6b7280" />;
    }

    switch (notification.status) {
      case 'sent':
        return <CheckCircle size={18} color="#10b981" />;
      case 'failed':
        return <XCircle size={18} color="#ef4444" />;
      case 'pending':
        return <Clock size={18} color="#f59e0b" />;
      default:
        return <AlertCircle size={18} color="#6b7280" />;
    }
  };

  const getStatusText = () => {
    if (!notification) {
      return 'No email sent';
    }

    switch (notification.status) {
      case 'sent':
        return `Sent ${formatTimestamp(notification.sent_at || notification.created_at)}`;
      case 'failed':
        return `Failed ${formatTimestamp(notification.created_at)}`;
      case 'pending':
        return 'Sending...';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    if (!notification) {
      return '#6b7280';
    }

    switch (notification.status) {
      case 'sent':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
    } catch (error) {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.statusInfo}>
          <Mail size={16} color="#6b7280" style={styles.mailIcon} />
          <View style={styles.statusTextContainer}>
            <View style={styles.statusBadge}>
              {getStatusIcon()}
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
            {notification?.error_message && (
              <Text style={styles.errorText} numberOfLines={1}>
                {notification.error_message}
              </Text>
            )}
          </View>
        </View>

        {showResendButton && (
          <TouchableOpacity
            style={[styles.resendButton, resending && styles.resendButtonDisabled]}
            onPress={handleResend}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <>
                <RefreshCw size={14} color="#2563eb" />
                <Text style={styles.resendButtonText}>Resend</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mailIcon: {
    marginRight: 8,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
});
