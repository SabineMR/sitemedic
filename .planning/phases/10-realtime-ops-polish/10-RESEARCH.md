# Phase 10: Real-Time Operations Polish - Research

**Researched:** 2026-02-17
**Domain:** Zustand store joins, Leaflet map markers, Stripe retry, alert panel UX, React escalation timers
**Confidence:** HIGH — all findings verified directly from codebase

---

## Summary

This phase fixes three operational gaps that make the live command centre incomplete for real-world use. All five tasks operate on code that already exists and is partially working — this is polish and completion, not new infrastructure. No new third-party libraries are needed.

**Task 10-01** resolves a TODO at `useMedicLocationsStore.ts:153`. The store receives Supabase Realtime pings but only stores raw coordinates; medic name, photo, site name, and shift times are never joined. The fix requires a one-time initial query with join, plus a lookup function called on each new realtime ping.

**Task 10-02** enhances the Leaflet popup already present in `MedicTrackingMap.tsx` to show shift context. The popup already renders `medic.medic_name` and `medic.site_name` — it just needs shift time added, which will be available once Task 10-01 is done.

**Task 10-03** improves the payment failure UX in `payment-form.tsx`. Stripe's `confirmPayment` already handles the retry case — when a PaymentIntent has already been created, calling `stripe.confirmPayment` with the same `clientSecret` retries the same intent. The form just needs state tracking and a Retry button.

**Tasks 10-04 and 10-05** build on `AlertPanel.tsx` which already has the dismiss/resolve note infrastructure scaffolded (`dismissNote`, `resolveNote` state) and the store already accepts `notes` params. Missing pieces: note fields are not shown by default (only after first click), bulk dismiss selection UI, suggested action copy per alert type, escalation timer with CSS pulsing, and the contact button fallback.

**Primary recommendation:** Work tasks in order (10-01 through 10-05) — each task's data feeds the next.

---

## Standard Stack

All libraries are already installed. No new dependencies needed.

### Core (already in `web/package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.11 | Medic locations + alerts store | Already used for both stores |
| @supabase/supabase-js | ^2.95.3 | Realtime channel, DB queries | Project standard |
| react-leaflet | ^5.0.0 | Map markers and popups | Already used in MedicTrackingMap |
| leaflet | ^1.9.4 | Leaflet core | Already used |
| @stripe/react-stripe-js | ^5.6.0 | Payment Element | Already used in payment-form |
| @stripe/stripe-js | ^8.7.0 | loadStripe, confirmPayment | Already used |
| tailwindcss | ^3.4.17 | Styling (including animate-pulse) | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.564.0 | Icons for alert panel actions | Available, use for action buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `animate-pulse` for escalation | JS polling + class toggle | CSS is simpler and already available via Tailwind |
| Inline `setTimeout` for escalation | `useInterval` hook | `setTimeout` is fine; cleanup via `useEffect` return |

**Installation:** No new packages required.

---

## Architecture Patterns

### Pattern 1: Resolving the Location Store TODO (Task 10-01)

**What:** On store initialisation, fetch all active medics with their booking context via a joined query. On each incoming Realtime ping, look up the already-fetched medic context and merge it into the location update.

**Why this approach:** The Realtime channel fires on `INSERT` into `medic_location_pings`, which only contains `medic_id`, `booking_id`, and raw coordinates — no names or shift times. There are two options:

1. **Join on every ping** — fetch medic + booking on each ping arrival (expensive, N+1)
2. **Initial fetch + cache in store** — fetch active bookings with medic join once on subscribe, store a lookup Map, merge on each ping (correct approach)

Option 2 is correct. The store already has `locations: Map<string, MedicLocation>` keyed by `medic_id`. A second `medicContext: Map<string, MedicContext>` keyed by `medic_id` should be added and populated at subscribe time.

**The join query to run at subscribe time:**

```typescript
// Source: supabase/migrations/002_business_operations.sql + 006_medic_location_tracking.sql
// Join: bookings -> medics (medic_id FK on bookings)
const { data } = await supabase
  .from('bookings')
  .select(`
    id,
    site_name,
    shift_start_time,
    shift_end_time,
    medic_id,
    medics!inner (
      id,
      first_name,
      last_name,
      phone
    )
  `)
  .eq('status', 'in_progress')  // Only shifts currently running
  .gte('shift_date', new Date().toISOString().split('T')[0]);  // Today

// Build lookup Map: medic_id -> { medic_name, site_name, shift_start_time, shift_end_time }
```

