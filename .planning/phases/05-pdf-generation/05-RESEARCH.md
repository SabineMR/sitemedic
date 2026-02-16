# Phase 5: PDF Generation - Research

**Researched:** 2026-02-15
**Domain:** Server-side PDF generation for weekly safety reports in Supabase Edge Functions
**Confidence:** HIGH

## Summary

Weekly safety report PDF generation in a Supabase Edge Functions environment requires careful library selection and architecture to meet the <10 second generation constraint. The standard approach is **@react-pdf/renderer** for document composition with React components, generating PDFs server-side using familiar JSX syntax. This library works in Deno runtime (Supabase Edge Functions run Deno 2.1.4+) and supports professional document layouts with tables, images, and branding.

For the automated weekly generation, **pg_cron** (built into Supabase) schedules Edge Function invocation every Friday, which generates the PDF, stores it in Supabase Storage with signed URLs, and sends email notifications via **Resend API** with PDF attachments.

**Primary recommendation:** Use @react-pdf/renderer for PDF composition, pg_cron for weekly scheduling, Supabase Storage for secure PDF storage with signed URLs, and Resend for email delivery with attachments. Avoid heavy dependencies like Puppeteer/Chromium due to cold start penalties and memory overhead that would exceed the 10-second constraint.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 4.3.2 | PDF document generation | React component-based PDF creation, works in Deno/Node/browser, declarative API, server-side rendering support via renderToStream |
| Resend | Latest API | Transactional email delivery | Modern email API with 40MB attachment support, official Supabase integration, developer-friendly, excellent deliverability |
| pg_cron | 1.6.4+ | Scheduled job execution | Built into Supabase (Postgres extension), native database-driven scheduling, no external cron service needed |
| pg_net | Latest | HTTP requests from Postgres | Enables pg_cron to invoke Edge Functions, built into Supabase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-pdf/pdfkit | 4.1.0 | PDF rendering engine | Automatically included with @react-pdf/renderer, handles low-level PDF generation |
| react-pdf-charts | Latest | SVG chart rendering in PDFs | If compliance score or treatment trends need visual charts (optional) |
| Supabase Storage | Native | Secure file storage | Storing generated PDFs with signed URL access for site managers and auditors |
| Supabase Vault | Native | Secrets management | Securely storing Resend API keys and service role keys for Edge Functions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | pdf-lib | pdf-lib is lower-level (no React components), better for modifying existing PDFs than creating from scratch, more verbose for reports |
| @react-pdf/renderer | Puppeteer/Chromium | HTML-to-PDF approach has better CSS support but 10x slower cold starts, massive bundle size (50MB+), incompatible with Supabase Edge Functions security sandbox |
| Resend | Supabase native SMTP | Native limit is 2 emails/hour (insufficient), no custom branding, Resend offers production-grade deliverability |
| pg_cron | External cron service | pg_cron is native to Supabase, simpler architecture, no external dependencies, database-driven reliability |

**Installation:**
```bash
# In Supabase Edge Function directory
echo 'import { renderToStream } from "npm:@react-pdf/renderer@4.3.2";' > supabase/functions/generate-weekly-report/index.ts

# Resend API doesn't require npm install - use fetch API
# pg_cron is pre-installed in Supabase Postgres
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── functions/
│   ├── generate-weekly-report/      # Edge Function for PDF generation
│   │   ├── index.ts                 # Main handler
│   │   ├── ReportDocument.tsx       # React-PDF document component
│   │   ├── components/              # Reusable report sections
│   │   │   ├── Header.tsx           # Company branding, logo, report title
│   │   │   ├── ComplianceScore.tsx  # Weekly score summary
│   │   │   ├── TreatmentTable.tsx   # Treatment log table
│   │   │   ├── NearMissTable.tsx    # Near-miss incidents
│   │   │   └── Footer.tsx           # Page numbers, generation date
│   │   └── queries.ts               # Supabase queries for report data
│   └── schedule-weekly-reports/     # Cron trigger (optional separate function)
└── migrations/
    └── 20260215_setup_weekly_pdf_cron.sql  # pg_cron job definition
```

