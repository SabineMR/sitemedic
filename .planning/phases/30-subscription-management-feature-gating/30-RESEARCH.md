# Phase 30: Subscription Management & Feature Gating - Research

**Researched:** 2026-02-18
**Domain:** Stripe billing integration, feature gating, subscription lifecycle, Next.js middleware
**Confidence:** HIGH

## Summary

Phase 30 builds the enforcement layer on top of the billing infrastructure (Phase 25) and onboarding flow (Phase 29). The FEATURE_GATES constant and hasFeature() helper already exist in `web/lib/billing/feature-gates.ts` with 12 features across 3 tiers. The organizations table already has `subscription_tier`, `subscription_status`, `stripe_customer_id`, and `stripe_subscription_id` columns. The billing webhook handler already processes subscription lifecycle events and writes state back to the database.

What Phase 30 adds is the **enforcement and UX layer**: a `<TierGate>` React component for UI-level gating, a `requireTier()` API helper for server-side gating, Stripe Customer Portal integration for self-service billing management, a platform admin MRR dashboard, and a suspension flow for cancelled/lapsed subscriptions. All of these build on existing patterns in the codebase and require no new database migrations.

**Primary recommendation:** Build thin wrappers around the existing `hasFeature()` and `isAtLeastTier()` helpers -- `<TierGate>` for UI, `requireTier()` for API routes. The Stripe Customer Portal is a single API call (`stripe.billingPortal.sessions.create`). MRR can be calculated from the local database (no Stripe API calls needed). Suspension check goes into the existing middleware between the onboarding check and the response.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | current | Stripe SDK (already at `@/lib/stripe/server.ts`) | Already initialised with `apiVersion: '2026-01-28.clover'` |
| @supabase/ssr | current | Server-side Supabase client | Used by middleware for session management |
| next | current | Middleware, API routes, App Router | Existing framework |
| lucide-react | current | Icon library | Used throughout all existing pages |

### Supporting (No New Libraries Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | current | Toast notifications | Already used in admin settings for save confirmations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local DB MRR calculation | Stripe Billing Analytics API | Stripe API adds latency + rate limits; local DB already has all needed data |
| Custom billing settings page | Stripe embedded pricing table | Customer Portal handles all billing management; no need for custom UI |

**Installation:**
No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Existing Feature Gates Map (Source of Truth)

From `web/lib/billing/feature-gates.ts`:

```
Starter (6 features): dashboard, treatment_logs, worker_registry, weekly_reports, compliance, basic_analytics
Growth (9 features):   Starter + white_label, subdomain, advanced_analytics
Enterprise (12):       Growth + custom_domain, api_access, priority_support
```

### Recommended Project Structure

```
web/
├── lib/
│   └── billing/
│       ├── feature-gates.ts          # EXISTING - hasFeature(), isAtLeastTier(), FEATURE_GATES
│       └── require-tier.ts           # NEW - Server-side API route gating helper
├── components/
│   └── billing/
│       ├── tier-gate.tsx             # NEW - UI component for feature gating
│       └── upgrade-prompt.tsx        # NEW - Contextual upgrade CTA
├── app/
│   ├── admin/
│   │   └── settings/
│   │       └── page.tsx              # MODIFY - Add "Manage Billing" button (Customer Portal)
│   ├── platform/
│   │   └── subscriptions/
│   │       └── page.tsx              # NEW - MRR dashboard for platform admin
│   ├── suspended/
│   │   └── page.tsx                  # NEW - Suspension screen
│   └── api/
│       └── billing/
│           └── portal/
│               └── route.ts          # NEW - Create Stripe Customer Portal session
└── lib/
    └── supabase/
        └── middleware.ts             # MODIFY - Add suspension check
```

### Pattern 1: TierGate Component (UI-Level Gating)

**What:** Wrapper component that conditionally renders children or an upgrade prompt based on org tier.
**When to use:** Wrap any Growth-gated or Enterprise-gated UI section.

```typescript
// web/components/billing/tier-gate.tsx
'use client';

import { hasFeature, type FeatureKey, type SubscriptionTier } from '@/lib/billing/feature-gates';
import { UpgradePrompt } from './upgrade-prompt';

interface TierGateProps {
  feature: FeatureKey;
  tier: SubscriptionTier | null;
  children: React.ReactNode;
  /** Optional: override the default upgrade message */
  upgradeMessage?: string;
}

export function TierGate({ feature, tier, children, upgradeMessage }: TierGateProps) {
  if (hasFeature(tier, feature)) {
    return <>{children}</>;
  }

  return <UpgradePrompt feature={feature} currentTier={tier} message={upgradeMessage} />;
}
```

