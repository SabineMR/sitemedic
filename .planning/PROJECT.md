# SiteMedic

## What This Is

SiteMedic is a mobile-first platform for UK construction site medics and film/TV set medics that turns their daily clinical work into automatic compliance documentation. The medic uses the app as their primary work tool on an iPhone or iPad. Every treatment, observation, and safety check they perform generates timestamped, auditable records that flow into a web dashboard the site manager can access. This replaces paper-based reporting and creates automatic compliance records as a byproduct of clinical work, not as a separate admin task.

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

### Active

(No active requirements — ready to plan v1.1 or v2.0)

### Out of Scope

- **Film/TV mode** — Defer until construction mode is validated with real clients
- **Heat map visualisation** — Phase 2 feature after basic near-miss logging proves valuable
- **Trend analysis charts** — Phase 2 analytics layer
- **Document library** — Not MVP-critical, add when clients request it
- **Toolbox Talk Logger** — Nice-to-have, not core compliance value
- **Multi-project support** — Single-site focus for MVP, add when scaling to multiple medics
- **Tier 3/4 subscription features** — Premium features (custom branding, API access, cross-project analytics) deferred until product-market fit
- **Real-time sync** — Offline-first architecture means sync happens when connectivity available, not pushed real-time
- **Mobile web version** — iOS native only for MVP, web dashboard is desktop-only
- **Android app** — iOS first, Android only if clients demand it

## Current State

**v1.0 Shipped:** 2026-02-16

- **Codebase:** 84,500 lines (TypeScript, TSX, SQL)
- **Tech Stack:** Expo (iOS), Next.js 15 (web), Supabase (backend), WatermelonDB (offline storage), Stripe (payments)
- **Phases:** 13 phases complete (84 plans executed)
- **Status:** 98% production-ready (1 medium-severity UI issue: booking confirmation page uses mock data)
- **Integration:** 46/47 cross-phase connections working, 4/5 E2E flows complete
- **Known Issues:** See v1.0-MILESTONE-AUDIT.md for details

**Next Steps:**
- Fix booking confirmation page (fetch real data from Supabase)
- Deploy to production
- Begin user testing with Kai and initial clients

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

---
*Last updated: 2026-02-17 after v1.0 milestone completion*
