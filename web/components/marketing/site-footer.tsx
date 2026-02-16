import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm">Apex Safety Group</h3>
            <p className="text-sm text-slate-400 mb-4">
              UK paramedic staffing with built-in compliance.
            </p>
            <p className="text-xs text-slate-500">
              Apex Safety Group Ltd<br />
              Registered in England and Wales
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition">Home</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="/book" className="hover:text-white transition">Book a Medic</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy</Link></li>
              <li><Link href="/terms-and-conditions" className="hover:text-white transition">Terms</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Compliance</h4>
            <ul className="space-y-2 text-sm">
              <li>UK GDPR</li>
              <li>RIDDOR 2013</li>
              <li>CDM 2015</li>
              <li>HSE Audit-Ready</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-xs text-slate-500">
            &copy; 2026 Apex Safety Group Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
