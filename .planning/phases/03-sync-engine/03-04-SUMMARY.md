---
phase: 03-sync-engine
plan: 04
subsystem: sync
tags: [sync-ui, error-handling, riddor-alerts, photo-progress, plain-language]

# Dependency graph
requires:
  - phase: 03-01
    provides: SyncContext with status tracking and triggerSync method
  - phase: 03-02
    provides: PhotoUploadQueue with photo upload task persistence in sync_queue
provides:
  - SyncErrorDisplay component with plain English error messages
  - RiddorSyncAlert component for critical RIDDOR sync failures
  - PhotoUploadProgress component for aggregate photo upload status
  - Enhanced SyncStatusIndicator with photo count tracking
affects: [mobile-ui, sync-feedback, riddor-compliance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain language error mapping for construction site users"
    - "RIDDOR retry threshold pattern (3+ failures trigger critical alert)"
    - "Aggregate photo progress (logical count, not queue items)"

key-files:
  created:
    - src/components/SyncErrorDisplay.tsx
    - src/components/RiddorSyncAlert.tsx
    - src/components/PhotoUploadProgress.tsx
  modified:
    - src/components/SyncStatusIndicator.tsx
    - src/contexts/SyncContext.tsx

key-decisions:
  - "D-03-04-001: Plain English error messages map technical errors to 4 user-friendly categories (network, auth, server, unknown)"
  - "D-03-04-002: RIDDOR critical alert threshold set to 3+ retry attempts (~3.5 min of sustained failures)"
  - "D-03-04-003: Photo upload progress shows logical photo count (queue items / 3 stages) to avoid confusing medics"
  - "D-03-04-004: SyncStatusIndicator badge shows combined data + photo count for total pending visibility"
  - "D-03-04-005: RiddorSyncAlert is non-dismissible until resolved (legal requirement for RIDDOR reporting)"

patterns-established:
  - "Error UX pattern: Amber for general errors (dismissible), Red for RIDDOR (non-dismissible)"
  - "Photo progress pattern: Aggregate notification (not per-photo) to avoid UI spam"
  - "RIDDOR threshold pattern: Multiple retries before critical alert prevents false alarms on transient network issues"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 3 Plan 4: Sync Feedback UI Components Summary

**Sync error handling with plain English messages, critical RIDDOR alerts after retry threshold, and aggregate photo upload progress tracking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T03:23:18Z
- **Completed:** 2026-02-16T03:26:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- SyncErrorDisplay component with plain English error messages (no technical jargon)
- RiddorSyncAlert component with critical red banner for RIDDOR failures after 3+ retries
- PhotoUploadProgress component showing aggregate photo count (divides by 3 stages)
- Enhanced SyncStatusIndicator with photo count tracking in badge and label
- Added pendingPhotoCount to SyncContext state for photo queue tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SyncErrorDisplay and RiddorSyncAlert components** - `da25d99` (chore - pre-committed by Sabine)
2. **Task 2: Create PhotoUploadProgress and enhance SyncStatusIndicator** - `d9030f8` (feat)

## Files Created/Modified
- `src/components/SyncErrorDisplay.tsx` - Error banner with plain English messages and retry button (amber background, 48pt tap target)
- `src/components/RiddorSyncAlert.tsx` - Critical persistent banner for RIDDOR items with retryCount >= 3 (red background, 56pt tap target, non-dismissible)
- `src/components/PhotoUploadProgress.tsx` - Aggregate photo upload indicator showing logical photo count (queue items / 3)
- `src/components/SyncStatusIndicator.tsx` - Enhanced with photo count in badge and label ("X items, Y photos")
- `src/contexts/SyncContext.tsx` - Added pendingPhotoCount field, filters photo_uploads items separately

## Decisions Made

**D-03-04-001:** Plain English error messages map technical errors to 4 user-friendly categories: network errors ("Unable to reach the server"), auth errors ("Your session has expired"), server errors ("The server is temporarily unavailable"), and unknown ("Something went wrong with sync"). Construction site medics should not see technical jargon like "ECONNREFUSED" or "JWT expired".

**D-03-04-002:** RIDDOR critical alert threshold set to 3+ retry attempts (RIDDOR_RETRY_THRESHOLD = 3) because at 3 retries with exponential backoff (30s, 1min, 2min), the item has been failing for ~3.5 minutes total, indicating a sustained failure rather than a transient network blip. Normal 1-2 retries do NOT trigger the critical alert.

**D-03-04-003:** Photo upload progress shows logical photo count (Math.ceil(pendingPhotoCount / 3)) instead of raw queue item count because each photo creates 3 queue items (thumbnail, preview, full). Showing "Uploading 9 photos" instead of "Uploading 3 photos" would confuse medics.

**D-03-04-004:** SyncStatusIndicator badge shows combined count (pendingCount + logicalPhotos) so medics see total pending items at a glance. Label shows breakdown when both present: "X items, Y photos".

**D-03-04-005:** RiddorSyncAlert is non-dismissible (no close button) until sync succeeds because RIDDOR incidents are legally required to be reported within specific timeframes. Medic must resolve the sync failure, not just dismiss the alert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added pendingPhotoCount to SyncContext state**
- **Found during:** Task 2 (PhotoUploadProgress implementation)
- **Issue:** SyncContext did not track photo upload queue separately from data sync queue
- **Fix:** Added pendingPhotoCount field to SyncState interface, initialized to 0, and updated refreshState to filter photo_uploads items separately
- **Files modified:** src/contexts/SyncContext.tsx
- **Verification:** TypeScript compilation passes, Grep confirmed pendingPhotoCount in state interface and refreshState logic
- **Committed in:** d9030f8 (Task 2 commit)
- **Rationale:** Critical for Task 2 success criteria - PhotoUploadProgress and SyncStatusIndicator require photo count to function. Without this, components would show incorrect counts or fail to display.

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Necessary addition for Task 2 completion. No scope changes, aligns with plan intent.

## Issues Encountered

None - tasks executed smoothly. The missing pendingPhotoCount field was caught during Task 2 implementation and added via Rule 2 (auto-add missing critical functionality).

## Authentication Gates

None - no external authentication required for this plan.

## Next Phase Readiness

**Ready for Phase 3 completion:**
- Sync feedback UI complete with error handling, RIDDOR alerts, and photo progress
- Plain English messaging for construction site medics (no technical jargon)
- Critical RIDDOR failure alerts after retry threshold (legal compliance)
- Aggregate photo progress (avoids UI spam per Research Pitfall 6)

**Phase 3 (Sync Engine) complete.** All sync infrastructure and UI components delivered:
- Plan 03-01: Background sync with foreground polling and background tasks
- Plan 03-02: Progressive photo upload with WiFi constraints
- Plan 03-03: Conflict resolution with last-write-wins strategy (inferred from commit 3ad7be3)
- Plan 03-04: Sync feedback UI with error handling and RIDDOR alerts

**No blockers.** Ready for Phase 4 or mobile app integration.

---
*Phase: 03-sync-engine*
*Completed: 2026-02-16*
