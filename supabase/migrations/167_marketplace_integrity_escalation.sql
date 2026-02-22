-- Migration 167: Marketplace Integrity Escalation Queue
-- Phase 51: Marketplace Integrity Enforcement - Plan 01
-- Created: 2026-02-22
-- Purpose: Convert high-risk scores into review cases and payout-hold automation.

CREATE TABLE IF NOT EXISTS marketplace_integrity_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  company_id UUID REFERENCES marketplace_companies(id) ON DELETE SET NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 1000),
  risk_band TEXT NOT NULL CHECK (risk_band IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (
    status IN ('open', 'investigating', 'resolved_dismissed', 'resolved_confirmed')
  ),
  auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
  payout_hold_applied BOOLEAN NOT NULL DEFAULT FALSE,
  hold_reason TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integrity_cases_event_active
  ON marketplace_integrity_cases(event_id)
  WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_integrity_cases_status_opened
  ON marketplace_integrity_cases(status, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_cases_company_status
  ON marketplace_integrity_cases(company_id, status, opened_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_integrity_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES marketplace_integrity_cases(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('auto_opened', 'score_updated', 'manual_status_change', 'resolved')
  ),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_case_events_case_created
  ON marketplace_integrity_case_events(case_id, created_at DESC);

CREATE OR REPLACE FUNCTION handle_integrity_score_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_case marketplace_integrity_cases;
  reason_text TEXT;
BEGIN
  SELECT *
  INTO active_case
  FROM marketplace_integrity_cases
  WHERE event_id = NEW.event_id
    AND closed_at IS NULL
  LIMIT 1;

  IF NEW.risk_band = 'high' THEN
    IF active_case.id IS NULL THEN
      reason_text := 'integrity_case_auto_high_risk';

      INSERT INTO marketplace_integrity_cases (
        event_id,
        company_id,
        score,
        risk_band,
        status,
        auto_generated,
        payout_hold_applied,
        hold_reason,
        opened_by
      ) VALUES (
        NEW.event_id,
        NEW.company_id,
        NEW.score,
        NEW.risk_band,
        'open',
        TRUE,
        TRUE,
        reason_text,
        NEW.updated_by
      )
      RETURNING * INTO active_case;

      INSERT INTO marketplace_integrity_case_events (
        case_id,
        event_id,
        event_type,
        actor_user_id,
        details
      ) VALUES (
        active_case.id,
        NEW.event_id,
        'auto_opened',
        NEW.updated_by,
        jsonb_build_object('score', NEW.score, 'risk_band', NEW.risk_band)
      );
    ELSE
      UPDATE marketplace_integrity_cases
      SET
        score = NEW.score,
        risk_band = NEW.risk_band,
        updated_at = NOW(),
        payout_hold_applied = TRUE,
        hold_reason = COALESCE(active_case.hold_reason, 'integrity_case_auto_high_risk')
      WHERE id = active_case.id;

      INSERT INTO marketplace_integrity_case_events (
        case_id,
        event_id,
        event_type,
        actor_user_id,
        details
      ) VALUES (
        active_case.id,
        NEW.event_id,
        'score_updated',
        NEW.updated_by,
        jsonb_build_object('score', NEW.score, 'risk_band', NEW.risk_band)
      );
    END IF;

    UPDATE bookings
    SET
      remainder_hold = TRUE,
      remainder_hold_reason = COALESCE(remainder_hold_reason, 'integrity_case:' || active_case.id::text)
    WHERE marketplace_event_id = NEW.event_id;

  ELSIF active_case.id IS NOT NULL THEN
    UPDATE marketplace_integrity_cases
    SET
      score = NEW.score,
      risk_band = NEW.risk_band,
      updated_at = NOW()
    WHERE id = active_case.id;

    INSERT INTO marketplace_integrity_case_events (
      case_id,
      event_id,
      event_type,
      actor_user_id,
      details
    ) VALUES (
      active_case.id,
      NEW.event_id,
      'score_updated',
      NEW.updated_by,
      jsonb_build_object('score', NEW.score, 'risk_band', NEW.risk_band)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integrity_score_escalation ON marketplace_integrity_scores;
CREATE TRIGGER trg_integrity_score_escalation
  AFTER INSERT OR UPDATE ON marketplace_integrity_scores
  FOR EACH ROW
  EXECUTE FUNCTION handle_integrity_score_escalation();

CREATE OR REPLACE FUNCTION set_integrity_case_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integrity_case_updated_at ON marketplace_integrity_cases;
CREATE TRIGGER trg_integrity_case_updated_at
  BEFORE UPDATE ON marketplace_integrity_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_integrity_case_updated_at();

ALTER TABLE marketplace_integrity_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_integrity_case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_all_integrity_cases"
  ON marketplace_integrity_cases FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_all_integrity_case_events"
  ON marketplace_integrity_case_events FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

COMMENT ON TABLE marketplace_integrity_cases IS 'Platform review queue for escalated integrity risks';
COMMENT ON TABLE marketplace_integrity_case_events IS 'Immutable event log for integrity case lifecycle actions';
