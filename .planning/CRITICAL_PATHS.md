# Critical Paths for SiteMedic Launch

**Document**: Critical path analysis for business operations launch
**Created**: 2026-02-15
**Purpose**: Identify minimum viable paths to revenue and scale

---

## Overview

Not all phases are equally critical for launch. This document identifies the **3 critical paths** that must be completed to enable:
1. **Revenue Generation** (booking flow)
2. **Cash Flow Management** (medic payouts)
3. **Business Scaling** (admin operations)

Each path can be executed in parallel where dependencies allow. Understanding these paths helps prioritize development and identify bottlenecks.

---

## Critical Path 1: Booking Flow (Revenue-Critical)

**Goal**: Enable clients to book medics online with payment → Generate platform revenue

### Phase Sequence
```
Phase 1.5 (Foundation)
    ↓
Phase 4.5 (Booking Portal)
    ↓
Phase 7.5 (Auto-Assignment)
    ↓
Phase 6.5 (Payment Processing)
    ↓
REVENUE GENERATION ✅
```

### Timeline
- **Sequential**: 12-16 weeks
- **Parallelizable**: 10-12 weeks (Phase 4.5 and 7.5 can overlap after Phase 1.5)

### Detailed Path

#### Week 1-3: Phase 1.5 - Foundation
**Deliverables**:
- ✅ Database schema (territories, bookings, clients, medics)
- ✅ Stripe Connect platform account setup (test mode)
- ✅ Google Maps Distance Matrix API integration
- ✅ UK postcode sector database seeded

**Critical for**: All downstream phases depend on this database schema.

**Blockers**: None (depends only on Phase 1 auth, which is complete).

---

#### Week 4-7: Phase 4.5 - Booking Portal
**Deliverables**:
- ✅ Marketing website (Next.js SSG, <2s load)
- ✅ Client registration with payment method setup
- ✅ Booking flow (calendar picker, site location, special requirements)
- ✅ Stripe payment processing (prepay for new clients)
- ✅ Booking confirmation emails

**Critical for**: This is the client-facing interface that generates bookings (revenue).

**Blockers**: Requires Phase 1.5 database schema and Stripe integration.

**Parallelizable**: Can work on marketing website while Phase 1.5 completes.

---

#### Week 8-11: Phase 7.5 - Auto-Assignment Algorithm
**Deliverables**:
- ✅ Medic ranking algorithm (distance, utilization, qualifications, availability, rating)
- ✅ Out-of-territory coverage logic (travel bonus vs room/board vs deny)
- ✅ Hybrid approval system (auto-confirm vs manual review)

**Critical for**: Automated medic matching reduces admin burden and enables scalable bookings.

**Blockers**: Requires Phase 1.5 database and Google Maps API.

**Parallelizable**: Can develop algorithm while Phase 4.5 builds frontend (both depend on Phase 1.5).

---

#### Week 12-16: Phase 6.5 - Payment Processing
**Deliverables**:
- ✅ Stripe Payment Intent creation (client charges)
- ✅ 3D Secure authentication (SCA compliant)
- ✅ Platform fee calculation (40% markup)
- ✅ Payment confirmation emails

**Critical for**: Converting bookings into revenue. Without this, bookings are free (no cash flow).

**Blockers**: Requires Phase 1.5 Stripe setup and Phase 4.5 booking flow.

**Note**: This path focuses on **client payment** only. Medic payouts are in Critical Path 2.

---

### Success Criteria
- ✅ Client can complete booking in <5 minutes (end-to-end)
- ✅ Auto-matching presents ranked candidates (95% success rate)
- ✅ Stripe payment succeeds (test mode)
- ✅ Medic receives booking notification email
- ✅ Booking data stored in database with pricing breakdown
- ✅ Platform fee (40%) calculated correctly

