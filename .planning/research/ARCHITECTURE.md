# Architecture Patterns: Multi-Vertical Integration

**Domain:** SiteMedic v2.0 — Multi-vertical expansion (Film/TV, Festivals, Motorsport, Sporting Events)
**Researched:** 2026-02-17
**Supersedes:** General offline-first architecture (2026-02-15) for this milestone
**Confidence:** HIGH — all findings verified against actual source files read during this session

---

## What Already Exists vs What Needs to Be Built

This inventory was produced by reading the actual source files. All "already exists" claims
are HIGH confidence because they cite a specific file and line range that was read.

### Already Exists (Do Not Rebuild)

| Artifact | Location | Notes |
|----------|----------|-------|
| `VERTICAL_COMPLIANCE` record with 10 verticals fully populated | `services/taxonomy/vertical-compliance.ts` | Mirrored identically to `web/lib/compliance/vertical-compliance.ts` |
| `getVerticalCompliance()`, `getPostTreatmentGuidance()`, `isRIDDORVertical()` | Both mobile and web taxonomy files | Pure functions, no side effects |
| `MECHANISM_PRESETS_BY_VERTICAL` for all 10 verticals | `services/taxonomy/mechanism-presets.ts` | Used in `new.tsx` line 393 |
| `getPatientLabel()` — "Worker" / "Crew member" / "Attendee" / etc. | `services/taxonomy/vertical-outcome-labels.ts` line 120 | Used in `new.tsx` line 395 |
| `getVerticalOutcomeCategories()` — outcome label overrides per vertical | Same file | Used in `new.tsx` line 394 |
| `CERT_TYPES` / `CERT_TYPE_INFO` (mobile) | `services/taxonomy/certification-types.ts` | 32 cert types across 7 categories |
| `UK_CERT_TYPES` / `CERT_TYPE_METADATA` (web) | `web/types/certification.types.ts` | Same 32 types, adds `renewalUrl` |
| `VERTICAL_CERT_TYPES` per-vertical recommended cert lists | Both files | `getRecommendedCertTypes()` function also exists |
| `VerticalId` TypeScript union type | `web/contexts/org-context.tsx` line 25 | 10 valid vertical strings |
| `industryVerticals: VerticalId[]` on OrgContext (web) | `web/contexts/org-context.tsx` line 47 | Fetches from `org_settings` on auth |
| Vertical-aware treatment form in `new.tsx` | `app/treatment/new.tsx` | Already uses presets/labels dynamically |
| Ad-hoc `fetchOrgVertical()` in treatment form | `app/treatment/new.tsx` lines 93–113 | Works but is per-render, should be replaced by OrgContext |
| Vertical-aware RIDDOR page | `web/app/(dashboard)/riddor/page.tsx` | Uses `useOrg().industryVerticals[0]` |
| `bookings.event_vertical` column | `supabase/migrations/123_booking_briefs.sql` | Schema column added |
| `booking_briefs.extra_fields JSONB` | Same migration | Vertical-specific brief data |
| Recharts (`^3.7.0`) | `web/package.json` line 53 | Used in 4 existing chart components |
| Leaflet + react-leaflet | `web/package.json` lines 44, 51 | Used in geofence and tracking maps |
| `dynamic(..., { ssr: false })` Leaflet pattern | `web/components/admin/GeofenceMapPicker.tsx` line 1 comment | Established pattern |
| `@react-pdf/renderer@4.3.2` in Edge Functions | `generate-weekly-report/index.tsx` line 14 | Established — `renderToBuffer()` pattern |
| Existing F2508 PDF Edge Function | `supabase/functions/riddor-f2508-generator/` | Full directory with components/, types.ts |
| Weekly report PDF Edge Function | `supabase/functions/generate-weekly-report/` | Full directory pattern |
| `OrgProvider` + `useOrg()` hook (web) | `web/contexts/org-context.tsx` | Complete, wraps app root layout |
| `AuthProvider` + `useAuth()` hook (mobile) | `src/contexts/AuthContext.tsx` | Established, in `app/_layout.tsx` |
| Root layout provider tree | `app/_layout.tsx` | GestureHandlerRoot → DatabaseProvider → AuthProvider → SyncProvider |
| WatermelonDB schema v3 | `src/database/schema.ts` | 6 tables, no `event_vertical` or GPS columns |
| WatermelonDB migrations to v3 | `src/database/migrations.ts` | v2 (worker columns), v3 (audit_log table) |
| `near_misses` table has `location TEXT` only — no GPS coords | `supabase/migrations/00003_health_data_tables.sql` line 85 | Free-text description only |
| `GET/PATCH /api/medics/[id]/certifications` API route | `web/app/api/medics/[id]/certifications/route.ts` | Annotates with status + renewal_url |

