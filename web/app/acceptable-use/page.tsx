import Link from 'next/link';

export const metadata = {
  title: 'Acceptable Use Policy | SiteMedic',
  description: 'Guidelines for acceptable use of SiteMedic services and prohibited activities.',
};

export default function AcceptableUsePolicy() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Acceptable Use Policy</h1>
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> 15 February 2026
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              This Acceptable Use Policy ("AUP") sets out the rules governing your use of SiteMedic's
              services, including our website, mobile application, and all associated platforms
              (collectively, the "Services").
            </p>
            <p className="text-gray-700 mb-4">
              By using the Services, you agree to comply with this AUP. Violation of this policy may result
              in suspension or termination of your account, reporting to law enforcement authorities, and
              potential legal action.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">Why We Have This Policy</p>
              <p className="text-gray-700">
                This policy protects our users, maintains service quality, ensures legal compliance,
                and safeguards sensitive health data processed through our platform.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">
              You may use the Services only for lawful purposes and in accordance with:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>This Acceptable Use Policy</li>
              <li>Our <Link href="/terms-and-conditions" className="text-blue-600 hover:underline">Terms and Conditions</Link></li>
              <li>Our <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link></li>
              <li>All applicable UK laws and regulations</li>
              <li>Your professional obligations (if you are a medical professional)</li>
            </ul>
          </section>

          {/* Prohibited Activities */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Prohibited Activities</h2>
            <p className="text-gray-700 mb-4">
              You must not use the Services for any of the following prohibited activities:
            </p>

            {/* Illegal Activities */}
            <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Illegal or Fraudulent Activities</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Any activity that violates UK law or regulations</li>
                <li>Fraud, identity theft, or impersonation</li>
                <li>Money laundering or terrorist financing</li>
                <li>Submitting false RIDDOR reports to the HSE</li>
                <li>Insurance fraud (falsifying treatment records for claims)</li>
                <li>Unauthorized practice of medicine</li>
                <li>Violation of professional licensing requirements</li>
              </ul>
            </div>

            {/* Data Misuse */}
            <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Data Misuse and Privacy Violations</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Accessing, using, or disclosing patient data without proper authorization</li>
                <li>Violating UK GDPR or Data Protection Act 2018</li>
                <li>Sharing login credentials or allowing unauthorized access to accounts</li>
                <li>Exporting patient data for unauthorized purposes</li>
                <li>Collecting or harvesting data through automated means (scraping)</li>
                <li>Selling or distributing patient data to third parties</li>
                <li>Using data for marketing without proper consent</li>
              </ul>
            </div>

            {/* System Abuse */}
            <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 System Abuse and Security Violations</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Attempting to gain unauthorized access to systems or accounts</li>
                <li>Introducing malware, viruses, or harmful code</li>
                <li>Conducting security testing or penetration testing without written permission</li>
                <li>Interfering with or disrupting the Services or servers</li>
                <li>Circumventing security measures or access controls</li>
                <li>Reverse engineering, decompiling, or disassembling the software</li>
                <li>Overloading systems with excessive requests (denial of service)</li>
                <li>Exploiting software vulnerabilities for personal gain</li>
              </ul>
            </div>

            {/* Content Abuse */}
            <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.4 Content and Communication Abuse</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Uploading false, inaccurate, or misleading medical information</li>
                <li>Harassing, threatening, or abusing other users or staff</li>
                <li>Posting offensive, defamatory, or discriminatory content</li>
                <li>Infringing intellectual property rights (copyright, trademarks)</li>
                <li>Sending spam or unsolicited marketing communications</li>
                <li>Creating fake accounts or impersonating others</li>
              </ul>
            </div>

            {/* Commercial Misuse */}
            <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.5 Commercial Misuse</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Reselling or sublicensing the Services without authorization</li>
                <li>Using the Services to compete with SiteMedic</li>
                <li>Building a similar product using our platform or data</li>
                <li>Removing or modifying proprietary notices or branding</li>
                <li>Using the Services for purposes other than intended (e.g., construction site medical logging)</li>
              </ul>
            </div>

            {/* Professional Misconduct */}
            <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.6 Professional Misconduct (Medical Professionals)</h3>
              <p className="text-gray-700 mb-2">
                If you are a medical professional using the Services, you must not:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Practice outside your scope of qualifications or license</li>
                <li>Provide treatment while impaired by alcohol, drugs, or fatigue</li>
                <li>Fail to maintain professional indemnity insurance</li>
                <li>Violate patient confidentiality or consent requirements</li>
                <li>Falsify treatment records or patient outcomes</li>
                <li>Provide substandard care or negligent treatment</li>
                <li>Fail to report RIDDOR-reportable incidents as required by law</li>
              </ul>
            </div>
          </section>

          {/* Reporting */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Reporting Violations</h2>
            <p className="text-gray-700 mb-4">
              If you become aware of any violation of this Acceptable Use Policy, please report it immediately:
            </p>

            <div className="bg-gray-100 p-6 rounded-lg mb-4">
              <p className="text-gray-900 mb-2"><strong>Security Issues:</strong> <a href="mailto:security@sitemedic.co.uk" className="text-blue-600 hover:underline">security@sitemedic.co.uk</a></p>
              <p className="text-gray-900 mb-2"><strong>Abuse Reports:</strong> <a href="mailto:abuse@sitemedic.co.uk" className="text-blue-600 hover:underline">abuse@sitemedic.co.uk</a></p>
              <p className="text-gray-900 mb-2"><strong>Data Protection Concerns:</strong> <a href="mailto:dpo@sitemedic.co.uk" className="text-blue-600 hover:underline">dpo@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>General Support:</strong> <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a></p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">⚠️ For Serious Incidents</p>
              <p className="text-gray-700">
                If you witness a serious clinical incident, patient safety issue, or immediate threat,
                contact emergency services (999) first, then notify us immediately at{' '}
                <a href="mailto:emergency@sitemedic.co.uk" className="text-blue-600 hover:underline">emergency@sitemedic.co.uk</a>
              </p>
            </div>
          </section>

          {/* Consequences */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Consequences of Violations</h2>
            <p className="text-gray-700 mb-4">
              Violations of this Acceptable Use Policy may result in:
            </p>

            <div className="space-y-4">
              <div className="bg-white border-l-4 border-yellow-600 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Warning</h4>
                <p className="text-gray-700 text-sm">
                  For minor or first-time violations, we may issue a formal warning and require corrective action.
                </p>
              </div>

              <div className="bg-white border-l-4 border-orange-600 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Account Suspension</h4>
                <p className="text-gray-700 text-sm">
                  For repeated or moderate violations, we may temporarily suspend your account while investigating.
                  Suspension typically lasts 7-30 days.
                </p>
              </div>

              <div className="bg-white border-l-4 border-red-600 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Account Termination</h4>
                <p className="text-gray-700 text-sm">
                  For serious violations (fraud, data theft, patient harm), we will immediately terminate your
                  account with no refund. You may be permanently banned from using SiteMedic services.
                </p>
              </div>

              <div className="bg-white border-l-4 border-purple-600 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Legal Action</h4>
                <p className="text-gray-700 text-sm">
                  We may report criminal activity to law enforcement (police, HSE, ICO, professional regulators).
                  We reserve the right to pursue civil litigation for damages.
                </p>
              </div>

              <div className="bg-white border-l-4 border-gray-600 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Professional Reporting</h4>
                <p className="text-gray-700 text-sm">
                  If you are a medical professional, serious violations may be reported to:
                  General Medical Council (GMC), Nursing and Midwifery Council (NMC), Health and Care Professions Council (HCPC),
                  or other relevant professional bodies.
                </p>
              </div>
            </div>
          </section>

          {/* Monitoring */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Monitoring and Enforcement</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Our Right to Monitor</h3>
            <p className="text-gray-700 mb-4">
              We reserve the right to monitor use of the Services to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Ensure compliance with this AUP and our Terms and Conditions</li>
              <li>Prevent fraud, security breaches, and illegal activity</li>
              <li>Protect patient safety and data privacy</li>
              <li>Comply with legal obligations (court orders, HSE investigations)</li>
              <li>Improve service quality and identify technical issues</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Automated Monitoring</h3>
            <p className="text-gray-700 mb-4">
              We use automated systems to detect:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Suspicious login patterns (account compromise attempts)</li>
              <li>Unusual data access patterns (potential data breaches)</li>
              <li>High-risk content (false RIDDOR reports, fraudulent records)</li>
              <li>System abuse (excessive API calls, scraping attempts)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.3 Human Review</h3>
            <p className="text-gray-700 mb-4">
              Our compliance team may manually review:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Flagged accounts or suspicious activity</li>
              <li>User-reported violations</li>
              <li>Random sample audits for quality assurance</li>
              <li>Accounts subject to legal investigations</li>
            </ul>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">Privacy Commitment</p>
              <p className="text-gray-700">
                All monitoring is conducted in accordance with our{' '}
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                {' '}and UK GDPR. We only access account data when necessary for enforcement, security,
                or legal compliance.
              </p>
            </div>
          </section>

          {/* Changes */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Changes to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Acceptable Use Policy from time to time to reflect changes in:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>UK laws and regulations</li>
              <li>Industry best practices and standards</li>
              <li>New types of abuse or security threats</li>
              <li>Service features and capabilities</li>
            </ul>

            <p className="text-gray-700 mb-4">
              We will notify you of significant changes via email or in-app notification at least 30 days
              before they take effect. Continued use of the Services after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          {/* Questions */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Questions and Clarifications</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Acceptable Use Policy or need clarification about whether
              a specific activity is permitted:
            </p>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-900"><strong>Email:</strong> <a href="mailto:legal@sitemedic.co.uk" className="text-blue-600 hover:underline">legal@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>Support:</strong> <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>Phone:</strong> <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a></p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mt-4">
              <p className="text-gray-900 font-semibold mb-2">⚠️ When in Doubt, Ask</p>
              <p className="text-gray-700">
                If you're unsure whether an activity violates this policy, contact us before proceeding.
                We're happy to provide guidance and clarification to help you stay compliant.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between text-sm">
            <Link href="/terms-and-conditions" className="text-blue-600 hover:underline">
              Terms and Conditions
            </Link>
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
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
