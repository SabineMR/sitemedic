# Phase 47: Message Polish - Research

**Researched:** 2026-02-20
**Domain:** Messaging UX completion -- delivery/read status, cross-conversation search, file attachments
**Confidence:** HIGH

## Summary

Phase 47 adds three polishing features to the existing messaging system built in Phases 41-44: delivery/read status indicators (tick marks), cross-conversation full-text search, and file attachments on messages. The existing codebase already has strong foundations for all three: the `messages.status` column already supports `sent`/`delivered`/`read` values (migration 143), the `message-attachments` Storage bucket already exists with RLS policies (migration 144), and Supabase Realtime subscriptions are already wired up for message INSERT and conversation UPDATE events.

The standard approach uses PostgreSQL-native full-text search (tsvector/tsquery with GIN index) for search, Supabase Realtime `postgres_changes` for live status updates, and the existing Supabase Storage `upload()` + `createSignedUrl()` pattern (already proven in Phase 45 document uploads) for attachments. No new external libraries are needed -- all three features can be built with the existing stack (Supabase JS, TanStack Query, Lucide icons, Next.js API routes).

**Primary recommendation:** Leverage existing schema infrastructure (messages.status column, message-attachments bucket, Realtime channel) and add only a tsvector generated column + GIN index for search, an attachment metadata JSONB convention on messages.metadata, and a Realtime subscription for message UPDATE events to deliver all three features.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.95.3 | Realtime subscriptions, Storage upload/download, database queries | Already in use; provides postgres_changes for status updates, Storage API for attachments, textSearch for FTS |
| @tanstack/react-query | ^5.90.21 | Client-side cache invalidation on Realtime events | Already in use; query invalidation pattern established in comms.hooks.ts |
| lucide-react | ^0.564.0 | Icons for tick marks, attachment button, search | Already in use; has Check, CheckCheck, Paperclip, Search, FileText, Image, Download icons |
| Next.js API routes | ^15.2.3 | Server-side file upload handling, search API, status update API | Already in use; FormData parsing pattern proven in /api/documents/upload |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.7 | Toast notifications for upload success/failure | Already in use; same pattern as document upload dialog |
| zod | ^4.3.6 | Request body validation | Already in use; for validating attachment metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL FTS (tsvector) | Supabase pg_trgm (trigram) | Trigram better for fuzzy/typo-tolerant search, but FTS is more standard for keyword search across messages and already supported by Supabase JS `textSearch()` filter |
| Server-side upload via API route | Client-side signed upload URL | Signed URLs bypass Next.js 1MB body limit; however, message-attachments bucket has 10MB limit and the existing document upload uses server-side FormData which works fine up to ~10MB |
| Custom SVG tick icons | Lucide Check/CheckCheck | Lucide already has CheckCheck (double tick) which is the exact WhatsApp-style pattern |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
web/app/(dashboard)/messages/
├── page.tsx                                    # Conversation list (existing)
├── [conversationId]/page.tsx                  # Conversation thread (existing)
├── components/
│   ├── MessageItem.tsx                        # MODIFY: add status ticks + attachment display
│   ├── MessageThread.tsx                      # MODIFY: add search navigation scroll-to
│   ├── MessageInput.tsx                       # MODIFY: add attachment button + file picker
│   ├── MessageStatusIndicator.tsx             # NEW: tick icon component (sent/delivered/read)
│   ├── MessageAttachment.tsx                  # NEW: inline attachment display with download
│   ├── AttachmentPicker.tsx                   # NEW: file selection dropzone for message compose
│   ├── ConversationList.tsx                   # MODIFY: search input evolves to cross-conversation
│   ├── ConversationSearch.tsx                 # NEW: cross-conversation search overlay/panel
│   └── SearchResultItem.tsx                   # NEW: single search result row
web/app/api/messages/
│   ├── send/route.ts                          # MODIFY: handle attachment message_type
│   ├── search/route.ts                        # NEW: full-text search endpoint
│   ├── [messageId]/status/route.ts            # NEW: update message status (delivered/read)
│   └── attachments/
│       ├── upload/route.ts                    # NEW: upload file to message-attachments bucket
│       └── [attachmentPath]/download/route.ts # NEW: generate signed URL for download
web/lib/queries/
│   ├── comms.ts                               # MODIFY: add search query function
│   └── comms.hooks.ts                         # MODIFY: add Realtime UPDATE subscription for status
web/types/
│   └── comms.types.ts                         # MODIFY: attachment metadata type
supabase/migrations/
│   └── 1XX_message_polish.sql                 # NEW: tsvector column, GIN index, updated_at trigger
```

### Pattern 1: Message Status State Machine
**What:** Messages progress through a strict status state machine: `sent` -> `delivered` -> `read`. Status can only advance forward, never backwards.
**When to use:** Every time a message is created or a status update event occurs.
**Example:**
```typescript
// Status advancement logic (server-side, in API route)
// Only allow forward transitions
const STATUS_ORDER = { sent: 0, delivered: 1, read: 2 } as const;

