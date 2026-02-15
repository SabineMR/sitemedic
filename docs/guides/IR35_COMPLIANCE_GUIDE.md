# IR35 Compliance Guide for Medic Contractors

**CRITICAL RISK MITIGATION**: Prevent £100k-400k HMRC back taxes for misclassified employment
**Phase**: 6.5 (Payment Processing)
**Legal Status**: UK Off-Payroll Working Rules (IR35)

---

## Problem Statement

**Risk**: HMRC audits SiteMedic → Determines medics are "disguised employees" → Platform owes back taxes + penalties

**Calculation**:
- 10 medics × £30/hr × 40 hrs/week × 52 weeks = £624,000 annual payroll
- PAYE tax (20%) + National Insurance (13%) = 33% × £624k = £205,920
- Penalties (200% of tax owed) = £411,840
- **Total Liability**: £617,760

**Impact if Ignored**:
- Business bankruptcy (cannot afford £600k+ bill)
- HMRC prosecution
- Director personal liability

---

## IR35 Overview

### What is IR35?

**Off-Payroll Working Rules** (IR35) determine if contractors are:
- **Self-employed** (pay own tax, NI, VAT) - Platform NOT liable
- **Disguised employees** (should be on payroll) - Platform MUST pay PAYE + NI

### Who Decides?

**Since April 2021**: Platform (SiteMedic) is responsible for determining employment status, NOT the medic.

### HMRC Tests

HMRC uses **3 key tests**:
1. **Substitution**: Can medic send someone else to do the job?
2. **Control**: Does platform control when/where/how medic works?
3. **Mutuality of Obligation**: Is platform obligated to offer work? Is medic obligated to accept?

---

## Mitigation Strategy: Hybrid Model (Self-Employed + Umbrella Option)

### Default: Self-Employed Contractors

**Why**: Most medics are genuinely self-employed (work for multiple platforms, control own methods, provide own equipment)

**HMRC Compliance**:
1. **Right of Substitution**: Medics can send qualified substitute (documented in contract)
2. **No Control**: Platform does NOT control medic's clinical methods (only client requirement is qualified medic on-site)
3. **No Mutuality**: Platform offers shifts, medic accepts/declines at will (no obligation)

**Medic Responsibilities**:
- Register as self-employed with HMRC
- File annual Self Assessment tax return
- Pay own PAYE tax + Class 2/4 NI contributions
- Provide own equipment (first aid kit, PPE, tools)
- Can work for multiple clients (encouraged)