**On each incoming ping, merge context:**

```typescript
// In the postgres_changes handler at line 145 of useMedicLocationsStore.ts
const context = get().medicContext.get(ping.medic_id);

get().updateLocation(ping.medic_id, {
  medic_id: ping.medic_id,
  latitude: ping.latitude,
  longitude: ping.longitude,
  accuracy_meters: ping.accuracy_meters,
  battery_level: ping.battery_level,
  connection_type: ping.connection_type,
  recorded_at: ping.recorded_at,
  // Now populated from context:
  medic_name: context?.medic_name ?? 'Unknown Medic',
  booking_id: context?.booking_id ?? ping.booking_id,
  site_name: context?.site_name ?? 'Unknown Site',
  shift_start_time: context?.shift_start_time,
  shift_end_time: context?.shift_end_time,
});
```

**Confidence:** HIGH — verified from schema that `bookings` has `medic_id`, `site_name`, `shift_start_time`, `shift_end_time`, and `medics` has `first_name`, `last_name`, `phone`.

**Note on photo:** The `medics` table does NOT have a `photo` or `avatar` column (verified by searching all migrations). The CONTEXT.md requirement mentions "photo" — this should be treated as out of scope or the column needs to be added. Research recommendation: skip photo for this phase, planner should flag this as a deferred item.

### Pattern 2: Map Marker Popup Enhancement (Task 10-02)

**What:** Add shift time to the existing Leaflet Popup in `MedicTrackingMap.tsx`. The popup already renders name and site. Just add a line for shift time.

**The MedicLocation interface** needs two new optional fields:
```typescript
shift_start_time?: string;  // e.g., "07:00:00"
shift_end_time?: string;    // e.g., "15:00:00"
```

**Popup enhancement (inside the existing `<Popup>` JSX):**
```tsx
// Source: web/components/admin/MedicTrackingMap.tsx — existing Popup pattern
{medic.shift_start_time && medic.shift_end_time && (
  <div>
    Shift:{' '}
    <span className="font-medium">
      {medic.shift_start_time.slice(0, 5)}–{medic.shift_end_time.slice(0, 5)}
    </span>
  </div>
)}
```

**Note:** `shift_start_time` is a PostgreSQL `TIME` type, which Supabase returns as `"07:00:00"` — slice to 5 characters for `"07:00"` display.

**Confidence:** HIGH — verified from migration 002 that shift times are `TIME NOT NULL` columns.

### Pattern 3: Stripe Payment Retry (Task 10-03)

**What:** When payment fails, show a Retry button. Clicking it calls `stripe.confirmPayment` again with the same `clientSecret` already held in `<Elements>` context. Stripe handles idempotency — re-confirming the same PaymentIntent is safe.

**How Stripe handles retry:** A PaymentIntent goes through `requires_payment_method` → `requires_confirmation` → `requires_action` (3DS) → `succeeded` / `payment_failed`. When `confirmPayment` returns a `submitError`, the PaymentIntent status resets to `requires_payment_method`. Calling `stripe.confirmPayment` again with the same elements re-attempts correctly.

**The key insight:** The `clientSecret` is already in scope in `CheckoutForm` because it's passed via `<Elements options={{ clientSecret }}>`. The PaymentElement auto-resets after a failure. A retry button simply calls the same `handleSubmit` function again.

**Pattern for retry button:**
```tsx
// Source: web/components/booking/payment-form.tsx — extend existing CheckoutForm
const [paymentFailed, setPaymentFailed] = useState(false);

// In handleSubmit:
if (submitError) {
  setError(submitError.message || 'Payment failed');
  setPaymentFailed(true);  // Show retry UI
  setLoading(false);
}

// In JSX after error display:
{paymentFailed && (
  <Button type="submit" variant="outline" disabled={loading}>
    Try Again
  </Button>
)}
```

**Reference number:** The `bookingId` is already in scope in `CheckoutForm` (passed as prop). Display it as the reference number.

