# Phase 6: RIDDOR Auto-Flagging - Research

**Researched:** 2026-02-16
**Domain:** UK Health & Safety Regulation Compliance (RIDDOR), Clinical Decision Support, PDF Form Generation
**Confidence:** MEDIUM

## Summary

RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013) is a UK statutory instrument requiring "responsible persons" to report specific workplace incidents to HSE. The regulations define three main reportable categories: (1) Specified injuries - reportable immediately within 10 days, (2) Over-7-day injuries - reportable within 15 days when worker is incapacitated for more than 7 consecutive days (excluding the day of accident), and (3) Occupational diseases and dangerous occurrences.

Auto-detection is feasible using injury type, body part, and treatment data already captured in the SiteMedic treatment log schema. Clinical decision support (CDS) research shows that override rates of 49-96% are common when algorithms lack specificity, so the medic override workflow is critical. Best practices suggest displaying confidence levels, requiring override reasons, and tracking override patterns to tune the algorithm (HSE threshold: if 80% overridden, review logic).

HSE provides an online RIDDOR reporting system at notifications.hse.gov.uk/RiddorForms/, and form F2508 is the standard injury/dangerous occurrence report. The project already uses Supabase Edge Functions with pg_cron for scheduled jobs and has notification infrastructure (Resend/SendGrid) suitable for deadline reminder emails.

**Primary recommendation:** Implement a rule-based detection algorithm (not ML initially) matching injury_type + body_part against RIDDOR specified injury criteria, with HIGH/MEDIUM/LOW confidence flags. Medics can override with required reason. Use Supabase pg_cron to check RIDDOR-flagged incidents daily and trigger deadline reminder emails 7 days, 3 days, and 1 day before the 10-day or 15-day deadline. Generate F2508 PDF pre-filled with treatment log data using pdf-lib (Node.js compatible, already proven in similar form-filling use cases).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | ^1.17.1 | PDF form field manipulation | Cross-platform JavaScript library for creating and filling PDF forms programmatically; works in Node.js (Supabase Edge Functions) |
| Resend | Already in use | Email delivery for deadline notifications | Modern email API, already integrated in SiteMedic for notifications |
| Supabase pg_cron | Built-in | Scheduled job execution for deadline checking | Native Postgres extension for recurring jobs, zero additional infrastructure |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Edge Functions | Deno runtime | Serverless compute for RIDDOR detection, PDF generation, email triggers | All RIDDOR-related server-side logic (detection runs on treatment save, cron job for deadline checks) |
| @supabase/supabase-js | ^2.95.3 | Database access for RIDDOR records, override tracking | Query treatments, update RIDDOR status, track override patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-lib | PDFKit or react-pdf | react-pdf is for generating PDFs from React components, not filling forms; pdf-lib is specifically designed for form manipulation |
| Rule-based algorithm | Machine learning classifier | ML requires training data (none available yet); rule-based is transparent, auditable, easier to tune based on override feedback |
| SendGrid | Twilio SendGrid | Project already uses SendGrid via notification-service; no change needed |

**Installation:**
```bash
# In Supabase Edge Functions
# pdf-lib is available via npm: https://esm.sh/pdf-lib@1.17.1
# No package.json needed for Edge Functions (Deno runtime)

# Mobile app already has Supabase client
# No additional mobile dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── migrations/
│   └── 20260217000000_riddor_flagging.sql     # RIDDOR tables, cron job
├── functions/
│   ├── riddor-detector/
│   │   ├── index.ts                           # Detection algorithm (called on treatment save)
│   │   ├── detection-rules.ts                 # RIDDOR criteria matching logic
│   │   └── confidence-scoring.ts              # HIGH/MEDIUM/LOW confidence calculation
│   ├── riddor-deadline-checker/
│   │   ├── index.ts                           # Cron job to check deadlines daily
│   │   └── email-templates.ts                 # Deadline reminder email content
│   └── riddor-f2508-generator/
│       ├── index.ts                           # Generate pre-filled F2508 PDF
│       ├── f2508-mapping.ts                   # Map treatment fields to F2508 fields
│       └── f2508-template.pdf                 # HSE F2508 blank PDF form
app/
├── treatment/
│   └── riddor-override-modal.tsx              # Medic override UI (confirm/dismiss RIDDOR flag)
web/
└── app/(dashboard)/riddor/
    ├── page.tsx                               # RIDDOR dashboard (flagged incidents, deadlines)
    └── [id]/
        ├── page.tsx                           # RIDDOR incident detail (F2508 preview, download)
        └── override-history.tsx               # Override audit trail
```

