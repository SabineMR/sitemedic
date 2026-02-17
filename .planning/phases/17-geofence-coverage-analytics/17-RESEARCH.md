# Phase 17: Geofence Coverage Analytics - Research

**Researched:** 2026-02-17
**Domain:** TanStack Query hooks, Supabase client queries, React stat card UI
**Confidence:** HIGH

---

## Summary

Phase 17 adds a single stat card to `/admin/geofences` showing "X of Y active sites have geofence coverage (Z%)". The goal is to surface the Phase 13 deferred requirement: what percentage of confirmed/upcoming bookings have at least one active geofence.

The codebase already has everything needed. The geofences page uses raw Supabase queries (not TanStack Query), and the bookings page uses TanStack Query via `useBookings()`. The simplest implementation is a new dedicated TanStack Query hook `useGeofenceCoverage()` in a new file `web/lib/queries/admin/geofences.ts`, plus a `GeofenceCoverageCard` component rendered at the top of the geofences page.

**Primary recommendation:** Create one new query file + one small card component, then migrate the geofences page's data fetching to use the new hook. No DB migrations, no RPC, no new tables needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | Already installed | Data fetching, caching, polling | Used by all admin query hooks |
| @supabase/supabase-js | Already installed | DB client | Single Supabase client pattern throughout |
| lucide-react | Already installed | Icons | Used across all admin pages |

### No new packages needed.

**Installation:** None required.

---

## Architecture Patterns

### Existing Query File Pattern

Every file in `web/lib/queries/admin/` follows this structure:

```
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';

// 1. Type definition
export interface MyType { ... }

// 2. Pure fetch function (accepts supabase + orgId)
export async function fetchMyData(
  supabase: SupabaseClient,
  orgId: string
): Promise<MyType> { ... }

// 3. useQuery hook (creates client, calls useRequireOrg, returns useQuery result)
export function useMyData() {
  const supabase = createClient();
  const orgId = useRequireOrg();
  return useQuery({
    queryKey: ['admin', 'my-data', orgId],
    queryFn: () => fetchMyData(supabase, orgId),
    refetchInterval: 60_000,
  });
}
```

Source: `web/lib/queries/admin/overview.ts`, `web/lib/queries/admin/bookings.ts`, `web/lib/queries/admin/analytics.ts`

### Recommended Project Structure

No new directories needed. Add to existing structure:

```
web/
├── lib/queries/admin/
│   ├── geofences.ts          ← NEW: coverage hook + fetch function
│   ├── bookings.ts           ← existing
│   └── overview.ts           ← existing
├── app/admin/geofences/
│   └── page.tsx              ← MODIFY: add GeofenceCoverageCard at top
```

### Pattern 1: Coverage Calculation Query

The coverage stat requires two counts:

- **Denominator** — count of bookings where `status IN ('confirmed', 'in_progress')` and `shift_date >= today` (current/upcoming active sites).
- **Numerator** — count of distinct `booking_id` values in geofences where `is_active = true` AND `booking_id IS NOT NULL` AND the booking_id is in the denominator set.

Both can be done client-side with two parallel Supabase queries (same pattern as `fetchAdminOverview` using `Promise.all`):

```typescript
// Source: web/lib/queries/admin/overview.ts (Promise.all pattern)
const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

const [bookingsResult, geofenceBookingsResult] = await Promise.all([
  // Denominator: confirmed or in_progress bookings from today forward
  supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('status', ['confirmed', 'in_progress'])
    .gte('shift_date', today),

  // Numerator: distinct booking_ids that have an active geofence
  supabase
    .from('geofences')
    .select('booking_id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .not('booking_id', 'is', null),
]);
```

The numerator is then filtered client-side to only include booking_ids that appear in the denominator set (to ensure we only count active/upcoming bookings, not past ones).

### Pattern 2: Stat Card UI

The admin dashboard uses an inline `StatCard` function component (defined in `web/app/admin/page.tsx`). For the geofences page, a local inline component or a small dedicated component is the right approach — do not extract to shared components unless reused.

The geofences page currently uses a dark card pattern:

```tsx
// Source: web/app/admin/geofences/page.tsx (existing card pattern)
<div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
  ...
</div>
```

The coverage card should match this visual language.

### Pattern 3: Integrating TanStack Query into GeofencesPage

The existing `page.tsx` uses raw `useState` + `useEffect` + direct Supabase calls. There are two options:

**Option A (minimal):** Keep the existing page structure as-is. Add the coverage card as a separate component that uses its own `useGeofenceCoverage()` hook. Zero changes to existing fetch logic.

**Option B (full migration):** Refactor the entire page to TanStack Query. This is more work and not required by the phase spec.

**Recommendation: Option A** — add coverage card as an isolated component. The phase only requires the stat card, not a refactor of the entire page's data layer.

### Anti-Patterns to Avoid

