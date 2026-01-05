import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, Star, Calendar, DollarSign, Phone, Mail, MapPin, Plus, X, Eye, Filter, Download, ChartBar as BarChart3, TrendingUp, ArrowLeft } from 'lucide-react-native';
import { crmService, CRMCustomerData, CustomerReview } from '@/services/crm';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { AdminDashboard } from '@/components/AdminDashboard';
import { PerformanceOptimizer, OptimizedListItem } from '@/components/PerformanceOptimizer';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AdminCRMScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CRMCustomerData[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CRMCustomerData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomerData | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'value'>('date');
  const [showDashboard, setShowDashboard] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (!accessDenied) {
      loadCustomers();
    }
  }, [accessDenied]);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers, filterStatus, sortBy]);

  const checkAdminAccess = () => {
    // In production, check user role from database
    // For demo, allow access in development or for specific email domains
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isAdminEmail = user?.email?.includes('@inoutmoving.com') || user?.email?.includes('@admin.com');
    
    if (!isDevelopment && !isAdminEmail) {
      setAccessDenied(true);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await crmService.getAllCustomers();
      setCustomers(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(customer =>
        customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(customer => {
        const hasActiveJobs = customer.jobs.some(job => 
          job.status === 'scheduled' || job.status === 'in_progress'
        );
        return filterStatus === 'active' ? hasActiveJobs : !hasActiveJobs;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'value':
          return b.totalSpent - a.totalSpent;
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredCustomers(filtered);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        color={index < rating ? '#f59e0b' : '#e5e7eb'}
        fill={index < rating ? '#f59e0b' : 'transparent'}
      />
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const openCustomerDetails = (customer: CRMCustomerData) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleBackToApp = () => {
    router.push('/(tabs)');
  };

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <View style={styles.accessDeniedContent}>
            <Users size={64} color="#dc2626" />
            <Text style={styles.accessDeniedTitle}>Access Denied</Text>
            <Text style={styles.accessDeniedText}>
              This admin area is restricted to authorized personnel only.
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToApp}>
              <ArrowLeft size={16} color="#ffffff" />
              <Text style={styles.backButtonText}>Back to App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <PerformanceOptimizer>
        <SafeAreaView style={styles.container}>
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backIconButton} onPress={handleBackToApp}>
              <ArrowLeft size={18} color="#2563eb" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Admin CRM</Text>
              <View style={styles.statsOverview}>
                <Text style={styles.statsText}>{customers.length} customers</Text>
                <Text style={styles.statsText}>•</Text>
                <Text style={styles.statsText}>{customers.reduce((sum, c) => sum + c.totalJobs, 0)} jobs</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowDashboard(!showDashboard)}
            >
              <BarChart3 size={18} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Download size={18} color="#2563eb" />
            </TouchableOpacity>
            <GlobalSignOutButton compact />
          </View>
        </View>

        {/* Admin Dashboard */}
        {showDashboard && (
          <View style={styles.dashboardSection}>
            <AdminDashboard />
          </View>
        )}

        {/* Filters and Controls */}
        <View style={styles.controlsSection}>
          <View style={styles.filtersRow}>
            <TouchableOpacity 
              style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filterStatus === 'active' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('active')}
            >
              <Text style={[styles.filterText, filterStatus === 'active' && styles.filterTextActive]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filterStatus === 'completed' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('completed')}
            >
              <Text style={[styles.filterText, filterStatus === 'completed' && styles.filterTextActive]}>Completed</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
              onPress={() => setSortBy('date')}
            >
              <Text style={[styles.sortText, sortBy === 'date' && styles.sortTextActive]}>Date</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.sortText, sortBy === 'name' && styles.sortTextActive]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'value' && styles.sortButtonActive]}
              onPress={() => setSortBy('value')}
            >
              <Text style={[styles.sortText, sortBy === 'value' && styles.sortTextActive]}>Value</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Customer List */}
        <View style={styles.customerList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading customers...</Text>
            </View>
          ) : filteredCustomers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          ) : (
            filteredCustomers.map((customer) => (
              <OptimizedListItem key={customer.id}>
                <TouchableOpacity
                  style={styles.customerCard}
                  onPress={() => openCustomerDetails(customer)}
                >
                  {/* Customer Header */}
                  <View style={styles.customerHeader}>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>
                        {customer.firstName} {customer.lastName}
                      </Text>
                      <Text style={styles.customerEmail}>{customer.email}</Text>
                    </View>
                    <View style={styles.customerStats}>
                      <View style={styles.ratingContainer}>
                        {renderStars(Math.round(customer.averageRating))}
                        <Text style={styles.ratingText}>{customer.averageRating.toFixed(1)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Customer Details */}
                  <View style={styles.customerDetails}>
                    <View style={styles.detailItem}>
                      <Phone size={14} color="#64748b" />
                      <Text style={styles.detailText}>{customer.phone}</Text>
                    </View>
                    {customer.address && (
                      <View style={styles.detailItem}>
                        <MapPin size={14} color="#64748b" />
                        <Text style={styles.detailText}>
                          {customer.address}, {customer.city}, {customer.state} {customer.zipCode}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Job Summary */}
                  <View style={styles.jobSummary}>
                    <View style={styles.summaryItem}>
                      <Calendar size={16} color="#2563eb" />
                      <Text style={styles.summaryLabel}>Jobs</Text>
                      <Text style={styles.summaryValue}>{customer.totalJobs}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <DollarSign size={16} color="#059669" />
                      <Text style={styles.summaryLabel}>Total</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(customer.totalSpent)}</Text>
                    </View>
                  </View>

                  {/* Latest Review Preview */}
                  {customer.latestReview && (
                    <View style={styles.reviewPreview}>
                      <Text style={styles.reviewText} numberOfLines={2}>
                        "{customer.latestReview.customerComments}"
                      </Text>
                      <Text style={styles.reviewDate}>
                        {formatDate(customer.latestReview.reviewDate)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </OptimizedListItem>
            ))
          )}
        </View>
          </ScrollView>

        {/* Customer Detail Modal */}
        <Modal
          visible={showCustomerModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            {selectedCustomer && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                    <X size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  {/* Customer Info */}
                  <View style={styles.customerInfoCard}>
                    <Text style={styles.cardTitle}>Customer Information</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Mail size={16} color="#64748b" />
                        <Text style={styles.infoText}>{selectedCustomer.email}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Phone size={16} color="#64748b" />
                        <Text style={styles.infoText}>{selectedCustomer.phone}</Text>
                      </View>
                      {selectedCustomer.address && (
                        <View style={styles.infoItem}>
                          <MapPin size={16} color="#64748b" />
                          <Text style={styles.infoText}>
                            {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.zipCode}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Jobs */}
                  <View style={styles.jobsCard}>
                    <Text style={styles.cardTitle}>Jobs ({selectedCustomer.jobs.length})</Text>
                    {selectedCustomer.jobs.map((job) => (
                      <View key={job.id} style={styles.jobItem}>
                        <View style={styles.jobHeader}>
                          <Text style={styles.jobNumber}>{job.jobNumber}</Text>
                          <View style={[styles.statusBadge, 
                            job.status === 'completed' ? styles.completedBadge :
                            job.status === 'in_progress' ? styles.inProgressBadge :
                            job.status === 'cancelled' ? styles.cancelledBadge :
                            styles.scheduledBadge
                          ]}>
                            <Text style={styles.statusText}>{job.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.jobDate}>{formatDate(job.jobDate)} - {job.timeSlot}</Text>
                        <Text style={styles.jobService}>{job.serviceType.replace('_', ' & ')}</Text>
                        {job.actualCost && (
                          <Text style={styles.jobCost}>{formatCurrency(job.actualCost)}</Text>
                        )}
                        {job.customerNotes && (
                          <Text style={styles.jobNotes} numberOfLines={2}>
                            Notes: {job.customerNotes}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Reviews */}
                  <View style={styles.reviewsCard}>
                    <Text style={styles.cardTitle}>Reviews ({selectedCustomer.reviews.length})</Text>
                    {selectedCustomer.reviews.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewHeader}>
                          <Text style={styles.reviewDate}>{formatDate(review.reviewDate)}</Text>
                          <View style={styles.reviewRating}>
                            {renderStars(review.overallRating)}
                          </View>
                        </View>
                        
                        <View style={styles.ratingBreakdown}>
                          <View style={styles.ratingRow}>
                            <Text style={styles.ratingLabel}>Communication</Text>
                            <View style={styles.ratingStars}>
                              {renderStars(review.communicationRating)}
                            </View>
                          </View>
                          <View style={styles.ratingRow}>
                            <Text style={styles.ratingLabel}>Professionalism</Text>
                            <View style={styles.ratingStars}>
                              {renderStars(review.professionalismRating)}
                            </View>
                          </View>
                          <View style={styles.ratingRow}>
                            <Text style={styles.ratingLabel}>Service</Text>
                            <View style={styles.ratingStars}>
                              {renderStars(review.serviceRating)}
                            </View>
                          </View>
                          <View style={styles.ratingRow}>
                            <Text style={styles.ratingLabel}>Satisfaction</Text>
                            <View style={styles.ratingStars}>
                              {renderStars(review.satisfactionRating)}
                            </View>
                          </View>
                        </View>

                        {review.customerComments && (
                          <View style={styles.reviewComments}>
                            <Text style={styles.commentsTitle}>Customer Comments</Text>
                            <Text style={styles.commentsText}>{review.customerComments}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </Modal>
        </SafeAreaView>
      </PerformanceOptimizer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc2626',
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  dashboardSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statsOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  controlsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
  },
  sortButtonActive: {
    backgroundColor: '#dbeafe',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  sortTextActive: {
    color: '#2563eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    fontFamily: 'Inter-Regular',
  },
  customerList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 16,
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  customerDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
    flex: 1,
  },
  jobSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
    marginRight: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  reviewPreview: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  customerInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginLeft: 12,
    flex: 1,
  },
  jobsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  jobItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
  },
  inProgressBadge: {
    backgroundColor: '#fef3c7',
  },
  scheduledBadge: {
    backgroundColor: '#dbeafe',
  },
  cancelledBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  jobDate: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  jobService: {
    fontSize: 14,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  jobCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  jobNotes: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  reviewsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBreakdown: {
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  reviewComments: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    marginBottom: 6,
  },
  commentsText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
});