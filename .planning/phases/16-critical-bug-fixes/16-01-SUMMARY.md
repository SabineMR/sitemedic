---
phase: 16-critical-bug-fixes
plan: 01
subsystem: ui
tags: [nextjs, supabase, zustand, react, payslips, medic-portal]

# Dependency graph
requires:
  - phase: 06.5-payments-payouts
    provides: timesheets table with medic_id FK to medics(id)
provides:
  - Correct payslip query using medics table PK (medic.id) not auth UUID (user.id)
  - Null guard on missing medic record in payslip page
  - Clean location store with no console.warn production noise
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Always resolve medics.id from user_id before FK queries (auth UUID != medics PK)"
    - "Null guard early-return pattern for missing medic record in async fetch functions"

key-files:
  created: []
  modified:
    - web/app/medic/payslips/page.tsx
    - web/stores/useMedicLocationsStore.ts

key-decisions:
  - "D-16-01-001: timesheets.medic_id is FK to medics(id) — always use medics table PK, never auth user UUID"
  - "D-16-01-002: null guard exits early with setLoading(false) so spinner does not hang when medic record is absent"

patterns-established:
  - "Null guard pattern: if (!medic) { setLoading(false); return; } before dependent queries"

# Metrics
duration: 4min
completed: 2026-02-17
---

# Phase 16 Plan 01: Payslip medic_id fix + console.warn removal Summary

**Fixed empty payslip list by correcting timesheets query to use medics table PK (medic.id) instead of auth UUID (user.id), plus added early-return null guard and removed console.warn debug noise from production location store.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-17T20:21:31Z
- **Completed:** 2026-02-17T20:25:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed root cause of empty payslip list: `.eq('medic_id', user.id)` replaced with `.eq('medic_id', medic.id)` — `timesheets.medic_id` is a FK to `medics(id)`, not `auth.users.id`
- Added null guard that exits early with `setLoading(false)` when no medic record found, preventing a hanging spinner and a query with undefined ID
- Removed `console.warn('[Realtime] Received partial update for unknown medic:', medicId)` from `useMedicLocationsStore.ts` — `return state;` correctly handles the case; the log was debug noise in production

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix payslip medic_id query and add null guard** - `2c226ed` (fix)
2. **Task 2: Remove console.warn from useMedicLocationsStore** - `2c226ed` (fix, combined with Task 1)

## Files Created/Modified

- `web/app/medic/payslips/page.tsx` - Corrected `.eq('medic_id', medic.id)`, added null guard before timesheet query
- `web/stores/useMedicLocationsStore.ts` - Removed console.warn line from partial-update else branch

## Decisions Made

- **D-16-01-001:** `timesheets.medic_id` is a FK to `medics(id)` — the auth UUID (`user.id`) and the medics table PK (`medic.id`) are different UUIDs. The auth user ID cannot be used as a medics FK filter.
- **D-16-01-002:** Null guard exits early with `setLoading(false)` so the spinner does not hang indefinitely when a medic record is absent. The previous `if (medic) setMedicId(medic.id)` would fall through and fire a query with an undefined ID.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Build cache was stale (missing `.next/build-manifest.json`). Cleared `.next` directory and ran clean build — 83 pages compiled successfully with zero TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Medics can now see their payslips at `/medic/payslips` (approved and paid timesheets listed correctly)
- Location store is clean: no console.warn in production logs
- Plan 16-02 is independent and can proceed

---
*Phase: 16-critical-bug-fixes*
*Completed: 2026-02-17*
