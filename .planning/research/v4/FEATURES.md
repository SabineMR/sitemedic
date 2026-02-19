# Feature Landscape: MedBid Marketplace

**Domain:** UK Event Medical Cover RFQ/Bidding Marketplace
**Researched:** 2026-02-19
**Overall confidence:** HIGH (cross-referenced across Upwork, Bark, Thumbtack, Checkatrade, PeoplePerHour, Fiverr, Add to Event, and UK event medical industry sources)

---

## Table Stakes

Features users expect. Missing any of these and the platform feels broken or untrustworthy. These are non-negotiable for launch.

### TS-01: Event Posting (Request for Quotes)

| Aspect | Detail |
|--------|--------|
| **Why expected** | The entire marketplace revolves around clients describing what they need. Every reference platform (Bark, Thumbtack, Add to Event, Upwork) starts with a structured request form. Without this, there is no marketplace. |
| **Complexity** | Medium |
| **What it includes** | Event name, type (festival, motorsport, corporate, film/TV, construction, sports day, etc.), date(s) and times, location/postcode, expected attendance, indoor/outdoor, risk level indicators, staffing requirements (number and level -- first aider, EMT, paramedic, doctor, ambulance crew), budget range (optional), description/special requirements, whether alcohol served, age profile of attendees, whether previous medical data exists |
| **UK-specific** | Must collect enough data for a Purple Guide-aligned Medical Needs Assessment. Event type, attendance, duration, alcohol presence, audience profile, and terrain are all inputs to the standard UK event medical risk calculator. The form should either embed or mirror the Purple Guide scoring approach so medics can quote accurately. |
| **Dependencies** | User authentication, location/postcode system (already exists in SiteMedic) |
| **Reference** | Add to Event uses category + structured questions. Bark uses a wizard with progressive disclosure. Thumbtack uses detailed project descriptions. All three convert freeform needs into structured data that providers can evaluate. |
| **Anti-pattern to avoid** | Do NOT make the form so long that clients abandon it. Progressive disclosure (show advanced fields only when relevant) is critical. Bark's wizard approach -- answer 4-6 questions, done -- outperforms long single-page forms. |

### TS-02: Quote Submission and Management

| Aspect | Detail |
|--------|--------|
| **Why expected** | The medic side of the marketplace. Without a structured quoting mechanism, the platform is just a job board. Every bidding platform (Upwork proposals, Bark quotes, Thumbtack quotes, Add to Event supplier responses) has this. |
| **Complexity** | Medium-High |
| **What it includes** | Total price, itemised breakdown (staff costs, equipment, transport, ambulance provision, consumables), cover letter/pitch explaining approach, proposed staffing plan (who they would deploy, with what qualifications), availability confirmation, estimated response time, any conditions or caveats, attachment support (insurance cert, risk assessment template) |
| **UK-specific** | Quotes should indicate CQC registration status (if providing regulated activities like ambulance transport or treatment beyond first aid). Insurance certificate reference. Proposed staff qualification levels (FREC 3/4/5, HCPC paramedic, nurse, doctor). |
| **Dependencies** | TS-01 (event posting), medic registration and profiles |
| **Reference** | Upwork proposals include cover letter + price + timeline. PeoplePerHour proposals cost 1 credit each. Bark charges per lead contact. Add to Event lets suppliers send bespoke quotes. |
| **Anti-pattern to avoid** | Do NOT allow price-only quotes without context. The whole point of RFQ over auction is that quality matters alongside price. Require at least a brief pitch and staffing plan. |

### TS-03: Quote Comparison and Browsing (Client Side)

| Aspect | Detail |
|--------|--------|
| **Why expected** | Clients need to compare quotes side-by-side to make informed decisions. This is the core value proposition -- getting multiple competing quotes for comparison. |
| **Complexity** | Medium |
| **What it includes** | List of received quotes with key info visible (price, medic/company name, rating, response time, qualifications summary), side-by-side comparison view, medic profile preview (certs, experience, past ratings), ability to ask follow-up questions (in-platform messaging), sort by price/rating/response time, filter by qualification level |
| **UK-specific** | Must display CQC registration status prominently. Qualification levels (FREC 3 vs paramedic vs doctor) are critical differentiators in UK event medical. |
| **Dependencies** | TS-02 (quotes must exist to browse), medic profiles, ratings system |
| **Reference** | Add to Event shows quotes with supplier profiles, reviews, and photos. Checkatrade surfaces trust signals (vetting checks, insurance, reviews) in listing cards. |
| **Design principle** | Contact details MUST remain hidden until award + deposit. This is the primary anti-disintermediation mechanism. Medic name and profile visible, but phone/email only revealed after payment. (Bark, Upwork, and Thumbtack all gate contact info behind payment.) |

### TS-04: Award Flow (Quote Selection to Contract)

