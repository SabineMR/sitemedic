/**
 * Platform Organizations Page
 *
 * Lists all organizations using SiteMedic platform.
 * Platform admins can view, manage, and add new organizations.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Users, Calendar, TrendingUp, Plus, Search } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  // Add computed metrics
  user_count?: number;
  booking_count?: number;
  revenue?: number;
}

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchOrganizations() {
      const supabase = createClient();

      // Fetch all organizations (platform admin can see all via RLS)
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organizations:', error);
        setLoading(false);
        return;
      }

      // TODO: Add aggregate queries to get user count, booking count, revenue per org
      // For now, using mock data
      const orgsWithMetrics = orgs?.map((org) => ({
        ...org,
        user_count: Math.floor(Math.random() * 100) + 10,
        booking_count: Math.floor(Math.random() * 500) + 50,
        revenue: Math.floor(Math.random() * 50000) + 5000,
      })) || [];

      setOrganizations(orgsWithMetrics);
      setLoading(false);
    }

    fetchOrganizations();
  }, []);

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-lg">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Organizations</h1>
          <p className="text-purple-300">Manage all organizations on the platform</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105">
          <Plus className="w-5 h-5" />
          Add Organization
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-purple-800/30 border border-purple-700/50 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:bg-purple-800/40 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            {/* Organization Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{org.name}</h3>
                  <p className="text-sm text-purple-300">@{org.slug}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                Active
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-purple-300">Users</p>
                </div>
                <p className="text-xl font-bold text-white">{org.user_count}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-purple-300">Bookings</p>
                </div>
                <p className="text-xl font-bold text-white">{org.booking_count}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-purple-300">Revenue</p>
                </div>
                <p className="text-xl font-bold text-white">£{org.revenue?.toLocaleString()}</p>
              </div>
            </div>

            {/* Created Date */}
            <div className="pt-4 border-t border-purple-700/30">
              <p className="text-xs text-purple-400">
                Created: {new Date(org.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrgs.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No organizations found</h3>
          <p className="text-purple-300">
            {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first organization'}
          </p>
        </div>
      )}
    </div>
  );
}
