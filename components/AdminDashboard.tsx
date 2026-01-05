import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartBar as BarChart3, TrendingUp, Users, Package, DollarSign, Calendar, MapPin, Clock, Star, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Truck } from 'lucide-react-native';
import { crmService } from '@/services/crm';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalCustomers: number;
  activeJobs: number;
  completedJobs: number;
  totalRevenue: number;
  averageRating: number;
  monthlyGrowth: number;
}

interface AdminDashboardProps {
  style?: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ style }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalRevenue: 0,
    averageRating: 0,
    monthlyGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const customers = await crmService.getAllCustomers();
      
      // Calculate stats
      const totalCustomers = customers.length;
      const allJobs = customers.flatMap(c => c.jobs);
      const activeJobs = allJobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length;
      const completedJobs = allJobs.filter(j => j.status === 'completed').length;
      const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
      const allRatings = customers.flatMap(c => c.reviews).map(r => r.overallRating);
      const averageRating = allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length : 0;
      
      setStats({
        totalCustomers,
        activeJobs,
        completedJobs,
        totalRevenue,
        averageRating,
        monthlyGrowth: 12.5, // Mock growth percentage
      });

      // Mock recent activity
      setRecentActivity([
        { id: '1', type: 'job_completed', text: 'Job #JB-2024-045 completed successfully', time: '2 hours ago' },
        { id: '2', type: 'new_customer', text: 'New customer Sarah Johnson registered', time: '4 hours ago' },
        { id: '3', type: 'milestone', text: 'Team arrived at 123 Oak Street', time: '6 hours ago' },
        { id: '4', type: 'review', text: '5-star review received from Mike Chen', time: '1 day ago' },
      ]);
    } catch (error) {
      console.error('Load dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'job_completed': return <CheckCircle size={16} color="#10b981" />;
      case 'new_customer': return <Users size={16} color="#2563eb" />;
      case 'milestone': return <MapPin size={16} color="#f59e0b" />;
      case 'review': return <Star size={16} color="#f59e0b" />;
      default: return <Clock size={16} color="#64748b" />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Business Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Users size={20} color="#2563eb" />
              <TrendingUp size={16} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.totalCustomers}</Text>
            <Text style={styles.statLabel}>Total Customers</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Package size={20} color="#f59e0b" />
              <Clock size={16} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{stats.activeJobs}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CheckCircle size={20} color="#10b981" />
              <TrendingUp size={16} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.completedJobs}</Text>
            <Text style={styles.statLabel}>Completed Jobs</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <DollarSign size={20} color="#059669" />
              <TrendingUp size={16} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Star size={20} color="#f59e0b" />
              <Text style={styles.metricValue}>{stats.averageRating.toFixed(1)}</Text>
            </View>
            <Text style={styles.metricLabel}>Average Rating</Text>
            <Text style={styles.metricTrend}>+0.2 this month</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <TrendingUp size={20} color="#10b981" />
              <Text style={styles.metricValue}>{stats.monthlyGrowth}%</Text>
            </View>
            <Text style={styles.metricLabel}>Monthly Growth</Text>
            <Text style={styles.metricTrend}>+2.1% vs last month</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                {getActivityIcon(activity.type)}
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 40,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  metricsSection: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'Inter-Regular',
  },
  activitySection: {
    marginBottom: 24,
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
});