# Risk Mitigation Strategy: SiteMedic Business Operations

**Document**: Comprehensive risk analysis and mitigation for business operations
**Created**: 2026-02-15
**Purpose**: Identify and mitigate risks that could derail the business

---

## Overview

The business operations layer introduces **8 major risk categories** that could impact revenue, cash flow, compliance, or scaling. Each risk has specific mitigation strategies and monitoring systems.

**Risk Severity Levels**:
- **CRITICAL** = Could shut down the business (cash flow crisis, regulatory violation)
- **HIGH** = Could cause significant revenue loss or client churn
- **MEDIUM** = Could impact operations but recoverable
- **LOW** = Minor inconvenience, easily addressed

---

## Risk 1: Cash Flow Gap (Pay Medics Before Collecting from Clients)

**Severity**: CRITICAL
**Phases Affected**: 6.5 (Payment Processing), 5.5 (Revenue Dashboard)

### Problem
- **Timing Gap**: Pay medics Friday Week 1, collect from Net 30 clients Week 5 (30 days later)
- **Example**: Medic works £1,000 shift Week 1 → Platform pays medic £600 (60%) Friday Week 1 → Client pays platform £1,000 Week 5
- **Cash Flow Impact**: 30-day gap × weekly bookings = significant working capital requirement
- **Worst Case**: 20 medics × £500/week payout = £10,000/week × 4 weeks = £40,000 cash gap

### Impact if Ignored
- **Week 5**: Run out of cash, cannot pay medics
- **Week 6**: Medics quit, business shuts down
- **Estimated Cost**: Total business failure

### Mitigation Strategies

#### Strategy 1: Prepay for New Clients
**Implementation**:
- All new clients must prepay via Stripe before medic is assigned
- Payment Intent created when booking confirmed
- Funds held in platform account until shift completes
- Eliminates cash flow gap for new clients

**Coverage**: ~40-50% of bookings (new clients)

---

#### Strategy 2: Credit Limits for Net 30 Clients
**Implementation**:
- Established clients (3+ successful bookings, no late payments) can upgrade to Net 30
- Credit limit based on payment history: £1,000-5,000
- Outstanding balance tracked in `clients.outstanding_balance`
- Auto-suspend if balance exceeds credit limit

```sql
-- Example credit limit check
SELECT
  client_id,
  company_name,
  outstanding_balance,
  credit_limit,
  (outstanding_balance / credit_limit * 100) AS utilization_percent
FROM clients
WHERE payment_terms = 'net_30'
  AND outstanding_balance > credit_limit * 0.8; -- Alert at 80% utilization
```

**Coverage**: ~50-60% of bookings (established clients)

---

#### Strategy 3: Cash Flow Dashboard Warning
**Implementation**:
- Revenue dashboard (Phase 5.5) shows cash flow projection
- Warns when gap >30 days OR cash reserves <£20,000
- Daily email alert to admin if critical threshold crossed

**Dashboard UI**:
```
Cash Flow Projection
┌────────────────────────────────────────────────┐
│ Current Cash Reserve: £15,000 ⚠️               │
│ Medic Payouts This Week: £8,000               │
│ Client Payments This Week: £2,000             │
│                                                │
│ ⚠️ WARNING: Cash gap >30 days                 │
│ Expected shortfall: £6,000 by Feb 28          │
│                                                │
│ Recommended Actions:                           │
│ - Convert 5 Net 30 clients to prepay          │
│ - Delay hiring new medics until Mar 15        │
│ - Consider line of credit (£10k)              │
└────────────────────────────────────────────────┘
```

**Coverage**: Monitoring + early warning system

---

#### Strategy 4: Cash Reserves Requirement
**Implementation**:
- Maintain cash reserves = 30 days of medic payouts
- Example: 10 medics × £500/week × 4 weeks = £20,000 cash reserve
- Source: Personal investment, business loan, or line of credit

**Coverage**: Safety net for worst-case scenario

---

### Monitoring

**Daily Metrics**:
- Cash balance
- Outstanding invoices (Net 30 clients)
- Payouts due Friday
- Gap = Payouts due - Cash available

**Alert Thresholds**:
- **Yellow**: Cash gap >20 days OR reserves <£15,000
- **Red**: Cash gap >30 days OR reserves <£10,000
- **Critical**: Cash insufficient for Friday payout (<£5,000)

