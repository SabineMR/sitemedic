# Integration Points: Business Operations ↔ Medic App

**Document**: Integration specification for business operations and medic app phases
**Created**: 2026-02-15
**Purpose**: Ensure seamless connection between existing medic app (Phases 1-7) and new business operations (Phases 1.5-7.5)

---

## Overview

The business operations phases (1.5, 4.5, 5.5, 6.5, 7.5) are designed to **extend** the existing medic app roadmap, not replace it. The two systems share a common database and must integrate at several key touchpoints to provide a cohesive platform.

**Key Principle**: The medic app focuses on **clinical workflow** (treatment logging, RIDDOR compliance). The business operations layer adds **booking, payment, and territory management** to scale the staffing business.

---

## Shared Infrastructure

### 1. Supabase Database (Phase 1)
**Location**: UK region (eu-west-2 London)
**Shared by**: All phases (1-7.5)

**Integration**:
- **Phase 1** creates core tables: `auth.users`, `audit_logs`, `gdpr_consents`
- **Phase 1.5** extends with business tables: `territories`, `bookings`, `clients`, `medics`, `timesheets`, `payments`, `invoices`
- All tables use same PostgreSQL instance
- Row-Level Security (RLS) policies isolate data by user role

**Example Integration**:
```sql
-- Phase 1 auth.users table
-- Phase 1.5 medics table references auth.users
CREATE TABLE medics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id), -- Links to Phase 1 auth
  first_name TEXT NOT NULL,
  ...
);
```

### 2. Authentication System (Phase 1)
**Shared by**: Mobile app (Phase 1-3), Web dashboards (Phase 4-5.5), Booking portal (Phase 4.5)

**Integration**:
- **Phase 1** creates `auth.users` with roles: `medic`, `site_manager`, `client`, `admin`
- **Phase 1.5** adds `admin` role for business operations
- **Phase 4.5** uses Supabase Auth for client registration (booking portal)
- **Phase 5.5** restricts admin dashboard to `admin` role only

**User Roles**:
| Role | Access | Phases |
|------|--------|--------|
| `medic` | Mobile app, personal dashboard | 1-3, 6-7 |
| `site_manager` | Web dashboard (view treatments, approve timesheets) | 4, 5, 5.5 |
| `client` | Booking portal, view own bookings/invoices | 4.5 |
| `admin` | Admin dashboard (full platform management) | 5.5, 6.5, 7.5 |

### 3. Supabase Storage (Phase 1)
**Shared by**: Photos (Phase 2-3), PDFs (Phase 5), Invoices (Phase 6.5)

**Integration**:
- **Phase 2**: Treatment photos stored in `photos/` bucket
- **Phase 3**: Photo upload sync to backend
- **Phase 5**: Weekly PDF reports in `reports/` bucket
- **Phase 6.5**: Client invoices in `invoices/` bucket
- All buckets use same Supabase Storage instance with RLS policies

---

## Phase-Specific Integration Points

### Phase 2 Enhancement: Timesheet Logging (Mobile App)

**Why**: Medics need to log hours worked at end of shift for payout processing (Phase 6.5).

**Enhancement Details**:
- **New Screen**: "End Shift" button in mobile app (after shift ends)
- **Data Captured**:
  - Booking ID (from backend assignment)
  - Actual hours worked (auto-calculated from shift start/end time)
  - Discrepancy reason (if different from scheduled hours)
  - Optional notes
- **Local Storage**: Save to WatermelonDB `timesheets` table
- **Sync**: Upload timesheet when connectivity available (Phase 3 sync engine)

**Database**:
```sql
-- WatermelonDB table (local mobile database)
CREATE TABLE timesheets (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  scheduled_hours REAL NOT NULL,
  logged_hours REAL NOT NULL,
  discrepancy_reason TEXT,
  medic_submitted_at INTEGER, -- Unix timestamp
  synced BOOLEAN DEFAULT FALSE,
  _status TEXT DEFAULT 'created' -- WatermelonDB status
);
```

**UI Mockup**:
```
┌─────────────────────────────────┐
│ End Shift                       │
├─────────────────────────────────┤
│ Site: ABC Construction          │
│ Scheduled: 8.0 hours            │
│                                 │
│ Actual Hours Worked:            │
│ [7.5        ] ← Input field     │
│                                 │
│ Why different? (optional)       │
│ [Left early due to weather...]  │
│                                 │
│ [Submit Timesheet]              │
└─────────────────────────────────┘
```

