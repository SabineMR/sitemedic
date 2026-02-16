---
phase: 03-sync-engine
plan: 07
subsystem: database
tags: [watermelondb, idempotency, sync, uuid, expo-crypto]

# Dependency graph
requires:
  - phase: 03-05
    provides: SyncQueue service with persistent queue and retry logic
provides:
  - Client-generated UUID idempotency keys on all sync queue items
  - Duplicate create detection via client_id field
  - Graceful handling of PostgreSQL unique constraint violations (23505)
affects: [04-backend, server-migration, supabase-schema]

# Tech tracking
tech-stack:
  added: []
  patterns: [idempotency-key-pattern, duplicate-detection-on-client]

key-files:
  created: []
  modified: [src/database/schema.ts, src/database/models/SyncQueueItem.ts, src/services/SyncQueue.ts]

key-decisions:
  - "Use client-generated UUID (expo-crypto) instead of server-generated ID for idempotency"
  - "Include client_id in create payloads immediately, server migration deferred to Phase 4+"
  - "Treat PostgreSQL 23505 duplicate error as success, not failure"

patterns-established:
  - "Idempotency key generation: Generate UUID at enqueue time, persist in WatermelonDB sync_queue"
  - "Duplicate detection: Check error.code === '23505' and error.message includes 'client_id'"
  - "Server migration strategy: Document in code comments, implement in future backend phase"

# Metrics
duration: 2.4min
completed: 2026-02-16
---

# Phase 03 Plan 07: Idempotency Keys Summary

**Client-generated UUID idempotency keys on sync queue items prevent duplicate server records when create operations are retried after network failures**

## Performance

- **Duration:** 2 min 21 sec
- **Started:** 2026-02-16T04:48:29Z
- **Completed:** 2026-02-16T04:50:50Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added idempotency_key column to sync_queue schema and SyncQueueItem model
- Bumped WatermelonDB schema version from 2 to 3
- Generate client UUID at enqueue time using expo-crypto
- Include client_id in all create payloads to Supabase
- Handle duplicate creates (PostgreSQL 23505 error) as success, update local server_id

## Task Commits

Each task was committed atomically:

1. **Task 1: Add idempotency_key column to sync_queue schema and model** - `051fd02` (feat)
2. **Task 2: Generate idempotency keys at enqueue time and include in create payloads** - `a9f8a11` (feat)

## Files Created/Modified
- `src/database/schema.ts` - Added idempotency_key column to sync_queue table, bumped schema version to 3, added migration note
- `src/database/models/SyncQueueItem.ts` - Added idempotencyKey field to model
- `src/services/SyncQueue.ts` - Generate UUID at enqueue, include client_id in create payloads, handle duplicate detection

## Decisions Made

**1. Use client-generated UUID for idempotency**
- Rationale: Server-generated IDs only exist after first successful sync. Network timeout after server success but before response reaches client would cause duplicate on retry. Client UUID prevents this.

**2. Include client_id in payloads immediately, defer server migration**
- Rationale: Client-side fix is immediate. Server-side unique constraint migration belongs in Phase 4+ (Supabase migration). Until server migration, client_id is sent but ignored.

**3. Treat PostgreSQL 23505 duplicate error as success**
- Rationale: If server rejects create due to duplicate client_id, the record already exists. Fetch existing server ID and update local record, then treat as success (don't retry).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 4 (Backend):**
- Client-side idempotency keys implemented and tested
- Server-side migration documented in code comments
- Next step: Add client_id UUID UNIQUE column to Supabase tables

**Blockers:**
- None

**Concerns:**
- Existing WatermelonDB databases (development devices) will need schema migration or app reinstall when schema version 3 is deployed
- Production migration adapter needed before production release (documented in schema.ts)

---
*Phase: 03-sync-engine*
*Completed: 2026-02-16*
