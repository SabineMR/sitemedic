# Requirements: SiteMedic

**Defined:** 2026-02-15
**Core Value:** Documentation happens automatically as the medic does their job, not as separate admin work.

## v1 Requirements

Requirements for MVP launch. Each maps to roadmap phases.

### Foundation & Architecture

- [ ] **ARCH-01**: Backend API with UK-hosted Supabase (eu-west-2 London region) for GDPR compliance
- [ ] **ARCH-02**: PostgreSQL database with Row-Level Security for multi-tenant isolation
- [ ] **ARCH-03**: Encrypted local SQLite database (WatermelonDB + SQLCipher, AES-256)
- [ ] **ARCH-04**: Offline-first sync queue with conflict resolution and exponential backoff
- [ ] **ARCH-05**: Background sync with WorkManager constraints (WiFi-only for photos, battery-friendly)
- [ ] **ARCH-06**: Multi-modal sync status indicators (color, labels, persistent badge showing pending items)
- [ ] **ARCH-07**: Network connectivity detection and offline mode handling

### Authentication & Security

- [ ] **AUTH-01**: User can sign up and log in with email and password
- [ ] **AUTH-02**: User session persists across app restarts (offline session handling)
- [ ] **AUTH-03**: Biometric authentication (Face ID / Touch ID) for quick access
- [ ] **AUTH-04**: Encryption key management via iOS Keychain (never in AsyncStorage)
- [ ] **AUTH-05**: Role-based access control (medic vs site manager vs admin)

### GDPR & Compliance

- [ ] **GDPR-01**: Health data encrypted at rest (AES-256) and in transit (TLS 1.3)
- [ ] **GDPR-02**: Audit logging for all health data access (who viewed which worker record)
- [ ] **GDPR-03**: Worker consent flow during induction (digital signature for data processing)
- [ ] **GDPR-04**: Data retention policy implementation (3-year minimum for RIDDOR)
- [ ] **GDPR-05**: Right to erasure workflow (worker can request data deletion)
- [ ] **GDPR-06**: UK/EEA data residency enforced (no data leaving region)

### Treatment Logger (Mobile App)

- [ ] **TREAT-01**: Medic can select worker from site roster or quick-add new worker
- [ ] **TREAT-02**: Medic can log injury/illness category from pick list (Section 8.1 taxonomy)
- [ ] **TREAT-03**: Medic can select body part affected via tap on body diagram or pick list
- [ ] **TREAT-04**: Medic can describe mechanism of injury (free text + common presets)
- [ ] **TREAT-05**: Medic can record treatment given (pick list + free text)
- [ ] **TREAT-06**: Medic can attach up to 4 photos with on-device compression (resize to 1200px, compress to 100-200KB)
- [ ] **TREAT-07**: Medic can record outcome (Returned to work / Light duties / Referred to GP / A&E / Sent home)
- [ ] **TREAT-08**: Medic can capture worker's digital signature confirming treatment received
- [ ] **TREAT-09**: Each treatment log gets unique reference number (format: SITE-YYYYMMDD-001)
- [ ] **TREAT-10**: Treatment logger auto-saves locally every 10 seconds (offline resilience)
- [ ] **TREAT-11**: Quick log mode for minor treatments (<30 second completion: Worker + Category + Treatment + Outcome)
- [ ] **TREAT-12**: Full log mode for significant treatments with complete detail capture

### Near-Miss Capture (Mobile App)

- [ ] **NEAR-01**: Medic can report near-miss in <45 seconds (category + photo + description + severity)
- [ ] **NEAR-02**: Medic can select near-miss category from pick list (Fall from height / Struck by object / Slip-trip / Electrical / etc.)
- [ ] **NEAR-03**: Medic can capture up to 4 photos of near-miss scene
- [ ] **NEAR-04**: Medic can describe near-miss via free text or voice-to-text
- [ ] **NEAR-05**: Medic can select severity potential (What COULD have happened: Minor / Major / Fatal)
- [ ] **NEAR-06**: Near-miss accessible from home screen in ONE tap (big visible button)
- [ ] **NEAR-07**: GPS coordinates auto-attached to near-miss report

### Daily Safety Snapshot (Mobile App)

- [ ] **DAILY-01**: Medic completes 10-item safety checklist each morning (3-5 minute target)
- [ ] **DAILY-02**: Each checklist item has Green/Amber/Red status + optional photo + note
- [ ] **DAILY-03**: Checklist items cover: First aid kit, AED, eyewash, welfare facilities, site access, PPE, housekeeping, weather, hazards, emergency vehicle access
- [ ] **DAILY-04**: App prompts medic to complete checklist when opening app on workday morning
- [ ] **DAILY-05**: Incomplete checklists flag on dashboard for site manager visibility

