# SiteMedic Roadmap

## Milestones

- ✅ **v1.0 MVP** — Phases 01–07.5 (13 phases, 84 plans — shipped 2026-02-16)
- ✅ **v1.1 Post-MVP Polish & Data Completeness** — Phases 08–17 (10 phases, 35 plans — shipped 2026-02-17)
- ✅ **v2.0 Multi-Vertical Platform Expansion** — Phases 18–23 (7 phases, 30 plans — shipped 2026-02-18)
- 📋 **v3.0 White-Label Platform & Subscription Engine** — Phases 24–31 (8 phases, planned)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 01–07.5) — SHIPPED 2026-02-16</summary>

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Post-MVP Polish & Data Completeness (Phases 08–17) — SHIPPED 2026-02-17</summary>

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Multi-Vertical Platform Expansion (Phases 18–23) — SHIPPED 2026-02-18</summary>

See: `.planning/milestones/v2.0-ROADMAP.md`

</details>

---

## 📋 v3.0 White-Label Platform & Subscription Engine (Phases 24–31)

**Milestone Goal:** Transform SiteMedic into a white-label SaaS engine — each subscribing medic business gets their own branded portal, subdomain, and subscription plan. Apex Safety Solutions is the first live deployment and the v3.0 launch target. Every org gets per-org branding (logo, primary colour, company name) applied consistently across the web portal, PDFs, and emails. Growth and Enterprise orgs get a subdomain at `slug.sitemedic.co.uk`. Three Stripe Billing tiers (Starter £149/mo, Growth £299/mo, Enterprise £599/mo) with a hybrid onboarding flow — pay online, platform admin activates.

**Phase list:**

- [x] **Phase 24: DB Foundation** — Next.js CVE patch, migrations 132/133/134, org backfill ✓ 2026-02-18
- [ ] **Phase 25: Billing Infrastructure** — Stripe Products, billing webhook handler, feature gates map
- [x] **Phase 26: Subdomain Routing** — Middleware wildcard DNS, subdomain extraction, security headers, branded login ✓ 2026-02-18
- [ ] **Phase 27: Branding — Web Portal** — BrandingProvider, SSR header injection, CSS custom properties, portal rebrand
- [ ] **Phase 28: Branding — PDFs & Emails** — Org logo in all 8 PDF Edge Functions + all 3 email templates
- [ ] **Phase 29: Org Onboarding Flow** — Signup page, Stripe Checkout, activation queue, welcome email
- [ ] **Phase 30: Subscription Management & Feature Gating** — Tier gates in UI and API, Stripe Customer Portal, MRR dashboard, suspension flow
- [ ] **Phase 31: Branding Settings UI** — Org admin logo upload + colour picker, platform admin branding override

---

### Phase 24: DB Foundation

**Goal:** The database schema exists for all v3.0 features. Existing orgs have `org_branding` rows and default subscription tiers. All subsequent phases can read the columns they require from day one.

**Depends on:** Phase 23 (v2.0 complete — last migration was 130/131)

**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05

