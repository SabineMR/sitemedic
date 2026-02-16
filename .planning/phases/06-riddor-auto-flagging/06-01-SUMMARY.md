---
phase: "06"
plan: "01"
subsystem: "compliance"
tags: ["riddor", "database", "edge-functions", "hse", "detection"]
requires: ["05-pdf-generation"]
provides: ["riddor-detection-algorithm", "riddor-incidents-table"]
affects: ["06-02-mobile-override", "06-04-dashboard"]
tech-stack:
  added: ["pdf-lib"]
  patterns: ["rule-based-detection", "confidence-scoring", "idempotent-edge-functions"]
key-files:
  created:
    - supabase/migrations/018_riddor_incidents.sql
    - supabase/functions/riddor-detector/index.ts
    - supabase/functions/riddor-detector/types.ts
    - supabase/functions/riddor-detector/detection-rules.ts
    - supabase/functions/riddor-detector/confidence-scoring.ts
    - supabase/functions/riddor-detector/test.ts
  modified:
    - supabase/migrations/016_weekly_report_cron.sql
    - supabase/migrations/017_contract_management.sql
decisions:
  - id: D-06-01-001
    decision: "Use rule-based detection algorithm (not ML) for RIDDOR criteria matching"
    rationale: "ML requires training data (none available yet); rule-based is transparent, auditable, easier to tune based on override feedback per Research"
    alternatives: ["Machine learning classifier", "Fuzzy string matching"]
  - id: D-06-01-002
    decision: "Confidence levels HIGH/MEDIUM/LOW based on multiple signals and injury type ambiguity"
    rationale: "CDS research shows 49-96% override rates for low-specificity algorithms; confidence levels help medics prioritize review"
    impact: "Medics can filter by confidence level, focus on HIGH confidence flags first"
  - id: D-06-01-003
    decision: "Exclude finger/thumb/toe fractures from RIDDOR detection per HSE exception"
    rationale: "HSE RIDDOR regulations explicitly exclude these fractures from reporting requirements"
    source: "https://www.hse.gov.uk/riddor/specified-injuries.htm"
  - id: D-06-01-004
    decision: "Calculate deadline as DATE type (not TIMESTAMPTZ) for calendar day deadlines"
    rationale: "RIDDOR deadlines are 10 or 15 calendar days, not hours; DATE type prevents timezone confusion"
    impact: "Deadline cron queries simpler, no timezone math needed"
  - id: D-06-01-005
    decision: "Unique index on treatment_id prevents duplicate RIDDOR incidents"
    rationale: "Edge Function may be called multiple times for same treatment; idempotent behavior required"
    implementation: "PostgreSQL 23505 error ignored in Edge Function, existing incident returned"
  - id: D-06-01-006
    decision: "Fixed migration 016 and 017 permission issues (COMMENT ON SCHEMA cron, COMMENT ON TABLE storage.buckets)"
    rationale: "Local Postgres user doesn't own cron schema or storage.buckets table; comments cause migration failures"
    resolution: "Commented out problematic COMMENT statements, functionality unaffected"
duration: "15 min"
completed: "2026-02-16"
---

# Phase 06 Plan 01: Database Schema + RIDDOR Detection Edge Function Summary

**One-liner:** Rule-based HSE RIDDOR detection with confidence scoring, creating auto-flagged incidents with 10/15-day deadlines and medic override tracking

## What Was Built

### Database Schema
Created `riddor_incidents` table with complete lifecycle tracking:
- **Core identification:** treatment_id (unique), worker_id, org_id for multi-tenant
- **RIDDOR categorization:** 4 categories (specified_injury, over_7_day, occupational_disease, dangerous_occurrence)
- **Confidence levels:** HIGH/MEDIUM/LOW based on detection signal strength
- **Override tracking:** medic_confirmed (NULL/TRUE/FALSE), override_reason (mandatory), overridden_by, overridden_at
- **Deadline management:** deadline_date as DATE type (10 days for specified_injury, 15 days for over_7_day)
- **Report status:** draft/submitted/confirmed with f2508_pdf_path, submitted_at, submitted_by
- **Performance indexes:** org_id, treatment_id (unique), deadline_date (WHERE status='draft'), medic_confirmed (WHERE NULL)
- **RLS policies:** Medics full access, site managers read-only, service role insert for Edge Function

### RIDDOR Detection Algorithm
**Specified Injuries (8 criteria matching HSE regulations):**
1. Fractures (EXCLUDING fingers/thumbs/toes per HSE exception)
2. Amputations (all reportable)
3. Loss of sight (temporary or permanent)
4. Crush injuries to head/torso causing internal damage
5. Serious burns (>10% body or damaging eyes/respiratory)
6. Loss of consciousness from head injury/asphyxia
7. Scalping requiring hospital treatment
8. Hypothermia/heat-induced illness/asphyxia requiring resuscitation

**Over-7-Day Injuries:**
- Parses outcome field for "off work X days" where X > 7
- Excludes day of accident, includes weekends per RIDDOR regulations

**Confidence Scoring:**
- **HIGH:** Multiple criteria matched OR unambiguous injuries (amputation, fracture, loss of sight)
- **MEDIUM:** Single specified_injury criterion (crush, serious burn) OR over-7-day with explicit day count
- **LOW:** Inferred from severity/outcome without explicit match

### Edge Function (riddor-detector)
**Request format:**
```json
{
  "treatment_id": "uuid"
}
```

