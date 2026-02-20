---
phase: 43-real-time-push-notifications
verified: 2026-02-19T23:45:00Z
status: passed
score: 16/16 must-haves verified
human_verification:
  - test: "Open two browser tabs as different users. Send a message in one. Verify it appears in the other within 1-2 seconds without refresh."
    expected: "Message appears in both conversation list (preview update) and open thread within 1-2 seconds"
    why_human: "Requires two authenticated sessions and real Supabase Realtime connection"
  - test: "Open iOS app, navigate to Messages tab. Verify native permission dialog appears on first visit."
    expected: "iOS push notification permission dialog appears once, then never again"
    why_human: "Native iOS dialog cannot be verified programmatically"
  - test: "Send a message to a medic whose iOS app is backgrounded. Verify push notification arrives with sender name only."
    expected: "Notification shows 'New message from [Name]' -- no message content visible"
    why_human: "Requires real device with push credentials and backgrounded app"
  - test: "Tap the push notification. Verify it navigates to the correct conversation."
    expected: "App opens to the specific conversation thread"
    why_human: "Requires real device interaction"
  - test: "While iOS app is in foreground on a different screen, receive a message. Verify in-app toast appears (not native banner)."
    expected: "Blue toast at top with sender name, 'View' button, auto-dismiss after 4s"
    why_human: "Visual/behavioral verification of toast vs native banner"
---

# Phase 43: Real-time & Push Notifications Verification Report

**Phase Goal:** Messages arrive instantly when the app or web dashboard is open (no manual refresh), and medics receive iOS push notifications for new messages when the app is backgrounded -- with GDPR-safe notification content

