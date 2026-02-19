# Phase 40: Comms & Docs Foundation - Research

**Researched:** 2026-02-19
**Domain:** Supabase database schema (PostgreSQL), RLS policies, Storage buckets, TypeScript types for multi-tenant messaging and document management
**Confidence:** HIGH

## Summary

Phase 40 establishes the complete data layer for v5.0 internal communications and document management. This phase creates database tables (conversations, messages, message_recipients, documents, document_versions, document_categories), storage buckets (medic-documents, message-attachments), RLS policies enforcing org_id isolation, and TypeScript types consumed by the web app and Edge Functions.

The codebase already has a mature, well-established pattern for every component needed: `get_user_org_id()` for JWT-based org scoping (migration 028), `is_platform_admin()` / `is_org_admin()` for role checks (migration 101), `storage.foldername()` for path-based storage RLS (migrations 131, 134, 142), `update_updated_at_column()` trigger (migration 002), and manual TypeScript type definitions in `web/types/database.types.ts`. Phase 40 follows all of these patterns exactly.

**Primary recommendation:** Follow the established migration patterns verbatim. Use `get_user_org_id()` for all org-scoped RLS, add `is_platform_admin()` bypass policies on every table, use `(storage.foldername(name))[1] = get_user_org_id()::text` for storage path scoping, and write manual TypeScript interfaces matching the established `web/types/database.types.ts` pattern.

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 17 (supabase config.toml) | Database tables, RLS policies, indexes, triggers | Already running; all 142 migrations target it |
| Supabase Storage | Built-in | File storage for compliance docs and message attachments | 11+ buckets already configured in the project |
| Supabase RLS | Built-in | Row-level security for multi-tenant org_id isolation | Established pattern via `get_user_org_id()` in 35+ tables |
| TypeScript | In stack | Type definitions for new tables | Manual interfaces in `web/types/database.types.ts` |

### Supporting
| Library/Tool | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `get_user_org_id()` | Custom PG function | Extract org_id from JWT app_metadata | Every org-scoped RLS policy |
| `is_platform_admin()` | Custom PG function | Check if user is platform admin | Every table needs a platform admin bypass policy |
| `is_org_admin()` | Custom PG function | Check if user is org admin | Storage upload policies, admin-only operations |
| `update_updated_at_column()` | Custom PG trigger | Auto-set updated_at on UPDATE | Every table with an updated_at column |
| `storage.foldername()` | Supabase built-in | Extract folder path as array from storage path | Storage RLS policies scoped to org_id/medic_id |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual TypeScript types | `supabase gen types typescript` | Project uses manual types (no gen types script in package.json); switching would require touching all existing imports. Keep manual. |
| Separate bucket per org | Single bucket with path-scoped RLS | Separate buckets don't scale (one bucket per org = thousands of buckets). Path-scoped RLS is the established pattern. |
| `uuid_generate_v4()` | `gen_random_uuid()` | Both are used in the codebase. Recent migrations (120+) favour `gen_random_uuid()`. Use `gen_random_uuid()` for consistency with recent patterns. |

**Installation:**
```bash
# No new packages needed. This phase is database-only (SQL migrations + TypeScript types).
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/migrations/
  143_comms_docs_schema.sql         # Plan 40-01: All tables, RLS, indexes, triggers
  144_comms_docs_storage.sql        # Plan 40-02: Storage buckets + storage RLS policies

web/types/
  database.types.ts                 # Existing file: append new interfaces
  comms.types.ts                    # New file: messaging & document types (or add to database.types.ts)
```

### Pattern 1: org_id-Scoped Table with Full RLS
**What:** Every table includes an `org_id UUID NOT NULL REFERENCES organizations(id)` column. RLS policies use `get_user_org_id()` for tenant isolation plus `is_platform_admin()` for cross-org access.
**When to use:** Every new table in this phase.
**Example:**
```sql
-- Source: supabase/migrations/028_enable_org_rls.sql (established pattern)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- ... other columns ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Org users: CRUD within their org
CREATE POLICY "Users can view their org's conversations"
  ON conversations FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Users can insert conversations in their org"
  ON conversations FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Users can update their org's conversations"
  ON conversations FOR UPDATE
  USING (org_id = get_user_org_id());

CREATE POLICY "Users can delete their org's conversations"
  ON conversations FOR DELETE
  USING (org_id = get_user_org_id());

-- Platform admin: full access
CREATE POLICY "Platform admin all conversations"
  ON conversations FOR ALL
  USING (is_platform_admin());
```