**Support mailto:** Use `mailto:support@sitemedic.co.uk?subject=Payment%20Issue%20-%20Ref%20${bookingId}` or whatever the support email env var is.

**Confidence:** HIGH — verified that `bookingId` is already a prop to `CheckoutForm`, `clientSecret` is in `<Elements>` context, and Stripe's `confirmPayment` safely re-attempts.

### Pattern 4: Alert Panel Notes + Bulk Dismiss (Task 10-04)

**What:** The `AlertPanel.tsx` already has the dismiss/resolve note state (`dismissNote`, `resolveNote`) and the two-step confirm flow. What's missing:

1. The text input is hidden until after first "Dismiss" click — the UX should show the input immediately when dismiss is initiated, which it already does. Confirm this works end-to-end.
2. **Bulk dismiss** — add a selection state (`selectedAlertIds: Set<string>`) and a "Select All Non-Critical" button that bulk-calls `dismissAlert` for each.

**Bulk dismiss pattern:**
```typescript
// In AlertPanel component state
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Non-critical = severity 'low' or 'medium'
const nonCriticalAlerts = alerts.filter(
  a => a.alert_severity === 'low' || a.alert_severity === 'medium'
);

const handleBulkDismiss = async () => {
  await Promise.all(
    Array.from(selectedIds).map(id => dismissAlert(id, 'Bulk dismissed'))
  );
  setSelectedIds(new Set());
};
```

**Confirmed:** `dismissAlert` in `useMedicAlertsStore.ts` already accepts `notes?: string` and writes `dismissal_notes` to the DB. Same for `resolveAlert` with `resolution_notes`.

**Confidence:** HIGH — verified by reading both `AlertPanel.tsx` (the UI state) and `useMedicAlertsStore.ts` (the store actions) and `008_medic_alerts.sql` (the DB columns).

### Pattern 5: Alert Escalation Timer (Task 10-05)

**What:** Alerts unacknowledged after 15 minutes should show a red pulsing highlight. This is a pure client-side timer — no DB changes needed for the visual. The `triggered_at` and `seconds_since_triggered` are already on each `MedicAlert`.

**Escalation check:**
```typescript
// In AlertPanel render, per alert:
const isEscalated = !alert.is_dismissed && alert.seconds_since_triggered >= 900; // 15 min

// CSS class when escalated:
className={`${style.bg} border ${style.border} rounded-lg p-4 ${
  isEscalated ? 'animate-pulse border-red-600 bg-red-900/20' : ''
}`}
```

**Live timer refresh:** The `seconds_since_triggered` from the DB view is calculated at fetch time and doesn't update live. To make escalation trigger in real time (not just on next alert fetch), add a `useEffect` with a 60-second interval that forces re-render:

```typescript
const [tick, setTick] = useState(0);
useEffect(() => {
  const interval = setInterval(() => setTick(t => t + 1), 60_000);
  return () => clearInterval(interval);
}, []);
// Use tick in render so component re-evaluates escalation
```

**Sound on escalation:** The store already has `playAlertSound(severity)`. Call it when an alert crosses the 15-minute threshold using a ref to track which alerts have already triggered the escalation sound.

**Suggested actions per alert type:**

```typescript
// Source: web/components/admin/AlertPanel.tsx — add alongside getAlertIcon
const SUGGESTED_ACTIONS: Record<string, string> = {
  battery_low: 'Contact medic to ensure charging',
  battery_critical: 'Call medic immediately',
  late_arrival: 'Call medic — may need replacement',
  early_departure: 'Call medic to confirm departure reason',
  connection_lost: 'Call medic — may need assistance',
  not_moving_20min: 'Call medic to check status',
  geofence_failure: 'Verify medic is at correct site',
  gps_accuracy_poor: 'Ask medic to move to open area',
  shift_overrun: 'Confirm shift extension or departure',
};
```

**Contact button fallback (command-center page):**

Currently both Call and SMS buttons are `disabled={!medicPhone}`. When `medicPhone` is null, show a "Send message" button that opens an in-app message compose flow, or falls back to email:

```tsx
// In web/app/admin/command-center/page.tsx
{!medicPhone && selectedMedic && (
  <button
    onClick={() => window.location.href = `mailto:?subject=Message for ${selectedMedic.medic_name}`}
    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium"
  >
    Send Message
  </button>
)}
```

