import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';

interface NotificationSettings {
  smsUpdates: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  milestoneUpdates: boolean;
  etaUpdates: boolean;
  teamMessages: boolean;
}

interface NotificationPreferencesProps {
  style?: any;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ style }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    smsUpdates: true,
    emailNotifications: true,
    pushNotifications: false,
    milestoneUpdates: true,
    etaUpdates: true,
    teamMessages: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      // Load user notification preferences from database
      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Load settings error:', error);
        return;
      }

      if (data?.notification_preferences) {
        setSettings(data.notification_preferences);
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
      const { error } = await supabase
        .from('users')
        .update({
          notification_preferences: newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Show confirmation for important changes
      if (key === 'smsUpdates' || key === 'emailNotifications') {
        Alert.alert(
          'Settings Updated',
          `${key === 'smsUpdates' ? 'SMS' : 'Email'} notifications ${value ? 'enabled' : 'disabled'}.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Update settings error:', error);
      // Revert on error
      setSettings(settings);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const notificationOptions = [
    {
      key: 'smsUpdates' as keyof NotificationSettings,
      title: 'SMS Updates',
      description: 'Get text messages for important move updates and milestones',
      icon: <MessageSquare size={20} color="#2563eb" />,
      category: 'primary',
    },
    {
      key: 'emailNotifications' as keyof NotificationSettings,
      title: 'Email Notifications',
      description: 'Receive detailed email reports, confirmations, and receipts',
      icon: <Mail size={20} color="#2563eb" />,
      category: 'primary',
    },
    {
      key: 'pushNotifications' as keyof NotificationSettings,
      title: 'Push Notifications',
      description: 'Real-time alerts on your phone for urgent updates',
      icon: <Smartphone size={20} color="#2563eb" />,
      category: 'primary',
    },
    {
      key: 'milestoneUpdates' as keyof NotificationSettings,
      title: 'Milestone Updates',
      description: 'Notifications for packing, loading, departure, and arrival',
      icon: <Bell size={20} color="#059669" />,
      category: 'secondary',
    },
    {
      key: 'etaUpdates' as keyof NotificationSettings,
      title: 'ETA Updates',
      description: 'Alerts when arrival time changes due to traffic or delays',
      icon: <Bell size={20} color="#059669" />,
      category: 'secondary',
    },
    {
      key: 'teamMessages' as keyof NotificationSettings,
      title: 'Team Messages',
      description: 'Direct messages from your moving team and driver',
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
            <MessageSquare size={16} color={settings.smsUpdates ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.summaryText, { color: settings.smsUpdates ? '#10b981' : '#94a3b8' }]}>
              SMS {settings.smsUpdates ? 'On' : 'Off'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Mail size={16} color={settings.emailNotifications ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.summaryText, { color: settings.emailNotifications ? '#10b981' : '#94a3b8' }]}>
              Email {settings.emailNotifications ? 'On' : 'Off'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Smartphone size={16} color={settings.pushNotifications ? '#10b981' : '#94a3b8'} />
            <Text style={[styles.summaryText, { color: settings.pushNotifications ? '#10b981' : '#94a3b8' }]}>
              Push {settings.pushNotifications ? 'On' : 'Off'}
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