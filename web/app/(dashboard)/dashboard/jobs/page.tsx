'use client';

/**
 * Direct Jobs List Page
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * Lists all direct (self-procured) jobs for the current user's company.
 * Entry point: /dashboard/jobs with "Log Job" button linking to the creation wizard.
 *
 * Features: search, status filter, paginated table, status badges.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DIRECT_JOB_STATUS_LABELS } from '@/lib/direct-jobs/types';
import { EVENT_TYPE_LABELS } from '@/lib/marketplace/event-types';
import type { DirectJobStatus } from '@/lib/direct-jobs/types';
import type { EventType } from '@/lib/marketplace/event-types';

interface JobListItem {
  id: string;
  event_name: string;
  event_type: EventType;
  status: DirectJobStatus;
  agreed_price: number | null;
  location_postcode: string;
  location_display: string | null;
  created_at: string;
  client: {
    client_name: string;
  } | null;
  event_days: {
    event_date: string;
    start_time: string;
    end_time: string;
  }[];
}

const STATUS_COLORS: Record<DirectJobStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function DirectJobsListPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const limit = 20;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/direct-jobs?${params}`);
      const data = await res.json();

      if (res.ok) {
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Client-side search filter
  const filteredJobs = search
    ? jobs.filter(
        (job) =>
          job.event_name.toLowerCase().includes(search.toLowerCase()) ||
          job.client?.client_name?.toLowerCase().includes(search.toLowerCase()) ||
          job.location_postcode?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Direct Jobs</h1>
          <p className="text-muted-foreground">
            Jobs you have sourced and manage directly -- 0% platform commission
          </p>
        </div>
        <Link
          href="/dashboard/jobs/create"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Log Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Search jobs, clients, postcodes..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {Object.entries(DIRECT_JOB_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading jobs...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-500 mb-4">
            {search || statusFilter
              ? 'No jobs match your filters.'
              : 'No direct jobs yet. Log your first self-procured job!'}
          </p>
          {!search && !statusFilter && (
            <Link
              href="/dashboard/jobs/create"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Log Job
            </Link>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Job Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Date(s)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Location</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {job.event_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                    {job.client?.client_name || '-'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {EVENT_TYPE_LABELS[job.event_type] || job.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {job.event_days.length > 0
                      ? job.event_days.length === 1
                        ? new Date(job.event_days[0].event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : `${new Date(job.event_days[0].event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} +${job.event_days.length - 1}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                    {job.location_display || job.location_postcode || '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {job.agreed_price
                      ? `\u00A3${job.agreed_price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {DIRECT_JOB_STATUS_LABELS[job.status] || job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} jobs
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
