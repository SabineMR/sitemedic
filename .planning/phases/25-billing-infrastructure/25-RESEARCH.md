# Phase 25: Billing Infrastructure - Research

**Researched:** 2026-02-18
**Domain:** Stripe Billing (Products, Prices, Webhooks), TypeScript feature gates, Next.js App Router webhook handling
**Confidence:** HIGH

---

## Summary

Phase 25 delivers three discrete pieces of billing plumbing: (1) Stripe Products and Prices created in the Stripe Dashboard for all three tiers across monthly/annual and GBP/EUR/USD, (2) a `feature-gates.ts` module with a type-safe `FEATURE_GATES` constant and `hasFeature()` helper, and (3) a billing webhook handler at `/api/stripe/billing-webhooks` that processes subscription lifecycle events and writes to the `organizations` table.

The existing codebase already has a fully working Stripe Connect webhook handler at `/api/stripe/webhooks/route.ts` that uses the exact pattern needed: `request.text()` for raw body, `stripe.webhooks.constructEvent()` for signature verification, and a switch statement for event type dispatch. The new billing webhook handler follows this identical pattern but uses a **separate signing secret** (`STRIPE_BILLING_WEBHOOK_SECRET`) and handles different event types (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`). The project uses `stripe@^20.3.1` (Node SDK v20) with API version `2026-01-28.clover`.

The webhook handler needs a `webhook_events` table for idempotency (dedup by Stripe event ID) and an audit trail. The service-role Supabase client pattern is already established in the codebase (`web/app/api/contracts/webhooks/route.ts` and `web/app/api/quotes/submit/route.ts`). The `organizations` table already has `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, and `subscription_status` columns from migration 133. The feature gates module is pure TypeScript with no external dependencies.

**Primary recommendation:** Clone the existing Connect webhook handler pattern exactly. Add a migration for `webhook_events` table. Create the feature gates as a `Record<SubscriptionTier, Set<FeatureKey>>` with `as const satisfies` for maximum type safety. Create Stripe Products and Prices via the Dashboard (not API) since there are only 18 prices total.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | `^20.3.1` | Server-side Stripe SDK | Already installed; provides `webhooks.constructEvent()`, TypeScript types for `Stripe.Event`, `Stripe.Checkout.Session`, `Stripe.Subscription` |
| `@supabase/supabase-js` | `^2.95.3` | Service-role DB client | Already installed; used for RLS-bypassing writes from webhook handler |
| `next` | `^15.2.3` | App Router route handlers | Already installed; `request.text()` gives raw body for webhook signature verification |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@stripe/stripe-js` | `^8.7.0` | Client-side Stripe.js | Already installed; not needed in this phase (no UI), used in Phase 29 for Checkout |

### No New Packages Required

All three plans in this phase use only existing infrastructure. No new npm/pnpm additions.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dashboard for Products/Prices | Stripe API script | Dashboard is simpler for 18 prices; API script adds complexity but enables reproducibility. For 18 prices, Dashboard wins. |
| `webhook_events` table for idempotency | In-memory cache / Redis | Database is the correct choice for durability. Webhook retries span days. |
| `as const satisfies` for feature gates | Runtime validation (Zod) | Compile-time type safety is sufficient; no user input to validate |

---

## Architecture Patterns

### Recommended Project Structure

```
web/
├── lib/
│   └── billing/
│       └── feature-gates.ts      # FEATURE_GATES constant + hasFeature() + types
├── app/
│   └── api/
│       └── stripe/
│           ├── webhooks/
│           │   └── route.ts       # EXISTING Connect webhook (DO NOT TOUCH)
│           └── billing-webhooks/
│               └── route.ts       # NEW billing webhook handler
supabase/
└── migrations/
    └── 135_webhook_events.sql     # NEW idempotency/audit table
```

### Pattern 1: Billing Webhook Handler (Clone of Connect Handler)

**What:** A Next.js App Router route handler that verifies Stripe webhook signatures and dispatches by event type.
**When to use:** For all Stripe billing lifecycle events.
**Source:** Adapted from existing `web/app/api/stripe/webhooks/route.ts`

```typescript
// web/app/api/stripe/billing-webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Service-role Supabase client (webhooks have no user auth)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text(); // RAW body, not parsed JSON
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
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

  // Log ALL events to webhook_events (audit trail)
  // Also serves as idempotency check
  const { error: insertError } = await supabase
    .from('webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event.data.object,
      created_at: new Date(event.created * 1000).toISOString(),
    });

  if (insertError) {
    // Duplicate event (unique constraint violation) — skip processing
    if (insertError.code === '23505') {
      console.log(`Duplicate billing webhook event ${event.id}, skipping`);
      return NextResponse.json({ received: true });
    }
    console.error('Error logging webhook event:', insertError);
  }

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
        await handlePaymentFailed(supabase, event);
        break;
      default:
        // Event logged but not handled — still valuable for audit trail
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling billing webhook:', error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
```

### Pattern 2: Service-Role Supabase Client in Webhook Handlers

**What:** Webhook handlers have no user auth session, so they use the service-role key to bypass RLS.
**Source:** Existing pattern in `web/app/api/contracts/webhooks/route.ts` and `web/app/api/quotes/submit/route.ts`

```typescript
// Established codebase pattern for service-role client in API routes
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

