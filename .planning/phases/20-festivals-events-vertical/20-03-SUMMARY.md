---
phase: 20-festivals-events-vertical
plan: 03
subsystem: api
tags: react-pdf, supabase-storage, edge-functions, pdf-generation, purple-guide, festivals

# Dependency graph
requires:
  - phase: 20-01
    provides: festival vertical_extra_fields (triage P1-P4, alcohol_substance, safeguarding_concern, disposition) written to WatermelonDB Treatment model and Supabase treatments.vertical_extra_fields
  - phase: 18
    provides: event-incident-report-generator Edge Function stub, incident-report-dispatcher routing 'festivals' vertical to it, treatments table with vertical_extra_fields JSONB (migration 124)
provides:
  - Purple Guide Patient Contact Log PDF generation (FEST-06 backend)
  - PurpleGuideDocument.tsx React-PDF component with triage colour badges
  - purple-guide-mapping.ts null-safe treatment-to-PDF data mapper
  - event-incident-reports Supabase Storage bucket with RLS policies
  - Signed URL download flow for event organiser PDF access
affects:
  - 20-04 (festival compliance reporting — may reference event-incident-reports bucket)
  - Any future festival PDF regeneration or download UI

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Purple Guide PDF pattern: PurpleGuideDocument.tsx + purple-guide-mapping.ts + storage upload → signed URL (mirrors F2508 pattern exactly)"
    - "Triage colour-coded badge: inline backgroundColor per TRIAGE_BADGE_COLOURS Record in JSX"
    - "Graceful null mapping: ?? defaults at every field in mapTreatmentToPurpleGuide"

key-files:
  created:
    - supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx
    - supabase/functions/event-incident-report-generator/purple-guide-mapping.ts
    - supabase/migrations/125_event_incident_reports_storage.sql
  modified:
    - supabase/functions/event-incident-report-generator/types.ts
    - supabase/functions/event-incident-report-generator/index.ts

key-decisions:
  - "upsert:true for storage upload (not false as in F2508) — allows PDF regeneration without unique filename requirement"
  - "bookings join provides site_name (event name) and shift_date (event date) — not stored directly on treatments"
  - "triageCategory defaults to P3 (Delayed/Green) when vertical_extra_fields is null — safest assumption for missing triage data"
  - "disposition defaults to discharged_on_site when missing — most common festival outcome"
  - "RLS SELECT policy joins via treatments table (not riddor_incidents) to match the treatments-centric data model"

patterns-established:
  - "Event vertical PDF pattern: Document.tsx + mapping.ts + storage bucket migration — use for fairs_shows and private_events PDF variants"
  - "Purple Guide section order: Patient Identifier → Presenting Complaint → Treatment Given → Flags → Disposition → Attending Medic"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 20 Plan 03: Purple Guide PDF Generation Summary

**Purple Guide Patient Contact Log PDF with triage colour badges, alcohol/safeguarding flags, and disposition via @react-pdf/renderer stored in event-incident-reports Supabase Storage bucket**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T04:18:47Z
- **Completed:** 2026-02-18T04:21:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced 501 stub in event-incident-report-generator with full Purple Guide PDF generation flow (FEST-06 backend complete)
- PurpleGuideDocument.tsx renders 6 sections with triage P1-P4 colour badges (#DC2626/#F59E0B/#22C55E/#1F2937), alcohol/safeguarding flag badges, and safeguarding warning callout
- purple-guide-mapping.ts handles null vertical_extra_fields, null bookings join, null workers join, and null org_settings gracefully with sane defaults throughout
- Storage bucket event-incident-reports created (private, with RLS allowing org-scoped SELECT and service_role INSERT/UPDATE)
- 7-day signed URL returned to caller for time-limited download

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PurpleGuideDocument.tsx, purple-guide-mapping.ts, update types.ts, create storage migration** - `ca99161` (feat)
2. **Task 2: Replace 501 stub in index.ts with full PDF generation flow** - `0bec578` (feat)

**Plan metadata:** `(this commit)` (docs: complete plan)

## Files Created/Modified

- `supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx` - React-PDF component; Purple Guide layout with 6 sections, triage colour badge, flag badges, safeguarding callout; Deno-compatible npm: imports
- `supabase/functions/event-incident-report-generator/purple-guide-mapping.ts` - Null-safe mapper from raw Supabase treatment row to PurpleGuideData; handles JSON string or object vertical_extra_fields; bookings join for site_name/shift_date
- `supabase/functions/event-incident-report-generator/types.ts` - Added PurpleGuideData interface (EventIncidentData preserved)
- `supabase/migrations/125_event_incident_reports_storage.sql` - event-incident-reports storage bucket + 3 RLS policies (SELECT for org members, INSERT/UPDATE for service_role)
- `supabase/functions/event-incident-report-generator/index.ts` - 501 stub replaced: createClient → fetch treatment (with medics/org_settings/workers/bookings joins) → mapTreatmentToPurpleGuide → renderToBuffer → storage.upload → createSignedUrl (7 days) → return { success, pdf_path, signed_url }

## Decisions Made

- Used `upsert: true` for storage upload (vs. F2508's `upsert: false`) — allows PDF regeneration for the same incident_id without timestamp uniqueness constraint
- `bookings` join required for `site_name` (event name) and `shift_date` (event date) — these fields are not denormalised onto treatments
- Triage defaults to `'P3'` when `vertical_extra_fields` is null — P3 (Delayed/Green) is the safest assumption; ensures PDF always renders
- Disposition defaults to `'discharged_on_site'` when missing — most common festival outcome
- RLS SELECT policy for event-incident-reports joins via `treatments` table directly (not a separate incidents table), consistent with the treatments-centric data model

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. event-incident-reports bucket is created via migration 125; Edge Function uses existing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars already configured in all environments.

## Next Phase Readiness

- FEST-06 backend is complete: event-incident-report-generator Edge Function produces a Purple Guide PDF and returns a signed URL
- Ready for 20-04: Festival compliance reporting (compliance_score, compliance_score_history)
- The PDF download UI (FEST-06 frontend) can now call the Edge Function with incident_id and event_vertical='festivals' and receive a signed_url

---
*Phase: 20-festivals-events-vertical*
*Completed: 2026-02-18*
