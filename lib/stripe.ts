/**
 * Stripe checkout helper — In&Out Moving
 * ---------------------------------------------------------------------------
 * Calls the existing `stripe-checkout` Supabase Edge Function and returns the
 * hosted Checkout URL.
 *
 * The function requires a signed-in user (verify_jwt = true), so we pass the
 * current session's access token. If nobody is signed in we return
 * { needsAuth: true } and let the screen decide what to do.
 *
 * Contract (already deployed, do not change):
 *   POST { price_id, mode: 'payment' | 'subscription', success_url, cancel_url }
 *   ->   { sessionId, url }  |  { error }
 */

import { Platform, Linking } from 'react-native';
import { supabase } from '@/services/supabase';

export type CheckoutMode = 'payment' | 'subscription';

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; needsAuth: true }
  | { ok: false; needsAuth?: false; error: string };

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`;

/** Where Stripe sends the customer back to. Must be http(s) — Stripe rejects custom schemes. */
export const CHECKOUT_RETURN = {
  success: 'https://www.inandoutmovin.com/pricing-membership?club=welcome',
  cancel: 'https://www.inandoutmovin.com/pricing-membership?club=canceled',
};

export async function createCheckoutSession(
  priceId: string,
  mode: CheckoutMode,
  returnTo: { success: string; cancel: string } = CHECKOUT_RETURN
): Promise<CheckoutResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { ok: false, needsAuth: true };
    }

    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        mode,
        success_url: returnTo.success,
        cancel_url: returnTo.cancel,
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body?.url) {
      return {
        ok: false,
        error: body?.error || `Checkout failed (${res.status}). Please try again.`,
      };
    }

    return { ok: true, url: body.url };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not reach checkout. Please try again.' };
  }
}

/** Send the customer to the hosted Stripe Checkout page. */
export async function openCheckout(url: string) {
  if (Platform.OS === 'web') {
    // Same tab, so Stripe's success/cancel redirect lands the customer back where they started.
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

/** Convenience: create the session and open it in one call. */
export async function startCheckout(
  priceId: string,
  mode: CheckoutMode
): Promise<CheckoutResult> {
  const result = await createCheckoutSession(priceId, mode);
  if (result.ok) await openCheckout(result.url);
  return result;
}
