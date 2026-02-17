---
phase: 09-booking-data-completeness
plan: 03
subsystem: ui
tags: [react, tanstack-table, supabase, what3words, sheet, recurring-bookings]

# Dependency graph
requires:
  - phase: 09-02
    provides: BookingDetailPanel Sheet component and BookingWithRelations type with all fields
  - phase: 09-01
    provides: What3WordsDisplay component and what3words_address field in booking API response
provides:
  - View Details button in admin booking table wired to open BookingDetailPanel
  - What3WordsDisplay component integrated into admin booking detail panel
  - Recurring booking chain table showing all instances with per-instance status
affects:
  - 10-any-future-admin-booking-features

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hooks-before-early-return: useState/useEffect declared before guard clause in components to comply with Rules of Hooks"
    - "Single .or() query to fetch parent + all children in one request for recurring chain (no N+1)"
    - "suppressHydrationWarning on all date-rendered td/span elements (D-04-03-001)"

key-files:
  created: []
  modified:
    - web/components/admin/booking-approval-table.tsx
    - web/components/admin/booking-detail-panel.tsx

key-decisions:
  - "Moved hooks (useState/useEffect) above the `if (!booking) return null` guard clause to comply with React Rules of Hooks — hooks cannot be called conditionally"
  - "Kept inline formatWhat3Words removal clean — no dangling function, What3WordsDisplay handles its own formatting"
  - "Used .or(id.eq.${rootId},parent_booking_id.eq.${rootId}) to fetch entire recurring chain in a single query"

patterns-established:
  - "Admin detail panel pattern: Sheet slide-over with useEffect data fetch on open"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 09 Plan 03: Admin Booking Detail Wiring Summary

**Admin View Details button wired to BookingDetailPanel Sheet; panel upgraded with What3WordsDisplay component and live recurring chain table fetched via single .or() Supabase query**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T17:28:18Z
- **Completed:** 2026-02-17T17:30:35Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- View Details DropdownMenuItem in booking-approval-table.tsx now opens BookingDetailPanel with the selected booking
- What3WordsDisplay component replaces inline formatWhat3Words span in BookingDetailPanel
- Recurring booking chain table fetches all instances (parent + children) via a single Supabase .or() query and renders them sorted by date with per-instance status badges, highlighting the currently-viewed booking

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire View Details button in booking-approval-table.tsx** - `bbb7cbe` (feat)
2. **Task 2: Add What3WordsDisplay and recurring chain to booking-detail-panel.tsx** - `8b4b509` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/components/admin/booking-approval-table.tsx` - Added BookingDetailPanel import, detailPanelOpen/selectedDetailBooking state, onClick on View Details item, BookingDetailPanel rendered in JSX
- `web/components/admin/booking-detail-panel.tsx` - Added useState/useEffect imports, What3WordsDisplay import, createClient import; moved hooks above early return guard; replaced inline what3words span with What3WordsDisplay; replaced placeholder div with full recurring chain table

## Decisions Made
- Hooks (useState/useEffect) moved above `if (!booking) return null` guard — React Rules of Hooks requires all hooks to be called unconditionally. The useEffect deps include `booking?.id`, `booking?.is_recurring`, `booking?.parent_booking_id` with optional chaining, so the effect is a no-op when booking is null.
- Removed the `formatWhat3Words` inline helper function entirely since What3WordsDisplay handles its own formatting internally.

## Deviations from Plan

None - plan executed exactly as written.

The one structural note (hooks-before-early-return) was explicitly anticipated in the plan task description, which placed hooks before the guard clause. Followed as specified.

## Issues Encountered
None — TypeScript type check confirms zero errors in both modified files (pre-existing errors in unrelated files were not introduced by this plan).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 09 (Booking Data Completeness) is now complete — all 3 plans done
- All 4 phase success criteria met:
  1. Client sees special notes and what3words (Plan 09-01)
  2. Admin sees approval reason and cancellation details (Plans 09-02 + 09-03)
  3. Recurring chain shows all instances with per-instance status (Plan 09-03)
  4. Refund amount visible when applicable (Plan 09-02)
- Ready for Phase 10 or Phase 11 (Org Settings)

---
*Phase: 09-booking-data-completeness*
*Completed: 2026-02-17*
