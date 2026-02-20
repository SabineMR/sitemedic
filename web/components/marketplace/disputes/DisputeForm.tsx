'use client';

/**
 * DisputeForm Component
 * Phase 36: Ratings, Messaging & Disputes — Plan 03
 *
 * Form for filing a marketplace dispute with category selection,
 * description, and evidence file upload.
 */

import { useState, useCallback } from 'react';
import { Loader2, AlertTriangle, Upload, X } from 'lucide-react';
import {
  DISPUTE_CATEGORY_LABELS,
  type DisputeCategory,
} from '@/lib/marketplace/dispute-types';

interface DisputeFormProps {
  eventId: string;
  onDisputeFiled?: () => void;
  onCancel?: () => void;
}

const CATEGORIES: DisputeCategory[] = [
  'no_show',
  'late_cancellation',
  'quality_issue',
  'billing_dispute',
  'safety_concern',
];

export function DisputeForm({ eventId, onDisputeFiled, onCancel }: DisputeFormProps) {
  const [category, setCategory] = useState<DisputeCategory | ''>('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const validFiles = newFiles.filter(
      (f) => f.size <= 10 * 1024 * 1024 && files.length + newFiles.length <= 5
    );
    setFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    e.target.value = '';
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!category) {
        setError('Please select a dispute category');
        return;
      }
      if (!description.trim()) {
        setError('Please describe the dispute');
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/marketplace/events/${eventId}/dispute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            description: description.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to file dispute');
          return;
        }

        // Upload evidence files if any
        if (files.length > 0 && data.dispute?.id) {
          for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            try {
              await fetch(`/api/marketplace/disputes/${data.dispute.id}/evidence`, {
                method: 'POST',
                body: formData,
              });
            } catch {
              // Log but don't fail the dispute
              console.error('Failed to upload evidence file:', file.name);
            }
          }
        }

        onDisputeFiled?.();
      } catch (err) {
        console.error('[DisputeForm] Submit error:', err);
        setError('Failed to file dispute. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [eventId, category, description, files, onDisputeFiled]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Warning callout */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          Filing a dispute will place a hold on any remaining payment until the dispute is resolved by our team.
        </p>
      </div>

      {/* Category selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dispute Category
        </label>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                category === cat
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="dispute-category"
                value={cat}
                checked={category === cat}
                onChange={() => setCategory(cat)}
                disabled={submitting}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">
                {DISPUTE_CATEGORY_LABELS[cat]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="dispute-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="dispute-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          maxLength={5000}
          rows={4}
          placeholder="Please describe what happened in detail..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {description.length} / 5000
        </p>
      </div>

      {/* Evidence upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Evidence (optional)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Upload photos, screenshots, or documents (PDF, JPEG, PNG). Max 10MB per file, up to 5 files.
        </p>

        {files.length > 0 && (
          <div className="space-y-2 mb-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
              >
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleFileRemove(index)}
                  className="text-gray-400 hover:text-red-500 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length < 5 && (
          <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-gray-400 transition-colors">
            <Upload className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">Click to upload evidence</span>
            <input
              type="file"
              onChange={handleFileAdd}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              disabled={submitting}
            />
          </label>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !category || !description.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Filing Dispute...
            </>
          ) : (
            'File Dispute'
          )}
        </button>
      </div>
    </form>
  );
}
