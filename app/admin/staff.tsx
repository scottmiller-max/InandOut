import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/services/supabase';
import { ArrowLeft, Users, Phone, Briefcase } from 'lucide-react-native';

const ASSIGNABLE_ROLES = ['master_admin', 'admin', 'dispatcher', 'family_partner', 'crew'];

const ROLE_COLORS: Record<string, string> = {
  master_admin: '#7c3aed',
  admin: '#2563eb',
  dispatcher: '#f97316',
  family_partner: '#059669',
  crew: '#0891b2',
  customer: '#94a3b8',
};

interface StaffRow {
  id: string;
  user_id: string;
  position: string;
  department: string;
  employment_status: string;
  availability_status: string;
  phone_number: string | null;
  hire_date: string | null;
}

interface UserLite {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function AdminStaffScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [users, setUsers] = useState<Record<string, UserLite>>({});
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<{ visible: boolean; userId: string | null; name: string }>({
    visible: false,
    userId: null,
    name: '',
  });

  const loadData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: myRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        setCurrentUserRole(myRole?.role || null);
      }

      const { data: staffData, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id, user_id, position, department, employment_status, availability_status, phone_number, hire_date')
        .order('created_at', { ascending: true });
      if (staffError) throw staffError;
      const staffRows = staffData || [];
      setStaff(staffRows);

      const userIds = Array.from(new Set(staffRows.map((s) => s.user_id)));
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        if (usersError) throw usersError;
        const userMap: Record<string, UserLite> = {};
        (usersData || []).forEach((u) => {
          userMap[u.id] = u;
        });
        setUsers(userMap);

        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        if (rolesError) throw rolesError;
        const roleMap: Record<string, string> = {};
        (rolesData || []).forEach((r) => {
          roleMap[r.user_id] = r.role;
        });
        setRoles(roleMap);
      } else {
        setUsers({});
        setRoles({});
      }
    } catch (error) {
      console.error('Load staff error:', error);
      Alert.alert('Error', 'Failed to load the staff roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const openRoleModal = (userId: string, name: string) => {
    setRoleModal({ visible: true, userId, name });
  };

  const handleChangeRole = async (newRole: string) => {
    const userId = roleModal.userId;
    if (!userId) return;
    setProcessingId(userId);
    try {
      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
      if (error) throw error;
      setRoles((prev) => ({ ...prev, [userId]: newRole }));
      setRoleModal({ visible: false, userId: null, name: '' });
    } catch (error) {
      console.error('Change role error:', error);
      Alert.alert('Error', 'Failed to update this role.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleAvailability = async (row: StaffRow) => {
    const next = row.availability_status === 'available' ? 'unavailable' : 'available';
    setProcessingId(row.user_id);
    try {
      const { error } = await supabase.from('staff_profiles').update({ availability_status: next }).eq('id', row.id);
      if (error) throw error;
      setStaff((prev) => prev.map((s) => (s.id === row.id ? { ...s, availability_status: next } : s)));
    } catch (error) {
      console.error('Toggle availability error:', error);
      Alert.alert('Error', 'Failed to update availability.');
    } finally {
      setProcessingId(null);
    }
  };

  const canManageRoles = currentUserRole === 'master_admin';

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading staff...</Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIconButton} onPress={() => router.push('/admin')}>
            <ArrowLeft size={18} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Staff</Text>
            <Text style={styles.headerSubtitle}>
              {staff.length} {staff.length === 1 ? 'team member' : 'team members'}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {staff.length === 0 ? (
            <View style={styles.emptyCard}>
              <Users size={20} color="#94a3b8" />
              <Text style={styles.emptyText}>No staff profiles yet.</Text>
            </View>
          ) : (
            staff.map((row) => {
              const user = users[row.user_id];
              const role = roles[row.user_id] || 'customer';
              const name = user ? `${user.first_name} ${user.last_name}`.trim() || 'Staff Member' : 'Staff Member';
              const roleColor = ROLE_COLORS[role] || '#64748b';
              return (
                <View key={row.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{name}</Text>
                    <TouchableOpacity
                      style={[styles.roleBadge, { backgroundColor: roleColor + '1a' }]}
                      onPress={() => canManageRoles && openRoleModal(row.user_id, name)}
                      disabled={!canManageRoles}
                    >
                      <Text style={[styles.roleBadgeText, { color: roleColor }]}>{formatRole(role)}</Text>
                    </TouchableOpacity>
                  </View>
                  {user?.email ? <Text style={styles.cardMeta}>{user.email}</Text> : null}
                  <View style={styles.metaRow}>
                    <Briefcase size={14} color="#64748b" />
                    <Text style={styles.metaText}>
                      {row.position || 'No position set'}
                      {row.department ? ` · ${row.department}` : ''}
                    </Text>
                  </View>
                  {row.phone_number ? (
                    <View style={styles.metaRow}>
                      <Phone size={14} color="#64748b" />
                      <Text style={styles.metaText}>{row.phone_number}</Text>
                    </View>
                  ) : null}
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        row.employment_status === 'active' ? styles.statusActive : styles.statusInactive,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{formatRole(row.employment_status)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.availabilityButton,
                        row.availability_status === 'available'
                          ? styles.availabilityAvailable
                          : styles.availabilityUnavailable,
                      ]}
                      onPress={() => handleToggleAvailability(row)}
                      disabled={processingId === row.user_id}
                    >
                      <Text style={styles.availabilityButtonText}>
                        {row.availability_status === 'available' ? 'Available' : 'Unavailable'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={roleModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setRoleModal({ visible: false, userId: null, name: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change role</Text>
            <Text style={styles.modalSubtitle}>{roleModal.name}</Text>
            {ASSIGNABLE_ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={styles.roleOption}
                onPress={() => handleChangeRole(role)}
                disabled={!!roleModal.userId && processingId === roleModal.userId}
              >
                <View style={[styles.roleOptionDot, { backgroundColor: ROLE_COLORS[role] }]} />
                <Text style={styles.roleOptionText}>{formatRole(role)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setRoleModal({ visible: false, userId: null, name: '' })}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
  availabilityButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  availabilityAvailable: {
    backgroundColor: '#eff6ff',
  },
  availabilityUnavailable: {
    backgroundColor: '#fef2f2',
  },
  availabilityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roleOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});
