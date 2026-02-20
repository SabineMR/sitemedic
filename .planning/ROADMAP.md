# SiteMedic Roadmap

## Milestones

- ✅ **v1.0 MVP** — Phases 01–07.5 (13 phases, 84 plans — shipped 2026-02-16)
- ✅ **v1.1 Post-MVP Polish & Data Completeness** — Phases 08–17 (10 phases, 35 plans — shipped 2026-02-17)
- ✅ **v2.0 Multi-Vertical Platform Expansion** — Phases 18–23 (7 phases, 30 plans — shipped 2026-02-18)
- ✅ **v3.0 White-Label Platform & Subscription Engine** — Phases 24–31 (8 phases, 30 plans — shipped 2026-02-19)
- **v4.0 MedBid Marketplace** — Phases 32–39 (8 phases, TBD plans — in progress)
- **v5.0 Internal Comms & Document Management** — Phases 40–47 (8 phases, TBD plans — planned)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 01–07.5) — SHIPPED 2026-02-16</summary>

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Post-MVP Polish & Data Completeness (Phases 08–17) — SHIPPED 2026-02-17</summary>

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Multi-Vertical Platform Expansion (Phases 18–23) — SHIPPED 2026-02-18</summary>

See: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 White-Label Platform & Subscription Engine (Phases 24–31) — SHIPPED 2026-02-19</summary>

See: `.planning/milestones/v3.0-ROADMAP.md`

</details>

### v4.0 MedBid Marketplace

**Milestone Goal:** Add an RFQ marketplace to SiteMedic where UK clients post events needing medical cover, verified marketplace companies submit detailed quotes (companies only — no individual medic bidding), clients award the job with a deposit payment, and SiteMedic takes commission from the company's side. Awarded quotes auto-create bookings that flow into existing timesheets, payouts, and compliance reporting. Free to sign up, free to quote at launch.

- [x] **Phase 32: Foundation Schema & Registration** - Database tables, RLS policies, race-condition prevention, and CQC-registered company/client registration with verification
- [x] **Phase 33: Event Posting & Discovery** - Clients create event listings, medics browse and filter by location/qualifications
- [ ] **Phase 34: Quote Submission & Comparison** - Companies submit priced quotes with breakdowns, clients compare anonymised company profiles (companies only)
- [ ] **Phase 34.1: Self-Procured Jobs** (INSERTED) - Companies with SiteMedic subscriptions create and manage jobs they sourced themselves, with zero commission, full wizard entry, Stripe payment flow, and complete feature parity with marketplace jobs
- [ ] **Phase 35: Award Flow & Payment** - Client awards quote, deposit collected, booking auto-created, remainder charged after event, commission split, payouts
- [ ] **Phase 36: Ratings, Messaging & Disputes** - Bidirectional ratings, per-quote messaging, cancellation policy, dispute resolution
- [ ] **Phase 37: Company Accounts** - Company roster management, medic assignment to events, company profile display
- [ ] **Phase 38: Notifications & Alerts** - Multi-channel notification system (dashboard feed, email, SMS) with medic preferences
- [ ] **Phase 39: Admin Dashboard** - Platform admin marketplace metrics, event/quote/dispute management, configuration

### v5.0 Internal Comms & Document Management

**Milestone Goal:** Org admins can communicate with their field medics and collect compliance documents inside SiteMedic -- replacing scattered WhatsApp/email with an in-platform system tied to individual medic profiles. Messaging works across iOS app and web dashboard with offline support, real-time delivery, and push notifications. Document management handles upload, categorisation, expiry tracking, and progressive alerts.

- [x] **Phase 40: Comms & Docs Foundation** - Database schema for conversations, messages, and documents; Supabase Storage buckets; org-scoped RLS policies
- [x] **Phase 41: Web Messaging Core** - 1:1 conversations between org admin and medics on the web dashboard with conversation list and message threads
- [ ] **Phase 42: iOS Messaging & Offline** - WatermelonDB models for messages, offline send queue, cross-platform sync between iOS app and web
- [ ] **Phase 43: Real-time & Push Notifications** - Supabase Realtime for live message delivery, iOS push notifications with GDPR-safe content
- [ ] **Phase 44: Broadcast Messaging** - Org admin can send broadcast messages to all medics with per-medic read tracking
- [ ] **Phase 45: Document Upload & Profile Storage** - Medics upload categorised compliance documents from iOS or web, stored on their profile with versioning
- [ ] **Phase 46: Expiry Tracking & Alerts** - Status badges, progressive expiry alerts, and bulk expiry dashboard for org admins
- [ ] **Phase 47: Message Polish** - Delivery/read status indicators, cross-conversation search, and file attachments in messages

