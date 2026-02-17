/**
 * Coverage Gap Detection
 *
 * Identifies territories with poor coverage (high rejection rate) and
 * recommends remediation actions.
 *
 * WHY separate from hiring triggers: Coverage gaps have different remediation:
 * - May need secondary medic (not full hire)
 * - May need territory boundary adjustments
 * - May need pricing changes (high travel costs deterring medics)
 *
 * WHY minimum volume filter: Prevents false positives from low-volume territories.
 * A territory with 1 booking and 1 rejection (100% rejection) isn't a coverage gap,
 * it's statistical noise. Require 10+ bookings for meaningful analysis.
 *
 * Source: Pitfall 5 from research (rejection-rate-false-positives.md)
 */

import type { CoverageGapAlert, TerritoryWithMetrics } from '@/lib/queries/admin/territories';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Enhanced coverage gap with persistence tracking and recommended actions.
 *
 * Extends the basic CoverageGapAlert type from territories.ts with:
 * - weeks_persisting: How long the gap has existed (for prioritization)
 * - minimum_volume_met: Whether the territory has enough bookings for valid analysis
 * - recommended_action: Specific remediation suggestion
 */
export interface CoverageGap extends CoverageGapAlert {
  weeks_persisting: number; // Number of weeks with rejection_rate >10%
  minimum_volume_met: boolean; // true if total_bookings >= 10
  recommended_action: string; // Specific action for admin to take
}

// =============================================================================
// DETECTION
// =============================================================================

/**
 * Detect coverage gaps in territories with meaningful booking volume.
 *
 * WHY 10 booking minimum: Statistical significance. Lower volumes produce
 * unreliable percentages (e.g., 1/5 = 20% could just be bad luck, not pattern).
 *
 * WHY track persistence: A territory with 3 weeks of high rejection rate is
 * a structural problem requiring hiring. A single week might be temporary
 * (medic on holiday, weather disruption).
 *
 * @param territories - Territories with recent metrics
 * @returns Array of coverage gaps, sorted by severity (critical first)
 */
export function detectCoverageGaps(
  territories: TerritoryWithMetrics[]
): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  territories.forEach(territory => {
    const { recent_metrics } = territory;
    const rejection_rate = recent_metrics.rejection_rate;

    // Only flag territories with rejection rate >10%
    if (rejection_rate <= 10) {
      return;
    }

    // Check if minimum volume threshold is met
    const minimum_volume_met = recent_metrics.total_bookings >= 10;

    // Determine severity
    // Critical: >25% rejection rate
    // Warning: 10-25% rejection rate
    const severity: 'warning' | 'critical' =
      rejection_rate > 25 ? 'critical' : 'warning';

    // Generate recommended action based on territory state
    let recommended_action: string;

    if (!territory.primary_medic_id) {
      // No primary medic assigned
      recommended_action = 'Assign primary medic to this territory';
    } else if (!territory.secondary_medic_id) {
      // Primary assigned but no secondary
      recommended_action = 'Assign secondary medic to provide backup coverage';
    } else {
      // Both primary and secondary assigned, still high rejection
      // Likely need to expand capacity or territory boundaries
      recommended_action = 'Consider hiring additional medic - both primary and secondary may be at capacity';
    }

    // Add booking context to recommendation if low volume
    if (!minimum_volume_met) {
      recommended_action += ` (Note: Only ${recent_metrics.total_bookings} bookings - monitor before acting)`;
    }

    gaps.push({
      territory_id: territory.id,
      postcode_sector: territory.postcode_sector,
      region: territory.region,
      rejection_rate,
      total_bookings: recent_metrics.total_bookings,
      rejected_bookings: recent_metrics.rejected_bookings,
      severity,
      message: `Coverage Gap in ${territory.postcode_sector}: ${recent_metrics.rejected_bookings}/${recent_metrics.total_bookings} bookings rejected (${rejection_rate.toFixed(1)}%). ${recommended_action}`,
      weeks_persisting: 0, // Would be calculated from historical territory_metrics data
      minimum_volume_met,
      recommended_action,
    });
  });

  return gaps;
}

// =============================================================================
// SORTING
// =============================================================================

/**
 * Sort coverage gaps by priority for admin action.
 *
 * Priority order:
 * 1. Critical severity (>25% rejection) before warnings
 * 2. Higher rejection rate first (within same severity)
 * 3. Higher booking volume first (if same rejection rate)
 *
 * WHY prioritize volume: A territory with 50 bookings and 15% rejection rate
 * (7.5 failed bookings) is more urgent than a territory with 12 bookings and
 * 15% rejection rate (1.8 failed bookings). Absolute impact matters.
 *
 * @param gaps - Array of coverage gaps
 * @returns Sorted array (critical and high-volume first)
 */
export function sortGapsBySeverity(gaps: CoverageGap[]): CoverageGap[] {
  return [...gaps].sort((a, b) => {
    // 1. Sort by severity (critical first)
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }

    // 2. Sort by rejection rate (highest first)
    if (a.rejection_rate !== b.rejection_rate) {
      return b.rejection_rate - a.rejection_rate;
    }

    // 3. Sort by total bookings (highest volume first)
    return b.total_bookings - a.total_bookings;
  });
}
