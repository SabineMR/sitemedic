---
phase: "06"
plan: "02"
subsystem: "mobile-compliance"
tags: ["riddor", "mobile", "override", "ui", "gloves-on"]
requires: ["06-01-detection"]
provides: ["riddor-override-workflow", "medic-confirmation-ui"]
affects: ["06-06-analytics"]
tech-stack:
  added: []
  patterns: ["immediate-sync", "confirmation-dialogs", "deadline-countdown"]
key-files:
  created:
    - src/lib/riddor-client.ts
    - components/treatment/RIDDOROverrideModal.tsx
  modified:
    - app/treatment/[id].tsx
decisions:
  - id: D-06-02-001
    decision: "Use direct Supabase API calls (not WatermelonDB sync queue) for RIDDOR overrides"
    rationale: "RIDDOR overrides must sync immediately for compliance tracking; cannot wait for offline sync queue processing"
    impact: "Override decisions persist immediately to backend, visible across all devices"
  - id: D-06-02-002
    decision: "Show deadline countdown with urgent styling when <=3 days or overdue"
    rationale: "HSE RIDDOR deadlines are strict (10/15 days); urgent visual warning prevents missed deadlines"
    implementation: "Red background + red text when daysRemaining <= 3"
  - id: D-06-02-003
    decision: "Mandatory reason field for all override decisions (confirm OR dismiss)"
    rationale: "Captures medic reasoning for algorithm tuning and audit trail; per Research CDS best practices"
    enforcement: "Validation prevents submission if reason.trim() is empty"
  - id: D-06-02-004
    decision: "Confirmation dialog when canceling modal with unsaved data"
    rationale: "Prevents accidental data loss when medic has entered action or reason"
    ux: "Alert with 'Keep Editing' vs 'Discard' options"
  - id: D-06-02-005
    decision: "Show RIDDOR status badges (yellow/red/gray) instead of replacing existing RIDDOR banner"
    rationale: "Existing banner shows is_riddor_reportable flag; new badges show override status from riddor_incidents table"
    coexistence: "Both can appear - banner for auto-flag, badges for medic decision"
duration: "12 min"
completed: "2026-02-16"
---

# Phase 06 Plan 02: Mobile Medic Override UI Workflow Summary

**One-liner:** Modal UI for medics to confirm/dismiss RIDDOR flags with mandatory reason capture, immediate sync, and deadline countdown with urgent styling

## What Was Built

### RIDDOR API Client (src/lib/riddor-client.ts)
**Functions:**
- `fetchRIDDORIncident(treatmentId)` - Fetches RIDDOR incident or returns null if not flagged
- `updateRIDDORIncident(incidentId, confirmed, reason, medicId)` - Updates medic decision with validation
- `daysUntilDeadline(deadlineDate)` - Calculates days remaining (negative if overdue)

**Key behavior:**
- Uses direct Supabase API (bypasses WatermelonDB sync queue)
- Throws error if reason is empty (validation at API level)
- Syncs immediately for compliance tracking

### RIDDOR Override Modal (components/treatment/RIDDOROverrideModal.tsx)
**Features:**
- Confidence level badge with color coding (HIGH=red, MEDIUM=amber, LOW=gray)
- Detection reason display for context
- Deadline countdown with urgent styling (red background when <=3 days or overdue)
- Action buttons: "✓ Yes, Confirm RIDDOR" and "✗ No, Not RIDDOR"
- Mandatory reason TextInput with multiline support
- Submit button with loading indicator during API call
- Cancel button with confirmation dialog if data entered
- ScrollView for content overflow on small screens

