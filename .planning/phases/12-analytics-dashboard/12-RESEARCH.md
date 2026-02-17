# Phase 12: Analytics Dashboard - Research

**Researched:** 2026-02-17
**Domain:** Admin analytics UI — territory metrics, auto-assignment, medic utilisation, charting
**Confidence:** HIGH (all findings verified from source files in the repository)

---

## Summary

Phase 12 is primarily a UI assembly task. The backend infrastructure was built in Phase 07.5 and
Phase 10: the pg_cron job in `039_territory_metrics_cron.sql` aggregates territory metrics daily,
`auto_schedule_logs` captures every auto-assignment attempt with full score breakdowns, and the
`medic_location_analytics` view already aggregates late arrivals per medic. The computation layer
in `lib/territory/metrics.ts`, `hiring-triggers.ts`, and `coverage-gaps.ts` is complete and tested.

The existing analytics page at `web/app/admin/analytics/page.tsx` is a **location-tracking**
dashboard (GPS pings, geofence accuracy, battery levels). It is NOT a territory/capacity
dashboard. Phase 12 must either extend this file with tabs or build a separate sub-page within
it. Based on CONTEXT.md the plan is to extend this file with new tabs.

Recharts 3.7.0 is already installed and in use on the revenue page (`revenue-charts.tsx`).
Leaflet + react-leaflet are already installed and in use on the territories page with the
established `dynamic(() => import(...), { ssr: false })` pattern. No new packages are required.

**Primary recommendation:** Build 12-04 (Analytics Data API) first, then 12-01/02/03 (UI tabs).
The UI tabs have zero data to render until the query hooks exist. The current task order in
CONTEXT.md is wrong for development sequencing; the API task must be extracted and completed first.

---

## 1. Existing Data Layer (what's available, exact types)

### 1a. Territory Metrics — `territory_metrics` table

Full schema from `002_business_operations.sql` + additions from `039_territory_metrics_cron.sql`:

```
territory_metrics (
  id                       UUID
  postcode_sector          TEXT NOT NULL
  metric_date              DATE NOT NULL
  org_id                   UUID  -- added in 039
  total_bookings           INT
  confirmed_bookings       INT
  rejected_bookings        INT
  rejection_rate           DECIMAL(5,2)   -- percentage
  fulfillment_rate         DECIMAL(5,2)   -- percentage
  primary_medic_id         UUID
  primary_medic_utilization DECIMAL(5,2)  -- percentage (0-100)
  secondary_medic_id       UUID
  secondary_medic_utilization DECIMAL(5,2)
  avg_travel_time_minutes  DECIMAL(6,2)
  out_of_territory_bookings INT
  hiring_trigger_weeks     INT  -- added in 039: consecutive weeks >80% utilisation
  created_at               TIMESTAMPTZ
  UNIQUE(postcode_sector, metric_date)  -- note: NOT (org_id, postcode_sector, metric_date) in base,
                                        -- 039 uses ON CONFLICT (org_id, postcode_sector, metric_date)
                                        -- Confirm actual constraint in DB
)
```

**IMPORTANT: The cron job runs once daily at 3 AM UTC** — data is 3-24 hours stale at any given
time. This is known and acceptable per D-07.5-01-001.

The hiring_trigger_weeks counter is updated by the **weekly** Monday 4 AM cron. A territory that
has been at >80% utilisation for 4 weeks will show `hiring_trigger_weeks = 4`.

### 1b. TerritoryWithMetrics type (from `web/lib/queries/admin/territories.ts`)

```typescript
interface TerritoryWithMetrics {
  id: string;
  postcode_sector: string;
  region: string;
  primary_medic_id: string | null;
  secondary_medic_id: string | null;
  max_travel_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Computed from territory_metrics
  utilization_pct: number;          // primary_medic_utilization rounded
  primary_medic_name: string | null;
  secondary_medic_name: string | null;

  // Recent metrics (latest metric_date row)
  recent_metrics: {
    total_bookings: number;
    confirmed_bookings: number;
    rejected_bookings: number;
    rejection_rate: number;
    fulfillment_rate: number;
  };

  hiring_trigger_weeks: number;     // From territory_metrics.hiring_trigger_weeks
  lat: number;                      // From UK_POSTCODE_CENTROIDS hardcoded map
  lng: number;
}
```

