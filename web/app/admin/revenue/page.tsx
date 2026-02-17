/**
 * Revenue Dashboard - Admin Financial Tracking
 *
 * Purpose: Track platform profitability, territory/medic performance, and cash flow health.
 * Key features:
 * - Revenue trend over time (revenue/payouts/fees)
 * - Territory ranking by revenue
 * - Top earning medics
 * - Cash flow gap warning (when collection lag exceeds safe threshold)
 */

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Banknote, TrendingUp, Users, Building2 } from 'lucide-react';
import { useRevenue, calculateCashFlowGap, type TimeRange } from '@/lib/queries/admin/revenue';
import { CashFlowWarning } from '@/components/admin/cash-flow-warning';
import CurrencyWithTooltip from '@/components/CurrencyWithTooltip';

// Lazy-load Recharts chart components — defers the ~220KB recharts bundle
// until data is ready, improving initial TTI for the Revenue page.
const RevenueTrendChart = dynamic(
  () => import('@/components/admin/revenue-charts').then((m) => ({ default: m.RevenueTrendChart })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[400px] text-gray-400">Loading chart...</div> }
);
const TerritoryRevenueChart = dynamic(
  () => import('@/components/admin/revenue-charts').then((m) => ({ default: m.TerritoryRevenueChart })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[350px] text-gray-400">Loading chart...</div> }
);
const MedicEarningsChart = dynamic(
  () => import('@/components/admin/revenue-charts').then((m) => ({ default: m.MedicEarningsChart })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[350px] text-gray-400">Loading chart...</div> }
);

export default function RevenuePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('last_12_weeks');
  const { data, isLoading, error } = useRevenue(timeRange);

  // Calculate cash flow warning
  const cashFlowWarning = data ? calculateCashFlowGap(data.summary) : null;

  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-red-400">Error loading revenue data: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Banknote className="w-8 h-8 text-blue-500" />
            Revenue
          </h1>
          <p className="text-gray-400 mt-1">
            Track platform fees, medic payouts, and cash flow health
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setTimeRange('last_4_weeks')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeRange === 'last_4_weeks'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            4 Weeks
          </button>
          <button
            onClick={() => setTimeRange('last_12_weeks')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeRange === 'last_12_weeks'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            12 Weeks
          </button>
          <button
            onClick={() => setTimeRange('last_52_weeks')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeRange === 'last_52_weeks'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            52 Weeks
          </button>
        </div>
      </div>

      {/* Cash Flow Warning Banner */}
      {cashFlowWarning && <CashFlowWarning warning={cashFlowWarning} />}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Loading revenue data...
        </div>
      )}

      {/* Summary Stats Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold text-white">
                <CurrencyWithTooltip amount={data.summary.totalRevenue} />
              </p>
            </div>
          </div>

          {/* Platform Fees */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Banknote className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Platform Fees</p>
              <p className="text-3xl font-bold text-white">
                <CurrencyWithTooltip amount={data.summary.totalPlatformFees} />
              </p>
              <p className="text-xs text-gray-500">
                {data.summary.totalRevenue > 0
                  ? ((data.summary.totalPlatformFees / data.summary.totalRevenue) * 100).toFixed(1)
                  : 0}% of revenue
              </p>
            </div>
          </div>

          {/* Total Payouts */}
          <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Total Payouts</p>
              <p className="text-3xl font-bold text-white">
                <CurrencyWithTooltip amount={data.summary.totalPayouts} />
              </p>
            </div>
          </div>

          {/* Active Clients */}
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Active Clients</p>
              <p className="text-3xl font-bold text-white">{data.summary.activeClients}</p>
              <p className="text-xs text-gray-500">
                {data.summary.net30Clients} Net 30 clients
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {data && (
        <div className="space-y-6">
          {/* Revenue Trend Chart */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Revenue Trend</h2>
            <RevenueTrendChart data={data.weeklyTrend} />
          </div>

          {/* Territory and Medic Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Territory Revenue Chart */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Top Territories</h2>
              <TerritoryRevenueChart data={data.territoryBreakdown} />
            </div>

            {/* Medic Earnings Chart */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Top Earning Medics</h2>
              <MedicEarningsChart data={data.medicEarnings} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
