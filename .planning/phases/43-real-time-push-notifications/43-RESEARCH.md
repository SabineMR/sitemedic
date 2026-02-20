# Phase 43: Real-time & Push Notifications - Research

**Researched:** 2026-02-19
**Domain:** Real-time messaging infrastructure (Supabase Realtime + Expo Push Notifications)
**Confidence:** HIGH

## Summary

Phase 43 implements two critical messaging features:

1. **In-app real-time message arrival** (Supabase Realtime) — messages appear within 1-2 seconds in open conversations and conversation lists without manual refresh or polling
2. **iOS push notifications** (Expo + APNs) — medics receive notifications when the app is backgrounded or closed, showing only sender name (GDPR compliant)

The technical foundation is mature and well-established:
- Supabase Realtime is production-ready with clear patterns for multi-conversation channels
- Expo Notifications manages the full APNs flow (permissions, tokens, delivery, error handling)
- Edge Functions (already used for other services) trigger push sends on message insert
- WatermelonDB (Phase 42) provides the local cache for Realtime updates

The main implementation work is routing Realtime events to UI observers, managing notification permissions and tokens, and creating the trigger function. No novel patterns are required.

**Primary recommendation:** Use Supabase Realtime with a single user-level channel (org_id filter), Edge Function trigger on message insert for push sends, and Expo Notifications API for iOS delivery with token management in the profiles table.

---

## Standard Stack

### Core Real-time
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.95.3 (existing) | Realtime channel subscription + postgres_changes events | Already installed; has built-in filtering for org_id-scoped messages; handles reconnection automatically |
| Supabase Realtime Service | v1 (cloud) | WebSocket-based real-time database change stream | Managed service; handles scaling/reliability; integrated with PostgreSQL |

### iOS Push Notifications
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-notifications` | 0.32.16 (existing) | Manage device tokens, permission requests, notification handlers | Already installed in project; abstracts APNs complexity; handles both native and custom push tokens |
| Expo Push API | v1 (cloud service) | Send notifications to devices via APNs | Managed service; requires ExpoPushToken obtained from `getExpoPushTokenAsync()` |
| APNs (Apple Push Notification Service) | HTTP/2 (Apple) | Route push notifications to iOS devices | Apple's infrastructure; Expo manages certificates/auth keys |

### Edge Function Infrastructure
| Component | Purpose | Why Standard |
|-----------|---------|--------------|
| Supabase Edge Functions | Deno-based functions (already used) | Trigger push sends on database events | Lightweight, serverless, integrated with database; no additional infrastructure |
| Postgres Triggers + Functions | Notification queueing | Decouple message insert from push sending | Prevents blocking INSERT; allows retry logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nozbe/watermelondb` | 0.28.0 (existing) | Local cache for messages + Realtime updates | Phase 42 already uses this; Realtime updates should merge into WatermelonDB observers |
| `@react-native-community/netinfo` | 11.4.1 (existing) | Connectivity detection for Realtime reconnection | Phase 42 already uses; should trigger Realtime re-subscribe on reconnect |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Realtime | WebSocket library (Socket.io, ws) | Would require custom reconnection, heartbeat, filtering logic; Realtime is simpler and battle-tested |
| Expo Notifications | Firebase Cloud Messaging direct | More control, but adds Android/iOS complexity; Expo abstracts platform differences |
| Edge Function trigger | Scheduled job or webhook relay | Edge Functions run in milliseconds; scheduled jobs have latency and cost per invocation |
| Single org_id channel per user | One channel per conversation | Would hit connection limits (max ~100 channels per connection); org_id filtering is efficient |

---

## Architecture Patterns

### Realtime Channel Subscription Pattern

**Channel structure:** One WebSocket connection per app/browser, one channel per user (filtered by org_id):

```typescript
// Source: Supabase Realtime docs + existing useMedicLocationsStore pattern
const channel = supabase
  .channel(`user-${userId}:org_${orgId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `org_id=eq.${orgId}`, // Filter to org messages only
    },
    (payload) => {
      const message = payload.new as Message;
      // Merge into WatermelonDB + trigger component updates
      handleMessageInsert(message);
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'conversation_read_status',
      filter: `org_id=eq.${orgId}`,
    },
    (payload) => {
      // Handle read status updates (for thread read receipts)
      handleReadStatusUpdate(payload.new);
    }
  )
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] Channel subscribed');
    } else if (status === 'CLOSED') {
      console.log('[Realtime] Channel closed, will reconnect on network recovery');
    }
  });
