import { supabase } from './supabase';
import { notificationService } from './notifications';
import { emailTemplateService } from './emailTemplates';

export interface MessageThread {
  id: string;
  jobId: string;
  customerId: string;
  threadType: 'general' | 'support' | 'tracking' | 'billing';
  isActive: boolean;
  lastMessageAt: string;
  createdAt: string;
}

export interface EnhancedMessage {
  id: string;
  threadId?: string;
  moveId: string;
  senderType: 'customer' | 'team' | 'system';
  senderName: string;
  senderAvatar?: string;
  messageContent: string;
  messageType: 'text' | 'image' | 'location' | 'system';
  attachmentUrls: string[];
  replyToId?: string;
  googleMessageId?: string;
  isRead: boolean;
  createdAt: string;
}

export const enhancedMessagingService = {
  // Create message thread
  createMessageThread: async (
    jobId: string, 
    customerId: string, 
    threadType: MessageThread['threadType'] = 'general'
  ): Promise<MessageThread | null> => {
    try {
      const { data, error } = await supabase
        .from('message_threads')
        .insert({
          job_id: jobId,
          customer_id: customerId,
          thread_type: threadType,
          is_active: true,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return data ? {
        id: data.id,
        jobId: data.job_id,
        customerId: data.customer_id,
        threadType: data.thread_type,
        isActive: data.is_active,
        lastMessageAt: data.last_message_at,
        createdAt: data.created_at,
      } : null;
    } catch (error) {
      console.error('Create message thread error:', error);
      return null;
    }
  },

  // Send enhanced message with Google integration
  sendEnhancedMessage: async (
    moveId: string,
    threadId: string,
    senderType: EnhancedMessage['senderType'],
    senderName: string,
    content: string,
    messageType: EnhancedMessage['messageType'] = 'text',
    attachments: string[] = [],
    replyToId?: string
  ): Promise<EnhancedMessage | null> => {
    try {
      // Generate Google message ID for integration
      const googleMessageId = `inout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          move_id: moveId,
          sender_type: senderType,
          sender_name: senderName,
          message_content: content,
          message_type: messageType,
          attachment_urls: attachments,
          reply_to_id: replyToId,
          google_message_id: googleMessageId,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update thread last message time
      await supabase
        .from('message_threads')
        .update({
          last_message_at: new Date().toISOString(),
        })
        .eq('id', threadId);

      // Send notifications for non-system messages
      if (senderType !== 'system') {
        await notificationService.scheduleNotification(
          `New message from ${senderName}`,
          content
        );

        // Send email notification if enabled
        // In production, integrate with Google Workspace API
        console.log('Google Workspace Integration:', {
          messageId: googleMessageId,
          threadId,
          content,
          attachments,
        });
      }

      return data ? {
        id: data.id,
        threadId: data.thread_id,
        moveId: data.move_id,
        senderType: data.sender_type,
        senderName: data.sender_name,
        senderAvatar: data.sender_avatar,
        messageContent: data.message_content,
        messageType: data.message_type,
        attachmentUrls: data.attachment_urls || [],
        replyToId: data.reply_to_id,
        googleMessageId: data.google_message_id,
        isRead: data.is_read,
        createdAt: data.created_at,
      } : null;
    } catch (error) {
      console.error('Send enhanced message error:', error);
      return null;
    }
  },

  // Get thread messages with enhanced features
  getThreadMessages: async (threadId: string): Promise<EnhancedMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map(message => ({
        id: message.id,
        threadId: message.thread_id,
        moveId: message.move_id,
        senderType: message.sender_type,
        senderName: message.sender_name,
        senderAvatar: message.sender_avatar,
        messageContent: message.message_content,
        messageType: message.message_type,
        attachmentUrls: message.attachment_urls || [],
        replyToId: message.reply_to_id,
        googleMessageId: message.google_message_id,
        isRead: message.is_read,
        createdAt: message.created_at,
      })) || [];
    } catch (error) {
      console.error('Get thread messages error:', error);
      return [];
    }
  },

  // Get customer message threads
  getCustomerThreads: async (customerId: string): Promise<MessageThread[]> => {
    try {
      // Since message_threads table doesn't exist, create mock threads from existing moves
      const { data: moves, error } = await supabase
        .from('moves')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create mock threads based on moves
      return moves?.map(move => ({
        id: `thread-${move.id}`,
        jobId: move.id,
        customerId: move.user_id,
        threadType: 'general' as const,
        isActive: true,
        lastMessageAt: move.updated_at || move.created_at,
        createdAt: move.created_at,
      })) || [];
    } catch (error) {
      console.error('Get customer threads error:', error);
      return [];
    }
  },

  // Mark thread messages as read
  markThreadAsRead: async (threadId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .neq('sender_type', 'customer'); // Don't mark customer's own messages as read

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Mark thread as read error:', error);
      return false;
    }
  },

  // Subscribe to thread updates
  subscribeToThread: (threadId: string, callback: (message: EnhancedMessage) => void) => {
    const subscription = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const message: EnhancedMessage = {
            id: payload.new.id,
            threadId: payload.new.thread_id,
            moveId: payload.new.move_id,
            senderType: payload.new.sender_type,
            senderName: payload.new.sender_name,
            senderAvatar: payload.new.sender_avatar,
            messageContent: payload.new.message_content,
            messageType: payload.new.message_type,
            attachmentUrls: payload.new.attachment_urls || [],
            replyToId: payload.new.reply_to_id,
            googleMessageId: payload.new.google_message_id,
            isRead: payload.new.is_read,
            createdAt: payload.new.created_at,
          };
          callback(message);
        }
      )
      .subscribe();

    return subscription;
  },

  // Send automated status update
  sendStatusUpdate: async (
    jobId: string,
    status: string,
    description: string,
    location?: string
  ): Promise<boolean> => {
    try {
      // Get job and customer info
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customers!inner(*)
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Find or create general thread
      let { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .select('*')
        .eq('job_id', jobId)
        .eq('thread_type', 'general')
        .single();

      if (threadError && threadError.code === 'PGRST116') {
        // Create thread if it doesn't exist
        const newThread = await enhancedMessagingService.createMessageThread(
          jobId,
          job.customers.id,
          'general'
        );
        thread = newThread;
      }

      if (!thread) return false;

      // Send message
      const message = `${status}: ${description}${location ? ` at ${location}` : ''}`;
      await enhancedMessagingService.sendEnhancedMessage(
        jobId,
        thread.id,
        'system',
        'IN&OUT Moving',
        message,
        'system'
      );

      return true;
    } catch (error) {
      console.error('Send status update error:', error);
      return false;
    }
  },
};