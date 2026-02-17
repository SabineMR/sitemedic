-- 033_riddor_auto_detect_trigger.sql
-- RIDDOR Auto-Detection Trigger
-- Phase 6: RIDDOR Auto-Flagging - Plan 07
--
-- Purpose: Complete the RIDDOR auto-detection data pipeline
-- Automatically calls riddor-detector Edge Function when treatments are created or updated
--
-- Data Pipeline:
--   Treatment saved → Trigger fires → riddor-detector Edge Function called →
--   riddor_incidents table populated → Dashboard/emails/analytics all work
--
-- Dependencies:
--   - Edge Function: riddor-detector (Plan 06-01)
--   - Table: riddor_incidents (migration 018)
--   - Vault secrets: project_url, service_role_key
--
-- Design Decisions:
--   - Uses pg_net.http_post for non-blocking async HTTP call (does NOT delay treatment writes)
--   - Only fires when injury_type IS NOT NULL (avoids wasted calls on empty drafts)
--   - Fires on both INSERT and UPDATE (treatments may start as drafts, get completed later)
--   - Edge Function is idempotent (UNIQUE constraint on treatment_id, handles duplicates gracefully)
--   - Uses Vault for secure service_role_key storage (same pattern as migration 021)

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing trigger if it exists (for migration idempotency)
DROP TRIGGER IF EXISTS riddor_auto_detect_trigger ON treatments;

-- Create trigger function that calls riddor-detector Edge Function
CREATE OR REPLACE FUNCTION detect_riddor_on_treatment()
RETURNS TRIGGER AS $$
DECLARE
  v_project_url text;
  v_service_role_key text;
BEGIN
  -- Retrieve secrets from Vault
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Call riddor-detector Edge Function asynchronously via pg_net
  -- Non-blocking: Does NOT delay the treatment INSERT/UPDATE transaction
  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/riddor-detector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'treatment_id', NEW.id
    )
  );

  -- Return NEW (does not modify the treatment row)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on treatments table
-- Fires AFTER INSERT OR UPDATE when injury_type IS NOT NULL
-- (Skips incomplete drafts that haven't selected an injury yet)
CREATE TRIGGER riddor_auto_detect_trigger
  AFTER INSERT OR UPDATE ON treatments
  FOR EACH ROW
  WHEN (NEW.injury_type IS NOT NULL)
  EXECUTE FUNCTION detect_riddor_on_treatment();

-- =============================================
-- Monitoring and Testing Queries
-- =============================================
-- Use these queries to verify trigger operation

-- Test trigger with a treatment update:
-- UPDATE treatments SET injury_type = 'fracture', body_part = 'finger'
-- WHERE id = 'some-treatment-id';

-- Check if RIDDOR incident was created:
-- SELECT * FROM riddor_incidents
-- WHERE treatment_id = 'some-treatment-id';

-- View trigger metadata:
-- SELECT tgname, tgenabled, tgtype, tgrelid::regclass
-- FROM pg_trigger
-- WHERE tgname = 'riddor_auto_detect_trigger';

-- Disable trigger (if needed for testing):
-- ALTER TABLE treatments DISABLE TRIGGER riddor_auto_detect_trigger;

-- Re-enable trigger:
-- ALTER TABLE treatments ENABLE TRIGGER riddor_auto_detect_trigger;
