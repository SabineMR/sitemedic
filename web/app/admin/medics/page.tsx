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
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Shield,
  Heart,
  CreditCard,
} from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              Medics
            </h1>
            <p className="text-gray-400 text-sm">Manage your medic roster and qualifications</p>
          </div>
          <Link
            href="/admin/medics/new"
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            Add Medic
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Total Medics"
            value={stats.total}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Available"
            value={stats.available}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            subtitle={`${stats.total - stats.available} unavailable`}
          />
          <StatCard
            label="Needs Onboarding"
            value={stats.needsOnboarding}
            icon={<AlertTriangle className="w-5 h-5" />}
            color={stats.needsOnboarding > 0 ? 'yellow' : 'green'}
            highlight={stats.needsOnboarding > 0}
          />
          <StatCard
            label="High Performers"
            value={stats.highPerformers}
            icon={<Star className="w-5 h-5" />}
            color="purple"
            subtitle="4.5+ rating"
          />
        </div>

        {/* Filters & Search */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6 mb-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Medic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Certifications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Stripe
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  subtitle?: string;
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
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
      <div className="text-3xl font-bold text-white mb-2 tracking-tight">{value}</div>
      {subtitle && <div className="text-gray-500 text-xs font-medium">{subtitle}</div>}
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
      className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 scale-105'
          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:scale-105'
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
    <tr className="hover:bg-gray-700/30 transition-all duration-200 group">
      {/* Medic Info */}
      <td className="px-6 py-3">
        <div className="font-medium text-white text-sm">
          {fullName} <span className="text-gray-500 font-normal">• {medic.home_postcode}</span>
        </div>
      </td>

      {/* Contact */}
      <td className="px-6 py-3">
        <div className="text-sm text-gray-300">
          {medic.email}
          <br />
          {medic.phone}
        </div>
      </td>

      {/* Certifications */}
      <td className="px-6 py-3">
        <div className="flex gap-2">
          {medic.has_confined_space_cert && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
              Confined Space
            </span>
          )}
          {medic.has_trauma_cert && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
              Trauma
            </span>
          )}
          {!medic.has_confined_space_cert && !medic.has_trauma_cert && (
            <span className="text-gray-500 text-xs">None</span>
          )}
        </div>
      </td>

      {/* Performance */}
      <td className="px-6 py-3">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-yellow-400">⭐</span>
          <span className="text-white font-medium">{medic.star_rating.toFixed(2)}</span>
        </div>
        <div className="text-gray-400 text-xs mt-0.5">
          {medic.total_shifts_completed} shifts • {medic.riddor_compliance_rate.toFixed(0)}%
          compliance
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-3">
        {medic.available_for_work ? (
          <span className="inline-flex items-center px-2.5 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
            ✓ Available
          </span>
        ) : (
          <div>
            <span className="inline-flex items-center px-2.5 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
              Unavailable
            </span>
            {medic.unavailable_reason && (
              <div className="text-xs text-gray-500 mt-1">{medic.unavailable_reason}</div>
            )}
          </div>
        )}
      </td>

      {/* Stripe Status */}
      <td className="px-6 py-3">
        {medic.stripe_onboarding_complete ? (
          <span className="inline-flex items-center px-2.5 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
            ✓ Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
            ⚠️ Pending
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-6 py-3 text-right">
        <Link
          href={`/admin/medics/${medic.id}`}
          className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors duration-150"
        >
          View Details →
        </Link>
      </td>
    </tr>
  );
}
