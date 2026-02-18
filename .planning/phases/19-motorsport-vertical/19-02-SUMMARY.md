---
phase: 19-motorsport-vertical
plan: 02
subsystem: taxonomy
tags: [certification-types, motorsport, vertical-taxonomy, typescript, TreatmentWithWorker, RIDDOR]

# Dependency graph
requires:
  - phase: 18-multi-vertical-infrastructure
    provides: "Phase 18 columns (event_vertical, vertical_extra_fields, booking_id) in treatments DB table; RIDDOR gate; PDF dispatcher; vertical-compliance config"
provides:
  - "Motorsport UK Medical Official Licence cert type in both mobile and web taxonomy files"
  - "BASM Diploma cert type in both mobile and web taxonomy files"
  - "MOTO-06 compliant motorsport cert ordering (Motorsport UK Medical Official Licence, HCPC Paramedic, PHTLS first)"
  - "TreatmentWithWorker with event_vertical and vertical_extra_fields for Plan 19-04 dashboard rendering"
  - "RIDDOR gate verified: motorsport excluded from auto-detection"
  - "Incident report dispatcher verified: motorsport routes to motorsport-incident-generator"
affects:
  - "19-03 (Motorsport treatment form fields — uses cert types for selector)"
  - "19-04 (Concussion badge dashboard — requires TreatmentWithWorker.vertical_extra_fields)"
  - "19-05 (Motorsport PDF generator — routes via incident-report-dispatcher.ts)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lockstep cert taxonomy sync: services/taxonomy/certification-types.ts (mobile) and web/types/certification.types.ts (web) must always match for shared cert type strings"
    - "VERTICAL_CERT_TYPES ordering drives cert selector priority — order = clinical relevance for vertical"
    - "Treatment extends base interface pattern: TreatmentWithWorker inherits Phase 18 vertical fields via extends Treatment (no duplication)"

key-files:
  created: []
  modified:
    - services/taxonomy/certification-types.ts
    - web/types/certification.types.ts
    - web/types/database.types.ts

key-decisions:
  - "Motorsport UK Medical Official Licence uses 'motorsport' category (not 'medical') — it is a Motorsport UK administrative registration, not a clinical qualification"
  - "BASM Diploma uses 'motorsport' category — sport medicine diploma specific to motorsport context in this vertical"
  - "vertical_extra_fields typed as Record<string, unknown> | null (not string | null) in web/types/database.types.ts — web layer parses JSON before use; mobile uses @text raw string and parses at call site (per 18-01 decision)"
  - "booking_id added alongside vertical fields — all three Phase 18 Treatment columns added together for dashboard completeness"

patterns-established:
  - "Both cert taxonomy files (mobile + web) must be updated in lockstep — different renewalUrl format in web file but identical cert type strings"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 19 Plan 02: Cert Taxonomy and TreatmentWithWorker Type Summary

**Motorsport UK Medical Official Licence and BASM Diploma added to mobile and web cert taxonomies in MOTO-06 order; TreatmentWithWorker extended with Phase 18 vertical fields; RIDDOR gate confirmed motorsport-exempt.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T04:12:06Z
- **Completed:** 2026-02-18T04:14:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added two missing motorsport cert types (Motorsport UK Medical Official Licence and BASM Diploma) to both `services/taxonomy/certification-types.ts` (mobile) and `web/types/certification.types.ts` (web) in full lockstep — identical cert type strings, both files.
- Updated `VERTICAL_CERT_TYPES['motorsport']` in both files to MOTO-06 order: Motorsport UK Medical Official Licence, HCPC Paramedic, PHTLS at top, followed by FREC 4, PHEC, ALS Provider, ATLS, BASM Diploma, FIA Grades, Motorsport UK CMO Letter, MSA First Aider.
- Extended `Treatment` interface in `web/types/database.types.ts` with `booking_id`, `event_vertical`, and `vertical_extra_fields` — `TreatmentWithWorker` inherits all three via `extends Treatment`, enabling Plan 19-04 concussion badge rendering.
- RIDDOR gate verified: `motorsport` present in `NON_RIDDOR_VERTICALS` array (riddor-detector/index.ts:75–81), early-return fires before `detectRIDDOR()` call.
- vertical-compliance.ts: `getVerticalCompliance('motorsport').riddorApplies === false` confirmed at line 141.
- incident-report-dispatcher.ts: `motorsport` maps to `'motorsport-incident-generator'` (line 29) — no code change needed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Motorsport UK Medical Official Licence and BASM Diploma to cert taxonomy files** - `e9527de` (feat)
2. **Task 2: Extend TreatmentWithWorker type and verify RIDDOR gate** - `fba3f5b` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `services/taxonomy/certification-types.ts` - Added 'Motorsport UK Medical Official Licence' and 'BASM Diploma' to CERT_TYPES array, CERT_TYPE_INFO record, and VERTICAL_CERT_TYPES['motorsport'] ordering (MOTO-06 compliant)
- `web/types/certification.types.ts` - Added same two cert types to UK_CERT_TYPES array, CERT_TYPE_METADATA record (with renewalUrls), and VERTICAL_CERT_TYPES['motorsport'] ordering to match mobile
- `web/types/database.types.ts` - Added booking_id, event_vertical, and vertical_extra_fields to Treatment interface; TreatmentWithWorker inherits all three via extends

## Decisions Made
- `vertical_extra_fields` typed as `Record<string, unknown> | null` in web layer (not `string | null`) — web code parses JSON server-side before type use; mobile WatermelonDB uses `@text` raw string (18-01 decision) and parses at call site; both remain correct for their platform.
- All three Phase 18 treatment columns (`booking_id`, `event_vertical`, `vertical_extra_fields`) added in a single task rather than separately — they represent one cohesive set of Phase 18 schema columns.
- Motorsport UK Medical Official Licence and BASM Diploma assigned `'motorsport'` category (not `'medical'`) — Motorsport UK Official Licence is an administrative motorsport registration, BASM Diploma is sport medicine with motorsport relevance, both fit the motorsport category model.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## RIDDOR Gate Verification

(Read-only, no code changes — per plan Task 2 spec)

| Check | Location | Result |
|-------|----------|--------|
| `'motorsport'` in NON_RIDDOR_VERTICALS | `supabase/functions/riddor-detector/index.ts:75-81` | Confirmed — early-return before detectRIDDOR() |
| `getVerticalCompliance('motorsport').riddorApplies === false` | `services/taxonomy/vertical-compliance.ts:141` | Confirmed |
| `motorsport` maps to `motorsport-incident-generator` | `web/lib/pdf/incident-report-dispatcher.ts:29` | Confirmed — stub returns 501 until Phase 19-05 |

## Next Phase Readiness
- Plan 19-03 (Motorsport treatment form fields): cert selector will now surface Motorsport UK Medical Official Licence, HCPC Paramedic, PHTLS at the top of the list per MOTO-06.
- Plan 19-04 (Concussion badge dashboard): `TreatmentWithWorker.vertical_extra_fields` and `TreatmentWithWorker.event_vertical` are now accessible for badge rendering logic.
- Plan 19-05 (motorsport-incident-generator Edge Function): dispatcher already routes correctly; stub returns 501 ready to be replaced.
- No blockers.

---
*Phase: 19-motorsport-vertical*
*Completed: 2026-02-18*
