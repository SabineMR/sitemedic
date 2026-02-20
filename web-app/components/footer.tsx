import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-[11px] font-bold">SM</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">SiteMedic</div>
                <div className="text-[10px] text-slate-500">UK Occupational Health Platform</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
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
              <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
              <li><Link href="#for-who" className="hover:text-white transition">Who It&apos;s For</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="#get-started" className="hover:text-white transition">Get Started</Link></li>
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

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><span className="text-slate-500">Privacy Policy</span></li>
              <li><span className="text-slate-500">Terms of Service</span></li>
              <li><span className="text-slate-500">Cookie Policy</span></li>
              <li><span className="text-slate-500">Security</span></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-600">
              &copy; {new Date().getFullYear()} SiteMedic Ltd. All rights reserved. Governed by the laws of England and Wales.
            </p>
            <div className="flex gap-2 flex-wrap">
              {['UK GDPR', 'RIDDOR 2013', 'HCPC-Ready', 'ISO 27001'].map((b) => (
                <span key={b} className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded text-[11px] font-medium">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
