# Phase 11: Organisation Settings - Research

**Researched:** 2026-02-17
**Domain:** Database-backed org configuration, Next.js API routes, Supabase RLS, client-side org context
**Confidence:** HIGH — all findings from direct source code inspection

---

## Summary

Phase 11 moves hardcoded business values (`baseRate: 42`, `DEFAULT_RADIUS: 200`, `validUrgencyPremiums = [0, 20, 50, 75]`, admin email fallback `admin@sitemedic.co.uk`) into a new `org_settings` database table, then wires the settings through the admin UI and all consuming code paths.

The codebase has clear, consistent patterns for multi-tenant DB access (`requireOrgId()` in API routes, `orgId` from `useOrg()` in client components). The migration pattern is well-established. No `org_settings` table exists yet — this phase creates it from scratch.

There is one pre-existing bug relevant to this phase: client components in `/admin` use `const { org } = useOrg()` and access `org?.id`, but the context exports `orgId` (not `org`). This means those components silently get `undefined` for org_id. Task 11-03 touches the geofences page, so it must fix this bug by switching to `const { orgId } = useOrg()`.

**Primary recommendation:** Create a single `org_settings` row per org (one-to-one with `organizations`), fetched via a `/api/admin/settings` API route on the settings page, and read at booking-creation time via the same route pattern used by other API routes.

---

## What Exists (current hardcoded state per file)

### `web/components/booking/booking-form.tsx` (line 84)
```typescript
const calculatedPricing = calculateBookingPrice({
  shiftHours: formData.shiftHours,
  baseRate: 42, // Default GBP 42/hr  <-- HARDCODED
  urgencyPremiumPercent: urgency.percent,
  travelSurcharge: 0,
});
```
- `baseRate: 42` is passed directly to `calculateBookingPrice()`.
- The `calculateBookingPrice` function itself also has `baseRate = 42` as its default parameter in `web/lib/booking/pricing.ts` (line 73).
- This is a **client component** (`'use client'`), so org_settings must reach it via a fetch or prop from a parent server component.

### `web/lib/booking/pricing.ts` (line 73)
```typescript
export function calculateBookingPrice(params: {
  shiftHours: number;
  baseRate?: number;  // Default GBP 42/hr  <-- HARDCODED DEFAULT
  ...
}): PricingBreakdown {
  const { baseRate = 42, ... } = params;
```
- The default `42` is a fallback; real usage passes explicit values.
- The urgency premium percentages `[0, 20, 50, 75]` are baked into `getUrgencyPremium()` logic in the same file (lines 44–52). These are NOT configurable via function params — they are hardcoded thresholds. Changing urgency premiums from org_settings would require `getUrgencyPremium()` to accept an optional premiums array.

### `web/app/admin/geofences/page.tsx` (line 27)
```typescript
const DEFAULT_RADIUS = 200;
// used in:
radius_metres: String(DEFAULT_RADIUS),  // form initial state (line 40)
setForm({ ..., radius_metres: String(DEFAULT_RADIUS) });  // resetForm (line 65)
```
- Two uses of `DEFAULT_RADIUS`: form init and form reset.
- **Bug in this file**: uses `const { org } = useOrg()` and `org?.id`. The org context does NOT export `org` — it exports `orgId`. This means `org` is always `undefined`, so `fetchGeofences()` guard `if (!org?.id) return;` prevents any data loading. Must fix to `const { orgId } = useOrg()`.

### `web/app/api/bookings/create/route.ts` (line 111)
```typescript
const validUrgencyPremiums = [0, 20, 50, 75];
if (!validUrgencyPremiums.includes(body.pricing.urgencyPremiumPercent)) { ... }
```
- Server-side validation for urgency premium. Hardcoded array.

### `web/app/api/bookings/create-payment-intent/route.ts` (line 74)
```typescript
const validUrgencyPremiums = [0, 20, 50, 75];
if (!validUrgencyPremiums.includes(body.pricing.urgencyPremiumPercent)) { ... }
```
- **ADDITIONAL LOCATION not in the CONTEXT.md task breakdown.** This route also has the hardcoded validation. Task 11-03 must fix this file too.

