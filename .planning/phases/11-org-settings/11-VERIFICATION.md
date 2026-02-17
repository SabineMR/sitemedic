---
status: passed
phase: 11
verified: 2026-02-17T00:00:00Z
score: 10/10
---

# Phase 11 Verification

**Phase Goal:** Replace all hardcoded business configuration values with per-organisation settings stored in the database. Admins must be able to change base rate, geofence radius, urgency premiums, and admin email via `/admin/settings` without a code deployment.

**Verified:** 2026-02-17
**Status:** passed
**Re-verification:** No — initial verification

---

## Must-Have Checklist

- [x] **1. Migration 118 exists** — `/supabase/migrations/118_org_settings.sql` (164 lines). Creates `org_settings` table with columns: `base_rate`, `geofence_default_radius`, `urgency_premiums`, `admin_email`, `net30_eligible`, `credit_limit`. DB constraints enforce `base_rate > 0` and `geofence_default_radius BETWEEN 50 AND 5000`. RLS policies present for org users (SELECT) and platform admins (full CRUD). Seed backfills existing orgs with v1.0 defaults.

- [x] **2. Admin settings API route with GET and PUT** — `/web/app/api/admin/settings/route.ts` (147 lines). GET fetches from `org_settings` scoped by `requireOrgId()`. PUT validates: `base_rate > 0`, `geofence_default_radius` integer 50–5000, `urgency_premiums` non-empty array of non-negative numbers, `admin_email` contains `@`, `credit_limit >= 0`. Returns updated row on success.

- [x] **3. Settings page has Business Configuration section** — `/web/app/admin/settings/page.tsx` (435 lines). `useEffect` fetches `/api/admin/settings` on mount. Business Configuration section renders inputs for: base rate, geofence radius, urgency premiums (comma-separated), admin email, credit limit, and net30 toggle. Client-side validation mirrors server-side rules before calling PUT. Save button shows loading state.

- [x] **4. Booking form uses dynamic base_rate from org_settings** — `/web/components/booking/booking-form.tsx`. State initialized with `useState<number>(42)` as a transient JS default. A `useEffect` immediately fetches `base_rate` from `org_settings` and calls `setBaseRate(Number(data.base_rate))`. The rate is passed to pricing calculations. No permanent hardcoded value — the fetch overrides it on mount.

- [x] **5. Both booking API routes validate urgency from org_settings (not hardcoded)** — `/web/app/api/bookings/create/route.ts` and `/web/app/api/bookings/create-payment-intent/route.ts` both query `org_settings` for `urgency_premiums` and store in `validUrgencyPremiums`. Validation uses the DB value with `[0, 20, 50, 75]` only as a code-level fallback if no org row exists, not as a hardcoded override.

- [x] **6. Geofences page uses dynamic default radius and orgId bug fixed** — `/web/app/admin/geofences/page.tsx`. Uses `const { orgId } = useOrg()` directly (no `org?.id` pattern). A separate `useEffect` fetches `geofence_default_radius` from `org_settings` and updates both `defaultRadius` state and the form's `radius_metres` field. All DB operations use `orgId` directly.

- [x] **7. Contact and quotes routes read admin_email from org_settings** — `/web/app/api/contact/submit/route.ts` and `/web/app/api/quotes/submit/route.ts` both fetch `admin_email` from `org_settings` after the DB insert, falling back to `process.env.ADMIN_EMAIL || 'admin@sitemedic.co.uk'` only when no org settings row exists.

- [x] **8. No remaining `baseRate: 42` literal in booking-form.tsx** — Confirmed absent. The value 42 appears only as the `useState(42)` initial value (transient default before async fetch), not as a static pricing literal.

- [x] **9. No remaining `DEFAULT_RADIUS = 200` constant in geofences/page.tsx** — Confirmed absent. The named constant is gone. `useState(200)` serves as a JS initialization default before the org_settings fetch resolves, which is the expected async pattern.

- [x] **10. No remaining `validUrgencyPremiums = [0, 20, 50, 75]` in create/route.ts or create-payment-intent/route.ts** — Confirmed absent from both files. The variable is now dynamically populated from `org_settings` before being used in validation.

---

## Score: 10/10

---

## Observable Truths Verification

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin changes base rate from £42 to £45 — new bookings use £45 | VERIFIED | Settings page PUT updates org_settings; booking-form.tsx fetches base_rate on mount and uses it in pricing |
| 2 | Geofence "Add" pre-fills radius with org's configured default | VERIFIED | geofences/page.tsx useEffect fetches geofence_default_radius and sets form.radius_metres |
| 3 | Settings page validates: base rate > 0, radius 50–5000m | VERIFIED | Client-side in handleSaveSettings + server-side in PUT handler both enforce these rules |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `settings/page.tsx` | `/api/admin/settings` | `fetch` in useEffect + handleSaveSettings | WIRED |
| `/api/admin/settings` GET | `org_settings` table | `supabase.from('org_settings').select('*').eq('org_id', orgId).single()` | WIRED |
| `/api/admin/settings` PUT | `org_settings` table | `supabase.from('org_settings').update(payload).eq('org_id', orgId)` | WIRED |
| `booking-form.tsx` | `org_settings` | `supabase.from('org_settings').select('base_rate').single()` in useEffect | WIRED |
| `create/route.ts` | `org_settings` | `supabase.from('org_settings').select('urgency_premiums').eq('org_id', orgId)` | WIRED |
| `create-payment-intent/route.ts` | `org_settings` | `supabase.from('org_settings').select('urgency_premiums').eq('org_id', orgId)` | WIRED |
| `geofences/page.tsx` | `org_settings` | `supabase.from('org_settings').select('geofence_default_radius').single()` in useEffect | WIRED |
| `contact/submit/route.ts` | `org_settings` | `supabase.from('org_settings').select('admin_email').eq('org_id', orgId).single()` | WIRED |
| `quotes/submit/route.ts` | `org_settings` | `supabase.from('org_settings').select('admin_email').eq('org_id', orgId).single()` | WIRED |

---

## Anti-Patterns

No blockers found. The `useState(42)` and `useState(200)` patterns are expected transient JS defaults for async data, not hardcoded business values. Both are immediately overridden by the org_settings fetch on mount.

---

## Human Verification Items

The following items cannot be verified programmatically and require manual testing in a running environment:

### 1. End-to-End Rate Change Flow

**Test:** In `/admin/settings`, change base rate from £42 to £45, click Save Configuration, then create a new booking.
**Expected:** Pricing breakdown shows calculation based on £45/hr, not £42/hr.
**Why human:** Requires live Supabase connection and UI interaction to confirm the fetch-and-use chain works at runtime.

### 2. Geofence Radius Pre-fill

**Test:** Change geofence_default_radius to 500m in settings. Navigate to `/admin/geofences`, click Add.
**Expected:** Radius field pre-fills with 500, not 200.
**Why human:** Requires live Supabase connection and page navigation to verify the async pre-fill.

### 3. Admin Email Routing

**Test:** Set admin_email in settings. Submit a contact form or quote request.
**Expected:** Admin notification email arrives at the org_settings address, not the env var default.
**Why human:** Requires email send to verify routing. Cannot be confirmed from code alone.

---

_Verified: 2026-02-17_
_Verifier: Claude (gsd-verifier)_
