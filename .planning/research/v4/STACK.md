# Technology Stack: MedBid Marketplace

**Project:** MedBid -- RFQ marketplace for SiteMedic
**Researched:** 2026-02-19
**Scope:** What ADDITIONAL libraries/services/infrastructure are needed beyond the existing SiteMedic stack?

---

## Existing Stack (Confirmed via Codebase Audit)

Everything below already exists and is confirmed in the codebase. These handle the majority of MedBid's needs without any new dependencies.

| Technology | Version | Already Handles |
|------------|---------|----------------|
| Next.js (App Router) | ^15.2.3 | Routing, SSR, Server Actions, API routes |
| React | ^19.0.0 | UI rendering, Server Components |
| Supabase (supabase-js) | ^2.95.3 | PostgreSQL, Auth, Storage, Edge Functions, Realtime |
| Supabase SSR | ^0.8.0 | Server-side auth in Next.js |
| Stripe (stripe) | ^20.3.1 | Server-side payment processing |
| @stripe/react-stripe-js | ^5.6.0 | Client-side Stripe Elements |
| @stripe/stripe-js | ^8.7.0 | Stripe.js loader |
| TanStack React Query | ^5.90.21 | Data fetching, caching, invalidation |
| Zustand | ^5.0.11 | Client state management (stores) |
| Resend | ^6.9.2 | Transactional email (already integrated) |
| Tailwind CSS | ^3.4.17 | Styling |
| Radix UI | Various ^1.x-2.x | Accessible primitives (dialog, popover, tabs, select, etc.) |
| Lucide React | ^0.564.0 | Icons |
| Sonner | ^2.0.7 | Toast notifications |
| date-fns | ^4.1.0 | Date manipulation |
| react-leaflet | ^5.0.0 | Map display |
| @react-pdf/renderer | ^4.3.2 | PDF generation |
| react-papaparse | ^4.4.0 | CSV parsing |
| class-variance-authority | ^0.7.1 | Component variant styling |
| clsx + tailwind-merge | Various | Conditional class merging |

### Existing Infrastructure That Maps Directly to MedBid Features

| MedBid Need | Existing Infrastructure | Notes |
|-------------|------------------------|-------|
| User authentication | Supabase Auth | Existing user/medic/client accounts. Marketplace users = same auth system. |
| Medic payouts after event | Stripe Connect (Express accounts) | `stripe-connect` Edge Function already creates accounts, `friday-payout` handles transfers. Reuse as-is for marketplace payouts. |
| Client payment processing | Stripe PaymentIntents | `stripe-connect` Edge Function already creates PaymentIntents. Extend for deposit/remainder flow. |
| Pricing calculation | `calculate-pricing` Edge Function + `web/lib/booking/pricing.ts` | MedBid quotes will have medic-set pricing (not platform-set), but commission split logic reuses `platform_fee_percent` / `medic_payout_percent`. |
| Email notifications | Resend (via `web/lib/email/resend.ts` + `supabase/functions/_shared/email-templates.ts`) | Already handles transactional email. Add new templates for quote/award events. |
| SMS notifications | Twilio (via `notification-service` Edge Function) | Already sends SMS. Add marketplace notification types. |
| Push notifications | Expo Push (via `notification-service` Edge Function) | Already sends push. Add marketplace notification types. |
| Real-time updates | Supabase Realtime | Already used in schedule board, medic locations, alerts. Add channels for quote feed / marketplace events. |
| File storage | Supabase Storage | Already has buckets for safety reports, contracts, invoices, etc. Add marketplace bucket for medic portfolio/certs. |
| Geographic matching | Territory/postcode system | Existing territory tables. Can filter marketplace listings by region. |
| Data tables | @tanstack/react-table ^8.21.3 | Already used for admin tables. Reuse for quote comparison, marketplace admin. |
| Form handling | react-hook-form ^7.71.1 | Used across web app (booking forms, admin forms). Reuse for all marketplace forms. |
| Booking creation | Existing bookings table + booking flow | Awarded quotes auto-create bookings -- reuse existing booking infrastructure. |