### Pattern 3: Feature Gates with Type-Safe Constant Map

**What:** A `FEATURE_GATES` constant that maps tiers to feature sets, with a `hasFeature()` helper.
**When to use:** Anywhere tier-gated access is checked (middleware, API routes, UI components).

```typescript
// web/lib/billing/feature-gates.ts

export const TIERS = ['starter', 'growth', 'enterprise'] as const;
export type SubscriptionTier = typeof TIERS[number];

export const FEATURES = [
  // Core (all tiers)
  'dashboard', 'treatment_logs', 'worker_registry', 'weekly_reports',
  'compliance', 'basic_analytics',
  // Growth+
  'white_label', 'subdomain', 'advanced_analytics',
  // Enterprise
  'custom_domain', 'api_access', 'priority_support',
] as const;
export type FeatureKey = typeof FEATURES[number];

export const FEATURE_GATES: Record<SubscriptionTier, ReadonlySet<FeatureKey>> = {
  starter: new Set([
    'dashboard', 'treatment_logs', 'worker_registry', 'weekly_reports',
    'compliance', 'basic_analytics',
  ]),
  growth: new Set([
    'dashboard', 'treatment_logs', 'worker_registry', 'weekly_reports',
    'compliance', 'basic_analytics',
    'white_label', 'subdomain', 'advanced_analytics',
  ]),
  enterprise: new Set([
    'dashboard', 'treatment_logs', 'worker_registry', 'weekly_reports',
    'compliance', 'basic_analytics',
    'white_label', 'subdomain', 'advanced_analytics',
    'custom_domain', 'api_access', 'priority_support',
  ]),
};

/**
 * Check if a subscription tier has access to a specific feature.
 * This is the SOLE source of truth for tier gating.
 *
 * @param tier - The org's subscription_tier from the organizations table
 * @param feature - The feature key to check
 * @returns true if the tier includes the feature
 */
export function hasFeature(tier: SubscriptionTier | null, feature: FeatureKey): boolean {
  // NULL tier (legacy org) defaults to 'starter' access
  const effectiveTier = tier ?? 'starter';
  return FEATURE_GATES[effectiveTier].has(feature);
}

/**
 * Get all features available for a tier.
 */
export function getTierFeatures(tier: SubscriptionTier): ReadonlySet<FeatureKey> {
  return FEATURE_GATES[tier];
}

/**
 * Check if a tier is at least a given minimum tier level.
 * Useful for "Growth or above" checks.
 */
export function isAtLeastTier(
  currentTier: SubscriptionTier | null,
  minimumTier: SubscriptionTier
): boolean {
  const tierOrder: Record<SubscriptionTier, number> = {
    starter: 0,
    growth: 1,
    enterprise: 2,
  };
  const current = tierOrder[currentTier ?? 'starter'];
  const minimum = tierOrder[minimumTier];
  return current >= minimum;
}
```

### Pattern 4: Webhook Events Idempotency Table

**What:** A `webhook_events` table that logs all Stripe billing events and prevents duplicate processing.
**Source:** Research pitfall analysis + Stripe best practices documentation.

