# Architecture Patterns: MedBid Marketplace

**Domain:** Request-for-Quotes (RFQ) marketplace within existing UK medical staffing platform
**Researched:** 2026-02-19
**Overall confidence:** HIGH (existing codebase thoroughly examined; patterns verified against Stripe/Supabase docs)

---

## 1. Existing Architecture Summary

Before defining marketplace architecture, here is what already exists and MUST be respected.

### Current System Boundaries

```
+-------------------+     +-------------------+     +-------------------+
|   Next.js 15      |     |   Supabase        |     |   Stripe          |
|   App Router      |<--->|   PostgreSQL      |<--->|   Connect (GB)    |
|   (web/app/)      |     |   Edge Functions  |     |   Webhooks        |
|   Zustand stores  |     |   Realtime        |     |   Payment Intents |
|   Server Actions  |     |   Storage         |     |   Transfers       |
+-------------------+     |   Auth + RLS      |     +-------------------+
                          +-------------------+
                                   ^
                                   |
                     +-------------------+
                     |   Notifications   |
                     |   Expo Push       |
                     |   SendGrid Email  |
                     |   Twilio SMS      |
                     +-------------------+
```

### Current Data Model (relevant tables)

| Table | Key Columns | Marketplace Relevance |
|-------|------------|----------------------|
| `organizations` | id, name, slug, status | Multi-tenant root. Marketplace is cross-org (platform-level). |
| `profiles` | id, org_id, role, full_name, email | Auth identity. Roles: medic, site_manager, org_admin, platform_admin, client |
| `medics` | id, user_id, org_id, classification, hourly_rate, star_rating, stripe_account_id, certifications JSONB | Quote submitters. Already have ratings, certs, Stripe Connect. |
| `clients` | id, user_id, company_name, stripe_customer_id, payment_terms | Event posters. Already have Stripe Customer. |
| `bookings` | id, client_id, medic_id, org_id, status, total, shift_date, event_vertical | Created from awarded quotes. Core integration point. |
| `timesheets` | id, booking_id, medic_id, org_id, payout_status | Post-event hours + payout flow. |
| `payments` | id, booking_id, client_id, stripe_payment_intent_id, amount, status | Existing payment tracking. |
| `org_settings` | org_id, base_rate, urgency_premiums | Per-org config. Marketplace uses platform-level settings. |

### Current RLS Pattern

All tables use `org_id = get_user_org_id()` for tenant isolation, with `is_platform_admin()` override for cross-org access. The marketplace tables break this pattern because they are **platform-scoped** (cross-org by design) -- a client in org A sees quotes from medics in org B.

### Current Payment Flow

```
Client -> PaymentIntent (full amount) -> Booking confirmed
Booking completed -> Timesheet approved -> Friday payout (Stripe Transfer to medic Express account)
```

The marketplace introduces a **two-phase payment**: deposit at award, remainder at completion.

---

## 2. Recommended Architecture

### 2.1 Component Boundary Diagram

```
+===============================================================+
|                    MARKETPLACE LAYER (Platform-scoped)          |
|                                                                 |
|  +-------------------+  +-------------------+  +-----------+   |
|  | Event Posting     |  | Quote Engine      |  | Award &   |   |
|  | (Client UI +      |  | (Medic UI +       |  | Booking   |   |
|  |  API routes)      |  |  API routes)      |  | Bridge    |   |
|  +--------+----------+  +--------+----------+  +-----+-----+   |
|           |                      |                    |         |
|  +--------v----------+  +--------v----------+  +-----v-----+   |
|  | marketplace_      |  | marketplace_      |  | Booking    |   |
|  | events            |  | quotes            |  | Creator    |   |
|  +-------------------+  +-------------------+  | (Edge Fn)  |   |
|                                                 +-----+-----+   |
|  +-------------------+  +-------------------+        |         |
|  | Rating Engine     |  | Notification      |        |         |
|  | (Post-event)      |  | Dispatcher        |        |         |
|  +-------------------+  | (Edge Fn)         |        |         |
|                         +-------------------+        |         |
+===============================================================+
                                                       |
                                                       v
+===============================================================+
|                    EXISTING SITEMEDIC LAYER (Org-scoped)       |
|                                                                 |
|  bookings -> timesheets -> friday-payout -> Stripe Transfer    |
|  payments -> invoices -> invoice_line_items                     |
+===============================================================+
```

### 2.2 Component Responsibilities

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| **Event Posting** | Client creates/edits/cancels marketplace events | marketplace_events, marketplace_event_requirements, notification-dispatcher |
| **Quote Engine** | Medic views events, submits/edits/withdraws quotes | marketplace_quotes, marketplace_events (read), medics (read) |
| **Award & Booking Bridge** | Client selects winning quote, triggers deposit payment, auto-creates booking in existing system | marketplace_awards, marketplace_quotes (update), stripe-connect (deposit), booking-creator |
| **Booking Creator** (Edge Function) | Translates awarded quote into a bookings row with correct org_id, pricing, medic assignment | bookings, payments, marketplace_awards |
| **Rating Engine** | Both sides rate after event completion | marketplace_ratings, medics (update star_rating), marketplace_events (update) |
| **Notification Dispatcher** (Edge Function) | Sends multi-channel notifications for marketplace events | notification-service (existing), marketplace_events, marketplace_quotes |
| **Deposit/Remainder Payment** | Two-phase Stripe payment handling | stripe-connect (extended), payments, marketplace_awards |

---

## 3. Database Schema Design

### 3.1 New Tables

#### `marketplace_events` -- What clients post