```

**Why single channel per user (not per conversation):**
- Avoids connection exhaustion (max ~100 channels per WebSocket)
- Simpler lifecycle management (subscribe once on app load)
- Filter at PostgreSQL level is efficient (RLS + org_id index)
- Conversations can be added/removed dynamically without re-subscribing

**Key constraint (from Phase context):** Messages use org_id-scoped RLS (not user-based), so filtering in the subscription is safe — user can only see their own org's messages via existing RLS policies.

### Polling Replacement

**Current state (Phase 41-42):**
- Conversation list: 30-second polling
- Active message thread: 10-second polling

**Phase 43 replacement:**
- Replace both polling with Realtime subscriptions
- Remove setInterval calls from ConversationList + MessageThread
- Keep Realtime listeners alive for the lifetime of these components
- On network reconnect, Realtime re-subscribes automatically (Supabase SDK handles this)

**Performance impact:** Reduces server load from ~1 request per user every 10-30s to one WebSocket connection + delta updates.

### WatermelonDB + Realtime Integration

**Pattern:** Realtime events from PostgreSQL → merge into WatermelonDB → trigger observer updates → component re-render

```typescript
// In Realtime channel handler
const handleMessageInsert = async (message: Message) => {
  const conversation = await db.collections.get('conversations')
    .find(message.conversation_id);

  // Upsert into WatermelonDB (idempotent via server_id unique constraint)
  await db.write(async () => {
    await db.collections.get('messages').create((msg) => {
      msg.server_id = message.id;
      msg.conversation_id = message.conversation_id;
      msg.sender_id = message.sender_id;
      msg.content = message.content;
      msg.status = message.status;
      // ... other fields
    });

    // Update conversation last_message_at for sorting
    await conversation.update((c) => {
      c.last_message_at = message.created_at;
      c.last_message_preview = message.content;
    });
  });

  // WatermelonDB observers trigger component updates automatically
  // (no manual state updates needed)
};
```

**Why this pattern works:**
- Realtime fires on every INSERT → WatermelonDB upsert is idempotent
- WatermelonDB.observe() hooks already in MessageThread + ConversationList
- No manual state management needed — database change drives UI

### Push Notification Trigger Pattern

**On message insert:**

1. Message INSERTed into `messages` table
2. PostgreSQL AFTER INSERT trigger → calls `notify_new_message()` Edge Function
3. Edge Function fetches:
   - Message details (sender name)
   - Recipient device tokens from `profiles.push_token`
   - Recipient notification preferences (if they have muting)
4. Calls Expo Push API for each token
5. Handles errors (DeviceNotRegistered → cleanup token)

```sql
-- Source: Supabase docs + existing notification-service pattern
CREATE TRIGGER notify_message_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message(NEW.id, NEW.conversation_id, NEW.sender_id, NEW.org_id);

-- Function queues the notification for the Edge Function to process
CREATE OR REPLACE FUNCTION notify_new_message(msg_id UUID, conv_id UUID, sender_id UUID, org_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert into a notification_queue table or call Edge Function directly
  PERFORM http_post(
    'https://[project].supabase.co/functions/v1/send-message-notification',
    jsonb_build_object(
      'message_id', msg_id,
      'conversation_id', conv_id,
      'sender_id', sender_id,
      'org_id', org_id
    ),
    jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.jwt_secret')
    )
  );
