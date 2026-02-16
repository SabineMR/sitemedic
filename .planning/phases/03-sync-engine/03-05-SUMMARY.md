---
phase: 03-sync-engine
plan: 05
subsystem: sync
tags: [watermelondb, sync-queue, photo-upload, offline-first, riddor]

# Dependency graph
requires:
  - phase: 02-mobile-core
    provides: Treatment, near-miss, worker, and daily check forms with WatermelonDB persistence
  - phase: 03-03
    provides: SyncContext with enqueueSyncItem, PhotoUploadQueue, and sync scheduler
  - phase: 03-04
    provides: SyncErrorDisplay, RiddorSyncAlert, and PhotoUploadProgress UI components
provides:
  - Complete offline-first sync integration for all Phase 2 data capture workflows
  - Automatic sync queue enqueuing on treatment completion, near-miss submission, worker induction, daily check completion
  - Progressive photo upload integration for treatment and near-miss photos
  - RIDDOR priority routing (priority 0) for compliance-critical treatments
  - Sync feedback UI mounted in app root (error display, RIDDOR alerts, photo progress)
affects: [04-pdf-generation, 05-quality-core, 06-compliance]

# Tech tracking
tech-stack:
  added: []
  patterns: [sync-after-save pattern, RIDDOR priority routing, progressive photo upload integration]

key-files:
  created: []
  modified:
    - mobile/app/treatment/new.tsx
    - mobile/app/treatment/[id].tsx
    - mobile/app/safety/near-miss.tsx
    - mobile/app/safety/daily-check.tsx
    - mobile/app/worker/new.tsx
    - App.tsx

key-decisions:
  - "Only explicit save/complete triggers sync, NOT auto-save (prevents queue overwhelm from 10s auto-save)"
  - "RIDDOR treatments use priority 0 for immediate sync (compliance requirement)"
  - "Photos enqueued separately via photoUploadQueue for progressive upload with WiFi constraints"
  - "Background task imported at App.tsx top level for global-scope registration"

patterns-established:
  - "Sync-after-save pattern: enqueueSyncItem called immediately after WatermelonDB write completes"
  - "Photo upload pattern: iterate photo URIs and enqueue each via photoUploadQueue.enqueuePhoto()"
  - "RIDDOR priority routing: isRiddorReportable flag determines priority (0 vs 1)"
  - "Sync UI layering: RIDDOR alert > error display > photo progress > offline banner > main content"

# Metrics
duration: 10min
completed: 2026-02-16
---

# Phase 03 Plan 05: Sync Wiring Summary

**All Phase 2 data capture forms wired to sync queue with RIDDOR priority routing, progressive photo upload, and sync feedback UI mounted**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-16T03:28:56Z
- **Completed:** 2026-02-16T03:38:56Z
- **Tasks:** 3 (2 auto, 1 checkpoint)
- **Files modified:** 6

## Accomplishments
- Treatment, near-miss, worker, and daily check forms automatically enqueue sync operations after local save
- RIDDOR-reportable treatments prioritized with priority 0 for immediate sync (compliance requirement)
- Photos enqueued for progressive upload (thumbnail → preview → full) with WiFi constraints
- Sync feedback UI mounted in App.tsx: RiddorSyncAlert, SyncErrorDisplay, PhotoUploadProgress
- Background sync task registered at global scope for 15-minute background processing

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire treatment, near-miss, worker, and daily check forms to sync queue** - `d271e16` (feat)
2. **Task 2: Mount sync UI components in App.tsx** - `b1a9b2d` (feat)
3. **Task 3: Checkpoint - Verification** - (approved)

## Files Created/Modified
- `mobile/app/treatment/new.tsx` - Enqueues sync on treatment completion with RIDDOR priority 0, photos to photoUploadQueue
- `mobile/app/treatment/[id].tsx` - Enqueues sync on status change to 'complete'
- `mobile/app/safety/near-miss.tsx` - Enqueues sync on near-miss submission with photos
- `mobile/app/safety/daily-check.tsx` - Enqueues sync on daily check completion with photos
- `mobile/app/worker/new.tsx` - Enqueues sync on worker induction completion
- `App.tsx` - Imports backgroundSyncTask at top level, mounts RiddorSyncAlert, SyncErrorDisplay, PhotoUploadProgress

## Decisions Made

**D-03-05-001: Only explicit save/complete triggers sync, NOT auto-save**
- **Rationale:** Auto-save runs every 10 seconds for local persistence. Syncing drafts every 10s would overwhelm the queue and backend with incomplete data. Only final user action (save/complete) should trigger sync.
- **Implementation:** enqueueSyncItem called only in handleComplete/handleSave handlers, NOT in useAutoSave hook

**D-03-05-002: RIDDOR treatments use priority 0 (immediate), all else priority 1**
- **Rationale:** RIDDOR reporting is a legal requirement. Treatment forms check isRiddorReportable flag from INJURY_TYPES taxonomy and route RIDDOR items to priority 0 for fastest sync.
- **Implementation:** `enqueueSyncItem(..., treatment.isRiddorReportable ? 0 : 1)`

**D-03-05-003: Photos enqueued separately via photoUploadQueue**
- **Rationale:** Photos have different constraints than data (WiFi-only for full quality, progressive upload in 3 stages). PhotoUploadQueue handles these constraints separately from main sync queue.
- **Implementation:** After enqueueSyncItem, iterate photoUris and call photoUploadQueue.enqueuePhoto() for each

**D-03-05-004: Background task imported at App.tsx top level**
- **Rationale:** TaskManager.defineTask must run at global scope before app initialization. Importing backgroundSyncTask at top of App.tsx ensures the task is registered before any React components mount.
- **Implementation:** `import './mobile/tasks/backgroundSyncTask';` as first import in App.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

**Ready for Phase 4 (PDF Generation):**
- All data capture workflows now sync to backend automatically
- Treatment, near-miss, worker, and safety check data available in Supabase for PDF generation
- RIDDOR items prioritized for compliance requirements
- Photos progressively uploaded for inclusion in PDF reports

**Blockers:**
None

**Recommendations for Phase 4:**
- PDF generation can now fetch data from Supabase with confidence that offline-created records will sync when connectivity returns
- Consider RIDDOR flag in PDF report formatting (highlight RIDDOR incidents)
- Photo attachments available via Supabase Storage for inclusion in PDF

---
*Phase: 03-sync-engine*
*Completed: 2026-02-16*
