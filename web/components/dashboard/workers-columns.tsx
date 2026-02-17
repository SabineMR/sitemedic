'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Worker } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUpDown, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const workersColumns: ColumnDef<Worker>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const lastName = row.original.last_name;
      const firstName = row.original.first_name;
      return `${lastName}, ${firstName}`;
    },
    accessorFn: (row) => `${row.last_name}, ${row.first_name}`,
    filterFn: 'includesString',
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => {
      const company = row.getValue('company') as string | null;
      return company || 'N/A';
    },
    filterFn: 'includesString',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as string | null;
      return role || 'N/A';
    },
    filterFn: 'includesString',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string | null;
      return phone || 'N/A';
    },
  },
  {
    accessorKey: 'emergency_contact',
    header: 'Emergency Contact',
    cell: ({ row }) => {
      const name = row.original.emergency_contact_name;
      const phone = row.original.emergency_contact_phone;
      if (!name && !phone) return 'None';
      return (
        <div className="text-sm">
          {name && <div>{name}</div>}
          {phone && <div className="text-muted-foreground">{phone}</div>}
        </div>
      );
    },
  },
  {
    accessorKey: 'consent_given',
    header: 'Consent',
    cell: ({ row }) => {
      const consentGiven = row.getValue('consent_given') as boolean;
      return consentGiven ? (
        <Badge className="bg-green-100 text-green-800" variant="outline">
          <Check className="h-3 w-3 mr-1" />
          Given
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800" variant="outline">
          <X className="h-3 w-3 mr-1" />
          Not Given
        </Badge>
      );
    },
  },
  {
    accessorKey: 'cert_status',
    header: 'Cert Status',
    cell: ({ row }) => {
      // NOTE: This column is a placeholder for future construction worker certification tracking.
      // Current Phase 7 certification tracking applies to MEDICS (the medical professionals),
      // not construction site workers. Construction workers (in this workers table) do not have
      // certifications tracked in the database. If future requirements include tracking
      // construction worker certifications (e.g., confined space training, CSCS cards),
      // this column should be updated to query worker-specific certification data.
      //
      // For MEDIC certifications, see the Certifications page in the dashboard.
      return (
        <Badge className="bg-gray-100 text-gray-600" variant="outline">
          N/A
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Added',
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      return <span suppressHydrationWarning>{format(date, 'dd/MM/yyyy')}</span>;
    },
  },
];
