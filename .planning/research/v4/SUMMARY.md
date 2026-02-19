# Project Research Summary

**Project:** MedBid Marketplace (SiteMedic v4.0)
**Domain:** UK Event Medical Cover RFQ/Bidding Marketplace
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

MedBid is an RFQ (Request for Quotes) marketplace layered onto the existing SiteMedic multi-tenant staffing platform. Event organisers post medical cover requirements, verified medics submit competitive quotes, and the platform facilitates the entire lifecycle from quote to event completion and payout. The critical insight from research is that **the existing SiteMedic stack handles nearly everything** -- only two new packages are needed (`zod` and `@hookform/resolvers`). The rest is database tables, Edge Functions, RLS policies, and Stripe patterns built on existing infrastructure. This dramatically reduces execution risk compared to a greenfield marketplace.

The recommended approach is to build the marketplace as a **platform-scoped layer** on top of the existing org-scoped system. Marketplace tables use `auth.uid()`-based RLS (not `org_id`), marketplace pricing is medic-set (not platform-calculated), and the critical bridge is an Edge Function that converts awarded quotes into existing SiteMedic bookings for scheduling, timesheets, and payouts. The two-phase payment model (deposit at award, remainder after event) uses two separate Stripe PaymentIntents -- not manual capture -- because authorization holds expire after 7 days, which is too short for events booked weeks ahead. The existing Stripe Connect Express accounts, `friday-payout` flow, and `notification-service` Edge Function all extend cleanly to marketplace use cases.

The top risks are: (1) **Race condition on award** -- two clients awarding the same medic for overlapping events, solved with a PostgreSQL EXCLUSION constraint on time ranges; (2) **Remainder payment failure** -- the card that paid the deposit may fail weeks later, solved by saving the payment method at deposit time and auto-retrying with escalation; (3) **Regulatory exposure** -- CQC registration requirements and HCPC verification for protected titles are non-negotiable UK compliance requirements that must be resolved with legal counsel before launch; and (4) **Chicken-and-egg cold start** -- solved by seeding supply from existing SiteMedic medics, launching in one geography, and providing a platform-guaranteed fallback for early RFQs.

## Key Findings

### Recommended Stack

The existing SiteMedic stack (Next.js 15, React 19, Supabase, Stripe Connect, TanStack Query, Zustand, Resend, Twilio, Expo Push, react-leaflet, react-hook-form, Radix UI) covers the vast majority of marketplace requirements. Every major marketplace need -- auth, payments, real-time, storage, email, SMS, push, maps, tables, forms -- maps directly to an existing dependency.

**New packages (total: 2):**
- `zod` (^4.3.6): Schema validation for multi-step marketplace forms -- non-negotiable for a public-facing marketplace with untrusted input. The existing codebase does no schema validation.
- `@hookform/resolvers`: Connects Zod schemas to existing react-hook-form. Zero boilerplate.

**Explicit "build custom" decisions:**
- Star rating display: ~30 lines with existing Lucide icons + Radix radio group. No library needed.
- Search/filtering: PostgreSQL full-text search with GIN indexes. Algolia/Meilisearch are premature at launch scale.
- Notifications: Supabase Realtime (already integrated). No third-party notification SaaS.
- Credits: Database ledger tables. No virtual currency platform.

**Stripe pattern for deposit/remainder:** SetupIntent + two separate PaymentIntents. Not manual capture (7-day hold limit). Not Stripe Checkout (worse UX). Not Stripe Invoicing (wrong product).

### Expected Features

**Must have (table stakes -- all needed for a single transaction to complete):**
- TS-01: Event posting (structured RFQ form with UK Purple Guide inputs)
- TS-02: Quote submission (price + breakdown + pitch + staffing plan)
- TS-03: Quote comparison (side-by-side, contact details hidden until award)
- TS-04: Award flow (select quote, trigger deposit, auto-create booking)
- TS-05: Deposit and remainder payment (two-phase Stripe, saved payment method)
- TS-06: User registration (client + individual medic + company -- basic)
- TS-07: Medic verification (document upload, admin review, verified badge)
- TS-08: Bidirectional ratings (double-blind, 7-day window, anti-retaliation)
- TS-09: In-platform messaging (per-quote, contact info gated behind payment)
- TS-10: Multi-channel notifications (email + SMS + push + in-app dashboard)
- TS-11: Search and filtering (type, date, location/radius, qualification level)

