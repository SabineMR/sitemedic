# Phase 08: Lead Capture & Data Persistence - Research

**Researched:** 2026-02-17
**Domain:** Supabase PostgreSQL, Next.js 15 App Router API Routes, TanStack Query, shadcn/ui admin tables
**Confidence:** HIGH — all findings verified from direct codebase inspection

---

## Summary

Phase 08 is a persistence layer addition on top of two existing flows: the contact form (`/contact`) and the Quote Builder modal. Both already POST to API routes. Both routes currently send email via Resend and return success with no DB write. The change is additive: write to a new table first, then send the email.

The admin side will be a new page following the exact pattern of `/admin/bookings/page.tsx` and `/admin/customers/page.tsx`: a `page.tsx` shell with a header + action button, a client component containing filter state and a table, and a TanStack Query hook in `web/lib/queries/admin/`.

The quote-to-booking pre-fill uses the existing URL search params pattern — `/admin/bookings/new` already accepts a form state object, so the planner must add `useSearchParams()` reads to pre-populate `form` state on mount.

**Critical architectural finding:** Contact and quote submissions come from **unauthenticated public users**. The API routes have no `requireOrgId()` call and no session. This means the DB insert cannot use `get_user_org_id()` from the JWT — there is no JWT. The org_id must be hardcoded to the ASG org UUID (already backfilled in migration `027_backfill_asg_org_id.sql`) or read from an env var. RLS for INSERT must use a service-role key or a special public-insert policy.

**Primary recommendation:** Use Supabase service-role key for the two public API routes' DB inserts. All other tables in this project that have public inserts (e.g., `bookings` created by authenticated clients) use the user's JWT via the server client. For truly anonymous endpoints, use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS on insert, with a narrow server-side check.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | current | Server-side Supabase client in API routes | Used in every existing API route |
| `@tanstack/react-query` | current | Data fetching + 60s polling | Used in all admin query hooks |
| shadcn/ui components | current | `Button`, `Input`, `Select`, `Dialog`, `Badge` | Used in all admin pages |
| `lucide-react` | current | Icons in admin UI | Consistent with existing pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `resend` | current | Email notification after DB write | Already used in both routes |
| `next/navigation` `useRouter` | Next.js 15 | Navigation after form submit | Used in new booking page |
| `next/navigation` `useSearchParams` | Next.js 15 | Reading pre-fill params on booking new page | Required for quote-to-booking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Service-role key for public inserts | Public anon insert policy | Service role is simpler; anon policy needs careful crafting to avoid data leakage |
| URL search params for pre-fill | sessionStorage | sessionStorage already used and noted as the problem we are fixing; URL params are stateless and shareable |
| Separate submissions page | Tabs on customers page | Separate page is cleaner; customers page is already complex |

**Installation:** No new packages required. All libraries already installed.

---

## Architecture Patterns

### Recommended Project Structure for New Files

```
supabase/migrations/
  115_lead_capture_tables.sql      # contact_submissions + quote_submissions tables + RLS

web/app/api/contact/submit/route.ts   # MODIFY: add DB write before email
web/app/api/quotes/submit/route.ts    # MODIFY: add DB write before email

web/lib/queries/admin/
  submissions.ts                       # NEW: TanStack Query hooks for both tables

web/app/admin/submissions/
  page.tsx                             # NEW: admin page shell (contact + quote tabs)

web/components/admin/
  contact-submissions-table.tsx        # NEW: filterable table for contact leads
  quote-submissions-table.tsx          # NEW: filterable table for quote leads

web/app/admin/bookings/new/page.tsx   # MODIFY: read useSearchParams to pre-fill form
```

### Pattern 1: DB-First, Then Email

Every existing API route that sends email uses fire-and-forget for email (non-blocking). Adopt the same for DB writes but invert: **DB is the critical path, email is fire-and-forget**.

```typescript
// Source: direct inspection of /api/bookings/create/route.ts
export async function POST(request: NextRequest) {
  // 1. Validate body
  // 2. Insert to DB (critical path - if this fails, return 500)
  const { data, error } = await supabase
    .from('contact_submissions')
    .insert({ org_id: ASG_ORG_ID, ...fields })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  // 3. Send email (fire-and-forget, non-blocking)
  resend.emails.send({ ... }).catch((err) =>
    console.error('Email send failed (non-blocking):', err)
  );

  // 4. Return success
  return NextResponse.json({ success: true });
}
```

