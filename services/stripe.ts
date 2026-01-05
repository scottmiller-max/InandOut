/**
 * Stripe Payment Integration
 * Web-only implementation for Expo managed workflow
 */

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface StripeConfig {
  publishableKey: string;
  apiUrl: string;
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

let stripeInstance: any = null;

export async function initializeStripe(): Promise<boolean> {
  if (typeof window === 'undefined') {
    console.warn('Stripe can only be initialized in browser environment');
    return false;
  }

  if (!STRIPE_PUBLISHABLE_KEY) {
    console.error('Stripe publishable key not configured');
    return false;
  }

  try {
    if (!stripeInstance) {
      const { loadStripe } = await import('@stripe/stripe-js');
      stripeInstance = await loadStripe(STRIPE_PUBLISHABLE_KEY);
    }
    return stripeInstance !== null;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return false;
  }
}

export function getStripeInstance() {
  return stripeInstance;
}

export async function createPaymentIntent(
  jobId: string,
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<PaymentIntent | null> {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        amount,
        currency,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Payment intent creation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    return null;
  }
}

export async function confirmPayment(
  clientSecret: string,
  paymentMethod: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = getStripeInstance();

    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod,
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment confirmation failed',
    };
  }
}

export function formatAmount(amountInCents: number, currency: string = 'usd'): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_PUBLISHABLE_KEY;
}
