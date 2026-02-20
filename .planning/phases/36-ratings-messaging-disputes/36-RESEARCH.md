# Phase 36: Ratings, Messaging & Disputes — Research

**Researched:** 2026-02-19
**Status:** Complete

## 1. Existing Ratings Infrastructure

### Database (Migration 148: `job_ratings`)
- Table: `job_ratings` with columns: `id`, `job_id` (FK marketplace_events), `booking_id` (nullable), `rater_user_id`, `rater_type` ('company'|'client'), `rating` (1-5), `review` (text), `created_at`, `updated_at`
- UNIQUE(job_id, rater_user_id) — one rating per rater per job
- RLS: split INSERT/UPDATE/DELETE for own rows + platform_admin full access + authenticated SELECT (public within platform)
- Indexes: `idx_job_ratings_job_id`, `idx_job_ratings_rater_user_id`

### Existing UI Components
- **RatingForm** (`web/components/direct-jobs/RatingForm.tsx`): 5-star selector (Lucide icons), optional review textarea (2000 char max), pre-fill for editing, loading/success states
- **StarDisplay**: Read-only star display component (size: 'sm'|'md'), exported from RatingForm
- **Job Detail Integration** (`web/app/(dashboard)/dashboard/jobs/[id]/page.tsx`): Rating section visible only when `job.status === 'completed'`

### API Pattern
- **GET/POST** `/api/direct-jobs/[id]/ratings` — returns `{ ratings, averageRating, count }`, POST upserts with validation
- Average: `Math.round((sum / count) * 10) / 10` (1 decimal)

### Best-Value Scoring (Phase 34-02)
- File: `web/lib/marketplace/quote-scoring.ts`
- Formula: `bestValueScore = (priceScore * 0.6) + (ratingScore * 0.4)` where `ratingScore = (company_rating / 5) * 100`
- Tiebreaker: `submitted_at DESC` then `company_rating DESC`
- Quote types already carry `company_rating` (number 0-5) and `company_review_count` (number) — currently placeholders, Phase 36 populates

### Quote Display Components
- **QuoteRankRow** (`web/components/marketplace/quote-comparison/QuoteRankRow.tsx`): Shows `renderStars(company_rating)` + `(company_review_count)` in collapsed view
- **QuoteListView**: Applies `rankQuotesByBestValue()` client-side, sort modes include 'rating'

### Key Implication
The `job_ratings` table schema works for both direct and marketplace jobs (FK to `marketplace_events`). Phase 36 needs:
1. New marketplace-specific API route (event-based, not job-based)
2. Blind window logic (neither sees until both rate or 14 days)
3. Aggregate rating computation → update `marketplace_companies` or denormalize into quotes
4. Moderation (report/flag, admin review, removal)

## 2. Existing Messaging Infrastructure

### Database (Migration 143: `conversations`, `messages`)
- **conversations**: `org_id`, `type` ('direct'|'broadcast'), `medic_id`, `created_by`, `last_message_at`, `last_message_preview`
- **messages**: `conversation_id`, `sender_id`, `message_type` ('text'|'attachment'|'system'), `content`, `metadata` (JSONB), `status` ('sent'|'delivered'|'read'), denormalized `org_id`, soft-delete via `deleted_at`
- **conversation_read_status**: Composite key (user_id, conversation_id), `last_read_at`
- **message_recipients**: For broadcast read tracking

### RLS Pattern
- Internal messaging uses **org_id-scoped** RLS (NOT user_id) — `get_user_org_id()` wrapper pattern
- Marketplace messaging will need **user_id-scoped** RLS (cross-org by design, matching v4.0 marketplace pattern)

### API Routes
- `POST /api/messages/conversations` — create or get (SELECT-then-INSERT with unique constraint catch)
- `POST /api/messages/send` — insert + update conversation metadata + upsert sender read status
- `PATCH /api/messages/conversations/[id]/read` — mark read
- `POST /api/messages/broadcast` — admin-only broadcast

### Realtime Pattern (Phase 43)
- Single channel per org: `web-messages:org_{orgId}`
- Listens: INSERT on messages (filter org_id), UPDATE on conversations (filter org_id)
- Cache invalidation: invalidates `['messages', conversationId]` and `['conversations']`
- Replaces polling entirely