```sql
CREATE TABLE marketplace_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  posted_by_user_id     UUID NOT NULL REFERENCES auth.users(id),

  -- Event details
  title                 TEXT NOT NULL,
  description           TEXT,
  event_vertical        TEXT NOT NULL,     -- matches existing booking verticals
  event_type            TEXT NOT NULL,     -- 'one_off', 'multi_day', 'recurring'

  -- Location
  site_name             TEXT NOT NULL,
  site_address          TEXT NOT NULL,
  site_postcode         TEXT NOT NULL,
  site_lat              DOUBLE PRECISION,
  site_lng              DOUBLE PRECISION,
  what3words_address    TEXT,

  -- Timing (supports multi-day with separate shifts table if needed)
  event_date            DATE NOT NULL,
  event_end_date        DATE,             -- NULL for single-day
  shift_start_time      TIME NOT NULL,
  shift_end_time        TIME NOT NULL,
  shift_hours           DECIMAL(4,2) NOT NULL CHECK (shift_hours > 0),

  -- Requirements
  medics_needed         INT NOT NULL DEFAULT 1 CHECK (medics_needed >= 1),
  classification_min    TEXT,              -- minimum medic classification required
  confined_space        BOOLEAN DEFAULT FALSE,
  trauma_specialist     BOOLEAN DEFAULT FALSE,
  special_requirements  TEXT,

  -- Budget
  budget_min            DECIMAL(10,2),     -- optional: client's budget range
  budget_max            DECIMAL(10,2),
  budget_visible        BOOLEAN DEFAULT FALSE, -- whether medics see the budget

  -- Lifecycle
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft',          -- client still editing
                          'open',           -- accepting quotes
                          'reviewing',      -- client reviewing quotes, no new quotes
                          'awarded',        -- quote(s) accepted
                          'completed',      -- event finished
                          'cancelled',      -- client cancelled
                          'expired'         -- deadline passed, no award
                        )),
  published_at          TIMESTAMPTZ,       -- when status changed to 'open'
  quote_deadline        TIMESTAMPTZ,       -- after this, no new quotes accepted
  expires_at            TIMESTAMPTZ,       -- auto-expire if no award by this date
  awarded_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,

  -- Counts (denormalized for list performance)
  quote_count           INT NOT NULL DEFAULT 0,
  view_count            INT NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mp_events_client ON marketplace_events(client_id);
CREATE INDEX idx_mp_events_status ON marketplace_events(status);
CREATE INDEX idx_mp_events_date ON marketplace_events(event_date);
CREATE INDEX idx_mp_events_postcode ON marketplace_events(site_postcode);
CREATE INDEX idx_mp_events_vertical ON marketplace_events(event_vertical);
CREATE INDEX idx_mp_events_open ON marketplace_events(status, event_date)
  WHERE status = 'open';
CREATE INDEX idx_mp_events_published ON marketplace_events(published_at DESC)
  WHERE status = 'open';
```

**Key design decisions:**
- **No `org_id`** -- marketplace_events are platform-scoped, visible to medics across all orgs.
- **`client_id` references existing `clients` table** -- reuses existing company accounts.
- **Denormalized `quote_count`** -- avoids COUNT(*) on every list render. Updated by trigger.
- **`classification_min`** -- uses same classification enum as `medics.classification` for matching.
- **`quote_deadline` vs `expires_at`** -- quote_deadline stops new quotes; expires_at auto-closes if no award.

#### `marketplace_quotes` -- What medics submit

```sql
CREATE TABLE marketplace_quotes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE RESTRICT,
  medic_id              UUID NOT NULL REFERENCES medics(id) ON DELETE RESTRICT,
  submitted_by_user_id  UUID NOT NULL REFERENCES auth.users(id),

  -- Pricing (medic sets their price, NOT platform-calculated)
  total_price           DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  price_breakdown       JSONB,            -- optional structured breakdown
  --   e.g. { "hourly_rate": 35, "hours": 10, "travel": 25, "equipment": 50 }
  includes_vat          BOOLEAN DEFAULT FALSE, -- whether total_price is VAT-inclusive
  vat_amount            DECIMAL(10,2),    -- calculated: total_price * 0.20 or extracted

  -- Presentation
  cover_letter          TEXT,             -- medic's pitch to the client
  estimated_arrival     TEXT,             -- e.g. "30 minutes from site"
  availability_notes    TEXT,             -- any scheduling caveats

  -- Medic snapshot at quote time (denormalized for historical accuracy)
  medic_classification  TEXT NOT NULL,    -- snapshot of medics.classification
  medic_star_rating     DECIMAL(3,2),     -- snapshot of medics.star_rating
  medic_shifts_completed INT,             -- snapshot of medics.total_shifts_completed

  -- Lifecycle
  status                TEXT NOT NULL DEFAULT 'submitted'
                        CHECK (status IN (
                          'draft',         -- medic started but not submitted
                          'submitted',     -- visible to client
                          'shortlisted',   -- client marked as shortlisted
                          'awarded',       -- client accepted this quote
                          'rejected',      -- client explicitly rejected
                          'withdrawn',     -- medic withdrew their quote
                          'expired'        -- event expired/cancelled before decision
                        )),
  submitted_at          TIMESTAMPTZ,
  shortlisted_at        TIMESTAMPTZ,
  awarded_at            TIMESTAMPTZ,
  rejected_at           TIMESTAMPTZ,
  withdrawn_at          TIMESTAMPTZ,

  -- Revision tracking
  revision_number       INT NOT NULL DEFAULT 1,
  previous_quote_id     UUID REFERENCES marketplace_quotes(id),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- One active quote per medic per event
  CONSTRAINT unique_active_quote_per_medic_event
    UNIQUE (event_id, medic_id)
    -- Note: if revisions are stored separately, add WHERE status != 'withdrawn'
);

-- Indexes
CREATE INDEX idx_mp_quotes_event ON marketplace_quotes(event_id);
CREATE INDEX idx_mp_quotes_medic ON marketplace_quotes(medic_id);
CREATE INDEX idx_mp_quotes_status ON marketplace_quotes(status);
CREATE INDEX idx_mp_quotes_event_submitted ON marketplace_quotes(event_id, status)
  WHERE status = 'submitted';
```