### Worker Health Profiles (Mobile App)

- [ ] **WORK-01**: Medic can add worker during site induction with health screening data
- [ ] **WORK-02**: Worker profile includes: name, company, role, emergency contact, allergies, medications, pre-existing conditions, blood type, CSCS card number + expiry
- [ ] **WORK-03**: Medic can view worker's treatment history on this project
- [ ] **WORK-04**: Medic can pull up any worker's profile in 2 taps during emergency
- [ ] **WORK-05**: Worker profile shows certification expiry dates with visual status (green/amber/red)
- [ ] **WORK-06**: Worker data is GDPR-compliant (encrypted, access-controlled, retention policy enforced)

### RIDDOR Reporting

- [ ] **RIDD-01**: App auto-flags treatment when it matches RIDDOR-reportable criteria (Section 8.2)
- [ ] **RIDD-02**: Medic can confirm or override RIDDOR flag with reason
- [ ] **RIDD-03**: RIDDOR-flagged incident shows deadline countdown (10 days for specified injuries, 15 days for over-7-day)
- [ ] **RIDD-04**: App generates pre-filled HSE F2508 form PDF from treatment log data
- [ ] **RIDD-05**: Dashboard shows RIDDOR deadline countdown for site manager
- [ ] **RIDD-06**: RIDDOR report tracks status: Draft / Submitted / Confirmed

### Photo Handling

