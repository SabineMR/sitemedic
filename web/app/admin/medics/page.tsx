/**
 * Admin Medics Page
 *
 * Display all medics in the system with their qualifications, availability,
 * Stripe onboarding status, and performance metrics.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Medic {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  home_postcode: string;
  has_confined_space_cert: boolean;
  has_trauma_cert: boolean;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  employment_status: 'self_employed' | 'umbrella';
  star_rating: number;
  total_shifts_completed: number;
  total_shifts_cancelled: number;
  riddor_compliance_rate: number;
  available_for_work: boolean;
  unavailable_reason: string | null;
  created_at: string;
}

export default function MedicsPage() {
  const [medics, setMedics] = useState<Medic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMedics();
  }, []);

  const loadMedics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medics')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setMedics(data || []);
    } catch (error) {
      console.error('Error loading medics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter medics based on availability and search
  const filteredMedics = medics.filter((medic) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'available' && medic.available_for_work) ||
      (filter === 'unavailable' && !medic.available_for_work);

    const matchesSearch =
      searchTerm === '' ||
      `${medic.first_name} ${medic.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medic.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medic.phone.includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  // Stats
  const stats = {
    total: medics.length,
    available: medics.filter((m) => m.available_for_work).length,
    needsOnboarding: medics.filter((m) => !m.stripe_onboarding_complete).length,
    highPerformers: medics.filter((m) => m.star_rating >= 4.5).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading medics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Medics</h1>
            <p className="text-gray-400">Manage your medic roster and qualifications</p>
          </div>
          <Link
            href="/admin/medics/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            ➕ Add Medic
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total Medics" value={stats.total} icon="👨‍⚕️" color="blue" />
          <StatCard
            label="Available"
            value={stats.available}
            icon="✓"
            color="green"
            subtitle={`${stats.total - stats.available} unavailable`}
          />
          <StatCard
            label="Needs Onboarding"
            value={stats.needsOnboarding}
            icon="⚠️"
            color={stats.needsOnboarding > 0 ? 'yellow' : 'green'}
            highlight={stats.needsOnboarding > 0}
          />
          <StatCard
            label="High Performers"
            value={stats.highPerformers}
            icon="⭐"
            color="purple"
            subtitle="4.5+ rating"
          />
        </div>

        {/* Filters & Search */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <FilterButton
                label="All"
                count={medics.length}
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              />
              <FilterButton
                label="Available"
                count={stats.available}
                active={filter === 'available'}
                onClick={() => setFilter('available')}
              />
              <FilterButton
                label="Unavailable"
                count={stats.total - stats.available}
                active={filter === 'unavailable'}
                onClick={() => setFilter('unavailable')}
              />
            </div>
          </div>
        </div>

        {/* Medics Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Medic
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Certifications
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Stripe
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredMedics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No medics found
                    </td>
                  </tr>
                ) : (
                  filteredMedics.map((medic) => (
                    <MedicRow key={medic.id} medic={medic} />
                  ))
                )}
              </tbody>
            </table>
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
  color,
  subtitle,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  subtitle?: string;
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-green-600 to-green-700',
    yellow: 'from-yellow-600 to-yellow-700',
    purple: 'from-purple-600 to-purple-700',
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
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtitle && <div className="text-gray-500 text-xs">{subtitle}</div>}
    </div>
  );
}

/**
 * Filter Button Component
 */
function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-lg font-medium transition ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label} ({count})
    </button>
  );
}

/**
 * Medic Row Component
 */
function MedicRow({ medic }: { medic: Medic }) {
  const fullName = `${medic.first_name} ${medic.last_name}`;

  return (
    <tr className="hover:bg-gray-700/50 transition">
      {/* Medic Info */}
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-white">{fullName}</div>
          <div className="text-sm text-gray-400">{medic.home_postcode}</div>
        </div>
      </td>

      {/* Contact */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="text-gray-300">{medic.email}</div>
          <div className="text-gray-400">{medic.phone}</div>
        </div>
      </td>

      {/* Certifications */}
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {medic.has_confined_space_cert && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
              Confined Space
            </span>
          )}
          {medic.has_trauma_cert && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
              Trauma
            </span>
          )}
          {!medic.has_confined_space_cert && !medic.has_trauma_cert && (
            <span className="text-gray-500 text-sm">None</span>
          )}
        </div>
      </td>

      {/* Performance */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-yellow-400">⭐</span>
            <span className="text-white font-medium">{medic.star_rating.toFixed(2)}</span>
          </div>
          <div className="text-gray-400 text-xs">
            {medic.total_shifts_completed} shifts • {medic.riddor_compliance_rate.toFixed(0)}%
            compliance
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        {medic.available_for_work ? (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
            ✓ Available
          </span>
        ) : (
          <div>
            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full font-medium">
              Unavailable
            </span>
            {medic.unavailable_reason && (
              <div className="text-xs text-gray-500 mt-1">{medic.unavailable_reason}</div>
            )}
          </div>
        )}
      </td>

      {/* Stripe Status */}
      <td className="px-6 py-4">
        {medic.stripe_onboarding_complete ? (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
            ✓ Active
          </span>
        ) : (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full font-medium">
            ⚠️ Pending
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <Link
          href={`/admin/medics/${medic.id}`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View Details →
        </Link>
      </td>
    </tr>
  );
}