### Pattern 2: Storage Bucket with Path-Scoped RLS
**What:** Private storage bucket where first folder segment is `org_id`. RLS uses `(storage.foldername(name))[1] = get_user_org_id()::text` to enforce path isolation.
**When to use:** Both new storage buckets (medic-documents, message-attachments).
**Example:**
```sql
-- Source: supabase/migrations/134_org_logos_bucket.sql (established pattern)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medic-documents',
  'medic-documents',
  false,       -- PRIVATE: compliance documents are sensitive
  10485760,    -- 10 MB max per file
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Medics can upload to their own folder: {org_id}/{medic_id}/{category}/{filename}
CREATE POLICY "Medics upload own docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'medic-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Org admins can view all docs within their org folder
CREATE POLICY "Org admins view org docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medic-documents'
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Platform admin: unrestricted
CREATE POLICY "Platform admin view all docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medic-documents'
    AND is_platform_admin()
  );
```

### Pattern 3: Lookup Table with Default Seeding
**What:** Admin-configurable categories stored as a lookup table with org_id. Default rows seeded on org creation (or via migration backfill).
**When to use:** `document_categories` table.
**Example:**
```sql
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,           -- machine-readable: 'insurance', 'dbs', etc.
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,  -- soft-hide instead of delete
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, slug)         -- no duplicate slugs per org
);

-- Seed defaults for all existing orgs
INSERT INTO document_categories (org_id, name, slug, sort_order)
SELECT o.id, cat.name, cat.slug, cat.sort_order
FROM organizations o
CROSS JOIN (VALUES
  ('Insurance', 'insurance', 1),
  ('DBS', 'dbs', 2),
  ('Qualification', 'qualification', 3),
  ('ID', 'id', 4),
  ('Other', 'other', 5)
) AS cat(name, slug, sort_order)
ON CONFLICT (org_id, slug) DO NOTHING;
```