### Pattern 2: requireTier() API Helper (Server-Side Gating)

**What:** Server-side helper that checks org tier and returns 403 if insufficient.
**When to use:** In every API route that serves Growth/Enterprise-only data.

```typescript
// web/lib/billing/require-tier.ts
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { hasFeature, type FeatureKey, type SubscriptionTier } from './feature-gates';

/**
 * Verify the current org has access to a feature.
 * Throws with a structured error if tier is insufficient.
 *
 * @param feature - The feature key to check
 * @returns The org's current tier (for downstream use)
 * @throws Error with message 'TIER_INSUFFICIENT' if access denied
 */
export async function requireTier(feature: FeatureKey): Promise<SubscriptionTier> {
  const orgId = await requireOrgId();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', orgId)
    .single();

  const tier: SubscriptionTier = (org?.subscription_tier as SubscriptionTier) ?? 'starter';

  if (!hasFeature(tier, feature)) {
    throw new Error('TIER_INSUFFICIENT');
  }

  return tier;
}
```

Usage in API routes:

```typescript
// In an API route handler
try {
  await requireTier('white_label');
  // ... rest of handler
} catch (err) {
  if (err instanceof Error && err.message === 'TIER_INSUFFICIENT') {
    return NextResponse.json(
      { error: 'This feature requires a higher subscription tier' },
      { status: 403 }
    );
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Pattern 3: Stripe Customer Portal Session

**What:** Single API call to create a short-lived URL that redirects to Stripe-hosted billing management.
**When to use:** When org admin clicks "Manage Billing" in settings.

```typescript
// web/app/api/billing/portal/route.ts
import { stripe } from '@/lib/stripe/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const orgId = await requireOrgId();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found' },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${request.headers.get('origin')}/admin/settings`,
  });

  return NextResponse.json({ url: session.url });
}
```

### Pattern 4: Suspension Check in Middleware

**What:** Check subscription_status in middleware and redirect to /suspended.
**When to use:** After the onboarding check, before returning the response.
**Where:** Inside `updateSession()` in `web/lib/supabase/middleware.ts`.

The suspension check must:
1. Only run for authenticated users with an org_id
2. Only run for dashboard routes (/admin, /medic, /dashboard) -- not public routes, not /suspended itself
3. Check `subscription_status === 'cancelled'` (the only status that triggers suspension)
4. NULL subscription_status = treat as active (legacy orgs)
5. `past_due` = still allowed in (Stripe handles dunning)

```typescript
// Inside the existing middleware, AFTER the onboarding check block:
if (user && orgId && (isDashboardRoute || isOnboardingRoute)) {
  // Already have orgStatus from the onboarding query above
  // Add subscription_status to the SELECT query
  const subscriptionStatus = orgStatus?.subscription_status;

  // Only 'cancelled' triggers suspension (NULL passes, 'past_due' passes)
  if (subscriptionStatus === 'cancelled') {
    const isSuspendedRoute = request.nextUrl.pathname.startsWith('/suspended');
    if (!isSuspendedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/suspended';
      return NextResponse.redirect(url);
    }
  }
}
```

### Anti-Patterns to Avoid

- **Storing tier in JWT/cookie:** Tier must be read from DB on every request so webhook updates take effect immediately. The prior decisions explicitly state "Tier never stored in JWT."
- **Gating only at UI layer:** Every UI gate MUST have a corresponding API gate. A determined user could call the API directly.
- **Treating `past_due` as suspended:** Stripe handles payment retries. Users should still have access during the dunning period. Only `cancelled` triggers suspension.
- **Changing subscription_status on invoice.payment_failed:** The webhook handler correctly ignores this event for status changes (waits for `customer.subscription.updated` with `past_due`).
- **Building custom billing management UI:** Stripe Customer Portal handles plan changes, payment method updates, invoice history, and cancellation. Do not hand-roll any of this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Billing management UI | Custom payment method form, plan change UI, invoice viewer | Stripe Customer Portal (`billingPortal.sessions.create`) | Stripe handles PCI compliance, dunning, proration, tax, cancellation flows |
| Feature gate logic | Per-component tier checks with inline tier comparisons | `hasFeature()` from `feature-gates.ts` | Single source of truth, type-safe, dev-mode invariant checks |
| Subscription status normalization | Manual string comparison in each handler | `normalizeSubscriptionStatus()` already in billing-webhooks | Handles Stripe US spelling ('canceled') vs DB UK spelling ('cancelled') |
| MRR calculation via Stripe API | Live Stripe API calls to list all subscriptions | Local DB query on organizations table with price mapping | Faster, no rate limits, no API key exposure in client |

