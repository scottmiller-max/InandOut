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
import { ArrowLeft, MessageSquare, Plus, Send } from 'lucide-react-native';

interface TeamMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  subject: string;
  content: string;
  priority: string;
  is_read: boolean;
  parent_message_id: string | null;
  created_at: string;
}

interface StaffLite {
  user_id: string;
  name: string;
}

export default function AdminMessagesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [composeModal, setComposeModal] = useState<{ visible: boolean; replyTo: TeamMessage | null }>({
    visible: false,
    replyTo: null,
  });
  const [composeRecipient, setComposeRecipient] = useState<string | null>(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [sending, setSending] = useState(false);

  const nameFor = (userId: string | null) => {
    if (!userId) return 'Everyone';
    if (userId === currentUserId) return 'You';
    const found = staff.find((s) => s.user_id === userId);
    return found ? found.name : 'Staff';
  };

  const loadData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id || null;
      setCurrentUserId(uid);

      const { data: messagesData, error: messagesError } = await supabase
        .from('team_messages')
        .select('id, sender_id, recipient_id, subject, content, priority, is_read, parent_message_id, created_at')
        .order('created_at', { ascending: false });
      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name');
      if (usersError) throw usersError;
      setStaff(
        (usersData || []).map((u) => ({
          user_id: u.id,
          name: `${u.first_name} ${u.last_name}`.trim() || 'Staff',
        }))
      );
    } catch (error) {
      console.error('Load messages error:', error);
      Alert.alert('Error', 'Failed to load messages.');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleOpenMessage = async (message: TeamMessage) => {
    if (!message.is_read && message.recipient_id === currentUserId) {
      setProcessingId(message.id);
      try {
        const { error } = await supabase
          .from('team_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', message.id);
        if (error) throw error;
        setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m)));
      } catch (error) {
        console.error('Mark read error:', error);
      } finally {
        setProcessingId(null);
      }
    }
  };

  const openCompose = (replyTo: TeamMessage | null) => {
    if (replyTo) {
      setComposeRecipient(replyTo.sender_id === currentUserId ? replyTo.recipient_id : replyTo.sender_id);
      setComposeSubject(replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`);
    } else {
      setComposeRecipient(null);
      setComposeSubject('');
    }
    setComposeContent('');
    setComposeModal({ visible: true, replyTo });
  };

  const handleSend = async () => {
    if (!composeSubject.trim() || !composeContent.trim()) {
      Alert.alert('Missing info', 'Add a subject and message.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('team_messages').insert({
        sender_id: currentUserId,
        recipient_id: composeRecipient,
        subject: composeSubject.trim(),
        content: composeContent.trim(),
        priority: 'normal',
        parent_message_id: composeModal.replyTo?.id || null,
      });
      if (error) throw error;
      setComposeModal({ visible: false, replyTo: null });
      loadData();
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send this message.');
    } finally {
      setSending(false);
    }
  };

  const unread = messages.filter((m) => !m.is_read && m.recipient_id === currentUserId);
  const rest = messages.filter((m) => !(!m.is_read && m.recipient_id === currentUserId));

  const renderCard = (message: TeamMessage) => (
    <TouchableOpacity
      key={message.id}
      style={[styles.card, !message.is_read && message.recipient_id === currentUserId ? styles.unreadCard : null]}
      onPress={() => handleOpenMessage(message)}
      disabled={processingId === message.id}
    >
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{message.subject}</Text>
        {message.priority === 'high' || message.priority === 'urgent' ? (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityBadgeText}>{message.priority}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardMeta}>
        {nameFor(message.sender_id)} → {nameFor(message.recipient_id)}
      </Text>
      <Text style={styles.cardBody} numberOfLines={2}>
        {message.content}
      </Text>
      <View style={styles.cardFooterRow}>
        <Text style={styles.cardTimestamp}>{formatDate(message.created_at)}</Text>
        <TouchableOpacity style={styles.replyButton} onPress={() => openCompose(message)}>
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading messages...</Text>
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
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {unread.length} unread {unread.length === 1 ? 'message' : 'messages'}
            </Text>
          </View>
          <TouchableOpacity style={styles.composeIconButton} onPress={() => openCompose(null)}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MessageSquare size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>Unread</Text>
            </View>
            {unread.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>You're all caught up.</Text>
              </View>
            ) : (
              unread.map(renderCard)
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MessageSquare size={18} color="#64748b" />
              <Text style={styles.sectionTitle}>All Messages</Text>
            </View>
            {rest.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No messages yet.</Text>
              </View>
            ) : (
              rest.map(renderCard)
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={composeModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setComposeModal({ visible: false, replyTo: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{composeModal.replyTo ? 'Reply' : 'New message'}</Text>

            <Text style={styles.inputLabel}>To</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipientRow}>
              <TouchableOpacity
                style={[styles.recipientChip, composeRecipient === null ? styles.recipientChipActive : null]}
                onPress={() => setComposeRecipient(null)}
              >
                <Text
                  style={[styles.recipientChipText, composeRecipient === null ? styles.recipientChipTextActive : null]}
                >
                  Everyone
                </Text>
              </TouchableOpacity>
              {staff
                .filter((s) => s.user_id !== currentUserId)
                .map((s) => (
                  <TouchableOpacity
                    key={s.user_id}
                    style={[styles.recipientChip, composeRecipient === s.user_id ? styles.recipientChipActive : null]}
                    onPress={() => setComposeRecipient(s.user_id)}
                  >
                    <Text
                      style={[
                        styles.recipientChipText,
                        composeRecipient === s.user_id ? styles.recipientChipTextActive : null,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Subject"
              placeholderTextColor="#94a3b8"
              value={composeSubject}
              onChangeText={setComposeSubject}
            />

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Write your message..."
              placeholderTextColor="#94a3b8"
              value={composeContent}
              onChangeText={setComposeContent}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setComposeModal({ visible: false, replyTo: null })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleSend} disabled={sending}>
                <Send size={16} color="#fff" />
                <Text style={styles.modalConfirmText}>Send</Text>
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
  composeIconButton: {
    width: 36,
    height: 36,
    backgroundColor: '#2563eb',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  unreadCard: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
    textTransform: 'capitalize',
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
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  replyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  recipientRow: {
    marginBottom: 14,
  },
  recipientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 8,
  },
  recipientChipActive: {
    backgroundColor: '#2563eb',
  },
  recipientChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  recipientChipTextActive: {
    color: '#ffffff',
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
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
