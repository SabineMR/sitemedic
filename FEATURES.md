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

### 5. Customer Onboarding & Contracts (Phase 4.6)
**NEW** - Service agreement generation with auto-filled business info, document portal for phone sales, flexible payment terms (half upfront + remainder after completion/Net 30), digital signatures, and payment schedule enforcement.

### 6. Reporting & Compliance (Phase 5-6)
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
- **Modern Design with Enhanced Visual Hierarchy**
  - Updated hero section with larger typography (text-6xl)
  - Better spacing and padding throughout (pt-20, pb-20)
  - Professional shadow effects on cards (shadow-lg, hover:shadow-xl)
  - Gradient backgrounds for visual interest (from-slate-50 to-blue-50)
  - Improved mobile responsiveness (sm, md, lg breakpoints)

- **Main Pricing Card (Guardian Medics Pro)**
  - Daily rate: £350/day (+VAT)
  - Enhanced card design with rounded-xl borders
  - Larger pricing display (text-6xl for price)
  - Feature list with green checkmarks
  - Hover effects for better interactivity
  - Includes: Digital treatment logging, RIDDOR auto-flagging, weekly safety reports, offline capability

- **Volume Discount Cards**
  - Gradient background design (from-slate-50 to-blue-50)
  - Three tiers:
    - 1 week (5 days): £1,750 total (£350/day)
    - 1 month (20 days): £6,800 total (£340/day, 3% off)
    - Enterprise: Custom pricing with highlighted card design
  - Hover states with shadow effects
  - Better visual hierarchy with bold typography

- **FAQ Section**
  - Enhanced with rounded-xl borders
  - Larger headings (text-lg) for better readability
  - Hover effects (border-blue-200, shadow-sm)
  - Better spacing between questions
  - Professional typography with leading-relaxed

- **CTA Section**
  - Gradient background (from-slate-50 to-blue-50)
  - Larger typography (text-4xl for heading)
  - Enhanced button with shadow effects
  - Better mobile responsiveness

- **Interactive Quote Builder Modal with UK Construction Industry Intelligence**
  - **Step 1: Construction Site Assessment**
    - **Worker count input** for calculating paramedic requirements
      - Clearly asks for "Maximum workers on site at one time" (peak concurrent workers)
      - Not total headcount across all shifts/rotations
      - Includes example: "50 day shift + 30 night shift = enter 50"
      - Blue info box explains why peak concurrent matters for safety coverage
    - Project type selection (standard, high-risk, heavy civil, refurbishment)
    - **Intelligent paramedic recommendation** based on HSE guidelines:
      - High-risk sites: 1 paramedic per 50 concurrent workers
      - Standard sites: 1 paramedic per 100 concurrent workers
      - Green highlighted recommendation box shows calculation logic
    - Project phase selection (pre-construction, construction, fit-out, completion)
    - **Special requirements checkboxes** with educational info icon (ℹ️)
      - Confined Space Work (requires specialized rescue training)
      - Working at Height >3m (scaffolding, roofing, fall injury expertise)
      - Heavy Machinery Operation (crush injuries, extrication)
      - CSCS Card Site (paramedic needs valid CSCS card)
      - Trauma Specialist (advanced trauma care experience)
      - Clickable info icon shows detailed explanation of each requirement
      - Helps users understand why each matters for paramedic matching
    - UK postcode validation (England, Scotland, Wales, Northern Ireland only)
    - Duration flexibility: Fixed vs Estimated
      - Fixed: Exact duration (1 day to 6 months)
      - Estimated: Range-based (1-2 weeks, 2-4 weeks, etc., or ongoing with weekly renewal)
    - Start date picker with minimum date validation

  - **Step 2: Comprehensive Quote Breakdown**
    - Project details summary (workers, type, location, special requirements)
    - Detailed pricing calculation:
      - Per-paramedic daily rate (£350/day)
      - Total days calculated from duration selection
      - VAT clearly indicated (20%)
      - Estimated vs fixed pricing clearly labeled
    - What's included section listing all compliance features
    - Educational note for estimated pricing explaining flexibility

  - **Step 3: Contact Information Collection**
    - Full name, email, phone (UK format), company name
    - GDPR-compliant consent notice
    - Form submission with quote request

  - **UK Construction Industry Context**
    - Follows CDM 2015 requirements
    - Accommodates uncertain construction timelines
    - Provides guidance on paramedic requirements
    - Special requirements aligned with UK construction standards
    - UK-only address validation for insurance compliance

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

