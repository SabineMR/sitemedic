# Phase 13: UX Polish & Missing States - Research

**Researched:** 2026-02-17
**Domain:** React loading states, Leaflet map picker, real-time geofence exit alerts, RIDDOR form UX
**Confidence:** HIGH (all findings verified from codebase source files)

---

## Summary

Phase 13 has four distinct work areas, each with different complexity levels. Skeleton loaders are
straightforward: the shadcn/ui `Skeleton` component already exists at
`/components/ui/skeleton.tsx`, has an established usage pattern (see `contract-preview.tsx`), and
the pages simply need their `isLoading` plain-text guards replaced with skeleton grids. The
geofence map picker is medium complexity: `react-leaflet@5.0.0` and `leaflet@1.9.4` are already
installed with working usage in `MedicTrackingMap.tsx`, so no new libraries are needed — the
existing geofences page just needs the lat/lng text inputs replaced with a `MapContainer` +
`Marker` + `Circle` component. **CRITICAL: the geofences page currently uses column names (`lat`,
`lng`, `radius_metres`, `site_name`) that do NOT exist in the actual DB schema — the schema uses
`center_latitude`, `center_longitude`, `radius_meters`, and there is no `site_name` column.** The
geofence exit alert is straightforward: `medic_alerts` table already has the `geofence_failure`
alert type, `create_medic_alert()` DB function exists, and `useMedicLocationsStore` already
processes pings via Supabase Realtime — the only missing piece is calling
`create_medic_alert(geofence_failure)` when a ping is outside the geofence radius. RIDDOR polish
is zero-new-dependencies work: auto-save uses `useEffect` + `useRef` debounce pattern, the
`riddor_incidents` table has no audit trail table (must be created via migration), and photos live
in `treatments.photo_uris` (JSONB array of storage paths) which can be rendered using the
established pattern from `/treatments/[id]/page.tsx`.

**Primary recommendation:** All four plans can be built using only libraries and DB infrastructure
already in the project. No new npm packages required. The geofence schema mismatch must be
resolved in plan 13-02 before the map picker will save correctly.

---

## Standard Stack

### Core (Already Installed — No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@components/ui/skeleton` | shadcn/ui (project-internal) | Skeleton loading placeholders | Already installed, used in `contract-preview.tsx` |
| `react-leaflet` | 5.0.0 | Interactive map with click-to-place + Circle | Already installed, pattern established in `MedicTrackingMap.tsx` |
| `leaflet` | 1.9.4 | Core Leaflet library (peer dep) | Already installed |
| `@tanstack/react-query` | 5.90.21 | Mutation for RIDDOR auto-save | Already used in RIDDOR pages |
| `zustand` | 5.0.11 | Store for geofence exit alert logic hook | Already used for locations + alerts |
| `sonner` | 2.0.7 | Toast notifications | Already used throughout |

### No New Packages Required

All four plans use only what is already installed. The Skeleton component, Leaflet, TanStack Query,
Zustand, and Sonner are all present.

**Installation:**
```bash
# No new packages to install for this phase
```

---

## Architecture Patterns

### Recommended File Locations

```
web/
├── components/
│   ├── ui/
│   │   └── skeleton.tsx              # Already exists — import from here
│   ├── dashboard/
│   │   ├── treatments-skeleton.tsx   # NEW: 6-row skeleton for treatments table
│   │   └── workers-skeleton.tsx      # NEW: 6-row skeleton for workers table
│   ├── platform/
│   │   └── organizations-skeleton.tsx # NEW: 4-card skeleton for org grid
│   ├── admin/
│   │   ├── command-center-skeleton.tsx # NEW: full-screen skeleton for command center
│   │   └── GeofenceMapPicker.tsx     # NEW: click-to-place + resize circle map
│   └── riddor/
│       ├── RIDDORAuditTrail.tsx       # NEW: status change timeline
│       └── RIDDORPhotoGallery.tsx     # NEW: evidence photo grid
├── hooks/
│   └── useGeofenceExitMonitor.ts     # NEW: hook that checks pings vs geofences
└── app/
    ├── (dashboard)/riddor/[id]/
    │   └── page.tsx                  # MODIFY: add auto-save, audit trail, photo gallery
    ├── admin/
    │   ├── command-center/
    │   │   └── page.tsx              # MODIFY: add skeleton while map loads
    │   └── geofences/
    │       └── page.tsx              # MODIFY: replace lat/lng inputs with map picker
    └── platform/organizations/
        └── page.tsx                  # MODIFY: replace "Loading..." with card skeletons
```

