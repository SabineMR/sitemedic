---
phase: 43-real-time-push-notifications
plan: 01
subsystem: messaging
tags: [supabase-realtime, postgres-changes, watermelondb, tanstack-query, websocket]

# Dependency graph
requires:
  - phase: 41-web-messaging-core
    provides: Polling-based useConversations and useMessages hooks, fetchConversationsWithUnread
  - phase: 42-ios-messaging-offline
    provides: WatermelonDB Conversation/Message models, MessageSync service, SyncContext
provides:
  - Supabase Realtime subscriptions replacing polling on both iOS and web
  - RealtimeContext provider for iOS with WatermelonDB integration
  - useRealtimeMessages hook for web with TanStack Query cache invalidation
  - UnreadBadge client component for live header badge updates
affects: [43-02-push-notifications, 44-broadcast-messaging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase Realtime postgres_changes for live message delivery"
    - "Write queue pattern for serialized WatermelonDB writes"
    - "TanStack Query cache invalidation via Realtime events"
    - "Single channel per user/org (not per conversation)"

key-files:
  created:
    - src/contexts/RealtimeContext.tsx
    - web/components/dashboard/UnreadBadge.tsx
  modified:
    - app/_layout.tsx
    - web/lib/queries/comms.ts
    - web/app/(dashboard)/layout.tsx
    - web/app/(dashboard)/messages/components/ConversationList.tsx
    - web/app/(dashboard)/messages/components/MessageThread.tsx
    - web/app/(dashboard)/messages/page.tsx
    - web/app/(dashboard)/messages/[conversationId]/page.tsx

key-decisions:
  - "RealtimeProvider placed inside SyncProvider in iOS app root layout (needs Auth + Org contexts)"
  - "Write queue serializes Realtime-triggered WatermelonDB writes to avoid concurrent db.write() conflicts"
  - "Sender name resolution uses 3-tier fallback: session cache > local WatermelonDB > Supabase medics query"
  - "Web Realtime uses @/lib/supabase singleton (not @supabase/ssr client) for WebSocket-based Realtime"
  - "UnreadBadge client component replaces server-rendered badge for live updates across all dashboard pages"
  - "Auto-scroll in MessageThread only triggers when user is near bottom (within 100px threshold)"

patterns-established:
  - "Realtime channel naming: user-${userId}:org_${orgId} for iOS, web-messages:org_${orgId} for web"
  - "Realtime events invalidate TanStack Query cache rather than directly mutating state"
  - "Idempotent message upsert: check server_id exists before creating WatermelonDB record"

# Metrics
duration: 7min
completed: 2026-02-20
---

# Phase 43 Plan 01: Realtime Subscriptions Summary

**Supabase Realtime postgres_changes subscriptions replacing 10s/30s polling on both iOS and web, with WatermelonDB upsert on iOS and TanStack Query cache invalidation on web**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-20T04:23:52Z
- **Completed:** 2026-02-20T04:30:56Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- iOS RealtimeContext provider with single Supabase Realtime channel per user, serialized write queue for WatermelonDB, and 3-tier sender name resolution
- Web useRealtimeMessages hook that invalidates TanStack Query cache on message INSERT and conversation UPDATE events
- Complete removal of all polling intervals (30s conversations, 10s messages) from web messaging
- Live-updating UnreadBadge client component in dashboard header replacing server-rendered badge

## Task Commits

Each task was committed atomically:

1. **Task 1: iOS RealtimeContext and WatermelonDB integration** - `1100e19` (feat)
2. **Task 2: Web Realtime subscription replacing polling** - `9a5078b` (feat)

## Files Created/Modified
- `src/contexts/RealtimeContext.tsx` - iOS Realtime provider with postgres_changes listeners, WatermelonDB upsert, write queue, sender name cache
- `web/components/dashboard/UnreadBadge.tsx` - Client component for reactive unread badge in dashboard header
- `app/_layout.tsx` - Added RealtimeProvider to iOS root layout provider hierarchy
- `web/lib/queries/comms.ts` - Added useRealtimeMessages hook, removed refetchInterval from useConversations and useMessages
- `web/app/(dashboard)/layout.tsx` - Replaced server-rendered badge with UnreadBadge client component
- `web/app/(dashboard)/messages/components/ConversationList.tsx` - Added useRealtimeMessages call, accepts orgId prop
- `web/app/(dashboard)/messages/components/MessageThread.tsx` - Smart auto-scroll (only if near bottom), removed polling reference
- `web/app/(dashboard)/messages/page.tsx` - Passes orgId to ConversationList
- `web/app/(dashboard)/messages/[conversationId]/page.tsx` - Passes orgId to ConversationList

## Decisions Made
- RealtimeProvider placed inside SyncProvider (needs Auth + Org contexts, wraps BottomSheetModalProvider)
- Write queue pattern chosen over mutex/semaphore for simplicity -- processes Realtime writes serially to avoid WatermelonDB concurrent write errors
- Sender name resolution uses 3-tier cascade: session-level Map cache, then existing WatermelonDB messages from same sender, then Supabase medics table query (single query, result cached)
- Web Realtime channel uses the `@/lib/supabase` singleton (createClient from @supabase/supabase-js) rather than the SSR-specific `@supabase/ssr` client, because Realtime WebSocket connections need a persistent client instance
- UnreadBadge subscribes to Realtime at the layout level, ensuring badge updates even when user is not on /messages page
- Smart auto-scroll: MessageThread only auto-scrolls when user is within 100px of the bottom, preventing forced scroll when reading message history

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Realtime subscriptions are active on both platforms, ready for Phase 43-02 (iOS push notifications)
- The Realtime channel is established at app/layout level, so push notification handlers can coordinate with it
- Broadcast messaging (Phase 44) can extend the same channel with additional postgres_changes filters

---
*Phase: 43-real-time-push-notifications*
*Completed: 2026-02-20*
