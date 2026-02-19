# Phase 41: Web Messaging Core - Research

**Researched:** 2026-02-19
**Domain:** Next.js web messaging UI with Supabase backend
**Confidence:** HIGH

## Summary

Phase 41 builds a web-only 1:1 messaging interface on top of the database schema created in Phase 40. The conversations, messages, and conversation_read_status tables already exist with org-scoped RLS. This phase creates the Next.js pages, query functions, API routes, and client components for the messaging experience.

The existing codebase uses a consistent pattern: server components fetch data via Supabase server client, pass to client components for interactivity. ShadcN/UI provides the component library. Navigation is configured in `DashboardNav.tsx`. No new libraries are needed — everything builds on existing patterns.

**Primary recommendation:** Follow the existing server-component-fetches + client-component-renders pattern. No real-time (Phase 43), no new libraries needed. Standard CRUD with existing Supabase client and shadcn/ui components.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.2.3 | App router pages, API routes | Already in use |
| @supabase/ssr | 0.8.0 | Server-side Supabase client | Already in use |
| @supabase/supabase-js | 2.95.3 | Browser-side Supabase client | Already in use |
| @tanstack/react-query | 5.90.21 | Client-side data caching | Already in use |
| lucide-react | 0.564.0 | Icons (MessageSquare, Send, ArrowLeft, etc.) | Already in use |
| shadcn/ui | (local) | Button, Card, Badge, Input, Dialog, Skeleton | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns or built-in Intl | existing | Relative timestamps ("10:30 AM", "Yesterday") | Message and conversation timestamps |

### Alternatives Considered

None — this phase uses only existing project dependencies.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
web/app/(dashboard)/messages/
├── page.tsx                     # Server component — fetches conversations, renders two-panel layout
├── layout.tsx                   # Optional layout wrapper
└── components/
    ├── ConversationList.tsx      # Client — sidebar with conversation rows
    ├── ConversationRow.tsx       # Client — single conversation row (name, preview, time, badge)
    ├── MessageThread.tsx         # Client — message list + send form for selected conversation
    ├── MessageBubble.tsx         # Client — single message display (flat, not bubble style)
    ├── MessageInput.tsx          # Client — textarea with Enter-to-send, Shift+Enter for newline
    ├── MedicPicker.tsx           # Client — dialog to pick medic for new conversation (admin only)
    └── EmptyState.tsx            # Client — "No conversations yet" with CTA
web/lib/queries/
└── comms.ts                     # Server-side query functions for conversations and messages
web/app/api/messages/
├── send/route.ts                # POST — send a message
├── conversations/route.ts       # POST — create conversation, GET — list conversations
└── conversations/[id]/
    └── read/route.ts            # PATCH — mark conversation as read
```

### Pattern 1: Server Component Data Fetch

**What:** Page server component fetches initial data, passes to client components
**When to use:** Every page load
**Example:**
```typescript
// web/app/(dashboard)/messages/page.tsx
export default async function MessagesPage() {
  const supabase = await createClient();
  const conversations = await fetchConversations(supabase);
  return <MessagingLayout initialConversations={conversations} />;
}
```

### Pattern 2: Client Component with useQuery

**What:** Client component uses @tanstack/react-query for cache + refetch
**When to use:** Conversation list and message thread components
**Example:**
```typescript
'use client';
const { data: conversations } = useQuery({
  queryKey: ['conversations'],
  queryFn: async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });
    return data;
  },
  initialData: initialConversations,
});
```

### Pattern 3: API Route for Mutations

**What:** POST/PATCH API routes handle writes (send message, create conversation, mark read)
**When to use:** All state-changing operations
**Example:**
```typescript
// web/app/api/messages/send/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { conversationId, content } = await request.json();
  // Insert message, update conversation.last_message_at + last_message_preview
  // Return created message
}
```

### Pattern 4: Unread Count Query

**What:** Join conversations with conversation_read_status to compute unread count
**When to use:** Conversation list display
**Example:**
```sql
-- Unread = messages created after user's last_read_at for that conversation
SELECT c.*,
  (SELECT COUNT(*) FROM messages m
   WHERE m.conversation_id = c.id
   AND m.created_at > COALESCE(
     (SELECT last_read_at FROM conversation_read_status
      WHERE conversation_id = c.id AND user_id = auth.uid()),
     '1970-01-01'
   )
   AND m.sender_id != auth.uid()
   AND m.deleted_at IS NULL
  ) as unread_count
