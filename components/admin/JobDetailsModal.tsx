import React, { useState, useEffect } from 'react';
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
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Users,
  Truck,
  DollarSign,
  FileText,
  Edit3,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { supabase } from '../../services/supabase';

interface JobDetails {
  id: string;
  job_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  from_address: string;
  from_city?: string;
  from_state?: string;
  from_zip?: string;
  to_address: string;
  to_city?: string;
  to_state?: string;
  to_zip?: string;
  move_date: string;
  move_time: string | null;
  status: string;
  num_movers: number;
  estimated_hours: number;
  hourly_rate?: number;
  estimated_total?: number;
  team_lead_id: string | null;
  crew_ids?: string[];
  truck_number?: string;
  has_deposit: boolean;
  deposit_amount?: number;
  notes?: string;
  internal_notes?: string;
  customer_id?: string;
}

interface JobDetailsModalProps {
  visible: boolean;
  job: JobDetails | null;
  onClose: () => void;
  onUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead', color: '#94a3b8' },
  { value: 'quoted', label: 'Quoted', color: '#a78bfa' },
  { value: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
  { value: 'confirmed', label: 'Confirmed', color: '#2563eb' },
  { value: 'in_progress', label: 'In Progress', color: '#f97316' },
  { value: 'completed', label: 'Completed', color: '#22c55e' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

export default function JobDetailsModal({
  visible,
  job,
  onClose,
  onUpdate,
}: JobDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editedDate, setEditedDate] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const [editedStatus, setEditedStatus] = useState('');
  const [editedInternalNotes, setEditedInternalNotes] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    if (job) {
      setEditedDate(job.move_date || '');
      setEditedTime(job.move_time || '');
      setEditedStatus(job.status || '');
      setEditedInternalNotes(job.internal_notes || '');
      setIsEditing(false);
      setError(null);
    }
  }, [job]);

  const handleSave = async () => {
    if (!job) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          move_date: editedDate || null,
          move_time: editedTime || null,
          status: editedStatus,
          internal_notes: editedInternalNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      setIsEditing(false);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to update job:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (job) {
      setEditedDate(job.move_date || '');
      setEditedTime(job.move_time || '');
      setEditedStatus(job.status || '');
      setEditedInternalNotes(job.internal_notes || '');
    }
    setIsEditing(false);
    setError(null);
  };

  const formatAddress = (
    address?: string,
    city?: string,
    state?: string,
    zip?: string
  ) => {
    const parts = [address, city, state, zip].filter(Boolean);
    return parts.join(', ') || 'Not specified';
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  };

  if (!job) return null;

