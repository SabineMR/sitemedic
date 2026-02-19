# Phase 32: Foundation Schema & Registration - Research

**Researched:** 2026-02-19
**Domain:** Database schema (PostgreSQL/Supabase), CQC API integration, multi-step registration, document storage, Stripe Connect Express, admin verification workflows
**Confidence:** HIGH

## Summary

Phase 32 lays the marketplace database foundation and builds the company registration flow. The existing SiteMedic codebase is a Next.js 15 + Supabase (PostgreSQL, Auth, Storage, Edge Functions) + Stripe platform. The marketplace introduces **cross-org tables** that break the standard `org_id`-scoped RLS pattern -- marketplace entities use `user_id`-based RLS instead, as already decided in the v4.0 architecture research.

The key shift from the original roadmap (which described individual medic registration) is that **only CQC-registered medical companies can register** on the marketplace. This means the registration entity is tied to the existing `organizations` table (with new marketplace columns), not to a new individual medic table. Companies that already exist as SiteMedic orgs can link their marketplace registration to the same account (bidirectional crossover).

The CQC (Care Quality Commission) public API at `api.cqc.org.uk/public/v1` is free, requires no authentication, supports 2,000 requests/minute with a `partnerCode`, and provides provider lookup by ID with a `registrationStatus` field. This enables auto-verification at signup and daily compliance checks. Document storage for insurance, DBS, and indemnity certificates uses Supabase Storage private buckets (same pattern as existing `event-incident-reports` bucket). Stripe Connect Express onboarding for companies uses `business_type: 'company'` -- the existing codebase already has an Express account creation flow for individual medics that can be adapted.

**Primary recommendation:** Build marketplace tables with user_id-based RLS (not org_id), extend the `organizations` table with marketplace columns for bidirectional crossover, create a `marketplace_companies` table for CQC-specific marketplace data, use a `compliance_documents` table for all uploadable documents with expiry tracking, and implement Stripe Connect Express onboarding for companies using the existing `stripe-connect` Edge Function pattern.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase (PostgreSQL) | Existing | Marketplace tables, RLS, EXCLUSION constraints | Already the platform DB; all migrations follow established pattern |
| `btree_gist` extension | Built-in (Supabase) | EXCLUSION constraints on `medic_commitments` for race condition prevention | Required for temporal overlap prevention; available on Supabase |
| `@supabase/supabase-js` | 2.95.3 (existing) | Client-side DB/Auth/Storage operations | Already installed and used throughout |
| `@supabase/ssr` | 0.8.0 (existing) | Server-side auth in middleware | Already installed and used in middleware.ts |
| `stripe` | 20.3.1 (existing) | Stripe Connect Express account creation | Already installed; existing `stripe-connect` Edge Function |
| Zustand | 5.0.11 (existing) | Multi-step wizard form state | Already used for schedule board, medic locations, alerts stores |
| Resend | 6.9.2 (existing) | Transactional emails (verification status, suspension notices) | Already used for all email sending |
| `date-fns` | 4.1.0 (existing) | Date handling for expiry tracking, scheduling | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | 0.564.0 (existing) | Icons for verification badges, document status indicators | UI components |
| `react-day-picker` | 9.13.2 (existing) | Date picker for expiry date input on documents | Document upload forms |
| `sonner` | 2.0.7 (existing) | Toast notifications for upload success/failure, verification status | All user-facing notifications |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand for wizard state | React `useState` across steps | Zustand provides persistence between navigation; useState loses state on remount. Zustand is already in the project. |
| Zod for validation | Manual validation (current pattern) | Zod is NOT in the project. The existing codebase uses manual validation in form handlers. Adding Zod is optional but would be a new dependency. Recommend staying with manual validation for consistency. |
| Supabase Edge Function for CQC checks | Next.js API route | Edge Functions run independently of web deployment; better for daily cron jobs. Use Edge Function for scheduled checks, API route for signup-time instant check. |
| Private storage bucket for compliance docs | Public bucket | Compliance documents (insurance, DBS) are sensitive -- must be private. Unlike org-logos (public), these require signed URLs. |

**Installation:**
No new packages required. All dependencies already exist in `web/package.json`.