### Pattern 2: Public Route DB Insert via Service Role

Contact and quote API routes are called by unauthenticated public visitors. They currently use `resend` from `@/lib/email/resend` with no auth. To write to Supabase from these routes without a JWT:

```typescript
// Source: pattern derived from Supabase docs + codebase inspection
// Use service-role client for public routes that need DB writes
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only, never exposed to client
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

The service role key is already present in the project (migrations use it via Supabase CLI). Confirm it is in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`.

**Alternative (if service role key is unavailable or undesirable):** Create a narrow RLS policy allowing anon INSERT on the two tables with no SELECT/UPDATE/DELETE for anon. This is also valid but requires careful testing.

### Pattern 3: Admin Page Shell

All admin pages follow this exact structure (from `/admin/bookings/page.tsx` and `/admin/customers/page.tsx`):

```typescript
// Source: direct inspection of web/app/admin/bookings/page.tsx
'use client';

export default function SubmissionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        {/* title + optional action button */}
      </header>
      <div className="p-8">
        <ContactSubmissionsTable />  {/* or tabs switching between contact/quote */}
      </div>
    </div>
  );
}
```

### Pattern 4: TanStack Query Hook

All admin data hooks live in `web/lib/queries/admin/`. The pattern (from `bookings.ts`):

```typescript
// Source: direct inspection of web/lib/queries/admin/bookings.ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRequireOrg } from '@/contexts/org-context';

export function useContactSubmissions() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['contact-submissions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useMutation({
    mutationFn: async ({ id, status, table }: { id: string; status: string; table: string }) => {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions', orgId] });
      queryClient.invalidateQueries({ queryKey: ['quote-submissions', orgId] });
    },
  });
}
```

### Pattern 5: Quote-to-Booking Pre-fill via URL Search Params

The `/admin/bookings/new/page.tsx` page uses `useState` for its form. The pre-fill reads URL search params on mount and seeds the state. The admin clicks "Convert to Booking" on a quote, which navigates to `/admin/bookings/new?quoteId=<id>&...fields`.

```typescript
// Source: pattern derived from Next.js App Router docs + inspection of new/page.tsx
'use client';
import { useSearchParams } from 'next/navigation';

export default function NewBookingPage() {
  const params = useSearchParams();
  const [form, setForm] = useState({
    clientEmail: params.get('clientEmail') ?? '',
    siteAddress: params.get('siteAddress') ?? '',
    specialNotes: params.get('specialNotes') ?? '',
    // ... other pre-fillable fields
  });
  // rest of form unchanged
}
```

The "Convert to Booking" button on the quote submissions table builds the URL:

```typescript
// In quote-submissions-table.tsx
function handleConvert(quote: QuoteSubmission) {
  const params = new URLSearchParams({
    clientEmail: quote.email,
    siteAddress: quote.site_address,
    specialNotes: `Converted from quote ${quote.quote_ref}`,
    confinedSpace: quote.special_requirements?.includes('confined-space') ? '1' : '0',
    traumaSpecialist: quote.special_requirements?.includes('trauma-specialist') ? '1' : '0',
    // Note: shiftDate maps from quote start_date
    shiftDate: quote.start_date ?? '',
  });
  router.push(`/admin/bookings/new?${params.toString()}`);
}
```

### Anti-Patterns to Avoid

- **Email before DB write:** If email is sent first and DB write fails, the lead is lost. DB write must be the critical path.
- **Using `requireOrgId()` in public routes:** The contact/quote routes have no session. Calling `requireOrgId()` will throw and return a 401. Use a hardcoded ASG org UUID from env or the service role client.
- **Polling too aggressively:** Existing pattern uses 60-second polling. Follow this. Do not use Supabase Realtime — it is not configured in this project.
- **Storing `sessionStorage` reference ID only:** The whole point of this phase is to eliminate `sessionStorage` dependency. Store the complete payload in the DB row, not just a reference.

---

## Exact Field Lists

### contact_submissions fields (from `contact-form.tsx` and `route.ts`)

