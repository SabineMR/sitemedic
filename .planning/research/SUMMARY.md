# Research Summary — SiteMedic v3.0 White-Label

**Project:** SiteMedic v3.0 White-Label Multi-Tenancy
**Domain:** B2B SaaS — per-org white-label branding, subdomain routing, Stripe Billing subscription tiers
**Researched:** 2026-02-18
**Confidence:** HIGH
**First customer:** Apex Safety Solutions (Growth tier, slug `apex`)

---

## Executive Summary

SiteMedic v3.0 adds a white-label subscription layer on top of an already-shipped multi-tenant medic staffing platform. The milestone has three interlocking concerns: (1) per-org visual identity — logo, primary colour, company name — applied consistently across the web portal, PDFs, and transactional emails; (2) subdomain routing so each Growth/Enterprise org gets `slug.sitemedic.com`; and (3) Stripe Billing subscription tiers (Starter £149/mo, Growth £299/mo, Enterprise £599/mo) with a hybrid onboarding flow where payment happens online but a platform admin manually activates each new org. The recommended approach is entirely additive: no new npm packages are required, no existing tables or RLS policies need changing, and the Stripe Billing integration coexists cleanly with the existing Stripe Connect medic payout system.

The core architecture rests on three new database objects: an `org_branding` table (logo path, primary colour, company name, tagline), four new subscription columns on `organizations` (Stripe customer ID, subscription ID, tier, status), and a public Supabase Storage bucket `org-logos`. Subdomain routing is implemented by extending the existing Next.js middleware to parse the `Host` header, resolve the org via service role lookup, and inject branding data as `x-org-*` request headers — which SSR layouts consume via `next/headers` without any client-side fetch. Feature gating reads tier from the DB on every request (never from the JWT), ensuring tier changes take effect immediately after a webhook fires.

The highest-risk area is Stripe integration: the existing system uses Stripe Connect for medic payouts, and the new Stripe Billing subscription system must be kept completely separate — different webhook endpoints, different signing secrets, different env var names. The second major risk cluster is subdomain auth cookie scoping and the CVE-2025-29927 middleware header injection vulnerability. Both have concrete, code-level mitigations documented in ARCHITECTURE.md and PITFALLS.md. The 9-step build order in ARCHITECTURE.md encodes the correct dependency sequence; following it strictly prevents every critical pitfall identified.

---

## Key Findings

### Recommended Stack (from STACK.md)

No new npm packages are required. Every white-label capability is implementable with the existing stack. All five feature areas (branding storage, logo hosting, subdomain routing, Stripe Billing, branded emails, branded PDFs) use tools already installed and validated in production.

**Core technologies unchanged:**
- Next.js 15.1.5 (App Router) + React 19 — web portal; middleware extended for subdomain routing
- Supabase (PostgreSQL + Auth + Storage + Edge Functions) — new `org_branding` table, new `org-logos` bucket
- `stripe` v20.3.1 — same SDK instance handles both Connect (existing) and Billing (new); no additional Stripe package needed
- `@react-email/components` 1.0.7 + `resend` 6.9.2 — branding injected as required `branding` prop; no new packages
- `@react-pdf/renderer` 4.3.2 — `<Image>` component accepts remote HTTPS URL for logo injection in all 8 PDF Edge Functions

**New infrastructure required (not packages):**

| Item | Where | Purpose |
|------|-------|---------|
| `org-logos` Supabase Storage bucket (public) | Supabase Dashboard or migration 134 | Stores org logo files; public so PDFs and emails can load logos without expiring signed URLs |
| Stripe Products + Prices (3 tiers) | Stripe Dashboard, one-time setup | Starter/Growth/Enterprise price IDs referenced by checkout route and webhook handler |
| Stripe Customer Portal configuration | Stripe Dashboard | Hosted UI for upgrade/downgrade/cancel; no custom billing UI needed |
| Wildcard domain `*.sitemedic.com` in Vercel | Vercel Project Settings + DNS registrar | Routes all org subdomains to the same Next.js deployment; 72h DNS propagation lead time required |
| `stripe-billing-webhooks` route handler | `web/app/api/stripe/billing-webhooks/` | Separate from existing Connect webhook; different signing secret env var |

**New environment variables required:**

