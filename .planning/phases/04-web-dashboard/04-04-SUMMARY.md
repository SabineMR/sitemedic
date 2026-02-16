---
phase: 04-web-dashboard
plan: 04
subsystem: dashboard-views
tags: [nextjs, supabase, tanstack-table, tanstack-query, near-misses, workers, typescript]

# Dependency graph
requires:
  - phase: 04-web-dashboard
    plan: 01
    provides: Dashboard foundation with auth, layout, and TanStack Query
provides:
  - Near-miss log page with category, severity, date filters
  - Worker registry page with company, role, certification status search
  - Reusable DataTable component with TanStack Table
  - DateRangeFilter component for date filtering
  - 60-second polling for both pages
affects: [04-05-exports, 04-06-settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable DataTable component pattern with generic types"
    - "DateRangeFilter component for date range filtering"
    - "Client-side filtering pattern with useMemo"
    - "Server-side initial data fetch with client-side polling"

key-files:
  created:
    - web/lib/queries/near-misses.ts - Near-miss queries and hooks
    - web/lib/queries/workers.ts - Worker queries and hooks
    - web/components/dashboard/data-table.tsx - Reusable data table with TanStack Table
    - web/components/dashboard/date-range-filter.tsx - Date range filter component
    - web/components/dashboard/near-misses-columns.tsx - Near-miss column definitions
    - web/components/dashboard/near-misses-table.tsx - Near-miss table with filters
    - web/components/dashboard/workers-columns.tsx - Worker column definitions
    - web/components/dashboard/workers-table.tsx - Worker table with filters
    - web/app/(dashboard)/near-misses/page.tsx - Near-miss log page
    - web/app/(dashboard)/workers/page.tsx - Worker registry page
  modified:
    - web/types/database.types.ts - Added NearMissWithReporter and Profile types

key-decisions:
  - "D-04-04-001: Created DataTable component in Plan 04-04 instead of Plan 04-03 (Plan 04-03 not executed, DataTable required for tasks)"
  - "D-04-04-002: Cert status column shows green 'Active' placeholder (Phase 7 will add actual certification tracking)"
  - "D-04-04-003: Category and severity filters use shadcn/ui Select components for consistent UI"
  - "D-04-04-004: Worker search filters company and role via text inputs (faster than dropdowns for large datasets)"
  - "D-04-04-005: DateRangeFilter uses native HTML date inputs (simpler, no library dependency)"

patterns-established:
  - "Pattern: Reusable DataTable component with generic types for multiple data views"
  - "Pattern: Client-side filtering with useMemo for derived state"
  - "Pattern: Server component fetches initial data, client component polls with TanStack Query"
  - "Pattern: Category formatting helper (kebab-case → Title Case) for display"

# Metrics
duration: 8min
completed: 2026-02-16
---

# Phase 04 Plan 04: Near-Miss and Worker Registry Summary

**Near-miss log with category/severity/date filtering and worker registry with certification status indicators**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-16T04:07:25Z
- **Completed:** 2026-02-16T04:15:26Z
- **Tasks:** 2
- **Files created:** 10
- **Files modified:** 1

## Accomplishments

- Created reusable DataTable component with TanStack Table (sorting, filtering, pagination)
- Built near-miss log page with category, severity, and date range filters
- Built worker registry page with company, role, and certification status filters
- Both pages poll every 60 seconds for real-time updates
- Worker certification status shows placeholder green "Active" badge (ready for Phase 7)
- Global search works across name, company, and role fields in worker table
- Near-miss severity displayed with color-coded badges (green/amber/red/dark-red)

## Task Commits

1. **Task 1: Build near-miss log page with queries, columns, and table** - `b58dc5b` (feat)
   - Created reusable DataTable component with TanStack Table
   - Created DateRangeFilter component for date filtering
   - Created near-miss queries with 60-second polling
   - Built near-misses-columns with date, category, severity, description, reporter, location
   - Built near-misses-table with category, severity, and date range filters
   - Created near-misses page with server-side initial data fetch
   - Added NearMissWithReporter type to database.types.ts

2. **Task 2: Build worker registry page with queries, columns, and table** - `d5b3910` (feat)
   - Created worker queries with 60-second polling
   - Built workers-columns with name, company, role, phone, emergency contact, consent, cert status, added date
   - Built workers-table with company, role, cert status filters
   - Created workers page with server-side initial data fetch
   - Cert status column shows green "Active" badge (placeholder for Phase 7)
   - Fixed import statements in near-misses.ts to use correct createClient export

## Files Created/Modified

**Created:**
- `web/lib/queries/near-misses.ts` - fetchNearMisses server function + useNearMisses hook with 60s polling
- `web/lib/queries/workers.ts` - fetchWorkers server function + useWorkers hook with 60s polling
- `web/components/dashboard/data-table.tsx` - Generic DataTable component with TanStack Table (sorting, filtering, pagination)
- `web/components/dashboard/date-range-filter.tsx` - Date range filter with native HTML date inputs
- `web/components/dashboard/near-misses-columns.tsx` - Near-miss columns (date, category, severity, description, reporter, location)
- `web/components/dashboard/near-misses-table.tsx` - Near-miss table with category, severity, date range filters
- `web/components/dashboard/workers-columns.tsx` - Worker columns (name, company, role, phone, emergency contact, consent, cert status, added)
- `web/components/dashboard/workers-table.tsx` - Worker table with company, role, cert status filters
- `web/app/(dashboard)/near-misses/page.tsx` - Near-miss log page with server-side data fetch
- `web/app/(dashboard)/workers/page.tsx` - Worker registry page with server-side data fetch

**Modified:**
- `web/types/database.types.ts` - Added NearMissWithReporter and Profile types for reporter joins

## Decisions Made

**D-04-04-001: Created DataTable component in Plan 04-04 instead of Plan 04-03**
- Rationale: Plan 04-03 not executed, but DataTable required for current tasks (deviation Rule 2 - missing critical)
- Impact: DataTable component now available for future pages (treatments, safety checks)

**D-04-04-002: Cert status column shows green "Active" placeholder**
- Rationale: Certification tracking is Phase 7, but column needed for UI completeness
- Impact: Column ready for Phase 7 integration with TODO comment

**D-04-04-003: Category and severity filters use shadcn/ui Select components**
- Rationale: Consistent UI with dashboard theme, better UX than dropdowns
- Impact: Filter controls match dashboard design system

**D-04-04-004: Worker search filters company and role via text inputs**
- Rationale: Faster than dropdowns for large datasets (100+ workers possible)
- Impact: Users can type partial matches, more flexible than select dropdowns

**D-04-04-005: DateRangeFilter uses native HTML date inputs**
- Rationale: Simpler than date picker library, no additional dependency
- Impact: Works well, mobile-friendly, no JS library overhead

## Deviations from Plan

### Auto-added Issues

**1. [Rule 2 - Missing Critical] Created DataTable component**
- **Found during:** Task 1 planning
- **Issue:** Plan references "Reuses DataTable component from Plan 04-03", but Plan 04-03 hasn't been executed
- **Fix:** Created DataTable component as part of Task 1 (required for both near-miss and worker tables)
- **Files created:** web/components/dashboard/data-table.tsx, web/components/dashboard/date-range-filter.tsx
- **Verification:** Build passes, both tables use DataTable component
- **Committed in:** b58dc5b (feat commit)

**2. [Rule 1 - Bug] Fixed incorrect Supabase client imports**
- **Found during:** First build attempt
- **Issue:** near-misses.ts and workers.ts imported `createBrowserClient` but correct export is `createClient`
- **Fix:** Changed imports to use `createClient` from @/lib/supabase/client
- **Files modified:** web/lib/queries/near-misses.ts, web/lib/queries/workers.ts
- **Verification:** Build passes without import errors
- **Committed in:** d5b3910 (feat commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** DataTable component created ahead of schedule (unblocked current plan). Import bug fixed immediately. No scope creep.

## Issues Encountered

**Issue: Plan 04-03 not executed but referenced**
- **Problem:** Plan text references "Reuses DataTable component from Plan 04-03", but depends_on only lists 04-01
- **Solution:** Created DataTable as part of this plan (Rule 2 - missing critical functionality)
- **Outcome:** DataTable now available for future plans (treatments log can reuse it)

## User Setup Required

None - no external configuration needed.

## Next Phase Readiness

**Ready:**
- Near-miss log page complete with filtering (DASH-06)
- Worker registry page complete with search/filter (DASH-07, DASH-08)
- Both pages polling every 60 seconds (DASH-09)
- DataTable component available for treatments and safety checks pages
- Certification status column ready for Phase 7 integration

**Next phase (04-05):** Build export functionality (CSV, PDF) for treatments, near-misses, workers. DataTable component ready for export integration.

**Blockers:** None

---
*Phase: 04-web-dashboard*
*Completed: 2026-02-16*
