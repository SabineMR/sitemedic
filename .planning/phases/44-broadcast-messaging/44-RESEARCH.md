# Phase 44: Broadcast Messaging - Research

**Researched:** 2026-02-19
**Domain:** Broadcast messaging within existing Supabase messaging infrastructure
**Confidence:** HIGH

## Summary

Phase 44 adds broadcast messaging on top of the fully operational messaging stack (Phases 40-43). The schema already supports broadcasts: the `conversations` table has `type IN ('direct', 'broadcast')`, the `message_recipients` table was designed specifically for per-recipient read tracking, and the `send-message-notification` Edge Function already handles the `broadcast` conversation type with multi-recipient push delivery.

The implementation work is primarily **application-level**: creating the broadcast conversation record, inserting messages with recipient rows, building the admin compose/send UI, adapting the medic conversation list to show the Broadcasts channel distinctly, and adding the admin read-tracking drilldown. No novel database patterns are needed -- this phase extends existing patterns with broadcast-specific logic.

The key architectural decision (from CONTEXT.md) is the **single Broadcasts channel** model: one conversation record of type `'broadcast'` per org, with all broadcast messages collected chronologically. This is simpler than per-broadcast conversations and matches the "group announcement channel" metaphor.

**Primary recommendation:** Use the existing schema (conversations, messages, message_recipients) without migration changes beyond a unique index for the broadcast conversation. Build a dedicated `POST /api/messages/broadcast` API route that creates the broadcast conversation (if not exists), inserts the message, and bulk-inserts message_recipients rows for all active medics. Reuse existing Realtime and push notification infrastructure -- no changes needed to the Edge Function or Realtime subscriptions.

---

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.95.3 (existing) | Database queries, Realtime subscriptions | Already powers all messaging; broadcast uses same client |
| `@tanstack/react-query` | (existing) | Client-side cache + invalidation for conversations/messages | Already used by `useConversations`, `useMessages` hooks |
| `next` | (existing) | Server components, API routes | All messaging pages/routes use Next.js patterns |
| shadcn/ui components | (existing) | Dialog, Sheet, Badge, Button | Existing UI library used throughout dashboard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | (existing) | Icons (Megaphone/Radio for broadcast visual distinction) | Broadcast conversation row icon, compose button |
| `@nozbe/watermelondb` | 0.28.0 (existing) | iOS offline cache for broadcast messages | Phase 42 sync engine handles message caching already |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single broadcast conversation per org | Separate conversation per broadcast message | More conversations cluttering the list; harder to manage; CONTEXT.md explicitly chose single channel |
| `message_recipients` for read tracking | `conversation_read_status` with per-message granularity | `conversation_read_status` tracks last-read-at per conversation, not per message; `message_recipients` gives per-message, per-recipient read tracking exactly as needed |
| Server-side bulk insert in API route | Database function (plpgsql) for atomic insert | API route is simpler, easier to debug; transaction safety via Supabase client's single-connection model is sufficient |

---

## Architecture Patterns

### Recommended File Structure

```
web/app/api/messages/
  broadcast/
    route.ts                    # POST: Send broadcast (admin only)
    read/
      route.ts                  # PATCH: Mark broadcast message as read (medic)
    [messageId]/
      recipients/
        route.ts                # GET: Fetch read tracking for a broadcast message (admin only)

web/app/(dashboard)/messages/
  components/
    ConversationRow.tsx          # MODIFY: Add broadcast type handling
    ConversationList.tsx         # MODIFY: Include broadcast conversation in list
    MessageThread.tsx            # MODIFY: Hide input for medics viewing broadcast
    MessageItem.tsx              # MODIFY: Add read count display for admin
    BroadcastComposeDialog.tsx   # NEW: Admin compose + send confirmation
    BroadcastReadSummary.tsx     # NEW: "X of Y read" inline display
    BroadcastReadDrilldown.tsx   # NEW: Sheet/dialog with per-medic read status

web/lib/queries/
  comms.ts                       # MODIFY: fetchConversationsWithUnread to include broadcast type
  comms.hooks.ts                 # MODIFY: Add useBroadcastReadSummary hook

web/types/
  comms.types.ts                 # MODIFY: Add BroadcastRecipientDetail type (already has BroadcastReadSummary)
```