**Automated Actions**:
- Yellow: Email admin daily
- Red: Suspend new Net 30 client approvals
- Critical: Halt all new bookings until cash restored

---

## Risk 2: Medic No-Show (Client Loses Trust)

**Severity**: HIGH
**Phases Affected**: 4.5 (Booking Portal), 5.5 (Admin Dashboard), 7.5 (Territory Management)

### Problem
- Medic confirms booking but doesn't show up for shift
- Client site has no medical coverage (safety risk, compliance violation)
- Client loses trust in platform → churn

### Impact if Ignored
- **Client Impact**: Safety incident without medic → potential HSE violation
- **Reputation**: 1 no-show = client tells 10 others → word-of-mouth damage
- **Churn Rate**: 50% probability client cancels all future bookings
- **Estimated Cost**: Lifetime value of client (£10k-50k)

### Mitigation Strategies

#### Strategy 1: Secondary Backup Medic
**Implementation**:
- Auto-assignment algorithm (Phase 7.5) assigns secondary medic for critical bookings
- Secondary medic on standby (notified 24 hours before shift)
- If primary no-show (30 min late), secondary automatically activated
- Client receives SMS: "Your primary medic is delayed. Backup medic Dr. Smith arriving in 20 min."

**Coverage**: 90% of no-shows covered within 30 minutes

---

#### Strategy 2: SMS Reminders
**Implementation**:
- 24 hours before shift: "Reminder: You have a shift at ABC Construction tomorrow at 8am"
- 2 hours before shift: "Shift starts in 2 hours. Reply CONFIRM or CANCEL."
- No response = Admin notification + secondary medic activated

**Coverage**: Reduces no-shows by ~60% (industry standard for reminder systems)

---

#### Strategy 3: Medic Penalties
**Implementation**:
- 1st no-show: Warning + mandatory call with admin
- 2nd no-show within 90 days: £50 penalty (deducted from next payout)
- 3rd no-show within 90 days: Account suspended (no longer eligible for bookings)

**Coverage**: Deterrent for repeat offenders

---

#### Strategy 4: Client Credit
**Implementation**:
- Client receives full refund for no-show (medic penalty covers cost)
- Plus £50 credit toward next booking (goodwill gesture)
- Admin calls client to apologize and guarantee backup for future bookings

**Coverage**: Retains 70-80% of clients after no-show incident

---

### Monitoring

**No-Show Metrics**:
- No-show rate per medic (target: <2%)
- Client retention after no-show (target: >70%)
- Time to backup medic arrival (target: <30 minutes)

**Alert Thresholds**:
- Any no-show = Immediate admin notification
- Medic >5% no-show rate = Suspension review
- No-show rate across platform >2% = Process review

---

## Risk 3: Auto-Assignment Errors (Unqualified Medic Assigned)

**Severity**: HIGH (Safety Risk)
**Phases Affected**: 7.5 (Auto-Assignment), 5.5 (Admin Dashboard)

### Problem
- Algorithm assigns medic without required qualifications (e.g., confined space certification)
- Medic arrives on site, cannot legally work in confined spaces
- Client site non-compliant → HSE violation risk

### Impact if Ignored
- **Safety Risk**: Unqualified medic cannot respond to confined space emergency
- **Legal Risk**: HSE fine £5,000-20,000 for non-compliance
- **Reputation**: Client never books again, tells industry contacts
- **Estimated Cost**: £20,000 fine + £50,000 lost client LTV

### Mitigation Strategies

#### Strategy 1: Hard Validation at Assignment
**Implementation**:
- Before auto-assignment confirms medic, validate:
  - Confined space cert (if `booking.confined_space_required = TRUE`)
  - Trauma specialist cert (if `booking.trauma_specialist_required = TRUE`)
  - All certifications not expired
- If validation fails, medic excluded from candidate pool

```javascript
// Auto-assignment validation
const isQualified = (medic, booking) => {
  if (booking.confined_space_required && !medic.has_confined_space_cert) {
    return false; // Exclude medic
  }
  if (booking.trauma_specialist_required && !medic.has_trauma_cert) {
    return false;
  }
  // Check cert expiry
  const certs = medic.certifications; // JSONB
  if (booking.confined_space_required) {
    const cert = certs.find(c => c.type === 'confined_space');
    if (!cert || new Date(cert.expiry_date) < new Date()) {
      return false; // Cert expired
    }
  }
  return true;
};
```