### Launch Readiness
**Minimum Viable Product (MVP)** for revenue:
- Manual medic assignment acceptable (Phase 7.5 auto-matching not required)
- Admin-only booking creation acceptable (public portal not required)
- But Stripe payment processing IS required (Phase 6.5 critical)

**Recommendation**: Complete full path (all 4 phases) for public launch. Manual workarounds acceptable for early adopter/beta clients only.

---

## Critical Path 2: Medic Payout (Cash Flow-Critical)

**Goal**: Pay medics reliably every Friday → Retain medics, avoid cash flow crisis

### Phase Sequence
```
Phase 1.5 (Foundation)
    ↓
Phase 5.5 (Admin Dashboards)
    ↓
Phase 6.5 (Payout Automation)
    ↓
RELIABLE MEDIC PAYOUTS ✅
```

### Timeline
- **Sequential**: 10-14 weeks
- **Parallelizable**: 8-10 weeks (Phase 5.5 can start after Phase 1.5 database ready)

### Detailed Path

#### Week 1-3: Phase 1.5 - Foundation
**Deliverables**:
- ✅ Timesheets table with approval workflow
- ✅ Stripe Connect medic Express account setup
- ✅ Payments table for payout tracking

**Critical for**: Without timesheet approval and Stripe Express accounts, no way to pay medics.

---

#### Week 4-9: Phase 5.5 - Admin Dashboards (Timesheet Approval)
**Deliverables**:
- ✅ Timesheet Approval tab in admin dashboard
- ✅ Batch review workflow (approve 20 timesheets <5 minutes)
- ✅ Timesheet detail view (shift, hours, discrepancies)
- ✅ Payout history tracking

**Critical for**: Admin must batch-approve timesheets before Friday payout job can run.

**Blockers**: Requires Phase 1.5 timesheets table.

**Note**: Only the **Timesheet Approval** tab is critical for this path. Other admin tabs (Bookings, Territories, Revenue) can be deferred.

---

#### Week 10-14: Phase 6.5 - Payout Automation
**Deliverables**:
- ✅ Friday payout job (Supabase Edge Function cron)
- ✅ Stripe Transfer creation to medic Express accounts
- ✅ UK Faster Payments (2 business day settlement)
- ✅ Payout confirmation emails
- ✅ Payslip PDF generation

**Critical for**: Automated payouts = reliable cash flow for medics. Manual payouts don't scale beyond 5 medics.

**Blockers**: Requires Phase 1.5 Stripe setup and Phase 5.5 timesheet approval.

---

### Success Criteria
- ✅ Friday payout job runs automatically (zero failures)
- ✅ Admin can batch-approve 20 timesheets in <5 minutes
- ✅ Medics receive funds within 2 business days (UK Faster Payments)
- ✅ Payout confirmation email sent with payslip PDF
- ✅ All approved timesheets processed (no missed payouts)

### Launch Readiness
**Minimum Viable Product (MVP)** for medic retention:
- Manual timesheet approval acceptable (batch approval UI preferred but not required)
- Manual Stripe Transfers acceptable for <3 medics (Friday automation required for >3)

**Recommendation**: Complete full path (all 3 phases) for launch. Manual payouts acceptable for beta only (1-2 medics max).

---

## Critical Path 3: Admin Operations (Scale-Critical)

**Goal**: Enable admin to manage bookings, medics, territories at scale (>10 medics)

### Phase Sequence
```
Phase 1.5 (Foundation)
    ↓
Phase 5.5 (Admin Dashboards - All Tabs)
    ↓
Phase 7.5 (Territory Management)
    ↓
SCALABLE BUSINESS OPERATIONS ✅
```

### Timeline
- **Sequential**: 12-16 weeks
- **Parallelizable**: 10-12 weeks (Phase 5.5 can overlap with Phase 7.5 after Phase 1.5)

### Detailed Path

#### Week 1-3: Phase 1.5 - Foundation
**Deliverables**:
- ✅ All business operations tables (territories, bookings, medics, etc.)
- ✅ Territory metrics table for analytics

