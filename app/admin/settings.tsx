import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/services/supabase';
import { ArrowLeft, Bell, Mail, MessageSquare, Save } from 'lucide-react-native';

interface NotificationSettings {
  notify_new_leads: boolean;
  notify_new_messages: boolean;
  notify_deposit_paid: boolean;
  notify_email: boolean;
  notify_sms: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  notify_new_leads: true,
  notify_new_messages: true,
  notify_deposit_paid: true,
  notify_email: true,
  notify_sms: false,
};

export default function AdminSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id || null;
      setUserId(uid);
      if (!uid) return;

      const { data, error } = await supabase
        .from('project_settings')
        .select('settings_data')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      if (data?.settings_data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings_data });
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_settings')
        .upsert({ user_id: userId, settings_data: settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      setDirty(false);
      Alert.alert('Saved', 'Your notification preferences have been updated.');
    } catch (error) {
      console.error('Save settings error:', error);
      Alert.alert('Error', 'Failed to save your settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIconButton} onPress={() => router.push('/admin')}>
            <ArrowLeft size={18} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Notification preferences</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>Notify me about</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>New leads</Text>
                <Switch
                  value={settings.notify_new_leads}
                  onValueChange={(v) => updateSetting('notify_new_leads', v)}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={settings.notify_new_leads ? '#2563eb' : '#f8fafc'}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>New messages</Text>
                <Switch
                  value={settings.notify_new_messages}
                  onValueChange={(v) => updateSetting('notify_new_messages', v)}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={settings.notify_new_messages ? '#2563eb' : '#f8fafc'}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Deposit paid</Text>
                <Switch
                  value={settings.notify_deposit_paid}
                  onValueChange={(v) => updateSetting('notify_deposit_paid', v)}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={settings.notify_deposit_paid ? '#2563eb' : '#f8fafc'}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Mail size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>Delivery method</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowLabelWithIcon}>
                  <Mail size={16} color="#64748b" />
                  <Text style={styles.rowLabel}>Email</Text>
                </View>
                <Switch
                  value={settings.notify_email}
                  onValueChange={(v) => updateSetting('notify_email', v)}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={settings.notify_email ? '#2563eb' : '#f8fafc'}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowLabelWithIcon}>
                  <MessageSquare size={16} color="#64748b" />
                  <Text style={styles.rowLabel}>Text message</Text>
                </View>
                <Switch
                  value={settings.notify_sms}
                  onValueChange={(v) => updateSetting('notify_sms', v)}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={settings.notify_sms ? '#2563eb' : '#f8fafc'}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !dirty ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={16} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backIconButton: {
    width: 36,
    height: 36,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  rowLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
