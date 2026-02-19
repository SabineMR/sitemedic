import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

export const metadata = {
  title: 'Accessibility Statement',
  description: 'SiteMedic\'s commitment to digital accessibility and WCAG 2.1 compliance.',
};

export default function AccessibilityStatement() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Accessibility Statement</h1>
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> 15 February 2026
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Commitment to Accessibility</h2>
            <p className="text-gray-700 mb-4">
              SiteMedic is committed to ensuring digital accessibility for people with disabilities.
              We are continually improving the user experience for everyone and applying the relevant
              accessibility standards to ensure we provide equal access to all our users.
            </p>
            <p className="text-gray-700 mb-4">
              This accessibility statement applies to the SiteMedic website (www.sitemedic.co.uk)
              and our mobile application for iOS.
            </p>
          </section>

          {/* Standards */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Accessibility Standards</h2>
            <p className="text-gray-700 mb-4">
              We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.
              These guidelines explain how to make web content more accessible for people with disabilities
              and user-friendly for everyone.
            </p>
            <p className="text-gray-700 mb-4">
              Our website aims to meet the following standards:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Perceivable:</strong> Information and user interface components must be presentable to users in ways they can perceive</li>
              <li><strong>Operable:</strong> User interface components and navigation must be operable</li>
              <li><strong>Understandable:</strong> Information and the operation of the user interface must be understandable</li>
              <li><strong>Robust:</strong> Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies</li>
            </ul>
          </section>

          {/* Measures */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Measures to Support Accessibility</h2>
            <p className="text-gray-700 mb-4">
              SiteMedic takes the following measures to ensure accessibility:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Include accessibility throughout our internal policies and procedures</li>
              <li>Integrate accessibility into our procurement practices</li>
              <li>Provide continual accessibility training for our staff</li>
              <li>Assign clear accessibility goals and responsibilities</li>
              <li>Employ formal accessibility quality assurance methods</li>
              <li>Conduct regular accessibility audits and testing</li>
            </ul>
          </section>

          {/* Features */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Accessibility Features</h2>
            <p className="text-gray-700 mb-4">
              Our website includes the following accessibility features:
            </p>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Keyboard Navigation</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Skip-to-content link for bypassing navigation</li>
                <li>All interactive elements accessible via keyboard</li>
                <li>Logical tab order throughout the site</li>
                <li>No keyboard traps that prevent navigation</li>
                <li>Visible focus indicators on all interactive elements</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Screen Reader Support</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Semantic HTML5 structure (headings, landmarks, lists)</li>
                <li>ARIA labels for complex interactive elements</li>
                <li>Descriptive link text (no "click here" links)</li>
                <li>Alternative text for images and icons</li>
                <li>Proper heading hierarchy (H1 through H3)</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Visual Accessibility</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>High contrast color scheme (WCAG AA compliant)</li>
                <li>Resizable text without loss of functionality (up to 200%)</li>
                <li>Clear, readable fonts with adequate spacing</li>
                <li>No content relies solely on color to convey information</li>
                <li>Sufficient white space and clear visual hierarchy</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Mobile Accessibility</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Responsive design that works on all screen sizes</li>
                <li>Touch targets are at least 44x44 pixels (iOS) or 48x48 pixels (Android)</li>
                <li>Orientation support (portrait and landscape)</li>
                <li>Pinch-to-zoom enabled on all pages</li>
                <li>VoiceOver (iOS) and TalkBack (Android) compatible</li>
              </ul>
            </div>
          </section>

          {/* Known Issues */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Known Limitations</h2>
            <p className="text-gray-700 mb-4">
              Despite our best efforts to ensure accessibility, there may be some limitations.
              Below are known issues we are working to resolve:
            </p>

            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">⚠️ Third-Party Content</p>
              <p className="text-gray-700 mb-2">
                Some third-party embedded content (e.g., maps, videos) may not be fully accessible.
                We are working with providers to improve accessibility.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Workaround:</strong> Contact us for alternative formats of third-party content.
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">⚠️ PDF Documents</p>
              <p className="text-gray-700 mb-2">
                Some downloadable PDF documents may not be fully accessible to screen readers.
                We are working to make all PDFs accessible.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Workaround:</strong> Contact us to request an accessible version of any document.
              </p>
            </div>

            <p className="text-gray-700 mb-4">
              We are actively working to address these issues and will provide updates as improvements are made.
            </p>
          </section>

          {/* Assistive Technologies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Compatible Assistive Technologies</h2>
            <p className="text-gray-700 mb-4">
              Our website is designed to be compatible with the following assistive technologies:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Screen Readers:</strong> JAWS, NVDA, VoiceOver, TalkBack</li>
              <li><strong>Screen Magnification:</strong> ZoomText, Windows Magnifier, macOS Zoom</li>
              <li><strong>Speech Recognition:</strong> Dragon NaturallySpeaking, Voice Control (iOS/macOS)</li>
              <li><strong>Keyboard Navigation:</strong> All standard keyboards and adaptive input devices</li>
              <li><strong>Browser Extensions:</strong> High contrast modes, reader views, text-to-speech</li>
            </ul>

            <p className="text-gray-700 mb-4">
              <strong>Tested Browsers:</strong> Chrome, Firefox, Safari, Microsoft Edge (latest versions)
            </p>
          </section>

          {/* Feedback */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Feedback and Contact Information</h2>
            <p className="text-gray-700 mb-4">
              We welcome your feedback on the accessibility of SiteMedic. Please let us know if you
              encounter accessibility barriers:
            </p>

            <div className="bg-blue-50 p-6 rounded-lg mb-4">
              <p className="text-gray-900 mb-2"><strong>Email:</strong> <a href="mailto:accessibility@sitemedic.co.uk" className="text-blue-600 hover:underline">accessibility@sitemedic.co.uk</a></p>
              <p className="text-gray-900 mb-2"><strong>Support Email:</strong> <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a></p>
              <p className="text-gray-900 mb-2"><strong>Address:</strong> [Registered Office Address]</p>
              <p className="text-gray-900"><strong>Response Time:</strong> We aim to respond within 5 business days</p>
            </div>

            <p className="text-gray-700 mb-4">
              When reporting an accessibility issue, please include:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>The page URL where you encountered the issue</li>
              <li>A description of the problem</li>
              <li>The assistive technology you were using (if applicable)</li>
              <li>Your browser and operating system</li>
            </ul>
          </section>

          {/* Alternative Access */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Alternative Access Methods</h2>
            <p className="text-gray-700 mb-4">
              If you are unable to access any content or functionality on our website, we offer the
              following alternative methods:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Phone Support</h4>
                <p className="text-gray-700">
                  Email us at <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a> for
                  assistance with booking, account management, or accessing information.
                </p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Email Support</h4>
                <p className="text-gray-700">
                  Email us at <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a> and
                  we will assist you with any task or provide information in an accessible format.
                </p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Alternative Formats</h4>
                <p className="text-gray-700">
                  We can provide documents and information in alternative formats such as:
                  Large print, audio recording, Braille, accessible PDF, or plain text.
                </p>
              </div>
            </div>
          </section>

          {/* Technical Specs */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Technical Specifications</h2>
            <p className="text-gray-700 mb-4">
              Accessibility of SiteMedic relies on the following technologies:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>HTML5</li>
              <li>WAI-ARIA (Accessible Rich Internet Applications)</li>
              <li>CSS3</li>
              <li>JavaScript (ES6+)</li>
            </ul>
            <p className="text-gray-700 mb-4">
              These technologies are relied upon for conformance with the accessibility standards used.
            </p>
          </section>

          {/* Assessment */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment and Testing</h2>
            <p className="text-gray-700 mb-4">
              SiteMedic assesses the accessibility of our digital platforms through:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Self-Evaluation:</strong> Regular internal accessibility audits</li>
              <li><strong>Automated Testing:</strong> Using tools like axe, WAVE, and Lighthouse</li>
              <li><strong>Manual Testing:</strong> Keyboard navigation testing, screen reader testing</li>
              <li><strong>User Testing:</strong> Feedback from users with disabilities</li>
            </ul>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">Latest Assessment</p>
              <p className="text-gray-700 mb-1"><strong>Date:</strong> 15 February 2026</p>
              <p className="text-gray-700 mb-1"><strong>Method:</strong> Self-evaluation + automated testing</p>
              <p className="text-gray-700"><strong>Result:</strong> WCAG 2.1 Level AA compliant (with noted exceptions)</p>
            </div>
          </section>

          {/* Enforcement */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Enforcement and Formal Complaints</h2>
            <p className="text-gray-700 mb-4">
              If you are not satisfied with our response to your accessibility concerns, you can escalate
              the matter to:
            </p>

            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="text-gray-900 font-semibold mb-2">Equality and Human Rights Commission (EHRC)</p>
              <p className="text-gray-700 mb-1">Website: <a href="https://www.equalityhumanrights.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.equalityhumanrights.com</a></p>
              <p className="text-gray-700">Phone: 0808 800 0082</p>
            </div>

            <p className="text-gray-700 mb-4">
              The EHRC is responsible for enforcing the Public Sector Bodies (Websites and Mobile Applications)
              (No. 2) Accessibility Regulations 2018 (the 'accessibility regulations').
            </p>
          </section>

          {/* Updates */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Updates to This Statement</h2>
            <p className="text-gray-700 mb-4">
              We regularly review and update this accessibility statement. This statement was last updated
              on <strong>15 February 2026</strong> and will be reviewed again by <strong>15 August 2026</strong>.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between text-sm">
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/cookie-policy" className="text-blue-600 hover:underline">
              Cookie Policy
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
