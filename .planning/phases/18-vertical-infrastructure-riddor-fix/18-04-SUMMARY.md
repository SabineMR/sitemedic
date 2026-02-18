---
phase: 18-vertical-infrastructure-riddor-fix
plan: "04"
subsystem: ui
tags: [expo-router, watermelondb, react-native, org-context, vertical, riddor]

# Dependency graph
requires:
  - phase: 18-03
    provides: OrgContext with useOrg() hook and primaryVertical (AsyncStorage-cached, zero network on form mount)
  - phase: 18-01
    provides: Treatment model with eventVertical and bookingId fields (WatermelonDB schema v4)
provides:
  - Treatment form reads vertical from OrgContext (no per-mount Supabase call)
  - Booking vertical override via route params (event_vertical takes precedence over org default)
  - Treatment WatermelonDB record stores eventVertical and bookingId at creation
  - enqueueSyncItem payload includes event_vertical and booking_id for RIDDOR detector
affects: [18-06, phase-19, phase-22, riddor-detector, sync-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Context-first vertical resolution: useOrg().primaryVertical ?? route param override"
    - "Booking vertical passthrough: params.event_vertical takes precedence over org default"
    - "orgVertical variable name preserved for all downstream consumers (no rename needed)"

key-files:
  created: []
  modified:
    - app/treatment/new.tsx

key-decisions:
  - "orgVertical derived as (params.event_vertical ?? primaryVertical) — preserves fallback chain without renaming downstream usages"
  - "bookingId uses ?? null (not || null) — consistent with 18-05 pattern, preserves empty string distinction"
  - "t.bookingId = bookingId ?? undefined — aligns with Treatment model field type (optional string, not nullable)"

patterns-established:
  - "Route params override context: booking-specific vertical passed as route param, org default from context"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 18 Plan 04: Treatment Form — OrgContext Wiring & Booking Vertical Override Summary

**Treatment form refactored to read vertical from OrgContext (zero per-mount Supabase call) with booking-level vertical override via route params, wiring eventVertical and bookingId into both the WatermelonDB record and the sync payload**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T02:58:59Z
- **Completed:** 2026-02-18T03:00:23Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Removed `fetchOrgVertical` function (per-mount Supabase network call) from `app/treatment/new.tsx`
- Replaced with `useOrg()` from OrgContext — vertical now served from AsyncStorage cache (zero network on form mount)
- Added `useLocalSearchParams` to accept `booking_id` and `event_vertical` route params
- Booking vertical override: `params.event_vertical ?? primaryVertical` — booking context takes precedence
- `t.eventVertical` and `t.bookingId` written to WatermelonDB Treatment record at creation
- `event_vertical` and `booking_id` added to `enqueueSyncItem` payload — RIDDOR detector can now read booking vertical

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace fetchOrgVertical with useOrg and add booking route param support** - `6fe8f6c` (feat)

**Plan metadata:** (included in task commit — single-task plan)

## Files Created/Modified

- `app/treatment/new.tsx` — Removed fetchOrgVertical, added useOrg + useLocalSearchParams, wired eventVertical + bookingId into record creation and sync payload

## Decisions Made

- `orgVertical` variable name preserved (not renamed) — all 10+ downstream usages (`getMechanismPresets`, `getVerticalOutcomeCategories`, `getPatientLabel`, `getVerticalCompliance`) work identically without any other changes
- `bookingId ?? undefined` used for `t.bookingId` to match Treatment model field type (`bookingId?: string` — optional, not nullable in WatermelonDB)
- `bookingId ?? null` used in sync payload (Supabase column accepts NULL, not undefined)
- `?? null` pattern (not `|| null`) consistent with 18-05 decision — preserves empty string distinction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `web/lib/invoices/pdf-generator.ts` are unrelated to this plan and were present before this change. `app/treatment/new.tsx` compiles with zero errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 18-04 completes the OrgContext wiring for the treatment form
- Treatments created from a booking now carry the booking's vertical through to Supabase via the sync payload
- RIDDOR detector (18-02) can read `event_vertical` from the treatment record to apply correct gating
- Plan 18-05 (already complete) wired `eventVertical` into booking creation routes — the full vertical chain is now connected: booking creation → treatment form → WatermelonDB → sync → Supabase → RIDDOR detector
- Note: 18-04 was executed after 18-05 in practice (plans were completed out of order); no dependency conflict

---
*Phase: 18-vertical-infrastructure-riddor-fix*
*Completed: 2026-02-18*