```
STRIPE_BILLING_WEBHOOK_SECRET=whsec_billing_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_ENTERPRISE=price_...
NEXT_PUBLIC_ROOT_DOMAIN=sitemedic.com
```

**New migrations required:**

| Migration | Changes |
|-----------|---------|
| `132_org_branding.sql` | New `org_branding` table with RLS; backfill empty rows for all existing orgs |
| `133_org_subscriptions.sql` | Add `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status` to `organizations` |
| `134_org_logos_bucket.sql` (or Dashboard) | Create public `org-logos` bucket with write-scoped RLS |

**Key schema decision:** Branding goes in a new `org_branding` table (not `org_settings` columns). Subscription fields go on `organizations` (not `org_settings`). Rationale: branding is presentation-layer data separate from operational config; subscription tier/status is identity-level data read by middleware on every request alongside the slug, so it belongs co-located on `organizations` for a single DB round-trip.

### Feature Scope (from project context — v2.0 FEATURES.md superseded)

**Must-have for v3.0 launch:**
- Per-org branding (logo, primary colour, company name) across web portal, PDFs, and all email templates
- Subdomain routing: `slug.sitemedic.com` for Growth and Enterprise tiers
- Stripe Billing subscription tiers: Starter £149/mo / Growth £299/mo / Enterprise £599/mo
- Hybrid onboarding: online Stripe Checkout + platform admin manual activation
- Feature gating by tier — server-side enforcement (not UI-only)
- Subscription management via Stripe Customer Portal (no custom billing UI needed)
- Platform admin pending-activation queue with immediate notification on Checkout completion
- Remove all hardcoded "Apex Safety Group Ltd" and "SiteMedic" text from all PDFs and emails

**Should-have (complete in v3.0 if time allows):**
- Branding settings page (`/admin/settings/branding`) — logo upload, colour picker, company name and tagline
- Upgrade prompts for Starter-tier orgs on Growth-gated features
- `webhook_events` idempotency table for Billing webhook handler
- Mandatory "Powered by SiteMedic" disclosure footer on white-label login pages (GDPR sub-processor)

**Defer to v3.1+:**
- Custom domain for Enterprise tier (`customer.com` pointing to SiteMedic deployment)
- Per-org Resend sending domain (`hello@apexmedicservices.co.uk`)
- Vercel KV caching for middleware org/branding lookups (needed only at 100+ orgs)
- Stripe Billing entitlements API (alternative to custom `FEATURE_GATES` constant; evaluate at scale)
- Individual SSL cert automation for custom domains

### Architecture Approach (from ARCHITECTURE.md)

The architecture is middleware-centric. Subdomain resolution, service-role org lookup, branding data retrieval, and security header stripping all happen in the Next.js Edge middleware before any route handler runs. Branding values are propagated as `x-org-*` request headers; Server Components consume them via `next/headers`. This eliminates client-side branding fetches (no flash of unbranded content) and makes branding data available before authentication runs.

**Major components:**

| Component | Responsibility |
|-----------|---------------|
| `middleware.ts` (updated) | Strip injected `x-org-*` headers, extract subdomain, service-role org lookup, branding header injection, auth guard (existing logic untouched) |
| `org_branding` table | Persists per-org logo path, primary colour, company name, tagline; independent RLS from `org_settings` |
| `BrandingContext` + `BrandingProvider` | Client-side branding state from SSR headers; CSS custom property injection (`--org-primary`); tier available to client components |
| `feature-gates.ts` | Authoritative tier-to-feature constant; `hasFeature(tier, feature)` used in API routes, server components, and PDF Edge Functions |
| `/api/stripe/billing-webhooks` | Stripe Billing lifecycle events; writes subscription state to `organizations` via service role; entirely separate from Connect webhook |
| `/api/billing/checkout` | Creates Stripe Customer + Checkout session on org signup |
| PDF Edge Functions (all 8, updated) | Fetch `org_branding` via service role; pass as `branding` prop to document components |
| Email templates (all 3, updated) | Required `branding: OrgBranding` prop; call sites fetch branding before Resend send |

**CSS custom properties are the only correct pattern** for dynamic per-org colours. Tailwind JIT generates classes only from build-time strings — constructing class names from runtime values (e.g., `bg-[${org.colour}]`) silently fails in production builds. The `BrandingProvider` renders a `<style>` tag server-side: `:root { --org-primary: ${branding.primaryColor}; }`. Components reference it via `bg-[color:var(--org-primary)]`.

