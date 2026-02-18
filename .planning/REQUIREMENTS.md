# Requirements: SiteMedic v3.0 — White-Label Platform & Subscription Engine

**Defined:** 2026-02-18
**Core Value:** Documentation happens automatically as the medic does their job, not as separate admin work.

## v3.0 Requirements

### INFRA — Infrastructure Prerequisites

Foundation work that all subsequent phases depend on. No user-visible output — prerequisite infrastructure.

- [ ] **INFRA-01**: Next.js is updated to ≥15.2.3 (CVE-2025-29927 patch required before subdomain routing expands the attack surface)
- [ ] **INFRA-02**: `org_branding` table created (logo_path, primary_colour_hex, company_name, tagline) with RLS policies scoped to org_id
- [ ] **INFRA-03**: `organizations` table gains subscription columns: `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier` (starter/growth/enterprise), `subscription_status` (active/past_due/cancelled)
- [ ] **INFRA-04**: `org-logos` Supabase Storage bucket created as public with org_id-namespaced paths (public URLs required — logos appear in PDFs and emails hours after generation)
- [ ] **INFRA-05**: Existing orgs are backfilled with default subscription tier (growth for Apex Safety Solutions, starter for all others) and empty org_branding rows

### BRAND — White-Label Branding

- [ ] **BRAND-01**: Org admin can upload their logo, set a primary brand colour (hex), and edit their company name from the org settings page — changes are reflected immediately
- [ ] **BRAND-02**: Platform admin can upload/override branding for any org from the platform admin panel (white-glove setup for new subscribers)
- [ ] **BRAND-03**: Org branding is applied to the web portal — header logo, sidebar accent colour, login page company name and logo, browser tab title
- [ ] **BRAND-04**: Org logo and company name appear in the header of all generated PDFs (weekly reports, RIDDOR F2508, payslips, invoices) — replaces hardcoded SiteMedic identity
- [ ] **BRAND-05**: Org logo and primary colour appear in all transactional emails (booking confirmations, shift alerts, invoice notifications) — replaces hardcoded email branding
- [ ] **BRAND-06**: Branding is resolved server-side in Next.js middleware via `x-org-*` request headers — zero client-side branding fetches on page load

### ROUTE — Subdomain Routing

- [ ] **ROUTE-01**: Each org on Growth or Enterprise tier is accessible at `slug.sitemedic.co.uk` (e.g. `apex.sitemedic.co.uk`) — Vercel wildcard domain `*.sitemedic.co.uk` configured
- [ ] **ROUTE-02**: Next.js middleware extracts the subdomain from the `host` header, looks up the org by slug using service role, and injects org context as `x-org-*` request headers
- [ ] **ROUTE-03**: Incoming `x-org-*` headers are stripped at the top of middleware before being re-set (prevents external header injection)
- [ ] **ROUTE-04**: The branded login page at `slug.sitemedic.co.uk/login` shows the org's logo and company name — unauthenticated visitors see the org's brand, not SiteMedic's

### SUB — Subscription Engine

- [x] **SUB-01**: Three Stripe Products/Prices exist in Stripe Dashboard: Starter £149/mo, Growth £299/mo, Enterprise £599/mo — price IDs stored as env vars (`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE`)
- [ ] **SUB-02**: A new medic business can sign up at `sitemedic.co.uk/signup`, select a plan, and complete payment via Stripe Checkout — flow works end-to-end in test mode
- [x] **SUB-03**: A dedicated `/api/stripe/billing-webhooks` endpoint (separate signing secret from Connect webhooks) handles subscription lifecycle events: `checkout.session.completed` creates the org record; `customer.subscription.updated` updates tier; `customer.subscription.deleted` suspends org access
- [ ] **SUB-04**: Platform admin receives a notification and sees a pending activation queue when a new org signs up — can activate the org, assign slug, and trigger branding setup
- [ ] **SUB-05**: Org admin can access the Stripe Customer Portal from their settings page to manage billing (upgrade plan, update payment method, view invoices, cancel)
- [ ] **SUB-06**: Platform admin dashboard shows all org subscriptions with plan, status, MRR summary, and churn indicators
- [ ] **SUB-07**: When a subscription is cancelled or payment lapses, the org's access is gracefully suspended — admins see a "subscription inactive" screen, data is preserved, reactivation restores full access

### GATE — Feature Gating