**Confidence:** HIGH for escalation timer and suggested actions. MEDIUM for contact fallback (mailto is a pragmatic workaround — a real in-app message system is out of scope).

### Recommended Project Structure

No new folders needed. All changes are modifications to existing files:

```
web/
├── stores/
│   └── useMedicLocationsStore.ts    # Add medicContext Map, initial join query
├── components/admin/
│   ├── MedicTrackingMap.tsx         # Add shift_start_time/shift_end_time to popup
│   └── AlertPanel.tsx               # Add bulk dismiss, suggested actions, escalation
├── app/admin/command-center/
│   └── page.tsx                     # Add contact fallback for null medicPhone
└── components/booking/
    └── payment-form.tsx             # Add retry button, reference number, support link
```

### Anti-Patterns to Avoid

- **N+1 lookups on every ping:** Do NOT query `medics` and `bookings` inside the Realtime ping handler. Fetch context once on subscribe and cache it in the store.
- **Re-creating Elements on retry:** Do NOT unmount/remount `<Elements>` on payment failure. Keep the same `clientSecret` and let Stripe's PaymentElement reset itself.
- **Polling for escalation:** Do NOT poll the DB every minute for escalation checks. Use `seconds_since_triggered` + a client-side interval that triggers re-render.
- **Calling `useMedicAlertsStore.subscribe()` twice:** The store's `subscribe()` checks for an existing channel (`if (existingChannel) return`) — this guard is already in place in the store.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe payment retry | Custom retry API endpoint | Same `stripe.confirmPayment` call | PaymentIntent persists in Stripe; re-confirming is idempotent |
| Debounce for location pings | Custom debounce | Already implemented in store (`debounceMap`) | Reinventing would break existing 1s debounce |
| Map animations | Custom canvas drawing | `animate-pulse` Tailwind class | Leaflet Marker doesn't easily accept animated HTML; CSS pulse on the surrounding card is sufficient |
| Escalation sound | Web Audio API custom tones | `playAlertSound(severity)` in store | Already implemented at lines 74-102 of `useMedicAlertsStore.ts` |
| Bulk dismiss API | New batch endpoint | `Promise.all(ids.map(id => dismissAlert(id)))` | `dismissAlert` is already async; Promise.all is correct for small arrays |

**Key insight:** All infrastructure for this phase already exists. The work is wiring together existing pieces, not building new systems.

---

## Common Pitfalls

### Pitfall 1: `isFullLocation` guard will reject enriched location updates

**What goes wrong:** The `isFullLocation()` function at line 240 of `useMedicLocationsStore.ts` requires `update.booking_id` to be truthy to accept a new location. If the context lookup fails (medic has no active booking), the guard rejects the update with `console.warn`.

**Why it happens:** The initial context fetch queries bookings with `status = 'in_progress'`. If a medic's booking is still `status = 'confirmed'` (not yet started), their context won't be in the Map.

**How to avoid:** Either widen the query to include `status IN ('confirmed', 'in_progress')` for today's bookings, or handle the null context case by using `ping.booking_id` as fallback (already present in the ping payload).

**Warning signs:** `console.warn('[Realtime] Received partial update for unknown medic:')` appearing in browser console during testing.

### Pitfall 2: Stripe Elements context is lost if parent re-renders cause remount

**What goes wrong:** If any state change in `PaymentForm` causes the `<Elements>` component to unmount and remount, the PaymentElement is destroyed and `clientSecret` can only be used once per PaymentIntent. Stripe will return an error on retry.

**Why it happens:** React reconciliation remounts components when keys change or parent structure changes.

**How to avoid:** Do not add a `key` prop that changes on error/retry. Keep `clientSecret`, `bookingId`, and `total` in state initialized only once (already done via `useEffect` with `[clientId]` dependency).

**Warning signs:** Stripe console error "This PaymentIntent's status is succeeded/canceled" on retry attempt.

### Pitfall 3: `seconds_since_triggered` is stale (calculated at query time)

**What goes wrong:** The `active_medic_alerts` view calculates `EXTRACT(EPOCH FROM (NOW() - triggered_at))::INT AS seconds_since_triggered` at query time. After the initial `fetchActiveAlerts()`, this value never updates.

