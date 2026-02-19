---
phase: 41-web-messaging-core
plan: 01
subsystem: ui
tags: [messaging, conversations, unread-counts, tanstack-query, supabase, next.js, server-components]

# Dependency graph
requires:
  - phase: 40-comms-docs-foundation
    provides: "conversations, messages, conversation_read_status tables with RLS"
provides:
  - "fetchConversationsWithUnread server-side query with parallel bulk queries"
  - "fetchTotalUnreadCount for header badge"
  - "useConversations client hook with 30s polling"
  - "ConversationListItem TypeScript interface"
  - "/messages route with two-panel layout"
  - "ConversationList, ConversationRow, EmptyState components"
  - "Messages sidebar nav item in DashboardNav"
  - "Header message icon with unread count badge"
affects: [41-02-thread-view, 41-03-new-conversation, 43-realtime-messaging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parallel bulk queries for unread count computation (3 queries instead of N+1)"
    - "Server component page with client component list (SSR hydration + polling)"

key-files:
  created:
    - web/lib/queries/comms.ts
    - web/app/(dashboard)/messages/page.tsx
    - web/app/(dashboard)/messages/components/ConversationList.tsx
    - web/app/(dashboard)/messages/components/ConversationRow.tsx
    - web/app/(dashboard)/messages/components/EmptyState.tsx
  modified:
    - web/components/dashboard/DashboardNav.tsx
    - web/app/(dashboard)/layout.tsx

key-decisions:
  - "Unread counts computed in JavaScript from 3 parallel Supabase queries (conversations, read statuses, messages) to avoid N+1"
  - "30-second polling interval for conversations (more frequent than workers' 60s due to messaging time sensitivity)"
  - "Messages nav item positioned after Analytics in sidebar as cross-cutting concern"
  - "Header unread badge fetched server-side in layout (no client component needed until real-time in Phase 43)"

patterns-established:
  - "Comms query pattern: fetchConversationsWithUnread for server + useConversations hook for client"
  - "ConversationListItem interface as shared type between query and components"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 41 Plan 01: Conversation List & Navigation Summary

**Conversation list page with parallel-query unread counts, sidebar nav item, and header badge for the messaging section**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T23:24:33Z
- **Completed:** 2026-02-19T23:28:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created query layer with fetchConversationsWithUnread using 3 parallel bulk queries (conversations, read statuses, messages) to compute unread counts without N+1
- Built two-panel messaging layout: scrollable conversation list sidebar (320px) with search filter, and placeholder content area for thread view
- Added Messages navigation to sidebar and header icon with total unread count badge
- ConversationRow displays avatar initial, participant name (bold when unread), truncated preview, relative timestamp, unread badge (99+ cap), and role indicator

## Task Commits

Each task was committed atomically:

1. **Task 1: Create conversation query functions and navigation updates** - `fdd2b7e` (feat)
2. **Task 2: Create the messaging page with two-panel layout and conversation list** - `95e65fb` (feat)

## Files Created/Modified
- `web/lib/queries/comms.ts` - Server-side fetch + client-side useQuery hook for conversations with unread counts and participant names
- `web/app/(dashboard)/messages/page.tsx` - Server component with two-panel messaging layout
- `web/app/(dashboard)/messages/components/ConversationList.tsx` - Client component with search filter and 30s polling
- `web/app/(dashboard)/messages/components/ConversationRow.tsx` - Conversation row with avatar, name, preview, time, unread badge, role indicator
- `web/app/(dashboard)/messages/components/EmptyState.tsx` - Empty state with MessageSquare icon and disabled CTA
- `web/components/dashboard/DashboardNav.tsx` - Added Messages nav item with MessageSquare icon
- `web/app/(dashboard)/layout.tsx` - Added header message icon with total unread count badge

## Decisions Made
- **Parallel query approach:** 3 Supabase queries (conversations, read statuses, messages) run in parallel via Promise.all, with unread counts computed in JavaScript by grouping messages per conversation and filtering by sender_id and last_read_at. This avoids N+1 and keeps the query count constant regardless of conversation count.
- **Participant name resolution:** For org_admin users, medic names resolved via bulk medics table query. For medic users, participant shown as "Admin" (shared thread model).
- **Header badge as server-side:** totalUnread fetched in layout server component body, avoiding 'use client' on the layout. Real-time updates deferred to Phase 43.
- **30s polling:** More frequent than the 60s standard for workers since messaging is time-sensitive.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Conversation list and navigation are in place, ready for 41-02 (thread view)
- ConversationRow links to `/messages/{id}` which will be handled by 41-02
- EmptyState "Start a conversation" button is disabled, to be wired in 41-03
- useConversations hook established for real-time replacement in Phase 43

---
*Phase: 41-web-messaging-core*
*Completed: 2026-02-19*