**Key gap:** `recent_metrics` uses only the most recent metric row — it does NOT include historical
weekly data. For the 12-week auto-assignment success rate chart, a new query must fetch multiple
weeks of `territory_metrics` rows (or `auto_schedule_logs` rows) grouped by week.

### 1c. Auto-Assignment Tracking — `auto_schedule_logs` table

Full schema from `013_medic_scheduling.sql`:

```
auto_schedule_logs (
  id                      UUID
  booking_id              UUID
  assigned_medic_id       UUID  -- NULL if assignment failed
  confidence_score        DECIMAL(5,2)  -- 0-100 (total weighted score)

  -- Score breakdown (all 0-100 before weighting)
  distance_score          DECIMAL(5,2)
  qualification_score     DECIMAL(5,2)
  availability_score      DECIMAL(5,2)
  utilization_score       DECIMAL(5,2)
  rating_score            DECIMAL(5,2)
  performance_score       DECIMAL(5,2)
  fairness_score          DECIMAL(5,2)  -- legacy, no longer used in scoring

  all_candidates_ranked   JSONB         -- [{medic_id, total_score, breakdown: {...}}]
  assignment_successful   BOOLEAN
  failure_reason          TEXT          -- "No qualified medics available" etc.
  created_at              TIMESTAMPTZ
)
```

**What can be built from this:**
- 12-week success rate chart: `GROUP BY date_trunc('week', created_at)`, calculate
  `COUNT(*) FILTER (WHERE assignment_successful) / COUNT(*)` per week
- Failure reason breakdown: aggregate `failure_reason` text by week
- Medic scoring transparency: `all_candidates_ranked` JSONB shows exactly why each medic was
  ranked at their position — perfect for the "why this medic?" feature

**CAUTION:** It is unknown whether the production Edge Function actually writes to
`auto_schedule_logs`. The table schema exists and the function `calculate_auto_match_score` exists
in SQL (migration 103), but the Edge Function that performs auto-assignment may or may not insert
rows. The 12-week chart will return empty data if no rows exist. A defensive empty state must be
built.

### 1d. Late Arrivals — `medic_alerts` table + `medic_location_analytics` view

Late arrivals are tracked as `alert_type = 'late_arrival'` in the `medic_alerts` table.
The view `medic_location_analytics` aggregates `late_arrivals` per medic (last 30 days).

For the "late arrival heatmap by day-of-week and medic" chart (12-03), the raw `medic_alerts`
table must be queried directly since the view does not expose day-of-week breakdown.

```sql
SELECT
  m.first_name || ' ' || m.last_name AS medic_name,
  EXTRACT(DOW FROM ma.triggered_at) AS day_of_week,  -- 0=Sun, 6=Sat
  COUNT(*) AS late_arrival_count
FROM medic_alerts ma
JOIN medics m ON m.id = ma.medic_id
WHERE ma.alert_type = 'late_arrival'
  AND ma.triggered_at >= NOW() - INTERVAL '90 days'
GROUP BY medic_name, day_of_week
ORDER BY medic_name, day_of_week
```

### 1e. Medic Utilisation — `medics` + `bookings` tables

`MedicWithMetrics` (from `web/lib/queries/admin/medics.ts`) already exposes:
- `utilization_pct` (0-100) — confirmed bookings this week as % of 5 working days
- `upcoming_bookings_count`
- `completed_bookings_this_week`

The per-medic utilisation bar chart (12-03) can be built directly from `useMedics()` which
already fetches this data. No new query is needed for the bar chart itself.

### 1f. Out-of-Territory Cost Impact — `bookings` table

The `bookings` table has:
- `out_of_territory_cost DECIMAL(10,2)` — travel bonus or room/board cost
- `out_of_territory_type TEXT` — 'travel_bonus' | 'room_board' | NULL

