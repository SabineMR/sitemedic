# SiteMedic

## What This Is

SiteMedic is a multi-vertical mobile-first platform for UK medics — across construction, Film/TV production, festivals & events, motorsport, and football — that turns daily clinical work into automatic compliance documentation. Each vertical has its own incident form fields, shared documents, certification requirements, and terminology. The medic uses the app as their primary work tool on an iPhone or iPad. Every treatment, observation, and safety check generates timestamped, auditable records that flow into a web dashboard the client can access. This replaces paper-based reporting and creates automatic compliance records as a byproduct of clinical work, not as a separate admin task.

## Core Value

Documentation happens automatically as the medic does their job, not as separate admin work. The medic's clinical workflow is the data capture mechanism—within 60 seconds of treating a patient, the compliance record exists and is synced to the client dashboard.

## Requirements

### Validated

**MVP Medic App (iOS):**
- ✓ Treatment Logger with full clinical and legal detail (RIDDOR, HSE, insurance requirements) — v1.0
- ✓ Near-Miss Capture (basic version — category, photo, description, severity in <45 seconds) — v1.0
- ✓ Daily Safety Snapshot checklist (10 items, 3-5 minute completion, photo evidence) — v1.0
- ✓ Worker Health Profiles (basic health info, emergency contacts, certifications, treatment history) — v1.0
- ✓ Offline mode with automatic sync when connectivity returns — v1.0
- ✓ Single project assignment (one medic, one active site) — v1.0

**MVP Site Manager Dashboard (Web):**
- ✓ Overview screen with traffic-light compliance score — v1.0
- ✓ Treatment log (filterable list + detail view with full treatment records) — v1.0
- ✓ Near-miss log (list view with category, date, severity) — v1.0
- ✓ Worker registry with certification status and expiry tracking — v1.0
- ✓ Auto-generated weekly PDF safety report (the core client deliverable) — v1.0
- ✓ Email alerts for RIDDOR deadlines and expired certifications — v1.0

**Compliance & Data:**
- ✓ RIDDOR auto-flagging when treatment matches reportable criteria — v1.0
- ✓ UK GDPR compliance for health data (encryption, consent flow, retention policy) — v1.0
- ✓ Worker certification tracking (CSCS, CPCS, IPAF, Gas Safe, etc.) — v1.0
- ✓ Digital signature capture for treatment consent — v1.0

**Performance Targets:**
- ✓ Minor treatment log: <30 seconds — v1.0
- ✓ Full treatment log: <90 seconds — v1.0
- ✓ Near-miss capture: <45 seconds — v1.0
- ✓ Daily check completion: <5 minutes — v1.0
- ✓ Weekly PDF generation: <10 seconds — v1.0
- ✓ Zero data loss during offline periods — v1.0

**Business Operations (Added during v1.0):**
- ✓ Client booking portal with Stripe payment processing — v1.0
- ✓ UK postcode territory system (11,000+ sectors) — v1.0
- ✓ Auto-assignment algorithm with 100% success rate — v1.0
- ✓ Service agreement generation with digital signatures — v1.0
- ✓ Weekly medic payouts via UK Faster Payments — v1.0
- ✓ IR35 compliance with self-employed/umbrella support — v1.0

**Post-MVP Polish & Data Completeness (Added during v1.1):**
- ✓ Lead capture pipeline — contact + quote submissions persisted to DB, admin CRM with status management — v1.1
- ✓ Quote-to-booking conversion — pre-fill booking form from quote via URL search params — v1.1
- ✓ Booking data completeness — What3Words display, admin detail panel, recurring chain view — v1.1
- ✓ Real-time operations — medicContext with medic+booking join, payment retry UI, alert escalation timer — v1.1
- ✓ Organisation settings — all business configuration values from DB (`org_settings` table), no hardcoded values — v1.1
- ✓ Analytics dashboard — Territory heatmap, assignment success rate chart, medic utilisation table, late arrival heatmap — v1.1
- ✓ UX polish — skeleton loaders, interactive Leaflet geofence map picker, geofence exit alert monitor — v1.1
- ✓ RIDDOR auto-save — 30s debounced silent save, status audit trail, photo gallery from storage bucket — v1.1
- ✓ Compliance exports — payslip PDF, RIDDOR PDF, timesheets/bookings/invoices CSV, certification expiry banners — v1.1
- ✓ Contract detail — PDF download fix, version history timeline, milestone payment tracker — v1.1
- ✓ Manual medic assignment — admin dialog in booking detail panel with medic search and override — v1.1
- ✓ Critical bug fixes — payslip medic_id FK corrected, RIDDOR draft inputs wired — v1.1
- ✓ Geofence coverage analytics — "X of Y active sites covered" stat card with 60s polling — v1.1

