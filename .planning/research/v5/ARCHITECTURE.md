# Architecture Research — v5.0 Internal Comms & Document Management

**Researched:** 2026-02-19
**Focus:** How messaging + document management integrates with existing SiteMedic

---

## Database Schema

### `conversations` Table
- id, org_id, type ('direct'|'broadcast'), subject, created_by, created_at, updated_at
- RLS: users see only conversations in their org where they're a participant

### `conversation_participants` Table
- id, conversation_id, user_id, last_read_at, is_bookmarked
- UNIQUE(conversation_id, user_id)
- Used for unread tracking and access control

### `messages` Table
- id, conversation_id, sender_id, content, attachment_path, attachment_name, attachment_type, created_at
- Index on (conversation_id, created_at DESC) for conversation listing
- RLS: via conversation_participants membership

### `medic_documents` Table
- id, org_id, medic_id, document_type ('insurance'|'dbs'|'qualification'|'id'|'other'), document_name, file_path, file_size, mime_type, expires_at, is_current, uploaded_at, notes
- Index on (medic_id, is_current, document_type) for profile listing
- Index on (expires_at) WHERE is_current=true for expiry checker
- When medic uploads new version: old marked is_current=false

### `document_expiry_reminders` Table
- Same pattern as existing `certification_reminders`
- document_id, medic_id, days_before, sent_at, resend_message_id, org_id
- Unique index on (document_id, days_before, sent_at::date) for idempotency

### `bookmarks` Table
- user_id, bookmark_type ('message'|'document'|'conversation'), target_id
- UNIQUE(user_id, bookmark_type, target_id)

---

## Storage

New `medic-documents` bucket (private, 10MB, PDF/JPEG/PNG/DOCX).
Path: `{org_id}/{medic_id}/{document_type}/{filename}`
RLS: medic uploads to own folder, admin views all org folders, platform admin sees all.
Same folder-scoped pattern as `compliance-documents` (migration 142).

---

## Real-Time Strategy

**Single channel per user** (NOT per conversation):
```
supabase.channel(`user:${userId}:messages`)
  .on('postgres_changes', { event: 'INSERT', table: 'messages' })
```
Client routes incoming messages to correct conversation in UI.
Avoids channel explosion (50 conversations = 50 channels = bad).

---

## Key Data Flows

### Send Message (Web Admin)
1. Admin sends → API inserts into `messages`
2. Supabase Realtime fires INSERT event
3. If medic online: message appears instantly via Realtime channel
4. If medic offline: push notification via Expo Push API → message synced via WatermelonDB on reconnect

### Send Message Offline (iOS Medic)
1. Medic sends → saved to WatermelonDB with `is_synced: false`
2. UI shows "sending..." indicator
3. On reconnect: push cycle inserts to Supabase → Realtime fires → admin receives
4. WatermelonDB marks `is_synced: true`

### Broadcast
1. Admin composes → API creates broadcast conversation + adds all org medics as participants
2. Message inserted → Realtime fires → push notifications batched (Expo batch API, up to 100/request)
3. Each medic sees broadcast in conversation list
4. Admin sees read tracking ("12 of 15 read")

### Document Upload (iOS)
1. Medic selects file + category + expiry date
2. If online: upload to Storage → insert metadata row → old version marked is_current=false
3. If offline: queued locally → uploaded on reconnect
4. Admin sees new document on medic profile

### Document Expiry Alert
1. pg_cron daily 9 AM → Edge Function `document-expiry-checker`
2. Query docs expiring in 30/14/7/1 days
3. Check idempotency table → send Resend email (branded) → log reminder
4. At ≤14 days: also notify org admin

---

## WatermelonDB Changes

Schema v4 → v5. Two new tables: `conversations`, `messages`.
New models follow existing decorator pattern (Worker, Treatment models).
Safe migration: `createTable` steps only (no existing table modifications).

---

## Web Dashboard Pages

| Route | Role | Purpose |
|-------|------|---------|
| `/admin/messages` | org_admin | Conversation list + compose |
| `/admin/messages/[id]` | org_admin | Thread view |
| `/admin/messages/broadcast` | org_admin | Broadcast compose |
| `/admin/documents` | org_admin | All org documents + expiry overview |
| `/admin/medics/[id]#documents` | org_admin | Medic profile documents tab |
| `/dashboard/messages` | medic | Conversation list |
| `/dashboard/messages/[id]` | medic | Thread view |
| `/dashboard/documents` | medic | Own documents + upload |

---

## Build Order

1. **Database schema + Storage** — tables, RLS, bucket, TypeScript types
2. **Messaging web** — conversations, messages, send/receive on web
3. **Messaging iOS** — WatermelonDB models, conversation UI, offline queue
4. **Real-time + Push** — Realtime channels, Expo push notifications
5. **Broadcast** — admin broadcast compose, fan-out to org medics
6. **Document upload + storage** — upload UI (web + iOS), Storage, profile display
7. **Expiry tracking** — pg_cron + Edge Function, email alerts, status badges
8. **Bookmarks + polish** — save/bookmark, search, read receipts

---
*Research completed: 2026-02-19*
