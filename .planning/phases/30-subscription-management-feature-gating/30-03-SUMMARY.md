---
phase: 30
plan: 03
subsystem: billing
tags: [stripe, customer-portal, billing, settings]
depends_on:
  requires: [24-03, 25-01, 29-01]
  provides: [stripe-customer-portal-api, manage-billing-ui]
  affects: [30-04, 30-05]
tech_stack:
  added: []
  patterns: [stripe-billing-portal-sessions]
key_files:
  created:
    - web/app/api/billing/portal/route.ts
  modified:
    - web/app/admin/settings/page.tsx
    - FEATURES.md
decisions:
  - id: portal-return-url
    choice: "return_url points to /admin/settings"
    reason: "User lands back on the settings page they came from"
  - id: legacy-org-handling
    choice: "400 with descriptive message for orgs without stripe_customer_id"
    reason: "Prevents broken portal links for orgs created before Stripe billing"
  - id: origin-detection
    choice: "request origin header > NEXT_PUBLIC_SITE_URL > localhost:30500"
    reason: "Supports subdomain routing and local development"
metrics:
  duration: ~3 min
  completed: 2026-02-18
---

# Phase 30 Plan 03: Stripe Customer Portal Integration Summary

**One-liner:** POST /api/billing/portal creates Stripe Customer Portal sessions; "Manage Billing" button added to admin settings page with legacy org guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Stripe Customer Portal API route | eb80919 | web/app/api/billing/portal/route.ts |
| 2 | Add Manage Billing button to settings page | 0c0587d | web/app/admin/settings/page.tsx |

## What Was Built

### API Route: POST /api/billing/portal

- Authenticates via `requireOrgId()` from `@/lib/organizations/org-resolver`
- Queries `organizations.stripe_customer_id` via Supabase
- Returns 400 with friendly message if no `stripe_customer_id` (legacy orgs)
- Creates `stripe.billingPortal.sessions` with customer ID and return URL
- Returns `{ url: session.url }` for client redirect
- Origin detection: request headers > `NEXT_PUBLIC_SITE_URL` > `localhost:30500`

### Settings Page: Manage Billing Button

- Replaced "contact support" text with action row (descriptive text + button)
- Purple gradient button with CreditCard icon
- Loader2 spinner during portal session creation
- Disabled when `portalLoading` or `!subscriptionTier`
- Error handling via `toast.error()` from sonner
- Redirects browser to Stripe Customer Portal via `window.location.href`

## Decisions Made

1. **Portal return URL** points to `/admin/settings` -- user lands back where they started
2. **Legacy org guard** returns 400 with descriptive error instead of attempting to create a portal session with null customer ID
3. **Origin detection chain** supports white-label subdomains, production, and localhost

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `pnpm tsc --noEmit` passes with zero errors after both tasks
- Both CreditCard and Loader2 icons were already imported in settings page

## Next Phase Readiness

- Portal route is ready for Task 4 (feature gating application) and Task 5 (tier-locked page gating)
- Settings page billing section now has a functional entry point to Stripe
