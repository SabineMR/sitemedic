# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** v3.0 White-Label Platform & Subscription Engine — COMPLETE

## Current Position

Phase: 31 of 31 (Branding Settings UI)
Plan: 2 of 2 in Phase 31
Status: Phase complete — v3.0 milestone complete
Last activity: 2026-02-19 — Completed 31-02-PLAN.md

Progress: [██████████] v1.0 complete | [██████████] v1.1 complete | [██████████] v2.0 complete | [██████████] v3.0 complete (Phase 24: 5/5, Phase 25: 3/3, Phase 26: 4/4, Phase 27: 3/3, Phase 28: 3/3, Phase 29: 5/5, Phase 30: 5/5, Phase 31: 2/2)

## Performance Metrics

**Velocity:**
- Total plans completed: 150 (84 v1.0 + 35 v1.1 + 30 v2.0 + 30 v3.0)
- Average duration: 3.9 min
- Total execution time: ~9.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01–07.5 (v1.0) | 84/84 | ~5.5 hrs | ~4 min |
| 08–17 (v1.1) | 35/35 | ~2.4 hrs | ~4.1 min |
| 18–23 (v2.0) | 30/30 | ~22 min | ~1.8 min |
| 24 (v3.0) | 5/5 | ~6 min | ~1.2 min |
| 25 (v3.0) | 3/3 | ~8 min | ~2.7 min |
| 26 (v3.0) | 4/4 | ~8 min | ~2 min |
| 27 (v3.0) | 3/3 | ~6 min | ~2 min |
| 28 (v3.0) | 3/3 | ~8 min | ~2.7 min |
| 29 (v3.0) | 5/5 | ~25 min | ~5 min |
| 30 (v3.0) | 5/5 | ~22.5 min | ~4.5 min |
| 31 (v3.0) | 2/2 | ~16 min | ~8 min |

