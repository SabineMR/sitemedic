# Technology Stack — White-Label Multi-Tenancy Additions

**Milestone:** White-label branding, subdomain routing, Stripe Billing subscriptions
**Researched:** 2026-02-18
**Mode:** Subsequent milestone — existing stack validated. Focus ONLY on additions for white-label.
**Overall confidence:** HIGH

---

## What Is Already Built (Do Not Re-Research)

The core stack is validated and in production. These items require no change:

| Concern | Existing Solution |
|---------|------------------|
| Web app | Next.js 15.1.5 (App Router), React 19 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Auth middleware | `@supabase/ssr` + `middleware.ts` at `/web/middleware.ts` |
| Payments (medic payouts) | Stripe Connect via `stripe-connect` Edge Function |
| Emails | Resend 6.9.2 + `@react-email/components` 1.0.7 |
| PDF generation | `@react-pdf/renderer` 4.3.2 in Supabase Edge Functions (Deno) |
| Multi-org isolation | `org_id` on every table, RLS enforced, `get_user_org_id()` helper |
| Org schema | `organizations` table with `id`, `name`, `slug` (unique index exists) |
| Org settings | `org_settings` table with `org_id`, `base_rate`, `admin_email`, etc. |
| Stripe SDK | `stripe` v20.3.1 server-side, `@stripe/stripe-js` v8.7.0 client-side |

This research answers the five questions raised in the milestone scope.

---

## Q1: Per-Org Branding Storage (Logo URL, Primary Colour, Company Name)

### Recommendation: Extend `org_settings` with Three New Columns

Do not create a new table. The `org_settings` table already exists (migration 118), has a unique `org_id` constraint, and has RLS policies in place. Adding branding columns here is the simplest, correct approach.

**New columns to add in a new migration (132_org_branding.sql):**

```sql
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS brand_logo_url    TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_hex TEXT
    CHECK (brand_primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS brand_company_name TEXT;
```

- `brand_logo_url` — Public Supabase Storage URL for the org's logo (PNG or SVG). Nullable; NULL means use SiteMedic default.
- `brand_primary_hex` — Hex colour code (e.g. `#1A2B3C`). Constrained to valid 6-digit hex via CHECK. Nullable; NULL means use SiteMedic default palette.
- `brand_company_name` — Display name for the org's white-label brand (e.g. "Apex Medic Services"). May differ from `organizations.name`. Nullable; NULL means fall back to `organizations.name`.

**Why extend `org_settings` not `organizations`:**

`organizations` is the identity table. `org_settings` is the configuration table — it already contains all mutable per-org configuration (`base_rate`, `admin_email`, etc.). Adding branding there is consistent with the established pattern and avoids widening the core identity table.

**Existing RLS is sufficient:** Platform admins can UPDATE (policy already exists). Org users can SELECT (policy already exists). No new policies needed.

### Logo File Storage: Supabase Storage

**Recommendation:** Create a new Supabase Storage bucket `org-logos` configured as **public** (not private).

Why public:
- Logo URLs are injected into PDFs, emails, and subpaged served to external clients. These external consumers cannot have signed JWT tokens.
- Logos are not sensitive data — they are branding assets meant to be visible.
- Signed URLs expire (default 2 hours), which would break PDF templates generated hours before viewing.

**Bucket structure:**

```
org-logos/
  {org_id}/logo.png       ← primary logo
  {org_id}/logo@2x.png    ← optional retina version
```

**Storage RLS (policy for the bucket):**

```sql
-- Public read (no auth required — logos are public brand assets)
CREATE POLICY "Public can view org logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- Only org admins can upload their own logo
CREATE POLICY "Org admins can upload their logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1] = auth.jwt() -> 'app_metadata' ->> 'org_id'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('org_admin', 'platform_admin')
  );

-- Only platform admins can upload any logo
CREATE POLICY "Platform admins can upload any logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'platform_admin'
  );
```

**URL format after upload:**

```
https://<project>.supabase.co/storage/v1/object/public/org-logos/{org_id}/logo.png
```

Store this URL in `org_settings.brand_logo_url`. No transformation URL needed for logo injection.

