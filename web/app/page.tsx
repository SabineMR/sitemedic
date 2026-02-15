'use client';

import Link from 'next/link';
import { useState } from 'react';
import QuoteBuilder from '@/components/QuoteBuilder';

export default function Home() {
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
              <Link href="/pricing" className="text-slate-600 hover:text-slate-900 text-sm transition">
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

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            HCPC-Registered Paramedics
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Professional paramedics
            <br />
            <span className="text-blue-600">with built-in compliance</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Book qualified paramedics for your construction site. We handle the care and generate RIDDOR-ready reports automatically.
          </p>

          <button
            onClick={() => setShowQuoteBuilder(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            Get Your Quote
          </button>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              UK GDPR
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              RIDDOR 2013
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              CDM 2015
            </span>
          </div>
        </div>
      </section>

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

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            Ready to simplify compliance?
          </h2>
          <p className="text-slate-600 mb-8">
            Get a quote in under 2 minutes.
          </p>
          <button
            onClick={() => setShowQuoteBuilder(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
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