The `territory_metrics` table also has `out_of_territory_bookings INT` per postcode per day.

For the "out-of-territory booking frequency and cost impact" panel, either source works.
The bookings table provides actual cost figures; territory_metrics provides aggregated counts.

---

## 2. Existing Analytics Page

**File:** `web/app/admin/analytics/page.tsx`

The current page is a **location tracking dashboard** with four tabs:
- Overview (GPS pings, battery, geofence accuracy)
- Medics (per-medic reliability scores)
- Geofences (auto-detection rates per site)
- Alerts (alert type breakdown)

**Technology pattern:** This page uses raw `useEffect` + `useState` + direct Supabase client
calls (old pattern). It does NOT use TanStack Query or the org context.

```typescript
// Current pattern in analytics page (OLD — not the standard admin pattern)
const loadAnalytics = async () => {
  const [metricsRes, ...] = await Promise.all([
    supabase.from('location_tracking_metrics').select('*').single(),
    ...
  ]);
};
```

**The territories page and revenue page use the correct modern pattern:**
```typescript
// Standard pattern for all new admin code
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRequireOrg } from '@/contexts/org-context';

const supabase = createClient();
const orgId = useRequireOrg();
return useQuery({
  queryKey: ['admin', 'analytics', 'territory', orgId],
  queryFn: () => fetchAnalyticsData(supabase, orgId),
  staleTime: 60000,
  refetchInterval: 300000,
});
```

New tabs in Phase 12 must use TanStack Query + org context, not the existing analytics page pattern.

**Implication:** Phase 12 extends the existing analytics page file by adding new tabs to the tab
array, but the new tab content must use Query hooks, not raw useEffect.

---

## 3. Charting Library Available

**Recharts 3.7.0** — already installed, no additional packages needed.

**Already used in the codebase at:**
- `web/components/admin/revenue-charts.tsx` — LineChart, BarChart patterns

**Established import pattern:**
```typescript
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
```

**Critical pattern for Next.js (from revenue page):** Recharts components must be dynamically
imported with `ssr: false` to avoid hydration mismatches:

```typescript
const AssignmentSuccessChart = dynamic(
  () => import('@/components/admin/assignment-charts').then((m) => ({ default: m.AssignmentSuccessChart })),
  { ssr: false, loading: () => <div className="h-[400px] text-gray-400 flex items-center justify-center">Loading...</div> }
);
```

**Leaflet + react-leaflet** — already installed (leaflet 1.9.4, react-leaflet 5.0.0). The
territory map at `web/components/admin/territory-map.tsx` already renders circles coloured by
utilisation using `UK_POSTCODE_CENTROIDS`. The heatmap for 12-01 reuses this component.

---

## 4. Database Schema (territory_metrics, relevant tables)

### Full territory_metrics column list (confirmed)

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | PK |
| postcode_sector | TEXT | e.g. "M1", "B2" |
| metric_date | DATE | One row per sector per day |
| org_id | UUID | Multi-tenant isolation (added 039) |
| total_bookings | INT | All bookings in sector last 7 days |
| confirmed_bookings | INT | Status = confirmed |
| rejected_bookings | INT | Cancelled with "no medic available" reason |
| rejection_rate | DECIMAL(5,2) | rejected/total * 100 |
| fulfillment_rate | DECIMAL(5,2) | confirmed/total * 100 |
| primary_medic_id | UUID | FK to medics |
| primary_medic_utilization | DECIMAL(5,2) | confirmed primary bookings / 5 days * 100 |
| secondary_medic_id | UUID | FK to medics |
| secondary_medic_utilization | DECIMAL(5,2) | confirmed secondary bookings / 5 days * 100 |
| avg_travel_time_minutes | DECIMAL(6,2) | From travel_time_cache |
| out_of_territory_bookings | INT | Confirmed bookings to non-primary/secondary medic |
| hiring_trigger_weeks | INT | Consecutive weeks primary_medic_utilization >80% |
| created_at | TIMESTAMPTZ | Row creation time |