**Coverage**: 100% of auto-assignments validated before confirmation

---

#### Strategy 2: Manual Review for Complex Bookings
**Implementation**:
- Bookings with special requirements flagged for manual admin review
- Admin sees: "Confined space required. Recommended medic: Dr. Johnson (Confined Space Cert expires 2027-06-15)"
- Admin confirms qualifications before assignment

**Coverage**: High-risk bookings (confined space, trauma specialist, emergency)

---

#### Strategy 3: Medic Can Reject Assignment
**Implementation**:
- After auto-assignment, medic receives notification: "New booking at ABC Construction (confined space). Accept or Decline?"
- Medic has 1 hour to respond
- If medic declines (e.g., "I'm not comfortable with this site"), admin reassigns
- Decline reason tracked (if pattern emerges, review qualifications)

**Coverage**: Final safety check by medic themselves

---

#### Strategy 4: Client Verification at Site
**Implementation**:
- Medic shows certifications on arrival (physical card or mobile app QR code)
- Site manager scans QR code → confirms medic qualifications via dashboard
- If mismatch detected, client can reject medic → full refund + platform finds replacement

**Coverage**: Real-time verification at point of service

---

### Monitoring

**Assignment Error Metrics**:
- Qualification mismatch incidents (target: 0)
- Medic declines due to lack of qualifications (target: <2%)
- Client rejects medic on arrival (target: <1%)

**Alert Thresholds**:
- Any qualification mismatch = Immediate admin notification + algorithm review
- >1 incident/month = Hard stop on auto-assignment until fix deployed

---

## Risk 4: Google Maps API Costs (API Charges Eat Profits)

**Severity**: MEDIUM
**Phases Affected**: 1.5 (Google Maps Integration), 7.5 (Auto-Assignment)

### Problem
- Google Maps Distance Matrix API: ~£0.005 per origin-destination pair
- 100 bookings/week × 5 candidate medics = 500 API calls/week
- 500 calls/week × £0.005 = £2.50/week (£130/year)
- Not catastrophic, but scales linearly with bookings
- At 1,000 bookings/week: £25/week = £1,300/year

### Impact if Ignored
- **Low Volume**: Negligible (£130/year)
- **High Volume**: Significant (£1,300/year at 1,000 bookings/week)
- **Runaway Costs**: If caching fails or algorithm calls excessively, could spike to £10k+/year

### Mitigation Strategies

#### Strategy 1: 7-Day Result Caching
**Implementation** (Phase 1.5):
- Cache all Google Maps results in `travel_time_cache` table
- TTL = 7 days (traffic patterns relatively stable week-to-week)
- Before API call, check cache:

```javascript
// Check cache first
const cached = await supabase
  .from('travel_time_cache')
  .select('*')
  .eq('origin_postcode', medic.home_postcode)
  .eq('destination_postcode', booking.site_postcode)
  .gte('expires_at', new Date().toISOString())
  .single();

if (cached) {
  return { travelTime: cached.travel_time_minutes, source: 'cache' };
}

// Cache miss → call Google Maps API
const result = await callGoogleMapsAPI(medic.home_postcode, booking.site_postcode);

// Store in cache
await supabase.from('travel_time_cache').insert({
  origin_postcode: medic.home_postcode,
  destination_postcode: booking.site_postcode,
  travel_time_minutes: result.travelTime,
  distance_miles: result.distance,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});
```

**Coverage**: ~70-80% of API calls avoided (most bookings use same medic-site pairs repeatedly)

**Cost Savings**: £130/year → £26-39/year (80% reduction)

---

#### Strategy 2: Batch Requests
**Implementation**:
- Instead of 1 API call per medic-site pair, batch 10 pairs into single request
- Google Maps allows up to 100 origins × 100 destinations per request
- Cost: Same (£0.005 per pair), but fewer HTTP requests = faster

**Coverage**: Performance optimization, not cost savings

---

