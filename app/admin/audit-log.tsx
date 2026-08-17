import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/services/supabase';
import { ArrowLeft, FileText, CheckCircle2, XCircle } from 'lucide-react-native';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  user_role: string | null;
  action: string;
  action_category: string;
  affected_entity_type: string | null;
  affected_entity_id: string | null;
  success: boolean | null;
  error_message: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function AdminAuditLogScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: myRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        setCurrentUserRole(myRole?.role || null);
      }

      const { data, error } = await supabase
        .from('audit_log')
        .select(
          'id, actor_id, user_role, action, action_category, affected_entity_type, affected_entity_id, success, error_message, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Load audit log error:', error);
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

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const categories = useMemo(() => {
    const set = new Set(entries.map((e) => e.action_category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (activeCategory === 'all') return entries;
    return entries.filter((e) => e.action_category === activeCategory);
  }, [entries, activeCategory]);

  const canView = currentUserRole === 'master_admin';

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading audit log...</Text>
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
            <Text style={styles.headerTitle}>Audit Log</Text>
            <Text style={styles.headerSubtitle}>
              {entries.length} recent {entries.length === 1 ? 'event' : 'events'}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {!canView ? (
            <View style={styles.restrictedCard}>
              <FileText size={20} color="#94a3b8" />
              <Text style={styles.restrictedText}>Only master admins can view the audit log.</Text>
            </View>
          ) : (
            <>
              {categories.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, activeCategory === cat ? styles.categoryChipActive : null]}
                      onPress={() => setActiveCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          activeCategory === cat ? styles.categoryChipTextActive : null,
                        ]}
                      >
                        {cat === 'all' ? 'All' : cat.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              {filteredEntries.length === 0 ? (
                <View style={styles.emptyCard}>
                  <FileText size={20} color="#94a3b8" />
                  <Text style={styles.emptyText}>No audit events yet.</Text>
                  <Text style={styles.emptySubtext}>
                    Actions like sending quotes, confirming bookings, and role changes will show up here.
                  </Text>
                </View>
              ) : (
                filteredEntries.map((entry) => (
                  <View key={entry.id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderLeft}>
                        {entry.success === false ? (
                          <XCircle size={16} color="#dc2626" />
                        ) : (
                          <CheckCircle2 size={16} color="#059669" />
                        )}
                        <Text style={styles.cardTitle}>{formatAction(entry.action)}</Text>
                      </View>
                      <Text style={styles.cardTimestamp}>{formatDate(entry.created_at)}</Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {entry.user_role ? `${entry.user_role.replace(/_/g, ' ')} · ` : ''}
                      {entry.action_category.replace(/_/g, ' ')}
                      {entry.affected_entity_type ? ` · ${entry.affected_entity_type}` : ''}
                    </Text>
                    {entry.error_message ? <Text style={styles.errorText}>{entry.error_message}</Text> : null}
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
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
  restrictedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 8,
  },
  restrictedText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cardMeta: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
  },
});