**Why it happens:** The view result is fetched once and stored in `alerts: MedicAlert[]` in the Zustand store. It does not live-update.

**How to avoid:** For the escalation threshold check, compute elapsed time client-side from `triggered_at` (the actual ISO timestamp):

```typescript
const elapsedSeconds = Math.floor(
  (Date.now() - new Date(alert.triggered_at).getTime()) / 1000
);
const isEscalated = elapsedSeconds >= 900; // 15 minutes
```

Use `alert.triggered_at` (the raw timestamp), not `alert.seconds_since_triggered` (the stale snapshot).

**Warning signs:** Alerts that have been active for 20+ minutes not showing escalation styling on page reload.

### Pitfall 4: Medics table has no `photo` column

**What goes wrong:** The CONTEXT.md requirement mentions "join medic name, photo, booking site, and shift times." The `medics` table (verified in `002_business_operations.sql`) has `first_name`, `last_name`, `email`, `phone` but NO `photo`, `avatar`, or `profile_photo` column.

**Why it happens:** Photo upload was not part of the medic onboarding schema built in earlier phases.

**How to avoid:** In the join query, do NOT select `photo`. Include `medic_name` (constructed from `first_name || ' ' || last_name`) and leave photo out. The planner should note this as a deferred item or create a separate task to add the column.

### Pitfall 5: Bulk dismiss needs sequential guards for critical alerts

**What goes wrong:** A "Dismiss All" operation that includes critical alerts could result in important issues being dismissed without proper review.

**How to avoid:** Filter bulk dismiss to severity `low` and `medium` only. Never include `critical` or `high` in bulk operations. Show a count: "Dismiss 4 non-critical alerts."

---

## Code Examples

Verified patterns from the existing codebase:

### Supabase joined query pattern (for Task 10-01)
```typescript
// Source: web/app/api/bookings/create-payment-intent/route.ts — established join pattern
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    id,
    site_name,
    shift_start_time,
    shift_end_time,
    medic_id,
    medics!inner (
      first_name,
      last_name,
      phone
    )
  `)
  .in('status', ['confirmed', 'in_progress'])
  .eq('shift_date', new Date().toISOString().split('T')[0]);

// Build medicContext Map
const medicContext = new Map<string, MedicContextEntry>();
(bookings ?? []).forEach((b: any) => {
  if (b.medic_id && b.medics) {
    medicContext.set(b.medic_id, {
      medic_name: `${b.medics.first_name} ${b.medics.last_name}`,
      booking_id: b.id,
      site_name: b.site_name,
      shift_start_time: b.shift_start_time,
      shift_end_time: b.shift_end_time,
      medic_phone: b.medics.phone,
    });
  }
});
```

### Zustand store update pattern (for Task 10-01)
```typescript
// Source: web/stores/useMedicLocationsStore.ts — existing pattern to follow
set((state) => ({
  medicContext: medicContext,   // Set once at subscribe time
  isLoading: false,
}));
```

### Alert escalation check (for Task 10-05)
```typescript
// Source: web/stores/useMedicAlertsStore.ts — MedicAlert interface has triggered_at
const elapsedSeconds = Math.floor(
  (Date.now() - new Date(alert.triggered_at).getTime()) / 1000
);
const isEscalated = elapsedSeconds >= 900 && !alert.is_dismissed;
```

### Stripe confirmPayment retry (for Task 10-03)
```typescript
// Source: web/components/booking/payment-form.tsx — existing handleSubmit
// Retry is the same call — Stripe PaymentIntent persists:
const { error: submitError } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/book/confirmation?booking_id=${bookingId}`,
  },
});
// If submitError, setPaymentFailed(true) and show retry button
// Clicking retry calls handleSubmit again — same clientSecret, same elements
```

