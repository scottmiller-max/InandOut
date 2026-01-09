import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, Clock, Phone, MessageCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { triggerRileySummary } from '@/services/rileyAI';

interface AISummary {
  id: string;
  customer_id: string;
  summary: string;
  content: string;
  summary_type: string;
  trigger_event: string;
  generated_at: string;
  metadata: {
    interaction_count?: number;
    channels_used?: string[];
    action_items?: string[];
    follow_ups_needed?: string[];
  };
}

interface CustomerAISummaryProps {
  customerId: string;
  onSummaryLoaded?: (summary: AISummary | null) => void;
}

export function CustomerAISummary({ customerId, onSummaryLoaded }: CustomerAISummaryProps) {
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  const loadSummaries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('ai_summaries')
        .select('*')
        .eq('customer_id', customerId)
        .order('generated_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setSummaries(data || []);
      onSummaryLoaded?.(data?.[0] || null);
    } catch (err) {
      console.error('Failed to load AI summaries:', err);
      setError('Failed to load AI summaries');
    } finally {
      setLoading(false);
    }
  }, [customerId, onSummaryLoaded]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    const channel = supabase
      .channel(`ai-summaries-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_summaries',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          loadSummaries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, loadSummaries]);

  const handleRefreshSummary = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const result = await triggerRileySummary(customerId, 'manual_refresh');

      if (result.success) {
        await loadSummaries();
      } else {
        setError(result.error || 'Failed to generate summary');
      }
    } catch (err) {
      console.error('Failed to refresh summary:', err);
      setError('Failed to refresh summary');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedSummaries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getSummaryTypeIcon = (type: string) => {
    switch (type) {
      case 'call_transcription':
        return <Phone size={14} color="#059669" />;
      case 'conversation_summary':
      case 'chat_summary':
        return <MessageCircle size={14} color="#2563eb" />;
      default:
        return <Brain size={14} color="#7c3aed" />;
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'end_of_conversation':
        return 'Conversation ended';
      case 'after_call':
        return 'After call';
      case 'after_booking':
        return 'After booking';
      case 'interaction_threshold':
        return 'Auto-generated';
      case 'manual_refresh':
        return 'Manual refresh';
      default:
        return trigger || 'Unknown';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const latestSummary = summaries[0];
  const historySummaries = summaries.slice(1);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading AI summary...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Brain size={18} color="#2563eb" />
          <Text style={styles.title}>AI Summary</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]}
          onPress={handleRefreshSummary}
          disabled={refreshing}
        >
          <RefreshCw
            size={14}
            color={refreshing ? '#94a3b8' : '#2563eb'}
            style={refreshing ? styles.spinning : undefined}
          />
          <Text style={[styles.refreshText, refreshing && styles.refreshTextDisabled]}>
            {refreshing ? 'Generating...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={14} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!latestSummary ? (
        <View style={styles.emptyContainer}>
          <Brain size={32} color="#94a3b8" />
          <Text style={styles.emptyText}>No AI summary available</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation with Riley to generate a summary
          </Text>
        </View>
      ) : (
        <View style={styles.summaryContainer}>
          <View style={styles.latestSummaryCard}>
            <View style={styles.summaryMeta}>
              <View style={styles.summaryTypeRow}>
                {getSummaryTypeIcon(latestSummary.summary_type)}
                <Text style={styles.summaryType}>
                  {latestSummary.summary_type?.replace('_', ' ') || 'Summary'}
                </Text>
              </View>
              <View style={styles.timestampRow}>
                <Clock size={12} color="#94a3b8" />
                <Text style={styles.timestamp}>
                  {formatTimestamp(latestSummary.generated_at)}
                </Text>
              </View>
            </View>

            <View style={styles.triggerBadge}>
              <Text style={styles.triggerText}>
                {getTriggerLabel(latestSummary.trigger_event)}
              </Text>
            </View>

            <ScrollView
              style={styles.summaryContentContainer}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.summaryContent}>
                {latestSummary.content || latestSummary.summary}
              </Text>
            </ScrollView>

            {latestSummary.metadata?.interaction_count && (
              <View style={styles.statsRow}>
                <Text style={styles.statsText}>
                  Based on {latestSummary.metadata.interaction_count} interactions
                </Text>
                {latestSummary.metadata.channels_used && (
                  <Text style={styles.statsText}>
                    via {latestSummary.metadata.channels_used.join(', ')}
                  </Text>
                )}
              </View>
            )}

            {latestSummary.metadata?.action_items && latestSummary.metadata.action_items.length > 0 && (
              <View style={styles.actionItemsSection}>
                <Text style={styles.actionItemsTitle}>Action Items:</Text>
                {latestSummary.metadata.action_items.map((item, index) => (
                  <View key={index} style={styles.actionItem}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.actionItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {latestSummary.metadata?.follow_ups_needed && latestSummary.metadata.follow_ups_needed.length > 0 && (
              <View style={styles.followUpsSection}>
                <Text style={styles.followUpsTitle}>Follow-ups Needed:</Text>
                {latestSummary.metadata.follow_ups_needed.map((item, index) => (
                  <View key={index} style={styles.followUpItem}>
                    <View style={styles.followUpBullet} />
                    <Text style={styles.followUpText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {historySummaries.length > 0 && (
            <View style={styles.historySection}>
              <TouchableOpacity
                style={styles.historyToggle}
                onPress={() => setShowHistory(!showHistory)}
              >
                <Text style={styles.historyToggleText}>
                  Previous summaries ({historySummaries.length})
                </Text>
                {showHistory ? (
                  <ChevronUp size={16} color="#64748b" />
                ) : (
                  <ChevronDown size={16} color="#64748b" />
                )}
              </TouchableOpacity>

              {showHistory && (
                <View style={styles.historyList}>
                  {historySummaries.map((summary) => {
                    const isExpanded = expandedSummaries.has(summary.id);

                    return (
                      <TouchableOpacity
                        key={summary.id}
                        style={styles.historySummaryCard}
                        onPress={() => toggleExpanded(summary.id)}
                      >
                        <View style={styles.historyHeader}>
                          <View style={styles.historyMeta}>
                            {getSummaryTypeIcon(summary.summary_type)}
                            <Text style={styles.historyType}>
                              {summary.summary_type?.replace('_', ' ')}
                            </Text>
                          </View>
                          <Text style={styles.historyTimestamp}>
                            {formatTimestamp(summary.generated_at)}
                          </Text>
                        </View>

                        <Text
                          style={styles.historyPreview}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          {summary.content || summary.summary}
                        </Text>

                        <View style={styles.expandIndicator}>
                          {isExpanded ? (
                            <ChevronUp size={12} color="#94a3b8" />
                          ) : (
                            <ChevronDown size={12} color="#94a3b8" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  refreshButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  refreshText: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
  },
  refreshTextDisabled: {
    color: '#94a3b8',
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
  summaryContainer: {
    flex: 1,
  },
  latestSummaryCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  summaryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryType: {
    fontSize: 12,
    color: '#0369a1',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  triggerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 10,
  },
  triggerText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  summaryContentContainer: {
    maxHeight: 200,
    marginBottom: 10,
  },
  summaryContent: {
    fontSize: 13,
    color: '#1e293b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
  },
  statsText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  actionItemsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
  },
  actionItemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  bulletPoint: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0ea5e9',
    marginTop: 6,
  },
  actionItemText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  followUpsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
  },
  followUpsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 6,
  },
  followUpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  followUpBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f97316',
    marginTop: 6,
  },
  followUpText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  historySection: {
    marginTop: 16,
  },
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyToggleText: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  historyList: {
    gap: 8,
    marginTop: 8,
  },
  historySummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyType: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  historyTimestamp: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  historyPreview: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 4,
  },
});