### Pattern 1: Single Broadcast Conversation Per Org

**What:** Each org has exactly one conversation record with `type = 'broadcast'`. All broadcast messages go into this single conversation. Medics see it as a "Broadcasts" channel in their conversation list.

**When to use:** Always -- this is the locked decision from CONTEXT.md.

**How it works:**

```typescript
// Ensure broadcast conversation exists (upsert pattern)
// Similar to the existing conversation creation in POST /api/messages/conversations

// 1. Try to find existing broadcast conversation
const { data: existing } = await supabase
  .from('conversations')
  .select('id')
  .eq('org_id', orgId)
  .eq('type', 'broadcast')
  .maybeSingle();

if (existing) {
  broadcastConversationId = existing.id;
} else {
  // Create the broadcast conversation
  const { data: newConv } = await supabase
    .from('conversations')
    .insert({
      org_id: orgId,
      type: 'broadcast',
      created_by: userId,
      // medic_id is NULL for broadcast (not tied to a single medic)
    })
    .select('id')
    .single();
  broadcastConversationId = newConv.id;
}
```

**Race condition protection:** Add a partial unique index (in migration) to guarantee only one broadcast conversation per org:
```sql
CREATE UNIQUE INDEX idx_conversations_org_broadcast
  ON conversations(org_id) WHERE type = 'broadcast';
```

### Pattern 2: Broadcast Send Flow (Admin API Route)

**What:** Admin sends broadcast message. API route inserts message + bulk-inserts message_recipients rows for every active medic.

**Transaction safety:** Uses sequential Supabase calls (message insert, then recipients insert). If recipients insert fails, the message exists but has no recipients -- recoverable by re-running the recipients insert.

```typescript
// POST /api/messages/broadcast
// 1. Validate admin role
// 2. Get or create broadcast conversation
// 3. Insert message
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id: broadcastConversationId,
    org_id: orgId,
    sender_id: user.id,
    message_type: 'text',
    content: trimmedContent,
    status: 'sent',
  })
  .select()
  .single();

// 4. Fetch all active medics in the org
const { data: medics } = await supabase
  .from('medics')
  .select('user_id')
  .eq('org_id', orgId);

// 5. Bulk-insert message_recipients (one row per medic)
const recipientRows = medics.map((m) => ({
  message_id: message.id,
  recipient_id: m.user_id,
  org_id: orgId,
}));

await supabase
  .from('message_recipients')
  .insert(recipientRows);

// 6. Update conversation metadata
await supabase
  .from('conversations')
  .update({
    last_message_at: message.created_at,
    last_message_preview: trimmedContent.substring(0, 100),
  })
  .eq('id', broadcastConversationId);
```

**Why this pattern:** The existing `on_message_insert_notify` trigger (migration 150) fires automatically on message INSERT, calling the Edge Function which already handles `conversation.type === 'broadcast'` for push notifications. No additional push notification code needed.

### Pattern 3: Broadcast Read Tracking (Per-Message, Per-Recipient)

**What:** When a medic opens the Broadcasts channel, mark all visible broadcast messages as read by upserting `message_recipients.read_at`.

**How it differs from direct messages:** Direct messages use `conversation_read_status` (one row per user per conversation, tracking "last read at"). Broadcasts use `message_recipients` (one row per user per message, tracking individual read status).

```typescript
// PATCH /api/messages/broadcast/read
// Called when medic opens the Broadcasts channel
// Marks all unread message_recipients rows for this user as read

const { error } = await supabase
  .from('message_recipients')
  .update({ read_at: new Date().toISOString() })
  .eq('recipient_id', user.id)
  .eq('org_id', orgId)
  .is('read_at', null);

// ALSO update conversation_read_status for unread badge calculation
await supabase
  .from('conversation_read_status')
  .upsert({
    user_id: user.id,
    conversation_id: broadcastConversationId,
    org_id: orgId,
    last_read_at: new Date().toISOString(),
  }, { onConflict: 'user_id,conversation_id' });
```