**Should have (differentiators -- the "unfair advantage"):**
- DF-01: Purple Guide risk calculator integration (no competitor has this)
- DF-02: SiteMedic dashboard integration -- awarded quote becomes a booking with timesheets, incident reporting, compliance docs (end-to-end value no competitor offers)
- DF-03: Company accounts with roster management and double-up prevention
- DF-04: Medic qualification matching (domain-specific, not available on generic marketplaces)
- DF-05: Cancellation and dispute resolution framework
- DF-06: Repeat booking and client preferences (anti-disintermediation)
- DF-07: Event medical compliance documentation package (SiteMedic's moat)

**Defer (v2+):**
- CP-01/02/03: Credits system, premium tiers, boosted quotes (monetisation layer -- add only after marketplace has liquidity)
- Native mobile marketplace app (responsive web first; existing mobile app shows awarded bookings only)
- Complex gamification (meaningless at low volume)
- AI-powered matching/recommendations
- Multi-currency support (UK-only at launch)

**Anti-features (explicitly do NOT build):**
- Auction/reverse auction (race-to-bottom on safety-critical services)
- Instant matching/auto-assignment (clients need to evaluate quality)
- Real-time chat before deposit (disintermediation risk)
- Platform-conducted DBS checks (regulated activity)
- Open marketplace without verification gate (safety-critical domain)
- Quote editing after submission (bait-and-switch risk)

### Architecture Approach

The marketplace is a **platform-scoped layer** that sits above the existing org-scoped SiteMedic system. Marketplace tables (`marketplace_events`, `marketplace_quotes`, `marketplace_awards`, `marketplace_ratings`) have no `org_id` column and use `auth.uid()`-based RLS. The bridge to the existing system is the `marketplace-booking-creator` Edge Function, which converts an awarded quote into a `bookings` row (with `source = 'marketplace'`) after deposit payment succeeds. All downstream flows (timesheets, payouts, compliance) then work as-is.

**Major components:**
1. **Event Posting** -- Client creates/edits marketplace events; validated via Zod schemas
2. **Quote Engine** -- Medic browses events, submits quotes with own pricing; snapshot data preserved
3. **Award and Booking Bridge** -- Client selects quote, deposit collected, booking auto-created in existing system
4. **Deposit/Remainder Payment** -- Two separate Stripe PaymentIntents; webhook-driven status updates
5. **Rating Engine** -- Double-blind bidirectional ratings after event completion
6. **Notification Dispatcher** -- Extends existing notification-service with marketplace event types
7. **Event Matcher** -- Finds qualified medics by location + classification when events publish

**Key architectural decisions:**
- Marketplace tables break the `org_id` RLS pattern deliberately (cross-org by design)
- Medic sets own price (not platform-calculated) -- `calculate-pricing` adds a new mode
- Strict state machines on events, quotes, and awards with defined transitions
- Service role for cross-org Edge Functions with explicit ownership validation
- `source = 'marketplace'` discriminator on `bookings` table to guard all existing triggers

### Critical Pitfalls

Research identified 20 pitfalls (7 Critical, 7 High, 6 Medium). The top 5 that must be addressed before or during Phase 1:

1. **Race condition on award (double-booking)** -- Two clients award the same medic for overlapping time slots. Prevention: PostgreSQL EXCLUSION constraint with `tstzrange` on a `medic_commitments` table. Check availability at award time, not quote time. Auto-withdraw overlapping quotes.

2. **Deposit collected but remainder never charged** -- Card fails weeks after deposit. Prevention: Save payment method via `setup_future_usage: 'off_session'` at deposit; auto-charge cron with 3-retry escalation; deposit percentage must cover medic payout if remainder fails (suggest 50%+).

3. **Existing booking system collision** -- Marketplace bookings trigger wrong pricing formulas, auto-assignment, invoice generation. Prevention: `source = 'marketplace'` column on bookings; guard every existing trigger/handler with source check; use Edge Function (not UI) for booking creation.

4. **Medic identity leaks before award** -- Destroys anti-disintermediation design. Prevention: Strict data projection layer returning only classification/rating/experience; use `display_id` (random code) not `medic_id`; no company names on quotes; `noindex` on profile pages.

5. **UK regulatory exposure (CQC + HCPC)** -- Operating without CQC registration if marketplace arranges regulated healthcare; unverified "paramedics" using protected titles. Prevention: Legal counsel before launch; structure as introduction service; require HCPC number for regulated roles; verification gate before quoting.

## Implications for Roadmap

Based on combined research, the marketplace builds in 8 phases along a critical dependency path. Phases 1-4 are sequential (each depends on the previous). Phases 5-8 can partially parallelize.

### Phase 1: Legal/Compliance and Foundation Schema
**Rationale:** Regulatory questions (CQC, HCPC, FCA/PSD2) are blocking prerequisites that no amount of code can fix. The database schema (marketplace tables, RLS policies, EXCLUSION constraints) must be right before any UI is built. Research shows the marketplace's cross-org nature fundamentally breaks existing RLS patterns -- this must be solved first.
**Delivers:** Legal sign-off on marketplace model; all marketplace tables with RLS; medic commitments table with EXCLUSION constraint; `source` column on bookings; Zod installed; Zod schemas for all marketplace entities.
**Addresses:** TS-06 (registration foundations), TS-07 (verification foundations)
**Avoids:** Pitfall 6 (CQC), Pitfall 7 (HCPC), Pitfall 3 (booking collision), Pitfall 17 (RLS complexity)

### Phase 2: Event Posting and Medic Onboarding
**Rationale:** Supply must come before demand (Pitfall 5 cold start). Seed existing SiteMedic medics into marketplace with opt-in flow. Then build the event posting form so demand has somewhere to go. Medic verification workflow gates quoting behind minimum credentials.
**Delivers:** Marketplace medic profiles (opt-in from existing medics); medic verification workflow (upload, admin review, badges); client registration; event posting form (multi-step with Zod validation); event browsing with search/filtering; email templates for marketplace events.
**Addresses:** TS-06 (registration), TS-07 (verification), TS-01 (event posting), TS-11 (search/filtering basics)
**Avoids:** Pitfall 5 (chicken-and-egg), Pitfall 7 (HCPC verification gap), Pitfall 13 (Stripe onboarding friction -- defer Stripe to award time)

### Phase 3: Quote Submission and Comparison
**Rationale:** With events posted and medics onboarded, the quoting mechanism connects both sides. The anonymous data projection layer (Pitfall 4) must be built here -- before any medic identity is ever exposed to a client. The notification system must also start here so medics learn about matching events.
**Delivers:** Quote submission form (pricing + pitch + staffing plan); quote comparison view for clients; anonymous medic display (display_id, classification, rating only); basic notification dispatch (email for new events matching medic profile, email for new quotes received).
**Addresses:** TS-02 (quote submission), TS-03 (quote browsing), TS-10 (notifications -- initial)
**Avoids:** Pitfall 4 (identity leaks), Pitfall 9 (notification spam -- use batched digests from day one)

### Phase 4: Award Flow and Deposit Payment
**Rationale:** The award is the critical transaction that converts a marketplace quote into money and a booking. This is where the EXCLUSION constraint is exercised, the deposit PaymentIntent is created, the payment method is saved for remainder, and the booking-creator Edge Function bridges to the existing system. This is the highest-complexity phase.
**Delivers:** Award flow (select quote, confirm, pay deposit); Stripe PaymentIntent for deposit with `setup_future_usage`; `marketplace-booking-creator` Edge Function; auto-creation of booking with `source = 'marketplace'`; rejection notifications to non-winning medics; contact detail reveal post-deposit.
**Addresses:** TS-04 (award flow), TS-05 (deposit payment), DF-02 (SiteMedic integration -- initial)
**Avoids:** Pitfall 1 (race condition -- EXCLUSION constraint enforced at award), Pitfall 2 (remainder never charged -- payment method saved here), Pitfall 18 (auto-created booking triggers -- source guards active)

### Phase 5: Event Completion and Remainder Payment
**Rationale:** After Phase 4 creates bookings, the existing SiteMedic flow handles the event (check-in, timesheets, approval). This phase adds the remainder payment automation and connects marketplace award completion to the existing payout system.
**Delivers:** Remainder payment automation (auto-charge after timesheet approval); marketplace-specific payout calculation (quoted amount minus marketplace commission, not existing formula); retry logic for failed remainder charges; `friday-payout` modification for marketplace bookings.
**Addresses:** TS-05 (remainder payment), DF-02 (SiteMedic integration -- full)
**Avoids:** Pitfall 2 (remainder collection), Pitfall 18 (payout calculation collision)

### Phase 6: Ratings, Messaging, and Cancellations
**Rationale:** With complete transactions flowing, trust mechanisms (ratings) and safety nets (cancellations, messaging) round out the core experience. These are grouped because they all depend on completed awards existing.
**Delivers:** Double-blind bidirectional ratings (7-day window, blind reveal, minimum text for low ratings); per-quote messaging (pre-award: filtered, post-award: full contact); cancellation flows (tiered refund schedule, medic withdrawal penalties); dispute resolution workflow.
**Addresses:** TS-08 (ratings), TS-09 (messaging), DF-05 (cancellation/disputes)
**Avoids:** Pitfall 10 (rating manipulation -- blind period), Pitfall 16 (undefined cancellation terms), Pitfall 14 (orphaned deposits -- lock-during-award)

### Phase 7: Company Accounts and Advanced Features
**Rationale:** UK event medical is dominated by companies, not freelancers. Company accounts with roster management unlock the majority of the market. Repeat booking features address the #1 disintermediation risk.
**Delivers:** Company registration with CQC number; medic roster management (invite/link); company-level quoting with per-medic assignment; double-up prevention (UNIQUE constraint); qualification matching (auto-filter events by medic certs); repeat booking (rebook button, favourite medics, private RFQs); Purple Guide risk calculator.
**Addresses:** DF-03 (company accounts), DF-04 (qualification matching), DF-06 (repeat booking), DF-01 (Purple Guide), DF-07 (compliance docs)
**Avoids:** Pitfall 11 (company double-counting/bid rigging)

### Phase 8: Monetisation (Credits System)
**Rationale:** Credits must come last. Research unanimously warns against introducing credits before marketplace liquidity is proven. Premature monetisation kills supply-side growth. Credits also introduce FCA regulatory questions (e-money) and IFRS 15 accounting complexity.
**Delivers:** Credit balance and ledger tables; credit purchase via Stripe; credit spend on quote submission; credit earn on award/completion; generous free allocation; credit refund for unviewed quotes.
**Addresses:** CP-01 (quote credits), CP-02 (premium/early access), CP-03 (boosted quotes)
**Avoids:** Pitfall 15 (credits accounting nightmares -- credits = discount on commission, not on medic rate; no cash redemption)

### Phase Ordering Rationale

- **Legal/compliance before code** because CQC and FCA questions are binary blockers that no code can fix.
- **Schema before UI** because the EXCLUSION constraint, RLS policies, and source discriminator are foundational decisions that affect every subsequent phase.
- **Supply before demand** because the cold start research is clear: seed medics first, then open to event organisers.
- **Award + deposit is the critical path** because it exercises the most dangerous pitfalls (race condition, payment method saving, booking bridge) and is the first moment real money flows.
- **Ratings and messaging after completed transactions** because they require completed awards to exist and are trust/quality layers on top of the core loop.
- **Company accounts after individual flow works** because the individual flow must be proven before adding multi-user complexity.
- **Credits dead last** because premature monetisation kills marketplace liquidity.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Legal/Compliance):** Requires legal counsel for CQC registration and FCA/PSD2 commercial agent exemption. Cannot be resolved with technical research alone.
- **Phase 4 (Award + Deposit):** The Stripe deposit + saved payment method + booking bridge is the highest-complexity integration. Needs Stripe sandbox testing and detailed state machine design.
- **Phase 7 (Company Accounts):** Roster management, double-up prevention, and exclusive vs. non-exclusive membership are domain-specific designs with limited reference patterns. Needs user research with actual UK event medical companies.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Event Posting):** Standard multi-step form with Zod validation. Well-documented Next.js 15 + react-hook-form patterns.
- **Phase 3 (Quote Submission):** Standard CRUD with data projection. The anonymous display is a design decision, not a research question.
- **Phase 5 (Remainder Payment):** Extends Phase 4's Stripe pattern. The cron + retry is a standard background job.
- **Phase 6 (Ratings):** Airbnb double-blind review pattern is thoroughly documented. Direct implementation.
- **Phase 8 (Credits):** Upwork Connects model is well-documented. Database ledger is standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase inspection confirms existing capabilities. Only 2 new packages needed. Stripe patterns verified against official documentation. |
| Features | HIGH | Cross-referenced across 8+ marketplace platforms (Upwork, Bark, Thumbtack, Checkatrade, Add to Event, Fiverr, PeoplePerHour). UK-specific requirements validated against Purple Guide, CQC, and HCPC sources. |
| Architecture | HIGH | Schema design verified against existing migrations. RLS strategy accounts for current `org_id` pattern. Payment flow confirmed against Stripe Connect docs (7-day hold limit, SetupIntent, separate charges). |
| Pitfalls | HIGH | All 20 pitfalls grounded in direct codebase inspection of existing schema + cross-referenced with Stripe docs, UK regulatory guidance (CQC, HCPC, FCA, GDPR), and marketplace design research. |

