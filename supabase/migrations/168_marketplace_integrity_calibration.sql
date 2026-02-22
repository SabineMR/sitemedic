-- Migration 168: Marketplace Integrity Calibration + Expanded Signal Taxonomy
-- Phase 52: Marketplace Integrity Automation Tuning - Plan 01
-- Created: 2026-02-22
-- Purpose: Add configurable thresholds, repeat-offender escalation logic, and expanded signal types.

CREATE TABLE IF NOT EXISTS marketplace_integrity_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key TEXT NOT NULL DEFAULT 'marketplace_integrity' UNIQUE CHECK (singleton_key = 'marketplace_integrity'),
  medium_risk_threshold INT NOT NULL DEFAULT 35 CHECK (medium_risk_threshold >= 1 AND medium_risk_threshold <= 500),
  high_risk_threshold INT NOT NULL DEFAULT 70 CHECK (high_risk_threshold >= 1 AND high_risk_threshold <= 900),
  repeat_offender_case_window_days INT NOT NULL DEFAULT 180 CHECK (repeat_offender_case_window_days BETWEEN 30 AND 365),
  repeat_offender_confirmed_case_threshold INT NOT NULL DEFAULT 2 CHECK (repeat_offender_confirmed_case_threshold BETWEEN 1 AND 20),
  repeat_offender_score_boost INT NOT NULL DEFAULT 20 CHECK (repeat_offender_score_boost BETWEEN 0 AND 200),
  review_sla_hours INT NOT NULL DEFAULT 48 CHECK (review_sla_hours BETWEEN 1 AND 336),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_integrity_threshold_order_check CHECK (high_risk_threshold > medium_risk_threshold)
);

INSERT INTO marketplace_integrity_config (
  singleton_key,
  medium_risk_threshold,
  high_risk_threshold,
  repeat_offender_case_window_days,
  repeat_offender_confirmed_case_threshold,
  repeat_offender_score_boost,
  review_sla_hours
)
VALUES (
  'marketplace_integrity',
  35,
  70,
  180,
  2,
  20,
  48
)
ON CONFLICT (singleton_key) DO NOTHING;

ALTER TABLE marketplace_integrity_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_all_integrity_config"
  ON marketplace_integrity_config FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Expand signal taxonomy for collision and referral-loop abuse
ALTER TABLE marketplace_integrity_signals
  DROP CONSTRAINT IF EXISTS marketplace_integrity_signals_signal_type_check;

ALTER TABLE marketplace_integrity_signals
  ADD CONSTRAINT marketplace_integrity_signals_signal_type_check
  CHECK (
    signal_type IN (
      'THREAD_NO_CONVERT',
      'PROXIMITY_CLONE',
      'MARKETPLACE_TO_DIRECT_SWITCH',
      'PASS_ON_ACTIVITY',
      'EVENT_COLLISION_DUPLICATE',
      'REFERRAL_LOOP_ABUSE'
    )
  );

ALTER TABLE marketplace_integrity_scores
  ADD COLUMN IF NOT EXISTS escalation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION handle_integrity_score_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_case marketplace_integrity_cases;
  cfg marketplace_integrity_config;
  reason_text TEXT;
  effective_score INT;
  repeat_confirmed_count INT;
  should_escalate BOOLEAN;
BEGIN
  SELECT *
  INTO cfg
  FROM marketplace_integrity_config
  WHERE singleton_key = 'marketplace_integrity'
  LIMIT 1;

  IF cfg.id IS NULL THEN
    RAISE EXCEPTION 'marketplace_integrity_config row missing';
  END IF;

  SELECT *
  INTO active_case
  FROM marketplace_integrity_cases
  WHERE event_id = NEW.event_id
    AND closed_at IS NULL
  LIMIT 1;

  SELECT COUNT(*)
  INTO repeat_confirmed_count
  FROM marketplace_integrity_cases
  WHERE company_id = NEW.company_id
    AND status = 'resolved_confirmed'
    AND closed_at >= NOW() - make_interval(days => cfg.repeat_offender_case_window_days);

  effective_score := NEW.score;
  IF repeat_confirmed_count >= cfg.repeat_offender_confirmed_case_threshold THEN
    effective_score := LEAST(1000, NEW.score + cfg.repeat_offender_score_boost);
  END IF;

  should_escalate := effective_score >= cfg.high_risk_threshold;

  IF should_escalate THEN
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
        effective_score,
        'high',
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
        jsonb_build_object(
          'score', NEW.score,
          'effective_score', effective_score,
          'repeat_confirmed_count', repeat_confirmed_count,
          'risk_band', NEW.risk_band
        )
      );
    ELSE
      UPDATE marketplace_integrity_cases
      SET
        score = effective_score,
        risk_band = 'high',
        status = CASE WHEN active_case.status = 'open' THEN 'investigating' ELSE active_case.status END,
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
        jsonb_build_object(
          'score', NEW.score,
          'effective_score', effective_score,
          'repeat_confirmed_count', repeat_confirmed_count,
          'risk_band', NEW.risk_band
        )
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
      score = effective_score,
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
      jsonb_build_object(
        'score', NEW.score,
        'effective_score', effective_score,
        'repeat_confirmed_count', repeat_confirmed_count,
        'risk_band', NEW.risk_band
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON TABLE marketplace_integrity_config IS 'Singleton config for marketplace integrity thresholds and escalation tuning';