END;
$$ LANGUAGE plpgsql;
```

**Why Edge Function (not direct DB trigger):**
- Decouples database writes from API calls (push can be slow/fail)
- Allows retry logic + queuing
- Can call external Expo Push API easily
- Can log/audit notification delivery

### Push Payload Structure (GDPR Compliant)

```typescript
// Only sender name, never message content
const payload = {
  to: [expoPushToken],
  sound: 'default',
  title: 'New message',
  body: `${senderName} sent you a message`,
  data: {
    conversationId: conversation.id,
    messageId: message.id,
    // Deep link: tapped notification opens this conversation
    url: 'messages/' + conversation.id,
  },
  badge: unreadCount, // Total unread badge
};
```

**Why this structure:**
- Title + body are shown on lock screen (never expose message content)
- `data.url` enables deep linking when user taps notification
- Badge updates the app icon with unread count
- No PII beyond sender name (GDPR safe)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection on network change | Manual ws reconnect listeners | Supabase SDK (handles reconnect internally) | SDK detects connection drops, implements exponential backoff, re-authenticates |
| APNs certificate management | Manual APNs auth flow | Expo Notifications API | Expo manages certificates, token refresh, error handling; APNs requires complex cert rotation |
| Device token expiry handling | Manual token validation | Expo receipts API | Expo returns `DeviceNotRegistered` when token invalid; just delete it and move on |
| Real-time filtering on multiple fields | Complex client-side filtering | PostgreSQL RLS + filter in subscription | RLS policies enforce permission boundary; filtering at DB is performant and secure |
| Message deduplication across sync + Realtime | Custom deduplication | WatermelonDB `server_id` unique constraint + idempotent upsert | Database enforces uniqueness; idempotent upsert handles duplicates from both sync and Realtime |
| Push notification retry logic | Exponential backoff in app | Expo + Edge Function queue | Expo handles 1-3 retries; Edge Function can queue failed sends for later retry |
| Unread badge management | Manual count tracking on INSERT | WatermelonDB count subscription | Database maintains count; observers trigger component updates automatically |

**Key insight:** Notification delivery, token management, and WebSocket reliability are complex domains with many edge cases (token expiry, cert rotation, connection drops, rate limits). Use established services (Expo, Supabase) rather than reimplementing these.

---

## Common Pitfalls

### Pitfall 1: Too Many Realtime Channels (Connection Exhaustion)

**What goes wrong:** Creating one channel per conversation (e.g., `channel('conversation-123')`, `channel('conversation-456')`) leads to:
- Max ~100 channels per connection on most plans
- Error `SUBSCRIBE_ERROR` when limit exceeded
- New conversations fail to sync

**Why it happens:** Each channel is a subscription, and Realtime has per-connection limits for resource management.

**How to avoid:** Use single channel per user/org with `filter` parameter to narrow to org_id. Supabase docs recommend this for chat apps.

**Verification steps:**
- Code review: Check that only one channel is created per user at app initialization
- Monitor: Log channel subscription count; if > 5 channels per user, investigate
- Test: Create 20 conversations in one session; ensure all sync without errors

**Reference:** [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)

---

### Pitfall 2: Notification Payload Leak (GDPR Violation)

**What goes wrong:**
- Push payload includes full message content: `body: message.content`
- Notification shows on lock screen with sensitive data visible
- User data exposed to iOS system logs

**Why it happens:** Easy to copy message content from the message object without thinking about lock screen visibility.

**How to avoid:**
- Never include `content`, `attachment_url`, or message body in push payload
- Only include: sender name, conversation ID (for deep linking)
- Add code comment: `// GDPR: Sender name only, never message content`
- Review payload in code: `grep -n "body:" supabase/functions/send-message-notification/index.ts`

**Verification steps:**
- Trigger notification, check lock screen — should only show "New message from Dr Smith"
- Code review: Scan Edge Function for `message.content` in payload construction
- GDPR audit: Document that notifications are GDPR-safe in tech spec

---

### Pitfall 3: Token Reuse Across Device Reinstalls

**What goes wrong:**
- User uninstalls app → reinstalls → old token still in database
- Push sends to old token → APNs returns `DeviceNotRegistered`
- Dev catches error and clears token, but thousands of messages already failed
- Notification delivery has 5-minute latency because of error-handling queue

**Why it happens:** ExpoPushToken is stable across reinstalls on iOS (stays the same), but APNs may revoke it. Easy to assume token is permanent.

**How to avoid:**
- On app initialization, get current token with `getExpoPushTokenAsync()` and compare to stored token
- If changed, always update `profiles.push_token`
- Set up error handling in Edge Function to check push receipts after 15 minutes
- Mark tokens as `deleted` (soft delete) rather than removing, for audit trail

**Verification steps:**
- Uninstall/reinstall app on test device, trigger message — notification should arrive
- Check error logs for `DeviceNotRegistered` entries
- Verify push receipt check runs 15+ minutes after send
- Query profiles: `SELECT user_id, push_token, updated_at FROM profiles WHERE push_token IS NOT NULL` — should see recent `updated_at`

