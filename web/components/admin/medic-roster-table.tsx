/**
 * Medic Roster Table Component
 *
 * Displays medic roster with:
 * - Availability calendar and territory assignments
 * - Utilization percentage bars (color-coded)
 * - Performance metrics (star rating, shifts, compliance)
 * - Availability toggle with reason dialog
 * - Stripe onboarding status
 */

'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import {
  MedicWithMetrics,
  useMedics,
  useUpdateMedicAvailability,
  getUtilizationColor,
  getUtilizationTextColor,
} from '@/lib/queries/admin/medics';
import { Star, MapPin, Calendar, AlertCircle } from 'lucide-react';

interface AvailabilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, until?: string) => void;
  medicName: string;
}

function AvailabilityDialog({ isOpen, onClose, onConfirm, medicName }: AvailabilityDialogProps) {
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason, until);
    setReason('');
    setUntil('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">
          Mark {medicName} as Unavailable
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="e.g., Holiday, Sick leave, Training"
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Unavailable Until (optional)
            </label>
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark Unavailable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MedicRosterTable() {
  const { data: medics = [], isLoading } = useMedics();
  const updateAvailability = useUpdateMedicAvailability();

  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [certificationFilter, setCertificationFilter] = useState<'all' | 'confined_space' | 'trauma'>('all');
  const [stripeFilter, setStripeFilter] = useState<'all' | 'active' | 'pending'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMedic, setSelectedMedic] = useState<MedicWithMetrics | null>(null);

  // Debounced search (simplified - in production, use useDebounce hook)
  const filteredMedics = useMemo(() => {
    return medics.filter((medic) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        `${medic.first_name} ${medic.last_name}`.toLowerCase().includes(searchLower) ||
        medic.email.toLowerCase().includes(searchLower) ||
        medic.phone.includes(searchTerm);

      // Availability filter
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && medic.available_for_work) ||
        (availabilityFilter === 'unavailable' && !medic.available_for_work);

      // Certification filter
      const matchesCertification =
        certificationFilter === 'all' ||
        (certificationFilter === 'confined_space' && medic.has_confined_space_cert) ||
        (certificationFilter === 'trauma' && medic.has_trauma_cert);

      // Stripe filter
      const matchesStripe =
        stripeFilter === 'all' ||
        (stripeFilter === 'active' && medic.stripe_onboarding_complete) ||
        (stripeFilter === 'pending' && !medic.stripe_onboarding_complete);

      return matchesSearch && matchesAvailability && matchesCertification && matchesStripe;
    });
  }, [medics, searchTerm, availabilityFilter, certificationFilter, stripeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = medics.length;
    const available = medics.filter((m) => m.available_for_work).length;
    const needsOnboarding = medics.filter((m) => !m.stripe_onboarding_complete).length;
    const highPerformers = medics.filter((m) => m.star_rating >= 4.5).length;
    const totalUtilization = medics.reduce((sum, m) => sum + m.utilization_pct, 0);
    const avgUtilization = total > 0 ? Math.round(totalUtilization / total) : 0;

    return { total, available, needsOnboarding, highPerformers, avgUtilization };
  }, [medics]);

  const handleAvailabilityToggle = (medic: MedicWithMetrics) => {
    if (medic.available_for_work) {
      // Make unavailable - show dialog
      setSelectedMedic(medic);
      setDialogOpen(true);
    } else {
      // Make available - direct toggle
      updateAvailability.mutate({
        medicId: medic.id,
        available: true,
      });
    }
  };

  const handleDialogConfirm = (reason: string, until?: string) => {
    if (selectedMedic) {
      updateAvailability.mutate({
        medicId: selectedMedic.id,
        available: false,
        reason,
        unavailableUntil: until,
      });
    }
    setDialogOpen(false);
    setSelectedMedic(null);
  };

  const columns: ColumnDef<MedicWithMetrics>[] = [
    {
      accessorKey: 'name',
      header: 'Medic',
      cell: ({ row }) => {
        const medic = row.original;
        return (
          <div>
            <div className="font-medium text-white text-sm">
              {medic.first_name} {medic.last_name}
            </div>
            <div className="text-xs text-gray-400">{medic.home_postcode}</div>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                medic.employment_status === 'self_employed'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-purple-500/20 text-purple-400'
              }`}
            >
              {medic.employment_status === 'self_employed' ? 'Self-employed' : 'Umbrella'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ row }) => {
        const medic = row.original;
        return (
          <div className="text-sm">
            <div className="text-gray-300">{medic.email}</div>
            <div className="text-gray-400 text-xs">{medic.phone}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'territories',
      header: 'Territories',
      cell: ({ row }) => {
        const medic = row.original;
        const visible = medic.territory_assignments.slice(0, 3);
        const overflow = medic.territory_assignments.length - 3;

        return (
          <div className="flex flex-wrap gap-1">
            {visible.length > 0 ? (
              <>
                {visible.map((territory, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                      territory.role === 'primary'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    {territory.postcode_sector}
                    <span className="text-[10px]">({territory.role === 'primary' ? 'P' : 'S'})</span>
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="inline-block px-2 py-0.5 text-xs text-gray-400">
                    +{overflow} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-500 text-xs">No territories</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'utilization',
      header: 'Utilization',
      cell: ({ row }) => {
        const medic = row.original;
        const pct = medic.utilization_pct;
        const color = getUtilizationColor(pct);
        const textColor = getUtilizationTextColor(pct);

        return (
          <div className="w-32">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${textColor}`}>{pct}%</span>
            </div>
            <div className="text-xs text-gray-400">
              {medic.completed_bookings_this_week} bookings this week
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'performance',
      header: 'Performance',
      cell: ({ row }) => {
        const medic = row.original;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-medium">{medic.star_rating.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-400">
              {medic.total_shifts_completed} shifts
            </div>
            <div className="text-xs text-gray-400">
              {medic.riddor_compliance_rate.toFixed(0)}% compliance
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'availability',
      header: 'Availability',
      cell: ({ row }) => {
        const medic = row.original;
        return (
          <div>
            <button
              onClick={() => handleAvailabilityToggle(medic)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                medic.available_for_work
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {medic.available_for_work ? '✓ Available' : 'Unavailable'}
            </button>
            {!medic.available_for_work && medic.unavailable_reason && (
              <div className="mt-1 text-xs text-gray-500 max-w-[150px] truncate" title={medic.unavailable_reason}>
                {medic.unavailable_reason}
              </div>
            )}
            {!medic.available_for_work && medic.unavailable_until && (
              <div className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Until {new Date(medic.unavailable_until).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'stripe',
      header: 'Stripe',
      cell: ({ row }) => {
        const medic = row.original;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${
              medic.stripe_onboarding_complete
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {medic.stripe_onboarding_complete ? '✓ Active' : '⚠ Pending'}
          </span>
        );
      },
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const medic = row.original;
        return (
          <div className="flex gap-2">
            <button className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">
              View Details
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredMedics,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading medics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="Total Medics" value={stats.total} color="blue" />
        <StatCard label="Available" value={stats.available} color="green" />
        <StatCard
          label="Needs Onboarding"
          value={stats.needsOnboarding}
          color={stats.needsOnboarding > 0 ? 'yellow' : 'green'}
          highlight={stats.needsOnboarding > 0}
        />
        <StatCard label="High Performers" value={stats.highPerformers} color="purple" subtitle="4.5+ rating" />
        <StatCard
          label="Avg Utilization"
          value={`${stats.avgUtilization}%`}
          color={stats.avgUtilization > 80 ? 'red' : stats.avgUtilization > 50 ? 'yellow' : 'green'}
        />
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <FilterButton
              label="All"
              active={availabilityFilter === 'all'}
              onClick={() => setAvailabilityFilter('all')}
            />
            <FilterButton
              label="Available"
              active={availabilityFilter === 'available'}
              onClick={() => setAvailabilityFilter('available')}
            />
            <FilterButton
              label="Unavailable"
              active={availabilityFilter === 'unavailable'}
              onClick={() => setAvailabilityFilter('unavailable')}
            />
            <FilterButton
              label="Confined Space"
              active={certificationFilter === 'confined_space'}
              onClick={() =>
                setCertificationFilter(certificationFilter === 'confined_space' ? 'all' : 'confined_space')
              }
            />
            <FilterButton
              label="Trauma"
              active={certificationFilter === 'trauma'}
              onClick={() => setCertificationFilter(certificationFilter === 'trauma' ? 'all' : 'trauma')}
            />
            <FilterButton
              label="Stripe Pending"
              active={stripeFilter === 'pending'}
              onClick={() => setStripeFilter(stripeFilter === 'pending' ? 'all' : 'pending')}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700/50">
              <tr>
                {table.getFlatHeaders().map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    No medics found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-700/30 transition-all duration-200">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Availability Dialog */}
      <AvailabilityDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedMedic(null);
        }}
        onConfirm={handleDialogConfirm}
        medicName={selectedMedic ? `${selectedMedic.first_name} ${selectedMedic.last_name}` : ''}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  subtitle,
  highlight = false,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  subtitle?: string;
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
        highlight
          ? 'border-yellow-500/50 ring-2 ring-yellow-500/20 shadow-lg shadow-yellow-500/10'
          : 'border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {subtitle && <div className="text-gray-500 text-xs font-medium">{subtitle}</div>}
    </div>
  );
}

function FilterButton({
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
      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 scale-105'
          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:scale-105'
      }`}
    >
      {label}
    </button>
  );
}