**Critical for**: Admin dashboards need data to display.

---

#### Week 4-10: Phase 5.5 - Admin Dashboards (All 6 Tabs)
**Deliverables**:
- ✅ **Bookings Management**: View, approve/reject, reassign, cancel
- ✅ **Medic Management**: Roster, availability, territory assignments, utilization %
- ✅ **Territory Overview**: Coverage map, gap detection, hiring alerts
- ✅ **Revenue Dashboard**: Platform fees, cash flow projection
- ✅ **Timesheet Approval**: Batch review for Friday payouts
- ✅ **Client Management**: Accounts, payment terms, booking history

**Critical for**: Admin needs visibility and control over all business operations.

**Blockers**: Requires Phase 1.5 database schema.

**Note**: This is the **full admin dashboard** (all 6 tabs). Critical Path 2 only requires the **Timesheet Approval** tab.

---

#### Week 11-16: Phase 7.5 - Territory Management
**Deliverables**:
- ✅ Coverage gap detection (rejection rate >10%)
- ✅ Hiring triggers (utilization >80% for 3+ weeks)
- ✅ Visual coverage map (choropleth with drag-drop reassignment)
- ✅ Territory analytics (daily metrics job)

**Critical for**: Scaling to >10 medics requires data-driven territory management. Manual assignment acceptable for <5 medics.

**Blockers**: Requires Phase 1.5 territory tables and Phase 5.5 admin UI.

**Parallelizable**: Coverage gap algorithm can be developed while Phase 5.5 builds UI (both depend on Phase 1.5).

---

### Success Criteria
- ✅ Admin can view all bookings with filters (<2 seconds load time)
- ✅ Admin can batch-approve 20 timesheets in <5 minutes
- ✅ Territory coverage map displays real-time utilization (<5 min refresh)
- ✅ Coverage gap alerts trigger when rejection rate >10%
- ✅ Admin can reassign medic to territory via drag-drop
- ✅ Revenue dashboard shows cash flow projection

### Launch Readiness
**Minimum Viable Product (MVP)** for scale:
- Manual territory assignment acceptable (coverage map preferred but not required)
- Manual hiring decisions acceptable (auto-alerts preferred but not required)
- But full admin dashboard (all 6 tabs) IS required for >5 medics

**Recommendation**: Complete Phase 5.5 fully for launch. Phase 7.5 territory automation can be phased (start with manual, add automation post-launch).

---

## Path Dependencies

### Dependency Matrix

| Phase | Depends On | Blocks | Critical Path(s) |
|-------|------------|--------|------------------|
| 1.5   | Phase 1 (auth) | All business ops phases | All 3 paths |
| 4.5   | Phase 1.5 | Revenue generation | Path 1 |
| 5.5   | Phase 1.5 | Admin visibility | Path 2, Path 3 |
| 6.5   | Phase 1.5, Phase 4.5 (bookings), Phase 5.5 (timesheet approval) | Revenue, payouts | Path 1, Path 2 |
| 7.5   | Phase 1.5, Phase 5.5 (admin UI) | Auto-assignment, coverage gaps | Path 1 (optional), Path 3 |

### Parallelization Opportunities

**After Phase 1.5 completes** (Week 3):
```
Week 4-10:
├── Phase 4.5 (Booking Portal) ────────────┐
├── Phase 5.5 (Admin Dashboards) ──────────┤ ← Can work in parallel
└── Phase 7.5 (Auto-Assignment Algorithm) ─┘

Week 11-16:
└── Phase 6.5 (Payment Processing) ← Requires 4.5 and 5.5
```

**Optimal Schedule**:
- **Weeks 1-3**: Phase 1.5 (Foundation) - ALL developers
- **Weeks 4-10**: Phase 4.5 + 5.5 + 7.5 in parallel (3 teams or sequential with fast iteration)
- **Weeks 11-16**: Phase 6.5 (Payment Processing) + final integration testing