- **Making a DB view or RPC for this:** The two-query approach is fast enough and avoids DB migrations.
- **Filtering by `is_active` on geofences only:** Org-level geofences (booking_id IS NULL) should not count toward coverage of booking-linked sites.
- **Using `useRequireOrg()` directly in page.tsx:** The page already uses `useOrg()` (not `useRequireOrg()`). The new hook in `geofences.ts` will use `useRequireOrg()` per the standard pattern.

---

## Schema Facts (HIGH confidence — verified from migrations)

### `geofences` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `org_id` | UUID NOT NULL | Added in migration 026, backfilled in 027 |
| `booking_id` | UUID NULLABLE | Made nullable in migration 119 (org-level geofences) |
| `is_active` | BOOLEAN DEFAULT TRUE | Can be disabled |
| `site_name` | TEXT NULLABLE | Added in migration 119 |
| `center_latitude` | DECIMAL(10,8) | |
| `center_longitude` | DECIMAL(11,8) | |
| `radius_meters` | DECIMAL(6,2) DEFAULT 75 | 20m–1000m |
| `require_consecutive_pings` | INT DEFAULT 3 | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Key insight:** `booking_id IS NULL` = org-level geofence (not linked to a booking). These must be excluded from the coverage numerator.

### `bookings` table — status values

Constraint from migration 002:
```sql
CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'))
```

**Active/upcoming definition for coverage denominator:**
- Status: `confirmed` or `in_progress`
- Date: `shift_date >= TODAY`

Rationale: `pending` bookings are not confirmed so cannot be "covered". `completed` and `cancelled` are historical. The feature description says "confirmed bookings in current/upcoming dates."

**Date column:** `shift_date DATE` — straightforward comparison with `new Date().toISOString().split('T')[0]`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting distinct values | Custom dedup logic | Filter the JS Set client-side | Supabase returns booking_id array, use `new Set()` |
| DB aggregation | SQL view/function | Two parallel client queries | Simpler, no migration needed |
| Polling | setInterval | TanStack Query `refetchInterval: 60_000` | Auto-cleanup, dedup, error handling |
| Org scoping | Manual orgId thread | `useRequireOrg()` hook | Standard pattern, already in all admin hooks |

---

## Common Pitfalls

### Pitfall 1: Counting org-level geofences in numerator

**What goes wrong:** `SELECT DISTINCT booking_id FROM geofences WHERE is_active = true` includes NULLs if `booking_id` is nullable. `COUNT(DISTINCT booking_id)` in Postgres ignores NULLs but the Supabase client will return null rows in the array.

**How to avoid:** Filter `.not('booking_id', 'is', null)` in the Supabase query. Then apply a Set intersection on the JS side.

**Warning signs:** Numerator > denominator (coverage > 100%).

### Pitfall 2: Including past bookings in denominator