**Note on Supabase image transformations:** Image resizing (`/render/image/public/...`) is a Pro plan feature. Since the logo URL is stored once and injected statically into PDFs/emails, no transformation is needed. Upload logos pre-sized (recommended: 400x120px PNG, transparent background).

**No new npm packages required for logo storage.** The existing `@supabase/supabase-js` client handles uploads.

---

## Q2: Subdomain Routing in Next.js 15 App Router

### Recommendation: Middleware-Based URL Rewriting (No New Package)

Subdomain routing in Next.js 15 is implemented entirely with the existing `middleware.ts` file. No new library is required.

**How it works:**

The Next.js middleware (already at `/web/middleware.ts`) runs at the Edge on every request. It reads the `Host` header, extracts the subdomain, and uses `NextResponse.rewrite()` to transparently map the request to a namespaced route — without changing the URL the user sees in the browser.

**Current middleware** handles only auth (session refresh + route protection). The subdomain extraction layer sits **before** the existing auth logic.

### The Subdomain Extraction Pattern

```typescript
// In middleware.ts — extract subdomain from Host header
const hostname = request.headers.get('host') ?? '';
const rootDomain = process.env.ROOT_DOMAIN ?? 'sitemedic.com';

// Strip port in local dev: "localhost:30500" → "localhost"
const hostnameWithoutPort = hostname.split(':')[0];

// Extract subdomain: "apex.sitemedic.com" → "apex"
// In production: hostnameWithoutPort = "apex.sitemedic.com"
// In local dev: hostnameWithoutPort = "localhost" (no subdomain)
const subdomain =
  hostnameWithoutPort !== rootDomain &&
  hostnameWithoutPort !== `www.${rootDomain}` &&
  hostnameWithoutPort !== 'localhost'
    ? hostnameWithoutPort.replace(`.${rootDomain}`, '')
    : null;
```

**When a subdomain is detected, rewrite the request:**

```typescript
if (subdomain) {
  // Rewrite: apex.sitemedic.com/dashboard → /org/apex/dashboard
  const url = request.nextUrl.clone();
  url.pathname = `/org/${subdomain}${request.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}