**Response format:**
```json
{
  "detected": true,
  "category": "specified_injury",
  "reason": "Fracture to leg_lower is RIDDOR-reportable",
  "confidence_level": "HIGH",
  "riddor_incident_id": "uuid"
}
```

**Behavior:**
- Fetches treatment from database via service role key
- Runs detection algorithm on injury_type + body_part + severity + treatment_types + outcome
- Creates riddor_incidents record if criteria matched
- Calculates deadline (created_at + 10 or 15 days)
- Idempotent: Ignores PostgreSQL 23505 duplicate errors, returns existing incident ID
- CORS headers for dashboard access

## Deviations from Plan

### Bug Fixes (Rule 1)
**Fixed migration 016 permission issue:**
- **Found during:** Database reset with migration 018
- **Issue:** `COMMENT ON SCHEMA cron` fails because postgres user doesn't own cron schema (owned by supabase_admin)
- **Fix:** Commented out the COMMENT statement
- **Files modified:** supabase/migrations/016_weekly_report_cron.sql
- **Commit:** 3f18ce8

**Fixed migration 017 permission and RLS issues:**
- **Found during:** Database reset with migration 018
- **Issue 1:** `COMMENT ON TABLE storage.buckets` fails (postgres user doesn't own storage.buckets)
- **Issue 2:** RLS policy references `storage_path` column that doesn't exist in contracts table (exists in contract_versions)
- **Fix:** Commented out COMMENT, updated RLS policy to JOIN contract_versions
- **Files modified:** supabase/migrations/017_contract_management.sql
- **Commit:** 3f18ce8

## Technical Decisions

1. **Rule-based over ML:** Transparent, auditable, no training data required, easier to tune based on medic override patterns
2. **Confidence levels:** Reduce alert fatigue by allowing medics to prioritize HIGH confidence flags (CDS best practice)
3. **HSE exception handling:** Explicit exclusion of finger/thumb/toe fractures per RIDDOR regulations
4. **DATE type for deadlines:** Calendar day deadlines (not hours), prevents timezone confusion in cron jobs
5. **Idempotent Edge Function:** Unique treatment_id index + duplicate error handling = safe to call multiple times
6. **Service role authentication:** Edge Function uses service_role_key for database access (bypasses RLS)

## Dependencies Created

**For Plan 06-02 (Mobile Override UI):**
- riddor_incidents table with medic_confirmed, override_reason fields
- Edge Function returns riddor_incident_id for immediate override workflow

**For Plan 06-04 (Web Dashboard):**
- riddor_incidents queryable by org_id with deadline_date for countdown display
- Confidence levels for filtering/sorting (show HIGH confidence first)

**For Plan 06-05 (Deadline Cron):**
- deadline_date index WHERE status='draft' for efficient cron queries
- deadline_date as DATE type simplifies comparison logic

**For Plan 06-06 (Override Analytics):**
- override_reason, overridden_by, overridden_at for pattern analysis
- confidence_level + medic_confirmed for override rate by confidence

## Files Changed

### Created (6 files)
- `supabase/migrations/018_riddor_incidents.sql` - Database schema with RLS policies
- `supabase/functions/riddor-detector/index.ts` - Edge Function handler (176 lines)
- `supabase/functions/riddor-detector/types.ts` - TypeScript interfaces
- `supabase/functions/riddor-detector/detection-rules.ts` - HSE criteria matching logic (182 lines)
- `supabase/functions/riddor-detector/confidence-scoring.ts` - Confidence calculation (62 lines)
- `supabase/functions/riddor-detector/test.ts` - Test cases for 8 scenarios

### Modified (2 files)
- `supabase/migrations/016_weekly_report_cron.sql` - Commented out cron schema comment
- `supabase/migrations/017_contract_management.sql` - Fixed storage.buckets comment and RLS policy

## Verification Results

✅ Database schema complete:
- riddor_incidents table exists with all tracking fields
- Indexes created for performance (org_id, treatment_id, deadline_date, medic_confirmed)
- RLS policies verified: medics SELECT+UPDATE, site managers SELECT, service role INSERT

✅ Detection algorithm accurate:
- Fracture detection excludes fingers/thumbs/toes (HSE exception)
- All 8 specified injury types handled
- Over-7-day detection parses outcome field
- Confidence scoring uses multi-signal approach

✅ Integration ready:
- Edge Function callable from mobile app treatment completion flow
- Idempotent (duplicate calls don't create multiple incidents)
- Deadline calculation matches HSE requirements (10 or 15 days)

## Next Phase Readiness

**Blockers:** None

**Pending work for Phase 6 completion:**
1. Plan 06-02: Mobile medic override UI workflow
2. Plan 06-03: HSE F2508 PDF generation
3. Plan 06-04: Web dashboard RIDDOR pages with deadline countdown
4. Plan 06-05: Deadline tracking cron job + email notifications
5. Plan 06-06: Override pattern analytics dashboard

**External dependencies:**
- HSE F2508 PDF form template (Plan 06-03 requires actual form field names inspection)
- Resend API key for deadline emails (Plan 06-05, already in use from Phase 5)

## Commits

1. `3f18ce8` - feat(06-01): add RIDDOR incidents table and fix migration issues
2. `dba46ae` - feat(06-01): add RIDDOR detection Edge Function

**Total:** 2 commits, 15 minutes, 690 lines of code added