**Key design decisions:**
- **Medic sets their own price** -- this is an RFQ, not a platform-calculated rate. The medic's quote is the price.
- **Snapshot columns** -- `medic_classification`, `medic_star_rating`, `medic_shifts_completed` are denormalized snapshots. If the medic's rating changes after quoting, the client still sees the rating at quote time.
- **`UNIQUE(event_id, medic_id)`** -- one active quote per medic per event. Revisions tracked via `revision_number`.
- **`price_breakdown` JSONB** -- flexible because different events have different cost structures.

#### `marketplace_awards` -- Accepted quote linking to bookings

```sql
CREATE TABLE marketplace_awards (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES marketplace_events(id),
  quote_id              UUID NOT NULL REFERENCES marketplace_quotes(id),
  medic_id              UUID NOT NULL REFERENCES medics(id),
  client_id             UUID NOT NULL REFERENCES clients(id),

  -- Pricing at award time (frozen from quote)
  awarded_price         DECIMAL(10,2) NOT NULL,  -- total agreed price (ex-VAT)
  vat_amount            DECIMAL(10,2) NOT NULL,
  total_inc_vat         DECIMAL(10,2) NOT NULL,   -- client pays this total

  -- Platform commission
  platform_fee_percent  DECIMAL(5,2) NOT NULL,    -- e.g. 15.00
  platform_fee_amount   DECIMAL(10,2) NOT NULL,   -- awarded_price * fee%
  medic_payout_amount   DECIMAL(10,2) NOT NULL,   -- awarded_price - platform_fee

  -- Deposit / Remainder payment structure
  deposit_percent       DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  deposit_amount        DECIMAL(10,2) NOT NULL,    -- total_inc_vat * deposit%
  remainder_amount      DECIMAL(10,2) NOT NULL,    -- total_inc_vat - deposit

  -- Payment tracking
  deposit_payment_id    UUID REFERENCES payments(id),
  deposit_stripe_pi     TEXT,             -- Stripe PaymentIntent ID for deposit
  deposit_status        TEXT NOT NULL DEFAULT 'pending'
                        CHECK (deposit_status IN ('pending','processing','succeeded','failed','refunded')),
  deposit_paid_at       TIMESTAMPTZ,

  remainder_payment_id  UUID REFERENCES payments(id),
  remainder_stripe_pi   TEXT,             -- Stripe PaymentIntent ID for remainder
  remainder_status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (remainder_status IN ('pending','processing','succeeded','failed','refunded')),
  remainder_paid_at     TIMESTAMPTZ,

  -- Booking bridge (links to existing SiteMedic booking system)
  booking_id            UUID REFERENCES bookings(id),  -- created after deposit succeeds
  booking_created_at    TIMESTAMPTZ,

  -- Lifecycle
  status                TEXT NOT NULL DEFAULT 'pending_deposit'
                        CHECK (status IN (
                          'pending_deposit',    -- awaiting deposit payment
                          'deposit_paid',       -- deposit charged, booking created
                          'in_progress',        -- event is happening
                          'pending_remainder',  -- event done, awaiting remainder
                          'completed',          -- all payments settled, payout done
                          'cancelled',          -- cancelled (refund logic applies)
                          'disputed'            -- payment or service dispute
                        )),

  awarded_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  cancelled_by          UUID REFERENCES auth.users(id),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- One award per quote
  CONSTRAINT unique_award_per_quote UNIQUE (quote_id)
);

-- Indexes
CREATE INDEX idx_mp_awards_event ON marketplace_awards(event_id);
CREATE INDEX idx_mp_awards_medic ON marketplace_awards(medic_id);
CREATE INDEX idx_mp_awards_client ON marketplace_awards(client_id);
CREATE INDEX idx_mp_awards_booking ON marketplace_awards(booking_id);
CREATE INDEX idx_mp_awards_status ON marketplace_awards(status);
```

**Key design decisions:**
- **Separate deposit + remainder tracking** -- two Stripe PaymentIntents, not one with manual capture. Reasoning: deposit is 7+ days before event; Stripe authorization holds expire after 7 days. Two separate charges are more reliable.
- **`platform_fee_percent` is marketplace-specific** -- NOT the same as existing `medics.platform_fee_percent` (which is for direct bookings). Marketplace commission is typically different (e.g., 15% vs 60%).
- **`booking_id` link** -- the bridge to the existing system. Created by the Booking Creator Edge Function after deposit succeeds.
- **Status machine** covers the full lifecycle from award to completion.

#### `marketplace_ratings` -- Bidirectional ratings

```sql
CREATE TABLE marketplace_ratings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id              UUID NOT NULL REFERENCES marketplace_awards(id),
  event_id              UUID NOT NULL REFERENCES marketplace_events(id),

  -- Who is rating whom
  rater_type            TEXT NOT NULL CHECK (rater_type IN ('client', 'medic')),
  rater_user_id         UUID NOT NULL REFERENCES auth.users(id),
  rated_entity_type     TEXT NOT NULL CHECK (rated_entity_type IN ('client', 'medic')),
  rated_entity_id       UUID NOT NULL, -- medic.id or client.id depending on direction

  -- Rating
  overall_rating        INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  communication_rating  INT CHECK (communication_rating BETWEEN 1 AND 5),
  professionalism_rating INT CHECK (professionalism_rating BETWEEN 1 AND 5),
  value_rating          INT CHECK (value_rating BETWEEN 1 AND 5),
  review_text           TEXT,
  review_visible        BOOLEAN DEFAULT TRUE,  -- can be hidden by platform admin

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- One rating per direction per award
  CONSTRAINT unique_rating_per_award_direction
    UNIQUE (award_id, rater_type)
);

CREATE INDEX idx_mp_ratings_award ON marketplace_ratings(award_id);
CREATE INDEX idx_mp_ratings_medic ON marketplace_ratings(rated_entity_id)
  WHERE rated_entity_type = 'medic';
CREATE INDEX idx_mp_ratings_client ON marketplace_ratings(rated_entity_id)
  WHERE rated_entity_type = 'client';
```