## Phase Details

### Phase 32: Foundation Schema & Registration
**Goal**: CQC-registered medical companies and clients can register on the marketplace, companies can upload compliance documents for verification, and platform admin can approve/reject registrations — all on a database foundation with marketplace-scoped RLS and race-condition prevention
**Depends on**: Phase 31 (v3.0 complete)
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, REG-07, REG-08
**Success Criteria** (what must be TRUE):
  1. A CQC-registered company can register via a multi-step wizard (company details, CQC verification, document upload, Stripe Connect) — and browse events immediately but cannot quote until admin-verified
  2. An existing SiteMedic org can register on the marketplace and link to their existing account (shared login, company info carries over) — bidirectional crossover via org_id
  3. Platform admin sees a verification queue with uploaded compliance documents and can approve, reject, or request more information — approved companies display a "verified" badge on their marketplace profile
  4. When a company's required compliance documents (insurance, DBS) expire or their CQC registration status changes, the company is automatically suspended from quoting and receives an email notification
  5. Approved companies are guided through Stripe Connect Express onboarding (business_type='company') so they can receive payouts
**Plans**: 4 plans

Plans:
- [x] 32-01-PLAN.md — Marketplace database schema (marketplace_companies, compliance_documents, medic_commitments tables, RLS policies, EXCLUSION constraints, storage bucket, TypeScript types, CQC client)
- [x] 32-02-PLAN.md — Company registration wizard and client signup (4-step wizard, Zustand store, CQC verification API, document upload, registration API, lightweight client marketplace registration)
- [x] 32-03-PLAN.md — Admin verification queue and compliance monitoring (admin queue UI, approve/reject/request-info, CQC daily check Edge Function, document expiry auto-suspension)
- [x] 32-04-PLAN.md — Stripe Connect onboarding for marketplace companies (company Express account, onboarding link, callback page)

### Phase 33: Event Posting & Discovery
**Goal**: Clients can post events needing medical cover with full details, and verified medics can browse, search, and filter events that match their qualifications and location
**Depends on**: Phase 32
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07, EVNT-08
**Success Criteria** (what must be TRUE):
  1. A client can create an event listing with name, type, description, dates/times, location, attendance, staffing requirements, and optional budget range
  2. A client can edit open event details before quotes arrive (and only description/special requirements after quotes exist), and can close/cancel at any time with notifications sent to medics who quoted
  3. Events have a quote deadline after which no new quotes can be submitted
  4. Events are visible only to verified medics whose qualifications match the staffing requirements
  5. Medics can search and filter events by type, date, location radius, and qualification level
**Plans**: 3 plans

Plans:
- [x] 33-01-PLAN.md — Event database schema, TypeScript types, Zod schemas, and CRUD API routes (migration 145: marketplace_events, event_days, event_staffing_requirements; PostGIS for radius queries; RLS; event types + schemas + API routes)
- [x] 33-02-PLAN.md — Event posting wizard and client management (Zustand store, 4-step wizard with Google Places + what3words + per-day staffing + equipment checklist, My Events dashboard, edit page with pre/post-quote restrictions)
- [x] 33-03-PLAN.md — Event discovery for medics (browse page with list/map toggle, dual search modes for company owners vs individual medics, filters by type/date/location/qualification, event detail page with approximate location)

