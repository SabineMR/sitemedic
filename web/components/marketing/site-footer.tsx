import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">SM</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">SiteMedic</div>
                <div className="text-[10px] text-slate-500">UK Occupational Health Platform</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              The compliance platform built for UK occupational health providers.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              SiteMedic Ltd<br />
              Registered in England and Wales
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#features" className="hover:text-white transition">Features</Link>
              </li>
              <li>
                <Link href="#for-who" className="hover:text-white transition">Who It&apos;s For</Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
              </li>
              <li>
                <Link href="#get-started" className="hover:text-white transition">Get Started</Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-white transition">Marketplace</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition">Sign In</Link>
              </li>
            </ul>
          </div>

          {/* Use Cases */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Use Cases</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="text-slate-400">Medic Agencies</li>
              <li className="text-slate-400">OH Providers</li>
              <li className="text-slate-400">Employers &amp; Companies</li>
              <li className="text-slate-400">Site Managers</li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Legal &amp; Compliance</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:text-white transition">Terms &amp; Conditions</Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-white transition">Cookie Policy</Link>
              </li>
              <li>
                <Link href="/acceptable-use" className="hover:text-white transition">Acceptable Use</Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition">Refund Policy</Link>
              </li>
              <li>
                <Link href="/complaints" className="hover:text-white transition">Complaints</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Compliance badges row */}
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              'UK GDPR',
              'RIDDOR 2013',
              'HSWA 1974',
              'HSE Audit-Ready',
              'HCPC-Ready',
              'ISO 27001',
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
              &copy; {new Date().getFullYear()} SiteMedic Ltd. All rights reserved. Governed by the laws of England and Wales.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
