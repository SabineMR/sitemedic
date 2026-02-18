import Link from 'next/link';

/**
 * Branded 404 Page
 *
 * Shown when a user navigates to a URL that doesn't match any route.
 * Provides helpful navigation back to key sections of the site.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-blue-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Page not found
        </h1>
        <p className="text-slate-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
          >
            Go to Homepage
          </Link>
          <Link
            href="/contact"
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-center"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
