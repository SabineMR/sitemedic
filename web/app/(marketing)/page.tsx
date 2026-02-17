import Link from 'next/link';
import QuoteButton from '@/components/marketing/quote-button';
import {
  Shield,
  FileCheck,
  HardHat,
  Lock,
  ClipboardCheck,
  Ear,
  Wind,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Brain,
  ArrowRight,
  Users,
  Bell,
  Receipt,
  Clock,
  TrendingDown,
  MapPin,
  Star,
  AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-static';
export const revalidate = 86400;

function Check() {
  return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e40af 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 font-medium shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Powered by{' '}
            <Link href="https://sitemedic.co.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:text-blue-700 transition">
              SiteMedic
            </Link>
            <span className="text-slate-300">·</span>
            England &amp; Wales only
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            The UK&apos;s only on-site
            <br />
            <span className="text-blue-600">full OH service for construction</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 text-center mb-3 max-w-3xl mx-auto leading-relaxed">
            Apex Safety Group puts an HCPC-registered paramedic on your construction site and delivers your entire occupational health programme — health surveillance, drug &amp; alcohol testing, fitness-to-work medicals — without a mobile van, without off-site travel, and without four separate invoices.
          </p>
          <p className="text-base text-slate-500 text-center mb-10 max-w-2xl mx-auto font-medium">
            One medic. Every legal obligation. One invoice.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link
              href="/book"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 active:scale-95 transition shadow-lg hover:shadow-blue-200 hover:shadow-xl text-center"
            >
              Book a Medic
            </Link>
            <QuoteButton />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-500">
            {['HCPC-Registered', 'RIDDOR 2013', 'CDM 2015', 'HASAWA 1974', 'COSHH', 'UK GDPR'].map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <Check />
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────────────────── */}
      <section className="py-10 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {[
            { value: '9×', label: 'More value than a medic-only booking' },
            { value: '0', label: 'Off-site trips required for annual surveillance' },
            { value: '1', label: 'Invoice for all OH services on your site' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="text-3xl sm:text-4xl font-bold text-white">{value}</div>
              <div className="text-blue-200 text-xs sm:text-sm leading-snug max-w-[130px]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PROBLEM ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            The status quo is costing you more than money
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-2xl mx-auto">
            Most UK construction sites manage occupational health across four separate providers — and each one introduces delay, cost, and compliance risk.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
            {[
              {
                title: 'Mobile OH vans — booked months ahead',
                desc: 'You wait weeks for a slot. Workers lose half a day queuing. The data lands in a PDF that no one can find when the HSE inspector arrives.',
              },
              {
                title: 'Off-site clinics — direct productivity loss',
                desc: '£75–£127 per audiometry test at an off-site clinic. Travel time, waiting time, return time. A half-day gone for a 20-minute test.',
              },
              {
                title: 'Third-party D&A collectors — slow when it matters',
                desc: '£350–400 for an emergency post-incident call-out. A two-hour wait while your site is stopped. No chain of custody from a panicked call.',
              },
              {
                title: 'Scattered records — a liability, not an archive',
                desc: 'Surveillance results in one system. RIDDOR reports in another. Fitness certs in a filing cabinet. No single source of truth when you need it most.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-800 rounded-xl p-5 border border-slate-700/80">
                <div className="text-red-400 font-semibold text-sm mb-1.5">✕ {item.title}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4 SERVICE LAYERS ──────────────────────────────────────────────── */}
      <section id="services" className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Clinical Services — England &amp; Wales
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Four service layers. One site visit.
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Our medics are HCPC-registered paramedics — not nurses, not technicians, not first-aiders. That clinical grade lets us deliver every layer of your OH programme on site, during normal working hours.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-7">

            {/* Layer 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-200">
              <div className="bg-blue-600 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Ear className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-blue-200 font-medium uppercase tracking-wide">Layer 1 · Legally Mandatory</div>
                  <div className="text-white font-bold text-lg">Health Surveillance</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">
                  UK law requires surveillance for workers exposed to noise, vibration, dust, or hazardous substances. On a construction site, that&apos;s nearly everyone. We run all four tests on site — no mobile van booking, no lost worker hours, no chasing a PDF six weeks later.
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    { test: 'Audiometry (hearing)', price: 'from £45/worker' },
                    { test: 'Spirometry (lung function)', price: 'from £45/worker' },
                    { test: 'HAVS screening (Tier 1 & 2)', price: 'from £35/worker' },
                    { test: 'Skin assessments (dermatitis)', price: 'from £30/worker' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><Check />{test}</span>
                      <span className="text-blue-600 font-semibold text-xs bg-blue-50 px-2 py-0.5 rounded-full">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
                  <strong>vs. market:</strong> £72–£127/worker off-site. 80 workers × 2 tests = <strong>up to £8,800/year in avoided productivity loss alone.</strong>
                </div>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-200">
              <div className="bg-orange-500 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-orange-100 font-medium uppercase tracking-wide">Layer 2 · Contractually Required</div>
                  <div className="text-white font-bold text-lg">Drug &amp; Alcohol Testing</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">
                  Most principal contractors require D&amp;A testing. The critical test — post-incident, for-cause — is the one that requires an immediate response. Emergency call-out: £350–400 and a two-hour wait. Apex medic already on site: flat £75–100, immediate.
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    { test: 'Random testing programmes', price: '£30–42/worker' },
                    { test: 'Pre-induction screening', price: '£25–35/worker' },
                    { test: 'For-cause / post-incident', price: 'Flat £75–100' },
                    { test: 'Policy templates & records', price: 'Included' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><Check />{test}</span>
                      <span className="text-orange-600 font-semibold text-xs bg-orange-50 px-2 py-0.5 rounded-full">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-orange-50 rounded-xl p-3.5 text-xs text-orange-900 leading-relaxed">
                  <strong>vs. market:</strong> Emergency call-out £350–400 + 2-hour wait. <strong>We&apos;re already on site. Half the cost. Zero delay.</strong>
                </div>
              </div>
            </div>

            {/* Layer 3 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-200">
              <div className="bg-green-600 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-green-100 font-medium uppercase tracking-wide">Layer 3 · Role-Specific</div>
                  <div className="text-white font-bold text-lg">Fitness-to-Work Assessments</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">
                  Plant operators, working-at-height, and confined space workers require fitness-to-work medicals. Our paramedic performs the full physical examination on site. An occupational health physician reviews and signs remotely via the SiteMedic platform. Certificate issued same day.
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    { test: 'Plant machinery operators (Group 2)', price: '£85–110' },
                    { test: 'Working at height', price: '£85–110' },
                    { test: 'Confined space workers', price: '£85–110' },
                    { test: 'Same-day certificate', price: 'Included' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><Check />{test}</span>
                      <span className="text-green-700 font-semibold text-xs bg-green-50 px-2 py-0.5 rounded-full">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 rounded-xl p-3.5 text-xs text-green-900 leading-relaxed">
                  <strong>vs. market:</strong> ~£75 at an off-site clinic + travel + half a day. <strong>We do it on site with same-day sign-off.</strong>
                </div>
              </div>
            </div>

            {/* Layer 4 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-200">
              <div className="bg-purple-600 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-purple-100 font-medium uppercase tracking-wide">Layer 4 · Growing Requirement</div>
                  <div className="text-white font-bold text-lg">Mental Health &amp; Wellbeing</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">
                  Construction has the highest suicide rate of any UK industry. Most medic agencies can&apos;t touch this. We can — because our medics are HCPC-registered paramedics who have handled real mental health crises on site. That clinical credibility is what separates us from every wellness programme in the market.
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    { test: 'Monthly wellbeing check-ins', price: 'Included in premium' },
                    { test: 'Site wellbeing pulse score', price: 'On your dashboard' },
                    { test: 'Anonymised trend reporting', price: 'Quarterly PDF' },
                    { test: 'Crisis escalation protocol', price: 'HCPC-standard' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><Check />{test}</span>
                      <span className="text-purple-700 font-semibold text-xs bg-purple-50 px-2 py-0.5 rounded-full">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-purple-50 rounded-xl p-3.5 text-xs text-purple-900 leading-relaxed">
                  <strong>The differentiator:</strong> Delivered during idle site time by a clinician, not a wellness app. <strong>Near-zero added cost. Maximum credibility.</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition"
            >
              See full pricing for all service tiers <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── THE MATH ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">The numbers on a real site</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Mid-size London construction project · 80 workers · 12-month duration.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">Before ASG</div>
              <div className="text-2xl font-bold text-red-400 mb-6">4 providers. 4 invoices.</div>
              <div className="space-y-3 mb-4">
                {[
                  { item: 'Mobile OH van (audiometry + spirometry)', cost: '~£9,600' },
                  { item: 'Third-party D&A collector', cost: '~£4,800' },
                  { item: 'Off-site fitness medicals', cost: '~£1,500' },
                  { item: 'Site first-aid cover only', cost: '~£4,200' },
                ].map(({ item, cost }) => (
                  <div key={item} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-400">{item}</span>
                    <span className="text-slate-300 font-medium tabular-nums">{cost}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-300 font-semibold">Total / year</span>
                <span className="text-red-400 font-bold text-xl tabular-nums">~£20,100</span>
              </div>
              <p className="text-slate-600 text-xs mt-3">Plus scattered records, multiple audits, coordination overhead.</p>
            </div>

            <div className="bg-blue-600 rounded-2xl p-6 border border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-400 text-green-900 text-xs font-bold px-3 py-1.5 rounded-bl-xl">
                CONSOLIDATE &amp; SAVE
              </div>
              <div className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-4 mt-1">With Apex Safety Group</div>
              <div className="text-2xl font-bold text-white mb-6">1 medic. 1 invoice.</div>
              <div className="space-y-3 mb-4">
                {[
                  { item: 'Core medic + SiteMedic platform', cost: '£1,788' },
                  { item: 'Health surveillance (80 × 2 × £55)', cost: '£8,800' },
                  { item: 'D&A programme + incident testing', cost: '~£4,000' },
                  { item: '15 plant operator fitness medicals', cost: '£1,425' },
                ].map(({ item, cost }) => (
                  <div key={item} className="flex items-center justify-between text-sm py-1.5 border-b border-blue-500/50 last:border-0">
                    <span className="text-blue-200">{item}</span>
                    <span className="text-white font-medium tabular-nums">{cost}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-blue-100 font-semibold">Total / year</span>
                <span className="text-white font-bold text-xl tabular-nums">~£16,013</span>
              </div>
              <div className="mt-4 bg-blue-700/60 rounded-xl p-3 text-xs text-blue-100">
                <strong className="text-white">~£4,000 saved per year</strong> — with one dashboard, zero off-site travel, and automated reminders.
              </div>
            </div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-8">
            Figures based on published UK market pricing. Actual savings vary by site size and service mix.
          </p>
        </div>
      </section>

      {/* ─── WHY ASG IS SUPERIOR ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Why Apex Safety Group
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Not a medic agency. Not an OH provider.
              <br className="hidden sm:block" />
              <span className="text-blue-600"> Both. On site. Simultaneously.</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Every other option requires you to choose — either a medic agency that only does first aid, or an OH provider that books a van months ahead. ASG is the only service in the UK that delivers both, on site, every day.
            </p>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto mb-12">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wide w-1/3"></th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">Mobile OH Van</th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">First-Aid Agency</th>
                  <th className="py-3 px-4 bg-blue-50 rounded-t-xl text-blue-700 font-bold text-xs text-center border border-blue-200 border-b-0">
                    Apex Safety Group
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'HCPC-registered paramedic', van: false, agency: false, asg: true },
                  { feature: 'On site daily — no scheduling', van: false, agency: true, asg: true },
                  { feature: 'Health surveillance (on site)', van: true, agency: false, asg: true },
                  { feature: 'D&A testing (immediate)', van: false, agency: false, asg: true },
                  { feature: 'Fitness-to-work medicals', van: true, agency: false, asg: true },
                  { feature: 'Mental health check-ins', van: false, agency: false, asg: true },
                  { feature: 'Digital records in real time', van: false, agency: false, asg: true },
                  { feature: 'Single invoice for all services', van: false, agency: false, asg: true },
                  { feature: 'RIDDOR auto-flagging', van: false, agency: false, asg: true },
                  { feature: 'Works with zero signal', van: false, agency: false, asg: true },
                ].map(({ feature, van, agency, asg }, i) => (
                  <tr key={feature} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="py-3 px-4 text-slate-700 font-medium">{feature}</td>
                    <td className="py-3 px-4 text-center">
                      {van
                        ? <span className="text-green-500 font-bold">✓</span>
                        : <span className="text-slate-300 font-bold">✗</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {agency
                        ? <span className="text-green-500 font-bold">✓</span>
                        : <span className="text-slate-300 font-bold">✗</span>}
                    </td>
                    <td className={`py-3 px-4 text-center bg-blue-50 border-x border-blue-200 ${i === 9 ? 'border-b rounded-b-xl' : ''}`}>
                      {asg
                        ? <span className="text-blue-600 font-bold text-base">✓</span>
                        : <span className="text-slate-300 font-bold">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Why we win — 6 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                Icon: Shield,
                title: 'HCPC grade unlocks services others cannot deliver',
                desc: 'First-aid agencies are legally barred from performing health surveillance, D&A collections, or fitness examinations. Our HCPC-registered paramedics can do all of it — on site, right now.',
                color: 'blue',
              },
              {
                Icon: MapPin,
                title: 'Already there — no call-out, no delay',
                desc: 'Post-incident D&A. Sudden fitness concern. A worker who needs an immediate assessment. We don\'t need to be called. We\'re already on site. That changes everything about response time.',
                color: 'green',
              },
              {
                Icon: AlertCircle,
                title: 'Zero missed RIDDOR deadlines — ever',
                desc: 'Every treatment logged triggers an automatic RIDDOR check. Reportable incidents are flagged in real time with HSE deadlines and pre-filled forms. Not reviewed the next morning. Now.',
                color: 'red',
              },
              {
                Icon: Bell,
                title: 'Automated annual surveillance — nothing slips',
                desc: 'The platform tracks every worker\'s surveillance due dates. Your site manager gets reminders at 30, 14, 7, and 1 day. No spreadsheet. No calendar reminder. No missed legal obligation.',
                color: 'orange',
              },
              {
                Icon: Receipt,
                title: 'One invoice replaces four',
                desc: 'Your procurement team deals with one supplier. Your finance team processes one invoice. Your HSE file has one record system. The simplicity of that is itself a compliance risk reduction.',
                color: 'slate',
              },
              {
                Icon: Star,
                title: 'Construction-specific from the ground up',
                desc: 'Not a generic OH service adapted for construction. Every service, every regulation, every workflow is built around UK construction law — CDM 2015, COSHH, Control of Noise at Work, RIDDOR 2013.',
                color: 'purple',
              },
            ].map(({ Icon, title, desc, color }) => {
              const bg: Record<string, string> = {
                blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100',
                red: 'bg-red-50 border-red-100', orange: 'bg-orange-50 border-orange-100',
                slate: 'bg-slate-50 border-slate-200', purple: 'bg-purple-50 border-purple-100',
              };
              const ib: Record<string, string> = {
                blue: 'bg-blue-100', green: 'bg-green-100', red: 'bg-red-100',
                orange: 'bg-orange-100', slate: 'bg-slate-200', purple: 'bg-purple-100',
              };
              const ic: Record<string, string> = {
                blue: 'text-blue-600', green: 'text-green-600', red: 'text-red-600',
                orange: 'text-orange-600', slate: 'text-slate-600', purple: 'text-purple-600',
              };
              const tc: Record<string, string> = {
                blue: 'text-blue-800', green: 'text-green-800', red: 'text-red-800',
                orange: 'text-orange-800', slate: 'text-slate-800', purple: 'text-purple-800',
              };
              return (
                <div key={title} className={`p-6 rounded-xl border ${bg[color]}`}>
                  <div className={`w-10 h-10 ${ib[color]} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${ic[color]}`} />
                  </div>
                  <h3 className={`font-semibold text-sm mb-2 ${tc[color]}`}>{title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">How it works</h2>
          <p className="text-slate-500 text-center mb-12 text-sm max-w-lg mx-auto">
            From first enquiry to automated compliance in four steps.
          </p>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-blue-200 z-0" />
            {[
              { step: 1, title: 'Book online', desc: 'Tell us your site size, duration, and compliance needs. We build a bespoke package.' },
              { step: 2, title: 'Medic on site', desc: 'Your HCPC paramedic arrives. First aid, surveillance tests, and D&A checks run simultaneously.' },
              { step: 3, title: 'Auto-logged', desc: 'Every result and certificate lands in SiteMedic in real time. Signed. Timestamped.' },
              { step: 4, title: 'Always compliant', desc: 'RIDDOR auto-flagged. Surveillance reminders sent. Weekly safety summary to your inbox.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center relative z-10">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-md shadow-blue-200">
                  {step}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POWERED BY SITEMEDIC — BRIEF ─────────────────────────────────── */}
      <section className="py-14 px-4 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-semibold mb-3">
                Powered by SiteMedic
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                Every service we deliver is logged automatically
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Your site manager sees one compliance dashboard. Your HSE auditor finds one record set. Every treatment, test result, fitness certificate, and near-miss is linked to each worker&apos;s profile, timestamped, and audit-ready — from the moment it happens.
              </p>
              <Link
                href="https://sitemedic.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-semibold text-sm transition"
              >
                Learn about the SiteMedic platform <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="md:w-64 flex-shrink-0 grid grid-cols-2 gap-3">
              {[
                { icon: FileCheck, label: 'RIDDOR auto-flagging' },
                { icon: Bell, label: 'Surveillance reminders' },
                { icon: ClipboardCheck, label: 'Compliance dashboard' },
                { icon: Lock, label: 'UK GDPR · UK-hosted' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <Icon className="w-5 h-5 text-sky-600 mx-auto mb-1.5" />
                  <div className="text-xs text-slate-600 font-medium leading-snug">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE GRID ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">Fully compliant, audit-ready</h2>
          <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto text-sm">
            Every service we deliver is grounded in UK law — not adapted from a generic template.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { Icon: Shield, title: 'HCPC-Registered', desc: 'All paramedics verified' },
              { Icon: FileCheck, title: 'RIDDOR 2013', desc: 'Auto-flagging & reporting' },
              { Icon: HardHat, title: 'CDM 2015', desc: 'Construction compliance' },
              { Icon: Lock, title: 'UK GDPR', desc: 'Secure, UK-hosted data' },
              { Icon: ClipboardCheck, title: 'HSE Audit-Ready', desc: 'Inspection-ready records' },
              { Icon: Wind, title: 'COSHH', desc: 'Hazardous substance controls' },
              { Icon: Ear, title: 'Control of Noise', desc: 'Audiometry compliance' },
              { Icon: HeartPulse, title: 'HASAWA 1974', desc: 'Health & Safety at Work' },
              { Icon: Brain, title: 'Mental Health', desc: 'ISO 45003 aligned' },
              { Icon: Stethoscope, title: 'SEQOHS', desc: 'Occupational health quality' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm transition duration-200">
                <Icon className="h-8 w-8 text-blue-600 mb-2.5" />
                <h3 className="text-xs font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-blue-600 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stop managing four OH providers
          </h2>
          <p className="text-blue-100 text-lg mb-2 max-w-xl mx-auto">
            Tell us about your site. We&apos;ll scope a package that covers every legal obligation — health surveillance, D&amp;A, fitness-to-work — and delivers it all without a single off-site trip.
          </p>
          <p className="text-blue-300 text-sm mb-10">
            Serving construction sites across England &amp; Wales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 active:scale-95 transition shadow-xl"
            >
              Book a Medic
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-white/70 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 hover:border-white transition flex items-center justify-center gap-2"
            >
              View Pricing <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-blue-300 text-xs mt-10">
            Powered by <span className="text-white font-semibold">SiteMedic</span> — the compliance platform built for UK construction OH.
          </p>
        </div>
      </section>

    </div>
  );
}
