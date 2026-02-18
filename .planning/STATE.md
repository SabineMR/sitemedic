# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v3.0 White-Label Platform & Subscription Engine — Phase 24 complete; Phase 25 next (Stripe Billing Webhook Handler)

## Current Position

Phase: 24 of 31 (DB Foundation — COMPLETE)
Plan: 5 of 5 in Phase 24
Status: Phase 24 complete — all 5 plans done (24-01 through 24-05)
Last activity: 2026-02-18 — Completed 24-05-PLAN.md (verified all 3 migrations correct; documented legacy org behaviour for downstream phases)

Progress: [██████████] v1.0 complete | [██████████] v1.1 complete | [██████████] v2.0 complete | [██░░░░░░░░] v3.0 ~16% (Phase 24: 5/5 plans done)

## Performance Metrics

**Velocity:**
- Total plans completed: 120 (84 v1.0 + 35 v1.1 + 30 v2.0 + 1 v3.0)
- Average duration: 4.1 min
- Total execution time: ~8.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01–07.5 (v1.0) | 84/84 | ~5.5 hrs | ~4 min |
| 08–17 (v1.1) | 35/35 | ~2.4 hrs | ~4.1 min |
| 18–23 (v2.0) | 30/30 | ~22 min | ~1.8 min |
| 24 (v3.0) | 5/5 | ~6 min | ~1.2 min |

**Recent Trend:**
- Last plan: 24-05 — verified migrations 132/133/134 correct; documented legacy org NULL stripe field = access-granted convention (~1 min)
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
- **24-04:** Public bucket chosen for org-logos — logos in PDFs/emails need stable URLs; signed URLs expire mid-render
- **24-04:** Separate platform admin policies (no folder check) — platform admin org_id is NULL in JWT; folder check would always block them
- **24-04:** 1-indexed Postgres array: (storage.foldername(name))[1] — NOT [0]; [0] returns NULL
- **24-01:** VerticalId union must include 'general' — used as fallback vertical in 8+ places; BookingVerticalId already included it
- **24-01:** CVE-2025-29927 floor specifier-only (pnpm lock already resolved 15.5.12); next version bump pre-dates Phase 26 middleware expansion
- **24-05:** NULL stripe_customer_id = access granted; NULL subscription_status = treat as active — all downstream phases (25-31) must honour this convention
- **24-05:** New orgs created after migration 132 will NOT auto-get org_branding row — Phase 29 onboarding MUST explicitly INSERT
- **24-05:** Gate on subscription_status !== 'cancelled' (not === 'active') so NULL passes correctly for legacy orgs
- **24-05:** All 3 Phase 24 migrations verified correct (132: 5 RLS policies, 133: 4 columns + no policies, 134: 7 policies) — ready for production apply

### Pending Todos

- Configure external services for production deployment (Stripe, Google Maps, Resend, webhooks, pg_cron, Vault) — carried from v1.1
- Obtain DPA template + solicitor review before first org onboarding (non-code blocker for v3.0 launch)
- Initiate Vercel wildcard `*.sitemedic.co.uk` DNS at Phase 26 start — 72h propagation lead time
- **Apply Phase 24 migrations (132, 133, 134) to Supabase production** — verified correct, ready to apply

### Blockers/Concerns

- **Phase 28 research flag:** `@react-pdf/renderer` `<Image>` with remote Supabase Storage URL in Deno Edge is MEDIUM confidence — write one minimal test PDF before updating all 8 functions
- **Phase 26 DNS:** Wildcard CNAME must be initiated at Phase 26 START (not end) — 72h propagation window
- **Phase 29 onboarding dependency:** Must INSERT org_branding row when creating new org (no auto-trigger) — document in Phase 29 plan

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 24-05-SUMMARY.md — Phase 24 DB Foundation fully complete; all migrations verified; legacy org behaviour documented
Resume file: None
