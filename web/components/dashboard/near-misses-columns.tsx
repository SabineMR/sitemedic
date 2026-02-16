'use client';

import { ColumnDef } from '@tanstack/react-table';
import { NearMissWithReporter } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper to format category for display
function formatCategory(category: string): string {
  return category
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const nearMissesColumns: ColumnDef<NearMissWithReporter>[] = [
  {
    accessorKey: 'created_at',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      return <span suppressHydrationWarning>{format(date, 'dd/MM/yyyy HH:mm')}</span>;
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as string;
      return formatCategory(category);
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string;
      const colorMap: Record<string, string> = {
        low: 'bg-green-100 text-green-800',
        medium: 'bg-amber-100 text-amber-800',
        high: 'bg-red-100 text-red-800',
        critical: 'bg-red-900 text-white font-bold',
      };
      return (
        <Badge className={colorMap[severity] || ''} variant="outline">
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const description = row.getValue('description') as string;
      const truncated = description && description.length > 80 ? description.slice(0, 80) + '...' : description;
      return (
        <span title={description || ''} className="max-w-md truncate">
          {truncated || 'No description'}
        </span>
      );
    },
  },
  {
    accessorKey: 'reporter',
    header: 'Reported By',
    cell: ({ row }) => {
      const reporter = row.original.reporter;
      return reporter?.full_name || 'Unknown';
    },
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => {
      const location = row.getValue('location') as string | null;
      return location || 'No location';
    },
  },
];
