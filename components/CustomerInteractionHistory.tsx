import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Phone, Mail, Globe, User, Bot, Settings, ChevronDown, ChevronUp, Filter } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

interface Interaction {
  id: string;
  customer_id: string;
  channel: string;
  direction: string;
  content: string;
  handled_by: string;
  interaction_type: string;
  notes: string;
  created_at: string;
}

interface CustomerInteractionHistoryProps {
  customerId: string;
  onInteractionCountChange?: (count: number) => void;
}

type ChannelFilter = 'all' | 'chat' | 'phone' | 'email' | 'sms' | 'web_form';
type HandlerFilter = 'all' | 'riley' | 'human' | 'system';

export function CustomerInteractionHistory({
  customerId,
  onInteractionCountChange
}: CustomerInteractionHistoryProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [handlerFilter, setHandlerFilter] = useState<HandlerFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadInteractions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('interactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }

      if (handlerFilter !== 'all') {
        query = query.eq('handled_by', handlerFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setInteractions(data || []);
      onInteractionCountChange?.(data?.length || 0);
    } catch (err) {
      console.error('Failed to load interactions:', err);
      setError('Failed to load interaction history');
    } finally {
      setLoading(false);
    }
  }, [customerId, channelFilter, handlerFilter, onInteractionCountChange]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  useEffect(() => {
    const channel = supabase
      .channel(`interactions-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interactions',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          loadInteractions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, loadInteractions]);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'chat':
        return <MessageCircle size={14} color="#2563eb" />;
      case 'phone':
        return <Phone size={14} color="#059669" />;
      case 'email':
        return <Mail size={14} color="#dc2626" />;
      case 'sms':
        return <MessageCircle size={14} color="#7c3aed" />;
      case 'web_form':
        return <Globe size={14} color="#ea580c" />;
      default:
        return <MessageCircle size={14} color="#64748b" />;
    }
  };

  const getHandlerIcon = (handler: string) => {
    switch (handler) {
      case 'riley':
        return <Bot size={14} color="#2563eb" />;
      case 'human':
        return <User size={14} color="#059669" />;
      case 'system':
        return <Settings size={14} color="#64748b" />;
      default:
        return <User size={14} color="#64748b" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDirectionStyle = (direction: string) => {
    return direction === 'inbound' ? styles.inboundBadge : styles.outboundBadge;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading interactions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadInteractions}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Interaction History</Text>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} color="#64748b" />
          <Text style={styles.filterToggleText}>Filters</Text>
          {showFilters ? (
            <ChevronUp size={16} color="#64748b" />
          ) : (
            <ChevronDown size={16} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Channel</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                {(['all', 'chat', 'phone', 'email', 'sms', 'web_form'] as ChannelFilter[]).map(filter => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterChip,
                      channelFilter === filter && styles.filterChipActive,
                    ]}
                    onPress={() => setChannelFilter(filter)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      channelFilter === filter && styles.filterChipTextActive,
                    ]}>
                      {filter === 'all' ? 'All' : filter.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Handler</Text>
            <View style={styles.filterRow}>
              {(['all', 'riley', 'human', 'system'] as HandlerFilter[]).map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    handlerFilter === filter && styles.filterChipActive,
                  ]}
                  onPress={() => setHandlerFilter(filter)}
                >
                  <Text style={[
                    styles.filterChipText,
                    handlerFilter === filter && styles.filterChipTextActive,
                  ]}>
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <Text style={styles.countText}>
        {interactions.length} interaction{interactions.length !== 1 ? 's' : ''}
      </Text>

      {interactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={32} color="#94a3b8" />
          <Text style={styles.emptyText}>No interactions found</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {interactions.map((interaction) => {
            const isExpanded = expandedItems.has(interaction.id);
            const isRiley = interaction.handled_by === 'riley';

            return (
              <TouchableOpacity
                key={interaction.id}
                style={[
                  styles.interactionCard,
                  isRiley && styles.rileyCard,
                ]}
                onPress={() => toggleExpanded(interaction.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardMeta}>
                    <View style={styles.iconRow}>
                      {getChannelIcon(interaction.channel)}
                      <Text style={styles.channelText}>
                        {interaction.channel?.replace('_', ' ') || 'unknown'}
                      </Text>
                    </View>
                    <View style={[styles.directionBadge, getDirectionStyle(interaction.direction)]}>
                      <Text style={styles.directionText}>
                        {interaction.direction}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={styles.handlerBadge}>
                      {getHandlerIcon(interaction.handled_by)}
                      <Text style={[
                        styles.handlerText,
                        isRiley && styles.rileyText,
                      ]}>
                        {interaction.handled_by || 'unknown'}
                      </Text>
                    </View>
                    <Text style={styles.timestamp}>
                      {formatTimestamp(interaction.created_at)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.contentPreview}
                  numberOfLines={isExpanded ? undefined : 2}
                >
                  {interaction.content || interaction.notes || 'No content'}
                </Text>

                {interaction.content && interaction.content.length > 100 && (
                  <View style={styles.expandIndicator}>
                    {isExpanded ? (
                      <ChevronUp size={14} color="#64748b" />
                    ) : (
                      <ChevronDown size={14} color="#64748b" />
                    )}
                    <Text style={styles.expandText}>
                      {isExpanded ? 'Show less' : 'Show more'}
                    </Text>
                  </View>
                )}

                {isExpanded && interaction.notes && interaction.notes !== interaction.content && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{interaction.notes}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  filterToggleText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  filtersContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  filterSection: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  countText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Inter-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  listContainer: {
    flex: 1,
  },
  interactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rileyCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  directionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inboundBadge: {
    backgroundColor: '#dbeafe',
  },
  outboundBadge: {
    backgroundColor: '#dcfce7',
  },
  directionText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  handlerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  handlerText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    textTransform: 'capitalize',
  },
  rileyText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  contentPreview: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  expandText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  notesLabel: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
});
