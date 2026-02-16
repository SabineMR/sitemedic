/**
 * Stripe Server-side Utilities
 * Phase 4.5: Server-side Stripe SDK initialization for Payment Intent creation
 */

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});