### Pattern 1: Server-Side PDF Generation with React Components
**What:** Use @react-pdf/renderer to define PDF layouts as React components, render server-side to stream
**When to use:** Generating structured reports with repeating sections (tables, lists)
**Example:**
```typescript
// Source: https://react-pdf.org/ + https://supabase.com/docs/guides/functions
import { Document, Page, View, Text, Image, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';
import { renderToStream } from 'npm:@react-pdf/renderer@4.3.2';

// Define styles (similar to CSS-in-JS)
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottom: '2pt solid #003366' },
  logo: { width: 120, height: 40 },
  title: { fontSize: 24, color: '#003366', marginTop: 10 },
  section: { marginBottom: 15 },
  table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tableCell: { padding: 8, fontSize: 10 }
});

// Define document structure
const WeeklyReportDocument = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={data.companyLogo} style={styles.logo} />
        <Text style={styles.title}>Weekly Safety Report</Text>
        <Text>Week Ending: {data.weekEnding} | Medic: {data.medicName}</Text>
      </View>

      <View style={styles.section}>
        <Text>Compliance Score: {data.complianceScore}%</Text>
      </View>

      <View style={styles.table}>
        {data.treatments.map((treatment, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableCell}>{treatment.date}</Text>
            <Text style={styles.tableCell}>{treatment.type}</Text>
            <Text style={styles.tableCell}>{treatment.worker}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

// Edge Function handler
Deno.serve(async (req) => {
  // Fetch report data from Supabase
  const reportData = await fetchWeeklyReportData();

  // Generate PDF stream
  const pdfStream = await renderToStream(
    <WeeklyReportDocument data={reportData} />
  );

  // Convert stream to buffer for storage/email
  const chunks = [];
  for await (const chunk of pdfStream) {
    chunks.push(chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new Response(pdfBuffer, {
    headers: { 'Content-Type': 'application/pdf' }
  });
});
```

### Pattern 2: Scheduled Weekly PDF Generation with pg_cron
**What:** Use pg_cron to invoke Edge Function every Friday, triggering PDF generation and email delivery
**When to use:** Automated recurring report generation
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/functions/schedule-functions
-- Schedule weekly report generation every Friday at 5 PM UTC
SELECT cron.schedule(
  'generate-weekly-safety-report',
  '0 17 * * 5', -- Friday at 5 PM (cron syntax: minute hour day month day-of-week)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/generate-weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'week_ending', CURRENT_DATE
    )
  ) AS request_id;
  $$
);
```

### Pattern 3: Secure PDF Storage with Signed URLs
**What:** Store generated PDFs in Supabase Storage private bucket, generate time-limited signed URLs for access
**When to use:** Providing secure access to PDFs for site managers and auditors without making files public
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/storage
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role for storage access
);

// Upload PDF to private bucket
const fileName = `weekly-report-${weekEnding}.pdf`;
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('safety-reports') // Private bucket
  .upload(`reports/${fileName}`, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: false
  });

// Generate signed URL (valid for 7 days for site managers to download)
const { data: signedUrl } = await supabase.storage
  .from('safety-reports')
  .createSignedUrl(`reports/${fileName}`, 604800); // 7 days in seconds

// Store signed URL in database for site manager access
await supabase
  .from('weekly_reports')
  .insert({
    week_ending: weekEnding,
    pdf_url: signedUrl.signedUrl,
    generated_at: new Date().toISOString()
  });
```

### Pattern 4: Email Delivery with PDF Attachment via Resend
**What:** Send email notification to site manager with PDF attached using Resend API
**When to use:** Delivering weekly reports via email as alternative to download
**Example:**
```typescript
// Source: https://resend.com/docs/api-reference/emails/send-email
const resendApiKey = Deno.env.get('RESEND_API_KEY');

const emailResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'SiteMedic Reports <reports@sitemedic.co.uk>',
    to: [siteManagerEmail],
    subject: `Weekly Safety Report - Week Ending ${weekEnding}`,
    html: `
      <h2>Your Weekly Safety Report is Ready</h2>
      <p>Hello ${siteManagerName},</p>
      <p>Your weekly safety report for the week ending ${weekEnding} is attached.</p>
      <ul>
        <li>Compliance Score: ${complianceScore}%</li>
        <li>Treatments: ${treatmentCount}</li>
        <li>Near-Misses: ${nearMissCount}</li>
      </ul>
      <p>You can also <a href="${signedUrl}">download the report here</a> (link valid for 7 days).</p>
    `,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer.toString('base64'), // Base64 encode PDF
        content_type: 'application/pdf'
      }
    ]
  })
});
```