### Phase 34: Quote Submission & Comparison
**Goal**: Verified marketplace companies can submit detailed quotes on open events, and clients can compare quotes with anonymised company profiles — no contact details visible until award and deposit (companies only — individual medics cannot bid independently)
**Depends on**: Phase 33
**Requirements**: QUOT-01, QUOT-02, QUOT-03, QUOT-04, QUOT-05, QUOT-06, QUOT-07, QUOT-08
**Success Criteria** (what must be TRUE):
  1. A verified company can submit a quote with total price, itemised breakdown (staff/equipment/transport/consumables + custom line items), cover letter, staffing plan, and availability confirmation
  2. A company can edit a submitted quote in place (client sees "revised" badge) or withdraw it at any time before the event is awarded
  3. Client sees all received quotes in a ranked list sorted by best value (price + rating), with sort and filter options — but no contact details (phone, email, full names hidden until award + deposit)
  4. Client can view full company profile (certifications, star rating, experience, past events, insurance/compliance, written reviews) only after that company has submitted a quote
  5. Minimum rate enforcement: quote form displays guideline rates per qualification level and blocks quotes below the minimum
**Plans**: 3 plans

Plans:
- [ ] 34-01-PLAN.md — Database schema, types, validation, API routes, Zustand store, and quote submission form (migration 146: marketplace_quotes table with RLS; quote types + Zod schemas + minimum rates; submit/save-draft/list/detail API routes; Zustand form store; multi-section submission form with pricing breakdown, staffing plan, cover letter, draft auto-save)
- [ ] 34-02-PLAN.md — Quote browsing and comparison (best-value scoring algorithm, anonymisation utility, ranked quote list with sort/filter, expandable detail rows, company profile page with access control)
- [ ] 34-03-PLAN.md — Quote management (edit-in-place with revised badge, withdraw with confirmation, company My Quotes dashboard, deadline extension for event poster)

### Phase 34.1: Self-Procured Jobs (INSERTED)
**Goal**: Companies with a SiteMedic subscription can create and manage jobs they sourced themselves (outside the marketplace) alongside marketplace-awarded jobs — with full wizard entry, zero platform commission (subscription covers it), Stripe payment flow (deposit + remainder), and complete feature parity with marketplace jobs (timesheets, compliance reporting, payouts, ratings)
**Depends on**: Phase 34 (quote/booking patterns established), Phase 37 (company roster for medic assignment)
**Success Criteria** (what must be TRUE):
  1. A company with an active SiteMedic subscription can create a self-procured job via a full wizard in the main SiteMedic dashboard (not the marketplace section) — with client details, event type, multi-day dates/times, location, staffing requirements, and agreed price
  2. Self-procured jobs create bookings with `source='direct'` that flow into the same timesheet, payout, and compliance reporting pipeline as marketplace bookings — with 0% platform commission (100% to company)
  3. The client pays through SiteMedic's Stripe checkout (deposit + remainder) and the company receives payouts via the existing Friday Stripe Connect pipeline
  4. The SiteMedic platform dashboard shows both marketplace and self-procured jobs in a filterable view with source badges ("Marketplace" / "Direct"), while the marketplace dashboard shows only marketplace-sourced jobs
  5. The client gets portal access to view job status, compliance reports, and payments — at admin level only (no access to individual medic details)
  6. Full client records are created and stored (name, contact, address) as formal records in the system
  7. Company can assign medics from their roster to self-procured jobs with the same availability checking as marketplace
  8. Bidirectional ratings supported for self-procured jobs — client and company can rate each other
**Plans**: 5 plans

Plans:
- [ ] 34.1-01-PLAN.md — Database migration (direct_clients table, marketplace_events source/agreed_price/client_id columns, direct job statuses), TypeScript types, Zod schemas, CRUD API routes
- [ ] 34.1-02-PLAN.md — Job creation wizard (Zustand store, 6-step wizard UI, client details step with new/existing client, job info, schedule, staffing, pricing, review/submit), jobs list page with "Log Job" entry point
- [ ] 34.1-03-PLAN.md — Dashboard integration (combined jobs view with source badges and filter, SourceBadge/SourceFilter components, combined API endpoint, marketplace events API excludes direct jobs)
- [ ] 34.1-04-PLAN.md — Payment flow (Stripe deposit PaymentIntent, booking bridge with source='direct' and 0% commission, medic assignment with EXCLUSION constraint availability checking, job detail page)
- [ ] 34.1-05-PLAN.md — Client portal access (client-safe API excluding medic details, read-only portal view, payment summary) and bidirectional ratings (job_ratings table, star rating + review form, ratings API)