```sql
-- Migration 135: webhook_events idempotency and audit table
CREATE TABLE webhook_events (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id   TEXT        NOT NULL UNIQUE,  -- Stripe event ID (evt_xxx)
  event_type        TEXT        NOT NULL,          -- e.g. 'checkout.session.completed'
  event_data        JSONB,                         -- Full event.data.object payload
  processing_error  TEXT,                          -- Error message if processing failed
  created_at        TIMESTAMPTZ NOT NULL,          -- Stripe event created timestamp
  processed_at      TIMESTAMPTZ DEFAULT NOW()      -- When we received/processed it
);

CREATE INDEX idx_webhook_events_type ON webhook_events (event_type);
CREATE INDEX idx_webhook_events_created ON webhook_events (created_at);

-- RLS: Only service-role can write (webhook handler uses service-role)
-- Platform admins can read for debugging
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view webhook events"
  ON webhook_events FOR SELECT
  USING (is_platform_admin());

-- Note: No INSERT/UPDATE/DELETE policies for authenticated users.
-- The webhook handler uses the service-role client which bypasses RLS.
```

### Pattern 5: Checkout Session Completed Handler

**What:** Extracts customer ID, subscription ID, and tier from `checkout.session.completed` event.
**Key insight:** The Checkout Session object has both `customer` (string) and `subscription` (string) fields populated after a successful subscription checkout.

```typescript
async function handleCheckoutComplete(
  supabase: ReturnType<typeof createClient>,
  event: Stripe.Event
) {
  const session = event.data.object as Stripe.Checkout.Session;

  // In subscription mode, session has customer and subscription IDs
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;
  const orgId = session.metadata?.org_id; // Set during Checkout Session creation (Phase 29)

  if (!customerId || !subscriptionId || !orgId) {
    console.error('checkout.session.completed missing required fields:', {
      customerId, subscriptionId, orgId,
    });
    return;
  }

  // Retrieve the subscription to get the price/tier info
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceIdToTier(priceId);

  // Write to organizations table
  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_tier: tier,
      subscription_status: 'active',
    })
    .eq('id', orgId);

  if (error) {
    console.error('Error updating org after checkout:', error);
  }
}
```

### Pattern 6: Price ID to Tier Mapping

**What:** Maps Stripe Price IDs (from env vars) to subscription tier values.

```typescript
/**
 * Map a Stripe Price ID to a subscription tier.
 * Price IDs are stored in env vars set during plan 25-01.
 * Each tier has multiple price IDs (monthly/annual x GBP/EUR/USD = 6 per tier).
 */
function priceIdToTier(priceId: string | undefined): 'starter' | 'growth' | 'enterprise' | null {
  if (!priceId) return null;

  // Parse comma-separated price IDs from env vars (monthly + annual + multi-currency)
  const starterPrices = (process.env.STRIPE_PRICE_STARTER ?? '').split(',');
  const growthPrices = (process.env.STRIPE_PRICE_GROWTH ?? '').split(',');
  const enterprisePrices = (process.env.STRIPE_PRICE_ENTERPRISE ?? '').split(',');

  if (starterPrices.includes(priceId)) return 'starter';
  if (growthPrices.includes(priceId)) return 'growth';
  if (enterprisePrices.includes(priceId)) return 'enterprise';

  console.error(`Unknown price ID: ${priceId}`);
  return null;
}
```

### Anti-Patterns to Avoid

- **Parsing `request.json()` instead of `request.text()`:** Breaks webhook signature verification. The `constructEvent()` method requires the raw body string, not parsed JSON.
- **Using `STRIPE_WEBHOOK_SECRET` for billing webhooks:** This is the Connect webhook secret. Billing webhooks have their own `STRIPE_BILLING_WEBHOOK_SECRET`. Using the wrong secret causes signature verification failure.
- **Storing tier in JWT claims:** The decision is explicit: "Tier never stored in JWT -- middleware reads `organizations.subscription_tier` on every request for immediate effect after webhook fires."
- **Duplicating feature gate logic in component code:** The `FEATURE_GATES` constant must be the SOLE source of truth. Components call `hasFeature()`, never inline tier checks.
- **Processing events without idempotency:** Stripe retries webhooks for up to 3 days. Without dedup, a `customer.subscription.deleted` event could be processed twice.
- **Using `request.json()` on the Connect webhook handler:** The existing handler already uses `request.text()`. Do not change the existing handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC check | `stripe.webhooks.constructEvent()` | Stripe SDK handles signature verification, timing-safe comparison, and payload parsing |
| Stripe API client | `fetch()` to Stripe REST | `stripe` npm package (already installed) | TypeScript types, automatic retries, error handling |
| Idempotency dedup | In-memory Set / Map | `webhook_events` table with UNIQUE constraint | Must survive server restarts; Stripe retries span days |
| Subscription status mapping | Custom status normalization | Read `subscription.status` directly from Stripe event | Stripe status values (`active`, `past_due`, `canceled`) map directly to our `subscription_status` CHECK constraint |
| Multi-currency price creation | API script | Stripe Dashboard | Only 18 prices; Dashboard has multi-currency UI built-in |
| Tier ordering / comparison | Custom number mapping | `isAtLeastTier()` helper in feature-gates.ts | Single source of truth for tier hierarchy |
| Service-role Supabase client | Custom auth bypass | `createClient(url, serviceRoleKey)` pattern | Established codebase pattern in 3+ existing webhook/API routes |

