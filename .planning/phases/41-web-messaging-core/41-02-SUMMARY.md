---
phase: 41-web-messaging-core
plan: 02
subsystem: ui
tags: [messaging, message-thread, send-message, mark-as-read, polling, supabase, next.js, tanstack-query]

# Dependency graph
requires:
  - phase: 41-web-messaging-core
    provides: "ConversationList, useConversations hook, /messages page, comms.ts query layer"
  - phase: 40-comms-docs-foundation
    provides: "conversations, messages, conversation_read_status tables with RLS"
provides:
  - "POST /api/messages/send endpoint with content validation and conversation metadata update"
  - "PATCH /api/messages/conversations/[id]/read endpoint for mark-as-read"
  - "fetchConversationById and fetchMessagesForConversation server functions"
  - "useMessages client hook with 10s polling"
  - "/messages/[conversationId] thread page with two-panel layout"
  - "MessageThread, MessageItem, MessageInput components"
affects: [41-03-new-conversation, 43-realtime-messaging, 44-ios-messaging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sender name resolution via bulk medics table lookup (medicUserId -> fullName, fallback 'Admin')"
    - "Optimistic UI via query invalidation after send (messages + conversations)"
    - "Textarea auto-grow with max-height cap (160px) and Enter-to-send keyboard shortcut"

key-files:
  created:
    - web/app/api/messages/send/route.ts
    - web/app/api/messages/conversations/[id]/read/route.ts
    - web/app/(dashboard)/messages/[conversationId]/page.tsx
    - web/app/(dashboard)/messages/components/MessageThread.tsx
    - web/app/(dashboard)/messages/components/MessageItem.tsx
    - web/app/(dashboard)/messages/components/MessageInput.tsx
  modified:
    - web/lib/queries/comms.ts
    - web/app/(dashboard)/messages/components/ConversationList.tsx

key-decisions:
  - "10-second polling for active message thread (faster than 30s conversation list polling)"
  - "Sender name resolution via medics table bulk lookup, non-medic senders labeled 'Admin'"
  - "Flat Slack-style message layout (not chat bubbles) per CONTEXT.md guidance"
  - "Enter-to-send, Shift+Enter for newline keyboard shortcut pattern"
  - "Conversation metadata (last_message_at, last_message_preview) updated on each send for list display"

patterns-established:
  - "Message send flow: insert message -> update conversation metadata -> upsert sender read status"
  - "fetchMessagesForConversation pattern: fetch messages + bulk resolve sender names from medics table"
  - "Thread page parallel fetching: conversation + messages + sidebar conversations via Promise.all"

# Metrics
duration: 6min
completed: 2026-02-19
---

# Phase 41 Plan 02: Message Thread & Send Summary

**Message thread view with flat Slack-style layout, Enter-to-send input, mark-as-read on open, and 10s polling via send/read API routes**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-19T23:34:06Z
- **Completed:** 2026-02-19T23:40:05Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created send message API route that validates content (max 5000 chars), inserts message, updates conversation metadata (last_message_at, last_message_preview), and upserts sender's read status
- Built mark-as-read API route that upserts conversation_read_status with current timestamp on conversation open
- Implemented message thread page with parallel data fetching (conversation + messages + sidebar conversations) and two-panel layout matching the /messages page
- Created flat Slack-style MessageItem with avatar initial, sender name (with "(you)" for own messages), content, and relative timestamp
- Built auto-growing MessageInput textarea with Enter-to-send, Shift+Enter for newline, max-height of 160px, and disabled state during send

## Task Commits

Each task was committed atomically:

1. **Task 1: Create send message and mark-as-read API routes, plus message query functions** - `443c0c0` (feat)
2. **Task 2: Create message thread page and UI components** - `fc6c483` (feat)

## Files Created/Modified
- `web/app/api/messages/send/route.ts` - POST endpoint: validate, insert message, update conversation metadata, upsert sender read status
- `web/app/api/messages/conversations/[id]/read/route.ts` - PATCH endpoint: upsert conversation_read_status with current timestamp
- `web/lib/queries/comms.ts` - Added fetchConversationById, fetchMessagesForConversation (with sender name resolution), useMessages hook (10s polling)
- `web/app/(dashboard)/messages/[conversationId]/page.tsx` - Server component with parallel fetching and two-panel layout
- `web/app/(dashboard)/messages/components/MessageThread.tsx` - Client component with scroll-to-bottom, mark-as-read on mount, query invalidation after send
- `web/app/(dashboard)/messages/components/MessageItem.tsx` - Flat message display with avatar, sender name, content, timestamp
- `web/app/(dashboard)/messages/components/MessageInput.tsx` - Auto-growing textarea with Enter-to-send and Send button
- `web/app/(dashboard)/messages/components/ConversationList.tsx` - Added optional selectedId prop for thread sidebar highlighting

## Decisions Made
- **10-second message polling:** Active message threads poll more frequently (10s) than the conversation list (30s) since users actively reading/sending expect near-real-time updates.
- **Sender name resolution:** Bulk query medics table by user_id for all unique sender_ids in the thread. Non-medic senders labeled "Admin" (covers org_admin role). This is efficient for small-to-medium conversation sizes (200 message limit).
- **Flat layout over chat bubbles:** Per CONTEXT.md, messages use Slack/Teams-style flat left-aligned layout rather than chat bubbles. Own messages differentiated by avatar color and "(you)" label, not by position.
- **Textarea max 5000 chars:** Server-side validation prevents excessive message content. Client sends trimmed content.
- **Non-fatal metadata updates:** If conversation metadata or read status upsert fails after message insert, the message is still returned as 201 (message was sent successfully).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Message thread is fully functional, ready for 41-03 (new conversation creation)
- ConversationList passes selectedId for sidebar highlighting when inside a thread
- useMessages hook established for real-time replacement in Phase 43
- MessageInput pattern ready for potential file attachment extension in future phases
- API routes follow org-scoped pattern via requireOrgId() consistent with all other routes

---
*Phase: 41-web-messaging-core*
*Completed: 2026-02-19*
