'use client';

import Link from 'next/link';
import { useState } from 'react';
import QuoteBuilder from '@/components/QuoteBuilder';

export default function Pricing() {
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-slate-900">
              Guardian Medics
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm transition">
                Home
              </Link>
              <Link href="/pricing" className="text-slate-900 font-medium text-sm border-b-2 border-blue-600">
                Pricing
              </Link>
              <button
                onClick={() => setShowQuoteBuilder(true)}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition"
              >
                Get Quote
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Quote Builder Modal */}
      {showQuoteBuilder && <QuoteBuilder onClose={() => setShowQuoteBuilder(false)} />}

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

      {/* Pricing */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Pricing Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 mb-8 shadow-lg hover:shadow-xl transition">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                  Guardian Medics Pro
                </h2>
                <p className="text-slate-600 mb-6 text-base">
                  HCPC-registered paramedic + automatic compliance platform
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-700">Digital treatment logging</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-700">RIDDOR auto-flagging</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-700">Weekly safety reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-700">Works offline</span>
                  </li>
                </ul>
              </div>
              <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
                <div className="mb-6">
                  <div className="text-5xl sm:text-6xl font-bold text-slate-900">£350</div>
                  <div className="text-base text-slate-500 mt-2">per day</div>
                  <div className="text-sm text-slate-400 mt-1">+VAT</div>
                </div>
                <button
                  onClick={() => setShowQuoteBuilder(true)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl w-full md:w-auto"
                >
                  Get Quote
                </button>
              </div>
            </div>
          </div>

          {/* Volume Pricing */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-8 mb-12">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Volume discounts</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
                <div className="text-lg font-bold text-slate-900 mb-2">1 week (5 days)</div>
                <div className="text-2xl font-bold text-slate-900 mb-1">£1,750</div>
                <div className="text-sm text-slate-500">£350/day</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
                <div className="text-lg font-bold text-slate-900 mb-2">1 month (20 days)</div>
                <div className="text-2xl font-bold text-slate-900 mb-1">£6,800</div>
                <div className="text-sm text-green-600 font-medium">£340/day (3% off)</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-300 hover:shadow-md transition">
                <div className="text-lg font-bold text-slate-900 mb-2">Enterprise</div>
                <div className="text-2xl font-bold text-slate-900 mb-1">Custom</div>
                <div className="text-sm text-blue-700 font-medium">Contact sales</div>
              </div>
            </div>
          </div>

          {/* FAQ */}
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
            Get a custom quote in under 2 minutes.
          </p>
          <button
            onClick={() => setShowQuoteBuilder(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            Get Your Quote
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-3 text-sm">Guardian Medics</h3>
              <p className="text-sm text-slate-400 mb-4">
                UK paramedic staffing with built-in compliance.
              </p>
              <p className="text-xs text-slate-500">
                Guardian Medics Ltd<br />
                Registered in England and Wales
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white transition">Home</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
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
              &copy; 2026 Guardian Medics Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
