---
phase: 01-foundation
plan: 05
subsystem: sync-infrastructure
tags: [sync-queue, network-monitoring, audit-logging, offline-first, watermelondb, netinfo, gdpr, react-context]

# Dependency graph
requires:
  - phase: 01-foundation
    plan: 03
    provides: "WatermelonDB schema with sync_queue and audit_log tables, model classes"
  - phase: 01-foundation
    plan: 04
    provides: "AuthContext for user identification in audit logs"
provides:
  - "Persistent SyncQueue with exponential backoff (5min → 4hr cap) surviving force-quits"
  - "NetworkMonitor with real-time connectivity detection and automatic sync triggering"
  - "Client-side AuditLogger for GDPR-02 READ operation tracking on sensitive tables"
  - "SyncContext React provider exposing sync state (status, pendingCount, isOnline) app-wide"
  - "Visual sync status indicator with 5 color-coded states and pending count badge"
  - "Offline banner for medic awareness during construction site connectivity loss"
  - "RIDDOR priority queue (priority 0) ensuring compliance-critical records sync first"
  - "Batch audit log syncing at low priority (priority 2) without blocking clinical data"
affects:
  - phase: 02-mobile-core
    plans: all
    reason: "All screens will display SyncStatusIndicator and use useSync() for pending operations"
  - phase: 03-medical-workflows
    plans: all
    reason: "Treatment creation will enqueue sync items with RIDDOR priority detection"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Persistent sync queue in WatermelonDB (not in-memory) survives force-quit per Research Pitfall 6"
    - "Exponential backoff with cap prevents battery drain during extended offline (5min → 15min → 1hr → 4hr)"
    - "Priority queue (0=RIDDOR, 1=normal, 2=audit) ensures compliance records sync before non-critical data"
    - "NetInfo reachability test to Supabase URL confirms actual internet (not just WiFi connected)"
    - "Batch audit log syncing (50 entries at a time) prevents queue overflow"
    - "WiFi detection in NetworkMonitor ready for Phase 3 photo sync constraint"
    - "SyncContext polling pattern (10-second interval) for pending count updates"
    - "Circular sync dependency pattern: SyncQueue.enqueue() checks connectivity, NetworkMonitor.onConnected() triggers SyncQueue.processPendingItems()"

key-files:
  created:
    - path: "src/services/SyncQueue.ts"
      purpose: "Persistent sync queue with exponential backoff, priority handling, and Supabase sync"
      exports: ["SyncQueue", "syncQueue"]
    - path: "src/services/NetworkMonitor.ts"
      purpose: "Real-time connectivity detection with automatic sync triggering when online"
      exports: ["NetworkMonitor", "networkMonitor"]
    - path: "src/services/AuditLogger.ts"
      purpose: "Client-side audit logging for GDPR-02 READ operations on sensitive health tables"
      exports: ["AuditLogger", "auditLogger"]
    - path: "src/contexts/SyncContext.tsx"
      purpose: "React Context for sync state (status, pendingCount, isOnline) and sync operations"
      exports: ["SyncProvider", "useSync"]
    - path: "src/components/SyncStatusIndicator.tsx"
      purpose: "Visual sync status with 5 color-coded states (synced, syncing, pending, offline, error)"
      exports: ["SyncStatusIndicator"]
    - path: "src/components/OfflineBanner.tsx"
      purpose: "Yellow banner shown when device offline with dismissible UI"
      exports: ["OfflineBanner"]
  modified:
    - path: "App.tsx"
      purpose: "Integrated SyncProvider wrapping, OfflineBanner, SyncStatusIndicator, database initialization"
    - path: "tsconfig.json"
      purpose: "Added experimentalDecorators and emitDecoratorMetadata for WatermelonDB decorators"

key-decisions:
  - "Sync queue persists in WatermelonDB (not AsyncStorage or in-memory) to survive force-quit per Research Pitfall 6"
  - "Exponential backoff caps at 240 minutes (4 hours) to prevent indefinite retry delays during multi-day offline periods"
  - "RIDDOR priority is 0 (immediate), normal is 1, audit logs are 2 (lowest) to ensure compliance data syncs first"
  - "Audit logs batch-sync 50 at a time to prevent overwhelming sync queue with individual entries"
  - "NetInfo reachability test pings Supabase URL (not generic internet check) to confirm actual backend connectivity"
  - "SyncContext polls pendingCount every 10 seconds instead of WatermelonDB observable (simpler initial implementation)"
  - "AuditLogger only logs SENSITIVE_TABLES (workers, treatments, near_misses, safety_checks) to reduce audit volume"
  - "server_id updated on local record after successful 'create' sync operation to map local UUID to Supabase UUID"

