---
phase: 06-riddor-auto-flagging
plan: 08
subsystem: web-dashboard-auth
completed: 2026-02-16
duration: 2 min
tags: [auth, org-context, riddor, react, tanstack-query]

requires:
  - "06-04: RIDDOR list page with hardcoded org_id"
  - "06-06: RIDDOR analytics page with hardcoded org_id"
  - "06.5-10: OrgProvider mounted in app layout"

provides:
  - key: "riddor-dashboard-auth"
    artifact: "RIDDOR pages with dynamic org_id from auth context"
    status: "complete"
    verification: "Zero hardcoded org_id values remain in RIDDOR directory"

affects:
  - future: "All dashboard pages that fetch org-specific data"
    why: "Establishes pattern for using useOrg() hook instead of hardcoded org_id"

tech-stack:
  added: []
  patterns:
    - "OrgContext pattern: useOrg() hook for client components"
    - "TanStack Query enabled guards: prevent queries with null org"
    - "Loading state sequence: org context → data query → render"

key-files:
  created: []
  modified:
    - path: "web/app/(dashboard)/riddor/page.tsx"
      changes: "Replace hardcoded org_id with useOrg() hook, add loading/missing-org states"
      lines: 11
    - path: "web/app/(dashboard)/riddor/analytics/page.tsx"
      changes: "Replace both hardcoded org_id values with useOrg() hook, add loading/missing-org states"
      lines: 15

decisions: []
---

# Phase [6] Plan [8]: RIDDOR Dashboard Auth Integration Summary

Replace hardcoded demo org_id with dynamic auth context using useOrg() hook from OrgProvider in both RIDDOR dashboard pages.

## Objective

The RIDDOR list page and analytics page both used a hardcoded `orgId = '10000000-0000-0000-0000-000000000001'` instead of the authenticated user's organization. This meant in production, these pages would either show the wrong org's data or no data at all. The fix uses the existing `useOrg()` hook from `@/contexts/org-context` (already mounted via `OrgProvider` in `web/app/layout.tsx`) to get the real org_id from the user's JWT app_metadata.

**Problem:** Demo data visible to wrong organizations, hardcoded UUIDs in production code
**Solution:** Replace with dynamic org context from authenticated user's JWT
**Impact:** RIDDOR pages now show only the user's organization data

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Replace hardcoded org_id in RIDDOR list page | 9c3902b | web/app/(dashboard)/riddor/page.tsx |
| 2 | Replace hardcoded org_id in RIDDOR analytics page | 4c39244 | web/app/(dashboard)/riddor/analytics/page.tsx |

**Total:** 2/2 tasks completed

## Technical Implementation

### Pattern: OrgContext Integration

Both pages follow identical auth integration pattern:

1. **Import useOrg hook:**
   ```tsx
   import { useOrg } from '@/contexts/org-context';
   ```

2. **Extract org context:**
   ```tsx
   const { orgId, loading: orgLoading } = useOrg();
   ```

3. **Update TanStack Query hooks:**
   ```tsx
   const { data, isLoading } = useQuery({
     queryKey: ['query-name', orgId],  // Include orgId in cache key
     queryFn: async () => fetchData(orgId!),
     enabled: !!orgId,  // Prevent query with null org
     refetchInterval: 60000,
   });
   ```

4. **Add loading/error states:**
   ```tsx
   if (orgLoading) {
     return <div>Loading...</div>;
   }

   if (!orgId) {
     return <div>No organization assigned</div>;
   }
   ```

### RIDDOR List Page Changes

**File:** `web/app/(dashboard)/riddor/page.tsx`

**Before:**
```tsx
const { data: incidents = [], isLoading } = useQuery({
  queryKey: ['riddor-incidents', statusFilter],
  queryFn: async () => {
    const orgId = '10000000-0000-0000-0000-000000000001';  // Hardcoded
    return fetchRIDDORIncidents(orgId, statusFilter === 'all' ? undefined : statusFilter);
  },
  refetchInterval: 60000,
});
```

**After:**
```tsx
const { orgId, loading: orgLoading } = useOrg();

const { data: incidents = [], isLoading } = useQuery({
  queryKey: ['riddor-incidents', orgId, statusFilter],
  queryFn: async () => {
    return fetchRIDDORIncidents(orgId!, statusFilter === 'all' ? undefined : statusFilter);
  },
  enabled: !!orgId,  // Guard added
  refetchInterval: 60000,
});
```

### RIDDOR Analytics Page Changes

**File:** `web/app/(dashboard)/riddor/analytics/page.tsx`

**Before:**
```tsx
// Stats query
const { data: stats, isLoading: statsLoading } = useQuery({
  queryKey: ['riddor-override-stats'],
  queryFn: async () => {
    const orgId = '10000000-0000-0000-0000-000000000001';  // Hardcoded
    return fetchOverrideStats(orgId);
  },
  refetchInterval: 300000,
});

// Reasons query
const { data: reasons = [], isLoading: reasonsLoading } = useQuery({
  queryKey: ['riddor-override-reasons'],
  queryFn: async () => {
    const orgId = '10000000-0000-0000-0000-000000000001';  // Hardcoded
    return fetchOverrideReasons(orgId);
  },
  refetchInterval: 300000,
});
```

**After:**
```tsx
const { orgId, loading: orgLoading } = useOrg();

// Stats query
const { data: stats, isLoading: statsLoading } = useQuery({
  queryKey: ['riddor-override-stats', orgId],
  queryFn: async () => {
    return fetchOverrideStats(orgId!);
  },
  enabled: !!orgId,  // Guard added
  refetchInterval: 300000,
});

// Reasons query
const { data: reasons = [], isLoading: reasonsLoading } = useQuery({
  queryKey: ['riddor-override-reasons', orgId],
  queryFn: async () => {
    return fetchOverrideReasons(orgId!);
  },
  enabled: !!orgId,  // Guard added
  refetchInterval: 300000,
});
```

