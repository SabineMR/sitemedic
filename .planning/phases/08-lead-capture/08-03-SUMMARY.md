---
phase: 08-lead-capture
plan: 08-03
subsystem: ui
tags: [react, tanstack-query, supabase, admin, crm, lead-management, next-js]

# Dependency graph
requires:
  - phase: 08-01
    provides: contact_submissions and quote_submissions tables with RLS policies and org_id routing
provides:
  - TanStack Query hooks for contact and quote submissions with 60s polling
  - Admin submissions page at /admin/submissions with Contact/Quotes tab switcher
  - Inline status update mutation (new/contacted/converted/closed) for both lead tables
  - Convert to Booking button on quotes table navigating to /admin/bookings/new with URL params
  - Leads nav item in admin sidebar
affects:
  - 08-04: downstream plan that may extend lead management or conversion tracking

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Plain HTML table (not @tanstack/react-table) with useMemo client-side filtering
    - useRequireOrg() for org-scoped TanStack Query hooks with 60s polling
    - onSettled invalidation of related query keys after mutations (both submission tables)
    - URLSearchParams conversion pattern for pre-filling /admin/bookings/new from quotes

key-files:
  created:
    - web/lib/queries/admin/submissions.ts
    - web/components/admin/contact-submissions-table.tsx
    - web/components/admin/quote-submissions-table.tsx
    - web/app/admin/submissions/page.tsx
  modified:
    - web/app/admin/layout.tsx

key-decisions:
  - "D-08-03-001: onSettled invalidates both contact-submissions and quote-submissions query keys regardless of which table was mutated (simplest correctness guarantee, minimal extra refetch cost)"
  - "D-08-03-002: Status badge shown above inline Select dropdown (badge = at-a-glance state, Select = action trigger; both needed in same cell)"
  - "D-08-03-003: Convert to Booking only visible when status != 'closed' (prevent converting dead leads)"

patterns-established:
  - "Submissions query pattern: useQuery + useRequireOrg + refetchInterval: 60_000 for lead polling"
  - "Inline status mutation: Select onChange -> useMutation -> onSettled invalidates all related keys"
  - "Quote-to-booking conversion: URLSearchParams built from quote fields, router.push to /admin/bookings/new"

# Metrics
duration: 12min
completed: 2026-02-17
---

# Phase 08 Plan 03: Admin Submissions Page Summary

**TanStack Query CRM layer for contact and quote leads — searchable tables with inline status management and one-click booking conversion at /admin/submissions**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-17T16:47:38Z
- **Completed:** 2026-02-17T16:59:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created 3 exported TanStack Query hooks (useContactSubmissions, useQuoteSubmissions, useUpdateSubmissionStatus) with 60-second polling and org-scoped filtering
- Built admin CRM page at /admin/submissions with Contact Enquiries and Quote Requests tabs, search, and status filter
- Added "Convert to Booking" button that builds URLSearchParams from quote fields and navigates to /admin/bookings/new with pre-fill data
- Added Leads nav item (Inbox icon) to admin sidebar after Customers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Query hooks for submissions** - `5c14f00` (feat)
2. **Task 2: Create contact and quote table components, page shell, and sidebar nav** - `e0aa054` (feat, prior session)

**Plan metadata:** docs(08-03) commit (see below)

## Files Created/Modified

- `web/lib/queries/admin/submissions.ts` - Three TanStack Query hooks: useContactSubmissions, useQuoteSubmissions, useUpdateSubmissionStatus. Both queries use useRequireOrg for org scoping and 60s polling. Mutation updates status + updated_at (+ follow_up_notes if provided) with .eq('org_id') defense in depth.
- `web/components/admin/contact-submissions-table.tsx` - Filterable contact submissions table. Client-side useMemo search on first_name/last_name/email/company. Status filter dropdown. Plain HTML table with dark theme. Inline status Select dropdown calls useUpdateSubmissionStatus. Date formatted as en-GB.
- `web/components/admin/quote-submissions-table.tsx` - Filterable quote submissions table. Same search/filter pattern. "Convert to Booking" button builds URLSearchParams (clientEmail, siteAddress, shiftDate, confinedSpace, traumaSpecialist, specialNotes) and navigates to /admin/bookings/new.
- `web/app/admin/submissions/page.tsx` - Page shell with Inbox icon, Leads title, Contact/Quotes tab switcher (useState), renders ContactSubmissionsTable or QuoteSubmissionsTable conditionally.
- `web/app/admin/layout.tsx` - Added Inbox to lucide-react imports and Leads nav item (href: /admin/submissions) after Customers in navItems array.

## Decisions Made

- **D-08-03-001:** onSettled invalidates both contact-submissions and quote-submissions query keys regardless of which table was mutated — simplest correctness guarantee, minimal extra refetch cost at 60s polling interval
- **D-08-03-002:** Status badge shown above inline Select dropdown in Status column — badge provides at-a-glance state, Select provides the mutation trigger; both needed in the same cell for UX clarity
- **D-08-03-003:** Convert to Booking button hidden when status is 'closed' — prevents converting dead leads to bookings

## Deviations from Plan

None — plan executed exactly as written. UI files (Task 2) were already committed in a prior developer session (`e0aa054`); submissions.ts (Task 1) was new and committed as `5c14f00`.

## Issues Encountered

- Pre-existing TypeScript build error in `web/app/admin/beacons/page.tsx` (OrgContextValue type mismatch) caused `pnpm build` to fail. This error predates plan 08-03 (confirmed by running build on pre-08-03 commit). Our new files compile without errors (verified via `tsc --noEmit --skipLibCheck` filtered to our file paths).

## User Setup Required

None — no external service configuration required. Admin can navigate to /admin/submissions immediately after deployment.

## Next Phase Readiness

- Lead capture CRM is fully functional: contact and quote submissions visible, searchable, and manageable
- Quote-to-booking conversion pipeline is operational via URL params pre-fill
- Ready for 08-04 (any remaining lead capture work, wave 3)
- The beacons page TypeScript error (pre-existing) should be resolved separately to restore clean builds

---
*Phase: 08-lead-capture*
*Completed: 2026-02-17*
