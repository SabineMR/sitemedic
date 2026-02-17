/**
 * Migration: Update auto-assignment scoring weights for Phase 7.5
 *
 * Changes:
 * - Distance: 25% -> 30% (highest priority)
 * - Utilization: 15% -> 20% (prefer <70% utilization)
 * - Qualifications: 20% -> 15% (already hard-filtered)
 * - Availability: 15% (unchanged)
 * - Rating: 10% -> 15% (prefer >4.5 stars)
 * - Performance: 10% -> 5% (RIDDOR compliance bonus)
 * - Fairness: 5% -> 0% (removed from scoring)
 *
 * Also enhances:
 * - Utilization scoring to prefer <70% utilization
 * - Rating scoring to give bonus for >4.5 stars
 */

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_auto_match_score(UUID, UUID);

-- Create updated function with new weights
CREATE OR REPLACE FUNCTION calculate_auto_match_score(
  p_booking_id UUID,
  p_medic_id UUID
) RETURNS TABLE (
  total_score DECIMAL,
  distance_score DECIMAL,
  qualification_score DECIMAL,
  availability_score DECIMAL,
  utilization_score DECIMAL,
  rating_score DECIMAL,
  performance_score DECIMAL,
  fairness_score DECIMAL
) AS $$
DECLARE
  v_booking RECORD;
  v_medic RECORD;
  v_distance_miles DECIMAL;
  v_travel_time_minutes INT;
  v_has_all_qualifications BOOLEAN;
  v_is_available BOOLEAN;
  v_weekly_utilization DECIMAL;
  v_fairness_ratio DECIMAL;

  v_distance_score DECIMAL := 0;
  v_qualification_score DECIMAL := 0;
  v_availability_score DECIMAL := 0;
  v_utilization_score DECIMAL := 0;
  v_rating_score DECIMAL := 0;
  v_performance_score DECIMAL := 0;
  v_fairness_score DECIMAL := 0;
  v_total_score DECIMAL := 0;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  -- Get medic details
  SELECT * INTO v_medic FROM medics WHERE id = p_medic_id;

  -- 1. DISTANCE SCORE (0-100 points)
  -- Check travel time cache
  SELECT travel_time_minutes, distance_miles INTO v_travel_time_minutes, v_distance_miles
  FROM travel_time_cache
  WHERE origin_postcode = v_medic.home_postcode
    AND destination_postcode = v_booking.site_postcode
    AND expires_at > NOW();

  IF v_distance_miles IS NOT NULL THEN
    IF v_distance_miles < 10 THEN
      v_distance_score := 100;
    ELSIF v_distance_miles < 20 THEN
      v_distance_score := 75;
    ELSIF v_distance_miles < 30 THEN
      v_distance_score := 50;
    ELSE
      v_distance_score := 25;
    END IF;
  ELSE
    -- Fallback: Assume medium distance if no cache
    v_distance_score := 50;
  END IF;

  -- 2. QUALIFICATION SCORE (0-100 points, CRITICAL)
  v_has_all_qualifications := TRUE;

  IF v_booking.confined_space_required AND NOT v_medic.has_confined_space_cert THEN
    v_has_all_qualifications := FALSE;
  END IF;

  IF v_booking.trauma_specialist_required AND NOT v_medic.has_trauma_cert THEN
    v_has_all_qualifications := FALSE;
  END IF;

  IF v_has_all_qualifications THEN
    v_qualification_score := 100;
  ELSE
    v_qualification_score := 0; -- Missing qualifications = disqualified
  END IF;

  -- 3. AVAILABILITY SCORE (0-100 points, CRITICAL)
  -- Check medic_availability table
  SELECT COUNT(*) = 0 INTO v_is_available
  FROM medic_availability
  WHERE medic_id = p_medic_id
    AND date = v_booking.shift_date
    AND is_available = FALSE
    AND status = 'approved';

  -- Check for double-booking
  IF v_is_available THEN
    SELECT COUNT(*) = 0 INTO v_is_available
    FROM bookings
    WHERE medic_id = p_medic_id
      AND shift_date = v_booking.shift_date
      AND status NOT IN ('cancelled')
      AND id != p_booking_id; -- Exclude current booking if re-assigning
  END IF;

  IF v_is_available THEN
    v_availability_score := 100;
  ELSE
    v_availability_score := 0; -- Not available = disqualified
  END IF;

  -- 4. UTILIZATION SCORE (0-100 points)
  -- ENHANCED: Prefer medics with <70% utilization
  SELECT COALESCE(SUM(shift_hours), 0) INTO v_weekly_utilization
  FROM bookings
  WHERE medic_id = p_medic_id
    AND shift_date >= CURRENT_DATE - INTERVAL '7 days'
    AND shift_date <= CURRENT_DATE
    AND status NOT IN ('cancelled');

  v_weekly_utilization := (v_weekly_utilization / 40) * 100; -- % of 40-hour week

  -- New scoring: max points for <70% utilization
  IF v_weekly_utilization < 70 THEN
    v_utilization_score := 100; -- Preferred utilization range
  ELSIF v_weekly_utilization < 80 THEN
    -- Linear decrease from 100 to 50 for 70-80%
    v_utilization_score := 100 - ((v_weekly_utilization - 70) * 5);
  ELSIF v_weekly_utilization < 100 THEN
    -- Linear decrease from 50 to 25 for 80-100%
    v_utilization_score := 50 - ((v_weekly_utilization - 80) * 1.25);
  ELSE
    v_utilization_score := 25; -- Overutilized
  END IF;

  -- 5. RATING SCORE (0-100 points)
  -- ENHANCED: Bonus for >4.5 stars
  v_rating_score := v_medic.star_rating * 20; -- Convert 0-5 to 0-100

  -- Bonus: +10 points if rating > 4.5 stars
  IF v_medic.star_rating > 4.5 THEN
    v_rating_score := LEAST(100, v_rating_score + 10);
  END IF;

  -- 6. PERFORMANCE SCORE (0-100 points)
  v_performance_score := v_medic.riddor_compliance_rate; -- Already 0-100

  -- 7. FAIRNESS SCORE (0-100 points)
  -- NOTE: No longer used in total score calculation (weight = 0%)
  -- Kept for backward compatibility in logs
  SELECT shifts_offered_this_month, shifts_worked_this_month INTO v_fairness_ratio
  FROM medic_preferences
  WHERE medic_id = p_medic_id;

  IF v_fairness_ratio IS NOT NULL AND v_fairness_ratio > 0 THEN
    v_fairness_ratio := (shifts_worked_this_month::DECIMAL / shifts_offered_this_month) * 100;
    v_fairness_score := 100 - v_fairness_ratio; -- Lower ratio = higher score
  ELSE
    v_fairness_score := 100; -- New medic, no history yet
  END IF;

  -- TOTAL SCORE (weighted average with new Phase 7.5 weights)
  -- Critical criteria (qualification, availability) must be 100 or medic is disqualified
  IF v_qualification_score < 100 OR v_availability_score < 100 THEN
    v_total_score := 0; -- Disqualified
  ELSE
    v_total_score := (
      (v_distance_score * 0.30) +        -- 30% weight on distance (was 25%)
      (v_qualification_score * 0.15) +   -- 15% weight on qualifications (was 20%)
      (v_availability_score * 0.15) +    -- 15% weight on availability (unchanged)
      (v_utilization_score * 0.20) +     -- 20% weight on workload balance (was 15%)
      (v_rating_score * 0.15) +          -- 15% weight on star rating (was 10%)
      (v_performance_score * 0.05)       -- 5% weight on RIDDOR compliance (was 10%)
      -- Fairness removed from scoring (was 0.05)
    );
  END IF;

  -- Return all scores
  RETURN QUERY SELECT
    v_total_score,
    v_distance_score,
    v_qualification_score,
    v_availability_score,
    v_utilization_score,
    v_rating_score,
    v_performance_score,
    v_fairness_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_auto_match_score IS 'Phase 7.5: Calculates 0-100 score for medic-booking match. New weights: distance 30%, utilization 20%, qualifications 15%, availability 15%, rating 15%, performance 5%';