## Architecture Patterns

### Recommended Project Structure

```
supabase/migrations/
  140_marketplace_foundation.sql     # Core marketplace tables + RLS + EXCLUSION constraints
  141_compliance_documents.sql       # Document storage tracking table
  142_marketplace_storage_bucket.sql # Private storage bucket for compliance docs

supabase/functions/
  cqc-verify/                        # CQC API verification (signup + daily check)
    index.ts

web/app/
  marketplace/
    register/
      page.tsx                       # Multi-step company registration wizard
      layout.tsx
    browse/
      page.tsx                       # Event browsing (pre-verified access)
  api/
    marketplace/
      register/
        route.ts                     # Company registration API
      cqc-verify/
        route.ts                     # Instant CQC verification at signup
      stripe-connect/
        route.ts                     # Stripe Connect Express onboarding for companies

web/stores/
  useMarketplaceRegistrationStore.ts # Zustand store for multi-step wizard

web/app/platform/
  verification/
    page.tsx                         # Admin verification queue
    [id]/
      page.tsx                       # Individual verification detail

web/lib/marketplace/
  types.ts                           # Marketplace type definitions
  cqc-client.ts                      # CQC API client wrapper
  compliance.ts                      # Document expiry checking utilities
```

### Pattern 1: User-ID-Based RLS for Marketplace Tables

**What:** Marketplace tables use `auth.uid()` and role checks instead of `get_user_org_id()` for RLS policies.
**When to use:** All marketplace tables (`marketplace_companies`, `compliance_documents`, marketplace events/quotes from later phases).
**Why:** Marketplace is cross-org by design. A client in org A must see companies from org B. The existing `get_user_org_id()` pattern would isolate marketplace data within a single org.

```sql
-- Source: v4.0 ARCHITECTURE.md (verified against existing codebase patterns)

-- Company owners can manage their own registration
CREATE POLICY "company_owners_manage_own"
  ON marketplace_companies FOR ALL
  USING (admin_user_id = auth.uid());

-- All authenticated users can browse verified companies
CREATE POLICY "browse_verified_companies"
  ON marketplace_companies FOR SELECT
  USING (
    verification_status = 'verified'
    AND auth.uid() IS NOT NULL
  );

-- Platform admins have full access
CREATE POLICY "platform_admin_all_companies"
  ON marketplace_companies FOR ALL
  USING (is_platform_admin());
```

### Pattern 2: EXCLUSION Constraint for Medic Commitment Race Prevention

**What:** PostgreSQL EXCLUSION constraints using `btree_gist` to prevent a medic being double-booked for overlapping time periods.
**When to use:** The `medic_commitments` table (tracking when medics are committed to events).
**Why:** Race conditions can occur when two clients simultaneously award quotes to the same medic for overlapping times. Database-level constraints are the only reliable prevention.

```sql
-- Source: PostgreSQL btree_gist docs (https://www.postgresql.org/docs/current/btree-gist.html)

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- medic_commitments prevents double-booking at the database level
CREATE TABLE medic_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medic_id UUID NOT NULL REFERENCES medics(id),
  booking_id UUID REFERENCES bookings(id),
  event_date DATE NOT NULL,
  time_range TSRANGE NOT NULL, -- e.g., '[2026-03-15 08:00, 2026-03-15 16:00)'

  -- EXCLUSION: same medic cannot have overlapping time ranges
  EXCLUDE USING GIST (
    medic_id WITH =,
    time_range WITH &&
  )
);
```

### Pattern 3: Bidirectional Crossover via Organization Linking

**What:** An existing SiteMedic org can register on the marketplace, and a new marketplace company can later become a SiteMedic org. The link is through the `organizations` table.
**When to use:** Company registration flow and the marketplace_companies table.
**Why:** Context document specifies linked accounts (same login, shared medic roster, company info carries over).