  const statusConfig = getStatusConfig(isEditing ? editedStatus : job.status);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.jobNumber}>{job.job_number || 'New Job'}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                <Text style={styles.statusText}>{statusConfig.label}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {!isEditing ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Edit3 size={18} color="#2563eb" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancel}>
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Save size={16} color="#fff" />
                        <Text style={styles.saveButtonText}>Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <User size={18} color="#64748b" />
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{job.customer_name || 'Unknown'}</Text>
                </View>
                {job.customer_phone && (
                  <View style={styles.infoRow}>
                    <Phone size={18} color="#64748b" />
                    <Text style={styles.infoLabel}>Phone</Text>
                    <TouchableOpacity>
                      <Text style={[styles.infoValue, styles.linkText]}>{job.customer_phone}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {job.customer_email && (
                  <View style={styles.infoRow}>
                    <Mail size={18} color="#64748b" />
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={[styles.infoValue, styles.linkText]}>{job.customer_email}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Move Details</Text>
              <View style={styles.infoCard}>
                <View style={styles.addressRow}>
                  <View style={styles.addressIcon}>
                    <View style={styles.fromDot} />
                    <View style={styles.addressLine} />
                    <MapPin size={16} color="#22c55e" />
                  </View>
                  <View style={styles.addressContent}>
                    <Text style={styles.addressLabel}>From</Text>
                    <Text style={styles.addressValue}>
                      {formatAddress(job.from_address, job.from_city, job.from_state, job.from_zip)}
                    </Text>
                    <Text style={[styles.addressLabel, { marginTop: 16 }]}>To</Text>
                    <Text style={styles.addressValue}>
                      {formatAddress(job.to_address, job.to_city, job.to_state, job.to_zip)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              <View style={styles.infoCard}>
                {isEditing ? (
                  <>
                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>
                        <Calendar size={16} color="#64748b" /> Move Date
                      </Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedDate}
                        onChangeText={setEditedDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>
                        <Clock size={16} color="#64748b" /> Move Time
                      </Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedTime}
                        onChangeText={setEditedTime}
                        placeholder="HH:MM"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>Status</Text>
                      <TouchableOpacity
                        style={styles.statusSelector}
                        onPress={() => setShowStatusPicker(!showStatusPicker)}
                      >
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={styles.statusSelectorText}>{statusConfig.label}</Text>
                      </TouchableOpacity>
                      {showStatusPicker && (
                        <View style={styles.statusPickerDropdown}>
                          {STATUS_OPTIONS.map((option) => (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.statusPickerOption,
                                editedStatus === option.value && styles.statusPickerOptionSelected,
                              ]}
                              onPress={() => {
                                setEditedStatus(option.value);
                                setShowStatusPicker(false);
                              }}
                            >
                              <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                              <Text style={styles.statusPickerOptionText}>{option.label}</Text>
                              {editedStatus === option.value && (
                                <CheckCircle size={16} color="#2563eb" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.infoRow}>
                      <Calendar size={18} color="#64748b" />
                      <Text style={styles.infoLabel}>Date</Text>
                      <Text style={styles.infoValue}>
                        {job.move_date
                          ? new Date(job.move_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Not scheduled'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Clock size={18} color="#64748b" />
                      <Text style={styles.infoLabel}>Time</Text>
                      <Text style={styles.infoValue}>
                        {job.move_time || 'Not specified'}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resources</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Users size={20} color="#2563eb" />
                  <Text style={styles.statValue}>{job.num_movers}</Text>
                  <Text style={styles.statLabel}>Movers</Text>
                </View>
                <View style={styles.statCard}>
                  <Clock size={20} color="#2563eb" />
                  <Text style={styles.statValue}>{job.estimated_hours || 0}h</Text>
                  <Text style={styles.statLabel}>Est. Hours</Text>
                </View>
                <View style={styles.statCard}>
                  <DollarSign size={20} color="#2563eb" />
                  <Text style={styles.statValue}>{formatCurrency(job.estimated_total)}</Text>
                  <Text style={styles.statLabel}>Est. Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Truck size={20} color="#2563eb" />
                  <Text style={styles.statValue}>{job.truck_number || '-'}</Text>
                  <Text style={styles.statLabel}>Truck</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deposit Status</Text>
              <View style={styles.infoCard}>
                <View style={styles.depositRow}>
                  {job.has_deposit ? (
                    <CheckCircle size={20} color="#22c55e" />
                  ) : (
                    <XCircle size={20} color="#ef4444" />
                  )}
                  <Text style={[styles.depositStatus, { color: job.has_deposit ? '#22c55e' : '#ef4444' }]}>
                    {job.has_deposit ? 'Deposit Received' : 'Deposit Pending'}
                  </Text>
                  {job.deposit_amount && (
                    <Text style={styles.depositAmount}>{formatCurrency(job.deposit_amount)}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Internal Notes</Text>
              <View style={styles.infoCard}>
                {isEditing ? (
                  <TextInput
                    style={[styles.editInput, styles.notesInput]}
                    value={editedInternalNotes}
                    onChangeText={setEditedInternalNotes}
                    placeholder="Add internal notes..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                  />
                ) : (
                  <View style={styles.notesContainer}>
                    <FileText size={18} color="#64748b" />
                    <Text style={styles.notesText}>
                      {job.internal_notes || 'No internal notes'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
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
  jobNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelEditButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelEditText: {
    color: '#64748b',
    fontWeight: '500',
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
    width: 60,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    textAlign: 'right',
  },
  linkText: {
    color: '#2563eb',
  },
  addressRow: {
    flexDirection: 'row',
  },
  addressIcon: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
  },
  fromDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  addressLine: {
    width: 2,
    height: 40,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  depositStatus: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  depositAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusSelectorText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  statusPickerDropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  statusPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusPickerOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  statusPickerOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
});
