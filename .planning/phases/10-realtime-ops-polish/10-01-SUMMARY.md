---
phase: 10-realtime-ops-polish
plan: 01
subsystem: ui
tags: [zustand, supabase, realtime, typescript, map, location-tracking]

# Dependency graph
requires:
  - phase: 09-booking-data-completeness
    provides: bookings with medic_id, site_name, shift_start_time, shift_end_time fields
provides:
  - medicContext Map populated at subscribe time with joined medic+booking data
  - MedicLocation interface extended with shift_start_time and shift_end_time
  - Zero-N+1 context enrichment pattern for Realtime pings
affects:
  - 10-02 (MedicTrackingMap marker rendering — consumes shift_start_time, shift_end_time, medic_name)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Context-at-subscribe: fetch joined query once before Realtime channel opens; merge from Map on each ping"
    - "Inclusive booking status filter: use confirmed+in_progress (not just in_progress) to capture pre-start shifts"

key-files:
  created: []
  modified:
    - web/stores/useMedicLocationsStore.ts

key-decisions:
  - "Status filter includes 'confirmed' AND 'in_progress' to avoid silently dropping medics whose shifts haven't started yet"
  - "Photo field excluded — medics table has no photo/avatar column; deferred to future phase"
  - "subscribe() made async to await the context fetch before opening Realtime channel"

patterns-established:
  - "Context-at-subscribe pattern: single joined query before channel open, O(1) Map lookup per ping"

# Metrics
duration: 8min
completed: 2026-02-17
---

# Phase 10 Plan 01: Realtime Ops Polish — medicContext Map Summary

**medicContext Map populated at Realtime subscribe time via single bookings+medics join, providing medic_name/site_name/shift_times to every location ping with zero N+1 queries**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-17T17:32:33Z
- **Completed:** 2026-02-17T17:41:18Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `MedicContextEntry` interface (medic_name, booking_id, site_name, shift_start_time, shift_end_time, medic_phone)
- Added `medicContext: Map<string, MedicContextEntry>` to Zustand store state
- Extended `MedicLocation` with optional `shift_start_time` and `shift_end_time` fields
- `subscribe()` made async: fetches joined `bookings + medics!inner` query once before opening Realtime channel
- Realtime ping handler merges context from Map (`medicContext.get(ping.medic_id)`) — no per-ping DB calls
- TODO comment at original line 153 resolved and removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add medicContext Map and initial join query to useMedicLocationsStore** - `fae313e` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `web/stores/useMedicLocationsStore.ts` - Added MedicContextEntry type, medicContext Map state, async subscribe() with joined query, context merge in ping handler, shift time fields on MedicLocation

## Decisions Made
- **Status filter: confirmed + in_progress** — Using only `in_progress` would silently drop medics whose bookings are still `confirmed` (shift not yet started). Including `confirmed` ensures the context Map has entries for all today's active medics regardless of shift start.
- **No photo field** — The `medics` table has no `photo`/`avatar` column (verified during research phase). Photo support deferred to a future phase.
- **subscribe() async** — The function must `await` the context query before subscribing to Realtime so the Map is populated before any ping arrives.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- The TypeScript build has pre-existing errors in unrelated files (`app/admin/beacons/page.tsx`, `app/admin/booking-conflicts/page.tsx`, etc.) related to `OrgContextValue.org` not existing. These are NOT introduced by this plan. TypeScript type-check of `useMedicLocationsStore.ts` itself produces zero errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useMedicLocationsStore` now exports enriched `MedicLocation` objects with `medic_name`, `site_name`, `shift_start_time`, `shift_end_time` on every ping
- Plan 10-02 (MedicTrackingMap) can consume these fields directly for marker tooltip display
- No blockers for 10-02

---
*Phase: 10-realtime-ops-polish*
*Completed: 2026-02-17*
