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
import { ArrowLeft, Mail, Phone, Clock, CircleCheck as CheckCircle, CircleX as XCircle, Sparkles, Inbox } from 'lucide-react-native';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  source: string;
  created_at: string;
}

interface DraftJob {
  id: string;
  customer_id: string | null;
  job_data: Record<string, any>;
  riley_notes: string | null;
  riley_confidence_score: number | null;
  status: string;
  created_at: string;
}

export default function AdminLeadsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [draftJobs, setDraftJobs] = useState<DraftJob[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; draftId: string | null }>({
    visible: false,
    draftId: null,
  });
  const [rejectReason, setRejectReason] = useState('');

  const loadLeads = useCallback(async () => {
    try {
      const [subsResult, draftsResult] = await Promise.all([
        supabase
          .from('contact_submissions')
          .select('id, name, email, phone, subject, message, status, source, created_at')
          .in('status', ['new', 'pending'])
          .order('created_at', { ascending: false }),
        supabase
          .from('draft_jobs')
          .select('id, customer_id, job_data, riley_notes, riley_confidence_score, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (subsResult.error) throw subsResult.error;
      if (draftsResult.error) throw draftsResult.error;

      setSubmissions(subsResult.data || []);
      setDraftJobs(draftsResult.data || []);
    } catch (error) {
      console.error('Load leads error:', error);
      Alert.alert('Error', 'Failed to load leads.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeads();
  };

  const handleMarkResponded = async (id: string) => {
    setProcessingId(id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('contact_submissions')
        .update({
          status: 'responded',
          responded_at: new Date().toISOString(),
          responded_by: userData.user?.id,
        })
        .eq('id', id);
      if (error) throw error;
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Mark responded error:', error);
      Alert.alert('Error', 'Failed to update this inquiry.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchive = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase.from('contact_submissions').update({ status: 'archived' }).eq('id', id);
      if (error) throw error;
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Archive error:', error);
      Alert.alert('Error', 'Failed to archive this inquiry.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDraft = async (id: string) => {
    setProcessingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('approve-draft-job', {
        body: { draft_job_id: id, action: 'approve' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraftJobs((prev) => prev.filter((d) => d.id !== id));
      Alert.alert('Approved', 'Draft job converted to a real job.');
    } catch (error) {
      console.error('Approve draft job error:', error);
      Alert.alert('Error', 'Failed to approve this draft job.');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectReason('');
    setRejectModal({ visible: true, draftId: id });
  };

  const handleRejectDraft = async () => {
    if (!rejectModal.draftId) return;
    const id = rejectModal.draftId;
    setProcessingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('approve-draft-job', {
        body: { draft_job_id: id, action: 'reject', rejection_reason: rejectReason || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraftJobs((prev) => prev.filter((d) => d.id !== id));
      setRejectModal({ visible: false, draftId: null });
    } catch (error) {
      console.error('Reject draft job error:', error);
      Alert.alert('Error', 'Failed to reject this draft job.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatConfidence = (score: number | null) => {
    if (score === null || score === undefined) return null;
    return Math.round(score * 100) + '% confidence';
  };

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading leads...</Text>
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
            <Text style={styles.headerTitle}>Leads</Text>
            <Text style={styles.headerSubtitle}>
              {submissions.length} new {submissions.length === 1 ? 'inquiry' : 'inquiries'} · {draftJobs.length} draft{' '}
              {draftJobs.length === 1 ? 'job' : 'jobs'} to review
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={18} color="#7c3aed" />
              <Text style={styles.sectionTitle}>Riley Draft Jobs — Needs Review</Text>
            </View>
            {draftJobs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No draft jobs waiting on you right now.</Text>
              </View>
            ) : (
              draftJobs.map((draft) => {
                const jd = draft.job_data || {};
                const confidence = formatConfidence(draft.riley_confidence_score);
                return (
                  <View key={draft.id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>
                        {jd.from_city || jd.from_address || 'Origin TBD'} → {jd.to_city || jd.to_address || 'Destination TBD'}
                      </Text>
                      {confidence ? (
                        <View style={styles.confidenceBadge}>
                          <Text style={styles.confidenceText}>{confidence}</Text>
                        </View>
                      ) : null}
                    </View>
                    {jd.move_date ? <Text style={styles.cardMeta}>Move date: {jd.move_date}</Text> : null}
                    {draft.riley_notes ? <Text style={styles.cardBody}>{draft.riley_notes}</Text> : null}
                    <View style={styles.timestampRow}>
                      <Clock size={12} color="#94a3b8" />
                      <Text style={styles.cardTimestamp}>{formatDate(draft.created_at)}</Text>
                    </View>
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveDraft(draft.id)}
                        disabled={processingId === draft.id}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => openRejectModal(draft.id)}
                        disabled={processingId === draft.id}
                      >
                        <XCircle size={16} color="#dc2626" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Inbox size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>New Inquiries</Text>
            </View>
            {submissions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No new inquiries right now.</Text>
              </View>
            ) : (
              submissions.map((sub) => (
                <View key={sub.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{sub.name}</Text>
                    <Text style={styles.sourceTag}>{sub.source.replace(/_/g, ' ')}</Text>
                  </View>
                  {sub.subject ? <Text style={styles.cardMeta}>{sub.subject}</Text> : null}
                  <View style={styles.contactRow}>
                    {sub.email ? (
                      <View style={styles.contactItem}>
                        <Mail size={14} color="#64748b" />
                        <Text style={styles.contactText}>{sub.email}</Text>
                      </View>
                    ) : null}
                    {sub.phone ? (
                      <View style={styles.contactItem}>
                        <Phone size={14} color="#64748b" />
                        <Text style={styles.contactText}>{sub.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardBody}>{sub.message}</Text>
                  <View style={styles.timestampRow}>
                    <Clock size={12} color="#94a3b8" />
                    <Text style={styles.cardTimestamp}>{formatDate(sub.created_at)}</Text>
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleMarkResponded(sub.id)}
                      disabled={processingId === sub.id}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>Mark Responded</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.archiveButton]}
                      onPress={() => handleArchive(sub.id)}
                      disabled={processingId === sub.id}
                    >
                      <Text style={styles.archiveButtonText}>Archive</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={rejectModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectModal({ visible: false, draftId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject draft job</Text>
            <Text style={styles.modalSubtitle}>Optional: let Riley know why, to improve future suggestions.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason (optional)"
              placeholderTextColor="#94a3b8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setRejectModal({ visible: false, draftId: null })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleRejectDraft}>
                <Text style={styles.modalConfirmText}>Reject</Text>
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  sourceTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    textTransform: 'capitalize',
  },
  confidenceBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
  },
  cardMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: '#64748b',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  approveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  archiveButton: {
    backgroundColor: '#f1f5f9',
  },
  archiveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
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
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