**Key insight:** The Stripe Customer Portal eliminates 80% of what would otherwise be a complex billing management feature. One API call creates a session URL; Stripe handles everything else including webhooks back to the existing handler.

## Common Pitfalls

### Pitfall 1: Gating at UI Only, Not API
**What goes wrong:** Starter org admin inspects network requests, calls Growth-gated API endpoint directly, gets data they shouldn't see.
**Why it happens:** Developers add `<TierGate>` to the page but forget the API route.
**How to avoid:** Every page that uses `<TierGate>` must have its corresponding API route(s) use `requireTier()`. Create a checklist mapping pages to API routes.
**Warning signs:** API route returns 200 without calling `requireTier()`.

### Pitfall 2: Middleware Query Bloat
**What goes wrong:** Adding a separate DB query for subscription_status in middleware when the onboarding check already queries organizations.
**Why it happens:** Developers add code without reading existing middleware.
**How to avoid:** Extend the EXISTING organizations query in the onboarding block to also SELECT `subscription_status`. One query, two checks.
**Warning signs:** Two separate `supabase.from('organizations')` calls in middleware for the same org.

### Pitfall 3: Suspending Legacy Orgs
**What goes wrong:** Legacy orgs with NULL subscription_status get redirected to /suspended.
**Why it happens:** Checking `subscription_status !== 'active'` instead of `subscription_status === 'cancelled'`.
**How to avoid:** Per prior decisions: "Gate on subscription_status !== 'cancelled' (not === 'active') so NULL passes correctly for legacy orgs."
**Warning signs:** Existing test orgs suddenly seeing suspension screen after deployment.

### Pitfall 4: Customer Portal Without stripe_customer_id
**What goes wrong:** Clicking "Manage Billing" crashes for legacy orgs with no Stripe customer.
**Why it happens:** Not checking for `stripe_customer_id` before calling Stripe API.
**How to avoid:** Check for `stripe_customer_id` in the portal API route. If NULL, return a friendly message ("No billing account. Contact support.").
**Warning signs:** Unhandled Stripe API error for `null` customer parameter.

### Pitfall 5: MRR Dashboard Making Live Stripe API Calls
**What goes wrong:** Platform admin MRR dashboard is slow, hits Stripe rate limits, costs money.
**Why it happens:** Fetching subscription details from Stripe API instead of local DB.
**How to avoid:** All subscription data is already in the organizations table (tier, status, stripe_subscription_id). Map tiers to known prices locally. Calculate MRR as: count_per_tier * price_per_tier.
**Warning signs:** `stripe.subscriptions.list()` calls in the dashboard page/API.

### Pitfall 6: Forgetting to Add /suspended to Public Routes
**What goes wrong:** Suspended org admin gets redirect loop (/suspended -> /login -> /suspended).
**Why it happens:** /suspended is not in the publicRoutes array, so middleware redirects unauthenticated users to /login.
**How to avoid:** The /suspended page needs the user to be AUTHENTICATED (to show their org info) but should NOT be gated by subscription status. Solution: add specific handling in the middleware suspension check to allow /suspended through, similar to how /onboarding is handled.
**Warning signs:** Infinite redirect loop for cancelled org admins.

## Code Examples

### Example 1: Complete TierGate + UpgradePrompt Pattern

