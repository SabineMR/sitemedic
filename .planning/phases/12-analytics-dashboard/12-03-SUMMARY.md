---
phase: 12-analytics-dashboard
plan: "03"
subsystem: ui
tags: [recharts, react, analytics, charts, heatmap, typescript, dark-theme]

# Dependency graph
requires:
  - phase: 12-04
    provides: MedicUtilisation, OOTSummary, LateArrivalSummary types and fetch hooks
provides:
  - MedicUtilisationTable: sortable table with progress bars and status badges
  - OOTBookingsChart: summary cards + horizontal bar chart for out-of-territory bookings
  - LateArrivalHeatmap: CSS grid heatmap by medic and day-of-week
affects: [12-05-analytics-page-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom Recharts tooltip component typed with explicit props interface"
    - "CSS grid heatmap with column template literals for multi-column layout"
    - "useState sort state pattern with toggle direction on repeated column click"
    - "Dark theme: bg-gray-800 cards, bg-gray-900 table headers, border-gray-700"

key-files:
  created:
    - web/components/admin/medic-utilisation-charts.tsx
  modified: []

key-decisions:
  - "Used medic_id as Y-axis key in OOT bar chart — OutOfTerritoryBooking type has no medic_name; custom tooltip shows the ID clearly"
  - "Heatmap maps only Mon–Fri (indices 1–5) — weekend late arrivals not operationally relevant for shift-based medics"
  - "Local getUtilColour/getUtilTextColour helpers defined in-file rather than importing from medics.ts — avoids coupling UI chart file to query layer"
  - "OOT bar chart layout=vertical with left margin 120px for medic_id labels"

patterns-established:
  - "Custom tooltip pattern: separate typed interface component for Recharts content prop"
  - "Heatmap pattern: CSS grid with named constant column widths via gridTemplateColumns inline style"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 12 Plan 03: Medic Utilisation Charts Summary

**Three dark-theme analytics chart components — sortable utilisation table with progress bars, OOT bookings bar chart with summary cards, and CSS-grid late-arrival heatmap by medic/weekday**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T17:47:39Z
- **Completed:** 2026-02-17T17:50:07Z
- **Tasks:** 1 (single implementation task)
- **Files modified:** 1

## Accomplishments

- `MedicUtilisationTable`: sortable by utilisation %, medic name, or total shifts; progress bar with green (<50%) / yellow (50–80%) / red (>80%) colour coding; Available/Unavailable status badges; dark theme with hover states
- `OOTBookingsChart`: 3-column summary cards (total OOT bookings, total extra cost in £, OOT percentage); horizontal Recharts BarChart showing top 10 by out_of_territory_cost with orange bars; custom typed tooltip showing medic_id, site_postcode, shift_date, cost, and human-readable type label (Travel Bonus / Room & Board); empty state message
- `LateArrivalHeatmap`: CSS grid layout with medic name column + Mon/Tue/Wed/Thu/Fri columns; 4-tier colour scale (0=gray-800, 1–2=yellow/20, 3–5=orange/30, 6+=red/40); summary stats row (total late arrivals, worst day, worst medic); legend; empty state message

## Task Commits

1. **Task 1: Create medic-utilisation-charts.tsx** - `52e6dd8` (feat)

## Files Created/Modified

- `web/components/admin/medic-utilisation-charts.tsx` - Three exported components: MedicUtilisationTable, OOTBookingsChart, LateArrivalHeatmap

## Decisions Made

- **medic_id as OOT Y-axis key**: `OutOfTerritoryBooking` type has no `medic_name` field (only `medic_id`). Used `medic_id` as the dataKey and displayed it prominently in the custom tooltip. Plan 12-05 page wiring can pre-join names if needed.
- **Local colour helpers**: Defined `getUtilColour` and `getUtilTextColour` inline rather than importing from `medics.ts` to keep chart component self-contained and avoid coupling to query layer.
- **Heatmap only Mon–Fri**: Weekend days (0=Sun, 6=Sat) excluded since medic shifts are Mon–Fri only; late arrivals on weekend would not be operationally generated.
- **OOT bar chart layout**: Used `layout="vertical"` (horizontal bars) with 120px left margin to accommodate medic ID labels on Y-axis.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] medic_name not available on OutOfTerritoryBooking type**

- **Found during:** Task 1 (writing OOTBookingsChart)
- **Issue:** Plan specified `medic_name` on Y-axis, but `OutOfTerritoryBooking` interface only has `medic_id` — no name field exists in the analytics type
- **Fix:** Used `medic_id` as the Y-axis `dataKey` and as the primary label in the custom tooltip. The tooltip also shows `site_postcode` and `shift_date` for context. Plan 12-05 (page wiring) can enrich data if needed.
- **Files modified:** web/components/admin/medic-utilisation-charts.tsx
- **Verification:** TypeScript compiles with zero errors in the new file

---

**Total deviations:** 1 auto-handled (data field mismatch handled gracefully)
**Impact on plan:** No scope creep. Chart works correctly with available data.

## Issues Encountered

None — TypeScript check passed with zero errors in the new file. Pre-existing errors in other files (contracts, payouts, platform/revenue) are unrelated to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `MedicUtilisationTable`, `OOTBookingsChart`, and `LateArrivalHeatmap` are ready to import in plan 12-05 (analytics/page.tsx wiring)
- All three components export named exports with correct prop types matching the analytics query types from plan 12-04
- No blockers

---
*Phase: 12-analytics-dashboard*
*Completed: 2026-02-17*
