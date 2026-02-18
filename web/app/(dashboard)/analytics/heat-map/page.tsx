/**
 * Heat Map Page - Analytics
 *
 * Org-level near-miss geographic heat map for site managers.
 * Displays CircleMarker incidents clustered by GPS location to identify
 * high-risk areas requiring targeted safety interventions.
 *
 * NearMissHeatMap uses leaflet (browser-only) — imported with ssr: false.
 */

'use client';

import dynamic from 'next/dynamic';
import { AnalyticsSubNav } from '@/components/analytics/AnalyticsSubNav';

const NearMissHeatMap = dynamic(
  () => import('@/components/analytics/NearMissHeatMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-gray-900 rounded-xl animate-pulse" />
    ),
  }
);

export default function HeatMapPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Near-Miss Heat Map</h1>
        <p className="text-gray-400 mt-1">Geographic distribution of near-miss incidents</p>
      </div>

      {/* Analytics sub-navigation */}
      <AnalyticsSubNav />

      {/* Map container */}
      <div className="h-[500px] rounded-xl overflow-hidden">
        <NearMissHeatMap />
      </div>
    </div>
  );
}
