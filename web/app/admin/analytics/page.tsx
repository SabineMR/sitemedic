/**
 * Location Tracking Analytics Dashboard
 *
 * Comprehensive analytics for location tracking system performance.
 *
 * SHOWS:
 * - System-wide metrics (pings, events, alerts)
 * - Per-medic reliability scores
 * - Daily activity trends
 * - Geofence performance ratings
 * - Alert type breakdown
 * - Territory heatmap + hiring triggers + coverage gaps (Territory tab)
 * - Auto-assignment success rate + failure breakdown (Assignments tab)
 * - Medic utilisation + OOT bookings + late arrival patterns (Utilisation tab)
 */

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { TerritoryHeatmap, HiringTriggerCards, CoverageGapTable } from '@/components/admin/territory-analytics-charts';
import { AssignmentSuccessChart, FailureBreakdownChart } from '@/components/admin/assignment-analytics-charts';
import { MedicUtilisationTable, OOTBookingsChart, LateArrivalHeatmap } from '@/components/admin/medic-utilisation-charts';
import { useTerritories } from '@/lib/queries/admin/territories';
import { useAutoAssignmentStats, useMedicUtilisation, useOutOfTerritoryBookings, useLateArrivalPatterns } from '@/lib/queries/admin/analytics';
import type { OOTSummary, LateArrivalSummary } from '@/lib/queries/admin/analytics';

const TerritoryMapDynamic = dynamic(
  () => import('@/components/admin/territory-map'),
  { ssr: false, loading: () => <div className="h-[500px] bg-gray-800 rounded-lg animate-pulse" /> }
);

const AdminNearMissHeatMapDynamic = dynamic(
  () => import('@/components/analytics/AdminNearMissHeatMap'),
  { ssr: false, loading: () => <div className="h-[500px] bg-gray-800 rounded-lg animate-pulse" /> }
);

interface SystemMetrics {
  period_start: string;
  period_end: string;
  total_pings: number;
  active_medics: number;
  tracked_bookings: number;
  avg_gps_accuracy_meters: number;
  avg_battery_level: number;
  offline_pings: number;
  offline_percentage: number;
  total_events: number;
  arrivals: number;
  geofence_detections: number;
  geofence_accuracy_percentage: number;
  total_alerts: number;
  critical_alerts: number;
  resolved_alerts: number;
  avg_resolution_time_mins: number;
}

interface MedicAnalytics {
  medic_id: string;
  medic_name: string;
  total_pings: number;
  avg_gps_accuracy: number;
  avg_battery_level: number;
  offline_percentage: number;
  total_arrivals: number;
  geofence_reliability_percentage: number;
  total_alerts: number;
  critical_alerts: number;
  late_arrivals: number;
  reliability_score: number;
}

interface DailyTrend {
  date: string;
  pings: number;
  active_medics: number;
  events: number;
  alerts: number;
}

interface GeofencePerformance {
  site_name: string;
  auto_detection_rate: number;
  total_arrivals: number;
  performance_rating: 'excellent' | 'good' | 'fair' | 'poor';
}

interface AlertSummary {
  alert_type: string;
  alert_severity: string;
  total_count: number;
  resolved_count: number;
  active_count: number;
}

// =============================================================================
// SUB-COMPONENTS FOR NEW TABS
// =============================================================================

function TerritoryTab() {
  const { data: territories = [], isLoading } = useTerritories();
  if (isLoading) return <div className="h-96 bg-gray-800 rounded-lg animate-pulse" />;
  return (
    <div className="space-y-6">
      <TerritoryHeatmap territories={territories} TerritoryMapComponent={TerritoryMapDynamic} />
      <HiringTriggerCards territories={territories} />
      <CoverageGapTable territories={territories} />
    </div>
  );
}

function AssignmentsTab() {
  const { data: stats = [], isLoading } = useAutoAssignmentStats();
  if (isLoading) return <div className="h-96 bg-gray-800 rounded-lg animate-pulse" />;
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Auto-Assignment Success Rate (Last 12 Weeks)</h2>
        <AssignmentSuccessChart data={stats} />
      </div>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Failure Reason Breakdown</h2>
        <FailureBreakdownChart data={stats} />
      </div>
    </div>
  );
}

