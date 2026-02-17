---
phase: 10-realtime-ops-polish
plan: 03
subsystem: payments
tags: [stripe, payment-retry, ux, typescript]

# Dependency graph
requires:
  - phase: 04.5-marketing-booking
    provides: CheckoutForm with Stripe Elements and PaymentIntent creation
provides:
  - Payment failure recovery UI with retry button, booking reference, and support mailto
  - paymentFailed state tracking in CheckoutForm
  - NEXT_PUBLIC_SUPPORT_EMAIL env var usage pattern for support links
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Payment retry pattern: same handleSubmit re-called, same PaymentIntent reused — no Elements remounting"
    - "Failure recovery UI pattern: error display + paymentFailed block with reference number, retry, and support mailto"

key-files:
  created: []
  modified:
    - web/components/booking/payment-form.tsx
    - web/app/(auth)/login/page.tsx
    - web/app/platform/revenue/page.tsx
    - web/components/contracts/contracts-table.tsx

key-decisions:
  - "Retry button uses type=submit inside existing <form> — no new handler needed, reuses handleSubmit directly"
  - "paymentFailed flag is separate from error string — allows showing recovery UI even when error is null after reset"
  - "NEXT_PUBLIC_SUPPORT_EMAIL env var with hardcoded fallback — avoids broken mailto if env var not set"

patterns-established:
  - "Payment retry pattern: reset error and paymentFailed at top of handleSubmit before each attempt"

# Metrics
duration: 42min
completed: 2026-02-17
---

# Phase 10 Plan 03: Payment Failure Recovery UI Summary

**Payment retry UI added to CheckoutForm: retry button re-attempts the same PaymentIntent, booking reference displayed, Contact Support mailto pre-fills booking ref in subject**

## Performance

- **Duration:** 42 min
- **Started:** 2026-02-17T17:33:05Z
- **Completed:** 2026-02-17T18:15:49Z
- **Tasks:** 1
- **Files modified:** 4 (1 primary + 3 pre-existing bug fixes)

## Accomplishments
- Payment failure now shows a recovery panel instead of a dead end
- Retry button uses `type="submit"` inside the existing `<form>`, calling the same `handleSubmit` with the same Stripe PaymentIntent — no remounting of `<Elements>`
- Booking reference number (bookingId) displayed prominently for support conversations
- Contact Support mailto link uses `NEXT_PUBLIC_SUPPORT_EMAIL` env var with `support@sitemedic.co.uk` fallback
- Build passes cleanly — all pre-existing TypeScript errors fixed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add payment retry button, reference number, and support mailto** - `61ba0c0` (feat)

Note: The payment-form.tsx changes were included in `fae313e feat(10-01)` by a parallel wave-1 agent. This plan's commit (`61ba0c0`) fixed the remaining pre-existing build errors needed for verification.

## Files Created/Modified
- `web/components/booking/payment-form.tsx` - Added `paymentFailed` state, recovery UI block with retry button and support mailto (committed in `fae313e`)
- `web/app/(auth)/login/page.tsx` - Wrapped `LoginContent` in `Suspense` boundary for `useSearchParams` CSR requirement
- `web/app/platform/revenue/page.tsx` - Added `OrgRevenue` type annotation to `reduce()` and `map()` callbacks
- `web/components/contracts/contracts-table.tsx` - Mapped `booking.total_price` to `booking.total` for `SendContractDialog` type compatibility

## Decisions Made
- Retry button is `type="submit"` inside the existing `<form>` — zero handler wiring, reuses `handleSubmit` naturally
- `paymentFailed` is tracked as a separate boolean from `error` string so the recovery panel can be hidden on retry reset even before the new attempt resolves
- Fallback email `support@sitemedic.co.uk` ensures mailto is functional even without `.env.local` setup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript build errors blocking verification**
- **Found during:** Task 1 verification (pnpm build)
- **Issue:** Multiple pre-existing TypeScript errors across admin pages, API routes, and UI components prevented `pnpm build` from passing. Key errors: (a) `useSearchParams` in login page missing Suspense boundary causing prerender failure, (b) `org.id` property references on `OrgContextValue` which only exposes `orgId` (7 admin pages + layout), (c) implicit `any` types in reduce/map callbacks, (d) `booking.total` vs `booking.total_price` field mismatch in contracts table
- **Fix:** Fixed remaining uncommitted instances: login page Suspense wrapper, revenue page type annotations, contracts-table booking field mapping. Note: most admin page `org -> orgId` fixes and API route fixes (user auth, validatePayout signature, etc.) were already committed in `fa7fde8` and `887989d` by prior sessions
- **Files modified:** `login/page.tsx`, `platform/revenue/page.tsx`, `contracts/contracts-table.tsx`
- **Verification:** `pnpm build` passes with `Compiled successfully` and all 83 pages generated
- **Committed in:** `61ba0c0`

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing build bugs)
**Impact on plan:** All fixes required for verification criteria. Primary task (payment-form.tsx) was already committed by parallel wave-1 agent. No scope creep.

## Issues Encountered
- `payment-form.tsx` changes were already committed by the 10-01 parallel agent (`fae313e`), which included the file as part of wave-1 execution. Verified all required changes were present before committing.
- Linter auto-reverted some edits during the build iteration cycle, requiring re-application via the Edit tool rather than sed.

## User Setup Required

**External services require manual configuration.**

Set in `.env.local`:
```
NEXT_PUBLIC_SUPPORT_EMAIL=support@sitemedic.co.uk
```

This populates the Contact Support mailto link on the payment failure screen. If not set, falls back to `support@sitemedic.co.uk`.

## Next Phase Readiness
- Payment failure recovery UI is complete and production-ready
- `NEXT_PUBLIC_SUPPORT_EMAIL` env var should be added to Vercel environment variables for production
- Phase 10 wave 1 complete (10-01, 10-03, 10-04 all done)

---
*Phase: 10-realtime-ops-polish*
*Completed: 2026-02-17*
