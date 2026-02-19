'use client';

import { useEffect } from 'react';

/**
 * Error boundary for /dashboard routes (medic dashboard).
 *
 * Catches errors in dashboard pages (treatments, workers, reports, contracts, etc.)
 * and provides a branded fallback with retry option.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Page failed to load
        </h1>
        <p className="text-slate-600 mb-6">
          An error occurred while loading this page. Please try again or
          navigate to a different section.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Go to Dashboard
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
