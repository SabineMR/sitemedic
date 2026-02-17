# Phase 7: Certification Tracking - Research

**Researched:** 2026-02-16
**Domain:** Certification expiry tracking and compliance monitoring
**Confidence:** HIGH

## Summary

Phase 7 adds UK construction certification tracking with progressive expiry alerts and validation to prevent expired workers from logging incidents. The system must track multiple certification types (CSCS, CPCS, IPAF, PASMA, Gas Safe) with different expiry rules, send progressive email reminders (30/14/7/1 days before expiry), display dashboard alerts for upcoming/expired certifications, and enforce validation at point-of-use (incident logging).

The existing codebase provides strong foundations: JSONB certifications array already exists in the `medics` table, pg_cron is established for daily scheduled jobs, Resend email infrastructure with React Email templates is proven, and date-fns (v4.1.0) is already a dependency. This phase extends proven patterns from Phase 6 (RIDDOR deadline tracking) to certification management.

**Primary recommendation:** Use hybrid schema design with JSONB for flexible certification storage plus computed queries for expiry checking. Mirror Phase 6's successful pattern: daily pg_cron job → Edge Function → expiry queries → Resend email with progressive reminders. Add client-side validation using date-fns and server-side enforcement via API layer (not CHECK constraints, which can't reference current date).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL JSONB | Built-in | Store certifications array | Flexible schema for mixed cert types, GIN indexing for fast queries |
| pg_cron | Extension | Daily expiry checking | Already established in Phase 5 (weekly reports) and Phase 6 (RIDDOR deadlines) |
| date-fns | 4.1.0 | Date comparison and formatting | Already in web/package.json, type-safe, tree-shakeable, 100% TypeScript |
| Resend | 6.9.2 | Email delivery API | Already in web/package.json, proven in Phase 4.5 (bookings) and Phase 5 (reports) |
| @react-email/components | 1.0.7 | Professional email templates | Already in web/package.json, component-based email design |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Edge Functions | Deno runtime | Server-side expiry checking | Daily cron job handler, email orchestration |
| pg_net | Extension | HTTP calls from pg_cron | Invoke Edge Function from scheduled job |
| Supabase Vault | Built-in | Secure API key storage | RESEND_API_KEY, project_url, service_role_key |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB array | Separate `certifications` table | More normalized but overkill for small cardinality (~5 certs per medic), JSONB performs well with GIN indexing |
| pg_cron | External cron service | Adds infrastructure complexity, pg_cron keeps everything in database |
| Resend | SendGrid / AWS SES | Resend already proven in codebase, migration would be unnecessary churn |
| @react-email | Raw HTML strings | React Email provides maintainability, type safety, preview mode |

**Installation:**
```bash
# No new npm packages required - all dependencies already in web/package.json
# Enable extensions in Supabase migration:
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── migrations/
│   └── 031_certification_tracking.sql      # Schema + cron job setup
├── functions/
│   └── certification-expiry-checker/
│       ├── index.ts                        # Edge Function entry point
│       ├── expiry-queries.ts               # SQL queries for upcoming/expired certs
│       ├── email-templates.ts              # Resend email with React Email
│       └── types.ts                        # TypeScript interfaces

web/
├── lib/
│   └── queries/
│       └── admin/
│           └── certifications.ts           # Dashboard queries for cert status
├── app/
│   └── dashboard/
│       └── certifications/
│           └── page.tsx                    # Certification dashboard view
└── components/
    └── certification-status-badge.tsx      # Visual indicator for expired/expiring certs
```

