/**
 * Auto-Assign Medic Edge Function
 * Phase 1.5: Multi-factor medic ranking and automatic assignment
 *
 * Purpose: Rank medics by distance (40pts), utilization (25pts), qualifications (15pts), rating (20pts)
 * Territory priority: Primary medics get +10 bonus, secondary get +5
 * Auto-assigns top candidate if score >= 50, otherwise requires manual approval
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface AutoAssignRequest {
  booking_id: string;
}

interface Booking {
  id: string;
  site_postcode: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
}

interface Medic {
  id: string;
  home_postcode: string;
  has_confined_space_cert: boolean;
  has_trauma_cert: boolean;
  star_rating: number;
  available_for_work: boolean;
  unavailable_until: string | null;
}

interface MedicCandidate extends Medic {
  score: number;
  distance_score: number;
  utilization_score: number;
  qualifications_score: number;
  rating_score: number;
  territory_bonus: number;
  travel_time_minutes: number;
  distance_miles: number;
  booked_days_this_week: number;
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
    const { booking_id }: AutoAssignRequest = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Auto-assigning medic for booking ${booking_id}`);

    // Step 1: Fetch booking details
    const booking = await fetchBooking(booking_id);
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Booking: ${booking.site_postcode} on ${booking.shift_date} ${booking.shift_start_time}-${booking.shift_end_time}`);

    // Step 2: Find candidate medics (filter phase)
    const candidates = await findCandidateMedics(booking);
    console.log(`👥 Found ${candidates.length} candidate medics`);

    if (candidates.length === 0) {
      // No candidates - require manual approval
      await updateBookingNoMatch(booking_id);
      return new Response(
        JSON.stringify({
          assigned_medic_id: null,
          match_score: 0,
          candidates: [],
          requires_manual_approval: true,
          reason: 'No available medics found',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Rank candidates (scoring phase)
    const rankedCandidates = await rankCandidates(candidates, booking);

    // Sort by score descending
    rankedCandidates.sort((a, b) => b.score - a.score);
    const top5 = rankedCandidates.slice(0, 5);

    console.log(`🏆 Top candidate: ${top5[0].id} with score ${top5[0].score.toFixed(2)}`);

    // Step 4: Auto-assign top candidate (if score >= 50)
    const topCandidate = top5[0];
    const requiresManualApproval = topCandidate.score < 50;

    await updateBookingWithMatch(
      booking_id,
      topCandidate,
      requiresManualApproval
    );

    return new Response(
      JSON.stringify({
        assigned_medic_id: requiresManualApproval ? null : topCandidate.id,
        match_score: topCandidate.score,
        candidates: top5.map(c => ({
          medic_id: c.id,
          score: c.score,
          breakdown: {
            distance: c.distance_score,
            utilization: c.utilization_score,
            qualifications: c.qualifications_score,
            rating: c.rating_score,
            territory_bonus: c.territory_bonus,
          },
          travel_time_minutes: c.travel_time_minutes,
          distance_miles: c.distance_miles,
        })),
        requires_manual_approval: requiresManualApproval,
        reason: requiresManualApproval ? 'Low auto-match score' : null,
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
 */
async function fetchBooking(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, site_postcode, shift_date, shift_start_time, shift_end_time, confined_space_required, trauma_specialist_required')
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    console.error('Error fetching booking:', error);
    return null;
  }

  return data;
}

/**
 * Step 2: Find candidate medics (filter phase)
 * Excludes:
 * - Unavailable medics (available_for_work = false or unavailable_until >= shift_date)
 * - Medics without required certifications
 * - Medics already booked during this shift time
 */
async function findCandidateMedics(booking: Booking): Promise<Medic[]> {
  // Fetch all potentially available medics
  const { data: allMedics, error: medicError } = await supabase
    .from('medics')
    .select('id, home_postcode, has_confined_space_cert, has_trauma_cert, star_rating, available_for_work, unavailable_until');

  if (medicError || !allMedics) {
    console.error('Error fetching medics:', medicError);
    return [];
  }

  // Filter 1: Available for work
  let candidates = allMedics.filter(m => {
    if (!m.available_for_work) return false;
    if (m.unavailable_until && new Date(m.unavailable_until) >= new Date(booking.shift_date)) {
      return false;
    }
    return true;
  });

  console.log(`✅ ${candidates.length} medics available for work`);

  // Filter 2: Required certifications
  if (booking.confined_space_required) {
    candidates = candidates.filter(m => m.has_confined_space_cert);
    console.log(`✅ ${candidates.length} have confined space cert`);
  }

  if (booking.trauma_specialist_required) {
    candidates = candidates.filter(m => m.has_trauma_cert);
    console.log(`✅ ${candidates.length} have trauma cert`);
  }

  // Filter 3: Not already booked during shift time
  const { data: conflicts, error: conflictError } = await supabase
    .from('bookings')
    .select('medic_id')
    .eq('shift_date', booking.shift_date)
    .in('status', ['confirmed', 'in_progress'])
    .not('medic_id', 'is', null);

  if (conflictError) {
    console.warn('Error checking conflicts:', conflictError);
  } else if (conflicts) {
    // Check for time overlap (simplified: exclude any booking on same day)
    // In production, would parse shift_start_time/shift_end_time for exact overlap check
    const bookedMedicIds = new Set(conflicts.map(c => c.medic_id));
    candidates = candidates.filter(m => !bookedMedicIds.has(m.id));
    console.log(`✅ ${candidates.length} not already booked on ${booking.shift_date}`);
  }

  return candidates;
}

/**
 * Step 3: Rank candidates with 4-factor scoring (100 point scale)
 */