| DB Column | Source Field | Type | Required | Notes |
|-----------|-------------|------|----------|-------|
| `id` | auto | UUID | auto | PK |
| `org_id` | server-set | UUID | yes | Always ASG org UUID for public submissions |
| `first_name` | `firstName` | TEXT | yes | |
| `last_name` | `lastName` | TEXT | yes | |
| `company` | `company` | TEXT | yes | |
| `email` | `email` | TEXT | yes | |
| `phone` | `phone` | TEXT | nullable | Optional in form |
| `site_size` | `siteSize` | TEXT | nullable | One of the SITE_SIZES enum values |
| `enquiry_type` | `enquiryType` | TEXT | yes | One of the ENQUIRY_TYPES enum values |
| `message` | `message` | TEXT | nullable | Free text |
| `status` | server-set | TEXT | yes | `new` default |
| `follow_up_notes` | admin-editable | TEXT | nullable | Admin notes for follow-up |
| `created_at` | auto | TIMESTAMPTZ | auto | |
| `updated_at` | auto | TIMESTAMPTZ | auto | |

**Status enum values:** `new`, `contacted`, `converted`, `closed`

### quote_submissions fields (from `QuoteBuilder.tsx` formData and `route.ts`)

| DB Column | Source Field | Type | Required | Notes |
|-----------|-------------|------|----------|-------|
| `id` | auto | UUID | auto | PK |
| `org_id` | server-set | UUID | yes | Always ASG org UUID for public submissions |
| `quote_ref` | generated | TEXT | yes | e.g., `QT-XXXX` (currently generated in API route) |
| `name` | `name` | TEXT | yes | Full name (one field in QuoteBuilder step 3) |
| `email` | `email` | TEXT | yes | |
| `phone` | `phone` | TEXT | yes | |
| `company` | `company` | TEXT | nullable | Optional in form |
| `worker_count` | `workerCount` | TEXT | nullable | String input |
| `project_type` | `projectType` | TEXT | nullable | `standard`, `high-risk`, `heavy-civil`, `refurbishment` |
| `medic_count` | `medicCount` | TEXT | nullable | `'1'` to `'5'` |
| `duration_known` | `durationKnown` | TEXT | nullable | `'fixed'` or `'estimated'` |
| `estimated_duration` | `estimatedDuration` | TEXT | nullable | e.g., `'1-3-months'` |
| `site_address` | `siteAddress` | TEXT | nullable | From Google Places or manual |
| `coordinates` | `coordinates` | TEXT | nullable | `"lat, lng"` string |
| `what3words_address` | `what3wordsAddress` | TEXT | nullable | e.g., `///word.word.word` |
| `start_date` | `startDate` | DATE | nullable | ISO date string |
| `end_date` | `endDate` | DATE | nullable | ISO date string, null if estimated |
| `project_phase` | `projectPhase` | TEXT | nullable | `pre-construction`, `construction`, `fit-out`, `completion` |
| `special_requirements` | `specialRequirements` | TEXT[] | nullable | Array, stored as Postgres `TEXT[]` |
| `calculated_price` | server-computed | NUMERIC | nullable | `£350 * medicCount * days`, for reference |
| `status` | server-set | TEXT | yes | `new` default |
| `follow_up_notes` | admin-editable | TEXT | nullable | Admin notes |
| `converted_booking_id` | admin-set | UUID | nullable | FK to `bookings.id` when converted |
| `created_at` | auto | TIMESTAMPTZ | auto | |
| `updated_at` | auto | TIMESTAMPTZ | auto | |

**Status enum values:** `new`, `contacted`, `converted`, `closed`

**Note on `location` field:** The `QuoteSubmitRequest` type in the existing route has a `location` field, but `QuoteBuilder.tsx` `formData` does not — `formData.location` is `''` always. The real location data is in `siteAddress`, `coordinates`, and `what3wordsAddress`. Do not persist `location`; it is legacy dead code in the route.

---

## DB Schema Recommendations

### Migration File Naming

Current highest migration: `114_site_beacons.sql`

**Next migration number: `115`**

File name: `supabase/migrations/115_lead_capture_tables.sql`

### contact_submissions Table

```sql
-- Migration 115: Lead Capture Tables
-- Purpose: Persist contact form and quote builder submissions for admin follow-up
-- Created: 2026-02-17

CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Submitter details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  site_size TEXT,
  enquiry_type TEXT NOT NULL,
  message TEXT,

  -- Admin follow-up
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  follow_up_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_submissions_org ON contact_submissions(org_id);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_created ON contact_submissions(created_at DESC);

COMMENT ON TABLE contact_submissions IS 'Contact form submissions from public /contact page';
```

