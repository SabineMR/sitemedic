'use client';

/**
 * Client Portal Page
 * Phase 34.1: Self-Procured Jobs -- Plan 05
 *
 * Read-only client-facing view of a direct job accessible at:
 *   /dashboard/jobs/[id]/client-portal
 *
 * This page is primarily for the company admin to preview what the client
 * would see. When client accounts are implemented, clients would see this
 * same view via their own authentication.
 *
 * Fetches from GET /api/direct-jobs/[id]/client-access which returns
 * job data WITHOUT medic personal details (names, IDs, contact info).
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Loader2 } from 'lucide-react';
import { ClientPortalView } from '@/components/direct-jobs/ClientPortalView';
import type { ClientSafeJob } from '@/components/direct-jobs/ClientPortalView';

export default function ClientPortalPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<ClientSafeJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/direct-jobs/${jobId}/client-access`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load job');
        return;
      }

      setJob(data.job);
    } catch (err) {
      console.error('[ClientPortal] Fetch error:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading client view...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={fetchJob}
            className="mt-3 inline-flex items-center rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/jobs/${jobId}`)}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-semibold text-gray-900">Client Portal Preview</h1>
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Share with Client
            </>
          )}
        </button>
      </div>

      {/* Client Portal View */}
      <ClientPortalView job={job} />
    </div>
  );
}
