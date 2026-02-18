---
phase: 23-analytics-heat-maps-and-trend-charts
plan: 07
subsystem: ui
tags: [react-native, motorsport, treatment-form, gap-closure, competitor-clearance]

# Dependency graph
requires:
  - phase: 19-motorsport-vertical
    provides: MotorsportExtraFields interface, INITIAL_MOTORSPORT_FIELDS, toggleMotorsportBool helper, clearanceCheckbox styles
  - phase: 19-04
    provides: competitor_cleared_to_return field in taxonomy and dashboard badge check
provides:
  - "competitor_cleared_to_return toggle checkbox in app/treatment/new.tsx motorsport section"
  - "Medic UI to mark competitor as cleared to return after concussion protocol"
affects:
  - dashboard — 'Concussion clearance required' badge (treatments-columns.tsx line 109) can now be cleared

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gap closure: UI toggle added outside conditional gate so field is independently settable"
    - "Reuse of existing clearanceCheckbox styles and toggleMotorsportBool helper for new checkbox"

key-files:
  created: []
  modified:
    - app/treatment/new.tsx

key-decisions:
  - "23-07: competitor_cleared_to_return checkbox placed OUTSIDE concussion_suspected gate — visible for all motorsport treatments, not just concussion-suspected ones"
  - "23-07: No change to buildVerticalExtraFields() — field already in INITIAL_MOTORSPORT_FIELDS, JSON.stringify(motorsportFields) covers it automatically"
  - "23-07: Concussion clearance gate (lines 420-431) left unchanged — still checks only hia_conducted, competitor_stood_down, cmo_notified"

patterns-established:
  - "Gap closure pattern: identify fields defined in taxonomy but missing UI toggle; add toggle outside conditional gates"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 23 Plan 07: Competitor Clearance UI Toggle Summary

**Gap-closure checkbox added to motorsport treatment form so medics can mark competitor_cleared_to_return=true, resolving the permanent 'Concussion clearance required' dashboard badge**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-18T06:23:48Z
- **Completed:** 2026-02-18T06:24:34Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Added "Competitor cleared to return to race" checkbox (MOTO-07) to the motorsport section of the treatment form
- Checkbox is positioned outside the `concussion_suspected` gate — appears for ALL motorsport treatments
- Field value flows into `vertical_extra_fields` JSONB automatically via existing `JSON.stringify(motorsportFields)` in `buildVerticalExtraFields()`
- Concussion clearance gate left completely unchanged (still only checks hia_conducted, competitor_stood_down, cmo_notified)
- Dashboard "Concussion clearance required" badge (treatments-columns.tsx line 109) can now be resolved

## Task Commits

Each task was committed atomically:

1. **Task 1: Add competitor_cleared_to_return checkbox to motorsport section** - `747f06e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/treatment/new.tsx` - Added MOTO-07 Pressable checkbox (lines 1112-1127) outside concussion gate, using existing clearanceCheckbox styles and toggleMotorsportBool helper

## Decisions Made

- Checkbox placed OUTSIDE `{motorsportFields.concussion_suspected && (...)}` gate so it is independently settable regardless of concussion protocol status
- No new styles or helpers needed — reused `styles.clearanceCheckbox`, `styles.clearanceCheckboxChecked`, `styles.clearanceCheckboxText`, `styles.clearanceCheckboxTextChecked` and `toggleMotorsportBool`
- `buildVerticalExtraFields()` not modified — `competitor_cleared_to_return` is already in `INITIAL_MOTORSPORT_FIELDS`, so `JSON.stringify(motorsportFields)` captures it automatically

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `web/lib/invoices/pdf-generator.ts` are unrelated to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP Flow 3 closed: `competitor_cleared_to_return` field now has a full round-trip — taxonomy definition → INITIAL state → UI toggle → JSON payload → dashboard badge resolution
- No blockers

---
*Phase: 23-analytics-heat-maps-and-trend-charts*
*Completed: 2026-02-18*
