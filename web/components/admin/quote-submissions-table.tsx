/**
 * Quote Submissions Table
 *
 * Renders all quote request leads with search, status filter,
 * inline status change, and "Convert to Booking" action that
 * navigates to /admin/bookings/new with pre-filled URL params.
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuoteSubmissions, useUpdateSubmissionStatus } from '@/lib/queries/admin/submissions';
import type { QuoteSubmission } from '@/lib/queries/admin/submissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowRight } from 'lucide-react';

type StatusFilter = 'all' | 'new' | 'contacted' | 'converted' | 'closed';

function statusBadgeClasses(status: QuoteSubmission['status']): string {
  switch (status) {
    case 'new':
      return 'bg-blue-500/20 text-blue-300';
    case 'contacted':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'converted':
      return 'bg-green-500/20 text-green-300';
    case 'closed':
      return 'bg-gray-500/20 text-gray-400';
  }
}

export function QuoteSubmissionsTable() {
  const router = useRouter();
  const { data: submissions, isLoading } = useQuoteSubmissions();
  const updateStatus = useUpdateSubmissionStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    if (!submissions) return [];

    return submissions.filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      // Search filter: name, email, company, quote_ref
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.company ?? '').toLowerCase().includes(q) ||
          s.quote_ref.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [submissions, searchTerm, statusFilter]);

  function handleConvertToBooking(quote: QuoteSubmission) {
    const params = new URLSearchParams();
    if (quote.email) params.set('clientEmail', quote.email);
    if (quote.site_address) params.set('siteAddress', quote.site_address);
    if (quote.start_date) params.set('shiftDate', quote.start_date);
    if (quote.special_requirements?.includes('confined-space')) params.set('confinedSpace', '1');
    if (quote.special_requirements?.includes('trauma-specialist')) params.set('traumaSpecialist', '1');
    params.set('specialNotes', `Converted from quote ${quote.quote_ref}`);
    router.push(`/admin/bookings/new?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, company, or quote ref..."
              aria-label="Search quote submissions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-900/50 border-gray-700/50 text-white"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[180px] bg-gray-900/50 border-gray-700/50 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-gray-400 text-sm">
        Showing {filtered.length} of {submissions?.length || 0} quote requests
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Quote Ref</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Company</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Project Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Medics</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Site Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Start Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No quote submissions found
                  </td>
                </tr>
              ) : (
                filtered.map((submission) => (
                  <QuoteRow
                    key={submission.id}
                    submission={submission}
                    onStatusChange={(id, status) =>
                      updateStatus.mutate({ id, status, table: 'quote_submissions' })
                    }
                    onConvert={() => handleConvertToBooking(submission)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function QuoteRow({
  submission,
  onStatusChange,
  onConvert,
}: {
  submission: QuoteSubmission;
  onStatusChange: (id: string, status: QuoteSubmission['status']) => void;
  onConvert: () => void;
}) {
  return (
    <tr className="hover:bg-gray-700/30 transition-all duration-200">
      {/* Quote Ref */}
      <td className="px-6 py-4">
        <div className="font-mono text-sm text-blue-300">{submission.quote_ref}</div>
      </td>

      {/* Name */}
      <td className="px-6 py-4">
        <div className="font-medium text-white">{submission.name}</div>
        <div className="text-gray-400 text-xs">{submission.email}</div>
      </td>

      {/* Company */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm">{submission.company || '—'}</div>
      </td>

      {/* Project Type */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm capitalize">
          {submission.project_type ? submission.project_type.replace(/_/g, ' ') : '—'}
        </div>
      </td>

      {/* Medics */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm">{submission.medic_count || '—'}</div>
      </td>

      {/* Site Address */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm max-w-[200px] truncate" title={submission.site_address ?? undefined}>
          {submission.site_address || '—'}
        </div>
      </td>

      {/* Start Date */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm">
          {submission.start_date
            ? new Date(submission.start_date).toLocaleDateString('en-GB')
            : '—'}
        </div>
      </td>

      {/* Status — inline change via Select */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mb-1 ${statusBadgeClasses(submission.status)}`}
          >
            {submission.status}
          </span>
          <Select
            value={submission.status}
            onValueChange={(v) =>
              onStatusChange(submission.id, v as QuoteSubmission['status'])
            }
          >
            <SelectTrigger className="w-[130px] h-7 text-xs bg-gray-900/50 border-gray-700/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        {submission.status !== 'closed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onConvert}
            className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            Convert to Booking
          </Button>
        )}
      </td>
    </tr>
  );
}