### Key DB data gap: 12-week historical data for auto-assignment chart

The `fetchTerritoriesWithMetrics()` function only fetches the **most recent** metric row per
postcode sector. For the 12-week auto-assignment success rate chart, a new query must explicitly
fetch `auto_schedule_logs` grouped by week:

```sql
SELECT
  date_trunc('week', created_at) AS week_start,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (WHERE assignment_successful = TRUE) AS successful,
  ROUND(COUNT(*) FILTER (WHERE assignment_successful = TRUE)::DECIMAL / COUNT(*) * 100, 1) AS success_rate,
  array_agg(DISTINCT failure_reason) FILTER (WHERE failure_reason IS NOT NULL) AS failure_reasons
FROM auto_schedule_logs
WHERE created_at >= NOW() - INTERVAL '12 weeks'
  AND booking_id IN (SELECT id FROM bookings WHERE org_id = $1)
GROUP BY week_start
ORDER BY week_start ASC
```

---

## 5. Admin Page Patterns (query patterns, loading states)

### Standard admin query hook pattern (from territories.ts, medics.ts, revenue.ts)

```typescript
'use client';

export async function fetchAnalyticsData(
  supabase: SupabaseClient,
  orgId: string
): Promise<AnalyticsData> {
  const { data, error } = await supabase
    .from('territory_metrics')
    .select('*')
    .eq('org_id', orgId)
    .order('metric_date', { ascending: false });

  if (error) throw error;
  return transformData(data ?? []);
}

export function useAnalyticsData() {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'analytics', 'territory', orgId],
    queryFn: () => fetchAnalyticsData(supabase, orgId),
    staleTime: 60000,        // 1 minute
    refetchInterval: 300000, // 5 minutes (data is already stale from cron anyway)
  });
}
```

### Standard error state pattern (from territories page)

```typescript
if (error) {
  return (
    <div className="p-8">
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Failed to load analytics. Please try again later.</p>
      </div>
    </div>
  );
}
```

### Standard loading state (skeleton cards)

The territories page uses `isLoading` from useQuery to show skeleton states.
The analytics page pattern from revenue uses dynamic import loading fallbacks.

### Dark theme styling (global admin pattern)

```typescript
// Card
<div className="bg-gray-800 rounded-lg p-6 border border-gray-700">

// Table header
<thead className="bg-gray-900">

// Table row hover
<tr className="hover:bg-gray-700/50 transition">

// Severity colors (D-07.5-04-001)
// Critical (>25%): bg-red-500/20 text-red-400
// Warning (10-25%): bg-yellow-500/20 text-yellow-400
// Healthy: bg-green-500/20 text-green-400
```

### Org context (mandatory for all admin data queries)

All queries MUST include `.eq('org_id', orgId)`. Missing this causes cross-tenant data leak.
The `useRequireOrg()` hook throws if called outside org context — call it at component top level.

---

## 6. Auto-Assignment Tracking (what data exists in DB)

### What exists

The `auto_schedule_logs` table schema is confirmed in `013_medic_scheduling.sql`. It captures:
- `assignment_successful BOOLEAN` — did a medic get assigned?
- `failure_reason TEXT` — why not? ("No qualified medics available", etc.)
- `confidence_score DECIMAL(5,2)` — 0-100 total score of the assigned medic
- `all_candidates_ranked JSONB` — full list of medics considered with score breakdowns
- `created_at TIMESTAMPTZ` — when the assignment attempt happened

Indexes exist on: `booking_id`, `assigned_medic_id`, `assignment_successful`, `created_at`.

### What is uncertain

**Whether the Edge Function actually inserts rows.** The SQL function `calculate_auto_match_score`
exists in migration 103 but whether the actual Supabase Edge Function invokes it and writes to
`auto_schedule_logs` is not verifiable from static analysis alone. The 12-week chart could show
all zeros if the table is empty.

**Mitigation:** Build all charts with empty state fallbacks. Use `.maybeSingle()` or check
`data.length === 0` before rendering chart components. Show "No auto-assignment data yet" message
rather than a broken chart.