FROM conversations c
WHERE c.org_id = get_user_org_id()
ORDER BY c.last_message_at DESC;
```

### Anti-Patterns to Avoid

- **Don't use client-side Supabase for initial data fetch:** Use server component with server client. Client-side fetch only for subsequent loads via react-query.
- **Don't create a new conversation if one exists:** The unique partial index `(org_id, medic_id) WHERE type = 'direct'` enforces this at DB level. Use INSERT ... ON CONFLICT to upsert.
- **Don't fetch all messages at once:** Paginate with cursor-based pagination (created_at DESC, limit 50). Load more on scroll up.
- **Don't poll for new messages:** Phase 41 is web-only without real-time. Users refresh the page or re-navigate to see new messages. Real-time is Phase 43.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative timestamps | Custom date formatter | `Intl.RelativeTimeFormat` or date-fns `formatDistanceToNow` | Edge cases with timezones, "yesterday" vs "2 days ago" |
| Text truncation | Manual substring | CSS `text-overflow: ellipsis` + `line-clamp` | Handles Unicode, variable width correctly |
| Enter/Shift+Enter handling | Custom keydown logic | Standard textarea onKeyDown with e.key === 'Enter' && !e.shiftKey | Well-known pattern, no library needed |
| Scroll to bottom | Custom scroll calculation | `ref.scrollIntoView({ behavior: 'smooth' })` on last message element | Browser-native, handles dynamic content |

**Key insight:** This phase is standard CRUD with a messaging UI pattern. Every component has a well-known implementation — no novel technical challenges.

## Common Pitfalls

### Pitfall 1: Race condition on conversation creation
**What goes wrong:** Two users create the same conversation simultaneously
**Why it happens:** Network latency between check and insert
**How to avoid:** Use INSERT ... ON CONFLICT (org_id, medic_id) WHERE type = 'direct' DO NOTHING RETURNING *. If no row returned, SELECT the existing one.
**Warning signs:** Duplicate conversation errors in logs

### Pitfall 2: Stale conversation list after sending
**What goes wrong:** User sends a message but conversation list doesn't update (last_message_preview, last_message_at)
**Why it happens:** Message insert doesn't update conversation table
**How to avoid:** Either use a database trigger (already may exist from Phase 40) or update conversation metadata in the same API call that inserts the message. Invalidate react-query cache after send.
**Warning signs:** Conversation list shows old preview/timestamp after sending

### Pitfall 3: Unread count includes own messages
**What goes wrong:** User sees unread badge on conversations they just sent to
**Why it happens:** Unread query counts all messages after last_read_at, including sender's own
**How to avoid:** Filter `sender_id != auth.uid()` in unread count query
**Warning signs:** Badge shows "1" immediately after sending

### Pitfall 4: Mark-as-read not updating on navigation
**What goes wrong:** Opening a conversation doesn't clear its unread badge
**Why it happens:** Forgot to upsert conversation_read_status when entering thread
**How to avoid:** On thread open, UPSERT conversation_read_status with last_read_at = now(). Invalidate conversation list query.
**Warning signs:** Badge persists after reading messages

### Pitfall 5: Textarea grows unbounded
**What goes wrong:** Message input grows taller than viewport when user types long message
**Why it happens:** Auto-resize textarea without max-height
**How to avoid:** Set max-height with overflow-y: auto on the textarea
**Warning signs:** Page layout breaks with long messages

## Code Examples

### Fetching conversations with unread count

```typescript
// web/lib/queries/comms.ts
export async function fetchConversations(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      conversation_read_status!inner (last_read_at)
    `)
    .eq('type', 'direct')
    .order('last_message_at', { ascending: false });

  // Note: unread_count may need to be computed client-side or via RPC
  // depending on Supabase query capabilities
  return data ?? [];
}
```

### Sending a message

```typescript
// API route pattern
const { data: message, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    org_id: orgId,
    sender_id: userId,
    message_type: 'text',
    content: content.trim(),
    status: 'sent',
  })
  .select()
  .single();

// Update conversation metadata
await supabase
  .from('conversations')
  .update({
    last_message_at: message.created_at,
    last_message_preview: content.trim().substring(0, 100),
  })
  .eq('id', conversationId);
```

### Mark as read

```typescript
await supabase
  .from('conversation_read_status')
  .upsert({
    user_id: userId,
    conversation_id: conversationId,
    org_id: orgId,
    last_read_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,conversation_id',
  });
```

### Enter-to-send with Shift+Enter for newline

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getServerSideProps | App Router server components | Next.js 13+ | Data fetching in component, not page-level |
| REST API everywhere | Direct Supabase client queries | Current | RLS handles auth, no manual auth checks needed |
| Custom scroll management | CSS `overflow-anchor: auto` | Modern browsers | Browser handles scroll anchoring natively |

## Open Questions

1. **Trigger for updating conversation metadata on message insert**
   - What we know: conversations.last_message_at and last_message_preview need updating when a message is sent
   - What's unclear: Did Phase 40 create a database trigger for this, or should the API route handle it?
   - Recommendation: Check migration 143 for triggers. If none, handle in API route (update conversation in same transaction as message insert)

2. **Medic roster query for picker**
   - What we know: Admin needs to pick from medics in their org
   - What's unclear: Exact table/query to get org medics (medics table? users table with role filter?)
   - Recommendation: Planner should check existing medic queries in web/lib/queries/

3. **Header unread badge**
   - What we know: Context says top-right header icon with unread count badge
   - What's unclear: Where is the header component? How to pass unread count to it?
   - Recommendation: Planner should locate header component and determine if it uses server or client-side data

## Sources

### Primary (HIGH confidence)
- Codebase exploration of existing patterns (server components, query functions, API routes, navigation)
- Phase 40 migration files (143, 144) — schema is established fact
- Phase 41 CONTEXT.md — user decisions are locked

### Secondary (MEDIUM confidence)
- Next.js App Router patterns (well-established, verified by existing codebase usage)
- Supabase query patterns (verified by existing codebase usage)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use in the project
- Architecture: HIGH — follows existing patterns exactly
- Pitfalls: HIGH — standard messaging UI pitfalls, well-documented domain

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable — no external dependencies, all internal patterns)