#### `medic_companies` -- Company accounts with medic rosters (Phase 2+)

```sql
CREATE TABLE medic_companies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_medic_id        UUID NOT NULL REFERENCES medics(id),
  company_name          TEXT NOT NULL,
  company_reg_number    TEXT,              -- Companies House number
  vat_number            TEXT,
  company_address       TEXT,
  company_postcode      TEXT,
  company_phone         TEXT,
  company_email         TEXT,
  logo_url              TEXT,

  -- Stripe
  stripe_account_id     TEXT,              -- company-level Stripe Express account
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Status
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'closed')),
  verified_at           TIMESTAMPTZ,       -- platform admin verified
  verified_by           UUID REFERENCES auth.users(id),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE medic_company_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES medic_companies(id) ON DELETE CASCADE,
  medic_id              UUID NOT NULL REFERENCES medics(id),
  role                  TEXT NOT NULL DEFAULT 'member'
                        CHECK (role IN ('owner', 'admin', 'member')),
  joined_at             TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_member_per_company UNIQUE (company_id, medic_id)
);
```

#### `medic_credits` -- Points/credits balance (Phase 3+)

```sql
CREATE TABLE medic_credits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medic_id              UUID NOT NULL REFERENCES medics(id),
  balance               INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned       INT NOT NULL DEFAULT 0,
  lifetime_spent        INT NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_credit_balance UNIQUE (medic_id)
);

CREATE TABLE medic_credit_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medic_id              UUID NOT NULL REFERENCES medics(id),
  amount                INT NOT NULL,      -- positive = earned, negative = spent
  balance_after         INT NOT NULL,
  transaction_type      TEXT NOT NULL CHECK (transaction_type IN (
    'quote_fee',        -- spent credits to submit quote
    'award_bonus',      -- earned credits for winning award
    'completion_bonus', -- earned credits for completing event
    'referral_bonus',   -- earned credits for referring medics
    'purchased',        -- bought credits (Stripe charge)
    'expired',          -- credits expired
    'admin_adjustment'  -- manual adjustment by platform admin
  )),
  reference_id          UUID,              -- quote_id, award_id, etc.
  reference_type        TEXT,              -- 'quote', 'award', 'purchase'
  description           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mc_transactions_medic ON medic_credit_transactions(medic_id);
CREATE INDEX idx_mc_transactions_type ON medic_credit_transactions(transaction_type);
CREATE INDEX idx_mc_transactions_created ON medic_credit_transactions(created_at DESC);
```

### 3.2 Entity Relationship Diagram

```
existing clients ----+
  (has stripe_       |
   customer_id)      |
                     v
            marketplace_events -----+------> marketplace_ratings
                     |              |              ^
                     |              |              |
                     v              |              |
            marketplace_quotes      |              |
              |    (medic sets      |              |
              |     own price)      |              |
              v                     v              |
            marketplace_awards ----+---------------+
              |       |
              |       +----> payments (deposit)
              |       +----> payments (remainder)
              |
              v
    existing bookings -----> timesheets -----> friday-payout
      (auto-created          (existing         (Stripe Transfer
       by bridge)             flow)             to medic)
```

### 3.3 RLS Strategy for Marketplace Tables

The marketplace tables break the standard `org_id` pattern because they are **cross-org by design**. The RLS strategy uses **role-based + ownership policies**:

```sql
-- marketplace_events: Clients see their own; all medics see 'open' events
CREATE POLICY "clients_own_events" ON marketplace_events FOR ALL
  USING (posted_by_user_id = auth.uid());

CREATE POLICY "medics_view_open_events" ON marketplace_events FOR SELECT
  USING (
    status IN ('open', 'reviewing', 'awarded', 'completed')
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'medic'
    )
  );

CREATE POLICY "platform_admin_all_events" ON marketplace_events FOR ALL
  USING (is_platform_admin());

-- marketplace_quotes: Medics see their own; clients see quotes on their events
CREATE POLICY "medics_own_quotes" ON marketplace_quotes FOR ALL
  USING (submitted_by_user_id = auth.uid());

CREATE POLICY "clients_view_quotes_on_their_events" ON marketplace_quotes FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM marketplace_events WHERE posted_by_user_id = auth.uid()
    )
  );

CREATE POLICY "platform_admin_all_quotes" ON marketplace_quotes FOR ALL
  USING (is_platform_admin());

-- marketplace_awards: Both parties + platform admin
CREATE POLICY "award_parties_view" ON marketplace_awards FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid())
  );

CREATE POLICY "platform_admin_all_awards" ON marketplace_awards FOR ALL
  USING (is_platform_admin());
```

**IMPORTANT:** These policies use `auth.uid()` directly (not `get_user_org_id()`) because marketplace data is not org-scoped. This is a deliberate departure from the existing pattern.

---

## 4. Data Flow Diagrams

### 4.1 Event Posting Flow

```
Client (browser)
  |
  1. POST /api/marketplace/events (Server Action)
  |     - Validates client auth + active status
  |     - Validates event data (dates, requirements)
  |     - Inserts marketplace_events (status: 'draft')
  |
  2. Client clicks "Publish"
  |     - UPDATE marketplace_events SET status = 'open', published_at = NOW()
  |
  3. DB trigger fires (or Edge Function cron)
  |     - Finds matching medics by:
  |       a. classification_min <= medic.classification
  |       b. site_postcode within medic's territory range
  |       c. medic available on event_date
  |       d. certifications match requirements
  |     - Calls marketplace-notification-dispatcher Edge Function
  |
  4. marketplace-notification-dispatcher
       - For each matching medic:
         a. Check medic_preferences (push/email/sms)
         b. Send via existing notification-service channels
         c. Log in marketplace_notifications table
```

### 4.2 Quote Submission Flow