**Overall confidence: HIGH**

The research is unusually high-confidence because the existing codebase was directly inspected (not assumed), every Stripe pattern was verified against official documentation, and UK regulatory requirements were cross-referenced with primary sources (CQC, HCPC, ICO websites).

### Gaps to Address

- **CQC legal opinion:** Research identifies the risk but cannot determine whether MedBid requires CQC registration. This requires a health regulation solicitor. **Must be resolved before launch.**
- **FCA/PSD2 commercial agent exemption:** Research identifies Stripe Connect as the likely solution, but formal confirmation from an FCA compliance advisor is needed. **Must be resolved before processing marketplace payments.**
- **Marketplace commission rate:** Research suggests 15% but the actual rate is a business decision. The architecture supports any percentage. **Decide before Phase 4.**
- **Deposit percentage:** Research suggests 50%+ to cover medic payout if remainder fails. Exact percentage is a business/pricing decision. **Decide before Phase 4.**
- **Credit pricing and allocation:** Deferred to Phase 8. Design constraints documented but specific pricing (credits per quote, free allocation amount) requires marketplace volume data. **Decide after 6+ months of marketplace operation.**
- **GDPR Legitimate Interest Assessment:** Required for marketplace data processing. Research flags the need but the actual LIA document must be produced. **Must be completed before launch.**
- **Company account user research:** The exclusive vs. non-exclusive roster model needs validation with actual UK event medical companies. **Should be conducted before Phase 7.**

