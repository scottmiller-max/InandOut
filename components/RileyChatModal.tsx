import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { sendToRiley, RileyMessage } from '@/services/rileyAI';

interface RileyChatModalProps {
  visible: boolean;
  onClose: () => void;
  userRole?: 'customer' | 'admin' | 'family_partner';
  contextData?: {
    userId?: string;
    customerId?: string;
    moveId?: string;
    jobId?: string;
    jobNumber?: string;
    jobStatus?: string;
    moveDate?: string;
    fromAddress?: string;
    toAddress?: string;
    fobData?: any;
    checklistData?: any;
  };
}

interface ChatBubble {
  text: string;
  isUser: boolean;
}

const STORE_URL = 'https://www.inandoutmovin.com/store';
const SUPPORT_PHONE = '833-466-6881';
const GREETING =
  "Aloha! I'm Riley, your IN&OUT Moving assistant. 👋 I can help with a quick moving, hauling, or handyman quote, book 2 hours of labor, check on your move, or answer any questions. What can I help you with today?";

const QUICK_CHIPS: Array<{ label: string; msg?: string; store?: boolean }> = [
  { label: 'Get a quote', msg: "I'd like a moving quote" },
  { label: 'Book 2-hr labor', store: true },
  { label: 'My move status', msg: "What's the status of my move?" },
  { label: 'Our services', msg: 'What services do you offer?' },
];

/**
 * Pull a trailing <<FORM {...}>> action (used by the website's on-page form filler) out of
 * Riley's reply. There is no on-page form in the app, so we simply strip it from what the
 * customer sees and, if present, nudge them to the Quote tab.
 */
function stripFormAction(reply: string): { text: string; hadForm: boolean } {
  const m = reply.match(/<<\s*FORM\s*\{[\s\S]*?\}\s*>>/i);
  if (!m) return { text: reply, hadForm: false };
  const text = reply.replace(m[0], '').trim();
  return { text: text || "I've noted those details for you.", hadForm: true };
}

export const RileyChatModal: React.FC<RileyChatModalProps> = ({
  visible,
  onClose,
  userRole = 'customer',
  contextData,
}) => {
  const [messages, setMessages] = useState<ChatBubble[]>([{ text: GREETING, isUser: false }]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to the newest message whenever the list grows.
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, isSending]);

  const buildHistory = (bubbles: ChatBubble[]): RileyMessage[] =>
    bubbles.map((b) => ({ role: b.isUser ? 'user' : 'assistant', content: b.text }));

  const ask = async (userMessage: string) => {
    if (!userMessage.trim() || isSending) return;

    const priorBubbles = messages;
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setIsSending(true);

    try {
      const result = await sendToRiley(userMessage, {
        channel: 'chat',
        userId: contextData?.userId,
        customerId: contextData?.customerId,
        jobId: contextData?.jobId || contextData?.moveId,
        jobNumber: contextData?.jobNumber,
        jobStatus: contextData?.jobStatus,
        moveDate: contextData?.moveDate,
        fromAddress: contextData?.fromAddress,
        toAddress: contextData?.toAddress,
        // Send the running transcript so Riley has context even for signed-out sessions.
        conversationHistory: buildHistory(priorBubbles),
      });

      const { text, hadForm } = stripFormAction(result.message);
      setMessages((prev) => [...prev, { text, isUser: false }]);
      if (hadForm) {
        setMessages((prev) => [
          ...prev,
          { text: 'You can finish and submit your request in the Quote tab whenever you’re ready.', isUser: false },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          text: `I'm having trouble reaching our system right now — but I don't want to leave you hanging. Call or text us at ${SUPPORT_PHONE} and we'll take care of you!`,
          isUser: false,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    const v = inputText.trim();
    if (!v) return;
    setInputText('');
    ask(v);
  };

  const handleChip = (chip: { label: string; msg?: string; store?: boolean }) => {
    if (isSending) return;
    if (chip.store) {
      Linking.openURL(STORE_URL).catch(() => {});
      setMessages((prev) => [
        ...prev,
        {
          text: "Great — I've opened our booking page for 2 hours of labor. Add it to your cart and check out, and our team will review the details and confirm your time with you. Want me to help make sure 2 hours is the right fit first?",
          isUser: false,
        },
      ]);
      return;
    }
    if (chip.msg) ask(chip.msg);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Riley</Text>
            <Text style={styles.headerSubtitle}>IN&OUT Moving assistant</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close chat">
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.messageBubble, msg.isUser ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.messageText, msg.isUser ? styles.userText : styles.aiText]}>{msg.text}</Text>
            </View>
          ))}
          {isSending && (
            <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#00783C" />
              <Text style={styles.typingText}>Riley is typing…</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.chipsRow}>
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity key={chip.label} style={styles.chip} onPress={() => handleChip(chip)} disabled={isSending}>
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message…"
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={1000}
            editable={!isSending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            accessibilityLabel="Send message"
          >
            <Send size={20} color={inputText.trim() && !isSending ? '#ffffff' : '#94a3b8'} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Powered by IN&OUT · Riley may take a moment to reply</Text>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f6',
  },
  header: {
    backgroundColor: '#00783C',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#00783C',
    borderBottomRightRadius: 5,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8e4',
    borderBottomLeftRadius: 5,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    marginLeft: 8,
    color: '#5b6b62',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  aiText: {
    color: '#16241d',
    fontFamily: 'Inter-Regular',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: '#e8f3ec',
    borderWidth: 1,
    borderColor: '#cfe6d8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: '#00783C',
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9efeb',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f4',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 110,
    fontSize: 15,
    color: '#16241d',
    fontFamily: 'Inter-Regular',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00783C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#dbe6df',
  },
  footer: {
    fontSize: 10.5,
    color: '#8a988f',
    textAlign: 'center',
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
});