patterns-established:
  - "Pattern: Singleton services (syncQueue, networkMonitor, auditLogger) for global access without React lifecycle"
  - "Pattern: React Context wraps singleton for component access via useSync() hook"
  - "Pattern: SyncQueue.enqueue() auto-triggers processPendingItems() if online (immediate sync when connected)"
  - "Pattern: NetworkMonitor.onConnected() triggers SyncQueue.processPendingItems() (automatic sync on restoration)"
  - "Pattern: AuditLogger.setCurrentUser() called from AuthProvider when auth state changes"
  - "Pattern: Pending count badge on sync indicator shows unsynced item count for medic awareness"
  - "Pattern: Manual sync retry on tap when status is 'pending' or 'error' (48x48pt touch target for gloves-on)"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 01 Plan 05: Sync Infrastructure Summary

**Persistent sync queue with exponential backoff and RIDDOR priority, client-side audit logging for GDPR-02 READ tracking, network monitoring with auto-sync triggers, and visual sync status UI integrated into app**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T16:44:24-06:00 (UTC-6)
- **Completed:** 2026-02-15T16:47:08-06:00 (UTC-6)
- **Tasks:** 3 (4 including checkpoint verification)
- **Files created:** 6
- **Files modified:** 2

## Accomplishments

- SyncQueue service persists pending operations in WatermelonDB with exponential backoff (5min → 15min → 1hr → 4hr cap) and RIDDOR priority queue (0=immediate, 1=normal, 2=audit)
- NetworkMonitor detects online/offline transitions in real time via NetInfo with Supabase reachability test and automatically triggers sync when connectivity restored
- AuditLogger service records client-side READ operations on sensitive health tables (workers, treatments, near_misses, safety_checks) to local audit_log table and batch-syncs to Supabase at low priority
- SyncContext React provider exposes sync state (status: synced/syncing/pending/offline/error, pendingCount, isOnline) and operations (triggerSync, enqueueSyncItem) to all components
- SyncStatusIndicator component shows 5 color-coded states with pending count badge and manual retry on tap (48x48pt touch target for gloves-on usability)
- OfflineBanner appears when device loses connectivity with yellow background and dismissible UI
- App.tsx integrates AuthProvider + SyncProvider with database initialization on launch and visual sync indicators

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement persistent SyncQueue and NetworkMonitor services** - `2c9c3c2` (feat)
   - SyncQueue class with WatermelonDB persistence (sync_queue table)
   - enqueue() method writes operations with priority, retryCount, nextRetryAt
   - processPendingItems() queries ready items sorted by priority ASC (RIDDOR=0 first), then created_at ASC
   - scheduleRetry() implements exponential backoff: min(5 * 2^retryCount, 240) minutes
   - syncItem() performs Supabase operations (create/update/delete) and updates local server_id on success
   - NetworkMonitor class with NetInfo.addEventListener for online/offline detection
   - NetInfo.configure with Supabase reachability URL test (confirms actual internet, not just WiFi)
   - onConnected() triggers syncQueue.processPendingItems() automatically
   - WiFi detection (connectionType === 'wifi') ready for Phase 3 photo sync constraint
   - Export singletons: syncQueue, networkMonitor

2. **Task 2: Implement client-side AuditLogger service for GDPR-02 compliance** - `2ec1407` (feat)
   - AuditLogger class for client-side READ operation tracking on sensitive tables
   - SENSITIVE_TABLES array: workers, treatments, near_misses, safety_checks
   - logAccess() writes to WatermelonDB audit_log table with user_id, table_name, record_id, operation, context, synced=false
   - setCurrentUser() method called from AuthProvider on login/logout
   - syncPendingAuditLogs() batch-syncs 50 unsynced entries at a time via syncQueue at priority 2 (lower than clinical data)
   - Fills GDPR-02 gap: server-side triggers capture writes, but READs on local WatermelonDB are invisible to server
   - Export singleton: auditLogger