### `supabase/functions/calculate-pricing/index.ts` (line 120)
```typescript
const validUrgencyPremiums = [0, 20, 50, 75];
if (!validUrgencyPremiums.includes(urgency_premium_percent)) { ... }
```
- Edge Function also hardcodes urgency premiums. This is a Deno function and CANNOT read from Supabase DB in the same way (it is a pure calculation function by design — see its header: "NO DATABASE OPERATIONS"). Decision needed: either accept that urgency premiums in the Edge Function remain hardcoded, or pass them in the request body. The simplest approach is to pass `valid_urgency_premiums` from the API route caller after reading org_settings.

### Admin email fallback locations
```
supabase/functions/cash-flow-monitor/index.ts:19
  const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@sitemedic.co.uk';

web/app/api/contact/submit/route.ts:66
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sitemedic.co.uk';

web/app/api/quotes/submit/route.ts:90
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sitemedic.co.uk';

supabase/functions/friday-payout/index.ts:378
  const adminEmail = orgAdmins?.email || 'admin@sitemedic.co.uk';
```
- The web API routes already read from `process.env.ADMIN_EMAIL` with a fallback. Wiring to `org_settings.admin_email` means the API routes fetch the org's admin email from the DB instead of the env var.
- The Edge Functions (cash-flow-monitor, friday-payout) are a separate concern and harder to wire to per-org settings — they are currently global. Scope to API routes only in Phase 11 is pragmatic.

---

## Migration Pattern

The most recent migrations (115, 116, 117) establish the clear pattern:

```sql
-- Header comment with number and purpose
-- Created: YYYY-MM-DD

-- Section: CREATE TABLE (for new tables)
CREATE TABLE org_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  ...
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE org_settings IS '...';
COMMENT ON COLUMN org_settings.base_rate IS '...';

-- Section: Indexes
CREATE INDEX idx_org_settings_org ON org_settings (org_id);

-- Section: Seed existing orgs with defaults
INSERT INTO org_settings (org_id, base_rate, geofence_default_radius, urgency_premiums, ...)
SELECT id, 42.00, 200, '[0,20,50,75]'::jsonb, ...
FROM organizations
ON CONFLICT (org_id) DO NOTHING;

-- Section: RLS
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view their own settings"
  ON org_settings FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Org admins can update their own settings"
  ON org_settings FOR UPDATE
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Platform admins can view all settings"
  ON org_settings FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all settings"
  ON org_settings FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
```

