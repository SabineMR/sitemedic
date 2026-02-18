---
phase: 23-analytics-heat-maps-and-trend-charts
plan: "06"
subsystem: ui
tags: [nextjs, react, tanstack-query, supabase, edge-functions, pdf, motorsport]

# Dependency graph
requires:
  - phase: 19-motorsport-vertical
    provides: "motorsport-incident-generator Edge Function (fully implemented)"
  - phase: 20-festivals-vertical
    provides: "EventIncidentReportCard + generateEventIncidentPDF pattern to mirror"
  - phase: 22-football-vertical
    provides: "FAIncidentReportCard pattern (second example to mirror)"
provides:
  - "generateMotorsportIncidentPDF() query function calling motorsport-incident-generator Edge Function"
  - "MotorsportIncidentReportCard client component with useMutation PDF download UX"
  - "Treatment detail page conditionally renders Motorsport UK Accident Form card for motorsport treatments"
affects:
  - "future-gap-closures"
  - "motorsport-vertical-completeness"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useMutation PDF generation card — established in Phase 20, now applied to motorsport vertical"
    - "Conditional vertical card render pattern: event_vertical === 'vertical' guard in server component"

key-files:
  created:
    - web/lib/queries/motorsport-incidents.ts
    - web/components/dashboard/MotorsportIncidentReportCard.tsx
  modified:
    - web/app/(dashboard)/treatments/[id]/page.tsx

key-decisions:
  - "23-06: MotorsportIncidentReportCard mirrors EventIncidentReportCard and FAIncidentReportCard exactly — same useMutation, Card/Button layout, onSuccess opens signed_url"
  - "23-06: request body uses incident_id (not treatment_id) — matches motorsport-incident-generator Edge Function validation at line 39"
  - "23-06: event_vertical: 'motorsport' required in request body — Edge Function returns 400 if missing or wrong (line 46)"
  - "23-06: motorsport card positioned after sporting_events card and before Photos section — consistent ordering of vertical-specific cards"

patterns-established:
  - "Vertical PDF card pattern: query fn in web/lib/queries/{vertical}-incidents.ts + card component in web/components/dashboard/{Vertical}IncidentReportCard.tsx + conditional render in treatments/[id]/page.tsx"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 23 Plan 06: Motorsport Incident Report Card Summary

**MotorsportIncidentReportCard + generateMotorsportIncidentPDF wired into treatment detail page, closing MOTO-07 — one-click Motorsport UK Accident Form PDF download for motorsport treatments**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T06:23:06Z
- **Completed:** 2026-02-18T06:25:26Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `generateMotorsportIncidentPDF()` query function that POSTs `{ incident_id, event_vertical: 'motorsport' }` to the `/functions/v1/motorsport-incident-generator` Edge Function
- Created `MotorsportIncidentReportCard` client component with useMutation, spinner state, `window.open(signed_url)` on success, and alert on error — matching the EventIncidentReportCard and FAIncidentReportCard patterns exactly
- Wired the card into `web/app/(dashboard)/treatments/[id]/page.tsx` with `event_vertical === 'motorsport'` conditional guard, closing the MOTO-07 gap

## Task Commits

Each task was committed atomically:

1. **Task 1: Create query function and card component** - `61c6407` (feat) — both files committed in pre-existing HEAD commit
2. **Task 2: Wire MotorsportIncidentReportCard into treatment detail page** - `81664c0` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `web/lib/queries/motorsport-incidents.ts` - `generateMotorsportIncidentPDF()` — fetches motorsport-incident-generator Edge Function with `{ incident_id: treatmentId, event_vertical: 'motorsport' }`, returns `{ success, pdf_path, signed_url }`
- `web/components/dashboard/MotorsportIncidentReportCard.tsx` - Client component with useMutation PDF download card; CardTitle "Motorsport UK — Accident Form"; button shows "Generating PDF..." while pending
- `web/app/(dashboard)/treatments/[id]/page.tsx` - Added import + conditional render block for MotorsportIncidentReportCard when `event_vertical === 'motorsport'`

## Decisions Made

- `incident_id` used as request body field name (not `treatment_id`) — confirmed from motorsport-incident-generator/index.ts line 39 validation
- `event_vertical: 'motorsport'` included in request body — Edge Function returns 400 if missing or wrong value (confirmed line 46)
- Card positioned after FAIncidentReportCard (sporting_events) and before Photos section — follows established ordering of vertical-specific cards in the treatment detail page

## Deviations from Plan

None — plan executed exactly as written. Task 1 files were found already committed in HEAD (61c6407) from a prior partial execution; content matched spec exactly so no rework was needed.

## Issues Encountered

Pre-existing TypeScript errors in `web/app/(dashboard)/treatments/[id]/page.tsx` (lines 129-130: `unknown` not assignable to `ReactNode` in vertical_extra_fields venue display) and in other unrelated files (`web/app/medic/profile/page.tsx`, `web/components/analytics/ComplianceScoreChart.tsx`). These were present before this plan and are not introduced by this work. No new TypeScript errors from the motorsport files.

## User Setup Required

None — no external service configuration required. The motorsport-incident-generator Edge Function is already deployed and operational from Phase 19.

## Next Phase Readiness

- MOTO-07 closed: motorsport end-to-end PDF download flow is complete
- All three vertical PDF cards (festivals, sporting_events, motorsport) follow the same pattern
- No blockers — v2.0 gap closure work continues

---
*Phase: 23-analytics-heat-maps-and-trend-charts*
*Completed: 2026-02-18*