**Tier is never stored in the JWT.** JWT TTL is 3600 seconds; a stale JWT would mean downgraded orgs retain premium access for up to an hour. The middleware reads tier from the `organizations` table on every request — one indexed column added to the existing slug lookup. Tier changes take effect on the next request after the webhook fires.

**`BrandingContext` is separate from `OrgContext`.** `OrgContext` fetches from Supabase client-side on mount; branding arrives via SSR headers before client JavaScript runs. Merging them would create a race condition.

### Critical Pitfalls (from PITFALLS.md)

5 critical, 4 high-severity, and 4 medium-severity pitfalls identified. All grounded in direct codebase inspection. The 5 critical pitfalls:

1. **Mixing Stripe Connect (medic payouts) with Stripe Billing (org subscriptions).** Same SDK instance, different product lines with incompatible event namespaces. Prevention: separate webhook endpoint (`/api/stripe/billing-webhooks`), separate Stripe Dashboard registration, separate signing secret env var (`STRIPE_BILLING_WEBHOOK_SECRET`), column named with explicit `stripe_customer_id` comment clarifying it is a Billing Customer (not a Connect Customer). Must be decided before any webhook handler code is written.

2. **Subdomain routing breaks the existing auth cookie.** Supabase SSR cookies are scoped to the current hostname with no `domain` override. A session from `app.sitemedic.com` does not carry to `apex.sitemedic.com`. Setting cookie domain to `.sitemedic.com` (the wide fix) creates cross-org session leak. Prevention: each org subdomain requires its own sign-in; cookie domain is not widened. Also: Next.js versions below 15.2.3 are vulnerable to CVE-2025-29927 middleware bypass — verify version and strip `x-org-*` headers at the top of middleware before setting them.

3. **Branding data leaking across orgs via miscached lookups.** If branding is cached without the org slug as a cache key, Org A's logo renders on Org B's portal. Prevention: include hostname in all cache keys; `Vary: Host` header on subdomain responses; integration test that loads two different org subdomains and asserts each shows only its own branding.

4. **Feature gating bypassed when tier is not the intersection of Stripe status AND platform admin activation.** An org can pay Stripe but not be manually activated; it should not get full access. Prevention: two separate columns — `subscription_status` (from Stripe webhook: `active`, `past_due`, `canceled`) and `activation_status` (from platform admin: `pending`, `active`, `suspended`). Both must be `active` for full access. Enforced at middleware level (route gating) and API level (data gating). Client-side tier state is UX only, never authoritative.

5. **Existing orgs have no Stripe Billing Customer — deploy creates orphan state.** All existing `organizations` rows will have `NULL stripe_customer_id` after the migration. Code paths that assume a customer ID exists will 500; code that treats NULL as "grant access" silently bypasses the subscription model. Prevention: lazy Customer creation on first billing interaction; explicit "legacy" tier defined for NULL records; legacy tier behaviour communicated to Apex Safety Solutions before the migration runs on production.

High-severity pitfalls (also require attention):
- **Feature gating: UI gate without API gate** — Starter-tier orgs can call Growth API routes directly. Prevention: `requireTier()` helper called at top of every protected API route; a single `FEATURE_GATES` constant as the sole source of truth for both UI and API gating.
- **Webhook events arriving out of order** — `customer.subscription.deleted` can arrive before `customer.subscription.created`. Prevention: idempotency table (`webhook_events` by `stripe_event_id`); timestamp-based state transitions (only apply an event if its timestamp is newer than the last recorded transition).
- **Stripe Checkout `success_url` hardcoded for production** — breaks in Vercel preview deployments and subdomain contexts. Prevention: build `success_url` dynamically from `request.headers.get('origin')` in the checkout route.
- **White-label hides SiteMedic sub-processor identity** — GDPR Article 13 requires disclosure of data controller. Prevention: mandatory DPA before org activation; non-removable "Powered by SiteMedic" footer on white-label login pages.

---

## Implications for Roadmap

The 9-step build order from ARCHITECTURE.md is the recommended phase structure. It is a full dependency graph. Deviating from it creates the conditions for the critical pitfalls above.

