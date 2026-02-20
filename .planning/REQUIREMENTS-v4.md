# Requirements: SiteMedic v4.0 — MedBid Marketplace

**Defined:** 2026-02-19
**Core Value:** UK clients post events needing medical cover, medics submit detailed quotes, clients award the job, and SiteMedic takes a commission — with awarded quotes auto-creating bookings that flow into the existing dashboard, timesheets, and payout systems.

## v4.0 Requirements

### EVNT — Event Posting

- [ ] **EVNT-01**: Client can create an event listing with: event name, type (festival, motorsport, corporate, film/TV, construction, sports, other), description, and special requirements
- [ ] **EVNT-02**: Client provides dates/times, location/postcode, indoor/outdoor, and expected attendance for each event
- [ ] **EVNT-03**: Client specifies staffing requirements: number of medics needed and qualification level (first aider, EMT, paramedic, doctor)
- [ ] **EVNT-04**: Client can optionally provide a budget range so medics know the ballpark
- [ ] **EVNT-05**: Client can edit an open event listing before any quotes are received; after quotes arrive, only description and special requirements can be updated
- [ ] **EVNT-06**: Client can close/cancel an event listing at any time (with appropriate notifications to medics who have quoted)
- [ ] **EVNT-07**: Event listings have a quote deadline after which no new quotes can be submitted
- [ ] **EVNT-08**: Events are visible only to verified medics whose qualifications match the staffing requirements

### QUOT — Quote Submission & Browsing

- [x] **QUOT-01**: Verified medic can submit a quote on an open event with: total price, itemised breakdown (staff costs, equipment, transport, consumables), cover letter/pitch, and availability confirmation
- [x] **QUOT-02**: Medic can attach a proposed staffing plan to their quote (who they would deploy, with what qualifications)
- [x] **QUOT-03**: Medic can withdraw a submitted quote at any time before the event is awarded
- [x] **QUOT-04**: Client sees a list of received quotes with: price, medic/company rating, qualification summary, and response time — but NO contact details
- [x] **QUOT-05**: Client can view full medic profile (certifications, star rating, experience, past event history) only after the medic has submitted a quote
- [x] **QUOT-06**: Client can sort quotes by price, rating, or response time and filter by qualification level
- [x] **QUOT-07**: Medic contact details (phone, email) remain hidden until the event is awarded AND deposit is paid
- ~~**QUOT-08**: A medic who is already quoted by their company on an event cannot submit an independent quote on the same event (double-up prevention)~~ — N/A (companies only, no individual medic bidding)

### AWRD — Award Flow & Payment

- [ ] **AWRD-01**: Client can award an event to their chosen quote — triggering a deposit payment (configurable percentage, default 25%) via Stripe
- [ ] **AWRD-02**: On successful deposit, a booking record is auto-created in the existing SiteMedic system with source='marketplace' — linking to timesheets, payouts, and compliance reporting
- [ ] **AWRD-03**: Winning medic receives immediate notification (email + SMS + dashboard) with event details and client contact information
- [ ] **AWRD-04**: Non-selected medics receive a "not selected" notification when the event is awarded
- [ ] **AWRD-05**: After event completion, the remainder payment is auto-charged to the client's saved payment method
- [ ] **AWRD-06**: SiteMedic commission is deducted from the medic's side using the existing platform_fee_percent/medic_payout_percent pattern — client pays exactly the quoted amount
- [ ] **AWRD-07**: Medic payout follows the existing friday-payout pipeline via Stripe Connect Transfer after the remainder is collected
- [ ] **AWRD-08**: Client's payment method is saved at deposit time (Stripe SetupIntent) to enable the off-session remainder charge weeks later
- [ ] **AWRD-09**: If the remainder charge fails (e.g., expired card), the client receives email + SMS notification with a link to update their payment method and retry

### REG — Registration & Verification

- [x] **REG-01**: Individual medics can register on the marketplace with: name, qualifications, certifications, insurance details, location/coverage area, and experience summary
- [x] **REG-02**: Medic companies can register with: company name, insurance, admin user — and then add individual medics to their roster
- [x] **REG-03**: New medics can register and browse events immediately, but cannot submit quotes until their qualifications are verified
- [x] **REG-04**: Medics upload qualification certificates, insurance documents, and optionally DBS check status during registration
- [x] **REG-05**: Platform admin sees a verification queue of pending medic registrations with uploaded documents — can approve, reject, or request additional information
- [x] **REG-06**: Approved medics receive a "verified" badge on their profile and can begin submitting quotes
- [x] **REG-07**: Verification expires when certificates expire — medic is notified and quoting is suspended until updated documents are reviewed
- [x] **REG-08**: New marketplace registrants get Stripe Connect onboarding (Express account) so they can receive payouts

