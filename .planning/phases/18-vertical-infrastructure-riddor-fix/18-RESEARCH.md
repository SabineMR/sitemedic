# Phase 18: Vertical Infrastructure & RIDDOR Fix — Research

**Researched:** 2026-02-17
**Domain:** Multi-vertical mobile context, WatermelonDB schema migration, RIDDOR gating, booking vertical UI
**Confidence:** HIGH — all findings from direct source-file inspection; no external web search required for codebase inventory

---

## Summary

Phase 18 delivers vertical-awareness as a first-class platform concept. The codebase already has rich vertical configuration in TypeScript (taxonomy files, compliance rules, booking form selectors), but the mobile treatment pipeline is missing the plumbing to carry vertical data reliably from auth time through to stored records. The RIDDOR detector is a PostgreSQL trigger that fires on every treatment and has no vertical gate, making it certain to produce false RIDDOR incidents for any non-RIDDOR org. WatermelonDB schema v3 has no `event_vertical`, `vertical_extra_fields`, `booking_id`, `gps_lat`, or `gps_lng` columns — they must all be added in a single coordinated v4 migration.

The admin vertical selector already exists and works (`web/app/admin/settings/page.tsx` lines 162–197 implement `toggleVertical` / `handleSaveVerticals`). The client booking form already captures `eventVertical` via the `ShiftConfig` component, but the booking creation API (`/api/bookings/create/route.ts`) does not include `event_vertical` in its `BookingRequest` interface or the Supabase insert — it must be wired. The `incident-report-dispatcher.ts` and three new PDF Edge Functions do not exist yet and must be scaffolded from scratch.

**Primary recommendation:** Execute plans in order: schema first (18-01), then RIDDOR gate (18-02), then mobile OrgContext (18-03), then booking override wiring (18-04), then the admin/client UI gaps (18-05). The RIDDOR gate is the highest regulatory risk; it must be merged before any non-RIDDOR org is activated.

---

## Standard Stack

### Core (already installed — no new packages needed for Phase 18)

| Library | Version | Purpose | Confirmed |
|---------|---------|---------|-----------|
| `@nozbe/watermelondb` | (existing) | Mobile offline DB — schema v4 migration target | `src/database/schema.ts` v3 |
| `@react-native-async-storage/async-storage` | `2.2.0` | AsyncStorage for caching org vertical at login | `package.json` confirmed |
| `expo-location` | `~19.0.8` | GPS capture for near-misses | `package.json` confirmed |
| `expo-router` `useLocalSearchParams` | (existing) | Passing `booking_id` + `event_vertical` as route params | Used in `app/treatment/[id].tsx` line 40 |
| `@react-pdf/renderer` | `4.3.2` (Deno npm import) | PDF generation in Edge Functions | `supabase/functions/riddor-f2508-generator/index.ts` line 12 |
| `@supabase/supabase-js` | `2` | Supabase client — both web and Deno Edge Functions | All functions |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pg_net` | (Postgres extension) | Non-blocking HTTP from DB trigger | Already used in RIDDOR auto-detect trigger (migration 033) |
| `schemaMigrations` / `addColumns` / `createTable` from `@nozbe/watermelondb/Schema/migrations` | (existing) | Building the v4 migration steps | `src/database/migrations.ts` pattern |

**Installation:** No new packages required for Phase 18.

---

## Architecture Patterns

### Existing Provider Tree (mobile `app/_layout.tsx`)

```
GestureHandlerRootView
  DatabaseProvider (WatermelonDB)
    AuthProvider          ← src/contexts/AuthContext.tsx
      SyncProvider        ← src/contexts/SyncContext.tsx
        BottomSheetModalProvider
          Stack (Expo Router)
SOSButton (outside all providers)
```

**Phase 18 change:** Insert `OrgProvider` between `AuthProvider` and `SyncProvider`.

```
GestureHandlerRootView
  DatabaseProvider
    AuthProvider
      OrgProvider         ← NEW: src/contexts/OrgContext.tsx
        SyncProvider
          BottomSheetModalProvider
            Stack
SOSButton
```

`OrgProvider` must be inside `AuthProvider` because it reads `user.app_metadata.org_id` from the session. `SyncContext` depends on `useAuth()` directly (reads `auth.state`) — `OrgProvider` being above `SyncProvider` is safe.

### Pattern 1: Mobile OrgContext (new file)

**What:** Single fetch at auth time, stored in React state + AsyncStorage cache.

**When to use:** Any component needing `primaryVertical` or `orgId`.

```typescript
// Source: modelled on web/contexts/org-context.tsx + src/lib/auth-manager.ts AsyncStorage pattern
// File: src/contexts/OrgContext.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const VERTICAL_CACHE_KEY = 'sitemedic.org.vertical_cache';  // follows 'sitemedic.*' naming convention

