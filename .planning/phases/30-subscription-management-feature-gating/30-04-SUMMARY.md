---
phase: 30-subscription-management-feature-gating
plan: 04
subsystem: platform-admin
tags: [mrr, subscriptions, dashboard, platform-admin]
dependency-graph:
  requires: [24-03, 25-02]
  provides: [platform-mrr-dashboard, subscription-overview]
  affects: [30-05]
tech-stack:
  added: []
  patterns: [client-side-mrr-calculation, tier-price-constants]
key-files:
  created:
    - web/app/platform/subscriptions/page.tsx
  modified:
    - web/app/platform/layout.tsx
    - FEATURES.md
decisions:
  - id: "30-04-mrr-local"
    decision: "MRR calculated from tier price constants, not Stripe API"
    reason: "Avoids Stripe rate limits and latency; tier prices are fixed per plan"
  - id: "30-04-null-defaults"
    decision: "NULL tier defaults to starter, NULL status defaults to active"
    reason: "Matches 24-05 convention — legacy orgs without Stripe get access granted"
  - id: "30-04-past-due-in-mrr"
    decision: "Past-due orgs included in MRR calculation"
    reason: "Dunning period means payment is expected; excluding would undercount revenue"
metrics:
  duration: "~3 min"
  completed: "2026-02-18"
---

# Phase 30 Plan 04: Platform Admin Subscriptions / MRR Dashboard Summary

**One-liner:** Platform admin MRR dashboard with per-tier breakdown, at-risk/churned metrics, and searchable org subscription table — all from local DB, no Stripe API.

## What Was Done

### Task 1: Create platform admin subscriptions/MRR dashboard
- **File:** `web/app/platform/subscriptions/page.tsx` (484 lines)
- **Commit:** `76756d5`
- Fetches all orgs from `organizations` table with subscription fields
- Calculates MRR using hardcoded tier prices: Starter £149, Growth £299, Enterprise £599
- NULL tier defaults to `'starter'`, NULL status defaults to `'active'`
- Past-due orgs included in MRR (dunning period), cancelled excluded
- 4 summary cards: Total MRR (green, with ARR), Active Orgs, At Risk (yellow), Churned (red)
- 3 tier breakdown cards: Starter (gray), Growth (blue), Enterprise (purple) with count + MRR
- Searchable org table: name, tier badge, status badge, per-org MRR, joined date
- Skeleton loading state matching platform page patterns
- Empty state for no results

### Task 2: Add Subscriptions nav item to platform sidebar
- **File:** `web/app/platform/layout.tsx`
- **Commit:** `df94350` (already applied in prior commit)
- Added `CreditCard` import from lucide-react
- Added Subscriptions nav item between Organizations and Revenue
- Links to `/platform/subscriptions`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| MRR from local price constants, not Stripe | Avoids API calls/rate limits; tier prices are fixed |
| NULL tier = starter, NULL status = active | Matches 24-05 convention for legacy orgs |
| Past-due included in MRR | Dunning period expects recovery; excluding undercounts |
| Cancelled excluded from MRR | No longer contributing; shown as Churned metric instead |

## Deviations from Plan

None — plan executed exactly as written.

Note: Task 2 changes (CreditCard import + Subscriptions nav item) were already present in commit `df94350` from a prior session, so no separate commit was needed.

## Verification

- `pnpm tsc --noEmit` passes clean after both tasks
- Page renders with purple gradient theme matching other platform pages
- All 4 must-have truths satisfied:
  1. Platform admin can navigate to Subscriptions from sidebar
  2. Page shows all org subscriptions with tier, status, and MRR
  3. Aggregate MRR summary with total and per-tier breakdown
  4. MRR calculated from local DB, not Stripe API

## Next Phase Readiness

- No blockers for 30-05
- MRR dashboard provides visibility into subscription health for platform admins
- Price constants can be refactored to shared config if needed by future plans
