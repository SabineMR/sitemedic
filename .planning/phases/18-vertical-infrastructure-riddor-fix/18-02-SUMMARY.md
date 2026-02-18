---
phase: 18-vertical-infrastructure-riddor-fix
plan: "02"
subsystem: api
tags: [supabase, edge-functions, riddor, deno, typescript, pdf-routing, vertical-gate]

# Dependency graph
requires:
  - phase: 18-01
    provides: WatermelonDB schema v4 with vertical fields on Treatment model
  - phase: 06
    provides: riddor-detector and riddor-f2508-generator Edge Functions

provides:
  - NON_RIDDOR_VERTICALS gate in riddor-detector before detectRIDDOR() call
  - riddor-f2508-generator returns HTTP 400 for non-RIDDOR verticals
  - event-incident-report-generator scaffold (Phase 19+ stub)
  - motorsport-incident-generator scaffold (Phase 19+ stub)
  - fa-incident-generator scaffold (Phase 22+ stub)
  - web/lib/pdf/incident-report-dispatcher.ts routing utility

affects:
  - "18-03 through 18-05 (vertical config and form scaffolds)"
  - "19 (Motorsport PDF — incident-report-dispatcher already routes to motorsport-incident-generator)"
  - "22 (Football/FA scope — fa-incident-generator stub ready)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vertical gate pattern: NON_RIDDOR_VERTICALS array + early return before domain logic"
    - "Edge Function stub pattern: Deno.serve with vertical validation + 501 until Phase 19+"
    - "PDF dispatcher pattern: FUNCTION_BY_VERTICAL record routes by vertical string"

key-files:
  created:
    - supabase/functions/event-incident-report-generator/index.ts
    - supabase/functions/event-incident-report-generator/types.ts
    - supabase/functions/motorsport-incident-generator/index.ts
    - supabase/functions/motorsport-incident-generator/types.ts
    - supabase/functions/fa-incident-generator/index.ts
    - supabase/functions/fa-incident-generator/types.ts
    - web/lib/pdf/incident-report-dispatcher.ts
  modified:
    - supabase/functions/riddor-detector/index.ts
    - supabase/functions/riddor-f2508-generator/index.ts

key-decisions:
  - "NON_RIDDOR_VERTICALS array declared inline in each function — not a shared import — to keep Edge Functions self-contained"
  - "riddor-f2508-generator adds event_vertical to treatments join select to access the field for validation"
  - "fa-incident-generator uses sporting_events vertical (not 'football') matching DB vertical IDs"
  - "Dispatcher uses @/lib/supabase/client (createBrowserClient via @supabase/ssr) — correct for client components"

patterns-established:
  - "Vertical gate: check NON_RIDDOR_VERTICALS before calling domain logic, return {detected:false} early"
  - "Edge Function stub: validate input, validate vertical, return 501 with scheduled phase note"
  - "PDF dispatcher: single routing table Record<vertical, functionName> in web/lib/pdf/"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 18 Plan 02: Vertical Infrastructure & RIDDOR Fix Summary

**RIDDOR vertical gate inserted before detectRIDDOR() in riddor-detector; three new vertical Edge Function stubs scaffolded; incident-report-dispatcher routing utility created**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T02:53:16Z
- **Completed:** 2026-02-18T02:55:51Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Inserted NON_RIDDOR_VERTICALS gate in `riddor-detector/index.ts` that resolves the effective vertical (from `treatment.event_vertical` or falls back to `org_settings.industry_verticals[0]`) and early-returns `{detected: false}` for festivals, motorsport, sporting_events, fairs_shows, and private_events — stopping false RIDDOR incidents from non-workplace verticals
- Added matching vertical validation in `riddor-f2508-generator/index.ts` that returns HTTP 400 when called for a non-RIDDOR vertical (also added `event_vertical` to the treatments join select so the field is available)
- Scaffolded three new Edge Functions: `event-incident-report-generator` (festivals/fairs_shows/private_events), `motorsport-incident-generator` (motorsport), and `fa-incident-generator` (sporting_events) — each a Phase 18 stub returning 501 with a scheduled-phase note, matching the `Deno.serve` + `npm:` import pattern from the existing codebase
- Created `web/lib/pdf/incident-report-dispatcher.ts` with a `FUNCTION_BY_VERTICAL` routing table and `generateIncidentReportPDF()` export for routing incident PDF requests to the correct Edge Function by vertical

## Task Commits

Each task was committed atomically:

1. **Task 1: Insert vertical gate into riddor-detector and add F2508 vertical validation** - `5fae1a1` (feat)
2. **Task 2: Scaffold three new vertical Edge Functions and create incident-report-dispatcher** - `84d8c93` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/functions/riddor-detector/index.ts` — Added NON_RIDDOR_VERTICALS gate with org_settings fallback lookup before detectRIDDOR()
- `supabase/functions/riddor-f2508-generator/index.ts` — Added event_vertical to treatments join select; added NON_RIDDOR_VERTICALS validation returning HTTP 400
- `supabase/functions/event-incident-report-generator/index.ts` — Deno.serve stub for festivals/fairs_shows/private_events, returns 501
- `supabase/functions/event-incident-report-generator/types.ts` — EventIncidentData interface
- `supabase/functions/motorsport-incident-generator/index.ts` — Deno.serve stub for motorsport, returns 501
- `supabase/functions/motorsport-incident-generator/types.ts` — MotorsportIncidentData interface
- `supabase/functions/fa-incident-generator/index.ts` — Deno.serve stub for sporting_events, returns 501
- `supabase/functions/fa-incident-generator/types.ts` — FAIncidentData interface
- `web/lib/pdf/incident-report-dispatcher.ts` — FUNCTION_BY_VERTICAL routing table + generateIncidentReportPDF() export

## Decisions Made

- **NON_RIDDOR_VERTICALS declared inline in each function** — keeps Edge Functions self-contained with no shared import dependency; consistent with the existing codebase pattern where Edge Functions are isolated
- **riddor-f2508-generator validation uses joined treatment.event_vertical** — the incident record joins treatments, so we added `event_vertical` to the treatments select rather than making a second query
- **fa-incident-generator uses `sporting_events` vertical** — matches the DB vertical ID string, not 'football' or 'fa'
- **Dispatcher imports `@/lib/supabase/client`** — uses the `createBrowserClient` pattern (`@supabase/ssr`) consistent with all web/lib client components

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. One pre-existing TypeScript error in `web/lib/territory/__tests__/auto-assignment-success-rate.test.ts` (missing `region` property on TerritoryAssignment, introduced in Phase 7.5) was present before this plan and is unrelated to Phase 18 changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- RIDDOR gate is live: any treatment with a non-RIDDOR vertical will now early-return `{detected: false}` from the riddor-detector function, stopping false RIDDOR incidents
- Three Edge Function stubs are ready — Phase 19 (motorsport PDF) and Phase 22 (FA/football PDF) can build on these scaffolds
- `generateIncidentReportPDF()` dispatcher is ready for integration in incident detail views
- Next: 18-03 (vertical config static files or form scaffolds — check plan)

---
*Phase: 18-vertical-infrastructure-riddor-fix*
*Completed: 2026-02-18*
