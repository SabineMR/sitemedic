# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v5.0 Internal Comms & Document Management — Phase 41 (Web Messaging Core)

## Current Position

Phase: 41 of 47 (Web Messaging Core)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-02-19 — Phase 40 complete (2 plans, 4/4 must-haves verified)

Progress: [██████████] v1.0 | [██████████] v1.1 | [██████████] v2.0 | [██████████] v3.0 | [███░░░░░░░] v4.0 15% | [█░░░░░░░░░] v5.0 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 185 (84 v1.0 + 35 v1.1 + 30 v2.0 + 30 v3.0 + 4 v4.0 + 2 v5.0)
- Average duration: 3.9 min
- Total execution time: ~11.9 hours

**By Milestone:**

| Milestone | Phases | Plans | Total Time | Avg/Plan |
|-----------|--------|-------|------------|----------|
| v1.0 | 13 | 84 | ~5.5 hrs | ~4 min |
| v1.1 | 10 | 35 | ~2.4 hrs | ~4.1 min |
| v2.0 | 7 | 30 | ~22 min | ~1.8 min |
| v3.0 | 8 | 30 | ~1.7 hrs | ~3.4 min |
| v4.0 | 8 | 4/26 | ~32 min | ~8 min |
| v5.0 | 8 | 2/21 | ~5 min | ~2.5 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v4.0]: Marketplace tables use user_id-based RLS (NOT org_id) -- cross-org by design
- [v4.0]: Two Stripe PaymentIntents for deposit + remainder (not authorize-then-capture, 7-day hold limit)
- [v4.0]: `bookings.source` column discriminates 'direct' vs 'marketplace' bookings
- [v4.0]: PostgreSQL EXCLUSION constraints on medic_commitments for race condition prevention
- [v5.0]: Single Supabase Realtime channel per user (not per conversation) to avoid connection exhaustion
- [v5.0]: Messages use org_id-scoped RLS (unlike v4.0 marketplace which uses user_id)
- [v5.0]: Broadcast uses message_recipients join table for per-medic read tracking
- [v5.0]: WatermelonDB for iOS offline message cache (existing pattern from sync engine)
- [v5.0]: Push notifications show sender name only, never message content (GDPR)
- [32-04]: Company Stripe Express accounts use business_type='company' (distinct from individual medic flow)
- [32-04]: Stripe onboarding is optional at registration -- can be completed later from company dashboard
- [40-01]: (SELECT get_user_org_id()) wrapper pattern in RLS for query plan caching -- improvement over bare function call
- [40-01]: Denormalized org_id on child tables (messages, message_recipients, document_versions) to avoid JOIN-based RLS
- [40-01]: Messages soft-delete via deleted_at column, filtered at RLS level for org users (platform admin sees all)
- [40-02]: Storage RLS uses (storage.foldername(name))[1] = (SELECT get_user_org_id())::text for org-scoped file access
- [40-02]: Platform admin storage policies use FOR ALL (single policy per bucket instead of per-operation)
- [40-02]: TypeScript types in separate comms.types.ts -- avoids modifying existing database.types.ts

### Pending Todos

- Configure external services for production deployment (Stripe, Google Maps, Resend, webhooks, pg_cron, Vault) -- carried from v1.1
- Obtain DPA template + solicitor review before first org onboarding (non-code blocker for v3.0 launch)
- **Configure Vercel wildcard `*.sitemedic.co.uk` and DNS CNAME** -- checkpoint from 26-01; 72h propagation
- **Apply Supabase migrations (132, 133, 134, 135, 140, 141, 142, 143, 144) to production** -- verified correct, ready to apply
- **Add `NEXT_PUBLIC_ROOT_DOMAIN=sitemedic.co.uk` to Vercel env vars** -- needed for production subdomain routing
- **Create Stripe Products/Prices and register billing webhook** -- checkpoint from 25-01
- **CQC legal opinion required** -- must determine if marketplace model requires CQC registration before launch
- **FCA/PSD2 commercial agent exemption** -- confirm Stripe Connect satisfies requirements before processing marketplace payments
- **GDPR Legitimate Interest Assessment** -- required for marketplace data processing before launch
- **Decide marketplace commission rate and deposit percentage** -- business decisions needed before Phase 35

### Blockers/Concerns

- CQC registration question is a non-code blocker -- requires legal counsel, cannot be resolved with technical work
- FCA/PSD2 exemption needs formal confirmation before marketplace payments go live

### Planned Milestones

- **v5.0 Internal Comms & Document Management** -- roadmap created 2026-02-19. 8 phases (40-47), 21 plans, 28 requirements. Org admin ↔ medic messaging with offline support, broadcast messaging, compliance document upload with expiry tracking. Execution after v4.0 completes.

## Session Continuity

Last session: 2026-02-19
Stopped at: Phase 40 complete -- ready to plan Phase 41 (Web Messaging Core)
Resume file: None
