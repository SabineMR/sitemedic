# Domain Pitfalls: Adding an RFQ Marketplace (MedBid) to an Existing Medic Staffing Platform

**Domain:** UK event medical cover marketplace -- RFQ/bidding system layered onto an existing multi-tenant staffing SaaS
**Researched:** 2026-02-19
**Overall confidence:** HIGH -- findings grounded in direct codebase inspection of existing SiteMedic v3.0 schema, cross-referenced with Stripe Connect documentation, UK CQC regulations, GDPR guidance, and marketplace design research
**Mode:** Pitfalls dimension (focused)

---

## How to Read This File

This file documents pitfalls specific to **adding a marketplace/bidding layer to an existing platform** -- not building a marketplace from scratch. The existing system has live Stripe Connect accounts, live RLS policies scoped by `org_id`, live booking flows with pricing calculations, and a single-org-at-a-time tenancy model. Every pitfall below accounts for what already exists.

Each entry is structured as:

- **What goes wrong** -- the failure mode
- **Evidence in this codebase** -- what was found during code inspection
- **Warning signs** -- how to detect this early
- **Prevention strategy** -- concrete, actionable steps
- **Phase to address** -- when in the roadmap this must be resolved
- **Severity** -- Critical (blocks launch, causes financial loss, or regulatory violation) / High (degrades UX noticeably, creates exploits) / Medium (annoying but recoverable)

---

## Critical Pitfalls

Mistakes that block launch, cause financial loss, create regulatory violations, or make the marketplace fundamentally untrustworthy.

---

### Pitfall 1: Race Condition on RFQ Award -- Two Event Organisers Award the Same Medic Simultaneously

**Severity:** CRITICAL

**What goes wrong:**
A medic submits quotes on two different RFQs that overlap in time (e.g., Saturday 10:00-18:00 for Event A, Saturday 08:00-16:00 for Event B). Both event organisers click "Award" at nearly the same time. Without concurrency protection, both awards succeed, creating a double-booking. The medic now has two confirmed gigs on the same date with overlapping hours. One event organiser will be stood up on event day.

This is not a theoretical concern. The existing `bookings` table has no UNIQUE constraint preventing overlapping `shift_date` + `shift_start_time` + `shift_end_time` for the same `medic_id`. The current system does not need one because medics are assigned by an admin who checks availability manually. In a marketplace where multiple event organisers award independently and concurrently, manual checking is impossible.

The race condition occurs at the database level: two concurrent `INSERT INTO bookings` or `UPDATE rfq_quotes SET status = 'awarded'` transactions both read the medic's calendar as "available" before either commits, then both commit, and the medic is double-booked.

**Evidence in this codebase:**
- `supabase/migrations/002_business_operations.sql` lines 153-223: The `bookings` table has no constraint preventing overlapping shifts for the same `medic_id`. The only constraint on time is `positive_hours` and `minimum_8_hours`.
- `web/lib/booking/calendar.ts` exists but is a client-side calendar display utility -- it does not enforce availability at the database level.
- The `medics` table has `available_for_work BOOLEAN` (a global toggle) but no per-date/per-shift availability tracking.

**Warning signs:**
- A medic appears in "confirmed" status for two overlapping events
- A medic contacts support saying they were awarded two gigs on the same day
- An event organiser complains that their awarded medic did not show up (because they went to the other event)
- During load testing, concurrent award requests both return 200 OK

**Prevention strategy:**
1. Create a `medic_availability` or `medic_commitments` table that tracks confirmed time blocks per medic. Use an EXCLUSION constraint with `tstzrange` (PostgreSQL range type) to make overlapping commitments impossible at the database level:
   ```sql
   ALTER TABLE medic_commitments ADD CONSTRAINT no_overlap
     EXCLUDE USING gist (medic_id WITH =, tstzrange(start_time, end_time) WITH &&);
   ```
   This is a database-level guarantee -- no application code can bypass it.
2. The "Award" action must be wrapped in a transaction that: (a) acquires a `SELECT ... FOR UPDATE` lock on the medic's relevant commitments, (b) checks for overlapping time ranges, (c) inserts the new commitment, (d) updates the RFQ quote status to 'awarded'. If the overlap check fails, the transaction rolls back and the event organiser sees "This medic is no longer available for this time slot."
3. When a medic submits a quote, do NOT check availability at quote time (medics should be able to quote on multiple overlapping RFQs). Check availability at AWARD time only. This gives medics maximum quoting flexibility while preventing double-booking at the commitment point.
4. Auto-withdraw all other overlapping quotes from the same medic when one is awarded. If Medic A quotes on Event X (Saturday 10:00-18:00) and Event Y (Saturday 12:00-20:00), and Event X awards Medic A, auto-withdraw Medic A's quote from Event Y and notify Event Y's organiser: "A quoted medic is no longer available."

**Phase to address:**
Core marketplace schema phase -- the EXCLUSION constraint and commitment tracking must exist before the first award can happen. This is the single most important concurrency safeguard for the entire marketplace.

---

### Pitfall 2: Deposit Payment Collected But Remainder Never Charged -- Money Leaks on Service Completion

**Severity:** CRITICAL

**What goes wrong:**
The MedBid design uses deposit + remainder (not full escrow). The event organiser pays a deposit when awarding a quote, and the remainder is charged after the event is completed. The failure modes are:

1. **Remainder charge fails silently.** The card that paid the deposit 3 weeks ago has been cancelled, the card expired between deposit and event day, or the card has insufficient funds. The event organiser enjoyed the medical cover but the remainder payment bounces. The medic expects full payment. The platform is stuck: the medic provided the service, the event organiser's card fails, and the deposit alone does not cover the medic's payout.

2. **Remainder is never triggered.** If the "event completed" step requires manual action (event organiser confirms completion, or medic submits a timesheet), and neither party does it, the remainder charge is never initiated. The booking sits in a "completed but not settled" limbo indefinitely.

3. **Deposit percentage is wrong for the service value.** A 20% deposit on a GBP 500 booking is GBP 100. If the medic's payout is 80% of GBP 500 = GBP 400, and the remainder charge fails, the platform has GBP 100 from the deposit but owes the medic GBP 400. The platform is GBP 300 in the red on this booking. The deposit must be large enough to cover the medic's minimum payout if the remainder fails.

