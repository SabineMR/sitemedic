---
phase: 44-broadcast-messaging
plan: 02
status: complete
started: 2026-02-20
completed: 2026-02-20
duration: ~5 min
---

# Plan 44-02 Summary: Broadcast Read Tracking

## What Was Built

Broadcast read tracking system giving org admins visibility into broadcast reach: medic mark-as-read endpoint, admin recipient detail endpoint, inline "Read by X of Y" display, and per-medic drilldown sheet.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Broadcast read and recipients API routes | `b353060` | `web/app/api/messages/broadcast/read/route.ts`, `web/app/api/messages/broadcast/[messageId]/recipients/route.ts` |
| 2 | Read summary UI + thread integration | `3d4c11e` | `BroadcastReadSummary.tsx`, `BroadcastReadDrilldown.tsx`, `MessageItem.tsx`, `MessageThread.tsx`, `comms.hooks.ts` |

## Deliverables

1. **PATCH /api/messages/broadcast/read** (`web/app/api/messages/broadcast/read/route.ts`):
   - Accepts `{ conversationId }` body
   - Updates all unread `message_recipients` rows with `read_at` timestamp for current user
   - Upserts `conversation_read_status` for unread badge calculation
   - Non-fatal error handling: each update attempted independently

2. **GET /api/messages/broadcast/{messageId}/recipients** (`web/app/api/messages/broadcast/[messageId]/recipients/route.ts`):
   - Admin only (403 for non-admins)
   - Returns `{ messageId, totalRecipients, readCount, recipients }` with per-medic detail
   - Recipients include name, read_at, and read/unread status
   - Sorted: read medics first (by most recent read_at), then unread alphabetically

3. **useBroadcastReadSummaries hook** (`web/lib/queries/comms.hooks.ts`):
   - Batched query: fetches `message_recipients` for all visible message IDs in single query
   - Returns `Map<messageId, { totalRecipients, readCount }>`
   - 30s stale time for reasonable freshness without excessive queries

4. **BroadcastReadSummary** (`web/app/(dashboard)/messages/components/BroadcastReadSummary.tsx`):
   - Inline clickable element below broadcast messages: Eye icon + "Read by X of Y"
   - Returns null when totalRecipients is 0

5. **BroadcastReadDrilldown** (`web/app/(dashboard)/messages/components/BroadcastReadDrilldown.tsx`):
   - Sheet component with per-medic read/unread rows
   - Green "Read" badge with Check icon + relative timestamp, or muted "Unread" badge with Clock icon
   - Fetches recipients on sheet open via TanStack Query

6. **MessageItem** adaptations:
   - Optional `readSummary` and `onReadDrilldown` props
   - Conditionally renders BroadcastReadSummary below timestamp

7. **MessageThread** adaptations:
   - `useState` for drilldown message ID
   - `useBroadcastReadSummaries` hook enabled for admin viewing broadcasts
   - Passes read summary data and drilldown handler to each MessageItem
   - Renders BroadcastReadDrilldown sheet when drilldown is open

## Decisions Made

- Batched read summary query (single Supabase query for all message_recipients) avoids N+1
- 30-second stale time balances freshness with query volume
- Recipients sorted read-first for admin convenience (most recently read at top)
- Non-fatal error handling in mark-as-read: both message_recipients and conversation_read_status attempted independently

## Issues Encountered

None.
