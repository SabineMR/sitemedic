# SiteMedic Features

**Project**: SiteMedic - UK Construction Site Medic Staffing Platform with Bundled Software + Service
**Last Updated**: 2026-02-15
**Audience**: Web developers, technical reviewers, product team

---

## Overview

SiteMedic is a comprehensive platform combining **mobile medic software** (offline-first treatment logging, RIDDOR compliance) with **business operations infrastructure** (booking portal, payment processing, territory management). The platform enables construction companies to book medics online while ensuring automatic compliance documentation and reliable medic payouts.

**Business Model**: Software bundled with medic staffing service (no separate software charge). Revenue from medic bookings with 40% platform markup (medic £30/hr → client £42/hr → platform £12/hr). Weekly medic payouts via UK Faster Payments, Net 30 invoicing for established corporate clients.

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

### 5. Reporting & Compliance (Phase 5-6)
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
- **Three-Tier Pricing Model**
  - **Basic Medic**: £30/hour (traditional service, no tech)
  - **SiteMedic Pro**: £42/hour (recommended - medic + full platform)
  - **Enterprise**: Custom pricing (multi-site, custom integrations)

- **Value Calculator**
  - Traditional cost breakdown (£240 medic + £40 admin + RIDDOR risk = £280+)
  - SiteMedic cost (£336 for 8hr shift, zero admin, zero risk)
  - ROI comparison showing time savings and compliance benefits

- **FAQ Section**
  - What's included in £42/hour rate
  - Minimum booking requirements
  - Free trial policy
  - Dashboard pricing (included, no separate fees)
  - Offline functionality guarantee

- **Pricing Transparency**
  - No hidden fees messaging
  - All features included in hourly rate
  - No per-user dashboard charges
  - Flat-rate pricing model

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

## Phase 1: Foundation
**Status**: Planning complete (5 plans)
**Goal**: Backend infrastructure, authentication, and offline-first architecture

### Features:
- **Supabase Backend** (PostgreSQL UK region: eu-west-2 London)
  - User authentication (email/password)
  - Row-Level Security (RLS) policies for multi-tenant data isolation
  - Audit logging via PostgreSQL triggers (server-side) + local audit service (client-side)
  - GDPR compliance tables (consent tracking, data retention policies)

- **Mobile Authentication**
  - Email/password sign up and login
  - Offline session persistence (app restart works without network)
  - Biometric authentication (Face ID/Touch ID) for quick access
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
**Status**: Not started
**Goal**: Treatment logging, worker profiles, near-miss capture, daily safety checks

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

- **Near-Miss Capture**
  - Photo evidence with GPS timestamp
  - Category and severity classification
  - <45 second completion time
  - Hazard description and corrective actions

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
**Status**: Not started
**Goal**: Mobile-to-backend data synchronization with photo uploads

### Features:
- **Background Sync**
  - Automatic sync when connectivity returns
  - WiFi-only constraint for large photo uploads
  - Battery-efficient (WorkManager constraints verified)
  - Progressive photo upload (preview first, full-quality later)

- **Sync Status Visibility**
  - Pending item count badge
  - Sync progress indicators
  - Failed sync error messages (plain language)
  - Manual retry button for failed items

- **Conflict Resolution**
  - Last-write-wins strategy
  - Client-generated UUIDs (prevent duplicate records on retry)
  - Concurrent edit handling (tested with airplane mode toggles)

- **Critical Alert System**
  - RIDDOR-reportable incidents trigger alerts if sync fails
  - Escalation workflow for critical data
  - Admin notification for stuck sync items

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

## Phase 6: RIDDOR Auto-Flagging
**Status**: Not started
**Goal**: Intelligent RIDDOR detection with deadline tracking

### Features:
- **Auto-Detection Algorithm**
  - Matches treatment details against RIDDOR criteria
    - Specified injuries (fractures, amputations, loss of sight, etc.)
    - Over-7-day incapacitation
    - Dangerous occurrences (scaffolding collapse, etc.)
  - Confidence level (High/Medium/Low)
  - Explanation of why flagged

- **Medic Override**
  - Medic can confirm or override RIDDOR flag
  - Requires reason for override
  - Override patterns tracked for algorithm tuning
    - If 80% overridden for specific category → review logic