```sql
-- marketplace_companies links to organizations for bidirectional crossover
CREATE TABLE marketplace_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID UNIQUE REFERENCES organizations(id) ON DELETE RESTRICT,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- CQC Details
  cqc_provider_id TEXT NOT NULL,          -- CQC provider ID (e.g., "1-123456")
  cqc_registration_status TEXT NOT NULL,   -- from CQC API
  cqc_last_checked_at TIMESTAMPTZ,
  cqc_auto_verified BOOLEAN DEFAULT FALSE, -- true if CQC API confirmed active at signup

  -- Company details (may duplicate org data for marketplace profile)
  company_name TEXT NOT NULL,
  company_reg_number TEXT,                 -- Companies House number
  company_address TEXT,
  company_postcode TEXT,
  company_phone TEXT,
  company_email TEXT NOT NULL,
  coverage_areas TEXT[],                   -- Array of postcode prefixes
  company_description TEXT,

  -- Stripe Connect (company-level)
  stripe_account_id TEXT UNIQUE,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Verification
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN (
      'pending',          -- submitted, awaiting review
      'cqc_verified',     -- CQC auto-check passed, docs under review
      'verified',         -- fully approved by admin
      'rejected',         -- admin rejected
      'suspended',        -- compliance issue (CQC, insurance, DBS)
      'info_requested'    -- admin asked for more documents
    )),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,

  -- Marketplace flags
  can_browse_events BOOLEAN DEFAULT TRUE,   -- always true after registration
  can_submit_quotes BOOLEAN DEFAULT FALSE,  -- true only when verified

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pattern 4: Compliance Document Tracking with Expiry

**What:** A single `compliance_documents` table tracks all uploaded documents (insurance, DBS, indemnity) with expiry dates and status tracking.
**When to use:** Document upload during registration and ongoing compliance monitoring.
**Why:** All compliance documents follow the same suspension pattern (expiry triggers block from quoting + email + admin review). One table with a `document_type` discriminator is cleaner than separate tables per document type.

```sql
CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),

  document_type TEXT NOT NULL CHECK (document_type IN (
    'public_liability_insurance',
    'employers_liability_insurance',
    'professional_indemnity_insurance',
    'dbs_certificate',
    'other'
  )),

  -- File reference
  storage_path TEXT NOT NULL,              -- Supabase Storage path
  file_name TEXT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT,

  -- Validity
  issue_date DATE,
  expiry_date DATE,                        -- NULL if no expiry
  certificate_number TEXT,
  staff_member_name TEXT,                  -- for DBS: which staff member

  -- Review
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pattern 5: CQC API Client

**What:** Wrapper for CQC public API calls with proper error handling and rate limiting awareness.
**When to use:** Signup-time verification and daily scheduled checks.

```typescript
// Source: CQC API documentation (https://api-portal.service.cqc.org.uk/)

// web/lib/marketplace/cqc-client.ts
const CQC_BASE_URL = 'https://api.cqc.org.uk/public/v1';
const CQC_PARTNER_CODE = process.env.CQC_PARTNER_CODE || 'SiteMedic';

interface CQCProvider {
  providerId: string;
  providerName: string;
  registrationStatus: string;  // "Registered", etc.
  registrationDate: string;
  organisationType: string;
  locationIds: string[];
  // ... other fields
}

export async function verifyCQCProvider(providerId: string): Promise<{
  valid: boolean;
  provider: CQCProvider | null;
  error?: string;
}> {
  const response = await fetch(
    `${CQC_BASE_URL}/providers/${providerId}?partnerCode=${CQC_PARTNER_CODE}`
  );

  if (response.status === 404) {
    return { valid: false, provider: null, error: 'CQC provider not found' };
  }

  if (!response.ok) {
    return { valid: false, provider: null, error: `CQC API error: ${response.status}` };
  }

  const provider: CQCProvider = await response.json();

  return {
    valid: provider.registrationStatus === 'Registered',
    provider,
    error: provider.registrationStatus !== 'Registered'
      ? `CQC status is ${provider.registrationStatus}, not Registered`
      : undefined,
  };
}
```

### Pattern 6: Multi-Step Wizard with Zustand Store

**What:** A Zustand store manages state across 4 registration steps, persisting data between navigations.
**When to use:** The marketplace company registration wizard (Step 1: company details, Step 2: CQC number, Step 3: document uploads, Step 4: Stripe Connect).

