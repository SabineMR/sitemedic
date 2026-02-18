---
phase: 22-football-sports-vertical
plan: "04"
subsystem: taxonomy
tags: [football, sporting_events, certification-types, vertical-labels, org-labels, terminology]

# Dependency graph
requires:
  - phase: 21-film-tv-vertical
    provides: getLocationLabel and getEventLabel functions placed in vertical-outcome-labels.ts alongside getPatientLabel
  - phase: 18.5-construction-vertical
    provides: VERTICAL_CERT_TYPES pattern established for per-vertical cert ordering
provides:
  - Football cert types (ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module) in CERT_TYPES
  - sporting_events CertCategory union member in certification-types.ts
  - CERT_TYPE_INFO entries for all 4 new football certs (category: sporting_events)
  - VERTICAL_CERT_TYPES['sporting_events'] leading with ATMMiF
  - getPatientLabel('sporting_events') returns 'Player'
  - getLocationLabel('sporting_events') returns 'Pitch / Ground'
  - getEventLabel('sporting_events') returns 'Club'
  - LABEL_MAP sporting_events updated: Player/Players, Pitch / Ground, Club, Match day
affects: [22-05, 22-06, phase-23-compliance-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sporting_events CertCategory: football certs grouped under new sporting_events category separate from medical/events"
    - "Vertical noun helpers: all three label functions (getPatientLabel, getLocationLabel, getEventLabel) colocated in vertical-outcome-labels.ts"

key-files:
  created: []
  modified:
    - services/taxonomy/certification-types.ts
    - services/taxonomy/vertical-outcome-labels.ts
    - web/lib/org-labels.ts

key-decisions:
  - "Football cert types use 'sporting_events' CertCategory (new union member) — not 'medical' or 'events'"
  - "VERTICAL_CERT_TYPES['sporting_events'] leads with ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module before general medical certs"
  - "locationTerm in LABEL_MAP uses 'Pitch / Ground' (not 'Stadium') to match England Football pitchside terminology"
  - "eventTerm for sporting_events is 'Club' — reflects that football medics work for clubs not generic events"

patterns-established:
  - "Football terminology: Player (not Participant), Pitch / Ground (not Venue/Stadium), Club (not Event)"
  - "ATMMiF-first cert ordering: football-specific certs lead the VERTICAL_CERT_TYPES list before general medical qualifications"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 22 Plan 04: Football Taxonomy Wiring Summary

**Football cert types (ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module) added to taxonomy with new sporting_events CertCategory; vertical noun labels updated to Player / Pitch / Ground / Club across vertical-outcome-labels.ts and org-labels.ts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T04:11:12Z
- **Completed:** 2026-02-18T04:14:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added 4 FA-specific cert types to CERT_TYPES array with CERT_TYPE_INFO entries and 'sporting_events' as a new CertCategory union member
- VERTICAL_CERT_TYPES['sporting_events'] updated to lead with ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module before general medical certs (satisfies FOOT-06)
- All three vertical noun helpers updated: getPatientLabel → 'Player', getLocationLabel → 'Pitch / Ground', getEventLabel → 'Club' for sporting_events (satisfies FOOT-05)
- LABEL_MAP in web/lib/org-labels.ts updated with football terminology: Player/Players, Pitch / Ground, Club — JSDoc comment also updated

## Task Commits

Each task was committed atomically:

1. **Task 1: Add football cert types to certification-types.ts** - `fea9c8f` (feat - pre-existing commit; changes were already in repo at plan execution time)
2. **Task 2: Update patient, location, and event labels for football terminology** - `67fe2e6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `services/taxonomy/certification-types.ts` - Added 4 football cert IDs to CERT_TYPES, 'sporting_events' to CertCategory union, 4 CERT_TYPE_INFO entries, updated VERTICAL_CERT_TYPES sporting_events to lead with ATMMiF
- `services/taxonomy/vertical-outcome-labels.ts` - Updated getPatientLabel → 'Player', getLocationLabel → 'Pitch / Ground', getEventLabel → 'Club' for sporting_events
- `web/lib/org-labels.ts` - Updated LABEL_MAP sporting_events entry and JSDoc comment with football terminology

## Decisions Made

- Football cert types assigned 'sporting_events' CertCategory (new union member, per 21-01 decision that ScreenSkills/EFR use 'medical' — football certs warranted their own category)
- locationTerm uses 'Pitch / Ground' not 'Stadium' — pitchside terminology aligns with England Football Learning / FA language
- eventTerm is 'Club' — football medics are contracted to clubs, not generic events
- VERTICAL_CERT_TYPES ordering: ATMMiF leads as highest qualification, followed by ITMMiF, FA Advanced Trauma Management, FA Concussion Module, then general medical certs (FREC 4, PHEC, HCPC Paramedic, ALS Provider, FREC 3, AED Trained, SIA Door Supervisor, Event Safety Awareness)

## Deviations from Plan

### Note on Task 1

**[Observation] Task 1 pre-implemented in prior commit**

- **Found during:** Initial file inspection
- **Detail:** Commit `fea9c8f` (feat(motorsport): update dependencies and enhance certification types, 2026-02-17) had already applied all Task 1 changes: the 4 cert IDs in CERT_TYPES, 'sporting_events' in CertCategory, all 4 CERT_TYPE_INFO entries, and the VERTICAL_CERT_TYPES['sporting_events'] update. The file matched the target state exactly.
- **Action:** Verified all Task 1 must-haves were satisfied; proceeded to Task 2. No re-commit needed.
- **Impact:** Task 1 is satisfied by fea9c8f. No scope change.

No other deviations from plan.

---

**Total deviations:** 0 new auto-fixes; 1 observation (Task 1 pre-implemented)
**Impact on plan:** All must-haves satisfied. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All FOOT-05 (Player/Pitch/Ground/Club terminology) and FOOT-06 (cert types: ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module) requirements are satisfied
- getRecommendedCertTypes('sporting_events') returns ATMMiF first
- CertCategory accepts 'sporting_events' without TypeScript error
- Ready for remaining Phase 22 plans (22-05, 22-06 if they exist, or Phase 23 transition)
- Research flag still open: confirm whether SGSA form is required for v2.0 (professional clubs) before Phase 22 FA incident PDF plan

---
*Phase: 22-football-sports-vertical*
*Completed: 2026-02-18*
