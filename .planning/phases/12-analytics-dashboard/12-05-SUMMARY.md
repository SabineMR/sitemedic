---
phase: 12-analytics-dashboard
plan: "05"
subsystem: ui
tags: [next.js, react, tanstack-query, recharts, leaflet, dynamic-import]

# Dependency graph
requires:
  - phase: 12-analytics-dashboard plan 12-01
    provides: territory analytics chart components (TerritoryHeatmap, HiringTriggerCards, CoverageGapTable)
  - phase: 12-analytics-dashboard plan 12-02
    provides: assignment analytics chart components (AssignmentSuccessChart, FailureBreakdownChart)
  - phase: 12-analytics-dashboard plan 12-03
    provides: medic utilisation chart components (MedicUtilisationTable, OOTBookingsChart, LateArrivalHeatmap)
  - phase: 12-analytics-dashboard plan 12-04
    provides: analytics query hooks (useAutoAssignmentStats, useMedicUtilisation, useOutOfTerritoryBookings, useLateArrivalPatterns) and types (OOTSummary, LateArrivalSummary)
provides:
  - Fully wired analytics page with 7 tabs: overview, medics, geofences, alerts, territory, assignments, utilisation
  - TerritoryTab sub-component consuming useTerritories + territory chart components
  - AssignmentsTab sub-component consuming useAutoAssignmentStats + assignment chart components
  - UtilisationTab sub-component consuming useMedicUtilisation + useOutOfTerritoryBookings + useLateArrivalPatterns
  - Dynamic import of territory-map with SSR disabled and skeleton loading state
  - Null-safe fallback for new tabs when legacy metrics data not yet loaded
affects:
  - admin analytics page users (7 tabs now visible)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sub-component tab isolation: each new tab is a separate function component that owns its own TanStack Query hooks, so loading states are independent"
    - "isNewTab guard: legacy loading/error gates bypassed when user selects territory/assignments/utilisation tabs — prevents blocking new tabs on legacy data fetch"
    - "Dynamic import with ssr:false for Leaflet map — consistent with prior territory map usage"

key-files:
  created: []
  modified:
    - web/app/admin/analytics/page.tsx

key-decisions:
  - "D-12-05-001: Guard legacy loading/error state with isNewTab flag — new tabs use TanStack Query independently and must not be blocked by the legacy useEffect fetch"
  - "D-12-05-002: metrics period header rendered conditionally (metrics && ...) — new tabs work even when legacy metrics view fails to load"
  - "D-12-05-003: Tab bar uses flex-wrap to handle 7 tabs without horizontal overflow on narrower screens"

patterns-established:
  - "Tab sub-components: isolate each tab into its own function component to keep main component clean and each tab's hooks scoped"

# Metrics
duration: 8min
completed: 2026-02-17
---

# Phase 12 Plan 05: Wire Analytics Page Tabs Summary

**Territory, assignments, and utilisation tabs wired into analytics page with 3 isolated sub-components and SSR-safe dynamic map import**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-17T18:00:00Z
- **Completed:** 2026-02-17T18:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Extended `web/app/admin/analytics/page.tsx` from 4 tabs to 7 tabs (overview, medics, geofences, alerts, territory, assignments, utilisation)
- Added `TerritoryTab`, `AssignmentsTab`, and `UtilisationTab` sub-components before the main export — each owns its own TanStack Query hooks for independent data loading
- Added `dynamic()` import of `territory-map` with `ssr: false` so Leaflet (browser-only) does not crash during SSR
- Updated `activeTab` state type union to include `'territory' | 'assignments' | 'utilisation'`
- Added `isNewTab` guard so legacy `loading`/`!metrics` gates do not block the three new tabs
- Made the period header conditional (`metrics && ...`) so it renders gracefully even when new tab is active before legacy data loads
- Added `flex-wrap` to tab bar to handle 7 tabs cleanly on narrower screens
- Zero changes to existing overview, medics, geofences, and alerts tab code

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire territory, assignments, and utilisation tabs** - `74e84b4` (feat)

**Plan metadata:** (included in task commit)

## Files Created/Modified

- `web/app/admin/analytics/page.tsx` - Added 3 sub-tab components, dynamic map import, extended activeTab type, isNewTab guard, 3 new tab conditionals

## Decisions Made

- D-12-05-001: Guard legacy loading/error state with `isNewTab` flag — new tabs use TanStack Query independently and must not be blocked by the legacy `useEffect` fetch
- D-12-05-002: `metrics` period header rendered conditionally — new tabs work even when legacy metrics view fails to load
- D-12-05-003: Tab bar uses `flex-wrap` to handle 7 tabs without horizontal overflow on narrower screens

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] isNewTab guard added to prevent legacy loading state blocking new tabs**

- **Found during:** Task 1 implementation
- **Issue:** The original page had early-return guards (`if (loading)` and `if (!metrics)`) that would prevent new tabs from rendering while the legacy `useEffect` was fetching from database views. Since new tabs use TanStack Query hooks (not the legacy fetch), they would be blocked unnecessarily.
- **Fix:** Added `isNewTab` boolean computed from `activeTab`, and included it in the loading/error conditions: `if (loading && !isNewTab)` and `if (!metrics && !isNewTab)`. Also made the period header conditional so it doesn't crash when `metrics` is null and a new tab is active.
- **Files modified:** web/app/admin/analytics/page.tsx
- **Verification:** TypeScript passes, logic verified by code review
- **Committed in:** 74e84b4

---

**Total deviations:** 1 auto-fixed (1 bug — legacy guard blocking new tabs)
**Impact on plan:** Essential fix for correct tab behaviour. No scope creep.

## Issues Encountered

The Next.js build failed on a pre-existing error in `web/app/api/contracts/create/route.ts` (`Cannot find name 'user'`) — this is unrelated to the analytics page changes and was pre-existing before this plan. The TypeScript check (`tsc --noEmit`) confirmed no errors in `analytics/page.tsx`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 (Analytics Dashboard) is now fully complete: all 5 plans executed (12-01 through 12-05)
- All chart components built and wired into the analytics page
- Territory, assignments, and utilisation analytics are live in the admin dashboard
- Pre-existing build error in contracts route should be fixed in a separate task

---
*Phase: 12-analytics-dashboard*
*Completed: 2026-02-17*
