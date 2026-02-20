---
phase: 42-ios-messaging-offline
verified: 2026-02-20T06:15:00Z
status: passed
score: 4/4 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "recomputeUnreadCounts queries by conv.id (local WatermelonDB ID) instead of conv.serverId -- unread badges now correctly count messages"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open the Messages tab in the iOS app and verify conversations load with correct names, previews, timestamps, and unread badges"
    expected: "Conversation list matches web dashboard; unread badge shows accurate count on both the conversation row and the tab icon"
    why_human: "Visual layout, real Supabase data, and correct badge rendering cannot be confirmed without running the app"
  - test: "Send a message from the iOS app and verify it appears on the web dashboard within seconds; then send from web and pull-to-refresh on iOS"
    expected: "Message appears on both platforms with correct sender name, content, and timestamp"
    why_human: "Cross-platform sync with real Supabase requires live network testing"
  - test: "Enable Airplane Mode, open conversations and read messages, compose and send a new message, then disable Airplane Mode"
    expected: "Cached conversations and messages are viewable offline. Sent message shows 'Sending...' indicator. After reconnect, message is delivered and appears on web. No duplicate messages created."
    why_human: "Offline/online transitions, queue delivery, and deduplication require real device testing"
---

# Phase 42: iOS Messaging & Offline Verification Report