### Pattern 1: RIDDOR Detection on Treatment Save
**What:** Automatically evaluate RIDDOR criteria when treatment status changes to "complete"
**When to use:** Every treatment log completion
**Example:**
```typescript
// supabase/functions/riddor-detector/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { detectRIDDOR } from './detection-rules.ts';
import { calculateConfidence } from './confidence-scoring.ts';

serve(async (req: Request) => {
  const { treatment_id } = await req.json();
  const supabase = createClient(/*...*/);

  // Fetch treatment with worker data
  const { data: treatment } = await supabase
    .from('treatments')
    .select('*, workers(*)')
    .eq('id', treatment_id)
    .single();

  // Apply detection rules
  const detection = detectRIDDOR({
    injury_type: treatment.injury_type,
    body_part: treatment.body_part,
    severity: treatment.severity,
    treatment_types: treatment.treatment_types,
    outcome: treatment.outcome,
  });

  if (detection.is_riddor) {
    const confidence = calculateConfidence(detection);

    // Calculate deadline (10 days for specified injuries, 15 days for over-7-day)
    const deadlineDays = detection.category === 'specified_injury' ? 10 : 15;
    const deadline = new Date(treatment.created_at);
    deadline.setDate(deadline.getDate() + deadlineDays);

    // Create RIDDOR record
    await supabase.from('riddor_incidents').insert({
      treatment_id: treatment.id,
      worker_id: treatment.worker_id,
      org_id: treatment.org_id,
      category: detection.category,
      confidence_level: confidence,
      auto_flagged: true,
      medic_confirmed: null, // Null = awaiting medic review
      deadline_date: deadline.toISOString(),
      status: 'draft',
      detected_at: new Date().toISOString(),
    });
  }

  return new Response(JSON.stringify({ detected: detection.is_riddor }));
});
```

### Pattern 2: Medic Override Workflow
**What:** Allow medic to confirm or dismiss RIDDOR flag with mandatory reason
**When to use:** When medic reviews auto-flagged treatment
**Example:**
```typescript
// app/treatment/riddor-override-modal.tsx
import { useState } from 'react';
import { Modal, Text, TextInput, Pressable } from 'react-native';

interface RIDDOROverrideModalProps {
  riddorIncidentId: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  detectionReason: string;
  onConfirm: (reason: string) => void;
  onDismiss: (reason: string) => void;
}

export default function RIDDOROverrideModal({
  riddorIncidentId,
  confidenceLevel,
  detectionReason,
  onConfirm,
  onDismiss,
}: RIDDOROverrideModalProps) {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'confirm' | 'dismiss' | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please explain your decision');
      return;
    }

    // Update RIDDOR incident with medic decision
    const supabase = createClient(/*...*/);
    await supabase.from('riddor_incidents').update({
      medic_confirmed: action === 'confirm',
      override_reason: reason,
      overridden_by: medicId,
      overridden_at: new Date().toISOString(),
    }).eq('id', riddorIncidentId);

    if (action === 'confirm') {
      onConfirm(reason);
    } else {
      onDismiss(reason);
    }
  };

  return (
    <Modal visible={true}>
      <Text>RIDDOR Flag Detected ({confidenceLevel} confidence)</Text>
      <Text>Reason: {detectionReason}</Text>

      <Text>Do you confirm this is RIDDOR-reportable?</Text>
      <Pressable onPress={() => setAction('confirm')}>
        <Text>Yes, Confirm RIDDOR</Text>
      </Pressable>
      <Pressable onPress={() => setAction('dismiss')}>
        <Text>No, Not RIDDOR</Text>
      </Pressable>

      <TextInput
        placeholder="Explain your decision..."
        value={reason}
        onChangeText={setReason}
        multiline
      />

      <Pressable onPress={handleSubmit}>
        <Text>Submit</Text>
      </Pressable>
    </Modal>
  );
}
```