### Must Be Built

| What | File Path | Depends On |
|------|-----------|-----------|
| Mobile `OrgContext` + `useOrg()` hook | `src/contexts/OrgContext.tsx` (new) | AuthContext (user session for org_id) |
| Register `OrgProvider` in root layout | `app/_layout.tsx` (update) | OrgContext |
| `useVerticalLabels()` hook (mobile) | `src/hooks/useVerticalLabels.ts` (new) | OrgContext |
| Replace ad-hoc `fetchOrgVertical()` in `new.tsx` | `app/treatment/new.tsx` (update lines 80–113) | OrgContext |
| WatermelonDB schema v4 | `src/database/schema.ts` + `migrations.ts` | None (prerequisite for everything below) |
| `event_vertical` column in WatermelonDB `treatments` | Schema v4 migration | Schema v4 |
| GPS columns (`gps_lat`, `gps_lng`) in WatermelonDB `near_misses` | Schema v4 migration | Schema v4 |
| GPS columns on Supabase `near_misses` table | New SQL migration | Schema v4 |
| GPS capture in near-miss form | `app/safety/near-miss.tsx` (update) | expo-location (already in Expo SDK) |
| Vertical-specific conditional sections in treatment form | `app/treatment/new.tsx` (update) | OrgContext, schema v4 |
| `vertical_extra_fields` column on Supabase `treatments` | New SQL migration | None |
| `vertical_extra_fields` WatermelonDB column | Schema v4 | Above |
| `useVerticalLabels()` hook (web) | `web/hooks/useVerticalLabels.ts` (new) | Existing OrgContext |
| Cert profile UI ordering by vertical | `web/app/medic/profile/page.tsx` (update) | `VERTICAL_CERT_TYPES` (exists) |
| `compliance_score_history` table + migration | New SQL migration | None |
| Update `generate-weekly-report` to upsert score history | `supabase/functions/generate-weekly-report/index.tsx` | Above |
| `event-incident-report-generator` Edge Function | `supabase/functions/event-incident-report-generator/` | `@react-pdf/renderer` (exists) |
| `motorsport-incident-generator` Edge Function | `supabase/functions/motorsport-incident-generator/` | Same |
| `fa-incident-generator` Edge Function | `supabase/functions/fa-incident-generator/` | Same |
| `incident-report-dispatcher.ts` web utility | `web/lib/pdf/incident-report-dispatcher.ts` | Above 3 Edge Functions |
| `ComplianceScoreChart` component | `web/components/compliance/ComplianceScoreChart.tsx` | Recharts (exists), score history table |
| `IncidentFrequencyChart` component | `web/components/incidents/IncidentFrequencyChart.tsx` | Recharts (exists) |
| `NearMissHeatMap` component | `web/components/incidents/NearMissHeatMap.tsx` | Leaflet (exists), GPS data |
| `leaflet.heat` plugin install | `web/package.json` | Leaflet v1.9.4 (exists) |

---

## Architecture Decisions (Per Question)

### 1. Data Layer: Vertical Propagation to Mobile App

**Current state confirmed from source:**

`app/treatment/new.tsx` lines 93–113 fetch `org_settings.industry_verticals` fresh on every form
open via a direct Supabase query. This produces a network call per treatment session and stores
the result in local `useState` — lost when the component unmounts.

WatermelonDB schema v3 (`src/database/schema.ts`) has no `event_vertical` column on `treatments`
and no GPS columns on `near_misses`. The `bookings.event_vertical` PostgreSQL column exists but
has no mobile path.

**Decision: OrgContext on mobile; `event_vertical` in WatermelonDB treatments.**

The org-level vertical (what industry the org primarily serves) changes rarely. It should be
loaded once at auth time and held in React context — not refetched per form. This mirrors
exactly how the web `org-context.tsx` works.

The booking-level vertical should be stored in WatermelonDB `treatments.event_vertical` (added
in schema v4) so the treatment PDF can carry the correct vertical without a network call at
submission time. It is populated from navigation params when a treatment is opened from a
booking, and falls back to `OrgContext.primaryVertical` for ad-hoc treatments.

**The vertical should NOT be stored in WatermelonDB as org data.** It is session/configuration
data, not a document. React context is the correct layer.

---

### 2. Mobile App Context: VerticalContext Placement

**Decision: Extend OrgContext. No separate VerticalContext.**

A dedicated `VerticalContext` wrapping `OrgContext` adds an indirection layer with no benefit.
The vertical is a property of the org. One context provides both.

**Provider tree after change:**