```

**App Router directory structure for subdomain routes:**

```
web/app/
  (main)/           ← existing app routes (no subdomain)
    dashboard/
    admin/
    ...
  org/
    [slug]/         ← catches apex.sitemedic.com/* rewrites
      layout.tsx    ← fetches org branding by slug, provides BrandingContext
      page.tsx      ← org home page
      dashboard/
        page.tsx
      login/
        page.tsx    ← org-branded login
```

**`org/[slug]/layout.tsx` fetches branding and injects it:**

```typescript
// In layout.tsx (server component)
const { data: orgSettings } = await supabase
  .from('org_settings')
  .select('brand_logo_url, brand_primary_hex, brand_company_name')
  .eq('org_id', org.id)
  .single();

// Pass as context or as CSS variables in <html> style tag
return (
  <html style={{ '--brand-primary': orgSettings.brand_primary_hex ?? '#0ea5e9' }}>
    <BrandingProvider branding={orgSettings}>
      {children}
    </BrandingProvider>
  </html>
);
```

### Local Development: The Subdomain Problem

**Known issue:** In Next.js development server, `request.nextUrl.hostname` always returns `"localhost"` regardless of the host header. Reading `request.headers.get('host')` is the correct approach (not `request.nextUrl.hostname`).

**Local dev workaround — use `/etc/hosts` + custom port:**

```
# /etc/hosts (add these lines)
127.0.0.1   apex.localhost
127.0.0.1   beta.localhost
```

Then access `http://apex.localhost:30500` in the browser. The `Host` header will be `apex.localhost:30500`, and the middleware will correctly parse `apex` as the subdomain.

Alternatively: prefix-based routing during development (`/org/apex/dashboard` accessed directly), bypassing middleware for local testing.

### Vercel Deployment: Wildcard Domain Configuration

**Required Vercel setup:**

1. In Vercel Dashboard → Project Settings → Domains, add:
   - `sitemedic.com` (root domain)
   - `*.sitemedic.com` (wildcard subdomain — covers all org subdomains)
2. Add DNS records at your registrar:
   - `A` record: `sitemedic.com` → Vercel IP
   - `CNAME` record: `*.sitemedic.com` → `cname.vercel-dns.com`
3. Set environment variable: `ROOT_DOMAIN=sitemedic.com`

**Vercel supports wildcard domains on all plans** (Hobby, Pro, Enterprise). No plan upgrade required for this feature.

**Important:** The `middleware.ts` matcher must be updated. The current matcher excludes `api/` and static assets. Subdomain detection should run on all non-static requests. The existing matcher pattern is compatible — no change required, as it already covers all page routes.

### What NOT to Use

| Option | Why Not |
|--------|---------|
| `next-domains` library | Adds a package for something two lines of middleware accomplish |
| Separate Vercel deployments per org | Requires separate deploys per org — operationally impossible at scale |
| Path-prefix routing only (`/org/apex/...`) | Works but gives clients a branded URL like `sitemedic.com/org/apex` rather than `apex.sitemedic.com` — defeats the white-label purpose |
| Node.js middleware runtime | Edge runtime is correct here. Node.js runtime for middleware is now stable in Next.js 15.5 but is unnecessary — subdomain parsing only needs `request.headers.get('host')`, which the Edge runtime fully supports |

---

## Q3: Stripe Billing (Subscription Plans) for Charging Orgs Monthly

### How Stripe Billing Differs from Existing Stripe Connect Usage

The existing Stripe Connect integration (`supabase/functions/stripe-connect/`) handles **medic payouts**: SiteMedic receives payments from clients and pays out to medics' connected accounts. This is Stripe Connect's core purpose.

Stripe Billing is a completely separate concern: **charging organisations a monthly SaaS subscription fee** for using the SiteMedic platform.

These coexist in the same Stripe account without conflict:

| Feature | Stripe Connect (existing) | Stripe Billing (new) |
|---------|--------------------------|---------------------|
| Purpose | Route funds to medic connected accounts | Charge orgs for SaaS access |
| Object | Connected Account | Customer + Subscription |
| Direction | SiteMedic → Medics | Orgs → SiteMedic |
| SDK used | `stripe` server-side (already installed) | Same `stripe` v20.3.1 — no new SDK |
| Webhook source | Connect webhooks | Billing webhooks |

**No new Stripe SDK package is required.** The existing `stripe` v20.3.1 package handles both Connect and Billing.

### New Stripe Objects Required

**Products (created once, in Stripe Dashboard or via script):**

```typescript
// One-time setup: create products for each plan tier
const starterProduct = await stripe.products.create({
  name: 'SiteMedic Starter',
  metadata: { plan: 'starter' },
});
const proProduct = await stripe.products.create({
  name: 'SiteMedic Pro',
  metadata: { plan: 'pro' },
});
```

**Prices (attached to products, define billing interval and amount):**

```typescript
const starterPrice = await stripe.prices.create({
  product: starterProduct.id,
  unit_amount: 9900,          // £99.00 in pence
  currency: 'gbp',
  recurring: { interval: 'month' },
});
```

**Customer (one per org, created when org subscribes):**

```typescript
const customer = await stripe.customers.create({
  email: orgSettings.admin_email,
  name: org.name,
  metadata: { org_id: org.id, org_slug: org.slug },
});
```

**Subscription (ties customer to a price):**

```typescript
const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',  // Requires payment method confirmation
  expand: ['latest_invoice.payment_intent'],
});
```

### Database Schema Additions for Subscriptions

Add to `org_settings` (same migration as branding, or a separate 133_org_subscriptions.sql):

```sql
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_plan      TEXT
    CHECK (subscription_plan IN ('starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT
    DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing'));
```

**Why in `org_settings` not `organizations`:** Same rationale as branding — `org_settings` is the mutable config table. `organizations` is identity.

**Existing RLS is sufficient** — org admins can read their own settings row (to show subscription status in the UI). Platform admins can update all rows (to sync subscription state from webhooks using service role key).

### Webhook Events to Handle

Create a new Supabase Edge Function `stripe-billing-webhooks` (separate from existing `stripe-webhooks` which handles Connect events):

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Set `subscription_status = 'active'` (or `'trialing'`) |
| `customer.subscription.updated` | Update `subscription_plan` and `subscription_status` |
| `customer.subscription.deleted` | Set `subscription_status = 'canceled'` |
| `invoice.payment_succeeded` | Log payment, mark status active if was `past_due` |
| `invoice.payment_failed` | Set `subscription_status = 'past_due'` |

**Webhook signature verification** uses the existing pattern already in `stripe-webhooks/`:

```typescript
const sig = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

### Stripe Customer Portal

Stripe provides a hosted UI for customers to manage their own subscriptions (upgrade, downgrade, cancel, update payment method) without you building it.

**Enable and configure once in the Stripe Dashboard** → Customer Portal settings.

**Generate portal session in an API route:**

```typescript
// web/app/api/billing/portal/route.ts
const session = await stripe.billingPortal.sessions.create({
  customer: orgSettings.stripe_customer_id,
  return_url: `https://${orgSlug}.sitemedic.com/admin/billing`,
});
return NextResponse.redirect(session.url);
```

This is standard Stripe documentation pattern (HIGH confidence). No custom billing UI needed for plan changes and payment management.

### What NOT to Build for Billing

| Temptation | Why Not |
|------------|---------|
| Build a custom subscription management UI | Use Stripe Customer Portal. It handles plan changes, cancellation, payment method updates with zero code. |
| Store credit card numbers or payment method IDs in Supabase | Never. Stripe tokenizes all payment data. Store only `stripe_customer_id` and `stripe_subscription_id`. |
| Mix Connect and Billing webhook handlers in one Edge Function | Separate handlers prevent event collisions and simplify debugging. |
| Stripe Checkout for subscription sign-up | Valid option, but Stripe Elements embedded in an admin page provides better UX (no redirect). Either works — Checkout is simpler to implement. |

---

## Q4: Branded Emails via Resend

### Recommendation: Pass Branding Props to Existing Email Templates

No new Resend features or npm packages are needed. The existing `@react-email/components` 1.0.7 and `resend` 6.9.2 are sufficient.

**Current email template structure** (confirmed via codebase audit):

```
web/lib/email/
  resend.ts                          ← Resend client init
  templates/
    booking-confirmation-email.tsx   ← existing template
    booking-received-email.tsx       ← existing template
    medic-assignment-email.tsx       ← existing template
```

**How to inject per-org branding:** The templates are React components. Add a `branding` prop.

**Branding interface (new shared type):**

```typescript
// web/lib/email/types.ts (new file)
export interface OrgBranding {
  logoUrl: string | null;        // null → use SiteMedic default logo
  primaryHex: string | null;     // null → use SiteMedic default colour (#0ea5e9 or similar)
  companyName: string;           // always provided (falls back to org name)
}
```

**Email template with branding prop (pattern for all existing templates):**

```typescript
// Example: BookingConfirmationEmail.tsx
import { Img, Section } from '@react-email/components';
import type { OrgBranding } from '../types';

interface BookingConfirmationEmailProps {
  // ... existing props ...
  branding: OrgBranding;
}

const SITEMEDIC_LOGO = 'https://<project>.supabase.co/storage/v1/object/public/org-logos/sitemedic/logo.png';
const SITEMEDIC_PRIMARY = '#0ea5e9';

export default function BookingConfirmationEmail({ branding, ...props }: BookingConfirmationEmailProps) {
  const logoUrl = branding.logoUrl ?? SITEMEDIC_LOGO;
  const primaryColor = branding.primaryHex ?? SITEMEDIC_PRIMARY;

  return (
    <Html>
      <Section style={{ backgroundColor: primaryColor, padding: '20px' }}>
        <Img src={logoUrl} alt={branding.companyName} height={40} />
      </Section>
      {/* ... rest of email ... */}
    </Html>
  );
}
```

**Fetching branding before sending email** (in the send function, e.g. `send-booking-received.ts`):

```typescript
// Fetch org branding before rendering the email template
const { data: orgSettings } = await supabase
  .from('org_settings')
  .select('brand_logo_url, brand_primary_hex, brand_company_name')
  .eq('org_id', orgId)
  .single();

