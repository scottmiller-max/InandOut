import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
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