### Pattern 1: shadcn/ui Skeleton — Established in Project

**What:** `animate-pulse` placeholder blocks that match the shape of real content.
**When to use:** Any `isLoading` or `loading` boolean guard that currently renders "Loading..." text.

```typescript
// Source: /web/components/ui/skeleton.tsx (project file)
// Also: /web/components/contracts/contract-preview.tsx (established usage pattern)
import { Skeleton } from '@/components/ui/skeleton';

// Table row skeleton pattern (treatments + workers):
function TableSkeleton({ rows = 6, cols = 7 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-3 border-b">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card grid skeleton (organizations — 2-col grid of cards):
function OrgCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 2: Leaflet Dynamic Import (Locked — Decision D-05.5-04-003)

**What:** All Leaflet components must be loaded via `next/dynamic` with `ssr: false`.
**Why:** Leaflet accesses `window` at import time — SSR crashes without this guard.
**Established pattern** in `command-center/page.tsx`:

```typescript
// Source: /web/app/admin/command-center/page.tsx (existing working pattern)
const GeofenceMapPicker = dynamic(
  () => import('@/components/admin/GeofenceMapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-900 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading map...</span>
      </div>
    ),
  }
);
```

### Pattern 3: Click-to-Place + Resizable Circle Map Picker

**What:** User clicks the map to set center, a `Circle` shows the radius, a radius number input
adjusts circle size. The center lat/lng and radius are synced to form state.

```typescript
// Source: Based on MedicTrackingMap.tsx patterns (/web/components/admin/MedicTrackingMap.tsx)
// react-leaflet@5.0.0 API verified
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GeofenceMapPickerProps {
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  onChange: (lat: number, lng: number, radius: number) => void;
}

// Inner component: captures map clicks (must be inside MapContainer)
function ClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function GeofenceMapPicker({ lat, lng, radiusMeters, onChange }: GeofenceMapPickerProps) {
  const center: [number, number] = lat && lng ? [lat, lng] : [51.5074, -0.1278];

  return (
    <div className="space-y-2">
      <MapContainer center={center} zoom={13} style={{ height: '300px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <ClickHandler onPlace={(newLat, newLng) => onChange(newLat, newLng, radiusMeters)} />
        {lat && lng && (
          <>
            <Marker position={[lat, lng]} icon={L.divIcon({ className: '', html: '📍', iconSize: [20, 20] })} />
            <Circle
              center={[lat, lng]}
              radius={radiusMeters}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.15 }}
            />
          </>
        )}
      </MapContainer>
      <input
        type="range"
        min={50}
        max={5000}
        value={radiusMeters}
        onChange={(e) => lat && lng && onChange(lat, lng, Number(e.target.value))}
        className="w-full"
      />
      <p className="text-xs text-gray-400">Click map to place centre · drag slider to resize ({radiusMeters}m)</p>
    </div>
  );
}
```

### Pattern 4: Geofence Exit Alert — Hook-Based Check on Ping

**What:** In `useMedicLocationsStore`, each incoming ping should be checked against all active
geofences for that booking. If outside the radius, call `create_medic_alert(geofence_failure)`.

The check uses the **Haversine formula** already implemented as `calculate_distance_meters()` in
the DB (migration 006). The client-side equivalent needs to be implemented in TypeScript:

```typescript
// Source: Haversine formula from migration 006_medic_location_tracking.sql
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

The alert insertion should call the DB RPC `create_medic_alert` (which handles deduplication):

