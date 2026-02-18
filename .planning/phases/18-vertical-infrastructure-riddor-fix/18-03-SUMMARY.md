---
phase: 18-vertical-infrastructure-riddor-fix
plan: 03
subsystem: ui
tags: [react-native, context, async-storage, offline-first, org, verticals]

# Dependency graph
requires:
  - phase: 18-01
    provides: WatermelonDB schema v4 with verticalExtraFields column; Supabase migration 124 creating compliance_score_history and org_settings.industry_verticals
provides:
  - OrgContext with useOrg() hook exposing primaryVertical and orgId to all components
  - AsyncStorage cache 'sitemedic.org.vertical_cache' for offline-first vertical data
  - OrgProvider registered in provider tree between AuthProvider and SyncProvider
affects:
  - 18-04 (treatment form uses useOrg() to branch on primaryVertical)
  - 18-05 (RIDDOR gate reads primaryVertical from useOrg())
  - All Phase 18+ plans that need the org's vertical context

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cache-first with background refresh: serve cached data immediately, then fire background network refresh to keep cache warm"
    - "Offline fallback: foreground fetch failure falls back to stale cache before surfacing error"
    - "Cleanup flag pattern: cancelled boolean in useEffect prevents setState on unmounted component"

key-files:
  created:
    - src/contexts/OrgContext.tsx
  modified:
    - app/_layout.tsx

key-decisions:
  - "AsyncStorage key 'sitemedic.org.vertical_cache' stores { orgId, verticals } shape"
  - "primaryVertical = industryVerticals[0] ?? 'general' (general is the safe default for non-configured orgs)"
  - "Cache-first load: cached data served immediately, then background network refresh (not blocking)"
  - "OrgProvider placed inside AuthProvider, outside SyncProvider per dependency order"

patterns-established:
  - "Context isolation: OrgContext reads only from org_settings.industry_verticals — no other org data fetched here"
  - "Logout cleanup: OrgProvider clears AsyncStorage cache on !isAuthenticated to prevent stale org data for next user"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 18 Plan 03: OrgContext with AsyncStorage Vertical Caching Summary

**Mobile OrgContext created: fetches org_settings.industry_verticals once at login, caches offline under 'sitemedic.org.vertical_cache', exposes primaryVertical via useOrg() hook**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T02:53:38Z
- **Completed:** 2026-02-18T02:55:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/contexts/OrgContext.tsx` with cache-first, offline-safe loading of `org_settings.industry_verticals`
- Registered `OrgProvider` in `app/_layout.tsx` in the correct position: inside `AuthProvider`, wrapping `SyncProvider`
- `useOrg()` hook exposes `orgId`, `industryVerticals`, `primaryVertical`, `isLoading`, `error` to all app components
- Background refresh keeps cache warm without blocking UI; stale cache used transparently when offline

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/contexts/OrgContext.tsx with AsyncStorage caching** - `03755e9` (feat)
2. **Task 2: Register OrgProvider in app/_layout.tsx between AuthProvider and SyncProvider** - `aad8d74` (feat)

**Plan metadata:** `[docs commit]` (docs: complete plan)

## Files Created/Modified

- `src/contexts/OrgContext.tsx` - OrgProvider + useOrg() hook; cache-first vertical loading with offline fallback; clears cache on logout
- `app/_layout.tsx` - Added OrgProvider import and wrapper between AuthProvider and SyncProvider

## Decisions Made

- AsyncStorage key `sitemedic.org.vertical_cache` stores `{ orgId: string, verticals: string[] }` — includes orgId so cache is invalidated automatically if a different user logs in to the same device
- `primaryVertical = industryVerticals[0] ?? 'general'` — `'general'` is the safe fallback for orgs with no vertical configured
- Cache-first pattern chosen over network-first: construction sites have zero signal; any added latency on form mount is unacceptable
- Background refresh (fire-and-forget) keeps cache warm after initial serve — failures are silent to avoid flickering the UI

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `web/lib/invoices/pdf-generator.ts` were present before this plan and are unrelated to Phase 18 work; zero errors in `src/` and `app/` mobile files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useOrg()` is available to all components in the app — 18-04 (treatment form vertical branching) can proceed
- `primaryVertical` defaults to `'general'` for orgs not yet configured with a vertical — safe for existing users
- 18-02 (vertical config TypeScript files) must be complete before 18-04 can use vertical config objects; check 18-02-SUMMARY.md for status

---
*Phase: 18-vertical-infrastructure-riddor-fix*
*Completed: 2026-02-18*
