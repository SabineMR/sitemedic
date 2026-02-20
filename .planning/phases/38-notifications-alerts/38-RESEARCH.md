# Phase 38: Notifications & Alerts - Research

**Researched:** 2026-02-20
**Domain:** Multi-channel notification system (dashboard feed, email, SMS) with user preference management
**Confidence:** HIGH (codebase patterns verified directly; Twilio v5 confirmed via WebSearch; Supabase Realtime patterns verified via official docs)

---

## Summary

Phase 38 builds a unified notification system on top of an already well-instrumented codebase. The email infrastructure (Resend, fire-and-forget pattern, dev-mode fallback) is fully established in `web/lib/email/resend.ts` and `web/lib/marketplace/notifications.ts`. The Supabase Realtime subscription pattern is established via `web/lib/queries/comms.hooks.ts` (the `useRealtimeMessages` hook). The `UnreadBadge` component in the dashboard layout demonstrates the bell-icon-in-header pattern. No notification feed table or SMS infrastructure currently exists.

The three work streams are: (1) a new `user_notifications` database table + Supabase Realtime subscription for the dashboard feed, (2) hooking Twilio `twilio@5.x` into a new `web/lib/marketplace/sms.ts` module called at existing API route trigger points, and (3) a `notification_preferences` table for companies (distinct from the existing `org_settings.notification_preferences` JSONB which serves the *admin dashboard*, not the marketplace).

The main architectural decision is where the notification feed lives in the UI. The existing pattern uses a `UnreadBadge` (bell icon in layout header) for messages — the same approach (bell icon dropdown + `/notifications` dedicated page) fits this phase. The existing `admin/notifications/page.tsx` shows the `medic_alerts` pattern but is admin-facing and org-scoped; Phase 38 needs a *marketplace-user-scoped* feed (by `user_id`, not `org_id`).

**Primary recommendation:** Add a `user_notifications` table with `user_id` RLS, enable Realtime on it, build a bell-icon dropdown + `/dashboard/notifications` page using the same TanStack Query + `useRealtimeNotifications` hook pattern as messaging, install `twilio@5` for SMS, and store per-user notification preferences in a new `marketplace_notification_preferences` table.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `twilio` | `^5.11.2` | Send SMS via Twilio API | Decided by user; UK coverage; healthcare standard |
| `resend` | `^6.9.2` | Email delivery | Already installed and used throughout |
| `@supabase/supabase-js` | `^2.95.3` | Realtime subscriptions for live feed | Already installed; established pattern |
| `@tanstack/react-query` | `^5.90.21` | Client-side data + cache invalidation | Already installed; established pattern |
| `lucide-react` | `^0.564.0` | `Bell` icon for notification badge | Already installed; Bell icon confirmed available |
| `sonner` | `^2.0.7` | Toast notifications (in-app real-time alerts) | Already installed in codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.3.6` | Validation of preference payloads | Already installed; consistent with all other API routes |
| `date-fns` | `^4.1.0` | Date formatting in notification timestamps | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `twilio` | Amazon SNS | User explicitly chose Twilio; no reason to deviate |
| Supabase Realtime | Polling | Realtime already established in codebase; polling is anti-pattern |
| `/dashboard/notifications` page | Only bell dropdown | Both should exist: dropdown for quick-glance, page for full history |
| New `user_notifications` table | Extending `medic_alerts` | `medic_alerts` is admin-facing + org-scoped; marketplace feed needs user_id-scoped |

### Installation
```bash
pnpm add twilio
```
(All other packages are already installed)

---

## Architecture Patterns

### Recommended Project Structure
```
web/
├── lib/
│   ├── marketplace/
│   │   ├── notifications.ts        # EXISTING — email notifications (extend with new types)
│   │   ├── sms.ts                  # NEW — Twilio SMS helper module
│   │   └── notification-types.ts   # NEW — shared NotificationCategory + Channel types
│   └── queries/
│       └── notifications.hooks.ts  # NEW — TanStack Query + Realtime hook for feed
├── components/
│   └── dashboard/
│       ├── UnreadBadge.tsx         # EXISTING — messages bell icon (reference pattern)
│       └── NotificationBell.tsx    # NEW — unified notification bell (dropdown)
└── app/
    ├── (dashboard)/
    │   ├── layout.tsx              # EXTEND — add NotificationBell to header
    │   └── dashboard/
    │       └── notifications/
    │           └── page.tsx        # NEW — full notification history page
    └── api/
        └── marketplace/
            └── notification-preferences/
                └── route.ts        # NEW — GET/PUT for user preferences

