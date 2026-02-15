import Link from 'next/link';

export const metadata = {
  title: 'Cookie Policy | SiteMedic',
  description: 'Learn about how SiteMedic uses cookies and how you can manage your cookie preferences.',
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              SiteMedic
            </Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> 15 February 2026
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you
              visit a website. They help websites remember your preferences, improve your experience, and provide
              analytics to website owners.
            </p>
            <p className="text-gray-700 mb-4">
              Cookies can be:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Session cookies:</strong> Temporary cookies that expire when you close your browser</li>
              <li><strong>Persistent cookies:</strong> Cookies that remain on your device for a set period or until you delete them</li>
              <li><strong>First-party cookies:</strong> Set by the website you're visiting (SiteMedic)</li>
              <li><strong>Third-party cookies:</strong> Set by external services (e.g., analytics providers)</li>
            </ul>
          </section>

          {/* How We Use Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How SiteMedic Uses Cookies</h2>
            <p className="text-gray-700 mb-4">
              We use cookies to provide essential website functionality and, with your consent, to improve your
              experience and analyze site usage. We comply with the UK Privacy and Electronic Communications
              Regulations (PECR) and UK GDPR.
            </p>
          </section>

          {/* Types of Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Types of Cookies We Use</h2>

            {/* Strictly Necessary */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">3.1 Strictly Necessary Cookies</h3>
                <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-full font-semibold">
                  Always Active
                </span>
              </div>
              <p className="text-gray-700 mb-4">
                These cookies are essential for the website to function and cannot be switched off.
                They are usually only set in response to actions you make, such as setting your privacy preferences,
                logging in, or filling in forms.
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Cookie Name</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Purpose</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">cookie-consent</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Stores your cookie preferences</td>
                      <td className="px-4 py-2 text-sm text-gray-700">12 months</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">session-token</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Authentication and session management</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Session</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">csrf-token</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Security protection against CSRF attacks</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-gray-600 mt-4">
                <strong>Legal Basis:</strong> Legitimate interest (essential for website functionality)
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">3.2 Analytics Cookies</h3>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                  Requires Consent
                </span>
              </div>
              <p className="text-gray-700 mb-4">
                These cookies help us understand how visitors interact with our website by collecting and
                reporting information anonymously. They help us improve the website's performance and user experience.
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Cookie Name</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Purpose</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">_ga</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Google Analytics - distinguishes users</td>
                      <td className="px-4 py-2 text-sm text-gray-700">2 years</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">_ga_*</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Google Analytics - session state</td>
                      <td className="px-4 py-2 text-sm text-gray-700">2 years</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">_gid</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Google Analytics - distinguishes users</td>
                      <td className="px-4 py-2 text-sm text-gray-700">24 hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-gray-600 mt-4">
                <strong>Legal Basis:</strong> Consent (you can opt-out at any time)
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Third-Party Provider:</strong> Google LLC (data processing agreement in place)
              </p>
            </div>

            {/* Marketing Cookies */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">3.3 Marketing Cookies</h3>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                  Requires Consent
                </span>
              </div>
              <p className="text-gray-700 mb-4">
                These cookies are used to track visitors across websites and display relevant advertisements.
                They help us measure the effectiveness of advertising campaigns and provide personalized content.
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Cookie Name</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Purpose</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">_fbp</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Facebook Pixel - ad targeting</td>
                      <td className="px-4 py-2 text-sm text-gray-700">3 months</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">_gcl_au</td>
                      <td className="px-4 py-2 text-sm text-gray-700">Google Ads - conversion tracking</td>
                      <td className="px-4 py-2 text-sm text-gray-700">3 months</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-gray-600 mt-4">
                <strong>Legal Basis:</strong> Consent (you can opt-out at any time)
              </p>
            </div>
          </section>

          {/* Managing Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How to Manage Your Cookie Preferences</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Cookie Banner</h3>
            <p className="text-gray-700 mb-4">
              When you first visit our website, you'll see a cookie banner where you can:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Accept All:</strong> Consent to all cookies (necessary, analytics, and marketing)</li>
              <li><strong>Necessary Only:</strong> Accept only essential cookies required for the website to function</li>
              <li><strong>Customize:</strong> Choose which types of cookies you want to accept</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Change Your Preferences Anytime</h3>
            <p className="text-gray-700 mb-4">
              You can change your cookie preferences at any time by:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Clearing your browser's cookies and revisiting the site</li>
              <li>Using your browser's privacy settings to block specific cookies</li>
              <li>Contacting us at <a href="mailto:privacy@sitemedic.co.uk" className="text-blue-600 hover:underline">privacy@sitemedic.co.uk</a></li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Browser Settings</h3>
            <p className="text-gray-700 mb-4">
              You can also control cookies through your browser settings:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>
                <strong>Google Chrome:</strong>{' '}
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Manage cookies in Chrome
                </a>
              </li>
              <li>
                <strong>Mozilla Firefox:</strong>{' '}
                <a
                  href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Manage cookies in Firefox
                </a>
              </li>
              <li>
                <strong>Safari:</strong>{' '}
                <a
                  href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Manage cookies in Safari
                </a>
              </li>
              <li>
                <strong>Microsoft Edge:</strong>{' '}
                <a
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Manage cookies in Edge
                </a>
              </li>
            </ul>

            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">⚠️ Important Note</p>
              <p className="text-gray-700">
                Blocking all cookies may affect your ability to use certain features of our website.
                Strictly necessary cookies cannot be disabled as they are essential for the website to function.
              </p>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-Party Cookies</h2>
            <p className="text-gray-700 mb-4">
              Some cookies are placed by third-party services that appear on our pages. We do not control these
              cookies, and you should check the third-party websites for more information:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>
                <strong>Google Analytics:</strong>{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <strong>Facebook Pixel:</strong>{' '}
                <a
                  href="https://www.facebook.com/privacy/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Meta Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          {/* Do Not Track */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Do Not Track (DNT) Signals</h2>
            <p className="text-gray-700 mb-4">
              Some browsers support "Do Not Track" (DNT) signals. Currently, there is no industry standard for how
              websites should respond to DNT signals. We respect your privacy choices and honor your cookie preferences
              set through our cookie banner.
            </p>
          </section>

          {/* Mobile Apps */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Mobile App Data Storage</h2>
            <p className="text-gray-700 mb-4">
              The SiteMedic mobile app does not use browser cookies. Instead, it stores data locally on your device
              using secure storage mechanisms (iOS Keychain, Android Keystore). This data is encrypted and never
              shared with third parties without your consent.
            </p>
          </section>

          {/* Updates */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Updates to This Cookie Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Cookie Policy from time to time to reflect changes in our cookie usage or legal
              requirements. The "Last Updated" date at the top of this page shows when the policy was last revised.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about our use of cookies, please contact us:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-900"><strong>Email:</strong> <a href="mailto:privacy@sitemedic.co.uk" className="text-blue-600 hover:underline">privacy@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>Address:</strong> [Registered Office Address]</p>
            </div>
          </section>

          {/* More Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. More Information About Cookies</h2>
            <p className="text-gray-700 mb-4">
              For more information about cookies and how they work, visit:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>
                <a
                  href="https://ico.org.uk/for-the-public/online/cookies/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  ICO: Cookies - Information Commissioner's Office
                </a>
              </li>
              <li>
                <a
                  href="https://www.allaboutcookies.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  All About Cookies
                </a>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between text-sm">
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="text-blue-600 hover:underline">
              Terms and Conditions
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
