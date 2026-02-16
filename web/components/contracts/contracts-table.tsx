'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ContractWithRelations, ContractStatus } from '@/lib/contracts/types';
import { STATUS_LABELS } from '@/lib/contracts/workflow';
import { ContractStatusBadge } from './contract-status-badge';
import { DataTable } from '@/components/dashboard/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, Copy, Ban, Send } from 'lucide-react';
import Link from 'next/link';

interface ContractsTableProps {
  contracts: ContractWithRelations[];
  stats: Record<ContractStatus, number>;
}

/**
 * Contracts table with filters, search, and actions
 *
 * Displays all contracts with status badges, client info, payment terms,
 * and action buttons. Supports filtering by status and searching by
 * company name or site name.
 */
export function ContractsTable({ contracts, stats }: ContractsTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter contracts
  const filteredContracts = React.useMemo(() => {
    let filtered = contracts;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Search filter (company name or site address)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.client?.name?.toLowerCase().includes(query) ||
          c.booking?.address_line1?.toLowerCase().includes(query) ||
          c.booking?.city?.toLowerCase().includes(query) ||
          c.booking?.postcode?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [contracts, statusFilter, searchQuery]);

  // Format GBP currency
  const formatGBP = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
  };

  // Format date (UK format)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get payment terms label
  const getPaymentTermsLabel = (terms: string) => {
    const labels: Record<string, string> = {
      full_prepay: 'Full Prepay',
      split_50_50: '50/50 Split',
      split_50_net30: '50% + Net 30',
      full_net30: 'Net 30',
      custom: 'Custom',
    };
    return labels[terms] || terms;
  };

  // Table columns
  const columns: ColumnDef<ContractWithRelations>[] = [
    {
      accessorKey: 'id',
      header: 'Contract #',
      cell: ({ row }) => {
        // Generate contract number from ID (SA-YYYY-NNN format)
        // For now, use first 8 chars of ID as placeholder
        const contractNum = `SA-${row.original.id.slice(0, 8)}`;
        return (
          <Link
            href={`/contracts/${row.original.id}`}
            className="font-mono text-sm text-blue-600 hover:underline"
          >
            {contractNum}
          </Link>
        );
      },
    },
    {
      accessorKey: 'client.name',
      header: 'Client',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.original.client?.name || 'Unknown'}
        </div>
      ),
    },
    {
      accessorKey: 'booking.address_line1',
      header: 'Site',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.original.booking?.address_line1}, {row.original.booking?.city}
        </div>
      ),
    },
    {
      accessorKey: 'booking.total_price',
      header: 'Total',
      cell: ({ row }) => formatGBP(row.original.booking?.total_price || 0),
    },
    {
      accessorKey: 'payment_terms',
      header: 'Payment Terms',
      cell: ({ row }) => getPaymentTermsLabel(row.original.payment_terms),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ContractStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span suppressHydrationWarning>
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const contract = row.original;
        const shareableUrl = contract.shareable_token
          ? `${window.location.origin}/contracts/${contract.id}/sign?token=${contract.shareable_token}`
          : null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/contracts/${contract.id}`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {contract.status === 'draft' && (
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: Implement send contract logic
                    console.log('Send contract:', contract.id);
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send to Client
                </DropdownMenuItem>
              )}
              {shareableUrl && (
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(shareableUrl);
                    // TODO: Add toast notification
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Signing Link
                </DropdownMenuItem>
              )}
              {!['terminated', 'fulfilled'].includes(contract.status) && (
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: Implement terminate logic
                    console.log('Terminate contract:', contract.id);
                  }}
                  className="text-red-600"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Terminate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Status summary cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Draft</div>
          <div className="text-2xl font-bold">{stats.draft || 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Sent</div>
          <div className="text-2xl font-bold">{stats.sent || 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Signed</div>
          <div className="text-2xl font-bold">{stats.signed || 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Active</div>
          <div className="text-2xl font-bold">{stats.active || 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Fulfilled
          </div>
          <div className="text-2xl font-bold">{stats.fulfilled || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <SelectItem key={status} value={status}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Client or site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </div>

        <Link href="/contracts/create">
          <Button>Create Agreement</Button>
        </Link>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredContracts}
        globalFilterPlaceholder="Search contracts..."
      />
    </div>
  );
}
