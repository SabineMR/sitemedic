---
status: passed
verified_at: 2026-02-20
---

# Phase 30 Verification: Subscription Management & Feature Gating

## Goal
Feature gating is enforced at both the API and UI layer simultaneously. Starter-tier orgs see contextual upgrade prompts on Growth-gated features. Org admins can manage their subscription via the Stripe Customer Portal. Platform admin has an MRR dashboard. Orgs with lapsed or cancelled subscriptions see a suspension screen with data preserved and reactivation path clearly signposted.

## Must-Have Verification

### SC-1: Contextual upgrade prompt for Starter-tier orgs
**Status:** ✓ PASSED
- `web/app/admin/settings/page.tsx:510` wraps branding form with `<TierGate feature="white_label" tier={subscriptionTier as SubscriptionTier | null}>`
- `web/components/billing/tier-gate.tsx:36` checks `hasFeature(tier, feature)` — renders children on pass, UpgradePrompt on fail
- `web/components/billing/upgrade-prompt.tsx:58` renders gradient card with "Upgrade to Growth" CTA
- FEATURE_DISPLAY_NAMES maps all 12 feature keys to human-readable names
- Section heading ("Branding") remains visible outside TierGate

### SC-2: API-level 403 enforcement
**Status:** ✓ PASSED
- `web/app/api/admin/branding/route.ts:19` — GET handler calls `requireTier('white_label')`
- `web/app/api/admin/branding/route.ts:56` — PUT handler calls `requireTier('white_label')`
- `web/lib/billing/require-tier.ts:44` — `requireTier()` queries org tier, throws TIER_INSUFFICIENT
- Both handlers catch TIER_INSUFFICIENT and return 403 with descriptive message
- Same `FEATURE_GATES` source of truth used by both TierGate (UI) and requireTier (API)

### SC-3: Stripe Customer Portal access
**Status:** ✓ PASSED
- `web/app/api/billing/portal/route.ts:49` — calls `stripe.billingPortal.sessions.create()`
- Portal session created server-side (no API key exposure)
- return_url points to `/admin/settings` (origin from request headers)
- Legacy orgs without stripe_customer_id get 400 with friendly error
- Settings page has "Manage Billing" button with loading state and error handling

### SC-4: Platform admin MRR dashboard
**Status:** ✓ PASSED
- `web/app/platform/subscriptions/page.tsx` — 484-line dashboard
- MrrSummary interface with total, per-tier breakdown, atRisk, churned counts
- TIER_MONTHLY_PRICE: starter=149, growth=299, enterprise=599
- All data from `organizations` table via Supabase — no Stripe API calls
- `web/app/platform/layout.tsx:113` — "Subscriptions" nav item in sidebar
- Legacy orgs (NULL tier) counted as starter, NULL status treated as active

### SC-5: Subscription suspension with reactivation
**Status:** ✓ PASSED
- `web/lib/supabase/middleware.ts:263` — checks `orgStatus?.subscription_status === 'cancelled'`
- Extends existing onboarding query (zero extra DB calls)
- isSuspendedRoute guard prevents redirect loop
- `web/app/suspended/page.tsx` — "Subscription Inactive" page with:
  - Data preservation message
  - "Reactivate Subscription" button (POSTs to /api/billing/portal)
  - Contact support mailto link
  - Log out option
- NULL and past_due statuses pass through normally

## Requirements Satisfied
- GATE-02: White-label branding gated to Growth+ ✓
- GATE-03: Dual UI+API enforcement from shared source ✓
- GATE-04: Contextual upgrade prompts ✓
- SUB-05: Stripe Customer Portal for self-service billing ✓
- SUB-06: Platform admin MRR dashboard ✓
- SUB-07: Graceful suspension with data preservation ✓

## Conclusion
All 5 success criteria verified against actual codebase. Phase 30 goal achieved.
