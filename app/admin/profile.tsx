import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/services/supabase';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { ArrowLeft, Save, Briefcase, Calendar, Phone } from 'lucide-react-native';

const ROLE_COLORS: Record<string, string> = {
  master_admin: '#7c3aed',
  admin: '#2563eb',
  dispatcher: '#f97316',
  family_partner: '#059669',
  crew: '#0891b2',
  customer: '#94a3b8',
};

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface StaffRow {
  id: string;
  position: string;
  department: string;
  employment_status: string;
  hire_date: string | null;
}

export default function AdminProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserRow | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRow | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .eq('id', uid)
        .maybeSingle();
      if (userError) throw userError;
      if (userRow) {
        setUser(userRow);
        setFirstName(userRow.first_name || '');
        setLastName(userRow.last_name || '');
        setPhone(userRow.phone || '');
      }

      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', uid).maybeSingle();
      setRole(roleRow?.role || null);

      const { data: staffRow } = await supabase
        .from('staff_profiles')
        .select('id, position, department, employment_status, hire_date')
        .eq('user_id', uid)
        .maybeSingle();
      setStaff(staffRow || null);
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatRole = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  const roleColor = role ? ROLE_COLORS[role] || '#64748b' : '#64748b';

  const handleSave = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'First and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      setDirty(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Failed to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
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
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Account details and preferences</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.identityCard}>
            <View style={[styles.avatar, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.identityName}>
              {firstName} {lastName}
            </Text>
            <Text style={styles.identityEmail}>{user?.email}</Text>
            {role ? (
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '1a' }]}>
                <Text style={[styles.roleBadgeText, { color: roleColor }]}>{formatRole(role)}</Text>
              </View>
            ) : null}
          </View>

          {staff ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Staff Details</Text>
              <View style={styles.card}>
                <View style={styles.detailRow}>
                  <Briefcase size={16} color="#64748b" />
                  <Text style={styles.detailText}>
                    {staff.position || 'No position set'}
                    {staff.department ? ` · ${staff.department}` : ''}
                  </Text>
                </View>
                {staff.hire_date ? (
                  <View style={styles.detailRow}>
                    <Calendar size={16} color="#64748b" />
                    <Text style={styles.detailText}>Hired {formatDate(staff.hire_date)}</Text>
                  </View>
                ) : null}
                <View style={[styles.statusBadge, staff.employment_status === 'active' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusBadgeText}>{formatRole(staff.employment_status)}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Edit Info</Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={(v) => {
                  setFirstName(v);
                  setDirty(true);
                }}
                placeholder="First name"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.inputLabel}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={(v) => {
                  setLastName(v);
                  setDirty(true);
                }}
                placeholder="Last name"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <View style={styles.phoneInputRow}>
                <Phone size={16} color="#64748b" />
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    setDirty(true);
                  }}
                  placeholder="Phone number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/admin/settings' as any)}>
              <Text style={styles.linkCardText}>Notification settings</Text>
              <Text style={styles.linkCardHint}>Manage what you get notified about</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signOutSection}>
            <GlobalSignOutButton />
          </View>
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
  identityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  identityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  identityEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#334155',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 2,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 14,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  saveButton: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  linkCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  linkCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  linkCardHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  signOutSection: {
    marginTop: 8,
    alignItems: 'center',
  },
});
