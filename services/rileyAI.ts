/**
 * Riley AI Assistant - Edge Function Integration
 * All Riley interactions are now routed through Supabase Edge Functions
 * for secure API key handling and interaction logging
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export interface RileyMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface RileyContext {
  userId?: string;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  jobId?: string;
  jobNumber?: string;
  jobStatus?: string;
  moveDate?: string;
  fromAddress?: string;
  toAddress?: string;
  conversationHistory?: RileyMessage[];
  channel?: 'chat' | 'sms' | 'call';
}

export interface RileyResponse {
  message: string;
  success: boolean;
  error?: string;
  conversationId?: string;
  customerId?: string;
}

export interface RileySummaryResponse {
  success: boolean;
  summaryId?: string;
  summary?: string;
  interactionCount?: number;
  error?: string;
}

export async function sendToRiley(message: string, context: RileyContext): Promise<RileyResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return getRileyFallbackResponse(message);
  }

  try {
    const sanitizedMessage = sanitizeUserInput(message);

    const requestBody = {
      message: sanitizedMessage,
      channel: context.channel || 'chat',
      customer_id: context.customerId,
      customer_email: context.customerEmail,
      customer_phone: context.customerPhone,
      customer_name: context.customerName,
      job_id: context.jobId,
      context: {
        jobNumber: context.jobNumber,
        jobStatus: context.jobStatus,
        moveDate: context.moveDate,
        fromAddress: context.fromAddress,
        toAddress: context.toAddress,
      },
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/riley-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Riley edge function error:', response.status, errorText);
      return getRileyFallbackResponse(message);
    }

    const data = await response.json();

    return {
      message: data.message || "I am not sure how to help with that. Could you rephrase your question?",
      success: data.success ?? true,
      customerId: data.customer_id,
    };
  } catch (error) {
    console.error('Riley AI error:', error);
    return getRileyFallbackResponse(message);
  }
}

export async function triggerRileySummary(
  customerId: string,
  triggerEvent: 'end_of_conversation' | 'after_call' | 'after_booking' | 'interaction_threshold' | 'manual_refresh',
  jobId?: string
): Promise<RileySummaryResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      success: false,
      error: 'Supabase not configured',
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/riley-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customerId,
        trigger_event: triggerEvent,
        job_id: jobId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Riley summary error:', response.status, errorText);
      return {
        success: false,
        error: `Summary generation failed: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: data.success ?? true,
      summaryId: data.summary_id,
      summary: data.summary,
      interactionCount: data.interaction_count,
    };
  } catch (error) {
    console.error('Riley summary error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function isRileyAvailable(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/riley-chat`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Riley availability check failed:', error);
    return false;
  }
}

export function getRileyFallbackResponse(message: string): RileyResponse {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('status') || lowerMessage.includes('where') || lowerMessage.includes('when')) {
    return {
      message: "I would love to help you check your job status! You can view real-time updates in the Track tab of our app, or contact our support team for detailed information.",
      success: false,
      error: 'Riley is offline',
    };
  }

  if (lowerMessage.includes('schedule') || lowerMessage.includes('book') || lowerMessage.includes('appointment')) {
    return {
      message: "I would be happy to help you with scheduling! You can request a quote through our app's Quote tab, or call our team directly to schedule your move.",
      success: false,
      error: 'Riley is offline',
    };
  }

  if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
    return {
      message: "Great question about pricing! You can get an instant estimate through our Quote tab. For a detailed quote, our team would be happy to schedule a consultation.",
      success: false,
      error: 'Riley is offline',
    };
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      message: "Hello! I am Riley, your IN&OUT Moving assistant. How can I help you today? I can assist with quotes, scheduling, or answer questions about your move.",
      success: true,
    };
  }

  return {
    message: "Thank you for reaching out! I am Riley, your IN&OUT Moving assistant. How can I help you today? Feel free to ask about quotes, scheduling, or your move status.",
    success: false,
    error: 'Riley is offline',
  };
}

export function sanitizeUserInput(input: string): string {
  let sanitized = input.trim();

  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED]');
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]');
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@(?!inandoutmovin\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]');

  return sanitized;
}

export async function logRileyConversation(
  userId: string,
  message: string,
  response: string,
  context: RileyContext
): Promise<void> {
  // Logging now happens server-side in the edge function
  // This function is kept for backwards compatibility but is a no-op
  console.log('Riley conversation (logged server-side):', {
    userId,
    jobId: context.jobId,
    timestamp: new Date().toISOString(),
  });
}
