import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  totalMoves: number;
  customerRating: number;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
}

export interface Move {
  id: string;
  userId: string;
  moveNumber: string;
  fromAddress: string;
  toAddress: string;
  moveDate: string;
  homeSize: string;
  specialItems: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  estimatedCost?: number;
  actualCost?: number;
  teamId?: string;
  driverName?: string;
  truckNumber?: string;
  progressPercentage: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface Event {
  id: string;
  moveId: string;
  eventType: 'packing' | 'loading' | 'transport' | 'unloading' | 'completion' | 'delay' | 'update';
  eventTitle: string;
  eventDescription?: string;
  eventTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  createdAt: string;
}

export interface CustomerPhoto {
  id: string;
  userId: string;
  moveId?: string;
  jobId?: string;
  photoUrl: string;
  photoType: 'room' | 'item' | 'damage' | 'inventory';
  description?: string;
  roomType?: string;
  isBeforePhoto: boolean;
  fileSize?: number;
  createdAt: string;
  jobMoveDate?: string | null;
  jobFromAddress?: string | null;
  jobToAddress?: string | null;
}

export const databaseService = {
  // Users
  getUser: async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data ? {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        subscriptionPlan: data.subscription_plan,
        subscriptionStatus: data.subscription_status,
        totalMoves: data.total_moves,
        customerRating: data.customer_rating,
        memberSince: data.member_since,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } : null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  // Moves
  getUserMoves: async (userId: string): Promise<Move[]> => {
    try {
      const { data, error } = await supabase
        .from('moves')
        .select('*')
        .eq('user_id', userId)
        .order('move_date', { ascending: false });

      if (error) throw error;
      return data?.map(move => ({
        id: move.id,
        userId: move.user_id,
        moveNumber: move.move_number,
        fromAddress: move.from_address,
        toAddress: move.to_address,
        moveDate: move.move_date,
        homeSize: move.home_size,
        specialItems: move.special_items || [],
        status: move.status,
        estimatedCost: move.estimated_cost,
        actualCost: move.actual_cost,
        teamId: move.team_id,
        driverName: move.driver_name,
        truckNumber: move.truck_number,
        progressPercentage: move.progress_percentage,
        notes: move.notes,
        createdAt: move.created_at,
        updatedAt: move.updated_at,
      })) || [];
    } catch (error) {
      console.error('Get user moves error:', error);
      return [];
    }
  },

  // Events (replacing mock timeline data)
  getMoveEvents: async (moveId: string): Promise<Event[]> => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('move_id', moveId)
        .order('event_time', { ascending: true });

      if (error) throw error;
      return data?.map(event => ({
        id: event.id,
        moveId: event.move_id,
        eventType: event.event_type,
        eventTitle: event.event_title,
        eventDescription: event.event_description,
        eventTime: event.event_time,
        status: event.status,
        location: event.location,
        createdAt: event.created_at,
      })) || [];
    } catch (error) {
      console.error('Get move events error:', error);
      return [];
    }
  },

  // Messages
  getMoveMessages: async (moveId: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('move_id', moveId)
        .order('created_at', { ascending: false });

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
      console.error('Get move messages error:', error);
      return [];
    }
  },

  // Customer Photos
  getUserPhotos: async (userId: string, moveId?: string): Promise<CustomerPhoto[]> => {
    try {
      let query = supabase
        .from('customer_photos')
        .select('*')
        .eq('user_id', userId);

      if (moveId) {
        query = query.eq('move_id', moveId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(photo => ({
        id: photo.id,
        userId: photo.user_id,
        moveId: photo.move_id,
        photoUrl: photo.photo_url,
        photoType: photo.photo_type,
        description: photo.description,
        roomType: photo.room_type,
        isBeforePhoto: photo.is_before_photo,
        fileSize: photo.file_size,
        createdAt: photo.created_at,
      })) || [];
    } catch (error) {
      console.error('Get user photos error:', error);
      return [];
    }
  },

  getGalleryPhotos: async (userId: string): Promise<CustomerPhoto[]> => {
    try {
      const { data, error } = await supabase
        .from('customer_photos')
        .select('*, jobs(move_date, from_address, from_city, to_address, to_city)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((photo: any) => ({
        id: photo.id,
        userId: photo.user_id,
        moveId: photo.move_id,
        jobId: photo.job_id,
        photoUrl: photo.photo_url,
        photoType: photo.photo_type,
        description: photo.description,
        roomType: photo.room_type,
        isBeforePhoto: photo.is_before_photo,
        fileSize: photo.file_size,
        createdAt: photo.created_at,
        jobMoveDate: photo.jobs?.move_date ?? null,
        jobFromAddress: photo.jobs
          ? [photo.jobs.from_address, photo.jobs.from_city].filter(Boolean).join(', ')
          : null,
        jobToAddress: photo.jobs
          ? [photo.jobs.to_address, photo.jobs.to_city].filter(Boolean).join(', ')
          : null,
      }));
    } catch (error) {
      console.error('Get gallery photos error:', error);
      return [];
    }
  },

  uploadUserPhoto: async (params: {
    userId: string;
    customerId?: string;
    uri: string;
    photoType?: 'room' | 'item' | 'damage' | 'inventory';
    description?: string;
    jobId?: string;
    moveId?: string;
  }): Promise<CustomerPhoto | null> => {
    try {
      const { userId, customerId, uri, photoType = 'item', description, jobId, moveId } = params;

      const response = await fetch(uri);
      const blob = await response.blob();
      const rawExt = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
      const ext = rawExt.length <= 4 ? rawExt : 'jpg';
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-photos')
        .upload(path, blob, {
          contentType: blob.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('customer_photos')
        .insert({
          user_id: userId,
          customer_id: customerId || null,
          job_id: jobId || null,
          move_id: moveId || null,
          photo_url: path,
          photo_type: photoType,
          description: description || null,
          file_size: blob.size,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        moveId: data.move_id,
        jobId: data.job_id,
        photoUrl: data.photo_url,
        photoType: data.photo_type,
        description: data.description,
        roomType: data.room_type,
        isBeforePhoto: data.is_before_photo,
        fileSize: data.file_size,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Upload user photo error:', error);
      return null;
    }
  },

  getPhotoSignedUrl: async (path: string, expiresInSeconds = 3600): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('customer-photos')
        .createSignedUrl(path, expiresInSeconds);
      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Get signed photo url error:', error);
      return null;
    }
  },

  // Create new move
  createMove: async (moveData: Omit<Move, 'id' | 'createdAt' | 'updatedAt'>): Promise<Move | null> => {
    try {
      const { data, error } = await supabase
        .from('moves')
        .insert({
          user_id: moveData.userId,
          move_number: moveData.moveNumber,
          from_address: moveData.fromAddress,
          to_address: moveData.toAddress,
          move_date: moveData.moveDate,
          home_size: moveData.homeSize,
          special_items: moveData.specialItems,
          status: moveData.status,
          estimated_cost: moveData.estimatedCost,
          progress_percentage: moveData.progressPercentage,
        })
        .select()
        .single();

      if (error) throw error;
      return data ? {
        id: data.id,
        userId: data.user_id,
        moveNumber: data.move_number,
        fromAddress: data.from_address,
        toAddress: data.to_address,
        moveDate: data.move_date,
        homeSize: data.home_size,
        specialItems: data.special_items || [],
        status: data.status,
        estimatedCost: data.estimated_cost,
        actualCost: data.actual_cost,
        teamId: data.team_id,
        driverName: data.driver_name,
        truckNumber: data.truck_number,
        progressPercentage: data.progress_percentage,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } : null;
    } catch (error) {
      console.error('Create move error:', error);
      return null;
    }
  },

  // Update move status
  updateMoveStatus: async (moveId: string, status: Move['status'], progressPercentage?: number): Promise<boolean> => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (progressPercentage !== undefined) {
        updateData.progress_percentage = progressPercentage;
      }

      const { error } = await supabase
        .from('moves')
        .update(updateData)
        .eq('id', moveId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update move status error:', error);
      return false;
    }
  },
};