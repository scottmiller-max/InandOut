import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { PageContainer } from '@/components/PageContainer';
import {
  Search,
  Calendar,
  Bell,
  Users,
  Briefcase,
  Clock,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  FileText,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import CustomerSearchModal from '@/components/admin/CustomerSearchModal';
import AdminJobCalendar from '@/components/admin/AdminJobCalendar';
import TeamAnnouncementsModal from '@/components/admin/TeamAnnouncementsModal';
import JobDetailsModal from '@/components/admin/JobDetailsModal';
import { supabase } from '@/services/supabase';

interface DashboardStats {
  jobs_today: number;
  jobs_this_week: number;
  pending_deposits: number;
  pending_approvals: number;
  total_customers: number;
  unread_messages: number;
  active_crew: number;
  jobs_in_progress: number;
}

interface StaffInfo {
  name: string;
  role: string;
  email: string;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showAnnouncements, setShowAnnouncementsModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_dashboard_stats');
      if (statsError) throw statsError;
      setStats(statsData);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', userData.user.id)
          .maybeSingle();

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .maybeSingle();

        setStaffInfo({
          name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}`.trim() || 'Staff Member' : 'Staff Member',
          role: roleData?.role || 'admin',
          email: userData.user.email || '',
        });
      }

      const { data: unreadCount } = await supabase.rpc('get_unread_announcements_count');
      setUnreadAnnouncements(unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleSelectCustomer = (customer: any) => {
    setShowCustomerSearch(false);
    router.push({
      pathname: '/admin/crm',
      params: { customerId: customer.id },
    } as any);
  };

  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const canCreateAnnouncements = staffInfo?.role && ['master_admin', 'admin', 'dispatcher'].includes(staffInfo.role);

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <DateTimeDisplay />
            <View style={styles.staffBadge}>
              <Text style={styles.staffName}>{staffInfo?.name}</Text>
              <Text style={styles.staffRole}>{formatRole(staffInfo?.role || '')}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowAnnouncementsModal(true)}
            >
              <Bell size={22} color="#0f172a" />
              {unreadAnnouncements > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <GlobalSignOutButton compact />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Operations Dashboard</Text>
            <Text style={styles.welcomeSubtitle}>
              Manage customers, jobs, and team communications
            </Text>
          </View>

          <View style={styles.quickActionsSection}>
            <TouchableOpacity
              style={[styles.quickActionCard, styles.primaryAction]}
              onPress={() => setShowCustomerSearch(true)}
            >
              <View style={styles.quickActionIcon}>
                <Search size={28} color="#fff" />
              </View>
              <Text style={styles.quickActionTitle}>Search Customer</Text>
              <Text style={styles.quickActionHint}>Name, phone, email, or job #</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#059669' }]}>
                <Calendar size={28} color="#fff" />
              </View>
              <Text style={styles.quickActionTitle}>Job Calendar</Text>
              <Text style={styles.quickActionHint}>View scheduled moves</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => setShowAnnouncementsModal(true)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f97316' }]}>
                <Bell size={28} color="#fff" />
              </View>
              <Text style={styles.quickActionTitle}>Announcements</Text>
              <Text style={styles.quickActionHint}>
                {unreadAnnouncements > 0 ? `${unreadAnnouncements} unread` : 'Team updates'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Overview</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <RefreshCw size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, { backgroundColor: '#eff6ff' }]}>
                  <Briefcase size={20} color="#2563eb" />
                </View>
                <Text style={styles.statValue}>{stats?.jobs_today || 0}</Text>
                <Text style={styles.statLabel}>Jobs Today</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, { backgroundColor: '#fef3c7' }]}>
                  <Clock size={20} color="#f59e0b" />
                </View>
                <Text style={styles.statValue}>{stats?.jobs_in_progress || 0}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, { backgroundColor: '#dcfce7' }]}>
                  <UserCheck size={20} color="#22c55e" />
                </View>
                <Text style={styles.statValue}>{stats?.active_crew || 0}</Text>
                <Text style={styles.statLabel}>Active Crew</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrapper, { backgroundColor: '#fce7f3' }]}>
                  <TrendingUp size={20} color="#ec4899" />
                </View>
                <Text style={styles.statValue}>{stats?.jobs_this_week || 0}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
            </View>
          </View>

          {((stats?.pending_deposits || 0) > 0 || (stats?.pending_approvals || 0) > 0) && (
            <View style={styles.alertsSection}>
              <Text style={styles.sectionTitle}>Action Required</Text>
              {(stats?.pending_deposits || 0) > 0 && (
                <TouchableOpacity style={styles.alertCard}>
                  <View style={[styles.alertIcon, { backgroundColor: '#fef2f2' }]}>
                    <DollarSign size={20} color="#ef4444" />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>Pending Deposits</Text>
                    <Text style={styles.alertDescription}>
                      {stats?.pending_deposits} jobs awaiting deposit collection
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
              {(stats?.pending_approvals || 0) > 0 && (
                <TouchableOpacity style={styles.alertCard}>
                  <View style={[styles.alertIcon, { backgroundColor: '#fff7ed' }]}>
                    <FileText size={20} color="#f97316" />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>Draft Jobs to Review</Text>
                    <Text style={styles.alertDescription}>
                      {stats?.pending_approvals} AI-generated jobs need approval
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>System Summary</Text>
            <View style={styles.summaryGrid}>
              <TouchableOpacity
                style={styles.summaryCard}
                onPress={() => router.push('/admin/crm' as any)}
              >
                <Users size={24} color="#2563eb" />
                <Text style={styles.summaryValue}>{stats?.total_customers || 0}</Text>
                <Text style={styles.summaryLabel}>Total Customers</Text>
              </TouchableOpacity>
              <View style={styles.summaryCard}>
                <Bell size={24} color="#f97316" />
                <Text style={styles.summaryValue}>{stats?.unread_messages || 0}</Text>
                <Text style={styles.summaryLabel}>Unread Messages</Text>
              </View>
            </View>
          </View>

          {showCalendar && (
            <View style={styles.calendarSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Job Calendar</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Text style={styles.hideCalendarText}>Hide</Text>
                </TouchableOpacity>
              </View>
              <AdminJobCalendar onSelectJob={handleSelectJob} />
            </View>
          )}
        </View>
      </ScrollView>

      <CustomerSearchModal
        visible={showCustomerSearch}
        onClose={() => setShowCustomerSearch(false)}
        onSelectCustomer={handleSelectCustomer}
      />

      <TeamAnnouncementsModal
        visible={showAnnouncements}
        onClose={() => {
          setShowAnnouncementsModal(false);
          fetchDashboardData();
        }}
        canCreate={canCreateAnnouncements}
      />

      <JobDetailsModal
        visible={!!selectedJob}
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onUpdate={() => {
          setSelectedJob(null);
          fetchDashboardData();
        }}
      />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  headerLeft: {
    flex: 1,
  },
  staffBadge: {
    marginTop: 8,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  staffRole: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  quickActionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  quickActionCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    }),
  },
  primaryAction: {
    backgroundColor: '#2563eb',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  refreshButton: {
    padding: 8,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  alertsSection: {
    marginBottom: 24,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  calendarSection: {
    marginBottom: 24,
  },
  hideCalendarText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
});
