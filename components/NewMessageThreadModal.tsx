import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send, User, MessageCircle } from 'lucide-react-native';
import { enhancedMessagingService } from '@/services/enhancedMessaging';
import { useAuth } from '@/hooks/useAuth';

interface NewMessageThreadModalProps {
  visible: boolean;
  onClose: () => void;
  onThreadCreated: (threadId: string) => void;
  defaultRecipient?: 'family_partner' | 'support' | 'team';
  jobId?: string;
}

export const NewMessageThreadModal: React.FC<NewMessageThreadModalProps> = ({
  visible,
  onClose,
  onThreadCreated,
  defaultRecipient = 'family_partner',
  jobId,
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [threadType, setThreadType] = useState<'general' | 'support' | 'tracking' | 'billing'>('general');
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [loading, setLoading] = useState(false);

  const threadTypes = [
    { key: 'general', label: 'General', description: 'General questions and communication' },
    { key: 'support', label: 'Support', description: 'Technical support and assistance' },
    { key: 'tracking', label: 'Tracking', description: 'Move tracking and updates' },
    { key: 'billing', label: 'Billing', description: 'Payment and billing questions' },
  ];

  const recipients = [
    { key: 'family_partner', label: 'Family Partner', description: 'Your assigned Family Partner' },
    { key: 'support', label: 'Support Team', description: 'Customer support specialists' },
    { key: 'team', label: 'Moving Team', description: 'Your assigned moving crew' },
  ];

  const handleSendMessage = async () => {
    if (!message.trim() || !user) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }

    setLoading(true);
    try {
      // Create new thread
      const thread = await enhancedMessagingService.createMessageThread(
        jobId || 'general',
        user.id,
        threadType
      );

      if (!thread) {
        throw new Error('Failed to create message thread');
      }

      // Send initial message
      await enhancedMessagingService.sendEnhancedMessage(
        jobId || 'general',
        thread.id,
        'customer',
        `${user.firstName} ${user.lastName}`,
        message.trim(),
        'text'
      );

      setMessage('');
      onThreadCreated(thread.id);
      onClose();
      
      Alert.alert(
        'Message Sent',
        `Your message has been sent to the ${recipients.find(r => r.key === recipient)?.label}.`
      );
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>New Message</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Recipient Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send to</Text>
            <View style={styles.recipientOptions}>
              {recipients.map((recipientOption) => (
                <TouchableOpacity
                  key={recipientOption.key}
                  style={[
                    styles.recipientButton,
                    recipient === recipientOption.key && styles.recipientButtonActive,
                  ]}
                  onPress={() => setRecipient(recipientOption.key as any)}
                >
                  <User size={16} color={
                    recipient === recipientOption.key ? '#ffffff' : '#64748b'
                  } />
                  <Text style={[
                    styles.recipientText,
                    recipient === recipientOption.key && styles.recipientTextActive,
                  ]}>
                    {recipientOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Thread Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message Type</Text>
            <View style={styles.threadTypeOptions}>
              {threadTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.threadTypeButton,
                    threadType === type.key && styles.threadTypeButtonActive,
                  ]}
                  onPress={() => setThreadType(type.key as any)}
                >
                  <Text style={[
                    styles.threadTypeText,
                    threadType === type.key && styles.threadTypeTextActive,
                  ]}>
                    {type.label}
                  </Text>
                  <Text style={[
                    styles.threadTypeDescription,
                    threadType === type.key && styles.threadTypeDescriptionActive,
                  ]}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Message Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Message</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message here..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || loading) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!message.trim() || loading}
          >
            <Send size={20} color="#ffffff" />
            <Text style={styles.sendButtonText}>
              {loading ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  recipientOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recipientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  recipientButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  recipientText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
  },
  recipientTextActive: {
    color: '#ffffff',
  },
  threadTypeOptions: {
    gap: 12,
  },
  threadTypeButton: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  threadTypeButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  threadTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  threadTypeTextActive: {
    color: '#2563eb',
  },
  threadTypeDescription: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  threadTypeDescriptionActive: {
    color: '#3b82f6',
  },
  messageInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    fontSize: 15,
    color: '#1e293b',
    fontFamily: 'Inter-Regular',
    minHeight: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
});