**Impact**: Low complexity, high value for payout automation.

---

### Phase 4 Enhancement: Booking Management (Site Manager Dashboard)

**Why**: Site managers need visibility into upcoming medic shifts and ability to approve timesheets.

**Enhancement Details**:
- **New Tab**: "My Bookings" in site manager dashboard (Phase 4)
- **Features**:
  - View upcoming medic shifts for their site
  - View past shift history
  - Approve/reject medic timesheets
  - Download booking confirmations
  - Contact assigned medic

**Data Source**: Query `bookings` table filtered by `site_manager_id` (added column in Phase 1.5).

**UI Addition**:
```
Site Manager Dashboard
┌─────────────────────────────────────────────────┐
│ [Treatments] [Near-Misses] [Workers] [Bookings] │ ← New tab
├─────────────────────────────────────────────────┤
│ Upcoming Medic Shifts                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ Mon 17 Feb | 8:00-16:00 | Dr. Kai Johnson  │ │
│ │ Wed 19 Feb | 8:00-16:00 | Dr. Kai Johnson  │ │
│ │ Fri 21 Feb | 8:00-16:00 | Dr. Sarah Smith  │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Pending Timesheet Approvals (2)                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Mon 10 Feb | Dr. Kai | 8.0 hrs | [Approve]  │ │
│ │ Wed 12 Feb | Dr. Kai | 7.5 hrs | [Approve]  │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Impact**: Medium complexity, extends existing dashboard with business data.

---

### Phase 5 Enhancement: Medic Attendance in PDF Reports

**Why**: Weekly safety reports should include medic shift attendance for compliance.

**Enhancement Details**:
- **New Section**: "Medic Attendance" in weekly PDF report
- **Data Included**:
  - Medic name
  - Shift dates and times
  - Hours worked (from approved timesheets)
  - Certifications verified (CSCS, CPCS, etc.)
- **Source**: Query `bookings` and `timesheets` tables for date range

**PDF Section**:
```
Weekly Safety Report
Site: ABC Construction
Week of: 10-16 February 2026

... (existing sections: treatments, near-misses, etc.)

Medic Attendance
┌────────────────────────────────────────────────┐
│ Mon 10 Feb | Dr. Kai Johnson | 8:00-16:00      │
│            | CSCS ✓ | Trauma Cert ✓            │
│ Wed 12 Feb | Dr. Kai Johnson | 8:00-15:30      │
│ Fri 14 Feb | Dr. Sarah Smith | 8:00-16:00      │
│            | CSCS ✓ | Confined Space ✓         │
└────────────────────────────────────────────────┘

Total Medic Hours: 23.5
```

**Impact**: Low complexity, adds value for client compliance reporting.

---

### Phase 1.5 Database Extension

**Purpose**: Add business operations tables to existing Supabase schema.

**Migration Strategy**:
- Phase 1 creates migration `001_initial_schema.sql` (auth, audit_logs, etc.)
- Phase 1.5 creates migration `002_business_operations.sql` (territories, bookings, etc.)
- Both migrations run sequentially
- No breaking changes to existing Phase 1 tables

**Column Additions to Phase 1 Tables**:
```sql
-- Add role to auth.users (if not already present)
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'medic';

-- Add site_manager_id to bookings (for Phase 4 enhancement)
ALTER TABLE bookings ADD COLUMN site_manager_id UUID REFERENCES auth.users(id);
```

**Impact**: No breaking changes, extends existing schema.

---

### Admin Role Addition (Phase 1 Auth Enhancement)

**Purpose**: Create `admin` role for business operations dashboards (Phase 5.5-7.5).

**Implementation**:
```sql
-- Add admin role to existing users table
UPDATE auth.users SET role = 'admin' WHERE email = 'admin@sitemedic.co.uk';

-- RLS policy for admin-only access
CREATE POLICY "Admins only" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND role = 'admin'
    )
  );