### Anti-Patterns to Avoid
- **Using Puppeteer/Chromium in Edge Functions:** Cold start times exceed 10 seconds, binary size incompatible with edge runtime, memory overhead causes timeouts
- **Generating PDFs client-side in mobile app:** Drains battery, unreliable on low-end devices, increases app bundle size, poor offline experience
- **Making Storage bucket public:** Exposes all PDFs without access control, violates GDPR for worker data, unsuitable for audit-ready documents
- **Hand-rolling PDF layout logic:** Use @react-pdf components instead of manual coordinate calculations, avoids page break bugs and layout inconsistencies
- **Sending emails directly from Edge Functions via SMTP:** Deliverability issues, IP reputation problems, no attachment size optimization, use Resend API instead
- **Storing Resend API key in code:** Use Supabase Vault for secrets, accessed via `vault.decrypted_secrets` in SQL or `Deno.env.get()` in Edge Functions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF layout and rendering | Custom PDF byte manipulation, manual coordinate positioning | @react-pdf/renderer components | PDF spec is complex (1000+ pages), page breaks are non-trivial, font embedding requires binary handling, React components handle all edge cases |
| Email deliverability | Direct SMTP connection, nodemailer in Edge Function | Resend API | SPF/DKIM/DMARC configuration is complex, IP reputation management, bounce handling, attachment encoding, rate limiting |
| Scheduled job execution | External cron service, AWS EventBridge | pg_cron (built into Supabase) | Database-driven reliability, transactional guarantees, built-in monitoring via `cron.job_run_details` table, no external dependencies |
| Table layouts in PDFs | Manual View/Text positioning for rows/columns | @react-pdf/renderer View with flexDirection: 'row' OR react-pdf-table | Multi-page table wrapping is complex, column width calculations, header repetition on pages, cell padding edge cases |
| Secure file access | Public bucket with custom auth middleware | Supabase Storage signed URLs | Time-limited access, no middleware needed, automatic expiry, integrates with Row Level Security (RLS) |
| Report data aggregation | Manual SQL joins in Edge Function | Postgres Views or Functions | Complex queries (treatments + near-misses + checks + compliance) benefit from database-side optimization, reusable across functions |
| PDF compression | Custom image resizing, manual PDF optimization | @react-pdf/renderer automatic optimization | Library handles image compression, font subsetting, removes unnecessary metadata, produces smaller files |

**Key insight:** Server-side PDF generation has mature libraries that handle the thousands of edge cases (fonts, page breaks, images, tables). Custom solutions inevitably rediscover these edge cases in production. Focus domain complexity on report content/structure, not PDF rendering mechanics.

## Common Pitfalls

### Pitfall 1: Memory Leaks with @react-pdf/renderer
**What goes wrong:** Every PDF generation increases memory usage, memory never returns to baseline, eventually causing Edge Function crashes or timeouts
**Why it happens:** @react-pdf/renderer (via underlying pdf.js) doesn't automatically garbage collect all resources. Persistent references to PDF rendering objects accumulate across invocations in long-lived processes.
**How to avoid:**
- Edge Functions are stateless/ephemeral by design, each invocation gets fresh isolate (this helps naturally)
- Don't cache PDF rendering objects across requests
- If using renderToStream, consume entire stream and allow it to close
- Monitor memory usage in production via Supabase metrics
**Warning signs:** Edge Function invocation times gradually increase over repeated executions, memory usage in dashboard trending upward

### Pitfall 2: Exceeding 10-Second Generation Time
**What goes wrong:** PDF generation times out, pg_cron job fails, users don't receive weekly reports
**Why it happens:** Complex reports with hundreds of rows, large images without compression, synchronous Supabase queries, cold start overhead
**How to avoid:**
- **Optimize data queries:** Use Postgres Views to pre-aggregate report data, fetch all data in single query instead of multiple sequential queries
- **Limit report scope:** Weekly reports should summarize, not list every single treatment (e.g., show top 20 treatments + count of remaining)
- **Compress images:** Company logo should be <100KB, use optimized PNG/JPG, avoid embedding photos of every treatment in PDF
- **Use indexes:** Ensure database indexes on `created_at`, `site_id`, `medic_id` for fast date-range filtering
- **Batch table rows:** If tables have 100+ rows, consider pagination or summary tables instead of rendering all rows
**Warning signs:** PDF generation takes >5 seconds in testing, Supabase function logs show slow query times, timeouts in pg_cron job_run_details table