### Pattern 1: JSONB Certification Storage
**What:** Store certifications as JSONB array in existing `medics.certifications` field with hybrid indexing
**When to use:** For flexible schema where certification types vary and new types may be added
**Example:**
```typescript
// Source: Existing database schema (002_business_operations.sql line 106)
// Current schema:
certifications JSONB DEFAULT '[]'::jsonb

// Data structure (extend existing):
{
  type: 'CSCS' | 'CPCS' | 'IPAF' | 'PASMA' | 'Gas Safe',
  cert_number: string,
  expiry_date: string, // ISO date: 'YYYY-MM-DD'
  issued_date?: string,
  card_colour?: string, // e.g., 'red', 'blue' for CPCS
  notes?: string
}

// Example migration to add GIN index for fast queries:
CREATE INDEX idx_medics_certifications_gin
ON medics USING GIN (certifications);

// Example query for upcoming expiries (30 days):
SELECT m.id, m.first_name, m.last_name, m.email,
       cert->>'type' as cert_type,
       cert->>'cert_number' as cert_number,
       (cert->>'expiry_date')::date as expiry_date
FROM medics m,
     jsonb_array_elements(m.certifications) as cert
WHERE (cert->>'expiry_date')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
AND m.available_for_work = true;
```

### Pattern 2: Progressive Email Reminder Schedule
**What:** Multi-stage reminder system with increasing urgency (30, 14, 7, 1 days before expiry)
**When to use:** For compliance-critical expirations that require advance action
**Example:**
```typescript
// Source: Healthcare certification tracking best practices
// Progressive sequence: 90-60-30-15-7 days is healthcare standard
// Construction safety: 30-14-7-1 days (compressed timeline, faster renewal)

interface ReminderStage {
  days_before: number;
  urgency: 'info' | 'warning' | 'critical';
  recipients: ('medic' | 'manager' | 'admin')[];
  subject_prefix: string;
}

const REMINDER_STAGES: ReminderStage[] = [
  { days_before: 30, urgency: 'info', recipients: ['medic'], subject_prefix: 'Reminder' },
  { days_before: 14, urgency: 'warning', recipients: ['medic', 'manager'], subject_prefix: 'Important' },
  { days_before: 7, urgency: 'warning', recipients: ['medic', 'manager'], subject_prefix: 'Urgent' },
  { days_before: 1, urgency: 'critical', recipients: ['medic', 'manager', 'admin'], subject_prefix: 'CRITICAL' },
];

// Daily cron job checks which stage applies:
async function checkExpiries() {
  for (const stage of REMINDER_STAGES) {
    const expiring = await getExpiringSoon(stage.days_before);
    for (const cert of expiring) {
      await sendReminder(cert, stage);
    }
  }
}
```

### Pattern 3: Date Comparison with date-fns
**What:** Type-safe date operations for expiry checking in UI and API
**When to use:** Client-side validation, API layer checks, dashboard filtering
**Example:**
```typescript
// Source: date-fns documentation - https://date-fns.org/
import {
  isBefore,
  isAfter,
  isPast,
  isFuture,
  differenceInDays,
  addDays,
  parseISO,
  format
} from 'date-fns';

// Check if certification is expired
function isCertificationExpired(expiryDate: string): boolean {
  return isPast(parseISO(expiryDate));
}

// Check if certification is expiring soon (within days)
function isCertificationExpiringSoon(expiryDate: string, withinDays: number): boolean {
  const expiry = parseISO(expiryDate);
  const threshold = addDays(new Date(), withinDays);
  return isBefore(expiry, threshold) && isFuture(expiry);
}

// Get days remaining until expiry
function getDaysUntilExpiry(expiryDate: string): number {
  return differenceInDays(parseISO(expiryDate), new Date());
}

// Format for display
function formatExpiryDate(expiryDate: string): string {
  return format(parseISO(expiryDate), 'dd MMM yyyy'); // "16 Feb 2026"
}
```

