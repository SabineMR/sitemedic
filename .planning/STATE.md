# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v3.0 White-Label Platform & Subscription Engine — Phase 24 in progress (DB Foundation)

## Current Position

Phase: 24 of 31 (DB Foundation — in progress)
Plan: 3 of 5 in Phase 24
Status: In progress — 24-01, 24-02, 24-03 complete; 24-04, 24-05 remaining
Last activity: 2026-02-18 — Completed 24-03-PLAN.md (migration 133: subscription columns on organizations)

Progress: [██████████] v1.0 complete | [██████████] v1.1 complete | [██████████] v2.0 complete | [█░░░░░░░░░] v3.0 ~10% (Phase 24: 3/5 plans done)

## Performance Metrics

**Velocity:**
- Total plans completed: 119 (84 v1.0 + 35 v1.1 + 30 v2.0)
- Average duration: 4.1 min
- Total execution time: ~8.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01–07.5 (v1.0) | 84/84 | ~5.5 hrs | ~4 min |
| 08–17 (v1.1) | 35/35 | ~2.4 hrs | ~4.1 min |
| 18–23 (v2.0) | 30/30 | ~22 min | ~1.8 min |

**Recent Trend:**
- Last plan: 24-03 — migration 133_subscription_columns.sql; 4 columns + backfill on organizations (~1 min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Key v3.0 Decisions (from research)

- Separate Stripe webhook endpoints: `/api/stripe/billing-webhooks` (Billing) vs `/api/stripe/webhooks` (Connect) — different signing secrets, different env var names
- Tier never stored in JWT — middleware reads `organizations.subscription_tier` on every request for immediate effect after webhook fires
- `BrandingContext` is separate from `OrgContext` — SSR headers vs client-side mount; merging creates a race condition
- CSS custom properties are the only correct pattern for per-org colours — Tailwind JIT cannot use runtime-constructed class names
- Cookie domain NOT widened to `.sitemedic.co.uk` — each subdomain requires its own sign-in to prevent cross-org session leak
- Legacy orgs (NULL stripe_customer_id) get access granted until they go through onboarding — Apex is Growth tier, all others Starter
- **24-02:** org_branding UPDATE is self-service (is_org_admin()) unlike org_settings (platform-admin-only write) — branding doesn't need platform intervention
- **24-02:** primary_colour_hex CHECK uses `IS NULL OR regex` pattern — allows NULL initial state without constraint violation
- **24-02:** company_name pre-populated from organizations.name at migration time — no empty-state problem for existing orgs
- **24-03:** All 4 subscription columns DEFAULT NULL — safe ALTER TABLE for existing rows, no downtime
- **24-03:** Apex identified by slug = 'apex' for backfill; second UPDATE uses AND subscription_tier IS NULL for idempotency
- **24-03:** No new RLS policies needed — migration 102 FOR ALL + migration 00004 SELECT cover the new columns automatically
- **24-03:** Tier values: 'starter' | 'growth' | 'enterprise'; Status values: 'active' | 'past_due' | 'cancelled'

### Pending Todos

- Configure external services for production deployment (Stripe, Google Maps, Resend, webhooks, pg_cron, Vault) — carried from v1.1
- Obtain DPA template + solicitor review before first org onboarding (non-code blocker for v3.0 launch)
- Initiate Vercel wildcard `*.sitemedic.co.uk` DNS at Phase 26 start — 72h propagation lead time

### Blockers/Concerns

- **Phase 28 research flag:** `@react-pdf/renderer` `<Image>` with remote Supabase Storage URL in Deno Edge is MEDIUM confidence — write one minimal test PDF before updating all 8 functions
- **Phase 26 DNS:** Wildcard CNAME must be initiated at Phase 26 START (not end) — 72h propagation window

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 24-03-PLAN.md — migration 133_subscription_columns.sql committed (ab3c1b9)
Resume file: None
