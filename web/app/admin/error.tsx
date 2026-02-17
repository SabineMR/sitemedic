'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Error boundary for /admin routes
 *
 * Catches errors that occur in admin pages and provides graceful fallback behavior.
 *
 * Primary use case: Platform admins who aren't properly redirected from /admin to /platform
 * will trigger the "not assigned to an organization" error. This boundary catches it and
 * redirects them to the correct location.
 *
 * This serves as a safety net for data integrity issues where users have invalid role/org_id
 * combinations (e.g., org_admin without an org_id).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error for debugging
    console.error('Admin page error:', error);

    // Redirect users without org_id to platform admin
    // (catches platform admins who aren't properly redirected)
    if (error.message.includes('not assigned to an organization')) {
      router.push('/platform');
    }
  }, [error, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Error</h1>
        <p className="text-gray-400 mb-4">
          {error.message.includes('not assigned to an organization')
            ? 'You are not assigned to an organization. Redirecting to platform admin...'
            : 'An error occurred while loading this page.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