### Pattern 4: Manual TypeScript Types
**What:** Hand-written TypeScript interfaces matching database columns. No auto-generation.
**When to use:** All new tables.
**Example:**
```typescript
// Source: web/types/database.types.ts (established pattern)
export interface Conversation {
  id: string;
  org_id: string;
  type: 'direct' | 'broadcast';
  subject: string | null;
  medic_id: string;        // the medic this conversation is with
  created_by: string;       // user_id of creator
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'attachment' | 'system';
  content: string | null;
  metadata: Record<string, unknown> | null; // structured content for attachments, system events
  status: 'sent' | 'delivered' | 'read';
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### Anti-Patterns to Avoid
- **RLS without org_id on the table:** Never rely solely on JOINs to reach org_id. Every table must have its own `org_id` column for direct RLS evaluation. JOINs in RLS policies are performance killers.
- **Nested subqueries in RLS:** Avoid `SELECT org_id FROM conversations WHERE id = messages.conversation_id` in message RLS. Instead, denormalize org_id onto the messages table. This is a deliberate data duplication for RLS performance.
- **Using `auth.role()` for tenant checks:** The project uses `get_user_org_id()` (JWT app_metadata), not `auth.role()`. Mixing patterns causes confusion.
- **Storing unread count as a column:** Calculate unread count dynamically: `COUNT(messages WHERE created_at > last_read_at)`. Stored counters drift when messages arrive offline.
- **Creating too many narrow storage buckets:** Use path prefixes within a bucket rather than creating separate buckets for each use case within the same domain. Two buckets are sufficient: one for compliance documents, one for message attachments.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID scheme | `gen_random_uuid()` | Built-in PostgreSQL, zero dependencies |
| updated_at timestamps | Manual UPDATE SET | `update_updated_at_column()` trigger | Already exists from migration 002, reusable |
| Org_id extraction from JWT | Custom JWT parsing | `get_user_org_id()` function | Already exists from migration 028, used in 35+ tables |
| Platform admin check | Role string comparison | `is_platform_admin()` function | Already exists from migration 101, used everywhere |
| Org admin check | Role string comparison | `is_org_admin()` function | Already exists from migration 101 |
| Storage path isolation | Custom path validation | `(storage.foldername(name))[1]` | Supabase built-in, established in 6+ bucket migrations |
| Soft delete | Custom delete logic | `deleted_at TIMESTAMPTZ` column | Standard pattern, filter with `WHERE deleted_at IS NULL` |

**Key insight:** This phase is almost entirely composition of existing patterns. The database has every utility function, trigger, and RLS pattern already built. Phase 40 applies them to new tables.

## Common Pitfalls

### Pitfall 1: org_id Missing from Messages Table (RLS Performance)
**What goes wrong:** Messages table only has `conversation_id`, no `org_id`. RLS policy must JOIN conversations to check org_id. On a table that will have the most rows, this JOIN runs for every row evaluation.
**Why it happens:** Developers normalise to avoid data duplication. But RLS policies execute per-row and can't use the query planner's JOIN optimisation effectively.
**How to avoid:** Denormalize `org_id` onto the `messages` table. Accept the duplication. RLS evaluates `org_id = get_user_org_id()` directly without JOIN.
**Warning signs:** Slow message list queries, EXPLAIN showing sequential scans on conversations table during message SELECT.

### Pitfall 2: Missing Indexes on org_id Columns
**What goes wrong:** RLS policy `org_id = get_user_org_id()` does a full table scan because there's no index on `org_id`.
**Why it happens:** org_id is a foreign key but PostgreSQL does NOT auto-index foreign keys (unlike primary keys).
**How to avoid:** Create an explicit `CREATE INDEX idx_{table}_org_id ON {table}(org_id)` on every table that has org_id. This has been shown to give 100x+ improvement on large tables.
**Warning signs:** Query performance degrades linearly as rows increase.

### Pitfall 3: Storage RLS Policy Doesn't Match Path Convention
**What goes wrong:** Upload succeeds but download fails (or vice versa) because INSERT policy uses `WITH CHECK` and SELECT policy uses `USING`, and the folder name extraction doesn't match.
**Why it happens:** `storage.foldername()` is 1-indexed (not 0-indexed). Developers assume `[0]` and policies silently fail.
**How to avoid:** Always use `(storage.foldername(name))[1]` for the first folder segment. Test by uploading a file and then attempting to SELECT it with a different user.
**Warning signs:** Files upload successfully but users report "file not found" or "access denied" on download.

### Pitfall 4: Conversation RLS Doesn't Account for Multi-Admin Access
**What goes wrong:** Only the conversation creator can see it. Other org admins can't access medic conversations.
**Why it happens:** RLS checks `created_by = auth.uid()` instead of org-level access.
**How to avoid:** RLS uses `org_id = get_user_org_id()`, not `created_by = auth.uid()`. All org members (admins and the medic) can access conversations within their org.
**Warning signs:** Admin B creates a conversation with a medic, Admin A can't see it.

### Pitfall 5: message_recipients Not Scoped to org_id
**What goes wrong:** Broadcast read tracking table has no org_id. Platform admin queries work, but org-scoped queries require JOINing back to messages.
**Why it happens:** message_recipients seems like a simple join table that doesn't need org_id.
**How to avoid:** Add org_id to message_recipients. The small data duplication is worth the RLS simplicity.
**Warning signs:** Slow broadcast read-tracking queries, complex RLS policies with nested subqueries.

### Pitfall 6: Document Categories Not Seeded for Existing Orgs
**What goes wrong:** New feature deploys but existing orgs have zero document categories. Admins see empty dropdowns.
**Why it happens:** Seeding only runs for newly created orgs (via trigger), forgetting existing orgs.
**How to avoid:** Include a backfill INSERT in the migration that seeds defaults for all existing orgs (see Pattern 3 above). Use `ON CONFLICT DO NOTHING` for idempotency.
**Warning signs:** Existing org admins report "no categories available" after deployment.

## Code Examples

### Complete Conversations Table with RLS
```sql
-- Source: Follows pattern from supabase/migrations/028_enable_org_rls.sql
-- with additions from 118_org_settings.sql (platform admin policies)

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Conversation type
  type TEXT NOT NULL DEFAULT 'direct'
    CHECK (type IN ('direct', 'broadcast')),

  -- Subject (for broadcasts; NULL for direct messages)
  subject TEXT,

  -- For direct conversations: the medic this thread is with
  medic_id UUID REFERENCES medics(id) ON DELETE SET NULL,

  -- Who started this conversation
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Denormalized for conversation list sorting
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate direct conversations for same medic in same org
CREATE UNIQUE INDEX idx_conversations_org_medic_direct
  ON conversations(org_id, medic_id) WHERE type = 'direct';

-- Performance indexes
CREATE INDEX idx_conversations_org_id ON conversations(org_id);
CREATE INDEX idx_conversations_medic_id ON conversations(medic_id);
CREATE INDEX idx_conversations_last_message ON conversations(org_id, last_message_at DESC);