**Multi-Vertical Platform Expansion (Added during v2.0):**
- ✓ Vertical infrastructure — RIDDOR gate per vertical, WatermelonDB v4 schema (event_vertical, vertical_extra_fields, booking_id, GPS columns), OrgContext caching, booking-level vertical override, org/client vertical settings — v2.0
- ✓ Construction vertical formalized — canonical VERTICAL_CONFIG TypeScript file, CSCS-first cert ordering, construction as reference implementation for all new verticals — v2.0
- ✓ Motorsport vertical — GCS score, extrication required, helmet removed, mandatory concussion clearance gate (HIA/stood down/CMO), Motorsport UK Accident Form PDF (DRAFT), Medical Statistics Sheet aggregate PDF, dashboard concussion clearance badge — v2.0
- ✓ Festivals & Events vertical — TST triage (P1/P2/P3/P4) required field, alcohol/substance + safeguarding flags, Purple Guide–style incident report PDF, Attendee/Venue/Organiser terminology, FREC 3/EFR cert types — v2.0
- ✓ Film/TV Production vertical — Production Title, Patient Role (9 roles), SFX/Pyrotechnic toggle, Cast & Crew/Set/Production terminology, ScreenSkills/HCPC/FREC 4 cert types, RIDDOR unchanged for crew — v2.0
- ✓ Football / Sports vertical — Player + Spectator dual-form, FA Match Day Injury Form + SGSA Medical Incident Report PDFs, HIA concussion assessment, ATMMiF/ITMMiF cert types, RIDDOR disabled for on-pitch players — v2.0
- ✓ Analytics — near-miss heat maps (org + platform admin, Leaflet CircleMarker severity-coded), compliance score trend charts (12-month weekly, Recharts), incident frequency charts, admin aggregate compliance trend with org ranking table — v2.0

**White-Label Platform & Subscription Engine (Added during v3.0):**
- ✓ Per-org branding storage — logo (Supabase Storage), primary colour (hex), company name, tagline — v3.0
- ✓ Branding applied to web portal — header, login page, sidebar all reflect org brand — v3.0
- ✓ Branded PDFs — org logo injected into weekly reports, RIDDOR PDFs, payslips — v3.0
- ✓ Branded emails — org logo + primary colour in all Resend transactional emails — v3.0
- ✓ Subdomain routing — `slug.sitemedic.co.uk` resolves to correct org in Next.js middleware — v3.0
- ✓ Stripe Billing integration — subscription plans (Starter/Growth/Enterprise) per org — v3.0
- ✓ Tiered feature gating — certain features locked to Growth/Enterprise tier — v3.0
- ✓ Hybrid onboarding flow — signup page → Stripe Checkout → webhook creates org → platform admin activates — v3.0
- ✓ Subscription management — upgrade/downgrade, Stripe billing portal, cancellation flow — v3.0
- ✓ Platform admin subscription dashboard — view all org subscriptions, MRR, churn — v3.0
- ✓ Branding settings UI — org admin logo upload + colour picker, platform admin branding override — v3.0

### Active (v4.0 — MedBid Marketplace)

**Core Marketplace:**
- [ ] Event posting — clients post events needing medical cover (name, type, description, dates/times, location/postcode, staffing needs, budget range)
- [ ] Quote submission — medics submit quotes with total price, itemised breakdown, cover letter/pitch, and availability confirmation
- [ ] Quote browsing — clients see medic profile (certs, rating, experience) only after a quote is submitted; contact details hidden until award + deposit
- [ ] Award flow — client selects preferred quote; triggers deposit payment and auto-creates a booking in SiteMedic dashboard
- [ ] Deposit + remainder payment — deposit charged on award, remainder charged after event completion
- [ ] Commission model — SiteMedic takes commission from medic's quote (uses existing platform_fee_percent/medic_payout_percent pattern)
- [ ] Booking integration — awarded quotes auto-create booking records that flow into timesheets, payouts, and reporting

