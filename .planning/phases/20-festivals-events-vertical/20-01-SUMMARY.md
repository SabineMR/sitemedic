---
phase: 20-festivals-events-vertical
plan: 01
subsystem: ui
tags: [festivals, triage, purple-guide, vertical, treatment-form, watermelondb, sync]

# Dependency graph
requires:
  - phase: 18-vertical-infrastructure-riddor-fix
    provides: orgVertical variable in new.tsx, verticalExtraFields WatermelonDB column, vertical_extra_fields Supabase column, enqueueSyncItem with vertical_extra_fields key
  - phase: 21-tv-film-vertical
    provides: Film/TV form pattern (orgVertical guard, formValues serialization) — festival section follows same pattern
provides:
  - Festival-specific treatment form section (section 5b, Purple Guide — Event Triage)
  - TST triage priority picker (P1/P2/P3/P4) — required field
  - Alcohol/substance involvement toggle flag
  - Safeguarding concern toggle flag
  - Attendee disposition picker (discharged on site / transferred to hospital / refused treatment) — required field
  - RIDDOR banner suppression for festivals vertical
  - Festival fields serialized to vertical_extra_fields JSON for Supabase sync
affects:
  - 20-03 (Purple Guide PDF) — reads triage_priority, alcohol_substance, safeguarding_concern, disposition from vertical_extra_fields JSON
  - 20-04 (festival compliance) — may use triage_priority for compliance scoring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Festival form section rendered conditionally on orgVertical === 'festivals' — same guard pattern as Film/TV"
    - "Toggle buttons use existing treatmentTypeButton/treatmentTypeButtonSelected styles — no new styles needed"
    - "BottomSheetPicker for triage and disposition modals — same pattern as existing pickers"
    - "Festival extra fields serialized in 3 places: formValues (auto-save), treatment.update (WatermelonDB), enqueueSyncItem body (sync)"

key-files:
  created: []
  modified:
    - app/treatment/new.tsx

key-decisions:
  - "Festival state variable names prefixed with 'festival' (festivalAlcoholSubstanceFlag, festivalSafeguardingFlag) to avoid collision with existing football spectator flags (alcoholInvolvement, safeguardingFlag)"
  - "TRIAGE_PRIORITIES and FESTIVAL_DISPOSITIONS declared inside component function — matches FILM_TV_PATIENT_ROLES convention already in file"
  - "RIDDOR gate uses orgVertical !== 'festivals' inline in handleInjuryTypeSelect — consistent with 18-02 NON_RIDDOR_VERTICALS pattern but applied at the treatment form level"
  - "Festival fields written to verticalExtraFields in 3 places (formValues for auto-save, treatment.update for WatermelonDB, enqueueSyncItem for sync) — ensures consistency regardless of timing"

patterns-established:
  - "FEST-01: Triage priority P1-P4 as required dropdown, blocks completion if empty"
  - "FEST-02: Binary flags (alcohol/substance, safeguarding) as toggle pressables using existing treatmentTypeButton styles"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 20 Plan 01: Festival Form Fields Summary

**TST triage priority (P1–P4), alcohol/substance + safeguarding toggles, and attendee disposition added to treatment form under section 5b (Purple Guide), with RIDDOR banner suppressed for festivals vertical**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T04:12:09Z
- **Completed:** 2026-02-18T04:14:13Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Festival treatment form section (section 5b "Purple Guide — Event Triage") renders exclusively when `orgVertical === 'festivals'`
- TST triage priority picker (P1/P2/P3/P4) is a required field — blocks form completion if empty
- Alcohol/substance involvement and safeguarding concern as toggle buttons — same UX pattern as treatment type multi-select
- Attendee disposition picker (discharged on site / transferred to hospital / refused treatment) is a required field
- All 4 festival fields written to `vertical_extra_fields` JSON string via auto-save, WatermelonDB record update, and sync payload
- RIDDOR warning banner suppressed for festivals (`orgVertical !== 'festivals'` gate in `handleInjuryTypeSelect`) — RIDDOR still fires for construction, tv_film, general

## Task Commits

Each task was committed atomically:

1. **Task 1: Add festival form fields, validation, RIDDOR banner gate, and sync payload wiring** - `c193b10` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/treatment/new.tsx` — Festival-specific state variables, constants (TRIAGE_PRIORITIES, FESTIVAL_DISPOSITIONS), conditional form section 5b, BottomSheetPicker modals for triage and disposition, RIDDOR gate, festival validation, verticalExtraFields serialization in formValues + treatment.update + enqueueSyncItem

## Decisions Made

- Named state variables with `festival` prefix (`festivalAlcoholSubstanceFlag`, `festivalSafeguardingFlag`) to avoid collision with existing football spectator variables (`alcoholInvolvement`, `safeguardingFlag`) that already exist in the file for the `sporting_events` vertical
- RIDDOR gate applied at `handleInjuryTypeSelect` level in `new.tsx` — consistent with Phase 18-02's NON_RIDDOR_VERTICALS pattern at the detector level; the form-level gate ensures the UI banner is suppressed even if detector logic changes
- Festival extra fields serialized in three places (formValues for auto-save, treatment.update for WatermelonDB record, enqueueSyncItem body for sync) — ensures the latest form state is captured at each persistence boundary

## Deviations from Plan

None — plan executed exactly as written.

The only notable observation: `TRIAGE_PRIORITIES` and `FESTIVAL_DISPOSITIONS` were placed inside the component function (matching the existing `FILM_TV_PATIENT_ROLES` convention) rather than as module-level constants as the plan suggested. This is stylistically consistent with the file and causes no functional difference.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- FEST-01 and FEST-02 satisfied: triage priority, alcohol/substance flag, safeguarding flag, and disposition are all wired
- `vertical_extra_fields` JSON keys (`triage_priority`, `alcohol_substance`, `safeguarding_concern`, `disposition`) are ready for Phase 20-03 (Purple Guide PDF generator) to read
- RIDDOR suppression confirmed: only affects `festivals` vertical; construction, tv_film, and general verticals retain RIDDOR banner

---
*Phase: 20-festivals-events-vertical*
*Completed: 2026-02-18*
