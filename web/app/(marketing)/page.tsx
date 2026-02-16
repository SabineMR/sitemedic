import Link from 'next/link';
import Hero from '@/components/marketing/hero';
import TrustSignals from '@/components/marketing/trust-signals';

export const dynamic = 'force-static';
export const revalidate = 86400; // Revalidate daily (24 hours)

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero />

      {/* How It Works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            How it works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Book online</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Choose your dates and location. We match you with a qualified paramedic.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Medic on-site</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Professional care with digital records captured automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Auto-compliance</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                RIDDOR reports auto-generated. Weekly safety summaries delivered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 border border-slate-200 rounded-lg hover:border-blue-200 hover:shadow-sm transition">
              <h3 className="font-semibold text-slate-900 mb-2">Works offline</h3>
              <p className="text-slate-600 text-sm">
                Capture data on-site with zero signal. Auto-syncs when connected.
              </p>
            </div>

            <div className="p-6 border border-slate-200 rounded-lg hover:border-blue-200 hover:shadow-sm transition">
              <h3 className="font-semibold text-slate-900 mb-2">Instant reports</h3>
              <p className="text-slate-600 text-sm">
                Digital records within 60 seconds. RIDDOR auto-flagged.
              </p>
            </div>

            <div className="p-6 border border-slate-200 rounded-lg hover:border-blue-200 hover:shadow-sm transition">
              <h3 className="font-semibold text-slate-900 mb-2">UK GDPR compliant</h3>
              <p className="text-slate-600 text-sm">
                UK-hosted data. Full compliance with health data regulations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <TrustSignals />

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            Ready to simplify compliance?
          </h2>
          <p className="text-slate-600 mb-8">
            Get started in under 2 minutes.
          </p>
          <Link
            href="/book"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Book a Medic
          </Link>
        </div>
      </section>
    </div>
  );
}