```
Medic (browser/app)
  |
  1. GET /marketplace/events (browse open events)
  |     - RLS: medics see all 'open' events
  |     - Filter by vertical, location, date, classification
  |
  2. GET /marketplace/events/[id] (view event detail)
  |     - Shows event requirements, budget range (if visible)
  |     - Shows client's rating + review history
  |     - Shows how many quotes already submitted (count only, not details)
  |
  3. POST /api/marketplace/quotes (Server Action)
  |     - Validates medic auth + qualifications match requirements
  |     - Validates event is still 'open' and before quote_deadline
  |     - Checks no existing active quote from this medic on this event
  |     - Snapshots medic's current classification, rating, shifts
  |     - Inserts marketplace_quotes (status: 'submitted')
  |     - UPDATE marketplace_events SET quote_count = quote_count + 1
  |
  4. Supabase Realtime notifies client
       - Client's dashboard shows new quote via postgres_changes subscription
```

### 4.3 Award + Deposit Flow (CRITICAL PATH)

```
Client (browser)
  |
  1. Reviews quotes on event detail page
  |     - Sees: price, cover letter, medic profile, rating, certs
  |     - Can shortlist quotes (status -> 'shortlisted')
  |
  2. Clicks "Award" on chosen quote
  |     - Frontend shows deposit amount (default 25% of total inc VAT)
  |     - Frontend creates Stripe Checkout / PaymentIntent for deposit
  |
  3. POST /api/marketplace/awards (Server Action)
  |     - Validates event is 'open' or 'reviewing'
  |     - Validates quote is 'submitted' or 'shortlisted'
  |     - TRANSACTION BEGIN:
  |       a. Calculate platform_fee, deposit, remainder amounts
  |       b. INSERT marketplace_awards (status: 'pending_deposit')
  |       c. UPDATE marketplace_quotes SET status = 'awarded' WHERE id = quote_id
  |       d. UPDATE marketplace_quotes SET status = 'rejected' WHERE event_id = X AND id != quote_id
  |       e. UPDATE marketplace_events SET status = 'awarded', awarded_at = NOW()
  |     - TRANSACTION COMMIT
  |     - Returns client_secret for Stripe PaymentIntent
  |
  4. Client completes deposit payment (Stripe Elements / Checkout)
  |
  5. Stripe webhook: payment_intent.succeeded (deposit)
  |     - stripe-webhooks Edge Function identifies marketplace deposit via metadata
  |     - UPDATE marketplace_awards SET deposit_status = 'succeeded', deposit_paid_at = NOW()
  |     - Calls marketplace-booking-creator Edge Function
  |
  6. marketplace-booking-creator Edge Function
  |     - Reads marketplace_award + quote + event data
  |     - Determines target org_id (the medic's org_id from medics table)
  |     - INSERT INTO bookings (...) with:
  |       * client_id from award
  |       * medic_id from award (pre-assigned, not auto-matched)
  |       * org_id from medic's org
  |       * status = 'confirmed'
  |       * source = 'marketplace' (new column on bookings)
  |       * marketplace_award_id (new column on bookings, FK)
  |       * All event details (site, date, hours, etc.)
  |     - INSERT INTO payments (deposit payment record)
  |     - UPDATE marketplace_awards SET booking_id = X, booking_created_at = NOW()
  |     - UPDATE marketplace_awards SET status = 'deposit_paid'
  |
  7. Notification dispatch
       - Medic: "Your quote was accepted! Booking confirmed for [date]"
       - Client: "Deposit received. Medic [name] confirmed for [date]"
       - Other medics: "Event [title] has been awarded" (quotes rejected)
```

### 4.4 Event Completion + Remainder Payment Flow

```
Post-event:
  |
  1. Existing SiteMedic flow handles the shift:
  |     - Medic checks in (geofence)
  |     - Medic logs hours (timesheet)
  |     - Site manager approves timesheet
  |     - Admin approves timesheet
  |
  2. When booking status -> 'completed':
  |     - DB trigger or cron detects marketplace booking completed
  |     - Charges remainder payment:
  |
  3. marketplace-remainder-payment Edge Function
  |     - Looks up marketplace_awards WHERE booking_id = X
  |     - Creates new PaymentIntent for remainder_amount
  |     - Uses client's existing stripe_customer_id + saved payment method
  |     - UPDATE marketplace_awards SET
  |         remainder_stripe_pi = X,
  |         remainder_status = 'processing'
  |
  4. Stripe webhook: payment_intent.succeeded (remainder)
  |     - UPDATE marketplace_awards SET
  |         remainder_status = 'succeeded',
  |         remainder_paid_at = NOW(),
  |         status = 'completed'
  |     - INSERT INTO payments (remainder payment record)
  |
  5. Medic payout happens via existing friday-payout flow:
  |     - Timesheet already has payout_amount based on marketplace commission
  |     - friday-payout transfers to medic's Stripe Express account
  |
  6. Rating prompts sent to both parties
       - marketplace-notification-dispatcher sends:
         * Client: "Rate your medic for [event]"
         * Medic: "Rate your client for [event]"
       - 7-day window to submit rating
       - Ratings update medics.star_rating (weighted average)
```

### 4.5 Cancellation + Refund Flow

```
Cancellation scenarios:

A. CLIENT CANCELS BEFORE DEPOSIT
   - UPDATE marketplace_events SET status = 'cancelled'
   - All quotes -> 'expired'
   - No financial impact

B. CLIENT CANCELS AFTER DEPOSIT, BEFORE EVENT
   - Timeframe determines refund:
     * 7+ days before: Full deposit refund (100%)
     * 3-6 days before: Partial refund (50% of deposit)
     * 0-2 days before: No refund (medic held their schedule)
   - Stripe Refund API on deposit PaymentIntent
   - UPDATE marketplace_awards SET status = 'cancelled'
   - UPDATE bookings SET status = 'cancelled'
   - Medic notified of cancellation

C. MEDIC WITHDRAWS AFTER AWARD, BEFORE EVENT
   - Full deposit refund to client
   - UPDATE marketplace_awards SET status = 'cancelled', cancellation_reason = 'medic_withdrew'
   - Medic's reliability score impacted
   - Client can re-open event or award to another shortlisted quote

D. NO-SHOW (medic doesn't show up)
   - Full deposit refund to client
   - No remainder charged
   - Medic's star_rating impacted
   - Platform admin review triggered

E. DISPUTE (client claims medic didn't perform adequately)
   - marketplace_awards.status -> 'disputed'
   - Remainder payment held (not charged or refunded yet)
   - Platform admin investigates
   - Resolution: full payment, partial refund, or full refund
```

