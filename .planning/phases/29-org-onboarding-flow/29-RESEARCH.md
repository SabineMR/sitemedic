# Phase 29: Org Onboarding Flow — Research

## Existing Infrastructure

### Billing Webhook Handler (READY)
**File:** `web/app/api/stripe/billing-webhooks/route.ts`
- Uses `STRIPE_BILLING_WEBHOOK_SECRET` (separate from Connect webhook)
- `checkout.session.completed` handler: writes `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status: 'active'` to organizations table
- **Expects `metadata.org_id`** on Checkout Session — Phase 29 must set this
- `priceIdToTier()` maps comma-separated env var price IDs to tier names
- Idempotency via `webhook_events` table (UNIQUE on `stripe_event_id`)
- Out-of-order protection via `subscription_status_updated_at` timestamp comparison

### Feature Gates (READY)
**File:** `web/lib/billing/feature-gates.ts`
- Tiers: `'starter' | 'growth' | 'enterprise'`
- `hasFeature(tier, feature)`, `isAtLeastTier(current, minimum)`, `getTierFeatures(tier)`
- 12 features gated across 3 tiers; Growth unlocks white_label + subdomain + advanced_analytics

### Organizations Table
- Subscription columns from migration 133: `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status`
- CHECK constraint on status: `('active', 'past_due', 'cancelled')`
- CHECK constraint on tier: `('starter', 'growth', 'enterprise')`
- NULL = legacy org (treated as starter/active)
- **No `activation_status` column yet** — Phase 29 needs a migration or use existing `subscription_status` flow

### Org Branding Table
**Migration 132:** `org_branding` table with `org_id`, `logo_path`, `primary_colour_hex`, `company_name`, `tagline`
- RLS: org users SELECT, org admins UPDATE, platform admins full CRUD
- **New orgs do NOT auto-get org_branding row** — Phase 29 must INSERT explicitly

### Stripe Client Helpers
- Server: `web/lib/stripe/server.ts` — exports `stripe` instance with `STRIPE_SECRET_KEY`
- Client: `web/lib/stripe/client.ts` — lazy-loads Stripe.js with publishable key
- Env vars documented: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE`

### Middleware & Subdomain Routing (READY)
**File:** `web/lib/supabase/middleware.ts`
- Extracts subdomain, resolves org, injects `x-org-*` headers
- Public routes include: `/`, `/login`, `/signup`, `/auth`, `/pricing`, `/api/*`
- Users without org_id redirected to `/setup/organization`
- Strips incoming `x-org-*` headers for security

### Existing Auth/Signup Flow
- **Signup:** `web/app/(auth)/signup/page.tsx` — magic link OTP, stores full_name in metadata
- **Org setup:** `web/app/setup/organization/page.tsx` — creates org after auth, no billing
- **Auth trigger:** `handle_new_user()` auto-creates profile with `org_id` from user metadata
- **Auth callback:** `web/app/auth/callback/route.ts` — redirects by role

### Email Infrastructure (READY)
- React Email components (`@react-email/components`)
- Resend client: `web/lib/email/resend.ts` — dev mode fallback if no API key
- Pattern: render React component → `resend.emails.send({ from, to, subject, html })`
- Existing templates: booking-confirmation, medic-assignment, booking-received
- From address: `bookings@sitemedic.co.uk`

### Platform Admin Organizations Page
**File:** `web/app/platform/organizations/page.tsx`
- Lists all orgs with metrics (users, bookings, revenue)
- Search/filter, cards with name/slug/counts
- No subscription tier display, no activation queue yet

## Architecture Decisions for Phase 29

### Activation Status Pattern
- **Option chosen:** Add `activation_status` column to `organizations` table
- Values: `'pending'` | `'active'` | `'suspended'`
- New orgs start as `'pending'` after Stripe Checkout
- Platform admin sets to `'active'` on approval
- Separate from `subscription_status` (billing state vs admin approval)

### Signup → Checkout Flow
1. User visits `/signup` → creates account (magic link OTP) → redirected to plan selection
2. After auth, POST to `/api/billing/checkout` with selected tier
3. Checkout route: creates org + org_branding row + Stripe Customer + Checkout Session
4. User redirected to Stripe Checkout hosted page
5. After payment: `checkout.session.completed` webhook fires → billing webhook writes subscription data
6. User lands on success/onboarding page

### Key Constraint: org_id Must Exist Before Checkout
- The billing webhook expects `metadata.org_id` to write subscription data
- Therefore: org must be created BEFORE Stripe Checkout redirect
- org starts with `activation_status = 'pending'`

### Onboarding Wizard Access
- Accessible at `/onboarding` route group
- New org admin can access branding setup even while pending
- Middleware must allow pending orgs to reach onboarding pages
- Main dashboard routes blocked until activation_status = 'active'

### Platform Admin Activation
- New tab/section on `/platform/organizations` page
- Shows pending orgs with: name, plan tier, Stripe invoice, signup time
- "Activate" button: sets activation_status = 'active', assigns slug (for Growth+), sends welcome email
- Slug assignment only for Growth/Enterprise (Starter doesn't get subdomain)

## Files to Create
1. `web/app/api/billing/checkout/route.ts` — Stripe Checkout Session creation
2. `web/app/(public)/signup/page.tsx` — public signup with plan selection (or modify existing)
3. `web/app/onboarding/` — post-payment wizard pages
4. `web/app/api/platform/organizations/activate/route.ts` — activation endpoint
5. `web/lib/email/templates/welcome-email.tsx` — welcome email template
6. `web/lib/email/send-welcome.ts` — welcome email sender
7. Migration for `activation_status` column

## Files to Modify
1. `web/app/platform/organizations/page.tsx` — add activation queue
2. `web/lib/supabase/middleware.ts` — allow pending orgs to access /onboarding
3. Possibly `web/app/(auth)/signup/page.tsx` — redirect to new onboarding flow
