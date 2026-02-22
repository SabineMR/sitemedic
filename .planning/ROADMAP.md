# SiteMedic Roadmap

## Milestones

- ✅ **v1.0 MVP** — Phases 01–07.5 (13 phases, 84 plans — shipped 2026-02-16)
- ✅ **v1.1 Post-MVP Polish & Data Completeness** — Phases 08–17 (10 phases, 35 plans — shipped 2026-02-17)
- ✅ **v2.0 Multi-Vertical Platform Expansion** — Phases 18–23 (7 phases, 30 plans — shipped 2026-02-18)
- ✅ **v3.0 White-Label Platform & Subscription Engine** — Phases 24–31 (8 phases, 30 plans — shipped 2026-02-19)
- ✅ **v4.0 MedBid Marketplace** — Phases 32–39 (8 phases, shipped 2026-02-21)
- ✅ **v5.0 Internal Comms & Document Management** — Phases 40–47 (8 phases, 21 plans — shipped 2026-02-20)
- **v6.0 Marketplace Integrity** — Phases 48–52 (5 phases, in progress)

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
- [x] **Phase 34: Quote Submission & Comparison** - Companies submit priced quotes with breakdowns, clients compare anonymised company profiles (companies only)
- [x] **Phase 34.1: Self-Procured Jobs** (INSERTED) - Companies with SiteMedic subscriptions create and manage jobs they sourced themselves, with zero commission, full wizard entry, Stripe payment flow, and complete feature parity with marketplace jobs
- [x] **Phase 35: Award Flow & Payment** - Client awards quote, deposit collected, booking auto-created, remainder charged after event, commission split, payouts
- [x] **Phase 36: Ratings, Messaging & Disputes** - Bidirectional ratings, per-quote messaging, cancellation policy, dispute resolution
- [x] **Phase 37: Company Accounts** - Company roster management, medic assignment to events, company profile display
- [x] **Phase 38: Notifications & Alerts** - Multi-channel notification system (dashboard feed, email, SMS) with medic preferences
- [x] **Phase 39: Admin Dashboard** - Platform admin marketplace metrics, event/quote/dispute management, configuration

<details>
<summary>✅ v5.0 Internal Comms & Document Management (Phases 40–47) — SHIPPED 2026-02-20</summary>

See: `.planning/milestones/v5.0-ROADMAP.md`

</details>

## Phase Details

### Phase 48: Marketplace Integrity Foundation
**Goal**: Make source-of-work attribution and fee policy first-class invariants so self-sourced subscription jobs and marketplace-commission jobs cannot be silently reclassified.
**Depends on**: Phase 39
**Requirements**: INT-01, INT-02, INT-03, INT-04
**Success Criteria** (what must be TRUE):
  1. Source provenance is persisted and immutable-by-default across event and booking write paths
  2. Self-sourced flows remain subscription-covered with no per-job commission
  3. Marketplace-sourced flows retain marketplace fee policy and auditability
  4. Pass-on handoffs preserve original provenance without implicit reclassification
**Plans**: 1 plan (initial)

Plans:
- [x] 48-01-PLAN.md — Provenance data model, fee-policy invariants, and write-path propagation baseline

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
**Plans**: 6 plans

Plans:
- [x] 34.1-01-PLAN.md — Database migration (direct_clients table, marketplace_events source/agreed_price/client_id columns, direct job statuses), TypeScript types, Zod schemas, CRUD API routes
- [x] 34.1-02-PLAN.md — Job creation wizard (Zustand store, 6-step wizard UI, client details step with new/existing client, job info, schedule, staffing, pricing, review/submit), jobs list page with "Log Job" entry point
- [x] 34.1-03-PLAN.md — Dashboard integration (combined jobs view with source badges and filter, SourceBadge/SourceFilter components, combined API endpoint, marketplace events API excludes direct jobs)
- [x] 34.1-04-PLAN.md — Payment flow (Stripe deposit PaymentIntent, booking bridge with source='direct' and 0% commission, medic assignment with EXCLUSION constraint availability checking, job detail page)
- [x] 34.1-05-PLAN.md — Client portal access (client-safe API excluding medic details, read-only portal view, payment summary) and bidirectional ratings (job_ratings table, star rating + review form, ratings API)
- [x] 34.1-06-PLAN.md — Gap closure: subscription check on direct job creation, client portal link from job detail page, deposit_paid wired to booking status

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
**Plans**: 4 plans

Plans:
- [x] 35-01-PLAN.md — Award foundation: migration 149 (bookings payment columns, marketplace_award_history, client_payment_methods, quote status expansion), TypeScript types, Zod schemas, award calculations, Zustand store, POST /api/marketplace/quotes/[id]/award API with EXCLUSION constraint check and Stripe PaymentIntent creation
- [x] 35-02-PLAN.md — Award UI and deposit flow: AwardConfirmationModal (confirm + payment steps), PaymentBreakdownSection, DepositPaymentForm with embedded Stripe Payment Element, deposit webhook handler creating marketplace booking, quote/event status updates
- [x] 35-03-PLAN.md — Remainder payment automation: charge-remainder-payment Edge Function with off-session charging, pg_cron daily schedule, 3-retry logic over 7 days, remainder webhook handlers, payment method manager UI and API
- [x] 35-04-PLAN.md — Award notifications and contact reveal: email functions (award winner, rejection, deposit confirmation, remainder failure), webhook email triggers, awarded event details API with contact gating, AwardedEventDetails dashboard component

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
**Plans**: 3 plans