async function rankCandidates(
  candidates: Medic[],
  booking: Booking
): Promise<MedicCandidate[]> {
  const rankedCandidates: MedicCandidate[] = [];

  // Get week boundaries (Monday-Sunday)
  const shiftDate = new Date(booking.shift_date);
  const weekStart = new Date(shiftDate);
  weekStart.setDate(shiftDate.getDate() - shiftDate.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday

  for (const medic of candidates) {
    // Factor 1: Distance score (40 points max)
    const travelData = await calculateTravelTime(medic.home_postcode, booking.site_postcode);
    const distanceScore = Math.max(0, 40 - (travelData.travel_time_minutes / 2));

    // Factor 2: Utilization score (25 points max)
    const bookedDays = await getBookedDaysThisWeek(medic.id, weekStart, weekEnd);
    const utilizationPct = (bookedDays / 5) * 100;
    const utilizationScore = 25 * (1 - utilizationPct / 100);

    // Factor 3: Qualifications score (15 points max)
    let qualificationsScore = 5; // Base for any active medic
    if (medic.has_confined_space_cert) qualificationsScore += 5;
    if (medic.has_trauma_cert) qualificationsScore += 5;

    // Factor 4: Rating score (20 points max)
    const ratingScore = medic.star_rating > 0
      ? medic.star_rating * 4
      : 15; // New medics get benefit of the doubt

    // Territory bonus
    const territoryBonus = await getTerritoryBonus(medic.id, booking.site_postcode);

    const totalScore = distanceScore + utilizationScore + qualificationsScore + ratingScore + territoryBonus;

    rankedCandidates.push({
      ...medic,
      score: totalScore,
      distance_score: distanceScore,
      utilization_score: utilizationScore,
      qualifications_score: qualificationsScore,
      rating_score: ratingScore,
      territory_bonus: territoryBonus,
      travel_time_minutes: travelData.travel_time_minutes,
      distance_miles: travelData.distance_miles,
      booked_days_this_week: bookedDays,
    });
  }

  return rankedCandidates;
}

/**
 * Call calculate-travel-time Edge Function
 */
async function calculateTravelTime(
  originPostcode: string,
  destinationPostcode: string
): Promise<{ travel_time_minutes: number; distance_miles: number }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-travel-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        origin_postcode: originPostcode,
        destination_postcode: destinationPostcode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Travel time API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      travel_time_minutes: data.travel_time_minutes,
      distance_miles: data.distance_miles,
    };
  } catch (error) {
    console.warn('⚠️  Travel time calculation failed, using default:', error.message);
    // Fallback: assume 60 minutes (worst case for scoring)
    return {
      travel_time_minutes: 60,
      distance_miles: 30,
    };
  }
}

/**
 * Count medic's confirmed bookings this week (Mon-Sun)
 */
async function getBookedDaysThisWeek(
  medicId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> {
  const { data, error } = await supabase
    .from('bookings')
    .select('shift_date')
    .eq('medic_id', medicId)
    .in('status', ['confirmed', 'in_progress'])
    .gte('shift_date', weekStart.toISOString().split('T')[0])
    .lte('shift_date', weekEnd.toISOString().split('T')[0]);

  if (error || !data) {
    console.warn('Error fetching booked days:', error);
    return 0;
  }

  // Count unique dates
  const uniqueDates = new Set(data.map(b => b.shift_date));
  return uniqueDates.size;
}

/**
 * Check if medic is primary/secondary for this territory
 * Returns: +10 for primary, +5 for secondary, 0 otherwise
 */
async function getTerritoryBonus(
  medicId: string,
  sitePostcode: string
): Promise<number> {
  // Extract postcode sector (first 2-4 chars before space/number)
  const sector = sitePostcode.trim().substring(0, 4).toUpperCase();

  const { data, error } = await supabase
    .from('territories')
    .select('primary_medic_id, secondary_medic_id')
    .eq('postcode_sector', sector)
    .single();

  if (error || !data) {
    return 0; // No territory defined
  }

  if (data.primary_medic_id === medicId) {
    return 10; // Primary medic bonus
  }

  if (data.secondary_medic_id === medicId) {
    return 5; // Secondary medic bonus
  }

  return 0;
}

/**
 * Update booking with matched medic (if score >= 50)
 */
async function updateBookingWithMatch(
  bookingId: string,
  candidate: MedicCandidate,
  requiresManualApproval: boolean
): Promise<void> {
  const matchCriteria = {
    distance: candidate.distance_score,
    utilization: candidate.utilization_score,
    qualifications: candidate.qualifications_score,
    rating: candidate.rating_score,
    territory_bonus: candidate.territory_bonus,
    travel_time_minutes: candidate.travel_time_minutes,
    distance_miles: candidate.distance_miles,
    booked_days_this_week: candidate.booked_days_this_week,
  };

  const updateData: any = {
    auto_matched: true,
    match_score: candidate.score,
    match_criteria: matchCriteria,
    requires_manual_approval: requiresManualApproval,
  };

  if (requiresManualApproval) {
    updateData.approval_reason = 'Low auto-match score';
    // Status stays 'pending' for manual review
  } else {
    updateData.medic_id = candidate.id;
    updateData.status = 'assigned'; // Auto-assign if score >= 50
  }

  const { error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating booking:', error);
    throw new Error('Failed to update booking with match');
  }

  if (requiresManualApproval) {
    console.log(`⚠️  Low score (${candidate.score.toFixed(2)}) - requires manual approval`);
  } else {
    console.log(`✅ Auto-assigned medic ${candidate.id} with score ${candidate.score.toFixed(2)}`);
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
      approval_reason: 'No available medics',
      auto_matched: false,
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating booking (no match):', error);
  }

  console.log(`❌ No candidates found - requires manual approval`);
}
