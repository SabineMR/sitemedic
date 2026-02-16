-- Migration 021: Payslip Generation
-- Auto-generate payslips for medic payouts
-- Phase 6.5: IR35 Compliance

-- Payslips table
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,

  -- Pay period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE NOT NULL,

  -- Amounts (in GBP)
  gross_pay DECIMAL(10,2) NOT NULL,
  tax_deducted DECIMAL(10,2) DEFAULT 0,
  ni_deducted DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2) NOT NULL,

  -- Employment details
  employment_status TEXT NOT NULL, -- From medics.employment_status
  utr TEXT, -- For self-employed
  umbrella_company_name TEXT, -- For umbrella

  -- PDF
  pdf_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_employment_status CHECK (employment_status IN ('self_employed', 'umbrella'))
);

CREATE INDEX idx_payslips_timesheet ON payslips(timesheet_id);
CREATE INDEX idx_payslips_medic ON payslips(medic_id);
CREATE INDEX idx_payslips_payment_date ON payslips(payment_date DESC);

-- Function to auto-generate payslip when timesheet is paid
CREATE OR REPLACE FUNCTION generate_payslip_on_payout()
RETURNS TRIGGER AS $$
DECLARE
  medic_record RECORD;
BEGIN
  -- Only trigger when payout_status changes to 'paid'
  IF NEW.payout_status = 'paid' AND OLD.payout_status != 'paid' THEN
    -- Fetch medic employment details
    SELECT employment_status, utr, umbrella_company_name
    INTO medic_record
    FROM medics
    WHERE id = NEW.medic_id;

    -- Insert payslip record
    INSERT INTO payslips (
      timesheet_id,
      medic_id,
      pay_period_start,
      pay_period_end,
      payment_date,
      gross_pay,
      tax_deducted,
      ni_deducted,
      net_pay,
      employment_status,
      utr,
      umbrella_company_name
    ) VALUES (
      NEW.id,
      NEW.medic_id,
      (SELECT shift_date FROM bookings WHERE id = NEW.booking_id),
      (SELECT shift_date FROM bookings WHERE id = NEW.booking_id),
      CURRENT_DATE,
      NEW.payout_amount,
      0, -- Self-employed: no deductions (medic handles own tax)
      0, -- Self-employed: no NI deductions
      NEW.payout_amount,
      medic_record.employment_status,
      medic_record.utr,
      medic_record.umbrella_company_name
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_payslip_on_payout
  AFTER UPDATE ON timesheets
  FOR EACH ROW
  EXECUTE FUNCTION generate_payslip_on_payout();

COMMENT ON TABLE payslips IS 'Auto-generated payslips for medic payouts with IR35 compliance details';
COMMENT ON FUNCTION generate_payslip_on_payout IS 'Trigger: Creates payslip record when timesheet.payout_status changes to paid';