**Key insight:** The existing codebase already solves every infrastructure problem this phase needs. The billing webhook is structurally identical to the Connect webhook. The service-role client pattern is used in 3+ API routes. The only new domain-specific code is the feature gates module and the event-specific handler functions.

---

## Common Pitfalls

### Pitfall 1: Wrong Webhook Signing Secret

**What goes wrong:** Using `STRIPE_WEBHOOK_SECRET` (Connect) instead of `STRIPE_BILLING_WEBHOOK_SECRET` (Billing). All requests fail with "Invalid signature".
**Why it happens:** The env var names are similar. Stripe Dashboard creates a separate signing secret per registered endpoint.
**How to avoid:** Name the env var `STRIPE_BILLING_WEBHOOK_SECRET` distinctly. The existing handler uses `STRIPE_WEBHOOK_SECRET`. Code review must verify the billing handler uses the billing-specific secret.
**Warning signs:** All billing webhook deliveries fail in Stripe Dashboard with signature verification errors. The Connect webhooks work fine.

### Pitfall 2: `subscription_status` Value Mismatch (canceled vs cancelled)

**What goes wrong:** Stripe sends `status: 'canceled'` (American spelling, one L). The database CHECK constraint uses `'cancelled'` (British spelling, two Ls) per migration 133. The webhook handler writes the Stripe value directly and the INSERT fails.
**Why it happens:** The CHECK constraint was written with British spelling. Stripe uses American spelling.
**How to avoid:** The webhook handler MUST normalize Stripe's `'canceled'` to the database's `'cancelled'` before writing. Add a mapping function.
**Warning signs:** `subscription_status` UPDATE fails silently (Supabase returns error). Org stays on previous status forever.

### Pitfall 3: checkout.session.completed Missing org_id Metadata

**What goes wrong:** The handler expects `session.metadata.org_id` but Phase 29 (Checkout creation) has not been built yet. During testing, manually triggered events have no metadata.
**Why it happens:** The org_id is set when creating the Checkout Session (Phase 29). Phase 25 builds the handler before the creation code.
**How to avoid:** (1) Document that `org_id` must be in session metadata when Phase 29 creates sessions. (2) For Stripe CLI testing, include metadata in test events. (3) The handler logs a clear error when org_id is missing.
**Warning signs:** Test webhook fires arrive but no org row is updated. Console shows "missing required fields" error.

### Pitfall 4: Webhook Events Table Not Created

**What goes wrong:** The webhook handler tries to INSERT into `webhook_events` but the table does not exist. All webhook processing fails.
**Why it happens:** The migration for `webhook_events` was forgotten or not applied.
**How to avoid:** Plan 25-03 must include the migration as the first task, before the handler code.
**Warning signs:** 500 errors on all billing webhook deliveries. Supabase logs show "relation webhook_events does not exist".

### Pitfall 5: Stripe `past_due` vs Database `past_due`

**What goes wrong:** Stripe uses `past_due` (with underscore) which matches the database CHECK constraint. However, when invoice payment fails, Stripe may send `customer.subscription.updated` with `status: 'past_due'` only AFTER the configured retry schedule. The handler must not mark as `past_due` on the first `invoice.payment_failed` event.
**Why it happens:** Confusion between invoice-level payment failure and subscription-level status change.
**How to avoid:** For `invoice.payment_failed`, log the event but do NOT change `subscription_status`. Wait for `customer.subscription.updated` with `status: 'past_due'` to update the org. This follows Stripe's recommended pattern.
**Warning signs:** Org is marked `past_due` immediately on first failed retry (before grace period).

