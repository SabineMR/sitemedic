# Phase 46: Expiry Tracking & Alerts - Research

**Researched:** 2026-02-20
**Domain:** Scheduled email alerts (pg_cron + Edge Function + Resend), dashboard UI (Next.js + TanStack Query), computed status badges
**Confidence:** HIGH

## Summary

Phase 46 adds proactive expiry alerts and a bulk dashboard on top of the document management system built in Phases 40 and 45. The codebase already has a near-identical pattern for certification expiry checking (Phase 7) -- a daily pg_cron job that calls a Deno Edge Function, which queries expiring items, deduplicates with a reminders audit table, and sends progressive emails via Resend. Phase 46 replicates this pattern for the v5.0 `documents` / `document_versions` tables instead of the older `medics.certifications` JSONB column.

The existing document schema stores expiry dates on `document_versions.expiry_date` (DATE, nullable). The current version is referenced via `documents.current_version_id`. Phase 45 already implemented `ExpiryBadge` components in three places (medic portal web, iOS documents tab, admin document view) using client-side date computation. The badge logic is consistent: green "Current" (>30 days), amber "Expiring Soon" (<=30 days), red "Expired" (<0 days), grey "No Expiry" (null).

The bulk expiry dashboard follows the established pattern from the certifications compliance page (`/certifications`): summary cards at top, data table below with tabs/filters, TanStack Query hooks in `lib/queries/admin/`, org-scoped via `useRequireOrg()`.

**Primary recommendation:** Clone the certification-expiry-checker Edge Function pattern for documents. Create `document_expiry_reminders` audit table, daily pg_cron job, Deno Edge Function with digest email template. Build the bulk dashboard by following the certifications page pattern with a new nav item.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg_cron | (Supabase built-in) | Schedule daily alert job | Already used for Friday payouts (022) and cert expiry (031) |
| pg_net | (Supabase built-in) | HTTP call from cron to Edge Function | Already used in cron migrations |
| Resend | 4.0.2 (Deno) / latest (Node) | Email delivery | Already used across 30+ files; dev mode fallback established |
| @react-email/components | latest | Email template composition (optional) | Used in `web/lib/email/templates/` for structured emails |
| TanStack Query | (already installed) | Client-side data fetching with caching | Used in all admin query hooks |
| date-fns | (already installed) | Date calculations and formatting | Used in badge components and certifications page |
| Supabase JS | 2.x | Database queries in Edge Function | Service role client for cross-org queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (already installed) | Icons for badges, nav, table | Dashboard UI icons |
| shadcn/ui components | (already installed) | Card, Badge, Tabs, Table, Button | Dashboard layout |
| Vault secrets | (Supabase built-in) | Store project_url and service_role_key | Edge Function auth from cron job |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron + Edge Function | Supabase Database Webhooks | pg_cron is established pattern in this codebase; webhooks are event-driven not scheduled |
| Raw HTML email templates | @react-email/components | Edge Functions use Deno (raw HTML is simpler); web lib uses react-email -- both patterns exist |
| New API route for bulk dashboard | Direct Supabase query in client | Follow existing pattern: TanStack Query hooks call Supabase client directly (see certifications.ts) |

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  migrations/
    155_document_expiry_reminders.sql     # Audit table + RPC + pg_cron job
  functions/
    document-expiry-checker/
      index.ts                             # Deno Edge Function (daily cron handler)
      email-templates.ts                   # Digest email template

web/
  app/(dashboard)/
    admin/
      document-expiry/
        page.tsx                           # Bulk expiry dashboard page
  lib/queries/admin/
    document-expiry.ts                     # TanStack Query hooks
  components/dashboard/
    DashboardNav.tsx                        # Add nav item (existing file)
