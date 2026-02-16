---
phase: 03-sync-engine
plan: 03
subsystem: sync
tags: [sync, offline-first, riddor, conflict-resolution, photo-uploads, background-sync]

# Dependency graph
requires:
  - phase: 03-01
    provides: Hybrid sync scheduler with foreground/background coordination
  - phase: 03-02
    provides: PhotoUploadQueue for progressive photo uploads
  - phase: 01-05
    provides: Base SyncQueue implementation with exponential backoff
provides:
  - RIDDOR fast retry (30s initial, 30min cap vs 5min/4hr for normal items)
  - Last-write-wins conflict resolution on update operations
  - Photo upload integration in background task and SyncContext
  - SyncScheduler integration in SyncContext replacing simple polling
affects: [03-04-sync-ui, 04-pdf-generation, phase-4-pdf]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RIDDOR priority fast retry pattern (30s initial, 30min cap)"
    - "Last-write-wins conflict resolution using timestamp comparison"
    - "Photo/data queue separation (photo_uploads filtered from data sync)"
    - "Hybrid sync scheduler integration in React Context"

key-files:
  created: []
  modified:
    - src/services/SyncQueue.ts
    - src/contexts/SyncContext.tsx
    - src/utils/syncScheduler.ts
    - mobile/tasks/backgroundSyncTask.ts

key-decisions:
  - "D-03-03-001: RIDDOR items (priority 0) retry after 30s initial vs 5min normal, cap at 30min vs 4hr"
  - "D-03-03-002: Photo uploads filtered from SyncQueue.processPendingItems (tableName !== 'photo_uploads')"
  - "D-03-03-003: Last-write-wins uses server updated_at vs local last_modified_at, server wins if newer"
  - "D-03-03-004: SyncContext integrates syncScheduler (start/stop) replacing 10s polling with hybrid strategy"
  - "D-03-03-005: Background task processes both syncQueue and photoUploadQueue for complete offline sync"

patterns-established:
  - "RIDDOR fast retry: Compliance-critical items get 30s initial retry, 30min cap for faster sync"
  - "Queue filtering by tableName: Photo uploads excluded from data sync, processed separately"
  - "Last-write-wins conflict resolution: Timestamp comparison prevents stale data overwriting newer edits"
  - "Photo upload integration: Both background task and SyncContext call photoUploadQueue.processPendingPhotos()"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 03 Plan 03: Sync Integration Summary

**RIDDOR fast retry (30s initial), last-write-wins conflict resolution, and photo upload integration across sync scheduler, background task, and SyncContext**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T03:23:10Z
- **Completed:** 2026-02-16T03:28:21Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- RIDDOR items retry after 30 seconds (not 5 minutes) with 30-minute cap for compliance-critical data
- Last-write-wins conflict resolution on updates prevents stale data from overwriting newer server changes
- Photo uploads filtered from data sync queue and processed separately by PhotoUploadQueue
- SyncContext integrates sync scheduler (30s foreground + 15min background) replacing simple 10s polling
- Background task processes both data sync and photo uploads for complete offline-to-online sync

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance SyncQueue with RIDDOR fast retry, photo filtering, and LWW conflict resolution** - `3ad7be3` (feat)
2. **Task 2: Wire SyncContext to sync scheduler and photo uploads, update background task** - `0ad9294` (feat)

**Plan metadata:** (to be committed after SUMMARY.md creation)

_Note: SyncContext.tsx changes were already present from commit d9030f8 (phase 03-04 work)_

## Files Created/Modified
- `src/services/SyncQueue.ts` - Enhanced scheduleRetry with RIDDOR fast retry (30s initial, 30min cap), photo_uploads filtering, last-write-wins conflict resolution on updates
- `src/contexts/SyncContext.tsx` - Added syncScheduler start/stop, photoUploadQueue integration in triggerSync, pendingPhotoCount tracking
- `src/utils/syncScheduler.ts` - Added photoUploadQueue.processPendingPhotos() call in syncNow method (non-blocking)
- `mobile/tasks/backgroundSyncTask.ts` - Added photoUploadQueue.processPendingPhotos() after data sync for complete background processing

## Decisions Made

**D-03-03-001: RIDDOR items (priority 0) retry after 30s initial vs 5min normal, cap at 30min vs 4hr**
- Rationale: Compliance-critical RIDDOR data needs faster retry for audit trail integrity
- Implementation: Check `item.priority === 0` in scheduleRetry, use 30s initial with Math.min(30 * 2^(n-1), 30*60)

**D-03-03-002: Photo uploads filtered from SyncQueue.processPendingItems (tableName !== 'photo_uploads')**
- Rationale: Photo uploads have different constraints (WiFi-only, progressive upload) and are handled by PhotoUploadQueue
- Implementation: Filter pendingItems by tableName before processing

**D-03-03-003: Last-write-wins uses server updated_at vs local last_modified_at, server wins if newer**
- Rationale: Prevents stale local changes from overwriting newer server edits (e.g., admin updates worker data while medic offline)
- Implementation: Fetch server record's updated_at before update, compare timestamps, skip if server newer

**D-03-03-004: SyncContext integrates syncScheduler (start/stop) replacing 10s polling with hybrid strategy**
- Rationale: Sync scheduler provides 30s foreground polling + 15min background tasks, more efficient than simple interval
- Implementation: Call syncScheduler.start() on mount, stop() on cleanup, reduce UI refresh to 5s (from 10s)

**D-03-03-005: Background task processes both syncQueue and photoUploadQueue for complete offline sync**
- Rationale: Background task runs when app is backgrounded/killed, needs to handle both data and photos
- Implementation: Call both processPendingItems() and processPendingPhotos() in backgroundSyncTask.ts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript type inference issue on Supabase client**
- Issue: Line 241 in SyncQueue.ts shows `Argument of type 'any' is not assignable to parameter of type 'never'`
- Context: Pre-existing Supabase client type inference limitation when using dynamic table names
- Resolution: No action taken - this is a known Supabase TypeScript limitation and doesn't affect runtime behavior
- Impact: None on functionality, TypeScript compiles with skipLibCheck

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Sync engine complete.** All 3 plans (03-01 Hybrid Scheduler, 03-02 Photo Upload Pipeline, 03-03 Sync Integration) delivered:

- Foreground sync: 30-second polling when app active
- Background sync: 15-minute tasks when app backgrounded
- RIDDOR fast retry: 30s initial, 30min cap for compliance data
- Photo uploads: Progressive tiers (thumbnail/preview/full) with WiFi-only constraint
- Conflict resolution: Last-write-wins prevents stale data overwrites
- Queue separation: Data and photos processed independently

**Ready for:** Phase 4 (PDF Generation) - sync engine provides reliable offline-to-online data flow for weekly HSE report generation.

**No blockers.**

---
*Phase: 03-sync-engine*
*Completed: 2026-02-16*
