---
phase: 22-football-sports-vertical
plan: "01"
subsystem: ui
tags: [react-native, sporting-events, football, vertical-extra-fields, watermelondb, sync]

# Dependency graph
requires:
  - phase: 18-vertical-infrastructure-riddor-fix
    provides: vertical_extra_fields JSONB column in treatments table, Treatment model @text field, orgVertical in new.tsx
  - phase: 21-film-tv-vertical
    provides: Film/TV form section pattern (orgVertical guard + conditional JSX block) to follow
provides:
  - Football dual-patient-type form section in app/treatment/new.tsx
  - Player form path: squad number, phase of play, contact type, HIA toggle + outcome, FA severity
  - Spectator form path: stand location, row/seat, referral outcome, safeguarding toggle + notes, alcohol involvement
  - Football validation guards in handleCompleteTreatment (before try block)
  - vertical_extra_fields JSONB payload built and wired into enqueueSyncItem for both patient types
affects:
  - 22-03 (fa-incident-generator): reads patient_type from vertical_extra_fields for PDF routing
  - 22-04 (football certs/terminology): builds on same form

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual patient type selector: isFootball guard + footballPatientType state drives conditional form path"
    - "Chip-style multi-select UI for football field options (Phase of Play, FA Severity, etc.)"
    - "Toggle button pattern for boolean fields (HIA, Safeguarding, Alcohol)"
    - "verticalExtraFields built as JS object, JSON.stringify()d at treatment completion and sync"
    - "Conditional HIA Outcome: excluded from payload when hia_performed is false"

key-files:
  created: []
  modified:
    - app/treatment/new.tsx

key-decisions:
  - "isFootball declared after orgVertical to avoid temporal dead zone (const isFootball = orgVertical === 'sporting_events' at line 124)"
  - "Football states declared as useState hooks before orgVertical (hooks must be at top level, cannot be conditional)"
  - "hia_outcome excluded from payload when hia_performed is false (not null-included, fully excluded)"
  - "stand_location stores the display string (e.g. 'North Stand') not a slug — matches SGSA form field expectations"
  - "Safeguarding notes cleared when safeguardingFlag toggled off"
  - "verticalExtraFields build uses existing buildVerticalExtraFields() helper (already present from prior phase refactor)"

patterns-established:
  - "Football form: patient type selector before Section 1, player/spectator sections between Section 1 and Film/TV section"
  - "Football guard pattern: isFootball && footballPatientType === 'player' / 'spectator' for conditional render"
  - "Validation order: cert check -> workerId -> injuryTypeId -> signatureUri -> football guards -> festival guards -> try block"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 22 Plan 01: Football Dual Patient Type Form Summary

**Football player/spectator treatment form with 13 conditional fields, HIA protocol, FA severity classification, and vertical_extra_fields wiring via the sporting_events vertical guard**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T04:10:55Z
- **Completed:** 2026-02-18T04:18:32Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added football Patient Type selector (Player / Spectator) as the first form section when `orgVertical === 'sporting_events'`
- Player path: 6 fields — squad number (optional), phase of play (6 options), contact type (2 options), HIA performed toggle, HIA outcome (3 options, conditional on hia_performed), FA severity (5 options per FA surveillance classification)
- Spectator path: 7 fields — stand/location (7 options), row/seat (optional), referral outcome (4 options), safeguarding flag toggle, safeguarding notes (conditional), alcohol involvement toggle
- Football validation guards in `handleCompleteTreatment` — all provably before `try {` block (line order confirmed by grep)
- `vertical_extra_fields` JSON built from selected patient type's fields and wired into `treatment.update()` and `enqueueSyncItem` payload; `hia_outcome` excluded (not set to null) when `hia_performed` is false
- Added `input`, `chipRow`, `chip`, `chipSelected`, `chipText`, `chipTextSelected`, `toggleRow`, `toggleButton`, `toggleButtonOn`, `toggleText` styles

## Task Commits

Each task was committed atomically:

1. **Task 1: Add football state variables and patient type selector UI** - `3a5a710` (feat)
2. **Task 2: Add player fields, spectator fields, validation, and sync payload wiring** - `0d5a8c2` (feat)

**Plan metadata:** to be committed in final docs commit (docs)

## Files Created/Modified

- `app/treatment/new.tsx` — Football dual-patient-type form section added; validation and sync payload wired

## Decisions Made

- `isFootball` must be declared AFTER `orgVertical` (line 124) to avoid temporal dead zone — football state hooks are declared before orgVertical since hooks cannot be conditional
- `hia_outcome` is excluded from payload entirely (not set to null) when `hia_performed` is false — the plan spec says "excluded from the payload", not "null in the payload"
- `stand_location` stores the display string ('North Stand' etc.) matching SGSA form field labels rather than a lowercase slug
- Safeguarding notes cleared (state reset) when safeguardingFlag is toggled off — prevents stale notes from being included if flag is toggled back on
- `buildVerticalExtraFields()` helper was already present from prior phase refactor — football cases added to it for auto-save consistency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] isFootball declared before orgVertical**

- **Found during:** Task 1 (adding state variables)
- **Issue:** Plan specified placing `const isFootball = orgVertical === 'sporting_events'` immediately after certValidationError state, but `orgVertical` is derived from `params` and `useOrg()` which appear later in the component — this would cause a temporal dead zone reference error
- **Fix:** Football `useState` hooks declared before `orgVertical` (hooks must be at top level), `isFootball` constant moved to line 124 immediately after `orgVertical` declaration
- **Files modified:** app/treatment/new.tsx
- **Verification:** TypeScript passes, no reference errors
- **Committed in:** 3a5a710 (Task 1 commit)

**2. [Rule 1 - Bug] Prior phase refactored formValues to use buildVerticalExtraFields() helper**

- **Found during:** Task 2 (updating formValues for auto-save)
- **Issue:** The file already had a `buildVerticalExtraFields()` function added by a prior phase (festivals or motorsport) that consolidated vertical extra fields logic — the plan's individual ternary approach for formValues was already superseded
- **Fix:** Added football cases to the existing `buildVerticalExtraFields()` helper rather than duplicating logic, and referenced the helper in formValues
- **Files modified:** app/treatment/new.tsx
- **Verification:** Auto-save correctly captures football fields; completion payload uses the same build logic
- **Committed in:** 0d5a8c2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs in plan assumptions)
**Impact on plan:** Both auto-fixes were necessary for correctness. No scope creep. All 6 must-have truths satisfied.

## Issues Encountered

None — plan executed cleanly once declaration ordering was corrected.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Football treatment form data entry is complete and ready for use
- `vertical_extra_fields` JSON payload with `patient_type: 'player'` or `patient_type: 'spectator'` is available for Plan 22-03 (`fa-incident-generator` PDF routing)
- Plan 22-02 (if it exists) or Plan 22-03 can proceed immediately
- No blockers

---
*Phase: 22-football-sports-vertical*
*Completed: 2026-02-18*
