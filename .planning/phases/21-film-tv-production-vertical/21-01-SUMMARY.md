---
phase: 21-film-tv-production-vertical
plan: 01
subsystem: ui
tags: [react-native, film-tv, treatment-form, certifications, vertical, watermelondb, typescript]

# Dependency graph
requires:
  - phase: 18-vertical-infrastructure-riddor-fix
    provides: orgVertical wiring in new.tsx, verticalExtraFields @text column in Treatment model, WatermelonDB schema v4
  - phase: 18.5-construction-vertical
    provides: vertical pattern for conditional form sections and cert type registry structure

provides:
  - Film/TV production conditional form section (4 fields) in treatment form
  - verticalExtraFields JSON string wired to auto-save and sync enqueueSyncItem payload
  - ScreenSkills Production Safety Passport cert type in both mobile and web registries
  - EFR cert type in both mobile and web registries

affects:
  - 21-02: Film/TV cert ordering for tv_film vertical in VERTICAL_CERT_TYPES
  - 21-03: RIDDOR F2508 completeness gate references patientRole and sfxInvolved from verticalExtraFields

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vertical conditional section pattern: orgVertical === 'tv_film' guards JSX block and BottomSheetPicker"
    - "verticalExtraFields as raw JSON string (@text): serialized at formValues build time, stored verbatim in WatermelonDB and Supabase"
    - "Cert type mirroring: mobile CERT_TYPES + CERT_TYPE_INFO must mirror web UK_CERT_TYPES + CERT_TYPE_METADATA atomically"

key-files:
  created: []
  modified:
    - app/treatment/new.tsx
    - services/taxonomy/certification-types.ts
    - web/types/certification.types.ts

key-decisions:
  - "verticalExtraFields stored as raw JSON string (not parsed) — consistent with @text decision from Phase 18"
  - "New cert types use 'medical' category — no new CertCategory needed for Film/TV"
  - "VERTICAL_CERT_TYPES for tv_film NOT updated in this plan — Plan 21-02 handles cert ordering"
  - "ScreenSkills Production Safety Passport renewalUrl added in web file (screenskills.com) — CPD-based so no fixed expiry"

patterns-established:
  - "Film/TV form section: 4 fields (productionTitle, patientRole with BottomSheetPicker, sfxInvolved toggle, sceneContext textarea)"
  - "BottomSheetPicker for vertical-specific pickers: conditional on both orgVertical === 'tv_film' AND showXxxPicker"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 21 Plan 01: Film/TV Production Form Section and Cert Types Summary

**Film/TV conditional treatment form section (4 fields wired to verticalExtraFields) and ScreenSkills Production Safety Passport + EFR added to both cert registries**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T03:47:42Z
- **Completed:** 2026-02-18T03:50:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Film/TV Production Details section renders conditionally when `orgVertical === 'tv_film'` — covers Production Title, Patient Role picker (9 crew roles), SFX/Pyrotechnic toggle, and Scene/Shot Context textarea
- `verticalExtraFields` JSON string wired to `useAutoSave` via `formValues` + `fieldMapping`, and included in `enqueueSyncItem` payload as `vertical_extra_fields`
- `ScreenSkills Production Safety Passport` and `EFR` registered in both mobile (`services/taxonomy/certification-types.ts`) and web (`web/types/certification.types.ts`) cert registries — prerequisite for Plan 21-02 cert ordering

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Film/TV conditional section to treatment form with verticalExtraFields wiring** - `c2a28d0` (feat)
2. **Task 2: Add ScreenSkills Production Safety Passport and EFR cert types to both cert registries** - `ff9f0f5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/treatment/new.tsx` - Added 5 Film/TV state vars, FILM_TV_PATIENT_ROLES constant, verticalExtraFields in formValues/fieldMapping, vertical_extra_fields in sync payload, Production Details JSX section, patient role BottomSheetPicker
- `services/taxonomy/certification-types.ts` - Added 'ScreenSkills Production Safety Passport' and 'EFR' to CERT_TYPES array and CERT_TYPE_INFO record
- `web/types/certification.types.ts` - Added 'ScreenSkills Production Safety Passport' and 'EFR' to UK_CERT_TYPES array and CERT_TYPE_METADATA record

## Decisions Made

- `verticalExtraFields` stored as raw JSON string (`@text` column) — consistent with Phase 18 decision; not parsed in this file, parsed at call site (RIDDOR completeness gate in Plan 21-03)
- New cert types use `'medical'` category — no new `CertCategory` union member needed; Film/TV cert types are clinical qualifications
- `VERTICAL_CERT_TYPES` for `tv_film` not updated — Plan 21-02 handles the ordered cert recommendation list for the tv_film vertical
- `ScreenSkills Production Safety Passport` receives a `renewalUrl` in the web file (screenskills.com) since it's CPD-based with an active online portal; EFR left as `undefined` (various issuers)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 21-02 can now reference `'ScreenSkills Production Safety Passport'` and `'EFR'` in `VERTICAL_CERT_TYPES.tv_film` cert ordering — both exist in both registries
- Plan 21-03 (RIDDOR F2508 gate) can parse `treatment.verticalExtraFields` JSON to extract `patient_role` and `sfx_involved` for completeness checking
- `orgVertical === 'tv_film'` guard pattern established — can be reused in future vertical-specific sections

---
*Phase: 21-film-tv-production-vertical*
*Completed: 2026-02-18*
