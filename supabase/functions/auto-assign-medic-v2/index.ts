/**
 * Auto-Assign Medic V2 - Enhanced with 7-Factor Scoring + UK Compliance
 * Phase 7.5: Territory Auto-Assignment with Calendar & Certification Validation
 *
 * NEW Features:
 * - 7-factor scoring (distance 30%, utilization 20%, qualifications 15%, availability 15%, rating 15%, performance 5%)
 * - Calendar conflict detection (prevents double-booking by checking shift time overlap)
 * - Certification expiry validation (excludes medics with expired certs)
 * - UK Working Time Regulations 1998 enforcement (48-hour week, 11-hour rest)
 * - Utilization preference (<70% preferred)
 * - Rating bonus (>4.5 stars)
 * - Fair shift distribution tracking
 * - Comprehensive audit logging (auto_schedule_logs table)
 * - Medic auto-confirmation (no manual acceptance needed)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface AutoAssignRequest {
  booking_id: string;
  skip_overtime_check?: boolean; // For testing only
}

interface Booking {
  id: string;
  org_id: string; // CRITICAL: Track which org this booking belongs to
  site_postcode: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_hours: number;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  client_id: string;
}

interface Medic {
  id: string;
  first_name: string;
  last_name: string;
  home_postcode: string;
  has_confined_space_cert: boolean;
  has_trauma_cert: boolean;
  confined_space_cert_expiry: string | null;
  trauma_cert_expiry: string | null;
  star_rating: number;
  riddor_compliance_rate: number;
  available_for_work: boolean;
  unavailable_until: string | null;
}

interface AutoMatchScore {
  total_score: number;
  distance_score: number;
  qualification_score: number;
  availability_score: number;
  utilization_score: number;
  rating_score: number;
  performance_score: number;
  fairness_score: number;
}

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { booking_id, skip_overtime_check = false }: AutoAssignRequest = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Auto-assigning medic for booking ${booking_id} (V2 Enhanced)`);

    // Step 1: Fetch booking details
    const booking = await fetchBooking(booking_id);
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Booking: ${booking.site_postcode} on ${booking.shift_date} ${booking.shift_start_time}-${booking.shift_end_time}`);

    // Step 2: Find candidate medics (filter phase with enhanced checks)
    const candidates = await findCandidateMedics(booking, skip_overtime_check);
    console.log(`👥 Found ${candidates.length} candidate medics`);

    if (candidates.length === 0) {
      // No candidates - log failure and require manual approval
      await logAutoScheduleFailure(booking_id, booking.org_id, 'No available medics found');
      await updateBookingNoMatch(booking_id);
      return new Response(
        JSON.stringify({
          assigned_medic_id: null,
          confidence_score: 0,
          candidates: [],
          requires_manual_approval: true,
          reason: 'No available medics found',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Rank candidates using database function (7-factor scoring)
    const rankedCandidates = await rankCandidatesV2(candidates, booking);

    // Sort by score descending
    rankedCandidates.sort((a, b) => b.score.total_score - a.score.total_score);
    const top5 = rankedCandidates.slice(0, 5);

    const topCandidate = top5[0];
    console.log(`🏆 Top candidate: ${topCandidate.medic.first_name} ${topCandidate.medic.last_name} (${topCandidate.medic.id}) with score ${topCandidate.score.total_score.toFixed(2)}`);

    // Step 4: Determine confidence threshold
    const confidenceScore = topCandidate.score.total_score;
    const requiresManualApproval = confidenceScore < 50; // Confidence threshold

    // Step 5: Log auto-schedule decision
    await logAutoScheduleDecision(booking_id, booking.org_id, topCandidate.medic.id, topCandidate.score, rankedCandidates, !requiresManualApproval);

    // Step 6: Auto-assign top candidate or flag for manual review
    if (!requiresManualApproval) {
      // AUTO-CONFIRM: Assign medic immediately (no manual acceptance needed)
      await assignMedicToBooking(booking_id, topCandidate.medic.id, confidenceScore, topCandidate.score);

      // Update fair distribution tracking
      await incrementShiftsOffered(topCandidate.medic.id);
      await incrementShiftsWorked(topCandidate.medic.id);

      console.log(`✅ Auto-assigned medic ${topCandidate.medic.id} with confidence ${confidenceScore.toFixed(2)}`);
    } else {
      // LOW CONFIDENCE: Flag for manual review
      await flagForManualReview(booking_id, confidenceScore, topCandidate.score);
      console.log(`⚠️  Low confidence (${confidenceScore.toFixed(2)}) - requires manual approval`);
    }

    return new Response(
      JSON.stringify({
        assigned_medic_id: requiresManualApproval ? null : topCandidate.medic.id,
        medic_name: requiresManualApproval ? null : `${topCandidate.medic.first_name} ${topCandidate.medic.last_name}`,
        confidence_score: confidenceScore,
        score_breakdown: topCandidate.score,
        candidates: top5.map(c => ({
          medic_id: c.medic.id,
          medic_name: `${c.medic.first_name} ${c.medic.last_name}`,
          total_score: c.score.total_score,
          breakdown: {
            distance: c.score.distance_score,
            qualifications: c.score.qualification_score,
            availability: c.score.availability_score,
            utilization: c.score.utilization_score,
            rating: c.score.rating_score,
            performance: c.score.performance_score,
            fairness: c.score.fairness_score,
          },
        })),
        requires_manual_approval: requiresManualApproval,
        reason: requiresManualApproval ? `Low confidence score (${confidenceScore.toFixed(2)} < 50 threshold)` : null,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error auto-assigning medic:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Step 1: Fetch booking details
 * CRITICAL: Include org_id to ensure we only assign medics from the same organization
 */
