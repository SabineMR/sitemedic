import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Professional Paramedics for Events & Worksites',
  description: 'Book HCPC-registered paramedics for film sets, music festivals, motorsport events, construction sites, and more. Compliance records generated automatically.',
  openGraph: {
    title: 'Professional Paramedics for Events & Worksites',
    description: 'Book HCPC-registered paramedics for film sets, music festivals, motorsport events, construction sites, and more.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Professional Paramedics for Events & Worksites',
    description: 'Book HCPC-registered paramedics for film sets, music festivals, motorsport events, construction sites, and more.',
  },
};
import QuoteButton from '@/components/marketing/quote-button';
import {
  Shield,
  FileCheck,
  Lock,
  ClipboardCheck,
  Bell,
  Receipt,
  MapPin,
  Star,
  AlertCircle,
  ArrowRight,
  Film,
  Gauge,
  HardHat,
  Music,
  Trophy,
  Briefcase,
  Heart,
  GraduationCap,
  Mountain,
  Zap,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Users,
  CheckCircle2,
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

const coreVerticals = [
  {
    Icon: Film,
    title: 'TV & Film Productions',
    desc: 'On-set paramedics for film, TV, commercials and music videos. SAG/BECTU-compliant, production-schedule aware.',
    tag: 'Core vertical',
    color: 'blue',
  },
  {
    Icon: Gauge,
    title: 'Motorsport & Extreme Sports',
    desc: 'Circuit medical teams for motocross, rallying, karting, track days, BMX and mountain biking. MSA/Motorsport UK compliant.',
    tag: 'Core vertical',
    color: 'red',
  },
  {
    Icon: HardHat,
    title: 'Construction & Industrial',
    desc: 'Full occupational health on site — health surveillance, D&A testing, fitness-to-work medicals. CDM 2015 compliant.',
    tag: 'Core vertical',
    color: 'orange',
  },
  {
    Icon: Music,
    title: 'Music Festivals & Concerts',
    desc: 'Festivals, gigs, outdoor concerts and raves. Purple Guide compliant. LA licensing support. Crowd medicine specialists.',
    tag: 'Core vertical',
    color: 'purple',
  },
  {
    Icon: Trophy,
    title: 'Sporting Events',
    desc: 'Marathons, triathlons, rugby, football, boxing and MMA. FA, World Athletics and governing body mandates met.',
    tag: 'Core vertical',
    color: 'green',
  },
  {
    Icon: Star,
    title: 'Fairs, Shows & Public Events',
    desc: 'County fairs, agricultural shows, fireworks displays, Christmas markets and food festivals. Full crowd cover.',
    tag: 'Core vertical',
    color: 'yellow',
  },
];

const addOnVerticals = [
  {
    Icon: Briefcase,
    title: 'Corporate Events',
    desc: 'Team building days, outdoor retreats, product launches with physical activity and executive health screening.',
  },
  {
    Icon: Heart,
    title: 'Private Events',
    desc: 'Outdoor weddings, festival-style parties, charity galas and large private celebrations. Discreet, professional cover.',
  },
  {
    Icon: GraduationCap,
    title: 'Education & Youth',
    desc: "School sports days, Duke of Edinburgh expeditions, scout events and university freshers' weeks. DBS-checked medics.",
  },
  {
    Icon: Mountain,
    title: 'Outdoor Adventure',
    desc: 'Tough Mudder-style events, wild swimming, fell running and adventure races. Remote and wilderness trained.',
  },
];

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
            England &amp; Wales
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            Professional medics for
            <br />
            <span className="text-blue-600">every event, set &amp; site</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 text-center mb-3 max-w-3xl mx-auto leading-relaxed">
            Apex Safety Group deploys HCPC-registered paramedics wherever the work demands it — film sets, music festivals, motorsport circuits, construction sites, sporting events and beyond. One supplier. Every compliance obligation.
          </p>
          <p className="text-base text-slate-500 text-center mb-10 max-w-2xl mx-auto font-medium">
            Any venue. Any event. Full compliance.
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
            {['HCPC-Registered', 'Purple Guide', 'MSA Compliant', 'RIDDOR 2013', 'HSE-Compliant', 'UK GDPR'].map((b) => (
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
            { value: '10+', label: 'Industries & event types served' },
            { value: '100%', label: 'HCPC-registered paramedics' },
            { value: '1', label: 'Invoice for all services' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="text-3xl sm:text-4xl font-bold text-white">{value}</div>
              <div className="text-blue-200 text-xs sm:text-sm leading-snug max-w-[130px]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CORE VERTICALS ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Who We Cover
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Every industry that needs medical protection
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From the film set to the festival field, from the racetrack to the rugby pitch — wherever the legal requirement or the risk exists, Apex Safety Group delivers HCPC-registered cover.
            </p>
          </div>

          {/* Core verticals */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            {coreVerticals.map(({ Icon, title, desc, tag, color }) => {
              const colors: Record<string, { bg: string; border: string; icon: string; iconBg: string; tag: string }> = {
                blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-600',   iconBg: 'bg-blue-100',   tag: 'bg-blue-100 text-blue-700' },
                red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-600',    iconBg: 'bg-red-100',    tag: 'bg-red-100 text-red-700' },
                orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', iconBg: 'bg-orange-100', tag: 'bg-orange-100 text-orange-700' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', iconBg: 'bg-purple-100', tag: 'bg-purple-100 text-purple-700' },
                green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  iconBg: 'bg-green-100',  tag: 'bg-green-100 text-green-700' },
                yellow: { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'text-amber-600',  iconBg: 'bg-amber-100',  tag: 'bg-amber-100 text-amber-700' },
              };
              const c = colors[color];
              return (
                <div key={title} className={`p-6 rounded-xl border ${c.border} ${c.bg} hover:shadow-md transition duration-200`}>
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${c.icon}`} />
                    </div>
                    <span className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${c.tag}`}>
                      {tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>

          {/* Add-on verticals */}
          <div className="mb-4">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">High-value add-ons</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {addOnVerticals.map(({ Icon, title, desc }) => (
                <div key={title} className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm transition duration-200">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition"
            >
              See full services for each industry <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PROBLEM ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Most bookings start with a first-aid agency. Most serious incidents expose why that&apos;s not enough.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-2xl mx-auto">
            A first-aider is trained to call an ambulance. A paramedic is trained to treat. The difference matters the moment something goes wrong at your event or site.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
            {[
              {
                title: 'Wrong clinical grade for the risk',
                desc: 'First-aid agencies send what\'s cheapest. Motorsport, festival, and film productions carry risks that basic first-aid simply cannot manage. HCPC registration isn\'t optional — it\'s the floor.',
              },
              {
                title: 'No post-incident D&A capability',
                desc: 'After a serious incident on a construction site or at a corporate event, chain-of-custody drug and alcohol testing must happen immediately. First-aiders cannot do this.',
              },
              {
                title: 'Paper forms, delayed PDFs',
                desc: 'Most event medical providers hand you a paper log at the end of the day. Your licensing authority, HSE inspector, or production company needs real-time, audit-ready records.',
              },
              {
                title: 'Call an ambulance — wait 40 minutes',
                desc: 'At a remote festival or a film location with no nearby hospital, the medic on site IS the first line of treatment. A first-aider stabilises and waits. A paramedic treats.',
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

      {/* ─── 3 SERVICE PILLARS ─────────────────────────────────────────────── */}
      <section id="services" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              What We Deliver
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Three service pillars. One supplier.
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              All delivered by HCPC-registered paramedics — the highest pre-hospital clinical grade. Not nurses. Not first-aiders. Paramedics.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-7">

            {/* Pillar 1 - Event Medical */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-200">
              <div className="bg-blue-600 px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-blue-200 font-medium uppercase tracking-wide">Pillar 1</div>
                  <div className="text-white font-bold text-lg">Event Medical Cover</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">
                  Dedicated HCPC paramedic presence for any event — from a 500-person corporate away day to a 50,000-capacity music festival. Purple Guide and local authority licensing compliant. Full crowd medicine and triage capability.
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    'Festivals, concerts & outdoor events',
                    'Sporting events & competitions',
                    'Fairs, shows & public gatherings',
                    'Corporate & private events',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <Check /><span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
                  <strong>Compliance:</strong> Purple Guide, local authority event licensing, HASAWA 1974, UK GDPR.
                </div>
              </div>
            </div>

            {/* Pillar 2 - Occupational Health */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-200">
              <div className="bg-orange-500 px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-orange-100 font-medium uppercase tracking-wide">Pillar 2</div>
                  <div className="text-white font-bold text-lg">Occupational Health</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">
                  Full on-site occupational health programme for construction sites and industrial worksites — health surveillance, drug &amp; alcohol testing, and fitness-to-work medicals. Replaces four separate providers with one medic, one invoice.
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    'Health surveillance (audiometry, spirometry, HAVS)',
                    'Drug & alcohol testing (D&A, chain of custody)',
                    'Fitness-to-work assessments',
                    'Mental health & wellbeing check-ins',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <Check /><span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-orange-50 rounded-xl p-3.5 text-xs text-orange-900 leading-relaxed">
                  <strong>Compliance:</strong> CDM 2015, COSHH, RIDDOR 2013, Control of Noise at Work, HASAWA 1974.
                </div>
              </div>
            </div>

            {/* Pillar 3 - Motorsport & Production */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-200">
              <div className="bg-green-600 px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-green-100 font-medium uppercase tracking-wide">Pillar 3</div>
                  <div className="text-white font-bold text-lg">Motorsport &amp; Production</div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">
                  Specialist medical cover for motorsport circuits and film/TV productions — the two environments with the highest consequence of medical failure. Circuit medical teams, on-set paramedics, and production schedule-aware deployment.
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    'Motocross, rallying, karting & track days',
                    'Film sets, TV & commercial productions',
                    'Music video productions',
                    'Extreme sports & adventure events',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <Check /><span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 rounded-xl p-3.5 text-xs text-green-900 leading-relaxed">
                  <strong>Compliance:</strong> Motorsport UK, MSA regulations, production company H&S requirements, HSE.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition"
            >
              See detailed services for every industry <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── WHY HCPC PARAMEDIC ────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Why HCPC matters — for every vertical</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              The clinical grade of the person on your site determines what they can legally do when something goes wrong.
            </p>
          </div>

          <div className="overflow-x-auto mb-12">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wide w-2/5"></th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">Basic First Aid</th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">Nurse / EFR</th>
                  <th className="py-3 px-4 bg-blue-600/20 rounded-t-xl text-blue-300 font-bold text-xs text-center border border-blue-500/40 border-b-0">
                    Apex (HCPC Paramedic)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'HCPC-registered clinician', basic: false, nurse: false, asg: true },
                  { feature: 'IV access & drug administration', basic: false, nurse: false, asg: true },
                  { feature: 'Treat rather than wait for ambulance', basic: false, nurse: false, asg: true },
                  { feature: 'Health surveillance (legally)', basic: false, nurse: false, asg: true },
                  { feature: 'D&A chain-of-custody collection', basic: false, nurse: false, asg: true },
                  { feature: 'Fitness-to-work medicals', basic: false, nurse: false, asg: true },
                  { feature: 'Purple Guide event compliance', basic: false, nurse: false, asg: true },
                  { feature: 'Digital real-time records', basic: false, nurse: false, asg: true },
                  { feature: 'RIDDOR auto-flagging', basic: false, nurse: false, asg: true },
                  { feature: 'Single invoice for all services', basic: false, nurse: false, asg: true },
                ].map(({ feature, basic, nurse, asg }, i) => (
                  <tr key={feature} className={i % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/20'}>
                    <td className="py-3 px-4 text-slate-300 font-medium">{feature}</td>
                    <td className="py-3 px-4 text-center">
                      {basic ? <span className="text-green-400 font-bold">✓</span> : <span className="text-slate-600 font-bold">✗</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {nurse ? <span className="text-green-400 font-bold">✓</span> : <span className="text-slate-600 font-bold">✗</span>}
                    </td>
                    <td className={`py-3 px-4 text-center bg-blue-600/20 border-x border-blue-500/40 ${i === 9 ? 'border-b rounded-b-xl' : ''}`}>
                      {asg ? <span className="text-blue-400 font-bold text-base">✓</span> : <span className="text-slate-600 font-bold">✗</span>}
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
                desc: 'First-aid agencies are legally barred from performing health surveillance, D&A collections, or fitness examinations. Our HCPC-registered paramedics can — on any site, any event, right now.',
                color: 'blue',
              },
              {
                Icon: MapPin,
                title: 'On site — no call-out, no delay, no wait',
                desc: 'Post-incident D&A. A serious trauma on a film set. A cardiac event at a festival. We don\'t need to be called. We\'re already there. That changes every outcome.',
                color: 'green',
              },
              {
                Icon: AlertCircle,
                title: 'Zero missed compliance — ever',
                desc: 'RIDDOR deadlines, Purple Guide documentation, D&A policy records — every treatment logged triggers automatic compliance checks. Not reviewed the next morning. Now.',
                color: 'red',
              },
              {
                Icon: Bell,
                title: 'Digital records, not paper forms',
                desc: 'Every treatment, test, and certificate lands in the SiteMedic platform in real time. Signed. Timestamped. Audit-ready. Your licensing authority or HSE inspector can see it immediately.',
                color: 'orange',
              },
              {
                Icon: Receipt,
                title: 'One invoice replaces multiple providers',
                desc: 'One medic. One platform. One invoice. Whether you\'re running a construction site or a 3-day music festival — your procurement team deals with a single supplier.',
                color: 'slate',
              },
              {
                Icon: Star,
                title: 'Built for high-consequence environments',
                desc: 'Film sets, motorsport circuits, large festivals, construction sites — these are not generic events. Our medics are trained for the specific risks of each environment.',
                color: 'purple',
              },
            ].map(({ Icon, title, desc, color }) => {
              const bg: Record<string, string> = {
                blue: 'bg-blue-950/50 border-blue-800/50', green: 'bg-green-950/50 border-green-800/50',
                red: 'bg-red-950/50 border-red-800/50', orange: 'bg-orange-950/50 border-orange-800/50',
                slate: 'bg-slate-800/70 border-slate-700/50', purple: 'bg-purple-950/50 border-purple-800/50',
              };
              const ib: Record<string, string> = {
                blue: 'bg-blue-800/60', green: 'bg-green-800/60', red: 'bg-red-800/60',
                orange: 'bg-orange-800/60', slate: 'bg-slate-700/60', purple: 'bg-purple-800/60',
              };
              const ic: Record<string, string> = {
                blue: 'text-blue-400', green: 'text-green-400', red: 'text-red-400',
                orange: 'text-orange-400', slate: 'text-slate-300', purple: 'text-purple-400',
              };
              return (
                <div key={title} className={`p-6 rounded-xl border ${bg[color]}`}>
                  <div className={`w-10 h-10 ${ib[color]} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${ic[color]}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-2 text-white">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
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
            From first enquiry to full compliance cover in four steps — for any event, site or production.
          </p>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-blue-200 z-0" />
            {[
              { step: 1, title: 'Tell us about your event', desc: 'Share your event type, size, date, and compliance requirements. We scope the right cover.' },
              { step: 2, title: 'Medic deployed', desc: 'Your HCPC paramedic arrives equipped for your specific environment — festival, film set, circuit, or site.' },
              { step: 3, title: 'Everything auto-logged', desc: 'Every treatment, test result, and certificate lands in SiteMedic in real time. Signed. Timestamped.' },
              { step: 4, title: 'Full compliance, always', desc: 'RIDDOR auto-flagged. Purple Guide records generated. Licensing documentation ready on demand.' },
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

      {/* ─── POWERED BY SITEMEDIC ─────────────────────────────────────────── */}
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
                Whether you&apos;re a festival organiser, a film producer, or a construction site manager — your SiteMedic compliance dashboard gives you real-time visibility of every treatment, test result, and certificate. Audit-ready from the moment it happens.
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
                { icon: Bell, label: 'Compliance reminders' },
                { icon: ClipboardCheck, label: 'Live dashboard' },
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
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">Compliant across every industry</h2>
          <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto text-sm">
            From the Purple Guide to CDM 2015 — every framework, every sector, covered by one provider.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { Icon: Shield, title: 'HCPC-Registered', desc: 'All paramedics verified' },
              { Icon: Music, title: 'Purple Guide', desc: 'Festival & event standard' },
              { Icon: Gauge, title: 'Motorsport UK', desc: 'MSA circuit medical' },
              { Icon: FileCheck, title: 'RIDDOR 2013', desc: 'Auto-flagging & reporting' },
              { Icon: HardHat, title: 'CDM 2015', desc: 'Construction compliance' },
              { Icon: Lock, title: 'UK GDPR', desc: 'Secure, UK-hosted data' },
              { Icon: ClipboardCheck, title: 'HSE Audit-Ready', desc: 'Inspection-ready records' },
              { Icon: Trophy, title: 'FA Governance', desc: 'Football event medical' },
              { Icon: HeartPulse, title: 'HASAWA 1974', desc: 'Health & Safety at Work' },
              { Icon: CheckCircle2, title: 'ISO 45001', desc: 'OH safety standard' },
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
            Tell us about your event, production, or worksite
          </h2>
          <p className="text-blue-100 text-lg mb-2 max-w-xl mx-auto">
            We&apos;ll scope a package that covers every legal obligation and deploy the right HCPC-registered paramedic for your environment.
          </p>
          <p className="text-blue-300 text-sm mb-10">
            Serving events and worksites across England &amp; Wales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 active:scale-95 transition shadow-xl"
            >
              Book a Medic
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white/70 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 hover:border-white transition flex items-center justify-center gap-2"
            >
              Get a Quote <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-blue-300 text-xs mt-10">
            Powered by <span className="text-white font-semibold">SiteMedic</span> — the compliance platform built for UK event and workplace medical cover.
          </p>
        </div>
      </section>

    </div>
  );
}