**Key conventions observed:**
- `uuid_generate_v4()` for UUID primary keys (not `gen_random_uuid()` — organizations uses gen_random_uuid but 117 uses uuid_generate_v4; use uuid_generate_v4 to match more recent migrations)
- `ON DELETE CASCADE` for org_id FK
- `UNIQUE` on org_id (one settings row per org)
- Seed existing orgs with current hardcoded defaults to avoid breaking existing orgs
- `get_user_org_id()` and `is_platform_admin()` SQL functions already exist and are used for RLS policies
- No `moddatetime` triggers — updated_at is managed manually (per migration 117's note)
- Summary comment block at the bottom of the migration
- Next migration number: **118** (117 is the current highest)

---

## Org ID Flow

### Server-side API routes
```typescript
// Pattern used in EVERY API route in this codebase:
import { requireOrgId } from '@/lib/organizations/org-resolver';

export async function POST(request: NextRequest) {
  const orgId = await requireOrgId(); // Throws 401-worthy error if not authenticated

  // Then query org_settings:
  const { data: settings } = await supabase
    .from('org_settings')
    .select('base_rate, geofence_default_radius, urgency_premiums, admin_email')
    .eq('org_id', orgId)
    .single();
}
```
- `requireOrgId()` reads from JWT `app_metadata.org_id` — no extra DB query.
- RLS on `org_settings` ensures users can only read their own row.

### Client components
The org context (`web/contexts/org-context.tsx`) exports:
```typescript
interface OrgContextValue {
  orgId: string | null;      // Use THIS — not org.id
  orgSlug: string | null;
  orgName: string | null;
  role: UserRole | null;
  loading: boolean;
  error: Error | null;
}
```

**CRITICAL BUG**: Many admin pages (including `geofences/page.tsx`) destructure `{ org }` from `useOrg()` but the context does NOT have an `org` property. It has `orgId`. Any code using `org?.id` gets `undefined`. The correct pattern is:
```typescript
// CORRECT:
const { orgId } = useOrg();

// BROKEN (existing bug in many admin pages):
const { org } = useOrg();  // org is undefined!
```

For Phase 11 client components (settings page, geofences page fix), always use `const { orgId } = useOrg()`.

### Fetching org_settings in client components
Client components cannot call `requireOrgId()` (server-only). Options:
1. **API route fetch** (recommended): Create `GET /api/admin/settings` that returns org_settings. Client components fetch this on mount.
2. **Direct Supabase client query**: Client can query `org_settings` with Supabase client — RLS will filter by the current user's org automatically.

Pattern from `geofences/page.tsx` (direct client query pattern):
```typescript
const supabase = createClient();
const { data } = await supabase
  .from('org_settings')
  .select('*')
  .single(); // Only one row per org; RLS filters by org automatically
```

---

## All Hardcoded Locations Found

| Location | Value | Type | Scope |
|----------|-------|------|-------|
| `web/components/booking/booking-form.tsx:84` | `baseRate: 42` | base rate | Client component |
| `web/lib/booking/pricing.ts:73` | `baseRate = 42` | default param | Shared utility |
| `web/lib/booking/pricing.ts:44-52` | urgency thresholds `[0, 20, 50, 75]` | logic | Shared utility |
| `web/app/api/bookings/create/route.ts:111` | `validUrgencyPremiums = [0, 20, 50, 75]` | validation | API route |
| `web/app/api/bookings/create-payment-intent/route.ts:74` | `validUrgencyPremiums = [0, 20, 50, 75]` | validation | API route (MISSING FROM CONTEXT.MD) |
| `supabase/functions/calculate-pricing/index.ts:120` | `validUrgencyPremiums = [0, 20, 50, 75]` | validation | Edge Function |
| `web/app/admin/geofences/page.tsx:27` | `DEFAULT_RADIUS = 200` | geofence default | Client component |
| `web/app/api/contact/submit/route.ts:66` | `'admin@sitemedic.co.uk'` | fallback email | API route |
| `web/app/api/quotes/submit/route.ts:90` | `'admin@sitemedic.co.uk'` | fallback email | API route |
| `supabase/functions/cash-flow-monitor/index.ts:19` | `'admin@sitemedic.co.uk'` | fallback email | Edge Function (out of scope for Phase 11) |
| `supabase/functions/friday-payout/index.ts:378` | `'admin@sitemedic.co.uk'` | fallback email | Edge Function (out of scope for Phase 11) |

**In-scope for Phase 11 (web only, not Edge Functions):**
- `booking-form.tsx` — base rate
- `pricing.ts` — base rate default
- `bookings/create/route.ts` — urgency premium validation
- `bookings/create-payment-intent/route.ts` — urgency premium validation (extra location)
- `geofences/page.tsx` — default radius
- `contact/submit/route.ts` — admin email
- `quotes/submit/route.ts` — admin email

**Explicitly OUT of scope (Edge Functions require separate deployment):**
- `calculate-pricing/index.ts` — pure calc function, stateless by design
- `cash-flow-monitor/index.ts` — global, not org-specific in Phase 11
- `friday-payout/index.ts` — already queries org admin email from DB as first choice

---

## Settings Page Current State

File: `web/app/admin/settings/page.tsx`

**What exists:**
- `'use client'` page
- Uses `const { org } = useOrg()` (has the broken `org` bug — `org` is `undefined`)
- Displays read-only org name and org ID (static, from JWT)
- Shows hardcoded UI sections: Notifications (fake toggles), Contact Details (no save logic), Billing & Subscription (static), Security (static)
- Contact Details section has "Billing Email" and "Emergency Contact" inputs with a "Save Changes" button — but the button has no `onClick` handler; it does nothing.
- No form state management (`useState`) — the contact detail inputs are uncontrolled with no save logic.
- No connection to any database table.

**What Phase 11 adds:**
A new "Business Configuration" section with live-reading forms for:
- Base rate (£ per hour, number input, must be > 0)
- Geofence default radius (metres, number input, 50–5000)
- Urgency premiums (JSONB array, editable as comma-separated values or multi-value input)
- Admin email (email input)
- Net30 eligible (toggle)
- Default credit limit (£, number input)

The existing page is `'use client'`. The new business config section should fetch from `org_settings` via the Supabase client (using RLS) and submit changes via an API route or direct Supabase update.

---

## Architecture Patterns

### Recommended Project Structure for New Files

```
web/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── settings/
│   │           └── route.ts          # GET + PUT /api/admin/settings
│   └── admin/
│       └── settings/
│           └── page.tsx              # Extend with Business Config section
supabase/
└── migrations/
    └── 118_org_settings.sql          # New table + seed + RLS
```

### Pattern 1: One-Row-Per-Org Settings Table
**What:** `org_settings` has UNIQUE on `org_id`. Every org has exactly one settings row.
**When to use:** When settings are org-level singletons (not per-user or per-resource).
**Query:**
```typescript
// Server-side (API route)
const { data: settings } = await supabase
  .from('org_settings')
  .select('base_rate, geofence_default_radius, urgency_premiums, admin_email')
  .eq('org_id', orgId)
  .single(); // safe because UNIQUE constraint guarantees at most one row

// Client-side (RLS filters automatically)
const { data: settings } = await supabase
  .from('org_settings')
  .select('*')
  .single();
```

### Pattern 2: API Route for Settings CRUD
```typescript
// GET /api/admin/settings — fetch current settings
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const orgId = await requireOrgId();

  const { data, error } = await supabase
    .from('org_settings')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error) return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
  return NextResponse.json(data);
}

// PUT /api/admin/settings — update settings
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const orgId = await requireOrgId();
  const body = await request.json();

  // Validate
  if (body.base_rate <= 0) return NextResponse.json({ error: 'base_rate must be > 0' }, { status: 400 });
  if (body.geofence_default_radius < 50 || body.geofence_default_radius > 5000) {
    return NextResponse.json({ error: 'radius must be 50–5000' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('org_settings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  return NextResponse.json(data);
}
```

### Pattern 3: Wiring Base Rate into Booking Flow
The `booking-form.tsx` is a client component. Two approaches:

**Option A (recommended): Fetch org settings at mount**
```typescript
// In booking-form.tsx
const { orgId } = useOrg();
const [baseRate, setBaseRate] = useState<number>(42); // fallback

useEffect(() => {
  if (!orgId) return;
  const supabase = createClient();
  supabase
    .from('org_settings')
    .select('base_rate')
    .single()
    .then(({ data }) => {
      if (data?.base_rate) setBaseRate(data.base_rate);
    });
}, [orgId]);
```

**Option B: Pass baseRate as prop from server component**
```typescript
// In book/page.tsx (server component)
const orgId = await getCurrentOrgId();
const { data: settings } = await supabase.from('org_settings')...;
return <BookPageClient baseRate={settings?.base_rate ?? 42} />;
```

Option B is cleaner because the settings are fetched once on the server and passed down. However, `book/page.tsx` is currently a minimal server component and `BookPageClient` is the client entry. Prop-passing is the correct architectural choice here.

### Pattern 4: Urgency Premium Validation
The two API routes (`create/route.ts` and `create-payment-intent/route.ts`) need to read `urgency_premiums` from `org_settings` before validating:

```typescript
// Fetch org settings for validation
const { data: settings } = await supabase
  .from('org_settings')
  .select('urgency_premiums, base_rate')
  .eq('org_id', orgId)
  .single();

const validUrgencyPremiums: number[] = settings?.urgency_premiums ?? [0, 20, 50, 75];
if (!validUrgencyPremiums.includes(body.pricing.urgencyPremiumPercent)) {
  return NextResponse.json({ error: 'Invalid urgency premium percent' }, { status: 400 });
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings form validation | Custom validation | Inline checks + existing pattern | Simple field validation, no external library needed |
| Row-level security | Custom middleware | Supabase RLS + `get_user_org_id()` | Already established in all existing migrations |
| Org ID resolution | Custom JWT parsing | `requireOrgId()` / `useOrg()` | Already exists, battle-tested |
| Toast notifications | Custom alerts | `sonner` (already used in geofences, booking pages) | Already imported across admin pages |
| JSONB array editing | Custom JSON editor | Simple comma-separated text input → `JSON.parse` | Urgency premiums is just `[0, 20, 50, 75]` |

---

## Common Pitfalls

### Pitfall 1: Using `org?.id` Instead of `orgId` in Client Components
**What goes wrong:** The `useOrg()` hook returns `{ orgId, orgSlug, orgName, ... }` — NOT `{ org }`. Code that writes `const { org } = useOrg()` gets `undefined`. Any guard like `if (!org?.id) return;` silently prevents data loading.
**Why it happens:** The context was written with flat properties, but some pages were written assuming an `org` object.
**How to avoid:** Always destructure `orgId` from `useOrg()`. Fix the geofences page (touched in task 11-03) to use `orgId`.
**Warning signs:** Page loads but shows empty state / spinner forever.

### Pitfall 2: Forgetting the Second Urgency Premium Route
**What goes wrong:** Only `create/route.ts` is updated; `create-payment-intent/route.ts` retains the hardcoded `[0, 20, 50, 75]` and rejects valid premiums from a custom org config.
**Why it happens:** CONTEXT.md only listed 3 hardcoded locations; the fourth (`create-payment-intent`) was discovered during research.
**How to avoid:** Task 11-03 must explicitly list both API routes as files to update.

### Pitfall 3: Not Seeding Existing Orgs
**What goes wrong:** Migration creates `org_settings` table but doesn't insert rows for existing orgs. API calls to `org_settings.select().single()` return null → code falls back to hardcoded values (acceptable) or throws (bad).
**How to avoid:** Migration 118 must include `INSERT INTO org_settings (org_id, base_rate, ...) SELECT id, 42, 200, ... FROM organizations ON CONFLICT (org_id) DO NOTHING`.

### Pitfall 4: Urgency Premiums JSONB Shape
**What goes wrong:** Storing urgency premiums as `JSONB` — TypeScript and the client need to handle JSON parsing. If stored as `[0, 20, 50, 75]` (JSONB array of numbers), the Supabase JS client returns it as a JavaScript array already (no manual JSON.parse needed).
**How to avoid:** Declare column as `JSONB DEFAULT '[0, 20, 50, 75]'::jsonb`. The Supabase client deserializes JSONB automatically. Cast appropriately in TypeScript: `urgency_premiums: number[]`.

### Pitfall 5: `pricing.ts` getUrgencyPremium Is Not Parameterized
**What goes wrong:** `getUrgencyPremium(shiftDate)` has the premium PERCENTAGES (0, 20, 50, 75) baked into its if/else logic as hardcoded return values. The `urgency_premiums` JSONB stores these values, but `getUrgencyPremium()` doesn't read them.
**Impact:** Org settings can store custom urgency premiums, but `getUrgencyPremium()` will continue returning the hardcoded values for the client-side display. The server-side validation uses the DB values — so display and validation could diverge.
**Decision required by planner:** Phase 11 scope — does `getUrgencyPremium()` stay hardcoded (acceptable for v1, display only), or is it refactored to accept premiums array? Recommend keeping it hardcoded for Phase 11 (validation moved to org_settings is the priority; display premiums can stay standard). Document this as a known limitation.

### Pitfall 6: Edge Function Urgency Premium Validation
**What goes wrong:** `supabase/functions/calculate-pricing/index.ts` is a pure function that validates `urgency_premium_percent` against `[0, 20, 50, 75]`. It has no DB access by design. If org_settings allows custom premiums, a custom value would fail Edge Function validation.
**How to avoid:** For Phase 11, the `calculate-pricing` Edge Function is NOT called by the booking creation routes (those routes use client-passed pricing and validate in-route). The Edge Function is a standalone calculator. Leave it as-is; it's not in the critical path.

---

## Recommended Approach

### Task 11-01: Migration 118
File: `supabase/migrations/118_org_settings.sql`

```sql
CREATE TABLE org_settings (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  base_rate               DECIMAL(10,2) NOT NULL DEFAULT 42.00
                          CHECK (base_rate > 0),
  geofence_default_radius INTEGER     NOT NULL DEFAULT 200
                          CHECK (geofence_default_radius BETWEEN 50 AND 5000),
  urgency_premiums        JSONB       NOT NULL DEFAULT '[0, 20, 50, 75]'::jsonb,
  admin_email             TEXT,
  net30_eligible          BOOLEAN     NOT NULL DEFAULT TRUE,
  credit_limit            DECIMAL(10,2) NOT NULL DEFAULT 5000.00
                          CHECK (credit_limit >= 0),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE org_settings IS 'Per-organisation business configuration. One row per org. Replaces hardcoded values in source code.';

CREATE INDEX idx_org_settings_org ON org_settings (org_id);

-- Seed all existing orgs with current hardcoded defaults
INSERT INTO org_settings (org_id, base_rate, geofence_default_radius, urgency_premiums, admin_email, net30_eligible, credit_limit)
SELECT
  id,
  42.00,
  200,
  '[0, 20, 50, 75]'::jsonb,
  NULL,
  TRUE,
  5000.00
FROM organizations
ON CONFLICT (org_id) DO NOTHING;

-- RLS
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
-- [policies using get_user_org_id() and is_platform_admin()]
```

### Task 11-02: Admin Settings Page
- Add "Business Configuration" section to `web/app/admin/settings/page.tsx`
- Fix existing `const { org } = useOrg()` → `const { orgId } = useOrg()`
- Fetch `org_settings` via direct Supabase client query (RLS handles filtering)
- Form fields: base_rate (number), geofence_default_radius (number, 50–5000), urgency_premiums (comma-separated, validated as number array), admin_email (email), net30_eligible (toggle), credit_limit (number)
- Create `GET /api/admin/settings` and `PUT /api/admin/settings` routes
- Use `sonner` toast for save success/error (matches geofences pattern)
- Validation: base_rate > 0, geofence_default_radius 50–5000, at least one urgency premium, urgency premiums must be non-negative integers

### Task 11-03: Wire Consumers to Org Settings
Files to update:
1. `web/components/booking/booking-form.tsx` — fetch `base_rate` from org_settings on mount
2. `web/lib/booking/pricing.ts` — change default `baseRate = 42` to `baseRate = 42` (keep as fallback, document it)
3. `web/app/api/bookings/create/route.ts` — fetch `urgency_premiums` from org_settings for validation
4. `web/app/api/bookings/create-payment-intent/route.ts` — same as above (THIS IS THE EXTRA FILE)
5. `web/app/admin/geofences/page.tsx` — fetch `geofence_default_radius`, fix `org?.id` → `orgId` bug
6. `web/app/api/contact/submit/route.ts` — read `admin_email` from org_settings, fall back to `process.env.ADMIN_EMAIL`
7. `web/app/api/quotes/submit/route.ts` — same as above

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `web/components/booking/booking-form.tsx` — verified hardcoded `baseRate: 42` at line 84
- `web/app/admin/geofences/page.tsx` — verified `DEFAULT_RADIUS = 200` at lines 27/40/65; verified `org` bug
- `web/app/api/bookings/create/route.ts` — verified `validUrgencyPremiums = [0, 20, 50, 75]` at line 111
- `web/app/api/bookings/create-payment-intent/route.ts` — verified same at line 74 (ADDITIONAL LOCATION)
- `supabase/functions/calculate-pricing/index.ts` — verified same at line 120; pure function, no DB access
- `web/lib/booking/pricing.ts` — verified `baseRate = 42` default, urgency logic
- `web/app/admin/settings/page.tsx` — read full current state; no DB connection, no save logic
- `web/contexts/org-context.tsx` — verified exports `orgId` not `org`; identified `org` destructuring bug
- `web/lib/organizations/org-resolver.ts` — verified `requireOrgId()` pattern for API routes
- `supabase/migrations/115_referral_and_per_medic_rates.sql` — migration pattern reference
- `supabase/migrations/117_lead_capture_tables.sql` — most recent migration, RLS pattern reference
- `supabase/migrations/00001_organizations.sql` — organizations table structure
- `supabase/migrations/002_business_operations.sql` — `credit_limit` already exists on `clients` table (per-client)

### Secondary (MEDIUM confidence — filesystem enumeration)
- Migration filename scan confirmed next migration number is 118
- Grep confirmed `org_settings` does not exist anywhere in migrations yet
- Admin email fallback pattern confirmed in 4 locations across web routes and Edge Functions

---

## Metadata

**Confidence breakdown:**
- Hardcoded locations: HIGH — grep-verified across entire codebase
- Migration pattern: HIGH — read 3 recent migrations directly
- Org ID flow: HIGH — read context file and resolver directly
- Settings page current state: HIGH — read full file
- `org` bug: HIGH — verified context exports vs usage
- Edge Function scope: HIGH — read Edge Function directly; confirmed pure calc, no DB
- Admin email scope: HIGH — found all 4 locations

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase, 30 days)