### quote_submissions Table

```sql
CREATE TABLE quote_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_ref TEXT NOT NULL,

  -- Contact details (step 3 of QuoteBuilder)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,

  -- Site & project details (step 1 of QuoteBuilder)
  worker_count TEXT,
  project_type TEXT,
  medic_count TEXT,
  duration_known TEXT,
  estimated_duration TEXT,
  site_address TEXT,
  coordinates TEXT,
  what3words_address TEXT,
  start_date DATE,
  end_date DATE,
  project_phase TEXT,
  special_requirements TEXT[],
  calculated_price NUMERIC(10,2),

  -- Admin follow-up
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  follow_up_notes TEXT,
  converted_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_submissions_org ON quote_submissions(org_id);
CREATE INDEX idx_quote_submissions_status ON quote_submissions(status);
CREATE INDEX idx_quote_submissions_created ON quote_submissions(created_at DESC);
CREATE INDEX idx_quote_submissions_ref ON quote_submissions(quote_ref);

COMMENT ON TABLE quote_submissions IS 'Quote builder submissions from public marketing site';
```

### RLS Policies

Public submissions come from unauthenticated users — no JWT available. Two options:

**Option A (recommended): Service role insert, standard RLS for reads**

```sql
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

-- Org-scoped read (matches existing pattern exactly)
CREATE POLICY "Users can view their org's contact submissions"
  ON contact_submissions FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Users can update their org's contact submissions"
  ON contact_submissions FOR UPDATE
  USING (org_id = get_user_org_id());

-- No INSERT policy needed — service role bypasses RLS
-- No DELETE policy needed — leads should not be deletable by org users
-- Same pattern for quote_submissions
```

The two public API routes use a service-role Supabase client for the INSERT only.

**Option B: Anon INSERT policy (if service role key is unavailable)**

```sql
CREATE POLICY "Anyone can insert contact submissions"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);
```

This allows public inserts but SELECT/UPDATE remain org-scoped.

**Platform admin policies** follow the existing `102_platform_admin_rls_policies.sql` pattern — add 4 policies per table (SELECT/INSERT/UPDATE/DELETE) using `is_platform_admin()`.

---

## Admin UI Pattern to Follow

The best model page is `/admin/customers/page.tsx` + `client-management-table.tsx`. It demonstrates:
- Page shell with header + action button
- Client component with `useMemo` filtering (search + status filter)
- TanStack Query hook (`useClients`) with no initial data (client-only fetch)
- Status badges using inline conditional class strings (not a Badge component)
- Action dialogs using shadcn `Dialog`

For submissions, the page will have **two tabs** (Contact / Quotes) rendered by toggling between two table components. Use a simple `useState<'contact' | 'quotes'>` for tab state — not a router param, since this page does not need deep linking.

**Status badge color mapping:**

| Status | Color |
|--------|-------|
| `new` | Blue (`bg-blue-500/20 text-blue-300`) |
| `contacted` | Yellow (`bg-yellow-500/20 text-yellow-300`) |
| `converted` | Green (`bg-green-500/20 text-green-300`) |
| `closed` | Gray (`bg-gray-500/20 text-gray-400`) |

**Admin page path:** `/admin/submissions`

**Sidebar nav item:** Add to `web/app/admin/layout.tsx` navItems array between "Customers" and "Shift Swaps":
```typescript
{
  name: 'Leads',
  href: '/admin/submissions',
  icon: <Inbox className="w-5 h-5" />,
  badge: newLeadsCount,   // optional: count of 'new' status leads
  badgeColor: 'blue',
}
```

---

## Pre-fill Strategy for Quote-to-Booking Conversion

The `/admin/bookings/new` page currently has no pre-fill. Add `useSearchParams()` reads at mount.

**Fields that map from quote to booking form:**