### Tailwind escalation pulse (for Task 10-05)
```tsx
// Source: tailwind.css documentation — animate-pulse is built-in
<div className={`border rounded-lg p-4 ${
  isEscalated
    ? 'animate-pulse border-red-600 bg-red-900/20'
    : `${style.bg} border ${style.border}`
}`}>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Location pings with no context | Join medic + booking at subscribe time, cache in Map | Phase 10 | Admin can identify each dot on map |
| Payment failure: dead end | Retry button + support link + reference number | Phase 10 | Users self-recover without calling support |
| Alert dismiss: no notes | Two-step confirm with notes input (already scaffolded) | Phase 10 | Audit trail for all alert actions |
| Alert panel: all alerts equal | Escalation at 15min, bulk dismiss for low/medium | Phase 10 | Triage priority becomes clear |

**Deprecated/outdated:**
- `useMedicLocationsStore.ts` TODO at line 153: replace with context lookup pattern
- `PaymentForm` error state: currently renders a bare red box with no actions — replace with actionable failure screen

---

## Open Questions

1. **Medic photo column missing**
   - What we know: `medics` table has `first_name`, `last_name`, `phone` but no photo
   - What's unclear: Was photo requirement added after the schema was built?
   - Recommendation: Planner should scope Task 10-01 to exclude photo, or add a separate sub-task to add `photo_url TEXT` column to medics and a storage bucket policy. This is a schema change — flag as separate work.

2. **Support email address for payment failure mailto**
   - What we know: The payment-form needs a "Contact Support" mailto link
   - What's unclear: The actual support email address (`support@sitemedic.co.uk`?)
   - Recommendation: Use `process.env.NEXT_PUBLIC_SUPPORT_EMAIL` env var with a placeholder; planner should add a task note to set the env var.

3. **Escalation sound for already-escalated alerts**
   - What we know: `playAlertSound` exists in the store and works for new alert arrivals
   - What's unclear: Should the escalation sound fire once (when the 15-min threshold is crossed) or repeatedly?
   - Recommendation: Fire once per alert. Use a `Set<string>` ref to track which alert IDs have already triggered the escalation sound. Do not fire on every 60-second tick.

4. **Booking status filter for context query**
   - What we know: Active bookings may be in `confirmed` or `in_progress` status during a live shift
   - What's unclear: When does `status` transition from `confirmed` to `in_progress`? (Likely when medic first sends a ping)
   - Recommendation: Query both `confirmed` AND `in_progress` statuses to avoid the Pitfall 1 scenario where context lookup fails.

---

## Sources

### Primary (HIGH confidence)
- `web/stores/useMedicLocationsStore.ts` — full store implementation, TODO at line 153
- `web/stores/useMedicAlertsStore.ts` — full alerts store, dismissal/resolution note support confirmed
- `web/components/admin/AlertPanel.tsx` — full panel implementation, existing dismiss/resolve flow confirmed
- `web/components/admin/MedicTrackingMap.tsx` — existing popup HTML, confirmed name/site rendered
- `web/app/admin/command-center/page.tsx` — contact button disabled state confirmed
- `web/components/booking/payment-form.tsx` — no retry UI confirmed, bookingId in scope confirmed
- `supabase/migrations/002_business_operations.sql` — bookings schema (shift_start_time, shift_end_time, medic_id FK), medics schema (first_name, last_name, phone — NO photo)
- `supabase/migrations/006_medic_location_tracking.sql` — medic_location_pings schema (medic_id, booking_id, lat/lon only — no names)
- `supabase/migrations/008_medic_alerts.sql` — medic_alerts schema (dismissal_notes, resolution_notes, triggered_at confirmed), active_medic_alerts view confirmed
- `web/app/api/bookings/create-payment-intent/route.ts` — Stripe PaymentIntent creation pattern, bookingId returned to client

### Secondary (MEDIUM confidence)
- Stripe documentation pattern: `confirmPayment` re-attempt with same `clientSecret` is safe — consistent with Stripe's stated PaymentIntent lifecycle (requires_payment_method → requires_confirmation → processing → succeeded/failed)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in `web/package.json`
- Architecture (location join): HIGH — verified schema columns exist for the join
- Architecture (Stripe retry): HIGH — verified `clientSecret` and `bookingId` are in scope
- Architecture (alert escalation): HIGH — verified `triggered_at` is on `MedicAlert`, `animate-pulse` is in Tailwind
- Pitfalls: HIGH — all pitfalls derived from direct code reading, not assumption
- Photo column: HIGH (negative finding) — verified NO photo column exists in medics table

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days — codebase stable, no fast-moving external APIs)
