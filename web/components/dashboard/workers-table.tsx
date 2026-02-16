'use client';

import * as React from 'react';
import { Worker } from '@/types/database.types';
import { useWorkers } from '@/lib/queries/workers';
import { DataTable } from './data-table';
import { workersColumns } from './workers-columns';
import { ExportButtons } from './export-buttons';
import { exportWorkersCSV } from '@/lib/utils/export-csv';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkersTableProps {
  initialData: Worker[];
}

export function WorkersTable({ initialData }: WorkersTableProps) {
  const { data } = useWorkers(initialData);
  const [companyFilter, setCompanyFilter] = React.useState<string>('');
  const [roleFilter, setRoleFilter] = React.useState<string>('');
  const [certStatusFilter, setCertStatusFilter] = React.useState<string>('all');

  // Filter data
  const filteredData = React.useMemo(() => {
    let filtered = data || [];

    // Company search filter
    if (companyFilter) {
      filtered = filtered.filter((worker) =>
        worker.company?.toLowerCase().includes(companyFilter.toLowerCase())
      );
    }

    // Role search filter
    if (roleFilter) {
      filtered = filtered.filter((worker) =>
        worker.role?.toLowerCase().includes(roleFilter.toLowerCase())
      );
    }

    // Cert status filter (placeholder - all workers are "Active" until Phase 7)
    if (certStatusFilter !== 'all') {
      // When Phase 7 is implemented, this will filter based on actual cert expiry
      // For now, all workers pass the "active" filter
      if (certStatusFilter !== 'active') {
        filtered = [];
      }
    }

    return filtered;
  }, [data, companyFilter, roleFilter, certStatusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters and Export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Company</label>
            <Input
              placeholder="Search company..."
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-[200px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Role</label>
            <Input
              placeholder="Search role..."
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-[200px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Cert Status</label>
            <Select value={certStatusFilter} onValueChange={setCertStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Export button (CSV only for workers) */}
        <ExportButtons onExportCSV={() => exportWorkersCSV(filteredData)} />
      </div>

      {/* Table */}
      <DataTable
        columns={workersColumns}
        data={filteredData}
        globalFilterPlaceholder="Search workers (name, company, role)..."
      />
    </div>
  );
}
