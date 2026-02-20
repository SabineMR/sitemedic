# Phase 42: iOS Messaging & Offline — Research

**Researched:** 2026-02-19
**Phase Goal:** Messaging works on the iOS app with the same functionality as web, messages sync between platforms, and medics can view cached messages and queue outbound messages when offline

## 1. Existing iOS App Architecture

### Navigation Structure (Expo Router)
- Root layout: `app/_layout.tsx` wraps with DatabaseProvider → AuthProvider → OrgProvider → SyncProvider
- Tab bar: `app/(tabs)/_layout.tsx` — role-based visibility (medics: Treatments/Workers/Safety; admins: Events/Team)
- 5-tab bottom bar (80px height for gloved operation), sidebar nav on iPad
- Modals: treatment/[id], worker/[id], safety/near-miss, safety/daily-check

### WatermelonDB — Already Configured
- **Package:** `@nozbe/watermelondb@0.28.0` with expo plugin
- **Init:** `src/lib/watermelon.ts` → `initDatabase()` creates SQLite adapter
- **Schema version:** 4 (at `src/database/schema.ts`, migrations at `src/database/migrations.ts`)
- **Existing models (6):** treatments, workers, near_misses, safety_checks, sync_queue, audit_log
- **JSI disabled** (disableJsi: true in app.json plugin config)

### Sync Infrastructure — Fully Built
| Service | File | Purpose |
|---------|------|---------|
| SyncQueue | `src/services/SyncQueue.ts` | Persistent queue in WatermelonDB, exponential backoff, idempotency keys, LWW conflict resolution |
| NetworkMonitor | `src/services/NetworkMonitor.ts` | Real-time connectivity via @react-native-community/netinfo, triggers sync on reconnect |
| SyncScheduler | `src/utils/syncScheduler.ts` | 30s foreground / 15min background intervals |
| SyncContext | `src/contexts/SyncContext.tsx` | React context: status, pending counts, manual trigger, enqueue helper |
| BackgroundSyncTask | `tasks/backgroundSyncTask.ts` | Battery-aware (skip <15%), registered in _layout.tsx |
| PhotoUploadQueue | `src/services/PhotoUploadQueue.ts` | WiFi-only image uploads |
| AuditLogger | `src/services/AuditLogger.ts` | GDPR audit logging of all data access |

### Key Sync Patterns
- **Idempotency:** All creates include client-generated UUID
- **Conflict resolution:** Last-write-wins (LWW)
- **Retry:** Exponential backoff (RIDDOR priority: 30s→30min cap; normal: 5min→4hr cap)
- **Queue persistence:** SyncQueueItem model in WatermelonDB (survives force-quit)
- **Connectivity triggers:** NetworkMonitor fires sync when device comes online

## 2. Web Messaging Implementation (Phase 41)

