import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

export const metadata = {
  title: 'Privacy Policy',
  description: 'SiteMedic Privacy Policy - How we collect, use, and protect your personal data in compliance with UK GDPR.',
};

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> 15 February 2026
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              SiteMedic ("we", "our", or "us") is committed to protecting your privacy and personal data.
              This Privacy Policy explains how we collect, use, store, and protect your information in compliance
              with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>
            <p className="text-gray-700 mb-4">
              SiteMedic provides medical treatment logging and compliance software for construction site medics.
              We process <strong>special category data</strong> (health information) under UK GDPR Article 9,
              which requires your explicit consent and additional safeguards.
            </p>
          </section>

          {/* Data Controller */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Data Controller</h2>
            <p className="text-gray-700 mb-2">
              The data controller responsible for your personal data is:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="text-gray-900"><strong>SiteMedic Ltd</strong></p>
              <p className="text-gray-700">[Registered Office Address]</p>
              <p className="text-gray-700">Company Number: [Company Registration Number]</p>
              <p className="text-gray-700">ICO Registration Number: [ICO Registration Number]</p>
              <p className="text-gray-700">Email: <a href="mailto:privacy@sitemedic.co.uk" className="text-blue-600 hover:underline">privacy@sitemedic.co.uk</a></p>
            </div>
          </section>

          {/* Data We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Personal Data</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Account information (name, email address, phone number)</li>
              <li>Company details (employer, site location, role)</li>
              <li>Authentication data (password hash, session tokens)</li>
              <li>Device information (device ID, operating system, app version)</li>
              <li>Usage data (app interactions, feature usage, sync activity)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Special Category Data (Health Data)</h3>
            <p className="text-gray-700 mb-2">
              <strong>We process sensitive health information with your explicit consent, including:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Worker health profiles (medical history, allergies, emergency contacts)</li>
              <li>Treatment records (injury details, treatment provided, outcomes)</li>
              <li>Photo evidence of injuries and near-misses</li>
              <li>RIDDOR reportable incidents</li>
              <li>Certification records (first aid, medical qualifications)</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Health data is processed under UK GDPR Article 9(2)(h) - necessary for medical diagnosis,
              healthcare treatment, or management of healthcare systems.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Data We Do NOT Collect</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>We do not track your precise GPS location (only site location you manually enter)</li>
              <li>We do not access your contacts, photos, or other apps without permission</li>
              <li>We do not sell your data to third parties</li>
            </ul>
          </section>

          {/* How We Use Data */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Use Your Data</h2>
            <p className="text-gray-700 mb-4">
              We use your personal data for the following purposes:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Service Delivery (Legal Basis: Contract Performance)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Provide the SiteMedic mobile app and web dashboard</li>
              <li>Synchronize treatment records across devices</li>
              <li>Generate compliance reports and PDFs</li>
              <li>Enable offline functionality</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Health & Safety Compliance (Legal Basis: Legal Obligation)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>RIDDOR 2013 compliance (reporting serious workplace injuries to HSE)</li>
              <li>CDM 2015 compliance (construction safety regulations)</li>
              <li>Maintain audit-ready records for HSE inspections</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Product Improvement (Legal Basis: Legitimate Interest)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Analyze app performance and fix bugs</li>
              <li>Improve user experience based on usage patterns</li>
              <li>Develop new features based on aggregated data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.4 Communication (Legal Basis: Consent or Legitimate Interest)</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Send transactional emails (password resets, weekly reports)</li>
              <li>Notify you of critical updates or security issues</li>
              <li>Respond to your support requests</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Third Parties</h2>
            <p className="text-gray-700 mb-4">
              We share your data only when necessary with the following third parties:
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">UK/EU Data Processors (UK GDPR Compliant)</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Supabase (PostgreSQL Hosting):</strong> UK region (eu-west-2 London), EU-owned company, DPA in place</li>
                <li><strong>Vercel (Website Hosting):</strong> Edge network with UK data residency, DPA in place</li>
                <li><strong>Stripe (Payment Processing):</strong> PCI-DSS compliant, UK entity, DPA in place</li>
              </ul>
            </div>

            <p className="text-gray-700 mb-4">
              <strong>We do NOT transfer data outside the UK/EU.</strong> All data is stored and processed
              exclusively in UK-based servers (London region).
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 HSE Reporting</h3>
            <p className="text-gray-700 mb-4">
              RIDDOR-reportable incidents are shared with the Health and Safety Executive (HSE) as required by law.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Site Managers and Employers</h3>
            <p className="text-gray-700 mb-4">
              Treatment logs and compliance reports are accessible to site managers and employers who have
              a legitimate interest in workplace health and safety data.
            </p>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Encryption at Rest:</strong> AES-256 encryption for all database records</li>
              <li><strong>Encryption in Transit:</strong> TLS 1.3 for all network communication</li>
              <li><strong>Secure Authentication:</strong> Bcrypt password hashing, biometric authentication (Face ID/Touch ID)</li>
              <li><strong>Access Controls:</strong> Row-Level Security (RLS) policies ensure data isolation between accounts</li>
              <li><strong>Audit Logging:</strong> All data access and modifications are logged</li>
              <li><strong>Offline Security:</strong> Local database encryption using iOS Keychain</li>
              <li><strong>Regular Security Audits:</strong> Penetration testing and vulnerability assessments</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your data for as long as necessary to provide services and comply with legal obligations:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Treatment Records:</strong> 3 years (RIDDOR requirement)</li>
              <li><strong>Certification Records:</strong> Until expiry + 1 year</li>
              <li><strong>Account Data:</strong> Until account deletion + 30 days (backup retention)</li>
              <li><strong>Audit Logs:</strong> 6 years (UK tax law requirement)</li>
            </ul>
            <p className="text-gray-700 mb-4">
              After the retention period, data is securely deleted using irreversible methods.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Rights Under UK GDPR</h2>
            <p className="text-gray-700 mb-4">You have the following rights:</p>

            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Access (Article 15)</h4>
                <p className="text-gray-700">Request a copy of all personal data we hold about you.</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Rectification (Article 16)</h4>
                <p className="text-gray-700">Correct inaccurate or incomplete data.</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Erasure / "Right to be Forgotten" (Article 17)</h4>
                <p className="text-gray-700">Request deletion of your data (subject to legal retention requirements).</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Restrict Processing (Article 18)</h4>
                <p className="text-gray-700">Limit how we use your data while a complaint is resolved.</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Data Portability (Article 20)</h4>
                <p className="text-gray-700">Receive your data in a machine-readable format (CSV, JSON).</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Object (Article 21)</h4>
                <p className="text-gray-700">Object to processing based on legitimate interests.</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Right to Withdraw Consent</h4>
                <p className="text-gray-700">Withdraw consent for health data processing at any time.</p>
              </div>
            </div>

            <p className="text-gray-700 mt-4">
              To exercise these rights, email us at{' '}
              <a href="mailto:privacy@sitemedic.co.uk" className="text-blue-600 hover:underline font-semibold">
                privacy@sitemedic.co.uk
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          {/* Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-4">
              We use cookies to provide essential website functionality. For detailed information about our cookies,
              please see our{' '}
              <Link href="/cookie-policy" className="text-blue-600 hover:underline font-semibold">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              SiteMedic is not intended for use by individuals under 18 years of age.
              We do not knowingly collect data from children.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email
              or in-app notification. Continued use of SiteMedic after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Complaints */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Complaints and Supervisory Authority</h2>
            <p className="text-gray-700 mb-4">
              If you have concerns about how we handle your data, please contact us first at{' '}
              <a href="mailto:privacy@sitemedic.co.uk" className="text-blue-600 hover:underline">
                privacy@sitemedic.co.uk
              </a>
              .
            </p>
            <p className="text-gray-700 mb-4">
              You have the right to lodge a complaint with the UK supervisory authority:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-gray-900 font-semibold">Information Commissioner's Office (ICO)</p>
              <p className="text-gray-700">Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://ico.org.uk</a></p>
              <p className="text-gray-700">Phone: 0303 123 1113</p>
              <p className="text-gray-700">Address: Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              For questions about this Privacy Policy or data protection matters:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-900"><strong>Email:</strong> <a href="mailto:privacy@sitemedic.co.uk" className="text-blue-600 hover:underline">privacy@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>Data Protection Officer:</strong> <a href="mailto:dpo@sitemedic.co.uk" className="text-blue-600 hover:underline">dpo@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>Address:</strong> [Registered Office Address]</p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between text-sm">
            <Link href="/cookie-policy" className="text-blue-600 hover:underline">
              Cookie Policy
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