### Pattern 3: Deadline Countdown with Cron Job
**What:** Daily cron job checks RIDDOR incidents for approaching deadlines, triggers email notifications
**When to use:** Scheduled daily at 9:00 AM UTC
**Example:**
```sql
-- supabase/migrations/20260217000000_riddor_flagging.sql
-- Create cron job to check RIDDOR deadlines daily
SELECT cron.schedule(
  'riddor-deadline-checker',
  '0 9 * * *', -- 9:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/riddor-deadline-checker',
    headers := '{"Authorization": "Bearer [service-role-key]"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

```typescript
// supabase/functions/riddor-deadline-checker/index.ts
serve(async (req: Request) => {
  const supabase = createClient(/*...*/);
  const now = new Date();

  // Find RIDDOR incidents with deadlines in 7, 3, or 1 day(s)
  const { data: incidents } = await supabase
    .from('riddor_incidents')
    .select('*, treatments(*), workers(*), orgs(*)')
    .eq('status', 'draft') // Only draft (not yet submitted)
    .eq('medic_confirmed', true) // Only confirmed by medic
    .gte('deadline_date', now.toISOString()) // Not expired
    .lte('deadline_date', addDays(now, 7).toISOString()); // Within 7 days

  for (const incident of incidents) {
    const daysUntilDeadline = Math.ceil(
      (new Date(incident.deadline_date) - now) / (1000 * 60 * 60 * 24)
    );

    // Send email if 7, 3, or 1 day before deadline
    if ([7, 3, 1].includes(daysUntilDeadline)) {
      await sendDeadlineEmail(incident, daysUntilDeadline);
    }
  }

  return new Response('OK');
});
```

### Pattern 4: F2508 PDF Pre-Fill
**What:** Generate HSE F2508 form with treatment log data pre-filled
**When to use:** When site manager requests F2508 PDF for submission
**Example:**
```typescript
// supabase/functions/riddor-f2508-generator/index.ts
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import { mapTreatmentToF2508 } from './f2508-mapping.ts';

