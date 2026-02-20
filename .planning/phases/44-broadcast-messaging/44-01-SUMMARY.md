---
phase: 44-broadcast-messaging
plan: 01
status: complete
started: 2026-02-20
completed: 2026-02-20
duration: ~6 min
---

# Plan 44-01 Summary: Broadcast Send and Delivery

## What Was Built

Broadcast messaging pipeline enabling org admins to send broadcast messages to all medics in their organisation, with real-time delivery via existing Supabase Realtime and push notification infrastructure.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Migration + broadcast API route + type updates | `d1c71e7` | `supabase/migrations/151_broadcast_indexes.sql`, `web/app/api/messages/broadcast/route.ts`, `web/types/comms.types.ts`, `web/lib/queries/comms.ts` |
| 2 | Broadcast compose UI + conversation/thread adaptations | `9652ae2`, `b01c64e` | `web/app/(dashboard)/messages/components/BroadcastComposeDialog.tsx`, `ConversationRow.tsx`, `MessageThread.tsx`, `page.tsx`, `[conversationId]/page.tsx` |

## Deliverables

1. **Migration 151** (`supabase/migrations/151_broadcast_indexes.sql`):
   - Partial unique index `idx_conversations_org_broadcast` on `conversations(org_id) WHERE type = 'broadcast'` — prevents duplicate broadcast conversations per org
   - Composite index `idx_message_recipients_message_read` on `message_recipients(message_id, read_at)` — optimises read tracking queries

2. **POST /api/messages/broadcast** (`web/app/api/messages/broadcast/route.ts`):
   - Org admin only (403 for medics)
   - Get-or-create single broadcast conversation per org with 23505 race condition handling
   - Inserts message, bulk-inserts `message_recipients` rows for ALL medics in org
   - Updates conversation metadata (last_message_at, last_message_preview)
   - Upserts sender's read status so admin doesn't see unread badge for own broadcasts
   - Existing `on_message_insert_notify` trigger fires push notifications automatically

3. **BroadcastComposeDialog** (`web/app/(dashboard)/messages/components/BroadcastComposeDialog.tsx`):
   - Dialog with textarea compose form + AlertDialog confirmation ("Send to X medics?")
   - "Broadcast" button with Radio icon, only shown for org_admin role
   - On confirm: POST to broadcast API, navigate to broadcast conversation

4. **ConversationRow** adaptations:
   - Broadcast conversations show blue Radio icon avatar instead of initial circle
   - "Broadcast" badge next to participant name
   - Role indicator hidden for broadcast type

5. **MessageThread** adaptations:
   - `conversationType` and `userRole` props added
   - Broadcast mark-as-read uses dedicated `/api/messages/broadcast/read` endpoint for medics
   - MessageInput replaced with read-only notice for broadcast type (admin: "Use the Broadcast button", medic: "Broadcast messages are read-only")

6. **Page integrations**:
   - Both `messages/page.tsx` and `messages/[conversationId]/page.tsx` include BroadcastComposeDialog for org_admin
   - Medic count fetched in parallel for dialog display
   - Conversation type and user role passed to MessageThread

7. **Type updates** (`web/types/comms.types.ts`, `web/lib/queries/comms.ts`):
   - `BroadcastRecipientDetail` interface added for Plan 02 drilldown
   - `ConversationListItem.type` expanded to `'direct' | 'broadcast'`
   - `fetchConversationsWithUnread` includes broadcast conversations with `participant_name='Broadcasts'`

## Decisions Made

- Broadcast mark-as-read uses separate endpoint `/api/messages/broadcast/read` (not the direct message read endpoint) because it needs to update `message_recipients` rows
- MessageInput hidden for ALL users on broadcast conversations (not just medics) — admin should use Broadcast button for subsequent broadcasts since regular send API doesn't create recipient rows
- No filtering by `available_for_work` when fetching medics for broadcast recipients — all org medics receive broadcasts

## Issues Encountered

None.
