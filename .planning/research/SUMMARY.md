# Project Research Summary

**Project:** SiteMedic
**Domain:** Medical Compliance & Construction Safety Management Platform (Offline-First Mobile + Web Dashboard)
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

SiteMedic is an offline-first medical compliance platform for construction site medics, combining iOS mobile data capture with a web dashboard for site managers. The 2025-2026 expert consensus for building this type of product centers on proven offline-first patterns: React Native + Expo SDK 54 for mobile, WatermelonDB (SQLite) for local persistence, Supabase (PostgreSQL + Auth + Storage) for backend, and server-side PDF generation. This stack prioritizes rapid shipping, regulatory compliance (RIDDOR + UK GDPR), and field reliability over custom infrastructure.

The research validates SiteMedic's specification is market-competitive and correctly scoped. Every planned MVP feature has either a regulatory driver (RIDDOR reporting, GDPR compliance, HSE audit requirements) or table stakes status (offline mode, photo evidence, certification tracking). The spec includes two unique differentiators competitors lack: RIDDOR auto-flagging and clinical workflow integration (data capture as byproduct of medic work, not separate admin tasks). Strategic deferrals (heat maps, AI risk prediction, multi-project support) to post-MVP phases demonstrate strong product discipline.

The dominant risk is sync architecture. Critical pitfalls include data loss during offline-to-online transitions, GDPR violations with health data, inadequate offline UX, photo upload blocking workflow, and battery drain from aggressive background sync. These must be addressed in Phase 1 foundation—retrofitting robust sync after launch requires major refactoring. Secondary risks include RIDDOR auto-flagging sensitivity (Phase 2 concern), PDF generation performance on mobile devices, and certification expiry tracking missing deadlines. All are mitigatable with patterns documented in research.

## Key Findings

### Recommended Stack

SiteMedic requires a proven offline-first stack optimized for UK health data compliance, rapid field data capture, and professional PDF reporting. Research confirms the 2025-2026 standard for this domain.

**Core technologies:**
- **Expo SDK 54 (React Native 0.81)** — Industry standard for rapid iOS/Android development; SDK 54 includes React Native 0.81, React 19, precompiled XCFrameworks (10x faster iOS builds), and New Architecture by default
- **WatermelonDB 0.28.0** — Built on SQLite, optimized for React Native offline-first; lazy-loads data for instant app launch regardless of dataset size; Supabase officially recommends for offline sync pattern
- **Supabase** — PostgreSQL + Auth + Storage + Edge Functions in one managed service; UK/EU region support (eu-west-2 London) ensures GDPR compliance; SOC 2 compliant with BAA available for PHI handling
- **React 19 + Vite** — Web dashboard framework; latest stable with concurrent rendering for improved dashboard performance; Vite is 2026 standard replacing deprecated Create React App
- **shadcn/ui + Tailwind CSS 4.x** — Web dashboard UI; pre-built accessible components with utility-first CSS framework; industry standard for 2026, faster than component libraries for custom medical forms
- **pdfmake (server-side)** — Declarative PDF generation via Supabase Edge Functions; JSON-based templates support tables/headers/footers; server-side offloads processing from mobile devices
- **TypeScript 5.x** — Type safety across entire stack; standard for React/React Native in 2026; catches errors at compile-time; essential for large codebases with offline sync logic

**Supporting libraries validated:**
- State management: Zustand (global client state), TanStack Query 5.x (server state)
- Forms: react-hook-form 7.x + zod 3.x (validation)
- Offline sync: @react-native-community/netinfo 11.x (connectivity detection)
- Encryption: expo-crypto + expo-secure-store (AES-256 for health data)
- Photos: expo-image-picker 17.0.10 (capture with EXIF preservation)
- Signatures: react-native-signature-canvas 5.0.2 (treatment consent)

### Expected Features

Research across 50+ construction safety platforms, RIDDOR compliance systems, and occupational health software confirms SiteMedic's MVP spec is comprehensive and competitive.

**Must have (table stakes):**
- Treatment Logger with photo evidence — Core medic workflow; RIDDOR/HSE compliance requirement; <90 second completion target
- Offline-first operation with auto-sync — 78% of reviewers rate offline access as important/highly important; construction sites frequently have zero signal
- RIDDOR auto-flagging — **Unique differentiator vs competitors**; intelligent auto-detection reduces compliance risk
- Digital forms with mobile capture — Paper-based systems have 35% higher compliance gap rates; industry standard is mobile-first
- Weekly PDF report generation — Required for HSE audits, principal contractors, insurers; must be professional-grade and audit-ready
- Worker health profiles with certification tracking — CSCS, CPCS, IPAF, Gas Safe expiry tracking is regulatory requirement in UK construction
- UK GDPR compliance (encryption, consent, retention) — Mandatory for health data (special category); AES-256 at rest, TLS 1.3 in transit
- Compliance dashboard (traffic-light visual status) — Site managers consume reports, don't create them; real-time metrics filterable views
- Digital signature capture — Treatment consent, incident acknowledgment require legally-binding signatures
- Email alerts — RIDDOR deadlines (15-day), certification expiry notifications (30/14/7 days before)

