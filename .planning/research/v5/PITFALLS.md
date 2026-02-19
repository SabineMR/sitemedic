# Pitfalls Research — v5.0 Internal Comms & Document Management

**Researched:** 2026-02-19
**Focus:** Common mistakes when adding messaging + document management to SiteMedic

---

## Critical (Will Break the Feature)

### 1. Messages Lost During Offline → Online Transition
Medic sends message offline → WatermelonDB stores locally → on reconnect, sync push must insert to Supabase. If `messages` model not in sync whitelist, messages silently disappear.

**Prevention:** Add `messages` to sync adapter push whitelist. `is_synced` flag — only `true` after confirmed server insert. Test: send offline → reconnect → verify in Supabase within 30s.

### 2. Realtime Channel Explosion
One channel per conversation × 50 conversations = 50 WebSocket subscriptions per admin. Supabase limit: ~100 channels/connection. Mobile thrashes connections on poor signal.

**Prevention:** Single channel per user, not per conversation. Route messages to correct conversation in UI layer.

### 3. RLS Leak — Messages Across Orgs
If RLS on `messages` only checks `conversation_participants` without org_id verification, a bug could expose messages across organizations.

**Prevention:** RLS on `conversations` includes `org_id` check. All API routes include org_id in WHERE. Integration test: two orgs, verify isolation.

---

## High (Significant Issues)

### 4. Document Upload Fails on Poor Connection
5MB PDF upload on 2G → connection drops at 60% → upload fails silently. Medic thinks it's uploaded.

**Prevention:** Queue locally first, upload in background. Only insert metadata row AFTER Storage upload succeeds. Retry with exponential backoff. 10MB file limit.

### 5. Duplicate Expiry Alerts (Certs vs Docs)
Existing cert tracking sends expiry emails. New doc tracking sends separate expiry emails. Medic gets two emails about the same insurance.

**Prevention:** Clearly separate: certifications = admin-managed industry certs (CSCS, CPCS). Documents = medic-uploaded files (insurance PDF, DBS scan). Different email templates, different subject lines.

### 6. Broadcast Notification Flooding
Admin broadcasts to 50 medics → 50 push notifications + 50 emails simultaneously → rate limits on Expo Push API and Resend.

**Prevention:** Batch push via Expo batch endpoint (up to 100/request). Skip email for broadcasts (push sufficient). Rate limit: max 1 broadcast per 5 minutes.

### 7. Unread Count Drift Offline
Phone offline 8 hours → 5 new messages → on reconnect, local unread count stale.

**Prevention:** Calculate unread count (never store): `COUNT(messages WHERE created_at > last_read_at)`. Recalculate on every sync. Never increment/decrement a counter.

---

## Medium (Manageable)

### 8. GDPR — Message Content in Push Notifications
Push notification displays message text → visible on locked screen → could contain patient info.

**Prevention:** Push shows "New message from [Name]" only. Never include message content. Full text only inside authenticated app.

### 9. Unbounded Document Storage
No cleanup → archived versions accumulate. Not urgent at launch scale.

**Prevention:** Monitor. Consider auto-delete old versions after 90 days in v5.1. 10MB limit per file.

### 10. WatermelonDB Migration Failure
Schema v4 → v5 bump. If interrupted, WatermelonDB may reset local database.

**Prevention:** Only `createTable` steps (no existing table modifications). Test on device with v4 data. Sync repopulates on first pull.

### 11. No Conversation Undo
Admin starts wrong conversation → messages are permanent (compliance).

**Prevention:** Confirm medic name before opening. Empty conversations (0 messages) can be deleted.

---

## Summary

| # | Pitfall | Severity |
|---|---------|----------|
| 1 | Messages lost offline → online | CRITICAL |
| 2 | Realtime channel explosion | CRITICAL |
| 3 | RLS leak across orgs | CRITICAL |
| 4 | Document upload fails poor connection | HIGH |
| 5 | Duplicate expiry alerts | HIGH |
| 6 | Broadcast notification flooding | HIGH |
| 7 | Unread count drift | HIGH |
| 8 | GDPR message content in push | MEDIUM |
| 9 | Unbounded storage | MEDIUM |
| 10 | WatermelonDB migration failure | MEDIUM |
| 11 | No conversation undo | MEDIUM |

---
*Research completed: 2026-02-19*
