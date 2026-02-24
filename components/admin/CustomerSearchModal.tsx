import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { X, Search, User, Phone, Mail, Briefcase, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../services/supabase';

interface CustomerResult {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  total_jobs: number;
  last_job_date: string | null;
  created_at: string;
}

interface CustomerSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerResult) => void;
}

type SearchType = 'all' | 'name' | 'email' | 'phone' | 'job_number';

const SEARCH_TYPES: { value: SearchType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Fields', icon: <Search size={16} color="#64748b" /> },
  { value: 'name', label: 'Name', icon: <User size={16} color="#64748b" /> },
  { value: 'phone', label: 'Phone', icon: <Phone size={16} color="#64748b" /> },
  { value: 'email', label: 'Email', icon: <Mail size={16} color="#64748b" /> },
  { value: 'job_number', label: 'Job #', icon: <Briefcase size={16} color="#64748b" /> },
];

export default function CustomerSearchModal({
  visible,
  onClose,
  onSelectCustomer,
}: CustomerSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async () => {
    if (searchTerm.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const { data, error: searchError } = await supabase.rpc('search_customers', {
        search_term: searchTerm,
        search_type: searchType,
      });

      if (searchError) throw searchError;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search customers. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, searchType]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchType, performSearch]);

  useEffect(() => {
    if (!visible) {
      setSearchTerm('');
      setResults([]);
      setHasSearched(false);
      setError(null);
    }
  }, [visible]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No jobs';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderCustomerItem = ({ item }: { item: CustomerResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onSelectCustomer(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultAvatar}>
        <Text style={styles.avatarText}>
          {item.full_name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.full_name || 'Unknown'}</Text>
        <View style={styles.resultMeta}>
          {item.phone && (
            <Text style={styles.resultMetaText}>
              <Phone size={12} color="#64748b" /> {item.phone}
            </Text>
          )}
          {item.email && (
            <Text style={styles.resultMetaText} numberOfLines={1}>
              <Mail size={12} color="#64748b" /> {item.email}
            </Text>
          )}
        </View>
        <View style={styles.resultStats}>
          <Text style={styles.statText}>
            {item.total_jobs} job{item.total_jobs !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.statDivider}>|</Text>
          <Text style={styles.statText}>Last: {formatDate(item.last_job_date)}</Text>
        </View>
      </View>
      <ChevronRight size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Search Customers</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, phone, email, or job #..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.filterRow}>
            {SEARCH_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.filterButton,
                  searchType === type.value && styles.filterButtonActive,
                ]}
                onPress={() => setSearchType(type.value)}
              >
                {type.icon}
                <Text
                  style={[
                    styles.filterButtonText,
                    searchType === type.value && styles.filterButtonTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.resultsContainer}>
            {loading ? (
              <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : error ? (
              <View style={styles.centeredContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={performSearch}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : results.length === 0 && hasSearched ? (
              <View style={styles.centeredContainer}>
                <User size={48} color="#cbd5e1" />
                <Text style={styles.noResultsText}>No customers found</Text>
                <Text style={styles.noResultsHint}>
                  Try a different search term or filter
                </Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.centeredContainer}>
                <Search size={48} color="#cbd5e1" />
                <Text style={styles.noResultsText}>Start typing to search</Text>
                <Text style={styles.noResultsHint}>
                  Enter at least 2 characters
                </Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={renderCustomerItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {results.length > 0
                ? `${results.length} result${results.length !== 1 ? 's' : ''} found`
                : 'Search customers by name, phone, email, or job number'}
            </Text>
          </View>
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
    maxWidth: 560,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  resultsContainer: {
    flex: 1,
    minHeight: 300,
  },
  listContent: {
    padding: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  resultMetaText: {
    fontSize: 13,
    color: '#64748b',
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statDivider: {
    marginHorizontal: 8,
    color: '#cbd5e1',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  noResultsText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  noResultsHint: {
    marginTop: 4,
    fontSize: 14,
    color: '#94a3b8',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
