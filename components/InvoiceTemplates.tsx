import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { FileText, Download, Eye, DollarSign, Calendar, CircleCheck as CheckCircle, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { profileService } from '@/services/profileService';
import { useAuth } from '@/hooks/useAuth';

interface Invoice {
  id: string;
  invoiceNumber: string;
  jobNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate?: string;
  services: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  createdAt: string;
}

interface InvoiceTemplatesProps {
  style?: any;
}

export const InvoiceTemplates: React.FC<InvoiceTemplatesProps> = ({ style }) => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      // Mock invoice data - replace with actual service call
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: 'INV-2024-001',
          jobNumber: 'JB-2024-001',
          customerName: user?.firstName + ' ' + user?.lastName || 'Customer',
          customerEmail: user?.email || 'customer@email.com',
          amount: 899.00,
          status: 'paid',
          dueDate: '2024-03-20',
          paidDate: '2024-03-18',
          services: [
            { description: 'Professional Moving Service', quantity: 1, rate: 699.00, total: 699.00 },
            { description: 'Packing Materials', quantity: 1, rate: 100.00, total: 100.00 },
            { description: 'Special Item Handling', quantity: 1, rate: 100.00, total: 100.00 },
          ],
          createdAt: '2024-03-15',
        },
        {
          id: '2',
          invoiceNumber: 'INV-2024-002',
          jobNumber: 'JB-2024-002',
          customerName: user?.firstName + ' ' + user?.lastName || 'Customer',
          customerEmail: user?.email || 'customer@email.com',
          amount: 650.00,
          status: 'pending',
          dueDate: '2024-03-30',
          services: [
            { description: 'Loading Service', quantity: 4, rate: 125.00, total: 500.00 },
            { description: 'Equipment Rental', quantity: 1, rate: 150.00, total: 150.00 },
          ],
          createdAt: '2024-03-25',
        },
        {
          id: '3',
          invoiceNumber: 'INV-2023-045',
          jobNumber: 'JB-2023-045',
          customerName: user?.firstName + ' ' + user?.lastName || 'Customer',
          customerEmail: user?.email || 'customer@email.com',
          amount: 1200.00,
          status: 'overdue',
          dueDate: '2024-01-15',
          services: [
            { description: 'Full Service Move', quantity: 1, rate: 1000.00, total: 1000.00 },
            { description: 'Storage (1 month)', quantity: 1, rate: 200.00, total: 200.00 },
          ],
          createdAt: '2023-12-20',
        },
      ];
      setInvoices(mockInvoices);
    } catch (error) {
      console.error('Load invoices error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    const color = getStatusColor(status);
    switch (status) {
      case 'paid': return <CheckCircle size={16} color={color} />;
      case 'pending': return <Clock size={16} color={color} />;
      case 'overdue': return <AlertTriangle size={16} color={color} />;
      default: return <FileText size={16} color={color} />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      // Generate branded PDF invoice
      const invoiceUrl = generateInvoicePDF(invoice);
      
      const supported = await Linking.canOpenURL(invoiceUrl);
      if (supported) {
        await Linking.openURL(invoiceUrl);
      } else {
        Alert.alert('Download Error', 'Unable to download invoice. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download invoice.');
    }
  };

  const generateInvoicePDF = (invoice: Invoice): string => {
    // In production, this would generate a real PDF
    // For now, return a mock URL
    return `https://app.inandoutmovin.com/invoices/${invoice.invoiceNumber}.pdf`;
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices & Billing</Text>
        <View style={styles.statusSummary}>
          <View style={styles.statusItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.statusText}>
              {invoices.filter(i => i.status === 'paid').length} Paid
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Clock size={16} color="#f59e0b" />
            <Text style={styles.statusText}>
              {invoices.filter(i => i.status === 'pending').length} Pending
            </Text>
          </View>
          {invoices.some(i => i.status === 'overdue') && (
            <View style={styles.statusItem}>
              <AlertTriangle size={16} color="#dc2626" />
              <Text style={styles.statusText}>
                {invoices.filter(i => i.status === 'overdue').length} Overdue
              </Text>
            </View>
          )}
        </View>
      </View>

      {invoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No invoices yet</Text>
          <Text style={styles.emptySubtext}>
            Your invoices and receipts will appear here
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.invoicesList} showsVerticalScrollIndicator={false}>
          {invoices.map((invoice) => (
            <View key={invoice.id} style={[
              styles.invoiceCard,
              invoice.status === 'overdue' && styles.overdueCard
            ]}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                  <Text style={styles.jobNumber}>Job: {invoice.jobNumber}</Text>
                </View>
                <View style={styles.invoiceStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                    {getStatusIcon(invoice.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                      {invoice.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.invoiceDetails}>
                <View style={styles.amountSection}>
                  <Text style={styles.amountLabel}>Total Amount</Text>
                  <Text style={[styles.amountValue, { color: getStatusColor(invoice.status) }]}>
                    {formatCurrency(invoice.amount)}
                  </Text>
                </View>

                <View style={styles.dateSection}>
                  <View style={styles.dateItem}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.dateText}>
                      Due: {formatDate(invoice.dueDate)}
                    </Text>
                  </View>
                  {invoice.paidDate && (
                    <View style={styles.dateItem}>
                      <CheckCircle size={14} color="#10b981" />
                      <Text style={styles.dateText}>
                        Paid: {formatDate(invoice.paidDate)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.servicesPreview}>
                <Text style={styles.servicesTitle}>Services</Text>
                {invoice.services.slice(0, 2).map((service, index) => (
                  <Text key={index} style={styles.serviceItem}>
                    • {service.description} - {formatCurrency(service.total)}
                  </Text>
                ))}
                {invoice.services.length > 2 && (
                  <Text style={styles.moreServices}>
                    +{invoice.services.length - 2} more services
                  </Text>
                )}
              </View>

              <View style={styles.invoiceActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDownloadInvoice(invoice)}
                >
                  <Eye size={16} color="#2563eb" />
                  <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDownloadInvoice(invoice)}
                >
                  <Download size={16} color="#2563eb" />
                  <Text style={styles.actionButtonText}>Download</Text>
                </TouchableOpacity>

                {invoice.status === 'pending' && (
                  <TouchableOpacity style={styles.payButton}>
                    <DollarSign size={16} color="#ffffff" />
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  statusSummary: {
    flexDirection: 'row',
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
  invoicesList: {
    maxHeight: 400,
  },
  invoiceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  overdueCard: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  jobNumber: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  invoiceStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invoiceDetails: {
    marginBottom: 12,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  dateSection: {
    gap: 4,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  servicesPreview: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  serviceItem: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  moreServices: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  payButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
});