### Phase 35: Award Flow & Payment
**Goal**: Clients can award their chosen quote, pay a deposit via Stripe, and the system auto-creates a SiteMedic booking — with the remainder auto-charged after event completion and the medic paid via the existing payout pipeline
**Depends on**: Phase 34
**Requirements**: AWRD-01, AWRD-02, AWRD-03, AWRD-04, AWRD-05, AWRD-06, AWRD-07, AWRD-08, AWRD-09
**Success Criteria** (what must be TRUE):
  1. Client can award an event to their chosen quote, triggering a deposit payment (configurable %, default 25%) via Stripe — with their payment method saved for future remainder charge
  2. On successful deposit, a booking record with source='marketplace' is auto-created in SiteMedic, linking to timesheets, payouts, and compliance reporting
  3. Winning medic receives email + dashboard notification with event details and client contact info; non-selected medics receive "not selected" notification
  4. After event completion, the remainder is auto-charged to the client's saved payment method — with retry logic and email + SMS notification if the charge fails
  5. SiteMedic commission is deducted from the medic's side using the existing platform_fee_percent/medic_payout_percent pattern, and the medic payout follows the existing friday-payout pipeline via Stripe Connect
**Plans**: TBD

Plans:
- [ ] 35-01: Award flow and deposit payment (select quote, Stripe PaymentIntent with SetupIntent, EXCLUSION constraint enforcement)
- [ ] 35-02: Booking bridge (marketplace-booking-creator Edge Function, source='marketplace' guards on existing triggers)
- [ ] 35-03: Remainder payment and commission (auto-charge after event, retry logic, marketplace payout calculation)
- [ ] 35-04: Award notifications (winner with contact reveal, rejection notifications, failed payment alerts)

### Phase 36: Ratings, Messaging & Disputes
**Goal**: Both parties can rate each other after events, communicate through platform messaging before and after award, and raise disputes with defined cancellation policies — building trust and safety into the marketplace
**Depends on**: Phase 35
**Requirements**: RATE-01, RATE-02, RATE-03, RATE-04, RATE-05, MSG-01, MSG-02, MSG-03, MSG-04, DISP-01, DISP-02, DISP-03, DISP-04
**Success Criteria** (what must be TRUE):
  1. After event completion, both client and medic can leave a star rating (1-5) and written review within a 14-day window — ratings are visible on profiles and influence quote sorting
  2. Platform admin can moderate reviews (remove inappropriate content, respond to disputes about reviews)
  3. Client can message medics who have quoted on their event, and medics can ask clarifying questions before quoting — all messages stored on-platform with email notifications (message content not in email)
  4. Either party can raise a dispute after an event (no-show, late cancel, quality issue) which triggers a hold on the remainder payment until platform admin resolves it
  5. Clear cancellation policy is enforced: client cancel >14 days = full deposit refund; 7-14 days = 50% deposit retained; <7 days = full deposit retained by medic
**Plans**: TBD

Plans:
- [ ] 36-01: Bidirectional ratings (star rating + review, 14-day window, profile display, sort influence)
- [ ] 36-02: Platform messaging (per-quote conversations, pre/post-award, email notifications, contact gating)
- [ ] 36-03: Disputes and cancellations (dispute workflow, remainder hold, admin resolution, tiered cancellation policy)

### Phase 37: Company Accounts
**Goal**: Medic companies can manage a roster of individual medics, assign specific medics to events when quoting, and display rich company profiles — individual medics cannot bid independently on the marketplace (companies only)
**Depends on**: Phase 32 (registration foundation), Phase 34 (quoting works for companies)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. A company admin can add individual medics to their roster — each with their own profile, certifications, and ratings
  2. Company admin can assign specific medic(s) from their roster to events when quoting (named staff option from Phase 34)
  3. Company profiles display company name, roster size, average rating, total events completed, and insurance status
  4. Company admin can manage medic availability and qualifications within the roster
  5. Roster changes are reflected in the company's quoting capabilities (e.g. removing a paramedic from roster means fewer paramedic-qualified staff available for quotes)
**Plans**: TBD

Plans:
- [ ] 37-01: Company roster management (add/remove medics, individual profiles within company)
- [ ] 37-02: Medic assignment and company profile (assign roster medics to events, company profile display)
- [ ] 37-03: Roster availability management (medic availability tracking, qualification-based capacity)

