# Domain Pitfalls: Adding Multi-Vertical Support to an Existing Compliance SaaS

**Domain:** UK medic compliance platform — adding Film/TV, Festivals, Motorsport, Football verticals to shipped Construction baseline
**Researched:** 2026-02-17
**Confidence:** HIGH — findings grounded in codebase inspection plus regulatory source verification

---

## How to Read This File

Each pitfall entry is structured as:

- **What goes wrong** — the failure mode
- **Evidence in this codebase** — what was found during code inspection (not hypothetical)
- **Warning signs** — how to detect early
- **Prevention strategy** — concrete action to take
- **Phase to address** — when in the roadmap this should be fixed

---

## Critical Pitfalls

Mistakes that cause regulatory liability, data corruption, or require rewrites.

---

### Pitfall 1: RIDDOR Detector Has No Vertical Awareness — Will Flag Non-Workers

**What goes wrong:**
The `riddor-detector` Edge Function fires on every completed treatment and applies RIDDOR detection rules
regardless of which vertical the treatment belongs to. RIDDOR (Reporting of Injuries, Diseases and
Dangerous Occurrences Regulations 2013) applies only when a **worker** is injured at a **workplace**.
It does not apply to festival-goers, motorsport competitors, or football spectators.

When a Festivals or Motorsport org uses the platform, a festival-goer who fractures a wrist will
trigger a RIDDOR `specified_injury` flag and create a `riddor_incidents` record with a 10-day
deadline. This is legally incorrect, produces false urgency, and will erode medic trust in the system
fast — once medics learn the flags are wrong, they stop reviewing real ones.

**Evidence in this codebase:**
`supabase/functions/riddor-detector/index.ts` fetches the treatment record and immediately runs
`detectRIDDOR()` with no check of the treatment's org vertical, the booking's `event_vertical`, or
whether `patientIsWorker` is true for that org. There is no vertical lookup anywhere in the detector
function.

`services/taxonomy/vertical-compliance.ts` correctly defines `riddorApplies: false` for `festivals`,
`motorsport`, `sporting_events`, `fairs_shows`, `private_events`. This data exists but is never
consulted by the detector at the point of incident creation.

The treatment record stored in WatermelonDB (`src/database/schema.ts`) has no `vertical_id` or
`event_vertical` column — the vertical is fetched fresh from `org_settings` on each form mount
(`app/treatment/new.tsx` lines 93–113) and is not persisted to the treatment row. When the sync
payload reaches Supabase, the vertical is not included in the `treatments` table row, so the
detector cannot read it from the treatment record either.

**Warning signs:**
- Festival org's RIDDOR incidents list fills with entries for wrist fractures and head injuries on attendees
- Medics report "Everything is being flagged as RIDDOR — we're at a festival, these are members of the public"
- RIDDOR incidents table accumulates entries for orgs where `riddorApplies = false`
- Medic overrides every single auto-flagged incident as "not reportable"

**Prevention strategy:**
1. Add `vertical_id` (TEXT, optional) column to the WatermelonDB `treatments` table (schema version 4 migration required) so the vertical is persisted with the treatment record at capture time.
2. Include `vertical_id` in the sync payload sent to Supabase treatments table.
3. At the start of `riddor-detector/index.ts`, after fetching the treatment, resolve the org's primary vertical from `org_settings.industry_verticals` OR the booking's `event_vertical` (prefer booking-level for per-booking overrides). Call `getVerticalCompliance()` logic server-side and gate the entire detection: if `riddorApplies === false`, return `{ detected: false, reason: "RIDDOR does not apply to this vertical" }` immediately.
4. For the `education` and `outdoor_adventure` verticals where `patientIsWorker: false` (patient may be staff or participant), add a patient-type field to the treatment form so the detector can distinguish a staff injury (RIDDOR applies) from a student/participant injury (RIDDOR does not apply).

**Phase to address:**
Before activating any non-RIDDOR vertical for production orgs. This must be fixed before the Festivals or Motorsport vertical launches — a single false RIDDOR flag sent to an HSE-aware client will damage credibility immediately.

---

### Pitfall 2: Motorsport Concussion Protocol — Mandatory Licence Suspension Not Captured

**What goes wrong:**
Under Motorsport UK General Regulations (and equivalent FIA rules), when a driver or competitor
suffers a concussion — or any head injury requiring the HIA (Head Injury Assessment) protocol — the
event's Chief Medical Officer has a mandatory duty to notify the competitor's licence-issuing body
and the competitor may not return to racing until medically cleared. This is not optional guidance;
it is a regulatory obligation that the platform must facilitate.

