---
phase: 13-ux-polish
plan: 01
subsystem: ui
tags: [skeleton, loading-states, next-js, app-router, ux, perceived-performance]

# Dependency graph
requires:
  - phase: 04-web-dashboard
    provides: treatments and workers pages as server components
  - phase: 05.5-admin-operations
    provides: organizations page and command center with Leaflet map
provides:
  - Next.js App Router loading.tsx for treatments page (6-row table skeleton)
  - Next.js App Router loading.tsx for workers page (6-row table skeleton)
  - Skeleton card grid in organizations page (4 cards, 2-column)
  - Skeleton two-panel layout in command center dynamic() loading prop
affects: [future-ux-polish-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js App Router loading.tsx convention for automatic server-component loading states"
    - "Skeleton components sized to match actual content to prevent layout shift"

key-files:
  created:
    - web/app/(dashboard)/treatments/loading.tsx
    - web/app/(dashboard)/workers/loading.tsx
  modified:
    - web/app/platform/organizations/page.tsx
    - web/app/admin/command-center/page.tsx

key-decisions:
  - "Use Next.js loading.tsx convention for treatments/workers (server components) rather than client-side loading state"
  - "Skeleton column counts match real table columns (7 for treatments, 5 for workers) to prevent layout shift"
  - "Command center skeleton uses two-panel layout matching AlertPanel + map structure"
  - "Organizations skeleton cards use same bg-purple-800/30 border styling as real cards"

patterns-established:
  - "loading.tsx: place adjacent to page.tsx for App Router auto-display during server data fetch"
  - "Skeleton sizing: match real content dimensions (h-9 title, h-4 subtitle, h-10 filters, h-4 table cells)"

# Metrics
duration: 14min
completed: 2026-02-17
---

# Phase 13 Plan 01: Skeleton Loaders Summary

**Next.js App Router loading.tsx files and inline skeleton loaders replacing plain loading text on 4 data-heavy pages using existing Skeleton component**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-17T19:18:02Z
- **Completed:** 2026-02-17T19:31:45Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Created `web/app/(dashboard)/treatments/loading.tsx` with 7-column skeleton table (6 body rows + header) and filter row; Next.js shows this automatically while server component fetches data
- Created `web/app/(dashboard)/workers/loading.tsx` with 5-column skeleton table (6 body rows + header) and filter row
- Replaced "Loading organizations..." text in `organizations/page.tsx` with 4 skeleton cards in 2-column grid matching card structure (icon, name/slug, metrics, footer)
- Replaced "Loading command center..." text in `command-center/page.tsx` dynamic() loading prop with two-panel skeleton (header buttons, left alert list, right map area)
- pnpm build passes — compiled successfully, 83/83 pages generated, TypeScript valid

## Task Commits

Each task was committed atomically:

1. **Task 1: Create loading.tsx for treatments and workers** - `854233c` (feat)
2. **Task 2: Replace loading text with skeletons in organizations and command center** - `90844c0` (feat, included as part of prior 15-03 session commit)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/app/(dashboard)/treatments/loading.tsx` - Next.js App Router loading state: 7-column table skeleton with filter row, 6 body rows
- `web/app/(dashboard)/workers/loading.tsx` - Next.js App Router loading state: 5-column table skeleton with filter row, 6 body rows
- `web/app/platform/organizations/page.tsx` - Replaced loading div with 4 skeleton cards (2-col grid, purple-800/30 card style matching real cards)
- `web/app/admin/command-center/page.tsx` - Replaced loading div in dynamic() prop with two-panel skeleton (header, alert sidebar, map area)

## Decisions Made

- Used `loading.tsx` convention (not client-state loading) for treatments and workers since they are server components — Next.js handles display automatically during navigation
- Column counts match real tables exactly (7 for treatments: ref, worker, date, type, injury, outcome, status; 5 for workers: name, company, role, site, cert status) to prevent layout shift
- Command center skeleton mirrors actual two-panel layout (w-96 alert panel + flex-1 map) so page doesn't reflow when Leaflet loads
- Organizations skeleton uses identical Tailwind classes to real cards for seamless transition

## Deviations from Plan

None - plan executed exactly as written. Task 2 changes (organizations and command-center) were discovered to have been partially committed in a prior session (commit 90844c0 from phase 15-03 work), confirming the changes were already in place at HEAD.

## Issues Encountered

None. Build compiles successfully. The pre-existing login page prerender error (ENOENT in .next export) is unrelated to these changes and was present before this plan execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Skeleton loaders complete for all 4 target pages
- Pattern established for future skeleton additions (loading.tsx for server components, inline skeleton for client components)
- Ready for 13-02-PLAN.md (next plan in UX polish phase)

---
*Phase: 13-ux-polish*
*Completed: 2026-02-17*
