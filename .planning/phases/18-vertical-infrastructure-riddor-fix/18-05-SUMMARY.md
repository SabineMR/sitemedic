---
phase: 18-vertical-infrastructure-riddor-fix
plan: 05
subsystem: api
tags: [bookings, vertical, event-vertical, typescript, supabase, net30, stripe]

# Dependency graph
requires:
  - phase: 18-01
    provides: bookings.event_vertical column added via migration 123_booking_briefs.sql
provides:
  - eventVertical field wired into BookingRequest interface for both booking creation routes
  - event_vertical stored in Supabase for every booking created via Net-30 and prepay paths
affects:
  - booking-briefs-form (reads event_vertical to show correct brief fields)
  - mobile-app treatments (event_vertical drives vertical-specific form fields)
  - Phase 23 compliance analytics (can now filter/group by event_vertical)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional field with null coalescing: body.eventVertical ?? null — consistent pattern for all optional booking fields"

key-files:
  created: []
  modified:
    - web/app/api/bookings/create/route.ts
    - web/app/api/bookings/create-payment-intent/route.ts

key-decisions:
  - "eventVertical placed before pricing in BookingRequest interface — groups identity/context fields before financial fields"
  - "?? null used (not || null) — preserves empty string distinction if needed in future; consistent with other optional fields"

patterns-established:
  - "Optional vertical field pattern: add to interface as eventVertical?: string, write as event_vertical: body.eventVertical ?? null"

# Metrics
duration: 1min
completed: 2026-02-18
---

# Phase 18 Plan 05: VERT-06 API Gap — eventVertical Wired into Both Booking Creation Routes

**Added `eventVertical?: string` to both BookingRequest interfaces and `event_vertical: body.eventVertical ?? null` to both Supabase inserts, closing the API gap in VERT-06 so every booking now persists its event vertical to the database**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-18T02:54:10Z
- **Completed:** 2026-02-18T02:55:25Z
- **Tasks:** 1 auto (Task 2 is checkpoint:verify — documented below)
- **Files modified:** 2

## Accomplishments

- `eventVertical?: string` added to `BookingRequest` interface in `/api/bookings/create` (Net-30 path)
- `event_vertical: body.eventVertical ?? null` added to Supabase insert in Net-30 route
- `eventVertical?: string` added to the separate `BookingRequest` interface in `/api/bookings/create-payment-intent` (prepay path)
- `event_vertical: body.eventVertical ?? null` added to Supabase insert in prepay route
- Confirmed `bookings.event_vertical TEXT` column exists via migration 123_booking_briefs.sql
- TypeScript pre-existing error in unrelated test file confirmed pre-existing (not introduced by this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add eventVertical to BookingRequest and wire event_vertical into both booking creation routes** - `a5edeef` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/app/api/bookings/create/route.ts` — Added `eventVertical?: string` to `BookingRequest` interface (line 37); added `event_vertical: body.eventVertical ?? null` to Supabase insert (line 159)
- `web/app/api/bookings/create-payment-intent/route.ts` — Added `eventVertical?: string` to `BookingRequest` interface (line 42); added `event_vertical: body.eventVertical ?? null` to Supabase insert (line 130)

## Decisions Made

- `eventVertical` placed before `pricing` in both `BookingRequest` interfaces — groups identity/context fields before financial fields, matching existing field grouping convention
- `?? null` used instead of `|| null` — preserves semantic distinction between undefined (not sent) and empty string (sent but empty), consistent with `what3wordsAddress: body.what3wordsAddress || null` pattern already in both files
- No changes made to any other logic — payment intent creation, Stripe calls, credit limit checks, email sends all untouched as instructed

## Checkpoint: Task 2 Verification Findings (VERT-05 + VERT-06 UI)

Task 2 is `type="checkpoint:verify"` — no code changes. Verification findings documented here:

### VERT-05: Admin Vertical Selector — CONFIRMED COMPLETE

**File:** `web/app/admin/settings/page.tsx`

- `toggleVertical()` function: EXISTS at line 162. Toggles vertical in/out of `settings.industry_verticals` array. Enforces minimum of one selected.
- `handleSaveVerticals()` function: EXISTS at line 175. PUTs `{ industry_verticals: settings.industry_verticals }` to `/api/admin/settings`. Shows toast on success/failure.
- Vertical selector grid: EXISTS at lines 300–318. Renders a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` grid of 10 vertical cards. Each card calls `toggleVertical(v.id)` on click. Selected cards get color-coded border/background from `COLOR_MAP`.
- All 10 verticals defined: construction, tv_film, motorsport, festivals, sporting_events, fairs_shows, corporate, private_events, education, outdoor_adventure
- VERT-05 is fully implemented end-to-end. No code changes needed or made.

### VERT-06: Booking Form Vertical Capture — CONFIRMED COMPLETE

**File:** `web/components/booking/shift-config.tsx`

- `eventVertical` captured: YES. Line 90: `const currentVertical = (formData.eventVertical || 'general') as BookingVerticalId;`
- Vertical selector rendered: YES. Lines 184–199 render a `<Select>` bound to `formData.eventVertical`. On change, calls `handleVerticalChange(verticalId)` which calls `onChange({ eventVertical: verticalId, ... })`.
- Requirements reset on vertical change: YES. `handleVerticalChange` clears `selectedRequirements`, resets booleans, calls `requirementsToBooleans` for new vertical.

**File:** `web/components/booking/booking-form.tsx`

- `formData.eventVertical` initialized: YES. Line 76: `eventVertical: defaultVertical` where `defaultVertical` is prefill from QuoteBuilder or org's first vertical.
- `eventVertical` passed to API at form submit: YES. `handleContinue` at line 156 stores `{ ...formData, specialNotes: finalNotes }` to `sessionStorage.bookingFormData`. The payment page reads this and sends it to the API routes.
- Prefill from QuoteBuilder: YES. Line 104: `eventVertical: prefillData.eventVertical || prev.eventVertical || defaultVertical`

### Gap Status

With this plan's changes to both API routes, VERT-06 is now fully closed end-to-end:
- UI captures eventVertical in ShiftConfig ✓
- BookingForm passes it through to sessionStorage ✓
- Payment page reads from sessionStorage and sends in request body ✓
- Both API routes now accept eventVertical in BookingRequest ✓
- Both API routes now persist event_vertical to Supabase ✓
- bookings.event_vertical column exists in DB ✓

## Deviations from Plan

None - plan executed exactly as written. The pre-existing TypeScript error in `web/lib/territory/__tests__/auto-assignment-success-rate.test.ts` was verified to be pre-existing (exists before this plan's changes) and is unrelated to the booking API routes.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VERT-06 (client booking vertical) is now fully complete end-to-end
- VERT-05 (admin vertical selector) confirmed already complete
- Both booking creation paths (Net-30 and prepay) correctly persist event_vertical to the database
- Ready for 18-06 or remaining plans in Phase 18

---
*Phase: 18-vertical-infrastructure-riddor-fix*
*Completed: 2026-02-18*