```
app/_layout.tsx:

GestureHandlerRootView
  DatabaseProvider (WatermelonDB)
    AuthProvider             <- existing, src/contexts/AuthContext.tsx
      OrgProvider            <- NEW, src/contexts/OrgContext.tsx
        SyncProvider         <- existing
          BottomSheetModalProvider
            Stack (Expo Router)
```

`OrgProvider` must be inside `AuthProvider` because it reads `user.app_metadata.org_id` from
the auth session. It must be outside `SyncProvider` because the sync system can use the org
context to scope payloads (include `event_vertical` in treatment sync).

**Mobile `OrgContext` shape:**

```typescript
// src/contexts/OrgContext.tsx  (NEW FILE)
interface OrgContextValue {
  orgId: string | null;
  industryVerticals: string[];
  primaryVertical: string;   // industryVerticals[0] ?? 'general'
  loading: boolean;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  // On auth state: read user.app_metadata.org_id
  // Fetch org_settings.industry_verticals once
  // Store in state
}

export function useOrg(): OrgContextValue { ... }
```

**The `fetchOrgVertical()` function in `new.tsx` is deleted** and replaced with
`const { primaryVertical } = useOrg()`.

---

### 3. Incident Form Architecture: One Form with Conditional Sections

**Current state confirmed from source:**

`app/treatment/new.tsx` is already a single adaptive form. Lines 392–395 derive
`mechanismPresets`, `verticalOutcomes`, and `patientLabel` from `orgVertical`. Line 434 uses
`patientLabel` in the section heading. Line 438 uses it in placeholder text. The RIDDOR banner
(lines 415–421) is already conditional on `riddorFlagged`.

**Decision: One form with conditional sections. Do not create separate files per vertical.**

Separate form files per vertical would create 10 near-identical files that diverge over time.
The existing single-form approach is correct and scales to 10 verticals without structural change.

**Vertical-specific section pattern:**

```typescript
// Motorsport: race event details
{primaryVertical === 'motorsport' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Race Event Details</Text>
    <TextInput placeholder="Car / race number" ... />
    <TextInput placeholder="Circuit zone (e.g. Turn 3 hairpin)" ... />
    <TextInput placeholder="Clerk of Course name" ... />
  </View>
)}

// Festivals: triage details
{primaryVertical === 'festivals' && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Triage Details</Text>
    {/* Triage category, wristband colour picker */}
  </View>
)}

// Education: patient classification
{primaryVertical === 'education' && (
  <View style={styles.section}>
    <Text style={styles.fieldLabel}>Patient is a:</Text>
    {/* Student / Staff / Visitor radio buttons */}
  </View>
)}

// TV/Film: stunt/pyro flag
{primaryVertical === 'tv_film' && (
  <View style={styles.section}>
    <Text style={styles.fieldLabel}>Incident context</Text>
    {/* Stunt, pyrotechnic, practical fire toggle */}
  </View>
)}
```

**Vertical-specific data storage pattern:**

Vertical-specific fields (car number, triage category, student/staff classification) must persist.
Use a `vertical_extra_fields JSONB` column on the Supabase `treatments` table — the same pattern
already used in `booking_briefs.extra_fields` (migration 123). Add a matching optional string column
to WatermelonDB `treatments` in schema v4 (stored as JSON string, matching the existing `treatment_types`
pattern in the schema).

**Section visibility map:**

| Section | Condition | What it controls |
|---------|-----------|-----------------|
| Patient information | Always | Label from `getPatientLabel()` |
| Injury details | Always | Mechanism presets from `getMechanismPresets()` |
| RIDDOR warning banner | `compliance.riddorApplies && riddorFlagged` | Existing |
| Non-RIDDOR framework info | `!compliance.riddorApplies` | "Purple Guide logged" style note |
| Race / motorsport details | `primaryVertical === 'motorsport'` | Car, zone, COC |
| Triage details | `primaryVertical === 'festivals'` | Category, wristband |
| Student/staff classification | `primaryVertical === 'education'` | Patient role |
| Stunt/production context | `primaryVertical === 'tv_film'` | Stunt flag, pyro flag |
| Treatment given | Always | Multi-select, unchanged |
| Photos | Always | Unchanged |
| Outcome | Always | Labels from `getVerticalOutcomeCategories()` |
| Signature | Always | Unchanged |

---

### 4. PDF Generation Architecture: One Edge Function per Report Type

**Current state confirmed from source:**

The codebase has two PDF Edge Function patterns:
- `riddor-f2508-generator/index.ts` — dedicated function, `components/` directory, `types.ts`
- `generate-weekly-report/index.tsx` — same pattern

Both use `renderToBuffer()` from `@react-pdf/renderer@4.3.2`.

