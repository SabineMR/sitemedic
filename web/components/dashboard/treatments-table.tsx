'use client';

/**
 * Treatment table wrapper component
 *
 * Provides filtering controls (date range, severity, outcome, worker search)
 * and wraps DataTable with polling via useTreatments hook.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TreatmentWithWorker } from '@/types/database.types';
import { useTreatments } from '@/lib/queries/treatments';
import { DataTable } from './data-table';
import { treatmentColumns } from './treatments-columns';
import { DateRangeFilter } from './date-range-filter';
import { ExportButtons } from './export-buttons';
import { exportTreatmentsCSV } from '@/lib/utils/export-csv';
import { exportTreatmentsPDF } from '@/lib/utils/export-pdf';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface TreatmentsTableProps {
  initialData: TreatmentWithWorker[];
}

export function TreatmentsTable({ initialData }: TreatmentsTableProps) {
  const router = useRouter();
  const { data: treatments = [] } = useTreatments(initialData);

  const [dateRange, setDateRange] = React.useState<{
    from: string | null;
    to: string | null;
  }>({ from: null, to: null });
  const [severityFilter, setSeverityFilter] = React.useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = React.useState<string>('all');
  const [workerSearch, setWorkerSearch] = React.useState<string>('');

  // Client-side filtering
  const filteredTreatments = React.useMemo(() => {
    let filtered = [...treatments];

    // Date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(
        (t) => new Date(t.created_at) >= fromDate
      );
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (t) => new Date(t.created_at) <= toDate
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter((t) => t.severity === severityFilter);
    }

    // Outcome filter
    if (outcomeFilter !== 'all') {
      filtered = filtered.filter((t) => t.outcome === outcomeFilter);
    }

    // Worker name search
    if (workerSearch) {
      const search = workerSearch.toLowerCase();
      filtered = filtered.filter((t) => {
        if (!t.worker) return false;
        const fullName =
          `${t.worker.first_name} ${t.worker.last_name}`.toLowerCase();
        return fullName.includes(search);
      });
    }

    return filtered;
  }, [treatments, dateRange, severityFilter, outcomeFilter, workerSearch]);

  const handleRowClick = (treatment: TreatmentWithWorker) => {
    router.push(`/treatments/${treatment.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <DateRangeFilter
            onDateRangeChange={(from, to) => setDateRange({ from, to })}
          />

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="returned_to_work">Returned to Work</SelectItem>
              <SelectItem value="sent_home">Sent Home</SelectItem>
              <SelectItem value="hospital_referral">Hospital Referral</SelectItem>
              <SelectItem value="ambulance_called">Ambulance Called</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search worker name..."
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            className="w-[200px]"
          />
        </div>

        {/* Export buttons */}
        <ExportButtons
          onExportCSV={() => exportTreatmentsCSV(filteredTreatments)}
          onExportPDF={() => exportTreatmentsPDF(filteredTreatments)}
        />
      </div>

      {/* Data table */}
      <DataTable
        columns={treatmentColumns}
        data={filteredTreatments}
        globalFilterPlaceholder="Search all fields..."
      />
    </div>
  );
}