**Evidence in this codebase:**
- The existing payment flow (`web/app/api/stripe/webhooks/route.ts`) uses a single `payment_intent` per booking. There is no concept of split payments (deposit + remainder) in the current system. The `payments` table (migration 002) has one `amount` field per payment, not a `deposit_amount` + `remainder_amount` split.
- The existing pricing calculation (`web/lib/booking/pricing.ts`) produces a single `total` value. There is no `deposit` or `remainder` calculation.
- The `bookings` table has `status` values: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`. There is no `deposit_paid` or `remainder_due` status.

**Warning signs:**
- A booking shows "completed" in the medic's dashboard but no remainder payment was collected
- The `payments` table shows only the deposit amount for a completed booking
- Stripe dashboard shows a failed payment intent for the remainder but no alert was sent
- A medic submits a timesheet but their payout is only the deposit portion
- Monthly reconciliation shows platform balance is negative on certain bookings

**Prevention strategy:**
1. Use Stripe Connect's **separate charges and transfers** pattern. Charge the deposit as PaymentIntent 1 (at award time). Hold the deposit in the platform balance -- do NOT transfer to the medic yet. Charge the remainder as PaymentIntent 2 (on event completion). Only after both are collected, calculate the commission split and initiate the transfer to the medic's Express account.
2. Save the event organiser's payment method at deposit time using Stripe `setup_future_usage: 'off_session'` on the deposit PaymentIntent. This creates a reusable `PaymentMethod` that can charge the remainder automatically without requiring the customer to be present. Source: [Stripe docs on saving payment methods](https://docs.stripe.com/payments/save-during-payment).
3. Set the deposit percentage to at least cover the medic's payout. If the platform commission is 20% (medic gets 80%), and the remainder fails, the platform must not be in the red. A 50% deposit means the platform holds GBP 250 on a GBP 500 booking -- enough to cover the medic's GBP 400 payout minus the GBP 250 already held (platform is GBP 150 short). A safer deposit is 60-70%. Alternatively, use a model where the deposit covers the medic's payout and the remainder covers the platform's commission -- this eliminates platform risk.
4. Implement an auto-charge cron job: 24 hours after the event's `shift_end_time`, automatically attempt to charge the remainder. If the charge fails, retry at 48 hours and 72 hours with escalating email notifications to the event organiser. After 3 failures, flag the booking for manual collection and hold any future RFQ postings from this organiser.
5. Add explicit booking statuses for the payment lifecycle: `deposit_paid`, `in_progress`, `completed_pending_payment`, `fully_paid`. The `completed` status should only be reachable after `fully_paid`.

**Phase to address:**
Payment architecture phase -- the deposit/remainder flow must be designed and tested with real Stripe test-mode PaymentIntents before any marketplace booking can be awarded. This touches both the existing `payments` table schema and the new marketplace tables.

---

### Pitfall 3: Existing Booking System Collision -- Marketplace Bookings vs. Direct Bookings in the Same Tables

**Severity:** CRITICAL

**What goes wrong:**
MedBid creates bookings in the existing SiteMedic `bookings` table when a quote is awarded. The existing system already creates bookings through the admin dashboard (direct booking flow). If both flows write to the same table without a clear discriminator:

1. **Pricing model collision.** Existing bookings use the `calculateBookingPrice()` function with `base_rate * shift_hours` + urgency premium + travel surcharge (fixed-price model set by the org admin). Marketplace bookings use the medic's quoted price (variable, set by the medic). If the booking record does not clearly identify which pricing model was used, reports, invoices, and payout calculations will apply the wrong formula.

2. **RLS policy collision.** Existing bookings are scoped by `org_id` (the staffing org that created the booking). Marketplace bookings have a different ownership model: the event organiser (who may not belong to any existing org) posts the RFQ, multiple medics from different orgs (or independent medics with no org) quote, and the booking belongs to a marketplace transaction, not to a staffing org. If the `org_id` column is required and NOT NULL on `bookings`, marketplace bookings cannot be inserted without an `org_id` -- but they do not belong to any staffing org.

3. **Status flow collision.** Existing bookings follow: `pending -> confirmed -> in_progress -> completed -> cancelled`. Marketplace bookings need: `rfq_open -> quoting -> awarded -> deposit_paid -> in_progress -> completed -> fully_paid`. Mixing these status enums in one CHECK constraint creates confusion and makes queries unreliable ("give me all active marketplace bookings" requires understanding both status flows).

**Evidence in this codebase:**
- `supabase/migrations/002_business_operations.sql` defines `bookings` with `client_id UUID NOT NULL REFERENCES clients(id)`. Marketplace event organisers are not `clients` in the existing schema -- `clients` are "Construction company accounts" (see line 38 comment). The marketplace introduces a different entity: event organisers requesting medical cover.
- The `bookings.status` CHECK constraint allows only `('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')`. None of these map to the RFQ lifecycle.
- `bookings.base_rate`, `urgency_premium_percent`, `travel_surcharge` are all NOT NULL in the schema. A marketplace booking where the medic quotes a flat rate has no meaningful `base_rate` or `urgency_premium_percent`.
- Migration 026 adds `org_id` columns. If `bookings.org_id` is NOT NULL, marketplace bookings with independent medics and standalone event organisers cannot be stored.

**Warning signs:**
- A migration tries to alter the `bookings.status` CHECK constraint to add marketplace statuses, breaking existing booking queries that filter by status
- An API route for existing bookings shows marketplace bookings in the admin dashboard
- Invoice generation fails because a marketplace booking has no `urgency_premium_percent` and the formula divides by zero or produces nonsensical output
- RLS policies fail for marketplace bookings because they have no `org_id`

**Prevention strategy:**
1. Create a separate `rfq_bookings` (or `marketplace_bookings`) table for marketplace transactions. Do NOT reuse the existing `bookings` table for marketplace bookings. The two flows have fundamentally different ownership models, pricing models, status lifecycles, and RLS requirements.
2. When a marketplace quote is awarded and the medic confirms, create a record in BOTH the marketplace table (for marketplace tracking) AND the existing `bookings` table (for the medic's scheduling, timesheet, and payout workflows). The marketplace record is the source of truth for the marketplace lifecycle. The booking record is a downstream effect, created with `source = 'marketplace'` and a `marketplace_booking_id` FK for traceability.
3. Use a `source` discriminator column on the existing `bookings` table: `source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'marketplace'))`. This allows existing queries to filter `WHERE source = 'direct'` and remain unaffected by marketplace bookings.
4. For marketplace bookings inserted into the `bookings` table, set `base_rate` to the medic's quoted hourly rate, set `urgency_premium_percent = 0` (the quote already factors in urgency), and set `travel_surcharge = 0` (included in the quote). This makes the existing pricing calculation produce the correct total without modifying the formula.

**Phase to address:**
Core marketplace schema phase -- the table architecture decision (separate table vs. discriminator column) must be made before any marketplace booking can be created. This decision affects every subsequent phase.

---

### Pitfall 4: Medic Identity Leaks Before Quote Submission -- Destroys Anti-Disintermediation Design

**Severity:** CRITICAL

**What goes wrong:**
The core anti-disintermediation strategy is: medic profiles are hidden until they submit a quote. Event organisers cannot browse medic profiles, find qualified medics, and contact them directly to bypass the platform. This only works if the profile is genuinely hidden across every surface.

Leaks occur through:

1. **Quote metadata reveals identity.** If the quote object returned to the event organiser includes `medic_id`, `medic_name`, or a profile picture, the anonymity is broken. Even a UUID-based medic_id can be used to query other endpoints if RLS policies do not enforce the "hidden until quoted" rule.

2. **Supabase Realtime subscriptions leak data.** If the event organiser subscribes to a Realtime channel for "new quotes on my RFQ," and the payload includes `medic_id` or any identifying information, the organiser can cross-reference the medic_id against public search or previous interactions.

3. **Notification emails leak identity.** "Medic John Smith has quoted on your RFQ" defeats the purpose. The email should say "A qualified paramedic has quoted on your RFQ."

4. **Search and SEO indexing.** If medic profile pages are server-rendered and crawlable, Google indexes them. An event organiser who sees a quote can Google the medic's name and find their profile page with contact details, LinkedIn, etc.

5. **Company account context.** If a medic belongs to a company (Company X Medical Services), and the company name appears on the quote, the event organiser can contact Company X directly for future events, bypassing the platform permanently.

**Evidence in this codebase:**
- The `medics` table (migration 002) contains `first_name`, `last_name`, `email`, `phone`, `home_address`, `home_postcode`. All of these are PII that must not be exposed to event organisers before the appropriate lifecycle stage.
- There are no RLS policies that conditionally restrict medic data based on quote/award status. Current RLS is org-scoped (`get_user_org_id()`), not marketplace-relationship-scoped.
- The existing email templates include medic names in booking confirmations (`web/lib/email/templates/`).

**Warning signs:**
- A quote response includes `medic_first_name` in the API payload
- The event organiser's dashboard shows a medic profile link before award
- A Google search for a medic's name returns a SiteMedic profile page
- An email notification includes the medic's company name
- Browser DevTools network tab shows full medic object in a quote fetch

**Prevention strategy:**
1. Create a strict data projection layer: quotes returned to event organisers include ONLY: `quote_id`, `amount`, `medic_classification` (e.g., "Paramedic"), `years_experience`, `star_rating`, `total_events_completed`, and a `bio_excerpt` (a sanitised, self-authored summary that the medic controls). NO name, email, phone, company name, or medic_id.
2. Use a `display_id` (a random short code like `MED-7K3J`) instead of the actual `medic_id` UUID in all client-facing payloads. The mapping from `display_id` to real `medic_id` exists only server-side.
3. RLS policy on `medics` table: event organisers can only see full medic profiles for bookings where `status = 'awarded'` AND the event organiser is the RFQ poster. Implement this via a view or a Supabase function, not by exposing the `medics` table directly.
4. Medic profile pages (if they exist for SEO) must use `noindex` meta tags OR be gated behind authentication. Better: do not create public medic profile pages at all in the initial marketplace launch.
5. All notification templates for marketplace interactions must use the anonymised display: "A Paramedic with 5+ years experience" not "John Smith from MedCorp Ltd."
6. Company names are NEVER shown on quotes. The company affiliation is an internal data point for the medic's own account management, not for the event organiser.

**Phase to address:**
Quote submission phase -- the data projection layer must be the FIRST thing built, before any quote can be displayed to an event organiser. A single data leak in the first version permanently trains event organisers to expect direct contact.

---

### Pitfall 5: Chicken-and-Egg Launch Failure -- No Medics Quote Because No Events, No Events Because No Medics

**Severity:** CRITICAL

**What goes wrong:**
MedBid is a two-sided marketplace. Event organisers will not post RFQs if no medics are available to quote. Medics will not sign up and create profiles if no RFQs are posted. This cold start problem kills more marketplaces than any technical bug.

The specific MedBid variant is:
- **Supply side (medics):** The existing SiteMedic system already has medics in the `medics` table. These are the seed supply. But they are employed/contracted by specific staffing orgs. They may not be willing or allowed to quote independently on marketplace RFQs -- their org may forbid moonlighting or require all work to go through the org.
- **Demand side (event organisers):** These are a new user type. They do not exist in the current system. They must be acquired from scratch.
- **Geographic constraint:** UK event medical cover is location-specific. An event in Manchester does not benefit from a medic pool in London. The marketplace must have supply AND demand in the same geographic area to produce a single successful match.

**Evidence in this codebase:**
- The `medics` table (migration 002) contains medics with `home_postcode` for location-based matching. These are existing medics tied to organisations via `org_id`.
- The `profiles` table uses `role` which includes `medic`, `org_admin`, `site_manager`, `platform_admin`. There is no `event_organiser` role.
- The `clients` table represents construction companies with ongoing staffing needs -- not one-off event organisers.

**Warning signs:**
- After launch, RFQs sit for days with zero quotes
- Medics sign up but see no RFQs in their area and churn within a week
- Event organisers post RFQs, receive no quotes, and never return
- The platform has medics in London but demand in Birmingham, creating geographic liquidity failure

**Prevention strategy:**
1. **Seed supply from existing medic pool.** Before launching the marketplace, identify medics in the existing SiteMedic system who are freelance (not org-exclusive) and willing to take marketplace gigs. Offer them a "marketplace opt-in" that creates a marketplace profile from their existing medic record. This gives immediate supply without requiring new medic acquisition.
2. **Narrow geographic launch.** Launch in ONE metro area (e.g., London, where existing SiteMedic likely has the most medic density). Only accept RFQs for events in that area. Expand to the next area only after achieving liquidity (define: at least 3 quotes per RFQ within 24 hours).
3. **Platform-guaranteed fallback.** For early marketplace RFQs that receive fewer than 2 quotes within 48 hours, SiteMedic itself acts as a supplier: the platform admin manually assigns an available medic from the existing pool and submits a platform quote. The event organiser sees a quote and gets a successful first experience. The platform absorbs the cost of manual matching. This is "do things that don't scale" and is critical for the first 6 months.
4. **Provide single-user utility to event organisers.** The RFQ posting form itself should be valuable even without quotes: it generates a compliant event medical plan document (the SAG-friendly format UK event organisers need). "Come for the medical plan, stay for the marketplace." This gives event organisers a reason to engage before the marketplace has liquidity.
5. **Do not launch both sides simultaneously.** Seed medics FIRST (2-4 weeks of onboarding), THEN open RFQ posting to event organisers. Never the reverse.

**Phase to address:**
Pre-launch and launch strategy phase -- this is not a code pitfall but a business-critical sequencing decision. The code must support the fallback (platform-submitted quotes) and the geographic filtering (postcode-based RFQ routing to nearby medics).

---

### Pitfall 6: UK CQC Registration Requirements -- Platform May Be Operating Illegally as an Unregistered Healthcare Provider

**Severity:** CRITICAL (regulatory)

**What goes wrong:**
Under the Health and Social Care Act 2008, any organisation that arranges the provision of treatment of disease, disorder or injury must be registered with the Care Quality Commission (CQC). First aid at events was historically exempt, but the CQC scope is being expanded. If MedBid's marketplace matches paramedics (who administer drugs, make clinical judgements, or transport patients) to events, the platform may be acting as an unregistered healthcare service provider.

The distinction matters:
- **First aiders** providing basic first aid (plasters, ice packs, minor wound care) at events: typically exempt from CQC registration.
- **Paramedics, EMTs, nurses, doctors** who administer drugs, make clinical assessments, or transport patients in ambulances: their employing/deploying organisation must be CQC registered.
- **The platform as intermediary:** If MedBid is merely a marketplace that introduces event organisers to independent medics, CQC registration may not be required. But if MedBid controls pricing, dictates service standards, or takes commission on regulated healthcare activities, the CQC may classify MedBid as a "service provider" that must register.

The penalty for operating without CQC registration is prosecution, fines, and reputational damage.

**Evidence in this codebase:**
- Migration 122 (`122_cqc_registration.sql`) exists, indicating CQC registration is already a known concern in the existing system.
- The `medics` table has `classification` types including `paramedic`, `specialist_paramedic`, `critical_care_paramedic`, `registered_nurse`, `doctor` -- all of which are CQC-relevant regulated roles.
- The `MedicClassification` type in `web/lib/booking/types.ts` explicitly lists regulated healthcare professionals.

**Warning signs:**
- A CQC inspector contacts SiteMedic asking for registration details
- An event organiser asks "Are your medics CQC registered?" and there is no clear answer
- A medic listed on the marketplace provides a regulated treatment and the event organiser's insurer queries the CQC status
- A competitor reports SiteMedic to the CQC as an unregistered provider

**Prevention strategy:**
1. Obtain legal counsel from a UK health regulation solicitor BEFORE marketplace launch. The question is binary: does the marketplace model require CQC registration or not? If yes, register. If no, document the legal basis for the exemption.
2. Structure the marketplace explicitly as an introduction service, not a managed service. The medic is an independent contractor who sets their own price, brings their own equipment, and operates under their own CQC registration (if they are a registered paramedic service). The platform facilitates the connection but does not manage the clinical service.
3. For medics with `classification` in `('paramedic', 'specialist_paramedic', 'critical_care_paramedic', 'registered_nurse', 'doctor')`, require proof of either: (a) their own CQC registration, or (b) employment by a CQC-registered organisation, during marketplace onboarding. Store the CQC registration number and verify it against the CQC public register API.
4. For company accounts on the marketplace, require CQC registration number as a mandatory field if the company provides regulated healthcare services. Verify against the CQC API: `https://api.cqc.org.uk/public/v1/providers/{registration_id}`.
5. Display CQC registration status on marketplace profiles (after award, not during quoting) so event organisers know they are hiring a regulated provider.
6. First aiders (classification `first_aider`, `eca`, `efr`) do not require CQC registration for event first aid. Make this distinction clear in the UI to avoid over-registration or under-registration.

