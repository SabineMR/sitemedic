# Phase 40: Comms & Docs Foundation - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema, storage buckets, RLS policies, and TypeScript types for the entire v5.0 messaging and document management system. All tables scoped to org_id so no data leaks between organisations. This is the data layer — no UI in this phase.

</domain>

<decisions>
## Implementation Decisions

### Document categories
- Admin-configurable per org (not a fixed enum) — stored as a lookup table with org_id
- Platform-wide default categories seeded on org creation: Insurance, DBS, Qualification, ID, Other
- Defaults are removable — org admins can hide/delete categories they don't need
- Org admins can add custom categories beyond the defaults
- Required flag per category — org admin can mark categories as mandatory for their medics
- Non-compliant medics (missing required docs) are blocked from being assigned to new bookings

### Message content model
- Multi-type schema from day one — message_type column supporting text, attachment, and system message types
- Structured content field ready for Phase 47 attachments without needing a migration
- System messages generated for key events (conversation started, document uploaded, etc.)
- Status column (sent/delivered/read) included in initial schema — avoids migration in Phase 47
- Basic markdown support for message content (bold, italic, links, lists)

### Multi-admin conversations
- Shared conversation with attribution — all org admins share one conversation thread per medic
- Each message shows which specific admin sent it (sender_id on message record)
- All org admins automatically included in every medic conversation (no opt-in)
- Any org admin can send broadcast messages
- Medics see individual admin names on messages (e.g., "Sarah (Admin)"), not just the org name

### Deletion & retention
- Messages: soft delete — content removed, record stays, thread shows "This message was deleted" placeholder
- Documents: never deleted — only archived or superseded by new versions. Full compliance history preserved
- deleted_at column on messages table for soft delete support

### Claude's Discretion
- Message retention policy (auto-archive older messages vs keep indefinitely) — decide based on storage/performance tradeoffs
- Medic departure handling (what happens to conversations and documents when a medic leaves an org) — decide based on data protection best practices and practical needs
- Exact index strategy for RLS performance
- Storage bucket naming and path conventions

</decisions>

<specifics>
## Specific Ideas

- UK medic compliance documents typically include: DBS, HCPC/NMC/GMC registration, professional indemnity insurance, first aid qualifications (FREC levels), manual handling, safeguarding, right to work/ID
- Company-level compliance docs (CQC, employers' liability, etc.) are already handled in Phase 32's marketplace registration — this system is for medic-level documents within an org
- The "required flag + booking block" pattern means the document_categories table needs an is_required boolean that feeds into booking assignment logic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-comms-docs-foundation*
*Context gathered: 2026-02-19*