The existing treatment form (`app/treatment/new.tsx`) captures `injury_type` from the shared
`INJURY_TYPES` taxonomy. `loss-of-consciousness` is listed but is mapped directly to a RIDDOR
`specified_injury` trigger in the detector — the wrong framework entirely for motorsport. There is
no concussion-specific capture path, no HIA checkbox, no "Competitor licence suspended — notification
required to Motorsport UK" action, and no field for the Clerk of the Course notification.

If a medic treats a concussed driver and the platform does not prompt the mandatory notification
workflow, a competitor could re-enter racing without clearance. This is a clinical safety failure
with liability exposure.

**Evidence in this codebase:**
`services/taxonomy/mechanism-presets.ts` includes `'Head impact / concussion'` as a mechanism
preset. `services/taxonomy/vertical-compliance.ts` references `motorsport_uk` as the primary
framework with post-treatment guidance about the Clerk of the Course, but no form field or workflow
enforces the HIA/concussion pathway. No field called `concussion_protocol`, `hia_conducted`,
`licence_suspension_required`, or `cmo_notified` exists anywhere in the schema or treatment form.

**Warning signs:**
- Motorsport medics complete treatment forms for head injuries and the form does not prompt any concussion-specific action
- No "Return to Race Clearance" step in the treatment completion flow for motorsport vertical
- Medics report: "The app doesn't have a section for the concussion check — I did it verbally"
- A competitor appears on track after a flagged head injury with no clearance record in the system

**Prevention strategy:**
1. Add a vertical-specific post-treatment step for `motorsport`: after saving a treatment with `injury_type === 'loss-of-consciousness'` OR mechanism containing 'concussion', show a mandatory checklist: (a) HIA conducted Y/N, (b) Competitor stood down from racing Y/N, (c) CMO / Clerk of Course notified Y/N. These must be answered before the form can be submitted.
2. Record `licence_suspension_flag: boolean` and `cmo_notified_at: timestamp` on the treatment record for motorsport verticals.
3. Surface incomplete concussion protocols in the web dashboard's "Race Incidents" list with a red badge ("Concussion clearance required").
4. Review Motorsport UK General Regulations annually — this requirement may tighten for national events with FIA oversight.

**Phase to address:**
Motorsport vertical MVP phase. Cannot ship motorsport without this — it is the highest-risk regulatory gap identified.

---

### Pitfall 3: WatermelonDB Schema Freeze — Adding Vertical-Specific Fields Is Painful

**What goes wrong:**
WatermelonDB migrations for shipped apps are structurally painful: every added column requires a
migration file, schema version bump, and the migration must be applied before users sync. If a
migration is missing or misapplied, the app throws and the user is stuck until they clear app data —
losing all unsynced treatments.

The current WatermelonDB schema (`src/database/schema.ts`) is at version 3 with no `vertical_id`,
no `booking_id`, no `patient_type`, and no `event_specific_flags` field on the treatments table.
Adding multi-vertical support requires at minimum: `vertical_id` (to fix Pitfall 1 above),
potentially `patient_type` (worker vs. public, for education/outdoor verticals), and
`concussion_protocol_flags` for motorsport.

Each of these requires a WatermelonDB schema migration. If migrations are added ad-hoc across
multiple sprints without planning, you get schema drift: some medic devices are on version 4, others
on version 5 after a fast update, and sync conflicts arise between incompatible record shapes.

**Evidence in this codebase:**
`src/database/migrations.ts` shows migrations to version 2 and 3 exist. `src/database/schema.ts`
comments say "When bumping schema version, add a migration adapter before production release." No
migration exists beyond version 3. The treatments table has no vertical-related columns.

**Warning signs:**
- PR descriptions that say "added column to WatermelonDB schema" without a corresponding migration in `migrations.ts`
- Schema version bumped without a migration step
- New columns added that have no `isOptional: true` — will crash existing installs
- Team discusses "just clearing app data in development" — this approach does not work in production

**Prevention strategy:**
1. Before multi-vertical development begins, write a single planned migration (version 4) that adds ALL vertical-related columns to `treatments` in one shot: `vertical_id TEXT optional`, `patient_type TEXT optional`, `booking_id TEXT optional`. Adding them in one migration is less risky than spreading them across multiple versions.
2. Every new WatermelonDB column must be `isOptional: true` unless it has a safe default value. Do not add required columns to existing tables in migrations — they will crash existing rows.
3. Use a JSONB-style escape hatch: add `extra_fields TEXT optional` (JSON string) to `treatments` for vertical-specific one-off fields that don't justify a schema column (e.g., `concussion_hia_conducted`, `motorsport_cmo_notified`). This mirrors the `booking_briefs.extra_fields JSONB` pattern already in the Supabase schema.
4. Test migrations on a device that has existing data from version 3 before releasing to production.

**Phase to address:**
Start of multi-vertical development sprint. Must be planned as a single coordinated migration, not accumulated ad-hoc.

---