#### Strategy 3: Haversine Distance Fallback
**Implementation**:
- If Google Maps API unavailable (rate limit, outage, quota exceeded), use haversine formula
- Straight-line distance × 1.3 (urban road multiplier) ÷ 30 mph = estimated travel time
- Accuracy: ~70% (good enough for ranking, not billing)

```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Straight-line distance in miles
  return Math.round((distance * 1.3 / 30) * 60); // Estimated travel time in minutes
}
```

**Coverage**: Backup for 100% of failed API calls

---

#### Strategy 4: Monitoring & Alerts
**Implementation**:
- Track API call volume daily
- Alert if >£10/day spend (anomaly detection)
- Alert if cache hit rate <60% (caching not working)

**Dashboard**:
```
Google Maps API Usage
┌────────────────────────────────────────────┐
│ This Week: 120 API calls                  │
│ Cache Hits: 380 (76% hit rate) ✅          │
│ Cost This Month: £3.20                     │
│ Projected Annual: £41.60                   │
└────────────────────────────────────────────┘
```

---

### Monitoring

**Cost Metrics**:
- API calls per week (target: <200)
- Cache hit rate (target: >70%)
- Monthly API cost (target: <£10)

**Alert Thresholds**:
- Daily cost >£5 = Review for runaway calls
- Cache hit rate <50% = Investigate caching logic
- Projected annual cost >£500 = Consider alternative (Mapbox, HERE, etc.)

---

## Risk 5: RIDDOR Compliance Gap (Medic Doesn't Log Treatments)

**Severity**: CRITICAL (Regulatory)
**Phases Affected**: 2 (Mobile App), 6 (RIDDOR Auto-Flagging)

### Problem
- Medic forgets to log treatment (or deliberately skips to save time)
- RIDDOR-reportable incident not captured
- HSE audit discovers missing incident → £10,000-50,000 fine

### Impact if Ignored
- **Legal**: HSE prosecution, fines £10k-50k per incident
- **Reputation**: "SiteMedic helps companies hide RIDDOR incidents" → business death
- **Estimated Cost**: £50,000 fine + loss of all clients

### Mitigation Strategies

#### Strategy 1: Mandatory Treatment Log Before End Shift
**Implementation** (Phase 2 enhancement):
- Medic cannot submit timesheet until at least 1 treatment logged (even if "No treatments today")
- UI flow:

```
End Shift
┌────────────────────────────────────────┐
│ ⚠️ No treatments logged today          │
│                                        │
│ Did you treat any workers? [Yes] [No] │
└────────────────────────────────────────┘

If No:
┌────────────────────────────────────────┐
│ Confirm: Zero treatments today         │
│ Reason: (optional)                     │
│ [No incidents occurred                 │
│  All workers healthy          ]        │
│                                        │
│ [Confirm & Submit Timesheet]           │
└────────────────────────────────────────┘
```

**Coverage**: 100% of shifts have treatment log (even if zero treatments)

---

#### Strategy 2: Zero-Treatment Flag for Audit
**Implementation**:
- If medic logs "No treatments today", flag in database: `zero_treatments = TRUE`
- Weekly admin review: Check for medics with excessive zero-treatment days (>80%)
- Cross-reference with near-miss logs (if no treatments BUT 5 near-misses logged, suspicious)

**Coverage**: Audit trail for HSE inspectors

---

#### Strategy 3: Weekly Audit Report
**Implementation** (Phase 5 enhancement):
- Weekly PDF report includes:
  - Total treatments logged
  - Zero-treatment days
  - RIDDOR incidents flagged
  - Missing data warnings (e.g., "Dr. Johnson: 3 shifts with no treatment logs")
- Admin reviews before finalizing report

**Coverage**: Proactive detection of compliance gaps

---

#### Strategy 4: Client Visibility
**Implementation**:
- Site manager dashboard (Phase 4) shows treatment count per shift
- If medic worked 8-hour shift but logged zero treatments, site manager can flag: "This seems wrong, we had 2 incidents"
- Triggers admin investigation

**Coverage**: Client-side validation

---

### Monitoring

**Compliance Metrics**:
- % of shifts with treatment logs (target: 100%)
- Zero-treatment days per medic (target: <50%)
- RIDDOR incidents captured (target: 100% of reportable incidents)

