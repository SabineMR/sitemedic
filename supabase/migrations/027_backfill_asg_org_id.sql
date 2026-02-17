-- Migration 027: Backfill org_id with ASG organization
-- Purpose: Associate all existing data with ASG (Allied Services Group) organization
-- Created: 2026-02-16
-- Part 2 of 3: Backfill (columns added in 026, RLS in 028)

DO $$
DECLARE
  asg_org_id UUID;
BEGIN
  -- Add slug column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'slug'
  ) THEN
    ALTER TABLE organizations ADD COLUMN slug TEXT;
    ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT 'active';
    ALTER TABLE organizations ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
  END IF;

  -- Get or create ASG organization
  SELECT id INTO asg_org_id FROM organizations WHERE name = 'Allied Services Group' OR slug = 'asg';

  IF asg_org_id IS NULL THEN
    -- Create ASG organization if it doesn't exist
    INSERT INTO organizations (name, slug, status, onboarding_completed)
    VALUES ('Allied Services Group', 'asg', 'active', true)
    RETURNING id INTO asg_org_id;
    RAISE NOTICE 'Created ASG organization with ID: %', asg_org_id;
  ELSE
    -- Update existing org with slug if missing
    UPDATE organizations SET slug = 'asg', status = 'active', onboarding_completed = true
    WHERE id = asg_org_id AND slug IS NULL;
    RAISE NOTICE 'Using existing ASG organization with ID: %', asg_org_id;
  END IF;

  RAISE NOTICE 'Backfilling all tables with ASG org_id: %', asg_org_id;

  -- =============================================================================
  -- CORE BUSINESS OPERATIONS
  -- =============================================================================

  UPDATE territories SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % territories', (SELECT COUNT(*) FROM territories WHERE org_id = asg_org_id);

  UPDATE clients SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % clients', (SELECT COUNT(*) FROM clients WHERE org_id = asg_org_id);

  UPDATE medics SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medics', (SELECT COUNT(*) FROM medics WHERE org_id = asg_org_id);

  UPDATE bookings SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % bookings', (SELECT COUNT(*) FROM bookings WHERE org_id = asg_org_id);

  UPDATE timesheets SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % timesheets', (SELECT COUNT(*) FROM timesheets WHERE org_id = asg_org_id);

  UPDATE invoices SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % invoices', (SELECT COUNT(*) FROM invoices WHERE org_id = asg_org_id);

  UPDATE invoice_line_items SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % invoice_line_items', (SELECT COUNT(*) FROM invoice_line_items WHERE org_id = asg_org_id);

  UPDATE payments SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % payments', (SELECT COUNT(*) FROM payments WHERE org_id = asg_org_id);

  UPDATE territory_metrics SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % territory_metrics', (SELECT COUNT(*) FROM territory_metrics WHERE org_id = asg_org_id);

  UPDATE payslips SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % payslips', (SELECT COUNT(*) FROM payslips WHERE org_id = asg_org_id);

  -- =============================================================================
  -- MEDIC SCHEDULING SYSTEM
  -- =============================================================================

  UPDATE medic_availability SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medic_availability', (SELECT COUNT(*) FROM medic_availability WHERE org_id = asg_org_id);

  UPDATE medic_preferences SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medic_preferences', (SELECT COUNT(*) FROM medic_preferences WHERE org_id = asg_org_id);

  UPDATE shift_swaps SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % shift_swaps', (SELECT COUNT(*) FROM shift_swaps WHERE org_id = asg_org_id);

  UPDATE auto_schedule_logs SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % auto_schedule_logs', (SELECT COUNT(*) FROM auto_schedule_logs WHERE org_id = asg_org_id);

  UPDATE shift_templates SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % shift_templates', (SELECT COUNT(*) FROM shift_templates WHERE org_id = asg_org_id);

  UPDATE schedule_notifications SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % schedule_notifications', (SELECT COUNT(*) FROM schedule_notifications WHERE org_id = asg_org_id);

  UPDATE client_favorite_medics SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % client_favorite_medics', (SELECT COUNT(*) FROM client_favorite_medics WHERE org_id = asg_org_id);

  UPDATE booking_conflicts SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % booking_conflicts', (SELECT COUNT(*) FROM booking_conflicts WHERE org_id = asg_org_id);

  -- =============================================================================
  -- LOCATION TRACKING SYSTEM
  -- =============================================================================

  UPDATE medic_location_pings SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medic_location_pings', (SELECT COUNT(*) FROM medic_location_pings WHERE org_id = asg_org_id);

  UPDATE medic_shift_events SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medic_shift_events', (SELECT COUNT(*) FROM medic_shift_events WHERE org_id = asg_org_id);

  UPDATE medic_location_audit SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medic_location_audit', (SELECT COUNT(*) FROM medic_location_audit WHERE org_id = asg_org_id);

  UPDATE geofences SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % geofences', (SELECT COUNT(*) FROM geofences WHERE org_id = asg_org_id);

  UPDATE medic_location_consent SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medic_location_consent', (SELECT COUNT(*) FROM medic_location_consent WHERE org_id = asg_org_id);

  -- =============================================================================
  -- ALERTS AND NOTIFICATIONS
  -- =============================================================================

  UPDATE medic_alerts SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % medic_alerts', (SELECT COUNT(*) FROM medic_alerts WHERE org_id = asg_org_id);

  -- =============================================================================
  -- CONTRACTS
  -- =============================================================================

  UPDATE contract_templates SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % contract_templates', (SELECT COUNT(*) FROM contract_templates WHERE org_id = asg_org_id);

  UPDATE contracts SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % contracts', (SELECT COUNT(*) FROM contracts WHERE org_id = asg_org_id);

  UPDATE contract_versions SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % contract_versions', (SELECT COUNT(*) FROM contract_versions WHERE org_id = asg_org_id);

  UPDATE contract_events SET org_id = asg_org_id WHERE org_id IS NULL;
  RAISE NOTICE 'Updated % contract_events', (SELECT COUNT(*) FROM contract_events WHERE org_id = asg_org_id);

  -- =============================================================================
  -- ADMIN AND PAYOUTS (conditional - tables may not exist)
  -- =============================================================================

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payout_executions') THEN
    UPDATE payout_executions SET org_id = asg_org_id WHERE org_id IS NULL;
    RAISE NOTICE 'Updated % payout_executions', (SELECT COUNT(*) FROM payout_executions WHERE org_id = asg_org_id);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'out_of_territory_rules') THEN
    UPDATE out_of_territory_rules SET org_id = asg_org_id WHERE org_id IS NULL;
    RAISE NOTICE 'Updated % out_of_territory_rules', (SELECT COUNT(*) FROM out_of_territory_rules WHERE org_id = asg_org_id);
  END IF;

  -- =============================================================================
  -- MAKE COLUMNS NOT NULL
  -- =============================================================================

  -- Core business operations
  ALTER TABLE territories ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE clients ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE medics ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE bookings ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE timesheets ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE invoices ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE invoice_line_items ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE payments ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE territory_metrics ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE payslips ALTER COLUMN org_id SET NOT NULL;

  -- Scheduling
  ALTER TABLE medic_availability ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE medic_preferences ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE shift_swaps ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE auto_schedule_logs ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE shift_templates ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE schedule_notifications ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE client_favorite_medics ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE booking_conflicts ALTER COLUMN org_id SET NOT NULL;

  -- Location tracking
  ALTER TABLE medic_location_pings ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE medic_shift_events ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE medic_location_audit ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE geofences ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE medic_location_consent ALTER COLUMN org_id SET NOT NULL;

  -- Alerts
  ALTER TABLE medic_alerts ALTER COLUMN org_id SET NOT NULL;

  -- Contracts
  ALTER TABLE contract_templates ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE contracts ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE contract_versions ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE contract_events ALTER COLUMN org_id SET NOT NULL;

  -- Conditional tables
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payout_executions') THEN
    EXECUTE 'ALTER TABLE payout_executions ALTER COLUMN org_id SET NOT NULL';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'out_of_territory_rules') THEN
    EXECUTE 'ALTER TABLE out_of_territory_rules ALTER COLUMN org_id SET NOT NULL';
  END IF;

  RAISE NOTICE 'Backfill complete! All org_id columns are now NOT NULL.';

END $$;

-- =============================================================================
-- UPDATE FUNCTIONS TO POPULATE ORG_ID AUTOMATICALLY
-- =============================================================================

-- Update the payslip generation trigger to include org_id
CREATE OR REPLACE FUNCTION generate_payslip_on_payout()
RETURNS TRIGGER AS $$
DECLARE
  medic_record RECORD;
  timesheet_org_id UUID;
BEGIN
  -- Only trigger when payout_status changes to 'paid'
  IF NEW.payout_status = 'paid' AND OLD.payout_status != 'paid' THEN
    -- Get org_id from timesheet
    timesheet_org_id := NEW.org_id;

    -- Fetch medic employment details
    SELECT employment_status, utr, umbrella_company_name
    INTO medic_record
    FROM medics
    WHERE id = NEW.medic_id;

    -- Insert payslip record with org_id
    INSERT INTO payslips (
      timesheet_id,
      medic_id,
      org_id,
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
      timesheet_org_id,
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

-- Migration complete: Backfilled all existing data with ASG org_id and made columns NOT NULL.
-- Ready for RLS policies in migration 028.
