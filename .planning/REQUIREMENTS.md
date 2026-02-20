# Requirements: SiteMedic v5.0 Internal Comms & Document Management

**Defined:** 2026-02-19
**Core Value:** Org admins can communicate with their field medics and collect compliance documents inside SiteMedic — replacing scattered WhatsApp/email with an in-platform system tied to individual medic profiles.

## v5.0 Requirements

### Messaging

- [x] **MSG-01**: Org admin can start a 1:1 conversation with any medic in their org
- [x] **MSG-02**: Medic can start a 1:1 conversation with their org admin
- [x] **MSG-03**: Both parties can send and receive text messages in a conversation thread
- [x] **MSG-04**: Users see a conversation list with last message preview, timestamp, and unread count
- [x] **MSG-05**: Org admin can compose and send a broadcast message to all medics in the org
- [x] **MSG-06**: Broadcast messages appear in each medic's conversation list (medics cannot reply to each other)
- [x] **MSG-07**: Messages sent offline are queued locally and delivered when connectivity returns
- [x] **MSG-08**: Previously loaded messages are viewable offline
- [ ] **MSG-09**: Messages show delivery status: Sent → Delivered → Read
- [x] **MSG-10**: Org admin sees broadcast read tracking ("12 of 15 medics read")
- [ ] **MSG-11**: Users can search across all their conversations
- [ ] **MSG-12**: Users can attach a document/file to a message

### Notifications

- [x] **NOTIF-01**: Medic receives iOS push notification when a new message arrives (app backgrounded)
- [x] **NOTIF-02**: Push notification shows sender name only — never message content (GDPR)
- [x] **NOTIF-03**: Messages arrive in real-time when app/web is open (Supabase Realtime)

### Document Management

- [x] **DOC-01**: Medic can upload a compliance document (PDF, image) from iOS app or web
- [x] **DOC-02**: Documents are categorised by type: Insurance, DBS, Qualification, ID, Other
- [x] **DOC-03**: Medic enters an expiry date when uploading a document
- [x] **DOC-04**: Uploaded documents are stored on the medic's individual profile
- [x] **DOC-05**: Org admin can view all documents for any medic in their org on the medic's profile
- [x] **DOC-06**: Documents show status badges: Current (green), Expiring Soon (amber), Expired (red)
- [x] **DOC-07**: Progressive expiry alerts sent to medic and admin (30/14/7/1 days before expiry)
- [x] **DOC-08**: Medic or admin can download the original document file
- [x] **DOC-09**: When medic uploads a new version of a document type, the old version is archived (not deleted)
- [x] **DOC-10**: Org admin sees a bulk expiry view — all documents expiring in the next 30 days across all medics

### Cross-Platform

- [x] **PLAT-01**: Messaging works on both iOS app and web dashboard, synced
- [ ] **PLAT-02**: Document upload works on both iOS app and web dashboard
- [x] **PLAT-03**: All data is scoped to the organization (org_id RLS isolation)

## v5.1 Requirements (Deferred)

### Bookmarks & Preferences

- **BOOK-01**: Medic can bookmark/save messages for quick access
- **BOOK-02**: Medic can bookmark/save documents for quick access
- **PREF-01**: Medic can mute non-urgent conversations
- **PREF-02**: Medic can choose notification channels (push, email, both, none)

### Polish

- **PREV-01**: Document file preview/thumbnail generation (PDF first page, image thumbnail)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Group chat between medics | Scope creep — this is admin ↔ medic comms, not a team chat platform |
| Voice/video calling | Phone calls exist; WebRTC adds massive complexity for zero staffing value |
| Message editing/deletion | Compliance platform — messages are permanent for audit purposes |
| Auto-disappearing messages | Contradicts UK GDPR retention requirements |
| Typing indicators | Asynchronous comms, not real-time chat |
| Message reactions (emoji) | Professional staffing comms, not social media |
| Custom notification sounds | Emergency alerts have custom sounds; messages use default iOS sound |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MSG-01 | Phase 41 | Complete |
| MSG-02 | Phase 41 | Complete |
| MSG-03 | Phase 41 | Complete |
| MSG-04 | Phase 41 | Complete |
| MSG-05 | Phase 44 | Complete |
| MSG-06 | Phase 44 | Complete |
| MSG-07 | Phase 42 | Complete |
| MSG-08 | Phase 42 | Complete |
| MSG-09 | Phase 47 | Pending |
| MSG-10 | Phase 44 | Complete |
| MSG-11 | Phase 47 | Pending |
| MSG-12 | Phase 47 | Pending |
| NOTIF-01 | Phase 43 | Complete |
| NOTIF-02 | Phase 43 | Complete |
| NOTIF-03 | Phase 43 | Complete |
| DOC-01 | Phase 45 | Complete |
| DOC-02 | Phase 45 | Complete |
| DOC-03 | Phase 45 | Complete |
| DOC-04 | Phase 45 | Complete |
| DOC-05 | Phase 45 | Complete |
| DOC-06 | Phase 46 | Complete |
| DOC-07 | Phase 46 | Complete |
| DOC-08 | Phase 45 | Complete |
| DOC-09 | Phase 45 | Complete |
| DOC-10 | Phase 46 | Complete |
| PLAT-01 | Phase 42 | Complete |
| PLAT-02 | Phase 45 | Complete |
| PLAT-03 | Phase 40 | Complete |

**Coverage:**
- v5.0 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-20 after Phase 44 completion -- MSG-05, MSG-06, MSG-10 marked Complete*
