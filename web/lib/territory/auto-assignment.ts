/**
 * Client-Side Auto-Assignment Scoring Module
 *
 * Mirrors the Edge Function scoring logic for transparent admin review.
 * Enables the admin to see WHY each medic was ranked at their position.
 *
 * Phase 7.5: Territory Auto-Assignment
 *
 * Scoring weights (matches Edge Function):
 * - Distance: 30% (highest priority - closer medics preferred)
 * - Utilization: 20% (prefer <70% utilization to prevent burnout)
 * - Qualifications: 15% (already hard-filtered, bonus for extra certs)
 * - Availability: 15% (includes territory proximity)
 * - Rating: 15% (prefer >4.5 stars)
 * - Performance: 5% (RIDDOR compliance bonus)
 */

'use client';

import type { MedicWithMetrics } from '@/lib/queries/admin/medics';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Auto-assignment score breakdown for a single medic
 */
export interface AutoAssignmentScore {
  medic_id: string;
  medic_name: string;
  total_score: number; // 0-100 (weighted sum)

  // Individual scoring dimensions (0-100 each, before weighting)
  distance_score: number; // 0-30 after weighting
  utilization_score: number; // 0-20 after weighting
  qualification_score: number; // 0-15 after weighting
  availability_score: number; // 0-15 after weighting
  rating_score: number; // 0-15 after weighting
  performance_score: number; // 0-5 after weighting

  // Metadata
  is_primary_territory: boolean;
  is_available: boolean;
  has_required_certs: boolean;
  travel_time_minutes: number | null;
  travel_distance_miles: number | null;
  utilization_pct: number;
}

/**
 * Booking requirements for scoring
 */
export interface BookingRequirements {
  postcode: string;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
}

/**
 * Cached travel time data (from travel_time_cache table)
 */