### Pitfall 4: Booking Vertical vs. Org Vertical Mismatch in Treatment Form

**What goes wrong:**
The system supports per-booking vertical overrides: `bookings.event_vertical` was added in migration
123. An org might be primarily `construction` but book a one-off `motorsport` event. When a medic
opens a treatment form during that motorsport booking, they should see motorsport mechanism presets,
motorsport outcome labels, and motorsport RIDDOR/compliance guidance — not construction defaults.

Currently (`app/treatment/new.tsx` lines 93–113), `fetchOrgVertical()` reads only from
`org_settings.industry_verticals[0]`. It has no awareness of the current booking's `event_vertical`.
A medic at a motorsport booking booked by a construction org will see "RIDDOR-flagging" guidance,
"Worker Information" section heading (mitigated by `getPatientLabel()` which falls back to vertical),
and construction-specific mechanism presets — all wrong.

**Evidence in this codebase:**
`app/treatment/new.tsx` line 101–108: fetches `org_settings.industry_verticals` and uses index `[0]`
as `orgVertical`. No code reads `bookings.event_vertical`. The booking context (which booking the
medic is currently working on) is not passed into the new treatment screen at all. The WatermelonDB
treatments table has no `booking_id` column, so there is no way to look up the booking from the
treatment record.

`web/lib/booking/vertical-requirements.ts` defines `BookingVerticalId` type and per-vertical
requirements, but the mobile treatment form does not consume this.

**Warning signs:**
- Medic at a motorsport event sees "Worker Information" heading and RIDDOR warning banner
- Treatment records from motorsport bookings appear in the RIDDOR incidents queue when they should not
- Mechanism presets show construction-specific options (confined space, plant machinery) at a race circuit
- Medic feedback: "The app doesn't know what kind of event I'm at"

**Prevention strategy:**
1. Add `booking_id TEXT optional` to the WatermelonDB treatments schema (part of the version 4 migration above).
2. When navigating to the new treatment screen, pass the current booking ID as a route param.
3. In `fetchOrgVertical()`, first check if a `booking_id` is available. If so, fetch that booking's `event_vertical` from Supabase. Fall back to `org_settings.industry_verticals[0]` only if no booking context exists.
4. Cache the resolved vertical in the treatment record at creation time (the new `vertical_id` column), so it does not need to be re-fetched on every auto-save tick.

**Phase to address:**
Multi-vertical treatment form sprint. Should be done at the same time as Pitfall 1 (vertical-aware RIDDOR detector) since both require `vertical_id` to be stored on the treatment record.

---

### Pitfall 5: F2508 PDF Generator Will Trigger for Non-RIDDOR Verticals

**What goes wrong:**
The `riddor-f2508-generator` Edge Function generates the HSE F2508 RIDDOR form PDF. It is currently
called from the web dashboard's RIDDOR incidents page. Once non-RIDDOR verticals exist, that page
will show incidents from festivals, motorsport, and sporting events — but those incidents should
not produce an F2508 (which is specifically the HSE RIDDOR reporting form). Generating an F2508 for
a festival-goer's injury would be factually incorrect and could confuse a client who forwards it
to HSE.

There is also the reverse problem: if the PDF generator is locked only to RIDDOR incidents and the
festivals/motorsport incidents page reuses the same `/riddor` route (which it does — the RIDDOR
page adapts its heading based on vertical but does not change its URL), a medic trying to generate
a PDF for a festival incident will find the button is absent or generates the wrong form.

**Evidence in this codebase:**
`web/app/(dashboard)/riddor/page.tsx` line 28–29 reads `compliance = getVerticalCompliance(primaryVertical)`
and conditionally shows a RIDDOR disclaimer for non-RIDDOR verticals. But the page URL is `/riddor`
and the "Export PDF" button (`exportRIDDORIncidentsPDF`) presumably generates F2508 format
regardless of the vertical's compliance framework.

`supabase/functions/riddor-f2508-generator/index.ts` fetches the incident and calls
`mapTreatmentToF2508()` with no vertical check. The function is named `riddor-f2508-generator`
and outputs specifically the HSE F2508 format.

**Warning signs:**
- PDF download button appears on the incidents page for a Festivals org and generates an HSE F2508 document
- Festival org's incident PDF has fields like "Name and address of the organisation where the accident happened" formatted as HSE RIDDOR report
- Medic reports: "The PDF download button produces a form that says 'Report to HSE' — that's not what we need"

