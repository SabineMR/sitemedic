---
phase: 19-motorsport-vertical
plan: 01
subsystem: ui
tags: [react-native, watermelondb, supabase, motorsport, concussion, forms, vertical]

# Dependency graph
requires:
  - phase: 18-04
    provides: orgVertical variable in treatment form, vertical_extra_fields WatermelonDB column, event_vertical sync payload field
  - phase: 18-01
    provides: verticalExtraFields @text column on Treatment model (raw JSON string)
provides:
  - MotorsportExtraFields TypeScript interface with full JSONB shape
  - INITIAL_MOTORSPORT_FIELDS default state for treatment form
  - MOTORSPORT_INCIDENT_TYPES and VEHICLE_TYPES enum arrays
  - Motorsport Details section in treatment form (orgVertical === 'motorsport' guarded)
  - MOTO-02 concussion clearance gate blocking form submission
  - MOTO-03 concussion alert inserted into medic_alerts on submission
  - Migration 126 adding motorsport_concussion to alert_type CHECK constraint
affects:
  - 19-02 (cert taxonomy/TreatmentWithWorker — needs motorsport-fields.ts interface)
  - 19-03 (Motorsport UK PDF generator — reads vertical_extra_fields JSON from this plan)
  - Phase 23 (analytics — treatments with event_vertical = 'motorsport' now have structured extra fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vertical extra fields centralised in buildVerticalExtraFields() helper — replaces per-vertical inline ternaries in formValues"
    - "Non-blocking Supabase insert for clinical alerts: try/catch around alert insert, failure logs but does not abort treatment completion"
    - "Boolean toggle pattern: Pressable + state spread update via toggleMotorsportBool(field) helper"
    - "Concussion gate: hard return in handleCompleteTreatment before required field validation"

key-files:
  created:
    - services/taxonomy/motorsport-fields.ts
    - supabase/migrations/126_motorsport_concussion_alert_type.sql
  modified:
    - app/treatment/new.tsx

key-decisions:
  - "buildVerticalExtraFields() helper centralises all vertical JSON serialisation — single function replaces 4 per-vertical ternary chains in formValues and enqueueSyncItem"
  - "Concussion gate placed immediately after cert validation gate and before required field validation — MOTO-02 specifies this is a hard block, not a soft warning"
  - "GCS score stored as number | null (not string) in MotorsportExtraFields — null means not assessed; validated 3-15 at input time in TextInput onChangeText"
  - "motorsport_concussion alert uses treatment.bookingId as the required booking_id FK — alert only created when bookingId is truthy (pre-booked events)"

patterns-established:
  - "Vertical taxonomy file pattern: interface + INITIAL_* constant + as const enum arrays — matches construction, tv_film, festivals patterns"
  - "Non-blocking alert pattern: clinical/admin alert inserts wrapped in try/catch; treatment completion not blocked by alert failure"

# Metrics
duration: 7min
completed: 2026-02-18
---

# Phase 19 Plan 01: Motorsport Form Fields + Concussion Gate Summary

**Motorsport UK-required treatment form fields (GCS, extrication, helmet, circuit section, Clerk of Course, car number) with mandatory three-checkbox concussion clearance gate and non-blocking medic_alerts insert for admin visibility**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-18T04:11:27Z
- **Completed:** 2026-02-18T04:18:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `services/taxonomy/motorsport-fields.ts` with `MotorsportExtraFields` interface, `INITIAL_MOTORSPORT_FIELDS` default state, `MOTORSPORT_INCIDENT_TYPES` (7 types) and `VEHICLE_TYPES` (5 types) enum arrays — satisfies MOTO-01 field definitions
- Added motorsport Details section to treatment form conditional on `orgVertical === 'motorsport'`: competitor car number, circuit section, GCS score (3-15), extrication required, helmet removed at scene, Clerk of Course notified, concussion suspected toggles
- Implemented MOTO-02 concussion clearance panel (HIA conducted, competitor stood down, CMO notified) with hard-return gate in `handleCompleteTreatment` blocking submission when any checkbox is unchecked
- Added MOTO-03 non-blocking `medic_alerts` insert after sync enqueue, guarded by `treatment.bookingId`, wrapped in try/catch
- Created migration 126 adding `motorsport_concussion` to the `medic_alerts.alert_type` CHECK constraint while preserving all 9 original alert types
- Refactored `buildVerticalExtraFields()` helper to centralise all vertical JSON serialisation (replaces per-vertical ternary chains in formValues and enqueueSyncItem)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MotorsportExtraFields interface and taxonomy file** - `85fbd7c` (feat)
2. **Task 2: Add motorsport fields section and concussion gate to treatment form** - `0d5a8c2` (feat — included in prior linter commit)
3. **Task 3: Create concussion alert migration** - `7872768` (feat)

## Files Created/Modified

- `services/taxonomy/motorsport-fields.ts` - MotorsportExtraFields interface, INITIAL_MOTORSPORT_FIELDS, MOTORSPORT_INCIDENT_TYPES, VEHICLE_TYPES
- `app/treatment/new.tsx` - Motorsport section + concussion gate + alert insert + buildVerticalExtraFields() helper
- `supabase/migrations/126_motorsport_concussion_alert_type.sql` - Adds motorsport_concussion to alert_type CHECK constraint

## Decisions Made

- `buildVerticalExtraFields()` helper replaces per-vertical inline ternary chains — single function for all verticals makes auto-save formValues and completion sync payload use the same serialisation logic, eliminating duplication and preventing future drift
- Concussion gate placed immediately after cert validation gate and before required field checks — MOTO-02 specifies it as mandatory, not advisory
- `motorsport_concussion` alert guarded by `treatment.bookingId` being truthy — `medic_alerts.booking_id` is `NOT NULL` in the table definition; walk-in (unlinked) motorsport treatments cannot insert an alert without a booking reference
- GCS score validated at input time (3-15 integer or null) rather than at submission — immediate feedback during form fill is better UX

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed isFootball reference before orgVertical declaration**

- **Found during:** Task 2 (reading app/treatment/new.tsx)
- **Issue:** `const isFootball = orgVertical === 'sporting_events'` was declared at line 86, before `orgVertical` was declared at line 116 — this is a temporal dead zone bug in the existing code
- **Fix:** Comment updated to note states are declared before orgVertical; `isFootball` const moved to after the `orgVertical` declaration (already had the correct placement by the time this plan executed — the linter had resolved it in a prior commit)
- **Files modified:** app/treatment/new.tsx
- **Committed in:** 0d5a8c2 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Existing bug fix, no scope creep.

## Issues Encountered

None — plan executed cleanly. The `new.tsx` file had grown substantially with football and festival vertical additions since the plan was written, requiring careful insertion of motorsport additions without disturbing the existing vertical sections.

## User Setup Required

None — no external service configuration required. The migration (126) must be applied to the Supabase database when deploying to production.

## Next Phase Readiness

- `MotorsportExtraFields` interface ready for Plan 19-02 (TreatmentWithWorker dashboard type)
- `vertical_extra_fields` JSON shape documented in `motorsport-fields.ts` for Plan 19-03 (PDF generator)
- `motorsport_concussion` alert type registered in DB (pending migration application)
- No blockers for Phase 19 Plans 19-02 through 19-05

---
*Phase: 19-motorsport-vertical*
*Completed: 2026-02-18*
