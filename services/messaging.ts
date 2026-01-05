import { supabase } from './supabase';
import { notificationService } from './notifications';

export interface Message {
  id: string;
  moveId: string;
  senderType: 'customer' | 'team' | 'system';
  senderName: string;
  senderAvatar?: string;
  messageContent: string;
  messageType: 'text' | 'image' | 'location' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface MilestoneUpdate {
  id: string;
  jobId: string;
  milestoneType: 'arrival' | 'paperwork' | 'packing_start' | 'packing_finish' | 'loading_start' | 'loading_finish' | 'departure' | 'delivery_arrival' | 'unloading_start' | 'unloading_finish' | 'completion';
  title: string;
  description: string;
  timestamp: string;
  location?: string;
  estimatedDuration?: number;
}

export const messagingService = {
  // Send message to move conversation
  sendMessage: async (moveId: string, senderType: Message['senderType'], senderName: string, content: string, messageType: Message['messageType'] = 'text'): Promise<Message | null> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          move_id: moveId,
          sender_type: senderType,
          sender_name: senderName,
          message_content: content,
          message_type: messageType,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send push notification for non-system messages
      if (senderType !== 'system') {
        await notificationService.scheduleNotification(
          `New message from ${senderName}`,
          content
        );
      }

      return data ? {
        id: data.id,
        moveId: data.move_id,
        senderType: data.sender_type,
        senderName: data.sender_name,
        senderAvatar: data.sender_avatar,
        messageContent: data.message_content,
        messageType: data.message_type,
        isRead: data.is_read,
        createdAt: data.created_at,
      } : null;
    } catch (error) {
      console.error('Send message error:', error);
      return null;
    }
  },

  // Get messages for a move
  getMoveMessages: async (moveId: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('move_id', moveId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map(message => ({
        id: message.id,
        moveId: message.move_id,
        senderType: message.sender_type,
        senderName: message.sender_name,
        senderAvatar: message.sender_avatar,
        messageContent: message.message_content,
        messageType: message.message_type,
        isRead: message.is_read,
        createdAt: message.created_at,
      })) || [];
    } catch (error) {
      console.error('Get messages error:', error);
      return [];
    }
  },

  // Mark messages as read
  markMessagesAsRead: async (moveId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('move_id', moveId)
        .neq('sender_type', 'customer'); // Don't mark customer's own messages as read

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Mark messages as read error:', error);
      return false;
    }
  },

  // Create automated milestone update
  createMilestoneUpdate: async (jobId: string, milestoneType: MilestoneUpdate['milestoneType'], customDescription?: string): Promise<MilestoneUpdate | null> => {
    try {
      const milestoneTemplates = {
        arrival: {
          title: 'Team Arrived',
          description: 'Your moving team has arrived at the pickup location and is preparing to begin.',
        },
        paperwork: {
          title: 'Paperwork Complete',
          description: 'All moving documentation has been completed and verified.',
        },
        packing_start: {
          title: 'Packing Started',
          description: 'Professional packing of your belongings has begun.',
        },
        packing_finish: {
          title: 'Packing Complete',
          description: 'All items have been professionally packed and are ready for loading.',
        },
        loading_start: {
          title: 'Loading Started',
          description: 'Your belongings are now being loaded onto the moving truck.',
        },
        loading_finish: {
          title: 'Loading Complete',
          description: 'All items have been safely loaded and secured in the truck.',
        },
        departure: {
          title: 'Departed for Destination',
          description: 'The moving truck has departed and is en route to your new location.',
        },
        delivery_arrival: {
          title: 'Arrived at Destination',
          description: 'Your moving team has arrived at your new location and is preparing to unload.',
        },
        unloading_start: {
          title: 'Unloading Started',
          description: 'Your belongings are now being unloaded from the truck.',
        },
        unloading_finish: {
          title: 'Unloading Complete',
          description: 'All items have been unloaded and placed in your new home.',
        },
        completion: {
          title: 'Move Complete',
          description: 'Your move has been completed successfully! Thank you for choosing IN&OUT Moving.',
        },
      };

      const template = milestoneTemplates[milestoneType];
      const description = customDescription || template.description;

      const { data, error } = await supabase
        .from('milestone_updates')
        .insert({
          job_id: jobId,
          milestone_type: milestoneType,
          title: template.title,
          description,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Send message to move conversation
      const { data: jobData } = await supabase
        .from('jobs')
        .select('customer_id')
        .eq('id', jobId)
        .single();

      if (jobData) {
        await messagingService.sendMessage(
          jobId,
          'system',
          'IN&OUT Moving',
          `${template.title}: ${description}`,
          'system'
        );
      }

      // Send push notification
      await notificationService.scheduleNotification(
        template.title,
        description
      );

      return data ? {
        id: data.id,
        jobId: data.job_id,
        milestoneType: data.milestone_type,
        title: data.title,
        description: data.description,
        timestamp: data.timestamp,
        location: data.location,
        estimatedDuration: data.estimated_duration,
      } : null;
    } catch (error) {
      console.error('Create milestone update error:', error);
      return null;
    }
  },

  // Get milestone updates for a job
  getJobMilestones: async (jobId: string): Promise<MilestoneUpdate[]> => {
    try {
      const { data, error } = await supabase
        .from('milestone_updates')
        .select('*')
        .eq('job_id', jobId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data?.map(milestone => ({
        id: milestone.id,
        jobId: milestone.job_id,
        milestoneType: milestone.milestone_type,
        title: milestone.title,
        description: milestone.description,
        timestamp: milestone.timestamp,
        location: milestone.location,
        estimatedDuration: milestone.estimated_duration,
      })) || [];
    } catch (error) {
      console.error('Get job milestones error:', error);
      return [];
    }
  },

  // Subscribe to real-time message updates
  subscribeToMessages: (moveId: string, callback: (message: Message) => void) => {
    const subscription = supabase
      .channel(`messages:${moveId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `move_id=eq.${moveId}`,
        },
        (payload) => {
          const message: Message = {
            id: payload.new.id,
            moveId: payload.new.move_id,
            senderType: payload.new.sender_type,
            senderName: payload.new.sender_name,
            senderAvatar: payload.new.sender_avatar,
            messageContent: payload.new.message_content,
            messageType: payload.new.message_type,
            isRead: payload.new.is_read,
            createdAt: payload.new.created_at,
          };
          callback(message);
        }
      )
      .subscribe();

    return subscription;
  },

  // Subscribe to milestone updates
  subscribeToMilestones: (jobId: string, callback: (milestone: MilestoneUpdate) => void) => {
    const subscription = supabase
      .channel(`milestones:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'milestone_updates',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const milestone: MilestoneUpdate = {
            id: payload.new.id,
            jobId: payload.new.job_id,
            milestoneType: payload.new.milestone_type,
            title: payload.new.title,
            description: payload.new.description,
            timestamp: payload.new.timestamp,
            location: payload.new.location,
            estimatedDuration: payload.new.estimated_duration,
          };
          callback(milestone);
        }
      )
      .subscribe();

    return subscription;
  },
};