### COMP — Company Accounts

- [ ] **COMP-01**: A medic company account can add individual medics to their roster — each with their own profile, certifications, and ratings
- [ ] **COMP-02**: Company admin can submit quotes on behalf of the company, specifying which medic(s) from their roster would be assigned
- [ ] **COMP-03**: When a company quotes with a specific medic on an event, that medic's independent account (if they have one) is locked out from quoting on the same event
- [ ] **COMP-04**: Company profiles display: company name, number of medics on roster, average rating, total events completed, insurance status
- [ ] **COMP-05**: A medic can belong to one company AND have their own independent account — they quote independently unless their company has already included them in a company quote

### RATE — Ratings & Reviews

- [x] **RATE-01**: After event completion, client can rate the medic/company with a star rating (1-5) and written review
- [x] **RATE-02**: After event completion, medic can rate the client with a star rating (1-5) and written review
- [x] **RATE-03**: Ratings are visible on profiles and influence quote comparison sorting
- [x] **RATE-04**: Both parties have 14 days after event completion to leave a rating — after that the review window closes
- [x] **RATE-05**: Platform admin can moderate reviews (remove inappropriate content, respond to disputes about reviews)

### MSG — Platform Messaging

- [x] **MSG-01**: Client can send messages to medics who have quoted on their event — conversation is visible to both parties within the platform
- [x] **MSG-02**: Medic can ask clarifying questions about an event before submitting a quote via platform messaging
- [x] **MSG-03**: All messages are stored on-platform — no external email/phone sharing before award + deposit
- [x] **MSG-04**: Email notification sent when a new message is received, with a link back to the platform conversation (message content NOT included in email to prevent off-platform communication)

### DISP — Dispute Resolution

- [x] **DISP-01**: Either party can raise a dispute after an event (medic no-show, client cancelled last minute, service quality issue, event not as described)
- [x] **DISP-02**: Disputes trigger a hold on the remainder payment until resolved
- [x] **DISP-03**: Platform admin can review disputes, communicate with both parties, and issue resolution (full payout, partial refund, full refund, deposit forfeiture)
- [x] **DISP-04**: Clear cancellation policy: client cancellation >14 days = full deposit refund; 7-14 days = 50% deposit retained; <7 days = full deposit retained by medic

### NOTIF — Notifications

- [ ] **NOTIF-01**: New event listings trigger dashboard feed updates for medics whose qualifications and location match
- [ ] **NOTIF-02**: New event listings trigger email alerts to matching medics with event summary (no client contact details)
- [ ] **NOTIF-03**: Urgent or high-value events (e.g., <7 days away, >£2,000 budget) trigger SMS alerts to matching nearby medics
- [ ] **NOTIF-04**: Quote received, award, rejection, payment, rating, and message events all generate appropriate notifications
- [ ] **NOTIF-05**: Medics can configure notification preferences (which channels, which event types, location radius)

### ADMIN — Platform Administration

- [ ] **ADMIN-01**: Platform admin dashboard shows marketplace metrics: total events posted, total quotes, conversion rate (quotes → awards), total marketplace revenue
- [ ] **ADMIN-02**: Platform admin can view and manage all events, quotes, awards, and disputes
- [ ] **ADMIN-03**: Platform admin can configure marketplace settings: default commission rate, deposit percentage, quote deadline defaults
- [ ] **ADMIN-04**: Platform admin can suspend or ban marketplace users (medics or clients) who violate terms

## v4.1 Requirements (Deferred — Credits & Monetisation)

### Credits System
- **CRED-01**: Medics purchase credit packs to submit quotes (like Upwork Connects)
- **CRED-02**: Credits refunded when medic wins a job or client doesn't award anyone
- **CRED-03**: Early access to new event listings available for premium credits
- **CRED-04**: Tiered medic priority — SiteMedic roster medics get priority access before open marketplace