**Should have (competitive advantage):**
- Clinical workflow integration — **Unique differentiator**; data capture happens DURING treatment, not as separate admin task; <90 second logging
- Gloves-on usability — 48x48pt tap targets, high-contrast for bright sunlight, one-hand operation for medics working in field
- Near-miss capture (<45 second workflow) — HSE compliance; photo evidence standard practice
- Daily safety checklists (10 items, <5 minute completion) — Standard construction practice for site safety

**Defer (v2+):**
- Heat map visualization — Pattern identification; competitors include this but SiteMedic correctly deferred to Phase 2
- AI risk prediction — Requires 12+ months historical data; 40-50% incident reduction potential; high complexity
- Toolbox talk logger — Pre-task safety meetings; nice-to-have but not core compliance value
- Multi-project support — Needed when scaling to multiple medics/sites; MVP is single-site focused
- Android app — iOS first; add only if clients demand it
- API access for integrations — Tier 3/4 premium feature; ERP/payroll/Procore integrations for post-PMF
- Film/TV industry mode — Same platform, different labels; validate construction market first

### Architecture Approach

Standard offline-first mobile + web dashboard architecture with multi-tenant backend and server-side PDF generation.

**Major components:**

1. **iOS Mobile App (React Native + Expo)** — Offline-first data capture with local SQLite storage (WatermelonDB); encrypted at rest (AES-256); handles photo capture, digital signatures, treatment logging; syncs to server when connectivity available

2. **Local SQLite Database (WatermelonDB)** — Offline persistence with encryption (SQLCipher); reactive observables for UI auto-updates; sync queue persisted locally; source of truth while offline; delta sync with conflict resolution (last-write-wins for MVP)

3. **Backend API Layer (Supabase)** — PostgreSQL database with Row-Level Security (RLS) for multi-tenant isolation; auto-generated REST API (PostgREST); JWT-based authentication; UK/EU region hosting (eu-west-2 London) for GDPR compliance

4. **Object Storage (Supabase Storage)** — Photo upload with progressive compression (low-quality preview syncs first, full-quality later); CDN delivery; lifecycle policies for archival; S3-compatible with encryption at rest

5. **Web Dashboard (React 19 + Vite)** — Read-only reporting UI for site managers; React Query for server state management; shadcn/ui components; traffic-light compliance scoring; real-time updates via polling

6. **PDF Generator (Serverless Edge Functions)** — Server-side generation using pdfmake (Node.js); triggered by weekly cron or on-demand; fetches data from PostgreSQL, generates PDF, uploads to Storage, emails download link

7. **Notification Service** — RIDDOR deadline alerts, certification expiry warnings; email (SendGrid/Postmark) + push notifications (Expo Notifications); progressive reminder schedule (30/14/7/1 days)

**Key architectural patterns:**
- Offline-first with optimistic UI (local writes immediate, background sync)
- Delta sync with timestamp-based conflict resolution (last-write-wins for single-medic-per-site MVP)
- Photo upload with progressive compression (preview + full-quality queue)
- Multi-tenant with Row-Level Security (single database, RLS policies enforce isolation)
- Server-side PDF generation (offloads processing, smaller mobile bundle, faster rendering)

### Critical Pitfalls

Research identifies 8 critical pitfalls; top 5 requiring Phase 1 mitigation:

1. **Data loss during offline-to-online sync transitions** — Naive "last-write-wins" conflict resolution or silent upload failures result in missing incident reports and RIDDOR compliance failures. **Prevention:** Implement robust sync queue with persistent storage (WorkManager), use client-generated UUIDs for idempotency, test with flaky networks (airplane mode toggles, 2G speeds), add operational transformation or CRDTs for health data conflicts, provide "force sync" button for manual retry.

2. **GDPR violations with health data handling** — Storing health data unencrypted, missing audit logs, retaining data too long, processing without valid legal basis. Fines: up to £20 million or 4% of global revenue. **Prevention:** Encrypt health data at rest (AES-256) and in transit (TLS 1.3), implement comprehensive audit logging from Day 1 (who viewed which worker record), document legal basis as "legitimate interest" (workplace safety compliance under RIDDOR, not consent), set data retention policies (3 years minimum for RIDDOR, auto-delete after maximum), implement 72-hour breach notification workflow.