### Pattern 4: Daily Cron Job with Edge Function Invocation
**What:** Schedule daily certification checks using pg_cron + Edge Function pattern
**When to use:** Server-side scheduled tasks requiring email delivery and complex logic
**Example:**
```sql
-- Source: Existing pattern from 021_riddor_deadline_cron.sql
-- Schedule certification expiry checker
-- Cron expression: '0 9 * * *' = Every day at 09:00 UTC (9 AM UK time)
SELECT cron.schedule(
  'certification-expiry-checker',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/certification-expiry-checker',
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

### Pattern 5: Validation at Point-of-Use (API Layer)
**What:** Prevent expired workers from being selected for incident logging via API validation
**When to use:** Enforce business rules that depend on current date (cannot use CHECK constraints)
**Example:**
```typescript
// Source: Business logic validation pattern
// API endpoint: POST /api/incidents
// Validates worker certification status before allowing incident creation

async function validateWorkerCertifications(workerId: string): Promise<{
  valid: boolean;
  expired_certs: string[];
  message?: string;
}> {
  const { data: medic } = await supabase
    .from('medics')
    .select('certifications')
    .eq('id', workerId)
    .single();

  const expiredCerts = (medic.certifications as Certification[]).filter(cert =>
    isPast(parseISO(cert.expiry_date))
  );

  if (expiredCerts.length > 0) {
    return {
      valid: false,
      expired_certs: expiredCerts.map(c => c.type),
      message: `Worker has ${expiredCerts.length} expired certification(s): ${expiredCerts.map(c => c.type).join(', ')}`
    };
  }

  return { valid: true, expired_certs: [] };
}

// Use in API route:
export async function POST(request: Request) {
  const { worker_id, ...incidentData } = await request.json();

  const validation = await validateWorkerCertifications(worker_id);
  if (!validation.valid) {
    return Response.json(
      { error: validation.message, expired_certs: validation.expired_certs },
      { status: 403 }
    );
  }

  // Proceed with incident creation
}
```

### Pattern 6: Dashboard Alert Indicators
**What:** Visual status indicators for certification expiry state with color-coding
**When to use:** Dashboard views showing certification compliance at a glance
**Example:**
```typescript
// Source: Carbon Design System - Status indicator pattern
// https://carbondesignsystem.com/patterns/status-indicator-pattern/

type CertificationStatus = 'valid' | 'expiring-soon' | 'expired';

function getCertificationStatus(expiryDate: string): CertificationStatus {
  if (isPast(parseISO(expiryDate))) return 'expired';
  if (isCertificationExpiringSoon(expiryDate, 30)) return 'expiring-soon';
  return 'valid';
}

