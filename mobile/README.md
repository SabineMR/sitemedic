# SiteMedic Mobile App - Location Tracking

## Overview

This directory contains the **mobile location tracking system** for the SiteMedic medic app (React Native + Expo).

## Core Features

### 📍 Background Location Tracking
- **Fixed 30-second ping interval** (no adaptive frequency)
- Runs in background even when app is closed
- Uses `expo-location` with `TaskManager` for background execution

### 🎯 Automatic Geofencing
- Auto-detects arrival/departure from job site
- 75-meter default radius (configurable per site)
- Requires 3 consecutive pings to prevent GPS jitter false positives

### 📶 Offline Resilience
- Queues location pings locally when connection lost
- Auto-syncs when connection restored
- Uses AsyncStorage for persistent offline queue

### 🔋 Battery Management
- Simple 20% battery warning (non-intrusive)
- No adaptive frequency changes (user requested)
- Lets medics manage their own battery

### 🚨 Edge Case Handling
- Phone battery dies → Last location stored with "battery_died" event
- Connection lost → Pings queued, "connection_lost" event created
- GPS unavailable → Fallback to cell tower location (less accurate)
- App killed → Restores tracking when reopened if shift still active

## File Structure

```
mobile/
├── services/
│   └── LocationTrackingService.ts     # Core tracking service (singleton)
├── components/
│   └── LocationTrackingBanner.tsx     # UI banner for medics
├── lib/
│   └── supabase.ts                    # Supabase client (to be created)
└── README.md                          # This file
```

## How It Works

### 1. Starting Tracking

```typescript
import { locationTrackingService } from './services/LocationTrackingService';

// When medic's shift starts
await locationTrackingService.startTracking(booking, medicId);
```

**What happens:**
- Requests location permissions (foreground + background)
- Stores current booking in AsyncStorage
- Starts background location updates (30-second interval)
- Creates `shift_started` event
- Displays persistent notification: "SiteMedic Tracking Active"

### 2. Location Pings (Every 30 Seconds)

```typescript
// Automatically called by TaskManager every 30 seconds
processLocationUpdate(location) {
  // 1. Get GPS coordinates
  // 2. Get device context (battery, connection type)
  // 3. Check geofence boundaries
  // 4. Send to backend OR queue offline
  // 5. Sync offline queue if online
}
```

**Data captured per ping:**
- Latitude/longitude (8-decimal precision)
- Accuracy, altitude, heading, speed
- Battery level, connection type
- Timestamp (device time)
- Offline queue flag

### 3. Geofence Detection

```typescript
checkGeofence(ping, booking) {
  const distance = calculateDistance(ping.lat, ping.lng, site.lat, site.lng);
  const isInside = distance <= 75 meters;

  if (isInside) {
    consecutivePingsInside++;
    if (consecutivePingsInside >= 3 && !insideGeofence) {
      // TRIGGER: arrived_on_site event
    }
  } else {
    consecutivePingsOutside++;
    if (consecutivePingsOutside >= 3 && insideGeofence) {
      // TRIGGER: left_site event
    }
  }
}
```

**Why 3 consecutive pings?**
GPS can "jitter" (jump around 10-50m even when stationary). Requiring 3 consecutive pings prevents false arrival/departure triggers.

### 4. Manual Controls

Medics can manually mark arrival/departure if geofence fails (e.g., GPS inaccurate):

```typescript
// Medic presses "Mark Arrived" button
await locationTrackingService.markArrived(userId);

// Creates shift event with source='manual_button'
```

### 5. Offline Queue

When connection is lost:

```typescript
queueOffline(ping) {
  offlineQueue.push(ping);
  await AsyncStorage.setItem('@sitemedic:location_queue', JSON.stringify(offlineQueue));
}
```

When connection is restored:

```typescript
syncOfflineQueue() {
  // Batch insert all queued pings
  await supabase.from('medic_location_pings').insert(offlineQueue);
  // Clear queue
  offlineQueue = [];
}
```

### 6. Stopping Tracking

```typescript
// When shift ends
await locationTrackingService.stopTracking();
```

**What happens:**
- Stops background location updates
- Syncs any remaining offline queue
- Creates `shift_ended` event
- Clears AsyncStorage (booking, medic_id)

## UI Components

### LocationTrackingBanner

Persistent banner shown during active shift:

```tsx
<LocationTrackingBanner
  booking={currentBooking}
  medicId={medicId}
  onArrived={() => console.log('Arrived')}
  onDeparted={() => console.log('Departed')}
/>
```

**Displays:**
- 🟢 Green dot = On-site (inside geofence)
- 🔵 Blue dot = Traveling (outside geofence)
- 🟠 Orange badge = "X queued" (offline pings waiting to sync)
- Booking info (site name, shift hours)
- "Mark Arrived" / "Mark Departure" buttons
- Status text: "Location updates every 30 seconds"

## Database Tables Used

### `medic_location_pings`
Stores GPS pings (30-day retention):

```sql
INSERT INTO medic_location_pings (
  medic_id,
  booking_id,
  latitude,
  longitude,
  accuracy_meters,
  battery_level,
  connection_type,
  recorded_at,
  is_offline_queued
) VALUES (...);
```

### `medic_shift_events`
Stores status changes (permanent):

```sql
INSERT INTO medic_shift_events (
  medic_id,
  booking_id,
  event_type,         -- 'shift_started', 'arrived_on_site', 'left_site', etc.
  event_timestamp,
  source,             -- 'geofence_auto', 'manual_button', 'system_detected'
  latitude,
  longitude,
  geofence_radius_meters,
  device_info
) VALUES (...);
```

## Dependencies

Required Expo packages:

```bash
npx expo install expo-location
npx expo install expo-task-manager
npx expo install expo-battery
npx expo install @react-native-async-storage/async-storage
npx expo install @react-native-community/netinfo
```

Supabase:

```bash
npm install @supabase/supabase-js
```

## Permissions

### iOS (Info.plist)

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>SiteMedic needs your location to track your shift for billing and accountability</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SiteMedic needs background location access to track your shift even when the app is closed</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

## Testing

### Test Scenarios

1. **Normal tracking:**
   - Start shift → See pings every 30 seconds in database

2. **Geofence detection:**
   - Walk into job site radius → See "arrived_on_site" event
   - Walk out → See "left_site" event

3. **Offline resilience:**
   - Enable airplane mode → Pings queued locally
   - Disable airplane mode → Queued pings sync to database

4. **Battery warning:**
   - Set battery to 20% → See warning notification
   - Set battery to 25% → Warning flag resets

5. **App killed:**
   - Force quit app during shift → Background tracking continues
   - Reopen app → Tracking resumes, syncs queued data

6. **GPS unavailable:**
   - Disable GPS → Fallback to cell tower location
   - Accuracy marked as "low"

## Next Steps

1. **Create Supabase client** (`lib/supabase.ts`)
2. **Integrate into main app** (add banner to shift screen)
3. **Test on physical device** (background tracking doesn't work in simulator)
4. **Build admin dashboard** (Task #5) to view live medic locations

## Admin Dashboard (Coming Next)

The **admin command center** will show:
- Live map with all active medics
- Color-coded markers (on-site, traveling, issues)
- Timeline of events per medic
- Alerts (late arrival, connection lost, battery died)

See Task #5 for admin dashboard implementation.
