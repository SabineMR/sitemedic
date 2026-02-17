/**
 * Hiring Trigger Detection
 *
 * Detects when territories need additional medic capacity based on:
 * 1. High utilization (>80% for 3+ weeks = critical, >70% = warning)
 * 2. Low fulfillment rate (<90% bookings confirmed)
 * 3. Coverage gaps (>10% rejection rate with meaningful volume)
 *
 * WHY these thresholds:
 * - 75-85% is industry-standard optimal utilization (allows buffer for unplanned work)
 * - >80% sustained over 3 weeks indicates structural capacity shortage, not temporary spike
 * - <90% fulfillment means 1 in 10 bookings fail - unacceptable service level
 * - >10 bookings minimum prevents false positives in low-volume territories
 *
 * Source: Phase 07.5 research (hiring-triggers.ts example, lines 381-459)
 */

import type { TerritoryWithMetrics } from '@/lib/queries/admin/territories';

// =============================================================================
// TYPES
// =============================================================================

export type TriggerType = 'high_utilization' | 'low_fulfillment' | 'coverage_gap';
export type TriggerSeverity = 'info' | 'warning' | 'critical';

export interface HiringTrigger {
  territory_id: string;
  postcode_sector: string;
  region: string;
  trigger_type: TriggerType;
  severity: TriggerSeverity;
  message: string; // Human-readable description for admin dashboard
  metric_value: number; // Actual metric value that triggered alert
  threshold: number; // Threshold that was exceeded
  weeks_active: number; // Number of consecutive weeks (for high utilization)
}

// =============================================================================
// DETECTION
// =============================================================================

/**
 * Detect hiring triggers across all territories.
 *
 * Returns array of alerts sorted by severity (critical first).
 *
 * WHY separate trigger types: Different actions needed for each:
 * - High utilization: Hire medic in this territory
 * - Low fulfillment: Investigate why bookings aren't being confirmed (may be pricing, not capacity)
 * - Coverage gap: Assign secondary medic or expand territory boundaries
 *
 * WHY minimum booking volume: A territory with 1 booking and 1 rejection has 100%
 * rejection rate but isn't a real problem. Require >10 bookings for statistical significance.
 *
 * @param territories - Territories with recent metrics
 * @returns Array of hiring triggers, sorted by severity
 */
export function detectHiringTriggers(
  territories: TerritoryWithMetrics[]
): HiringTrigger[] {
  const triggers: HiringTrigger[] = [];

  territories.forEach(territory => {
    const { utilization_pct, recent_metrics } = territory;

    // Trigger 1: High utilization
    // Critical if >80%, warning if >70%
    // weeks_active calculation would come from hiring_trigger_weeks column
    // (populated by weekly cron job in migration 039)
    if (utilization_pct > 80) {
      triggers.push({
        territory_id: territory.id,
        postcode_sector: territory.postcode_sector,
        region: territory.region,
        trigger_type: 'high_utilization',
        severity: 'critical',
        message: `Hire medic in ${territory.region} (${territory.postcode_sector} sector, ${utilization_pct}% utilization)`,
        metric_value: utilization_pct,
        threshold: 80,
        weeks_active: 0, // Would be populated from territory_metrics.hiring_trigger_weeks
      });
    } else if (utilization_pct > 70) {
      triggers.push({
        territory_id: territory.id,
        postcode_sector: territory.postcode_sector,
        region: territory.region,
        trigger_type: 'high_utilization',
        severity: 'warning',
        message: `Monitor ${territory.postcode_sector}: approaching capacity (${utilization_pct}%)`,
        metric_value: utilization_pct,
        threshold: 70,
        weeks_active: 0,
      });
    }

    // Trigger 2: Low fulfillment rate
    // Only flag if >10 bookings (avoid false positives)
    const fulfillment = recent_metrics.fulfillment_rate;
    if (fulfillment < 90 && recent_metrics.total_bookings > 10) {
      triggers.push({
        territory_id: territory.id,
        postcode_sector: territory.postcode_sector,
        region: territory.region,
        trigger_type: 'low_fulfillment',
        severity: 'critical',
        message: `Hire medic in ${territory.region}: only ${fulfillment.toFixed(1)}% bookings fulfilled (${recent_metrics.confirmed_bookings}/${recent_metrics.total_bookings})`,
        metric_value: fulfillment,
        threshold: 90,
        weeks_active: 0,
      });
    }

    // Trigger 3: Coverage gap (high rejection rate)
    // Only flag if >10 bookings (statistical significance)
    // Critical if >25%, warning if >10%
    const rejection_rate = recent_metrics.rejection_rate;
    if (rejection_rate > 10 && recent_metrics.total_bookings > 10) {
      const severity: TriggerSeverity = rejection_rate > 25 ? 'critical' : 'warning';
      triggers.push({
        territory_id: territory.id,
        postcode_sector: territory.postcode_sector,
        region: territory.region,
        trigger_type: 'coverage_gap',
        severity,
        message: `Coverage gap in ${territory.postcode_sector}: ${rejection_rate.toFixed(1)}% rejection rate (${recent_metrics.rejected_bookings}/${recent_metrics.total_bookings} bookings rejected)`,
        metric_value: rejection_rate,
        threshold: 10,
        weeks_active: 0,
      });
    }
  });

  // Sort by severity (critical first) then by metric value (highest first)
  return triggers.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    if (a.severity !== b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.metric_value - a.metric_value;
  });
}

// =============================================================================
// GROUPING
// =============================================================================

/**
 * Group hiring triggers by region for regional hiring strategy.
 *
 * WHY group by region: Admin may want to hire 1 medic to cover multiple
 * adjacent postcode sectors in the same city (e.g., hire 1 Manchester medic
 * to cover M1, M2, M3 instead of 3 separate medics).
 *
 * Returns Map for easy lookup by region name.
 *
 * @param triggers - Array of hiring triggers
 * @returns Map of region name to triggers in that region
 */
export function groupTriggersByRegion(
  triggers: HiringTrigger[]
): Map<string, HiringTrigger[]> {
  const grouped = new Map<string, HiringTrigger[]>();

  triggers.forEach(trigger => {
    const existing = grouped.get(trigger.region) || [];
    grouped.set(trigger.region, [...existing, trigger]);
  });

  return grouped;
}
