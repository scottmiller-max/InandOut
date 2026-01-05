import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar, MapPin, Clock, CircleCheck as CheckCircle, Package } from 'lucide-react-native';
import { crmService } from '@/services/crm';
import { useAuth } from '@/hooks/useAuth';

interface Job {
  id: string;
  jobNumber: string;
  fromAddress: string;
  toAddress: string;
  jobDate: string;
  timeSlot: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  serviceType: string;
  estimatedCost?: number;
}

interface PendingJobsListProps {
  onJobSelect?: (job: Job) => void;
}

export const PendingJobsList: React.FC<PendingJobsListProps> = ({ onJobSelect }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Mock jobs data - replace with actual service call
      const mockJobs: Job[] = [
        {
          id: '1',
          jobNumber: 'JB-2024-001',
          fromAddress: '123 Oak Street',
          toAddress: '456 Pine Avenue',
          jobDate: '2024-03-25',
          timeSlot: '8:00 AM - 10:00 AM',
          status: 'scheduled',
          serviceType: 'loading_unloading',
          estimatedCost: 899,
        },
        {
          id: '2',
          jobNumber: 'JB-2024-002',
          fromAddress: '789 Maple Drive',
          toAddress: '321 Cedar Lane',
          jobDate: '2024-03-28',
          timeSlot: '10:00 AM - 12:00 PM',
          status: 'in_progress',
          serviceType: 'loading',
          estimatedCost: 650,
        },
        {
          id: '3',
          jobNumber: 'JB-2023-045',
          fromAddress: '555 Broadway',
          toAddress: '777 Fifth Avenue',
          jobDate: '2024-02-15',
          timeSlot: '2:00 PM - 4:00 PM',
          status: 'completed',
          serviceType: 'loading_unloading',
          estimatedCost: 1200,
        },
      ];
      setJobs(mockJobs);
    } catch (error) {
      console.error('Load jobs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#2563eb';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar size={16} color="#2563eb" />;
      case 'in_progress': return <Clock size={16} color="#f59e0b" />;
      case 'completed': return <CheckCircle size={16} color="#10b981" />;
      default: return <Package size={16} color="#64748b" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  const pendingJobs = jobs.filter(job => job.status === 'scheduled' || job.status === 'in_progress');
  const completedJobs = jobs.filter(job => job.status === 'completed');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Pending Jobs */}
      {pendingJobs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Jobs</Text>
          {pendingJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={[styles.jobCard, styles.pendingJobCard]}
              onPress={() => onJobSelect?.(job)}
            >
              <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobNumber}>{job.jobNumber}</Text>
                  <Text style={styles.jobDate}>{formatDate(job.jobDate)} • {job.timeSlot}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                  {getStatusIcon(job.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                    {job.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.addressContainer}>
                <View style={styles.addressItem}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={styles.addressText}>{job.fromAddress}</Text>
                </View>
                <Text style={styles.addressArrow}>→</Text>
                <View style={styles.addressItem}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={styles.addressText}>{job.toAddress}</Text>
                </View>
              </View>

              {job.estimatedCost && (
                <Text style={styles.jobCost}>{formatCurrency(job.estimatedCost)}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Jobs</Text>
          {completedJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={[styles.jobCard, styles.completedJobCard]}
              onPress={() => onJobSelect?.(job)}
            >
              <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobNumber}>{job.jobNumber}</Text>
                  <Text style={styles.jobDate}>{formatDate(job.jobDate)} • {job.timeSlot}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                  {getStatusIcon(job.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                    {job.status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.addressContainer}>
                <View style={styles.addressItem}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={styles.addressText}>{job.fromAddress}</Text>
                </View>
                <Text style={styles.addressArrow}>→</Text>
                <View style={styles.addressItem}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={styles.addressText}>{job.toAddress}</Text>
                </View>
              </View>

              {job.estimatedCost && (
                <Text style={styles.jobCost}>{formatCurrency(job.estimatedCost)}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {jobs.length === 0 && (
        <View style={styles.emptyContainer}>
          <Package size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No jobs found</Text>
          <Text style={styles.emptySubtext}>Your scheduled and completed moves will appear here</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
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
  jobCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingJobCard: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  completedJobCard: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  jobDate: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  addressArrow: {
    fontSize: 16,
    color: '#64748b',
    marginHorizontal: 12,
  },
  jobCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});