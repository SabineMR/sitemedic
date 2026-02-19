import Link from 'next/link';

/**
 * Admin 404 Page
 *
 * Shown when an admin navigates to a route under /admin that doesn't exist.
 * Uses dark theme to match the admin panel.
 */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-blue-500 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Page not found
        </h1>
        <p className="text-gray-400 mb-8">
          This admin page doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/bookings"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
          >
            Go to Bookings
          </Link>
          <Link
            href="/admin/settings"
            className="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors font-medium text-center"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
