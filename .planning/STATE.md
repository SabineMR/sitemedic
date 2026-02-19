# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v4.0 MedBid Marketplace — Phase 32 (Foundation Schema & Registration)

## Current Position

Phase: 32 of 39 (Foundation Schema & Registration)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-19 — Completed 32-01-PLAN.md (marketplace foundation schema, types, CQC client)

Progress: [██████████] v1.0 | [██████████] v1.1 | [██████████] v2.0 | [██████████] v3.0 | [█░░░░░░░░░] v4.0 4%

## Performance Metrics

**Velocity:**
- Total plans completed: 180 (84 v1.0 + 35 v1.1 + 30 v2.0 + 30 v3.0 + 1 v4.0)
- Average duration: 3.9 min
- Total execution time: ~11.3 hours

**By Milestone:**

| Milestone | Phases | Plans | Total Time | Avg/Plan |
|-----------|--------|-------|------------|----------|
| v1.0 | 13 | 84 | ~5.5 hrs | ~4 min |
| v1.1 | 10 | 35 | ~2.4 hrs | ~4.1 min |
| v2.0 | 7 | 30 | ~22 min | ~1.8 min |
| v3.0 | 8 | 30 | ~1.7 hrs | ~3.4 min |
| v4.0 | 8 | 1/26 | ~4 min | ~4 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v4.0]: Marketplace tables use user_id-based RLS (NOT org_id) -- cross-org by design
- [v4.0]: Two Stripe PaymentIntents for deposit + remainder (not authorize-then-capture, 7-day hold limit)
- [v4.0]: `bookings.source` column discriminates 'direct' vs 'marketplace' bookings
- [v4.0]: PostgreSQL EXCLUSION constraints on medic_commitments for race condition prevention
- [v4.0]: Company accounts deferred to Phase 37 (individual flow must work first)
- [32-01]: Storage bucket folder convention `{company_id}/{document_type}/{filename}` with company-admin-scoped RLS
- [32-01]: CQC client uses `cache: 'no-store'` (standard) instead of Next.js-specific `next: { revalidate: 0 }` for TypeScript strict compatibility

### Pending Todos

- Configure external services for production deployment (Stripe, Google Maps, Resend, webhooks, pg_cron, Vault) -- carried from v1.1
- Obtain DPA template + solicitor review before first org onboarding (non-code blocker for v3.0 launch)
- **Configure Vercel wildcard `*.sitemedic.co.uk` and DNS CNAME** -- checkpoint from 26-01; 72h propagation
- **Apply Supabase migrations (132, 133, 134, 135) to production** -- verified correct, ready to apply
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

- **v5.0 Internal Comms & Document Management** — planning started 2026-02-19. Org admin ↔ medic messaging, community broadcast, document upload with expiry tracking, both platforms (iOS + web). Requirements and roadmap in progress.

## Session Continuity

Last session: 2026-02-19
Stopped at: v5.0 milestone planning (questioning complete, moving to research)
Resume file: None
