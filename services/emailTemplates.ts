import { supabase } from './supabase';

export interface EmailTemplate {
  id: string;
  templateName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  mergeFields: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMergeData {
  first_name?: string;
  last_name?: string;
  email?: string;
  confirmation_url?: string;
  move_date?: string;
  time_slot?: string;
  from_address?: string;
  to_address?: string;
  job_number?: string;
  driver_name?: string;
  truck_number?: string;
  eta?: string;
  [key: string]: any;
}

export const emailTemplateService = {
  // Get email template by name
  getTemplate: async (templateName: string): Promise<EmailTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', templateName)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return data ? {
        id: data.id,
        templateName: data.template_name,
        subject: data.subject,
        htmlContent: data.html_content,
        textContent: data.text_content,
        mergeFields: data.merge_fields || [],
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } : null;
    } catch (error) {
      console.error('Get email template error:', error);
      return null;
    }
  },

  // Process template with merge data
  processTemplate: (template: EmailTemplate, mergeData: EmailMergeData): { subject: string; htmlContent: string; textContent?: string } => {
    let processedSubject = template.subject;
    let processedHtml = template.htmlContent;
    let processedText = template.textContent;

    // Replace merge fields in subject
    Object.entries(mergeData).forEach(([key, value]) => {
      const placeholder = `{{ .${key} }}`;
      const fallbackPlaceholder = `{{ .UserMetadata.${key} | default: .Email }}`;
      
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value || ''));
      processedSubject = processedSubject.replace(new RegExp(fallbackPlaceholder, 'g'), String(value || mergeData.email || ''));
    });

    // Replace merge fields in HTML content
    Object.entries(mergeData).forEach(([key, value]) => {
      const placeholder = `{{ .${key} }}`;
      const fallbackPlaceholder = `{{ .UserMetadata.${key} | default: .Email }}`;
      
      processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), String(value || ''));
      processedHtml = processedHtml.replace(new RegExp(fallbackPlaceholder, 'g'), String(value || mergeData.email || ''));
    });

    // Replace merge fields in text content
    if (processedText) {
      Object.entries(mergeData).forEach(([key, value]) => {
        const placeholder = `{{ .${key} }}`;
        const fallbackPlaceholder = `{{ .UserMetadata.${key} | default: .Email }}`;
        
        processedText = processedText!.replace(new RegExp(placeholder, 'g'), String(value || ''));
        processedText = processedText!.replace(new RegExp(fallbackPlaceholder, 'g'), String(value || mergeData.email || ''));
      });
    }

    return {
      subject: processedSubject,
      htmlContent: processedHtml,
      textContent: processedText,
    };
  },

  // Send branded email
  sendBrandedEmail: async (
    templateName: string, 
    recipientEmail: string, 
    mergeData: EmailMergeData
  ): Promise<boolean> => {
    try {
      const template = await emailTemplateService.getTemplate(templateName);
      if (!template) {
        console.error('Email template not found:', templateName);
        return false;
      }

      const processedEmail = emailTemplateService.processTemplate(template, mergeData);

      // In production, integrate with email service (SendGrid, Mailgun, etc.)
      console.log('Sending branded email:', {
        to: recipientEmail,
        subject: processedEmail.subject,
        html: processedEmail.htmlContent,
        text: processedEmail.textContent,
      });

      // Store email log for tracking
      await supabase.from('email_logs').insert({
        template_name: templateName,
        recipient_email: recipientEmail,
        subject: processedEmail.subject,
        merge_data: mergeData,
        sent_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Send branded email error:', error);
      return false;
    }
  },

  // Send move confirmation email
  sendMoveConfirmation: async (customerEmail: string, moveData: {
    firstName: string;
    moveDate: string;
    timeSlot: string;
    fromAddress: string;
    toAddress: string;
    jobNumber: string;
  }): Promise<boolean> => {
    return emailTemplateService.sendBrandedEmail('move_confirmation', customerEmail, {
      first_name: moveData.firstName,
      email: customerEmail,
      move_date: moveData.moveDate,
      time_slot: moveData.timeSlot,
      from_address: moveData.fromAddress,
      to_address: moveData.toAddress,
      job_number: moveData.jobNumber,
    });
  },

  // Send milestone update email
  sendMilestoneEmail: async (customerEmail: string, milestoneData: {
    firstName: string;
    milestoneTitle: string;
    description: string;
    jobNumber: string;
    eta?: string;
    location?: string;
  }): Promise<boolean> => {
    // Use a generic milestone template
    const template = await emailTemplateService.getTemplate('milestone_update');
    if (!template) return false;

    return emailTemplateService.sendBrandedEmail('milestone_update', customerEmail, {
      first_name: milestoneData.firstName,
      email: customerEmail,
      milestone_title: milestoneData.milestoneTitle,
      description: milestoneData.description,
      job_number: milestoneData.jobNumber,
      eta: milestoneData.eta,
      location: milestoneData.location,
    });
  },
};