---

## 5. Payment Flow Architecture

### 5.1 Two-Phase Payment Model

The marketplace uses two separate Stripe PaymentIntents (NOT authorize-then-capture) because:

1. **Authorization holds expire after 7 days** -- events may be 2-4 weeks away.
2. **Amount may change** -- remainder could differ if actual hours differ from quoted.
3. **Simpler failure handling** -- each payment is independent.

```
PHASE 1: DEPOSIT (at award time)
  Amount: total_inc_vat * deposit_percent (default 25%)
  When: Immediately when client awards quote
  Method: Stripe PaymentIntent with client's saved card
  Metadata: { type: 'marketplace_deposit', award_id, event_id, quote_id }

PHASE 2: REMAINDER (after event completion)
  Amount: total_inc_vat - deposit_amount (may be adjusted for actual hours)
  When: After timesheet approved (before Friday payout)
  Method: Stripe PaymentIntent with client's saved card (SetupIntent stores card)
  Metadata: { type: 'marketplace_remainder', award_id, event_id, booking_id }
```

### 5.2 Commission Split (Marketplace vs Direct Bookings)

```
DIRECT BOOKING (existing):
  Client pays total -> Platform keeps 60% -> Medic gets 40%
  OR: Client pays total -> Medic gets hourly_rate*hours -> 4-way split of remainder

MARKETPLACE BOOKING (new):
  Client pays medic's quoted price + VAT
  Platform takes X% commission (configurable, suggest 15% default)
  Medic receives (100% - X%) of quoted price
  Commission deducted from medic payout, NOT added on top of client price

  Example: Medic quotes GBP 500 + VAT = GBP 600 total
    Platform fee: GBP 500 * 15% = GBP 75
    Medic payout: GBP 500 - GBP 75 = GBP 425
    Client pays: GBP 600 (no extra markup)
    VAT: GBP 100 (handled by platform's VAT return)

  Deposit: GBP 600 * 25% = GBP 150
  Remainder: GBP 600 - GBP 150 = GBP 450
```

### 5.3 How Marketplace Payments Flow into Existing System

```
marketplace_awards.deposit_payment_id    -> payments table (existing)
marketplace_awards.remainder_payment_id  -> payments table (existing)
marketplace_awards.booking_id            -> bookings table (existing)
  bookings.total = awarded_price + vat
  bookings.platform_fee = platform_fee_amount
  bookings.medic_payout = medic_payout_amount

Then existing flow:
  bookings -> timesheets (medic logs hours)
  timesheets.payout_amount = medic_payout_amount (from marketplace_awards)
  friday-payout -> Stripe Transfer to medic's Express account
```

### 5.4 Stripe Webhook Enhancement

The existing `stripe-webhooks` Edge Function needs new cases:

```typescript
// New webhook cases to add to existing stripe-webhooks/index.ts:
case 'payment_intent.succeeded':
  const metadata = paymentIntent.metadata;
  if (metadata.type === 'marketplace_deposit') {
    await handleMarketplaceDeposit(event);
  } else if (metadata.type === 'marketplace_remainder') {
    await handleMarketplaceRemainder(event);
  } else {
    await handlePaymentIntentSucceeded(event); // existing handler
  }
  break;
```

---

## 6. Notification Architecture

### 6.1 Notification Triggers

| Trigger | Recipients | Channels | Urgency |
|---------|-----------|----------|---------|
| Event published | Matching medics (by location + classification) | Email + Push + Dashboard | Normal |
| New quote received | Event poster (client) | Email + Push + Dashboard | Normal |
| Quote shortlisted | Quoted medic | Push + Dashboard | Normal |
| Quote awarded | Winning medic | Email + SMS + Push | High |
| Quotes rejected | Losing medics | Email + Dashboard | Low |
| Deposit paid | Winning medic + Client | Email + Dashboard | Normal |
| Event reminder (24h) | Awarded medic | Push + SMS | High |
| Event completed | Client | Email + Push | Normal |
| Remainder charged | Client + Medic | Email + Dashboard | Normal |
| Rating prompt | Both parties | Email + Push | Normal |
| Quote deadline approaching | Event poster | Email + Push | Normal |
| Event expired (no award) | Event poster + Quoted medics | Email + Dashboard | Low |
| Cancellation | Affected party | Email + SMS + Push | High |

### 6.2 Notification Infrastructure

Reuse the existing `notification-service` Edge Function but extend it with marketplace notification types:

```typescript
// New notification types to add:
type MarketplaceNotificationType =
  | 'mp_event_match'           // new event matching medic's profile
  | 'mp_quote_received'        // client got a new quote
  | 'mp_quote_shortlisted'     // medic's quote was shortlisted
  | 'mp_quote_awarded'         // medic won the bid
  | 'mp_quote_rejected'        // medic's quote was rejected
  | 'mp_deposit_paid'          // deposit payment confirmed
  | 'mp_event_reminder'        // 24h before event
  | 'mp_event_completed'       // event finished
  | 'mp_remainder_charged'     // remainder payment charged
  | 'mp_rating_prompt'         // please rate the other party
  | 'mp_event_expired'         // event deadline passed
  | 'mp_cancellation';         // booking cancelled
```

### 6.3 Real-Time Dashboard Updates

Use Supabase Realtime `postgres_changes` for live dashboard updates (matching existing pattern in `useScheduleBoardStore.ts`):