### Push Notifications (Migration 150 trigger + Edge Function)
- DB trigger `notify_new_message()` fires AFTER INSERT on messages
- Async pg_net POST to Edge Function (GDPR-safe: passes only IDs, never content)
- Edge Function: resolves push_tokens, batch sends via Expo Push API

### Email Pattern (Resend)
- Shared client at `web/lib/email/resend.ts` with dev fallback (console.log if no RESEND_API_KEY)
- React Email templates rendered to HTML
- Non-blocking: each send wrapped in try/catch

### Key Implication for Marketplace Messaging
Marketplace messaging is **separate** from internal org messaging. Needs:
1. New `marketplace_conversations` table (or `conversations` with `type='marketplace'`) — scoped by event, not org
2. User_id-based RLS (not org_id) since client and company are in different orgs
3. Contact gating: messaging allowed ONLY via platform, no contact details in messages
4. Separate Realtime channel pattern (user-scoped, not org-scoped)
5. Email notifications matching Airbnb pattern (sender name + preview + event context + link)

## 3. Payment & Stripe Infrastructure

### Deposit/Remainder Two-PaymentIntent Pattern
- **Deposit**: Created at award time with `setup_future_usage: 'off_session'` to save card
- **Remainder**: Charged off-session by Edge Function (`charge-remainder-payment`) scheduled via pg_cron daily at 8 AM UTC
- Retry: 3 attempts at +1d, +3d, +7d intervals with idempotency keys

### Booking Columns (Migration 149)
- `deposit_amount`, `deposit_percent`, `remainder_amount`, `remainder_due_at`, `remainder_paid_at`
- `remainder_failed_attempts`, `remainder_last_failed_at`
- `stripe_customer_id`, `stripe_payment_method_id`, `deposit_payment_intent_id`, `remainder_payment_intent_id`
- Partial index: `idx_bookings_remainder_due_unpaid` for cron queries

### Existing Cancellation Pattern
- File: `web/app/api/bookings/[id]/cancel/route.ts`
- Direct booking refund tiers: 7+ days = 100%, 3-6 days = 50%, <72h = 0%
- Updates status to 'cancelled' with metadata (cancelled_at, cancellation_reason, cancelled_by, refund_amount)
- Stripe refund: fire-and-forget
- Only pending/confirmed bookings cancelable

### Marketplace-Specific Cancellation (Phase 36 Needs)
- Different tiers: >14 days = full, 7-14 days = 50%, <7 days = 0%
- Must handle BOTH deposit refund AND remainder cancellation
- Company cancellation = always full refund to client
- Stripe refund on deposit PI, cancel/don't-create remainder PI

### Award History Audit Trail
- Table: `marketplace_award_history` (migration 149) — records event_id, winning_quote_id, losing_quote_ids, deposit breakdown

### Notification Functions
- File: `web/lib/marketplace/notifications.ts`
- Functions: award notification, rejection notification, deposit confirmation, remainder failure
- All try/catch wrapped, non-blocking
- FROM: 'SiteMedic Marketplace <marketplace@sitemedic.co.uk>'

## 4. Storage Patterns

### Compliance Documents Bucket (Migration 142)
- Bucket: `compliance-documents`, private, 10MB limit
- MIME: PDF, JPEG, PNG
- Path: `{company_id}/{document_type}/{filename}`
- RLS: folder-scoped via `(storage.foldername(name))[1]` + marketplace_companies join

### Dispute Evidence (Phase 36 Needs)
- New bucket: `dispute-evidence` (similar pattern to compliance-documents)
- Path: `{dispute_id}/{filename}` — scoped by dispute
- RLS: dispute parties + platform admin can access
- Same MIME types + potential additions (screenshots, documents)

## 5. Marketplace Schema Context

### marketplace_events (Migration 145)
- Statuses: draft → open → closed → cancelled | awarded → confirmed → in_progress → completed
- Columns: posted_by, event_name, event_type, description, quote_deadline, source ('marketplace'|'direct')
- Location: PostGIS GEOGRAPHY for coordinates

### marketplace_quotes (Migration 146)
- Statuses: draft → submitted → revised | withdrawn | awarded | rejected
- Columns: event_id, company_id, total_price, pricing_breakdown (JSONB), staffing_plan (JSONB), cover_letter
- Quote count synced to marketplace_events via triggers

