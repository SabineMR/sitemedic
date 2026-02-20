import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  FileCheck,
  Database,
  Bell,
  Building2,
  Wifi,
  ClipboardCheck,
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  Users,
  AlertTriangle,
  Ear,
  FlaskConical,
  Stethoscope,
  Brain,
  Receipt,
  Code2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'UK Occupational Health Compliance Platform',
  description: 'SiteMedic is the digital backbone for medic agencies and OH providers across the UK. RIDDOR auto-flagging, worker health profiles, health surveillance tracking, and more.',
  openGraph: {
    title: 'SiteMedic — UK Occupational Health Compliance Platform',
    description: 'The compliance platform for occupational health. RIDDOR auto-flagging, worker health profiles, health surveillance tracking, drug test logging, fitness certificates, and multi-site management.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'SiteMedic — UK Occupational Health Compliance Platform',
    description: 'The compliance platform for occupational health providers across the UK.',
  },
};

export const dynamic = 'force-static';
export const revalidate = 86400;

function Check() {
  return (
    <svg className="w-4 h-4 text-sky-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50/70 via-white to-white pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #0284c7 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 font-medium shadow-sm mb-6">
            <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
            Built for UK occupational health · England, Wales &amp; Ireland
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            The compliance platform for
            <br />
            <span className="text-sky-600">occupational health</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-4 leading-relaxed">
            SiteMedic is the digital backbone for medic agencies and OH providers across the UK. RIDDOR auto-flagging, worker health profiles, health surveillance tracking, drug test logging, fitness certificates, and multi-site management — all in one platform.
          </p>
          <p className="text-base text-slate-500 max-w-2xl mx-auto mb-10">
            Stop building spreadsheets. Stop losing records. Stop chasing sign-offs. Go live in a day.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link
              href="#get-started"
              className="bg-sky-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-sky-700 active:scale-95 transition shadow-lg hover:shadow-sky-200 hover:shadow-xl text-center"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="bg-white text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-50 active:scale-95 transition border-2 border-slate-200 shadow-sm text-center"
            >
              See the Platform
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-500">
            {['UK GDPR Compliant', 'UK-Hosted Data', 'Works Offline', 'RIDDOR 2013', 'HSWA 1974'].map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <Check />
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────────────────── */}
      <section className="py-10 px-4 bg-sky-600">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {[
            { value: '< 1 min', label: 'Treatment logged to RIDDOR check' },
            { value: '100%', label: 'Offline capable — works with zero signal' },
            { value: '1', label: 'Dashboard for every compliance obligation' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="text-2xl sm:text-4xl font-bold text-white">{value}</div>
              <div className="text-sky-200 text-xs sm:text-sm leading-snug max-w-[130px]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-sm font-medium mb-4">
              Platform Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything your OH operation needs
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              From first treatment to annual surveillance reminders — SiteMedic runs your compliance operation so your medics can focus on the work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                Icon: Database,
                title: 'Worker Health Profiles',
                desc: 'Every worker gets a digital health record. Treatments, surveillance results, drug test outcomes, and fitness certificates — all linked, all searchable.',
                color: 'sky',
              },
              {
                Icon: AlertTriangle,
                title: 'RIDDOR Auto-Flagging',
                desc: 'Every treatment is automatically checked against RIDDOR 2013 criteria. Reportable incidents are flagged with HSE deadlines and pre-filled forms. No manual checking.',
                color: 'red',
              },
              {
                Icon: Bell,
                title: 'Surveillance Reminders',
                desc: 'The platform tracks every worker\'s annual surveillance due dates. Progressive alerts at 30, 14, 7, and 1 day before expiry to managers, admins, and medics.',
                color: 'orange',
              },
              {
                Icon: Wifi,
                title: 'Offline-First',
                desc: 'Remote worksites don\'t always have signal. SiteMedic captures all data locally and syncs automatically the moment connectivity returns. Nothing is ever lost.',
                color: 'green',
              },
              {
                Icon: LayoutDashboard,
                title: 'Compliance Dashboard',
                desc: 'One score. Site managers see their full compliance status at a glance — treatments, surveillance due, RIDDOR flags, near-misses — all in a single view.',
                color: 'purple',
              },
              {
                Icon: Building2,
                title: 'Multi-Site Management',
                desc: 'Manage every site from one account. Territory-based assignment, medic scheduling, and cross-site reporting all built in. Designed for agencies with multiple clients.',
                color: 'slate',
              },
              {
                Icon: ClipboardCheck,
                title: 'Audit-Ready Records',
                desc: 'Every action — every treatment logged, every consent signed, every certificate issued — is timestamped, signed, and stored. HSE-ready on demand.',
                color: 'sky',
              },
              {
                Icon: Receipt,
                title: 'Invoicing & Payouts',
                desc: 'Net-30 invoicing for corporate clients. Weekly medic payouts via UK Faster Payments. Full IR35 assessment workflow. Everything built for UK employment law.',
                color: 'green',
              },
              {
                Icon: Lock,
                title: 'UK GDPR & Security',
                desc: 'Health data is sensitive. SiteMedic is UK-hosted, row-level security isolated per organisation, with full audit logging and GDPR-compliant data retention policies.',
                color: 'slate',
              },
            ].map(({ Icon, title, desc, color }) => {
              const bg: Record<string, string> = {
                sky: 'bg-sky-50 border-sky-100', red: 'bg-red-50 border-red-100',
                orange: 'bg-orange-50 border-orange-100', green: 'bg-green-50 border-green-100',
                purple: 'bg-purple-50 border-purple-100', slate: 'bg-slate-50 border-slate-200',
              };
              const ib: Record<string, string> = {
                sky: 'bg-sky-100', red: 'bg-red-100', orange: 'bg-orange-100',
                green: 'bg-green-100', purple: 'bg-purple-100', slate: 'bg-slate-200',
              };
              const ic: Record<string, string> = {
                sky: 'text-sky-600', red: 'text-red-600', orange: 'text-orange-600',
                green: 'text-green-600', purple: 'text-purple-600', slate: 'text-slate-600',
              };
              const tc: Record<string, string> = {
                sky: 'text-sky-800', red: 'text-red-800', orange: 'text-orange-800',
                green: 'text-green-800', purple: 'text-purple-800', slate: 'text-slate-800',
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

      {/* ─── CLINICAL SERVICE MODULES ─────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-sm font-medium mb-4">
              Clinical Modules
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Built for every OH service you deliver
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              SiteMedic has dedicated modules for each clinical service. Results flow into worker profiles automatically.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                Icon: Ear,
                label: 'Health Surveillance',
                items: ['Audiometry results', 'Spirometry readings', 'HAVS scores (Tier 1 & 2)', 'Skin check outcomes'],
                color: 'sky',
              },
              {
                Icon: FlaskConical,
                label: 'Drug & Alcohol',
                items: ['Test result logging', 'Chain of custody', 'Random selection records', 'Policy document storage'],
                color: 'orange',
              },
              {
                Icon: Stethoscope,
                label: 'Fitness-to-Work',
                items: ['Examination records', 'Remote physician sign-off', 'Certificate generation', 'Expiry tracking'],
                color: 'green',
              },
              {
                Icon: Brain,
                label: 'Mental Health',
                items: ['Wellbeing check-in logs', 'Anonymised pulse score', 'Trend reporting', 'Crisis escalation trail'],
                color: 'purple',
              },
            ].map(({ Icon, label, items, color }) => {
              const hdr: Record<string, string> = {
                sky: 'bg-sky-600', orange: 'bg-orange-500', green: 'bg-green-600', purple: 'bg-purple-600',
              };
              return (
                <div key={label} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className={`${hdr[color]} px-5 py-3 flex items-center gap-2`}>
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-semibold text-sm">{label}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {items.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FOR WHO ──────────────────────────────────────────────────────── */}
      <section id="for-who" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-sm font-medium mb-4">
              Who Uses SiteMedic
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Built for the whole chain</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              One platform. Multiple roles. Everyone sees what they need.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                role: 'Medic Agencies',
                desc: 'Run your entire OH operation — booking management, medic scheduling, territory assignment, invoicing, and compliance reporting — from one admin dashboard.',
                features: ['Command centre dispatch', 'Medic roster & certs', 'Revenue analytics', 'Org-level compliance'],
              },
              {
                role: 'On-Site Medics',
                desc: 'Log treatments and run surveillance checks directly from your phone or tablet, with or without internet. Everything syncs automatically.',
                features: ['Offline treatment logging', 'Surveillance test entry', 'D&A test recording', 'Digital consent capture'],
              },
              {
                role: 'Site Managers',
                desc: 'Your compliance dashboard shows you everything happening on your site — treatments, RIDDOR flags, worker surveillance status, and near-miss reports.',
                features: ['Live site overview', 'RIDDOR auto-flagging', 'Worker health status', 'Weekly safety summaries'],
              },
              {
                role: 'Employers & Companies',
                desc: 'Single source of truth for all your sites and all your workers. Annual surveillance due dates tracked. HSE-ready records always on hand.',
                features: ['Multi-site dashboard', 'Surveillance due dates', 'PDF compliance reports', 'Audit trail exports'],
              },
            ].map(({ role, desc, features }) => (
              <div key={role} className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-sky-200 hover:bg-white hover:shadow-sm transition duration-200">
                <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-4 h-4 text-sky-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">{role}</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-3">{desc}</p>
                <ul className="space-y-1.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POWERED BY — TRUSTED CUSTOMER ───────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-4">Powered by SiteMedic</div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Apex Safety Group runs their entire operation on SiteMedic
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              ASG is an HCPC-registered paramedic agency delivering full occupational health services across England, Wales &amp; Ireland. They use SiteMedic to power every part of their clinical operation.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                stat: '4',
                label: 'Clinical service layers delivered',
                sub: 'Health surveillance, D&A, fitness-to-work, mental health — all logged in SiteMedic',
              },
              {
                stat: '9\u00d7',
                label: 'Revenue vs. medic-only model',
                sub: 'SiteMedic\'s per-worker billing and surveillance tracking unlocks clinical add-on revenue',
              },
              {
                stat: '0',
                label: 'Missed RIDDOR deadlines',
                sub: 'Auto-flagging means nothing slips through, even on complex multi-trade sites',
              },
            ].map(({ stat, label, sub }) => (
              <div key={label} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="text-3xl font-bold text-sky-400 mb-2">{stat}</div>
                <div className="text-white font-semibold text-sm mb-1">{label}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://apexsafetygroup.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium transition"
            >
              Visit Apex Safety Group <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ─── TECH / HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">From sign-up to your first live site in under a day.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-sky-200 z-0" />
            {[
              { step: 1, title: 'Create your org', desc: 'Sign up, configure your organisation, add medics and territories.' },
              { step: 2, title: 'Set up your sites', desc: 'Add clients, define sites, assign your medic to the booking.' },
              { step: 3, title: 'Go live on site', desc: 'Medic logs in (offline-capable), captures treatments and tests in real time.' },
              { step: 4, title: 'Auto-compliance', desc: 'RIDDOR flagged, reminders scheduled, reports generated. Nothing manual.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center relative z-10">
                <div className="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-md shadow-sky-200">
                  {step}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-sm font-medium mb-4">
              Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Platform pricing
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Software pricing for the SiteMedic platform. Clinical services (health surveillance, D&A testing, fitness assessments) are priced per worker through the platform — your clients pay for what they use.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Starter</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">&pound;149<span className="text-lg text-slate-400 font-normal">/mo</span></div>
              <div className="text-slate-400 text-xs mb-6">+VAT · up to 2 medics</div>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Treatment logging & RIDDOR flagging',
                  'Worker health profiles (up to 500)',
                  'Weekly safety reports',
                  'Offline-first mobile app',
                  '1 organisation · 1 site',
                  'Email support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="#get-started"
                className="block w-full text-center border-2 border-sky-600 text-sky-600 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-sky-50 transition"
              >
                Get Started
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className="bg-sky-600 rounded-2xl border border-sky-500 p-7 shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-green-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              </div>
              <div className="text-sky-200 text-xs font-semibold uppercase tracking-widest mb-3">Pro</div>
              <div className="text-4xl font-bold text-white mb-1">&pound;299<span className="text-lg text-sky-200 font-normal">/mo</span></div>
              <div className="text-sky-300 text-xs mb-6">+VAT · unlimited medics</div>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Everything in Starter',
                  'Unlimited worker profiles',
                  'Multi-site management',
                  'Health surveillance tracking + reminders',
                  'Drug & alcohol test logging',
                  'Fitness-to-work certificate management',
                  'Admin command centre & scheduling',
                  'Revenue analytics & invoicing',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-sky-100">
                    <svg className="w-4 h-4 text-sky-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="#get-started"
                className="block w-full text-center bg-white text-sky-600 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-sky-50 active:scale-95 transition shadow-lg"
              >
                Get Started
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Enterprise</div>
              <div className="text-4xl font-bold text-slate-900 mb-1">Custom</div>
              <div className="text-slate-400 text-xs mb-6">Multi-org · white-label available</div>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Everything in Pro',
                  'Multi-org / group accounts',
                  'White-label branding option',
                  'Custom integrations (API access)',
                  'SLA-backed uptime guarantee',
                  'Dedicated account manager',
                  'On-site implementation support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="#get-started"
                className="block w-full text-center border-2 border-slate-300 text-slate-700 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition"
              >
                Contact Sales
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            Clinical service modules (health surveillance, D&A, fitness-to-work) are add-ons billed per worker through the platform. No platform fee for clinical-only modules.
          </p>
        </div>
      </section>

      {/* ─── GET STARTED CTA ──────────────────────────────────────────────── */}
      <section id="get-started" className="py-20 px-4 bg-sky-600 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Start running compliant OH today
          </h2>
          <p className="text-sky-100 text-lg mb-3 max-w-xl mx-auto">
            Get your org set up, add your first medic, and go live on your first site — in under a day.
          </p>
          <p className="text-sky-300 text-sm mb-10">
            England, Wales &amp; Ireland
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="bg-white text-sky-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-sky-50 active:scale-95 transition shadow-xl"
            >
              Start Free Trial
            </Link>
            <Link
              href="#pricing"
              className="border-2 border-white/70 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-sky-700 hover:border-white transition flex items-center justify-center gap-2"
            >
              View Pricing <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-sky-300 text-xs mt-10">
            Need on-site medics too?{' '}
            <a
              href="https://apexsafetygroup.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-2 hover:text-sky-100"
            >
              Visit Apex Safety Group
            </a>{' '}
            — powered by SiteMedic.
          </p>
        </div>
      </section>

    </div>
  );
}