**Prevention strategy:**
1. Add a vertical check to the PDF generation trigger on the incidents page: if `compliance.primaryFramework !== 'RIDDOR'`, call a different PDF generator (event incident report format) or disable the PDF button with a tooltip explaining the correct reporting form for that vertical.
2. Create a separate `generate-event-incident-pdf` Edge Function for non-RIDDOR verticals, producing a generic event incident report PDF rather than HSE F2508.
3. The F2508 generator should validate on entry that the incident's org vertical is RIDDOR-applicable; if not, return a 400 error with a clear message rather than generating an incorrect form.
4. Rename `/riddor` route or use a dynamic segment (`/incidents`) with vertical-aware heading — already partially done via `compliance.incidentPageLabel` — but ensure the PDF logic is also vertical-aware.

**Phase to address:**
PDF/reporting sprint for new verticals. The existing construction workflow must not regress. New verticals need appropriate report formats rather than repurposed F2508 forms.

---

## Moderate Pitfalls

Mistakes that create technical debt, user confusion, or compliance gaps without immediate regulatory liability.

---

### Pitfall 6: Configuration Drift Across Vertical Definition Files

**What goes wrong:**
Vertical configuration is currently split across multiple TypeScript files:

- `services/taxonomy/vertical-compliance.ts` — RIDDOR applicability, framework labels (mobile + web)
- `services/taxonomy/certification-types.ts` — `VERTICAL_CERT_TYPES` record (mobile)
- `services/taxonomy/vertical-outcome-labels.ts` — outcome label overrides (mobile)
- `services/taxonomy/mechanism-presets.ts` — mechanism chips per vertical (mobile)
- `web/lib/booking/vertical-requirements.ts` — booking-level requirement checkboxes (web)
- `web/lib/compliance/vertical-compliance.ts` — duplicate of mobile taxonomy (web)

Each file uses a string key (`'motorsport'`, `'festivals'`, etc.) with no shared type enforcement.
As new verticals are added, a developer updating one file will miss another. A new vertical added
to `VERTICAL_CERT_TYPES` but not to `VERTICAL_REQUIREMENTS` gets generic requirements. A vertical
added to `OUTCOME_LABEL_OVERRIDES` but not to `getPatientLabel()` shows "Patient" instead of the
correct noun. These gaps are invisible until a medic from that vertical notices wrong terminology
or missing configuration.

**Evidence in this codebase:**
`services/taxonomy/vertical-compliance.ts` defines 10 verticals. `web/lib/compliance/vertical-compliance.ts`
is a duplicate file with identical content (evidenced by the same function names and structure).
`services/taxonomy/vertical-outcome-labels.ts` defines `TreatmentVerticalId` imported from
`mechanism-presets.ts`, but the union type there and the string keys in `vertical-compliance.ts`
are not enforced against each other — a typo in one will not cause a compile error in the other.

**Warning signs:**
- A new vertical shows generic "Patient" label instead of the correct noun
- Mechanism presets for a new vertical are the construction defaults
- Cert types for a new vertical show the full 30-item list (no prioritisation) because `VERTICAL_CERT_TYPES` record was not updated
- The two `vertical-compliance.ts` files (mobile vs. web) diverge silently when one is updated

**Prevention strategy:**
1. Create a single canonical `VERTICAL_IDS` constant (e.g., `as const` tuple) and derive all per-vertical records from it using TypeScript's `Record<VerticalId, ...>` — this forces exhaustive coverage: adding a new vertical to `VERTICAL_IDS` immediately breaks compilation anywhere the record is not updated.
2. Write a simple unit test that imports all vertical config files and asserts that every vertical ID present in `vertical-compliance.ts` exists in `VERTICAL_CERT_TYPES`, `OUTCOME_LABEL_OVERRIDES`, and `getPatientLabel()` switch. This test fails fast when a new vertical is added without updating one config file.
3. Consolidate the duplicate `web/lib/compliance/vertical-compliance.ts` into a single shared package or import from the mobile taxonomy. Two copies of the same data will drift.
4. Document "the vertical checklist" — a list of all files that must be updated when adding a new vertical — and add it to the PR template.

**Phase to address:**
Before the second vertical (Film/TV) launches. The pattern should be established once, so all subsequent verticals follow it.

---

### Pitfall 7: Terminology Bleed — "Worker" and "Site" Survive in Screens Not Yet Updated

**What goes wrong:**
The `getPatientLabel()` function correctly returns vertical-specific nouns ("Attendee", "Driver / Competitor",
"Crew member"). The treatment form (`app/treatment/new.tsx`) correctly uses it for section heading 1.
But the treatment _detail_ screen (`app/treatment/[id].tsx`) hardcodes "Worker Information" as the
section heading. The treatments list (`app/(tabs)/treatments.tsx`) stores and displays `workerName`
with no vertical substitution. The validation alert (`app/treatment/new.tsx` line 315) says
"Please select a worker" regardless of vertical.

For Film/TV, Festival, and Motorsport medics, every completed treatment detail view will show
"Worker Information" — which is factually incorrect and potentially confusing (a festival-goer is
not a worker, a race driver is not a worker). If a legal review of records is triggered, the
mislabelling could complicate documentation.