- **Deadline Countdown**
  - 10 days for specified injuries (immediate notification)
  - 15 days for over-7-day incapacitation
  - Visible on mobile app and dashboard
  - Email alert 3 days before deadline

- **HSE F2508 Form Generation**
  - Pre-filled from treatment log data
  - PDF format ready for HSE submission
  - Editable fields for additional details
  - Digital signature support

- **Status Tracking**
  - Draft → Submitted → Confirmed
  - Submission confirmation from HSE (manual entry)
  - Audit trail for compliance

---

## Phase 6.5: Payment Processing & Payouts (NEW)
**Status**: Not started (5 plans)
**Goal**: Full payment processing with client charging and weekly medic payouts

### Features:
- **Client Payment Processing**
  - **Card Payments (Stripe)**
    - Payment Intent creation with 3D Secure (SCA compliant)
    - Card charge for new clients (prepay)
    - Payment confirmation email
    - Receipt generation (PDF)

  - **Net 30 Invoicing**
    - Invoice generation with VAT (20%)
    - PDF invoice delivery via email (Friday)
    - Payment terms: Net 30 (due 30 days from invoice date)
    - Late payment reminders (auto-send at 7, 14, 21 days)
    - Statutory late fees (£40 for <£1000, £70 for £1000-9999, £100 for £10k+)

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

- **IR35 Compliance**
  - **Medic Onboarding**
    - Self-employed vs umbrella company selection
    - UTR collection for self-employed (HMRC Unique Taxpayer Reference)
    - Umbrella company details if applicable

  - **Stripe Express Account Setup**
    - Onboarding link generation (Stripe hosted)
    - Bank account verification
    - Identity verification (KYC)
    - Tax documentation collection

  - **Contractor Status**
    - Self-employed medics (NOT employees)
    - No PAYE, no NI contributions by platform
    - Medics responsible for own tax returns
    - HMRC CEST tool validation (IR35 check)

- **Out-of-Territory Cost Management**
  - **Cost Calculation Logic**
    - Calculate travel time from secondary medic's home to site (Google Maps)
    - IF travel time >60 minutes:
      - **Option A: Travel Bonus** - £2/mile one-way beyond 30 miles
      - **Option B: Room/Board** - Overnight accommodation if cheaper than 2x daily travel
      - **Option C: Deny Booking** - If cost >50% of shift value (not cost-effective)
    - Present cost breakdown to admin for approval

  - **Admin Approval UI**
    - Shows: Primary medic unavailable, secondary medic available
    - Travel time: [X] minutes
    - Travel bonus cost: £[Y]
    - Room/board cost: £[Z]
    - Recommendation: [Travel bonus / Room/board / Deny]
    - Admin can override and manually assign

  - **Cost Tracking**
    - Out-of-territory costs tracked separately in revenue dashboard
    - Alert if out-of-territory costs exceed 10% of revenue (margin erosion)

- **Refund Processing**
  - Admin-initiated refunds (full or partial)
  - Stripe refund API integration
  - Refund reason tracking (client cancellation, medic no-show, etc.)
  - Email notification to client

---

## Phase 7: Certification Tracking
**Status**: Not started
**Goal**: UK certification management with expiry alerts

### Features:
- **Certification Database**
  - UK construction certifications tracked:
    - CSCS (Construction Skills Certification Scheme)
    - CPCS (Construction Plant Competence Scheme)
    - IPAF (International Powered Access Federation)
    - PASMA (Prefabricated Access Suppliers' and Manufacturers' Association)
    - Gas Safe (gas work certification)
  - Expiry date tracking
  - Photo upload of certification card

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

## Phase 7.5: Territory Management & Auto-Assignment (NEW)
**Status**: Not started (5 plans)
**Goal**: Intelligent medic assignment across UK territories

### Features:
- **Territory Assignment System**
  - **UK Postcode Sectors**
    - Primary geographic unit (~11,232 sectors total)
    - Format: "SW1A", "N1", "E14" (area + district)
    - Granular coverage mapping

  - **Primary + Secondary Medic**
    - Primary medic: First choice for bookings in sector
    - Secondary medic: Backup when primary unavailable
    - Multiple sectors per medic (overlapping territories)

  - **Hybrid Territory Model**
    - Postcode sector + max travel time
    - Example: "SW1A within 30 minutes"
    - Accommodates traffic patterns and geography

  - **Admin Assignment UI**
    - Drag-drop medics to postcode sectors
    - Visual coverage map
    - Reassignment with effective date

