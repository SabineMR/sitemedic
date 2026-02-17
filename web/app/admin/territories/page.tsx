/**
 * Territory Coverage Page
 *
 * Visual oversight of geographic coverage with color-coded map,
 * coverage gap alerts, and territory utilization table.
 */

'use client';

import dynamic from 'next/dynamic';
import { useTerritories } from '@/lib/queries/admin/territories';
import TerritoryList from '@/components/admin/territory-list';
import { Map, Users, UserCheck, UserX, TrendingUp, Briefcase } from 'lucide-react';
import { aggregateTerritoryMetrics } from '@/lib/territory/metrics';
import { detectHiringTriggers } from '@/lib/territory/hiring-triggers';
import CoverageAlerts from './coverage-alerts';
import HiringPanel from './hiring-panel';

// Dynamic import for map component to avoid SSR issues with Leaflet
const TerritoryMap = dynamic(() => import('@/components/admin/territory-map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl flex items-center justify-center">
      <div className="text-gray-400">Loading map...</div>
    </div>
  ),
});

export default function TerritoriesPage() {
  const { data: territories = [], isLoading, error } = useTerritories();

  // Calculate summary statistics
  const stats = aggregateTerritoryMetrics(territories);

  // Count active hiring triggers
  const hiringTriggers = detectHiringTriggers(territories);
  const activeHiringAlerts = hiringTriggers.filter(t => t.severity === 'critical').length;

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">
            Failed to load territories. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-8 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Map className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Territory Coverage</h1>
        </div>
        <p className="text-gray-400">
          Monitor utilization and coverage gaps across UK territories
        </p>
      </div>

      {/* Summary Stats Bar */}
      {!isLoading && territories.length > 0 && (
        <div className="px-8 pt-6">
          <div className="grid grid-cols-5 gap-4">
            {/* Total Territories */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Total Territories</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.total_territories}</div>
            </div>

            {/* Assigned */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-400">Assigned</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.assigned_territories}</div>
            </div>

            {/* Unassigned */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <UserX className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Unassigned</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.unassigned_territories}</div>
            </div>

            {/* Average Utilization */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-400">Avg Utilization</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.avg_utilization}%</div>
            </div>

            {/* Active Hiring Alerts */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-gray-400">Hiring Alerts</span>
              </div>
              <div className="text-2xl font-bold text-white">{activeHiringAlerts}</div>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Gap Alerts */}
      <CoverageAlerts territories={territories} />

      {/* Hiring Recommendations */}
      <HiringPanel territories={territories} />

      {/* Map */}
      <div className="px-8 pt-6 flex-shrink-0" style={{ height: '60vh' }}>
        {isLoading ? (
          <div className="h-full w-full bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl flex items-center justify-center">
            <div className="text-gray-400">Loading territories...</div>
          </div>
        ) : territories.length > 0 ? (
          <TerritoryMap territories={territories} />
        ) : (
          <div className="h-full w-full bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400">No territories found.</p>
              <p className="text-sm text-gray-500 mt-2">
                Territories will appear here once they are configured.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Territory List */}
      <div className="px-8 py-6 flex-1 overflow-auto">
        <h2 className="text-xl font-semibold text-white mb-4">All Territories</h2>
        <TerritoryList territories={territories} />
      </div>
    </div>
  );
}
