import { Ear, FlaskConical, Stethoscope, Brain } from 'lucide-react';
import QuoteButton from './quote-button';

function Check() {
  return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export default function PricingTable() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ─── Core Medic Package ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex-1">
            <div className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-3">
              Base Package
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              ASG Medics Pro
            </h2>
            <p className="text-slate-500 mb-6 text-sm">
              HCPC-registered paramedic on site + full SiteMedic compliance platform
            </p>
            <ul className="space-y-2.5">
              {[
                'HCPC-registered paramedic, on site',
                'Digital treatment logging (works offline)',
                'RIDDOR 2013 auto-flagging',
                'Weekly safety summary reports',
                'Near-miss incident reporting',
                'Worker health profile management',
                'HSE audit-ready records',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Check />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8 min-w-[160px]">
            <div className="mb-6">
              <div className="text-5xl sm:text-6xl font-bold text-slate-900 tabular-nums">£350</div>
              <div className="text-base text-slate-500 mt-1.5">per day</div>
              <div className="text-sm text-slate-400 mt-0.5">+VAT</div>
            </div>
            <QuoteButton className="w-full md:w-auto" />
            <p className="text-xs text-slate-400 mt-3">Clinical add-ons priced separately</p>
          </div>
        </div>
      </div>

      {/* ─── Volume Discounts ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-7 border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-5">Volume discounts</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition">
            <div className="text-sm font-semibold text-slate-700 mb-1">1 week</div>
            <div className="text-slate-500 text-xs mb-3">5 days</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">£1,750</div>
            <div className="text-xs text-slate-500 mt-1">£350/day</div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition">
            <div className="text-sm font-semibold text-slate-700 mb-1">1 month</div>
            <div className="text-slate-500 text-xs mb-3">20 days</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">£6,800</div>
            <div className="text-xs text-green-600 font-semibold mt-1">£340/day · 3% off</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/80 p-5 rounded-xl border-2 border-blue-300 hover:shadow-sm transition">
            <div className="text-sm font-semibold text-blue-900 mb-1">Enterprise</div>
            <div className="text-blue-600 text-xs mb-3">Long-term / multi-site</div>
            <div className="text-2xl font-bold text-slate-900">Custom</div>
            <div className="text-xs text-blue-700 font-semibold mt-1">Contact us</div>
          </div>
        </div>
      </div>

      {/* ─── Clinical Add-Ons ─────────────────────────────────────────────── */}
      <div>
        <div className="text-center mb-7">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Clinical add-on packages</h3>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Add to any medic booking. All results logged automatically in the SiteMedic platform. All done on site — no mobile van, no off-site clinic, no lost worker hours.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">

          {/* Health Surveillance */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition duration-200">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-600">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Ear className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-blue-200 font-semibold uppercase tracking-wide">Legally Mandatory</div>
                <div className="text-white font-bold text-sm">Health Surveillance</div>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-2 mb-4">
                {[
                  { test: 'Audiometry (hearing)', price: 'from £45/worker' },
                  { test: 'Spirometry (lung function)', price: 'from £45/worker' },
                  { test: 'HAVS screening (Tier 1 & 2)', price: 'from £35/worker' },
                  { test: 'Skin assessments (dermatitis)', price: 'from £30/worker' },
                ].map(({ test, price }) => (
                  <div key={test} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Check />
                      {test}
                    </span>
                    <span className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-0.5 rounded-full tabular-nums">{price}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">
                Market rate: £72–£127/worker off-site. <strong className="text-slate-700">Save 30–60% per test.</strong>
              </div>
            </div>
          </div>

          {/* Drug & Alcohol */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition duration-200">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-orange-500">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-orange-100 font-semibold uppercase tracking-wide">Contractually Required</div>
                <div className="text-white font-bold text-sm">Drug &amp; Alcohol Testing</div>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-2 mb-4">
                {[
                  { test: 'Random testing programme', price: '£30–42/worker' },
                  { test: 'Pre-induction screening', price: '£25–35/worker' },
                  { test: 'For-cause / post-incident', price: 'Flat £75–100' },
                  { test: 'Policy templates & records', price: 'Included' },
                ].map(({ test, price }) => (
                  <div key={test} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Check />
                      {test}
                    </span>
                    <span className="text-orange-600 text-xs font-semibold bg-orange-50 px-2 py-0.5 rounded-full tabular-nums">{price}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">
                Emergency call-out market rate: £350–400. <strong className="text-slate-700">We&apos;re already on site.</strong>
              </div>
            </div>
          </div>

          {/* Fitness to Work */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition duration-200">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-green-600">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-green-100 font-semibold uppercase tracking-wide">Role-Specific</div>
                <div className="text-white font-bold text-sm">Fitness-to-Work Assessments</div>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-2 mb-4">
                {[
                  { test: 'Plant machinery operators', price: '£85–110' },
                  { test: 'Working at height', price: '£85–110' },
                  { test: 'Confined space workers', price: '£85–110' },
                  { test: 'Remote physician sign-off', price: 'Same day' },
                ].map(({ test, price }) => (
                  <div key={test} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Check />
                      {test}
                    </span>
                    <span className="text-green-700 text-xs font-semibold bg-green-50 px-2 py-0.5 rounded-full">{price}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">
                Includes OH physician remote review. <strong className="text-slate-700">Certificate issued same day.</strong>
              </div>
            </div>
          </div>

          {/* Mental Health */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition duration-200">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-purple-600">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-purple-100 font-semibold uppercase tracking-wide">Premium Tier</div>
                <div className="text-white font-bold text-sm">Mental Health &amp; Wellbeing</div>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-2 mb-4">
                {[
                  { test: 'Monthly wellbeing check-ins', price: 'Included' },
                  { test: 'Wellbeing pulse score per site', price: 'On dashboard' },
                  { test: 'Anonymised trend reporting', price: 'Quarterly PDF' },
                  { test: 'Crisis escalation protocol', price: 'HCPC-standard' },
                ].map(({ test, price }) => (
                  <div key={test} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Check />
                      {test}
                    </span>
                    <span className="text-purple-700 text-xs font-semibold bg-purple-50 px-2 py-0.5 rounded-full">{price}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">
                Delivered during idle site time. <strong className="text-slate-700">Near-zero additional cost on premium bookings.</strong>
              </div>
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          All prices shown +VAT. Get a custom quote that bundles all services for your specific site.
        </p>
      </div>

    </div>
  );
}
