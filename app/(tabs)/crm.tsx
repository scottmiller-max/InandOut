import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageContainer } from '@/components/PageContainer';
import { Users, Search, Star, Calendar, DollarSign, Phone, Mail, MapPin, X, Eye } from 'lucide-react-native';
import { CRMCustomerData } from '@/services/crm';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import DUMMY_CUSTOMERS from '@/fixtures/dummyCustomers';

export default function CRMScreen() {
  const [customers, setCustomers] = useState<CRMCustomerData[]>(DUMMY_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomerData | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const filteredCustomers = customers.filter(customer =>
    `${customer.firstName} ${customer.lastName} ${customer.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewCustomer = (customer: CRMCustomerData) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  return (
    <ErrorBoundary>
      <PageContainer scroll={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>CRM Dashboard</Text>
            <View style={styles.statsOverview}>
              <Users size={16} color="#64748b" />
              <Text style={styles.statsText}>{customers.length} Total Customers</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <DateTimeDisplay />
            <GlobalSignOutButton compact />
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
        <ScrollView style={styles.customerList} showsVerticalScrollIndicator={false}>
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          ) : (
            filteredCustomers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.customerCard}
                onPress={() => handleViewCustomer(customer)}
              >
                <View style={styles.customerHeader}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>
                      {customer.firstName} {customer.lastName}
                    </Text>
                    <Text style={styles.customerEmail}>{customer.email}</Text>
                  </View>
                  {customer.averageRating > 0 && (
                    <View style={styles.customerStats}>
                      <View style={styles.ratingContainer}>
                        <Star size={16} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.ratingText}>{customer.averageRating.toFixed(1)}</Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.customerDetails}>
                  <View style={styles.detailItem}>
                    <Phone size={16} color="#64748b" />
                    <Text style={styles.detailText}>{customer.phone}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MapPin size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      {customer.city}, {customer.state}
                    </Text>
                  </View>
                </View>

                <View style={styles.jobSummary}>
                  <View style={styles.summaryItem}>
                    <Calendar size={16} color="#2563eb" />
                    <Text style={styles.summaryLabel}>Jobs:</Text>
                    <Text style={styles.summaryValue}>{customer.totalJobs}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <DollarSign size={16} color="#059669" />
                    <Text style={styles.summaryLabel}>Spent:</Text>
                    <Text style={styles.summaryValue}>${customer.totalSpent}</Text>
                  </View>
                </View>

                {customer.latestReview && (
                  <View style={styles.reviewPreview}>
                    <Text style={styles.reviewText} numberOfLines={2}>
                      "{customer.latestReview.customerComments}"
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(customer.latestReview.reviewDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Customer Details Modal */}
        <Modal
          visible={showCustomerModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCustomerModal(false)}
        >
          {selectedCustomer && (
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Customer Info Card */}
                <View style={styles.customerInfoCard}>
                  <Text style={styles.cardTitle}>Contact Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Mail size={20} color="#2563eb" />
                      <Text style={styles.infoText}>{selectedCustomer.email}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Phone size={20} color="#2563eb" />
                      <Text style={styles.infoText}>{selectedCustomer.phone}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <MapPin size={20} color="#2563eb" />
                      <Text style={styles.infoText}>
                        {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state}{' '}
                        {selectedCustomer.zipCode}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Jobs Card */}
                {selectedCustomer.jobs && selectedCustomer.jobs.length > 0 && (
                  <View style={styles.jobsCard}>
                    <Text style={styles.cardTitle}>Jobs ({selectedCustomer.jobs.length})</Text>
                    {selectedCustomer.jobs.map((job) => (
                      <View key={job.id} style={styles.jobItem}>
                        <View style={styles.jobHeader}>
                          <Text style={styles.jobNumber}>{job.jobNumber}</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              job.status === 'completed' && styles.completedBadge,
                              job.status === 'in_progress' && styles.inProgressBadge,
                              job.status === 'scheduled' && styles.scheduledBadge,
                            ]}
                          >
                            <Text style={styles.statusText}>{job.status.replace('_', ' ')}</Text>
                          </View>
                        </View>
                        <Text style={styles.jobDate}>{job.jobDate}</Text>
                        <Text style={styles.jobService}>{job.serviceType.replace('_', ' ')}</Text>
                        <Text style={styles.jobCost}>
                          ${job.actualCost || job.estimatedCost}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Reviews Card */}
                {selectedCustomer.reviews && selectedCustomer.reviews.length > 0 && (
                  <View style={styles.reviewsCard}>
                    <Text style={styles.cardTitle}>Reviews ({selectedCustomer.reviews.length})</Text>
                    {selectedCustomer.reviews.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewRating}>
                            <Star size={20} color="#f59e0b" fill="#f59e0b" />
                            <Text style={styles.ratingText}>{review.overallRating.toFixed(1)}</Text>
                          </View>
                          <Text style={styles.reviewDate}>
                            {new Date(review.reviewDate).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.reviewComments}>
                          <Text style={styles.commentsTitle}>Customer Comments:</Text>
                          <Text style={styles.commentsText}>{review.customerComments}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>
      </PageContainer>
    </ErrorBoundary>
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
  headerLeft: {
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
