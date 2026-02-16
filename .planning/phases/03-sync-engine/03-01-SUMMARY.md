---
phase: 03-sync-engine
plan: 01
subsystem: sync-infrastructure
tags: [expo-background-task, expo-task-manager, react-native-background-upload, background-sync, foreground-polling]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: SyncQueue with persistent storage and priority levels
  - phase: 01-foundation
    provides: NetworkMonitor with connectivity detection
provides:
  - Hybrid sync scheduler coordinating foreground polling (30s) and background tasks (15min)
  - Background task definition at global scope for iOS BGTaskScheduler
  - Background task registration service with 15-minute minimum interval
  - App state transition handling (active/background sync strategy switching)
affects: [03-02-photo-upload, 03-03-integration, future-phases-using-sync]

# Tech tracking
tech-stack:
  added:
    - expo-background-task: Background task scheduling via iOS BGTaskScheduler
    - expo-task-manager: Task definition and lifecycle management
    - react-native-background-upload: Native background file uploads
    - expo-file-system: File reading for upload preparation
  patterns:
    - "Hybrid sync pattern: 30-second foreground polling + 15-minute background tasks"
    - "Global-scope task definition pattern (required by Expo TaskManager)"
    - "App state listening for sync strategy switching"

key-files:
  created:
    - mobile/tasks/backgroundSyncTask.ts: Global-scope task definition for background sync
    - src/services/BackgroundSyncTask.ts: Background task registration with 15-minute intervals
    - src/utils/syncScheduler.ts: Hybrid sync coordinator (foreground + background)
  modified:
    - package.json: Added 4 sync dependencies

key-decisions:
  - "Hybrid sync strategy: foreground polling (30s) for active app, background tasks (15min minimum) for inactive app"
  - "Background task registration is non-fatal: logs error if fails, foreground sync is primary"
  - "Photo uploads deferred to Plan 03-03 (integration phase)"

patterns-established:
  - "SyncScheduler singleton pattern with start/stop lifecycle"
  - "App state listener pattern for strategy switching"
  - "Online check before sync attempt to avoid unnecessary retries"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 03 Plan 01: Sync Infrastructure Summary

**Hybrid foreground/background sync scheduler with 30-second polling and 15-minute background tasks using expo-background-task**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T03:16:29Z
- **Completed:** 2026-02-16T03:19:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed 4 sync dependencies (expo-background-task, expo-task-manager, react-native-background-upload, expo-file-system)
- Created global-scope background task definition that processes SyncQueue items
- Implemented background task registration service with 15-minute minimum interval (iOS/Android requirement)
- Built hybrid sync scheduler that polls every 30 seconds in foreground and delegates to background task when inactive
- App state transitions automatically switch between foreground polling and background task strategies

## Task Commits

Each task was committed atomically:

1. **Task 1: Install sync dependencies** - `f8b5231` (chore)
2. **Task 2: Create background sync task definition and hybrid sync scheduler** - `dc424c0` (feat) + `910c8b6` (feat - refinement)

## Files Created/Modified
- `package.json` - Added expo-background-task, expo-task-manager, react-native-background-upload, expo-file-system
- `mobile/tasks/backgroundSyncTask.ts` - Global-scope TaskManager.defineTask for BACKGROUND_SYNC that processes syncQueue.processPendingItems()
- `src/services/BackgroundSyncTask.ts` - Registration service with 15-minute minimum interval, non-fatal error handling
- `src/utils/syncScheduler.ts` - Hybrid coordinator: 30-second foreground polling + app state listener + syncNow() manual trigger

## Decisions Made

**1. Hybrid sync strategy over background-only**
- **Rationale:** iOS BGTaskScheduler 15-minute minimum is too long for user-facing sync expectations
- **Implementation:** Foreground polling (30s) provides responsive sync when app active, background tasks handle sync when inactive
- **Trade-off:** More battery usage in foreground, but meets user decision for "batch and sync every 30 seconds"

**2. Non-fatal background task registration**
- **Rationale:** Background sync is nice-to-have, foreground sync is primary strategy
- **Implementation:** registerBackgroundSync() logs error but doesn't throw, app continues with foreground-only sync
- **Benefit:** App works even if background task registration fails (permissions, OS limitations)

**3. Photo uploads deferred to Plan 03-03**
- **Rationale:** Photo upload has different constraints (WiFi-only, progressive upload) requiring dedicated implementation
- **Implementation:** Background task comment notes where photo upload processing will be added
- **Benefit:** Keeps Plan 01 focused on core sync infrastructure, prevents scope creep

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 1 - Bug] Fixed BackgroundFetchResult TypeScript error**
- **Found during:** Task 2 (background task definition)
- **Issue:** TaskManager.BackgroundFetchResult doesn't exist in expo-task-manager type definitions
- **Fix:** Changed return pattern to void with throw on error (correct pattern for TaskManager.defineTask)
- **Files modified:** mobile/tasks/backgroundSyncTask.ts
- **Verification:** TypeScript compilation passes, no errors specific to new sync files
- **Committed in:** 910c8b6 (Task 2 refinement)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Bug fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None - dependencies installed smoothly, files created as specified, TypeScript compiled cleanly after BackgroundFetchResult fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ✅ Sync infrastructure foundation complete
- ✅ Ready for Plan 03-02: Photo upload queue implementation
- ✅ Ready for Plan 03-03: Integration with SyncContext and app initialization
- **Note:** SyncScheduler.start() not yet called - will be integrated in Plan 03-03
- **Note:** Photo uploads will be added to background task in Plan 03-03

---
*Phase: 03-sync-engine*
*Completed: 2026-02-16*