| Quote field | Booking form field | Notes |
|-------------|-------------------|-------|
| `email` | `clientEmail` | Direct map |
| `site_address` | `siteAddress` | Direct map |
| `start_date` | `shiftDate` | ISO date string |
| `special_requirements` contains `'confined-space'` | `confinedSpace` (boolean) | Check array membership |
| `special_requirements` contains `'trauma-specialist'` | `traumaSpecialist` (boolean) | Check array membership |
| `quote_ref` | `specialNotes` | Prepend as "Converted from quote QT-XXXX. " |
| `company` | Not on booking form | No mapping needed |
| `what3words_address` | Not on booking form currently | Booking form does not have w3w field yet |

**Fields that do NOT map** (require admin to fill manually):
- `siteName` — quote does not capture this; admin must enter
- `sitePostcode` — not in quote; derive from address or admin enters
- `siteContactName` / `siteContactPhone` — not in quote; admin enters
- `shiftStartTime` / `shiftEndTime` — not in quote; admin selects
- `qualification` — not in quote; admin selects

**URL example:**
```
/admin/bookings/new?clientEmail=jane@acme.co.uk&siteAddress=...&shiftDate=2026-03-01&confinedSpace=1&specialNotes=Converted+from+QT-AB12
```

**The "Convert to Booking" button** sits on the quote submissions table row. After clicking, it also updates the quote's `status` to `'converted'` and records the resulting `booking_id` in `converted_booking_id` (done after booking creation, or via a separate API call once the booking is created and the admin is redirected back).

**Simpler alternative for the booking link-back:** Do not try to record `converted_booking_id` automatically. Just navigate to the new booking page with pre-filled data. Admin manually marks quote as `converted` in the status dropdown. This avoids a round-trip complexity that adds implementation risk.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom random ID | `uuid_generate_v4()` in Postgres | Already available (extension enabled in `002_business_operations.sql`) |
| Updated_at timestamps | Application-level timestamp | Postgres trigger or `DEFAULT NOW()` | Existing tables use `DEFAULT NOW()` for `updated_at`; add a trigger if needed, but manual update in the UPDATE call is also fine |
| Filtering/sorting | Custom sort logic | `.order()` from Supabase JS client | All existing query hooks use this |
| Status dropdown | Custom select | shadcn `Select` component | Already installed and used in booking new page |
| Table component | Custom table | Simple HTML `<table>` or shadcn Table | Existing admin tables use custom `<table>` elements with Tailwind, not TanStack Table — match this pattern |

**Key insight:** This project does NOT use TanStack Table (the component library). It uses TanStack Query (data fetching). The UI tables are plain `<table>` + `<tr>` elements styled with Tailwind. Do not introduce `@tanstack/react-table` here.

---

## Common Pitfalls

### Pitfall 1: Writing to DB with an unauthenticated Supabase client

**What goes wrong:** The existing server client (`@/lib/supabase/server`) relies on session cookies. Contact/quote routes have no logged-in user. Calling `createClient()` from `@/lib/supabase/server` and then `.from('contact_submissions').insert(...)` will fail at the RLS policy level — `get_user_org_id()` returns null, so `org_id = get_user_org_id()` is `org_id = null`, which never matches.

**How to avoid:** Create a separate service-role Supabase client inline in these two route files. Never expose the service role key to the client bundle.

**Warning signs:** `RLS policy violation` error from Supabase on insert.

### Pitfall 2: org_id for public submissions

**What goes wrong:** There is only one organization (ASG) in this single-tenant-in-practice deployment. But the schema is multi-tenant. Public form submissions need an org_id. Hardcoding the UUID directly in code is fragile.

**How to avoid:** Store it as `NEXT_PUBLIC_ASG_ORG_ID` is NOT appropriate (it is UUID and should not be public). Use `ASG_ORG_ID` as a server-only env var. Read it with `process.env.ASG_ORG_ID` inside the API route. Check it is defined and throw a 500 if not.

**Alternative:** Query the `organizations` table by name (`name = 'Apex Safety Group'`) to get the org UUID dynamically. This is more robust than a hardcoded env var.

### Pitfall 3: Email sent before DB write (losing leads)

**What goes wrong:** Current routes send email first. If DB write is added after and fails, the email already went out but no lead record was created. The lead is "lost" to the DB even though an email exists.

**How to avoid:** DB insert must be first and must block the response on failure. Email is fire-and-forget (`.catch()` logs the error, does not fail the request).

### Pitfall 4: `updated_at` not automatically updated on UPDATE

**What goes wrong:** Without a trigger, `updated_at` stays as the original insert time when admin changes `status`.