**Recent Trend:**
- Last plan: 31-02 — Platform Admin Branding Override (~6 min)
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
- **26-02:** extractSubdomain() strips port before comparison — handles localhost:30500 and production domains
- **26-02:** Dynamic import of @supabase/supabase-js inside subdomain block — avoids bundling when not needed on apex requests
- **26-02:** org_branding join returns object (UNIQUE constraint) but defensive Array.isArray check added
- **26-02:** Logo URL constructed from logo_path: `${SUPABASE_URL}/storage/v1/object/public/org-logos/${logo_path}`
- **26-03:** Login page split: server component (page.tsx) reads headers → client component (login-form.tsx) handles interactivity
- **26-04:** Signout route uses request origin (not hardcoded NEXT_PUBLIC_SITE_URL) for subdomain support
- **25-02:** FEATURE_GATES is sole source of truth — 12 features across 3 tiers, hasFeature() defaults NULL tier to 'starter'
- **25-03:** normalizeSubscriptionStatus maps Stripe 'canceled' (US) to database 'cancelled' (UK) per migration 133 CHECK constraint
- **25-03:** handlePaymentFailed does NOT change subscription_status — waits for customer.subscription.updated with 'past_due'
- **25-03:** Out-of-order webhook protection via subscription_status_updated_at timestamp comparison
- **25-03:** priceIdToTier() parses comma-separated STRIPE_PRICE_* env vars with .trim() for whitespace tolerance
- **27-01:** BrandingProvider injects `<style>:root { --org-primary: #hex }</style>` at root level — XSS defence via hex regex validation
- **27-01:** Root layout's generateMetadata() reads x-org-company-name header for dynamic title template with em dash separator
- **27-02:** Dashboard sidebar reads headers directly (server component) — no useBranding() needed
- **27-03:** Admin sidebar uses `bg-[color:var(--org-primary)]` pattern for all accent colours; `shadow-black/10` replaces `shadow-blue-500/20` (can't use CSS var in Tailwind shadow)
- **28-01:** fetchLogoAsDataUri() converts remote Supabase Storage URLs to base64 data URIs — @react-pdf/renderer in Deno Edge cannot reliably fetch remote images; data URI approach validated
- **28-02:** Invoice HTML template uses standard `<img src>` with remote URL (not data URI) — HTML rendered in browser where remote URLs work fine
- **28-03:** Two branding type systems: OrgBranding (snake_case, Edge Functions) and EmailBranding (camelCase, Next.js); InvoiceEmailBranding for Edge Function invoice email
- **29-01:** org_branding INSERT in checkout route is non-fatal — logs warning but does not block checkout flow
- **29-01:** User app_metadata updated with org_id + role='org_admin' via service-role admin API during checkout
- **29-01:** Tier-to-price mapping takes FIRST price ID from comma-separated STRIPE_PRICE_* env vars (GBP monthly)
- **29-01:** checkout-status polling pattern: client polls GET /api/billing/checkout-status until subscriptionStatus != null
- **29-02:** Pending org data stored in user_metadata via signInWithOtp (not localStorage) — survives magic link redirect
- **29-02:** encodeURIComponent for nested query params in auth callback redirect URL
- **29-02:** Cancellation shows info banner (blue, not red) — cancellation is valid user action, not failure
- **29-03:** Onboarding middleware check is separate from !isPublicRoute block because /admin is in publicRoutes
- **29-03:** Legacy orgs (NULL onboarding_completed) treated as completed via ?? true — prevents breaking existing users
- **29-03:** Branding page only UPDATEs org_branding row (never INSERTs) — row created by checkout route (29-01)
- **29-03:** Logo upload uses Supabase Storage upsert: true to allow replacing without deletion
- **29-04:** Slug format validation: /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/ — 3-30 chars, no leading/trailing hyphens
- **29-04:** Starter-tier orgs skip slug assignment entirely; Growth/Enterprise require slug before activation
- **29-04:** Welcome email sent fire-and-forget after activation — activation succeeds regardless of email delivery
- **30-01:** UpgradePrompt CTA links to `/admin/settings#billing` — settings page billing section is the natural upgrade entry point
- **30-01:** requireTier() is a pure utility (no NextResponse coupling) — API routes catch errors and return appropriate HTTP status codes
- **30-03:** Portal return_url points to /admin/settings — user lands back where they started after Stripe portal
- **30-03:** Legacy orgs without stripe_customer_id get 400 with descriptive error instead of broken portal session
- **30-03:** Origin detection chain: request headers > NEXT_PUBLIC_SITE_URL > localhost:30500 for white-label subdomain support
- **30-04:** MRR calculated from hardcoded tier prices (Starter £149, Growth £299, Enterprise £599), not Stripe API — avoids rate limits and latency
- **30-04:** NULL tier defaults to starter, NULL status defaults to active — matches 24-05 convention
- **30-04:** Past-due orgs included in MRR (dunning period); cancelled excluded from MRR
- **30-02:** Branding section header stays outside TierGate so all tiers see the feature exists — upgrade prompt appears inside
- **30-02:** requireTier placed after requireOrgId in branding API — auth check first (401), then tier check (403)
- **30-05:** Suspension check uses `=== 'cancelled'` (not `!== 'active'`) — NULL (legacy) and past_due pass through
- **30-05:** Single query extension: `.select('onboarding_completed, subscription_status')` — no extra DB call
- **30-05:** /suspended is NOT in publicRoutes — user must be authenticated to see suspension page
- **31-01:** Auto-save (500ms debounce) for text fields, explicit upload for logo — different UX patterns for different interaction types
- **31-01:** BrandingForm accepts apiEndpoint prop for 31-02 platform admin reuse
- **31-01:** Preview updates instantly (no debounce) while save is debounced — snappy UX
- **31-02:** Service-role client for all platform admin branding ops — platform admin JWT has org_id=NULL so RLS blocks direct writes
- **31-02:** logoUploadEndpoint prop is optional — org admin flow (31-01) is completely unchanged, zero regression
- **31-02:** apiEndpoint and logoUploadEndpoint both point to same route — distinguished by HTTP method (PUT for text, POST for FormData logo)

### Pending Todos

- Configure external services for production deployment (Stripe, Google Maps, Resend, webhooks, pg_cron, Vault) — carried from v1.1
- Obtain DPA template + solicitor review before first org onboarding (non-code blocker for v3.0 launch)
- **Configure Vercel wildcard `*.sitemedic.co.uk` and DNS CNAME** — checkpoint from 26-01; 72h propagation
- **Apply Phase 24 migrations (132, 133, 134) to Supabase production** — verified correct, ready to apply
- **Add `NEXT_PUBLIC_ROOT_DOMAIN=sitemedic.co.uk` to Vercel env vars** — needed for production subdomain routing
- **Create Stripe Products/Prices and register billing webhook** — checkpoint from 25-01; user must create 3 Products with 18 Prices in Stripe Dashboard and populate .env.local
- **Apply migration 135 (webhook_events) to Supabase production** — ready to apply after Phase 24 migrations

### Blockers/Concerns

- **Phase 29 onboarding dependency:** RESOLVED in 29-01 — checkout route explicitly INSERTs org_branding row during org provisioning

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 31-02-PLAN.md (platform admin branding override) — v3.0 milestone complete
Resume file: None
