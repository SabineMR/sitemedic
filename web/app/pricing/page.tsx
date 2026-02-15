import Link from 'next/link';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              {/* Logo */}
              <div className="w-10 h-10 bg-gradient-to-br from-guardian-navy-900 to-guardian-navy-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <Link href="/" className="text-2xl font-bold text-guardian-navy-900">
                Guardian Medics
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-slate-700 hover:text-guardian-navy-900 font-medium transition">
                Home
              </Link>
              <Link href="/pricing" className="text-guardian-navy-900 font-semibold border-b-2 border-guardian-orange-500">
                Pricing
              </Link>
              <Link href="#contact" className="text-slate-700 hover:text-guardian-navy-900 font-medium transition">
                Contact
              </Link>
              <button className="bg-guardian-orange-500 text-white px-6 py-2.5 rounded-lg hover:bg-guardian-orange-600 font-semibold transition shadow-md hover:shadow-lg">
                Book a Medic
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-guardian-orange-100 text-guardian-orange-700 px-4 py-2 rounded-full mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">Transparent Pricing • No Hidden Fees</span>
          </div>
          <h1 className="text-5xl font-bold text-guardian-navy-900 mb-4">
            Simple, Honest Pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Premium paramedic service + automatic compliance dashboard. One hourly rate, everything included.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Medic */}
            <div className="bg-white rounded-2xl shadow-guardian p-8 border-2 border-slate-200 hover:border-slate-300 transition">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Basic Medic</h3>
                <p className="text-slate-600">Traditional service without tech</p>
              </div>
              <div className="text-center mb-8">
                <div className="flex items-start justify-center">
                  <span className="text-2xl font-bold text-slate-900 mt-2">£</span>
                  <span className="text-6xl font-bold text-slate-900">30</span>
                  <span className="text-slate-600 mt-8 ml-2">/hour</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700">HCPC-registered paramedic</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700">On-site first aid coverage</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-400">Digital treatment logging</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-400">Compliance dashboard</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-400">RIDDOR auto-flagging</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-slate-400">Weekly PDF reports</span>
                </li>
              </ul>
              <button className="w-full border-2 border-slate-300 text-slate-900 px-6 py-3 rounded-lg font-semibold hover:border-guardian-navy-500 hover:text-guardian-navy-900 transition">
                Standard Booking
              </button>
            </div>

            {/* Guardian Medics Pro (Recommended) */}
            <div className="bg-gradient-to-br from-guardian-navy-900 to-guardian-navy-800 rounded-2xl shadow-2xl p-8 border-2 border-guardian-orange-500 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-guardian-orange-500 to-guardian-orange-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  ⭐ RECOMMENDED
                </div>
              </div>

              <div className="text-center mb-6 mt-4">
                <h3 className="text-2xl font-bold text-white mb-2">Guardian Medics Pro</h3>
                <p className="text-slate-300">Medic + automatic compliance</p>
              </div>
              <div className="text-center mb-8">
                <div className="flex items-start justify-center">
                  <span className="text-2xl font-bold text-white mt-2">£</span>
                  <span className="text-6xl font-bold text-white">42</span>
                  <span className="text-slate-300 mt-8 ml-2">/hour</span>
                </div>
                <div className="mt-2 inline-flex items-center space-x-1 text-guardian-orange-400 text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">£12/hr tech premium</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-orange-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-white font-medium">Everything in Basic, plus:</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-100">60-second digital treatment logging</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-100">Real-time compliance dashboard</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-100">RIDDOR auto-flagging with deadlines</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-100">Weekly PDF safety reports</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-500 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-100">Offline-first mobile app</span>
                </li>
              </ul>
              <button className="w-full bg-guardian-orange-500 text-white px-6 py-4 rounded-lg font-bold hover:bg-guardian-orange-600 transition shadow-xl transform hover:-translate-y-0.5">
                Book a Guardian Medic
              </button>
              <div className="mt-4 pt-4 border-t border-white/20 text-center">
                <div className="text-xs text-slate-300">
                  Powered by <span className="font-semibold text-white">SiteMedic Platform</span>
                </div>
              </div>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl shadow-guardian p-8 border-2 border-slate-200 hover:border-guardian-navy-300 transition">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-guardian-navy-900 mb-2">Enterprise</h3>
                <p className="text-slate-600">Multi-site & custom integrations</p>
              </div>
              <div className="text-center mb-8">
                <div className="text-4xl font-bold text-guardian-navy-900">Custom</div>
                <p className="text-sm text-slate-600 mt-2">Contact us for pricing</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-navy-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-navy-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-900 font-medium">Everything in Pro, plus:</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Multi-project management</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Cross-site analytics</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Custom branding</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700">API access</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-guardian-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-guardian-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Dedicated account manager</span>
                </li>
              </ul>
              <button className="w-full border-2 border-guardian-navy-500 text-guardian-navy-900 px-6 py-3 rounded-lg font-semibold hover:bg-guardian-navy-900 hover:text-white transition">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Calculator */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-guardian-navy-900 mb-4">
              The Real Cost of Manual Compliance
            </h2>
            <p className="text-xl text-slate-600">
              See how much you're actually spending on admin work
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-guardian-lg p-8 lg:p-12">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-6 border-b-2 border-slate-200">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Traditional medic service</div>
                  <div className="text-sm text-slate-600">8-hour shift @ £30/hour</div>
                </div>
                <span className="text-2xl font-bold text-slate-900">£240</span>
              </div>

              <div className="flex justify-between items-center pb-6 border-b-2 border-slate-200">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Your admin time for compliance</div>
                  <div className="text-sm text-slate-600">2 hours @ £20/hour (site manager's time)</div>
                </div>
                <span className="text-2xl font-bold text-slate-900">£40</span>
              </div>

              <div className="flex justify-between items-center pb-6 border-b-2 border-slate-200">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Risk of missed RIDDOR deadline</div>
                  <div className="text-sm text-red-600">HSE fines + legal exposure</div>
                </div>
                <span className="text-2xl font-bold text-red-600">£££</span>
              </div>

              <div className="flex justify-between items-center pt-4">
                <div>
                  <div className="text-xl font-bold text-slate-900">Traditional Total Cost</div>
                  <div className="text-sm text-slate-600">Plus compliance risk</div>
                </div>
                <span className="text-3xl font-bold text-slate-900">£280+</span>
              </div>
            </div>

            <div className="mt-10 pt-10 border-t-4 border-guardian-orange-500 bg-gradient-to-br from-guardian-orange-50 to-white rounded-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-xl font-bold text-guardian-navy-900">Guardian Medics Pro</div>
                  <div className="text-sm text-slate-600">8-hour shift @ £42/hour</div>
                </div>
                <span className="text-4xl font-bold text-guardian-navy-900">£336</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-guardian-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-700">Zero admin time</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-guardian-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-700">Zero RIDDOR risk</span>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-guardian-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-700">Audit-ready reports</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-white rounded-lg border-2 border-guardian-green-200">
                <p className="text-sm text-center text-guardian-navy-900">
                  <strong className="text-guardian-green-700">Save £40 in admin time</strong> + eliminate compliance risk for just <strong className="text-guardian-orange-600">£56 more</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-guardian-navy-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-slate-600">Everything you need to know about Guardian Medics</p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-6 hover:shadow-guardian transition">
              <h3 className="text-lg font-bold text-guardian-navy-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-guardian-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                What's included in the £42/hour rate?
              </h3>
              <p className="text-slate-700 leading-relaxed">
                You get a qualified HCPC-registered paramedic on-site, plus full access to the Guardian Medics compliance platform powered by SiteMedic technology (mobile app for medics, web dashboard for managers, automatic RIDDOR flagging, weekly PDF reports). No separate software fees—everything is included.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 hover:shadow-guardian transition">
              <h3 className="text-lg font-bold text-guardian-navy-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-guardian-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Is there a minimum booking?
              </h3>
              <p className="text-slate-700 leading-relaxed">
                Standard minimum is 8 hours. For shorter shifts or emergency cover, contact us for custom pricing.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 hover:shadow-guardian transition">
              <h3 className="text-lg font-bold text-guardian-navy-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-guardian-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Can I try it before committing?
              </h3>
              <p className="text-slate-700 leading-relaxed">
                Yes! Book your first 8-hour shift at the standard £42/hour rate—we'll provide full platform access. If you're not satisfied with the compliance automation, we'll refund the £12/hour technology premium (you just pay the £30/hour medic rate).
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 hover:shadow-guardian transition">
              <h3 className="text-lg font-bold text-guardian-navy-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-guardian-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                What if there's no mobile signal on site?
              </h3>
              <p className="text-slate-700 leading-relaxed">
                The SiteMedic app works 100% offline. All treatment logging, photos, and safety checks happen locally on the medic's iPhone. Data syncs automatically when connectivity returns—zero data loss guaranteed.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 hover:shadow-guardian transition">
              <h3 className="text-lg font-bold text-guardian-navy-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-guardian-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                How does RIDDOR auto-flagging work?
              </h3>
              <p className="text-slate-700 leading-relaxed">
                When our medic logs a treatment, the SiteMedic platform automatically checks it against RIDDOR 2013 criteria. If it matches reportable criteria (e.g., over-7-day injury, specified injury), it's flagged with the appropriate HSE deadline. You get an alert and a pre-filled F2508 form—no guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-guardian-navy-900 via-guardian-navy-800 to-guardian-navy-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to Save Time on Compliance?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Book your first Guardian Medics shift and experience effortless compliance documentation.
          </p>
          <button className="bg-guardian-orange-500 text-white px-10 py-5 rounded-lg text-lg font-bold hover:bg-guardian-orange-600 transition shadow-2xl hover:shadow-guardian-orange-500/50 transform hover:-translate-y-1">
            Book a Medic Today
          </button>
          <p className="mt-6 text-sm text-slate-400">
            Money-back guarantee on the technology premium if not satisfied
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