**Phase Goal:** Messaging works on the iOS app with the same functionality as web, messages sync between platforms, and medics can view cached messages and queue outbound messages when offline
**Verified:** 2026-02-20T06:15:00Z
**Status:** passed
**Re-verification:** Yes -- after gap closure (commits 7331f4e and 86300e9 fixed conversation_id consistency)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A medic can open the messaging section in the iOS app and see the same conversation list as on web (synced via Supabase) | VERIFIED | pullSync fetches conversations from Supabase (line 110-116), upserts into WatermelonDB with participant names resolved from medics table (lines 137-151, 164-179). ConversationList uses reactive WatermelonDB observe() (ConversationList.tsx lines 50-58). Tab badge observes conversations with unread_count > 0 via observeCount (_layout.tsx lines 73-74, 185). ConversationRow displays participantName, lastMessagePreview, lastMessageAt, and unreadCount badge (ConversationRow.tsx lines 88-136). |
| 2 | A medic can send and receive messages in the iOS app, and those messages appear on the web dashboard (and vice versa) | VERIFIED | **Send path:** MessageInput creates local WatermelonDB message with status='queued' and local conversationId (MessageInput.tsx lines 71-86), fire-and-forget pushPendingMessages (lines 102-105). pushPendingMessages resolves local conversation ID to server_id via resolveConversationServerId (MessageSync.ts lines 443-444, 597-616), POSTs to Supabase with idempotency_key (lines 472-484), updates local status to 'sent' (lines 530-535). **Receive path:** pullSync builds serverToLocalConvId map (lines 311-323) and stores localConvId on pulled messages (line 360). MessageThread queries by local WatermelonDB ID (MessageThread.tsx line 55). **Unread counts:** recomputeUnreadCounts queries by conv.id (local ID, line 572) -- now consistent with how both pullSync and MessageInput store conversation_id on messages. |
| 3 | When the device is offline, previously loaded conversations and messages are viewable from WatermelonDB local cache | VERIFIED | ConversationList uses WatermelonDB observe() with no network dependency (lines 50-58). MessageThread reads from WatermelonDB with Q.where + observe() (lines 52-63). Offline banner shown when isOnline=false (ConversationList.tsx lines 112-118, MessageInput.tsx lines 117-123). Pull-to-refresh gracefully skips sync when offline (ConversationList.tsx line 68-69). |
| 4 | When the device is offline, a medic can compose and send a message -- the message is queued locally and automatically delivered when connectivity returns, with no duplicate messages | VERIFIED | MessageInput creates WatermelonDB record with status='queued' and UUID idempotency_key (lines 69-86). Auto-sync via NetworkMonitor listener triggers push-then-pull on reconnect (MessageSync.ts lines 50-59). pushPendingMessages includes SELECT-before-INSERT deduplication via metadata JSONB contains query (lines 450-468). 23505 duplicate constraint handling (lines 490-498). 24-hour stale message expiry marks old queued messages as 'failed' (lines 431-439). Failed messages have tap-to-retry UI (MessageItem.tsx lines 137-145, MessageThread.tsx lines 83-98). |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/database/schema.ts` | Schema v5 with conversations + messages tables | VERIFIED | 164 lines, version 5 confirmed |
| `src/database/models/Conversation.ts` | WatermelonDB model for conversations | VERIFIED | 20 lines, all fields decorated |
| `src/database/models/Message.ts` | WatermelonDB model for messages | VERIFIED | 18 lines, status + idempotencyKey fields present |
| `src/database/models/index.ts` | 8 model classes registered | VERIFIED | 19 lines, all 8 models exported |
| `src/database/migrations.ts` | v4 to v5 migration | VERIFIED | 108 lines, toVersion 5 creates both tables |
| `src/services/MessageSync.ts` | Pull/push sync with auto-sync | VERIFIED | 633 lines. Both conversation_id bugs FIXED: pullSync stores local WatermelonDB ID (line 360); recomputeUnreadCounts queries by conv.id (line 572) |
| `src/contexts/SyncContext.tsx` | Message sync integration | VERIFIED | 316 lines, messageSyncStatus and triggerMessageSync exposed, startAutoSync on auth |
| `app/(tabs)/_layout.tsx` | Messages tab with unread badge | VERIFIED | 268 lines, observeCount on conversations with unread_count > 0 (line 73-74) |
| `app/(tabs)/messages.tsx` | Messages tab entry screen | VERIFIED | 62 lines, renders ConversationList, triggers initial sync on mount |
| `app/messages/[conversationId].tsx` | Dynamic route for thread | VERIFIED | 106 lines, loads conversation by local ID, marks as read, renders MessageThread |
| `src/components/messaging/ConversationList.tsx` | Conversation list with reactive WatermelonDB | VERIFIED | 217 lines, FlatList with observe(), pull-to-refresh, search, offline banner |
| `src/components/messaging/ConversationRow.tsx` | Conversation row with avatar and badge | VERIFIED | 222 lines, avatar, participant name, preview, timestamp, unread badge |
| `src/components/messaging/MessageThread.tsx` | Inverted FlatList for messages | VERIFIED | 167 lines, inverted FlatList with KeyboardAvoidingView, queries by local ID (line 55) |
| `src/components/messaging/MessageItem.tsx` | Message display with status indicators | VERIFIED | 229 lines, Slack-style layout, queued/failed indicators, tap-to-retry |
| `src/components/messaging/MessageInput.tsx` | Return-to-send input | VERIFIED | 217 lines, returnKeyType="send", creates local record with status='queued' and UUID idempotency_key, fire-and-forget push, offline banner |
| `src/components/messaging/MedicPicker.tsx` | New conversation flow | VERIFIED | 511 lines, admin medic roster + medic "Message Admin" button, duplicate handling |
| `src/components/messaging/EmptyState.tsx` | Empty state with action button | VERIFIED | 63 lines, centered layout with title, subtitle, action slot |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ConversationList | WatermelonDB | observe() query | WIRED | Reactive subscription on conversations sorted by last_message_at desc (line 50-58) |
| Tab badge | WatermelonDB | observeCount | WIRED | _layout.tsx observes conversations with unread_count > 0 (lines 73-74, 185) |
| MessageThread | WatermelonDB messages | Q.where('conversation_id') | WIRED | Queries by local WatermelonDB ID (line 55), matches pullSync localConvId (line 360) |
| MessageInput | WatermelonDB | database.write + create | WIRED | Creates Message record with status='queued', updates Conversation metadata (lines 71-97) |
| MessageInput | Supabase (push) | fire-and-forget pushPendingMessages | WIRED | After local create, triggers async push sync (lines 102-105) |
| pullSync | serverToLocalConvId map | Q.where('server_id', Q.oneOf()) | WIRED | Lines 311-323: builds map from server UUID to local ID before storing messages |
| pullSync messages | local conversation ID | serverToLocalConvId.get() | WIRED | Line 331+360: each pulled message gets localConvId, not server UUID |
| recomputeUnreadCounts | messages table | Q.where('conversation_id', conv.id) | WIRED (FIXED) | Line 572: queries by conv.id (local WatermelonDB ID), matching how all messages store conversation_id |
| pushPendingMessages | Supabase REST | resolveConversationServerId + insert | WIRED | Resolves local ID back to server UUID for Supabase API call (lines 443-444, 597-616) |
| pushPendingMessages | deduplication | idempotency_key in metadata JSONB | WIRED | SELECT-before-INSERT (lines 450-468) + 23505 constraint handling (lines 490-498) |
| NetworkMonitor | auto-sync | listener callback | WIRED | On reconnect: push then pull (lines 50-59) |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| MSG-07 (iOS messaging) | SATISFIED | Truths 1 and 2 verified -- iOS app has full conversation list and message thread |
| MSG-08 (offline messaging) | SATISFIED | Truths 3 and 4 verified -- WatermelonDB cache + queued send + auto-delivery |
| PLAT-01 (cross-platform sync) | SATISFIED | Truths 1 and 2 verified -- messages sync between iOS and web via Supabase |

### Anti-Patterns Found

None. Both fixes were targeted single-line changes:
- Commit 7331f4e: Added serverToLocalConvId map construction (lines 311-323) and changed message storage to use localConvId (line 360)
- Commit 86300e9: Changed `conv.serverId` to `conv.id` on line 572

No TODO/FIXME/placeholder patterns, no empty returns, no stub implementations.

### Human Verification Required

### 1. Conversation List Visual Check

**Test:** Open the Messages tab in the iOS app after a fresh pull sync. Compare the conversation list to the web dashboard.
**Expected:** Same conversations appear with matching names, message previews, timestamps, and accurate unread badge counts. Tab icon shows total unread count matching the sum of conversation-level badges.
**Why human:** Visual layout correctness and real Supabase data rendering cannot be verified programmatically.

### 2. Cross-Platform Message Delivery

**Test:** Send a message from the iOS app. Open the web dashboard and verify it appears. Then send a reply from the web and pull-to-refresh on iOS.
**Expected:** Messages appear on both platforms with correct sender name, content, and timestamp. No duplicates.
**Why human:** End-to-end sync with real Supabase requires live network testing across two clients.

### 3. Offline Queue and Delivery

**Test:** Enable Airplane Mode on the iOS device. Browse existing conversations and read messages. Compose and send a new message. Then disable Airplane Mode.
**Expected:** Cached conversations and messages are viewable while offline. The sent message shows a "Sending..." indicator. After reconnect, the message is automatically delivered, status changes to sent, and it appears on the web dashboard. No duplicate messages are created.
**Why human:** Offline/online transitions, NetworkMonitor listener firing, queue delivery, and idempotency deduplication require real device testing.

### Gap Closure Summary

**Previous gap (from 2nd verification):** `recomputeUnreadCounts` on line 572 queried messages by `conv.serverId` instead of `conv.id`. Since pullSync (after the first fix) stores the local WatermelonDB ID as `conversation_id` on all pulled messages, the unread count query found zero matches, causing unread badges to always show 0.

**Fix applied (commit 86300e9):** Changed `Q.where('conversation_id', conv.serverId || '')` to `Q.where('conversation_id', conv.id)` on line 572 of `src/services/MessageSync.ts`.

**Verification:** The entire conversation_id chain is now consistent across all code paths:
1. **pullSync** stores `record.conversationId = localConvId` (local WatermelonDB ID) -- line 360
2. **MessageInput** creates messages with `record.conversationId = conversationId` (local WatermelonDB ID from route) -- line 76
3. **MessageThread** queries `Q.where('conversation_id', conversationId)` (local WatermelonDB ID from props) -- line 55
4. **recomputeUnreadCounts** queries `Q.where('conversation_id', conv.id)` (local WatermelonDB ID) -- line 572
5. **pushPendingMessages** resolves local ID back to server UUID via `resolveConversationServerId()` for Supabase API -- line 443

No regressions detected. All 17 artifacts pass existence + substantive + wired checks. All 10 key links verified.

---

_Verified: 2026-02-20T06:15:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: 3rd pass -- both gaps from initial verification now closed_
