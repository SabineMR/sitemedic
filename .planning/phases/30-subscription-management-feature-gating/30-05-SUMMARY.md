---
phase: 30-subscription-management-feature-gating
plan: 05
subsystem: subscription-enforcement
tags: [middleware, suspension, stripe-portal, redirect]
dependency_graph:
  requires: [30-03]
  provides: [subscription-suspension-enforcement, suspended-page]
  affects: []
tech_stack:
  added: []
  patterns: [middleware-subscription-gating, single-query-multi-check]
key_files:
  created:
    - web/app/suspended/page.tsx
  modified:
    - web/lib/supabase/middleware.ts
    - FEATURES.md
decisions:
  - id: "30-05-01"
    decision: "Check subscription_status === 'cancelled' only (not !== 'active')"
    reason: "NULL status (legacy orgs) and past_due must pass through; only cancelled means suspended"
  - id: "30-05-02"
    decision: "Extend existing onboarding query instead of adding new DB call"
    reason: "Avoids extra latency on every middleware request; single SELECT with two columns"
  - id: "30-05-03"
    decision: "/suspended not added to publicRoutes"
    reason: "User must be authenticated to see suspension page — prevents info leak"
metrics:
  duration: ~11 min
  completed: 2026-02-18
---

# Phase 30 Plan 05: Subscription Suspension Enforcement Summary

Middleware redirects cancelled-subscription orgs to /suspended page with data-safe messaging and Stripe portal reactivation button; single query extension, no redirect loops, legacy NULL orgs unaffected.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add suspension check to middleware | 2534973 | Extended SELECT to include subscription_status; added isSuspendedRoute detection; redirect cancelled orgs to /suspended after onboarding checks |
| 2 | Create /suspended page with reactivation path | 181de42 | Client component with ShieldOff icon, data preservation callout, Stripe portal reactivation button, contact support link, log out button |

## Verification Results

- `pnpm tsc --noEmit`: No errors in modified files (pre-existing contact page TS errors unrelated)
- Middleware flow order verified: query -> onboarding check -> onboarding-completed check -> suspension check
- No redirect loop: isSuspendedRoute check prevents /suspended -> /suspended cycle
- NULL subscription_status passes through (legacy org safety)

## Decisions Made

### 30-05-01: Only block 'cancelled' status
Checking `=== 'cancelled'` instead of `!== 'active'` ensures:
- Legacy orgs with NULL subscription_status continue working
- Past-due orgs (in dunning period) retain access
- Only explicitly cancelled orgs are suspended

### 30-05-02: Single query extension
The existing middleware onboarding query already hits organizations table. Extended `.select('onboarding_completed')` to `.select('onboarding_completed, subscription_status')` — zero additional latency.

### 30-05-03: Authenticated-only /suspended page
The /suspended route is NOT in publicRoutes. Users must be authenticated to see it. This prevents unauthenticated users from discovering org suspension status.

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 30 is now complete (5/5 plans). All subscription management and feature gating infrastructure is in place:
- Feature gates (30-01)
- Webhook handling (30-02 via 25-03)
- Stripe Customer Portal (30-03)
- Platform admin MRR dashboard (30-04)
- Subscription suspension enforcement (30-05)