```typescript
// Source: /supabase/migrations/008_medic_alerts.sql — create_medic_alert() function
await supabase.rpc('create_medic_alert', {
  p_medic_id: ping.medic_id,
  p_booking_id: ping.booking_id,
  p_alert_type: 'geofence_failure',
  p_alert_severity: 'high',
  p_alert_title: 'Medic Outside Geofence',
  p_alert_message: `${medicName} is ${Math.round(distanceM)}m outside the ${radiusM}m geofence for ${siteName}`,
  p_metadata: { distance_meters: distanceM, geofence_radius: radiusM, lat: ping.latitude, lng: ping.longitude },
  p_related_ping_id: ping.id,
});
```

### Pattern 5: RIDDOR Auto-Save (30-second Debounce, No Toast)

**What:** `useEffect` + `useRef` timer pattern. Any change to form fields resets a 30-second
timer. When timer fires, save silently. On unmount, save immediately.

```typescript
// Source: Standard React pattern — no external library needed
const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

// Watch for form changes
useEffect(() => {
  if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  autoSaveTimer.current = setTimeout(async () => {
    // Save without toast
    await supabase.from('riddor_incidents').update({ /* draft fields */ }).eq('id', incidentId);
  }, 30000); // 30 seconds

  return () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  };
}, [formState]); // Re-trigger on any form field change
```

### Anti-Patterns to Avoid

- **Rendering Leaflet on SSR:** Never import `MapContainer` at the top of a server component or
  page without `dynamic(..., { ssr: false })`. This crashes during build.
- **Direct `window.L` access:** Always use `import L from 'leaflet'` inside the component file,
  not globally.
- **Auto-save with toast:** The requirement is silent auto-save. Do NOT call `toast.success()` in
  the auto-save timer callback.
- **Checking geofences in the UI layer for every ping:** Fetch geofences once (at subscribe time,
  matching the medicContext pattern) and keep them in a Map for O(1) lookup per ping. Do NOT query
  the DB per ping.
- **Using `useState` for debounce timer:** Always use `useRef` for timers — `useState` triggers
  re-renders on every update.

---

## Critical Finding: Geofence Schema Mismatch

**HIGH CONFIDENCE — verified from source files**

The geofences page (`/web/app/admin/geofences/page.tsx`) uses these column names:
- `lat` (does not exist)
- `lng` (does not exist)
- `radius_metres` (does not exist — actual column is `radius_meters`)
- `site_name` (does not exist)

The actual `geofences` table (migration 006) has these columns:
- `center_latitude` (not `lat`)
- `center_longitude` (not `lng`)
- `radius_meters` (not `radius_metres`)
- `booking_id` (NOT `org_id` + `site_name` — geofences are tied to bookings, not orgs)
- `is_active`, `require_consecutive_pings`, `notes`, `created_by`

Migration 026 added `org_id` to the table but the geofences page queries `.eq('org_id', orgId)`
which should work for filtering, but the INSERT/UPDATE in the page sends `lat`, `lng`,
`radius_metres`, `site_name` which will fail because those columns don't exist.

**Resolution for plan 13-02:** Either:
1. Create a new migration that adds `lat`, `lng`, `radius_metres`, `site_name` columns and
   removes the `booking_id` requirement (org-level geofences, not booking-level), OR
2. Fix the page to use the correct column names (`center_latitude`, `center_longitude`,
   `radius_meters`) and handle the `site_name` via a `notes` field or new column.

**Recommendation:** Option 2 is safer. Use `center_latitude`, `center_longitude`, `radius_meters`,
and map `site_name` to the `notes` field (or create a new migration adding a `site_name TEXT`
column). The org-level geofences (filtered by `org_id`) concept works — migration 026 added that
column.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton animations | Custom CSS keyframes | `Skeleton` from `@/components/ui/skeleton` | Already installed, project-standard |
| Map click handler | Custom event listeners on DOM | `useMapEvents` from `react-leaflet` | Part of rl@5 API |
| Haversine distance | Alternative math | The same formula from migration 006 (JS port) | Consistent with server-side logic |
| Alert deduplication | Client-side dedup logic | DB `create_medic_alert()` RPC | Already handles 15-min dedup windows per type |
| RIDDOR audit trail table | In-memory state | New DB migration with `riddor_status_history` table | Must survive page refreshes |
| Auto-save debounce | Complex state machine | `useRef` timer + `useEffect` | Simple, no deps, works perfectly |
| Photo gallery lightbox | Custom modal with zoom | Plain Next.js `<Image>` grid + `<a target="_blank">` | Established pattern in `/treatments/[id]/page.tsx` |

