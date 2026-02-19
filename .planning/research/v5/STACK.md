# Stack Research — v5.0 Internal Comms & Document Management

**Researched:** 2026-02-19
**Focus:** What stack additions are needed for messaging + document management

---

## Verdict: No New Packages Required

Every capability needed for v5.0 is implementable with the existing stack. SiteMedic already has all the infrastructure pieces — they just need to be composed for messaging and document management.

---

## Existing Stack (Already Validated — DO NOT Change)

| Component | Version | Role in v5.0 |
|-----------|---------|-------------|
| Supabase Realtime | In stack | Real-time message delivery (web + iOS when online) |
| WatermelonDB v4 | In stack | Offline message queue + document metadata on iOS |
| Supabase Storage | In stack | Document file storage (new `medic-documents` bucket) |
| Supabase Edge Functions | In stack | Document expiry checker (reuse cert expiry pattern) |
| pg_cron + pg_net | In stack | Schedule daily document expiry checks |
| Expo Notifications | In stack | Push notifications for new messages |
| Resend | In stack | Email notifications for expiry alerts |
| TanStack Query | In stack | Web dashboard data fetching for messages/documents |

---

## Integration Points

### 1. Real-Time Messaging — Supabase Realtime

**Already used in:** `web/stores/useScheduleBoardStore.ts` — channel subscription with `postgres_changes` filter.

**v5.0 pattern:** Single Realtime channel per user (not per conversation — avoids channel explosion). Filter messages server-side via RLS.

**No additional packages needed.**

### 2. Offline Message Queue — WatermelonDB

**Already used in:** `src/database/` — 6 models (treatments, workers, near_misses, safety_checks, sync_queue, audit_log).

**v5.0 additions:** Two new WatermelonDB models: `conversations` and `messages`. Schema bump v4 → v5. Same pull/push sync cycle.

**No additional packages needed.**

### 3. Document Storage — Supabase Storage

**Already used in:** 11+ buckets (treatment-photos, compliance-documents, org-logos, etc.)

**v5.0 addition:** New `medic-documents` bucket (private, 10MB limit, PDF/JPEG/PNG/DOCX). Path: `{org_id}/{medic_id}/{document_type}/{filename}`.

**No additional packages needed.**

### 4. Push Notifications — Expo Notifications

**Already used in:** `services/EmergencyAlertService.ts` — full push pipeline with Expo Push API, token registration on `profiles` table.

**v5.0 additions:** New notification channel for messages (separate from emergency). Badge count for unread messages.

**No additional packages needed.**

### 5. Document Expiry Tracking — pg_cron + Edge Function

**Already used in:** `supabase/functions/certification-expiry-checker/` — daily cron, progressive alerts (30/14/7/1 days), idempotency table.

**v5.0 reuse:** Exact same pattern. New Edge Function `document-expiry-checker`, new cron job.

**No additional packages needed.**

---

## What NOT to Add

| Rejected Option | Why |
|----------------|-----|
| Socket.io / Pusher / Ably | Supabase Realtime already provides WebSocket channels. Separate service = split-brain. |
| Firebase Cloud Messaging | Expo Push API already abstracts push delivery. iOS-only app. |
| AWS S3 | Supabase Storage already configured with RLS. |
| Stream / SendBird chat SDK | Over-engineered for low-volume internal comms (~50 medics per org). |
| Redis message queues | PostgreSQL + Realtime handles this volume. |

---

## New Database Objects Required

| Object | Type | Purpose |
|--------|------|---------|
| `conversations` | Table | Conversation metadata (participants, org_id, type) |
| `conversation_participants` | Table | User-conversation links, last_read_at, bookmarks |
| `messages` | Table | Message content, sender, timestamps, attachments |
| `medic_documents` | Table | Document metadata: type, expiry, file_path |
| `document_expiry_reminders` | Table | Idempotency for expiry alerts |
| `bookmarks` | Table | Saved messages and documents per user |
| `medic-documents` | Storage bucket | Private bucket for uploaded documents |
| `document-expiry-checker` | Edge Function | Daily cron for expiry alerts |

---

**Confidence: HIGH** — All patterns verified against actual codebase.

---
*Research completed: 2026-02-19*