**Platform Responsibilities**:
- Do NOT withhold PAYE or NI
- Pay medic full amount (60% of booking revenue)
- Provide "Remittance Advice" (NOT payslip - that's employee language)
- Do NOT provide benefits (holiday pay, sick pay, pension)

---

### Option 2: Umbrella Company (Medic Choice)

**Why**: Some medics prefer employment status (simplicity, benefits)

**How It Works**:
1. Medic joins umbrella company (e.g., Parasol, Contractor Umbrella, Churchill Knight)
2. Umbrella company employs medic (PAYE, NI, benefits)
3. Platform pays umbrella company
4. Umbrella pays medic (minus tax, NI, umbrella fee)

**Benefits**:
- Medic receives payslip (feels like employee)
- Umbrella handles tax (medic doesn't file Self Assessment)
- Holiday pay, sick pay, pension contributions included
- IR35 risk eliminated (medic IS employee of umbrella)

**Costs**:
- Umbrella fee: £15-25/week
- Medic receives ~85% of gross pay (after tax, NI, umbrella fee)

**Platform Benefits**:
- Zero IR35 risk for umbrella medics
- Umbrella company handles all compliance
- Platform just pays umbrella (like any other supplier)

---

## Implementation: HMRC CEST Tool Assessment

### What is CEST?

**Check Employment Status for Tax** tool (provided by HMRC)
- Free online tool: https://www.tax.service.gov.uk/check-employment-status-for-tax
- Asks 35 questions about working relationship
- Provides determination: "Self-employed" or "Employed"
- **Legally binding** (HMRC accepts result if answered honestly)

### When to Run CEST

**For EVERY medic** during onboarding:
1. Admin completes CEST assessment
2. Saves result (PDF download)
3. Stores in database: `medics.cest_assessment_result`, `medics.cest_pdf_url`
4. Reviews result:
   - "Self-employed" → Proceed as contractor
   - "Employed" → Offer umbrella company option

---

## CEST Assessment Questions (Example)

**Question**: Can the worker send someone else to do the work instead of doing it themselves?
**Answer**: YES - Medic can send qualified substitute (with same certifications)
**Impact**: Strong indicator of self-employment

**Question**: Does the worker have to do the work personally?
**Answer**: NO - Substitute allowed
**Impact**: Supports self-employment

**Question**: Does the client have the right to decide what work the worker does?
**Answer**: NO - Client specifies need (medic on-site), but medic decides clinical methods
**Impact**: Supports self-employment

**Question**: Does the client have the right to decide how the work is done?
**Answer**: NO - Medic is qualified professional, makes own clinical decisions
**Impact**: Supports self-employment

**Question**: Does the client have the right to decide where the work is done?
**Answer**: PARTIALLY - Client specifies construction site location (required for service), but medic chooses how to travel, where to set up first aid station
**Impact**: Neutral (location requirement is nature of service, not control)

**Question**: Does the client have the right to decide the worker's working hours?
**Answer**: PARTIALLY - Client books shift (8 hours, 8am-4pm), but medic accepts or declines shift at will
**Impact**: Neutral (shift timing is client requirement, not employer control)

**Question**: Is the worker paid an hourly, daily, or weekly rate?
**Answer**: YES - £30/hour
**Impact**: Can indicate employment, but medics invoice per shift (like plumbers charge per hour)

**Question**: Is the worker paid a fixed price for the work done?
**Answer**: NO - Paid per hour
**Impact**: See above

**Question**: Does the worker get holiday pay or sick pay?
**Answer**: NO - Self-employed contractors don't receive benefits
**Impact**: Strong indicator of self-employment

**Question**: Does the worker risk having to put right unsatisfactory work at their own expense?
**Answer**: YES - If medic makes clinical error, medic's professional indemnity insurance covers (not platform)
**Impact**: Strong indicator of self-employment

**Question**: Is the worker in business on their own account?
**Answer**: YES - Medic can work for multiple platforms, advertises own services, has business cards
**Impact**: **Strongest indicator of self-employment**

**Expected CEST Result**: **Self-employed for tax purposes** ✅

---

## Onboarding Flow with IR35 Compliance

### Step 1: Medic Application
```
Medic applies via admin dashboard
    ↓
Admin reviews application
    ↓
Admin runs HMRC CEST assessment (35 questions)
    ↓
CEST result: "Self-employed" or "Employed"
    ↓
Admin saves CEST PDF to Supabase Storage
    ↓
Admin updates database: medics.cest_assessment_result
```

### Step 2: Medic Onboarding Email
```
Subject: Welcome to SiteMedic - Choose Your Payment Option

Hi Dr. Johnson,

Welcome! You can choose how you'd like to be paid:

OPTION 1: Self-Employed (Recommended)
- You keep more of your earnings (~95%)
- You file your own tax return (Self Assessment)
- You can work for multiple platforms
- You control your own schedule

Requirements:
- Register as self-employed with HMRC (takes 5 minutes)
- Provide Unique Taxpayer Reference (UTR)
- File annual Self Assessment tax return
- Recommended: Use accountant (costs £200-500/year)

[Choose Self-Employed]

---

OPTION 2: Umbrella Company
- Simpler tax (umbrella handles everything)
- You receive payslip like employee
- Holiday pay, sick pay, pension included
- You keep less (~85% after umbrella fee + tax)

Recommended umbrella companies:
- Parasol (£20/week)
- Contractor Umbrella (£18/week)
- Churchill Knight (£22/week)

[Choose Umbrella Company]

---

HMRC has determined your working arrangement is: Self-Employed
(CEST assessment result attached)

Questions? Contact support@sitemedic.com

Best,
SiteMedic Team
```

### Step 3: Self-Employed Medic Setup
```
Medic clicks "Choose Self-Employed"
    ↓
Medic enters UTR (Unique Taxpayer Reference)
    ↓
Medic confirms:
    [✓] I am registered as self-employed with HMRC
    [✓] I will file annual Self Assessment tax return
    [✓] I understand SiteMedic does NOT withhold tax or NI
    [✓] I have professional indemnity insurance
    ↓
Medic completes Stripe Express onboarding (bank account)
    ↓
✅ Onboarding complete - can accept shifts
```

### Step 4: Umbrella Company Medic Setup
```
Medic clicks "Choose Umbrella Company"
    ↓
Medic selects umbrella company:
    [ ] Parasol
    [ ] Contractor Umbrella
    [ ] Churchill Knight
    [ ] Other: _______
    ↓
Medic enters umbrella company details:
    - Company name: _______
    - Payment email: _______
    - Reference number: _______
    ↓
Platform stores umbrella details in database
    ↓
✅ Onboarding complete - platform pays umbrella, umbrella pays medic
```

---

## Database Schema for IR35 Compliance

```sql
-- Add to medics table (from migration 002_business_operations.sql)
ALTER TABLE medics ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'self_employed'; -- 'self_employed' or 'umbrella'
ALTER TABLE medics ADD COLUMN IF NOT EXISTS utr TEXT; -- Unique Taxpayer Reference (self-employed)
ALTER TABLE medics ADD COLUMN IF NOT EXISTS umbrella_company_name TEXT;
ALTER TABLE medics ADD COLUMN IF NOT EXISTS umbrella_payment_email TEXT;
ALTER TABLE medics ADD COLUMN IF NOT EXISTS umbrella_reference TEXT;
ALTER TABLE medics ADD COLUMN IF NOT EXISTS cest_assessment_result TEXT; -- 'self_employed' or 'employed'
ALTER TABLE medics ADD COLUMN IF NOT EXISTS cest_assessment_date DATE;
ALTER TABLE medics ADD COLUMN IF NOT EXISTS cest_pdf_url TEXT; -- Supabase Storage URL

-- Validation constraint
ALTER TABLE medics ADD CONSTRAINT valid_employment_status
  CHECK (employment_status IN ('self_employed', 'umbrella'));

-- Index for compliance reporting
CREATE INDEX idx_medics_employment_status ON medics(employment_status);
CREATE INDEX idx_medics_cest_result ON medics(cest_assessment_result);
```

---

## Contract Language (Self-Employed Medics)

### Critical Contract Clauses

**Clause 1: Right of Substitution**
```
The Medic may provide a suitably qualified substitute to perform the Services,
subject to:
(a) The substitute holds equivalent qualifications (CSCS, trauma certification, etc.)
(b) The Medic provides 24 hours' notice to the Platform
(c) The substitute has valid professional indemnity insurance

The Platform may reject the substitute if they do not meet qualification requirements.
```

**Clause 2: No Control Over Methods**
```
The Medic is a qualified medical professional and shall determine the clinical
methods and procedures used to deliver the Services. The Platform does NOT
control or supervise the Medic's clinical practice.

The Client's requirement is a qualified medic on-site. How the Medic delivers
medical services is at the Medic's sole professional discretion.
```

**Clause 3: No Mutuality of Obligation**
```
The Platform is under NO OBLIGATION to offer the Medic any minimum number of shifts.
The Medic is under NO OBLIGATION to accept any shift offered by the Platform.

The Medic may accept or decline shifts at will, without penalty or consequence.
```

**Clause 4: Business on Own Account**
```
The Medic confirms they are in business on their own account and:
(a) Can work for other platforms or clients simultaneously
(b) Advertise their own medical services independently
(c) Provide their own equipment (first aid kit, PPE, medical supplies)
(d) Bear financial risk (professional indemnity insurance, equipment costs)
```

**Clause 5: Not an Employee**
```
The Medic is an independent contractor, NOT an employee of the Platform.

The Medic is responsible for:
- Paying their own income tax and National Insurance
- Filing annual Self Assessment tax return with HMRC
- Providing own professional indemnity insurance
- Providing own equipment

The Platform will NOT:
- Withhold PAYE tax or National Insurance
- Provide holiday pay, sick pay, or pension contributions
- Provide employment benefits of any kind
```

**Clause 6: Invoicing**
```
The Medic shall invoice the Platform for Services rendered.

The Platform shall pay the Medic within 2 business days of invoice approval
(weekly Friday payout schedule).

Payment is made as a commercial transaction between businesses, NOT as wages to an employee.
```

---

## HMRC Audit Preparedness

### If HMRC Audits SiteMedic

**Step 1: Provide CEST Assessments**
- Show CEST result for each medic: "Self-employed for tax purposes"
- HMRC accepts CEST results if answered honestly
- Store PDF evidence in Supabase Storage

**Step 2: Provide Contracts**
- Show medic contracts with right of substitution, no control, no mutuality clauses
- HMRC reviews language to verify genuine self-employment

**Step 3: Show Medic Behavior**
- Medics work for multiple platforms (evidenced by lower utilization %)
- Medics provide own equipment (first aid kits, PPE)
- Medics advertise own services (business cards, websites)

**Step 4: Show No Benefits Paid**
- No holiday pay, sick pay, pension contributions in payment records
- Only "Remittance Advice" provided (not payslips)

**Step 5: Show Umbrella Option**
- Some medics chose umbrella company (proving choice was genuine)
- Platform has zero IR35 risk for umbrella medics

**HMRC Conclusion**: Medics are genuinely self-employed ✅

---

## Compliance Checklist

- [ ] **Onboarding**:
  - [ ] Run HMRC CEST assessment for every medic
  - [ ] Save CEST result PDF to Supabase Storage
  - [ ] Store result in database: `medics.cest_assessment_result`
  - [ ] Offer umbrella company option (even if CEST says self-employed)

- [ ] **Contracts**:
  - [ ] Right of substitution clause included
  - [ ] No control over methods clause included
  - [ ] No mutuality of obligation clause included
  - [ ] "Business on own account" clause included
  - [ ] "Not an employee" disclaimer included

- [ ] **Payouts**:
  - [ ] Do NOT withhold PAYE or NI for self-employed medics
  - [ ] Provide "Remittance Advice" (NOT payslips)
  - [ ] Pay umbrella companies for umbrella medics

- [ ] **Evidence**:
  - [ ] Store CEST PDFs for 6 years (HMRC audit period)
  - [ ] Store contracts for 6 years
  - [ ] Track which medics work for multiple platforms (evidence of genuine self-employment)

- [ ] **Legal Review**:
  - [ ] Have UK employment law solicitor review contracts (annually)
  - [ ] Review HMRC IR35 guidance changes (quarterly)

---

## Costs of Compliance

**Self-Employed Medic (Platform Perspective)**:
- CEST assessment: FREE (HMRC tool)
- Legal review (annual): £1,000-2,000 (solicitor fees)
- HMRC audit defense (if audited): £5,000-10,000 (accountant fees)

**Umbrella Company Medic (Platform Perspective)**:
- Zero additional cost (umbrella handles all compliance)
- Platform just pays umbrella like any supplier

**Medic Perspective (Self-Employed)**:
- Accountant fees: £200-500/year (optional but recommended)
- Professional indemnity insurance: £300-600/year (required)
- Self Assessment tax filing: FREE (if self-filing) or included in accountant fees

---

## Red Flags (HMRC Would Challenge)

❌ **BAD**: Medic works ONLY for SiteMedic (no other clients)
✅ **GOOD**: Medic works for 3 platforms + NHS shifts

❌ **BAD**: Platform provides medic's equipment (first aid kit)
✅ **GOOD**: Medic brings own first aid kit, PPE, tools

❌ **BAD**: Platform dictates clinical methods ("You must use this bandage technique")
✅ **GOOD**: Medic makes own clinical decisions (qualified professional)

❌ **BAD**: Contract says "Medic must accept all shifts offered"
✅ **GOOD**: Contract says "Medic may accept or decline shifts at will"

❌ **BAD**: Medic receives holiday pay, sick pay, pension
✅ **GOOD**: No employment benefits whatsoever

❌ **BAD**: Platform pays medic "wages" via "payslip"
✅ **GOOD**: Platform pays medic "fees" via "remittance advice" (invoice payment)

---

## Success Metrics

- **CEST Assessment Rate**: 100% (every medic assessed before onboarding)
- **Legal Review**: Annual (contracts reviewed by UK employment solicitor)
- **HMRC Audit Pass Rate**: 100% (if audited, zero tax owed)
- **Umbrella Option Offered**: 100% (even if CEST says self-employed, offer choice)

---

## Support Resources

- **HMRC CEST Tool**: https://www.tax.service.gov.uk/check-employment-status-for-tax
- **HMRC IR35 Guidance**: https://www.gov.uk/guidance/off-payroll-working-ir35-overview
- **HMRC Helpline**: 0300 123 2326
- **UK Employment Law Solicitors**: Consult annually (costs £1,000-2,000)

---

**CRITICAL**: Run CEST assessment for EVERY medic. Store result for 6 years. Offer umbrella option to ALL medics. This prevents the £100k-400k back tax risk.
