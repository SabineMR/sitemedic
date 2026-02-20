'use client';

/**
 * Platform Admin Disputes Queue
 * Phase 36: Ratings, Messaging & Disputes — Plan 03
 *
 * Lists all marketplace disputes with filtering by status.
 * Click through to dispute detail with resolution controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DisputeDetail } from '@/components/marketplace/disputes/DisputeDetail';
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
  type MarketplaceDispute,
  type DisputeStatus,
} from '@/lib/marketplace/dispute-types';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function DisputesQueuePage() {
  const [disputes, setDisputes] = useState<MarketplaceDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    try {
      const url = statusFilter === 'all'
        ? '/api/marketplace/disputes'
        : `/api/marketplace/disputes?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes || []);
      }
    } catch (err) {
      console.error('[DisputesQueue] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const selectedDispute = disputes.find((d) => d.id === selectedDisputeId);

  const filteredDisputes = statusFilter === 'all'
    ? disputes
    : disputes.filter((d) => d.status === statusFilter);

  // Sort: newest first
  const sortedDisputes = [...filteredDisputes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage marketplace disputes and issue resolutions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'open', 'under_review', 'resolved'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setStatusFilter(status);
              setSelectedDisputeId(null);
            }}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : DISPUTE_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : sortedDisputes.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No disputes found.</p>
        </div>
      ) : selectedDispute ? (
        /* Detail view */
        <div>
          <button
            type="button"
            onClick={() => setSelectedDisputeId(null)}
            className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            &larr; Back to list
          </button>
          <div className="border rounded-lg p-6">
            <DisputeDetail
              dispute={selectedDispute}
              isAdmin
              onResolved={() => {
                setSelectedDisputeId(null);
                fetchDisputes();
              }}
            />
          </div>
        </div>
      ) : (
        /* Table view */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 font-medium">
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Filed By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date Filed</th>
                <th className="px-4 py-3">Days Open</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedDisputes.map((dispute) => {
                const daysOpen = Math.floor(
                  (Date.now() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <tr
                    key={dispute.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedDisputeId(dispute.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {dispute.event_name || dispute.event_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {DISPUTE_CATEGORY_LABELS[dispute.category]}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <Badge variant="outline" className="text-[10px]">
                        {dispute.filed_by_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[dispute.status] || ''}>
                        {DISPUTE_STATUS_LABELS[dispute.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(dispute.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${daysOpen > 7 ? 'text-red-600' : daysOpen > 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {dispute.status === 'resolved' ? '-' : `${daysOpen}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Eye className="h-4 w-4 text-gray-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