**Decision: One Edge Function per report type. Not a monolithic switch function.**

Reason: Supabase Edge Functions have cold-start costs. A monolithic function importing all PDF
templates is slower and harder to maintain. The established pattern is one function per report
type — follow it.

Verticals cluster by report type:
- **RIDDOR F2508** — `construction`, `tv_film`, `corporate`, `education`, `outdoor_adventure` → `riddor-f2508-generator` (EXISTING)
- **Event Incident Report** — `festivals`, `fairs_shows`, `private_events` → `event-incident-report-generator` (NEW)
- **Motorsport UK Report** — `motorsport` → `motorsport-incident-generator` (NEW)
- **FA/NGB Report** — `sporting_events` → `fa-incident-generator` (NEW)

**New Edge Function structure mirrors existing:**

```
supabase/functions/event-incident-report-generator/
  index.ts                      <- Deno.serve, fetches incident, calls renderToBuffer
  EventIncidentDocument.tsx     <- @react-pdf/renderer React component
  event-incident-mapping.ts     <- Maps treatment data to Purple Guide fields
  types.ts                      <- TypeScript interfaces for incident data

supabase/functions/motorsport-incident-generator/
  index.ts
  MotorsportIncidentDocument.tsx
  motorsport-mapping.ts
  types.ts

supabase/functions/fa-incident-generator/
  index.ts
  FAIncidentDocument.tsx
  fa-mapping.ts
  types.ts
```

**Web-side dispatch utility:**

```typescript
// web/lib/pdf/incident-report-dispatcher.ts
import { getVerticalCompliance } from '@/lib/compliance/vertical-compliance';

const FUNCTION_BY_FRAMEWORK: Record<string, string> = {
  'RIDDOR':           'riddor-f2508-generator',
  'riddor_plus_ofsted': 'riddor-f2508-generator',
  'purple_guide':     'event-incident-report-generator',
  'event_incident':   'event-incident-report-generator',
  'motorsport_uk':    'motorsport-incident-generator',
  'fa_incident':      'fa-incident-generator',
};

export async function generateIncidentReportPDF(
  incidentId: string,
  vertical: string,
  supabase: SupabaseClient
): Promise<{ signedUrl: string }> {
  const { primaryFramework } = getVerticalCompliance(vertical);
  const functionName = FUNCTION_BY_FRAMEWORK[primaryFramework];

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { incident_id: incidentId },
  });

  if (error) throw error;
  return data;
}
```

The `getVerticalCompliance()` function already exists in `web/lib/compliance/vertical-compliance.ts`
and the `primaryFramework` field is already defined on `VerticalComplianceConfig`. The dispatch
utility is purely glue code.

---

### 5. Certification Tracking Architecture

**Current state confirmed from source:**

`medics.certifications` is JSONB. `UK_CERT_TYPES` (32 types), `CERT_TYPE_METADATA`,
`VERTICAL_CERT_TYPES`, and `getRecommendedCertTypes()` all exist and are complete. The API
route at `web/app/api/medics/[id]/certifications/route.ts` annotates each cert with `status`
and `renewal_url`.

**The taxonomy is complete. What is missing is UI wiring.**

**Decision: No new tables. Wire existing taxonomy functions to UI.**

The `JSONB` approach for cert storage is correct. The cert types are stable configuration —
they belong in code as typed constants, not in a database table.

**What to build:**

1. The cert type selector in the admin medic edit form should call `getRecommendedCertTypes(vertical)`
   to order options — the function exists, it just needs wiring. The current `medic/profile/page.tsx`
   displays certs but the edit form type dropdown does not use vertical ordering.

2. The admin medic list should show compliance gap indicators per vertical: which medics assigned
   to motorsport bookings lack an FIA Grade cert. This is a query-layer feature, not a schema change.

3. Optional: a PostgreSQL view for compliance gap queries (avoids application-layer filtering of
   JSONB):

```sql
-- Optional view for compliance gap reporting
CREATE OR REPLACE VIEW medic_cert_gaps AS
SELECT
  m.id         AS medic_id,
  m.first_name || ' ' || m.last_name AS medic_name,
  required.vertical_id,
  required.required_cert,
  NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(m.certifications) c
    WHERE c->>'type' = required.required_cert
      AND (c->>'expiry_date')::date > CURRENT_DATE
  ) AS has_gap
FROM medics m
CROSS JOIN (VALUES
  ('motorsport',  'FIA Grade 3'),
  ('motorsport',  'Motorsport UK CMO Letter'),
  ('education',   'Paediatric First Aid'),
  ('education',   'Enhanced DBS (Children)')
) AS required(vertical_id, required_cert);
```