### Medic scoring transparency ("why this medic?")

The `all_candidates_ranked` JSONB column contains exactly the data needed for the "why this
medic?" feature. Example shape based on the TypeScript types:

```json
[
  {
    "medic_id": "uuid-...",
    "medic_name": "Jane Smith",
    "total_score": 87.5,
    "breakdown": {
      "distance_score": 28.5,
      "utilization_score": 18.0,
      "qualification_score": 15.0,
      "availability_score": 15.0,
      "rating_score": 11.0,
      "performance_score": 0.0
    }
  }
]
```

This is already formatted by `formatScoreBreakdown()` in `auto-assignment.ts` for display.

---

## 7. Plan Order Recommendation (API first vs UI first)

### Current order in CONTEXT.md

1. 12-01: Territory coverage dashboard (UI)
2. 12-02: Auto-assignment analytics (UI)
3. 12-03: Medic utilisation dashboard (UI)
4. 12-04: Analytics data API

### Problem with this order

12-01, 12-02, and 12-03 all require query hooks from 12-04 to render any data. If built in the
listed order, each UI task must either:
- Mock the data locally (throwaway work), or
- Be blocked waiting for query hooks to exist

### Recommended order

**12-04 FIRST, then 12-01, 12-02, 12-03.**

**Revised sequencing rationale:**

| Task | Depends On | Can Start Without? |
|------|-----------|-------------------|
| 12-04 (API) | Database (already exists) | Yes — no blockers |
| 12-01 (Territory UI) | 12-04 `useTerritoryAnalytics` hook | No — needs data hook |
| 12-02 (Auto-assign UI) | 12-04 `useAutoAssignmentAnalytics` hook | No — needs data hook |
| 12-03 (Medic util UI) | 12-04 `useMedicUtilisation` hook | Partial — `useMedics()` exists already |

**Exception for 12-03:** The medic utilisation bar chart (per-medic `utilization_pct`) can reuse
`useMedics()` from `web/lib/queries/admin/medics.ts` which already exists. So 12-03 can be
partially started before 12-04, but the late arrival heatmap and OOT frequency panels still need
12-04.

**Final recommended sequence: 12-04 → 12-01 → 12-02 → 12-03**

---

## 8. Pitfalls to Avoid

### Pitfall 1: Rendering Leaflet on server (SSR crash)

**What goes wrong:** Importing Leaflet map directly causes "window is not defined" crash during
Next.js SSR. Already documented as prior decision D-05.5-04-003.

**Prevention:** Always use `dynamic(() => import('...'), { ssr: false })` for any component that
imports from `leaflet` or `react-leaflet`. The territory-map component is already wrapped — use
it directly. Do not re-import leaflet in new components.

### Pitfall 2: Rendering Recharts on server

**What goes wrong:** Recharts uses browser DOM APIs internally and can cause hydration mismatches.

**Prevention:** Follow the revenue page pattern — put chart components in a separate file
(e.g., `components/admin/analytics-charts.tsx`) and dynamic import them with `ssr: false`.

### Pitfall 3: Empty auto_schedule_logs table

**What goes wrong:** The 12-week success rate chart renders `NaN%` or crashes if no rows exist
in `auto_schedule_logs`.

**Prevention:** Always check for empty data before rendering. The query should return 0 rows
gracefully. Show "No auto-assignment data recorded yet" empty state instead of chart.

### Pitfall 4: Missing org_id filter

**What goes wrong:** Querying `territory_metrics` without `.eq('org_id', orgId)` returns all
organisations' data, violating multi-tenant isolation. RLS should catch this, but defence in depth
requires explicit org filtering in every query.

**Prevention:** Every query in 12-04 must include `.eq('org_id', orgId)` and be built using the
`fetchX(supabase, orgId)` pattern (not raw supabase calls in components).

### Pitfall 5: Territory metrics one-row-per-day structure for weekly charts

**What goes wrong:** Querying `territory_metrics` for the "last 12 weeks" naively fetches up to
84 rows per postcode sector (12 weeks × 7 days). For 11,000 territories, that is 924,000 rows —
a timeout-worthy query.

