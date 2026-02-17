/**
 * Territory Coverage Page
 *
 * Visual oversight of geographic coverage with color-coded map,
 * coverage gap alerts, and territory utilization table.
 */

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTerritories } from '@/lib/queries/admin/territories';
import TerritoryList from '@/components/admin/territory-list';
import { Map, Users, UserCheck, UserX, TrendingUp, Briefcase, AlertTriangle } from 'lucide-react';
import { aggregateTerritoryMetrics } from '@/lib/territory/metrics';
import { detectHiringTriggers } from '@/lib/territory/hiring-triggers';
import { detectCoverageGaps } from '@/lib/territory/coverage-gaps';
import CoverageAlerts from './coverage-alerts';
import HiringPanel from './hiring-panel';
import AssignmentPanel from './assignment-panel';
import TerritoryDetail from './territory-detail';
import type { TerritoryWithMetrics } from '@/lib/queries/admin/territories';

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
  const { data: territories = [], isLoading, error, refetch } = useTerritories();
  const [activeTab, setActiveTab] = useState<'coverage' | 'assignment'>('coverage');
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryWithMetrics | null>(null);

  // Calculate summary statistics
  const stats = aggregateTerritoryMetrics(territories);

  // Count active hiring triggers
  const hiringTriggers = detectHiringTriggers(territories);
  const activeHiringAlerts = hiringTriggers.filter(t => t.severity === 'critical').length;

  // Count coverage gaps
  const coverageGaps = detectCoverageGaps(territories);
  const activeCoverageAlerts = coverageGaps.filter(g => g.severity === 'critical').length;

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
          <h1 className="text-3xl font-bold text-white">Territory Management</h1>
        </div>
        <p className="text-gray-400">
          Monitor utilization, assign medics, and manage coverage gaps across UK territories
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

            {/* Active Alerts */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-400">Active Alerts</span>
              </div>
              <div className="text-2xl font-bold text-white">{activeCoverageAlerts + activeHiringAlerts}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-8 pt-6">
        <div className="flex gap-4 border-b border-gray-700/50">
          <button
            onClick={() => setActiveTab('coverage')}
            className={`
              px-4 py-2 font-medium transition-colors relative
              ${activeTab === 'coverage'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Coverage Map
          </button>
          <button
            onClick={() => setActiveTab('assignment')}
            className={`
              px-4 py-2 font-medium transition-colors relative
              ${activeTab === 'assignment'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Assignment Manager
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'coverage' ? (
        <div className="flex-1 overflow-auto">
          {/* Coverage Gap Alerts */}
          <CoverageAlerts territories={territories} />

          {/* Hiring Recommendations */}
          <HiringPanel territories={territories} />

          {/* Map */}
          <div className="px-8 pt-6 flex-shrink-0" style={{ height: '50vh' }}>
            {isLoading ? (
              <div className="h-full w-full bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl flex items-center justify-center">
                <div className="text-gray-400">Loading territories...</div>
              </div>
            ) : territories.length > 0 ? (
              <TerritoryMap
                territories={territories}
                onTerritoryClick={setSelectedTerritory}
                selectedTerritoryId={selectedTerritory?.id}
                onRefreshClick={() => refetch()}
              />
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
          <div className="px-8 py-6">
            <h2 className="text-xl font-semibold text-white mb-4">All Territories</h2>
            <TerritoryList
              territories={territories}
              onRowClick={setSelectedTerritory}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-8">
          <AssignmentPanel />
        </div>
      )}

      {/* Territory Detail Panel */}
      <TerritoryDetail
        territory={selectedTerritory}
        onClose={() => setSelectedTerritory(null)}
      />
    </div>
  );
}
