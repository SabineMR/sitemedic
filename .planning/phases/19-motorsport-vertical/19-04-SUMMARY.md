---
phase: 19-motorsport-vertical
plan: 04
subsystem: api
tags: [react-pdf, edge-functions, supabase-storage, pdf-generation, motorsport, vertical, dashboard, tanstack-table]

# Dependency graph
requires:
  - phase: 19-03
    provides: motorsport-reports storage bucket (migration 128) used by stats sheet PDF upload
  - phase: 19-02
    provides: TreatmentWithWorker type with event_vertical and vertical_extra_fields fields used by concussion badge
  - phase: 19-01
    provides: vertical_extra_fields JSON shape (competitor_car_number, concussion_suspected, competitor_cleared_to_return, extrication_required, gcs_score, circuit_section) consumed by mapBookingToStats
provides:
  - motorsport-stats-sheet-generator Edge Function (4 files: types.ts, stats-mapping.ts, MotorsportStatsDocument.tsx, index.ts)
  - Medical Statistics Sheet PDF (A4 landscape, severity/outcome distributions, concussion/extrication/GCS aggregates, incident table)
  - Concussion clearance badge in treatments-columns.tsx
  - Generate Medical Statistics Sheet button on booking detail page
affects: [19-05, 23-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "booking-scoped PDF: stats sheet uses booking_id as storage prefix (not treatment_id) — booking/{booking_id}/MedicalStatsSheet-{ts}.pdf"
    - "React.createElement in Edge Function index.ts (not JSX) — consistent with event-incident-report-generator pattern"
    - "null-safe extraFields parsing: typeof raw === 'object' branch before JSON.parse — handles both JSONB object and raw string from WatermelonDB sync"
    - "Concussion badge: competitor_cleared_to_return !== true (not === false) — handles undefined/null as 'not cleared' — safety-first"

key-files:
  created:
    - supabase/functions/motorsport-stats-sheet-generator/types.ts
    - supabase/functions/motorsport-stats-sheet-generator/stats-mapping.ts
    - supabase/functions/motorsport-stats-sheet-generator/MotorsportStatsDocument.tsx
    - supabase/functions/motorsport-stats-sheet-generator/index.ts
  modified:
    - web/components/dashboard/treatments-columns.tsx
    - web/app/admin/bookings/[id]/page.tsx
    - FEATURES.md

key-decisions:
  - "React.createElement used in index.ts for renderToBuffer (not JSX) — consistent with event-incident-report-generator; avoids JSX pragma in .ts Edge Function"
  - "upsert:true for motorsport-reports stats sheet upload — allows PDF regeneration without timestamp collision (consistent with 19-03 motorsport-incident-generator)"
  - "CMO name derived from first treatment's worker — no separate medic query; fallback 'Unknown'"
  - "competitor_cleared_to_return !== true in badge condition (not === false) — undefined and null both treated as 'not cleared'; safety-critical default"
  - "Button imports: createClient from @/lib/supabase/client and Button from @/components/ui/button added to booking detail page (neither was previously imported)"
  - "Stats sheet button placed between Site Details and Pre-Event Medical Brief sections — visible without scrolling on typical booking"

patterns-established:
  - "Booking-level PDF (not treatment-level): query treatments by booking_id + event_vertical, aggregate into single PDF"
  - "mapBookingToStats() signature: (booking, treatments[], medicName) — clean separation of data fetch (index.ts) and aggregation logic (stats-mapping.ts)"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 19 Plan 04: Medical Statistics Sheet PDF Generator Summary

**`motorsport-stats-sheet-generator` Edge Function aggregates all motorsport treatments per booking into a Medical Statistics Sheet PDF (A4 landscape), with a concussion clearance badge in the treatments table and a "Generate Medical Statistics Sheet" button on the booking detail page**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T04:34:15Z
- **Completed:** 2026-02-18T04:39:19Z
- **Tasks:** 2
- **Files modified:** 6 (4 created, 2 modified + FEATURES.md)

## Accomplishments
- Created `motorsport-stats-sheet-generator` Edge Function (4 files) following exact `motorsport-incident-generator` pattern
- `mapBookingToStats()` aggregates severity/outcome via `reduce`, extracts concussion count, extrication count, GCS min/max, hospital referrals, maps each treatment to incident row
- `MotorsportStatsDocument.tsx` renders A4 landscape PDF with 4-card summary grid and incident table with red concussion row highlighting
- Added `motorsport_clearance` column to `treatmentColumns` with null-safe `vertical_extra_fields` access — concussion badge fires only when `concussion_suspected === true && competitor_cleared_to_return !== true`
- Added `handleGenerateStatsSheet` handler and button to `bookings/[id]/page.tsx` — conditional on `event_vertical === 'motorsport'`, shows loading spinner

## Task Commits

Each task was committed atomically:

1. **Task 1: Create motorsport-stats-sheet-generator Edge Function** - `45c6b6c` (feat)
2. **Task 2: Add concussion badge + stats sheet button to dashboard** - `6b5be75` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `supabase/functions/motorsport-stats-sheet-generator/types.ts` - MotorsportStatsRequest and MotorsportStatsData interfaces
- `supabase/functions/motorsport-stats-sheet-generator/stats-mapping.ts` - mapBookingToStats() aggregation function
- `supabase/functions/motorsport-stats-sheet-generator/MotorsportStatsDocument.tsx` - A4 landscape PDF with summary grid + incident table
- `supabase/functions/motorsport-stats-sheet-generator/index.ts` - Edge Function entry point (CORS, validate, fetch, render, upload, sign)
- `web/components/dashboard/treatments-columns.tsx` - motorsport_clearance column with concussion badge
- `web/app/admin/bookings/[id]/page.tsx` - statsLoading state, handleGenerateStatsSheet handler, conditional button

## Decisions Made
- `React.createElement` in index.ts for renderToBuffer (not JSX) — consistent with event-incident-report-generator; avoids JSX pragma in .ts files
- `upsert: true` for motorsport-reports stats sheet upload — allows regeneration on same booking (consistent with motorsport-incident-generator)
- CMO name from first treatment's worker — no separate medic query, fallback 'Unknown'
- `competitor_cleared_to_return !== true` in badge (not `=== false`) — `undefined` and `null` both treated as not cleared (safety-first default)
- `createClient` from `@/lib/supabase/client` — matches pattern used by gdpr/page.tsx and medics payslips page (not createClientComponentClient)
- Button placed between Site Details and Pre-Event Medical Brief sections — visible without scrolling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing TypeScript errors in `app/(dashboard)/treatments/[id]/page.tsx` and `lib/territory/__tests__/` — unrelated to this plan, confirmed by checking that the modified files have no TypeScript errors.

## User Setup Required
None - no external service configuration required. Uses existing `motorsport-reports` bucket from migration 128 (Plan 19-03).

## Next Phase Readiness
- Phase 19-04 complete. Ready for Phase 19-05 (final motorsport plan).
- All 4 motorsport PDF Edge Functions are now present: motorsport-incident-generator (per-treatment) and motorsport-stats-sheet-generator (per-booking)
- The concussion clearance badge provides admin visibility into MOTO-03 uncleared concussion cases

---
*Phase: 19-motorsport-vertical*
*Completed: 2026-02-18*