-- updated_at trigger
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Complete Messages Table with Denormalized org_id
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- DENORMALIZED for RLS

  -- Sender
  sender_id UUID NOT NULL REFERENCES auth.users(id),

  -- Content model (multi-type from day one)
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'attachment', 'system')),
  content TEXT,                    -- message text (markdown supported)
  metadata JSONB,                  -- structured data for attachments/system events

  -- Delivery tracking (Phase 47 will consume these)
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'read')),

  -- Soft delete
  deleted_at TIMESTAMPTZ,          -- NULL = active; set = "This message was deleted"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_org_id ON messages(org_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- updated_at trigger
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### message_recipients for Broadcast Read Tracking
```sql
CREATE TABLE message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- DENORMALIZED for RLS

  -- Per-recipient delivery status
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, recipient_id)
);

CREATE INDEX idx_message_recipients_org ON message_recipients(org_id);
CREATE INDEX idx_message_recipients_recipient ON message_recipients(recipient_id);
CREATE INDEX idx_message_recipients_message ON message_recipients(message_id);
```

### Documents and Document Versions
```sql
-- Document categories: admin-configurable per org
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

-- Documents: metadata for each medic document
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES document_categories(id),

  -- Current version tracking
  current_version_id UUID, -- set after first version upload (circular FK, added via ALTER)

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'archived')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document versions: immutable history of uploads
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- DENORMALIZED for RLS

  -- File reference
  storage_path TEXT NOT NULL,      -- {org_id}/{medic_id}/{category_slug}/{filename}
  file_name TEXT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT,

  -- Document metadata
  issue_date DATE,
  expiry_date DATE,
  certificate_number TEXT,
  notes TEXT,

  -- Version tracking
  version_number INT NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circular FK for current version
ALTER TABLE documents ADD CONSTRAINT fk_documents_current_version
  FOREIGN KEY (current_version_id) REFERENCES document_versions(id);

-- Performance indexes
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_medic ON documents(medic_id);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX idx_document_versions_org ON document_versions(org_id);
CREATE INDEX idx_document_versions_expiry ON document_versions(expiry_date)
  WHERE expiry_date IS NOT NULL;
```

### RLS Wrapper Pattern with SELECT Optimization
```sql
-- Source: Supabase RLS performance best practices
-- https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
-- Wrapping functions in SELECT enables query plan caching

CREATE POLICY "Users can view their org's messages"
  ON messages FOR SELECT
  USING (org_id = (SELECT get_user_org_id()));

-- Instead of: USING (org_id = get_user_org_id())
-- The SELECT wrapper prevents re-evaluation per row
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `uuid_generate_v4()` | `gen_random_uuid()` | PostgreSQL 13+ | No extension needed; built into core. Recent SiteMedic migrations (120+) use it. |
| Separate RLS per role | `get_user_org_id()` + `is_platform_admin()` | Migration 028+101 | Simplified from role-based to org-based + platform bypass |
| `auth.role()` for tenant checks | JWT `app_metadata` via `get_user_org_id()` | Migration 028 | More reliable; role is in app_metadata not user_metadata |
| Auto-generated types (`supabase gen types`) | Manual TypeScript interfaces | Project convention | Manual types are simpler, no build step, full control |

**Deprecated/outdated:**
- `uuid_generate_v4()`: Still works but requires `uuid-ossp` extension. Use `gen_random_uuid()` instead (built-in PostgreSQL 13+).
- `public.user_role()` function: Created in migration 003 but superseded by JWT-based `get_user_org_id()` / `is_platform_admin()` / `is_org_admin()` pattern from migrations 028+101.

## Discretionary Decisions

### Message Retention Policy
**Recommendation: Keep indefinitely (no auto-archive).**
Reasoning: UK employment and health sector communications may need to be retained for litigation or regulatory audits. Auto-archiving creates compliance risk. Storage is cheap. If performance becomes an issue, partition the messages table by `created_at` range (not by deleting data). This is a future optimization, not a v5.0 concern at current scale (~50 medics per org).

### Medic Departure Handling
**Recommendation: Soft-deactivate, preserve all data.**
- Conversations: Remain visible to org admins (historical record). Medic can no longer send messages.
- Documents: Remain in storage and database (compliance requirement). Status set to "archived" on departure.
- Implementation: When medic is deactivated (existing `medics.available_for_work = false` pattern), conversations and documents are read-only. No data deletion.
- GDPR note: If medic exercises right to erasure, documents related to them must be handled per the existing GDPR data deletion Edge Function (`gdpr-delete-data`). Messages should have content cleared but records retained (soft delete pattern already decided in CONTEXT.md).

### Index Strategy for RLS Performance
**Recommendation: B-tree index on `org_id` on every new table, plus composite indexes for common query patterns.**
- Every table: `CREATE INDEX idx_{table}_org_id ON {table}(org_id)`
- messages: `CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC)` for conversation thread listing
- document_versions: `CREATE INDEX idx_document_versions_expiry ON document_versions(expiry_date) WHERE expiry_date IS NOT NULL` for expiry checker
- conversations: `CREATE INDEX idx_conversations_last_message ON conversations(org_id, last_message_at DESC)` for conversation list sorting
- RLS function wrapping: Use `(SELECT get_user_org_id())` not `get_user_org_id()` to enable query plan caching

### Storage Bucket Naming and Path Conventions
**Recommendation: Two new private buckets with descriptive kebab-case names.**

| Bucket | Path Convention | Purpose |
|--------|----------------|---------|
| `medic-documents` | `{org_id}/{medic_id}/{category_slug}/{filename}` | Compliance documents (insurance, DBS, qualifications, ID) |
| `message-attachments` | `{org_id}/{conversation_id}/{filename}` | Files attached to messages (Phase 47 will add upload UI) |

- Both buckets are private (`public: false`)
- `medic-documents`: 10 MB limit, PDF/JPEG/PNG/DOC/DOCX
- `message-attachments`: 10 MB limit, PDF/JPEG/PNG/DOC/DOCX (same as medic-documents)
- Path convention puts `org_id` first for consistent RLS pattern across all buckets
- Follows the established pattern from `org-logos` (migration 134) and `compliance-documents` (migration 142)

## Open Questions

1. **Migration Number Assignment**
   - What we know: Last migration is 142. Phase 40 will need 143+ (or higher if Phase 39 v4.0 adds migrations first).
   - What's unclear: Whether Phase 39 will add any migrations that would shift the number.
   - Recommendation: Assign 143 for schema and 144 for storage. If Phase 39 adds migrations, renumber.

2. **Conversation Participants Table vs Implicit Access**
   - What we know: v5 architecture doc shows a `conversation_participants` table. But the CONTEXT.md says "all org admins automatically included in every medic conversation."
   - What's unclear: Whether we need explicit participant tracking if all org members have access via org_id RLS.
   - Recommendation: Skip `conversation_participants` for v5.0. Use `org_id = get_user_org_id()` RLS for access control. Track `last_read_at` per user on a simpler `conversation_read_status` table (user_id + conversation_id + last_read_at). This is simpler than maintaining a participants table when the rule is "everyone in the org has access."

3. **document_categories Seeding Trigger for New Orgs**
   - What we know: Default categories need to be seeded for existing orgs (migration backfill) AND future orgs.
   - What's unclear: Whether to add a trigger on `organizations` INSERT or handle via application code.
   - Recommendation: Use a PostgreSQL trigger on `organizations` table (AFTER INSERT) that seeds default categories. This ensures no org is ever created without categories, regardless of which code path creates it.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** `supabase/migrations/028_enable_org_rls.sql` -- established `get_user_org_id()` pattern for 35+ tables
- **Codebase analysis:** `supabase/migrations/101_migrate_to_platform_admin.sql` -- `is_platform_admin()` and `is_org_admin()` functions
- **Codebase analysis:** `supabase/migrations/134_org_logos_bucket.sql` -- established storage RLS with `storage.foldername()`
- **Codebase analysis:** `supabase/migrations/142_marketplace_storage_bucket.sql` -- storage path scoping pattern
- **Codebase analysis:** `supabase/migrations/141_compliance_documents.sql` -- document table with review workflow
- **Codebase analysis:** `supabase/migrations/118_org_settings.sql` -- lookup table with org_id, backfill seeding
- **Codebase analysis:** `web/types/database.types.ts` -- manual TypeScript interface pattern
- **Codebase analysis:** `.planning/research/v5/ARCHITECTURE.md` -- v5.0 schema design
- **Codebase analysis:** `.planning/phases/40-comms-docs-foundation/40-CONTEXT.md` -- user decisions
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) -- `storage.foldername()`, `storage.filename()`, `storage.extension()`
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) -- RLS policies on `storage.objects`

### Secondary (MEDIUM confidence)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- SELECT wrapper optimization, index recommendations
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- general RLS documentation

### Tertiary (LOW confidence)
- [Multi-Tenant RLS Patterns (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) -- community article confirming org_id pattern
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- community best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- every component already exists in the codebase; zero new packages
- Architecture: HIGH -- all patterns are direct reuse of established migration patterns (028, 101, 134, 142)
- Pitfalls: HIGH -- identified from codebase analysis and official Supabase documentation
- Code examples: HIGH -- based on actual migration files in the project, not hypothetical patterns
- Discretionary decisions: MEDIUM -- retention and departure handling are informed recommendations, not verified requirements

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable domain; Supabase patterns rarely change between versions)
