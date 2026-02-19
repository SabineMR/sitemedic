'use client';

import { useEffect } from 'react';

/**
 * Error boundary for /client routes (client portal).
 *
 * Catches errors in client-facing pages (bookings, invoices, account, support)
 * and provides a user-friendly fallback with retry and support contact.
 */
export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client portal error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">&#9888;&#65039;</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-slate-600 mb-6">
          We couldn&apos;t load this page. Please try again, or contact support
          if the issue persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <a
            href="mailto:support@sitemedic.co.uk"
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Contact Support
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
