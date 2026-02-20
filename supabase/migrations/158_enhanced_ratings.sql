-- Migration 158: Enhanced Rating System
-- Phase 36 Extension: 10 Features + 2 Decimal Precision
-- Created: 2026-02-20
-- Purpose: Upgrade the rating system with Bayesian averaging, recency weighting,
--          multi-dimension ratings, company reply to reviews, rating nudges,
--          composite trust score, and 2-decimal precision.

-- =============================================================================
-- FEATURE 1: 2 Decimal Rating Precision
-- WHY: 1 decimal groups companies too coarsely. 2 decimals lets clients
--      distinguish between similarly-rated companies (e.g. 4.27 vs 4.31).
-- =============================================================================

ALTER TABLE marketplace_companies
  ALTER COLUMN average_rating TYPE NUMERIC(4,2);

COMMENT ON COLUMN marketplace_companies.average_rating IS 'Bayesian-adjusted average of published client ratings (2 decimals, e.g. 4.27)';

-- =============================================================================
-- FEATURE 2: Bayesian Average — raw_average_rating column
-- WHY: Store raw (simple) average for transparency. average_rating becomes
--      the Bayesian-adjusted value so low-sample-size companies don't outrank.
-- =============================================================================

ALTER TABLE marketplace_companies
  ADD COLUMN IF NOT EXISTS raw_average_rating NUMERIC(4,2) DEFAULT 0;

COMMENT ON COLUMN marketplace_companies.raw_average_rating IS 'Simple arithmetic average of published client ratings (pre-Bayesian, for transparency)';

-- =============================================================================
-- FEATURE 4: Multi-Dimension Ratings (5 optional sub-dimensions)
-- WHY: A single star doesn't show what was good or bad. Sub-ratings give
--      companies actionable feedback and help clients compare on criteria.
-- =============================================================================

ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS rating_response_time INTEGER;
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS rating_professionalism INTEGER;
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS rating_equipment INTEGER;
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS rating_communication INTEGER;
ALTER TABLE job_ratings ADD COLUMN IF NOT EXISTS rating_value INTEGER;

ALTER TABLE job_ratings ADD CONSTRAINT chk_rating_response_time
  CHECK (rating_response_time IS NULL OR (rating_response_time >= 1 AND rating_response_time <= 5));
ALTER TABLE job_ratings ADD CONSTRAINT chk_rating_professionalism
  CHECK (rating_professionalism IS NULL OR (rating_professionalism >= 1 AND rating_professionalism <= 5));
ALTER TABLE job_ratings ADD CONSTRAINT chk_rating_equipment
  CHECK (rating_equipment IS NULL OR (rating_equipment >= 1 AND rating_equipment <= 5));
ALTER TABLE job_ratings ADD CONSTRAINT chk_rating_communication
  CHECK (rating_communication IS NULL OR (rating_communication >= 1 AND rating_communication <= 5));
ALTER TABLE job_ratings ADD CONSTRAINT chk_rating_value
  CHECK (rating_value IS NULL OR (rating_value >= 1 AND rating_value <= 5));

COMMENT ON COLUMN job_ratings.rating_response_time IS 'Optional sub-dimension: Response Time (1-5), client raters only';
COMMENT ON COLUMN job_ratings.rating_professionalism IS 'Optional sub-dimension: Professionalism (1-5), client raters only';
COMMENT ON COLUMN job_ratings.rating_equipment IS 'Optional sub-dimension: Equipment & Preparedness (1-5), client raters only';
COMMENT ON COLUMN job_ratings.rating_communication IS 'Optional sub-dimension: Communication (1-5), client raters only';
COMMENT ON COLUMN job_ratings.rating_value IS 'Optional sub-dimension: Value for Money (1-5), client raters only';

