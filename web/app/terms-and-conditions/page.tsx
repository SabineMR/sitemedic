import Link from 'next/link';

export const metadata = {
  title: 'Terms and Conditions | SiteMedic',
  description: 'Terms and Conditions for using SiteMedic services and software.',
};

export default function TermsAndConditions() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms and Conditions</h1>
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> 15 February 2026
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to SiteMedic. These Terms and Conditions ("Terms") govern your use of the SiteMedic
              mobile application, website, and services (collectively, the "Service"). By accessing or using
              the Service, you agree to be bound by these Terms.
            </p>
            <p className="text-gray-700 mb-4">
              Please read these Terms carefully before using the Service. If you do not agree to these Terms,
              you must not use the Service.
            </p>
          </section>

          {/* Definitions */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>"We", "Us", "Our":</strong> SiteMedic Ltd, a company registered in England and Wales (Company Number: [Company Registration Number])</li>
              <li><strong>"You", "User":</strong> The individual or entity using the Service</li>
              <li><strong>"Service":</strong> The SiteMedic mobile app, website, and all associated services</li>
              <li><strong>"Content":</strong> Treatment records, photos, reports, and other data you create using the Service</li>
              <li><strong>"Medic":</strong> Healthcare professional using the Service to log treatments</li>
              <li><strong>"Site Manager":</strong> Construction site manager accessing compliance reports</li>
            </ul>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
            <p className="text-gray-700 mb-4">
              To use the Service, you must:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Be a qualified medical professional (for Medic accounts) or authorized site personnel (for Site Manager accounts)</li>
              <li>Have the legal capacity to enter into a binding contract</li>
              <li>Not be prohibited from using the Service under UK law</li>
            </ul>
            <p className="text-gray-700 mb-4">
              By using the Service, you represent and warrant that you meet these eligibility requirements.
            </p>
          </section>

          {/* Account Registration */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Account Registration and Security</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Account Creation</h3>
            <p className="text-gray-700 mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Account Responsibility</h3>
            <p className="text-gray-700 mb-4">
              You are responsible for all activities that occur under your account. We are not liable for any
              loss or damage arising from unauthorized use of your account.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Account Termination</h3>
            <p className="text-gray-700 mb-4">
              We reserve the right to suspend or terminate your account at any time, with or without notice,
              if we believe you have violated these Terms or engaged in fraudulent, illegal, or abusive conduct.
            </p>
          </section>

          {/* Use of Service */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Use of the Service</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 License Grant</h3>
            <p className="text-gray-700 mb-4">
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license
              to access and use the Service for your internal business purposes.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Acceptable Use</h3>
            <p className="text-gray-700 mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Use the Service in any way that violates UK laws or regulations</li>
              <li>Upload false, inaccurate, or misleading information</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems (bots, scrapers) to access the Service</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Remove or modify any copyright, trademark, or proprietary notices</li>
              <li>Use the Service to transmit malware, viruses, or harmful code</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.3 Professional Responsibility</h3>
            <p className="text-gray-700 mb-4">
              If you are a medical professional using the Service:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>You remain solely responsible for all clinical decisions and treatment provided</li>
              <li>The Service is a documentation tool and does not provide medical advice</li>
              <li>You must comply with all applicable healthcare regulations and professional standards</li>
              <li>You must maintain your professional indemnity insurance</li>
            </ul>
          </section>

          {/* Content and Data */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Content and Data Ownership</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Your Content</h3>
            <p className="text-gray-700 mb-4">
              You retain ownership of all treatment records, photos, and other data you create using the Service
              ("Your Content"). By using the Service, you grant us a limited license to store, process, and
              transmit Your Content solely to provide the Service.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Our Intellectual Property</h3>
            <p className="text-gray-700 mb-4">
              The Service, including its software, design, trademarks, and content, is owned by SiteMedic Ltd
              and protected by UK and international copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.3 Backup Responsibility</h3>
            <p className="text-gray-700 mb-4">
              While we implement robust backup systems, you are responsible for maintaining your own backups
              of critical data. We are not liable for data loss caused by circumstances beyond our control.
            </p>
          </section>

          {/* Payment Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Payment Terms</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">7.1 Fees</h3>
            <p className="text-gray-700 mb-4">
              Certain features of the Service may require payment of fees. All fees are quoted in GBP (£)
              and include VAT at the applicable rate (currently 20%).
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">7.2 Billing</h3>
            <p className="text-gray-700 mb-4">
              Payment terms depend on your subscription plan:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Monthly/Annual Subscriptions:</strong> Charged automatically via card on file</li>
              <li><strong>Enterprise Plans:</strong> Invoiced with Net 30 payment terms</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">7.3 Late Payments</h3>
            <p className="text-gray-700 mb-4">
              Unpaid invoices are subject to late payment fees as permitted by the Late Payment of Commercial
              Debts (Interest) Act 1998. We may suspend access to the Service if payment is overdue by 14 days.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">7.4 Refunds</h3>
            <p className="text-gray-700 mb-4">
              Subscription fees are non-refundable except as required by the Consumer Rights Act 2015.
              You may cancel your subscription at any time, effective at the end of the current billing period.
            </p>
          </section>

          {/* Data Protection */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Protection and Privacy</h2>
            <p className="text-gray-700 mb-4">
              We process personal data (including special category health data) in accordance with UK GDPR
              and the Data Protection Act 2018. Please review our{' '}
              <Link href="/privacy-policy" className="text-blue-600 hover:underline font-semibold">
                Privacy Policy
              </Link>
              {' '}for detailed information about how we collect, use, and protect your data.
            </p>
            <p className="text-gray-700 mb-4">
              By using the Service, you consent to the processing of health data as described in our Privacy Policy
              and acknowledge that such processing is necessary for healthcare treatment and compliance purposes.
            </p>
          </section>

          {/* Limitations of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitations of Liability</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">9.1 Service Availability</h3>
            <p className="text-gray-700 mb-4">
              We strive to provide 99.9% uptime but do not guarantee uninterrupted access to the Service.
              We are not liable for service interruptions caused by maintenance, network issues, or circumstances
              beyond our control.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">9.2 Disclaimer of Warranties</h3>
            <p className="text-gray-700 mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              OR NON-INFRINGEMENT.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">9.3 Limitation of Liability</h3>
            <p className="text-gray-700 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY UK LAW, OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING
              FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE FEES PAID BY YOU IN THE 12 MONTHS PRECEDING
              THE CLAIM.
            </p>
            <p className="text-gray-700 mb-4">
              WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT
              NOT LIMITED TO LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">9.4 Exceptions</h3>
            <p className="text-gray-700 mb-4">
              Nothing in these Terms excludes or limits our liability for:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Death or personal injury caused by our negligence</li>
              <li>Fraud or fraudulent misrepresentation</li>
              <li>Any other liability that cannot be excluded under UK law</li>
            </ul>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-700 mb-4">
              You agree to indemnify, defend, and hold harmless SiteMedic Ltd, its officers, directors, employees,
              and agents from any claims, liabilities, damages, losses, or expenses (including legal fees) arising
              from:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of third parties</li>
              <li>Clinical decisions or medical treatments you provide</li>
            </ul>
          </section>

          {/* RIDDOR Compliance */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. RIDDOR and HSE Compliance</h2>
            <p className="text-gray-700 mb-4">
              The Service provides RIDDOR auto-flagging and reporting assistance, but you remain solely
              responsible for:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Accurately logging treatment details</li>
              <li>Reviewing RIDDOR flags and making final reporting decisions</li>
              <li>Submitting required reports to the HSE within legal deadlines</li>
              <li>Complying with the Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013</li>
            </ul>
            <p className="text-gray-700 mb-4">
              The Service is a documentation and flagging tool only. We are not responsible for missed RIDDOR
              deadlines or incomplete reports.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Termination</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">12.1 Termination by You</h3>
            <p className="text-gray-700 mb-4">
              You may terminate your account at any time by contacting us at{' '}
              <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">
                support@sitemedic.co.uk
              </a>
              . Upon termination, you will lose access to the Service, but we will retain Your Content for the
              data retention periods specified in our Privacy Policy.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">12.2 Termination by Us</h3>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account immediately if:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>You breach these Terms</li>
              <li>Payment is overdue by more than 30 days</li>
              <li>We are required to do so by law or regulatory authority</li>
              <li>We decide to discontinue the Service (with 90 days' notice)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">12.3 Data Export</h3>
            <p className="text-gray-700 mb-4">
              Upon termination, you have 30 days to request a data export (CSV or JSON format).
              After 30 days, Your Content may be permanently deleted.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to These Terms</h2>
            <p className="text-gray-700 mb-4">
              We may update these Terms from time to time. We will notify you of significant changes via email
              or in-app notification at least 30 days before the new terms take effect. Continued use of the
              Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law and Jurisdiction</h2>
            <p className="text-gray-700 mb-4">
              These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms
              or your use of the Service shall be subject to the exclusive jurisdiction of the courts of England
              and Wales.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Dispute Resolution</h2>
            <p className="text-gray-700 mb-4">
              Before initiating legal proceedings, we encourage you to contact us to resolve disputes informally.
              If a dispute cannot be resolved informally, both parties agree to attempt mediation before pursuing
              litigation.
            </p>
          </section>

          {/* Severability */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Severability</h2>
            <p className="text-gray-700 mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be
              limited or eliminated to the minimum extent necessary, and the remaining provisions will remain
              in full force and effect.
            </p>
          </section>

          {/* Entire Agreement */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Entire Agreement</h2>
            <p className="text-gray-700 mb-4">
              These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement
              between you and SiteMedic Ltd regarding the Service and supersede all prior agreements or
              understandings.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">18. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-900"><strong>SiteMedic Ltd</strong></p>
              <p className="text-gray-700">Email: <a href="mailto:legal@sitemedic.co.uk" className="text-blue-600 hover:underline">legal@sitemedic.co.uk</a></p>
              <p className="text-gray-700">Support: <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a></p>
              <p className="text-gray-700">Address: [Registered Office Address]</p>
              <p className="text-gray-700">Company Number: [Company Registration Number]</p>
            </div>
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
