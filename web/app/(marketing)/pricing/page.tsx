import type { Metadata } from 'next';
import Link from 'next/link';
import PricingTable from '@/components/marketing/pricing-table';

export const dynamic = 'force-static';
export const revalidate = 86400; // Revalidate daily (24 hours)

export const metadata: Metadata = {
  title: 'Pricing - Apex Safety Group',
  description: 'Transparent pricing for professional paramedics with built-in compliance. One daily rate, everything included.',
};

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Simple, honest pricing
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            HCPC-registered paramedics for any event or worksite, with built-in compliance. One daily rate, everything included.
          </p>
        </div>
      </section>

      {/* Pricing Table */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <PricingTable />
      </section>

      {/* FAQ */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Common questions</h3>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                q: "What's included in the base price?",
                a: "An HCPC-registered paramedic on site, plus full access to the SiteMedic compliance platform — treatment logging, RIDDOR auto-flagging, weekly safety reports, and worker health profiles. No separate software fees.",
              },
              {
                q: "Is there a minimum booking?",
                a: "Standard minimum is 1 day (8 hours). For shorter shifts or bespoke arrangements, contact us for custom pricing.",
              },
              {
                q: "What if there's no mobile signal on site?",
                a: "The SiteMedic app works 100% offline. All data is captured locally and syncs automatically the moment connectivity returns.",
              },
              {
                q: "How does RIDDOR auto-flagging work?",
                a: "When a treatment is logged, the platform checks it against RIDDOR 2013 criteria automatically. Reportable incidents are flagged with HSE deadlines and pre-filled notification forms.",
              },
              {
                q: "Can we add clinical services to an existing booking?",
                a: "Yes. Health surveillance, drug & alcohol testing, and fitness-to-work assessments can be added to any medic booking for construction or industrial sites. We&apos;ll scope the right package for your specific requirements.",
              },
              {
                q: "Are clinical add-on prices per visit or per worker?",
                a: "Health surveillance and drug testing are priced per worker tested. Fitness-to-work assessments are priced per assessment. All results are logged in SiteMedic automatically.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-blue-200 hover:bg-white hover:shadow-sm transition duration-200">
                <h4 className="font-semibold text-slate-900 text-sm mb-2">{q}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 leading-tight">
            Ready to get started?
          </h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Book a medic for your event, production, or worksite today.
          </p>
          <Link
            href="/book"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            Book Now
          </Link>
        </div>
      </section>
    </div>
  );
}