The tab bar also shows "Workers" and "Worker Registry" as the tab label and header title
(`app/(tabs)/_layout.tsx` lines 96–98). A Festivals org has no concept of a "Worker Registry" —
they would expect "Patient Register" or "Attendee Register".

**Evidence in this codebase:**
`app/treatment/[id].tsx` line 233: `<Text style={styles.sectionTitle}>Worker Information</Text>` — hardcoded, no vertical check.
`app/(tabs)/treatments.tsx` line 63: `let workerName = 'Unknown Worker';` — hardcoded fallback string.
`app/(tabs)/treatments.tsx` line 224: `<Text style={styles.workerName}>{item.workerName}</Text>` — displayed directly.
`app/(tabs)/_layout.tsx` lines 96–98: tab title and header hardcoded as "Workers" / "Worker Registry".
`app/treatment/new.tsx` line 315: `Alert.alert('Missing Information', 'Please select a worker');`
`app/worker/new.tsx` line 273: title hardcoded as "Add Worker - Site Induction".

**Warning signs:**
- Film/TV or Festivals org reports: "The app calls everyone 'Workers' — my clients notice this"
- Treatment records for festival attendees display "Worker Information" header in detail view
- The tab bar shows "Workers" to an org whose patients are race competitors
- Support request: "We're a motorsport company, why does the app say 'Site Induction'?"

**Prevention strategy:**
1. Extend `getPatientLabel()` to return a plural form and an "registry" noun: `{ singular: 'Attendee', plural: 'Attendees', registryLabel: 'Attendee Register', inductionLabel: 'Pre-Event Registration' }`.
2. Thread this through `app/treatment/[id].tsx`, `app/(tabs)/treatments.tsx` (rename `workerName` field to `patientName` in the local interface), and the validation alert messages.
3. The tab navigator (`_layout.tsx`) should read the org vertical (cached in auth context or async storage) to set tab labels. If this is too complex for now, use a generic term ("Patients" / "Patient Register") that is accurate for all verticals instead of the construction-specific "Workers" / "Worker Registry".
4. Run a grep for hardcoded "Worker", "worker", "Site Induction", "worker_id" strings in UI-facing positions and document a list. Address them as a named subtask within the terminology/vertical milestone.

**Phase to address:**
During each vertical's launch sprint. The Film/TV vertical should not ship with "Worker Registry" visible to Film production companies. The tab-level labels can be addressed in a single cross-cutting PR before any non-construction vertical launches.

---

### Pitfall 8: Festival Triage Outcomes Use Wrong Category System

**What goes wrong:**
The standard `OUTCOME_CATEGORIES` taxonomy (`services/taxonomy/outcome-categories.ts`) uses
work-focused outcomes: "Returned to work — same duties", "Sent home", "Referred to GP". These
categories reflect the RIDDOR/worker mindset. The Purple Guide framework used at festivals
expects outcomes to be recorded using the TST (Triage Sieve Tool) priority system:
P1 (Immediate), P2 (Urgent), P3 (Delayed), P4 (Expectant / Dead).

Even after the outcome label overrides in `vertical-outcome-labels.ts` (which maps
"returned-to-work-same-duties" to "Returned to event / crowd" for festivals), the underlying
category IDs stored in the database remain work-outcome IDs. A Purple Guide-based festival audit
or a mass casualty debrief that asks "how many P1 patients did you treat?" cannot be answered
from the data, because the platform captured "ambulance-called" and "hospitalized" instead of
P1/P2/P3/P4.

This is not just a terminology issue — it is a data structure mismatch between the platform's
data model and the regulatory reporting framework for festivals.

**Evidence in this codebase:**
`services/taxonomy/outcome-categories.ts` defines 7 outcome IDs, all work-outcome focused.
`services/taxonomy/vertical-outcome-labels.ts` remaps display labels but preserves the same 7 IDs.
No `triage_priority` field exists on the treatment record. The festivals compliance config
(`services/taxonomy/vertical-compliance.ts`) names `purple_guide` as the primary framework and
references an "Event Incident Log" but no Purple Guide-specific data fields exist.

**Warning signs:**
- Festival org asks: "Can we run a P1/P2/P3 breakdown for the event medical plan?" — the answer from existing data is no
- Purple Guide post-event report template asks for patient priority categories and the data does not exist
- Local authority or event safety officer reviews the incident report and asks about triage priorities
- Festival medics report: "We're triaging using TST but entering a different outcome in the app — they don't match"

