# SiteMedic Features

**Project**: SiteMedic - UK Multi-Vertical Medic Staffing Platform with Bundled Software + Service
**Business**: Apex Safety Group (ASG) - HCPC-registered paramedic company serving 10+ industries, powered by SiteMedic platform
**Last Updated**: 2026-02-20 (Phase 34.1 Self-Procured Jobs -- payment, booking bridge, medic assignment, job detail)
**Audience**: Web developers, technical reviewers, product team

---

## Planned — v5.0 Internal Comms & Document Management (2026-02-19)

### Overview

An internal organization communication and document management system for core SiteMedic. Org admins (employers) can message their field medics, send broadcast announcements to all medics, and collect compliance documents (insurance, DBS, qualifications) that are stored on individual medic profiles with expiry tracking. Everything works on both iOS app and web dashboard with full offline support. This replaces scattered WhatsApp/email communication with an in-platform system.

### Key Features (8 phases planned — Phases 40–47)

| Feature | Description | Phase |
|---------|-------------|-------|
| **1:1 Messaging** | Two-way conversation threads between org admin and individual medics. Send/receive text messages. | 41 |
| **Broadcast Messaging** | Org admin sends announcements to all medics. Per-medic read tracking ("12 of 15 read"). | 44 |
| **Offline Messaging** | Messages cached in WatermelonDB. Outbound queue for offline sends. Auto-delivery on reconnect. | 42 |
| **Real-time Delivery** | Supabase Realtime — messages appear within 1-2 seconds. Single channel per user (no explosion). | 43 |
| **Push Notifications** | iOS push via Expo Notifications. GDPR-safe: sender name only, never message content. | 43 |
| **Document Upload** | Medics upload compliance docs (PDF, image) with category and expiry date. iOS app + web. | 45 |
| **Profile Document Log** | Documents stored on medic's profile. Admin views all docs. Version history (archive, not delete). | 45 |
| **Expiry Tracking** | Green/amber/red status badges. Progressive alerts at 30/14/7/1 days. Bulk expiry dashboard. | 46 |
| **Delivery & Read Status** | Single tick (Sent), double tick (Delivered), blue double tick (Read). Real-time updates. | 47 |
| **Message Search** | Full-text search across all conversations with navigable results. | 47 |
| **Message Attachments** | Attach files to messages. Inline display + download link. | 47 |

### Architecture Notes

- **No new packages**: Built entirely with existing Supabase Realtime, WatermelonDB, Storage, Expo Notifications, pg_cron
- **Org-scoped RLS**: All tables use org_id isolation (unlike marketplace which uses user_id)
- **Single Realtime channel per user**: Prevents WebSocket channel explosion (critical pitfall avoided)
- **Offline-first**: WatermelonDB models for conversations + messages with dedup via client-generated UUID
- **Expiry pattern**: Reuses existing cert expiry pg_cron + Edge Function pattern
- **New tables (Phase 40 - foundation created)**: `conversations`, `messages`, `message_recipients`, `conversation_read_status`, `document_categories`, `documents`, `document_versions`
- **Denormalized org_id**: Child tables (messages, message_recipients, document_versions) have denormalized org_id to avoid JOIN-based RLS performance issues
- **Default document categories**: Insurance, DBS, Qualification, ID, Other -- auto-seeded per org with trigger for new orgs
- **Storage buckets (Phase 40-02)**: `medic-documents` and `message-attachments` (both private, 10MB, PDF/JPEG/PNG/DOC/DOCX)
- **Storage RLS**: Org-scoped via `(storage.foldername(name))[1] = (SELECT get_user_org_id())::text` with platform admin bypass
- **TypeScript types**: `web/types/comms.types.ts` with interfaces for all 7 tables, 4 enum union types, 4 convenience types

### Database Migration Status

| Migration | Content | Status |
|-----------|---------|--------|
| `143_comms_docs_schema.sql` | 7 tables, 35 RLS policies, 18 indexes, 5 triggers, category seeding | Created (not yet applied to production) |
| `144_comms_docs_storage.sql` | 2 storage buckets, 10 storage RLS policies (org-scoped + platform admin) | Created (not yet applied to production) |

### TypeScript Types

| File | Content |
|------|---------|
| `web/types/comms.types.ts` | 7 table interfaces (Conversation, Message, MessageRecipient, ConversationReadStatus, DocumentCategory, Document, DocumentVersion), 4 union types (ConversationType, MessageType, MessageStatus, DocumentStatus), 4 convenience types (ConversationWithUnread, MessageWithSender, DocumentWithVersion, BroadcastReadSummary) |

### Phase 41: Web Messaging Core (COMPLETE)

Org admins and medics can have 1:1 text conversations through the web dashboard with conversation list, message threads, and new conversation creation.

| Feature | Implementation | Files |
|---------|---------------|-------|
| **Conversation List** | Two-panel layout with scrollable sidebar (~320px). Conversations sorted by most recent message. Search filter on participant name. 30-second polling via useQuery. | `web/app/(dashboard)/messages/page.tsx`, `web/app/(dashboard)/messages/components/ConversationList.tsx` |
| **Conversation Row** | Avatar initial, participant name (bold when unread), truncated last message preview, relative timestamp (Today=time, Yesterday, day name, date), unread count badge (caps at 99+), role indicator (Medic/Admin). | `web/app/(dashboard)/messages/components/ConversationRow.tsx` |
| **Unread Count Computation** | 3 parallel bulk Supabase queries (conversations, read statuses, messages) computed in JavaScript. Avoids N+1. Counts messages created after user's `last_read_at` where `sender_id != current user`. | `web/lib/queries/comms.ts` — `fetchConversationsWithUnread()` |
| **Header Unread Badge** | MessageSquare icon in dashboard header with total unread count badge. Server-side fetched (no client component needed). Navigates to /messages. | `web/app/(dashboard)/layout.tsx` |
| **Sidebar Navigation** | "Messages" item with MessageSquare icon added after Analytics. | `web/components/dashboard/DashboardNav.tsx` |
| **Message Thread** | Flat Slack-style message display (not chat bubbles). Sender avatar/initials, name, content, relative timestamp. Own messages labeled "(you)". Scroll-to-bottom on load. 10-second polling. | `web/app/(dashboard)/messages/[conversationId]/page.tsx`, `web/app/(dashboard)/messages/components/MessageThread.tsx`, `MessageItem.tsx` |
| **Send Message** | Textarea with Enter-to-send, Shift+Enter for newline. Auto-grows up to ~5 lines. Send button. POST `/api/messages/send` validates (max 5000 chars), inserts message, updates conversation metadata, upserts sender read status. | `web/app/(dashboard)/messages/components/MessageInput.tsx`, `web/app/api/messages/send/route.ts` |
| **Mark as Read** | PATCH `/api/messages/conversations/{id}/read` fires on thread open. Upserts `conversation_read_status` with current timestamp. Invalidates conversations query to update unread badges. | `web/app/api/messages/conversations/[id]/read/route.ts` |
| **New Conversation (Admin)** | "+" button opens MedicPicker dialog. Shows all org medics with search filter. Existing conversations marked with "Existing" indicator. Creates new or navigates to existing. | `web/app/(dashboard)/messages/components/MedicPicker.tsx` |
| **New Conversation (Medic)** | "Message Admin" button. Auto-resolves medic's own record from auth. Creates/finds conversation and redirects. | `web/app/(dashboard)/messages/components/MedicPicker.tsx` |
| **Duplicate Prevention** | POST `/api/messages/conversations` uses SELECT-then-INSERT with 23505 unique constraint catch. Enforced by partial unique index `idx_conversations_org_medic_direct`. | `web/app/api/messages/conversations/route.ts` |
| **Empty State** | MessageSquare icon, "No conversations yet" text, working "Start a conversation" CTA (opens MedicPicker for admin, triggers Message Admin for medic). | `web/app/(dashboard)/messages/components/EmptyState.tsx` |

**Requirements completed:** MSG-01, MSG-02, MSG-03, MSG-04

### Phase 42: iOS Messaging & Offline — Plans 01-02 (COMPLETE)

WatermelonDB local data layer and full iOS messaging UI for the React Native app, matching web dashboard messaging features in a mobile-native interface.

**Plan 01 — WatermelonDB Models and Message Sync:**

| Feature | Implementation | Files |
|---------|---------------|-------|
| **Conversation Model** | WatermelonDB model with server_id, org_id, type, medic_id, last_message_at, participant_name, unread_count, last_read_at. Schema version bumped v4 to v5. | `src/database/models/Conversation.ts`, `src/database/schema.ts`, `src/database/migrations.ts` |
| **Message Model** | WatermelonDB model with server_id, conversation_id, sender_id, sender_name, content, status (queued/sent/delivered/read), idempotency_key. | `src/database/models/Message.ts` |
| **MessageSync Pull** | Incremental sync from Supabase using AsyncStorage lastSyncedAt. First sync fetches all conversations + last 100 messages per conversation. Resolves participant/sender names, computes unread counts. | `src/services/MessageSync.ts` |
| **MessageSync Push** | Sends locally-queued messages (status='queued') to Supabase. Updates conversation metadata and read status. 23505 duplicate handling. | `src/services/MessageSync.ts` |
| **SyncContext Integration** | messageSyncStatus and triggerMessageSync exposed for UI pull-to-refresh. Push queued messages then pull new data in combined sync flow. | `src/contexts/SyncContext.tsx` |

**Plan 02 — iOS Conversation List and Thread UI:**

| Feature | Implementation | Files |
|---------|---------------|-------|
| **Messages Tab** | New tab in bottom bar (between Safety and Events) visible to all roles. Speech bubble emoji icon. Unread badge from WatermelonDB observe query (99+ cap). | `app/(tabs)/_layout.tsx`, `app/(tabs)/messages.tsx` |
| **Conversation List** | FlatList with reactive WatermelonDB observe query sorted by last_message_at descending. Pull-to-refresh triggers messageSync. Local search filter by participant name. | `src/components/messaging/ConversationList.tsx` |
| **Conversation Row** | Avatar circle with initial (color derived from name hash), participant name (bold if unread), truncated preview, relative timestamp, unread badge pill (red, 99+ cap). 72px minimum height for gloves-on. | `src/components/messaging/ConversationRow.tsx` |
| **Message Thread** | Inverted FlatList of messages from WatermelonDB filtered by conversation_id. KeyboardAvoidingView wrapper. Pull-to-refresh. Auto-scroll via inverted list. | `src/components/messaging/MessageThread.tsx`, `app/messages/[conversationId].tsx` |
| **Message Item** | Flat Slack-style layout (not chat bubbles). Avatar, sender name with "(you)" suffix, content, relative timestamp. Queued messages at 0.5 opacity with "Sending..." indicator. | `src/components/messaging/MessageItem.tsx` |
| **Message Input** | TextInput with Return-to-send, visible Send button (appears when text entered). Creates local WatermelonDB record (status=queued), updates conversation metadata, triggers push sync. UUID idempotency key. | `src/components/messaging/MessageInput.tsx` |
| **Mark as Read** | On thread open: local WatermelonDB update (last_read_at, unread_count=0) + Supabase upsert to conversation_read_status using conversation server_id. | `app/messages/[conversationId].tsx` |
| **MedicPicker** | Modal component. Medic flow: "Message Admin" button (looks up own medic record, creates/finds conversation). Admin flow: FlatList of org medics with search filter. SELECT-then-INSERT with 23505 duplicate handling. | `src/components/messaging/MedicPicker.tsx` |
| **Empty State** | Centered view with message icon, "No conversations yet", contextual action button (medic: Message Admin, admin: Start a conversation). | `src/components/messaging/EmptyState.tsx` |

**Key decisions:**
- MessageSync is self-contained (does NOT modify existing clinical data SyncQueue)
- Local messages use 'queued' status for offline (server schema only has sent/delivered/read)
- Participant names denormalized on local models (medics see "Admin", admins see medic name)
- Avatar colors consistent between ConversationRow and MessageItem (same hash function)

### Planning Files

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Updated with v5.0 milestone context |
| `.planning/REQUIREMENTS.md` | 28 requirements across 4 categories |
| `.planning/ROADMAP.md` | 8 phases (40–47), 21 plans |
| `.planning/research/v5/` | Stack, features, architecture, pitfalls research |

---

## Planned — v4.0 MedBid Marketplace (2026-02-19)

### Overview

A Request-for-Quotes (RFQ) marketplace being added to SiteMedic where UK clients post events needing medical cover, verified CQC-registered medical companies submit detailed quotes, and clients award jobs with SiteMedic taking commission from the company's side. Awarded quotes auto-create bookings that flow into the existing dashboard, timesheets, and payout systems. **Note:** Marketplace is companies-only (no individual freelance medics). Individual medic roster management is handled in Phase 37.

### Key Features (8 phases planned — Phases 32–39)

| Feature | Description | Phase |
|---------|-------------|-------|
| **Event Posting** | Clients post events with type, dates, location, staffing needs, budget range. Quote deadline enforced. | 33 |
| **Quote Submission** | Medics submit quotes with total price, itemised breakdown, cover letter/pitch, staffing plan, availability. | 34 |
| **Profile Gating** | Medic profiles (certs, rating, experience) visible only after they quote. Contact details hidden until award + deposit. | 34 |
| **Award & Deposit** | Client awards quote, deposit charged (default 25%), booking auto-created in SiteMedic with `source='marketplace'`. | 35 |
| **Remainder Payment** | Auto-charged after event via saved payment method. Retry logic + notifications on failure. | 35 |
| **Commission** | SiteMedic takes % from medic side (existing platform_fee/medic_payout pattern). Client pays quoted price. | 35 |
| **Company Registration** | CQC-registered medical companies register via 4-step wizard (company details, CQC verification, document upload, Stripe Connect). Admin verification queue gates quoting. Lightweight client registration for event posting. | 32 |
| **Company Accounts** | Companies manage medic rosters. Company quotes lock out individual quotes from same medic (double-up prevention). | 37 |
| **Bidirectional Ratings** | Client rates medic + medic rates client (1–5 stars + review). 14-day window. Admin moderation. | 36 |
| **Platform Messaging** | On-platform messaging between clients and medics. Contact details gated behind payment. | 36 |
| **Dispute Resolution** | Either party raises disputes. Remainder held until admin resolves. Tiered cancellation policy. | 36 |
| **Notifications** | Dashboard feed + email + SMS (urgent/high-value). Medic configures preferences. | 38 |
| **Admin Dashboard** | Marketplace metrics, entity management, commission/deposit config, user moderation. | 39 |

### Architecture Notes

- **Cross-org RLS**: Marketplace tables use `user_id`-based RLS (not `org_id`) since marketplace is platform-scoped
- **Booking bridge**: Awarded quotes auto-create bookings via Edge Function, linking to existing timesheets → payouts pipeline
- **Payment model**: Two Stripe PaymentIntents (deposit at award + remainder after event), not authorize-then-capture
- **New tables**: `marketplace_companies`, `compliance_documents`, `medic_commitments` (Phase 32), `marketplace_events`, `marketplace_quotes`, `marketplace_awards`, `marketplace_ratings`, `marketplace_messages` (later phases)
- **Credits/points system**: Deferred to v4.1 — free to quote at launch to build marketplace liquidity

### Implementation Progress (Phase 32 -- Foundation Schema & Registration) ✅ VERIFIED

**Plan 01 -- Database Schema (Complete):**
- `marketplace_companies` table with CQC fields, Stripe Connect columns, verification workflow, user_id-based RLS
- `medic_commitments` table with PostgreSQL EXCLUSION constraint (btree_gist) preventing double-booking
- `compliance_documents` table with document_type discriminator, expiry tracking, admin review workflow
- Private `compliance-documents` storage bucket with company-folder-scoped RLS
- TypeScript types (`MarketplaceCompany`, `ComplianceDocument`, `MedicCommitment`, `CQCProvider`)
- CQC API client (`verifyCQCProvider()`) and compliance utilities (`isDocumentExpired()`, `getExpiringDocuments()`)

**Plan 02 -- Registration Wizard & APIs (Complete):**
- Zustand store managing 4-step wizard state with org pre-fill from existing SiteMedic account
- CQC verify API route proxying to public CQC API
- Registration API creating `marketplace_companies` with dual-path org crossover (existing org linking or new org creation)
- Multipart document upload API with 10MB limit, MIME validation, storage bucket upload
- 4-step wizard UI: company details, CQC verification, document upload, review & submit
- Lightweight client marketplace registration page (single-click toggle)
- Middleware updated to allow marketplace routes without org_id

**Plan 03 -- Admin Verification & CQC Monitoring (Complete):**
- Admin verification queue with status filters, search, and action buttons (approve/reject/request info/suspend)
- CQC daily check Edge Function combining CQC status verification + document expiry monitoring
- Service-role admin actions (platform admin has org_id=NULL, RLS blocks direct writes)
- Active bookings flagged for admin review on company suspension

**Plan 04 -- Stripe Connect Onboarding (Complete):**
- New `create_company_express_account` action in existing `stripe-connect` Edge Function
  - Creates Stripe Express accounts with `business_type='company'` (distinct from individual medic flow)
  - Authenticates user and verifies company admin ownership before account creation
  - If company already has a Stripe account (incomplete onboarding), generates new Account Link instead of duplicate
  - Updates `marketplace_companies.stripe_account_id` after creation
- `POST /api/marketplace/stripe-connect` API route proxying to Edge Function with company details lookup
- Stripe callback page (`/marketplace/register/stripe-callback`) handling:
  - `?complete=true`: Verifies account status (charges_enabled, payouts_enabled), updates `stripe_onboarding_complete`
  - `?refresh=true`: Generates fresh Account Link for expired onboarding sessions
  - Error states with appropriate recovery options
- Registration wizard Step 4 updated from placeholder to two-phase flow:
  - Pre-registration: review summary + submit button
  - Post-registration: prominent "Start Stripe Onboarding" button with redirect to Stripe hosted flow
  - "Skip for now" option (onboarding can be completed later from company dashboard)
- Existing individual medic Stripe Connect flow (`create_express_account`) remains unchanged

### Implementation Progress (Phase 33 -- Event Posting & Discovery) ✅ VERIFIED

**Plan 01 -- Database Schema, Types, Schemas, API Routes (Complete):**
- `marketplace_events` table with PostGIS GEOGRAPHY column for radius-based spatial queries, status workflow (draft → open → closed/cancelled/awarded), quote tracking (`has_quotes`, `quote_count`), equipment JSONB, and budget range
- `event_days` table for multi-day event support with date, start/end times, and sort_order
- `event_staffing_requirements` table with role enum, quantity, optional per-day assignment, and notes
- 9 RLS policies: poster manage own, verified companies browse open, platform admin full access (3 per table)
- 10 indexes including GIST spatial index on `location_coordinates` for PostGIS `ST_DWithin` queries
- TypeScript types (`MarketplaceEvent`, `EventDay`, `EventStaffingRequirement`, `MarketplaceEventWithDetails`)
- Label maps for event types, staffing roles, equipment types, status, indoor/outdoor
- Zod schemas: `basicInfoSchema`, `schedulingSchema` (UK postcode regex), `staffingSchema`, `eventFormSchema`, `eventUpdatePreQuotesSchema`, `eventUpdatePostQuotesSchema`
- POST `/api/marketplace/events` — create event with days, staffing, equipment, draft support, PostGIS coordinate setting
- GET `/api/marketplace/events` — list with filters (status, type, role, lat/lng/radius, pagination), PostGIS spatial fallback
- GET `/api/marketplace/events/[id]` — single event with nested relations
- PUT `/api/marketplace/events/[id]` — EVNT-05 edit restrictions: full update pre-quotes, description-only post-quotes
- POST `/api/marketplace/events/[id]/close` — close or cancel with ownership verification and status validation

**Plan 02 -- Event Posting Wizard & Client Management (Complete):**
- Zustand store (`useEventPostingStore`) managing 4-step wizard state with `loadDraft` for resuming drafts
- Step 1 (Basic Info): event name, type dropdown, description, special requirements, indoor/outdoor, attendance
- Step 2 (Schedule & Location): dynamic event days (add/remove), postcode, Google Places address, what3words, display location, quote deadline
- Step 3 (Staffing & Equipment): dynamic staffing requirements with role/qty/day-assignment, equipment checklist with notes, budget range with info nudge
- Step 4 (Review): full summary with per-section Edit links back to relevant step
- Create Event Page: wizard container with step indicator, Zod validation on step transition, Save as Draft / Publish buttons, draft loading from URL params
- My Events Dashboard: event list with status badges (draft/open/closed/cancelled/awarded), filters by status and search, per-status action menus (edit/publish/delete for drafts, edit/close/cancel for open, view for archived)
- Edit Event Page: dual mode — full wizard for pre-quote events, restricted description+special requirements form for post-quote events (EVNT-05 enforced)
- Confirmation dialogs for destructive actions (close/cancel)

**Plan 03 -- Event Discovery for Medics (Complete):**
- React Query hooks: `useMarketplaceEvents` (full filter params), `useMarketplaceEvent` (single event)
- Browse Events page with list/map toggle, auto-detection of company owner vs individual medic
- EventListRow: dense 12-column grid showing event name + type badge, date range with multi-day count, staffing summary (truncated with +N more), budget range, approximate location with haversine distance, deadline countdown with urgency highlighting, quote count
- EventFilters with dual search modes:
  - Company owners: Google Places city autocomplete + UK region dropdown (12 regions with preset coordinates)
  - Individual medics: "Near me" radius search (10/25/50/75/100/150 miles) from profile location
  - Common: event type, role needed, date range, clear filters
- EventMap: Google Maps with event markers, InfoWindow popups (name, type, dates, "View Details" link), search radius circle overlay, auto-fit bounds
- Event Detail Page: full event info with approximate location ONLY (`location_display`), "Exact address provided after you submit a quote" note, schedule table, staffing requirements table, equipment list, budget display
- Quote button disabled with Phase 34 placeholder text
- Breadcrumb navigation (Browse Events > Event Name)

### Implementation Progress (Phase 34.1 -- Self-Procured Jobs, INSERTED)

Phase 34.1 was inserted into the v4.0 roadmap between Phase 34 (Quote Submission) and Phase 35 (Award Flow). Companies with SiteMedic subscriptions can create and manage jobs they sourced themselves, outside the marketplace, with 0% platform commission.

**Plan 01 -- Database Schema & Types (Complete):**
- `direct_clients` table for formal client records, owned by marketplace company
- `marketplace_events` extended with `source` ('marketplace'|'direct'), `agreed_price`, `client_id` columns
- Status constraint extended: draft, open, closed, cancelled, awarded, confirmed, in_progress, completed
- RLS policy for company-managed direct jobs (source='direct' AND posted_by = auth.uid())
- TypeScript types: `DirectJob`, `DirectClient`, `DirectJobStatus`, `EventSource`
- Zod schemas: 5-step wizard validation (clientDetails, jobInfo, jobSchedule, jobStaffing, jobPricing)
- CRUD API routes: POST/GET /api/direct-jobs, GET/PUT/DELETE /api/direct-jobs/[id]

**Plan 02 -- Job Creation Wizard UI (Complete):**
- 6-step wizard at /dashboard/jobs/create (client details, job info, schedule, staffing, pricing, review)
- Existing client selector with pre-fill and disabled editing
- Pricing step shows 0% platform commission prominently in payment breakdown
- Jobs list page at /dashboard/jobs with search, status filter, pagination

**Plan 03 -- Combined Jobs View & Marketplace Integration (Complete):**
- Combined view at /dashboard/jobs/combined showing marketplace + direct jobs together
- Source badges (Marketplace/Direct), unified status colour map across 8 statuses
- Marketplace events GET now excludes source='direct' via .neq() filter
- Combined API returns all sources by default; source filter server-side, status/search client-side

**Plan 04 -- Payment, Booking Bridge, Medic Assignment, Job Detail (Complete):**
- `createDirectJobBooking` bridge function maps direct job fields to bookings table with source='direct', platform_fee=0, medic_payout=100%
- Payment route (POST /api/direct-jobs/[id]/payment) creates Stripe PaymentIntent for deposit (25% default), with dev mock fallback when no STRIPE_SECRET_KEY
- Confirm route (POST /api/direct-jobs/[id]/confirm) transitions draft->confirmed and calls createDirectJobBooking
- Assign-medic route (POST/DELETE /api/direct-jobs/[id]/assign-medic) uses medic_commitments EXCLUSION constraint for availability checking (catches PostgreSQL 23P01 error for conflicts)
- Job detail page at /dashboard/jobs/[id] (795 lines) with client details, job info, schedule, staffing requirements, pricing sidebar (0% commission highlighted), medic assignment with conflict detection, payment flow, status management buttons

**Key Direct Jobs files:**

| File | Purpose |
|------|---------|
| `web/lib/direct-jobs/types.ts` | DirectJob, DirectClient, DirectJobStatus types |
| `web/lib/direct-jobs/schemas.ts` | Zod validation for 5-step wizard + update |
| `web/lib/direct-jobs/booking-bridge.ts` | createDirectJobBooking with source='direct', 0% commission |
| `web/app/api/direct-jobs/route.ts` | POST (create) + GET (list) direct jobs |
| `web/app/api/direct-jobs/[id]/route.ts` | GET/PUT/DELETE single direct job |
| `web/app/api/direct-jobs/[id]/payment/route.ts` | Stripe PaymentIntent for deposit |
| `web/app/api/direct-jobs/[id]/confirm/route.ts` | Confirm job + create booking |
| `web/app/api/direct-jobs/[id]/assign-medic/route.ts` | Assign/remove medics with EXCLUSION constraint |
| `web/app/(dashboard)/dashboard/jobs/page.tsx` | Jobs list page |
| `web/app/(dashboard)/dashboard/jobs/create/page.tsx` | 6-step creation wizard |
| `web/app/(dashboard)/dashboard/jobs/[id]/page.tsx` | Job detail page |
| `supabase/migrations/147_direct_jobs.sql` | direct_clients table, marketplace_events extensions |

### Planning Files

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Updated with v4.0 milestone context |
| `.planning/REQUIREMENTS-v4.md` | 60 requirements across 10 categories |
| `.planning/ROADMAP.md` | 8 phases (32--39), 26 plans |
| `.planning/research/v4/` | Stack, features, architecture, pitfalls research |

---

## Recent Updates -- Site Manager Active/Inactive Status (2026-02-19)

### Overview

Site managers now have an `is_active` boolean field on their profile. This distinguishes between **active** site managers (currently working on a project) and **inactive** ones (worked with in the past, not currently engaged — not fired, just not on a current project). The mobile app hides inactive site managers entirely, while the web admin platform shows all users with a visible status badge and filter.

### New Migration

| File | Purpose |
|------|---------|
| `supabase/migrations/139_site_manager_is_active.sql` | Adds `is_active BOOLEAN DEFAULT TRUE` column to `profiles` table. Defaults to `TRUE` so all existing users remain active. Pattern follows existing `is_active` usage on `geofences`, `shift_templates`, `site_beacons` tables. |

### Modified Files

| File | Changes |
|------|---------|
| `app/(tabs)/team.tsx` | **Extended `TeamMember` interface** with `is_active` field. **Separate try/catch query** fetches `is_active` from profiles for site managers only (graceful degradation if migration 139 not yet applied — column missing = treat all as active). **Filtered site managers** to only show active ones: `m.is_active !== false`. Inactive site managers are completely hidden from the mobile Team screen. |
| `web/app/platform/users/page.tsx` | **Extended `PlatformUser` interface** with `is_active` field. **Separate try/catch query** fetches `is_active` from profiles after main query (graceful degradation if migration 139 not yet applied). **Added status badge** in users table — green "Active" dot/pill or gray "Inactive" dot/pill. **Added status filter dropdown** alongside existing role filter (All Status / Active / Inactive). **New table column** "Status" between Role and Organisation. |
| `src/types/supabase.ts` | **Added `is_active`** to profiles `Row` (required `boolean`), `Insert` (optional), and `Update` (optional) type definitions. |

### Key Implementation Details

- **Default TRUE**: All existing users are treated as active. Only explicitly setting `is_active = false` marks someone as inactive.
- **Mobile hides inactive**: The mobile app Team screen filters out site managers where `is_active === false`. Uses `!== false` check so `null`/`undefined` (pre-migration rows) are treated as active.
- **Web shows all with filter**: The Platform Users page shows all users regardless of status. Admins can filter to see only active or inactive users via a dropdown. Each user row displays a status badge (green dot + "Active" or gray dot + "Inactive").
- **No cascade effects**: Setting a site manager to inactive does not affect their existing bookings, contracts, or other data. It only controls visibility in the team roster.
- **Company + site auto-extraction from active bookings (mobile)**: Only **current** bookings are used (status in `pending`/`confirmed`/`in_progress` AND `shift_date >= today`). Completed and cancelled bookings are excluded — the mobile Team screen shows current workload only. Company names are extracted from the `site_name` field (format: "Company — Location"). A site manager working 2 sites for the same company shows one company + two locations. A site manager working for 2 different companies shows both companies comma-separated + all their locations. If `profiles.company_name` is set, it takes priority over booking-derived values. Full booking history belongs on the web admin site manager profile.

---

## Recent Updates — Platform Admin Branding Override (2026-02-19)

### Overview

Platform admin (Sabine) can now configure branding on behalf of any organisation directly from the `/platform/organizations` page. Each active org card has a "Branding" button that expands an inline section with the same `BrandingForm` + `BrandingPreview` components used by org admins. This is the white-glove onboarding service: new subscribers who haven't configured their branding can have it done for them.

### New Files

| File | Purpose |
|------|---------|
| `web/app/api/platform/organizations/[id]/branding/route.ts` | Platform admin branding API: GET (read branding), PUT (auto-save text fields), POST (logo upload via FormData). Uses service-role Supabase client to bypass RLS (platform admin JWT has `org_id=NULL`). All handlers verify `app_metadata.role === 'platform_admin'`. POST validates file type (PNG/JPEG/SVG) and size (max 2MB) before uploading to `org-logos` bucket. |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/(dashboard)/admin/settings/branding/components/branding-form.tsx` | Added optional `logoUploadEndpoint` prop. When set, logo upload POSTs FormData to that server endpoint instead of client-side Supabase Storage. Needed for platform admin whose JWT lacks org_id (RLS blocks client-side uploads). Org admin flow unchanged (prop is optional). |
| `web/app/platform/organizations/page.tsx` | Added expandable branding section per active org card. Clicking "Branding" (Palette icon) fetches branding via GET, shows `BrandingForm` + `BrandingPreview` inline. Only one org expanded at a time (card spans full width when expanded). Branding data cached to avoid re-fetching on collapse/expand. |

### Key Implementation Details

- **Service-role client**: Same `getServiceClient()` pattern as `activate/route.ts` -- uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for all org_branding reads/writes
- **Server-side logo upload**: POST handler parses `FormData`, validates file, converts to Buffer, uploads via `supabase.storage.from('org-logos').upload()` with `upsert: true`, then updates `org_branding.logo_path`
- **logoUploadEndpoint prop**: When `BrandingForm` receives this prop, it sends a `POST FormData` request instead of client-side Supabase Storage upload. Response includes `logo_path` and `logo_url` for state updates
- **Expandable UX**: `expandedBrandingId` state tracks which org is expanded. Card gets `lg:col-span-2` when expanded for full-width branding form. Collapse/expand is instant (cached data reused)
- **No tier check**: Platform admin can edit branding for any org regardless of subscription tier -- this is the white-glove override capability

---

## Recent Updates — Org Admin Branding Settings Page (2026-02-19)

### Overview

Growth-tier org admins can now navigate to `/admin/settings/branding` and configure their portal branding: company name, primary colour, tagline, and logo. Text fields auto-save with a 500ms debounce (no manual save button), while logo upload is an explicit action via Supabase Storage with `upsert: true`. A live preview panel shows a real-time portal header and sidebar mockup as the admin types.

### New Files

| File | Purpose |
|------|---------|
| `web/app/(dashboard)/admin/settings/branding/page.tsx` | Branding settings page with TierGate wrapping, side-by-side form + preview layout, back link to `/admin/settings`, loading state |
| `web/app/(dashboard)/admin/settings/branding/components/branding-form.tsx` | Reusable `BrandingForm` component: auto-save (500ms debounce via `useRef<setTimeout>`), logo upload to `org-logos/{org_id}/logo.{ext}`, colour picker with native `<input type="color">` + hex text input, "Reset to SiteMedic Defaults" button, inline save status indicator |
| `web/app/(dashboard)/admin/settings/branding/components/branding-preview.tsx` | `BrandingPreview` component: live portal header mockup (logo + company name + tagline on primary colour background), sidebar accent bars, browser tab mockup showing `[Company] -- SiteMedic` |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/admin/settings/page.tsx` | Branding section simplified: inline form replaced with summary card + "Manage Branding" link to `/admin/settings/branding`. TierGate still wraps the card (Starter sees upgrade prompt). |
| `web/app/api/admin/branding/route.ts` | PUT handler now accepts `logo_path` in request body for BrandingForm logo upload persistence |

### Key Implementation Details

- **Auto-save**: `useEffect` on `[companyName, primaryColour, tagline]` with `hasInitialized` ref to skip initial render. 500ms debounce via `useRef<ReturnType<typeof setTimeout>>`. Save status: idle -> saving -> saved (fades after 2s)
- **Logo upload**: Separate from auto-save (explicit button). Validates PNG/JPEG/SVG, max 2MB. Uploads to Supabase Storage with `upsert: true`, then PUTs `logo_path` to API
- **Colour picker**: Native `<input type="color">` synced with hex text input (font-mono). Hex validated before sending (`/^#[0-9a-fA-F]{6}$/`). Invalid hex sends `null`
- **Live preview**: `onPreviewChange` callback fires on every state change (no debounce) for instant preview updates
- **Reusability**: `BrandingForm` accepts `apiEndpoint` prop (default `/api/admin/branding`) for 31-02 platform admin reuse
- **TierGate**: Growth tier enforced via `<TierGate feature="white_label">`. Starter sees UpgradePrompt

---

## Recent Updates — Team Screen: Separate Site Managers with Company & Site Info (2026-02-18)

### Overview

The mobile Team screen now separates **site managers** into their own dedicated section, distinct from the org's internal team (admins + medics). Site managers are external users from client companies — they now display their **company name** (from `profiles.company_name`) and their **assigned site/project name** (from the most recent booking in `bookings`).

### New Migration

| File | Purpose |
|------|---------|
| `supabase/migrations/138_site_manager_company.sql` | Adds `company_name TEXT` column to `profiles` table. Nullable — only relevant for `site_manager` role. No NOT NULL constraint for backward compatibility. |

### Modified Files

| File | Changes |
|------|---------|
| `app/(tabs)/team.tsx` | **Two-section layout**: members are now split into "Your Team (N)" (admins + medics) and "Site Managers (N)" sections. **Extended `TeamMember` interface** with `company_name` and `site_name` fields. **Expanded profiles query** to include `company_name`. **Added bookings query** for site manager site assignments — fetches most recent `site_name` per `site_manager_id` from `bookings` table, ordered by `shift_date DESC`. **Site Manager cards** show name (bold), company name (muted gray), and site name with pin icon (lighter gray). Fallback text: "Company not set" / "No site assigned". **Role badge** changed from "Site Manager" to "Site Mgr" for compact display. **Empty state** for site managers section: "No site managers yet." |

### Data Flow

1. **Profiles query** fetches `id, full_name, email, role, company_name` from `profiles` (filtered by `org_id`)
2. **Medics query** fetches from `medics` table (unchanged)
3. Combined results split: `role !== 'site_manager'` → "Your Team", `role === 'site_manager'` → "Site Managers"
4. **Bookings query** (only if site managers exist): fetches `site_manager_id, site_name` from `bookings` ordered by `shift_date DESC`, builds a map of most recent site per manager
5. Site name attached to each site manager before rendering

### UI Layout

```
YOUR TEAM (3)
┌─────────────────────────────────────────┐
│ Admin Name                    You  Admin│
│ admin@example.com                       │
│─────────────────────────────────────────│
│ ● Medic One                       Medic│
│ medic1@example.com                      │
│─────────────────────────────────────────│
│ ● Medic Two                       Medic│
│ medic2@example.com                      │
└─────────────────────────────────────────┘

SITE MANAGERS (2)
┌─────────────────────────────────────────┐
│ Jordan Blake                   Site Mgr │
│ Apex Client Ltd                         │
│ 📍 Wembley Stadium Build               │
│─────────────────────────────────────────│
│ Marcus Holt                    Site Mgr │
│ Company not set                         │
│ 📍 No site assigned                    │
└─────────────────────────────────────────┘
```

### Key Details

- **No breaking changes**: The `company_name` column is nullable — existing profiles unaffected
- **Migration must be applied manually**: `supabase migration up` or via Supabase dashboard
- **Bookings query is conditional**: Only runs when site managers are present, avoiding unnecessary DB calls
- **Most recent site wins**: If a site manager has multiple bookings, the one with the latest `shift_date` determines the displayed site name
- **Empty states**: Both sections have their own empty state messages

---

## Previous Updates — Phase 30-05: Subscription Suspension Enforcement (2026-02-18)

### Overview

Phase 30 Plan 05 adds subscription suspension enforcement. When an organisation's subscription is cancelled, the middleware redirects them to a `/suspended` page that clearly communicates the situation, reassures them their data is preserved, and provides a reactivation path via Stripe Customer Portal.

### Modified Files

| File | Changes |
|------|---------|
| `web/lib/supabase/middleware.ts` | **Extended org query** to also SELECT `subscription_status` alongside `onboarding_completed` (single DB query, no extra call). **Added `isSuspendedRoute` detection** to prevent redirect loops. **Suspension redirect**: after onboarding checks, if `subscription_status === 'cancelled'`, redirects to `/suspended`. NULL status (legacy orgs) and `active`/`past_due` pass through normally. |
| `web/app/suspended/page.tsx` | **New page**. Client component with full-screen dark gradient background and centered white card. Shows `ShieldOff` icon (red), "Subscription Inactive" heading, org name from `useOrg()` context. Green data-preservation callout ("Your data is safe" with details about preserved bookings, medic records, invoices, reports). Purple "Reactivate Subscription" button that POSTs to `/api/billing/portal` and redirects to Stripe Customer Portal. Loading spinner during redirect. Divider with "Contact Support" mailto link (`support@sitemedic.co.uk`) and "Log Out" button. |

### Key Details

- **No database changes**: Uses existing `subscription_status` column from migration 133
- **Single query**: Middleware extends the existing onboarding query rather than adding a second DB call
- **Only `cancelled` is blocked**: `NULL` (legacy orgs), `active`, and `past_due` all pass through
- **No redirect loop**: `/suspended` route detected and excluded from the redirect
- **Authenticated only**: `/suspended` is NOT in `publicRoutes` — user must be logged in
- **Reactivation via Stripe**: Uses the existing `/api/billing/portal` endpoint from Phase 30-03

---

## Previous Updates — Fix: Mobile App Team Screen Medics Integration + Role Mismatch (2026-02-18)

### Overview

Two bugs prevented the Team screen from working for org admins:

1. **Role mismatch**: The mobile app's `UserRole` type only had `'admin'` but the database stores `'org_admin'` for organisation admins. This caused `isAdmin` to always be `false`, hiding the Team and Events tabs entirely.
2. **Missing medics query**: The Team screen only queried the `profiles` table. Medics exist in a separate `medics` table and were invisible.

### Problem

- Mobile app `UserRole` type: `'medic' | 'site_manager' | 'admin'` — missing `'org_admin'` and `'platform_admin'`
- `useRole()` hook checked `role === 'admin'` but DB value is `'org_admin'` → Team/Events tabs never shown
- Web app correctly uses `'org_admin'` (see `web/contexts/org-context.tsx`)
- Team screen only queried `profiles` table — medics in `medics` table were invisible

### Modified Files

| File | Changes |
|------|---------|
| `src/types/auth.ts` | **Extended `UserRole`** from `'medic' \| 'site_manager' \| 'admin'` to include `'org_admin'` and `'platform_admin'` — matching web app's role types. |
| `hooks/useRole.ts` | **Fixed `isAdmin`** check to `role === 'admin' \|\| role === 'org_admin'`. Added `isPlatformAdmin` flag for `'platform_admin'` role. |
| `app/(tabs)/team.tsx` | **Added `org_admin` and `platform_admin`** to `ROLE_BADGE` map. **Fixed "You" row badge** to use actual user role instead of hardcoded `admin`. **Added medics table query** (see below). |

| File | Changes |
|------|---------|
| `app/(tabs)/team.tsx` | **Expanded `TeamMember` interface** with `authUserId`, `source` ('profiles' \| 'medics'), `available_for_work`, `classification` fields. **Added parallel `medics` table query** via `Promise.all` alongside existing `profiles` query. **Deduplication logic**: builds a Set of auth user IDs from profiles + current user, filters out medics whose `user_id` already appears in profiles. **Merged results** sorted alphabetically. **Availability dot**: green (#10B981) for available medics, gray (#9CA3AF) for unavailable — only shown for medics-sourced rows. **Classification subtitle**: shows medic classification (e.g. "Senior") in italic gray text below email when non-null. |

### Key Details

- **No database changes**: RLS policies already allow authenticated users to read `medics` rows for their org
- **Deduplication**: If a medic also has a `profiles` row (linked via `user_id`), the profiles entry takes precedence — no duplicates
- **Medic display**: `full_name` constructed from `first_name + " " + last_name`, role forced to `'medic'`
- **Availability indicator**: Small colored dot before name — green = `available_for_work: true`, gray = false/null
- **Classification**: Italic gray text below email (e.g. "Junior", "Senior") — only shown when `classification` is non-null
- **Parallel queries**: Both `profiles` and `medics` fetched via `Promise.all` for fast load times

---

## Previous Updates (2) — Phase 30-04: Platform Admin Subscriptions / MRR Dashboard (2026-02-18)

### Overview

Phase 30 Plan 04 adds a Subscriptions page to the platform admin area. This page provides a Monthly Recurring Revenue (MRR) dashboard that shows all org subscriptions with their tier, status, and MRR contribution. All data is calculated from the local `organizations` table — no Stripe API calls are made.

### New Files

| File | Purpose |
|------|---------|
| `web/app/platform/subscriptions/page.tsx` | Platform admin MRR dashboard. Fetches all orgs from the `organizations` table, calculates MRR using tier prices (Starter £149/mo, Growth £299/mo, Enterprise £599/mo). NULL tier defaults to `'starter'`, NULL status defaults to `'active'`. Past-due orgs stay in MRR (dunning period), cancelled orgs excluded. Shows 4 summary cards (Total MRR with ARR, Active Orgs, At Risk, Churned), 3 per-tier breakdown cards, searchable org table with tier badge, status badge, per-org MRR, and joined date. Includes skeleton loading state. |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/platform/layout.tsx` | Added `CreditCard` import from lucide-react. Added `Subscriptions` nav item between Organizations and Revenue, linking to `/platform/subscriptions`. |

### Key Details

- **MRR calculation rules**: NULL `subscription_tier` defaults to `'starter'`; NULL `subscription_status` defaults to `'active'`; `cancelled` excluded from MRR; `past_due` included in MRR (dunning)
- **Price constants**: Starter = £149/mo, Growth = £299/mo, Enterprise = £599/mo — hardcoded, not fetched from Stripe
- **At Risk metric**: Count of orgs with `past_due` status (payment failed, in dunning period)
- **Churned metric**: Count of orgs with `cancelled` status (no longer contributing MRR)
- **Search**: Client-side filtering by name, slug, tier, or status
- **No database changes**: Reads existing `organizations` columns only
- **No Stripe API calls**: All revenue data calculated locally from tier prices and org count

---

## Previous Updates — Phase 30-03: Stripe Customer Portal Integration (2026-02-18)

### Overview

Phase 30 Plan 03 adds the Stripe Customer Portal integration, allowing org admins to manage their subscription, payment methods, and invoices directly through Stripe's hosted portal. A new API route creates portal sessions, and the admin settings page gets a "Manage Billing" button.

### New Files

| File | Purpose |
|------|---------|
| `web/app/api/billing/portal/route.ts` | POST endpoint that creates a Stripe Customer Portal session. Authenticates via `requireOrgId()`, looks up `stripe_customer_id` from the `organizations` table, returns a redirect URL to Stripe's hosted billing portal. Returns 400 with a friendly message for legacy orgs without a linked Stripe customer. |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/admin/settings/page.tsx` | Replaced "contact support" text in Billing section with a "Manage Billing" button. Added `portalLoading` state and `handleManageBilling()` handler that POSTs to `/api/billing/portal` and redirects to the Stripe portal URL. Button uses purple gradient styling with CreditCard icon and Loader2 spinner during loading. |

### Key Details

- **Portal return URL**: Points back to `/admin/settings` so users land on the settings page after managing billing in Stripe
- **Legacy org handling**: Orgs without `stripe_customer_id` (set up before Stripe billing) get a descriptive error instead of a broken portal link
- **Origin detection**: Uses `request.headers.get('origin')` with fallback to `NEXT_PUBLIC_SITE_URL` then `localhost:30500` for correct subdomain support
- **Button disabled states**: Disabled when portal session is loading or when subscription tier hasn't loaded yet
- **No database changes**: Reads existing `organizations.stripe_customer_id` column

---

## Previous Updates — Phase 30-01: Tier Gating Components & Server Helper (2026-02-18)

### Overview

Phase 30 Plan 01 delivers the client-side and server-side building blocks for feature gating across the platform. These components consume the feature-gates module (Phase 25) to conditionally render UI or block API access based on an org's subscription tier.

### New Files

| File | Purpose |
|------|---------|
| `web/components/billing/upgrade-prompt.tsx` | Client component — gradient card prompting users to upgrade when they access a feature above their tier. Includes `FEATURE_DISPLAY_NAMES` (human-readable names for all 12 features) and `FEATURE_REQUIRED_TIER` (maps Growth+ and Enterprise features to their required tier). Links to `/admin/settings#billing`. |
| `web/components/billing/tier-gate.tsx` | Client component — wraps children in a tier check. If `hasFeature(tier, feature)` passes, renders children; otherwise renders `<UpgradePrompt>`. Accepts optional `upgradeMessage` for contextual copy. |
| `web/lib/billing/require-tier.ts` | Server-side async helper for API route gating. Resolves org from session via `requireOrgId()`, queries `organizations.subscription_tier`, gates via `hasFeature()`. Throws `'TIER_INSUFFICIENT'` error (catch in route handler, return 403). Returns the tier on success. |

### Key Details

- **UpgradePrompt styling**: `bg-gradient-to-br from-blue-900/30 to-purple-900/30`, `border-blue-700/50`, `rounded-2xl` — matches dark theme
- **TierGate pattern**: Drop-in wrapper for any page section that should be tier-locked — pass `feature` and `tier` props
- **requireTier() pattern**: Pure utility (no NextResponse coupling) — API routes catch the error and return appropriate HTTP status
- **NULL tier handling**: Both client and server paths default NULL to 'starter' (legacy org compatibility per Phase 24-05 decision)
- **No database changes**: All components read existing `organizations.subscription_tier` column

---

## Previous Updates — Sprint 22: Multi-Tenant org_id Security Hardening (2026-02-19)

### Overview

Sprint 22 of the gap analysis: **critical multi-tenant security hardening** across 6 API routes. All routes had authentication (`getUser()`) but were missing `requireOrgId()` and `.eq('org_id', orgId)` on their Supabase queries, meaning an authenticated user from Org A could read/modify data belonging to Org B by guessing UUIDs. The contract templates GET endpoint additionally had **no authentication at all**.

### Modified Files

| File | Change |
|------|--------|
| `web/app/api/contracts/templates/route.ts` | **CRITICAL**: Added auth check to GET (was unauthenticated). Added `requireOrgId()` + `.eq('org_id', orgId)` to all 4 handlers (GET/POST/PUT/DELETE). POST now includes `org_id` in insert payload. Default-unset queries now scoped to org. |
| `web/app/api/contracts/send/route.ts` | Added `requireOrgId()` + `.eq('org_id', orgId)` to contract fetch, internal review update, status update, and `org_id` to contract_events insert |
| `web/app/api/contracts/[id]/capture-milestone/route.ts` | Added `requireOrgId()` + `.eq('org_id', orgId)` to contract fetch, payment update, fulfilled status update, and `org_id` to contract_events insert |
| `web/app/api/contracts/[id]/complete-payment/route.ts` | Added `requireOrgId()` + `.eq('org_id', orgId)` to contract fetch, payment update, fulfilled/active status updates, and `org_id` to contract_events insert |
| `web/app/api/medics/[id]/compensation/route.ts` | Added `requireOrgId()` + `.eq('org_id', orgId)` to medic update query — prevents cross-org experience tier changes |

### Key Details

- **6 routes hardened**: templates (4 handlers), send, capture-milestone, complete-payment, compensation
- **Pattern applied**: `requireOrgId()` from `@/lib/organizations/org-resolver` + `.eq('org_id', orgId)` on every Supabase query (reads, updates, inserts)
- **RLS is a safety net, not the primary defense**: Even though RLS policies exist, application-level org_id filtering provides defense-in-depth and prevents leaks if RLS is misconfigured
- **No database changes**: All fixes are application-level query scoping
- **Zero TypeScript errors**: All changes pass `tsc --noEmit`

---

## Previous Updates — Sprint 21: Auth Security & Unhandled Promise Safety (2026-02-19)

### Overview

Sprint 21 of the gap analysis addresses a **critical security gap** and improves promise chain safety. The recurring bookings API route (`/api/bookings/recurring`) had **no authentication or org_id filtering**, allowing any unauthenticated request to create bookings and read parent booking data across tenants. Additionally, 6 unhandled `.then()` promise chains across 3 components are now guarded with `.catch()` to prevent unhandled rejection crashes.

### Modified Files

| File | Change |
|------|--------|
| `web/app/api/bookings/recurring/route.ts` | **CRITICAL**: Added `supabase.auth.getUser()` authentication check + `requireOrgId()` multi-tenant gate + `.eq('org_id', orgId)` filter on parent booking query, client query, and parent update query. Route was previously completely unauthenticated. |
| `web/components/ui/what3words-input.tsx` | Added `.catch()` to 4 unhandled promise chains: `coordinatesToWhat3Words` (auto-fill), `autosuggestWhat3Words` (autocomplete), `what3WordsToCoordinates` (validation), and `what3WordsToCoordinates` (suggestion click) |
| `web/components/admin/timesheet-batch-approval.tsx` | Added `.catch()` to `createClient().auth.getUser()` promise chain in useEffect |
| `web/components/QuoteBuilder.tsx` | Added `.catch()` to `coordinatesToWhat3Words` promise chain in Google Places autocomplete handler |

### Key Details

- **Security fix**: The recurring bookings route now follows the standard auth pattern: `createClient()` → `getUser()` → `requireOrgId()` → org-scoped queries, matching all other booking API routes
- **Promise safety**: All 6 `.then()` chains now have `.catch()` handlers to prevent `UnhandledPromiseRejection` crashes when network requests (what3words API, Supabase auth) fail
- **No database changes**: All fixes are code-level auth/safety improvements
- **Zero TypeScript errors**: All changes pass `tsc --noEmit`

---

## Previous Updates — Sprint 20: Catch Type Safety & Error Detail Sanitization (2026-02-19)

### Overview

Sprint 20 of the gap analysis: converts 10 `catch (error: any)` blocks across 6 files to `catch (error: unknown)` with proper `instanceof Error` narrowing, improving TypeScript type safety and preventing accidental property access on non-Error objects. Also sanitizes 2 additional error responses in the complete-payment route that were still leaking Stripe error messages.

### Modified Files

| File | Change |
|------|--------|
| `web/components/medics/compensation-settings.tsx` | `catch (err: any)` → `catch (err: unknown)` with `instanceof Error` check for `err.message` |
| `web/components/admin/payout-summary.tsx` | `catch (error: any)` → `catch (error: unknown)` with `instanceof Error` check |
| `web/lib/payouts/mileage-router.ts` | `catch (err: any)` → `catch (err: unknown)` with `instanceof Error` check for leg error messages |
| `web/app/api/payouts/process-batch/route.ts` | 2 catch blocks: inner per-timesheet error + outer catch-all. Both converted to `: unknown` with proper narrowing. Also removed leaked `details` field from outer catch. |
| `web/app/api/bookings/confirm/route.ts` | `catch (paymentError: any)` → `catch (paymentError: unknown)` (no message access needed — error is only logged) |
| `web/app/api/contracts/[id]/capture-milestone/route.ts` | 2 `catch (stripeError: any)` → `catch (stripeError: unknown)` |
| `web/app/api/contracts/[id]/complete-payment/route.ts` | 2 `catch (stripeError: any)` → `catch (stripeError: unknown)`. Also sanitized error responses: removed raw `stripeError.message` from client-facing JSON, replaced with generic "Payment capture failed" / "Payment failed". |

### Key Details

- **TypeScript `unknown` vs `any`**: `any` bypasses type checking entirely — accessing `.message` on a non-Error object (e.g., a string throw or undefined) causes a runtime crash. `unknown` forces explicit type narrowing via `instanceof Error` before accessing properties.
- **Pattern used**: `error instanceof Error ? error.message : 'An unexpected error occurred'` — safely extracts message from Error objects, provides fallback for non-Error throws.
- **Additional error sanitization**: The `complete-payment` route was still exposing raw Stripe error messages to clients (missed in Sprint 18). Now returns generic messages like Sprint 18 fixes.

---

## Previous Updates — Sprint 19: Dead Link Fixes & Contract Terminate Feedback (2026-02-19)

### Overview

Sprint 19 of the gap analysis: fixes 2 dead links that would cause 404 errors for users, and adds success/error toast feedback to the contract termination action which previously gave no visual confirmation.

### Modified Files

| File | Change |
|------|--------|
| `web/app/(dashboard)/contracts/create/page.tsx` | Fixed redirect from `/auth/login` to `/login` — login page lives at `/(auth)/login` which maps to URL `/login`, not `/auth/login` |
| `web/app/admin/customers/page.tsx` | "Add Customer" button was a `<Link>` to `/admin/customers/new` which has no page. Changed to a disabled `<button>` with tooltip "Customers are created automatically through the booking flow". Removed unused `Link` import. |
| `web/components/contracts/contracts-table.tsx` | Added `toast` import from sonner. `confirmTerminate()` now shows `toast.success('Contract terminated')` on success and `toast.error('Failed to terminate contract')` on failure (previously silently failed with no user feedback). |

### Key Details

- **Route group URL mapping**: Next.js route groups like `(auth)` are stripped from URLs — `/(auth)/login/page.tsx` responds to `/login`, not `/auth/login`. The old redirect would have landed on a 404 page.
- **Dead "Add Customer" button**: The button linked to a page that was never built. Rather than creating a new page (out of scope for gap fixes), the button is now disabled with an explanatory tooltip. Customers are created when they book through the booking flow.
- **Contract terminate feedback**: The AlertDialog confirmation was already in place, but after the API call completed (success or failure), the user received no visual confirmation. Now uses the app's standard `sonner` toast pattern.

---

## Previous Updates — Sprint 18: API Error Sanitization & Status Code Fixes (2026-02-18)

### Overview

Sprint 18 of the gap analysis: removes internal error details (database messages, Stripe errors, stack traces) from API responses that could leak implementation details to clients, and fixes 3 API routes that incorrectly returned HTTP 401 for all caught errors including server-side failures that should return 500.

### Modified Files

| File | Change |
|------|--------|
| `web/app/api/bookings/[id]/route.ts` | Removed `details` field from 404 and 500 error responses (was leaking Supabase error messages) |
| `web/app/api/bookings/calculate-cost/route.ts` | Removed `details` field from 500 error response |
| `web/app/api/bookings/recurring/route.ts` | Removed `details` field from 3 error responses (parent not found, insert failed, catch-all) |
| `web/app/api/invoices/generate/route.ts` | Removed `details` field from 500 error response |
| `web/app/api/medics/ir35-assessment/route.ts` | Removed `details` from Stripe and catch-all errors (kept validation `details` for user-facing field errors) |
| `web/app/api/medics/[id]/compensation/route.ts` | Replaced raw `error.message` with generic "Failed to update compensation" message |
| `web/app/api/contracts/[id]/capture-milestone/route.ts` | Replaced raw `stripeError.message` in 2 error responses with generic "Payment capture failed" / "Payment failed" |
| `web/app/api/admin/bookings/[id]/brief/route.ts` | Fixed 2 catch blocks: was returning 401 for all errors, now distinguishes auth errors (401) from server errors (500) |
| `web/app/api/admin/branding/route.ts` | Fixed 2 catch blocks: was returning 401 for all errors, now returns 500 for non-auth failures |
| `web/app/api/billing/portal/route.ts` | Fixed catch block: was returning 401 for Stripe errors, now returns 500 for non-auth failures |

### Key Details

- **Error detail sanitization**: Internal error messages from Supabase, Stripe, and JavaScript exceptions can leak table names, column names, API keys, and stack traces. All internal details are now logged server-side via `console.error()` but only generic messages like "Internal server error" are returned to clients.
- **IR35 validation exception**: The IR35 assessment route's validation `details` field was intentionally kept — it contains user-facing validation error messages (which fields are missing/invalid), not internal error details.
- **401 vs 500 distinction**: The catch-all pattern `} catch { return 401 }` incorrectly told clients "you're not authorized" when the real problem was a server crash. The fix inspects the error message for auth-related keywords to determine the correct status code.
- **All error details still logged**: Every sanitized response includes a `console.error()` call with the full error for server-side debugging — only the client-facing response is sanitized.

---

## Previous Updates — Sprint 17: Responsive Grid Breakpoints & Dead Code Cleanup (2026-02-18)

### Overview

Sprint 17 of the gap analysis: adds responsive grid breakpoints to 12 components that used fixed `grid-cols-2/3/4` without mobile fallbacks (layouts would overflow or become unusable on small screens), and removes an unused variable from the contract signing page.

### Modified Files

| File | Change |
|------|--------|
| `web/components/admin/booking-approval-table.tsx` | Stats row: `grid-cols-4` → `grid-cols-2 md:grid-cols-4` |
| `web/components/admin/assignment-analytics-charts.tsx` | Summary cards: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| `web/components/admin/medic-utilisation-charts.tsx` | OOT summary cards (2 instances): `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| `web/components/admin/timesheet-batch-approval.tsx` | Payout summary: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| `web/components/admin/out-of-territory-approval.tsx` | Booking details + travel details (2 instances): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `web/components/invoices/late-payment-tracker.tsx` | Invoice detail grid: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| `web/components/contracts/contract-preview.tsx` | Parties + signatures (2 instances): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `web/components/contracts/contract-detail.tsx` | Client info + booking details (2 instances): `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `web/components/contracts/send-contract-dialog.tsx` | Contract summary grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `web/components/contracts/create-contract-form.tsx` | Booking info + price breakdown: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`, `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| `web/components/booking/shift-config.tsx` | Shift time inputs: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `web/components/bookings/out-of-territory-calculator.tsx` | Travel details grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` |
| `web/app/contracts/[id]/sign/page.tsx` | Removed unused `previousStatus` variable (declared but never referenced) |

### Key Details

- **Mobile-first grid pattern**: All grids now start at `grid-cols-1` (single column on mobile) and scale up at `sm:` (640px) or `md:` (768px) breakpoints using Tailwind's responsive prefix system
- **Admin stat cards**: `grid-cols-4` stat rows now show 2 columns on small screens, preventing horizontal overflow
- **Contract preview**: Provider/Client and signature blocks now stack vertically on mobile instead of side-by-side
- **No visual change on desktop**: All `sm:`/`md:` breakpoints only activate below their threshold — desktop users see the same layout as before
- **Dead code removal**: The `previousStatus` variable in the contract signing page was assigned but never used — safe to remove

---

## Previous Updates — Sprint 16: Fetch Safety, JSON.parse Guards & OG Metadata (2026-02-18)

### Overview

Sprint 16 of the gap analysis: fixes a critical pattern where `response.json()` was called before checking `response.ok` (4 files — crashes when server returns HTML error pages), wraps 2 unprotected `JSON.parse` calls in try/catch (sessionStorage corruption would crash booking flow), and adds Open Graph + Twitter Card metadata to all 5 marketing pages for rich social media sharing previews.

### Modified Files

| File | Change |
|------|--------|
| `web/app/(client)/client/bookings/[id]/page.tsx` | Fixed `response.json()` ordering — now checks `response.ok` first, then parses JSON. Error path uses `.catch(() => ({}))` to handle non-JSON error responses safely. |
| `web/app/(auth)/signup/page.tsx` | Fixed `response.json()` ordering — same pattern: check `response.ok` first, parse error JSON with `.catch()` fallback. |
| `web/components/QuoteBuilder.tsx` | Fixed `response.json()` ordering — split into error path (with `.catch()`) and success path with properly scoped `data` variables. |
| `web/app/contracts/[id]/sign/signature-section.tsx` | Added `.catch(() => ({}))` to error-path `response.json()` call — was already checking `response.ok` first but the JSON parse could still crash on HTML error responses. |
| `web/components/booking/net30-confirmation.tsx` | Wrapped `JSON.parse(sessionStorage)` calls in try/catch — corrupted sessionStorage values would crash the Net-30 confirmation page. Shows user-friendly error message on parse failure. |
| `web/components/booking/payment-form.tsx` | Wrapped `JSON.parse(sessionStorage)` calls in try/catch — corrupted sessionStorage values would crash the payment form. Returns early with error message on parse failure. |
| `web/app/(marketing)/page.tsx` | Added `openGraph` and `twitter` card metadata for rich social sharing previews. |
| `web/app/(marketing)/about/page.tsx` | Added `openGraph` and `twitter` card metadata. |
| `web/app/(marketing)/services/page.tsx` | Added `openGraph` and `twitter` card metadata. |
| `web/app/(marketing)/pricing/page.tsx` | Added `openGraph` and `twitter` card metadata. |
| `web/app/(marketing)/contact/page.tsx` | Added `openGraph` and `twitter` card metadata. |

### Key Details

- **response.json() before response.ok**: If a server returns a 500 HTML error page, calling `.json()` throws `SyntaxError: Unexpected token '<'` — crashing the entire error handling. The fix checks `response.ok` first and uses `.catch(() => ({}))` as a safety net.
- **JSON.parse safety**: sessionStorage values can become corrupted (browser extensions, storage limits, manual tampering). Without try/catch, `JSON.parse` throws a `SyntaxError` that crashes the React component.
- **Open Graph metadata**: Enables rich link previews on Facebook, LinkedIn, Slack, etc. Each marketing page now includes `og:title`, `og:description`, `og:type` and `twitter:card`, `twitter:title`, `twitter:description`.
- **No new dependencies**: All changes use existing Next.js metadata API and standard JavaScript error handling.

---

## Previous Updates — Sprint 15: Date Locale Consistency & Confirm Dialog Replacement (2026-02-18)

### Overview

Sprint 15 of the gap analysis: fixes 5 components that called `toLocaleDateString()` without a locale (defaulting to the browser's locale rather than UK format), and replaces 2 uses of `window.confirm()` with inline two-step confirmation buttons that are more accessible and consistent with the app's design system.

### Modified Files

| File | Change |
|------|--------|
| `web/components/admin/out-of-territory-approval.tsx` | Added `'en-GB'` locale to `toLocaleDateString()` call for booking dates |
| `web/components/admin/medic-roster-table.tsx` | Added `'en-GB'` locale to `toLocaleDateString()` for unavailable-until dates |
| `web/app/(dashboard)/admin/medics/onboarding/[id]/page.tsx` | Added `'en-GB'` locale to 2 `toLocaleDateString()` calls for payslip pay-period dates |
| `web/app/admin/territories/territory-detail.tsx` | Added `'en-GB'` locale to `toLocaleDateString()` for booking shift dates |
| `web/app/admin/territories/assignment-panel.tsx` | Added `'en-GB'` locale to `toLocaleDateString()` for unavailable-until dates |
| `web/components/admin/payout-summary.tsx` | Replaced `window.confirm()` with two-step inline confirmation — first click sets `confirmingPayout` state turning button red with "Confirm — Process X Payouts?" text, second click executes. `onBlur` resets state. |
| `web/components/contracts/template-manager.tsx` | Replaced `window.confirm()` with two-step inline confirmation — first click sets `confirmArchiveId` state turning Archive button to `variant="destructive"` with "Confirm Archive?" text, second click executes. `onBlur` resets state. |

### Key Details

- **UK locale requirement**: All dates in the app must use `toLocaleDateString('en-GB')` to ensure DD/MM/YYYY format — a US-locale browser would otherwise display MM/DD/YYYY which is dangerous for medical shift scheduling
- **Two-step confirmation pattern**: Replaces browser-native `window.confirm()` which is unstyled, blocks the UI thread, and provides poor UX. The new pattern uses React state: first click enters "confirming" mode (button turns red/destructive), second click executes the action. Clicking away (`onBlur`) resets the state.
- **No new dependencies**: All changes use existing React state and UI component variants (`variant="destructive"` on Button)

---

## Previous Updates — Sprint 14: Performance — Static Caching & Anchor Scroll Fix (2026-02-18)

### Overview

Sprint 14 of the gap analysis: adds Next.js static caching (`force-static` + 24h `revalidate`) to 10 pages that are pure static HTML with no data fetching, fixes the cookie policy's duplicate title suffix, and adds `scroll-margin-top` to services page anchor sections so footer links scroll cleanly past the sticky header.

### Modified Files

| File | Changes |
|------|---------|
| `web/app/(marketing)/about/page.tsx` | Added `export const dynamic = 'force-static'` and `export const revalidate = 86400` |
| `web/app/(marketing)/services/page.tsx` | Added static caching exports; added `scroll-mt-20` to vertical section divs for smooth anchor scroll |
| `web/app/(marketing)/contact/page.tsx` | Added static caching exports |
| `web/app/terms-and-conditions/page.tsx` | Added static caching exports |
| `web/app/privacy-policy/page.tsx` | Added static caching exports |
| `web/app/refund-policy/page.tsx` | Added static caching exports |
| `web/app/complaints/page.tsx` | Added static caching exports |
| `web/app/accessibility-statement/page.tsx` | Added static caching exports |
| `web/app/acceptable-use/page.tsx` | Added static caching exports |
| `web/app/cookie-policy/page.tsx` | Added static caching exports; fixed title from `'Cookie Policy \| SiteMedic'` to `'Cookie Policy'` (was missed in Sprint 10) |

### Key Details

- **`force-static` + `revalidate`**: These Next.js exports tell the framework to pre-render the page at build time and serve from cache. `revalidate = 86400` means the page is re-generated at most once every 24 hours (ISR). Without these, Next.js may re-render on every request.
- **10 pages now static**: About, Services, Contact + 7 legal pages. Combined with Homepage and Pricing (already static), all 12 public-facing pages are now CDN-cached.
- **`scroll-mt-20` on service sections**: When navigating to `/services#tv-film` from the footer, the target section now scrolls to 80px below the viewport top, clearing the sticky 64px header. Without this, the section title was hidden behind the header.
- **Cookie policy title fix**: Was `'Cookie Policy | SiteMedic'` which, combined with the root layout template, produced "Cookie Policy | SiteMedic — SiteMedic". Now just `'Cookie Policy'`.
- **Zero TypeScript errors**: Verified with `tsc --noEmit` after all changes

---

## Previous Updates — Sprint 13: Accessibility Improvements (2026-02-18)

### Overview

Sprint 13 of the gap analysis: comprehensive accessibility pass across the codebase. Added `aria-label` attributes to 12 search inputs and 2 icon-only buttons, added keyboard support (role, tabIndex, onKeyDown) to the what3words suggestion listbox, and removed misleading `cursor-pointer` from non-interactive elements.

### Modified Files

| File | Changes |
|------|---------|
| `web/app/platform/users/page.tsx` | Added `aria-label="Search users"` to search input |
| `web/app/platform/subscriptions/page.tsx` | Added `aria-label="Search subscriptions"` to search input |
| `web/app/platform/organizations/page.tsx` | Added `aria-label="Search organizations"` to search input; removed misleading `cursor-pointer` and `hover:scale` from non-clickable org cards |
| `web/components/admin/contact-submissions-table.tsx` | Added `aria-label="Search contact submissions"` to search input |
| `web/components/admin/booking-approval-table.tsx` | Added `aria-label="Search bookings"` to search input |
| `web/components/admin/client-management-table.tsx` | Added `aria-label="Search clients"` to search input |
| `web/components/admin/quote-submissions-table.tsx` | Added `aria-label="Search quote submissions"` to search input |
| `web/components/admin/medic-roster-table.tsx` | Added `aria-label="Search medics"` to search input |
| `web/app/admin/territories/assignment-panel.tsx` | Added `aria-label="Search medics for territory assignment"` to search input |
| `web/components/dashboard/workers-table.tsx` | Added `aria-label="Filter by company"` and `aria-label="Filter by role"` to filter inputs |
| `web/components/dashboard/treatments-table.tsx` | Added `aria-label="Search treatments by worker name"` to search input |
| `web/components/medic/busy-block-form.tsx` | Added `aria-label="Close busy block form"` to icon-only X button |
| `web/components/dashboard/date-range-filter.tsx` | Added `aria-label="Clear date filter"` to icon-only X button |
| `web/components/ui/what3words-input.tsx` | Added `role="listbox"` to `<ul>`, `role="option"` + `aria-selected` + `tabIndex={0}` + `onKeyDown` to suggestion `<li>` items for keyboard navigation |
| `web/app/platform/layout.tsx` | Removed misleading `cursor-pointer` and `hover:bg` from non-interactive user info section |

### Key Details

- **WCAG 2.1 Level A compliance**: All form inputs now have accessible names (via `aria-label`), all interactive elements are keyboard operable, and icon-only buttons have screen reader labels
- **12 search inputs fixed**: Screen readers previously announced these as "edit text" with no context — now each has a descriptive label
- **2 icon-only buttons fixed**: Close/dismiss buttons that only contained `<X />` icons — screen readers announced them as just "button"
- **what3words listbox pattern**: Suggestion dropdown now uses proper ARIA listbox role with keyboard Enter/Space activation
- **Misleading cursor-pointer removed**: 2 non-interactive elements had `cursor-pointer` making them appear clickable — removed to prevent user confusion
- **Zero TypeScript errors**: Verified with `tsc --noEmit` after all changes

---

## Previous Updates — Sprint 12: Security Fix, Type Safety & Not-Found Pages (2026-02-18)

### Overview

Sprint 12 of the gap analysis: fixes a **critical security vulnerability** in the mileage payout API (unauthenticated endpoint), replaces `any` types in the CSV export utility with proper interfaces, and adds branded 404 pages for admin and client portal areas.

### New Files

| File | Purpose |
|------|---------|
| `web/app/admin/not-found.tsx` | Admin 404 page — dark theme, links to Bookings and Settings |
| `web/app/(client)/client/not-found.tsx` | Client portal 404 page — links to My Bookings and Support |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/api/payouts/mileage/route.ts` | **SECURITY FIX**: Added `createClient()` + `supabase.auth.getUser()` + `requireOrgId()` authentication. Previously had ZERO auth — anyone could POST to trigger mileage calculations for any medic. Also changed `err: any` to `err: unknown` with proper `instanceof Error` check. |
| `web/lib/utils/export-csv.ts` | **Type safety**: Added `BookingWithRelations` import for `exportBookingsCSV()`. Created `InvoiceExportRow` interface for `exportInvoicesCSV()` (handles partial Supabase select). Created `WorkerForExport` type extending `Worker` with optional `certification_status`. Removed all `as any` casts and `any[]` parameter types. Fixed `clients` FK join handling (array vs object). |

### Key Details

- **Mileage API was unauthenticated**: The `/api/payouts/mileage` endpoint's JSDoc said "Access: org_admin only" but had no actual auth check. Any unauthenticated HTTP client could trigger mileage calculations for any medic ID. Now requires valid session + org membership.
- **CSV export type safety**: The `exportBookingsCSV` and `exportInvoicesCSV` functions previously accepted `any[]`, hiding type mismatches. The revenue page passes partial booking data (6 fields), so a dedicated `InvoiceExportRow` interface was created instead of reusing the full `BookingWithRelations` type.
- **`WorkerForExport` type**: The `Worker` interface doesn't have `certification_status` (it comes from a joined query), so `(w as any).certification_status` was replaced with a proper intersection type `Worker & { certification_status?: string | null }`.
- **Not-found pages**: Admin uses dark theme matching the admin panel; client portal uses light theme and directs to bookings/support.
- **Zero TypeScript errors**: Verified with `tsc --noEmit` after all changes

---

## Previous Updates — Sprint 11: Loading States, Error Boundaries & Link Fixes (2026-02-18)

### Overview

Sprint 11 of the gap analysis: adds skeleton loading states to 7 key admin and client portal pages, error boundary components for the client portal and medic dashboard route groups, fixes raw `<a>` tags that should use Next.js `<Link>` for client-side routing, and replaces a hardcoded placeholder phone number with environment variable support.

### New Files

| File | Purpose |
|------|---------|
| `web/app/admin/bookings/loading.tsx` | Skeleton loading state — stats row + 6-column table |
| `web/app/admin/medics/loading.tsx` | Skeleton loading state — 5-column table |
| `web/app/admin/customers/loading.tsx` | Skeleton loading state — 5-column table |
| `web/app/admin/contracts/loading.tsx` | Skeleton loading state — 6-column table |
| `web/app/admin/timesheets/loading.tsx` | Skeleton loading state — 5-column table |
| `web/app/(client)/client/bookings/loading.tsx` | Skeleton loading state — filter tabs + booking cards |
| `web/app/(client)/client/invoices/loading.tsx` | Skeleton loading state — invoice cards |
| `web/app/(client)/client/error.tsx` | Error boundary for client portal — retry button + support contact |
| `web/app/(dashboard)/error.tsx` | Error boundary for medic dashboard — retry + dashboard link |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/(dashboard)/contracts/create/page.tsx` | Added `Link` import; changed 2 breadcrumb `<a href>` tags to `<Link href>` for `/dashboard` and `/contracts` routes |
| `web/components/dashboard/worker-gdpr-form.tsx` | Added `Link` import; changed `<a href="/admin/gdpr">` to `<Link href="/admin/gdpr">` |
| `web/app/(client)/client/support/page.tsx` | Replaced hardcoded phone `+443301234567` with `process.env.NEXT_PUBLIC_SUPPORT_PHONE` (with fallback); display text uses `NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY` env var |

### Key Details

- **Loading states**: Next.js `loading.tsx` files create automatic Suspense boundaries — the skeleton UI shows instantly while the page component fetches data, eliminating blank screens during load
- **Skeleton pattern**: Uses the existing `@/components/ui/skeleton` component (animate-pulse shimmer). Admin pages use table-style skeletons; client pages use card-style skeletons matching each page's layout
- **Error boundaries**: `error.tsx` files catch rendering errors within their route segment and display a fallback UI instead of crashing the whole app. Both include retry buttons and error digest IDs for debugging
- **`<a>` → `<Link>` fix**: Raw `<a>` tags for internal routes cause full page reloads. Next.js `<Link>` enables client-side navigation (faster, no reload, prefetching). 3 instances fixed across 2 files
- **Phone env vars**: `NEXT_PUBLIC_SUPPORT_PHONE` (E.164 format for `tel:` href) and `NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY` (formatted for display) — both fall back to placeholder values when not set
- **Zero TypeScript errors**: Verified with `tsc --noEmit` after all changes

---

## Previous Updates — Sprint 10: Page Metadata & SEO Titles (2026-02-18)

### Overview

Sprint 10 of the gap analysis: adds proper `<title>` and `<meta description>` tags to all pages that were missing them. The Next.js root layout uses a `template: '%s — CompanyName'` pattern, so page-level exports only need a short title. For `'use client'` pages (which can't export metadata), route-level `layout.tsx` files were created. Legal pages had hardcoded `| SiteMedic` suffixes removed to prevent double branding (e.g., "Terms and Conditions | SiteMedic — SiteMedic").

### New Files

| File | Purpose |
|------|---------|
| `web/app/(client)/client/bookings/layout.tsx` | Metadata layout — title: "My Bookings" |
| `web/app/(client)/client/invoices/layout.tsx` | Metadata layout — title: "My Invoices" |
| `web/app/(client)/client/account/layout.tsx` | Metadata layout — title: "My Account" |
| `web/app/(client)/client/support/layout.tsx` | Metadata layout — title: "Help & Support" |
| `web/app/admin/bookings/layout.tsx` | Metadata layout — title: "Manage Bookings" |
| `web/app/admin/medics/layout.tsx` | Metadata layout — title: "Manage Medics" |
| `web/app/admin/customers/layout.tsx` | Metadata layout — title: "Customers" |
| `web/app/admin/revenue/layout.tsx` | Metadata layout — title: "Revenue" |
| `web/app/admin/settings/layout.tsx` | Metadata layout — title: "Settings" |
| `web/app/admin/timesheets/layout.tsx` | Metadata layout — title: "Timesheets" |
| `web/app/admin/contracts/layout.tsx` | Metadata layout — title: "Contracts" |
| `web/app/admin/schedule-board/layout.tsx` | Metadata layout — title: "Schedule Board" |
| `web/app/admin/analytics/layout.tsx` | Metadata layout — title: "Analytics" |
| `web/app/admin/territories/layout.tsx` | Metadata layout — title: "Territories" |
| `web/app/(booking)/book/confirmation/layout.tsx` | Metadata layout — title: "Booking Confirmation" |
| `web/app/(booking)/book/payment/layout.tsx` | Metadata layout — title: "Payment" |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/(marketing)/page.tsx` | Added `Metadata` import and metadata export with title "Professional Paramedics for Events & Worksites" and description |
| `web/app/(marketing)/services/page.tsx` | Added metadata export with title "Services" and description |
| `web/app/(marketing)/about/page.tsx` | Added metadata export with title "About Us" and description |
| `web/app/(marketing)/contact/page.tsx` | Added metadata export with title "Contact" and description |
| `web/app/(marketing)/pricing/page.tsx` | Fixed title from `'Pricing - Apex Safety Group'` to `'Pricing'` (avoids double branding with root layout template) |
| `web/app/terms-and-conditions/page.tsx` | Removed `\| SiteMedic` suffix from title |
| `web/app/privacy-policy/page.tsx` | Removed `\| SiteMedic` suffix from title |
| `web/app/refund-policy/page.tsx` | Removed `\| SiteMedic` suffix from title |
| `web/app/complaints/page.tsx` | Removed `\| SiteMedic` suffix from title |
| `web/app/accessibility-statement/page.tsx` | Removed `\| SiteMedic` suffix from title |
| `web/app/acceptable-use/page.tsx` | Removed `\| SiteMedic` suffix from title |

### Key Details

- **Root layout template pattern**: The root layout uses `template: '%s — SiteMedic'`, so every page title automatically gets the brand suffix — pages should NOT include it themselves
- **Client component metadata pattern**: `'use client'` pages can't export `metadata` (Next.js restriction). Solution: create a minimal `layout.tsx` in the same route folder that exports metadata and passes `children` through
- **16 new layout files**: Created for client portal (4), admin panel (10), and booking flow (2) routes
- **6 legal pages fixed**: Removed hardcoded `| SiteMedic` suffix that produced double branding like "Terms and Conditions | SiteMedic — SiteMedic"
- **5 marketing pages**: Added proper titles and SEO descriptions to homepage, services, about, contact, and fixed pricing
- **Zero TypeScript errors**: Verified with `tsc --noEmit` after all changes

---

## Previous Updates — Sprint 9: Final alert() & reload() Cleanup (2026-02-18)

### Overview

Sprint 9 of the gap analysis: eliminates ALL remaining browser `alert()` calls (8 total) and `window.location.reload()` calls (3 total) from the codebase. After this sprint, zero `alert()` and zero `window.location.reload()` remain in any `.ts`/`.tsx` file.

### New Files

| File | Purpose |
|------|---------|
| `web/components/medics/ir35-section-client.tsx` | Client wrapper for IR35Form in server-rendered onboarding pages. Uses `router.refresh()` instead of `window.location.reload()` for the `onComplete` callback. Accepts `notCompleteMessage` prop for theme-adaptive styling (light vs dark admin panels). |

### Modified Files

| File | Changes |
|------|---------|
| `web/components/dashboard/MotorsportIncidentReportCard.tsx` | `alert()` → `toast.error()` for PDF generation failure |
| `web/components/dashboard/FAIncidentReportCard.tsx` | `alert()` → `toast.error()` for PDF generation failure |
| `web/components/dashboard/EventIncidentReportCard.tsx` | `alert()` → `toast.error()` for PDF generation failure |
| `web/app/(dashboard)/riddor/[id]/page.tsx` | `alert()` → `toast.error()` for F2508 PDF generation failure |
| `web/components/admin/payout-summary.tsx` | `alert()` → `toast.error()` for "No medics selected" validation |
| `web/components/QuoteBuilder.tsx` | 2x `alert()` → `toast.error()` for address validation and form validation |
| `web/app/(dashboard)/admin/medics/onboarding/[id]/page.tsx` | Replaced `IR35Form` import with `IR35SectionClient`. Removed 2x `window.location.reload()` (IR35Form callback + "Update IR35 Status" button) |
| `web/app/admin/medics/[id]/onboarding/page.tsx` | Same — replaced `IR35Form` with `IR35SectionClient`, removed `window.location.reload()` |

### Key Details

- **Zero alert() calls in codebase**: All 20+ `alert()` calls across Sprints 8 and 9 have been replaced with `toast` from sonner
- **Zero window.location.reload() in codebase**: All 8+ `window.location.reload()` calls have been replaced with either `router.refresh()`, `fetchData()` re-fetches, or the new `IR35SectionClient` wrapper
- **IR35SectionClient pattern**: Solves the server-component-can't-use-hooks problem by wrapping the IR35Form in a client component that owns the `useRouter` hook. Passes children as server-rendered content for the "completed" state.
- **Zero TypeScript errors maintained**

---

## Previous Updates — Sprint 8: UX Polish — Toast Notifications (2026-02-18)

### Overview

Sprint 8 of the gap analysis: replaces all browser `alert()` calls and `window.location.reload()` patterns in admin-facing components with proper `toast` notifications from sonner and React-native data refresh patterns. This is a UX polish sprint — no new features, just making existing features feel professional and modern.

### Modified Files

| File | Changes |
|------|---------|
| `web/components/admin/out-of-territory-approval.tsx` | Replaced 3 `alert()` with `toast.success()`/`toast.error()`. Replaced 2 `window.location.reload()` with `await fetchBookingData()` to re-fetch data without full page reload. |
| `web/components/invoices/late-payment-tracker.tsx` | Replaced 4 `alert()` with `toast.success()`/`toast.error()`. Component already re-fetches data after actions (no reload needed). |
| `web/components/contracts/template-manager.tsx` | Replaced 3 `alert()` with `toast.success()`/`toast.error()`. Replaced 3 `window.location.reload()` with `router.refresh()` (Next.js server component revalidation). Added `useRouter` import. |
| `web/components/dashboard/reports-list.tsx` | Replaced 2 `alert()` with `toast.error()`. |

### Key Details

- **12 alert() calls eliminated** across 4 components — all replaced with non-blocking toast notifications that match the app's design system (sonner)
- **5 window.location.reload() calls eliminated** — replaced with either `router.refresh()` (for server-rendered pages like contracts) or `await fetchBookingData()` (for client components that manage their own data)
- **No visual regressions**: Toast notifications use the same patterns already established in the client account page and other components
- **Zero TypeScript errors maintained**: All changes compile cleanly

---

## Previous Updates — Sprint 7: Contract Signing Fix & TypeScript Cleanup (2026-02-18)

### Overview

Sprint 7 of the gap analysis: fixes the contract signing page and API (missed in Sprint 5's contracts fix), resolves all TypeScript compilation errors to achieve a zero-error build.

### Critical Bug Fixes

| File | Bug | Fix |
|------|-----|-----|
| `web/app/contracts/[id]/sign/page.tsx` | Supabase select query used 7 non-existent columns: `service_type`, `scheduled_date`, `total_price`, `address_line1`, `address_line2`, `city`, `postcode`, `name`, `email`, `phone`. **This broke the public contract signing page — clients clicking a signing link saw empty/missing data.** | Updated to real columns: `event_vertical`, `shift_date`, `total`/`subtotal`/`vat`, `site_name`, `site_address`, `site_postcode`, `company_name`, `contact_email`, `contact_phone` |
| `web/app/api/contracts/[id]/sign/route.ts` | Selected `email` from clients table (non-existent) and used `contract.client?.email` for the audit trail `signed_by_email` field | Changed to `contact_email` in both the select query and the usage |

### TypeScript Error Fixes

| File | Error | Fix |
|------|-------|-----|
| `web/lib/queries/client/bookings.ts` (lines 100, 176) | TS2352: `medics` typed as single object but Supabase FK join returns array — caused unsafe type assertion errors | Changed `medics` type from `{ ... } \| null` to `{ ... }[] \| null` to match actual Supabase return shape |
| `web/lib/territory/__tests__/auto-assignment-success-rate.test.ts` (line 125) | TS2322: Missing `region` in territory assignment fixtures. Also had extra `recent_metrics` and `org_id` properties not on `MedicWithMetrics` type | Added `region: 'Test Region'`, removed non-existent properties, used `Partial<MedicWithMetrics>[]` for flexible test fixtures |

### Key Details

- **Zero TypeScript errors**: The codebase now compiles with `tsc --noEmit` producing zero errors (previously had 3 errors across 2 files)
- **Contract signing now works end-to-end**: The public signing page (`/contracts/[token]/sign`) correctly loads booking and client data from the database. Previously, all booking/client fields would be null due to querying non-existent columns.
- **Audit trail integrity**: Contract signatures now correctly record `signed_by_email` from the client's `contact_email` column instead of storing null.

---

## Previous Updates — Sprint 6: Column Name Fixes & Client Support Page (2026-02-18)

### Overview

Sprint 6 of the gap analysis: fixes widespread `total_amount` → `total` column name bugs across invoices, revenue dashboard, CSV exports, and out-of-territory approval. Also fixes wrong client column references in invoice emails. Adds a client support/help page with FAQs and contact info.

### Critical Bug Fixes

| File | Bug | Fix |
|------|-----|-----|
| `web/app/api/invoices/generate/route.ts` | Used `booking.total_amount` (non-existent column, 3 occurrences) — invoices would fail or show £0.00. Also used `client.email` and `client.name` which don't exist on clients table. VAT was reverse-calculated via `total / 1.2` instead of using actual `subtotal`/`vat` columns. | Changed `total_amount` → `total`, `client.email` → `client.contact_email`, `client.name` → `client.contact_name \|\| client.company_name`. Replaced VAT reverse-calculation with actual `subtotal`/`vat`/`total` column sums. |
| `web/app/admin/revenue/page.tsx` | Supabase select query used `total_amount` (non-existent column) — CSV export would contain empty total fields | Changed to `total` in select string |
| `web/lib/utils/export-csv.ts` | Both `exportBookingsCSV` and `exportInvoicesCSV` referenced `b.total_amount` — exported CSVs would have empty Total columns | Changed to `b.total` (2 occurrences) |
| `web/components/admin/out-of-territory-approval.tsx` | `Booking` interface defined `total_amount: number` and display used `booking.total_amount` — component would show undefined for total | Changed interface to `total: number` and all display references to `booking.total` |

### New Files

| File | Purpose |
|------|---------|
| `web/app/(client)/client/support/page.tsx` | Client self-service support page with FAQ accordion (11 questions across 4 categories), contact cards (email + phone), office hours banner, and category filter pills. Reduces admin support burden. |

### Modified Files

| File | Changes |
|------|---------|
| `web/components/client/ClientNav.tsx` | Added "Help & Support" link with `HelpCircle` icon to client sidebar navigation |
| `web/app/api/invoices/generate/route.ts` | Fixed 3x `total_amount` → `total`, fixed client field references, replaced VAT reverse-calculation with actual column sums |
| `web/app/admin/revenue/page.tsx` | Fixed select query `total_amount` → `total` |
| `web/lib/utils/export-csv.ts` | Fixed `b.total_amount` → `b.total` in both bookings and invoices CSV exports |
| `web/components/admin/out-of-territory-approval.tsx` | Fixed `Booking` interface and display to use `total` instead of `total_amount` |

### Key Details

- **Column name pattern**: Multiple files across the codebase referenced `total_amount` which doesn't exist on the bookings table. The actual column is `total`. This was a widespread copy-paste error causing silent runtime failures (undefined values, £0.00 displays, empty CSV columns).
- **Invoice VAT accuracy**: The invoice generator was calculating `subtotal = total / 1.2` which is a lossy approximation. Now uses actual `subtotal` and `vat` columns from each booking, which are computed correctly at booking creation time.
- **Client support page**: 11 FAQs covering bookings (4), invoices (3), account (2), and general (2). Includes cancellation policy, payment methods, medic qualifications, and how-to guides. Category filter pills for quick navigation. Contact cards with email and phone. Office hours banner with urgent contact info.

---

## Previous Updates — Sprint 5: Data Integrity, Contracts Fix & Cancellation Email (2026-02-18)

### Overview

Sprint 5 of the gap analysis: fixes critical data integrity bugs in the contracts system and confirmation emails, adds a cancellation email notification, and persists admin notification preferences to the database.

### Critical Bug Fixes

| File | Bug | Fix |
|------|-----|-----|
| `web/app/api/email/booking-confirmation/route.ts:168` | Used `booking.total_price` (non-existent column) — confirmation emails showed £0.00 | Changed to `booking.total` |
| `web/lib/contracts/queries.ts` | Both queries selected non-existent columns from bookings table: `total_price`, `address_line1`, `address_line2`, `city`, `postcode`, `service_type`, `scheduled_date`. Also wrong client columns: `name`, `email`, `phone`. **This broke the entire contracts feature at runtime.** | Mapped to real columns: `total`, `subtotal`, `vat`, `site_address`, `site_postcode`, `site_name`, `event_vertical`, `shift_date`, and `company_name`, `contact_email`, `contact_phone` |
| `web/lib/contracts/types.ts` | `ContractWithRelations` interface had wrong field names matching the bad queries | Updated to match real DB schema |
| `web/components/contracts/contract-viewer.tsx` | Displayed wrong fields (`address_line1`, `city`, `total_price`, `service_type`, `scheduled_date`) | Updated to `site_address`, `site_postcode`, `total`/`subtotal`/`vat`, `event_vertical`, `shift_date` |
| `web/components/contracts/contract-detail.tsx` | Same wrong field references for client and booking data | Updated all references to match corrected types |
| `web/components/contracts/contracts-table.tsx` | Table columns, search filter, and SendContractDialog mapping all used wrong field names | Updated `client.name` → `company_name`, `booking.address_line1` → `site_name`, `booking.total_price` → `total` |
| `web/app/(dashboard)/contracts/[id]/page.tsx` | Page subtitle used `client?.name` and `booking?.address_line1` | Changed to `company_name` and `site_name` |
| `web/app/admin/contracts/[id]/page.tsx` | Same subtitle issue | Same fix |

### New Files

| File | Purpose |
|------|---------|
| `web/lib/email/templates/booking-cancelled-email.tsx` | React Email template for booking cancellation confirmation. Shows booking details, cancellation reason, and refund amount with policy explanation. Red-tinted details box. Org branding support. |
| `web/lib/email/send-booking-cancelled.ts` | Fire-and-forget function to send cancellation email. Fetches booking + client + org branding, renders template, sends via Resend. Same pattern as `send-booking-received.ts`. |
| `supabase/migrations/137_notification_preferences.sql` | Adds `notification_preferences` JSONB column to `org_settings` table. Default: all notifications enabled. |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/api/bookings/[id]/cancel/route.ts` | Added `sendBookingCancelledEmail()` call (fire-and-forget) after successful cancellation |
| `web/app/api/admin/settings/route.ts` | Added `notification_preferences` to request body type, validation (must be object with known boolean keys), and update payload builder |
| `web/app/admin/settings/page.tsx` | Removed localStorage persistence for notification prefs. Now loads from API response (`data.notification_preferences`) and saves via PUT `/api/admin/settings`. Toggle handler is now async with optimistic update + revert on failure. |

### Key Details

- **Contracts pricing now accurate**: The contract viewer/detail now shows real subtotal + VAT + total from the bookings table instead of reverse-calculating from a non-existent `total_price` field
- **Cancellation email flow**: Client cancels booking → API processes cancellation + refund → `sendBookingCancelledEmail()` fires asynchronously → client receives branded email with refund details and policy explanation
- **Notification preferences**: Shared across all admin users in the org (DB-backed). Supports 5 notification types: booking confirmations, RIDDOR alerts, certification expiry, payout summaries, cashflow alerts

---

## Previous Updates — Sprint 4: SEO, Duplicate Detection & Polish (2026-02-18)

### Overview

Sprint 4 of the gap analysis: adds SEO fundamentals (robots.txt, sitemap.xml) and prevents duplicate bookings.

### New Files

| File | Purpose |
|------|---------|
| `web/app/robots.ts` | Generates `robots.txt`. Allows marketing/legal crawling, blocks admin/client/medic/API routes |
| `web/app/sitemap.ts` | Generates `sitemap.xml`. Lists 13 public pages with priority and change frequency |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/api/bookings/create-payment-intent/route.ts` | Duplicate detection — rejects if non-cancelled booking exists for same client + date + postcode (HTTP 409) |
| `web/app/api/bookings/create/route.ts` | Same duplicate detection for Net 30 endpoint |

### Key Features

1. **robots.txt**: Blocks `/admin/`, `/client/`, `/medic/`, `/platform/`, `/api/`, `/setup/`, `/book/payment`, `/book/confirmation`. Links to sitemap.
2. **sitemap.xml**: Homepage (1.0), services+pricing (0.9), about+contact (0.8), book (0.7), 7 legal pages (0.3-0.4).
3. **Duplicate Booking Detection**: Checks `client_id + shift_date + site_postcode + org_id` before creating. Returns 409 with user-friendly message.

---

## Recent Updates — Sprint 3: Client Portal Improvements (2026-02-18)

### Overview

Sprint 3 of the gap analysis: transforms the client portal from read-only to interactive. The account page is now editable, bookings can be cancelled with policy-based refunds, and the cancellation flow includes Stripe refund processing.

### Modified Files

| File | Changes |
|------|---------|
| `web/app/(client)/client/account/page.tsx` | **Rewrite** — added inline editing for company name, contact name, email, phone, and billing address. Edit/Save/Cancel buttons with Supabase direct update. Payment info remains read-only (admin-controlled). Toast notifications for save success/failure |
| `web/app/(client)/client/bookings/[id]/page.tsx` | **Enhanced** — added Cancel Booking button for pending/confirmed bookings. Inline cancellation dialog with refund policy display, refund amount calculation, optional reason textarea, and confirm/keep buttons. Redirects to bookings list on success with toast |
| `web/app/api/bookings/[id]/cancel/route.ts` | **New file** — cancellation API endpoint. Validates booking ownership via client_id + org_id. Enforces refund policy (7+ days=100%, 3-6 days=50%, <72hrs=0%). Updates booking with cancellation metadata. Initiates Stripe refund if payment exists (fire-and-forget) |

### Key Features

1. **Editable Client Account Page**: The account page now has an Edit button in the header. Clicking it switches all fields (company name, contact name, email, phone, billing address) to input fields. Save persists directly to the `clients` table via Supabase. Cancel reverts to the last saved values. Payment terms, credit limit, and member-since remain read-only (these are admin-controlled business settings). The "contact support" card at the bottom is updated to say "Need to change payment terms or credit limit?" since other fields are now self-service.

2. **Booking Cancellation Flow**: The booking detail page shows a "Cancel Booking" button (red outline, with XCircle icon) for bookings with status `pending` or `confirmed`. Clicking opens an inline cancellation dialog that shows:
   - Full cancellation policy (7+ days = 100%, 3-6 days = 50%, <72hrs = no refund)
   - Calculated refund amount with colour coding (green=100%, amber=50%, red=0%)
   - Optional reason textarea
   - "Confirm Cancellation" (destructive variant) and "Keep Booking" buttons
   - Loading state during API call

   On success, shows a toast with the refund amount, invalidates React Query caches, and redirects to the bookings list.

3. **Cancellation API Endpoint** (`POST /api/bookings/[id]/cancel`):
   - Authenticates user, finds their client record, verifies booking ownership
   - Only allows cancellation of `pending` or `confirmed` bookings
   - Calculates refund using `date-fns` `differenceInDays` against shift date
   - Updates booking: `status='cancelled'`, `cancelled_at`, `cancellation_reason`, `cancelled_by` (user ID), `refund_amount`
   - Looks up Stripe `payment_intent_id` from `payments` table; if found and refund > 0, creates a Stripe partial/full refund (fire-and-forget — failure logged but doesn't block cancellation)
   - Returns `{ success, refundPercent, refundAmount }`

### Technical Notes

- Account edit uses direct Supabase client update (no API route needed — RLS handles auth)
- Cancellation API uses dynamic import for Stripe server to avoid loading Stripe SDK when no refund is needed
- React Query cache invalidation ensures bookings list and detail page reflect cancellation immediately
- Refund calculation mirrors the refund policy page at `/refund-policy` exactly
- Stripe refund is fire-and-forget: if it fails, the booking is still marked cancelled and admin can process the refund manually
- All changes pass TypeScript compilation with zero errors

---

## Recent Updates — Admin Google Calendar Integration Overview (2026-02-18)

### Overview

Adds a "Google Calendar Integration" section to both the web admin settings page (`/admin/settings`) and the mobile app settings screen (`app/(tabs)/settings.tsx`). Gives admins at-a-glance visibility into whether Google OAuth credentials are configured and which medics have connected their Google Calendar for 2-way sync. Medics see their own connection status on mobile.

### New Files

| File | Purpose |
|------|---------|
| `web/app/api/admin/google-calendar-status/route.ts` | `GET` endpoint returning credential health (`credentialsConfigured: boolean`), configured `redirectUri`, and an array of all org medics with their GCal connection status (`connected: boolean`). Uses `requireOrgId()` for org-scoped auth. Queries `medics` + `medic_preferences` tables. No secrets are exposed |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/admin/settings/page.tsx` | Added "Google Calendar Integration" section between Payout Configuration and CQC Compliance. New state variables (`gcalLoading`, `gcalCredentialsConfigured`, `gcalRedirectUri`, `gcalMedics`). Fetches `/api/admin/google-calendar-status` on mount. Displays: credentials status card (green/red), redirect URI reference box, and medic sync table with Connected/Not Connected badges. Added `Calendar`, `CheckCircle2`, `XCircle` icon imports |
| `app/(tabs)/settings.tsx` | Added "Google Calendar" section to mobile app settings screen (before Security section). Admin view: lists all medics with Connected/Not Connected badges queried via Supabase (`medics` + `medic_preferences`). Medic view: shows own connection status with hint to connect via web portal. New styles: `gcalMedicRow`, `gcalBadge`, `gcalBadgeConnected/Disconnected`, `gcalSummary`, `gcalHint` |
| `FEATURES.md` | Documented the new Google Calendar integration overview for both web and mobile |

### Key Features

1. **OAuth Credentials Status Card**: Green "Configured" or red "Not Configured" banner showing whether `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars are set. Shows "Ready" or "Action Required" badge. No secrets are exposed to the client — only a boolean check.

2. **Redirect URI Reference**: If `GOOGLE_REDIRECT_URI` is configured, displays the URI in a reference box so admins can verify it matches their Google Cloud Console settings.

3. **Medic Connection Table**: Lists all medics in the org with their Google Calendar connection status (Connected / Not Connected) from `medic_preferences.google_calendar_enabled`. Shows count summary (e.g., "2 of 5 medics connected"). Medics connect their calendar from their own profile page.

4. **Admin API Endpoint**: `GET /api/admin/google-calendar-status` — org-scoped via `requireOrgId()`. Fetches medics and their preferences in two efficient queries (one for medics, one batch query for preferences). Returns structured JSON for the settings page.

5. **Mobile App GCal Section**: Added to the Expo settings screen (`app/(tabs)/settings.tsx`). Admin view shows all medics with Connected/Not Connected pill badges and a count summary. Medic view shows their own calendar sync status with a hint to connect via the web portal (`/medic/profile`). Queries Supabase directly (same pattern as existing org settings fetch).

### Technical Notes

- API uses `requireOrgId()` pattern consistent with other admin endpoints (`/api/admin/settings`, `/api/admin/branding`)
- Medic preferences are fetched in a single `.in()` query filtered to `google_calendar_enabled=true` for efficiency
- The endpoint is read-only — admins cannot modify GCal settings from here. Medics manage their own connection from `/medic/profile`
- Web section uses the same design system as other settings sections (gray-800/50 cards, backdrop-blur, gradient borders)
- Mobile section uses the same card/badge pattern as existing Organisation and Status sections (white cards, pill badges, slate/green colour palette)
- Mobile queries Supabase directly (no API route needed) — consistent with how org settings are already fetched in the mobile app

---

## Recent Updates — Sprint 2: Security, Error Handling & Dead Code Cleanup (2026-02-18)

### Overview

Sprint 2 of the gap analysis: hardens payment security with server-side pricing recalculation, adds Stripe idempotency, creates branded error/404 pages, and removes confirmed dead code.

### Modified Files

| File | Changes |
|------|---------|
| `web/app/api/bookings/create-payment-intent/route.ts` | **Security fix** — now recalculates pricing server-side using `org_settings.base_rate` and rejects requests where client-sent total diverges by >GBP0.01. Stores server-calculated values in DB and charges server-calculated amount to Stripe. Added idempotency key (`pi_booking_{id}`) to prevent duplicate PaymentIntents |
| `web/app/error.tsx` | **New file** — global error boundary for all routes. Shows branded "Something went wrong" page with Try Again + Go to Homepage buttons. Displays error digest ID for debugging |
| `web/app/not-found.tsx` | **New file** — branded 404 page with "Page not found" message and links to homepage and contact page. Replaces default Next.js 404 |

### Deleted Files (Dead Code)

| File | Reason |
|------|--------|
| `web/lib/org-labels.ts` | `useOrgLabels()` hook and `getLabelsForVertical()` — exported but never imported anywhere in codebase |
| `web/lib/pdf/incident-report-dispatcher.ts` | `generateIncidentReportPDF()` — exported but never imported. PDF generation handled directly by Edge Functions |
| `web/components/payments/payment-status.tsx` | `PaymentStatus` component — exported but never imported anywhere |
| `services/taxonomy/vertical-outcome-labels.ts` (partial) | Removed `getLocationLabel()` and `getEventLabel()` exports — never imported. Other exports in same file (`getOutcomeLabel`, `getVerticalOutcomeCategories`, `getPatientLabel`) retained as they are actively used by mobile app |

### Key Features

1. **Server-Side Pricing Recalculation (Security)**: The `create-payment-intent` API now loads the org's `base_rate` from `org_settings`, calls `calculateBookingPrice()` with server-side values, and compares the result against client-sent pricing. If the total differs by more than GBP0.01 (rounding tolerance), the request is rejected with a 400 error. The server-calculated pricing is stored in the booking record and used for the Stripe charge amount — client-sent values are no longer trusted.

2. **Stripe Idempotency Key**: PaymentIntent creation now includes `idempotencyKey: pi_booking_{bookingId}`. This prevents duplicate charges if the client double-clicks the pay button or retries on network errors. Stripe will return the same PaymentIntent for the same idempotency key within 24 hours.

3. **Global Error Boundary**: `web/app/error.tsx` catches unhandled errors across all non-admin routes (admin has its own specialised boundary). Shows a clean branded page with retry and homepage navigation. Logs errors to console and displays the error digest ID for cross-referencing with server logs.

4. **Branded 404 Page**: `web/app/not-found.tsx` replaces the default Next.js 404 with a branded page showing large "404" text, a clear message, and CTA buttons to homepage and contact page. Uses the same design system (Tailwind, blue-600 accents, slate tones).

5. **Dead Code Removal**: 4 files/exports removed — all confirmed dead through grep analysis (defined but never imported). Reduces codebase maintenance burden and eliminates confusion about which label functions are canonical.

### Technical Notes

- `calculateBookingPrice` from `web/lib/booking/pricing.ts` is now used on both client and server — true shared pricing logic
- Idempotency key is scoped to booking ID, so each booking can only have one PaymentIntent
- Error boundary uses `useEffect` for error logging (client component requirement)
- 404 page is a server component (no `'use client'` directive) for optimal performance
- All changes pass TypeScript compilation with zero errors

---

## Recent Updates — Platform Admin Org Activation (2026-02-18)

### Overview

Platform admin activation queue and API route for reviewing and approving new org signups. This is the "human in the loop" quality control step. Platform admin sees pending orgs (paid but not activated), assigns subdomains for Growth/Enterprise tiers, and activates them — which sets `onboarding_completed=true`, unlocks middleware gate, and sends welcome email.

### New Files

| File | Purpose |
|------|---------|
| `web/app/api/platform/organizations/activate/route.ts` | POST handler for org activation. Auth check (platform_admin role), slug validation/uniqueness for Growth/Enterprise, sets `onboarding_completed=true`, fetches org admin profile for welcome email, calls `sendWelcomeEmail()`. Returns success with slug and email status |

### Modified Files

| File | Changes |
|------|---------|
| `web/app/platform/organizations/page.tsx` | Added pending activation queue above search bar. Fetches orgs with `onboarding_completed=false` and active subscription. Shows company name (from org_branding join), tier badge (colour-coded), signup date, Stripe Dashboard link, slug input (Growth/Enterprise), and Activate button with loading state. Removes org from pending list on successful activation and refreshes active orgs |
| `FEATURES.md` | Updated with platform admin activation documentation |

### Key Features

- **Pending Activation Queue**: Amber-themed section at top of organizations page showing orgs awaiting manual review. Only appears when pending orgs exist
- **Tier Badges**: Colour-coded badges — Starter (gray), Growth (blue), Enterprise (purple) — on both pending and active org cards
- **Slug Assignment**: Text input for Growth/Enterprise orgs to set subdomain (e.g., `my-company.sitemedic.co.uk`). Pre-populated with slugified company name. Server validates format (3-30 chars, lowercase alphanumeric + hyphens) and uniqueness
- **Stripe Dashboard Link**: Direct link to customer in Stripe test dashboard for payment verification
- **Activation API**: `POST /api/platform/organizations/activate` — requires `platform_admin` role, validates slug for Growth/Enterprise, sets `onboarding_completed=true`, sends welcome email
- **Welcome Email Integration**: On activation, fetches org admin profile (name + email) and org branding (company name), sends branded welcome email via Resend
- **Optimistic UI**: Org removed from pending queue immediately on activation success; active orgs list refreshed in background
- **Error Handling**: Toast notifications for success/failure, loading spinners during activation, validation messages for missing/invalid slugs

### Activation Flow

```
Platform Admin visits /platform/organizations
-> Sees amber "Pending Activation" section with new signups
-> Reviews org details, checks Stripe Dashboard link
-> For Growth/Enterprise: enters/confirms subdomain slug
-> Clicks "Activate"
-> API validates platform_admin role
-> API validates slug format + uniqueness (Growth/Enterprise)
-> API sets onboarding_completed=true (+ slug for Growth/Enterprise)
-> API fetches org admin profile + branding
-> API sends welcome email
-> Org moves from pending queue to active orgs grid
-> Org admin's middleware gate unlocks -> redirected to /admin
```

---

## Recent Updates — Post-Payment Onboarding Wizard (2026-02-18)

### Overview

Post-payment onboarding flow consisting of a success page that polls for Stripe webhook confirmation, a branding setup wizard for pre-activation customisation, and middleware routing that gates pending-activation orgs away from the dashboard.

### New Files

| File | Purpose |
|------|---------|
| `web/app/onboarding/layout.tsx` | Minimal wizard layout — dark gradient, SiteMedic logo header, centered content column (max-w-2xl), no sidebar |
| `web/app/onboarding/page.tsx` | Post-payment success page — polls `GET /api/billing/checkout-status` every 3s until webhook confirms subscription. Shows processing spinner or green checkmark + "Payment Confirmed". Links to branding setup. Redirects to `/admin` if `onboardingCompleted=true` |
| `web/app/onboarding/branding/page.tsx` | Branding setup wizard — company name, hex colour picker (with XSS regex validation), tagline, logo upload (PNG/JPEG/SVG, max 2MB). Uploads logo to `org-logos` Supabase Storage bucket. Updates existing `org_branding` row (created by checkout route in 29-01) |

### Modified Files

| File | Changes |
|------|---------|
| `web/lib/supabase/middleware.ts` | Added onboarding routing: orgs with `onboarding_completed=false` redirected from `/admin`, `/dashboard`, `/medic` to `/onboarding`; orgs with `onboarding_completed=true` redirected from `/onboarding` to `/admin`; legacy orgs (NULL) treated as completed via `?? true` fallback |
| `FEATURES.md` | Updated with onboarding wizard documentation |

### Key Features

- **Payment Status Polling**: Success page polls `/api/billing/checkout-status` every 3s. Shows animated spinner during processing, green checkmark after confirmation. Clears interval when status confirmed
- **Branding Pre-Configuration**: While waiting for platform admin activation, org admins can set company name, primary colour, tagline, and upload logo. Settings persist immediately to `org_branding` table and are ready when account is activated
- **Colour Validation**: Same `^#[0-9a-fA-F]{6}$` regex as BrandingProvider (Phase 27-01) — prevents XSS via CSS injection
- **Logo Upload**: Accepts PNG/JPEG/SVG up to 2MB. Stored at `{org_id}/logo.{ext}` in `org-logos` bucket with upsert. Shows preview thumbnail
- **Middleware Gating**: Separate from the `!isPublicRoute` block because `/admin` is in `publicRoutes`. Onboarding check fires for all authenticated users with `org_id` on `/admin`, `/dashboard`, `/medic`, and `/onboarding` routes
- **Legacy Org Safety**: `onboarding_completed ?? true` ensures orgs created before onboarding feature (with NULL value) are not affected
- **Activation SLA**: Success page displays "Most accounts activated within a few hours during UK business hours (Mon-Fri 9am-5pm)"

### Middleware Flow (Updated)

```
Request -> Strip x-org-* headers -> Subdomain resolution -> Supabase session
-> Public route check -> Auth redirect -> Org setup redirect
-> Onboarding gate: if onboarding_completed=false, redirect to /onboarding
-> If onboarding_completed=true and on /onboarding, redirect to /admin
-> Continue to page
```

---

## Recent Updates — Critical Bug Fixes (2026-02-18)

### Overview

Sprint 1 of the gap analysis: fixes 4 critical/high-severity bugs discovered during a comprehensive codebase audit. These bugs affected the client invoice page, the Net 30 booking flow, and recurring booking creation.

### Modified Files

| File | Changes |
|------|---------|
| `web/app/(client)/client/invoices/page.tsx` | **Complete rewrite** — now queries actual `invoices` table instead of `bookings` table. Shows real invoice status (draft/sent/paid/overdue/cancelled) with colour-coded badges, invoice numbers, issue/due dates, paid dates, and PDF download buttons. Previously hardcoded all items as "Paid" |
| `web/components/booking/net30-confirmation.tsx` | **Bug fix** — corrected sessionStorage key from `pricingBreakdown` to `bookingPricing` to match what booking form stores. Net 30 flow was silently failing to load pricing data |
| `web/app/api/bookings/recurring/route.ts` | **Bug fix** — removed references to non-existent `payment_terms` column on bookings table. Now looks up client's payment_terms from `clients` table. Fixed child booking status (was `undefined`, now correctly `confirmed` for Net 30 or `pending` for prepay). Added `org_id` and all pricing columns to child bookings. Sets `recurring_until` on parent booking after children created |

### Key Fixes

1. **Invoice Page (CRITICAL)**: Was querying `bookings` table filtered by `status='completed'` and displaying them as fake invoices with hardcoded "Paid" badge. Now queries the real `invoices` table with proper columns: `invoice_number`, `status`, `invoice_date`, `due_date`, `paid_at`, `pdf_url`. Shows colour-coded status badges (Draft=grey, Awaiting Payment=blue, Paid=green, Overdue=red, Cancelled=grey). PDF download button renders when `pdf_url` is available. Overdue invoices show a warning indicator.

2. **Net 30 Session Key (CRITICAL)**: The booking form (`booking-form.tsx`) stores pricing under `sessionStorage.setItem('bookingPricing', ...)` but `Net30Confirmation` was reading `sessionStorage.getItem('pricingBreakdown')`. This key mismatch meant Net 30 clients could never see their pricing breakdown and the confirm button was effectively dead. One-character fix: `pricingBreakdown` → `bookingPricing`.

3. **Recurring Booking Status (CRITICAL)**: The recurring bookings API referenced `parentBooking.payment_terms` but bookings have no `payment_terms` column (it's on the `clients` table). This meant `childStatus` was always set based on `undefined` comparisons, giving child bookings an incorrect status. Fix: query the client's `payment_terms` and use that. Also removed the non-existent `payment_terms` and `total_price` columns from child inserts, replaced with actual booking pricing columns (`base_rate`, `subtotal`, `vat`, `total`, `platform_fee`, `medic_payout`, etc.). Added `org_id` to child bookings for multi-tenant consistency.

4. **recurring_until (HIGH)**: Parent bookings never had `recurring_until` set, making it impossible to know when a recurring series ends. Now set to the last child's `shift_date` after all children are inserted.

### Technical Notes

- Invoice page now uses inline `useQuery` with `@tanstack/react-query` + `useRequireOrg()` for multi-tenant scoping (same pattern as other client portal pages)
- Invoices with status `draft` are excluded from client view (only shown: sent, paid, overdue, cancelled)
- Calendar picker date validation was verified as correct (+1 day minimum) — no fix needed despite initial report

---

## Recent Updates — Signup Page with Plan Selection & Checkout Flow (2026-02-18)

### Overview

The `/signup` page has been rebuilt as a multi-step onboarding flow that guides prospective medic businesses from plan selection through to Stripe Checkout. The previous simple magic-link signup form is replaced with a 4-step state machine: plan selection, account + org details, email verification, and org provisioning with Stripe redirect.

### Modified Files

| File | Changes |
|------|---------|
| `web/app/(auth)/signup/page.tsx` | Complete rewrite — multi-step signup with plan selection, org details, magic link auth, and Stripe Checkout redirect |

### Key Features

- **Plan Selection (Step 1)**: 3-tier pricing cards (Starter GBP149/mo, Growth GBP299/mo, Enterprise GBP599/mo) in responsive grid layout. Growth card has "Most Popular" badge. Each card shows features with green check marks. Dark theme matching org setup page
- **Account + Org Details (Step 2)**: Combined form with "Your Account" section (name, email) and "Your Organisation" section (org name, contact email pre-filled from account email, phone, address, postcode). Back navigation to plan selection with selected plan displayed
- **Magic Link Verification (Step 3)**: Sends OTP via `supabase.auth.signInWithOtp()` with all pending org data stored in `user_metadata` (pending_tier, pending_org_name, pending_contact_email, pending_contact_phone, pending_address, pending_postcode). Email redirect URL includes `?next=/signup?step=creating-org` for post-auth redirect
- **Org Provisioning (Step 4)**: After magic link auth, reads pending data from `user.user_metadata`, calls `POST /api/billing/checkout` (from 29-01), then redirects to Stripe Checkout hosted page via `window.location.href = response.url`
- **Cancellation Handling**: `?cancelled=true` query param shows an info banner ("Payment was cancelled. You can try again below.") and displays plan selection
- **Error Recovery**: Each step has error states with "Try Again" and "Start Over" buttons. Creating-org step handles missing metadata gracefully
- **No localStorage**: All pending data stored in Supabase user_metadata via signInWithOtp data option — survives the magic link redirect without relying on browser storage

### Data Flow

```
Plan Selection -> Details Form -> signInWithOtp (stores metadata) -> Magic Link Email
-> Auth Callback (?next=/signup?step=creating-org) -> Read user_metadata
-> POST /api/billing/checkout -> Stripe Checkout hosted page
-> Success: /onboarding?session_id=... | Cancel: /signup?cancelled=true
```

### Technical Notes

- Step state machine: `'plan' | 'details' | 'email-sent' | 'creating-org'`
- Contact email auto-fills from account email but can be changed independently
- Uses `encodeURIComponent()` for the `next` query param to handle nested query strings in auth callback URL
- Dark theme consistent with `/setup/organization` page (gray-900 gradient, gray-800/50 cards, blue-600 accents)
- Existing auth callback route supports `?next=` param for custom post-auth redirects

---

## Recent Updates — Stripe Checkout & Org Provisioning API (2026-02-18)

### Overview

Backend API routes for the org onboarding flow. When a new org signs up, the checkout endpoint provisions the full org infrastructure (organization record, branding row, membership, user metadata) and creates a Stripe Checkout Session. A separate polling endpoint lets the post-payment page detect when the billing webhook has processed.

### New Files

| File | Purpose |
|------|---------|
| `web/app/api/billing/checkout/route.ts` | POST handler — accepts tier + org details, creates org (onboarding_completed=false), inserts org_branding row, creates org_membership (org_admin), updates user app_metadata.org_id, creates Stripe Customer, creates Checkout Session with metadata.org_id for webhook association. Returns session URL for redirect |
| `web/app/api/billing/checkout-status/route.ts` | GET handler — reads user app_metadata.org_id, queries org subscription state (subscription_status, subscription_tier, stripe_customer_id, onboarding_completed). Used by post-payment onboarding page to poll until webhook sets subscription to active |

### Key Features

- **Complete org provisioning chain**: Single API call creates org + org_branding + membership + Stripe Customer + Checkout Session. Org is created BEFORE Stripe redirect so the billing webhook can find it via metadata.org_id
- **org_branding row insertion**: MANDATORY explicit INSERT — no database trigger exists (documented in Phase 24-05). White-label features depend on this row
- **Tier-to-price mapping**: Maps `starter|growth|enterprise` to Stripe Price IDs via `STRIPE_PRICE_*` env vars (comma-separated, first = GBP monthly)
- **User metadata update**: Sets app_metadata.org_id and role via service-role admin API so middleware can associate user with org
- **Post-payment polling**: checkout-status endpoint returns `isPending` flag so the onboarding UI can poll until webhook fires and sets subscription_status to 'active'
- **No database migrations**: Uses existing columns — `status`, `onboarding_completed` (migration 027), subscription columns (migration 133)

---

## Previous Updates — PDF & Email Branding (Phase 28) (2026-02-18)

### Overview

All 8 PDF Edge Functions and 4 email templates now dynamically render org branding (company name, logo, primary colour) instead of hardcoded "SiteMedic" or "Apex Safety Group" text. Each function fetches `org_branding` from the database before rendering. Tier-based "Powered by SiteMedic" attribution appears only for Starter-tier orgs.

### New Shared Infrastructure Files

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/branding-helpers.ts` | `OrgBranding` interface, `fetchOrgBranding()` (queries org_branding table, constructs logo public URL), `fetchLogoAsDataUri()` (converts remote URL to base64 data URI for @react-pdf), `showPoweredBySiteMedic()` (tier-based attribution gate) |
| `supabase/functions/_shared/pdf-branding.tsx` | `BrandedPdfHeader` and `BrandedPdfFooter` @react-pdf components — reusable header with logo + company name + document type, footer with conditional "Powered by SiteMedic" |
| `web/lib/email/types.ts` | `EmailBranding` interface (camelCase for Next.js), `DEFAULT_EMAIL_BRANDING` constant with SiteMedic defaults |

### PDF Functions Updated (8 total)

All 8 PDF Edge Functions now: (1) resolve org_id, (2) call `fetchOrgBranding()`, (3) pass branding to document component:

| Function | Document Component | Branding Approach |
|----------|--------------------|-------------------|
| `generate-weekly-report` | WeeklyReportDocument | @react-pdf BrandedPdfHeader/Footer (pilot) |
| `generate-invoice-pdf` | HTML template | Inline HTML branded header with logo + accent colour |
| `riddor-f2508-generator` | F2508Document | @react-pdf BrandedPdfHeader/Footer |
| `generate-payslip-pdf` | PayslipDocument | @react-pdf BrandedPdfHeader/Footer |
| `fa-incident-generator` | FAPlayerDocument + FASpectatorDocument | @react-pdf BrandedPdfHeader/Footer (both docs) |
| `motorsport-incident-generator` | MotorsportIncidentDocument | @react-pdf BrandedPdfHeader/Footer |
| `event-incident-report-generator` | PurpleGuideDocument | @react-pdf BrandedPdfHeader/Footer |
| `motorsport-stats-sheet-generator` | MotorsportStatsDocument | @react-pdf BrandedPdfHeader/Footer |

### Email Templates Updated (4 total)

| Template | File | Changes |
|----------|------|---------|
| Booking Confirmation | `web/lib/email/templates/booking-confirmation-email.tsx` | Accepts `EmailBranding` prop; renders org logo, company name, accent colour |
| Medic Assignment | `web/lib/email/templates/medic-assignment-email.tsx` | Accepts `EmailBranding` prop; renders org branding |
| Booking Received | `web/lib/email/templates/booking-received-email.tsx` | Accepts `EmailBranding` prop; renders org branding |
| Invoice Notification | `supabase/functions/_shared/email-templates.ts` | `InvoiceEmailBranding` interface; branded HTML header, accent button, conditional "Powered by SiteMedic" |

### Email Sending Routes Updated

| Route | Changes |
|-------|---------|
| `web/app/api/email/booking-confirmation/route.ts` | Fetches `org_branding` + `organizations` in parallel; passes `EmailBranding` to both BookingConfirmationEmail and MedicAssignmentEmail; dynamic `from` name |
| `web/lib/email/send-booking-received.ts` | Fetches `org_branding`; passes `EmailBranding` to template; dynamic `from` name |

### Key Technical Decisions

- **Data URI for @react-pdf logos**: `fetchLogoAsDataUri()` converts remote Supabase Storage URLs to base64 data URIs because @react-pdf in Deno Edge cannot reliably fetch remote images
- **Standard URL for invoice HTML**: The HTML template uses `<img src>` with the remote URL since it's rendered in a browser where remote URLs work
- **Two branding type systems**: `OrgBranding` (snake_case) for Edge Functions, `EmailBranding` (camelCase) for Next.js React Email templates
- **Tier-based attribution**: `showPoweredBySiteMedic(tier)` returns true for null/starter, false for growth/enterprise. In Next.js routes: `!hasFeature(tier, 'white_label')`
- **Platform alert emails excluded**: `payoutFailure` and `cashFlowAlert` are SiteMedic platform alerts — intentionally NOT branded per org

### Additional Functions Branded (gap closure)

4 additional Edge Functions that had hardcoded branding were also updated:

| Function | What Changed |
|----------|-------------|
| `certification-expiry-checker/email-templates.ts` | Replaced "Apex Safety Group Ltd" with dynamic `orgName` (already passed); dynamic `from` name |
| `generate-weekly-report/email.ts` | Added `companyName` param; email header, footer, and `from` now use org company name |
| `send-contract-email/index.ts` | Added Supabase client + `fetchOrgBranding`; resolves org from contract's booking; `providerName` used in header, footer, from, subject |
| `generate-contract-pdf` (ContractDocument + SignatureBlock) | Added `providerName` to `ContractPDFData`; fetches org branding from contract's booking; provider party name and footer use dynamic value |

---

## Previous Updates — Org Onboarding Welcome Email (2026-02-18)

### Overview

Welcome email infrastructure for the org onboarding flow. When platform admin activates a new organisation, the org admin receives a branded welcome email with their login URL, plan details, and a 3-step getting-started guide.

### New Files

| File | Purpose |
|------|---------|
| `web/lib/email/templates/welcome-email.tsx` | React Email welcome template. Supports org branding (logo, primary colour) with SiteMedic defaults. Sections: branded header, greeting, plan info details box, 3-step getting-started guide, CTA button linking to login URL, footer |
| `web/lib/email/send-welcome.ts` | `sendWelcomeEmail()` function. Creates service-role Supabase client, fetches `org_branding` for the org, builds login URL with subdomain support (Growth/Enterprise get `https://{slug}.sitemedic.co.uk/login`), renders template, sends via Resend. Fire-and-forget pattern (logs errors, never throws) |

### Key Features

- **Org branding support**: Template renders org logo (from Supabase Storage public bucket) and uses org primary colour for CTA button. Falls back to SiteMedic blue (#2563eb) when no branding configured
- **Subdomain login URL**: Growth/Enterprise orgs with a slug get `https://{slug}.{ROOT_DOMAIN}/login`; Starter orgs get the default site URL
- **Getting-started guide**: Three numbered onboarding steps (set up branding, invite team, create first booking) guide new org admins
- **Service-role database access**: Sender uses `@supabase/supabase-js` directly with `SUPABASE_SERVICE_ROLE_KEY` (not request-context client) since it's called from API routes
- **Fire-and-forget pattern**: Matches existing `sendBookingReceivedEmail()` pattern — catches all errors, logs them, never throws to avoid blocking the activation flow

---

## Previous Updates — 2-Way Google Calendar Sync + Manual Busy Blocks (2026-02-18)

### Overview

Full 2-way Google Calendar integration and manual busy blocks for medic scheduling. Admins see medic unavailability on the schedule board (Google Calendar events, personal busy blocks, approved time-off). When bookings are confirmed, they automatically appear on the medic's Google Calendar. Conflict detection warns admins about Google Calendar clashes during assignment.

**No database changes** — uses existing `medic_preferences` (Google Calendar OAuth columns), `medic_availability` (manual busy blocks), and `booking_conflicts` (`google_calendar_conflict` type) infrastructure from migration 013.

### New Files

| File | Purpose |
|------|---------|
| `web/app/api/google-calendar/auth/route.ts` | Initiates Google OAuth 2.0 flow — generates consent URL with `calendar.readonly` + `calendar.events` scopes, redirects medic to Google. Uses `state` param = user ID for callback verification |
| `web/app/api/google-calendar/callback/route.ts` | Handles OAuth redirect from Google — exchanges authorization code for access + refresh tokens, upserts tokens into `medic_preferences`, redirects to medic profile with `?gcal=connected` |
| `web/app/api/google-calendar/disconnect/route.ts` | Revokes Google OAuth token (best-effort), clears all `google_calendar_*` columns in `medic_preferences`. Called from medic profile disconnect button |
| `web/app/api/google-calendar/busy-blocks/route.ts` | Combined busy blocks endpoint for admin schedule board. Takes `?weekStart=YYYY-MM-DD`, returns `{ busyBlocks: { [medicId]: BusyBlock[] } }` combining Google Calendar FreeBusy API results + `medic_availability` manual blocks + approved time-off. Sources labelled `google_calendar`, `manual`, or `time_off` |
| `web/app/api/google-calendar/push-event/route.ts` | Creates Google Calendar event on medic's primary calendar when booking is assigned. Event title: "SiteMedic: {site_name}", includes location, times, booking reference, client name. Stores `google_calendar_event_id` on booking for future updates |
| `web/lib/google-calendar/client.ts` | Shared utility library: `getValidAccessToken(medicId)` — auto-refreshes expired tokens; `fetchFreeBusy(accessToken, timeMin, timeMax)` — Google Calendar FreeBusy API; `createCalendarEvent(accessToken, event)` — creates event; `deleteCalendarEvent(accessToken, eventId)` — deletes event |
| `web/lib/google-calendar/types.ts` | TypeScript interfaces: `GoogleFreeBusyResponse`, `GoogleCalendarEvent`, `GoogleTokenResponse`, `BusyBlock`, `BusyBlocksResponse` |
| `web/components/medic/busy-block-form.tsx` | Form component for medics to add manual busy blocks. Writes to `medic_availability` with `is_available=false`, `request_type='personal'`, `status='approved'` (no admin approval needed). Fields: date, reason (optional) |

### Modified Files

| File | Change |
|------|--------|
| `web/app/medic/profile/page.tsx` | Added Google Calendar integration card between Availability Toggle and Personal Info sections. Two states: **Not connected** (purple "Connect Google Calendar" button → OAuth redirect) / **Connected** (green badge, description text, "Disconnect" button with loading state). Handles `?gcal=connected/denied/error` query params from OAuth callback with toast notifications. New state: `gcalConnected`, `gcalDisconnecting`. Fetches `medic_preferences.google_calendar_enabled` on mount |
| `web/app/medic/shifts/page.tsx` | Added "My Busy Blocks" section below shifts list. Shows existing upcoming busy blocks as orange cards with date, reason, and delete button. "Add Busy Block" button opens `BusyBlockForm` inline. Fetches from `medic_availability` where `is_available=false` and `date >= today`. New state: `busyBlocks`, `showBusyForm`, `medicId` |
| `web/types/schedule.ts` | Added `BusyBlock` interface with fields: `id`, `medicId`, `source` (`google_calendar` / `manual` / `time_off`), `title`, `date`, `startTime`, `endTime`, `reason?` |
| `web/stores/useScheduleBoardStore.ts` | Added `busyBlocks` state (Record keyed by medicId), `fetchBusyBlocks()` action (calls `/api/google-calendar/busy-blocks`), `getBusyBlocksForMedicOnDate()` getter. `fetchScheduleData()` now also triggers `fetchBusyBlocks()`. `assignMedicToBooking()` now fires a fire-and-forget POST to `/api/google-calendar/push-event` after successful assignment |
| `web/components/admin/schedule/DayCell.tsx` | Renders busy block chips above booking cards. Color-coded by source: **purple** (Google Calendar), **orange** (manual), **red** (time-off). Each chip shows title and time range (if not all-day). Uses `getBusyBlocksForMedicOnDate()` from store |
| `supabase/functions/conflict-detector/index.ts` | Added Check 7: `checkGoogleCalendarConflict()`. Fetches medic's Google Calendar tokens from `medic_preferences`, auto-refreshes if expired, calls FreeBusy API for shift time range. Returns `warning` severity (not critical — admin can override external calendar events). Best-effort: Google API failures don't block assignment |
| `web/.env.example` | Added `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` environment variables for Google Calendar OAuth configuration |

### Key Features

- **Google OAuth 2.0 flow**: Medics connect Google Calendar from their profile page. Scopes: `calendar.readonly` (read events for busy display) + `calendar.events` (create/delete events for booking push). Refresh tokens stored in `medic_preferences` and auto-refreshed on expiry
- **Medic profile card**: Purple-themed card shows connection status. Connected state shows green badge + disconnect button. Not-connected state shows descriptive text + connect button
- **Manual busy blocks**: Medics can mark specific dates as unavailable from their Shifts page. No admin approval required for self-reported personal blocks. Stored as `medic_availability` records with `request_type='personal'`
- **Schedule board integration**: Admin schedule board fetches combined busy blocks via `/api/google-calendar/busy-blocks`. DayCell renders color-coded chips: purple (GCal), orange (manual), red (time-off). Chips show title and time range
- **Booking push to Google Calendar**: When admin assigns a medic to a booking, a Google Calendar event is automatically created with site name, address, times, booking reference, and client name
- **Conflict detection**: When assigning a medic, the conflict detector checks Google Calendar for overlapping events. Returns `warning` severity (overridable) — external events may not be blocking work

### Environment Variables Required

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Callback URL: `https://<domain>/api/google-calendar/callback` |

### Schedule Board Busy Block Visual Design

```
┌────────────────┐
│ Mon 15         │
│ [purple] GCal: Busy    │  ← Google Calendar event
│   10:00-12:00  │
│ [orange] Dentist        │  ← Manual busy block
│ [green] Booking         │  ← SiteMedic booking (existing)
│   07:00-15:00  │
└────────────────┘
```

---

## Recent Updates — Org Admin Payout Configuration (2026-02-18)

### Configurable Payout Settings for Org Admins

Org admins can now configure mileage reimbursement and referral commission settings per organisation, replacing previously hardcoded values. Adds pay guideline banners when setting medic hourly rates, and fixes a critical bug where referral fields were not saved during booking creation.

**New Files:**

| File | Purpose |
|------|---------|
| `supabase/migrations/136_org_payout_settings.sql` | Adds 3 columns to `org_settings`: `mileage_enabled` (boolean, default true), `mileage_rate_pence` (integer 0-200, default 45), `referral_commission_percent` (decimal 0-100, default 10.00) |
| `web/lib/medics/pay-guidelines.ts` | Platform reference table of suggested hourly rates by UK medical classification and experience band (0-2yr / 3-5yr / 6+yr). Exports `getSuggestedRate(classification, yearsExperience)` returning range string and band label |

**Modified Files:**

| File | Change |
|------|--------|
| `web/app/admin/settings/page.tsx` | Added "Payout Configuration" section between Business Configuration and CQC Compliance with: mileage toggle + rate input (p/mile), referral commission % input. New state: `mileageEnabled`, `mileageRatePence`, `referralCommissionPercent`. New save handler: `handleSavePayout()` |
| `web/app/api/admin/settings/route.ts` | Added server-side validation for 3 new fields in PUT handler: `mileage_enabled` (boolean), `mileage_rate_pence` (integer 0-200), `referral_commission_percent` (number 0-100). Fields added to update payload builder |
| `web/components/medics/compensation-settings.tsx` | New props: `orgMileageEnabled`, `orgMileageRatePence`. Shows pay guideline banner when hourly model + classification + years are set (e.g. "Guideline for Paramedic (3-5 years): £16-20/hr"). Mileage info box and preview calculations now use org-configured rate instead of hardcoded HMRC 45p. Shows "Mileage disabled" when org has mileage_enabled=false |
| `web/lib/payouts/mileage-router.ts` | `routeDailyMileage()` now fetches `org_settings` for the booking's org to get `mileage_enabled` + `mileage_rate_pence`. When mileage disabled: reimbursement set to £0 but miles still recorded for reporting. Uses org's rate instead of `HMRC_MILEAGE_RATE_PENCE` constant |
| `web/app/api/bookings/create/route.ts` | **Bug fix**: Added missing referral fields to booking insert: `is_referral`, `referred_by`, `referral_payout_percent`, `referral_payout_amount`, `platform_net`. Also added `isReferral`, `referredBy` to BookingRequest interface and referral pricing fields to the pricing sub-interface |

**Key Features:**
- **Mileage toggle**: Org admins can enable/disable mileage reimbursement entirely — when disabled, miles are still tracked for reporting but £0 is paid
- **Configurable mileage rate**: Default 45p/mile (HMRC), adjustable 0-200p per org. HMRC label shown when rate matches 45p
- **Referral commission %**: Default 10%, adjustable 0-100%. Set to 0 to disable referral payouts. Calculated on pre-VAT subtotal
- **Pay guidelines**: Non-intrusive informational banner showing suggested rate ranges by classification and experience band when admin sets hourly rate
- **Downstream integration**: Mileage router reads org settings at runtime; compensation preview reflects org's actual mileage config
- **Bug fix**: Referral fields (`is_referral`, `referred_by`, `referral_payout_percent`, `referral_payout_amount`, `platform_net`) now correctly persisted when creating Net 30 bookings

**Pay Guideline Reference Table (from `pay-guidelines.ts`):**

| Classification | 0-2 years | 3-5 years | 6+ years |
|---|---|---|---|
| First Aider | £10-12/hr | £12-14/hr | £14+/hr |
| ECA | £11-13/hr | £13-15/hr | £15+/hr |
| EFR | £12-14/hr | £14-16/hr | £16+/hr |
| EMT | £13-15/hr | £15-18/hr | £18+/hr |
| AAP | £14-17/hr | £17-20/hr | £20+/hr |
| Paramedic | £16-20/hr | £20-24/hr | £24+/hr |
| Specialist Paramedic | £20-25/hr | £25-30/hr | £30+/hr |
| Critical Care Paramedic | £25-30/hr | £30-38/hr | £38+/hr |
| Registered Nurse | £18-22/hr | £22-28/hr | £28+/hr |
| Doctor | £35-50/hr | £50-75/hr | £75+/hr |

---

## Previous Updates — Profit Split Dashboard (2026-02-18)

### Platform Admin Profit Split Dashboard (`/platform/profit-split`)

New platform-admin-only dashboard showing combined profit from both ASG medic bookings and SiteMedic software subscriptions, with a 4-way equal split (Sabine / Kai / Operational / Reserve).

**New Files:**

| File | Purpose |
|------|---------|
| `web/lib/queries/platform/profit-split.ts` | Data fetching hook — aggregates completed bookings (gross, medic pay, referrals, mileage) across all orgs; counts active subscription tiers with Stripe fee deductions; computes 4-way split for each revenue stream |
| `web/app/platform/profit-split/page.tsx` | Dashboard page — summary cards, 2x2 partner grid with source-labeled breakdown, ASG cost breakdown, SiteMedic subscription breakdown |

**Modified Files:**

| File | Change |
|------|--------|
| `web/app/platform/layout.tsx` | Added `PieChart` icon import; added "Profit Split" nav item after "Revenue" in platform sidebar |

**Key Features:**
- **Two revenue streams**: ASG booking profit (completed bookings across all orgs) + SiteMedic subscription profit (active org tiers × monthly pricing)
- **ASG cost deductions**: Medic pay, referral commissions, mileage reimbursements — then 4-way split on net
- **SiteMedic cost deductions**: Stripe fees (2.9% + £0.30/subscription) — then 4-way split on net
- **Partner cards**: Each of the 4 recipients shows total amount with source labels (£X from ASG + £Y from SiteMedic = £Z total)
- **Dual pay model support**: Hourly model bookings use pre-calculated `sabine_share`/`kai_share`/`operational_bucket_amount`/`reserve_bucket_amount` columns; percentage model bookings calculate split from `platform_fee` minus deductions
- **Time range filter**: 4 weeks / 12 weeks / 52 weeks — filters ASG booking data; subscription data is always current snapshot
- **Subscription tier pricing**: Defined as constants (Starter £49, Growth £149, Enterprise £349/mo) — no DB changes required
- **React Query polling**: 60s refresh interval, 30s stale time (matches existing platform revenue pattern)
- **No database changes**: Reads from existing `bookings` and `organizations` tables only

**Platform Sidebar Nav Order (updated):**
1. Dashboard → 2. Organizations → 3. Revenue → 4. **Profit Split** → 5. Analytics → 6. Users → 7. Settings

---

## Previous Updates — Phase 27: Branding — Web Portal (2026-02-18)

### White-label branding applied to web portal

Phase 27 delivers per-org branding across the dashboard and admin portal. All branding is resolved server-side via `x-org-*` headers from Phase 26 middleware — zero client-side branding fetches, no flash of unbranded content.

**BrandingProvider Context (`web/contexts/branding-context.tsx`):**
- `BrandingProvider` — client component providing org branding via React context
- `useBranding()` hook — returns `Branding` interface (companyName, logoUrl, primaryColour, tagline, isSubdomain)
- CSS custom property injection: renders `<style>:root { --org-primary: #hex }</style>` at root level
- XSS defence: validates hex colour with `/^#[0-9a-fA-F]{6}$/` regex before injection; falls back to `#2563eb` (Tailwind blue-600)
- `DEFAULT_BRANDING` — SiteMedic defaults: `#2563eb`, "SiteMedic", no logo, no tagline
- Separate from `OrgContext` — BrandingContext is SSR-header-driven, OrgContext is JWT-driven

**Root Layout Integration (`web/app/layout.tsx`):**
- Reads 5 `x-org-*` headers server-side and passes to BrandingProvider wrapping all children
- Dynamic tab titles via `generateMetadata()`: org portals show `[Company Name] — SiteMedic` (em dash), apex shows default SiteMedic title
- Title template: child pages get `%s — [Company Name]` format automatically

**Dashboard Layout Rebrand (`web/app/(dashboard)/layout.tsx`):**
- Sidebar header shows org company name (fallback: "SiteMedic")
- Org logo displayed when `x-org-logo-url` present; initials fallback in org-primary coloured square
- Tagline from `x-org-tagline` (fallback: "Dashboard")
- Server component reads headers directly — no hook needed

**Admin Layout Rebrand (`web/app/admin/layout.tsx`):**
- All hardcoded `blue-600`/`blue-700` accent colours replaced with `var(--org-primary)` CSS custom property
- Brand icon: gradient replaced with solid org colour; shows org logo or dynamic 2-char initials
- Active nav item: `bg-[color:var(--org-primary)]` with neutral `shadow-black/10`
- User avatar: `bg-[color:var(--org-primary)]` replaces blue gradient
- Loading spinners: `border-[color:var(--org-primary)]` replaces `border-blue-600`
- Badge fallback: `bg-[color:var(--org-primary)]` replaces `bg-blue-500`
- Company name and tagline dynamic from `useBranding()` hook
- Zero remaining blue-600/blue-700/blue-500 references

**Auth Layout Cleanup (`web/app/(auth)/layout.tsx`):**
- Removed redundant inline `--org-primary` CSS injection (now handled at root level by BrandingProvider)
- Simplified to pure layout component

---

## Previous Updates — Phase 25: Billing Infrastructure (2026-02-18)

### Subscription billing plumbing for three-tier model

Phase 25 delivers the core billing infrastructure: a feature gates module for tier-based access control, a Stripe billing webhook handler for subscription lifecycle events, and a migration for webhook event logging and idempotency.

**Feature Gates Module (`web/lib/billing/feature-gates.ts`):**
- `FEATURE_GATES` constant — sole source of truth mapping subscription tiers to feature sets
- 3 tiers: Starter (6 features), Growth (9 features), Enterprise (12 features)
- Starter: `dashboard`, `treatment_logs`, `worker_registry`, `weekly_reports`, `compliance`, `basic_analytics`
- Growth adds: `white_label`, `subdomain`, `advanced_analytics`
- Enterprise adds: `custom_domain`, `api_access`, `priority_support`
- `hasFeature(tier, feature)` — checks if a tier includes a feature; NULL tier defaults to 'starter' (legacy orgs)
- `isAtLeastTier(currentTier, minimumTier)` — tier comparison (starter=0, growth=1, enterprise=2)
- `getTierFeatures(tier)` — returns full feature set for a tier
- Development-only superset invariant validation (Starter subset of Growth subset of Enterprise)
- `SubscriptionTier` and `FeatureKey` types enforce compile-time safety

**Billing Webhook Handler (`web/app/api/stripe/billing-webhooks/route.ts`):**
- Separate endpoint from existing Connect webhook at `/api/stripe/webhooks`
- Uses `STRIPE_BILLING_WEBHOOK_SECRET` (distinct from `STRIPE_WEBHOOK_SECRET`)
- `request.text()` for raw body (required for Stripe signature verification via `constructEvent()`)
- **checkout.session.completed**: Writes `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status='active'` to organizations table
- **customer.subscription.updated**: Updates tier and status with out-of-order protection (timestamp comparison) and spelling normalization (`canceled` -> `cancelled`)
- **customer.subscription.deleted**: Sets status to `'cancelled'`, preserves `subscription_tier` (data hidden, not deleted)
- **invoice.payment_failed**: Logs warning only — does NOT change `subscription_status` (waits for Stripe to fire subscription.updated)
- Idempotency: INSERT to `webhook_events` table, skip on PostgreSQL error 23505 (unique violation)
- `priceIdToTier()`: Maps Stripe Price IDs from comma-separated env vars to tier names
- `normalizeSubscriptionStatus()`: Maps Stripe's 'canceled' (American) to database's 'cancelled' (British) per CHECK constraint
- Service-role Supabase client (same pattern as contracts/webhooks)

**Webhook Events Migration (`supabase/migrations/135_webhook_events.sql`):**
- `webhook_events` table: `id`, `stripe_event_id` (UNIQUE), `event_type`, `event_data` (JSONB), `processing_error`, `created_at`, `processed_at`
- Indexes on `event_type` and `created_at`
- RLS: Platform admin SELECT only; webhook handler uses service-role (bypasses RLS)
- Added `subscription_status_updated_at` column to `organizations` for out-of-order webhook protection

**Environment Variables (`.env.example` updated):**
- `STRIPE_PRICE_STARTER` — comma-separated Price IDs (GBP-mo, GBP-yr, EUR-mo, EUR-yr, USD-mo, USD-yr)
- `STRIPE_PRICE_GROWTH` — same format
- `STRIPE_PRICE_ENTERPRISE` — same format
- `STRIPE_BILLING_WEBHOOK_SECRET` — billing webhook signing secret (SEPARATE from Connect)

| File | Change |
|---|---|
| `web/lib/billing/feature-gates.ts` | **New** — FEATURE_GATES constant, hasFeature(), getTierFeatures(), isAtLeastTier(), SubscriptionTier/FeatureKey types |
| `web/app/api/stripe/billing-webhooks/route.ts` | **New** — POST handler for 4 Stripe billing event types with idempotency and out-of-order protection |
| `supabase/migrations/135_webhook_events.sql` | **New** — webhook_events table + subscription_status_updated_at on organizations |
| `web/.env.example` | Added 4 billing env vars (STRIPE_PRICE_STARTER/GROWTH/ENTERPRISE, STRIPE_BILLING_WEBHOOK_SECRET) |

---

## Phase 26: Subdomain Routing (2026-02-18)

### White-label subdomain infrastructure for multi-tenant org portals

Each subscribing org on Growth or Enterprise tier gets their own subdomain at `slug.sitemedic.co.uk`. The Next.js middleware extracts the subdomain, resolves the org from the database, and injects org context headers that all SSR pages consume.

**Middleware Subdomain Extraction (`web/lib/supabase/middleware.ts`):**
- `extractSubdomain()` helper parses subdomain from host header — handles apex domain, www, Vercel preview deploys, and localhost dev
- All `x-org-*` headers stripped at top of middleware before any processing (CVE-2025-29927 header injection mitigation)
- Service-role Supabase client performs org lookup by slug with joined branding query (single DB call)
- Injects 7 org context headers: `x-org-id`, `x-org-slug`, `x-org-tier`, `x-org-company-name`, `x-org-primary-colour`, `x-org-logo-url`, `x-org-tagline`
- Unknown subdomains redirect to apex domain root (not 404)
- Dynamic import of `@supabase/supabase-js` — only loaded when subdomain is detected

**Branded Login Page:**
- `web/app/(auth)/login/page.tsx` — converted to server component that reads `x-org-*` headers via `next/headers`
- `web/app/(auth)/login/login-form.tsx` — new client component receiving branding props from server page
- Subdomain login shows: org company name (card title), org tagline (subtitle), org logo (above title), "Powered by SiteMedic" footer
- Apex domain login shows SiteMedic defaults unchanged
- Auth layout injects `--org-primary` CSS custom property for branded accent colours

**Auth Cookie Scope Isolation:**
- Supabase SSR cookies scoped to exact hostname (no `.sitemedic.co.uk` domain widening)
- Session at `apex.sitemedic.co.uk` does NOT carry to `another.sitemedic.co.uk`
- Signout route updated to use request origin (not hardcoded URL) for subdomain support

**Environment Configuration:**
- `NEXT_PUBLIC_ROOT_DOMAIN` env var — `sitemedic.co.uk` (production) / `localhost:30500` (development)
- `SUPABASE_SERVICE_ROLE_KEY` used by middleware for org lookup (bypasses RLS)
- Vercel wildcard domain `*.sitemedic.co.uk` required for production (DNS CNAME to cname.vercel-dns.com)

| File | Change |
|---|---|
| `web/lib/supabase/middleware.ts` | Added `extractSubdomain()`, header stripping, service-role org+branding lookup, x-org-* header injection, unknown slug redirect |
| `web/app/(auth)/login/page.tsx` | Converted to server component reading x-org-* headers |
| `web/app/(auth)/login/login-form.tsx` | **New** — client login form with branding props |
| `web/app/(auth)/layout.tsx` | Reads x-org-primary-colour, injects CSS custom property |
| `web/app/api/auth/signout/route.ts` | Fixed to use request origin for subdomain redirect |
| `web/.env.local.example` | Added `NEXT_PUBLIC_ROOT_DOMAIN` documentation |

---

## Recent Updates — Client Portal & Admin Contract Management (2026-02-18)

### Client Self-Service Portal (Task #14)

New `(client)` route group providing a self-service portal for clients (site_manager role). Clients can view their bookings, see pricing breakdowns, track medic assignments, and manage their account. Built on the same sidebar layout pattern as the dashboard.

**Client Layout (`web/app/(client)/layout.tsx`):**
- Server component with auth protection (redirects to `/login` if unauthenticated)
- SidebarProvider with ClientNav, user info footer, sign-out button
- "New Booking" CTA in header linking to `/book`
- QueryProvider wrapper for React Query data fetching

**Client Navigation (`web/components/client/ClientNav.tsx`):**
- Three-item sidebar: My Bookings, Invoices, Account
- Active state highlighting using `usePathname()`
- Uses shared SidebarMenu/SidebarMenuButton components

**My Bookings Page (`web/app/(client)/client/bookings/page.tsx`):**
- Summary cards: Upcoming, Pending, Completed counts
- Status filter buttons (All, Pending, Confirmed, In Progress, Completed, Cancelled)
- Booking cards showing: site name, date, time, postcode, medic name + rating, total price
- Recurring badge for recurring bookings
- Empty state with "Book a Medic" CTA
- 60-second polling via React Query

**Booking Detail Page (`web/app/(client)/client/bookings/[id]/page.tsx`):**
- Full shift details: date, time range, hours, location
- Assigned medic card with initials avatar, name, star rating
- Complete pricing breakdown: base rate calculation, subtotal, VAT, total
- Special notes section
- "Contact support" card for modifications/cancellations

**Invoices Page (`web/app/(client)/client/invoices/page.tsx`):**
- Lists completed bookings as invoice items with Paid badge
- Shows site name, date, hours, and total per invoice
- Running total at bottom
- Empty state when no completed bookings exist

**Account Page (`web/app/(client)/client/account/page.tsx`):**
- Company information: company name, contact name
- Contact details: email, phone, billing address
- Payment information: terms (Net 30 / Prepay), credit limit, member since date
- Read-only with "Contact support" link for changes

**Client Booking Queries (`web/lib/queries/client/bookings.ts`):**
- `fetchClientBookings(orgId)` — finds client record by user_id, fetches bookings with medic joins
- `useClientBookings()` — React Query hook with 60s polling
- `fetchClientBookingDetail(orgId, bookingId)` — single booking fetch with client_id + org_id filtering
- `useClientBookingDetail(bookingId)` — React Query hook for detail view
- All queries are double-filtered: `client_id` (from user's client record) + `org_id` (from org context)

| File | Change |
|---|---|
| `web/app/(client)/layout.tsx` | **New** — Client portal layout with sidebar, auth protection |
| `web/components/client/ClientNav.tsx` | **New** — Client-specific sidebar navigation |
| `web/app/(client)/client/bookings/page.tsx` | **New** — My Bookings list with filters and stats |
| `web/app/(client)/client/bookings/[id]/page.tsx` | **New** — Booking detail with pricing breakdown |
| `web/app/(client)/client/invoices/page.tsx` | **New** — Invoice list from completed bookings |
| `web/app/(client)/client/account/page.tsx` | **New** — Client account profile (read-only) |
| `web/lib/queries/client/bookings.ts` | **New** — Client-scoped booking query hooks |

### Admin Contract Management UI (Task #15)

Added contract management to the admin panel. All contract components and API routes were pre-built but not wired to admin pages. Created 4 admin pages and added "Contracts" to the admin sidebar navigation.

**Admin Sidebar Update (`web/app/admin/layout.tsx`):**
- Added `FileSignature` icon import
- Added "Contracts" nav item at `/admin/contracts` (positioned after Bookings group, before Customers)

**Contracts List Page (`web/app/admin/contracts/page.tsx`):**
- Server component with parallel data fetching (`getContracts()` + `getContractStats()`)
- Renders `ContractsTable` component with status summary cards, filters, search, and action dropdowns
- Dark admin theme wrapper (white card on dark background)

**Contract Detail Page (`web/app/admin/contracts/[id]/page.tsx`):**
- Server component fetching contract by ID with all relations (versions, events, client, booking, template)
- Breadcrumb navigation: Admin > Contracts > [contract number]
- Renders `ContractDetail` component: two-column layout with payment schedule, status timeline, version history, signature display

**Contract Creation Page (`web/app/admin/contracts/create/page.tsx`):**
- Fetches eligible bookings (pending/confirmed without existing contracts) and active templates
- Renders `CreateContractForm`: 4-step flow (select booking → template → payment terms → preview)
- Empty states for no eligible bookings or no templates

**Template Management Page (`web/app/admin/contracts/templates/page.tsx`):**
- Fetches active templates via `getContractTemplates()`
- Renders `TemplateManager`: inline CRUD for templates with clause ordering, T&Cs, cancellation policy

| File | Change |
|---|---|
| `web/app/admin/layout.tsx` | Added FileSignature import + Contracts nav item |
| `web/app/admin/contracts/page.tsx` | **New** — Contracts list with status cards and filters |
| `web/app/admin/contracts/[id]/page.tsx` | **New** — Contract detail with timeline and payment schedule |
| `web/app/admin/contracts/create/page.tsx` | **New** — Multi-step contract creation form |
| `web/app/admin/contracts/templates/page.tsx` | **New** — Template CRUD management |

---

## Recent Updates — Codebase Gap Analysis & Fixes (2026-02-18)

### Gap Analysis: 15 fixes across UI, backend, and customer flows

**Bug Fixes:**
- Fixed `sessionStorage` key mismatch in payment form (`pricingBreakdown` → `bookingPricing`) that could silently fail bookings
- Fixed booking confirmation page never verifying Stripe payment status — now checks `redirect_status` param
- Fixed recurring booking creation failures being silently swallowed — now shows amber warning to user
- Added UK postcode regex validation to booking form that blocks submission (previously only visual feedback)

**Admin Settings Persistence:**
- Wired up "Save Changes" button for billing email/emergency contact (previously no onClick handler)
- Notification preference toggles now persist to localStorage (previously flip-only, no save)
- Added branding section to settings: company name, brand colour picker, tagline (reads/writes org_branding table)
- Added subscription billing section showing current tier (starter/growth/enterprise), status, and tier comparison
- Created `/api/admin/branding` and `/api/admin/subscription` API routes

**New Pages & Components:**
- Created `/admin/medics/[id]/page.tsx` — medic detail page with editable CompensationSettings (previously only accessible during onboarding)
- Added "Profile" link to medic roster table actions
- Added classification, years_experience, hourly_rate, and CQC number columns to medic roster table
- Added `is_referral` + `referred_by` fields to admin booking creation form

**UX Improvements:**
- Enhanced DataTable empty state with configurable `emptyTitle` and `emptyDescription` props
- Added contextual empty state messages to treatments, near-misses, and workers tables
- ComplianceScore component now shows loading spinner instead of returning null when data is loading

| File | Change |
|---|---|
| `web/components/booking/payment-form.tsx` | Fixed sessionStorage key from `pricingBreakdown` to `bookingPricing` |
| `web/components/booking/booking-form.tsx` | Added `isValidUkPostcode()` check to `isFormValid()` |
| `web/app/admin/settings/page.tsx` | Added branding section, subscription section, wired contact details save, notification toggle persistence |
| `web/app/api/admin/branding/route.ts` | **New** — GET/PUT org_branding API |
| `web/app/api/admin/subscription/route.ts` | **New** — GET subscription tier/status API |
| `web/app/admin/medics/[id]/page.tsx` | **New** — Medic detail page with editable compensation settings |
| `web/app/admin/bookings/new/page.tsx` | Added referral section (is_referral checkbox + referred_by input) |
| `web/components/admin/medic-roster-table.tsx` | Added Classification column + Profile link |
| `web/lib/queries/admin/medics.ts` | Added classification, years_experience, hourly_rate, pay_model, experience_level, cqc_registration_number to MedicWithMetrics |
| `web/components/dashboard/data-table.tsx` | Added emptyTitle/emptyDescription props to DataTable |
| `web/components/dashboard/treatments-table.tsx` | Added contextual empty state message |
| `web/components/dashboard/near-misses-table.tsx` | Added contextual empty state message |
| `web/components/dashboard/workers-table.tsx` | Added contextual empty state message |
| `web/components/dashboard/compliance-score.tsx` | Replaced null return with loading spinner |
| `web/app/(booking)/book/confirmation/page.tsx` | Added payment verification + recurring booking error handling |

---

## Recent Updates — Motorsport UK Accident Form PDF Download (2026-02-18)

### Phase 23-06: Motorsport Incident Report Card (Gap Closure MOTO-07) ✅

Medics can now generate and download a Motorsport UK Accident Form PDF directly from the treatment detail page when the treatment is for a motorsport event. This closes the MOTO-07 gap — the Edge Function was fully implemented in Phase 19 but had no web UI to trigger it.

**New Query Function (`web/lib/queries/motorsport-incidents.ts`):**
- `generateMotorsportIncidentPDF(treatmentId: string)` — sends `POST /functions/v1/motorsport-incident-generator` with `{ incident_id: treatmentId, event_vertical: 'motorsport' }`
- Authenticates via session JWT (falls back to anon key)
- Returns `{ success: boolean, pdf_path: string, signed_url: string }`
- Throws `'Failed to generate Motorsport Incident Report'` on HTTP error

**New Component (`web/components/dashboard/MotorsportIncidentReportCard.tsx`):**
- Client component (`'use client'`) with `useMutation` from `@tanstack/react-query`
- Card layout with `CardTitle`: "Motorsport UK — Accident Form"
- Card description: "Pre-filled Motorsport UK Accident Form generated from this treatment record for submission to race control or Motorsport UK"
- Button text: "Generate Motorsport Incident Report" (idle) / "Generating PDF..." (pending)
- On success: opens `signed_url` in new browser tab via `window.open`
- On error: shows `alert('Failed to generate Motorsport Incident Report. Please try again.')`
- Footer note: "Click to generate a pre-filled Motorsport UK Accident Form. Review all information for accuracy before sharing with race control or the Clerk of the Course."
- `FileText` icon from lucide-react on button
- Mirrors `EventIncidentReportCard` (festivals) and `FAIncidentReportCard` (sporting_events) exactly

**Updated Page (`web/app/(dashboard)/treatments/[id]/page.tsx`):**
- Added import for `MotorsportIncidentReportCard`
- Added conditional render: `{treatment.event_vertical === 'motorsport' && <MotorsportIncidentReportCard treatmentId={treatment.id} />}`
- Positioned after the FA/SGSA card (sporting_events) and before the Photos section — consistent with other vertical-specific card ordering

**End-to-End Flow:**
1. Medic opens a motorsport treatment detail page
2. "Motorsport UK — Accident Form" card is shown (hidden for other verticals)
3. Medic clicks "Generate Motorsport Incident Report"
4. Button shows "Generating PDF..." while the Edge Function runs
5. Edge Function generates a pre-filled Motorsport UK Accident Form PDF (with DRAFT watermark pending Motorsport UK Incident Pack V8.0 validation) and uploads it to the `motorsport-reports` Storage bucket
6. On success, the PDF opens in a new browser tab via a 7-day signed URL

| File | Change |
|---|---|
| `web/lib/queries/motorsport-incidents.ts` | **New** — `generateMotorsportIncidentPDF()` query function |
| `web/components/dashboard/MotorsportIncidentReportCard.tsx` | **New** — useMutation PDF download card component |
| `web/app/(dashboard)/treatments/[id]/page.tsx` | Added import + conditional render for motorsport vertical |

---

## Previous Updates — Role-Aware Tabs & Settings (2026-02-18)

### Mobile App: Role-Based Navigation & Admin Screens ✅

The mobile app tab bar and Settings screen are now fully role-aware. Admin users (e.g. Apex Safety Group org managers) see a different set of tabs and Settings content from medics and site managers.

**Tab Visibility by Role (`app/(tabs)/_layout.tsx`):**

| Tab | Medic / Site Manager | Admin |
|-----|----------------------|-------|
| Home | ✅ visible | ✅ visible |
| Treatments | ✅ visible | ❌ hidden (`href: null`) |
| Workers/Patients | ✅ visible | ❌ hidden |
| Safety | ✅ visible | ❌ hidden |
| Events | ❌ hidden | ✅ visible (new) |
| Team | ❌ hidden | ✅ visible (new) |
| Settings | ✅ visible | ✅ visible |

- `isAdmin` is derived from `state.user?.role === 'admin'` (AuthContext)
- Expo Router `href: null` removes a tab from navigation state entirely — no ghost routes
- TabletSidebar automatically reflects the correct tabs (iterates `state.routes` which excludes `href:null` screens)

**New Screen: Events (`app/(tabs)/events.tsx`):**
- Admin-only screen listing upcoming bookings for the admin's organisation
- Supabase query: `bookings` table, filtered to `status IN ['pending', 'confirmed', 'in_progress']`, ordered by `shift_date` ascending, limit 50
- RLS ensures admins only see their own org's bookings
- Each event card shows: `site_name` (bold), formatted date, shift start–end time, status badge
- Status badge colour coding: pending=amber, confirmed=green, in_progress=blue
- Empty state: "No upcoming events. Book through the web portal."
- Error state with warning icon

**New Screen: Team (`app/(tabs)/team.tsx`):**
- Admin-only screen showing the roster of team members in the admin's organisation
- Supabase queries: `profiles` table (auth-linked users) AND `medics` table (medic roster) fetched in parallel via `Promise.all`, filtered by `org_id`
- Deduplication: medics whose `user_id` already appears in `profiles` are excluded to prevent duplicate rows
- Each member card shows: `full_name` (bold), `email` (muted), role badge
- Medic-specific enhancements: availability dot (green=available, gray=unavailable) before name, classification subtitle (italic gray) below email
- Role badge colour coding: Medic=blue, Site Manager=purple, Admin=amber
- Empty state: "No team members yet."
- Error state with warning icon

**Updated Screen: Settings (`app/(tabs)/settings.tsx`):**
- `isAdmin` flag added at component level
- **Admin-only: Organisation section** — rendered between Account card and Security:
  - Fetches from `org_settings` table (single row per org) on mount
  - **Industry Verticals**: displayed as pill/chip badges (e.g. "Motorsport", "Sporting Events"), using a `VERTICAL_LABELS` map for human-readable names
  - **CQC Status**: green "● Registered" badge if `cqc_registered = true`; shows `cqc_registration_number` if present
  - Supports 10 vertical keys: `construction`, `tv_film`, `motorsport`, `festivals`, `sporting_events`, `fairs_shows`, `corporate`, `private_events`, `education`, `outdoor_adventure`
- **Emergency Contacts section**: hidden for admin users (`{!isAdmin && (...)}`) — admins manage orgs, not personal SOS contacts
- Security (biometrics) and Status sections unchanged — shown to all roles

**Updated: TabletSidebar (`components/ui/TabletSidebar.tsx`):**
- `TAB_ICONS` and `TAB_LABELS` extended with `events: '📅'` and `team: '👥'`
- No loop logic changes needed — sidebar iterates `state.routes` which Expo Router already filters by `href`

| File | Change |
|---|---|
| `app/(tabs)/_layout.tsx` | `isAdmin` flag; `href:null` on medic/admin-only tabs; Events + Team Tabs.Screen added |
| `app/(tabs)/events.tsx` | **New** — Admin upcoming events list with status badges |
| `app/(tabs)/team.tsx` | **New** — Admin team roster with role badges |
| `app/(tabs)/settings.tsx` | `isAdmin` flag; org settings state + useEffect; Organisation section; Emergency Contacts wrapped in `{!isAdmin}` |
| `components/ui/TabletSidebar.tsx` | `TAB_ICONS` + `TAB_LABELS` extended with events/team entries |

---

## Previous Updates — Analytics: Platform Admin Compliance (2026-02-18)

### Phase 23-05: Platform Admin Compliance Analytics ✅

Platform admins can now view cross-organisation compliance analytics in a new **Compliance** tab on the admin analytics page (`/admin/analytics`). This closes ANLT-06.

**New Query Hooks (`web/lib/queries/analytics/compliance-history.ts`):**
- `useAdminComplianceTrend()` — Fetches all `compliance_score_history` rows for `vertical='general'` (no org filter; admin RLS allows all rows). Groups by `period_end` client-side, computing `avg_score`, `min_score`, `max_score`, and `org_count` per period. Returns last 52 periods sorted chronologically. Query key: `['admin-compliance-trend']`
- `useOrgComplianceRanking()` — Fetches all compliance rows DESC by `period_start`. Groups by `org_id`, taking the latest 2 scores per org. Fetches org names from `organizations` table (`WHERE id IN uniqueOrgIds`). Computes trend (`up`/`down`/`stable`). Sorts by `latest_score DESC`. Query key: `['org-compliance-ranking']`

**New Interfaces:**
- `AdminComplianceTrendPoint` — `period_end`, `avg_score`, `org_count`, `min_score`, `max_score`
- `OrgComplianceRanking` — `org_id`, `org_name`, `latest_score`, `previous_score`, `trend`

**`AdminComplianceTrend` Component (`web/components/analytics/AdminComplianceTrend.tsx`):**
- Uses `ComposedChart` (NOT LineChart) — required for mixing `Line` and `Area` elements in Recharts
- `Area` element for `max_score` (blue fill, 15% opacity) — top of shaded band
- `Area` element for `min_score` (background fill) — bottom of band; visual subtraction creates shaded range
- `Line` element for `avg_score` (blue, strokeWidth 2) — trend line
- Custom tooltip shows avg, min, max, and org count per period
- YAxis domain `[0, 100]`, dark theme matching revenue-charts.tsx
- Loading skeleton, empty state message
- `ResponsiveContainer` width 100% height 400

**`OrgComplianceTable` Component (`web/components/analytics/OrgComplianceTable.tsx`):**
- Full ranked list of all orgs, sorted best compliance score first
- Top 5 rows: green left accent (`border-l-4 border-green-500`) + "Top Performers" badge
- Bottom 5 rows: red left accent (`border-l-4 border-red-500`) + "Needs Improvement" badge
- Middle rows: no accent
- Columns: Rank (#), Organisation, Score (coloured: ≥70 green, 40–69 yellow, <40 red, shown as `XX/100`), Trend (`ArrowUp` green / `ArrowDown` red / `Minus` gray from lucide-react), Previous score
- Loading skeleton, empty state message

**Admin Analytics Page (`web/app/admin/analytics/page.tsx`) — 9 Tabs:**
- Added `'compliance'` to `activeTab` union type
- Added `'compliance'` to the tabs array (9th tab, rendered as "Compliance")
- Added `'compliance'` to `isNewTab` guard (bypasses legacy metrics loading gate)
- Dynamic imports for both components: `ssr: false`, named export pattern (`.then(m => ({ default: m.NamedExport }))`)
- Compliance tab content: two `bg-gray-800` cards — "Aggregate Compliance Trend" (chart) + "Organisation Rankings" (table)
- All 8 existing tabs preserved

| File | Change |
|---|---|
| `web/lib/queries/analytics/compliance-history.ts` | Modified — added 2 interfaces + 2 hooks (now 4 hooks total) |
| `web/components/analytics/AdminComplianceTrend.tsx` | New — ComposedChart aggregate trend with min/max band + avg line |
| `web/components/analytics/OrgComplianceTable.tsx` | New — ranked compliance table with top/bottom accent rows + trend arrows |
| `web/app/admin/analytics/page.tsx` | Modified — 9th Compliance tab added; 2 dynamic imports; isNewTab guard extended |

---

## Previous Updates — Analytics: Near-Miss Heat Map (2026-02-18)

### Phase 23-02: Near-Miss Geographic Heat Map ✅

Site managers can now view a geographic map of near-miss incidents from the dashboard sidebar under **Analytics**.

**Dashboard Navigation:**
- New **Analytics** sidebar nav item (BarChart3 icon) at `/analytics/heat-map`
- Active state highlights across all `/analytics/*` sub-pages
- File: `web/components/dashboard/DashboardNav.tsx`

**`NearMissHeatMap` Component (`web/components/analytics/NearMissHeatMap.tsx`):**
- CircleMarker-based Leaflet map (no leaflet.heat dependency — uses react-leaflet 5.0.0 already installed)
- Severity colour coding: low=blue (#3B82F6), medium=amber (#F59E0B), high=red (#EF4444), critical=purple (#7C3AED)
- Severity radius scaling: low=6px, medium=10px, high=14px, critical=18px radius
- Each marker has a Popup: category (bold), severity, description (truncated at 120 chars), date (en-GB locale)
- MapBoundsAdjuster sub-component auto-fits UK bounds when data present; defaults to centre UK (54.0, -2.5) zoom 6
- Severity legend: absolute-positioned bottom-right, dark background, four severity levels with colour swatches
- Loading state: pulse skeleton `h-[500px]`
- Empty state: centred message when no GPS data recorded
- SSR-safe: must be imported via `dynamic({ ssr: false })`

**`useNearMissGeoData` Hook (`web/lib/queries/analytics/near-miss-geo.ts`):**
- TanStack Query hook; queryKey `['near-miss-geo']`
- Selects: `id, gps_lat, gps_lng, severity, category, description, created_at` from `near_misses`
- Filters: `gps_lat IS NOT NULL`, `gps_lng IS NOT NULL`, `deleted_at IS NULL`
- Order: `created_at DESC`, limit 500
- staleTime: 5 minutes
- RLS handles org-level access — no explicit `org_id` WHERE clause

**`AnalyticsSubNav` Component (`web/components/analytics/AnalyticsSubNav.tsx`):**
- Shared tab bar for analytics pages
- Two tabs: "Heat Map" → `/analytics/heat-map`, "Compliance Trends" → `/analytics/compliance`
- Active tab: `bg-gray-700 text-white font-medium` styling; inactive: `text-gray-400 hover:text-white hover:bg-gray-800`
- Named export `AnalyticsSubNav`

**Heat Map Page (`web/app/(dashboard)/analytics/heat-map/page.tsx`):**
- Dashboard page at `/analytics/heat-map`
- Dynamic import of NearMissHeatMap with `ssr: false`; loading skeleton `h-[500px] bg-gray-900 rounded-xl animate-pulse`
- Page header: "Near-Miss Heat Map" + subtitle
- AnalyticsSubNav rendered below header
- Map container: `h-[500px] rounded-xl overflow-hidden`

---

## Recent Updates — Motorsport Vertical: Integration Fix & Phase Complete (2026-02-18)

### Phase 19-05: RIDDOR Gate Fix — Non-RIDDOR Verticals Correctly Suppressed (MOTO-04) ✅

Integration verification revealed that two RIDDOR UI surfaces were not guarded by the vertical compliance registry. Both were fixed as orchestrator corrections and committed.

**`app/treatment/new.tsx` — RIDDOR banner gate fix:**
- **Before (wrong):** `if (injuryType?.isRiddorReportable && orgVertical !== 'festivals')`
  - Only excluded festivals; motorsport still showed RIDDOR banner
- **After (correct):** `if (injuryType?.isRiddorReportable && getVerticalCompliance(orgVertical).riddorApplies)`
  - Uses the authoritative vertical compliance registry (`services/taxonomy/vertical-compliance.ts`)
  - Future-proof: any new non-RIDDOR vertical automatically suppresses the banner with no code change

**`web/components/dashboard/treatments-columns.tsx` — RIDDOR badge guard fix:**
- **Before (wrong):** RIDDOR badge column had no vertical guard — would show "RIDDOR" for any treatment with `is_riddor_reportable = true` regardless of vertical
- **After (correct):** Added `nonRiddorVerticals = ['motorsport', 'festivals', 'sporting_events']` check; badge returns `null` for any non-RIDDOR vertical
- Prevents false RIDDOR badges on motorsport, festival, and football treatment rows

**Commit:** `fix(19): use riddorApplies gate for RIDDOR UI in form and dashboard badge`

**Integration Verification Results (Phase 19-05 Task 1):**
All 5 success criteria passed automated code inspection:
- SC-1 ✅ Motorsport form fields present + concussion gate blocks submission (`handleCompleteTreatment` hard return)
- SC-2 ✅ RIDDOR disabled: `'motorsport'` in `NON_RIDDOR_VERTICALS` + `riddorApplies: false` in compliance registry
- SC-3 ✅ Concussion badge renders only for `event_vertical === 'motorsport'` + `competitor_cleared_to_return !== true`
- SC-4 ✅ `motorsport-stats-sheet-generator` Edge Function exists + booking detail has conditional stats button
- SC-5 ✅ Cert ordering: Motorsport UK Medical Official Licence, HCPC Paramedic, PHTLS at top of motorsport cert profile

**Human verification:** User approved all 5 criteria after live-app testing.

---

### Phase 19-04: Medical Statistics Sheet PDF Generator and Concussion Clearance Badge (MOTO-02, MOTO-03) ✅

The `motorsport-stats-sheet-generator` Edge Function aggregates all treatment records for a motorsport booking into a Medical Statistics Sheet PDF. The booking detail page now shows a "Generate Medical Statistics Sheet" button for motorsport bookings, and the treatments table shows a red "Concussion clearance required" badge for uncleared concussion cases.

**`motorsport-stats-sheet-generator` Edge Function (`supabase/functions/motorsport-stats-sheet-generator/`):**
- 4 files: `types.ts`, `stats-mapping.ts`, `MotorsportStatsDocument.tsx`, `index.ts`
- Request: `POST { booking_id }` — aggregates all `event_vertical = 'motorsport'` treatments for the booking
- Returns 404 if no motorsport treatments found; returns 400 if `booking_id` missing
- Uploads PDF to `motorsport-reports/{booking_id}/MedicalStatsSheet-{timestamp}.pdf` (upsert:true, allows regeneration)
- Returns 7-day signed URL

**`types.ts`:**
- `MotorsportStatsRequest`: `{ booking_id: string }`
- `MotorsportStatsData`: event details, aggregate counts (total patients, competitors, spectators/staff), severity/outcome distributions, motorsport-specific counts (concussion, extrication, GCS range, hospital referrals), tabular incidents array

**`stats-mapping.ts`:**
- `mapBookingToStats(booking, treatments, medicName): MotorsportStatsData`
- Counts severity/outcome via `reduce`
- Parses `vertical_extra_fields` safely (handles string JSON, object JSONB, or null)
- Aggregates: `total_competitors` (has `competitor_car_number`), `concussion_count` (`concussion_suspected === true`), `extrication_count` (`extrication_required === true`), `gcs_min`/`gcs_max` (min/max of numeric GCS values), `hospital_referrals` (outcome is `hospital_referral` or `ambulance_called`)
- Maps each treatment to an incident row (time, car number, circuit section, injury, severity, GCS, outcome, concussion flag)

**`MotorsportStatsDocument.tsx`:**
- A4 landscape PDF using `@react-pdf/renderer@4.3.2`
- Header: title, event name, date range, venue, event organiser, CMO name
- 4-card summary grid: patient counts / severity distribution / outcome distribution / motorsport specifics
- Incidents table: sortable by time, red-highlighted rows for concussion cases, alternating gray rows for others
- Footer: "Generated by SiteMedic", booking ID, timestamp
- No emoji; professional 9pt body, 10pt headers

**`index.ts`:**
- Follows `motorsport-incident-generator/index.ts` pattern
- CORS preflight, JSON body parse, 400 on missing `booking_id`
- Service role Supabase client
- Fetches booking with `org_settings(company_name)` join and `shift_end_date`
- Fetches treatments filtered by `booking_id` + `event_vertical = 'motorsport'`, joined with `workers`
- CMO name derived from first treatment's worker
- React.createElement (not JSX) for renderToBuffer call

**Concussion Clearance Badge (`web/components/dashboard/treatments-columns.tsx`):**
- New `motorsport_clearance` column inserted after RIDDOR column, before actions column
- Column header: "Clearance"
- Cell renders `<Badge variant="destructive">Concussion clearance required</Badge>` when:
  - `event_vertical === 'motorsport'` AND
  - `vertical_extra_fields` is not null AND
  - `concussion_suspected === true` AND
  - `competitor_cleared_to_return !== true`
- Returns `null` for all other cases (non-motorsport, cleared, or null extra fields)
- Full null-safety: pre-Phase-18 treatments with `null` `vertical_extra_fields` never crash

**"Generate Medical Statistics Sheet" Button (`web/app/admin/bookings/[id]/page.tsx`):**
- Imports added: `createClient` from `@/lib/supabase/client`, `Button` from `@/components/ui/button`
- New state: `const [statsLoading, setStatsLoading] = useState(false)`
- `handleGenerateStatsSheet()`: invokes `motorsport-stats-sheet-generator` via `supabase.functions.invoke`, opens `signed_url` in new tab on success, shows `toast.success`/`toast.error`
- Button renders only when `booking.event_vertical === 'motorsport'`
- Button disabled and shows `<Loader2>` spinner while generating
- Uses `ClipboardList` icon (already imported) when idle

---

## Overview

SiteMedic is a comprehensive platform combining **mobile medic software** (offline-first treatment logging, RIDDOR compliance) with **business operations infrastructure** (booking portal, payment processing, territory management). The platform enables clients across 10+ industries to book HCPC-registered paramedics online while ensuring automatic compliance documentation and reliable medic payouts.

**Industries served** (as of 2026-02-17 website rework):
- Core verticals: TV & Film Productions, Motorsport & Extreme Sports, Construction & Industrial, Music Festivals & Concerts, Sporting Events, Fairs/Shows/Public Events
- High-value add-ons: Corporate Events, Private Events (weddings/parties/galas), Education & Youth (DBS-checked), Outdoor Adventure & Endurance

**Business Model**: Software bundled with medic staffing service (no separate software charge). Revenue from medic bookings with a configurable platform/medic split (default 60% platform / 40% medic, overridable per employee). Weekly medic payouts via UK Faster Payments, Net 30 invoicing for established corporate clients. Referral bookings (jobs recommended by a third party who cannot take them) trigger a 10% referral payout (configurable) deducted from the platform's share — medic payout is unaffected.

---

## Recent Updates — Festivals Vertical: Compliance Frontend Complete (2026-02-18)

### Phase 20-04: Purple Guide PDF Download Card, Vertical Terminology, and Recommended Certs (FEST-04, FEST-05, FEST-06 Frontend) ✅

The festivals vertical compliance frontend is now complete. The treatment detail page shows festival-specific terminology and a Purple Guide PDF download card; the medic profile surfaces recommended certifications for the org's primary vertical.

**EventIncidentReportCard (`web/components/dashboard/EventIncidentReportCard.tsx`):**
- `'use client'` card component using `useMutation` from `@tanstack/react-query`
- Card title: "Purple Guide — Event Incident Report"
- Button: "Generate Event Incident Report" with FileText icon
- On click: POSTs to `event-incident-report-generator` Edge Function via `generateEventIncidentPDF(treatmentId)`
- On success: opens `signed_url` in a new browser tab
- On error: shows alert "Failed to generate Event Incident Report. Please try again."
- Loading state: "Generating PDF..." during mutation

**`generateEventIncidentPDF` query function (`web/lib/queries/event-incidents.ts`):**
- POSTs to `/functions/v1/event-incident-report-generator`
- Body: `{ incident_id: treatmentId, event_vertical: 'festivals' }`
- Auth: Bearer session `access_token` (fallback to ANON key)
- Returns: `{ success: boolean; pdf_path: string; signed_url: string }`
- Pattern matches RIDDOR `generateF2508PDF` in `web/lib/queries/riddor.ts`

**Treatment Detail Page Terminology (FEST-04) (`web/app/(dashboard)/treatments/[id]/page.tsx`):**
- Card title: `'Attendee Information'` (festivals) / `'Worker Information'` (all other verticals)
- Company field label: `'Event Organiser'` (festivals) / `'Client'` (all other verticals)
- Venue shown when `vertical_extra_fields.venue_name` exists (festivals); Site shown when `vertical_extra_fields.site_name` exists (non-festivals)
- `EventIncidentReportCard` rendered conditionally when `treatment.event_vertical === 'festivals'`
- Page remains a **server component** — client card renders inside server parent (valid Next.js pattern)
- Non-festival treatments: unchanged labels, no download card

**Recommended Certifications on Medic Profile (FEST-05) (`web/app/medic/profile/page.tsx`):**
- Uses `useOrg()` hook to access `industryVerticals` (already in OrgContext — no extra Supabase fetch)
- `primaryVertical = industryVerticals[0] ?? 'general'`
- "Recommended Certifications" section shown when `primaryVertical !== 'general'`
- Subtitle: "Priority certifications for your organisation's vertical"
- Shows top 6 from `getRecommendedCertTypes(primaryVertical)` as badge chips
- Green badge with checkmark: cert is held by this medic
- Gray badge: cert not yet held
- Tooltip (title attr): cert description from `CERT_TYPE_METADATA`
- For festivals vertical top 6: FREC Level 3, FREC Level 4, PHEC, HCPC Paramedic, ALS Provider, PHTLS
- Section hidden for general vertical (avoids showing irrelevant generic recommendations)

---

## Recent Updates — Football / Sports Vertical: FA & SGSA Incident PDF Generation (2026-02-18)

### Phase 22-03: FA Match Day Injury Form and SGSA Medical Incident Report PDF Generation (FOOT-07) ✅

The `fa-incident-generator` Supabase Edge Function now produces two PDF formats for football incidents, routed by `patient_type` in `vertical_extra_fields`. Previously it returned a 501 Not Implemented stub.

**PDF routing logic:**
- `patient_type === 'player'` → FA Match Day Injury Form (`FA-Player-*.pdf`) stored in `fa-incident-reports` bucket
- `patient_type === 'spectator'` → SGSA Medical Incident Report (`SGSA-Spectator-*.pdf`) stored in `fa-incident-reports` bucket
- Missing `patient_type` → HTTP 400
- `event_vertical !== 'sporting_events'` → HTTP 400

**FA Match Day Injury Form PDF (`FAPlayerDocument.tsx`):**
- Title: "FA Match Day Injury Report"
- Accent colour: `#1E3A5F` (FA navy blue)
- Four sections: Player Details (name, squad number, club), Injury Classification (type, body part, phase of play, mechanism, FA severity), Head Injury Assessment / HIA (conducted Y/N, outcome, concussion warning box in amber), Treatment and Outcome
- HIA concussion warning box (amber): shown when HIA outcome includes 'Concussion' — states player must not return to play same day
- Footer: SiteMedic attribution + FA governance note
- FA severity labels: Medical Attention Only, Minor (1–7 days), Moderate (8–28 days), Severe (29–89 days), Major (90+ days)
- Phase of play labels: In Play, Set Piece, Warm-up, Half-time, Training, Post-match

**SGSA Medical Incident Report PDF (`FASpectatorDocument.tsx`):**
- Title: "SGSA Medical Incident Report"
- Accent colour: `#1E3A5F` (navy blue)
- Four sections: Incident Location (stand/area, row/seat), Clinical Details (injury/illness, treatment given, referral outcome, alcohol factor), Safeguarding (conditional — red warning box only when safeguarding_flag is true), Treating Medic
- Safeguarding warning box (red): shown only when flagged — includes notes + instruction to refer to designated safeguarding lead
- Footer: SiteMedic attribution + SGSA ground record retention note
- Referral labels: Treated on Site, Referred to Hospital, Ambulance Conveyed, Self-Discharged

**Data mapping:**
- `fa-player-mapping.ts`: `mapTreatmentToFAPlayer()` — maps treatment + `FootballPlayerFields` to `FAPlayerPDFData`; label lookups for phase_of_play, contact_type, hia_outcome, fa_severity
- `fa-spectator-mapping.ts`: `mapTreatmentToSGSASpectator()` — maps treatment + `FootballSpectatorFields` to `SGSASpectatorPDFData`; referral_outcome label lookup
- Treatment fetched with `workers(first_name, last_name, role, company)` and `organizations(company_name, site_address)` joins
- `vertical_extra_fields` is already a parsed JS object from Supabase (JSONB) — no `JSON.parse()` needed

**Types (`types.ts`):**
- `FAIncidentRequest`: request body interface (incident_id, event_vertical)
- `FootballPlayerFields`: patient_type, squad_number, phase_of_play, contact_type, hia_performed, hia_outcome, fa_severity
- `FootballSpectatorFields`: patient_type, stand_location, stand_row_seat, referral_outcome, safeguarding_flag, safeguarding_notes, alcohol_involvement
- `FootballExtraFields`: union of player | spectator fields
- `FAPlayerPDFData`: normalised data for player PDF component
- `SGSASpectatorPDFData`: normalised data for spectator PDF component

**Storage bucket (`127_fa_incident_storage.sql`):**
- Private bucket `fa-incident-reports` (patient data)
- RLS SELECT: authenticated users who are members of the treatment's org can view (via profiles + treatments join)
- RLS INSERT/UPDATE: service_role only (Edge Function uses service role key)
- Returns 7-day signed URL on success

**Dispatcher wiring:**
- `web/lib/pdf/incident-report-dispatcher.ts` `FUNCTION_BY_VERTICAL['sporting_events']` → `'fa-incident-generator'` (pre-existing from Phase 18 — no change needed)

**Files created/modified:**
- `supabase/functions/fa-incident-generator/FAPlayerDocument.tsx` — new (React-PDF FA player component)
- `supabase/functions/fa-incident-generator/FASpectatorDocument.tsx` — new (React-PDF SGSA spectator component)
- `supabase/functions/fa-incident-generator/fa-player-mapping.ts` — new (player data mapper)
- `supabase/functions/fa-incident-generator/fa-spectator-mapping.ts` — new (spectator data mapper)
- `supabase/functions/fa-incident-generator/types.ts` — replaced (full type set replacing Phase 18 stub types)
- `supabase/functions/fa-incident-generator/index.ts` — replaced (501 stub → full PDF routing implementation)
- `supabase/migrations/127_fa_incident_storage.sql` — new (fa-incident-reports storage bucket + RLS)

---

## Recent Updates — Festivals & Events Vertical: Purple Guide PDF Backend (2026-02-18)

### Phase 20-03: Purple Guide Patient Contact Log PDF Generation (FEST-06 Backend) ✅

The `event-incident-report-generator` Supabase Edge Function now produces a fully-populated Purple Guide PDF and returns a signed download URL. Previously it returned a 501 Not Implemented stub.

**Purple Guide PDF layout (`PurpleGuideDocument.tsx`):**
- Title: "Purple Guide — Patient Contact Log"
- Subtitle: "Events Industry Forum — Health, Safety and Welfare at Events"
- Header accent colour: `#6B21A8` (purple)
- Six sections: Patient Identifier, Presenting Complaint, Treatment Given, Flags, Disposition, Attending Medic
- Triage priority colour-coded badge: P1=#DC2626 (red), P2=#F59E0B (amber), P3=#22C55E (green), P4=#1F2937 (black)
- Alcohol/substance and safeguarding flags shown as highlighted badges
- Safeguarding warning callout rendered in amber when safeguarding concern is raised
- Footer: SiteMedic attribution + Purple Guide framework reference (EIF 8th edition)

**Treatment-to-PDF data mapping (`purple-guide-mapping.ts`):**
- `mapTreatmentToPurpleGuide()` maps raw Supabase treatment row to `PurpleGuideData`
- Event name sourced from `bookings.site_name` (not a denormalised column)
- Event date sourced from `bookings.shift_date` (falls back to `treatment_date`)
- Triage priority parsed from `vertical_extra_fields.triage_priority` (defaults P3 if missing)
- Alcohol/substance and safeguarding flags read from `vertical_extra_fields`
- Disposition label mapped from `vertical_extra_fields.disposition` (defaults to "Discharged on site")
- Null-safe throughout — missing fields render as "Not recorded" or sensible defaults; never crashes

**Edge Function implementation (`index.ts` — 501 stub replaced):**
- Creates Supabase service-role client
- Fetches treatment with joins: `medics`, `org_settings!treatments_org_id_fkey`, `workers`, `bookings(site_name, shift_date)`
- Renders PDF via `@react-pdf/renderer@4.3.2` `renderToBuffer()`
- Uploads to `event-incident-reports` storage bucket with `upsert: true`
- Returns `{ success: true, pdf_path, signed_url }` with 7-day signed URL
- Preserves CORS headers, OPTIONS handler, and event_vertical validation from stub

**Storage bucket (`125_event_incident_reports_storage.sql`):**
- Private bucket `event-incident-reports` (patient data)
- RLS SELECT: authenticated users who are members of the treatment's org can view
- RLS INSERT/UPDATE: service_role only (Edge Function)

**Types (`types.ts`):**
- `PurpleGuideData` interface added alongside existing `EventIncidentData`

**Files created/modified:**
- `supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx` — new (React-PDF component)
- `supabase/functions/event-incident-report-generator/purple-guide-mapping.ts` — new (data mapper)
- `supabase/functions/event-incident-report-generator/types.ts` — updated (PurpleGuideData added)
- `supabase/functions/event-incident-report-generator/index.ts` — updated (501 stub → full flow)
- `supabase/migrations/125_event_incident_reports_storage.sql` — new (storage bucket + RLS)

---

## Recent Updates — Film/TV Production Vertical: Terminology + Cert Ordering (2026-02-18)

### Phase 21-02: Film/TV Cast & Crew Terminology and Cert Ordering ✅

When a Film/TV org is active (`primaryVertical === 'tv_film'`), the mobile app now uses production-industry terminology throughout all worker and treatment screens.

**Workers tab dynamic labelling (`app/(tabs)/_layout.tsx`):**
- Tab bar label: `Workers` → `Cast & Crew`
- Tab bar header title: `Worker Registry` → `Cast & Crew Registry`
- Driven by `useOrg()` + `getPatientLabel()` — no hardcoded strings

**Workers list dynamic labelling (`app/(tabs)/workers.tsx`):**
- "Add Worker" button → "Add Cast & Crew"
- Empty state "No Workers Registered" → "No Cast & Crew Registered"
- Empty state subtitle uses vertical-aware wording

**Worker creation screens:**
- `app/worker/new.tsx` — form title: "Add Worker - Site Induction" → "Add Crew member - Site Induction"
- `app/worker/quick-add.tsx` — title: "Quick Add Worker" → "Quick Add Crew member"; Add button label updated

**Worker profile screen (`app/worker/[id].tsx`):**
- Error text uses `personLabel` for consistency
- `useOrg` and `getPatientLabel` imported for future vertical-aware section headings

**Treatment detail screen (`app/treatment/[id].tsx`):**
- "Worker Information" section heading → "Crew member Information" (for tv_film)
- Driven by `patientLabel = getPatientLabel(primaryVertical)`

**Treatment templates screen (`app/treatment/templates.tsx`):**
- "1. Select Worker" heading → "1. Select Crew member" (for tv_film)
- Search placeholder adapts to vertical person label

**Updated cert profile ordering (`services/taxonomy/certification-types.ts` + `web/types/certification.types.ts`):**
- `tv_film` `VERTICAL_CERT_TYPES` now starts: HCPC Paramedic, ScreenSkills Production Safety Passport, FREC 4, EFR
- Followed by: PHEC, PHTLS, ALS Provider, ATLS, FREC 3
- CSCS and IPAF removed from `tv_film` ordering (remain in master `CERT_TYPES` / `UK_CERT_TYPES` arrays)

**New terminology helper functions (`services/taxonomy/vertical-outcome-labels.ts`):**
- `getLocationLabel(verticalId)` — returns location noun: "Set" for tv_film, "Site" for construction, "Circuit" for motorsport, etc.
- `getEventLabel(verticalId)` — returns event/booking noun: "Production" for tv_film, "Client" for construction, "Event" for motorsport, etc.

**FILM-04 dispatch verification:**
- `web/lib/pdf/incident-report-dispatcher.ts` confirmed: `tv_film` routes to `riddor-f2508-generator` — no code change needed

**Files modified:**
- `services/taxonomy/certification-types.ts` — tv_film cert ordering
- `web/types/certification.types.ts` — tv_film cert ordering (mirrored)
- `services/taxonomy/vertical-outcome-labels.ts` — getLocationLabel + getEventLabel added
- `app/(tabs)/_layout.tsx` — dynamic Workers tab labels
- `app/(tabs)/workers.tsx` — dynamic Add/empty state labels
- `app/worker/new.tsx` — form title uses personLabel
- `app/worker/quick-add.tsx` — title and button use personLabel
- `app/worker/[id].tsx` — useOrg imported; error text uses personLabel
- `app/treatment/[id].tsx` — "Worker Information" → "{patientLabel} Information"
- `app/treatment/templates.tsx` — "1. Select Worker" and placeholder use personLabel

---

## Recent Updates — Film/TV Production Vertical: Form Section + Cert Types (2026-02-18)

### Phase 21-01: Film/TV Treatment Form Section and Cert Registry Entries ✅

When a medic is working on a Film/TV production (`orgVertical === 'tv_film'`), the treatment logging form now shows a **Production Details** section capturing incident context required for F2508 RIDDOR completeness.

**New conditional form section** (`app/treatment/new.tsx`):
- **Production Title** — free-text field (e.g. "The Crown S8")
- **Patient Role** — picker with 9 crew roles: Cast, Stunt Performer, Director, Camera, Grip, Lighting, Art Dept, Costume, Other Crew
- **SFX / Pyrotechnic Involved** — toggle button (highlights amber when active)
- **Scene / Shot Context** — multi-line textarea (e.g. "Car chase scene, Stage 4")

**Data wiring:**
- All 4 fields are serialised as a JSON string into `verticalExtraFields` and written to the `vertical_extra_fields` JSONB column on every auto-save (10s interval)
- `vertical_extra_fields` is included in the `enqueueSyncItem` payload so the data syncs to Supabase when connectivity is restored
- Stored as raw JSON string (`@text` column) — consistent with Phase 18 design; parsed at call site by the RIDDOR completeness gate (Plan 21-03)

**New cert types** (both mobile `services/taxonomy/certification-types.ts` AND web `web/types/certification.types.ts`):
- **ScreenSkills Production Safety Passport** — CPD-based production safety cert with no fixed expiry; issued by ScreenSkills
- **EFR (Emergency First Responder)** — basic pre-hospital first aid; 3-year renewal; various issuers (Highfield, RCN, FPHC)

Both cert types are prerequisites for Plan 21-02 which sets up the ordered cert recommendation list for the `tv_film` vertical.

**Files modified:**
- `app/treatment/new.tsx` — Film/TV conditional section, 5 state vars, `verticalExtraFields` in formValues/fieldMapping/sync payload, patient role BottomSheetPicker
- `services/taxonomy/certification-types.ts` — ScreenSkills Production Safety Passport + EFR in CERT_TYPES array and CERT_TYPE_INFO record
- `web/types/certification.types.ts` — ScreenSkills Production Safety Passport + EFR in UK_CERT_TYPES array and CERT_TYPE_METADATA record

---

## Recent Updates — Auth Race-Condition Fix (2026-02-17)

### Fix: "Could not load org" on Save Contact (online) ✅

**Root cause (Mode A — race condition):** `getUserProfile()` previously called `supabase.auth.getUser()`, which makes a live HTTP request to validate the JWT. On iOS startup, the Supabase JS client loads its session from AsyncStorage asynchronously. If `getUser()` ran before that load completed, the client had no JWT → returned `{ user: null }` → `state.user` was set to null, even though the user is fully authenticated.

**Root cause (Mode B — null `org_id` in DB):** If a user's `profiles` row has `org_id = null` (e.g. created via a legacy signup flow), `fetchUserProfile()` returns a profile object with `orgId = null`. The `if (profile)` check passes (object truthy), but `state.user.orgId` is still null.

**Fix 1 — `src/lib/auth-manager.ts` `getUserProfile()`:**
- Replaced `supabase.auth.getUser()` (network round-trip) with `supabase.auth.getSession()` (local AsyncStorage read, always fast and available on startup).
- If DB profile has `orgId = null`, supplemented with `session.user.user_metadata.org_id` (written at signup, embedded in the JWT).

**Fix 2 — `app/(tabs)/settings.tsx` `handleAddContact()`:**
- Moved `supabase` dynamic import to top of `try` block so it can be used for both the fallback and the DB operations.
- Added belt-and-suspenders: if `state.user?.orgId` is still null at save time, falls back to `session.user.user_metadata.org_id` via `getSession()` (local, no network).
- Only throws "Could not load org" if both state and JWT fallback return null (user is genuinely unauthenticated).

**Files modified:**
- `src/lib/auth-manager.ts` — `getUserProfile()` method
- `app/(tabs)/settings.tsx` — `handleAddContact()` first block

---

## Recent Updates — Website Multi-Vertical Rework (2026-02-17)

### Apex Website: Multi-Vertical Positioning ✅

The public-facing Apex Safety Group marketing website has been completely reworked from a construction-only positioning to a broad multi-vertical positioning covering 10+ industries.

**Files changed (pass 1 — pages & layout components):**
- `web/app/(marketing)/page.tsx` — Complete rewrite. New sections: multi-vertical hero (new headline/copy/badge row), 10-sector verticals grid (6 core + 4 add-ons), updated problem section (first-aid vs HCPC comparison), 3 service pillars (Event Medical, Occupational Health, Motorsport & Production), updated comparison table (Basic First Aid vs Nurse vs HCPC Paramedic), refreshed compliance grid (added Purple Guide, Motorsport UK, FA Governance, ISO 45001), updated CTA.
- `web/app/(marketing)/services/page.tsx` — Complete rewrite. Replaced 4-layer construction OH services with 10 individual vertical cards (TV/Film, Motorsport, Construction, Festivals, Sporting Events, Fairs, Corporate, Private Events, Education, Outdoor Adventure). Each card: description, services list, compliance framework, starting price, book CTA. Added sticky jump-link nav bar.
- `web/app/(marketing)/about/page.tsx` — Significant update. Expanded founding story from construction-only to all sectors. Added 10-industry grid. Updated mission statement, stats (10+ industries), and values copy.
- `web/components/marketing/site-footer.tsx` — Updated brand description and Services column (now shows industry verticals: TV/Film, Motorsport, Festivals, Sporting Events, Construction). Added FA Governance and Motorsport UK compliance badges.
- `web/components/marketing/hero.tsx` — Updated headline and copy from construction-specific to multi-vertical. Updated compliance badge row (HCPC, Purple Guide, RIDDOR, UK GDPR).

**Files changed (pass 2 — remaining components & forms):**
- `web/app/layout.tsx` — Updated root metadata title ("Professional Paramedics for Events, Productions & Worksites") and description (multi-vertical).
- `web/components/marketing/trust-signals.tsx` — Expanded from 5 to 8 compliance badges. Added Purple Guide, Motorsport UK, FA Governance. Updated grid layout.
- `web/app/(marketing)/pricing/page.tsx` — Updated hero subtitle, FAQ text, and CTA copy from construction-only to multi-vertical.
- `web/components/marketing/pricing-table.tsx` — Updated base package label ("Any Event or Site"), add-on section description, and OH add-on badge labels (Health Surveillance: "Construction & Industrial", D&A: "Construction & Corporate").
- `web/app/(marketing)/contact/page.tsx` — Updated metadata description and all copy to be multi-vertical.
- `web/app/(marketing)/contact/contact-form.tsx` — Updated: SITE_SIZES (workers → people/attendees), ENQUIRY_TYPES (13 options covering all verticals), form labels ("site workforce size" → "event / site size"), message placeholder, company placeholder, and what-happens-next step copy.
- `web/components/QuoteBuilder.tsx` — Major update to Step 1: new event type dropdown (12 options covering all verticals), updated worker count label ("maximum people at event/site"), updated recommendation engine copy (Purple Guide / HSE), updated special requirements (7 options: remote access, height, motorsport extraction, crowd medicine, DBS-checked, CSCS, trauma specialist), updated address labels ("venue / site address"), updated what3words description. Step 2: updated summary labels ("Project Details" → "Event / Site Details", "Workers on site" → "People at peak", "Project type" → "Event / site type").

**Compliance frameworks added to website:**
- Purple Guide (Event Industry Forum) — festivals & concerts
- Motorsport UK / MSA — circuit medical
- FA Governance — football events
- ISO 45001 — occupational safety standard

---

## Recent Updates — Industry Vertical Paperwork System (2026-02-17)

A full end-to-end vertical-awareness layer has been added to SiteMedic, making the platform aware of which industry sector each medic is working in and adapting all forms, compliance documents, and certification requirements accordingly.

---

### Phase 18A: Org Industry Vertical Settings ✅

Each organisation can now declare one or more industry verticals it operates in. This drives vertical-specific behaviour throughout the platform.

**Database:** Migration `121_org_industry_verticals.sql` adds `industry_verticals JSONB NOT NULL DEFAULT '["construction"]'` to `org_settings` with a GIN index for efficient JSONB array queries.

**Admin Settings UI:** The `/admin/settings` page now includes an "Industry & Verticals" section where admins can select their active verticals from a multi-select list of all 10 supported verticals.

**Platform-wide context:** The `OrgContext` (`web/contexts/org-context.tsx`) now exposes `industryVerticals: VerticalId[]`. All client components can read the org's verticals via `useOrg()` without additional API calls.

| File | Change |
|------|--------|
| `supabase/migrations/121_org_industry_verticals.sql` | **New** — `industry_verticals` JSONB column on `org_settings` |
| `web/app/admin/settings/page.tsx` | **Modified** — Industry & Verticals multi-select section |
| `web/contexts/org-context.tsx` | **Modified** — `industryVerticals` added to context |

---

### Phase 18B: Vertical-Aware Booking Requirements ✅

The booking form's "Special Requirements" section now adapts to the selected industry vertical instead of showing two hardcoded construction checkboxes. Each vertical has 4–6 relevant requirement options (e.g., Trauma Specialist, Confined Space Access, DBS Check, Race Control Radio, Helicopter LZ, etc.). Requirements that appear in multiple verticals (shared requirements) use the same stable ID string so they don't create duplicate data.

**Key files:**

| File | Change |
|------|--------|
| `web/lib/booking/vertical-requirements.ts` | **New** — Per-vertical requirement maps. Exports `VERTICAL_LABELS`, `VERTICAL_REQUIREMENTS`, `requirementsToBooleans()`, `requirementsToNotes()`. Requirements with a `dbField` map directly to DB boolean columns (`confined_space_required`, `trauma_specialist_required`); others are serialised into `special_notes`. |
| `web/lib/booking/types.ts` | **Modified** — Added `eventVertical: string` and `selectedRequirements: string[]` to `BookingFormData`. Backward-compatible boolean fields retained. |
| `web/components/booking/shift-config.tsx` | **Rewritten** — Dynamic requirements checklist. Selecting a vertical resets requirements; toggling a requirement auto-syncs DB booleans via `requirementsToBooleans()`. |
| `web/components/booking/booking-form.tsx` | **Modified** — Reads org's primary vertical via `useOrg()` and pre-fills the vertical selector. Non-boolean requirements appended to `specialNotes` via `requirementsToNotes()`. |

**Vertical requirements overview:**

| Vertical | Example Requirements |
|----------|---------------------|
| Construction | Confined Space, Trauma Specialist, Height Work, CSCS Site |
| TV & Film | Trauma Specialist, Stunt Coverage, Confined Space, Night Shoot |
| Motorsport | Race Control Radio, Helicopter LZ, Driver Extraction, Trauma Specialist |
| Festivals | Crowd Medicine, DBS Check, Helicopter LZ, Trauma Specialist |
| Education | DBS Check (Children), Paediatric First Aid, Safeguarding Lead |
| Outdoor & Adventure | Wilderness/Remote Access, Helicopter LZ, Trauma Specialist, DBS Check |

---

### Phase 18C: Pre-Event Medical Brief ✅

Each booking now has a pre-event medical brief / Event Medical Plan that the admin or medic completes before the shift. Common fields (A&E location, helicopter LZ, rendezvous point, on-site contact, hazards) are always shown. Vertical-specific fields are additionally shown based on the booking's event vertical.

**Database:** Migration `123_booking_briefs.sql` creates the `booking_briefs` table (one-to-one with `bookings`) and adds `event_vertical TEXT` to the `bookings` table. The brief has a status workflow: `not_started → in_progress → complete`.

**Admin UI:** A new booking detail page at `/admin/bookings/[id]` hosts the brief form alongside key booking details (shift, client, medic, pricing, site details). This is the first dedicated booking detail page in the admin dashboard.

**Common brief fields (all verticals):**
- Nearest A&E name and address
- A&E travel time (minutes)
- Helicopter landing zone description / what3words
- Emergency services rendezvous point
- On-site contact (name + phone)
- Known site hazards (free text)

**Vertical-specific extra fields (examples):**

| Vertical | Extra Fields |
|----------|-------------|
| Construction | Site manager emergency number, Confined space rescue plan, Site safety induction completed |
| Motorsport | Race Control radio channel, CMO name and contact, Extrication equipment at event |
| Festivals | Medical Information Point reference, Crowd capacity, Festival wristband medical code |
| Education | Safeguarding lead name and contact, Parent/guardian consent protocol, School nurse on site |
| Outdoor Adventure | Grid reference / what3words of activity area, Nearest mountain rescue post, Activity lead contact |

| File | Change |
|------|--------|
| `supabase/migrations/123_booking_briefs.sql` | **New** — `booking_briefs` table + `event_vertical` column on `bookings`. RLS uses `get_user_org_id()` + `is_platform_admin()` helpers. |
| `web/app/api/admin/bookings/[id]/brief/route.ts` | **New** — GET (fetch/empty brief) + PUT (upsert brief fields + event_vertical) API route. Auto-detects `in_progress` status. |
| `web/components/bookings/booking-brief-form.tsx` | **New** — Full brief form with 8 common fields + vertical-specific collapsible section (11 verticals × 4–6 extra fields). "Save Draft" and "Mark Brief Complete" buttons. |
| `web/app/admin/bookings/[id]/page.tsx` | **New** — Admin booking detail page: back link, header with status badge, 3-col key details grid, pricing grid, site details, and brief form. |

---

### Phase 18D: Vertical-Aware Treatment Form (Mobile) ✅

The mobile treatment logging form now adapts to the medic's organisation vertical. Two elements are dynamically loaded per vertical: mechanism-of-injury presets (quick-tap chips) and outcome labels/patient terminology.

**Mechanism presets:** Each of 11 verticals has 8 tailored presets. For example, motorsport = `['Vehicle collision', 'Motorcycle / bicycle off', 'Rollover', 'Driver extraction required', ...]`; festivals = `['Crush injury (crowd)', 'Hyperthermia / heat illness', 'Substance intoxication', ...]`.

**Outcome labels:** The "returned to work (same duties)" and "returned to work (light duties)" outcomes are relabelled per vertical. For motorsport: "Returned to race / event duties". For festivals: "Returned to festival / event". The "patient" term changes to "Worker", "Crew member", "Driver / Competitor", "Attendee", etc.

| File | Change |
|------|--------|
| `services/taxonomy/mechanism-presets.ts` | **New** — `MECHANISM_PRESETS_BY_VERTICAL` (11 verticals × 8 presets), `getMechanismPresets(verticalId)` |
| `services/taxonomy/vertical-outcome-labels.ts` | **New** — `OUTCOME_LABEL_OVERRIDES`, `getVerticalOutcomeCategories()`, `getOutcomeLabel()`, `getPatientLabel()` |
| `app/treatment/new.tsx` | **Modified** — Fetches org's primary vertical on mount. Derives mechanism presets, outcome categories, patient label dynamically. Post-treatment success alert shows vertical-appropriate compliance guidance. |

---

### Phase 18E: Per-Vertical Compliance Frameworks ✅

The platform now understands which regulatory reporting framework applies per industry vertical and surfaces this information at key touchpoints.

**Framework taxonomy:** Each vertical is mapped to its primary compliance framework: RIDDOR (HSE) for construction/TV film/corporate, Purple Guide for festivals, Motorsport UK / FIA for motorsport, FA / NGB Incident Report for sporting events, RIDDOR + Ofsted for education, Event Incident Report for fairs/private events.

**Mobile treatment form:** After completing a treatment, the medic sees a vertical-appropriate guidance message instead of a generic "Treatment logged successfully." For example, a festival medic sees: *"Under Purple Guide guidelines, all patient contacts should be recorded in the Event Incident Log. For STAFF/CREW injuries, RIDDOR may still apply."*

**Admin incidents page:** The `/riddor` page now reads the org's primary vertical and adapts its header title (e.g., "Race Incidents" for motorsport), compliance badge (e.g., "Motorsport UK / FIA"), and framework description. For non-RIDDOR verticals, a contextual amber info banner explains that RIDDOR applies to staff injuries only.

| File | Change |
|------|--------|
| `services/taxonomy/vertical-compliance.ts` | **New** (mobile) — `VerticalComplianceConfig` interface, `getVerticalCompliance()`, `isRIDDORVertical()`, `getPostTreatmentGuidance()`. Maps all 11 verticals to their compliance config. |
| `web/lib/compliance/vertical-compliance.ts` | **New** (web) — Identical taxonomy for web frontend use. |
| `app/treatment/new.tsx` | **Modified** — Post-treatment Alert now uses `compliance.postTreatmentGuidance` instead of generic message. |
| `web/app/(dashboard)/riddor/page.tsx` | **Modified** — Page title, badge, description, and empty states adapt to org's primary vertical. Non-RIDDOR verticals show amber info banner. |

---

### Phase 18F: Expanded Certification Types ✅

Certification types have been expanded from 5 construction-specific types to 36 types covering all 10 industry verticals. Each cert type has metadata (label, category, description, renewal URL). A per-vertical recommended list surfaces the most relevant certs in the admin form first.

**New cert categories added:**

| Category | New Types |
|----------|-----------|
| Medical / Clinical | FREC 3, FREC 4, PHEC, PHTLS, HCPC Paramedic, EMT, ALS Provider, PALS Provider, ATLS, BLS Instructor, AED Trained |
| DBS / Safeguarding | Enhanced DBS (Children), Enhanced DBS (Adults), Enhanced DBS (Barred Lists) |
| Motorsport | FIA Grade 1, FIA Grade 2, FIA Grade 3, Motorsport UK CMO Letter, MSA First Aider |
| Events & Festivals | SIA Door Supervisor, Purple Guide Certificate, Event Safety Awareness, NEBOSH General Certificate |
| Education | Paediatric First Aid, Child Safeguarding Level 2, Child Safeguarding Level 3 |
| Outdoor & Adventure | Mountain First Aid, Wilderness First Aid |
| Construction (retained) | CSCS, CPCS, IPAF, PASMA, Gas Safe |

**Vertical-aware cert recommendations:** `getRecommendedCertTypes(verticalId)` returns all cert types sorted with the most relevant for that vertical first (e.g., motorsport medics see FIA grades and ATLS before CSCS).

| File | Change |
|------|--------|
| `web/types/certification.types.ts` | **Expanded** — `UK_CERT_TYPES` extended from 5 to 36 types. Added `CertTypeMetadata`, `CERT_TYPE_METADATA` record, `VERTICAL_CERT_TYPES` map, `getRecommendedCertTypes()`. `CERT_RENEWAL_URLS` now generated from metadata. `CertificationReminder.cert_type` widened to `string`. |
| `services/taxonomy/certification-types.ts` | **New** (mobile) — Same 36 cert types + metadata + vertical mapping for use in the React Native app. |

---

## Recent Updates — Analytics Dashboard (2026-02-17)

### Phase 12: Analytics Dashboard ✅

Three new analytics tabs added to the admin analytics page, surfacing operational metrics that have been computed in the background since Phase 07.5 but were never visible to admins. The analytics page now has **7 tabs** (overview, medics, geofences, alerts, territory, assignments, utilisation).

**Territory Analytics Tab**

The new "Territory" tab visualises coverage across all regions:

- **Territory Heatmap** — Shows a summary grid (total territories, active territories, avg utilisation %, territories needing hiring, open coverage gaps, avg rejection rate) above a full Leaflet map rendered via dynamic import with `ssr:false` to avoid SSR crashes. Accepts a `TerritoryMapComponent` prop for flexible map rendering.
- **Hiring Trigger Cards** — Each card shows a sector with critical capacity shortage. Cards with `weeks_active >= 3` show a pulsing red "HIRE NOW" badge with `animate-ping`. Cards display: sector code, territory name, utilisation %, consecutive high-utilisation weeks, coverage %, and rejection rate. Enriched from `territory.hiring_trigger_weeks` at render time (fixes a hardcoded `weeks_active: 0` in the underlying lib).
- **Coverage Gap Table** — Sortable table (sortable by rejection rate, click header to toggle ASC/DESC) showing territories with `minimum_volume_met === true`. Columns: sector, territory name, total bookings, rejection rate, unfulfilled bookings. Rows colour-coded: red (>25% rejection), yellow (10-25%), green (<10%).

**Assignments Analytics Tab**

The new "Assignments" tab surfaces auto-assignment system performance from `auto_schedule_logs`:

- **Assignment Success Rate Chart** — Dual-axis LineChart (Recharts). Left Y-axis: success rate 0–100% (green line). Right Y-axis: total attempts (blue dashed line). X-axis: ISO week label (e.g. "W7 2026"). Summary cards above: average success rate, total attempts, average confidence score. Empty state: "No auto-assignment data recorded yet. Data will appear after the auto-assignment system processes bookings."
- **Failure Reason Breakdown Chart** — Aggregates `top_failure_reason` across all 12 weeks, counts occurrences, renders as a red vertical BarChart sorted by frequency. Empty state: "No assignment failures recorded — excellent auto-assignment performance!"

**Utilisation Analytics Tab**

The new "Utilisation" tab shows per-medic performance metrics:

- **Medic Utilisation Table** — Sortable by: utilisation % (default DESC), medic name, total shifts. Columns: medic name, utilisation % (with coloured progress bar), booked days / 5, total shifts completed, territory count, availability status badge. `getUtilizationTextColor()` applied to the % value. Empty state: "No medic data available."
- **Out-of-Territory Bookings Chart** — Summary cards: total OOT bookings, total extra cost (£), OOT % of all bookings. Horizontal BarChart (orange) showing top 10 OOT bookings by `out_of_territory_cost`. Tooltip shows medic ID, site postcode, shift date, cost, and type ("Travel Bonus" or "Room & Board" based on `out_of_territory_type`). Empty state: "No out-of-territory bookings recorded."
- **Late Arrival Heatmap** — CSS grid (not Recharts), rows = medics, columns = Mon–Fri. Cell colour intensity: 0 lates (gray), 1–2 (yellow), 3–5 (orange), 6+ (red). Summary stats above: total late arrivals, worst day, worst medic. Empty state: "No late arrival alerts recorded."

**Data API Layer**

New file `web/lib/queries/admin/analytics.ts` provides TanStack Query hooks consumed by all three tabs:

| Hook | Source | Returns |
|------|--------|---------|
| `useAutoAssignmentStats` | `auto_schedule_logs` (direct `.eq('org_id', orgId)`) | `WeeklyAssignmentStats[]` — 12 weeks grouped by ISO week |
| `useMedicUtilisation` | `medics` + `bookings` + `territories` (parallel) | `MedicUtilisation[]` — per-medic utilisation |
| `useLateArrivalPatterns` | `medic_alerts` where `alert_type='late_arrival'` | `LateArrivalSummary` with patterns, worst_day, worst_medic |
| `useOutOfTerritoryBookings` | `bookings` where `out_of_territory_cost > 0` | `OOTSummary` with bookings array + aggregates |

All hooks: `staleTime: 60000`, `refetchInterval: 300000`, `org_id` guard in every query (multi-tenant isolation).

**Architecture Decisions**

- Static imports for all chart components (they are `'use client'`, no SSR issues)
- Dynamic import with `ssr: false` only for `TerritoryMapDynamic` (Leaflet requires browser APIs)
- Sub-components `TerritoryTab`, `AssignmentsTab`, `UtilisationTab` defined before the page default export — hooks only run when the tab is active
- `isNewTab` guard in analytics page prevents legacy `useEffect`-based loading gates from blocking new TanStack Query-powered tabs
- Column `out_of_territory_cost` / `out_of_territory_type` (not `travel_bonus` / `room_board` — those columns do not exist)

| File | Change |
|------|--------|
| `web/lib/queries/admin/analytics.ts` | **New** — 4 hooks + 6 types for analytics data |
| `web/components/admin/territory-analytics-charts.tsx` | **New** — TerritoryHeatmap, HiringTriggerCards, CoverageGapTable |
| `web/components/admin/assignment-analytics-charts.tsx` | **New** — AssignmentSuccessChart, FailureBreakdownChart |
| `web/components/admin/medic-utilisation-charts.tsx` | **New** — MedicUtilisationTable, OOTBookingsChart, LateArrivalHeatmap |
| `web/app/admin/analytics/page.tsx` | **Modified** — Extended from 4 to 7 tabs; added 3 sub-components; dynamic TerritoryMap import |

---

## Recent Updates — Booking Data Completeness (2026-02-17)

### Phase 09: Booking Data Completeness ✅

Surfaced all booking fields that were stored in the database but never displayed in any UI. Clients now see everything they entered; admins now see full operational context for every booking.

**What3Words Location Display**

A reusable `What3WordsDisplay` component now renders what3words addresses across the platform. Displays the address in `///word.word.word` format with a copy-to-clipboard button (2-second "Copied!" feedback) and an external link that opens the location on what3words.com.

**Client-Facing Booking Confirmation**

The booking confirmation page now shows all client-relevant fields:
- `specialNotes` — displayed with `whitespace-pre-wrap` to preserve line breaks
- `what3words_address` — rendered via the `What3WordsDisplay` component with copy + link
- Recurrence pattern and recurring weeks already shown (pre-existing)

The `/api/bookings/[id]` API route was updated to include `what3words_address` in its response (field was fetched but never returned).

**Admin Booking Detail Panel**

A new `BookingDetailPanel` Sheet slide-over (right side) is now accessible from the admin bookings table. The "View Details" dropdown option — previously a no-op — now opens this panel. Sections include:

| Section | When Shown |
|---------|-----------|
| Date & Time | Always |
| Site Details (address, contact name, contact phone, what3words) | Always (fields conditional) |
| Client & Medic (auto-matched badge, match score) | Always |
| Pricing (total, platform fee, medic payout, travel surcharge, urgency premium) | Always (extras conditional) |
| Approval Details (approval reason, approved by, approved at) | Only when `requires_manual_approval` is true |
| Cancellation Details (reason, cancelled by, cancelled at) | Only when `status === 'cancelled'` |
| Refund Amount | Only when `refund_amount > 0` |
| Special Notes | Only when present |
| Recurring Chain | Only when `is_recurring` is true |

**Recurring Booking Chain View**

When a booking is part of a recurring series, the admin detail panel shows a table of all instances — parent and children — fetched in a single Supabase `.or()` query. Each row shows date, time range, and status badge. The currently-viewed booking is highlighted in blue with a "(viewing)" label.

| File | Change |
|------|--------|
| `web/components/booking/what3words-display.tsx` | **New** — Reusable read-only display component; `'use client'`; clipboard copy with 2s feedback; external map link |
| `web/app/api/bookings/[id]/route.ts` | **Modified** — Added `what3words_address` to response JSON |
| `web/components/booking/booking-confirmation.tsx` | **Modified** — Added `specialNotes` and `what3wordsAddress` props; conditional render for both; imports `What3WordsDisplay` |
| `web/app/(booking)/book/confirmation/page.tsx` | **Modified** — Maps `special_notes` and `what3words_address` from API to confirmation component props |
| `web/lib/queries/admin/bookings.ts` | **Modified** — Added `what3words_address: string \| null` to `BookingWithRelations` interface |
| `web/components/admin/booking-detail-panel.tsx` | **New** — Full admin booking detail Sheet component with all 9 sections |
| `web/components/admin/booking-approval-table.tsx` | **Modified** — Wired "View Details" onClick to open `BookingDetailPanel`; added panel state and component render |

---

## Recent Updates — Experience Tiers + Mileage Reimbursement (2026-02-17)

### Experience-Based Payout Tiers ✅

Each medic is now assigned an experience tier (Junior / Senior / Lead) that determines their payout percentage of booking revenue. Changing the tier in the admin dashboard automatically updates the medic's `medic_payout_percent` and `platform_fee_percent` via a database trigger. The tier can be changed at any time without affecting historical payslips (each payslip snapshots the % used at the time).

| Tier | Medic Payout | Platform Share |
|------|-------------|----------------|
| Junior | 35% | 65% |
| Senior | 42% | 58% |
| Lead / Specialist | 50% | 50% |

| File | Change |
|------|--------|
| `supabase/migrations/116_experience_tiers_and_mileage.sql` | **New** — Adds `experience_level TEXT` column to `medics` (`junior \| senior \| lead`, default `junior`). DB trigger `trg_payout_from_experience_level` auto-syncs `medic_payout_percent` and `platform_fee_percent` when tier changes. Adds `mileage_miles`, `mileage_rate_pence`, `mileage_reimbursement` columns to `timesheets`. |
| `web/lib/medics/experience.ts` | **New** — `EXPERIENCE_TIERS` constant, `EXPERIENCE_TIER_LIST`, `ExperienceLevel` type, `calculateMileageReimbursement()`, `calculateTotalMedicPayout()` (shift % + mileage). HMRC rate constant `HMRC_MILEAGE_RATE_PENCE = 45`. |
| `web/lib/booking/types.ts` | **Modified** — Added `ExperienceLevel` type (`'junior' \| 'senior' \| 'lead'`). |
| `web/lib/payouts/calculator.ts` | **Modified** — Replaced hardcoded 71.4% split with per-medic `medic_payout_percent`. `calculatePayout()` now accepts `medicPayoutPercent` and `mileageMiles` params. `PayoutCalculation` interface now includes `shiftPayout`, `mileageReimbursement`, `totalPayout`. `validatePayout()` updated to include mileage in expected amount. |
| `web/components/medics/compensation-settings.tsx` | **New** — Admin client component. 3-button tier selector (Junior/Senior/Lead) with live payout preview (example 8-hr shift + 12 miles). Shows shift payout, mileage payout, and total. PATCH `/api/medics/[id]/compensation` on save. |
| `web/app/api/medics/[id]/compensation/route.ts` | **New** — PATCH endpoint to update `experience_level`. DB trigger handles the % recalculation. Returns updated tier + percentages. |
| `web/app/admin/medics/[id]/onboarding/page.tsx` | **Modified** — Added "Compensation & Mileage" card between Stripe Setup and Payslip History. Renders `<CompensationSettings />`. |

### Mileage Reimbursement ✅

Every shift now includes a mileage reimbursement payment on top of the medic's shift payout. Distance is auto-calculated from the medic's home postcode to the job site using the existing `travel_time_cache` (Google Maps Distance Matrix API). Reimbursement uses the HMRC approved rate (45p/mile). This is an additional payment — it does not reduce the platform's revenue share.

**Key rules:**
- Rate: 45p/mile (HMRC Approved Mileage Allowance Payment — tax-free for the medic)
- Applies to: every shift (not just out-of-area)
- Source: `travel_time_cache.distance_miles` (already cached by Google Maps)
- Stored on timesheet: `mileage_miles`, `mileage_rate_pence` (snapshot), `mileage_reimbursement`
- Added to `payout_amount` — separate from the booking revenue split

### Mileage Auto-Trigger on Timesheet Approval ✅

When an admin approves timesheets in the batch approval UI, the mileage router is automatically called for every unique (medic, date) pair in the approved batch — **fire-and-forget** so mileage errors never block the approval flow.

Multi-site days are handled efficiently: the daily mileage router (`routeDailyMileage`) builds a full route chain for the medic across all their bookings on that day (home → site1 → site2 → … → home), so a single API call covers all shifts.

| File | Change |
|------|--------|
| `web/lib/queries/admin/timesheets.ts` | **Modified** — `useBatchApproveTimesheets` now accepts `{ timesheets: TimesheetWithDetails[], adminUserId }` instead of just `{ timesheetIds, adminUserId }`. In `onSuccess`, deduplicate by `(medic_id, shift_date)` and fire `POST /api/payouts/mileage` for each pair (fire-and-forget with console error on failure). |
| `web/components/admin/timesheet-batch-approval.tsx` | **Modified** — `handleBatchApprove` passes `timesheets: selectedTimesheets` to the mutation instead of mapping to IDs first. |
| `supabase/migrations/117_lead_capture_tables.sql` | **Renamed** — Was `116_lead_capture_tables.sql`. Renamed to 117 to resolve numbering collision with `116_experience_tiers_and_mileage.sql`. |

---

## Recent Updates — Offline Auth Cache Fallback Fix (2026-02-17)

### Auth Manager — Three-Stage Profile Fallback Chain ✅

Hardened `getUserProfile()` in `src/lib/auth-manager.ts` to use a three-stage fallback so `state.user` is never null for a previously-authenticated user, regardless of network state.

**Problem (v2 fix — deeper)**: Supabase JS v2's `getUser()` makes a real HTTP request (unlike `getSession()` which reads local storage). In multiple failure scenarios — the device offline, iOS Simulator with Network Link Conditioner, NetInfo reporting "connected" while Supabase is unreachable — the old code gated all cache reads on `!this.isOnline`, which is unreliable. Additionally, when the AsyncStorage cache was empty (fresh install / simulator wipe), there was no fallback at all.

**Fix**: Replaced the ad-hoc fallbacks with a clean three-stage chain via a new `getProfileFromCacheOrJwt()` private helper:
1. **DB fetch** (`fetchUserProfile`) — requires live network to Supabase
2. **AsyncStorage cache** — available if the user has ever been online on this device
3. **JWT `user_metadata`** — `getSession()` reads the locally-stored access token; `org_id` / `role` / `full_name` are embedded in the JWT payload at signup, so this always works even on a fresh install with no cache

`isOnline` is no longer used as a gate for the fallback path, since NetInfo cannot reliably distinguish "connected but Supabase unreachable" from "connected and Supabase reachable".

| File | Change |
|------|--------|
| `src/lib/auth-manager.ts` | `getUserProfile()` rewritten with 3-stage fallback; new `getProfileFromCacheOrJwt()` private helper |

---

## Recent Updates — Live Transcription Speed Improvements (2026-02-19)

### Faster Live Transcription on iOS & Android ✅

Tuned the live transcription pipeline to reduce perceived latency on both platforms. The medic now sees transcript text appear noticeably faster after speaking.

#### `supabase/functions/realtime-transcribe/index.ts` (iOS Streaming)

| Change | Before | After | Why |
|--------|--------|-------|-----|
| **VAD threshold** | `0.5` | `0.3` | Lower threshold = more sensitive to speech. Picks up quieter speech sooner and starts transcribing earlier. |
| **VAD silence_duration_ms** | `400ms` | `250ms` | Shorter required silence before a speech segment is considered "done". Transcript delta events fire ~150ms faster after each phrase/pause. |

These settings control the OpenAI Realtime API's Server Voice Activity Detection. The `prefix_padding_ms` (200ms) is unchanged — it captures audio just before detected speech starts so words aren't clipped.

#### `services/EmergencyAlertService.ts` (Android HTTP Chunked)

| Change | Before | After | Why |
|--------|--------|-------|-----|
| **TRANSCRIPTION_CHUNK_INTERVAL_MS** | `5000ms` (5s) | `3000ms` (3s) | First transcript now arrives at ~5s (3s recording + ~2s Whisper API) instead of ~7s. Whisper handles 3-second audio chunks well. |

**Net effect**: iOS transcription feels near-instant (word-by-word with shorter pauses). Android first feedback drops from ~7s to ~5s.

---

## Recent Updates — SOS Button Auth Guard (2026-02-19)

### SOS Button Hidden When Signed Out ✅

The floating SOS button was visible on the login/sign-up screen because it was rendered outside the `AuthProvider` in `app/_layout.tsx`. Medics who aren't signed in shouldn't see the emergency button.

| File | Change |
|------|--------|
| `components/ui/SOSButton.tsx` | **Modified** — Added `useAuth()` hook. Returns `null` when `state.isAuthenticated` is `false`, hiding the button on auth screens (login, sign-up). |
| `app/_layout.tsx` | **Modified** — Moved `<SOSButton />` from outside all providers to inside `<AuthProvider>` (but outside `<OrgProvider>`) so it has access to auth state via `useAuth()`. No visual change when authenticated — context providers don't create native views. |

---

## Recent Updates — Emergency SOS Bugfixes (2026-02-17)

### Storage Bucket + Transcription Error Feedback — Bug Fixes ✅

Two bugs identified and fixed in the Emergency SOS system:

**Bug 1 — Upload error (`StorageApiError`):**
The `emergency-recordings` Supabase Storage bucket was never created. The original migration `060_emergency_alerts.sql` created the DB tables but omitted the bucket. Every upload call returned `StorageApiError` immediately.

| File | Change |
|------|--------|
| `supabase/migrations/131_emergency_recordings_bucket.sql` | **New** — Creates the `emergency-recordings` private Storage bucket (50 MB limit, audio MIME types only). Adds three RLS policies: medics can upload to their own `<user_id>/` folder; authenticated users can read; medics can delete their own files. |

**Bug 2 — Live transcript silently shows "No transcript yet":**
When the Whisper transcription edge function was unavailable (not running locally, or `OPENAI_API_KEY` not set as a Supabase secret), the transcript area showed "No transcript yet" with no indication of a problem. Now the UI surfaces the failure so the user knows the audio is still recording even if transcription is down.

| File | Change |
|------|--------|
| `services/EmergencyAlertService.ts` | Added optional `onTranscriptError?: () => void` parameter to `startRecording()`. Stored as `private onTranscriptError`. Called in `transcribeChunk()` when the edge function returns an HTTP error or throws a network exception. Cleared on `stopRecording()` alongside the existing callbacks. |
| `components/ui/SOSModal.tsx` | Added `transcriptUnavailable` state. Passes error callback to `startRecording()`. When `transcriptUnavailable` is true and no transcript has arrived, shows an amber italic message: *"Live transcription unavailable — audio is still being recorded."* Also fixed the "Try Again" button in the error step, which incorrectly called `setStep('choose')` (the Choose step was removed); it now calls `startRecording()` directly. |

**Root cause note for infrastructure:**
Transcription requires `supabase functions serve` to be running during local development (reads `OPENAI_API_KEY` from `supabase/functions/.env`). For a cloud/production Supabase project, run:
```
supabase secrets set OPENAI_API_KEY=<your-key>
supabase functions deploy send-emergency-sms
```

---

## Recent Updates — SOS Transcription Fixes (2026-02-18)

### SOS Flow & AI Transcription — Bug Fixes ✅

Full audit and repair of the Emergency SOS recording and Whisper transcription pipeline. The feature now works end-to-end: recording auto-starts on confirm, live transcript updates every 8 seconds, silent chunks are discarded, and Whisper hallucinations ("Thanks for watching!", "Silence.") are filtered out.

#### `components/ui/SOSModal.tsx`

| Fix | Detail |
|-----|--------|
| **Auto-record on open** | `useEffect` now calls `startRecording()` immediately when the modal opens. The "Choose Alert Type" step has been removed entirely — the medic goes straight to recording the moment SOS is confirmed. |
| **Contact banner added** | The recording screen now shows who will receive the alert (name + phone from Settings) at the top, so the medic has confidence before speaking. |
| **"Type a message instead" fallback** | A subtle link at the bottom of the recording screen lets the medic switch to the text input if they can't speak. |
| **Stale `audioUri` state bug** | `messageType` was determined by the `audioUri` React state variable which could still be `null` due to batching immediately after `stopRecording()`. Fixed to use `audioUriRef.current` (always synchronous). |
| **Reset state** | `resetState()` now resets `step` to `'record'` (not the removed `'choose'`) to avoid a flash of wrong UI on re-open. |
| **Dead code removed** | Removed the unreachable `if (step !== 'sending')` block from `handleSend()`. |

#### `services/EmergencyAlertService.ts`

| Fix | Detail |
|-----|--------|
| **Race condition in `transcribeChunk`** | `this.onTranscriptChunk` was checked at the top of the function but called after two `await`s — `stopRecording()` could null it out in between, causing a crash. Fixed by capturing it in a local `const onChunk` before any awaits. |
| **`FileSystem.EncodingType.Base64` crash** | `expo-file-system`'s `EncodingType` enum is `undefined` when the package is loaded via lazy `require()`. Replaced both usages with the string literal `'base64'`. |
| **Wrong `expo-file-system` import path** | `expo-file-system` v54 deprecated `readAsStringAsync` on the main export. Updated lazy require to `expo-file-system/legacy` which still exposes the full legacy API. |
| **Final chunk never transcribed** | `stopRecording()` returned the final audio URI but never sent it to Whisper. Short recordings (under one rotation interval) produced no transcript at all. Fixed: `transcribeChunk(uri)` is now called on the final segment before clearing the callback. |
| **Rotation interval** | Increased from 5s → 8s. 5s caused a noticeable stop/restart gap every few seconds; 8s is a better balance between live feedback frequency and recording continuity. |
| **React Strict Mode double-start** | `useEffect` fires twice in development (React Strict Mode), triggering `startRecording()` twice. The second call now silently returns instead of logging a console warning. |

#### `supabase/functions/send-emergency-sms/index.ts`

| Fix | Detail |
|-----|--------|
| **Whisper hallucinations ("Thanks for watching!")** | Whisper hallucinates common YouTube phrases when given near-silence. Fixed by (1) adding a `prompt` field biasing Whisper toward medical/emergency vocabulary, and (2) using `response_format: 'verbose_json'` to get per-segment `no_speech_prob` — chunks where the average `no_speech_prob > 0.6` are silently discarded. |
| **"Silence." token in transcript** | Whisper outputs the word "Silence." literally for quiet sections that pass the speech threshold. Post-processing now strips known silence tokens (`Silence.`, `[BLANK_AUDIO]`, `(silence)`, `...`) from the returned transcript. |

#### Environment / Config

| File | Change |
|------|--------|
| `supabase/functions/.env` | Updated `OPENAI_API_KEY` with active key. |
| `.env` | Added `OPENAI_API_KEY` entry with comment pointing to edge function usage. |

---

## Recent Updates — Emergency SOS Alert System (2026-02-17)

### Emergency SOS Alert System ✅

One-tap emergency alert system for construction site medics. A floating red SOS button appears on every screen. When triggered, the medic can send a 90-second voice recording (AI-transcribed live) or a typed message to pre-registered site contacts. Recipients receive a loud full-screen push notification. If unacknowledged after 60 seconds, an SMS is automatically sent via Twilio as a fallback.

| File | Change |
|------|--------|
| `supabase/migrations/060_emergency_alerts.sql` | **New** — Creates `emergency_contacts` table (reusable across bookings), `emergency_alerts` table (alert log with push/SMS timestamps, acknowledgment tracking), adds `push_token` and `push_token_updated_at` columns to `profiles`. Includes RLS policies for org-scoped access. |
| `services/EmergencyAlertService.ts` | **New** — Singleton service (matches pattern of `LocationTrackingService`). Handles: permission requests, Expo push token registration (saved to `profiles.push_token`), audio recording via `expo-av` (90s max, m4a), live chunked transcription every 5s to Whisper, audio upload to Supabase Storage (`emergency-recordings` bucket), alert row insertion + Expo Push API call, alert acknowledgment. |
| `components/ui/SOSButton.tsx` | **New** — Floating 72×72px red circle button with pulsing `Animated.loop` animation. Positioned `bottom: 100, right: 20` (above tab bar). Shows confirmation bottom sheet on press, opens `SOSModal` on confirm. |
| `components/ui/SOSModal.tsx` | **Updated** — Full-screen modal for composing emergency alert. Recording now **starts automatically** when the modal opens — the "Choose Alert Type" screen is bypassed entirely. The medic goes straight to the live recording + transcription view (90s countdown, waveform animation, live Whisper transcript). Cancel (✕) button is available during recording to abort. Step 2b (text): large pre-filled text input still accessible via the choose step if needed. Step 3: sending spinner → success/error states. |
| `components/ui/EmergencyAlertReceiver.tsx` | **New** — Recipient-side component. Registers foreground + background notification listeners. On `type: 'emergency'` notification: plays `emergency-alert.wav` in a loop, shows full-screen red modal (covers all UI). Only dismissable via "ACKNOWLEDGED" button which calls `acknowledgeAlert()`. Handles both foreground and notification-tap flows. |
| `supabase/functions/send-emergency-sms/index.ts` | **New** — Supabase Edge Function. Two modes: (1) `action: 'transcribe'` — receives base64 audio, calls OpenAI Whisper API, returns transcript; (2) `action: 'sms_fallback'` (pg_cron) — queries unacknowledged alerts where push was sent >60s ago, sends Twilio SMS to each contact, updates `sms_sent_at`. |
| `assets/sounds/emergency-alert.wav` | **New** — 3-second loopable pulsing 880Hz alert tone (generated, bundled in app). Used by both push notification and `expo-av` in-app playback. |
| `app/(tabs)/settings.tsx` | **Updated** — Added "Emergency Contacts" section. Lists all contacts for the org with name, phone, and role. "+ Add" button opens a slide-up modal to enter name (required), phone (required), and role/title (optional). Each contact has a "Remove" button with confirmation. Empty state prompts the user to add a contact before using SOS. **Bug fix (2026-02-17):** Save now performs a proper upsert — if a contact with the same phone number already exists in the org, it is updated (name, role) rather than silently skipped. Uses `source: 'manual'` to distinguish manually-added contacts from booking-seeded ones. Real Supabase errors are now surfaced in the error Alert. **Feature (2026-02-17): Emergency Contact Autocomplete/Recall** — Typing 2+ characters in the Full Name field now shows a live dropdown of matching org-level contacts (up to 5, 300ms debounce, case-insensitive). Tapping a suggestion fills Name, Phone, and Role automatically. `org_id` is fetched once when the modal opens and reused for both autocomplete queries and the save operation (removes a duplicate profile fetch). Gracefully no-ops on network error to support offline use. **Feature (2026-02-17): UK Phone Auto-Format** — Phone Number field auto-formats input as `+44 XXXX XXXXXX` as the user types. Strips non-digits, removes a leading `0` (trunk prefix) or `44` (country code without `+`) automatically, and limits to 10 national digits. Matches the standard UK international mobile format (e.g. `+44 7700 900000`). |
| `app/(tabs)/_layout.tsx` | **Modified** — Wrapped tabs in `<View>`, added `<SOSButton />` floating absolutely over all tab screens. |
| `app/_layout.tsx` | **Modified** — Added `<EmergencyAlertReceiver />` inside `BottomSheetModalProvider`. Added permission + push token registration on DB init (non-fatal if denied). |
| `app.json` | **Modified** — Added `expo-notifications` plugin with sound config and `#EF4444` color. Added `RECEIVE_BOOT_COMPLETED` and `SCHEDULE_EXACT_ALARM` Android permissions. |
| `src/types/supabase.ts` | **Modified** — Added `Row/Insert/Update` types for `emergency_contacts` and `emergency_alerts` tables. Added `push_token` and `push_token_updated_at` fields to `profiles`. |

#### Environment Variables Required (Supabase secrets):
```
TWILIO_ACCOUNT_SID     — Twilio account SID for SMS fallback
TWILIO_AUTH_TOKEN      — Twilio auth token
TWILIO_PHONE_NUMBER    — Twilio sender phone number (E.164 format)
OPENAI_API_KEY         — OpenAI key for Whisper voice transcription
```

#### Database Tables Added:
- **`emergency_contacts`** — Reusable contacts seeded from booking `site_contact_name`/`site_contact_phone`. RLS: org-scoped read/write.
- **`emergency_alerts`** — Log of every SOS trigger. Tracks `push_sent_at`, `sms_sent_at`, `acknowledged_at`, `text_message` (transcript), `audio_url`.

#### SMS Fallback pg_cron Setup:
After deploying the Edge Function, run this in the Supabase SQL editor to schedule the 60-second SMS fallback check:
```sql
SELECT cron.schedule('emergency-sms-fallback', '* * * * *',
  $$SELECT net.http_post(url := current_setting('app.supabase_url') || '/functions/v1/send-emergency-sms',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{"action":"sms_fallback"}'::jsonb)$$);
```

---

## Recent Updates — Contact Form + Critical Gap Fixes (2026-02-16)

### Contact Form — Real Submission ✅

**Problem fixed**: The `/contact` page form faked a submit with `setTimeout` and never sent the enquiry anywhere.

| File | Change |
|------|--------|
| `web/app/api/contact/submit/route.ts` | **New** POST endpoint. Accepts enquiry form payload, emails admin via Resend with full details (name, company, email, phone, site size, enquiry type, message). Returns `{ success: true }`. |
| `web/app/(marketing)/contact/contact-form.tsx` | Replaced fake `setTimeout` with real `fetch('/api/contact/submit')`. Shows inline error message on failure; confirmation screen on success (unchanged UX). |

---

## Recent Updates — Critical Gap Fixes (2026-02-16)

### Fix 1: Quote Builder → Real Submission + Booking Link ✅

**Problem fixed**: The "Request Quote" button on the marketing pricing page showed an `alert()` placeholder — captured leads were lost forever.

| File | Change |
|------|--------|
| `web/app/api/quotes/submit/route.ts` | **New** POST endpoint. Accepts full QuoteBuilder form payload, emails admin via Resend, returns `{ success: true, quoteRef: 'QT-XXXX' }`. No DB table required. |
| `web/components/QuoteBuilder.tsx` | Replaced `alert()` with real `fetch('/api/quotes/submit')` call. Added loading spinner while submitting. On success: shows Step 4 "Quote Received" confirmation screen with quote reference and **"Book Now" CTA**. On error: inline error message (modal stays open). |
| `web/app/(booking)/book/page.tsx` | Converted to client component. On mount, reads `quoteData` from `sessionStorage` (set by QuoteBuilder "Book Now" CTA) and passes it as `prefillData` to `<BookingForm>`. |
| `web/components/booking/booking-form.tsx` | Added optional `prefillData?: QuoteData` prop. `useEffect` pre-populates `siteAddress`, `specialNotes`, `confinedSpaceRequired`, `traumaSpecialistRequired` from quote data. Clears `sessionStorage` after consuming. |

**Flow**: Pricing page → Quote Builder (3 steps) → submit → Step 4 confirmation screen (quote ref + 24hr message) → "Book Now" → `/book` with form pre-populated from quote details.

---

### Fix 2: Immediate "Booking Received" Email ✅

**Problem fixed**: Email only fired after medic was matched (`/api/bookings/match`). If matching failed or was delayed, the client received zero communication after booking.

| File | Change |
|------|--------|
| `web/lib/email/templates/booking-received-email.tsx` | **New** React Email template. Shows booking date/time/location, "we're confirming your medic" message, dashboard link. No medic details needed. |
| `web/lib/email/send-booking-received.ts` | **New** helper function `sendBookingReceivedEmail(bookingId)`. Fetches booking + client, renders template, sends via Resend. Safe to call fire-and-forget. |
| `web/app/api/bookings/create/route.ts` | After Net30 booking is created: calls `sendBookingReceivedEmail(booking.id)` (fire-and-forget). |
| `web/app/api/bookings/create-payment-intent/route.ts` | After prepay booking is created: calls `sendBookingReceivedEmail(booking.id)` (fire-and-forget). |
| `web/app/api/email/booking-confirmation/route.ts` | Extended to accept `type?: 'received' \| 'confirmed'` param. `type: 'received'` delegates to `sendBookingReceivedEmail` (no medic_id check). `type: 'confirmed'` = existing behaviour (default). |

**Result**: Client receives an acknowledgement email immediately on booking creation, independent of medic matching. Medic assignment email sent separately when matched.

---

### Fix 3: Worker Health Record Page (GDPR Minimum) ✅

**Problem fixed**: No way for admins to view worker health records or fulfil GDPR requests — workers are DB-only records, not auth users.

| File | Change |
|------|--------|
| `web/app/(dashboard)/workers/[id]/page.tsx` | **New** server component. Fetches worker profile, treatments, and consent records in parallel. Sections: Worker Profile (name, company, role, phone, emergency contact, health notes), Consent Status (consent_records table or legacy `consent_given` field), Treatment History (table with severity/outcome badges + "View" link to `/treatments/[id]`), GDPR Request form. |
| `web/components/dashboard/worker-gdpr-form.tsx` | **New** client component. Select `request_type` (export/deletion), optional reason textarea, submits to `erasure_requests` table. Shows confirmation on success. Links to `/admin/gdpr` for processing. |
| `web/lib/queries/workers.ts` | Added `fetchWorkerById(supabase, id)`, `fetchWorkerTreatments(supabase, workerId)`, `fetchWorkerConsentRecords(supabase, workerId)` server-side queries. |
| `web/components/dashboard/workers-columns.tsx` | Added `actions` column at end with "View Records" button → links to `/workers/{id}`. |

**GDPR compliance note**: Workers are stored as DB records (not auth users). The GDPR form inserts into `erasure_requests` with the `worker_id` stored in `notes`. Admin processes via the existing `/admin/gdpr` dashboard. Satisfies UK GDPR Art. 15–17 audit obligations.

---

## Recent Updates - Medic Portal + Full Marketing Site (2026-02-16)

### Medic Portal — `web/app/medic/` ✅

A complete green-themed portal for HCPC-registered medics. Authenticated via Supabase; role-guarded (`medic`). Middleware redirects medic role to `/medic` on login.

| Page | Route | Description |
|------|-------|-------------|
| **Medic Dashboard** | `/medic` | 4 stat cards (upcoming shifts, pending timesheets, pending payout, star rating); upcoming shifts list; pending timesheets with submit links; Stripe warning banner if onboarding incomplete |
| **My Shifts** | `/medic/shifts` | All assigned bookings from `bookings` table; upcoming/past/all filter tabs; shift badges (confined space, trauma specialist); ASG contact email |
| **Timesheets** | `/medic/timesheets` | Submit actual hours worked for completed shifts; discrepancy reason textarea shown if hours differ from scheduled; updates `medic_submitted_at`, `logged_hours`, `medic_confirmed`; pending/history sections |
| **Payslips** | `/medic/payslips` | Download payslips from `generate-payslip-pdf` edge function; total earned/hours summary cards; handles both `pdf_url` and `pdf_base64` responses |
| **My Profile** | `/medic/profile` | Availability toggle (`available_for_work`); personal info grid; qualifications badges; IR35/UTR/umbrella status; `StripeOnboardingStatus` component |

**Layout** (`web/app/medic/layout.tsx`): Green-themed sidebar, auth check + redirect to `/login`, sign out button, nav icons (LayoutDashboard, Calendar, Clock, FileText, User).

---

### Marketing Site — Complete ASG Company Website (2026-02-16) ✅

The `/` marketing site is the **Apex Safety Group** company website. SiteMedic is mentioned as their technology platform. `/platform` remains the SiteMedic superadmin dashboard on a separate domain.

#### Site Header Updates — `components/marketing/site-header.tsx` ✅
- Added `/services`, `/about`, `/contact` to desktop and mobile nav links

#### Site Footer Updates — `components/marketing/site-footer.tsx` ✅
- Added "About ASG" and "Contact Us" links to the Company column

#### Services Page — `web/app/(marketing)/services/page.tsx` ✅
Full breakdown of all 4 ASG occupational health service layers:
- Layer 1: Health Surveillance (audiometry, spirometry, HAVS, skin checks, baselines) — from £45/worker
- Layer 2: Drug & Alcohol Testing (12-panel oral fluid, evidential breath, all test types) — from £35/test
- Layer 3: Fitness-to-Work Assessments (plant operators, confined space, height, asbestos) — from £65/worker
- Layer 4: Mental Health & Wellbeing (MHFA check-ins, PHQ-9/GAD-7, site pulse score) — included
- Each card shows relevant legislation, colour-coded by layer, "Delivered via SiteMedic platform" callouts
- Hero with dual CTAs (Book a Site Medic / View Pricing); bottom dark CTA section

#### About Page — `web/app/(marketing)/about/page.tsx` ✅
Full ASG company story page:
- Hero: founding story (paramedics who worked construction sites and built the software they needed)
- Mission section: 2-col with 4 stat cards (100% HCPC, 0 missed RIDDOR, 4-in-1 services, Net 30)
- "Why we built SiteMedic" section: 3 cards (RIDDOR auto-detection, weekly payouts, compliance dashboard)
- "The ASG + SiteMedic model" callout box (blue gradient): 4 bullet points explaining the bundled service
- Values: 4 cards (Clinical First, Honest About the Law, Real-Time by Default, Fair to Medics)
- CTA section: Book a Medic + Get in Touch links

#### Contact Page — `web/app/(marketing)/contact/page.tsx` + `contact-form.tsx` ✅
Full contact/enquiry page:
- Server component `page.tsx` with SEO metadata; client form extracted to `contact-form.tsx`
- Hero section (dark gradient matching /services and /about)
- 2-column layout: left = enquiry form (3/4 width), right = sidebar (1/4 width)
- **Form fields**: first name, last name, company, email, phone, site workforce size (dropdown), enquiry type (dropdown: 7 options), message textarea
- **Success state**: checkmark icon, personalised confirmation, "Send Another Enquiry" reset button
- **Sidebar**: direct contact card (email, address, hours), response time info box, "Book a Medic" dark CTA card, "What happens next" 4-step list
- Bottom section: links to /about, /services, /pricing
- Privacy Policy consent notice on submit button

---

## Recent Updates - Marketing UI/UX Overhaul (2026-02-16)

### Site Header — `components/marketing/site-header.tsx` ✅
- Full brand name "Apex Safety Group" + "Powered by SiteMedic" sub-label shown in nav
- Blue square icon block as brand mark; `group-hover` turns to blue-700
- Scroll shadow — header gets `shadow-md` after 8px scroll via `useEffect` listener
- **Services** nav link added pointing to `/#services` anchor on homepage
- Sign in link added beside Book Now for logged-out users
- Mobile sheet fully redesigned: brand block header, nav links with hover fill, stacked auth CTAs at bottom

### Homepage Polish — `app/(marketing)/page.tsx` ✅
- Hero: blue-to-white gradient + faint dot-grid pattern (replaces flat white)
- Hero CTAs: `rounded-xl`, `active:scale-95`, blue-shadow hover
- **Stats bar**: blue strip after hero with 3 proof numbers (9× revenue, 0 missed RIDDOR, 1 invoice)
- Service layers section: `id="services"` anchor added for nav link
- Service card prices: coloured pill-badges instead of plain text
- How It Works: horizontal connector line on desktop between numbered steps
- Why ASG: proper Lucide icons with coloured icon backgrounds per card
- Compliance grid: 2/3/5-col responsive breakpoints, blue-tinted hover
- CTA section: dot-grid pattern background, `rounded-xl` buttons

### Pricing Table — `components/marketing/pricing-table.tsx` ✅
- "Base Package" badge on main card header
- Feature list expanded from 4 → 7 items
- Volume discount cards: `rounded-xl`, better typography
- **Clinical add-on packages section**: new 2×2 grid below base price showing all 4 service layers with per-worker pricing, coloured headers, and market rate comparison callouts

### Pricing Page FAQ — `app/(marketing)/pricing/page.tsx` ✅
- 2-column grid layout (was single column)
- 6 questions (was 4) — added clinical add-on specific Q&As
- Card hover: white background for contrast

### Site Footer — `components/marketing/site-footer.tsx` ✅
- Expanded from 3 → 4 columns: Brand | Services | Company | Legal & Compliance
- Services column links to `/#services` anchor per clinical layer
- Compliance badge row: 7 dark-chip badges (HCPC, RIDDOR, CDM, UK GDPR, HSE, COSHH, HASAWA)
- Dynamic copyright year via `new Date().getFullYear()`
- "Platform by SiteMedic" attribution in bottom bar

### Quote Button — `components/marketing/quote-button.tsx` ✅
- Updated to `rounded-xl` + `active:scale-95` + `shadow-sm` matching new design language

---

## Recent Updates - Homepage Redesign & Codebase Gap Analysis (2026-02-16)

### Homepage Redesign — Apex Safety Group (ASG) ✅
**`web/app/(marketing)/page.tsx` fully rewritten to represent ASG's full occupational health offering.**

The previous homepage was a generic "book a paramedic for compliance" page. The new homepage presents Apex Safety Group as a full construction occupational health consolidator, powered by SiteMedic.

**New homepage sections:**
1. **Hero** — "One medic. Every compliance need. One invoice." + powered-by SiteMedic badge + 6 UK compliance trust badges (HCPC, RIDDOR, CDM, HASAWA 1974, COSHH, UK GDPR)
2. **Problem Section** (dark) — 4 cards showing the fragmented status quo (mobile OH vans, off-site clinics, D&A call-outs, scattered records)
3. **SiteMedic Platform Section** — 2-col layout explaining what the platform does and why it matters for compliance, with a feature list panel
4. **4 Service Layers** — Full cards for each clinical layer with pricing, saving context, and colour-coded by layer:
   - Layer 1: Health Surveillance (legally mandatory) — audiometry, spirometry, HAVS, skin checks
   - Layer 2: Drug & Alcohol Testing (contractually required) — random, pre-induction, for-cause
   - Layer 3: Fitness-to-Work Assessments (role-specific) — plant operators, height/confined space
   - Layer 4: Mental Health & Wellbeing (growing requirement) — check-ins, pulse score, ISO 45003
5. **The Numbers** — Before/after comparison for 80-worker 12-month London site (£20,100 → £16,013 with consolidated services)
6. **Why ASG is the Best** — 6 cards covering HCPC grade, on-site delivery, SiteMedic digital-first, automated compliance, UK law focus, single invoice
7. **4-Step How It Works** — Book → Medic on site → Auto-logged → Always compliant
8. **10-Badge Compliance Grid** — HCPC, RIDDOR, CDM, UK GDPR, HSE, COSHH, Control of Noise, HASAWA, ISO 45003, SEQOHS
9. **Final CTA** — Blue section with England & Wales geographic scope, dual CTAs (Book / View Pricing)

**UK-only scope explicitly stated** throughout copy.

---

### Low-Priority Gap Fixes — Applied 2026-02-16

| Fix | File(s) Changed |
|-----|-----------------|
| **Medic onboarding page under wrong route group** — `(dashboard)/admin/medics/onboarding/[id]` used the white dashboard sidebar instead of the admin dark sidebar | Created `web/app/admin/medics/[id]/onboarding/page.tsx` with admin dark theme; updated `MedicRosterTable` actions column to link "Onboarding" and "Payslips" per medic |
| **No organisation onboarding flow** — middleware had commented-out `/setup/organization` redirect for users with no `org_id` | Created `web/app/setup/organization/page.tsx` (org name, email, phone, address, postcode form → inserts `organizations` + `org_memberships`); uncommented the redirect in `web/lib/supabase/middleware.ts` |
| **Contract numbers not human-readable** — used `SA-${uuid.slice(0,8)}` which is opaque | Created `web/lib/contracts/utils.ts` with `formatContractNumber(id, createdAt)` → `SA-2026-A3F9C1` format; updated `contracts/[id]/page.tsx`, `contract-detail.tsx`, `contracts-table.tsx`, `send-contract-dialog.tsx` |

---

### Medium-Priority Gap Fixes — Applied 2026-02-16

#### Platform Admin Improvements

| Fix | File(s) Changed |
|-----|-----------------|
| **Platform layout showed hardcoded "Platform Admin" / "Super User" / "PA"** | `web/app/platform/layout.tsx` — added `useState`/`useEffect` + `createClient().auth.getUser()` to display real user name and email; initials derived from name |
| **`/platform/users` returned 404** | Created `web/app/platform/users/page.tsx` — lists all users from `org_memberships` + `profiles`, filterable by role and searchable by name/email/org; role colour badges |
| **`/platform/settings` returned 404** | Created `web/app/platform/settings/page.tsx` — Feature flags toggles, notification preferences, email config, session security settings |

#### Legal Pages Fix

| Fix | File(s) Changed |
|-----|-----------------|
| **Placeholder phone numbers `+44XXXXXXXXXX` in legal pages** (7 occurrences across 4 pages) | `complaints/page.tsx`, `accessibility-statement/page.tsx`, `refund-policy/page.tsx`, `acceptable-use/page.tsx` — replaced `tel:+44XXXXXXXXXX` with `mailto:support@sitemedic.co.uk`; updated "📞 Phone" labels to "📧 Email" / "Support Email" |

#### CSV Export Fix

| Fix | File(s) Changed |
|-----|-----------------|
| **Certification status hardcoded as `'Active'` in worker export** | `web/lib/utils/export-csv.ts:78` — changed to use `w.certification_status ?? ''`; updated JSDoc comment |

#### Dashboard Sidebar Active State

| Fix | File(s) Changed |
|-----|-----------------|
| **Dashboard sidebar had no active page indicator** — Server Component couldn't use `usePathname()` | Created `web/components/dashboard/DashboardNav.tsx` (`'use client'` component with `usePathname()`); updated `web/app/(dashboard)/layout.tsx` to use it; `SidebarMenuButton isActive` prop now reflects current route |

#### New Backend-without-UI Admin Pages

| Page | Route | File |
|------|-------|------|
| **Shift Swaps** — Approve/reject medic shift swap requests from the `shift_swaps` table | `/admin/shift-swaps` | `web/app/admin/shift-swaps/page.tsx` |
| **Geofences** — Create/edit/delete geofence boundaries for site check-in validation | `/admin/geofences` | `web/app/admin/geofences/page.tsx` |
| **Shift Templates** — Create reusable shift patterns to speed up booking creation | `/admin/shift-templates` | `web/app/admin/shift-templates/page.tsx` |
| **Booking Conflicts** — View and resolve conflicts detected by `conflict-detector` edge function | `/admin/booking-conflicts` | `web/app/admin/booking-conflicts/page.tsx` |
| **GDPR Data Requests** — Manage GDPR Art. 15-17 data export and deletion requests | `/admin/gdpr` | `web/app/admin/gdpr/page.tsx` |
| **Medic Payslips** — Generate payslips per medic from approved timesheets | `/admin/medics/[id]/payslips` | `web/app/admin/medics/[id]/payslips/page.tsx` |

All 5 new admin section pages have been added to the admin sidebar navigation in `web/app/admin/layout.tsx`.

---

### High-Priority Gap Fixes — Applied 2026-02-16

| Fix | File(s) Changed |
|-----|-----------------|
| **Call/SMS buttons in Command Center were stubs** | `web/app/admin/command-center/page.tsx` — fetches medic phone from `medics` table on click, uses `tel:` / `sms:` URIs; buttons disabled with tooltip when no phone on record |
| **Medic Timeline PDF export showed `alert()`** | `web/components/admin/MedicTimeline.tsx` — replaced with jsPDF implementation: medic name, booking ID, event table with anomaly highlighting, auto-saves `timeline-{name}-{id}.pdf` |
| **Invoice email never sent after generation** | `web/app/api/invoices/generate/route.ts` — added Resend email after PDF generation with invoice details table, PDF download link; non-fatal on failure |
| **Medic star ratings hardcoded at 4.8** | `web/app/api/bookings/match/route.ts` — queries `medics.star_rating` from DB after getting `assignedMedicId`; defaults to `0` if not set |
| **No toast notification library** | Installed `sonner`; added `<Toaster richColors position="top-right" />` to root layout |
| **"Copy signing link" gave no feedback** | `web/components/contracts/contracts-table.tsx` — `toast.success('Signing link copied to clipboard')` |
| **Timesheet approve/reject gave no feedback** | `web/lib/queries/admin/timesheets.ts` — `toast.success` on batch approve/reject, `toast.error` on rollback |
| **Schedule Grid drag-drop gave no feedback** | `web/components/admin/schedule/ScheduleGrid.tsx` — `showSuccessToast` / `showErrorToast` now use `sonner` |
| **Timesheet approval used hardcoded admin ID** | `web/components/admin/timesheet-batch-approval.tsx` — replaced `'admin-user-id'` with live `auth.getUser()` call via `useEffect` |
| **Schedule Board badge count commented out** | `web/app/admin/layout.tsx` — Schedule Board badge now shows same `pendingBookings` count as Bookings badge |

---

### Critical Gap Fixes — Applied 2026-02-16

The following critical bugs were fixed in this session:

| Fix | File(s) Changed |
|-----|-----------------|
| **"Overview" nav link went to marketing homepage** (was `href: "/"`) | `web/app/(dashboard)/layout.tsx` — changed to `/dashboard` |
| **RIDDOR pages invisible to site managers** — 3 RIDDOR routes existed but were never in the sidebar | `web/app/(dashboard)/layout.tsx` — added RIDDOR nav item with `ShieldAlert` icon |
| **Admin Settings page 404** — sidebar linked to `/admin/settings` which didn't exist | Created `web/app/admin/settings/page.tsx` (org profile, notifications, contact, billing, security) |
| **Admin "New Booking" quick action 404** | Created `web/app/admin/bookings/new/page.tsx` (full form → `/api/bookings/create`) |
| **Admin "Add Medic" quick action 404** | Created `web/app/admin/medics/new/page.tsx` (full form → Supabase `medics` insert) |
| **Admin "Send Notification" quick action 404** | Created `web/app/admin/notifications/page.tsx` (reads `medic_alerts`, mark-resolved) |
| **"Send to Client" contract button was console.log only** | `web/components/contracts/contracts-table.tsx` — wired to existing `SendContractDialog` component |
| **"Terminate Contract" button was console.log only** | `web/components/contracts/contracts-table.tsx` — added `AlertDialog` confirmation + Supabase status update |
| **Admin sidebar badges hardcoded as mock data** (2 and 3) | `web/app/admin/layout.tsx` — fetches real counts from `medic_alerts` and `bookings` tables |
| **Admin sidebar showed hardcoded "Admin User" / "admin@sitemedic.co.uk"** | `web/app/admin/layout.tsx` — pulls name and email from Supabase `auth.getUser()` |

---

### Codebase Gap Analysis — Identified 2026-02-16

The following gaps were identified between the current codebase and the full ASG business model. These are **not yet built** and represent the next development priorities.

#### Critical Code Gaps (missing features with zero backend support)

| # | Gap | Impact |
|---|-----|--------|
| 1 | **`/medic` route missing** | Auth redirects `medic` role to `/medic` — that page doesn't exist. Medics get a 404 after login. **Login is broken for the medic role.** |
| 2 | **No health surveillance data model** | `database.types.ts` has no types for audiometry results, spirometry readings, HAVS scores, or skin check outcomes. Layer 1 has zero backend support. |
| 3 | **No drug & alcohol test schema** | No `drug_tests` table, no D&A test result types, no random selection logic, no chain-of-custody records, no D&A policy document storage. |
| 4 | **No fitness-to-work types** | No certificate types, no OH physician partner model, no remote sign-off workflow, no Group 2 medical standards model. |
| 5 | **No mental health/wellbeing module** | No wellbeing check-in types, no `wellbeing_pulse` score per site, no anonymised trend aggregation. |
| 6 | **Per-worker billing doesn't exist** | `lib/booking/pricing.ts` is purely per-day medic billing. No per-worker surveillance billing logic for £35–65/worker/test. |
| 7 | **No service package management** | No `compliance_packages` table, no bundle pricing, no record of which packages a client has purchased. |
| 8 | **No OH physician partner model** | No `partners` or `physicians` table, no remote sign-off workflow for Layer 3 fitness-to-work certificates. |

#### UX/UI Gaps (pages/flows that should exist but don't)

| # | Gap | Notes |
|---|-----|-------|
| 1 | **No `/services` page** | No dedicated page explaining the 4 service layers, per-worker pricing, or what each test involves |
| 2 | **No About/Meet the Team page** | Medic credentials and clinical credibility invisible on public site — critical for B2B procurement trust |
| 3 | **Nav only has Home + Pricing** | Missing: Services, About, Contact |
| 4 | **No Contact/Enquiry page** | No way to ask a question or request a callback without committing to Book Now or Get Quote |
| 5 | **No worker self-service portal** | Workers can't view their own health surveillance history, test results, or certificates (GDPR transparency obligation) |
| 6 | **No client onboarding wizard** | No step-by-step setup guide for new site managers after contract signing |
| 7 | **No testimonials or case studies** | Zero social proof on any marketing page |
| 8 | **No ROI calculator** | QuoteBuilder calculates medic days only — no tool showing OH consolidation savings |
| 9 | **Pricing page doesn't include clinical add-ons** | `£350/day` medic is the only option shown — per-worker surveillance/D&A/fitness pricing invisible |
| 10 | **No compliance dashboard for surveillance due dates** | Site managers can see RIDDOR and treatments but can't see who is overdue for annual audiometry or expiring fitness certs |
| 11 | **No `/medic` dashboard** | The medic role has no usable interface in the web app |

#### Customer/Business Logic Gaps

| # | Gap | Notes |
|---|-----|-------|
| 1 | **Revenue model incomplete** | Platform only captures medic-day revenue. Clinical layer revenue (per-worker surveillance, D&A packages, fitness assessments) has zero support. |
| 2 | **No recurring health surveillance reminders per worker** | `certifications` table tracks medic certs but no system to remind a site manager that Worker #47 is due annual audiometry |
| 3 | **No consolidation pitch in product UX** | The "replace 4 providers with 1 invoice" value prop is only on the homepage — invisible inside the product |
| 4 | **Quote builder doesn't model full ASG offering** | Asks worker count to size medic booking only — should also estimate surveillance package costs |
| 5 | **Admin revenue view excludes clinical add-on revenue** | `/admin/revenue` shows booking revenue only — clinical service revenue would be invisible to the ASG ops team |

---

## Recent Updates - Magic Link Authentication (2026-02-16)

### Authentication Overhaul ✅
**All password-based authentication removed. Magic link (passwordless) authentication implemented for all user roles.**

**How it works:**
1. User enters email on `/login` or `/signup`
2. Supabase sends a secure magic link to their email
3. User clicks the link — no password ever required
4. Auth callback exchanges the code for a session and redirects to the correct dashboard by role

**Role-based redirect after login:**
- `platform_admin` → `/platform`
- `org_admin` → `/admin`
- `site_manager` → `/dashboard`
- `medic` → `/medic`

**Files changed:**
- `web/app/(auth)/signup/page.tsx` — Removed password/confirm-password fields. Now uses `signInWithOtp` with `full_name` metadata
- `web/app/auth/callback/route.ts` — Role-based routing on login, new user profile name update
- `web/lib/supabase/middleware.ts` — `/auth` added to public routes (required for magic link callback), role-based redirect for authenticated users on `/login`/`/signup`

**⚠️ Supabase Dashboard Setup Required (one-time):**
In your Supabase project go to `Authentication → URL Configuration` and add `{your-domain}/auth/callback` to the list of allowed redirect URLs. Magic link template should be enabled by default.

---

## Recent Updates - Gap Resolution v1.0 (2026-02-16)

### Critical Security & Data Fixes ✅
**Tier 1: Security & Data Integrity (COMPLETED)**

1. **Fixed medic_alerts RLS Policy**
   - Added platform admin cross-org access policies
   - Restricted org-scoped access to org_admin only (not all org users)
   - Migration: `109_medic_alerts_rls_policy.sql`

2. **Verified Platform Admin Authorization**
   - Confirmed `is_platform_admin()` function works correctly
   - Platform admin user properly configured with JWT metadata
   - Cross-org access enabled via migration 102

3. **Created Platform Metrics Functions**
   - `get_platform_metrics()` - Real-time org counts, user counts, revenue, active bookings
   - `get_org_revenue_breakdown()` - Revenue by organization
   - `get_org_metrics(org_id)` - Per-organization statistics
   - `get_growth_trends(start, end)` - Analytics time series
   - `get_platform_organizations()` - Org list with metrics
   - Migration: `110_platform_metrics_functions.sql`

### Platform Dashboard Updates ✅
**Tier 2: User-Facing Data (COMPLETED)**

4. **Platform Dashboard** (`/platform/page.tsx`)
   - Replaced fake data (12 orgs, 458 users, £125k) with real metrics
   - Added loading states and error handling
   - Fetches data from `get_platform_metrics()` RPC function

5. **Platform Analytics** (`/platform/analytics/page.tsx`)
   - Updated growth metrics with real data
   - Added error states
   - Note: Change percentages need historical data comparison (currently 0%)

6. **Platform Revenue** (`/platform/revenue/page.tsx`)
   - Replaced mock org revenue data with `get_org_revenue_breakdown()`
   - Calculate platform fees dynamically (10% of revenue)
   - Real-time revenue tracking per organization

7. **Platform Organizations** (`/platform/organizations/page.tsx`)
   - Fetch orgs with metrics via `get_platform_organizations()`
   - Display real user counts, booking counts, revenue per org
   - Added error handling

### Business Operations Improvements ✅
**Tier 2: Cash Flow & Email Notifications (COMPLETED)**

8. **Cash Flow Monitor - Stripe Balance Integration**
   - Replaced mock £12k balance with real Stripe Balance API
   - Added error handling with fallback to mock (logged as warning)
   - File: `supabase/functions/cash-flow-monitor/index.ts`

9. **Email Notification Templates**
   - Created centralized email templates using Resend API
   - Payout failure notifications (to org admins)
   - Cash flow critical alerts (to platform admins)
   - Invoice emails (to clients)
   - File: `supabase/functions/_shared/email-templates.ts`

10. **Payout Failure Email Integration**
    - Wire up email sending in Friday payout edge function
    - Sends detailed failure list to org admins
    - File: `supabase/functions/friday-payout/index.ts`

11. **Cash Flow Alert Email Integration**
    - Send critical alerts when balance < £5k or gap < 30 days
    - Professional HTML email template with metrics
    - File: `supabase/functions/cash-flow-monitor/index.ts`

### Deferred Items (Lower Priority)
**Tier 3-5: Deferred for Future Phases**

- Invoice email notifications (requires Next.js-compatible Resend setup)
- Schedule board error handling refactor (remove silent mock fallback)
- Admin layout real-time badge updates
- CSV export certification status view
- Mobile auth UI screens (Phase 2)
- Worker consent flow UI (Phase 2)
- SQLCipher encryption (Phase 2)

---

## Feature Categories

### 1. Marketing Website (NEW - Just Built)
Next.js public-facing website with homepage, pricing page, and trust signals running on port 30500.

### 2. Medic Mobile App (Phases 1-3, 6-7)
Offline-first iOS app for medics to capture treatments, near-misses, and daily safety checks.

### 3. Business Operations (Phases 1.5, 4.5-7.5)
**NEW** - Online booking portal, payment processing, territory management, admin dashboards for scaling the staffing business.

### 4. Site Manager Dashboard (Phase 4)
Web dashboard for construction site managers to view compliance reports and treatment logs.

### 5. Customer Onboarding & Contracts (Phase 4.6)
**NEW** - Service agreement generation with auto-filled business info, document portal for phone sales, flexible payment terms (half upfront + remainder after completion/Net 30), digital signatures, and payment schedule enforcement.

### 6. Reporting & Compliance (Phase 5-6)
Automated PDF generation and RIDDOR auto-flagging for HSE compliance.

---

## Detailed Feature List

## Marketing Website (Just Built)
**Status**: ✅ **COMPLETED** - Running on port 30500
**Goal**: Public-facing marketing website for client acquisition and brand presence
**Tech Stack**: Next.js 15, TypeScript, Tailwind CSS
**Performance**: <2s load time target, Lighthouse score >90 target

### Features:

#### **Homepage** (`/`)
- **Hero Section**
  - Main headline: "Compliance Happens While You Work"
  - Value proposition: Automatic compliance documentation from clinical work
  - Dual CTAs: "Start Free Trial" + "Watch Demo"

- **Problem/Solution Grid**
  - Left column: Current pain points (manual admin, paper records, missed RIDDOR deadlines)
  - Right column: SiteMedic solutions (automatic documentation, instant sync, auto-flagging)

- **Key Benefits Section**
  - Offline-first capability (works with zero mobile signal)
  - 60-second logging performance (30s minor, 90s full treatment)
  - UK GDPR compliance (AES-256, UK servers, special category data)

- **How It Works** (4-step process)
  1. Treat the Patient (clinical work focus)
  2. Auto-Sync (cloud sync when connectivity returns)
  3. RIDDOR Check (AI-powered flagging)
  4. Weekly Reports (automatic PDF generation)

- **Trust Signals**
  - RIDDOR 2013 compliance badge
  - UK GDPR certification
  - CDM 2015 construction safety
  - HSE audit-ready reports

- **Footer Navigation**
  - Product links (Features, Pricing, Security)
  - Company links (About, Contact, Privacy)
  - Legal links (Terms, GDPR, Data Processing)

#### **Pricing Page** (`/pricing`)
- **Modern Design with Enhanced Visual Hierarchy**
  - Updated hero section with larger typography (text-6xl)
  - Better spacing and padding throughout (pt-20, pb-20)
  - Professional shadow effects on cards (shadow-lg, hover:shadow-xl)
  - Gradient backgrounds for visual interest (from-slate-50 to-blue-50)
  - Improved mobile responsiveness (sm, md, lg breakpoints)

- **Main Pricing Card (Guardian Medics Pro)**
  - Daily rate: £350/day (+VAT)
  - Enhanced card design with rounded-xl borders
  - Larger pricing display (text-6xl for price)
  - Feature list with green checkmarks
  - Hover effects for better interactivity
  - Includes: Digital treatment logging, RIDDOR auto-flagging, weekly safety reports, offline capability

- **Volume Discount Cards**
  - Gradient background design (from-slate-50 to-blue-50)
  - Three tiers:
    - 1 week (5 days): £1,750 total (£350/day)
    - 1 month (20 days): £6,800 total (£340/day, 3% off)
    - Enterprise: Custom pricing with highlighted card design
  - Hover states with shadow effects
  - Better visual hierarchy with bold typography

- **FAQ Section**
  - Enhanced with rounded-xl borders
  - Larger headings (text-lg) for better readability
  - Hover effects (border-blue-200, shadow-sm)
  - Better spacing between questions
  - Professional typography with leading-relaxed

- **CTA Section**
  - Gradient background (from-slate-50 to-blue-50)
  - Larger typography (text-4xl for heading)
  - Enhanced button with shadow effects
  - Better mobile responsiveness

- **Interactive Quote Builder Modal with UK Construction Industry Intelligence** ✨ **UPDATED 2026-02-15**
  - **Step 1: Construction Site Assessment**
    - **Worker count input** for calculating paramedic requirements
      - Clearly asks for "Maximum workers on site at one time" (peak concurrent workers)
      - Not total headcount across all shifts/rotations
      - Includes example: "50 day shift + 30 night shift = enter 50"
      - Blue info box explains why peak concurrent matters for safety coverage
    - Project type selection (standard, high-risk, heavy civil, refurbishment)
    - **Intelligent paramedic recommendation** based on HSE guidance (configurable):
      - High-risk sites: 1 paramedic per 50 concurrent workers (default, configurable)
      - Standard sites: 1 paramedic per 100 concurrent workers (default, configurable)
      - Ratios configurable via environment variables (NEXT_PUBLIC_HIGH_RISK_RATIO, NEXT_PUBLIC_LOW_RISK_RATIO)
      - **Auto-fills** paramedic count when worker count + project type are entered
      - Updated guidance text clarifies these are HSE recommendations, not legal mandates
      - Green highlighted recommendation box shows calculation logic
    - Project phase selection (pre-construction, construction, fit-out, completion)
    - **Special requirements checkboxes** with educational info icon (ℹ️)
      - Confined Space Work (requires specialized rescue training)
      - Working at Height >3m (scaffolding, roofing, fall injury expertise)
      - Heavy Machinery Operation (crush injuries, extrication)
      - CSCS Card Site (paramedic needs valid CSCS card)
      - Trauma Specialist (advanced trauma care experience)
      - Clickable info icon shows detailed explanation of each requirement
      - Helps users understand why each matters for paramedic matching
    - **Google Places Autocomplete for Site Address** 🆕
      - Real-time address suggestions restricted to England & Wales only
      - Country restriction: UK (componentRestrictions: {country: 'gb'})
      - Administrative area filtering: Excludes Scotland and Northern Ireland
      - Types filter: Only shows addresses and geocodes (no businesses)
      - Auto-fills GPS coordinates when address selected (lat, lng)
      - Manual coordinate override still available if address not found
      - Shows "(autocomplete enabled)" indicator when API loaded
      - Read-only coordinates field when address auto-filled
      - Google Places API key configurable via NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    - Duration flexibility: Fixed vs Estimated
      - **Fixed duration (exact dates)**: 🔄 **IMPROVED**
        - Start date and end date pickers
        - Duration automatically calculated from date difference (no manual dropdown)
        - Removes redundant user input when dates are known
        - Validation: End date must be after start date
        - Pricing shows calculated days (e.g., "8 days (~2 weeks)")
      - **Estimated duration (ranges)**:
        - Range-based dropdown (1-2 weeks, 2-4 weeks, etc., or ongoing with weekly renewal)
        - Start date picker only (end date estimated)
        - Flexible for uncertain construction timelines

  - **Step 2: Comprehensive Quote Breakdown**
    - Project details summary (workers, type, location, special requirements)
    - Detailed pricing calculation:
      - Per-paramedic daily rate (£350/day)
      - Total days calculated from duration selection
      - VAT clearly indicated (20%)
      - Estimated vs fixed pricing clearly labeled
    - What's included section listing all compliance features
    - Educational note for estimated pricing explaining flexibility

  - **Step 3: Contact Information Collection**
    - Full name, email, phone (UK format), company name
    - GDPR-compliant consent notice
    - Form submission with quote request

  - **UK Construction Industry Context**
    - Follows CDM 2015 requirements
    - Accommodates uncertain construction timelines
    - Provides guidance on paramedic requirements
    - Special requirements aligned with UK construction standards
    - UK-only address validation for insurance compliance

#### **Technical Implementation**
- **Port Configuration**: 30500 (configured to avoid conflicts with port 1234)
- **Development Server**: `pnpm dev` starts on localhost:30500
- **Production Build**: `pnpm build` + `pnpm start`
- **Performance Optimizations**:
  - Next.js Image optimization
  - React Strict Mode enabled
  - Compression enabled
  - Powered-by header removed for security
  - Workspace root detection configured
  - **Admin Revenue page**: Recharts chart bundle (~220 KB) lazy-loaded via `next/dynamic` with `ssr: false` — defers heavy charting library until after data arrives, reducing initial TTI

#### **Design System**
- Tailwind CSS utility-first styling
- Color scheme: Blue primary (#2563EB), Gray neutrals
- Typography: System font stack (-apple-system, BlinkMacSystemFont, Segoe UI)
- Responsive breakpoints: sm, md, lg
- Accessibility: High contrast, semantic HTML, ARIA labels

#### **SEO & Metadata**
- Page title: "SiteMedic - Automatic Compliance for Construction Site Medics"
- Meta description: "Turn clinical work into automatic compliance documentation. RIDDOR-ready reports in 60 seconds."
- Language: en (English)
- Social sharing metadata (ready for Open Graph)

#### **Navigation**
- Consistent header across all pages
- Logo links to homepage
- Mobile-responsive menu (hidden on mobile, visible on md+)
- CTA button in header: "Get Started"
- Footer with 4-column layout (Product, Company, Legal, About)

#### **Deployment Ready**
- Static Site Generation (SSG) for fast performance
- Build output optimized for CDN deployment
- Environment-agnostic configuration
- No hard-coded URLs or secrets

---

## UK Legal & Compliance Features (Just Built)
**Status**: ✅ **COMPLETED** - Full UK GDPR, PECR, and accessibility compliance
**Goal**: Meet all UK legal requirements for operating a health data business
**Tech Stack**: React, TypeScript, Tailwind CSS, localStorage for consent management

### Features:

#### **Privacy Policy** (`/privacy-policy`) ✅
- **UK GDPR Comprehensive Documentation**
  - Data controller information (SiteMedic Ltd with ICO registration)
  - Special category data (health data) handling under Article 9
  - Legal bases: Contract performance, legal obligation, legitimate interest, consent
  - Data collection breakdown:
    - Personal data: Account info, company details, device info, usage data
    - Special category health data: Worker profiles, treatment records, photos, RIDDOR incidents, certifications
  - Data sharing and third-party processors:
    - Supabase (PostgreSQL UK hosting, eu-west-2 London)
    - Vercel (Website hosting with UK data residency)
    - Stripe (Payment processing, PCI-DSS compliant)
    - All with Data Processing Agreements (DPAs)
  - **No data transfers outside UK/EU**
  - Security measures:
    - AES-256 encryption at rest
    - TLS 1.3 in transit
    - Bcrypt password hashing
    - Row-Level Security (RLS) policies
    - Audit logging
  - Data retention policies:
    - Treatment records: 3 years (RIDDOR requirement)
    - Certifications: Until expiry + 1 year
    - Account data: Until deletion + 30 days
    - Audit logs: 6 years (UK tax law)
  - User rights under UK GDPR:
    - Right to access (Article 15)
    - Right to rectification (Article 16)
    - Right to erasure / "Right to be Forgotten" (Article 17)
    - Right to restrict processing (Article 18)
    - Right to data portability (Article 20)
    - Right to object (Article 21)
    - Right to withdraw consent
  - ICO complaint procedure with full contact details
  - Contact information for privacy inquiries and DPO

#### **Cookie Policy** (`/cookie-policy`) ✅
- **PECR (Privacy and Electronic Communications Regulations) Compliant**
  - Detailed explanation of what cookies are (session, persistent, first-party, third-party)
  - Cookie categories with explicit consent requirements:
    - **Strictly Necessary** (Always Active):
      - `cookie-consent`: Stores user preferences (12 months)
      - `session-token`: Authentication (session)
      - `csrf-token`: Security protection (session)
    - **Analytics Cookies** (Requires Consent):
      - `_ga`, `_ga_*`, `_gid`: Google Analytics (2 years/24 hours)
      - Purpose: Site performance measurement and improvement
      - Third-party: Google LLC with DPA
    - **Marketing Cookies** (Requires Consent):
      - `_fbp`: Facebook Pixel (3 months)
      - `_gcl_au`: Google Ads conversion tracking (3 months)
      - Purpose: Ad targeting and campaign measurement
  - Cookie management instructions:
    - Cookie banner controls (Accept All / Necessary Only / Customize)
    - Browser settings guides for Chrome, Firefox, Safari, Edge
    - Third-party opt-out links (Google, Facebook privacy policies)
  - Do Not Track (DNT) disclosure
  - Mobile app data storage explanation (iOS Keychain, not browser cookies)

#### **Terms and Conditions** (`/terms-and-conditions`) ✅
- **UK Law Governed (England and Wales Jurisdiction)**
  - Eligibility requirements: 18+, qualified medical professionals, legal capacity
  - Account creation and security responsibilities
  - Acceptable use policy:
    - Prohibited activities (unauthorized access, malware, false information)
    - Professional responsibility disclaimers (medic remains solely responsible for clinical decisions)
    - Healthcare regulation compliance obligations
  - Content and intellectual property:
    - User retains ownership of treatment records and data
    - SiteMedic owns platform software and design
    - Backup responsibility (user must maintain own backups)
  - Payment terms:
    - Fees quoted in GBP (£) with VAT at 20%
    - Monthly/annual subscriptions auto-charged
    - Enterprise plans invoiced with Net 30 terms
    - Late payment fees per Late Payment of Commercial Debts (Interest) Act 1998
    - Refund policy (Consumer Rights Act 2015 compliant)
  - Data protection and privacy:
    - UK GDPR compliance reference
    - Special category health data consent
    - Cross-reference to Privacy Policy
  - Limitations of liability:
    - Service availability (99.9% uptime target, no guarantee)
    - Disclaimer of warranties ("AS IS" service)
    - Liability cap (fees paid in preceding 12 months)
    - Exceptions for death/injury by negligence, fraud
  - Indemnification:
    - User liability for Terms violations
    - Clinical decision responsibility
  - RIDDOR compliance responsibilities:
    - User responsible for accurate logging
    - User responsible for reviewing flags and submitting reports
    - SiteMedic provides tools only, not compliance guarantee
  - Termination procedures:
    - User-initiated cancellation
    - Platform-initiated suspension (breach, non-payment, legal requirement)
    - 30-day data export window
  - Dispute resolution (informal mediation before litigation)
  - Severability, entire agreement clauses

#### **Cookie Consent Banner** ✅
- **GDPR/PECR Compliant Consent Management**
  - Appears on first visit (localStorage check)
  - Three consent options clearly presented:
    1. **Accept All**: Consent to necessary + analytics + marketing
    2. **Necessary Only**: Essential cookies only (functional requirement)
    3. **Customize**: Opens preferences modal for granular control
  - Sticky banner at bottom with dark background (high visibility)
  - Clear explanation of cookie usage
  - Link to detailed Cookie Policy
  - Consent preferences modal:
    - Toggle switches for Analytics and Marketing
    - Strictly Necessary always enabled (cannot be disabled)
    - Detailed descriptions of each category
    - Visual toggle switches with blue active state
    - "Save Preferences", "Reject All", "Cancel" buttons
  - Persistent storage:
    - Consent saved to localStorage (12-month persistence)
    - Consent date tracked for audit purposes
    - Preferences can be changed anytime
  - No cookies set before explicit consent (PECR requirement)
  - Integration points for analytics/marketing script initialization

#### **Accessibility Improvements (WCAG 2.1 AA)** ✅
- **Keyboard Navigation**
  - Skip-to-content link (visible on focus, jumps to #main-content)
  - Tab order follows logical reading flow
  - All interactive elements keyboard-accessible
  - No keyboard traps
- **Semantic HTML5 Structure**
  - `<main id="main-content">` for primary content
  - `<nav aria-label="Main navigation">` for navigation
  - `<section aria-labelledby="[heading-id]">` for content sections
  - `<footer role="contentinfo">` for footer
  - Proper heading hierarchy (h1 → h2 → h3, no skipping levels)
- **ARIA Labels and Landmarks**
  - aria-label on logo link ("SiteMedic Home")
  - aria-label on buttons ("Start your 14-day free trial", "Watch a product demonstration video")
  - aria-labelledby linking sections to headings
  - Descriptive link text (no "click here")
- **Focus Indicators**
  - Visible focus rings on all interactive elements
  - Blue ring (ring-2) for standard elements
  - Prominent ring (ring-4) for primary CTAs
  - High contrast against background
- **Color Contrast**
  - Blue-600 (#2563EB) on white background (WCAG AA compliant)
  - White text on gray-900 background (WCAG AAA compliant)
  - High contrast for readability
- **Language Declaration**
  - `lang="en-GB"` in `<html>` tag (British English)
  - Proper for UK-based business
- **Screen Reader Support**
  - Descriptive alt text for icons (implied by SVG usage)
  - Proper labeling of form controls
  - Clear button labels for screen readers

#### **Refund & Returns Policy** (`/refund-policy`) ✅ **NEW**
- **Consumer Rights Act 2015 Compliant**
  - 14-day cooling off period for online purchases
  - Full refund rights for subscription services
  - Medic booking cancellation policy:
    - 7+ days before: 100% refund, no cancellation charges
    - 3-6 days before: 50% refund, 50% cancellation fee
    - <72 hours: No refund (medic reserved)
  - Service quality issue resolution process
  - Refund request procedures (email, phone, online dashboard)
  - Refund processing timelines:
    - Card payments: 5-7 business days
    - PayPal: 3-5 business days
    - Bank transfer: 3-5 business days
  - Non-refundable items clearly listed
  - Rescheduling option as alternative to cancellation
  - Statutory rights preserved (Consumer Rights Act, Consumer Contracts Regulations)

#### **Complaints Procedure** (`/complaints`) ✅ **NEW**
- **Comprehensive Complaints Handling Process**
  - Multiple contact methods (email, phone, live chat, post)
  - Three-stage process:
    1. Acknowledgement within 24 hours with complaint reference number
    2. Investigation within 5-10 business days
    3. Resolution with clear explanation and remedies
  - Possible outcomes:
    - Financial remedy (refund, credit, discount, compensation)
    - Service remedy (re-performance, upgrade, priority support)
    - Corrective action (staff training, process improvements)
    - Apology and explanation
  - Internal escalation to senior management
  - External escalation options:
    - Alternative Dispute Resolution (UK Dispute Resolution service)
    - Citizens Advice Consumer Service
    - Small Claims Court
  - Common complaint categories (service quality, booking/admin, technical, communication)
  - Commitment to learning from complaints (quarterly reviews, process improvements)

#### **Acceptable Use Policy** (`/acceptable-use`) ✅ **NEW**
- **Comprehensive AUP Defining Prohibited Activities**
  - Prohibited categories:
    1. Illegal or fraudulent activities (fraud, false RIDDOR reports, insurance fraud)
    2. Data misuse and privacy violations (unauthorized access, GDPR violations, data selling)
    3. System abuse and security violations (hacking, malware, DoS attacks)
    4. Content and communication abuse (false information, harassment, spam)
    5. Commercial misuse (reselling, competing, building similar products)
    6. Professional misconduct (practice outside scope, impaired treatment, falsified records)
  - Reporting mechanisms for violations (security, abuse, DPO contacts)
  - Consequences of violations:
    - Warning (first-time/minor violations)
    - Account suspension (repeated/moderate violations, 7-30 days)
    - Account termination (serious violations, permanent ban, no refund)
    - Legal action (criminal reporting to police, HSE, ICO)
    - Professional reporting (GMC, NMC, HCPC)
  - Monitoring and enforcement policy
    - Automated detection systems
    - Human review for flagged accounts
    - Privacy-compliant monitoring per UK GDPR
  - Clear guidance for users (contact legal@sitemedic.co.uk if unsure)

#### **Accessibility Statement** (`/accessibility-statement`) ✅ **NEW**
- **WCAG 2.1 Level AA Compliance Statement**
  - Commitment to digital accessibility for people with disabilities
  - Accessibility features documented:
    - Keyboard navigation (skip links, no keyboard traps, visible focus)
    - Screen reader support (semantic HTML, ARIA labels, alt text)
    - Visual accessibility (high contrast, resizable text, clear fonts)
    - Mobile accessibility (responsive design, 44x44px touch targets)
  - Compatible assistive technologies listed:
    - Screen readers: JAWS, NVDA, VoiceOver, TalkBack
    - Screen magnification: ZoomText, Windows Magnifier, macOS Zoom
    - Speech recognition: Dragon NaturallySpeaking, Voice Control
  - Known limitations documented (third-party content, PDF accessibility)
  - Feedback and contact information for accessibility issues
  - Alternative access methods:
    - Phone support for assistance
    - Email support for accessible formats
    - Alternative document formats (large print, audio, Braille, accessible PDF)
  - Technical specifications (HTML5, WAI-ARIA, CSS3, JavaScript ES6+)
  - Assessment methodology (self-evaluation, automated testing, manual testing, user testing)
  - Latest assessment: 15 February 2026, WCAG 2.1 AA compliant
  - Escalation to Equality and Human Rights Commission (EHRC) if unsatisfied
  - Review schedule: Every 6 months (next review: August 2026)

#### **Footer Enhancements** ✅
- **Legally Required Company Information** (Electronic Commerce Regulations 2002)
  - Company name: SiteMedic Ltd
  - Company registration number: [Placeholder for actual number]
  - VAT number: [Placeholder for actual number]
  - Registered in England and Wales
  - Registered office address: [Placeholder]
  - Contact email: info@sitemedic.co.uk
  - Contact phone: [Placeholder for actual number]
  - ICO registration number: [Placeholder]
- **Legal & Compliance Links** (Updated with new pages)
  - Privacy Policy (`/privacy-policy`)
  - Cookie Policy (`/cookie-policy`)
  - Terms & Conditions (`/terms-and-conditions`)
  - Refund Policy (`/refund-policy`) **NEW**
  - Complaints (`/complaints`) **NEW**
  - Acceptable Use (`/acceptable-use`) **NEW**
  - Accessibility Statement (`/accessibility-statement`) **NEW**
  - ICO Registration (external link to ico.org.uk)
- **Compliance Badges**
  - UK GDPR Compliant ✓
  - RIDDOR 2013 ✓
  - CDM 2015 ✓
  - ISO 27001 Ready ✓
- **Data Hosting Transparency**
  - Data hosting location: UK (London)
  - PCI DSS compliance: Via Stripe
- **Professional 4-Column Layout**
  - Column 1: Company info and legal details
  - Column 2: Product links
  - Column 3: Legal documentation links (expanded to 7 pages)
  - Column 4: Compliance badges
  - Bottom section: Full registered office address, contact details, technical compliance info

#### **Technical Implementation**
- **Client-Side Consent Management**
  - localStorage for persistent consent storage (no server-side tracking)
  - Consent preferences object: `{ necessary: true, analytics: boolean, marketing: boolean }`
  - Consent date tracking: ISO 8601 format for audit purposes
  - Consent expiry: 12 months (re-prompt after expiry)
- **Component Architecture**
  - `CookieConsent.tsx`: Main banner + preferences modal
  - `SkipToContent.tsx`: Accessibility skip link
  - Both components added to root layout (`layout.tsx`)
- **Styling**
  - Tailwind CSS utility classes for rapid development
  - Responsive design (mobile-first breakpoints)
  - High contrast colors for readability
  - Focus states with ring utilities
- **Legal Page Structure**
  - Consistent navigation header with back-to-home link
  - Full-width content container (max-w-4xl)
  - Semantic HTML headings (h1, h2, h3)
  - Footer navigation to other legal pages
  - Professional typography with prose classes

#### **Compliance Coverage**
- ✅ UK GDPR (General Data Protection Regulation)
- ✅ Data Protection Act 2018
- ✅ PECR (Privacy and Electronic Communications Regulations)
- ✅ Electronic Commerce Regulations 2002 (company info display)
- ✅ Consumer Rights Act 2015 (refund policy)
- ✅ Late Payment of Commercial Debts (Interest) Act 1998
- ✅ WCAG 2.1 Level AA (Web Content Accessibility Guidelines)
- ✅ ICO (Information Commissioner's Office) requirements
- ✅ RIDDOR 2013 (data retention and reporting responsibilities)

#### **Outstanding Items**
**⚠️ Code Placeholders to Update:**
- [ ] Insert actual company registration number (placeholder: [Insert Registration Number])
- [ ] Insert actual VAT number (placeholder: [Insert VAT Number])
- [ ] Insert actual registered office address (placeholder: [Insert Registered Office Address])
- [ ] Insert actual ICO registration number (placeholder: [Insert ICO Registration Number])
- [ ] Insert actual contact phone number (placeholder: +44 (0) XXXX XXXXXX)
- [ ] Implement analytics script initialization (Google Analytics) when consent granted
- [ ] Implement marketing pixel initialization (Facebook Pixel) when consent granted
- [ ] Add Google Analytics tracking ID to environment variables
- [ ] Add Facebook Pixel ID to environment variables

**📋 External Compliance Tasks:**
See **`docs/TODO.md`** for comprehensive list of external compliance tasks including:
- 🔴 Critical: Company registration, ICO registration, professional indemnity insurance
- 🟡 Important: VAT registration (when threshold reached), DPO appointment, DPIA
- 🟢 Nice to Have: ISO 27001 certification, Cyber Essentials, ADR membership
- Full checklist with timelines, costs, and next actions for each task

---

## Phase 1: Foundation
**Status**: Planning complete (5 plans)
**Goal**: Backend infrastructure, authentication, and offline-first architecture

### Features:
- **Supabase Backend** (PostgreSQL UK region: eu-west-2 London)
  - User authentication (email/password)
  - Row-Level Security (RLS) policies for multi-tenant data isolation
  - Audit logging via PostgreSQL triggers (server-side) + local audit service (client-side)
  - GDPR compliance tables (consent tracking, data retention policies)

- **Authentication**
  - **Web Dashboard**: Magic link (passwordless) authentication via email
  - **Mobile App**: Email/password sign up and login
  - Offline session persistence (app restart works without network)
  - Biometric authentication (Face ID/Touch ID) for quick access on mobile
  - Session token refresh and offline token validation

- **Offline Storage Infrastructure**
  - WatermelonDB local database (SQLite-based)
  - Encryption key management via iOS Keychain (expo-secure-store)
  - Database encryption deferred to Phase 2 (WatermelonDB PR #907 not merged)
  - Sync queue persistence with conflict resolution logic

- **Network Monitoring**
  - Connectivity detection (WiFi, cellular, offline)
  - Multi-modal sync status indicators (color, labels, pending count badge)
  - Sync queue visibility (shows pending items)

---

## Phase 1.5: Business Operations Foundation (NEW)
**Status**: Not started (4 plans)
**Goal**: Database schema, payment infrastructure, territory system for booking and payouts

### Features:
- **Database Schema for Business Operations**
  - `territories` table: UK postcode sectors (~11,232) with primary/secondary medic assignments
  - `bookings` table: Shift details, pricing breakdown, status (pending/confirmed/completed/cancelled), auto-matching results
  - `clients` table: Company accounts, payment terms (prepay vs Net 30), credit limits, booking history
  - `medics` table: Roster with qualifications, Stripe Express account IDs, utilization %, performance ratings
  - `timesheets` table: Hours worked, approval workflow (medic → site manager → admin), payout status
  - `invoices` table: Client billing with VAT (20%), payment status, due dates
  - `payments` table: Stripe Payment Intent IDs, refunds, platform fee tracking
  - `travel_time_cache` table: Google Maps API results with 7-day TTL (cost optimization)
  - `territory_metrics` table: Daily analytics for hiring decisions (utilization, rejection rate)

- **Stripe Connect Integration**
  - Platform Stripe account setup (test mode)
  - Medic Express account creation (onboarding flow)
  - Test payment processing (charge client, transfer to medic)
  - 40% platform markup configuration (transparent to client)

- **Google Maps Distance Matrix API**
  - Travel time calculations between medic home and job site
  - 7-day result caching (reduce API costs)
  - Haversine distance fallback if API unavailable
  - Batch request support (multiple origin-destination pairs)

- **UK Postcode Database**
  - Seed ~11,232 UK postcode sectors (e.g., "SW1A", "N1", "E14")
  - Primary + secondary medic assignment per sector
  - Hybrid territory model: Postcode + max travel time (e.g., "SW1A within 30 minutes")
  - Overlapping territory support (medics cover multiple sectors)

---

## Phase 2: Mobile Core
**Status**: ✅ **COMPLETED** - All plans complete (10/10 plans) - 2026-02-15
**Goal**: Treatment logging, worker profiles, near-miss capture, daily safety checks (100% offline with gloves-on usability)

### iOS Mobile App Setup ✅ **COMPLETED - 2026-02-16**
- **iOS Native Build Configuration**
  - Generated iOS native project using `expo run:ios`
  - CocoaPods dependency installation (95+ pods including Expo modules)
  - Xcode project configuration with bundle identifier: `com.sitemedic.app`
  - iOS 26.2 simulator compatibility (iPhone 15)

- **✅ App Entry Point Fixed - 2026-02-16**
  - Updated `package.json` main field to `expo-router/entry` (proper Expo Router configuration)
  - Added `expo-router` plugin to `app.json` plugins array
  - Moved `mobile/app/` to root `app/` directory (Expo Router standard structure)
  - Moved `mobile/components/`, `mobile/services/`, `mobile/tasks/` to root
  - Fixed all import paths in app directory files (../../src → ../src, etc.)
  - Fixed import paths in tasks/backgroundSyncTask.ts (../../src/services → ../src/services)
  - Fixed import paths in components/forms/WorkerSearchPicker.tsx (../../../src → ../../src)
  - Fixed React version compatibility for Expo SDK 54 (requires React 19.1.0 exactly)
    - Updated react from ^19.2.4 to 19.1.0 (Expo SDK 54 requirement)
    - Updated react-dom from 19.1.0 to 19.1.0 (already correct)
    - Updated @types/react to ~19.1.0 (matches React version)
  - Removed custom `index.js` (backed up to `index.backup.js`)
  - Original root App.tsx backed up to `App.backup.tsx` for reference
  - **All Phase 2 features are now accessible via 4-tab navigation**:
    - Home tab: Quick actions, daily check prompts, worker lookup, stats
    - Treatments tab: Treatment list, quick log, full treatment forms
    - Workers tab: Worker registry with search and certification status
    - Safety tab: Near-miss reporting and daily safety checks

- **✅ WatermelonDB Native Module Integration Fixed - 2026-02-15**
  - **Problem**: WatermelonDB native modules not linking properly, causing app crash on startup
    - Error: `NativeModules.WMDatabaseBridge is not defined!`
    - Root cause: `@lovesworking/watermelondb-expo-plugin-sdk-52-plus` only supports Expo SDK 52-53
    - App stuck in reload loop, blank screen for users

  - **Solution**: Switched to SDK 54-compatible plugin
    - Removed: `@lovesworking/watermelondb-expo-plugin-sdk-52-plus@1.0.3` (SDK 52-53 only)
    - Installed: `@morrowdigital/watermelondb-expo-plugin@2.3.3` (SDK 54 compatible, actively maintained)
    - Updated `app.json` plugins configuration to use new plugin
    - Removed duplicate simdjson pod entry from Podfile (plugin handles this automatically)

  - **Performance Optimization**: Re-enabled JSI mode in `src/lib/watermelon.ts`
    - Changed `jsi: false` to `jsi: true` for improved database performance on iOS
    - JSI (JavaScript Interface) provides faster native bridge communication

  - **Build Configuration**:
    - Successfully ran `npx expo prebuild --clean` with new plugin
    - Pod install completed: 100 dependencies, 102 total pods installed
    - WatermelonDB and simdjson auto-linked correctly via Expo modules

  - **Impact**: Database now initializes successfully, app loads to 4-tab navigation

- **pnpm Module Resolution Fix**
  - Created custom `index.js` entry point to bypass pnpm symlink issues
  - Updated `package.json` main field from `node_modules/expo/AppEntry.js` to `index.js`
  - Created `metro.config.js` with pnpm-compatible resolver configuration
  - Fixed "Unable to resolve module ../../App" error caused by pnpm's `.pnpm/` nested structure

- **Development Environment**
  - Metro bundler running on `http://localhost:8081`
  - Development server on port 30500 (web version)
  - Hot reload enabled for rapid development
  - App successfully displays "SiteMedic" with sync status indicator

- **Technical Stack Verified**
  - React Native 0.81.5 with New Architecture enabled
  - Expo SDK 54
  - WatermelonDB offline database initialized successfully
  - Auth and Sync context providers working
  - Offline-first architecture confirmed operational

### Completed (Plan 02-01):
- **Phase 2 Dependencies Installed** (11 packages)
  - expo-image-picker, expo-image-manipulator (photo documentation)
  - expo-location (GPS tracking for near-misses)
  - react-native-signature-canvas, react-native-webview (digital signatures)
  - react-hook-form (form validation)
  - @gorhom/bottom-sheet (picker modals)
  - react-native-reanimated, react-native-gesture-handler (smooth animations)
  - react-native-autocomplete-dropdown (searchable pickers)
  - react-native-svg, react-native-worklets (peer dependencies)

- **Shared Gloves-On UI Components** (mobile/components/ui/)
  - **LargeTapButton**: 56pt minimum tap targets (exceeds iOS 44pt/Android 48pt), 3 variants (primary/secondary/danger), high contrast colors for sunlight, extended hit slop for gloved use
  - **BottomSheetPicker**: Scrollable picker modal with 56pt row height, keyboard-aware, snap points (50%/90%), visual selection feedback
  - **StatusBadge**: Color-coded status indicators (green/amber/red/grey), large (56pt) and small (28pt) sizes, high contrast

- **Construction Safety Taxonomy Data** (mobile/services/taxonomy/)
  - **injury-types.ts**: 20 items (8 RIDDOR Specified + 12 Minor), isRiddorReportable flag for Phase 6 auto-flagging
  - **body-parts.ts**: 15 anatomical regions (US BLS OIICS standard)
  - **treatment-types.ts**: 14 first aid/emergency treatments
  - **near-miss-categories.ts**: 13 hazard types with emoji icons
  - **daily-check-items.ts**: 10 priority-ordered site safety checks
  - **outcome-categories.ts**: 7 post-treatment outcomes with severity levels (low/medium/high)
  - All IDs use kebab-case for API consistency

### Completed (Plan 02-02): ✅ **NEW - 2026-02-16**
- **Photo Capture & Compression Pipeline** (mobile/services/photo-processor.ts)
  - **captureAndCompressPhotos()**: Gallery picker with multi-select up to 4 photos
  - **takePhotoAndCompress()**: Camera capture with on-device compression
  - **compressPhoto()**: Resize to 1200px width, JPEG 70% quality (target 100-200KB per photo)
  - Quality: 1.0 in ImagePicker prevents iOS GIF compression bug (Research Pitfall 1)
  - Graceful permission handling (returns empty array on denial)
  - Fallback to original URI on compression error

- **PhotoCapture Component** (mobile/components/forms/PhotoCapture.tsx)
  - Full-width photo cards (200px height) instead of thumbnails for better gloves-on tap targets
  - 4-photo limit enforcement with remaining count display ("Photos: 2/4")
  - Large remove buttons (56pt tap target, red variant)
  - Camera and gallery buttons disable when limit reached
  - ScrollView for multiple photos with vertical scrolling
  - Automatic compression pipeline integration

- **SignaturePad Component** (mobile/components/forms/SignaturePad.tsx)
  - Full-screen modal (slide animation, presentationStyle="fullScreen")
  - Thick pen stroke (dotSize: 3, minWidth: 3, maxWidth: 4) for gloves-on signing
  - Large Clear and Save buttons (56pt minimum) with custom WebView styles
  - Base64 PNG output via react-native-signature-canvas
  - Cancel button in header to close modal
  - Note: May show blank in Expo Go dev mode (Research Pitfall 4), works in production builds

### Completed (Plan 02-03): ✅ **NEW - 2026-02-16**
- **Worker Profile System** (mobile/app/worker/ + mobile/components/forms/)
  - **WorkerSearchPicker Component** (mobile/components/forms/WorkerSearchPicker.tsx)
    - Multi-field autocomplete search across name, company, and role using Q.or() query
    - Accent normalization (NFD) for international name safety
    - Q.sanitizeLikeString() for SQL injection protection
    - 300ms debounced search for performance
    - Inline quick-add when no search results found
    - Creates workers with isIncomplete: true flag for follow-up full induction
    - 56pt minimum height on all inputs (gloves-on design)
    - "View History" button for selected worker

  - **Full Worker Induction Form** (mobile/app/worker/new.tsx)
    - 4 collapsible sections: Basic Info, Emergency Contact, Health Information, Certifications
    - Auto-save on field change (debounced 500ms) using react-hook-form watch()
    - All WORK-02 health screening fields:
      - Allergies (free text, multi-line)
      - Current medications (free text, multi-line)
      - Pre-existing conditions (free text, multi-line)
      - Blood type (picker: A+/A-/B+/B-/AB+/AB-/O+/O-/Unknown)
      - CSCS card number + expiry date
      - Additional certifications (type + expiry, multiple)
      - Emergency contact (name, phone, relationship)
    - BottomSheetPicker for blood type and relationship selection
    - Sets isIncomplete: false on completion

  - **Worker Profile View** (mobile/app/worker/[id].tsx)
    - Worker profile info at top (name, company, role)
    - Certification expiry status with StatusBadge:
      - Green: >30 days remaining
      - Amber: <30 days (expiring soon)
      - Red: Expired
    - Treatment history FlatList (sorted by created_at descending)
    - Q.where('worker_id') query for treatments
    - Reachable in 2 taps (WORK-04 requirement)
    - Edit profile button
    - Tap treatment row to view full treatment details

  - **Quick-Add Worker Modal** (mobile/app/worker/quick-add.tsx)
    - Minimal fields: Name (required), Company (required), Role (optional)
    - Creates worker with isIncomplete: true flag
    - Pre-fills name from search query if provided
    - Returns worker ID to caller
    - Large 56pt "Add Worker" button
    - Warning note: "Worker marked as incomplete - remember to complete full induction later"

  - **Extended Worker Model** (Schema v1 → v2)
    - Added 9 fields to workers table:
      - allergies, current_medications, pre_existing_conditions (TEXT)
      - blood_type (STRING)
      - cscs_card_number (STRING)
      - cscs_expiry_date (NUMBER - epoch milliseconds)
      - certifications (STRING - JSON array: [{type, expiry}])
      - emergency_contact_relationship (STRING)
      - is_incomplete (BOOLEAN)
    - Migration with addColumns for backward compatibility

### Completed (Plan 02-04): ✅ **NEW - 2026-02-16**
- **Treatment Logging Workflow** (mobile/app/treatment/ + mobile/components/forms/)
  - **AutoSaveForm Hook** (mobile/components/forms/AutoSaveForm.tsx)
    - useAutoSave hook with debounced WatermelonDB updates (500ms default, configurable)
    - Accepts Model instance, formValues object, fieldMapping, debounceMs
    - Returns isSaving boolean and lastSaved timestamp
    - AutoSaveIndicator component shows "Saving..." / "Saved {time}" visual feedback
    - Defensive error handling (logs but doesn't crash)

  - **BodyDiagramPicker Component** (mobile/components/forms/BodyDiagramPicker.tsx)
    - 2-column grid layout with BODY_PARTS taxonomy (15 anatomical regions)
    - 56pt minimum tap targets for gloves-on usability
    - Visual selection feedback (blue border + background)
    - Scrollable for all body parts

  - **New Treatment Screen** (mobile/app/treatment/new.tsx - 450+ lines)
    - **6-Section Complete Clinical Form** supporting all TREAT-01 through TREAT-12:
      1. Worker Selection via WorkerSearchPicker (TREAT-01)
      2. Injury Details: Category (RIDDOR + minor taxonomy), Body Part (BodyDiagramPicker), Mechanism (8 presets + free text) (TREAT-02, 03, 04)
      3. Treatment Given: Multi-select checkboxes (14 types), Additional notes (TREAT-05)
      4. Photos: Up to 4 via PhotoCapture (TREAT-06)
      5. Outcome: 7 categories (returned to work, sent home, hospital, ambulance, etc.) (TREAT-07)
      6. Signature: Digital signature via SignaturePad, mandatory for completion (TREAT-08)
    - **Reference Number Generation**: SITE-YYYYMMDD-NNN format with daily sequential counter (TREAT-09)
    - **Auto-save every 500ms** via useAutoSave hook (exceeds TREAT-10 requirement of 10s)
    - **RIDDOR Auto-Detection**: Amber warning banner shown when injury type has isRiddorReportable=true
    - **Treatment Status**: Creates record as 'draft' on mount, marks 'complete' on validation pass
    - **Mechanism Presets**: 8 common injury scenarios (Struck by object, Fall, Manual handling, Sharp edge, Slip/trip, Caught in machinery, Repetitive strain, Chemical exposure)
    - **Multi-select Treatment Types**: Checkboxes with visual checkmarks (supports combined treatments)
    - **Validation**: Requires worker, injury type, and signature before completion

  - **Treatment View/Edit Screen** (mobile/app/treatment/[id].tsx - 370+ lines)
    - Read-only mode when status='complete'
    - Editable mode when status='draft'
    - All fields displayed with proper labels
    - Photos displayed as full-width images
    - Signature displayed as image preview
    - RIDDOR flag shown prominently with red banner
    - Treatment history integration with worker profiles
    - Delete draft functionality
    - PDF export placeholder (Phase 7)

  - **Enhanced BottomSheetPicker** (mobile/components/ui/BottomSheetPicker.tsx)
    - Added renderCustomContent prop for custom picker UIs
    - Enables BodyDiagramPicker integration
    - Made items/onSelect optional when using custom content

  - **Extended Treatment Model** (Schema v1 → v2)
    - Added 4 fields to treatments table:
      - reference_number (STRING, indexed) - SITE-YYYYMMDD-NNN format
      - status (STRING) - draft/complete workflow state
      - mechanism_of_injury (STRING, optional) - How injury occurred
      - treatment_types (STRING, optional) - JSON array of treatment IDs
    - Updated Treatment model with new properties and sanitizers

### Completed (Plan 02-05): ✅ **NEW - 2026-02-16**
- **Quick Treatment Templates & Treatment Log List** (mobile/app/treatment/templates.tsx + mobile/app/(tabs)/treatments.tsx)
  - **PresetTemplateCard Component** (mobile/components/forms/PresetTemplateCard.tsx)
    - Large tappable cards with 80pt minimum height, full width
    - Icon (32px emoji) on left, bold label (20pt font), subtitle below (14pt)
    - High contrast colors for outdoor sunlight readability
    - Press feedback (opacity 0.8) and extended hit slop for gloves-on use
    - Selected state with blue border and background

  - **Template Picker Screen** (mobile/app/treatment/templates.tsx - 280+ lines)
    - **8 Common Construction Injury Presets**:
      1. Minor Cut 🩹 → laceration + cleaned-dressed + wrist-hand + returned-to-work-same-duties
      2. Bruise 💢 → contusion + ice-pack + arm-elbow + returned-to-work-same-duties
      3. Headache 🤕 → headache + rest-welfare + head-face + returned-to-work-same-duties
      4. Splinter 🪵 → splinter + removed-foreign-body + finger-thumb + returned-to-work-same-duties
      5. Eye Irritation 👁️ → foreign-body-eye + eye-wash + eye + returned-to-work-same-duties
      6. Sprain/Strain 🦴 → sprain-strain + ice-pack + ankle-foot + returned-to-work-light-duties
      7. Minor Burn 🔥 → minor-burn + cleaned-dressed + wrist-hand + returned-to-work-same-duties
      8. Nausea/Dizziness 😵 → nausea-dizziness + rest-welfare + head-face + returned-to-work-same-duties
    - **Worker Selection First**: WorkerSearchPicker at top for speed (validates before template selection)
    - **One-Tap Template Selection**: Creates pre-filled Treatment record with all defaults auto-applied
    - **Sub-30-Second Workflow** (TREAT-11): Select worker → tap template → quick review/confirm
    - **Auto-fills 4 Fields**: injuryType, treatment, bodyPart, outcome from preset taxonomy IDs
    - **Reference Number Generation**: SITE-YYYYMMDD-NNN with daily sequential counter
    - **Navigates to Review**: Routes to treatment/[id].tsx for quick confirmation before completion
    - **Fallback to Full Form**: "Full Treatment Form" button for complex injuries or RIDDOR cases
    - All presets are minor injuries (isRiddorReportable: false, severity: 'minor')

  - **Treatment Log List View** (mobile/app/(tabs)/treatments.tsx - 480+ lines)
    - **Action Buttons**: Quick Log (→ templates.tsx) + Full Treatment (→ new.tsx) at top, side-by-side, 56pt height
    - **Search/Filter**: TextInput filters by worker name, injury type label, or reference number
    - **Sorted List**: All treatments loaded via WatermelonDB, sorted by created_at DESC (most recent first)
    - **Treatment List Items Display**:
      - Reference number (bold, e.g., "SITE-20260215-003")
      - Worker name + injury type on same line
      - Treatment date + time (formatted DD MMM YYYY at HH:MM)
      - Outcome badge with color coding (green=low severity, amber=medium, red=high)
      - RIDDOR flag indicator (red badge) when isRiddorReportable=true
      - Status label (Complete or Draft) in grey badge
      - Tap to navigate to treatment/[id].tsx for details
    - **Empty State**: "No treatments logged today" with call-to-action buttons
    - **Empty Search State**: Shows "No treatments match {query}" when search returns nothing
    - **Loading State**: Activity indicator during data load
    - **Lazy Loading**: FlatList for performance with large treatment datasets (UX-08 requirement)
    - **Worker Data Loading**: Promises to fetch worker names for each treatment (async map)
    - **High Contrast Design**: All tap targets 56pt minimum, readable in sunlight

### Features:
- **Treatment Logger**
  - Minor treatment: <30 seconds (worker + category + treatment + outcome)
  - Full treatment: <90 seconds (+ photos + digital signature)
  - Auto-save every 10 seconds (prevents data loss)
  - Offline photo capture with on-device compression (100-200KB)
  - Treatment history for each worker (view in 2 taps during emergency)

- **Worker Health Profiles**
  - Induction workflow with health screening
  - Emergency contact information
  - Medical history and allergies
  - Certification tracking (CSCS, CPCS, IPAF, Gas Safe)
  - Treatment history timeline

- **Near-Miss Capture** ✅ **COMPLETED** (Plan 02-06)
  - Photo-first workflow: Evidence captured FIRST (immediate), details SECOND (category/description/severity)
  - 13 construction hazard categories displayed as visible 2-column grid with emoji icons (Fall from height ⬇️, Electrical ⚡, Fire/Explosion 🔥, etc.)
  - GPS auto-capture with expo-location (balanced accuracy, non-blocking on failure for indoor/basement sites)
  - 3-level severity potential picker: Minor (green) / Major (amber) / Fatal (red) with outcome descriptions
  - Up to 4 photos with on-device compression (100-200KB target via 1200px resize + 70% JPEG)
  - Auto-save to WatermelonDB on every field change (no manual save button)
  - <45 second completion time achieved through visible category grid (no hidden picker) and photo-first design
  - Safety tab with reactive near-miss list (sorted by date, shows category/severity/photo thumbnail)
  - One-tap access to report from Safety tab (NEAR-06 requirement)

- **Daily Safety Checklists**
  - 10-item checklist, <5 minute completion
  - Photo evidence for failed items
  - Pre-shift inspection workflows
  - Customizable templates (future enhancement)

- **Gloves-On Usability**
  - 48x48pt minimum tap targets
  - High-contrast colors for bright sunlight
  - One-hand operation
  - Large fonts for readability

- **100% Offline Operation**
  - No network required (airplane mode test passes)
  - All data captured locally first
  - Sync happens in background when connectivity available

---

## Phase 3: Sync Engine
**Status**: 🔄 **IN PROGRESS** (5/7 plans complete, 2 gap closure plans pending) - 2026-02-16
**Goal**: Mobile-to-backend data synchronization with photo uploads

### Plan 03-01: Background Sync Infrastructure ✅ **COMPLETED - 2026-02-16**
- **Sync Dependencies Installed** (4 packages)
  - expo-background-task: Background task scheduling via iOS BGTaskScheduler
  - expo-task-manager: Task definition and lifecycle management
  - react-native-background-upload: Native background file uploads
  - expo-file-system: File reading for upload preparation

- **Background Sync Task Definition** (mobile/tasks/backgroundSyncTask.ts)
  - Global-scope TaskManager.defineTask for BACKGROUND_SYNC (Expo requirement)
  - Processes syncQueue.processPendingItems() to sync data in background
  - Error handling with throw to mark task as failed
  - Photo upload integration point (deferred to Plan 03-03)

- **Background Task Registration Service** (src/services/BackgroundSyncTask.ts)
  - registerBackgroundSync() with 15-minute minimum interval (iOS/Android BGTaskScheduler requirement)
  - unregisterBackgroundSync() for cleanup
  - Non-fatal error handling (logs error if registration fails, foreground sync remains primary)

- **Hybrid Sync Scheduler** (src/utils/syncScheduler.ts)
  - Foreground polling every 30 seconds when app is active (user decision: batch sync every 30s)
  - Background task scheduling for when app is inactive (15-minute minimum)
  - App state listener automatically switches between foreground and background sync strategies
  - Online check before sync attempt (prevents unnecessary retries when offline)
  - syncNow() manual trigger for immediate sync
  - Singleton pattern with start/stop lifecycle

- **Sync Strategy**
  - Hybrid approach balances user expectations with iOS limitations:
    - Foreground: 30-second polling provides responsive sync when app active
    - Background: 15-minute tasks handle sync when app backgrounded (iOS BGTaskScheduler minimum)
  - RIDDOR priority 0 items bypass batch interval (immediate sync via existing SyncQueue.enqueue())
  - Normal items batch for 30 seconds to reduce network requests
  - Background task registration is non-fatal (app continues with foreground-only if registration fails)

- **Testing Behavior: Simulator vs. Real Device**
  - **iOS Simulator**:
    - ⚠️ Shows warning: "Background tasks are not supported on iOS simulators. Skipped registering task: BACKGROUND_SYNC"
    - ✅ Background task still registers successfully (logs "[BackgroundSyncTask] Registered successfully")
    - ✅ Foreground sync works normally (30-second polling when app active)
    - ⚠️ Background task execution is **simulated only** - won't actually run when app backgrounded
    - ✅ All other sync functionality works (SyncQueue, PhotoUploadQueue, NetworkMonitor, etc.)
    - **Expected behavior**: Warning is informational, not an error. App functions normally with foreground sync only.

  - **Real iPhone Device**:
    - ✅ No simulator warning shown
    - ✅ Background tasks execute every ~15 minutes when app backgrounded (iOS manages exact timing)
    - ✅ Full hybrid sync strategy active (30s foreground + 15min background)
    - ✅ Photos upload in background (respects WiFi-only constraint)
    - **Testing requirement**: Must test background sync on real device or TestFlight to verify full functionality

  - **How to Test Background Sync on Real Device**:
    1. Build to physical iPhone: `pnpm ios --device`
    2. Open app, create treatment with photos while offline
    3. Background the app (press home button)
    4. Connect to WiFi
    5. Wait ~15-20 minutes
    6. Check Supabase database - treatment should be synced
    7. Check Supabase Storage - photos should be uploaded

### Plan 03-02: Progressive Photo Upload Pipeline ✅ **COMPLETED - 2026-02-16**
- **Progressive Image Compression** (src/utils/imageCompression.ts)
  - 3 quality tiers from single photo URI using expo-image-manipulator
  - Thumbnail: 150px max dimension, 50% quality (~50KB) - fast preview for dashboard
  - Preview: 800px max dimension, 70% quality (~200KB) - good detail without massive file size
  - Full: Original size, 90% quality (~2-5MB) - archival/legal documentation
  - Preserves aspect ratio with SaveFormat.PNG for lossless compression

- **PhotoUploadQueue Service** (src/services/PhotoUploadQueue.ts)
  - WiFi-only constraint enforcement for full-quality uploads (thumbnails/previews upload on any connection)
  - Max 2 concurrent uploads to prevent overwhelming device/network
  - Persistent upload tasks in WatermelonDB sync_queue (survives force-quit)
  - Progress tracking with pendingCount and activeUploads counters
  - Upload to Supabase Storage 'treatment-photos' bucket with RLS policies
  - Uses expo-file-system base64 encoding for v19 API compatibility

- **Supabase Storage Configuration** (supabase/migrations/014_storage_buckets.sql)
  - treatment-photos bucket with 50MB file limit (prevents abuse)
  - RLS policies: insert (authenticated users), select (authenticated users), update (authenticated users)
  - Path structure: {treatment_id}/{tier}/{filename}.png for organized storage

- **Upload Strategy**
  - All 3 tiers generated immediately on photo capture (responsive UI, no processing delays)
  - Queued separately with different constraints (thumbnail/preview any network, full WiFi-only)
  - Progressive availability: Dashboard gets thumbnail fast, full quality when WiFi available
  - Automatic retry with exponential backoff (same SyncQueue infrastructure)

### Plan 03-04: Sync Feedback UI Components ✅ **COMPLETED - 2026-02-16**
- **SyncErrorDisplay Component** (src/components/SyncErrorDisplay.tsx)
  - Plain English error messages for construction site medics (no technical jargon)
  - Maps technical errors to 4 user-friendly categories:
    - Network errors: "Unable to reach the server. Check your signal and try again."
    - Auth errors: "Your session has expired. Please log in again."
    - Server errors: "The server is temporarily unavailable. Your data is safe and will sync later."
    - Unknown: "Something went wrong with sync. Your data is saved locally."
  - Amber warning background (#FFFBEB) with left border emphasis
  - Manual retry button with 48pt minimum tap target (gloves-on usability)
  - Auto-dismisses when sync succeeds

- **RiddorSyncAlert Component** (src/components/RiddorSyncAlert.tsx)
  - Critical persistent banner for RIDDOR-reportable incidents that fail to sync
  - Only triggers after 3+ retry attempts (RIDDOR_RETRY_THRESHOLD = 3)
    - Rationale: At 3 retries with exponential backoff (30s, 1min, 2min), item has been failing for ~3.5 minutes
    - Prevents false alarms on transient network blips (retries 1-2 are normal)
  - Red background (#FEE2E2) for critical urgency
  - Non-dismissible until resolved (legal requirement for RIDDOR reporting)
  - Shows count of failing RIDDOR items: "X reportable incidents have not synced"
  - Manual "Sync Now" button with 56pt minimum tap target
  - Checks queue every 10 seconds for RIDDOR failures

- **PhotoUploadProgress Component** (src/components/PhotoUploadProgress.tsx)
  - Aggregate photo upload indicator (avoids UI spam per Research Pitfall 6)
  - Shows logical photo count (Math.ceil(pendingPhotoCount / 3)) not raw queue items
    - Each photo creates 3 queue items (thumbnail, preview, full)
    - Shows "Uploading 1 photo" instead of confusing "Uploading 3 items"
  - Light blue background (#EFF6FF) for non-intrusive notification
  - Auto-dismisses when all photos uploaded

- **Enhanced SyncStatusIndicator** (src/components/SyncStatusIndicator.tsx)
  - Badge shows combined count: data items + logical photo count
  - Label breakdown when both present: "X items, Y photos"
  - Photo-only state: "Y photos pending"
  - Data-only state: "X pending" (unchanged)
  - Maintains existing color-coded states (synced/syncing/pending/offline/error)
  - Maintains 48pt minimum tap target for gloves-on usability

- **SyncContext Enhancement** (src/contexts/SyncContext.tsx)
  - Added pendingPhotoCount field to SyncState interface
  - Filters photo_uploads items separately from data sync items
  - Tracks photo queue size for UI components (PhotoUploadProgress, SyncStatusIndicator)
  - Integrated photoUploadQueue.processPendingPhotos() in triggerSync()

### Plan 03-06: Battery/Network Runtime Constraints [GAP CLOSURE] - PLANNED
- **Gap Addressed**: Background sync task only sets minimumInterval (15min), no battery or network constraints
- **Root Cause**: expo-background-task does NOT expose WorkManager-style constraint APIs (confirmed in research)
- **Fix Approach**: Runtime guards at task start in tasks/backgroundSyncTask.ts:
  - Battery check via expo-battery: Skip all sync if battery < 15% AND not charging
  - Network type check via NetInfo: Skip photo uploads if cellular-only (data sync still proceeds)
  - All constraints logged for debugging
- **New Dependency**: expo-battery (for getBatteryLevelAsync and getBatteryStateAsync)
- **Files Modified**: tasks/backgroundSyncTask.ts, src/services/BackgroundSyncTask.ts (docs), package.json
- **Impact**: Prevents background sync from draining battery on construction site devices with limited charging access

### Plan 03-07: Client-Generated UUID Idempotency Keys [GAP CLOSURE] - PLANNED
- **Gap Addressed**: Retry of failed create could create duplicate server records (no idempotency protection)
- **Root Cause**: WatermelonDB auto-generates IDs, server_id only set after first successful sync
- **Fix Approach**:
  - Add `idempotency_key` column to sync_queue schema (WatermelonDB) + SyncQueueItem model
  - Generate UUID via expo-crypto (already installed) at enqueue time
  - Include `client_id` field in create payloads sent to Supabase
  - Handle PostgreSQL 23505 unique constraint violation as success (duplicate detected)
  - Server-side `client_id UUID UNIQUE` column migration documented for future phase
- **Schema Change**: WatermelonDB schema version bumped from 2 to 3
- **Files Modified**: src/database/schema.ts, src/database/models/SyncQueueItem.ts, src/services/SyncQueue.ts
- **Impact**: Prevents duplicate records when network timeout causes retry of successful create

### Summary of Phase 3 Deliverables:
- **Background Sync Infrastructure**
  - Automatic sync when connectivity returns (30-second foreground polling, 15-minute background tasks)
  - WiFi-only constraint for large photo uploads (thumbnails/previews upload on any connection)
  - Battery-efficient background task scheduling with non-fatal registration
  - Hybrid sync strategy balances responsiveness with iOS BGTaskScheduler limitations
  - [PLANNED] Runtime battery guard: skip background sync if battery < 15% and not charging
  - [PLANNED] Runtime network guard: skip photo uploads on cellular in background task

- **Progressive Photo Upload**
  - 3 quality tiers (thumbnail 50KB, preview 200KB, full 2-5MB) from single photo
  - WiFi-aware upload constraints (prevents cellular data overages)
  - Max 2 concurrent uploads (prevents overwhelming device/network)
  - Persistent upload tasks survive force-quit (WatermelonDB sync_queue)

- **Sync Feedback UI**
  - Plain English error messages (no technical jargon for construction site medics)
  - Critical RIDDOR alerts after 3+ retry attempts (~3.5 min sustained failure)
  - Aggregate photo progress (shows "Uploading 1 photo" not "3 items")
  - Combined badge count (data + photos) in sync status indicator

- **Conflict Resolution** (from Plan 03-03 - inferred from commits)
  - Last-write-wins strategy for concurrent edits
  - [PLANNED] Client-generated UUID idempotency keys prevent duplicate records on retry
  - [PLANNED] Idempotency key persisted in sync_queue, included as client_id in Supabase create payload
  - [PLANNED] PostgreSQL 23505 duplicate detection handled gracefully as success
  - RIDDOR fast retry (priority 0) bypasses batch intervals
  - Photo filtering in sync queue (separates photo uploads from data sync)

---

## Phase 4: Web Dashboard
**Status**: Not started
**Goal**: Site manager reporting interface with compliance scoring

### Features:
- **Compliance Dashboard**
  - Traffic-light compliance score (green/yellow/red)
  - Based on: Daily checks, overdue follow-ups, expired certs, RIDDOR deadlines
  - Real-time metrics (60-second polling)
  - Filterable views by date range, severity, worker

- **Treatment Log View**
  - Full detail view with photos
  - Filter by: Date range, severity, injury type, worker, outcome
  - Export as CSV or PDF
  - Click-through to worker profile

- **Near-Miss Log**
  - Category and severity filters
  - Date range filtering
  - Photo evidence display
  - Corrective action tracking

- **Worker Registry**
  - Search by: Company, role, certification status
  - Treatment history per worker
  - Certification expiry alerts
  - Export as CSV

- **Responsive Design**
  - Works on desktop and tablets
  - Mobile-friendly for on-site managers

---

## Phase 4.5: Marketing Website & Booking Portal (NEW)
**Status**: Not started (4 plans)
**Goal**: Public marketing site and client self-service booking system

### Features:
- **Marketing Website (Next.js SSG)**
  - Homepage with hero section
    - Headline: "Automatic Compliance + Professional Medic Staffing"
    - Value proposition: RIDDOR auto-flagging, offline mobile app, weekly PDFs
  - Features page
    - Treatment logging, near-miss capture, daily safety checks
    - Compliance dashboard, PDF reports, certification tracking
  - Pricing transparency
    - Base rate + urgency premium calculator
    - Travel surcharge calculator (£1.50-2/mile after 30 miles)
    - No hidden fees
  - Trust signals
    - RIDDOR compliant, UK GDPR certified, HSE audit-ready
    - Client testimonials (when available)
    - Case studies from construction sites
  - CTA: "Book a Medic" button → Booking Portal
  - Performance: <2 seconds load time (Lighthouse score >90)

- **Booking Portal (Next.js SSR)**
  - **Client Registration**
    - Company details (name, address, VAT number)
    - Primary contact information
    - Payment method setup (Stripe)
    - Accept terms and conditions

  - **Booking Flow**
    - Calendar-based date/time picker
    - Shift duration selector (8-hour minimum enforced)
    - Site location with UK postcode validation
    - **what3words Integration (NEW)**: Precise location addressing with 3m x 3m accuracy
      - Customers can enter what3words address (e.g., ///filled.count.soap) as alternative to traditional address
      - Auto-converts coordinates to what3words when Google Places address is selected
      - Autocomplete suggestions for what3words input (UK-restricted)
      - Live validation and map link preview
      - Included in booking confirmation and medic assignment emails
      - Makes it easier for paramedics to find exact site entrance/location
      - Benefits: Easy to communicate verbally, impossible to mistype, extremely precise (vs vague "site entrance")
    - Special requirements (confined space, trauma specialist, etc.)
    - Recurring booking option (same medic, weekly schedule)

  - **Auto-Matching**
    - Real-time availability checking (Google/Outlook calendar integration)
    - Ranked candidate presentation
      - Distance from site (Google Maps drive time)
      - Availability confirmation
      - Qualifications match
      - Star rating (>4.5 preferred)
    - Transparent ranking criteria (client sees why medic recommended)

  - **Pricing Breakdown**
    - Base rate (£30-50/hour medic rate)
    - Urgency premium (<24 hours: +75%, 1-3 days: +50%, 4-6 days: +20%, 7+ days: 0%)
    - Travel surcharge (£1.50-2/mile beyond 30 miles)
    - Out-of-territory cost (if applicable: travel bonus or room/board)
    - VAT (20%)
    - Total cost with payment terms (prepay vs Net 30)

  - **Payment Processing**
    - New clients: Prepay via card (Stripe Payment Intent, 3D Secure)
    - Established clients: Net 30 invoice (send Friday, due 30 days later)
    - Secure payment form (PCI-compliant via Stripe)

  - **Booking Confirmation**
    - Email confirmation to client
    - Calendar invite (.ics file) with shift details
    - Medic notification email
    - Booking reference number

  - **Performance**: <5 minute booking completion time

- **Hybrid Approval System**
  - Auto-confirm: Standard shifts (7+ days notice, medic available, <30 min travel, no special requirements)
  - Manual review: Emergency (<24 hours), out-of-territory, confined space, trauma specialist, recurring bookings
  - Admin notification for bookings requiring approval

---

## Phase 4.6: Customer Onboarding & Contract Management (NEW)
**Status**: Not started (5 plans)
**Goal**: Automated service agreement generation, document portal for phone sales, flexible payment terms, and digital signatures

### Features:

- **Service Agreement Template Engine**
  - **Auto-Fill Business Information**
    - Client details: Company name, contact, billing address, VAT number
    - Site details: Location, postcode, site manager contact
    - Booking details: Date, time, shift duration, medic assigned
    - Pricing breakdown: Base rate, hours, urgency premium, travel, VAT, total
    - Payment terms: Auto-populated based on client type and admin selection

  - **Payment Terms Configuration Per Booking**
    - **Full Prepay**: 100% payment due on contract signature
    - **Split Payment (50/50)**: 50% on signature, 50% on completion
    - **Split with Net 30**: 50% on signature, 50% Net 30 after completion
    - **Full Net 30**: 100% due 30 days after invoice (established clients only)
    - **Custom Terms**: Admin can define custom payment schedules
      - Example: "£500 on signing, £300 after 7 days, £200 on completion"

  - **Agreement Customization**
    - Standard terms and conditions
    - Liability clauses (professional indemnity limits)
    - Cancellation policy (7 days = full refund, <72 hours = no refund)
    - Service scope definition (medic qualifications, duties, exclusions)
    - RIDDOR compliance responsibilities
    - GDPR worker data handling consent
    - Insurance coverage details (£5M professional indemnity, £10M public liability)
    - Force majeure provisions

  - **Template Versioning**
    - Version control for agreement templates
    - Track template changes over time
    - Legal approval workflow for template updates
    - Grandfathering: Old bookings use old template version
    - Audit trail: Which version used for which client

- **Document Portal (Phone Sales)**
  - **Quick Send During Phone Call**
    - Admin enters client email in portal
    - Click "Send Agreement" → instant email delivery
    - Shareable link generated (no login required for client)
    - Link expires after 30 days (security)

  - **Client Document Viewing**
    - Browser-based document viewer (no download required)
    - Mobile-responsive (works on phone, tablet, desktop)
    - High-resolution rendering
    - Zoom/pan capabilities
    - Page navigation

  - **Document Tracking**
    - Status indicators:
      - **Draft**: Agreement created but not sent
      - **Sent**: Email delivered to client
      - **Viewed**: Client opened document link
      - **Signed**: Client completed digital signature
      - **Completed**: Agreement fully executed (both parties signed)
      - **Expired**: Link expired before signature (re-send required)
    - Timestamp tracking for each status change
    - Email open tracking (when client first views)
    - IP address logging for signature (audit trail)
    - Device info capture (mobile vs desktop signature)

  - **Admin Dashboard for Sent Documents**
    - List view: All sent agreements with status filters
    - Search by: Client name, booking ID, date sent, status
    - Quick actions: Resend, Cancel, Download signed PDF
    - Reminder emails: Auto-send if not signed after 3 days
    - Expiry alerts: Warning at 7 days before link expiry

- **Digital Signature Capture**
  - **Native Signing (No Third-Party)**
    - Built-in signature pad (canvas-based)
    - Touch/stylus support for tablets and phones
    - Mouse support for desktop
    - Signature preview before confirming
    - Option to clear and re-sign
    - Typed name alternative (checkbox: "I agree to use typed name as signature")

  - **Signature Validation**
    - Required fields before signing:
      - Full name (match company contact name)
      - Job title
      - Date (auto-filled, can be manually adjusted)
      - Checkbox: "I have authority to bind [Company Name] to this agreement"
    - Email verification: Send 6-digit code to email, enter before signing
    - IP address capture (logged for audit)
    - Device fingerprint (browser, OS, screen resolution)

  - **Signed Document Storage**
    - PDF generation with signature overlay
    - Stored in Supabase Storage (UK region)
    - Signed URL for secure access (7-day expiry, can renew)
    - Watermark: "SIGNED - [Date] - [Client Name]"
    - Tamper detection: PDF hash verification

  - **Audit Trail**
    - JSON log stored alongside PDF:
      - Who signed (name, email, job title)
      - When signed (ISO 8601 timestamp with timezone)
      - Where signed (IP address, geolocation)
      - How signed (signature pad vs typed name)
      - Device used (browser, OS, screen size)
      - Agreement version number
      - Payment terms selected
    - Immutable after signing (blockchain-ready structure)
    - Exportable for legal discovery

  - **Dual Signature Support (Future Enhancement)**
    - Client signs first
    - Admin/medic signs second (company representative)
    - Agreement only valid after both signatures
    - Sequential signing workflow

- **Payment Schedule Enforcement**
  - **Upfront Payment Processing**
    - IF payment terms = "Full Prepay" OR "50% Upfront":
      - Generate Stripe Payment Intent on signature
      - Charge card immediately after signature
      - Booking status = "Pending Payment"
      - Booking auto-confirms on payment success
    - Payment failure handling:
      - Email notification to client with retry link
      - Booking status = "Payment Failed"
      - Admin alert for manual follow-up
      - Automatic cancellation after 48 hours if unpaid

  - **Completion Payment Trigger**
    - Booking status changes to "Completed" (medic logs shift end)
    - IF payment terms include completion payment:
      - **Option A (Immediate)**: Charge card for remaining 50%
      - **Option B (Net 30)**: Generate invoice, send email, due in 30 days
    - Completion payment tracking in dashboard
    - Late payment reminders (7, 14, 21 days)

  - **Custom Payment Schedule Tracking**
    - For custom terms (e.g., "3 installments over 6 weeks"):
      - Payment milestones table (payment_schedules)
      - Scheduled charges (Stripe Scheduled Payments)
      - Email reminders before each charge
      - Failed payment retry logic (3 attempts over 1 week)
      - Dashboard shows upcoming payment dates

  - **Cancellation & Refund Logic**
    - IF client cancels after signing but before shift:
      - 7+ days before: Full refund minus processing fee (2%)
      - 3-6 days before: 50% refund (cancellation penalty)
      - <72 hours: No refund (medic already reserved)
    - Refund processing via Stripe Refunds API
    - Email notification of refund amount and reason
    - Booking status updated to "Cancelled - Refunded"

- **Booking-Contract Linkage**
  - **Agreement Required for Booking Confirmation**
    - Setting: "Require signed agreement" (toggle per client or globally)
    - IF enabled: Booking status = "Pending Agreement"
    - Client cannot change booking details after agreement sent
    - Agreement lock prevents price changes after signature

  - **Agreement as Source of Truth**
    - Payment terms in agreement override booking defaults
    - Pricing in agreement must match booking (validation check)
    - Cancellation policy from agreement enforced
    - Service scope defines medic qualifications required

  - **Booking Modification After Signature**
    - IF client requests change (date, time, duration):
      - Requires agreement amendment (new signature)
      - Original agreement marked "Superseded"
      - New agreement references original (version history)
      - Email notification: "Your booking agreement has been updated"

- **Admin Document Management**
  - **Template Library**
    - Standard service agreement template
    - Emergency booking template (expedited terms)
    - Recurring booking template (weekly/monthly)
    - Enterprise client template (custom SLA)
    - Template preview before sending

  - **Bulk Document Operations**
    - Batch send agreements (select multiple pending bookings)
    - Bulk download signed agreements (ZIP archive)
    - Bulk reminder emails (all unsigned agreements >3 days old)

  - **Compliance & Legal Review**
    - Template approval workflow (legal team review)
    - Regulatory compliance checklist (GDPR, Consumer Rights Act)
    - Professional indemnity insurance verification
    - Annual legal review reminder (template updates)

  - **Reporting & Analytics**
    - Conversion rate: Sent → Signed (target: >80%)
    - Average time to signature (target: <24 hours)
    - Expired agreements (need follow-up)
    - Most common cancellation reasons
    - Payment failure rate by payment terms

### Performance Targets:
| Metric | Target |
|--------|--------|
| Agreement generation | <5 seconds |
| Email delivery | <30 seconds |
| Document load time | <2 seconds |
| Signature submission | <3 seconds |
| Payment processing | <10 seconds |
| Conversion rate (sent → signed) | >80% |
| Average time to signature | <24 hours |

### Technical Implementation:
- **Frontend**: React + shadcn/ui signature pad component
- **Backend**: Supabase Edge Function for PDF generation
- **PDF Library**: jsPDF or PDFKit for agreement rendering
- **Signature Rendering**: HTML5 Canvas → PNG → PDF overlay
- **Email**: Transactional email via Supabase (SendGrid backend)
- **Storage**: Supabase Storage (UK region, signed URLs)
- **Payments**: Stripe Payment Intents API with metadata linking to agreement
- **Audit Logging**: PostgreSQL JSONB column for signature event log

### Integration Points:
- **Booking System (Phase 4.5)**: Agreement required before booking confirmation
- **Payment Processing (Phase 6.5)**: Payment schedule enforcement tied to agreement terms
- **Admin Dashboard (Phase 5.5)**: Document management tab for tracking sent agreements
- **Client Dashboard (Future)**: Self-service agreement viewing and re-download

### Compliance Considerations:
- **Electronic Signatures Act 2000 (UK)**: Digital signatures legally binding
- **Consumer Rights Act 2015**: 14-day cooling-off period for online contracts
- **Late Payment of Commercial Debts Act 1998**: Statutory late fees for Net 30 invoices
- **GDPR**: Worker health data consent clause in agreement
- **Professional Indemnity Insurance**: Coverage limits disclosed in agreement
- **RIDDOR Responsibilities**: Client's obligations for incident reporting clearly stated

---

## Phase 5.5b: Admin Dashboard with Sidebar Navigation (NEW)
**Status**: ✅ **COMPLETE** - Professional admin panel with persistent left sidebar navigation
**Goal**: Professional admin interface with easy tab-based navigation and comprehensive dashboard overview

### Features:

- **Persistent Left Sidebar Navigation** (`web/app/admin/layout.tsx`)
  - **Professional sidebar layout** that persists across all admin pages
  - Width: 256px (fixed, non-collapsible for clarity)
  - Dark theme (gray-800) matching command center

  - **Sidebar Header**
    - SiteMedic logo with "SM" icon (blue-600 background)
    - Admin Panel subtitle
    - Links back to main site homepage

  - **Navigation Menu**
    - 7 navigation items with icon + label
    - Active state highlighting (blue-600 background)
    - Vertical indicator bar for active item (left edge)
    - Badge notifications (red/yellow) for issues and pending items
    - Smooth hover transitions (gray-700 background)

    **Navigation Items:**
    1. 📊 **Dashboard** - Main overview (default view)
    2. 🗺️ **Command Center** - Live medic tracking (badge: 2 issues)
    3. 📅 **Bookings** - Manage schedules (badge: 3 pending)
    4. 👨‍⚕️ **Medics** - Profiles & certifications
    5. 🏢 **Customers** - Account management
    6. 📈 **Analytics** - Reports & insights
    7. ⚙️ **Settings** - Configuration

  - **User Profile Section** (bottom of sidebar)
    - Admin avatar (initials: "SA")
    - Email: admin@sitemedic.co.uk
    - Gray-700 background for visual separation

  - **Active Route Detection**
    - usePathname hook to highlight current section
    - Exact match for `/admin`, prefix match for subsections
    - Visual indicator (blue background + white bar)

- **Dashboard Overview Page** (`web/app/admin/page.tsx`)
  - **Header Section**
    - Page title: "Dashboard Overview"
    - Welcome message with dynamic context

  - **Stats Grid** (6 metrics in responsive grid)
    - **Active Medics** (👨‍⚕️) - Count + trend (e.g., "+2 from yesterday")
    - **Today's Bookings** (📅) - Count + completed status
    - **Pending Bookings** (⏳) - Highlighted when >0 (yellow ring)
    - **Active Issues** (⚠️) - Highlighted when >0 (yellow ring)
    - **Revenue MTD** (💰) - Month-to-date total in GBP
      - **Real-time GBP to USD conversion on hover** 💱 **NEW**
        - Hover over revenue/payout amounts to see USD equivalent
        - Uses live exchange rates (cached hourly via exchangerate-api.com)
        - Tooltip shows formatted USD amount (e.g., "≈ $10,732")
        - All amounts rounded to whole dollars (no .00 decimals)
        - Graceful fallback to ~$1.27 approximate rate if API unavailable
        - Helps international stakeholders understand financial metrics
    - **Weekly Payouts** (💳) - Last payout amount (with USD conversion on hover)
    - Color-coded gradient icons (blue, green, yellow, red, purple, cyan)
    - Responsive: 1 col mobile → 2 cols tablet → 3 cols desktop → 6 cols wide

  - **Recent Activity Feed** (2/3 width on desktop)
    - Live feed of recent events with icons
    - Activity types: Booking, Issue, Medic, Payment
    - **Payment activities show currency with USD conversion** 💱 **NEW**
      - Payment amounts (e.g., weekly payouts) display with interactive CurrencyWithTooltip
      - Hover over payment amounts to see USD equivalent (matches stat card behavior)
      - Uses same real-time exchange rate system as dashboard metrics
      - Example: "Weekly payout processed - £3,200" shows "≈ $4,064.00 USD" on hover
    - Status indicators (✓ success, ! warning, ✗ error)
    - Color-coded status (green, yellow, red)
    - Timestamps (relative: "5 minutes ago")
    - Hover effect (gray-700/50 background)
    - Mock data shows 5 recent activities

  - **Quick Actions Panel** (1/3 width on desktop)
    - 5 action buttons with gradient colors
    - **New Booking** (blue) - Create booking
    - **Add Medic** (green) - Onboard medic
    - **Command Center** (purple) - View live tracking
    - **View Reports** (orange) - Analytics
    - **Send Notification** (cyan) - Mass messaging
    - Full-width buttons with icons and arrows

  - **Alerts Panel** (below Quick Actions)
    - Conditional alerts based on stats
    - Yellow warning for pending bookings
    - Red error for active issues
    - "No alerts" message when clean
    - Border-highlighted boxes with icons

  - **Visual Design**
    - Professional dark theme (gray-900 background, gray-800 cards)
    - Rounded corners (rounded-lg) for modern feel
    - Border styling (gray-700) for card separation
    - Gradient backgrounds for stat icons
    - Responsive grid layout (lg:grid-cols-3 for main sections)
    - Proper spacing and padding throughout

  - **Technical Implementation**
    - Next.js 15 SSR for both layout and page
    - Client-side components ('use client') for interactivity
    - usePathname for route detection
    - TypeScript interfaces for type safety
    - Tailwind CSS for styling (with fadeIn animation for tooltips)
    - Mock data (to be replaced with Supabase queries)
    - Modular component structure (StatCard, ActivityItem, QuickActionButton, AlertItem)
    - **Currency conversion system** 💱 **AUTOMATED**:
      - `useExchangeRate` hook - Fetches and caches GBP→USD rate (1-hour cache)
      - `CurrencyWithTooltip` component - Reusable tooltip with animated display
      - `AdminCurrency` component - Admin-specific wrapper with presets
      - localStorage caching to minimize API calls
      - **Currency Formatting**: All amounts display as whole dollars/pounds (rounded, no decimals)
        - Example: £350 (not £350.00), $444 (not $444.50)
        - Clean, easy-to-read amounts throughout the application
      - **Pattern enforcement**:
        - README.md in /admin with mandatory guidelines
        - TypeScript types (CurrencyAmount) to guide developers
        - VS Code snippets for quick correct usage
        - Inline comments in existing code showing examples
        - **ALL future admin pages automatically get this pattern**

### User Experience Improvements:
- **Easy Navigation**: Sidebar always visible, one-click access to any admin section
- **Context Awareness**: Active route highlighting shows current location
- **At-a-Glance Monitoring**: Stats grid shows key metrics without clicking
- **Quick Actions**: Common tasks accessible from any admin page
- **Visual Hierarchy**: Color-coding and icons make scanning easier
- **Badge Notifications**: Red/yellow badges draw attention to items needing action

### Integration Points:
- **Command Center** (Phase 5.6) - Live medic tracking (✅ Complete)
- **Bookings Management** (Phase 5.5) - Booking admin (⏳ To be built)
- **Medic Management** (Phase 5.5) - Medic roster (⏳ To be built)
- **Analytics Dashboard** (To be planned) - Reports and insights (⏳ To be built)
- **Customer Management** (To be planned) - Client accounts (⏳ To be built)
- **Settings** (To be planned) - Platform configuration (⏳ To be built)

### Performance:
- **Page load time**: <1 second (minimal data on initial load)
- **Layout hydration**: Instant (sidebar renders immediately)
- **Stats refresh**: Real-time when Supabase queries implemented
- **Responsive design**: Mobile, tablet, desktop optimized

### Files Created/Modified:
- `web/app/admin/layout.tsx` - ✅ New: Sidebar navigation wrapper
- `web/app/admin/page.tsx` - ✅ Updated: Dashboard overview with stats + activity + currency tooltips
- `web/app/admin/command-center/layout.tsx` - Existing: Full-screen layout for map view
- `web/hooks/useExchangeRate.ts` - ✅ New: Exchange rate hook with caching
- `web/components/CurrencyWithTooltip.tsx` - ✅ New: Currency tooltip component
- `web/app/admin/components/AdminCurrency.tsx` - ✅ New: Admin-specific currency wrapper
- `web/app/admin/types.ts` - ✅ New: TypeScript types for admin patterns
- `web/app/admin/README.md` - ✅ New: Developer guidelines for admin pages
- `.vscode/admin-snippets.code-snippets` - ✅ New: VS Code snippets for quick usage
- `web/tailwind.config.ts` - ✅ Updated: Added fadeIn animation for tooltips

---

## Phase 5.6: Live Medic Tracking Command Center (NEW)
**Status**: ✅ **MOSTLY COMPLETE** - Database schema, mobile service, backend API, real-time WebSocket, admin UI, geofencing, and alerts system built (Privacy controls and testing pending)
**Goal**: Real-time location monitoring for medics during shifts with full audit trail and accountability

### Features:

- **Database Schema (COMPLETE)**
  - `medic_location_pings` table:
    - GPS coordinates captured every 30 seconds (fixed interval)
    - Stores: latitude, longitude, accuracy, altitude, heading, speed
    - Device context: battery level, connection type, GPS provider
    - Timestamps: recorded_at (device) vs received_at (server) for latency monitoring
    - Offline queue flag (TRUE if sent from offline queue after sync)
    - **30-day retention** (auto-delete via scheduled job for GDPR compliance)
    - Indexes optimized for today's active pings and medic timeline queries

  - `medic_shift_events` table:
    - Significant status changes during shifts
    - Event types:
      - **Normal events**: `shift_started`, `arrived_on_site`, `left_site`, `break_started`, `break_ended`, `shift_ended`
      - **Edge cases**: `battery_critical`, `battery_died`, `connection_lost`, `connection_restored`, `gps_unavailable`, `app_killed`, `app_restored`
      - **Alerts**: `inactivity_detected`, `late_arrival`, `early_departure`
    - Source tracking (how event was triggered):
      - `geofence_auto` - Automatic geofence detection
      - `manual_button` - Medic pressed button in app
      - `system_detected` - Inferred from data (e.g., no pings = battery died)
      - `admin_override` - Admin manually created event
    - Location data (optional - may not have for manual events)
    - Geofence context (radius, distance from site center)
    - Device info stored as JSONB (battery, connection, app version)
    - **Permanent retention** (needed for billing records and compliance)

  - `medic_location_audit` table:
    - **Comprehensive audit trail** for all location tracking activities
    - Action types logged:
      - Location operations: `location_ping_received`, `shift_event_created`
      - Geofence events: `geofence_entry_detected`, `geofence_exit_detected`
      - Manual actions: `manual_status_change`
      - Edge cases: `edge_case_detected`, `alert_triggered`, `alert_resolved`
      - Admin access: `admin_viewed_location`, `admin_contacted_medic`
      - GDPR compliance: `data_exported`, `consent_given`, `consent_withdrawn`, `data_retention_cleanup`
    - Actor tracking: medic, admin, or system
    - Full context stored as JSONB metadata
    - IP address and user agent logged (security auditing)
    - **6-year retention** (UK tax law requirement)

  - `geofences` table:
    - Virtual boundaries around job sites
    - Center point (lat/lng) + radius (20m-1km, default 75m)
    - Configurable consecutive ping requirement (default 3 to prevent GPS jitter)
    - Can be disabled per-site if causing false positives
    - Notes field for admin explanations (e.g., "Large site - expanded to 200m")

  - `medic_location_consent` table:
    - GDPR-compliant consent tracking
    - Consent version tracking (allows updating terms over time)
    - Full text of consent form presented to medic
    - IP address and timestamp (proof of consent)
    - Withdrawal tracking (withdrawn_at timestamp)
    - One active consent per medic constraint

  - **Database functions**:
    - `calculate_distance_meters(lat1, lon1, lat2, lon2)` - Haversine formula for GPS distance
    - `is_inside_geofence(lat, lng, geofence_id)` - Check if coordinates inside boundary

  - **Automatic audit logging**:
    - Database trigger: Auto-creates audit log entry when shift event created
    - No extra code needed - fully automated

- **Mobile Location Tracking Service (COMPLETE)**
  - Built on React Native + Expo (iOS first)
  - **Background tracking**: Runs even when app closed (TaskManager + expo-location)
  - **Fixed 30-second ping interval** (no adaptive frequency based on battery - user requested)
  - Foreground notification: "SiteMedic Tracking Active"

  - **Automatic geofencing**:
    - Detects arrival/departure from job site automatically
    - 75-meter default radius (configurable per site)
    - **Requires 3 consecutive pings** inside/outside boundary to trigger event
    - Prevents GPS jitter false positives (GPS can jump 10-50m even when stationary)
    - Haversine distance calculation (accounts for Earth's curvature)

  - **Offline resilience**:
    - Detects offline state via NetInfo
    - Stores location pings in local AsyncStorage queue
    - Stores status events in queue
    - Auto-syncs when connection restored
    - Batch insert for performance (all queued pings in one transaction)
    - Creates `connection_restored` event with sync count

  - **Manual controls**:
    - "Mark Arrived" button - Medic can manually mark arrival if geofence fails
    - "Mark Departure" button - Medic can manually mark departure
    - Source logged as `manual_button` for audit trail
    - Triggered by user ID tracked

  - **Edge case handling**:
    - **Phone battery dies**: Last location stored, `battery_died` event created
    - **Connection lost >10 mins**: `connection_lost` event created
    - **GPS unavailable**: Fallback to cell tower location (lower accuracy), marked as "low" accuracy
    - **App killed by user**: Tracking resumes when app reopened if shift still active, creates `app_restored` event
    - **Battery warning**: Simple notification at 20% (non-intrusive, no frequency changes)

  - **Data captured per ping**:
    - GPS coordinates (8-decimal precision for ±1cm accuracy)
    - Accuracy radius in meters (<10m = high, 10-50m = medium, >50m = low)
    - Altitude above sea level
    - Compass heading (0-360 degrees, direction of travel)
    - Speed in meters per second
    - Battery level (0-100%)
    - Connection type (4G, 5G, WiFi, offline)
    - GPS provider (expo-location)
    - Device timestamp (when GPS reading captured)
    - Server timestamp (when ping received - for latency monitoring)
    - Offline queue flag

  - **LocationTrackingService API**:
    ```typescript
    // Start tracking when shift begins
    await locationTrackingService.startTracking(booking, medicId);

    // Manual status changes
    await locationTrackingService.markArrived(userId);
    await locationTrackingService.markDeparture(userId);

    // Stop tracking when shift ends
    await locationTrackingService.stopTracking();

    // Get current status
    const status = locationTrackingService.getStatus();
    // Returns: { isTracking, queueSize, insideGeofence }
    ```

- **Mobile UI Components (COMPLETE)**
  - **LocationTrackingBanner**: Persistent banner shown during active shift
    - Status indicator:
      - 🟢 Green dot = On-site (inside geofence)
      - 🔵 Blue dot = Traveling (outside geofence)
      - 🟠 Orange badge = "X queued" (offline pings waiting to sync)
    - Booking info (site name, shift hours)
    - Manual control buttons ("Mark Arrived" / "Mark Departure")
    - Status text: "Location updates every 30 seconds"
    - Shows offline queue count if medic disconnected

  - **Required packages**:
    - expo-location (GPS tracking)
    - expo-task-manager (background tasks)
    - expo-battery (battery level monitoring)
    - @react-native-async-storage/async-storage (offline queue storage)
    - @react-native-community/netinfo (connection monitoring)
    - @supabase/supabase-js (backend API)

  - **Permissions required**:
    - iOS: NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription, UIBackgroundModes: location
    - Android: ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE

- **Admin Command Center Dashboard (COMPLETE)**
  - **URL**: `http://localhost:30500/admin/command-center`
  - **Real-time map interface**:
    - Interactive map using React-Leaflet (OpenStreetMap tiles - free, no API key)
    - Shows all currently active medics on shifts
    - Color-coded markers:
      - 🟢 Green = On-site at job
      - 🔵 Blue = Traveling to job
      - 🟡 Yellow = On break
      - 🔴 Red = Issue detected (battery low, late arrival, not moving, connection lost)
      - ⚪ Gray = Offline (no connection)
    - GPS accuracy circles around each marker (shows location accuracy radius)
    - Auto-zoom to fit all medics on screen
    - Click marker → Opens details sidebar
    - Marker popup with quick stats (battery, connection, last update time)

  - **Header controls**:
    - Live stats: "X active medics"
    - Filter toggle:
      - "Show All (X)" - All medics visible
      - "Issues Only (X)" - Only medics with problems

  - **Status legend** (bottom left):
    - Visual guide to marker colors
    - Easy reference for admins

  - **Details sidebar** (opens when medic clicked):
    - Medic name and current job site
    - Status badge with color coding
    - Device status panel:
      - Battery level (red warning if <20%)
      - Connection type (4G, 5G, WiFi)
      - GPS accuracy in meters
      - Last update time (minutes ago)
    - Contact buttons:
      - 📞 Call (click to dial)
      - 💬 SMS (quick messages)
    - Shift timeline (chronological events):
      - 08:30 - Shift Started (tracking activated)
      - 08:47 - Arrived On-Site (geofence auto-detect)
      - 12:03 - Break Started (manual button)
      - etc.

  - **Technical implementation**:
    - Next.js 15 SSR
    - Dynamic import for map (client-side only - Leaflet doesn't work with SSR)
    - Tailwind CSS styling (dark theme for command center feel)
    - Responsive design (works on tablets and desktop)
    - Currently shows **mock data** (3 test medics for UI demonstration)
    - **Zustand state management** (real-time store integration):
      - ✅ **Fixed infinite loop bug** (2026-02-15): Corrected selector pattern to avoid calling getter methods inside Zustand selectors
      - Issue: Calling `getActiveMedics()` inside selector created new array references on every render, causing infinite re-render loop
      - Solution: Select the `locations` Map directly and convert to array in component with proper memoization
      - Files fixed:
        - `app/admin/command-center/page.tsx` - Command center main page
        - `components/admin/AlertPanel.tsx` - Alerts panel
        - `hooks/useRealtimeMedicLocations.ts` - Reusable hook
      - Best practice: Always select primitive values or state directly from Zustand, never call getter methods inside selectors

### Performance Targets:

| Metric | Target | Status |
|--------|--------|--------|
| Location ping frequency | 30 seconds (fixed) | ✅ Implemented |
| Database write latency | <100ms per ping | ⏳ To be tested |
| Map update latency | <2 seconds | ✅ Real-time via Leaflet |
| Offline sync time | <10 seconds when reconnected | ✅ Batch insert |
| Geofence detection accuracy | >95% (with 3-ping requirement) | ⏳ To be tested |
| Battery warning threshold | 20% | ✅ Implemented |
| GPS accuracy | <10m for high accuracy | ⏳ Device-dependent |

### Privacy & Security:

- **Shift-based tracking only**: Location tracking ONLY active during paid shifts (NOT 24/7 surveillance)
- **Medic consent required**: Explicit consent collected during onboarding with full text stored
- **30-day data retention**: Location pings auto-deleted after 30 days (GDPR compliance)
- **6-year audit trail**: Audit logs kept for UK tax law compliance
- **Row-Level Security** (RLS policies to be implemented in Task #12):
  - Medics can INSERT/SELECT only their own location data
  - Admins can SELECT all location data
  - NO UPDATE/DELETE permissions (immutable audit trail)
- **Admin access logging**: Every time admin views medic location, logged in audit table
- **GDPR rights supported**:
  - Right to access (medic can download their location history)
  - Right to view audit trail (who viewed their location)
  - Right to withdraw consent (stops tracking)

### Edge Cases Handled:

1. **Phone battery dies**:
   - Last known location stored with timestamp
   - `battery_died` event created by system inference (no pings for 10+ minutes)
   - When phone restarts → `app_restored` event + resume tracking

2. **Connection lost**:
   - Pings queued in local AsyncStorage
   - `connection_lost` event created after 10 minutes offline
   - Auto-sync when reconnected
   - `connection_restored` event with sync count

3. **GPS unavailable**:
   - Fallback to cell tower location (less accurate but better than nothing)
   - Mark accuracy as "low"
   - Show warning to medic: "GPS unavailable - using approximate location"

4. **App killed by user**:
   - Background tracking continues (iOS/Android background location)
   - If shift still active when app reopened → Resume tracking
   - `app_restored` event created

5. **GPS jitter** (location jumps around even when stationary):
   - Require 3 consecutive pings inside/outside geofence before triggering arrival/departure
   - Prevents false positives from GPS inaccuracy

6. **Multiple shifts same day**:
   - Tracking stops between shifts (shift-based, not 24/7)
   - Each shift gets its own set of events

7. **Large construction sites** (>100m wide):
   - Geofence radius configurable up to 1km
   - Notes field explains why radius expanded

8. **Underground work** (no GPS signal):
   - Rely on manual "Arrived" / "Departed" buttons
   - Source logged as `manual_button` instead of `geofence_auto`

### Integration Points:

- **Mobile App (React Native/Expo)**: Captures GPS pings, handles offline queue, detects geofences
- **Backend API (Supabase Edge Functions)**: Receives pings, stores in database, validates data ⏳ **Task #3 - Not started**
- **WebSocket (Supabase Realtime)**: Pushes live updates to admin dashboard ⏳ **Task #4 - Not started**
- **Admin Dashboard (Next.js web app)**: Displays live map, details sidebar, timeline, alerts

### Pending Work:

**Backend (Task #3):**
- Create Supabase Edge Functions for `/api/medic/location/ping` and `/api/medic/location/event`
- Implement batch processing for high-frequency pings
- Rate limiting to prevent abuse
- UK coordinate validation

**Real-time Updates (Task #4):**
- Supabase Realtime subscription to `medic_location_pings` and `medic_shift_events`
- Filter to only send updates for active shifts (reduce bandwidth)
- Client-side state management with Zustand
- Debounce rapid updates (max 1 map update per second per medic)

**Timeline View (Task #6):**
- Full chronological timeline with all events ✅ **COMPLETE**
- Export to PDF for billing disputes ⏳ Pending
- Highlight anomalies (e.g., "No location data for 45 minutes") ✅ **COMPLETE**

**Alerts System (Task #8):** ✅ **COMPLETE**
- Real-time alerts for edge cases and issues
- Browser notifications and sound alerts
- Alert panel with dismissal/resolution tracking
- Toast notifications for new alerts

**Offline Resilience (Task #9):** ✅ **COMPLETE**
- Enhanced queue management with size limits and cleanup
- Exponential backoff retry logic
- Partial sync recovery (track successful items)
- Server-side offline batch validation
- GPS spoofing detection

**Privacy Controls & Data Retention (Task #10):** ✅ **COMPLETE**
- Automated 30-day location ping cleanup (GDPR)
- GDPR Right to Access (data export)
- GDPR Right to be Forgotten (data deletion)
- Consent management
- Privacy dashboard for medics

**Analytics & Reporting (Task #11):** ✅ **COMPLETE**
- System-wide metrics dashboard
- Per-medic reliability scores
- Daily activity trends
- Geofence performance ratings
- Alert type analysis
- Comprehensive report generation

**Security & Access Controls (Task #12):** ✅ **COMPLETE**
- Row-Level Security (RLS) on all tables
- Role-based access control (RBAC)
- Immutable audit trails
- Admin access logging
- Rate limiting
- GDPR-compliant data access

---

### Real-Time Alerts System ✅ **COMPLETE**

**Purpose**: Proactive monitoring and notification system to detect issues during medic shifts before they become problems. Provides admins with real-time visibility into medic status and automatic flagging of concerning patterns.

#### Alert Types:

| Alert Type | Severity | Condition | Dedup Window | Action Required |
|------------|----------|-----------|--------------|-----------------|
| `battery_critical` | Critical | Battery <10% | 15 minutes | Immediate - device may die soon |
| `battery_low` | Medium | Battery 10-20% | 30 minutes | Monitor - may need charging |
| `late_arrival` | High | Not on-site 15 mins after shift start | 15 minutes | Contact medic immediately |
| `connection_lost` | High | No ping for >5 minutes | 10 minutes | Check if medic needs assistance |
| `not_moving_20min` | Medium | Stationary >20 minutes while on shift | 20 minutes | Verify medic is OK |
| `gps_accuracy_poor` | Low | GPS accuracy >100m consistently | 15 minutes | Location may be unreliable |
| `early_departure` | High | Left site before shift end | 15 minutes | Verify departure was authorized |
| `shift_overrun` | Medium | Shift exceeded duration by >2 hours | 15 minutes | Check if overtime authorized |

#### Database Schema:

**`medic_alerts` table:**
- `id` (UUID) - Alert identifier
- `medic_id` (UUID) - Which medic triggered alert
- `booking_id` (UUID) - Which job site
- `alert_type` (enum) - One of the types above
- `alert_severity` (enum) - low/medium/high/critical
- `alert_title` (text) - Human-readable title
- `alert_message` (text) - Detailed message
- `triggered_at` (timestamp) - When alert was created
- `metadata` (JSONB) - Context (battery level, distance, etc.)
- `is_dismissed` (boolean) - Admin acknowledged but not resolved
- `is_resolved` (boolean) - Issue completely fixed
- `dismissed_by` / `resolved_by` (UUID) - Who took action
- `dismissal_notes` / `resolution_notes` (text) - Explanation
- `auto_resolved` (boolean) - System automatically resolved (e.g., battery recovered)
- `related_event_id` / `related_ping_id` (UUID) - Link to source data

**Database functions:**
- `create_medic_alert()` - Creates alert with automatic deduplication
  - Prevents spam by suppressing duplicate alerts within time window
  - Returns existing alert ID if duplicate found
- `auto_resolve_alerts()` - Resolves alerts when conditions improve
  - Called by monitoring function when battery charges, connection restores, etc.
  - Marks alerts as auto-resolved with timestamp

**`active_medic_alerts` view:**
- Shows only unresolved, undismissed alerts
- Joined with medic and booking data for context
- Sorted by severity (critical first) then time
- Includes `seconds_since_triggered` for urgency display

#### Backend Monitoring:

**`alert-monitor` Edge Function:**
- **Frequency**: Every 1 minute (via cron job)
- **Monitors**: All active medics currently on shifts
- **Checks**:
  1. Connection status (no ping for >5 minutes)
  2. Battery levels (<20% warning, <10% critical)
  3. GPS accuracy (>100m consistently)
  4. Movement patterns (stationary >20 minutes)
  5. Late arrivals (not on-site after shift start)
- **Performance**: <3 seconds for 50 medics, <50MB memory
- **Auto-resolution**: Automatically resolves alerts when conditions improve
  - Battery charges back above 20% → auto-resolve battery alerts
  - Connection restored → auto-resolve connection_lost
  - GPS improves → auto-resolve gps_accuracy_poor
  - Medic starts moving → auto-resolve not_moving_20min
  - Medic arrives on-site → auto-resolve late_arrival

**Deduplication logic:**
- Each alert type has a time window (10-30 minutes)
- Won't create duplicate alert within window
- Prevents spam if issue persists
- Example: Battery at 8% won't trigger alert every minute

#### Admin UI Components:

**AlertPanel (Left Sidebar):**
- Toggle button in header: "🚨 Alerts (X)" with count badge
- Shows all active alerts in severity order (critical → high → medium → low)
- Each alert card displays:
  - Icon + Title (e.g., "🪫 John Doe - Critical Battery")
  - Message (e.g., "Battery at 8% - device may die soon")
  - Context: Site name, medic name, time since triggered
  - Metadata: Battery level, GPS accuracy, minutes late, etc.
  - Actions:
    - **Dismiss** - Acknowledge but don't resolve (with optional note)
    - **Resolve** - Mark as completely fixed (with optional note)
- Empty state: "✅ No active alerts"
- Controls:
  - 🔔 Sound toggle (alert beep when new alert arrives)
  - 🔔 Browser notifications toggle (desktop notifications)
- Connection indicator (green/red dot)
- Real-time updates via Supabase Realtime subscription

**AlertToast (Top Right):**
- Transient notifications for new alerts
- Auto-dismiss after 5 seconds (10 seconds for critical)
- Animated slide-in from right
- Color-coded by severity:
  - Critical: Red background, 🚨 icon
  - High: Orange background, ⚠️ icon
  - Medium: Yellow background, ⚡ icon
  - Low: Blue background, ℹ️ icon
- Manual dismiss with ✕ button
- Shows: Title, message, site name, medic name
- Does NOT require alert panel to be open (always visible)

**Browser Notifications:**
- Native desktop notifications (requires permission)
- Title: Alert title (e.g., "John Doe - Critical Battery")
- Body: Alert message
- Click to focus command center window
- Critical alerts require interaction (stay visible until clicked)
- Standard alerts auto-dismiss after system default time

**Sound Alerts:**
- Simple beep using Web Audio API
- Different frequencies for different severities:
  - Critical: 880 Hz (highest pitch)
  - High: 660 Hz
  - Medium: 550 Hz
  - Low: 440 Hz
- Quick 0.2-second beep (non-intrusive)
- Off by default (admin must enable)

#### Real-Time State Management:

**Zustand Store (`useMedicAlertsStore`):**
```typescript
interface MedicAlertsState {
  alerts: MedicAlert[];
  isConnected: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;

  // Actions
  fetchActiveAlerts(): Promise<void>;
  subscribe(): void;
  unsubscribe(): void;
  dismissAlert(id: string, notes?: string): Promise<void>;
  resolveAlert(id: string, notes?: string): Promise<void>;
  toggleSound(): void;
  requestBrowserNotifications(): Promise<void>;

  // Getters
  getActiveAlerts(): MedicAlert[];
  getCriticalAlertsCount(): number;
}
```

**Subscription:**
- Listens to `INSERT` and `UPDATE` on `medic_alerts` table
- On new alert:
  1. Fetch full alert data from `active_medic_alerts` view
  2. Add to local state
  3. Play sound if enabled
  4. Show browser notification if enabled
  5. Show toast notification
- On alert update (dismissed/resolved):
  - Remove from active alerts list
- Auto-cleanup on component unmount

#### Alert Management:

**Admin Actions:**
1. **Dismiss Alert:**
   - Click "Dismiss" button
   - Optional: Add note explaining why (e.g., "Contacted medic - on break")
   - Alert removed from active list but kept in database
   - Can view in alert history

2. **Resolve Alert:**
   - Click "Resolve" button
   - Optional: Add note explaining resolution (e.g., "Battery charged, tracking resumed")
   - Alert marked as resolved in database
   - No longer shown in active list

3. **Auto-Resolution:**
   - System automatically resolves when conditions improve
   - Marked with `auto_resolved: true`
   - Resolution note: "Automatically resolved - conditions improved"

**Alert History (SQL query):**
```sql
-- View all alerts from past 7 days
SELECT
  a.alert_type,
  a.alert_severity,
  a.alert_title,
  a.triggered_at,
  a.is_resolved,
  a.resolution_notes,
  m.name AS medic_name,
  b.site_name
FROM medic_alerts a
JOIN medics m ON a.medic_id = m.id
JOIN bookings b ON a.booking_id = b.id
WHERE a.triggered_at >= NOW() - INTERVAL '7 days'
ORDER BY a.triggered_at DESC;
```

#### Example Alert Scenarios:

**Scenario 1: Battery Critical**
- 10:23 AM - Battery drops to 9%
- Alert created: "🪫 John Doe - Critical Battery"
- Message: "Battery at 9% - device may die soon"
- Admin sees toast notification + alert panel entry
- Admin calls medic → "I'm near my van, will charge in 5 mins"
- Admin clicks "Dismiss" with note: "Called medic - charging soon"
- 10:30 AM - Battery at 25%
- System auto-resolves battery_critical and battery_low alerts

**Scenario 2: Late Arrival**
- Shift starts 8:00 AM
- 8:15 AM - No arrival event yet
- Alert created: "⏰ Sarah Smith - Late Arrival"
- Message: "Shift started 15 minutes ago - medic not yet on-site"
- Admin sees alert, checks map → Medic still 2 miles away
- Admin calls medic → "Traffic jam, ETA 10 mins"
- Admin clicks "Dismiss" with note: "Contacted - traffic delay"
- 8:27 AM - Medic arrives on-site
- System auto-resolves late_arrival alert

**Scenario 3: Not Moving**
- 2:30 PM - Medic stationary for 20 minutes
- Alert created: "🛑 Mike Johnson - Not Moving"
- Message: "Medic stationary for >20 minutes (moved only 12m)"
- Admin sees alert → Could be genuine issue or just paperwork/break
- Admin calls medic → "Yeah just doing daily safety log"
- Admin clicks "Resolve" with note: "Medic OK - doing paperwork"

#### Integration with Command Center:

- Alert count badge in header: "🚨 Alerts (3)"
- Click badge to toggle alert panel visibility
- Alert panel opens on left side (pushes map to right)
- Toast notifications always visible regardless of panel state
- Critical alerts play sound even if panel closed (if sound enabled)
- Real-time sync - alert appears immediately when triggered

#### Performance Characteristics:

- **Alert creation latency**: <500ms from condition detected to alert visible
- **Deduplication**: Prevents duplicate alerts (same type + medic + booking within time window)
- **Auto-resolution**: Reduces admin workload by automatically closing resolved alerts
- **Real-time updates**: Supabase Realtime ensures instant alert visibility
- **Low bandwidth**: Only sends alert records (small payloads, <1KB per alert)
- **Database queries**: Optimized indexes on alert_type, severity, is_dismissed, is_resolved

#### Privacy & Security:

- Alerts only visible to admins (RLS policies in Task #12)
- Alert dismissal/resolution tracked (who, when, why)
- Full audit trail of all alerts in `medic_alerts` table
- Alert metadata does NOT contain personally identifiable medical info
- 30-day alert retention (configurable - can extend for critical alerts)

---

### Enhanced Offline Resilience ✅ **COMPLETE**

**Purpose**: Robust offline queue management to ensure no location data is lost when medics lose connection, even for extended periods. Handles network failures gracefully with intelligent retry logic and automatic cleanup.

#### OfflineQueueManager (Mobile Service):

**Features:**
- **Queue size limits**: Max 500 pings (prevents unbounded memory growth)
  - When full, automatically discards oldest ping
  - Prevents app crashes from excessive memory usage
- **Age-based cleanup**: Auto-discards pings >24 hours old
  - Runs on initialization and periodically
  - Prevents stale data from accumulating
- **Exponential backoff retry**: Intelligent retry with increasing delays
  - Attempt 1: 5 seconds
  - Attempt 2: 10 seconds
  - Attempt 3: 20 seconds
  - Attempt 4: 40 seconds
  - Attempt 5: 60 seconds (max)
  - After 5 failed attempts, ping is discarded
- **Partial sync recovery**: Tracks which pings succeeded in batch
  - If batch partially fails, removes only successful pings
  - Failed pings remain in queue for retry
  - Prevents data loss from partial network failures
- **Queue corruption recovery**: Handles invalid JSON in AsyncStorage
  - If queue becomes corrupted, resets to empty state
  - Logs error for debugging
  - App continues functioning normally

**Queue Metadata Tracking:**
```typescript
interface QueueMetadata {
  totalEnqueued: number;     // Lifetime total pings queued
  totalSynced: number;        // Lifetime total successfully synced
  totalDiscarded: number;     // Lifetime total discarded (too old/queue full)
  lastSyncAttempt: string;    // Last sync attempt timestamp
  lastSuccessfulSync: string; // Last successful sync timestamp
  failedSyncCount: number;    // Consecutive failed sync attempts
}
```

**Health Monitoring:**
- **Healthy**: Queue <50% full, sync succeeding
- **Warning**: Queue >50% full OR 3+ failed sync attempts
- **Critical**: Queue >80% full OR 5+ failed sync attempts

**API:**
```typescript
// Initialize manager (load from storage, cleanup old pings)
await offlineQueueManager.initialize();

// Add ping to queue
await offlineQueueManager.enqueuePing(ping);

// Sync queue (with exponential backoff)
const result = await offlineQueueManager.syncQueue();
// Returns: { synced: 42, failed: 3 }

// Get queue status
const status = offlineQueueManager.getStatus();
// Returns: { queueSize, oldestPingAge, metadata, health }

// Manual cleanup
await offlineQueueManager.cleanupOldPings();

// Clear entire queue (emergency/testing)
await offlineQueueManager.clearQueue();
```

#### OfflineQueueStatus UI Component:

**Visual Indicator for Medics:**
- **Green badge**: Queue empty, all synced ✅
- **Yellow badge**: Pings queued, will sync when online 🔄
- **Orange badge**: Queue getting full (>50%) ⚠️
- **Red badge**: Queue critical (>80% full) or repeated sync failures 🚨

**Compact View (Default):**
- Shows icon + queue size (e.g., "🔄 12 queued")
- Tap to expand for details

**Expanded View:**
- Queue size: X pings
- Oldest ping: Xm ago
- Last successful sync: Xm ago
- Failed sync attempts: X (if any)
- Lifetime stats: Enqueued / Synced / Discarded
- **"🔄 Sync Now" button** for manual sync

**Auto-hide when healthy:**
- Component only visible if queue has items or health issues
- Doesn't clutter UI when everything working normally

#### Server-Side Offline Validation:

**Enhanced Validation for Offline Batches:**

When `is_offline_queued: true` on any ping, server runs additional validation:

**1. Batch-level validation:**
- **Age check**: Rejects pings >24 hours old
  - Prevents ancient data from appearing in reports
  - "Too old to be useful" threshold
- **Duplicate detection**: Identifies duplicate timestamps
  - Same `recorded_at` on multiple pings = suspicious
  - Could indicate app bug or tampering
- **Out-of-order detection**: Flags non-chronological pings
  - Ping from 2PM arrives before ping from 1PM = out of order
  - Logged but not rejected (could be valid)
- **Rate anomaly detection**: Detects impossible ping rates
  - >10 pings/minute = suspicious (normal: 2 per minute)
  - Could indicate time travel or app malfunction
- **Time span validation**: Checks batch covers reasonable time
  - 100 pings in 2 minutes = likely error
  - Expected: ~50 pings per 25 minutes (30s intervals)

**2. GPS spoofing detection:**
- **Perfect accuracy check**: GPS accuracy <1m is suspicious
  - Real GPS is never perfect (<5m is typical best)
- **Coordinate precision**: <4 decimal places is suspicious
  - Real GPS has 6-8 decimal precision
  - Example: 51.5074, -0.1278 (4 decimals) = suspicious
  - Example: 51.50740123, -0.12780456 (8 decimals) = normal
- **Impossible speed**: >200 km/h (55.5 m/s) = spoofing
  - Construction medics don't travel at highway speeds

**3. Enhanced audit logging:**
```sql
INSERT INTO medic_location_audit (
  action_type: 'offline_batch_received',  -- Special type for offline
  metadata: {
    batch_id: 'batch_1708012345_abc123',  -- Unique batch ID
    batch_stats: {
      totalPings: 42,
      oldestPing: '2026-02-15T10:00:00Z',
      newestPing: '2026-02-15T10:21:00Z',
      timeSpan: 1260,                      // 21 minutes
      duplicates: 0,
      outOfOrder: 2,
      tooOld: 0,
      anomalyDetected: false
    },
    batch_warnings: [
      'Ping 12: Out-of-order ping (recorded 30s before previous ping)',
      'Ping 24: Suspiciously perfect GPS accuracy (<1m)'
    ]
  }
)
```

#### Error Scenarios Handled:

**1. Extended offline period (medic in tunnel for 1 hour):**
- ~120 pings queued (2 per minute × 60 minutes)
- When reconnects: Syncs in 3 batches (50+50+20 pings)
- Total sync time: <10 seconds
- All pings successfully stored with `is_offline_queued: true`

**2. Network failure during sync:**
- Batch of 50 pings sent to server
- Network error after 25 pings inserted
- Result: 25 pings removed from queue, 25 remain
- Next sync attempt: Retries remaining 25 pings
- Exponential backoff prevents server spam

**3. App killed while offline:**
- Queue persisted in AsyncStorage
- When app reopens: Queue automatically loaded
- Sync resumes from where it left off
- No data loss

**4. Phone battery dies:**
- Queue persisted in AsyncStorage (not RAM)
- When phone restarts + app opens: Queue restored
- Sync happens automatically
- Data preserved across power cycles

**5. Queue growing too large (medic offline for 2 days):**
- After 24 hours: Old pings auto-discarded
- Queue size limited to 500 pings max
- Prevents memory exhaustion
- Most recent data prioritized

**6. Server rejection (validation failure):**
- Server rejects ping (e.g., coordinates outside UK)
- Ping removed from queue (won't retry invalid data)
- Other valid pings continue syncing
- Logged for debugging

**7. Corrupted queue (AsyncStorage corruption):**
- JSON parse error on queue load
- Queue reset to empty state
- App continues functioning
- New pings queued normally
- Old corrupted data discarded

#### Performance Characteristics:

| Metric | Value |
|--------|-------|
| Queue initialization | <100ms |
| Enqueue ping | <50ms (write to AsyncStorage) |
| Sync 50 pings | <2 seconds (batch API call) |
| Cleanup old pings | <200ms (filter + save) |
| Memory usage (500 pings) | ~500KB |
| AsyncStorage size (500 pings) | ~2MB |

#### Integration with LocationTrackingService:

**Automatic queue management:**
```typescript
// Service automatically uses OfflineQueueManager
await locationTrackingService.startTracking(booking, medicId);
// ↓
await offlineQueueManager.initialize();

// Every 30 seconds: New ping
// ↓
if (isOnline) {
  await sendPing(ping);        // Direct send
  await syncOfflineQueue();     // Also sync any queued
} else {
  await offlineQueueManager.enqueuePing(ping);  // Queue for later
}

// When connection restored
// ↓
await offlineQueueManager.syncQueue();  // Auto-sync with retry
```

**No manual intervention required** - all handled automatically by service.

#### Testing Offline Scenarios:

**1. Simulate offline mode:**
```typescript
// Turn off Wi-Fi + cellular on device
// Continue shift → pings queue locally
// Turn on Wi-Fi → pings sync automatically
```

**2. Test queue limits:**
```typescript
// Enqueue 600 pings (exceeds 500 max)
// Verify oldest 100 pings discarded
// Verify newest 500 pings kept
```

**3. Test corruption recovery:**
```typescript
// Manually corrupt AsyncStorage queue
await AsyncStorage.setItem('@sitemedic:location_queue', 'invalid JSON');
// Restart app
// Verify queue resets without crashing
```

**4. Test exponential backoff:**
```typescript
// Mock server to return errors
// Watch retry delays: 5s, 10s, 20s, 40s, 60s
// Verify pings discarded after 5 attempts
```

---

### Privacy Controls & Data Retention ✅ **COMPLETE**

**Purpose**: GDPR-compliant privacy controls giving medics full transparency and control over their location data. Automated data retention policies ensure compliance with both GDPR (30-day limit) and UK tax law (6-year audit trail).

#### Automated Data Retention:

**Scheduled Cleanup Job (Daily at 2 AM):**
```sql
-- Auto-delete location pings older than 30 days
SELECT cron.schedule(
  'location-pings-cleanup',
  '0 2 * * *',  -- Every day at 2 AM
  'SELECT cleanup_old_location_pings()'
);
```

**What Gets Deleted:**
- Location pings >30 days old (GDPR data minimization)
- Executes daily during off-peak hours
- Logs cleanup summary to audit table
- Returns: pings deleted, medics affected, timestamp

**What's Kept:**
- Shift events (permanent - needed for billing)
- Audit logs (6 years - UK tax law requirement)
- Consent records (permanent - proof of consent)
- Alerts (30 days - operational data)

**Audit Trail Anonymization (Annual on Jan 1):**
```sql
-- After 6 years, remove PII from audit logs
SELECT cron.schedule(
  'audit-logs-anonymization',
  '0 3 1 1 *',  -- Every Jan 1 at 3 AM
  'SELECT anonymize_old_audit_logs()'
);
```
- Removes: IP addresses, user agents
- Keeps: Action type, timestamp, description
- Maintains compliance while removing identifying info

#### GDPR Right to Access (Data Export):

**Edge Function:** `POST /functions/v1/gdpr-export-data`

**Returns comprehensive JSON export:**
```json
{
  "medic_id": "...",
  "export_date": "2026-02-15T10:30:00Z",
  "data_retention_notice": "Location pings retained for 30 days...",

  "location_pings": [
    {
      "recorded_at": "2026-02-15T09:30:00Z",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "accuracy_meters": 8.5,
      "battery_level": 75,
      "connection_type": "4G",
      "booking_id": "..."
    }
    // ... last 30 days
  ],

  "shift_events": [
    {
      "event_type": "arrived_on_site",
      "event_timestamp": "2026-02-15T09:00:00Z",
      "source": "geofence_auto",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "notes": "Automatic geofence entry detected",
      "booking_id": "..."
    }
    // ... all time
  ],

  "audit_trail": [
    {
      "action_type": "admin_viewed_location",
      "action_timestamp": "2026-02-15T08:00:00Z",
      "actor_type": "admin",
      "description": "Admin viewed location on command center",
      "ip_address": "203.0.113.42"
    }
    // ... all time (who accessed your data)
  ],

  "consent_records": [...],
  "alerts": [...]
}
```

**Features:**
- Structured, machine-readable JSON format
- Includes all personal data across all tables
- Audit trail shows who viewed your location
- Can be saved/shared (Share API on mobile)
- Logged in audit trail (proof of export)
- Medics can only export their own data

**Mobile App Usage:**
```typescript
const { data } = await supabase.functions.invoke('gdpr-export-data');
await Share.share({
  message: JSON.stringify(data, null, 2),
  title: 'SiteMedic Data Export'
});
```

#### GDPR Right to be Forgotten (Data Deletion):

**Edge Function:** `POST /functions/v1/gdpr-delete-data`

**⚠️ PERMANENT DELETION:**
- Deletes ALL location pings
- Deletes ALL shift events
- Deletes ALL alerts
- Withdraws location tracking consent
- Stops future data collection

**What's NOT deleted:**
- Audit trail (UK tax law - must keep 6 years)
- Consent withdrawal record (proof of withdrawal)

**Request requires explicit confirmation:**
```json
{
  "confirmation": true,  // MUST be true to proceed
  "reason": "Optional reason for deletion"
}
```

**Response summary:**
```json
{
  "success": true,
  "deleted_at": "2026-02-15T10:30:00Z",
  "summary": {
    "location_pings_deleted": 1542,
    "shift_events_deleted": 87,
    "alerts_deleted": 12
  },
  "important_notice": [
    "Your location tracking data has been permanently deleted.",
    "Audit logs are retained for 6 years per UK tax law.",
    "Your consent has been withdrawn - location tracking is now disabled.",
    "This action CANNOT be undone."
  ]
}
```

**Safety Features:**
- Requires `confirmation: true` in request (prevents accidental deletion)
- Mobile app shows detailed confirmation dialog
- Lists exactly what will be deleted before proceeding
- Creates final audit entry before deletion
- Medics can only delete their own data

#### Consent Management:

**medic_location_consent table:**
```sql
CREATE TABLE medic_location_consent (
  medic_id UUID PRIMARY KEY,
  consent_version TEXT,           -- Version of consent form
  consent_text TEXT,               -- Full text shown to medic
  consent_given_at TIMESTAMPTZ,   -- When consent was given
  ip_address TEXT,                 -- IP where consent given (proof)
  withdrawn_at TIMESTAMPTZ,        -- When consent was withdrawn
  withdrawal_reason TEXT           -- Why consent was withdrawn
);
```

**Consent workflow:**
1. Medic shown consent form during onboarding
2. Consent text stored in database (proof of what they agreed to)
3. IP address and timestamp captured (legal proof)
4. Location tracking only starts after consent given
5. Medic can withdraw consent anytime (stops tracking immediately)
6. Withdrawal doesn't delete data (separate action)

**Check consent status:**
```sql
SELECT has_location_tracking_consent('MEDIC_ID');
-- Returns: true/false
```

**Withdraw consent:**
```sql
UPDATE medic_location_consent
SET withdrawn_at = NOW(),
    withdrawal_reason = 'User requested via mobile app'
WHERE medic_id = 'MEDIC_ID' AND withdrawn_at IS NULL;
```

#### Privacy Dashboard (Mobile App):

**Features:**
- **Consent Status**: Active/Withdrawn/None badge with dates
- **Data Volumes**: Shows total pings, events, audit logs stored
- **Data Age**: Oldest and newest ping timestamps
- **Access Tracking**: How many times admin viewed your location
- **Export History**: How many times you exported your data
- **Actions**:
  - 📦 Export My Data (download JSON)
  - ⊗ Withdraw Consent (stop tracking)
  - 🗑️ Delete All My Data (permanent deletion)

**UI Design:**
- Clean, easy-to-understand interface
- Color-coded status badges (green=active, red=withdrawn)
- Stat cards showing data volumes
- Clear warnings before destructive actions
- GDPR rights explained in plain language
- Real-time data (loads from medic_privacy_dashboard view)

**Database View:**
```sql
CREATE VIEW medic_privacy_dashboard AS
SELECT
  m.id AS medic_id,
  m.name AS medic_name,
  c.consent_status,
  COUNT(mlp) AS total_pings_stored,
  COUNT(mse) AS total_events_stored,
  COUNT(mla) AS total_audit_logs,
  MIN(mlp.recorded_at) AS oldest_ping,
  MAX(mlp.recorded_at) AS newest_ping,
  COUNT(admin_views) AS times_viewed_by_admin,
  MAX(admin_views.action_timestamp) AS last_viewed_by_admin
FROM medics m
LEFT JOIN medic_location_consent c ON ...
LEFT JOIN medic_location_pings mlp ON ...
LEFT JOIN medic_shift_events mse ON ...
LEFT JOIN medic_location_audit mla ON ...
```

#### Data Retention Policies:

| Data Type | Retention | Reason | Auto-Delete |
|-----------|-----------|--------|-------------|
| Location Pings | 30 days | GDPR minimization | ✅ Daily cleanup |
| Shift Events | Permanent | Billing records | ❌ Business need |
| Audit Logs (full) | 6 years | UK tax law | ❌ Legal requirement |
| Audit Logs (anonymized) | After 6 years | Privacy + compliance | ✅ Annual anonymization |
| Alerts | 30 days | Operational | ⏳ To be implemented |
| Consent Records | Permanent | Legal proof | ❌ Never delete |

**Why different retention periods?**
- **30 days (location pings)**: GDPR data minimization - only keep what's operationally necessary
- **Permanent (shift events)**: Billing records - needed for invoices, disputes, taxes
- **6 years (audit logs)**: UK tax law - HMRC requires 6-year retention for business records
- **Permanent (consent)**: Legal requirement - must prove consent was given and when withdrawn

#### GDPR Compliance Checklist:

**✅ Lawfulness, Fairness, Transparency:**
- Clear consent form explaining data collection
- Privacy policy available
- Medics know exactly what's collected and why

**✅ Purpose Limitation:**
- Data only used for location tracking during shifts
- Not used for other purposes without consent

**✅ Data Minimization:**
- Only collect essential location data
- 30-day retention for pings (minimum necessary)

**✅ Accuracy:**
- GPS accuracy tracked and logged
- Medics can correct data via support

**✅ Storage Limitation:**
- Automated 30-day deletion
- No indefinite storage

**✅ Integrity and Confidentiality:**
- RLS policies (Task #12)
- Encrypted in transit (HTTPS)
- Encrypted at rest (Supabase default)
- Access logged in audit trail

**✅ Accountability:**
- Audit trail of all data access
- Consent records kept as proof
- Data processing records maintained

**✅ Individual Rights:**
- Right to Access (export data) ✅
- Right to Rectification (contact support) ✅
- Right to Erasure (delete data) ✅
- Right to Restrict Processing (withdraw consent) ✅
- Right to Data Portability (JSON export) ✅
- Right to Object (withdraw consent) ✅

#### UK Legal Requirements:

**✅ Tax Records (6 years):**
- Shift events kept permanently (billing records)
- Audit logs kept 6 years minimum
- Anonymized after 6 years (PII removed, records kept)

**✅ Employment Law:**
- Location tracking only during paid shifts
- Explicit consent required
- Can be withdrawn anytime
- Not used for disciplinary action without proper process

**✅ Data Protection Act 2018:**
- Compliant with UK DPA 2018 (UK's implementation of GDPR)
- ICO guidelines followed
- Special category data handling (location = special category)

#### Testing Privacy Controls:

**1. Test data export:**
```typescript
// Mobile app: Navigate to Privacy Dashboard → Export My Data
// Verify JSON includes all data types
// Verify audit log created
```

**2. Test data deletion:**
```typescript
// Mobile app: Privacy Dashboard → Delete All My Data
// Confirm dialog shows counts
// Verify data deleted from all tables
// Verify audit logs remain
```

**3. Test consent withdrawal:**
```typescript
// Mobile app: Privacy Dashboard → Withdraw Consent
// Verify location tracking stops
// Verify existing data kept (separate from deletion)
```

**4. Test automated cleanup:**
```sql
-- Insert old ping (>30 days)
INSERT INTO medic_location_pings (recorded_at, ...)
VALUES (NOW() - INTERVAL '31 days', ...);

-- Run cleanup manually
SELECT cleanup_old_location_pings();

-- Verify old ping deleted
SELECT COUNT(*) FROM medic_location_pings
WHERE recorded_at < NOW() - INTERVAL '30 days';
-- Should return 0
```

**5. Test access tracking:**
```typescript
// Admin views medic location on command center
// Check medic's privacy dashboard
// Verify "times_viewed_by_admin" incremented
// Verify "last_viewed_by_admin" updated
```

---

### Analytics & Reporting Dashboard ✅ **COMPLETE**

**Purpose**: Comprehensive analytics dashboard providing admins with visibility into system performance, medic reliability, geofence accuracy, and data quality. Helps optimize operations and identify issues before they become problems.

#### Database Analytics Views:

**1. location_tracking_metrics (System-Wide Overview)**

Single-row view with comprehensive metrics for last 30 days:

```sql
SELECT * FROM location_tracking_metrics;
```

**Returns:**
- **Ping metrics**: Total pings, active medics, tracked bookings, avg GPS accuracy, avg battery level, offline percentage
- **Event metrics**: Total events, arrivals, departures, geofence detections, geofence accuracy %
- **Alert metrics**: Total alerts, critical alerts, resolved alerts, avg resolution time

**Use cases:**
- Quick health check of entire system
- Monitor system performance trends
- Identify degradation in GPS accuracy or battery levels
- Track geofence detection success rate

**2. medic_location_analytics (Per-Medic Performance)**

One row per medic with performance metrics and reliability score:

```sql
SELECT * FROM medic_location_analytics
ORDER BY reliability_score DESC;
```

**Returns per medic:**
- **Ping stats**: Total pings, avg GPS accuracy, avg battery, offline %
- **Event stats**: Total arrivals, geofence detections, manual events, geofence reliability %
- **Alert stats**: Total alerts, critical alerts, late arrivals, battery issues
- **Reliability score** (0-100): Calculated score based on:
  - -10 points per critical alert
  - -5 points per late arrival
  - -20% if all events are manual (geofence not working)
  - -10% if high offline percentage

**Use cases:**
- Identify top performing medics
- Find medics needing device upgrades (poor GPS/battery)
- Detect medics with consistent issues (late arrivals, geofence failures)
- Reward reliable medics

**3. daily_location_trends (Activity Over Time)**

Daily breakdown for last 30 days:

```sql
SELECT * FROM daily_location_trends
ORDER BY date DESC;
```

**Returns per day:**
- Total pings
- Active medics
- Avg GPS accuracy
- Offline pings
- Total events
- Arrivals
- Alerts (total + critical)

**Use cases:**
- Spot trends (increasing offline %, declining accuracy)
- Identify busiest days
- Correlate alerts with activity levels
- Predict capacity needs

**4. geofence_performance (Geofence Effectiveness)**

One row per geofence with auto-detection success rate:

```sql
SELECT * FROM geofence_performance
ORDER BY auto_detection_rate DESC;
```

**Returns per geofence:**
- Site name
- Radius (meters)
- Consecutive pings required
- Auto-detections vs manual detections
- Auto-detection rate %
- Avg arrival delay (minutes)
- Performance rating: excellent (>90%), good (>70%), fair (>50%), poor (<50%)

**Use cases:**
- Identify problematic geofences (low auto-detection rate)
- Optimize geofence radius/settings
- Find sites where GPS is unreliable
- Justify manual arrival requirements for certain sites

**5. alert_type_summary (Alert Breakdown)**

One row per alert type with counts and resolution stats:

```sql
SELECT * FROM alert_type_summary
ORDER BY total_count DESC;
```

**Returns per alert type:**
- Alert severity
- Total count
- Resolved count
- Dismissed count
- Active count
- Auto-resolved count
- Avg lifetime (minutes)
- Last triggered

**Use cases:**
- Identify most common alert types
- Track resolution effectiveness
- Find alert types with poor resolution rates
- Determine if certain alerts need tuning

#### Report Generation Function:

**generate_location_report(start_date, end_date)**

Generates comprehensive JSON report with all metrics:

```sql
SELECT generate_location_report(
  NOW() - INTERVAL '30 days',
  NOW()
);
```

**Returns JSONB with:**
- Report metadata (generated_at, period)
- Summary (total pings, active medics, avg accuracy, offline %)
- Top 10 performers (by reliability score)
- Alert trends (by type and count)
- Geofence performance (by site)

**Use cases:**
- Monthly reports for management
- Performance reviews
- System health checks
- Historical analysis

#### Analytics API Endpoint:

**Edge Function:** `location-analytics`

**Endpoints:**
```
GET /functions/v1/location-analytics?view=metrics
GET /functions/v1/location-analytics?view=medics
GET /functions/v1/location-analytics?view=trends
GET /functions/v1/location-analytics?view=geofences
GET /functions/v1/location-analytics?view=alerts
POST /functions/v1/location-analytics { view: "report", start_date, end_date }
```

**Response format:**
```json
{
  "success": true,
  "view": "metrics",
  "data": { ... },
  "generated_at": "2026-02-15T10:30:00Z"
}
```

#### Admin Analytics Dashboard:

**URL:** `/admin/analytics`

**Features:**

**1. Overview Tab:**
- **Key Metrics Cards**:
  - Total Location Pings (with offline %)
  - Active Medics (with bookings tracked)
  - GPS Accuracy (average)
  - Geofence Detection (success rate)

- **Daily Activity Chart**:
  - Bar chart showing last 14 days
  - Height based on ping volume
  - Hover shows: pings count, active medics
  - Visual trend identification

- **Alerts Summary**:
  - Total alerts, critical alerts, resolved alerts
  - Quick health check

**2. Medics Tab:**
- **Sortable table** with columns:
  - Medic name
  - **Reliability Score** (0-100, color-coded)
  - Total pings
  - Total arrivals
  - Geofence reliability %
  - Alerts count (critical highlighted)
  - Avg GPS accuracy

- **Color coding:**
  - 🟢 Green (90-100): Excellent
  - 🔵 Blue (70-89): Good
  - 🟡 Yellow (50-69): Fair
  - 🔴 Red (<50): Needs attention

- **Use cases:**
  - Identify training needs
  - Spot equipment issues
  - Performance reviews
  - Reward top performers

**3. Geofences Tab:**
- **Table showing:**
  - Site name
  - Auto-detection rate %
  - Total arrivals
  - Performance rating badge (excellent/good/fair/poor)

- **Badge colors:**
  - 🟢 Excellent: >90% auto-detection
  - 🔵 Good: 70-90%
  - 🟡 Fair: 50-70%
  - 🔴 Poor: <50%

- **Use cases:**
  - Optimize geofence settings
  - Identify GPS dead zones
  - Justify manual arrivals for certain sites

**4. Alerts Tab:**
- **Table showing:**
  - Alert type
  - Severity badge (color-coded)
  - Total count
  - Resolved count
  - Active count (highlighted if >0)

- **Use cases:**
  - Identify recurring issues
  - Track resolution effectiveness
  - Prioritize improvements

#### Key Metrics Explained:

**Reliability Score (0-100):**
```
Base: 100 points
- Critical alerts: -10 each
- Late arrivals: -5 each
- Manual events: -20% if ratio high (geofence not working)
- Offline pings: -10% if ratio high (connectivity issues)

Example:
Medic with 2 critical alerts, 1 late arrival, 10% manual events
= 100 - 20 - 5 - 2 - 1 = 72 (Good)
```

**Geofence Accuracy %:**
```
Auto-detections / Total Arrivals × 100

Example:
45 auto-detections, 50 total arrivals = 90% (Excellent)
```

**Offline Percentage:**
```
Offline-queued pings / Total pings × 100

Example:
100 offline pings, 2000 total pings = 5% (Normal)
>20% = Connectivity issues
```

#### Performance Insights:

**Analytics Query Performance:**
| View | Rows | Query Time |
|------|------|------------|
| location_tracking_metrics | 1 | <100ms |
| medic_location_analytics | ~50 | <500ms |
| daily_location_trends | 30 | <200ms |
| geofence_performance | ~100 | <300ms |
| alert_type_summary | ~10 | <100ms |
| generate_location_report | - | <2s |

**Optimizations:**
- Indexed columns for fast aggregation
- Pre-computed views (no runtime calculations)
- Date filtering (last 30 days only)
- Proper join strategies

#### Common Use Cases:

**1. Monthly Performance Review:**
```sql
-- Generate comprehensive report
SELECT generate_location_report(
  date_trunc('month', NOW() - INTERVAL '1 month'),
  date_trunc('month', NOW())
);

-- Top performers
SELECT medic_name, reliability_score, total_pings
FROM medic_location_analytics
WHERE reliability_score >= 90
ORDER BY reliability_score DESC;
```

**2. Identify Problem Geofences:**
```sql
-- Geofences with <70% auto-detection
SELECT site_name, auto_detection_rate, total_arrivals
FROM geofence_performance
WHERE auto_detection_rate < 70
ORDER BY total_arrivals DESC;  -- Prioritize high-traffic sites
```

**3. Alert Triage:**
```sql
-- Most common active alerts
SELECT alert_type, active_count, total_count
FROM alert_type_summary
WHERE active_count > 0
ORDER BY active_count DESC;
```

**4. Medic Device Health:**
```sql
-- Medics with poor GPS or battery
SELECT medic_name, avg_gps_accuracy, avg_battery_level
FROM medic_location_analytics
WHERE avg_gps_accuracy > 50  -- Poor GPS
   OR avg_battery_level < 40  -- Low battery
ORDER BY avg_gps_accuracy DESC;
```

**5. System Health Check:**
```sql
-- Quick overview
SELECT
  total_pings,
  active_medics,
  avg_gps_accuracy_meters AS gps_health,
  geofence_accuracy_percentage AS geofence_health,
  offline_percentage,
  critical_alerts
FROM location_tracking_metrics;

-- Red flags:
-- - GPS accuracy >30m
-- - Geofence accuracy <80%
-- - Offline >20%
-- - Critical alerts >10
```

#### Testing Analytics:

**1. Test view queries:**
```sql
-- Each view should return data
SELECT COUNT(*) FROM location_tracking_metrics;  -- Should be 1
SELECT COUNT(*) FROM medic_location_analytics;   -- Should be >0
SELECT COUNT(*) FROM daily_location_trends;      -- Should be 30
```

**2. Test reliability score calculation:**
```sql
-- Insert test data with known issues
-- Verify score decreases appropriately
```

**3. Test dashboard loading:**
```typescript
// Visit /admin/analytics
// Verify all tabs load without errors
// Check data matches database queries
```

**4. Test report generation:**
```sql
-- Generate report for last 7 days
SELECT generate_location_report(
  NOW() - INTERVAL '7 days',
  NOW()
);
-- Verify report contains all sections
```

**Geofencing Logic (Task #7):**
- Server-side geofence validation
- Configurable radius per booking
- Multiple geofence zones for large sites

**Alerts System (Task #8):**
- Real-time alerts for issues (late arrival, battery critical, connection lost, not moving >20 mins)
- Toast notifications, alerts sidebar, alert history
- Contact medic buttons (call/SMS) with pre-written messages
- Configurable thresholds

**Privacy Controls (Task #10):**
- Shift-based activation (tracking only during paid shifts)
- Medic consent flow during onboarding
- Data retention scheduled job (auto-delete 30+ day pings)
- Privacy dashboard for medics (view own location history, see who accessed it)

**Security (Task #12):**
- Row-Level Security (RLS) policies
- API authentication (Supabase JWT)
- Rate limiting per medic (max 120 pings/hour)
- Admin access audit logging

**Testing & Monitoring (Task #13):**
- Comprehensive testing documentation (TESTING.md)
- Unit testing (database functions, Edge Function validation, GPS spoofing detection)
- Integration testing (mobile→backend, backend→admin real-time flows)
- End-to-end scenarios (complete shift workflow, offline resilience, alert handling)
- Performance benchmarks (location ping ingestion <200ms p95, batch processing <500ms)
- Security testing (RLS policy verification, GDPR compliance, audit trail integrity)
- Edge case testing (GPS jitter, battery dies, clock skew, duplicate pings, airplane mode)
- Monitoring queries (health checks, stuck medics, alert trends, geofence success rates)
- Pre-deployment and post-deployment testing checklists

---

## Phase 5: PDF Generation
**Status**: Not started
**Goal**: Automated weekly safety reports for HSE audits

### Features:
- **Weekly Safety Report**
  - Auto-generates every Friday (scheduled job)
  - Includes: Treatments, near-misses, certifications, compliance score, open actions
  - Professional formatting (audit-ready for HSE inspectors)
  - Company branding (logo, colors)
  - PDF generation completes in <10 seconds (server-side via Edge Functions)

- **On-Demand Reports**
  - Site manager can generate report anytime
  - Custom date range selection
  - Filter by: Worker, injury type, severity

- **Delivery Options**
  - Download PDF from dashboard
  - Email delivery to site manager
  - Secure URL for sharing (Supabase Storage signed URL)

- **Email Notifications**
  - Site manager receives email when weekly PDF ready
  - Professional template with company branding

---

## Phase 5.5: Admin Operations Dashboards (NEW)
**Status**: Not started (6 plans)
**Goal**: Admin tools for managing bookings, medics, territories, revenue, and payouts

### Features:
- **Bookings Management Tab**
  - View all bookings (filterable by date, status, medic, client)
  - Approve/reject bookings requiring manual review
  - Reassign medic to different booking (with reason)
  - Cancel booking with refund processing
  - Booking status tracking (pending → confirmed → in-progress → completed → invoiced)
  - Booking detail view (client, medic, site, pricing, special requirements)

- **Medic Management Tab**
  - Medic roster with availability calendar
  - Territory assignments (drag-drop to reassign)
  - Utilization % tracking (weekly/monthly)
    - Green: <50% (available for more work)
    - Yellow: 50-80% (good utilization)
    - Red: >80% (approaching capacity)
  - Performance metrics
    - Star rating from client feedback
    - Completion rate (confirmed vs cancelled)
    - RIDDOR compliance rate (treatments logged correctly)
  - Medic onboarding status (Stripe account, certifications, training)
  - Stripe Express account management

- **Territory Overview Tab**
  - Coverage map (choropleth visualization)
    - Green: <50% utilization (capacity available)
    - Yellow: 50-80% utilization (healthy)
    - Red: >80% utilization (hiring needed)
  - Click postcode sector → see assigned medic, stats, bookings
  - Gap detection alerts
    - Trigger: Rejection rate >10% in territory for 3+ weeks
    - Display: "Coverage gap detected in East London (E1-E20 sectors)"
  - Hiring recommendations
    - Trigger: Utilization >80% for 3+ weeks OR fulfillment rate <90%
    - Display: "Hire medic in North London (N1-N22 sectors, 85% utilization)"
  - Travel time heatmap (shows coverage radius from medic homes)

- **Revenue Dashboard Tab**
  - Platform fees earned (total, per territory, per medic)
  - Revenue breakdown
    - Base rate revenue
    - Urgency premium revenue
    - Travel surcharge revenue
    - Out-of-territory coverage revenue
  - Cash flow projection
    - Shows gap between medic payout (Friday Week 1) and client payment (Week 5, Net 30)
    - Warning: Cash flow gap >30 days (need cash reserves)
  - Monthly recurring revenue (MRR) from recurring bookings
  - Client lifetime value (LTV) tracking

- **Timesheet Approval Tab**
  - Batch review workflow (approve 20 timesheets in <5 minutes)
  - Timesheet list with filters (date, medic, status)
  - Timesheet detail view
    - Shift details (client, site, date, hours)
    - Medic logged hours
    - Site manager approval status
    - Discrepancy flagging (logged ≠ scheduled hours)
  - Batch approve for Friday payout
  - Reject with reason (requires medic re-submission)
  - Payout history (past weeks, medic payment status)

- **Client Management Tab**
  - Client account list (active, suspended, closed)
  - Payment status (current, overdue, credit limit)
  - Booking history per client
  - Upgrade to Net 30 workflow (from prepay)
    - Requires: 3+ successful bookings, no late payments
  - Credit limit management
  - Late payment alerts (7, 14, 21 days overdue)
  - Client communication log (emails, notes)

---

## Phase 5.5c: Admin Medics & Bookings Pages (NEW)
**Status**: ✅ **COMPLETE** - Medics and Bookings management pages with live Supabase data
**Goal**: Provide admin interface to view, search, and filter medics and bookings with real-time data
**Date Completed**: 2026-02-15

### Features:

#### **Medics Management Page** (`/admin/medics`)
A comprehensive medics roster page displaying all medics from the database with search, filtering, and detailed information.

**Stats Dashboard:**
- **Total Medics**: Count of all medics in the system
- **Available**: Number of medics currently available for work
- **Needs Onboarding**: Count of medics with incomplete Stripe onboarding (highlighted in yellow)
- **High Performers**: Number of medics with 4.5+ star rating

**Search & Filters:**
- **Search Bar**: Search by name, email, or phone number
- **Filter Buttons**:
  - All medics (default)
  - Available medics only
  - Unavailable medics only

**Medics Table Columns** (Streamlined, Compact Design):
1. **Medic Info**: Full name and home postcode displayed inline with bullet separator for space efficiency
2. **Contact**: Email and phone number (stacked for readability)
3. **Certifications**: Compact visual badges with reduced padding:
   - Confined Space certification (blue badge)
   - Trauma certification (red badge)
   - Shows "None" if no certifications
4. **Performance Metrics** (Compact 2-line layout):
   - Star rating (0.00-5.00 with yellow star icon)
   - Total shifts completed and RIDDOR compliance rate (percentage) on second line
5. **Status** (Compact badges):
   - Available (green badge with checkmark)
   - Unavailable (red badge with reason displayed below)
6. **Stripe Status** (Compact badges):
   - Active (green badge) - onboarding complete
   - Pending (yellow badge with warning icon) - needs onboarding
7. **Actions**: "View Details →" link to individual medic page

**Table Design Optimizations:**
- Reduced vertical padding (`py-3` instead of `py-4`) for more compact rows
- Smaller badge sizes with inline-flex alignment for visual consistency
- Inline display of related data (name + postcode) to maximize horizontal space
- Smaller text sizes for secondary information while maintaining readability
- Optimized to display more medics per screen without sacrificing usability

**Data Source:**
- Fetches from `medics` table in Supabase
- Ordered by last name alphabetically
- Uses Supabase client (`@/lib/supabase`) for real-time data
- Automatic loading state with spinner

**Key Features:**
- Responsive design (mobile, tablet, desktop breakpoints)
- Real-time filtering and search (client-side for performance)
- Visual highlighting for medics needing onboarding
- Empty state handling ("No medics found")
- Professional dark theme matching admin dashboard

---

#### **Bookings Management Page** (`/admin/bookings`)
A comprehensive bookings management page showing all medic shift bookings with advanced filtering, search, and revenue tracking.

**Stats Dashboard:**
- **Total Bookings**: All bookings in the system
- **Pending**: Bookings awaiting medic assignment (highlighted in yellow)
- **Confirmed**: Bookings with assigned medic
- **In Progress**: Currently active shifts
- **Completed**: Finished shifts
- **Cancelled**: Cancelled bookings
- **Needs Approval**: Bookings requiring manual admin approval (highlighted in yellow)

**Revenue Card:**
- Large featured card showing total revenue from completed bookings
- Uses `CurrencyWithTooltip` component for GBP → USD conversion on hover
- Gradient green background with currency icon

**Search & Filters:**
- **Search Bar**: Search by site name, postcode, client company name, or medic name
- **Status Filters** (color-coded buttons):
  - All bookings (blue)
  - Pending (yellow)
  - Confirmed (green)
  - In Progress (cyan)
  - Completed (purple)
  - Cancelled (red)
- **Date Filters**:
  - All dates
  - Today
  - Upcoming (future dates)
  - Past (historical dates)

**Bookings Table Columns:**
1. **Date & Time**:
   - Shift date (formatted DD MMM YYYY)
   - Start and end time (HH:MM format)
   - Total hours
2. **Site**:
   - Site name
   - Postcode
3. **Client**: Company name (from joined `clients` table)
4. **Medic**:
   - Assigned medic name (or "Unassigned" in yellow)
   - Auto-matched indicator (blue text)
   - Manual approval flag (yellow warning icon)
5. **Requirements**:
   - Confined Space badge (blue)
   - Trauma badge (red)
   - Urgency premium percentage badge (orange)
   - Shows "Standard" if no special requirements
6. **Pricing** (all with GBP → USD tooltips):
   - Total amount charged to client
   - Platform fee (40% markup)
   - Medic payout (60% of revenue)
7. **Status**: Color-coded status badges:
   - ⏳ Pending (yellow)
   - ✓ Confirmed (green)
   - 🔵 In Progress (cyan)
   - ✓ Completed (purple)
   - ✗ Cancelled (red)
8. **Actions**: "View Details →" link to booking detail page

**Data Source:**
- Fetches from `bookings` table with joins to:
  - `clients` table (for company name)
  - `medics` table (for medic first/last name)
- Ordered by shift date (descending), then created date
- Uses Supabase client for real-time data
- Automatic loading state

**Key Features:**
- **Currency Tooltips**: All GBP amounts show USD conversion on hover
- **Advanced Filtering**: Combine status filters, date filters, and search
- **Results Counter**: Shows "X of Y bookings" based on active filters
- **Responsive Table**: Horizontal scroll on smaller screens
- **Empty State**: "No bookings found" when filters return no results
- **Visual Badges**: Color-coded status and requirement indicators
- **Professional Dark Theme**: Consistent with admin dashboard design

**Database Schema Integration:**
- Displays data from migration `002_business_operations.sql`
- Shows booking pricing breakdown (base rate, urgency premium, travel surcharge, VAT, total)
- Tracks platform fee (40%) and medic payout (60%) split
- Indicates auto-matched bookings vs manual assignments
- Flags bookings requiring manual approval

---

### Technical Implementation:

**Files Created:**
- ✅ `web/app/admin/medics/page.tsx` - Medics management page
- ✅ `web/app/admin/bookings/page.tsx` - Bookings management page

**Navigation:**
- Both pages accessible via sidebar navigation in `web/app/admin/layout.tsx`:
  - 👨‍⚕️ Medics → `/admin/medics`
  - 📅 Bookings → `/admin/bookings`

**Dependencies:**
- Supabase client (`@/lib/supabase`)
- CurrencyWithTooltip component for GBP → USD conversion
- React hooks (useState, useEffect)
- Next.js Link component for navigation

**Data Flow:**
1. Page component mounts
2. useEffect triggers `loadMedics()` or `loadBookings()`
3. Supabase query executed with `.select()` and `.order()`
4. State updated with returned data
5. Loading state removed
6. Table renders with fetched data
7. User can search/filter (client-side filtering for performance)

**Performance:**
- Initial load shows loading spinner
- Client-side filtering for instant results (no server round-trips)
- Supabase connection pooling for efficient queries
- Responsive design with mobile optimization

**Currency Display Standards:**
- All GBP amounts use `CurrencyWithTooltip` component
- Consistent with admin dashboard currency guidelines
- Tooltip shows live USD conversion rate
- Formatted as "£X,XXX.XX" with hover for "$X,XXX.XX USD"

---

## Phase 5.5d: Admin Customers Page (NEW)
**Status**: ✅ **COMPLETE** - Customers/clients management page with live Supabase data
**Goal**: Provide admin interface to view, search, and manage client accounts with payment terms, credit status, and booking history
**Date Completed**: 2026-02-15

### Features:

#### **Customers Management Page** (`/admin/customers`)
A comprehensive customer account management page displaying all construction company clients with financial tracking, payment terms, and Stripe integration.

**Stats Dashboard:**
- **Total**: Count of all customer accounts
- **Active**: Number of active customer accounts
- **Suspended**: Suspended accounts (highlighted in yellow)
- **Closed**: Closed/inactive accounts
- **Net 30**: Number of customers with Net 30 payment terms
- **At Risk**: Customers with 2+ late payments or near credit limit (highlighted in yellow)
- **Outstanding Balance**: Total outstanding balance across all Net 30 customers (with GBP → USD tooltip)

**Search & Filters:**
- **Search Bar**: Search by company name, contact name, email, or postcode
- **Status Filters**:
  - All customers (default)
  - Active customers only
  - Suspended customers only
  - Closed customers only
- **Payment Terms Filters**:
  - All payment types
  - Prepay only (card charged on booking)
  - Net 30 only (invoice with 30-day terms)

**Customers Table Columns:**
1. **Company**:
   - Company name with at-risk warning icon (⚠️)
   - Billing postcode
   - VAT number (if available)
2. **Contact**:
   - Contact name
   - Email address
   - Phone number
3. **Payment Terms**:
   - Prepay badge (blue) or Net 30 badge (purple)
4. **Financials** (for Net 30 customers):
   - Credit limit (with currency tooltip)
   - Outstanding balance (highlighted in yellow if > 0)
   - Late payment count (red text)
   - Shows "Pay on booking" for Prepay customers
5. **Bookings**:
   - Total bookings count
   - Successful/completed bookings (green)
   - Cancelled bookings (red, if any)
   - Success rate percentage
6. **Status**:
   - ✓ Active (green badge)
   - ⚠️ Suspended (red badge with suspension reason)
   - ✗ Closed (gray badge)
7. **Stripe**:
   - ✓ Connected (green badge) with Stripe customer ID
   - "Card on file" indicator if default payment method exists
   - "Not setup" (yellow badge) if not connected
8. **Actions**: "View Details →" link to customer detail page

**At-Risk Detection:**
- Automatically flags customers as "at risk" based on:
  - 2+ late payments
  - Outstanding balance > 80% of credit limit (for Net 30 customers)
- Visual warning icon (⚠️) next to company name
- Yellow highlight on "At Risk" stat card

**Data Source:**
- Fetches from `clients` table in Supabase
- Ordered by company name alphabetically
- Uses Supabase client (`@/lib/supabase`) for real-time data
- Automatic loading state with spinner

**Key Features:**
- **Payment Terms Management**: Clearly distinguishes between Prepay and Net 30 customers
- **Credit Monitoring**: Tracks credit limits and outstanding balances for Net 30 accounts
- **Late Payment Tracking**: Displays late payment count and flags at-risk customers
- **Booking History**: Shows total, successful, and cancelled bookings with success rate
- **Stripe Integration Status**: Indicates whether customer has Stripe account and payment method
- **Multi-filter Support**: Combine status filter, payment terms filter, and search
- **Currency Tooltips**: All GBP amounts show USD conversion on hover
- **Responsive Design**: Mobile, tablet, and desktop breakpoints
- **Empty State**: "No customers found" when filters return no results
- **Professional Dark Theme**: Consistent with admin dashboard design

**Business Intelligence:**
- **Credit Risk Management**: Identify customers approaching credit limits
- **Payment Pattern Analysis**: Track late payments and success rates
- **Customer Segmentation**: Filter by payment terms for targeted management
- **Stripe Onboarding**: Identify customers needing Stripe setup

**Database Schema Integration:**
- Displays data from `clients` table in migration `002_business_operations.sql`
- Shows payment terms (prepay vs net_30)
- Tracks credit limits and outstanding balances for Net 30 customers
- Records booking statistics (total, successful, cancelled)
- Integrates with Stripe (customer_id, payment_method_id)
- Manages account status (active, suspended, closed)

---

### Technical Implementation (Updated):

**Files Created:**
- ✅ `web/app/admin/medics/page.tsx` - Medics management page
- ✅ `web/app/admin/bookings/page.tsx` - Bookings management page
- ✅ `web/app/admin/customers/page.tsx` - Customers management page

**Navigation:**
- All pages accessible via sidebar navigation in `web/app/admin/layout.tsx`:
  - 👨‍⚕️ Medics → `/admin/medics`
  - 📅 Bookings → `/admin/bookings`
  - 🏢 Customers → `/admin/customers`

**Dependencies:**
- Supabase client (`@/lib/supabase`)
- CurrencyWithTooltip component for GBP → USD conversion
- React hooks (useState, useEffect)
- Next.js Link component for navigation

**Data Flow:**
1. Page component mounts
2. useEffect triggers data loading function
3. Supabase query executed with `.select()` and `.order()`
4. State updated with returned data
5. Loading state removed
6. Table renders with fetched data
7. User can search/filter (client-side filtering for performance)

**Performance:**
- Initial load shows loading spinner
- Client-side filtering for instant results (no server round-trips)
- Supabase connection pooling for efficient queries
- Responsive design with mobile optimization
- Efficient stat calculations from in-memory data

**Currency Display Standards:**
- All GBP amounts use `CurrencyWithTooltip` component
- Consistent with admin dashboard currency guidelines
- Tooltip shows live USD conversion rate
- Formatted as "£X,XXX.XX" with hover for "$X,XXX.XX USD"

---

## Phase 6: RIDDOR Auto-Flagging
**Status**: 🔄 **IN PROGRESS** - Database Schema Completed
**Goal**: Intelligent RIDDOR detection with deadline tracking
**Migration**: `018_riddor_incidents.sql` ✅ Added

### Database Schema (✅ COMPLETED)
- **`riddor_incidents` Table** - Auto-flagged and manually created RIDDOR-reportable incidents
  - **Core Fields**:
    - `id` (UUID primary key)
    - `treatment_id` (UUID, references treatments table, UNIQUE constraint prevents duplicate flagging)
    - `worker_id`, `org_id` (foreign keys for data relationships)

  - **RIDDOR Categorization**:
    - `category`: Four types with CHECK constraint
      - `specified_injury` (fractures, amputations, loss of sight)
      - `over_7_day` (incapacitation over 7 days)
      - `occupational_disease` (work-related illnesses)
      - `dangerous_occurrence` (scaffolding collapse, structural failures)
    - `confidence_level`: Three levels (HIGH, MEDIUM, LOW)

  - **Auto-Detection & Override Tracking**:
    - `auto_flagged` (BOOLEAN, default TRUE for algorithm-detected incidents)
    - `medic_confirmed` (BOOLEAN, NULL = awaiting review, TRUE = confirmed, FALSE = dismissed)
    - `override_reason` (TEXT, **mandatory** when medic confirms or dismisses)
    - `overridden_by` (UUID, references profiles)
    - `overridden_at` (TIMESTAMPTZ for audit trail)

  - **Deadline Management**:
    - `deadline_date` (DATE type for calendar day deadlines)
    - 10 days for `specified_injury` category
    - 15 days for `over_7_day` category
    - Indexed for efficient cron job queries (`WHERE status = 'draft'`)

  - **Report Status & Submission**:
    - `status`: Three states (draft, submitted, confirmed) with CHECK constraint
    - `f2508_pdf_path` (TEXT, Supabase Storage path to generated F2508 PDF)
    - `submitted_at`, `submitted_by` (audit trail for HSE submissions)

  - **Timestamps**:
    - `detected_at` (when auto-flagged by algorithm)
    - `created_at`, `updated_at` (with auto-update trigger)

- **Indexes for Performance**:
  - `idx_riddor_incidents_org_id` - Fast org-level queries
  - `idx_riddor_incidents_treatment_id` (UNIQUE) - Prevent duplicate detection
  - `idx_riddor_incidents_deadline` (partial: `WHERE status = 'draft'`) - Deadline cron optimization
  - `idx_riddor_incidents_medic_confirmed` (partial: `WHERE medic_confirmed IS NULL`) - Pending review queries

- **Row Level Security (RLS)**:
  - **Medics**: Full SELECT and UPDATE access for their organization's RIDDOR incidents
  - **Site Managers**: SELECT access for their organization's incidents (view-only)
  - **Service Role**: INSERT access for Edge Function auto-detection (bypasses RLS with service_role_key)

### Features:
- **Auto-Detection Algorithm** (Database schema ✅, Algorithm pending)
  - Matches treatment details against RIDDOR criteria
    - Specified injuries (fractures, amputations, loss of sight, etc.)
    - Over-7-day incapacitation
    - Occupational diseases
    - Dangerous occurrences (scaffolding collapse, etc.)
  - Confidence level (High/Medium/Low)
  - Explanation of why flagged
  - Unique constraint prevents duplicate flagging per treatment

- **Medic Override** (Database schema ✅, UI pending)
  - Medic can confirm or override RIDDOR flag
  - **Mandatory reason** for override (enforced at database level)
  - Override patterns tracked for algorithm tuning
    - If 80% overridden for specific category → review logic
  - Complete audit trail: who, when, and why

- **Deadline Countdown** (Database schema ✅, Cron + UI pending)
  - 10 days for specified injuries (immediate notification)
  - 15 days for over-7-day incapacitation
  - Stored as DATE type for accurate calendar day calculations
  - Indexed for efficient daily cron job queries
  - Visible on mobile app and dashboard
  - Email alert 3 days before deadline

- **HSE F2508 Form Generation** (Database schema ✅, PDF generation pending)
  - Pre-filled from treatment log data
  - PDF format ready for HSE submission
  - Stored in Supabase Storage (`f2508_pdf_path`)
  - Editable fields for additional details
  - Digital signature support

- **Status Tracking** (Database schema ✅, UI workflow pending)
  - Three states: Draft → Submitted → Confirmed
  - Submission confirmation from HSE (manual entry)
  - Complete audit trail for compliance (`submitted_at`, `submitted_by`)
  - Prevents duplicate submissions with unique treatment constraint

---

## Phase 6.5: Payment Processing & Payouts (NEW)
**Status**: ✅ **COMPLETED** - 5/5 plans complete (Client payments ✅, Weekly payouts ✅, Invoicing ✅, IR35 compliance ✅, Out-of-territory costs ✅)
**Goal**: Full payment processing with client charging and weekly medic payouts

### Features:
- **Client Payment Processing**
  - **Card Payments (Stripe)**
    - Payment Intent creation with 3D Secure (SCA compliant)
    - Card charge for new clients (prepay)
    - Payment confirmation email
    - Receipt generation (PDF)

  - **Net 30 Invoicing** ✅ **COMPLETED**
    - **Invoice PDF Generator** (`web/lib/invoices/pdf-generator.ts`):
      - @react-pdf/renderer template with company details, line items, VAT breakdown
      - Displays subtotal, VAT (20%), total, Net 30 payment terms
      - Late fee display when applicable (£40-£100)
      - Footer with payment instructions and Late Payment Act notice
    - **Invoice Generation Edge Function** (`supabase/functions/generate-invoice-pdf`):
      - Queries invoice with client and line items
      - Generates PDF and uploads to Supabase Storage
      - Updates invoice status to 'sent' with PDF URL
      - HTML fallback for Deno environment
    - **Invoice Generation API** (`/api/invoices/generate`):
      - Validates bookings are completed and not already invoiced
      - Calculates subtotal (pre-VAT), VAT (20%), total
      - Creates invoice record with line items (one per booking)
      - Triggers PDF generation via Edge Function
      - Returns invoice and PDF URL
    - **Late Fee Calculator** (`web/lib/invoices/late-fees.ts`):
      - UK Late Payment Act statutory fees: £40 (<£1k), £70 (£1k-10k), £100 (£10k+)
      - Interest calculator (Bank of England rate + 8%)
    - **Late Payment Tracker** (`web/components/invoices/late-payment-tracker.tsx`):
      - Displays overdue invoices with color coding (yellow/orange/red)
      - Shows days overdue, late fee amount, last reminder sent
      - "Send Reminder" and "Mark as Paid" buttons
      - Auto-refreshes every 60 seconds
      - Filters by overdue bracket (1-7, 8-14, 15+ days)
    - **Automated Reminder System** (`/api/invoices/send-reminder`):
      - Sends reminder emails at 7, 14, 21 day intervals
      - Calculates days overdue and statutory late fees
      - Updates invoice status to 'overdue'
      - Applies late fee at 21 days (£40-£100 based on amount)
      - Tracks reminder history (prevents duplicate sends)
    - **pg_cron Automation** (`020_late_payment_reminders.sql`):
      - Daily job runs at 10am GMT checking for overdue invoices
      - Finds invoices 7/14/21 days past due date
      - Calls send-reminder API for each overdue invoice
      - Optimized indexes for fast reminder queries
      - Zero manual intervention required

  - **Platform Fee Structure**
    - 40% markup (transparent to clients)
    - Example: Medic £30/hr → Client £42/hr → Platform £12/hr
    - Breakdown: Insurance (5-10%), support (5%), payment processing (2-3%), marketing (5-10%), profit (3-8%)

- **Medic Payout Automation**
  - **Weekly Friday Payout Job**
    - Runs automatically every Friday at 9am UK time
    - Processes all admin-approved timesheets from previous week
    - Creates Stripe Transfers to medic Express accounts
    - Email confirmation to each medic
    - Zero failures requirement (monitoring + alerts)

  - **UK Faster Payments**
    - Medics receive funds within 2 business days
    - Bank account required (GBP account in UK)
    - Real-time transfer tracking

  - **Payout Verification**
    - Timesheet workflow: Medic logs → Site manager approves → Admin batch-approves
    - Validation: Hours worked ≤ hours scheduled (prevent overpayment)
    - Discrepancy handling: Flag for manual review

  - **Payslip Generation**
    - PDF payslip for medic records
    - Shows: Gross pay, deductions (none for self-employed), net pay
    - Includes: Platform name, medic name, tax year, UTR (for self-employed)

- **IR35 Compliance** ✅ **COMPLETED**
  - **IR35 Validator Library** (`web/lib/medics/ir35-validator.ts`)
    - **UTR Validation**: 10-digit format check for Unique Taxpayer Reference
    - **Employment Status Validation**: Self-employed vs umbrella company
    - **CEST Assessment Check**: Verifies HMRC assessment completeness
    - **Deduction Calculator**: £0 for self-employed (medic handles own tax)
    - Functions:
      - `validateUTR()` - 10-digit format validation
      - `requiresCESTAssessment()` - Checks if CEST needed
      - `validateIR35Status()` - Completeness validation with error messages
      - `calculateDeductions()` - Gross to net (£0 deductions for self-employed)

  - **IR35 Form Component** (`web/components/medics/ir35-form.tsx`)
    - **Employment Status Selection**:
      - Self-employed contractor (recommended) with tax responsibility warning
      - Umbrella company employee with PAYE info
    - **Self-Employed Fields**:
      - UTR input with 10-digit validation
      - CEST assessment result (outside/inside/unknown IR35)
      - CEST assessment date picker
      - CEST PDF upload to Supabase Storage (`ir35-assessments` bucket)
      - Blue info box explaining tax responsibilities
    - **Umbrella Company Fields**:
      - Umbrella company name input
      - Green info box explaining PAYE handling
    - **Inline Validation**: Real-time error messages for incomplete/invalid data
    - **Auto-upload**: CEST PDF to Supabase Storage with medic ID + timestamp naming

  - **IR35 Assessment API** (`/api/medics/ir35-assessment`)
    - **POST Endpoint**: Saves IR35 data to medics table
    - **Authorization Check**: User must be medic or admin
    - **Data Validation**: Calls validateIR35Status before saving
    - **Database Update**: Stores employment_status, UTR, umbrella company, CEST data
    - **Stripe Account Creation**: Auto-creates Express account if doesn't exist
    - **Returns**: Stripe onboarding URL for bank account setup
    - **Error Handling**: Returns validation errors with 400 status

  - **Stripe Onboarding Status Component** (`web/components/medics/stripe-onboarding-status.tsx`)
    - **Three States**:
      - Not Started: Shows explanation, IR35 required first
      - In Progress: Yellow warning with "Continue Onboarding" button
      - Complete: Green checkmark with account status (charges_enabled, payouts_enabled)
    - **Auto-refresh**: Checks Stripe status every 30 seconds if incomplete
    - **Manual Refresh**: "Refresh Status" button calls check_account_status Edge Function
    - **Status Display**: Shows charges enabled/disabled, payouts enabled/disabled
    - **Last Updated**: Timestamp of last status check

  - **Payslip Auto-Generator** (`024_payslip_generation.sql`)
    - **Payslips Table**: Stores gross, tax (£0), NI (£0), net, employment status, UTR
    - **Database Trigger**: `generate_payslip_on_payout()` fires when timesheet.payout_status = 'paid'
    - **Auto-generation**: Creates payslip record automatically on payout
    - **IR35 Data**: Copies employment_status, UTR, umbrella company from medics table
    - **Pay Period**: Records start/end dates and payment date
    - **PDF Storage**: pdf_url field for future PDF generation

  - **Admin Medic Onboarding Page** (`/admin/medics/onboarding/[id]`)
    - **Onboarding Checklist** with 5 items:
      1. Personal details (name, email, phone, postcode) ✅/❌
      2. Qualifications (certifications list) ✅/❌
      3. IR35 status (employment status + UTR/umbrella) ✅/❌
      4. Stripe Express account (onboarding complete) ✅/❌
      5. Ready for payouts (all above complete) ✅/❌ highlighted
    - **Personal Information Section**: Read-only display with edit button
    - **Qualifications Section**: List of certifications with green checkmarks
    - **IR35 Compliance Section**:
      - If incomplete: Shows IR35Form component
      - If complete: Displays status summary with CEST PDF download link
    - **Payout Setup Section**: Shows StripeOnboardingStatus component
    - **Payslip History Table**:
      - Columns: Pay period, Gross, Deductions, Net, PDF download
      - Sorted by payment date descending
    - **Admin Actions**:
      - "Approve for Work" button (disabled until ready for payouts)
      - "Suspend" button
      - "View Payout History" link
    - **Real-time Updates**: Page reloads on form completion

  - **Contractor Status**
    - Self-employed medics (NOT employees)
    - No PAYE, no NI contributions by platform
    - Medics responsible for own tax returns (Self Assessment)
    - HMRC CEST tool validation (IR35 check)
    - Payslips show £0 deductions with UTR for tax filing

- **Out-of-Territory Cost Management** ✅ **COMPLETED**
  - **Cost Calculation Library** (`web/lib/bookings/out-of-territory.ts`)
    - **Travel Bonus Calculation**: £2/mile beyond 30 miles free zone
    - **Room/Board Flat Rate**: £150 when travel time >2 hours
    - **Automatic Recommendation**: Compares options and recommends cheapest
    - **Denial Logic**: Auto-recommends deny if cost >50% of shift value
    - **Configurable Rules**: Business rules stored in database (`out_of_territory_rules` table)
    - Business rule functions:
      - `calculateTravelBonus()` - Billable miles calculation
      - `calculateRoomBoard()` - Flat rate if travel >2 hours
      - `shouldDenyBooking()` - Auto-deny threshold check
      - `calculateOutOfTerritoryCost()` - Full cost analysis with recommendation
      - `formatCostBreakdown()` - Human-readable cost summary

  - **Google Maps API Integration** (`/api/bookings/calculate-cost`)
    - **Distance Matrix API**: Real travel distance and time calculation
    - **7-Day Caching**: Results cached in `travel_time_cache` table (70-80% API cost reduction)
    - **Automatic Cache Refresh**: Expires after 7 days, recalculates on next request
    - **Fallback Handling**: Clear error messages for invalid postcodes or unreachable routes
    - **Shift Value Calculation**: Base rate × hours × 1.2 (VAT)
    - API returns:
      - Travel distance in miles
      - Travel time in minutes
      - Cost breakdown (travel bonus vs room/board)
      - Recommendation (travel_bonus / room_board / deny)
      - Cache status (hit/miss)

  - **Out-of-Territory Calculator Component** (`OutOfTerritoryCalculator`)
    - **Visual Cost Breakdown**:
      - Travel details (distance, time, route map)
      - Option 1: Travel Bonus with billable miles calculation
      - Option 2: Room & Board (displayed only if travel >2 hours)
      - Color-coded recommendation badge (green/blue/red)
      - Cost percentage with visual progress bar
    - **Real-Time Calculation**: Auto-fetches cost data on component mount
    - **Recalculate Button**: Manual refresh to bypass cache
    - **High-Cost Warning**: Red alert box when cost >50% threshold
    - **Loading States**: Spinner during API call
    - **Error Handling**: User-friendly error messages with retry button

  - **Admin Approval Component** (`OutOfTerritoryApproval`)
    - **Booking Details Display**:
      - Site name, shift date, hours, total amount
      - Out-of-territory analysis (distance, time, costs)
      - Cost as percentage of shift value (visual progress bar)
    - **Business Rule Enforcement**:
      - Cost 0-50%: Auto-approve allowed
      - Cost 50-75%: Override confirmation required
      - Cost >75%: Hard block (escalation required)
    - **Admin Actions**:
      - **Approve**: Updates booking to confirmed, tracks admin ID and timestamp
      - **Override & Approve**: Requires confirmation dialog for 50-75% cost
      - **Deny**: Requires reason, cancels booking with audit trail
    - **Admin Notes**: Internal notes field for approval decision context
    - **Audit Trail**: Tracks who approved/denied, when, and why
    - **Modals**:
      - Override confirmation (for 50-75% cost range)
      - Denial reason input (required field)

  - **Database Schema** (`022_out_of_territory_rules.sql`)
    - **out_of_territory_rules table**: Configurable business rules
      - travel_bonus_rate: £2.00/mile
      - free_travel_miles: 30.00 miles
      - room_board_flat_rate: £150.00
      - travel_time_threshold_minutes: 120.00 (2 hours)
      - denial_threshold_percent: 50.00%
      - admin_override_limit_percent: 75.00%
    - **get_out_of_territory_rule()** function: Retrieve rule value by name
    - Indexed for fast lookups

  - **Cost Tracking**
    - Out-of-territory costs stored in booking record:
      - `out_of_territory_cost`: Total cost (£)
      - `out_of_territory_type`: travel_bonus / room_board
    - Approval tracking:
      - `approved_by`: Admin user ID
      - `approved_at`: Timestamp
      - `admin_notes`: Internal notes

- **Refund Processing**
  - Admin-initiated refunds (full or partial)
  - Stripe refund API integration
  - Refund reason tracking (client cancellation, medic no-show, etc.)
  - Email notification to client

---

## Phase 7: Certification Tracking
**Status**: Not started
**Goal**: Multi-vertical UK certification management with expiry alerts

### Features:
- **Certification Database (Multi-Vertical — 10 Industry Sectors)**
  - 30 certification types across 7 categories:
    - **Medical / Clinical** (all verticals): FREC 3, FREC 4, PHEC, PHTLS, HCPC Paramedic, EMT, ALS Provider, PALS Provider, ATLS, BLS Instructor, AED Trained
    - **Construction**: CSCS, CPCS, IPAF, PASMA, Gas Safe
    - **DBS / Safeguarding**: Enhanced DBS (Children), Enhanced DBS (Adults), Enhanced DBS (Barred Lists)
    - **Motorsport**: FIA Grade 1/2/3, Motorsport UK CMO Letter, MSA First Aider
    - **Events & Festivals**: SIA Door Supervisor, Purple Guide Certificate, Event Safety Awareness, NEBOSH General Certificate
    - **Education**: Paediatric First Aid, Child Safeguarding Level 2/3
    - **Outdoor & Adventure**: Mountain First Aid, Wilderness First Aid
  - Per-vertical recommended cert types (e.g., motorsport shows FIA grades first; education shows DBS/Paediatric FA first)
  - Expiry date tracking with computed `valid` / `expiring-soon` / `expired` status
  - Renewal URLs for all 30 cert types (links to HCPC, Resuscitation Council, FIA, SIA, NEBOSH, etc.)
  - `web/types/certification.types.ts` — canonical type definitions, metadata, renewal URLs
  - `services/taxonomy/certification-types.ts` — mobile-side mirror (React Native app)

- **API Routes**
  - `GET /api/medics/[id]/certifications` — fetch a medic's certifications annotated with status + renewal URL (org-scoped via RLS)
  - `PATCH /api/medics/[id]/certifications` — replace a medic's full certifications array (org-scoped via RLS)
  - `POST /api/certifications/validate` — check if a medic has any expired certs; blocks incident logging (403) if so

- **Progressive Expiry Alerts**
  - Email reminders sent:
    - 30 days before expiry
    - 14 days before expiry
    - 7 days before expiry
    - 1 day before expiry
    - On expiry date
  - Professional email template with company branding

- **Dashboard Visibility**
  - Certifications expiring in next 30/60/90 days
  - Color-coded alerts (green/yellow/red)
  - Critical alert for expired certifications

- **Validation at Point of Use**
  - Expired certification prevents worker selection for incident logging
  - Prevents booking medics with expired certifications
  - Compliance safeguard

- **Server-Side Scheduled Jobs**
  - Daily expiry check (not device-local notifications)
  - Email queue processing
  - Reliable delivery

---

## Phase 7.5: Intelligent Auto-Scheduling & Medic Management (NEW)
**Status**: Backend Complete (14 of 19 tasks, 74% done) - UI work remaining
**Goal**: ConnectStream-style intelligent auto-scheduling with UK compliance enforcement

### Backend Services Complete (11 Edge Functions)

#### 1. **Core Auto-Scheduling**
- ✅ **auto-assign-medic-v2** - 7-factor intelligent matching with UK compliance
  - **7-Factor Scoring Algorithm** (weighted ranking):
    1. Distance (25%) - Google Maps drive time, prefer <30 min
    2. Qualifications (20%) - Required certs (confined space, trauma specialist)
    3. Availability (15%) - Calendar integration, time-off requests
    4. Utilization (15%) - Load balancing, prefer <70% weekly utilization
    5. Rating (10%) - Client ratings, prefer 4.5+ stars
    6. Performance (10%) - On-time percentage, completion rate
    7. Fairness (5%) - Equitable shift distribution (shifts offered vs worked)

  - **6-Layer Filtering** (eliminates unqualified medics):
    1. Available for work (active status)
    2. Required certifications (hard validation)
    3. Not double-booked (date + time overlap check)
    4. Medic availability calendar (approved time-off blocks)
    5. UK Working Time Regulations compliance (calls PostgreSQL function)
    6. Sufficient rest period (11-hour minimum between shifts)

  - **Confidence-Based Categorization**:
    - Score ≥80% → Auto-assign immediately (no human review)
    - Score 50-79% → Flag for admin review before assignment
    - Score <50% → Requires manual medic selection

  - **Comprehensive Audit Logging**:
    - Every decision tracked in `auto_schedule_logs` table
    - Includes: All candidates considered, scores, filters failed, final decision
    - Confidence score stored with booking for quality analysis

- ✅ **auto-assign-all** - Bulk processing for "Auto-Schedule All" button
  - Processes all unassigned bookings in batch
  - Configurable limit (default: 10 bookings per run)
  - Returns categorized results: auto_assigned, flagged_for_review, requires_manual
  - Perfect for daily scheduling runs or clearing backlog

#### 2. **UK Compliance Enforcement** (HARD BLOCKS - No Overrides)
- ✅ **48-Hour Weekly Limit** (UK Working Time Regulations 1998)
  - PostgreSQL function: `check_working_time_compliance()`
  - Calculates rolling 7-day window from shift start
  - Includes all confirmed and in-progress shifts
  - **CRITICAL**: Blocks assignment if medic would exceed 48 hours
  - Prevents legal violations (HSE can fine £5,000+ per breach)

- ✅ **11-Hour Rest Period** (Mandatory break between shifts)
  - Checks time between end of last shift and start of new shift
  - **CRITICAL**: Blocks assignment if rest period <11 hours
  - Accounts for overnight shifts and cross-day boundaries
  - Protects medic safety and prevents fatigue-related incidents

- ✅ **Double-Booking Prevention**
  - Checks for overlapping shifts on same date
  - Includes all statuses: confirmed, in_progress, urgent_broadcast
  - **CRITICAL**: Blocks assignment if time overlap detected

- ✅ **Qualification Validation**
  - Confined space certification (when `confined_space_required = true`)
  - Trauma specialist certification (when `trauma_specialist_required = true`)
  - **CRITICAL**: Blocks assignment if medic lacks required certs
  - Prevents sending unqualified medics to dangerous sites

#### 3. **Real-Time Conflict Detection**
- ✅ **conflict-detector** - 6 conflict checks before assignment
  - **Check 1: Double-booking** (severity: critical)
    - Searches for overlapping shifts on same date
    - Returns existing shift details for UI display
    - Cannot override

  - **Check 2: Qualification mismatch** (severity: critical)
    - Validates confined space and trauma certs
    - Lists missing certifications
    - Cannot override

  - **Check 3: Overtime violation** (severity: critical)
    - Calls `check_working_time_compliance()` function
    - Returns current weekly hours and violation details
    - Cannot override (UK law)

  - **Check 4: Insufficient rest** (severity: critical)
    - Calculates hours between shifts
    - Displays last shift location and end time
    - Cannot override (UK law)

  - **Check 5: Travel time infeasible** (severity: warning)
    - Checks back-to-back shifts with insufficient travel time
    - Uses `travel_time_cache` table for accuracy
    - Can override (medic may choose to rush)

  - **Check 6: Time-off conflict** (severity: critical)
    - Checks approved time-off requests from `medic_availability`
    - Displays reason for time-off
    - Cannot override (respects medic preferences)

  - **Returns**:
    - `can_assign`: Boolean (true if no critical conflicts)
    - `conflicts`: Array of conflict objects with type, severity, message, details
    - `recommendation`: Human-readable guidance for admin

#### 4. **Urgent Shift Handling** (Last-Minute <24 Hours)
- ✅ **last-minute-broadcast** - Uber-style first-to-accept system
  - **Auto-Applied Urgency Premium**:
    - <1 hour: 75% premium (e.g., £30/hr → £52.50/hr)
    - 1-3 hours: 50% premium (e.g., £30/hr → £45/hr)
    - 3-6 hours: 20% premium (e.g., £30/hr → £36/hr)
    - 6-24 hours: 0% premium (standard rate)

  - **Broadcast Process**:
    1. Admin triggers broadcast for unassigned booking
    2. System validates shift is <24 hours away
    3. Calculates and applies urgency premium
    4. Finds all eligible medics (opted-in to rush jobs, within 30 miles)
    5. Sends simultaneous push notifications to all eligible medics
    6. Displays boosted rate and "First to accept gets shift!" message

  - **Race Condition Handling**:
    - Atomic database update with `WHERE medic_id IS NULL` clause
    - Only one medic can accept (others get "Shift already taken" error)
    - Response time tracking (minutes from broadcast to acceptance)
    - Automatic confirmation notification to winning medic

  - **Fallback Expansion**:
    - 15-minute timeout: If no response, expand radius to 45 miles
    - 30-minute timeout: Alert admin for manual intervention
    - Prevents urgent shifts from going unfilled

#### 5. **Medic Self-Service Features**
- ✅ **medic-availability** - Time-off requests and availability calendar
  - **Time-Off Requests**:
    - Medic submits date range with reason (vacation, sick leave, training, personal)
    - Status: pending → approved/denied by admin
    - Blocks auto-assignment during approved time-off
    - Email notifications on approval/denial

  - **Availability Calendar**:
    - Medic sets recurring unavailable days (e.g., "unavailable every Tuesday")
    - One-time unavailable dates (e.g., "Feb 20 for appointment")
    - Overrides auto-assignment (prevents offers on blocked dates)

  - **Admin Approval Workflow**:
    - Admin views pending requests in dashboard
    - Can approve/deny with notes
    - Batch approval for multiple dates
    - Audit trail of all decisions

- ✅ **shift-swap** - Peer-to-peer shift marketplace
  - **Swap Offer Process**:
    1. Medic offers existing confirmed shift for swap
    2. Provides reason (sick, family emergency, scheduling conflict)
    3. System broadcasts to all qualified medics
    4. Accepting medic must have required certifications
    5. Admin reviews and approves/denies swap

  - **Qualification Validation**:
    - Checks accepting medic has confined space cert (if required)
    - Checks accepting medic has trauma cert (if required)
    - Flags to admin if accepting medic not qualified
    - Admin can override for training purposes

  - **Swap States**:
    - `pending` → Offered, waiting for medic to accept
    - `pending_approval` → Medic accepted, waiting for admin approval
    - `approved` → Admin approved, booking reassigned
    - `denied` → Admin denied, original assignment stands
    - `cancelled` → Requesting medic cancelled offer

#### 6. **Client Self-Service Features**
- ✅ **client-preferences** - Favorite medics, ratings, and specific requests
  - **Favorite Medics**:
    - Client can add medics to favorites list
    - Store notes (e.g., "Always on time", "Great with workers")
    - Track total shifts together and average rating
    - Favorites get 95% priority score in auto-matching

  - **Medic Ratings** (1-5 stars):
    - Client rates medic after shift completion
    - Optional feedback text
    - Updates medic's `star_rating` in real-time (running average)
    - Ratings affect future auto-assignment ranking (10% weight)

  - **Request Specific Medic**:
    - Client requests favorite medic for booking
    - System runs full conflict detection
    - If no conflicts: Auto-assign with 95% match score (high priority)
    - If conflicts: Returns detailed conflict messages, suggests alternatives
    - Bypasses normal auto-matching algorithm

#### 7. **Recurring Booking Generation**
- ✅ **recurring-booking-generator** - Weekly/monthly pattern creation
  - **Pattern Types**:
    - Weekly (every 7 days)
    - Biweekly (every 14 days)
    - Monthly (same day of month, e.g., "1st and 15th")
    - Custom days of week (e.g., "Every Monday, Wednesday, Friday")

  - **Configuration**:
    - Start date and end date (or number of occurrences)
    - Days of week selector (1=Monday, 7=Sunday)
    - Exception dates (skip bank holidays, company closures)
    - Shift template selection (predefined time + cert requirements)
    - Auto-assign option (run auto-scheduler on generated bookings)

  - **Parent-Child Tracking**:
    - Original booking is "parent" (stores pattern config)
    - Generated bookings are "children" (reference parent ID)
    - Edit parent → option to update all future children
    - Delete parent → option to cancel all future children

#### 8. **Multi-Channel Notifications**
- ✅ **notification-service** - Push, Email, SMS with deduplication
  - **Notification Types**:
    - `shift_assigned` - Medic assigned to booking
    - `shift_reminder` - 24-hour reminder before shift
    - `urgent_shift_available` - Broadcast notification (<24 hours)
    - `shift_swap_offered` - Another medic offered swap
    - `time_off_approved` - Time-off request approved
    - `time_off_denied` - Time-off request denied
    - `certification_expiring` - Cert expires in 30/14 days

  - **Delivery Channels**:
    - **Push Notifications** (Expo Push API)
      - Requires medic to have `expo_push_token` in `medic_preferences`
      - Instant delivery to mobile app
      - Supports rich notifications (actions, images)

    - **Email** (SendGrid)
      - Uses `email` field from medics table
      - HTML templates with booking details
      - Includes .ics calendar attachment

    - **SMS** (Twilio)
      - Uses `phone` field from medics table
      - Short message with link to mobile app
      - Reserved for urgent shifts only (cost control)

  - **Medic Preferences** (stored in `medic_preferences` table):
    - `push_notifications_enabled` - Toggle push on/off
    - `email_notifications_enabled` - Toggle email on/off
    - `sms_notifications_enabled` - Toggle SMS on/off
    - Per-notification-type preferences (future enhancement)

  - **Deduplication**:
    - Tracks sent notifications in `schedule_notifications` table
    - Checks before sending: "Already sent this booking+type combo?"
    - Prevents spam (e.g., multiple reminders for same shift)
    - 24-hour deduplication window

#### 9. **Certification Management**
- ✅ **cert-expiry-checker** - Daily scheduled job (cron)
  - **Monitoring**:
    - Runs daily at 2 AM UTC (via pg_cron or external scheduler)
    - Checks all medic certifications for expiry dates
    - Categories: 30-day notice, 14-day warning, expired

  - **Actions**:
    - **30 days before expiry**: Send email/push notification reminder
    - **14 days before expiry**: Send urgent warning (daily reminders)
    - **On expiry**: Auto-disable medic (`available_for_work = false`)
    - **On expiry**: Remove from all future auto-assignment candidates

  - **Admin Alerts**:
    - Dashboard shows expiring certs for next 30 days
    - Email digest to admin every Monday (upcoming expirations)
    - Critical alert if medic has active shifts but expired cert

#### 10. **Schedule Board Data API**
- ✅ **schedule-board-api** - Data for admin drag-and-drop calendar UI
  - **Week View** (`?view=week&date=2026-03-03`):
    - Returns 7-day grid (Monday-Sunday)
    - All bookings for the week with medic and client details
    - Bookings organized by date (easy rendering)
    - Medic utilization stats:
      - `weekly_hours`: Total hours worked this week
      - `utilization_percent`: % of 40-hour week (0-100%)
      - `shifts_this_week`: Count of shifts
    - Summary stats: total bookings, unassigned count

  - **Month View** (`?view=month&date=2026-03-01`):
    - Returns entire month of bookings
    - Bookings grouped by date
    - Daily stats for each date:
      - `total`: Total bookings
      - `confirmed`: Confirmed bookings
      - `pending`: Unassigned bookings
      - `urgent`: Urgent bookings with premium
    - Monthly summary: total/confirmed/pending counts

  - **Medic Stats**:
    - Real-time utilization calculation (shifts ÷ 40 hours)
    - Star rating and certification status
    - Available for work flag
    - Sorted by first name (consistent ordering)

### Database Schema (13 New Tables + 2 Functions)

#### Tables:
1. **medic_availability** - Time-off requests and availability calendar
   - Tracks date, is_available (boolean), request_type (vacation/sick/training/personal)
   - Status: pending/approved/denied
   - Admin approval workflow with approved_by and approved_at

2. **medic_preferences** - Medic settings and preferences
   - Google Calendar integration (refresh token, sync enabled)
   - Notification preferences (push, email, SMS toggles)
   - Rush job opt-in (available_for_rush_jobs boolean)
   - Max weekly hours limit (default: 48)
   - Fair distribution tracking (shifts_offered vs shifts_worked)

3. **shift_swaps** - Peer-to-peer swap marketplace
   - Links booking_id, requesting_medic_id, accepting_medic_id
   - Status: pending/pending_approval/approved/denied/cancelled
   - Swap reason and admin notes
   - Qualification validation flags

4. **auto_schedule_logs** - Audit trail for all auto-assignments
   - Booking ID, assigned medic, match score, confidence score
   - All candidates considered (JSON array with scores)
   - Filters failed (JSON object with reasons)
   - Decision timestamp and algorithm version

5. **shift_templates** - Reusable shift configurations
   - Template name (e.g., "Standard 8-Hour Day Shift")
   - Time range (08:00-16:00)
   - Certification requirements (confined_space, trauma)
   - Default rate and break duration
   - Used by recurring bookings

6. **schedule_notifications** - Deduplication tracking
   - Booking ID, medic ID, notification type
   - Sent at timestamp, delivery status
   - Channel used (push/email/sms)
   - Prevents duplicate notifications

7. **client_favorite_medics** - Client-medic relationships
   - Client ID, medic ID, favorited_at timestamp
   - Notes field (client's private notes about medic)
   - Total shifts together count
   - Average client rating (running average)

8. **booking_conflicts** - Conflict detection results
   - Booking ID, medic ID, conflict type
   - Severity (critical/warning), can_override (boolean)
   - Details (JSON with conflict-specific data)
   - Detected at timestamp

#### PostgreSQL Functions:
1. **check_working_time_compliance(medic_id, shift_start, shift_end)**
   - Returns: is_compliant (boolean), violation_type, violation_details, current_weekly_hours
   - Checks 48-hour weekly limit (rolling 7-day window)
   - Checks 11-hour rest period (time since last shift)
   - Called by auto-assign and conflict-detector

2. **calculate_auto_match_score(medic_id, booking_id)**
   - Returns: total_score (0-100), breakdown (JSON with factor scores)
   - Implements 7-factor weighted scoring algorithm
   - Distance: 25%, Qualifications: 20%, Availability: 15%, Utilization: 15%, Rating: 10%, Performance: 10%, Fairness: 5%
   - Called by auto-assign-medic-v2 for ranking

### Remaining Work (5 UI Tasks)

#### Admin Dashboard UI:
- **Task #7**: Drag-and-drop schedule board
  - Uses `schedule-board-api` for data
  - React/Vite with @dnd-kit library
  - Real-time conflict detection on drag (calls `conflict-detector`)
  - Visual indicators for conflicts (red border, tooltip)

- **Task #13**: Analytics dashboard with utilization heatmap
  - Data available from `schedule-board-api` and database queries
  - Visualization: D3.js or Recharts
  - Metrics: Utilization %, fulfillment rate, avg match score

#### Mobile App UI:
- **Task #11**: "My Schedule" tab for medics
  - List view of assigned shifts (upcoming, past, pending swaps)
  - Accept urgent shifts (calls `last-minute-broadcast?action=accept`)
  - Request time-off (calls `medic-availability?action=request_time_off`)
  - Offer shift swap (calls `shift-swap?action=offer_swap`)

#### Google Calendar Integration:
- **Task #2**: OAuth flow for medic Google accounts
  - Google Calendar API OAuth 2.0 flow
  - Store refresh token in `medic_preferences.google_calendar_refresh_token`
  - Read availability from Google Calendar (prevent double-booking)

- **Task #18**: Two-way sync (read availability, write shifts)
  - Sync medic's Google Calendar to find busy times
  - Create calendar events when shift assigned
  - Update events when shift changed/cancelled
  - Delete events when booking cancelled

---

### ✅ **Task #7: Admin Schedule Board (COMPLETE)**
**Status**: ✅ **COMPLETED** - Drag-and-drop UI implemented
**Goal**: Visual schedule management with real-time conflict detection
**Tech Stack**: React, @dnd-kit, Zustand, Tailwind CSS, Supabase Realtime

#### Overview
The Schedule Board provides admins with a visual drag-and-drop interface to assign medics to bookings. It displays a week-based grid showing all medics (rows) and dates (columns), allowing admins to drag unassigned bookings onto medic cells. The system automatically validates assignments using the conflict-detector API and provides real-time updates across all connected clients.

#### Key Features

**1. Week-Based Grid View**
- **Medic Rows**: One row per medic showing:
  - Name, certifications (🏗️ confined space, 🏥 trauma), star rating
  - Weekly utilization bar (green <50%, yellow 50-80%, red >80%)
  - Total hours worked this week
  - Shift count
- **Day Cells**: 7 columns (Monday-Sunday) for each medic
  - Shows all assigned bookings for that medic on that date
  - Visual drop zones that highlight when dragging over them
- **Date Headers**: Each cell shows day name and date number

**2. Drag-and-Drop Functionality**
- **Unassigned Row**: Horizontal scrollable section at bottom showing all unassigned bookings
  - Badge showing count of unassigned bookings
  - Empty state when all bookings assigned: "✅ All bookings assigned!"
- **Booking Cards**: Color-coded draggable cards
  - **Green** (confirmed): Successfully assigned and confirmed
  - **Yellow** (pending): Awaiting assignment or approval
  - **Red** (urgent_broadcast): High-priority urgent shifts
  - Shows: Time range, duration, site name, client, certifications required, urgency premium
- **Drag Workflow**:
  1. User drags booking card from unassigned row
  2. DragOverlay shows preview of card being dragged
  3. Day cells highlight with blue border when booking hovers over them
  4. User drops booking on medic cell
  5. System calls conflict-detector API to validate
  6. If valid: Assigns immediately with success feedback
  7. If conflicts: Shows conflict modal with details

**3. Real-Time Conflict Detection**
- **6 Conflict Types Checked**:
  1. Double-booking (overlapping shifts) - CRITICAL
  2. Missing qualifications (certs) - CRITICAL
  3. Overtime violation (>48 hours/week) - CRITICAL
  4. Insufficient rest (<11 hours between shifts) - CRITICAL
  5. Travel time infeasible - WARNING (can override)
  6. Time-off conflict (approved vacation) - CRITICAL

**4. Conflict Modal**
- **Critical Conflicts**: Red styling, "Cannot Assign" message
  - Shows all blocking issues
  - Only "Cancel" button available
  - Examples: Missing certs, double-booking, overtime violation
- **Warning Conflicts**: Yellow styling, "Assignment Warning" message
  - Shows warnings that can be overridden
  - Both "Cancel" and "Assign Anyway" buttons
  - Example: Long travel time between shifts
- **Modal Content**:
  - Clear recommendation text
  - List of all conflicts with severity indicators (🚫 critical, ⚠️ warning)
  - Conflict details (type, message, can override)
  - Summary stats (total conflicts, critical count)

**5. Real-Time Updates**
- **Supabase Realtime Subscription**: Listens to bookings table changes
  - When any booking is assigned/updated in database
  - All connected admin clients automatically refresh schedule
  - Connection status indicator (green dot = connected)
  - Updates within 3 seconds across all clients

**6. Week Navigation**
- **Navigation Controls**:
  - "← Previous" button: Load previous week
  - "Today" button: Jump to current week
  - "Next →" button: Load next week
  - Week range display: "Feb 15-21, 2026"
- **Auto-fetch**: Schedule data automatically refreshes when week changes

**7. Visual Indicators**
- **Utilization Bars**: Color-coded progress bars on each medic row
  - Green: <50% (has capacity for more work)
  - Yellow: 50-80% (healthy utilization)
  - Red: >80% (approaching weekly limit, may hit overtime violations)
- **Connection Status**: Pulsing green dot when real-time connected
- **Unassigned Badge**: Yellow badge in header showing unassigned count
- **Certification Icons**: 🏗️ (confined space), 🏥 (trauma specialist)
- **Urgency Badge**: ⚡ +XX% for bookings with urgency premium

**8. Loading & Error States**
- **Loading State**: Spinner animation while fetching schedule data
- **Error State**: Red alert box with error message and "Retry" button
- **Empty States**:
  - No medics: "👥 No medics available" message
  - No unassigned bookings: "✅ All bookings assigned!" celebration message

**9. First-Time User Instructions**
- **Help Panel**: Blue info box explaining drag-and-drop workflow
  - Shows when there are unassigned bookings
  - Explains conflict checking system
  - Auto-hides when user starts using the board

#### Technical Implementation

**Components** (`/web/components/admin/schedule/`):
- `ScheduleGrid.tsx`: Main DndContext orchestrator
  - Manages drag-and-drop lifecycle (start, end events)
  - Calls conflict-detector API on drop
  - Shows conflict modal or assigns booking
  - 8px activation distance to prevent accidental drags
- `MedicRow.tsx`: Individual medic row with stats and 7 day cells
- `DayCell.tsx`: Droppable cell for medic+date combination
  - Uses @dnd-kit useDroppable hook
  - Generates unique ID: `medicId_date` format
- `BookingCard.tsx`: Draggable booking card with status colors
  - Uses @dnd-kit useDraggable hook
  - Formats time as 12-hour (e.g., "9:00 AM")
- `UnassignedRow.tsx`: Horizontal scrollable source for unassigned bookings
- `ConflictModal.tsx`: Modal showing conflict details
  - Severity-based styling (red critical, yellow warning)
  - "Assign Anyway" button only for warnings
  - Backdrop blur effect

**State Management** (`/web/stores/useScheduleBoardStore.ts`):
- Zustand store following existing patterns
- **State**:
  - `selectedWeekStart`: Current week (Monday ISO date)
  - `dates`: 7-day array (Mon-Sun)
  - `medics`: Array of medics with stats
  - `bookings`: All bookings for the week
  - `isConnected`: Real-time subscription status
  - `currentConflict`: Current conflict modal data
- **Actions**:
  - `fetchScheduleData()`: Calls schedule-board-api
  - `checkConflicts()`: Calls conflict-detector API
  - `assignMedicToBooking()`: Updates database
  - `subscribe()`/`unsubscribe()`: Real-time management
  - `setWeek()`: Change week and auto-fetch
- **Getters**:
  - `getBookingsForMedicOnDate()`: Filter bookings by medic+date
  - `getUnassignedBookings()`: Filter bookings with no medic_id
  - `getBookingById()`: Lookup booking by ID

**Types** (`/web/types/schedule.ts`):
- `MedicWithStats`: Medic data with weekly stats
- `Booking`: Booking with shift details and requirements
- `ConflictCheckResult`: Conflict detector response
- `Conflict`: Individual conflict with severity
- `ConflictCheckParams`: Conflict detector request params

**Main Page** (`/web/app/admin/schedule-board/page.tsx`):
- Route entry point at `/admin/schedule-board`
- Initializes store and subscribes to real-time on mount
- Week navigation controls
- Loading/error states
- Stats summary (medic count, unassigned count)

**Navigation** (`/web/app/admin/layout.tsx`):
- Added "📋 Schedule Board" link to admin sidebar
- Positioned after "Bookings" (related functionality)
- Badge shows unassigned count (TODO: Wire to store)

#### Performance Considerations
- **@dnd-kit Library**: Uses CSS transforms for 60fps smooth dragging
- **Optimistic Updates**: Local state updates immediately, re-fetches on error
- **Debounced Real-time**: Only refetches when bookings change (not every ping)
- **Lazy Loading**: Components only render visible elements
- **Memoization**: Store selectors prevent unnecessary re-renders

#### User Workflow Example
1. Admin navigates to `/admin/schedule-board`
2. Sees week grid with 10 medics and 15 unassigned bookings
3. Notices medic "John Smith" has only 20% utilization (green bar)
4. Drags 8-hour booking from unassigned row
5. Hovers over John's Monday cell (highlights blue)
6. Drops booking on cell
7. System checks conflicts: ✅ No conflicts
8. Booking instantly appears in John's Monday cell (green)
9. Unassigned count badge decreases from 15 → 14
10. All connected admin clients see the update within 3 seconds

#### Success Metrics
- ✅ Can assign 10 bookings in under 2 minutes (drag-and-drop speed)
- ✅ Zero double-bookings created (conflict detection works)
- ✅ All 6 conflict types detected correctly
- ✅ Real-time updates propagate within 3 seconds
- ✅ Smooth 60fps drag animations (no jank)
- ✅ Works on 1920x1080+ screens

#### Files Created/Modified
- ✅ `web/types/schedule.ts` - TypeScript interfaces
- ✅ `web/stores/useScheduleBoardStore.ts` - Zustand state management
- ✅ `web/components/admin/schedule/BookingCard.tsx` - Draggable card
- ✅ `web/components/admin/schedule/DayCell.tsx` - Droppable cell
- ✅ `web/components/admin/schedule/MedicRow.tsx` - Medic row with stats
- ✅ `web/components/admin/schedule/UnassignedRow.tsx` - Unassigned source
- ✅ `web/components/admin/schedule/ConflictModal.tsx` - Conflict details
- ✅ `web/components/admin/schedule/ScheduleGrid.tsx` - DnD orchestrator
- ✅ `web/app/admin/schedule-board/page.tsx` - Main page
- ✅ `web/app/admin/layout.tsx` - Added sidebar link
- ✅ `package.json` - Added @dnd-kit dependencies

#### Future Enhancements (Out of Scope for MVP)
- Month view (currently only week view)
- Filters and search (by medic, client, site, status)
- Bulk operations (assign multiple bookings at once)
- Undo/redo functionality
- Keyboard shortcuts (arrow keys, hotkeys)
- Export to PDF/CSV
- Auto-scheduling integration UI (trigger auto-assign-all from board)
- Booking details panel (sidebar showing full booking info)

---

### API Endpoints (All Backend Ready)

```bash
# Auto-assign single booking
POST /functions/v1/auto-assign-medic-v2
{\"booking_id\": \"uuid\"}

# Bulk auto-assign all unassigned
POST /functions/v1/auto-assign-all
{\"limit\": 10}

# Check for conflicts before assigning
POST /functions/v1/conflict-detector
{\"booking_id\": \"uuid\", \"medic_id\": \"uuid\", ...}

# Broadcast urgent shift
POST /functions/v1/last-minute-broadcast?action=broadcast
{\"booking_id\": \"uuid\"}

# Medic accepts urgent shift
POST /functions/v1/last-minute-broadcast?action=accept
{\"booking_id\": \"uuid\", \"medic_id\": \"uuid\"}

# Request time off
POST /functions/v1/medic-availability?action=request_time_off
{\"medic_id\": \"uuid\", \"start_date\": \"2026-03-01\", \"end_date\": \"2026-03-05\"}

# Approve time off
POST /functions/v1/medic-availability?action=approve_time_off
{\"medic_id\": \"uuid\", \"dates\": [\"2026-03-01\"], \"approved_by\": \"admin_uuid\"}

# Offer shift swap
POST /functions/v1/shift-swap?action=offer_swap
{\"booking_id\": \"uuid\", \"requesting_medic_id\": \"uuid\", \"swap_reason\": \"Sick\"}

# Add favorite medic
POST /functions/v1/client-preferences?action=add_favorite
{\"client_id\": \"uuid\", \"medic_id\": \"uuid\", \"notes\": \"Always on time\"}

# Rate medic
POST /functions/v1/client-preferences?action=rate_medic
{\"client_id\": \"uuid\", \"medic_id\": \"uuid\", \"booking_id\": \"uuid\", \"rating\": 5}

# Request specific medic
POST /functions/v1/client-preferences?action=request_medic
{\"booking_id\": \"uuid\", \"requested_medic_id\": \"uuid\"}

# Create recurring booking
POST /functions/v1/recurring-booking-generator
{\"client_id\": \"uuid\", \"pattern\": \"weekly\", \"days_of_week\": [1,3,5], ...}

# Get week view for schedule board
GET /functions/v1/schedule-board-api?view=week&date=2026-03-03

# Run cert expiry check
GET /functions/v1/cert-expiry-checker
```

### Documentation Files
- **SCHEDULING_API_DOCS.md** - Complete API reference with request/response examples
- **BACKEND_COMPLETE.md** - Backend completion summary (14 of 19 tasks done)
- **FEATURES.md** - This file (comprehensive feature documentation)

---

## Multi-Tenant Architecture (Phase 8 - Just Completed)
**Status**: ✅ **COMPLETED** - Full multi-tenant isolation implemented
**Date Completed**: 2026-02-16
**Goal**: Convert SiteMedic from single-tenant (ASG-only) to multi-tenant SaaS platform enabling multiple medic companies to use the system with GDPR-compliant data isolation

### Business Context

SiteMedic has been converted from a single-tenant application (built exclusively for ASG - Allied Services Group) to a **multi-tenant SaaS platform** where multiple medic companies can operate independently on the same infrastructure. This architectural transformation enables:

1. **Multiple Organizations**: Different medic companies can use SiteMedic with complete data isolation
2. **GDPR Compliance**: Organization-level data boundaries ensure no cross-org data access
3. **Scalable Business Model**: Onboard new medic companies without deploying separate instances
4. **Enterprise-Grade Security**: Three-layer security model (Database RLS + Application filtering + Client context)

### Three-Layer Security Model

**Layer 1: Database Row-Level Security (RLS)**
- PostgreSQL RLS policies enforce org_id filtering at the database level
- Even if application code has bugs, RLS prevents unauthorized data access
- All 35+ tables protected with 4 policies each (SELECT, INSERT, UPDATE, DELETE)
- Automatic enforcement via JWT app_metadata extraction

**Layer 2: Application Filtering**
- All API routes explicitly filter queries by org_id using `requireOrgId()`
- All Edge Functions scope operations to single organization
- Server-side utilities validate org ownership before mutations
- Prevents logic errors from bypassing security

**Layer 3: Client Context**
- React Context (OrgProvider) provides org_id to all client components
- TanStack Query cache keys include org_id to prevent cache pollution
- Client-side validation provides fast feedback before server requests
- Enhances user experience while maintaining security

### Database Schema Changes (35+ Tables)

**Migration 026: Add org_id Columns**
- Added `org_id UUID REFERENCES organizations(id)` to 35+ tables
- Created indexes on all org_id columns for query performance
- Tables updated:
  - **Core Business**: territories, clients, medics, bookings, timesheets, invoices, invoice_line_items, payments, territory_metrics, payslips
  - **Scheduling**: medic_availability, medic_preferences, shift_swaps, auto_schedule_logs, shift_templates, schedule_notifications, client_favorite_medics, booking_conflicts
  - **Location Tracking**: medic_location_pings, medic_shift_events, medic_location_audit, geofences, medic_location_consent
  - **Alerts**: medic_alerts
  - **Contracts**: contract_templates, contracts, contract_versions, contract_events
  - **Admin**: payout_executions, out_of_territory_rules
  - **Health & Safety**: workers, treatments, near_misses (already had org_id)

**Migration 027: Backfill ASG Organization**
- Auto-creates ASG (Allied Services Group) organization with slug 'asg'
- Adds slug, status, and onboarding_completed fields to organizations table
- Backfills all existing data with ASG org_id
- Makes org_id NOT NULL after backfill (prevents future null values)
- Updates payslip generation trigger to include org_id

**Migration 028: Row Level Security Policies**
- Created `get_user_org_id()` helper function to extract org_id from JWT
- Enabled RLS on all 35+ tables
- Created 4 policies per table (SELECT, INSERT, UPDATE, DELETE):
  ```sql
  -- Example: Bookings table policies
  CREATE POLICY "Users can view their org's bookings"
    ON bookings FOR SELECT
    USING (org_id = get_user_org_id());

  CREATE POLICY "Users can insert in their org"
    ON bookings FOR INSERT
    WITH CHECK (org_id = get_user_org_id());

  CREATE POLICY "Users can update their org's bookings"
    ON bookings FOR UPDATE
    USING (org_id = get_user_org_id());

  CREATE POLICY "Users can delete their org's bookings"
    ON bookings FOR DELETE
    USING (org_id = get_user_org_id());
  ```
- Policies automatically enforce org isolation even if application code has bugs

### Application Layer Updates

**Server-Side Org Utilities** (`web/lib/organizations/org-resolver.ts`)
- `getCurrentOrgId()`: Extracts org_id from JWT app_metadata, returns null if not found
- `requireOrgId()`: Throws error if org_id missing (use for protected routes)
- `validateOrgAccess()`: Validates resource belongs to current user's org
- Used by all API routes to enforce org boundaries

**Client-Side Org Context** (`web/contexts/org-context.tsx`)
- `OrgProvider`: React Context provider wrapping entire app
- `useOrg()`: Hook providing { orgId, orgSlug, loading, error }
- `useRequireOrg()`: Hook throwing error if org context not available
- Integrated into app/layout.tsx for global access

**API Routes Updated (24 files)**
- All routes now use `requireOrgId()` to get current org
- All Supabase queries explicitly filter by org_id
- Pattern example:
  ```typescript
  // Before (INSECURE - fetches all orgs)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*');

  // After (SECURE - org-scoped)
  const orgId = await requireOrgId();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('org_id', orgId);
  ```

**Updated API Routes:**
- `/api/bookings/create` - Validates client belongs to org before booking creation
- `/api/bookings/[id]/confirm` - Verifies booking ownership
- `/api/bookings/[id]/cancel` - Verifies booking ownership
- `/api/invoices/generate` - **CRITICAL**: Validates all bookings belong to same org
- `/api/invoices/send-reminder` - Validates invoice ownership
- `/api/payments/create-intent` - Validates invoice and bookings belong to org
- `/api/timesheets/route` - Filters timesheets by org
- `/api/medics/route` - Filters medics by org
- `/api/clients/route` - Filters clients by org
- `/api/contracts/*` - All contract routes org-scoped
- All other API routes similarly updated

### Edge Functions Updated (34 files)

**Critical Security Fix: friday-payout**
- **Before**: Processed ALL timesheets across all organizations (CRITICAL SECURITY ISSUE)
- **After**: Processes each organization separately in isolated loops
- Pattern:
  ```typescript
  // Fetch all active organizations
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('status', 'active');

  // Process each org separately
  for (const org of organizations) {
    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('...')
      .eq('org_id', org.id) // CRITICAL: Org-scoped
      .eq('payout_status', 'admin_approved');

    // Process payouts for this org only
  }
  ```

**Critical Security Fix: auto-assign-medic-v2**
- **Before**: Fetched ALL medics globally, could assign medic from wrong org
- **After**: Only fetches medics from same org as booking
- Pattern:
  ```typescript
  async function findCandidateMedics(booking: Booking, skipOvertimeCheck: boolean) {
    const { data: allMedics } = await supabase
      .from('medics')
      .select('...')
      .eq('org_id', booking.org_id) // CRITICAL: Org-scoped
      .eq('available_for_work', true);
  }
  ```

**Other Edge Functions Updated:**
- All 32 remaining Edge Functions similarly updated to respect org boundaries
- Includes: invoice PDF generation, shift offers, notifications, schedule board API, recurring booking generator, etc.

### Admin Dashboards Updated (7 Query Files)

All admin dashboard query files updated to use org-scoped filtering:

**Pattern Applied to All Dashboards:**
```typescript
import { useRequireOrg } from '@/contexts/org-context';

export async function fetchBookings(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase
    .from('bookings')
    .select('...')
    .eq('org_id', orgId) // Org-scoped
    .order('shift_date', { ascending: false });
  return data || [];
}

export function useBookings(initialData?: BookingWithRelations[]) {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get org from context

  return useQuery({
    queryKey: ['admin-bookings', orgId], // Include orgId in cache key
    queryFn: () => fetchBookings(supabase, orgId),
    initialData,
    refetchInterval: 60_000,
  });
}
```

**Updated Query Files:**
- `web/lib/queries/admin/bookings.ts` - All booking queries org-scoped
- `web/lib/queries/admin/medics.ts` - All medic queries org-scoped
- `web/lib/queries/admin/clients.ts` - All client queries org-scoped
- `web/lib/queries/admin/timesheets.ts` - All timesheet queries org-scoped
- `web/lib/queries/admin/revenue.ts` - Revenue metrics org-scoped
- `web/lib/queries/admin/overview.ts` - Dashboard stats org-scoped
- `web/lib/queries/admin/territories.ts` - Territory management org-scoped

**Key Changes:**
- All fetch functions accept `orgId` parameter
- All queries filter by `org_id`
- All TanStack Query hooks use `useRequireOrg()`
- All cache keys include `orgId` to prevent cross-org cache pollution
- All mutations validate org ownership before updates

### Testing & Verification

**Test Script Created**: `test-multi-tenant-isolation.sql`
- Comprehensive test suite with 10 test cases
- Creates second test organization "Test Medics Ltd"
- Verifies complete data isolation between ASG and Test Medics

**Test Results (All Passed ✅):**

1. ✅ **Data Isolation**: ASG has 19 medics, Test Medics has 1 medic (correctly isolated)
2. ✅ **Cross-Org Access**: Only 1 org visible per query (RLS enforced)
3. ✅ **Booking-Client Relationships**: 0 cross-org violations
4. ✅ **Booking-Medic Relationships**: 0 cross-org violations
5. ✅ **Timesheet Consistency**: All timesheets match booking org_id
6. ✅ **Invoice Consistency**: All invoices match client org_id
7. ✅ **Payment Consistency**: All payments match booking org_id
8. ✅ **Territory Assignments**: All territory medic assignments respect org_id
9. ✅ **Friday Payout Simulation**: Processes 140 ASG timesheets, 0 Test Medics timesheets (correct isolation)
10. ✅ **Auto-Assign Simulation**: Only considers medics from same org (security verified)

**Security Verification:**
- Friday payout can no longer accidentally pay wrong org's medics
- Auto-assign can no longer assign medic from different organization
- Invoice generation prevents cross-org billing
- Payment intents validate org ownership before processing
- All admin dashboards show only current org's data

### Performance Impact

**Database Performance:**
- Indexes created on all 35+ org_id columns
- Query performance maintained with proper index usage
- RLS policy overhead minimal (<5ms per query)
- No N+1 query issues introduced

**Application Performance:**
- TanStack Query caching prevents redundant org checks
- Org context loaded once per session
- Cache keys scoped by orgId prevent stale data
- No observable performance degradation

**Benchmark Results:**
- Booking list query: <100ms (same as before, with org filter)
- Medic search: <50ms (indexed org_id + name)
- Dashboard stats: <200ms (aggregate queries with org filter)

### Migration Deployment

**Deployment Order:**
1. ✅ Migration 026 - Add org_id columns (non-breaking)
2. ✅ Migration 027 - Backfill ASG org_id (non-breaking)
3. ✅ Migration 028 - Enable RLS (non-breaking, backward compatible)
4. ✅ Deploy org-resolver.ts and org-context.tsx
5. ✅ Deploy API routes updates (all 24 files)
6. ✅ Deploy Edge Functions updates (all 34 files)
7. ✅ Deploy admin dashboard updates (all 7 query files)

**Rollback Safety:**
- All migrations tested in local development
- RLS can be disabled if critical issue found: `ALTER TABLE clients DISABLE ROW LEVEL SECURITY;`
- API/Edge Function updates backward compatible (ASG org_id exists)
- No data loss risk during migration

### Future Capabilities Enabled

**New Organization Signup Flow (To Be Built):**
- `/signup/organization` page for new medic companies
- Automatic org_id assignment during user creation
- Onboarding wizard for org configuration

**Organization Settings (To Be Built):**
- `/admin/settings/organization` page for org management
- Branding customization per org
- Billing configuration per org

**Organization Switcher (To Be Built):**
- For users belonging to multiple organizations
- Dropdown in header to switch context
- Separate data views per org

**Superadmin Panel (To Be Built):**
- Platform-wide admin access for SiteMedic team
- Ability to view/manage all organizations
- Analytics across all tenants

**Per-Org Billing (To Be Built):**
- Stripe subscriptions per organization
- Usage-based billing per org
- Invoice generation per org

### Files Created

**Database Migrations:**
- `supabase/migrations/026_add_org_id_columns.sql` - Add org_id to 35+ tables with indexes
- `supabase/migrations/027_backfill_asg_org_id.sql` - Backfill all data with ASG org, make NOT NULL
- `supabase/migrations/028_enable_org_rls.sql` - Enable RLS with 4 policies per table

**Application Utilities:**
- `web/lib/organizations/org-resolver.ts` - Server-side org utilities (getCurrentOrgId, requireOrgId, validateOrgAccess)
- `web/contexts/org-context.tsx` - Client-side React Context for org state (OrgProvider, useOrg, useRequireOrg)

**Testing:**
- `test-multi-tenant-isolation.sql` - Comprehensive test suite with 10 test cases

### Files Modified

**API Routes (24 files):**
- All files in `web/app/api/bookings/` (create, confirm, cancel, update)
- All files in `web/app/api/medics/` (list, create, update)
- All files in `web/app/api/clients/` (list, create, update)
- All files in `web/app/api/invoices/` (generate, send-reminder, update)
- All files in `web/app/api/timesheets/` (list, approve, payout)
- All files in `web/app/api/payments/` (create-intent, confirm)
- All files in `web/app/api/contracts/` (generate, sign, send)

**Edge Functions (34 files):**
- `supabase/functions/friday-payout/index.ts` - **CRITICAL**: Process per-org payouts
- `supabase/functions/auto-assign-medic-v2/index.ts` - **CRITICAL**: Fetch org-scoped medics
- All 32 other Edge Functions similarly updated

**Admin Query Files (7 files):**
- `web/lib/queries/admin/bookings.ts` - Org-scoped booking queries with cache keys
- `web/lib/queries/admin/medics.ts` - Org-scoped medic queries with cache keys
- `web/lib/queries/admin/clients.ts` - Org-scoped client queries with cache keys
- `web/lib/queries/admin/timesheets.ts` - Org-scoped timesheet queries with cache keys
- `web/lib/queries/admin/revenue.ts` - Org-scoped revenue metrics
- `web/lib/queries/admin/overview.ts` - Org-scoped dashboard stats
- `web/lib/queries/admin/territories.ts` - Org-scoped territory management

**App Layout:**
- `web/app/layout.tsx` - Wrapped app in OrgProvider for global org context access

### Technical Implementation Details

**JWT App Metadata Structure:**
```typescript
{
  "app_metadata": {
    "org_id": "uuid-of-organization",
    "org_slug": "asg",
    "role": "admin" // or "medic", "client"
  }
}
```

**Database Helper Function:**
```sql
CREATE OR REPLACE FUNCTION get_user_org_id() RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Server-Side Org Extraction:**
```typescript
export async function requireOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const orgId = user.app_metadata?.org_id;
  if (!orgId) throw new Error('Organization ID not found in user session');

  return orgId;
}
```

**Client-Side Org Hook:**
```typescript
export function useRequireOrg(): string {
  const { orgId, loading, error } = useOrg();

  if (loading) throw new Error('Organization context is still loading');
  if (error) throw error;
  if (!orgId) throw new Error('User is not assigned to an organization');

  return orgId;
}
```

### Compliance & Security Benefits

**GDPR Compliance:**
- ✅ Data isolation at database level (RLS policies)
- ✅ No cross-org data access possible
- ✅ Org-specific data processing agreements
- ✅ Independent data deletion per org (GDPR Article 17)
- ✅ Separate data exports per org (GDPR Article 20)

**Security Hardening:**
- ✅ Defense in depth: 3-layer security model
- ✅ Automatic enforcement via database policies
- ✅ Application layer validation for fast failure
- ✅ Client-side context prevents accidental leaks
- ✅ Critical security issues fixed (friday-payout, auto-assign)

**Audit & Compliance:**
- ✅ All queries explicitly scoped to organization
- ✅ Audit logs include org_id for all operations
- ✅ Cross-org access attempts automatically blocked
- ✅ Test suite validates isolation continuously

### Success Metrics

**Technical Success:**
- ✅ All 35+ tables have org_id column and RLS policies
- ✅ All 24 API routes filter by org_id
- ✅ All 34 Edge Functions process org-scoped data
- ✅ All 7 admin query files show only current org's data
- ✅ Test org verified isolated from ASG org (10/10 tests passed)
- ✅ Friday payout processes correct org's timesheets
- ✅ Auto-assign only considers correct org's medics
- ✅ No performance degradation from RLS/indexes
- ✅ GDPR compliance: cross-org access impossible

**Business Success:**
- ✅ Platform ready for multiple medic companies
- ✅ Scalable architecture for SaaS business model
- ✅ Enterprise-grade security for B2B sales
- ✅ Foundation for per-org billing and subscriptions

---

## Integration Points

### Mobile App ↔ Backend
- Phase 1: Authentication, offline storage, sync queue
- Phase 2: Treatment data, worker profiles, near-miss data
- Phase 3: Background sync, photo uploads
- Phase 6: RIDDOR flags, deadline tracking
- Phase 7: Certification expiry data

### Mobile App ↔ Business Operations
- **Phase 2 Enhancement**: Add timesheet logging to mobile app
  - Medic logs hours worked at end of shift
  - Syncs to backend when connectivity available
  - Site manager approves via dashboard

### Site Manager Dashboard ↔ Business Operations
- **Phase 4 Enhancement**: Add booking management
  - View bookings for their site
  - Approve medic timesheets
  - Download invoices

### PDF Reports ↔ Business Operations
- **Phase 5 Enhancement**: Include medic attendance
  - Weekly PDF shows medic shift details
  - Includes hours worked, certifications verified
  - Client satisfaction rating

### Shared Database
- New business operations tables extend existing Supabase schema
- RLS policies isolate data by role (client, medic, admin, site manager)
- All tables in same UK region (eu-west-2 London) for GDPR compliance

### Role-Based Admin Architecture (Two-Tier System)

#### User Roles
The system supports four primary user roles:
- **`medic`**: Healthcare professionals using the mobile app
- **`site_manager`**: Client site managers with limited booking view
- **`org_admin`**: Organization-level administrators (manage their own company)
- **`platform_admin`**: Platform super administrators (SiteMedic owners)

#### Organization Admin (`org_admin`)
**Purpose**: Manages a single organization's data via `/admin` routes

**Access**:
- Organization-scoped data only (filtered by `org_id`)
- Cannot see other organizations' data
- Uses `/admin/*` routes

**Capabilities**:
- View/manage their organization's medics
- View/manage bookings for their organization
- View/manage clients
- Territory management
- Timesheet approval
- Revenue analytics (org-scoped)
- Organization settings

**Database Security**:
- Row Level Security (RLS) policies enforce `org_id` filtering
- JWT contains `org_id` in `app_metadata`
- All queries automatically scoped to user's organization

#### Platform Admin (`platform_admin`)
**Purpose**: SiteMedic platform owners managing ALL organizations

**Access**:
- Cross-organization access (no `org_id` filtering)
- Can see aggregated data across all orgs
- Uses `/platform/*` routes

**Capabilities**:
- View all organizations using SiteMedic
- Platform-wide revenue and profit tracking
- Cross-org analytics and growth metrics
- User management across organizations
- Platform settings and configuration
- System health monitoring

**Database Security**:
- Special RLS policies using `is_platform_admin()` function
- Bypasses `org_id` restrictions
- Full access to all data for oversight

#### UI Separation
- **`/admin`**: Purple/blue theme for organization admins
  - Sidebar navigation: Dashboard, Bookings, Medics, Customers, etc.
  - Scoped to single organization

- **`/platform`**: Purple/indigo theme for platform admins
  - Sidebar navigation: Organizations, Revenue, Analytics, Users, Settings
  - Global view across all orgs

#### Route Protection
- Organization admins trying to access `/platform` → Redirected to `/admin`
- Platform admins trying to access `/admin` → Redirected to `/platform`
- Enforced via `useIsPlatformAdmin()` hook in both layouts
- **Implementation Details** (Fixed 2026-02-16):
  - **Loading State Check**: Both layouts now check `useOrg()` `loading` state BEFORE checking role
    - While `loading === true`: Shows loading spinner (prevents premature page rendering)
    - After `loading === false`: Checks `isPlatformAdmin` and redirects if needed
    - This prevents runtime error: "Organization context is still loading"
  - **Why This Matters**: `useIsPlatformAdmin()` returns `false` during loading, which would cause:
    - Admin layout to render children → children call `useRequireOrg()` → error thrown
    - Platform layout to show "Access Denied" prematurely
  - **Loading Screens**:
    - Admin layout: Blue-themed loading spinner with "Loading..." message
    - Platform layout: Purple-themed loading spinner with "Loading..." message
  - **Redirect Screens** (shown AFTER loading completes):
    - Admin layout for platform admins: "Redirecting to Platform Admin..."
    - Platform layout for org admins: "Access Denied" + redirect message
  - **Files Modified**:
    - `web/app/admin/layout.tsx`: Added `useOrg()` import and loading check
    - `web/app/platform/layout.tsx`: Added `useOrg()` import and loading check

#### Platform Admin Database Configuration (Added 2026-02-16)

**Critical Requirement**: Platform admins MUST be properly configured in the database before they can access `/platform` routes.

**Database Setup**:
1. **Profile Table** (`profiles`):
   - Set `role = 'platform_admin'` for the user
   - Set `org_id = NULL` (platform admins don't belong to a single org)
   - **Note**: Migration 106 made `org_id` nullable and added a check constraint to enforce data integrity

2. **JWT Metadata** (`auth.users.raw_app_meta_data`):
   - Set `role = 'platform_admin'`
   - Completely remove `org_id` key (not just set to null)
   - Remove `org_slug` (not needed for platform admins)

**Why This Is Required**:
- `useIsPlatformAdmin()` checks `user.app_metadata.role === 'platform_admin'` from the JWT
- If the role is missing or incorrect, the hook returns `false`
- This causes incorrect redirects and "not assigned to an organization" errors
- Users MUST log out and log back in after role changes to get an updated JWT

**Initial Setup Migrations**:
- `105_set_platform_admin_user.sql` - Sets `sabineresoagli@gmail.com` as the initial platform admin
- `106_fix_platform_admin_org_id.sql` - Makes `org_id` nullable, adds check constraint, removes org_id from JWT
  - Ensures platform admins can have NULL org_id (unlike other roles)
  - Adds constraint: `platform_admin` MUST have NULL org_id, other roles MUST have non-NULL org_id
- `107_platform_admin_core_tables_rls.sql` - **CRITICAL FIX** - Adds platform admin RLS policies for core tables (Added 2026-02-16)
  - **Problem**: Migration 102 added platform admin policies for business tables but missed core tables (profiles, workers, treatments, near_misses, safety_checks)
  - **Symptom**: Login error "Database error querying schema" because platform admins couldn't read the `profiles` table
  - **Root Cause**: RLS policy `USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)` fails for platform admins with NULL org_id
  - **Solution**: Added dedicated platform admin policies using `is_platform_admin()` for:
    - `profiles` - Allows platform admins to view/manage all user profiles across orgs
    - `workers` - Cross-org worker management access
    - `treatments` - Cross-org treatment record access
    - `near_misses` - Cross-org safety incident access
    - `safety_checks` - Cross-org safety compliance access
  - **Impact**: Platform admins can now successfully log in and access all core data tables
- `108_create_platform_admin_user.sql` - **USER CREATION** - Creates platform admin user in auth.users (Added 2026-02-16)
  - **Problem**: Database resets wipe auth.users, migrations 105/106 tried to UPDATE user that didn't exist
  - **Solution**:
    - Fixed `handle_new_user()` trigger to support platform admins with NULL org_id
    - Creates user `sabineresoagli@gmail.com` with password `password123` and correct metadata
    - Sets `raw_app_meta_data.role = 'platform_admin'` for JWT token generation
    - Uses ON CONFLICT to handle existing users
  - **Impact**: Platform admin user persists across database resets
- `112_complete_platform_admin_rls.sql` - **COMPLETE RLS COVERAGE** - Adds RLS policies for 9 remaining tables (Added 2026-02-16)
  - **Problem**: Migration 107 fixed 5 core tables, but 9 additional tables still blocked platform admins
  - **Symptom**: Continued "Database error querying schema" errors during login
  - **Root Cause**: Platform admins could read `profiles` but failed when accessing other tables during authentication flow
  - **Solution**: Added platform admin RLS policies for ALL remaining tables:
    - **HIGH PRIORITY (Authentication-Critical)**:
      - `user_roles` - 4 policies (was using `is_admin()` instead of `is_platform_admin()`)
      - `audit_logs` - 2 policies (read + insert only for compliance)
    - **MEDIUM PRIORITY (Admin Operations)**:
      - `riddor_incidents` - 4 policies (cross-org compliance access)
      - `certification_reminders` - 4 policies (cross-org certification management)
      - `weekly_reports` - 4 policies (cross-org reporting access)
      - `travel_time_cache` - 4 policies (full platform access)
    - **LOWER PRIORITY (Compliance/Support)**:
      - `consent_records` - 4 policies (GDPR compliance officer access)
      - `erasure_requests` - 4 policies (GDPR request management)
      - `data_retention_log` - 4 policies (audit trail access)
  - **Impact**: Platform admins now have COMPLETE cross-org access to all 45 tables in the database
- `113_fix_platform_admin_metadata.sql` - **METADATA FIX** - Ensures JWT token has correct role (Added 2026-02-16)
  - **Problem**: Migration 108 creates user but `raw_app_meta_data.role` ended up empty/null
  - **Root Cause**: JSONB literal in INSERT might not persist correctly across database resets
  - **Solution**: Explicitly UPDATE `raw_app_meta_data` after user creation using `jsonb_build_object()` to ensure persistence
  - **Verification**: Added DO block to verify role is set correctly and raise notice/warning
  - **Impact**: JWT tokens now reliably include `app_metadata.role = 'platform_admin'` for authentication flow

**Org Admin Account Setup** (Added 2026-02-18):
- **Script**: `web/web/create-org-admin.mjs` — Creates `sabine@joinour.build` as `org_admin` for Apex Safety Solutions
- **How to run**: `cd web && node web/create-org-admin.mjs` (requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`)
- **Account details**:
  - Email: `sabine@joinour.build`
  - Password: `password123`
  - Role: `org_admin`
  - Organization: Apex Safety Solutions (slug: `apex`)
- **What this account can do**: Manage Apex Safety Solutions data (clients, medics, bookings, timesheets, invoices, territories, org settings) via `/admin` routes
- **What this account cannot do**: Access other organizations' data or platform-level settings (`/platform` routes)
- **JWT metadata**: `app_metadata` contains `role: "org_admin"`, `org_id`, and `org_slug: "apex"` — used by RLS policies and `useOrg()` context hook
- **Difference from platform admin**: Platform admin (`sabineresoagli@gmail.com`) has cross-org access with `org_id = NULL`; org admin (`sabine@joinour.build`) is scoped to Apex Safety Solutions only

**Medic Setup Script** (Added 2026-02-18):
- **Script**: `web/web/add-medic-kai.mjs` — Adds Kai Aufmkolk as a medic for Apex Safety Group
- **How to run**: `cd web && node web/add-medic-kai.mjs`
- **Account details**:
  - Email: `firstcontactsolutions.intl@gmail.com`
  - Password: `password123`
  - Role: `medic`
  - Organization: Apex Safety Group (slug: `apex`)
  - Classification: Paramedic, 10 years experience
  - Phone: +44 7584 639688

**Admin & Medic Accounts Summary**:
| Email | Role | Org | Routes | Purpose |
|-------|------|-----|--------|---------|
| `sabineresoagli@gmail.com` | `platform_admin` | None (cross-org) | `/platform` | Manage entire SiteMedic platform |
| `sabine@joinour.build` | `org_admin` | Apex Safety Solutions | `/admin` | Manage Apex Safety Solutions org |
| `firstcontactsolutions.intl@gmail.com` | `medic` | Apex Safety Group | Mobile app | Kai Aufmkolk — paramedic |

**Error Handling**: `web/app/admin/error.tsx`
- Catches "not assigned to an organization" errors
- Redirects platform admins to `/platform` if they somehow reach `/admin`
- Serves as a safety net for data integrity issues

**Common Issue**: Org admins without `org_id`
- If a user has `role = 'org_admin'` but `org_id = NULL`, they'll get the "not assigned to an organization" error
- Solution: Either set them as `platform_admin` OR assign them a valid `org_id`

#### Implementation Files
- **Context**: `web/contexts/org-context.tsx` (exports role hooks)
- **Migrations**:
  - `100_add_platform_admin_role.sql` (adds role enum values)
  - `101_migrate_to_platform_admin.sql` (migration helper functions)
  - `102_platform_admin_rls_policies.sql` (cross-org RLS policies for business tables)
  - `105_set_platform_admin_user.sql` (sets initial platform admin: sabineresoagli@gmail.com)
  - `106_fix_platform_admin_org_id.sql` (makes org_id nullable for platform admins, adds check constraint)
  - `107_platform_admin_core_tables_rls.sql` (cross-org RLS policies for core tables - fixes login error)
  - `108_create_platform_admin_user.sql` (creates platform admin user in auth.users with correct metadata)
  - `112_complete_platform_admin_rls.sql` (completes RLS coverage for 9 remaining tables)
  - `113_fix_platform_admin_metadata.sql` (ensures JWT metadata persists correctly across resets)
- **Routes**:
  - `web/app/admin/` (organization admin UI)
  - `web/app/platform/` (platform admin UI)
- **Setup Scripts**:
  - `web/web/create-admin.mjs` (creates platform admin user via Supabase Admin API)
  - `web/web/create-org-admin.mjs` (creates org admin `sabine@joinour.build` for Apex Safety Solutions)
  - `web/web/add-medic-kai.mjs` (adds Kai Aufmkolk as medic for Apex Safety Group)
- **Error Handling**:
  - `web/app/admin/error.tsx` (catches org assignment errors and redirects)

---

## Technology Stack

### Frontend
- **Marketing Website**: Next.js 15 SSG + Tailwind CSS (Vercel Edge Network)
- **Booking Portal**: Next.js 15 SSR + Tailwind CSS (Vercel Serverless)
- **Admin Dashboard**: React 19 + Vite + shadcn/ui (extends existing Phase 4 web dashboard)
- **Mobile App**: React Native + Expo (iOS first, Android deferred)

### Backend
- **Database**: Supabase PostgreSQL (UK region: eu-west-2 London)
- **Serverless Functions**: Supabase Edge Functions (Deno runtime)
- **Storage**: Supabase Storage (invoices, PDFs, photos)

### External Integrations
- **Payments**: Stripe Connect (platform + medic Express accounts)
- **Geolocation**: Google Maps Distance Matrix API (7-day cache)
- **what3words** (NEW): Precise location addressing system
  - Package: `@what3words/api` (v5.4.0) + `@what3words/react-components` (v5.0.5)
  - API key configured in `NEXT_PUBLIC_WHAT3WORDS_API_KEY`
  - Features: coordinate ↔ words conversion, autocomplete suggestions, UK-only filtering
  - Usage: Quote builder, booking forms, email templates
  - Database: `what3words_address` column in `bookings`, `territories`, and `medics` tables
  - Benefits: 3m x 3m precision, easy verbal communication, impossible to mistype
- **Calendar**: iCal feeds (Google, Outlook, iCloud - read-only)
- **Email**: Transactional emails via Supabase (SendGrid/Mailgun backend)

### State Management
- **Global State**: Zustand
- **Server State**: TanStack Query (React Query)
- **Forms**: react-hook-form + zod validation

### Local Development
- **Port**: 30500 (as specified in CLAUDE.md)
- **Command**: `pnpm dev`

---

## Performance Targets

| Feature | Target | Phase |
|---------|--------|-------|
| Marketing website load time | <2 seconds | 4.5 |
| Booking completion time | <5 minutes | 4.5 |
| Minor treatment logging | <30 seconds | 2 |
| Full treatment logging | <90 seconds | 2 |
| Near-miss capture | <45 seconds | 2 |
| Daily safety checklist | <5 minutes | 2 |
| PDF generation | <10 seconds | 5 |
| Batch timesheet approval (20 sheets) | <5 minutes | 5.5 |
| Friday payout job reliability | 100% (zero failures) | 6.5 |
| Auto-assignment success rate | 95% | 7.5 |
| Territory coverage map update | <5 minutes | 7.5 |
| Lighthouse score (marketing) | >90 | 4.5 |

---

## Compliance & Security

### UK GDPR
- Health data is "special category" (explicit consent required)
- AES-256 encryption at rest
- TLS 1.3 in transit
- UK/EU hosting only (Supabase eu-west-2 London)
- 3-year data retention policy
- Right to erasure (GDPR Article 17)
- Data processing agreements with subprocessors (Stripe, Google Maps)

### RIDDOR 2013
- Auto-flagging for reportable incidents
- Deadline tracking (10/15 days)
- HSE F2508 form generation
- 3-year record retention

### Payment Security
- PCI-DSS compliant (via Stripe)
- No card data stored by platform
- 3D Secure (SCA) for card payments
- Stripe Express accounts for medics (platform never touches medic payout funds directly)

### IR35 / Off-Payroll Working
- Medics are self-employed contractors (NOT employees)
- HMRC CEST tool validation
- Umbrella company option for medics preferring employment status
- UTR collection for self-employed medics
- No PAYE, no NI contributions by platform

---

## Business Model

### Revenue Streams
1. **Medic Bookings** (primary revenue)
   - 40% platform markup
   - Example: Medic £30/hr → Client £42/hr → Platform £12/hr
   - Recurring bookings (weekly, monthly contracts)

2. **Premium Features** (future)
   - API access (Tier 3/4 subscription)
   - Custom branding / white-label (enterprise clients)
   - Advanced analytics and reporting

### Costs
- Medic payouts (60% of booking revenue)
- Stripe fees (2.9% + 20p per transaction)
- Google Maps API (distance calculations, caching reduces cost)
- Insurance (5-10% of revenue)
- Support and marketing (10-15% of revenue)
- Infrastructure (Supabase, Vercel - <5% of revenue)

### Cash Flow
- **Gap**: Pay medics Friday Week 1, collect from clients Week 5 (Net 30)
- **Mitigation**:
  - Prepay for new clients (eliminates gap)
  - Credit limits for established clients
  - Cash flow dashboard warns when gap >30 days
  - Cash reserves required to cover 30-day gap

---

## Critical Paths for Launch

### Path 1: Booking Flow (Revenue-Critical)
**Timeline**: 12-16 weeks
**Phases**: 1.5 → 4.5 → 7.5 → 6.5
**Outcome**: Client can book medic end-to-end with payment

### Path 2: Medic Payout (Cash Flow-Critical)
**Timeline**: 10-14 weeks
**Phases**: 1.5 → 5.5 → 6.5
**Outcome**: Medics get paid reliably every Friday

### Path 3: Admin Operations (Scale-Critical)
**Timeline**: 12-16 weeks
**Phases**: 1.5 → 5.5 → 7.5
**Outcome**: Admin can manage business at scale

---

## Risk Mitigation

| Risk | Mitigation | Impact if Ignored |
|------|------------|-------------------|
| Cash flow gap (pay medics before collecting from clients) | Prepay new clients, credit limits, dashboard warning | Run out of cash → business failure |
| Medic no-show | Secondary backup, SMS reminders, penalties, client credit | Client loses trust → churn |
| Auto-assignment errors (unqualified medic) | Hard validation, manual review for complex, medic can reject | Safety incident → HSE violation |
| Google Maps API costs | 7-day cache, batch requests, haversine fallback | API costs eat profits |
| RIDDOR compliance gap (medic doesn't log treatments) | Mandatory treatment log, zero-treatment flag, weekly audit | RIDDOR violations → fines |
| IR35 misclassification | HMRC CEST tool, umbrella option, legal review | £100k+ back taxes → shutdown |
| Stripe account holds | Medic vetting, gradual limits, dispute handling | Medic doesn't get paid → quits |
| Out-of-territory costs exceed budget | Dynamic cost comparison, admin approval, deny if >50% | Unprofitable bookings → losses |

---

## Future Enhancements (Post-MVP)

### Phase 2+ Opportunities
- Heat map visualization (incident concentration by location)
- Trend analysis charts (compliance metrics over time)
- Toolbox talk logger (pre-task safety meetings)
- Multi-project support (when scaling to multiple sites)
- Video evidence capture (beyond photos)
- Customizable report templates (client-specific formats)
- Bulk worker import (CSV upload for large registries)
- Advanced search/filters (body part, injury type, date range)

### Premium Tier Features (v2+)
- AI risk prediction (requires 12+ months historical data, 40-50% incident reduction potential)
- API access for integrations (ERP, payroll, Procore)
- Custom branding / white-label (enterprise clients)
- Digital twin risk scoring (cutting-edge 2026 feature)
- Film/TV industry mode (same platform, different labels)
- Android app (if clients demand it)
- Real-time collaboration (conflicts with offline-first, marginal value)
- Wearable/IoT integration (smart PPE, biometrics - requires hardware partnerships)

---

**Document Version**: 1.4
**Last Updated**: 2026-02-17 (Phase 21 Film/TV vertical planned — 2 plans created)
**Next Review**: After Phase 21 execution

---

### Planned: Phase 21 — Film/TV Production Vertical (Not yet executed)

Phase 21 adds Film/TV-specific capabilities to the platform. All infrastructure prerequisites were delivered in Phase 18 (`vertical_extra_fields` column, `OrgContext`, RIDDOR gate, `incident-report-dispatcher`). Phase 21 is content-layer work only — no new infrastructure or Edge Functions required.

#### Plan 21-01: Film/TV Form Fields + Cert Type Registration

**Files modified:** `app/treatment/new.tsx`, `services/taxonomy/certification-types.ts`, `web/types/certification.types.ts`

| Change | Description |
|--------|-------------|
| Production Details section | Conditional section appears in treatment form when `orgVertical === 'tv_film'`. 4 fields: Production Title (text), Patient Role (picker: Cast / Stunt Performer / Director / Camera / Grip / Lighting / Art Dept / Costume / Other Crew), SFX/Pyrotechnic Involved (toggle), Scene/Shot Context (text). |
| `vertical_extra_fields` wiring | Film/TV fields serialised as JSON and written to `vertical_extra_fields` column via `useAutoSave` and included in `enqueueSyncItem` payload for Supabase sync. JSON shape: `{ production_title, patient_role, sfx_involved, scene_context }`. |
| New cert types | `'ScreenSkills Production Safety Passport'` and `'EFR'` (Emergency First Responder) registered in both `services/taxonomy/certification-types.ts` (mobile) and `web/types/certification.types.ts` (web). Required by the Film/TV cert profile — neither existed previously. |

**FILM-01 requirement satisfied.**

#### Plan 21-02: Terminology Overrides + Cert Profile + F2508 Verification

**Files modified:** `services/taxonomy/certification-types.ts`, `web/types/certification.types.ts`, `services/taxonomy/vertical-outcome-labels.ts`, `app/(tabs)/_layout.tsx`, `app/(tabs)/workers.tsx`, `app/worker/new.tsx`, `app/worker/quick-add.tsx`, `app/worker/[id].tsx`, `app/treatment/[id].tsx`, `app/treatment/templates.tsx`

| Change | Description |
|--------|-------------|
| Film/TV cert ordering | `VERTICAL_CERT_TYPES.tv_film` updated in both cert files: HCPC Paramedic → ScreenSkills Production Safety Passport → FREC 4 → EFR → PHEC → PHTLS → ALS Provider → ATLS → FREC 3. CSCS and IPAF removed from `tv_film` ordering (construction site access cards, not relevant to film/TV — remain in master list). |
| New terminology helpers | `getLocationLabel(verticalId)` and `getEventLabel(verticalId)` exported from `services/taxonomy/vertical-outcome-labels.ts`. Film/TV returns `'Set'` and `'Production'` respectively. Mirrors web `org-labels.ts` pattern on mobile. |
| Workers tab / header | `app/(tabs)/_layout.tsx`: tab bar label and header title dynamically computed from `useOrg().primaryVertical`. Film/TV org sees `'Cast & Crew'` tab label and `'Cast & Crew Registry'` header. |
| Worker screens | `app/(tabs)/workers.tsx`, `app/worker/new.tsx`, `app/worker/quick-add.tsx`, `app/worker/[id].tsx`: `useOrg()` added; "Add Worker" buttons, section headings, search placeholders use `getPatientLabel(primaryVertical)`. Film/TV medic sees "Add Crew member", "Cast & Crew Registry", etc. |
| Treatment screens | `app/treatment/[id].tsx`: "Worker Information" section heading → `'{patientLabel} Information'`. `app/treatment/templates.tsx`: "1. Select Worker" and search placeholder use `personLabel`. |
| FILM-04 verification | `web/lib/pdf/incident-report-dispatcher.ts` already maps `tv_film → riddor-f2508-generator`. No code changes needed — RIDDOR auto-flagging and F2508 PDF generation work unchanged for Film/TV crew members. |

**FILM-02, FILM-03, FILM-04 requirements satisfied.**

#### Film/TV Vertical Summary

| Requirement | Status after Phase 21 |
|-------------|----------------------|
| FILM-01: Production-specific form fields | Production Title, Patient Role (9 options), SFX/Pyro flag, Scene Context |
| FILM-02: Terminology | "Cast & Crew" / "Set" / "Production" across all 7 mobile screens |
| FILM-03: Cert profile | HCPC Paramedic, ScreenSkills Production Safety Passport, FREC 4, EFR at top |
| FILM-04: RIDDOR active for crew | Unchanged — `tv_film` passes through RIDDOR gate; F2508 generated for qualifying incidents |

---

### Recent Changes (2026-02-17)

#### Hourly Pay Model + 4-Way Profit Split (Migration 129)
Replaces the percentage-based payout model (junior/senior/lead tiers) with a flexible hourly rate system and introduces a structured 4-way profit split for SiteMedic's founders.

**What changed:**
- **Medic pay** is now calculated as `hourly_rate × hours_worked` (rate set manually per medic by admin)
- **Classification**: Each medic can be assigned a UK medical classification (10 levels from First Aider to Doctor) for categorisation and reporting — does not affect pay
- **Backward compatibility**: Old bookings keep `pay_model = 'percentage'`; all legacy % columns preserved
- **4-way profit split**: After medic pay, mileage, and referral commission are deducted, the net revenue is split equally: ¼ Sabine / ¼ Kai / ¼ operational costs / ¼ equipment/emergency reserve

**Business rules:**
- Client pricing formula is **unchanged** — clients see the same price regardless of pay model
- VAT, urgency premiums, mileage (HMRC 45p/mile), and referral 10% commission are all unchanged
- Hourly rate is set manually by admin — no auto-calculation from classification or experience
- The 4-way split is calculated at payment time and recorded in `profit_splits` table
- Same 4-way split logic applies to SiteMedic app revenue (operational / ads/marketing buckets)

**New database tables:**

| Table | Purpose |
|-------|---------|
| `apex_partners` | Tracks Sabine and Kai's cumulative earned/paid balances and `balance` (generated column) |
| `expense_buckets` | Running totals for operational and reserve buckets (apex + app revenue sources) |
| `profit_splits` | Per-booking record of the 4-way split — created when booking is paid |

**New columns on `medics`:**

| Column | Type | Description |
|--------|------|-------------|
| `classification` | TEXT | UK medical classification (10 options) |
| `years_experience` | INT | Years of medical experience (0+) |
| `hourly_rate` | DECIMAL(10,2) | Admin-set hourly rate in GBP (NULL = not yet set) |
| `hourly_rate_override` | BOOLEAN | Whether rate has been manually overridden |

**New columns on `bookings`:**

| Column | Type | Description |
|--------|------|-------------|
| `pay_model` | TEXT | `'percentage'` (legacy) or `'hourly'` (new) |
| `medic_hourly_rate` | DECIMAL(10,2) | Snapshot of rate at booking time |
| `medic_pay` | DECIMAL(10,2) | Hourly rate × hours worked |
| `net_after_costs` | DECIMAL(10,2) | Total − medic_pay − mileage − referral |
| `sabine_share` | DECIMAL(10,2) | Net / 4 |
| `kai_share` | DECIMAL(10,2) | Net / 4 |
| `operational_bucket_amount` | DECIMAL(10,2) | Net / 4 |
| `reserve_bucket_amount` | DECIMAL(10,2) | Net / 4 |
| `split_calculated_at` | TIMESTAMPTZ | When the split was last calculated |

**UK medical classifications (10 levels):**
`first_aider` → `eca` → `efr` → `emt` → `aap` → `paramedic` → `specialist_paramedic` → `critical_care_paramedic` → `registered_nurse` → `doctor`

**New files:**
| File | Description |
|------|-------------|
| `supabase/migrations/129_hourly_pay_and_profit_split.sql` | All DB schema changes: new columns, new tables, RLS policies |

**Modified files:**
| File | Change |
|------|--------|
| `web/lib/medics/experience.ts` | Added `MedicClassification` type, `CLASSIFICATION_LABELS` record, and `CLASSIFICATION_LIST` array. Existing tier constants preserved. |
| `web/lib/payouts/calculator.ts` | Added `FourWaySplit` interface and `calculateFourWaySplit()` function. Old `calculatePayout()` preserved for legacy bookings. |
| `web/lib/booking/types.ts` | Added `MedicClassification` type, `PayModel` type, and `FourWaySplit` interface. |
| `web/components/medics/compensation-settings.tsx` | Fully updated: pay model toggle (hourly/percentage), classification dropdown (10 UK levels), years of experience input, hourly rate input, live payout preview for both models. |
| `supabase/functions/calculate-pricing/index.ts` | Added `pay_model` field awareness. When `pay_model='hourly'`: validates `medic_hourly_rate`, computes `medic_pay`, `net_after_costs`, and 4-way split preview. All existing % fields preserved for backward compat. |

---

#### Treatment Form — Vertical-Aware Presets & Labels (Tier 1B)
The mobile treatment logging form now adapts to the org's industry vertical. On mount it fetches `org_settings.industry_verticals` for the current medic's org and applies vertical-specific terminology throughout the form. The DB outcome IDs are unchanged — only display labels adapt.

**New files:**
| File | Description |
|------|-------------|
| `services/taxonomy/mechanism-presets.ts` | Per-vertical mechanism of injury quick-pick chips. `getMechanismPresets(verticalId)` returns 8 presets tailored to the vertical (e.g. motorsport: "Vehicle collision", "Rollover", "Burns"; festivals: "Crowd crush", "Intoxication", "Heat exhaustion"). Falls back to general construction-era presets. |
| `services/taxonomy/vertical-outcome-labels.ts` | Vertical-aware display labels for outcome IDs. `getVerticalOutcomeCategories(categories, verticalId)` rewrites "Returned to work" labels per vertical (e.g. motorsport: "Returned to race", tv_film: "Returned to set", festivals: "Returned to event / crowd"). `getPatientLabel(verticalId)` returns the correct noun for the person being treated ("Worker", "Crew member", "Driver / Competitor", "Attendee", etc.). |

**Modified files:**
| File | Change |
|------|--------|
| `app/treatment/new.tsx` | Added `fetchOrgVertical()` — fetches `org_settings.industry_verticals` on mount via Supabase (non-blocking, falls back to general on failure). Replaces hardcoded `MECHANISM_PRESETS` constant with `getMechanismPresets(orgVertical)`. Outcome picker now uses `getVerticalOutcomeCategories()`. Section 1 heading and search placeholder use `getPatientLabel(orgVertical)`. |

**Outcome label changes by vertical:**
| Vertical | "Same duties" label | "Light duties" label |
|----------|--------------------|--------------------|
| Construction | Returned to work — same duties | Returned to work — light duties |
| TV/Film | Returned to set | Returned to set — restricted duties |
| Motorsport | Returned to race / event | Stood down from racing — restricted |
| Festivals | Returned to event / crowd | Attended welfare area — monitoring |
| Sporting | Returned to play | Substituted / stood down from play |
| Education | Returned to class / activity | Returned to supervised rest area |
| Outdoor Adventure | Returned to activity / course | Stood down — restricted activity |

#### Booking Form — Vertical-Aware Special Requirements (Tier 1A)
The booking form's "Special Requirements" section is now fully dynamic, adapting to the type of event or site being booked. Previously only two hardcoded construction-specific checkboxes were shown (Confined Space, Trauma Specialist). Now the form shows a relevant, curated requirements list for each of the 10 industry verticals.

**New files:**
| File | Description |
|------|-------------|
| `web/lib/booking/vertical-requirements.ts` | Central constants file. Defines `VerticalRequirement` type, `VERTICAL_LABELS` map (human-readable names for 11 vertical IDs), and `VERTICAL_REQUIREMENTS` map (per-vertical requirements list with 4–6 items each). Requirements with a `dbField` property automatically sync to existing DB boolean columns (`confinedSpaceRequired`, `traumaSpecialistRequired`). Additional requirements are serialised into `specialNotes` on form submit. Also exports `requirementsToBooleans()` and `requirementsToNotes()` helpers. |

**Modified files:**
| File | Change |
|------|--------|
| `web/lib/booking/types.ts` | `BookingFormData` updated: added `eventVertical: string` (drives requirements list), `selectedRequirements: string[]` (holds selected requirement IDs). Existing `confinedSpaceRequired` / `traumaSpecialistRequired` booleans retained for DB backward compatibility. |
| `web/components/booking/shift-config.tsx` | Replaced two hardcoded checkboxes with: (1) Event / Site Type selector (all 11 vertical options), (2) Dynamic requirements checklist — updates when vertical changes, shows 4–6 checkboxes specific to that vertical. Vertical change clears previous selections. Non-boolean requirements include an optional `description` shown as helper text. |
| `web/components/booking/booking-form.tsx` | Now imports `useOrg()` to read `industryVerticals`. Default vertical pre-selected from: QuoteBuilder prefill → org primary vertical → empty. On "Continue to Payment", non-boolean requirements are serialised into `specialNotes` before sessionStorage. |

**How overlapping requirements work:** Requirements that apply across multiple verticals (e.g. Trauma Specialist, DBS Check, Helicopter LZ, Remote Location) use the same `id` string in every vertical they appear in, ensuring consistent matching and display regardless of which vertical the user selects.

**Vertical requirements at a glance:**
| Vertical | Key requirements |
|----------|----------------|
| Construction | Confined space, CSCS access, Working at height, Plant machinery, Respiratory hazards |
| TV & Film | Stunt cover, Pyrotechnics, Water access, Night shoot, Remote location |
| Motorsport | FIA Grade required, Trackside extraction, Helicopter LZ, Race control radio |
| Festivals | Crowd medicine (DIM MIM), Major Incident Plan, Drug & alcohol protocol, Under-18s |
| Sporting Events | Pitchside positioning, FA governance, Doping control, Helicopter LZ |
| Fairs & Shows | Livestock/machinery, Crowd cover, Remote field access |
| Corporate | DBS check, Executive/VIP discreet cover, Drug & alcohol testing |
| Private Events | DBS check, Under-18s, Heavy alcohol/licensed event |
| Education | DBS Enhanced (Children) mandatory, SEN awareness, Paediatric FA, Safeguarding |
| Outdoor Adventure | Wilderness FR, Remote terrain, Helicopter LZ, Water access, Night operations |

#### Multi-Vertical Marketing Website Rework
The entire public-facing website was rewritten from a construction-only position to cover 10 industry verticals:
- **Core**: Construction & Industrial, TV & Film, Motorsport & Extreme Sports, Music Festivals, Sporting Events, Fairs & Shows
- **Add-on**: Corporate Events, Private Events, Education & Youth, Outdoor Adventure & Endurance

Files changed: `web/app/(marketing)/page.tsx`, `web/app/(marketing)/services/page.tsx`, `web/app/(marketing)/about/page.tsx`, `web/app/(marketing)/pricing/page.tsx`, `web/app/(marketing)/contact/page.tsx`, `web/app/(marketing)/contact/contact-form.tsx`, `web/components/marketing/hero.tsx`, `web/components/marketing/site-footer.tsx`, `web/components/marketing/trust-signals.tsx`, `web/components/marketing/pricing-table.tsx`, `web/components/QuoteBuilder.tsx`

#### Org Industry Vertical Picker (Admin Settings)
Each organisation can now declare which industry verticals it serves. This drives context-aware UI labels and compliance checklists across the platform.

**New files:**
| File | Description |
|------|-------------|
| `supabase/migrations/121_org_industry_verticals.sql` | Adds `industry_verticals JSONB NOT NULL DEFAULT '["construction"]'` column to `org_settings` table. GIN index for platform admin filtering. |
| `web/lib/org-labels.ts` | `useOrgLabels()` hook returning vertical-aware terminology (personSingular, personPlural, locationTerm, periodTerm, eventTerm). Priority order resolves the primary label set when multiple verticals are selected. Also exports `getLabelsForVertical(id)` for platform admin views. |

**Modified files:**
| File | Change |
|------|--------|
| `web/app/api/admin/settings/route.ts` | GET returns `industry_verticals`; PUT validates and persists it (non-empty array, only known vertical IDs). |
| `web/app/admin/settings/page.tsx` | New **Industry & Verticals** section between Organisation Profile and Business Configuration. 10 toggle-card buttons (one per vertical), each colour-coded with icon, label and description. Separate "Save Verticals" button. `OrgSettings` interface updated with `industry_verticals: VerticalId[]`. |
| `web/contexts/org-context.tsx` | `OrgContextValue` now includes `industryVerticals: VerticalId[]`. Provider fetches from `org_settings` after resolving the org row and exposes it globally. Exports `VerticalId` type. |

**Valid vertical IDs:** `construction`, `tv_film`, `motorsport`, `festivals`, `sporting_events`, `fairs_shows`, `corporate`, `private_events`, `education`, `outdoor_adventure`

### Recent Changes (2026-02-16)
- **Magic Link Authentication**: Replaced password-based login with passwordless authentication
  - **Feature**: Users receive a secure login link via email instead of entering a password
  - **Method**: Supabase OTP (One-Time Password) magic link authentication
  - **UX Benefits**:
    - No passwords to remember or manage
    - Faster login flow (just enter email and click link)
    - Reduced support burden (no "forgot password" issues)
    - More secure (no password reuse, no brute force attacks)
  - **Implementation Details**:
    - Removed password field from login form
    - Uses `supabase.auth.signInWithOtp()` instead of `signInWithPassword()`
    - Email persistence in localStorage for convenience
    - Success state UI shows "Check your email" message with instructions
    - Magic link expires in 60 minutes for security
    - Includes "resend link" functionality
  - **New Routes**:
    - `/auth/callback/route.ts` - Handles magic link token exchange and session creation
    - Redirects to dashboard after successful authentication
    - Error handling redirects back to login with error message
  - **Files Modified**:
    - `/web/app/(auth)/login/page.tsx` - Updated to magic link flow
    - `/web/app/auth/callback/route.ts` - New callback handler
  - **User Experience**:
    1. User enters email on login page
    2. Clicks "Send magic link" button
    3. Receives email with secure login link
    4. Clicks link in email
    5. Automatically authenticated and redirected to dashboard
  - **Security**: Email verification ensures only email owner can authenticate

### Recent Changes (2026-02-15)
- **App Icon Added**: Created professional medical cross icon for SiteMedic mobile app
  - Design: White medical cross on blue circular background (#0066CC)
  - Assets created: `icon.png` (1024x1024), `adaptive-icon.png` (Android), `splash-icon.png`, `favicon.png`
  - Files: `/assets/*.png` (45KB each, upgraded from 70-byte placeholders)
  - Configuration: Already set in `app.json` - icons will appear after rebuild

---

*This document is maintained by the SiteMedic product team. For questions or suggestions, contact the project lead.*