## UK Legal & Compliance Features (Just Built)
**Status**: ✅ **COMPLETED** - Full UK GDPR, PECR, and accessibility compliance
**Goal**: Meet all UK legal requirements for operating a health data business
**Tech Stack**: React, TypeScript, Tailwind CSS, localStorage for consent management

### Features:

#### **Privacy Policy** (`/privacy-policy`) ✅
- **UK GDPR Comprehensive Documentation**
  - Data controller information (SiteMedic Ltd with ICO registration)
  - Special category data (health data) handling under Article 9
  - Legal bases: Contract performance, legal obligation, legitimate interest, consent
  - Data collection breakdown:
    - Personal data: Account info, company details, device info, usage data
    - Special category health data: Worker profiles, treatment records, photos, RIDDOR incidents, certifications
  - Data sharing and third-party processors:
    - Supabase (PostgreSQL UK hosting, eu-west-2 London)
    - Vercel (Website hosting with UK data residency)
    - Stripe (Payment processing, PCI-DSS compliant)
    - All with Data Processing Agreements (DPAs)
  - **No data transfers outside UK/EU**
  - Security measures:
    - AES-256 encryption at rest
    - TLS 1.3 in transit
    - Bcrypt password hashing
    - Row-Level Security (RLS) policies
    - Audit logging
  - Data retention policies:
    - Treatment records: 3 years (RIDDOR requirement)
    - Certifications: Until expiry + 1 year
    - Account data: Until deletion + 30 days
    - Audit logs: 6 years (UK tax law)
  - User rights under UK GDPR:
    - Right to access (Article 15)
    - Right to rectification (Article 16)
    - Right to erasure / "Right to be Forgotten" (Article 17)
    - Right to restrict processing (Article 18)
    - Right to data portability (Article 20)
    - Right to object (Article 21)
    - Right to withdraw consent
  - ICO complaint procedure with full contact details
  - Contact information for privacy inquiries and DPO

#### **Cookie Policy** (`/cookie-policy`) ✅
- **PECR (Privacy and Electronic Communications Regulations) Compliant**
  - Detailed explanation of what cookies are (session, persistent, first-party, third-party)
  - Cookie categories with explicit consent requirements:
    - **Strictly Necessary** (Always Active):
      - `cookie-consent`: Stores user preferences (12 months)
      - `session-token`: Authentication (session)
      - `csrf-token`: Security protection (session)
    - **Analytics Cookies** (Requires Consent):
      - `_ga`, `_ga_*`, `_gid`: Google Analytics (2 years/24 hours)
      - Purpose: Site performance measurement and improvement
      - Third-party: Google LLC with DPA
    - **Marketing Cookies** (Requires Consent):
      - `_fbp`: Facebook Pixel (3 months)
      - `_gcl_au`: Google Ads conversion tracking (3 months)
      - Purpose: Ad targeting and campaign measurement
  - Cookie management instructions:
    - Cookie banner controls (Accept All / Necessary Only / Customize)
    - Browser settings guides for Chrome, Firefox, Safari, Edge
    - Third-party opt-out links (Google, Facebook privacy policies)
  - Do Not Track (DNT) disclosure
  - Mobile app data storage explanation (iOS Keychain, not browser cookies)