async function fetchBooking(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, org_id, site_postcode, shift_date, shift_start_time, shift_end_time, shift_hours, confined_space_required, trauma_specialist_required, client_id')
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    console.error('Error fetching booking:', error);
    return null;
  }

  console.log(`🏢 Booking org_id: ${data.org_id}`);
  return data;
}

/**
 * Step 2: Find candidate medics with ENHANCED filtering
 * CRITICAL SECURITY FIX: Only fetch medics from the same organization as the booking
 * Filters:
 * 0. SAME ORGANIZATION (org_id match) - CRITICAL FOR MULTI-TENANT ISOLATION
 * 1. Available for work (available_for_work = true, unavailable_until check)
 * 2. Required certifications (confined space, trauma specialist) with expiry validation
 * 3. NOT double-booked (no overlapping shifts on same date with time overlap check)
 * 4. Medic availability calendar (medic_availability table)
 * 5. UK Working Time Regulations compliance (48-hour week, 11-hour rest)
 */
async function findCandidateMedics(booking: Booking, skipOvertimeCheck: boolean): Promise<Medic[]> {
  // Fetch medics from SAME ORGANIZATION ONLY - CRITICAL SECURITY FIX
  console.log(`🔍 Fetching medics for org_id: ${booking.org_id}`);
  const { data: allMedics, error: medicError } = await supabase
    .from('medics')
    .select('id, first_name, last_name, home_postcode, has_confined_space_cert, has_trauma_cert, confined_space_cert_expiry, trauma_cert_expiry, star_rating, riddor_compliance_rate, available_for_work, unavailable_until')
    .eq('org_id', booking.org_id); // CRITICAL: Filter by org_id

  if (medicError || !allMedics) {
    console.error('Error fetching medics:', medicError);
    return [];
  }

  // FILTER 1: Available for work
  let candidates = allMedics.filter(m => {
    if (!m.available_for_work) return false;
    if (m.unavailable_until && new Date(m.unavailable_until) >= new Date(booking.shift_date)) {
      return false;
    }
    return true;
  });

  console.log(`✅ Filter 1: ${candidates.length} medics available for work`);

  // FILTER 2: Required certifications with expiry validation
  const bookingDate = new Date(booking.shift_date);

  if (booking.confined_space_required) {
    candidates = candidates.filter(m => {
      if (!m.has_confined_space_cert) return false;
      // Check expiry date if present
      if (m.confined_space_cert_expiry) {
        const expiryDate = new Date(m.confined_space_cert_expiry);
        if (expiryDate < bookingDate) {
          console.log(`❌ Medic ${m.id} excluded - confined space cert expired on ${m.confined_space_cert_expiry}`);
          return false;
        }
      }
      return true;
    });
    console.log(`✅ Filter 2a: ${candidates.length} have valid confined space cert`);
  }

  if (booking.trauma_specialist_required) {
    candidates = candidates.filter(m => {
      if (!m.has_trauma_cert) return false;
      // Check expiry date if present
      if (m.trauma_cert_expiry) {
        const expiryDate = new Date(m.trauma_cert_expiry);
        if (expiryDate < bookingDate) {
          console.log(`❌ Medic ${m.id} excluded - trauma cert expired on ${m.trauma_cert_expiry}`);
          return false;
        }
      }
      return true;
    });
    console.log(`✅ Filter 2b: ${candidates.length} have valid trauma cert`);
  }

  // FILTER 3: Calendar conflict check - batch query to prevent N+1
  // Only proceed if we have candidates to check
  if (candidates.length === 0) {
    console.log('⚠️  No candidates after certification filtering');
    return [];
  }

  const candidateIds = candidates.map(c => c.id);

  // Batch query: fetch all bookings for these candidates on the same date
  const { data: conflictingBookings, error: conflictError } = await supabase
    .from('bookings')
    .select('medic_id, shift_start_time, shift_end_time')
    .eq('org_id', booking.org_id) // IMPORTANT: Filter by org_id
    .eq('shift_date', booking.shift_date)
    .in('medic_id', candidateIds)
    .in('status', ['confirmed', 'in_progress']);

  if (!conflictError && conflictingBookings && conflictingBookings.length > 0) {
    // Build a Set of medic IDs that have time conflicts
    const conflictSet = new Set<string>();

    // Parse requested shift times
    const requestedStart = booking.shift_start_time;
    const requestedEnd = booking.shift_end_time;

    conflictingBookings.forEach(existingBooking => {
      if (!existingBooking.medic_id) return;

      // Check if time ranges overlap
      // Overlap exists if: (start1 < end2) AND (end1 > start2)
      const hasOverlap =
        requestedStart < existingBooking.shift_end_time &&
        requestedEnd > existingBooking.shift_start_time;

      if (hasOverlap) {
        conflictSet.add(existingBooking.medic_id);
        console.log(`❌ Medic ${existingBooking.medic_id} has shift conflict: ${existingBooking.shift_start_time}-${existingBooking.shift_end_time} overlaps ${requestedStart}-${requestedEnd}`);
      }
    });

    // Filter out medics with conflicts
    const beforeCount = candidates.length;
    candidates = candidates.filter(m => !conflictSet.has(m.id));
    console.log(`✅ Filter 3: ${candidates.length} available (${beforeCount - candidates.length} had calendar conflicts on ${booking.shift_date})`);
  } else {
    console.log(`✅ Filter 3: ${candidates.length} available (no existing bookings on ${booking.shift_date})`);
  }

  // FILTER 4: Check medic availability calendar (medic_availability table)
  // IMPORTANT: Only check availability for medics in this org
  const { data: unavailableDates, error: availError } = await supabase
    .from('medic_availability')
    .select('medic_id')
    .eq('org_id', booking.org_id) // IMPORTANT: Filter by org_id
    .eq('date', booking.shift_date)
    .eq('is_available', false)
    .eq('status', 'approved');

  if (!availError && unavailableDates) {
    const unavailableMedicIds = new Set(unavailableDates.map(u => u.medic_id));
    candidates = candidates.filter(m => !unavailableMedicIds.has(m.id));
    console.log(`✅ Filter 4: ${candidates.length} have no approved time-off on ${booking.shift_date}`);
  }

  // FILTER 5: UK Working Time Regulations compliance (48-hour week, 11-hour rest)
  if (!skipOvertimeCheck) {
    const compliantCandidates: Medic[] = [];

    for (const medic of candidates) {
      const shiftStart = new Date(`${booking.shift_date}T${booking.shift_start_time}`);
      const shiftEnd = new Date(`${booking.shift_date}T${booking.shift_end_time}`);

      // Call database function to check compliance
      const { data: complianceResult, error: complianceError } = await supabase
        .rpc('check_working_time_compliance', {
          p_medic_id: medic.id,
          p_shift_start: shiftStart.toISOString(),
          p_shift_end: shiftEnd.toISOString(),
        });

      if (complianceError) {
        console.warn(`⚠️  Compliance check failed for medic ${medic.id}:`, complianceError);
        continue; // Exclude if check fails (err on side of caution)
      }

      if (complianceResult && complianceResult.length > 0 && complianceResult[0].is_compliant) {
        compliantCandidates.push(medic);
      } else {
        const violation = complianceResult?.[0];
        console.log(`❌ Filter 5: Medic ${medic.id} excluded - ${violation?.violation_type}: ${violation?.violation_details}`);

        // Log conflict for admin review
        await logBookingConflict(booking.id, medic.id, violation?.violation_type || 'overtime_violation', violation?.violation_details || 'Working time regulations violation');
      }
    }

    candidates = compliantCandidates;
    console.log(`✅ Filter 5: ${candidates.length} comply with UK Working Time Regulations`);
  }

  // FILTER 6: Google Calendar conflict check (future enhancement - needs OAuth tokens)
  // For now, skip this filter. Will implement in Task #18

  return candidates;
}

