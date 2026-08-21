import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Calendar, MapPin } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { databaseService, CustomerPhoto } from '@/services/database';
import PhotoLightbox from '@/components/PhotoLightbox';

interface GalleryItem extends CustomerPhoto {
  signedUrl?: string;
}

function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function GalleryScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const rows = await databaseService.getGalleryPhotos(user.id);
    const withUrls = await Promise.all(
      rows.map(async (p) => ({
        ...p,
        signedUrl: (await databaseService.getPhotoSignedUrl(p.photoUrl)) || undefined,
      })),
    );
    setPhotos(withUrls);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPhotos();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, loadPhotos]);

  const jobDates = useMemo(() => {
    const dates = new Set<string>();
    photos.forEach((p) => {
      if (p.jobMoveDate) dates.add(p.jobMoveDate);
    });
    return Array.from(dates).sort().reverse();
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (selectedDate && p.jobMoveDate !== selectedDate) return false;
      if (addressQuery.trim()) {
        const q = addressQuery.trim().toLowerCase();
        const haystack = `${p.jobFromAddress || ''} ${p.jobToAddress || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [photos, selectedDate, addressQuery]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photo Gallery</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.emptyState}>
          <ImageIcon size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Sign in to see your photos</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Gallery</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchBar}>
        <MapPin size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={addressQuery}
          onChangeText={setAddressQuery}
          placeholder="Filter by address"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {jobDates.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipRowContent}
        >
          <TouchableOpacity
            style={[styles.chip, !selectedDate && styles.chipActive]}
            onPress={() => setSelectedDate(null)}
          >
            <Text style={[styles.chipText, !selectedDate && styles.chipTextActive]}>All dates</Text>
          </TouchableOpacity>
          {jobDates.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, selectedDate === d && styles.chipActive]}
              onPress={() => setSelectedDate(d === selectedDate ? null : d)}
            >
              <Calendar size={12} color={selectedDate === d ? '#ffffff' : '#475569'} />
              <Text style={[styles.chipText, selectedDate === d && styles.chipTextActive]}>
                {formatDate(d)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : filteredPhotos.length === 0 ? (
        <View style={styles.emptyState}>
          <ImageIcon size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>
            {photos.length === 0 ? 'No photos yet' : 'No photos match your filter'}
          </Text>
          <Text style={styles.emptySubtitle}>
            Photos you add through Riley chat or during a job will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {filteredPhotos.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.gridItem}
              onPress={() => p.signedUrl && setLightboxUri(p.signedUrl)}
            >
              {p.signedUrl ? (
                <Image source={{ uri: p.signedUrl }} style={styles.gridImage} resizeMode="cover" />
              ) : (
                <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
                  <ImageIcon size={20} color="#94a3b8" />
                </View>
              )}
              {(p.jobFromAddress || p.jobMoveDate) && (
                <View style={styles.gridCaption}>
                  <Text style={styles.gridCaptionText} numberOfLines={1}>
                    {formatDate(p.jobMoveDate) || p.jobFromAddress}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <PhotoLightbox
        visible={!!lightboxUri}
        imageUri={lightboxUri || ''}
        onClose={() => setLightboxUri(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerButton: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', fontFamily: 'Inter-SemiBold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular', color: '#1e293b' },
  chipRow: { marginTop: 12 },
  chipRowContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, color: '#475569', fontFamily: 'Inter-Medium' },
  chipTextActive: { color: '#ffffff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  gridItem: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  gridImage: { width: '100%', height: '100%' },
  gridImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  gridCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  gridCaptionText: { fontSize: 10, color: '#ffffff', fontFamily: 'Inter-Regular' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', fontFamily: 'Inter-SemiBold' },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
