/**
 * Admin Bookings Page
 *
 * Display all bookings with client, medic, site details, pricing, and status.
 * Includes filtering by status and search functionality.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CurrencyWithTooltip from '@/components/CurrencyWithTooltip';
import Link from 'next/link';

interface Booking {
  id: string;
  client_id: string;
  medic_id: string | null;
  site_name: string;
  site_address: string;
  site_postcode: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_hours: number;
  base_rate: number;
  urgency_premium_percent: number;
  travel_surcharge: number;
  subtotal: number;
  vat: number;
  total: number;
  platform_fee: number;
  medic_payout: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  auto_matched: boolean;
  requires_manual_approval: boolean;
  created_at: string;
  // Joined data
  clients?: {
    company_name: string;
  };
  medics?: {
    first_name: string;
    last_name: string;
  } | null;
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          *,
          clients (
            company_name
          ),
          medics (
            first_name,
            last_name
          )
        `
        )
        .order('shift_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    // Search filter
    const matchesSearch =
      searchTerm === '' ||
      booking.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.site_postcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.medics
        ? `${booking.medics.first_name} ${booking.medics.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : false);

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.shift_date);
    bookingDate.setHours(0, 0, 0, 0);

    const matchesDate =
      dateFilter === 'all' ||
      (dateFilter === 'today' && bookingDate.getTime() === today.getTime()) ||
      (dateFilter === 'upcoming' && bookingDate >= today) ||
      (dateFilter === 'past' && bookingDate < today);

    return matchesStatus && matchesSearch && matchesDate;
  });

  // Calculate stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    inProgress: bookings.filter((b) => b.status === 'in_progress').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    needsApproval: bookings.filter((b) => b.requires_manual_approval && b.status === 'pending')
      .length,
    totalRevenue: bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.total, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Bookings</h1>
            <p className="text-gray-400">Manage all medic shift bookings and assignments</p>
          </div>
          <Link
            href="/admin/bookings/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            ➕ New Booking
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard
            label="Pending"
            value={stats.pending}
            color="yellow"
            highlight={stats.pending > 0}
          />
          <StatCard label="Confirmed" value={stats.confirmed} color="green" />
          <StatCard label="In Progress" value={stats.inProgress} color="cyan" />
          <StatCard label="Completed" value={stats.completed} color="purple" />
          <StatCard label="Cancelled" value={stats.cancelled} color="red" />
          <StatCard
            label="Needs Approval"
            value={stats.needsApproval}
            color="yellow"
            highlight={stats.needsApproval > 0}
          />
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 mb-8 border border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-100 text-sm font-medium mb-1">
                Total Revenue (Completed)
              </div>
              <div className="text-3xl font-bold text-white">
                <CurrencyWithTooltip amount={stats.totalRevenue} className="text-3xl font-bold" />
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-4xl">💰</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search by site, postcode, client, or medic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-2">
                <span className="text-gray-400 text-sm font-medium py-2">Status:</span>
                <StatusFilterButton
                  label="All"
                  count={bookings.length}
                  active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
                <StatusFilterButton
                  label="Pending"
                  count={stats.pending}
                  active={statusFilter === 'pending'}
                  onClick={() => setStatusFilter('pending')}
                  color="yellow"
                />
                <StatusFilterButton
                  label="Confirmed"
                  count={stats.confirmed}
                  active={statusFilter === 'confirmed'}
                  onClick={() => setStatusFilter('confirmed')}
                  color="green"
                />
                <StatusFilterButton
                  label="In Progress"
                  count={stats.inProgress}
                  active={statusFilter === 'in_progress'}
                  onClick={() => setStatusFilter('in_progress')}
                  color="cyan"
                />
                <StatusFilterButton
                  label="Completed"
                  count={stats.completed}
                  active={statusFilter === 'completed'}
                  onClick={() => setStatusFilter('completed')}
                  color="purple"
                />
                <StatusFilterButton
                  label="Cancelled"
                  count={stats.cancelled}
                  active={statusFilter === 'cancelled'}
                  onClick={() => setStatusFilter('cancelled')}
                  color="red"
                />
              </div>

              <div className="border-l border-gray-700 mx-2"></div>

              <div className="flex gap-2">
                <span className="text-gray-400 text-sm font-medium py-2">Date:</span>
                <DateFilterButton
                  label="All"
                  active={dateFilter === 'all'}
                  onClick={() => setDateFilter('all')}
                />
                <DateFilterButton
                  label="Today"
                  active={dateFilter === 'today'}
                  onClick={() => setDateFilter('today')}
                />
                <DateFilterButton
                  label="Upcoming"
                  active={dateFilter === 'upcoming'}
                  onClick={() => setDateFilter('upcoming')}
                />
                <DateFilterButton
                  label="Past"
                  active={dateFilter === 'past'}
                  onClick={() => setDateFilter('past')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-gray-400 text-sm mb-4">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>

        {/* Bookings Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Medic
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Requirements
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => <BookingRow key={booking.id} booking={booking} />)
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
  color,
  highlight = false,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
  highlight?: boolean;
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
      className={`bg-gray-800 rounded-lg p-4 border ${
        highlight ? 'border-yellow-500/50 ring-2 ring-yellow-500/20' : 'border-gray-700'
      }`}
    >
      <div className="text-gray-400 text-xs font-medium mb-1">{label}</div>
      <div
        className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br ${colorClasses[color]}`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Status Filter Button
 */
