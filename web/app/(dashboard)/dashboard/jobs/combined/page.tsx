'use client';

/**
 * Combined Jobs Dashboard — All marketplace + direct jobs in one filterable view
 *
 * Phase 34.1: Self-Procured Jobs — Plan 03
 *
 * Displays a unified table of all jobs posted by the current user,
 * with source badges (Marketplace / Direct), status filter, source filter,
 * and search. Links to the appropriate detail page based on source.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { EVENT_TYPE_LABELS } from '@/lib/marketplace/event-types';
import { DIRECT_JOB_STATUS_LABELS } from '@/lib/direct-jobs/types';
import type { EventSource } from '@/lib/direct-jobs/types';
import { SourceBadge } from '@/components/direct-jobs/SourceBadge';
import { SourceFilter } from '@/components/direct-jobs/SourceFilter';

// Combined status set across marketplace + direct job lifecycles
const ALL_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
  awarded: 'Awarded',
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-green-100 text-green-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  awarded: 'bg-purple-100 text-purple-700',
};

interface CombinedJob {
  id: string;
  source: EventSource;
  event_name: string;
  event_type: string;
  status: string;
  agreed_price: number | null;
  created_at: string;
  event_days: Array<{ event_date: string; start_time: string; end_time: string }>;
  client: { client_name: string } | null;
}

export default function CombinedJobsPage() {
  const [jobs, setJobs] = useState<CombinedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<EventSource | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (sourceFilter) params.set('source', sourceFilter);

      const res = await fetch(`/api/direct-jobs/combined?${params.toString()}`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch combined jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (searchTerm && !job.event_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [jobs, statusFilter, searchTerm]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatPrice = (price: number | null) => {
    if (price == null) return '-';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(price / 100);
  };

  /** Build the correct detail link based on source */
  const getDetailLink = (job: CombinedJob) => {
    if (job.source === 'direct') {
      return `/dashboard/jobs/${job.id}`;
    }
    return `/marketplace/events/${job.id}`;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Marketplace events and self-procured jobs in one view
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/marketplace/events/create"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Post Event
          </Link>
          <Link
            href="/dashboard/jobs/create"
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Add Direct Job
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <SourceFilter value={sourceFilter} onChange={setSourceFilter} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          {Object.entries(ALL_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by job name..."
          className="flex-1 min-w-[200px] max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-4">
            {jobs.length === 0
              ? "No jobs yet. Post a marketplace event or add a direct job to get started."
              : 'No jobs match your filters.'}
          </p>
          {jobs.length === 0 && (
            <div className="flex justify-center gap-3">
              <Link
                href="/marketplace/events/create"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Post Event
              </Link>
              <Link
                href="/dashboard/jobs/create"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Add Direct Job
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Jobs Table */}
      {filteredJobs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Job Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date(s)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <SourceBadge source={job.source} />
                  </td>
                  <td className="px-4 py-3 font-medium">{job.event_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {EVENT_TYPE_LABELS[job.event_type as keyof typeof EVENT_TYPE_LABELS] || job.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.event_days.length > 0
                      ? job.event_days.length === 1
                        ? formatDate(job.event_days[0].event_date)
                        : `${formatDate(job.event_days[0].event_date)} - ${formatDate(job.event_days[job.event_days.length - 1].event_date)}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLOURS[job.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {ALL_STATUS_LABELS[job.status] || job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.source === 'direct' && job.client
                      ? job.client.client_name
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {job.source === 'direct' ? formatPrice(job.agreed_price) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={getDetailLink(job)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary count */}
      {filteredJobs.length > 0 && (
        <p className="text-sm text-gray-500 mt-4">
          Showing {filteredJobs.length} of {jobs.length} total jobs
        </p>
      )}
    </div>
  );
}
