import Link from 'next/link';

export default function Pricing() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">SiteMedic</Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-900 hover:text-blue-600">Home</Link>
              <Link href="/pricing" className="text-gray-900 hover:text-blue-600 font-semibold">Pricing</Link>
              <Link href="#contact" className="text-gray-900 hover:text-blue-600">Contact</Link>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Premium medic service + automatic compliance dashboard. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Tier */}
            <div className="border-2 border-gray-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic Medic</h3>
              <p className="text-gray-600 mb-6">Traditional medic service without tech</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">£30</span>
                <span className="text-gray-600">/hour</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-600">HCPC-registered paramedic</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-600">On-site first aid coverage</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span className="text-gray-400">Digital treatment logging</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span className="text-gray-400">Compliance dashboard</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span className="text-gray-400">RIDDOR auto-flagging</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span className="text-gray-400">Weekly PDF reports</span>
                </li>
              </ul>
              <button className="w-full border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition">
                Standard Booking
              </button>
            </div>

            {/* SiteMedic Pro (Recommended) */}
            <div className="border-2 border-blue-600 rounded-lg p-8 relative">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
                Recommended
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">SiteMedic Pro</h3>
              <p className="text-gray-600 mb-6">Medic + automatic compliance</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-blue-600">£42</span>
                <span className="text-gray-600">/hour</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900 font-medium">Everything in Basic, plus:</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">60-second digital treatment logging</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Real-time compliance dashboard</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">RIDDOR auto-flagging</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Weekly PDF safety reports</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Offline-first mobile app</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Photo evidence & digital signatures</span>
                </li>
              </ul>
              <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="border-2 border-gray-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">Multi-site teams & custom integrations</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900 font-medium">Everything in Pro, plus:</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Multi-project management</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Cross-site analytics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Custom branding</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">API access</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">Dedicated account manager</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-900">SLA guarantee</span>
                </li>
              </ul>
              <button className="w-full border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Calculator */}
      <section className="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">The Real Cost of Manual Compliance</h2>
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-900 font-medium">Traditional medic service (8hr shift)</span>
                <span className="text-gray-900">£240</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-900 font-medium">Admin time for compliance (2hrs @ £20/hr)</span>
                <span className="text-gray-900">£40</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-900 font-medium">Risk of missed RIDDOR deadline</span>
                <span className="text-red-600">£££</span>
              </div>
              <div className="flex justify-between items-center font-bold text-lg pt-2">
                <span className="text-gray-900">Traditional Total Cost</span>
                <span className="text-gray-900">£280+</span>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t-2 border-blue-600">
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-blue-600">SiteMedic Pro (8hr shift)</span>
                <span className="text-blue-600">£336</span>
              </div>
              <p className="text-gray-600 mt-4">
                Zero admin time. Zero RIDDOR risk. Audit-ready reports every week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What's included in the £42/hour rate?</h3>
              <p className="text-gray-600">
                You get a qualified HCPC-registered paramedic on-site, plus full access to the SiteMedic platform
                (mobile app for medics, web dashboard for managers, automatic RIDDOR flagging, weekly PDF reports).
                No separate software fees.
              </p>
            </div>
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Is there a minimum booking?</h3>
              <p className="text-gray-600">
                Standard minimum is 8 hours. For shorter shifts or emergency cover, contact us for custom pricing.
              </p>
            </div>
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I try it before committing?</h3>
              <p className="text-gray-600">
                Yes! Book your first shift at standard rate—we'll provide full platform access. If you're not satisfied,
                we'll refund the £12/hour technology premium.
              </p>
            </div>
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you charge for the dashboard separately?</h3>
              <p className="text-gray-600">
                No. The compliance dashboard, mobile app, PDF reports, and all features are included in the hourly rate.
                No hidden fees or per-user charges.
              </p>
            </div>
            <div className="pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What if there's no mobile signal on site?</h3>
              <p className="text-gray-600">
                The app works 100% offline. All treatment logging, photos, and safety checks happen locally on the
                medic's iPhone. Data syncs automatically when connectivity returns—zero data loss guaranteed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-600 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Save Time on Compliance?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Book your first SiteMedic-enabled shift and see the difference.
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition">
            Book a Medic
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">SiteMedic</h3>
              <p className="text-sm">Automatic compliance for construction site medics.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
                <li><Link href="#" className="hover:text-white">GDPR</Link></li>
                <li><Link href="#" className="hover:text-white">Data Processing</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            <p>&copy; 2026 SiteMedic. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