### Pattern 4: Read Summary Query (Admin View)

**What:** Admin sees "X of Y medics read" per broadcast message.

```typescript
// GET /api/messages/broadcast/{messageId}/recipients
// Returns read tracking summary + per-medic detail

const { data: recipients } = await supabase
  .from('message_recipients')
  .select(`
    recipient_id,
    read_at,
    delivered_at
  `)
  .eq('message_id', messageId)
  .eq('org_id', orgId);

// Join with medics for display names
const recipientIds = recipients.map(r => r.recipient_id);
const { data: medics } = await supabase
  .from('medics')
  .select('user_id, first_name, last_name')
  .in('user_id', recipientIds);

// Build summary
const total = recipients.length;
const readCount = recipients.filter(r => r.read_at !== null).length;
const details = recipients.map(r => {
  const medic = medics.find(m => m.user_id === r.recipient_id);
  return {
    recipient_id: r.recipient_id,
    name: medic ? `${medic.first_name} ${medic.last_name}` : 'Unknown',
    read_at: r.read_at,
    status: r.read_at ? 'read' : 'unread',
  };
});
```

### Pattern 5: Conversation List Adaptation

**What:** The existing `fetchConversationsWithUnread` must include broadcast conversations alongside direct ones.

**Current state:** The function filters `.eq('type', 'direct')`. For Phase 44, remove this filter and handle both types:

```typescript
// BEFORE (Phase 41):
const { data: conversations } = await supabase
  .from('conversations')
  .select('*')
  .eq('type', 'direct')   // <-- Remove this
  .order('last_message_at', { ascending: false, nullsFirst: false });

// AFTER (Phase 44):
const { data: conversations } = await supabase
  .from('conversations')
  .select('*')
  .in('type', ['direct', 'broadcast'])  // Include both types
  .order('last_message_at', { ascending: false, nullsFirst: false });
```

**Participant name resolution for broadcast:**
- For medics: `participant_name = 'Broadcasts'` (or org name)
- For admins: `participant_name = 'All Medics Broadcast'` (or similar)

### Anti-Patterns to Avoid

- **Creating a new conversation per broadcast message:** CONTEXT.md explicitly chose the single-channel model. One conversation of type 'broadcast' per org.
- **Using conversation_read_status alone for broadcast read tracking:** This only tracks "last read at" -- it cannot distinguish which individual messages a medic has/hasn't read. Use `message_recipients` for per-message granularity.
- **Modifying the send-message-notification Edge Function:** It already handles broadcast type correctly. Adding more logic increases risk of breaking existing 1:1 notifications.
- **Sending broadcast messages through the existing `/api/messages/send` route:** That route doesn't create `message_recipients` rows. Broadcast needs its own endpoint with bulk recipient creation.
- **Filtering "active medics" by `available_for_work`:** The `available_for_work` field is about shift availability, not org membership. All medics in the org should receive broadcasts. Simply query `medics WHERE org_id = X` to get all org medics.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Broadcast push notifications | Custom notification loop | Existing `on_message_insert_notify` trigger + Edge Function | Edge Function already handles `conversation.type === 'broadcast'` with multi-recipient push delivery (batched in 100s) |
| Real-time broadcast delivery | Custom WebSocket events or separate Realtime channel | Existing `useRealtimeMessages` subscription | It listens for INSERT on `messages` table filtered by `org_id` -- broadcast messages hit the same table and trigger the same Realtime events |
| Confirmation dialog before send | Custom modal from scratch | shadcn/ui `AlertDialog` component | AlertDialog provides accessible confirmation pattern with title, description, cancel/confirm buttons |
| Read tracking drilldown UI | Custom drawer/panel component | shadcn/ui `Sheet` component (existing) | Sheet provides slide-out panel pattern already used in dashboard |
| Unread badge for broadcast channel | Separate unread counter | Existing `conversation_read_status` + unread count logic in `fetchConversationsWithUnread` | Same pattern as direct messages -- compare `last_read_at` with messages in the broadcast conversation |
| Broadcast conversation creation race condition | Application-level locking | Partial unique index `ON conversations(org_id) WHERE type = 'broadcast'` | Database enforces uniqueness; handle 23505 error like existing conversation creation code |
| iOS offline broadcast caching | Custom broadcast sync | WatermelonDB (Phase 42) + existing MessageSync | Broadcast messages are regular messages in a conversation -- existing sync handles them |

