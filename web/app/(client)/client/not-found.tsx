import Link from 'next/link';

/**
 * Client Portal 404 Page
 *
 * Shown when a client navigates to a route under /client that doesn't exist.
 * Directs them back to their bookings or support.
 */
export default function ClientNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-blue-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Page not found
        </h1>
        <p className="text-slate-600 mb-8">
          This page doesn&apos;t exist. You may have followed an old link or typed the URL incorrectly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/client/bookings"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
          >
            My Bookings
          </Link>
          <Link
            href="/client/support"
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-center"
          >
            Help & Support
          </Link>
        </div>
      </div>
    </div>
  );
}
