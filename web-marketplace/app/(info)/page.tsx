import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  FileCheck,
  Lock,
  ClipboardCheck,
  Bell,
  ArrowRight,
  Film,
  Gauge,
  HardHat,
  Music,
  Trophy,
  Star,
  Briefcase,
  Heart,
  GraduationCap,
  Mountain,
  Users,
  CreditCard,
  MapPin,
  Search,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'SiteMedic Marketplace — CQC-Verified Medical Cover for Events',
  description:
    'Post your event and receive itemized quotes from CQC-registered medical companies across England & Wales. Compare staffing plans, verify compliance, and pay securely.',
  openGraph: {
    title: 'SiteMedic Marketplace — CQC-Verified Medical Cover for Events',
    description:
      'Post your event and receive itemized quotes from CQC-registered medical companies. Compare, award, and pay securely.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'SiteMedic Marketplace — CQC-Verified Medical Cover',
    description:
      'Post your event and receive quotes from CQC-verified medical companies across England & Wales.',
  },
};

export const dynamic = 'force-static';
export const revalidate = 86400;

function Check() {
  return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
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

export default function MarketplaceLanding() {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm text-blue-200 font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            CQC-Verified Marketplace
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            One event. Multiple quotes.
            <br />
            <span className="text-blue-400">The right medical team.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 text-center mb-10 max-w-3xl mx-auto leading-relaxed">
            Post your event on the SiteMedic Marketplace and receive itemized quotes from
            CQC-registered medical companies across England &amp; Wales.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link
              href="/events/create"
              className="bg-white text-slate-900 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 active:scale-95 transition shadow-xl text-center"
            >
              Post an Event
            </Link>
            <Link
              href="/register"
              className="border-2 border-white/50 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 hover:border-white transition flex items-center justify-center gap-2"
            >
              Register as a Provider <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-400">
            {['CQC-Verified', 'Secure Payments', 'HCPC Medics', 'Full Compliance Trail'].map((b) => (
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
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
          {[
            { value: '10+', label: 'Event types supported' },
            { value: '100%', label: 'CQC-verified providers' },
            { value: 'Secure', label: 'Stripe-powered payments' },
            { value: 'UK-wide', label: 'Coverage across E&W' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
              <div className="text-blue-200 text-xs sm:text-sm leading-snug max-w-[140px]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              From posting to booking in four steps
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Post your event, receive quotes from verified providers, compare side-by-side, and award — all on one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-blue-200 z-0" />
            {[
              { step: 1, title: 'Post your event', desc: 'Describe your event, set your requirements, and define your budget range. Takes less than 5 minutes.' },
              { step: 2, title: 'Receive quotes', desc: 'CQC-verified medical companies review your event and submit detailed, itemized quotes within 48 hours.' },
              { step: 3, title: 'Compare & award', desc: 'Review staffing plans, qualifications, equipment lists, and pricing side-by-side. Award the best fit.' },
              { step: 4, title: 'Booking created', desc: 'The awarded quote becomes a confirmed booking with secure payment, compliance tracking, and live dashboard.' },
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

      {/* ─── TWO-SIDED VALUE PROPOSITION ──────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Built for both sides of the marketplace
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Whether you&apos;re sourcing medical cover or providing it, the marketplace works for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* For Event Organisers */}
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-8 shadow-sm hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">For Event Organisers</h3>
              <ul className="space-y-3 mb-6">
                {[
                  'Post once, receive multiple quotes',
                  'Compare itemized staffing plans side-by-side',
                  'Every provider is CQC-verified before they quote',
                  'Secure deposit payments via Stripe',
                  'Full compliance trail for every booking',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/for-clients"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition"
              >
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* For Medical Companies */}
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8 shadow-sm hover:shadow-lg transition">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">For Medical Companies</h3>
              <ul className="space-y-3 mb-6">
                {[
                  'Access a stream of vetted event opportunities',
                  'Submit detailed, itemized quotes to win work',
                  'CQC-verified badge builds client trust',
                  'Fast weekly payouts via Stripe Connect',
                  'Build your profile and reputation over time',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/for-companies"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition"
              >
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ENTERPRISE TRUST SECTION ─────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium mb-4">
              Enterprise-Grade
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for compliance-critical industries
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Every feature designed around the requirements of enterprise clients who need verifiable, audit-ready medical cover.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                Icon: Shield,
                title: 'CQC-Verified Providers Only',
                desc: 'Every medical company on the marketplace has their CQC Provider ID verified before they can submit a single quote.',
                color: 'blue',
              },
              {
                Icon: ClipboardCheck,
                title: 'Itemized Staffing Plans',
                desc: 'See exact roles, qualifications, HCPC numbers, and equipment for every quote. No hidden costs, no surprises.',
                color: 'green',
              },
              {
                Icon: FileCheck,
                title: 'Audit-Ready Documentation',
                desc: 'Full compliance trail from quote to completion — every treatment logged, every certificate timestamped and signed.',
                color: 'orange',
              },
              {
                Icon: CreditCard,
                title: 'Secure Stripe Payments',
                desc: 'Deposits and milestone payments processed through Stripe. PCI-compliant. Full payment protection for both sides.',
                color: 'purple',
              },
              {
                Icon: BarChart3,
                title: 'Multi-Event Management',
                desc: 'Post and manage multiple events from a single dashboard. Track quotes, awards, and bookings in one place.',
                color: 'slate',
              },
              {
                Icon: MapPin,
                title: 'UK-Wide Coverage',
                desc: 'Postcode-based matching ensures you receive quotes from medical companies that actually serve your area.',
                color: 'red',
              },
            ].map(({ Icon, title, desc, color }) => {
              const bg: Record<string, string> = {
                blue: 'bg-blue-950/50 border-blue-800/50',
                green: 'bg-green-950/50 border-green-800/50',
                orange: 'bg-orange-950/50 border-orange-800/50',
                purple: 'bg-purple-950/50 border-purple-800/50',
                slate: 'bg-slate-800/70 border-slate-700/50',
                red: 'bg-red-950/50 border-red-800/50',
              };
              const ib: Record<string, string> = {
                blue: 'bg-blue-800/60',
                green: 'bg-green-800/60',
                orange: 'bg-orange-800/60',
                purple: 'bg-purple-800/60',
                slate: 'bg-slate-700/60',
                red: 'bg-red-800/60',
              };
              const ic: Record<string, string> = {
                blue: 'text-blue-400',
                green: 'text-green-400',
                orange: 'text-orange-400',
                purple: 'text-purple-400',
                slate: 'text-slate-300',
                red: 'text-red-400',
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

      {/* ─── COMPARISON TABLE ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Marketplace vs traditional procurement
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              See how the SiteMedic Marketplace compares to the old way of sourcing event medical cover.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wide w-2/5"></th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">Phone Around</th>
                  <th className="py-3 px-4 text-slate-400 font-medium text-xs text-center">Agency</th>
                  <th className="py-3 px-4 bg-blue-600/10 rounded-t-xl text-blue-600 font-bold text-xs text-center border border-blue-200 border-b-0">
                    SiteMedic Marketplace
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Time to source quotes', phone: '3-5 days', agency: '1-2 days', sm: 'Under 48 hours' },
                  { feature: 'Number of quotes', phone: '2-3 if lucky', agency: '1 (theirs)', sm: 'Multiple competing' },
                  { feature: 'CQC verification', phone: 'Manual check', agency: 'Varies', sm: 'Pre-verified' },
                  { feature: 'Cost transparency', phone: 'Opaque', agency: 'Markup hidden', sm: 'Fully itemized' },
                  { feature: 'Compliance documentation', phone: 'Chase manually', agency: 'PDF after event', sm: 'Auto-generated' },
                  { feature: 'Payment protection', phone: 'Bank transfer', agency: 'Invoice terms', sm: 'Stripe escrow' },
                  { feature: 'Compare staffing plans', phone: 'Difficult', agency: 'Not possible', sm: 'Side-by-side' },
                  { feature: 'Audit trail', phone: 'None', agency: 'Basic', sm: 'Full digital trail' },
                ].map(({ feature, phone, agency, sm }, i, arr) => (
                  <tr key={feature} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="py-3 px-4 text-slate-700 font-medium">{feature}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{phone}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{agency}</td>
                    <td
                      className={`py-3 px-4 text-center bg-blue-600/10 border-x border-blue-200 font-semibold text-blue-700 ${
                        i === arr.length - 1 ? 'border-b rounded-b-xl' : ''
                      }`}
                    >
                      {sm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── INDUSTRIES SUPPORTED ─────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Industries
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Every industry that needs medical cover
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From film sets to festival fields, from racetracks to rugby pitches — post any event type on the marketplace.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            {coreVerticals.map(({ Icon, title, desc, tag, color }) => {
              const colors: Record<string, { bg: string; border: string; icon: string; iconBg: string; tag: string }> = {
                blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', iconBg: 'bg-blue-100', tag: 'bg-blue-100 text-blue-700' },
                red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', iconBg: 'bg-red-100', tag: 'bg-red-100 text-red-700' },
                orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', iconBg: 'bg-orange-100', tag: 'bg-orange-100 text-orange-700' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', iconBg: 'bg-purple-100', tag: 'bg-purple-100 text-purple-700' },
                green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', iconBg: 'bg-green-100', tag: 'bg-green-100 text-green-700' },
                yellow: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', iconBg: 'bg-amber-100', tag: 'bg-amber-100 text-amber-700' },
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

          <div className="mb-4">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
              High-value add-ons
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {addOnVerticals.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm transition duration-200"
                >
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
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
                Every awarded booking flows into the SiteMedic compliance dashboard
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Once a quote is awarded, the booking is managed through the SiteMedic platform — RIDDOR auto-flagging, real-time treatment logs, compliance reminders, and full UK GDPR data governance. Audit-ready from day one.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-semibold text-sm transition"
              >
                Learn about SiteMedic <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="md:w-64 flex-shrink-0 grid grid-cols-2 gap-3">
              {[
                { icon: FileCheck, label: 'RIDDOR auto-flagging' },
                { icon: Bell, label: 'Compliance reminders' },
                { icon: ClipboardCheck, label: 'Live dashboard' },
                { icon: Lock, label: 'UK GDPR' },
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

      {/* ─── FINAL CTA ────────────────────────────────────────────────────── */}
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
            Ready to find the right medical team?
          </h2>
          <p className="text-blue-100 text-lg mb-2 max-w-xl mx-auto">
            Post your event and start receiving quotes from CQC-verified medical companies today.
          </p>
          <p className="text-blue-300 text-sm mb-10">
            Free to post. No obligation to award.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events/create"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 active:scale-95 transition shadow-xl"
            >
              Post Your First Event
            </Link>
            <Link
              href="/register"
              className="border-2 border-white/70 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 hover:border-white transition flex items-center justify-center gap-2"
            >
              Join as a Provider <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-blue-300 text-xs mt-10">
            Powered by <span className="text-white font-semibold">SiteMedic</span> — the compliance platform built for UK event medical cover.
          </p>
        </div>
      </section>

    </div>
  );
}
