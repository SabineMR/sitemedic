# Architecture Patterns: White-Label Multi-Tenancy

**Domain:** White-label SaaS — per-org branding, subdomain routing, Stripe Billing tiers
**Researched:** 2026-02-18
**Supersedes:** Multi-vertical integration architecture (2026-02-17) for this milestone
**Confidence:** HIGH (middleware and Vercel patterns verified against official Next.js/Vercel docs; Stripe separation verified against official Stripe documentation; all existing code claims verified by reading source files)

---

## 1. Existing Architecture Baseline

Before detailing what to add, this section maps what already exists so changes are additive, not destructive.

### organizations table (current shape, from migrations 00001 + 027)

```sql
organizations {
  id:                   UUID PRIMARY KEY
  name:                 TEXT NOT NULL
  slug:                 TEXT UNIQUE         -- added migration 027, e.g. 'asg'
  status:               TEXT DEFAULT 'active'
  onboarding_completed: BOOLEAN DEFAULT false
  created_at:           TIMESTAMPTZ
  updated_at:           TIMESTAMPTZ
}
```

### org_settings table (current shape, from migration 118)

```sql
org_settings {
  id, org_id (FK, unique), base_rate, geofence_default_radius,
  urgency_premiums (JSONB), admin_email, net30_eligible,
  credit_limit, created_at, updated_at
}
```

### JWT app_metadata (current shape, from migrations 105/106 + org-context.tsx)

```json
{
  "org_id":   "uuid",
  "org_slug": "asg",
  "role":     "org_admin | medic | site_manager | platform_admin"
}
```

Platform admins carry no `org_id` or `org_slug` in the JWT (explicitly stripped in migration 106).

### RLS baseline (migrations 00004, 003, 011, 028)

Every data table uses `get_user_org_id()` which reads `auth.jwt() -> 'app_metadata' ->> 'org_id'`. All policies are anchored to this function. The new architecture must not change this function or any existing caller.

### Middleware baseline (web/middleware.ts + web/lib/supabase/middleware.ts)

`middleware.ts` delegates entirely to `updateSession()`. That function:
1. Refreshes Supabase session cookies via `createServerClient` with cookie handlers
2. Calls `supabase.auth.getUser()` (server-validated, not just JWT parse)
3. Redirects unauthenticated requests to `/login`
4. Redirects authenticated users from auth pages to role-based dashboards (`/platform`, `/admin`, `/medic`, `/dashboard`)
5. Redirects users without `org_id` to `/setup/organization`

The matcher excludes: `_next/static`, `_next/image`, `favicon.ico`, `api/`, and public marketing pages.

### Existing Stripe infrastructure

Two parallel Stripe webhook handlers exist:

**Handler 1 — Supabase Edge Function:** `supabase/functions/stripe-webhooks/index.ts`
- Events: `account.updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`
- Uses: `STRIPE_WEBHOOK_SECRET` env var
- Primary Connect handler for medic payouts

