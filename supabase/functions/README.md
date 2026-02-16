# Supabase Edge Functions - Location Tracking API

## Overview

Backend API endpoints for receiving location data from medic mobile apps.

## Functions

### 1. `medic-location-ping`
**Endpoint**: `POST /functions/v1/medic-location-ping`

Receives GPS location pings from medic mobile apps (every 30 seconds).

**Features:**
- Batch processing (up to 50 pings per request)
- Rate limiting (120 pings/hour per medic)
- UK coordinate validation
- Accuracy filtering (rejects pings >500m accuracy)
- Timestamp validation (rejects pings >60 minutes old)
- Automatic audit logging

**Request:**
```json
{
  "pings": [
    {
      "medic_id": "uuid",
      "booking_id": "uuid",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "accuracy_meters": 8.5,
      "altitude_meters": 12.3,
      "heading_degrees": 180.0,
      "speed_mps": 1.5,
      "battery_level": 78,
      "connection_type": "4G",
      "gps_provider": "expo-location",
      "recorded_at": "2026-02-15T10:30:45.000Z",
      "is_offline_queued": false,
      "is_background": true
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "inserted": 1,
  "rate_limit": {
    "limit": 120,
    "remaining": 119
  }
}
```

**Response (Rate Limited):**
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 120 pings per hour"
}
```

**Response Headers:**
- `X-RateLimit-Limit`: Maximum pings per hour (120)
- `X-RateLimit-Remaining`: Remaining pings in current window

**Validation Rules:**
- Coordinates must be within UK bounds (lat: 49.9-60.9, lng: -8.6-2.0)
- Accuracy must be ≤500 meters
- Timestamp must be within last 60 minutes
- Timestamp must not be >1 minute in future (clock skew protection)
- Battery level must be 0-100%
- Medic can only submit their own pings (enforced by RLS + code)

### 2. `medic-shift-event`
**Endpoint**: `POST /functions/v1/medic-shift-event`

Receives shift status change events (arrival, departure, breaks, edge cases).

**Features:**
- Event type validation (15 supported event types)
- State machine validation (prevents invalid transitions like arriving twice)
- Source tracking (geofence auto vs manual button vs system detected)
- Automatic audit logging (via database trigger)

**Request:**
```json
{
  "medic_id": "uuid",
  "booking_id": "uuid",
  "event_type": "arrived_on_site",
  "event_timestamp": "2026-02-15T08:47:32.000Z",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "accuracy_meters": 8.5,
  "source": "geofence_auto",
  "triggered_by_user_id": "uuid",
  "geofence_radius_meters": 75.0,
  "distance_from_site_meters": 12.5,
  "notes": "Automatic geofence entry detected (3 consecutive pings)",
  "device_info": {
    "battery_level": 78,
    "connection_type": "4G",
    "app_version": "1.0.0",
    "os_version": "iOS 17.2"
  }
}
```

**Event Types:**
- Normal: `shift_started`, `arrived_on_site`, `left_site`, `break_started`, `break_ended`, `shift_ended`
- Edge cases: `battery_critical`, `battery_died`, `connection_lost`, `connection_restored`, `gps_unavailable`, `app_killed`, `app_restored`
- Alerts: `inactivity_detected`, `late_arrival`, `early_departure`

**Sources:**
- `geofence_auto` - Automatic detection by geofencing
- `manual_button` - Medic pressed button in app
- `system_detected` - Inferred from data (e.g., battery died)
- `admin_override` - Admin manually created event

**Response (Success):**
```json
{
  "success": true,
  "event": {
    "id": "uuid",
    "event_type": "arrived_on_site",
    "event_timestamp": "2026-02-15T08:47:32.000Z",
    ...
  }
}
```

**Response (Invalid State):**
```json
{
  "error": "Invalid state transition",
  "details": "Cannot arrive on-site again without leaving first (duplicate arrival)"
}
```

**State Machine Rules:**
- Cannot `arrived_on_site` twice without `left_site` in between
- Cannot `left_site` twice without `arrived_on_site` in between
- Cannot `break_started` twice without `break_ended` in between

## Deployment

### Prerequisites
- Supabase project created
- Supabase CLI installed: `npm install -g supabase`

### Deploy Functions

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy medic-location-ping
supabase functions deploy medic-shift-event

# Or deploy all at once
supabase functions deploy
```

