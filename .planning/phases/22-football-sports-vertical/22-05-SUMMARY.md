---
phase: 22-football-sports-vertical
plan: 05
subsystem: ui
tags: [react, typescript, supabase-edge-functions, fa-incident-generator, sporting-events, pdf-generation]

# Dependency graph
requires:
  - phase: 22-football-sports-vertical
    provides: fa-incident-generator Edge Function (plans 01-04), sporting_events vertical form, RIDDOR gate, PDF generation
  - phase: 20-festivals-events
    provides: EventIncidentReportCard pattern that FAIncidentReportCard mirrors
provides:
  - generateFAIncidentPDF() query function in web/lib/queries/fa-incidents.ts
  - FAIncidentReportCard React component for sporting_events treatment detail pages
  - FA / SGSA Match Day Report one-click download UI wired to fa-incident-generator
affects: [23-compliance-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vertical-conditional card pattern: treatment.event_vertical === 'vertical' guards PDF download cards"
    - "Query function mirrors event-incidents.ts: fetch + bearer token + JSON body with event_vertical"

key-files:
  created:
    - web/lib/queries/fa-incidents.ts
    - web/components/dashboard/FAIncidentReportCard.tsx
  modified:
    - web/app/(dashboard)/treatments/[id]/page.tsx
    - web/lib/pdf/incident-report-dispatcher.ts

key-decisions:
  - "FAIncidentReportCard mirrors EventIncidentReportCard exactly — same useMutation pattern, same Card/Button layout"
  - "Return type includes patient_type: 'player' | 'spectator' — fa-incident-generator routes form automatically"
  - "Stale 'currently returns 501' comments removed from incident-report-dispatcher.ts — all three non-RIDDOR generators now marked 'fully implemented'"

patterns-established:
  - "Vertical PDF card pattern: one card component per vertical, guarded by event_vertical === 'X'"
  - "Query function pattern: createClient + getSession + fetch to Edge Function URL with bearer token"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 22 Plan 05: FA Incident UI Gap Closure Summary

**FAIncidentReportCard component + generateFAIncidentPDF query wired to fa-incident-generator, closing Truth 5: sporting_events treatment detail page now shows FA / SGSA Match Day Report download card**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T04:53:21Z
- **Completed:** 2026-02-18T04:57:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `web/lib/queries/fa-incidents.ts` — `generateFAIncidentPDF()` calls fa-incident-generator with `event_vertical: 'sporting_events'` and returns `{ success, patient_type, signed_url, file_name }`
- Created `web/components/dashboard/FAIncidentReportCard.tsx` — mirrors EventIncidentReportCard exactly; card title "FA / SGSA Match Day Report"; automatically routes player vs spectator form via patient_type returned by the Edge Function
- Updated `web/app/(dashboard)/treatments/[id]/page.tsx` — added import and `{treatment.event_vertical === 'sporting_events' && <FAIncidentReportCard treatmentId={treatment.id} />}` block after the festivals card
- Fixed stale comments in `web/lib/pdf/incident-report-dispatcher.ts` — removed "currently returns 501" for all three non-RIDDOR generators

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fa-incidents query function** - `297a39e` (feat)
2. **Task 2: Create FAIncidentReportCard component and wire treatment detail page** - `e1dc92e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/lib/queries/fa-incidents.ts` — generateFAIncidentPDF() Edge Function caller for fa-incident-generator
- `web/components/dashboard/FAIncidentReportCard.tsx` — FA / SGSA Match Day Report download card for sporting_events
- `web/app/(dashboard)/treatments/[id]/page.tsx` — added FAIncidentReportCard import and sporting_events conditional block
- `web/lib/pdf/incident-report-dispatcher.ts` — removed stale "currently returns 501" comments; all generators marked fully implemented

## Decisions Made

- Mirrored EventIncidentReportCard pattern exactly — useMutation, Card/Button layout, onSuccess opens signed_url in new tab, onError alerts user
- Return type `{ success, patient_type: 'player' | 'spectator', signed_url, file_name }` matches fa-incident-generator response schema from Phase 22 plans 01-04
- FAIncidentReportCard placed after EventIncidentReportCard block in treatment page — maintains vertical card ordering (festivals then sporting_events)
- Both "currently returns 501" comment in the file header and "Non-RIDDOR verticals currently return a 501" in the JSDoc updated simultaneously — complete comment hygiene pass on dispatcher

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `app/(dashboard)/treatments/[id]/page.tsx` (TS2322 on unknown ReactNode) and `app/medic/profile/page.tsx` (TS2367) are unrelated to this plan and were present before execution.

## User Setup Required

None - no external service configuration required. fa-incident-generator Edge Function was fully implemented in Phase 22 plans 01-04.

## Next Phase Readiness

- Phase 22 gap closure complete — Truth 5 satisfied: admin visiting a sporting_events treatment now sees the FA / SGSA Match Day Report card
- All 5 gap closure truths from Phase 22 integration verification are now addressed
- Phase 22 Football Sports Vertical is fully complete (5/5 plans + gap closure)
- Ready for Phase 23: Compliance Analytics

---
*Phase: 22-football-sports-vertical*
*Completed: 2026-02-18*
