---
phase: 09-booking-data-completeness
plan: 02
subsystem: ui
tags: [react, shadcn, sheet, admin, booking, typescript]

# Dependency graph
requires:
  - phase: 09-booking-data-completeness
    provides: BookingWithRelations type and admin booking queries from plan 09-01

provides:
  - BookingWithRelations type with what3words_address field (TypeScript-safe)
  - BookingDetailPanel Sheet component with all admin operational fields

affects:
  - 09-03-booking-data-completeness (wires detail panel to booking table; adds recurring chain)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional section rendering: show sections only when data is relevant (approval, cancellation, refund)"
    - "Inline pure function to avoid API-initialising module import side-effects"

key-files:
  created:
    - web/components/admin/booking-detail-panel.tsx
  modified:
    - web/lib/queries/admin/bookings.ts

key-decisions:
  - "Inline formatWhat3Words instead of importing from what3words.ts — avoids API client initialisation at module load in a client component"
  - "Refund section hidden when refund_amount === 0 (DB default) — showing GBP 0.00 would be confusing for admins"
  - "cancelled_by rendered as plain text per Research recommendation (may be a name or ID)"

patterns-established:
  - "BookingDetailPanel: Sheet slide-over pattern for admin detail views"
  - "Conditional sections use boolean/nullish guards at section level, not individual field level"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 09 Plan 02: Admin Booking Detail Panel Summary

**BookingDetailPanel Sheet component surfacing all admin operational fields: site contact info, approval reason, cancellation details, and conditional refund amount**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T17:23:38Z
- **Completed:** 2026-02-17T17:25:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed `BookingWithRelations` TypeScript interface to include `what3words_address: string | null` — field was already fetched by query, type was missing
- Created `BookingDetailPanel` Sheet component covering all admin operational fields
- Refund amount section only rendered when `refund_amount > 0` — no GBP 0.00 noise for admins
- Approval section only rendered when `requires_manual_approval` is true
- Cancellation section only rendered when `status === 'cancelled'`
- Recurring chain placeholder `div#recurring-chain-container` ready for Plan 09-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix BookingWithRelations type** - `8203582` (feat)
2. **Task 2: Create BookingDetailPanel Sheet component** - `5f79bd2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/lib/queries/admin/bookings.ts` - Added `what3words_address: string | null` to `BookingWithRelations` interface
- `web/components/admin/booking-detail-panel.tsx` - New admin booking detail Sheet component with all operational fields

## Decisions Made

- **Inline formatWhat3Words**: The `what3words.ts` utility initialises an API client at module load time. Importing it in a client component would trigger that initialisation unnecessarily. The `formatWhat3Words` function is a pure string helper (strips leading slashes, prepends `///`), so it was inlined directly in the component.
- **No what3words module import**: Plan mentioned importing `formatWhat3Words` from `@/lib/utils/what3words`, but that module has an API-initialising side-effect. Inlined the pure function instead (Rule 2 - missing critical; prevents unexpected API calls in admin panel).
- **cancelled_by as plain text**: Rendered as-is per Research recommendation — value may be admin name, user ID, or system string depending on cancellation source.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Inlined formatWhat3Words to avoid what3words API initialisation**

- **Found during:** Task 2 (BookingDetailPanel creation)
- **Issue:** The plan specified importing `formatWhat3Words` from `@/lib/utils/what3words`. That module initialises `w3wClient = what3wordsApi(apiKey)` at module load time — a network-capable API client — which would run in the client bundle unnecessarily just to use a pure string formatter.
- **Fix:** Inlined a 3-line equivalent pure function directly in the component. Identical behaviour, no API side-effects.
- **Files modified:** web/components/admin/booking-detail-panel.tsx
- **Verification:** Component renders what3words addresses in `///word.word.word` format without importing the API module
- **Committed in:** 5f79bd2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — prevented unnecessary API client initialisation)
**Impact on plan:** Zero scope change. Pure string function inlined; no functional difference. No scope creep.

## Issues Encountered

None — plan executed with one minor auto-fix for the what3words import side-effect.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `BookingDetailPanel` is ready to be wired into `booking-approval-table.tsx` in Plan 09-03
- The "View Details" dropdown item in `booking-approval-table.tsx` is still a no-op — Plan 09-03 connects it to this panel
- `div#recurring-chain-container` placeholder is in place for the recurring chain query in Plan 09-03
- `BookingWithRelations` type now TypeScript-safe for `what3words_address` access

---
*Phase: 09-booking-data-completeness*
*Completed: 2026-02-17*