**Alert Thresholds**:
- Shift ended but no treatment log submitted for 24 hours = Admin notification
- Medic >80% zero-treatment days = Compliance review
- RIDDOR incident suspected but not logged = Immediate escalation

---

## Risk 6: IR35 Misclassification (£100k+ Back Taxes)

**Severity**: CRITICAL (Tax/Legal)
**Phases Affected**: 6.5 (Payment Processing)

### Problem
- IR35 tax rules: If medics are "disguised employees", platform owes PAYE tax + National Insurance
- HMRC audit determines medics are employees, not contractors
- Platform liable for back taxes: £30/hr × 2,000 hours/year × 10 medics × 20% PAYE + 13% NI = £198,000 back taxes

### Impact if Ignored
- **Legal**: HMRC prosecution, fines + penalties (200-400% of back taxes)
- **Financial**: £200k-400k liability could bankrupt business
- **Estimated Cost**: £400k+ (business shutdown)

### Mitigation Strategies

#### Strategy 1: HMRC CEST Tool Validation
**Implementation**:
- Use HMRC's Check Employment Status for Tax (CEST) tool for each medic
- Answer 35 questions about working relationship:
  - Does medic have right of substitution? (YES)
  - Does platform control when/where medic works? (NO - medic chooses shifts)
  - Does platform provide equipment? (NO - medic brings own)
  - Is medic in business on their own account? (YES - can work for multiple platforms)
- CEST result: "Self-employed for tax purposes" → Safe
- Store CEST result PDF in `medics` table for HMRC audit

**Coverage**: Legal defense if HMRC audits

---

#### Strategy 2: Umbrella Company Option
**Implementation**:
- Medics can choose to be paid via umbrella company (e.g., Parasol, Contractor Umbrella)
- Umbrella company handles PAYE, NI, tax
- Platform pays umbrella company, umbrella pays medic
- Eliminates IR35 risk (medic is employee of umbrella, not platform)

**Coverage**: Optional for medics who prefer employment status

---

#### Strategy 3: Contract Language (Right of Substitution)
**Implementation**:
- Medic contract explicitly states:
  - "Medic has right to send substitute (with same qualifications) to cover shift"
  - "Platform does not control medic's working methods"
  - "Medic is in business on their own account"
- Legal review by UK employment law solicitor

**Coverage**: Legal defense for self-employed status

---

#### Strategy 4: Medic Invoicing (Not Payroll)
**Implementation**:
- Medics don't receive payslips (that's employee terminology)
- Medics receive "Remittance Advice" (contractor terminology)
- Language matters: "Invoice" not "Wages", "Contractor Payment" not "Salary"

**Coverage**: Reinforces contractor relationship

---

### Monitoring

**IR35 Risk Metrics**:
- % of medics assessed via CEST tool (target: 100%)
- % of medics with umbrella company option (target: >20% offered, medic choice)
- Contract review date (target: Annual legal review)

**Alert Thresholds**:
- New medic onboarded without CEST assessment = Block payout until completed
- HMRC publishes new IR35 guidance = Immediate legal review

---

## Risk 7: Stripe Account Holds (Medic Doesn't Get Paid)

**Severity**: HIGH (Medic Retention)
**Phases Affected**: 6.5 (Payment Processing)

### Problem
- Stripe holds funds in platform account due to high chargeback rate, fraud suspicion, or verification issues
- Medics don't receive Friday payout (Stripe Transfer blocked)
- Medics quit → no coverage for bookings → business collapses

### Impact if Ignored
- **Medic Trust**: 1 missed payout = 50% probability medic quits
- **Cascade**: 5 medics quit → 50 bookings unfilled → clients churn
- **Estimated Cost**: £50k-100k lost revenue from churn

### Mitigation Strategies

#### Strategy 1: Medic Vetting Before Onboarding
**Implementation**:
- Background check (DBS check required for healthcare workers in UK)
- Reference check (2 references from previous employers)
- Interview (admin video call to assess professionalism)
- Reduces risk of fraudulent medics

**Coverage**: Prevents bad actors from joining platform

---

#### Strategy 2: Gradual Payout Limits
**Implementation**:
- New medic: £500/week payout limit (first 4 weeks)
- Established medic: £2,000/week payout limit (after 1 month)
- Veteran medic: £5,000/week payout limit (after 6 months)
- If Stripe holds funds, impact limited to smaller amounts