**Confidence: HIGH** -- All confirmed via direct codebase inspection.

---

## New Dependencies Required

### 1. Zod -- Schema Validation (NEW)

| | |
|---|---|
| **Package** | `zod` |
| **Version** | `^4.3.6` (current stable as of Feb 2026) |
| **Also install** | `@hookform/resolvers` (to connect Zod with react-hook-form) |
| **Confidence** | HIGH -- Version verified via npm registry search |

**Why needed:** The marketplace introduces complex, multi-step forms (event posting with 10+ fields, quote submission with price breakdown + cover letter + availability, medic registration with certifications). The existing codebase does NO schema validation -- forms use manual checks or none at all. For a public-facing marketplace with untrusted input from new users, schema validation is non-negotiable.

**Why Zod specifically:**
- TypeScript-first: infers types from schemas, eliminating type/validation drift
- Shared schemas: Same Zod schema validates client-side (react-hook-form) AND server-side (Server Actions / API routes). One source of truth.
- Already the standard pairing with react-hook-form in Next.js 15 App Router projects
- The project already uses react-hook-form -- `@hookform/resolvers` connects them with zero boilerplate
- Zod v4 is stable and production-ready

**What NOT to use:**
- **Yup** -- Older, larger bundle, weaker TypeScript inference. Zod has superseded it in the React ecosystem.
- **Valibot** -- Newer/smaller but ecosystem support is thinner. Zod is the safer bet for production.
- **Manual validation** -- The current approach. Unacceptable for a public marketplace.

**Installation:**
```bash
pnpm add zod @hookform/resolvers
```

**Example usage pattern:**
```typescript
// shared schema: web/lib/marketplace/schemas/event-post.ts
import { z } from 'zod';

export const eventPostSchema = z.object({
  title: z.string().min(10).max(200),
  eventType: z.enum(['festival', 'sports', 'corporate', 'construction', 'other']),
  startDate: z.coerce.date().min(new Date()),
  endDate: z.coerce.date(),
  location: z.string().min(5),
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i),
  medicsRequired: z.number().int().min(1).max(50),
  description: z.string().min(50).max(5000),
});

export type EventPostInput = z.infer<typeof eventPostSchema>;
// ^ TypeScript type is automatically derived -- no manual interface needed
```

---

### 2. Rating Display -- Build Custom (NO new package)

| | |
|---|---|
| **Recommendation** | Build a custom `<StarRating>` component |
| **Confidence** | HIGH |

**Why NOT install a rating library:**
- The project already uses Radix UI + Lucide icons (which include `Star` and `StarHalf` icons)
- A star rating display is ~30 lines of code with Lucide's Star icon + Tailwind
- The interactive rating input (for submitting reviews) is a simple radio group -- Radix UI already provides `@radix-ui/react-radio-group`
- `@smastrom/react-rating` (the best option) hasn't been updated in 2 years and has no confirmed React 19 compatibility
- Adding a dependency for 30 lines of code is wrong for this codebase

**Build pattern:**
```typescript
// Display: Star + StarHalf from lucide-react (already installed)
// Input: Radix radio-group (already installed) styled as stars
// Both are ~30 lines each, fully accessible, zero new deps
```

---

### 3. Stripe Patterns for Deposit + Remainder (NO new package)

| | |
|---|---|
| **Recommendation** | Use existing Stripe SDK with SetupIntent + two PaymentIntents pattern |
| **Confidence** | HIGH |

**The deposit/remainder payment flow for MedBid:**

The naive approach -- `capture_method: 'manual'` to hold a deposit, then capture the remainder later -- does NOT work because:
- Standard card holds expire after **7 days** (online payments)
- Extended authorization only goes to **30 days** and requires special enrollment
- Events may be weeks/months in the future
- Multicapture is not universally available

**Correct pattern: SetupIntent + Two Separate PaymentIntents**

1. **On quote award:** Create a PaymentIntent for the **deposit amount** (e.g., 30% of total). Charge immediately. Also use `setup_future_usage: 'off_session'` to save the card.
2. **After event completion:** Create a SECOND PaymentIntent for the **remainder** (70%), using the saved payment method with `off_session: true`.

