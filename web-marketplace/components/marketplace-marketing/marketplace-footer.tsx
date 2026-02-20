import Link from 'next/link';

const PROVIDER_APP_URL = process.env.NEXT_PUBLIC_PROVIDER_APP_URL || 'http://localhost:30500';
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:30501';

export default function MarketplaceFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">SM</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">SiteMedic</div>
                <div className="text-[10px] text-slate-500">Marketplace</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Post your event, receive quotes from CQC-verified medical companies, and award the right provider — all on one platform.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              SiteMedic Marketplace<br />
              Part of the SiteMedic platform
            </p>
          </div>

          {/* For Clients */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">For Clients</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Marketplace Home
                </Link>
              </li>
              <li>
                <Link href="/for-clients" className="hover:text-white transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/events/create" className="hover:text-white transition">
                  Post an Event
                </Link>
              </li>
              <li>
                <Link href="/client-register" className="hover:text-white transition">
                  Client Sign Up
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* For Companies */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">For Companies</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/for-companies" className="hover:text-white transition">
                  Why Join
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition">
                  Register Your Company
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-white transition">
                  Browse Events
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href={PROVIDER_APP_URL} className="hover:text-white transition">
                  Provider App
                </a>
              </li>
              <li>
                <a href={MARKETING_URL} className="hover:text-white transition">
                  About SiteMedic
                </a>
              </li>
              <li>
                <a href={PROVIDER_APP_URL + '/privacy-policy'} className="hover:text-white transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href={PROVIDER_APP_URL + '/terms-and-conditions'} className="hover:text-white transition">
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a href={PROVIDER_APP_URL + '/refund-policy'} className="hover:text-white transition">
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Compliance badges row */}
        <div className="border-t border-slate-800 pt-8 pb-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              'CQC-Verified',
              'HCPC-Registered',
              'Stripe Payments',
              'UK GDPR',
              'RIDDOR 2013',
              'HSE Audit-Ready',
              'Purple Guide',
              'Motorsport UK',
            ].map((badge) => (
              <span
                key={badge}
                className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-md text-xs border border-slate-700 font-medium"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-600">
              &copy; {new Date().getFullYear()} SiteMedic Marketplace. All rights reserved. Governed by the laws of England and Wales.
            </p>
            <p className="text-xs text-slate-700">
              Platform by{' '}
              <a href={MARKETING_URL} className="text-slate-500 font-medium hover:text-white transition">
                SiteMedic
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
