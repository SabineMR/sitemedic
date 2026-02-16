import type { Metadata } from 'next';
import Link from 'next/link';
import PricingTable from '@/components/marketing/pricing-table';

export const dynamic = 'force-static';
export const revalidate = 86400; // Revalidate daily (24 hours)

export const metadata: Metadata = {
  title: 'Pricing - Guardian Medics',
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
            Professional paramedics with built-in compliance. One daily rate, everything included.
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
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-8">Common questions</h3>

            <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition">
              <h4 className="text-lg font-semibold text-slate-900 mb-3">What's included in the price?</h4>
              <p className="text-slate-600 leading-relaxed">
                A qualified HCPC-registered paramedic on-site, plus full access to the compliance platform (mobile app, web dashboard, automatic RIDDOR flagging, weekly reports). No separate software fees.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition">
              <h4 className="text-lg font-semibold text-slate-900 mb-3">Is there a minimum booking?</h4>
              <p className="text-slate-600 leading-relaxed">
                Standard minimum is 1 day (8 hours). For shorter shifts, contact us for custom pricing.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition">
              <h4 className="text-lg font-semibold text-slate-900 mb-3">What if there's no mobile signal?</h4>
              <p className="text-slate-600 leading-relaxed">
                The app works 100% offline. All data is captured locally and syncs automatically when connectivity returns.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition">
              <h4 className="text-lg font-semibold text-slate-900 mb-3">How does RIDDOR auto-flagging work?</h4>
              <p className="text-slate-600 leading-relaxed">
                When a treatment is logged, the platform automatically checks it against RIDDOR 2013 criteria. Reportable incidents are flagged with appropriate HSE deadlines and pre-filled forms.
              </p>
            </div>
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
            Book a medic for your construction site today.
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