```typescript
// Client dashboard: live quote notifications
const channel = supabase
  .channel('marketplace-client')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'marketplace_quotes',
    filter: `event_id=in.(${myEventIds.join(',')})`,
  }, handleNewQuote)
  .subscribe();

// Medic dashboard: live event notifications
const channel = supabase
  .channel('marketplace-medic')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'marketplace_events',
    filter: `status=eq.open`,
  }, handleNewEvent)
  .subscribe();
```

---

## 7. New Columns on Existing Tables

These columns link the marketplace to the existing system without changing existing behavior:

```sql
-- bookings: identify marketplace-originated bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct'
    CHECK (source IN ('direct', 'marketplace')),
  ADD COLUMN IF NOT EXISTS marketplace_award_id UUID
    REFERENCES marketplace_awards(id) ON DELETE SET NULL;

COMMENT ON COLUMN bookings.source IS 'How this booking was created: direct (existing flow) or marketplace (from awarded quote)';

-- clients: marketplace-specific fields
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketplace_rating DECIMAL(3,2) DEFAULT 0.00
    CHECK (marketplace_rating >= 0 AND marketplace_rating <= 5);

-- medics: marketplace-specific fields
ALTER TABLE medics
  ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketplace_bio TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_portfolio JSONB DEFAULT '[]'::jsonb;
  -- portfolio: array of { title, description, image_url, date }
```

---

## 8. Edge Functions: New + Modified

### 8.1 New Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `marketplace-event-matcher` | Find medics matching event requirements | Called when event published |
| `marketplace-notification-dispatcher` | Send marketplace-specific notifications | Called by matcher, award, completion |
| `marketplace-booking-creator` | Create booking row from awarded quote | Called after deposit confirmed |
| `marketplace-remainder-payment` | Charge remainder after event completion | Called after timesheet approved |
| `marketplace-event-expiry` | Auto-expire events past their deadline | pg_cron daily |
| `marketplace-rating-reminder` | Send rating prompts after event completion | pg_cron daily |

### 8.2 Modified Edge Functions

| Function | Modification |
|----------|-------------|
| `stripe-webhooks` | Add marketplace deposit/remainder payment handling via metadata routing |
| `stripe-connect` | Extend `create_payment_intent` to support deposit/remainder types |
| `friday-payout` | Handle marketplace bookings (different commission structure) |
| `notification-service` | Add marketplace notification types |
| `calculate-pricing` | Add marketplace pricing mode (medic-set price, not platform-calculated) |

---

## 9. Next.js Route Structure

```
web/app/
  marketplace/                        -- Public marketplace landing
    page.tsx                          -- Browse open events (authenticated)
    events/
      new/
        page.tsx                      -- Client: post new event (form)
      [id]/
        page.tsx                      -- Event detail (quotes, status)
        quotes/
          page.tsx                    -- Client: view/compare quotes
        award/
          page.tsx                    -- Client: award + pay deposit
    my-events/
      page.tsx                        -- Client: my posted events
    my-quotes/
      page.tsx                        -- Medic: my submitted quotes
    quote/
      [eventId]/
        page.tsx                      -- Medic: submit/edit quote
    awards/
      [id]/
        page.tsx                      -- Award detail + payment status
    ratings/
      [awardId]/
        page.tsx                      -- Submit rating
    profile/
      [medicId]/
        page.tsx                      -- Public medic profile for marketplace
  api/
    marketplace/
      events/
        route.ts                      -- CRUD for events
      quotes/
        route.ts                      -- CRUD for quotes
      awards/
        route.ts                      -- Award creation + payment initiation
      ratings/
        route.ts                      -- Submit ratings
```

---

## 10. Patterns to Follow

### Pattern 1: Event State Machine

**What:** Each marketplace entity (event, quote, award) has a strict status enum with defined transitions.

**Why:** Prevents invalid states (e.g., awarding an already-cancelled event).

```typescript
// Allowed status transitions
const EVENT_TRANSITIONS: Record<string, string[]> = {
  draft:     ['open', 'cancelled'],
  open:      ['reviewing', 'awarded', 'cancelled', 'expired'],
  reviewing: ['open', 'awarded', 'cancelled'],
  awarded:   ['completed', 'cancelled'],
  completed: [],  // terminal
  cancelled: [],  // terminal
  expired:   [],  // terminal
};

function canTransition(current: string, next: string): boolean {
  return EVENT_TRANSITIONS[current]?.includes(next) ?? false;
}
```

### Pattern 2: Service Role for Cross-Org Operations

**What:** Marketplace Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) because marketplace operations cross org boundaries.

**Why:** When a medic in org A quotes on a client's event, the booking may need to be created in org B. Standard user-scoped RLS cannot span orgs.

**Guard:** Every service-role operation MUST validate ownership/authorization in application code before executing, since RLS is bypassed.

### Pattern 3: Snapshot Data in Quotes

**What:** Copy volatile data (medic rating, classification, shift count) into the quote at submission time.

**Why:** If medic's rating changes between quote submission and client review, the client should see the rating that was current when the medic committed to the quote. Also needed for audit trail.

### Pattern 4: Existing Payment Infrastructure Reuse

**What:** Route all marketplace payments through the existing `payments` table and `stripe-webhooks` handler.

**Why:** Single source of truth for financial data. Existing reporting, reconciliation, and payout logic all read from `payments`.

---

## 11. Anti-Patterns to Avoid

### Anti-Pattern 1: Org-Scoping Marketplace Tables

**What:** Adding `org_id` to marketplace tables and using `get_user_org_id()` RLS.

**Why bad:** Marketplace is cross-org by design. Org-scoping would make it impossible for a client in org A to see medics from org B. The entire value proposition of the marketplace is that it spans organizations.

**Instead:** Use user-id-based RLS policies (as shown in Section 3.3). The `booking_id` link brings marketplace data back into org-scope after the award.

### Anti-Pattern 2: Single PaymentIntent with Manual Capture

**What:** Authorizing the full amount at award time, capturing deposit immediately, and capturing remainder later.

