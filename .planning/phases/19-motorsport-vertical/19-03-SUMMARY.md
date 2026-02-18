---
phase: 19-motorsport-vertical
plan: 03
subsystem: api
tags: [react-pdf, edge-functions, supabase-storage, motorsport, pdf-generation, deno, typescript]

# Dependency graph
requires:
  - phase: 19-01
    provides: MotorsportExtraFields schema in vertical_extra_fields JSONB; buildVerticalExtraFields helper; motorsport concussion protocol gate
  - phase: 19-02
    provides: Motorsport cert taxonomy; TreatmentWithWorker type with event_vertical and vertical_extra_fields columns
  - phase: 18-02
    provides: incident-report-dispatcher.ts routing motorsport to motorsport-incident-generator; 501 stub Edge Function

provides:
  - "motorsport-reports Supabase Storage bucket (migration 128) with org-scoped RLS"
  - "Full MotorsportFormData TypeScript interface (all MOTO-01 inferred fields)"
  - "motorsport-mapping.ts: mapTreatmentToMotorsportForm() with null-safe vertical_extra_fields parsing"
  - "MotorsportIncidentDocument.tsx: @react-pdf/renderer A4 PDF with DRAFT watermark, 5 sections, Motorsport UK red (#e60012) accent"
  - "motorsport-incident-generator/index.ts: full PDF generation (replaces 501 stub)"

affects:
  - phase: 19-04
  - phase: 19-05
  - "web dashboard: MotorsportIncidentReportCard will call this Edge Function"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Motorsport PDF follows F2508Document.tsx pattern exactly (F2508 is the reference template for all vertical PDFs)"
    - "vertical_extra_fields parsed with try/catch JSON.parse + ?? {} fallback — handles both string (WatermelonDB @text) and object (Supabase JSONB) shapes"
    - "DRAFT watermark via position:absolute View with opacity:0.08 and transform:rotate(-45deg) — same pattern available for festivals and football vertical PDFs"
    - "mapTreatmentToMotorsportForm() follows mapTreatmentToF2508() signature: (row, worker, org, extraFields) — all null-safe with sensible defaults"
    - "Storage bucket RLS uses treatments JOIN profiles for org-scoped read access — matches event-incident-reports and fa-incident-reports pattern"

key-files:
  created:
    - supabase/migrations/128_motorsport_storage_bucket.sql
    - supabase/functions/motorsport-incident-generator/MotorsportIncidentDocument.tsx
    - supabase/functions/motorsport-incident-generator/motorsport-mapping.ts
  modified:
    - supabase/functions/motorsport-incident-generator/types.ts
    - supabase/functions/motorsport-incident-generator/index.ts

key-decisions:
  - "DRAFT watermark applied — Motorsport UK Incident Pack V8.0 physical form not obtained; fields inferred from MOTO-01 regulatory requirements"
  - "MotorsportFormData fields are inferred, not sourced from official form — validate and update before regulatory submission"
  - "upsert:true for motorsport-reports storage upload — allows PDF regeneration; same pattern as event-incident-reports (20-03 decision)"
  - "competitor_name sourced from treatment worker — medic and patient share the same workers table reference in this context"
  - "GCS score rendered at 14pt bold in clinical section — larger font signals clinical importance to reviewer"
  - "Concussion clearance section (Section 5) always rendered even when hia_conducted=false — blank fields visible on form"
  - "Migration number 128 (not 125 as specified in plan) — 125 was already used by event-incident-reports, 126 by motorsport concussion alert type, 127 by fa-incident-reports"

patterns-established:
  - "Vertical PDF pattern: types.ts (FormData interface) + mapping.ts (mapTreatment fn) + Document.tsx (react-pdf) + index.ts (orchestration)"
  - "All vertical PDFs use motorsport/festival/football brand colours in header and section title left-border accents"
  - "DRAFT watermark pattern available as template for future vertical PDFs where official form not yet obtained"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 19 Plan 03: Motorsport Incident Generator Summary