```

**Admin Permissions**:
- Full read/write access to all tables
- Can approve/reject bookings
- Can manage medic roster
- Can assign territories
- Can process payouts
- Can upgrade clients to Net 30

**Impact**: Low complexity, adds new user role to existing auth system.

---

## Data Flow Examples

### Example 1: Client Books Medic → Medic Logs Timesheet → Admin Processes Payout

**Step-by-Step Integration**:

1. **Client Books Medic** (Phase 4.5 - Booking Portal)
   - Client selects date/time, enters site location
   - Auto-matching algorithm finds medic (Phase 7.5)
   - Stripe Payment Intent created (Phase 6.5)
   - Booking row inserted in `bookings` table
   - Email sent to medic (Phase 1 auth system)

2. **Medic Works Shift** (Phases 2-3 - Mobile App)
   - Medic logs treatments during shift (Phase 2)
   - Medic clicks "End Shift", logs hours (Phase 2 enhancement)
   - Timesheet saved locally (WatermelonDB)
   - Syncs to backend when connectivity available (Phase 3)
   - Timesheet row inserted in `timesheets` table

3. **Site Manager Approves Timesheet** (Phase 4 - Dashboard Enhancement)
   - Site manager sees pending timesheet in dashboard
   - Reviews hours, clicks "Approve"
   - `timesheets.manager_approved_at` updated
   - Status changes to `manager_approved`

4. **Admin Batch-Approves for Payout** (Phase 5.5 - Admin Dashboard)
   - Admin opens "Timesheet Approval" tab on Friday
   - Sees 20 manager-approved timesheets
   - Clicks "Batch Approve All"
   - `timesheets.admin_approved_at` updated
   - Status changes to `admin_approved`

5. **Friday Payout Job Runs** (Phase 6.5 - Automated Job)
   - Supabase Edge Function cron runs Friday 9am
   - Fetches all `admin_approved` timesheets
   - Creates Stripe Transfer to each medic's Express account
   - Updates `timesheets.paid_at`, `stripe_transfer_id`
   - Status changes to `paid`
   - Email confirmation sent to medic

**Data Tables Touched**:
- Phase 1: `auth.users` (medic login)
- Phase 1.5: `bookings` (shift details), `timesheets` (hours), `payments` (Stripe)
- Phase 2: WatermelonDB `treatments` (local mobile)
- Phase 3: Sync queue (upload timesheet)
- Phase 4: Site manager approval
- Phase 5.5: Admin batch approval
- Phase 6.5: Stripe Transfer

**Integration Points**: 7 phases working together seamlessly.

---

### Example 2: Territory Coverage Gap → Hiring Alert

**Step-by-Step Integration**:

1. **Daily Metrics Job Runs** (Phase 7.5 - Territory Management)
   - Supabase Edge Function cron runs daily
   - Calculates rejection rate per postcode sector
   - Inserts row in `territory_metrics` table

2. **Coverage Gap Detected** (Phase 7.5 - Algorithm)
   - Rejection rate >10% for "E1" sector for 3+ weeks
   - Algorithm triggers hiring alert
   - Admin sees notification in dashboard

3. **Admin Reviews Alert** (Phase 5.5 - Admin Dashboard)
   - Opens "Territory Overview" tab
   - Sees red alert: "Coverage gap in East London (E1 sector)"
   - Clicks sector to see details (utilization, bookings, rejection rate)

4. **Admin Posts Job Listing** (Manual Process)
   - Decision: Hire medic for E1 coverage
   - Post job listing externally
   - Interview and hire new medic

5. **New Medic Onboarded** (Phase 1.5 + 6.5)
   - Admin creates medic account (`medics` table)
   - Sends Stripe Express onboarding link (Phase 6.5)
   - Medic completes bank account setup

6. **Admin Assigns Territory** (Phase 7.5 - Territory Management)
   - Drag-drops new medic to "E1" sector (primary medic)
   - `territories.primary_medic_id` updated
   - New medic now receives auto-assignments for E1 bookings

**Integration Points**: Business operations (booking data) informs hiring decisions via territory analytics.

---

## API Endpoints (Supabase Edge Functions)

### Shared Endpoints

| Endpoint | Phase | Purpose |
|----------|-------|---------|
| `/auth/signup` | 1 | User registration (medics, clients, admins) |
| `/auth/login` | 1 | Authentication with role-based access |
| `/sync/upload` | 3 | Mobile app data sync (treatments, timesheets) |
| `/bookings/create` | 4.5 | Client creates booking via portal |
| `/bookings/auto-match` | 7.5 | Auto-assignment algorithm |
| `/payments/create-intent` | 6.5 | Stripe Payment Intent for prepay |
| `/payments/webhook` | 6.5 | Stripe webhook handler (payment events) |
| `/payouts/friday-job` | 6.5 | Weekly medic payout automation (cron) |
| `/territories/calculate-metrics` | 7.5 | Daily territory analytics (cron) |
| `/pdf/generate-weekly-report` | 5 | Weekly safety report PDF |
| `/pdf/generate-invoice` | 6.5 | Client invoice PDF |

---

## Conflict Resolution

### Scenario: Client Books Medic Who Becomes Unavailable

**Problem**: Client books medic (Phase 4.5), but medic marks unavailable in mobile app (Phase 2) before shift starts.

**Resolution**:
1. Medic marks unavailable → `medics.available_for_work = FALSE`
2. Booking status remains `confirmed` (already paid)
3. Admin receives notification: "Medic unavailable for confirmed booking"
4. Admin opens "Bookings Management" tab (Phase 5.5)
5. Clicks "Reassign Medic"
6. Auto-matching algorithm runs again (Phase 7.5), suggests secondary medic
7. Admin confirms reassignment
8. Original medic and client notified via email

**Impact**: Handled gracefully via admin intervention, no data loss.

---

### Scenario: Timesheet Hours Mismatch (Scheduled vs Logged)

**Problem**: Booking scheduled for 8 hours, medic logs 7.5 hours (left early).

**Resolution**:
1. Medic submits timesheet with 7.5 hours + reason ("Finished early, site closed")
2. `timesheets.discrepancy_reason` populated
3. Site manager sees mismatch in approval UI (Phase 4)
4. Site manager can approve (payout 7.5 hours) or reject (requires re-submission)
5. If approved: Medic receives £30/hr × 7.5 = £225 (not full £240)
6. Invoice to client remains full amount (£42/hr × 8 = £336)
7. Platform keeps difference (£336 - £225 = £111 instead of £96)

**Impact**: Handled via approval workflow, protects platform from overpayment.

---

## Testing Integration Points

### Integration Test Scenarios

1. **End-to-End Booking Flow**
   - Create client account (Phase 4.5)
   - Book medic (Phase 4.5 → 1.5 → 7.5 → 6.5)
   - Medic receives notification
   - Medic logs timesheet (Phase 2)
   - Sync to backend (Phase 3)
   - Manager approves (Phase 4)
   - Admin approves (Phase 5.5)
   - Friday payout runs (Phase 6.5)
   - Verify medic receives funds

2. **Territory Coverage Integration**
   - Create 10 bookings in "E1" sector
   - Reject 3 bookings (medic unavailable)
   - Verify territory metrics updated
   - Verify coverage gap alert triggers (>10% rejection)
   - Verify admin sees alert in dashboard

3. **PDF Report Integration**
   - Medic logs treatment (Phase 2)
   - Medic logs timesheet (Phase 2 enhancement)
   - Weekly PDF generates (Phase 5)
   - Verify PDF includes medic attendance section

---

## Summary

The business operations phases integrate with the medic app at multiple touchpoints:

1. **Shared Database**: All phases use same Supabase instance (eu-west-2 London)
2. **Shared Auth**: Roles added (admin, client), existing medic/site_manager roles extended
3. **Mobile App Enhancements**: Timesheet logging (Phase 2), treatment data used in reports (Phase 5)
4. **Dashboard Enhancements**: Booking management (Phase 4), admin operations (Phase 5.5)
5. **Data Flow**: Client booking → Medic timesheet → Admin approval → Automated payout
6. **Territory Analytics**: Booking data informs hiring decisions via coverage gap detection

**Key Principle**: Business operations **extend** the medic app without breaking existing functionality. All integration points designed for backward compatibility.

---

**Next Steps**:
1. Implement Phase 1.5 (database schema)
2. Test integration with Phase 1 auth
3. Add timesheet logging to Phase 2 (mobile app)
4. Extend Phase 4 dashboard with booking management
5. Build Phase 4.5 booking portal
6. Continue through Phases 5.5-7.5

**Document Version**: 1.0
**Last Updated**: 2026-02-15
