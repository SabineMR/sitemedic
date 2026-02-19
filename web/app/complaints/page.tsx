import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

export const metadata = {
  title: 'Complaints Procedure',
  description: 'How to make a complaint and our commitment to resolving issues fairly and quickly.',
};

export default function ComplaintsProcedure() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Complaints Procedure</h1>
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> 15 February 2026
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Commitment to You</h2>
            <p className="text-gray-700 mb-4">
              At SiteMedic, we are committed to providing excellent service. However, we understand that
              sometimes things may not go as expected. If you are unhappy with our service, we want to hear
              from you so we can put things right.
            </p>
            <p className="text-gray-700 mb-4">
              This complaints procedure explains how to raise a concern and what you can expect from us.
              We treat all complaints seriously and use feedback to improve our services.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">Our Promise</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>We will treat your complaint fairly and confidentially</li>
                <li>We will investigate thoroughly and respond promptly</li>
                <li>We will keep you informed throughout the process</li>
                <li>We will learn from complaints to improve our services</li>
              </ul>
            </div>
          </section>

          {/* How to Complain */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Make a Complaint</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">Contact Methods</h3>
            <p className="text-gray-700 mb-4">
              You can raise a complaint via any of the following methods:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">📧 Email (Preferred)</h4>
                <p className="text-gray-700 text-sm mb-2">
                  <a href="mailto:complaints@sitemedic.co.uk" className="text-blue-600 hover:underline">
                    complaints@sitemedic.co.uk
                  </a>
                </p>
                <p className="text-xs text-gray-600">Best for detailed complaints with documentation</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">📧 Email</h4>
                <p className="text-gray-700 text-sm mb-2">
                  <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">
                    support@sitemedic.co.uk
                  </a>
                </p>
                <p className="text-xs text-gray-600">Monday-Friday, 9am-5pm GMT</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">💬 Live Chat</h4>
                <p className="text-gray-700 text-sm mb-2">
                  Via your account dashboard
                </p>
                <p className="text-xs text-gray-600">Available during business hours</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">✉️ Post</h4>
                <p className="text-gray-700 text-sm mb-2">
                  Complaints Department<br/>
                  SiteMedic Ltd<br/>
                  [Registered Office Address]
                </p>
                <p className="text-xs text-gray-600">Allow 7-10 days for postal responses</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">What to Include</h3>
            <p className="text-gray-700 mb-4">
              To help us investigate your complaint effectively, please provide:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Your contact details:</strong> Name, email address, phone number, account ID</li>
              <li><strong>Date of incident:</strong> When did the issue occur?</li>
              <li><strong>Description of issue:</strong> What went wrong? Be as specific as possible</li>
              <li><strong>Supporting evidence:</strong> Booking references, screenshots, photos, correspondence</li>
              <li><strong>Impact:</strong> How has this affected you or your business?</li>
              <li><strong>Desired resolution:</strong> What outcome are you seeking?</li>
            </ul>
          </section>

          {/* Process */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">The Complaints Process</h2>

            <div className="space-y-6">
              {/* Stage 1 */}
              <div className="bg-white border-l-4 border-blue-600 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Acknowledgement</h3>
                    <p className="text-gray-700 mb-2">
                      <strong>Timeline:</strong> Within 24 hours (1 business day)
                    </p>
                    <p className="text-gray-700 mb-2">
                      We will acknowledge receipt of your complaint and provide:
                    </p>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1">
                      <li>A unique complaint reference number</li>
                      <li>The name of the person handling your complaint</li>
                      <li>An estimated resolution timeline</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="bg-white border-l-4 border-blue-600 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Investigation</h3>
                    <p className="text-gray-700 mb-2">
                      <strong>Timeline:</strong> Within 5 business days (simple cases) or 10 business days (complex cases)
                    </p>
                    <p className="text-gray-700 mb-2">
                      Our complaints team will:
                    </p>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1">
                      <li>Review all available evidence and documentation</li>
                      <li>Speak with relevant staff members (medics, support team, etc.)</li>
                      <li>Gather technical logs if applicable (app usage, booking records)</li>
                      <li>Contact you if additional information is needed</li>
                      <li>Keep you updated on investigation progress</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="bg-white border-l-4 border-blue-600 p-6 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Resolution</h3>
                    <p className="text-gray-700 mb-2">
                      <strong>Timeline:</strong> Within 10 business days of receipt (or sooner)
                    </p>
                    <p className="text-gray-700 mb-2">
                      We will provide you with:
                    </p>
                    <ul className="list-disc pl-6 text-gray-700 space-y-1">
                      <li>A clear explanation of our findings</li>
                      <li>Whether we uphold, partially uphold, or do not uphold your complaint</li>
                      <li>The reasons for our decision</li>
                      <li>Any remedial action we will take</li>
                      <li>Compensation or goodwill gestures (if appropriate)</li>
                      <li>Information on escalation if you're not satisfied</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Possible Outcomes */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Possible Resolutions</h2>
            <p className="text-gray-700 mb-4">
              Depending on the nature and severity of the complaint, we may offer:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Financial Remedy</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Full or partial refund</li>
                  <li>• Account credit</li>
                  <li>• Discount on future services</li>
                  <li>• Compensation for inconvenience</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Service Remedy</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Re-performance of service at no charge</li>
                  <li>• Free upgrade to higher service tier</li>
                  <li>• Priority support access</li>
                  <li>• Dedicated account manager</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Corrective Action</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Staff retraining or disciplinary action</li>
                  <li>• Process improvements</li>
                  <li>• System fixes or enhancements</li>
                  <li>• Policy changes</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Apology & Explanation</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Formal written apology</li>
                  <li>• Clear explanation of what went wrong</li>
                  <li>• Commitment to prevent recurrence</li>
                  <li>• Direct line to senior management</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Escalation */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">If You're Not Satisfied</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">Internal Escalation</h3>
            <p className="text-gray-700 mb-4">
              If you are unhappy with our initial response, you can escalate your complaint:
            </p>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Stage 2: Senior Management Review</h4>
              <p className="text-gray-700 mb-2">
                <strong>Contact:</strong> <a href="mailto:senior-complaints@sitemedic.co.uk" className="text-blue-600 hover:underline">senior-complaints@sitemedic.co.uk</a>
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Timeline:</strong> Response within 10 business days
              </p>
              <p className="text-gray-700 mb-2">
                Your complaint will be reviewed by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>A senior manager not involved in the original investigation</li>
                <li>Independent review of all evidence and decisions</li>
                <li>Final decision from the company's perspective</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">External Escalation</h3>
            <p className="text-gray-700 mb-4">
              If you remain unsatisfied after our internal process, you may refer your complaint to:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Alternative Dispute Resolution (ADR)</h4>
                <p className="text-gray-700 mb-2">
                  We are members of the UK Dispute Resolution (UKDR) service:
                </p>
                <p className="text-gray-700 text-sm mb-1">
                  <strong>Website:</strong> <a href="https://www.ukdr.co.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.ukdr.co.uk</a>
                </p>
                <p className="text-gray-700 text-sm mb-1">
                  <strong>Phone:</strong> 0330 440 2324
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Cost:</strong> Free for consumers; independent mediation service
                </p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Citizens Advice Consumer Service</h4>
                <p className="text-gray-700 mb-2">
                  For advice on your consumer rights:
                </p>
                <p className="text-gray-700 text-sm mb-1">
                  <strong>Website:</strong> <a href="https://www.citizensadvice.org.uk/consumer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.citizensadvice.org.uk/consumer/</a>
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Phone:</strong> 0808 223 1133
                </p>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Small Claims Court</h4>
                <p className="text-gray-700 mb-2">
                  For disputes involving financial claims up to £10,000:
                </p>
                <p className="text-gray-700 text-sm mb-1">
                  <strong>Website:</strong> <a href="https://www.gov.uk/make-court-claim-for-money" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.gov.uk/make-court-claim-for-money</a>
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Note:</strong> Legal action should be a last resort after exhausting all other options
                </p>
              </div>
            </div>
          </section>

          {/* Types of Complaints */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Types of Complaints</h2>
            <p className="text-gray-700 mb-4">
              We handle complaints related to:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Service Quality</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Medic professionalism or conduct</li>
                  <li>• Quality of medical care provided</li>
                  <li>• Incomplete or inadequate service</li>
                  <li>• Failure to meet service standards</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Booking & Admin</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Booking errors or double-bookings</li>
                  <li>• Cancellations or no-shows</li>
                  <li>• Invoicing or billing issues</li>
                  <li>• Account access problems</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Technical Issues</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Mobile app crashes or bugs</li>
                  <li>• Data sync failures</li>
                  <li>• Report generation errors</li>
                  <li>• Platform downtime</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Communication</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Poor customer service</li>
                  <li>• Lack of communication updates</li>
                  <li>• Misleading information</li>
                  <li>• Unresponsive support team</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Learning */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Learn From Complaints</h2>
            <p className="text-gray-700 mb-4">
              We take complaints seriously and use them to improve our services:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Quarterly Reviews:</strong> Senior management reviews all complaints to identify trends and systemic issues</li>
              <li><strong>Process Improvements:</strong> Implement changes to prevent similar complaints in the future</li>
              <li><strong>Staff Training:</strong> Address skill gaps and provide additional training where needed</li>
              <li><strong>Transparency:</strong> Publish annual complaints statistics (anonymized)</li>
              <li><strong>Root Cause Analysis:</strong> Investigate underlying causes, not just symptoms</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact the Complaints Team</h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-900 mb-2"><strong>Complaints Email:</strong> <a href="mailto:complaints@sitemedic.co.uk" className="text-blue-600 hover:underline">complaints@sitemedic.co.uk</a></p>
              <p className="text-gray-900 mb-2"><strong>Support Email:</strong> <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a></p>
              <p className="text-gray-900 mb-2"><strong>Hours:</strong> Monday-Friday, 9am-5pm GMT</p>
              <p className="text-gray-900 mb-2"><strong>Postal Address:</strong></p>
              <p className="text-gray-700 ml-4">
                Complaints Department<br/>
                SiteMedic Ltd<br/>
                [Registered Office Address]
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between text-sm">
            <Link href="/refund-policy" className="text-blue-600 hover:underline">
              Refund & Returns Policy
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
