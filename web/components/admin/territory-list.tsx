/**
 * Territory List Component
 *
 * Table showing all territories with utilization, medic assignments, and metrics.
 * Sortable by utilization, highlights coverage gaps.
 */

'use client';

import { useState, useMemo } from 'react';
import { TerritoryWithMetrics } from '@/lib/queries/admin/territories';
import { AlertTriangle, ArrowUpDown } from 'lucide-react';

interface Props {
  territories: TerritoryWithMetrics[];
}

type SortField = 'postcode' | 'region' | 'utilization' | 'rejection_rate';
type SortDirection = 'asc' | 'desc';

export default function TerritoryList({ territories }: Props) {
  const [sortField, setSortField] = useState<SortField>('utilization');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort territories
  const sortedTerritories = useMemo(() => {
    return [...territories].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'postcode':
          aVal = a.postcode_sector;
          bVal = b.postcode_sector;
          break;
        case 'region':
          aVal = a.region;
          bVal = b.region;
          break;
        case 'utilization':
          aVal = a.utilization_pct;
          bVal = b.utilization_pct;
          break;
        case 'rejection_rate':
          aVal = a.recent_metrics.rejection_rate;
          bVal = b.recent_metrics.rejection_rate;
          break;
        default:
          aVal = a.postcode_sector;
          bVal = b.postcode_sector;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Type assertion for numeric comparisons
      const aNum = aVal as number;
      const bNum = bVal as number;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [territories, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'utilization' || field === 'rejection_rate' ? 'desc' : 'asc');
    }
  };

  const getUtilizationBarColor = (pct: number): string => {
    if (pct < 50) return 'bg-green-400';
    if (pct <= 80) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-700/50">
            <tr>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => handleSort('postcode')}
              >
                <div className="flex items-center gap-2">
                  Postcode Sector
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => handleSort('region')}
              >
                <div className="flex items-center gap-2">
                  Region
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Primary Medic
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Secondary Medic
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => handleSort('utilization')}
              >
                <div className="flex items-center gap-2">
                  Utilization
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Bookings
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => handleSort('rejection_rate')}
              >
                <div className="flex items-center gap-2">
                  Rejection Rate
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Fulfillment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {sortedTerritories.map((territory) => {
              const hasCoverageGap = territory.recent_metrics.rejection_rate > 10;

              return (
                <tr
                  key={territory.id}
                  className={`hover:bg-gray-700/30 transition-colors ${
                    hasCoverageGap ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {hasCoverageGap && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium text-white">
                        {territory.postcode_sector}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{territory.region}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {territory.primary_medic_name || (
                        <span className="text-gray-500 italic">Unassigned</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {territory.secondary_medic_name || (
                        <span className="text-gray-500 italic">None</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getUtilizationBarColor(territory.utilization_pct)} transition-all duration-300`}
                          style={{ width: `${Math.min(100, territory.utilization_pct)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white min-w-[3rem] text-right">
                        {territory.utilization_pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="text-white font-medium">
                        {territory.recent_metrics.total_bookings} total
                      </div>
                      <div className="text-xs text-gray-400">
                        {territory.recent_metrics.confirmed_bookings} confirmed,{' '}
                        {territory.recent_metrics.rejected_bookings} rejected
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        territory.recent_metrics.rejection_rate > 25
                          ? 'text-red-400'
                          : territory.recent_metrics.rejection_rate > 10
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}
                    >
                      {territory.recent_metrics.rejection_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {territory.recent_metrics.fulfillment_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {territories.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-400">No territories found.</p>
        </div>
      )}
    </div>
  );
}