**How to avoid:** In the migration, add a `moddatetime` extension trigger or manually include `updated_at: new Date().toISOString()` in every `.update()` call. The project uses manual approach (no moddatetime extension visible in migrations). Do the same — always include `updated_at` in the update payload.

### Pitfall 5: `special_requirements` type mismatch

**What goes wrong:** The QuoteBuilder stores `specialRequirements` as a JavaScript `string[]`. Supabase Postgres `TEXT[]` needs the value to be passed as a JS array. If the client serializes it as a JSON string (e.g., `JSON.stringify(['confined-space'])`), Postgres will reject it or store it wrong.

**How to avoid:** Pass the JS array directly to Supabase — the JS client handles `TEXT[]` natively. Do not `JSON.stringify` it.

### Pitfall 6: Quote pre-fill overwrites booking form fields that should be empty

**What goes wrong:** If `params.get('siteAddress')` returns `null` and the default falls through to `''`, the form renders an empty field — which is correct. But if the param is present but garbage, the admin gets a confusing pre-fill.

**How to avoid:** Only include params in the conversion URL for fields that have actual data in the quote. Use optional chaining and `|| ''` on the quote fields when building the URL.

### Pitfall 7: Sidebar nav `Inbox` icon import

**What goes wrong:** `Inbox` may not be imported in the layout — only specific Lucide icons are imported. Adding a nav item requires importing the icon at the top of `layout.tsx`.

**How to avoid:** Check the import list in `web/app/admin/layout.tsx` before adding the nav item. Add `Inbox` to the import from `lucide-react`.

---

## Code Examples

### Service-Role Client (for public API routes)

```typescript
// In /api/contact/submit/route.ts and /api/quotes/submit/route.ts
// Source: Supabase JS docs + direct inspection of project structure

import { createClient } from '@supabase/supabase-js';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

### Contact Submissions DB Insert

```typescript
// In /api/contact/submit/route.ts — after validation, before email
const supabase = getServiceRoleClient();
const orgId = process.env.ASG_ORG_ID;  // or query organizations table
if (!orgId) {
  return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
}

const { error: dbError } = await supabase
  .from('contact_submissions')
  .insert({
    org_id: orgId,
    first_name: body.firstName,
    last_name: body.lastName,
    company: body.company,
    email: body.email,
    phone: body.phone || null,
    site_size: body.siteSize || null,
    enquiry_type: body.enquiryType,
    message: body.message || null,
    status: 'new',
  });

if (dbError) {
  console.error('DB insert failed for contact submission:', dbError);
  return NextResponse.json({ error: 'Failed to save enquiry' }, { status: 500 });
}
```

### Quote Submissions DB Insert

```typescript
// In /api/quotes/submit/route.ts — after quoteRef generation, before email
const { error: dbError } = await supabase
  .from('quote_submissions')
  .insert({
    org_id: orgId,
    quote_ref: quoteRef,
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company || null,
    worker_count: body.workerCount || null,
    project_type: body.projectType || null,
    medic_count: body.medicCount || null,
    duration_known: body.durationKnown || null,
    estimated_duration: body.estimatedDuration || null,
    site_address: body.siteAddress || null,
    coordinates: body.coordinates || null,   // from formData — note: not in QuoteSubmitRequest type yet
    what3words_address: body.what3wordsAddress || null,
    start_date: body.startDate || null,
    end_date: body.endDate || null,
    project_phase: body.projectPhase || null,
    special_requirements: body.specialRequirements?.length ? body.specialRequirements : null,
    calculated_price: /* compute same as calculatePrice() in client */,
    status: 'new',
  });
```

**Note:** The `QuoteSubmitRequest` interface in the route does not include `coordinates`. When adding the DB insert, also add `coordinates?: string` to the interface.

### Status Update Mutation

```typescript
// In web/lib/queries/admin/submissions.ts
export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      table,
    }: {
      id: string;
      status: 'new' | 'contacted' | 'converted' | 'closed';
      table: 'contact_submissions' | 'quote_submissions';
    }) => {
      const { error } = await supabase
        .from(table)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId); // Defense in depth — RLS also enforces this
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions', orgId] });
      queryClient.invalidateQueries({ queryKey: ['quote-submissions', orgId] });
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Email-only lead capture | DB + email | Phase 08 (this work) | Leads survive browser close, email outage |
| `sessionStorage` quote persistence | DB-backed quote record | Phase 08 (this work) | Quote survives session, admin can view |

