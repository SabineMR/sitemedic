---
phase: 23-analytics-heat-maps-and-trend-charts
plan: 04
subsystem: ui
tags: [recharts, tanstack-query, date-fns, analytics, compliance, supabase]

# Dependency graph
requires:
  - phase: 23-01
    provides: compliance_score_history table + unique index on (org_id, vertical, period_start); writer Edge Function
  - phase: 23-02
    provides: AnalyticsSubNav component, heat-map page pattern, useNearMissGeoData hook pattern
provides:
  - useComplianceHistory hook (compliance_score_history, vertical='general', 52-week limit, RLS-scoped)
  - useIncidentFrequency hook (parallel treatments + near_misses fetch, weekly bucket by ISO week Monday-start)
  - ComplianceScoreChart component (LineChart, 0-100, amber/red ReferenceLine thresholds)
  - IncidentFrequencyChart component (AreaChart, treatments + near-misses two-series)
  - /analytics/compliance page with AnalyticsSubNav and both charts lazy-loaded ssr:false
affects:
  - 23-05 (future analytics plans referencing the compliance page pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chart hooks: fetch internally, no prop drilling — component calls hook directly (same as NearMissHeatMap pattern)"
    - "Dynamic import with named export unwrap: .then(m => ({ default: m.ComponentName })) for non-default exports"
    - "Parallel Supabase fetch: Promise.all([supabase.from(...), supabase.from(...)]) for independent tables"
    - "Weekly bucketing: startOfWeek(date, { weekStartsOn: 1 }) key + Map for O(n) grouping"
    - "ReferenceLine thresholds: amber=70 / red=40 matching compliance_score_history formula v1 tiers"

key-files:
  created:
    - web/lib/queries/analytics/compliance-history.ts
    - web/components/analytics/ComplianceScoreChart.tsx
    - web/components/analytics/IncidentFrequencyChart.tsx
    - web/app/(dashboard)/analytics/compliance/page.tsx
  modified: []

key-decisions:
  - "23-04: chart hooks fetch data internally (no props) — consistent with NearMissHeatMap self-contained pattern from 23-02"
  - "23-04: IncidentFrequencyChart queries near_misses with .is('deleted_at', null) — all non-deleted rows count regardless of GPS coordinates"
  - "23-04: week_label uses format(weekDate, \"'W'I MMM\") from date-fns — gives 'W7 Feb' style matching revenue hook getISOWeek output style"
  - "23-04: compliance page uses dynamic import with .then(m => ({ default: m.NamedExport })) to SSR-disable named exports"

patterns-established:
  - "Analytics chart pages: dark bg-gray-800 card per chart, border-gray-700, p-6, two stacked full-width sections"
  - "ReferenceLine amber/red threshold pattern for compliance charts: y=70 amber, y=40 red, strokeDasharray='4 4'"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 23 Plan 04: Compliance & Incident Trend Charts Summary

**Recharts LineChart compliance score trend + AreaChart incident frequency on /analytics/compliance, both with internal TanStack Query hooks bucketing 12 months of weekly data**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T05:31:35Z
- **Completed:** 2026-02-18T05:33:01Z
- **Tasks:** 2
- **Files modified:** 4 created

## Accomplishments
- useComplianceHistory hook queries compliance_score_history (vertical='general', 52-week limit, chronological) with 10-min staleTime
- useIncidentFrequency hook parallel-fetches treatments + near_misses for last 12 months, buckets by ISO week (Monday start), returns IncidentFrequencyPoint[] sorted ASC
- ComplianceScoreChart: LineChart 0–100 Y-axis, amber ReferenceLine at 70, red at 40, both dashed
- IncidentFrequencyChart: AreaChart with two overlapping areas (blue=treatments, amber=near-misses) at 0.3 fillOpacity
- /analytics/compliance page matches heat-map page styling: dark theme, AnalyticsSubNav for cross-page navigation, both charts lazy-loaded with ssr:false

## Task Commits

Each task was committed atomically:

1. **Task 1: Create compliance-history query hooks** - `ad66c8a` (feat)
2. **Task 2: Create charts + compliance page** - `e22c5f6` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `web/lib/queries/analytics/compliance-history.ts` - useComplianceHistory + useIncidentFrequency TanStack Query hooks
- `web/components/analytics/ComplianceScoreChart.tsx` - LineChart with threshold ReferenceLine for compliance scores
- `web/components/analytics/IncidentFrequencyChart.tsx` - AreaChart for treatments + near-misses weekly frequency
- `web/app/(dashboard)/analytics/compliance/page.tsx` - Compliance page with AnalyticsSubNav and both charts

## Decisions Made
- Chart hooks fetch data internally (no prop drilling) — consistent with NearMissHeatMap self-contained pattern from 23-02
- IncidentFrequencyChart queries near_misses with `.is('deleted_at', null)` — all non-deleted rows count regardless of GPS
- week_label uses `format(weekDate, "'W'I MMM")` — gives "W7 Feb" style, compact for chart X-axis
- Dynamic import uses `.then(m => ({ default: m.ComplianceScoreChart }))` to unwrap named exports for ssr:false

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- /analytics/compliance page live with both charts; data will populate automatically as compliance_score_history writer runs weekly
- ANLT-04 (ComplianceScoreChart) and ANLT-05 (IncidentFrequencyChart) ready to close
- Phase 23 analytics front-end plans 23-03 and 23-04 are both wave-2 parallel completes; 23-05 (if any) can proceed

---
*Phase: 23-analytics-heat-maps-and-trend-charts*
*Completed: 2026-02-18*