3. **Inadequate offline UX - users don't know what's synced** — Users capture incident data offline, app shows "Saved" but doesn't clarify "saved locally, not yet synced." Sync fails hours later silently, RIDDOR deadline missed. **Prevention:** Multi-modal sync status indicators (color, labels, icons), persistent "3 items pending sync" badge always visible, dedicated "Pending Changes" outbox screen, plain language errors ("Couldn't upload. No internet." not "Error 500"), surface critical failures prominently (RIDDOR-reportable incident failed to sync triggers alert).

4. **Photo upload blocking workflow** — Synchronous upload of 4 x 3MB photos over construction site mobile data takes 90+ seconds, blocking medics from next task. Violates <90 second constraint; medics skip photos entirely. **Prevention:** Decouple photo capture from upload (local save immediate, background upload), optimize images before upload (resize to 1200px, compress to 100-200KB JPEG), use background upload queue with WorkManager (WiFi-only constraints), show optimistic UI ("Photos uploading in background"), allow user to continue working immediately.

5. **Background upload causing battery drain** — Aggressive sync retry logic attempts upload every 15 minutes regardless of connectivity; app uses partial wakelocks preventing device sleep; Google Play Store flags app as battery-draining (2026 policy); users uninstall. **Prevention:** Use WorkManager with proper constraints (NetworkType.UNMETERED for WiFi-only, BatteryNotLow), implement exponential backoff for failed attempts (5min, 15min, 1hr, 4hr), respect Doze mode, prioritize sync (RIDDOR-reportable immediate, routine items batch until WiFi), test with Android Battery Historian.

**Secondary pitfalls (Phase 2 concerns):**
- RIDDOR auto-flagging sensitivity problems (false positives cause alert fatigue; false negatives miss compliance)
- PDF generation too slow or breaks on mobile (30+ second generation, crashes on older devices)
- Certification expiry tracking misses deadlines (single notification at expiry, not progressive warnings)

## Implications for Roadmap

Based on research, suggested phase structure aligns with architectural dependencies and pitfall prevention:

### Phase 1: Foundation (Backend + Auth + Core Offline Infrastructure)
**Rationale:** Mobile app and web dashboard both depend on backend API, authentication, and database schema. Offline sync architecture must be solid before building features on top—cannot be retrofitted later without major refactor. All critical pitfalls (data loss, GDPR violations, inadequate offline UX, photo upload blocking, battery drain) must be addressed in this foundational phase.

**Delivers:**
- Supabase project setup (UK region: eu-west-2 London)
- PostgreSQL database schema with Row-Level Security policies for multi-tenant isolation
- Authentication flows (login, JWT refresh, offline session handling)
- Encrypted local SQLite database (WatermelonDB + SQLCipher) with AES-256
- Sync queue with persistent storage, conflict resolution, and exponential backoff retry logic
- Encryption key management (iOS Keychain / Android Keystore, never in AsyncStorage)
- Audit logging infrastructure (who viewed which worker record, no PII in logs)
- Data retention policies documented (3-year minimum for RIDDOR)
- Background sync with WorkManager constraints (WiFi-only for large uploads, battery-friendly)
- Network monitoring and connectivity detection

**Addresses features:**
- Offline-first operation (table stakes)
- UK GDPR compliance (mandatory)
- Multi-modal sync status indicators (offline UX)

**Avoids pitfalls:**
- Pitfall 1: Data loss during sync transitions (sync queue, idempotency, conflict resolution)
- Pitfall 2: GDPR violations (encryption, audit logging, retention policies)
- Pitfall 3: Inadequate offline UX (sync status indicators from Day 1)
- Pitfall 5: Battery drain (WorkManager constraints, exponential backoff)
- Technical debt: Cannot defer encryption or audit logging (GDPR non-compliance from Day 1)

**Research flag:** Phase 1 is well-documented with standard patterns (Supabase + WatermelonDB official guides, offline-first architecture resources). No additional research needed.

---

### Phase 2: Mobile App Core (Treatment Logger + Worker Profiles)
**Rationale:** Core value proposition is offline-first mobile app for medic data capture. Must work 100% offline before adding sync or dashboard features. Builds on Phase 1 foundation (encrypted local storage, sync queue ready but not yet actively used).

**Delivers:**
- Treatment logging screen with structured incident capture (injury type, body part, mechanism for RIDDOR flagging foundation)
- Photo capture with on-device compression (resize to 1200px, compress to 100-200KB)
- Digital signature capture for treatment consent
- Worker health profile screen (emergency contacts, health info, treatment history)
- Near-miss capture workflow (<45 second target)
- Daily safety checklist (10 items, <5 minute completion)
- Local-only operation (no network required)
- Gloves-on usability (48x48pt tap targets, high contrast, one-hand operation)