Plans:
- [x] 36-01-PLAN.md — Bidirectional ratings (migration 152: blind window + moderation columns + aggregate trigger; marketplace ratings API with 14-day blind window; MarketplaceRatingForm, ReviewCard, CompanyRatingsSummary components; company profile rating display; quote list wired to real rating data)
- [x] 36-02-PLAN.md — Marketplace messaging (migration 153: marketplace_conversations + marketplace_messages with user_id RLS; messaging API routes; MarketplaceInbox with conversation list + message thread; Airbnb-style email notifications; Messages tab on event detail page)
- [x] 36-03-PLAN.md — Disputes and cancellations (migration 154: marketplace_disputes table + dispute-evidence bucket + remainder_hold on bookings; dispute filing with evidence upload + auto remainder hold; admin dispute queue with resolution workflow; tiered cancellation policy with Stripe refunds; CancellationConfirmation with financial breakdown)

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
**Plans**: 3 plans

Plans:
- [x] 37-01-PLAN.md — Database foundation (migration 156: company_roster_medics junction table, RLS policies, roster validation trigger on quotes, aggregation trigger, TypeScript types, Zod schemas, 7 API routes, React Query hooks, availability utilities)
- [x] 37-02-PLAN.md — Roster management UI (Zustand store, roster page at /dashboard/marketplace/roster, add/invite medic modals, roster list with status badges and actions, invitation acceptance page)
- [x] 37-03-PLAN.md — Company profile and quote assignment (company profile page with stats and Meet the Team, medic availability modal, RosterMedicPicker for named-staff quotes, StaffingPlanSection wired to real roster data)

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
**Plans**: 4 plans

Plans:
- [x] 38-01-PLAN.md — Database foundation and notification service (user_notifications + preferences migrations, Twilio SMS module, notification types, create-notification utility)
- [x] 38-02-PLAN.md — Dashboard notification bell and feed UI (NotificationBell dropdown, /dashboard/notifications page, Realtime hooks, mark-as-read API)
- [x] 38-03-PLAN.md — Event fan-out and marketplace action triggers (new event fan-out to companies, notification triggers in 10+ existing API routes)
- [x] 38-04-PLAN.md — Notification preferences UI and API (channel x category matrix settings page, GET/PUT preferences API, SMS opt-in with PECR compliance)

### Phase 39: Admin Dashboard
**Goal**: Platform admin can monitor marketplace health, manage all marketplace entities, configure settings, and moderate users — completing the operational toolkit
**Depends on**: Phase 38 (all marketplace features exist to administrate)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Platform admin dashboard shows marketplace metrics: total events posted, total quotes, conversion rate (quotes to awards), and total marketplace revenue
  2. Platform admin can view and manage all events, quotes, awards, and disputes from a single interface
  3. Platform admin can configure marketplace settings: default commission rate, deposit percentage, and quote deadline defaults
  4. Platform admin can suspend or ban marketplace users (medics or clients) who violate terms
**Plans**: 3 plans

Plans:
- [x] 39-01-PLAN.md — Marketplace metrics dashboard foundation (SQL metrics function, platform API route, `/platform/marketplace` dashboard, window filters)
- [x] 39-02-PLAN.md — Entity management and moderation workspace (unified entities API, moderation actions, immutable moderation audit trail)
- [x] 39-03-PLAN.md — Marketplace configuration management (settings + audit migrations, GET/PUT settings API, runtime defaults integration)

---

## Progress

**Execution Order:** 01 → 01.5 → 02 → 03 → 04 → 04.5 → 04.6 → 05 → 05.5 → 06 → 06.5 → 07 → 07.5 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 18.5 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 34.1 → 35 → 36 → 37 → 38 → 39 → 40 → 41 → 42 → 43 → 44 → 45 → 46 → 47 → 48

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
| 34.1. Self-Procured Jobs (INSERTED) | v4.0 | 0/6 | Planned | - |
| 35. Award Flow & Payment | v4.0 | 0/4 | Not started | - |
| 36. Ratings, Messaging & Disputes | v4.0 | 3/3 | Complete | 2026-02-20 |
| 37. Company Accounts | v4.0 | 3/3 | Complete | 2026-02-20 |
| 38. Notifications & Alerts | v4.0 | 4/4 | Complete | 2026-02-20 |
| 39. Admin Dashboard | 3/3 | Complete | 2026-02-21 |
| 48. Marketplace Integrity Foundation | v6.0 | 1/1 | Complete | 2026-02-21 |