### Phase 1: DB Migrations + Storage (Steps 1 and storage bucket)

**Rationale:** Everything else reads from `org_branding`, the subscription columns on `organizations`, and the `org-logos` bucket. Nothing can be safely built until the schema exists and existing orgs have `org_branding` rows backfilled.

**Delivers:** `org_branding` table with RLS + backfill, subscription columns on `organizations` with `DEFAULT NULL` and explicit NULL-handling documented, `org-logos` public bucket with write-scoped RLS migration.

**Pitfalls addressed:** Pitfall 5 (orphan state for existing orgs — backfill and NULL behaviour decided here, not during onboarding). Storage RLS pitfall — bucket policy exists before the first logo upload.

**Research flag:** Standard migration patterns. No additional research needed.

### Phase 2: Billing Infrastructure (Step 2)

**Rationale:** The billing webhook handler must be deployed and registered in Stripe Dashboard before any org can complete Stripe Checkout. If the webhook does not exist when Stripe fires `checkout.session.completed`, subscription state is never written and onboarding silently fails. This phase has no user-visible output but is the prerequisite for Phase 7 (onboarding).

**Delivers:** `web/lib/stripe/billing-plans.ts` (tier-to-priceId map and `tierFromPriceId()`), `web/lib/billing/feature-gates.ts` (`FEATURE_GATES` constant and `hasFeature()`), `web/app/api/stripe/billing-webhooks/route.ts` (webhook handler with idempotency table and timestamp-based state transitions), Stripe Dashboard webhook endpoint registered with correct events, all new env vars set in Vercel.

**Pitfalls addressed:** Pitfall 1 (Connect/Billing separation — separate handler, separate secret, first day of work). Pitfall 9 (out-of-order webhook events — idempotency table and state machine built into the first version of the handler, not retrofitted).

**Research flag:** Standard Stripe Billing patterns, well-documented. No additional research needed.

### Phase 3: Subdomain Routing — Middleware (Step 3)

**Rationale:** The `x-org-*` headers injected by middleware are the data source for all SSR branding (Phase 4). Phase 4 cannot proceed without Phase 3. Also: Vercel wildcard DNS must be configured 72 hours before the first production subdomain test — DNS change must be initiated at the start of this phase.

**Delivers:** `extractSubdomain()` helper in `web/lib/supabase/middleware.ts`, service-role org lookup by slug (with unknown slug redirecting to apex `/`), `x-org-*` header injection, security: strip all incoming `x-org-*` headers at the top of middleware before setting them (CVE-2025-29927 mitigation), `NEXT_PUBLIC_ROOT_DOMAIN` env var.

**Pitfalls addressed:** Pitfall 2 (auth cookie scoping — each subdomain gets its own session, no `.sitemedic.com` widening). CVE-2025-29927 — strip before set. Pitfall 3 (cache leak — `Vary: Host` strategy established here).

**Infrastructure prerequisite:** Wildcard `*.sitemedic.com` in Vercel + DNS CNAME record must be initiated at Phase 3 start. Deploy middleware changes before DNS is live in production but test locally first using `/etc/hosts` subdomain simulation.

**Research flag:** Well-documented Next.js + Vercel Platforms pattern. No additional research needed. Regression-test existing login and auth redirect flows thoroughly after deploying — this touches the auth middleware.

### Phase 4: Branding Data Flow — SSR Web Portal (Step 4)

**Rationale:** Once middleware injects `x-org-*` headers, the web portal can consume them. This is the most visible part of the white-label feature. Phases 5 and 6 (PDFs and emails) can be parallelised with this phase once Phase 3 is deployed.

**Delivers:** `web/contexts/branding-context.tsx` — `BrandingProvider` (client component with `<style>` tag for `--org-primary` CSS variable) + `useBranding()` hook; dashboard and admin layouts updated to read `next/headers` and pass branding to `BrandingProvider`; logo in navigation (fallback to SiteMedic logo if not set); all dynamic colour via `var(--org-primary)`, no Tailwind dynamic class names.

**Pitfalls addressed:** Pitfall 11 (dynamic Tailwind class names — CSS custom properties established as the project pattern here). Anti-pattern of client-side branding fetch — SSR headers eliminate it entirely.

**Research flag:** Standard Next.js pattern. No additional research needed.

