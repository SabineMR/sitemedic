---
phase: 29-org-onboarding-flow
plan: 02
subsystem: frontend
tags: [signup, onboarding, plan-selection, stripe-checkout, magic-link]

# Dependency graph
requires:
  - phase: 29-01
    provides: POST /api/billing/checkout for org provisioning + Stripe Checkout Session
provides:
  - Unified signup page with plan selection, org details, magic link auth, and Stripe redirect
affects: [29-03 (onboarding page after Stripe payment), 29-04 (trial/subscription management)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "User metadata as cross-redirect state store via signInWithOtp data option"
    - "Multi-step form state machine in single client component"
    - "encodeURIComponent for nested query params in auth callback redirect"

key-files:
  created: []
  modified:
    - web/app/(auth)/signup/page.tsx
    - FEATURES.md

key-decisions:
  - "Pending org data stored in user_metadata (not localStorage) — survives magic link redirect without browser storage dependency"
  - "Contact email auto-fills from account email but remains independently editable"
  - "Step 4 (creating-org) entered via ?step=creating-org query param from auth callback"
  - "?cancelled=true shows info banner and returns to plan selection (not error state)"

patterns-established:
  - "4-step state machine: plan -> details -> email-sent -> creating-org"
  - "Plan data defined as typed constant array with tier, price, features"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 29 Plan 02: Signup Page with Plan Selection & Checkout Flow Summary

**Multi-step signup page with 3-tier plan cards, combined account + org details form, magic link auth storing pending data in user_metadata, and post-auth Stripe Checkout redirect via /api/billing/checkout**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T12:15:15Z
- **Completed:** 2026-02-18T12:20:24Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Complete 4-step onboarding flow replacing simple magic-link signup
- Plan selection UI with Starter/Growth/Enterprise pricing and feature comparison
- Pending org data persisted in user_metadata for cross-redirect survival
- Post-auth step reads metadata and calls checkout API to redirect to Stripe
- Cancellation banner for users returning from Stripe without paying

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild signup page with plan selection and checkout flow** - `c821b78` (feat)

## Files Created/Modified
- `web/app/(auth)/signup/page.tsx` - Complete rewrite from simple magic-link form to 4-step onboarding: plan selection (3 tier cards with pricing/features), details form (account + org sections), email-sent confirmation, creating-org spinner with checkout API call and Stripe redirect. Dark theme matching org setup page.
- `FEATURES.md` - Updated with signup page rebuild documentation

## Decisions Made
- **user_metadata over localStorage:** Pending org data (tier, org name, contact info) stored via `signInWithOtp({ data: {...} })` in user_metadata. This survives the magic link email -> auth callback -> redirect chain without relying on browser storage, which could be cleared or unavailable in cross-device scenarios.
- **Contact email auto-fill:** When user enters their account email, the org contact email auto-fills to match. If user manually changes contact email, it stays independent. This reduces friction for the common case where they're the same.
- **encodeURIComponent for next param:** The auth callback's `?next=` param must be URL-encoded since the signup step URL itself contains query params (`/signup?step=creating-org`). Without encoding, `step=creating-org` would be parsed as a separate top-level param.
- **Cancellation is info, not error:** `?cancelled=true` shows a blue info banner (not red error) since cancellation is a valid user action, not a failure. User is shown plan selection again to retry.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript build error in `lib/queries/client/bookings.ts` (same as 29-01). No impact on signup page — verified clean via `tsc --noEmit` filtering for signup path.

## Next Phase Readiness
- Signup page ready for end-to-end testing with Stripe test mode
- After successful Stripe Checkout, user is redirected to `/onboarding?session_id=...` (29-03 will handle this)
- Cancellation redirects back to `/signup?cancelled=true` which is now handled

---
*Phase: 29-org-onboarding-flow*
*Completed: 2026-02-18*
