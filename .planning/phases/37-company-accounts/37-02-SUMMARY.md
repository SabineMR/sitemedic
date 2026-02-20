---
phase: 37-company-accounts
plan: 02
subsystem: ui
tags: [react, zustand, tailwind, radix-ui, tanstack-react-query, sonner, lucide-react, supabase-client]

# Dependency graph
requires:
  - phase: 37-company-accounts
    provides: roster API routes (CRUD, invite, accept), roster-types.ts, roster-schemas.ts, React Query hooks
  - phase: 32-foundation
    provides: marketplace_companies table, Dialog/Badge/Button/Input/Tabs UI components
  - phase: 34-quoting
    provides: STAFFING_ROLE_LABELS, existing marketplace dashboard page pattern
provides:
  - Zustand store for roster UI state (filters, modals, selection)
  - Roster management page at /dashboard/marketplace/roster
  - Add medic modal with live search of existing SiteMedic medics
  - Invite medic modal with email input and optional qualifications
  - Roster list with loading/empty states and responsive grid
  - Medic cards with status badges, qualifications, availability, and actions
  - Invitation acceptance page at /dashboard/marketplace/roster/accept
affects: [37-03 (assignment and profile), 34.1 (direct jobs roster integration)]

# Tech tracking
tech-stack:
  added: []
  patterns: [Zustand for UI-only state with React Query for data, AlertDialog for destructive action confirmation, Suspense boundary for useSearchParams]

key-files:
  created:
    - web/stores/useCompanyRosterStore.ts
    - web/app/(dashboard)/dashboard/marketplace/roster/page.tsx
    - web/components/marketplace/roster/RosterList.tsx
    - web/components/marketplace/roster/RosterMedicCard.tsx
    - web/components/marketplace/roster/AddMedicModal.tsx
    - web/components/marketplace/roster/InviteMedicModal.tsx
    - web/app/(dashboard)/dashboard/marketplace/roster/accept/page.tsx
  modified:
    - web/app/api/marketplace/roster/route.ts
    - FEATURES.md

key-decisions:
  - "Zustand store manages UI state only (filters, modals); data stays in React Query hooks"
  - "GET roster API updated to support status=all (default) instead of defaulting to active"
  - "AddMedicModal uses client-side Supabase ILIKE search against medics table (not API route)"
  - "RosterMedicCard uses AlertDialog for remove confirmation (not window.confirm)"
  - "Accept page wraps useSearchParams in Suspense boundary (Next.js requirement)"
  - "Resend invitation reuses invite API (handles 409 duplicate gracefully)"

patterns-established:
  - "Zustand for UI state + React Query for server state: clear separation in roster management"
  - "Client-side Supabase search for medic picker (same pattern as MedicPicker in comms)"
  - "AlertDialog for destructive actions with descriptive confirmation text"

# Metrics
duration: 11min
completed: 2026-02-20
---

# Phase 37 Plan 02: Roster Management UI Summary

**Company roster management page with search-and-add modal, email invitation modal, filterable roster grid with status badges, and JWT invitation acceptance page**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-20T18:33:05Z
- **Completed:** 2026-02-20T18:44:30Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Full roster management page at /dashboard/marketplace/roster with company detection, status filter tabs, and name search
- AddMedicModal with live Supabase search (ILIKE on first_name/last_name) and direct roster add
- InviteMedicModal with email input, optional title/qualifications, and 7-day expiry note
- RosterMedicCard with colour-coded status badges, qualification tags, temporary unavailability indicators, and remove confirmation dialog
- Invitation acceptance page that processes JWT tokens and shows success/error states

## Task Commits

Each task was committed atomically:

1. **Task 1: Zustand store, roster page, list, and medic card** - `273b34f`, `619ff65`, `3675a46`, `15e8d1e` (feat) - auto-committed by external process
2. **Task 2: Add medic modal, invite modal, acceptance page** - `ee5b041` (feat)

Note: Task 1 files were auto-committed individually by an external process. Task 2 was committed properly as a single atomic commit.

## Files Created/Modified
- `web/stores/useCompanyRosterStore.ts` - Zustand store: statusFilter, searchTerm, modal open/close, selectedMedicId
- `web/app/(dashboard)/dashboard/marketplace/roster/page.tsx` - Roster management page: company detection, filter tabs, search, roster grid
- `web/components/marketplace/roster/RosterList.tsx` - Grid list with 3 skeleton loading cards and empty state with CTAs
- `web/components/marketplace/roster/RosterMedicCard.tsx` - Medic card: status badges (green/amber/gray/red), qualifications, availability, edit/remove/resend actions
- `web/components/marketplace/roster/AddMedicModal.tsx` - Search existing medics by name, select, optionally set title/qualifications, POST to roster API
- `web/components/marketplace/roster/InviteMedicModal.tsx` - Email invitation with 7-day expiry note, optional title/qualifications
- `web/app/(dashboard)/dashboard/marketplace/roster/accept/page.tsx` - JWT token acceptance page with loading/success/error states
- `web/app/api/marketplace/roster/route.ts` - Fixed GET to support status=all (default) instead of always filtering to active
- `FEATURES.md` - Added Plan 02 documentation to Phase 37 section

## Decisions Made
- **Zustand for UI state only**: Data fetching remains in React Query hooks (useCompanyRoster). Store manages filters, modals, and selection. This follows the same separation pattern as useQuoteFormStore.
- **GET API updated for 'all' filter**: The roster GET endpoint defaulted to `status=active` which would break the "All" tab. Changed default to 'all' and conditionally applies `.eq('status', ...)` only when a specific status is requested. This is a Rule 1 bug fix.
- **Client-side Supabase search**: AddMedicModal queries the medics table directly via Supabase client (ILIKE search), not through an API route. This matches the MedicPicker pattern from Phase 42-02.
- **AlertDialog for remove confirmation**: Uses Radix AlertDialog instead of window.confirm for a consistent, styled confirmation experience with descriptive text about what happens when a medic is removed.
- **Suspense for useSearchParams**: The accept page wraps the component using useSearchParams in a Suspense boundary, as required by Next.js 14+ to avoid build errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed GET roster API status filter default**
- **Found during:** Task 1 (roster page implementation)
- **Issue:** GET /api/marketplace/roster defaulted to `status=active`, making the "All" tab impossible. Passing `status=all` would literally filter for `status='all'` which doesn't exist.
- **Fix:** Changed default to 'all' and conditionally applies the status filter. When status is 'all', no `.eq('status', ...)` is applied.
- **Files modified:** web/app/api/marketplace/roster/route.ts
- **Verification:** 'all' status returns all medics, specific statuses still filter correctly
- **Committed in:** 273b34f (auto-committed)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for correct operation of the status filter tabs. No scope creep.

## Issues Encountered
- An external auto-commit process captured Task 1 file writes as individual commits with auto-generated messages. The code content is correct but commit messages don't follow the project convention. Task 2 was committed properly as an atomic commit.

## User Setup Required
None - no external service configuration required. All components use existing Supabase client and API routes from Plan 01.

## Next Phase Readiness
- Roster management UI complete, ready for Plan 03 (Assignment & Profile)
- All modals connect to existing API routes from Plan 01
- React Query cache invalidation ensures roster list stays fresh after add/invite/remove
- No blockers for Plan 03

---
*Phase: 37-company-accounts*
*Completed: 2026-02-20*