### Phase 5: Branding Data Flow — PDFs (Step 5, parallelisable with Phase 4)

**Rationale:** All 8 PDF Edge Functions need a branding fetch added to their `index.ts` and a `branding` prop added to their document component. Edge Functions receive `org_id` in the POST body (not via subdomain headers) so this is independent of the middleware changes. Can be parallelised with Phase 4.

**Delivers:** All 8 PDF Edge Functions updated — `org_branding` fetch via service role client, `branding` prop on all PDF document components, logo rendered via `<Image src={branding.logoUrl} />`, hardcoded "SiteMedic" text placeholders removed. Priority: `generate-weekly-report` (has an explicit placeholder comment) and `generate-invoice-pdf` (no logo today).

**Pitfalls addressed:** Pitfall 6 (SiteMedic branding in white-label PDFs — all hardcoded names become props). TypeScript required prop makes it a compile error to omit branding accidentally.

**Research flag:** `@react-pdf/renderer` `<Image>` with remote Supabase Storage URL in Deno Edge runtime is MEDIUM confidence — confirmed in docs but Deno Edge to Supabase Storage network path needs a real test before updating all 8 functions. Write one minimal test PDF first.

### Phase 6: Branding Data Flow — Emails (Step 6, parallelisable with Phases 4-5)

**Rationale:** All 3 existing email templates hardcode "Apex Safety Group Ltd" in footers. This is the most immediately visible defect for Apex Safety Solutions as the first white-label customer — a mis-branded email to their client is a trust incident. Can be parallelised with Phases 4 and 5.

**Delivers:** `OrgBranding` interface at `web/lib/email/types.ts`; required `branding` prop on all 3 email templates; all email-sending routes updated to fetch `org_branding` before calling `resend.emails.send()`; "Apex Safety Group Ltd" removed from all footers; logo rendered in email header when present.

**Pitfalls addressed:** Pitfall 6 (hardcoded company names in emails). Required TypeScript prop enforces consistent branding at all call sites.

**Research flag:** Standard React Email pattern. No additional research needed.

### Phase 7: Org Onboarding Flow (Step 7)

**Rationale:** Depends on Phase 2 (billing webhook live) and Phase 4 (branding setup UI available for post-Checkout wizard). This is the customer-facing onboarding path: signup, Stripe Checkout, post-payment branding wizard, and platform admin activation.

**Delivers:** `/api/billing/checkout` route (creates Stripe Customer, creates Checkout session with `metadata: { org_id }`, returns redirect URL); signup page triggers Checkout after account creation; `/onboarding/*` branding setup wizard; platform admin `/platform/organizations` page updated with pending-activation queue, timestamp, tier, Stripe invoice link, and immediate notification on Checkout completion; post-Checkout success page shows explicit "pending review" state with expected activation timeline.

**Pitfalls addressed:** Pitfall 12 (onboarding limbo state — "pending review" message with SLA and immediate admin notification). Pitfall 4 (feature gating bypass — `activation_status` field enforced alongside `billing_status`). Pitfall 8 (hardcoded Stripe redirect URL — `success_url` built from `request.headers.get('origin')`).

**Research flag:** Verify `success_url` dynamic origin approach works correctly in Vercel preview deployments. Verify Stripe webhook race condition on the success page — use Stripe Checkout Session status API (not local DB column) to confirm payment on the success page.

### Phase 8: Feature Gating in UI (Step 8)

**Rationale:** `FEATURE_GATES` constant and `hasFeature()` helper are built in Phase 2. This phase wires them to the UI layer. Must be a coordinated single pass — adding UI gates without API gates creates a security gap (Pitfall 7).

**Delivers:** `<TierGate tier="growth">` client component (wraps gated UI elements, renders upgrade prompt for lower tiers); `requireTier()` helper for API route handlers; upgrade prompts on all Growth-gated features for Starter-tier orgs; tier displayed in admin billing page; end-to-end checklist: for every feature in the tier matrix, both a UI gate and API gate test exist.

**Pitfalls addressed:** Pitfall 7 (gated UI without gated API — the phase is structured as a complete feature-gate matrix pass, not incremental).

**Research flag:** Standard pattern. No additional research needed.

### Phase 9: Branding Settings Upload UI (Step 9)