- [x] **GATE-01**: A single server-side `FEATURE_GATES` map defines which features are available per tier — tier is read from `organizations.subscription_tier` on each middleware request (never from JWT)
- [ ] **GATE-02**: White-label branding (BRAND-01 through BRAND-05) and subdomain access (ROUTE-01) are gated to Growth and Enterprise tiers — Starter orgs use SiteMedic default branding
- [ ] **GATE-03**: Feature gates are enforced at both the API route layer and the UI layer simultaneously — UI gates alone are not sufficient (prevents bypass-by-URL)
- [ ] **GATE-04**: Starter tier org admins see contextual upgrade prompts when they encounter Growth-gated features (e.g. "Upgrade to Growth to white-label your portal")

### ONBOARD — Org Onboarding Flow

- [ ] **ONBOARD-01**: A public signup page at `sitemedic.co.uk/signup` allows a new medic business to create an account and select a subscription tier
- [ ] **ONBOARD-02**: After Stripe Checkout completes, the new org admin is guided through a post-payment setup wizard: upload logo, pick brand colour, set company name, invite first medic
- [ ] **ONBOARD-03**: Platform admin receives an email notification when a new org signs up and can activate the org from the platform admin panel (hybrid: org pays online, Sabine configures and activates)
- [ ] **ONBOARD-04**: New org admin receives a welcome email after platform admin activation with login URL, subdomain, and getting-started guide

## Future Requirements (v3.1+)

### Custom Domains
- **CDOM-01**: Enterprise orgs can configure a fully custom domain (e.g. `portal.apexsafety.co.uk`) — requires DNS CNAME setup, automated SSL provisioning via Vercel
- **CDOM-02**: Custom Resend from-domain per org (`hello@apexsafety.co.uk`) — requires per-org Resend domain verification

### Extended Branding
- **XBRAND-01**: Custom font selection per org (system-safe fonts only to avoid bundle bloat)
- **XBRAND-02**: White-label mobile app (separate App Store entry per org) — very high complexity, Enterprise-only

### Advanced Subscription
- **ADVS-01**: Annual billing option (discount vs monthly)
- **ADVS-02**: Per-seat pricing above tier medic limits (overage billing)
- **ADVS-03**: Trial period (14-day free trial before first charge)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom domains in v3.0 | Requires automated SSL provisioning — too complex for v3.0; deferred to v3.1 |
| Custom from-domain emails | Requires per-org Resend domain verification + DNS setup — deferred to v3.1 |
| White-label mobile app | Separate App Store entry per org — extremely high complexity; deferred indefinitely |
| Annual billing | Adds Stripe proration complexity — deferred to v3.1 |
| Automated DPA generation | Requires solicitor review — not a code problem |
| Stripe Entitlements API | Custom FEATURE_GATES map is simpler; avoids Stripe API calls on every gating check |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 24 | Complete |
| INFRA-02 | Phase 24 | Complete |
| INFRA-03 | Phase 24 | Complete |
| INFRA-04 | Phase 24 | Complete |
| INFRA-05 | Phase 24 | Complete |
| SUB-01 | Phase 25 | Complete |
| SUB-03 | Phase 25 | Complete |
| GATE-01 | Phase 25 | Complete |
| ROUTE-01 | Phase 26 | Complete |
| ROUTE-02 | Phase 26 | Complete |
| ROUTE-03 | Phase 26 | Complete |
| ROUTE-04 | Phase 26 | Complete |
| BRAND-03 | Phase 27 | Complete |
| BRAND-06 | Phase 27 | Complete |
| BRAND-04 | Phase 28 | Complete |
| BRAND-05 | Phase 28 | Complete |
| SUB-02 | Phase 29 | Pending |
| SUB-04 | Phase 29 | Pending |
| ONBOARD-01 | Phase 29 | Pending |
| ONBOARD-02 | Phase 29 | Pending |
| ONBOARD-03 | Phase 29 | Pending |
| ONBOARD-04 | Phase 29 | Pending |
| GATE-02 | Phase 30 | Pending |
| GATE-03 | Phase 30 | Pending |
| GATE-04 | Phase 30 | Pending |
| SUB-05 | Phase 30 | Pending |
| SUB-06 | Phase 30 | Pending |
| SUB-07 | Phase 30 | Pending |
| BRAND-01 | Phase 31 | Pending |
| BRAND-02 | Phase 31 | Pending |

**Coverage:**
- v3.0 requirements: 30 total
- Mapped to phases: 30/30 (100%)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 — traceability validated against ROADMAP.md v3.0 phase structure (Phases 24–31)*
