/**
 * Riley AI Assistant - Vapi Integration
 */

const VAPI_API_KEY = process.env.EXPO_PUBLIC_VAPI_API_KEY || '';
const VAPI_ASSISTANT_ID = process.env.EXPO_PUBLIC_VAPI_ASSISTANT_ID || '';
const VAPI_API_URL = 'https://api.vapi.ai/chat';

export interface RileyMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface RileyContext {
  userId?: string;
  jobId?: string;
  jobNumber?: string;
  customerName?: string;
  jobStatus?: string;
  moveDate?: string;
  fromAddress?: string;
  toAddress?: string;
  conversationHistory?: RileyMessage[];
}

export interface RileyResponse {
  message: string;
  success: boolean;
  error?: string;
  conversationId?: string;
}

export async function sendToRiley(message: string, context: RileyContext): Promise<RileyResponse> {
  if (!VAPI_API_KEY) {
    return {
      message: "I am sorry, but I am not configured properly right now. Please contact support for assistance.",
      success: false,
      error: 'VAPI API key not configured',
    };
  }

  if (!VAPI_ASSISTANT_ID) {
    return {
      message: "I am sorry, but I am not configured properly right now. Please contact support for assistance.",
      success: false,
      error: 'VAPI Assistant ID not configured',
    };
  }

  try {
    const contextPrompt = buildContextPrompt(context);

    const response = await fetch(VAPI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        message,
        context: contextPrompt,
        conversationHistory: context.conversationHistory || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Vapi API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      message: data.message || data.response || "I am not sure how to help with that. Could you rephrase your question?",
      success: true,
      conversationId: data.conversationId || data.id,
    };
  } catch (error) {
    console.error('Riley AI error:', error);
    return {
      message: "I am experiencing technical difficulties right now. Please try again in a moment or contact support.",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildContextPrompt(context: RileyContext): string {
  const parts = [
    'You are Riley, a helpful AI assistant for IN&OUT Moving company.',
    'You help customers with job status, scheduling, and general moving questions.',
    'Always be friendly, professional, and concise.',
    'If you do not know something, be honest and suggest contacting support.',
    '',
  ];

  if (context.customerName) {
    parts.push(`Customer name: ${context.customerName}`);
  }

  if (context.jobNumber) {
    parts.push(`Job number: ${context.jobNumber}`);
  }

  if (context.jobStatus) {
    parts.push(`Current job status: ${context.jobStatus}`);
  }

  if (context.moveDate) {
    parts.push(`Scheduled move date: ${context.moveDate}`);
  }

  if (context.fromAddress && context.toAddress) {
    parts.push(`Move route: ${context.fromAddress} to ${context.toAddress}`);
  }

  parts.push('');
  parts.push('IMPORTANT BOUNDARIES:');
  parts.push('- Only discuss the current job and general moving information');
  parts.push('- Do not access or discuss other customers data');
  parts.push('- Do not make promises about pricing or dates without confirmation');
  parts.push('- Do not modify job details; only provide information');
  parts.push('- Clearly label yourself as an AI assistant');

  return parts.join('\n');
}

export async function isRileyAvailable(): Promise<boolean> {
  if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
    return false;
  }

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
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
      message: "I would love to help you check your job status, but I am currently offline. Please check the Track tab in the app for real-time updates, or contact our support team directly.",
      success: false,
      error: 'Riley is offline',
    };
  }

  if (lowerMessage.includes('schedule') || lowerMessage.includes('book') || lowerMessage.includes('appointment')) {
    return {
      message: "I would be happy to help you with scheduling, but I am currently offline. Please use the Quote tab to request a quote or schedule a consultation, or contact our support team.",
      success: false,
      error: 'Riley is offline',
    };
  }

  if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
    return {
      message: "I would love to help you get a quote, but I am currently offline. Please use the Quote tab to get an instant estimate, or contact our support team for a detailed quote.",
      success: false,
      error: 'Riley is offline',
    };
  }

  return {
    message: "I am currently offline, but I would love to help! Please try again later or contact our support team directly for immediate assistance.",
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
  try {
    console.log('Riley conversation logged:', {
      userId,
      jobId: context.jobId,
      timestamp: new Date().toISOString(),
      messageLength: message.length,
      responseLength: response.length,
    });
  } catch (error) {
    console.error('Failed to log Riley conversation:', error);
  }
}