- **Auto-Assignment Algorithm**
  - **Ranking Criteria** (in order):
    1. **Territory Match** - Medic assigned to postcode sector (primary > secondary)
    2. **Distance** - Google Maps drive time (prefer <30 minutes)
    3. **Utilization** - Prefer medics <70% utilization (load balancing)
    4. **Qualifications** - Must have required certs (confined space, trauma, etc.)
    5. **Availability** - Check calendar integration (Google/Outlook iCal feed)
    6. **Rating** - Prefer higher-rated medics (4.5+ stars)

  - **Out-of-Territory Logic**
    - IF primary medic unavailable AND secondary medic exists:
      - Calculate travel time from secondary medic's home to site
      - IF travel time >60 minutes:
        - Compare: Travel bonus (£2/mile beyond 30 miles) vs Room/board (overnight stay)
        - IF cost >50% shift value: Recommend deny
      - Present to admin for approval with cost breakdown

  - **Hybrid Approval**
    - Auto-confirm: Standard shifts (7+ days notice, medic available, <30 min travel)
    - Manual review: Emergency, out-of-territory, special requirements

  - **Candidate Transparency**
    - Client sees ranked candidates (if multiple options)
    - Explanation: "Closest medic (15 min drive), 4.8 stars, available"
    - Builds trust in auto-matching

- **Coverage Gap Detection**
  - **Rejection Rate Monitoring**
    - Track booking rejection rate per territory
    - Alert when >10% rejection rate for 3+ consecutive weeks
    - Display: "Coverage gap detected in East London (E1-E20)"

  - **Utilization Monitoring**
    - Track medic utilization per week
    - Alert when >80% utilization for 3+ weeks
    - Display: "High utilization in South West (SW sectors, 85%)"

  - **Fulfillment Rate**
    - Track % of bookings successfully filled
    - Alert when fulfillment rate <90%
    - Display: "Low fulfillment in Birmingham (B sectors, 85%)"

  - **Hiring Triggers**
    - Trigger conditions:
      - Utilization >80% for 3+ weeks, OR
      - Fulfillment rate <90%, OR
      - Rejection rate >10% for 3+ weeks
    - Recommendation: "Hire medic in North London (N1-N22 sectors)"
    - Include: Estimated demand, revenue opportunity, break-even analysis

- **Visual Coverage Map**
  - **Choropleth Map**
    - Color-coded by utilization:
      - Green: <50% (capacity available)
      - Yellow: 50-80% (healthy utilization)
      - Red: >80% (hiring needed)
    - Click postcode sector → see details

  - **Sector Detail View**
    - Assigned medic (primary, secondary)
    - Utilization % (weekly, monthly)
    - Recent bookings in sector
    - Rejection rate
    - Average travel time to jobs

  - **Admin Drag-Drop Reassignment**
    - Drag medic from one sector to another
    - Supports overlapping territories (medic can cover multiple sectors)
    - Effective date for reassignment
    - Notification to medic about new territory

  - **Real-Time Updates**
    - Map refreshes every 5 minutes
    - Shows pending bookings, confirmed bookings, in-progress shifts
    - Live utilization recalculation

- **Calendar Integration**
  - **iCal Feed Support**
    - Google Calendar sync (read-only)
    - Outlook Calendar sync (read-only)
    - iCloud Calendar sync (read-only)

  - **Availability Checking**
    - Check medic calendar before auto-assignment
    - Respect medic time-off blocks
    - Prevent double-booking

  - **Calendar Event Creation**
    - Auto-create calendar event when booking confirmed
    - .ics file attached to confirmation email
    - Includes: Shift details, site address, client contact

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

### Admin Role
- Add to existing Phase 1 auth system
- Role: `admin` (vs `medic`, `site_manager`, `client`)
- Full access to all dashboards and management features

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

**Document Version**: 1.0
**Last Updated**: 2026-02-15
**Next Review**: After Phase 1.5 completion

---

*This document is maintained by the SiteMedic product team. For questions or suggestions, contact the project lead.*