**Prevention:** For historical charts, GROUP BY week in the query. Only fetch the aggregated
weekly average per postcode sector, not daily rows. Or use the `territory_metrics` table with
`LIMIT` and pre-aggregated territory_id filtering (only territories the admin is looking at).

Alternatively, rely on pg_cron's `hiring_trigger_weeks` column which already counts consecutive
high-utilisation weeks without needing to re-aggregate historical rows.

### Pitfall 6: weeks_active is hardcoded to 0 in hiring-triggers.ts

**What goes wrong:** `HiringTrigger.weeks_active` is always 0 in the detection logic because
the code comments "Would be populated from territory_metrics.hiring_trigger_weeks".

**Prevention:** In the 12-01 UI task, pass `territory.hiring_trigger_weeks` directly from the
`TerritoryWithMetrics` object into the `HiringTrigger` when displaying cards. The data is already
available in the query result; the lib function just does not wire it up. The UI layer should
use `territory.hiring_trigger_weeks` directly for the "4 weeks — HIRE NOW" card display.

### Pitfall 7: Extending analytics page without breaking existing tabs

**What goes wrong:** The existing analytics page has four tabs driven by a `activeTab` state
string literal union: `'overview' | 'medics' | 'geofences' | 'alerts'`. Adding new tabs by
modifying this union type and the tab array is straightforward, but the new tabs must not break
the existing tab rendering code.

**Prevention:** Add new tab values to the union type and extend the tab button array. New tab
content uses Query hooks; existing tab content continues using its raw useEffect pattern (do not
refactor the existing tabs).

---

## Architecture Patterns

### New query hooks required (12-04 deliverables)

```typescript
// File: web/lib/queries/admin/analytics.ts (new file)

// 1. Territory analytics (extends existing useTerritories with historical data)
export function useAnalyticsTerritories(): TerritoryWithMetrics[]

// 2. Auto-assignment 12-week history
export interface WeeklyAssignmentStats {
  week_start: string;   // ISO date
  total_attempts: number;
  successful: number;
  success_rate: number; // 0-100
  failure_reasons: string[];
}
export function useAutoAssignmentHistory(): WeeklyAssignmentStats[]

// 3. Medic utilisation (can wrap existing useMedics)
export function useMedicUtilisation(): MedicWithMetrics[]  // sorted by utilization_pct desc

// 4. Late arrival heatmap data
export interface LateArrivalHeatmapRow {
  medic_name: string;
  day_of_week: number;  // 0-6
  count: number;
}
export function useLateArrivalHeatmap(): LateArrivalHeatmapRow[]

// 5. Out-of-territory stats
export interface OOTStats {
  postcode_sector: string;
  region: string;
  oot_booking_count: number;
  oot_cost_total: number;  // GBP
}
export function useOutOfTerritoryStats(): OOTStats[]
```

### Component file structure for Phase 12

```
web/
├── lib/queries/admin/
│   └── analytics.ts                 (NEW — 12-04 deliverable)
├── app/admin/analytics/
│   └── page.tsx                     (EXTEND — add new tabs)
└── components/admin/
    ├── territory-analytics-charts.tsx  (NEW — 12-01 Recharts components)
    ├── assignment-analytics-charts.tsx (NEW — 12-02 Recharts components)
    └── medic-utilisation-charts.tsx    (NEW — 12-03 Recharts components)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Territory heatmap circles | Custom SVG map | `react-leaflet` CircleMarker (already used in territory-map.tsx) |
| Time-series charts | Custom canvas | Recharts `LineChart` / `BarChart` |
| Colour-coded utilisation | Custom colour function | `getUtilizationColor()` in territories.ts (already exists) |
| Postcode coordinates | Geocoding API | `UK_POSTCODE_CENTROIDS` hardcoded map (already exists) |
| Severity badge colours | Custom logic | Tailwind classes per D-07.5-04-001 pattern |
| Org filtering | RLS alone | Always add `.eq('org_id', orgId)` explicitly |

---

## Code Examples

### Territory heatmap (re-use existing component)

The `TerritoryMap` component at `web/components/admin/territory-map.tsx` already renders
Leaflet `CircleMarker` elements coloured by `getUtilizationColor(pct)`. For 12-01, this
component can be imported directly and rendered inside the new tab without modification:

```typescript
// In the analytics page tab content
const TerritoryMap = dynamic(() => import('@/components/admin/territory-map'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">Loading map...</div>,
});
```

### Auto-assignment 12-week line chart (using Recharts)

```typescript
// Source: revenue-charts.tsx pattern (LineChart)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AssignmentSuccessChart({ data }: { data: WeeklyAssignmentStats[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-gray-400">No auto-assignment data recorded yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="week_start" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
        <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          formatter={(value: number) => [`${value}%`, 'Success Rate']}
        />
        <Line type="monotone" dataKey="success_rate" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Hiring trigger card (using existing lib functions)

