import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Phone, Video, Bell, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Info, Plus } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { GlobalSignOutButton } from '@/components/GlobalSignOutButton';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import PhotoLightbox from '@/components/PhotoLightbox';
import { enhancedMessagingService } from '@/services/enhancedMessaging';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RileyWidget } from '@/components/RileyWidget';
import { NewMessageThreadModal } from '@/components/NewMessageThreadModal';

export default function MessagesScreen() {
  const { goBack, canGoBack } = useNavigationHistory();
  const { user } = useAuth();
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [messageThreads, setMessageThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'general' | 'support' | 'tracking' | 'billing'>('all');

  useEffect(() => {
    if (user) {
      loadMessageThreads();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadMessageThreads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const threads = await enhancedMessagingService.getCustomerThreads(user.id);
      setMessageThreads(threads);
    } catch (error) {
      console.error('Load message threads error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePress = (imageUri: string) => {
    setSelectedImage(imageUri);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setSelectedImage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWithBack}>
        {canGoBack && <BackButton onPress={goBack} />}
        <DateTimeDisplay />
        <GlobalSignOutButton compact />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages & Updates</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.startChatIconButton}
              onPress={() => setShowNewThreadModal(true)}
            >
              <Plus size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Example fallback threads */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          messageThreads.map((thread, idx) => (
            <TouchableOpacity key={idx} style={styles.threadItem}>
              <Text style={styles.threadTitle}>{thread.title || "Untitled Thread"}</Text>
              <Text style={styles.threadSnippet}>{thread.snippet || "No preview available"}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Lightbox */}
      {showLightbox && selectedImage && (
        <PhotoLightbox visible={showLightbox} imageUri={selectedImage} onClose={closeLightbox} />
      )}

      {/* New Message Modal */}
      {showNewThreadModal && (
        <NewMessageThreadModal
          visible={showNewThreadModal}
          onClose={() => setShowNewThreadModal(false)}
          onThreadCreated={(threadId) => {
            setShowNewThreadModal(false);
            loadMessageThreads();
          }}
        />
      )}

      {/* Riley */}
      <RileyWidget />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  headerWithBack: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  startChatIconButton: {
    backgroundColor: "#e0f2fe",
    padding: 8,
    borderRadius: 20,
  },
  threadItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  threadTitle: { fontSize: 16, fontWeight: "600" },
  threadSnippet: { fontSize: 14, color: "#6b7280", marginTop: 4 },
});