```typescript
// Source: Existing pattern from web/stores/useScheduleBoardStore.ts

// web/stores/useMarketplaceRegistrationStore.ts
import { create } from 'zustand';

type RegistrationStep = 'company-details' | 'cqc-verification' | 'document-upload' | 'stripe-connect';

interface RegistrationState {
  currentStep: RegistrationStep;
  // Step 1
  companyName: string;
  companyRegNumber: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyPostcode: string;
  coverageAreas: string[];
  // Step 2
  cqcProviderId: string;
  cqcVerified: boolean;
  cqcProviderName: string;
  // Step 3
  uploadedDocuments: { type: string; fileName: string; storagePath: string }[];
  // Step 4
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;

  // Actions
  setStep: (step: RegistrationStep) => void;
  updateCompanyDetails: (data: Partial<RegistrationState>) => void;
  setCqcVerification: (providerId: string, verified: boolean, providerName: string) => void;
  addDocument: (doc: { type: string; fileName: string; storagePath: string }) => void;
  setStripeAccount: (accountId: string, complete: boolean) => void;
  reset: () => void;
}
```

### Anti-Patterns to Avoid

- **Org-scoping marketplace tables with `get_user_org_id()`:** Marketplace is cross-org by design. Use `auth.uid()` and role-based policies instead.
- **Storing CQC provider ID without auto-verification:** Always verify the CQC number at signup time. A user could enter any CQC number; the API call confirms it exists and is active.
- **Separate tables per document type:** One `compliance_documents` table with a `document_type` discriminator is cleaner. All documents follow the same lifecycle (upload -> review -> approve/reject -> expiry tracking).
- **Signed URLs with long expiry for compliance docs:** Use short-lived signed URLs (1 hour) generated on demand when admin views the document. Never store the signed URL -- regenerate it each time.
- **Mixing CQC daily checks with signup verification:** Signup needs instant verification (sync API call). Daily checks should be a background Edge Function with cron. Different code paths, same CQC client library.
- **Creating a completely separate user account for marketplace registrants:** Bidirectional crossover means existing org users can link to marketplace. Do not create separate auth identities.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race condition prevention for medic double-booking | Application-level locking or optimistic concurrency | PostgreSQL EXCLUSION constraint with `btree_gist` | Database-level guarantees; application-level locks can fail under concurrent requests |
| CQC status monitoring | Polling logic from scratch | CQC Changes API (`/changes/provider?startTimestamp=...&endTimestamp=...`) + individual provider fetch | The changes endpoint returns IDs of providers that changed -- only fetch those, not all providers |
| Document expiry monitoring | Custom date comparison logic in every query | A daily cron Edge Function that queries `WHERE expiry_date <= CURRENT_DATE + interval '30 days'` | Centralized, runs once, sends notifications, updates statuses |
| Stripe Express onboarding flow | Custom onboarding forms | Stripe-hosted Account Links (existing pattern in `stripe-connect` Edge Function) | Stripe handles identity verification, bank details, and compliance. The existing `createExpressAccount` function is directly reusable. |
| File upload progress / validation | Custom upload logic | Supabase Storage client `supabase.storage.from('bucket').upload()` | Built-in progress callbacks, file size limits, MIME type validation in bucket config |

**Key insight:** The existing codebase already has patterns for every major concern (Stripe Express onboarding, Supabase Storage with RLS, admin verification queues, email notifications). The marketplace registration flow assembles existing patterns into a new workflow rather than inventing new infrastructure.

## Common Pitfalls

### Pitfall 1: Marketplace RLS Leaking Private Data

**What goes wrong:** Marketplace tables need cross-org visibility, but overly permissive SELECT policies could expose unverified companies, pending documents, or admin notes to non-admin users.
**Why it happens:** Developers apply the "marketplace is cross-org" principle too broadly and make everything public.
**How to avoid:** Layer RLS policies carefully:
  - Public-facing data (company name, verification badge): broad SELECT for authenticated users
  - Compliance documents: only the company owner + platform admin
  - Admin review notes: only platform admin
  - Unverified/pending companies: only the owner + platform admin (NOT visible to other marketplace users)
**Warning signs:** Any RLS policy on compliance_documents that allows non-admin, non-owner SELECT access.

