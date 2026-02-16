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
import CurrencyWithTooltip from '../../components/CurrencyWithTooltip';
import { useAdminOverview, RecentActivity } from '@/lib/queries/admin/overview';
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Activity,
  UserPlus,
  MapPin,
  TrendingUp,
  Mail,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: overview, isLoading, error } = useAdminOverview();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-red-400 text-xl">Failed to load dashboard data</div>
      </div>
    );
  }

  // Ensure overview data exists
  if (!overview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-gray-400 text-xl">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-400 text-sm">
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
            value={overview.activeMedics}
            icon={<Users className="w-5 h-5" />}
            trend="Available for work"
            color="blue"
          />
          <StatCard
            label="Today's Bookings"
            value={overview.todayBookings}
            icon={<Calendar className="w-5 h-5" />}
            trend="Shifts today"
            color="green"
          />
          <StatCard
            label="Pending Bookings"
            value={overview.pendingBookings}
            icon={<Clock className="w-5 h-5" />}
            trend="Awaiting assignment"
            color="yellow"
            highlight={overview.pendingBookings > 0}
          />
          <StatCard
            label="Active Issues"
            value={overview.issuesCount}
            icon={<AlertTriangle className="w-5 h-5" />}
            trend="Require attention"
            color="red"
            highlight={overview.issuesCount > 0}
          />
          <StatCard
            label="Revenue (MTD)"
            value={overview.totalRevenue}
            icon={<DollarSign className="w-5 h-5" />}
            trend="Month to date"
            color="purple"
            currency={true}
          />
          <StatCard
            label="Weekly Payouts"
            value={overview.weeklyPayouts}
            icon={<CreditCard className="w-5 h-5" />}
            trend="Last 7 days"
            color="cyan"
            currency={true}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-800/40">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Recent Activity
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {overview.recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-800/40">
                <h2 className="text-xl font-bold text-white">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <QuickActionButton
                    icon={<Calendar className="w-5 h-5" />}
                    label="New Booking"
                    href="/admin/bookings/new"
                    color="blue"
                  />
                  <QuickActionButton
                    icon={<UserPlus className="w-5 h-5" />}
                    label="Add Medic"
                    href="/admin/medics/new"
                    color="green"
                  />
                  <QuickActionButton
                    icon={<MapPin className="w-5 h-5" />}
                    label="Command Center"
                    href="/admin/command-center"
                    color="purple"
                  />
                  <QuickActionButton
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="View Reports"
                    href="/admin/analytics"
                    color="orange"
                  />
                  <QuickActionButton
                    icon={<Mail className="w-5 h-5" />}
                    label="Send Notification"
                    href="/admin/notifications"
                    color="cyan"
                  />
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-800/40">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Alerts
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {overview.pendingBookings > 0 && (
                    <AlertItem
                      icon={<Clock className="w-5 h-5" />}
                      message={`${overview.pendingBookings} bookings pending assignment`}
                      type="warning"
                    />
                  )}
                  {overview.issuesCount > 0 && (
                    <AlertItem
                      icon={<AlertTriangle className="w-5 h-5" />}
                      message={`${overview.issuesCount} active issues need attention`}
                      type="error"
                    />
                  )}
                  {overview.pendingBookings === 0 && overview.issuesCount === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
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
  icon: React.ReactNode;
  trend: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
  highlight?: boolean;
  currency?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  const iconColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div
      className={`group bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
        highlight
          ? 'border-yellow-500/50 ring-2 ring-yellow-500/20 shadow-lg shadow-yellow-500/10'
          : 'border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
        >
          <span className="text-white">{icon}</span>
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2 tracking-tight">
        {currency && typeof value === 'number' ? (
          <CurrencyWithTooltip amount={value} className="text-3xl font-bold text-white" />
        ) : (
          value
        )}
      </div>
      <div className={`text-xs font-medium ${iconColorClasses[color]}`}>{trend}</div>
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
        return <Calendar className="w-5 h-5" />;
      case 'issue':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medic':
        return <Users className="w-5 h-5" />;
      case 'payment':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getIconBgColor = () => {
    switch (activity.type) {
      case 'booking':
        return 'bg-blue-500/10 text-blue-400';
      case 'issue':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'medic':
        return 'bg-green-500/10 text-green-400';
      case 'payment':
        return 'bg-purple-500/10 text-purple-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (activity.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
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
    <div className="flex items-start gap-3 p-4 rounded-xl hover:bg-gray-700/30 transition-all duration-200 border border-transparent hover:border-gray-700/50 group">
      <div className={`p-2 rounded-lg ${getIconBgColor()} transition-transform duration-200 group-hover:scale-110`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium mb-1">
          {activity.message}
          {activity.type === 'payment' && activity.amount && (
            <>
              {' - '}
              <CurrencyWithTooltip
                amount={activity.amount}
                className="text-white text-sm font-medium"
              />
            </>
          )}
        </p>
        <p className="text-gray-500 text-xs">{activity.timestamp}</p>
      </div>
      {activity.status && (
        <div className={`${getStatusColor()} transition-transform duration-200 group-hover:scale-110`}>
          {getStatusIcon()}
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
  icon: React.ReactNode;
  label: string;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20',
    green: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-lg shadow-green-500/20',
    purple: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-lg shadow-purple-500/20',
    orange: 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-lg shadow-orange-500/20',
    cyan: 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-500/20',
  };

  return (
    <Link href={href}>
      <button
        className={`group w-full flex items-center gap-3 px-5 py-3.5 ${colorClasses[color]} text-white rounded-xl transition-all duration-200 font-medium text-sm hover:scale-105 active:scale-95`}
      >
        <span className="transition-transform duration-200 group-hover:scale-110">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className="text-xs opacity-75 transition-transform duration-200 group-hover:translate-x-1">→</span>
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
  icon: React.ReactNode;
  message: string;
  type: 'warning' | 'error';
}) {
  const bgColor = type === 'error'
    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
    : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20';
  const textColor = type === 'error' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${bgColor} transition-all duration-200 group`}>
      <span className={`${textColor} transition-transform duration-200 group-hover:scale-110`}>{icon}</span>
      <p className={`text-sm font-medium ${textColor} flex-1`}>{message}</p>
    </div>
  );
}