#### **Terms and Conditions** (`/terms-and-conditions`) ✅
- **UK Law Governed (England and Wales Jurisdiction)**
  - Eligibility requirements: 18+, qualified medical professionals, legal capacity
  - Account creation and security responsibilities
  - Acceptable use policy:
    - Prohibited activities (unauthorized access, malware, false information)
    - Professional responsibility disclaimers (medic remains solely responsible for clinical decisions)
    - Healthcare regulation compliance obligations
  - Content and intellectual property:
    - User retains ownership of treatment records and data
    - SiteMedic owns platform software and design
    - Backup responsibility (user must maintain own backups)
  - Payment terms:
    - Fees quoted in GBP (£) with VAT at 20%
    - Monthly/annual subscriptions auto-charged
    - Enterprise plans invoiced with Net 30 terms
    - Late payment fees per Late Payment of Commercial Debts (Interest) Act 1998
    - Refund policy (Consumer Rights Act 2015 compliant)
  - Data protection and privacy:
    - UK GDPR compliance reference
    - Special category health data consent
    - Cross-reference to Privacy Policy
  - Limitations of liability:
    - Service availability (99.9% uptime target, no guarantee)
    - Disclaimer of warranties ("AS IS" service)
    - Liability cap (fees paid in preceding 12 months)
    - Exceptions for death/injury by negligence, fraud
  - Indemnification:
    - User liability for Terms violations
    - Clinical decision responsibility
  - RIDDOR compliance responsibilities:
    - User responsible for accurate logging
    - User responsible for reviewing flags and submitting reports
    - SiteMedic provides tools only, not compliance guarantee
  - Termination procedures:
    - User-initiated cancellation
    - Platform-initiated suspension (breach, non-payment, legal requirement)
    - 30-day data export window
  - Dispute resolution (informal mediation before litigation)
  - Severability, entire agreement clauses

#### **Cookie Consent Banner** ✅
- **GDPR/PECR Compliant Consent Management**
  - Appears on first visit (localStorage check)
  - Three consent options clearly presented:
    1. **Accept All**: Consent to necessary + analytics + marketing
    2. **Necessary Only**: Essential cookies only (functional requirement)
    3. **Customize**: Opens preferences modal for granular control
  - Sticky banner at bottom with dark background (high visibility)
  - Clear explanation of cookie usage
  - Link to detailed Cookie Policy
  - Consent preferences modal:
    - Toggle switches for Analytics and Marketing
    - Strictly Necessary always enabled (cannot be disabled)
    - Detailed descriptions of each category
    - Visual toggle switches with blue active state
    - "Save Preferences", "Reject All", "Cancel" buttons
  - Persistent storage:
    - Consent saved to localStorage (12-month persistence)
    - Consent date tracked for audit purposes
    - Preferences can be changed anytime
  - No cookies set before explicit consent (PECR requirement)
  - Integration points for analytics/marketing script initialization