### Pitfall 3: Cold Start Penalties from Heavy Dependencies
**What goes wrong:** First PDF generation after idle period takes 15-30 seconds, violating <10 second constraint
**Why it happens:** Edge Functions have cold starts when not recently invoked. Heavy npm dependencies increase cold start time. Puppeteer/Chromium bundles are 50MB+ and incompatible with Deno edge runtime.
**How to avoid:**
- **Use @react-pdf/renderer, not Puppeteer:** @react-pdf is pure JavaScript, no binary dependencies, works in Deno
- **Minimize npm dependencies:** Only import what's needed from @react-pdf/renderer
- **Keep functions warm (optional):** For critical Friday evening generation, schedule a "warm-up" ping 5 minutes before actual cron job
- **Accept cold starts for on-demand:** Weekly automated generation can be scheduled to tolerate 1-2 second cold start, on-demand downloads from dashboard may have slight delay first time
**Warning signs:** Function invocation logs show long "cold start" duration, first-time generation fails but retries succeed

### Pitfall 4: Image Rendering Failures (Logo Not Appearing)
**What goes wrong:** Company logo doesn't appear in PDF, or PDF generation fails with image error
**Why it happens:** @react-pdf/renderer Image component requires accessible URLs (not local file paths in Edge Function), CORS issues, image format not supported
**How to avoid:**
- **Use Supabase Storage for logo:** Upload company logo to public bucket in Supabase Storage, use full URL in Image component
- **Support JPG and PNG only:** Avoid SVG logos in Image component (use SVG components instead or convert to PNG)
- **Use base64 for small logos:** For logos <50KB, embed as base64 data URI to avoid network requests during PDF generation
- **Test image URLs:** Ensure logo URL is publicly accessible (not behind auth) during PDF generation
**Warning signs:** PDF renders but logo is blank, console errors about image loading, CORS errors in function logs

### Pitfall 5: Table Overflow and Page Breaks
**What goes wrong:** Tables get cut off at page boundaries, data appears on wrong page, layout breaks with many rows
**Why it happens:** @react-pdf/renderer doesn't auto-split tables across pages without explicit configuration, complex table libraries have bugs with page wrapping
**How to avoid:**
- **Use built-in page wrapping:** @react-pdf/renderer handles page breaks automatically for simple layouts, but tables need `wrap={false}` per row if you want to prevent mid-row splits
- **Batch rows per page:** Limit tables to 20-25 rows per page manually, create new Page component for additional rows
- **Use react-pdf-table cautiously:** Community table libraries help but have limitations with multi-page tables, test thoroughly with realistic data volumes
- **Design for summaries:** Instead of listing 200 treatments, show top 10 + aggregated counts ("...and 190 more")
**Warning signs:** PDF has blank pages, table data disappears, rows appear out of order, overlapping text

### Pitfall 6: Email Attachment Size Limits
**What goes wrong:** Email sending fails silently or returns error, site manager doesn't receive PDF
**Why it happens:** Resend has 40MB limit after base64 encoding. Large PDFs (embedded photos, high-res logos) can exceed this when base64-encoded (33% size increase).
**How to avoid:**
- **Keep PDFs under 20MB pre-encoding:** Leaves headroom for base64 overhead
- **Optimize images:** Compress logos and any embedded images, use 72-150 DPI (not 300 DPI)
- **Use download links instead:** For large reports, send email with signed URL download link only (no attachment)
- **Monitor PDF sizes:** Log generated PDF file sizes, alert if exceeding 15MB
**Warning signs:** Resend API returns 413 Payload Too Large, emails not delivered, function succeeds but email never arrives

### Pitfall 7: Insecure Secrets Management
**What goes wrong:** Resend API key leaked in code, service role key exposed in logs, security audit failure
**Why it happens:** Hardcoding secrets in Edge Function code, logging full secret values for debugging, committing .env files to Git
**How to avoid:**
- **Use Supabase Vault for pg_cron jobs:** Store `project_url` and `service_role_key` in Vault, access via `vault.decrypted_secrets`
- **Use Edge Function secrets for Resend API key:** Set via `supabase secrets set RESEND_API_KEY=xxx`, access via `Deno.env.get('RESEND_API_KEY')`
- **Never log secrets:** If debugging, log truncated version (`key.slice(0, 8) + '...'`) not full value
- **Rotate keys regularly:** Supabase allows secret updates without redeploying functions
**Warning signs:** Secrets visible in Git history, function logs show full API keys, security scanner alerts