```typescript
// web/components/billing/upgrade-prompt.tsx
'use client';

import { type FeatureKey, type SubscriptionTier, TIERS } from '@/lib/billing/feature-gates';
import { Sparkles, ArrowRight } from 'lucide-react';

// Feature display names for human-readable upgrade messages
const FEATURE_DISPLAY_NAMES: Record<FeatureKey, string> = {
  dashboard: 'Dashboard',
  treatment_logs: 'Treatment Logs',
  worker_registry: 'Worker Registry',
  weekly_reports: 'Weekly Reports',
  compliance: 'Compliance Tracking',
  basic_analytics: 'Basic Analytics',
  white_label: 'White-Label Branding',
  subdomain: 'Custom Subdomain',
  advanced_analytics: 'Advanced Analytics',
  custom_domain: 'Custom Domain',
  api_access: 'API Access',
  priority_support: 'Priority Support',
};

// Which tier unlocks each Growth+ feature
const FEATURE_REQUIRED_TIER: Partial<Record<FeatureKey, SubscriptionTier>> = {
  white_label: 'growth',
  subdomain: 'growth',
  advanced_analytics: 'growth',
  custom_domain: 'enterprise',
  api_access: 'enterprise',
  priority_support: 'enterprise',
};

interface UpgradePromptProps {
  feature: FeatureKey;
  currentTier: SubscriptionTier | null;
  message?: string;
}

export function UpgradePrompt({ feature, currentTier, message }: UpgradePromptProps) {
  const requiredTier = FEATURE_REQUIRED_TIER[feature] ?? 'growth';
  const featureName = FEATURE_DISPLAY_NAMES[feature];
  const tierDisplayName = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-2xl p-8 text-center">
      <div className="w-14 h-14 bg-blue-600/20 border border-blue-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {featureName} is a {tierDisplayName} Feature
      </h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">
        {message ??
          `Upgrade to the ${tierDisplayName} plan to unlock ${featureName.toLowerCase()} and more.`}
      </p>
      <a
        href="/admin/settings#billing"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-medium transition-all hover:scale-105"
      >
        Upgrade to {tierDisplayName}
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
```

### Example 2: Stripe Customer Portal API Route

```typescript
// web/app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const supabase = await createClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please contact support.' },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:30500';

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/admin/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Example 3: MRR Calculation from Local Database

```typescript
// MRR is calculated from local DB, not Stripe API
// Prices are known constants (from signup page):
//   Starter: 149/mo, Growth: 299/mo, Enterprise: 599/mo

const TIER_MONTHLY_PRICE: Record<string, number> = {
  starter: 149,
  growth: 299,
  enterprise: 599,
};

// Query: count active subscriptions per tier
// SELECT subscription_tier, count(*) as org_count
// FROM organizations
// WHERE subscription_status IN ('active', 'past_due')
//   OR subscription_status IS NULL  -- legacy orgs
// GROUP BY subscription_tier

// MRR = SUM(org_count_per_tier * price_per_tier)
```

### Example 4: Suspension Page Pattern

```typescript
// web/app/suspended/page.tsx
// This page shows when subscription_status === 'cancelled'
// Must show: org name, what happened, how to reactivate

// Reactivation path:
// 1. Click "Reactivate Subscription" button
// 2. POST /api/billing/portal -> redirects to Stripe Customer Portal
// 3. Customer updates payment method / resubscribes in Stripe
// 4. Webhook fires: customer.subscription.updated -> status: 'active'
// 5. Middleware no longer redirects to /suspended
```

## Inventory: Pages/Routes Requiring TierGate

### Growth-Gated Pages (white_label, subdomain, advanced_analytics)

| Page | Route | Feature Key | Gate Type |
|------|-------|-------------|-----------|
| Branding section in Settings | `/admin/settings` | `white_label` | TierGate around branding section |
| Advanced Analytics | `/admin/analytics` | `advanced_analytics` | TierGate wrapping entire page content |

Note: `subdomain` is implicitly gated by the activation flow (Phase 29) -- Growth/Enterprise orgs get slugs, Starter orgs do not. No additional page-level gate needed for subdomain itself.

### Enterprise-Gated Pages (custom_domain, api_access, priority_support)

| Page | Route | Feature Key | Gate Type |
|------|-------|-------------|-----------|
| API Access (future) | Not yet built | `api_access` | Future phase |
| Custom Domain (future) | Not yet built | `custom_domain` | Future phase |

### Starter Pages (No Gate Needed -- All Tiers)

All other admin pages (dashboard, bookings, medics, timesheets, etc.) are accessible to all tiers.

## Inventory: API Routes Requiring requireTier()

| API Route | Feature Key | Rationale |
|-----------|-------------|-----------|
| `PUT /api/admin/branding` | `white_label` | Starter orgs should not be able to save branding changes |
| `GET /api/admin/branding` | `white_label` | Consistent with PUT gate |
| Advanced analytics endpoints (future) | `advanced_analytics` | When analytics API routes are built |

Note: Most existing admin API routes (settings, bookings, medics) serve Starter-tier features and do NOT need tier gating. Only the Growth+ and Enterprise+ features need `requireTier()`.

## Middleware Modification Plan

### Current Middleware Flow (in order)

1. Strip x-org-* headers (security)
2. Subdomain resolution -> inject org headers
3. Create Supabase client + refresh session
4. Auth check -> redirect to /login if unauthenticated + not public route
5. Redirect authenticated users away from /login, /signup
6. Check org_id -> redirect to /setup/organization if missing
7. Onboarding check -> redirect to /onboarding if not completed
8. Return response

### Proposed Addition: Suspension Check (Step 7.5)

Insert AFTER step 7 (onboarding check) and BEFORE step 8 (return response):

```
7.5. Suspension check:
     IF user is authenticated AND has orgId AND route is dashboard/admin/medic
     AND subscription_status === 'cancelled'
     AND NOT on /suspended route
     THEN redirect to /suspended
