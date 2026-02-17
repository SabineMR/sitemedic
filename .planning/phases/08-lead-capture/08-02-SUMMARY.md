---
phase: 08-lead-capture
plan: "02"
subsystem: api
tags: [supabase, service-role, postgres, next-js, resend, lead-capture]

# Dependency graph
requires:
  - phase: 08-lead-capture plan 01
    provides: contact_submissions and quote_submissions tables with RLS policies
provides:
  - contact/submit route persists to contact_submissions before sending email
  - quotes/submit route persists to quote_submissions before sending email
  - Both routes use service-role Supabase client (bypasses RLS for public INSERT)
  - Both routes use fire-and-forget email pattern (DB failure = 500, email failure = logged only)
affects: [08-03-lead-inbox, any admin UI reading contact_submissions or quote_submissions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB-first API: blocking DB insert before any side effects (email, analytics)"
    - "Fire-and-forget email: .send().catch(err => console.error(...)) with no await"
    - "Service-role Supabase client: createClient(url, key, {auth:{autoRefreshToken:false,persistSession:false}})"
    - "Dead field exclusion: location and duration not persisted (always empty/default from form)"

key-files:
  created: []
  modified:
    - web/app/api/contact/submit/route.ts
    - web/app/api/quotes/submit/route.ts

key-decisions:
  - "DB insert is blocking: if it fails return 500, never proceed to email"
  - "Email is fire-and-forget: .catch() only, no await, failure is non-fatal"
  - "Service-role client created inline per request (no module-level singleton) to avoid Edge runtime issues"
  - "special_requirements passed as JS array directly to Supabase (TEXT[] column, not JSON.stringify)"
  - "Dead fields location and duration excluded from DB insert (location always '', duration always '1-day')"

patterns-established:
  - "DB-first pattern: all public lead-capture routes insert to DB before any email/notification"
  - "Service-role client helper: getServiceRoleClient() function co-located in route file"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 08 Plan 02: API Route Updates — DB-First Persistence Summary

**Both public API routes (contact + quote) now insert to Supabase via service-role client before fire-and-forget email, ensuring zero lead data loss on email failure**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-17T16:47:21Z
- **Completed:** 2026-02-17T16:48:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Contact route (`/api/contact/submit`) now persists every enquiry to `contact_submissions` before emailing admin
- Quote route (`/api/quotes/submit`) now persists every quote request to `quote_submissions` before emailing admin
- Both routes use service-role Supabase client (bypasses RLS — public routes have no session)
- Email send converted from blocking `await` with error check to fire-and-forget `.catch()` pattern in both routes
- Dead fields (`location`, `duration`) excluded from quote DB insert; `coordinates` field added to interface

## Task Commits

Each task was committed atomically:

1. **Task 1: Contact route DB-first** - `80afa8a` (feat)
2. **Task 2: Quote route DB-first** - `ec7492b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/app/api/contact/submit/route.ts` - Added `getServiceRoleClient()`, blocking DB insert before email, fire-and-forget email pattern
- `web/app/api/quotes/submit/route.ts` - Same pattern; added `coordinates?: string` to interface; excluded `location`/`duration` dead fields; `special_requirements` as JS array

## Decisions Made

- **Service-role client per request:** Created inline via `getServiceRoleClient()` helper rather than a module-level singleton, avoiding potential Edge runtime cold-start issues.
- **Dead field exclusion:** `location` (always `''`) and `duration` (always `'1-day'`) are not persisted to DB — consistent with plan constraints.
- **`special_requirements` as array:** Passed directly as JS `string[]` to Supabase; the column is `TEXT[]` so no `JSON.stringify` needed.
- **`coordinates` added to interface:** Was missing from the original `QuoteSubmitRequest` interface; added as `coordinates?: string` to match the DB column.

## Deviations from Plan

None - plan executed exactly as written. The `coordinates` field fix was explicitly called out in the plan constraints (TASK 2, item 2).

## Issues Encountered

None.

## User Setup Required

Ensure these environment variables are set on the server (not just the client):

- `NEXT_PUBLIC_SUPABASE_URL` — already required for client-side Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, must NOT be prefixed with `NEXT_PUBLIC_`
- `ASG_ORG_ID` — the UUID of the organization leads are assigned to

These should already be in `.env.local` / production secrets from Phase 08-01 setup.

## Next Phase Readiness

- Lead persistence is complete for both public routes
- 08-03 (Admin leads inbox) can now read from `contact_submissions` and `quote_submissions` using org-scoped SELECT policies (established in 08-01)
- No blockers

---
*Phase: 08-lead-capture*
*Completed: 2026-02-17*
