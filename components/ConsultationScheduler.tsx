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

export default function ConsultationScheduler() {
  const { goBack, canGoBack } = useNavigationHistory();
  const { user } = useAuth();
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [messageThreads, setMessageThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMessageThreads();
    }
  }, [user]);

  const loadMessageThreads = async () => {
    if (!user) return;
    
    try {
      // Use actual user ID from auth
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
        <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages & Updates</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.startChatIconButton}>
              <Plus size={20} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowNotificationSettings(!showNotificationSettings)}
            >
              <Bell size={20} color="#2563eb" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        {showNotificationSettings && (
          <View style={styles.section}>
            <NotificationPreferences />
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.section}>
            <LoadingSpinner message="Loading messages and updates..." />
          </View>
        )}

        {/* Live Updates Feed - Moved above conversations */}
        {!loading && (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Updates</Text>
          
          <View style={styles.updateCard}>
            <View style={[styles.updateIcon, styles.successIcon]}>
              <CheckCircle size={20} color="#10b981" />
            </View>
            <View style={styles.updateContent}>
              <Text style={styles.updateTitle}>Packing Complete</Text>
              <Text style={styles.updateDescription}>
                All items have been professionally packed and loaded onto the truck.
              </Text>
              <Text style={styles.updateTime}>Today at 10:30 AM</Text>
            </View>
          </View>

          <View style={styles.updateCard}>
            <View style={[styles.updateIcon, styles.warningIcon]}>
              <AlertTriangle size={20} color="#f59e0b" />
            </View>
            <View style={styles.updateContent}>
              <Text style={styles.updateTitle}>Traffic Delay</Text>
              <Text style={styles.updateDescription}>
                Minor delay due to traffic. New ETA: 2:45 PM (15 minutes later).
              </Text>
              <Text style={styles.updateTime}>Today at 1:30 PM</Text>
            </View>
          </View>

          <View style={styles.updateCard}>
            <View style={[styles.updateIcon, styles.infoIcon]}>
              <Info size={20} color="#2563eb" />
            </View>
            <View style={styles.updateContent}>
              <Text style={styles.updateTitle}>Approaching Destination</Text>
              <Text style={styles.updateDescription}>
                Your moving team is 5 minutes away from your new address.
              </Text>
              <Text style={styles.updateTime}>Today at 2:40 PM</Text>
            </View>
          </View>
        </View>
        )}

        {/* Active Conversations */}
        {!loading && (
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Conversations</Text>
            <View style={styles.threadTypeFilter}>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, styles.filterChipInactive]}>
                <Text style={[styles.filterChipText, styles.filterChipTextInactive]}>Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, styles.filterChipInactive]}>
                <Text style={[styles.filterChipText, styles.filterChipTextInactive]}>Tracking</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity style={styles.conversationCard}>
            <TouchableOpacity onPress={() => handleImagePress('https://images.pexels.com/photos/5025665/pexels-photo-5025665.jpeg')}>
              <Image
                source={require('@/assets/images/care-protection.jpg')}
                style={styles.avatar}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <View style={styles.conversationContent}>
              <Text style={styles.conversationName}>Mike Rodriguez - Team Leader</Text>
              <Text style={styles.lastMessage}>We're 15 minutes away from your location</Text>
              <Text style={styles.messageTime}>2 minutes ago</Text>
            </View>
            <View style={styles.conversationActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Phone size={18} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Video size={18} color="#2563eb" />
              </TouchableOpacity>
            </View>
            <View style={styles.threadBadge}>
              <Text style={styles.threadBadgeText}>Tracking</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.conversationCard}>
            <View style={styles.avatarPlaceholder}>
              <MessageCircle size={24} color="#ffffff" />
            </View>
            <View style={styles.conversationContent}>
              <Text style={styles.conversationName}>IN&OUT Support</Text>
              <Text style={styles.lastMessage}>Your move is confirmed for March 25th</Text>
              <Text style={styles.messageTime}>1 hour ago</Text>
            </View>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>2</Text>
            </View>
            <View style={[styles.threadBadge, styles.supportBadge]}>
              <Text style={styles.threadBadgeText}>Support</Text>
            </View>
          </TouchableOpacity>

          {/* Enhanced Message Features */}
          <TouchableOpacity style={styles.conversationCard}>
            <View style={styles.avatarPlaceholder}>
              <MessageCircle size={24} color="#ffffff" />
            </View>
            <View style={styles.conversationContent}>
              <Text style={styles.conversationName}>Google Workspace Integration</Text>
              <Text style={styles.lastMessage}>Seamless email and chat synchronization</Text>
              <Text style={styles.messageTime}>Always available</Text>
            </View>
            <View style={[styles.threadBadge, styles.systemBadge]}>
              <Text style={styles.threadBadgeText}>System</Text>
            </View>
          </TouchableOpacity>
        </View>
        )}


        {/* Notification Settings */}
        {!loading && (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <Text style={styles.settingTitle}>SMS Updates</Text>
              <Text style={styles.settingDescription}>
                Get text messages for important move updates
              </Text>
              <View style={styles.toggle}>
                <View style={[styles.toggleSwitch, styles.toggleActive]} />
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingTitle}>Email Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive detailed email reports and confirmations
              </Text>
              <View style={styles.toggle}>
                <View style={[styles.toggleSwitch, styles.toggleActive]} />
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Real-time alerts on your phone
              </Text>
              <View style={styles.toggle}>
                <View style={styles.toggleSwitch} />
              </View>
            </View>
          </View>
        </View>
        )}

        {/* Message History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Message History</Text>
          
          <View style={styles.historyCard}>
            <View style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Move Confirmation</Text>
                <Text style={styles.historyDate}>March 20, 2024</Text>
              </View>
              <Text style={styles.historyMessage}>
                Your move has been scheduled for March 25th, 2024. Our team will arrive between 8:00-10:00 AM.
              </Text>
            </View>

            <View style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Quote Approved</Text>
                <Text style={styles.historyDate}>March 18, 2024</Text>
              </View>
              <Text style={styles.historyMessage}>
                Thank you for choosing IN&OUT Moving! Your quote of $899 has been approved and your move is confirmed.
              </Text>
            </View>

            <View style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Initial Consultation</Text>
                <Text style={styles.historyDate}>March 15, 2024</Text>
              </View>
              <Text style={styles.historyMessage}>
                Thanks for your interest! We've received your quote request and will have an estimate ready within 24 hours.
              </Text>
            </View>
          </View>
        </View>

        {/* Team Communication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>24/7 Communication</Text>
          <Text style={styles.communicationDescription}>
            Stay connected with your moving team throughout the entire process. Use the + button above to start a new conversation.
          </Text>
        </View>

        {/* Sample Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Move Photos</Text>
          <View style={styles.photosGrid}>
            <TouchableOpacity onPress={() => handleImagePress('https://images.pexels.com/photos/4246266/pexels-photo-4246266.jpeg')}>
              <Image
                source={require('@/assets/images/crew-carry.jpg')}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleImagePress('https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg')}>
              <Image
                source={require('@/assets/images/packed-organized.jpg')}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleImagePress('https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg')}>
              <Image
                source={require('@/assets/images/family-settled.jpg')}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        </View>
        </>
      </ScrollView>

      {/* Photo Lightbox */}
      {selectedImage && (
        <PhotoLightbox
          visible={showLightbox}
          imageUri={selectedImage}
          onClose={closeLightbox}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWithBack: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startChatIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
  },
  notificationButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  conversationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  conversationContent: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  conversationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  updateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  updateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  successIcon: {
    backgroundColor: '#d1fae5',
  },
  warningIcon: {
    backgroundColor: '#fef3c7',
  },
  infoIcon: {
    backgroundColor: '#dbeafe',
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  updateDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 8,
  },
  updateTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
    flex: 1,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  toggleActive: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  historyItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  historyDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  historyMessage: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  communicationDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  threadTypeFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipInactive: {
    backgroundColor: '#f1f5f9',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Inter-Medium',
  },
  filterChipTextInactive: {
    color: '#64748b',
  },
  threadBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  supportBadge: {
    backgroundColor: '#059669',
  },
  systemBadge: {
    backgroundColor: '#7c3aed',
  },
  threadBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
});