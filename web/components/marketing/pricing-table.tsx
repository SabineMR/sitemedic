import QuoteButton from './quote-button';

export default function PricingTable() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Main Pricing Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 mb-8 shadow-lg hover:shadow-xl transition">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              ASG Medics Pro
            </h2>
            <p className="text-slate-600 mb-6 text-base">
              HCPC-registered paramedic + SiteMedic compliance platform
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-700">Digital treatment logging</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-700">RIDDOR auto-flagging</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-700">Weekly safety reports</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-700">Works offline</span>
              </li>
            </ul>
          </div>
          <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
            <div className="mb-6">
              <div className="text-5xl sm:text-6xl font-bold text-slate-900">£350</div>
              <div className="text-base text-slate-500 mt-2">per day</div>
              <div className="text-sm text-slate-400 mt-1">+VAT</div>
            </div>
            <QuoteButton className="w-full md:w-auto" />
          </div>
        </div>
      </div>

      {/* Volume Pricing */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Volume discounts</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
            <div className="text-lg font-bold text-slate-900 mb-2">1 week (5 days)</div>
            <div className="text-2xl font-bold text-slate-900 mb-1">£1,750</div>
            <div className="text-sm text-slate-500">£350/day</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
            <div className="text-lg font-bold text-slate-900 mb-2">1 month (20 days)</div>
            <div className="text-2xl font-bold text-slate-900 mb-1">£6,800</div>
            <div className="text-sm text-green-600 font-medium">£340/day (3% off)</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-300 hover:shadow-md transition">
            <div className="text-lg font-bold text-slate-900 mb-2">Enterprise</div>
            <div className="text-2xl font-bold text-slate-900 mb-1">Custom</div>
            <div className="text-sm text-blue-700 font-medium">Contact sales</div>
          </div>
        </div>
      </div>
    </div>
  );
}
