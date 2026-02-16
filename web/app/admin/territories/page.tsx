/**
 * Territory Coverage Page
 *
 * Visual oversight of geographic coverage with color-coded map,
 * coverage gap alerts, and territory utilization table.
 */

'use client';

import dynamic from 'next/dynamic';
import { useTerritories, calculateCoverageGaps } from '@/lib/queries/admin/territories';
import TerritoryList from '@/components/admin/territory-list';
import { Map, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Calculate coverage gaps
  const coverageGaps = calculateCoverageGaps(territories);

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load territories. Please try again later.
          </AlertDescription>
        </Alert>
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

      {/* Coverage Gap Alerts */}
      {coverageGaps.length > 0 && (
        <div className="px-8 pt-6 space-y-3">
          {coverageGaps.map((gap) => (
            <Alert
              key={gap.territory_id}
              variant={gap.severity === 'critical' ? 'destructive' : 'default'}
              className={
                gap.severity === 'warning'
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : ''
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">{gap.postcode_sector} ({gap.region})</span>
                : {gap.rejected_bookings}/{gap.total_bookings} bookings rejected (
                {gap.rejection_rate.toFixed(1)}%). Consider assigning additional medics.
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

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
