---
phase: 42-ios-messaging-offline
plan: 03
subsystem: sync, mobile, ui
tags: [react-native, watermelondb, offline, messaging, deduplication, network-monitor, retry, connectivity]

# Dependency graph
requires:
  - phase: 42-ios-messaging-offline
    provides: WatermelonDB models, MessageSync service, SyncContext (Plan 42-01); ConversationList, MessageThread, MessageItem, MessageInput UI components (Plan 42-02)
  - phase: 40-comms-docs-foundation
    provides: Supabase messages table with metadata JSONB column for idempotency_key storage
provides:
  - Connectivity-triggered auto sync (push pending then pull new on reconnect)
  - Idempotency-key deduplication via metadata JSONB field (SELECT-before-INSERT)
  - 24-hour stale message expiry with failed status and tap-to-retry
  - Queued message styling (half opacity + "Sending..." indicator)
  - Failed message styling (half opacity + red "Failed to send" + tap-to-retry)
  - Offline banners on ConversationList and MessageInput (amber background)
  - Auto scroll-to-bottom on new message send in MessageThread
affects: [43-realtime, 44-broadcast]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NetworkMonitor listener triggers push-then-pull sync on connectivity change"
    - "Idempotency key in metadata JSONB for server-side deduplication (no schema change)"
    - "24-hour stale message expiry: queued messages older than 24h marked as failed"
    - "Offline amber banner pattern for React Native components (backgroundColor #FEF3C7)"

key-files:
  created: []
  modified:
    - src/services/MessageSync.ts
    - src/contexts/SyncContext.tsx
    - src/components/messaging/MessageThread.tsx
    - src/components/messaging/MessageItem.tsx
    - src/components/messaging/MessageInput.tsx
    - src/components/messaging/ConversationList.tsx

key-decisions:
  - "Idempotency key stored in messages.metadata JSONB (no schema change needed)"
  - "24-hour timeout for queued messages -- older than 24h marked failed with tap-to-retry"
  - "Push-then-pull ordering on reconnect: send queued messages first, then fetch new ones"
  - "Offline banners use amber-100 (#FEF3C7) background consistent across all messaging screens"
  - "Human verification deferred -- approved without live iOS testing"

patterns-established:
  - "startAutoSync/stopAutoSync lifecycle: register NetworkMonitor listener in SyncContext useEffect with cleanup"
  - "Deduplication via SELECT-contains-then-INSERT pattern using metadata JSONB (avoids unique constraint migration)"
  - "Stale message expiry: time-based rather than retry-count-based for simplicity"

# Metrics
duration: 5min
completed: 2026-02-20
---

# Phase 42 Plan 03: Offline Queue and Delivery Summary

**Connectivity-triggered push/pull sync with idempotency-key deduplication, 24-hour stale message expiry, queued/failed message styling, and offline banners on conversation list and message input**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-20T03:20:00Z
- **Completed:** 2026-02-20T03:28:34Z
- **Tasks:** 2 (1 auto + 1 checkpoint approved)
- **Files modified:** 6

## Accomplishments
- MessageSync enhanced with startAutoSync/stopAutoSync lifecycle that registers NetworkMonitor listener for automatic push-then-pull on reconnect
- Push sync includes idempotency-key deduplication via SELECT on metadata JSONB before INSERT (prevents duplicate server messages on retry)
- Queued messages older than 24 hours automatically marked as 'failed' with user-facing retry option
- MessageItem renders queued messages at half opacity with "Sending..." indicator, failed messages with red "Failed to send - Tap to retry" label
- MessageInput shows amber offline banner ("You're offline. Messages will be sent when you reconnect.") when device is offline
- ConversationList shows amber offline banner ("Offline - showing cached messages") and gracefully handles pull-to-refresh while offline
- MessageThread auto-scrolls to newest message on send (scrollToOffset 0 on inverted FlatList)
- Human verification checkpoint approved (live iOS testing deferred to later)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add connectivity-triggered message sync, retry with deduplication, and offline UI indicators** - `432d7af` (feat)
2. **Task 2: Human verification of full iOS messaging with offline support** - APPROVED (checkpoint, deferred testing)

## Files Created/Modified
- `src/services/MessageSync.ts` - Added startAutoSync/stopAutoSync with NetworkMonitor listener, idempotency-key deduplication in pushPendingMessages, 24-hour stale message expiry, unread count recomputation after pull
- `src/contexts/SyncContext.tsx` - Integrated startAutoSync call on authenticated user mount, stopAutoSync in cleanup
- `src/components/messaging/MessageThread.tsx` - Added FlatList ref with auto-scroll to offset 0 on new message detection
- `src/components/messaging/MessageItem.tsx` - Queued message styling (opacity 0.5, "Sending..." label), failed message styling (red "Failed to send - Tap to retry" with status reset on press)
- `src/components/messaging/MessageInput.tsx` - Offline banner (amber #FEF3C7 background, "You're offline" text) visible when useSync reports offline
- `src/components/messaging/ConversationList.tsx` - Offline banner, graceful pull-to-refresh handling when offline ("Can't sync while offline")

## Decisions Made
- Idempotency key stored in messages.metadata JSONB field rather than adding a dedicated column -- avoids a database migration while still enabling deduplication via .contains() query
- 24-hour timeout chosen for stale message expiry rather than retry-count tracking -- simpler and avoids needing a retry_count field on the Message model
- Push-then-pull ordering on reconnect ensures outbound queued messages are sent before fetching inbound messages (avoids showing responses before your message appears as sent)
- Offline banners use amber-100 (#FEF3C7) color consistent across both ConversationList and MessageInput for visual coherence
- Human verification was approved with testing deferred -- user chose to verify the full iOS messaging flow at a later time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 42 (iOS Messaging Offline) is now COMPLETE (all 3 plans executed)
- Full offline messaging pipeline: WatermelonDB models (42-01), UI components (42-02), offline queue with deduplication (42-03)
- Ready for Phase 43 (Real-time) to replace polling with Supabase Realtime subscriptions
- Ready for Phase 44 (Broadcast) to add broadcast message support using the same offline infrastructure
- Human testing of the full offline round-trip is deferred but all code is in place

---
*Phase: 42-ios-messaging-offline*
*Completed: 2026-02-20*
