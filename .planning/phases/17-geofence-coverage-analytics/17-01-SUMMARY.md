---
phase: 17-geofence-coverage-analytics
plan: 01
subsystem: ui
tags: [tanstack-query, geofences, analytics, react, supabase]

# Dependency graph
requires:
  - phase: 13-geofence-ux-polish
    provides: geofences table with booking_id nullable (migration 119), admin geofences page
provides:
  - TanStack Query hook useGeofenceCoverage with 60s polling
  - GeofenceCoverageCard stat card on admin geofences page
  - Geofence coverage percentage calculation (covered/total active bookings)
affects:
  - future geofence phases
  - v1.1-milestone-audit (closes GAP-3)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parallel Supabase queries via Promise.all with client-side Set intersection for deduplication"
    - "useRequireOrg() + createClient() + refetchInterval: 60_000 pattern (same as useAdminOverview)"

key-files:
  created:
    - web/lib/queries/admin/geofences.ts
  modified:
    - web/app/admin/geofences/page.tsx

key-decisions:
  - "Client-side Set intersection chosen over SQL JOIN to avoid double-counting bookings with multiple geofences"
  - "Color-coded card: gray (no active bookings), blue (partial coverage), green (full coverage)"
  - "GeofenceCoverageCard defined inside page file (not separate component file) per plan spec"

patterns-established:
  - "GeofenceCoverageCard: loading skeleton → label string → color-coded card"

# Metrics
duration: 2.5min
completed: 2026-02-17
---

# Phase 17 Plan 01: Geofence Coverage Analytics Summary

**TanStack Query hook with 60s polling and color-coded stat card showing active booking site geofence coverage percentage on admin geofences page**

## Performance

- **Duration:** 2.5 min
- **Started:** 2026-02-17T20:58:37Z
- **Completed:** 2026-02-17T21:01:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `useGeofenceCoverage` hook with parallel queries on `bookings` and `geofences` tables, org-scoped, 60s refetch
- `fetchGeofenceCoverage` uses client-side Set intersection to avoid double-counting bookings with multiple geofences
- `GeofenceCoverageCard` renders above geofence list with three visual states: gray (no active bookings), blue (partial), green (full)
- Build passes with zero new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Query hook for geofence coverage** - `956cc2a` (feat)
2. **Task 2: Add GeofenceCoverageCard to admin geofences page** - `8ed0ee9` (feat)

## Files Created/Modified
- `web/lib/queries/admin/geofences.ts` - GeofenceCoverage interface, fetchGeofenceCoverage function, useGeofenceCoverage hook
- `web/app/admin/geofences/page.tsx` - Added Shield import, useGeofenceCoverage import, GeofenceCoverageCard component, rendered between header and form

## Decisions Made
- Client-side Set intersection avoids double-counting: if a booking has 2 geofences, it still counts as 1 covered booking
- `.not('booking_id', 'is', null)` filter excludes org-level geofences (added in migration 119) from the numerator
- Active booking denominator: `status IN ('confirmed', 'in_progress') AND shift_date >= TODAY`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GAP-3 from v1.1-MILESTONE-AUDIT.md is now closed
- The coverage stat card is ready; future plans could add coverage trend charting or per-booking coverage indicators
- No blockers

---
*Phase: 17-geofence-coverage-analytics*
*Completed: 2026-02-17*