function StatusFilterButton({
  label,
  count,
  active,
  onClick,
  color = 'blue',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
}) {
  const activeColors = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    yellow: 'bg-yellow-600 text-white',
    red: 'bg-red-600 text-white',
    purple: 'bg-purple-600 text-white',
    cyan: 'bg-cyan-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
        active ? activeColors[color] : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label} ({count})
    </button>
  );
}

/**
 * Date Filter Button
 */
function DateFilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Booking Row Component
 */
function BookingRow({ booking }: { booking: Booking }) {
  const medicName = booking.medics
    ? `${booking.medics.first_name} ${booking.medics.last_name}`
    : 'Unassigned';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: '⏳ Pending' },
      confirmed: { color: 'bg-green-500/20 text-green-400', label: '✓ Confirmed' },
      in_progress: { color: 'bg-cyan-500/20 text-cyan-400', label: '🔵 In Progress' },
      completed: { color: 'bg-purple-500/20 text-purple-400', label: '✓ Completed' },
      cancelled: { color: 'bg-red-500/20 text-red-400', label: '✗ Cancelled' },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <tr className="hover:bg-gray-700/50 transition">
      {/* Date & Time */}
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-white">{formatDate(booking.shift_date)}</div>
          <div className="text-sm text-gray-400">
            {formatTime(booking.shift_start_time)} - {formatTime(booking.shift_end_time)}
          </div>
          <div className="text-xs text-gray-500">{booking.shift_hours}h</div>
        </div>
      </td>

      {/* Site */}
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-white">{booking.site_name}</div>
          <div className="text-sm text-gray-400">{booking.site_postcode}</div>
        </div>
      </td>

      {/* Client */}
      <td className="px-6 py-4">
        <div className="text-sm text-gray-300">{booking.clients?.company_name || 'N/A'}</div>
      </td>

      {/* Medic */}
      <td className="px-6 py-4">
        <div>
          <div className={`text-sm ${booking.medic_id ? 'text-white' : 'text-yellow-400'}`}>
            {medicName}
          </div>
          {booking.auto_matched && (
            <div className="text-xs text-blue-400">Auto-matched</div>
          )}
          {booking.requires_manual_approval && (
            <div className="text-xs text-yellow-400">⚠️ Needs approval</div>
          )}
        </div>
      </td>

      {/* Requirements */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          {booking.confined_space_required && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium inline-block w-fit">
              Confined Space
            </span>
          )}
          {booking.trauma_specialist_required && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium inline-block w-fit">
              Trauma
            </span>
          )}
          {!booking.confined_space_required && !booking.trauma_specialist_required && (
            <span className="text-gray-500 text-xs">Standard</span>
          )}
          {booking.urgency_premium_percent > 0 && (
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium inline-block w-fit">
              +{booking.urgency_premium_percent}% urgent
            </span>
          )}
        </div>
      </td>

      {/* Pricing */}
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-white">
            <CurrencyWithTooltip amount={booking.total} />
          </div>
          <div className="text-xs text-gray-400">
            Fee: <CurrencyWithTooltip amount={booking.platform_fee} />
          </div>
          <div className="text-xs text-gray-400">
            Medic: <CurrencyWithTooltip amount={booking.medic_payout} />
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <Link
          href={`/admin/bookings/${booking.id}`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View Details →
        </Link>
      </td>
    </tr>
  );
}
