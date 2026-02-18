/**
 * Compliance & Incident Trends Page - Analytics
 *
 * Shows org-level compliance score trend (line chart, 12 months) and
 * incident frequency trend (area chart, treatments + near-misses, 12 months).
 *
 * Both charts are lazy-loaded with ssr: false (Recharts requires browser APIs).
 * AnalyticsSubNav provides navigation back to the Heat Map page.
 */

'use client';

import dynamic from 'next/dynamic';
import { AnalyticsSubNav } from '@/components/analytics/AnalyticsSubNav';

const ComplianceScoreChart = dynamic(
  () =>
    import('@/components/analytics/ComplianceScoreChart').then((m) => ({
      default: m.ComplianceScoreChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[350px] bg-gray-800 animate-pulse rounded-lg" />,
  }
);

const IncidentFrequencyChart = dynamic(
  () =>
    import('@/components/analytics/IncidentFrequencyChart').then((m) => ({
      default: m.IncidentFrequencyChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[350px] bg-gray-800 animate-pulse rounded-lg" />,
  }
);

export default function CompliancePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance &amp; Incident Trends</h1>
        <p className="text-gray-400 mt-1">
          Weekly compliance scores and incident frequency over the last 12 months
        </p>
      </div>

      {/* Analytics sub-navigation */}
      <AnalyticsSubNav />

      {/* Compliance Score Trend */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-1">
          Compliance Score Trend (Last 12 Months)
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Weekly scores from 0–100. Amber threshold at 70, red threshold at 40.
        </p>
        <ComplianceScoreChart />
      </div>

      {/* Incident Frequency */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-1">
          Incident Frequency (Last 12 Months)
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Weekly counts of treatments and near-misses logged by your medics.
        </p>
        <IncidentFrequencyChart />
      </div>
    </div>
  );
}