export interface TravelTimeData {
  medic_id: string;
  distance_miles: number;
  travel_time_minutes: number;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate distance score (0-100)
 *
 * Why this weight (30%): Distance is the PRIMARY factor per Phase 7.5 requirements.
 * Closer medics reduce travel time, improve response speed, and lower costs.
 *
 * Scoring tiers:
 * - <10 miles: 100 points (local)
 * - 10-20 miles: 75 points (regional)
 * - 20-30 miles: 50 points (extended)
 * - 30+ miles: 25 points (out-of-territory)
 */
function calculateDistanceScore(distance_miles: number | null): number {
  if (distance_miles === null) {
    // No cached data - assume medium distance
    return 50;
  }

  if (distance_miles < 10) return 100;
  if (distance_miles < 20) return 75;
  if (distance_miles < 30) return 50;
  return 25;
}

/**
 * Calculate utilization score (0-100)
 *
 * Why this weight (20%): Second highest priority per Phase 7.5 requirements.
 * Prefer medics with <70% utilization to prevent burnout and maintain quality.
 *
 * Scoring tiers:
 * - <70%: 100 points (preferred range)
 * - 70-80%: 100-50 points (linear decrease)
 * - 80-100%: 50-25 points (linear decrease)
 * - 100%+: 25 points (overutilized)
 */
function calculateUtilizationScore(utilization_pct: number): number {
  if (utilization_pct < 70) {
    return 100; // Preferred utilization range
  } else if (utilization_pct < 80) {
    // Linear decrease from 100 to 50 for 70-80%
    return 100 - ((utilization_pct - 70) * 5);
  } else if (utilization_pct < 100) {
    // Linear decrease from 50 to 25 for 80-100%
    return 50 - ((utilization_pct - 80) * 1.25);
  } else {
    return 25; // Overutilized
  }
}

/**
 * Calculate qualification score (0-100)
 *
 * Why this weight (15%): Already hard-filtered by Edge Function, so weight reduced.
 * This is a bonus for having ADDITIONAL certifications beyond required.
 *
 * Scoring:
 * - Has all required certs: 100 points
 * - Missing required certs: 0 points (disqualified upstream)
 */
function calculateQualificationScore(
  medic: MedicWithMetrics,
  requirements: BookingRequirements
): number {
  if (requirements.confined_space_required && !medic.has_confined_space_cert) {
    return 0; // Missing required cert
  }

  if (requirements.trauma_specialist_required && !medic.has_trauma_cert) {
    return 0; // Missing required cert
  }

  return 100; // Has all required certs
}

/**
 * Calculate availability score (0-100)
 *
 * Why this weight (15%): Availability is critical but already pre-filtered.
 * This includes territory proximity as a proxy for availability.
 *
 * Scoring:
 * - Available for work: 100 points
 * - Not available: 0 points (disqualified upstream)
 */
function calculateAvailabilityScore(medic: MedicWithMetrics): number {
  if (!medic.available_for_work) {
    return 0; // Not available
  }

  return 100; // Available
}

/**
 * Calculate rating score (0-100)
 *
 * Why this weight (15%): Rating reflects medic quality and client satisfaction.
 * Prefer medics with >4.5 stars per Phase 7.5 requirements.
 *
 * Scoring:
 * - 0-5 stars converted to 0-100 (star_rating * 20)
 * - Bonus: +10 points if rating > 4.5 stars
 */
function calculateRatingScore(star_rating: number): number {
  let score = star_rating * 20; // Convert 0-5 to 0-100

  // Bonus for high ratings
  if (star_rating > 4.5) {
    score = Math.min(100, score + 10);
  }

  return score;
}

/**
 * Calculate performance score (0-100)
 *
 * Why this weight (5%): RIDDOR compliance is important but lower priority.
 * This is a bonus for maintaining excellent safety documentation.
 *
 * Scoring:
 * - riddor_compliance_rate is already 0-100
 */
function calculatePerformanceScore(riddor_compliance_rate: number): number {
  return riddor_compliance_rate;
}

/**
 * Calculate auto-assignment score for a single medic
 *
 * This pure function uses the same formulas as the Edge Function but works
 * with client-side data. No Google Maps API calls - travel_time_minutes is
 * passed in from cached data.
 *
 * @param medic - Medic with metrics (from useMedics hook)
 * @param requirements - Booking requirements
 * @param travelData - Cached travel time data (optional)
 * @returns AutoAssignmentScore with total and breakdown
 */
export function calculateAutoMatchScore(
  medic: MedicWithMetrics,
  requirements: BookingRequirements,
  travelData?: TravelTimeData
): AutoAssignmentScore {
  // Calculate individual dimension scores (0-100 each)
  const distance_score_raw = calculateDistanceScore(travelData?.distance_miles || null);
  const utilization_score_raw = calculateUtilizationScore(medic.utilization_pct);
  const qualification_score_raw = calculateQualificationScore(medic, requirements);
  const availability_score_raw = calculateAvailabilityScore(medic);
  const rating_score_raw = calculateRatingScore(medic.star_rating);
  const performance_score_raw = calculatePerformanceScore(medic.riddor_compliance_rate);

  // Apply weights to get weighted scores
  const distance_score = distance_score_raw * 0.30; // 30% weight
  const utilization_score = utilization_score_raw * 0.20; // 20% weight
  const qualification_score = qualification_score_raw * 0.15; // 15% weight
  const availability_score = availability_score_raw * 0.15; // 15% weight
  const rating_score = rating_score_raw * 0.15; // 15% weight
  const performance_score = performance_score_raw * 0.05; // 5% weight

  // Calculate total score
  // If missing critical criteria (qualifications or availability), total = 0
  let total_score = 0;
  if (qualification_score_raw === 100 && availability_score_raw === 100) {
    total_score =
      distance_score +
      utilization_score +
      qualification_score +
      availability_score +
      rating_score +
      performance_score;
  }

  // Check if medic has required certs
  const has_required_certs =
    (!requirements.confined_space_required || medic.has_confined_space_cert) &&
    (!requirements.trauma_specialist_required || medic.has_trauma_cert);

  // Check if this is their primary territory
  const is_primary_territory = medic.territory_assignments.some(
    t => t.role === 'primary' && requirements.postcode.startsWith(t.postcode_sector)
  );

  return {
    medic_id: medic.id,
    medic_name: `${medic.first_name} ${medic.last_name}`,
    total_score: Math.round(total_score * 100) / 100, // Round to 2 decimals
    distance_score: Math.round(distance_score * 100) / 100,
    utilization_score: Math.round(utilization_score * 100) / 100,
    qualification_score: Math.round(qualification_score * 100) / 100,
    availability_score: Math.round(availability_score * 100) / 100,
    rating_score: Math.round(rating_score * 100) / 100,
    performance_score: Math.round(performance_score * 100) / 100,
    is_primary_territory,
    is_available: medic.available_for_work,
    has_required_certs,
    travel_time_minutes: travelData?.travel_time_minutes || null,
    travel_distance_miles: travelData?.distance_miles || null,
    utilization_pct: medic.utilization_pct,
  };
}

/**
 * Rank medics for a booking, sorted by total score (highest first)
 *
 * This function:
 * 1. Filters out unavailable medics
 * 2. Filters out medics lacking required certifications
 * 3. Calculates scores for all candidates
 * 4. Sorts by total score descending
 *
 * @param medics - Array of medics with metrics
 * @param requirements - Booking requirements
 * @param travelDataCache - Optional cached travel times (map of medic_id -> TravelTimeData)
 * @returns Sorted array of AutoAssignmentScore (highest score first)
 */
export function rankMedicsForBooking(
  medics: MedicWithMetrics[],
  requirements: BookingRequirements,
  travelDataCache?: Map<string, TravelTimeData>
): AutoAssignmentScore[] {
  // Filter out unavailable medics
  let candidates = medics.filter(m => m.available_for_work);

  // Filter out medics lacking required certifications
  if (requirements.confined_space_required) {
    candidates = candidates.filter(m => m.has_confined_space_cert);
  }

  if (requirements.trauma_specialist_required) {
    candidates = candidates.filter(m => m.has_trauma_cert);
  }

  // Calculate scores for all candidates
  const scores = candidates.map(medic => {
    const travelData = travelDataCache?.get(medic.id);
    return calculateAutoMatchScore(medic, requirements, travelData);
  });

  // Sort by total score descending (highest first)
  scores.sort((a, b) => b.total_score - a.total_score);

  return scores;
}

/**
 * Format score breakdown as human-readable string
 *
 * Useful for tooltips, admin review UI, and debugging.
 *
 * Example output:
 * "Distance: 28/30 (12 miles, 15 min) | Utilization: 18/20 (45%) | Qualifications: 15/15 | Availability: 15/15 | Rating: 14/15 (4.6★) | Performance: 5/5 (100%) | TOTAL: 95/100"
 *
 * @param score - AutoAssignmentScore to format
 * @returns Human-readable breakdown string
 */
export function formatScoreBreakdown(score: AutoAssignmentScore): string {
  const parts: string[] = [];

  // Distance
  if (score.travel_distance_miles !== null) {
    parts.push(
      `Distance: ${score.distance_score.toFixed(1)}/30 (${score.travel_distance_miles} mi, ${score.travel_time_minutes} min)`
    );
  } else {
    parts.push(`Distance: ${score.distance_score.toFixed(1)}/30 (no data)`);
  }

  // Utilization
  parts.push(`Utilization: ${score.utilization_score.toFixed(1)}/20 (${score.utilization_pct}%)`);

  // Qualifications
  parts.push(`Qualifications: ${score.qualification_score.toFixed(1)}/15`);

  // Availability
  parts.push(`Availability: ${score.availability_score.toFixed(1)}/15`);

  // Rating
  const star_rating = score.rating_score / 0.15 / 20; // Reverse calculation to get original stars
  parts.push(`Rating: ${score.rating_score.toFixed(1)}/15 (${star_rating.toFixed(1)}★)`);

  // Performance
  const compliance_rate = score.performance_score / 0.05; // Reverse calculation to get original %
  parts.push(`Performance: ${score.performance_score.toFixed(1)}/5 (${compliance_rate.toFixed(0)}%)`);

  // Total
  parts.push(`TOTAL: ${score.total_score.toFixed(1)}/100`);

  return parts.join(' | ');
}

/**
 * Get color class for total score
 *
 * Used for visual indicators in admin UI.
 *
 * - Green: ≥80 (excellent match)
 * - Yellow: 50-79 (acceptable match, may need review)
 * - Red: <50 (poor match, requires manual approval)
 */
export function getScoreColor(total_score: number): string {
  if (total_score >= 80) return 'text-green-600';
  if (total_score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get badge color class for total score
 */
export function getScoreBadgeColor(total_score: number): string {
  if (total_score >= 80) return 'bg-green-100 text-green-800';
  if (total_score >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}
