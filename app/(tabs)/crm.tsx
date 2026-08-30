import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageContainer } from '@/components/PageContainer';
import { Users, Search, Calendar, DollarSign, Phone, Mail, MapPin, X, AlertCircle } from 'lucide-react-native';
import { databaseService, CRMCustomer } from '@/services/database';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const YELP_PLACEHOLDER = '@yelp-lead.placeholder';

function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(YELP_PLACEHOLDER);
}

function formatEmail(email: string): string {
  if (!email || isPlaceholderEmail(email)) return 'Yelp lead - no email';
  return email;
}

export default function CRMScreen() {
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await databaseService.getCRMCustomers();
    if (err) {
      setError(err);
    } else {
      setCustomers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = customers.filter(customer =>
    `${customer.fullName} ${customer.email} ${customer.phone}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewCustomer = (customer: CRMCustomer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.centerStateText}>Loading customers...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <AlertCircle size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Failed to load customers</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCustomers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (customers.length === 0) {
      return (
        <View style={styles.centerState}>
          <Users size={64} color="#cbd5e1" />
          <Text style={styles.centerStateText}>No customers yet</Text>
        </View>
      );
    }

    if (filteredCustomers.length === 0) {
      return (
        <View style={styles.centerState}>
          <Search size={48} color="#cbd5e1" />
          <Text style={styles.centerStateText}>No customers match your search</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.customerList} showsVerticalScrollIndicator={false}>
        {filteredCustomers.map((customer) => (
          <TouchableOpacity
            key={customer.id}
            style={styles.customerCard}
            onPress={() => handleViewCustomer(customer)}
          >
            <View style={styles.customerHeader}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customer.fullName}</Text>
                <Text style={styles.customerEmail}>{formatEmail(customer.email)}</Text>
              </View>
            </View>

            <View style={styles.customerDetails}>
              {customer.phone ? (
                <View style={styles.detailItem}>
                  <Phone size={16} color="#64748b" />
                  <Text style={styles.detailText}>{customer.phone}</Text>
                </View>
              ) : null}
              {customer.city ? (
                <View style={styles.detailItem}>
                  <MapPin size={16} color="#64748b" />
                  <Text style={styles.detailText}>
                    {customer.city}{customer.state ? `, ${customer.state}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.jobSummary}>
              <View style={styles.summaryItem}>
                <Calendar size={16} color="#2563eb" />
                <Text style={styles.summaryLabel}>Jobs:</Text>
                <Text style={styles.summaryValue}>{customer.jobsCount}</Text>
              </View>
              <View style={styles.summaryItem}>
                <DollarSign size={16} color="#059669" />
                <Text style={styles.summaryLabel}>Spent:</Text>
                <Text style={styles.summaryValue}>${customer.totalSpent.toLocaleString()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
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

        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or phone..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {renderContent()}

        <Modal
          visible={showCustomerModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCustomerModal(false)}
        >
          {selectedCustomer && (
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedCustomer.fullName}</Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.customerInfoCard}>
                  <Text style={styles.cardTitle}>Contact Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Mail size={20} color="#2563eb" />
                      <Text style={styles.infoText}>{formatEmail(selectedCustomer.email)}</Text>
                    </View>
                    {selectedCustomer.phone ? (
                      <View style={styles.infoItem}>
                        <Phone size={20} color="#2563eb" />
                        <Text style={styles.infoText}>{selectedCustomer.phone}</Text>
                      </View>
                    ) : null}
                    {selectedCustomer.city ? (
                      <View style={styles.infoItem}>
                        <MapPin size={20} color="#2563eb" />
                        <Text style={styles.infoText}>
                          {selectedCustomer.city}{selectedCustomer.state ? `, ${selectedCustomer.state}` : ''}
                        </Text>
                      </View>
                    ) : null}
                    {selectedCustomer.source ? (
                      <View style={styles.infoItem}>
                        <Users size={20} color="#2563eb" />
                        <Text style={styles.infoText}>Source: {selectedCustomer.source}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.cardTitle}>Job Summary</Text>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Total Jobs</Text>
                    <Text style={styles.modalSummaryValue}>{selectedCustomer.jobsCount}</Text>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Total Spent</Text>
                    <Text style={styles.modalSummaryValue}>${selectedCustomer.totalSpent.toLocaleString()}</Text>
                  </View>
                </View>
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
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  centerStateText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  customerList: {
    flex: 1,
    paddingHorizontal: 20,
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
  summaryCard: {
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
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSummaryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  modalSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
});
