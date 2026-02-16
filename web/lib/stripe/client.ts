/**
 * Stripe Client-side Utilities
 * Phase 4.5: Client-side Stripe.js initialization for Payment Element
 */

import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
