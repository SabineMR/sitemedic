/**
 * Stripe Client-side Utilities
 * Phase 6.5: Client-side Stripe.js initialization for Payment Element
 */

import { loadStripe as stripeLoadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export const loadStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
      return Promise.resolve(null);
    }

    stripePromise = stripeLoadStripe(publishableKey);
  }

  return stripePromise;
};