**Key insight:** Every "hard" problem in this phase already has a solution in the codebase. The
work is wiring, not invention.

---

## Common Pitfalls

### Pitfall 1: Leaflet CSS Not Imported in Map Picker Component

**What goes wrong:** Marker icons appear as broken images; map tiles render but controls are
misplaced.
**Why it happens:** Leaflet requires `leaflet/dist/leaflet.css` to be imported in the component
file, not just the page.
**How to avoid:** Always include `import 'leaflet/dist/leaflet.css'` at the top of any component
that uses `MapContainer`.
**Warning signs:** Map renders but marker icon is a blank square.

### Pitfall 2: Treatments/Workers Pages Use Server-Side Fetch (No isLoading State)

**What goes wrong:** There's no `isLoading` state to conditionally render a skeleton — the page is
a server component that awaits data before rendering anything.
**Why it happens:** `TreatmentsPage` and `WorkersPage` are async server components (`async function
TreatmentsPage()`). They don't show a loading state — Next.js shows nothing until the server
fetch completes.
**How to avoid:** Add a `loading.tsx` file in the route folder (Next.js App Router convention) OR
convert the page to a client component with TanStack Query. The `loading.tsx` approach is simpler
and requires no refactoring.
**Warning signs:** Page hangs on white screen before content appears.

The pattern: create `web/app/(dashboard)/treatments/loading.tsx` exporting a skeleton component.
Next.js automatically shows this while the page's server fetch is running.

### Pitfall 3: Organizations Page Already Has Loading State — But Wrong Pattern

**What goes wrong:** `platform/organizations/page.tsx` is a client component with `loading: true`
state, but renders `"Loading organizations..."` text instead of a skeleton.
**Why it happens:** This was originally written without the skeleton requirement.
**How to avoid:** Replace the `if (loading) { return <div>Loading...</div> }` block with the
`OrgCardSkeleton` component (4 skeleton cards in 2-col grid).

### Pitfall 4: Auto-Save Firing During Initial Render

**What goes wrong:** Auto-save triggers immediately on page load because `formState` changed from
undefined to the fetched value.
**Why it happens:** `useEffect` runs after first render with the initial data.
**How to avoid:** Use a `hasInitialized` ref flag — only start the auto-save timer after the first
data fetch completes.

```typescript
const hasInitialized = useRef(false);
useEffect(() => {
  if (!hasInitialized.current) { hasInitialized.current = true; return; }
  // ... auto-save timer setup
}, [formState]);
```

### Pitfall 5: Geofence Exit Alert Flooding — Missing Dedup

**What goes wrong:** Every location ping outside the geofence creates a new alert, flooding the
admin panel with duplicate notifications every 30 seconds.
**Why it happens:** `create_medic_alert()` handles this, but only if called correctly with the same
`p_alert_type` and `p_booking_id`. The DB function already has a 15-minute deduplication window
for `geofence_failure` (uses `ELSE v_dedup_window := INTERVAL '15 minutes'` for unspecified types).
**How to avoid:** Always call `supabase.rpc('create_medic_alert', ...)` — never insert directly
into `medic_alerts` table. The dedup function is already in place.

### Pitfall 6: Command Center Page — No isLoading state at the Page Level

**What goes wrong:** Command center page (`admin/command-center/page.tsx`) doesn't have a page-level
loading state — it uses `useMedicLocationsStore` which subscribes asynchronously. The map loads
via dynamic import with its own `loading` fallback (already set to "Loading command center...").
**Why it happens:** The page itself renders immediately; the map loading is handled by `dynamic()`.
**How to avoid:** The existing `dynamic(..., { loading: ... })` is already the correct approach. For
this page, the skeleton lives inside the dynamic component's `loading` option — replace the text
with a proper skeleton that matches the two-panel layout (alert panel + map area).

