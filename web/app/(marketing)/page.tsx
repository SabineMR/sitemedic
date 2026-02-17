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
  CheckCircle2,
  ArrowRight,
  Building2,
  Zap,
  Database,
} from 'lucide-react';

export const dynamic = 'force-static';
export const revalidate = 86400;

const CHECK = (
  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Powered-by badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Powered by{' '}
              <span className="text-blue-600 font-semibold">SiteMedic</span>
              <span className="text-slate-400">·</span>
              UK construction only
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 text-center mb-6 leading-tight">
            One medic. Every compliance
            <br />
            <span className="text-blue-600">need. One invoice.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 text-center mb-4 max-w-3xl mx-auto leading-relaxed">
            Apex Safety Group puts an HCPC-registered paramedic on your construction site — and wraps around them a full occupational health service. Health surveillance. Drug &amp; alcohol testing. Fitness-to-work medicals. All on site. All logged automatically in the SiteMedic platform.
          </p>
          <p className="text-base text-slate-500 text-center mb-10 max-w-2xl mx-auto">
            Stop paying four separate providers. Stop losing worker hours to off-site clinics. Stop chasing records from mobile OH vans. We replace all of it.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/book"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl text-center"
            >
              Book a Medic
            </Link>
            <QuoteButton />
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-sm text-slate-500">
            {[
              'HCPC-Registered',
              'RIDDOR 2013',
              'CDM 2015',
              'HASAWA 1974',
              'COSHH',
              'UK GDPR',
            ].map((badge) => (
              <span key={badge} className="flex items-center gap-2">
                {CHECK}
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROBLEM ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Construction site health compliance is fragmented and expensive
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-2xl mx-auto">
            Right now, most UK construction sites manage occupational health across at least four separate providers — and none of them talk to each other.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
            {[
              {
                title: 'Mobile OH vans — booked months ahead',
                desc: 'You wait weeks for a slot. Workers lose half a day queuing. Data goes into a PDF that no one can find.',
              },
              {
                title: 'Off-site clinics — productivity lost',
                desc: '£75–£127 per audiometry test. Travel time not billed to anyone. Worker returns tomorrow.',
              },
              {
                title: 'Third-party D&A collectors — slow and expensive',
                desc: '£350–400 emergency call-out for a post-incident test. Two-hour wait. No chain of custody guarantee.',
              },
              {
                title: 'Scattered records — HSE audit risk',
                desc: 'Surveillance results in one system. RIDDOR in another. Fitness certs in a filing cabinet. No single source of truth.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-800 rounded-lg p-5 border border-slate-700">
                <div className="text-red-400 font-semibold text-sm mb-1">✕ {item.title}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOLUTION / WHAT IS SITEMEDIC ─────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
                Powered by SiteMedic
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                The platform that makes one medic do the work of four providers
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                SiteMedic is the compliance platform built specifically for UK construction occupational health. Every service Apex Safety Group delivers flows into a single dashboard — treatments, surveillance results, drug test outcomes, fitness certificates, RIDDOR flags, near-misses — all linked to each worker&apos;s profile, all audit-ready.
              </p>
              <p className="text-slate-600 leading-relaxed mb-6">
                Your site manager sees one compliance score. Your HSE auditor sees one record set. Your insurer sees one documented system. No spreadsheets. No PDF folders. No chasing.
              </p>
              <div className="space-y-3">
                {[
                  'All data UK-hosted, UK GDPR compliant',
                  'Automated reminders when annual surveillance is due',
                  'RIDDOR auto-flagging — no manual reporting',
                  'Works offline on site with zero signal',
                  'Digital signatures for consent and fitness certificates',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">What&apos;s in the platform</h3>
              <div className="space-y-4">
                {[
                  { icon: Database, label: 'Worker health profiles', desc: 'Full surveillance history per worker' },
                  { icon: FileCheck, label: 'RIDDOR auto-flagging', desc: 'Reportable incidents identified instantly' },
                  { icon: ClipboardCheck, label: 'Compliance dashboard', desc: 'Single score for HSE audits' },
                  { icon: Zap, label: 'Automated reminders', desc: 'Annual surveillance due dates tracked' },
                  { icon: Shield, label: 'Audit trail', desc: 'Every action logged and timestamped' },
                  { icon: Building2, label: 'Multi-site support', desc: 'Manage all your sites from one account' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{label}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 SERVICE LAYERS ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Clinical Services — England &amp; Wales
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Four service layers. One site visit.
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Every Apex Safety Group medic is an HCPC-registered paramedic. That clinical grade means we can deliver services most agencies can&apos;t — and do them on site, during normal working hours, with zero productivity loss.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">

            {/* Layer 1: Health Surveillance */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
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
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  UK law requires employers to provide health surveillance for workers exposed to noise, vibration, dust, or hazardous substances. On a construction site, that&apos;s nearly everyone. We deliver all four required tests on site — no mobile van booking, no lost worker hours.
                </p>
                <div className="space-y-2 mb-5">
                  {[
                    { test: 'Audiometry (hearing)', price: 'from £45/worker' },
                    { test: 'Spirometry (lung function)', price: 'from £45/worker' },
                    { test: 'HAVS screening (Tier 1 &amp; 2)', price: 'from £35/worker' },
                    { test: 'Skin assessments (dermatitis)', price: 'from £30/worker' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        {CHECK}
                        <span dangerouslySetInnerHTML={{ __html: test }} />
                      </span>
                      <span className="text-blue-600 font-medium text-xs">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
                  <strong>The saving:</strong> Market rate is £72–£127/worker at an off-site clinic. We do it on site for £35–65. 80 workers × 2 tests = <strong>up to £8,800/year saved in lost productivity alone.</strong>
                </div>
              </div>
            </div>

            {/* Layer 2: Drug & Alcohol */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
              <div className="bg-orange-500 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-orange-200 font-medium uppercase tracking-wide">Layer 2 · Contractually Required</div>
                  <div className="text-white font-bold text-lg">Drug &amp; Alcohol Testing</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Most principal contractors now require D&amp;A testing as a condition of working on their sites. The industry standard for a post-incident call-out is £350–400 and a two-hour wait. Your Apex medic is already on site.
                </p>
                <div className="space-y-2 mb-5">
                  {[
                    { test: 'Random testing programmes', price: '£30–42/worker tested' },
                    { test: 'Pre-induction screening', price: '£25–35/worker' },
                    { test: 'For-cause / post-incident', price: 'Flat £75–100' },
                    { test: 'Policy templates &amp; records', price: 'Included' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        {CHECK}
                        <span dangerouslySetInnerHTML={{ __html: test }} />
                      </span>
                      <span className="text-orange-600 font-medium text-xs">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-800">
                  <strong>The saving:</strong> Emergency call-out costs £350–400 + 2 hours. We&apos;re already there. Post-incident testing at a flat <strong>£75–100 — half the market rate.</strong>
                </div>
              </div>
            </div>

            {/* Layer 3: Fitness to Work */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
              <div className="bg-green-600 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-green-200 font-medium uppercase tracking-wide">Layer 3 · Role-Specific</div>
                  <div className="text-white font-bold text-lg">Fitness-to-Work Assessments</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Plant operators, working-at-height operatives, and confined space workers require fitness-to-work medicals. Our HCPC-registered paramedic performs the physical examination on site. An occupational health physician reviews and signs the certificate remotely via SiteMedic — same day.
                </p>
                <div className="space-y-2 mb-5">
                  {[
                    { test: 'Plant machinery operators (Group 2)', price: '£85–110/assessment' },
                    { test: 'Working at height', price: '£85–110/assessment' },
                    { test: 'Confined space workers', price: '£85–110/assessment' },
                    { test: 'Certificate issued same day', price: 'Included' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        {CHECK}
                        {test}
                      </span>
                      <span className="text-green-600 font-medium text-xs">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-xs text-green-800">
                  <strong>The saving:</strong> Market rate at an off-site clinic is ~£75 + travel + half a day. We do it on site for <strong>£85–110 with same-day remote physician sign-off.</strong>
                </div>
              </div>
            </div>

            {/* Layer 4: Mental Health */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
              <div className="bg-purple-600 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-purple-200 font-medium uppercase tracking-wide">Layer 4 · Growing Requirement</div>
                  <div className="text-white font-bold text-lg">Mental Health &amp; Wellbeing</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Construction has the highest suicide rate of any UK industry. Principal contractors and the CITB increasingly require a mental health component in site welfare provisions. An HCPC-registered paramedic who has handled real mental health crises carries credibility a wellness app never will.
                </p>
                <div className="space-y-2 mb-5">
                  {[
                    { test: 'Monthly wellbeing check-ins', price: 'Included in premium' },
                    { test: 'Wellbeing pulse score per site', price: 'On your dashboard' },
                    { test: 'Anonymised trend reporting', price: 'Quarterly PDF' },
                    { test: 'Crisis escalation protocol', price: 'HCPC-standard' },
                  ].map(({ test, price }) => (
                    <div key={test} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        {CHECK}
                        {test}
                      </span>
                      <span className="text-purple-600 font-medium text-xs">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-xs text-purple-800">
                  <strong>Why this matters:</strong> This differentiates you from every other medic agency on the market — and it&apos;s delivered during idle site time, making it <strong>near-zero additional cost.</strong>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── THE MATH ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">The numbers on a real site</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Mid-size London construction project. 80 workers. 12-month duration.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Before */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="text-slate-400 text-sm font-medium uppercase tracking-wide mb-4">Before ASG</div>
              <div className="text-3xl font-bold text-red-400 mb-6">4 providers. 4 invoices.</div>
              <div className="space-y-3">
                {[
                  { item: 'Mobile OH van (audiometry + spirometry)', cost: '~£9,600' },
                  { item: 'Third-party D&A collector', cost: '~£4,800' },
                  { item: 'Off-site fitness medicals', cost: '~£1,500' },
                  { item: 'Site first-aid cover only', cost: '~£4,200' },
                ].map(({ item, cost }) => (
                  <div key={item} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{item}</span>
                    <span className="text-slate-300 font-medium">{cost}</span>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-3 flex justify-between">
                  <span className="text-slate-300 font-semibold">Total</span>
                  <span className="text-red-400 font-bold text-lg">~£20,100 / year</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-4">Plus: scattered records, 3 separate audits, coordination overhead, off-site travel time.</p>
            </div>

            {/* After */}
            <div className="bg-blue-600 rounded-2xl p-6 border border-blue-500 relative">
              <div className="absolute top-4 right-4">
                <span className="bg-green-400 text-green-900 text-xs font-bold px-2 py-1 rounded-full">CONSOLIDATE &amp; SAVE</span>
              </div>
              <div className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-4">With Apex Safety Group</div>
              <div className="text-3xl font-bold text-white mb-6">1 medic. 1 invoice.</div>
              <div className="space-y-3">
                {[
                  { item: 'Core medic + SiteMedic platform', cost: '£1,788/yr' },
                  { item: 'Health surveillance (80 × 2 tests × £55)', cost: '£8,800' },
                  { item: 'D&A testing programme + incidents', cost: '~£4,000' },
                  { item: '15 plant operator fitness medicals', cost: '£1,425' },
                ].map(({ item, cost }) => (
                  <div key={item} className="flex items-center justify-between text-sm">
                    <span className="text-blue-200">{item}</span>
                    <span className="text-white font-medium">{cost}</span>
                  </div>
                ))}
                <div className="border-t border-blue-500 pt-3 flex justify-between">
                  <span className="text-blue-100 font-semibold">Total</span>
                  <span className="text-white font-bold text-lg">~£16,013 / year</span>
                </div>
              </div>
              <div className="mt-4 bg-blue-700 rounded-lg p-3 text-xs text-blue-100">
                <strong className="text-white">You save ~£4,000/year</strong> — and get a single compliance dashboard, automated reminders, and zero off-site travel.
              </div>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            Figures based on market pricing as of 2025. Actual savings vary by site size and service mix.
          </p>
        </div>
      </section>

      {/* ─── WHY ASG IS THE BEST ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Why Apex Safety Group
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              There are other medic agencies. There are other OH providers. There is no one else doing both — on site, with a clinical-grade platform, for construction.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'HCPC-Registered, not just first-aiders',
                desc: 'Our medics are HCPC-registered paramedics. That clinical grade is what lets us deliver Tier 1/2 health surveillance, administer drug tests, and perform fitness examinations — services no first-aid agency can legally provide.',
                color: 'blue',
              },
              {
                title: 'On site — zero productivity loss',
                desc: 'Every test happens on site during normal working hours. No off-site travel. No half-day absences. No mobile van coordination. Your workers are tested and back at their station within minutes.',
                color: 'green',
              },
              {
                title: 'Digital-first with SiteMedic',
                desc: 'Every result, every signature, every certificate is logged in real time into the SiteMedic platform. One dashboard. One compliance score. Audit-ready from day one.',
                color: 'purple',
              },
              {
                title: 'Automated compliance — nothing falls through',
                desc: 'The platform tracks every worker\'s surveillance due dates. When someone\'s annual audiometry is approaching, you get a reminder. When a fitness cert is expiring, you\'re notified. Nothing is manual.',
                color: 'orange',
              },
              {
                title: 'Legally compliant at every level',
                desc: 'From COSHH to the Control of Noise at Work Regulations, CDM 2015 to RIDDOR 2013 — our services are designed around UK law, not adapted from it.',
                color: 'red',
              },
              {
                title: 'One invoice, one point of contact',
                desc: 'Your site manager deals with one person. Your finance team pays one invoice. Your compliance record lives in one place. That simplicity is itself a risk reduction.',
                color: 'slate',
              },
            ].map(({ title, desc, color }) => {
              const colorMap: Record<string, string> = {
                blue: 'bg-blue-50 border-blue-200',
                green: 'bg-green-50 border-green-200',
                purple: 'bg-purple-50 border-purple-200',
                orange: 'bg-orange-50 border-orange-200',
                red: 'bg-red-50 border-red-200',
                slate: 'bg-slate-50 border-slate-200',
              };
              const textMap: Record<string, string> = {
                blue: 'text-blue-700',
                green: 'text-green-700',
                purple: 'text-purple-700',
                orange: 'text-orange-700',
                red: 'text-red-700',
                slate: 'text-slate-700',
              };
              return (
                <div key={title} className={`p-6 rounded-xl border ${colorMap[color]}`}>
                  <h3 className={`font-semibold text-base mb-2 ${textMap[color]}`}>{title}</h3>
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
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-4 gap-6 relative">
            {[
              {
                step: 1,
                title: 'Book online',
                desc: 'Tell us your site size, duration, and compliance needs. We build you a bespoke package.',
              },
              {
                step: 2,
                title: 'Medic on site',
                desc: 'Your HCPC-registered paramedic arrives. First aid, surveillance tests, and D&A checks all run simultaneously.',
              },
              {
                step: 3,
                title: 'Auto-logged',
                desc: 'Every treatment, test result, and fitness cert lands in SiteMedic in real time. All signed. All timestamped.',
              },
              {
                step: 4,
                title: 'Always compliant',
                desc: 'RIDDOR auto-flagged. Surveillance reminders sent. One weekly safety summary to your inbox. Nothing to chase.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center relative">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  {step}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE GRID ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Fully compliant, audit-ready
          </h2>
          <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto text-sm">
            Every service we deliver is grounded in UK law and HSE guidance — not adapted from generic occupational health frameworks.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              { Icon: Stethoscope, title: 'SEQOHS Standards', desc: 'Occupational health quality' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition">
                <Icon className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="text-xs font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Replace your OH providers with one call
          </h2>
          <p className="text-blue-100 text-lg mb-3 max-w-xl mx-auto">
            Tell us about your site. We&apos;ll build a compliance package that covers every legal obligation — and saves you money doing it.
          </p>
          <p className="text-blue-200 text-sm mb-10">
            Serving construction sites across England &amp; Wales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition shadow-lg"
            >
              Book a Medic
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              View Pricing <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-blue-200 text-sm mt-8">
            Powered by <span className="text-white font-semibold">SiteMedic</span> — the compliance platform built for UK construction.
          </p>
        </div>
      </section>

    </div>
  );
}
