# SiteMedic Roadmap

## Milestones

- ✅ **v1.0 MVP** — Phases 01–07.5 (13 phases, 84 plans — shipped 2026-02-16)
- ✅ **v1.1 Post-MVP Polish & Data Completeness** — Phases 08–17 (10 phases, 35 plans — shipped 2026-02-17)
- ✅ **v2.0 Multi-Vertical Platform Expansion** — Phases 18–23 (7 phases, 30 plans — shipped 2026-02-18)
- ✅ **v3.0 White-Label Platform & Subscription Engine** — Phases 24–31 (8 phases, 30 plans — shipped 2026-02-19)
- **v4.0 MedBid Marketplace** — Phases 32–39 (8 phases, TBD plans — in progress)

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

**Milestone Goal:** Add an RFQ marketplace to SiteMedic where UK clients post events needing medical cover, verified medics submit detailed quotes, clients award the job with a deposit payment, and SiteMedic takes commission from the medic's side. Awarded quotes auto-create bookings that flow into existing timesheets, payouts, and compliance reporting. Free to sign up, free to quote at launch.

- [ ] **Phase 32: Foundation Schema & Registration** - Database tables, RLS policies, race-condition prevention, and medic/client registration with verification
- [ ] **Phase 33: Event Posting & Discovery** - Clients create event listings, medics browse and filter by location/qualifications
- [ ] **Phase 34: Quote Submission & Comparison** - Medics submit priced quotes with breakdowns, clients compare anonymised profiles
- [ ] **Phase 35: Award Flow & Payment** - Client awards quote, deposit collected, booking auto-created, remainder charged after event, commission split, payouts
- [ ] **Phase 36: Ratings, Messaging & Disputes** - Bidirectional ratings, per-quote messaging, cancellation policy, dispute resolution
- [ ] **Phase 37: Company Accounts** - Company registration, roster management, company-level quoting, double-up prevention
- [ ] **Phase 38: Notifications & Alerts** - Multi-channel notification system (dashboard feed, email, SMS) with medic preferences
- [ ] **Phase 39: Admin Dashboard** - Platform admin marketplace metrics, event/quote/dispute management, configuration

## Phase Details

### Phase 32: Foundation Schema & Registration
**Goal**: Medics and clients can register on the marketplace, medics can upload qualifications for verification, and platform admin can approve/reject registrations — all on a database foundation with cross-org RLS and race-condition prevention
**Depends on**: Phase 31 (v3.0 complete)
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, REG-07, REG-08
**Success Criteria** (what must be TRUE):
  1. An individual medic can register with name, qualifications, insurance, location, and experience — and browse events immediately (but cannot quote until verified)
  2. A medic company can register with company name, insurance, and admin user — and add individual medics to their roster later
  3. Platform admin sees a verification queue with uploaded documents and can approve, reject, or request more information — approved medics get a "verified" badge
  4. When a medic's certificate expires, their quoting ability is suspended and they receive notification to upload updated documents
  5. Approved medics are guided through Stripe Connect Express onboarding so they can receive payouts
**Plans**: TBD

Plans:
- [ ] 32-01: Marketplace database schema (tables, RLS policies, EXCLUSION constraints, source column on bookings, Zod schemas)
- [ ] 32-02: Medic and client registration flows (signup forms, profile creation, document upload)
- [ ] 32-03: Verification workflow (admin queue, approve/reject/request-info, verified badge, certificate expiry monitoring)
- [ ] 32-04: Stripe Connect onboarding for marketplace medics

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
**Plans**: TBD

Plans:
- [ ] 33-01: Event posting form (multi-step with Zod validation, all event fields)
- [ ] 33-02: Event management (edit restrictions, close/cancel, quote deadline enforcement)
- [ ] 33-03: Event discovery (browse, search, filter by location/qualifications, medic dashboard feed)

### Phase 34: Quote Submission & Comparison
**Goal**: Verified medics can submit detailed quotes on open events, and clients can compare quotes with anonymised medic profiles — no contact details visible until award and deposit
**Depends on**: Phase 33
**Requirements**: QUOT-01, QUOT-02, QUOT-03, QUOT-04, QUOT-05, QUOT-06, QUOT-07, QUOT-08
**Success Criteria** (what must be TRUE):
  1. A verified medic can submit a quote with total price, itemised breakdown (staff/equipment/transport/consumables), cover letter, staffing plan, and availability confirmation
  2. A medic can withdraw a submitted quote at any time before the event is awarded
  3. Client sees all received quotes with price, rating, qualification summary, and response time — but no contact details (phone, email hidden until award + deposit)
  4. Client can view full medic profile (certifications, star rating, experience, past events) only after that medic has submitted a quote
  5. A medic already quoted by their company on an event cannot submit an independent quote on the same event
**Plans**: TBD

Plans:
- [ ] 34-01: Quote submission form (pricing breakdown, cover letter, staffing plan, availability)
- [ ] 34-02: Quote browsing and comparison (client view with anonymised profiles, sorting, filtering)
- [ ] 34-03: Quote management (withdraw, double-up prevention, quote deadline enforcement)

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
**Goal**: Medic companies can manage a roster of individual medics, submit quotes on behalf of the company specifying which medics would be assigned, and the system prevents double-up bidding between company and individual accounts
**Depends on**: Phase 32 (registration foundation), Phase 34 (quoting works for individuals)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. A company admin can add individual medics to their roster — each with their own profile, certifications, and ratings
  2. Company admin can submit quotes on behalf of the company, specifying which medic(s) from their roster would be assigned to the event
  3. When a company quotes with a specific medic on an event, that medic's independent account is locked out from quoting on the same event (and vice versa)
  4. Company profiles display company name, roster size, average rating, total events completed, and insurance status
  5. A medic can belong to one company AND have their own independent account — quoting independently unless their company has already included them
**Plans**: TBD

Plans:
- [ ] 37-01: Company roster management (add/remove medics, individual profiles within company)
- [ ] 37-02: Company quoting (quote as company with medic assignment, company profile display)
- [ ] 37-03: Double-up prevention (cross-account lockout logic, UNIQUE constraints)

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

---

## Progress

**Execution Order:** 01 → 01.5 → 02 → 03 → 04 → 04.5 → 04.6 → 05 → 05.5 → 06 → 06.5 → 07 → 07.5 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 18.5 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 35 → 36 → 37 → 38 → 39

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
| 32. Foundation Schema & Registration | v4.0 | 0/4 | Not started | - |
| 33. Event Posting & Discovery | v4.0 | 0/3 | Not started | - |
| 34. Quote Submission & Comparison | v4.0 | 0/3 | Not started | - |
| 35. Award Flow & Payment | v4.0 | 0/4 | Not started | - |
| 36. Ratings, Messaging & Disputes | v4.0 | 0/3 | Not started | - |
| 37. Company Accounts | v4.0 | 0/3 | Not started | - |
| 38. Notifications & Alerts | v4.0 | 0/3 | Not started | - |
| 39. Admin Dashboard | v4.0 | 0/3 | Not started | - |