**Motorsport UK Accident Form PDF generator built with DRAFT watermark — @react-pdf/renderer A4 document with 5 sections, Motorsport UK red (#e60012) accent, GCS score prominence, and concussion clearance protocol section**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-18T04:26:45Z
- **Completed:** 2026-02-18T04:30:08Z
- **Tasks:** 1 (Task 1 was a human checkpoint; Task 2 is this execution)
- **Files modified:** 5

## Accomplishments

- Replaced 501 stub in `motorsport-incident-generator/index.ts` with full PDF generation pipeline
- Built `MotorsportIncidentDocument.tsx` with DRAFT watermark, 5 clinical sections, and Motorsport UK red branding
- Built `motorsport-mapping.ts` with null-safe `mapTreatmentToMotorsportForm()` parsing `vertical_extra_fields` JSONB safely
- Expanded `types.ts` from minimal stub to full `MotorsportFormData` interface (all MOTO-01 inferred fields)
- Created migration 128 with `motorsport-reports` private storage bucket and org-scoped RLS policies

## Task Commits

Task 1 was a human checkpoint (Task 1: Download Motorsport UK Incident Pack V8.0 — user responded "proceed with draft").

Task 2 was executed and committed:

| Files | Commit | Notes |
|-------|--------|-------|
| All 5 motorsport Edge Function files + migration 128 | `414699f` | Pre-committed by 22-03 executor as draft side-effect; content verified identical |

**Plan metadata:** (this SUMMARY.md commit)

## Files Created/Modified

- `supabase/migrations/128_motorsport_storage_bucket.sql` — Private motorsport-reports bucket; org-scoped RLS SELECT via treatments JOIN profiles; service_role INSERT + UPDATE
- `supabase/functions/motorsport-incident-generator/types.ts` — Full `MotorsportFormData` interface (30+ fields across 5 sections); `MotorsportIncidentRequest` replaces old stub; deprecated alias retained
- `supabase/functions/motorsport-incident-generator/motorsport-mapping.ts` — `mapTreatmentToMotorsportForm(treatment, worker, org, extraFields)` with null-safe extraFields parsing; formatDate helper; sensible defaults for all missing fields
- `supabase/functions/motorsport-incident-generator/MotorsportIncidentDocument.tsx` — A4 PDF; DRAFT watermark (position:absolute, opacity:0.08, rotate -45deg); header with Motorsport UK red; 5 sections; GCS at 14pt bold; booleans rendered Yes/No with green/dark colouring
- `supabase/functions/motorsport-incident-generator/index.ts` — Full pipeline: validate → fetch treatment with joined worker+org → parse vertical_extra_fields → map → renderToBuffer → upload → signedUrl; 501 removed entirely

## Decisions Made

- **Migration number 128 (not 125):** Plan specified "125" but 125 was already used by `event-incident-reports` (Phase 20-03). Migration 128 is correct — 126 was motorsport concussion alert type, 127 was fa-incident-reports. Migration was already correctly committed in `0bcdffe`.
- **DRAFT watermark approach:** User checkpoint response was "proceed with draft" — watermark `"DRAFT - Pending Motorsport UK form validation"` applied at 36pt, opacity 0.08, rotated -45 degrees as background layer.
- **upsert:true for storage:** Allows PDF regeneration without timestamp-suffix constraint changes. Consistent with Phase 20-03 decision for event-incident-reports.
- **Concussion clearance section always shown:** Section 5 (HIA/Stood Down/CMO) renders even when `hia_conducted=false` — blank fields visible on the form for completeness review.
- **GCS at 14pt bold:** Larger than body text (10pt) to signal clinical importance; medics reviewing PDF can immediately spot the GCS score.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration number corrected from 125 to 128**

- **Found during:** Task 2-A (create storage bucket migration)
- **Issue:** Plan specified `125_motorsport_storage_bucket.sql` but migration 125 was already occupied by `125_event_incident_reports_storage.sql` (Phase 20-03). Additionally migration 126 (`motorsport_concussion_alert_type`) and 127 (`fa_incident_storage`) already existed.
- **Fix:** Created as `128_motorsport_storage_bucket.sql` — the next available migration number. File was already correctly committed in `0bcdffe` before this plan execution.
- **Files modified:** `supabase/migrations/128_motorsport_storage_bucket.sql`
- **Verification:** File exists, tracked by git, SQL syntax valid, bucket name `motorsport-reports` matches plan specification.
- **Committed in:** `0bcdffe` (prior commit; content verified correct)

**2. [Rule 1 - Note] Files already committed by prior agent**

- **Found during:** Task 2 execution, post-write git status check
- **Context:** The 22-03 plan executor built draft motorsport files as a side-effect of building the fa-incident-generator pattern (commit `414699f`). Those files contained the full implementation — identical to what this plan specifies.
- **Action:** Verified all files (index.ts, types.ts, MotorsportIncidentDocument.tsx, motorsport-mapping.ts) match plan requirements exactly. No changes needed. All verifications passed.
- **No additional commit required** — work was already atomically committed.

---

**Total deviations:** 2 (1 migration number auto-corrected, 1 pre-existing draft verified)
**Impact on plan:** Both deviations non-blocking. Migration number corrected to next available. Prior draft files verified as correct — zero rework needed. No scope creep.

## Issues Encountered

None. The prior agent's draft files were a complete and correct implementation matching all plan requirements. All verifications passed on first check.

## User Setup Required

None — no external service configuration required beyond the existing Supabase Storage setup. The `motorsport-reports` bucket is created via migration 128 which runs on Supabase deploy.

**Note for production:** Before going live with motorsport clients, validate `MotorsportIncidentDocument.tsx` field layout against the physical Motorsport UK Accident Form (Incident Pack V8.0). Replace DRAFT watermark with production version after validation.

## Next Phase Readiness

- `motorsport-incident-generator` Edge Function is fully deployed (pending Supabase push)
- `motorsport-reports` storage bucket ready (migration 128)
- PDF renders with DRAFT watermark — suitable for testing and stakeholder review
- Phase 19-04 and 19-05 can proceed — the PDF backend is complete
- **Outstanding:** Obtain Motorsport UK Incident Pack V8.0 to validate field names and layout; update PDF and remove DRAFT watermark before regulatory use

---
*Phase: 19-motorsport-vertical*
*Completed: 2026-02-18*
