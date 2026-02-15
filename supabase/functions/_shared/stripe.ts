/**
 * Shared Stripe Client
 * Phase 1.5: Deno-compatible Stripe initialization for Edge Functions
 *
 * Uses Stripe v14 (Deno-compatible) with Fetch HTTP client (no Node.js dependencies)
 * Exports shared stripe instance and webhook secret for use across functions
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';

// Initialize Stripe with test mode key
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable not set');
}

// Stripe v14 with Fetch HTTP client (Deno-compatible)
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// Webhook secret for signature verification
export const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

console.log('✅ Stripe client initialized (v14, Deno-compatible)');