**What NOT to change:**

- Do not create separate cert type tables per vertical.
- Do not make `UK_CERT_TYPES` a DB table.
- The existing CSCS/CPCS construction cert tracking in the workers table (`workers.cscs_card_number`,
  `workers.cscs_expiry_date`) remains unchanged. It predates the taxonomy expansion and is only used
  for construction sites.

---

### 6. Terminology/Label Architecture: `useVerticalLabels()` Hook

**Decision: A `useVerticalLabels()` hook. Not React context, not CSS custom properties, not i18n.**

CSS custom properties are for visual theming, not domain terminology. i18n systems (react-i18next,
next-intl) solve locale/language differences, not business-domain terminology differences. The
vertical terminology is driven by which vertical an org serves — a business logic concern, not a
localization concern. Using i18n for this would be architectural overreach.

A dedicated context for labels is unnecessary because `getPatientLabel()` and related functions are
pure lookups that run in microseconds. There is nothing to memoize or subscribe to. A hook that
reads from OrgContext and calls the pure functions is the right layer.

**Mobile hook:**

```typescript
// src/hooks/useVerticalLabels.ts  (NEW FILE)
import { useOrg } from '../contexts/OrgContext';
import { getPatientLabel, getVerticalOutcomeCategories } from '../../services/taxonomy/vertical-outcome-labels';
import { getMechanismPresets } from '../../services/taxonomy/mechanism-presets';
import { getVerticalCompliance } from '../../services/taxonomy/vertical-compliance';
import { OUTCOME_CATEGORIES } from '../../services/taxonomy/outcome-categories';

export function useVerticalLabels() {
  const { primaryVertical } = useOrg();
  const compliance = getVerticalCompliance(primaryVertical);

  return {
    patientLabel:         getPatientLabel(primaryVertical),
    mechanismPresets:     getMechanismPresets(primaryVertical),
    outcomeCategories:    getVerticalOutcomeCategories(OUTCOME_CATEGORIES, primaryVertical),
    vertical:             primaryVertical,
    riddorApplies:        compliance.riddorApplies,
    frameworkLabel:       compliance.frameworkLabel,
    incidentPageLabel:    compliance.incidentPageLabel,
    reportFormLabel:      compliance.reportFormLabel,
    postTreatmentMsg:     compliance.postTreatmentGuidance,
    complianceBadgeLabel: compliance.complianceBadgeLabel,
  };
}
```

**Web hook:**

```typescript
// web/hooks/useVerticalLabels.ts  (NEW FILE)
import { useOrg } from '@/contexts/org-context';
import { getVerticalCompliance } from '@/lib/compliance/vertical-compliance';
import { getPatientLabel } from '@/lib/taxonomy/vertical-outcome-labels';

export function useVerticalLabels() {
  const { industryVerticals } = useOrg();
  const primaryVertical = industryVerticals[0] ?? 'general';
  const compliance = getVerticalCompliance(primaryVertical);

  return {
    patientLabel:         getPatientLabel(primaryVertical),
    primaryVertical,
    compliance,
    riddorApplies:        compliance.riddorApplies,
    frameworkLabel:       compliance.frameworkLabel,
    incidentPageLabel:    compliance.incidentPageLabel,
  };
}
```

**Key fact:** "Cast & Crew" for tv_film and "Attendee" for festivals are already returned by
`getPatientLabel()` (confirmed from `vertical-outcome-labels.ts` lines 122–135). The function
is complete. Only the hook wrapper and consistent usage need to be built.

---

### 7. Heat Map Architecture: Leaflet + `leaflet.heat`

**Current state confirmed from source:**

- `near_misses` table has `location TEXT` — free-text only. No GPS columns exist anywhere in
  the schema (confirmed by reading `00003_health_data_tables.sql`).
- `leaflet ^1.9.4` and `react-leaflet ^5.0.0` are installed (`web/package.json` lines 44, 51).
- The `dynamic(..., { ssr: false })` SSR bypass pattern is established in `GeofenceMapPicker.tsx`.
- `@types/leaflet` is already in devDependencies.

**GPS capture is a prerequisite.** Before any heat map can be built:

1. **New SQL migration:** `ALTER TABLE near_misses ADD COLUMN gps_lat FLOAT8, ADD COLUMN gps_lng FLOAT8;`
2. **WatermelonDB schema v4:** Add `{ name: 'gps_lat', type: 'number', isOptional: true }` and
   `{ name: 'gps_lng', type: 'number', isOptional: true }` to `near_misses` table
3. **Mobile near-miss form:** Capture GPS on form open via `expo-location.getCurrentPositionAsync()`.
   Request permission gracefully — if denied, save near-miss without GPS coordinates.