**Verified:** 2026-02-19T23:45:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When user A sends a message, user B sees it within 1-2 seconds without refresh | VERIFIED | iOS: `RealtimeContext.tsx` (372 lines) subscribes to `postgres_changes` INSERT on messages, upserts into WatermelonDB via `database.write()` (line 209), WatermelonDB observers auto-re-render. Web: `useRealtimeMessages` hook (comms.ts line 360) invalidates TanStack Query cache on message INSERT, triggering re-render. |
| 2 | Conversation list updates live (preview, timestamp, unread count) | VERIFIED | iOS: `handleMessageInsert` updates `lastMessageAt`, `lastMessagePreview`, `unreadCount` on Conversation record (lines 230-238). Web: Realtime handler invalidates `['conversations']` query key (line 391), triggering refetch with recomputed unread counts. |
| 3 | Single Supabase Realtime channel per user (not one per conversation) | VERIFIED | iOS: Single channel `user-${userId}:org_${orgId}` (line 311). Web: Single channel `web-messages:org_${orgId}` (line 370). Both use org-level filter `org_id=eq.${orgId}`. |
| 4 | Existing polling completely replaced by Realtime subscriptions | VERIFIED | `grep refetchInterval web/lib/queries/comms.ts` returns zero matches. `useConversations` (line 228) and `useMessages` (line 336) have no `refetchInterval`. iOS never used polling (WatermelonDB observers). |
| 5 | iOS app requests push notification permission on first Messages tab visit | VERIFIED | `app/(tabs)/_layout.tsx` line 218: `listeners={{ focus: handleMessagesTabFocus }}` on Messages tab. `handleMessagesTabFocus` (line 133) calls `promptForPermission()` once per session (ref guard) + once per install (AsyncStorage `push_permission_prompted` flag in NotificationContext.tsx line 220). |
| 6 | Device push token registered in profiles.push_token | VERIFIED | `PushTokenService.ts` line 139: `supabase.from('profiles').update({ push_token: token, push_token_updated_at: ... }).eq('id', userId)`. |
| 7 | Token only updated if changed or older than 7 days | VERIFIED | `PushTokenService.ts` lines 129-137: `isChanged = storedToken !== token`, `isStale = !updatedAt || Date.now() - new Date(updatedAt).getTime() > TOKEN_STALENESS_THRESHOLD_MS` (7 days = line 34). Skips update when `!isChanged && !isStale` (line 134). |
| 8 | Tapping push notification navigates to conversation | VERIFIED | `NotificationContext.tsx` line 160: `addNotificationResponseReceivedListener` extracts `conversationId` from data and calls `router.push('/messages/${conversationId}')` (line 166). Falls back to messages tab if no conversationId (line 169). |
| 9 | Foreground notifications show in-app toast (not native banner) | VERIFIED | `PushTokenService.ts` line 44: `setNotificationHandler` with `shouldShowAlert: false` (suppresses native banner). `NotificationContext.tsx` lines 127-149: `addNotificationReceivedListener` triggers `showToast()` with animated blue toast (#3B82F6, line 372), auto-dismiss 4s (line 52). |
| 10 | Push notification shows only sender name (GDPR - never message content) | VERIFIED | Edge Function line 168: `notificationBody = 'New message from ${senderName}'` or `'New broadcast from ${senderName}'`. No query for `messages.content` anywhere in the function. Migration body only passes `message_id, conversation_id, sender_id, org_id` (lines 56-61). |
| 11 | Both 1:1 and broadcast messages trigger push notifications | VERIFIED | Edge Function line 83: `if (conversation.type === 'direct')` handles 1:1. Line 128: `else if (conversation.type === 'broadcast')` handles broadcast with org-wide recipient query. |
| 12 | Sender never receives their own notification | VERIFIED | Edge Function line 97-99: For direct, recipient is always the *other* participant. Line 134: For broadcast, `neq('id', sender_id)` explicitly excludes sender. |
| 13 | Invalid tokens (DeviceNotRegistered) cleaned up | VERIFIED | Edge Function lines 293-325: `cleanupInvalidTokens()` checks `result.details?.error === 'DeviceNotRegistered'` and sets `push_token: null, push_token_updated_at: null` on matching profiles. |
| 14 | Edge Function sends via Expo Push API | VERIFIED | Edge Function line 24: `EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'`. Line 200: `fetch(EXPO_PUSH_URL, { method: 'POST', ... })`. |
| 15 | DB trigger fires on every message INSERT via pg_net (async, non-blocking) | VERIFIED | Migration line 73: `CREATE TRIGGER on_message_insert_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message()`. Line 50: Uses `net.http_post()` (pg_net async HTTP). |
| 16 | No database schema changes (trigger + function only in migration) | VERIFIED | Migration has zero `ALTER TABLE` or `ADD COLUMN` statements. Only contains `CREATE EXTENSION`, `DROP TRIGGER IF EXISTS`, `CREATE OR REPLACE FUNCTION`, `CREATE TRIGGER`, and `COMMENT ON`. |

**Score:** 16/16 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/contexts/RealtimeContext.tsx` | iOS Realtime provider with single channel, WatermelonDB upsert | VERIFIED (372 lines) | Exports `RealtimeProvider` + `useRealtime`. Single channel per user, write queue, 3-tier sender name resolution, idempotent upsert. No stubs. |
| `web/lib/queries/comms.ts` | Web Realtime hook replacing polling | VERIFIED (418 lines) | `useRealtimeMessages` hook (line 360). Zero `refetchInterval` in messaging hooks. Imports `realtimeSupabase` from singleton. No stubs. |
| `web/components/dashboard/UnreadBadge.tsx` | Client component for live header badge | VERIFIED (53 lines) | Calls `useRealtimeMessages(orgId)` + `useConversations` for reactive unread count. Renders badge with 99+ cap. |
| `src/services/PushTokenService.ts` | Token registration, permission, change listener | VERIFIED (253 lines) | `registerPushToken`, `clearPushToken`, `getPermissionStatus`, `setupTokenChangeListener`. 7-day staleness check. Singleton export. No stubs. |
| `src/contexts/NotificationContext.tsx` | Foreground toast, background tap, badge management | VERIFIED (404 lines) | `NotificationProvider` + `useNotifications`. Foreground suppression + custom toast. Background tap deep-link. Badge via WatermelonDB count. Permission prompt with AsyncStorage. No stubs. |
| `supabase/functions/send-message-notification/index.ts` | Edge Function for GDPR-safe push via Expo API | VERIFIED (326 lines) | Sender name resolution (medics > profiles > fallback). Direct + broadcast handling. 100-token batching. DeviceNotRegistered cleanup. CORS. No stubs. |
| `supabase/migrations/150_message_notification_trigger.sql` | AFTER INSERT trigger on messages | VERIFIED (94 lines) | pg_net async HTTP, Vault secrets pattern, SECURITY DEFINER, no schema changes. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RealtimeContext.tsx` | WatermelonDB | `database.write()` in `handleMessageInsert` | WIRED | Line 209: `await database.write(async () => { ... })` creates Message record and updates Conversation |
| `RealtimeContext.tsx` | `supabase.channel` | Single Realtime subscription | WIRED | Line 314: `supabase.channel(channelName).on('postgres_changes', ...)` for messages INSERT + read status UPDATE |
| `web/lib/queries/comms.ts` | `supabase.channel` | Realtime subscription replaces polling | WIRED | Line 372: `realtimeSupabase.channel(channelName).on('postgres_changes', ...)` for messages INSERT + conversations UPDATE |
| `web/lib/queries/comms.ts` | TanStack Query cache | `invalidateQueries` on Realtime event | WIRED | Lines 386-391: Invalidates `['messages', conversationId]` and `['conversations']` on INSERT |
| `PushTokenService.ts` | `profiles.push_token` | Supabase update | WIRED | Line 139: `supabase.from('profiles').update({ push_token: token, push_token_updated_at: ... })` |
| `NotificationContext.tsx` | Conversation route | `router.push` on notification tap | WIRED | Line 166: `router.push('/messages/${conversationId}')` in `addNotificationResponseReceivedListener` |
| Migration trigger | Edge Function | `net.http_post` via pg_net | WIRED | Line 50-62: `net.http_post(url := v_project_url || '/functions/v1/send-message-notification', ...)` |
| Edge Function | Expo Push API | HTTP POST | WIRED | Line 200: `fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', body: JSON.stringify(payload) })` |
| `RealtimeProvider` | App root layout | Provider hierarchy | WIRED | `app/_layout.tsx` line 93: `<RealtimeProvider>` wraps `<BottomSheetModalProvider>` inside `<SyncProvider>` |
| `NotificationProvider` | Tabs layout | Provider wrapper | WIRED | `app/(tabs)/_layout.tsx` lines 64-68: `<NotificationProvider><TabsLayoutInner /></NotificationProvider>` |
| `UnreadBadge` | Dashboard layout | Component render | WIRED | `web/app/(dashboard)/layout.tsx` line 124: `<UnreadBadge initialConversations={initialConversations} orgId={orgId} />` |
| `ConversationList` | `useRealtimeMessages` | Hook call | WIRED | `web/app/(dashboard)/messages/components/ConversationList.tsx` line 37: `useRealtimeMessages(orgId)` |
| Messages page | `ConversationList` orgId prop | Server component passes orgId | WIRED | `messages/page.tsx` line 55: `<ConversationList initialConversations={conversations} orgId={orgId} />`. `[conversationId]/page.tsx` line 75: same pattern. |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| NOTIF-01: Medic receives iOS push notification when a new message arrives (app backgrounded) | SATISFIED | Edge Function sends via Expo Push API to registered tokens. DB trigger fires on every message INSERT. PushTokenService registers tokens. NotificationContext handles background tap navigation. |
| NOTIF-02: Push notification shows sender name only -- never message content (GDPR) | SATISFIED | Notification body is `New message from ${senderName}`. Edge Function never queries messages.content. Trigger payload has no content field. |
| NOTIF-03: Messages arrive in real-time when app/web is open (Supabase Realtime) | SATISFIED | iOS RealtimeContext with postgres_changes subscription + WatermelonDB upsert. Web useRealtimeMessages with TanStack Query cache invalidation. All polling removed from comms.ts. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODO, FIXME, placeholder, or stub patterns found in any Phase 43 artifact |

### Human Verification Required

### 1. Real-time Message Delivery (Web)
**Test:** Open two browser tabs as different users (e.g., org_admin and medic). Send a message from one. Verify it appears in the other within 1-2 seconds without page refresh.
**Expected:** Message appears in both the conversation list (preview/timestamp update) and the open message thread.
**Why human:** Requires two authenticated Supabase sessions and a real Realtime WebSocket connection.

### 2. Push Notification Permission Prompt (iOS)
**Test:** Fresh install the iOS app, log in, navigate to the Messages tab for the first time.
**Expected:** Native iOS push notification permission dialog appears. Subsequent Messages tab visits do not re-prompt.
**Why human:** Native iOS permission dialog interaction cannot be verified programmatically.

### 3. Push Notification Content (GDPR)
**Test:** Send a message to a medic whose iOS app is backgrounded. Inspect the push notification that arrives.
**Expected:** Notification reads "New message from [Name]" -- no message content visible anywhere (title, body, or subtitle).
**Why human:** Requires real device with push credentials, EAS project configured, and Edge Function deployed.

### 4. Deep Link on Notification Tap
**Test:** Receive a push notification while app is backgrounded. Tap it.
**Expected:** App opens directly to the specific conversation thread.
**Why human:** Requires real device tap interaction.

### 5. Foreground In-App Toast
**Test:** While the iOS app is open on a screen other than the conversation the message belongs to, receive a message.
**Expected:** Blue toast appears at top of screen with sender name and "View" button. Tapping "View" navigates to conversation. Toast auto-dismisses after 4 seconds.
**Why human:** Visual and behavioral verification of custom toast component.

### Gaps Summary

No gaps found. All 16 must-haves are verified at the code/structural level. The implementation is complete, substantive, and fully wired:

- **iOS Realtime:** Single channel per user with WatermelonDB upsert, serialized write queue, 3-tier sender name resolution, idempotent message creation.
- **Web Realtime:** Single channel per org with TanStack Query cache invalidation. All polling (30s conversations, 10s messages) completely removed from comms.ts.
- **Push Token Registration:** PushTokenService with conditional DB update (changed or >7 days stale), permission prompt deferred to first Messages tab visit via AsyncStorage flag.
- **Notification Handling:** NotificationContext with foreground suppression (shouldShowAlert: false), custom animated toast (#3B82F6), background tap deep-link via router.push, badge count from WatermelonDB.
- **Server Pipeline:** Edge Function sends GDPR-safe push ("New message from [Name]") via Expo Push API with 100-token batching. Handles both direct and broadcast. Excludes sender. Cleans up DeviceNotRegistered tokens.
- **DB Trigger:** AFTER INSERT on messages, pg_net async HTTP, Vault secrets authentication, no schema changes.

5 items flagged for human verification (real-time delivery, permission dialog, push content, deep link, toast behavior).

---

_Verified: 2026-02-19T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