```typescript
// Use detectHiringTriggers() + groupTriggersByRegion() from existing lib files
import { detectHiringTriggers, groupTriggersByRegion } from '@/lib/territory/hiring-triggers';

const triggers = detectHiringTriggers(territories);
// IMPORTANT: Override weeks_active from territory data (lib function hardcodes 0)
const triggersWithWeeks = triggers.map(t => {
  const territory = territories.find(terr => terr.id === t.territory_id);
  return { ...t, weeks_active: territory?.hiring_trigger_weeks ?? 0 };
});
const grouped = groupTriggersByRegion(triggersWithWeeks);
```

---

## Sources

### Primary (HIGH confidence)

All findings are from direct file inspection — no external sources required.

- `web/lib/territory/metrics.ts` — TerritoryMetricsSummary type, aggregateTerritoryMetrics()
- `web/lib/territory/hiring-triggers.ts` — HiringTrigger type, detectHiringTriggers(), groupTriggersByRegion()
- `web/lib/territory/coverage-gaps.ts` — CoverageGap type, detectCoverageGaps()
- `web/lib/territory/auto-assignment.ts` — AutoAssignmentScore type, formatScoreBreakdown()
- `web/app/admin/analytics/page.tsx` — existing page structure, tab pattern, data interfaces
- `web/lib/queries/admin/territories.ts` — TerritoryWithMetrics type, fetchTerritoriesWithMetrics(), UK_POSTCODE_CENTROIDS, getUtilizationColor()
- `web/lib/queries/admin/medics.ts` — MedicWithMetrics type
- `web/lib/queries/admin/overview.ts` — standard TanStack Query hook pattern
- `web/app/admin/revenue/page.tsx` — dynamic import pattern for Recharts
- `web/components/admin/revenue-charts.tsx` — LineChart, BarChart component patterns
- `web/package.json` — recharts 3.7.0, leaflet 1.9.4, react-leaflet 5.0.0 confirmed installed
- `supabase/migrations/002_business_operations.sql` — territory_metrics base schema, bookings out_of_territory columns
- `supabase/migrations/039_territory_metrics_cron.sql` — full territory_metrics cron, hiring_trigger_weeks column, org_id column
- `supabase/migrations/013_medic_scheduling.sql` — auto_schedule_logs full schema
- `supabase/migrations/103_update_auto_assignment_scoring_weights.sql` — calculate_auto_match_score SQL function
- `supabase/migrations/010_location_tracking_analytics.sql` — medic_location_analytics view, late_arrivals column

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack (Recharts, Leaflet) | HIGH | Confirmed in package.json and existing usage |
| Database Schema | HIGH | Read directly from migration files |
| Existing data types | HIGH | Read directly from TypeScript source files |
| Auto-assignment log population | LOW | Table schema exists; whether Edge Function writes rows is not verifiable statically |
| Late arrival day-of-week query | MEDIUM | Schema confirmed; exact query shape needs testing against live DB |
| 12-week history query performance | MEDIUM | Table is large but query is aggregated; needs testing under load |

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days — stable codebase)
