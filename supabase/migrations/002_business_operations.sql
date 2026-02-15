-- Migration 002: Business Operations Foundation
-- Phase 1.5: Database schema for booking portal, payments, territory management
-- Created: 2026-02-15
-- Depends on: 001_initial_schema.sql (Phase 1 - auth, audit_logs, gdpr_consents)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: territories
-- Purpose: UK postcode sectors with primary/secondary medic assignments
-- =============================================================================
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postcode_sector TEXT NOT NULL UNIQUE, -- e.g., "SW1A", "N1", "E14"
  region TEXT NOT NULL, -- e.g., "London", "Manchester", "Birmingham"
  primary_medic_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  secondary_medic_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_travel_minutes INT DEFAULT 30, -- Hybrid model: postcode + max travel time
  notes TEXT, -- Admin notes about territory
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_territories_postcode ON territories(postcode_sector);
CREATE INDEX idx_territories_primary_medic ON territories(primary_medic_id);
CREATE INDEX idx_territories_secondary_medic ON territories(secondary_medic_id);
CREATE INDEX idx_territories_region ON territories(region);

COMMENT ON TABLE territories IS 'UK postcode sectors with medic assignments for coverage management';
COMMENT ON COLUMN territories.postcode_sector IS 'First 3-4 characters of UK postcode (e.g., SW1A, N1)';
COMMENT ON COLUMN territories.max_travel_minutes IS 'Maximum acceptable travel time for medics in this territory';

-- =============================================================================
-- TABLE: clients
-- Purpose: Construction company accounts with payment terms
-- =============================================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Phase 1 auth
  company_name TEXT NOT NULL,
  vat_number TEXT,
  billing_address TEXT NOT NULL,
  billing_postcode TEXT NOT NULL,

  -- Primary contact
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,

  -- Payment terms
  payment_terms TEXT NOT NULL DEFAULT 'prepay', -- 'prepay' or 'net_30'
  credit_limit DECIMAL(10,2) DEFAULT 0, -- For Net 30 clients (in GBP)
  outstanding_balance DECIMAL(10,2) DEFAULT 0, -- Current unpaid invoices

  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  default_payment_method_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, closed
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,

  -- Stats
  total_bookings INT DEFAULT 0,
  successful_bookings INT DEFAULT 0,
  cancelled_bookings INT DEFAULT 0,
  late_payments INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_payment_terms CHECK (payment_terms IN ('prepay', 'net_30')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'closed'))
);

CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_stripe_customer ON clients(stripe_customer_id);
CREATE INDEX idx_clients_payment_terms ON clients(payment_terms);

COMMENT ON TABLE clients IS 'Construction company accounts with payment terms and Stripe integration';
COMMENT ON COLUMN clients.payment_terms IS 'prepay = charge card immediately, net_30 = invoice with 30-day terms';
COMMENT ON COLUMN clients.credit_limit IS 'Maximum outstanding balance allowed for Net 30 clients';

-- =============================================================================
-- TABLE: medics
-- Purpose: Medic roster with qualifications and Stripe payout details
-- =============================================================================
CREATE TABLE medics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Address (for travel time calculations)
  home_address TEXT NOT NULL,
  home_postcode TEXT NOT NULL,

  -- Qualifications
  has_confined_space_cert BOOLEAN DEFAULT FALSE,
  has_trauma_cert BOOLEAN DEFAULT FALSE,
  certifications JSONB DEFAULT '[]'::jsonb, -- Array of {type, expiry_date, cert_number}

  -- Stripe payout
  stripe_account_id TEXT UNIQUE, -- Stripe Express account ID
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  stripe_onboarding_url TEXT, -- Link to complete onboarding

  -- IR35 status (CRITICAL for tax compliance)
  employment_status TEXT NOT NULL DEFAULT 'self_employed', -- self_employed, umbrella
  utr TEXT, -- Unique Taxpayer Reference (for self-employed)
  umbrella_company_name TEXT,
  cest_assessment_result TEXT, -- HMRC CEST tool result
  cest_assessment_date DATE,
  cest_pdf_url TEXT, -- Stored in Supabase Storage

  -- Performance
  star_rating DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 5.00
  total_shifts_completed INT DEFAULT 0,
  total_shifts_cancelled INT DEFAULT 0,
  riddor_compliance_rate DECIMAL(5,2) DEFAULT 100.00, -- Percentage

  -- Availability
  available_for_work BOOLEAN DEFAULT TRUE,
  unavailable_reason TEXT,
  unavailable_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_employment_status CHECK (employment_status IN ('self_employed', 'umbrella')),
  CONSTRAINT valid_star_rating CHECK (star_rating >= 0 AND star_rating <= 5)
);

