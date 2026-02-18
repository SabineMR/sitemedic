# Domain Pitfalls: Adding White-Label Branding, Subdomain Routing, and Stripe Billing to an Existing Multi-Tenant SaaS

**Domain:** Medic staffing compliance SaaS — adding white-label, per-org subdomains, and Stripe Billing subscription tiers to a shipped system
**Researched:** 2026-02-18
**Confidence:** HIGH — findings grounded in direct codebase inspection + cross-referenced with Stripe documentation, Next.js GitHub issues, and Supabase auth documentation

---

## How to Read This File

This file documents pitfalls specific to **adding these features to an existing system** — not greenfield. The distinction matters: an existing system has live users, live cookies, live Stripe Connect wiring, and live RLS policies. Every pitfall below accounts for what is already in place.

Each entry is structured as:

- **What goes wrong** — the failure mode
- **Evidence in this codebase** — what was found during code inspection or is a known structural property of the system
- **Warning signs** — how to detect this early
- **Prevention strategy** — concrete, actionable steps
- **Phase to address** — when in the roadmap this must be resolved
- **Severity** — Critical (blocks launch or causes data leaks) / High (degrades UX noticeably) / Medium (annoying but recoverable)

---

## Critical Pitfalls

Mistakes that block launch, cause data leaks, corrupt billing state, or expose security vulnerabilities.

---

### Pitfall 1: Confusing Stripe Connect (Medic Payouts) with Stripe Billing (Org Subscriptions)

**Severity:** CRITICAL

**What goes wrong:**
The existing system uses **Stripe Connect** to pay medics (the revenue split and referral system added in migration 115). The new milestone adds **Stripe Billing** so staffing orgs pay SiteMedic a subscription fee. These are two entirely separate Stripe product lines using different objects, different APIs, and different webhook event namespaces — but they share one Stripe account and one `STRIPE_SECRET_KEY`.

The confusion manifests in three specific ways:

1. **Webhook handler pollution.** A single webhook endpoint (or a shared handler) receives events from both systems. A `customer.subscription.updated` event from Stripe Billing (org subscription tier changed) gets mixed with `transfer.paid` and `account.updated` events from Connect (medic payout completed). If the handler routes by event type without also checking whether the event originated from the platform account vs. a connected account, it will try to process a Billing event as a Connect event or vice versa. This can result in subscription state being silently ignored, or — worse — a medic payout event being misread as a subscription cancellation.

2. **Customer object ownership mismatch.** In Stripe Billing, the `Customer` object represents the org (the business paying the subscription). In Connect, `Customer` objects may exist on connected accounts (medics) for payment method storage. If the implementation creates a Stripe Customer for each org to hold their subscription but reuses the same `stripe.customers.create()` call pattern already used for medic payment methods, the team may accidentally create Customers on connected accounts instead of the platform account — or add subscription data to medic-level Customers.

3. **`stripe_customer_id` column ambiguity.** If a single `stripe_customer_id` column is added to the `organizations` table (the natural place), it will hold the Billing Customer ID for the org. But if the medic payout logic also stores a Connect account's Customer ID on the org (some Connect patterns do this for charge-back tracking), the column semantics clash immediately with no compile error.

**Evidence in this codebase:**
`web/lib/stripe/server.ts` initialises one `stripe` instance with `STRIPE_SECRET_KEY`. No separation of concerns between Connect and Billing operations exists yet — both will share this instance. The Stripe Node SDK version installed is `stripe@20.3.1` (detected in node_modules), which supports both Connect and Billing, making it easy to call the wrong API without a type error.

Migration 115 adds `is_referral`, `referred_by`, `referral_payout_percent`, `referral_payout_amount`, `platform_net` to bookings — these are Connect-related payout fields. Adding a `stripe_customer_id` to `organizations` for Billing without clear naming will create two parallel Stripe-ID concepts with no column-level differentiation.

**Warning signs:**
- A webhook handler file has both `customer.subscription.*` and `transfer.*` event cases in the same switch statement without account-level routing
- A column named `stripe_customer_id` appears on `organizations` without a comment specifying it is the Billing Customer (not a Connect Customer)
- Test logs show a `customer.subscription.deleted` event triggering the wrong handler path
- A medic payout fails silently because the webhook routing check erroneously matched a Billing event

**Prevention strategy:**
1. Create separate webhook endpoints from day one: `/api/webhooks/stripe-billing` (Stripe Billing events: `customer.subscription.*`, `invoice.*`, `checkout.session.*`) and keep/extend `/api/webhooks/stripe-connect` (Connect events: `transfer.*`, `account.*`, `payout.*`). Register these as separate webhook destinations in the Stripe Dashboard.
2. Name the new column on `organizations` explicitly: `billing_stripe_customer_id` (not `stripe_customer_id`). The `billing_` prefix makes the purpose unambiguous and prevents future columns from colliding.
3. Add a code comment in `web/lib/stripe/server.ts` that names the two Stripe product lines in use, links to their respective docs, and states which functions belong to which product line.
4. For all new Billing-related Stripe API calls, always create Customers on the **platform account** (no `stripeAccount` header). Connect operations target connected accounts. Document this distinction in the billing service file.
5. When processing incoming webhooks, validate the `Stripe-Signature` header against the correct webhook secret (each endpoint has its own secret in Stripe Dashboard). Mixing secrets will cause signature validation failures that are hard to debug.

**Phase to address:**
Stripe Billing integration phase — before any webhook handler is written. The architectural decision (separate endpoints) must be made first.

---

### Pitfall 2: Subdomain Routing Breaks the Existing Auth Cookie

**Severity:** CRITICAL

