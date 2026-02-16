# SiteMedic Auto-Scheduling API Documentation

## Overview
Complete backend services for intelligent medic auto-scheduling with UK compliance enforcement.

## Edge Functions (Supabase)

### 1. Auto-Assign Medic V2
**Endpoint:** `/functions/v1/auto-assign-medic-v2`  
**Method:** POST

**Request:**
```json
{
  "booking_id": "uuid",
  "skip_overtime_check": false
}
```

**Response:**
```json
{
  "assigned_medic_id": "uuid",
  "medic_name": "John Smith",
  "confidence_score": 85.5,
  "score_breakdown": {
    "total_score": 85.5,
    "distance_score": 25.0,
    "qualification_score": 20.0,
    "availability_score": 15.0,
    "utilization_score": 12.0,
    "rating_score": 8.0,
    "performance_score": 9.5,
    "fairness_score": 4.0
  },
  "candidates": [...],
  "requires_manual_approval": false
}
```

### 2. Auto-Assign All
**Endpoint:** `/functions/v1/auto-assign-all`  
**Method:** POST

**Request:**
```json
{
  "limit": 10
}
```

**Response:**
```json
{
  "total_processed": 12,
  "auto_assigned": 8,
  "flagged_for_review": 2,
  "requires_manual": 2,
  "results": [...]
}
```

### 3. Medic Availability
**Endpoint:** `/functions/v1/medic-availability?action=ACTION`  
**Method:** POST

**Actions:**
- `request_time_off` - Medic submits time-off request
- `approve_time_off` - Admin approves time-off
- `deny_time_off` - Admin denies time-off
- `get_pending_requests` - Get all pending requests
- `set_availability` - Quick set available/unavailable

**Example (Request Time Off):**
```json
{
  "medic_id": "uuid",
  "start_date": "2026-03-01",
  "end_date": "2026-03-07",
  "reason": "time_off",
  "notes": "Family vacation"
}
```

### 4. Shift Swap
**Endpoint:** `/functions/v1/shift-swap?action=ACTION`  
**Method:** POST

**Actions:**
- `offer_swap` - Medic offers shift for swap
- `accept_swap` - Another medic accepts swap
- `approve_swap` - Admin approves swap
- `deny_swap` - Admin denies swap
- `get_available_swaps` - Get swaps available to medic

**Example (Offer Swap):**
```json
{
  "booking_id": "uuid",
  "requesting_medic_id": "uuid",
  "swap_reason": "Family emergency"
}
```

### 5. Notification Service
**Endpoint:** `/functions/v1/notification-service`  
**Method:** POST

**Request:**
```json
{
  "type": "shift_assigned",
  "booking_id": "uuid",
  "medic_id": "uuid"
}
```

**Notification Types:**
- `shift_assigned` - New shift assignment
- `shift_reminder_24h` - 24-hour reminder
- `shift_reminder_2h` - 2-hour reminder
- `cert_expiry_30d` - Certification expiring
- `swap_request` - Shift swap available

**Channels:** Push (Expo), Email (SendGrid), SMS (Twilio)

### 6. Cert Expiry Checker
**Endpoint:** `/functions/v1/cert-expiry-checker`  
**Method:** GET (Scheduled daily via cron)

**Response:**
```json
{
  "checked": 45,
  "expiring_30d": [{"medic_id": "uuid", "cert_type": "Confined Space", "days_remaining": 25}],
  "expiring_14d": [{"medic_id": "uuid", "cert_type": "Trauma", "days_remaining": 10}],
  "expired": [{"medic_id": "uuid", "cert_type": "First Aid", "days_ago": 5}],
  "medics_disabled": ["uuid1", "uuid2"]
}
```

### 7. Recurring Booking Generator
**Endpoint:** `/functions/v1/recurring-booking-generator`  
**Method:** POST

**Request:**
```json
{
  "client_id": "uuid",
  "site_name": "ABC Construction",
  "site_postcode": "E1 6AN",
  "shift_template_id": "uuid",
  "start_date": "2026-03-01",
  "end_date": "2026-06-01",
  "pattern": "weekly",
  "days_of_week": [1, 3, 5],
  "exception_dates": ["2026-04-18", "2026-05-27"],
  "base_rate": 30.00,
  "shift_hours": 8
}
```

**Response:**
```json
{
  "success": true,
  "parent_booking_id": "uuid",
  "total_bookings": 39,
  "dates": ["2026-03-03", "2026-03-05", ...]
}
```

## Environment Variables Required

```env
# Expo Push Notifications
EXPO_ACCESS_TOKEN=your_expo_token

# SendGrid Email
SENDGRID_API_KEY=your_sendgrid_key

# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE=+44XXXXXXXXXX
```

## Testing Locally

```bash
# Start Supabase
supabase start

# Test auto-assign
curl -X POST http://127.0.0.1:54321/functions/v1/auto-assign-medic-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"booking_id": "uuid"}'

# Test time-off request
curl -X POST "http://127.0.0.1:54321/functions/v1/medic-availability?action=request_time_off" \
  -H "Content-Type: application/json" \
  -d '{"medic_id": "uuid", "start_date": "2026-03-01", "end_date": "2026-03-05", "reason": "time_off"}'
```

## Scheduled Jobs (Cron)

Set up in Supabase Dashboard → Database → Cron Jobs:

```sql
-- Daily cert expiry check (2 AM)
SELECT cron.schedule(
  'cert-expiry-check',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='http://127.0.0.1:54321/functions/v1/cert-expiry-checker',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb
  ) as request_id;
  $$
);

-- Monthly reset fair distribution counters (1st of month, 3 AM)
SELECT cron.schedule(
  'reset-monthly-counters',
  '0 3 1 * *',
  $$
  UPDATE medic_preferences 
  SET shifts_offered_this_month = 0, shifts_worked_this_month = 0;
  $$
);
```
