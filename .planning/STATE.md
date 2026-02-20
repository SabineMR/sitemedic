# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v5.0 Internal Comms & Document Management -- Phase 47 Message Polish complete, v5.0 MILESTONE COMPLETE

## Current Position

Phase: 47 of 47 (Message Polish -- COMPLETE)
Plan: 3 of 3 in current phase (47-01, 47-02, 47-03 complete)
Status: Phase 47 and v5.0 milestone complete
Last activity: 2026-02-20 -- Completed Phase 47 (Message Polish -- delivery status, search, attachments)

Progress: [██████████] v1.0 | [██████████] v1.1 | [██████████] v2.0 | [██████████] v3.0 | [█████████░] v4.0 84% | [██████████] v5.0 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 238 (84 v1.0 + 35 v1.1 + 30 v2.0 + 30 v3.0 + 33 v4.0 + 26 v5.0)
- Average duration: 3.9 min
- Total execution time: ~14.5 hours

**By Milestone:**

| Milestone | Phases | Plans | Total Time | Avg/Plan |
|-----------|--------|-------|------------|----------|
| v1.0 | 13 | 84 | ~5.5 hrs | ~4 min |
| v1.1 | 10 | 35 | ~2.4 hrs | ~4.1 min |
| v2.0 | 7 | 30 | ~22 min | ~1.8 min |
| v3.0 | 8 | 30 | ~1.7 hrs | ~3.4 min |
| v4.0 | 8 | 33/32 | ~369 min | ~5.6 min |
| v5.0 | 8 | 23/21 | ~116 min | ~5.0 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [34-01]: Minimum rate enforcement is HARD block (rejected at both form and API level) per CONTEXT
- [34-01]: Draft auto-save uses 2-second debounce on form state change (not per-keystroke)
- [34-01]: Staffing plan discriminated union: named_medics OR headcount_and_quals (not both)
- [34-01]: Quote status lifecycle: draft → submitted → revised | withdrawn (tracks submission time)
- [v4.0]: Marketplace tables use user_id-based RLS (NOT org_id) -- cross-org by design
- [v4.0]: Two Stripe PaymentIntents for deposit + remainder (not authorize-then-capture, 7-day hold limit)
- [v4.0]: `bookings.source` column discriminates 'direct' vs 'marketplace' bookings
- [v4.0]: PostgreSQL EXCLUSION constraints on medic_commitments for race condition prevention
- [v5.0]: Single Supabase Realtime channel per user (not per conversation) to avoid connection exhaustion
- [v5.0]: Messages use org_id-scoped RLS (unlike v4.0 marketplace which uses user_id)
- [v5.0]: Broadcast uses message_recipients join table for per-medic read tracking
- [v5.0]: WatermelonDB for iOS offline message cache (existing pattern from sync engine)
- [v5.0]: Push notifications show sender name only, never message content (GDPR)
- [40-01]: (SELECT get_user_org_id()) wrapper pattern in RLS for query plan caching
- [40-01]: Denormalized org_id on child tables (messages, message_recipients, document_versions) to avoid JOIN-based RLS
- [40-01]: Messages soft-delete via deleted_at column, filtered at RLS level for org users (platform admin sees all)
- [40-02]: Storage RLS uses (storage.foldername(name))[1] = (SELECT get_user_org_id())::text for org-scoped file access
- [40-02]: TypeScript types in separate comms.types.ts -- avoids modifying existing database.types.ts
- [41-01]: Unread counts computed in JS from 3 parallel Supabase queries (conversations, read statuses, messages) -- avoids N+1
- [41-01]: 30-second polling for conversations (more frequent than 60s workers due to messaging time sensitivity)
- [41-01]: Header unread badge fetched server-side in layout -- no client component needed until Phase 43 real-time
- [41-02]: 10-second polling for active message threads (faster than 30s conversation list polling)
- [41-02]: Sender name resolution via medics table bulk lookup (non-medic senders labeled "Admin")
- [41-02]: Flat Slack-style message layout (not chat bubbles) per CONTEXT.md guidance
- [41-02]: Conversation metadata (last_message_at, last_message_preview) updated on each message send
- [41-03]: SELECT-then-INSERT with 23505 catch for conversation creation duplicate prevention (partial unique index)
- [41-03]: MedicPicker fetches medics client-side on dialog open (not server-side) for fresh data on long-lived pages
- [41-03]: EmptyState converted to client component to support MedicPicker rendering
- [34.1-01]: Direct jobs use source='direct' on marketplace_events (not a separate table)
- [34.1-01]: agreed_price nullable on marketplace_events (null for marketplace, required for direct via Zod)
- [34.1-01]: Direct job default status is 'confirmed' (not 'open' — no quoting process)
- [34.1-01]: quote_deadline sentinel 2099-12-31 for direct jobs (NOT NULL constraint workaround)
- [34.1-01]: DELETE restricted to draft-only jobs — non-drafts must be cancelled
- [34.1-03]: Marketplace events GET now excludes source='direct' via .neq() — My Events only shows marketplace
- [34.1-03]: Combined API returns all sources by default; source filter applied server-side, status/search client-side
- [34.1-03]: Combined status colour map covers 8 statuses spanning both marketplace and direct lifecycles
- [42-01]: MessageSync is self-contained service -- does NOT modify existing SyncQueue.syncItem (clinical data untouched)
- [42-01]: Local messages use 'queued' status for offline (server schema only has sent/delivered/read)
- [42-01]: Incremental sync via lastSyncedAt in AsyncStorage; first sync fetches last 100 messages per conversation
- [42-01]: Participant/sender names denormalized on local models (medics see "Admin", admins see medic name)
- [34.1-02]: Wizard at /dashboard/jobs (platform section, NOT marketplace) — 6 steps vs marketplace 4
- [34.1-02]: Existing client selector pre-fills all fields but disables editing
- [34.1-02]: Pricing step shows 0% platform commission prominently in payment breakdown
- [42-02]: Messages tab visible to ALL roles (no href restriction) — placed between Safety and Events
- [42-02]: Unread badge uses WatermelonDB observeCount (reactive) wrapped in try-catch for cold start safety
- [42-02]: Return key sends message (no multi-line), matching CONTEXT.md requirement
- [42-02]: MedicPicker talks to Supabase directly (not Next.js API routes) for iOS app
- [42-02]: Mark-as-read fires on thread mount (local WatermelonDB + Supabase upsert)
- [34-03]: EditQuoteDialog uses local useState (not Zustand) to avoid state conflicts with create flow
- [34-03]: Deadline extension is one-time only via deadline_extended boolean on marketplace_events
- [34-03]: Quote edit sets status='revised' + last_revised_at; withdraw sets status='withdrawn' + withdrawn_at
- [34.1-04]: Booking bridge sets client_id=null (direct_clients is separate from bookings.client_id which refs clients table)
- [34.1-04]: agreed_price treated as total including VAT -- split into subtotal/vat for bookings schema compatibility
- [34.1-04]: Dev mock PaymentIntent when no STRIPE_SECRET_KEY -- enables UI testing without Stripe credentials
- [34.1-04]: Medic commitments created per event_day (not per job) -- EXCLUSION constraint checks each day independently
- [34.1-05]: job_ratings table in separate migration 148 (not appended to 147)
- [34.1-05]: Rating section only visible when job status is 'completed'
- [34.1-05]: deposit_percent defaults to 25% in client-access API (no DB column)
- [34.1-05]: RLS uses split INSERT/UPDATE/DELETE policies for rater's own ratings
- [34-02]: Best-value scoring: 60% price + 40% rating, normalised to 0-100 scale with tiebreaker on submitted_at DESC
- [34-02]: Contact details hidden until BOTH event awarded AND deposit paid (stricter than just 'awarded')
- [34-02]: Company name always visible before award; medic names masked as "First L."
- [34-02]: Company profile access-controlled via quote relationship check (must have quote on viewer's event)
- [34-02]: Zod v4 now installed in web package (v4.3.6) -- .errors renamed to .issues, .partial() disallowed on refined schemas
- [34.1-06]: Subscription check resolves org from marketplace_companies.org_id (NOT user app_metadata) — different from requireTier() pattern
- [34.1-06]: NULL subscription_status = legacy org, treated as active (per migration 133 convention)
- [34.1-06]: deposit_paid derived from booking existence (source='direct' + name/postcode/org/date match) — TODO: add proper FK
- [34.1-06]: Subscription check uses marketplace_companies.org_id -> organizations join (NOT requireTier helper, which resolves from user app_metadata)
- [34.1-06]: NULL subscription_status treated as active (legacy orgs per migration 133 convention)
- [34.1-06]: Booking existence check for deposit_paid uses name+postcode+org+date matching (TODO for proper FK)
- [42-03]: Idempotency key stored in messages.metadata JSONB (no schema change -- deduplication via .contains() query)
- [42-03]: 24-hour timeout for stale queued messages (time-based, not retry-count-based)
- [42-03]: Push-then-pull ordering on reconnect (send queued first, then fetch new)
- [42-03]: Offline banners use amber-100 (#FEF3C7) consistent across messaging screens
- [35-01]: Deposit % configurable by event type (construction/motorsport=50%, others=25%) via const map (admin UI in Phase 39)
- [35-01]: Two Stripe PaymentIntents: deposit with setup_future_usage:'off_session' + separate remainder PI later
- [35-01]: EXCLUSION constraint check at award time for named_medics staffing plans (queries medic_commitments for time overlaps)
- [35-01]: client_payment_methods table uses auth.users FK (not profiles) for marketplace client identity
- [35-01]: Dev mock PaymentIntent pattern from direct-jobs reused for marketplace award API
- [35-02]: Marketplace booking bridge creates one booking per event day (consistent with Phase 34.1)
- [35-02]: Webhook checks payment_type metadata FIRST — marketplace deposit handled before falling through to existing logic
- [35-02]: Losing quotes rejected immediately on deposit success (not waiting for any delay)
- [35-02]: Medic commitments created in webhook with EXCLUSION error catch (already validated at award API time)
- [43-02]: Permission prompt deferred to first Messages tab focus (not app launch) via AsyncStorage flag + Tabs listener
- [43-02]: Module-level setNotificationHandler with shouldShowAlert:false prevents native banner; custom in-app toast used
- [43-02]: Token staleness threshold 7 days -- avoids unnecessary DB writes while ensuring token freshness
- [43-02]: NotificationProvider wraps tabs layout (not root) so it has access to AuthContext/OrgContext
- [43-02]: TabsLayout split into outer wrapper (NotificationProvider) + inner component (TabsLayoutInner) for hook access
- [43-01]: RealtimeProvider placed inside SyncProvider in iOS root layout (needs Auth + Org contexts)
- [43-01]: Write queue serializes Realtime-triggered WatermelonDB writes to avoid concurrent db.write() conflicts
- [43-01]: Sender name resolution: session cache > local WatermelonDB > Supabase medics query (3-tier fallback)
- [43-01]: Web Realtime uses @/lib/supabase singleton (not SSR client) for persistent WebSocket channel
- [43-01]: UnreadBadge client component replaces server-rendered badge for live updates
- [43-01]: All polling removed from web messaging (30s conversations, 10s messages) -- Realtime only
- [35-03]: Remainder Edge Function retry: 3 attempts at 1d, 3d, 7d intervals with idempotency keys per attempt
- [35-03]: pg_cron uses Vault secrets pattern (matching migration 022) -- vault.decrypted_secrets for URL and service_role_key
- [35-03]: Remainder webhook success updates remainder_paid_at (does NOT cancel booking on failure -- unlike direct bookings)
- [35-03]: Payment method PUT updates all unpaid marketplace bookings for the customer to use new card
- [35-04]: Email notifications use shared Resend client with dev mode fallback (no RESEND_API_KEY = console log only)
- [35-04]: Each email send wrapped in individual try/catch in webhook (email failure NEVER blocks webhook response)
- [35-04]: Contact gating server-side: awarded event API returns client=null when deposit not yet paid
- [35-04]: Award button in QuoteRankRow only visible for submitted/revised quotes when event is open/closed
- [43-03]: Migration numbered 150 (not 149) because 149_marketplace_award_payment.sql already existed
- [43-03]: Vault secrets pattern for Edge Function URL/key (matching migration 033 RIDDOR trigger)
- [43-03]: Sender name resolution: medics.first_name+last_name > profiles.full_name > "Someone" fallback
- [43-03]: Direct message recipient resolved via medics.user_id comparison with sender_id
- [44-01]: Single broadcast conversation per org via partial unique index (conversations.org_id WHERE type='broadcast')
- [44-01]: Broadcast recipient tracking via message_recipients join table (one row per medic per message)
- [44-01]: MessageInput hidden for ALL users on broadcast (admin uses Broadcast button, medic sees read-only notice)
- [44-01]: No filtering by available_for_work when fetching medics for broadcast recipients — all org medics receive
- [44-02]: Batched read summary query (single message_recipients query for all visible message IDs) avoids N+1
- [44-02]: 30-second stale time on read summaries for admin (balance freshness vs query volume)
- [44-02]: Broadcast mark-as-read updates both message_recipients.read_at AND conversation_read_status (dual update)
- [36-01]: Blind rating window: neither party sees rating until both submit OR 14 days after event completion (prevents retaliation)
- [36-01]: Company rating aggregates denormalized on marketplace_companies via PostgreSQL trigger on job_ratings INSERT/UPDATE/DELETE
- [36-01]: Moderation columns on job_ratings (moderation_status, flagged_at/by/reason, moderated_at/by/notes) for admin review flagging
- [36-02]: Marketplace messaging uses user-ID-scoped RLS (NOT org_id) — different from v5.0 internal messaging
- [36-02]: UNIQUE(event_id, company_id) on marketplace_conversations — at most one conversation per event+company pair
- [36-02]: Fire-and-forget Airbnb-style email notifications for marketplace messages (never blocks API response)
- [36-03]: remainder_hold boolean on bookings — filing dispute immediately freezes remainder payments
- [36-03]: Tiered client cancellation: >14d=100% refund, 7-14d=50%, <7d=0%; company cancellation always 100%
- [36-03]: Admin dispute resolution: full_refund, partial_refund, dismissed, suspend_party — all release remainder_hold
- [46-01]: Daily digest format (not per-document emails) -- one email per medic per threshold stage
- [46-01]: Admin digest at critical stages only (14/7/1 days, not 30) to reduce noise
- [46-01]: Deduplication tracks document_version_id -- new version upload naturally avoids stale alerts
- [46-01]: mark_expired_documents sets status='expired' informational (no blocking)
- [46-01]: Admin email resolution: profiles.role='site_manager' first, org_settings.admin_email fallback
- [46-01]: pg_cron at 08:00 UTC (8am GMT / 9am BST -- within morning 8-9am UK year-round)
- [46-02]: Bulk expiry dashboard excludes null-expiry documents (only time-bound documents shown)
- [46-02]: Three tab views for expiry dashboard: 30-day (default), all expiring (365d), expired only
- [46-02]: Status badges use light theme colours for admin dashboard (red/amber/green with bg-*-50)
- [37-01]: Soft-delete for roster removal (status=inactive, left_at=now) preserves audit trail and historical quote references
- [37-01]: jose library (v6.1.3) for JWT invitation tokens — Edge-compatible, ESM-native (not jsonwebtoken)
- [37-01]: v_medic_id loop variable in validate_quote_roster_membership trigger to avoid column name ambiguity
- [37-01]: Multi-company roster membership allowed — UNIQUE on (company_id, medic_id), not just medic_id
- [37-01]: 7-day JWT invitation expiry with company_id + email in payload
- [37-01]: Fire-and-forget Resend email with console.log dev fallback (never blocks API)
- [37-02]: Zustand store manages UI state only (filters, modals); data stays in React Query hooks
- [37-02]: GET roster API updated to support status=all (default) instead of defaulting to active
- [37-02]: AddMedicModal uses client-side Supabase ILIKE search against medics table (same as MedicPicker pattern)
- [37-02]: RosterMedicCard uses AlertDialog for remove confirmation (not window.confirm)
- [37-02]: Accept page wraps useSearchParams in Suspense boundary (Next.js 14+ requirement)
- [37-03]: companyId auto-detected in StaffingPlanSection via Supabase query (not passed through prop chain)
- [37-03]: Free-text fallback with amber warning when no company roster found (backward compatible)
- [37-03]: RosterMedicPicker renders inline in form (not popover/dialog) for simpler UX
- [37-03]: Insurance badge colour mapping: verified=green-100, expired=red-100, unverified=gray-100

### Pending Todos

- Configure external services for production deployment (Stripe, Google Maps, Resend, webhooks, pg_cron, Vault) -- carried from v1.1
- Obtain DPA template + solicitor review before first org onboarding (non-code blocker for v3.0 launch)
- **Configure Vercel wildcard `*.sitemedic.co.uk` and DNS CNAME** -- checkpoint from 26-01; 72h propagation
- **Apply Supabase migrations (132, 133, 134, 135, 140, 141, 142, 143, 144, 146, 147, 148, 149, 149b, 150, 151, 155, 156) to production** -- migrations 132-144 verified, 146 for marketplace quotes, 147 for direct jobs, 148 for job ratings, 149/149b for marketplace award/payment, 150 for message notification trigger, 151 for broadcast indexes, 155 for document expiry reminders, 156 for company roster medics
- **Add `NEXT_PUBLIC_ROOT_DOMAIN=sitemedic.co.uk` to Vercel env vars** -- needed for production subdomain routing
- **Create Stripe Products/Prices and register billing webhook** -- checkpoint from 25-01
- **CQC legal opinion required** -- must determine if marketplace model requires CQC registration before launch
- **FCA/PSD2 commercial agent exemption** -- confirm Stripe Connect satisfies requirements before processing marketplace payments
- **GDPR Legitimate Interest Assessment** -- required for marketplace data processing before launch
- **Decide marketplace commission rate and deposit percentage** -- business decisions needed before Phase 35 (Award Flow)

### Blockers/Concerns

- CQC registration question is a non-code blocker -- requires legal counsel, cannot be resolved with technical work
- FCA/PSD2 exemption needs formal confirmation before marketplace payments go live

### Roadmap Evolution

- Phase 34.1 inserted after Phase 34: Self-Procured Jobs (INSERTED) — Companies with SiteMedic subscriptions can create/manage jobs sourced outside the marketplace, with zero commission, full wizard, Stripe payment, and complete feature parity. Depends on Phase 34 + Phase 37 (roster).

### Planned Milestones

- **v5.0 Internal Comms & Document Management** -- roadmap created 2026-02-19. 8 phases (40-47), 21 plans, 28 requirements. Org admin ↔ medic messaging with offline support, broadcast messaging, compliance document upload with expiry tracking. Execution after v4.0 completes.

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 37-03-PLAN.md (Company Profile & Quote Roster Wiring) -- Phase 37 complete (3/3 plans)
Resume file: None
