/**
 * Platform Revenue Page
 *
 * Shows platform-wide revenue, platform fees collected, and profit metrics.
 * This is critical for tracking SiteMedic business performance.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, DollarSign, Percent, Building2 } from 'lucide-react';

interface RevenueMetrics {
  totalRevenue: number;
  platformFees: number;
  totalBookings: number;
  avgBookingValue: number;
}

interface OrgRevenue {
  org_id: string;
  org_name: string;
  revenue: number;
  platform_fees: number;
  booking_count: number;
}

export default function PlatformRevenuePage() {
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    platformFees: 0,
    totalBookings: 0,
    avgBookingValue: 0,
  });
  const [orgRevenues, setOrgRevenues] = useState<OrgRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    async function fetchRevenueData() {
      const supabase = createClient();

      // TODO: Implement real revenue queries
      // For now, using mock data

      // Calculate date range based on timeframe
      const now = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Mock aggregated revenue data
      // TODO: Replace with real queries:
      // 1. SUM(total) from bookings for totalRevenue
      // 2. SUM(platform_fee) from bookings for platformFees
      // 3. COUNT(*) from bookings for totalBookings
      // 4. GROUP BY org_id for per-org breakdown

      setMetrics({
        totalRevenue: 458900,
        platformFees: 45890, // 10% of total
        totalBookings: 1247,
        avgBookingValue: 368,
      });

      setOrgRevenues([
        {
          org_id: '1',
          org_name: 'Allied Services Group',
          revenue: 185000,
          platform_fees: 18500,
          booking_count: 502,
        },
        {
          org_id: '2',
          org_name: 'ABC Medical Services',
          revenue: 142000,
          platform_fees: 14200,
          booking_count: 385,
        },
        {
          org_id: '3',
          org_name: 'Healthcare Solutions Ltd',
          revenue: 98500,
          platform_fees: 9850,
          booking_count: 267,
        },
        {
          org_id: '4',
          org_name: 'MediCare Partners',
          revenue: 33400,
          platform_fees: 3340,
          booking_count: 93,
        },
      ]);

      setLoading(false);
    }

    fetchRevenueData();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-lg">Loading revenue data...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Revenue</h1>
          <p className="text-purple-300">Track revenue and platform fees across all organizations</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2 bg-purple-800/30 p-1 rounded-xl border border-purple-700/50">
          {(['week', 'month', 'year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                timeframe === period
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-white">£{metrics.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Platform Fees Collected */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Platform Fees</p>
              <p className="text-3xl font-bold text-white">£{metrics.platformFees.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Total Bookings</p>
              <p className="text-3xl font-bold text-white">{metrics.totalBookings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Avg Booking Value */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center">
              <Percent className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Avg Booking Value</p>
              <p className="text-3xl font-bold text-white">£{metrics.avgBookingValue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Organization */}
      <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Revenue by Organization</h2>

        <div className="space-y-4">
          {orgRevenues.map((org) => (
            <div
              key={org.org_id}
              className="bg-purple-900/30 rounded-xl p-4 hover:bg-purple-900/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{org.org_name}</h3>
                    <p className="text-sm text-purple-400">{org.booking_count} bookings</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">£{org.revenue.toLocaleString()}</p>
                  <p className="text-sm text-green-400">+£{org.platform_fees.toLocaleString()} fees</p>
                </div>
              </div>

              {/* Revenue Bar */}
              <div className="w-full bg-purple-950/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-purple-400 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(org.revenue / metrics.totalRevenue) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