function UtilisationTab() {
  const { data: utilisation = [], isLoading: loadingUtil } = useMedicUtilisation();
  const { data: oot, isLoading: loadingOOT } = useOutOfTerritoryBookings();
  const { data: lateArrivals, isLoading: loadingLate } = useLateArrivalPatterns();
  const isLoading = loadingUtil || loadingOOT || loadingLate;
  if (isLoading) return <div className="h-96 bg-gray-800 rounded-lg animate-pulse" />;
  const ootData: OOTSummary = oot ?? { bookings: [], total_oot_bookings: 0, total_extra_cost: 0, oot_percentage: 0 };
  const lateData: LateArrivalSummary = lateArrivals ?? { patterns: [], total_late_arrivals: 0, worst_day: 'N/A', worst_medic: 'N/A' };
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Medic Utilisation</h2>
        <MedicUtilisationTable data={utilisation} />
      </div>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Out-of-Territory Bookings</h2>
        <OOTBookingsChart data={ootData} />
      </div>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Late Arrival Patterns</h2>
        <LateArrivalHeatmap data={lateData} />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [medics, setMedics] = useState<MedicAnalytics[]>([]);
  const [trends, setTrends] = useState<DailyTrend[]>([]);
  const [geofences, setGeofences] = useState<GeofencePerformance[]>([]);
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'medics' | 'geofences' | 'alerts' | 'territory' | 'assignments' | 'utilisation' | 'heat-map'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load all analytics views
      const [metricsRes, medicsRes, trendsRes, geofencesRes, alertsRes] = await Promise.all([
        supabase.from('location_tracking_metrics').select('*').single(),
        supabase.from('medic_location_analytics').select('*').order('reliability_score', { ascending: false }),
        supabase.from('daily_location_trends').select('*').order('date', { ascending: false }).limit(30),
        supabase.from('geofence_performance').select('*').order('auto_detection_rate', { ascending: false }),
        supabase.from('alert_type_summary').select('*').order('total_count', { ascending: false }),
      ]);

      if (metricsRes.data) setMetrics(metricsRes.data);
      if (medicsRes.data) setMedics(medicsRes.data);
      if (trendsRes.data) setTrends(trendsRes.data);
      if (geofencesRes.data) setGeofences(geofencesRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRatingBadge = (rating: string) => {
    const colors = {
      excellent: 'bg-green-500/20 text-green-400',
      good: 'bg-blue-500/20 text-blue-400',
      fair: 'bg-yellow-500/20 text-yellow-400',
      poor: 'bg-red-500/20 text-red-400',
    };
    return colors[rating as keyof typeof colors] || colors.fair;
  };

  // New tabs render independently of the legacy metrics loading state
  const isNewTab = activeTab === 'territory' || activeTab === 'assignments' || activeTab === 'utilisation' || activeTab === 'heat-map';

  if (loading && !isNewTab) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading analytics...</div>
      </div>
    );
  }

  if (!metrics && !isNewTab) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Location Tracking Analytics</h1>
        {metrics && (
          <p className="text-gray-400">
            Period: {formatDate(metrics.period_start)} - {formatDate(metrics.period_end)}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 flex-wrap">
        {(['overview', 'medics', 'geofences', 'alerts', 'territory', 'assignments', 'utilisation', 'heat-map'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'heat-map' ? 'Heat Map' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Total Location Pings</div>
              <div className="text-3xl font-bold">{metrics.total_pings.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-2">
                {metrics.offline_percentage}% offline-queued
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Active Medics</div>
              <div className="text-3xl font-bold">{metrics.active_medics}</div>
              <div className="text-sm text-gray-500 mt-2">
                {metrics.tracked_bookings} bookings tracked
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">GPS Accuracy</div>
              <div className="text-3xl font-bold">{metrics.avg_gps_accuracy_meters}m</div>
              <div className="text-sm text-gray-500 mt-2">Average accuracy</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Geofence Detection</div>
              <div className="text-3xl font-bold">{metrics.geofence_accuracy_percentage}%</div>
              <div className="text-sm text-gray-500 mt-2">
                {metrics.geofence_detections} auto-detections
              </div>
            </div>
          </div>

          {/* Activity Chart (Simple Bars) */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Daily Activity Trend (Last 14 Days)</h2>
            <div className="flex items-end gap-2 h-64">
              {trends.slice(0, 14).reverse().map((day) => {
                const maxPings = Math.max(...trends.slice(0, 14).map((t) => t.pings));
                const height = (day.pings / maxPings) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-400 transition"
                      style={{ height: `${height}%` }}
                      title={`${day.pings} pings, ${day.active_medics} medics`}
                    />
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                      {formatDate(day.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts Summary */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Alerts Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">{metrics.total_alerts}</div>
                <div className="text-sm text-gray-400">Total Alerts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{metrics.critical_alerts}</div>
                <div className="text-sm text-gray-400">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{metrics.resolved_alerts}</div>
                <div className="text-sm text-gray-400">Resolved</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medics Tab */}
      {activeTab === 'medics' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Medic
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Pings
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Arrivals
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Geofence %
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Alerts
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    GPS Acc.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {medics.map((medic) => (
                  <tr key={medic.medic_id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">{medic.medic_name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-2xl font-bold ${getScoreColor(medic.reliability_score)}`}>
                        {medic.reliability_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      {medic.total_pings.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">{medic.total_arrivals}</td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      {medic.geofence_reliability_percentage}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={medic.critical_alerts > 0 ? 'text-red-400 font-semibold' : 'text-gray-300'}>
                        {medic.total_alerts}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      {medic.avg_gps_accuracy.toFixed(1)}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Geofences Tab */}
      {activeTab === 'geofences' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Site Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Auto-Detection Rate
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Total Arrivals
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {geofences.map((geofence, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">{geofence.site_name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xl font-semibold">
                        {geofence.auto_detection_rate?.toFixed(1) || 'N/A'}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      {geofence.total_arrivals}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingBadge(
                          geofence.performance_rating
                        )}`}
                      >
                        {geofence.performance_rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Alert Type
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Resolved
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {alerts.map((alert, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {alert.alert_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          alert.alert_severity === 'critical'
                            ? 'bg-red-500'
                            : alert.alert_severity === 'high'
                            ? 'bg-orange-500'
                            : alert.alert_severity === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        } text-white`}
                      >
                        {alert.alert_severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      {alert.total_count}
                    </td>
                    <td className="px-6 py-4 text-center text-green-400">
                      {alert.resolved_count}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={alert.active_count > 0 ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                        {alert.active_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Territory Tab */}
      {activeTab === 'territory' && <TerritoryTab />}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && <AssignmentsTab />}

      {/* Utilisation Tab */}
      {activeTab === 'utilisation' && <UtilisationTab />}

      {/* Heat Map Tab */}
      {activeTab === 'heat-map' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Near-Miss Heat Map (All Organisations)</h2>
            <p className="text-gray-400 text-sm mb-4">
              Geographic distribution of near-miss incidents across all organisations. Colour
              represents organisation, size represents severity.
            </p>
            <div className="h-[500px]">
              <AdminNearMissHeatMapDynamic />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