### Phase 38: Notifications & Alerts
**Goal**: Medics receive timely notifications about matching events through their preferred channels, and all marketplace actions (quotes, awards, payments, ratings, messages) generate appropriate alerts
**Depends on**: Phase 35 (award flow exists for payment notifications), Phase 36 (ratings/messages exist for those notification types)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05
**Success Criteria** (what must be TRUE):
  1. When a new event is posted, matching medics see it in their dashboard feed filtered by location and qualifications
  2. Matching medics receive email alerts with event summary (no client contact details) when new events are posted
  3. Urgent or high-value events (<7 days away or >2,000 GBP budget) trigger SMS alerts to qualified nearby medics
  4. All marketplace actions (quote received, award, rejection, payment, rating, message) generate appropriate notifications through the medic's preferred channels
  5. Medics can configure notification preferences: which channels (dashboard/email/SMS), which event types, and location radius
**Plans**: TBD

Plans:
- [ ] 38-01: Event matching and dashboard feed (qualification + location filtering, real-time updates)
- [ ] 38-02: Email and SMS alerts (event notifications, urgent/high-value SMS triggers, marketplace action notifications)
- [ ] 38-03: Notification preferences (channel selection, event type filters, location radius configuration)

### Phase 39: Admin Dashboard
**Goal**: Platform admin can monitor marketplace health, manage all marketplace entities, configure settings, and moderate users — completing the operational toolkit
**Depends on**: Phase 38 (all marketplace features exist to administrate)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Platform admin dashboard shows marketplace metrics: total events posted, total quotes, conversion rate (quotes to awards), and total marketplace revenue
  2. Platform admin can view and manage all events, quotes, awards, and disputes from a single interface
  3. Platform admin can configure marketplace settings: default commission rate, deposit percentage, and quote deadline defaults
  4. Platform admin can suspend or ban marketplace users (medics or clients) who violate terms
**Plans**: TBD

Plans:
- [ ] 39-01: Marketplace metrics dashboard (events, quotes, conversion rate, revenue)
- [ ] 39-02: Entity management and moderation (events/quotes/awards/disputes admin views, user suspension/ban)
- [ ] 39-03: Marketplace configuration (commission rate, deposit %, deadline defaults)

### Phase 40: Comms & Docs Foundation
**Goal**: The database schema, storage buckets, RLS policies, and TypeScript types exist for the entire v5.0 messaging and document management system -- all scoped to org_id so no data leaks between organisations
**Depends on**: Phase 39 (v4.0 complete)
**Requirements**: PLAT-03
**Success Criteria** (what must be TRUE):
  1. Database tables exist for conversations, messages, message_recipients (for broadcast), documents, and document_versions -- with org_id on every table and appropriate indexes
  2. RLS policies enforce that users can only access conversations, messages, and documents belonging to their own organisation
  3. A Supabase Storage bucket exists for compliance documents with RLS policies scoped to org_id, and a separate bucket (or path) for message attachments
  4. TypeScript types are generated and available for all new tables in the web app and Edge Functions
**Plans**: 2 plans

Plans:
- [x] 40-01-PLAN.md — Database schema and RLS (migration 143: conversations, messages, message_recipients, conversation_read_status, document_categories, documents, document_versions; org_id RLS policies; indexes; triggers; default category seeding)
- [x] 40-02-PLAN.md — Storage buckets and TypeScript types (migration 144: medic-documents bucket, message-attachments bucket, storage RLS policies; web/types/comms.types.ts)

### Phase 41: Web Messaging Core
**Goal**: Org admins and medics can have 1:1 text conversations through the web dashboard -- with a conversation list showing unread counts and a message thread view for sending and reading messages
**Depends on**: Phase 40
**Requirements**: MSG-01, MSG-02, MSG-03, MSG-04
**Success Criteria** (what must be TRUE):
  1. An org admin can open the messaging section, see a list of medics in their org, and start a new 1:1 conversation with any medic
  2. A medic can open the messaging section and start a new 1:1 conversation with their org admin
  3. Both parties can send text messages in a conversation thread and see messages from the other party appear in the thread
  4. The conversation list shows every conversation with the other party's name, last message preview (truncated), timestamp of last message, and a badge showing unread message count