### Pitfall 8: Generic or Unclear Report Content
**What goes wrong:** HSE auditors reject report as insufficient, site managers complain reports lack detail, principal contractors request additional data
**Why it happens:** Vague language ("appropriate equipment used"), missing specific dates/times, no worker names (when allowed), incomplete sections
**How to avoid:**
- **Be specific:** "First aid administered: minor cut, cleaned with antiseptic wipe, plaster applied" not "Treatment provided"
- **Include all required fields:** Project name, week ending date, medic name, compliance score, treatment count, near-miss count, certification status, RIDDOR status, open actions (per PDF-02 requirement)
- **Use professional formatting:** Clear section headers, consistent fonts, readable font sizes (10-12pt), good contrast
- **Follow HSE report standards:** Research HSE daily site safety report templates for structure inspiration
**Warning signs:** Site managers request "more detail" frequently, auditors ask follow-up questions that should be in report, reports feel incomplete

## Code Examples

Verified patterns from official sources:

### Setting pg_cron Secrets in Supabase Vault
```sql
-- Source: https://supabase.com/docs/guides/functions/schedule-functions
-- Store project URL and service role key securely in Vault
-- These are accessed by pg_cron to authenticate Edge Function calls

-- Retrieve from Supabase Dashboard > Settings > API
-- Insert into vault (done automatically by Supabase, shown for reference)
SELECT vault.create_secret(
  'your-project-url',
  'project_url'
);

SELECT vault.create_secret(
  'your-service-role-key',
  'service_role_key'
);

-- Access in pg_cron job:
-- (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
```

### Monitoring pg_cron Job Execution
```sql
-- Source: https://supabase.com/docs/guides/cron
-- Check job run history to debug failed PDF generations
SELECT
  job_id,
  runid,
  job_name,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
WHERE job_name = 'generate-weekly-safety-report'
ORDER BY start_time DESC
LIMIT 10;

-- Check if job is scheduled correctly
SELECT * FROM cron.job;
```

### Unscheduling a pg_cron Job
```sql
-- Source: https://supabase.com/docs/guides/cron
-- Remove weekly PDF generation job (e.g., during testing or to reschedule)
SELECT cron.unschedule('generate-weekly-safety-report');
```

### Setting Edge Function Secrets via CLI
```bash
# Source: https://supabase.com/docs/guides/functions/secrets
# Set Resend API key for email delivery
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Verify secrets are set (shows names only, not values)
supabase secrets list
```

### React-PDF StyleSheet Creation
```typescript
// Source: https://react-pdf.org/
import { StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';

// Define reusable styles (similar to CSS-in-JS)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '2pt solid #003366', // Brand color
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 3
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
    borderBottom: '1pt solid #CCCCCC',
    paddingBottom: 4
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderColor: '#CCCCCC',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableHeaderRow: {
    backgroundColor: '#F0F0F0',
    fontWeight: 'bold'
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
    borderStyle: 'solid',
    borderColor: '#CCCCCC',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    flex: 1
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#999999',
    borderTop: '1pt solid #CCCCCC',
    paddingTop: 10
  }
});
```

### React-PDF Document with Branding
```typescript
// Source: https://react-pdf.org/components
import { Document, Page, View, Text, Image } from 'npm:@react-pdf/renderer@4.3.2';

const WeeklyReportDocument = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header with branding */}
      <View style={styles.header}>
        <View>
          <Image
            src={data.companyLogoUrl} // From Supabase Storage
            style={styles.logo}
          />
        </View>
        <View>
          <Text style={styles.title}>Weekly Safety Report</Text>
          <Text style={styles.subtitle}>Week Ending: {data.weekEnding}</Text>
          <Text style={styles.subtitle}>Medic: {data.medicName}</Text>
        </View>
      </View>

      {/* Compliance Score Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compliance Summary</Text>
        <Text>Overall Compliance Score: {data.complianceScore}%</Text>
        <Text>Daily Safety Checks Completed: {data.checksCompleted}/{data.checksRequired}</Text>
      </View>

      {/* Treatments Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Treatments ({data.treatments.length})</Text>
        <View style={styles.table}>
          {/* Table header */}
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={styles.tableCell}>Date</Text>
            <Text style={styles.tableCell}>Type</Text>
            <Text style={styles.tableCell}>Worker</Text>
            <Text style={styles.tableCell}>Outcome</Text>
          </View>
          {/* Table rows */}
          {data.treatments.map((treatment, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{treatment.date}</Text>
              <Text style={styles.tableCell}>{treatment.type}</Text>
              <Text style={styles.tableCell}>{treatment.workerName}</Text>
              <Text style={styles.tableCell}>{treatment.outcome}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer with page numbers and generation date */}
      <Text
        style={styles.footer}
        render={({ pageNumber, totalPages }) =>
          `Generated on ${data.generatedDate} | Page ${pageNumber} of ${totalPages} | SiteMedic © 2026`
        }
        fixed
      />
    </Page>
  </Document>
);
```

