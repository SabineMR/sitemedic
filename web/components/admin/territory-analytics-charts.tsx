/**
 * Territory Analytics Charts
 *
 * Three chart/display components for the territory analytics dashboard:
 * 1. TerritoryHeatmap - Summary stats grid + interactive map via injected component
 * 2. HiringTriggerCards - Cards grouped by region with severity badges
 * 3. CoverageGapTable - Table of territories with high rejection rates
 */

'use client';

import React from 'react';
import type { TerritoryWithMetrics } from '@/lib/queries/admin/territories';
import { aggregateTerritoryMetrics } from '@/lib/territory/metrics';
import { detectHiringTriggers, groupTriggersByRegion } from '@/lib/territory/hiring-triggers';
import { detectCoverageGaps, sortGapsBySeverity } from '@/lib/territory/coverage-gaps';

// =============================================================================
// TERRITORY HEATMAP
// =============================================================================

interface TerritoryHeatmapProps {
  territories: TerritoryWithMetrics[];
  TerritoryMapComponent: React.ComponentType<any>;
}

/**
 * TerritoryHeatmap
 *
 * Shows a 6-card summary stats grid above an interactive map.
 * The map is injected via TerritoryMapComponent to allow dynamic import
 * (SSR-safe) in the parent page.
 */
export function TerritoryHeatmap({ territories, TerritoryMapComponent }: TerritoryHeatmapProps) {
  if (territories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
        <p className="text-lg font-medium">No territory data available</p>
        <p className="text-sm mt-1">Configure territories to see the heatmap</p>
      </div>
    );
  }

  const summary = aggregateTerritoryMetrics(territories);

  const statsCards = [
    {
      label: 'Total Territories',
      value: summary.total_territories,
      subtext: null,
      valueClass: 'text-white',
    },
    {
      label: 'Assigned',
      value: summary.assigned_territories,
      subtext: `${summary.unassigned_territories} unassigned`,
      valueClass: 'text-green-400',
    },
    {
      label: 'Avg Utilization',
      value: `${summary.avg_utilization}%`,
      subtext: summary.avg_utilization > 80 ? 'High load' : summary.avg_utilization > 50 ? 'Moderate' : 'Healthy',
      valueClass:
        summary.avg_utilization > 80
          ? 'text-red-400'
          : summary.avg_utilization > 50
          ? 'text-yellow-400'
          : 'text-green-400',
    },
    {
      label: 'Total Bookings',
      value: summary.total_bookings,
      subtext: 'recent period',
      valueClass: 'text-white',
    },
    {
      label: 'High Utilization',
      value: summary.high_utilization_count,
      subtext: '>80% capacity',
      valueClass: summary.high_utilization_count > 0 ? 'text-red-400' : 'text-green-400',
    },
    {
      label: 'Coverage Gaps',
      value: summary.coverage_gap_count,
      subtext: '>10% rejection rate',
      valueClass: summary.coverage_gap_count > 0 ? 'text-yellow-400' : 'text-green-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.valueClass}`}>{card.value}</p>
            {card.subtext && (
              <p className="text-xs text-gray-500 mt-1">{card.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Map */}
      <div className="h-[500px] rounded-xl overflow-hidden border border-gray-700">
        <TerritoryMapComponent territories={territories} />
      </div>
    </div>
  );
}

// =============================================================================
// HIRING TRIGGER CARDS
// =============================================================================

interface HiringTriggerCardsProps {
  territories: TerritoryWithMetrics[];
}

/**
 * HiringTriggerCards
 *
 * Detects and displays hiring triggers grouped by region.
 * Critical triggers (weeks_active >= 3) get red styling + "HIRE NOW" badge.
 * Warning triggers get yellow styling + "MONITOR" badge.
 */
export function HiringTriggerCards({ territories }: HiringTriggerCardsProps) {
  // Detect triggers and enrich with weeks_active from territory data
  const triggers = detectHiringTriggers(territories);

  const triggersWithWeeks = triggers.map((t) => {
    const territory = territories.find((terr) => terr.id === t.territory_id);
    return { ...t, weeks_active: territory?.hiring_trigger_weeks ?? 0 };
  });

  const grouped = groupTriggersByRegion(triggersWithWeeks);

  if (grouped.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-lg font-medium text-green-400">All clear</p>
        <p className="text-sm mt-1 text-gray-500">
          No hiring triggers detected -- all territories within capacity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([region, regionTriggers]) => (
        <div key={region}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {region}
          </h3>
          <div className="space-y-3">
            {regionTriggers.map((trigger, idx) => {
              const isCritical = trigger.weeks_active >= 3;
              const borderClass = isCritical
                ? 'border-l-4 border-red-500'
                : 'border-l-4 border-yellow-500';
              const bgClass = isCritical
                ? 'bg-red-500/10'
                : 'bg-yellow-500/10';

              return (
                <div
                  key={`${trigger.territory_id}-${trigger.trigger_type}-${idx}`}
                  className={`rounded-lg p-4 ${bgClass} ${borderClass} border border-gray-700`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Animated dot for critical */}
                      {isCritical && (
                        <span className="relative flex h-3 w-3 shrink-0 mt-0.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                        </span>
                      )}
                      {!isCritical && (
                        <span className="relative flex h-3 w-3 shrink-0 mt-0.5">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 leading-snug">
                          {trigger.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {trigger.postcode_sector} &middot; {trigger.trigger_type.replace(/_/g, ' ')} &middot;{' '}
                          {trigger.weeks_active > 0
                            ? `${trigger.weeks_active} week${trigger.weeks_active !== 1 ? 's' : ''} active`
                            : 'newly detected'}
                        </p>
                      </div>
                    </div>

                    {/* Badge */}
                    <span
                      className={`shrink-0 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                        isCritical
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {isCritical ? 'HIRE NOW' : 'MONITOR'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// COVERAGE GAP TABLE
// =============================================================================

interface CoverageGapTableProps {
  territories: TerritoryWithMetrics[];
}

/**
 * CoverageGapTable
 *
 * Displays a table of territories with coverage gaps (rejection rate > 10%),
 * filtered to minimum_volume_met === true to avoid statistical noise.
 * Sorted by severity (critical first) then rejection rate.
 */
export function CoverageGapTable({ territories }: CoverageGapTableProps) {
  const allGaps = detectCoverageGaps(territories);
  const sortedGaps = sortGapsBySeverity(allGaps);
  // Filter to only territories that meet minimum volume threshold
  const gaps = sortedGaps.filter((gap) => gap.minimum_volume_met === true);

  if (gaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-lg font-medium text-green-400">No coverage gaps</p>
        <p className="text-sm mt-1 text-gray-500">
          No coverage gaps detected -- all territories meeting service levels
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left font-semibold text-gray-300">Sector</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-300">Region</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-300">Rejection Rate</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-300">Total Bookings</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-300">Rejected</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-300">Severity</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-300">Recommended Action</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap) => {
            const isCritical = gap.severity === 'critical';
            const rejectionRateClass =
              gap.rejection_rate > 25
                ? 'text-red-400 font-semibold'
                : gap.rejection_rate > 10
                ? 'text-yellow-400 font-semibold'
                : 'text-gray-300';

            return (
              <tr
                key={gap.territory_id}
                className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
              >
                <td className="px-4 py-3 text-white font-medium">
                  {gap.postcode_sector}
                </td>
                <td className="px-4 py-3 text-gray-300">{gap.region}</td>
                <td className={`px-4 py-3 text-right ${rejectionRateClass}`}>
                  {gap.rejection_rate.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {gap.total_bookings}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {gap.rejected_bookings}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {gap.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs">
                  {gap.recommended_action}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