| Aspect | Detail |
|--------|--------|
| **Why expected** | The moment a client picks a quote, both sides need clarity on what happens next. Without a clean award flow, the marketplace has no transaction completion. |
| **Complexity** | Medium-High |
| **What it includes** | Client clicks "Award" on chosen quote, confirmation dialog with summary (price, dates, staffing plan), deposit payment collection (Stripe), automatic notification to winning medic, automatic "not selected" notification to other quoters, generation of booking agreement/terms, contact details exchange (post-deposit), auto-creation of booking record in SiteMedic dashboard |
| **UK-specific** | The booking agreement should reference standard terms for event medical cover. Consider including cancellation terms aligned with UK Consumer Rights Act 2015 (for B2C) or standard B2B commercial terms. |
| **Dependencies** | TS-02 (quote selection), TS-05 (deposit payment), booking integration with existing SiteMedic system |
| **Reference** | Upwork: accept proposal -> fund milestone -> work begins. Bark: contact supplier -> arrange directly. Add to Event: select supplier -> book directly. MedBid should be closer to Upwork (platform-mediated) than Bark (off-platform handoff). |
| **Critical detail** | The award MUST auto-create a booking in the existing SiteMedic system. This is the integration bridge -- an awarded MedBid quote becomes a SiteMedic booking with all the existing timesheet, payout, and compliance features. |

### TS-05: Deposit and Remainder Payment

| Aspect | Detail |
|--------|--------|
| **Why expected** | Money must change hands for the marketplace to function. A deposit secures the medic's commitment; remainder after event completion balances risk. This is standard in event services (Add to Event suppliers typically require deposits). |
| **Complexity** | High |
| **What it includes** | Deposit collected at award (percentage of total quote, e.g. 25-50%), deposit held via Stripe Connect (existing integration), remainder charged after event completion (triggered by medic confirming completion or auto-triggered X days post-event), commission deducted from medic's share (existing platform_fee_percent/medic_payout_percent), refund policy for cancellations (tiered by how far in advance), payment receipts and invoicing |
| **UK-specific** | FCA regulations: if MedBid holds client funds before releasing to medic, this may constitute a regulated payment service. Using Stripe Connect (where Stripe is the regulated entity) avoids MedBid needing FCA registration. New safeguarding rules for payment firms take effect May 2026 -- Stripe handles this, but worth monitoring. VAT implications: medics over the VAT threshold must charge VAT on their quotes. Platform commission is a separate VAT-able supply. |
| **Dependencies** | Stripe Connect (already integrated in SiteMedic), TS-04 (award triggers deposit) |
| **Reference** | Upwork: client funds escrow before work starts, 14-day review period, then 5-day security hold. For event medical, the flow is simpler: deposit on award, remainder on completion, no milestone complexity needed. |
| **Risk** | Dispute scenarios: client cancels last minute, medic no-shows, event is cancelled by force majeure. Need clear policies for each. |

### TS-06: User Registration and Profiles

| Aspect | Detail |
|--------|--------|
| **Why expected** | Both sides need accounts to participate. Individual medics, medic companies, and event clients all need distinct registration flows. |
| **Complexity** | Medium |
| **What it includes** | **Client registration:** company name, contact person, email, phone, event history (optional). **Individual medic registration:** name, qualifications, certifications, insurance details, experience summary, location/coverage area, portfolio/past events. **Company registration:** company name, CQC number (if applicable), insurance, roster of medics, admin user(s). Progressive profiling -- basic signup first, complete profile over time. |
| **UK-specific** | DBS check status (not conducting checks, but medics self-declaring and uploading). HCPC registration number for paramedics (verifiable against HCPC register). CQC registration number for companies providing regulated activities. Public liability insurance certificate upload. Professional indemnity insurance. |
| **Dependencies** | Auth system (Supabase Auth, already exists), file storage for certificates |
| **Reference** | Checkatrade runs up to 12 background checks on tradespeople. Fiverr has progressive profile completion with percentage indicators. Bark requires basic info then builds profile over time. |
| **Important distinction** | The platform does NOT conduct DBS checks or verify qualifications directly (that is a regulated activity requiring specific authorisation). The platform collects self-declared information and uploaded certificates. Verification is a manual admin review process (flag as "verified" or "unverified"). |

### TS-07: Medic Verification Workflow

| Aspect | Detail |
|--------|--------|
| **Why expected** | Trust is everything in healthcare staffing. Clients hiring medical cover for events need confidence that the medics are genuinely qualified. Unverified medics quoting on medical jobs would destroy platform credibility. |
| **Complexity** | Medium |
| **What it includes** | Document upload during registration (qualification certificates, insurance, DBS), admin review queue with approve/reject/request-more-info, verification badge on profile once approved, tiered verification (basic = self-declared, verified = admin-reviewed documents, premium = reference-checked), re-verification triggers (when certs expire, annual review), suspension for expired mandatory documents |
| **UK-specific** | HCPC registration can be verified online at hcpc-uk.org. CQC registration can be verified at cqc.org.uk. These could be semi-automated checks. Insurance certificates should show valid dates. First aid qualifications (FREC, FAW) have standard expiry periods (typically 3 years). |
| **Dependencies** | TS-06 (registration provides the documents), admin dashboard |
| **Reference** | Checkatrade: up to 12 checks, verified badge. Fiverr Pro: vetted badge for manually reviewed professionals. Upwork: identity verification + skills tests. |
| **Anti-pattern to avoid** | Do NOT make verification so onerous that it blocks marketplace supply. Allow medics to register and browse immediately, but gate quoting behind minimum verification (valid qualifications uploaded + admin approval). |

