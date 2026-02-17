---
phase: 14-compliance-exports
plan: 05
subsystem: ui
tags: [react, supabase-storage, signed-url, contracts, pdf, timeline]

# Dependency graph
requires:
  - phase: 14-compliance-exports
    provides: contract detail component scaffolding with version history and status timeline
provides:
  - Working PDF download via Supabase Storage signed URLs (604800s / 7 days)
  - Human-readable status timeline using formatEventDescription helper
  - Version status badges (signed/draft) in version history
  - Visual payment milestone tracker with numbered steps and progress bar
affects: [14-compliance-exports, future contract UI work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase Storage signed URLs for private file downloads (never expose direct paths or API routes)"
    - "formatEventDescription helper pattern — switch on event_type, return human string, outside component"
    - "Milestone tracker pattern — derive array from contract fields, compute paidCount/progressPercent, render progress bar + numbered steps"

key-files:
  created: []
  modified:
    - web/components/contracts/contract-detail.tsx

key-decisions:
  - "Derive version status (signed/draft) from signed_at since ContractVersion type has no status field"
  - "Use 604800 seconds (7 days) for signed URL expiry per D-05-02-001"
  - "Remove /api/contracts/[id]/pdf route entirely — replaced with client-side signed URL generation"
  - "Guard storage_path — download buttons only render when version.storage_path is truthy"

patterns-established:
  - "Signed URL pattern: createClient() + supabase.storage.from('contracts').createSignedUrl(path, 604800)"
  - "Event formatting: formatEventDescription(event_type, event_data) helper outside component"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 14 Plan 05: Contract Detail Fixes Summary

**PDF downloads via Supabase Storage signed URLs, human-readable event timeline replacing JSON.stringify, version status badges, and visual payment milestone tracker with progress bar**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T18:19:58Z
- **Completed:** 2026-02-17T18:23:07Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Replaced dead `/api/contracts/[id]/pdf` route references with client-side Supabase Storage `createSignedUrl` calls (7-day expiry)
- Added `formatEventDescription` helper that converts raw event_data JSON into "Status changed from draft to sent" style messages
- Added version status Badge (signed/draft) derived from `signed_at` since `ContractVersion` has no explicit `status` field
- Enhanced Payment Schedule card into a visual milestone tracker with numbered steps, a progress bar, and paid timestamps

## Task Commits

Each task was committed atomically:

1. **Tasks 1 & 2: Fix PDF downloads, timeline, milestone tracker** - `febfe09` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `web/components/contracts/contract-detail.tsx` - Fixed PDF downloads with signed URLs; added formatEventDescription; version status badges; milestone progress tracker

## Decisions Made
- Derived version status from `signed_at` (null = draft, non-null = signed) because `ContractVersion` type has no explicit `status` field — avoids type errors while still showing meaningful labels
- Implemented both tasks in a single atomic commit since they operate on the same file and are logically related (both fix the same contract-detail page)
- Used `604800` (7 days) for signed URL expiry as specified in D-05-02-001

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - build passed first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Contract detail page now fully functional: working PDF downloads, readable timeline, version badges, milestone tracker
- All must-have truths for plan 14-05 satisfied
- Ready for any remaining 14-compliance-exports plans

---
*Phase: 14-compliance-exports*
*Completed: 2026-02-17*
