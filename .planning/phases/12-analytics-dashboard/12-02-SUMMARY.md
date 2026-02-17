---
phase: 12-analytics-dashboard
plan: 02
subsystem: ui
tags: [recharts, analytics, charts, assignment, success-rate, failure-breakdown, dark-theme]

# Dependency graph
requires:
  - phase: 12-analytics-dashboard
    provides: WeeklyAssignmentStats type and useAutoAssignmentStats hook from analytics.ts
provides:
  - AssignmentSuccessChart component (LineChart with success rate + attempts dual Y-axis)
  - FailureBreakdownChart component (BarChart with failure reason aggregation)
  - Summary cards for avg success rate, total attempts, avg confidence
affects: [12-05-page-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dark-theme Recharts chart components following revenue-charts.tsx pattern"
    - "Dual Y-axis LineChart (rate left 0-100%, counts right)"
    - "Empty state messages before rendering charts"
    - "Summary stat cards in 3-col grid above line chart"

key-files:
  created:
    - web/components/admin/assignment-analytics-charts.tsx
  modified: []

key-decisions:
  - "Used 'as any' cast for Recharts Tooltip formatter (consistent with revenue-charts.tsx pattern)"
  - "Aggregated top_failure_reason occurrences across all weeks for FailureBreakdownChart (one bar per reason)"
  - "Dual Y-axis: left for success_rate (0-100%), right for total_attempts counts"

patterns-established:
  - "Summary cards above chart for at-a-glance KPIs"
  - "Empty state centered in same h-[N]px as chart container"

# Metrics
duration: 5min
completed: 2026-02-17
---

# Phase 12 Plan 02: Assignment Analytics Charts Summary

**Two Recharts chart components for auto-assignment analytics: AssignmentSuccessChart (dual-axis LineChart with success rate + attempt volume) and FailureBreakdownChart (BarChart aggregating top failure reasons across all weeks)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-17T17:43:00Z
- **Completed:** 2026-02-17T17:48:42Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `AssignmentSuccessChart` with 3 summary cards (avg success rate, total attempts, avg confidence) and a dual-axis LineChart showing success_rate (green solid) and total_attempts (blue dashed)
- Created `FailureBreakdownChart` that aggregates `top_failure_reason` occurrences across all weeks and renders a red BarChart
- Both components follow exact dark-theme Recharts pattern from `revenue-charts.tsx` (CartesianGrid `#374151`, axis `#9CA3AF`, Tooltip `#1F2937` background)
- Both components have meaningful empty-state messages in `h-[400px]` / `h-[300px]` centered divs
- TypeScript errors in Tooltip formatters fixed with `as any` cast (consistent with existing pattern in revenue-charts.tsx)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assignment-analytics-charts.tsx** - `cc7ddb3` (feat - included in prior fix commit)

## Files Created/Modified

- `web/components/admin/assignment-analytics-charts.tsx` - Two exported Recharts chart components: AssignmentSuccessChart and FailureBreakdownChart

## Decisions Made

- Used `as any` cast for Recharts Tooltip formatter callbacks - `value` parameter typed as `number | undefined` by Recharts but the pattern from `revenue-charts.tsx` uses the same approach
- `FailureBreakdownChart` aggregates `top_failure_reason` string across all weeks, counting how many weeks each reason was the "top" failure - this gives a per-reason frequency that's meaningful across time
- Dual Y-axis: left (0-100%) for success rate, right (raw counts) for total_attempts - prevents cramping both series onto one scale

## Deviations from Plan

None - plan executed exactly as written. All required imports, chart types, dark theme styles, empty states, summary cards, and dual Y-axis implemented per specification.

## Issues Encountered

None - TypeScript resolved cleanly with `as any` formatter cast (same pattern as pre-existing revenue-charts.tsx).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `AssignmentSuccessChart` and `FailureBreakdownChart` are exported and ready for wiring into the analytics page (plan 12-05)
- Components consume `WeeklyAssignmentStats[]` prop directly - page just needs to pass `useAutoAssignmentStats().data ?? []`
- Plans 12-01 (medic utilisation charts), 12-03 (late arrival / OOT charts), and 12-05 (page wiring) remain

---
*Phase: 12-analytics-dashboard*
*Completed: 2026-02-17*