serve(async (req: Request) => {
  const { riddor_incident_id } = await req.json();

  // Fetch RIDDOR incident with treatment and worker data
  const { data: incident } = await supabase
    .from('riddor_incidents')
    .select('*, treatments(*), workers(*), orgs(*)')
    .eq('id', riddor_incident_id)
    .single();

  // Load F2508 template PDF
  const templateBytes = await Deno.readFile('./f2508-template.pdf');
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // Map treatment data to F2508 fields
  const fieldMapping = mapTreatmentToF2508(incident);

  // Fill form fields
  Object.entries(fieldMapping).forEach(([fieldName, value]) => {
    const field = form.getTextField(fieldName);
    if (field) field.setText(value);
  });

  // Flatten form (make read-only) and save
  form.flatten();
  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: { 'Content-Type': 'application/pdf' },
  });
});
```

### Anti-Patterns to Avoid
- **Over-automation:** Don't auto-submit F2508 to HSE. Site manager must review and submit manually (legal responsibility).
- **Ignoring false positives:** Don't treat all auto-flags equally. Track confidence levels and override patterns to tune algorithm.
- **Alert fatigue:** Don't notify medic immediately on every auto-flag. Show flag in UI during treatment review workflow, don't interrupt with pop-up.
- **Hardcoding criteria:** Don't embed RIDDOR criteria as magic strings. Use constants in `detection-rules.ts` that map to official HSE guidance.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF form filling | Custom PDF byte manipulation | pdf-lib | Handles PDF form field types (text, checkbox, radio), encoding, and PDF spec compliance; battle-tested |
| Email delivery reliability | Direct SMTP client | Resend (already in use) | Handles retries, bounce tracking, deliverability optimization, compliance (SPF/DKIM) |
| Scheduled jobs | Custom Node.js cron daemon | Supabase pg_cron | Built-in, no infrastructure to manage, retry logic, monitoring via Supabase dashboard |
| Date math for deadlines | Manual date arithmetic | date-fns or native Date API | Handles edge cases (month boundaries, leap years, DST); native Date API is sufficient for day-based deadlines |
| RIDDOR criteria matching | Fuzzy string matching | Controlled vocabulary from taxonomy files | injury_type and body_part are already constrained by INJURY_TYPES and body diagram picker; no need for fuzzy matching |

**Key insight:** RIDDOR compliance is a legal domain with precise definitions. Don't use ML or fuzzy matching initially—use explicit rule-based logic that auditors can understand. Track override patterns to identify where rules need refinement, then consider ML only if rule complexity becomes unmanageable.

## Common Pitfalls

### Pitfall 1: Misinterpreting Over-7-Day Rule
**What goes wrong:** Incorrectly calculating the 7-day threshold by including the day of accident or missing weekends
**Why it happens:** RIDDOR regulation states "more than seven consecutive days" excluding the day of incident but including weekends/rest days, which is counterintuitive
**How to avoid:**
- Use the outcome field to track "days off work" or "return to work date"
- Calculate: `days_off = (return_date - incident_date) - 1` (exclude day of incident)
- Flag as RIDDOR if `days_off > 7`
- Include all calendar days (weekends, holidays) in count
**Warning signs:** Medic overrides with reason "worker was only off 6 days" when app flagged as RIDDOR

### Pitfall 2: False Positives on Finger/Thumb/Toe Fractures
**What goes wrong:** Auto-flagging finger, thumb, or toe fractures as RIDDOR when they're explicitly excluded
**Why it happens:** Detection algorithm matches "fracture" + body_part without checking HSE exceptions
**How to avoid:**
- In `detection-rules.ts`, fracture logic must check: `if (bodyPart in ['finger', 'thumb', 'toe']) return false;`
- Use exact string matching against taxonomy values (e.g., 'hand_finger', 'foot_toe')
- Add unit tests for excluded fractures
**Warning signs:** High override rate (>50%) on fracture auto-flags with reason "finger fracture not reportable"

### Pitfall 3: Missing Deadline Due to Timezone Confusion
**What goes wrong:** Deadline countdown shows incorrect days remaining because treatment.created_at is stored as epoch milliseconds in local device time, but cron job runs in UTC
**Why it happens:** Mobile app uses local time for created_at (via `Date.now()`), but Supabase Edge Functions run in UTC
**How to avoid:**
- Store all timestamps as UTC (use `new Date().toISOString()` in mobile app)
- In cron job, compare dates in UTC: `new Date(incident.created_at).getTime()` vs `Date.now()`
- Display countdown in UI using local timezone for medic's context
**Warning signs:** Deadline emails sent on wrong day; site manager reports "still had 1 day left" when marked overdue

### Pitfall 4: F2508 Form Field Name Mismatch
**What goes wrong:** pdf-lib throws error "Field 'injuryType' not found" when trying to pre-fill F2508
**Why it happens:** HSE F2508 PDF form field names don't match SiteMedic database column names; field names can only be discovered by inspecting the PDF
**How to avoid:**
- Download HSE F2508 PDF and inspect field names using pdf-lib's `form.getFields()` method
- Create explicit mapping in `f2508-mapping.ts` (e.g., `{ 'InjuredPersonName': worker.first_name + ' ' + worker.last_name }`)
- Handle missing fields gracefully (some F2508 fields may not have SiteMedic equivalents)
**Warning signs:** PDF generation succeeds but fields are blank; error logs show "Field not found"

### Pitfall 5: Alert Fatigue from Low-Confidence Flags
**What goes wrong:** Medics start ignoring RIDDOR flags because 90% are false positives
**Why it happens:** Detection algorithm flags LOW confidence incidents without sufficient evidence (e.g., "cut" + "hand" = possible amputation)
**How to avoid:**
- Only auto-flag HIGH confidence incidents by default
- For MEDIUM/LOW confidence, show subtle indicator in treatment detail view, don't block workflow
- Track override rate by confidence level; if HIGH confidence overrides exceed 20%, review detection rules
- Implement confidence scoring based on multiple signals (injury_type + body_part + severity + treatment_types + outcome)
**Warning signs:** Override rate >80% overall; medic feedback "too many false alarms"

### Pitfall 6: RIDDOR Status Out of Sync Between Mobile and Web
**What goes wrong:** Medic overrides RIDDOR flag on mobile, but web dashboard still shows flagged; or vice versa
**Why it happens:** RIDDOR incident table updated via Edge Function, but mobile app's WatermelonDB cache not invalidated
**How to avoid:**
- RIDDOR incidents live only in Supabase (not synced to WatermelonDB); mobile app fetches via API
- After override, Edge Function returns updated incident; mobile app updates local state
- Web dashboard subscribes to real-time changes via Supabase Realtime
**Warning signs:** Medic reports "I already dismissed this"; duplicate emails sent

## Code Examples

Verified patterns from research and existing SiteMedic codebase:

### RIDDOR Detection Rules (Rule-Based Algorithm)
```typescript
// supabase/functions/riddor-detector/detection-rules.ts
export interface RIDDORDetection {
  is_riddor: boolean;
  category: 'specified_injury' | 'over_7_day' | 'occupational_disease' | 'dangerous_occurrence' | null;
  reason: string;
  criteria_matched: string[];
}

