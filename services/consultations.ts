import { supabase } from './supabase';
import { adminNotificationService } from './adminNotifications';

export interface Consultation {
  id: string;
  userId: string;
  consultationType: 'video' | 'ai_photo' | 'instant_quote';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  moveDetails: {
    fromAddress: string;
    toAddress: string;
    moveDate: string;
    homeSize: string;
    specialItems?: string[];
  };
  analysisResults?: {
    detectedItems: Array<{
      id: string;
      name: string;
      category: string;
      count: number;
      confidence: number;
      estimatedCost: number;
      editable: boolean;
    }>;
    totalCost: number;
    confidence: number;
    reasoning: string[];
  };
  estimatedCost: number;
  status: 'pending_family_partner_approval' | 'approved' | 'rejected' | 'converted_to_move';
  familyPartnerNotes?: string;
  scheduledDate?: string;
  meetingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const consultationService = {
  // Create consultation record
  createConsultation: async (consultationData: Omit<Consultation, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Consultation | null> => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          user_id: consultationData.userId,
          consultation_type: consultationData.consultationType,
          customer_name: consultationData.customerName,
          customer_email: consultationData.customerEmail,
          customer_phone: consultationData.customerPhone,
          move_details: consultationData.moveDetails,
          analysis_results: consultationData.analysisResults,
          estimated_cost: consultationData.estimatedCost,
          scheduled_date: consultationData.scheduledDate,
          meeting_url: consultationData.meetingUrl,
          status: 'pending_family_partner_approval',
        })
        .select()
        .single();

      if (error) throw error;

      // Send admin notification for Family Partner approval
      await adminNotificationService.sendConsultationBookedAlert({
        customerName: consultationData.customerName,
        customerEmail: consultationData.customerEmail,
        consultationDate: consultationData.scheduledDate || new Date().toISOString(),
        consultationType: consultationData.consultationType,
        estimatedCost: consultationData.estimatedCost,
      });

      return data ? {
        id: data.id,
        userId: data.user_id,
        consultationType: data.consultation_type,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        moveDetails: data.move_details,
        analysisResults: data.analysis_results,
        estimatedCost: data.estimated_cost,
        status: data.status,
        familyPartnerNotes: data.family_partner_notes,
        scheduledDate: data.scheduled_date,
        meetingUrl: data.meeting_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } : null;
    } catch (error) {
      console.error('Create consultation error:', error);
      return null;
    }
  },

  // Get user consultations
  getUserConsultations: async (userId: string): Promise<Consultation[]> => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(consultation => ({
        id: consultation.id,
        userId: consultation.user_id,
        consultationType: consultation.consultation_type,
        customerName: consultation.customer_name,
        customerEmail: consultation.customer_email,
        customerPhone: consultation.customer_phone,
        moveDetails: consultation.move_details,
        analysisResults: consultation.analysis_results,
        estimatedCost: consultation.estimated_cost,
        status: consultation.status,
        familyPartnerNotes: consultation.family_partner_notes,
        scheduledDate: consultation.scheduled_date,
        meetingUrl: consultation.meeting_url,
        createdAt: consultation.created_at,
        updatedAt: consultation.updated_at,
      })) || [];
    } catch (error) {
      console.error('Get user consultations error:', error);
      return [];
    }
  },

  // Update consultation status (Family Partner approval)
  updateConsultationStatus: async (
    consultationId: string, 
    status: Consultation['status'], 
    familyPartnerNotes?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update({
          status,
          family_partner_notes: familyPartnerNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update consultation status error:', error);
      return false;
    }
  },
};