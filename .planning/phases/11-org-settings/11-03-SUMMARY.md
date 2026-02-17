---
phase: 11-org-settings
plan: 03
subsystem: api
tags: [org_settings, supabase, next.js, booking, geofence, email, pricing]

# Dependency graph
requires:
  - phase: 11-01
    provides: org_settings table with base_rate, urgency_premiums, geofence_default_radius, admin_email columns

provides:
  - booking-form.tsx reads base_rate from org_settings at runtime
  - bookings/create and create-payment-intent validate urgency_premiums from org_settings
  - geofences/page.tsx reads geofence_default_radius from org_settings
  - contact/submit and quotes/submit read admin_email from org_settings
  - All consumers have fallback defaults when org_settings is unavailable

affects: [11-04, payments, email-notifications, booking-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "org_settings read pattern: fetch from org_settings table with fallback ?? default"
    - "Client-side settings fetch: useEffect + createClient() + .single() in browser components"
    - "Server-side settings fetch: supabase.from('org_settings').select().eq('org_id', orgId).single() in API routes"

key-files:
  created: []
  modified:
    - web/components/booking/booking-form.tsx
    - web/lib/booking/pricing.ts
    - web/app/api/bookings/create/route.ts
    - web/app/api/bookings/create-payment-intent/route.ts
    - web/app/admin/geofences/page.tsx
    - web/app/api/contact/submit/route.ts
    - web/app/api/quotes/submit/route.ts

key-decisions:
  - "Fallback defaults maintained in all consumers so org_settings being unavailable never breaks functionality"
  - "JSONB urgency_premiums deserialized automatically by Supabase client — no JSON.parse needed"
  - "geofences/page.tsx sets form initial radius to 200 and updates it asynchronously after org_settings load"
  - "admin_email from org_settings overrides env var fallback (org_settings wins over environment config)"

patterns-established:
  - "Pattern: async settings load on mount with useState fallback — load org_settings in useEffect, update state on success"
  - "Pattern: server routes fetch org_settings before validation steps that depend on configurable values"

# Metrics
duration: 26min
completed: 2026-02-17
---

# Phase 11 Plan 03: Consumer Wiring Summary

**All 7 consumer files wired to read base_rate, urgency_premiums, geofence_default_radius, and admin_email from org_settings with safe fallback defaults**

## Performance

- **Duration:** 26 min
- **Started:** 2026-02-17T17:35:45Z
- **Completed:** 2026-02-17T18:02:15Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `booking-form.tsx` fetches `base_rate` from org_settings on mount; no more hardcoded 42
- Both booking API routes (`create`, `create-payment-intent`) load `urgency_premiums` from org_settings before validating the booking request
- `geofences/page.tsx` bug fixed (useOrg exports `orgId` not `org`); default radius fetched from org_settings
- `contact/submit` and `quotes/submit` read `admin_email` from org_settings, overriding env var fallback
- `pricing.ts` comment updated to guide callers to pass org_settings.base_rate

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire booking form and pricing to read base_rate from org_settings** - `07dcc91` (feat)
2. **Task 2: Wire API routes, geofences, and email routes to read from org_settings** - `ebdbd62` (feat)

**Plan metadata:** see docs commit below

## Files Created/Modified

- `web/components/booking/booking-form.tsx` - Added useEffect to fetch base_rate from org_settings; state-managed baseRate with 42 fallback; added baseRate to pricing recalculation deps
- `web/lib/booking/pricing.ts` - Updated baseRate param JSDoc comment to note callers should pass org_settings.base_rate
- `web/app/api/bookings/create/route.ts` - Replaced hardcoded `validUrgencyPremiums = [0,20,50,75]` with org_settings fetch + fallback
- `web/app/api/bookings/create-payment-intent/route.ts` - Same urgency_premiums pattern as create/route.ts
- `web/app/admin/geofences/page.tsx` - Fixed `const { org }` bug → `const { orgId }`; replaced all org?.id/org.id; added defaultRadius state fetched from org_settings
- `web/app/api/contact/submit/route.ts` - Added org_settings lookup for admin_email after DB insert
- `web/app/api/quotes/submit/route.ts` - Same admin_email pattern as contact/submit

## Decisions Made

- Fallback defaults (`?? 42`, `?? [0, 20, 50, 75]`, `?? 200`) kept in all consumers — org_settings unavailability must never break functionality
- `getUrgencyPremium()` in pricing.ts kept hardcoded as specified (out of Phase 11 scope)
- `admin_email` from org_settings takes precedence over `process.env.ADMIN_EMAIL` (org config wins)
- `geofence_default_radius` loads asynchronously and updates both the state and the form field initial value

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing `const { org } = useOrg()` bug in geofences/page.tsx**

- **Found during:** Task 2 (geofences page update)
- **Issue:** The `useOrg()` hook exports `orgId` (not `org`). The file used `org?.id` and `org.id` causing TypeScript errors and runtime failures
- **Fix:** Changed destructuring to `const { orgId } = useOrg()` and replaced all `org?.id`/`org.id` with `orgId`
- **Files modified:** web/app/admin/geofences/page.tsx
- **Verification:** TypeScript build passed for this file; all org references replaced
- **Committed in:** ebdbd62 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed pre-existing `actor_id: user.id` reference where `user` was undefined in confirm/route.ts**

- **Found during:** Build verification
- **Issue:** `web/app/api/bookings/confirm/route.ts` referenced `user.id` but `user` was never declared in scope — TypeScript compile error
- **Fix:** Changed to `actor_id: null` with comment "System-triggered action; no user in scope"
- **Files modified:** web/app/api/bookings/confirm/route.ts
- **Verification:** TypeScript error eliminated for this file
- **Committed in:** ebdbd62 (included in Task 2 commit via linter auto-staging)

---

**Total deviations:** 2 auto-fixed bugs (both pre-existing issues found during build verification)
**Impact on plan:** Fixes were necessary for TypeScript compilation. No scope creep.

## Issues Encountered

- Pre-existing build failure in `web/app/api/payouts/process-batch/route.ts` (`mileage_miles` field missing from Supabase select query) — this is **not caused by 11-03 changes** and predates this plan. The field was added to the `validatePayout` call signature in a prior plan but not added to the select query. This should be fixed in a separate task.
- Build check encountered this pre-existing error; the 11-03 changes themselves compile cleanly.

## User Setup Required

None - no external service configuration required. All changes use the existing Supabase org_settings table created in plan 11-01.

## Next Phase Readiness

- All consumer files now read from org_settings — org settings are fully wired
- Phase 11 (Org Settings) is now complete (plans 11-01 through 11-03)
- Pre-existing build error in `payouts/process-batch/route.ts` should be addressed before next production deployment

---
*Phase: 11-org-settings*
*Completed: 2026-02-17*