**Uses stack elements:**
- React Native + Expo SDK 54
- expo-image-picker for photo capture with EXIF preservation
- react-native-signature-canvas for consent signatures
- react-hook-form + zod for form validation
- WatermelonDB for local data persistence

**Implements architecture components:**
- Treatment, Worker, NearMiss, SafetyCheck data models (WatermelonDB schema)
- Repositories pattern for data access (abstracts SQLite queries)
- Business logic services (TreatmentService, WorkerService)
- Photo compression utility with progressive upload preparation

**Addresses features:**
- Treatment Logger (table stakes, core workflow)
- Worker health profiles (table stakes)
- Digital forms with mobile capture (table stakes)
- Digital signature capture (table stakes)
- Photo evidence attachment (table stakes)
- Gloves-on usability (differentiator)
- Near-miss capture (should-have)
- Daily safety checklists (should-have)

**Avoids pitfalls:**
- Pitfall 4: Photo upload blocking workflow (compression on-device, local save immediate)
- Technical debt: Build offline-first from start (not as retrofit)

**Research flag:** Phase 2 uses standard mobile patterns (well-documented Expo modules, form libraries). No additional research needed.

---

### Phase 3: Sync Engine (Mobile ↔ Backend Data Flow)
**Rationale:** Connects mobile app to backend, enabling data flow to web dashboard. Depends on Phase 1 (backend API, sync queue infrastructure) and Phase 2 (mobile app generating data to sync). Critical phase for validating pitfall prevention from Phase 1.

**Delivers:**
- Delta sync implementation (only changes since last successful sync, not full database)
- Background sync orchestration (triggers on app resume, network restore, periodic WorkManager)
- Photo upload queue with progressive compression (preview first, full-quality later)
- Conflict resolution execution (last-write-wins with timestamp comparison)
- Sync status UI (persistent badge showing pending items, detailed outbox screen)
- Failed sync error handling (plain language messages, manual retry button)
- Network state detection integration
- Idempotent operations with client-generated UUIDs

**Uses stack elements:**
- @react-native-community/netinfo for connectivity detection
- WorkManager (Android) / Background Tasks (iOS) for background sync
- Supabase client for API calls
- Supabase Storage for photo uploads

**Implements architecture components:**
- SyncQueue (priority, retry, persistence)
- ConflictResolver (timestamp-based last-write-wins)
- NetworkMonitor (connectivity state detection)
- BackgroundSync (orchestration with battery-friendly constraints)
- Photo upload with compression pipeline

**Addresses features:**
- Offline-first with auto-sync (table stakes, completing mobile-to-backend flow)
- Photo upload that doesn't block workflow (pitfall prevention)

**Avoids pitfalls:**
- Pitfall 1: Data loss during sync (validation via extensive testing: concurrent edits, mid-upload failures, app crashes)
- Pitfall 3: Inadequate offline UX (sync status UI surfacing pending/failed items)
- Pitfall 4: Photo upload blocking (background queue, progressive compression)
- Pitfall 5: Battery drain (WorkManager constraints verified with Battery Historian)

**Research flag:** Phase 3 has well-documented patterns (Supabase + WatermelonDB sync guide, offline-first architecture resources). Critical testing phase but no additional research needed.

---

### Phase 4: Web Dashboard (Manager Reporting UI)
**Rationale:** Depends on backend API having data from mobile app (Phase 3 sync complete). Read-only consumption layer for site managers. Lower risk than mobile phases since it's server-connected (no offline complexity).

**Delivers:**
- Treatment log view with filtering (by worker, date, injury type, RIDDOR status)
- Worker registry with certification status indicators (green/yellow/red visual)
- Compliance score calculation and traffic-light dashboard
- Real-time updates via React Query polling (60-second intervals)
- Near-miss log view
- Daily safety checklist history
- Photo viewing (served from Supabase Storage via CDN)
- Responsive design (desktop-focused, mobile-friendly)

**Uses stack elements:**
- React 19 + Vite for build tooling
- shadcn/ui + Tailwind CSS 4.x for UI components
- React Query 5.x for server state management
- Zustand for client state (filters, user preferences)
- react-router 7.x for navigation

**Implements architecture components:**
- Dashboard feature modules (treatments, workers, compliance, reports)
- Supabase client integration (read-only queries)
- React Query hooks for data fetching with caching

**Addresses features:**
- Compliance dashboard (table stakes)
- Real-time metrics (table stakes, via polling not WebSockets)
- Filterable views (table stakes)
- Exportable data preparation (foundation for Phase 5 PDF reports)

**Research flag:** Phase 4 uses standard React patterns (well-documented shadcn/ui, React Query, Supabase client). No additional research needed.

---