**Reference:** [Expo Push Token Behavior](https://docs.expo.dev/push-notifications/faq/)

---

### Pitfall 4: Race Condition — Realtime + Polling (Message Duplication)

**What goes wrong:**
- Phase 42 uses 30-second polling for conversations
- Phase 43 adds Realtime subscription
- Message arrives via Realtime → inserted into WatermelonDB
- 5 seconds later, polling fetch returns same message
- UI renders duplicate (even though database is deduplicated)

**Why it happens:** Polling request was in flight when Realtime event arrived; both insert the same message.

**How to avoid:**
- **Turn off polling completely** when Realtime subscription is active
- In ConversationList + MessageThread, check: if Realtime channel is subscribed, don't call the polling hook
- Use a feature flag or env var to enable Realtime (disable legacy polling)
- For web (not Phase 43, but related): Replace polling with Realtime before Phase 43 is complete

**Verification steps:**
- Code review: Grep for `setInterval` in ConversationList.tsx, MessageThread.tsx — should find none (or only for non-message updates)
- Debug log: Add `console.log('[Realtime] Message insert:')` in channel handler and `console.log('[Polling] Fetched messages:')` in polling hook
- Send message, capture logs — should see only Realtime log, never Polling log
- Search logs: `grep -i "duplicate\|duplication" test-logs.txt` — should find none

---

### Pitfall 5: WatermelonDB Write Conflict (Offline + Realtime)

**What goes wrong:**
- User offline, sends message → queued in SyncQueue as status='queued'
- User comes online, Realtime fires with new incoming message from another user
- Both try to write to WatermelonDB simultaneously
- Error: `Database is locked` or upsert fails silently

**Why it happens:** WatermelonDB uses SQLite (single-writer concurrency model); concurrent writes block.

**How to avoid:**
- Queue database writes: Don't call `db.write()` from multiple sources simultaneously
- For Realtime: Batch incoming events in a queue, process serially
- For SyncQueue: Use existing serialization (already built in Phase 42)
- Ensure only one active `db.write()` call at a time

**Verification steps:**
- Code review: Check that all `db.write()` calls are awaited before next write
- Stress test: Send message offline, come online immediately, receive message from peer simultaneously; check for console errors
- Monitor: Query WatermelonDB logs for `SQLite: database is locked`

**Reference:** [WatermelonDB CRUD docs](https://watermelondb.dev/docs/CRUD)

---

### Pitfall 6: Notification Permission Timing (User Denial)

**What goes wrong:**
- Request push permission on app first launch
- User denies (swipe away, say "Don't Allow")
- No second prompt (iOS only shows once per install)
- User never gets notifications
- No way to enable push without reinstalling app

**Why it happens:** iOS shows the native notification permission dialog only once. Easy to request at the wrong time (e.g., before user understands the feature).

**How to avoid:**
- Request permission **on first message arrival**, not app launch
- Or: Show pre-permission explainer screen ("Get notifications for new messages") → user taps "Enable" → request permission
- Provide **settings page** to revoke/re-enable permissions (iOS allows re-enabling in app settings)
- Log permission status; if denied, show banner: "Enable notifications in Settings"

**Verification steps:**
- Code review: Check permission request timing in `MessageSync.ts` or notification setup code
- Manual test: First install, don't grant permission, send message, check iOS settings → should show `Not Determined` (can be re-prompted)
- Manual test: Deny permission, check app UI — should show "Enable notifications" banner

---

### Pitfall 7: Token Bloat in Database

**What goes wrong:**
- Every time app launches, `getExpoPushTokenAsync()` updates `profiles.push_token`
- Over 1 year, 365 daily app launches = hundreds of database writes
- Over time, profile row grows, query performance degrades
- Old tokens never deleted, causing storage bloat

**Why it happens:** Token update is cheap, easy to do on every launch; developers don't think about accumulation.

**How to avoid:**
- Only update token if it **changed** from previous value
- Use `push_token_updated_at` timestamp; only update if > 7 days old
- Archive old tokens (soft delete with `deleted_at` timestamp) after 30 days unused
- Add migration: create `push_tokens` table instead of single column (nullable)

**Verification steps:**
- Query: `SELECT COUNT(*), AVG(OCTET_LENGTH(push_token)) FROM profiles` — should be 1 token per user, small size
- Check migration: If using single column, verify no duplicates with `SELECT user_id FROM push_tokens GROUP BY user_id HAVING COUNT(*) > 1`
- Monitor: Set up query alert if avg profile row size exceeds 2KB

---

## Code Examples

### Real-time Message Listener (iOS App)

```typescript
// Source: useMedicLocationsStore pattern + Supabase Realtime docs
// File: src/contexts/RealtimeContext.tsx (new, Phase 43)

import React, { useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useOrg } from './OrgContext';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeContextType {
  channel: RealtimeChannel | null;
  isConnected: boolean;
}

const RealtimeContext = React.createContext<RealtimeContextType>({
  channel: null,
  isConnected: false,
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { state: authState } = useAuth();
  const { orgId } = useOrg();
  const [channel, setChannel] = React.useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    if (!authState.user?.id || !orgId) return;

    const channelName = `user-${authState.user.id}:org_${orgId}`;
    const newChannel = supabase
      .channel(channelName, {
        config: { broadcast: { self: true } }, // Receive own broadcasts
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('[Realtime] New message:', payload.new);
          // Dispatch to message store to upsert into WatermelonDB
          window.dispatchEvent(
            new CustomEvent('realtime:message-insert', { detail: payload.new })
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_read_status',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('[Realtime] Read status update:', payload.new);
          window.dispatchEvent(
            new CustomEvent('realtime:read-status-update', {
              detail: payload.new,
            })
          );
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to channel:', channelName);
          setIsConnected(true);
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Channel closed, will reconnect');
          setIsConnected(false);
        }
      });

    setChannel(newChannel);

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [authState.user?.id, orgId]);

  return (
    <RealtimeContext.Provider value={{ channel, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => React.useContext(RealtimeContext);
```

---

### Push Token Registration (iOS App)

```typescript
// Source: Existing EmergencyAlertService pattern + Expo Notifications docs
// File: src/services/PushTokenService.ts (new, Phase 43)

import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';

export class PushTokenService {
  /**
   * Register the device's Expo Push Token with the backend.
   * Called on app startup and whenever token changes.
   */
  static async registerPushToken(): Promise<string | null> {
    try {
      // Request notification permission (shows native prompt if needed)
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (status !== 'granted') {
        console.warn('[PushToken] Notification permission denied');
        return null;
      }

      // Get Expo push token (not native APNs token)
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      if (!tokenData.data) {
        console.warn('[PushToken] Failed to get push token');
        return null;
      }

      const newToken = tokenData.data;
      const { data: user } = await supabase.auth.getUser();

      if (!user) {
        console.warn('[PushToken] No user, skipping token registration');
        return newToken;
      }

      // Only update if token changed or was last updated > 7 days ago
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token, push_token_updated_at')
        .eq('id', user.id)
        .single();

      if (
        profile?.push_token === newToken &&
        profile?.push_token_updated_at &&
        Date.now() - new Date(profile.push_token_updated_at).getTime() < 7 * 24 * 60 * 60 * 1000
      ) {
        // Token unchanged and recently updated, skip update
        return newToken;
      }

      // Update token in database
      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: newToken,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('[PushToken] Failed to register token:', error);
        return null;
      }

      console.log('[PushToken] Registered:', newToken.slice(0, 20) + '...');
      return newToken;
    } catch (error) {
      console.error('[PushToken] Exception:', error);
      return null;
    }
  }

  /**
   * Listen for token changes (rare, but handle gracefully)
   */
  static setupTokenChangeListener(): () => void {
    const subscription = Notifications.addPushTokenListener((evt) => {
      console.log('[PushToken] Token changed, re-registering:', evt.pushToken);
      this.registerPushToken(); // Fire-and-forget
    });

    return () => subscription.remove();
  }

  /**
   * Set up notification received listener
   * Handles when notification arrives while app is foreground
   */
  static setupNotificationListener(): () => void {
    const subscription = Notifications.addNotificationReceivedListener((evt) => {
      console.log('[Notification] Received (foreground):', evt.request.content.body);
      // Could show an in-app toast or badge here
    });

    return () => subscription.remove();
  }

  /**
   * Set up notification response listener (user taps notification)
   */
  static setupNotificationResponseListener(
    onNotificationTapped: (conversationId: string) => void
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const conversationId = response.notification.request.content.data?.conversationId;
        if (conversationId) {
          console.log('[Notification] Tapped, opening conversation:', conversationId);
          onNotificationTapped(conversationId);
        }
      }
    );

    return () => subscription.remove();
  }
}
```

---

### Edge Function — Send Message Notification (Push Trigger)

```typescript
// Source: Supabase Edge Functions docs + existing notification-service pattern
// File: supabase/functions/send-message-notification/index.ts (new, Phase 43)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { message_id, conversation_id, sender_id, org_id } = await req.json();

    // Step 1: Fetch message + sender
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(
        `
        id,
        sender_id,
        conversation_id,
        content,
        created_at,
        conversations!inner(type, medic_id, created_by)
      `
      )
      .eq('id', message_id)
      .single();

    if (msgError || !message) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
      });
    }

    // Step 2: Fetch sender name
    const { data: sender } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', sender_id)
      .single();

    const senderName = sender
      ? `${sender.first_name} ${sender.last_name}`.trim()
      : 'Unknown';

    // Step 3: Determine recipients
    let recipients: string[] = [];

    if (message.conversations.type === 'direct') {
      // For direct message, send to the medic
      const medicId = message.conversations.medic_id;
      if (medicId === sender_id) {
        // Medic sent message to admin, send to admin
        recipientId = message.conversations.created_by;
      } else {
        // Admin sent message to medic, send to medic
        recipientId = medicId;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', recipientId)
        .single();

      if (profile?.push_token) {
        recipients.push(profile.push_token);
      }
    } else if (message.conversations.type === 'broadcast') {
      // For broadcast, send to all org members
      const { data: profiles } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('org_id', org_id)
        .neq('id', sender_id) // Don't send to self
        .not('push_token', 'is', null);

      recipients = (profiles ?? []).map((p) => p.push_token);
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No recipients' }), {
        status: 200,
      });
    }

    // Step 4: Build GDPR-safe payload (sender name only, never content)
    const payload = {
      to: recipients,
      sound: 'default',
      title: 'New message',
      body: `New message from ${senderName}`,
      data: {
        conversationId: conversation_id,
        messageId: message_id,
        url: `messages/${conversation_id}`,
      },
    };

    // Step 5: Send via Expo Push API
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // Step 6: Handle errors (log DeviceNotRegistered for cleanup)
    if (result.errors) {
      console.error('[PushNotification] Expo API errors:', result.errors);

      // Mark bad tokens for cleanup (next phase can batch delete)
      for (const error of result.errors) {
        if (error.code === 'DeviceNotRegistered') {
          // TODO: Queue token for deletion from profiles table
          console.warn('[PushNotification] Unregistered token:', error.details?.token);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: recipients.length }), {
      status: 200,
    });
  } catch (error) {
    console.error('[PushNotification] Exception:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling every 30-60s for new messages | Realtime subscriptions (millisecond updates) | 2023-2024 (Realtime matured) | Reduces server load by 99%, improves UX to near-instant |
| Push notifications via custom service (Firebase/FCM setup) | Expo Notifications API (abstracted APNs/FCM) | ~2020 (Expo standardized) | Simplifies setup; handles cert management automatically |
| Token stored in custom notification_tokens table | Single push_token column in profiles | N/A (architecture choice) | Simpler schema; Expo tokens are stable across versions |
| Separate message-specific Edge Function (if exists) | PostgreSQL trigger → Edge Function (existing pattern) | ~2022 (Supabase functions mature) | Decouples writes from async sends; enables queuing |

### Deprecated/Outdated
- **Firebase Cloud Messaging direct integration**: Expo abstracts this; still possible but adds platform-specific code
- **Socket.io for chat**: Realtime is simpler and integrated with database

---

## Open Questions

### 1. Deep Linking on Notification Tap

**What we know:**
- Expo's data payload can include `url` field
- React Navigation can handle deep links
- When user taps notification while app is backgrounded, notification response listener fires

**What's unclear:**
- Should deep link open conversation immediately, or show messages tab first?
- What if conversation list needs to load (first time message sync)?
- How to prioritize deep link vs. other pending navigation?

**Recommendation:**
- Simple approach: Navigate directly to conversation
- Complex approach: Show messages tab, then scroll to conversation
- Start with simple; add loading state if conversation takes >1s to load

---

### 2. Notification Badge Count

**What we know:**
- iOS supports app icon badge (small red number)
- Expo can set badge via `setNotificationCategoryAsync()` and `setBadgeCountAsync()`
- Should reflect total unread count

**What's unclear:**
- Update badge on every message? (Adds N+1 calls)
- Update badge on app foreground? (Less responsive but cheaper)
- Sync badge with WatermelonDB unread count?

**Recommendation:**
- Update badge when:
  1. Notification arrives (via Edge Function payload)
  2. User marks conversation as read
  3. App comes to foreground (sync with WatermelonDB)
- Use WatermelonDB count query: `COUNT(messages WHERE read_at IS NULL)`

---

### 3. Push Notification for Broadcast Messages

**What we know:**
- CONTEXT.md says "Both 1:1 and broadcast messages trigger push notifications"
- Broadcasts go to multiple org members
- Could be many recipients if large org

**What's unclear:**
- Should broadcast notifications say "Broadcast from Dr Smith" or just show message count?
- Should broadcast notifications be grouped differently from direct messages?
- Rate limit: If org has 100 medics and broadcast is sent, send 100 notifications — acceptable?

**Recommendation:**
- Treat broadcasts like any other notification: "New broadcast from [sender name]"
- No grouping yet (Phase 43 only); can add in future phase
- Rate limit: Trust Expo's rate limiting; monitor server logs for large-org broadcasts

---

## Sources

### Primary (HIGH confidence)
- **Context7:** Supabase Realtime documentation (channel architecture, limits, postgres_changes)
- **Expo Notifications:** Official docs at [docs.expo.dev/versions/latest/sdk/notifications/](https://docs.expo.dev/versions/latest/sdk/notifications/)
- **Existing implementation:** useMedicLocationsStore pattern in `web/stores/useMedicLocationsStore.ts` (Realtime + Zustand integration)
- **Existing notification service:** `supabase/functions/notification-service/index.ts` (Edge Function pattern)
- **Phase 42 Research:** `42-RESEARCH.md` (WatermelonDB architecture, sync patterns)

### Secondary (MEDIUM confidence)
- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts) — channel filtering, event types
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) — concurrent connections, channel limits
- [Sending Push Notifications with Supabase](https://supabase.com/docs/guides/functions/examples/push-notifications) — Edge Function pattern
- [Expo Push Notifications Overview](https://docs.expo.dev/push-notifications/overview/) — token lifecycle, error handling
- [Expo Push Notifications FAQ](https://docs.expo.dev/push-notifications/faq/) — token expiry, device uninstall handling
- [WatermelonDB Synchronization](https://watermelondb.dev/docs/Advanced/Sync) — observer pattern, upsert strategy

### Tertiary (LOW confidence)
- iOS Push Notifications 2026 guides (generic best practices, not Expo-specific)
- WatermelonDB GitHub issues (community patterns, not official docs)

---

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — Versions confirmed in package.json; Supabase Realtime widely used in production
- **Architecture Patterns:** HIGH — useMedicLocationsStore provides proven Realtime pattern; Expo Notifications APIs well-documented
- **Pitfalls:** MEDIUM — Drawn from Expo docs (token expiry, permission timing) + Realtime docs (connection limits); some inferred from general best practices
- **Code Examples:** HIGH — Based on existing codebase patterns (EmergencyAlertService, useMedicLocationsStore) + official docs

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days, stable domain)

---

## Implementation Readiness

Phase 43 is ready for planning. All dependencies are in place:

✅ Supabase schema: messages, conversations, profiles (with push_token column) — Migration 143 + 060
✅ Expo Notifications: Already installed (0.32.16)
✅ Realtime infrastructure: Supabase client ready, proven with useMedicLocationsStore
✅ WatermelonDB: Phase 42 infrastructure ready, observer pattern established
✅ Edge Function patterns: notification-service already exists
✅ Network monitoring: NetworkMonitor handles reconnection

No blockers. Recommend proceeding with planning.