**Prevention strategy:**
1. Add an optional `triage_priority TEXT` field to the WatermelonDB treatments table (part of the version 4 migration). Values: `P1`, `P2`, `P3`, `P4`, or null for non-triage verticals.
2. For the `festivals` vertical, show a triage priority selector as an additional step in the treatment form after injury details — it does not replace outcome category, but supplements it.
3. Include `triage_priority` in the sync payload so it is stored in Supabase and available for event reports.
4. Consult the Purple Guide (Events Industry Forum, current edition) and verify the exact triage terminology required for local authority licensing submissions before finalising the data model.

**Phase to address:**
Festivals vertical MVP sprint. This is a data model decision that cannot be retrofitted once festival orgs have live records.

---

### Pitfall 9: Offline Vertical Config Requires a Network Round-Trip on Every Treatment

**What goes wrong:**
`fetchOrgVertical()` in `app/treatment/new.tsx` makes a Supabase network call on every mount of
the new treatment screen. On a construction site, at a remote film location, or at an outdoor
festival with poor mobile signal, this request will timeout or fail. The code gracefully falls
back to `null` (which falls back to `general` defaults via the vertical taxonomy functions), but
the "fall back to general" default is construction-flavoured in most of the taxonomy files. A
Festivals medic who opens the treatment form offline sees construction mechanism presets.

The fetch is not memoised or cached — it happens on every mount of the screen, not once per
session. In a busy shift where a medic logs 20 treatments, this is 20 network round-trips to
fetch the same vertical config that does not change during the shift.

**Evidence in this codebase:**
`app/treatment/new.tsx` lines 83–113: `useEffect(() => { fetchOrgVertical(); }, [])` — no cache,
no async-storage lookup before fetching. The `orgVertical` state is local to the component and
resets every time the screen is mounted.

`services/taxonomy/mechanism-presets.ts` `getMechanismPresets()` falls back to the `general`
preset array when `verticalId` is null — and the `general` array is identical to construction
presets in most implementations.

**Warning signs:**
- Medic at a festival with poor signal reports: "The mechanism options look wrong — they're for a building site"
- Performance profiling shows 20+ identical Supabase calls to `org_settings` during a shift
- Treatment form shows construction presets when offline, even for a non-construction org

**Prevention strategy:**
1. Cache the resolved vertical in AsyncStorage (or the SyncContext) after first successful fetch. Key: `vertical_cache_${orgId}`. Invalidate when the medic next syncs successfully. This means offline treatments use the last-known vertical.
2. Alternatively, include the org's `industry_verticals` in the auth token's `app_metadata` (already done for `org_id` — extend it to include `primary_vertical`). This makes the vertical available instantly without any network call.
3. If neither approach above is taken before launch, change the fallback from `general` to a genuinely neutral default (use "Patient" as patient label, omit construction-specific mechanism presets) so wrong-vertical fallback is less jarring than current.

**Phase to address:**
Offline-first hardening sprint. Address before the first non-construction vertical launches to production.

---

### Pitfall 10: Cert Expiry Checker Sends Alerts Regardless of Vertical Relevance

**What goes wrong:**
The `certification-expiry-checker` Edge Function (`supabase/functions/certification-expiry-checker/index.ts`)
emails medics about expiring certifications from a flat list across all cert types. A medic who
works exclusively in the Motorsport vertical will receive reminder emails about their expiring CSCS
card — a construction site access card that is irrelevant to their work. A Festivals medic with an
FIA Grade 3 cert that is expiring gets an email that mentions the cert type, but the email template
may frame it in generic terms that confuse them.

More critically, for verticals with mandatory compliance implications — Motorsport (FIA grade
required for FIA-graded events), Education (DBS must be current to be on site with children) — the
expiry email should convey urgency proportional to the regulatory consequence. A lapsed FIA Grade
means the medic cannot work FIA-governed circuits. A lapsed Enhanced DBS means the medic cannot
legally be unsupervised with children. The current generic email template does not distinguish these.

**Evidence in this codebase:**
`supabase/functions/certification-expiry-checker/index.ts` calls `get_certifications_expiring_in_days`
RPC and iterates all results without filtering by the medic's vertical(s). `VERTICAL_CERT_TYPES`
in `services/taxonomy/certification-types.ts` defines which certs are relevant per vertical, but
this mapping is not used by the expiry checker.

**Warning signs:**
- Motorsport-only medics receiving CSCS expiry warnings
- Medic ignores expiry emails because "they're always about certs I don't need" — then misses a critical one
- Education org admin receives notification about a medic's FIA Grade 3 expiry — irrelevant to them

**Prevention strategy:**
1. Store each medic's primary vertical(s) on their profile. The expiry checker should filter reminders to certs in `VERTICAL_CERT_TYPES[primaryVertical]` before sending emails.
2. Add a `regulatory_consequence` field to cert type info (in `CERT_TYPE_INFO`) for certs with mandatory implications: `{ label: 'FIA Grade 3', category: 'motorsport', mandatoryFor: 'FIA-graded circuit events', consequence: 'Cannot work FIA circuits when expired' }`. Use this in email templates to frame urgency correctly.
3. For DBS and FIA grade certs, send alerts to the org admin at the 30-day stage (not just 14/7/1) with wording that reflects the legal consequence.

