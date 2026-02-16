---
phase: 03-sync-engine
plan: 06
subsystem: sync-infrastructure
tags: [expo-battery, battery-constraints, network-constraints, background-sync, netinfo]

# Dependency graph
requires:
  - phase: 03-sync-engine
    provides: Background sync task infrastructure (Plan 01)
  - phase: 03-sync-engine
    provides: Photo upload queue (Plan 02)
  - phase: 03-sync-engine
    provides: Sync wiring (Plan 05)
provides:
  - Runtime battery constraint check (<15% + not charging = skip sync)
  - Runtime network constraint check (cellular = skip photo uploads, proceed data sync)
  - expo-battery integration for battery level monitoring
  - Constraint documentation explaining expo-background-task API limitations
affects: [future-background-sync-enhancements, power-management-features]

# Tech tracking
tech-stack:
  added:
    - expo-battery: Battery level and charging state monitoring
  patterns:
    - "Runtime constraint pattern: Check battery/network before processing (expo-background-task doesn't expose WorkManager constraint APIs)"
    - "Differential network handling: WiFi for photos, any connection for data sync"
    - "Fail-safe pattern: Low battery early return without throwing errors"

key-files:
  created: []
  modified:
    - tasks/backgroundSyncTask.ts: Added battery level check, network type check, conditional photo upload
    - src/services/BackgroundSyncTask.ts: Added constraint strategy documentation comment
    - package.json: Added expo-battery dependency

key-decisions:
  - "Runtime constraints over registration-time constraints (expo-background-task API limitation)"
  - "15% battery threshold with charging state check (prevents drain on critically low battery)"
  - "Cellular allows data sync but blocks photos (data < 1KB, photos can be large)"

patterns-established:
  - "Battery check pattern: level < 0.15 AND state !== CHARGING = skip all sync"
  - "Network type pattern: cellular = skip photos, WiFi = process all"
  - "Logging pattern: Constraint violations logged as warnings, not errors"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 03 Plan 06: Background Sync Constraints Summary

**Runtime battery and network constraint checks prevent background sync battery drain using expo-battery and NetInfo**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T04:00:50Z
- **Completed:** 2026-02-16T04:02:28Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Installed expo-battery dependency for battery level monitoring
- Added runtime battery constraint: skip all sync if battery < 15% and not charging
- Added runtime network constraint: skip photo uploads on cellular (data sync proceeds)
- Documented constraint strategy explaining expo-background-task API limitation (no WorkManager-style constraint parameters)
- Preserved foreground sync behavior (constraints apply only to background task)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-battery and add runtime battery/network constraint checks** - `dfd03f4` (feat)

## Files Created/Modified
- `package.json` - Added expo-battery ^10.0.8 dependency
- `tasks/backgroundSyncTask.ts` - Added battery level check (getBatteryLevelAsync), charging state check, network type check (NetInfo.fetch), conditional photo upload based on WiFi availability
- `src/services/BackgroundSyncTask.ts` - Added constraint strategy documentation comment explaining runtime vs registration-time approach

## Decisions Made

**1. Runtime constraints over registration-time constraints**
- **Rationale:** expo-background-task does NOT expose WorkManager-style constraint APIs (confirmed in research during verification)
- **Implementation:** Battery and network checks performed at START of TaskManager.defineTask callback, before any sync processing
- **Benefit:** Still achieves battery/network constraint goals despite API limitation

**2. 15% battery threshold with charging state check**
- **Rationale:** Critical battery threshold (<15%) is when device warns user; don't drain further unless charging
- **Implementation:** `batteryLevel < 0.15 && batteryState !== Battery.BatteryState.CHARGING` triggers early return
- **Benefit:** Prevents sync from draining critically low battery

**3. Cellular allows data sync but blocks photos**
- **Rationale:** Data sync payloads are tiny (<1KB each), photo uploads can be large (multi-MB)
- **Implementation:** syncQueue.processPendingItems() proceeds on any connection, photoUploadQueue.processPendingPhotos() only on WiFi
- **Benefit:** Treatment data syncs reliably even on cellular, while avoiding surprise cellular data charges

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - expo-battery installed smoothly, battery and network checks implemented as specified, TypeScript compilation clean (pre-existing errors in backgroundSyncTask.ts imports are unrelated to this plan).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ✅ Background sync constraints complete (battery, network)
- ✅ Phase 3 (Sync Engine) is fully complete with all 6 plans delivered
- ✅ Ready for Phase 4 work (next phase focus per ROADMAP.md)
- **Note:** Constraints apply only to background sync task, foreground sync (SyncContext) is unaffected
- **Note:** Idle constraint intentionally not enforced (OS handles via BGTaskScheduler/WorkManager scheduling)

---
*Phase: 03-sync-engine*
*Completed: 2026-02-16*