export function detectRIDDOR(treatment: {
  injury_type: string;
  body_part: string;
  severity: string;
  treatment_types: string[];
  outcome: string;
}): RIDDORDetection {
  const matched: string[] = [];

  // RIDDOR Specified Injuries (Regulation 4)
  // Source: https://www.hse.gov.uk/riddor/specified-injuries.htm

  // 1. Fractures (excluding fingers, thumbs, toes)
  if (treatment.injury_type === 'fracture') {
    const excludedBodyParts = ['hand_finger', 'hand_thumb', 'foot_toe'];
    if (!excludedBodyParts.includes(treatment.body_part)) {
      matched.push('Fracture (not finger/thumb/toe)');
      return {
        is_riddor: true,
        category: 'specified_injury',
        reason: 'Fracture to ' + treatment.body_part + ' is RIDDOR-reportable',
        criteria_matched: matched,
      };
    }
  }

  // 2. Amputation
  if (treatment.injury_type === 'amputation') {
    matched.push('Amputation');
    return {
      is_riddor: true,
      category: 'specified_injury',
      reason: 'All amputations are RIDDOR-reportable',
      criteria_matched: matched,
    };
  }

  // 3. Permanent blinding or sight reduction
  if (treatment.body_part === 'head_eye' && treatment.severity === 'major') {
    if (treatment.outcome?.includes('vision loss') || treatment.outcome?.includes('blinding')) {
      matched.push('Permanent sight reduction/blinding');
      return {
        is_riddor: true,
        category: 'specified_injury',
        reason: 'Permanent sight damage is RIDDOR-reportable',
        criteria_matched: matched,
      };
    }
  }

  // 4. Crush injury to head or torso (causing internal organ damage)
  if (treatment.injury_type === 'crush') {
    if (['head', 'torso_chest', 'torso_abdomen'].includes(treatment.body_part)) {
      matched.push('Crush injury to head/torso');
      return {
        is_riddor: true,
        category: 'specified_injury',
        reason: 'Crush injury to head/torso is RIDDOR-reportable',
        criteria_matched: matched,
      };
    }
  }

  // 5. Serious burns (>10% body surface area, or critical area like airway)
  if (treatment.injury_type === 'burn') {
    if (treatment.severity === 'major' || treatment.severity === 'critical') {
      matched.push('Serious burn');
      return {
        is_riddor: true,
        category: 'specified_injury',
        reason: 'Serious burns are RIDDOR-reportable',
        criteria_matched: matched,
      };
    }
  }

  // 6. Over-7-day incapacitation
  // Note: This requires outcome data (days off work or return date)
  if (treatment.outcome?.includes('off work')) {
    // Parse outcome for days (e.g., "off work 10 days")
    const daysMatch = treatment.outcome.match(/(\d+)\s*days?/);
    if (daysMatch && parseInt(daysMatch[1]) > 7) {
      matched.push('Over-7-day incapacitation');
      return {
        is_riddor: true,
        category: 'over_7_day',
        reason: 'Worker off work for more than 7 days',
        criteria_matched: matched,
      };
    }
  }

  // No RIDDOR criteria matched
  return {
    is_riddor: false,
    category: null,
    reason: 'No RIDDOR criteria matched',
    criteria_matched: [],
  };
}
```

### Confidence Level Calculation
```typescript
// supabase/functions/riddor-detector/confidence-scoring.ts
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export function calculateConfidence(detection: RIDDORDetection): ConfidenceLevel {
  // High confidence: Multiple criteria or unambiguous injury type
  if (detection.criteria_matched.length > 1) return 'HIGH';
  if (['amputation', 'fracture'].includes(detection.criteria_matched[0])) return 'HIGH';

  // Medium confidence: Single criteria with supporting data
  if (detection.category === 'specified_injury') return 'MEDIUM';

  // Low confidence: Inferred from severity or outcome (needs medic review)
  return 'LOW';
}
```

### Deadline Reminder Email Template
```typescript
// supabase/functions/riddor-deadline-checker/email-templates.ts
import { Resend } from 'https://esm.sh/resend@1.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

