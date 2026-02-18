'use client';

import * as React from 'react';
import { NearMissWithReporter } from '@/types/database.types';
import { useNearMisses } from '@/lib/queries/near-misses';
import { DataTable } from './data-table';
import { nearMissesColumns } from './near-misses-columns';
import { DateRangeFilter } from './date-range-filter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NearMissesTableProps {
  initialData: NearMissWithReporter[];
}

export function NearMissesTable({ initialData }: NearMissesTableProps) {
  const { data } = useNearMisses(initialData);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [severityFilter, setSeverityFilter] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });

  // Get unique categories from data
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(data?.map((nm) => nm.category) || []);
    return Array.from(uniqueCategories).sort();
  }, [data]);

  // Filter data
  const filteredData = React.useMemo(() => {
    let filtered = data || [];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((nm) => nm.category === categoryFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter((nm) => nm.severity === severityFilter);
    }

    // Date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((nm) => {
        const createdAt = new Date(nm.created_at);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;

        if (fromDate && toDate) {
          return createdAt >= fromDate && createdAt <= toDate;
        } else if (fromDate) {
          return createdAt >= fromDate;
        } else if (toDate) {
          return createdAt <= toDate;
        }
        return true;
      });
    }

    return filtered;
  }, [data, categoryFilter, severityFilter, dateRange]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category
                    .replace(/-/g, ' ')
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Severity</label>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DateRangeFilter
          onDateRangeChange={(from, to) => setDateRange({ from, to })}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={nearMissesColumns}
        data={filteredData}
        globalFilterPlaceholder="Search near-misses..."
        emptyTitle="No near-miss reports"
        emptyDescription="Near-miss incidents will appear here once reported. Try adjusting date range or filters."
      />
    </div>
  );
}