- [ ] **PHOTO-01**: Photos captured with EXIF metadata preservation
- [ ] **PHOTO-02**: Photos compressed on-device before upload (resize to 1200px, compress to 100-200KB JPEG)
- [ ] **PHOTO-03**: Photo upload happens in background (doesn't block medic workflow)
- [ ] **PHOTO-04**: Progressive upload: low-quality preview syncs first, full-quality later
- [ ] **PHOTO-05**: Photo upload uses WiFi-only constraint to avoid mobile data costs
- [ ] **PHOTO-06**: Original photos retained on device for 30 days before cleanup

### Web Dashboard (Site Manager)

- [ ] **DASH-01**: Site manager sees overview screen with traffic-light compliance score
- [ ] **DASH-02**: Compliance score based on: daily check completed today, overdue follow-ups, expired certifications, RIDDOR deadlines
- [ ] **DASH-03**: Dashboard shows summary stats for current week (treatments, near-misses, toolbox talks, workers on site)
- [ ] **DASH-04**: Site manager can view and filter treatment log (by date range, severity, injury type, worker, outcome)
- [ ] **DASH-05**: Site manager can click into any treatment for full detail view including photos
- [ ] **DASH-06**: Site manager can view near-miss log (list view with category, severity, date)
- [ ] **DASH-07**: Site manager can view worker registry with certification status indicators
- [ ] **DASH-08**: Site manager can search and filter workers (by company, role, certification status)
- [ ] **DASH-09**: Dashboard updates via polling (60-second intervals) for near-real-time data
- [ ] **DASH-10**: Dashboard is responsive (desktop-focused, mobile-friendly for tablets)

### PDF Report Generation

- [ ] **PDF-01**: Weekly safety report auto-generated every Friday with professional formatting
- [ ] **PDF-02**: PDF includes: project name, week ending date, medic name, compliance score, treatment summary, near-miss summary, certification status, RIDDOR status, open actions
- [ ] **PDF-03**: PDF generation completes in <10 seconds (server-side via Supabase Edge Functions)
- [ ] **PDF-04**: PDF includes company branding (logo, colors)
- [ ] **PDF-05**: Site manager can download PDF or receive via email
- [ ] **PDF-06**: PDF stored in Supabase Storage with signed URL for secure access
- [ ] **PDF-07**: PDF is audit-ready for HSE inspectors, principal contractors, insurers

### Certification Tracking & Alerts

- [ ] **CERT-01**: System tracks UK certifications (CSCS, CPCS, IPAF, PASMA, Gas Safe, etc.) with expiry dates
- [ ] **CERT-02**: Dashboard shows list of certifications expiring in next 30/60/90 days
- [ ] **CERT-03**: Workers on site with expired certifications show critical alert (red)
- [ ] **CERT-04**: Email notification to site manager when certification expires
- [ ] **CERT-05**: Progressive reminders before expiry (30, 14, 7, 1 days before)
- [ ] **CERT-06**: Expired certification prevents worker from logging incidents (validation at point of use)

### Email Notifications

- [ ] **NOTIF-01**: Site manager receives email when weekly PDF report is ready
- [ ] **NOTIF-02**: Site manager receives email when RIDDOR deadline approaches (3 days before)
- [ ] **NOTIF-03**: Site manager receives email when worker certification expires
- [ ] **NOTIF-04**: Email notifications use professional template with company branding

### Mobile UX & Performance

- [ ] **UX-01**: Gloves-on usability (48x48pt minimum tap targets, ideally 56x56 for primary actions)
- [ ] **UX-02**: Bright-light readability (high contrast, no light grey text)
- [ ] **UX-03**: One-hand operation for core workflows (treatment log, near-miss capture)
- [ ] **UX-04**: No training required (familiar patterns, obvious labelling)
- [ ] **UX-05**: Treatment logging completes in <90 seconds for full log, <30 seconds for quick log
- [ ] **UX-06**: Near-miss capture completes in <45 seconds
- [ ] **UX-07**: Daily safety check completes in <5 minutes
- [ ] **UX-08**: App launches instantly regardless of offline data volume (lazy loading)

### Data Export

- [ ] **EXPORT-01**: Site manager can export treatment log as CSV
- [ ] **EXPORT-02**: Site manager can export treatment log as PDF
- [ ] **EXPORT-03**: Site manager can export worker registry as CSV

## v2 Requirements

Deferred to post-MVP release. Tracked but not in current roadmap.

### Film/TV Industry Mode

- **FILM-01**: Project type selection during setup (Construction vs Film & TV)
- **FILM-02**: Film/TV terminology swap (Workers → Crew & Cast, certifications → DBS checks, stunt qualifications)
- **FILM-03**: Film/TV daily checklist (catering hygiene, stunt prep, SFX safety)
- **FILM-04**: Crew allergy & dietary database for catering management
- **FILM-05**: Stunt risk assessment sign-off workflow

### Advanced Analytics

- **ANALYTICS-01**: Near-miss heat map visualization on site plan
- **ANALYTICS-02**: Trend analysis charts (near-miss frequency over time by category)
- **ANALYTICS-03**: Cross-project benchmarking (for principal contractors managing multiple sites)
- **ANALYTICS-04**: Predictive analytics (incident risk scoring based on historical patterns)

### Enhanced Features

- **ENHANCE-01**: Toolbox talk logger with attendance tracking
- **ENHANCE-02**: Document library (site plan, RAMS, COSHH assessments, insurance certificates)
- **ENHANCE-03**: Multi-project support (one medic assigned to multiple sites)
- **ENHANCE-04**: Custom report branding (client's logo on PDF reports)
- **ENHANCE-05**: Real-time dashboard updates (WebSockets instead of polling)
- **ENHANCE-06**: Mobile web version (responsive web app for managers in field)

### Integrations & API

- **API-01**: REST API for third-party integrations
- **API-02**: Procore integration (sync incidents to Procore Safety module)
- **API-03**: Payroll system integration (sync worked hours)
- **API-04**: ERP integration (sync project data)
- **API-05**: Webhook support for custom integrations

### Advanced Compliance

- **COMPLY-01**: Over-7-day incapacitation tracking (RIDDOR requirement for injuries causing >7 days off work)
- **COMPLY-02**: Follow-up reminder system (automated check-ins for workers with ongoing injuries)
- **COMPLY-03**: HSE F2508 direct submission API integration
- **COMPLY-04**: Insurance claim form auto-generation

## Out of Scope

Explicitly excluded features. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Android app | iOS first—validate market demand before multi-platform investment |
| Real-time chat/messaging | High complexity, not core compliance value; use existing tools (WhatsApp, Slack) |
| Video recording of incidents | Storage/bandwidth costs too high; photos + text sufficient for compliance |
| Offline map/site plan navigation | Complexity not justified for MVP; site plans as uploaded images sufficient |
| Biometric health monitoring integration | Wearables/IoT add hardware dependency; defer until post-PMF |
| AI risk prediction | Requires 12+ months historical data; cannot build in MVP |
| Custom form builder | Over-engineering; predefined forms cover 95% of use cases |
| OAuth social login (Google, Apple) | Email/password sufficient for B2B; add if users request it |
| Multi-language support | UK-only launch; English sufficient for MVP |
| White-label/multi-tenant SaaS | Single-instance for Kai's business first; SaaS pivot if scaling beyond own medics |
| Blockchain audit trail | Over-engineering; PostgreSQL audit logs + encryption meet compliance requirements |
| AR body part selection | Cool but gimmicky; tap on diagram is faster and more reliable |
| Voice-only incident logging | Voice-to-text as enhancement yes, voice-only workflow no (transcription errors too risky for legal docs) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be populated by roadmapper) | | |

**Coverage:**
- v1 requirements: 0 total (to be counted after roadmap)
- Mapped to phases: 0
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after initial definition*