### Pitfall 6: Out-of-Order Webhook Events

**What goes wrong:** `customer.subscription.deleted` arrives before `customer.subscription.updated`. The handler processes events in arrival order, potentially overwriting a newer state with an older one.
**Why it happens:** Stripe does not guarantee event delivery order.
**How to avoid:** Use timestamp-based state transitions. Compare `event.created` (Unix timestamp) against a `status_updated_at` column on the organizations table. Only apply the update if the event timestamp is newer.
**Warning signs:** Org subscription_status flips back to `active` after being correctly set to `cancelled`.

### Pitfall 7: Annual Price Calculation Error

**What goes wrong:** Annual pricing is documented as "2 months free = 10 months price". For Starter at GBP 149/mo, annual should be 149 x 10 = GBP 1,490/year, not 149 x 12 = 1,788.
**Why it happens:** Developer multiplies by 12 instead of 10.
**How to avoid:** Document the formula clearly: `annual_price = monthly_price * 10`. Create a verification checklist for all 18 prices.
**Warning signs:** Pricing page shows annual savings inconsistent with "2 months free" promise.

### Pitfall 8: EUR/USD Price Points Not Rounded

**What goes wrong:** Using exact currency conversion from GBP produces ugly prices like EUR 173.42/mo instead of round numbers like EUR 179/mo.
**Why it happens:** Mechanical currency conversion without market rounding.
**How to avoid:** Set EUR and USD prices as round numbers that feel right for their market. Recommendation: slightly above GBP equivalent (GBP is often stronger), rounded to nearest 9 or 49.
**Warning signs:** Pricing page shows irrational numbers in non-GBP currencies.

---

## Code Examples

### checkout.session.completed Handler (Full)

```typescript
// Source: Stripe docs + existing codebase pattern
async function handleCheckoutComplete(
  supabase: ReturnType<typeof createClient>,
  event: Stripe.Event
) {
  const session = event.data.object as Stripe.Checkout.Session;

  const customerId = typeof session.customer === 'string'
    ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription : session.subscription?.id;
  const orgId = session.metadata?.org_id;

  if (!customerId || !subscriptionId || !orgId) {
    console.error('checkout.session.completed missing required fields:', {
      customerId, subscriptionId, orgId,
    });
    return;
  }

  // Retrieve subscription to determine tier from price ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceIdToTier(priceId);

  if (!tier) {
    console.error(`Unknown price ID ${priceId} for subscription ${subscriptionId}`);
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_tier: tier,
      subscription_status: 'active',
    })
    .eq('id', orgId);

  if (error) {
    console.error('Error updating org after checkout:', error);
    // Log processing error to webhook_events
    await supabase
      .from('webhook_events')
      .update({ processing_error: error.message })
      .eq('stripe_event_id', event.id);
  }
}
```

### customer.subscription.updated Handler

```typescript
// Source: Stripe docs — subscription status change + tier change
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createClient>,
  event: Stripe.Event
) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer : subscription.customer?.id;

  if (!customerId) return;

  // Determine new tier from current price
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceIdToTier(priceId);

  // Normalize Stripe's 'canceled' (US) to our 'cancelled' (UK) spelling
  const status = normalizeSubscriptionStatus(subscription.status);

  // Only update if this is a status/tier we track
  if (!status && !tier) return;

  const updateData: Record<string, string | null> = {};
  if (tier) updateData.subscription_tier = tier;
  if (status) updateData.subscription_status = status;

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

/**
 * Normalize Stripe subscription status to our database CHECK constraint values.
 * Stripe: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | ...
 * Database: 'active' | 'past_due' | 'cancelled' (British spelling)
 */
function normalizeSubscriptionStatus(
  stripeStatus: string
): 'active' | 'past_due' | 'cancelled' | null {
  switch (stripeStatus) {
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'canceled': return 'cancelled'; // US -> UK spelling
    default: return null; // incomplete, trialing, etc. — don't update
  }
}
```

### customer.subscription.deleted Handler

```typescript
// Source: Stripe docs — subscription cancelled/ended
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  event: Stripe.Event
) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer : subscription.customer?.id;

  if (!customerId) return;

  // Note: subscription_tier is preserved (data hidden, not deleted)
  // Only status changes to 'cancelled'
  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: 'cancelled' })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error handling subscription deletion:', error);
  }
}
```