#### **Accessibility Improvements (WCAG 2.1 AA)** ✅
- **Keyboard Navigation**
  - Skip-to-content link (visible on focus, jumps to #main-content)
  - Tab order follows logical reading flow
  - All interactive elements keyboard-accessible
  - No keyboard traps
- **Semantic HTML5 Structure**
  - `<main id="main-content">` for primary content
  - `<nav aria-label="Main navigation">` for navigation
  - `<section aria-labelledby="[heading-id]">` for content sections
  - `<footer role="contentinfo">` for footer
  - Proper heading hierarchy (h1 → h2 → h3, no skipping levels)
- **ARIA Labels and Landmarks**
  - aria-label on logo link ("SiteMedic Home")
  - aria-label on buttons ("Start your 14-day free trial", "Watch a product demonstration video")
  - aria-labelledby linking sections to headings
  - Descriptive link text (no "click here")
- **Focus Indicators**
  - Visible focus rings on all interactive elements
  - Blue ring (ring-2) for standard elements
  - Prominent ring (ring-4) for primary CTAs
  - High contrast against background
- **Color Contrast**
  - Blue-600 (#2563EB) on white background (WCAG AA compliant)
  - White text on gray-900 background (WCAG AAA compliant)
  - High contrast for readability
- **Language Declaration**
  - `lang="en-GB"` in `<html>` tag (British English)
  - Proper for UK-based business
- **Screen Reader Support**
  - Descriptive alt text for icons (implied by SVG usage)
  - Proper labeling of form controls
  - Clear button labels for screen readers

#### **Refund & Returns Policy** (`/refund-policy`) ✅ **NEW**
- **Consumer Rights Act 2015 Compliant**
  - 14-day cooling off period for online purchases
  - Full refund rights for subscription services
  - Medic booking cancellation policy:
    - 7+ days before: 100% refund, no cancellation charges
    - 3-6 days before: 50% refund, 50% cancellation fee
    - <72 hours: No refund (medic reserved)
  - Service quality issue resolution process
  - Refund request procedures (email, phone, online dashboard)
  - Refund processing timelines:
    - Card payments: 5-7 business days
    - PayPal: 3-5 business days
    - Bank transfer: 3-5 business days
  - Non-refundable items clearly listed
  - Rescheduling option as alternative to cancellation
  - Statutory rights preserved (Consumer Rights Act, Consumer Contracts Regulations)

#### **Complaints Procedure** (`/complaints`) ✅ **NEW**
- **Comprehensive Complaints Handling Process**
  - Multiple contact methods (email, phone, live chat, post)
  - Three-stage process:
    1. Acknowledgement within 24 hours with complaint reference number
    2. Investigation within 5-10 business days
    3. Resolution with clear explanation and remedies
  - Possible outcomes:
    - Financial remedy (refund, credit, discount, compensation)
    - Service remedy (re-performance, upgrade, priority support)
    - Corrective action (staff training, process improvements)
    - Apology and explanation
  - Internal escalation to senior management
  - External escalation options:
    - Alternative Dispute Resolution (UK Dispute Resolution service)
    - Citizens Advice Consumer Service
    - Small Claims Court
  - Common complaint categories (service quality, booking/admin, technical, communication)
  - Commitment to learning from complaints (quarterly reviews, process improvements)

#### **Acceptable Use Policy** (`/acceptable-use`) ✅ **NEW**
- **Comprehensive AUP Defining Prohibited Activities**
  - Prohibited categories:
    1. Illegal or fraudulent activities (fraud, false RIDDOR reports, insurance fraud)
    2. Data misuse and privacy violations (unauthorized access, GDPR violations, data selling)
    3. System abuse and security violations (hacking, malware, DoS attacks)
    4. Content and communication abuse (false information, harassment, spam)
    5. Commercial misuse (reselling, competing, building similar products)
    6. Professional misconduct (practice outside scope, impaired treatment, falsified records)
  - Reporting mechanisms for violations (security, abuse, DPO contacts)
  - Consequences of violations:
    - Warning (first-time/minor violations)
    - Account suspension (repeated/moderate violations, 7-30 days)
    - Account termination (serious violations, permanent ban, no refund)
    - Legal action (criminal reporting to police, HSE, ICO)
    - Professional reporting (GMC, NMC, HCPC)
  - Monitoring and enforcement policy
    - Automated detection systems
    - Human review for flagged accounts
    - Privacy-compliant monitoring per UK GDPR
  - Clear guidance for users (contact legal@sitemedic.co.uk if unsure)

#### **Accessibility Statement** (`/accessibility-statement`) ✅ **NEW**
- **WCAG 2.1 Level AA Compliance Statement**
  - Commitment to digital accessibility for people with disabilities
  - Accessibility features documented:
    - Keyboard navigation (skip links, no keyboard traps, visible focus)
    - Screen reader support (semantic HTML, ARIA labels, alt text)
    - Visual accessibility (high contrast, resizable text, clear fonts)
    - Mobile accessibility (responsive design, 44x44px touch targets)
  - Compatible assistive technologies listed:
    - Screen readers: JAWS, NVDA, VoiceOver, TalkBack
    - Screen magnification: ZoomText, Windows Magnifier, macOS Zoom
    - Speech recognition: Dragon NaturallySpeaking, Voice Control
  - Known limitations documented (third-party content, PDF accessibility)
  - Feedback and contact information for accessibility issues
  - Alternative access methods:
    - Phone support for assistance
    - Email support for accessible formats
    - Alternative document formats (large print, audio, Braille, accessible PDF)
  - Technical specifications (HTML5, WAI-ARIA, CSS3, JavaScript ES6+)
  - Assessment methodology (self-evaluation, automated testing, manual testing, user testing)
  - Latest assessment: 15 February 2026, WCAG 2.1 AA compliant
  - Escalation to Equality and Human Rights Commission (EHRC) if unsatisfied
  - Review schedule: Every 6 months (next review: August 2026)

#### **Footer Enhancements** ✅
- **Legally Required Company Information** (Electronic Commerce Regulations 2002)
  - Company name: SiteMedic Ltd
  - Company registration number: [Placeholder for actual number]
  - VAT number: [Placeholder for actual number]
  - Registered in England and Wales
  - Registered office address: [Placeholder]
  - Contact email: info@sitemedic.co.uk
  - Contact phone: [Placeholder for actual number]
  - ICO registration number: [Placeholder]
- **Legal & Compliance Links** (Updated with new pages)
  - Privacy Policy (`/privacy-policy`)
  - Cookie Policy (`/cookie-policy`)
  - Terms & Conditions (`/terms-and-conditions`)
  - Refund Policy (`/refund-policy`) **NEW**
  - Complaints (`/complaints`) **NEW**
  - Acceptable Use (`/acceptable-use`) **NEW**
  - Accessibility Statement (`/accessibility-statement`) **NEW**
  - ICO Registration (external link to ico.org.uk)
- **Compliance Badges**
  - UK GDPR Compliant ✓
  - RIDDOR 2013 ✓
  - CDM 2015 ✓
  - ISO 27001 Ready ✓
- **Data Hosting Transparency**
  - Data hosting location: UK (London)
  - PCI DSS compliance: Via Stripe
- **Professional 4-Column Layout**
  - Column 1: Company info and legal details
  - Column 2: Product links
  - Column 3: Legal documentation links (expanded to 7 pages)
  - Column 4: Compliance badges
  - Bottom section: Full registered office address, contact details, technical compliance info

#### **Technical Implementation**
- **Client-Side Consent Management**
  - localStorage for persistent consent storage (no server-side tracking)
  - Consent preferences object: `{ necessary: true, analytics: boolean, marketing: boolean }`
  - Consent date tracking: ISO 8601 format for audit purposes
  - Consent expiry: 12 months (re-prompt after expiry)
- **Component Architecture**
  - `CookieConsent.tsx`: Main banner + preferences modal
  - `SkipToContent.tsx`: Accessibility skip link
  - Both components added to root layout (`layout.tsx`)
- **Styling**
  - Tailwind CSS utility classes for rapid development
  - Responsive design (mobile-first breakpoints)
  - High contrast colors for readability
  - Focus states with ring utilities
- **Legal Page Structure**
  - Consistent navigation header with back-to-home link
  - Full-width content container (max-w-4xl)
  - Semantic HTML headings (h1, h2, h3)
  - Footer navigation to other legal pages
  - Professional typography with prose classes

#### **Compliance Coverage**
- ✅ UK GDPR (General Data Protection Regulation)
- ✅ Data Protection Act 2018
- ✅ PECR (Privacy and Electronic Communications Regulations)
- ✅ Electronic Commerce Regulations 2002 (company info display)
- ✅ Consumer Rights Act 2015 (refund policy)
- ✅ Late Payment of Commercial Debts (Interest) Act 1998
- ✅ WCAG 2.1 Level AA (Web Content Accessibility Guidelines)
- ✅ ICO (Information Commissioner's Office) requirements
- ✅ RIDDOR 2013 (data retention and reporting responsibilities)

#### **Outstanding Items**
**⚠️ Code Placeholders to Update:**
- [ ] Insert actual company registration number (placeholder: [Insert Registration Number])
- [ ] Insert actual VAT number (placeholder: [Insert VAT Number])
- [ ] Insert actual registered office address (placeholder: [Insert Registered Office Address])
- [ ] Insert actual ICO registration number (placeholder: [Insert ICO Registration Number])
- [ ] Insert actual contact phone number (placeholder: +44 (0) XXXX XXXXXX)
- [ ] Implement analytics script initialization (Google Analytics) when consent granted
- [ ] Implement marketing pixel initialization (Facebook Pixel) when consent granted
- [ ] Add Google Analytics tracking ID to environment variables
- [ ] Add Facebook Pixel ID to environment variables

**📋 External Compliance Tasks:**
See **`docs/TODO.md`** for comprehensive list of external compliance tasks including:
- 🔴 Critical: Company registration, ICO registration, professional indemnity insurance
- 🟡 Important: VAT registration (when threshold reached), DPO appointment, DPIA
- 🟢 Nice to Have: ISO 27001 certification, Cyber Essentials, ADR membership
- Full checklist with timelines, costs, and next actions for each task

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

## Phase 4.6: Customer Onboarding & Contract Management (NEW)
**Status**: Not started (5 plans)
**Goal**: Automated service agreement generation, document portal for phone sales, flexible payment terms, and digital signatures

### Features:

- **Service Agreement Template Engine**
  - **Auto-Fill Business Information**
    - Client details: Company name, contact, billing address, VAT number
    - Site details: Location, postcode, site manager contact
    - Booking details: Date, time, shift duration, medic assigned
    - Pricing breakdown: Base rate, hours, urgency premium, travel, VAT, total
    - Payment terms: Auto-populated based on client type and admin selection

  - **Payment Terms Configuration Per Booking**
    - **Full Prepay**: 100% payment due on contract signature
    - **Split Payment (50/50)**: 50% on signature, 50% on completion
    - **Split with Net 30**: 50% on signature, 50% Net 30 after completion
    - **Full Net 30**: 100% due 30 days after invoice (established clients only)
    - **Custom Terms**: Admin can define custom payment schedules
      - Example: "£500 on signing, £300 after 7 days, £200 on completion"

  - **Agreement Customization**
    - Standard terms and conditions
    - Liability clauses (professional indemnity limits)
    - Cancellation policy (7 days = full refund, <72 hours = no refund)
    - Service scope definition (medic qualifications, duties, exclusions)
    - RIDDOR compliance responsibilities
    - GDPR worker data handling consent
    - Insurance coverage details (£5M professional indemnity, £10M public liability)
    - Force majeure provisions

  - **Template Versioning**
    - Version control for agreement templates
    - Track template changes over time
    - Legal approval workflow for template updates
    - Grandfathering: Old bookings use old template version
    - Audit trail: Which version used for which client

- **Document Portal (Phone Sales)**
  - **Quick Send During Phone Call**
    - Admin enters client email in portal
    - Click "Send Agreement" → instant email delivery
    - Shareable link generated (no login required for client)
    - Link expires after 30 days (security)

  - **Client Document Viewing**
    - Browser-based document viewer (no download required)
    - Mobile-responsive (works on phone, tablet, desktop)
    - High-resolution rendering
    - Zoom/pan capabilities
    - Page navigation

  - **Document Tracking**
    - Status indicators:
      - **Draft**: Agreement created but not sent
      - **Sent**: Email delivered to client
      - **Viewed**: Client opened document link
      - **Signed**: Client completed digital signature
      - **Completed**: Agreement fully executed (both parties signed)
      - **Expired**: Link expired before signature (re-send required)
    - Timestamp tracking for each status change
    - Email open tracking (when client first views)
    - IP address logging for signature (audit trail)
    - Device info capture (mobile vs desktop signature)

  - **Admin Dashboard for Sent Documents**
    - List view: All sent agreements with status filters
    - Search by: Client name, booking ID, date sent, status
    - Quick actions: Resend, Cancel, Download signed PDF
    - Reminder emails: Auto-send if not signed after 3 days
    - Expiry alerts: Warning at 7 days before link expiry

- **Digital Signature Capture**
  - **Native Signing (No Third-Party)**
    - Built-in signature pad (canvas-based)
    - Touch/stylus support for tablets and phones
    - Mouse support for desktop
    - Signature preview before confirming
    - Option to clear and re-sign
    - Typed name alternative (checkbox: "I agree to use typed name as signature")

  - **Signature Validation**
    - Required fields before signing:
      - Full name (match company contact name)
      - Job title
      - Date (auto-filled, can be manually adjusted)
      - Checkbox: "I have authority to bind [Company Name] to this agreement"
    - Email verification: Send 6-digit code to email, enter before signing
    - IP address capture (logged for audit)
    - Device fingerprint (browser, OS, screen resolution)

  - **Signed Document Storage**
    - PDF generation with signature overlay
    - Stored in Supabase Storage (UK region)
    - Signed URL for secure access (7-day expiry, can renew)
    - Watermark: "SIGNED - [Date] - [Client Name]"
    - Tamper detection: PDF hash verification

  - **Audit Trail**
    - JSON log stored alongside PDF:
      - Who signed (name, email, job title)
      - When signed (ISO 8601 timestamp with timezone)
      - Where signed (IP address, geolocation)
      - How signed (signature pad vs typed name)
      - Device used (browser, OS, screen size)
      - Agreement version number
      - Payment terms selected
    - Immutable after signing (blockchain-ready structure)
    - Exportable for legal discovery

  - **Dual Signature Support (Future Enhancement)**
    - Client signs first
    - Admin/medic signs second (company representative)
    - Agreement only valid after both signatures
    - Sequential signing workflow

- **Payment Schedule Enforcement**
  - **Upfront Payment Processing**
    - IF payment terms = "Full Prepay" OR "50% Upfront":
      - Generate Stripe Payment Intent on signature
      - Charge card immediately after signature
      - Booking status = "Pending Payment"
      - Booking auto-confirms on payment success
    - Payment failure handling:
      - Email notification to client with retry link
      - Booking status = "Payment Failed"
      - Admin alert for manual follow-up
      - Automatic cancellation after 48 hours if unpaid

  - **Completion Payment Trigger**
    - Booking status changes to "Completed" (medic logs shift end)
    - IF payment terms include completion payment:
      - **Option A (Immediate)**: Charge card for remaining 50%
      - **Option B (Net 30)**: Generate invoice, send email, due in 30 days
    - Completion payment tracking in dashboard
    - Late payment reminders (7, 14, 21 days)

  - **Custom Payment Schedule Tracking**
    - For custom terms (e.g., "3 installments over 6 weeks"):
      - Payment milestones table (payment_schedules)
      - Scheduled charges (Stripe Scheduled Payments)
      - Email reminders before each charge
      - Failed payment retry logic (3 attempts over 1 week)
      - Dashboard shows upcoming payment dates

  - **Cancellation & Refund Logic**
    - IF client cancels after signing but before shift:
      - 7+ days before: Full refund minus processing fee (2%)
      - 3-6 days before: 50% refund (cancellation penalty)
      - <72 hours: No refund (medic already reserved)
    - Refund processing via Stripe Refunds API
    - Email notification of refund amount and reason
    - Booking status updated to "Cancelled - Refunded"

- **Booking-Contract Linkage**
  - **Agreement Required for Booking Confirmation**
    - Setting: "Require signed agreement" (toggle per client or globally)
    - IF enabled: Booking status = "Pending Agreement"
    - Client cannot change booking details after agreement sent
    - Agreement lock prevents price changes after signature

  - **Agreement as Source of Truth**
    - Payment terms in agreement override booking defaults
    - Pricing in agreement must match booking (validation check)
    - Cancellation policy from agreement enforced
    - Service scope defines medic qualifications required

  - **Booking Modification After Signature**
    - IF client requests change (date, time, duration):
      - Requires agreement amendment (new signature)
      - Original agreement marked "Superseded"
      - New agreement references original (version history)
      - Email notification: "Your booking agreement has been updated"

- **Admin Document Management**
  - **Template Library**
    - Standard service agreement template
    - Emergency booking template (expedited terms)
    - Recurring booking template (weekly/monthly)
    - Enterprise client template (custom SLA)
    - Template preview before sending

  - **Bulk Document Operations**
    - Batch send agreements (select multiple pending bookings)
    - Bulk download signed agreements (ZIP archive)
    - Bulk reminder emails (all unsigned agreements >3 days old)

  - **Compliance & Legal Review**
    - Template approval workflow (legal team review)
    - Regulatory compliance checklist (GDPR, Consumer Rights Act)
    - Professional indemnity insurance verification
    - Annual legal review reminder (template updates)

  - **Reporting & Analytics**
    - Conversion rate: Sent → Signed (target: >80%)
    - Average time to signature (target: <24 hours)
    - Expired agreements (need follow-up)
    - Most common cancellation reasons
    - Payment failure rate by payment terms

### Performance Targets:
| Metric | Target |
|--------|--------|
| Agreement generation | <5 seconds |
| Email delivery | <30 seconds |
| Document load time | <2 seconds |
| Signature submission | <3 seconds |
| Payment processing | <10 seconds |
| Conversion rate (sent → signed) | >80% |
| Average time to signature | <24 hours |

### Technical Implementation:
- **Frontend**: React + shadcn/ui signature pad component
- **Backend**: Supabase Edge Function for PDF generation
- **PDF Library**: jsPDF or PDFKit for agreement rendering
- **Signature Rendering**: HTML5 Canvas → PNG → PDF overlay
- **Email**: Transactional email via Supabase (SendGrid backend)
- **Storage**: Supabase Storage (UK region, signed URLs)
- **Payments**: Stripe Payment Intents API with metadata linking to agreement
- **Audit Logging**: PostgreSQL JSONB column for signature event log

### Integration Points:
- **Booking System (Phase 4.5)**: Agreement required before booking confirmation
- **Payment Processing (Phase 6.5)**: Payment schedule enforcement tied to agreement terms
- **Admin Dashboard (Phase 5.5)**: Document management tab for tracking sent agreements
- **Client Dashboard (Future)**: Self-service agreement viewing and re-download

### Compliance Considerations:
- **Electronic Signatures Act 2000 (UK)**: Digital signatures legally binding
- **Consumer Rights Act 2015**: 14-day cooling-off period for online contracts
- **Late Payment of Commercial Debts Act 1998**: Statutory late fees for Net 30 invoices
- **GDPR**: Worker health data consent clause in agreement
- **Professional Indemnity Insurance**: Coverage limits disclosed in agreement
- **RIDDOR Responsibilities**: Client's obligations for incident reporting clearly stated

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

**Document Version**: 1.1
**Last Updated**: 2026-02-15 (Added Phase 4.6: Customer Onboarding & Contract Management)
**Next Review**: After Phase 1.5 completion

---

*This document is maintained by the SiteMedic product team. For questions or suggestions, contact the project lead.*
