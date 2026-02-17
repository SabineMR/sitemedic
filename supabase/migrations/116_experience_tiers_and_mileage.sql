-- Migration 116: Experience tiers + mileage reimbursement
-- Adds:
--   1. experience_level column on medics (junior | senior | lead)
--      with trigger to auto-sync medic_payout_percent / platform_fee_percent
--   2. Mileage columns on timesheets (miles, rate, reimbursement amount)
-- Created: 2026-02-17
--
-- Experience tier payout splits:
--   junior → medic 35% / platform 65%
--   senior → medic 42% / platform 58%
--   lead   → medic 50% / platform 50%
--
-- Mileage reimbursement:
--   HMRC approved rate: 45p/mile (£0.45/mile)
--   Applied to every shift — distance from medic home postcode to site
--   Pulled from travel_time_cache (already stored by Google Maps API)
--   Mileage is added ON TOP of the % payout (not part of the split)

-- =============================================================================
-- 1. Experience level on medics
-- =============================================================================

ALTER TABLE medics
  ADD COLUMN IF NOT EXISTS experience_level TEXT NOT NULL DEFAULT 'junior'
    CHECK (experience_level IN ('junior', 'senior', 'lead'));

COMMENT ON COLUMN medics.experience_level IS
  'Medic experience tier. Determines payout percentage:
   junior → 35% | senior → 42% | lead → 50%.
   Changing this value triggers auto-update of medic_payout_percent
   and platform_fee_percent via set_payout_from_experience_level trigger.';

-- Trigger function: sync payout split when experience_level changes
CREATE OR REPLACE FUNCTION set_payout_from_experience_level()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  CASE NEW.experience_level
    WHEN 'junior' THEN
      NEW.medic_payout_percent  := 35.00;
      NEW.platform_fee_percent  := 65.00;
    WHEN 'senior' THEN
      NEW.medic_payout_percent  := 42.00;
      NEW.platform_fee_percent  := 58.00;
    WHEN 'lead' THEN
      NEW.medic_payout_percent  := 50.00;
      NEW.platform_fee_percent  := 50.00;
    ELSE
      -- Unknown tier: keep existing values unchanged
      NEW.medic_payout_percent  := OLD.medic_payout_percent;
      NEW.platform_fee_percent  := OLD.platform_fee_percent;
  END CASE;
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists (safe for re-runs)
DROP TRIGGER IF EXISTS trg_payout_from_experience_level ON medics;

CREATE TRIGGER trg_payout_from_experience_level
  BEFORE INSERT OR UPDATE OF experience_level ON medics
  FOR EACH ROW
  EXECUTE FUNCTION set_payout_from_experience_level();

-- Back-fill: set experience_level for existing medics based on current payout %
-- (Closest match; admin can adjust afterward in the UI)
UPDATE medics SET experience_level =
  CASE
    WHEN medic_payout_percent >= 48 THEN 'lead'
    WHEN medic_payout_percent >= 39 THEN 'senior'
    ELSE 'junior'
  END
WHERE experience_level = 'junior'; -- Only touch rows with the default

-- =============================================================================
-- 2. Mileage reimbursement columns on timesheets
-- =============================================================================

ALTER TABLE timesheets
  ADD COLUMN IF NOT EXISTS mileage_miles        DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS mileage_rate_pence   INT     NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS mileage_reimbursement DECIMAL(10,2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN timesheets.mileage_miles IS
  'Distance in miles from medic home postcode to job site.
   Auto-populated from travel_time_cache when timesheet is created.
   Null means distance could not be looked up.';

COMMENT ON COLUMN timesheets.mileage_rate_pence IS
  'HMRC approved mileage rate in pence per mile. Default 45 (£0.45/mile).
   Stored as a snapshot so rate changes do not affect historical records.';

COMMENT ON COLUMN timesheets.mileage_reimbursement IS
  'GBP amount paid to medic for travel: mileage_miles × (mileage_rate_pence / 100).
   Added on top of the % payout — not deducted from the platform fee.';

-- Index: quickly find timesheets with mileage claims
CREATE INDEX IF NOT EXISTS idx_timesheets_has_mileage
  ON timesheets(medic_id)
  WHERE mileage_miles IS NOT NULL AND mileage_miles > 0;
