/**
 * Platform Admin Dashboard
 *
 * Main dashboard for SiteMedic platform owners showing cross-org metrics.
 * This is different from /admin which shows org-specific metrics.
 */

'use client';

import { Building2, Users, TrendingUp, Activity } from 'lucide-react';

export default function PlatformDashboard() {
  // TODO: Fetch real platform-wide metrics
  const metrics = {
    totalOrganizations: 12,
    totalUsers: 458,
    totalRevenue: 125450,
    activeBookings: 89,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Platform Dashboard</h1>
        <p className="text-purple-300">Overview of all organizations using SiteMedic</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Organizations */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:bg-purple-800/40 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Organizations</p>
              <p className="text-3xl font-bold text-white">{metrics.totalOrganizations}</p>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:bg-purple-800/40 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-white">{metrics.totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:bg-purple-800/40 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Platform Revenue</p>
              <p className="text-3xl font-bold text-white">£{metrics.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Active Bookings */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:bg-purple-800/40 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Active Bookings</p>
              <p className="text-3xl font-bold text-white">{metrics.activeBookings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105">
            View All Organizations
          </button>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105">
            Revenue Report
          </button>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105">
            System Settings
          </button>
        </div>
      </div>
    </div>
  );
}