4. **Sync payload:** Include `gps_lat` and `gps_lng` in the near-miss sync payload.

**Heat map implementation: `leaflet.heat` plugin (no new mapping library).**

Since `leaflet` is already installed and actively used, `leaflet.heat` is the correct choice.
It is a 3KB plugin that adds heat layer rendering to any Leaflet map instance. Adding Mapbox or
Google Maps would introduce a second mapping library, API key dependency, and per-request billing.

**Install:**

```bash
pnpm add leaflet.heat
pnpm add -D @types/leaflet.heat
```

**Component structure (follows existing `GeofenceMapPicker.tsx` pattern):**

```typescript
// web/components/incidents/NearMissHeatMap.tsx  (import wrapper)
import dynamic from 'next/dynamic';

export const NearMissHeatMap = dynamic(
  () => import('./NearMissHeatMapInner'),
  { ssr: false }
);
```

```typescript
// web/components/incidents/NearMissHeatMapInner.tsx  (actual component)
'use client';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

type SeverityWeight = { low: number; medium: number; high: number; critical: number };
const SEVERITY_WEIGHT: SeverityWeight = { low: 0.3, medium: 0.5, high: 0.8, critical: 1.0 };

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const layer = (window.L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      gradient: { 0.4: '#3b82f6', 0.65: '#f59e0b', 1.0: '#ef4444' },
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
}

interface NearMissPoint { gps_lat: number; gps_lng: number; severity: string; }

export default function NearMissHeatMapInner({ incidents }: { incidents: NearMissPoint[] }) {
  const points: [number, number, number][] = incidents
    .filter(i => i.gps_lat != null && i.gps_lng != null)
    .map(i => [i.gps_lat, i.gps_lng, SEVERITY_WEIGHT[i.severity as keyof SeverityWeight] ?? 0.5]);

  return (
    <MapContainer center={[51.5, -0.1]} zoom={12} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.length > 0 && <HeatLayer points={points} />}
    </MapContainer>
  );
}
```

**Note on `@types/leaflet.heat`:** The types package exists on npm but has historically had
maintenance gaps. If it is missing or incomplete, a local declaration shim is sufficient:

```typescript
// web/types/leaflet-heat.d.ts
declare module 'leaflet.heat' {}
```

**Alternative with zero new packages:** Use Leaflet `CircleMarker` components scaled by severity
(radius = severity × 20, opacity = 0.4). Less visually "heat map" but zero new dependencies and
works today with existing installed packages.

---

### 8. Trend Charts Architecture: Recharts (Already Installed)

**Confirmed from source:**

`recharts ^3.7.0` is in `web/package.json` line 53. Recharts is in active use across 4 existing
components: `OverridePatternChart.tsx` (BarChart), `revenue-charts.tsx`, `medic-utilisation-charts.tsx`,
`assignment-analytics-charts.tsx`. All follow the `<ResponsiveContainer>` wrapping pattern.

**Decision: Recharts with TanStack Query. No new chart library.**

Adding Chart.js, Victory, or Nivo would create inconsistency for zero benefit. The existing
Recharts pattern is mature and consistent — follow it.

**Compliance score history chart:**

```typescript
// web/components/compliance/ComplianceScoreChart.tsx
'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

interface WeeklyScore { week_ending: string; compliance_score: number; }

export function ComplianceScoreChart({ data }: { data: WeeklyScore[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week_ending" />
        <YAxis domain={[0, 100]} unit="%" />
        <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label="Target" />
        <Tooltip formatter={(value: number) => `${value}%`} />
        <Line type="monotone" dataKey="compliance_score" stroke="#3b82f6"
              strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Incident frequency chart:**

```typescript
// web/components/incidents/IncidentFrequencyChart.tsx
'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// data shape: [{ week: 'YYYY-MM-DD', riddor: 2, event_incident: 5, near_miss: 3 }]
```

**TanStack Query data fetching (follows existing codebase pattern):**

```typescript
// In dashboard page component
const { data: scoreHistory = [] } = useQuery({
  queryKey: ['compliance-score-history', orgId],
  queryFn: () => fetchComplianceScoreHistory(orgId!),
  enabled: !!orgId,
  staleTime: 5 * 60 * 1000,  // 5 minutes — score history is not real-time
});
```

**Compliance score history table — required DB addition:**

No `compliance_score_history` table currently exists (confirmed by checking the migration files).
The `generate-weekly-report` Edge Function computes a score but does not persist it in a
queryable format. A new migration and Edge Function update are required:

```sql
-- New migration: compliance_score_history
CREATE TABLE compliance_score_history (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID        NOT NULL REFERENCES organizations(id),
  week_ending      DATE        NOT NULL,
  compliance_score INTEGER     NOT NULL CHECK (compliance_score BETWEEN 0 AND 100),
  treatment_count  INTEGER     DEFAULT 0,
  near_miss_count  INTEGER     DEFAULT 0,
  riddor_count     INTEGER     DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, week_ending)
);