**Phase to address:**
Legal and compliance phase -- BEFORE marketplace launch. No amount of code can fix operating without required registration. This is a blocking prerequisite.

---

### Pitfall 7: HCPC Verification Gap -- Marketplace Allows Unregistered "Paramedics" to Quote

**Severity:** CRITICAL (regulatory + trust)

**What goes wrong:**
In the UK, "Paramedic" is a protected title. Only individuals registered with the Health and Care Professions Council (HCPC) may use it. If the marketplace allows anyone to select `classification = 'paramedic'` during signup without verifying their HCPC registration, unqualified individuals can present themselves as paramedics and quote on RFQs requiring paramedic-level cover.

An event organiser selects "Paramedic required" on their RFQ. An unregistered person quotes as a paramedic. The event organiser awards the quote based on the classification. On event day, the "paramedic" cannot administer drugs or make clinical assessments that a real paramedic would. A patient receives inadequate care. The event organiser is liable, and the platform facilitated the mismatch.

In the existing SiteMedic system, medics are vetted by the org admin before being added to the roster. In an open marketplace with self-registration, that human vetting layer is absent.

**Evidence in this codebase:**
- The `medics` table has `classification TEXT` with a CHECK constraint listing medical roles (migration 129). This is a self-declared field -- no verification is enforced at the database level.
- `certifications JSONB DEFAULT '[]'` stores certification data but in a free-form JSON array with no structured verification status.
- Migration 034 (`034_certification_tracking.sql`) exists, indicating certification management is a known concern. But the existing system relies on admin review, not automated verification.

**Warning signs:**
- A marketplace user selects "paramedic" classification but has no HCPC registration number on file
- An event organiser awards a "paramedic" quote and the person who shows up is a first aider
- A complaint is filed with the HCPC about an unregistered person using the protected title

**Prevention strategy:**
1. For any `classification` that maps to an HCPC-regulated role (`paramedic`, `specialist_paramedic`, `critical_care_paramedic`), require the HCPC registration number during marketplace onboarding. Make this a mandatory field, not optional.
2. Verify HCPC registration against the HCPC online register: `https://www.hcpc-uk.org/check-the-register/`. This can be manual (admin reviews) or automated (scrape/API check). At launch, manual verification is acceptable -- the platform admin verifies before the medic's marketplace profile goes live.
3. Add a `verification_status` field to marketplace medic profiles: `unverified`, `pending_review`, `verified`, `rejected`. Only `verified` medics can have their quotes shown to event organisers. `unverified` medics can create profiles and draft quotes, but their quotes are held in a queue until verification completes.
4. For registered nurses, require NMC (Nursing and Midwifery Council) registration number. For doctors, require GMC (General Medical Council) registration number. Each professional body has a public register that can be checked.
5. Display a verification badge on marketplace quotes: "HCPC Verified" or "NMC Verified." This builds trust with event organisers and differentiates the marketplace from competitors that do not verify.
6. Re-verify annually. HCPC registration must be renewed. If a medic's HCPC status lapses, auto-suspend their marketplace profile and notify them to re-verify.

