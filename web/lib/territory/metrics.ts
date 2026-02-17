/**
 * Territory Metrics Calculation
 *
 * Pure functions for calculating territory utilization and aggregating metrics.
 * No side effects or database calls - designed for easy testing.
 *
 * Key thresholds (from research):
 * - Optimal utilization: 75-85% (allows buffer for unplanned work)
 * - High utilization warning: >70%
 * - Critical utilization: >80% (hiring trigger)
 */

import type { TerritoryWithMetrics } from '@/lib/queries/admin/territories';

// =============================================================================
// TYPES
// =============================================================================

export interface TerritoryMetricsSummary {
  total_territories: number;
  assigned_territories: number; // Has primary medic
  unassigned_territories: number; // No primary medic
  avg_utilization: number; // Average across all assigned territories (0-100)
  total_bookings: number; // Sum of all bookings across territories
  avg_rejection_rate: number; // Average rejection rate (0-100)
  high_utilization_count: number; // Territories with >80% utilization
  coverage_gap_count: number; // Territories with >10% rejection rate
}

// =============================================================================
// UTILIZATION CALCULATION
// =============================================================================

/**
 * Calculate utilization percentage for a medic based on confirmed bookings.
 *
 * Formula: (confirmed_bookings / working_days) * 100
 *
 * WHY 5 working days: UK construction standard is 5-day week (Monday-Friday).
 * Medics typically work 1 booking per day, so 5 bookings/week = 100% utilization.
 *
 * WHY cap at 100%: Prevents misleading >100% values when medic works overtime
 * or weekend shifts. Utilization is about capacity planning, not total hours.
 *
 * @param confirmedBookings - Number of confirmed bookings in the period
 * @param workingDays - Number of working days in the period (default: 5 for weekly)
 * @returns Utilization percentage from 0-100
 */
export function calculateUtilization(
  confirmedBookings: number,
  workingDays: number = 5
): number {
  if (workingDays <= 0) {
    throw new Error('workingDays must be positive');
  }

  const rawUtilization = (confirmedBookings / workingDays) * 100;
  return Math.min(Math.round(rawUtilization), 100);
}

// =============================================================================
// TERRITORY AGGREGATION
// =============================================================================

/**
 * Aggregate metrics across all territories for admin dashboard summary.
 *
 * Provides high-level view of territory coverage health:
 * - How many territories have medics assigned?
 * - What's the average utilization across the network?
 * - How many territories have coverage issues?
 *
 * WHY include zeros in avg_utilization: Unassigned territories (0% utilization)
 * should pull down the average to reflect true network capacity.
 *
 * WHY separate high_utilization_count: Allows admin to quickly identify
 * territories approaching capacity (>80%) that may need additional medics.
 *
 * @param territories - Array of territories with metrics
 * @returns Summary statistics for dashboard display
 */
export function aggregateTerritoryMetrics(
  territories: TerritoryWithMetrics[]
): TerritoryMetricsSummary {
  const total = territories.length;
  const assigned = territories.filter(t => t.primary_medic_id !== null).length;

  // Calculate average utilization (including unassigned = 0%)
  const totalUtilization = territories.reduce(
    (sum, t) => sum + t.utilization_pct,
    0
  );
  const avgUtilization = total > 0 ? Math.round(totalUtilization / total) : 0;

  // Sum all bookings
  const totalBookings = territories.reduce(
    (sum, t) => sum + t.recent_metrics.total_bookings,
    0
  );

  // Calculate average rejection rate (weighted by booking volume)
  let totalRejections = 0;
  let totalBookingsForRejection = 0;
  territories.forEach(t => {
    totalRejections += t.recent_metrics.rejected_bookings;
    totalBookingsForRejection += t.recent_metrics.total_bookings;
  });
  const avgRejectionRate =
    totalBookingsForRejection > 0
      ? Math.round((totalRejections / totalBookingsForRejection) * 100)
      : 0;

  // Count territories with high utilization (>80%)
  const highUtilizationCount = territories.filter(
    t => t.utilization_pct > 80
  ).length;

  // Count territories with coverage gaps (>10% rejection rate)
  const coverageGapCount = territories.filter(
    t => t.recent_metrics.rejection_rate > 10 && t.recent_metrics.total_bookings > 10
  ).length;

  return {
    total_territories: total,
    assigned_territories: assigned,
    unassigned_territories: total - assigned,
    avg_utilization: avgUtilization,
    total_bookings: totalBookings,
    avg_rejection_rate: avgRejectionRate,
    high_utilization_count: highUtilizationCount,
    coverage_gap_count: coverageGapCount,
  };
}