// React component with text + color + icon (best practice)
function CertificationStatusBadge({ expiryDate }: { expiryDate: string }) {
  const status = getCertificationStatus(expiryDate);
  const daysRemaining = getDaysUntilExpiry(expiryDate);

  const config = {
    'valid': {
      color: 'bg-green-100 text-green-800',
      icon: '✓',
      label: 'Valid'
    },
    'expiring-soon': {
      color: 'bg-amber-100 text-amber-800',
      icon: '⚠',
      label: `Expires in ${daysRemaining} days`
    },
    'expired': {
      color: 'bg-red-100 text-red-800',
      icon: '✕',
      label: 'Expired'
    },
  };

  const { color, icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
```

### Anti-Patterns to Avoid
- **Using CHECK constraints for date validation:** PostgreSQL CHECK constraints cannot reference CURRENT_DATE or compare against current time. Validation must happen at API layer or via triggers.
- **Storing certifications in separate table with low cardinality:** For ~5 certifications per medic, JSONB performs better than JOIN queries. Separate table only if relationships are complex or cardinality is high (>20 items per medic).
- **Hardcoded reminder intervals:** Progressive reminder stages should be configurable, not hardcoded. Use array of stages that can be adjusted without code changes.
- **Forgetting timezone handling:** Always use UTC for storage, convert to UK timezone for display. pg_cron runs in UTC, date-fns parseISO assumes UTC.
- **Single-channel notifications:** Email-only reminders are insufficient. Dashboard indicators provide always-visible status, email provides push notification.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic and comparison | Custom date math with `new Date()` | date-fns | Handles edge cases (leap years, DST, timezones), immutable operations, type-safe |
| Email template rendering | String concatenation HTML | @react-email/components | Component reuse, type safety, preview mode, tested cross-client compatibility |
| Scheduled task execution | Node.js cron or setInterval | pg_cron | Database-native, survives app restarts, centralized scheduling, transaction-safe |
| JSONB array querying | Manual JSON parsing in app | PostgreSQL jsonb_array_elements | Database-level indexing (GIN), query optimization, reduces data transfer |
| Progressive reminder logic | Complex if/else chains | Configuration-driven stage array | Testable, auditable, adjustable without code changes |
| Email deliverability | SMTP server setup | Resend API | Professional templates, deliverability monitoring, bounce handling, compliance |

**Key insight:** Certification expiry tracking is a solved problem in compliance-heavy industries (healthcare, aviation, finance). The pattern is standardized: JSONB for flexible storage, daily scheduled checks, progressive reminders, API validation. Custom solutions miss edge cases (DST transitions, leap years, multi-timezone teams) and lack monitoring/audit trails.

## Common Pitfalls

### Pitfall 1: Timestamp vs Date Comparison Performance
**What goes wrong:** Comparing timestamp columns to date values causes 3x slower queries due to implicit type casting
**Why it happens:** PostgreSQL must cast every timestamp value to date for comparison, preventing index usage
**How to avoid:** Store expiry as DATE not TIMESTAMPTZ, use date literals in queries: `CURRENT_DATE` not `NOW()`
**Warning signs:** EXPLAIN ANALYZE shows sequential scan instead of index scan, query time >100ms for <1000 rows

### Pitfall 2: Missing Timezone Context in Reminders
**What goes wrong:** Cron runs at 09:00 UTC but emails say "expiring today" when it's still yesterday in UK
**Why it happens:** pg_cron runs in UTC, but display assumes local time without conversion
**How to avoid:** Store all dates in UTC, convert to 'Europe/London' timezone only at display time, use date-fns-tz for timezone conversion
**Warning signs:** Users report receiving "expires tomorrow" emails for certifications expiring "today", confusion about deadline dates

### Pitfall 3: Sending Duplicate Reminders
**What goes wrong:** Daily cron job sends same 30-day reminder multiple times for same certification
**Why it happens:** Query matches "30 days away" for multiple days (days 30, 29, 28...) without tracking last sent date
**How to avoid:** Add `last_reminder_sent_at` TIMESTAMPTZ to track when last email was sent, only send if `last_reminder_sent_at < CURRENT_DATE - 1` or NULL
**Warning signs:** Users complain about email spam, Resend logs show duplicate sends, unsubscribe rates increase

### Pitfall 4: Expired Validation Only at UI Layer
**What goes wrong:** Expired worker bypasses validation via API calls, direct database writes, or UI bugs
**Why it happens:** Validation only in React component, not enforced at API or database level
**How to avoid:** Enforce validation at API layer (server-side), consider database trigger for audit logging, UI validation is UX improvement only
**Warning signs:** Expired workers appearing in incident logs, compliance violations in audits, CHECK constraint failures (if attempted)

### Pitfall 5: JSONB Query Performance Without Indexing
**What goes wrong:** Dashboard certification status page times out with >500 medics
**Why it happens:** Sequential scan through JSONB arrays without GIN index, extracting dates from JSON on every query
**How to avoid:** Create GIN index on `certifications` column: `CREATE INDEX idx_medics_certifications_gin ON medics USING GIN (certifications)`, use EXPLAIN ANALYZE to verify index usage
**Warning signs:** Queries take >1 second, database CPU spikes during dashboard loads, pg_stat_statements shows sequential scans

### Pitfall 6: Progressive Reminders Without Audit Trail
**What goes wrong:** Cannot prove compliance when audited, no record of when warnings were sent
**Why it happens:** Reminders sent via fire-and-forget email, no database record of notifications
**How to avoid:** Create `certification_reminders` table logging each reminder sent (medic_id, cert_type, stage, sent_at, resend_message_id), retention policy for audit requirements
**Warning signs:** Cannot answer "when did we notify them?", no metrics on reminder effectiveness, regulatory audit gaps

## Code Examples

Verified patterns from official sources:

### Email Template with React Email (Expiry Reminder)
```typescript
// Source: Existing pattern from web/lib/email/templates/booking-confirmation-email.tsx
// Adapted for certification expiry reminders

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Text,
} from '@react-email/components';

interface CertificationExpiryEmailProps {
  medic: {
    firstName: string;
  };
  certification: {
    type: string;
    certNumber: string;
    expiryDate: string;
  };
  daysRemaining: number;
  renewalUrl?: string;
}

export default function CertificationExpiryEmail({
  medic,
  certification,
  daysRemaining,
  renewalUrl,
}: CertificationExpiryEmailProps) {
  const urgency = daysRemaining <= 1 ? 'CRITICAL' : daysRemaining <= 7 ? 'URGENT' : 'Important';
  const urgencyColor = daysRemaining <= 1 ? '#dc2626' : daysRemaining <= 7 ? '#f59e0b' : '#2563eb';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Certification Expiry Reminder</Heading>

          <Text style={text}>
            Hi {medic.firstName},
          </Text>

          <Text style={text}>
            Your <strong>{certification.type}</strong> certification is expiring soon.
          </Text>

          <Container style={{
            ...detailsBox,
            borderLeft: `4px solid ${urgencyColor}`
          }}>
            <Text style={{ ...detailLabel, color: urgencyColor }}>
              {urgency}: {daysRemaining} Day{daysRemaining !== 1 ? 's' : ''} Remaining
            </Text>

            <Text style={detailLabel}>Certification Type</Text>
            <Text style={detailValue}>{certification.type}</Text>

            <Text style={detailLabel}>Certificate Number</Text>
            <Text style={detailValue}>{certification.certNumber}</Text>

            <Text style={detailLabel}>Expiry Date</Text>
            <Text style={detailValue}>{certification.expiryDate}</Text>
          </Container>

          <Text style={text}>
            Please renew your certification before the expiry date to continue working on SiteMedic assignments.
          </Text>

          {renewalUrl && (
            <Button style={button} href={renewalUrl}>
              Renewal Information
            </Button>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Apex Safety Group Ltd - Keeping you compliant and working
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles (reuse from booking-confirmation-email.tsx)
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};
// ... (other styles match existing pattern)
```

### Edge Function: Certification Expiry Checker
```typescript
// Source: Pattern from supabase/functions/riddor-deadline-checker/index.ts
// Deno Edge Function for daily certification expiry checking

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const REMINDER_STAGES = [30, 14, 7, 1]; // Days before expiry

Deno.serve(async (req) => {
  try {
    const { check_date, trigger } = await req.json();
    console.log(`Certification expiry check triggered by ${trigger} for ${check_date}`);

    let totalReminders = 0;

    for (const daysOut of REMINDER_STAGES) {
      const { data: expiring, error } = await supabase.rpc(
        'get_certifications_expiring_in_days',
        { days_ahead: daysOut }
      );

      if (error) {
        console.error(`Error fetching certifications expiring in ${daysOut} days:`, error);
        continue;
      }

      for (const cert of expiring) {
        // Check if reminder already sent today
        const { data: existingReminder } = await supabase
          .from('certification_reminders')
          .select('id')
          .eq('medic_id', cert.medic_id)
          .eq('cert_type', cert.cert_type)
          .eq('days_before', daysOut)
          .gte('sent_at', `${check_date}T00:00:00Z`)
          .maybeSingle();

        if (existingReminder) {
          console.log(`Reminder already sent today for ${cert.medic_email} - ${cert.cert_type}`);
          continue;
        }

        // Send email
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'SiteMedic Compliance <notifications@sitemedic.app>',
          to: cert.medic_email,
          subject: `${daysOut <= 1 ? 'CRITICAL' : daysOut <= 7 ? 'URGENT' : 'Important'}: ${cert.cert_type} Expires in ${daysOut} Day${daysOut > 1 ? 's' : ''}`,
          react: CertificationExpiryEmail({
            medic: { firstName: cert.medic_first_name },
            certification: {
              type: cert.cert_type,
              certNumber: cert.cert_number,
              expiryDate: cert.expiry_date_formatted,
            },
            daysRemaining: daysOut,
            renewalUrl: cert.renewal_url,
          }),
        });

        if (emailError) {
          console.error(`Failed to send email to ${cert.medic_email}:`, emailError);
          continue;
        }

        // Log reminder sent
        await supabase.from('certification_reminders').insert({
          medic_id: cert.medic_id,
          cert_type: cert.cert_type,
          days_before: daysOut,
          sent_at: new Date().toISOString(),
          resend_message_id: emailResult.id,
        });

        totalReminders++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: totalReminders,
        check_date,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Certification expiry checker error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### PostgreSQL Function: Get Expiring Certifications
```sql
-- Source: PostgreSQL JSONB best practices + existing query patterns
-- Database function to extract certifications expiring in N days

CREATE OR REPLACE FUNCTION get_certifications_expiring_in_days(days_ahead INT)
RETURNS TABLE (
  medic_id UUID,
  medic_first_name TEXT,
  medic_email TEXT,
  cert_type TEXT,
  cert_number TEXT,
  expiry_date DATE,
  expiry_date_formatted TEXT,
  days_remaining INT,
  renewal_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.first_name,
    m.email,
    cert->>'type' as cert_type,
    cert->>'cert_number' as cert_number,
    (cert->>'expiry_date')::date as expiry_date,
    TO_CHAR((cert->>'expiry_date')::date, 'DD Mon YYYY') as expiry_date_formatted,
    (cert->>'expiry_date')::date - CURRENT_DATE as days_remaining,
    CASE
      WHEN cert->>'type' = 'CSCS' THEN 'https://www.cscs.uk.com/apply-for-card/'
      WHEN cert->>'type' = 'CPCS' THEN 'https://www.cpcscards.com/renewal'
      WHEN cert->>'type' = 'IPAF' THEN 'https://www.ipaf.org/en/training'
      WHEN cert->>'type' = 'PASMA' THEN 'https://www.pasma.co.uk/training'
      WHEN cert->>'type' = 'Gas Safe' THEN 'https://www.gassaferegister.co.uk/'
      ELSE NULL
    END as renewal_url
  FROM medics m,
       jsonb_array_elements(m.certifications) as cert
  WHERE
    (cert->>'expiry_date')::date = CURRENT_DATE + days_ahead
    AND m.available_for_work = true
    AND m.email IS NOT NULL
  ORDER BY m.last_name, m.first_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_certifications_expiring_in_days IS 'Returns medics with certifications expiring in exactly N days ahead';
```

### Dashboard Query: Certification Status Overview
```typescript
// Source: Existing pattern from web/lib/queries/admin/*.ts
// Query for dashboard certification compliance view

interface CertificationSummary {
  medic_id: string;
  medic_name: string;
  total_certs: number;
  expired_certs: number;
  expiring_soon_certs: number; // Within 30 days
  valid_certs: number;
  status: 'compliant' | 'at-risk' | 'non-compliant';
}

async function getCertificationSummary(
  orgId: string
): Promise<CertificationSummary[]> {
  const { data, error } = await supabase.rpc(
    'get_certification_summary_by_org',
    { org_id: orgId }
  );

  if (error) throw error;
  return data;
}

// PostgreSQL function for certification summary
-- CREATE OR REPLACE FUNCTION get_certification_summary_by_org(org_id UUID)
-- RETURNS TABLE (
--   medic_id UUID,
--   medic_name TEXT,
--   total_certs INT,
--   expired_certs INT,
--   expiring_soon_certs INT,
--   valid_certs INT,
--   status TEXT
-- ) AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     m.id,
--     m.first_name || ' ' || m.last_name as medic_name,
--     jsonb_array_length(m.certifications) as total_certs,
--     (
--       SELECT COUNT(*)
--       FROM jsonb_array_elements(m.certifications) as cert
--       WHERE (cert->>'expiry_date')::date < CURRENT_DATE
--     )::INT as expired_certs,
--     (
--       SELECT COUNT(*)
--       FROM jsonb_array_elements(m.certifications) as cert
--       WHERE (cert->>'expiry_date')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
--     )::INT as expiring_soon_certs,
--     (
--       SELECT COUNT(*)
--       FROM jsonb_array_elements(m.certifications) as cert
--       WHERE (cert->>'expiry_date')::date > CURRENT_DATE + INTERVAL '30 days'
--     )::INT as valid_certs,
--     CASE
--       WHEN EXISTS (
--         SELECT 1
--         FROM jsonb_array_elements(m.certifications) as cert
--         WHERE (cert->>'expiry_date')::date < CURRENT_DATE
--       ) THEN 'non-compliant'
--       WHEN EXISTS (
--         SELECT 1
--         FROM jsonb_array_elements(m.certifications) as cert
--         WHERE (cert->>'expiry_date')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
--       ) THEN 'at-risk'
--       ELSE 'compliant'
--     END as status
--   FROM medics m
--   WHERE m.org_id = org_id
--   ORDER BY
--     CASE
--       WHEN status = 'non-compliant' THEN 1
--       WHEN status = 'at-risk' THEN 2
--       ELSE 3
--     END,
--     medic_name;
-- END;
-- $$ LANGUAGE plpgsql STABLE;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual spreadsheet tracking | Automated expiry monitoring with database queries | 2020s (post-COVID digitization) | Eliminates human error, provides real-time visibility |
| Single "expiry" email | Progressive reminder sequence (30/14/7/1 days) | Healthcare standard since 2015 | Higher renewal completion rates, fewer lapses |
| Email-only notifications | Multi-channel (dashboard + email + API validation) | Modern SaaS pattern (2020+) | Always-visible status, enforcement at point-of-use |
| Separate certifications table | JSONB array with GIN indexing | PostgreSQL 9.4+ (2014) | Better performance for low cardinality, flexible schema |
| External cron services | pg_cron database-native scheduling | pg_cron extension (2016) | Simplified architecture, transaction-safe |
| SMTP email servers | Transactional email APIs (Resend, SendGrid) | 2018-2020 shift | Better deliverability, monitoring, compliance |

**Deprecated/outdated:**
- **CHECK constraints for date validation:** Cannot reference `CURRENT_DATE`, PostgreSQL limitation remains as of 2026. Use API layer validation or triggers instead.
- **Storing dates as strings:** Use DATE or TIMESTAMPTZ types for proper comparison, indexing, and timezone handling.
- **Manual HTML email templates:** Use component-based systems (@react-email) for maintainability and cross-client compatibility.
- **Polling for expiry checks:** Use scheduled jobs (pg_cron) instead of application-level polling which wastes resources.

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-organization certification requirements**
   - What we know: Different construction companies may require different certification types
   - What's unclear: Should certification requirements be configurable per organization or globally standardized?
   - Recommendation: Phase 7 implements UK standard certifications (CSCS, CPCS, IPAF, PASMA, Gas Safe) as baseline. Phase 8+ could add organization-specific requirements table if needed.

2. **Certification renewal workflow**
   - What we know: System tracks expiry and sends reminders
   - What's unclear: Should system provide renewal forms, track renewal status, or just remind?
   - Recommendation: Phase 7 sends reminders with external renewal links. Do not build renewal workflow (out of scope, medics renew with certifying bodies directly).

3. **Expired worker "soft" vs "hard" block**
   - What we know: Requirement CERT-06 says prevent worker selection for incident logging
   - What's unclear: Should expired workers be completely hidden from UI or visible with disabled state + explanation?
   - Recommendation: Soft block with visual indicator - show in UI as disabled with tooltip "Expired certification: CSCS (expired 5 days ago)". Allows managers to see full roster, understand why worker unavailable.

4. **Historical certification tracking**
   - What we know: JSONB array stores current certifications
   - What's unclear: Should system track certification history (previous cert numbers, renewal dates, lapsed periods)?
   - Recommendation: Phase 7 tracks current certifications only. If audit requirements demand full history, Phase 8+ adds `certification_history` table with temporal tracking.

5. **Grace period for expired certifications**
   - What we know: UK construction sites have varying policies on grace periods
   - What's unclear: Should system allow configurable grace period (e.g., 7 days post-expiry)?
   - Recommendation: No grace period in Phase 7 - enforce strict expiry rules. If needed, add `grace_period_days` config later. Better to be strict initially than loosen compliance.

## Sources

### Primary (HIGH confidence)
- **date-fns official documentation** - https://date-fns.org/ - Date comparison functions and TypeScript usage
- **Supabase pg_cron documentation** - https://supabase.com/docs/guides/database/extensions/pg_cron - Daily scheduled jobs pattern
- **PostgreSQL JSONB documentation** - https://www.postgresql.org/docs/current/datatype-json.html - JSONB storage and querying
- **Resend API documentation** - https://resend.com/docs - Email delivery with @react-email
- **Existing codebase patterns**:
  - `supabase/migrations/002_business_operations.sql` (line 106) - JSONB certifications field
  - `supabase/migrations/021_riddor_deadline_cron.sql` - Daily cron job pattern
  - `web/lib/email/templates/booking-confirmation-email.tsx` - React Email template structure
  - `supabase/functions/riddor-deadline-checker/email-templates.ts` - Professional email template with urgency levels

### Secondary (MEDIUM confidence)
- **UK construction certifications** - https://www.cscs.uk.com/, https://www.citb.co.uk/courses-and-qualifications/health-safety-and-environment-hse-test-and-cards/card-schemes/ - CSCS, CPCS, IPAF, PASMA standards and expiry rules
- **Healthcare certification tracking best practices** - https://www.expirationreminder.com/blog/best-practices-tracking-employee-certifications-healthcare - Progressive reminder sequence (90-60-30-15-7 days), adapted to 30-14-7-1 for construction
- **PostgreSQL date comparison performance** - https://postgrespro.com/list/thread-id/1558529, https://databasefaqs.com/postgresql-date-comparison/ - Timestamp vs date comparison performance pitfalls
- **Carbon Design System status indicators** - https://carbondesignsystem.com/patterns/status-indicator-pattern/ - UI pattern for visual alerts (text + color + icon)
- **AWS PostgreSQL JSONB best practices** - https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/ - Hybrid schema design, indexing strategies

### Tertiary (LOW confidence)
- **UK construction site compliance 2026** - https://www.leadingedgesafety.co.uk/height-safety-compliance-checklist-2026/ - Certification expiry validation requirements (general guidance, not regulatory source)
- **Email reminder templates** - https://www.omnisend.com/blog/reminder-email/, https://encharge.io/reminder-email/ - Progressive reminder email copywriting and timing strategies
- **Database constraint validation** - https://www.postgresql.org/docs/current/ddl-constraints.html - CHECK constraint limitations (cannot reference CURRENT_DATE)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, patterns proven in Phase 5/6
- Architecture: HIGH - JSONB + pg_cron + Resend is established pattern in codebase
- Pitfalls: HIGH - Based on PostgreSQL official docs + codebase learnings
- UK certification specifics: MEDIUM - Based on official cert body websites, not full regulatory audit

**Research date:** 2026-02-16
**Valid until:** 2026-04-16 (60 days) - Stack is stable, certification standards change infrequently
