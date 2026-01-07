import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';

interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  bookingConfirmations: boolean;
  statusUpdates: boolean;
  teamAssignments: boolean;
  paymentReceipts: boolean;
}

interface NotificationPreferencesProps {
  style?: any;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ style }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    bookingConfirmations: true,
    statusUpdates: true,
    teamAssignments: true,
    paymentReceipts: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Load settings error:', error);
        return;
      }

      if (data) {
        setSettings({
          emailEnabled: data.email_enabled,
          pushEnabled: data.push_enabled,
          smsEnabled: data.sms_enabled,
          bookingConfirmations: data.booking_confirmations,
          statusUpdates: data.status_updates,
          teamAssignments: data.team_assignments,
          paymentReceipts: data.payment_receipts,
        });
      }
    } catch (error) {
      console.error('Load notification settings error:', error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      setLoading(true);

      const dbFieldMap: Record<keyof NotificationSettings, string> = {
        emailEnabled: 'email_enabled',
        pushEnabled: 'push_enabled',
        smsEnabled: 'sms_enabled',
        bookingConfirmations: 'booking_confirmations',
        statusUpdates: 'status_updates',
        teamAssignments: 'team_assignments',
        paymentReceipts: 'payment_receipts',
      };

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          email_enabled: newSettings.emailEnabled,
          push_enabled: newSettings.pushEnabled,
          sms_enabled: newSettings.smsEnabled,
          booking_confirmations: newSettings.bookingConfirmations,
          status_updates: newSettings.statusUpdates,
          team_assignments: newSettings.teamAssignments,
          payment_receipts: newSettings.paymentReceipts,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

    } catch (error) {
      console.error('Update settings error:', error);
      setSettings(settings);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const notificationOptions = [
    {
      key: 'emailEnabled' as keyof NotificationSettings,
      title: 'Email Notifications',
      description: 'Receive detailed email reports, confirmations, and receipts',
      icon: <Mail size={20} color="#2563eb" />,
      category: 'primary',
    },
    {
      key: 'pushEnabled' as keyof NotificationSettings,
      title: 'Push Notifications',
      description: 'Real-time alerts on your phone for urgent updates',
      icon: <Smartphone size={20} color="#2563eb" />,
      category: 'primary',
    },
    {
      key: 'smsEnabled' as keyof NotificationSettings,
      title: 'SMS Updates',
      description: 'Get text messages for important move updates and milestones',
      icon: <MessageSquare size={20} color="#2563eb" />,
      category: 'primary',
    },
    {
      key: 'bookingConfirmations' as keyof NotificationSettings,
      title: 'Booking Confirmations',
      description: 'Receive confirmation when your move is scheduled',
      icon: <Bell size={20} color="#059669" />,
      category: 'secondary',
    },
    {
      key: 'statusUpdates' as keyof NotificationSettings,
      title: 'Status Updates',
      description: 'Notifications for packing, loading, departure, and arrival',
      icon: <Bell size={20} color="#059669" />,
      category: 'secondary',
    },
    {
      key: 'teamAssignments' as keyof NotificationSettings,
      title: 'Team Assignments',
      description: 'Alerts when your moving team is assigned (for staff)',
      icon: <Bell size={20} color="#059669" />,
      category: 'secondary',
    },
    {
      key: 'paymentReceipts' as keyof NotificationSettings,
      title: 'Payment Receipts',
      description: 'Get receipts and payment confirmations via email',
      icon: <Bell size={20} color="#059669" />,
      category: 'secondary',
    },
  ];

  const primaryOptions = notificationOptions.filter(opt => opt.category === 'primary');
  const secondaryOptions = notificationOptions.filter(opt => opt.category === 'secondary');

  return (
    <View style={[styles.container, style]}>
      {/* Primary Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication Preferences</Text>
        <View style={styles.settingsCard}>
          {primaryOptions.map((option) => (
            <View key={option.key} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  {option.icon}
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{option.title}</Text>
                  <Text style={styles.settingDescription}>{option.description}</Text>
                </View>
              </View>
              <Switch
                value={settings[option.key]}
                onValueChange={(value) => updateSetting(option.key, value)}
                trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                thumbColor={settings[option.key] ? '#ffffff' : '#f4f3f4'}
                disabled={loading}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Secondary Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Types</Text>
        <View style={styles.settingsCard}>
          {secondaryOptions.map((option) => (
            <View key={option.key} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  {option.icon}
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{option.title}</Text>
                  <Text style={styles.settingDescription}>{option.description}</Text>
                </View>
              </View>
              <Switch
                value={settings[option.key]}
                onValueChange={(value) => updateSetting(option.key, value)}
                trackColor={{ false: '#e2e8f0', true: '#059669' }}
                thumbColor={settings[option.key] ? '#ffffff' : '#f4f3f4'}
                disabled={loading}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Quick Settings Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Notification Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Mail size={16} color={settings.emailEnabled ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.summaryText, { color: settings.emailEnabled ? '#10b981' : '#94a3b8' }]}>
              Email {settings.emailEnabled ? 'On' : 'Off'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Smartphone size={16} color={settings.pushEnabled ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.summaryText, { color: settings.pushEnabled ? '#10b981' : '#94a3b8' }]}>
              Push {settings.pushEnabled ? 'On' : 'Off'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MessageSquare size={16} color={settings.smsEnabled ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.summaryText, { color: settings.smsEnabled ? '#10b981' : '#94a3b8' }]}>
              SMS {settings.smsEnabled ? 'On' : 'Off'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
});