CREATE INDEX idx_medics_user ON medics(user_id);
CREATE INDEX idx_medics_stripe_account ON medics(stripe_account_id);
CREATE INDEX idx_medics_postcode ON medics(home_postcode);
CREATE INDEX idx_medics_available ON medics(available_for_work);
CREATE INDEX idx_medics_email ON medics(email);

COMMENT ON TABLE medics IS 'Medic roster with qualifications, Stripe payout accounts, and IR35 compliance';
COMMENT ON COLUMN medics.employment_status IS 'IR35 classification: self_employed (contractor) or umbrella (employed via umbrella company)';
COMMENT ON COLUMN medics.cest_assessment_result IS 'HMRC Check Employment Status for Tax tool result for IR35 compliance';

-- =============================================================================
-- TABLE: bookings
-- Purpose: Medic shift bookings with pricing, status, and matching details
-- =============================================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  medic_id UUID REFERENCES medics(id) ON DELETE RESTRICT, -- NULL until assigned
  site_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For Phase 4 enhancement

  -- Site details
  site_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  site_postcode TEXT NOT NULL,
  site_contact_name TEXT,
  site_contact_phone TEXT,

  -- Shift timing
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  shift_hours DECIMAL(4,2) NOT NULL, -- e.g., 8.00

  -- Pricing breakdown (all in GBP)
  base_rate DECIMAL(10,2) NOT NULL, -- Per hour (medic rate)
  urgency_premium_percent INT DEFAULT 0, -- 0, 20, 50, 75
  travel_surcharge DECIMAL(10,2) DEFAULT 0,
  out_of_territory_cost DECIMAL(10,2) DEFAULT 0, -- Travel bonus or room/board
  out_of_territory_type TEXT, -- 'travel_bonus', 'room_board', NULL
  subtotal DECIMAL(10,2) NOT NULL,
  vat DECIMAL(10,2) NOT NULL, -- 20% UK VAT
  total DECIMAL(10,2) NOT NULL,

  -- Platform fee (40% markup)
  platform_fee DECIMAL(10,2) NOT NULL, -- Total - medic payout
  medic_payout DECIMAL(10,2) NOT NULL, -- 60% of revenue

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled
  requires_manual_approval BOOLEAN DEFAULT FALSE,
  approval_reason TEXT,
  approved_by UUID REFERENCES auth.users(id), -- Admin who approved
  approved_at TIMESTAMPTZ,

  -- Special requirements
  confined_space_required BOOLEAN DEFAULT FALSE,
  trauma_specialist_required BOOLEAN DEFAULT FALSE,
  special_notes TEXT,

  -- Recurring booking
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- e.g., "weekly", "biweekly"
  recurring_until DATE,
  parent_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL, -- For recurring instances

  -- Auto-matching metadata
  auto_matched BOOLEAN DEFAULT FALSE,
  match_score DECIMAL(5,2), -- 0.00 to 100.00
  match_criteria JSONB, -- Store ranking breakdown: {distance: 10, utilization: 8, ...}

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id), -- Who cancelled (client or admin)
  refund_amount DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT valid_urgency_premium CHECK (urgency_premium_percent IN (0, 20, 50, 75)),
  CONSTRAINT valid_out_of_territory_type CHECK (out_of_territory_type IN ('travel_bonus', 'room_board', NULL)),
  CONSTRAINT positive_hours CHECK (shift_hours > 0),
  CONSTRAINT minimum_8_hours CHECK (shift_hours >= 8) -- UK construction standard
);

CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_medic ON bookings(medic_id);
CREATE INDEX idx_bookings_date ON bookings(shift_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_postcode ON bookings(site_postcode);
CREATE INDEX idx_bookings_requires_approval ON bookings(requires_manual_approval) WHERE requires_manual_approval = TRUE;

COMMENT ON TABLE bookings IS 'Medic shift bookings with pricing breakdown and auto-matching metadata';
COMMENT ON COLUMN bookings.urgency_premium_percent IS 'Urgency premium: 0% (7+ days), 20% (4-6 days), 50% (1-3 days), 75% (<24 hours)';
COMMENT ON COLUMN bookings.platform_fee IS '40% markup: total revenue - medic payout';

-- =============================================================================
-- TABLE: timesheets
-- Purpose: Hours worked with approval workflow for Friday payouts
-- =============================================================================
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE RESTRICT,

  -- Hours
  scheduled_hours DECIMAL(4,2) NOT NULL,
  logged_hours DECIMAL(4,2) NOT NULL,
  discrepancy_reason TEXT, -- Required if logged != scheduled

  -- Approval workflow: medic → site manager → admin
  medic_submitted_at TIMESTAMPTZ,
  manager_approved_at TIMESTAMPTZ,
  manager_approved_by UUID REFERENCES auth.users(id), -- Site manager
  manager_rejection_reason TEXT,
  admin_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES auth.users(id), -- Admin
  admin_rejection_reason TEXT,

  -- Payout (60% of booking revenue)
  payout_amount DECIMAL(10,2) NOT NULL, -- Medic's 60% share
  payout_status TEXT NOT NULL DEFAULT 'pending', -- pending, manager_approved, admin_approved, paid, rejected
  paid_at TIMESTAMPTZ,
  stripe_transfer_id TEXT, -- Stripe Transfer ID

  -- Medic confirmation (for audit trail)
  medic_confirmed BOOLEAN DEFAULT FALSE, -- Medic confirms payout received

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_payout_status CHECK (payout_status IN ('pending', 'manager_approved', 'admin_approved', 'paid', 'rejected')),
  CONSTRAINT positive_hours CHECK (logged_hours > 0)
);

CREATE INDEX idx_timesheets_booking ON timesheets(booking_id);
CREATE INDEX idx_timesheets_medic ON timesheets(medic_id);
CREATE INDEX idx_timesheets_payout_status ON timesheets(payout_status);
CREATE INDEX idx_timesheets_pending_admin_approval ON timesheets(payout_status) WHERE payout_status = 'manager_approved';
CREATE INDEX idx_timesheets_paid_at ON timesheets(paid_at);

COMMENT ON TABLE timesheets IS 'Medic hours worked with three-tier approval workflow (medic → manager → admin → Friday payout)';
COMMENT ON COLUMN timesheets.payout_amount IS 'Medic receives 60% of booking revenue (platform keeps 40%)';

-- =============================================================================
-- TABLE: invoices
-- Purpose: Client invoices with VAT and Net 30 payment tracking
-- =============================================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE, -- e.g., "INV-2026-001"
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Amounts (in GBP)
  subtotal DECIMAL(10,2) NOT NULL,
  vat DECIMAL(10,2) NOT NULL, -- 20% UK VAT
  total DECIMAL(10,2) NOT NULL,

  -- Payment terms
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL, -- invoice_date + 30 days for Net 30
  payment_terms TEXT NOT NULL, -- 'prepay' or 'net_30'

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Late payment handling
  reminder_sent_7_days BOOLEAN DEFAULT FALSE,
  reminder_sent_14_days BOOLEAN DEFAULT FALSE,
  reminder_sent_21_days BOOLEAN DEFAULT FALSE,
  late_fee_charged DECIMAL(10,2) DEFAULT 0, -- Statutory late fees: £40-100

  -- PDF
  pdf_url TEXT, -- Supabase Storage signed URL

  -- Stripe (for online payment link)
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT valid_payment_terms CHECK (payment_terms IN ('prepay', 'net_30'))
);

CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_overdue ON invoices(status, due_date) WHERE status = 'sent' AND due_date < CURRENT_DATE;

COMMENT ON TABLE invoices IS 'Client invoices with VAT (20%), Net 30 payment terms, and late payment tracking';
COMMENT ON COLUMN invoices.late_fee_charged IS 'UK statutory late payment fees: £40 (<£1000), £70 (£1000-9999), £100 (£10k+)';