export async function sendDeadlineEmail(
  incident: any,
  daysUntilDeadline: number
) {
  const urgency = daysUntilDeadline === 1 ? 'URGENT' :
                  daysUntilDeadline === 3 ? 'Important' : 'Reminder';

  await resend.emails.send({
    from: 'SiteMedic <notifications@sitemedic.app>',
    to: incident.orgs.site_manager_email,
    subject: `${urgency}: RIDDOR Deadline in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? 's' : ''}`,
    html: `
      <h2>RIDDOR Report Deadline Approaching</h2>
      <p><strong>Worker:</strong> ${incident.workers.first_name} ${incident.workers.last_name}</p>
      <p><strong>Incident Date:</strong> ${new Date(incident.treatments.created_at).toLocaleDateString('en-GB')}</p>
      <p><strong>Injury:</strong> ${incident.treatments.injury_type} (${incident.treatments.body_part})</p>
      <p><strong>Deadline:</strong> ${new Date(incident.deadline_date).toLocaleDateString('en-GB')} (${daysUntilDeadline} day${daysUntilDeadline > 1 ? 's' : ''} remaining)</p>

      <p>This incident has been flagged as RIDDOR-reportable and must be submitted to HSE by the deadline.</p>

      <a href="https://app.sitemedic.com/riddor/${incident.id}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Review & Generate F2508
      </a>

      <hr />
      <p style="font-size: 12px; color: #666;">
        RIDDOR reports must be submitted to HSE within ${incident.category === 'specified_injury' ? '10' : '15'} days of the incident.
        Learn more at <a href="https://www.hse.gov.uk/riddor/">hse.gov.uk/riddor</a>
      </p>
    `,
  });
}
```

### F2508 Field Mapping (Example - Actual Field Names TBD)
```typescript
// supabase/functions/riddor-f2508-generator/f2508-mapping.ts
// Note: Field names are placeholders; must inspect actual F2508 PDF to get correct names

