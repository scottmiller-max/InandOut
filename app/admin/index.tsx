import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PageContainer } from '@/components/PageContainer';
import { Users, Settings, ChartBar as BarChart3, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';

export default function AdminIndexScreen() {
  const router = useRouter();

  const adminModules = [
    {
      id: 'crm',
      title: 'Customer CRM',
      description: 'Manage customers, jobs, and reviews',
      icon: Users,
      route: '/admin/crm',
      color: '#2563eb',
    },
    {
      id: 'analytics',
      title: 'Analytics Dashboard',
      description: 'View business metrics and reports',
      icon: BarChart3,
      route: '/admin/analytics',
      color: '#059669',
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure app settings and preferences',
      icon: Settings,
      route: '/admin/settings',
      color: '#7c3aed',
    },
  ];

  return (
    <PageContainer>
      {/* Header */}
      <View style={styles.header}>
        <DateTimeDisplay />
        <GlobalSignOutButton compact />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          Access administrative tools and manage the IN&OUT Moving platform
        </Text>

        <View style={styles.modulesGrid}>
          {adminModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => router.push(module.route as any)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: module.color + '20' }]}>
                <module.icon size={32} color={module.color} />
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleDescription}>{module.description}</Text>
              <View style={styles.moduleFooter}>
                <ArrowRight size={16} color={module.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <Text style={styles.statsTitle}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>247</Text>
              <Text style={styles.statLabel}>Total Customers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>18</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.9</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </View>
        </View>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 32,
    lineHeight: 24,
  },
  modulesGrid: {
    gap: 16,
    marginBottom: 32,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  moduleDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  moduleFooter: {
    alignItems: 'center',
  },
  quickStats: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
});