function canAdvanceStatus(current: MessageStatus, next: MessageStatus): boolean {
  return STATUS_ORDER[next] > STATUS_ORDER[current];
}

// In PATCH /api/messages/[messageId]/status:
// 1. Fetch current status
// 2. Validate forward transition
// 3. UPDATE messages SET status = $next, updated_at = NOW() WHERE id = $id AND status = $current
// The WHERE clause prevents race conditions (optimistic concurrency)
```
**Source:** Application-level pattern; status column and CHECK constraint already exist in migration 143.

### Pattern 2: Realtime Status Updates via postgres_changes UPDATE
**What:** Subscribe to UPDATE events on the `messages` table, filtered by org_id, to receive live status changes. When a status update payload arrives, update the TanStack Query cache for that conversation's messages.
**When to use:** In the existing `useRealtimeMessages` hook.
**Example:**
```typescript
// Add to existing useRealtimeMessages hook in comms.hooks.ts
// Source: Existing INSERT subscription pattern + Supabase Realtime docs
channel.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'messages',
    filter: `org_id=eq.${orgId}`,
  },
  (payload) => {
    const conversationId = payload.new?.conversation_id;
    if (conversationId) {
      queryClient.invalidateQueries({
        queryKey: ['messages', conversationId],
      });
    }
  }
)
```
**Source:** [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes)

### Pattern 3: PostgreSQL Full-Text Search with Generated Column
**What:** Add a `fts` tsvector generated column on the `messages` table that automatically stays in sync with the `content` column. Create a GIN index for fast search. Query using Supabase JS `textSearch()` or raw SQL with `websearch_to_tsquery`.
**When to use:** For the cross-conversation search feature.
**Example:**
```sql
-- Migration: Add full-text search support
ALTER TABLE messages ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED;

CREATE INDEX idx_messages_fts ON messages USING GIN (fts);
```
```typescript
// Supabase JS search query
const { data } = await supabase
  .from('messages')
  .select('id, conversation_id, content, sender_id, created_at')
  .textSearch('fts', searchTerm, { type: 'websearch', config: 'english' })
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(50);
```
**Source:** [Supabase Full Text Search docs](https://supabase.com/docs/guides/database/full-text-search)

### Pattern 4: Attachment Metadata in messages.metadata JSONB
**What:** Store attachment file info (storage_path, file_name, file_size_bytes, mime_type) in the existing `messages.metadata` JSONB column. Set `message_type = 'attachment'` to distinguish from text messages. A single message can contain one attachment plus optional text content.
**When to use:** When sending a message with a file attachment.
**Example:**
```typescript
// Message insert with attachment metadata
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    org_id: orgId,
    sender_id: user.id,
    message_type: 'attachment',
    content: optionalTextContent || null,
    metadata: {
      attachment: {
        storage_path: `${orgId}/${conversationId}/${timestamp}-${sanitizedFileName}`,
        file_name: originalFileName,
        file_size_bytes: fileSize,
        mime_type: mimeType,
      },
    },
    status: 'sent',
  })
  .select()
  .single();
