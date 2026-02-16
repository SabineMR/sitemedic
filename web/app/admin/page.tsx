/**
 * Admin Dashboard - Overview
 *
 * Main admin dashboard showing key metrics, recent activity, and quick actions.
 * Works with the sidebar layout for easy navigation.
 *
 * CURRENCY DISPLAY STANDARD:
 * - ALL GBP amounts MUST use CurrencyWithTooltip component
 * - This automatically shows USD conversion on hover
 * - See README.md in this directory for full guidelines
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CurrencyWithTooltip from '../../components/CurrencyWithTooltip';

interface DashboardStats {
  activeMedics: number;
  todayBookings: number;
  pendingBookings: number;
  issuesCount: number;
  totalRevenue: number; // IMPORTANT: Display with currency={true} in StatCard for USD conversion
  weeklyPayouts: number; // IMPORTANT: Display with currency={true} in StatCard for USD conversion
}

interface RecentActivity {
  id: string;
  type: 'booking' | 'issue' | 'medic' | 'payment';
  message: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeMedics: 0,
    todayBookings: 0,
    pendingBookings: 0,
    issuesCount: 0,
    totalRevenue: 0,
    weeklyPayouts: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // TODO: Replace with actual Supabase queries
    setStats({
      activeMedics: 12,
      todayBookings: 8,
      pendingBookings: 3,
      issuesCount: 2,
      totalRevenue: 8450,
      weeklyPayouts: 3200,
    });

    setRecentActivity([
      {
        id: '1',
        type: 'booking',
        message: 'New booking from ABC Construction - London E1',
        timestamp: '5 minutes ago',
        status: 'success',
      },
      {
        id: '2',
        type: 'issue',
        message: 'Low battery alert for Sarah Johnson',
        timestamp: '12 minutes ago',
        status: 'warning',
      },
      {
        id: '3',
        type: 'medic',
        message: 'Mike Williams completed shift at City Tower',
        timestamp: '1 hour ago',
        status: 'success',
      },
      {
        id: '4',
        type: 'payment',
        message: 'Weekly payout processed - £3,200',
        timestamp: '2 hours ago',
        status: 'success',
      },
      {
        id: '5',
        type: 'booking',
        message: 'Booking cancellation - XYZ Development',
        timestamp: '3 hours ago',
        status: 'error',
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-gray-400">
            Welcome back! Here's what's happening with SiteMedic today.
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatCard
            label="Active Medics"
            value={stats.activeMedics}
            icon="👨‍⚕️"
            trend="+2 from yesterday"
            color="blue"
          />
          <StatCard
            label="Today's Bookings"
            value={stats.todayBookings}
            icon="📅"
            trend="3 completed"
            color="green"
          />
          <StatCard
            label="Pending Bookings"
            value={stats.pendingBookings}
            icon="⏳"
            trend="Awaiting assignment"
            color="yellow"
            highlight={stats.pendingBookings > 0}
          />
          <StatCard
            label="Active Issues"
            value={stats.issuesCount}
            icon="⚠️"
            trend="Require attention"
            color="red"
            highlight={stats.issuesCount > 0}
          />
          <StatCard
            label="Revenue (MTD)"
            value={stats.totalRevenue}
            icon="💰"
            trend="Month to date"
            color="purple"
            currency={true}
          />
          <StatCard
            label="Weekly Payouts"
            value={stats.weeklyPayouts}
            icon="💳"
            trend="Last payout"
            color="cyan"
            currency={true}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <QuickActionButton
                    icon="➕"
                    label="New Booking"
                    href="/admin/bookings/new"
                    color="blue"
                  />
                  <QuickActionButton
                    icon="👤"
                    label="Add Medic"
                    href="/admin/medics/new"
                    color="green"
                  />
                  <QuickActionButton
                    icon="🗺️"
                    label="Command Center"
                    href="/admin/command-center"
                    color="purple"
                  />
                  <QuickActionButton
                    icon="📊"
                    label="View Reports"
                    href="/admin/analytics"
                    color="orange"
                  />
                  <QuickActionButton
                    icon="📧"
                    label="Send Notification"
                    href="/admin/notifications"
                    color="cyan"
                  />
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mt-6">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Alerts</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {stats.pendingBookings > 0 && (
                    <AlertItem
                      icon="⏳"
                      message={`${stats.pendingBookings} bookings pending assignment`}
                      type="warning"
                    />
                  )}
                  {stats.issuesCount > 0 && (
                    <AlertItem
                      icon="⚠️"
                      message={`${stats.issuesCount} active issues need attention`}
                      type="error"
                    />
                  )}
                  {stats.pendingBookings === 0 && stats.issuesCount === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No alerts at this time
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  icon,
  trend,
  color,
  highlight = false,
  currency = false,
}: {
  label: string;
  value: string | number;
  icon: string;
  trend: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
  highlight?: boolean;
  currency?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-green-600 to-green-700',
    yellow: 'from-yellow-600 to-yellow-700',
    red: 'from-red-600 to-red-700',
    purple: 'from-purple-600 to-purple-700',
    cyan: 'from-cyan-600 to-cyan-700',
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-6 border ${
        highlight ? 'border-yellow-500/50 ring-2 ring-yellow-500/20' : 'border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}
        >
          <span className="text-xl">{icon}</span>
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">
        {currency && typeof value === 'number' ? (
          <CurrencyWithTooltip amount={value} className="text-3xl font-bold text-white" />
        ) : (
          value
        )}
      </div>
      <div className="text-gray-500 text-xs">{trend}</div>
    </div>
  );
}

/**
 * Activity Item Component
 */
function ActivityItem({ activity }: { activity: RecentActivity }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'booking':
        return '📅';
      case 'issue':
        return '⚠️';
      case 'medic':
        return '👨‍⚕️';
      case 'payment':
        return '💳';
      default:
        return '•';
    }
  };

  const getStatusColor = () => {
    switch (activity.status) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition">
      <div className="text-2xl mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <p className="text-white text-sm font-medium mb-1">{activity.message}</p>
        <p className="text-gray-500 text-xs">{activity.timestamp}</p>
      </div>
      {activity.status && (
        <div className={`text-xs font-medium ${getStatusColor()}`}>
          {activity.status === 'success' && '✓'}
          {activity.status === 'warning' && '!'}
          {activity.status === 'error' && '✗'}
        </div>
      )}
    </div>
  );
}

/**
 * Quick Action Button Component
 */
function QuickActionButton({
  icon,
  label,
  href,
  color,
}: {
  icon: string;
  label: string;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    cyan: 'bg-cyan-600 hover:bg-cyan-700',
  };

  return (
    <Link href={href}>
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 ${colorClasses[color]} text-white rounded-lg transition font-medium text-sm`}
      >
        <span className="text-xl">{icon}</span>
        <span>{label}</span>
        <span className="ml-auto text-xs opacity-75">→</span>
      </button>
    </Link>
  );
}

/**
 * Alert Item Component
 */
function AlertItem({
  icon,
  message,
  type,
}: {
  icon: string;
  message: string;
  type: 'warning' | 'error';
}) {
  const bgColor = type === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30';
  const textColor = type === 'error' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${bgColor}`}>
      <span className="text-xl">{icon}</span>
      <p className={`text-sm font-medium ${textColor} flex-1`}>{message}</p>
    </div>
  );
}
