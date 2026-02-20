---
phase: 42-ios-messaging-offline
plan: 01
subsystem: database, sync
tags: [watermelondb, sqlite, offline, messaging, supabase, react-native]

# Dependency graph
requires:
  - phase: 40-comms-docs-foundation
    provides: Supabase conversations/messages schema (migration 143), RLS policies, comms.types.ts
  - phase: 41-web-messaging
    provides: Web messaging API routes (/api/messages/send, /api/messages/conversations), conversation_read_status table
provides:
  - WatermelonDB Conversation and Message models (local offline cache)
  - Schema migration v4 to v5 with two new tables
  - MessageSync service with pullSync (server to local) and pushPendingMessages (local to server)
  - SyncContext integration with messageSyncStatus and triggerMessageSync
affects: [42-02-ios-messaging-ui, 42-03-offline-queue, 43-realtime]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MessageSync singleton with incremental pull sync via AsyncStorage lastSyncedAt"
    - "Separate message sync from clinical data SyncQueue (self-contained MessageSync service)"
    - "Denormalized participant_name and sender_name on local models to avoid JOINs at render time"

key-files:
  created:
    - src/database/models/Conversation.ts
    - src/database/models/Message.ts
    - src/services/MessageSync.ts
  modified:
    - src/database/schema.ts
    - src/database/migrations.ts
    - src/database/models/index.ts
    - src/lib/watermelon.ts
    - src/contexts/SyncContext.tsx

key-decisions:
  - "MessageSync is a self-contained service -- does NOT modify existing SyncQueue.syncItem for clinical data"
  - "Messages use 'queued' status locally for offline (server schema only has sent/delivered/read)"
  - "Incremental sync uses lastSyncedAt in AsyncStorage, first sync fetches last 100 messages per conversation"
  - "Unread counts computed locally from WatermelonDB message data after pull sync"
  - "Participant name denormalized: medics see 'Admin', admins see medic name from medics table"

patterns-established:
  - "MessageSync singleton: separate pull/push sync service for messaging, keeping clinical SyncQueue untouched"
  - "WatermelonDB message model with local 'queued' status for offline message queueing"
  - "SyncContext.triggerMessageSync for UI pull-to-refresh of messaging data"

# Metrics
duration: 9min
completed: 2026-02-20
---

# Phase 42 Plan 01: WatermelonDB Models and Message Sync Summary

**WatermelonDB Conversation and Message models with schema v5 migration, plus MessageSync service for incremental pull/push sync between Supabase and local SQLite cache**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-20T00:35:07Z
- **Completed:** 2026-02-20T00:43:48Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- WatermelonDB schema bumped from v4 to v5 with conversations and messages tables
- Conversation model stores server_id, org_id, type, medic_id, last_message_at, participant_name, unread_count, last_read_at
- Message model stores server_id, conversation_id, sender_id, sender_name, content, status (queued/sent/delivered/read), idempotency_key
- MessageSync.pullSync fetches from Supabase with incremental sync (lastSyncedAt in AsyncStorage), resolves participant/sender names, computes unread counts
- MessageSync.pushPendingMessages sends queued local messages to Supabase, updates conversation metadata and read status
- SyncContext exposes messageSyncStatus and triggerMessageSync for UI layer pull-to-refresh

## Task Commits

Each task was committed atomically:

1. **Task 1: WatermelonDB Conversation and Message models with schema migration v4 to v5** - `106fab7` (feat)
2. **Task 2: MessageSync service for pull/push sync and SyncContext integration** - `991c0e8` (feat)

## Files Created/Modified
- `src/database/models/Conversation.ts` - WatermelonDB model for conversations with denormalized participant_name and unread_count
- `src/database/models/Message.ts` - WatermelonDB model for messages with offline 'queued' status support
- `src/database/schema.ts` - Bumped to version 5, added conversations and messages tableSchema entries
- `src/database/migrations.ts` - Added toVersion 5 migration with createTable for both new tables
- `src/database/models/index.ts` - Registered Conversation and Message (8 model classes total)
- `src/lib/watermelon.ts` - Updated comment to reflect 8 model classes
- `src/services/MessageSync.ts` - Pull/push sync service with incremental sync, sender name resolution, unread count computation
- `src/contexts/SyncContext.tsx` - Integrated messageSync into triggerSync flow, added messageSyncStatus and triggerMessageSync

## Decisions Made
- MessageSync is a self-contained service that does NOT modify the existing SyncQueue.syncItem method -- clinical data sync (treatments, workers, near_misses, safety_checks) remains completely untouched
- Local messages use 'queued' status for offline-created messages; server schema only has sent/delivered/read
- Incremental sync via lastSyncedAt timestamp persisted in AsyncStorage (key: `messaging_last_synced_at`)
- First sync fetches all conversations + last 100 messages per conversation; incremental fetches only newer records
- Participant names denormalized on local Conversation model: medics see "Admin", admins see medic name from medics table lookup
- Sender names denormalized on local Message model using same medics table lookup (non-medic senders labeled "Admin")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WatermelonDB models and sync service ready for Plan 42-02 (iOS Conversation List and Thread UI)
- UI components can use WatermelonDB observe queries on conversations and messages tables for reactive rendering
- triggerMessageSync exposed in SyncContext for pull-to-refresh in messaging UI
- pushPendingMessages ready for Plan 42-03 (Offline Queue and Delivery) to queue outbound messages

---
*Phase: 42-ios-messaging-offline*
*Completed: 2026-02-20*