web-marketplace/
├── lib/
│   └── marketplace/
│       └── sms.ts                  # NEW (or shared via symlink) — same Twilio helper
└── app/
    └── api/
        └── marketplace/
            └── notification-preferences/
                └── route.ts        # NEW — GET/PUT for company preferences

supabase/migrations/
├── 159_user_notifications.sql      # NEW — user_notifications table + Realtime
└── 160_marketplace_notification_preferences.sql  # NEW — per-user prefs table
```

### Pattern 1: Twilio SMS Helper Module
**What:** A fire-and-forget SMS utility wrapping Twilio SDK v5, matching the Resend email pattern
**When to use:** Any time an SMS alert needs to be sent (new event for companies, urgent/high-value threshold, marketplace actions)

```typescript
// web/lib/marketplace/sms.ts
// Source: Twilio Node.js quickstart + existing resend.ts pattern

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Graceful fallback: if env vars not configured, log instead of crash
const client = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null;

interface SMSParams {
  to: string;      // E.164 format: +447xxxxxxxxx
  body: string;    // Max 160 chars per SMS segment
}

export async function sendSMS(
  params: SMSParams
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!client || !fromNumber) {
    console.log('[SMS DEV MODE] Would send to:', params.to, '|', params.body);
    return { success: true, sid: 'dev-mode-mock-sid' };
  }
  try {
    const message = await client.messages.create({
      body: params.body,
      from: fromNumber,
      to: params.to,
    });
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('[SMS] Failed to send:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### Pattern 2: User Notifications Table Schema
**What:** A `user_notifications` table scoped by `user_id` (not `org_id`) for the unified marketplace feed
**When to use:** Any platform action that should appear in the notification bell

```sql
-- supabase/migrations/159_user_notifications.sql

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL CHECK (type IN (
    'new_event',           -- New event posted matching company preferences
    'quote_received',      -- Client: a company submitted a quote on your event
    'quote_awarded',       -- Company: your quote was selected
    'quote_rejected',      -- Company: your quote was not selected
    'payment_received',    -- Company: deposit payment confirmed
    'payment_failed',      -- Client: remainder payment failed
    'rating_received',     -- Either: you received a new rating
    'message_received',    -- Either: new marketplace message
    'dispute_filed',       -- Either: a dispute was opened
    'dispute_resolved',    -- Either: a dispute was resolved
    'event_cancelled',     -- Either: event was cancelled
    'rating_nudge'         -- Either: reminder to leave rating
  )),

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,                        -- Deep link into the app (e.g. /marketplace/events/[id])
  metadata JSONB DEFAULT '{}'::jsonb, -- Extra context (event_id, quote_id, etc.)

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for feed query: user's unread notifications, recent first
CREATE INDEX idx_user_notifications_user_id_created
  ON user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread
  ON user_notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- RLS: user-scoped (same pattern as marketplace tables)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sees_own_notifications"
  ON user_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_updates_own_notifications"
  ON user_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Service role inserts (API routes use service-role client to write notifications)
CREATE POLICY "service_role_insert_notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

-- Enable Supabase Realtime (same pattern as messages in migration 157)
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
-- Note: No REPLICA IDENTITY FULL needed — we only listen for INSERTs (new notifications)
```

### Pattern 3: Notification Preferences Table Schema
**What:** A `marketplace_notification_preferences` table storing channel x category matrix per user
**When to use:** Company or client configures their notification settings

```sql
-- supabase/migrations/160_marketplace_notification_preferences.sql

CREATE TABLE marketplace_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Channel x Category matrix (dashboard is always on, cannot be disabled)
  -- Each column: TRUE = send this channel for this category
  email_new_events      BOOLEAN NOT NULL DEFAULT TRUE,
  email_quotes          BOOLEAN NOT NULL DEFAULT TRUE,
  email_awards          BOOLEAN NOT NULL DEFAULT TRUE,
  email_payments        BOOLEAN NOT NULL DEFAULT TRUE,
  email_ratings         BOOLEAN NOT NULL DEFAULT TRUE,
  email_messages        BOOLEAN NOT NULL DEFAULT TRUE,
  email_disputes        BOOLEAN NOT NULL DEFAULT TRUE,

  -- SMS: opt-in only per PECR. All default FALSE.
  sms_new_events        BOOLEAN NOT NULL DEFAULT FALSE,
  sms_quotes            BOOLEAN NOT NULL DEFAULT FALSE,
  sms_awards            BOOLEAN NOT NULL DEFAULT FALSE,
  sms_payments          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Location radius for event alerts (NULL = all UK, no radius filtering)
  event_alert_radius_miles INT,

  -- SMS phone number (stored separately from company_phone — this is opted-in number)
  sms_phone_number TEXT,   -- E.164 format: +447xxxxxxxxx
  sms_opted_in_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: user manages own prefs
ALTER TABLE marketplace_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_manages_own_prefs"
  ON marketplace_notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Auto-insert defaults on first marketplace action (handled in API route)
-- Or via trigger on marketplace_companies INSERT
```

### Pattern 4: Realtime Feed Hook
**What:** Client hook for live notification feed updates, matching `useRealtimeMessages` pattern
**When to use:** In dashboard layout and `/dashboard/notifications` page

```typescript
// web/lib/queries/notifications.hooks.ts
// Source: Pattern from web/lib/queries/comms.hooks.ts (Phase 43)

'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useNotifications(userId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useRealtimeNotifications(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel: RealtimeChannel = createClient()
      .channel(`notifications:user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => { createClient().removeChannel(channel); };
  }, [userId, queryClient]);

  return { isConnected };
}
```

### Pattern 5: Creating Notifications from API Routes
**What:** Fire-and-forget helper to write to `user_notifications` without blocking responses
**When to use:** Called from existing API routes (quote submit, award, payment, rating, message) after the primary action succeeds

```typescript
// web/lib/marketplace/create-notification.ts