### Pitfall 2: CQC API Rate Limiting on Bulk Daily Checks

**What goes wrong:** If the daily CQC check fetches every registered company individually, it could hit rate limits as the marketplace grows.
**Why it happens:** CQC API allows 2,000 requests/minute with partnerCode, but without it, throttling kicks in. Also, the changes endpoint is more efficient but less well-known.
**How to avoid:**
  1. Use the CQC Changes endpoint first (`/changes/provider?startTimestamp=...&endTimestamp=...`) to find which providers changed in the last 24 hours.
  2. Only fetch individual providers that appear in the changes list.
  3. Always include `partnerCode` parameter (register with CQC as "SiteMedic" or request a code via syndicationapi@cqc.org.uk).
  4. If the changes endpoint is unreliable, batch individual requests with 50ms delay between them.
**Warning signs:** Daily check taking more than a few minutes; 429 responses from CQC API.

### Pitfall 3: Stripe Connect Express for Companies vs Individuals

**What goes wrong:** The existing `stripe-connect` Edge Function creates Express accounts with `business_type: 'individual'`. Marketplace companies need `business_type: 'company'`.
**Why it happens:** Copy-pasting the existing code without changing the business type.
**How to avoid:** Create a new action in the `stripe-connect` Edge Function (e.g., `create_company_express_account`) that explicitly sets `business_type: 'company'` and provides company details (`company.name`, `company.tax_id`, `company.address`). The onboarding link flow (Account Links) is identical for both types.
**Warning signs:** Stripe Dashboard showing connected accounts with `individual` type for companies; Stripe requesting personal identity documents instead of company documents.

### Pitfall 4: Document Expiry Not Triggering Suspension