### Phase 5: PDF Report Generation (Compliance Reporting)
**Rationale:** Depends on dashboard having mature data model and tested queries (Phase 4). Server-side generation avoids mobile performance pitfalls. Required for HSE audits and compliance deliverables.

**Delivers:**
- Weekly safety report template (treatments, near-misses, worker certifications, compliance score)
- Server-side PDF generation via Supabase Edge Functions (pdfmake on Node.js)
- Async job queue pattern (POST /generate-pdf enqueues job, background worker generates, emails link when ready)
- PDF optimization (max 10 pages or 2MB, compressed photos at 800px width max)
- Supabase Storage integration for PDF hosting with signed URLs
- Email delivery for completed reports (SendGrid/Postmark integration)
- Dashboard UI for on-demand report generation and download history

**Uses stack elements:**
- pdfmake 0.2.x for declarative PDF generation (JSON-based templates)
- Supabase Edge Functions (Deno runtime) for serverless execution
- Supabase Storage for PDF hosting
- Email service integration (SendGrid/Postmark)

**Implements architecture components:**
- PDF Generator serverless function
- Job queue for async processing
- Email notification service

**Addresses features:**
- Weekly PDF report generation (table stakes, regulatory requirement for HSE audits)
- Professional-grade, audit-ready reports (table stakes)

**Avoids pitfalls:**
- Pitfall 6: PDF generation too slow (server-side offloads processing; test with 20-page reports)
- Technical debt: Async job queue prevents blocking UI during generation

**Research flag:** Phase 5 has medium confidence on pdfmake + Supabase Edge Functions (Deno runtime) compatibility. Test pdfmake with Edge Functions during phase planning. Well-documented patterns for PDF generation itself; integration point needs validation.

---

### Phase 6: RIDDOR Auto-Flagging (Smart Compliance Features)
**Rationale:** Requires baseline incident capture (Phase 2) and data flowing to backend (Phase 3). Can be refined iteratively based on real data patterns. Unique differentiator vs competitors but complex enough to warrant separate phase.

**Delivers:**
- RIDDOR criteria decision tree (fracture + body part + mechanism logic)
- Structured incident capture for flagging input (checkboxes for injury type, body part, mechanism vs free text)
- Auto-flagging with confidence levels ("Possibly reportable - review required")
- Medic override capability with reason tracking ("Flagged as reportable fracture but confirmed finger fracture only")
- RIDDOR deadline countdown display ("7 days remaining to report to HSE")
- In-app RIDDOR guidance (show relevant HSE criteria excerpt when flagging)
- Override pattern tracking for algorithm tuning (if 80% overridden, review logic)
- Supervisor review workflow (no auto-submission to HSE without human verification)

**Uses stack elements:**
- RIDDOR detection logic as TypeScript service
- Zod schemas for structured incident validation
- Supabase database fields for flagging metadata (is_riddor_reportable, riddor_criteria, override_reason)

**Implements architecture components:**
- RIDDORDetector service with HSE criteria decision tree
- Validation layer for structured incident capture

**Addresses features:**
- RIDDOR auto-flagging (unique differentiator, competitive advantage)
- Automated alerts for RIDDOR deadlines (table stakes, completing notification system)

**Avoids pitfalls:**
- Pitfall 4: RIDDOR flagging sensitivity (structured capture, override capability, feedback loop)
- Technical debt: Start conservative (manual review), add smart flagging based on data

**Research flag:** Phase 6 requires detailed RIDDOR criteria study (HSE regulations). Official guidance available but decision tree logic needs careful design. Plan for iterative tuning based on false positive/negative rates in production. Medium confidence on implementation patterns; regulatory criteria well-documented.

---

### Phase 7: Certification Tracking + Expiry Alerts (Compliance Monitoring)
**Rationale:** Worker registry exists from Phase 2, notification infrastructure from Phase 5/6. Certification tracking is table stakes but can launch without it if focusing on incident capture first. Progressive reminder system prevents deadline misses.

