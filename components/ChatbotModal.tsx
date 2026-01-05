import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Bot, Calendar, Sparkles, MessageCircle } from 'lucide-react-native';

interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
  onBookConsultation: () => void;
  userName: string;
}

export const ChatbotModal: React.FC<ChatbotModalProps> = ({
  visible,
  onClose,
  onBookConsultation,
  userName,
}) => {
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: 'bot' | 'user'}>>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const chatFlow = [
    {
      text: `Hi ${userName}! 🎉 Thank you for submitting your quote request.`,
      delay: 500,
    },
    {
      text: "I've received all your details and our team is already reviewing your move requirements.",
      delay: 1500,
    },
    {
      text: "To give you the most accurate quote possible, I'd recommend scheduling a quick consultation with one of our moving experts.",
      delay: 2500,
    },
    {
      text: "Would you like to book a 25-minute video consultation? It's the best way to ensure we capture all your specific needs! 📹",
      delay: 3500,
    },
  ];

  useEffect(() => {
    if (visible) {
      setMessages([]);
      setCurrentStep(0);
      startChatFlow();
    }
  }, [visible]);

  const startChatFlow = () => {
    chatFlow.forEach((message, index) => {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${index}`,
          text: message.text,
          sender: 'bot',
        }]);
        setCurrentStep(index + 1);
      }, message.delay);
    });
  };

  const handleBookConsultation = () => {
    const userResponse = {
      id: 'user-book',
      text: "Yes, I'd like to book a consultation!",
      sender: 'user' as const,
    };

    const botResponse = {
      id: 'bot-final',
      text: "Perfect! I'm opening our consultation scheduler for you. You'll be able to pick a time that works best for your schedule. 🗓️",
      sender: 'bot' as const,
    };

    setMessages(prev => [...prev, userResponse, botResponse]);
    
    setTimeout(() => {
      onBookConsultation();
    }, 1500);
  };

  const handleMaybeLater = () => {
    const userResponse = {
      id: 'user-later',
      text: "Maybe later, I'll think about it.",
      sender: 'user' as const,
    };

    const botResponse = {
      id: 'bot-later',
      text: "No problem! You can always schedule a consultation from your dashboard. We'll send you your quote estimate via email within 24 hours. Thanks for choosing IN&OUT Moving! 📧",
      sender: 'bot' as const,
    };

    setMessages(prev => [...prev, userResponse, botResponse]);
    
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Bot size={24} color="#7c3aed" />
            <Text style={styles.headerTitle}>IN&OUT Assistant</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Chat Messages */}
        <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.sender === 'user' ? styles.userMessage : styles.botMessage,
              ]}
            >
              <Text style={[
                styles.messageText,
                message.sender === 'user' ? styles.userMessageText : styles.botMessageText,
              ]}>
                {message.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Action Buttons */}
        {currentStep >= chatFlow.length && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleBookConsultation}>
              <Calendar size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Book Consultation Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleMaybeLater}>
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 16,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  botMessageText: {
    color: '#374151',
  },
  userMessageText: {
    color: '#ffffff',
  },
  actionsContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
  },
});