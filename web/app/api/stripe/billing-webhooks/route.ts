/**
 * POST /api/stripe/billing-webhooks
 * Phase 25: Stripe billing webhook handler for subscription lifecycle events.
 *
 * Handles:
 * - checkout.session.completed: Write customer/subscription IDs and tier to org
 * - customer.subscription.updated: Update tier and status (with spelling normalization)
 * - customer.subscription.deleted: Set status to 'cancelled', preserve tier
 * - invoice.payment_failed: Log only — do NOT change subscription_status
 *
 * CRITICAL: Uses STRIPE_BILLING_WEBHOOK_SECRET (NOT STRIPE_WEBHOOK_SECRET).
 * The existing Connect webhook at /api/stripe/webhooks is completely separate.
 *
 * Idempotency: Every event is INSERT-ed into webhook_events with a UNIQUE
 * constraint on stripe_event_id. Duplicate events (23505) are silently skipped.
 *
 * Out-of-order protection: subscription_status_updated_at timestamp comparison
 * ensures older events cannot overwrite newer state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { SubscriptionTier } from '@/lib/billing/feature-gates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Service-role Supabase client (webhooks have no user auth session)
// Same pattern as web/app/api/contracts/webhooks/route.ts
// ---------------------------------------------------------------------------

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.text(); // RAW body — NOT request.json()
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // CRITICAL: Use BILLING webhook secret, not Connect webhook secret
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_BILLING_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Billing webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // -------------------------------------------------------------------------
  // Log event to webhook_events (audit trail + idempotency)
  // -------------------------------------------------------------------------

  const { error: insertError } = await supabase.from('webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    event_data: event.data.object as unknown as Record<string, unknown>,
    created_at: new Date(event.created * 1000).toISOString(),
  });

  if (insertError) {
    // Duplicate event (unique constraint violation on stripe_event_id) — skip
    if (insertError.code === '23505') {
      console.log(`Duplicate billing webhook event ${event.id}, skipping`);
      return NextResponse.json({ received: true });
    }
    console.error('Error logging webhook event:', insertError);
  }

  // -------------------------------------------------------------------------
  // Dispatch by event type
  // -------------------------------------------------------------------------

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(supabase, event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      default:
        // Event logged in webhook_events but not handled — still valuable for audit
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling billing webhook:', error);

    // Log processing error to webhook_events
    await supabase
      .from('webhook_events')
      .update({ processing_error: String(error) })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * checkout.session.completed — Write customer ID, subscription ID, tier, and
 * status to the organizations table after a successful Checkout.
 *
 * Phase 29 will set session.metadata.org_id during Checkout Session creation.
 */
async function handleCheckoutComplete(
  supabase: ReturnType<typeof getAdminClient>,
  event: Stripe.Event
) {
  const session = event.data.object as Stripe.Checkout.Session;

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  const orgId = session.metadata?.org_id;

  if (!customerId || !subscriptionId || !orgId) {
    console.error('checkout.session.completed missing required fields:', {
      customerId,
      subscriptionId,
      orgId,
    });
    await supabase
      .from('webhook_events')
      .update({ processing_error: 'Missing customerId, subscriptionId, or org_id metadata' })
      .eq('stripe_event_id', event.id);
    return;
  }

  // Retrieve subscription to get the price ID for tier determination
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceIdToTier(priceId);

  if (!tier) {
    console.error(`Unknown price ID ${priceId} for subscription ${subscriptionId}`);
    await supabase
      .from('webhook_events')
      .update({ processing_error: `Unknown price ID: ${priceId}` })
      .eq('stripe_event_id', event.id);
    return;
  }

  const eventTimestamp = new Date(event.created * 1000).toISOString();

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_tier: tier,
      subscription_status: 'active',
      subscription_status_updated_at: eventTimestamp,
    })
    .eq('id', orgId);

  if (error) {
    console.error('Error updating org after checkout:', error);
    await supabase
      .from('webhook_events')
      .update({ processing_error: error.message })
      .eq('stripe_event_id', event.id);
  }
}