```

### Pattern 1: pg_cron -> Edge Function via pg_net
**What:** A cron.schedule entry calls net.http_post to invoke a Supabase Edge Function on a schedule.
**When to use:** Any recurring background task that needs to query the database and call external services (email).
**Example:**
```sql
-- Source: supabase/migrations/031_certification_expiry_cron.sql (existing pattern)
SELECT cron.schedule(
  'document-expiry-checker',
  '0 8 * * *',  -- 8:00 AM UTC (morning UK time)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/document-expiry-checker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'check_date', CURRENT_DATE::text
    )
  ) AS request_id;
  $$
);
```

### Pattern 2: Deduplication via Reminders Audit Table
**What:** A table tracks (document_id, days_before, sent_at) to prevent duplicate alerts.
**When to use:** Any progressive alert system where the same item crosses multiple thresholds.
**Example:**
```sql
-- Source: supabase/migrations/034_certification_tracking.sql (existing pattern adapted)
CREATE TABLE document_expiry_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  days_before INT NOT NULL,  -- 30, 14, 7, 1
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for duplicate checking
CREATE INDEX idx_doc_expiry_reminders_lookup
  ON document_expiry_reminders(document_id, document_version_id, days_before);

-- Org-scoped index
CREATE INDEX idx_doc_expiry_reminders_org
  ON document_expiry_reminders(org_id);
```

### Pattern 3: Digest Email (One Per Medic Per Day)
**What:** Instead of one email per document, group all threshold-matching documents for a medic into a single daily digest email.
**When to use:** When multiple alerts can fire for the same recipient on the same day.
**Example:**
```typescript
// Source: Adapted from certification-expiry-checker/email-templates.ts
interface DigestItem {
  documentName: string;
  categoryName: string;
  expiryDate: string;
  daysRemaining: number;
}

// Group by medic, then send one email per medic listing all their expiring docs
const medicGroups = new Map<string, { medic: MedicInfo; items: DigestItem[] }>();
for (const doc of expiringDocs) {
  const group = medicGroups.get(doc.medic_id) || { medic: doc, items: [] };
  group.items.push({ ... });
  medicGroups.set(doc.medic_id, group);
}