/**
 * Step 3: Rank candidates using database function (7-factor scoring)
 */
async function rankCandidatesV2(
  candidates: Medic[],
  booking: Booking
): Promise<Array<{ medic: Medic; score: AutoMatchScore }>> {
  const rankedCandidates: Array<{ medic: Medic; score: AutoMatchScore }> = [];

  for (const medic of candidates) {
    // Call database function to calculate score
    const { data: scoreData, error: scoreError } = await supabase
      .rpc('calculate_auto_match_score', {
        p_booking_id: booking.id,
        p_medic_id: medic.id,
      });

    if (scoreError || !scoreData || scoreData.length === 0) {
      console.warn(`⚠️  Scoring failed for medic ${medic.id}:`, scoreError);
      continue; // Skip medic if scoring fails
    }

    const score: AutoMatchScore = scoreData[0];

    // Disqualify if critical criteria failed (total_score = 0 means disqualified)
    if (score.total_score === 0) {
      console.log(`❌ Medic ${medic.id} disqualified (missing qualifications or unavailable)`);
      continue;
    }

    rankedCandidates.push({
      medic,
      score,
    });
  }

  return rankedCandidates;
}

/**
 * Assign medic to booking (auto-confirm, no manual acceptance needed)
 */
async function assignMedicToBooking(
  bookingId: string,
  medicId: string,
  confidenceScore: number,
  scoreBreakdown: AutoMatchScore
): Promise<void> {
  const matchCriteria = {
    confidence_score: confidenceScore,
    ...scoreBreakdown,
  };

  const { error } = await supabase
    .from('bookings')
    .update({
      medic_id: medicId,
      status: 'confirmed', // AUTO-CONFIRM (no manual acceptance)
      auto_matched: true,
      match_score: confidenceScore,
      match_criteria: matchCriteria,
      requires_manual_approval: false,
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error assigning medic to booking:', error);
    throw new Error('Failed to assign medic to booking');
  }
}

/**
 * Flag booking for manual review (low confidence)
 */
async function flagForManualReview(
  bookingId: string,
  confidenceScore: number,
  scoreBreakdown: AutoMatchScore
): Promise<void> {
  const matchCriteria = {
    confidence_score: confidenceScore,
    ...scoreBreakdown,
  };

  const { error } = await supabase
    .from('bookings')
    .update({
      auto_matched: true,
      match_score: confidenceScore,
      match_criteria: matchCriteria,
      requires_manual_approval: true,
      approval_reason: `Low confidence score (${confidenceScore.toFixed(2)} < 50 threshold)`,
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error flagging booking for manual review:', error);
  }
}

/**
 * Update booking when no candidates found
 */
async function updateBookingNoMatch(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      requires_manual_approval: true,
      approval_reason: 'No available medics found',
      auto_matched: false,
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating booking (no match):', error);
  }
}

/**
 * Log auto-schedule decision to auto_schedule_logs table (audit trail)
 * CRITICAL: Include org_id to track which org this auto-assignment is for
 */
async function logAutoScheduleDecision(
  bookingId: string,
  orgId: string,
  assignedMedicId: string,
  topScore: AutoMatchScore,
  allCandidates: Array<{ medic: Medic; score: AutoMatchScore }>,
  assignmentSuccessful: boolean
): Promise<void> {
  const allCandidatesRanked = allCandidates.map(c => ({
    medic_id: c.medic.id,
    total_score: c.score.total_score,
    breakdown: c.score,
  }));

  const { error } = await supabase
    .from('auto_schedule_logs')
    .insert({
      org_id: orgId, // CRITICAL: Track which org this log belongs to
      booking_id: bookingId,
      assigned_medic_id: assignedMedicId,
      confidence_score: topScore.total_score,
      distance_score: topScore.distance_score,
      qualification_score: topScore.qualification_score,
      availability_score: topScore.availability_score,
      utilization_score: topScore.utilization_score,
      rating_score: topScore.rating_score,
      performance_score: topScore.performance_score,
      fairness_score: topScore.fairness_score,
      all_candidates_ranked: allCandidatesRanked,
      assignment_successful: assignmentSuccessful,
      failure_reason: assignmentSuccessful ? null : `Low confidence score (${topScore.total_score.toFixed(2)})`,
    });

  if (error) {
    console.error('⚠️  Failed to log auto-schedule decision:', error);
  }
}

/**
 * Log auto-schedule failure (no candidates found)
 * CRITICAL: Include org_id to track which org this failure is for
 */
async function logAutoScheduleFailure(
  bookingId: string,
  orgId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('auto_schedule_logs')
    .insert({
      org_id: orgId, // CRITICAL: Track which org this log belongs to
      booking_id: bookingId,
      assigned_medic_id: null,
      confidence_score: 0,
      all_candidates_ranked: [],
      assignment_successful: false,
      failure_reason: reason,
    });

  if (error) {
    console.error('⚠️  Failed to log auto-schedule failure:', error);
  }
}

/**
 * Log booking conflict (for admin review)
 */
async function logBookingConflict(
  bookingId: string,
  medicId: string,
  conflictType: string,
  conflictDescription: string
): Promise<void> {
  const { error } = await supabase
    .from('booking_conflicts')
    .insert({
      booking_id: bookingId,
      medic_id: medicId,
      conflict_type: conflictType,
      severity: 'critical', // Overtime violations are critical
      conflict_description: conflictDescription,
      resolved: false,
    });

  if (error) {
    console.error('⚠️  Failed to log booking conflict:', error);
  }
}

/**
 * Increment shifts_offered_this_month for fair distribution tracking
 */
async function incrementShiftsOffered(medicId: string): Promise<void> {
  const { error } = await supabase.rpc('increment', {
    table_name: 'medic_preferences',
    column_name: 'shifts_offered_this_month',
    row_id: medicId,
  });

  if (error) {
    // If medic_preferences doesn't exist, create it
    const { error: insertError } = await supabase
      .from('medic_preferences')
      .insert({
        medic_id: medicId,
        shifts_offered_this_month: 1,
        shifts_worked_this_month: 0,
      });

    if (insertError) {
      console.error('⚠️  Failed to increment shifts_offered:', insertError);
    }
  }
}

/**
 * Increment shifts_worked_this_month for fair distribution tracking
 */
async function incrementShiftsWorked(medicId: string): Promise<void> {
  const { error } = await supabase.rpc('increment', {
    table_name: 'medic_preferences',
    column_name: 'shifts_worked_this_month',
    row_id: medicId,
  });

  if (error) {
    console.error('⚠️  Failed to increment shifts_worked:', error);
  }
}
