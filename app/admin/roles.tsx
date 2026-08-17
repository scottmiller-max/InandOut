import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/services/supabase';
import { ArrowLeft, Shield, Users, ChevronDown, ChevronUp } from 'lucide-react-native';

const ROLE_COLORS: Record<string, string> = {
  master_admin: '#7c3aed',
  admin: '#2563eb',
  dispatcher: '#f97316',
  family_partner: '#059669',
  crew: '#0891b2',
  customer: '#94a3b8',
  system: '#64748b',
};

const ROLE_ORDER = ['master_admin', 'admin', 'dispatcher', 'family_partner', 'crew', 'customer', 'system'];

interface PermissionRow {
  role: string;
  permission: string;
}

export default function AdminRolesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ master_admin: true });

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

      const { data: permData, error: permError } = await supabase
        .from('role_permissions')
        .select('role, permission')
        .order('role', { ascending: true })
        .order('permission', { ascending: true });
      if (permError) throw permError;
      setPermissions(permData || []);

      const { data: rolesData, error: rolesError } = await supabase.from('user_roles').select('role');
      if (rolesError) throw rolesError;
      const counts: Record<string, number> = {};
      (rolesData || []).forEach((r) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      setUserCounts(counts);
    } catch (error) {
      console.error('Load roles error:', error);
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

  const formatPermission = (permission: string) => {
    return permission.replace(/:/g, ' · ').replace(/_/g, ' ');
  };

  const toggleExpanded = (role: string) => {
    setExpanded((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const canView = currentUserRole === 'master_admin';

  const permissionsByRole: Record<string, string[]> = {};
  permissions.forEach((p) => {
    if (!permissionsByRole[p.role]) permissionsByRole[p.role] = [];
    permissionsByRole[p.role].push(p.permission);
  });

  const rolesToShow = ROLE_ORDER.filter((r) => permissionsByRole[r]?.length);

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading roles...</Text>
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
            <Text style={styles.headerTitle}>Roles & Access</Text>
            <Text style={styles.headerSubtitle}>Permission matrix by role</Text>
          </View>
        </View>

        <View style={styles.content}>
          {!canView ? (
            <View style={styles.restrictedCard}>
              <Shield size={20} color="#94a3b8" />
              <Text style={styles.restrictedText}>Only master admins can view the permission matrix.</Text>
            </View>
          ) : (
            <>
              <View style={styles.noteCard}>
                <Text style={styles.noteText}>
                  To change a team member's role, use the Staff screen. This page is a read-only view of what each
                  role can access.
                </Text>
              </View>

              {rolesToShow.map((role) => {
                const roleColor = ROLE_COLORS[role] || '#64748b';
                const perms = permissionsByRole[role] || [];
                const isExpanded = !!expanded[role];
                const count = userCounts[role] || 0;
                return (
                  <View key={role} style={styles.roleCard}>
                    <TouchableOpacity style={styles.roleCardHeader} onPress={() => toggleExpanded(role)}>
                      <View style={styles.roleCardHeaderLeft}>
                        <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
                        <Text style={styles.roleName}>{formatRole(role)}</Text>
                      </View>
                      <View style={styles.roleCardHeaderRight}>
                        {role !== 'system' ? (
                          <View style={styles.userCountBadge}>
                            <Users size={12} color="#64748b" />
                            <Text style={styles.userCountText}>{count}</Text>
                          </View>
                        ) : null}
                        <Text style={styles.permCountText}>{perms.length} permissions</Text>
                        {isExpanded ? (
                          <ChevronUp size={18} color="#94a3b8" />
                        ) : (
                          <ChevronDown size={18} color="#94a3b8" />
                        )}
                      </View>
                    </TouchableOpacity>
                    {isExpanded ? (
                      <View style={styles.permissionList}>
                        {perms.map((permission) => (
                          <View key={permission} style={styles.permissionRow}>
                            <View style={[styles.permissionDot, { backgroundColor: roleColor }]} />
                            <Text style={styles.permissionText}>{formatPermission(permission)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
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
  restrictedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 8,
  },
  restrictedText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  roleCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  userCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  permCountText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  permissionList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  permissionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.6,
  },
  permissionText: {
    fontSize: 13,
    color: '#475569',
    textTransform: 'capitalize',
  },
});
