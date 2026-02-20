---
status: passed
score: 3/3
verified_at: 2026-02-20
---

# Phase 47: Message Polish — Verification Report

## Phase Goal
Messages show delivery and read status indicators, users can search across all their conversations, and users can attach documents or files to messages -- completing the messaging feature set.

## Must-Have Verification

### 1. Delivery Status Indicators ✓
**Requirement:** Each message shows delivery status indicator: single tick (Sent), double tick (Delivered), blue double tick (Read) — updating in real-time.

**Evidence:**
- `MessageStatusIndicator.tsx` renders Check (sent), CheckCheck (delivered), blue CheckCheck (read) using Lucide icons
- `MessageItem.tsx` shows ticks only for sender's own messages (`isOwnMessage && <MessageStatusIndicator>`)
- `PATCH /api/messages/[messageId]/status` enforces forward-only state machine (sent→delivered→read)
- `comms.hooks.ts` has Realtime UPDATE subscription on messages table — invalidates queries when status changes
- Auto-delivered logic fires on Realtime INSERT for other user's messages
- `conversations/[id]/read/route.ts` advances all other-sender messages to 'read' on thread open
- Migration 157 sets REPLICA IDENTITY FULL for Realtime UPDATE payloads

### 2. Cross-Conversation Search ✓
**Requirement:** Users can search across all conversations by keyword, results show matching message, conversation, and sender — clicking navigates to message in context.

**Evidence:**
- `GET /api/messages/search` uses `textSearch('fts', q, { type: 'websearch' })` on tsvector column
- Migration 157 creates `fts` tsvector GENERATED column with GIN index
- `ConversationSearch.tsx` overlay panel with debounced input (300ms) and results list
- `SearchResultItem.tsx` shows conversation name, message snippet, sender name, timestamp
- Results are Links to `/messages/${conversation_id}` — clicking navigates to conversation
- `useMessageSearch` hook with `enabled: query.length >= 2` prevents short-query API calls
- Results enriched server-side with sender names and conversation names via bulk lookup

### 3. File Attachments ✓
**Requirement:** Users can attach a file to a message — stored in message-attachments bucket, appears inline with download link, downloadable by recipient.

**Evidence:**
- `POST /api/messages/attachments/upload` accepts FormData, stores in `message-attachments` bucket
- `GET /api/messages/attachments/download` generates 1-hour signed URL with org-scoped access control
- `AttachmentPicker.tsx` renders Paperclip button with file validation (10MB, PDF/JPEG/PNG/Word)
- `MessageAttachment.tsx` shows image thumbnails or file icon cards with Download button
- `MessageInput.tsx` integrates AttachmentPicker, shows pending file preview, supports dual send mode
- `MessageItem.tsx` renders `MessageAttachment` for `message_type === 'attachment'` messages
- Optional text caption supported alongside attachment
- Storage path: `{orgId}/{conversationId}/{timestamp}-{uuid8}-{sanitizedFileName}`

## Summary

| Must-Have | Status | Method |
|-----------|--------|--------|
| Delivery status indicators | ✓ Passed | Code inspection: component, API, Realtime, migration |
| Cross-conversation search | ✓ Passed | Code inspection: API, FTS, UI components, hooks |
| File attachments | ✓ Passed | Code inspection: upload/download APIs, UI components |

**Result: PASSED (3/3 must-haves verified)**