### Database Schema (Migration 143)
- **conversations:** id, org_id, type (direct/broadcast), subject, medic_id, created_by, last_message_at, last_message_preview
- **messages:** id, conversation_id, org_id, sender_id, message_type (text/attachment/system), content, metadata, status (sent/delivered/read), deleted_at
- **conversation_read_status:** user_id + conversation_id (composite PK), org_id, last_read_at
- **message_recipients:** For broadcast read tracking (Phase 44)
- **RLS:** Org-scoped access, user-scoped read_status, soft-delete filtering

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/messages/conversations` | POST | Create or return existing direct conversation |
| `/api/messages/send` | POST | Send text message (content ≤5000 chars) |
| `/api/messages/conversations/[id]/read` | PATCH | Mark conversation as read (upsert last_read_at) |

### Web Components
| Component | Key Details |
|-----------|------------|
| ConversationList | Client component, useConversations hook (30s polling), search filter |
| ConversationRow | Avatar, name, preview, timestamp, unread badge (99+ cap), role indicator |
| MessageThread | useMessages hook (10s polling), auto-scroll, marks read on mount |
| MessageItem | Flat Slack-style layout (not bubbles), sender initial avatar, timestamp |
| MessageInput | Auto-growing textarea, Enter-to-send / Shift+Enter for newline, Send button |
| MedicPicker | Medic: "Message Admin" button; Admin: dialog with medic roster + search |
| EmptyState | Client component with embedded MedicPicker |

### Unread Count Mechanism
- `fetchConversationsWithUnread()` — 3 parallel Supabase queries (conversations + read statuses + messages)
- Count: messages where sender_id ≠ current_user AND created_at > last_read_at
- Header badge: `fetchTotalUnreadCount()` server-side in layout
- Updates: on send (upsert own read_status) and on thread mount (PATCH read endpoint)

### Send Flow
1. POST `/api/messages/send` → validate → INSERT message
2. UPDATE conversation.last_message_at + last_message_preview
3. UPSERT sender's read_status
4. Client invalidates React Query caches → refetch → auto-scroll

### Types
- `web/types/comms.types.ts` — Conversation, Message, MessageWithSender, ConversationWithUnread, etc.
- `web/lib/queries/comms.ts` — Server query functions + React Query hooks

## 3. What Phase 42 Must Build

### Plan 42-01: WatermelonDB Models and Sync
**New models needed:**
- `Conversation` model — mirrors conversations table (server_id, org_id, type, medic_id, last_message_at, last_message_preview, participant_name)
- `Message` model — mirrors messages table (server_id, conversation_id, org_id, sender_id, content, message_type, status, sender_name)

**Schema migration:** v4 → v5 (add two new tables)

**Sync approach — Leverage existing SyncQueue:**
- **Pull sync:** Fetch conversations + messages from Supabase REST API, upsert into WatermelonDB
- **Push sync:** New messages enqueued via existing SyncQueue (already has idempotency, retry, backoff)
- **Conflict resolution:** LWW already built — works for message metadata updates
- **Initial sync:** On first messaging tab open, pull all conversations + recent messages (e.g., last 100 per conversation)
- **Incremental sync:** Pull only messages newer than last_synced_at

**Key decisions:**
- Reuse existing SyncQueue for outbound messages (don't build separate queue)
- Pull sync uses Supabase REST (not Realtime — that's Phase 43)
- Cache window: last 100 messages per conversation (older loadable on demand)

### Plan 42-02: iOS Conversation List and Thread UI
**New screens:**
- `app/(tabs)/messages.tsx` — New tab in bottom bar (Messages tab for both medic and admin roles)
- `app/messages/[conversationId].tsx` — Message thread (modal/push screen)

**Components to build (React Native equivalents of web):**
- ConversationList — FlatList of conversations with unread badges, pull-to-refresh
- ConversationRow — Avatar, name, preview, timestamp, unread badge
- MessageThread — FlatList (inverted), auto-scroll, mark-as-read on open
- MessageItem — Flat Slack-style layout matching web
- MessageInput — TextInput, Return-to-send (submitBehavior), Send button
- MedicPicker — Medic: "Message Admin" button; Admin: modal with medic list
- EmptyState — "No conversations" with action button

**Navigation:**
- Add Messages tab to tab bar (role: both medic and admin)
- Tab bar badge for unread count
- Conversation list → thread via stack push

**Data source:** Read from WatermelonDB (observe queries for reactivity), not direct Supabase calls

### Plan 42-03: Offline Queue and Delivery
**Leverages existing infrastructure:**
- SyncQueue already handles: persistent storage, retry with backoff, idempotency keys, connectivity-triggered sync
- NetworkMonitor already detects online/offline transitions

**What's new:**
- **Outbound message queueing:** When sending offline, create Message in WatermelonDB with status='queued', enqueue in SyncQueue
- **Optimistic UI:** Queued messages appear immediately in thread (greyed out + clock icon per CONTEXT.md)
- **Delivery confirmation:** On successful sync, update local message status from 'queued' → 'sent'
- **Deduplication:** Client-generated UUID as message ID (server rejects duplicates via unique constraint)
- **Pull sync on reconnect:** NetworkMonitor triggers pull sync to get messages received while offline
- **No new services needed** — extend existing SyncQueue with message-specific handlers

## 4. Technical Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Schema migration v4→v5 could fail | Test migration on fresh + existing databases; WatermelonDB migrations are well-tested |
| Large message volume could slow initial sync | Paginate pull sync; limit initial load to recent conversations (last 30 days or last 50) |
| Offline→online sync ordering | Messages have created_at timestamps; server INSERT order doesn't matter for display |
| Duplicate messages on reconnect | Idempotency key (client-generated UUID) + server unique constraint |
| SyncQueue priority conflicts with existing data | Messages use normal priority (1); RIDDOR stays at priority 0 |

## 5. Files That Will Be Created/Modified

### New Files
- `src/database/models/Conversation.ts` — WatermelonDB model
- `src/database/models/Message.ts` — WatermelonDB model
- `src/services/MessageSync.ts` — Pull sync logic for conversations + messages
- `app/(tabs)/messages.tsx` — Messages tab screen
- `app/messages/[conversationId].tsx` — Message thread screen
- `src/components/messaging/ConversationList.tsx` — RN conversation list
- `src/components/messaging/ConversationRow.tsx` — RN conversation row
- `src/components/messaging/MessageThread.tsx` — RN message thread
- `src/components/messaging/MessageItem.tsx` — RN message item
- `src/components/messaging/MessageInput.tsx` — RN message input
- `src/components/messaging/MedicPicker.tsx` — RN new conversation picker
- `src/components/messaging/EmptyState.tsx` — RN empty state

### Modified Files
- `src/database/schema.ts` — Add conversations + messages tables (v5)
- `src/database/migrations.ts` — Migration from v4 to v5
- `src/lib/watermelon.ts` — Register new models
- `src/services/SyncQueue.ts` — Add message sync handlers
- `src/contexts/SyncContext.tsx` — Expose message sync status
- `app/(tabs)/_layout.tsx` — Add Messages tab (both roles)

## 6. Dependencies

- **Phase 41 (complete):** Web messaging API routes exist and are tested
- **No new npm packages needed** — WatermelonDB, NetInfo, Supabase client all already installed
- **No database changes** — Schema already exists from Phase 40 migration 143

---

## RESEARCH COMPLETE

*Research complete. Ready for planning.*
