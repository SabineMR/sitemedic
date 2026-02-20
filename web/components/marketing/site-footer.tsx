import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">ASG</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Apex Safety Group</div>
                <div className="text-[10px] text-slate-500">Powered by SiteMedic</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              HCPC-registered paramedics for events, productions, motorsport, construction and more — across England &amp; Wales.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apex Safety Group Ltd<br />
              Registered in England and Wales
            </p>
          </div>

          {/* Industries */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Industries</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/services#tv-film" className="hover:text-white transition">
                  TV &amp; Film Productions
                </Link>
              </li>
              <li>
                <Link href="/services#motorsport" className="hover:text-white transition">
                  Motorsport &amp; Extreme Sports
                </Link>
              </li>
              <li>
                <Link href="/services#festivals" className="hover:text-white transition">
                  Music Festivals &amp; Concerts
                </Link>
              </li>
              <li>
                <Link href="/services#sporting-events" className="hover:text-white transition">
                  Sporting Events
                </Link>
              </li>
              <li>
                <Link href="/services#construction" className="hover:text-white transition">
                  Construction &amp; Industrial
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition">
                  All Industries →
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition">Home</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">About ASG</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-white transition">Marketplace</Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-white transition">Book a Medic</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition">Client Login</Link>
              </li>
              <li>
                <Link href="/complaints" className="hover:text-white transition">Complaints</Link>
              </li>
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
            </ul>
          </div>

        </div>

        {/* Compliance badges row */}
        <div className="border-t border-slate-800 pt-8 pb-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              'HCPC-Registered',
              'Purple Guide',
              'Motorsport UK',
              'RIDDOR 2013',
              'CDM 2015',
              'UK GDPR',
              'HSE Audit-Ready',
              'FA Governance',
              'HASAWA 1974',
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
              &copy; {new Date().getFullYear()} Apex Safety Group Ltd. All rights reserved. Governed by the laws of England and Wales.
            </p>
            <p className="text-xs text-slate-700">
              Platform by{' '}
              <span className="text-slate-500 font-medium">SiteMedic</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
