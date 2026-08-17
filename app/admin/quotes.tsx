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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/services/supabase';
import { ArrowLeft, FileText, CalendarCheck, DollarSign, Send, CircleCheck as CheckCircle } from 'lucide-react-native';

interface JobRow {
  id: string;
  customer_id: string | null;
  job_number: string | null;
  status: string;
  from_address: string;
  from_city: string | null;
  to_address: string;
  to_city: string | null;
  move_date: string | null;
  home_size: string | null;
  num_movers: number | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  estimated_total: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  created_at: string;
}

interface CustomerLite {
  id: string;
  full_name: string | null;
  email: string;
}

export default function AdminQuotesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [customers, setCustomers] = useState<Record<string, CustomerLite>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [quoteModal, setQuoteModal] = useState<{ visible: boolean; job: JobRow | null }>({
    visible: false,
    job: null,
  });
  const [quoteHours, setQuoteHours] = useState('');
  const [quoteRate, setQuoteRate] = useState('150');

  const loadData = useCallback(async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(
          'id, customer_id, job_number, status, from_address, from_city, to_address, to_city, move_date, home_size, num_movers, estimated_hours, hourly_rate, estimated_total, deposit_amount, deposit_paid, created_at'
        )
        .in('status', ['lead', 'quoted', 'scheduled', 'confirmed'])
        .order('created_at', { ascending: false });
      if (jobsError) throw jobsError;

      const rows = jobsData || [];
      setJobs(rows);

      const customerIds = Array.from(new Set(rows.map((j) => j.customer_id).filter(Boolean))) as string[];
      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, full_name, email')
          .in('id', customerIds);
        if (customersError) throw customersError;
        const map: Record<string, CustomerLite> = {};
        (customersData || []).forEach((c) => {
          map[c.id] = c;
        });
        setCustomers(map);
      } else {
        setCustomers({});
      }
    } catch (error) {
      console.error('Load quotes error:', error);
      Alert.alert('Error', 'Failed to load quotes.');
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date TBD';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMoney = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '$0.00';
    return '$' + n.toFixed(2);
  };

  const openQuoteModal = (job: JobRow) => {
    setQuoteHours(job.estimated_hours ? String(job.estimated_hours) : '');
    setQuoteRate(job.hourly_rate ? String(job.hourly_rate) : '150');
    setQuoteModal({ visible: true, job });
  };

  const handleSendQuote = async () => {
    const job = quoteModal.job;
    if (!job) return;
    const hours = parseFloat(quoteHours);
    const rate = parseFloat(quoteRate);
    if (!hours || hours <= 0 || !rate || rate <= 0) {
      Alert.alert('Missing info', 'Enter valid estimated hours and hourly rate.');
      return;
    }
    const customer = job.customer_id ? customers[job.customer_id] : null;
    if (!customer?.email) {
      Alert.alert('Missing customer', 'This job has no linked customer email to send a quote to.');
      return;
    }
    const estimatedTotal = hours * rate;
    const depositRequired = estimatedTotal * 0.5;
    setProcessingId(job.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          to: customer.email,
          customer_name: customer.full_name || 'there',
          quote_id: job.job_number || job.id.slice(0, 8),
          move_date: job.move_date || 'TBD',
          from_address: job.from_address,
          to_address: job.to_address,
          home_size: job.home_size || undefined,
          crew_size: job.num_movers || undefined,
          estimated_hours: hours,
          hourly_rate: rate,
          estimated_total: estimatedTotal,
          deposit_required: depositRequired,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'quoted',
          estimated_hours: hours,
          hourly_rate: rate,
          estimated_total: estimatedTotal,
          deposit_amount: depositRequired,
        })
        .eq('id', job.id);
      if (updateError) throw updateError;

      setQuoteModal({ visible: false, job: null });
      Alert.alert('Quote sent', 'The customer has been emailed the quote.');
      loadData();
    } catch (error) {
      console.error('Send quote error:', error);
      Alert.alert('Error', 'Failed to send this quote.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmBooking = async (job: JobRow) => {
    const customer = job.customer_id ? customers[job.customer_id] : null;
    if (!customer?.email) {
      Alert.alert('Missing customer', 'This job has no linked customer email to confirm with.');
      return;
    }
    setProcessingId(job.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('send-booking-confirmation-email', {
        body: {
          to: customer.email,
          customer_name: customer.full_name || 'there',
          booking_id: job.job_number || job.id.slice(0, 8),
          move_date: job.move_date || 'TBD',
          from_address: job.from_address,
          to_address: job.to_address,
          crew_size: job.num_movers ? String(job.num_movers) : undefined,
          deposit_amount: job.deposit_amount ? formatMoney(job.deposit_amount) : undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: updateError } = await supabase.from('jobs').update({ status: 'scheduled' }).eq('id', job.id);
      if (updateError) throw updateError;

      Alert.alert('Booking confirmed', 'The customer has been emailed a booking confirmation.');
      loadData();
    } catch (error) {
      console.error('Confirm booking error:', error);
      Alert.alert('Error', 'Failed to confirm this booking.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkDepositPaid = async (job: JobRow) => {
    setProcessingId(job.id);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ deposit_paid: true, deposit_paid_at: new Date().toISOString() })
        .eq('id', job.id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Mark deposit paid error:', error);
      Alert.alert('Error', 'Failed to update deposit status.');
    } finally {
      setProcessingId(null);
    }
  };

  const needsQuote = jobs.filter((j) => j.status === 'lead');
  const awaitingBooking = jobs.filter((j) => j.status === 'quoted');
  const booked = jobs.filter((j) => j.status === 'scheduled' || j.status === 'confirmed');

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading quotes...</Text>
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
            <Text style={styles.headerTitle}>Quotes</Text>
            <Text style={styles.headerSubtitle}>
              {needsQuote.length} need{needsQuote.length === 1 ? 's' : ''} a quote · {awaitingBooking.length} awaiting booking · {booked.length} booked
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>Needs a Quote</Text>
            </View>
            {needsQuote.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No leads waiting on a quote.</Text>
              </View>
            ) : (
              needsQuote.map((job) => {
                const customer = job.customer_id ? customers[job.customer_id] : null;
                return (
                  <View key={job.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{customer?.full_name || 'Unnamed customer'}</Text>
                    <Text style={styles.cardMeta}>
                      {job.from_city || job.from_address} → {job.to_city || job.to_address}
                    </Text>
                    <Text style={styles.cardMeta}>{formatDate(job.move_date)}</Text>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={() => openQuoteModal(job)}
                      disabled={processingId === job.id}
                    >
                      <Send size={16} color="#fff" />
                      <Text style={styles.primaryButtonText}>Build & Send Quote</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarCheck size={18} color="#7c3aed" />
              <Text style={styles.sectionTitle}>Awaiting Booking</Text>
            </View>
            {awaitingBooking.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No quotes waiting on a booking decision.</Text>
              </View>
            ) : (
              awaitingBooking.map((job) => {
                const customer = job.customer_id ? customers[job.customer_id] : null;
                return (
                  <View key={job.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{customer?.full_name || 'Unnamed customer'}</Text>
                    <Text style={styles.cardMeta}>
                      {job.from_city || job.from_address} → {job.to_city || job.to_address}
                    </Text>
                    <Text style={styles.cardMeta}>{formatDate(job.move_date)}</Text>
                    <Text style={styles.cardAmount}>Quoted: {formatMoney(job.estimated_total)}</Text>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleConfirmBooking(job)}
                      disabled={processingId === job.id}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.primaryButtonText}>Confirm Booking</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Booked</Text>
            </View>
            {booked.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No booked jobs yet.</Text>
              </View>
            ) : (
              booked.map((job) => {
                const customer = job.customer_id ? customers[job.customer_id] : null;
                return (
                  <View key={job.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{customer?.full_name || 'Unnamed customer'}</Text>
                    <Text style={styles.cardMeta}>{formatDate(job.move_date)}</Text>
                    <Text style={styles.cardAmount}>Total: {formatMoney(job.estimated_total)}</Text>
                    {job.deposit_paid ? (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>Deposit paid</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.warnButton]}
                        onPress={() => handleMarkDepositPaid(job)}
                        disabled={processingId === job.id}
                      >
                        <DollarSign size={16} color="#fff" />
                        <Text style={styles.primaryButtonText}>Mark Deposit Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={quoteModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setQuoteModal({ visible: false, job: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Build quote</Text>
            <Text style={styles.modalSubtitle}>Estimated total is calculated as hours × rate.</Text>
            <Text style={styles.inputLabel}>Estimated hours</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 4"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={quoteHours}
              onChangeText={setQuoteHours}
            />
            <Text style={styles.inputLabel}>Hourly rate</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 150"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={quoteRate}
              onChangeText={setQuoteRate}
            />
            {quoteHours && quoteRate && !isNaN(parseFloat(quoteHours)) && !isNaN(parseFloat(quoteRate)) ? (
              <Text style={styles.previewTotal}>
                Total: {formatMoney(parseFloat(quoteHours) * parseFloat(quoteRate))}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setQuoteModal({ visible: false, job: null })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleSendQuote}
                disabled={!!quoteModal.job && processingId === quoteModal.job.id}
              >
                <Text style={styles.modalConfirmText}>Send Quote</Text>
              </TouchableOpacity>
            </View>
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
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  approveButton: {
    backgroundColor: '#7c3aed',
  },
  warnButton: {
    backgroundColor: '#dc2626',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  paidBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 4,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 14,
  },
  previewTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
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
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