**What goes wrong:**
The current middleware (`web/middleware.ts` → `web/lib/supabase/middleware.ts`) creates Supabase auth cookies that are scoped to the current hostname. When a user signs in at `app.sitemedic.com`, the Supabase SSR client (`@supabase/ssr`) sets cookies with no explicit `domain` option — which defaults to the current hostname only. When subdomain routing is added and an org accesses `acmecorp.sitemedic.com`, the browser will not send the `app.sitemedic.com` session cookie to the subdomain. The user is forced to re-authenticate on every subdomain, and if the auth redirect points back to `app.sitemedic.com`, they enter an infinite redirect loop.

The reverse problem also occurs: if the cookie domain is set to `.sitemedic.com` (the apex with a leading dot, which shares the cookie across all subdomains), then a session cookie from `acmecorp.sitemedic.com` is readable by `othercorp.sitemedic.com`. In the white-label context this is a cross-org session leak — a user signed into Org A's subdomain should never have their session cookie sent to Org B's subdomain.

There is a third variant: the middleware's `publicRoutes` list in `web/lib/supabase/middleware.ts` checks `request.nextUrl.pathname`. When subdomain routing is added and the middleware uses `NextResponse.rewrite()` to map `acmecorp.sitemedic.com/dashboard` to an internal path, the pathname the middleware sees is the rewritten path, not the original. The public route check may pass or fail incorrectly depending on whether it runs before or after the rewrite.

Additionally, CVE-2025-29927 is a confirmed critical vulnerability (CVSS 9.1) in Next.js versions prior to 15.2.3 that allows attackers to bypass middleware authentication entirely by sending the `x-middleware-subrequest` header. If this system runs on a version below 15.2.3 on a self-hosted deployment, adding more routes via subdomain routing expands the attack surface without fixing the underlying bypass.

**Evidence in this codebase:**
`web/lib/supabase/middleware.ts` `setAll()` callback calls `supabaseResponse.cookies.set(name, value, options)` but the `options` object comes directly from Supabase SSR — no `domain` override is applied. The middleware has no hostname parsing logic today. All routing decisions use `request.nextUrl.pathname` with no subdomain awareness.

**Warning signs:**
- User signs in at `acmecorp.sitemedic.com`, is redirected to `/dashboard`, middleware does not find a session, redirects to `/login` — infinite loop
- Browser devtools show the auth cookie domain is `acmecorp.sitemedic.com` but the request is going to `app.sitemedic.com`
- Setting cookie domain to `.sitemedic.com` and noticing in devtools that the cookie appears in requests to multiple org subdomains simultaneously
- A test reveals that a user authenticated on Org A's subdomain can access Org B's subdomain without re-authenticating

**Prevention strategy:**
1. Subdomain routing middleware must run before auth cookie logic. Parse the hostname at the top of `middleware.ts` to extract the org subdomain slug. Use `NextResponse.rewrite()` to map the subdomain to an internal path before the Supabase session refresh runs.
2. **Do not share session cookies across subdomains.** Each org subdomain should require its own sign-in. The Supabase auth cookie should be scoped to the specific subdomain (no leading dot). A user who is signed into the main app (`app.sitemedic.com`) must re-authenticate on `acmecorp.sitemedic.com` — this is correct behaviour for white-label isolation.
3. Set `cookieOptions.domain` explicitly in the Supabase SSR client constructor for each context: for the main app, omit the `domain` (defaults to current host); for subdomain contexts, set to the current subdomain only.
4. Audit the Next.js version. If running below 15.2.3, update before adding subdomain routing. Block the `x-middleware-subrequest` header at the reverse proxy (nginx/Vercel edge) regardless of version. This header should never arrive from external clients.
5. The public routes check in middleware must account for the rewrite: check `request.nextUrl.pathname` before the rewrite takes effect, or use the original URL object.

**Phase to address:**
Subdomain routing phase — this is the first task, before any branding or feature gating work. The cookie architecture must be decided before any org-facing routing is built.

---

### Pitfall 3: Branding Data Leaking Across Orgs via Uncached or Mis-Cached Lookups

**Severity:** CRITICAL

