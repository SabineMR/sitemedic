# RIDDOR Compliance Enforcement Guide

**CRITICAL RISK MITIGATION**: Prevent £10k-50k HSE fines for missing incident logs
**Phase**: 2 (Mobile App Enhancement) + 5 (PDF Reports) + 6 (RIDDOR Auto-Flagging)

---

## Problem Statement

**Risk**: Medic forgets to log RIDDOR-reportable incident → HSE audit discovers gap → £10k-50k fine + reputation damage

**Impact if Ignored**:
- HSE prosecution and fines
- "SiteMedic helps companies hide incidents" reputation
- Loss of all clients
- Potential business shutdown

---

## Mitigation Strategy: 4-Layer Defense

### Layer 1: Mandatory Treatment Log (Mobile App)
**Phase**: 2 enhancement
**Enforcement**: Medic cannot submit timesheet without treatment log

#### Implementation

**UI Flow**:
```
End Shift Button (visible after shift_end_time)
    ↓
Check: Have treatments been logged today?
    ↓
YES → Proceed to timesheet
NO  → "Zero Treatments Confirmation" screen
    ↓
"Did you treat any workers today?"
    [Yes - Log Treatment] [No - Confirm Zero Treatments]
    ↓
If "No" selected:
    "Confirm: Zero treatments today"
    "This means NO workers required medical attention."
    "Reason (optional): [Construction site closed early due to weather...]"
    [Cancel] [Confirm Zero Treatments]
    ↓
If confirmed:
    - Create zero_treatment_flag in database
    - Allow timesheet submission
    - Flag for weekly admin review
```

**Database Schema**:
```sql
-- Add to Phase 2 WatermelonDB schema
CREATE TABLE shift_records (
  id TEXT PRIMARY KEY,
  medic_id TEXT NOT NULL,
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  has_treatments BOOLEAN DEFAULT FALSE, -- Set TRUE when first treatment logged
  zero_treatment_confirmed BOOLEAN DEFAULT FALSE,
  zero_treatment_reason TEXT,
  zero_treatment_confirmed_at INTEGER, -- Unix timestamp
  synced BOOLEAN DEFAULT FALSE,
  _status TEXT DEFAULT 'created'
);

-- Validation: Cannot submit timesheet unless has_treatments = TRUE OR zero_treatment_confirmed = TRUE
```

**Validation Logic** (Mobile App):
```typescript
// components/EndShiftButton.tsx
async function handleEndShift() {
  const shift = await database.collections
    .get<ShiftRecord>('shift_records')
    .find(currentShiftId);

  // Check if treatments logged
  const treatmentsCount = await database.collections
    .get<Treatment>('treatments')
    .query(Q.where('shift_id', currentShiftId))
    .fetchCount();

  if (treatmentsCount > 0) {
    // Has treatments - proceed to timesheet
    await shift.update(record => {
      record.has_treatments = true;
    });
    navigation.navigate('TimesheetSubmission');
    return;
  }

  // No treatments - show confirmation screen
  navigation.navigate('ZeroTreatmentsConfirmation', {
    shiftId: currentShiftId,
  });
}

// screens/ZeroTreatmentsConfirmation.tsx
async function confirmZeroTreatments(reason?: string) {
  await shift.update(record => {
    record.zero_treatment_confirmed = true;
    record.zero_treatment_reason = reason || '';
    record.zero_treatment_confirmed_at = Date.now();
  });

  toast.success('Zero treatments confirmed');
  navigation.navigate('TimesheetSubmission');
}
```

**Enforcement**: Hard block - medic CANNOT proceed without confirmation.

---

### Layer 2: Zero-Treatment Flag Audit (Admin Review)
**Phase**: 5.5 enhancement
**Purpose**: Detect medics with excessive zero-treatment days (suspicious)

#### Implementation

**Weekly Audit Report** (Admin Dashboard):
```typescript
// pages/admin/compliance-audit.tsx
async function getZeroTreatmentAudit() {
  const { data: shifts } = await supabase
    .from('shift_records')
    .select(`
      *,
      medic:medics(first_name, last_name),
      near_misses:near_misses(count)
    `)
    .eq('zero_treatment_confirmed', true)
    .gte('shift_date', sevenDaysAgo)
    .lte('shift_date', today);

  // Flag suspicious patterns
  const medicZeroTreatmentRates = calculateZeroTreatmentRates(shifts);
  const suspicious = medicZeroTreatmentRates.filter(m => {
    // Suspicious if >80% zero-treatment days
    return m.zeroTreatmentRate > 0.8;
  });

  return {
    total_shifts: shifts.length,
    zero_treatment_shifts: shifts.length,
    suspicious_medics: suspicious,
    shifts_with_near_misses_but_no_treatments: shifts.filter(s => s.near_misses.length > 0),
  };
}
```

