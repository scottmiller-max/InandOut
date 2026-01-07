import { supabase } from './supabase';
import { databaseService, User, Move } from './database';

export interface UserDocument {
  id: string;
  userId: string;
  documentType: 'contract' | 'receipt' | 'insurance' | 'inventory' | 'other';
  documentName: string;
  documentUrl: string;
  fileSize?: number;
  uploadedAt: string;
  isSigned: boolean;
  createdAt: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  movePreferences: {
    preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
    packingService: boolean;
    storageNeeded: boolean;
    specialInstructions: string;
    contactMethod: 'email' | 'phone' | 'text';
  };
  communicationPreferences: {
    smsUpdates: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    milestoneUpdates: boolean;
    etaUpdates: boolean;
    teamMessages: boolean;
  };
  updatedAt: string;
  createdAt: string;
}

export interface ProfileData {
  user: User;
  activeMove?: Move;
  recentMoves: Move[];
  documents: UserDocument[];
  preferences: UserPreferences;
  stats: {
    totalMoves: number;
    averageRating: number;
    memberSince: string;
    outstandingBalance: number;
  };
}

export const profileService = {
  // Get complete profile data
  getProfileData: async (userId: string): Promise<ProfileData | null> => {
    try {
      // Get user data
      const user = await databaseService.getUser(userId);
      if (!user) return null;

      // Get moves
      const moves = await databaseService.getUserMoves(userId);
      const activeMove = moves.find(move => 
        move.status === 'scheduled' || move.status === 'in_progress'
      );
      const recentMoves = moves.slice(0, 5);

      // Get documents
      const documents = await profileService.getUserDocuments(userId);

      // Get preferences
      const preferences = await profileService.getUserPreferences(userId);

      // Calculate stats
      const stats = {
        totalMoves: user.totalMoves,
        averageRating: user.customerRating,
        memberSince: user.memberSince,
        outstandingBalance: 0,
      };

      return {
        user,
        activeMove,
        recentMoves,
        documents,
        preferences,
        stats,
      };
    } catch (error) {
      console.error('Get profile data error:', error);
      return null;
    }
  },

  // Get user documents
  getUserDocuments: async (userId: string): Promise<UserDocument[]> => {
    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return data?.map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        documentType: doc.document_type,
        documentName: doc.document_name,
        documentUrl: doc.document_url,
        fileSize: doc.file_size,
        uploadedAt: doc.uploaded_at,
        isSigned: doc.is_signed,
        createdAt: doc.created_at,
      })) || [];
    } catch (error) {
      console.error('Get user documents error:', error);
      return [];
    }
  },

  // Get user preferences
  getUserPreferences: async (userId: string): Promise<UserPreferences> => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Get user preferences error:', error);
        return await profileService.createDefaultPreferences(userId);
      }

      if (!data || data.length === 0) {
        // Create default preferences if none exist
        return await profileService.createDefaultPreferences(userId);
      }

      const preferences = data[0];

      return {
        id: preferences.id,
        userId: preferences.user_id,
        movePreferences: preferences.move_preferences,
        communicationPreferences: preferences.communication_preferences,
        updatedAt: preferences.updated_at,
        createdAt: preferences.created_at,
      };
    } catch (error) {
      console.error('Get user preferences error:', error);
      return await profileService.createDefaultPreferences(userId);
    }
  },

  // Create default preferences
  createDefaultPreferences: async (userId: string): Promise<UserPreferences> => {
    try {
      // First ensure the user exists in the users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingUser) {
        // Get user from auth to create profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.firstName || '',
              last_name: user.user_metadata?.lastName || '',
              phone: user.user_metadata?.phone || '',
            });
        } else {
          throw new Error('User not found in auth system');
        }
      }

      const defaultPrefs = {
        movePreferences: {
          preferredTimeSlot: 'morning' as const,
          packingService: true,
          storageNeeded: false,
          specialInstructions: '',
          contactMethod: 'email' as const,
        },
        communicationPreferences: {
          smsUpdates: true,
          emailNotifications: true,
          pushNotifications: false,
          milestoneUpdates: true,
          etaUpdates: true,
          teamMessages: true,
        },
      };

      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          move_preferences: defaultPrefs.movePreferences,
          communication_preferences: defaultPrefs.communicationPreferences,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        movePreferences: data.move_preferences,
        communicationPreferences: data.communication_preferences,
        updatedAt: data.updated_at,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Create default preferences error:', error);
      throw error;
    }
  },

  // Update user preferences
  updatePreferences: async (userId: string, preferences: Partial<UserPreferences>): Promise<boolean> => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (preferences.movePreferences) {
        updateData.move_preferences = preferences.movePreferences;
      }

      if (preferences.communicationPreferences) {
        updateData.communication_preferences = preferences.communicationPreferences;
      }

      const { error } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update preferences error:', error);
      return false;
    }
  },

  // Upload document
  uploadDocument: async (
    userId: string,
    documentType: UserDocument['documentType'],
    documentName: string,
    documentUrl: string,
    fileSize?: number,
    isSigned: boolean = false
  ): Promise<UserDocument | null> => {
    try {
      const { data, error } = await supabase
        .from('user_documents')
        .insert({
          user_id: userId,
          document_type: documentType,
          document_name: documentName,
          document_url: documentUrl,
          file_size: fileSize,
          is_signed: isSigned,
        })
        .select()
        .single();

      if (error) throw error;

      return data ? {
        id: data.id,
        userId: data.user_id,
        documentType: data.document_type,
        documentName: data.document_name,
        documentUrl: data.document_url,
        fileSize: data.file_size,
        uploadedAt: data.uploaded_at,
        isSigned: data.is_signed,
        createdAt: data.created_at,
      } : null;
    } catch (error) {
      console.error('Upload document error:', error);
      return null;
    }
  },

  // Get next scheduled move date
  getNextMoveDate: async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('moves')
        .select('move_date')
        .eq('user_id', userId)
        .in('status', ['scheduled', 'in_progress'])
        .order('move_date', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.move_date || null;
    } catch (error) {
      console.error('Get next move date error:', error);
      return null;
    }
  },

  // Update outstanding balance
  updateOutstandingBalance: async (userId: string, amount: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          outstanding_balance: amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update outstanding balance error:', error);
      return false;
    }
  },
};