**What goes wrong:**
White-label branding requires fetching the org's logo URL, primary colour, and name on every request to render the correct brand. The natural implementation is: middleware resolves the subdomain → looks up the org's branding config from Supabase → passes it to the layout. If this lookup is cached (in Vercel's ISR/CDN cache, in a server-side cache, or in a React cache) without including the org slug as part of the cache key, two orgs can receive each other's branding.

This is not hypothetical — it is a documented pattern failure in multi-tenant caching. A deploy or a cache warm-up that fetches Org A's branding first will cause Org B's first request to hit the stale Org A cache entry if the cache key is only the path (`/dashboard`) and not the org context (`/dashboard?org=acmecorp`).

The second variant is Vercel's CDN-level cache. If branding is rendered server-side (SSR) and the CDN caches the rendered HTML, a cached page that shows Org A's logo gets served to Org B's visitors unless the cache key includes the hostname. Vercel does not automatically include the hostname in its cache key for custom subdomains unless explicitly configured.

The third variant involves Supabase Storage: org logos are stored in a bucket. If the bucket policy allows public reads with no path-scoping (e.g., `logos/` is fully public), any logo URL can be guessed by substituting the org UUID in the path. This is not a caching problem but a data exposure problem — a white-label client's logo could be accessed by another org's users if the URL structure is predictable.

**Evidence in this codebase:**
`supabase/migrations/00001_organizations.sql` creates the `organizations` table with `name TEXT NOT NULL` but no branding fields yet. The branding schema (`logo_url`, `primary_colour`) does not exist yet — it will be added in the new milestone. The risk is in how it will be fetched and cached once added.

`supabase/migrations/014_storage_buckets.sql` creates storage buckets; the access policy for the planned `logos` bucket will determine whether logo URLs are guessable.

`web/lib/supabase/server.ts` and `web/lib/supabase/client.ts` create Supabase clients — neither has any application-level cache layer today. The risk emerges when a caching layer is added for branding lookups.

**Warning signs:**
- Org B's admin portal shows Org A's logo after a deploy
- Clearing browser cache resolves the wrong-logo issue temporarily (CDN cache hit)
- Two different subdomains show the same logo in the same browser session
- A logo URL from one org can be loaded by a user of a different org by substituting a UUID in the URL

**Prevention strategy:**
1. Branding lookups must include the org slug or org UUID as a cache key component at every layer: React `cache()`, Vercel ISR, and CDN. Never cache branding on path alone.
2. For Vercel hosting: add the `Vary: Host` header to all subdomain responses, or use `next.config.js` headers configuration to include the host in the cache key for ISR pages.
3. For Supabase Storage: create logo buckets with **authenticated read** policies (not public), and generate short-lived signed URLs when rendering the branding. This prevents logo URL guessing even if the UUID is exposed in the page source.
4. Add an integration test (or smoke test in CI) that: loads Org A's subdomain, asserts Org A's logo is shown, loads Org B's subdomain in the same test runner, asserts Org B's logo is shown and Org A's logo is absent.
5. Do not use Vercel's CDN for org-specific branded pages without explicit cache key configuration. Either serve branded pages with `Cache-Control: private, no-store` (safe but slower) or configure Vercel's cache key to include the hostname.

**Phase to address:**
Branding implementation phase — the cache key strategy must be decided before any branding fetch is written, not retrofitted after.

---

### Pitfall 4: Subscription Tier Not Authoritative — Feature Gating Can Be Bypassed

**Severity:** CRITICAL

**What goes wrong:**
Feature gating based on subscription tier is only as strong as the data source it reads from. The common mistake is: the front-end reads the org's tier from a database column (e.g., `organizations.subscription_tier`) and shows or hides UI elements based on it. This column is set by a webhook handler when Stripe confirms payment. If:

- The webhook is delayed or missed, the column is stale. Stripe retries webhooks for up to 3 days — an org that cancelled yesterday may still show as active.
- The column is set but the UI reads it from a client-side context (React state, local storage) that was populated at page load and is now stale after a mid-session tier change.
- The API route that serves gated data checks the column directly with a Supabase query, but the RLS policies do not enforce the subscription tier at the database level. A developer who adds a new API route may forget to check the tier, leaving a gap.

The result is a tier bypass: an org on the Starter plan accesses Growth-plan features because the UI gate was not present on a new route, or because the webhook was missed, or because the column was last written by a stale handler.

In this codebase's context: the platform admin manually activates orgs after Stripe Checkout. This "hybrid onboarding" means there is a deliberate human step before full activation. If the feature gate reads only Stripe's subscription status (ignoring the manual activation flag), an org that paid but was not manually activated gets full access. If it reads only the manual activation flag (ignoring Stripe's subscription status), an org whose subscription lapsed still gets access.

**Evidence in this codebase:**
`web/lib/supabase/middleware.ts` currently checks `user.app_metadata?.org_id` but does not check subscription tier or activation status. The middleware is the natural place to enforce tier gating at the routing level — this does not exist yet. `org_settings` (migration 118) exists but does not have a `subscription_tier` or `is_active` column yet. Both will be added in the new milestone, making the design decision critical.

**Warning signs:**
- An org on Starter tier can access a Growth-only page by typing the URL directly
- A webhook delivery failure means an org's tier is not downgraded after cancellation
- An org that completed Stripe Checkout but was not manually activated by the platform admin can access the full dashboard
- A new API route is added for a Growth feature without a tier check, and Starter orgs call it successfully

**Prevention strategy:**
1. The subscription tier must be the intersection of two sources: Stripe's subscription status (confirmed via webhook) AND the platform admin's manual activation flag. Both must be true for full access. Store both separately: `billing_status` (from Stripe: `active`, `past_due`, `canceled`) and `activation_status` (from platform admin: `pending`, `active`, `suspended`).
2. Enforce tier gating at the middleware level for route-based restrictions (block `/growth-feature/*` for Starter orgs at the Next.js middleware). This prevents URL-guessing bypasses.
3. Enforce tier gating at the API level for data-based restrictions (a Supabase RLS policy or an API route guard that checks `activation_status = 'active' AND billing_status = 'active'`). This catches cases where the UI gate was missed on a new route.
4. Webhook handlers must be idempotent: track processed event IDs in a `webhook_events` table and skip duplicates. Stripe retries events for 3 days — processing a `customer.subscription.updated` event twice must not corrupt the `billing_status`.
5. Do not trust client-side tier state for security decisions. The tier check that controls access must happen server-side on every request, not once at page load.

**Phase to address:**
Stripe Billing integration phase, specifically the webhook handler and tier state design. The data model for `billing_status` + `activation_status` must be settled before any feature gating UI is built.

---

### Pitfall 5: Existing Orgs Have No Stripe Billing Customer — Migration Path Creates Orphan State

**Severity:** CRITICAL

**What goes wrong:**
When Stripe Billing is added to an existing system, every existing org needs a Stripe Billing Customer record — but they do not have one yet. If the code path that serves existing org users assumes a `billing_stripe_customer_id` is always present (because new orgs will create it during Stripe Checkout), existing org users will hit null reference errors or ungated access.

Two failure modes exist:

1. **Hard failure:** The billing service throws when `billing_stripe_customer_id IS NULL`, breaking the dashboard for existing orgs. These are paying customers who suddenly cannot use the product after a deploy.
2. **Silent bypass:** The feature gate treats `NULL billing_stripe_customer_id` as "not billing customer yet — give full access as a grace period." This is typically what developers do to avoid hard failures, but it means all existing orgs get all features indefinitely — the subscription model has no effect on them.

The existing codebase has multiple orgs already in the `organizations` table with no billing columns. A deploy that adds feature gating must handle these orgs explicitly.

**Evidence in this codebase:**
`supabase/migrations/00001_organizations.sql` creates `organizations` with `id`, `name`, `created_at`, `updated_at` — no billing fields. There are already live orgs (backfill seeds in migrations like 118 show `FROM organizations ON CONFLICT DO NOTHING`). These orgs will exist without billing data when the new columns land.

**Warning signs:**
- A deploy adding billing columns causes 500 errors on existing org dashboards
- Support request from existing client: "I can't log in since the update"
- All existing orgs silently get Enterprise-tier access because the gate returns `true` on `NULL`
- The first billing webhook arrives for a new org but the handler cannot find the existing org by `billing_stripe_customer_id` because the column was NULL before Checkout

**Prevention strategy:**
1. When adding billing columns to `organizations`, always use `DEFAULT NULL` and treat NULL as "legacy org — apply a defined tier" explicitly. Do not leave the NULL interpretation ambiguous. Document the intended behaviour: `NULL billing_stripe_customer_id` → assigned to `legacy` tier with defined access level.
2. Write a backfill script (not a migration — migrations must not make external API calls) that runs as a one-time post-deploy job: for each existing org, call `stripe.customers.create()` with the org's name and admin email, then store the returned Customer ID in `billing_stripe_customer_id`. This can be done lazily (create the Customer on the org's first request if NULL) or eagerly (pre-create all).
3. The "lazy creation" pattern: in the billing service, if `billing_stripe_customer_id IS NULL`, create the Stripe Customer on the fly and update the org record before continuing. This eliminates hard failures at the cost of a slightly slower first request.
4. Decide the legacy tier before launch and communicate it to existing clients. Do not leave it implicit.

**Phase to address:**
Stripe Billing integration phase — the migration and backfill strategy must be defined before the billing columns are added to production.

---

## High Pitfalls

Mistakes that degrade UX noticeably, create billing edge cases, or produce support burden.

---

### Pitfall 6: Invoice PDF and Email Branding Is Org-Agnostic — Will Show SiteMedic Branding for White-Label Clients

**Severity:** HIGH

**What goes wrong:**
The existing invoice PDF generator (`web/lib/invoices/pdf-generator.ts`) hardcodes SiteMedic bank details, payment terms text, and uses the `Helvetica` font with no logo. The email client (`web/lib/email/resend.ts`) uses a single global `RESEND_API_KEY`. When white-label is active, org clients expect to receive invoices and emails branded with their medic staffing business identity — not SiteMedic's identity.

Specifically, the `InvoiceDocument` component renders:
- No logo (line 47: `<Text style={invoiceStyles.title}>INVOICE</Text>` — hardcoded text, no image)
- Hardcoded footer: `Bank details: Sort Code 12-34-56, Account 12345678` (line 127) — this is placeholder but will be wrong for white-label orgs that have their own bank details
- No primary colour — all grey/neutral

For email, the `from` address is set per email send call. If the `from` is `noreply@sitemedic.com`, a white-label org's client will see "SiteMedic" as the sender — breaking the white-label illusion.

The risk compounds in server-side generation: `generateInvoicePDF()` is called asynchronously on a server. If there is any module-level caching of the PDF template (e.g., a singleton component or a cached style object), one org's logo URL could be rendered in another org's PDF if the server processes two concurrent PDF generation requests.

**Evidence in this codebase:**
`web/lib/invoices/pdf-generator.ts` lines 125–128: footer hardcodes payment terms and bank details. Line 47: title is hardcoded text. Lines 27–40: `invoiceStyles` is a module-level constant created once — styles are shared across all PDF renders (no org-specific colour injection).

`web/lib/email/resend.ts`: Single global `resend` client. Email `from` address is not shown in this file — it will be set in the individual send functions, and those must be updated per-org for white-label.

**Warning signs:**
- A white-label client receives an invoice PDF with the footer saying "SiteMedic Bank Details" or with placeholder bank info
- The `from` address on booking confirmation emails reads `noreply@sitemedic.com` for an org that expects `noreply@acmemedicalsupport.com`
- Two concurrent PDF generation requests: one org's logo appears in the other org's PDF (if logo is set as a module-level variable)
- Client complaint: "Our clients can see this is SiteMedic software — we need our own branding"

**Prevention strategy:**
1. `InvoiceDocument` must accept a `branding` prop: `{ logoUrl: string | null, primaryColour: string, orgName: string, bankDetails: string, paymentTermsText: string }`. All current hardcoded values become props. Fetch branding from the org's settings before calling `generateInvoicePDF()`.
2. `invoiceStyles` as a module-level constant is safe only because it has no org-specific values today. Once primary colour is injected, use `StyleSheet.create()` inside a function that takes `primaryColour` as a parameter — do not share styles across renders.
3. For email `from` addresses, create a per-org sending configuration: `{ from: 'noreply@{orgDomain}', replyTo: orgAdminEmail }`. This requires the org to configure a verified sending domain in Resend. Add this to the onboarding checklist for white-label orgs. For orgs that have not configured a sending domain, fall back to a SiteMedic-branded `from` with a transparent disclaimer.
4. Logo images in PDFs require the image to be fetched at render time. Use signed URLs (short-lived) from Supabase Storage. Do not cache the signed URL across requests — generate a fresh one per PDF.

**Phase to address:**
Branding implementation phase. The `InvoiceDocument` signature must be updated before any org uses the white-label tier. A single invoice with wrong branding sent to an end client is a trust incident.

---

### Pitfall 7: Feature Gating UI Shows Inconsistent States — Gated UI Without Gated API

**Severity:** HIGH

**What goes wrong:**
The most common feature gating mistake: the UI hides a button or tab for lower tiers (e.g., the "Compliance Analytics" tab is hidden for Starter), but the underlying API route (`/api/compliance/analytics`) has no tier check. A Starter-tier user who knows the API URL (from browser devtools, from a previous plan, or from a colleague on a higher plan) can call the endpoint directly and receive the data.

The reverse is equally harmful: the UI shows a feature as available (e.g., a nav item is not gated), but the underlying API returns a 403. The user clicks the nav item, sees an error, and reports a bug — when actually it is a gating inconsistency, not a bug.

In the SiteMedic context, this is especially relevant for:
- Compliance trend charts (analytics)
- RIDDOR submission tracking (regulatory feature)
- Territory metrics and auto-assignment (operational feature)
- Export/PDF generation endpoints

These features all have existing API routes and pages. When subscription tiers are introduced, each must be gated both at the UI layer AND the API layer consistently.

**Evidence in this codebase:**
The queries in `web/lib/queries/analytics/compliance-history.ts`, `web/lib/queries/admin/analytics.ts`, `web/lib/territory/metrics.ts` etc. are called from Server Components or API routes with no tier check today — because tiers don't exist yet. When tiers are added, each query file becomes a potential ungated access point if only the UI is updated.

**Warning signs:**
- A Starter-tier org calls `fetch('/api/analytics/compliance-history')` in the browser console and gets data
- An org upgrades their plan, the UI updates, but an API call that was previously allowed continues returning 200 rather than switching to the new tier's data set
- Two different team members implement gating for the same feature — one adds a UI gate, the other adds an API gate — and their tier name strings do not match (e.g., `'growth'` vs `'Growth'` capitalisation)

**Prevention strategy:**
1. Create a single source of truth for tier definitions: a `SUBSCRIPTION_TIERS` constant (TypeScript `as const`) that names features and which tiers include them. Both UI gates and API gates import from this constant — no inline string comparison.
2. Write a helper `requireTier(orgId: string, requiredTier: SubscriptionTier): Promise<void>` that API routes call at the top of their handler. This throws a 403 if the org does not have the required tier. Every protected API route calls this before touching data.
3. Create a UI wrapper component `<TierGate tier="growth">` that wraps gated UI elements. The component reads the tier from a server-side context (not client-side state) and renders either the children or an upgrade prompt.
4. Before launch, run a checklist: for every feature listed in the Starter vs. Growth vs. Enterprise matrix, verify there is both a UI gate AND an API gate test.

**Phase to address:**
Feature gating phase. Must be done in one coordinated pass — adding UI gates without API gates in one PR, then API gates in a follow-up PR, creates a window where gating is inconsistent.

---

### Pitfall 8: Stripe Checkout Redirect URL Is Environment-Specific — Breaks in Review Apps and Staging

**Severity:** HIGH

**What goes wrong:**
Stripe Checkout requires a `success_url` and `cancel_url`. When building the subscription flow, developers typically hardcode or environment-variable these URLs as `https://app.sitemedic.com/billing/success`. This works in production but fails in:

- **Review apps / preview deployments**: The URL is `https://sitemedic-pr-123.vercel.app/billing/success` — the Stripe Checkout session returns to the wrong URL, and the platform admin cannot test the activation flow
- **Subdomain contexts**: If the Stripe Checkout is initiated from `acmecorp.sitemedic.com/billing`, the redirect should return to `acmecorp.sitemedic.com/billing/success` — not to the generic app URL

A related problem: after Stripe Checkout completes, the `checkout.session.completed` webhook fires. The webhook handler creates the Stripe Customer and subscription, then sets the org's `billing_status`. But the `success_url` redirect happens before the webhook is processed. If the success page immediately checks `billing_status`, it may show "Payment failed" because the webhook hasn't fired yet. This is a race condition — the redirect arrives faster than the webhook.

**Evidence in this codebase:**
No Stripe Billing Checkout flow exists yet. When it is built, the `success_url` pattern will be new code. The environment-specific URL problem is a write-time pitfall, not a refactor pitfall.

**Warning signs:**
- PR review for the Checkout flow shows `success_url: process.env.NEXT_PUBLIC_APP_URL + '/billing/success'` — the env var is not set in review app environments
- QA tests the billing flow in staging and the Stripe redirect returns to a 404
- The success page shows an error for a few seconds after returning from Stripe before the webhook catches up

**Prevention strategy:**
1. Build the `success_url` dynamically from the current request's origin: `const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL`. This handles review apps, staging, and production correctly.
2. For subdomain contexts, parse the current hostname and build the subdomain-aware return URL.
3. On the success page, do not check `billing_status` immediately. Instead, poll for up to 10 seconds (with exponential backoff) until the webhook-updated status appears, then show the confirmation. Or use Stripe's synchronous confirmation approach: check the Stripe Checkout Session status directly via the API using the `session_id` query param that Stripe appends to the `success_url`.
4. Never put Stripe Checkout session data (especially plan tier) in the `success_url` query params — that data can be tampered with. The webhook is the authoritative source.

**Phase to address:**
Stripe Checkout implementation phase. The dynamic URL pattern must be established from the first implementation.

---

### Pitfall 9: Webhook Events Arrive Out of Order — Subscription State Machine Can Go Backwards

**Severity:** HIGH

**What goes wrong:**
Stripe webhooks do not guarantee delivery order. During a subscription lifecycle, the following events may arrive in any order:

- `checkout.session.completed` (org paid)
- `customer.subscription.created` (subscription object created)
- `invoice.payment_succeeded` (first invoice paid)
- `customer.subscription.updated` (tier change)
- `customer.subscription.deleted` (cancellation)

If a `customer.subscription.deleted` event is processed before `customer.subscription.created` (due to Stripe's retry logic or delivery timing), the handler sets `billing_status = 'canceled'`, then the delayed `created` event sets it to `'active'` — the org is now marked active after they cancelled.

In the SiteMedic hybrid onboarding context, this is especially dangerous: the platform admin sees `billing_status = 'active'` and manually activates the org — but the org actually cancelled. The platform admin has no way to know the state machine went backwards.

**Evidence in this codebase:**
No webhook handler exists yet for Billing. The risk is in how the first handler is written. Stripe's own documentation warns that events should be processed based on the object's `created` timestamp (within the event's `data.object`), not on the order events arrive.

**Warning signs:**
- An org that cancelled gets reactivated in the platform
- The `billing_status` column flips from `'canceled'` to `'active'` unexpectedly
- Webhook handler logs show `customer.subscription.created` processed after `customer.subscription.deleted` for the same subscription ID

**Prevention strategy:**
1. Use an idempotency table: `webhook_events (stripe_event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ)`. Before processing any event, insert the `stripe_event_id`. If the insert fails (duplicate), skip processing. This eliminates duplicate event processing.
2. For subscription state transitions, compare the event's `data.object.created` timestamp against the current `billing_status_updated_at` in your database. Only apply the transition if the event's timestamp is newer than the last recorded transition. This makes the state machine safe against out-of-order delivery.
3. Handle each specific event type explicitly with a defined state transition table (e.g., `created` → `active`, `deleted` → `canceled`). Do not write a generic "update from Stripe object" handler that blindly overwrites local state — it has no protection against stale events.
4. Log all Stripe webhook events with the event ID, type, and processing outcome to a `webhook_events` table regardless of processing result. This gives the platform admin an audit trail when diagnosing incorrect billing states.

**Phase to address:**
Stripe Billing webhook handler phase. The idempotency table and state machine logic must be in the first version of the handler — not added later when the first race condition is discovered in production.

---

## Medium Pitfalls

Mistakes that create annoying but recoverable problems.

---

### Pitfall 10: Subdomain DNS and Vercel Wildcard Domain Configuration Ordering

**Severity:** MEDIUM

**What goes wrong:**
Vercel wildcard subdomain support requires the `*.sitemedic.com` wildcard DNS record to be added before Vercel can verify the domain. The verification process can take 24–72 hours. If the subdomain routing code is deployed before DNS propagation completes, any test of the feature against production will return DNS errors — and developers will incorrectly conclude the middleware code is wrong and start debugging the wrong thing.

A second ordering problem: Vercel requires the wildcard domain to be added via Nameserver delegation (not A records). If the current DNS is configured with A records (common for existing domains), switching to Nameserver delegation requires a DNS provider change that has a propagation window during which the main `sitemedic.com` domain may be unreachable.

**Evidence in this codebase:**
No Vercel wildcard domain configuration exists yet (the current app uses a single domain). The DNS change is a deployment infrastructure task, not a code task — but it has a long lead time that is easy to forget until the last moment.

**Warning signs:**
- The middleware rewrite code is deployed but `acmecorp.sitemedic.com` returns NXDOMAIN
- The team spends time debugging `middleware.ts` when the actual problem is DNS propagation
- The main `sitemedic.com` has a DNS downtime window during the Nameserver migration

**Prevention strategy:**
1. Add the wildcard DNS record and Vercel domain configuration at least 72 hours before the first subdomain routing test against production.
2. Test the middleware subdomain logic using `localhost` subdomain simulation first (e.g., using browser `hosts` file or a local reverse proxy) before touching production DNS.
3. Plan the Nameserver migration during a low-traffic window. Schedule it before feature development begins, not after the code is ready.

**Phase to address:**
Infrastructure setup phase — before any subdomain routing code is written.

---

### Pitfall 11: Per-Org Primary Colour Injected at Runtime Breaks CSS-in-JS Caching

**Severity:** MEDIUM

**What goes wrong:**
Per-org primary colour (`#3B82F6` for Org A, `#DC2626` for Org B) must be applied to buttons, links, and accent elements. The natural implementation is a CSS custom property (`--primary-colour: #3B82F6`) injected into the page at render time by reading the org's branding config.

If Tailwind CSS is used (which this project uses), the colour classes (`bg-blue-500`, `text-red-600`) are statically compiled at build time. An org's dynamic primary colour cannot be expressed as a Tailwind class — it must be a CSS custom property. This means UI components that use `bg-primary` will not pick up the org-specific colour unless they are written to use `var(--primary-colour)` via Tailwind's arbitrary value syntax (`bg-[var(--primary-colour)]`).

The risk: a developer implements the per-org colour by setting a Tailwind class dynamically (e.g., computing `bg-[${org.primaryColour}]`). Tailwind's JIT mode only generates classes for strings present at build time — dynamic class name construction is explicitly unsupported and will result in the class not being generated, and the colour not being applied.

**Evidence in this codebase:**
The current `InvoiceDocument` uses inline styles (react-pdf StyleSheet) with no Tailwind dependency, so the PDF is unaffected. The web UI uses Tailwind (the standard in Next.js 15 projects based on the project structure). The risk exists for any new UI component that tries to apply a dynamic colour.

**Warning signs:**
- An org's primary colour is configured as `#DC2626` but buttons still appear blue (the default)
- Dynamic Tailwind class `bg-[#DC2626]` is computed at runtime but the CSS rule was never generated
- The primary colour appears correctly in development (Tailwind JIT regenerates) but fails in production builds

**Prevention strategy:**
1. Use CSS custom properties for all dynamic branding values. In the root layout, render a `<style>` tag that sets `--org-primary: {org.primaryColour};` based on the server-fetched branding.
2. In Tailwind, reference the custom property using `bg-[color:var(--org-primary)]` or configure a CSS variable in `tailwind.config.js` as `primary: 'var(--org-primary)'`. This approach is build-safe.
3. Do not construct dynamic Tailwind class names from runtime values. The Tailwind docs explicitly state this does not work.
4. The `<style>` tag injecting custom properties must be rendered server-side (in the layout Server Component) using the org's branding fetched from the database — not client-side (which would cause a flash of un-branded content on first load).

**Phase to address:**
Branding implementation phase. The CSS custom property pattern must be established before the first branded component is built.

---

### Pitfall 12: Onboarding Flow Ambiguity — Stripe Checkout Completes But Platform Admin Has Not Activated

**Severity:** MEDIUM

**What goes wrong:**
The hybrid onboarding design is: org signs up → Stripe Checkout → platform admin manually activates. Between Stripe Checkout completion and platform admin activation, the org is in a limbo state: they have paid, but they cannot access the platform.

If this limbo state is not explicitly communicated in the UI, the org's admin will:
1. Complete Stripe Checkout
2. Return to the success page
3. Try to log in to their dashboard
4. See an error or an empty state with no explanation

This generates immediate support requests ("I paid but can't log in") and creates distrust in the product before the org has even started using it.

A second problem: the platform admin has no dedicated queue for "pending activation" orgs. If the notification is just an email, the platform admin may miss it, and the new org waits hours or days for activation — despite having paid.

**Evidence in this codebase:**
No onboarding flow or platform admin activation queue exists yet. The `activation_status` concept (mentioned in Pitfall 4) is new to the milestone. Migration 118 (`org_settings`) and the platform admin role (migration 100) exist — the platform admin infrastructure is in place, but no activation workflow is built.

**Warning signs:**
- Support tickets: "I completed payment but can't access the platform"
- Platform admin email inbox has activation requests with no structured priority
- New orgs wait more than 24 hours for activation

**Prevention strategy:**
1. The post-Checkout success page must show a clear limbo state message: "Payment received. Your account is being reviewed and you will receive an email within X hours once activated." Set accurate expectations.
2. When a Checkout session completes, create a `pending_activations` record (or equivalent status on the org) that appears in the platform admin dashboard as an actionable queue item with timestamp, org name, plan tier, and Stripe invoice link.
3. Send the platform admin a push notification or email immediately on checkout completion — not daily digest.
4. Define and publish the activation SLA: "Accounts are reviewed and activated within 4 business hours." Put this on the pricing page so prospects know before they pay.

**Phase to address:**
Hybrid onboarding phase. The limbo state experience must be designed before the Checkout flow is built.

---

### Pitfall 13: Supabase Storage Logo Bucket Requires Its Own RLS Policies

**Severity:** MEDIUM

**What goes wrong:**
When org logo files are stored in Supabase Storage, a new storage bucket policy is required. The existing storage buckets (migration 014) have RLS policies for safety reports and other org documents. A new `logos` bucket for white-label branding has different access semantics:

- **Read:** Anyone who accesses that org's subdomain (including unauthenticated visitors to the login page) must be able to see the logo. This means either a public bucket (risky — URLs are guessable) or authenticated reads with signed URLs served from the middleware.
- **Write:** Only platform admins should be able to upload logos on behalf of orgs. Org admins should be able to upload their own org's logo but not other orgs'.

If a developer adds the `logos` bucket without RLS (the default Supabase Storage behaviour is to use bucket policies), the bucket is either fully public (logos guessable across orgs) or fully private (logo cannot be shown on the login page at all). Neither is correct.

**Evidence in this codebase:**
`supabase/migrations/014_storage_buckets.sql` and `015_safety_reports_storage.sql` set up existing buckets with specific RLS. Adding a `logos` bucket requires a corresponding migration with a correctly scoped policy.

**Warning signs:**
- The `logos` bucket is created without an explicit RLS policy and defaults to the bucket's public/private setting
- A logo URL from `acmecorp.sitemedic.com` can be loaded in a browser when the user is not authenticated to any org
- An org admin uploads a logo successfully but it cannot be displayed on the unauthenticated login page

**Prevention strategy:**
1. Use Supabase Storage's `getPublicUrl()` vs. `createSignedUrl()` decision matrix:
   - If logos must appear on unauthenticated pages (subdomain login page): store logos in a public bucket with per-org path scoping (`logos/{org_id}/logo.png`). The UUID in the path is not secret if the org's subdomain is public, so path-scoped public access is acceptable.
   - If logo URLs must not be guessable: store in private bucket, generate signed URLs in middleware when resolving branding config, cache the signed URL for the duration of the response (not persistently).
2. Write a migration that creates the `logos` bucket with appropriate RLS before the branding upload UI is built.
3. Add an RLS policy: write access scoped to `is_platform_admin() OR org_id = auth.jwt() -> org_id`. Read access scoped to the bucket's public policy or authenticated signed URLs.

**Phase to address:**
Branding schema and storage phase. The bucket policy must exist before the first logo is uploaded.

---

## Regulatory and Compliance Considerations

These pitfalls relate to the UK regulatory context specific to SiteMedic's domain.

---

### Pitfall 14: White-Label Branding Does Not Exempt the Platform from GDPR Controllership

**Severity:** HIGH (for UK compliance)

**What goes wrong:**
When staffing orgs use SiteMedic under their own brand, the medics and event clients they serve will interact with a system that looks like the staffing org's product. However, the underlying data controller for the health data (treatment records, RIDDOR incidents, patient information) remains SiteMedic unless a formal Data Processing Agreement (DPA) and a revised Privacy Notice are in place.

A white-label client may incorrectly tell their end users that data is processed under the staffing org's privacy policy. If the staffing org's privacy policy does not disclose SiteMedic as a sub-processor, or if SiteMedic's data is not included in the staffing org's Data Protection Officer notifications to the ICO, this is a GDPR compliance gap.

The branding hides SiteMedic's identity from end users. GDPR Article 13 requires data subjects to be informed of the data controller's identity. If end users only see the white-label brand and the privacy policy is the white-label org's own document (not SiteMedic's), SiteMedic's role must still appear somewhere as a sub-processor.

**Evidence in this codebase:**
`supabase/migrations/00006_gdpr_infrastructure.sql` shows GDPR infrastructure exists (data retention, deletion). The existing privacy policy pages (`/privacy-policy`) are SiteMedic-branded. Under white-label, if the subdomain serves a re-branded UI, users may never see a reference to SiteMedic's privacy policy.

**Warning signs:**
- A white-label org's end users complain they cannot find information about who processes their health data
- A staffing org's DPA does not list SiteMedic as a sub-processor
- ICO enquiry regarding a white-label client's data practices reveals SiteMedic's processing was undisclosed

**Prevention strategy:**
1. Require all white-label orgs to sign a DPA with SiteMedic before activation. Platform admin cannot activate an org without confirming DPA is signed.
2. The white-label branding must include a mandatory disclosure footer on the login page: "Powered by SiteMedic — data processed under SiteMedic's Privacy Policy." This footer cannot be hidden or removed by the org admin.
3. Provide a white-label-specific Privacy Notice template that the staffing org must publish, which discloses SiteMedic as a sub-processor.
4. Get a UK-qualified data protection solicitor to review the white-label DPA template before the first org is onboarded.

**Phase to address:**
Legal and compliance review phase — before the first white-label org is onboarded. This is not a code task but it blocks launch.

---

## Phase-Specific Warnings Summary

| Phase Topic | Most Likely Pitfall | Severity | Mitigation |
|-------------|---------------------|----------|-----------|
| Stripe Billing architecture | Mixing Connect and Billing webhook handlers | Critical | Separate webhook endpoints from day one; name columns explicitly |
| Stripe Billing architecture | Existing orgs have no Billing Customer | Critical | Lazy-create Customer on first billing interaction; define legacy tier |
| Subdomain routing | Auth cookie not scoped per subdomain | Critical | Parse hostname in middleware; no shared cookies across org subdomains |
| Subdomain routing | CVE-2025-29927 middleware bypass | Critical | Update to Next.js ≥15.2.3; block x-middleware-subrequest at proxy |
| Branding implementation | Logo/colour cached without org as cache key | Critical | Include hostname in all cache keys; Vary: Host header |
| Feature gating | UI gate without API gate | High | Single SUBSCRIPTION_TIERS constant; requireTier() helper in all API routes |
| Feature gating | Webhook delay causes stale tier state | High | Idempotent webhook handler; idempotency table |
| Stripe Checkout | success_url hardcoded for production | High | Build dynamically from request origin |
| Stripe webhooks | Out-of-order event delivery corrupts state | High | Timestamp-based state transitions; idempotency table |
| Invoice/email branding | PDF and email shows SiteMedic brand | High | Pass branding as props; per-org email from address |
| Onboarding | No pending activation queue | Medium | Pending activation dashboard for platform admin |
| Branding UI | Dynamic Tailwind class names fail | Medium | CSS custom properties via <style> tag server-side |
| Storage | Logo bucket without correct RLS | Medium | Write RLS migration before branding upload UI |
| DNS/infrastructure | Wildcard DNS propagation takes 72h | Medium | Configure wildcard domain 72h before first test |
| Legal/GDPR | White-label hides SiteMedic sub-processor identity | High | Mandatory DPA; non-removable "Powered by SiteMedic" footer |

---

## Sources

**Stripe documentation consulted:**
- Stripe Connect vs. Billing product line distinctions: https://docs.stripe.com/connect
- Stripe Billing webhook events and handling: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe webhook idempotency and retry behaviour: https://docs.stripe.com/webhooks
- Stripe Connect webhook routing (platform vs. connected account): https://docs.stripe.com/connect/webhooks
- Stripe Billing + Connect coexistence (charging SaaS fees to connected accounts): https://docs.stripe.com/connect/integrate-billing-connect

**Next.js and Supabase documentation and community discussions:**
- CVE-2025-29927 Next.js middleware bypass vulnerability: https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/
- Supabase auth subdomain cookie configuration: https://github.com/orgs/supabase/discussions/5742
- Supabase subdomain multi-tenancy discussion: https://github.com/vercel/next.js/discussions/84461
- Next.js subdomain routing on Vercel: https://vercel.com/docs/multi-tenant
- Supabase SSR cookie options: https://supabase.com/docs/guides/auth/server-side/advanced-guide

**Multi-tenant caching and data isolation:**
- Cache key tenant isolation: https://quantumbyte.ai/articles/multi-tenant-architecture (cache keys must include tenant context)
- Multi-tenant views cache not tenant-driven (GitHub issue): https://github.com/tenancy/multi-tenant/issues/522
- Supabase RLS and public table exposure: https://supabase.com/docs/guides/database/postgres/row-level-security

**Code files inspected in this codebase (all findings grounded in direct inspection):**
- `web/middleware.ts` — no hostname parsing, no subdomain routing
- `web/lib/supabase/middleware.ts` — cookie domain not set; pathname-only routing checks
- `web/lib/stripe/server.ts` — single Stripe instance shared by all operations
- `web/lib/invoices/pdf-generator.ts` — hardcoded branding, module-level styles
- `web/lib/email/resend.ts` — single global Resend client
- `web/lib/organizations/org-resolver.ts` — org_id from JWT app_metadata pattern
- `supabase/migrations/00001_organizations.sql` — no billing columns
- `supabase/migrations/118_org_settings.sql` — org_settings exists; no subscription tier
- `supabase/migrations/115_referral_and_per_medic_rates.sql` — Connect payout fields (separate from Billing)
- `supabase/migrations/014_storage_buckets.sql` — existing bucket structure

---

*Pitfalls research for: SiteMedic white-label + subscriptions milestone*
*Researched: 2026-02-18*
*Confidence: HIGH — all findings grounded in direct code inspection and verified against Stripe, Next.js, and Supabase documentation*
