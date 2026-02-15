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
      <section className="relative bg-gradient-to-br from-guardian-navy-900 via-guardian-navy-800 to-guardian-navy-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-guardian-orange-500/20 text-guardian-orange-300 px-4 py-2 rounded-full mb-6">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">HCPC-Registered Paramedics</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Professional Care.
                <span className="block text-guardian-orange-400">Automatic Compliance.</span>
              </h1>

              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Book qualified paramedics for your construction site. Our medics provide expert care while our proprietary <span className="text-white font-semibold">SiteMedic platform</span> generates RIDDOR-ready reports automatically—zero admin work for you.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-guardian-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-guardian-orange-600 transition shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5">
                  Book a Medic Today
                </button>
                <button className="border-2 border-white/30 bg-white/10 backdrop-blur text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition">
                  See How It Works
                </button>
              </div>

              {/* Trust Badges */}
              <div className="mt-12 flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-guardian-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-300">UK GDPR Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-guardian-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-300">RIDDOR 2013</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-guardian-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-300">CDM 2015</span>
                </div>
              </div>
            </div>

            {/* Hero Image Placeholder */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-guardian-orange-500 to-guardian-orange-600 rounded-2xl transform rotate-3"></div>
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 transform -rotate-1 hover:rotate-0 transition">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-guardian-green-50 rounded-lg border-l-4 border-guardian-green-500">
                      <div>
                        <div className="text-sm text-slate-600 font-medium">Treatment Logged</div>
                        <div className="text-lg font-bold text-guardian-navy-900">Minor Injury - 28 seconds</div>
                      </div>
                      <svg className="w-8 h-8 text-guardian-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-guardian-orange-50 rounded-lg border-l-4 border-guardian-orange-500">
                      <div>
                        <div className="text-sm text-slate-600 font-medium">RIDDOR Check</div>
                        <div className="text-lg font-bold text-guardian-navy-900">Auto-flagged</div>
                      </div>
                      <svg className="w-8 h-8 text-guardian-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-slate-400">
                      <div>
                        <div className="text-sm text-slate-600 font-medium">Weekly Report</div>
                        <div className="text-lg font-bold text-guardian-navy-900">Ready for HSE</div>
                      </div>
                      <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-guardian-navy-900 mb-4">
              Why Choose Guardian Medics?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Traditional medic services leave you with hours of admin work. We handle both the care and the compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Traditional Services */}
            <div className="bg-white rounded-2xl shadow-guardian-lg p-8 border border-slate-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Traditional Medic Services</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-600">You book a medic, but <strong className="text-slate-900">you handle all the compliance paperwork</strong></span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-600">Paper records are inconsistent and hard to audit</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-600">RIDDOR deadlines get missed in the chaos</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-600">No real-time visibility into site safety</span>
                </li>
              </ul>
            </div>

            {/* Guardian Medics */}
            <div className="bg-gradient-to-br from-guardian-navy-900 to-guardian-navy-800 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-guardian-orange-500 rounded-full filter blur-3xl opacity-20"></div>
              <div className="relative">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-guardian-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold">Guardian Medics</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-slate-100">HCPC-registered paramedics with <strong className="text-white">embedded compliance tech</strong></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-slate-100">Digital documentation happens as they work—<strong className="text-white">zero admin for you</strong></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-slate-100">RIDDOR incidents <strong className="text-white">auto-flagged</strong> with deadline tracking</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-slate-100">Weekly PDF safety reports <strong className="text-white">delivered to your inbox</strong></span>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="text-sm text-slate-300">Powered by <span className="font-semibold text-white">SiteMedic Platform</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-guardian-navy-900 mb-4">
              Built for Construction Sites
            </h2>
            <p className="text-xl text-slate-600">
              Our medics and technology work seamlessly in the toughest environments
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group hover:shadow-guardian-lg transition rounded-2xl p-8 border border-slate-200 hover:border-guardian-navy-300">
              <div className="w-14 h-14 bg-guardian-navy-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-guardian-navy-900 transition">
                <svg className="w-7 h-7 text-guardian-navy-900 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-guardian-navy-900 mb-3">Works Offline</h3>
              <p className="text-slate-600 leading-relaxed">
                Our medics capture everything on-site, even with zero signal. Data syncs automatically when connectivity returns—guaranteed zero data loss.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group hover:shadow-guardian-lg transition rounded-2xl p-8 border border-slate-200 hover:border-guardian-orange-300 bg-gradient-to-br from-white to-guardian-orange-50/50">
              <div className="w-14 h-14 bg-guardian-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-guardian-orange-500 transition">
                <svg className="w-7 h-7 text-guardian-orange-500 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-guardian-navy-900 mb-3">Instant Documentation</h3>
              <p className="text-slate-600 leading-relaxed">
                Our medics log every treatment digitally as they work. You get timestamped, auditable records within 60 seconds—no data entry for you.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group hover:shadow-guardian-lg transition rounded-2xl p-8 border border-slate-200 hover:border-guardian-green-300">
              <div className="w-14 h-14 bg-guardian-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-guardian-green-500 transition">
                <svg className="w-7 h-7 text-guardian-green-500 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-guardian-navy-900 mb-3">UK GDPR Compliant</h3>
              <p className="text-slate-600 leading-relaxed">
                UK-registered business, UK-hosted data, full compliance with health data regulations. Your workers' data is protected and secure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-guardian-navy-900 mb-4">How It Works</h2>
            <p className="text-xl text-slate-600">Four simple steps to effortless compliance</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Book Online',
                description: 'Choose your dates and site location. We match you with a qualified Guardian Medics paramedic.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                ),
              },
              {
                step: '2',
                title: 'Medic On-Site',
                description: 'Our paramedic provides professional care and captures digital records using SiteMedic as they work.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
              },
              {
                step: '3',
                title: 'Auto-Compliance',
                description: 'RIDDOR incidents are flagged automatically with deadline tracking. Zero admin work for you.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                ),
              },
              {
                step: '4',
                title: 'Weekly Reports',
                description: 'Professional PDF safety reports delivered to your inbox every Friday—HSE audit-ready.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                ),
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl shadow-guardian p-6 h-full hover:shadow-guardian-lg transition">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-guardian-navy-900 to-guardian-navy-700 text-white rounded-xl font-bold text-xl mb-4">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 bg-guardian-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-guardian-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-guardian-navy-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <svg className="w-8 h-8 text-guardian-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Badges */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-guardian-navy-900 mb-2">Fully Compliant with UK Regulations</h2>
            <p className="text-slate-600">Built for construction safety and health data protection</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: 'RIDDOR 2013', subtitle: 'Auto-flagging & reporting' },
              { title: 'UK GDPR', subtitle: 'Health data protection' },
              { title: 'CDM 2015', subtitle: 'Construction safety' },
              { title: 'HSE Audit-Ready', subtitle: 'Professional reports' },
            ].map((badge, index) => (
              <div key={index} className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200 hover:border-guardian-green-500 hover:shadow-md transition">
                <div className="flex justify-center mb-3">
                  <svg className="w-8 h-8 text-guardian-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-bold text-guardian-navy-900 mb-1">{badge.title}</p>
                <p className="text-sm text-slate-600">{badge.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-guardian-navy-900 via-guardian-navy-800 to-guardian-navy-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready for Effortless Compliance?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Book a Guardian Medics paramedic and get professional care + automatic compliance reports—all included in one service.
          </p>
          <button className="bg-guardian-orange-500 text-white px-10 py-5 rounded-lg text-lg font-bold hover:bg-guardian-orange-600 transition shadow-2xl hover:shadow-guardian-orange-500/50 transform hover:-translate-y-1">
            Book a Medic Today
          </button>
          <p className="mt-6 text-sm text-slate-400">
            Join construction companies across the UK who've eliminated hours of admin work
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-guardian-navy-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-guardian-orange-500 to-guardian-orange-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-xl">Guardian Medics</h3>
              </div>
              <p className="text-sm mb-6 text-slate-400 leading-relaxed">
                UK paramedic staffing for construction sites—with built-in compliance technology.
              </p>
              <div className="text-xs space-y-1 text-slate-500">
                <p>Guardian Medics Ltd</p>
                <p>Company No: [Insert Registration Number]</p>
                <p>VAT No: [Insert VAT Number]</p>
                <p>Registered in England and Wales</p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/" className="hover:text-guardian-orange-400 transition">Paramedic Staffing</Link></li>
                <li><Link href="/pricing" className="hover:text-guardian-orange-400 transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-guardian-orange-400 transition">SiteMedic Platform</Link></li>
                <li><Link href="#contact" className="hover:text-guardian-orange-400 transition">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/privacy-policy" className="hover:text-guardian-orange-400 transition">Privacy Policy</Link></li>
                <li><Link href="/cookie-policy" className="hover:text-guardian-orange-400 transition">Cookie Policy</Link></li>
                <li><Link href="/terms-and-conditions" className="hover:text-guardian-orange-400 transition">Terms & Conditions</Link></li>
                <li><Link href="/refund-policy" className="hover:text-guardian-orange-400 transition">Refund Policy</Link></li>
                <li><Link href="/complaints" className="hover:text-guardian-orange-400 transition">Complaints</Link></li>
                <li><Link href="/acceptable-use" className="hover:text-guardian-orange-400 transition">Acceptable Use</Link></li>
                <li><Link href="/accessibility-statement" className="hover:text-guardian-orange-400 transition">Accessibility</Link></li>
                <li>
                  <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="hover:text-guardian-orange-400 transition">
                    ICO Registration
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Compliance</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-guardian-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>UK GDPR Compliant</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-guardian-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>RIDDOR 2013</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-guardian-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>CDM 2015</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-guardian-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>ISO 27001 Ready</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <div className="text-xs text-slate-500 mb-4 space-y-2">
              <p>
                <strong className="text-slate-400">Registered Office:</strong> [Insert Registered Office Address]
              </p>
              <p>
                <strong className="text-slate-400">Contact:</strong>{' '}
                <a href="mailto:info@guardianmedics.co.uk" className="text-guardian-orange-400 hover:text-guardian-orange-300">
                  info@guardianmedics.co.uk
                </a>
                {' '} | {' '}
                <a href="tel:+44XXXXXXXXXX" className="text-guardian-orange-400 hover:text-guardian-orange-300">
                  +44 (0) XXXX XXXXXX
                </a>
              </p>
              <p>
                <strong className="text-slate-400">ICO Registration:</strong> [Insert ICO Registration Number] |{' '}
                <strong className="text-slate-400">Data Hosting:</strong> UK (London) |{' '}
                <strong className="text-slate-400">PCI DSS:</strong> Compliant via Stripe
              </p>
            </div>
            <div className="text-sm text-center text-slate-500">
              <p>&copy; 2026 Guardian Medics Ltd. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
