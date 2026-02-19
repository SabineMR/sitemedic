# Features Research — v5.0 Internal Comms & Document Management

**Researched:** 2026-02-19
**Focus:** Expected features for internal messaging + document management in a staffing platform

---

## Table Stakes (Must Have)

### Messaging

| Feature | Complexity | Notes |
|---------|-----------|-------|
| **1:1 conversation threads** | Medium | Org admin ↔ medic. Flat thread (not nested replies). |
| **Message text input** | Low | Plain text messages. Rich text not needed. |
| **Conversation list** | Low | All conversations with last message preview + timestamp. |
| **Unread indicators** | Medium | Unread count badge. Bold for unread conversations. |
| **Message timestamps** | Low | Relative ("2 min ago") or absolute ("14:32"). |
| **Broadcast messages** | Medium | Admin → all medics. Not a group chat — medics can't reply to each other. |
| **Push notification on new message** | Medium | iOS push via Expo Notifications when app is backgrounded. |
| **Offline message viewing** | Medium | Cached messages viewable offline via WatermelonDB. |
| **Offline message sending** | Medium | Queued locally, sent on reconnect. |

### Document Management

| Feature | Complexity | Notes |
|---------|-----------|-------|
| **Document upload** | Medium | Medic uploads PDF/image from iOS or web. |
| **Document type categorisation** | Low | Insurance, DBS, Qualification, ID, Other. |
| **Profile document list** | Low | Admin views medic's documents on their profile. |
| **Document expiry date** | Low | Entered at upload. Displayed on document card. |
| **Expiry alerts** | Medium | Progressive alerts (30/14/7/1 days). Same as cert tracking. |
| **Document download** | Low | Admin or medic can download original file. |
| **Status indicators** | Low | Current (green), Expiring soon (amber), Expired (red). |

---

## Differentiators (Better Than WhatsApp/Email)

### Messaging

| Feature | Complexity | Why It Matters |
|---------|-----------|---------------|
| **Read receipts** | Low | Admin knows medic saw the message. Builds accountability. |
| **Delivery status** | Low | Sent → Delivered → Read. Critical with poor-signal medics. |
| **Broadcast read tracking** | Medium | "12 of 15 medics read" — important for policy updates. |
| **Message search** | Medium | Search across all conversations. |
| **Attachment in messages** | Medium | Send a document within a thread. |

### Document Management

| Feature | Complexity | Why It Matters |
|---------|-----------|---------------|
| **Version history** | Low | New upload archives old version. Audit trail. |
| **Bulk expiry view** | Low | Admin sees all documents expiring in next 30 days. |

### Cross-Feature

| Feature | Complexity | Why It Matters |
|---------|-----------|---------------|
| **Save/bookmark** | Low | Quick access to important messages or documents. |

---

## Anti-Features (Do NOT Build)

| Feature | Why Not |
|---------|---------|
| **Group chat between medics** | Scope creep. Admin ↔ medic comms only. |
| **Voice/video calling** | Phone calls exist. WebRTC is massive complexity. |
| **Message reactions (emoji)** | Professional comms, not social media. |
| **Message editing/deletion** | Compliance platform. Messages are permanent. |
| **Auto-disappearing messages** | Contradicts GDPR retention requirements. |
| **Typing indicators** | Not real-time chat. Asynchronous communication. |
| **File preview/thumbnails** | Over-engineering for v1. Download and view. |
| **Custom notification sounds** | Emergency alerts already have custom sounds. Messages use default. |

---

## Dependencies on Existing Features

| v5.0 Feature | Depends On |
|-------------|-----------|
| Document expiry alerts | Cert expiry checker pattern (v1.0) |
| Push notifications | Emergency alert push pipeline (v1.0) |
| Document storage | Supabase Storage buckets (v1.0+) |
| Offline messages | WatermelonDB sync (v1.0) |
| Email notifications | Resend + branded templates (v1.0+) |
| Medic profile docs | Worker/medic profiles (v1.0) |
| Org-scoped data | RLS with org_id (v1.0) |

---
*Research completed: 2026-02-19*