**Gloves-on compliance:**
- 56pt minimum tap targets on all buttons
- High contrast colors (blue #2563EB, red #EF4444, amber #F59E0B)
- Clear visual feedback for selected action (border + background change)
- Extended hit slop (+4pt) on all pressable elements

**UX flow:**
1. Medic selects Confirm or Dismiss (visual feedback)
2. Medic types reason in TextInput
3. Medic taps Submit Decision
4. Loading indicator shown
5. API call to updateRIDDORIncident
6. Success alert ("RIDDOR Override Saved")
7. onOverrideComplete callback refreshes UI
8. Modal closes

### Treatment Detail Integration (app/treatment/[id].tsx)
**Added state:**
- `riddorIncident: RIDDORIncident | null` - Current RIDDOR incident
- `showRiddorModal: boolean` - Modal visibility
- `currentUserId: string` - For override attribution

**Added effects:**
- Load current user ID from Supabase Auth
- Fetch RIDDOR incident when treatment ID changes
- Refresh RIDDOR incident after override

**UI sections added:**
1. **Yellow badge (awaiting review):** Shows when `medic_confirmed === null`
   - "⚠️ RIDDOR FLAG" text
   - "Review" button opens modal
   - Instruction text: "This treatment may be RIDDOR-reportable..."

2. **Red badge (confirmed):** Shows when `medic_confirmed === true`
   - "✓ RIDDOR CONFIRMED" text
   - Deadline date in UK format (dd/MM/yyyy)
   - Override reason

3. **Gray badge (dismissed):** Shows when `medic_confirmed === false`
   - "✗ RIDDOR DISMISSED" text
   - Override reason

**Badge styling:**
- Left border (4px) with color coding (amber/red/gray)
- Background tint matching border color
- Padding 16px, border radius 8px
- Margin bottom 16px (placed before Worker Information section)

## Deviations from Plan

None. Plan executed exactly as written.

## Technical Decisions

1. **Immediate sync over offline queue:** RIDDOR overrides must be visible immediately across all devices for compliance tracking
2. **Deadline urgency threshold:** Red styling triggers at <=3 days to give adequate warning before HSE deadline
3. **Mandatory reason validation:** Enforced at both API level (throws error) and UI level (alert dialog)
4. **Cancel confirmation:** Prevents accidental data loss when medic has partially filled form
5. **Badge placement:** Before Worker Information section (high visibility without disrupting existing layout)

## Dependencies Created

**For Plan 06-06 (Override Analytics):**
- override_reason field populated for all decisions (provides algorithm tuning data)
- overridden_by tracks which medic made decision (identifies training needs)
- overridden_at timestamp enables time-series analysis

**For Plan 06-04 (Web Dashboard):**
- RIDDOR incidents queryable via riddor-client functions
- Confidence levels and override status available for dashboard filtering

## Files Changed

### Created (2 files)
- `src/lib/riddor-client.ts` - RIDDOR API client (108 lines)
- `components/treatment/RIDDOROverrideModal.tsx` - Override modal component (261 lines)

### Modified (1 file)
- `app/treatment/[id].tsx` - Integrated RIDDOR override workflow (+115 lines)

## Verification Results

✅ RIDDOR API client functional:
- fetchRIDDORIncident returns incident or null
- updateRIDDORIncident syncs immediately (not via offline queue)
- daysUntilDeadline calculates correctly (resets time to midnight for accurate day count)

✅ Override modal UX:
- Confidence level displayed with color coding (HIGH red, MEDIUM amber, LOW gray)
- Detection reason shown for context
- Deadline countdown visible with urgent styling when <=3 days
- Action buttons toggle selected state (border + background)
- Reason field mandatory (validation prevents empty submission)
- Submit button shows loading indicator during API call
- Cancel confirmation prevents accidental data loss

✅ Treatment detail integration:
- RIDDOR indicator appears for auto-flagged treatments
- Review button opens modal
- Confirmed/dismissed badges replace indicator after override
- Override decision persists after page refresh (fetched from Supabase)

## Next Phase Readiness

**Blockers:** None

**Pending work for Phase 6 completion:**
1. Plan 06-03: HSE F2508 PDF generation with form field mapping
2. Plan 06-04: Web dashboard RIDDOR pages with deadline countdown
3. Plan 06-05: Deadline tracking cron job + email notifications
4. Plan 06-06: Override pattern analytics dashboard for algorithm tuning

**External dependencies:**
- HSE F2508 PDF form template (Plan 06-03 requires inspection of actual form field names)
- Resend API key for deadline emails (Plan 06-05, already in use from Phase 5)

## Commits

1. `9df107f` - feat(06-02): add RIDDOR override UI workflow for mobile medics

**Total:** 1 commit, 12 minutes, 484 lines of code added