### marketplace_companies (Migration 140)
- Columns: company_name, verification_status, coverage_areas, company_description, admin_user_id
- Will need: `average_rating`, `review_count` columns (or computed view)

## 6. Architecture Decisions for Phase 36

### Ratings
1. **Reuse `job_ratings` table** — already supports marketplace_events FK. Add `blind_window_expires_at` column for the 14-day blind window
2. **Aggregate ratings**: Materialized view or denormalized columns on `marketplace_companies` (`average_rating`, `review_count`) — updated by trigger on INSERT/UPDATE to job_ratings
3. **Moderation**: Add `moderation_status` ('published'|'flagged'|'removed'), `flagged_at`, `flagged_by`, `moderation_notes` to job_ratings
4. **Blind window**: Computed from event completion date + 14 days. API checks: if both rated OR window expired → visible; else → hidden

### Marketplace Messaging
1. **Separate table**: `marketplace_messages` + `marketplace_conversations` (NOT reusing internal messaging tables) — different RLS model (user_id vs org_id), different conversation scope (per-event vs per-org)
2. **Conversation model**: One conversation per (event_id, company_id) — allows pre-quote questions AND post-quote communication
3. **Contact gating**: Server-side strip of any phone/email patterns in message content? Or just rely on ToS + platform design
4. **Realtime**: User-scoped channel `marketplace-messages:user_{userId}` — listen for own conversations
5. **Email notifications**: Airbnb-style — sender name, ~100 char preview, event name, "Reply on SiteMedic" CTA (never full content)

### Disputes
1. **New table**: `marketplace_disputes` with: event_id, filed_by, dispute_category, description, evidence_urls[], status ('open'|'under_review'|'resolved'), resolution_type, resolution_notes, resolved_by, resolved_at
2. **Payment hold**: On dispute creation, set `remainder_hold = true` on booking — cron job skips held bookings
3. **Resolution outcomes**: Full refund, Partial refund (admin % input), Dismiss (company keeps all), Suspend party
4. **Admin UI**: Dispute detail page with timeline, evidence viewer, both parties' statements, resolution form

### Cancellation
1. **Marketplace-specific tiers**: >14 days = full deposit refund, 7-14 days = 50%, <7 days = 0%
2. **Separate route**: `/api/marketplace/events/[id]/cancel` (not reusing booking cancel)
3. **Company cancellation**: Always full refund, option to propose reschedule via messaging first
4. **Stripe refund**: Partial or full refund on deposit PaymentIntent, cancel remainder scheduling

## 7. File Locations Reference

| Category | Key Files |
|----------|-----------|
| Rating schema | `supabase/migrations/148_direct_job_ratings.sql` |
| Rating UI | `web/components/direct-jobs/RatingForm.tsx` |
| Rating API | `web/app/api/direct-jobs/[id]/ratings/route.ts` |
| Quote scoring | `web/lib/marketplace/quote-scoring.ts` |
| Quote display | `web/components/marketplace/quote-comparison/QuoteRankRow.tsx` |
| Internal messaging schema | `supabase/migrations/143_comms_docs_schema.sql` |
| Internal messaging API | `web/app/api/messages/send/route.ts` |
| Internal messaging UI | `web/app/(dashboard)/messages/components/` |
| Realtime hooks | `web/lib/queries/comms.hooks.ts` |
| Push notification trigger | `supabase/migrations/150_message_notification_trigger.sql` |
| Push notification Edge Fn | `supabase/functions/send-message-notification/index.ts` |
| Award flow API | `web-marketplace/app/api/marketplace/quotes/[id]/award/route.ts` |
| Remainder cron | `supabase/functions/charge-remainder-payment/index.ts` |
| Booking bridge | `web/lib/marketplace/booking-bridge.ts` |
| Award calculations | `web/lib/marketplace/award-calculations.ts` |
| Webhook handler | `web/app/api/stripe/webhooks/route.ts` |
| Marketplace notifications | `web/lib/marketplace/notifications.ts` |
| Email client | `web/lib/email/resend.ts` |
| Storage bucket | `supabase/migrations/142_marketplace_storage_bucket.sql` |
| Booking cancel API | `web/app/api/bookings/[id]/cancel/route.ts` |
| Marketplace types | `web/lib/marketplace/types.ts`, `quote-types.ts` |

---

*Phase: 36-ratings-messaging-disputes*
*Researched: 2026-02-19*