**Key insight:** The messaging infrastructure (Phases 40-43) was designed with broadcast support in mind. The schema has `type IN ('direct', 'broadcast')`, the `message_recipients` table exists for per-recipient tracking, and the Edge Function handles broadcast push delivery. Phase 44's work is almost entirely UI and API-route level -- no infrastructure changes needed.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Create message_recipients Rows

**What goes wrong:** Admin sends broadcast, message is inserted, push notifications fire via the existing trigger, but no `message_recipients` rows are created. Admin sees "0 of 0 medics read" forever. Medics can still see the message (it's in the conversation), but read tracking is broken.

**Why it happens:** The existing `/api/messages/send` route does NOT insert `message_recipients` rows (it was built for direct messages only). If someone reuses that route for broadcasts, recipients never get tracked.

**How to avoid:** Create a dedicated `/api/messages/broadcast` route that explicitly inserts `message_recipients` rows in the same request as the message. Never route broadcast sends through the existing `/api/messages/send`.

**Warning signs:** Admin's read count shows "0 of 0" or `message_recipients` table is empty for broadcast messages.

### Pitfall 2: Duplicate Broadcast Conversations Per Org

**What goes wrong:** Two admins click "Send Broadcast" simultaneously. Two broadcast conversations are created. Medics see two "Broadcasts" channels. Messages split across them.

**Why it happens:** Without a unique constraint, the SELECT-then-INSERT pattern has a race window (same as the direct conversation race condition already handled in Phase 41).

**How to avoid:** Add a partial unique index: `CREATE UNIQUE INDEX idx_conversations_org_broadcast ON conversations(org_id) WHERE type = 'broadcast';`. Handle the 23505 (unique violation) error by falling back to SELECT, matching the existing pattern in `/api/messages/conversations`.

**Warning signs:** More than one conversation with `type = 'broadcast'` per org_id in the database.

### Pitfall 3: fetchConversationsWithUnread Breaks for Broadcast Type

**What goes wrong:** The existing `fetchConversationsWithUnread` function hardcodes `type: 'direct' as const` in its return mapping. If broadcast conversations are included in the query but the type mapping doesn't handle 'broadcast', TypeScript errors or runtime "Unknown" participant names appear.

**Why it happens:** The `ConversationListItem` type currently has `type: 'direct'` (not `'direct' | 'broadcast'`). The participant name resolution logic only handles medic vs admin, not the broadcast case.

**How to avoid:** Update `ConversationListItem.type` to `'direct' | 'broadcast'`. Add a broadcast branch in the participant name resolution: if `type === 'broadcast'`, set `participant_name = 'Broadcasts'` and `participant_role` to a suitable value.

**Warning signs:** TypeScript compile errors in ConversationList or ConversationRow after adding broadcast conversations to the query.

### Pitfall 4: Medic Can Send Messages in Broadcast Channel

**What goes wrong:** Medic opens the Broadcasts channel and sees the MessageInput component. They type and send a message. The message is inserted into the broadcast conversation. All other medics (and admin) see it -- breaking the one-way broadcast model.

**Why it happens:** The existing MessageThread component always renders MessageInput. There's no check for `conversation.type === 'broadcast'` to hide the input for non-admin users.

**How to avoid:** In the broadcast channel view, conditionally render MessageInput:
- For `org_admin`: Show the input (or a dedicated compose button)
- For `medic`: Hide the input entirely, or show a read-only notice

**Warning signs:** Medics can type and send in the broadcast channel.

### Pitfall 5: N+1 Read Summary Queries

**What goes wrong:** Admin opens the Broadcasts channel. For each visible broadcast message, a separate API call fetches read tracking from `message_recipients`. With 50 messages visible, that's 50 API calls.

**Why it happens:** Naive implementation fetches read summary per message on render.

**How to avoid:** Batch the read summary query. When loading messages for the broadcast conversation (admin view), also fetch aggregated read counts for all visible message IDs in a single query:

```typescript
// Single query for all message read counts
const { data } = await supabase
  .from('message_recipients')
  .select('message_id, read_at')
  .in('message_id', visibleMessageIds)
  .eq('org_id', orgId);

// Aggregate in JS
const summaryMap = new Map<string, { total: number; read: number }>();
```

**Warning signs:** Slow loading of broadcast channel for admin, many sequential API calls in network tab.

### Pitfall 6: Push Notification Edge Function Sends to ALL Org Profiles (Not Just Medics)

**What goes wrong:** The existing Edge Function's broadcast path queries `profiles WHERE org_id = X AND id != sender_id`. This includes ALL org users with push tokens -- potentially other admins, site managers, etc.

**Why it happens:** The Edge Function was written generically. It doesn't filter by role.

**How to avoid:** This may actually be desired (admins might want to see broadcast notifications too). However, if only medics should receive push notifications for broadcasts, the Edge Function would need modification. **For Phase 44, accept the current behavior** -- all org members except sender get notified. This matches the CONTEXT.md decision that "broadcasts go to all active medics" but is slightly broader (includes admins). The impact is minimal since most orgs have 1-2 admins.

**Warning signs:** Admins receiving push notifications for their own broadcasts (the `neq('id', sender_id)` filter prevents self-notification, but other admins would get it).

---

## Code Examples

### Broadcast Compose Dialog (Admin UI)

```typescript
// File: web/app/(dashboard)/messages/components/BroadcastComposeDialog.tsx
// Uses existing shadcn/ui Dialog + AlertDialog pattern

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Radio, Send, Loader2 } from 'lucide-react';

interface BroadcastComposeDialogProps {
  medicCount: number; // Total active medics in org
}

export function BroadcastComposeDialog({ medicCount }: BroadcastComposeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (res.ok) {
        const { conversationId } = await res.json();
        setContent('');
        setOpen(false);
        setShowConfirm(false);
        router.push(`/messages/${conversationId}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Radio className="h-4 w-4 mr-1" />
            Broadcast
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Broadcast</DialogTitle>
          </DialogHeader>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your broadcast message..."
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Will be sent to {medicCount} medic{medicCount !== 1 ? 's' : ''}
            </span>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!content.trim()}
            >
              <Send className="h-4 w-4 mr-1" />
              Send Broadcast
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {medicCount} medics?</AlertDialogTitle>
            <AlertDialogDescription>
              This broadcast will be delivered to all medics in your organisation.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### Broadcast ConversationRow Adaptation