**Success Criteria** (what must be TRUE when this phase completes):
1. Running migration 132 on a local Supabase instance with existing org data does not error — existing orgs receive an `org_branding` row with empty logo path, null primary colour, and their current company name carried over
2. Running migration 133 on a local Supabase instance does not error — the `organizations` table has `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, and `subscription_status` columns; existing rows have `NULL` in all four columns
3. The `org-logos` Supabase Storage bucket exists as a public bucket — a file uploaded to `org-logos/{org_id}/logo.png` is accessible via its public URL without authentication
4. Apex Safety Solutions org row has `subscription_tier = 'growth'` after the backfill — all other existing orgs have `subscription_tier = 'starter'`
5. `next --version` in the web workspace reports ≥ 15.2.3 — the CVE-2025-29927 middleware bypass patch is in place before subdomain routing expands the attack surface in Phase 26

**Plans:** 5 plans

Plans:
- [ ] 24-01-PLAN.md — Next.js CVE patch: bump next and eslint-config-next to ^15.2.3, verify build passes
- [ ] 24-02-PLAN.md — Migration 132: org_branding table with RLS, backfill rows for all existing orgs with company_name from organizations.name
- [ ] 24-03-PLAN.md — Migration 133: subscription columns on organizations + Apex/starter tier backfill
- [ ] 24-04-PLAN.md — Migration 134: public org-logos storage bucket with org-scoped write RLS
- [ ] 24-05-PLAN.md — Verify all migrations and document legacy org behaviour for downstream phases

---

### Phase 25: Billing Infrastructure

**Goal:** The billing webhook handler is deployed and registered in Stripe Dashboard before any org completes Stripe Checkout. The `FEATURE_GATES` constant and `hasFeature()` helper exist as the single source of truth for tier gating. Stripe Products and Prices for all three tiers exist with their IDs captured as env vars.

**Depends on:** Phase 24 (subscription columns must exist on `organizations` before the webhook handler writes to them)

**Requirements:** SUB-01, SUB-03, GATE-01

**Success Criteria** (what must be TRUE when this phase completes):
1. Three Stripe Products exist in the Stripe Dashboard (Starter £149/mo, Growth £299/mo, Enterprise £599/mo) — their price IDs are stored as `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE` in Vercel env vars
2. A Stripe test-mode `checkout.session.completed` event fired via the Stripe CLI arrives at `/api/stripe/billing-webhooks` and writes the correct `stripe_customer_id` and `subscription_status` to the `organizations` table — the existing Connect webhook endpoint at `/api/stripe/webhooks` is untouched
3. `hasFeature('starter', 'white_label')` returns `false` and `hasFeature('growth', 'white_label')` returns `true` — the `FEATURE_GATES` constant is the sole source of truth for both values, no duplication in component code
4. `STRIPE_BILLING_WEBHOOK_SECRET` is a distinct env var from `STRIPE_WEBHOOK_SECRET` — the two Stripe systems have separate signing secrets, preventing event cross-contamination

**Plans:** 3 plans

Plans:
- [ ] 25-01-PLAN.md — Stripe Products setup: env var template for billing Price IDs and webhook secret; user creates 3 Products with 18 Prices in Stripe Dashboard (test mode)
- [ ] 25-02-PLAN.md — Feature gates: create web/lib/billing/feature-gates.ts with FEATURE_GATES constant, hasFeature() helper, isAtLeastTier() helper, SubscriptionTier and FeatureKey types
- [ ] 25-03-PLAN.md — Billing webhook handler: migration 135 (webhook_events table + subscription_status_updated_at column); create web/app/api/stripe/billing-webhooks/route.ts handling checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed

---

### Phase 26: Subdomain Routing

**Goal:** Each org on Growth or Enterprise tier is accessible at `slug.sitemedic.co.uk`. The Next.js middleware securely extracts the subdomain, resolves the org, and injects `x-org-*` headers that all SSR pages consume. The branded login page shows the org's own identity to unauthenticated visitors.

**Depends on:** Phase 24 (Next.js ≥15.2.3 must be in place before middleware changes expand the attack surface — CVE-2025-29927)

**Note on DNS:** Vercel wildcard domain `*.sitemedic.co.uk` must be configured and the DNS CNAME initiated at the START of this phase — not at deployment. DNS propagation takes up to 72 hours. Middleware changes can be developed and deployed to Vercel before DNS is live; test locally with `/etc/hosts` subdomain simulation in the interim.

**Requirements:** ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04

**Success Criteria** (what must be TRUE when this phase completes):
1. Visiting `apex.sitemedic.co.uk/login` in a browser shows the Apex Safety Solutions login page — the org's company name appears in the header, not "SiteMedic", and no 404 or generic fallback is served
2. The Next.js middleware strips any incoming `x-org-*` headers before setting its own — an HTTP request crafted with a forged `x-org-id` header does not inject a false org context into the route handler
3. Visiting a slug that does not match any org (`notexist.sitemedic.co.uk`) redirects to the apex domain root rather than serving a blank or broken page
4. Each org subdomain requires its own sign-in — a session obtained at `app.sitemedic.co.uk` does not carry over to `apex.sitemedic.co.uk` (cookie domain is not widened to `.sitemedic.co.uk`)

**Plans:** 4 plans

Plans:
- [x] 26-01-PLAN.md — Environment Setup & DNS Initiation: add NEXT_PUBLIC_ROOT_DOMAIN env var; checkpoint for Vercel wildcard domain + DNS CNAME configuration
- [x] 26-02-PLAN.md — Middleware Subdomain Extraction & Header Injection: extractSubdomain() helper, x-org-* header stripping (CVE-2025-29927), service-role org+branding lookup by slug, header injection, unknown slug redirect
- [x] 26-03-PLAN.md — Branded Login Page: convert login to server component + client form; read x-org-* headers for org branding; fallback to SiteMedic defaults; "Powered by SiteMedic" footer
- [x] 26-04-PLAN.md — Auth Cookie Scope Verification & Local Dev Testing: fix signout route for subdomain support; verify cookie scope isolation; regression-test auth redirects

---

### Phase 27: Branding — Web Portal

**Goal:** The web portal reflects each org's brand identity — header logo, sidebar accent colour, login page company name, and browser tab title all resolve from the org's `org_branding` row, injected server-side via `x-org-*` headers before any client JavaScript runs. No flash of unbranded content.

**Depends on:** Phase 26 (middleware must inject `x-org-*` headers before the portal can consume them)

**Requirements:** BRAND-03, BRAND-06

**Success Criteria** (what must be TRUE when this phase completes):
1. Loading `apex.sitemedic.co.uk/dashboard` in a browser shows "Apex Safety Solutions" in the portal header and the Apex logo replaces the SiteMedic logo — no client-side fetch for branding occurs after page load (verify in Network tab: no `/api/branding` request on page load)
2. The primary accent colour throughout the portal (sidebar highlights, buttons, active states) matches the org's configured hex colour — changing `primary_colour_hex` in the `org_branding` table and hard-refreshing the page shows the new colour immediately
3. An org with no branding configured (null logo, null colour) sees the SiteMedic defaults throughout — no broken image placeholders, no missing colour variables
4. The browser tab title for an org portal reads "[Company Name] — SiteMedic" — not the generic "SiteMedic" title

**Plans:** TBD

Plans:
- [ ] 27-01: `BrandingContext` — create `web/contexts/branding-context.tsx` with `BrandingProvider` (client component reading SSR-passed branding props) and `useBranding()` hook; `<style>` tag rendering `:root { --org-primary: ${hex}; }` CSS custom property; fallback to SiteMedic defaults when no branding set
- [ ] 27-02: Layout integration — update dashboard and admin root layouts to read `x-org-*` headers via `next/headers` and pass branding values to `BrandingProvider`; update `<head>` title template to include org company name
- [ ] 27-03: Portal rebrand — update navigation header (logo swap, company name), sidebar (accent colour via `var(--org-primary)` CSS custom property), and browser tab title; all dynamic colours use `bg-[color:var(--org-primary)]` pattern — no Tailwind dynamic class name construction from runtime strings

---

### Phase 28: Branding — PDFs & Emails

**Goal:** Org logo and company name appear in all generated PDFs and transactional emails. No hardcoded "Apex Safety Group Ltd" or "SiteMedic" branding remains in any PDF Edge Function or email template — every call site fetches org branding before rendering.

**Depends on:** Phase 26 (org branding data exists in `org_branding` table, `org-logos` bucket is live)

**Note:** This phase is parallelisable with Phase 27 — both read from `org_branding` but touch independent rendering surfaces. Can proceed as soon as Phase 26 is deployed.

**Requirements:** BRAND-04, BRAND-05

**Success Criteria** (what must be TRUE when this phase completes):
1. Downloading a weekly PDF safety report for an org with a configured logo shows the org's logo in the PDF header — not the SiteMedic logo or a blank placeholder
2. All 8 PDF Edge Functions (`generate-weekly-report`, `generate-invoice-pdf`, `generate-riddor-f2508`, `generate-payslip`, `fa-incident-generator`, `motorsport-incident-generator`, `event-incident-report-generator`, `motorsport-stats-sheet-generator`) fetch `org_branding` via service role before rendering — the `branding` prop is required (TypeScript compile error if omitted)
3. A booking confirmation email sent for an org with a configured logo shows the org's logo in the email header and the org's primary colour in the email accent — not hardcoded SiteMedic or "Apex Safety Group Ltd" branding
4. All 3 email templates (`booking-confirmation`, `shift-alert`, `invoice-notification`) have a required `branding: OrgBranding` prop — all sending routes fetch org branding before calling `resend.emails.send()`

**Plans:** TBD

Plans:
- [ ] 28-01: PDF branding — test `@react-pdf/renderer` `<Image>` with a real Supabase Storage public URL in a Deno Edge runtime (minimal test PDF first); if successful, update all 8 PDF Edge Functions to fetch `org_branding` via service-role Supabase client and pass as required `branding` prop to document components; fallback: ArrayBuffer → base64 data URI if remote URL loading fails in Deno
- [ ] 28-02: Email branding — create `OrgBranding` interface at `web/lib/email/types.ts`; add required `branding` prop to all 3 email templates; update all email-sending routes to fetch `org_branding` before `resend.emails.send()`; remove all hardcoded "Apex Safety Group Ltd" text from email footers

---

### Phase 29: Org Onboarding Flow

**Goal:** A new medic business can discover SiteMedic, select a subscription plan, pay online via Stripe Checkout, and arrive at a post-payment branding setup wizard — all without manual Sabine involvement until the platform admin activation step. Platform admin sees a pending activation queue and triggers the welcome email on approval.

**Depends on:**
- Phase 25 (billing webhook must be deployed and registered before Stripe fires `checkout.session.completed` — if the webhook does not exist at checkout time, org subscription state is never written)
- Phase 27 (branding setup wizard uses BrandingProvider infrastructure from Phase 27)

**Requirements:** SUB-02, SUB-04, ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04

**Success Criteria** (what must be TRUE when this phase completes):
1. A new user visiting `sitemedic.co.uk/signup` can select a plan, complete Stripe Checkout in test mode, and land on a post-payment page confirming their payment is received and their account is pending activation — the entire flow completes without any manual step from Sabine
2. After the Stripe `checkout.session.completed` webhook fires, the platform admin dashboard shows the new org in a "Pending Activation" queue with the plan tier, Stripe invoice link, and signup timestamp — the queue updates within seconds of checkout completion
3. Platform admin can click "Activate" on a pending org, assign a subdomain slug, and trigger the welcome email — after activation the org's `subscription_status` is `active` and users can log in to their org portal
4. The new org admin receives a welcome email containing their login URL (including subdomain), their chosen plan, and a getting-started guide — the email uses the org's branding if already configured, or SiteMedic defaults
5. The post-payment setup wizard allows the new org admin to upload their logo, pick a primary colour, and set their company name before platform admin activation — branding data is persisted to `org_branding` even in the pending state

**Plans:** TBD

Plans:
- [ ] 29-01: Checkout route — create `web/app/api/billing/checkout/route.ts`; create Stripe Customer for new org; create Checkout Session with `metadata: { org_id }` and price ID from plan selection; `success_url` built dynamically from `request.headers.get('origin')` (not hardcoded — works in Vercel preview deployments and subdomain contexts)
- [ ] 29-02: Signup page — create `web/app/(public)/signup/page.tsx`; plan selector (Starter/Growth/Enterprise with pricing); account creation form; calls checkout route; redirects to Stripe Checkout
- [ ] 29-03: Onboarding wizard — create `web/app/onboarding/` pages: post-payment success page (explicit "pending review" state with activation SLA), branding setup step (logo upload, colour picker, company name, first medic invite); wizard is accessible to new org admin before platform admin activation
- [ ] 29-04: Platform admin activation queue — update `web/app/platform/organizations/` with pending-activation table (org name, plan, Stripe invoice link, signup timestamp); Activate button writes `activation_status = 'active'`, assigns slug, fires welcome email via Resend
- [ ] 29-05: Welcome email — create welcome email template in `web/lib/email/templates/`; called by platform admin activation route; includes login URL with subdomain, plan name, getting-started guide; uses org branding if set

---

### Phase 30: Subscription Management & Feature Gating

**Goal:** Feature gating is enforced at both the API and UI layer simultaneously. Starter-tier orgs see contextual upgrade prompts on Growth-gated features. Org admins can manage their subscription via the Stripe Customer Portal. Platform admin has an MRR dashboard. Orgs with lapsed or cancelled subscriptions see a suspension screen with data preserved and reactivation path clearly signposted.

**Depends on:**
- Phase 25 (`FEATURE_GATES` constant and `hasFeature()` helper, billing webhook for subscription state)
- Phase 29 (orgs are subscribing — subscription data is flowing into `organizations` table)

**Requirements:** GATE-02, GATE-03, GATE-04, SUB-05, SUB-06, SUB-07

**Success Criteria** (what must be TRUE when this phase completes):
1. A Starter-tier org admin visiting a Growth-gated page (e.g., branding settings) sees a contextual upgrade prompt — "Upgrade to Growth to white-label your portal" — not a blank page or generic error
2. A Starter-tier org making a direct API call to a Growth-gated endpoint (bypassing the UI) receives a `403 Forbidden` response — UI gates and API gates are enforced simultaneously with a shared `FEATURE_GATES` source
3. An org admin on any tier can access the Stripe Customer Portal from their billing settings page to upgrade their plan, update their payment method, view invoices, and cancel — the portal link is generated server-side via Stripe API
4. The platform admin subscriptions dashboard shows all org subscriptions with plan tier, status, monthly charge, and a summary MRR figure — data reads from `organizations.subscription_tier` and `organizations.subscription_status`
5. An org whose subscription is cancelled or payment has lapsed sees a "Subscription Inactive" screen when they log in — their data is fully preserved, and a "Reactivate Subscription" button links to the Stripe Customer Portal to resume billing

**Plans:** TBD

Plans:
- [ ] 30-01: `TierGate` component — create `web/components/billing/TierGate.tsx` (wraps gated UI, renders upgrade prompt for lower tiers using `useBranding()` for accent colour); `requireTier()` helper for API route handlers (reads tier from `x-org-tier` header injected by middleware)
- [ ] 30-02: Feature gate wiring — pass through every feature in the tier matrix and apply both `<TierGate>` UI gate and `requireTier()` API gate; branding features (BRAND-01 through BRAND-05) and subdomain access (ROUTE-01) gated to Growth and Enterprise
- [ ] 30-03: Stripe Customer Portal — create `web/app/api/billing/portal/route.ts` (server-side Stripe Customer Portal session creation); add billing settings page to org admin settings with portal link button
- [ ] 30-04: Platform admin MRR dashboard — add subscription tab to platform admin dashboard showing all org subscriptions table (org name, plan, status, MRR contribution); aggregate MRR summary card; reads from `organizations` table
- [ ] 30-05: Suspension flow — update middleware to check `subscription_status` and `activation_status`; redirect suspended orgs to `/suspended` page with "Subscription Inactive" message, data-preservation assurance, and Stripe Customer Portal reactivation link; reactivation via billing webhook `customer.subscription.updated` event restoring active status

---

### Phase 31: Branding Settings UI

**Goal:** Org admins can self-serve their branding configuration — upload logo, pick primary colour, set company name and tagline — and see a live preview of how changes will appear. Platform admins can configure branding for any org as a white-glove setup service for new subscribers.

**Depends on:** All preceding phases (bucket exists from Phase 24, `org_branding` table from Phase 24, BrandingProvider from Phase 27, feature gates from Phase 30 — Growth tier required to access this page)

**Requirements:** BRAND-01, BRAND-02

**Success Criteria** (what must be TRUE when this phase completes):
1. An org admin on the Growth tier can navigate to their branding settings page, upload a logo image, select a primary colour from a colour picker, and edit their company name and tagline — saving the form updates `org_branding` and the changes are reflected in the portal immediately on next page load
2. After uploading a logo, the logo file is accessible at its Supabase Storage public URL (`org-logos/{org_id}/logo.{ext}`) — the URL is stored in `org_branding.logo_path` and subsequent PDF and email generation picks up the new logo without any further action
3. A Starter-tier org admin visiting the branding settings page sees an upgrade prompt ("Upgrade to Growth to access white-label branding") — the page does not expose the upload form or colour picker to Starter-tier orgs
4. A platform admin can navigate to any org in the platform admin panel and override that org's branding — upload a logo and set a colour on behalf of the org without being an org admin themselves

**Plans:** TBD

Plans:
- [ ] 31-01: Org admin branding settings — create `web/app/(dashboard)/admin/settings/branding/page.tsx`; logo upload (direct to `org-logos/{org_id}/logo.{ext}` via Supabase Storage client); primary colour picker (hex input + visual swatch); company name and tagline text fields; live preview panel; `<TierGate tier="growth">` wrapping the entire form
- [ ] 31-02: Platform admin branding override — add branding override section to `web/app/platform/organizations/[id]/page.tsx`; reuse branding form components from 31-01; service-role Supabase writes (platform admin uses service role, bypasses org-scoped RLS)

---

## Progress

**Execution Order:** 01 → 01.5 → 02 → 03 → 04 → 04.5 → 04.6 → 05 → 05.5 → 06 → 06.5 → 07 → 07.5 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 18.5 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31

Note: Phases 27 and 28 can be parallelised once Phase 26 is deployed. Phase 30 and 31 are sequential but both depend on Phase 25 being fully operational.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01–07.5 (13 phases) | v1.0 | 84/84 | Complete | 2026-02-16 |
| 08–17 (10 phases) | v1.1 | 35/35 | Complete | 2026-02-17 |
| 18. Vertical Infrastructure & RIDDOR Fix | v2.0 | 5/5 | Complete | 2026-02-18 |
| 18.5. Construction & Infrastructure Vertical | v2.0 | 2/2 | Complete | 2026-02-18 |
| 19. Motorsport Vertical | v2.0 | 5/5 | Complete | 2026-02-18 |
| 20. Festivals & Events Vertical | v2.0 | 4/4 | Complete | 2026-02-17 |
| 21. Film/TV Production Vertical | v2.0 | 2/2 | Complete | 2026-02-17 |
| 22. Football / Sports Vertical | v2.0 | 5/5 | Complete | 2026-02-18 |
| 23. Analytics — Heat Maps & Trend Charts | v2.0 | 7/7 | Complete | 2026-02-18 |
| 24. DB Foundation | v3.0 | 0/5 | Not started | - |
| 25. Billing Infrastructure | v3.0 | 0/3 | Not started | - |
| 26. Subdomain Routing | v3.0 | 4/4 | Complete | 2026-02-18 |
| 27. Branding — Web Portal | v3.0 | 0/3 | Not started | - |
| 28. Branding — PDFs & Emails | v3.0 | 0/2 | Not started | - |
| 29. Org Onboarding Flow | v3.0 | 0/5 | Not started | - |
| 30. Subscription Management & Feature Gating | v3.0 | 0/5 | Not started | - |
| 31. Branding Settings UI | v3.0 | 0/2 | Not started | - |
