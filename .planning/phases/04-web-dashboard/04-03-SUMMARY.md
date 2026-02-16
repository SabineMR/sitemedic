---
phase: 04-web-dashboard
plan: 03
subsystem: ui
tags: [nextjs, tanstack-table, tanstack-query, supabase-storage, filtering, pagination, photos]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dashboard foundation with TanStack Query, shadcn/ui, Supabase SSR
  - phase: 03-02
    provides: Photo upload to Supabase Storage with progressive tiers
provides:
  - Interactive treatment log with date range, severity, outcome, worker filtering
  - Treatment detail page with photo grid from Supabase Storage
  - Reusable DataTable component with sorting, filtering, pagination
  - 60-second polling for real-time treatment updates
affects: [04-04-near-misses-workers, 04-05-exports]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable DataTable component pattern with TanStack Table"
    - "Client-side date formatting with suppressHydrationWarning to avoid hydration mismatch"
    - "Filter state management in table wrapper components"
    - "Photo URL generation via supabase.storage.from().getPublicUrl()"
    - "UK date format (dd/MM/yyyy) with date-fns throughout dashboard"

key-files:
  created:
    - web/components/dashboard/data-table.tsx - Reusable table with sorting, filtering, pagination
    - web/components/dashboard/date-range-filter.tsx - Date range picker with native HTML inputs
    - web/components/dashboard/treatments-columns.tsx - TanStack Table column definitions
    - web/components/dashboard/treatments-table.tsx - Treatment table wrapper with filters
    - web/app/(dashboard)/treatments/page.tsx - Treatment log list page
    - web/app/(dashboard)/treatments/[id]/page.tsx - Treatment detail page with photos
    - web/lib/queries/treatments.ts - Treatment queries with 60s polling
  modified:
    - web/types/database.types.ts - Fixed severity/outcome types to match database schema
    - web/app/(dashboard)/near-misses/page.tsx - Fixed import (createClient not createServerClient)
    - web/app/(dashboard)/workers/page.tsx - Fixed import (createClient not createServerClient)

key-decisions:
  - "D-04-03-001: Client-side date formatting with suppressHydrationWarning to avoid Next.js hydration mismatch"
  - "D-04-03-002: Photo display uses Next.js Image with fill layout and responsive sizes for optimization"
  - "D-04-03-003: Severity and outcome rendered as colored badges (green/yellow/orange/red) for quick visual scanning"
  - "D-04-03-004: Treatment table includes row click handler navigating to detail page for fast access"
  - "D-04-03-005: Filters applied client-side after data fetch for instant filter response without server round-trip"

patterns-established:
  - "Pattern: DataTable component accepts generic ColumnDef[] and data array for reusability across tables"
  - "Pattern: Table wrapper components manage filter state and pass filtered data to DataTable"
  - "Pattern: Server component fetches initial data, client component uses TanStack Query for polling"
  - "Pattern: Date rendering in client component with suppressHydrationWarning for SSR compatibility"

# Metrics
duration: 12min
completed: 2026-02-16
---

# Phase 04 Plan 03: Treatment Log with Photos Summary

**Interactive treatment log with date range/severity/outcome filtering, sortable table (25/50/100 per page), detail page with photo grid from Supabase Storage, and 60-second polling**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-16T04:07:22Z
- **Completed:** 2026-02-16T04:19:50Z
- **Tasks:** 2
- **Files created:** 6
- **Files modified:** 3

## Accomplishments

- Built interactive treatment log table with 7 columns (Date, Worker, Injury Type, Severity, Outcome, RIDDOR, Actions)
- Implemented date range, severity, outcome, and worker name filters for treatment log
- Created treatment detail page displaying full record with photos from Supabase Storage
- Built reusable DataTable component for future use in near-misses and workers pages
- Enabled 60-second polling via useTreatments hook for real-time updates (DASH-09)
- Fixed pre-existing import errors in skeleton pages from incomplete plan attempt

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reusable data table component and treatment queries** - `ef1739c` (fix)
   - Fixed import errors in near-misses and workers skeleton pages
   - Changed createServerClient/createBrowserClient to createClient
   - These were pre-existing files from incomplete plan attempt
   - Fixed TypeScript types for severity (major/critical) and outcome (enum)

2. **Task 2: Build treatment log page, columns, and detail view** - `de21084` (feat)
   - Created treatments-columns.tsx with 7 column definitions
   - Built treatments-table.tsx wrapper with date range, severity, outcome, worker filters
   - Created treatments list page (server component with initial data)
   - Created treatment detail page with photo grid, worker info, injury details
   - All filters applied client-side for instant response
   - Row click navigation to detail page

## Files Created/Modified

**Created:**
- `web/components/dashboard/data-table.tsx` - Reusable TanStack Table component with sorting, filtering, pagination (25/50/100 per page)
- `web/components/dashboard/date-range-filter.tsx` - Date range picker with native HTML date inputs and clear button
- `web/components/dashboard/treatments-columns.tsx` - Column definitions with UK date format, colored badges, worker names
- `web/components/dashboard/treatments-table.tsx` - Table wrapper with filters (date range, severity, outcome, worker search)
- `web/app/(dashboard)/treatments/page.tsx` - Server component fetching initial treatments, passing to client table
- `web/app/(dashboard)/treatments/[id]/page.tsx` - Detail page with full record, photo grid, signature display
- `web/lib/queries/treatments.ts` - fetchTreatments, fetchTreatmentById, useTreatments hook with 60s polling

