---
phase: 08-lead-capture
plan: 08-04
subsystem: web-ui
tags: [next.js, search-params, suspense, booking-form, quote-conversion]

# Dependency graph
requires:
  - phase: 08-03
    provides: quote-submissions-table.tsx with "Convert to Booking" button building URL params
provides:
  - New booking form accepts URL search params for pre-filling
  - clientEmail, siteAddress, shiftDate, confinedSpace, traumaSpecialist, specialNotes pre-filled from URL
  - Suspense boundary wraps useSearchParams per Next.js App Router requirement
  - No regression: empty form when no params present
affects:
  - Quote-to-booking conversion flow is now complete end-to-end

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSearchParams with Suspense boundary — Next.js App Router requirement for client components"
    - "Boolean URL params as string '1' — confinedSpace=1 and traumaSpecialist=1 map to boolean true"
    - "Nullish coalescing fallback — searchParams.get('x') ?? '' preserves empty default for unprovided params"

key-files:
  modified:
    - web/app/admin/bookings/new/page.tsx

key-decisions:
  - "D-08-04-001: Extract NewBookingForm as inner component so Suspense can wrap useSearchParams usage at the page boundary"
  - "D-08-04-002: Boolean params encoded as '1' string (confinedSpace=1) matching quote-submissions-table.tsx URLSearchParams encoding"
  - "D-08-04-003: Fields not pre-filled (siteName, sitePostcode, siteContactName, siteContactPhone) are not captured in quote data — admin fills manually"

patterns-established:
  - "Suspense-wrapped useSearchParams pattern: rename page fn to inner form component, wrap in Suspense default export"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 08 Plan 04: Quote-to-Booking Pre-fill Summary

**Next.js App Router useSearchParams integration completing the quote-to-booking conversion flow with Suspense boundary and 6-field URL param pre-fill**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T17:05:00Z
- **Completed:** 2026-02-17T17:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `useSearchParams` and `Suspense` imports to `web/app/admin/bookings/new/page.tsx`
- Renamed `NewBookingPage` to `NewBookingForm` (inner component using `useSearchParams`)
- New default export `NewBookingPage` wraps `NewBookingForm` in `Suspense` with loading fallback
- Form state seeded from URL params: clientEmail, siteAddress, shiftDate, confinedSpace (`=== '1'`), traumaSpecialist (`=== '1'`), specialNotes
- Empty defaults preserved for non-param fields: siteName, sitePostcode, siteContactName, siteContactPhone, shiftStartTime, shiftEndTime, qualification

## Task Commits

1. **Task 1: Add useSearchParams pre-fill to new booking page** — `5580202` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified
- `web/app/admin/bookings/new/page.tsx` — Added useSearchParams pre-fill with Suspense boundary

## Decisions Made
- **D-08-04-001:** Inner component pattern for Suspense — Next.js requires Suspense to wrap `useSearchParams` usage; extracting `NewBookingForm` is the cleanest approach
- **D-08-04-002:** Boolean params as `'1'` string — matches the `URLSearchParams` encoding in `quote-submissions-table.tsx` (`confinedSpace: quote.special_requirements?.includes('confined-space') ? '1' : '0'`)
- **D-08-04-003:** Non-quote fields left empty — siteName, sitePostcode, siteContactName, siteContactPhone are not captured during quote submission; admin fills these during conversion

## Deviations from Plan

None — plan executed exactly as written.

## The Complete Quote-to-Booking Flow

The full conversion flow is now operational:

1. Admin views Leads page at `/admin/submissions`
2. Clicks "Quotes" tab → sees `QuoteSubmissionsTable`
3. Clicks "Convert to Booking" on a quote row
4. `router.push('/admin/bookings/new?clientEmail=...&siteAddress=...&...')` navigates
5. New booking form opens with client email, site address, date, confined space, trauma specialist, and special notes pre-filled
6. Admin fills in remaining fields (site name, postcode, contact) and submits
7. `converted_booking_id` can be set on the quote record when booking is confirmed

## Issues Encountered
None.

## User Setup Required
None — no configuration required for this change.

## Next Phase Readiness
- Phase 08 (Lead Capture & Data Persistence) is now 4/4 plans complete
- All must_haves for 08-04 are satisfied:
  - ✓ Navigating with clientEmail param pre-fills email field
  - ✓ Navigating with confinedSpace=1 checks the checkbox
  - ✓ Navigating with no params shows empty form (no regression)
  - ✓ specialNotes param pre-fills the notes textarea
  - ✓ shiftDate param pre-fills the date picker
- Ready for Phase 08 verification (gsd-verifier)

---
*Phase: 08-lead-capture*
*Completed: 2026-02-17*