### Advanced Features
- **ADV-01**: Purple Guide risk calculator embedded in event posting form
- **ADV-02**: Repeat booking tool — clients can re-hire previous medics with one click
- **ADV-03**: Automated HCPC register verification (semi-automated check against hcpc-uk.org)
- **ADV-04**: Marketplace analytics for medics (win rate, average quote vs. winning quote, response time benchmarking)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Credits/points system | Premature — kills marketplace liquidity before volume exists. Deferred to v4.1 after real usage data. |
| Auction/reverse-auction bidding | Price-only bidding for safety-critical medical staffing is inappropriate. RFQ model chosen deliberately. |
| Automated DBS checks | Regulated activity requiring specific authorisation. Platform collects self-declared info + admin review only. |
| CQC registration for the platform | Requires legal counsel to determine if marketplace model constitutes "arranging" regulated activities. Non-code blocker — must resolve before launch. |
| Mobile app marketplace integration | Web-first for marketplace. Mobile app integration deferred to v4.1+. |
| Marketplace on separate domain | Lives at sitemedic.co.uk/marketplace. No separate brand or domain. |
| Custom commission per event | Single platform_fee_percent for all marketplace transactions. Per-event negotiation adds complexity with minimal benefit at launch. |
| Real-time bidding / live auctions | Incompatible with RFQ model. Events stay open for a deadline period, not live-bid. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVNT-01 | Phase 33 | Pending |
| EVNT-02 | Phase 33 | Pending |
| EVNT-03 | Phase 33 | Pending |
| EVNT-04 | Phase 33 | Pending |
| EVNT-05 | Phase 33 | Pending |
| EVNT-06 | Phase 33 | Pending |
| EVNT-07 | Phase 33 | Pending |
| EVNT-08 | Phase 33 | Pending |
| QUOT-01 | Phase 34 | Complete |
| QUOT-02 | Phase 34 | Complete |
| QUOT-03 | Phase 34 | Complete |
| QUOT-04 | Phase 34 | Complete |
| QUOT-05 | Phase 34 | Complete |
| QUOT-06 | Phase 34 | Complete |
| QUOT-07 | Phase 34 | Complete |
| QUOT-08 | Phase 34 | N/A |
| AWRD-01 | Phase 35 | Pending |
| AWRD-02 | Phase 35 | Pending |
| AWRD-03 | Phase 35 | Pending |
| AWRD-04 | Phase 35 | Pending |
| AWRD-05 | Phase 35 | Pending |
| AWRD-06 | Phase 35 | Pending |
| AWRD-07 | Phase 35 | Pending |
| AWRD-08 | Phase 35 | Pending |
| AWRD-09 | Phase 35 | Pending |
| REG-01 | Phase 32 | Complete |
| REG-02 | Phase 32 | Complete |
| REG-03 | Phase 32 | Complete |
| REG-04 | Phase 32 | Complete |
| REG-05 | Phase 32 | Complete |
| REG-06 | Phase 32 | Complete |
| REG-07 | Phase 32 | Complete |
| REG-08 | Phase 32 | Complete |
| COMP-01 | Phase 37 | Pending |
| COMP-02 | Phase 37 | Pending |
| COMP-03 | Phase 37 | Pending |
| COMP-04 | Phase 37 | Pending |
| COMP-05 | Phase 37 | Pending |
| RATE-01 | Phase 36 | Complete |
| RATE-02 | Phase 36 | Complete |
| RATE-03 | Phase 36 | Complete |
| RATE-04 | Phase 36 | Complete |
| RATE-05 | Phase 36 | Complete |
| MSG-01 | Phase 36 | Complete |
| MSG-02 | Phase 36 | Complete |
| MSG-03 | Phase 36 | Complete |
| MSG-04 | Phase 36 | Complete |
| DISP-01 | Phase 36 | Complete |
| DISP-02 | Phase 36 | Complete |
| DISP-03 | Phase 36 | Complete |
| DISP-04 | Phase 36 | Complete |
| NOTIF-01 | Phase 38 | Pending |
| NOTIF-02 | Phase 38 | Pending |
| NOTIF-03 | Phase 38 | Pending |
| NOTIF-04 | Phase 38 | Pending |
| NOTIF-05 | Phase 38 | Pending |
| ADMIN-01 | Phase 39 | Pending |
| ADMIN-02 | Phase 39 | Pending |
| ADMIN-03 | Phase 39 | Pending |
| ADMIN-04 | Phase 39 | Pending |

**Coverage:**
- v4.0 requirements: 60 total
- Mapped to phases: 60/60
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after roadmap creation — all 60 requirements mapped to Phases 32-39*
