import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Mail, CheckCircle, XCircle, Clock, Filter, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

interface EmailNotification {
  id: string;
  jobId: string | null;
  userId: string;
  notificationType: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  metadata: any;
}

interface EmailDeliveryStatusProps {
  customerId?: string;
}

export const EmailDeliveryStatus: React.FC<EmailDeliveryStatusProps> = ({ customerId }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadNotifications();
  }, [customerId, filterStatus, filterType]);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('job_notifications')
        .select('*')
        .eq('channel', 'email')
        .order('created_at', { ascending: false })
        .limit(100);

      if (customerId) {
        query = query.eq('user_id', customerId);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('notification_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data?.map(n => ({
        id: n.id,
        jobId: n.job_id,
        userId: n.user_id,
        notificationType: n.notification_type,
        channel: n.channel,
        status: n.status,
        errorMessage: n.error_message,
        sentAt: n.sent_at,
        createdAt: n.created_at,
        metadata: n.metadata || {},
      })) || []);
    } catch (error) {
      console.error('Load notifications error:', error);
      Alert.alert('Error', 'Failed to load email notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleResend = async (notification: EmailNotification) => {
    Alert.alert(
      'Resend Email',
      'Do you want to resend this email notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend',
          onPress: async () => {
            try {
              Alert.alert('Info', 'Manual resend feature requires integration with the email service. This will be implemented in a future update.');
            } catch (error) {
              console.error('Resend error:', error);
              Alert.alert('Error', 'Failed to resend email');
            }
          }
        }
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={20} color="#10b981" />;
      case 'failed':
        return <XCircle size={20} color="#ef4444" />;
      case 'pending':
        return <Clock size={20} color="#f59e0b" />;
      default:
        return <Mail size={20} color="#64748b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const formatNotificationType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Loading email delivery status..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterGroup}>
          <Filter size={16} color="#64748b" />
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['all', 'sent', 'failed', 'pending'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive,
                ]}
                onPress={() => setFilterStatus(status as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <RefreshCw size={16} color="#2563eb" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {notifications.filter(n => n.status === 'sent').length}
          </Text>
          <Text style={styles.statLabel}>Sent</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {notifications.filter(n => n.status === 'failed').length}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {notifications.filter(n => n.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Mail size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No email notifications found</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
              <View style={styles.notificationHeader}>
                <View style={styles.notificationLeft}>
                  {getStatusIcon(notification.status)}
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationType}>
                      {formatNotificationType(notification.notificationType)}
                    </Text>
                    <Text style={styles.notificationDate}>
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(notification.status)}20` }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(notification.status) }]}>
                    {notification.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {notification.jobId && (
                <Text style={styles.jobId}>Job ID: {notification.jobId.slice(0, 8)}...</Text>
              )}

              {notification.sentAt && (
                <Text style={styles.sentAt}>
                  Sent: {formatDate(notification.sentAt)}
                </Text>
              )}

              {notification.errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorLabel}>Error:</Text>
                  <Text style={styles.errorText}>{notification.errorMessage}</Text>
                </View>
              )}

              {notification.status === 'failed' && (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => handleResend(notification)}
                >
                  <RefreshCw size={14} color="#2563eb" />
                  <Text style={styles.resendButtonText}>Resend Email</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
    marginRight: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 16,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  notificationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  notificationType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  jobId: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  sentAt: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  resendButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
});