**What goes wrong:** Insurance or DBS expires but the company can still submit quotes because the `can_submit_quotes` flag is not updated.
**Why it happens:** The expiry check runs daily but doesn't update the marketplace_companies table, or the check logic misses edge cases (expired yesterday, timezone issues).
**How to avoid:**
  1. The daily cron Edge Function checks ALL compliance_documents with `expiry_date <= CURRENT_DATE`.
  2. If ANY required document is expired: set company's `can_submit_quotes = FALSE`, `verification_status = 'suspended'`, `suspension_reason = 'document_expired:{type}'`.
  3. Send email notification to company via Resend.
  4. Flag active jobs for admin review (query bookings where medic's company is suspended).
  5. Use `CURRENT_DATE` (database-level, UTC) not application-level date to avoid timezone issues.
**Warning signs:** Companies with expired documents still appearing in "verified" lists.

### Pitfall 5: Bidirectional Crossover Creating Duplicate Accounts

**What goes wrong:** An existing SiteMedic org registers on the marketplace and a new `organizations` row is created instead of linking to the existing one.
**Why it happens:** The registration flow doesn't check if the user already has an org_id in their JWT app_metadata.
**How to avoid:**
  1. At registration start, check `user.app_metadata.org_id`.
  2. If org_id exists: create `marketplace_companies` row with `org_id = existing org_id`. Company name, address, etc. pre-fill from existing org data.
  3. If org_id is null: create new `organizations` row + `marketplace_companies` row. Set user's app_metadata.org_id.
  4. The `marketplace_companies.org_id` column has a UNIQUE constraint -- one marketplace registration per org.
**Warning signs:** Multiple organizations with the same company name; users with multiple org_ids.

## Code Examples

### CQC Provider Verification (Signup Flow)

```typescript
// Source: CQC API docs (https://anypoint.mulesoft.com/exchange/portals/care-quality-commission-5/)

// web/app/api/marketplace/cqc-verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCQCProvider } from '@/lib/marketplace/cqc-client';

export async function POST(request: NextRequest) {
  const { cqcProviderId } = await request.json();

  if (!cqcProviderId || typeof cqcProviderId !== 'string') {
    return NextResponse.json({ error: 'CQC provider ID required' }, { status: 400 });
  }

  const result = await verifyCQCProvider(cqcProviderId);

  return NextResponse.json({
    valid: result.valid,
    providerName: result.provider?.providerName ?? null,
    registrationStatus: result.provider?.registrationStatus ?? null,
    registrationDate: result.provider?.registrationDate ?? null,
    error: result.error,
  });
}
```

### Daily CQC Compliance Check (Edge Function)

```typescript
// Source: CQC Changes API + existing cert-expiry-checker pattern

// supabase/functions/cqc-verify/index.ts (scheduled via cron)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CQC_BASE_URL = 'https://api.cqc.org.uk/public/v1';
const CQC_PARTNER_CODE = Deno.env.get('CQC_PARTNER_CODE') || 'SiteMedic';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch all active marketplace companies
  const { data: companies } = await supabase
    .from('marketplace_companies')
    .select('id, cqc_provider_id, company_name, company_email, verification_status')
    .in('verification_status', ['verified', 'cqc_verified']);

  if (!companies?.length) {
    return new Response(JSON.stringify({ checked: 0 }));
  }

  let suspended = 0;

  for (const company of companies) {
    // Rate limit: 50ms between requests
    await new Promise(r => setTimeout(r, 50));

    const res = await fetch(
      `${CQC_BASE_URL}/providers/${company.cqc_provider_id}?partnerCode=${CQC_PARTNER_CODE}`
    );

    if (!res.ok) continue; // skip on API error, don't suspend

    const provider = await res.json();

    if (provider.registrationStatus !== 'Registered') {
      // Suspend the company
      await supabase
        .from('marketplace_companies')
        .update({
          verification_status: 'suspended',
          can_submit_quotes: false,
          suspension_reason: `CQC status changed to: ${provider.registrationStatus}`,
          suspended_at: new Date().toISOString(),
          cqc_registration_status: provider.registrationStatus,
          cqc_last_checked_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      // TODO: Send email via Resend
      // TODO: Flag active bookings for admin review

      suspended++;
    } else {
      // Update last checked timestamp
      await supabase
        .from('marketplace_companies')
        .update({
          cqc_last_checked_at: new Date().toISOString(),
          cqc_registration_status: 'Registered',
        })
        .eq('id', company.id);
    }
  }

  return new Response(JSON.stringify({ checked: companies.length, suspended }));
});
```

### Stripe Connect Express for Company Accounts

```typescript
// Source: Existing stripe-connect Edge Function + Stripe API docs

// New action in stripe-connect/index.ts or separate marketplace-stripe-connect Edge Function
async function createCompanyExpressAccount(data: {
  company_id: string;
  company_name: string;
  company_email: string;
  company_reg_number?: string;
}): Promise<Response> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    business_type: 'company',      // KEY DIFFERENCE from existing individual flow
    capabilities: {
      transfers: { requested: true },
    },
    company: {
      name: data.company_name,
      registration_number: data.company_reg_number,
    },
    metadata: {
      marketplace_company_id: data.company_id,
    },
  });

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${SITE_URL}/marketplace/register?step=stripe-connect&refresh=true`,
    return_url: `${SITE_URL}/marketplace/register?step=stripe-connect&complete=true`,
    type: 'account_onboarding',
  });

  // Update marketplace_companies with stripe account ID
  await supabase
    .from('marketplace_companies')
    .update({
      stripe_account_id: account.id,
    })
    .eq('id', data.company_id);

  return new Response(
    JSON.stringify({
      account_id: account.id,
      onboarding_url: accountLink.url,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Compliance Document Storage Bucket

```sql
-- Source: Existing pattern from 134_org_logos_bucket.sql and 125_event_incident_reports_storage.sql

-- Private bucket: compliance documents contain sensitive data (insurance, DBS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,        -- PRIVATE: insurance certs, DBS checks are sensitive
  10485760,     -- 10 MB max per file
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Company owners can upload to their company's folder
CREATE POLICY "Company admins upload compliance docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE id::text = (storage.foldername(name))[1]
        AND admin_user_id = auth.uid()
    )
  );

-- Company owners can view their own docs
CREATE POLICY "Company admins view own compliance docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE id::text = (storage.foldername(name))[1]
        AND admin_user_id = auth.uid()
    )
  );

-- Platform admins can view all compliance docs (for verification queue)
CREATE POLICY "Platform admins view all compliance docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND is_platform_admin()
  );
```

### Admin Verification Queue Pattern

```typescript
// Source: Existing admin page patterns (web/app/admin/*)

// Platform admin verification queue data fetching
// web/app/platform/verification/page.tsx (Server Component)
export default async function VerificationQueuePage() {
  const supabase = await createClient();

  // Fetch pending and info-requested companies
  const { data: pendingCompanies } = await supabase
    .from('marketplace_companies')
    .select(`
      id, company_name, company_email, cqc_provider_id,
      cqc_auto_verified, cqc_registration_status,
      verification_status, created_at,
      compliance_documents (
        id, document_type, file_name, review_status,
        expiry_date, storage_path
      )
    `)
    .in('verification_status', ['pending', 'cqc_verified', 'info_requested'])
    .order('created_at', { ascending: true });

  // ... render queue UI
}
```

### Admin Approve/Reject/Request More Info Actions

```typescript
// web/app/api/marketplace/verify/route.ts
export async function POST(request: NextRequest) {
  const { companyId, action, notes } = await request.json();

  // Validate platform admin role
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  switch (action) {
    case 'approve':
      await supabase.from('marketplace_companies').update({
        verification_status: 'verified',
        can_submit_quotes: true,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      }).eq('id', companyId);
      // Send approval email
      break;

    case 'reject':
      await supabase.from('marketplace_companies').update({
        verification_status: 'rejected',
        rejection_reason: notes,
      }).eq('id', companyId);
      // Send rejection email
      break;

    case 'request_info':
      await supabase.from('marketplace_companies').update({
        verification_status: 'info_requested',
      }).eq('id', companyId);
      // Send "more info needed" email with notes
      break;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single PaymentIntent with auth+capture | Two separate PaymentIntents (deposit + remainder) | v4.0 decision | Stripe auth holds expire after 7 days; events may be weeks away |
| Individual medic registration | Company-only registration (CQC-registered) | Phase 32 context discussion | Entire schema shifts from medic-centric to company-centric |
| `org_id`-based RLS for all tables | `user_id`-based RLS for marketplace tables | v4.0 decision | Cross-org visibility is fundamental to marketplace |
| PostgreSQL 17 EXCLUSION constraints | PostgreSQL 18 adds `WITHOUT OVERLAPS` syntax | PostgreSQL 18 (not yet on Supabase) | Stay with EXCLUSION + btree_gist (Supabase runs PG 15/16) |

**Deprecated/outdated:**
- Individual medic registration flow from original REG-01 through REG-08: replaced by companies-only model per CONTEXT.md
- `medic_companies` table from v4.0 ARCHITECTURE.md: will be replaced by `marketplace_companies` with CQC integration (more comprehensive)

## Open Questions

1. **CQC partnerCode registration**
   - What we know: The CQC API works without a partnerCode but may throttle. With a partnerCode, 2,000 requests/minute are allowed.
   - What's unclear: Whether SiteMedic has registered with CQC for a partnerCode, and how long registration takes.
   - Recommendation: Use a self-assigned descriptive code (e.g., `"SiteMedic"`) initially. Register formally with CQC via syndicationapi@cqc.org.uk before production launch.

2. **CQC registrationStatus possible values beyond "Registered"**
   - What we know: The API returns `registrationStatus: "Registered"` for active providers. CQC can suspend or deregister providers.
   - What's unclear: The exact enum of possible values (e.g., "Suspended", "Deregistered", "Cancelled"). The API docs don't enumerate all values explicitly.
   - Recommendation: Treat ANY value other than "Registered" as a failed check. Log the actual value for debugging. Do not hard-code a list of invalid statuses.

3. **Marketplace client registration scope**
   - What we know: CONTEXT says "Client registration -- open to both companies and individuals (anyone can post an event needing medical cover)" and "keep it lightweight for low friction."
   - What's unclear: Whether client registration creates an `organizations` row or uses a lighter-weight structure. Current `clients` table already exists with company_name, stripe_customer_id, etc.
   - Recommendation: Use the existing `clients` table for marketplace clients. Add a `marketplace_enabled` boolean flag. Collect minimal info at signup (name, email, company name); collect billing/Stripe details when they award their first job.

4. **Supabase PostgreSQL version and btree_gist availability**
   - What we know: Supabase lists btree_gist as an available extension. The extension must be explicitly enabled with `CREATE EXTENSION IF NOT EXISTS btree_gist`.
   - What's unclear: The exact PostgreSQL version on the project's Supabase instance (likely 15 or 16).
   - Recommendation: Include `CREATE EXTENSION IF NOT EXISTS btree_gist;` at the top of the migration. This is idempotent and safe.

5. **Marketplace company Stripe Connect: company vs individual business_type**
   - What we know: The existing `stripe-connect` Edge Function creates `business_type: 'individual'` accounts. Companies need `business_type: 'company'`.
   - What's unclear: Whether all marketplace companies are limited companies (Ltd) or could be sole traders (which would technically be `individual` in Stripe).
   - Recommendation: Since CONTEXT specifies "CQC-registered medical companies," assume `business_type: 'company'` for all marketplace registrants. If sole traders need support later, add a selector.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/002_business_operations.sql` -- medics, clients, bookings table schema
- Existing codebase: `supabase/migrations/028_enable_org_rls.sql` -- `get_user_org_id()` function definition
- Existing codebase: `supabase/migrations/101_migrate_to_platform_admin.sql` -- `is_platform_admin()` function definition
- Existing codebase: `supabase/migrations/122_cqc_registration.sql` -- existing CQC fields on org_settings
- Existing codebase: `supabase/migrations/134_org_logos_bucket.sql` -- Supabase Storage bucket + RLS pattern
- Existing codebase: `supabase/functions/stripe-connect/index.ts` -- Express account creation pattern
- Existing codebase: `web/lib/supabase/middleware.ts` -- auth + subdomain routing + org resolution
- Existing codebase: `web/app/(auth)/signup/page.tsx` -- existing multi-step signup with Zustand-like state
- Existing codebase: `web/stores/useScheduleBoardStore.ts` -- Zustand store pattern
- `.planning/research/v4/ARCHITECTURE.md` -- v4.0 marketplace architecture decisions
- `.planning/phases/32-foundation-schema-registration/32-CONTEXT.md` -- Phase 32 context decisions

### Secondary (MEDIUM confidence)
- [CQC Syndication API - Provider Examples](https://anypoint.mulesoft.com/exchange/portals/care-quality-commission-5/4d36bd23-127d-4acf-8903-ba292ea615d4/cqc-syndication-1/minor/1.0/pages/1.%20Providers%20Examples/) -- CQC API endpoint patterns, response fields
- [CQC Syndication API - Changes Examples](https://anypoint.mulesoft.com/exchange/portals/care-quality-commission-5/4d36bd23-127d-4acf-8903-ba292ea615d4/cqc-syndication-1/minor/1.0/pages/3.%20Changes%20Examples/) -- Changes endpoint for daily monitoring
- [CQC Developer Portal](https://api-portal.service.cqc.org.uk/) -- API overview, partnerCode, rate limits
- [Stripe Connect Express Accounts](https://docs.stripe.com/connect/express-accounts) -- Express account creation, Account Links, onboarding flow
- [Stripe API: Create Account](https://docs.stripe.com/api/accounts/create) -- business_type enum: individual, company, government_entity, non_profit
- [PostgreSQL btree_gist](https://www.postgresql.org/docs/current/btree-gist.html) -- EXCLUSION constraint requirements
- [Supabase Extensions](https://supabase.com/docs/guides/database/extensions) -- btree_gist availability on Supabase

### Tertiary (LOW confidence)
- CQC `registrationStatus` exact enum values beyond "Registered" -- not documented explicitly in API docs; inferred from CQC's data management practices. Treat any non-"Registered" value as a compliance failure.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already exist in the project; no new dependencies needed
- Architecture: HIGH -- marketplace cross-org RLS pattern verified against v4.0 architecture research; EXCLUSION constraint pattern well-documented in PostgreSQL docs; CQC API verified via web search + official docs
- Pitfalls: HIGH -- pitfalls derived from direct codebase analysis (existing RLS patterns, Stripe Connect business_type difference, CQC rate limits from official docs)

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days -- stable domain; CQC API unlikely to change)