-- =============================================================================
-- FEATURE 6: Company Reply to Reviews
-- WHY: Allowing companies to respond (like Google/Trustpilot) shows
--      professionalism and builds trust.
-- =============================================================================

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES job_ratings(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,
  reply_by UUID NOT NULL REFERENCES auth.users(id),
  reply_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_review_replies_rating UNIQUE (rating_id)
);

COMMENT ON TABLE review_replies IS 'Company replies to client reviews (one reply per review, like Google/Trustpilot)';
COMMENT ON COLUMN review_replies.reply_text IS 'Reply text (max 1000 chars enforced at API layer)';

-- Auto-update updated_at
CREATE TRIGGER trg_review_replies_updated_at
  BEFORE UPDATE ON review_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_replies_rating_id ON review_replies(rating_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_company_id ON review_replies(company_id);

-- RLS
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view replies
CREATE POLICY review_replies_select ON review_replies
  FOR SELECT TO authenticated
  USING (true);

-- Company admin can insert replies for their own company
CREATE POLICY review_replies_insert ON review_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    reply_by = auth.uid()
    AND company_id IN (
      SELECT id FROM marketplace_companies WHERE admin_user_id = auth.uid()
    )
  );

-- Company admin can update their own replies
CREATE POLICY review_replies_update ON review_replies
  FOR UPDATE TO authenticated
  USING (
    reply_by = auth.uid()
    AND company_id IN (
      SELECT id FROM marketplace_companies WHERE admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    reply_by = auth.uid()
    AND company_id IN (
      SELECT id FROM marketplace_companies WHERE admin_user_id = auth.uid()
    )
  );

-- =============================================================================
-- FEATURE 7: Rating Nudge Emails — tracking column
-- WHY: Automated email reminders 48h after event completion boost review rates.
-- =============================================================================

ALTER TABLE marketplace_events
  ADD COLUMN IF NOT EXISTS rating_nudge_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN marketplace_events.rating_nudge_sent_at IS 'Timestamp when rating nudge email was sent (null = not yet sent)';

-- =============================================================================
-- FEATURE 9: Composite Trust Score
-- WHY: Star ratings alone don't capture reliability. Trust score combines
--      multiple signals into a single 0-100 metric.
-- =============================================================================

ALTER TABLE marketplace_companies
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;

ALTER TABLE marketplace_companies ADD CONSTRAINT chk_trust_score
  CHECK (trust_score >= 0 AND trust_score <= 100);

COMMENT ON COLUMN marketplace_companies.trust_score IS 'Composite trust score (0-100) combining rating, volume, insurance, verification, cancellation rate, tenure, response rate';

-- =============================================================================
-- UPDATED TRIGGER: Bayesian Average + Recency Weighting + Trust Score
-- Features 1, 2, 3, 9 combined in a single trigger for efficiency.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_company_rating_aggregate()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id UUID;
  v_company_id UUID;
  v_raw_avg NUMERIC(4,2);
  v_bayesian_avg NUMERIC(4,2);
  v_count INTEGER;
  v_global_avg NUMERIC(4,2);
  v_confidence_threshold INTEGER := 5;  -- Bayesian C parameter
  v_weighted_sum NUMERIC;
  v_weighted_count NUMERIC;
  v_trust_score INTEGER;
  v_rating_component NUMERIC;
  v_volume_component NUMERIC;
  v_insurance_component NUMERIC;
  v_verification_component NUMERIC;
  v_cancellation_component NUMERIC;
  v_tenure_component NUMERIC;
  v_response_component NUMERIC;
  v_insurance_status TEXT;
  v_verification_status TEXT;
  v_company_created_at TIMESTAMPTZ;
  v_total_completed INTEGER;
  v_total_cancelled INTEGER;
  v_total_events_in_area INTEGER;
  v_total_quotes INTEGER;
BEGIN
  -- Determine which job_id to process
  IF TG_OP = 'DELETE' THEN
    v_job_id := OLD.job_id;
  ELSE
    v_job_id := NEW.job_id;
  END IF;

  -- Resolve company_id from the awarded quote on this event
  SELECT mq.company_id INTO v_company_id
  FROM marketplace_quotes mq
  WHERE mq.event_id = v_job_id
    AND mq.status = 'awarded'
  LIMIT 1;

  -- If no awarded quote found (e.g. direct job), skip aggregate update
  IF v_company_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- =========================================================================
  -- FEATURE 1+2: Compute raw average (simple AVG) at 2 decimal precision
  -- =========================================================================
  SELECT
    COALESCE(ROUND(AVG(jr.rating)::numeric, 2), 0),
    COALESCE(COUNT(jr.id)::integer, 0)
  INTO v_raw_avg, v_count
  FROM job_ratings jr
  JOIN marketplace_quotes mq ON mq.event_id = jr.job_id AND mq.status = 'awarded'
  WHERE mq.company_id = v_company_id
    AND jr.rater_type = 'client'
    AND jr.moderation_status = 'published';

  -- =========================================================================
  -- FEATURE 2: Bayesian average — blend toward platform-wide mean
  -- Formula: bayesian = (C * m + sum_of_ratings) / (C + review_count)
  -- =========================================================================

  -- Compute platform-wide average across ALL published client ratings
  SELECT COALESCE(AVG(jr.rating)::numeric, 3.5)
  INTO v_global_avg
  FROM job_ratings jr
  WHERE jr.rater_type = 'client'
    AND jr.moderation_status = 'published';

  -- =========================================================================
  -- FEATURE 3: Recency weighting — recent reviews carry more weight
  -- =========================================================================
  SELECT
    COALESCE(SUM(
      jr.rating * CASE
        WHEN EXTRACT(EPOCH FROM (now() - jr.created_at)) / 86400 <= 90  THEN 1.0
        WHEN EXTRACT(EPOCH FROM (now() - jr.created_at)) / 86400 <= 180 THEN 0.75
        WHEN EXTRACT(EPOCH FROM (now() - jr.created_at)) / 86400 <= 365 THEN 0.50
        ELSE 0.25
      END
    ), 0),
    COALESCE(SUM(
      CASE
        WHEN EXTRACT(EPOCH FROM (now() - jr.created_at)) / 86400 <= 90  THEN 1.0
        WHEN EXTRACT(EPOCH FROM (now() - jr.created_at)) / 86400 <= 180 THEN 0.75
        WHEN EXTRACT(EPOCH FROM (now() - jr.created_at)) / 86400 <= 365 THEN 0.50
        ELSE 0.25
      END
    ), 0)
  INTO v_weighted_sum, v_weighted_count
  FROM job_ratings jr
  JOIN marketplace_quotes mq ON mq.event_id = jr.job_id AND mq.status = 'awarded'
  WHERE mq.company_id = v_company_id
    AND jr.rater_type = 'client'
    AND jr.moderation_status = 'published';

  -- Bayesian formula with recency-weighted values
  IF v_weighted_count > 0 OR v_confidence_threshold > 0 THEN
    v_bayesian_avg := ROUND(
      ((v_confidence_threshold * v_global_avg) + v_weighted_sum)
      / (v_confidence_threshold + v_weighted_count),
      2
    );
  ELSE
    v_bayesian_avg := 0;
  END IF;

  -- =========================================================================
  -- FEATURE 9: Composite Trust Score (0-100)
  -- Calculated opportunistically when ratings change
  -- =========================================================================

  -- Fetch company metadata for trust score signals
  SELECT insurance_status, verification_status, created_at
  INTO v_insurance_status, v_verification_status, v_company_created_at
  FROM marketplace_companies
  WHERE id = v_company_id;

  -- Rating component: Bayesian average normalized to 0-100 (30% weight)
  v_rating_component := CASE
    WHEN v_bayesian_avg > 0 THEN ((v_bayesian_avg - 1) / 4.0) * 100
    ELSE 0
  END;

  -- Volume component: review count capped at 50 = 100% (15% weight)
  v_volume_component := LEAST(v_count::numeric / 50.0 * 100, 100);

  -- Insurance component: verified = 100, else 0 (10% weight)
  v_insurance_component := CASE WHEN v_insurance_status = 'verified' THEN 100 ELSE 0 END;

  -- Verification component: verified/cqc_verified = 100, else 0 (10% weight)
  v_verification_component := CASE
    WHEN v_verification_status IN ('verified', 'cqc_verified') THEN 100
    ELSE 0
  END;

  -- Cancellation rate component: inverse of cancel rate (15% weight)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE me.status = 'completed'), 0),
    COALESCE(COUNT(*) FILTER (WHERE me.status = 'cancelled'), 0)
  INTO v_total_completed, v_total_cancelled
  FROM marketplace_events me
  JOIN marketplace_quotes mq ON mq.event_id = me.id AND mq.status = 'awarded'
  WHERE mq.company_id = v_company_id;

  v_cancellation_component := CASE
    WHEN (v_total_completed + v_total_cancelled) > 0
    THEN (1.0 - (v_total_cancelled::numeric / (v_total_completed + v_total_cancelled)::numeric)) * 100
    ELSE 50  -- Neutral score for new companies
  END;

  -- Tenure component: capped at 2 years = 100% (10% weight)
  v_tenure_component := LEAST(
    EXTRACT(EPOCH FROM (now() - v_company_created_at)) / (2 * 365.25 * 86400) * 100,
    100
  );

  -- Response rate component: quotes submitted vs total events in area (10% weight)
  SELECT COUNT(*) INTO v_total_quotes
  FROM marketplace_quotes
  WHERE company_id = v_company_id;

  -- Simplified: use total events as denominator (exact area matching too expensive in trigger)
  SELECT COUNT(*) INTO v_total_events_in_area
  FROM marketplace_events
  WHERE status IN ('open', 'quoting', 'awarded', 'completed', 'cancelled');

  v_response_component := CASE
    WHEN v_total_events_in_area > 0
    THEN LEAST(v_total_quotes::numeric / GREATEST(v_total_events_in_area * 0.1, 1) * 100, 100)
    ELSE 50  -- Neutral score when no events exist
  END;

  -- Weighted composite
  v_trust_score := ROUND(
    (v_rating_component * 0.30) +
    (v_volume_component * 0.15) +
    (v_insurance_component * 0.10) +
    (v_verification_component * 0.10) +
    (v_cancellation_component * 0.15) +
    (v_tenure_component * 0.10) +
    (v_response_component * 0.10)
  )::integer;

  -- Clamp to 0-100
  v_trust_score := GREATEST(0, LEAST(100, v_trust_score));

  -- =========================================================================
  -- Update denormalized columns
  -- =========================================================================
  UPDATE marketplace_companies
  SET average_rating = v_bayesian_avg,
      raw_average_rating = v_raw_avg,
      review_count = v_count,
      trust_score = v_trust_score
  WHERE id = v_company_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from migration 152 — DROP and recreate to pick up new function
DROP TRIGGER IF EXISTS trg_update_company_rating_aggregate ON job_ratings;

CREATE TRIGGER trg_update_company_rating_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON job_ratings
  FOR EACH ROW EXECUTE FUNCTION update_company_rating_aggregate();

-- =============================================================================
-- SUMMARY
-- Columns added to marketplace_companies: raw_average_rating, trust_score
-- Column altered: average_rating NUMERIC(2,1) -> NUMERIC(4,2)
-- Columns added to job_ratings: 5 dimension rating columns
-- Table created: review_replies (with RLS + indexes)
-- Column added to marketplace_events: rating_nudge_sent_at
-- Trigger updated: update_company_rating_aggregate() now includes Bayesian
--   average, recency weighting, and trust score computation
-- =============================================================================
