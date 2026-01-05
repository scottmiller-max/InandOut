import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MessageCircle, ArrowRight, Phone, Video } from 'lucide-react-native';
import { enhancedMessagingService, EnhancedMessage } from '@/services/enhancedMessaging';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

interface MessagesPreviewProps {
  style?: any;
}

export const MessagesPreview: React.FC<MessagesPreviewProps> = ({ style }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [recentMessages, setRecentMessages] = useState<EnhancedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRecentMessages();
    }
  }, [user]);

  const loadRecentMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Mock recent messages - replace with actual service call
      const mockMessages: EnhancedMessage[] = [
        {
          id: '1',
          threadId: 'thread-1',
          moveId: 'move-1',
          senderType: 'team',
          senderName: 'Mike Rodriguez',
          senderAvatar: 'https://images.pexels.com/photos/5025665/pexels-photo-5025665.jpeg',
          messageContent: "We're 15 minutes away from your location. All items are secure and ready for delivery.",
          messageType: 'text',
          attachmentUrls: [],
          isRead: false,
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        },
        {
          id: '2',
          threadId: 'thread-2',
          moveId: 'move-1',
          senderType: 'system',
          senderName: 'IN&OUT Moving',
          messageContent: 'Your move has been confirmed for March 25th, 2024. Our team will arrive between 8:00-10:00 AM.',
          messageType: 'system',
          attachmentUrls: [],
          isRead: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
        {
          id: '3',
          threadId: 'thread-3',
          moveId: 'move-1',
          senderType: 'team',
          senderName: 'Sarah Chen',
          senderAvatar: 'https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg',
          messageContent: 'Packing is complete! All fragile items have been wrapped with extra care.',
          messageType: 'text',
          attachmentUrls: [],
          isRead: true,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        },
      ];
      setRecentMessages(mockMessages);
    } catch (error) {
      console.error('Load recent messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getSenderTypeColor = (senderType: string) => {
    switch (senderType) {
      case 'team': return '#2563eb';
      case 'system': return '#059669';
      default: return '#64748b';
    }
  };

  const handleViewAllMessages = () => {
    router.push('/(tabs)/messages');
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageCircle size={20} color="#2563eb" />
          <Text style={styles.title}>Recent Messages</Text>
        </View>
        <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllMessages}>
          <Text style={styles.viewAllText}>View All</Text>
          <ArrowRight size={14} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {recentMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={32} color="#94a3b8" />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Messages from your moving team will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.messagesList}>
          {recentMessages.slice(0, 3).map((message) => (
            <TouchableOpacity 
              key={message.id} 
              style={styles.messageItem}
              onPress={handleViewAllMessages}
            >
              <View style={styles.messageLeft}>
                {message.senderAvatar ? (
                  <Image
                    source={{ uri: message.senderAvatar }}
                    style={styles.senderAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.senderAvatarPlaceholder, { backgroundColor: getSenderTypeColor(message.senderType) + '20' }]}>
                    <MessageCircle size={16} color={getSenderTypeColor(message.senderType)} />
                  </View>
                )}
                
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.senderName}>{message.senderName}</Text>
                    <Text style={styles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
                  </View>
                  <Text style={styles.messageText} numberOfLines={2}>
                    {message.messageContent}
                  </Text>
                  {message.senderType === 'team' && (
                    <View style={styles.teamBadge}>
                      <Text style={styles.teamBadgeText}>Team</Text>
                    </View>
                  )}
                </View>
              </View>

              {!message.isRead && (
                <View style={styles.unreadIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={handleViewAllMessages}>
          <MessageCircle size={16} color="#2563eb" />
          <Text style={styles.quickActionText}>Start Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickActionButton}>
          <Phone size={16} color="#059669" />
          <Text style={styles.quickActionText}>Call Team</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickActionButton}>
          <Video size={16} color="#7c3aed" />
          <Text style={styles.quickActionText}>Video Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  messagesList: {
    marginBottom: 16,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  messageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  senderAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
  },
  messageTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
  },
  messageText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  teamBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
});