```
**Source:** Application-level pattern; `metadata JSONB` and `message_type IN ('text', 'attachment', 'system')` already defined in migration 143.

### Anti-Patterns to Avoid
- **Separate attachments table:** The `messages.metadata` JSONB column already exists and is perfect for attachment metadata. A separate table adds unnecessary JOINs and complexity for what is a 1:1 relationship (one attachment per message).
- **Polling for status updates:** The existing Realtime subscription pattern works. Adding a poll interval would duplicate the mechanism and waste resources.
- **Client-side full-text search:** Downloading all messages to search client-side does not scale. PostgreSQL FTS is much more efficient and already scoped by RLS.
- **Storing files in the database:** Binary file data belongs in Supabase Storage (message-attachments bucket), not in the messages table. Only metadata goes in the database.
- **Unbounded search results:** Always limit search results (e.g., 50) and paginate. Full-text search across an entire org's message history could return thousands of results.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search engine | Custom LIKE/ILIKE queries | PostgreSQL tsvector + GIN index + `textSearch()` | LIKE queries don't use indexes, can't rank results, don't handle stemming or stop words |
| Tick mark SVG icons | Custom SVG paths | Lucide `Check` (single tick) and `CheckCheck` (double tick) | Already in the project, consistent with existing icon usage |
| File upload UX | Custom drag-and-drop from scratch | Extend existing document upload pattern from Phase 45 | Dropzone, file validation, progress states already proven |
| Signed URL generation | Manual S3 presigning | `supabase.storage.from('message-attachments').createSignedUrl()` | Handles auth, expiry, path resolution automatically |
| Search result highlighting | Regex-based text highlighting | PostgreSQL `ts_headline()` function | Handles stemmed matches, fragment extraction, HTML markup natively |
| File type detection | Custom MIME sniffing | Browser's `File.type` property + server-side validation against allowed list | Browser provides MIME type reliably; server validates against bucket's `allowed_mime_types` |

**Key insight:** All three features (status, search, attachments) can be built entirely with existing project dependencies and PostgreSQL-native capabilities. No new libraries, no external services.

## Common Pitfalls

### Pitfall 1: Status Updates Creating Infinite Realtime Loops
**What goes wrong:** Updating `messages.status` triggers a Realtime UPDATE event, which the client receives, which might trigger another status update (e.g., "delivered" when receiving the message via Realtime), creating a loop.
**Why it happens:** The Realtime subscription fires on every UPDATE to the messages table, including status changes.
**How to avoid:** The status update API must be idempotent and only advance forward. The client handler must check if the status actually changed before taking action. Use the WHERE clause pattern: `UPDATE messages SET status = 'delivered' WHERE id = $id AND status = 'sent'` -- this no-ops if already delivered/read.
**Warning signs:** Rapid Realtime events on the same message, console showing repeated status updates.

### Pitfall 2: Marking as "Delivered" vs "Read" Timing
**What goes wrong:** Conflating "message arrived in the browser" with "user opened the conversation and saw the message."
**Why it happens:** Both events happen on the client, but have different semantic meanings.
**How to avoid:**
- **Delivered:** Set when the recipient's client receives the message via Realtime (in the `useRealtimeMessages` callback). This means "the message reached the recipient's device."
- **Read:** Set when the recipient opens the conversation thread (in the existing `mark-as-read` PATCH call on `MessageThread` mount). This means "the recipient viewed the message."
**Warning signs:** All messages showing "read" immediately when the recipient's browser is open (even on a different conversation).

### Pitfall 3: Search Returning Soft-Deleted Messages
**What goes wrong:** Full-text search returns messages where `deleted_at IS NOT NULL`, which should be hidden from org users.
**Why it happens:** The GIN index indexes all rows, including soft-deleted ones. The textSearch filter alone doesn't exclude them.
**How to avoid:** The RLS policy on messages already filters `deleted_at IS NULL` for org users (migration 143, line 232). As long as the search query goes through the Supabase client (which applies RLS), deleted messages are automatically excluded. However, if using a raw SQL function, ensure the WHERE clause includes `deleted_at IS NULL`.
**Warning signs:** Search results showing "[deleted message]" or empty content.

### Pitfall 4: File Size Limits Mismatch
**What goes wrong:** Client allows files up to 10MB but the upload fails because of different limits at different layers.
**Why it happens:** Multiple layers enforce limits: Next.js API route body parser (default ~4MB), Supabase Storage bucket config (10MB), and browser FormData limits.
**How to avoid:** The `message-attachments` bucket is already configured for 10MB (migration 144). Next.js needs `export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }` on the upload API route. Client should validate size before upload. Alternatively, use signed upload URLs to bypass the Next.js body parser entirely (uploads go direct to Supabase Storage).
**Warning signs:** 413 Payload Too Large errors on upload, or silent failures with no error message.

### Pitfall 5: Search Performance Without GIN Index
**What goes wrong:** Full-text search becomes slow (100ms+) on tables with >10K messages.
**Why it happens:** Without a GIN index, PostgreSQL performs a sequential scan converting every row's content to tsvector on-the-fly.
**How to avoid:** Use a stored generated tsvector column with a GIN index (see Pattern 3 above). The generated column approach is more efficient than indexing an expression because the tsvector is computed once on write, not on every read.
**Warning signs:** Search latency growing linearly with message count, slow query warnings in Supabase logs.

### Pitfall 6: Attachment Storage Path Collisions
**What goes wrong:** Two users upload files with the same name to the same conversation at the same time, overwriting each other.
**Why it happens:** Storage path uses only `{org_id}/{conversation_id}/{filename}` without a unique component.
**How to avoid:** Include a timestamp and/or UUID in the storage path: `{org_id}/{conversationId}/{Date.now()}-{uuid}-{sanitizedFileName}`. This is the same pattern used in the document upload route (Phase 45).
**Warning signs:** Files appearing with wrong content, upload errors mentioning "already exists."

## Code Examples

### Delivery Status Tick Component
```typescript
// Source: Application pattern using Lucide icons
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageStatus } from '@/types/comms.types';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  className?: string;
}