-- =============================================================================
-- TABLE: invoice_line_items
-- Purpose: Individual bookings included in each invoice
-- =============================================================================
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,

  description TEXT NOT NULL, -- e.g., "Medic service - ABC Construction - 10 Feb 2026"
  quantity DECIMAL(4,2) NOT NULL, -- Hours worked
  unit_price DECIMAL(10,2) NOT NULL, -- Rate per hour (client pays)
  amount DECIMAL(10,2) NOT NULL, -- quantity × unit_price

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_booking ON invoice_line_items(booking_id);

COMMENT ON TABLE invoice_line_items IS 'Line items (bookings) included in each client invoice';

-- =============================================================================
-- TABLE: payments
-- Purpose: Stripe payment transactions (client charges)
-- =============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL, -- For prepay bookings
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Stripe
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,

  -- Amounts (in GBP)
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL, -- 40% markup
  medic_payout DECIMAL(10,2) NOT NULL, -- 60% to medic

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, refunded
  failure_reason TEXT,
  failure_code TEXT,

  -- Refunds
  refunded_amount DECIMAL(10,2) DEFAULT 0,
  refund_reason TEXT,
  stripe_refund_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded'))
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);

COMMENT ON TABLE payments IS 'Stripe payment transactions with platform fee tracking and refund handling';

-- =============================================================================
-- TABLE: travel_time_cache
-- Purpose: Cache Google Maps API results (7-day TTL) to reduce costs
-- =============================================================================
CREATE TABLE travel_time_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin_postcode TEXT NOT NULL,
  destination_postcode TEXT NOT NULL,
  travel_time_minutes INT NOT NULL,
  distance_miles DECIMAL(6,2) NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  UNIQUE(origin_postcode, destination_postcode)
);

CREATE INDEX idx_travel_cache_origin ON travel_time_cache(origin_postcode);
CREATE INDEX idx_travel_cache_destination ON travel_time_cache(destination_postcode);
CREATE INDEX idx_travel_cache_expires ON travel_time_cache(expires_at);

COMMENT ON TABLE travel_time_cache IS 'Google Maps Distance Matrix API results cached for 7 days (reduces costs by 70-80%)';

-- =============================================================================
-- TABLE: territory_metrics
-- Purpose: Daily analytics for hiring decisions and coverage gap detection
-- =============================================================================
CREATE TABLE territory_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postcode_sector TEXT NOT NULL,
  metric_date DATE NOT NULL,

  -- Bookings
  total_bookings INT DEFAULT 0,
  confirmed_bookings INT DEFAULT 0,
  rejected_bookings INT DEFAULT 0,
  rejection_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage

  -- Utilization
  primary_medic_id UUID REFERENCES medics(id) ON DELETE SET NULL,
  primary_medic_utilization DECIMAL(5,2) DEFAULT 0.00, -- Percentage
  secondary_medic_id UUID REFERENCES medics(id) ON DELETE SET NULL,
  secondary_medic_utilization DECIMAL(5,2) DEFAULT 0.00,

  -- Coverage
  fulfillment_rate DECIMAL(5,2) DEFAULT 100.00, -- % successfully filled
  avg_travel_time_minutes DECIMAL(6,2),
  out_of_territory_bookings INT DEFAULT 0, -- Bookings requiring secondary medic

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(postcode_sector, metric_date)
);

CREATE INDEX idx_territory_metrics_postcode ON territory_metrics(postcode_sector);
CREATE INDEX idx_territory_metrics_date ON territory_metrics(metric_date);
CREATE INDEX idx_territory_metrics_rejection_rate ON territory_metrics(rejection_rate) WHERE rejection_rate > 10; -- Alert threshold

COMMENT ON TABLE territory_metrics IS 'Daily territory analytics for hiring triggers (utilization >80%, rejection >10%, fulfillment <90%)';

-- =============================================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medics_updated_at BEFORE UPDATE ON medics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Test records for development
-- =============================================================================

-- Insert test territory (London E1)
INSERT INTO territories (postcode_sector, region, max_travel_minutes)
VALUES ('E1', 'London', 30);

-- Note: Test client, medic, and booking will be created via application
-- after Phase 1 auth system is running (requires user_id from auth.users)

COMMENT ON SCHEMA public IS 'Business operations schema for SiteMedic platform - Phase 1.5';