**What goes wrong:** Counting all `confirmed` bookings ever (including yesterday's completed-but-still-confirmed ones).

**How to avoid:** Add `.gte('shift_date', today)` to the bookings count query.

**Warning signs:** Denominator count far exceeds what admin sees as "active."

### Pitfall 3: Double-counting multi-geofence bookings in numerator

**What goes wrong:** A booking has 2 geofences. Counting geofence rows gives 2, not 1.

**How to avoid:** Use a JS `Set` from the returned `booking_id` array, then intersect with denominator booking IDs.

**Warning signs:** Numerator > unique booking count.

### Pitfall 4: `useRequireOrg` throws on platform_admin

**What goes wrong:** Platform admins have `orgId = null`, `useRequireOrg()` throws.

**How to avoid:** The geofences page is under `/admin/` which is org-scoped. This is consistent with all other admin query hooks that also use `useRequireOrg()`. This is acceptable and intentional — platform admins use `/platform/` routes.

---

## Code Examples

### Coverage Hook (new file: `web/lib/queries/admin/geofences.ts`)

```typescript
// Pattern source: web/lib/queries/admin/overview.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRequireOrg } from '@/contexts/org-context';

export interface GeofenceCoverage {
  covered: number;   // booking sites with at least one active geofence
  total: number;     // confirmed/in_progress bookings from today onward
  percentage: number; // 0–100, or 0 when total === 0
}

export async function fetchGeofenceCoverage(
  supabase: SupabaseClient,
  orgId: string
): Promise<GeofenceCoverage> {
  const today = new Date().toISOString().split('T')[0];

  const [bookingsResult, geofencesResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id')
      .eq('org_id', orgId)
      .in('status', ['confirmed', 'in_progress'])
      .gte('shift_date', today),

    supabase
      .from('geofences')
      .select('booking_id')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .not('booking_id', 'is', null),
  ]);

  if (bookingsResult.error) throw bookingsResult.error;
  if (geofencesResult.error) throw geofencesResult.error;

  const activeBookingIds = new Set((bookingsResult.data ?? []).map((b) => b.id));
  const coveredIds = new Set(
    (geofencesResult.data ?? [])
      .map((g) => g.booking_id as string)
      .filter((id) => activeBookingIds.has(id))
  );

  const total = activeBookingIds.size;
  const covered = coveredIds.size;
  const percentage = total === 0 ? 0 : Math.round((covered / total) * 100);

  return { covered, total, percentage };
}

export function useGeofenceCoverage() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'geofence-coverage', orgId],
    queryFn: () => fetchGeofenceCoverage(supabase, orgId),
    refetchInterval: 60_000,
  });
}
```

### Coverage Card component (inline in `page.tsx` or separate file)

```tsx
// Pattern source: web/app/admin/page.tsx StatCard + web/app/admin/geofences/page.tsx card style
import { Shield } from 'lucide-react';
import { useGeofenceCoverage } from '@/lib/queries/admin/geofences';
import { Skeleton } from '@/components/ui/skeleton';

export function GeofenceCoverageCard() {
  const { data, isLoading } = useGeofenceCoverage();

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-2xl" />;
  }

  let label: string;
  if (!data || data.total === 0) {
    label = 'No active bookings to cover';
  } else {
    label = `${data.covered} of ${data.total} active sites covered (${data.percentage}%)`;
  }

  const isFullCoverage = data && data.total > 0 && data.covered === data.total;
  const isNoCoverage = data && data.total > 0 && data.covered === 0;

  return (
    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border ${
      isFullCoverage
        ? 'bg-green-900/20 border-green-700/50'
        : isNoCoverage
        ? 'bg-red-900/20 border-red-700/50'
        : 'bg-gray-800/50 border-gray-700/50'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isFullCoverage ? 'bg-green-900/50' : isNoCoverage ? 'bg-red-900/50' : 'bg-blue-900/50'
      }`}>
        <Shield className={`w-5 h-5 ${
          isFullCoverage ? 'text-green-400' : isNoCoverage ? 'text-red-400' : 'text-blue-400'
        }`} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Geofence Coverage
        </p>
        <p className="text-white font-medium">{label}</p>
      </div>
    </div>
  );
}
```

### Placement in `page.tsx`

```tsx
// In GeofencesPage return, between the header div and the Add/Edit form:
<GeofenceCoverageCard />
```

Since the page uses `useOrg()` (not TanStack Query), wrapping `GeofenceCoverageCard` within the page is fine — it manages its own query lifecycle via `useGeofenceCoverage()`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| booking_id NOT NULL on geofences | booking_id NULLABLE | Migration 119 (Phase 13) | Must filter `.not('booking_id', 'is', null)` |
| geofences page uses raw Supabase | (unchanged, still raw) | Phase 13 | New hook is additive, no migration needed |
| org_id not on geofences | org_id NOT NULL added | Migration 026/027 | Can filter `.eq('org_id', orgId)` |

---

## Open Questions

1. **Should `in_progress` count in the denominator?**
   - What we know: The phase spec says "confirmed bookings in current/upcoming dates"
   - What's ambiguous: `in_progress` means the shift is currently running — technically it is "active" and should be covered
   - Recommendation: Include `in_progress` in the denominator. A booking mid-shift that lacks a geofence is more urgent to surface than a future one.

2. **Should the card invalidate on geofence add/delete?**
   - What we know: The spec says "60-second poll or invalidation on mutation"
   - The existing page uses `fetchGeofences()` (not TanStack Query mutations) for add/delete
   - Recommendation: Use `refetchInterval: 60_000` (simpler). If the page's mutations are ever migrated to TanStack Query, `queryClient.invalidateQueries(['admin', 'geofence-coverage', orgId])` can be added then.

---

## Sources

### Primary (HIGH confidence)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/006_medic_location_tracking.sql` — original `geofences` table schema with `is_active`, `booking_id`, `radius_meters`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/026_add_org_id_columns.sql` — `org_id` added to `geofences`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/119_geofence_schema_fix.sql` — `booking_id` made nullable, `site_name` added
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/002_business_operations.sql` — `bookings` table schema, status constraint, `shift_date DATE`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/admin/geofences/page.tsx` — current page structure
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/admin/overview.ts` — `useAdminOverview` pattern (Promise.all, refetchInterval, useRequireOrg)
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/admin/bookings.ts` — `useBookings` pattern, 60s polling
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/admin/analytics.ts` — multi-query hook pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/contexts/org-context.tsx` — `useRequireOrg()` definition
- `/Users/sabineresoagli/GitHub/sitemedic/web/hooks/useGeofenceExitMonitor.ts` — confirms `is_active` filter on geofences, `booking_id` shape

---

## Metadata

**Confidence breakdown:**
- Schema facts: HIGH — read directly from migration files
- Query pattern: HIGH — copied from 3 existing admin query files
- UI pattern: HIGH — copied from admin/page.tsx StatCard
- Edge case handling: HIGH — verified booking_id nullable from migration 119

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable schema, no fast-moving dependencies)