**Modified:**
- `web/types/database.types.ts` - Fixed Treatment severity type (minor/moderate/major/critical) and outcome type (enum)
- `web/app/(dashboard)/near-misses/page.tsx` - Fixed createServerClient → createClient import
- `web/app/(dashboard)/workers/page.tsx` - Fixed createServerClient → createClient import

## Decisions Made

**D-04-03-001: Client-side date formatting with suppressHydrationWarning**
- Rationale: Next.js SSR renders dates server-side with different timezone than client, causing hydration mismatch
- Solution: Render date in client component with suppressHydrationWarning attribute
- Impact: No hydration warnings, dates display correctly in UK format (dd/MM/yyyy HH:mm)

**D-04-03-002: Photo display uses Next.js Image with fill layout**
- Rationale: Supabase Storage photos need optimization, responsive sizes, lazy loading
- Solution: Next.js Image with fill, object-cover, responsive sizes parameter
- Impact: Photos load fast, optimized per viewport, lazy loaded below fold

**D-04-03-003: Severity and outcome rendered as colored badges**
- Rationale: Quick visual scanning for site managers, color-coded severity levels
- Solution: Badge component with color map (green/yellow/orange/red)
- Impact: Critical injuries instantly visible, outcomes color-coded for urgency

**D-04-03-004: Treatment table includes row click handler**
- Rationale: Reduce clicks to view detail (no need to click "View" button)
- Solution: onClick handler on TableRow navigating to /treatments/[id]
- Impact: Single click from list to detail, faster workflow

**D-04-03-005: Filters applied client-side after data fetch**
- Rationale: Instant filter response without server round-trip, all data already cached
- Solution: useMemo filtering treatments array, 60s polling refreshes full dataset
- Impact: Instant filter updates, smooth UX, no loading states for filters

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect TypeScript types for severity and outcome**
- **Found during:** Task 1 (Creating queries and type checking)
- **Issue:** database.types.ts had severity as 'severe' but database schema uses 'major'/'critical', outcome was generic string but schema has specific enum
- **Fix:** Changed severity to 'minor' | 'moderate' | 'major' | 'critical' and outcome to 'returned_to_work' | 'sent_home' | 'hospital_referral' | 'ambulance_called' | null
- **Files modified:** web/types/database.types.ts
- **Verification:** Build passes, types match database schema exactly
- **Committed in:** Task 1 execution (no separate commit, types fixed before queries created)

**2. [Rule 1 - Bug] Fixed import errors in skeleton pages from previous incomplete plan**
- **Found during:** Task 1 (Build verification)
- **Issue:** Pre-existing near-misses and workers pages used createServerClient and createBrowserClient but those functions don't exist (correct names are createClient in both files)
- **Fix:** Changed imports to createClient in both near-misses/page.tsx and workers/page.tsx
- **Files modified:** web/app/(dashboard)/near-misses/page.tsx, web/app/(dashboard)/workers/page.tsx, web/lib/queries/near-misses.ts, web/lib/queries/workers.ts
- **Verification:** Build passes without import errors
- **Committed in:** ef1739c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs from pre-existing incomplete plan attempt)
**Impact on plan:** All auto-fixes corrected pre-existing errors. Plan 04-03 was previously started but not completed, leaving skeleton files with incorrect imports. No scope creep - just fixing broken code to unblock execution.

## Issues Encountered

**Issue: Pre-existing skeleton files from incomplete plan**
- **Problem:** Previous execution of 04-03 created skeleton pages (near-misses, workers, queries, components) but used incorrect import names
- **Root cause:** Someone manually created files with wrong function names (createServerClient/createBrowserClient instead of createClient)
- **Solution:** Fixed all import errors in pre-existing files before proceeding with plan tasks
- **Outcome:** Build succeeded, Task 1 focused on bug fixes, Task 2 delivered treatment pages

**Issue: Next.js build cache corruption (ENOENT .nft.json)**
- **Problem:** First build attempt failed with "ENOENT: no such file or directory, open .next/server/app/_not-found/page.js.nft.json"
- **Root cause:** Stale .next build cache from previous failed builds
- **Solution:** rm -rf .next && pnpm build (clean rebuild)
- **Outcome:** Build succeeded cleanly after cache clear

## User Setup Required

None - no external service configuration required. Treatment photos use existing treatment-photos bucket from Phase 3. Supabase Storage already configured.

## Next Phase Readiness

**Ready:**
- Treatment log complete with full filtering, sorting, pagination
- Reusable DataTable component ready for near-misses and workers pages
- Treatment detail page displays photos from Supabase Storage
- 60-second polling active for real-time updates
- All components follow shadcn/ui patterns established in 04-01

**Next phase (04-04):** Build near-miss log and worker registry using DataTable component pattern. All infrastructure ready - just need to create columns and table wrapper components following treatment log pattern.

**Blockers:** None

---
*Phase: 04-web-dashboard*
*Completed: 2026-02-16*