CREATE INDEX idx_compliance_score_history_org_week
  ON compliance_score_history (org_id, week_ending DESC);

ALTER TABLE compliance_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_score_history"
  ON compliance_score_history FOR SELECT
  USING (org_id = get_user_org_id());
```

The `generate-weekly-report` Edge Function `index.tsx` should upsert into this table after
computing the weekly score, using `ON CONFLICT (org_id, week_ending) DO UPDATE`.

---

## Data Flow: Vertical from `org_settings` to PDF

```
org_settings.industry_verticals (JSONB array in PostgreSQL)
  │
  ├── WEB PATH:
  │   OrgProvider (web/app/layout.tsx wraps entire app)
  │     fetches org_settings once on auth
  │     → industryVerticals in OrgContext
  │     → useOrg().industryVerticals[0] = primaryVertical
  │     → getVerticalCompliance(primaryVertical) = compliance config
  │         → RIDDOR page header, cert recommendations, PDF dispatch
  │
  └── MOBILE PATH:
      OrgProvider (NEW, app/_layout.tsx inside AuthProvider)
        fetches org_settings once on auth
        → primaryVertical in OrgContext
        → useVerticalLabels() hook
            → patientLabel, mechanismPresets, outcomeCategories
            → new.tsx treatment form (replaces fetchOrgVertical())
                → Treatment record with event_vertical saved to WatermelonDB
                    → Sync to Supabase treatments table
                        → Web dashboard reads treatment
                            → incident-report-dispatcher selects PDF Edge Function
                                → Edge Function renders PDF
                                    → Signed URL → download button
```

**Booking context override:**

When a treatment is opened from a specific booking, the booking's `event_vertical` takes
precedence over the org's default vertical. This is passed as a route param:

```
/treatment/new?booking_id=xxx&event_vertical=motorsport
```

The treatment form reads the param first, falls back to `useOrg().primaryVertical`:

```typescript
const params = useLocalSearchParams();
const { primaryVertical } = useOrg();
const vertical = (params.event_vertical as string) ?? primaryVertical;
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `OrgContext` (mobile) | Provides `orgId`, `industryVerticals`, `primaryVertical` | AuthContext (depends on), all screens (provides to) |
| `OrgContext` (web, existing) | Same for web, also exposes `role`, `orgSlug` | All web pages via `useOrg()` |
| `useVerticalLabels()` (mobile + web) | Pure derivation of display labels from vertical | OrgContext (reads), form/UI (provides to) |
| `new.tsx` treatment form | Captures treatment, adapts UI to vertical | OrgContext, WatermelonDB, SyncContext |
| `taxonomy/` files | Pure lookup functions (no state, no side effects) | Used by both mobile and web |
| `incident-report-dispatcher.ts` | Routes to correct PDF Edge Function by framework | Web dashboard, Edge Functions |
| `NearMissHeatMap` | Renders GPS coordinates as Leaflet heat layer | Leaflet, TanStack Query |
| `ComplianceScoreChart` | Renders compliance trend as Recharts line chart | Recharts, TanStack Query |
| PDF Edge Functions | Render vertical-specific PDF, upload to storage | `@react-pdf/renderer`, Supabase Storage |
| `compliance_score_history` table | Persists weekly scores for trend charts | `generate-weekly-report` (writes), chart queries (reads) |

---

## Suggested Build Order

Ordered by dependency. Schema changes must precede code that uses them. Mobile context must
precede hooks that use it. Hooks must precede UI that uses them.

**Phase 1 — Schema Foundation**

Prerequisite for all form and chart work. No user-visible output yet.

1. WatermelonDB schema v4 migration: `event_vertical` on `treatments`, `gps_lat`/`gps_lng` on `near_misses`, `vertical_extra_fields` on `treatments`
2. SQL migration: `gps_lat`/`gps_lng` on Supabase `near_misses`, `vertical_extra_fields` on `treatments`
3. SQL migration: `compliance_score_history` table

**Phase 2 — Mobile Context + Form Cleanup**

Establishes the consistent vertical signal on mobile. Removes the per-render network call.

