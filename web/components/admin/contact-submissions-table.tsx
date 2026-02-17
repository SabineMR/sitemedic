/**
 * Contact Submissions Table
 *
 * Renders all contact enquiry leads with search, status filter,
 * inline status change dropdown, and date formatting.
 */

'use client';

import { useState, useMemo } from 'react';
import { useContactSubmissions, useUpdateSubmissionStatus } from '@/lib/queries/admin/submissions';
import type { ContactSubmission } from '@/lib/queries/admin/submissions';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

type StatusFilter = 'all' | 'new' | 'contacted' | 'converted' | 'closed';

function statusBadgeClasses(status: ContactSubmission['status']): string {
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

export function ContactSubmissionsTable() {
  const { data: submissions, isLoading } = useContactSubmissions();
  const updateStatus = useUpdateSubmissionStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    if (!submissions) return [];

    return submissions.filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      // Search filter: first_name, last_name, email, company
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [submissions, searchTerm, statusFilter]);

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
              placeholder="Search by name, email, or company..."
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
        Showing {filtered.length} of {submissions?.length || 0} contact enquiries
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Company</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Enquiry Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Site Size</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No contact submissions found
                  </td>
                </tr>
              ) : (
                filtered.map((submission) => (
                  <ContactRow
                    key={submission.id}
                    submission={submission}
                    onStatusChange={(id, status) =>
                      updateStatus.mutate({ id, status, table: 'contact_submissions' })
                    }
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

function ContactRow({
  submission,
  onStatusChange,
}: {
  submission: ContactSubmission;
  onStatusChange: (id: string, status: ContactSubmission['status']) => void;
}) {
  return (
    <tr className="hover:bg-gray-700/30 transition-all duration-200">
      {/* Name */}
      <td className="px-6 py-4">
        <div className="font-medium text-white">
          {submission.first_name} {submission.last_name}
        </div>
      </td>

      {/* Company */}
      <td className="px-6 py-4">
        <div className="text-gray-300">{submission.company}</div>
      </td>

      {/* Email */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm">{submission.email}</div>
      </td>

      {/* Phone */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm">{submission.phone || '—'}</div>
      </td>

      {/* Enquiry Type */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm capitalize">
          {submission.enquiry_type.replace(/_/g, ' ')}
        </div>
      </td>

      {/* Site Size */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm">{submission.site_size || '—'}</div>
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
              onStatusChange(submission.id, v as ContactSubmission['status'])
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

      {/* Date */}
      <td className="px-6 py-4">
        <div className="text-gray-300 text-sm">
          {new Date(submission.created_at).toLocaleDateString('en-GB')}
        </div>
      </td>
    </tr>
  );
}