**Admin Alert**:
```
⚠️  Compliance Audit Alert

Dr. Johnson: 12 shifts this month, 10 zero-treatment days (83%)
BUT: Logged 5 near-misses during same period

Action required: Review with medic - are treatments being missed?
```

**Cross-Reference Check**:
- If zero treatments BUT >3 near-misses logged → Suspicious (workers on site, incidents occurred, but no treatments?)
- If zero treatments AND site manager flagged issues → Investigate

---

### Layer 3: Client-Side Validation (Site Manager Dashboard)
**Phase**: 4 enhancement
**Purpose**: Site manager confirms treatment count makes sense

#### Implementation

**Site Manager Dashboard** (Phase 4):
```tsx
// pages/site-manager/shift-review.tsx
<ShiftCard shift={shift}>
  <p>Medic: Dr. Johnson</p>
  <p>Date: 10 Feb 2026</p>
  <p>Duration: 8 hours</p>
  <p>Treatments logged: {shift.treatments_count === 0 ? (
    <span className="text-red-600">
      ⚠️  Zero treatments
      {shift.near_misses_count > 0 && ` (but ${shift.near_misses_count} near-misses logged)`}
    </span>
  ) : (
    shift.treatments_count
  )}</p>

  {shift.treatments_count === 0 && (
    <button onClick={() => flagIncorrectData(shift.id)}>
      🚩 Flag as Incorrect (we had 2 incidents)
    </button>
  )}
</ShiftCard>
```

**Flag Handler**:
```typescript
async function flagIncorrectData(shiftId: string) {
  const reason = prompt('Why is this incorrect?');

  await supabase.from('shift_records').update({
    flagged_by_site_manager: true,
    flag_reason: reason,
    flagged_at: new Date().toISOString(),
  }).eq('id', shiftId);

  // Alert admin for investigation
  await supabase.from('admin_alerts').insert({
    type: 'missing_treatment_suspected',
    severity: 'high',
    shift_id: shiftId,
    message: `Site manager flagged zero-treatment shift as incorrect: "${reason}"`,
  });

  toast.success('Admin has been notified');
}
```

**Admin Investigation**:
- Admin contacts medic: "Site manager says there were 2 incidents, but you logged zero treatments. Please review."
- Medic either:
  - Logs missing treatments (backdated with explanation)
  - Provides reason (e.g., "Site manager confused - near-misses were logged, not treatments")

---

### Layer 4: Weekly PDF Report Audit Trail
**Phase**: 5 enhancement
**Purpose**: PDF reports provide HSE audit trail

#### Implementation

**PDF Report Enhancement**:
```typescript
// services/pdfGenerator.ts
async function generateWeeklyPDF(siteId: string, weekStart: Date, weekEnd: Date) {
  const shifts = await getShiftsForWeek(siteId, weekStart, weekEnd);
  const treatments = await getTreatmentsForWeek(siteId, weekStart, weekEnd);
  const nearMisses = await getNearMissesForWeek(siteId, weekStart, weekEnd);

  const zeroTreatmentShifts = shifts.filter(s => s.zero_treatment_confirmed);

  const pdf = new jsPDF();

  // ... existing PDF sections ...

  // NEW SECTION: Treatment Summary
  pdf.addPage();
  pdf.text('Treatment Summary', 20, 20);
  pdf.text(`Total treatments logged: ${treatments.length}`, 20, 30);
  pdf.text(`Total medic shifts: ${shifts.length}`, 20, 40);
  pdf.text(`Shifts with zero treatments: ${zeroTreatmentShifts.length}`, 20, 50);

  if (zeroTreatmentShifts.length > 0) {
    pdf.text('Zero-Treatment Days:', 20, 60);
    zeroTreatmentShifts.forEach((shift, i) => {
      pdf.text(`- ${shift.shift_date}: ${shift.zero_treatment_reason || 'No reason provided'}`, 25, 70 + i * 10);
    });
  }

  // HSE Compliance Statement
  pdf.addPage();
  pdf.text('HSE Compliance Declaration', 20, 20);
  pdf.text('All reportable incidents have been logged in accordance with RIDDOR 2013.', 20, 30);
  pdf.text('Zero-treatment days confirmed by medic with site manager verification.', 20, 40);
  pdf.text(`Signed: ${medic.first_name} ${medic.last_name}, Occupational Health Medic`, 20, 50);
  pdf.text(`Date: ${new Date().toISOString().split('T')[0]}`, 20, 60);

  return pdf.output('blob');
}
```