## Sources

### Primary (HIGH confidence)
- **Codebase inspection:** `web/package.json`, `supabase/migrations/002_business_operations.sql`, `web/lib/booking/pricing.ts`, `web/lib/booking/types.ts`, `web/app/api/stripe/webhooks/route.ts`, `supabase/functions/stripe-connect/`, `supabase/functions/notification-service/` -- all read directly
- [Stripe: Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) -- 7-day hold limit
- [Stripe: Save and reuse payment methods](https://docs.stripe.com/payments/save-and-reuse) -- SetupIntent pattern
- [Stripe: Separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) -- marketplace payout pattern
- [Stripe: Multicapture](https://docs.stripe.com/payments/multicapture) -- limited availability, rejected for this use case
- [Supabase: Full Text Search](https://supabase.com/docs/guides/database/full-text-search) -- PostgreSQL FTS
- [Supabase: Realtime](https://supabase.com/docs/guides/realtime) -- real-time subscription patterns
- [CQC: Scope of Registration](https://www.cqc.org.uk/guidance-regulation/providers/registration/scope-registration) -- who must register
- [ICO: UK GDPR guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/) -- data protection
- [PostgreSQL EXCLUSION constraints](https://www.postgresql.org/docs/current/mvcc.html) -- concurrency control
- [Reputation and feedback in platform markets (Tadelis, UC Berkeley)](https://faculty.haas.berkeley.edu/stadelis/Annual_Review_Tadelis.pdf) -- marketplace rating systems

### Secondary (MEDIUM confidence)
- [Upwork Connects System](https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects) -- credits model reference
- [Bark Credits and Billing](https://help.bark.com/topic/credits-billing/) -- per-lead pricing model
- [Sharetribe: How to Prevent Marketplace Leakage](https://www.sharetribe.com/academy/how-to-discourage-people-from-going-around-your-payment-system/) -- anti-disintermediation
- [NFX: 19 Marketplace Tactics for Chicken-and-Egg](https://www.nfx.com/post/19-marketplace-tactics-for-overcoming-the-chicken-or-egg-problem) -- cold start strategies
- [Rigby: 21 Services Marketplace Features](https://www.rigbyjs.com/blog/services-marketplace-features) -- feature landscape
- [Purple Guide / Event First Aid UK](https://www.eventfirstaiduk.com/event-medical-cover/purple-guide/) -- UK event medical standards
- [Add to Event](https://www.addtoevent.co.uk/) -- competitor analysis
- [Checkatrade](https://www.checkatrade.com/blog/expert-advice/checkatrade-how-we-work/) -- vetting/verification reference

### Tertiary (LOW confidence)
- Credit pricing specifics (Upwork $0.15/Connect, Bark $2.20/credit) -- prices may have changed
- Push notification fatigue statistics (40% disable after 3-6 notifications) -- single source, directionally correct

---
*Research completed: 2026-02-19*
*Ready for roadmap: yes*