**Phase to address:**
Medic onboarding phase -- verification must be in place before marketplace profiles go live. A single incident of an unregistered person providing care under a protected title creates existential regulatory risk.

---

## High Pitfalls

Mistakes that degrade UX noticeably, create exploitable loopholes, or generate significant support burden.

---

### Pitfall 8: Disintermediation After First Successful Transaction -- Event Organiser Hires Medic Directly Next Time

**Severity:** HIGH

**What goes wrong:**
After the marketplace successfully matches an event organiser with a medic, the organiser sees the medic's full profile (name, qualifications). The medic provides their personal contact details during the event (business card, verbal exchange). For the next event, the organiser contacts the medic directly, bypassing the platform and avoiding the commission.

Research shows that trust built through a successful platform transaction is the single biggest driver of disintermediation. The platform is most vulnerable after the first successful match, not before it. The commission (taken from the medic's side, like Upwork) creates direct financial incentive for the medic to go off-platform: they earn more per gig by cutting out the middleman.

**Evidence in this codebase:**
- The commission model is medic-side: platform takes a percentage from the medic's earnings (confirmed by `platform_fee_percent` on `medics` table, default 60% to platform). This means the medic has a strong financial incentive to transact off-platform.
- Once a booking is awarded and confirmed, the medic's full profile (name, phone, email) must be shared with the event organiser for operational coordination on event day. This is a functional requirement that cannot be avoided.

**Warning signs:**
- A medic's marketplace activity drops sharply after 3-5 successful events
- An event organiser who previously posted RFQs stops posting but still runs events (visible via social media or industry knowledge)
- Revenue from repeat event organisers declines over time (they got what they needed and left)
- Medics complain about commission rates (precursor to going off-platform)

**Prevention strategy:**
1. **Provide ongoing value that cannot be replicated off-platform:**
   - Payment protection: the deposit/remainder system protects both parties. Off-platform, the medic risks non-payment and the organiser risks no-shows.
   - Insurance: platform-provided professional indemnity insurance for marketplace bookings (medics get covered only when they book through the platform).
   - Compliance documentation: auto-generated event medical plans, SAG-compliant risk assessments, RIDDOR incident tracking. These are high-effort documents that the platform provides for free with each booking.
   - Reputation portability: the medic's star rating, completed events count, and verified badges only exist on-platform. Going off-platform means starting from zero reputation.
2. **Reduce the commission pain:**
   - Tiered commission: lower percentage for high-volume medics (like Upwork's 5% above $10K). A medic who completes 20+ events gets a reduced platform fee. This makes staying on-platform more attractive at higher volumes.
   - Or charge the event organiser instead (Airbnb model: service fee on the buyer side). This removes the medic's incentive to go off-platform because their earnings are the same either way.
3. **Communication gating:** During the quoting phase, all communication goes through the platform's messaging system. Contact details are only revealed after award AND deposit payment. This prevents pre-award disintermediation.
4. **Contract clause:** Terms of service include a non-circumvention clause: if an event organiser hires a medic they found through MedBid directly within 12 months, the platform is owed the commission. Enforcement is difficult but the clause deters some circumvention.
5. **Make the first transaction free.** Charge zero commission on the first marketplace booking for new event organisers. This removes friction for the first match and lets the organiser experience the full value before commission applies.

**Phase to address:**
Value proposition phase (ongoing) -- this is not a one-time fix. Anti-disintermediation features should be layered into every phase. The communication gating and contact detail reveal timing must be designed in the quote submission phase.

---

### Pitfall 9: Notification Spam Kills User Engagement -- Medics Disable All Notifications After RFQ Flood

**Severity:** HIGH

**What goes wrong:**
A medic in London has a marketplace profile. 15 event organisers post RFQs for events in the London area in one week. The medic receives 15 "New RFQ matching your profile!" email notifications, 15 push notifications, and 15 dashboard alerts. By the second week, the medic has disabled all notifications and stops checking the marketplace entirely.

Research shows that 3-6 push notifications cause 40% of app users to turn off push notifications entirely. In a bidding marketplace where time-sensitivity matters (first responders get more awards), this notification fatigue directly reduces marketplace liquidity.

The existing notification system (`org_settings.notification_preferences` from migration 137) stores preferences for 5 notification types. The marketplace adds at least 6 new notification types: new RFQ, quote submitted, quote received, award notification, deposit received, event reminder. Without careful design, the notification volume triples.

**Evidence in this codebase:**
- Migration 137 adds `notification_preferences JSONB` to `org_settings` with 5 categories. The marketplace will add 6+ more.
- The existing email infrastructure uses Resend (`web/lib/email/resend.ts`). Each marketplace notification type will need its own template.
- No notification batching, digest, or frequency-limiting infrastructure exists.

**Warning signs:**
- Medics report "too many emails" within the first week of marketplace launch
- Email unsubscribe rates spike above 5%
- Push notification opt-out rates exceed 20% within 30 days
- Medics stop logging into the marketplace despite having active profiles
- RFQs receive fewer quotes over time despite growing medic supply (engagement death spiral)

**Prevention strategy:**
1. **Batch notifications by default.** Instead of instant email per new RFQ, send a twice-daily digest: "5 new RFQs matching your profile in your area." The dashboard shows real-time, but email and SMS are batched.
2. **Smart notification routing:** Only notify medics about RFQs they are likely to quote on, based on: geographic proximity (within 30 miles of home postcode), classification match (RFQ requires paramedic, medic is a paramedic), date availability (medic has no existing commitment on that date). Do NOT blast all medics for all RFQs.
3. **Per-category controls:** Marketplace notifications must have their own toggle in notification preferences, separate from existing booking notifications. Categories: `rfq_digest`, `quote_responses`, `award_notifications`, `payment_updates`, `marketplace_announcements`. Each independently toggleable.
4. **Escalation ladder:** `dashboard only` -> `dashboard + daily digest email` -> `dashboard + individual email + SMS` (only for award notifications and payment confirmations). The default should be the lowest-noise option.
5. **Snooze and mute:** Allow medics to snooze marketplace notifications for 1 day / 1 week / 1 month. Allow muting specific RFQ types (e.g., "I never do motorsport events -- don't notify me about those").
6. **Critical vs. informational:** Award notifications and payment confirmations are critical (always send). New RFQ notifications are informational (send via digest only). Never batch critical notifications.

**Phase to address:**
Notification infrastructure phase -- the batching and routing logic must be designed before the marketplace sends its first notification. Retrofitting notification batching after users have been spammed is too late.

---

### Pitfall 10: Rating Manipulation -- Bidirectional Ratings Create Retaliation Dynamics

**Severity:** HIGH

**What goes wrong:**
MedBid has bidirectional ratings: event organisers rate medics, and medics rate event organisers. The standard failure mode is retaliation: a medic gives the event organiser 3 stars, the organiser sees their own rating drop, figures out which medic gave the low rating, and gives that medic 1 star in retaliation. Both parties are now gaming the system to avoid honest feedback.

Specific marketplace rating pitfalls:
1. **Simultaneous reveal problem.** If both parties can see ratings as soon as they are submitted, the second rater will always adjust their rating based on what the first rater gave. Solution: blind rating (both submit before either sees the other's rating).
2. **Early-marketplace inflation.** With few medics, every medic has 5.0 stars (no one dares give less than 5 because supply is scarce). Ratings become meaningless until sufficient volume exists.
3. **Self-reinforcing winner effect.** A medic with 4.9 stars gets preferentially awarded over a medic with 4.5 stars, earning more events, receiving more 5-star ratings, and widening the gap. New medics with zero ratings cannot compete.
4. **Strategic low-rating of competitors.** If a company account can see which independent medics quoted on the same RFQs, they could strategically low-rate those medics on future events to reduce competition.

**Evidence in this codebase:**
- The `medics` table has `star_rating DECIMAL(3,2) DEFAULT 0.00` (migration 002). This is a single aggregate number with no protection against manipulation.
- No rating/review table exists yet. The rating system will be new to the marketplace.

**Warning signs:**
- Average ratings converge to 4.8+ across all medics (inflation, ratings are meaningless)
- A medic's rating drops sharply after they give an event organiser a low rating (retaliation)
- New medics receive zero quotes because they have 0.0 stars and event organisers sort by rating
- All ratings are 5 stars except retaliatory 1-star ratings (bimodal distribution)

**Prevention strategy:**
1. **Blind rating period.** Both parties have 7 days after event completion to submit their rating. Neither can see the other's rating until both have submitted OR the 7-day window expires. If only one party rates within 7 days, that rating is published and the non-rating party loses their chance to rate.
2. **No 0-star default for new medics.** New medics with zero ratings should show "New" badge instead of 0.0 stars. Do not display a numeric rating until the medic has at least 3 completed events. This prevents the cold start penalty.
3. **Weighted average with recency bias.** Recent ratings count more than old ones. A medic who had a bad event 2 years ago but has been excellent for 50 events since should not be penalised by one ancient bad rating.
4. **Outlier detection.** If a rating is more than 2 standard deviations below a medic's average, flag it for admin review. Do not automatically include it in the aggregate until reviewed. This catches retaliatory 1-star ratings.
5. **Minimum review text for low ratings.** Ratings of 1 or 2 stars require a written explanation. This adds friction to retaliatory low ratings (which are impulsive) while allowing genuine bad-experience feedback (which people are willing to explain).
6. **Do not allow sorting by rating in the quoting phase.** Event organisers see quotes sorted by price, not by rating. Rating is visible but not the primary sort dimension. This reduces the winner-take-all effect.

**Phase to address:**
Rating system phase -- the blind rating mechanism and display rules must be designed before the first rating is submitted. Changing rating rules after ratings exist creates retroactive unfairness.

---

### Pitfall 11: Company Accounts Create Double-Counting and Bid Rigging

**Severity:** HIGH

**What goes wrong:**
MedBid allows company accounts with medic rosters. A company like "MedCorp Ltd" has 10 medics on its roster. When an RFQ is posted:

1. **Multiple-quote gaming.** MedCorp submits 5 quotes (one from each of 5 available medics) on the same RFQ, varying prices slightly. This floods the event organiser's quote list and reduces the chance that an independent medic's quote is visible. The company appears to dominate the marketplace through volume, not quality.

2. **Double-up problem.** Medic A is on MedCorp's roster AND has an independent marketplace profile. MedCorp submits a quote for Medic A on an RFQ. Medic A, unaware, also submits their own independent quote on the same RFQ. The event organiser sees two quotes from the same person at different prices.

3. **Permission confusion.** Who can submit quotes on behalf of a company's medics? If any company admin can submit quotes for any medic on the roster, a medic might be committed to an event they did not agree to. If only the medic themselves can submit, the company admin's role is unclear.

**Evidence in this codebase:**
- Migration 138 (`138_site_manager_company.sql`) adds `company_name` to profiles, indicating company/employer tracking exists. But it is a free-text field with no structured company-account system.
- No concept of "company roster" or "managed medic" exists in the current schema. The marketplace company account system will be entirely new.
- The `medics` table has no `company_id` or `managed_by` field.

**Warning signs:**
- An RFQ receives 8 quotes, 5 of which are from the same company at slightly different prices
- A medic contacts support: "I see my name on a quote I did not submit"
- An event organiser awards a quote to "Medic A via MedCorp" and separately awards an independent quote to "Medic A" for a different event on the same day

**Prevention strategy:**
1. **One quote per RFQ per medic, enforced at the database level.** Use a UNIQUE constraint on `(rfq_id, medic_id)` in the quotes table. Whether the quote comes from the medic directly or via their company, the medic_id is the same and the constraint prevents duplicates.
2. **Company quote limit per RFQ.** A company can submit a maximum of N quotes per RFQ (e.g., 3). This prevents flooding. The limit is configurable by the platform admin.
3. **Medic consent for company-submitted quotes.** When a company admin submits a quote on behalf of a medic, the medic receives a notification and must confirm within 24 hours. If unconfirmed, the quote is auto-withdrawn. This prevents unwanted commitments.
4. **Exclusive vs. non-exclusive roster.** When a medic joins a company roster, they choose: (a) exclusive (all marketplace activity goes through the company -- no independent quotes) or (b) non-exclusive (both company-submitted and independent quotes allowed, but the one-quote-per-RFQ constraint prevents double-counting). Store this as `roster_mode: 'exclusive' | 'non_exclusive'` on the roster membership.
5. **Anonymous quoting removes company-level gaming.** Since event organisers do not see medic identities (Pitfall 4 prevention), they also cannot see company names. Multiple quotes from the same company look like independent quotes to the organiser. The one-quote-per-medic constraint prevents the same person appearing twice. This naturally limits company advantage.

**Phase to address:**
Company accounts phase -- the one-quote-per-medic constraint must be in the quotes table from day one. The consent workflow can be added in a subsequent iteration.

---

### Pitfall 12: GDPR Data Subject Rights Become Exponentially More Complex in a Marketplace

**Severity:** HIGH (regulatory)

**What goes wrong:**
In the existing SiteMedic system, GDPR data subject access requests (DSARs) and deletion requests are straightforward: a medic's data lives in `medics`, `bookings`, `timesheets`, `certifications`. The org admin is the controller. One org, one medic, one data relationship.

In the marketplace, a medic's data is scattered across:
- Their marketplace profile (visible to all event organisers who received their quote)
- Quotes submitted to potentially dozens of RFQs (each from a different event organiser)
- Ratings and reviews from multiple event organisers
- Messages exchanged with multiple event organisers
- Booking records with different event organisers
- Payment records with different event organisers

A DSAR from a marketplace medic now requires gathering data from all these relationships. A deletion request (Article 17 right to erasure) is worse: deleting the medic's profile must also handle their quotes (withdraw? anonymise?), their ratings (delete? aggregate into anonymous statistics?), their messages (delete one side of a conversation?), and their booking records (which the event organiser has a legitimate interest in retaining for tax and insurance purposes).

**Evidence in this codebase:**
- Migration 006 (`00006_gdpr_infrastructure.sql`) sets up GDPR infrastructure (data retention, deletion). This infrastructure exists but is designed for the simpler org-scoped data model.
- Migration 009 (`009_privacy_data_retention.sql`) adds data retention policies. These will need marketplace-specific retention periods.

**Warning signs:**
- A medic requests "delete all my data" and the system cannot enumerate all marketplace relationships
- An event organiser retains a medic's personal data in their own records after the medic deleted their marketplace account
- A DSAR response is incomplete because marketplace quotes and messages were not included

**Prevention strategy:**
1. **Data mapping before launch.** Create a comprehensive data map of every table and column that contains marketplace-related personal data. Document the lawful basis for processing each category (consent, contract, legitimate interest).
2. **Anonymisation over deletion.** When a medic deletes their marketplace account, anonymise their data rather than deleting it where other parties have a legitimate interest:
   - Quotes: replace `medic_id` with NULL, replace any identifying information with "[Deleted User]"
   - Ratings: keep the numerical rating (aggregate statistics) but remove the reviewer's identity
   - Messages: keep the message text (for dispute resolution audit trail) but replace the sender's name with "[Deleted User]"
   - Booking records: retain for tax and insurance purposes (7-year retention under HMRC rules) but anonymise the medic's personal details after the retention period
3. **Right to portability.** Marketplace medics have the right to export their data in a structured format (Article 20). Build a "Download my data" feature that exports: profile data, quote history (amounts, dates, outcomes), rating history, earnings history. This is required by GDPR and also serves as a trust-building feature.
4. **Separate the GDPR deletion job.** The marketplace deletion job is separate from the existing org-scoped deletion job. Run both when a user who has both org and marketplace profiles requests deletion.
5. **Event organiser data is controller data.** The event organiser is a separate data controller for their own event records. When a medic requests deletion from the platform, the platform cannot force event organisers to delete their own records of the medic. Document this clearly in the privacy policy: "We anonymise your data on our platform but cannot control records held by event organisers in their own systems."

**Phase to address:**
GDPR compliance phase -- the data map must be created before marketplace launch. The anonymisation logic must be implemented before the first medic can delete their account.

---

### Pitfall 13: Stripe Connect Onboarding Friction Kills Medic Signup Conversion

**Severity:** HIGH

**What goes wrong:**
Every marketplace medic must have a Stripe Connect Express account to receive payouts. The Stripe Connect onboarding flow requires: legal name, date of birth, last 4 of SSN (or UK equivalent: last 4 of sort code for verification), bank account details, and acceptance of Stripe's terms. This is a multi-step form that takes 5-10 minutes and requires the medic to have their bank details at hand.

In the existing SiteMedic system, Stripe onboarding happens AFTER the medic is already employed -- they are motivated to complete it because they have a confirmed job. In the marketplace, medics are signing up speculatively -- they do not yet have a confirmed gig. Asking them to complete Stripe onboarding during signup creates a massive drop-off point.

**Evidence in this codebase:**
- `medics.stripe_account_id` and `stripe_onboarding_complete` (migration 002) show that Stripe Express onboarding is already part of the medic lifecycle. The `stripe_onboarding_url` column stores the Stripe-hosted onboarding link.
- The existing webhook handler (`web/app/api/stripe/webhooks/route.ts`) handles `account.updated` events to track onboarding completion.

**Warning signs:**
- Medic signup conversion drops below 30% at the Stripe onboarding step
- Medics create marketplace profiles but never complete Stripe onboarding
- Medics quote on RFQs but cannot be paid because they never finished onboarding
- The marketplace has "ghost supply" -- medics with profiles but no payout capability

**Prevention strategy:**
1. **Defer Stripe onboarding.** Allow medics to create a marketplace profile and submit quotes WITHOUT completing Stripe onboarding. Only require Stripe onboarding when the medic is first awarded a quote (i.e., when they actually need to get paid). This maximises signup conversion and supply-side liquidity.
2. **Gating at award, not signup.** When an event organiser awards a quote to a medic who has not completed Stripe onboarding, show the medic: "Complete payout setup to accept this award." Give them 48 hours. If they do not complete Stripe onboarding within 48 hours, auto-decline the award and notify the event organiser to award an alternative quote.
3. **Pre-populate from existing accounts.** If a medic already has a Stripe Express account from the existing SiteMedic system (same `user_id`), reuse it for marketplace payouts. Do not make them onboard a second time. Query `medics.stripe_account_id WHERE user_id = ?` before creating a new account.
4. **Progressive profile completion.** Show a profile completeness indicator: "Profile 60% complete -- add payout details to receive awards." Nudge via dashboard banner, not blocking step.

**Phase to address:**
Medic onboarding phase -- the deferred Stripe onboarding decision affects the signup flow architecture. Must be decided before the first medic signup form is built.

---

## Medium Pitfalls

Mistakes that create annoyance, technical debt, or edge-case failures that are recoverable.

---

### Pitfall 14: RFQ Expiry and Quote Withdrawal Timing Creates Orphaned Deposits

**Severity:** MEDIUM

**What goes wrong:**
An RFQ has a deadline (e.g., quotes accepted until Friday 5PM). After the deadline, the event organiser reviews quotes and awards one. But edge cases create problems:

1. **Medic withdraws quote after event organiser starts payment.** The event organiser clicks "Award" on Quote A, which triggers the deposit payment flow. While the organiser is entering their card details, the medic withdraws Quote A. The deposit PaymentIntent is created for a quote that no longer exists.

2. **RFQ expires while quotes are pending.** The organiser does not award anyone before the deadline. All medics who quoted have reserved time on their calendar (mentally, if not in the system). They need to know the RFQ is dead so they can pursue other opportunities.

3. **Event organiser ghosts.** Posts an RFQ, receives 5 quotes, never responds. Medics wait indefinitely, unsure if they should keep the date available. After 2 weeks of silence, the event has already happened.

**Prevention strategy:**
1. **Firm expiry on RFQs.** RFQs have an award deadline (e.g., 7 days after posting, or X days before the event date, whichever is sooner). After the deadline, if no award is made, all medics are notified: "RFQ expired -- you are free to accept other commitments for this date."
2. **Lock quotes during award flow.** When the event organiser clicks "Award" on a quote, lock that quote for 15 minutes (prevent withdrawal). If the deposit payment completes within 15 minutes, the award is confirmed. If the payment fails or times out, the lock releases and the medic can withdraw.
3. **Auto-close ghost RFQs.** If an RFQ receives quotes but the event organiser does not view them within 5 days, send a reminder. If still no action after 7 days, auto-close the RFQ and notify all quoted medics.
4. **No calendar commitment at quote time.** As stated in Pitfall 1, do not block the medic's calendar when they submit a quote. Only block at award time. This means quote withdrawal is a non-event for calendar management.

**Phase to address:**
RFQ lifecycle phase -- the expiry and locking mechanisms should be part of the initial RFQ state machine.

---

### Pitfall 15: Credits/Points System Creates Perverse Incentives and Accounting Nightmares

**Severity:** MEDIUM

**What goes wrong:**
A credits/points system (planned for later phases) introduces virtual currency. Common pitfalls:

1. **Credit inflation.** If credits are given too freely (signup bonus, referral bonus, promotional campaigns), the system floods with credits that dilute the value. Event organisers pay with credits instead of real money, reducing platform revenue.

2. **Accounting ambiguity.** Under IFRS 15 (Revenue from Contracts with Customers), credits that can be redeemed for real services create a deferred revenue liability. The platform must recognise the revenue when the credit is redeemed, not when it is purchased. If credits are given away for free (promotional), there is no purchase event -- the accounting treatment is different. UK HMRC may also treat redeemed credits as a discount on the service price, affecting VAT calculations.

3. **Credit expiry disputes.** If credits expire after 12 months, event organisers who purchased credits with real money and did not use them will demand refunds. Under the Consumer Rights Act 2015, UK consumers may have rights to a refund for unused pre-paid credits.

4. **Cross-system contamination.** If credits earned in the marketplace can be spent on existing SiteMedic services (or vice versa), the pricing models of both systems are coupled. A discount applied via credits in the marketplace reduces the medic's payout if the commission is calculated on the post-discount amount.

**Evidence in this codebase:**
- No credits system exists yet. This is a later-phase feature. The pitfall is in design decisions made now that constrain the future credits implementation.
- The `payments` table uses real GBP amounts. Adding a parallel credits economy alongside real payments creates reconciliation complexity.

**Prevention strategy:**
1. **Defer credits to post-MVP.** Credits add enormous complexity to payment flows, accounting, and regulatory compliance. Launch the marketplace with real-money payments only. Add credits only after the marketplace has proven demand.
2. **When implementing credits, keep them separate from real money.** Credits are discounts on the platform's commission, not discounts on the medic's rate. A 10-credit discount means the platform takes GBP 10 less commission -- the medic's payout is unchanged. This prevents credits from affecting the medic's earnings.
3. **Credits cannot be redeemed for cash.** This avoids e-money regulations (UK FCA regulated) which would require an EMI license.
4. **Set expiry at 24 months minimum** to reduce Consumer Rights Act disputes. Purchased credits should be refundable within 14 days (cooling-off period under Consumer Contracts Regulations 2013).
5. **Account for credits as deferred revenue from day one.** Do not treat credit purchases as immediate revenue. Book as liability until redeemed.

**Phase to address:**
Credits phase (post-MVP) -- the design constraints should be documented now but implementation deferred.

---

### Pitfall 16: Cancellation and No-Show Payment Policies Are Undefined -- Creates Disputes on Every Incident

**Severity:** MEDIUM (but becomes HIGH at scale)

**What goes wrong:**
The marketplace will inevitably have cancellations and no-shows. Without clear, pre-defined policies:

1. **Event organiser cancels 48 hours before event.** The medic has blocked the date and turned down other work. Does the medic receive the full deposit? A partial deposit? Nothing? If undefined, every cancellation becomes a support ticket.

2. **Medic no-shows on event day.** The event organiser paid a deposit and has no medical cover. Is the deposit fully refunded? Does the platform provide an emergency replacement? Does the medic face a penalty? If undefined, the event organiser is stranded and furious.

3. **Event organiser disputes quality after the event.** "The medic was unprofessional / late / did not have the right equipment." The deposit is paid, the remainder is due. Can the organiser withhold the remainder? Can they request a partial refund? Who arbitrates?

4. **Weather cancellation.** An outdoor event is cancelled due to weather. Neither party is at fault. Who absorbs the cost?

**Prevention strategy:**
1. **Publish a cancellation schedule BEFORE marketplace launch:**
   - Event organiser cancels 7+ days before event: full deposit refund minus admin fee (e.g., GBP 25)
   - Event organiser cancels 3-6 days before: 50% deposit refund
   - Event organiser cancels < 3 days before: no refund (medic keeps the deposit as cancellation fee)
   - Medic withdraws 7+ days before: no penalty (deposit refunded to organiser)
   - Medic withdraws < 7 days before: rating penalty + temporary marketplace suspension (7 days)
   - Medic no-show on event day: rating penalty + full deposit refund to organiser + 30-day marketplace suspension
2. **Encode the cancellation schedule in code.** The cancellation handler should calculate the refund amount automatically based on the time delta between cancellation and event date. Do not leave it to manual support decision-making.
3. **Dispute resolution process:** For quality disputes, implement a 3-step process: (a) organiser raises dispute within 48 hours of event completion, (b) medic responds within 48 hours, (c) if unresolved, platform admin reviews evidence (photos, messages, timesheet) and makes a binding decision. The remainder payment is held during the dispute window.
4. **Force majeure clause.** Weather cancellations, government-mandated event cancellations, and similar force majeure events: full deposit refund to organiser, no penalty to medic. The platform absorbs the Stripe processing fee.

**Phase to address:**
Policy and terms of service phase -- the cancellation schedule must be published on the marketplace website before the first RFQ is posted. The code implementation (automated refund calculation) should be in the cancellation handler phase.

---

### Pitfall 17: RLS Complexity Explosion -- Marketplace Adds 4+ New Roles to an Org-Scoped System

**Severity:** MEDIUM

**What goes wrong:**
The existing RLS system uses `get_user_org_id()` which reads `org_id` from the JWT. Every RLS policy is scoped: "users can see rows where `org_id` matches their org." This works for a single-org staffing platform.

The marketplace introduces new actors that do not fit the org model:
- **Event organisers** (individuals, not part of any existing org)
- **Independent medics** (no org affiliation, just a marketplace profile)
- **Company admins** (a new type of entity -- not an existing org, but a company that manages medics on the marketplace)
- **Platform admin** (already exists but needs new marketplace-specific permissions)

If marketplace tables use `org_id` for RLS, event organisers and independent medics cannot access their own data (they have no `org_id`). If marketplace tables do NOT use `org_id`, the RLS model diverges between existing and marketplace tables, creating two incompatible access-control paradigms in the same database.

**Evidence in this codebase:**
- All existing RLS policies use `get_user_org_id()` (migrations 003, 004, 011, 028). This function reads `auth.jwt() -> 'app_metadata' ->> 'org_id'`.
- Independent marketplace users will not have an `org_id` in their JWT.
- The `profiles.role` field allows `medic`, `org_admin`, `site_manager`, `platform_admin`. No marketplace-specific roles exist.

**Warning signs:**
- An independent medic signs up for the marketplace but cannot see their own quotes because RLS requires `org_id`
- An event organiser can see marketplace data from other event organisers because the RLS policy defaults to "allow all" for users without `org_id`
- A new RLS policy on a marketplace table accidentally grants access to existing org tables

**Prevention strategy:**
1. **Marketplace tables use user_id-based RLS, not org_id-based.** Quote, RFQ, marketplace profile, and rating tables use `auth.uid()` directly (not `get_user_org_id()`). Event organisers see their own RFQs. Medics see their own quotes. This is independent of org membership.
2. **Do not modify existing RLS functions or policies.** The marketplace adds new tables with new RLS policies. It does not touch `get_user_org_id()`, `is_platform_admin()`, or any existing policy on existing tables.
3. **New role: `event_organiser`.** Add to the profiles role CHECK constraint. Event organisers get this role in their JWT. Marketplace RLS policies check for this role where needed.
4. **Bridge table for org-affiliated marketplace medics.** If a medic belongs to an org AND has a marketplace profile, their marketplace data is accessed via `auth.uid()` (marketplace context) and their org data via `get_user_org_id()` (org context). Two separate RLS paradigms, two separate table sets, no collision.
5. **Test RLS with all 5 actor types.** Before merging marketplace RLS policies, test with: platform admin, org admin, org medic, independent marketplace medic, event organiser. Verify each can see exactly what they should and nothing more.

**Phase to address:**
Core marketplace schema phase -- the RLS model decision must be made before any marketplace table is created. This is an architectural decision, not a per-table decision.

---

### Pitfall 18: Auto-Create Booking in Existing System Causes Downstream Cascade Failures

**Severity:** MEDIUM

**What goes wrong:**
When a marketplace quote is awarded, the system auto-creates a booking in the existing SiteMedic `bookings` table so the medic's scheduling, timesheet, and payout workflows function. But the existing booking flow has downstream triggers and side effects:

1. **Invoice auto-generation.** If the existing system auto-generates an invoice when a booking is created, the marketplace booking will generate a duplicate invoice (the marketplace already handles payment via deposit + remainder).

2. **Auto-assignment triggers.** If the existing booking creation triggers auto-assignment logic (the scoring weights in migration 103), the system may try to re-assign the medic or find a "better" match, overriding the marketplace award.

3. **Notification triggers.** Booking creation may trigger emails to the org admin, the client, and the medic. For marketplace bookings, the "client" is the event organiser (not in the `clients` table), and the "org admin" is irrelevant.

4. **Payout calculation.** The existing payout calculation uses `platform_fee_percent` from the medics table and `base_rate` from the booking. The marketplace payout calculation uses the quoted amount and the marketplace commission rate. If the existing payout logic runs on a marketplace booking, the medic receives the wrong amount.

**Evidence in this codebase:**
- Migration 002: `bookings.client_id UUID NOT NULL REFERENCES clients(id)` -- marketplace event organisers are not in the `clients` table.
- The existing webhook handler updates booking status on payment. If both the existing and marketplace payment handlers fire for the same booking, status can flip-flop.
- `web/lib/booking/pricing.ts` uses a fixed pricing formula. Marketplace bookings use a quoted price. If the existing formula runs on a marketplace booking, the price is wrong.

**Prevention strategy:**
1. **Source discriminator (Pitfall 3).** The `source = 'marketplace'` column on `bookings` allows all downstream logic to check: `IF source = 'marketplace' THEN skip_this_step`.
2. **Guard all existing triggers.** Audit every trigger, cron job, and webhook handler that fires on booking events. Add `WHERE source != 'marketplace'` or equivalent guards.
3. **No auto-invoice for marketplace bookings.** The marketplace has its own payment flow (deposit + remainder). The existing invoice system should not touch marketplace bookings.
4. **No auto-assignment for marketplace bookings.** The medic was already assigned via the marketplace award. Skip the auto-assignment scoring.
5. **Separate payout calculation.** Marketplace payout = quoted amount - marketplace commission. Do not run the existing `calculateBookingPrice()` on marketplace bookings.
6. **Integration tests.** Write a test that creates a marketplace booking and verifies that no existing-system side effects fire (no invoice, no auto-assignment, no wrong-formula payout).

**Phase to address:**
Booking bridge phase -- the guards must be in place before the first marketplace booking is auto-created in the existing system.

---

## Regulatory and Compliance Considerations (UK-Specific)

---

### Pitfall 19: Payment Services Directive 2 (PSD2) -- Holding Deposits May Require FCA Authorization

**Severity:** HIGH (regulatory)

**What goes wrong:**
Under PSD2 (implemented in the UK as the Payment Services Regulations 2017), holding funds on behalf of a third party (i.e., collecting a deposit from an event organiser and holding it before releasing to the medic) may constitute a regulated payment service. Specifically, "executing payment transactions" and "acquiring payment transactions" are regulated activities.

If MedBid collects the deposit, holds it in the platform balance, and later transfers it to the medic, the FCA may classify MedBid as a payment service provider that requires authorization.

The exception: if MedBid uses Stripe Connect with the "commercial agent" exemption (the platform acts as an agent of either the buyer or seller, not both), FCA authorization may not be required. Stripe itself is the payment service provider; MedBid is the marketplace. But this exemption has conditions that must be met.

**Prevention strategy:**
1. **Use Stripe Connect's standard marketplace model** where Stripe is the payment processor and MedBid collects an application fee. Do not hold funds in a separate bank account. Keep all funds in the Stripe platform balance.
2. **Consult with an FCA compliance advisor** to confirm the commercial agent exemption applies to MedBid's specific model (deposit + delayed payout).
3. **Document the flow clearly:** Event organiser pays Stripe (not MedBid). Stripe holds the funds. MedBid instructs Stripe to transfer to the medic. MedBid never touches the money directly.
4. **Do not implement a "wallet" or "balance" feature** for event organisers or medics on the platform. Wallets that hold real money are almost certainly regulated. Credits (Pitfall 15) that cannot be redeemed for cash are lower risk but still need review.

**Phase to address:**
Legal and compliance phase -- BEFORE processing any marketplace payments. This is a blocking regulatory question.

---

### Pitfall 20: GDPR Lawful Basis for Marketplace Profile Data Differs from Employment Data

**Severity:** MEDIUM (regulatory)

**What goes wrong:**
In the existing SiteMedic system, the lawful basis for processing medic data is likely "contract" (Article 6(1)(b)) -- the medic has an employment or contractor relationship with the org, and data processing is necessary for that contract.

In the marketplace, the lawful basis changes:
- **Medic profile data shown to event organisers:** "Legitimate interest" (Article 6(1)(f)) -- the platform's legitimate interest in facilitating marketplace transactions. But this requires a Legitimate Interest Assessment (LIA).
- **Medic health qualifications shared with event organisers:** Potentially "special category data" under Article 9 if it reveals health-related information about the medic themselves (not about patients). HCPC registration status could be interpreted as revealing that the medic is a healthcare professional, which is health-related. This is a stretch, but a cautious interpretation would require explicit consent.
- **Rating data:** "Legitimate interest" -- but the medic must be informed that their ratings are visible to event organisers and have a right to object.

**Prevention strategy:**
1. **Update the privacy policy** before marketplace launch to cover marketplace-specific data processing, lawful bases, and data sharing with event organisers.
2. **Obtain consent during marketplace onboarding.** When a medic opts into the marketplace, present a clear consent screen: "By joining the marketplace, you consent to your classification, experience level, ratings, and bio being visible to event organisers who post RFQs matching your qualifications."
3. **Conduct a Legitimate Interest Assessment** for marketplace data processing and document it.
4. **Data minimisation in profiles.** Only show what is necessary for the event organiser to make an award decision: classification, experience years, rating, bio. Do not show: home address, email, phone, full name, HCPC number (show "HCPC Verified" badge instead of the actual number).

**Phase to address:**
Legal and compliance phase -- privacy policy update and consent flow must be live before marketplace launch.

---

## Phase-Specific Warnings Summary

| Phase Topic | Most Likely Pitfall | Severity | Mitigation |
|-------------|---------------------|----------|-----------|
| Core marketplace schema | Race condition on award -- double-booking | Critical | EXCLUSION constraint with tstzrange on medic commitments |
| Core marketplace schema | Marketplace bookings collide with existing bookings | Critical | Separate marketplace table + source discriminator on bookings |
| Core marketplace schema | RLS complexity -- marketplace actors have no org_id | Medium | user_id-based RLS for marketplace tables, separate from org_id-based |
| Payment architecture | Deposit collected but remainder never charged | Critical | Save payment method at deposit; auto-charge cron with retry; deposit >= medic payout |
| Payment architecture | PSD2 -- holding deposits may require FCA authorization | High | Use Stripe Connect; consult FCA compliance advisor |
| Quote submission | Medic identity leaks before quote (anti-disintermediation failure) | Critical | Strict data projection layer; display_id instead of medic_id; no company names |
| Medic onboarding | Stripe Connect onboarding friction kills signup | High | Defer Stripe onboarding to first award; reuse existing Express accounts |
| Medic onboarding | Unverified "paramedics" quote on marketplace | Critical | HCPC/NMC/GMC verification before profile goes live |
| Legal/compliance | CQC registration -- platform may need to register | Critical | Legal counsel before launch; structure as introduction service |
| Legal/compliance | GDPR data subject rights in marketplace context | High | Data map; anonymisation over deletion; updated privacy policy |
| Rating system | Bidirectional rating manipulation and retaliation | High | Blind rating period; minimum text for low ratings; no sort-by-rating in quoting |
| Company accounts | Double-counting and bid rigging via company rosters | High | One quote per RFQ per medic (UNIQUE constraint); company quote limits |
| Notification system | Notification spam kills medic engagement | High | Batch digests; smart routing; per-category controls; snooze/mute |
| Launch strategy | Chicken-and-egg -- no liquidity at launch | Critical | Seed from existing medics; narrow geographic launch; platform-guaranteed fallback |
| Cancellation policy | Undefined cancellation terms create disputes | Medium | Publish cancellation schedule before launch; encode in cancellation handler |
| Credits system | Credits create accounting nightmares and perverse incentives | Medium | Defer to post-MVP; credits = discount on commission, not on medic rate |
| Booking bridge | Auto-created booking triggers wrong downstream effects | Medium | Source discriminator; guard all existing triggers with source check |
| RFQ lifecycle | Expiry and withdrawal timing creates orphaned deposits | Medium | Firm expiry; lock-during-award; auto-close ghost RFQs |
| Anti-disintermediation | Event organiser hires medic directly after first match | High | Ongoing value (insurance, compliance docs, reputation); tiered commission |

---

## Sources

**Stripe documentation:**
- [Separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) -- Stripe Connect marketplace payment splitting, HIGH confidence
- [Manual payouts and payout timing](https://docs.stripe.com/connect/manual-payouts) -- delayed transfer to connected accounts, HIGH confidence
- [Handle refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes) -- marketplace refund flows, HIGH confidence
- [Recommended Connect integration types](https://docs.stripe.com/connect/integration-recommendations) -- charge type selection for marketplaces, HIGH confidence
- [Save payment method for future use](https://docs.stripe.com/payments/save-during-payment) -- setup_future_usage for remainder charges, HIGH confidence

**UK regulatory sources:**
- [CQC registration scope](https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration) -- who must register, HIGH confidence
- [CQC: who has to register](https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration/who-has-register) -- CQC registration requirements for event medical providers, HIGH confidence
- [UK event medical cover regulations](https://eventunitypro.com/what-are-first-aid-legal-requirements-at-events-uk/) -- first aid legal requirements, MEDIUM confidence
- [Event medical services provider requirements](https://www.esgmedical.co.uk/eventguide) -- CQC requirements for ambulance/drug administration, MEDIUM confidence
- [ICO UK GDPR guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/) -- data protection guidance, HIGH confidence
- [UK GDPR data marketplace obligations](https://gdprlocal.com/data-marketplace/) -- GDPR for marketplace operators, MEDIUM confidence

**Marketplace design research:**
- [Sharetribe: how to prevent marketplace leakage](https://www.sharetribe.com/academy/how-to-discourage-people-from-going-around-your-payment-system/) -- anti-disintermediation strategies, MEDIUM confidence
- [Platform disintermediation research](https://platformchronicles.substack.com/p/platform-leakage) -- academic analysis of disintermediation, MEDIUM confidence
- [NFX: 19 tactics for marketplace chicken-and-egg](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem) -- cold start strategies, MEDIUM confidence
- [Sharetribe: chicken-and-egg problem](https://www.sharetribe.com/marketplace-glossary/chicken-and-egg-problem/) -- marketplace cold start, MEDIUM confidence
- [Combatting disintermediation](https://www.marketbase.app/marketplace-insights/combatting-disintermediation) -- platform leakage prevention, MEDIUM confidence
- [Hokodo: prevent B2B marketplace disintermediation](https://www.hokodo.co/resources/how-to-prevent-disintermediation-on-your-b2b-marketplace) -- B2B-specific strategies, MEDIUM confidence

**Concurrency and double-booking:**
- [Solving double booking at scale](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea) -- system design patterns, MEDIUM confidence
- [PostgreSQL EXCLUSION constraints](https://www.postgresql.org/docs/current/mvcc.html) -- concurrency control, HIGH confidence
- [18F micropurchase bid race condition](https://github.com/18F/micropurchase/issues/123) -- real-world marketplace race condition, HIGH confidence

**Rating and trust systems:**
- [Dynamic aggregation of online ratings](https://www.sciencedirect.com/science/article/abs/pii/S0167923617301811) -- reducing rating manipulation, MEDIUM confidence
- [Reputation and feedback in platform markets (Tadelis)](https://faculty.haas.berkeley.edu/stadelis/Annual_Review_Tadelis.pdf) -- academic review of marketplace rating systems, HIGH confidence

**Notification research:**
- [Push notification statistics 2025](https://www.businessofapps.com/marketplace/push-notifications/research/push-notifications-statistics/) -- notification fatigue data, MEDIUM confidence

**Marketplace dispute resolution:**
- [Code23: marketplace dispute guide](https://code23.com/marketplace-disputes-a-guide-to-dispute-resolution/) -- dispute resolution patterns, MEDIUM confidence
- [Chargeback management for marketplaces](https://www.chargebackgurus.com/blog/chargebacks-online-marketplaces) -- marketplace chargeback handling, MEDIUM confidence

**Code files inspected in this codebase (all HIGH confidence -- files read directly):**
- `supabase/migrations/002_business_operations.sql` -- bookings, clients, medics, payments, timesheets, invoices schema
- `supabase/migrations/115_referral_and_per_medic_rates.sql` -- referral and revenue split fields
- `supabase/migrations/129_hourly_pay_and_profit_split.sql` -- 4-way profit split, medic classification
- `supabase/migrations/135_webhook_events.sql` -- webhook idempotency table
- `supabase/migrations/137_notification_preferences.sql` -- notification preferences
- `supabase/migrations/138_site_manager_company.sql` -- company name on profiles
- `web/lib/booking/pricing.ts` -- pricing calculation formula
- `web/lib/booking/types.ts` -- booking and pricing types
- `web/lib/stripe/server.ts` -- Stripe SDK initialization
- `web/app/api/stripe/webhooks/route.ts` -- existing Stripe Connect webhook handler
- `.planning/research/ARCHITECTURE.md` -- existing architecture baseline (v3.0)
- `.planning/research/PITFALLS.md` -- existing pitfalls document (v3.0 white-label milestone)

---

*Pitfalls research for: MedBid marketplace milestone (v4.0)*
*Researched: 2026-02-19*
*Confidence: HIGH -- all findings grounded in direct code inspection of existing SiteMedic schema and cross-referenced with Stripe documentation, UK CQC/HCPC regulatory guidance, GDPR requirements, and marketplace design research*