4. Mobile `OrgContext` (`src/contexts/OrgContext.tsx`)
5. Register `OrgProvider` in `app/_layout.tsx`
6. `useVerticalLabels()` hook (`src/hooks/useVerticalLabels.ts`)
7. Update `new.tsx` — replace `fetchOrgVertical()` with `useOrg()`, accept `event_vertical` route param
8. Add vertical-specific conditional sections to `new.tsx`
9. Capture `vertical_extra_fields` in form and include in sync payload

**Phase 3 — GPS Data Capture**

Enables the heat map. Must happen before the heat map page exists.

10. GPS capture in `app/safety/near-miss.tsx` (request permission, capture on open)
11. Include GPS in near-miss sync payload and WatermelonDB model

**Phase 4 — Web Dashboard Vertical Wiring**

Lower priority than mobile because the web OrgContext already works. This is polish.

12. `useVerticalLabels()` hook (web)
13. Cert profile UI: use `getRecommendedCertTypes(vertical)` in admin medic edit form type selector
14. Update `generate-weekly-report` Edge Function to upsert into `compliance_score_history`

**Phase 5 — PDF Generation for New Verticals**

Depends on Phase 2 (correct `event_vertical` in treatments) and Phase 4 (stable compliance data).

15. `event-incident-report-generator` Edge Function (festivals, fairs_shows, private_events)
16. `motorsport-incident-generator` Edge Function
17. `fa-incident-generator` Edge Function
18. `incident-report-dispatcher.ts` web utility

**Phase 6 — Analytics and Visualization**

Read-only layer. All data it visualizes must be captured first (Phases 1–5).

19. `ComplianceScoreChart` component + TanStack Query wiring
20. `IncidentFrequencyChart` component
21. Install `leaflet.heat` + `@types/leaflet.heat` (or write type shim)
22. `NearMissHeatMap` component
23. Heat map page in dashboard

---

## Open Gaps Requiring Decisions Before Implementation

| Gap | Question | Affects Phase |
|-----|----------|--------------|
| Multi-vertical org default | If an org serves both `construction` and `festivals`, which vertical does an ad-hoc treatment form default to? First in `industry_verticals` array is the current assumption — is this right? | Phase 2 |
| Booking → treatment linkage | Does the mobile app currently pass `booking_id` as a route param to `new.tsx`? If not, the booking vertical override requires adding a booking detail → new treatment navigation path. | Phase 2 |
| GPS permission UX | The near-miss form should explain why GPS is being requested ("helps identify hazard hotspots"). A denied permission should save the near-miss without coordinates — not block submission. | Phase 3 |
| Compliance score formula | What is the exact formula for `compliance_score`? The weekly report calculates it but it must be formally defined before `compliance_score_history` values are meaningful for trend analysis. | Phase 4 |
| `leaflet.heat` version compatibility | Verify `leaflet.heat` is compatible with `react-leaflet ^5.0.0` (which uses Leaflet 1.9.x). The plugin targets Leaflet 1.x so it should work, but confirm before Phase 6. | Phase 6 |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Existing code inventory (what's built) | HIGH | Every file read directly from source |
| Provider tree placement | HIGH | Read `app/_layout.tsx` and `web/app/layout.tsx` |
| WatermelonDB schema state | HIGH | Read `schema.ts` v3 and `migrations.ts` |
| No GPS on near_misses | HIGH | Read `00003_health_data_tables.sql` — `location TEXT` only |
| Recharts availability + usage | HIGH | Confirmed in `package.json` + 4 usage sites found |
| Leaflet availability + SSR pattern | HIGH | Confirmed in `package.json` + `GeofenceMapPicker.tsx` |
| `leaflet.heat` recommendation | MEDIUM | Package exists and is in active use on npm; not installed yet — version compatibility with react-leaflet 5 should be verified |
| `compliance_score_history` table absence | HIGH | Scanned all migration files, table not present |
| PDF Edge Function pattern | HIGH | Read both existing functions in full |
| Cert taxonomy completeness | HIGH | Read both certification type files — all 32 types + 7 categories present |

---

## Sources

All findings verified against these files (no external web search used for inventory claims):

- `/Users/sabineresoagli/GitHub/sitemedic/app/_layout.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/app/treatment/new.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/app/(tabs)/settings.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/src/contexts/AuthContext.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/schema.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/migrations.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/NearMiss.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-compliance.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/certification-types.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/mechanism-presets.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-outcome-labels.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/web/types/certification.types.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/web/contexts/org-context.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/layout.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/riddor/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/api/medics/[id]/certifications/route.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/medic/profile/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/compliance/vertical-compliance.ts`
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/admin/GeofenceMapPicker.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/riddor/OverridePatternChart.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/package.json`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/00003_health_data_tables.sql`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/123_booking_briefs.sql`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/generate-weekly-report/index.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/index.ts`
