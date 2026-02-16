/**
 * Stripe Server-side Utilities
 * Phase 6.5: Server-side Stripe SDK initialization for Payment Intent creation
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe with API version
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-01-28.clover', // Latest stable version
  typescript: true,
});