**Team Allocation** (if parallelizing):
- **Team A** (Frontend): Phase 4.5 (Booking Portal)
- **Team B** (Admin UI): Phase 5.5 (Admin Dashboards)
- **Team C** (Backend): Phase 7.5 (Auto-Assignment Algorithm)
- **All Teams**: Phase 6.5 (Payment Processing) - requires frontend + backend integration

---

## Launch Scenarios

### Scenario 1: Full Feature Launch (Recommended)
**Complete All 3 Critical Paths**

**Timeline**: 16 weeks
**Features**:
- ✅ Public booking portal (clients self-serve)
- ✅ Auto-matching algorithm (95% bookings auto-confirmed)
- ✅ Automated Friday payouts (medics paid reliably)
- ✅ Full admin dashboard (all 6 tabs)
- ✅ Territory management (coverage gaps, hiring alerts)

**Pros**:
- Scalable from day 1 (can handle 50+ medics)
- Minimal admin workload (automation reduces manual effort)
- Professional client experience (self-service portal)

**Cons**:
- Longer time to market (4 months)
- Higher development cost upfront

**Best for**: Launching with multiple medics (5+) and expecting growth.

---

### Scenario 2: Beta Launch (Manual Admin Operations)
**Complete Path 1 (Revenue) + Path 2 (Payouts) Only**

**Timeline**: 12 weeks
**Features**:
- ✅ Public booking portal (clients self-serve)
- ✅ Manual medic assignment (admin assigns, no auto-matching)
- ✅ Automated Friday payouts (medics paid reliably)
- ✅ Partial admin dashboard (Timesheet Approval only)
- ❌ No territory management (admin tracks in spreadsheet)

**Pros**:
- Faster time to market (3 months)
- Lower development cost
- Validates market demand before investing in full automation

**Cons**:
- Admin workload high (manual medic assignment for every booking)
- Not scalable beyond 5 medics
- No coverage gap detection (hire reactively, not proactively)

**Best for**: Beta launch with 1-3 medics, proving product-market fit before scaling.

---

### Scenario 3: MVP Launch (Admin-Only Booking)
**Complete Path 2 (Payouts) Only**

**Timeline**: 10 weeks
**Features**:
- ❌ No public booking portal (admin creates bookings manually)
- ❌ No auto-matching (admin assigns medics manually)
- ✅ Automated Friday payouts (medics paid reliably)
- ✅ Partial admin dashboard (Timesheet Approval only)
- ❌ No territory management

**Pros**:
- Fastest time to market (2.5 months)
- Lowest development cost
- Proves medic payout automation works

**Cons**:
- No client self-service (admin is bottleneck for all bookings)
- Very limited scalability (max 2-3 medics)
- Manual entry for every booking (high error risk)

**Best for**: Proof-of-concept with 1 medic (Kai solo operation), not recommended for growth.

---

## Recommended Launch Strategy

### Phase 1: Beta Launch (3 Months)
**Goal**: Validate product-market fit with early adopter clients

**Complete**:
- Critical Path 1 (Revenue) - Weeks 1-12
- Critical Path 2 (Payouts) - Weeks 1-10

**Defer**:
- Critical Path 3 (Admin Operations) - Build post-beta based on learnings

**Medic Capacity**: 3-5 medics max
**Client Capacity**: 10-20 active clients
**Admin Workload**: High (manual medic assignment, manual territory management)

**Success Criteria**:
- 80% booking fulfillment rate
- <5% late medic payouts
- Client NPS >40 (validate market demand)

---

### Phase 2: Full Launch (Month 4-6)
**Goal**: Scale to 10+ medics with automated admin operations

**Complete**:
- Critical Path 3 (Admin Operations) - Weeks 13-16
- Enhancements:
  - Auto-matching algorithm (reduce admin workload)
  - Territory coverage map (visual management)
  - Coverage gap detection (proactive hiring)

