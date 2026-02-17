---
phase: 12-analytics-dashboard
plan: 04
subsystem: api
tags: [tanstack-query, supabase, analytics, auto-assignment, medic-utilisation, late-arrival, out-of-territory]

# Dependency graph
requires:
  - phase: 07.5-territory-auto-assignment
    provides: auto_schedule_logs table with org_id, status, confidence_score, failure_reason columns
  - phase: 05.5-admin-operations
    provides: medics and bookings tables with org_id, utilisation patterns established
  - phase: 06-riddor-auto-flagging
    provides: medic_alerts table with alert_type and org_id columns
provides:
  - TanStack Query hooks for all Phase 12 chart data
  - fetchAutoAssignmentStats + useAutoAssignmentStats (weekly success rate, 12 weeks)
  - fetchMedicUtilisation + useMedicUtilisation (per-medic %, sorted DESC)
  - fetchLateArrivalPatterns + useLateArrivalPatterns (medic+day-of-week grouping)
  - fetchOutOfTerritoryBookings + useOutOfTerritoryBookings (OOT cost and frequency)
affects: [12-analytics-dashboard plans 01-03 and 05 that build UI tabs consuming these hooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.all parallel queries pattern (mirrors medics.ts / territories.ts)"
    - "org_id filter on every Supabase query for multi-tenant isolation"
    - "staleTime 60s / refetchInterval 300s for analytics data (matches territories.ts)"
    - "Empty/zero defaults on all fetch functions — never null/undefined"
    - "ISO week bucketing via getWeekStart + getISOWeekLabel helpers"

key-files:
  created:
    - web/lib/queries/admin/analytics.ts
  modified: []

key-decisions:
  - "Query auto_schedule_logs directly with eq('org_id', orgId) — table has own org_id column, no two-step via bookings"
  - "Medic utilisation uses (bookings_this_week / 5) * 100 capped at 100 — mirrors existing fetchMedicsWithMetrics pattern"
  - "Late arrival worst_day/worst_medic return 'N/A' (not null) when no data"
  - "OOT filter uses .gt('out_of_territory_cost', 0) — not travel_bonus which does not exist as a column"
  - "OOT percentage calculated against total booking count (head: true count query) — avoids loading all booking rows"

patterns-established:
  - "Analytics fetch functions accept (supabase, orgId) params — consistent with fetchRevenueData, fetchTerritoriesWithMetrics"
  - "Hook queryKey format: ['admin', 'analytics', '{feature}', orgId]"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 12 Plan 04: Analytics Query Hooks Summary

**TanStack Query data API layer for Phase 12 analytics dashboard — 4 fetch functions and 4 hooks covering auto-assignment, medic utilisation, late arrivals, and OOT bookings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T17:43:08Z
- **Completed:** 2026-02-17T17:44:55Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `web/lib/queries/admin/analytics.ts` with 630 lines covering all 4 analytics data domains
- All 4 fetch functions follow the revenue.ts / medics.ts pattern: `(supabase, orgId)` params, graceful empty defaults
- All 4 TanStack Query hooks: consistent `staleTime: 60000` / `refetchInterval: 300000`, `orgId` in cache key
- org_id filter on every single Supabase query — multi-tenant isolation guaranteed
- Late arrival summary returns `"N/A"` strings for worst_day/worst_medic when no data (never null)
- OOT query uses `out_of_territory_cost > 0` (correct column) — not `travel_bonus` (doesn't exist)
- TypeScript check confirmed: no errors introduced in the new file (pre-existing errors in other files only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create analytics.ts with 4 fetch functions and 4 hooks** - `09ea13e` (feat)

**Plan metadata:** _(to be added in docs commit)_

## Files Created/Modified

- `web/lib/queries/admin/analytics.ts` — All analytics query hooks and fetch functions for Phase 12 charts

## Decisions Made

- **Direct auto_schedule_logs query**: The plan specified not to do a two-step via bookings. The table has its own `org_id` column, so `from('auto_schedule_logs').eq('org_id', orgId)` is used directly.
- **OOT column**: Used `.gt('out_of_territory_cost', 0)` as instructed. The column `travel_bonus` does not exist on the bookings table.
- **LateArrivalSummary worst_day/worst_medic**: Returns `"N/A"` string (not null) when no alerts exist, to match the plan's explicit requirement.
- **OOT percentage**: Uses a `head: true` count query (no row data loaded) for total bookings — efficient and avoids loading thousands of rows.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation confirmed no new errors in the analytics.ts file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `web/lib/queries/admin/analytics.ts` exports all 8 symbols required by the plan's `artifacts` spec
- Ready for plans 12-01, 12-02, 12-03, and 12-05 to import and consume these hooks in their chart UI components
- All hooks include `orgId` in query key — safe to use across tabs without cache collisions

---
*Phase: 12-analytics-dashboard*
*Completed: 2026-02-17*