3. **Task 3: Create sync status UI components and SyncContext** - `c523261` (feat)
   - SyncContext provider with SyncState type (status, pendingCount, isOnline, connectionType, lastSyncAt, lastError)
   - SyncProvider component starts networkMonitor, polls pendingCount every 10 seconds, sets auditLogger user from auth context
   - triggerSync() calls syncQueue.processPendingItems() AND auditLogger.syncPendingAuditLogs()
   - enqueueSyncItem() wrapper for syncQueue.enqueue() with state updates
   - Status logic: offline → 'offline', isProcessing → 'syncing', pendingCount > 0 → 'pending', lastError → 'error', else → 'synced'
   - SyncStatusIndicator component with 5 color-coded states: green (synced), blue with pulse (syncing), orange (pending), red (offline/error)
   - Pending count badge shows number of unsynced items
   - OnPress manual retry when status is 'pending' or 'error'
   - 48x48pt minimum touch target for gloves-on construction site usability
   - OfflineBanner component (yellow background #FEF3C7) only renders when isOnline === false
   - App.tsx updated: initDatabase() on launch, AuthProvider → SyncProvider wrapping, OfflineBanner + SyncStatusIndicator integration

4. **Task 4: Checkpoint - User verification** - Approved
   - Checkpoint verification completed: iOS simulator tested with airplane mode toggle
   - Verified: green sync indicator when online, red indicator + yellow banner when offline, banner disappears when back online
   - All verification criteria met

## Files Created/Modified

- `src/services/SyncQueue.ts` - Persistent sync queue with exponential backoff (5min → 4hr cap), priority handling (RIDDOR=0, normal=1, audit=2), Supabase sync operations, server_id updates (229 lines)
- `src/services/NetworkMonitor.ts` - Real-time connectivity detection via NetInfo, Supabase reachability test, WiFi detection, automatic sync triggering on restoration (141 lines)
- `src/services/AuditLogger.ts` - Client-side audit logging for GDPR-02 READ operations, batch syncing at low priority (50 entries/batch), sensitive table filtering (193 lines)
- `src/contexts/SyncContext.tsx` - React Context for sync state, networkMonitor integration, 10-second polling, triggerSync and enqueueSyncItem methods (232 lines)
- `src/components/SyncStatusIndicator.tsx` - Visual sync status with 5 color-coded states, pending count badge, pulse animation on 'syncing', manual retry on tap (202 lines)
- `src/components/OfflineBanner.tsx` - Yellow offline banner with dismissible UI, auto-reappears after 30 seconds if still offline (108 lines)
- `App.tsx` - MODIFIED: Added database initialization, AuthProvider + SyncProvider wrapping, OfflineBanner and SyncStatusIndicator integration (90 lines, was 8 lines)
- `tsconfig.json` - MODIFIED: Added experimentalDecorators and emitDecoratorMetadata compiler options for WatermelonDB decorator support

## Decisions Made

1. **Sync queue persists in WatermelonDB (not in-memory):** Research Pitfall 6 shows force-quit loses in-memory state. WatermelonDB sync_queue table survives force-quit, critical for construction site reliability.

2. **Exponential backoff caps at 240 minutes (4 hours):** Prevents indefinite retry delays during multi-day offline periods. 5min → 15min → 1hr → 4hr progression balances battery life vs. sync frequency.

3. **RIDDOR priority is 0, normal is 1, audit logs are 2:** RIDDOR-reportable incidents require immediate server sync for compliance. Audit logs are lowest priority to never block clinical data.

4. **Audit logs batch-sync 50 at a time:** Prevents overwhelming sync queue with individual audit entries. Reduces write amplification and improves sync efficiency.

5. **NetInfo reachability test pings Supabase URL:** Generic internet checks can false-positive (WiFi connected but no internet). Pinging Supabase confirms actual backend connectivity.

6. **SyncContext polls every 10 seconds (not WatermelonDB observable):** Simpler initial implementation. Observable pattern deferred until performance profiling shows polling overhead.

7. **AuditLogger only logs SENSITIVE_TABLES:** workers, treatments, near_misses, safety_checks contain health data requiring GDPR Article 30 access logging. Other tables excluded to reduce audit volume.

8. **server_id updated after successful 'create' sync:** Maps local UUID to Supabase UUID. Enables future sync conflict resolution and prevents duplicate record creation on retry.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation passed on first attempt, iOS simulator verification successful, all sync state transitions worked as expected.

## Next Phase Readiness

**Phase 1 Foundation Complete.** All foundational infrastructure in place:
- Expo SDK 54 scaffolding with Supabase client configuration
- Supabase database schema with 9 tables (organizations, profiles, workers, treatments, near_misses, safety_checks, audit_logs, worker_certifications, compliance_tasks)
- PostgreSQL triggers for server-side audit logging (INSERT/UPDATE/DELETE operations)
- Row-Level Security policies for multi-tenant data isolation
- WatermelonDB schema with 6 local tables (treatments, workers, near_misses, safety_checks, sync_queue, audit_log)
- 6 WatermelonDB model classes with typed decorators and JSON sanitizers
- Encryption key infrastructure via iOS Keychain (SQLCipher integration deferred to Phase 2)
- Authentication with offline session persistence and biometric Face ID/Touch ID
- AuthContext React provider for app-wide auth state
- Persistent sync queue with exponential backoff and RIDDOR priority
- Client-side audit logging for GDPR-02 READ operation tracking
- Network monitoring with automatic sync triggering
- Visual sync status UI with color-coded states and pending count badge

**Ready for Phase 2: Mobile Core UI**
- Authentication UI (login/signup screens with biometric enable)
- Worker registry (list + detail views with health profiles)
- Treatment logger UI (form with photo capture, signature, RIDDOR auto-flagging)
- Near-miss capture UI (quick-entry form with category picker, photo, severity)
- Daily safety checklist UI (10-item checklist with pass/fail/partial status)

**Blockers:** None.

**Integration patterns for Phase 2:**
- All screens use `useAuth()` hook for authentication state
- All screens use `useSync()` hook for pending operation awareness
- All data mutations call `syncQueue.enqueue()` after local WatermelonDB write
- All sensitive data reads call `auditLogger.logAccess()` for GDPR compliance
- Photo capture will check `networkMonitor.isWifi()` before auto-uploading (Phase 3)
- SyncStatusIndicator should appear in navigation header on all authenticated screens

---
*Phase: 01-foundation*
*Completed: 2026-02-15*