/**
 * customer.subscription.updated — Update tier and status when a subscription
 * changes (upgrade, downgrade, payment status change).
 *
 * CRITICAL: Normalizes Stripe's 'canceled' (US) to database's 'cancelled' (UK)
 * per migration 133 CHECK constraint.
 *
 * Out-of-order protection: Only applies update if this event is newer than
 * the org's current subscription_status_updated_at timestamp.
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getAdminClient>,
  event: Stripe.Event
) {
  const subscription = event.data.object as Stripe.Subscription;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceIdToTier(priceId);
  const status = normalizeSubscriptionStatus(subscription.status);

  // Only update if we have a tier or status we track
  if (!status && !tier) return;

  const eventTimestamp = new Date(event.created * 1000).toISOString();

  // Out-of-order protection: fetch current org to compare timestamps
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status_updated_at')
    .eq('stripe_customer_id', customerId)
    .single();

  if (org?.subscription_status_updated_at) {
    const existingTimestamp = new Date(org.subscription_status_updated_at).getTime();
    const newTimestamp = event.created * 1000;
    if (newTimestamp <= existingTimestamp) {
      console.log(
        `Skipping out-of-order event ${event.id} (event: ${newTimestamp}, current: ${existingTimestamp})`
      );
      return;
    }
  }

  const updateData: Record<string, string> = {
    subscription_status_updated_at: eventTimestamp,
  };
  if (tier) updateData.subscription_tier = tier;
  if (status) updateData.subscription_status = status;

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating subscription status:', error);
    await supabase
      .from('webhook_events')
      .update({ processing_error: error.message })
      .eq('stripe_event_id', event.id);
  }
}

/**
 * customer.subscription.deleted — Set status to 'cancelled'.
 * subscription_tier is PRESERVED (data hidden, not deleted per CONTEXT.md).
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getAdminClient>,
  event: Stripe.Event
) {
  const subscription = event.data.object as Stripe.Subscription;

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  const eventTimestamp = new Date(event.created * 1000).toISOString();

  // Only update status — tier is preserved (data hidden, not deleted)
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'cancelled',
      subscription_status_updated_at: eventTimestamp,
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error handling subscription deletion:', error);
    await supabase
      .from('webhook_events')
      .update({ processing_error: error.message })
      .eq('stripe_event_id', event.id);
  }
}

/**
 * invoice.payment_failed — Log warning but do NOT change subscription_status.
 *
 * Stripe will fire customer.subscription.updated with status: 'past_due'
 * after its retry schedule runs out. We follow Stripe's recommended pattern:
 * wait for the subscription status change event, don't react to individual
 * invoice failures (RESEARCH.md Pitfall 5).
 */
async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) return;

  console.warn(
    `Payment failed for customer ${customerId}, invoice ${invoice.id}`
  );

  // Future Phase 30: Add platform admin dashboard alert here
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Map a Stripe Price ID to a subscription tier.
 * Price IDs are stored as comma-separated values in env vars (set during 25-01).
 * Each tier has 6 price IDs: GBP-mo, GBP-yr, EUR-mo, EUR-yr, USD-mo, USD-yr.
 */
function priceIdToTier(priceId: string | undefined): SubscriptionTier | null {
  if (!priceId) return null;

  const starterPrices = (process.env.STRIPE_PRICE_STARTER ?? '').split(',').map((s) => s.trim());
  const growthPrices = (process.env.STRIPE_PRICE_GROWTH ?? '').split(',').map((s) => s.trim());
  const enterprisePrices = (process.env.STRIPE_PRICE_ENTERPRISE ?? '').split(',').map((s) => s.trim());

  if (starterPrices.includes(priceId)) return 'starter';
  if (growthPrices.includes(priceId)) return 'growth';
  if (enterprisePrices.includes(priceId)) return 'enterprise';

  console.error(`Unknown price ID: ${priceId}`);
  return null;
}

/**
 * Normalize Stripe subscription status to database CHECK constraint values.
 *
 * Stripe: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | ...
 * Database: 'active' | 'past_due' | 'cancelled' (British spelling, migration 133)
 *
 * CRITICAL: Stripe sends 'canceled' (American, one L) but the CHECK constraint
 * uses 'cancelled' (British, two Ls). This function normalizes the spelling.
 */
function normalizeSubscriptionStatus(
  stripeStatus: string
): 'active' | 'past_due' | 'cancelled' | null {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled'; // US -> UK spelling normalization
    default:
      return null; // incomplete, trialing, etc. — don't update
  }
}