**Handler 2 — Next.js Route Handler:** `web/app/api/stripe/webhooks/route.ts`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`
- Uses: `STRIPE_WEBHOOK_SECRET` env var
- Partial overlap with Edge Function; likely the earlier handler before Edge Functions were built

Both use a **single `STRIPE_WEBHOOK_SECRET`** and handle Stripe Connect events only. Neither handles subscription lifecycle events. Stripe Billing is completely absent from the codebase today.

### Existing email and PDF infrastructure

- **Email:** Resend via `web/lib/email/resend.ts`. Templates in `web/lib/email/templates/` use `@react-email/components`. Footer hardcodes "Apex Safety Group Ltd."
- **PDFs:** `@react-pdf/renderer@4.3.2` in Supabase Edge Functions. Header component uses "SiteMedic" text placeholder with comment "logo from Supabase Storage will be added in Plan 02."

---

## 2. New DB Schema

### 2a. org_branding table (new — migration 132)

Separate table rather than columns on `org_settings` or `organizations`. Branding is presentation-layer data; `org_settings` is operational config (rates, geofencing); `organizations` is identity. Keeping them separate:
- Allows independent RLS policies
- Avoids adding nullable columns to tables with existing tight constraints
- Can be fetched in isolation by middleware without joining

```sql
-- Migration 132: org_branding
CREATE TABLE org_branding (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID        NOT NULL UNIQUE
                    REFERENCES organizations(id) ON DELETE CASCADE,
  company_name      TEXT,           -- overrides organizations.name on branded surfaces
  tagline           TEXT,           -- e.g. "Professional Paramedics for Events"
  primary_color     TEXT,           -- hex, e.g. '#1D4ED8' — validated in app layer
  logo_storage_path TEXT,           -- Supabase Storage path, e.g. 'org-logos/uuid/logo.png'
  logo_public_url   TEXT,           -- cached CDN URL, regenerated on upload
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_branding_org ON org_branding (org_id);
COMMENT ON TABLE org_branding IS
  'Per-org visual identity: logo, brand colour, display name, tagline. '
  'Separate from org_settings (operational config). Read by middleware for SSR branding injection.';

ALTER TABLE org_branding ENABLE ROW LEVEL SECURITY;

-- Org users read their own branding
CREATE POLICY "Org users read own branding"
  ON org_branding FOR SELECT
  USING (org_id = get_user_org_id());

-- Platform admins: full access
CREATE POLICY "Platform admins manage all branding"
  ON org_branding FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Backfill: create empty branding rows for all existing orgs
INSERT INTO org_branding (org_id)
SELECT id FROM organizations
ON CONFLICT (org_id) DO NOTHING;
```

**Note on anon reads:** The middleware reads `org_branding` using the **service role** client (bypasses RLS). No anon RLS policy is needed or safe. The service role key never leaves the server.

### 2b. New columns on organizations table (migration 133)

Subscription tier belongs on `organizations` not `org_settings` because:
- It is read in middleware for every request (alongside `slug` and `status` — already queried)
- It gates access — it is identity-level, not operational config
- The middleware query that already fetches `slug` can fetch `subscription_tier` for free

```sql
-- Migration 133: org subscription columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_tier       TEXT NOT NULL DEFAULT 'starter'
                           CHECK (subscription_tier IN ('starter', 'growth', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT NOT NULL DEFAULT 'trialing'
                           CHECK (subscription_status IN
                             ('active', 'trialing', 'past_due', 'canceled', 'unpaid'));

COMMENT ON COLUMN organizations.stripe_customer_id IS
  'Stripe Billing customer ID (distinct from medic Stripe Express account IDs). '
  'Used for subscription management only, not Connect payouts.';
COMMENT ON COLUMN organizations.stripe_subscription_id IS
  'Active Stripe Billing subscription ID. NULL until org subscribes.';
COMMENT ON COLUMN organizations.subscription_tier IS
  'Current plan tier: starter | growth | enterprise. Updated by billing webhook.';
COMMENT ON COLUMN organizations.subscription_status IS
  'Current Stripe subscription status. Drives feature gating and access control.';
```

### 2c. Supabase Storage bucket for org logos (migration 134 or Dashboard)

```
Bucket name:   org-logos
Access policy: public (logos are not sensitive data)
Path format:   org-logos/{org_id}/logo.{ext}
```

**Why public bucket:** Logos are not PHI or compliance documents. A public bucket eliminates the need for signed URLs in PDF Edge Functions, SSR pages, and email templates. The `org_id` UUID in the path provides practical obscurity (not guessable without knowing the UUID). The alternative — private bucket with signed URLs — adds complexity at every consumption point for no meaningful security benefit.

The public URL is deterministic: `${SUPABASE_URL}/storage/v1/object/public/org-logos/${org_id}/logo.png`. This URL is cached in `org_branding.logo_public_url` to avoid constructing it at every call site.

---

## 3. Subdomain Routing in Middleware

### 3a. Vercel infrastructure (prerequisite — DNS change, not code)

**Must happen before code changes are deployed to production:**

1. Add wildcard domain `*.sitemedic.co.uk` in Vercel Project Settings → Domains
2. Point DNS to Vercel nameservers: `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
   - Required for Vercel to issue wildcard SSL certificates automatically
   - Without this, individual subdomain SSL will not work
3. Apex domain `sitemedic.co.uk` also registered in the same Vercel project

Once the wildcard is configured, any `tenant.sitemedic.co.uk` resolves to the same Next.js deployment. Vercel issues individual SSL certificates per subdomain on demand.

Source: [Vercel Wildcard Domains](https://vercel.com/blog/wildcard-domains), [Vercel Multi-Tenant Domain Management](https://vercel.com/docs/multi-tenant/domain-management) — both official Vercel documentation, HIGH confidence.

### 3b. Subdomain extraction helper

```typescript
// web/lib/supabase/middleware.ts (new helper function, called inside updateSession)

function extractSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') ?? '';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'sitemedic.co.uk';

  // Skip apex and www
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  // Skip Vercel preview deployments (*.vercel.app)
  if (hostname.endsWith('.vercel.app')) {
    return null;
  }

  // Local dev: tenant.localhost:30500 → 'tenant'
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    return parts.length >= 2 ? parts[0] : null;
  }

  // Production: tenant.sitemedic.co.uk → 'tenant'
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}
```

### 3c. Service role org lookup by subdomain

The middleware runs at the Edge. It cannot use the user's Supabase client (no auth cookie yet at subdomain resolution time). Use the Supabase **service role** client — read-only lookup on a slug column, no sensitive data exposed:

```typescript
// Inside updateSession(), before auth checks

// SECURITY: Strip any injected x-org-* headers first (CVE-2025-29927 pattern)
const requestHeaders = new Headers(request.headers);
const ORG_HEADERS = [
  'x-org-id', 'x-org-slug', 'x-org-tier',
  'x-org-company-name', 'x-org-primary-color',
  'x-org-logo-url', 'x-org-tagline',
];
ORG_HEADERS.forEach(h => requestHeaders.delete(h));

const subdomain = extractSubdomain(request);
let resolvedOrg: {
  id: string;
  slug: string;
  subscription_tier: string;
  subscription_status: string;
} | null = null;

if (subdomain) {
  // Service role client — bypasses RLS, server-only, never sent to browser
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // NOT NEXT_PUBLIC_ — server only
  );

  const { data } = await adminClient
    .from('organizations')
    .select('id, slug, subscription_tier, subscription_status')
    .eq('slug', subdomain)
    .eq('status', 'active')
    .maybeSingle();  // returns null instead of error when not found

  if (!data) {
    // Unknown subdomain — redirect to apex with a clear path
    const url = request.nextUrl.clone();
    url.host = process.env.NEXT_PUBLIC_ROOT_DOMAIN!;
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  resolvedOrg = data;
}
```

**Performance note:** This adds one DB round-trip per request for subdomain requests. At current scale (single org) this is negligible. At 10–20 orgs it remains fine. At 100+ orgs, add Vercel KV (or Upstash Redis) cache: `slug → { id, tier, status }`, TTL 60 seconds. Do not add caching until latency measurement shows it is needed.

### 3d. Branding data propagation via request headers

After org resolution, fetch branding and inject into request headers. Server components read these headers via `next/headers` — no client-side fetch needed for branding:

```typescript
// Continuation of updateSession() after resolvedOrg is set

if (resolvedOrg) {
  // Fetch branding in same middleware call
  const { data: branding } = await adminClient
    .from('org_branding')
    .select('company_name, primary_color, logo_public_url, tagline')
    .eq('org_id', resolvedOrg.id)
    .maybeSingle();

  requestHeaders.set('x-org-id', resolvedOrg.id);
  requestHeaders.set('x-org-slug', resolvedOrg.slug);
  requestHeaders.set('x-org-tier', resolvedOrg.subscription_tier);

  if (branding) {
    requestHeaders.set('x-org-company-name', branding.company_name ?? '');
    requestHeaders.set('x-org-primary-color', branding.primary_color ?? '#2563eb');
    requestHeaders.set('x-org-logo-url', branding.logo_public_url ?? '');
    requestHeaders.set('x-org-tagline', branding.tagline ?? '');
  }
}

// Pass modified headers forward to server components
supabaseResponse = NextResponse.next({
  request: { headers: requestHeaders },
});
```

Consuming in server components:

```typescript
// web/app/(dashboard)/layout.tsx (server component)
import { headers } from 'next/headers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();

  const branding = {
    companyName:   headersList.get('x-org-company-name') || 'SiteMedic',
    primaryColor:  headersList.get('x-org-primary-color') || '#2563eb',
    logoUrl:       headersList.get('x-org-logo-url') || '',
    tagline:       headersList.get('x-org-tagline') || '',
    tier:          headersList.get('x-org-tier') || 'starter',
  };

  return (
    <BrandingProvider branding={branding}>
      {children}
    </BrandingProvider>
  );
}
```

**Security rationale for stripping headers first:** CVE-2025-29927 demonstrated that specially crafted external HTTP headers could bypass Next.js middleware checks. By deleting all `x-org-*` headers at the top of middleware before setting them, we ensure values in these headers always come from our trusted middleware logic, never from the incoming request.

Source: CVE-2025-29927 analysis confirmed in search results. Strip-before-set is the standard mitigation for middleware-injected headers. HIGH confidence.

### 3e. Updated middleware execution flow

```
Incoming request
│
├─ Strip all x-org-* headers (security — prevents external injection)
│
├─ Supabase session refresh (existing createServerClient + cookie handlers)
│
├─ extractSubdomain(request)
│   ├─ null → apex domain; skip org resolution
│   └─ 'tenant'
│       ├─ Service role lookup: organizations WHERE slug = 'tenant' AND status = 'active'
│       ├─ Not found → redirect to apex /
│       └─ Found → fetch org_branding for tenant
│
├─ Inject x-org-* into request headers (if subdomain resolved)
│
├─ supabase.auth.getUser() — server-validated auth check
│
├─ Auth guard (existing logic unchanged)
│   ├─ No user + protected route → redirect /login
│   └─ User on auth page → redirect to role dashboard
│
├─ Org ID guard (existing logic unchanged)
│   └─ User with no org_id + not /setup/* → redirect /setup/organization
│
└─ NextResponse.next({ request: { headers: requestHeaders } })
```

### 3f. Matcher update

The existing matcher already excludes `api/`. The billing webhook at `/api/stripe/billing-webhooks` is covered by this exclusion. No matcher change is strictly required. However, document the exclusion explicitly:

```typescript
// web/middleware.ts — config.matcher comment update
// '/api/' routes excluded: Stripe webhook endpoints must not be intercepted by auth middleware.
// Stripe POSTs raw bodies with signature headers — middleware auth would reject them.
```

---

## 4. Branding Data Flow

### 4a. SSR pages

```
Request to tenant.sitemedic.co.uk/admin
  └─ Middleware: resolve slug → org → branding → inject x-org-* headers
       └─ app/(dashboard)/layout.tsx (server component): headers() → branding object
            └─ BrandingProvider (new client component): React context
                 └─ NavBar, headers, footers: useBranding() hook
                      └─ CSS custom property injection: --org-primary: {primaryColor}
```

**New `BrandingContext` (separate from `OrgContext`):**

Do not merge branding into `OrgContext`. `OrgContext` fetches from Supabase client-side on mount. Branding arrives via SSR headers before client JavaScript runs — mixing them would require `OrgContext` to wait for headers it cannot read (headers are server-only). Keep them separate.

```typescript
// web/contexts/branding-context.tsx (new file)
'use client';
import { createContext, useContext } from 'react';

interface BrandingValue {
  companyName:  string;
  primaryColor: string;
  logoUrl:      string;
  tagline:      string;
  tier:         'starter' | 'growth' | 'enterprise';
}

const BrandingContext = createContext<BrandingValue>({
  companyName:  'SiteMedic',
  primaryColor: '#2563eb',
  logoUrl:      '',
  tagline:      '',
  tier:         'starter',
});

export function BrandingProvider({
  branding,
  children,
}: {
  branding: BrandingValue;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={branding}>
      <style>{`:root { --org-primary: ${branding.primaryColor}; }`}</style>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingValue {
  return useContext(BrandingContext);
}
```

### 4b. PDFs (Supabase Edge Functions)

Edge Functions do not go through Next.js middleware. They receive an HTTP POST with an `org_id` in the request body (from the Next.js API route that invokes them). The Edge Function uses the service role client to fetch branding directly:

```typescript
// Pattern for all PDF Edge Functions (e.g. generate-weekly-report/index.tsx)

const { data: branding } = await adminClient
  .from('org_branding')
  .select('company_name, primary_color, logo_public_url')
  .eq('org_id', orgId)
  .maybeSingle();

const logoUrl = branding?.logo_public_url ?? null;

// For @react-pdf/renderer <Image>:
// Option A (preferred): pass URL directly if accessible from Deno runtime
// Option B (fallback): fetch → ArrayBuffer → base64 data URI
const logoSrc = logoUrl ?? null;
// <Image src={logoSrc} /> in the PDF component — renders nothing if null
```

**Current state:** The `generate-weekly-report/components/Header.tsx` uses a text placeholder ("SiteMedic") with a comment about adding the logo later. This is the primary integration point for branded PDFs.

**All PDF Edge Functions need the same branding fetch added to their `index.ts` and passed to their document component as a prop.**

### 4c. Emails (Resend + React Email)

Email templates currently hardcode "Apex Safety Group Ltd" in footers (confirmed in `booking-confirmation-email.tsx`). The fix is a required `branding` prop on all templates:

```typescript
// Template interface change (all email templates)
interface OrgBranding {
  companyName:  string;
  primaryColor: string;
  logoUrl?:     string;
}

interface BookingConfirmationEmailProps {
  branding: OrgBranding;  // required, not optional
  booking:  { ... };
  // ... rest unchanged
}

// In template body:
// Replace hardcoded company name in footer
// Add <Img src={branding.logoUrl} /> above heading (if logoUrl present)
// Replace button color: backgroundColor: branding.primaryColor
```

Call sites (API routes that send email) must fetch branding before calling `resend.emails.send()`:

```typescript
// Pattern for email-sending API routes
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const orgId = user?.app_metadata?.org_id;

const { data: branding } = await supabase
  .from('org_branding')
  .select('company_name, primary_color, logo_public_url')
  .eq('org_id', orgId)
  .maybeSingle();

const orgBranding: OrgBranding = {
  companyName:  branding?.company_name ?? 'SiteMedic',
  primaryColor: branding?.primary_color ?? '#2563eb',
  logoUrl:      branding?.logo_public_url ?? undefined,
};

await resend.emails.send({
  react: <BookingConfirmationEmail branding={orgBranding} booking={...} ... />,
  // ...
});
```

---

## 5. Stripe Billing alongside Stripe Connect

### 5a. Conceptual separation (critical)

| Dimension | Stripe Connect (existing) | Stripe Billing (new) |
|-----------|--------------------------|----------------------|
| Direction | Money OUT — platform pays medics | Money IN — orgs pay platform |
| Account | Medic Express accounts | Platform's own Stripe account |
| Webhook endpoint | `/api/stripe/webhooks` or Supabase Edge Function | `/api/stripe/billing-webhooks` (new) |
| Webhook secret env var | `STRIPE_WEBHOOK_SECRET` | `STRIPE_BILLING_WEBHOOK_SECRET` (new) |
| Key events | `account.updated`, `transfer.created`, `payment_intent.*` | `customer.subscription.*`, `invoice.payment_failed`, `checkout.session.completed` |
| DB tables written | `medics`, `timesheets`, `payments`, `bookings` | `organizations` (subscription columns) |

These concerns must never be handled in the same webhook endpoint. Different secrets, different payloads, different DB tables.

Source: [Stripe Connect Webhooks](https://docs.stripe.com/connect/webhooks) and [Stripe Billing Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — official Stripe documentation, HIGH confidence.

### 5b. New billing webhook endpoint

```typescript
// web/app/api/stripe/billing-webhooks/route.ts (new file)

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // CRITICAL: Use BILLING-specific secret, not STRIPE_WEBHOOK_SECRET
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_BILLING_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Service role client — webhook has no user session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      const priceId = session.line_items?.data?.[0]?.price?.id;
      if (!orgId) break;

      await supabase
        .from('organizations')
        .update({
          stripe_customer_id:     session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_tier:      tierFromPriceId(priceId ?? ''),
          subscription_status:    'active',
        })
        .eq('id', orgId);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price?.id;

      await supabase
        .from('organizations')
        .update({
          stripe_subscription_id: sub.id,
          subscription_tier:      tierFromPriceId(priceId ?? ''),
          subscription_status:    sub.status as string,
        })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from('organizations')
        .update({
          subscription_status:    'canceled',
          subscription_tier:      'starter',
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', sub.customer as string);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase
        .from('organizations')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', invoice.customer as string);
      // TODO: Send email to org admin via Resend
      break;
    }

  }

  return NextResponse.json({ received: true });
}
```

### 5c. Price ID to tier mapping

```typescript
// web/lib/stripe/billing-plans.ts (new file)

export const BILLING_PLANS = {
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER!,
    tier: 'starter' as const,
    label: 'Starter',
  },
  growth: {
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    tier: 'growth' as const,
    label: 'Growth',
  },
  enterprise: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE!,
    tier: 'enterprise' as const,
    label: 'Enterprise',
  },
} as const;

export type Tier = 'starter' | 'growth' | 'enterprise';

export function tierFromPriceId(priceId: string): Tier {
  for (const plan of Object.values(BILLING_PLANS)) {
    if (plan.priceId === priceId) return plan.tier;
  }
  return 'starter';
}
```

**New environment variables required:**

```bash
# Add to Vercel project env vars and .env.local
STRIPE_BILLING_WEBHOOK_SECRET=whsec_billing_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_ENTERPRISE=price_...
NEXT_PUBLIC_ROOT_DOMAIN=sitemedic.co.uk
```

### 5d. Stripe Dashboard setup for billing webhook

In Stripe Dashboard (Production account, not Connect):
1. Webhooks → Add endpoint
2. URL: `https://sitemedic.co.uk/api/stripe/billing-webhooks`
3. Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `checkout.session.completed`
4. Do NOT enable "Connect" toggle — this is a platform-level webhook, not a Connect webhook
5. Copy the signing secret → set as `STRIPE_BILLING_WEBHOOK_SECRET` in Vercel

### 5e. Org onboarding and Stripe Checkout flow

```
/signup → user creates Supabase account
  └─ POST /api/billing/checkout (new route)
       └─ Fetch org_id from user JWT
       └─ stripe.customers.create({
            email: user.email,
            metadata: { org_id }
          })
       └─ stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            line_items: [{ price: STRIPE_PRICE_GROWTH, quantity: 1 }],
            metadata: { org_id },
            success_url: `${origin}/onboarding/complete?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/pricing`,
          })
       └─ Return { url } → redirect browser to Stripe Checkout

Stripe Checkout (hosted page) → user enters card
  └─ Stripe fires checkout.session.completed
       └─ Billing webhook updates organizations (tier, status, stripe_customer_id)
       └─ Platform admin notified to review + activate org

/onboarding/complete
  └─ Org admin completes profile/branding setup wizard
  └─ Platform admin activates org in /platform/organizations
```

---

## 6. Feature Gating

### 6a. Feature gate map (authoritative, server-side)

```typescript
// web/lib/billing/feature-gates.ts (new file)

export const FEATURE_GATES = {
  custom_branding:         ['growth', 'enterprise'],
  subdomain_routing:       ['growth', 'enterprise'],
  white_label_pdf:         ['growth', 'enterprise'],
  white_label_email:       ['growth', 'enterprise'],
  advanced_analytics:      ['enterprise'],
  api_access:              ['enterprise'],
  priority_support:        ['growth', 'enterprise'],
  multi_vertical:          ['growth', 'enterprise'],
} as const;

export type Feature = keyof typeof FEATURE_GATES;

export function hasFeature(tier: string, feature: Feature): boolean {
  return (FEATURE_GATES[feature] as readonly string[]).includes(tier);
}
```

### 6b. Gating in server components (authoritative enforcement)

```typescript
// In any server component or API route
import { headers } from 'next/headers';
import { hasFeature } from '@/lib/billing/feature-gates';

const headersList = await headers();
const tier = headersList.get('x-org-tier') ?? 'starter';

// In PDF generation: skip branding if not gated tier
const useBranding = hasFeature(tier, 'white_label_pdf');

// In API route: return 403 if feature not available
if (!hasFeature(tier, 'api_access')) {
  return NextResponse.json({ error: 'API access requires Enterprise tier' }, { status: 403 });
}
```

### 6c. Gating in client components (UX only)

```typescript
// In client components via BrandingContext (which includes tier)
const { tier } = useBranding();
const canCustomizeBranding = hasFeature(tier, 'custom_branding');

{!canCustomizeBranding && (
  <div className="upgrade-prompt">
    Custom branding requires Growth or Enterprise. <a href="/billing">Upgrade</a>
  </div>
)}
```

**Rule:** Client-side gating is UX only — it can never be the sole enforcement. Always re-validate server-side.

### 6d. RLS and gating

RLS cannot directly read `subscription_tier` from the JWT (tier is not in app_metadata). Do not attempt RLS-based feature gating. Application layer only.

---

## 7. Build Order (Dependency Graph)

```
STEP 1 — DB Migrations (prerequisite for all code)
  ├─ Migration 132: org_branding table + RLS + backfill empty rows
  ├─ Migration 133: organizations ADD COLUMN stripe_customer_id, stripe_subscription_id,
  │                 subscription_tier, subscription_status
  └─ Migration 134 (or Dashboard): Supabase Storage bucket 'org-logos' (public)

STEP 2 — Billing infrastructure (no UI; must be live before any org subscribes)
  ├─ web/lib/stripe/billing-plans.ts — tier→priceId + tierFromPriceId()
  ├─ web/lib/billing/feature-gates.ts — FEATURE_GATES + hasFeature()
  ├─ web/app/api/stripe/billing-webhooks/route.ts — new webhook handler
  ├─ Stripe Dashboard: create billing webhook endpoint → copy secret
  └─ Environment variables: STRIPE_BILLING_WEBHOOK_SECRET, STRIPE_PRICE_*, NEXT_PUBLIC_ROOT_DOMAIN

STEP 3 — Subdomain routing (middleware changes)
  ├─ PREREQUISITE: Vercel wildcard DNS must be configured before testing in production
  ├─ web/lib/supabase/middleware.ts: extractSubdomain() helper
  ├─ web/lib/supabase/middleware.ts: service role org lookup by slug
  ├─ web/lib/supabase/middleware.ts: x-org-* header injection
  └─ web/lib/supabase/middleware.ts: strip incoming x-org-* headers (security)

STEP 4 — Branding data flow: SSR
  ├─ web/contexts/branding-context.tsx — BrandingProvider + useBranding()
  ├─ web/app/(dashboard)/layout.tsx — read headers(), pass to BrandingProvider
  ├─ web/app/admin/layout.tsx — same
  ├─ Logo in navigation headers (fallback to SiteMedic logo if not set)
  └─ CSS custom properties: --org-primary from BrandingProvider

STEP 5 — Branding data flow: PDFs
  ├─ All PDF Edge Functions: add org_branding fetch to index.ts
  ├─ All PDF header components: accept branding prop, render logo + company name
  └─ Remove hardcoded 'SiteMedic' placeholders

STEP 6 — Branding data flow: Emails
  ├─ Add OrgBranding prop to all email template interfaces (required, not optional)
  ├─ All email-sending API routes: fetch org_branding before resend.emails.send()
  └─ Remove hardcoded 'Apex Safety Group Ltd' from footers

STEP 7 — Org onboarding flow
  ├─ web/app/api/billing/checkout/route.ts — create Stripe customer + Checkout session
  ├─ web/app/(auth)/signup/page.tsx — trigger billing checkout after account creation
  ├─ web/app/onboarding/* — post-Checkout branding setup wizard
  └─ web/app/platform/organizations/page.tsx — platform admin activation UI

STEP 8 — Feature gating in UI
  └─ Upgrade prompts on gated features for starter-tier orgs

STEP 9 — Settings: org branding upload UI
  └─ web/app/admin/settings/branding/page.tsx — logo upload, color picker, company name
```

**Critical dependency rules:**
- Step 1 (migrations) must run before any code that reads new columns or the `org_branding` table
- Step 2 (billing webhook) must be deployed before Step 7 (onboarding) — webhooks must receive events
- Step 3 (Vercel DNS) must be live in production before subdomain routing is tested on a real subdomain
- Steps 4–6 can be parallelised once Step 3 is merged and deployed
- Step 7 depends on Step 2 (billing infrastructure complete) and Step 4 (branding setup UX available)

---

## 8. RLS and JWT Metadata: What Stays Untouched

| Item | Action | Reason |
|------|--------|--------|
| `get_user_org_id()` function | Do not touch | All existing RLS policies depend on it |
| `is_platform_admin()` function | Do not touch | Platform admin RLS depends on it |
| JWT shape: `org_id`, `role`, `org_slug` | Do not add new fields | JWT bloat; tier is read from DB, not JWT |
| All existing RLS policies | Do not touch | Additive only — new table gets its own policies |
| `STRIPE_WEBHOOK_SECRET` env var | Do not change | Existing Connect webhook still uses it |
| The Connect webhook handler files | Do not merge | Keep handlers separate |

**Why tier is NOT in the JWT:** JWTs have a 3600-second default TTL. If stored in the JWT:
- Downgraded orgs retain premium access for up to an hour
- Upgraded orgs must wait for JWT refresh before features unlock
- Billing webhooks updating the JWT are complex (require admin API calls)

The middleware reads tier from the DB on every request. This is the correct approach at current scale. It adds one DB column to the existing org slug lookup — effectively free.

---

## 9. Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `middleware.ts` (updated) | Subdomain → org resolution, branding header injection, security header strip, auth guard | Supabase service role client, Next.js response headers |
| `org_branding` table | Persists per-org visual identity | `organizations` (FK), Supabase Storage (logo paths) |
| `BrandingContext` + `BrandingProvider` | Client-side branding state from SSR headers | Dashboard layouts (server), all client UI components |
| `feature-gates.ts` | Authoritative tier → feature mapping | API routes, server components, PDF Edge Functions |
| `/api/stripe/billing-webhooks` | Stripe Billing lifecycle events | `organizations` table (service role), Resend (future) |
| `/api/stripe/webhooks` | Stripe Connect events (existing — unchanged) | `medics`, `timesheets`, `payments`, `bookings` tables |
| `supabase/functions/stripe-webhooks` | Stripe Connect Edge Function (existing — unchanged) | `medics`, `timesheets` tables |
| `/api/billing/checkout` | Create Stripe customer + Checkout session for org signup | Stripe Billing API, `organizations` table |
| PDF Edge Functions (updated) | Org-branded document generation | `org_branding` (via service role), Supabase Storage |
| Email templates (updated) | Org-branded transactional email | `org_branding` (from API route fetch), Resend API |
| `billing-plans.ts` | Price ID ↔ tier mapping constants | Billing webhook handler, checkout route |

---

## 10. Anti-Patterns to Avoid

### Anti-Pattern 1: Subscription tier in the JWT

**What goes wrong:** Tier changes (upgrade/downgrade) do not take effect until the user's JWT expires and refreshes. Downgraded orgs keep premium access; upgraded orgs wait.

**Prevention:** Read tier from DB in middleware on every request. Inject as `x-org-tier` header. Never put tier in JWT app_metadata.

### Anti-Pattern 2: One Stripe webhook handler for both Connect and Billing

**What goes wrong:** The signing secrets are different. Mixing them means verifying Connect events with the Billing secret or vice versa — both fail. It also creates coupling between completely unrelated payment flows.

**Prevention:** Two separate route handlers, two separate Stripe Dashboard webhook endpoints, two separate env vars (`STRIPE_WEBHOOK_SECRET` for Connect, `STRIPE_BILLING_WEBHOOK_SECRET` for Billing).

### Anti-Pattern 3: Branding via client-side fetch

**What goes wrong:** Flash of unbranded content on first SSR render. Extra network round-trip. Race condition between auth and branding fetch.

**Prevention:** Middleware injects branding into request headers. Server layout components read headers via `next/headers`. `BrandingProvider` hydrates the client from SSR-provided values. Zero client-side branding fetches on page load.

### Anti-Pattern 4: Anon RLS policy on org_branding for middleware reads

**What goes wrong:** An anon-accessible policy on `org_branding` could leak all orgs' branding data if misconfigured. Middleware reads happen before user authentication, so the user's org RLS context is not yet available.

**Prevention:** Middleware uses the service role client (bypasses RLS) for the org + branding lookup. The service role key is server-only (not `NEXT_PUBLIC_`). This is the correct use case for the service role.

### Anti-Pattern 5: Hardcoded company names in PDFs and emails

**What goes wrong:** "Apex Safety Group Ltd" and "SiteMedic" appear in documents sent to clients of other orgs. This is the opposite of white-label.

**Prevention:** All PDF document components and email templates have a required `branding: OrgBranding` prop. Call sites must pass it. TypeScript's required type makes it impossible to omit accidentally.

### Anti-Pattern 6: Single `org-logos` bucket without org_id namespacing

**What goes wrong:** `logo.png` for one org overwrites another's. All org logos collide.

**Prevention:** Enforce path format `org-logos/{org_id}/logo.{ext}`. The upload API route derives the path from the authenticated user's `org_id` in their JWT — not from user input. Storage RLS policy (if using private bucket): `bucket_id = 'org-logos' AND name LIKE auth.uid()::text || '%'` — but since the bucket is public, the path namespacing provides practical isolation.

---

## 11. Scalability Considerations

| Concern | At 1 org (now) | At 20 orgs | At 200 orgs |
|---------|----------------|------------|-------------|
| Middleware org lookup | 1 DB query per request on subdomains | Acceptable — indexed on `slug` | Add Vercel KV / Upstash cache (slug → org row), TTL 60s |
| Middleware branding lookup | 1 additional query per subdomain request | Acceptable | Include in same KV cache entry |
| Stripe Billing webhooks | Very low volume — plan changes are rare | Still low | Still low — not request-per-second traffic |
| Logo storage | Single CDN bucket, UUID-namespaced | Same — Supabase Storage CDN scales automatically | Same |
| Feature gating | Constant map lookup — O(1) | Same | Same |
| `subscription_tier` staleness | Tier read from DB on every request — always fresh | Same | Consider 30s in-memory Next.js cache (unstable_cache) |

---

## Sources

- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant) — Official Next.js documentation, HIGH confidence
- [Vercel Wildcard Domains blog](https://vercel.com/blog/wildcard-domains) — Official Vercel, HIGH confidence
- [Vercel Multi-Tenant Domain Management](https://vercel.com/docs/multi-tenant/domain-management) — Official Vercel, HIGH confidence
- [Next.js headers() function](https://nextjs.org/docs/app/api-reference/functions/headers) — Official Next.js, HIGH confidence
- [Vercel: Modifying Request Headers in Middleware](https://vercel.com/templates/next.js/edge-functions-modify-request-header) — Official Vercel template, HIGH confidence
- [Stripe Connect Webhooks](https://docs.stripe.com/connect/webhooks) — Official Stripe, HIGH confidence
- [Stripe Billing Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — Official Stripe, HIGH confidence
- [Stripe Billing Entitlements](https://docs.stripe.com/billing/entitlements) — Official Stripe, HIGH confidence (Stripe native entitlements are an alternative to the FEATURE_GATES approach — both are valid)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — Official Supabase, HIGH confidence
- [CVE-2025-29927 Next.js middleware header injection](https://www.averlon.ai/blog/nextjs-cve-2025-29927-header-injection) — Third-party analysis, MEDIUM confidence. Mitigation (strip headers at start of middleware) is standard Next.js community practice
- Codebase reads (all HIGH confidence — files read directly):
  - `web/middleware.ts`
  - `web/lib/supabase/middleware.ts`
  - `web/contexts/org-context.tsx`
  - `web/app/layout.tsx`
  - `web/app/api/stripe/webhooks/route.ts`
  - `web/lib/stripe/server.ts`
  - `web/lib/email/resend.ts`
  - `web/lib/email/templates/booking-confirmation-email.tsx`
  - `web/next.config.ts`
  - `supabase/functions/stripe-webhooks/index.ts`
  - `supabase/functions/generate-weekly-report/components/Header.tsx`
  - `supabase/functions/generate-invoice-pdf/components/InvoiceDocument.tsx`
  - `supabase/migrations/00001_organizations.sql`
  - `supabase/migrations/00004_rls_policies.sql`
  - `supabase/migrations/027_backfill_asg_org_id.sql`
  - `supabase/migrations/118_org_settings.sql`
  - `supabase/migrations/100_add_platform_admin_role.sql`
  - `supabase/migrations/115_referral_and_per_medic_rates.sql`