### Pitfall 7: RIDDOR Audit Trail — No Existing Table

**What goes wrong:** There is no `riddor_status_history` or equivalent table in the DB. The
`riddor_incidents` table has `status`, `submitted_at`, `submitted_by` but no history of past
transitions.
**Why it happens:** Phase 6 only built the incident flagging, not status change tracking.
**How to avoid:** Create a new migration adding `riddor_status_history` table:
```sql
CREATE TABLE riddor_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES riddor_incidents(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  actor_name TEXT -- denormalized for display
);
```
And add a DB trigger on `riddor_incidents` `BEFORE UPDATE` to insert a row when `status` changes.

---

## Code Examples

### Example 1: `loading.tsx` for Treatments Page (Next.js App Router)

```typescript
// Source: Next.js App Router loading.tsx convention
// File: /web/app/(dashboard)/treatments/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function TreatmentsLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Filter row */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>
      {/* Table header */}
      <div className="flex gap-4 border-b py-3">
        {['Date', 'Worker', 'Injury Type', 'Severity', 'Outcome', 'RIDDOR', ''].map((col) => (
          <Skeleton key={col} className="h-4 flex-1" />
        ))}
      </div>
      {/* 6 skeleton rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b">
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Organizations Skeleton (Client Component Replacement)

```typescript
// Replace `if (loading) { return <div>Loading organizations...</div>; }` with:
import { Skeleton } from '@/components/ui/skeleton';