**Plans**: 3 plans

Plans:
- [x] 41-01-PLAN.md — Conversation list page (query functions, navigation, header unread badge, two-panel layout, conversation rows with unread counts)
- [x] 41-02-PLAN.md — Message thread view (dynamic route, message display, send API, mark-as-read, scroll-to-bottom, Enter-to-send input)
- [x] 41-03-PLAN.md — New conversation flow (create conversation API with duplicate prevention, admin medic picker dialog, medic "Message Admin" button)

### Phase 42: iOS Messaging & Offline
**Goal**: Messaging works on the iOS app with the same functionality as web, messages sync between platforms, and medics can view cached messages and queue outbound messages when offline
**Depends on**: Phase 41
**Requirements**: MSG-07, MSG-08, PLAT-01
**Success Criteria** (what must be TRUE):
  1. A medic can open the messaging section in the iOS app and see the same conversation list as on web (synced via Supabase)
  2. A medic can send and receive messages in the iOS app, and those messages appear on the web dashboard (and vice versa)
  3. When the device is offline, previously loaded conversations and messages are viewable from WatermelonDB local cache
  4. When the device is offline, a medic can compose and send a message -- the message is queued locally and automatically delivered when connectivity returns, with no duplicate messages
**Plans**: 3 plans

Plans:
- [ ] 42-01-PLAN.md — WatermelonDB models and sync (Conversation + Message models, schema v4 to v5 migration, MessageSync service with pull/push sync, SyncContext integration)
- [ ] 42-02-PLAN.md — iOS conversation list and thread UI (Messages tab in bottom bar, ConversationList with unread badges and pull-to-refresh, MessageThread with flat Slack-style layout, MessageInput with Return-to-send, MedicPicker for new conversations)
- [ ] 42-03-PLAN.md — Offline queue and delivery (connectivity-triggered push/pull sync, queued message styling with greyed out + clock indicator, idempotency_key deduplication, offline banners, failed message retry, human verification checkpoint)

### Phase 43: Real-time & Push Notifications
**Goal**: Messages arrive instantly when the app or web dashboard is open (no manual refresh), and medics receive iOS push notifications for new messages when the app is backgrounded -- with GDPR-safe notification content
**Depends on**: Phase 42
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03
**Success Criteria** (what must be TRUE):
  1. When user A sends a message, user B sees it appear in their open conversation thread within 1-2 seconds -- no page refresh or pull-to-refresh needed (Supabase Realtime)
  2. The conversation list updates in real-time: new messages update the last message preview, timestamp, and unread count without page refresh
  3. When the iOS app is backgrounded or closed, the medic receives a push notification for new messages -- the notification shows only the sender's name (e.g. "New message from Dr Smith"), never the message content (GDPR compliance)
  4. A single Supabase Realtime channel per user handles all their conversations (not one channel per conversation) to avoid connection exhaustion
**Plans**: 3 plans

Plans:
- [ ] 43-01: Supabase Realtime subscription (single channel per user filtering on org_id + user_id; message insert listener; conversation list live update; thread live update)
- [ ] 43-02: iOS push notification setup (Expo Notifications configuration; APNs certificate; device token registration; Edge Function to send push via Expo Push API)
- [ ] 43-03: Push notification Edge Function (trigger on message insert; resolve recipient device tokens; format GDPR-safe payload with sender name only; send via Expo Push API; handle token cleanup for uninstalled apps)

### Phase 44: Broadcast Messaging
**Goal**: Org admins can send broadcast messages to all medics in their organisation, broadcasts appear in each medic's conversation list as a distinct message type, and the admin can track how many medics have read each broadcast
**Depends on**: Phase 43 (real-time needed so broadcasts arrive instantly)
**Requirements**: MSG-05, MSG-06, MSG-10
**Success Criteria** (what must be TRUE):
  1. An org admin can compose and send a broadcast message that is delivered to every medic currently in their organisation
  2. Each medic sees broadcast messages in their conversation list as a distinct "Broadcast" conversation type -- medics cannot reply to broadcasts or see other medics' read status
  3. The org admin sees a read tracking summary on each broadcast message showing "X of Y medics read" with a drilldown list of who has and has not read it
  4. Broadcast messages trigger the same real-time delivery and push notifications as 1:1 messages
