# Phase 14: Compliance, Exports & Medic Portal - Research

**Researched:** 2026-02-17
**Domain:** UI completion, data export, compliance alerts — all backed by existing schema
**Confidence:** HIGH (research based on direct file inspection of the actual codebase)

---

## Summary

Phase 14 is primarily a UI-surfacing and wiring phase. All the backend infrastructure (schema, edge functions, storage buckets, cron jobs, API routes) is already built. What is missing in every case is the frontend UI that consumes the existing data.

The five tasks fall into two categories:

**Category A — Wiring existing data to new UI elements (already fully queryable):**
- 14-01: Payslip PDF download — `payslips.pdf_url` already stores a signed URL; the payslip page already has a `handleDownload` function that works. The only gap is that it calls the edge function on demand instead of reading the stored URL first. The download button already exists in the UI.
- 14-03: Cert expiry banners — `medics.certifications` is a JSONB array with `{type, expiry_date, cert_number}` per cert. Queried with `select('*')`. All dates are ISO strings. No new query needed.
- 14-04: IR35 status display — `medics.cest_assessment_result`, `cest_assessment_date`, `employment_status`, `utr`, `umbrella_company_name` are already fetched in `medic/profile/page.tsx` with `select('*')`. The profile page already renders a partial IR35 section (lines 166–183) but does not show `cest_assessment_date` or history.
- 14-05: Contract detail completeness — `contract_versions` and `contract_events` are already fetched in `getContractById()` and passed to `ContractDetail`. The `ContractDetail` component already renders a "Version History" card (lines 398–447) and a "Status Timeline" card (lines 362–396). The milestone payment tracker data is on the contract object itself (`upfront_amount`, `completion_amount`, `net30_amount` and their `*_paid_at` equivalents) and already rendered in "Payment Schedule" (lines 222–311). The main gap is that the milestone tracker in the requirements is an enhanced version of what already exists.

**Category B — Adding export buttons with existing utilities:**
- 14-02: RIDDOR PDF export, timesheet CSV, booking CSV, invoice CSV — `export-pdf.ts` and `export-csv.ts` are established patterns. New functions must be added for each data type. The page components are server/client components and export buttons must be added to match each page's rendering model.

**Primary recommendation:** Treat this phase as four small UI additions and one set of new export functions. The heaviest task is 14-02 (four export functions) but each follows the exact same pattern as existing exports. No new backend work is required.

---

## Standard Stack

### Core (already installed — verified by reading source files)

| Library | Version (from imports) | Purpose | Notes |
|---------|----------------------|---------|-------|
| jsPDF | latest | PDF export via browser | Used in `export-pdf.ts` |
| jspdf-autotable | latest | Table rendering in jsPDF | Used in `export-pdf.ts` |
| react-papaparse | latest | CSV generation with escaping | Used in `export-csv.ts` |
| date-fns | latest | Date formatting | Used throughout |
| @tanstack/react-query | latest | Data fetching hooks | Used in admin pages |
| sonner | latest | Toast notifications | Used in payslip page |
| lucide-react | latest | Icons | Used throughout |

**No new packages need to be installed.** Everything required is already present.

### Supporting (for cert expiry date math)

The cert expiry logic needs only native JS `Date` arithmetic — no additional libraries needed. Use `date-fns` `differenceInDays(expiryDate, new Date())` which is already imported in `export-csv.ts` and `export-pdf.ts`.

---

## Architecture Patterns

### Recommended Project Structure for New Files

```
web/
├── lib/
│   └── utils/
│       ├── export-pdf.ts        # Add: exportRIDDORIncidentsPDF()
│       └── export-csv.ts        # Add: exportTimesheetsCSV(), exportBookingsCSV(), exportInvoicesCSV()
├── app/
│   ├── medic/
│   │   └── profile/
│   │       └── page.tsx         # Modify: add cert banners, enhance IR35 section
│   │   └── payslips/
│   │       └── page.tsx         # Verify: already has download; fix pdf_url logic
│   ├── admin/
│   │   ├── timesheets/
│   │   │   └── page.tsx         # Modify: add export button
│   │   ├── bookings/
│   │   │   └── page.tsx         # Modify: add export button
│   │   └── revenue/
│   │       └── page.tsx         # Modify: add export button
│   └── (dashboard)/
│       ├── riddor/
│       │   └── page.tsx         # Modify: add export button
│       └── contracts/
│           └── [id]/
│               └── page.tsx     # Modify: (ContractDetail already handles this)
```