export function MessageStatusIndicator({ status, className }: MessageStatusIndicatorProps) {
  switch (status) {
    case 'sent':
      return <Check className={cn('h-3.5 w-3.5 text-muted-foreground', className)} />;
    case 'delivered':
      return <CheckCheck className={cn('h-3.5 w-3.5 text-muted-foreground', className)} />;
    case 'read':
      return <CheckCheck className={cn('h-3.5 w-3.5 text-blue-500', className)} />;
    default:
      return null;
  }
}
```

### Full-Text Search API Route
```typescript
// Source: Supabase FTS docs + existing API route pattern
// GET /api/messages/search?q=keyword&limit=50
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const orgId = await requireOrgId();

  // Use websearch_to_tsquery for natural language search
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, content, sender_id, created_at')
    .textSearch('fts', q, { type: 'websearch', config: 'english' })
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  // Resolve conversation names and sender names in parallel...
  return NextResponse.json({ results: enrichedResults });
}
```

### Attachment Upload via API Route (Server-Side)
```typescript
// Source: Existing document upload pattern from Phase 45
// POST /api/messages/attachments/upload
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const conversationId = formData.get('conversationId') as string;

  // Validate file type against bucket's allowed_mime_types
  const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (!ALLOWED.includes(file.type) || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${orgId}/${conversationId}/${Date.now()}-${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from('message-attachments')
    .upload(storagePath, await file.arrayBuffer(), { contentType: file.type });

  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

  // Insert message with attachment metadata
  const { data: message } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    org_id: orgId,
    sender_id: user.id,
    message_type: 'attachment',
    content: null,
    metadata: {
      attachment: { storage_path: storagePath, file_name: file.name, file_size_bytes: file.size, mime_type: file.type }
    },
    status: 'sent',
  }).select().single();

  return NextResponse.json(message, { status: 201 });
}
```

### Attachment Download (Signed URL)
```typescript
// Source: Existing document download pattern from Phase 45
// GET /api/messages/attachments/download?path=org/conv/file.pdf
const { data: signedUrlData } = await supabase.storage
  .from('message-attachments')
  .createSignedUrl(storagePath, 3600); // 1-hour expiry