**Phase to address:**
Certification vertical awareness sprint. Should be done before any non-construction vertical goes live with real medics.

---

## Minor Pitfalls

Issues that are irritating but recoverable without rewriting.

---

### Pitfall 11: Treatment Reference Number Format Is Construction-Branded

**What goes wrong:**
The treatment reference number generator (`app/treatment/new.tsx` line 153–174) generates
`SITE-YYYYMMDD-NNN`. "SITE" is construction-specific branding. For a Film/TV org, the reference
will appear in reports as `SITE-20260301-001` — a production company's clients or insurers may find
"SITE" confusing or unprofessional when the event is a film shoot, not a construction site.

**Evidence in this codebase:**
`app/treatment/new.tsx` line 171: `` return `SITE-${dateStr}-${sequenceNumber}`; ``
Hardcoded prefix, not derived from vertical.

**Warning signs:**
- Film/TV client asks: "Why do all incident reports say SITE- if we're on a film set?"
- Insurance paperwork requires a reference format that the "SITE" prefix breaks

**Prevention strategy:**
Use a vertical-configurable prefix: `construction` → `SITE`, `tv_film` → `PROD`, `motorsport` → `RACE`, `festivals` → `EVT`, others → `MED`. Derive the prefix from `orgVertical` at reference generation time. If vertical is not known yet (offline), use `MED` as a safe neutral prefix.

**Phase to address:**
During Film/TV vertical sprint. Low effort, high polish value.

---

### Pitfall 12: Heat Map GPS Data Gap — Treatments Have No Location Field

**What goes wrong:**
Near-miss records capture GPS location (`app/safety/near-miss.tsx` captures `latitude` and
`longitude` on mount). Treatment records do not. The WatermelonDB `treatments` table has no
`location` column and the treatment form does not request location permission. If a heat map feature
is planned (showing where on a site or event most injuries occur), treatment GPS data will be absent.
Near-miss records will show location data; treatment records will not. The resulting heat map will
appear to show "injuries never happen" when in fact the location was never captured.

**Evidence in this codebase:**
`src/database/schema.ts` — `near_misses` table has `{ name: 'location', type: 'string', isOptional: true }`.
`treatments` table has no location column. `app/treatment/new.tsx` makes no `expo-location` import.
`app/safety/near-miss.tsx` imports `expo-location` and captures coordinates at form open.

**Warning signs:**
- Analytics dashboard shows heat map of near-misses but no heat map of treatment locations
- Business requirement for "location intelligence" across all incident types cannot be met
- A heat map feature is built that only covers 50% of incident types

**Prevention strategy:**
Add `location TEXT optional` (JSON lat/lng string) to the WatermelonDB treatments table in the version 4 migration. Silently capture GPS at treatment form open (same pattern as near-miss). Do not block form completion if location is unavailable — make it background capture. Store in the same format as `near_misses.location`. This is trivial to add now; retrofitting after live records exist means historical data has no location.

**Phase to address:**
Version 4 WatermelonDB migration sprint — add it alongside `vertical_id` so both are in one schema bump.

---

### Pitfall 13: Trend Chart Data Integrity — Compliance Score History Has No Consistent Formula

**What goes wrong:**
If a compliance score trend chart is added to the dashboard (a common roadmap item for compliance
SaaS), the score formula must be frozen before data is collected. If the formula changes between
week 1 and week 8 (e.g., "we added RIDDOR submission rate as a factor"), historical scores become
incomparable to current scores. The chart appears to show improvement or decline that is actually
a formula change.

**Evidence in this codebase:**
No compliance score or trend table exists yet in the migrations reviewed. The `daily_location_trends`
view referenced in `web/app/admin/analytics/page.tsx` exists for admin analytics, but no per-org
compliance score history table was found.

**Warning signs:**
- Compliance score logic is embedded in a dashboard component rather than a database view or Edge Function
- Score formula is changed mid-month and historical scores are not recalculated
- Two orgs compare their scores and get different results for identical incident counts because they onboarded at different times

**Prevention strategy:**
Before building the compliance trend chart, define the score formula in a database view or Edge Function (single source of truth). Snapshot daily scores into a `org_compliance_scores (org_id, score_date, score, formula_version)` table. Include `formula_version` so historical scores are interpretable after formula updates.

**Phase to address:**
Analytics/reporting sprint. Do not build the front-end chart before the score formula and snapshot table are in place.

---

## Regulatory Compliance Errors (Most Likely to Create Liability)

A summary of the regulatory gaps identified, ranked by consequence severity.

