'use client';

/**
 * DisputeDetail Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 03
 *
 * Displays dispute status, category, description, evidence,
 * timeline, and resolution. Admin actions for resolving disputes.
 */

import { useState } from 'react';
import { Loader2, FileText, Image as ImageIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
  RESOLUTION_TYPE_LABELS,
  type MarketplaceDispute,
  type ResolutionType,
} from '@/lib/marketplace/dispute-types';

interface DisputeDetailProps {
  dispute: MarketplaceDispute;
  isAdmin?: boolean;
  onResolved?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

export function DisputeDetail({ dispute, isAdmin, onResolved }: DisputeDetailProps) {
  const [resolutionType, setResolutionType] = useState<ResolutionType | ''>('');
  const [resolutionPercent, setResolutionPercent] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!resolutionType || !resolutionNotes.trim()) return;

    setResolving(true);
    setResolveError(null);

    try {
      const body: Record<string, unknown> = {
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes.trim(),
      };
      if (resolutionType === 'partial_refund' && resolutionPercent) {
        body.resolution_percent = parseFloat(resolutionPercent);
      }

      const res = await fetch(`/api/marketplace/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setResolveError(data.error || 'Failed to resolve dispute');
        return;
      }

      onResolved?.();
    } catch {
      setResolveError('Failed to resolve dispute. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const handleMarkUnderReview = async () => {
    try {
      await fetch(`/api/marketplace/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_type: null,
          resolution_notes: 'Marked as under review',
          status_only: 'under_review',
        }),
      });
      onResolved?.();
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {DISPUTE_CATEGORY_LABELS[dispute.category]}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Filed {new Date(dispute.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {dispute.filed_by_name && ` by ${dispute.filed_by_name}`}
          </p>
        </div>
        <Badge className={STATUS_COLORS[dispute.status] || ''}>
          {DISPUTE_STATUS_LABELS[dispute.status]}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-gray-500">Filed</span>
        </div>
        <div className="h-px flex-1 bg-gray-200" />
        <div className={`flex items-center gap-1.5 ${dispute.status === 'under_review' || dispute.status === 'resolved' ? '' : 'opacity-40'}`}>
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-gray-500">Under Review</span>
        </div>
        <div className="h-px flex-1 bg-gray-200" />
        <div className={`flex items-center gap-1.5 ${dispute.status === 'resolved' ? '' : 'opacity-40'}`}>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-xs text-gray-500">Resolved</span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
        <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
          {dispute.description}
        </p>
      </div>

      {/* Evidence */}
      {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Evidence</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {dispute.evidence_urls.map((url, index) => {
              const isPdf = url.toLowerCase().endsWith('.pdf');
              return (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                >
                  {isPdf ? (
                    <FileText className="h-5 w-5 text-red-500" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                  )}
                  <span className="text-xs text-gray-600 truncate">
                    File {index + 1}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolution (if resolved) */}
      {dispute.status === 'resolved' && dispute.resolution_type && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h4 className="text-sm font-semibold text-green-800 mb-2">Resolution</h4>
          <p className="text-sm text-green-700">
            <strong>{RESOLUTION_TYPE_LABELS[dispute.resolution_type]}</strong>
            {dispute.resolution_percent && (
              <> ({dispute.resolution_percent}%)</>
            )}
          </p>
          {dispute.resolution_notes && (
            <p className="text-sm text-green-600 mt-1">{dispute.resolution_notes}</p>
          )}
          {dispute.resolved_at && (
            <p className="text-xs text-green-500 mt-2">
              Resolved {new Date(dispute.resolved_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}

      {/* Admin resolution form */}
      {isAdmin && dispute.status !== 'resolved' && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Admin Actions</h4>

          {dispute.status === 'open' && (
            <button
              type="button"
              onClick={handleMarkUnderReview}
              className="rounded-md bg-blue-100 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-200"
            >
              Mark as Under Review
            </button>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
            <select
              value={resolutionType}
              onChange={(e) => setResolutionType(e.target.value as ResolutionType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select resolution...</option>
              <option value="full_refund">Full refund to client</option>
              <option value="partial_refund">Partial refund</option>
              <option value="dismissed">Dismiss (company keeps payment)</option>
              <option value="suspend_party">Suspend party</option>
            </select>
          </div>

          {resolutionType === 'partial_refund' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Refund Percentage
              </label>
              <input
                type="number"
                value={resolutionPercent}
                onChange={(e) => setResolutionPercent(e.target.value)}
                min="1"
                max="99"
                placeholder="e.g. 50"
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Notes
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Explain the resolution decision..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
            />
          </div>

          {resolveError && <p className="text-sm text-red-600">{resolveError}</p>}

          <button
            type="button"
            onClick={handleResolve}
            disabled={resolving || !resolutionType || !resolutionNotes.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {resolving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resolving...
              </>
            ) : (
              'Resolve Dispute'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
