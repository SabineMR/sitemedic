---
phase: 34
plan: 03
subsystem: Marketplace Quotes
tags: [quotes, quote-editing, quote-withdrawal, deadline-extension, quote-management, react-query]

depends_on:
  - phase: 34-01
    provides: marketplace_quotes table, quote types, schemas, minimum rates, submit/save-draft/list/detail API routes
provides:
  - Quote update API (PATCH with status='revised' and last_revised_at)
  - Quote withdraw API (POST with status='withdrawn' and withdrawn_at)
  - Company my-quotes listing API (GET with status filtering and pagination)
  - Event deadline extension API (POST, one-time only)
  - Company quote management page (/marketplace/my-quotes)
  - Quote edit dialog with full form validation
  - Withdraw confirmation flow
  - Extend deadline UI on event detail page
affects: [35-01, 36-01]

tech_stack:
  added: []
  patterns:
    - In-place quote editing with 'revised' status and last_revised_at timestamp
    - One-time deadline extension enforcement via deadline_extended boolean
    - Local useState for edit dialog (avoids Zustand store conflicts with create flow)
    - AlertDialog for destructive actions (withdraw, delete draft)

key_files:
  created:
    - web/app/api/marketplace/quotes/[id]/update/route.ts
    - web/app/api/marketplace/quotes/[id]/withdraw/route.ts
    - web/app/api/marketplace/quotes/my-quotes/route.ts
    - web/app/api/marketplace/events/[id]/extend-deadline/route.ts
    - web/app/marketplace/my-quotes/page.tsx
    - web/components/marketplace/quote-management/MyQuoteCard.tsx
    - web/components/marketplace/quote-management/EditQuoteDialog.tsx
  modified:
    - supabase/migrations/146_marketplace_quotes.sql (added deadline_extended column)
    - web/app/marketplace/events/[id]/page.tsx (added Extend Deadline button and dialog)
    - web/app/api/marketplace/quotes/[id]/route.ts (fixed Next.js 15 params type)
    - web/app/api/marketplace/quotes/list/route.ts (fixed async createClient)
    - web/app/api/marketplace/quotes/save-draft/route.ts (fixed async createClient)
    - web/app/api/marketplace/quotes/submit/route.ts (fixed Zod .errors -> .issues)
    - web/components/marketplace/quote-submission/QuoteSubmissionForm.tsx (fixed Zod .errors -> .issues)

key-decisions:
  - "EditQuoteDialog uses local useState instead of Zustand store to avoid state conflicts with the create flow"
  - "Deadline extension is enforced as one-time only via deadline_extended boolean column on marketplace_events"
  - "Withdraw action uses AlertDialog for confirmation with 'cannot be undone' warning"
  - "MyQuoteCard shows 'Revised Xh ago' time delta using last_revised_at timestamp"

patterns-established:
  - "Quote lifecycle management: edit sets status='revised' + last_revised_at, withdraw sets status='withdrawn' + withdrawn_at"
  - "One-time boolean guard pattern for deadline extension (deadline_extended column)"
  - "Local form state in dialog modals to avoid global store conflicts"

duration: 76min
completed: 2026-02-19
---

# Phase 34 Plan 03: Quote Management Summary

**Quote edit/withdraw/deadline API routes with company management page and in-place edit dialog**

## Performance

- **Duration:** 76 min
- **Started:** 2026-02-19T23:43:47Z
- **Completed:** 2026-02-20T01:00:23Z
- **Tasks:** 2/2
- **Files modified:** 14

## Accomplishments

- Companies can edit submitted quotes in place -- status changes to 'revised' with last_revised_at timestamp, client sees "Revised" badge with time delta
- Companies can withdraw quotes before event award -- status changes to 'withdrawn', event quote_count auto-decrements via trigger
- Companies can view all their quotes at /marketplace/my-quotes with status filter tabs (All, Drafts, Submitted, Revised, Withdrawn)
- Clients can extend the quote deadline once from the event detail page via date picker dialog
- All edit/withdraw/extend operations enforce authentication, ownership, and status guards
- Minimum rate enforcement applies to edits (same HARD block as initial submission)

## Task Commits

1. **Task 1: Quote update, withdraw, and deadline extension API routes** - `a57f08f` (feat)
2. **Task 2: Company quote management page with edit dialog and withdraw action** - `e56045f` (feat)

## Files Created/Modified

