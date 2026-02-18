---
phase: 21-film-tv-production-vertical
plan: 02
subsystem: ui
tags: [react-native, expo-router, vertical-terminology, cert-ordering, org-context, film-tv]

# Dependency graph
requires:
  - phase: 21-01
    provides: ScreenSkills Production Safety Passport + EFR cert types in CERT_TYPES arrays; OrgContext (useOrg) providing primaryVertical; getPatientLabel('tv_film') returning 'Crew member'
  - phase: 18-03
    provides: OrgContext (OrgProvider, useOrg hook, primaryVertical) in src/contexts/OrgContext.tsx
provides:
  - tv_film VERTICAL_CERT_TYPES ordering: HCPC Paramedic first, ScreenSkills 2nd, FREC 4 3rd, EFR 4th (both cert files)
  - getLocationLabel() helper exported from vertical-outcome-labels.ts
  - getEventLabel() helper exported from vertical-outcome-labels.ts
  - Workers tab dynamic labelling driven by useOrg() (Cast & Crew for tv_film)
  - All worker and treatment screens use getPatientLabel for user-visible strings
  - FILM-04 confirmed: tv_film routes to riddor-f2508-generator in incident-report-dispatcher.ts
affects:
  - 21-03 (RIDDOR completeness gate — may use getLocationLabel/getEventLabel in error messages)
  - 21-04 (PDF generation — Cast & Crew label on F2508 form)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OrgContext + getPatientLabel pattern for vertical-aware UI strings — established for all future verticals"
    - "VERTICAL_CERT_TYPES ordering: Film/TV cert profile starts with HCPC Paramedic, ScreenSkills, FREC 4, EFR"

key-files:
  created: []
  modified:
    - services/taxonomy/certification-types.ts
    - web/types/certification.types.ts
    - services/taxonomy/vertical-outcome-labels.ts
    - app/(tabs)/_layout.tsx
    - app/(tabs)/workers.tsx
    - app/worker/new.tsx
    - app/worker/quick-add.tsx
    - app/worker/[id].tsx
    - app/treatment/[id].tsx
    - app/treatment/templates.tsx

key-decisions:
  - "Workers tab plural label uses 'Cast & Crew' directly for tv_film (not getPatientLabel + 's') — matches industry convention"
  - "Registry header label is 'Cast & Crew Registry' for tv_film — not 'Crew members Registry'"
  - "CSCS and IPAF removed from tv_film VERTICAL_CERT_TYPES ordering only — remain in master CERT_TYPES array"
  - "getLocationLabel/getEventLabel added to vertical-outcome-labels.ts alongside getPatientLabel — single file for all vertical noun helpers"
  - "worker/[id].tsx error text uses personLabel (future-proof); no section headings changed (none contained 'Worker')"
  - "FILM-04: incident-report-dispatcher.ts already correctly routes tv_film → riddor-f2508-generator — no code change needed"

patterns-established:
  - "Vertical noun helper pattern: getPatientLabel / getLocationLabel / getEventLabel all in vertical-outcome-labels.ts"
  - "WorkersScreen passes personPluralLabel as prop to WorkersList (withObservables HOC pattern)"
  - "Tab layout labels derived from useOrg() inside TabsLayout — computed once, used in Tabs.Screen options"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 21 Plan 02: Film/TV Terminology and Cert Ordering Summary

**'Cast & Crew' terminology applied across all 7 worker/treatment screens via useOrg() + getPatientLabel(); tv_film cert profile reordered to HCPC Paramedic, ScreenSkills, FREC 4, EFR; getLocationLabel/getEventLabel helpers exported from vertical-outcome-labels.ts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T03:54:14Z
- **Completed:** 2026-02-18T03:58:12Z
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments

