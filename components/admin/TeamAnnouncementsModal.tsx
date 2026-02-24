import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import {
  X,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Paperclip,
  Calendar,
  Users,
  Check,
  Trash2,
  Plus,
  FileText,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../services/supabase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  target_roles: string[];
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  is_read?: boolean;
}

interface TeamAnnouncementsModalProps {
  visible: boolean;
  onClose: () => void;
  canCreate?: boolean;
}

const PRIORITY_CONFIG = {
  urgent: {
    icon: AlertTriangle,
    color: '#ef4444',
    bgColor: '#fef2f2',
    label: 'Urgent',
  },
  important: {
    icon: AlertCircle,
    color: '#f97316',
    bgColor: '#fff7ed',
    label: 'Important',
  },
  normal: {
    icon: Info,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    label: 'Normal',
  },
};

const ROLE_OPTIONS = [
  { value: 'master_admin', label: 'Master Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'crew', label: 'Crew' },
];

export default function TeamAnnouncementsModal({
  visible,
  onClose,
  canCreate = false,
}: TeamAnnouncementsModalProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [newTargetRoles, setNewTargetRoles] = useState<string[]>(['master_admin', 'admin', 'dispatcher', 'crew']);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; uri: string; type: string } | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: announcementsData, error: fetchError } = await supabase
        .from('team_announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const { data: readsData } = await supabase
        .from('team_announcement_reads')
        .select('announcement_id');

      const readIds = new Set((readsData || []).map((r) => r.announcement_id));

      const withReadStatus = (announcementsData || []).map((a) => ({
        ...a,
        is_read: readIds.has(a.id),
      }));

      setAnnouncements(withReadStatus);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchAnnouncements();
    }
  }, [visible, fetchAnnouncements]);

  const markAsRead = async (announcementId: string) => {
    try {
      await supabase.from('team_announcement_reads').upsert({
        announcement_id: announcementId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, is_read: true } : a))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setAttachment({
          name: file.name,
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      console.error('Failed to pick document:', err);
    }
  };

  const uploadAttachment = async (): Promise<{ url: string; name: string; type: string } | null> => {
    if (!attachment) return null;

    try {
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const response = await fetch(attachment.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: attachment.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        name: attachment.name,
        type: attachment.type,
      };
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      return null;
    }
  };

  const createAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      let attachmentData = null;
      if (attachment) {
        attachmentData = await uploadAttachment();
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error: createError } = await supabase.from('team_announcements').insert({
        title: newTitle.trim(),
        content: newContent.trim(),
        priority: newPriority,
        target_roles: newTargetRoles,
        expires_at: newExpiresAt || null,
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
        attachment_type: attachmentData?.type || null,
        created_by: userData.user?.id,
      });

      if (createError) throw createError;

      setNewTitle('');
      setNewContent('');
      setNewPriority('normal');
      setNewTargetRoles(['master_admin', 'admin', 'dispatcher', 'crew']);
      setNewExpiresAt('');
      setAttachment(null);
      setShowCreateForm(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to create announcement:', err);
      setError('Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('team_announcements')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const toggleRole = (role: string) => {
    setNewTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderAnnouncement = (announcement: Announcement) => {
    const config = PRIORITY_CONFIG[announcement.priority];
    const Icon = config.icon;

    return (
      <TouchableOpacity
        key={announcement.id}
        style={[
          styles.announcementCard,
          { borderLeftColor: config.color },
          !announcement.is_read && styles.unreadCard,
        ]}
        onPress={() => markAsRead(announcement.id)}
        activeOpacity={0.8}
      >
        <View style={styles.announcementHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: config.bgColor }]}>
            <Icon size={14} color={config.color} />
            <Text style={[styles.priorityText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={styles.announcementDate}>{formatDate(announcement.created_at)}</Text>
        </View>
        <Text style={styles.announcementTitle}>{announcement.title}</Text>
        <Text style={styles.announcementContent}>{announcement.content}</Text>
        {announcement.attachment_url && (
          <TouchableOpacity
            style={styles.attachmentLink}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open(announcement.attachment_url!, '_blank');
              }
            }}
          >
            <FileText size={14} color="#2563eb" />
            <Text style={styles.attachmentText}>{announcement.attachment_name}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.announcementFooter}>
          <View style={styles.targetRoles}>
            <Users size={12} color="#94a3b8" />
            <Text style={styles.targetRolesText}>
              {announcement.target_roles.map((r) => r.replace('_', ' ')).join(', ')}
            </Text>
          </View>
          {!announcement.is_read && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>New</Text>
            </View>
          )}
          {canCreate && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteAnnouncement(announcement.id)}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateForm = () => (
    <View style={styles.createForm}>
      <Text style={styles.formTitle}>New Announcement</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="Announcement title..."
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Content</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={newContent}
          onChangeText={setNewContent}
          placeholder="Announcement content..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityOptions}>
          {(['normal', 'important', 'urgent'] as const).map((priority) => {
            const config = PRIORITY_CONFIG[priority];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityOption,
                  newPriority === priority && { backgroundColor: config.bgColor, borderColor: config.color },
                ]}
                onPress={() => setNewPriority(priority)}
              >
                <Icon size={16} color={newPriority === priority ? config.color : '#64748b'} />
                <Text style={[styles.priorityOptionText, newPriority === priority && { color: config.color }]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Target Roles</Text>
        <View style={styles.roleOptions}>
          {ROLE_OPTIONS.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.roleOption,
                newTargetRoles.includes(role.value) && styles.roleOptionSelected,
              ]}
              onPress={() => toggleRole(role.value)}
            >
              {newTargetRoles.includes(role.value) && <Check size={14} color="#fff" />}
              <Text
                style={[
                  styles.roleOptionText,
                  newTargetRoles.includes(role.value) && styles.roleOptionTextSelected,
                ]}
              >
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Expiration Date (Optional)</Text>
        <TextInput
          style={styles.input}
          value={newExpiresAt}
          onChangeText={setNewExpiresAt}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Attachment (Optional)</Text>
        <TouchableOpacity style={styles.attachButton} onPress={pickAttachment}>
          <Paperclip size={18} color="#64748b" />
          <Text style={styles.attachButtonText}>
            {attachment ? attachment.name : 'Add attachment (PDF, images, docs)'}
          </Text>
          {attachment && (
            <TouchableOpacity onPress={() => setAttachment(null)}>
              <X size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowCreateForm(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={createAnnouncement}
          disabled={submitting || !newTitle.trim() || !newContent.trim()}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post Announcement</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bell size={24} color="#2563eb" />
              <Text style={styles.title}>Team Announcements</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {canCreate && !showCreateForm && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateForm(true)}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.createButtonText}>New Announcement</Text>
            </TouchableOpacity>
          )}

          {showCreateForm ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {renderCreateForm()}
            </ScrollView>
          ) : loading ? (
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading announcements...</Text>
            </View>
          ) : error ? (
            <View style={styles.centeredContainer}>
              <AlertTriangle size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchAnnouncements}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.centeredContainer}>
              <Bell size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No announcements</Text>
              <Text style={styles.emptyHint}>Check back later for updates</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {announcements.map(renderAnnouncement)}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      default: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    padding: 12,
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unreadCard: {
    backgroundColor: '#fafbfc',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  announcementDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  attachmentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  attachmentText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  announcementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  targetRoles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  targetRolesText: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  createForm: {
    padding: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  roleOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleOptionText: {
    fontSize: 13,
    color: '#64748b',
  },
  roleOptionTextSelected: {
    color: '#fff',
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  attachButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ef4444',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyHint: {
    marginTop: 4,
    fontSize: 14,
    color: '#94a3b8',
  },
});
