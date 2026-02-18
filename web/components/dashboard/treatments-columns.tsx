'use client';

/**
 * Treatment table column definitions
 *
 * Defines columns for TanStack Table including date, worker, injury type,
 * severity, outcome, RIDDOR flag, and actions.
 */

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { TreatmentWithWorker } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Link from 'next/link';

// Client-side date formatter to avoid hydration mismatch
function DateCell({ date }: { date: string }) {
  return <span suppressHydrationWarning>{format(new Date(date), 'dd/MM/yyyy HH:mm')}</span>;
}

export const treatmentColumns: ColumnDef<TreatmentWithWorker>[] = [
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => <DateCell date={row.getValue('created_at')} />,
    enableSorting: true,
  },
  {
    id: 'worker',
    accessorFn: (row) =>
      row.worker
        ? `${row.worker.first_name} ${row.worker.last_name}`
        : 'Unknown Worker',
    header: 'Worker',
    cell: ({ row }) => {
      const worker = row.original.worker;
      return worker
        ? `${worker.first_name} ${worker.last_name}`
        : 'Unknown Worker';
    },
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'injury_type',
    header: 'Injury Type',
    cell: ({ row }) => {
      const injuryType = row.getValue('injury_type') as string;
      // Capitalize and format
      return injuryType
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string;
      const colorMap: Record<string, string> = {
        minor: 'bg-green-500 text-white',
        moderate: 'bg-yellow-500 text-white',
        major: 'bg-orange-500 text-white',
        critical: 'bg-red-600 text-white',
      };
      return (
        <Badge className={colorMap[severity] || 'bg-gray-500'}>
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'outcome',
    header: 'Outcome',
    cell: ({ row }) => {
      const outcome = row.getValue('outcome') as string | null;
      if (!outcome) return <span className="text-muted-foreground">-</span>;

      return outcome
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
  },
  {
    accessorKey: 'is_riddor_reportable',
    header: 'RIDDOR',
    cell: ({ row }) => {
      const isRiddor = row.getValue('is_riddor_reportable') as boolean;
      const vertical = row.original.event_vertical;
      // Never show RIDDOR badge for non-RIDDOR verticals — must match NON_RIDDOR_VERTICALS in riddor-detector/index.ts
      const nonRiddorVerticals = ['motorsport', 'festivals', 'sporting_events', 'fairs_shows', 'private_events'];
      if (!isRiddor || (vertical && nonRiddorVerticals.includes(vertical))) return null;
      return <Badge variant="destructive">RIDDOR</Badge>;
    },
  },
  {
    id: 'motorsport_clearance',
    header: 'Clearance',
    cell: ({ row }) => {
      const vertical = row.original.event_vertical;
      const extraFields = row.original.vertical_extra_fields as Record<string, unknown> | null;
      if (vertical !== 'motorsport' || !extraFields) return null;
      if (
        extraFields.concussion_suspected === true &&
        extraFields.competitor_cleared_to_return !== true
      ) {
        return (
          <Badge variant="destructive" className="text-xs whitespace-nowrap">
            Concussion clearance required
          </Badge>
        );
      }
      return null;
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/treatments/${row.original.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>
      );
    },
  },
];