import { createClient } from '@/lib/supabase/server';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  // Fire-and-forget: notification failure NEVER blocks the primary response
  try {
    const supabase = await createClient();
    await supabase.from('user_notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
  }
}
```

### Pattern 6: Event Alert Fan-Out (new event posted → notify matching companies)
**What:** When a new open event is posted, query all verified companies whose preferences match, insert notification rows for each, send email/SMS per their preferences
**When to use:** In the `POST /api/marketplace/events` handler (web-marketplace), after event is successfully created with `status='open'`

```typescript
// Called from web-marketplace/app/api/marketplace/events/route.ts (after event insert)
// Uses service-role client (already has it for event creation)

async function fanOutNewEventNotifications(
  supabase: SupabaseClient,  // service-role client
  event: { id: string; event_name: string; event_type: string; location_coordinates: unknown; budget_max: number | null; },
  firstEventDate: Date | null
) {
  // 1. Fetch all verified companies with their preferences
  const { data: companies } = await supabase
    .from('marketplace_companies')
    .select(`
      id, company_name, company_email, company_phone, admin_user_id,
      marketplace_notification_preferences (
        email_new_events, sms_new_events,
        event_alert_radius_miles, sms_phone_number
      )
    `)
    .eq('verification_status', 'verified')
    .eq('can_browse_events', true);

  if (!companies?.length) return;

  // 2. Determine if urgent/high-value (SMS threshold)
  const isUrgent = firstEventDate
    ? (firstEventDate.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
    : false;
  const isHighValue = (event.budget_max ?? 0) > 2000;
  const triggerSMS = isUrgent || isHighValue;

  // 3. Fan out (individual try/catch per company — one failure doesn't block others)
  for (const company of companies) {
    try {
      const prefs = company.marketplace_notification_preferences?.[0];

      // Always create dashboard notification (cannot be disabled)
      await supabase.from('user_notifications').insert({
        user_id: company.admin_user_id,
        type: 'new_event',
        title: `New event: ${event.event_name}`,
        body: `A new event matching your profile has been posted.`,
        link: `/events/${event.id}`,
        metadata: { event_id: event.id, event_type: event.event_type },
      });

      // Email if opted in (default: true)
      if (!prefs || prefs.email_new_events !== false) {
        // sendNewEventEmailNotification(...)  — fire and forget
      }

      // SMS if opted in AND urgent/high-value
      if (triggerSMS && prefs?.sms_new_events && prefs?.sms_phone_number) {
        // sendSMS({ to: prefs.sms_phone_number, body: `New urgent event...` })
      }
    } catch (err) {
      console.error(`[Event Fan-Out] Failed for company ${company.id}:`, err);
    }
  }
}
```

### Pattern 7: Bell Icon Component in Dashboard Layout
**What:** Add a `NotificationBell` component to the dashboard header alongside the existing `UnreadBadge`
**When to use:** In `web/app/(dashboard)/layout.tsx`, following the same pattern as `UnreadBadge`

```typescript
// web/components/dashboard/NotificationBell.tsx
// Pattern: mirrors UnreadBadge.tsx (Phase 43)

'use client';
import { Bell } from 'lucide-react'; // Bell icon confirmed available in lucide-react
import {
  useNotifications,
  useRealtimeNotifications,
} from '@/lib/queries/notifications.hooks';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
// ... dropdown showing last 5 notifications + "View all" link
```

### Anti-Patterns to Avoid
- **Blocking API responses on notification delivery:** Every notification send (DB insert, email, SMS) must be in try/catch and fire-and-forget. Established pattern throughout `notifications.ts`.
- **Storing SMS phone number from `company_phone`:** `company_phone` is for business contact — SMS opt-in requires a separate, explicitly-consented number stored in `marketplace_notification_preferences.sms_phone_number`.
- **Using `org_id` for notification scoping:** Marketplace is user_id-scoped (not org_id). All notification tables must use `user_id = auth.uid()` in RLS policies, not `get_user_org_id()`.
- **Sending SMS by default:** PECR requires explicit opt-in. All `sms_*` preference columns default to `FALSE`. The SMS opt-in UI must be an affirmative checkbox (not pre-checked).
- **Listening for postgres_changes on DELETE events for notifications:** Supabase Realtime does not support filtering DELETE events — only INSERT/UPDATE are filterable. Mark-as-read should use UPDATE with `is_read=TRUE` and the client should react to UPDATE events.
- **Not setting REPLICA IDENTITY FULL for UPDATE tracking:** If tracking read/unread via Realtime UPDATE events, the table needs `ALTER TABLE user_notifications REPLICA IDENTITY FULL` (see migration 157 pattern). If only tracking INSERTs, it is not needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMS sending | Custom HTTP to Twilio REST | `twilio` npm v5 | SDK handles auth, retry, E.164 validation, TypeScript types |
| Email delivery | Raw fetch to Resend API | `resend` (already installed) | Already in codebase; dev-mode fallback included |
| Live feed updates | Long-polling or setInterval | Supabase Realtime `postgres_changes` | Established pattern in codebase (comms.hooks.ts) |
| Notification deduplication window | Custom timer-based logic | Timestamp check + `UNIQUE` constraint | Simpler than `create_medic_alert()` function — just check if similar exists within window |
| Cron for digest emails | pg_cron SQL job | Vercel Cron (vercel.json) | Already using this pattern for `rating-nudges` and `trust-score-refresh` |

**Key insight:** The email, Realtime, and cron patterns are already established in this codebase. Phase 38 is primarily about wiring notification triggers into existing API routes and creating the new notification table + preferences UI — not building new infrastructure from scratch.

---

## Common Pitfalls

### Pitfall 1: Fan-Out at Event Posting is Slow
**What goes wrong:** When a new event is posted, iterating over all verified companies and sending emails/SMS in the API route request adds multi-second latency before returning the response to the client.
**Why it happens:** N companies × (DB insert + email send + optional SMS) inside the request handler.
**How to avoid:** The notification inserts should be fire-and-forget (`Promise.all` without `await` or use `void Promise.all(...)`). The Resend and Twilio calls are already async. Consider a background task pattern: insert the event, return 200 immediately, trigger fan-out via a Supabase Edge Function or Vercel background function.
**Warning signs:** Event posting API route takes >2 seconds to respond.

### Pitfall 2: SMS to Non-E.164 Numbers
**What goes wrong:** Twilio rejects numbers not in E.164 format (e.g., `07xxx` instead of `+447xxx`).
**Why it happens:** Users enter UK mobile numbers without the country code.
**How to avoid:** The preferences UI must validate and normalise phone numbers to E.164 on save. Add a Zod validator: `z.string().regex(/^\+447\d{9}$/, 'UK mobile number must be in +447xxxxxxxxx format')`.
**Warning signs:** Twilio API throws `21211 - 'To' number is not a valid phone number`.

### Pitfall 3: Realtime Not Working Because Table Not Added to Publication
**What goes wrong:** The `postgres_changes` subscription never fires for `user_notifications`.
**Why it happens:** Tables must be explicitly added to the `supabase_realtime` publication. This is not automatic for new tables.
**How to avoid:** Include `ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;` in the migration. See the pattern in how `messages` is set up (referenced in migration 150/157).
**Warning signs:** Realtime channel connects (`SUBSCRIBED`) but `onInsert` callbacks never fire.

### Pitfall 4: Missing RLS Policy for Realtime Subscription
**What goes wrong:** The Realtime subscription connects but returns no data, even though rows exist.
**Why it happens:** Supabase Realtime checks RLS policies when delivering `postgres_changes` events. If the user doesn't have SELECT access, the event is silently dropped.
**How to avoid:** Ensure the `user_sees_own_notifications` SELECT policy exists and correctly matches `user_id = auth.uid()`.
**Warning signs:** INSERT succeeds (visible in Supabase dashboard), but client-side callback never fires.

### Pitfall 5: SMS Daily Cap Exceeded at Scale
**What goes wrong:** During busy periods (e.g., 500 companies, 10 events posted in a day), SMS costs spike unexpectedly and some companies receive too many alerts.
**Why it happens:** No per-user SMS daily cap implemented.
**How to avoid:** Track `sms_sent_today` count in `marketplace_notification_preferences` (reset by daily cron), or check count of SMS notifications sent in the last 24 hours before sending. Recommended cap: **5 SMS/user/day** for event alerts, **unlimited for direct-action alerts** (quote awarded, payment failed — these are time-critical).
**Warning signs:** Twilio spend spikes without corresponding event volume.

### Pitfall 6: Notification Preferences Not Auto-Created for New Users
**What goes wrong:** A newly registered company admin has no row in `marketplace_notification_preferences`. Trying to read preferences throws an error or returns null, breaking the preferences UI.
**Why it happens:** The table is not populated until the user explicitly saves preferences.
**How to avoid:** Use `upsert` (INSERT ... ON CONFLICT DO UPDATE) when reading preferences — create defaults if none exist. Or use a Postgres trigger on `marketplace_companies INSERT` to auto-insert default preferences row for the `admin_user_id`.
**Warning signs:** Preferences page shows errors for first-time users.

### Pitfall 7: The `company_phone` Field is NOT the SMS Number
**What goes wrong:** Using `marketplace_companies.company_phone` as the SMS delivery number without explicit opt-in.
**Why it happens:** It's tempting to reuse the existing phone field.
**How to avoid:** `company_phone` is the business contact number (for client-company coordination after award — it's already used in the award email). SMS opt-in requires a separate number in `marketplace_notification_preferences.sms_phone_number` with `sms_opted_in_at` timestamp for PECR audit trail.
**Warning signs:** SMS sent to company phone without user having explicitly opted in to SMS notifications.

---

## Code Examples

Verified patterns from codebase and official sources:

### Twilio SDK v5 — Send SMS (TypeScript ESM)
```typescript
// Source: Twilio official docs + twilio@5.11.2 npm package
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const message = await client.messages.create({
  body: 'New urgent event posted: Festival at Manchester (7 days away, £3,500 budget)',
  from: process.env.TWILIO_PHONE_NUMBER, // E.164: +441xxxxxxxxx
  to: '+447xxxxxxxxx',                   // E.164 required
});
console.log('[SMS] Sent:', message.sid);
```

### Supabase Realtime — Subscribe to Notifications (TypeScript)
```typescript
// Source: supabase.com/docs/guides/realtime/postgres-changes + comms.hooks.ts pattern
const channel = supabase
  .channel(`notifications:user_${userId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'user_notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // payload.new contains the full notification row
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    }
  )
  .subscribe();

// Cleanup
return () => { supabase.removeChannel(channel); };
```

### Vercel Cron Configuration (for event digest emails if added)
```json
// web/vercel.json — currently does not exist, must be created
{
  "crons": [
    {
      "path": "/api/cron/event-alert-digest",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/rating-nudges",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/trust-score-refresh",
      "schedule": "0 2 * * *"
    }
  ]
}
```
Note: Currently no `vercel.json` exists in the web directory. The two existing cron routes (`rating-nudges`, `trust-score-refresh`) are not yet wired to Vercel Cron — they require manual invocation or an external scheduler.

### Existing Fire-and-Forget Email Pattern (reference)
```typescript
// Source: web/lib/marketplace/notifications.ts (established Phase 35/36 pattern)
// Pattern: individual try/catch, never await in webhook/route handler flow

try {
  await sendAwardNotification({ companyEmail, companyName, eventName, ... });
} catch (err) {
  // Email failure NEVER blocks the award response
  console.error('[Award] Email notification failed:', err);
}
```

### Bell Icon (confirmed available in lucide-react ^0.564.0)
```typescript
// Source: web/app/admin/notifications/page.tsx — Bell imported from lucide-react
import { Bell } from 'lucide-react';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| org_id-scoped notification alerts | user_id-scoped for marketplace | Phase 32+ (marketplace) | Marketplace tables use `auth.uid()` not `get_user_org_id()` |
| Polling for realtime updates | Supabase Realtime `postgres_changes` | Phase 43 | No polling in messaging — same pattern for notifications |
| SMS as alternative email provider | SMS via Twilio (opted-in only) | Phase 38 decision | PECR compliance; transactional SMS for urgent/high-value events |
| Separate per-feature notification prefs | Unified channel x category matrix | Phase 38 decision | GitHub/Slack/LinkedIn pattern; single settings page |

**Deprecated/outdated in this codebase:**
- `org_settings.notification_preferences` JSONB: This is for the *admin dashboard* (booking_confirmations, riddor_alerts, cert_expiry, payout_summaries, cashflow_alerts). Do NOT extend this for marketplace notifications — they need a separate user-scoped table.
- `medic_alerts` table: Admin command-center alerts tied to `medic_id + booking_id`. Not the right base for marketplace notification feed.

---

## Open Questions

1. **Should `web-marketplace` (client-facing app) also show a notification bell?**
   - What we know: `web` (admin dashboard) clearly needs it. `web-marketplace` is where companies browse events and submit quotes — they'd benefit from seeing award notifications there too.
   - What's unclear: Whether the client-poster (who uses `web-marketplace`) needs a feed or just email/SMS.
   - Recommendation: Build the core feed in `web` first. Add to `web-marketplace` as a follow-on — same table, same API, different UI placement.

2. **Location-based SMS targeting: how to filter companies by radius when preferences have a radius set?**
   - What we know: `marketplace_events` has `location_coordinates GEOGRAPHY(POINT, 4326)`. `event_alert_radius_miles` will be stored in preferences. The existing `search_events_by_location` RPC uses `ST_DWithin`.
   - What's unclear: Whether to do a PostGIS join during fan-out (expensive for many companies) or store company location coordinates (not currently in `marketplace_companies`).
   - Recommendation: For Phase 38, if a company has set a radius, skip SMS if event has no coordinates. If event has coordinates and company has no stored location, fall back to no filtering (show all events). Store company coordinates in Phase 38 or defer. Simple postcode-based fallback is acceptable for MVP.

3. **Does the client (event poster) get notification preferences or just receive defaults?**
   - What we know: CONTEXT.md says this is at Claude's discretion.
   - Recommendation: Give clients a simple preferences page too (email on/off for quotes received, award, payment, message). No SMS for clients except payment failure (payment_failed is time-critical). Clients don't need the full channel x category matrix — a simpler 4-toggle UI suffices.

4. **How to handle the `vercel.json` cron setup without disrupting existing deployments?**
   - What we know: No `vercel.json` currently exists. Two cron routes already exist but have no scheduler.
   - What's unclear: Whether the project owner has a Vercel account with cron enabled (requires Pro plan).
   - Recommendation: Create `vercel.json` with cron entries for all three existing cron routes plus any new digest route. Document that Vercel Pro is required, or use Supabase's built-in `pg_cron` as an alternative for the daily digest.

---

## Sources

### Primary (HIGH confidence)
- `web/lib/marketplace/notifications.ts` — Fire-and-forget email pattern, FROM_ADDRESS convention, Resend usage
- `web/lib/queries/comms.hooks.ts` — `useRealtimeMessages` — the definitive Realtime subscription pattern for this codebase
- `web/components/dashboard/UnreadBadge.tsx` — Bell icon in dashboard header pattern
- `web/app/(dashboard)/layout.tsx` — Where the new `NotificationBell` must be inserted
- `supabase/migrations/150_message_notification_trigger.sql` — pg_net + Vault pattern for async DB triggers
- `supabase/migrations/153_marketplace_messaging.sql` — `user_id`-scoped marketplace table with RLS pattern
- `supabase/migrations/157_message_polish.sql` — REPLICA IDENTITY FULL pattern for Realtime UPDATE events
- `supabase/migrations/137_notification_preferences.sql` — Existing `org_settings` prefs (confirms new user-scoped table is needed)
- `web-marketplace/app/api/marketplace/events/route.ts` — Event posting route (where fan-out hook goes)
- `web-marketplace/app/api/marketplace/quotes/submit/route.ts` — Quote submission route (where quote_received notification goes)
- `supabase/functions/.env` — TWILIO env vars already stubbed (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- `web/.env.example` — Twilio env vars already documented
- Official Supabase docs: `supabase.com/docs/guides/realtime/postgres-changes` — verified `postgres_changes` subscription API, RLS requirements, supported filters, `alter publication` requirement
- Official Twilio docs: `twilio.com/docs/sms/quickstart/node` — verified `twilio@5` import pattern and `client.messages.create()` API

### Secondary (MEDIUM confidence)
- WebSearch: `twilio@5.11.2` is the current latest (last published ~12 days ago per npm registry)
- WebSearch verified via official Twilio blog: E.164 format required, `import twilio from 'twilio'` for ESM
- makerkit.dev tutorial: `user_notifications` table schema pattern with `account_id`, `type`, `body`, `link`, `dismissed`, `expires_at` (adapted for this codebase's conventions)
- ICO PECR guidance: Transactional SMS (alerts about events user signed up for) are NOT marketing communications — do not require PECR consent. BUT the CONTEXT.md decision is opt-in for all SMS, which is more conservative and correct for a new platform.

### Tertiary (LOW confidence)
- Vercel cron configuration pattern (from WebSearch) — not verified in this specific project since no `vercel.json` exists yet. Standard format confirmed from multiple sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — twilio v5, resend v6, Supabase Realtime all verified via official docs and/or codebase inspection
- Architecture: HIGH — feed schema, realtime hook, fire-and-forget pattern all directly modelled on established codebase patterns
- SMS compliance (PECR): MEDIUM — ICO guidance confirms transactional is exempt; opt-in decision locks in conservative/correct approach regardless
- Pitfalls: HIGH — each pitfall verified against actual codebase patterns or Supabase official docs

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (Twilio and Supabase are stable; patterns unlikely to change in 30 days)
