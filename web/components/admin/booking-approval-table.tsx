/**
 * Booking Approval Table
 *
 * Admin table with row selection, bulk approve/reject, and medic reassignment.
 * Uses TanStack Table for row selection and optimistic updates for instant feedback.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  useBookings,
  useApproveBookings,
  useRejectBookings,
  useReassignBooking,
  useAvailableMedics,
  type BookingWithRelations,
} from '@/lib/queries/admin/bookings';
import { useQueryClient } from '@tanstack/react-query';
import { BulkActionToolbar } from './bulk-action-toolbar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OutOfTerritoryApproval } from './out-of-territory-approval';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import CurrencyWithTooltip from '@/components/CurrencyWithTooltip';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreVertical,
  ArrowUpDown,
  Activity,
} from 'lucide-react';

interface BookingApprovalTableProps {
  initialData?: BookingWithRelations[];
}

export function BookingApprovalTable({ initialData }: BookingApprovalTableProps) {
  const { data: bookings = [], isLoading } = useBookings(initialData);
  const approveMutation = useApproveBookings();
  const rejectMutation = useRejectBookings();
  const reassignMutation = useReassignBooking();
  const queryClient = useQueryClient();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [needsApprovalFilter, setNeedsApprovalFilter] = useState(false);

  // Out-of-territory approval state
  const [selectedOOTBooking, setSelectedOOTBooking] = useState<string | null>(null);

  // Reassign dialog state
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedBookingForReassign, setSelectedBookingForReassign] = useState<BookingWithRelations | null>(
    null
  );
  const [newMedicId, setNewMedicId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch available medics when reassign dialog opens
  const { data: availableMedics = [] } = useAvailableMedics(
    selectedBookingForReassign?.shift_date || ''
  );

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter bookings based on status, date, and needs approval
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      filtered = filtered.filter((b) => {
        const bookingDate = new Date(b.shift_date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === today.getTime();
      });
    } else if (dateFilter === 'upcoming') {
      filtered = filtered.filter((b) => {
        const bookingDate = new Date(b.shift_date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate >= today;
      });
    } else if (dateFilter === 'past') {
      filtered = filtered.filter((b) => {
        const bookingDate = new Date(b.shift_date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate < today;
      });
    }

    // Needs approval filter
    if (needsApprovalFilter) {
      filtered = filtered.filter((b) => b.requires_manual_approval && b.status === 'pending');
    }

    return filtered;
  }, [bookings, statusFilter, dateFilter, needsApprovalFilter]);

  // Column definitions
  const columns = useMemo<ColumnDef<BookingWithRelations>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'shift_date',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-gray-400 hover:text-white"
          >
            Date & Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const booking = row.original;
          const date = new Date(booking.shift_date);
          const formattedDate = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const startTime = booking.shift_start_time.substring(0, 5);
          const endTime = booking.shift_end_time.substring(0, 5);

          return (
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formattedDate}
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {startTime} - {endTime}
              </div>
              <div className="text-xs text-gray-500">{booking.shift_hours}h</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'site_name',
        header: 'Site',
        cell: ({ row }) => {
          const booking = row.original;
          return (
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {booking.site_name}
              </div>
              <div className="text-sm text-gray-400">{booking.site_postcode}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'clients.company_name',
        header: 'Client',
        cell: ({ row }) => (
          <div className="text-sm text-gray-300">{row.original.clients?.company_name || 'N/A'}</div>
        ),
      },
      {
        accessorKey: 'medic_id',
        header: 'Medic',
        cell: ({ row }) => {
          const booking = row.original;
          const medicName = booking.medics
            ? `${booking.medics.first_name} ${booking.medics.last_name}`
            : 'Unassigned';

          return (
            <div>
              <div
                className={`text-sm flex items-center gap-2 ${
                  booking.medic_id ? 'text-white' : 'text-yellow-400'
                }`}
              >
                <Users className="w-4 h-4" />
                {medicName}
              </div>
              {booking.auto_matched && (
                <div className="text-xs text-blue-400 mt-1">Auto-matched</div>
              )}
              {booking.requires_manual_approval && (
                <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/30 mt-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Needs approval
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: 'requirements',
        header: 'Requirements',
        cell: ({ row }) => {
          const booking = row.original;
          return (
            <div className="flex flex-col gap-1">
              {booking.confined_space_required && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 w-fit">
                  Confined Space
                </Badge>
              )}
              {booking.trauma_specialist_required && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 w-fit">Trauma</Badge>
              )}
              {booking.urgency_premium_percent > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 w-fit">
                  +{booking.urgency_premium_percent}% urgent
                </Badge>
              )}
              {!booking.confined_space_required &&
                !booking.trauma_specialist_required &&
                booking.urgency_premium_percent === 0 && (
                  <span className="text-gray-500 text-xs">Standard</span>
                )}
            </div>
          );
        },
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => {
          const booking = row.original;
          return (
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <CurrencyWithTooltip amount={booking.total} />
              </div>
              <div className="text-xs text-gray-400">
                Fee: <CurrencyWithTooltip amount={booking.platform_fee} />
              </div>
              <div className="text-xs text-gray-400">
                Medic: <CurrencyWithTooltip amount={booking.medic_payout} />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          const badges = {
            pending: {
              color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
              label: 'Pending',
              icon: <Clock className="w-3 h-3" />,
            },
            confirmed: {
              color: 'bg-green-500/20 text-green-400 border-green-500/30',
              label: 'Confirmed',
              icon: <CheckCircle className="w-3 h-3" />,
            },
            in_progress: {
              color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
              label: 'In Progress',
              icon: <Activity className="w-3 h-3" />,
            },
            completed: {
              color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
              label: 'Completed',
              icon: <CheckCircle className="w-3 h-3" />,
            },
            cancelled: {
              color: 'bg-red-500/20 text-red-400 border-red-500/30',
              label: 'Cancelled',
              icon: <XCircle className="w-3 h-3" />,
            },
          };

          const badge = badges[status] || badges.pending;

          return (
            <Badge className={`${badge.color} flex items-center gap-1.5 w-fit`}>
              {badge.icon}
              {badge.label}
            </Badge>
          );
        },
      },
      {
        id: 'territory',
        header: 'Territory',
        cell: ({ row }) => {
          const booking = row.original;
          const isOutOfTerritory = booking.requires_manual_approval || booking.out_of_territory_cost > 0;

          if (!isOutOfTerritory) {
            return <span className="text-gray-500">-</span>;
          }

          // Approved: status is confirmed and had out-of-territory cost
          if (booking.status === 'confirmed' && booking.out_of_territory_cost > 0) {
            return (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Approved
              </span>
            );
          }

          // Denied: status is cancelled
          if (booking.status === 'cancelled') {
            return (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                Denied
              </span>
            );
          }

          // Pending: show review button
          if (booking.status === 'pending') {
            return (
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={() => setSelectedOOTBooking(booking.id)}
              >
                Review Cost
              </Button>
            );
          }

          return <span className="text-gray-500">-</span>;
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const booking = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-700">
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                {booking.status === 'pending' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        approveMutation.mutate([booking.id]);
                        setRowSelection({});
                      }}
                      className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedBookingForReassign(booking);
                        setReassignDialogOpen(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Reassign Medic
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setRejectDialogOpen(true);
                        setRowSelection({ [booking.id]: true });
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [approveMutation]
  );

  const table = useReactTable({
    data: filteredBookings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      rowSelection,
      globalFilter,
    },
    getRowId: (row) => row.id, // Preserve selection across pagination
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      needsApproval: bookings.filter((b) => b.requires_manual_approval && b.status === 'pending')
        .length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      totalRevenue: bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + b.total, 0),
    };
  }, [bookings]);

  // Get selected booking IDs
  const selectedBookingIds = Object.keys(rowSelection);

  // Handle bulk approve
  const handleBulkApprove = () => {
    if (selectedBookingIds.length > 0) {
      approveMutation.mutate(selectedBookingIds);
      setRowSelection({});
    }
  };

  // Handle bulk reject
  const handleBulkReject = () => {
    if (selectedBookingIds.length > 0 && rejectReason.trim()) {
      rejectMutation.mutate({ bookingIds: selectedBookingIds, reason: rejectReason });
      setRowSelection({});
      setRejectDialogOpen(false);
      setRejectReason('');
    }
  };

  // Handle reassign
  const handleReassign = () => {
    if (selectedBookingForReassign && newMedicId && reassignReason.trim()) {
      reassignMutation.mutate({
        bookingId: selectedBookingForReassign.id,
        newMedicId,
        reason: reassignReason,
      });
      setReassignDialogOpen(false);
      setSelectedBookingForReassign(null);
      setNewMedicId('');
      setReassignReason('');
    }
  };

  if (isLoading && !initialData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} color="blue" />
        <StatCard
          label="Pending"
          value={stats.pending}
          color="yellow"
          highlight={stats.pending > 0}
        />
        <StatCard
          label="Needs Approval"
          value={stats.needsApproval}
          color="yellow"
          highlight={stats.needsApproval > 0}
        />
        <StatCard label="Completed" value={stats.completed} color="purple" />
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 border border-green-500/50 shadow-2xl shadow-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-green-100 text-sm font-semibold uppercase tracking-wider mb-2">
              Total Revenue (Completed)
            </div>
            <div className="text-3xl font-bold text-white">
              <CurrencyWithTooltip amount={stats.totalRevenue} className="text-3xl font-bold" />
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xl">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6 shadow-2xl">
        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Search by site, postcode, client, or medic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
          />

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-gray-900/50 border-gray-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">Date:</span>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32 bg-gray-900/50 border-gray-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant={needsApprovalFilter ? 'default' : 'outline'}
              onClick={() => setNeedsApprovalFilter(!needsApprovalFilter)}
              className={
                needsApprovalFilter
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'border-gray-700 text-gray-300 hover:bg-gray-700'
              }
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Needs Approval Only
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-gray-400 text-sm">
        Showing {table.getFilteredRowModel().rows.length} of {bookings.length} bookings
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-700">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-700/30 transition-all duration-200"
                  >
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50">
          <div className="text-sm text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedBookingIds.length}
        onApprove={handleBulkApprove}
        onReject={() => setRejectDialogOpen(true)}
        onClear={() => setRowSelection({})}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
      />

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reassign Medic</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedBookingForReassign && selectedBookingForReassign.medics
                ? `Current medic: ${selectedBookingForReassign.medics.first_name} ${selectedBookingForReassign.medics.last_name}`
                : 'No medic currently assigned'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Select New Medic
              </label>
              <Select value={newMedicId} onValueChange={setNewMedicId}>
                <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-white">
                  <SelectValue placeholder="Choose a medic..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {availableMedics.map((medic) => (
                    <SelectItem key={medic.id} value={medic.id}>
                      {medic.first_name} {medic.last_name} ({medic.star_rating.toFixed(1)}⭐)
                      {selectedBookingForReassign?.confined_space_required &&
                        !medic.has_confined_space_cert &&
                        ' - Missing Confined Space'}
                      {selectedBookingForReassign?.trauma_specialist_required &&
                        !medic.has_trauma_cert &&
                        ' - Missing Trauma'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Reason for Reassignment
              </label>
              <Input
                placeholder="e.g., Better qualified for requirements..."
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReassignDialogOpen(false);
                setNewMedicId('');
                setReassignReason('');
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!newMedicId || !reassignReason.trim() || reassignMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {reassignMutation.isPending ? 'Reassigning...' : 'Confirm Reassignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Reject {selectedBookingIds.length} booking{selectedBookingIds.length !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. Please provide a reason for rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Input
              placeholder="Reason for rejection (required)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setRejectReason('')}
              className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkReject}
              disabled={!rejectReason.trim()}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white"
            >
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Out-of-Territory Approval Modal */}
      {selectedOOTBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Out-of-Territory Review</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedOOTBooking(null);
                  // Invalidate bookings query to refetch any approval/denial changes
                  queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
                }}
              >
                Close
              </Button>
            </div>
            <div className="p-4">
              <OutOfTerritoryApproval bookingId={selectedOOTBooking} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
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
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  return (
    <div
      className={`group bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
        highlight
          ? 'border-yellow-500/50 ring-2 ring-yellow-500/20 shadow-lg shadow-yellow-500/10'
          : 'border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {label}
      </div>
      <div
        className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br ${colorClasses[color]} transition-transform duration-300 group-hover:scale-110`}
      >
        {value}
      </div>
    </div>
  );
}
