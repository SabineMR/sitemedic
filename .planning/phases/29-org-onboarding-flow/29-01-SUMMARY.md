---
phase: 29-org-onboarding-flow
plan: 01
subsystem: api
tags: [stripe, checkout, onboarding, supabase, org-provisioning]

# Dependency graph
requires:
  - phase: 24-org-branding
    provides: org_branding table and RLS policies
  - phase: 25-stripe-billing
    provides: billing webhook handler expecting metadata.org_id
provides:
  - POST /api/billing/checkout — org provisioning + Stripe Checkout Session creation
  - GET /api/billing/checkout-status — subscription state polling endpoint
affects: [29-02 (signup page calls checkout), 29-03 (onboarding page polls checkout-status)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-role client for org provisioning (bypasses RLS)"
    - "Tier-to-price mapping via STRIPE_PRICE_* comma-separated env vars"
    - "Post-payment polling pattern for webhook latency"

key-files:
  created:
    - web/app/api/billing/checkout/route.ts
    - web/app/api/billing/checkout-status/route.ts
  modified:
    - FEATURES.md

key-decisions:
  - "org_branding INSERT is non-fatal — logs warning but does not block checkout"
  - "User app_metadata updated with org_id + role via service-role admin API"
  - "Origin detection: request origin > referer > NEXT_PUBLIC_SITE_URL > localhost:30500"
  - "Service-role client for all DB writes (org, branding, membership) to bypass RLS"

patterns-established:
  - "Org provisioning chain: org -> org_branding -> membership -> metadata -> Stripe"
  - "checkout-status polling: client polls GET until subscriptionStatus != null"

# Metrics
duration: 6min
completed: 2026-02-18
---

# Phase 29 Plan 01: Stripe Checkout & Org Provisioning API Summary

**POST /api/billing/checkout creates org + org_branding + membership + Stripe Customer + Checkout Session; GET /api/billing/checkout-status polls subscription state for post-payment webhook latency**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-18T12:04:28Z
- **Completed:** 2026-02-18T12:11:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Complete org provisioning chain in a single API call (org + branding + membership + metadata + Stripe)
- Checkout Session metadata.org_id links back to billing webhook (Phase 25) for subscription write-back
- Post-payment polling endpoint handles webhook latency gracefully

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Stripe Checkout route with org provisioning** - `24e2ba8` (feat)
2. **Task 2: Create checkout status polling endpoint** - `4809aa8` (feat)

## Files Created/Modified
- `web/app/api/billing/checkout/route.ts` - POST handler: validates tier/org details, creates org (onboarding_completed=false), inserts org_branding, creates membership, updates user metadata, creates Stripe Customer + Checkout Session with metadata.org_id
- `web/app/api/billing/checkout-status/route.ts` - GET handler: reads user app_metadata.org_id, queries org subscription state, returns subscriptionStatus/tier/isPending for polling
- `FEATURES.md` - Updated with Stripe Checkout API documentation

## Decisions Made
- **org_branding INSERT is non-fatal:** Logs warning but does not fail the checkout flow. This ensures the checkout proceeds even if branding insert has an issue, though it logs prominently since white-label features depend on this row.
- **Service-role client for all writes:** All database operations (org, branding, membership) use service-role client to bypass RLS, matching the billing webhook pattern.
- **Origin detection chain:** Uses request origin header first, then referer (stripped), then NEXT_PUBLIC_SITE_URL env var, then localhost:30500 fallback. This supports both production subdomains and local development.
- **User metadata includes role:** Sets both org_id and role='org_admin' in app_metadata so middleware has full context without additional DB queries.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript build error in `lib/queries/client/bookings.ts` (unrelated to this plan). Build fails on type mismatch in ClientBooking type. No impact on billing routes — verified via `tsc --noEmit` filtering for billing paths.

## User Setup Required

None - no external service configuration required. (Stripe price env vars are already expected from Phase 25-01 checkpoint.)

## Next Phase Readiness
- Both API routes ready for the signup page (29-02) to call POST /api/billing/checkout
- checkout-status endpoint ready for the onboarding page (29-03) to poll
- No new migrations, no new env vars beyond existing STRIPE_PRICE_* from Phase 25

---
*Phase: 29-org-onboarding-flow*
*Completed: 2026-02-18*
