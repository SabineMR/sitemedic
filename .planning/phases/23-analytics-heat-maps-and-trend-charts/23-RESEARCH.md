# Phase 23: Analytics — Heat Maps & Trend Charts - Research

**Researched:** 2026-02-17
**Domain:** Leaflet heat maps, Recharts trend charts, Supabase analytics queries, compliance scoring
**Confidence:** HIGH (all findings verified against actual codebase files)

---

## Summary

Phase 23 adds two classes of analytics to SiteMedic: geographic heat maps of near-miss incidents (using Leaflet) and compliance score trend charts (using Recharts). All dependency questions were resolvable by inspecting the actual codebase — no guesswork needed.

The critical research flag about `leaflet.heat` compatibility with `react-leaflet@5.0.0` is now resolved: **use the `CircleMarker` fallback**. The official `leaflet.heat` package is 10 years old, has known breakage with Leaflet 1.9 (namespace import issue), and no maintained React-Leaflet 5 wrapper exists. The `CircleMarker` fallback is already the established pattern in this codebase (see `territory-map.tsx`) and requires zero new dependencies.

The `compliance_score_history` table exists in migration 124 with a schema that differs slightly from the plan's assumption: it has no `formula_version` column and no `week_date` column — instead it uses `period_start` (DATE) and `period_end` (DATE). The compliance score formula already exists in `web/lib/queries/compliance.ts` and the Edge Function `queries.ts` — it is a traffic-light categorical logic, not a 0-100 numeric score. Converting it to a 0-100 integer (required by the `score INTEGER CHECK (score >= 0 AND score <= 100)` column constraint) requires a formula decision to be made in Plan 23-01 before anything else can build.

**Primary recommendation:** Proceed with CircleMarker fallback for heat maps; freeze the numeric compliance score formula in 23-01 before writing any chart queries.

---

## Dependency Verification

### compliance_score_history table — CONFIRMED (migration 124)

Exact schema (verified from `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/124_vertical_schema_v4.sql`):

```sql
CREATE TABLE IF NOT EXISTS compliance_score_history (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID         NOT NULL REFERENCES org_settings(org_id) ON DELETE CASCADE,
  vertical      TEXT         NOT NULL,
  score         INTEGER      NOT NULL CHECK (score >= 0 AND score <= 100),
  period_start  DATE         NOT NULL,
  period_end    DATE         NOT NULL,
  calculated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  details       JSONB
);
```

**Key findings:**
- No `formula_version` column exists. The plan document mentions it — it does not exist in the actual table. Plan 23-01 must either add it via migration or document the formula in `details` JSONB.
- No `week_date` single-column pattern. Instead: `period_start` + `period_end` date range.
- `org_id` references `org_settings(org_id)` — NOT `organizations(id)`. This is a critical FK distinction.
- `vertical` is NOT NULL — every score row must have a vertical identifier. For general/cross-vertical compliance, a sentinel value such as `'general'` will be needed.
- `score` is `INTEGER` 0-100. The existing compliance formula returns `'red' | 'amber' | 'green'` — conversion to integer is required.
- RLS: org members can SELECT their own org's scores. No platform admin SELECT policy exists yet on this table.

