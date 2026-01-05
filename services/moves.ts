import { supabase } from './supabase';
import { notificationService } from './notifications';

export interface Move {
  id: string;
  userId: string;
  fromAddress: string;
  toAddress: string;
  moveDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  estimatedCost: number;
  actualCost?: number;
  teamId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoveQuote {
  id: string;
  userId: string;
  fromAddress: string;
  toAddress: string;
  moveDate: string;
  homeSize: string;
  specialItems: string[];
  estimatedCost: number;
  quoteType: 'ai' | 'video' | 'in_person';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const movesService = {
  // Create new move quote
  createQuote: async (quoteData: Omit<MoveQuote, 'id' | 'createdAt' | 'status'>) => {
    try {
      const { data, error } = await supabase
        .from('move_quotes')
        .insert({
          ...quoteData,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification
      await notificationService.scheduleNotification(
        'Quote Submitted',
        'Your moving quote has been submitted and is being reviewed.'
      );

      return data;
    } catch (error) {
      console.error('Create quote error:', error);
      throw error;
    }
  },

  // Get user's quotes
  getUserQuotes: async (userId: string): Promise<MoveQuote[]> => {
    try {
      const { data, error } = await supabase
        .from('move_quotes')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get quotes error:', error);
      return [];
    }
  },

  // Create move from approved quote
  createMove: async (quoteId: string): Promise<Move | null> => {
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('move_quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      const moveData: Omit<Move, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: quote.userId,
        fromAddress: quote.fromAddress,
        toAddress: quote.toAddress,
        moveDate: quote.moveDate,
        status: 'scheduled',
        estimatedCost: quote.estimatedCost,
      };

      const { data, error } = await supabase
        .from('moves')
        .insert(moveData)
        .select()
        .single();

      if (error) throw error;

      // Send confirmation notification
      await notificationService.scheduleNotification(
        'Move Scheduled',
        `Your move is confirmed for ${new Date(quote.moveDate).toLocaleDateString()}`
      );

      return data;
    } catch (error) {
      console.error('Create move error:', error);
      return null;
    }
  },

  // Get user's moves
  getUserMoves: async (userId: string): Promise<Move[]> => {
    try {
      const { data, error } = await supabase
        .from('moves')
        .select('*')
        .eq('userId', userId)
        .order('moveDate', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get moves error:', error);
      return [];
    }
  },

  // Update move status
  updateMoveStatus: async (moveId: string, status: Move['status'], notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('moves')
        .update({
          status,
          notes,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', moveId)
        .select()
        .single();

      if (error) throw error;

      // Send status update notification
      const statusMessages = {
        scheduled: 'Your move has been scheduled',
        in_progress: 'Your move is now in progress',
        completed: 'Your move has been completed successfully',
        cancelled: 'Your move has been cancelled',
      };

      await notificationService.sendMoveUpdate(
        moveId,
        status,
        statusMessages[status]
      );

      return data;
    } catch (error) {
      console.error('Update move status error:', error);
      throw error;
    }
  },

  // Calculate AI quote (simplified algorithm)
  calculateAIQuote: (fromAddress: string, toAddress: string, homeSize: string, specialItems: string[] = []) => {
    // Base rates by home size
    const baseCosts = {
      'studio': 400,
      '1-room': 500,
      '2-rooms': 700,
      '3-rooms': 1000,
      '4-rooms': 1400,
      '5+-rooms': 1800,
    };

    let baseCost = baseCosts[homeSize as keyof typeof baseCosts] || 800;

    // No special items cost since company doesn't move special items
    const specialItemsCost = 0;

    // Distance factor (simplified - in production, use actual distance calculation)
    const distanceFactor = 1.2; // Assume 20% increase for distance

    const totalCost = Math.round((baseCost + specialItemsCost) * distanceFactor);

    return {
      baseCost,
      specialItemsCost,
      distanceFactor,
      totalCost,
    };
  },
};