### Fetching Report Data from Supabase
```typescript
// Source: Supabase best practices
import { createClient } from '@supabase/supabase-js';

async function fetchWeeklyReportData(weekEnding: string, siteId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role for full access
  );

  // Calculate week start (7 days before week ending)
  const weekStart = new Date(weekEnding);
  weekStart.setDate(weekStart.getDate() - 7);

  // Fetch all report data in parallel for performance
  const [treatments, nearMisses, checks, compliance] = await Promise.all([
    // Treatments for the week
    supabase
      .from('treatments')
      .select('date, type, worker_name, outcome')
      .eq('site_id', siteId)
      .gte('date', weekStart.toISOString())
      .lte('date', weekEnding)
      .order('date', { ascending: false }),

    // Near-miss incidents
    supabase
      .from('near_misses')
      .select('date, description, severity, corrective_action')
      .eq('site_id', siteId)
      .gte('date', weekStart.toISOString())
      .lte('date', weekEnding),

    // Daily safety checks completion
    supabase
      .from('daily_safety_checks')
      .select('date, completed')
      .eq('site_id', siteId)
      .gte('date', weekStart.toISOString())
      .lte('date', weekEnding),

    // Compliance score for the week (from aggregated view)
    supabase
      .from('weekly_compliance_scores')
      .select('score')
      .eq('site_id', siteId)
      .eq('week_ending', weekEnding)
      .single()
  ]);

  return {
    weekEnding,
    treatments: treatments.data || [],
    nearMisses: nearMisses.data || [],
    checksCompleted: checks.data?.filter(c => c.completed).length || 0,
    checksRequired: checks.data?.length || 0,
    complianceScore: compliance.data?.score || 0
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer/Chromium for PDF generation | @react-pdf/renderer or pdf-lib | 2023-2024 | Edge runtime incompatibility drove shift to pure JS libraries, 10x faster cold starts, 50MB smaller bundles |
| Client-side PDF generation (jsPDF in browser) | Server-side generation (Edge Functions) | 2024-2025 | Mobile battery savings, consistent rendering, reduced app bundle size, better offline handling |
| External cron services (AWS EventBridge, Zapier) | pg_cron native to Supabase | 2024-2025 (pg_cron 1.6+) | Simplified architecture, database-driven reliability, no external dependencies, transactional guarantees |
| Nodemailer + custom SMTP | Resend API | 2023-2024 | Better deliverability, simpler API, attachment handling optimized, no SMTP configuration needed |
| Public storage buckets with custom auth | Signed URLs in Supabase Storage | Established pattern | Time-limited access, no middleware, automatic expiry, better security for audit documents |
| HTML-to-PDF conversion (wkhtmltopdf) | React component-based PDF (react-pdf) | 2022-2023 | Declarative API, reusable components, better TypeScript support, faster rendering without browser engine |

**Deprecated/outdated:**
- **Puppeteer in Edge Functions:** Incompatible with Deno edge runtime security sandbox, massive cold start penalty, use @react-pdf/renderer instead
- **pdfkit directly:** Low-level API, verbose for reports, @react-pdf/renderer uses pdfkit internally but provides React components
- **Supabase native email (2 emails/hour limit):** Insufficient for production, use Resend or similar transactional email service
- **react-pdf-charts for recharts v3+:** Library doesn't support recharts v3+, consider manual SVG construction or static chart images instead

## Open Questions

Things that couldn't be fully resolved:

1. **Chart/graph rendering in PDFs**
   - What we know: @react-pdf/renderer supports SVG components, react-pdf-charts exists for recharts integration but doesn't support recharts v3+
   - What's unclear: Best current approach for compliance score trend charts (manual SVG, static PNG from chart library, or skip charts for MVP)
   - Recommendation: Start with text-based summary ("Score improved 5% from last week"), add charts in future iteration if auditors request visual trends

2. **Optimal PDF file size for email vs. download**
   - What we know: Resend allows 40MB post-encoding (≈30MB PDF), realistic reports with tables should be 1-5MB
   - What's unclear: Should we send PDFs as email attachments for all reports, or only small reports (<5MB) with download links for larger ones
   - Recommendation: Always attach PDF if <5MB, for larger reports send email with signed URL download link only, monitor actual PDF sizes in production

3. **Multi-page table handling complexity**
   - What we know: @react-pdf/renderer handles page breaks automatically, but complex tables may need manual pagination
   - What's unclear: Whether react-pdf-table is production-ready for multi-page treatment tables with 50+ rows
   - Recommendation: Use simple View-based tables for MVP (limit to 25 rows per section), batch remaining rows or show summary, revisit if users need full detail

4. **RIDDOR status representation in PDF**
   - What we know: RIDDOR status is a requirement (PDF-02), indicates reportable incidents
   - What's unclear: Specific formatting expectations (just a count, or full details of each RIDDOR incident)
   - Recommendation: Show count of RIDDOR-reportable incidents + brief description of each, verify with real HSE audit requirements in pilot

## Sources

### Primary (HIGH confidence)
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) - Official package, version 4.3.2, server-side rendering capabilities
- [React-pdf official documentation](https://react-pdf.org/) - Component API, styling, examples
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) - Deno runtime, V8 isolates, performance characteristics
- [Supabase pg_cron documentation](https://supabase.com/docs/guides/cron) - Scheduling syntax, monitoring, best practices
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) - pg_cron + pg_net integration pattern
- [Supabase Storage Signed URLs](https://supabase.com/docs/guides/storage/buckets/fundamentals) - Private bucket configuration, time-limited access
- [Resend API Reference - Send Email](https://resend.com/docs/api-reference/emails/send-email) - Attachment syntax, size limits (40MB)
- [Resend with Supabase Edge Functions](https://resend.com/docs/send-with-supabase-edge-functions) - Integration pattern

### Secondary (MEDIUM confidence)
- [pdf-lib documentation](https://pdf-lib.js.org/) - Alternative library, lower-level API
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets) - Environment variable management via CLI
- [GitHub: @react-pdf/renderer repository](https://github.com/diegomura/react-pdf) - Issue tracker for known limitations
- [Medium: Using React for Server-Side PDF Report Generation](https://medium.com/@sepehr.sabour/using-react-for-server-side-pdf-report-generation-de594015f19a) - Real-world pattern
- [Daily Site Safety Report Template - HSE Coach](https://thehsecoach.com/daily-site-safety-report-template/) - HSE report format examples
- [Best Practices for Safety Documentation - HSE Network](https://www.hse-network.com/best-practices-for-safety-documentation-management-in-the-workplace/) - Professional report standards

### Tertiary (LOW confidence - WebSearch only, marked for validation)
- [Supabase Discussion: Best practice for PDF generation from Edge Functions](https://github.com/orgs/supabase/discussions/38327) - Community patterns, not official guidance
- [react-pdf-charts GitHub](https://github.com/EvHaus/react-pdf-charts) - Community library, limited maintenance (recharts v3+ not supported)
- [Scalable PDF Generation Architecture - Medium](https://medium.com/@jarsaniatirth/scalable-pdf-generation-architecture-high-level-design-for-enterprise-grade-solutions-f4d99be60d1b) - Enterprise patterns, may be over-engineered for MVP
- [PDF Generators benchmark - hardkoded.com](https://www.hardkoded.com/blogs/pdf-generators-benchmark) - Performance comparisons, but different use case (Puppeteer vs others)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @react-pdf/renderer is verified via official docs, npm package, and Context7 resolution confirmed Deno compatibility
- Architecture: HIGH - Supabase official docs confirm pg_cron + Edge Functions + Storage patterns, Resend integration documented
- Pitfalls: MEDIUM - Memory leaks and performance issues confirmed via GitHub issues, but specific 10-second constraint is project-specific (no public benchmarks)

**Research date:** 2026-02-15
**Valid until:** 2026-03-17 (30 days - stable ecosystem, @react-pdf/renderer has regular updates, Supabase Edge Functions runtime stable)
