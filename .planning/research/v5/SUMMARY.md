# Research Summary — SiteMedic v5.0 Internal Comms & Document Management

**Project:** SiteMedic v5.0
**Domain:** Internal org messaging + medic document management
**Researched:** 2026-02-19
**Confidence:** HIGH

---

## Executive Summary

v5.0 adds internal organization communication and document management to SiteMedic's core platform. Org admins (employers) can message their field medics, send broadcast announcements, and collect compliance documents (insurance, DBS, qualifications) that are stored on individual medic profiles with expiry tracking. Everything works on both iOS app and web dashboard, with full offline support.

The entire feature set is buildable with **zero new packages**. Supabase Realtime handles message delivery, WatermelonDB handles offline queuing, Supabase Storage handles document files, and the existing pg_cron + Edge Function pattern handles expiry alerts. The architecture adds 6 new database tables, 1 new Storage bucket, 1 new Edge Function, and 2 new WatermelonDB models — all following proven patterns already in the codebase.

---

## Key Findings

### Stack: No New Packages

Every v5.0 capability maps to existing infrastructure:
- **Real-time messaging** → Supabase Realtime (already used in schedule board)
- **Offline messages** → WatermelonDB (already used for treatments, workers, etc.)
- **Document storage** → Supabase Storage (already used for 11+ buckets)
- **Push notifications** → Expo Notifications (already used for emergency alerts)
- **Expiry alerts** → pg_cron + Edge Function (already used for cert expiry)
- **Email notifications** → Resend (already used for all transactional emails)

### Features: Table Stakes + Key Differentiators

**Must have (table stakes):**
- 1:1 conversation threads (org admin ↔ medic)
- Broadcast messages (admin → all medics)
- Unread indicators and push notifications
- Document upload with type categorisation
- Expiry date tracking with progressive alerts
- Offline viewing and sending

**Differentiators (better than WhatsApp/email):**
- Read receipts and delivery status
- Broadcast read tracking ("12 of 15 medics read")
- Document version history (upload new, archive old)
- Bulk expiry view across all medics
- Save/bookmark messages and documents

**Anti-features (do NOT build):**
- Group chat between medics (scope creep)
- Voice/video calling (massive complexity, phone calls exist)
- Message editing/deletion (compliance requirement: messages are permanent)
- Typing indicators (asynchronous comms, not real-time chat)

### Architecture: 8-Phase Build Order

1. Database schema + Storage bucket
2. Messaging web (conversations, messages, send/receive)
3. Messaging iOS (WatermelonDB models, offline queue)
4. Real-time + Push notifications
5. Broadcast messaging
6. Document upload + profile storage
7. Expiry tracking + alerts
8. Bookmarks + polish

**Critical architecture decision:** Single Realtime channel per user (not per conversation). Avoids WebSocket channel explosion when admin has 50+ conversations.

### Pitfalls: 3 Critical, 4 High, 4 Medium

**Critical (must prevent):**
1. Messages lost during offline → online sync (WatermelonDB push whitelist)
2. Realtime channel explosion (single channel per user)
3. RLS leak across organizations (org_id in all policies)

**High (must address):**
4. Document upload fails on poor connection (queue locally, retry)
5. Duplicate expiry alerts (cert tracker vs doc tracker — separate clearly)
6. Broadcast notification flooding (batch API, rate limit)
7. Unread count drift on offline devices (calculate, never store)

---

## Implications for Roadmap

- **Phases 1-3 are sequential:** schema before code, web before iOS (establishes API patterns)
- **Phases 2-3 could parallelise** if web and iOS teams work independently
- **Phase 6 (documents) is independent** of messaging — could parallelise with phases 2-5
- **Phase 7 (expiry) depends on 6** — needs document metadata to check
- **Phase 8 is polish** — depends on everything

Estimated: 8 phases, ~20-24 plans total based on complexity analysis.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (no new packages) | HIGH | Every integration point verified against codebase |
| Supabase Realtime for messaging | HIGH | Already used in schedule board; same pattern |
| WatermelonDB offline messages | HIGH | 6 existing models prove the pattern works |
| Document storage (Supabase) | HIGH | 11+ buckets with folder-scoped RLS already exist |
| Push notifications | HIGH | Full pipeline exists for emergency alerts |
| Expiry tracking | HIGH | Cert expiry checker is the exact same pattern |
| Single-channel Realtime strategy | HIGH | Prevents channel explosion at the architecture level |

**Overall: HIGH** — This is a well-understood feature set being added to a mature, proven architecture.

---
*Research completed: 2026-02-19*
*Ready for requirements definition*
