/**
 * Timesheet Batch Approval Component
 *
 * Optimized for Friday payout workflow - batch approve 20+ timesheets in <5 minutes.
 * Features: select-all, payout summary, bulk approve/reject, discrepancy highlighting.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  DollarSign,
  Users,
  FileText,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  TimesheetWithDetails,
  useBatchApproveTimesheets,
  useBatchRejectTimesheets,
  calculatePayoutSummary,
} from '@/lib/queries/admin/timesheets';
import { exportTimesheetsCSV } from '@/lib/utils/export-csv';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return format(new Date(dateString), 'dd MMM yyyy');
}

function formatTime(timeString: string): string {
  // timeString is HH:MM:SS format
  return timeString.slice(0, 5); // Return HH:MM
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: any; label: string }> = {
    pending: { variant: 'outline', label: 'Pending' },
    manager_approved: { variant: 'default', label: 'Manager OK' },
    admin_approved: { variant: 'default', label: 'Approved' },
    paid: { variant: 'default', label: 'Paid' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  };

  const config = variants[status] || { variant: 'outline', label: status };

  return (
    <Badge
      variant={config.variant}
      className={
        status === 'manager_approved'
          ? 'bg-blue-600 hover:bg-blue-700'
          : status === 'admin_approved'
          ? 'bg-green-600 hover:bg-green-700'
          : status === 'paid'
          ? 'bg-purple-600 hover:bg-purple-700'
          : ''
      }
    >
      {config.label}
    </Badge>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface TimesheetBatchApprovalProps {
  initialData: TimesheetWithDetails[];
}

export function TimesheetBatchApproval({ initialData }: TimesheetBatchApprovalProps) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminUserId, setAdminUserId] = useState<string>('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setAdminUserId(data.user.id);
    });
  }, []);

  const batchApproveMutation = useBatchApproveTimesheets();
  const batchRejectMutation = useBatchRejectTimesheets();

  // Define columns
  const columns: ColumnDef<TimesheetWithDetails>[] = useMemo(
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
        accessorKey: 'medic',
        header: 'Medic',
        cell: ({ row }) => {
          const medic = row.original.medic;
          return (
            <div className="font-medium">
              {medic.first_name} {medic.last_name}
            </div>
          );
        },
      },
      {
        accessorKey: 'site',
        header: 'Site',
        cell: ({ row }) => {
          const booking = row.original.booking;
          return (
            <div>
              <div className="font-medium">{booking.site_name}</div>
              <div className="text-sm text-gray-500">{booking.client.company_name}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => {
          const booking = row.original.booking;
          return <div>{formatDate(booking.shift_date)}</div>;
        },
      },
      {
        accessorKey: 'shift',
        header: 'Shift',
        cell: ({ row }) => {
          const booking = row.original.booking;
          return (
            <div className="text-sm">
              {formatTime(booking.shift_start_time)} - {formatTime(booking.shift_end_time)}
            </div>
          );
        },
      },
      {
        accessorKey: 'hours',
        header: 'Hours',
        cell: ({ row }) => {
          const { logged_hours, scheduled_hours, discrepancy_reason } = row.original;
          const hasDiscrepancy = logged_hours !== scheduled_hours;

          return (
            <div className="flex items-center gap-2">
              <span className={hasDiscrepancy ? 'text-yellow-500 font-medium' : ''}>
                {logged_hours}
              </span>
              {hasDiscrepancy && (
                <div className="flex items-center gap-1 text-yellow-500" title={discrepancy_reason || undefined}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs">({scheduled_hours})</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'payout_amount',
        header: 'Payout',
        cell: ({ row }) => (
          <div className="font-medium text-green-400">
            {formatCurrency(row.original.payout_amount)}
          </div>
        ),
      },
      {
        accessorKey: 'payout_status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.payout_status),
      },
      {
        accessorKey: 'submitted',
        header: 'Submitted',
        cell: ({ row }) => {
          const { medic_submitted_at, manager_approved_at } = row.original;
          return (
            <div className="text-sm">
              {medic_submitted_at && (
                <div>{format(new Date(medic_submitted_at), 'dd MMM HH:mm')}</div>
              )}
              {manager_approved_at && (
                <div className="text-xs text-gray-500">
                  Mgr: {format(new Date(manager_approved_at), 'dd MMM')}
                </div>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  // Create table instance
  const table = useReactTable({
    data: initialData,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Get selected timesheets
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedTimesheets = selectedRows.map((row) => row.original);
  const selectedCount = selectedTimesheets.length;

  // Calculate payout summary
  const payoutSummary = useMemo(
    () => calculatePayoutSummary(selectedTimesheets),
    [selectedTimesheets]
  );

  // Quick action: Select all pending (manager_approved status)
  const handleSelectAllPending = () => {
    const pendingIndices: Record<string, boolean> = {};
    initialData.forEach((timesheet, index) => {
      if (timesheet.payout_status === 'manager_approved') {
        pendingIndices[index] = true;
      }
    });
    setRowSelection(pendingIndices);
  };

  // Batch approve handler
  const handleBatchApprove = async () => {
    await batchApproveMutation.mutateAsync({
      timesheets: selectedTimesheets,
      adminUserId,
    });

    setRowSelection({});
    setApproveDialogOpen(false);
  };

  // Batch reject handler
  const handleBatchReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }

    const timesheetIds = selectedTimesheets.map((t) => t.id);

    await batchRejectMutation.mutateAsync({
      timesheetIds,
      adminUserId,
      rejectionReason,
    });

    setRowSelection({});
    setRejectDialogOpen(false);
    setRejectionReason('');
  };

  const isLoading = batchApproveMutation.isPending || batchRejectMutation.isPending;

  const pendingCount = initialData.filter((t) => t.payout_status === 'manager_approved').length;
  const pendingTotal = initialData
    .filter((t) => t.payout_status === 'manager_approved')
    .reduce((sum, t) => sum + t.payout_amount, 0);

  return (
    <div className="space-y-6">
      {/* Quick Actions Row */}
      <div className="flex items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSelectAllPending}
            variant="outline"
            className="border-gray-600 hover:bg-gray-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Select All Pending ({pendingCount})
          </Button>

          <div className="text-sm text-gray-400">
            Total pending: <span className="text-white font-medium">{formatCurrency(pendingTotal)}</span>
          </div>
        </div>

        <Button
          onClick={() => exportTimesheetsCSV(initialData)}
          variant="outline"
          size="sm"
          className="border-gray-600 hover:bg-gray-700"
          disabled={initialData.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Payout Summary Card (visible when items selected) */}
      {selectedCount > 0 && (
        <div className="p-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-700/50 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payout Summary
          </h3>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400">Total Payout</div>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(payoutSummary.totalPayout)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400">Medics</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6" />
                {payoutSummary.medicCount}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400">Timesheets</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6" />
                {selectedCount}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={() => setApproveDialogOpen(true)}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Queue for Payout
                </>
              )}
            </Button>

            <Button
              onClick={() => setRejectDialogOpen(true)}
              disabled={isLoading}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-900/20"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Selected
            </Button>

            <Button
              onClick={() => setRowSelection({})}
              disabled={isLoading}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-gray-300">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const hasDiscrepancy =
                  row.original.logged_hours !== row.original.scheduled_hours;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`border-gray-700 ${
                      hasDiscrepancy ? 'border-l-4 border-l-yellow-500' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                  No timesheets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-gray-600"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-gray-600"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Approve {selectedCount} Timesheet{selectedCount === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will queue {selectedCount} timesheet{selectedCount === 1 ? '' : 's'} totaling{' '}
              <span className="font-semibold text-green-400">
                {formatCurrency(payoutSummary.totalPayout)}
              </span>{' '}
              for Friday payout to {payoutSummary.medicCount} medic
              {payoutSummary.medicCount === 1 ? '' : 's'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchApprove}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
            >
              Confirm Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog with Reason */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Reject {selectedCount} Timesheet{selectedCount === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Please provide a reason for rejecting these timesheets.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejection-reason" className="text-gray-300">
              Rejection Reason
            </Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Hours exceed scheduled time without approval..."
              className="bg-gray-900 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchReject}
              disabled={!rejectionReason.trim()}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
            >
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