**Coverage**: Limits exposure to Stripe account issues

---

#### Strategy 3: Dispute Handling Process
**Implementation**:
- If client disputes charge (chargeback), admin investigates immediately
- Gather evidence: Booking confirmation, medic timesheet, site manager approval, treatment log
- Submit to Stripe within 7 days (Stripe deadline for dispute response)
- Win rate target: >80% (strong evidence of service delivered)

**Coverage**: Reduces chargeback rate (Stripe's #1 hold trigger)

---

#### Strategy 4: Backup Payout Method (Bank Transfer)
**Implementation**:
- If Stripe Transfer blocked, admin can manually pay medic via bank transfer (UK Faster Payments)
- Medic provides bank account details during onboarding
- Admin uses Wise or TransferWise for same-day UK bank transfer
- More manual, but ensures medic gets paid

**Coverage**: Backup for Stripe failures

---

### Monitoring

**Stripe Account Metrics**:
- Chargeback rate (target: <0.5%)
- Dispute win rate (target: >80%)
- Stripe account status (target: "Good standing")
- Failed Transfer attempts (target: 0)

**Alert Thresholds**:
- Chargeback rate >1% = Investigate fraud patterns
- Stripe account on hold = Immediate escalation, activate backup payout method
- Failed Transfer = Manual bank transfer within 24 hours

---

## Risk 8: Out-of-Territory Costs Exceed Budget (Unprofitable Bookings)

**Severity**: MEDIUM (Profit Margin)
**Phases Affected**: 7.5 (Territory Management), 5.5 (Admin Dashboard)

### Problem
- Primary medic unavailable, secondary medic 60 miles away
- Travel bonus: 60 miles - 30 miles free = 30 miles × £2/mile = £60 one-way = £120 round-trip
- Booking revenue: £30/hr × 8 hours × 40% markup = £12/hr × 8 = £96 platform fee
- Out-of-territory cost (£120) > platform fee (£96) = £24 loss per booking

### Impact if Ignored
- **Profit Margin**: Out-of-territory bookings lose money
- **Scale**: 10 unprofitable bookings/month = £240/month = £2,880/year lost
- **Estimated Cost**: Negative unit economics → slow business death

### Mitigation Strategies

#### Strategy 1: Cost Comparison (Travel vs Room/Board)
**Implementation** (Phase 7.5):
- Algorithm calculates:
  - **Option A**: Travel bonus (£2/mile beyond 30 miles, round-trip)
  - **Option B**: Room/board (overnight hotel near site, £80-100/night)
  - **Option C**: Deny booking (if both options >50% of shift revenue)

```javascript
// Out-of-territory cost logic
const calculateOutOfTerritoryCost = (medic, booking) => {
  const travelTime = await getGoogleMapsTime(medic.home_postcode, booking.site_postcode);

  if (travelTime <= 60) {
    return { option: 'standard', cost: 0 }; // Within territory
  }

  // Option A: Travel bonus
  const distance = travelTime / 60 * 40; // Rough estimate: 40 mph avg
  const travelMiles = Math.max(0, distance - 30); // Free first 30 miles
  const travelBonus = travelMiles * 2 * 2; // £2/mile, round-trip

  // Option B: Room/board
  const roomCost = 90; // £90/night hotel

  // Option C: Deny if cost >50% shift revenue
  const shiftRevenue = booking.base_rate * booking.shift_hours * 0.4; // Platform 40%
  const maxAllowableCost = shiftRevenue * 0.5;

  if (travelBonus < roomCost && travelBonus < maxAllowableCost) {
    return { option: 'travel_bonus', cost: travelBonus };
  } else if (roomCost < travelBonus && roomCost < maxAllowableCost) {
    return { option: 'room_board', cost: roomCost };
  } else {
    return { option: 'deny', cost: Math.min(travelBonus, roomCost), reason: 'Cost exceeds 50% shift revenue' };
  }
};
```

**Coverage**: 100% of out-of-territory bookings analyzed for profitability

---

#### Strategy 2: Admin Approval with Cost Breakdown
**Implementation** (Phase 5.5):
- Admin sees:

```
Out-of-Territory Booking Approval Required
┌────────────────────────────────────────────────┐
│ Client: ABC Construction                      │
│ Site: E1 (East London)                        │
│ Primary Medic (E1): Unavailable              │
│ Secondary Medic: Dr. Smith (Home: SW1, 45mi) │
│                                                │
│ Travel Time: 75 minutes each way              │
│                                                │
│ Option A: Travel Bonus                        │
│ - Distance: 45 miles - 30 free = 15 miles     │
│ - Cost: 15 mi × £2/mi × 2 = £60               │
│                                                │
│ Option B: Room/Board                          │
│ - Hotel near site: £90/night                  │
│                                                │
│ Shift Revenue: £336 (client pays)             │
│ Platform Fee: £96 (40% markup)                │
│                                                │
│ ✅ Recommended: Travel Bonus (£60)            │
│    Net Profit: £96 - £60 = £36 (37% margin)   │
│                                                │
│ [Approve with Travel Bonus] [Approve with     │
│ Room/Board] [Deny Booking]                     │
└────────────────────────────────────────────────┘
```

**Coverage**: Human oversight prevents unprofitable bookings

---

#### Strategy 3: Auto-Deny if >50% Shift Cost
**Implementation**:
- If travel bonus + room/board both >£48 (50% of £96 platform fee), auto-deny
- Client receives email: "We're unable to provide coverage for this booking due to distance. We recommend finding local medic or increasing shift duration to 12 hours."
- Admin can override (e.g., strategic client, willing to take loss)

**Coverage**: Prevents most unprofitable bookings

---

#### Strategy 4: Hiring Trigger (Coverage Gap)
**Implementation** (Phase 7.5):
- If >10% of bookings in "E1" sector are out-of-territory (secondary medic used), trigger hiring alert
- "Hire medic in East London (E1 sector). 15% of bookings require out-of-territory coverage (£120 avg cost). Break-even: 8 bookings/month."

**Coverage**: Proactive hiring eliminates out-of-territory costs long-term

---

### Monitoring

**Out-of-Territory Metrics**:
- % of bookings requiring out-of-territory coverage (target: <10%)
- Avg out-of-territory cost per booking (target: <£50)
- Unprofitable booking count (target: 0)

**Alert Thresholds**:
- Territory >10% out-of-territory bookings = Hiring alert
- Unprofitable booking approved = Admin review (why override auto-deny?)
- Out-of-territory costs >10% of revenue = Reevaluate territory assignments

---

## Summary Risk Matrix

| Risk | Severity | Probability | Mitigation Phases | Monitoring |
|------|----------|-------------|-------------------|------------|
| Cash flow gap | CRITICAL | HIGH (if no mitigation) | 1.5, 5.5, 6.5 | Daily cash dashboard |
| Medic no-show | HIGH | MEDIUM | 4.5, 5.5, 7.5 | Per-medic no-show rate |
| Auto-assignment errors | HIGH | LOW (with validation) | 5.5, 7.5 | Qualification mismatch incidents |
| Google Maps API costs | MEDIUM | LOW (with caching) | 1.5, 7.5 | Weekly API spend |
| RIDDOR compliance gap | CRITICAL | MEDIUM | 2, 5, 6 | Weekly audit report |
| IR35 misclassification | CRITICAL | LOW (with CEST) | 6.5 | Annual legal review |
| Stripe account holds | HIGH | LOW (with vetting) | 6.5 | Chargeback rate, dispute win rate |
| Out-of-territory costs | MEDIUM | MEDIUM | 5.5, 7.5 | Out-of-territory booking % |

---

## Risk Prioritization

**Tier 1 (Must Address Before Launch)**:
1. Cash flow gap (prepay + credit limits + dashboard)
2. RIDDOR compliance gap (mandatory treatment logs)
3. IR35 misclassification (CEST tool + contract review)

**Tier 2 (Address During Beta)**:
4. Medic no-show (secondary backup + SMS reminders)
5. Auto-assignment errors (hard validation + manual review)
6. Stripe account holds (medic vetting + dispute handling)

**Tier 3 (Monitor Post-Launch)**:
7. Google Maps API costs (caching + monitoring)
8. Out-of-territory costs (admin approval + auto-deny)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-15
**Next Review**: After Phase 1.5 completion (validate mitigation strategies working)
