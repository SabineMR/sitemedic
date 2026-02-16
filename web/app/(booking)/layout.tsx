/**
 * Booking Layout
 * Phase 4.5: Minimal layout for booking flow
 */

import SiteHeader from '@/components/marketing/site-header';
import Link from 'next/link';

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-100 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>&copy; 2026 Guardian Medics. All rights reserved.</p>
            <Link href="/" className="hover:text-slate-900 transition">
              Back to home
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