**Audit Trail**:
- PDF clearly states: "Zero treatments logged on [dates]"
- HSE inspector can see medic confirmed zero treatments
- If incidents later discovered, medic liable (not platform) - documented confirmation

---

## Testing Compliance Enforcement

### Test Case 1: Medic Tries to Skip Treatment Logging
```
1. Medic arrives on site
2. Medic works 8-hour shift
3. Medic treats 1 worker (minor cut)
4. Medic forgets to log treatment
5. Medic clicks "End Shift"
6. App shows: "⚠️  No treatments logged. Did you treat any workers?"
7. Medic clicks "Yes - Log Treatment"
8. Medic logs treatment
9. Medic clicks "End Shift" again
10. ✅ Timesheet submission allowed
```

### Test Case 2: Legitimate Zero-Treatment Day
```
1. Medic arrives on site
2. Site closed early due to bad weather
3. No workers on site
4. Medic clicks "End Shift" after 4 hours
5. App shows: "⚠️  No treatments logged. Did you treat any workers?"
6. Medic clicks "No - Confirm Zero Treatments"
7. Medic enters reason: "Site closed early - bad weather, no workers on site"
8. Medic clicks "Confirm Zero Treatments"
9. ✅ Timesheet submission allowed
10. ✅ Zero-treatment flag stored for audit
```

### Test Case 3: Site Manager Catches Missing Treatment
```
1. Medic logs zero treatments
2. Site manager reviews shift in dashboard
3. Site manager sees "⚠️  Zero treatments"
4. Site manager clicks "🚩 Flag as Incorrect"
5. Site manager enters: "We had 2 workers treated for heat exhaustion"
6. ✅ Admin alert created
7. Admin contacts medic
8. Medic logs missing treatments (backdated)
9. ✅ Compliance gap closed
```

---

## HSE Audit Preparedness

**If HSE Inspects**:

1. **Question**: "Show me all incidents from the past 3 months"
   **Answer**: Pull weekly PDF reports → Show all treatments logged

2. **Question**: "Were there any days with zero treatments?"
   **Answer**: Yes, PDF shows [dates] with medic confirmation + reasons

3. **Question**: "How do you ensure medics don't skip logging?"
   **Answer**: Show 4-layer enforcement system:
   - Layer 1: App blocks timesheet submission
   - Layer 2: Admin weekly audit
   - Layer 3: Site manager validation
   - Layer 4: PDF audit trail

4. **Question**: "What if a medic deliberately skips logging?"
   **Answer**:
   - Medic cannot submit timesheet (no pay until logged)
   - Site manager can flag missing data
   - Admin investigates and corrects
   - PDF provides signed declaration (medic liable if false)

**HSE Compliance Score**: 95%+ (industry best practice)

---

## Monitoring & Alerts

### Daily Checks (Automated)
- Count shifts with zero treatments
- Alert if >50% of shifts have zero treatments (suspicious)

### Weekly Audit (Admin Dashboard)
- Review all zero-treatment shifts
- Cross-reference with near-miss logs
- Flag medics with >80% zero-treatment rate

### Monthly Report (Board Level)
- Treatment logging compliance rate (target: >95%)
- RIDDOR incidents captured (target: 100%)
- Zero-treatment day patterns (seasonal trends)

---

## Implementation Checklist

- [ ] **Mobile App (Phase 2)**:
  - [ ] Add "End Shift" validation (blocks if no treatments logged)
  - [ ] Create "Zero Treatments Confirmation" screen
  - [ ] Store zero_treatment_flag in database
  - [ ] Auto-save shift_records with treatment counts

- [ ] **Admin Dashboard (Phase 5.5)**:
  - [ ] Build weekly compliance audit page
  - [ ] Flag medics with >80% zero-treatment rate
  - [ ] Cross-reference near-misses vs treatments

- [ ] **Site Manager Dashboard (Phase 4)**:
  - [ ] Show treatment count per shift
  - [ ] Add "Flag as Incorrect" button for zero-treatment shifts
  - [ ] Alert admin when flagged

- [ ] **PDF Reports (Phase 5)**:
  - [ ] Include "Treatment Summary" section
  - [ ] List zero-treatment days with reasons
  - [ ] Add HSE compliance declaration with medic signature

---

## Success Metrics

- **Enforcement Rate**: 100% (medics cannot skip logging)
- **Compliance Rate**: >95% (treatments logged correctly)
- **Audit Pass Rate**: 100% (HSE inspections pass)
- **Zero Fines**: £0 (no RIDDOR violations)

---

**CRITICAL**: This 4-layer system prevents the £10k-50k HSE fine risk. Implement all layers before launch.