**Plans**: 2 plans

Plans:
- [ ] 44-01: Broadcast send and delivery (admin compose UI; create message + message_recipients rows for each medic; broadcast conversation type; medic conversation list display with "Broadcast" label)
- [ ] 44-02: Broadcast read tracking (mark-as-read on open per recipient; admin read summary UI with "X of Y read" count; drilldown list of read/unread medics)

### Phase 45: Document Upload & Profile Storage
**Goal**: Medics can upload categorised compliance documents (PDF, image) with expiry dates from either the iOS app or web dashboard, documents are stored on the medic's profile visible to their org admin, and uploading a new version of a document type archives the previous version
**Depends on**: Phase 40 (schema and storage buckets)
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-08, DOC-09, PLAT-02
**Success Criteria** (what must be TRUE):
  1. A medic can upload a compliance document (PDF or image) from the web dashboard, selecting a category (Insurance, DBS, Qualification, ID, Other) and entering an expiry date
  2. A medic can upload a compliance document from the iOS app with the same category selection and expiry date entry
  3. Uploaded documents appear on the medic's profile page -- the org admin can view all documents for any medic in their org from the medic's profile
  4. Either the medic or their org admin can download the original uploaded document file
  5. When a medic uploads a new version of a document in the same category, the previous version is automatically archived (not deleted) and the new version becomes the current active document
**Plans**: 3 plans

Plans:
- [ ] 45-01: Web document upload (upload form with category picker, expiry date input, file dropzone; Supabase Storage upload; document record creation; versioning logic that archives previous version)
- [ ] 45-02: iOS document upload (React Native document picker / camera capture; same category + expiry flow; Supabase Storage upload from iOS; same versioning logic)
- [ ] 45-03: Document profile views (medic profile documents tab; org admin medic profile view with all documents; download original file; version history display)

### Phase 46: Expiry Tracking & Alerts
**Goal**: Documents show colour-coded status badges based on expiry proximity, medics and admins receive progressive email alerts as documents approach expiry, and org admins have a bulk view of all documents expiring across their organisation in the next 30 days
**Depends on**: Phase 45
**Requirements**: DOC-06, DOC-07, DOC-10
**Success Criteria** (what must be TRUE):
  1. Every document displays a status badge: green "Current" (more than 30 days until expiry), amber "Expiring Soon" (30 days or fewer), or red "Expired" (past expiry date)
  2. Progressive email alerts are sent to both the medic and their org admin at 30, 14, 7, and 1 day(s) before a document expires -- each alert clearly states which document, which medic, and the expiry date
  3. The org admin can access a bulk expiry dashboard showing all documents expiring in the next 30 days across all medics in their org, sortable by expiry date and filterable by document category
**Plans**: 2 plans

Plans:
- [ ] 46-01: Status badges and expiry alerts (computed status badge on document display; pg_cron Edge Function that runs daily checking expiry dates; sends progressive email alerts at 30/14/7/1 day thresholds; tracks which alerts have been sent to avoid duplicates)
- [ ] 46-02: Bulk expiry dashboard (org admin page listing all documents expiring within 30 days; columns: medic name, document type, expiry date, status badge, days remaining; sort by expiry date; filter by category)

### Phase 47: Message Polish
**Goal**: Messages show delivery and read status indicators, users can search across all their conversations, and users can attach documents or files to messages -- completing the messaging feature set
**Depends on**: Phase 44 (broadcast complete), Phase 45 (document storage for attachments)
**Requirements**: MSG-09, MSG-11, MSG-12
**Success Criteria** (what must be TRUE):
  1. Each message in a conversation thread shows a delivery status indicator: single tick for "Sent", double tick for "Delivered", and blue double tick for "Read" -- updating in real-time
  2. Users can search across all their conversations by keyword, with results showing the matching message, the conversation it belongs to, and the sender -- tapping a result navigates to that message in context
  3. Users can attach a file (document, image, PDF) to a message -- the attachment is stored in the message-attachments bucket, appears inline in the conversation thread with a download link, and the file is downloadable by the recipient

**Plans**: 3 plans