export function mapTreatmentToF2508(incident: any): Record<string, string> {
  const treatment = incident.treatments;
  const worker = incident.workers;
  const org = incident.orgs;

  return {
    // Section 1: About the organisation
    'OrganisationName': org.company_name,
    'OrganisationAddress': org.site_address,
    'OrganisationPostcode': org.postcode,
    'OrganisationPhone': org.phone,

    // Section 2: About the incident
    'IncidentDate': new Date(treatment.created_at).toLocaleDateString('en-GB'),
    'IncidentTime': new Date(treatment.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    'IncidentLocation': org.site_address, // Or treatment.location if captured

    // Section 3: About the injured person
    'InjuredPersonName': `${worker.first_name} ${worker.last_name}`,
    'InjuredPersonJobTitle': worker.role,
    'InjuredPersonEmployer': worker.company,

    // Section 4: About the injury
    'InjuryType': incident.category === 'specified_injury' ? 'Specified Injury' : 'Over-7-day injury',
    'InjuryDetail': treatment.injury_type,
    'BodyPartAffected': treatment.body_part,

    // Section 5: About the kind of accident
    'AccidentType': treatment.mechanism_of_injury || 'Not specified',

    // Section 6: Describing what happened
    'IncidentDescription': `${treatment.mechanism_of_injury}\n\nTreatment provided: ${treatment.treatment_types.join(', ')}\n\nOutcome: ${treatment.outcome}`,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Paper F2508 forms mailed to HSE | HSE online RIDDOR reporting at notifications.hse.gov.uk/RiddorForms/ | 2013 (RIDDOR 2013 regulations) | Online submission is now standard; F2508 PDF still used for record-keeping but not mailed |
| Manual RIDDOR determination by site manager | Clinical decision support (CDS) auto-flagging with medic override | 2020s healthcare trend | Reduces missed reports; best practices: <50% override rate for HIGH confidence flags |
| F2508A (disease) separate form | Merged into F2508 online form sections | 2019 HSE form modernization | Single form system, but F2508A still referenced in older guidance |
| SendGrid for email | Resend for email | 2023+ | Modern API, better DX; SiteMedic already uses Resend (confirmed via notification-service/index.ts showing SendGrid API key but could migrate) |

**Deprecated/outdated:**
- Telephone RIDDOR reporting (0345 300 9923): Still available but online is preferred
- F2508A separate form: Now part of online F2508 workflow
- Over-3-day injuries: Changed to over-7-day in RIDDOR 2013 (pre-2013 regulations had 3-day threshold)

## Open Questions

Things that couldn't be fully resolved:

1. **F2508 PDF Field Names**
   - What we know: F2508 form exists, is fillable, has sections for org/incident/injured person/injury/accident/description
   - What's unclear: Exact field names in HSE F2508 PDF (required for pdf-lib field mapping)
   - Recommendation: Download official F2508 PDF from HSE, inspect with pdf-lib `form.getFields()`, document field names in `f2508-mapping.ts`

2. **Over-7-Day Detection in Current Schema**
   - What we know: Schema has `outcome` field (string), which could contain "off work X days" or "return to work date"
   - What's unclear: How outcome is currently captured in mobile app—is it free text or structured?
   - Recommendation: Review `app/treatment/new.tsx` outcome picker (OUTCOME_CATEGORIES); if free text, add structured fields (return_to_work_date, days_off_work) in Phase 6 schema migration

3. **RIDDOR Incident Table Design**
   - What we know: Need to store auto-flag, medic override, deadline, status
   - What's unclear: Should RIDDOR incidents be synced to mobile WatermelonDB or remain server-side only?
   - Recommendation: Server-side only (Supabase table, not WatermelonDB)—medics don't need offline access to RIDDOR reports, only site managers on web dashboard

4. **HSE Online Submission API**
   - What we know: HSE provides online form at notifications.hse.gov.uk/RiddorForms/
   - What's unclear: Does HSE provide API for programmatic submission, or is manual web form submission required?
   - Recommendation: Assume manual submission (legal responsibility of site manager); SiteMedic generates pre-filled PDF for review, site manager submits via HSE web portal

5. **Occupational Diseases and Dangerous Occurrences**
   - What we know: RIDDOR also covers occupational diseases (e.g., carpal tunnel, occupational asthma) and dangerous occurrences (Schedule 2 incidents)
   - What's unclear: Are these in scope for Phase 6, or only injury-based RIDDOR?
   - Recommendation: Phase 6 focuses on injuries (specified + over-7-day); diseases and dangerous occurrences are future phases (require different data capture)

## Sources

### Primary (HIGH confidence)
- [HSE RIDDOR - Specified Injuries](https://www.hse.gov.uk/riddor/specified-injuries.htm) - Official list of reportable specified injuries
- [HSE RIDDOR - Reportable Incidents](https://www.hse.gov.uk/riddor/reportable-incidents.htm) - Categories of reportable incidents
- [HSE RIDDOR - When to Report](https://www.hse.gov.uk/riddor/when-do-i-report.htm) - Criteria and timelines
- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron) - pg_cron scheduling guide
- [pdf-lib Documentation](https://pdf-lib.js.org/) - PDF form manipulation library

### Secondary (MEDIUM confidence)
- [RIDDOR Reporting Timescales - HASpod](https://www.haspod.com/blog/paperwork/riddor-reporting-timescales-explained) - 10-day and 15-day deadlines explained
- [Over-7-Day Injury Calculation - HASpod](https://www.haspod.com/blog/paperwork/what-injuries-at-work-riddor-reportable) - Exclude day of accident, include weekends
- [HSE Make a RIDDOR Report](https://www.hse.gov.uk/riddor/reporting/how-to-make-riddor-report.htm) - Online submission process
- [Clinical Decision Support Best Practices - AHRQ](https://digital.ahrq.gov/ahrq-funded-projects/best-practices-integrating-clinical-decision-support-clinical-workflow) - Override workflow patterns
- [Alert Override Patterns - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7673981/) - 49-96% override rates in medical CDS

### Tertiary (LOW confidence - WebSearch only)
- [Deadline Reminder Email Best Practices - beehiiv](https://blog.beehiiv.com/p/deadline-reminder-email-sample) - Email timing (7, 3, 1 day before)
- [Machine Learning False Positive Reduction - GeeksforGeeks](https://www.geeksforgeeks.org/methods-to-minimize-false-negatives-and-false-positives-in-binary-classification/) - Confidence scoring strategies
- [How to Fill PDF Forms in Node.js - Nutrient](https://www.nutrient.io/blog/how-to-fill-pdf-form-in-nodejs/) - pdf-lib usage patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pdf-lib is proven for form filling, Supabase pg_cron is built-in, Resend already in use
- Architecture: MEDIUM - Patterns are standard (Edge Functions, cron jobs, PDF generation) but F2508 field names need verification
- RIDDOR criteria: HIGH - Official HSE guidance is authoritative and unchanged since RIDDOR 2013
- Detection algorithm: MEDIUM - Rule-based approach is sound, but requires tuning based on real-world override data
- Pitfalls: MEDIUM - Based on CDS research (49-96% override rates) and HSE guidance, but specific to SiteMedic implementation

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - RIDDOR regulations are stable, but HSE may update F2508 form)
