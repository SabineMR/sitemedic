# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v5.0 Internal Comms — Phase 42 (iOS Messaging & Offline)

## Current Position

Phase: 42 of 47 (iOS Messaging & Offline)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-02-19 — Phase 41 complete (3 plans, 4/4 must-haves verified)

Progress: [██████████] v1.0 | [██████████] v1.1 | [██████████] v2.0 | [██████████] v3.0 | [████░░░░░░] v4.0 25% | [███░░░░░░░] v5.0 29%

## Performance Metrics

**Velocity:**
- Total plans completed: 192 (84 v1.0 + 35 v1.1 + 30 v2.0 + 30 v3.0 + 8 v4.0 + 5 v5.0)
- Average duration: 3.9 min
- Total execution time: ~12.6 hours

**By Milestone:**

| Milestone | Phases | Plans | Total Time | Avg/Plan |
|-----------|--------|-------|------------|----------|
| v1.0 | 13 | 84 | ~5.5 hrs | ~4 min |
| v1.1 | 10 | 35 | ~2.4 hrs | ~4.1 min |
| v2.0 | 7 | 30 | ~22 min | ~1.8 min |
| v3.0 | 8 | 30 | ~1.7 hrs | ~3.4 min |
| v4.0 | 8 | 8/26 | ~86 min | ~6.4 min |
| v5.0 | 8 | 5/21 | ~18 min | ~3.6 min |

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

### Pending Todos

- Configure external services for production deployment (Stripe, Google Maps, Resend, webhooks, pg_cron, Vault) -- carried from v1.1
- Obtain DPA template + solicitor review before first org onboarding (non-code blocker for v3.0 launch)
- **Configure Vercel wildcard `*.sitemedic.co.uk` and DNS CNAME** -- checkpoint from 26-01; 72h propagation
- **Apply Supabase migrations (132, 133, 134, 135, 140, 141, 142, 143, 144, 146) to production** -- migrations 132-144 verified, 146 new for marketplace quotes
- **Add `NEXT_PUBLIC_ROOT_DOMAIN=sitemedic.co.uk` to Vercel env vars** -- needed for production subdomain routing
- **Create Stripe Products/Prices and register billing webhook** -- checkpoint from 25-01
- **CQC legal opinion required** -- must determine if marketplace model requires CQC registration before launch
- **FCA/PSD2 commercial agent exemption** -- confirm Stripe Connect satisfies requirements before processing marketplace payments
- **GDPR Legitimate Interest Assessment** -- required for marketplace data processing before launch
- **Decide marketplace commission rate and deposit percentage** -- business decisions needed before Phase 35 (Award Flow)

### Blockers/Concerns

- CQC registration question is a non-code blocker -- requires legal counsel, cannot be resolved with technical work
- FCA/PSD2 exemption needs formal confirmation before marketplace payments go live

### Planned Milestones

- **v5.0 Internal Comms & Document Management** -- roadmap created 2026-02-19. 8 phases (40-47), 21 plans, 28 requirements. Org admin ↔ medic messaging with offline support, broadcast messaging, compliance document upload with expiry tracking. Execution after v4.0 completes.

## Session Continuity

Last session: 2026-02-19
Stopped at: Phase 41 complete -- ready to plan Phase 42 (iOS Messaging & Offline)
Resume file: None