### Pattern 1: Client-side CSV Export (from existing `export-csv.ts`)

```typescript
// Source: web/lib/utils/export-csv.ts (existing pattern)
export function exportTimesheetsCSV(timesheets: TimesheetWithDetails[]) {
  const csvData = timesheets.map((t) => ({
    'Date': t.booking.shift_date
      ? format(new Date(t.booking.shift_date), 'dd/MM/yyyy')
      : '',
    'Medic': `${t.medic.first_name} ${t.medic.last_name}`,
    'Client': t.booking.client.company_name,
    'Site': t.booking.site_name,
    'Scheduled Hours': t.scheduled_hours,
    'Logged Hours': t.logged_hours,
    'Payout Amount': `£${t.payout_amount.toFixed(2)}`,
    'Status': t.payout_status,
    'Paid At': t.paid_at
      ? format(new Date(t.paid_at), 'dd/MM/yyyy HH:mm')
      : '',
  }));

  const csv = jsonToCSV(csvData);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timesheets-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

**Key invariant:** Always prefix with `'\uFEFF'` BOM for Excel UTF-8 compatibility. Always use `jsonToCSV` from `react-papaparse` — never build CSV strings manually (special characters break without library escaping).

### Pattern 2: Client-side PDF Export (from existing `export-pdf.ts`)

```typescript
// Source: web/lib/utils/export-pdf.ts (existing pattern)
export function exportRIDDORIncidentsPDF(incidents: RIDDORIncident[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RIDDOR Incident Report', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SiteMedic', 14, 22);
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 27);

  const tableData = incidents.map((i) => [
    format(new Date(i.detected_at), 'dd/MM/yyyy'),
    `${i.workers.first_name} ${i.workers.last_name}`,
    i.treatments.injury_type.replace(/-/g, ' '),
    i.treatments.body_part?.replace(/_/g, ' ') || '',
    i.category.replace(/_/g, ' '),
    i.confidence_level,
    i.status,
    format(new Date(i.deadline_date), 'dd/MM/yyyy'),
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Date', 'Worker', 'Injury', 'Body Part', 'Category', 'Confidence', 'Status', 'Deadline']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Generated by SiteMedic Dashboard - Page ${data.pageNumber} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      );
    },
  });

  doc.save(`riddor-incidents-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
```

### Pattern 3: Cert Expiry Banner (pure computation on existing data)

```typescript
// Source: medics.certifications JSONB structure (from migration 002_business_operations.sql line 106)
// certifications: Array of {type: string, expiry_date: string, cert_number: string}

interface Certification {
  type: string;           // 'CSCS', 'CPCS', 'IPAF', 'PASMA', 'Gas Safe'
  expiry_date: string;   // ISO date string 'YYYY-MM-DD'
  cert_number: string;
}

function getExpiringCerts(certifications: Certification[]): {
  critical: Certification[];   // <= 7 days
  warning: Certification[];    // 8–30 days
} {
  const now = new Date();
  const critical: Certification[] = [];
  const warning: Certification[] = [];

  for (const cert of certifications) {
    const expiry = new Date(cert.expiry_date);
    const daysLeft = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 7 && daysLeft >= 0) {
      critical.push(cert);
    } else if (daysLeft <= 30 && daysLeft > 7) {
      warning.push(cert);
    }
  }

  return { critical, warning };
}
```

### Pattern 4: Payslip Download (fix existing logic)

The existing `handleDownload` in `medic/payslips/page.tsx` already calls the edge function. The issue: it calls the edge function every time, even when `pdf_url` is already stored on the `payslips` table. The fix:

1. Extend the Supabase query in `fetchPayslips()` to also join `payslips` and check `payslips.pdf_url`.
2. If `pdf_url` is not null, open it directly — no edge function call needed.
3. If `pdf_url` is null, call edge function (existing path).

**Critical detail:** The payslip download in the current UI uses `timesheets` table (lines 52–63), not the `payslips` table. The `payslips.pdf_url` field and the `payslips.payslip_reference` field are not currently fetched. The join path would be `timesheets -> payslips (via timesheet_id)`. Alternatively, query `payslips` directly for the logged-in medic.

### Pattern 5: Export Button Placement

Each admin page has a different rendering model:

| Page | Rendering | Pattern |
|------|-----------|---------|
| `admin/timesheets/page.tsx` | Server Component, passes `initialTimesheets` to `TimesheetBatchApproval` | Must add export to the client component or add a client wrapper |
| `admin/bookings/page.tsx` | Client Component, `useBookings()` hook | Can add export button directly, data is in scope |
| `admin/revenue/page.tsx` | Client Component, `useRevenue()` hook | Add export button using the bookings raw data from revenue query |
| `riddor/page.tsx` | Client Component, `useQuery` | Add export button, data is in scope |

For server components, the cleanest approach is to pass a download action or make the child component accept an `onExport` prop. The `TimesheetBatchApproval` component will need an `onExport` prop.

### Pattern 6: IR35 History (no table — denormalised on medics)

The `medics` table stores only the current IR35 assessment. There is no `ir35_assessments_history` table. The CONTEXT.md says "last 3 assessment history" but this data does not exist in the schema. Only the current assessment is stored:

- `cest_assessment_result` — current
- `cest_assessment_date` — date of current assessment
- `employment_status` — current

**Resolution:** Display only the current assessment in a structured format. The "last 3 assessments" requirement cannot be met from current schema without a new table. This is a SCOPING decision for the planner. Options:
1. (Recommended) Display only current assessment — already in schema, 0 backend work.
2. Add an `ir35_history` table and populate via trigger on the next `POST /api/medics/ir35-assessment` — requires new migration, out of scope.

### Pattern 7: Contract Detail Completeness (already renders, needs polish)

The `ContractDetail` component at `web/components/contracts/contract-detail.tsx` already:
- Renders "Version History" card (`contract.versions` array — lines 398–447) with version number, generated_at, changes, signed_at, and a Download link to `/api/contracts/${contract.id}/pdf?version=${version.version}`
- Renders "Status Timeline" card (`contract.events` array — lines 362–396) with event type, timestamp, event_data JSON
- Renders "Payment Schedule" card showing upfront/completion/net30 amounts with paid/unpaid state

**Gap 1:** The PDF download links in "Version History" go to `/api/contracts/${contract.id}/pdf?version=N` but this route does not exist in `web/app/api/contracts/**` (the Glob found no `/api/contracts/[id]/pdf` route). These links are dead. The route must be built or the link must point to the `storage_path` via a signed URL.

**Gap 2:** The "Status Timeline" renders raw `JSON.stringify(event.event_data)` which is user-hostile. Should render human-readable strings.

**Gap 3:** The milestone tracker is in "Payment Schedule" but does not explicitly label each milestone as a step with a visual progress indicator — it shows amounts and paid status but not as a numbered tracker.

**Gap 4:** The amendment trail should show actor names, not actor_id UUIDs. `contract_events.actor_id` is a UUID. To show the actor name requires joining with `users` or `auth.users`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Manual string building | `jsonToCSV` from `react-papaparse` | Special chars, commas, quotes break manual CSV |
| PDF table generation | Custom canvas rendering | `jsPDF` + `jspdf-autotable` | Already in codebase, handles pagination, striping |
| Date math (days until expiry) | Manual ms calculation | `date-fns` `differenceInDays()` | Handles DST, leap years correctly |
| Cert expiry data | New API endpoint | Client-side compute on `medics.certifications` JSONB | Data already in medic object from `select('*')` |
| Toast notifications | Custom modal | `sonner` `toast.success/error()` | Already used throughout codebase |
| Payslip PDF generation | New edge function | Reuse `generate-payslip-pdf` edge function | Already works; just fix the URL-check-first logic |
| Signed URL generation | Manual storage path construction | `supabase.storage.from('payslips').createSignedUrl(path, expiry)` | Already pattern in edge function |

---

## Common Pitfalls

### Pitfall 1: Payslip download always hits the edge function

**What goes wrong:** The current `handleDownload` calls `supabase.functions.invoke('generate-payslip-pdf', ...)` every time. This is slow and wasteful when `payslips.pdf_url` is already stored.

**Why it happens:** The page currently queries `timesheets`, not `payslips`. The `pdf_url` column isn't even fetched.

**How to avoid:** Add a join from `timesheets` to `payslips` (via `payslip:payslips!inner(id, pdf_url, payslip_reference)`), or query `payslips` directly for the medic. Check if `pdf_url` is not null and use it directly.

**Warning signs:** A payslip loads fine (PDF URL exists in DB) but the download still takes 3–5 seconds (edge function cold start).

### Pitfall 2: Export buttons on server-rendered admin pages

**What goes wrong:** `admin/timesheets/page.tsx` is a Server Component. Export functions that call `URL.createObjectURL` or `document.createElement('a')` cannot run in server context.

**Why it happens:** The export utilities are purely client-side (they use browser APIs). Adding them directly to a server component causes a build error.

**How to avoid:** The export button must live inside the `TimesheetBatchApproval` client component, or a new `'use client'` wrapper must be added. The server component can pass the data down. For the bookings and revenue pages (already client components), this is not an issue.

### Pitfall 3: IR35 `cest_assessment_result` values don't match requirements

**What goes wrong:** The CONTEXT.md says to show "self_employed / umbrella / inside_ir35" as the IR35 determination. But the schema stores `employment_status` as `'self_employed' | 'umbrella'` and `cest_assessment_result` as a separate field that stores the HMRC CEST tool result (not the employment status). These are different fields.

**Why it happens:** `inside_ir35` is a CEST result value, not an employment_status value. `employment_status` only has `self_employed` and `umbrella`.

**How to avoid:** Display `employment_status` (the primary classification) and `cest_assessment_result` (the HMRC tool result) as two separate fields. Don't conflate them. The profile page already does this correctly at lines 168–183.

### Pitfall 4: Contract PDF download route doesn't exist

**What goes wrong:** `ContractDetail` has download links to `/api/contracts/${contract.id}/pdf?version=N`. This API route does not exist. Clicking the link returns a 404.

**Why it happens:** The route was planned but not implemented. The `contract_versions.storage_path` contains the path in the `contracts` storage bucket (e.g., `contracts/{contractId}/v{version}.pdf`) but there's no serving layer.

**How to avoid:** Task 14-05 must either (a) add an API route `/api/contracts/[id]/pdf/route.ts` that generates a signed URL from the storage_path, or (b) add a client-side action that calls `supabase.storage.from('contracts').createSignedUrl(version.storage_path, 604800)` (7-day expiry, consistent with D-05-02-001). Option (b) is simpler and avoids a new API route.

### Pitfall 5: Signed URL expiry on payslips vs. prior decision

**What goes wrong:** The edge function `generate-payslip-pdf` sets 365-day signed URLs (`31536000` seconds). Prior decision D-05-02-001 says 7-day expiry. There is an inconsistency.

**Why it happens:** The payslip edge function explicitly chose 365-day expiry for payslips (annual record-keeping), overriding the default 7-day pattern.

**How to avoid:** Do not "fix" the payslip expiry to 7 days. 365 days is intentional for payslips. When regenerating a signed URL for a payslip where `pdf_url` has expired, call `createSignedUrl` with `31536000` seconds to match. For contracts, use 7-day signed URLs (D-05-02-001).

### Pitfall 6: RIDDOR export data filtering

**What goes wrong:** The RIDDOR page currently has a status filter. The export button should respect the current filter (export what you see) but the `incidents` array is already filtered by the query. This is fine. Just pass `incidents` (the currently displayed data) to the export function.

**Warning signs:** Exporting all incidents when the user expects to export only the filtered set.

### Pitfall 7: Cert expiry for `null` or `[]` certifications

**What goes wrong:** `medics.certifications` defaults to `'[]'::jsonb` but could theoretically be `null` in edge cases (e.g., older records before the column was added). `jsonb_array_elements(null)` returns nothing from PostgreSQL but in TypeScript, `.forEach` on null throws.

**How to avoid:** Guard: `const certs = medic.certifications || []`. Then compute expiry on `certs`.

### Pitfall 8: Revenue page "invoice history" — no invoices table

**What goes wrong:** The CONTEXT.md says "invoice history (CSV)" should be exported from `admin/revenue/page.tsx`. But the revenue page doesn't use an `invoices` table — it uses `bookings` and `payments`. There is no dedicated `invoices` table in the schema.

**Why it happens:** The revenue data is derived from `bookings` (completed, with `total`, `platform_fee`, `medic_payout`) and `payments` tables.

**How to avoid:** The "invoice history" CSV should export the `bookings` data (completed bookings) with financial columns: date, client, site, total, platform_fee, medic_payout. This is what the revenue page actually displays. The label "invoice history" is aspirational — the data is booking-level revenue records.

---

## Code Examples

### Existing Cert Structure (from migration 002, line 106)

```typescript
// Source: supabase/migrations/002_business_operations.sql
// certifications JSONB DEFAULT '[]'::jsonb -- Array of {type, expiry_date, cert_number}

interface Cert {
  type: string;         // 'CSCS' | 'CPCS' | 'IPAF' | 'PASMA' | 'Gas Safe'
  expiry_date: string;  // 'YYYY-MM-DD' ISO date
  cert_number: string;  // e.g., 'CSCS-1234567'
}

// Renewal URLs (from migration 034_certification_tracking.sql, lines 93–100)
const RENEWAL_URLS: Record<string, string> = {
  'CSCS': 'https://www.cscs.uk.com/apply-for-card/',
  'CPCS': 'https://www.cpcscards.com/renewal',
  'IPAF': 'https://www.ipaf.org/en/training',
  'PASMA': 'https://www.pasma.co.uk/training',
  'Gas Safe': 'https://www.gassaferegister.co.uk/',
};
```

### IR35 Fields on `medics` Table

```typescript
// Source: supabase/migrations/002_business_operations.sql lines 113–119
// Source: web/lib/medics/ir35-validator.ts
interface MedicIR35Fields {
  employment_status: 'self_employed' | 'umbrella';  // REQUIRED, NOT NULL
  utr: string | null;                                // For self_employed
  umbrella_company_name: string | null;              // For umbrella
  cest_assessment_result: string | null;             // HMRC CEST result; can be 'outside_ir35' | 'inside_ir35' | 'unknown'
  cest_assessment_date: string | null;               // ISO date 'YYYY-MM-DD'
  cest_pdf_url: string | null;                       // Stored in Supabase Storage
}
```

### Contract Event Data Structure

```typescript
// Source: web/lib/contracts/types.ts lines 32–41, 213–237
// Source: supabase/migrations/017_contract_management.sql lines 124–141

type ContractEventType =
  | 'status_change'       // event_data: { from: ContractStatus, to: ContractStatus, reason?: string }
  | 'email_sent'          // event_data: { to: string, subject: string, template?: string, delivered?: boolean }
  | 'email_opened'        // event_data: {}
  | 'email_clicked'       // event_data: {}
  | 'signature_captured'  // event_data: { signedByName, signedByEmail, signedByIp, signatureData? }
  | 'payment_captured'    // event_data: { milestone_id, amount, amount_pence, stripe_payment_intent_id, fully_paid }
  | 'version_created'     // event_data: {}
  | 'amendment_created'   // event_data: {}
  | 'terminated';         // event_data: {}

interface ContractEvent {
  id: string;
  contract_id: string;
  event_type: ContractEventType;
  event_data: Record<string, unknown>;
  actor_id: string | null;  // UUID — NOT actor name
  actor_ip: string | null;
  created_at: string;       // ISO timestamp
}
```

### Payslip Storage Path Pattern

```typescript
// Source: supabase/functions/generate-payslip-pdf/index.ts line 120
// Pattern: {medic_id}/{payslip_id}.pdf
// Bucket: 'payslips' (private, 5MB limit)

const fileName = `${payslip.medic_id}/${payslip.id}.pdf`;
// Signed URL: 365 days (31536000 seconds) — intentional, NOT the 7-day default

// If pdf_url is already stored, use it directly:
if (payslip.pdf_url && !isExpired(payslip.pdf_url)) {
  window.open(payslip.pdf_url, '_blank');
} else {
  // Regenerate via edge function or createSignedUrl()
  const { data } = await supabase.storage
    .from('payslips')
    .createSignedUrl(`${medic_id}/${payslip_id}.pdf`, 31536000);
}
```

### Contract Version Storage Path Pattern

```typescript
// Source: supabase/migrations/017_contract_management.sql line 108 (comment)
// Pattern: contracts/{contractId}/v{version}.pdf
// Bucket: 'contracts' (private, 10MB limit, PDF-only)

// To get a signed URL for a specific version:
const { data } = await supabase.storage
  .from('contracts')
  .createSignedUrl(version.storage_path, 604800); // 7 days (D-05-02-001)
```

### RIDDOR Incident Shape (for export)

```typescript
// Source: web/lib/queries/riddor.ts lines 10–54
interface RIDDORIncident {
  id: string;
  category: string;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'draft' | 'submitted' | 'confirmed';
  deadline_date: string;   // ISO date
  detected_at: string;     // ISO timestamp
  f2508_pdf_path: string | null;
  treatments: {
    injury_type: string;     // Use .replace(/-/g, ' ') for display
    body_part: string;       // Use .replace(/_/g, ' ') for display
    severity: string;
    outcome: string;
    reference_number: string;
  };
  workers: {
    first_name: string;
    last_name: string;
    company: string;
    role: string;
  };
}
```

### Timesheets Shape (for export)

```typescript
// Source: web/lib/queries/admin/timesheets.ts lines 20–55
interface TimesheetWithDetails {
  id: string;
  scheduled_hours: number;
  logged_hours: number;
  payout_amount: number;
  payout_status: 'pending' | 'manager_approved' | 'admin_approved' | 'paid' | 'rejected';
  paid_at: string | null;
  booking: {
    site_name: string;
    shift_date: string;
    client: { company_name: string };
  };
  medic: { first_name: string; last_name: string };
}
```

### Bookings Shape (for export)

```typescript
// Source: web/lib/queries/admin/bookings.ts lines 16–69
interface BookingWithRelations {
  id: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  site_name: string;
  site_address: string;
  total: number;
  platform_fee: number;
  medic_payout: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  clients?: { company_name: string };
  medics?: { first_name: string; last_name: string } | null;
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact on Phase 14 |
|--------------|------------------|-------------------|
| Manual PDF generation | jsPDF + jspdf-autotable | Export pattern is established |
| Manual CSV string building | react-papaparse `jsonToCSV` | CSV pattern is established |
| Edge function called on every payslip download | PDF URL stored in `payslips.pdf_url` | Must use stored URL first |
| Certification emails only | Backend cron exists, UI alerts missing | Add UI alerts reading existing JSONB |
| IR35 form only | IR35 form + API + data in DB | Add display reading existing DB columns |

---

## Open Questions

1. **IR35 assessment history (last 3 assessments)**
   - What we know: Only the current assessment is stored on `medics`. There is no history table.
   - What's unclear: Should the planner scope this to "current assessment only" or add a new `ir35_history` table?
   - Recommendation: Scope to current assessment only for Phase 14. Document that a history table is a future enhancement. The CONTEXT.md success criterion (item 4) only asks for "Self-employed — last assessed 2026-01-15" which is satisfiable from the current schema.

2. **Contract PDF download route (`/api/contracts/[id]/pdf?version=N`)**
   - What we know: The link exists in `ContractDetail` but the API route is missing.
   - What's unclear: Should the task add an API route or generate signed URLs client-side?
   - Recommendation: Client-side signed URL generation is simpler. In `ContractDetail`, replace the `<a href={pdfUrl}>` approach with a button that calls `supabase.storage.from('contracts').createSignedUrl(version.storage_path, 604800)`. This avoids a new API route entirely.

3. **Actor name in contract event trail**
   - What we know: `contract_events.actor_id` is a UUID. The `ContractDetail` currently renders it as-is.
   - What's unclear: Should actor names be fetched (requires a users join) or can we display "System" / "Admin" generically?
   - Recommendation: Fetch actor profile at query time by extending `getContractById()` to include `actor:auth.users(email)` for events. Or use "Admin" for non-null actor_id and "System" for null. The simpler path is the generic label.

4. **Invoice CSV data source**
   - What we know: There is no `invoices` table. The revenue page is built on `bookings` + `payments`.
   - What's unclear: The CONTEXT.md calls it "invoice history (CSV)" but this is really "completed booking revenue records".
   - Recommendation: Export completed bookings from `revenue.ts` as the "invoice history" CSV. Columns: Date, Client, Site, Subtotal, VAT, Total, Platform Fee, Medic Payout, Status.

5. **Does `pdf_url` expire on existing payslips?**
   - What we know: Signed URLs in Supabase have a configurable expiry. The payslip edge function stores 365-day URLs.
   - What's unclear: Payslips created before migration 032 may not have `pdf_url` populated at all (the column was added by 032 with a trigger for new inserts).
   - Recommendation: When `pdf_url` is null (older payslips), fall through to the edge function call. When `pdf_url` is present, attempt to use it. If the URL is expired (HTTP 400 from Supabase CDN), fall through to edge function. Implementing the expiry check exactly requires parsing the URL's query params; simpler to just try the URL and catch errors.

---

## Sources

### Primary (HIGH confidence — direct file inspection)

- `web/lib/utils/export-pdf.ts` — Full PDF export pattern
- `web/lib/utils/export-csv.ts` — Full CSV export pattern
- `web/app/medic/payslips/page.tsx` — Payslip download existing state
- `web/app/medic/profile/page.tsx` — Medic profile existing state including IR35 section
- `web/app/api/medics/ir35-assessment/route.ts` — IR35 API handler (POST only, stores to medics table)
- `web/lib/medics/ir35-validator.ts` — IR35 field types and validation
- `supabase/migrations/002_business_operations.sql` — medics table schema (certifications JSONB, employment_status, IR35 fields)
- `supabase/migrations/017_contract_management.sql` — contracts, contract_versions, contract_events tables
- `supabase/migrations/024_payslip_generation.sql` — payslips table schema
- `supabase/migrations/032_payslip_schema_fix.sql` — payslip_reference column, PDF trigger
- `supabase/migrations/034_certification_tracking.sql` — certification JSONB structure, GIN index, RPC functions
- `supabase/functions/generate-payslip-pdf/index.ts` — Edge function: storage path pattern, signed URL expiry
- `web/components/contracts/contract-detail.tsx` — Existing contract UI (versions + events already rendered)
- `web/lib/contracts/queries.ts` — How versions and events are fetched (already in getContractById)
- `web/lib/contracts/types.ts` — ContractEventType union and ContractEvent interface
- `web/lib/queries/admin/timesheets.ts` — TimesheetWithDetails shape
- `web/lib/queries/admin/bookings.ts` — BookingWithRelations shape
- `web/lib/queries/riddor.ts` — RIDDORIncident shape and fetchRIDDORIncidents function
- `web/app/api/contracts/**` (Glob) — Confirmed no `/[id]/pdf` route exists

### Secondary (MEDIUM confidence)

- Prior plan decisions (D-05-02-001, D-06.5-04-006, etc.) from CONTEXT.md — confirmed consistent with code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed present in source imports
- Current state of each page: HIGH — read each page directly
- Schema structure: HIGH — read migrations directly
- Architecture patterns: HIGH — derived from existing production code
- IR35 history scope: MEDIUM — based on schema analysis; planner should decide scope
- Contract PDF route gap: HIGH — confirmed missing via Glob

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase; UI-only phase with no new migrations)

---

## Wave Structure Recommendation

Based on task dependencies and parallelism opportunities:

**Wave 1 — No dependencies, pure UI additions (can run in parallel):**
- 14-01: Payslip download fix (modify medic/payslips/page.tsx — standalone)
- 14-03: Cert expiry banners (modify medic/profile/page.tsx — standalone)
- 14-04: IR35 status display (modify medic/profile/page.tsx — coordinate with 14-03 since same file)

**Wave 2 — Depends on new utility functions:**
- 14-02: Export buttons (add 4 new functions to export-pdf.ts + export-csv.ts, then modify 4 pages)

**Wave 3 — Most complex, depends on understanding contract PDF route gap:**
- 14-05: Contract completeness (modify ContractDetail + decide PDF route vs client-side signed URL)

**Internal dependency within 14-03 and 14-04:** Both touch `web/app/medic/profile/page.tsx`. Should be a single task or sequential (14-03 then 14-04 or merged into one task).

**Internal dependency within 14-02:** All four export functions can be written together in one PR since they're all additions to the same two utility files.