**Gap:** Platform admin policy for `compliance_score_history` is missing. Migration 107 covers many tables but not this one (table didn't exist yet). Plan 23-05 will need a migration adding `USING (is_platform_admin())`.

### near_misses table — CONFIRMED (migration 00003 + migration 124)

Base columns (from `00003_health_data_tables.sql`):
```
id, org_id, reported_by, category, severity, description, location,
photo_uris, corrective_action, created_at, updated_at, deleted_at
```

GPS columns added by migration 124:
```sql
ALTER TABLE near_misses
  ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION;
```

**Key findings:**
- `gps_lat` and `gps_lng` are nullable (no NOT NULL constraint). Many existing near-miss records will have NULL GPS — the heat map query must filter `WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL`.
- `org_id` references `organizations(id)` (not `org_settings`).
- RLS: org-scoped via `auth.jwt() -> 'app_metadata' ->> 'org_id'`. Platform admins can SELECT all via `is_platform_admin()` (migration 107).
- `severity` values: `'low' | 'medium' | 'high' | 'critical'` — usable for point sizing in the CircleMarker fallback.

### react-leaflet version — CONFIRMED installed

From `web/package.json`:
- `react-leaflet: ^5.0.0` (installed: `5.0.0`)
- `leaflet: ^1.9.4` (installed: `1.9.4`)
- `@types/leaflet: ^1.9.21`

No `leaflet.heat` package installed. No heat map wrapper package installed.

### Recharts — CONFIRMED installed

From `web/package.json`:
- `recharts: ^3.7.0`

Recharts 3.7.0 is installed and actively used in:
- `web/components/admin/revenue-charts.tsx` — `LineChart`, `BarChart`, `ResponsiveContainer`
- `web/components/admin/assignment-analytics-charts.tsx` — `LineChart`, `BarChart`

Both files are in `web/components/admin/` and can serve as copy-paste templates.

---

## Library Compatibility

### leaflet.heat vs react-leaflet 5.0.0 — CONFIRMED INCOMPATIBLE

Research findings:
1. `leaflet.heat` npm package: version 0.2.0, last published **10 years ago**. No TypeScript types. No maintenance.
2. Known breaking issue with Leaflet 1.9: the global object modification pattern (`L.heatLayer`) fails with namespace imports (`import * as L`). Workaround exists (use default import `import L from 'leaflet'`) but this is fragile.
3. No maintained React-Leaflet 5 wrapper exists:
   - `react-leaflet-heat-layer` (LockBlock-dev): targets older react-leaflet versions
   - `react-leaflet-heatmap-layer-v3`: 3.0.3-beta-1, last published 4 years ago, peerDeps require older react-leaflet
   - `react-leaflet-heatmap-layer` (OpenGov): peerDeps `react-leaflet ^2.0.0`

**Decision: Use CircleMarker fallback.** This is the established pattern in this codebase.

### CircleMarker fallback — CONFIRMED pattern exists

`web/components/admin/territory-map.tsx` already uses exactly this pattern:
- `MapContainer` + `TileLayer` + `CircleMarker` from `react-leaflet`
- `L from 'leaflet'` default import (avoids the Leaflet 1.9 namespace issue)
- `CircleMarker` with dynamic `radius` and `pathOptions.fillColor` driven by data values
- OpenStreetMap tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

For the near-miss heat map, `radius` should be driven by severity:
```typescript
const radiusBySeverity = { low: 8, medium: 12, high: 16, critical: 20 };
```
And `fillColor` by severity or org (for admin aggregate map).

### Recharts AreaChart — CONFIRMED supported in recharts 3.7.0

The plan calls for an `AreaChart` for incident frequency. This component exists in recharts 3.x. The codebase currently uses `LineChart` and `BarChart` — `AreaChart` follows the same API pattern.

---

## Compliance Score Formula

### Current formula (exists in two places)

**In `web/lib/queries/compliance.ts` (`calculateComplianceStatus`):**
```typescript
// RED: Daily check not done OR RIDDOR deadlines approaching
if (!data.dailyCheckDone || data.riddorDeadlines > 0) return 'red';
// AMBER: Overdue follow-ups OR expired certifications
if (data.overdueFollowups > 0 || data.expiredCerts > 0) return 'amber';
// GREEN: All clear
return 'green';
```

**In the Edge Function `queries.ts` (`calculateComplianceStatus`):**
Identical logic — categorical `'red' | 'amber' | 'green'`.

### Problem for Phase 23

The `compliance_score_history.score` column is `INTEGER CHECK (score >= 0 AND score <= 100)`. Storing `'red'/'amber'/'green'` won't fit.

### Recommended numeric formula for Plan 23-01

A simple, stable, auditable formula that maps to 0-100:

```
score = 100
  - (dailyCheckDone == false ? 40 : 0)
  - (riddorDeadlines > 0 ? 30 : 0)
  - (overdueFollowups > 0 ? 20 : 0)
  - (expiredCerts > 0 ? 10 : 0)
```

Rationale for weights:
- Daily check: most important daily obligation (40 pts)
- RIDDOR deadline: legal reporting deadline (30 pts)
- Overdue follow-ups: clinical safety (20 pts)
- Expired certs: regulatory compliance (10 pts)

This maps cleanly to existing data fields already fetched by `fetchWeeklyReportData`. It is additive and auditable. The score value can be stored in `details` JSONB alongside the raw factor counts for transparency.

**Note on `formula_version`:** The table has no `formula_version` column. Store the formula version in `details JSONB` as `{"formula_version": "v1", "daily_check_done": true, ...}`. If the formula ever changes, bump `formula_version` in the JSONB.

**Note on `vertical`:** The `generate-weekly-report` function does not currently know which vertical an org is running. For Plan 23-01, use `vertical = 'general'` as the sentinel for org-wide compliance. Per-vertical compliance is a future extension.

---

## Existing Dashboard Structure

### Org dashboard (`/dashboard`) — route group `(dashboard)`

Layout: `web/app/(dashboard)/layout.tsx` — uses shadcn `SidebarProvider` + `Sidebar` + `DashboardNav`.

Navigation (from `DashboardNav.tsx`):
| Page | Route |
|------|-------|
| Overview | `/dashboard` |
| Treatments | `/treatments` |
| Near-Misses | `/near-misses` |
| Workers | `/workers` |
| RIDDOR | `/riddor` |
| Certifications | `/certifications` |
| Contracts | `/contracts` |
| Reports | `/reports` |

**No Analytics page exists yet for the org dashboard.** Phase 23 needs to add:
- Heat map page: suggest `/dashboard/analytics/heat-map` or `/near-misses/heat-map` (near-misses already has a route)
- Compliance trend: suggest `/dashboard/analytics/compliance` or add a tab to the existing overview

The `DashboardNav` component hardcodes links — adding analytics pages requires editing `DashboardNav.tsx` AND creating the new route directory.

The org dashboard uses a different layout (shadcn sidebar) from the admin dashboard (custom sidebar). The styling is lighter (standard Tailwind, not dark gray-900).

### Admin dashboard (`/admin`) — org admins

Navigation items include: Dashboard, Command Center, Territories, Bookings, Schedule Board, Timesheets, Medics, Customers, Leads, Shift Swaps, Shift Templates, Geofences, Beacons, Conflicts, GDPR, Revenue, **Analytics**, Settings.

An Analytics page already exists at `web/app/admin/analytics/page.tsx`. It is a tabbed page with: Overview, Medics, Geofences, Alerts, Territory, Assignments, Utilisation tabs.

**For Phase 23:** The near-miss heat map and compliance trend charts for org admins should be added as new tabs to this existing Analytics page (to follow the established tabbed pattern). Alternatively, create separate sub-pages — but the tab pattern is cleaner and already set up.

### Platform admin (`/platform`)

Navigation: Dashboard, Organizations, Revenue, Analytics, Users, Settings.

Platform Analytics page exists at `web/app/platform/analytics/page.tsx`. Currently shows growth metrics and platform health. It is a plain single-page component using local `useState` — no tabs yet.

Phase 23 adds: aggregate near-miss heat map, aggregate compliance trends, top/bottom orgs table. These can be new sections on the existing platform analytics page or separate sub-pages.

---

## generate-weekly-report Edge Function

### Current location

`supabase/functions/generate-weekly-report/index.tsx`

### Current logic

1. Parses `week_ending` date from request or defaults to most recent Friday.
2. Accepts optional `org_id` parameter.
3. Calls `fetchWeeklyReportData(supabase, weekEnding)` — fetches treatments, near-misses, safety checks, compliance in parallel.
4. Renders PDF with React-PDF.
5. Uploads to storage and saves metadata to `weekly_reports` table.
6. Sends email to site manager.

### Where compliance score is computed

`supabase/functions/generate-weekly-report/queries.ts`, function `fetchWeeklyReportData`:

```typescript
const complianceScore: ComplianceScore = {
  status: calculateComplianceStatus(dailyCheckDone, riddorDeadlines, overdueFollowups, expiredCerts),
  dailyCheckDone,
  overdueFollowups,
  expiredCerts,
  riddorDeadlines,
};
```

The four input values are already available at this point in the function.

### How to add compliance score upsert (Plan 23-01)

After `complianceScore` is computed in `fetchWeeklyReportData`, the Edge Function's `index.tsx` can upsert to `compliance_score_history`:

```typescript
// Numeric score calculation (after existing complianceScore calculation)
const numericScore = 100
  - (complianceScore.dailyCheckDone ? 0 : 40)
  - (complianceScore.riddorDeadlines > 0 ? 30 : 0)
  - (complianceScore.overdueFollowups > 0 ? 20 : 0)
  - (complianceScore.expiredCerts > 0 ? 10 : 0);

// Upsert to history (week start = period_start, week_ending = period_end)
const weekStartDate = new Date(weekEnding);
weekStartDate.setDate(weekStartDate.getDate() - 6);

await supabase.from('compliance_score_history').upsert({
  org_id: orgId,  // NB: org_id must reference org_settings(org_id), not organizations.id
  vertical: 'general',
  score: numericScore,
  period_start: weekStartDate.toISOString().split('T')[0],
  period_end: weekEnding.split('T')[0],
  details: {
    formula_version: 'v1',
    daily_check_done: complianceScore.dailyCheckDone,
    riddor_deadlines: complianceScore.riddorDeadlines,
    overdue_followups: complianceScore.overdueFollowups,
    expired_certs: complianceScore.expiredCerts,
  }
}, { onConflict: 'org_id,vertical,period_start' });
```

**CRITICAL:** The `org_id` in `compliance_score_history` references `org_settings(org_id)`, but the current Edge Function fetches org from `organizations` table. These may be the same UUID, but must be verified — `org_settings` is a separate table. The upsert will fail with FK violation if the org hasn't been set up in `org_settings`.

**Also:** A unique constraint on `(org_id, vertical, period_start)` is implied by the period index, but the `upsert` `onConflict` requires an actual UNIQUE constraint or unique index to work. The migration only creates a regular index. Plan 23-01 must add: `CREATE UNIQUE INDEX IF NOT EXISTS compliance_score_history_period_unique ON compliance_score_history (org_id, vertical, period_start);`

---

## Chart & Map Patterns

### Recharts LineChart pattern (from `revenue-charts.tsx`)

```typescript
// Source: web/components/admin/revenue-charts.tsx
'use client';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export function ComplianceScoreChart({ data }: { data: WeeklyScore[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="week" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
        <YAxis domain={[0, 100]} stroke="#9CA3AF" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F3F4F6' }}
        />
        <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Recharts dynamic import pattern (from `revenue/page.tsx`)

```typescript
// Source: web/app/admin/revenue/page.tsx
const ComplianceScoreChart = dynamic(
  () => import('@/components/admin/compliance-charts').then((m) => ({ default: m.ComplianceScoreChart })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[400px] text-gray-400">Loading chart...</div> }
);
```

### React-Leaflet CircleMarker pattern (from `territory-map.tsx`)

```typescript
// Source: web/components/admin/territory-map.tsx
'use client';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Component must be loaded with dynamic({ ssr: false }) from parent page
function NearMissHeatMapInner({ points }: { points: NearMissPoint[] }) {
  return (
    <MapContainer
      center={[54.0, -2.5]}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((pt) => (
        <CircleMarker
          key={pt.id}
          center={[pt.gps_lat, pt.gps_lng]}
          radius={radiusBySeverity[pt.severity] ?? 10}
          pathOptions={{ fillColor: colorBySeverity[pt.severity], fillOpacity: 0.7, color: 'transparent' }}
        >
          <Popup>{pt.category} — {pt.severity}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
```

### Leaflet dynamic import pattern (from `admin/geofences/page.tsx`)

```typescript
// Source: web/app/admin/geofences/page.tsx
const NearMissHeatMap = dynamic(
  () => import('@/components/analytics/NearMissHeatMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-gray-900 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading map...</span>
      </div>
    ),
  }
);
```

---

## RLS Patterns

### Org-scoped queries (standard pattern)

```typescript
// Pattern from compliance.ts and weekly_report/queries.ts
// RLS is enforced automatically via JWT app_metadata.org_id
const supabase = createClient(); // client-side supabase client
const { data } = await supabase
  .from('compliance_score_history')
  .select('*')
  .order('period_start', { ascending: true });
// org_id filter is automatic via RLS policy
```

The JWT claim `app_metadata.org_id` is set at login and enforced by:
```sql
USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
```

### Platform admin queries (cross-org)

Platform admin pages use the standard `createClient()` (not service role). The RLS `is_platform_admin()` function checks `auth.jwt() -> 'app_metadata' ->> 'role' = 'platform_admin'`.

**BUT:** `compliance_score_history` has NO platform admin SELECT policy yet. Only the org member policy exists. Platform admin pages will get empty results unless a new migration adds:
```sql
CREATE POLICY "Platform admins can view all compliance scores"
  ON compliance_score_history FOR SELECT
  USING (is_platform_admin());
```

This must be part of the Phase 23 migrations.

### Near-misses RLS (both patterns confirmed)

Org scoped: `USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)`
Platform admin: `USING (is_platform_admin())` — exists in migration 107.

### Inserting compliance scores (Edge Function)

The Edge Function uses `createClient(supabaseUrl, supabaseServiceRoleKey)` — service role bypasses RLS entirely. So the upsert from the Edge Function will work regardless of RLS policies. The RLS policies only affect client-side reads.

---

## Implementation Risks

### Risk 1: compliance_score_history FK references org_settings not organizations (HIGH)
**What:** `org_id UUID NOT NULL REFERENCES org_settings(org_id)` — not `organizations`. The Edge Function queries `organizations` to get `orgId`. These may be the same UUID, but `org_settings` must have a row for that `org_id` or the INSERT will fail with FK violation.
**Mitigation:** Add a check in the upsert logic: verify the org exists in `org_settings` before upserting. Or wrap in try/catch and log the error without failing the whole report generation.

### Risk 2: No unique constraint on compliance_score_history for upsert (HIGH)
**What:** The `upsert({ onConflict: 'org_id,vertical,period_start' })` call requires a UNIQUE constraint or unique index, not just a regular index. The migration creates a regular index.
**Mitigation:** Plan 23-01 must add `CREATE UNIQUE INDEX compliance_score_history_period_unique ON compliance_score_history (org_id, vertical, period_start);` in a new migration.

### Risk 3: formula_version column does not exist (MEDIUM)
**What:** The plan text mentions a `formula_version` column in `compliance_score_history`. It does not exist. Plans that reference querying by `formula_version` will fail.
**Mitigation:** Store formula version in `details JSONB`. The planner must not generate tasks that read/write a `formula_version` column.

### Risk 4: No platform admin policy on compliance_score_history (MEDIUM)
**What:** Platform admin analytics (Plan 23-05) reads compliance scores across all orgs. The current RLS only allows org members to read their own. Platform admins will get 0 rows.
**Mitigation:** Add the policy in a migration as part of Plan 23-02 or 23-05 setup.

### Risk 5: Near-miss GPS data sparsity (LOW)
**What:** GPS columns were added in migration 124 (Phase 18). Existing near-miss records have NULL GPS. For new records, the mobile app must populate `gps_lat`/`gps_lng`. If data is sparse, the heat map shows few or no points.
**Mitigation:** The query must filter `WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL`. Show a "No GPS data yet" empty state. This is a data accumulation issue, not a code bug.

### Risk 6: Compliance trend chart has no historical data on deploy (LOW)
**What:** The first time the updated `generate-weekly-report` runs, it creates one row. The 12-month trend chart needs 52+ rows to be meaningful.
**Mitigation:** Show a "Data is accumulating — return next week" empty state for new orgs. The phase description acknowledges this.

### Risk 7: org dashboard layout vs admin dashboard layout (LOW)
**What:** The org dashboard (`/dashboard`) uses shadcn `SidebarProvider` + `DashboardNav`, while `/admin` uses a custom sidebar. Adding analytics pages to `/dashboard` requires editing `DashboardNav.tsx`. Analytics pages for org admins may better belong under `/admin/analytics` (additional tabs) rather than `/dashboard/analytics`.
**Mitigation:** The success criteria say "site manager on org dashboard can view heat map" — the org dashboard is the right place. Plan must add a nav link to `DashboardNav.tsx`.

---

## Plan-by-Plan Notes

### 23-01: Compliance score history — generate-weekly-report update

**Files to modify:**
- `supabase/functions/generate-weekly-report/queries.ts` — add numeric score calculation after `complianceScore` is built
- `supabase/functions/generate-weekly-report/index.tsx` — add upsert call after `reportData` is fetched and before PDF generation
- New migration (e.g. `130_compliance_score_unique_index.sql`) — add UNIQUE index + platform admin RLS policy

**Compliance formula to use:**
```
score = 100
  - (dailyCheckDone == false ? 40 : 0)
  - (riddorDeadlines > 0 ? 30 : 0)
  - (overdueFollowups > 0 ? 20 : 0)
  - (expiredCerts > 0 ? 10 : 0)
```

**Critical blockers to resolve in this plan:**
1. Verify that `org_settings` has a row for each `organizations.id` (check how org onboarding works)
2. Create UNIQUE index `(org_id, vertical, period_start)` before any upsert
3. Create platform admin SELECT policy on `compliance_score_history`

**`vertical` value:** Use `'general'` as the sentinel. The `vertical` column is NOT NULL — cannot be omitted.

### 23-02: Near-miss heat map (org dashboard)

**Component to create:** `web/components/analytics/NearMissHeatMap.tsx`

Use `CircleMarker` from `react-leaflet` — copy structure from `web/components/admin/territory-map.tsx`. Key differences:
- Center map on first data point or UK center (54.0, -2.5) fallback
- Radius driven by `severity`: low=6, medium=10, high=14, critical=18
- Color by severity: low=`#3B82F6`, medium=`#F59E0B`, high=`#EF4444`, critical=`#7C3AED`
- Filter: `WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL AND org_id = $org_id AND deleted_at IS NULL`
- Load with `dynamic({ ssr: false })` from parent page

**Route:** `web/app/(dashboard)/analytics/heat-map/page.tsx` (new)
OR add as a tab on `web/app/(dashboard)/dashboard/page.tsx`

**Nav update required:** Add "Analytics" entry to `web/components/dashboard/DashboardNav.tsx`

**Query:** Supabase client with org-scoped RLS — no explicit org_id filter needed (RLS handles it).

### 23-03: Near-miss heat map (platform admin)

**Component to create:** `web/components/analytics/AdminNearMissHeatMap.tsx`

Same CircleMarker approach, but:
- Read from all orgs (RLS bypassed for platform_admin role)
- Color by org: generate a color per `org_id` (use a deterministic hash or fixed palette)
- Show legend with org names

**Route:** Add a new "Heat Map" tab to `web/app/platform/analytics/page.tsx`

**Query:** No org filter — platform admin JWT gets all rows via RLS.

### 23-04: Compliance trend charts (org dashboard)

**Components to create:**
- `web/components/analytics/ComplianceScoreChart.tsx` — Recharts `LineChart`, y-axis 0-100, x-axis `period_end` formatted as "Week of DD MMM"
- `web/components/analytics/IncidentFrequencyChart.tsx` — Recharts `AreaChart`, two series: treatments count + near-misses count per week

**Data sources:**
- ComplianceScoreChart: `SELECT period_end, score FROM compliance_score_history WHERE vertical = 'general' ORDER BY period_start DESC LIMIT 52`
- IncidentFrequencyChart: `SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) FROM treatments GROUP BY week` (plus near_misses)

**Use TanStack Query** (already installed: `@tanstack/react-query ^5.90.21`) to fetch data — follow the pattern in `web/lib/queries/admin/revenue.ts` which exports custom hooks.

**Follow dynamic import pattern** from `web/app/admin/revenue/page.tsx` — lazy-load chart bundle.

### 23-05: Platform admin compliance analytics

**Page:** Extend `web/app/platform/analytics/page.tsx` with new tabs or sections

**Components:**
- Aggregate compliance trend: `LineChart` with one line per org (up to ~10 orgs practical limit)
- Top/bottom orgs table: sorted by latest `score` from `compliance_score_history`

**Query strategy:**
- Latest score per org: `SELECT DISTINCT ON (org_id) org_id, score, period_end FROM compliance_score_history ORDER BY org_id, period_start DESC`
- Join with `organizations` for org name display

**Note:** Requires platform admin RLS policy (established in 23-01 migration) to return cross-org data.

---

## Standard Stack

### Core (confirmed installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| react-leaflet | 5.0.0 | Map rendering | Installed |
| leaflet | 1.9.4 | Map engine | Installed |
| @types/leaflet | 1.9.21 | TypeScript types | Installed |
| recharts | 3.7.0 | Charts | Installed |
| @tanstack/react-query | 5.90.21 | Data fetching hooks | Installed |
| date-fns | 4.1.0 | Date formatting | Installed |

### New packages required

None. The CircleMarker fallback decision means zero new dependencies are needed.

### Do NOT install

- `leaflet.heat` — incompatible with Leaflet 1.9, unmaintained (10 years old)
- `react-leaflet-heat-layer` — targets older react-leaflet versions
- `react-leaflet-heatmap-layer-v3` — unmaintained 4 years, beta status, incompatible with react-leaflet 5

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Map rendering | Custom SVG map | `MapContainer` + `TileLayer` from react-leaflet |
| Heat effect | CSS blur tricks | `CircleMarker` with opacity + radius-by-severity |
| Chart rendering | Custom SVG charts | `LineChart` / `AreaChart` from recharts |
| Data fetching/caching | `useEffect` + `useState` | TanStack Query `useQuery` hook |
| Date arithmetic | Manual date math | `date-fns` functions |
| Org-scoping | Manual org_id WHERE clauses | Supabase RLS (automatic via JWT) |

---

## Architecture Patterns

### Recommended component structure for Phase 23

```
web/
├── components/
│   └── analytics/
│       ├── NearMissHeatMap.tsx          # Org heat map (react-leaflet)
│       ├── AdminNearMissHeatMap.tsx     # Platform admin heat map
│       ├── ComplianceScoreChart.tsx     # Recharts LineChart (org)
│       └── IncidentFrequencyChart.tsx  # Recharts AreaChart (org)
├── lib/
│   └── queries/
│       └── analytics/
│           ├── compliance-history.ts    # TanStack Query hooks for trend charts
│           └── near-miss-geo.ts         # TanStack Query hooks for heat map
└── app/
    ├── (dashboard)/
    │   └── analytics/
    │       ├── heat-map/
    │       │   └── page.tsx             # Org near-miss heat map page
    │       └── compliance/
    │           └── page.tsx             # Org trend charts page
    └── admin/
        └── analytics/
            └── page.tsx                 # EDIT: add Heat Map + Compliance tabs
```

### Map component SSR pattern (mandatory)

All react-leaflet components must be loaded with `dynamic({ ssr: false })`. This is the established project pattern in geofences, territories, and command-center pages.

```typescript
const NearMissHeatMap = dynamic(
  () => import('@/components/analytics/NearMissHeatMap'),
  { ssr: false, loading: () => <div className="h-[500px] bg-gray-900 rounded-xl animate-pulse" /> }
);
```

### Chart component lazy-load pattern

Follow `revenue/page.tsx` pattern — lazy-load chart bundle via `dynamic`:
```typescript
const ComplianceScoreChart = dynamic(
  () => import('@/components/analytics/ComplianceScoreChart').then(m => ({ default: m.ComplianceScoreChart })),
  { ssr: false, loading: () => <div className="h-[400px] bg-gray-800 animate-pulse rounded-lg" /> }
);
```

---

## Open Questions

1. **org_settings vs organizations FK**
   - What we know: `compliance_score_history.org_id` references `org_settings(org_id)`, not `organizations(id)`
   - What's unclear: Does every org that has an `organizations` row also have an `org_settings` row? The onboarding flow must create both.
   - Recommendation: Before Plan 23-01 executes, verify that `org_settings` rows exist for all orgs by checking migration history. If not, add a `ON CONFLICT DO NOTHING` guard or an existence check in the Edge Function.

2. **vertical = 'general' sentinel**
   - What we know: `vertical` is NOT NULL, compliance scores are org-wide not per-vertical
   - What's unclear: Will this value conflict with any existing vertical identifiers in the system?
   - Recommendation: Check the vertical registry TypeScript file to confirm `'general'` is not a real vertical key.

3. **Org dashboard Analytics page location**
   - What we know: The org dashboard uses shadcn sidebar with `DashboardNav.tsx`
   - What's unclear: Should heat map + trend charts be at `/dashboard/analytics/*` (new section) or embedded in existing pages like the overview page?
   - Recommendation: Create `/dashboard/analytics` as a new section with two sub-pages. Add "Analytics" nav item to `DashboardNav.tsx`.

---

## Sources

### Primary (HIGH confidence — verified from actual codebase files)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/124_vertical_schema_v4.sql` — compliance_score_history schema, near_misses GPS columns
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/00003_health_data_tables.sql` — near_misses base schema
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/00004_rls_policies.sql` — org-scoped RLS patterns
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/107_platform_admin_core_tables_rls.sql` — platform admin RLS, is_platform_admin() usage
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/101_migrate_to_platform_admin.sql` — is_platform_admin() function definition
- `/Users/sabineresoagli/GitHub/sitemedic/web/package.json` — exact library versions
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/admin/territory-map.tsx` — CircleMarker + react-leaflet pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/admin/revenue-charts.tsx` — Recharts LineChart pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/admin/assignment-analytics-charts.tsx` — Recharts LineChart/BarChart pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/admin/analytics/page.tsx` — existing admin analytics page structure
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/platform/analytics/page.tsx` — existing platform analytics page
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/admin/revenue/page.tsx` — dynamic import pattern for charts
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/admin/geofences/page.tsx` — dynamic import pattern for Leaflet
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/compliance.ts` — existing compliance formula
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/generate-weekly-report/queries.ts` — existing compliance calculation in Edge Function
- `/Users/sabineresoagli/GitHub/sitemedic/web/contexts/org-context.tsx` — useRequireOrg, useIsPlatformAdmin hooks

### Secondary (MEDIUM confidence — WebSearch verified)
- WebSearch: leaflet.heat + Leaflet 1.9 compatibility issue — confirmed via GitHub issue discussion (namespace import breakage)
- WebSearch: leaflet.heat npm — version 0.2.0, 10 years old, no maintenance
- WebSearch: react-leaflet-heatmap-layer-v3 — 4 years unmaintained, react-leaflet ^2 peerDep

---

## Metadata

**Confidence breakdown:**
- Dependency verification: HIGH — read actual migration files
- Library compatibility: HIGH — confirmed via npm metadata + GitHub issue research
- Compliance score formula: MEDIUM — existing formula confirmed, numeric conversion is a new design decision
- Dashboard structure: HIGH — read all layout and page files directly
- Edge function: HIGH — read actual source code
- RLS patterns: HIGH — read actual migration files

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days — stable domain, library versions pinned)