**Medic & Company Registration:**
- [ ] Open registration — individual medics and medic companies can sign up to the marketplace
- [ ] Company accounts — companies manage a roster of medics with individual profiles
- [ ] Double-up prevention — when a company quotes with a specific medic, that medic cannot independently quote on the same event
- [ ] Medic verification — new medics submit qualifications for approval before they can quote

**Ratings & Discovery:**
- [ ] Bidirectional ratings — clients rate medics and medics rate clients after event completion (star rating + written review)
- [ ] Dashboard feed — medics see open events filtered by location and qualifications
- [ ] Email alerts — medics notified when new events match their profile
- [ ] SMS alerts — urgent or high-value events trigger SMS to qualified nearby medics

**Credits & Monetisation (v4.0 later phases):**
- [ ] Credits/points system — medics purchase credits to submit quotes (like Upwork Connects)
- [ ] Credit refunds — credits returned when medic wins a job or client doesn't award
- [ ] Early access — premium credits buy early access to new event listings before general release
- [ ] Tiered medic priority — SiteMedic roster medics get priority access before open marketplace

### Planned (v5.0 — Internal Comms & Document Management)

**Messaging:**
- [ ] 1:1 messaging — org admin and medics have two-way conversation threads inside SiteMedic
- [ ] Community broadcast — org admin sends announcements to all medics at once
- [ ] Message notifications — medics receive push/email notifications for new messages

**Document Management:**
- [ ] Document upload — medics upload compliance documents (insurance, DBS, certs) via iOS app or web
- [ ] Profile document log — uploaded documents saved to medic's individual profile, admin can see what's on file
- [ ] Expiry tracking — documents have expiry dates, system alerts admin and medic before they lapse
- [ ] Save for later — medics can bookmark/save documents or messages for quick reference

**Cross-platform:**
- [ ] iOS app support — messaging and document upload available in the mobile app
- [ ] Web dashboard support — messaging and document management synced on web portal

### Out of Scope

- **Document library** — Not MVP-critical, add when clients request it
- **Toolbox Talk Logger** — Nice-to-have, not core compliance value
- **Multi-project support** — Single-site focus for MVP, add when scaling to multiple medics
- **Tier 3/4 subscription features** — Premium features (custom branding, API access, cross-project analytics) deferred until product-market fit
- **Real-time sync** — Offline-first architecture means sync happens when connectivity available, not pushed real-time
- **Mobile web version** — iOS native only for MVP, web dashboard is desktop-only
- **Android app** — iOS first, Android only if clients demand it

## Current State

**v3.0 Shipped:** 2026-02-19

- **Codebase:** ~171,000+ lines (TypeScript, TSX, SQL)
- **Tech Stack:** Expo (iOS), Next.js 15 (web), Supabase (backend), WatermelonDB v4 (offline storage), Stripe (payments + Billing + Connect), Recharts (analytics), react-leaflet (maps)
- **Phases:** 31 phases complete (180 plans executed — 84 in v1.0, 35 in v1.1, 30 in v2.0, 31 in v3.0)
- **Status:** v3.0 complete — white-label branding, subdomain routing, Stripe Billing subscription engine, feature gating, org onboarding, and branding settings UI all shipped
- **Known Issues:** Minor tech debt deferred: `getLocationLabel`/`getEventLabel` orphaned exports; `incident-report-dispatcher.ts` dead code; Motorsport PDF has DRAFT watermark

**Next Steps:**
- Begin v4.0 milestone: MedBid Marketplace
- Deploy v3.0 to production (configure external services per DEPLOYMENT.md)

## Context

**Business Context:**
- UK-based paramedic staffing business founded by Kai (HCPC-registered paramedic)
- Primary deployments: construction sites and film/TV sets
- Current pain: compliance reporting is manual, time-consuming, and inconsistent
- Competitive gap: existing compliance software sells dashboards to managers who don't do data entry; nobody bundles the medic service with embedded technology
- Revenue model: charge premium over standard medic staffing rate, justified by automatic compliance dashboard
- Scale plan: Kai uses it first, then deploys to hired medics as business grows