**Medic Capacity**: 10-20 medics
**Client Capacity**: 50-100 active clients
**Admin Workload**: Low (automation handles 80% of bookings)

**Success Criteria**:
- 95% booking auto-confirmation rate
- <10% territory rejection rate
- Admin processes 50+ bookings/week with <5 hours manual effort

---

## Key Metrics by Critical Path

### Path 1: Revenue Metrics
- **Bookings per week** (target: 50+)
- **Average booking value** (target: £300-500)
- **Booking completion time** (target: <5 minutes)
- **Payment success rate** (target: >98%)
- **Client churn rate** (target: <10% monthly)

### Path 2: Cash Flow Metrics
- **Friday payout success rate** (target: 100%)
- **Payout settlement time** (target: <2 business days)
- **Timesheet approval time** (target: <5 min for 20 sheets)
- **Missed payout incidents** (target: 0)
- **Medic satisfaction with payouts** (target: NPS >50)

### Path 3: Scale Metrics
- **Medic utilization** (target: 60-80%)
- **Territory rejection rate** (target: <10%)
- **Booking fulfillment rate** (target: >90%)
- **Admin hours per 50 bookings** (target: <5 hours)
- **Coverage gap alerts** (target: 100% of gaps detected within 7 days)

---

## Risk Mitigation by Critical Path

### Path 1 Risks (Revenue)
| Risk | Mitigation |
|------|------------|
| Low booking volume | Pre-launch marketing, partnerships with construction companies |
| Payment failures | Stripe 3D Secure, retry logic, email reminders |
| Auto-matching errors | Hybrid approval (manual review for complex bookings) |
| Site location inaccurate | Postcode validation, Google Maps autocomplete |

### Path 2 Risks (Cash Flow)
| Risk | Mitigation |
|------|------------|
| Friday payout job failure | Monitoring + alerts, manual backup process, 2x weekly runs |
| Stripe account holds | Medic vetting, gradual limits, dispute handling |
| Timesheet discrepancies | Approval workflow, admin override, client billing separate |
| Cash flow gap (pay before collect) | Prepay for new clients, credit limits, dashboard warning |

### Path 3 Risks (Scale)
| Risk | Mitigation |
|------|------------|
| Coverage gap undetected | Daily analytics job, >10% rejection alert, weekly review |
| Medic no-show | Secondary backup, SMS reminders, client credit |
| Admin overload | Automation (auto-matching), batch operations, hiring admin support |
| Territory assignment errors | Visual map, drag-drop UI, admin can override |

---

## Summary

**3 Critical Paths** for SiteMedic launch:

1. **Path 1: Booking Flow** (Revenue-Critical)
   - Phases: 1.5 → 4.5 → 7.5 → 6.5
   - Timeline: 12-16 weeks
   - Outcome: Clients book medics online, platform generates revenue

2. **Path 2: Medic Payout** (Cash Flow-Critical)
   - Phases: 1.5 → 5.5 → 6.5
   - Timeline: 10-14 weeks
   - Outcome: Medics paid reliably every Friday, retention high

3. **Path 3: Admin Operations** (Scale-Critical)
   - Phases: 1.5 → 5.5 → 7.5
   - Timeline: 12-16 weeks
   - Outcome: Admin can manage 10+ medics with low manual effort

**Recommended Launch**:
- **Beta (Month 1-3)**: Complete Path 1 + 2 → Validate market
- **Full Launch (Month 4-6)**: Complete Path 3 → Scale to 10+ medics

**Parallelization**: After Phase 1.5, Phases 4.5 + 5.5 + 7.5 can work in parallel (10-12 week timeline instead of 16 weeks).

---

**Document Version**: 1.0
**Last Updated**: 2026-02-15
**Next Review**: After Phase 1.5 completion
