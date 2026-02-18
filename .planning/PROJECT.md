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

### Active (v3.0 — White-Label Platform & Subscription Engine)

**White-Label Branding:**
- [ ] Per-org branding storage — logo (Supabase Storage), primary colour (hex), company name, tagline
- [ ] Branding applied to web portal — header, login page, sidebar all reflect org brand
- [ ] Branded PDFs — org logo injected into weekly reports, RIDDOR PDFs, payslips
- [ ] Branded emails — org logo + primary colour in all Resend transactional emails
- [ ] Subdomain routing — `slug.sitemedic.co.uk` resolves to correct org in Next.js middleware

**Subscription Engine:**
- [ ] Stripe Billing integration — subscription plans (Starter/Growth/Enterprise) per org
- [ ] Tiered feature gating — certain features locked to Growth/Enterprise tier
- [ ] Hybrid onboarding flow — signup page → Stripe Checkout → webhook creates org → platform admin activates
- [ ] Subscription management — upgrade/downgrade, Stripe billing portal, cancellation flow
- [ ] Platform admin subscription dashboard — view all org subscriptions, MRR, churn

### Out of Scope

- **Document library** — Not MVP-critical, add when clients request it
- **Toolbox Talk Logger** — Nice-to-have, not core compliance value
- **Multi-project support** — Single-site focus for MVP, add when scaling to multiple medics
- **Tier 3/4 subscription features** — Premium features (custom branding, API access, cross-project analytics) deferred until product-market fit
- **Real-time sync** — Offline-first architecture means sync happens when connectivity available, not pushed real-time
- **Mobile web version** — iOS native only for MVP, web dashboard is desktop-only
- **Android app** — iOS first, Android only if clients demand it

## Current State

**v2.0 Shipped:** 2026-02-18

- **Codebase:** ~171,000 lines (TypeScript, TSX, SQL) — 29,300 lines added in v2.0
- **Tech Stack:** Expo (iOS), Next.js 15 (web), Supabase (backend), WatermelonDB v4 (offline storage), Stripe (payments), Recharts (analytics), react-leaflet (maps)
- **Phases:** 30 phases complete (149 plans executed — 84 in v1.0, 35 in v1.1, 30 in v2.0)
- **Status:** 100% production-ready — 36/36 v2.0 requirements satisfied, all E2E flows verified
- **Integration:** All cross-phase connections verified, 5/5 E2E flows complete
- **Known Issues:** Minor tech debt deferred: `getLocationLabel`/`getEventLabel` orphaned exports; `incident-report-dispatcher.ts` dead code; Motorsport PDF has DRAFT watermark pending Motorsport UK Incident Pack V8.0 field validation

**Next Steps:**
- Deploy to production (configure external services per DEPLOYMENT.md)
- Begin v3.0 milestone: White-Label Platform & Subscription Engine (Apex Safety Solutions is first live deployment target)
- Run `/gsd:new-milestone` to define v3.0 requirements and roadmap

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

## Current Milestone: v3.0 White-Label Platform & Subscription Engine

**Goal:** Transform SiteMedic into a white-label SaaS engine — each subscribing medic business gets their own branded portal, subdomain, and subscription plan. Apex Safety Solutions (Sabine's own business) is the first live deployment and the v3.0 launch target.

**Target features:**
- Per-org branding: logo, primary colour, company name — applied across portal, PDFs, and emails
- Subdomain routing: `apex.sitemedic.co.uk` per org (Pro), full custom domain (Enterprise)
- Tiered subscription plans: Starter / Growth / Enterprise via Stripe Billing
- Hybrid onboarding: online signup + Stripe Checkout → platform admin activates + configures branding
- Subscription management: upgrade/downgrade, billing portal, cancellation
- Feature gating: certain features unlocked per tier

**Build priority:**
1. Apex Safety Solutions white-label (Sabine's real business — goes live first)
2. Subscription + self-serve onboarding (opens platform to paying customers)
3. Feature gating by tier

---
*Last updated: 2026-02-18 after v3.0 milestone initialized*
