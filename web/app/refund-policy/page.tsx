import Link from 'next/link';

export const metadata = {
  title: 'Refund & Returns Policy | SiteMedic',
  description: 'SiteMedic refund and returns policy in compliance with UK Consumer Rights Act 2015.',
};

export default function RefundPolicy() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Refund & Returns Policy</h1>
        <p className="text-gray-600 mb-8">
          <strong>Last Updated:</strong> 15 February 2026
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              This Refund & Returns Policy explains your rights under UK consumer law, specifically
              the Consumer Rights Act 2015 and the Consumer Contracts (Information, Cancellation and
              Additional Charges) Regulations 2013.
            </p>
            <p className="text-gray-700 mb-4">
              At SiteMedic, we are committed to providing high-quality services. If you are not satisfied
              with our service, this policy outlines your cancellation and refund rights.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Your Consumer Rights</h2>
            <p className="text-gray-700 mb-4">
              Under the Consumer Rights Act 2015, you have specific rights when purchasing services online:
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">14-Day Cooling Off Period</h3>
              <p className="text-gray-700 mb-2">
                For online purchases, you have the right to cancel your order within 14 days of:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Signing up for a subscription service</li>
                <li>Booking a medic staffing service</li>
                <li>Making any other service purchase</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Note:</strong> This right does not apply if services have already been fully performed
                with your prior express consent and acknowledgement that you lose your right to cancel.
              </p>
            </div>
          </section>

          {/* Subscription Services */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Subscription Services (Software Platform)</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Monthly and Annual Subscriptions</h3>
            <p className="text-gray-700 mb-4">
              For our software platform subscriptions (Basic, Pro, Enterprise):
            </p>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Within 14 Days (Cooling Off Period)</h4>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>You can cancel for any reason within 14 days of purchase</li>
                <li>Full refund provided if services have not been used</li>
                <li>Pro-rata refund if services have been partially used</li>
                <li>Refund processed within 14 days to your original payment method</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">After 14 Days</h4>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>You can cancel at any time, effective at the end of your current billing period</li>
                <li>No refund for unused time in the current billing period</li>
                <li>Access continues until the end of the paid period</li>
                <li>No further charges after cancellation takes effect</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Free Trials</h3>
            <p className="text-gray-700 mb-4">
              If you signed up for a free trial:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Cancel anytime during the trial period at no charge</li>
              <li>Cancellation must be completed before the trial ends to avoid charges</li>
              <li>If trial converts to paid subscription, 14-day cooling off period applies from conversion date</li>
            </ul>
          </section>

          {/* Medic Booking Services */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Medic Booking Services</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Cancellation Before Service Date</h3>
            <div className="space-y-4 mb-4">
              <div className="bg-green-50 border-l-4 border-green-600 p-4">
                <p className="text-gray-900 font-semibold mb-2">7+ Days Before Booking</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li><strong>Full refund (100%)</strong> of booking fee</li>
                  <li>No cancellation charges applied</li>
                  <li>Refund processed within 5-7 business days</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4">
                <p className="text-gray-900 font-semibold mb-2">3-6 Days Before Booking</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li><strong>50% refund</strong> of booking fee</li>
                  <li>50% cancellation charge to cover medic availability reservation</li>
                  <li>Refund processed within 5-7 business days</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-600 p-4">
                <p className="text-gray-900 font-semibold mb-2">Less Than 72 Hours Before Booking</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li><strong>No refund</strong> - full booking fee charged</li>
                  <li>Medic has already been assigned and is unavailable for other work</li>
                  <li>You may request to reschedule instead (subject to availability)</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Cancellation on Service Date</h3>
            <p className="text-gray-700 mb-4">
              If you cancel on the day of the booking:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>No refund</strong> - full booking fee applies</li>
              <li>Medic has traveled to site or is en route</li>
              <li>Exceptional circumstances may be considered (weather, emergencies)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Medic No-Show or Cancellation</h3>
            <p className="text-gray-700 mb-4">
              If the medic fails to attend your booking:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>100% full refund</strong> of booking fee</li>
                <li>Immediate replacement medic arranged (if available)</li>
                <li>Refund processed within 3 business days</li>
                <li>£50 goodwill credit applied to your account</li>
              </ul>
            </div>
          </section>

          {/* Service Quality Issues */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Service Quality Issues</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Unsatisfactory Service</h3>
            <p className="text-gray-700 mb-4">
              Under the Consumer Rights Act 2015, services must be performed with reasonable care and skill.
              If you believe the service was unsatisfactory:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Contact us within 48 hours of the booking</li>
              <li>Provide details of the issue (photos, witness statements if applicable)</li>
              <li>We will investigate and respond within 5 business days</li>
              <li>Remedies may include: partial refund, full refund, or free replacement service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Technical Issues (Software Platform)</h3>
            <p className="text-gray-700 mb-4">
              If technical issues prevent you from using the platform:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Report issues immediately via support@sitemedic.co.uk</li>
              <li>Pro-rata refund for days of unavailability (if not resolved within 48 hours)</li>
              <li>Scheduled maintenance does not qualify for refunds</li>
            </ul>
          </section>

          {/* Refund Process */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. How to Request a Refund</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 1: Contact Us</h3>
            <p className="text-gray-700 mb-4">
              Submit a refund request via:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="text-gray-900 mb-2"><strong>Email:</strong> <a href="mailto:refunds@sitemedic.co.uk" className="text-blue-600 hover:underline">refunds@sitemedic.co.uk</a></p>
              <p className="text-gray-900 mb-2"><strong>Phone:</strong> <a href="tel:+44XXXXXXXXXX" className="text-blue-600 hover:underline">+44 (0) XXXX XXXXXX</a></p>
              <p className="text-gray-900"><strong>Online:</strong> Via your account dashboard → Support → Refund Request</p>
            </div>

            <p className="text-gray-700 mb-4">
              <strong>Include in your request:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Your account email address</li>
              <li>Booking reference number (if applicable)</li>
              <li>Reason for refund request</li>
              <li>Original payment method details</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 2: Review Process</h3>
            <p className="text-gray-700 mb-4">
              We will review your request and respond within:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Medic booking cancellations:</strong> 24 hours</li>
              <li><strong>Subscription cancellations:</strong> 3 business days</li>
              <li><strong>Service quality issues:</strong> 5 business days</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">Step 3: Refund Processing</h3>
            <p className="text-gray-700 mb-4">
              If approved, refunds are processed as follows:
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Card payments:</strong> 5-7 business days back to original card</li>
                <li><strong>PayPal:</strong> 3-5 business days</li>
                <li><strong>Bank transfer:</strong> 3-5 business days (UK accounts only)</li>
                <li><strong>Invoice payments:</strong> Credit note issued within 5 business days</li>
              </ul>
            </div>
          </section>

          {/* Non-Refundable */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Non-Refundable Items</h2>
            <p className="text-gray-700 mb-4">
              The following are not eligible for refunds:
            </p>
            <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4">
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Bookings cancelled less than 72 hours before service date</li>
                <li>Services already fully performed (where you waived cooling off rights)</li>
                <li>Custom or bespoke services after work has commenced</li>
                <li>Third-party fees (e.g., payment processing fees on refunded amounts)</li>
                <li>Training or onboarding services already delivered</li>
              </ul>
            </div>
          </section>

          {/* Chargebacks */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Chargebacks and Disputes</h2>
            <p className="text-gray-700 mb-4">
              If you dispute a charge with your bank or card issuer:
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
              <p className="text-gray-900 font-semibold mb-2">⚠️ Important</p>
              <p className="text-gray-700 mb-2">
                Please contact us first before initiating a chargeback. Chargebacks can:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Delay resolution (chargebacks take 60-90 days vs 5-7 days for direct refunds)</li>
                <li>Result in account suspension while under investigation</li>
                <li>Incur additional fees if chargeback is found to be fraudulent</li>
              </ul>
            </div>

            <p className="text-gray-700 mb-4">
              We work directly with you to resolve disputes fairly and quickly. Most issues can be resolved
              within 5 business days.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Rescheduling (Alternative to Cancellation)</h2>
            <p className="text-gray-700 mb-4">
              Instead of cancelling, you may reschedule your booking:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>7+ days before:</strong> Free rescheduling, no charges</li>
              <li><strong>3-6 days before:</strong> £25 rescheduling fee</li>
              <li><strong>Less than 72 hours:</strong> £50 rescheduling fee (subject to availability)</li>
              <li>Rescheduling must be to a date within 90 days of original booking</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              For questions about refunds or cancellations:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-900"><strong>Email:</strong> <a href="mailto:refunds@sitemedic.co.uk" className="text-blue-600 hover:underline">refunds@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>Support:</strong> <a href="mailto:support@sitemedic.co.uk" className="text-blue-600 hover:underline">support@sitemedic.co.uk</a></p>
              <p className="text-gray-900"><strong>Phone:</strong> <a href="tel:+44XXXXXXXXXX" className="text-blue-600 hover:underline">+44 (0) XXXX XXXXXX</a></p>
              <p className="text-gray-900"><strong>Address:</strong> [Registered Office Address]</p>
            </div>
          </section>

          {/* Legal */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Your Statutory Rights</h2>
            <p className="text-gray-700 mb-4">
              This policy does not affect your statutory rights under UK consumer law, including:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Consumer Rights Act 2015 - Services must be performed with reasonable care and skill</li>
              <li>Consumer Contracts Regulations 2013 - 14-day cooling off period for online purchases</li>
              <li>Sale of Goods Act 1979 - Goods must be as described, fit for purpose, and of satisfactory quality</li>
            </ul>

            <p className="text-gray-700 mb-4">
              If you believe we have not met our obligations, you may refer your complaint to:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-gray-900 font-semibold mb-2">Citizens Advice Consumer Service</p>
              <p className="text-gray-700 mb-1">Phone: 0808 223 1133</p>
              <p className="text-gray-700">Website: <a href="https://www.citizensadvice.org.uk/consumer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.citizensadvice.org.uk/consumer/</a></p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between text-sm">
            <Link href="/terms-and-conditions" className="text-blue-600 hover:underline">
              Terms and Conditions
            </Link>
            <Link href="/complaints" className="text-blue-600 hover:underline">
              Complaints Procedure
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