- tv_film VERTICAL_CERT_TYPES reordered in both cert files: HCPC Paramedic, ScreenSkills Production Safety Passport, FREC 4, EFR at top; CSCS and IPAF removed from tv_film ordering (remain in master array)
- getLocationLabel() and getEventLabel() exported from vertical-outcome-labels.ts — complete set of vertical noun helpers now in one file
- Workers tab label and header title dynamically driven by useOrg() in _layout.tsx (Cast & Crew / Cast & Crew Registry for tv_film)
- All 7 screens (workers.tsx, new.tsx, quick-add.tsx, [id].tsx, treatment/[id].tsx, treatment/templates.tsx) use getPatientLabel for user-visible strings
- FILM-04 confirmed: incident-report-dispatcher.ts already routes tv_film to riddor-f2508-generator — no code change needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Update tv_film cert ordering + add location/event label helpers** - `d1e8f94` (feat)
2. **Task 2: Apply Film/TV terminology to workers tab, layout, worker and treatment screens** - `f6f3629` (feat)

**Plan metadata:** (committed below as docs commit)

## Files Created/Modified

- `services/taxonomy/certification-types.ts` — tv_film VERTICAL_CERT_TYPES reordered: HCPC Paramedic first, ScreenSkills 2nd, FREC 4 3rd, EFR 4th; CSCS + IPAF removed from tv_film ordering
- `web/types/certification.types.ts` — tv_film VERTICAL_CERT_TYPES mirrored to match mobile ordering
- `services/taxonomy/vertical-outcome-labels.ts` — getLocationLabel() and getEventLabel() added after getPatientLabel()
- `app/(tabs)/_layout.tsx` — useOrg() + getPatientLabel() compute personPluralLabel and registryLabel; workers Tabs.Screen uses these computed values
- `app/(tabs)/workers.tsx` — useOrg imported; WorkersList receives personPluralLabel prop; Add button and empty state labels are dynamic
- `app/worker/new.tsx` — form title "Add Worker - Site Induction" → "Add {personLabel} - Site Induction"
- `app/worker/quick-add.tsx` — title "Quick Add Worker" → "Quick Add {personLabel}"; Add button label uses personLabel
- `app/worker/[id].tsx` — useOrg + getPatientLabel imported; error text "Worker not found" → "{personLabel} not found"
- `app/treatment/[id].tsx` — "Worker Information" section heading → "{patientLabel} Information"
- `app/treatment/templates.tsx` — "1. Select Worker" heading and search placeholder use personLabel

## Decisions Made

- Workers tab plural label uses `'Cast & Crew'` directly for tv_film (not `getPatientLabel + 's'`) — matches Film/TV industry convention; "Cast & Crew" is the universally recognised collective noun
- Registry header is `'Cast & Crew Registry'` for tv_film — not `'Crew members Registry'`
- CSCS and IPAF removed from tv_film `VERTICAL_CERT_TYPES` ordering only — remain in master `CERT_TYPES` / `UK_CERT_TYPES` arrays (medics can still hold any cert type)
- `getLocationLabel` and `getEventLabel` placed in `vertical-outcome-labels.ts` alongside `getPatientLabel` — keeps all vertical noun helpers in one file for discoverability
- `worker/[id].tsx` error text updated with personLabel; no section headings changed as none contained the string "Worker"
- FILM-04: No code change — dispatcher already correct from Phase 18

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `withObservables` HOC in workers.tsx required passing `personPluralLabel` as a prop from the wrapping `WorkersScreen` component (which can use hooks) into `WorkersList` (which is enhanced by `withObservables`). This is the standard WatermelonDB pattern and was handled inline without complication.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FILM-02 (Cast & Crew terminology): Complete
- FILM-03 (cert ordering): Complete — HCPC Paramedic, ScreenSkills, FREC 4, EFR lead the tv_film cert profile
- FILM-04 (F2508 dispatch routing): Confirmed — no code change was needed
- Terminology helpers (getLocationLabel, getEventLabel) are ready for Phase 21-03 RIDDOR completeness gate and Phase 21-04 PDF generation
- Plan 21-03 (RIDDOR completeness gate for Film/TV) can proceed — all vertical noun infrastructure is now in place

---
*Phase: 21-film-tv-production-vertical*
*Completed: 2026-02-18*