**Why bad:** Stripe authorization holds expire after 7 days (even with extended authorization, max 31 days for most cards). Events could be weeks away. Amount may change based on actual hours worked.

**Instead:** Use two separate PaymentIntents. Require client to save a payment method (via SetupIntent) to enable charging the remainder without re-entering card details.

### Anti-Pattern 3: Platform-Calculated Marketplace Pricing

**What:** Using the existing `calculate-pricing` Edge Function (with base_rate, urgency premium, etc.) for marketplace quotes.

**Why bad:** In the marketplace, the MEDIC sets the price, not the platform. The medic knows their costs and can price competitively. The platform's role is to take a commission, not to set the rate.

**Instead:** Medic enters `total_price` in their quote. Platform calculates VAT (20%) and commission (X%). Client sees total_price + VAT.

### Anti-Pattern 4: Tightly Coupling Marketplace to Existing Booking Creation

**What:** Having the marketplace UI directly INSERT into the `bookings` table.

**Why bad:** The `bookings` table has org-scoped RLS. Marketplace UI operates cross-org. Direct inserts would fail on RLS or require disabling it. Also, booking creation has business logic (conflict detection, auto-matching) that should be in one place.

**Instead:** Use the `marketplace-booking-creator` Edge Function (service role) that creates the booking after deposit confirmation. This function handles org assignment, RLS bypass, and all booking-creation business logic in one controlled place.

---

## 12. Build Order (Dependencies)

Build order is dictated by data dependencies. Each phase needs what came before it.

```
PHASE 1: Foundation (must come first)
  - marketplace_events table + RLS
  - marketplace_quotes table + RLS
  - Client event posting UI
  - Medic event browsing UI
  - Basic quote submission
  Dependencies: None (uses existing clients, medics, auth)

PHASE 2: Award + Payment Bridge (depends on Phase 1)
  - marketplace_awards table + RLS
  - Award flow (select quote -> deposit payment)
  - marketplace-booking-creator Edge Function
  - Stripe webhook enhancement (deposit handling)
  - bookings.source + bookings.marketplace_award_id columns
  Dependencies: Phase 1 (events + quotes must exist)

PHASE 3: Completion + Remainder (depends on Phase 2)
  - Remainder payment automation
  - marketplace-remainder-payment Edge Function
  - friday-payout modification for marketplace bookings
  - Payment status tracking in award detail UI
  Dependencies: Phase 2 (awards + bookings must exist)

PHASE 4: Ratings (depends on Phase 3)
  - marketplace_ratings table + RLS
  - Rating submission UI (both sides)
  - Star rating aggregation (update medics.star_rating)
  - Rating display on profiles and quotes
  Dependencies: Phase 3 (completed awards must exist)

PHASE 5: Notifications (can parallelize with Phase 2-4)
  - marketplace-event-matcher Edge Function
  - marketplace-notification-dispatcher Edge Function
  - Notification preferences for marketplace
  - Email templates for marketplace events
  Dependencies: Phase 1 (events must exist for matching)

PHASE 6: Cancellation + Refunds (depends on Phase 2-3)
  - Cancellation flows (all scenarios A-E)
  - Refund logic (tiered by timing)
  - Dispute handling UI
  Dependencies: Phase 2-3 (payments must exist for refunds)

PHASE 7: Medic Companies (can build after Phase 1)
  - medic_companies + medic_company_members tables
  - Company profile UI
  - Company-level quoting
  Dependencies: Phase 1 (basic marketplace must work first)

PHASE 8: Credits System (can build after Phase 1)
  - medic_credits + medic_credit_transactions tables
  - Credit purchase flow (Stripe)
  - Credit spend on quote submission
  - Credit earn on award/completion
  Dependencies: Phase 1 (quote flow must exist)
```

### Critical Path

```
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4
                 \
                  Phase 6

Phase 5 can parallelize with 2-4
Phase 7 can parallelize with 2+
Phase 8 can parallelize with 2+
```

---

## 13. Scalability Considerations

| Concern | At 100 events/month | At 1K events/month | At 10K events/month |
|---------|--------------------|--------------------|---------------------|
| Event matching | Simple query | Index on postcode + vertical | Background job + pre-computed medic-territory mapping |
| Quote notifications | Direct per-medic | Batch emails (Resend batch API) | Message queue (pg_notify -> worker) |
| Real-time updates | postgres_changes fine | Consider Broadcast instead | Definitely Broadcast + client-side throttle |
| Search/filtering | Simple WHERE clauses | Add PostGIS for location | Full-text search (pg_trgm) + PostGIS + possibly Typesense |
| Payment processing | Synchronous | Synchronous with retry | Queue with idempotency keys |

---

## 14. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Medics seeing other medics' quotes | RLS: medics see only their own quotes. Clients see all quotes on their events. |
| Price manipulation | Quote price is write-once after submission (updates create new revision, not modify). |
| Sybil quotes (fake medics) | Only medics with `stripe_onboarding_complete = TRUE` and verified certs can quote. |
| Payment fraud | Stripe handles card verification. Deposit before booking prevents no-payment risk. |
| Cross-org data leakage | Marketplace RLS uses user_id, not org_id. Booking creation uses service role with explicit ownership validation. |
| Rating manipulation | One rating per direction per award (UNIQUE constraint). Ratings only allowed after event completion. |

---

## Sources

- Stripe Payment Intents documentation: [Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- Stripe Multicapture documentation: [Capture a payment multiple times](https://docs.stripe.com/payments/multicapture)
- Stripe Connect documentation: [Platforms and marketplaces](https://docs.stripe.com/connect)
- Supabase Realtime Postgres Changes: [Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes)
- Supabase Realtime Broadcast: [Broadcast docs](https://supabase.com/docs/guides/realtime/broadcast)
- Existing SiteMedic codebase analysis (migrations 002, 028, 101, 117-138; Edge Functions: stripe-connect, stripe-webhooks, notification-service, friday-payout, calculate-pricing)