```

**Critical optimization:** The onboarding check at step 7 already queries `organizations.onboarding_completed`. Extend this query to also SELECT `subscription_status` to avoid a second DB query. This means the suspension check uses data from the same query as the onboarding check.

### Modified Query

```sql
-- Current: SELECT onboarding_completed FROM organizations WHERE id = $orgId
-- Proposed: SELECT onboarding_completed, subscription_status FROM organizations WHERE id = $orgId
```

## MRR Dashboard Approach

### Data Source

All MRR data comes from the local `organizations` table. No Stripe API calls needed.

### Metrics to Show

| Metric | Calculation | Source |
|--------|-------------|--------|
| Total MRR | SUM of (count_per_tier * price_per_tier) for active orgs | organizations table |
| Starter MRR | COUNT(tier='starter' AND status in ('active', NULL)) * 149 | organizations table |
| Growth MRR | COUNT(tier='growth' AND status in ('active', NULL)) * 299 | organizations table |
| Enterprise MRR | COUNT(tier='enterprise' AND status in ('active', NULL)) * 599 | organizations table |
| Total Active Orgs | COUNT where status not 'cancelled' | organizations table |
| Churn (cancelled) | COUNT where status = 'cancelled' | organizations table |
| At Risk (past_due) | COUNT where status = 'past_due' | organizations table |

### Known Prices (from signup page)

```
Starter:    GBP 149/mo
Growth:     GBP 299/mo
Enterprise: GBP 599/mo
```

### Navigation Integration

Add "Subscriptions" to the platform admin sidebar in `web/app/platform/layout.tsx` (between "Organizations" and "Revenue").

## Suspension UX Pattern

### When Suspension Triggers

Subscription status becomes `cancelled` via:
1. `customer.subscription.deleted` webhook (Stripe fires this after cancellation period ends)
2. `customer.subscription.updated` with status `canceled` -> normalized to `cancelled`

### What the Suspended Page Must Show

1. Clear heading: "Subscription Inactive"
2. Organisation name (from org context)
3. Reason: "Your subscription has been cancelled" or "Payment failed and subscription was cancelled"
4. Data preservation message: "Your data is safe and will be preserved"
5. Reactivation CTA: Button that calls POST /api/billing/portal -> redirects to Stripe Customer Portal
6. Alternative: "Contact support at support@sitemedic.co.uk"

### What Suspended Orgs CAN Still Do

- View the /suspended page
- Click reactivation link (goes to Stripe Customer Portal)
- Log out

### What Suspended Orgs CANNOT Do

- Access /admin/* pages
- Access /medic/* pages
- Access /dashboard/* pages
- Call any admin API routes (these still require auth, and the middleware redirects)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual billing via email/invoice | Stripe Checkout + webhooks | Phase 25/29 (Feb 2026) | Automated subscription lifecycle |
| No tier gating | FEATURE_GATES map + hasFeature() | Phase 25 (Feb 2026) | Compile-time type safety for gates |
| Tier stored in JWT | Tier read from DB per request | Phase 25 decision | Immediate effect on webhook updates |
| Custom billing pages | Stripe Customer Portal | Phase 30 (this phase) | Eliminates PCI scope, handles dunning |

**Deprecated/outdated:**
- The billing section in admin settings currently says "To upgrade or manage billing, contact support" -- this will be replaced with the Customer Portal button.

## Open Questions

1. **Portal Configuration in Stripe Dashboard**
   - What's needed: Before Customer Portal works, someone must configure it in the Stripe Dashboard (enable/disable features like cancellation, plan switching, payment method updates).
   - What's unclear: Whether Sabine has already configured this in Stripe Dashboard.
   - Recommendation: Document as a prerequisite task. The API will work without configuration but will show default portal features.

2. **Branding Section Visibility for Starter Orgs**
   - What we know: The branding section exists in admin settings page today. Per GATE-02, white_label is Growth+.
   - What's unclear: Should the entire branding section be hidden for Starter, or should it show as read-only with an upgrade prompt?
   - Recommendation: Show the section with a `<TierGate feature="white_label">` wrapper. Starter sees upgrade prompt; Growth+ sees the full editor. This provides contextual upgrade motivation (GATE-04).

3. **Annual vs Monthly MRR**
   - What we know: Signup page shows monthly prices. Stripe env vars have 6 price IDs per tier (GBP-mo, GBP-yr, EUR-mo, EUR-yr, USD-mo, USD-yr).
   - What's unclear: Whether annual subscriptions should contribute MRR as (annual_price / 12) or at the full annual rate.
   - Recommendation: For MVP, use monthly prices only since all current signups are monthly. Note: the organizations table does not store billing interval -- only tier. If annual pricing becomes significant, this needs revisiting.

## Sources

### Primary (HIGH confidence)
- `web/lib/billing/feature-gates.ts` -- FEATURE_GATES map, hasFeature(), isAtLeastTier(), TIERS
- `web/lib/supabase/middleware.ts` -- Current middleware flow with onboarding routing
- `web/app/api/stripe/billing-webhooks/route.ts` -- Webhook handler patterns
- `web/app/api/billing/checkout/route.ts` -- Org provisioning + Stripe integration pattern
- `web/app/admin/settings/page.tsx` -- Existing settings page with billing section
- `web/app/platform/organizations/page.tsx` -- Platform admin org management pattern
- `web/app/(auth)/signup/page.tsx` -- Tier prices (Starter: 149, Growth: 299, Enterprise: 599)
- `web/lib/stripe/server.ts` -- Stripe SDK initialization (apiVersion: '2026-01-28.clover')
- `web/lib/organizations/org-resolver.ts` -- requireOrgId() pattern for API routes
- `web/contexts/org-context.tsx` -- Client-side org context (orgId, role)
- `supabase/migrations/133_subscription_columns.sql` -- DB schema for subscription columns
- `supabase/migrations/135_webhook_events.sql` -- subscription_status_updated_at column

### Secondary (MEDIUM confidence)
- [Stripe Customer Portal API - Create Session](https://docs.stripe.com/api/customer_portal/sessions/create) -- Official Stripe API docs
- [Stripe Customer Portal Integration Guide](https://docs.stripe.com/customer-management/integrate-customer-portal) -- Official integration docs
- [Stripe Subscriptions List API](https://docs.stripe.com/api/subscriptions/list?lang=node) -- For understanding subscription object structure

### Tertiary (LOW confidence)
- [Stripe MRR Calculation](https://support.stripe.com/questions/calculating-monthly-recurring-revenue-(mrr)-in-billing) -- Stripe support article (could not fetch full content)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed, patterns established in codebase
- Architecture: HIGH -- Builds directly on existing feature-gates.ts, middleware.ts, and billing webhook patterns
- Feature gate inventory: HIGH -- Exhaustive review of FEATURE_GATES map and existing admin pages
- Stripe Customer Portal: HIGH -- Verified with official API docs; single API call pattern
- MRR calculation: HIGH -- Simple math from local DB; no external dependencies
- Suspension flow: HIGH -- Middleware pattern established by onboarding check
- Pitfalls: HIGH -- Derived from codebase analysis and prior decisions

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days -- stable domain, no fast-moving dependencies)