return NextResponse.json({ url: signedUrlData.signedUrl, fileName });
```

### Marking Messages as Delivered (Client-Side on Realtime Receive)
```typescript
// Source: Application pattern, in useRealtimeMessages callback
// When a new message INSERT arrives via Realtime and the sender is NOT the current user,
// call the status update endpoint to mark it as "delivered"
channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages',
  filter: `org_id=eq.${orgId}`,
}, (payload) => {
  const newMsg = payload.new;
  // If the message is from someone else, mark it as delivered
  if (newMsg.sender_id !== currentUserId && newMsg.status === 'sent') {
    fetch(`/api/messages/${newMsg.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'delivered' }),
    }).catch(console.error); // Fire-and-forget
  }
  // ... existing invalidation logic
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for message status | Supabase Realtime postgres_changes | Established by Phase 43 | Already in place; extend to UPDATE events |
| LIKE/ILIKE for search | PostgreSQL FTS with tsvector + GIN | PostgreSQL native since v8.3 | Orders of magnitude faster, supports stemming and ranking |
| Client-side FormData upload | Server-side FormData OR signed upload URLs | Supabase Storage v3 (2024) | Signed URLs allow larger files without proxy; server-side works fine for <=10MB |
| Separate attachments table | JSONB metadata on message record | Modern JSONB support in PostgreSQL | Avoids JOINs, keeps message + attachment atomic |

**Deprecated/outdated:**
- Using `to_tsvector()` in WHERE clause without a stored column: Less efficient than a generated column with GIN index
- Supabase `rpc()` for full-text search: The `textSearch()` filter on the JS client is simpler and equivalent

## Open Questions

1. **Search scope: web-only or web + iOS?**
   - What we know: iOS has WatermelonDB offline cache from Phase 42. WatermelonDB supports Q.where and Q.sanitizeLikeString for local text search, but not stemmed FTS.
   - What's unclear: Whether iOS search should be local-only (WatermelonDB), server-only (API call to PostgreSQL FTS), or hybrid (local first, then server for complete results).
   - Recommendation: Start web-only. iOS search can use the same API endpoint later. Local WatermelonDB search can complement for offline scenarios in a future phase.

2. **"Delivered" status for both parties in a direct conversation?**
   - What we know: In a direct conversation there are exactly two parties (admin + medic). The `messages.status` column is a single value per message, not per-recipient.
   - What's unclear: If Admin sends a message, and Medic's browser receives it via Realtime, Medic's client would PATCH status to "delivered." But what if Medic is offline? The message stays "sent" indefinitely.
   - Recommendation: "Delivered" = recipient's client received it via Realtime. If offline, it stays "sent" until they come online. This is the WhatsApp model and acceptable for a professional messaging context.

3. **Read receipt privacy (always-on vs configurable)?**
   - What we know: CONTEXT.md says "Claude's discretion on read receipt toggleability."
   - What's unclear: Whether medics should be able to disable read receipts.
   - Recommendation: Always-on for this professional/employer context. This is org-admin <-> medic communication, not personal chat. Employers reasonably expect to know when a medic has read their message. This simplifies implementation and matches the existing broadcast read tracking.

4. **Attachment text content (caption)?**
   - What we know: The `content` column can hold text alongside attachment metadata. WhatsApp allows a caption on attachments.
   - What's unclear: Whether a separate text input for attachment caption is needed, or just the file alone.
   - Recommendation: Allow optional text content alongside an attachment (message has both `content` text and `metadata.attachment`). The MessageInput can display the pending attachment above the text area.

## Sources

### Primary (HIGH confidence)
- Supabase Realtime Postgres Changes docs - [https://supabase.com/docs/guides/realtime/postgres-changes](https://supabase.com/docs/guides/realtime/postgres-changes) - UPDATE event subscription, filtering, old/new record payloads
- Supabase Full Text Search docs - [https://supabase.com/docs/guides/database/full-text-search](https://supabase.com/docs/guides/database/full-text-search) - tsvector, GIN index, textSearch() JS method
- Supabase Storage Upload API - [https://supabase.com/docs/reference/javascript/storage-from-upload](https://supabase.com/docs/reference/javascript/storage-from-upload) - upload(), createSignedUrl() methods
- PostgreSQL FTS Documentation - [https://www.postgresql.org/docs/current/textsearch-intro.html](https://www.postgresql.org/docs/current/textsearch-intro.html) - tsvector, tsquery, GIN indexes
- Supabase JS textSearch() API - [https://supabase.com/docs/reference/javascript/textsearch](https://supabase.com/docs/reference/javascript/textsearch) - websearch type, config options
- Existing codebase: migration 143 (messages.status column, messages.metadata JSONB, message_type CHECK constraint), migration 144 (message-attachments bucket), comms.hooks.ts (Realtime subscription pattern), /api/documents/upload (FormData upload pattern)

### Secondary (MEDIUM confidence)
- WhatsApp system design articles - delivery/read receipt state machine pattern (sent -> delivered -> read), widely documented and consistent across multiple sources

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use; no new dependencies
- Architecture: HIGH - All patterns verified against existing codebase (Realtime, Storage upload, API routes) and official Supabase documentation
- Pitfalls: HIGH - Identified from codebase analysis (existing patterns that need extension) and official Supabase docs (Realtime scaling, FTS indexing)

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable -- all technologies mature and already in use)
