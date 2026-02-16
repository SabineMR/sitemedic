---
phase: 04-web-dashboard
plan: 02
subsystem: ui
tags: [react, nextjs, tanstack-query, shadcn-ui, supabase, dashboard]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dashboard foundation with Supabase SSR auth, shadcn/ui, TanStack Query, responsive sidebar
  - phase: 03-sync-engine
    provides: Mobile sync engine with treatments, near-misses, safety checks syncing to Supabase
  - phase: 02-mobile-core
    provides: Treatment forms, near-miss forms, daily safety checks on mobile app
provides:
  - Traffic-light compliance score (red/amber/green) based on daily checks, follow-ups, certs, RIDDOR deadlines
  - Weekly summary statistics (treatments, near-misses, workers on site, daily checks completed)
  - Server-side data fetching with client-side 60-second polling via TanStack Query
  - Reusable StatCard component for dashboard metrics
  - ComplianceScore component with breakdown details
affects: [04-03-treatments-log, 04-04-near-miss-log, 04-05-worker-profiles]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component fetches initial data, passes to client components with useQuery polling
    - Compliance status calculation (red/amber/green) based on multiple data sources
    - Week-start calculation (Monday 00:00) for weekly stats filtering

key-files:
  created:
    - web/lib/queries/compliance.ts
    - web/components/dashboard/compliance-score.tsx
    - web/components/dashboard/stat-card.tsx
  modified:
    - web/app/(dashboard)/page.tsx

key-decisions:
  - "Use 15-day window for RIDDOR deadline tracking (matches UK HSE reporting requirement)"
  - "Hard-code expiredCerts to 0 (cert tracking deferred to Phase 7)"
  - "Count hospital_referral and sent_home outcomes as overdue follow-ups (7-day window)"
  - "Calculate unique workers from treatments this week (not from workers table)"

patterns-established:
  - "Server-side initial data fetch pattern: await Promise.all([fetch1, fetch2]) → pass to client components"
  - "Traffic-light status calculation: RED (critical), AMBER (attention), GREEN (all clear)"
  - "Week filtering: getWeekStart() returns Monday 00:00 of current week"

# Metrics
duration: 6min
completed: 2026-02-15
---

# Phase 04 Plan 02: Compliance Score & Weekly Stats Summary

**Traffic-light compliance indicator with red/amber/green status plus four weekly stat cards (treatments, near-misses, workers, daily checks) with 60-second polling**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-15T22:07:20Z
- **Completed:** 2026-02-15T22:13:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Traffic-light compliance score evaluates 4 factors: daily check completion, overdue follow-ups, expired certs, RIDDOR deadlines
- Weekly stats dashboard shows treatments, near-misses, workers on site, and daily checks completed
- Server-side initial data fetch eliminates loading state on first render
- Client-side 60-second polling keeps data fresh via TanStack Query

## Task Commits

Each task was committed atomically:

1. **Task 1: Create compliance data queries and weekly stats hooks** - `939d642` (feat)
2. **Task 2: Build compliance score component, stat cards, and overview page** - `b6e9f5f` (feat)

**Plan metadata:** (to be committed at end of execution)

## Files Created/Modified
- `web/lib/queries/compliance.ts` - Server-side compliance and weekly stats queries, client-side useQuery hooks with 60s polling
- `web/components/dashboard/compliance-score.tsx` - Traffic-light indicator (red/amber/green circle) with compliance breakdown details
- `web/components/dashboard/stat-card.tsx` - Reusable stat card component with icon, value, title, description
- `web/app/(dashboard)/page.tsx` - Dashboard overview page composing compliance score and 4 weekly stat cards

## Decisions Made

**D-04-02-001: Use 15-day window for RIDDOR deadline tracking**
- **Context:** UK HSE requires RIDDOR incidents reported within 15 days
- **Decision:** Query `treatments` where `is_riddor_reportable = true AND created_at > NOW() - 15 days`
- **Rationale:** Matches legal reporting window, provides early warning before deadline

**D-04-02-002: Hard-code expiredCerts to 0 (cert tracking deferred to Phase 7)**
- **Context:** Plan specifies cert tracking is Phase 7, no cert data exists yet
- **Decision:** Return `expiredCerts: 0` in compliance data
- **Rationale:** Avoids querying non-existent table, compliance status calculation future-proof

**D-04-02-003: Count hospital_referral and sent_home outcomes as overdue follow-ups (7-day window)**
- **Context:** Plan said "treatments with outcomes requiring follow-up" but didn't specify which outcomes
- **Decision:** Filter by `outcome IN ('hospital_referral', 'sent_home')` created in last 7 days
- **Rationale:** These outcomes require follow-up verification, 7 days reasonable for construction site context

**D-04-02-004: Calculate unique workers from treatments this week (not from workers table)**
- **Context:** "Workers on Site" stat needed - ambiguous whether to count all workers or active workers
- **Decision:** Count distinct `worker_id` from treatments created this week
- **Rationale:** "On site" implies active this week (received treatment), not just registered in system

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully. TypeScript compilation passed. Pre-existing build errors in workers/near-misses pages (from Plan 04-04 and 04-06 work) are unrelated to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Dashboard overview page complete with compliance score and weekly stats. Ready for:
- **Plan 04-03:** Treatment log page (can query treatments table, display in DataTable)
- **Plan 04-04:** Near-miss log page (can query near_misses table, display in DataTable)
- **Plan 04-05:** Worker profiles page (can query workers table, display profiles)

No blockers. All database queries tested and working.

---
*Phase: 04-web-dashboard*
*Completed: 2026-02-15*