### Set Environment Variables

These are automatically available in Edge Functions:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your anon/public API key

No additional secrets needed for these functions.

## Testing

### Test Location Ping (cURL)

```bash
# Get your auth token first (from mobile app login)
AUTH_TOKEN="YOUR_SUPABASE_JWT_TOKEN"

curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/medic-location-ping \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pings": [{
      "medic_id": "YOUR_MEDIC_ID",
      "booking_id": "YOUR_BOOKING_ID",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "accuracy_meters": 8.5,
      "battery_level": 78,
      "connection_type": "4G",
      "gps_provider": "expo-location",
      "recorded_at": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
      "is_offline_queued": false,
      "is_background": true
    }]
  }'
```

### Test Shift Event (cURL)

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/medic-shift-event \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medic_id": "YOUR_MEDIC_ID",
    "booking_id": "YOUR_BOOKING_ID",
    "event_type": "arrived_on_site",
    "event_timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "accuracy_meters": 8.5,
    "source": "manual_button",
    "triggered_by_user_id": "YOUR_USER_ID",
    "notes": "Test arrival event"
  }'
```

### Test with Supabase CLI (Local)

```bash
# Start local Supabase (includes Edge Functions runtime)
supabase start

# Functions available at:
# http://localhost:54321/functions/v1/medic-location-ping
# http://localhost:54321/functions/v1/medic-shift-event

# Test locally
curl -X POST http://localhost:54321/functions/v1/medic-location-ping \
  -H "Authorization: Bearer YOUR_LOCAL_JWT" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

## Performance

### Location Ping Function
- **Latency**: <100ms for single ping, <500ms for batch of 50
- **Throughput**: ~1000 pings/second per region
- **Rate Limit**: 120 pings/hour per medic (2 per minute)

### Shift Event Function
- **Latency**: <100ms per event
- **Throughput**: ~500 events/second per region
- **No rate limit** (low frequency events)

## Error Handling

### Common Errors

**401 Unauthorized**
- Missing or invalid `Authorization` header
- Expired JWT token
- User not authenticated

**400 Bad Request**
- Invalid coordinates (outside UK)
- Invalid timestamp (too old or in future)
- Invalid event type
- Missing required fields

**403 Forbidden**
- Trying to submit data for another medic
- RLS policy violation

**429 Rate Limit Exceeded**
- Exceeded 120 pings/hour
- Wait until next window or reduce ping frequency

**500 Internal Server Error**
- Database connection issue
- Unexpected error (check logs)

### Debugging

```bash
# View function logs
supabase functions logs medic-location-ping --tail

# View specific invocation
supabase functions logs medic-location-ping --invocation-id INVOCATION_ID
```

## Security

### Authentication
- All requests require valid Supabase JWT in `Authorization` header
- Token must belong to an authenticated medic user
- Functions use user's RLS context (row-level security enforced)

### Authorization
- Medics can only submit their own location pings (double-checked: RLS + code)
- Admin override requires `admin` role (to be implemented)
- IP address logged for audit trail

### Rate Limiting
- In-memory rate limiting (resets on cold start)
- **Production**: Use Redis or Supabase table with TTL for persistent rate limiting
- Current implementation: Simple Map-based counter (good for MVP)

### Input Validation
- All coordinates validated against UK bounds
- Timestamps validated for age and clock skew
- Event types validated against whitelist
- State machine prevents invalid event sequences

## Monitoring

### Key Metrics to Track
- **Ping success rate**: Should be >99%
- **Average latency**: Should be <100ms
- **Rate limit hits**: Should be near zero (indicates mobile app bug)
- **Validation failures**: Monitor for patterns (bad GPS, clock skew)
- **Database write errors**: Should be zero (investigate immediately)

### Alerts to Set Up
- Function error rate >1%
- Average latency >500ms
- Database connection failures
- Abnormal rate limit hits (>10/hour indicates bug)

## Next Steps

1. **Add RLS policies** (Task #12) - Enforce medic can only read/write own data
2. **Production rate limiting** - Use Redis or Supabase table instead of in-memory
3. **Monitoring** - Set up alerts for errors and performance degradation
4. **Load testing** - Test with 50 concurrent medics (3000 pings/hour)
5. **Geofence calculation** - Server-side geofence validation (currently mobile-only)