**User Context:**
- Primary user: Medic working 8-12 hour shifts on construction sites with poor mobile signal
- Must work with gloves on, in bright sunlight, often one-handed
- Clinical work is the priority—data entry cannot interrupt patient care
- Site managers are too busy to do admin—they only consume reports, never create them
- Clients need downloadable PDFs for HSE inspectors, principal contractors, and insurers

**Regulatory Context:**
- UK Health and Safety at Work Act 1974 — duty of care obligations
- CDM Regulations 2015 — construction-specific safety management
- RIDDOR 2013 — reportable incident criteria and timelines (immediate notification for fatal/specified injuries, 15-day deadline for over-7-day incapacitation)
- UK GDPR / Data Protection Act 2018 — health data is "special category data" requiring explicit consent and strict handling
- CSCS, CPCS, IPAF, Gas Safe — industry certification schemes with expiry tracking requirements

**Technical Context:**
- Construction sites frequently have zero mobile signal—offline-first is mandatory
- Medics use personal iPhones/iPads—no company-issued devices
- Photo evidence is critical for injury documentation and near-miss reporting
- Site managers access dashboard from site office desktops or tablets
- Weekly PDF report must be professional enough to submit to HSE during audits

## Constraints

- **Platform**: iOS only for MVP (React Native) — medics use iPhones/iPads, not Android
- **Tech Stack**: React Native (Expo) for iOS app, React.js for web dashboard, JavaScript throughout (per spec requirement)
- **Backend**: Node.js + PostgreSQL, Supabase recommended for UK/EU region hosting
- **Geography**: UK-based servers mandatory (GDPR requirement — data cannot leave UK/EEA)
- **Offline**: Full functionality required without connectivity — local SQLite/WatermelonDB with background sync
- **Performance**: Treatment logging must complete in <90 seconds — cannot interrupt clinical workflow
- **Data Security**: AES-256 encryption at rest, TLS 1.3 in transit, special category data handling under UK GDPR
- **Compliance**: RIDDOR auto-flagging, certification expiry tracking, 3-year data retention minimum
- **UX**: Gloves-on usability (48x48pt minimum tap targets), bright-light readability (high contrast), one-hand operation
- **Budget**: Bootstrap budget—leverage managed services (Supabase, Expo) over custom infrastructure

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| iOS-first, no Android | Kai and target medics use iPhones; avoid multi-platform complexity in MVP | ✓ Good (v1.0) |
| React Native with Expo | Faster iOS development, JavaScript alignment with web dashboard, easier iteration | ✓ Good (v1.0) |
| Offline-first architecture | Construction sites have unreliable connectivity; app must work without signal | ✓ Good (v1.0 - zero data loss) |
| Supabase for backend | PostgreSQL + Auth + Storage + UK hosting in one managed service, fast to ship | ✓ Good (v1.0) |
| Weekly PDF as core deliverable | Site managers need this for HSE audits; auto-generation justifies premium pricing | ✓ Good (v1.0 - cron scheduled) |
| Embedded in clinical workflow | Competitive insight: capture data during treatment, not as separate admin task | ✓ Good (v1.0 - <90s logging) |
| RIDDOR auto-flagging | Medics may not know RIDDOR criteria; app intelligence reduces compliance risk | ✓ Good (v1.0 - auto-detection working) |
| Single project per medic (MVP) | Simplifies data model and UX; multi-project only needed when hiring additional medics | ✓ Good (v1.0) |
| No Film/TV mode in MVP | Validate construction market first; Film/TV is same platform, different labels | ✓ Good (v1.0 - construction-focused) |
| Territory-based assignment | UK postcode sectors enable geographic optimization and coverage tracking | ✓ Good (v1.0 - 100% auto-assignment) |
| Stripe Connect for medics | Express accounts handle UK Faster Payments without custom bank integration | ✓ Good (v1.0 - weekly payouts working) |
| Separate Stripe billing webhook endpoint | `/api/stripe/billing-webhooks` with distinct signing secret from Connect `/api/stripe/webhooks` — prevents event cross-contamination | ✓ Good (v3.0) |
| Tier from DB, never JWT | Middleware reads `organizations.subscription_tier` on every request — changes take effect immediately after webhook fires | ✓ Good (v3.0) |
| CSS custom properties for per-org colours | `var(--org-primary)` pattern — Tailwind JIT cannot use runtime-constructed class names | ✓ Good (v3.0) |
| Cookie domain NOT widened to `.sitemedic.co.uk` | Each subdomain requires its own sign-in — prevents cross-org session leak | ✓ Good (v3.0) |
| Public bucket for org-logos | Logos in PDFs/emails need stable URLs; signed URLs expire mid-render | ✓ Good (v3.0) |
| `fetchLogoAsDataUri()` for PDF rendering | @react-pdf/renderer in Deno Edge cannot reliably fetch remote images — data URI approach works reliably | ✓ Good (v3.0) |
| Service-role client for platform admin ops | Platform admin JWT has org_id=NULL so RLS blocks direct writes; service-role bypasses safely | ✓ Good (v3.0) |
| Hybrid onboarding (pay online, admin activates) | Balances self-service signup with quality control — Sabine can verify each org before activation | ✓ Good (v3.0) |