interface OrgContextValue {
  orgId: string | null;
  industryVerticals: string[];
  primaryVertical: string;   // industryVerticals[0] ?? 'general'
  loading: boolean;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();

  useEffect(() => {
    if (!state.isAuthenticated || !state.user) return;

    const orgId = state.user.orgId;  // from cached profile (auth-manager.ts fetchUserProfile)
    if (!orgId) return;

    async function loadVertical() {
      // 1. Try AsyncStorage cache first (offline-first)
      const cached = await AsyncStorage.getItem(VERTICAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.orgId === orgId) {
          setIndustryVerticals(parsed.verticals);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch from Supabase
      const { data } = await supabase
        .from('org_settings')
        .select('industry_verticals')
        .eq('org_id', orgId)
        .single();

      if (data?.industry_verticals) {
        const verticals = data.industry_verticals as string[];
        setIndustryVerticals(verticals);
        // Cache for offline use
        await AsyncStorage.setItem(
          VERTICAL_CACHE_KEY,
          JSON.stringify({ orgId, verticals })
        );
      }
      setLoading(false);
    }

    loadVertical();
  }, [state.isAuthenticated, state.user?.orgId]);
  // ...
}
```

**Key: `state.user.orgId` comes from `authManager.getUserProfile()` → `fetchUserProfile()` which reads `profiles.org_id`. It is NOT in `app_metadata` on the mobile side.**

### Pattern 2: WatermelonDB v4 Migration

**What:** Single coordinated migration adding all vertical + GPS columns. All new columns are `isOptional: true`.

**When to use:** Schema v3 → v4. Must be done before any column is referenced in code.

```typescript
// Source: src/database/migrations.ts — follows existing v2/v3 pattern
// File: src/database/migrations.ts (update)

import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    // ... existing v2, v3 migrations ...
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'treatments',
          columns: [
            { name: 'event_vertical', type: 'string', isOptional: true },
            { name: 'vertical_extra_fields', type: 'string', isOptional: true }, // JSON string
            { name: 'booking_id', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'near_misses',
          columns: [
            { name: 'gps_lat', type: 'number', isOptional: true },
            { name: 'gps_lng', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
})
```

**Schema version must also be bumped in `src/database/schema.ts`: `version: 4`.**

### Pattern 3: RIDDOR Vertical Gate

**What:** Early-return `{ detected: false }` if the treatment's org vertical has `riddorApplies: false`.

**Where:** `supabase/functions/riddor-detector/index.ts` — after fetching the treatment record, before calling `detectRIDDOR()`.

**How vertical is determined:** The detector must fetch `org_settings.industry_verticals` using `treatment.org_id`. If the treatments table has an `event_vertical` column populated (after Phase 18 sync works), prefer that value (booking-level override). Fall back to org default.

**Exact insertion point:**

```typescript
// Source: supabase/functions/riddor-detector/index.ts lines 61-81 (insert between fetch and detectRIDDOR)
// The vertical compliance logic mirrors services/taxonomy/vertical-compliance.ts (copy is in the Edge Function bundle)

// After fetching treatment record (line ~72 currently):

// --- NEW: Vertical gate ---
// Resolve vertical: prefer booking-level event_vertical on treatment, fall back to org primary vertical
let effectiveVertical = treatment.event_vertical ?? null;

if (!effectiveVertical) {
  const { data: orgSettings } = await supabase
    .from('org_settings')
    .select('industry_verticals')
    .eq('org_id', treatment.org_id)
    .single();
  effectiveVertical = orgSettings?.industry_verticals?.[0] ?? 'general';
}

// RIDDOR only applies when riddorApplies is true for the effective vertical
const NON_RIDDOR_VERTICALS = ['festivals', 'motorsport', 'sporting_events', 'fairs_shows', 'private_events'];
if (NON_RIDDOR_VERTICALS.includes(effectiveVertical)) {
  return new Response(
    JSON.stringify({ detected: false, category: null, reason: `RIDDOR does not apply to vertical: ${effectiveVertical}` }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
// --- END vertical gate ---

// Existing: Run RIDDOR detection algorithm
const detection = detectRIDDOR({ ... });
```

**Note:** The Edge Function cannot import from `services/taxonomy/vertical-compliance.ts` (it's Deno, not Node). Use the hardcoded `NON_RIDDOR_VERTICALS` list (which matches the 5 verticals with `riddorApplies: false` confirmed from the taxonomy file). The `education` and `outdoor_adventure` verticals have `riddorApplies: true` — do not include them in the gate.

### Pattern 4: Booking Vertical Override in Treatment Form

**What:** Read `event_vertical` and `booking_id` from route params; prefer them over org default.

**Where:** `app/treatment/new.tsx` — add `useLocalSearchParams` (same as `[id].tsx` line 40).

```typescript
// Source: pattern from app/treatment/[id].tsx line 40 (useLocalSearchParams)
// + ARCHITECTURE.md section 2

import { useLocalSearchParams } from 'expo-router';
import { useOrg } from '../../src/contexts/OrgContext';

export default function NewTreatmentScreen() {
  const params = useLocalSearchParams<{ booking_id?: string; event_vertical?: string }>();
  const { primaryVertical } = useOrg();

  // Booking-level vertical takes precedence; fall back to org default
  const vertical = (params.event_vertical as string) ?? primaryVertical;
  const bookingId = params.booking_id ?? null;

  // DELETE the existing fetchOrgVertical() function entirely (lines 93-113)
  // DELETE the orgVertical state + setOrgVertical
  // DELETE fetchOrgVertical() from the useEffect

  // Replace with:
  // const vertical = (params.event_vertical as string) ?? primaryVertical;
  // (vertical replaces orgVertical everywhere below)
}
```

### Pattern 5: incident-report-dispatcher (new file)

**What:** Routes to the correct PDF Edge Function based on vertical compliance framework.

**Where:** `web/lib/pdf/incident-report-dispatcher.ts` (new — `pdf/` directory does not exist yet, create it).

**Pattern from existing:** `supabase.functions.invoke()` — same pattern used in other web utilities.

```typescript
// Source: ARCHITECTURE.md section 4 + web/contexts/org-context.tsx for supabase client pattern
// File: web/lib/pdf/incident-report-dispatcher.ts

import { getVerticalCompliance } from '@/lib/compliance/vertical-compliance';
import { createClient } from '@/lib/supabase/client';

const FUNCTION_BY_FRAMEWORK: Record<string, string> = {
  'RIDDOR':             'riddor-f2508-generator',
  'riddor_plus_ofsted': 'riddor-f2508-generator',
  'purple_guide':       'event-incident-report-generator',
  'event_incident':     'event-incident-report-generator',
  'motorsport_uk':      'motorsport-incident-generator',
  'fa_incident':        'fa-incident-generator',
};

export async function generateIncidentReportPDF(
  incidentId: string,
  vertical: string
): Promise<{ signedUrl: string }> {
  const { primaryFramework } = getVerticalCompliance(vertical);
  const functionName = FUNCTION_BY_FRAMEWORK[primaryFramework];
  if (!functionName) throw new Error(`No PDF generator for framework: ${primaryFramework}`);

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { incident_id: incidentId },
  });

  if (error) throw error;
  return data;
}
```

### Pattern 6: New Edge Function Structure

**Established pattern from:** `supabase/functions/riddor-f2508-generator/` (4 files: `index.ts`, `F2508Document.tsx`, `f2508-mapping.ts`, `types.ts`).

**Phase 18 scope: scaffold only** — stub `index.ts` + `types.ts` per function. Full PDF component deferred post-Phase 18.

```
supabase/functions/event-incident-report-generator/
  index.ts        ← Deno.serve, vertical check, return 400 for RIDDOR verticals
  types.ts        ← EventIncidentData interface

supabase/functions/motorsport-incident-generator/
  index.ts
  types.ts

supabase/functions/fa-incident-generator/
  index.ts
  types.ts
```

**Import style matches existing:**
```typescript
// Deno / npm import (matches riddor-f2508-generator/index.ts)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
```

**F2508 generator validation gate to add:**
```typescript
// In riddor-f2508-generator/index.ts — add before mapTreatmentToF2508 call
const NON_RIDDOR_VERTICALS = ['festivals', 'motorsport', 'sporting_events', 'fairs_shows', 'private_events'];
// If treatment has event_vertical and it's non-RIDDOR, return 400
if (treatment.event_vertical && NON_RIDDOR_VERTICALS.includes(treatment.event_vertical)) {
  return new Response(
    JSON.stringify({ error: `F2508 does not apply to vertical: ${treatment.event_vertical}` }),
    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

### Pattern 7: AsyncStorage Key Convention

**Existing keys in `src/lib/auth-manager.ts`:**
- `'sitemedic.auth.session'`
- `'sitemedic.auth.profile'`

**New key for OrgContext** follows same pattern:
- `'sitemedic.org.vertical_cache'`

Store as JSON: `{ orgId: string, verticals: string[] }` so cache can be invalidated if org changes.

### Anti-Patterns to Avoid

- **Do NOT** add required (non-optional) columns to WatermelonDB tables in a migration — breaks existing rows on device.
- **Do NOT** create a separate `VerticalContext` — vertical is a property of org; one context serves both.
- **Do NOT** import from `services/taxonomy/` inside Deno Edge Functions — use hardcoded constants or a bundled copy.
- **Do NOT** add `primary_vertical` to Supabase JWT `app_metadata` — the mobile side reads `profiles.org_id` to fetch org_settings; extending JWT claims requires a trigger migration that is out of scope.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline session restoration | Custom session manager | `AsyncStorage` + existing `auth-manager.ts` pattern | Pattern is already established and tested (MEMORY.md blank screen fix) |
| Vertical config DB table | New `verticals` table in Supabase | TypeScript static `Record<string, Config>` files | Already decided; vertical ID stored as string in DB |
| New mapping library for heat maps | Mapbox / Google Maps | `leaflet.heat` (separate concern, Phase 19+) | Out of Phase 18 scope |
| Per-vertical treatment form files | 10 separate `new-construction.tsx` etc. | Single `new.tsx` with conditional sections | Existing form already does this correctly |
| New charts | New chart library | Recharts (already installed, separate concern) | Out of Phase 18 scope |

---

## Common Pitfalls

### Pitfall 1: RIDDOR Trigger Fires Before `event_vertical` Column Exists in Supabase

**What goes wrong:** The WatermelonDB v4 migration adds `event_vertical` locally, but the corresponding Supabase SQL migration must also `ALTER TABLE treatments ADD COLUMN IF NOT EXISTS event_vertical TEXT`. The trigger fires on every `treatments` INSERT — if the column doesn't exist when the trigger runs, the detector falls back to org-level vertical correctly (because `treatment.event_vertical` will be NULL). But if the SQL migration is applied AFTER the column is referenced in the detector, there is no error — the fallback path handles it. Safe ordering: SQL migration first, schema v4 second.

**How to avoid:** Plan 18-01 includes both the WatermelonDB migration AND the Supabase SQL migration. Execute them together.

### Pitfall 2: OrgProvider Tries to Read User Before AuthProvider Has Loaded

**What goes wrong:** `OrgProvider` calls `useAuth()` and tries to fetch org_settings before the auth state has resolved. `state.isLoading` is `true` on first render; `state.user` is `null`. The fetch fires with `null` orgId and fails silently.

**How to avoid:** Gate the fetch on `state.isAuthenticated && !state.isLoading && state.user?.orgId`. Return early if not ready.

### Pitfall 3: WatermelonDB Migration Missing from `migrations.ts` While Schema Version is Bumped

**What goes wrong:** Developer bumps `schema.ts` version to 4 but forgets to add the `toVersion: 4` migration step. WatermelonDB throws on existing installs. The schema comment on line 3 warns about this: "When bumping schema version, add a migration adapter before production release."

**How to avoid:** `schema.ts` and `migrations.ts` must be updated in the same commit. Code review should verify `version` in `schema.ts` matches the highest `toVersion` in `migrations.ts`.

### Pitfall 4: AsyncStorage Cache Staleness — New Org Vertical Set by Admin Not Reflected on Mobile

**What goes wrong:** Medic logs in, `OrgContext` caches `['construction']` to AsyncStorage. Admin then switches org to `['motorsport']` in the web settings page. Next time the medic opens the app, OrgContext finds the cached value (still `['construction']`) and uses that. The medic sees construction presets on a motorsport shift.

**How to avoid:** Include a cache-bust check: if the Supabase fetch succeeds AND the fetched value differs from the cache, update the cache. Always attempt the network fetch and update the cache on each session start; only fall back to the cache on network error. The current `auth-manager.ts` does this for sessions — follow the same pattern.

### Pitfall 5: `event_vertical` Not Included in Sync Payload

**What goes wrong:** `treatment.eventVertical` is stored in WatermelonDB but the `enqueueSyncItem` call in `handleCompleteTreatment` (lines ~336-360 in `new.tsx`) only includes existing fields. The new `event_vertical` column on the Supabase treatments table never gets populated. The RIDDOR detector's booking-level vertical fallback (`treatment.event_vertical`) will always be NULL.

**How to avoid:** Plan 18-04 must update the `enqueueSyncItem` payload to include `event_vertical: treatment.eventVertical` and `booking_id: treatment.bookingId`.

### Pitfall 6: booking creation API doesn't persist `event_vertical`

**What goes wrong:** The booking form (`BookingForm` / `ShiftConfig`) captures `formData.eventVertical` and stores it in sessionStorage. The payment / confirmation flow uses that data to create the booking. However, `web/app/api/bookings/create/route.ts` `BookingRequest` interface has no `eventVertical` field and the Supabase insert does not include `event_vertical`. The column exists in the database (migration 123) but is never populated by the client booking flow.

**How to avoid:** Plan 18-05 must add `eventVertical?: string` to `BookingRequest` and include `event_vertical: body.eventVertical ?? null` in the Supabase insert call in `/api/bookings/create/route.ts`.

### Pitfall 7: Non-RIDDOR Verticals in `VERTICAL_COMPLIANCE` — the full list

Confirmed from `services/taxonomy/vertical-compliance.ts` (read directly):

| Vertical | `riddorApplies` | `primaryFramework` |
|----------|-----------------|--------------------|
| `construction` | `true` | RIDDOR |
| `tv_film` | `true` | RIDDOR |
| `corporate` | `true` | RIDDOR |
| `education` | `true` | riddor_plus_ofsted |
| `outdoor_adventure` | `true` | RIDDOR |
| `festivals` | `false` | purple_guide |
| `motorsport` | `false` | motorsport_uk |
| `sporting_events` | `false` | fa_incident |
| `fairs_shows` | `false` | event_incident |
| `private_events` | `false` | event_incident |

**Non-RIDDOR verticals (5):** `festivals`, `motorsport`, `sporting_events`, `fairs_shows`, `private_events`.

---

## Code Examples

### Existing: RIDDOR Detector — current structure (lines to modify)

```typescript
// Source: supabase/functions/riddor-detector/index.ts

// Current flow (no vertical check):
const { data: treatment } = await supabase.from('treatments').select('*').eq('id', treatment_id).single();
// ← INSERT vertical gate HERE (between fetch and detectRIDDOR call)
const detection = detectRIDDOR({
  injury_type: treatment.injury_type,
  body_part: treatment.body_part || '',
  severity: treatment.severity || '',
  treatment_types: treatment.treatment_types || [],
  outcome: treatment.outcome || '',
});
```

### Existing: `useLocalSearchParams` usage pattern

```typescript
// Source: app/treatment/[id].tsx lines 24, 40
import { router, useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();

// Phase 18 adds to new.tsx:
const params = useLocalSearchParams<{ booking_id?: string; event_vertical?: string }>();
```

### Existing: AsyncStorage pattern

```typescript
// Source: src/lib/auth-manager.ts lines 27, 297, 309, 321, 346
private sessionCacheKey = 'sitemedic.auth.session';  // key naming convention

await AsyncStorage.setItem(this.sessionCacheKey, JSON.stringify(session));
const cached = await AsyncStorage.getItem(this.sessionCacheKey);
if (cached) { const parsed = JSON.parse(cached); }
```

### Existing: WatermelonDB migration pattern

```typescript
// Source: src/database/migrations.ts
import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    { toVersion: 2, steps: [ addColumns({ table: 'workers', columns: [...] }) ] },
    { toVersion: 3, steps: [ createTable({ name: 'audit_log', columns: [...] }) ] },
    // Phase 18 adds toVersion: 4 here
  ],
})
```

### Existing: Admin vertical selector (fully working — no changes needed)

```typescript
// Source: web/app/admin/settings/page.tsx lines 162-197
// toggleVertical() and handleSaveVerticals() are complete and functional.
// VERT-05 (admin vertical settings) is ALREADY DONE — no work required.
```

### Existing: Booking form eventVertical capture (working — gap is only at API persistence)

```typescript
// Source: web/components/booking/shift-config.tsx lines 90, 94-101
const currentVertical = (formData.eventVertical || 'general') as BookingVerticalId;
function handleVerticalChange(verticalId: string) {
  onChange({ eventVertical: verticalId, ... });
}
// ShiftConfig renders a <select> with VERTICAL_LABELS options — fully working UI.
// Gap: web/app/api/bookings/create/route.ts BookingRequest does not include eventVertical.
```

### Existing: Supabase Edge Function invoke pattern

```typescript
// Source: (supabase.functions.invoke used in web — follow org-context.tsx client pattern)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ... },
});
```

---

## What Already Exists vs What Needs to Be Built

### VERT-05: Admin can set vertical — STATUS: ALREADY COMPLETE

`web/app/admin/settings/page.tsx` has:
- `VERTICALS` array with all 10 verticals (icons, colors, labels)
- `toggleVertical()` function
- `handleSaveVerticals()` function that PUTs to `/api/admin/settings`
- UI grid of vertical selector cards

**No work required for VERT-05.** The plan should verify it works end-to-end but not rebuild it.

### VERT-06: Client booking vertical — STATUS: PARTIAL

What exists:
- `ShiftConfig` component has a vertical `<select>` dropdown (all 11 options including `general`)
- `BookingForm` initializes `formData.eventVertical` from `prefillData.eventVertical` or `industryVerticals[0]`
- sessionStorage carries `eventVertical` to the payment step

What is missing:
- `web/app/api/bookings/create/route.ts` `BookingRequest` interface does not include `eventVertical`
- The Supabase insert in that route does not set `event_vertical`

**Work required:** Add `eventVertical?: string` to `BookingRequest` and wire it to the Supabase insert.

### incident-report-dispatcher.ts — STATUS: DOES NOT EXIST

File `web/lib/pdf/incident-report-dispatcher.ts` does not exist. The `web/lib/pdf/` directory does not exist. Must be created.

### New Edge Functions — STATUS: DO NOT EXIST

`event-incident-report-generator`, `motorsport-incident-generator`, `fa-incident-generator` — none of these directories exist in `supabase/functions/`. Phase 18 scope is scaffold only (stub `index.ts` that routes correctly and returns 400 for wrong verticals; full PDF component work is Phase 19+).

### RIDDOR detector vertical gate — STATUS: DOES NOT EXIST

`supabase/functions/riddor-detector/index.ts` has no vertical check. The trigger in migration 033 fires on every treatment INSERT or UPDATE where `injury_type IS NOT NULL`. The fix is purely additive — no existing logic is removed, only a guard is inserted before `detectRIDDOR()`.

### Mobile OrgContext — STATUS: DOES NOT EXIST (mobile)

`src/contexts/OrgContext.tsx` does not exist. Web has `web/contexts/org-context.tsx` (fully working). The mobile equivalent must be created from scratch following the same architecture but using the mobile Supabase client and AsyncStorage.

### WatermelonDB schema v4 — STATUS: NOT DONE

Schema is at v3. Treatments table: no `event_vertical`, `vertical_extra_fields`, `booking_id`. Near misses table: no `gps_lat`, `gps_lng`. Supabase `treatments` table: no `event_vertical`, `vertical_extra_fields`. This is confirmed from both `schema.ts` and `00003_health_data_tables.sql`.

---

## Exact File Locations

| Task | File Path | Action |
|------|-----------|--------|
| WatermelonDB schema | `/Users/sabineresoagli/GitHub/sitemedic/src/database/schema.ts` | Bump version 3→4; add columns |
| WatermelonDB migrations | `/Users/sabineresoagli/GitHub/sitemedic/src/database/migrations.ts` | Add `toVersion: 4` step |
| Treatment model | `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/Treatment.ts` | Add `@field('event_vertical')`, `@field('vertical_extra_fields')`, `@field('booking_id')` |
| NearMiss model | `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/NearMiss.ts` | Add `@field('gps_lat')`, `@field('gps_lng')` (as `number` type) |
| Supabase SQL migration | `supabase/migrations/124_vertical_schema_v4.sql` (new) | ALTER TABLE treatments + near_misses; add compliance_score_history |
| RIDDOR detector | `supabase/functions/riddor-detector/index.ts` | Insert vertical gate after treatment fetch |
| F2508 generator | `supabase/functions/riddor-f2508-generator/index.ts` | Add non-RIDDOR vertical validation → return 400 |
| New Edge Function (event) | `supabase/functions/event-incident-report-generator/index.ts` (new) | Scaffold |
| New Edge Function (motorsport) | `supabase/functions/motorsport-incident-generator/index.ts` (new) | Scaffold |
| New Edge Function (FA) | `supabase/functions/fa-incident-generator/index.ts` (new) | Scaffold |
| Dispatcher utility | `web/lib/pdf/incident-report-dispatcher.ts` (new) | Create |
| Mobile OrgContext | `src/contexts/OrgContext.tsx` (new) | Create |
| Root layout | `app/_layout.tsx` | Add OrgProvider between AuthProvider and SyncProvider |
| Treatment form | `app/treatment/new.tsx` | Delete `fetchOrgVertical()` (lines 93-113); add `useOrg()` + `useLocalSearchParams` |
| Sync payload | `app/treatment/new.tsx` (lines ~336-360) | Add `event_vertical`, `booking_id` to enqueueSyncItem payload |
| Booking create API | `web/app/api/bookings/create/route.ts` | Add `eventVertical` to `BookingRequest`; include in Supabase insert |
| Booking confirm route | `web/app/api/bookings/confirm/route.ts` | Verify `event_vertical` is carried through (if used) |

---

## Open Questions

1. **Vertical cache invalidation trigger**
   - What we know: OrgContext caches `industry_verticals` to AsyncStorage keyed by `orgId`.
   - What's unclear: When an admin changes the org vertical in the web settings page, there is no push notification to mobile. The cache will be stale until the medic logs out and back in, or until a forced refresh.
   - Recommendation: Invalidate on `SIGNED_IN` event (already handled in `authManager.initialize()` — it fires on every login). On `SIGNED_IN`, delete the vertical cache entry before the fetch; this ensures freshness on every login session.

2. **Does `new.tsx` currently receive `booking_id` as a route param from any navigation path?**
   - What we know: `app/_layout.tsx` declares `treatment/new` as a Stack.Screen with no custom options for params. The architecture doc says this param does not exist yet.
   - What's unclear: Does any screen currently navigate to `treatment/new` with params at all?
   - Recommendation: Search for `router.push('/treatment/new'` in the mobile codebase to identify all callers; update them to pass `booking_id` and `event_vertical` where available.

3. **Supabase `treatments` table column gap: `reference_number`, `mechanism_of_injury`, `treatment_types`**
   - What we know: These columns exist in WatermelonDB schema v3 and in the Treatment model, and are included in the sync payload (`app/treatment/new.tsx` lines 341-358). However, the Supabase migration `00003_health_data_tables.sql` does NOT include these columns in the `CREATE TABLE treatments` definition.
   - What's unclear: Were these added in a migration not found during this research? Or does the sync fail silently because the Supabase column doesn't exist?
   - Recommendation: Before writing the v4 migration, verify the actual Supabase schema via `supabase db diff` or the Supabase dashboard to confirm which columns exist. The Phase 18 SQL migration should use `ADD COLUMN IF NOT EXISTS` for all new columns.

4. **Multi-vertical org default (ARCHITECTURE.md open gap)**
   - What we know: The ARCHITECTURE.md flags this as an open question: "If an org serves both `construction` and `festivals`, which vertical does an ad-hoc treatment form default to? First in `industry_verticals` array is the current assumption."
   - Recommendation: Confirm this assumption in the plan. The current web `OrgProvider` uses `industryVerticals[0]` as primary. Mirror this on mobile. The medic can manually override via the booking override path.

---

## Sources

### Primary (HIGH confidence — files read directly)

- `/Users/sabineresoagli/GitHub/sitemedic/src/database/schema.ts` — confirmed v3, no vertical/GPS columns
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/migrations.ts` — confirmed v2+v3 only; v4 does not exist
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/Treatment.ts` — confirmed no event_vertical, booking_id, vertical_extra_fields
- `/Users/sabineresoagli/GitHub/sitemedic/src/database/models/NearMiss.ts` — confirmed no gps_lat, gps_lng
- `/Users/sabineresoagli/GitHub/sitemedic/src/contexts/AuthContext.tsx` — confirmed provider shape; `state.user.orgId` is the mobile org_id source
- `/Users/sabineresoagli/GitHub/sitemedic/src/lib/auth-manager.ts` — confirmed AsyncStorage key convention (`sitemedic.*`), profile includes `orgId`
- `/Users/sabineresoagli/GitHub/sitemedic/app/_layout.tsx` — confirmed provider tree (no OrgProvider yet)
- `/Users/sabineresoagli/GitHub/sitemedic/app/treatment/new.tsx` — confirmed `fetchOrgVertical()` at lines 93-113; no route params; sync payload missing event_vertical
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-detector/index.ts` — confirmed no vertical gate; fires on `treatment_id` alone
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-detector/detection-rules.ts` — confirmed detection logic; no vertical awareness
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-detector/types.ts` — confirmed `TreatmentInput` shape
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/riddor-f2508-generator/index.ts` — confirmed no vertical validation; `Deno.serve` + `npm:` imports
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/033_riddor_auto_detect_trigger.sql` — confirmed trigger fires on INSERT/UPDATE with `injury_type IS NOT NULL` via `pg_net`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/123_booking_briefs.sql` — confirmed `bookings.event_vertical TEXT` exists; `booking_briefs.extra_fields JSONB` pattern established
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/121_org_industry_verticals.sql` — confirmed `org_settings.industry_verticals JSONB NOT NULL DEFAULT '["construction"]'`
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/00003_health_data_tables.sql` — confirmed Supabase `treatments` table does not have `event_vertical`, `vertical_extra_fields`, `booking_id`; near_misses does not have gps columns
- `/Users/sabineresoagli/GitHub/sitemedic/web/contexts/org-context.tsx` — confirmed web OrgProvider pattern (fetch on auth, exposes `industryVerticals`); `VerticalId` type defined here
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/admin/settings/page.tsx` — confirmed VERT-05 is ALREADY COMPLETE; `toggleVertical` + `handleSaveVerticals` are fully implemented
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/booking/booking-form.tsx` — confirmed `eventVertical` in `formData`, initialized from `prefillData` or org default
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/booking/shift-config.tsx` — confirmed vertical selector dropdown is complete; gap is API persistence
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/api/bookings/create/route.ts` — confirmed `event_vertical` NOT in `BookingRequest` interface, NOT in Supabase insert
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/booking/vertical-requirements.ts` — confirmed `VERTICAL_LABELS`, `BookingVerticalId`, `VERTICAL_REQUIREMENTS` all exist
- `/Users/sabineresoagli/GitHub/sitemedic/services/taxonomy/vertical-compliance.ts` — confirmed 5 non-RIDDOR verticals: festivals, motorsport, sporting_events, fairs_shows, private_events
- `/Users/sabineresoagli/GitHub/sitemedic/.planning/research/ARCHITECTURE.md` — prior research synthesis (HIGH confidence; all claims verified against source files during that session)
- `/Users/sabineresoagli/GitHub/sitemedic/.planning/research/PITFALLS.md` — pitfall inventory (HIGH confidence; grounded in direct code inspection)

### Confirmed absent (did not find)

- `src/contexts/OrgContext.tsx` — does not exist on mobile
- `supabase/functions/event-incident-report-generator/` — does not exist
- `supabase/functions/motorsport-incident-generator/` — does not exist
- `supabase/functions/fa-incident-generator/` — does not exist
- `web/lib/pdf/incident-report-dispatcher.ts` — does not exist (directory `web/lib/pdf/` does not exist)
- `event_vertical` in Supabase `treatments` table — confirmed absent from migration 00003; no subsequent ALTER TABLE found

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| WatermelonDB schema v3 state | HIGH | Read `schema.ts` directly; all columns listed |
| Supabase treatments table state | HIGH | Read `00003_health_data_tables.sql`; no additional ALTER TABLE found in any migration |
| RIDDOR detector logic + trigger | HIGH | Read `index.ts`, `detection-rules.ts`, `types.ts`, and migration 033 in full |
| Admin vertical selector (VERT-05 complete) | HIGH | Read `web/app/admin/settings/page.tsx` in full; all logic present |
| Booking form vertical capture | HIGH | Read `booking-form.tsx` and `shift-config.tsx` |
| API persistence gap (VERT-06 incomplete) | HIGH | Read `web/app/api/bookings/create/route.ts` — `event_vertical` absent |
| AsyncStorage key convention | HIGH | Read `auth-manager.ts` lines 27-28 |
| Provider tree placement | HIGH | Read `app/_layout.tsx` in full |
| `useLocalSearchParams` pattern | HIGH | Confirmed usage in `app/treatment/[id].tsx` line 40 |
| Non-RIDDOR vertical list | HIGH | Read `services/taxonomy/vertical-compliance.ts` directly |
| incident-report-dispatcher absent | HIGH | `web/lib/pdf/` does not exist |
| New Edge Functions absent | HIGH | `ls supabase/functions/` confirmed all three are missing |

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase; no fast-moving external dependencies)