for (const [medicId, { medic, items }] of medicGroups) {
  await sendDocumentExpiryDigestEmail({ medic, items, ... });
}
```

### Pattern 4: TanStack Query Hook for Org-Scoped Dashboard Data
**What:** Client-side query hook using `useRequireOrg()` for org isolation and `useQuery` with polling.
**When to use:** Any admin dashboard page that needs org-scoped data.
**Example:**
```typescript
// Source: web/lib/queries/admin/certifications.ts (existing pattern)
export function useExpiringDocuments(daysWindow: number) {
  const supabase = createClient();
  const orgId = useRequireOrg();

  return useQuery({
    queryKey: ['admin', 'documents', 'expiring', orgId, daysWindow],
    queryFn: () => fetchExpiringDocuments(supabase, orgId, daysWindow),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
```

### Pattern 5: Dashboard Navigation Item
**What:** Add entry to the navigation array in DashboardNav.tsx.
**When to use:** Any new dashboard page.
**Example:**
```typescript
// Source: web/components/dashboard/DashboardNav.tsx
// Add to the navigation array:
{
  name: 'Document Expiry',
  href: '/admin/document-expiry',
  icon: FileWarning, // or CalendarClock from lucide-react
}
```

### Anti-Patterns to Avoid
- **Per-document emails:** CONTEXT.md explicitly requires daily digest format, not one email per document. Batch all threshold-matching documents for a medic into one email.
- **Client-side expiry computation for cron queries:** Use SQL `CURRENT_DATE + interval` for expiry window queries in the Edge Function. Only use client-side date math for badge rendering.
- **Bypassing RLS in bulk dashboard:** The bulk dashboard should use the standard Supabase client (RLS enforced via `get_user_org_id()`), not the service role key. Only the Edge Function (background job) uses the service role.
- **Storing alert state in document_versions:** Use a separate `document_expiry_reminders` audit table for deduplication -- do not modify the documents or document_versions tables.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | Resend SDK (npm:resend@4.0.2 in Deno) | Delivery tracking, bounce handling, rate limiting built in |
| Cron scheduling | setTimeout/setInterval in Edge Function | pg_cron extension | Survives restarts, has execution logging via cron.job_run_details |
| Date diff calculation | Manual ms arithmetic in SQL | `CURRENT_DATE + interval '30 days'` | SQL date arithmetic handles DST, leap years correctly |
| Duplicate prevention | Application-level locking | Insert-based audit table with composite index | Survives function restarts, provides compliance audit trail |
| Email template rendering | String concatenation | Structured HTML template function (established pattern) | Consistent styling across all notification types |

**Key insight:** The entire alert pipeline has been built before for certifications (Phase 7). The document expiry checker is structurally identical -- the only differences are: (1) the source table (document_versions vs medics.certifications JSONB), (2) digest format instead of per-item emails, and (3) a new nav item and dashboard page.

## Common Pitfalls

### Pitfall 1: Querying expiry_date on old versions instead of current version
**What goes wrong:** Documents have multiple versions. Only the current version's expiry_date matters. Querying `document_versions.expiry_date` without filtering by `documents.current_version_id` will return stale expiry dates from old versions.
**Why it happens:** The expiry_date is on `document_versions`, not on `documents` directly.
**How to avoid:** Always JOIN `documents` with `document_versions` via `documents.current_version_id = document_versions.id`.
**Warning signs:** Alerts sent for documents that have already been renewed with a new version.

### Pitfall 2: NULL expiry_date treated as expired
**What goes wrong:** Documents with `expiry_date IS NULL` (e.g., ID documents that don't expire) incorrectly show as expired or generate alerts.
**Why it happens:** Date comparison with NULL returns NULL (falsy), but some date diff calculations can produce unexpected results.
**How to avoid:** Always filter `WHERE document_versions.expiry_date IS NOT NULL` in the cron query. Badge components already handle this (Phase 45 shows "No Expiry" for null).
**Warning signs:** Medics receiving alerts about documents that don't have expiry dates.

### Pitfall 3: Timezone issues with daily cron
**What goes wrong:** Cron runs at UTC time. "8 AM UK" is 8:00 UTC in winter (GMT) but 7:00 UTC in summer (BST). Documents expiring "today" might be calculated differently depending on timezone.
**Why it happens:** `CURRENT_DATE` in pg_cron uses the database server timezone (UTC).
**How to avoid:** Use `0 8 * * *` (8:00 UTC) which is 8:00 GMT / 9:00 BST. This is within the "morning 8-9am UK" requirement year-round. For date comparison, use `CURRENT_DATE` consistently (UTC-based).
**Warning signs:** 1-day-before alerts arriving a day early or late around DST transitions.

### Pitfall 4: Cross-org data leakage in Edge Function
**What goes wrong:** The Edge Function uses a service role key (bypasses RLS). Without explicit org-scoping in queries, documents from all orgs could be mixed up in digest emails.
**Why it happens:** Service role key has unrestricted access.
**How to avoid:** Group query results by `org_id` and `medic_id` before sending emails. Include `org_id` in the reminders audit table for org-scoped admin queries.
**Warning signs:** Medics receiving alerts about documents from other organisations.

### Pitfall 5: Race condition with document replacement
**What goes wrong:** Medic uploads a new document version with a new expiry date, but the cron job already queried the old version and sends an alert.
**Why it happens:** The cron job runs once daily; version uploads can happen at any time.
**How to avoid:** The cron job queries the current state at run time. If the version was replaced before the cron runs, the new version's expiry date is used. If replaced after, the next day's run will use the new date. The reminders table tracks `document_version_id` -- old version alerts won't be duplicated for new versions.
**Warning signs:** Alerts mentioning a document that was already replaced (acceptable edge case on the day of replacement).

### Pitfall 6: Migration number collision
**What goes wrong:** Multiple developers create migrations with the same number.
**Why it happens:** Latest migration is 154. Next should be 155.
**How to avoid:** Check `ls supabase/migrations/ | sort -t_ -k1 -n | tail -5` before creating.
**Warning signs:** Supabase migration apply fails with ordering errors.

## Code Examples

### RPC Function: Get Documents Expiring in N Days
```sql
-- Adapted from get_certifications_expiring_in_days in 034_certification_tracking.sql
CREATE OR REPLACE FUNCTION get_documents_expiring_in_days(days_ahead INT)
RETURNS TABLE (
  document_id UUID,
  document_version_id UUID,
  medic_id UUID,
  medic_first_name TEXT,
  medic_last_name TEXT,
  medic_email TEXT,
  org_id UUID,
  category_name TEXT,
  file_name TEXT,
  expiry_date DATE,
  expiry_date_formatted TEXT,
  days_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS document_id,
    dv.id AS document_version_id,
    d.medic_id,
    m.first_name AS medic_first_name,
    m.last_name AS medic_last_name,
    m.email AS medic_email,
    d.org_id,
    dc.name AS category_name,
    dv.file_name,
    dv.expiry_date,
    TO_CHAR(dv.expiry_date, 'DD Mon YYYY') AS expiry_date_formatted,
    days_ahead AS days_remaining
  FROM documents d
  JOIN document_versions dv ON dv.id = d.current_version_id
  JOIN medics m ON m.id = d.medic_id
  JOIN document_categories dc ON dc.id = d.category_id
  WHERE dv.expiry_date = CURRENT_DATE + days_ahead
    AND dv.expiry_date IS NOT NULL
    AND d.status NOT IN ('archived')
    AND m.email IS NOT NULL
  ORDER BY d.org_id, m.last_name, m.first_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Edge Function: Document Expiry Checker (Core Logic)
```typescript
// Source: Adapted from supabase/functions/certification-expiry-checker/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const REMINDER_STAGES = [30, 14, 7, 1];

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // For each stage, get documents hitting that threshold today
  for (const stage of REMINDER_STAGES) {
    const { data: expiringDocs } = await supabase
      .rpc('get_documents_expiring_in_days', { days_ahead: stage });

    if (!expiringDocs?.length) continue;

    // Group by medic for digest emails
    const medicGroups = new Map();
    for (const doc of expiringDocs) {
      // Check deduplication
      const { data: existing } = await supabase
        .from('document_expiry_reminders')
        .select('id')
        .eq('document_version_id', doc.document_version_id)
        .eq('days_before', stage)
        .single();

      if (existing) continue; // Already sent

      const group = medicGroups.get(doc.medic_id) || {
        medic: doc,
        items: [],
      };
      group.items.push(doc);
      medicGroups.set(doc.medic_id, group);
    }

    // Send one digest email per medic
    for (const [medicId, { medic, items }] of medicGroups) {
      const messageId = await sendDigestEmail({ medic, items, stage });
      // Log reminders for each document
      for (const item of items) {
        await supabase.from('document_expiry_reminders').insert({
          document_id: item.document_id,
          document_version_id: item.document_version_id,
          medic_id: item.medic_id,
          org_id: item.org_id,
          days_before: stage,
          resend_message_id: messageId,
        });
      }
    }
  }
});
```

### Resend Email: Dev Mode Fallback in Deno
```typescript
// Source: Adapted from web/lib/email/resend.ts for Deno context
import { Resend } from 'npm:resend@4.0.2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail(params: { from: string; to: string; subject: string; html: string }): Promise<string | null> {
  if (!RESEND_API_KEY) {
    console.log('[DEV MODE] Email not sent (RESEND_API_KEY not configured):');
    console.log('To:', params.to);
    console.log('Subject:', params.subject);
    return 'dev-mode-mock-id';
  }

  const resend = new Resend(RESEND_API_KEY);
  const response = await resend.emails.send(params);
  return response.data?.id || null;
}
```

### Bulk Expiry Query (Dashboard)
```typescript
// Source: Adapted from web/lib/queries/admin/certifications.ts
export async function fetchExpiringDocuments(
  supabase: SupabaseClient,
  orgId: string,
  daysWindow: number
): Promise<ExpiringDocumentRow[]> {
  // Query documents -> current_version -> medic, filtered by org and expiry window
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      medic_id,
      category_id,
      status,
      medics!documents_medic_id_fkey (first_name, last_name),
      document_categories!documents_category_id_fkey (name, slug),
      document_versions!fk_documents_current_version (
        id, expiry_date, file_name
      )
    `)
    .eq('org_id', orgId)
    .neq('status', 'archived')
    .not('current_version_id', 'is', null);

  // Client-side filter for expiry window (or use RPC for server-side)
  // Filter, compute days_remaining, sort by expiry date
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSONB certifications on medics table (Phase 7) | Normalized documents/document_versions tables (Phase 40) | Phase 40 (Feb 2026) | Expiry queries use JOINs instead of jsonb_array_elements. Cleaner schema for version tracking. |
| Per-document individual emails (Phase 7 cert alerts) | Daily digest format (Phase 46 decision) | Phase 46 CONTEXT.md | Fewer emails per medic, better UX. Requires grouping logic in Edge Function. |
| Client-only badges (pre-Phase 45) | Server-side expiry status + client badges (Phase 45) | Phase 45 | Badges exist on web, iOS, admin views. Phase 46 adds proactive notifications. |

**Deprecated/outdated:**
- The `certification-expiry-checker` Edge Function works with the JSONB `medics.certifications` column. Phase 46's document expiry checker works with the normalized `documents` / `document_versions` tables. These are separate systems (certifications vs compliance documents).

## Open Questions

1. **Admin alert: separate digest or same as medic?**
   - What we know: CONTEXT.md leaves this to Claude's discretion. The certification-expiry-checker sends separate emails to medics and site_managers.
   - What's unclear: Whether org admins should get their own digest listing all org documents expiring, or just the per-medic alerts.
   - Recommendation: Send admin a separate org-wide digest (one email listing all expiring documents across all medics), since they already have the bulk dashboard. This is more useful than forwarding individual medic alerts. Only send at 14/7/1 day stages (not 30) to reduce noise.

2. **Should new version upload cancel pending alerts for old version?**
   - What we know: CONTEXT.md leaves this to Claude's discretion. The reminders table tracks `document_version_id`.
   - What's unclear: Whether to implement automatic cancellation or let the natural deduplication handle it.
   - Recommendation: Natural deduplication handles it -- the cron job queries `documents.current_version_id`, so once a new version is uploaded, the old version's expiry is no longer queried. No cancellation logic needed. The reminders table will have historical entries for old versions, which is fine for audit.

3. **Expired document impact (blocking, warning, or none)?**
   - What we know: CONTEXT.md leaves this to Claude's discretion. The `documents.status` column has an 'expired' value.
   - What's unclear: Whether the cron job should also set `documents.status = 'expired'` when a document expires, or just send alerts.
   - Recommendation: The cron job should set `documents.status = 'expired'` for documents whose current version expiry_date has passed. This is informational only (no blocking). The badge already shows "Expired" based on client-side date math, but having the status in the DB enables server-side queries.

4. **Exact dashboard URL path**
   - What we know: Could be `/admin/document-expiry`, `/admin/documents/expiry`, or a sub-section of existing documents admin.
   - Recommendation: Use `/admin/document-expiry` as a standalone admin page, following the pattern of `/certifications` as a top-level dashboard section. Add it as an admin-only nav item.

## Sources

### Primary (HIGH confidence)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/143_comms_docs_schema.sql` - documents, document_versions table schema, RLS policies, indexes
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/141_compliance_documents.sql` - compliance_documents table (separate from v5.0 documents)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/034_certification_tracking.sql` - certification_reminders audit table pattern, RPC functions
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/031_certification_expiry_cron.sql` - pg_cron + pg_net + Vault pattern
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/022_friday_payout_cron.sql` - pg_cron + pg_net pattern
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/certification-expiry-checker/index.ts` - Edge Function pattern (dedup, progressive stages, email sending)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/certification-expiry-checker/email-templates.ts` - Resend email template pattern in Deno
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/email/resend.ts` - Resend client with dev mode fallback
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/documents/document-list.tsx` - ExpiryBadge component (medic portal)
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/documents/admin-document-view.tsx` - ExpiryBadge component (admin view)
- `/Users/sabineresoagli/GitHub/sitemedic/app/(tabs)/documents.tsx` - ExpiryBadge (iOS)
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/certifications/page.tsx` - Bulk dashboard UI pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/queries/admin/certifications.ts` - TanStack Query hooks pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/components/dashboard/DashboardNav.tsx` - Navigation item pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/types/comms.types.ts` - DocumentWithVersion, DocumentVersion types
- `/Users/sabineresoagli/GitHub/sitemedic/web/lib/organizations/org-resolver.ts` - requireOrgId pattern
- `/Users/sabineresoagli/GitHub/sitemedic/web/contexts/org-context.tsx` - useRequireOrg hook
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/137_notification_preferences.sql` - notification_preferences JSONB (has cert_expiry key)
- `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/118_org_settings.sql` - org_settings table with admin_email

### Secondary (MEDIUM confidence)
- Existing `notification_preferences.cert_expiry` boolean in org_settings -- could add `doc_expiry` key for Phase 46 opt-out

### Tertiary (LOW confidence)
- None -- all findings verified from codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in the codebase
- Architecture: HIGH - Near-identical pattern exists (certification expiry checker)
- Pitfalls: HIGH - Based on actual codebase schema analysis and existing edge cases
- Code examples: HIGH - Adapted from verified existing codebase patterns

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- stable patterns, no external dependency changes expected)