## Current Milestone: v4.0 MedBid Marketplace

**Goal:** Add a Request-for-Quotes marketplace to SiteMedic where UK clients post events needing medical cover, medics (individuals and companies) submit detailed quotes, clients award the job, and SiteMedic takes a commission from the medic's side. Awarded quotes auto-create bookings that flow into the existing dashboard, timesheets, and payout systems. Free to sign up for both sides. Credits/points monetisation system added in later phases.

**Target features:**
- Event posting with full details (type, dates, location, staffing needs, budget range)
- Quote submission with itemised breakdown, cover letter, availability confirmation
- Medic profiles visible only after quoting (certs, rating, experience) — contact details hidden until award + deposit
- Deposit + remainder payment model — deposit on award, remainder after event
- Commission from medic's quote (existing platform_fee/medic_payout pattern)
- Open registration for individual medics AND medic companies
- Company roster management with double-up prevention (company quotes lock out individual quotes from same medic)
- Bidirectional ratings (client rates medic, medic rates client)
- Multi-channel notifications: dashboard feed, email alerts, SMS for urgent/high-value
- Credits/points system (later phases) — medics purchase credits to quote, early access, tiered priority

**Build priority:**
1. Database schema + core marketplace (event posting, quoting, awarding)
2. Payment integration (deposit + remainder, commission split)
3. Booking integration (award → auto-create booking in SiteMedic)
4. Registration + verification (individual medics + companies)
5. Ratings + notifications
6. Credits/points monetisation system

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Same repo as SiteMedic | Shared auth, database, Stripe, medic roster — separate repo would duplicate infrastructure | — Pending |
| Request for Quotes model (not auction) | Medics submit detailed quotes with breakdown + pitch. More professional than price-only bidding. Clients choose on quality + price. | — Pending |
| Commission from medic side | Client pays exactly what medic quoted. SiteMedic takes % from medic (like Upwork). Clean, transparent. | — Pending |
| Deposit + remainder payment | Deposit on award secures medic's time. Remainder after event. Balances risk for both sides. | — Pending |
| Profiles visible after quote only | Prevents disintermediation (clients contacting medics directly). Contact details hidden until award + deposit. | — Pending |
| Open registration (individuals + companies) | Bigger medic pool = more competition = better for clients. Companies manage rosters with double-up prevention. | — Pending |
| Free to quote at launch, credits in v2 | New marketplace needs frictionless adoption. Credits/points added once volume justifies it. | — Pending |
| Part of SiteMedic brand | Lives at sitemedic.co.uk/marketplace. Leverages existing brand. No separate domain needed. | — Pending |

## Planned Milestone: v5.0 Internal Comms & Document Management

**Goal:** Give org admins a built-in way to communicate with their field medics and collect compliance documents — replacing scattered WhatsApp/email with an in-platform messaging system and document storage tied to individual medic profiles.

**Target features:**
- Two-way 1:1 messaging between org admin and medics
- Community broadcast — org admin sends announcements to all medics
- Medics upload compliance documents (insurance, DBS, qualifications) via iOS app or web
- Documents stored on medic profiles with expiry date tracking and alerts
- Save/bookmark messages and documents for quick reference
- Synced across iOS app and web dashboard

**Build priority:**
1. Database schema for messages and documents
2. Messaging UI (web + iOS) with conversation threads
3. Document upload and profile storage
4. Expiry tracking and notifications
5. Broadcast messaging
6. Save/bookmark functionality

---
*Last updated: 2026-02-19 after v5.0 milestone planning started*