```typescript
// Modification to existing ConversationRow.tsx
// Add broadcast type handling

// In the avatar section:
{conversation.type === 'broadcast' ? (
  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
    <Radio className="h-5 w-5 text-blue-600" />
  </div>
) : (
  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
    <span className="text-sm font-medium text-primary">{initial}</span>
  </div>
)}

// In the name/label section:
{conversation.type === 'broadcast' && (
  <Badge variant="secondary" className="text-[10px] ml-1">Broadcast</Badge>
)}
```

### Read Summary Inline Display (Admin View)

```typescript
// File: web/app/(dashboard)/messages/components/BroadcastReadSummary.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';

interface BroadcastReadSummaryProps {
  messageId: string;
  onDrilldown: () => void;
}

export function BroadcastReadSummary({ messageId, onDrilldown }: BroadcastReadSummaryProps) {
  const { data } = useQuery({
    queryKey: ['broadcast-read', messageId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/broadcast/${messageId}/recipients`);
      return res.json();
    },
  });

  if (!data) return null;

  return (
    <button
      onClick={onDrilldown}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
    >
      <Eye className="h-3 w-3" />
      <span>
        Read by {data.readCount} of {data.totalRecipients}
      </span>
    </button>
  );
}
```

### Read Drilldown (Sheet Pattern)

```typescript
// File: web/app/(dashboard)/messages/components/BroadcastReadDrilldown.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Check, Clock } from 'lucide-react';

interface BroadcastReadDrilldownProps {
  messageId: string;
  open: boolean;
  onClose: () => void;
}