if (loading) {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full mb-6 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
            <Skeleton className="h-3 w-48 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Geofence Exit Monitor Hook

```typescript
// File: /web/hooks/useGeofenceExitMonitor.ts
// Hooks into useMedicLocationsStore ping stream and checks against geofences

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Geofence {
  id: string;
  booking_id: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  is_active: boolean;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeofenceExitMonitor() {
  // Fetch geofences once (keyed by booking_id)
  const geofencesByBooking = useRef(new Map<string, Geofence>());

  useEffect(() => {
    // Load active geofences once
    supabase
      .from('geofences')
      .select('id, booking_id, center_latitude, center_longitude, radius_meters, is_active')
      .eq('is_active', true)
      .then(({ data }) => {
        (data || []).forEach((g) => geofencesByBooking.current.set(g.booking_id, g));
      });
  }, []);

  const checkPing = async (
    medicId: string,
    bookingId: string,
    medicName: string,
    siteName: string,
    latitude: number,
    longitude: number,
    pingId?: string
  ) => {
    const geofence = geofencesByBooking.current.get(bookingId);
    if (!geofence) return; // No geofence for this booking

    const distanceM = haversineMeters(latitude, longitude, geofence.center_latitude, geofence.center_longitude);
    if (distanceM > geofence.radius_meters) {
      // Outside geofence — create alert (deduped by DB function)
      await supabase.rpc('create_medic_alert', {
        p_medic_id: medicId,
        p_booking_id: bookingId,
        p_alert_type: 'geofence_failure',
        p_alert_severity: 'high',
        p_alert_title: 'Medic Outside Geofence',
        p_alert_message: `${medicName} is ${Math.round(distanceM)}m outside the ${geofence.radius_meters}m boundary for ${siteName}`,
        p_metadata: { distance_meters: Math.round(distanceM), geofence_radius: geofence.radius_meters },
        p_related_ping_id: pingId ?? null,
      });
    }
  };

  return { checkPing };
}
```

### Example 4: RIDDOR Status History — Required Migration

```sql
-- File: supabase/migrations/119_riddor_status_history.sql

CREATE TABLE riddor_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES riddor_incidents(id) ON DELETE CASCADE,
  from_status  TEXT,  -- NULL for initial creation
  to_status    TEXT NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by   UUID REFERENCES auth.users(id),
  actor_name   TEXT -- denormalized display name (e.g., "Kai Jensen")
);

CREATE INDEX idx_riddor_status_history_incident ON riddor_status_history(incident_id, changed_at DESC);

-- Trigger: auto-insert history row when riddor_incidents.status changes
CREATE OR REPLACE FUNCTION log_riddor_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO riddor_status_history (incident_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_riddor_status_history
  AFTER UPDATE ON riddor_incidents
  FOR EACH ROW EXECUTE FUNCTION log_riddor_status_change();

ALTER TABLE riddor_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org users can view their org's status history"
  ON riddor_status_history FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM riddor_incidents WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
```

### Example 5: RIDDOR Photo Gallery (Established Pattern from /treatments/[id])

Photos for RIDDOR incidents come from `treatments.photo_uris` (JSONB array of storage paths).
The incident already joins `treatments (*)` in `fetchRIDDORIncident()`.

```typescript
// Source: /web/app/(dashboard)/treatments/[id]/page.tsx — lines 67-70
// Established pattern for Supabase Storage photo URLs:
const photoUrls = (incident.treatments.photo_uris || []).map((path: string) =>
  supabase.storage.from('treatment-photos').getPublicUrl(path).data.publicUrl
);

// Render (same pattern as treatment detail page):
{photoUrls.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Evidence Photos ({photoUrls.length})</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {photoUrls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <div className="relative aspect-square overflow-hidden rounded-lg border hover:opacity-80 transition">
              <Image src={url} alt={`Evidence photo ${i + 1}`} fill className="object-cover"
                     sizes="(max-width: 640px) 100vw, 33vw" />
            </div>
          </a>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

---

## Current State of Each File (What Exists, What's Missing)

### 13-01: Skeleton Loaders

| Page | File | Loading Pattern | What's Missing |
|------|------|----------------|----------------|
| Treatments | `/app/(dashboard)/treatments/page.tsx` | Server component — no loading state visible | `loading.tsx` in same folder |
| Workers | `/app/(dashboard)/workers/page.tsx` | Server component — no loading state visible | `loading.tsx` in same folder |
| Organizations | `/app/platform/organizations/page.tsx` | Client component with `loading` state → renders "Loading organizations..." text (line 72-78) | Replace with `OrgCardSkeleton` |
| Command Center | `/app/admin/command-center/page.tsx` | `dynamic()` `loading` prop renders "Loading command center..." text | Replace dynamic `loading` with skeleton layout |

**Key insight for treatments and workers:** These are async server components. The loading state
is handled by Next.js App Router `loading.tsx` convention — create a file named `loading.tsx` in
the same directory. No changes to the page file itself required.

### 13-02: Geofence Map Picker

| Aspect | Current State | What Needs Adding |
|--------|--------------|-------------------|
| Lat/lng inputs | Lines 186-216: plain `<input type="number">` for lat, lng, radius | Replace with `GeofenceMapPicker` component |
| Map library | `react-leaflet@5.0.0` installed, `leaflet@1.9.4` installed | Just import and use |
| Dynamic import | Not done in geofences page | Must add `dynamic(..., { ssr: false })` |
| Schema mismatch | Page inserts `lat`, `lng`, `radius_metres`, `site_name` | **MUST FIX** — use `center_latitude`, `center_longitude`, `radius_meters` |
| Form state | `form: { site_name, lat, lng, radius_metres }` | Update to `{ site_name, center_latitude, center_longitude, radius_meters }` |

### 13-03: Geofence Exit Alerts

| Aspect | Current State | What Needs Adding |
|--------|--------------|-------------------|
| `medic_alerts` table | Exists with `geofence_failure` type (migration 008) | Nothing |
| `create_medic_alert()` DB function | Exists with deduplication (migration 008) | Nothing |
| `useMedicAlertsStore` | Exists, subscribes to `medic_alerts` realtime, shows in AlertPanel | Nothing |
| Geofence exit detection | **Does not exist** | New hook `useGeofenceExitMonitor` |
| Ping processing | In `useMedicLocationsStore.subscribe()` — lines 207-228 | Call `checkPing()` inside the ping handler |
| Geofence data loading | Not loaded client-side | Load once at subscribe time in monitor hook |
| Geofence coverage analytics | Not yet implemented | Calculate `count(distinct booking_id) / count(all bookings)` |

### 13-04: RIDDOR Polish

| Aspect | Current State | What Needs Adding |
|--------|--------------|-------------------|
| Auto-save | Not implemented — no timer logic | 30s debounce timer with `useRef` |
| Audit trail table | **Does not exist** | New migration `119_riddor_status_history.sql` |
| Audit trail UI | Not implemented | `RIDDORAuditTrail` component |
| Photo gallery | Not shown on RIDDOR detail page | Read from `incident.treatments.photo_uris`, render with `Image` |
| `f2508_pdf_path` | Stored in `riddor_incidents.f2508_pdf_path` | Already available |

---

## DB Tables — Exact Column Names

### `geofences` (migration 006 + migration 026)
```
id                  UUID PRIMARY KEY
booking_id          UUID NOT NULL REFERENCES bookings(id)   ← ties to specific booking
org_id              UUID REFERENCES organizations(id)        ← added by migration 026
center_latitude     DECIMAL(10,8) NOT NULL
center_longitude    DECIMAL(11,8) NOT NULL
radius_meters       DECIMAL(6,2) NOT NULL DEFAULT 75.00
require_consecutive_pings INT DEFAULT 3
is_active           BOOLEAN DEFAULT TRUE
created_by          UUID REFERENCES auth.users(id)
notes               TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### `medic_alerts` (migration 008)
```
id                  UUID PRIMARY KEY
medic_id            UUID NOT NULL REFERENCES medics(id)
booking_id          UUID NOT NULL REFERENCES bookings(id)
alert_type          TEXT CHECK (...'geofence_failure'...)
alert_severity      TEXT CHECK ('low'|'medium'|'high'|'critical')
alert_title         TEXT NOT NULL
alert_message       TEXT NOT NULL
triggered_at        TIMESTAMPTZ
related_event_id    UUID REFERENCES medic_shift_events(id)
related_ping_id     UUID REFERENCES medic_location_pings(id)
metadata            JSONB
is_dismissed        BOOLEAN DEFAULT FALSE
dismissed_at        TIMESTAMPTZ
dismissed_by        UUID REFERENCES auth.users(id)
dismissal_notes     TEXT
is_resolved         BOOLEAN DEFAULT FALSE
resolved_at         TIMESTAMPTZ
resolved_by         UUID REFERENCES auth.users(id)
resolution_notes    TEXT
auto_resolved       BOOLEAN DEFAULT FALSE
created_at          TIMESTAMPTZ
```

### `riddor_incidents` (migration 018)
```
id                  UUID PRIMARY KEY
treatment_id        UUID NOT NULL REFERENCES treatments(id)
worker_id           UUID NOT NULL REFERENCES workers(id)
org_id              UUID NOT NULL REFERENCES organizations(id)
category            TEXT CHECK ('specified_injury'|'over_7_day'|'occupational_disease'|'dangerous_occurrence')
confidence_level    TEXT CHECK ('HIGH'|'MEDIUM'|'LOW')
auto_flagged        BOOLEAN
medic_confirmed     BOOLEAN (NULL = pending)
override_reason     TEXT
overridden_by       UUID REFERENCES profiles(id)
overridden_at       TIMESTAMPTZ
deadline_date       DATE
status              TEXT CHECK ('draft'|'submitted'|'confirmed') DEFAULT 'draft'
f2508_pdf_path      TEXT
submitted_at        TIMESTAMPTZ
submitted_by        UUID REFERENCES profiles(id)
detected_at         TIMESTAMPTZ
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**NOTE: No audit trail / status history table exists for RIDDOR.** Must create via migration.

### `treatments` (migration 00003)
```
photo_uris          JSONB DEFAULT '[]'  ← array of Supabase Storage paths
```
Photos for RIDDOR incidents come from this column via `treatments` join, using bucket `treatment-photos`.

### `org_settings` (migration 118)
```
geofence_default_radius  INTEGER NOT NULL DEFAULT 200  ← used by geofences page to prefill radius
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| "Loading..." text in isLoading guard | `loading.tsx` (server) or skeleton (client) | No layout shift, perceivably faster |
| Manual lat/lng inputs | Click-to-place Leaflet map | Non-technical users can set geofences |
| Spinner `border-t-transparent animate-spin` (geofences list) | shadcn `Skeleton` component | Consistent with design system |

**Deprecated/outdated:**
- Plain spinner div in geofences list (line 241): `<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />` — replace with Skeleton rows.

---

## Open Questions

1. **Geofence schema resolution for org-level vs booking-level geofences**
   - What we know: Migration 006 created booking-level geofences (`booking_id NOT NULL`). Migration 026 added `org_id`. The page treats them as org-level (filtering by `org_id`, showing `site_name`).
   - What's unclear: Should a new migration make `booking_id` nullable and add `site_name`? Or should the page be fixed to require a booking?
   - Recommendation: Add migration `119_geofence_schema_fix.sql` that adds `site_name TEXT` column and makes `booking_id` nullable (org-level geofences are a valid use case for admin-configured boundaries).

2. **Geofence coverage analytics % calculation**
   - What we know: The requirement asks for "% of booking sites covered by at least one active geofence"
   - What's unclear: "Coverage" could mean bookings with a matching geofence, or org bookings where `site_latitude` is within any geofence radius
   - Recommendation: Calculate as `count(distinct b.id) FILTER (WHERE EXISTS (SELECT 1 FROM geofences g WHERE g.booking_id = b.id AND g.is_active = TRUE)) / count(distinct b.id)` scoped to today's or recent bookings

3. **RIDDOR audit trail actor_name denormalization**
   - What we know: `auth.users` doesn't expose `first_name`/`last_name` directly — profiles table has this
   - What's unclear: Whether the trigger can join `profiles` to denormalize the name
   - Recommendation: The trigger should insert `changed_by` (UUID), then the query joins `profiles` for display name. No denormalization needed.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `/web/app/(dashboard)/treatments/page.tsx` — server component, no isLoading, needs `loading.tsx`
- `/web/app/(dashboard)/workers/page.tsx` — server component, no isLoading, needs `loading.tsx`
- `/web/app/platform/organizations/page.tsx` — client component, `loading` state → "Loading..." text (line 72)
- `/web/app/admin/command-center/page.tsx` — dynamic import with text loading fallback (line 23)
- `/web/app/admin/geofences/page.tsx` — uses wrong column names; full form reviewed
- `/web/app/(dashboard)/riddor/[id]/page.tsx` — no auto-save, no audit trail, no photos
- `/web/app/(dashboard)/riddor/page.tsx` — uses "Loading incidents..." text (line 133)
- `/web/components/ui/skeleton.tsx` — component exists, `animate-pulse rounded-md bg-primary/10`
- `/web/components/contracts/contract-preview.tsx` — established Skeleton usage pattern
- `/web/components/admin/MedicTrackingMap.tsx` — react-leaflet usage pattern, dynamic import
- `/web/stores/useMedicLocationsStore.ts` — ping processing logic, medicContext pattern
- `/web/stores/useMedicAlertsStore.ts` — MedicAlert interface with `geofence_failure` type
- `/web/lib/queries/riddor.ts` — `fetchRIDDORIncident()` joins `treatments (*)` including `photo_uris`
- `/web/app/(dashboard)/treatments/[id]/page.tsx` — photo gallery pattern with Supabase Storage
- `/supabase/migrations/006_medic_location_tracking.sql` — authoritative `geofences` table schema
- `/supabase/migrations/008_medic_alerts.sql` — `medic_alerts` table + `create_medic_alert()` RPC
- `/supabase/migrations/018_riddor_incidents.sql` — `riddor_incidents` table schema
- `/supabase/migrations/026_add_org_id_columns.sql` — `geofences.org_id` addition
- `/web/package.json` — `react-leaflet@^5.0.0`, `leaflet@^1.9.4`, `zustand@^5.0.11`, `@tanstack/react-query@^5.90.21`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from `package.json` and `node_modules`
- Architecture: HIGH — all patterns verified from existing working code
- Pitfalls: HIGH — all based on direct codebase reading, not assumptions
- DB schema: HIGH — verified from actual migration files

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable — no fast-moving dependencies)
