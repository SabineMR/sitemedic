---
phase: 42-ios-messaging-offline
plan: 02
subsystem: ui, mobile
tags: [react-native, watermelondb, messaging, expo-router, flatlist, offline, ios]

# Dependency graph
requires:
  - phase: 42-ios-messaging-offline
    provides: WatermelonDB Conversation and Message models, MessageSync service, SyncContext integration (Plan 42-01)
  - phase: 41-web-messaging
    provides: Web messaging components for feature parity reference (ConversationRow, MessageItem, MessageInput, MedicPicker patterns)
  - phase: 40-comms-docs-foundation
    provides: Supabase conversations/messages schema, conversation_read_status table, RLS policies
provides:
  - Messages tab in iOS app bottom bar with unread badge
  - ConversationList with reactive WatermelonDB observation, pull-to-refresh, search filter
  - ConversationRow with avatar, name, preview, timestamp, unread badge (72px gloves-on)
  - Message thread screen with inverted FlatList, flat Slack-style layout
  - MessageInput with Return-to-send, Send button, local WatermelonDB record creation
  - Mark-as-read on thread open (local + Supabase upsert)
  - MedicPicker for medic (Message Admin) and admin (medic roster) new conversation flows
  - EmptyState with role-based action button
affects: [42-03-offline-queue, 43-realtime, 44-broadcast]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WatermelonDB reactive observe queries in React Native FlatList components"
    - "Inverted FlatList for chat-like bottom-anchored message scrolling"
    - "KeyboardAvoidingView with platform-specific offset for iOS keyboard handling"
    - "Avatar color derivation from name hash for consistent avatar colors across components"
    - "Return-to-send via returnKeyType=send + onSubmitEditing (not Shift+Enter like web)"
    - "Fire-and-forget push sync after local message creation for immediate delivery attempt"

key-files:
  created:
    - app/(tabs)/messages.tsx
    - app/messages/[conversationId].tsx
    - src/components/messaging/ConversationList.tsx
    - src/components/messaging/ConversationRow.tsx
    - src/components/messaging/MessageThread.tsx
    - src/components/messaging/MessageItem.tsx
    - src/components/messaging/MessageInput.tsx
    - src/components/messaging/MedicPicker.tsx
    - src/components/messaging/EmptyState.tsx
  modified:
    - app/(tabs)/_layout.tsx

key-decisions:
  - "Messages tab placed between Safety and Events in tab bar, visible to all roles (no href restriction)"
  - "Unread badge observed via WatermelonDB observeCount on conversations with unread_count > 0"
  - "Avatar colors derived from name hash across 8-color palette for consistency between list and thread"
  - "Return key sends message immediately (no multi-line support via Return, matching CONTEXT.md requirement)"
  - "Mark-as-read fires both locally (WatermelonDB update) and on server (Supabase upsert) on thread open"
  - "MedicPicker uses SELECT-then-INSERT with 23505 catch for conversation duplicate prevention"
  - "Message send creates local WatermelonDB record with status=queued, then fire-and-forget push sync"

patterns-established:
  - "WatermelonDB observe() → useState → FlatList data pattern for reactive mobile lists"
  - "Inverted FlatList with KeyboardAvoidingView for chat thread UI on iOS"
  - "ConversationRow 72px minimum height for gloves-on tap targets"
  - "Fire-and-forget messageSync.pushPendingMessages() after local record creation"

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 42 Plan 02: iOS Conversation List and Thread UI Summary

**React Native Messages tab with conversation list, flat Slack-style message thread, Return-to-send input, mark-as-read, and MedicPicker for new conversations -- all reading from WatermelonDB**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T00:47:18Z
- **Completed:** 2026-02-20T00:53:39Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Messages tab added to iOS app bottom bar (between Safety and Events) with reactive unread badge from WatermelonDB
- Conversation list with reactive WatermelonDB observe query, pull-to-refresh, local search filter, and 72px gloves-on tap targets
- Message thread screen with inverted FlatList, flat Slack-style layout matching web, KeyboardAvoidingView for iOS keyboard
- Message send flow: local WatermelonDB record creation (status=queued), conversation metadata update, fire-and-forget push sync
- Mark-as-read on thread open (local unread_count=0 + Supabase conversation_read_status upsert)
- MedicPicker with both medic flow (Message Admin) and admin flow (medic roster with search)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Messages tab and conversation list screen with pull-to-refresh** - `1ff8b23` (feat)
2. **Task 2: Create message thread screen with flat layout, send flow, and mark-as-read** - `0895e37` (feat)

## Files Created/Modified
- `app/(tabs)/_layout.tsx` - Added Messages tab with unread badge observation and WatermelonDB imports
- `app/(tabs)/messages.tsx` - Messages tab entry point, renders ConversationList, triggers initial sync
- `app/messages/[conversationId].tsx` - Dynamic route for message thread, mark-as-read on mount
- `src/components/messaging/ConversationList.tsx` - FlatList with reactive WatermelonDB query, pull-to-refresh, search filter
- `src/components/messaging/ConversationRow.tsx` - Avatar, name, preview, timestamp, unread badge (72px min height)
- `src/components/messaging/MessageThread.tsx` - Inverted FlatList with KeyboardAvoidingView and MessageInput
- `src/components/messaging/MessageItem.tsx` - Flat Slack-style layout with queued message indicator
- `src/components/messaging/MessageInput.tsx` - Return-to-send, Send button, local record creation with UUID idempotency
- `src/components/messaging/MedicPicker.tsx` - Modal with medic/admin flows, SELECT-then-INSERT duplicate prevention
- `src/components/messaging/EmptyState.tsx` - Centered empty state with role-based action button

## Decisions Made
- Messages tab visible to ALL roles (both medics and admins use messaging) -- no href restriction unlike medic-only/admin-only tabs
- Unread badge uses WatermelonDB observeCount (reactive) rather than polling, wrapped in try-catch for cold start safety
- Avatar colors use an 8-color palette with consistent name hashing across ConversationRow and MessageItem
- Return key sends message (no multi-line), matching CONTEXT.md explicit requirement and web Enter-to-send behavior
- Mark-as-read fires both locally and on Supabase immediately on thread mount (not on visibility/focus)
- MedicPicker talks to Supabase directly (not Next.js API routes) since iOS app does not use the web API layer
- Message input uses multiline=false with returnKeyType="send" for single-line Return-to-send behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All messaging UI components ready for Plan 42-03 (Offline Queue and Delivery)
- Message send already creates local records with status='queued' and triggers pushPendingMessages
- Pull-to-refresh and reactive observation patterns established for future real-time integration (Phase 43)
- MedicPicker handles conversation creation directly via Supabase (ready for any conversation type)

---
*Phase: 42-ios-messaging-offline*
*Completed: 2026-02-20*
