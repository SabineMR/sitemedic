import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-gray-200" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600" aria-label="SiteMedic Home">
                SiteMedic
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-900 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">
                Home
              </Link>
              <Link href="/pricing" className="text-gray-900 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">
                Pricing
              </Link>
              <Link href="#contact" className="text-gray-900 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">
                Contact
              </Link>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2" aria-label="Book a SiteMedic paramedic">
                Book a Medic
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8" aria-labelledby="hero-heading">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 id="hero-heading" className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
              Compliance Happens
              <span className="block text-blue-600">While You Work</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Book a SiteMedic paramedic for your construction site and get automatic compliance documentation included.
              Our medics use proprietary technology that creates RIDDOR-ready reports as they work—no separate admin required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-4 focus:ring-blue-300" aria-label="Book a SiteMedic paramedic for your construction site">
                Book a Medic
              </button>
              <button className="border-2 border-gray-300 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition focus:outline-none focus:ring-4 focus:ring-blue-300" aria-label="See how SiteMedic works">
                See How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8" aria-labelledby="problem-solution-heading">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 id="problem-solution-heading" className="text-3xl font-bold text-gray-900 mb-4">Traditional Medic Services</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>You book a medic, but you handle all the compliance paperwork</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Paper records are inconsistent and hard to audit</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>RIDDOR deadlines get missed in the chaos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>No real-time visibility into site safety</span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">SiteMedic Paramedics</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>HCPC-registered paramedics with embedded compliance tech</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Digital documentation happens as they work—zero admin for you</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>RIDDOR incidents auto-flagged with deadline tracking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Weekly PDF safety reports delivered to your inbox</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" aria-labelledby="benefits-heading">
        <div className="max-w-7xl mx-auto">
          <h2 id="benefits-heading" className="text-4xl font-bold text-center text-gray-900 mb-12">Built for Construction Sites</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Works Offline</h3>
              <p className="text-gray-600">Our medics capture everything on-site, even with zero signal. Data syncs automatically when connectivity returns.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Documentation</h3>
              <p className="text-gray-600">Our medics log every treatment digitally as they work. You get timestamped records within 60 seconds—no data entry for you.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">UK GDPR Compliant</h3>
              <p className="text-gray-600">UK-registered business, UK-hosted data, full compliance with health data regulations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto">
          <h2 id="how-it-works-heading" className="text-4xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Book Online</h3>
              <p className="text-gray-600">Choose your dates and site location. We match you with a qualified SiteMedic paramedic.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Medic On-Site</h3>
              <p className="text-gray-600">Our paramedic provides professional care and captures digital records as they work.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto-Compliance</h3>
              <p className="text-gray-600">RIDDOR incidents are flagged automatically with deadline tracking. Zero admin work for you.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Weekly Reports</h3>
              <p className="text-gray-600">Professional PDF safety reports delivered to your inbox every Friday—HSE audit-ready.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" aria-labelledby="compliance-heading">
        <div className="max-w-7xl mx-auto">
          <h2 id="compliance-heading" className="text-4xl font-bold text-center text-gray-900 mb-12">Built for UK Compliance</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-1">RIDDOR 2013</p>
              <p className="text-xs text-gray-600">Auto-flagging & reporting</p>
            </div>
            <div className="text-center p-6 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-1">UK GDPR</p>
              <p className="text-xs text-gray-600">Special category data handling</p>
            </div>
            <div className="text-center p-6 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-1">CDM 2015</p>
              <p className="text-xs text-gray-600">Construction safety compliance</p>
            </div>
            <div className="text-center p-6 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-1">HSE Audit-Ready</p>
              <p className="text-xs text-gray-600">Professional PDF reports</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 px-4 sm:px-6 lg:px-8" aria-labelledby="cta-heading">
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="cta-heading" className="text-4xl font-bold text-white mb-4">Ready for Effortless Compliance?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Book a SiteMedic paramedic and get professional care + automatic compliance reports—all included.
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-4 focus:ring-white" aria-label="Book a SiteMedic paramedic">
            Book a Medic
          </button>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">SiteMedic</h3>
              <p className="text-sm mb-4">UK paramedic staffing for construction sites—with built-in compliance technology.</p>
              {/* Company Information - Required by Electronic Commerce Regulations 2002 */}
              <div className="text-xs space-y-1">
                <p className="text-gray-500">SiteMedic Ltd</p>
                <p className="text-gray-500">Company No: [Insert Registration Number]</p>
                <p className="text-gray-500">VAT No: [Insert VAT Number]</p>
                <p className="text-gray-500">Registered in England and Wales</p>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
                <li><Link href="#contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/cookie-policy" className="hover:text-white">Cookie Policy</Link></li>
                <li><Link href="/terms-and-conditions" className="hover:text-white">Terms & Conditions</Link></li>
                <li>
                  <a
                    href="https://ico.org.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    ICO Registration
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Compliance</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>UK GDPR Compliant</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>RIDDOR 2013</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>CDM 2015</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>ISO 27001 Ready</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Company Information & Copyright */}
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="text-xs text-gray-500 mb-4">
              <p className="mb-2">
                <strong className="text-gray-400">Registered Office:</strong> [Insert Registered Office Address]
              </p>
              <p className="mb-2">
                <strong className="text-gray-400">Contact:</strong>{' '}
                <a href="mailto:info@sitemedic.co.uk" className="text-blue-400 hover:text-blue-300">
                  info@sitemedic.co.uk
                </a>
                {' '} | {' '}
                <a href="tel:+44XXXXXXXXXX" className="text-blue-400 hover:text-blue-300">
                  +44 (0) XXXX XXXXXX
                </a>
              </p>
              <p>
                <strong className="text-gray-400">ICO Registration:</strong> [Insert ICO Registration Number] |{' '}
                <strong className="text-gray-400">Data Hosting:</strong> UK (London) |{' '}
                <strong className="text-gray-400">PCI DSS:</strong> Compliant via Stripe
              </p>
            </div>
            <div className="text-sm text-center text-gray-400">
              <p>&copy; 2026 SiteMedic Ltd. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