**Rationale:** This is the last step because all infrastructure (bucket, `org_branding` table, branding context, feature gates) exists. Early customers like Apex Safety Solutions can be manually configured by the platform admin until this UI exists; it is not on the critical path to first customer activation.

**Delivers:** `/admin/settings/branding/page.tsx` — logo upload (direct to Supabase Storage `org-logos/{org_id}/logo.{ext}`), primary colour picker, company name and tagline fields, live preview showing how branding will appear in the portal.

**Pitfalls addressed:** Storage RLS pitfall — bucket policy already exists from Phase 1; this phase builds UI on top of it.

**Research flag:** Standard Next.js file upload pattern. No additional research needed.

### Phase Ordering Rationale

- **Steps 1-3 are strictly sequential.** Schema before code; billing webhook before onboarding; DNS propagation (72h) before subdomain code tested in production.
- **Steps 4, 5, 6 can be parallelised** once Step 3 middleware changes are deployed and merged. All three read from `org_branding` but touch independent rendering surfaces (web portal, PDF Edge Functions, email templates).
- **Step 7 depends on Steps 2 and 4.** Checkout needs a live webhook listener (Step 2) and the post-payment wizard needs the branding context infrastructure (Step 4).
- **Step 8 depends on Step 2** for the `FEATURE_GATES` constant and `hasFeature()` helper built there.
- **Step 9 is last** — it layers upload UI on top of storage and schema already established in Steps 1 and 3.

### Research Flags

**Needs extra care during implementation:**

- **Phase 3 (Subdomain middleware):** This is the most architecturally sensitive change — it modifies the auth middleware that all routes depend on. Regression-test all existing login, redirect, and auth guard flows after merging. Test locally with `/etc/hosts` subdomain simulation before relying on production DNS.
- **Phase 5 (PDF image loading):** `@react-pdf/renderer` `<Image>` with remote Supabase Storage URLs in the Deno Edge runtime is MEDIUM confidence. Write one test PDF Edge Function that loads a real logo URL before updating all 8 functions.
- **Phase 7 (Stripe Checkout):** Dynamic `success_url` origin in Vercel preview deployments and subdomain contexts needs explicit testing. Stripe webhook → DB write race condition on the success page needs the Stripe Session Status API approach, not a local DB poll.

**Standard patterns (no deep research required):**

- Phase 1 (Migrations), Phase 2 (Billing webhook), Phase 4 (SSR branding via request headers), Phase 6 (Email branding props), Phase 8 (Feature gating wiring), Phase 9 (Branding settings UI).

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack additions | HIGH | Direct codebase audit confirms all existing packages are sufficient; no new packages needed; package versions confirmed in `web/package.json` |
| Architecture decisions | HIGH | Middleware-centric branding propagation, separate `org_branding` table, subscription columns on `organizations` — all grounded in official Next.js, Vercel, and Supabase docs and direct code inspection |
| Subdomain routing pattern | HIGH | Identical pattern to Vercel Platforms Starter Kit (official Vercel template); `request.headers.get('host')` confirmed correct (not `nextUrl.hostname`) |
| Stripe Billing alongside Connect | HIGH | Official Stripe docs confirm coexistence; separate webhook endpoints is the documented approach; existing `stripe` v20.3.1 SDK supports both |
| Feature gating approach | HIGH | Reading tier from DB in middleware (not JWT) is unambiguous and standard; `FEATURE_GATES` as single source of truth is industry-standard SaaS pattern |
| Branding data flow via request headers | HIGH | Official Next.js `headers()` API + Vercel template for edge-injected request headers; security strip pattern from CVE-2025-29927 analysis |
| PDF image rendering (Deno Edge) | MEDIUM | `@react-pdf/renderer` docs confirm remote URL support; Deno Edge to Supabase Storage network path unverified in practice — flag for test during Phase 5 |
| GDPR sub-processor disclosure requirement | MEDIUM | Risk is well-reasoned from GDPR Article 13; specific ICO guidance for white-label SaaS sub-processor disclosure needs review by a UK data protection solicitor before first org onboarding |
| DNS propagation timing | MEDIUM | 72h estimate is standard industry guidance; actual timing depends on registrar TTL and DNS provider |

**Overall confidence: HIGH**

### Gaps to Address During Build