| Vertical | Regulatory Requirement | Current Status | Consequence if Missed |
|----------|----------------------|----------------|----------------------|
| Motorsport | Mandatory concussion licence suspension notification (Motorsport UK) | Not implemented | Competitor races after concussion; platform has liability |
| Festivals / Motorsport / Sporting Events | RIDDOR must NOT flag public patient injuries | RIDDOR detector is vertical-blind | False RIDDOR reports to clients; erosion of trust |
| Festivals | Purple Guide TST triage priority (P1/P2/P3/P4) must be capturable | No triage priority field | Cannot produce Purple Guide-compliant post-event reports for local authority licensing |
| Education | Enhanced DBS is mandatory to be on-site with children | Cert tracked but expiry alert not urgent-framed | Lapsed DBS medic on-site with children; Ofsted violation |
| Motorsport | FIA Grade certificate required for graded events | Cert tracked but expiry alert not role-specific | Ungraded medic provides track-side cover at FIA event; FIA violation |
| Football/Sporting | Two patient types (player vs. spectator) need different form fields | Single treatment form with no patient type selector | Insurance claim uses wrong form; governance report incomplete |

---

## Phase-Specific Warnings

| Phase Topic | Most Likely Pitfall | Mitigation |
|-------------|--------------------|-----------|
| WatermelonDB schema migration | Missing columns break existing installs | Plan all new columns as one version 4 migration with all fields optional; test on device with existing v3 data before release |
| Motorsport vertical MVP | Concussion protocol missing | Mandatory concussion checklist in treatment form before motorsport vertical goes live |
| Festivals vertical MVP | RIDDOR flags on public patients | Fix vertical-aware RIDDOR detector before festival vertical activates |
| Festivals vertical MVP | No triage priority capture | Add `triage_priority` field in v4 migration; show selector for festival vertical |
| Film/TV vertical | Terminology bleed ("Worker Information", "SITE-" prefix) | Cross-cutting terminology PR before Film/TV launch |
| All new verticals | Config drift (missing entry in one taxonomy file) | Mandatory unit test: all verticals present in all config records |
| Certification alerts | Irrelevant cert reminders | Filter by vertical before launch |
| Analytics/heat map | Treatment has no GPS | Add `location` column in v4 migration |
| Compliance score chart | Formula not frozen | Define formula in DB before building front-end |

---

## Sources

**Regulatory sources consulted for this research:**

- Motorsport UK General Regulations (2024 edition) — concussion and HIA requirements: https://www.motorsportuk.org/the-sport/regulations/
- FIA Medical Code — Grade requirements for circuit events: https://www.fia.com/sites/default/files/fia_medical_code.pdf
- HSE RIDDOR Regulations 2013 — who is covered (workers only, not public): https://www.hse.gov.uk/riddor/who-must-report.htm
- Events Industry Forum — The Purple Guide (current edition): https://www.thepurpleguide.co.uk
- Ofsted — Paediatric First Aid requirements in education settings: https://www.gov.uk/government/publications/paediatric-first-aid-in-early-years-settings
- DBS/Barred List obligations in education: https://www.gov.uk/dbs-check-guidance

**Code files inspected (all findings are grounded in this codebase):**

- `supabase/functions/riddor-detector/index.ts` — no vertical check found
- `supabase/functions/riddor-detector/detection-rules.ts` — no vertical check found
- `supabase/functions/riddor-f2508-generator/index.ts` — no vertical check found
- `supabase/functions/certification-expiry-checker/index.ts` — no vertical filter found
- `services/taxonomy/vertical-compliance.ts` — RIDDOR applicability correctly defined (not used by detector)
- `services/taxonomy/certification-types.ts` — `VERTICAL_CERT_TYPES` correctly defined (not used by expiry checker)
- `services/taxonomy/vertical-outcome-labels.ts` — outcome label overrides correct (TST triage not present)
- `src/database/schema.ts` — version 3, no vertical_id or location on treatments table
- `src/database/migrations.ts` — migrations to v3 only
- `app/treatment/new.tsx` — vertical fetch pattern (network call on every mount, no cache)
- `app/treatment/[id].tsx` — "Worker Information" heading hardcoded
- `app/(tabs)/_layout.tsx` — "Workers" / "Worker Registry" tab labels hardcoded
- `supabase/migrations/123_booking_briefs.sql` — `event_vertical` added to bookings table
- `supabase/migrations/121_org_industry_verticals.sql` — `industry_verticals` in org_settings
- `web/app/(dashboard)/riddor/page.tsx` — renders for all verticals including non-RIDDOR

---

*Pitfalls research for: SiteMedic v2.0 multi-vertical expansion milestone*
*Researched: 2026-02-17*
*Confidence: HIGH — all findings grounded in direct code inspection of the shipped codebase*
