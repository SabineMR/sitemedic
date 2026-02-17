/**
 * Platform Analytics Page
 *
 * Cross-organization analytics showing platform-wide metrics,
 * growth trends, and system health.
 */

'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, Calendar, Activity, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AnalyticsData {
  growth: {
    orgs: { current: number; change: number };
    users: { current: number; change: number };
    bookings: { current: number; change: number };
    revenue: { current: number; change: number };
  };
  platformHealth: {
    uptime: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

export default function PlatformAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('get_platform_metrics');

        if (error) throw error;

        if (data && data.length > 0) {
          const row = data[0];
          // Note: Change percentages would require historical data comparison
          // For now showing current values with 0% change
          setAnalytics({
            growth: {
              orgs: { current: Number(row.total_organizations) || 0, change: 0 },
              users: { current: Number(row.total_users) || 0, change: 0 },
              bookings: { current: Number(row.active_bookings) || 0, change: 0 },
              revenue: { current: Number(row.total_revenue) || 0, change: 0 },
            },
            platformHealth: {
              uptime: 99.98, // Placeholder - would need monitoring integration
              avgResponseTime: 145, // Placeholder
              errorRate: 0.02, // Placeholder
            },
          });
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-6">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6">
          <p className="text-purple-300">No analytics data available</p>
        </div>
      </div>
    );
  }

  const GrowthCard = ({
    title,
    value,
    change,
    icon: Icon,
    iconColor,
    prefix = '',
    suffix = '',
  }: {
    title: string;
    value: number;
    change: number;
    icon: any;
    iconColor: string;
    prefix?: string;
    suffix?: string;
  }) => {
    const isPositive = change >= 0;

    return (
      <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:bg-purple-800/40 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        </div>
        <p className="text-purple-300 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">
          {prefix}{value.toLocaleString()}{suffix}
        </p>
        <p className="text-xs text-purple-400 mt-2">vs previous period</p>
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Platform Analytics</h1>
        <p className="text-purple-300">Cross-organization insights and growth metrics</p>
      </div>

      {/* Growth Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Growth Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GrowthCard
            title="Organizations"
            value={analytics.growth.orgs.current}
            change={analytics.growth.orgs.change}
            icon={Users}
            iconColor="bg-purple-600/20 text-purple-400"
          />
          <GrowthCard
            title="Total Users"
            value={analytics.growth.users.current}
            change={analytics.growth.users.change}
            icon={Users}
            iconColor="bg-blue-600/20 text-blue-400"
          />
          <GrowthCard
            title="Bookings"
            value={analytics.growth.bookings.current}
            change={analytics.growth.bookings.change}
            icon={Calendar}
            iconColor="bg-green-600/20 text-green-400"
          />
          <GrowthCard
            title="Revenue"
            value={analytics.growth.revenue.current}
            change={analytics.growth.revenue.change}
            icon={TrendingUp}
            iconColor="bg-yellow-600/20 text-yellow-400"
            prefix="£"
          />
        </div>
      </div>

      {/* Platform Health */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Platform Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Uptime */}
          <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-purple-300 text-sm font-medium">Uptime</p>
                <p className="text-3xl font-bold text-white">{analytics.platformHealth.uptime}%</p>
              </div>
            </div>
            <div className="w-full bg-purple-950/50 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full"
                style={{ width: `${analytics.platformHealth.uptime}%` }}
              ></div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-purple-300 text-sm font-medium">Avg Response Time</p>
                <p className="text-3xl font-bold text-white">{analytics.platformHealth.avgResponseTime}ms</p>
              </div>
            </div>
            <p className="text-xs text-purple-400">Excellent performance</p>
          </div>

          {/* Error Rate */}
          <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-purple-300 text-sm font-medium">Error Rate</p>
                <p className="text-3xl font-bold text-white">{analytics.platformHealth.errorRate}%</p>
              </div>
            </div>
            <p className="text-xs text-purple-400">Well below threshold</p>
          </div>
        </div>
      </div>

      {/* Activity Timeline (Placeholder) */}
      <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { time: '2 hours ago', event: 'New organization "MediCare Partners" joined' },
            { time: '5 hours ago', event: '1,000th booking milestone reached' },
            { time: '1 day ago', event: 'Platform revenue exceeded £450k' },
            { time: '2 days ago', event: 'New organization "Healthcare Solutions" joined' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-3 bg-purple-900/30 rounded-xl">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-white text-sm">{activity.event}</p>
                <p className="text-purple-400 text-xs">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