1. **Verify `@react-pdf/renderer` image loading in Deno Edge runtime.** Write a minimal test PDF Edge Function loading a Supabase Storage public URL as an `<Image>` before updating all 8 PDF functions. Fallback: fetch the image as an ArrayBuffer and convert to a base64 data URI — fully supported in Deno but adds ~100ms per PDF render.

2. **Define legacy tier for existing orgs before Phase 1 migration runs on production.** `NULL stripe_customer_id` must have documented behaviour: which tier do existing orgs get? Which features are accessible? This decision must be communicated to Apex Safety Solutions before the migration deploys.

3. **Clarify auth UX for org subdomain users.** Do medics and site managers sign in at `apex.sitemedic.com/login` (subdomain-scoped session) or at `app.sitemedic.com/login` (then redirect)? The cookie scoping architecture in Phase 3 depends on this answer. ARCHITECTURE.md recommends per-subdomain sign-in — confirm this is the intended UX before implementing.

4. **DPA and "Powered by SiteMedic" footer before first org onboarding.** A Data Processing Agreement must be signed before any white-label org is activated. The platform admin activation flow (Phase 7) must include a DPA confirmation step. UK data protection solicitor review of the DPA template is a non-code blocker for the first live customer.

5. **Stripe Dashboard environment hygiene.** Confirm test-mode vs. live-mode for the new billing webhook endpoint. The two signing secrets (`STRIPE_WEBHOOK_SECRET` for Connect, `STRIPE_BILLING_WEBHOOK_SECRET` for Billing) must be set from the correct Stripe Dashboard mode in each Vercel environment (preview vs. production).

---

## Sources

### Primary (HIGH confidence)

- Official Next.js documentation: [Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant), [`headers()` API](https://nextjs.org/docs/app/api-reference/functions/headers), middleware patterns
- Official Vercel documentation: [Wildcard Domains](https://vercel.com/blog/wildcard-domains), [Multi-Tenant Domain Management](https://vercel.com/docs/multi-tenant/domain-management), [Edge Functions: Modify Request Header](https://vercel.com/templates/next.js/edge-functions-modify-request-header)
- Official Stripe documentation: [Billing Subscriptions](https://stripe.com/docs/billing/subscriptions/overview), [Connect Webhooks](https://docs.stripe.com/connect/webhooks), [Billing Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Customer Portal](https://stripe.com/docs/customer-management)
- Official Supabase documentation: [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control), [SSR cookie options](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- Direct codebase inspection (all findings verified):
  - `web/middleware.ts`, `web/lib/supabase/middleware.ts`
  - `web/lib/stripe/server.ts`, `web/app/api/stripe/webhooks/route.ts`
  - `web/lib/email/templates/` (all 3 templates), `web/lib/email/resend.ts`
  - `supabase/functions/generate-invoice-pdf/components/InvoiceDocument.tsx`
  - `supabase/functions/generate-weekly-report/components/Header.tsx`
  - `supabase/migrations/00001_organizations.sql`, `027_backfill_asg_org_id.sql`, `118_org_settings.sql`, `115_referral_and_per_medic_rates.sql`
  - `web/package.json` (stripe v20.3.1, @react-pdf/renderer 4.3.2, @react-email/components 1.0.7, resend 6.9.2)
- Vercel Platforms Starter Kit (official Vercel template) — subdomain middleware pattern confirmed

### Secondary (MEDIUM confidence)

- CVE-2025-29927 Next.js middleware header injection — third-party analysis; strip-before-set mitigation adopted as standard Next.js community practice; multiple sources converge
- `@react-pdf/renderer` `<Image>` with remote URLs — confirmed in official docs at [react-pdf.org/components](https://react-pdf.org/components); Deno Edge runtime network access to Supabase Storage unverified in practice
- Multi-tenant cache key isolation — community guidance; architecture decision to include hostname in all cache keys is the standard prevention

### Tertiary (LOW confidence — needs verification)

- GDPR Article 13 sub-processor disclosure for white-label SaaS — the risk reasoning is sound but specific ICO guidance for this pattern needs solicitor review before first customer activation

---

*Research completed: 2026-02-18*
*Milestone: v3.0 White-Label Multi-Tenancy*
*Supersedes: v2.0 multi-vertical SUMMARY.md (2026-02-17)*
*Ready for roadmap: yes*