Plans:
- [ ] 47-01: Delivery and read status (message status column: sent/delivered/read; update to "delivered" when recipient's client receives via Realtime; update to "read" when thread is opened; real-time status indicator in thread UI)
- [ ] 47-02: Conversation search (search input on conversation list page; full-text search across messages scoped to user's conversations; result list with message preview, conversation name, sender, timestamp; navigate to message in thread)
- [ ] 47-03: Message file attachments (attach button in message compose; file picker/dropzone; upload to message-attachments bucket; attachment metadata on message record; inline attachment display in thread with download link)

---

## Progress

**Execution Order:** 01 → 01.5 → 02 → 03 → 04 → 04.5 → 04.6 → 05 → 05.5 → 06 → 06.5 → 07 → 07.5 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 18.5 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 34.1 → 35 → 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43 → 44 → 45 → 46 → 47

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01–07.5 (13 phases) | v1.0 | 84/84 | Complete | 2026-02-16 |
| 08–17 (10 phases) | v1.1 | 35/35 | Complete | 2026-02-17 |
| 18. Vertical Infrastructure & RIDDOR Fix | v2.0 | 5/5 | Complete | 2026-02-18 |
| 18.5. Construction & Infrastructure Vertical | v2.0 | 2/2 | Complete | 2026-02-18 |
| 19. Motorsport Vertical | v2.0 | 5/5 | Complete | 2026-02-18 |
| 20. Festivals & Events Vertical | v2.0 | 4/4 | Complete | 2026-02-17 |
| 21. Film/TV Production Vertical | v2.0 | 2/2 | Complete | 2026-02-17 |
| 22. Football / Sports Vertical | v2.0 | 5/5 | Complete | 2026-02-18 |
| 23. Analytics — Heat Maps & Trend Charts | v2.0 | 7/7 | Complete | 2026-02-18 |
| 24. DB Foundation | v3.0 | 5/5 | Complete | 2026-02-18 |
| 25. Billing Infrastructure | v3.0 | 3/3 | Complete | 2026-02-18 |
| 26. Subdomain Routing | v3.0 | 4/4 | Complete | 2026-02-18 |
| 27. Branding — Web Portal | v3.0 | 3/3 | Complete | 2026-02-18 |
| 28. Branding — PDFs & Emails | v3.0 | 3/3 | Complete | 2026-02-18 |
| 29. Org Onboarding Flow | v3.0 | 5/5 | Complete | 2026-02-18 |
| 30. Subscription Management & Feature Gating | v3.0 | 5/5 | Complete | 2026-02-20 |
| 31. Branding Settings UI | v3.0 | 2/2 | Complete | 2026-02-19 |
| 32. Foundation Schema & Registration | v4.0 | 4/4 | Complete | 2026-02-19 |
| 33. Event Posting & Discovery | v4.0 | 3/3 | Complete | 2026-02-19 |
| 34. Quote Submission & Comparison | v4.0 | 0/3 | Planned | - |
| 34.1. Self-Procured Jobs (INSERTED) | v4.0 | 0/5 | Planned | - |
| 35. Award Flow & Payment | v4.0 | 0/4 | Not started | - |
| 36. Ratings, Messaging & Disputes | v4.0 | 0/3 | Not started | - |
| 37. Company Accounts | v4.0 | 0/3 | Not started | - |
| 38. Notifications & Alerts | v4.0 | 0/3 | Not started | - |
| 39. Admin Dashboard | v4.0 | 0/3 | Not started | - |
| 40. Comms & Docs Foundation | v5.0 | 2/2 | Complete | 2026-02-19 |
| 41. Web Messaging Core | v5.0 | 3/3 | Complete | 2026-02-19 |
| 42. iOS Messaging & Offline | v5.0 | 0/3 | Planned | - |
| 43. Real-time & Push Notifications | v5.0 | 0/3 | Not started | - |
| 44. Broadcast Messaging | v5.0 | 0/2 | Not started | - |
| 45. Document Upload & Profile Storage | v5.0 | 0/3 | Not started | - |
| 46. Expiry Tracking & Alerts | v5.0 | 0/2 | Not started | - |
| 47. Message Polish | v5.0 | 0/3 | Not started | - |