### TS-08: Bidirectional Ratings and Reviews

| Aspect | Detail |
|--------|--------|
| **Why expected** | Every successful marketplace (Uber, Airbnb, Upwork, Checkatrade) has a rating system. Without ratings, repeat clients have no way to distinguish good medics from bad, and good medics have no way to build reputation. |
| **Complexity** | Medium |
| **What it includes** | Star rating (1-5) + written review, both directions (client rates medic, medic rates client), review window (e.g. 14 days after event completion), double-blind reveal (neither party sees the other's review until both have submitted or the review window expires), review prompts via email/notification, aggregate rating displayed on profiles, review moderation (flag inappropriate content) |
| **UK-specific** | UK Consumer Protection from Unfair Trading Regulations 2008 -- reviews must be genuine, not manufactured. Checkatrade verifies 90% of reviews by SMS/phone call. Consider SMS verification for review authenticity. |
| **Dependencies** | TS-04 (award and completion must happen before rating), event completion confirmation |
| **Reference** | Airbnb double-blind reviews (simultaneous reveal) are the gold standard for preventing retaliation bias. Checkatrade verifies reviews and has published 6.2M+ reviews. Upwork allows review responses. |
| **Anti-gaming measures** | Double-blind reveal prevents retaliation. Only allow reviews on completed bookings (no fake reviews). Flag accounts with suspicious review patterns. Allow medic to respond publicly to reviews (like Google Business). Time-limited review window prevents grudge reviews months later. |

### TS-09: In-Platform Messaging

| Aspect | Detail |
|--------|--------|
| **Why expected** | Clients need to ask clarification questions about quotes. Medics need to ask clarification about events. Without messaging, users go off-platform (email, phone) and the marketplace loses control. |
| **Complexity** | Medium |
| **What it includes** | Quote-linked messaging (conversation per quote), pre-award messaging (clarification questions only, no contact details shared), post-award messaging (full contact exchange), file attachment support (photos, documents), notification of new messages (email + in-app), read receipts, message history preserved |
| **UK-specific** | UK GDPR: messages may contain personal data. Retention policy needed. Data subject access requests must be able to export message history. |
| **Dependencies** | TS-02 (messages attached to quotes), notification system |
| **Anti-disintermediation** | Pre-award messages should be monitored (or at minimum, users warned) for exchange of contact details. NLP-based detection is used by Upwork and Fiverr. At minimum, filter obvious patterns (phone numbers, email addresses) from pre-award messages. |
| **Reference** | Upwork monitors messages for contact info exchange. Bark reveals contact info immediately (different model -- they charge per lead, not commission). For a commission model like MedBid, gating contact info is essential. |

### TS-10: Multi-Channel Notifications

| Aspect | Detail |
|--------|--------|
| **Why expected** | Medics need to know about new events quickly (first-mover advantage on quotes). Clients need to know when quotes arrive. Both sides need award/payment/review notifications. Without notifications, the marketplace is a dead zone. |
| **Complexity** | Medium |
| **What it includes** | **In-app dashboard feed** (real-time or polling, new events, new quotes, award notifications, payment confirmations, review requests). **Email notifications** (new matching events for medics, new quotes for clients, award confirmation, payment receipts, review reminders). **SMS notifications** (urgent/high-value events, award confirmation, payment issues -- SMS is expensive, reserve for high-priority). Notification preferences (user controls which channels for which events). Digest option (daily summary vs real-time). |
| **UK-specific** | PECR (Privacy and Electronic Communications Regulations): marketing SMS requires explicit opt-in consent. Transactional SMS (booking confirmations, payment alerts) does not require marketing consent but should still have opt-out. Use UK SMS providers or international providers with UK sender IDs. |
| **Dependencies** | All marketplace features generate notifications. Resend (existing email provider in SiteMedic), SMS provider (Twilio or similar) |
| **Reference** | Microsoft Azure best practices: reserve SMS for must-read items, email for reference items, push for time-sensitive items. Bark sends email + push for new leads. Thumbtack sends push for matching jobs. |
| **Priority matrix** | New event matching medic's profile: email (immediate) + dashboard. New quote received: email + dashboard. Award confirmation: email + SMS + dashboard. Payment processed: email + dashboard. Review request: email + dashboard (3 days post-event). |

### TS-11: Search, Filtering, and Event Discovery

| Aspect | Detail |
|--------|--------|
| **Why expected** | Medics need to find events they can serve. Without search/filter, medics must scroll through all events, which does not scale beyond a handful of listings. |
| **Complexity** | Medium |
| **What it includes** | Filter by: event type, date range, location/radius from postcode, budget range, qualification requirements, staffing level needed. Sort by: date posted, event date, budget, distance. Saved searches / alert subscriptions. Map view (events on a map, using existing react-leaflet). Quick filters (e.g. "Near me this weekend", "Festivals this month"). |
| **UK-specific** | Postcode-based search radius (existing UK postcode system in SiteMedic). Consider regional groupings (London, South East, North West, etc.) as macro filters. |
| **Dependencies** | TS-01 (events must exist to search), location/postcode system, medic profile (to match qualifications) |
| **Reference** | Thumbtack matches pros with relevant jobs based on preferences. Bark pushes matching leads to professionals. Add to Event has 350+ categories with location search. |

---

## Differentiators

Features that set MedBid apart from generic marketplaces and manual quoting processes. Not strictly expected, but significantly increase value and competitiveness.

### DF-01: Purple Guide Risk Calculator Integration

| Aspect | Detail |
|--------|--------|
| **Value proposition** | No other UK event medical marketplace embeds the Purple Guide scoring methodology directly into the event posting flow. This gives clients an immediate, evidence-based estimate of what medical cover they need, and gives medics confidence that events are properly scoped. |
| **Complexity** | Medium |
| **What it includes** | Built-in calculator that takes event details (attendance, type, duration, alcohol, venue type, audience profile) and outputs a recommended staffing level (number and type of medical staff, whether ambulance needed). Auto-populates the event posting's "staffing requirements" field. Shows client what the industry standard recommends. Medics can see the Purple Guide score when quoting, building trust that the event is properly described. |
| **Why differentiating** | Currently, event organisers either use manual risk assessments or rely on individual medical providers to advise. A platform-level calculator standardises expectations and reduces quoting friction. Medical providers like Event Medical Services, Platinum Ambulance, and CTC Medical Services already offer web-based calculators -- embedding one into the marketplace is a competitive advantage over generic quote platforms like Add to Event. |
| **Dependencies** | TS-01 (event posting form provides the inputs) |

### DF-02: SiteMedic Dashboard Integration (Award-to-Booking Bridge)

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Awarded quotes automatically become SiteMedic bookings with full compliance tooling -- incident reporting, timesheets, payouts, PDF reports. No other event medical marketplace offers end-to-end from quote to compliance. |
| **Complexity** | High |
| **What it includes** | Award triggers auto-creation of booking record in existing SiteMedic system, medic gets access to the event in their mobile app (clinical logging, incident forms, timesheets), client gets access to their SiteMedic dashboard for that event (compliance reports, treatment logs), post-event data flows into existing payout and commission system. |
| **Why differentiating** | Add to Event, Bark, and generic marketplaces hand off after the quote is accepted. There is no post-booking platform value. MedBid keeps both parties on-platform through the entire event lifecycle, which: (a) creates ongoing value that prevents disintermediation on repeat bookings, (b) generates compliance data that becomes a competitive moat, (c) gives clients a reason to come back (their event medical history, compliance records). |
| **Dependencies** | Existing SiteMedic booking system, vertical support (events vertical already exists), TS-04 (award flow) |

### DF-03: Company Accounts with Roster Management

| Aspect | Detail |
|--------|--------|
| **Value proposition** | UK event medical is dominated by companies (not individual freelancers). Supporting company accounts with roster management makes MedBid usable by the actual market structure. Generic freelancer marketplaces (Upwork, PeoplePerHour) only support individual accounts. |
| **Complexity** | High |
| **What it includes** | Company creates an account with admin user(s). Admin adds medics to roster (by invitation or linking existing individual accounts). Company submits quotes specifying which roster medics will be deployed. Double-up prevention: when a company quotes with a specific medic on an event, that medic cannot independently quote on the same event (prevents the same person appearing twice). Company-level ratings (aggregate of individual medic ratings on company jobs). Company-level verification (CQC, insurance, company-wide). Individual medic profiles within the company (each with their own qualifications and ratings). |
| **Why differentiating** | Most marketplace platforms treat providers as individuals. The UK event medical industry has companies managing teams of medics. Supporting this natively (not as a workaround) makes MedBid the right tool for the market. Double-up prevention is a feature no generic marketplace offers because it is domain-specific. |
| **Dependencies** | TS-06 (registration), TS-07 (verification at company and individual level), multi-tenant architecture |

### DF-04: Medic Qualification Matching

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Auto-match events to qualified medics based on the event's requirements and the medic's verified qualifications. Prevents unqualified medics from quoting on events they cannot serve. |
| **Complexity** | Medium |
| **What it includes** | Event posting specifies required qualification level (e.g. "minimum FREC 4 or HCPC paramedic"). Medic profiles have verified qualification data. Platform only shows events to medics who meet minimum requirements (or shows them with a "you don't meet requirements" warning). Quote submission validates qualification match. Search results prioritise qualification-matched medics. |
| **Why differentiating** | Generic marketplaces (Add to Event, Bark) have no concept of qualification matching for medical services. They just send all leads to all providers. Domain-specific matching is a significant quality-of-life improvement for both sides. |
| **Dependencies** | TS-06 (medic profiles with qualifications), TS-07 (verification), TS-01 (event requirements) |

### DF-05: Cancellation and Dispute Resolution Framework

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Events get cancelled. Medics sometimes cannot attend. Weather, force majeure, and disagreements happen. A clear, fair cancellation and dispute framework builds trust that the platform protects both sides. |
| **Complexity** | Medium-High |
| **What it includes** | **Cancellation tiers:** Full refund if cancelled X+ days before event, partial refund for shorter notice, no refund for very late cancellation (medic already committed). **Medic cancellation:** penalties for late cancellation (rating impact, potential suspension for repeat offenders). **Dispute workflow:** either party raises dispute -> platform reviews -> resolution (refund, partial payment, etc.). **Force majeure clause:** events cancelled due to weather, government restrictions, etc. treated differently from elective cancellation. Dispute history tracked for pattern detection. |
| **Why differentiating** | Bark and Add to Event leave dispute resolution entirely to the parties. Upwork has a formal dispute resolution process. Having a structured process specifically designed for event medical (where cancellations have real safety implications -- an event without medical cover is a safety risk) is a domain differentiator. |
| **Dependencies** | TS-05 (payments to refund), TS-08 (rating impact) |

### DF-06: Repeat Booking and Client Preferences

| Aspect | Detail |
|--------|--------|
| **Value proposition** | Event organisers who find a good medic want to book them again without going through the full RFQ process. Supporting this keeps repeat transactions on-platform (anti-disintermediation) and reduces friction for recurring events. |
| **Complexity** | Medium |
| **What it includes** | "Rebook" button on past bookings (sends direct invite to the same medic). Favourite medics list. Private event posting (invite specific medics to quote, not open marketplace). Recurring event templates (same event weekly/monthly, auto-post with previous details). Medic can set up availability calendar for repeat clients. |
| **Why differentiating** | This directly addresses the #1 disintermediation risk: after a successful first booking, client and medic exchange details and go off-platform. Making repeat booking easier ON-platform than off-platform is the key anti-leakage strategy. Sharetribe's marketplace academy identifies this as the most important retention mechanism. |
| **Dependencies** | TS-04 (completed booking history), TS-08 (ratings inform rebooking decisions) |

### DF-07: Event Medical Compliance Documentation

| Aspect | Detail |
|--------|--------|
| **Value proposition** | After the event, clients get a professional compliance package: Medical Needs Assessment, post-event medical report, incident summaries, all generated from SiteMedic data. This is something no other marketplace provides. |
| **Complexity** | Medium (leverages existing SiteMedic PDF generation) |
| **What it includes** | Pre-event: Medical Needs Assessment document generated from event posting data. Post-event: Medical cover report with staffing details, incident count, treatment summaries (anonymised per GDPR), and recommendations. Downloadable for client's insurance, licensing authority, or safety file. Template compliance documents that medics can use in their quotes. |
| **Why differentiating** | This is the SiteMedic "unfair advantage" -- the existing compliance engine becomes a marketplace differentiator. No other event medical marketplace generates post-event compliance documentation. Event organisers need these documents for licensing authorities, insurers, and health & safety files. |
| **Dependencies** | DF-02 (SiteMedic dashboard integration), existing PDF generation, events vertical |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in marketplace design that would hurt MedBid.

### AF-01: Auction/Reverse Auction (Price-Only Bidding)

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| Letting medics bid purely on price, with the lowest price winning automatically | Medical cover is a safety-critical service. Race-to-the-bottom pricing leads to underqualified staff, inadequate equipment, and unsafe events. The UK event medical industry already struggles with undercutting. An auction model would accelerate this problem and damage platform reputation. | RFQ model where quotes include staffing plan, qualifications, equipment, cover letter. Client chooses on quality + price, not price alone. Display quotes sorted by "recommended" (rating + qualifications + price) not by cheapest. |

### AF-02: Instant Matching / Auto-Assignment for Marketplace

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| Automatically assigning a medic to an event without client choice (like Uber assigns drivers) | Event medical cover is a considered purchase, not an impulse transaction. Clients need to evaluate qualifications, experience, and proposed approach. Auto-matching removes the quality assessment that makes RFQ valuable. The existing SiteMedic auto-assignment is for Kai's own staffing -- marketplace clients want to choose. | Let clients browse quotes, compare profiles, and make informed decisions. Offer "recommended" sorting but never force-assign. |

### AF-03: Real-Time Chat Before Deposit

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| Full real-time messaging (like WhatsApp) between client and medic before any payment commitment | Creates massive disintermediation risk. Users will exchange phone numbers within minutes and go off-platform. Real-time chat before commitment also sets expectations for instant responses, creating pressure on medics. | Structured pre-award messaging (asynchronous, linked to specific quotes). Messages pass through platform. Filter obvious contact info patterns. Full contact exchange only after award + deposit. |

### AF-04: Conducting DBS Checks or Qualification Verification Directly

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| MedBid acting as a DBS check provider or qualification verification authority | Conducting DBS checks requires registration as a Registered Body with the DBS. Verifying professional registrations could create liability if a check is missed or incorrect. This is a regulated activity that would require specific compliance infrastructure. | Collect self-declared information and uploaded certificates. Allow admin manual review. Link to HCPC/CQC online registers for spot-checking. Make it clear in terms that verification is the medic's responsibility and MedBid facilitates but does not guarantee. Display "platform-verified documents" badge (documents reviewed) not "qualified" badge (implying independent verification). |

### AF-05: Open Marketplace Without Any Verification Gate

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| Allowing anyone to sign up and immediately start quoting on medical events with no checks at all | Medical staffing is safety-critical. An unqualified person providing "medical cover" at an event could result in patient harm, legal liability, and destruction of platform credibility. Even Bark (a general services marketplace) allows filtering by verified status. | Tiered access: register immediately, browse events immediately, but cannot submit quotes until minimum verification (valid qualification certificate uploaded + admin approval). Fast-track verification with clear SLAs (e.g. 24-48 hours). |

### AF-06: Building a Native Mobile App for the Marketplace (at Launch)

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| Creating a dedicated marketplace mobile app for quoting and event browsing alongside the existing SiteMedic clinical app | The clinical SiteMedic app serves on-site medics during shifts. The marketplace (browsing events, writing quotes, managing awards) is a different workflow best done on larger screens with more deliberate interaction. Building a separate marketplace app doubles mobile development effort for limited benefit. | Web-first marketplace (responsive, works on mobile browsers). The existing SiteMedic mobile app gains a "My MedBid Jobs" section showing awarded bookings. Full marketplace browsing/quoting via responsive web. Mobile app integration only for awarded bookings (which become SiteMedic bookings). |

### AF-07: Complex Gamification at Launch

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| Implementing Fiverr-style seller levels, badges, achievements, leaderboards, and XP systems from day one | Gamification works at scale (Fiverr has millions of sellers). With a new marketplace that may have dozens of medics initially, gamification feels empty and artificial. It also adds significant complexity to build and maintain. Premature gamification is a common marketplace anti-pattern. | Simple verified badge + star rating. That is sufficient social proof. Add gamification (levels, badges, priority access) in later phases when there is meaningful volume. |

### AF-08: Allowing Quote Editing After Submission

| What | Why avoid | What to do instead |
|------|-----------|-------------------|
| Letting medics freely edit their quotes after a client has started reviewing them | Creates a "bait and switch" dynamic where medics can change their price or terms after seeing competitors. Undermines trust in the quoting process. | Quotes are immutable once submitted. Medics can withdraw a quote and submit a new one (with a clear "revised quote" marker). This preserves transparency while allowing genuine corrections. |

---

## Feature Dependencies

```
TS-01 Event Posting
  |
  +---> TS-11 Search & Filtering (events must exist)
  |
  +---> TS-02 Quote Submission (quotes respond to events)
  |       |
  |       +---> TS-03 Quote Browsing (quotes must exist)
  |       |       |
  |       |       +---> TS-04 Award Flow (client selects quote)
  |       |               |
  |       |               +---> TS-05 Payment (deposit on award)
  |       |               |       |
  |       |               |       +---> TS-08 Ratings (after completion + payment)
  |       |               |       |
  |       |               |       +---> DF-05 Disputes (payment-related disputes)
  |       |               |
  |       |               +---> DF-02 SiteMedic Integration (award creates booking)
  |       |               |
  |       |               +---> DF-06 Repeat Booking (after completed booking)
  |       |
  |       +---> TS-09 Messaging (per-quote conversations)
  |
  +---> DF-01 Purple Guide Calculator (enhances event posting)

TS-06 Registration
  |
  +---> TS-07 Verification (documents from registration)
  |       |
  |       +---> DF-04 Qualification Matching (verified quals + event requirements)
  |
  +---> DF-03 Company Accounts (builds on registration)

TS-10 Notifications (cross-cutting -- triggered by all features)

DF-07 Compliance Docs (requires DF-02 SiteMedic Integration)
```

---

## Credits and Points System (Later Phase)

This warrants its own section because it is confirmed for later phases but should be designed with awareness from the start.

### CP-01: Quote Credits (Medic Pays to Quote)

| Aspect | Detail |
|--------|--------|
| **What** | Medics purchase credits to submit quotes on events. Each quote costs N credits (variable by event value/type). |
| **Reference models** | **Upwork Connects:** $0.15 per Connect, jobs cost 2-16 Connects. 10 free/month, 40 on signup. Expire after 1 year. **Bark Credits:** $2.20 per credit (excl. VAT), cost per lead varies by service/location/demand. Credits valid 3 months. **PeoplePerHour:** 15 free proposal credits/month, 1 per proposal, buy more when exhausted. First proposal on any project is free if you are first to apply. |
| **Recommended approach** | Start FREE (no credits required to quote) during marketplace bootstrap phase. Introduce credits once there is sufficient event volume that medics are seeing consistent opportunities. If credits are introduced too early, the marketplace will not reach critical mass. When introduced: generous free allocation (15-20/month), reasonable per-quote cost (scaled by event value), credits refunded if medic wins the job, credits refunded if client does not award anyone. |
| **Complexity** | Medium |
| **Dependencies** | All core marketplace features must be working first. This is a monetisation layer, not a core feature. |

### CP-02: Premium/Early Access

| Aspect | Detail |
|--------|--------|
| **What** | Paid medics get early access to new event listings before they are visible to all medics. |
| **Reference** | Upwork Freelancer Plus ($20/month) gives 100 Connects + visibility boost. Fiverr seller levels unlock benefits. Thumbtack has dynamic pricing based on demand. |
| **Recommended approach** | SiteMedic roster medics (existing employed/contracted medics) get priority access (first 2-4 hours). Then premium subscribers. Then free tier. This creates a hierarchy that rewards platform loyalty. |
| **Complexity** | Low-Medium |
| **Dependencies** | CP-01 (credits system), tiered access logic |

### CP-03: Featured Profiles / Boosted Quotes

| Aspect | Detail |
|--------|--------|
| **What** | Medics pay to have their quote appear at the top of a client's quote list, or their profile highlighted in search results. |
| **Reference** | Upwork "Boosted Proposals" cost extra Connects. Fiverr seller plus features. Bark does not have this (flat per-lead pricing). |
| **Recommended approach** | Defer this until there is significant quote volume per event (10+ quotes per event regularly). With low volume, boosting is meaningless. When introduced, clearly label boosted quotes as "Promoted" for transparency. |
| **Complexity** | Low |
| **Dependencies** | CP-01 (credits/payment mechanism) |

---

## MVP Feature Recommendation

Based on research, the following prioritisation is recommended for MedBid launch.

### Phase 1: Core Transaction Loop (Must ship together)

These features form the minimum viable marketplace -- without ALL of them, no transaction can complete.

1. **TS-06** Registration (client + individual medic + company -- basic)
2. **TS-07** Verification (minimum viable -- upload docs, admin approve/reject)
3. **TS-01** Event Posting (structured form with key fields)
4. **TS-02** Quote Submission (price + breakdown + pitch)
5. **TS-03** Quote Browsing (list view, basic comparison)
6. **TS-04** Award Flow (select quote, trigger deposit)
7. **TS-05** Deposit Payment (Stripe Connect, deposit on award)
8. **TS-11** Search & Filtering (basic -- type, date, location, qualifications)
9. **TS-10** Notifications (email for critical events: new quotes, award, payment)

### Phase 2: Trust and Quality

10. **TS-08** Bidirectional Ratings (double-blind, post-completion)
11. **TS-09** In-Platform Messaging (per-quote conversations)
12. **DF-02** SiteMedic Dashboard Integration (award creates booking)
13. **DF-03** Company Accounts with Roster Management + double-up prevention

### Phase 3: Differentiation

14. **DF-01** Purple Guide Risk Calculator
15. **DF-04** Qualification Matching
16. **DF-05** Cancellation & Dispute Framework
17. **DF-06** Repeat Booking & Client Preferences
18. **DF-07** Compliance Documentation Package

### Phase 4: Monetisation

19. **CP-01** Quote Credits
20. **CP-02** Premium/Early Access Tiers
21. **CP-03** Featured Profiles / Boosted Quotes

### Defer to Post-Launch

- Complex gamification (AF-07)
- Native mobile marketplace app (AF-06)
- AI-powered matching/recommendations
- Multi-currency support (UK-only for now)
- API for third-party integrations

---

## UK-Specific Regulatory Considerations (Cross-Cutting)

These are not features but constraints that affect feature implementation across the board.

| Regulation | Impact on Features | Action Required |
|------------|-------------------|-----------------|
| **UK GDPR / DPA 2018** | Health data (treatment records) is special category data. Medic qualifications are personal data. Reviews contain personal opinions. | Explicit consent flows for data processing. Granular opt-in (not bundled). Right to erasure (account deletion must cascade). Data retention policy. Privacy impact assessment before launch. |
| **PECR** | SMS notifications to medics are marketing if they promote events. | Separate consent for marketing SMS vs transactional SMS. Opt-out on every SMS. |
| **FCA / Payment Services Regulations 2017** | Holding client funds (deposits) before release to medics could be a regulated activity. | Use Stripe Connect so Stripe (FCA-regulated) handles fund holding, not MedBid. Document that MedBid does not hold client money directly. |
| **CQC** | Providing or arranging regulated medical activities may trigger registration. MedBid is a marketplace, not a provider. | Clear terms: MedBid connects clients with independent medical providers. MedBid does not provide medical services. Medics are responsible for their own CQC registration where required. Display CQC status on profiles. |
| **Consumer Rights Act 2015** | Service quality expectations, cancellation rights for consumers (B2C events). | Clear terms of service. Cancellation policy aligned with consumer rights. B2B vs B2C distinction in terms. |
| **IR35 / Employment Status** | Individual medics quoting through the marketplace must not be treated as employees of MedBid. | Clear contractual terms establishing medics as independent contractors. No control over how/when medics work. The marketplace connects, it does not employ. (Existing SiteMedic IR35 patterns apply.) |
| **Insurance** | Platform liability for marketplace-facilitated bookings. | Professional indemnity insurance for the platform. Require medics to maintain their own PLI and PI insurance. Display insurance status on profiles. |
| **Equality Act 2010** | Marketplace must not discriminate in event/medic matching. | Qualification-based matching (objective criteria) is lawful. Do not filter by protected characteristics. Accessibility requirements for the platform itself (WCAG 2.1 AA). |

---

## Competitive Landscape Summary

| Platform | Model | Strengths to Learn From | Weaknesses to Exploit |
|----------|-------|------------------------|----------------------|
| **Add to Event** | Free quotes for clients, supplier pays subscription | UK event-specific, large supplier network (25k+), 350+ categories | No qualification matching, no post-event tooling, generic (not medical-specific), no compliance documentation |
| **Bark** | Credits per lead | Wizard-style quote request, clean UX, money-back guarantee on first credit pack | No domain specialisation, no post-booking value, medics pay even if they do not win |
| **Thumbtack** | Pay per lead (dynamic pricing) | Detailed project descriptions, matching algorithm, free profile | US-focused, no UK presence, no qualification verification, no post-booking value |
| **Upwork** | Commission on earnings + Connects for proposals | Escrow payment protection, dispute resolution, Connects system, freelancer levels | Not designed for one-off events, no company accounts, no qualification matching for regulated professions |
| **Checkatrade** | Annual membership fee | Rigorous vetting (12 checks), verified reviews (90% verified by SMS), strong trust signals | Not a quote marketplace (directory model), no online booking/payment, not medical-specific |
| **Fiverr** | Commission on earnings | Seller levels/gamification, gig-based pricing, strong search | Not suited for event-based services, no location matching, individual-only (no companies) |
| **PeoplePerHour** | Commission + proposal credits (15 free/month) | UK-based, freelancer-friendly, project + hourly models | No event medical specialisation, no company accounts, no qualification matching |

**MedBid's position:** Domain-specific marketplace for UK event medical, combining the RFQ model of Bark/Add to Event with the payment protection of Upwork, the vetting rigour of Checkatrade, and the unique post-booking compliance value of SiteMedic. No existing platform combines all four.

---

## Sources

### Platform Research
- [Upwork Payment Protection](https://support.upwork.com/hc/en-us/articles/211063748-How-Fixed-Price-Payment-Protection-works-for-freelancers-on-Upwork)
- [Upwork Connects System](https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects)
- [Bark How It Works for Professionals](https://www.bark.com/en/us/how-it-works/sellers/)
- [Bark Credits & Billing](https://help.bark.com/topic/credits-billing/)
- [Thumbtack Pay for Leads](https://help.thumbtack.com/article/pay-for-leads)
- [Thumbtack How It Works](https://help.thumbtack.com/article/how-thumbtack-works/)
- [Checkatrade How We Work](https://www.checkatrade.com/blog/expert-advice/checkatrade-how-we-work/)
- [Fiverr Level System](https://help.fiverr.com/hc/en-us/articles/360010560118-Fiverr-s-level-system)
- [PeoplePerHour How It Works](https://www.peopleperhour.com/how-it-works)
- [Add to Event](https://www.addtoevent.co.uk/)

### Marketplace Best Practices
- [Rigby: 21 Services Marketplace Features (2026)](https://www.rigbyjs.com/blog/services-marketplace-features)
- [Sharetribe: How to Prevent Marketplace Leakage](https://www.sharetribe.com/academy/how-to-discourage-people-from-going-around-your-payment-system/)
- [HBS: Reducing Disintermediation Risk](https://online.hbs.edu/blog/post/disintermediation)
- [Sharetribe: Double-Blind Reviews](https://www.sharetribe.com/marketplace-glossary/double-blind-reviews/)
- [Sharetribe: Stripe Connect Overview](https://www.sharetribe.com/academy/marketplace-payments/stripe-connect-overview/)

### UK Event Medical Industry
- [Purple Guide / Event First Aid UK](https://www.eventfirstaiduk.com/event-medical-cover/purple-guide/)
- [CTC Medical Services Event Calculator](https://ctcmedicalservices.co.uk/event-calculator/)
- [Platinum Ambulance Event Risk Calculator](https://platinumambulance.co.uk/event-risk-calculator)
- [St John Ambulance Event Medical Cover](https://www.sja.org.uk/event-medical-cover/)
- [Outdoor Medical Solutions: How to Pick a Good Company](https://outdoormedicalsolutions.co.uk/pick-good-company-event-medical-cover/)
- [Team Medic: CQC Event Medical Regulations](https://www.team-medic.com/blog/cqc-event-medical-regulations/)

### UK Regulatory
- [ICO: Consent under UK GDPR](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/)
- [CQC: Regulated Activities](https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration/regulated-activities)
- [CQC: Scope of Registration](https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration)
- [DBS Digital Identity Verification Guidance](https://www.gov.uk/government/publications/dbs-identity-checking-guidelines/dbs-digital-identity-verification-guidance)
- [Sprintlaw: Escrow Services in the UK](https://sprintlaw.co.uk/articles/understanding-escrow-services-in-the-uk-a-legal-guide-for-businesses/)
- [Dospay: Are Escrow Agents Regulated in the UK](https://www.dospay.co.uk/faq/are-escrow-agents-regulated-in-the-uk)
- [Stripe Connect](https://docs.stripe.com/connect)
- [Split Payment Providers UK 2026](https://www.ryftpay.com/blog/split-payment-providers-for-uk-marketplaces-2026)

### Notifications and Technical
- [Azure: Push Notifications, SMS, Email Best Practices](https://azure.microsoft.com/en-us/blog/best-practices-for-using-push-notifications-sms-and-email-in-your-mobile-app/)
- [Sharetribe: Service Marketplace Booking Flow Design](https://www.sharetribe.com/academy/design-booking-flow-service-marketplace/)