**Deprecated/outdated:**
- `location` field in `QuoteSubmitRequest`: dead code, `formData.location` is always `''`. Do not persist it.
- Quote `duration` field in `QuoteSubmitRequest`: `formData` does not set this field (it is always `'1-day'` default). The meaningful data is in `durationKnown` + `estimatedDuration` or `startDate`/`endDate`. Do not persist the dead `duration` field.

---

## Open Questions

1. **ASG org UUID source**
   - What we know: The project backfills data to ASG org via `027_backfill_asg_org_id.sql`. The UUID is known.
   - What's unclear: Whether `SUPABASE_SERVICE_ROLE_KEY` is already in `.env.local`, and whether an `ASG_ORG_ID` env var exists or needs to be added.
   - Recommendation: Planner should add a task to verify `.env.local` has these keys before the API route changes. Alternatively, query `SELECT id FROM organizations WHERE name ILIKE '%apex%' LIMIT 1` in the migration to set a variable.

2. **`updated_at` trigger vs. manual update**
   - What we know: Existing tables do not use a `moddatetime` trigger (not visible in migrations). They rely on manual `updated_at` in update calls.
   - What's unclear: Whether a trigger is planned in a future migration.
   - Recommendation: Follow existing pattern — include `updated_at: new Date().toISOString()` in every update call. Add a comment in the migration noting this.

3. **Platform admin access to submissions**
   - What we know: Platform admins use `is_platform_admin()` policies (see `102_platform_admin_rls_policies.sql`).
   - What's unclear: Whether submissions page should appear in the platform admin portal (`/platform`) or only in `/admin`.
   - Recommendation: Add platform admin RLS policies for both tables in the same migration (4 policies per table). The page itself only needs to exist at `/admin/submissions` for now.

4. **`coordinates` field in the QuoteSubmitRequest interface**
   - What we know: `QuoteBuilder.tsx` formData has `coordinates` and sends it. The route interface `QuoteSubmitRequest` does NOT declare it.
   - What's unclear: Whether the route body already receives it (TypeScript types are loose at runtime — it likely does arrive).
   - Recommendation: Add `coordinates?: string` to `QuoteSubmitRequest` interface when modifying the route.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `web/app/(marketing)/contact/contact-form.tsx` — field list confirmed
- Direct codebase inspection: `web/components/QuoteBuilder.tsx` — formData structure confirmed
- Direct codebase inspection: `web/app/api/contact/submit/route.ts` — email-only confirmed, no DB write
- Direct codebase inspection: `web/app/api/quotes/submit/route.ts` — email-only confirmed, no DB write
- Direct codebase inspection: `supabase/migrations/028_enable_org_rls.sql` — RLS pattern confirmed
- Direct codebase inspection: `web/lib/queries/admin/bookings.ts` — TanStack Query hook pattern confirmed
- Direct codebase inspection: `web/app/admin/bookings/new/page.tsx` — pre-fill target confirmed, useState form confirmed
- Direct codebase inspection: `web/app/admin/layout.tsx` — nav pattern confirmed
- Direct codebase inspection: `web/lib/organizations/org-resolver.ts` — `requireOrgId()` requires auth session confirmed
- Migration filenames: highest number is `114_site_beacons.sql` — next is `115`

### Secondary (MEDIUM confidence)
- Supabase service-role client pattern: standard pattern documented in Supabase official docs, applied to project context
- URL search params pre-fill: Next.js App Router `useSearchParams` is the standard client-side approach for this

### Tertiary (LOW confidence)
- Platform admin policies for new tables: assumed to follow same pattern as `102_platform_admin_rls_policies.sql` — not verified that a future migration doesn't handle this differently

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in codebase
- Architecture: HIGH — patterns copied directly from existing working code
- Field lists: HIGH — read directly from form components and route interfaces
- Migration convention: HIGH — file naming confirmed from `ls` of migrations directory
- Pitfalls: HIGH — identified from direct code inspection of existing auth/org patterns
- Pre-fill strategy: MEDIUM — `useSearchParams` is standard Next.js but not yet in the new booking page

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days — stable codebase, no fast-moving dependencies)