### invoice.payment_failed Handler

```typescript
// Source: Stripe docs — invoice payment failure
// Note: Do NOT change subscription_status here.
// Wait for customer.subscription.updated with status: 'past_due'.
// Stripe manages the retry schedule and status transitions.
async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  event: Stripe.Event
) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer : invoice.customer?.id;

  if (!customerId) return;

  // Log for audit but do NOT change subscription_status.
  // Stripe will fire customer.subscription.updated when status actually changes.
  // The 7-day grace period is handled by Stripe's Smart Retries + dunning settings.
  console.warn(`Payment failed for customer ${customerId}, invoice ${invoice.id}`);

  // Future Phase 30: Add platform admin dashboard alert here
}
```

---

## Stripe Products and Prices Setup

### Product Structure (3 Products)

| Product Name | Dashboard Product |
|---|---|
| SiteMedic Starter | Product with 6 Prices (3 currencies x 2 intervals) |
| SiteMedic Growth | Product with 6 Prices (3 currencies x 2 intervals) |
| SiteMedic Enterprise | Product with 6 Prices (3 currencies x 2 intervals) |

### Price Matrix (18 Prices Total)

**Formula:** Annual = Monthly x 10 (2 months free)

| Tier | GBP/mo | GBP/yr | EUR/mo | EUR/yr | USD/mo | USD/yr |
|------|--------|--------|--------|--------|--------|--------|
| Starter | 149 | 1,490 | 179 | 1,790 | 189 | 1,890 |
| Growth | 299 | 2,990 | 349 | 3,490 | 379 | 3,790 |
| Enterprise | 599 | 5,990 | 699 | 6,990 | 749 | 7,490 |

**Rationale for EUR/USD pricing:**
- EUR prices: ~20% above GBP to account for exchange rate, rounded to nearest 9/49
- USD prices: ~27% above GBP (current GBP/USD ~1.27), rounded to nearest 9/49
- All prices are psychologically round numbers ending in 9

### Env Var Storage Pattern

Since each tier has 6 price IDs (3 currencies x 2 intervals), store as comma-separated:

```
STRIPE_PRICE_STARTER=price_starter_gbp_mo,price_starter_gbp_yr,price_starter_eur_mo,price_starter_eur_yr,price_starter_usd_mo,price_starter_usd_yr
STRIPE_PRICE_GROWTH=price_growth_gbp_mo,price_growth_gbp_yr,...
STRIPE_PRICE_ENTERPRISE=price_enterprise_gbp_mo,price_enterprise_gbp_yr,...
```

### VAT Configuration

**Recommendation:** VAT-exclusive pricing with Stripe Tax.

- Set `tax_behavior: 'exclusive'` on all 18 Prices
- Tax code: `txcd_10103001` (SaaS - electronic services, software as a service)
- UK B2B: 20% VAT added at checkout. Business customers reclaim via VAT return.
- EU B2B: Reverse charge applies (0% VAT) when customer provides valid VAT ID
- Stripe Tax handles this automatically when enabled in Dashboard settings

**Setup steps:**
1. Enable Stripe Tax in Dashboard > Settings > Tax
2. Add UK tax registration (VAT number)
3. Set all Prices to `tax_behavior: exclusive`
4. Assign tax code `txcd_10103001` to all Products

### Stripe Dashboard Webhook Registration

Register two separate webhook endpoints:

| Endpoint | URL | Secret Env Var | Events |
|----------|-----|----------------|--------|
| Connect (existing) | `/api/stripe/webhooks` | `STRIPE_WEBHOOK_SECRET` | `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated` |
| Billing (new) | `/api/stripe/billing-webhooks` | `STRIPE_BILLING_WEBHOOK_SECRET` | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` |

**Key:** Register the billing endpoint in the Stripe Dashboard **before** any org completes Checkout. The `customer.subscription.created` event should be listened to for completeness (audit trail) even though the handler may only log it.

---

## Proration and Upgrade/Downgrade Mechanics

### Mid-Year Annual Upgrade

**Recommendation:** Use `proration_behavior: 'always_invoice'` for upgrades.

When an org on Starter Annual wants to upgrade to Growth Annual mid-cycle:
1. Stripe calculates credit for unused portion of Starter Annual
2. Stripe charges for remaining time at Growth Annual rate
3. Net charge is invoiced immediately
4. Billing date resets to upgrade date (new annual cycle starts from upgrade)

This is the simplest and most transparent approach. The customer sees exactly what they are paying and why.

**Node.js code for Phase 29/30 (not this phase, but informing the plan):**
```typescript
await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscriptionItemId,
    price: newPriceId,
  }],
  proration_behavior: 'always_invoice',
});
```

### Downgrades

**Recommendation:** Schedule downgrade for end of billing period.

When an org on Growth wants to downgrade to Starter:
1. Use `cancel_at_period_end: false` on the current subscription
2. Create a subscription schedule that switches to the new price at period end
3. Or simpler: update the subscription with the new price but set `proration_behavior: 'none'` to delay the change

**Simpler approach:** Update the subscription item to the new (lower) price with `proration_behavior: 'none'`. The customer keeps the current plan until renewal, then is billed at the lower rate. The `customer.subscription.updated` webhook fires with the new price, so the handler updates the tier. Feature gating takes effect when the tier changes.

**Decision for Phase 25:** The webhook handler must handle tier changes from `customer.subscription.updated` regardless of the upgrade/downgrade mechanism. The specific proration_behavior is a Phase 29/30 concern.

---

## Feature Gate Tier Matrix (Recommended)

Based on the CONTEXT.md guidelines and the codebase's feature set:

### Starter (GBP 149/mo)
Core platform value:
- Dashboard access
- Treatment/incident logs
- Worker registry
- Weekly PDF reports
- Compliance score tracking
- Basic analytics (compliance score chart, treatment counts)

### Growth (GBP 299/mo)
Everything in Starter plus:
- White-label branding (logo, primary colour, company name across portal/PDFs/emails)
- Subdomain routing (`slug.sitemedic.co.uk`)
- Advanced analytics (heat maps, trend charts, compliance trends over time)

### Enterprise (GBP 599/mo)
Everything in Growth plus:
- Custom domain support (future)
- API access (future)
- Priority support

### Feature Key List

```typescript
// Full feature key enumeration
type FeatureKey =
  | 'dashboard'           // All tiers
  | 'treatment_logs'      // All tiers
  | 'worker_registry'     // All tiers
  | 'weekly_reports'      // All tiers
  | 'compliance'          // All tiers
  | 'basic_analytics'     // All tiers
  | 'white_label'         // Growth+
  | 'subdomain'           // Growth+
  | 'advanced_analytics'  // Growth+
  | 'custom_domain'       // Enterprise
  | 'api_access'          // Enterprise
  | 'priority_support';   // Enterprise
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single webhook endpoint for all Stripe events | Separate endpoints per Stripe product (Connect vs Billing) | Best practice 2024+ | Prevents signing secret cross-contamination |
| `event.type === 'xxx'` without idempotency | Insert-before-process with UNIQUE constraint on event ID | Stripe recommendation since 2023 | Prevents duplicate processing across retries |
| Store tier in JWT claims | Read tier from DB on every request | Project decision (STATE.md) | Immediate effect after webhook fires |
| Single-currency pricing | Multi-currency Prices on single Price object | Stripe 2024 multi-currency support | One Price can serve GBP/EUR/USD |
| `request.body` parsed JSON in webhook | `request.text()` raw body | Next.js App Router standard | Required for `constructEvent()` signature verification |

**Deprecated/outdated:**
- Stripe "Plans" API: Replaced by "Prices" API. Do not use `stripe.plans.*`.
- `express.raw()` middleware: Not applicable in Next.js App Router. Use `request.text()`.
- Stripe Checkout `success_url` / `cancel_url` with hardcoded domains: Build dynamically from request origin.

---

## Open Questions

1. **Multi-currency Price: single object or separate?**
   - What we know: Stripe supports multi-currency on a single Price object. However, the env var pattern suggests storing one Price ID per tier.
   - What's unclear: Whether to use Stripe's multi-currency Price feature (one Price ID per tier, currency determined at checkout) or separate Price objects per currency (18 total).
   - Recommendation: Use separate Price objects per currency and interval for maximum control over price points. Store as comma-separated in env vars. The multi-currency single-Price feature is elegant but makes it harder to set independent price points per market.