const branding: OrgBranding = {
  logoUrl: orgSettings?.brand_logo_url ?? null,
  primaryHex: orgSettings?.brand_primary_hex ?? null,
  companyName: orgSettings?.brand_company_name ?? org.name,
};
```

**Resend supports dynamic HTML with `react-email/render`** — the existing `render()` call in the email-sending code passes the rendered HTML string to `resend.emails.send()`. The branding data is just props passed before `render()`.

**Logo in emails:** The logo URL must be a public HTTPS URL (not a signed URL, which expires). This is another reason the `org-logos` bucket should be public — email clients fetch images at open time, not send time.

**Resend from-address per org:** Resend allows custom `from` domains. If an org wants their emails to come from `hello@apexmedicservices.co.uk`, they add their domain in Resend and it gets configured in their org settings. This is a future enhancement, not required for the initial white-label milestone. For now, all emails send from SiteMedic's verified Resend domain.

### What NOT to Do for Emails

| Temptation | Why Not |
|------------|---------|
| Use Resend Templates (server-side template editor) | The codebase already uses react-email components, which are superior for type-safety and reuse. Mixing two template systems adds complexity. |
| Inline all CSS with data URIs for logos | Logos must be external URLs for email client rendering — email HTML does not support embedded SVG or base64 images reliably across all clients. |
| Create separate email templates per org | Templates parameterised with `branding` props handle all orgs. Per-org templates are a maintenance disaster at scale. |

---

## Q5: Branded PDFs via @react-pdf/renderer

### Recommendation: Pass Branding Struct as Prop to PDF Document Components

The existing PDF Edge Functions use `@react-pdf/renderer` 4.3.2 (confirmed in `web/package.json` and Edge Function imports). The `Image` component from `@react-pdf/renderer` accepts a URL string as `src`.

**Verified capability:** `@react-pdf/renderer`'s `<Image>` component accepts:
- A remote HTTPS URL (fetches at render time in the Deno Edge Function)
- A base64 data URI string
- A local file path (not applicable in Edge Functions)

For Supabase Edge Functions, a public HTTPS URL is the correct approach. The function fetches the image during PDF generation.

**Pattern — add branding to the InvoiceDocument (currently no logo):**

```typescript
// supabase/functions/generate-invoice-pdf/components/InvoiceDocument.tsx
import { Document, Page, Text, View, Image, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';

interface Branding {
  logoUrl: string | null;
  primaryHex: string | null;
  companyName: string;
}

interface InvoiceDocumentProps {
  data: InvoiceData;
  branding: Branding;
}

const SITEMEDIC_PRIMARY = '#0ea5e9';

export const InvoiceDocument = ({ data, branding }: InvoiceDocumentProps) => {
  const primaryColor = branding.primaryHex ?? SITEMEDIC_PRIMARY;

  const styles = StyleSheet.create({
    // ... existing styles ...
    header: { backgroundColor: primaryColor, padding: 20, marginBottom: 20 },
    companyName: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {branding.logoUrl ? (
            <Image src={branding.logoUrl} style={{ height: 40 }} />
          ) : (
            <Text style={styles.companyName}>{branding.companyName}</Text>
          )}
        </View>
        {/* ... rest of document unchanged ... */}
      </Page>
    </Document>
  );
};
```

**In the Edge Function `index.ts` — fetch branding before rendering:**

```typescript
// Fetch org branding
const { data: orgSettings } = await supabase
  .from('org_settings')
  .select('brand_logo_url, brand_primary_hex, brand_company_name')
  .eq('org_id', userOrgId)
  .single();

const branding = {
  logoUrl: orgSettings?.brand_logo_url ?? null,
  primaryHex: orgSettings?.brand_primary_hex ?? null,
  companyName: orgSettings?.brand_company_name ?? invoice.org_name ?? 'SiteMedic',
};

// Pass branding to the document
const pdfBuffer = await renderToBuffer(
  <InvoiceDocument data={invoiceData} branding={branding} />
);
```

**Apply the same pattern to all PDF-generating Edge Functions:**

| Edge Function | Change |
|---------------|--------|
| `generate-invoice-pdf` | Add branded header with logo + primary colour |
| `generate-contract-pdf` | Add branded header with logo |
| `generate-payslip-pdf` | Add branded header with logo |
| `generate-weekly-report` | Add branded header with logo |
| `riddor-f2508-generator` | Logo in header; primary colour on section titles |
| `event-incident-report-generator` | Logo in header |
| `motorsport-incident-generator` | Logo in header |
| `fa-incident-generator` | Logo in header |

**No new npm packages required.** `@react-pdf/renderer` 4.3.2 already handles remote image URLs via the `Image` component.

**Caveat on image loading in Deno Edge Functions:** `@react-pdf/renderer` fetches the image URL during `renderToBuffer()`. If the Supabase Storage URL is unreachable from the Deno runtime (e.g. network restrictions in self-hosted Supabase), the image will silently fail. In production Supabase (cloud), public bucket URLs are always reachable from Deno Edge Functions. Flag for testing during implementation.

---

## Summary: New Packages and Infrastructure

### No New npm Packages Required

All five feature areas are implemented using the existing stack. This is a HIGH confidence finding based on direct codebase audit.

| Need | Solution | New Package? |
|------|----------|-------------|
| Branding storage | New columns on existing `org_settings` table | No |
| Logo file hosting | New `org-logos` Supabase Storage bucket (public) | No |
| Subdomain routing | Extend existing `middleware.ts` with host parsing + `NextResponse.rewrite()` | No |
| Stripe Billing subscriptions | Existing `stripe` v20.3.1 SDK — add Billing API calls | No |
| Org subscription DB fields | New columns on `org_settings` table | No |
| Branded emails | Add `branding` prop to existing `@react-email` templates | No |
| Branded PDFs | Add `branding` prop + `<Image>` to existing `@react-pdf/renderer` components | No |

### New Infrastructure Required

| Item | Where | Notes |
|------|-------|-------|
| `org-logos` Supabase Storage bucket | Supabase Dashboard or migration | Public bucket, RLS on write |
| Stripe Products + Prices | Stripe Dashboard (one-time) | Starter, Pro, Enterprise tiers |
| Stripe Customer Portal | Stripe Dashboard configuration | Enable and configure redirect URL |
| Wildcard domain `*.sitemedic.com` | Vercel Dashboard + DNS registrar | Required for subdomain routing in production |
| `ROOT_DOMAIN=sitemedic.com` env var | Vercel environment variables | Used by middleware subdomain parser |
| Separate `stripe-billing-webhooks` Edge Function | Supabase Edge Functions | Separate from existing `stripe-webhooks` (Connect) |

### New Migrations Required

| Migration | Changes |
|-----------|---------|
| `132_org_branding.sql` | Add `brand_logo_url`, `brand_primary_hex`, `brand_company_name` to `org_settings` |
| `133_org_subscriptions.sql` | Add `stripe_customer_id`, `stripe_subscription_id`, `subscription_plan`, `subscription_status` to `org_settings` (can be combined with 132 if preferred) |

---

## What NOT to Add

| Temptation | Why Not |
|------------|---------|
| **A new branding table** | `org_settings` already has the right RLS, the right FK, and the right scope. Adding a third org-linked table adds complexity with no benefit. |
| **Signed URLs for org logos** | They expire (2 hours default). PDFs are opened after generation; emails are opened after sending. Public bucket is correct for public brand assets. |
| **`next-domains` or any subdomain middleware library** | `request.headers.get('host')` + `NextResponse.rewrite()` is 10 lines. No library needed. |
| **Separate Next.js deployment per org** | Operationally unscalable. One deployment with middleware rewriting handles all orgs. |
| **A custom billing UI (invoices, plan management)** | Stripe Customer Portal provides this out of the box. Building a custom one is months of work for a feature Stripe gives for free. |
| **Storing payment methods in Supabase** | Never. Stripe stores payment data; only store Stripe IDs in Supabase. |
| **Separate Stripe account per org** | Orgs are customers of SiteMedic, not Stripe Connect accounts for this use case. Billing uses Customers + Subscriptions, not Connect accounts. |
| **React Email's new Templates feature (server-side template editor)** | The codebase uses `@react-email/components` for type-safe, version-controlled templates. Mixing in the hosted template editor adds non-code dependencies. |
| **Per-org Resend API keys or domains** | Custom from-domains are a future enhancement. For the initial milestone, all emails send from SiteMedic's Resend domain with per-org branding in the email body. |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Branding column additions to `org_settings` | HIGH | Direct schema audit of existing migrations; established pattern in codebase |
| Supabase Storage public bucket for logos | HIGH | Official Supabase Storage docs confirmed public bucket pattern; project already uses Storage for PDFs |
| Next.js 15 middleware subdomain routing | HIGH | Documented Next.js pattern; Vercel Platforms Starter Kit uses identical approach; `request.headers.get('host')` confirmed as correct (not `nextUrl.hostname`) |
| Vercel wildcard domain support | HIGH | Vercel official docs confirm wildcard domains on all plans |
| Local dev subdomain via `/etc/hosts` | HIGH | Standard approach; confirmed in multiple community guides |
| Stripe Billing vs Connect distinction | HIGH | Official Stripe docs confirm they coexist in the same account; existing `stripe` v20.3.1 SDK supports both |
| Stripe Customer Portal | HIGH | Official Stripe Billing docs — no custom build needed |
| Branded emails via branding prop | HIGH | Direct audit of existing email templates; `@react-email/components` React component pattern supports arbitrary props |
| @react-pdf/renderer `<Image>` with remote URL | MEDIUM | Confirmed in react-pdf.org docs; Deno Edge Function network access to public Supabase Storage URLs is expected but flagged for testing |
| Separate `stripe-billing-webhooks` Edge Function | HIGH | Existing `stripe-webhooks` pattern directly reusable |

---

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| Codebase audit: `web/middleware.ts`, `web/lib/supabase/middleware.ts` | Direct code inspection | HIGH |
| Codebase audit: `web/package.json` — stripe v20.3.1, @react-pdf/renderer 4.3.2, @react-email/components 1.0.7, resend 6.9.2 | Direct file read | HIGH |
| Codebase audit: `supabase/migrations/118_org_settings.sql` — existing `org_settings` schema and RLS | Direct file read | HIGH |
| Codebase audit: `supabase/functions/generate-invoice-pdf/components/InvoiceDocument.tsx` — no logo currently | Direct file read | HIGH |
| Codebase audit: `web/lib/email/templates/` — 3 existing email templates, no branding prop | Direct file read | HIGH |
| Next.js middleware subdomain pattern — [Vercel Platforms Starter Kit](https://vercel.com/templates/next.js/platforms-starter-kit) | Official Vercel template | HIGH |
| Next.js middleware hostname issue — `request.headers.get('host')` vs `nextUrl.hostname` (GitHub #37536) | Verified community + official docs | HIGH |
| Next.js 15.5 Node.js middleware runtime now stable — [Next.js 15.5 blog](https://nextjs.org/blog/next-15-5) | Official Next.js blog | HIGH |
| Stripe Billing vs Connect — [Stripe Billing docs](https://stripe.com/docs/billing/subscriptions/overview) + [Connect subscriptions](https://stripe.com/docs/connect/subscriptions) | Official Stripe docs | HIGH |
| Stripe Customer Portal — [Stripe customer-management docs](https://stripe.com/docs/customer-management) | Official Stripe docs | HIGH |
| Supabase Storage public bucket tradeoffs — [GitHub Discussion #6458](https://github.com/orgs/supabase/discussions/6458) | Official Supabase community | HIGH |
| Supabase Storage image transformations require Pro plan — [Supabase docs](https://supabase.com/docs/guides/storage/serving/image-transformations) | Official Supabase docs | HIGH |
| @react-pdf/renderer Image component accepts HTTPS URL — [react-pdf.org/components](https://react-pdf.org/components) | Official library docs | MEDIUM (Deno edge context unverified) |