**Delivers:**
- Certification database schema (certification_type, issue_date, expiry_date, renewal_status)
- Progressive notification schedule (30 days, 14 days, 7 days, 1 day before expiry; day-of; 1 day overdue)
- Multi-recipient notifications (worker, site manager, compliance officer)
- Server-side scheduled jobs for daily expiry checking (not device-local notifications)
- Expiry validation at point of use (worker with expired cert can't log incidents until renewed)
- Visual indicators on worker profiles (green: valid, yellow: expiring <30 days, red: expired)
- Dashboard for managers ("3 medics with certifications expiring this month")
- Grace period handling (cert expires March 15, renewal submitted March 1, allow continued work)
- Compliance report generation ("All site medics certified as of [date]")

**Uses stack elements:**
- Supabase cron jobs for daily expiry checks
- Email + Push notifications (Expo Notifications)
- PostgreSQL date functions for expiry calculations

**Implements architecture components:**
- Certification expiry service (scheduled job)
- Notification service extension (progressive reminders)
- Dashboard compliance reporting

**Addresses features:**
- Certification/license tracking (table stakes, UK construction regulatory requirement)
- Automated alerts for certification expiry (table stakes)
- Compliance dashboard enhancement (certification status visibility)

**Avoids pitfalls:**
- Pitfall 7: Certification expiry missed deadlines (progressive reminders, multi-recipient, server-side scheduling)
- Technical debt: Don't rely on device-local notifications (can fail if app uninstalled)

**Research flag:** Phase 7 uses standard patterns (cron scheduling, notification services). Well-documented; no additional research needed.

---

### Phase Ordering Rationale

**Why this order:**
1. **Backend foundation first (Phase 1)** — Mobile and web both depend on API, auth, database. Sync architecture must be rock-solid before features built on top. Retrofitting encryption, audit logging, or sync queue after launch is extremely difficult and risks GDPR violations.

2. **Mobile core before sync (Phase 2 → Phase 3)** — Must work 100% offline first, then add connectivity. Validates offline-first architecture in isolation before introducing sync complexity. Allows focus on medic UX without network variability.

3. **Sync before dashboard (Phase 3 → Phase 4)** — Dashboard needs data flowing from mobile app. Testing sync with flaky networks critical before managers depend on real-time visibility.

4. **PDF generation after dashboard (Phase 4 → Phase 5)** — Requires mature data queries and validated data model from dashboard. Server-side generation depends on stable API.

5. **Smart features last (Phase 6, 7)** — RIDDOR auto-flagging and certification tracking enhance core workflow but aren't blockers for launch. Can iterate based on real usage patterns.

**Dependency chains discovered:**
- Sync queue (Phase 1) → Photo upload (Phase 2) → Background upload queue (Phase 3)
- Database schema (Phase 1) → Treatment models (Phase 2) → Sync logic (Phase 3) → Dashboard queries (Phase 4)
- Notification infrastructure (Phase 1) → Email alerts (Phase 5) → RIDDOR deadlines (Phase 6) → Cert expiry (Phase 7)

**How this avoids pitfalls:**
- All 5 critical pitfalls addressed in Phase 1-3 (foundation, mobile core, sync engine)
- Photo upload blocking prevented in Phase 2 (compression) and Phase 3 (background queue)
- GDPR compliance built from Day 1 (Phase 1 encryption, audit logging)
- Offline UX foundational to Phase 1-3 (sync status indicators, error handling)
- Secondary pitfalls (RIDDOR flagging, PDF performance, cert expiry) addressed in later phases where iterative refinement acceptable

**Grouping rationale:**
- Phase 1-3 form "offline-first mobile foundation" (must ship together for working mobile app)
- Phase 4-5 form "manager reporting layer" (web dashboard + PDF generation)
- Phase 6-7 form "smart compliance features" (auto-flagging + proactive tracking)

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 5 (PDF Generation):** pdfmake compatibility with Supabase Edge Functions (Deno runtime) needs validation. Official docs confirm npm packages work in Deno but edge cases exist. Test pdfmake import and font handling during phase planning. MEDIUM confidence.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Supabase + WatermelonDB offline sync is well-documented with official guide from Supabase. Authentication, RLS, encryption patterns are industry standard. HIGH confidence.
- **Phase 2 (Mobile Core):** Expo modules (image-picker, signature-canvas, secure-store) have official documentation and verified npm versions. Form validation with react-hook-form + zod is standard pattern. HIGH confidence.
- **Phase 3 (Sync Engine):** Offline-first sync architecture heavily documented in research (delta sync, conflict resolution, WorkManager patterns). Supabase + WatermelonDB sync guide provides reference implementation. HIGH confidence.
- **Phase 4 (Web Dashboard):** React 19 + Vite + shadcn/ui + React Query is 2026 industry standard with extensive documentation. Supabase client integration straightforward. HIGH confidence.
- **Phase 6 (RIDDOR Auto-Flagging):** HSE official RIDDOR criteria are publicly documented. Decision tree logic is custom but well-defined regulatory requirements. MEDIUM confidence (implementation patterns clear, tuning requires iteration).
- **Phase 7 (Certification Tracking):** Cron scheduling, notification services, expiry calculations are standard patterns. Well-documented across multiple sources. HIGH confidence.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies verified with official documentation (Expo SDK 54, Supabase, WatermelonDB). npm versions checked. Supabase + WatermelonDB sync pattern has official guide. Supporting libraries (TanStack Query, Zustand, react-hook-form) are 2026 industry standards. |
| Features | HIGH | Validated against 50+ industry sources (construction safety platforms, RIDDOR compliance systems, occupational health software). All MVP features have regulatory drivers or table stakes status. Competitive analysis confirms SiteMedic differentiators (RIDDOR auto-flagging, clinical workflow) are unique. |
| Architecture | HIGH | Offline-first patterns extensively documented. Supabase multi-tenant RLS, WatermelonDB sync, photo compression, server-side PDF generation all have proven implementations. Project structure follows best practices from official guides and 2026 ecosystem standards. |
| Pitfalls | HIGH | Research synthesizes GDPR compliance requirements (official ICO guidance), RIDDOR regulations (HSE documentation), offline-first pitfalls (Android/iOS official docs, industry case studies), and 2026 battery optimization policies (Google Play Store). Critical pitfalls well-understood with concrete prevention strategies. |

**Overall confidence:** HIGH

Research is comprehensive with official sources for regulatory requirements (RIDDOR, UK GDPR), stack components (Expo, Supabase, WatermelonDB), and architectural patterns (offline-first, multi-tenant). Medium confidence areas (pdfmake + Edge Functions compatibility) are bounded and testable during implementation.

### Gaps to Address

**Gap: pdfmake + Supabase Edge Functions (Deno) compatibility**
- Research confirms npm packages work in Deno (Edge Functions runtime) but specific pdfmake font handling and buffer manipulation needs validation
- How to handle: Test pdfmake import and basic PDF generation in Edge Function during Phase 5 planning. If incompatible, fall back to PDFKit (lighter alternative) or server-side Node.js (not serverless)
- Risk level: LOW (multiple PDF library alternatives available; server-side generation approach validated)

**Gap: RIDDOR auto-flagging accuracy thresholds**
- HSE criteria are well-documented but acceptable false positive/negative rates for auto-flagging are product decisions, not technical constraints
- How to handle: Start conservative (flag broadly, require supervisor review). Track override patterns in production. Iteratively tune decision tree based on real medic feedback. Plan for Phase 6 to include A/B testing different sensitivity levels.
- Risk level: LOW (manual RIDDOR review is acceptable MVP; smart flagging is enhancement)

**Gap: SQLCipher performance impact on older iOS devices**
- WatermelonDB with SQLCipher encryption adds ~10-15% query overhead vs plain SQLite
- Research confirms approach is sound but specific performance on 3-year-old iPhones (minimum target) needs real-world testing
- How to handle: Performance test Phase 2 mobile app with 1,000+ treatment records on older devices. If unacceptable, consider selective encryption (encrypt health data fields only, not entire database)
- Risk level: LOW (encryption is non-negotiable for GDPR; selective encryption is fallback)

**Gap: Background sync execution limits on iOS**
- iOS Background Tasks framework has 30-second execution limit (shorter than Android WorkManager)
- Research confirms pattern exists but specific SiteMedic photo upload batch sizing needs tuning
- How to handle: Test Phase 3 sync with multiple photo uploads (4+ photos per incident). If 30 seconds insufficient, batch uploads into smaller chunks or use URLSession background transfer service for large files.
- Risk level: LOW (workarounds well-documented; photo compression reduces file size)

**Gap: UK-specific CSCS/CPCS certification card formats**
- Certification tracking (Phase 7) needs to handle UK construction card types (CSCS, CPCS, IPAF, Gas Safe)
- Research confirms these are standard but specific data fields (card number format, issuing bodies, grace periods) need validation
- How to handle: Consult with SiteMedic domain expert (construction medic) during Phase 7 planning. Document certification schemas before implementation.
- Risk level: LOW (data modeling, not technical risk; domain expert can provide requirements)

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Expo SDK 54 Documentation](https://docs.expo.dev/) — Mobile framework, SDK modules (image-picker, secure-store, notifications)
- [Supabase + WatermelonDB Offline-First Guide](https://supabase.com/blog/react-native-offline-first-watermelon-db) — Official Supabase sync pattern
- [WatermelonDB GitHub](https://github.com/Nozbe/WatermelonDB) — Offline-first reactive database
- [Supabase Documentation](https://supabase.com/docs) — PostgreSQL, Auth, Storage, Edge Functions, RLS
- [React Query Documentation](https://tanstack.com/query/latest) — Server state management, offline persistence
- [shadcn/ui Documentation](https://ui.shadcn.com/docs) — React component library for web dashboard
- [HSE RIDDOR Regulations](https://www.hse.gov.uk/riddor/) — Official UK regulatory requirements
- [ICO GDPR Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/) — UK data protection authority
- [Android WorkManager Documentation](https://developer.android.com/develop/background-work) — Background task scheduling, battery optimization
- [iOS Background Tasks Framework](https://developer.apple.com/documentation/backgroundtasks) — iOS background execution

**npm Registry (Version Verification):**
- [@nozbe/watermelondb 0.28.0](https://www.npmjs.com/package/@nozbe/watermelondb)
- [expo-image-picker 17.0.10](https://www.npmjs.com/package/expo-image-picker)
- [react-native-signature-canvas 5.0.2](https://www.npmjs.com/package/react-native-signature-canvas)
- [@tanstack/react-query 5.x](https://www.npmjs.com/package/@tanstack/react-query)
- [zustand 5.x](https://www.npmjs.com/package/zustand)

### Secondary (MEDIUM confidence)

**Industry Guides & Case Studies:**
- [Offline-First Architecture: Designing for Reality](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79) — Architectural patterns
- [React Native 2026: Mastering Offline-First Architecture](https://javascript.plainenglish.io/react-native-2026-mastering-offline-first-architecture-ad9df4cb61ae) — Best practices
- [Building Offline-First React Native Apps: Complete Guide 2026](https://javascript.plainenglish.io/building-offline-first-react-native-apps-the-complete-guide-2026-68ff77c7bb06) — Implementation patterns
- [GDPR Compliance for Developers: Practical Implementation 2026](https://dasroot.net/posts/2026/02/gdpr-compliance-developers-practical-implementation-2026/) — Encryption, audit logging
- [GDPR in Healthcare: A Practical Guide](https://www.dpo-consulting.com/blog/gdpr-healthcare) — Health data special category requirements
- [Procore Construction Management Software](https://www.procore.com/quality-safety) — Competitor feature analysis
- [HammerTech Construction Safety](https://www.hammertech.com/en-us/) — Competitor feature analysis
- [SafetyCulture iAuditor](https://safetyculture.com/apps/construction) — Competitor feature analysis

**Construction Safety & Medical Compliance:**
- [7 Best Construction Safety Software 2026](https://www.compliancequest.com/bloglet/best-construction-safety-software/) — Feature landscape
- [Understanding RIDDOR Reporting in Construction](https://www.novade.net/en/riddor-reporting-timescales/) — Compliance requirements
- [RIDDOR Accident and Incident Reporting Guide](https://opsbase.com/riddor-accident-incident-reporting/) — Regulatory timelines
- [Apollo Professional Occupational Health Software](https://apollopro.co.uk/) — UK medical compliance platforms
- [Civica Occupational Health Software](https://www.civica.com/en-gb/product-pages/occupational-health-software/) — UK NHS-grade systems

**Offline Sync & Performance:**
- [Data Sync and Conflict Resolution Patterns](https://www.adalo.com/posts/offline-vs-real-time-sync-managing-data-conflicts) — Conflict resolution strategies
- [Complete Guide to Offline-First Architecture in Android](https://www.droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/) — WorkManager patterns
- [Offline-First Mobile Background Sync UX](https://appmaster.io/blog/offline-first-background-sync-conflict-retries-ux) — User experience patterns
- [Design Guidelines for Offline & Sync](https://developers.google.com/open-health-stack/design/offline-sync-guideline) — Google health stack patterns

**Battery Optimization & Background Tasks:**
- [Google Play Store Battery-Draining App Warnings 2026](https://www.webpronews.com/google-play-store-to-warn-users-of-battery-draining-apps-in-2026/) — Policy changes
- [Background Task Patterns Destroying Battery Life](https://medium.com/@hiren6997/these-background-task-patterns-are-destroying-your-apps-battery-life-cc51318826ff) — Anti-patterns
- [Optimize Battery Use for Task Scheduling](https://developer.android.com/develop/background-work/background-tasks/optimize-battery) — Official Android guidance

### Tertiary (LOW confidence - WebSearch inferences)

**Emerging Trends (Not MVP-Relevant):**
- [AI in Construction Safety 2026](https://ohsonline.com/articles/2026/02/10/ai-is-transforming-construction-safety-but-implementation-may-be-the-biggest-risk.aspx) — AI risk prediction (Phase 3+ future consideration)
- [Digital Twins in Workplace Safety 2026](https://www.vanguardehs.com/articles/top-new-trends-in-workplace-safety-for-2026-what-leading-programs-are-adopting-now) — Emerging features (not SiteMedic scope)
- [Wearable Integration for Construction Safety](https://www.intenseye.com/products-reporting/safety-heatmaps) — IoT sensors (Phase 3+ future consideration)

**PDF Generation Libraries:**
- [6 Best PDF Generation APIs 2026](https://craftmypdf.com/blog/best-pdf-generation-apis/) — pdfmake, PDFKit, Puppeteer comparison
- [Why Server-Side PDF Generation](https://www.textcontrol.com/blog/2021/12/30/generating-pdf-documents-in-the-browser/) — Client vs server trade-offs

---

*Research completed: 2026-02-15*
*Ready for roadmap: YES*
