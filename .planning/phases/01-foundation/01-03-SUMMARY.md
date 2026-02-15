---
phase: 01-foundation
plan: 03
subsystem: offline-data
tags: [watermelondb, sqlite, encryption, offline-first, gdpr, audit-logging]

# Dependency graph
requires:
  - phase: 01-01
    provides: Expo SDK 54 with WatermelonDB and expo-secure-store dependencies
provides:
  - WatermelonDB schema version 1 with 6 tables matching Supabase structure
  - 6 model classes (Treatment, Worker, NearMiss, SafetyCheck, SyncQueueItem, AuditLogEntry)
  - Encryption key infrastructure via iOS Keychain (expo-secure-store)
  - Local audit_log table for client-side GDPR-02 compliance
  - Database initialization module ready for app launch integration
affects: [01-04, 01-05, all-sync-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WatermelonDB schema with UUID support for offline record creation"
    - "Encryption key in iOS Keychain (hardware-backed, GDPR-compliant)"
    - "JSON field sanitizers to prevent parse errors (photo_uris, items)"
    - "last_modified_at column for sync conflict resolution (last-write-wins)"
    - "Client-side audit_log table for READ operation tracking (GDPR Article 30)"
    - "Lazy associations for efficient querying (Worker.treatments)"

key-files:
  created:
    - src/database/schema.ts (WatermelonDB schema with 6 tables)
    - src/database/migrations.ts (empty migrations for version 1)
    - src/database/models/Treatment.ts (treatment records with RIDDOR flag)
    - src/database/models/Worker.ts (worker profiles with health data)
    - src/database/models/NearMiss.ts (near-miss incident reports)
    - src/database/models/SafetyCheck.ts (daily safety checklists)
    - src/database/models/SyncQueueItem.ts (persistent sync queue)
    - src/database/models/AuditLogEntry.ts (client-side access logging for GDPR)
    - src/database/models/index.ts (model class exports)
    - src/lib/encryption.ts (encryption key management via Keychain)
    - src/lib/watermelon.ts (database initialization)
  modified: []

key-decisions:
  - "Defer SQLCipher encryption to Phase 2 (WatermelonDB PR #907 not merged, per research recommendation)"
  - "Use epoch milliseconds for all timestamps (number type, not Date objects)"
  - "server_id column stores Supabase UUID after sync (nullable until first sync)"
  - "JSON fields use sanitizer functions to prevent crashes on malformed data"
  - "audit_log table does NOT have server_id (write-once, synced via queue, not WatermelonDB sync)"
  - "Enable JSI adapter for better iOS performance"
  - "Generate 256-bit encryption key now even though SQLCipher deferred (infrastructure ready)"

patterns-established:
  - "Pattern: JSON sanitizers return empty arrays on parse failure (defensive programming)"
  - "Pattern: Lazy associations for has_many relationships (Worker.treatments)"
  - "Pattern: Encryption key in SecureStore with WHEN_UNLOCKED_THIS_DEVICE_ONLY accessibility"
  - "Pattern: last_modified_at for conflict resolution (separate from updated_at)"
  - "Pattern: Sync queue priority field (0 = RIDDOR immediate, 1 = normal)"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 01 Plan 03: WatermelonDB Offline Database Summary

**WatermelonDB schema with 6 tables, typed model classes, and iOS Keychain encryption key infrastructure for offline-first local data layer**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T22:32:45Z
- **Completed:** 2026-02-15T22:35:03Z
- **Tasks:** 2
- **Files created:** 11

## Accomplishments

- WatermelonDB schema version 1 created with 6 tables matching Supabase structure (treatments, workers, near_misses, safety_checks, sync_queue, audit_log)
- 6 model classes implemented with @decorators (Treatment, Worker, NearMiss, SafetyCheck, SyncQueueItem, AuditLogEntry)
- Encryption key generated and stored in iOS Keychain via expo-secure-store (256-bit, hardware-backed)
- JSON field sanitizers prevent crashes on malformed photo_uris and checklist items
- Local audit_log table ready for client-side READ operation tracking (GDPR Article 30)
- Database initialization module with all models registered
- SQLCipher infrastructure prepared (key management ready) but deferred to Phase 2 per research recommendation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create WatermelonDB schema and model classes** - `957fcae` (feat)
   - WatermelonDB schema with 6 tables (treatments, workers, near_misses, safety_checks, sync_queue, audit_log)
   - Treatment model with photo_uris JSON field and worker associations
   - Worker model with lazy treatments query (has_many relationship)
   - NearMiss model with photo_uris JSON field and sanitizer
   - SafetyCheck model with items and photo_uris JSON fields
   - SyncQueueItem model for persistent sync queue with priority and retry logic
   - AuditLogEntry model for client-side GDPR-02 access logging
   - All timestamps use epoch milliseconds (number type)
   - server_id column prepared for Supabase UUID after sync
   - last_modified_at for sync conflict resolution

2. **Task 2: Initialize WatermelonDB database and encryption key management** - `42c93e8` (feat)
   - Encryption key generation via expo-crypto (32 random bytes → 64-char hex)
   - Key storage in iOS Keychain via expo-secure-store (WHEN_UNLOCKED_THIS_DEVICE_ONLY)
   - deleteEncryptionKey() function for GDPR erasure
   - Database initialization with SQLiteAdapter and JSI enabled
   - All 6 model classes registered in database
   - getDatabase() accessor with initialization check
   - Clear documentation: encryptionKey NOT passed to adapter until SQLCipher integration ready

## Files Created/Modified

**Schema and migrations:**
- `src/database/schema.ts` - WatermelonDB appSchema with 6 tableSchema definitions
- `src/database/migrations.ts` - Empty migrations array for version 1

**Model classes:**
- `src/database/models/Treatment.ts` - Treatment records with injury details, RIDDOR flag, photos, signature
- `src/database/models/Worker.ts` - Worker profiles with health data, consent tracking, emergency contacts
- `src/database/models/NearMiss.ts` - Near-miss incidents with category, severity, corrective action
- `src/database/models/SafetyCheck.ts` - Daily safety checklists with pass/fail/partial status
- `src/database/models/SyncQueueItem.ts` - Sync queue with operation type, priority, retry count
- `src/database/models/AuditLogEntry.ts` - Client-side audit log with user_id, table_name, operation, context, synced flag
- `src/database/models/index.ts` - Export array of all 6 model classes

**Infrastructure:**
- `src/lib/encryption.ts` - Encryption key management via iOS Keychain (getOrCreateEncryptionKey, deleteEncryptionKey)
- `src/lib/watermelon.ts` - Database initialization with SQLiteAdapter and model registration

## Decisions Made

1. **Defer SQLCipher encryption to Phase 2:** WatermelonDB's native SQLCipher support is not yet merged (PR #907 open since 2021). Research recommends validating baseline sync first, then integrating SQLCipher fork or alternative. Encryption key infrastructure is ready now (stored in Keychain), but adapter does not use it yet.

2. **Use epoch milliseconds for timestamps:** All created_at, updated_at, last_modified_at, check_date fields use number type (milliseconds since epoch), not Date objects. This matches WatermelonDB's recommended pattern and simplifies sync (no timezone conversion issues).

3. **audit_log table has no server_id column:** Audit entries are write-once and synced via sync queue (not WatermelonDB's built-in sync). The `synced` boolean tracks whether the entry has been pushed to Supabase. This differs from other tables which use server_id after first sync.

4. **JSON sanitizers for defensive programming:** photo_uris and items fields use sanitizer functions that return empty arrays if JSON.parse fails. Prevents app crashes from malformed data during development or after schema changes.

5. **Sync queue priority levels:** Priority 0 = immediate (RIDDOR-reportable incidents requiring urgent server sync), Priority 1 = normal. This enables Phase 2 sync logic to prioritize compliance-critical records.

6. **Enable JSI adapter:** jsi: true flag passed to SQLiteAdapter for better iOS performance (faster synchronous queries). This is WatermelonDB's recommended configuration for production apps.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation passed on first attempt, all model decorators recognized, schema structure validated.

## Next Phase Readiness

**Ready for Plan 01-04:** Supabase database schema creation with matching table structure for sync compatibility.

**Blockers:** None.

**Notes for Plan 01-04:**
- Supabase schema must mirror WatermelonDB structure (same column names, types compatible)
- Use UUID primary keys (not SERIAL auto-increment) for offline record creation compatibility
- Add org_id column to all tables for Row-Level Security multi-tenant isolation
- PostgreSQL triggers for server-side audit logging (INSERT/UPDATE/DELETE operations)
- sync_queue table NOT needed on server (client-side only)
- audit_log table NEEDED on server to receive synced client-side access logs

**Notes for Plan 01-05 (Sync implementation):**
- Use WatermelonDB's synchronize() function with pullChanges/pushChanges
- Map local WatermelonDB IDs to server_id during first sync
- Use last_modified_at for conflict resolution (last-write-wins)
- Sync queue processes pending items with exponential backoff (5min → 15min → 1hr → 4hr)
- AuditLogEntry records sync separately from main data (via sync queue, not WatermelonDB sync)

---
*Phase: 01-foundation*
*Completed: 2026-02-15*
