# Zustand Stores - Real-Time State Management

## Overview

State management using Zustand for real-time medic location tracking.

## Stores

### `useMedicLocationsStore`

Manages real-time medic locations with Supabase Realtime subscriptions.

**Features:**
- Real-time updates via Supabase Postgres Changes
- Debouncing (max 1 update per second per medic)
- Connection status tracking
- Automatic cleanup of stale locations

**State:**
```typescript
{
  locations: Map<string, MedicLocation>;  // Key: medic_id
  isConnected: boolean;                   // WebSocket connection status
  lastUpdate: Date | null;                // Last update timestamp
  subscriptionChannel: RealtimeChannel;   // Supabase channel
}
```

**Actions:**
```typescript
updateLocation(medicId, location)  // Update medic location (debounced)
removeLocation(medicId)            // Remove medic when shift ends
setConnected(connected)            // Set connection status
subscribe()                        // Subscribe to real-time updates
unsubscribe()                      // Unsubscribe and cleanup
getActiveMedics()                  // Get all active medics
getMedicById(medicId)              // Get specific medic
```

## Usage

### Option 1: Hook (Recommended)

```tsx
import { useRealtimeMedicLocations } from '@/hooks/useRealtimeMedicLocations';

function CommandCenter() {
  const { locations, isConnected, lastUpdate } = useRealtimeMedicLocations();

  return (
    <div>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      <p>Active medics: {locations.length}</p>
      {locations.map(medic => (
        <div key={medic.medic_id}>{medic.medic_name}</div>
      ))}
    </div>
  );
}
```

### Option 2: Direct Store Access

```tsx
import { useMedicLocationsStore } from '@/stores/useMedicLocationsStore';

function Map() {
  const activeMedics = useMedicLocationsStore(state => state.getActiveMedics());
  const subscribe = useMedicLocationsStore(state => state.subscribe);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, []);

  return <MapComponent medics={activeMedics} />;
}
```

## How Real-Time Works

### 1. Subscription Setup

When component mounts:
```typescript
subscribe()
  ↓
Create Supabase channel: 'medic-locations'
  ↓
Subscribe to postgres_changes events:
  - INSERT on medic_location_pings (every 30 seconds)
  - INSERT on medic_shift_events (arrival, departure, etc.)
  ↓
Connection status: SUBSCRIBED ✅
```

### 2. Location Ping Event

```
Mobile app → Edge Function → Database INSERT
                                    ↓
                             Postgres trigger
                                    ↓
                          Realtime broadcast
                                    ↓
                            WebSocket → Browser
                                    ↓
                          Update Zustand store (debounced)
                                    ↓
                         React re-render → Map updates
```

### 3. Debouncing

Prevents map jitter from rapid updates:

```typescript
// Medic sends ping every 30 seconds
10:00:00 → Update ✅ (First ping)
10:00:15 → Skipped ⏭️ (Less than 1 second since last update)
10:00:30 → Update ✅ (1+ second elapsed)
10:00:45 → Skipped ⏭️
10:01:00 → Update ✅
```

**Result:** Map updates max once per second per medic, even if pings arrive more frequently.

### 4. Status Updates

When shift events occur:

```typescript
Event: 'arrived_on_site'
  ↓
Update medic status: 'traveling' → 'on_site'
  ↓
Map marker changes: 🔵 Blue → 🟢 Green
```

Event mappings:
- `arrived_on_site` → status: `on_site` (🟢 Green)
- `left_site` → status: `traveling` (🔵 Blue)
- `break_started` → status: `break` (🟡 Yellow)
- `battery_critical` → status: `issue` (🔴 Red)
- `connection_lost` → status: `offline` (⚪ Gray)

## Enabling Supabase Realtime

### Step 1: Enable Realtime for Tables

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Enable replication for:
   - `medic_location_pings`
   - `medic_shift_events`
3. Click "Enable Realtime"

### Step 2: Set RLS Policies

Ensure admin users can read location data:

```sql
-- Allow admins to read all location pings
CREATE POLICY "Admins can read all location pings"
ON medic_location_pings
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Allow admins to read all shift events
CREATE POLICY "Admins can read all shift events"
ON medic_shift_events
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);
```

### Step 3: Configure Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Test Connection

```bash
# Start dev server
pnpm dev

# Open browser console
# Look for: "[Realtime] Subscription status: SUBSCRIBED"
```

## Performance

### Bandwidth Usage

With 50 active medics:
- **Location pings**: 50 medics × 1 ping/30s = ~1.7 pings/second
- **Payload size**: ~300 bytes per ping
- **Bandwidth**: ~0.5 KB/second = ~30 KB/minute = ~1.8 MB/hour

**Very lightweight!** Realtime is efficient for this use case.

### Update Latency

```
Mobile app sends ping
        ↓ <50ms
  Edge Function processes
        ↓ <50ms
  Database INSERT
        ↓ <100ms
  Realtime broadcast
        ↓ <200ms
  Browser receives update
        ↓
Total: <400ms (sub-second updates!)
```

### Debounce Impact

- Prevents excessive React re-renders
- Smooth map animations (no jitter)
- Reduces CPU usage in browser
- Better user experience

## Troubleshooting

### "Realtime not working"

**Check:**
1. Realtime enabled for tables? (Database → Replication)
2. RLS policies allow admin to SELECT? (Check policies)
3. Environment variables set? (Check .env.local)
4. Browser console shows "SUBSCRIBED"? (Should see in logs)

**Debug:**
```typescript
// Add to CommandCenter component
useEffect(() => {
  const channel = supabase.channel('test')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log('ANY change detected:', payload);
    })
    .subscribe((status) => {
      console.log('Test subscription status:', status);
    });

  return () => supabase.removeChannel(channel);
}, []);
```

### "Map not updating"

**Check:**
1. Are pings being sent? (Check `medic_location_pings` table)
2. Is store receiving updates? (Check browser console for "[Realtime] Location ping received")
3. Is debouncing preventing updates? (Wait 1+ second between pings)
4. Is component subscribed? (Check useEffect runs)

### "Too many updates / lag"

**Solution:** Increase debounce interval:

```typescript
// In useMedicLocationsStore.ts
const DEBOUNCE_MS = 2000; // Increase to 2 seconds
```

## Best Practices

### ✅ Do

- Use the `useRealtimeMedicLocations` hook for auto-subscribe
- Unsubscribe on component unmount (prevents memory leaks)
- Filter Realtime events by date (today only) to reduce bandwidth
- Use debouncing to prevent excessive re-renders

### ❌ Don't

- Don't create multiple subscriptions to same channel
- Don't forget to unsubscribe (causes memory leaks)
- Don't update state on every ping (debounce!)
- Don't subscribe in SSR components (client-side only)

## Future Enhancements

- [ ] Persistent rate limiting (use Supabase table instead of in-memory Map)
- [ ] Alert detection (battery <10%, not moving >20 mins, late arrival)
- [ ] Historical playback (replay medic's route for a past shift)
- [ ] Geofence visualization (show geofence circles on map)
- [ ] Multi-region support (filter by territory)
