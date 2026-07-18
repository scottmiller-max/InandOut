/**
 * Riley AI Assistant - Edge Function Integration
 * All Riley interactions are routed through the Supabase `riley-chat` / `riley-summary`
 * Edge Functions for secure API-key handling, personalization, and interaction logging.
 *
 * HANDOFF WITH THE WEBSITE:
 * The website talks to the same `riley-chat` function anonymously (session-only memory).
 * In the app, customers are signed in, so we send their Supabase session access token as
 * the Authorization bearer. That makes `riley-chat` run in "customer" mode: it resolves the
 * caller to their own CRM record and loads their Riley history + latest summary, so the app
 * conversation continues the same thread the customer had elsewhere. If there is no session
 * (e.g. a signed-out screen), we fall back to the anon key and Riley answers generically.
 */

import { supabase } from './supabase';

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

/**
 * Build auth headers for an Edge Function call. Prefers the signed-in user's session
 * token (so riley-chat can personalize + carry history); falls back to the anon key.
 * The `apikey` header must always be the anon key so the Supabase gateway routes the call.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  let bearer = SUPABASE_ANON_KEY;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      bearer = data.session.access_token;
    }
  } catch (e) {
    // No session available; fall back to anon key.
  }
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  };
}

export async function sendToRiley(message: string, context: RileyContext): Promise<RileyResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return getRileyFallbackResponse(message);
  }

  try {
    const sanitizedMessage = sanitizeUserInput(message);

    // Carry the running conversation so continuity works even before the server-side (DB)
    // history is populated. For signed-in customers riley-chat prefers their stored
    // interactions, so this is a harmless supplement.
    const history = (context.conversationHistory || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-12);

    const requestBody = {
      message: sanitizedMessage,
      channel: context.channel || 'chat',
      customer_id: context.customerId,
      customer_email: context.customerEmail,
      customer_phone: context.customerPhone,
      customer_name: context.customerName,
      job_id: context.jobId,
      history,
      context: {
        source: 'app',
        jobNumber: context.jobNumber,
        jobStatus: context.jobStatus,
        moveDate: context.moveDate,
        fromAddress: context.fromAddress,
        toAddress: context.toAddress,
      },
    };

    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/riley-chat`, {
      method: 'POST',
      headers,
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
    // riley-summary is staff-only; authenticate with the signed-in staff user's session token.
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/riley-summary`, {
      method: 'POST',
      headers,
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
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
      message: "I would be happy to help you with scheduling! You can request a quote through our app's Quote tab, or call our team directly at 833-466-6881 to schedule your move.",
      success: false,
      error: 'Riley is offline',
    };
  }

  if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
    return {
      message: "Great question about pricing! You can get started through our Quote tab. Our pricing is flat and all-inclusive with a 2-hour minimum for labor, and Scott confirms every quote personally.",
      success: false,
      error: 'Riley is offline',
    };
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('aloha')) {
    return {
      message: "Aloha! I am Riley, your IN&OUT Moving assistant. How can I help you today? I can assist with quotes, scheduling, or answer questions about your move.",
      success: true,
    };
  }

  return {
    message: "Thank you for reaching out! I am Riley, your IN&OUT Moving assistant. How can I help you today? Feel free to ask about quotes, scheduling, or your move status. You can also reach our team at 833-466-6881.",
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
  // Logging now happens server-side in the edge function.
  // Kept for backwards compatibility but is a no-op.
  console.log('Riley conversation (logged server-side):', {
    userId,
    jobId: context.jobId,
    timestamp: new Date().toISOString(),
  });
}