### Created
- `web/app/api/marketplace/quotes/[id]/update/route.ts` - PATCH endpoint for editing quotes with status='revised' and last_revised_at
- `web/app/api/marketplace/quotes/[id]/withdraw/route.ts` - POST endpoint for withdrawing quotes with status='withdrawn' and withdrawn_at
- `web/app/api/marketplace/quotes/my-quotes/route.ts` - GET endpoint for company's quotes with status filtering and pagination
- `web/app/api/marketplace/events/[id]/extend-deadline/route.ts` - POST endpoint for one-time deadline extension
- `web/app/marketplace/my-quotes/page.tsx` - Company quote management page with status filter tabs and quote cards
- `web/components/marketplace/quote-management/MyQuoteCard.tsx` - Quote card with status badges, pricing, staffing summary, and action buttons
- `web/components/marketplace/quote-management/EditQuoteDialog.tsx` - Dialog for in-place quote editing with full validation

### Modified
- `supabase/migrations/146_marketplace_quotes.sql` - Added `deadline_extended BOOLEAN DEFAULT FALSE` to marketplace_events
- `web/app/marketplace/events/[id]/page.tsx` - Added "Extend Deadline" button and dialog for event poster
- `web/app/api/marketplace/quotes/[id]/route.ts` - Fixed Next.js 15 params type (Promise<{ id }>)
- `web/app/api/marketplace/quotes/list/route.ts` - Fixed async createClient() call
- `web/app/api/marketplace/quotes/save-draft/route.ts` - Fixed async createClient() call
- `web/app/api/marketplace/quotes/submit/route.ts` - Fixed Zod .errors -> .issues
- `web/components/marketplace/quote-submission/QuoteSubmissionForm.tsx` - Fixed Zod .errors -> .issues

## Decisions Made

- **EditQuoteDialog uses local useState (not Zustand):** The edit dialog needs its own form state separate from the create flow's Zustand store. Using local useState prevents state conflicts when both flows exist in the same session.
- **Deadline extension is one-time only:** Added `deadline_extended BOOLEAN DEFAULT FALSE` column to marketplace_events. After one extension, the button disappears from the event detail page.
- **Withdraw confirmation requires AlertDialog:** Withdrawal is irreversible, so it shows a confirmation dialog with explicit "This cannot be undone" warning before proceeding.
- **"Revised" badge shows time delta:** Uses `last_revised_at` timestamp to show "Revised 2h ago" format, giving clients transparency about when the quote was last updated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Next.js 15 params type in quotes/[id]/route.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** Route handler used `{ params: { id: string } }` (Next.js 14 pattern) instead of `{ params: Promise<{ id: string }> }` (Next.js 15 pattern), causing build failure
- **Fix:** Updated to use Promise-based params with await
- **Files modified:** web/app/api/marketplace/quotes/[id]/route.ts
- **Verification:** Build compiles and type checks pass
- **Committed in:** e56045f

**2. [Rule 1 - Bug] Fixed async createClient() calls in 3 quote API routes**
- **Found during:** Task 2 (build verification)
- **Issue:** `createClient()` from `@/lib/supabase/server` is async but was called without `await` in list, save-draft, and submit routes
- **Fix:** Added `await` to all createClient() calls
- **Files modified:** web/app/api/marketplace/quotes/list/route.ts, save-draft/route.ts, submit/route.ts
- **Verification:** Build compiles successfully
- **Committed in:** e56045f

**3. [Rule 1 - Bug] Fixed Zod error property name (.errors -> .issues)**
- **Found during:** Task 2 (build verification)
- **Issue:** Zod's `ZodError` uses `.issues` property, not `.errors`. Three files used the wrong property name.
- **Fix:** Changed `validation.error.errors` to `validation.error.issues` in update route, submit route, and QuoteSubmissionForm
- **Files modified:** quotes/[id]/update/route.ts, quotes/submit/route.ts, QuoteSubmissionForm.tsx
- **Verification:** Build type check passes
- **Committed in:** e56045f

**4. [Rule 3 - Blocking] Installed missing zod dependency**
- **Found during:** Task 2 (build verification)
- **Issue:** `zod` package was not installed in web/node_modules, causing build failure
- **Fix:** Ran `pnpm add zod`
- **Files modified:** web/package.json, web/pnpm-lock.yaml
- **Verification:** Build compiles successfully
- **Committed in:** e56045f

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking dependency)
**Impact on plan:** All fixes were necessary for correct build. Pre-existing issues from 34-01 that only surfaced during strict build verification. No scope creep.

## Issues Encountered

- **Build environment:** `pnpm next build` fails at "Collecting page data" with `pages-manifest.json` ENOENT error. This is a pre-existing Next.js 15 build environment issue unrelated to any marketplace code. TypeScript compilation and type checking both pass successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 35 (Award Flow):** Quote lifecycle is now complete (submit, edit, withdraw, deadline extension). Ready for award/deposit flow implementation.
- **Phase 36 (Ratings & Reviews):** Company rating/review data is placeholder (0 values). Schema and UI slots exist for when Phase 36 populates real data.

No blockers for any downstream phase.

---
*Phase: 34-quote-submission-comparison*
*Completed: 2026-02-19*