export function BroadcastReadDrilldown({ messageId, open, onClose }: BroadcastReadDrilldownProps) {
  const { data } = useQuery({
    queryKey: ['broadcast-recipients', messageId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/broadcast/${messageId}/recipients`);
      return res.json();
    },
    enabled: open, // Only fetch when sheet is open
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            Read by {data?.readCount ?? 0} of {data?.totalRecipients ?? 0}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {data?.recipients?.map((r: any) => (
            <div key={r.recipient_id} className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium">{r.name}</span>
              {r.read_at ? (
                <Badge variant="outline" className="text-green-600">
                  <Check className="h-3 w-3 mr-1" /> Read
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" /> Unread
                </Badge>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate broadcast system (email blasts, SMS) | In-app broadcast via existing messaging infrastructure | Phase 44 design decision | Single system for all org communication; consistent UX |
| Per-broadcast conversation records | Single broadcast channel per org | CONTEXT.md decision | Cleaner conversation list; chronological broadcast history in one place |
| Manual read tracking (external spreadsheet) | Automatic per-recipient read tracking via `message_recipients` | Schema designed in Phase 40 | Real-time read status with drilldown |

### Existing Infrastructure That Phase 44 Leverages

| Component | Built In | What Phase 44 Uses |
|-----------|----------|-------------------|
| `conversations.type CHECK ('direct', 'broadcast')` | Phase 40 (migration 143) | Broadcast conversation type already in schema |
| `message_recipients` table | Phase 40 (migration 143) | Per-recipient read tracking (read_at, delivered_at) |
| `BroadcastReadSummary` type | Phase 40 (comms.types.ts) | Already defined in TypeScript types |
| `send-message-notification` Edge Function | Phase 43 (migration 150) | Already handles `conversation.type === 'broadcast'` with multi-recipient push |
| `on_message_insert_notify` trigger | Phase 43 (migration 150) | Fires on any message INSERT -- broadcasts included automatically |
| `useRealtimeMessages` hook | Phase 43 | Listens for INSERT on `messages` filtered by `org_id` -- broadcasts appear instantly |
| `conversation_read_status` table | Phase 40 (migration 143) | Used alongside `message_recipients` for unread badge on broadcast channel |

---

## Schema Analysis

### What Already Exists (No Changes Needed)

1. **`conversations` table** -- `type IN ('direct', 'broadcast')` already defined
2. **`messages` table** -- Works for broadcast messages (same columns: conversation_id, sender_id, content, etc.)
3. **`message_recipients` table** -- Designed for broadcast read tracking (message_id, recipient_id, read_at, delivered_at)
4. **`conversation_read_status` table** -- Works for broadcast unread badge (user_id, conversation_id, last_read_at)
5. **All RLS policies** -- org_id scoped, work for both types
6. **All indexes** -- org_id, conversation_id, message_id indexes already exist

### What Needs Adding (Migration 151)

1. **Partial unique index for broadcast conversation per org:**
   ```sql
   CREATE UNIQUE INDEX idx_conversations_org_broadcast
     ON conversations(org_id) WHERE type = 'broadcast';
   ```
   This prevents duplicate broadcast conversations per org (same race-condition protection pattern as `idx_conversations_org_medic_direct`).

2. **Composite index for read tracking queries:**
   ```sql
   CREATE INDEX idx_message_recipients_message_read
     ON message_recipients(message_id, read_at);
   ```
   This speeds up the "X of Y read" summary query.

### "Active Medics" Definition

The `medics` table does NOT have a `status` or `is_active` column. The `available_for_work` column indicates shift availability, not org membership. For broadcasts, "all active medics in the org" means:

```sql
SELECT user_id FROM medics WHERE org_id = $1
```

No additional filtering needed. All medics with records in the org receive broadcasts.

---

## Open Questions

### 1. Should Admin's Own Read Status Be Tracked?

**What we know:** Admin sends the broadcast. They can see it in the Broadcasts channel. The `message_recipients` rows are only created for medics (not the admin).

**What's unclear:** Should the admin have a `message_recipients` row? Probably not -- they sent it, so they've "read" it by definition. The read count shows "X of Y medics read" where Y = total medics, not total org members.

**Recommendation:** Do NOT create a `message_recipients` row for the sending admin. The read summary counts only medics.

### 2. Broadcast Channel Visibility When No Broadcasts Exist

**What we know:** The single broadcast conversation is created on first broadcast send. Before any broadcast is sent, the broadcast conversation doesn't exist.

**What's unclear:** Should medics see a "Broadcasts" channel before any broadcast has been sent?

**Recommendation:** Do NOT pre-create the broadcast conversation. It appears in the conversation list only after the first broadcast is sent. This keeps the list clean for orgs that don't use broadcasts.

### 3. Real-Time Read Count Updates for Admin

**What we know:** The existing Realtime subscription listens for `INSERT` on `messages` and `UPDATE` on `conversations`. It does NOT listen for changes to `message_recipients`.

**What's unclear:** Should admin see read counts update in real-time as medics open broadcasts?

**Recommendation:** Start without real-time read tracking. Admin sees counts when they load/refresh the broadcast channel. Adding a Realtime subscription on `message_recipients` would require adding a new subscription target in `useRealtimeMessages` -- this is straightforward but adds complexity. Can be added as a follow-up if users request it. For now, query-based refresh (TanStack Query refetchOnWindowFocus) is sufficient.

---

## Sources

### Primary (HIGH confidence)

- **Existing schema:** `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/143_comms_docs_schema.sql` -- conversations, messages, message_recipients tables with broadcast type support
- **Existing Edge Function:** `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/send-message-notification/index.ts` -- already handles broadcast type with multi-recipient push
- **Existing notification trigger:** `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/150_message_notification_trigger.sql` -- fires on any message INSERT
- **Existing web messaging components:** `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/messages/` -- ConversationList, ConversationRow, MessageThread, MessageInput, MedicPicker
- **Existing query functions:** `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/comms.ts` -- fetchConversationsWithUnread, fetchMessagesForConversation
- **Existing Realtime hook:** `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/comms.hooks.ts` -- useRealtimeMessages
- **Existing types:** `/Users/sabineresoagli/GitHub/sitemedic/web/types/comms.types.ts` -- ConversationType includes 'broadcast', BroadcastReadSummary defined
- **Existing API routes:** `/Users/sabineresoagli/GitHub/sitemedic/web/app/api/messages/` -- send, conversations, conversations/[id]/read
- **Phase 43 Research:** `/Users/sabineresoagli/GitHub/sitemedic/.planning/phases/43-real-time-push-notifications/43-RESEARCH.md`
- **Phase 44 CONTEXT.md:** `/Users/sabineresoagli/GitHub/sitemedic/.planning/phases/44-broadcast-messaging/44-CONTEXT.md`

### Secondary (MEDIUM confidence)

- Supabase RLS documentation for org_id scoped policies
- shadcn/ui Sheet and AlertDialog component documentation

### Tertiary (LOW confidence)

- None -- all findings verified against existing codebase

---

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH -- All libraries already installed and in use; no new dependencies
- **Architecture Patterns:** HIGH -- All patterns derived from existing codebase (Phase 40-43 implementation); schema already supports broadcasts
- **Pitfalls:** HIGH -- Identified from direct code review of existing messaging implementation; specific to this codebase
- **Code Examples:** HIGH -- Based on existing patterns (ConversationRow, MedicPicker, MessageThread) and confirmed API structure

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days -- stable domain, no external dependencies)

---

## Implementation Readiness

Phase 44 is ready for planning. All infrastructure dependencies are in place:

- Schema supports broadcast type (conversations, messages, message_recipients) -- Migration 143
- Edge Function handles broadcast push notifications -- Migration 150
- Realtime subscription delivers broadcast messages instantly -- Phase 43
- TypeScript types include BroadcastReadSummary -- comms.types.ts
- UI components provide extensible patterns -- ConversationRow, MessageThread, MedicPicker
- shadcn/ui provides Sheet (drilldown) and AlertDialog (confirmation) -- existing components
- Next migration number: **151** (after 150_message_notification_trigger.sql)

No blockers. Recommend proceeding with planning.