## Verification Results

✅ **All verification checks passed:**

1. Zero occurrences of hardcoded UUID '10000000' in RIDDOR directory
2. Both files import useOrg from org-context
3. All 3 TanStack Query hooks have `enabled: !!orgId` guard
4. Both pages handle loading and missing-org states gracefully
5. TypeScript compilation passes (no errors in RIDDOR files)

**Command outputs:**
```bash
$ grep -r '10000000' web/app/(dashboard)/riddor/
# (no output - zero occurrences)

$ grep -c 'enabled.*orgId' web/app/(dashboard)/riddor/analytics/page.tsx
2  # Both queries have guards

$ npx tsc --noEmit | grep 'riddor'
# (no output - zero TypeScript errors in RIDDOR files)
```

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Notes

### Why `enabled: !!orgId` is Critical

Without the enabled guard, TanStack Query would attempt to fetch data immediately on mount, before the OrgProvider has loaded the user's org_id. This would result in:

1. Query function called with `null` or `undefined` orgId
2. Database query with invalid UUID → error or empty results
3. Poor UX (flash of error state before org loads)

The `enabled: !!orgId` guard prevents the query from running until org context is ready.

### QueryKey Cache Invalidation

Including `orgId` in the queryKey ensures proper cache isolation:

```tsx
queryKey: ['riddor-incidents', orgId, statusFilter]
```

If user switches organizations (unlikely but possible), TanStack Query will treat it as a different cache entry and refetch data for the new org. Without orgId in the key, stale data from previous org would display.

### Loading State Sequence

The component renders in this sequence:

1. **Initial mount:** `orgLoading: true` → Shows "Loading..."
2. **Org loaded:** `orgId` available → Query enabled, fetches data
3. **Data loading:** `isLoading: true` → Shows "Loading incidents..."
4. **Data ready:** Render full UI with incidents

If org is missing (user has no org_id in JWT):
1. **Initial mount:** `orgLoading: true` → Shows "Loading..."
2. **Org loaded:** `orgId: null` → Shows "No organization assigned"
3. Query never runs (enabled guard prevents it)

### Non-null Assertion Justification

The `orgId!` non-null assertion in queryFn is safe because:

1. `enabled: !!orgId` ensures queryFn never runs with null orgId
2. TypeScript doesn't understand enabled guards (it's runtime logic)
3. The assertion tells TypeScript what we know from runtime guarantees

Alternative approaches (more verbose, same safety):
```tsx
// Option 1: Explicit null check (unnecessary due to enabled guard)
queryFn: async () => {
  if (!orgId) throw new Error('orgId is required');
  return fetchRIDDORIncidents(orgId, statusFilter);
}

// Option 2: Use orgId! (current approach - cleaner)
queryFn: async () => {
  return fetchRIDDORIncidents(orgId!, statusFilter);
}
```

## Files Changed

### Modified Files

**web/app/(dashboard)/riddor/page.tsx** (+13, -4 lines)
- Added `useOrg` import from `@/contexts/org-context`
- Replaced hardcoded org_id with `useOrg()` hook
- Added `enabled: !!orgId` guard to useQuery
- Added loading and missing-org state handling
- Included `orgId` in queryKey for proper cache invalidation

**web/app/(dashboard)/riddor/analytics/page.tsx** (+17, -7 lines)
- Added `useOrg` import from `@/contexts/org-context`
- Replaced both hardcoded org_id values with `useOrg()` hook
- Added `enabled: !!orgId` guards to both useQuery hooks
- Added loading and missing-org state handling
- Included `orgId` in both queryKeys for proper cache invalidation

## Next Phase Readiness

### Blockers Resolved
✅ RIDDOR dashboard pages now use authenticated user's org_id
✅ No hardcoded demo UUIDs remain in RIDDOR directory
✅ Loading states handle org context properly

### Pattern Established
This plan establishes the standard pattern for all dashboard pages:
1. Import and use `useOrg()` hook
2. Add `enabled: !!orgId` guard to queries
3. Handle loading and missing-org states
4. Include `orgId` in queryKeys

Future dashboard pages should follow this exact pattern.

### No Outstanding Issues
- Zero TypeScript errors introduced
- All verification checks pass
- Pre-existing TypeScript errors in other files unchanged
- RIDDOR pages ready for multi-org production use

## Performance Impact

### Before
- Hardcoded org_id meant queries always ran immediately on mount
- Wrong org data could be cached and displayed

### After
- Queries wait for org context to load (adds ~50-200ms initial delay)
- Proper cache isolation per organization
- No risk of cross-org data leakage

**Tradeoff:** Slight initial delay for guaranteed correctness and security.

## Future Considerations

### Apply Pattern to Other Dashboard Pages

These pages likely need the same auth integration (not verified in this plan):
- Bookings list/detail pages
- Timesheet approval pages
- Contract management pages
- Any page using organization-specific data

**Recommendation:** Audit all pages in `web/app/(dashboard)/*` for hardcoded org_id values and apply this pattern.

### Consider Server-Side Org Context

For Server Components, consider server-side org extraction pattern:
```tsx
// app/dashboard/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.app_metadata?.org_id;

  // Fetch data server-side with proper org_id
  const incidents = await fetchRIDDORIncidents(orgId);

  return <IncidentsList incidents={incidents} />;
}
```

This avoids client-side loading states entirely for initial data.

---

**Gap Closure Status:** ✅ Complete
**Must-Haves Verified:** 5/5
**Production Ready:** Yes

Zero hardcoded org_id values remain. All RIDDOR dashboard pages use dynamic auth context.