This uses the **existing** `stripe` package (^20.3.1) and existing `stripe-connect` Edge Function pattern. No new dependencies needed. The only change is adding new actions to the Edge Function:
- `create_deposit_payment` -- Charge deposit + save card
- `create_remainder_payment` -- Charge remainder off-session
- Handle new webhook events: extend existing `stripe-webhooks` Edge Function

**What NOT to do:**
- **Manual capture** -- 7-day hold expiry makes this unusable for events booked weeks ahead
- **Stripe Checkout Sessions** -- Overkill, redirects user to Stripe-hosted page. The existing PaymentElement flow is better for the UX.
- **Stripe Invoicing** -- Different product entirely, designed for B2B invoice sending, not marketplace deposits

**References:**
- [Stripe: Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) -- Documents the 7-day limit
- [Stripe: Save and reuse payment methods](https://docs.stripe.com/payments/save-and-reuse) -- SetupIntent + off-session charging
- [Stripe: Separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) -- Marketplace payout pattern

---

### 4. In-App Notification Feed -- Supabase Realtime + New Table (NO new package)

| | |
|---|---|
| **Recommendation** | New `marketplace_notifications` table + Supabase Realtime subscriptions |
| **Confidence** | HIGH |

**Why no new package:** Supabase Realtime is already integrated and working (schedule board, medic locations, alerts use it). The marketplace notification feed is the same pattern:

1. **Database table:** `marketplace_notifications` with columns: `id`, `user_id`, `type` (enum: quote_received, quote_awarded, event_posted, review_received, etc.), `title`, `body`, `data` (JSONB for links/metadata), `read_at`, `created_at`
2. **Real-time subscription:** Client subscribes to `marketplace_notifications` filtered by `user_id` (same pattern as `useMedicAlertsStore.ts`)
3. **Edge Function trigger:** Database webhook fires when new row inserted, triggers the existing `notification-service` Edge Function for email/SMS/push delivery
4. **Dashboard feed:** Zustand store (same pattern as existing stores) manages the notification list, unread count, mark-as-read

**What NOT to use:**
- **Novu / Knock / OneSignal** -- Third-party notification SaaS. Adds cost, complexity, vendor lock-in when you already have Supabase Realtime + Resend + Twilio. Overkill for this scale.
- **Firebase Cloud Messaging** -- Already using Expo Push. Don't add a second push system.
- **Server-Sent Events (SSE)** -- Supabase Realtime already uses WebSockets. Don't add a parallel real-time transport.

---

### 5. Search / Filtering -- PostgreSQL Full-Text Search (NO new package)

| | |
|---|---|
| **Recommendation** | Supabase/PostgreSQL full-text search with GIN indexes |
| **Confidence** | HIGH |

**Why not Algolia/Meilisearch:** The marketplace search is structured filtering (location, event type, date range, medic classification, price range) with optional text search on titles/descriptions. This is:
- **Structured query territory** -- PostgreSQL excels at this with proper indexes
- **Low volume initially** -- Hundreds to low thousands of listings, not millions
- **Already in Supabase** -- No external service needed
- **Cost-effective** -- No per-search-request billing

**Implementation:**
```sql
-- Add GIN index for full-text search on event listings
ALTER TABLE marketplace_events
  ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(location, '')), 'C')
    ) STORED;

CREATE INDEX idx_events_search ON marketplace_events USING GIN(search_vector);
```

**When to reconsider:** If the marketplace grows past ~50,000 active listings AND users complain about search quality (typo tolerance, synonym matching), THEN evaluate Meilisearch Cloud. Not before.

---

### 6. Credits/Points System -- Database-Only Design (NO new package)

| | |
|---|---|
| **Recommendation** | PostgreSQL tables + Edge Function for credit operations |
| **Confidence** | HIGH |

**The Upwork Connects model adapted for MedBid:**

This is a database design problem, not a library problem. Credits are just a ledger:

```sql
-- Credit balance per medic
-- credits_balance is a denormalized running total; credit_transactions is the source of truth
CREATE TABLE medic_credit_balances (
  medic_id UUID PRIMARY KEY REFERENCES medics(id),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medic_id UUID NOT NULL REFERENCES medics(id),
  amount INTEGER NOT NULL,  -- positive = credit, negative = debit
  type TEXT NOT NULL,        -- 'purchase', 'quote_submitted', 'quote_refund', 'bonus', 'signup_grant'
  reference_id UUID,         -- links to quote, purchase, etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Business rules (later phase):**
- New medic signup: grant N free credits
- Submitting a quote: debit X credits (varies by event size/tier)
- Quote not viewed by client within Y days: refund credits
- Credit purchase: Stripe PaymentIntent -> credit balance (NOT a subscription)

**What NOT to use:**
- **Stripe Billing/Subscriptions** for credits -- Credits are a prepaid balance, not a recurring subscription. Using Stripe Billing adds unnecessary complexity.
- **Third-party virtual currency platforms** -- Overkill. This is a simple ledger with a few hundred transactions per day max.

---

## Recommended New Package Summary

| Package | Version | Purpose | Urgency |
|---------|---------|---------|---------|
| `zod` | ^4.3.6 | Schema validation for all marketplace forms | Phase 1 (immediate) |
| `@hookform/resolvers` | ^5.x (latest) | Connects Zod schemas to react-hook-form | Phase 1 (immediate) |

**That is the entire list.** Two packages. Everything else is handled by existing infrastructure.

### Installation Command

```bash
cd /Users/sabineresoagli/GitHub/sitemedic/web && pnpm add zod @hookform/resolvers
```

---

## Alternatives Considered and Rejected

| Category | Recommendation | Alternative | Why Rejected |
|----------|---------------|-------------|--------------|
| Schema validation | Zod | Yup | Weaker TS inference, larger bundle, declining ecosystem share |
| Schema validation | Zod | Valibot | Too new, smaller ecosystem, less community support |
| Rating component | Custom (Lucide + Radix) | @smastrom/react-rating | Not updated in 2 years, React 19 compat unverified, trivial to build |
| Rating component | Custom (Lucide + Radix) | MUI Rating | Would pull in entire MUI system for one component |
| Search | PostgreSQL FTS | Algolia | Expensive per-query pricing, overkill for structured filtering at this scale |
| Search | PostgreSQL FTS | Meilisearch | Adds operational overhead (separate service), premature for launch scale |
| Notifications | Supabase Realtime | Novu/Knock | Third-party SaaS cost + complexity when existing Realtime works perfectly |
| Notifications | Supabase Realtime | Firebase FCM | Already using Expo Push. Don't split notification infrastructure. |
| Payments | SetupIntent + 2x PI | Manual capture | 7-day hold limit makes it unusable for advance-booked events |
| Payments | SetupIntent + 2x PI | Stripe Checkout | Redirects to Stripe-hosted page. Worse UX than embedded PaymentElement. |
| Payments | SetupIntent + 2x PI | Stripe Invoicing | B2B invoice tool, wrong product for marketplace deposit flow |
| Credits system | Database ledger | Stripe Billing | Credits are prepaid balance, not subscription. Wrong model. |
| File uploads | Supabase Storage + Server Actions | UploadThing/Cloudinary | Already have Supabase Storage with buckets. No need for another file service. |
| Forms | react-hook-form (existing) | Formik | RHF already in codebase, better performance, uncontrolled-first |
| State management | Zustand (existing) | Redux/Jotai | Zustand already in codebase with established patterns |
| Real-time | Supabase Realtime (existing) | Socket.io/Pusher | Already integrated, working, free with Supabase plan |

---

## Infrastructure Changes Required (No New Services)

### Supabase Database (New Tables)

| Table | Purpose |
|-------|---------|
| `marketplace_events` | Client event postings (the "RFQ") |
| `marketplace_quotes` | Medic quote submissions |
| `marketplace_awards` | Awarded quotes linking to bookings |
| `marketplace_reviews` | Bidirectional ratings (client <-> medic) |
| `marketplace_notifications` | In-app notification feed |
| `medic_credit_balances` | Credit balance per medic (later phase) |
| `credit_transactions` | Credit ledger (later phase) |
| `medic_profiles_public` | Public-facing medic profile data (separate from internal `medics` table for RLS clarity) |

### Supabase Edge Functions (New or Extended)

| Function | New/Extend | Purpose |
|----------|-----------|---------|
| `stripe-connect` | **Extend** | Add `create_deposit_payment` and `create_remainder_payment` actions |
| `stripe-webhooks` | **Extend** | Handle deposit/remainder payment events, update marketplace_awards status |
| `notification-service` | **Extend** | Add marketplace notification types (quote_received, quote_awarded, event_posted, review_received, etc.) |
| `marketplace-quote-engine` | **New** | Quote submission validation, credit deduction (later), auto-booking creation on award |
| `marketplace-review-engine` | **New** | Review submission, aggregate rating calculation, fraud detection |
| `calculate-pricing` | **Extend** | Add marketplace commission calculation mode (medic sets price, platform takes commission from medic's side) |

### Supabase Storage (New Buckets)

| Bucket | Purpose |
|--------|---------|
| `marketplace-attachments` | Quote attachments, event requirement documents |
| `medic-portfolios` | Public portfolio images for medic profiles |

### Supabase Realtime (New Channels)

| Channel | Purpose |
|---------|---------|
| `marketplace_events:{postcode_region}` | New event listings in a region (for medic dashboard) |
| `marketplace_quotes:{event_id}` | Quote submissions on an event (for client dashboard) |
| `marketplace_notifications:{user_id}` | Personal notification feed |

---

## Version Compatibility Matrix

| Package | Version | React 19 | Next.js 15 | Notes |
|---------|---------|----------|------------|-------|
| zod | ^4.3.6 | Yes (framework-agnostic) | Yes | No React dependency |
| @hookform/resolvers | ^5.x | Yes | Yes | Works with react-hook-form ^7.x |
| react-hook-form (existing) | ^7.71.1 | Yes | Yes | Already in codebase, React 19 compatible |
| @supabase/supabase-js (existing) | ^2.95.3 | Yes | Yes | Already working |
| stripe (existing) | ^20.3.1 | N/A (server only) | Yes | Already working |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Existing stack reuse | HIGH | Direct codebase inspection confirms all capabilities |
| Zod recommendation | HIGH | Version verified via npm, standard pairing with RHF + Next.js 15 |
| Stripe deposit/remainder pattern | HIGH | Stripe docs confirm 7-day hold limit; SetupIntent pattern is well-documented |
| Rating: build custom | HIGH | Lucide + Radix already in codebase; trivial to implement |
| PostgreSQL FTS over Algolia | HIGH | Correct for structured filtering at launch scale |
| Credits as DB ledger | MEDIUM | Standard pattern but specific business rules (pricing per credit, refund policy) will need product decisions |
| Notification architecture | HIGH | Exact same pattern as existing schedule board / medic alerts |

---

## Sources

- Codebase inspection: `web/package.json`, `package.json` (root), all files referenced in audit
- [Stripe: Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) -- 7-day hold limit
- [Stripe: Multicapture](https://docs.stripe.com/payments/multicapture) -- Limited availability, not reliable for this use case
- [Stripe: Save and reuse payment methods](https://docs.stripe.com/payments/save-and-reuse) -- SetupIntent pattern
- [Stripe: Separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) -- Marketplace payout pattern
- [Supabase: Full Text Search](https://supabase.com/docs/guides/database/full-text-search) -- PostgreSQL FTS with Supabase
- [Supabase: Realtime](https://supabase.com/docs/guides/realtime) -- Real-time subscription patterns
- [Zod npm](https://www.npmjs.com/package/zod) -- v4.3.6 current stable
- [@smastrom/react-rating npm](https://www.npmjs.com/package/@smastrom/react-rating) -- Last updated 2 years ago, React 18 minimum
- [Upwork Connects](https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects) -- Credits system business model reference
- [Supabase blog: Postgres FTS vs the rest](https://supabase.com/blog/postgres-full-text-search-vs-the-rest) -- When to use PG FTS vs external search