2. **`status_updated_at` column on organizations**
   - What we know: Timestamp-based state transitions need a "last updated" column. Migration 133 does not include one.
   - What's unclear: Whether to add this column in a new migration (135 or 136) or handle it differently.
   - Recommendation: Add a `subscription_status_updated_at TIMESTAMPTZ` column to organizations in the `webhook_events` migration. The webhook handler compares `event.created` against this timestamp before applying state changes.

3. **`invoice.paid` event handling**
   - What we know: Stripe recommends listening to `invoice.paid` for recurring payments. The current plan only handles `checkout.session.completed` for initial activation.
   - What's unclear: Whether `invoice.paid` needs handler logic beyond logging.
   - Recommendation: Register `invoice.paid` in the webhook endpoint. For Phase 25, log it in `webhook_events` only. In Phase 30, use it to confirm renewal and reset any grace period flags.

4. **Grace period implementation**
   - What we know: CONTEXT.md specifies "7-day grace period on payment failure."
   - What's unclear: Whether this is handled by Stripe's Smart Retries configuration (Dashboard setting) or custom logic.
   - Recommendation: Configure Stripe Dashboard: Settings > Billing > Subscriptions > Smart Retries to retry for ~7 days. When all retries fail, Stripe will fire `customer.subscription.updated` with `status: 'past_due'` or `canceled`. This means the grace period is managed by Stripe, not custom code.

---

## Sources

### Primary (HIGH confidence)

- **Codebase:** `web/app/api/stripe/webhooks/route.ts` -- existing Connect webhook handler pattern (raw body, constructEvent, switch dispatch)
- **Codebase:** `web/app/api/contracts/webhooks/route.ts` -- service-role Supabase client pattern for webhook handlers
- **Codebase:** `web/app/api/quotes/submit/route.ts` -- service-role Supabase client pattern with error handling
- **Codebase:** `web/lib/stripe/server.ts` -- Stripe SDK initialization (`stripe@^20.3.1`, API version `2026-01-28.clover`)
- **Codebase:** `supabase/migrations/133_subscription_columns.sql` -- organizations table columns (confirmed schema)
- **Codebase:** `web/lib/supabase/middleware.ts` -- middleware reads `subscription_tier` from organizations
- **Stripe Docs:** [Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks) -- recommended events, state management best practices
- **Stripe Docs:** [How subscriptions work](https://docs.stripe.com/billing/subscriptions/overview) -- lifecycle states, payment failure handling
- **Stripe Docs:** [Webhook signature verification](https://docs.stripe.com/webhooks/signature) -- constructEvent requirements
- **Stripe Docs:** [Products and Prices](https://docs.stripe.com/products-prices/how-products-and-prices-work) -- multi-currency, recurring intervals
- **Stripe Docs:** [Prorations](https://docs.stripe.com/billing/subscriptions/prorations) -- proration_behavior options
- **Stripe Docs:** [Tax products/prices](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior) -- tax_behavior exclusive/inclusive, tax codes

### Secondary (MEDIUM confidence)

- **Stripe Docs:** [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object) -- confirmed `subscription` and `customer` fields exist
- **Stripe Docs:** [Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries) -- AI-powered retry scheduling
- **Stripe Docs:** [Subscription object](https://docs.stripe.com/api/subscriptions/object) -- status values, items.data[0].price.id structure
- **WebSearch:** [Hookdeck idempotency guide](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) -- webhook_events table design pattern

### Tertiary (LOW confidence)

- EUR/USD price points: Based on approximate exchange rates as of 2026-02-18. Actual prices should be confirmed with the business owner.
- Stripe Tax code `txcd_10103001` for SaaS: Verified via search but should be confirmed in Stripe Dashboard when setting up products.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions confirmed in package.json
- Architecture (webhook handler): HIGH -- direct clone of existing codebase pattern
- Architecture (feature gates): HIGH -- pure TypeScript, well-understood pattern
- Pitfalls (signing secret separation): HIGH -- documented requirement, verified in codebase
- Pitfalls (canceled/cancelled spelling): HIGH -- confirmed in migration 133 CHECK constraint
- Price matrix: MEDIUM -- GBP prices locked by context, EUR/USD are recommendations
- VAT handling: MEDIUM -- standard UK B2B SaaS approach, needs Dashboard verification
- Proration mechanics: MEDIUM -- Stripe docs verified, but Phase 29/30 concern not Phase 25

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (Stripe API stable; billing patterns unlikely to change in 30 days)
