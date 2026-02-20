import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  FileCheck,
  ArrowRight,
  Users,
  CreditCard,
  CheckCircle2,
  BadgeCheck,
  MapPin,
  Star,
  TrendingUp,
  Zap,
  Search,
  Award,
  Banknote,
  Briefcase,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Medical Companies — SiteMedic Marketplace',
  description:
    'Find events. Submit quotes. Grow your medical cover business. Register on the SiteMedic Marketplace and access a stream of vetted event opportunities across England & Wales.',
  openGraph: {
    title: 'For Medical Companies — SiteMedic Marketplace',
    description:
      'Register on the SiteMedic Marketplace to access vetted event opportunities, submit quotes, and grow your business.',
    type: 'website',
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

export default function ForCompanies() {
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

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-sm text-emerald-300 font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            For Medical Companies
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Find events. Submit quotes.
            <br />
            <span className="text-emerald-400">Grow your business.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 text-center mb-10 max-w-3xl mx-auto leading-relaxed">
            Register on the SiteMedic Marketplace and access a stream of vetted event opportunities across England &amp; Wales. Quote on the events you want, when you want.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace/register"
              className="bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-600 active:scale-95 transition shadow-xl text-center"
            >
              Register Your Company
            </Link>
            <Link
              href="/marketplace/events"
              className="border-2 border-white/50 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 hover:border-white transition text-center"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW QUOTING WORKS ────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-4">
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              From browsing to getting paid in four steps
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              The marketplace connects you directly to event organisers looking for CQC-verified medical cover.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-emerald-200 z-0" />
            {[
              { step: 1, Icon: Search, title: 'Browse events', desc: 'Filter by location, date, event type, and budget. See only the opportunities that match your capabilities.' },
              { step: 2, Icon: FileCheck, title: 'Submit a quote', desc: 'Build a detailed, itemized quote with your staffing plan, equipment, and pricing. Stand out with a cover letter.' },
              { step: 3, Icon: Award, title: 'Client awards', desc: 'The client reviews all quotes side-by-side and awards the booking to the best fit. You\'re notified immediately.' },
              { step: 4, Icon: Banknote, title: 'Get paid via Stripe', desc: 'Secure payments processed through Stripe Connect. Weekly payouts directly to your bank account.' },
            ].map(({ step, Icon, title, desc }) => (
              <div key={step} className="text-center relative z-10">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-md shadow-emerald-200">
                  {step}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFITS GRID ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Why join the marketplace
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Built specifically for CQC-registered medical companies who want to grow their event medical business.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                Icon: Users,
                title: 'Access to vetted clients',
                desc: 'Every event on the marketplace comes from a verified client. No spam, no tyre-kickers. Real events that need real medical cover.',
                color: 'blue',
              },
              {
                Icon: CreditCard,
                title: 'Transparent commission',
                desc: 'Clear platform/medic revenue split. You know exactly what you\'ll earn before you submit a quote. No hidden fees.',
                color: 'green',
              },
              {
                Icon: Zap,
                title: 'Fast weekly payouts',
                desc: 'Payments processed through Stripe Connect with weekly automatic payouts directly to your bank account.',
                color: 'orange',
              },
              {
                Icon: Star,
                title: 'Build your profile & ratings',
                desc: 'Every completed booking adds to your marketplace reputation. Higher-rated companies attract more work.',
                color: 'purple',
              },
              {
                Icon: BadgeCheck,
                title: 'CQC-verified badge',
                desc: 'Your verified CQC status is prominently displayed on every quote. It builds instant trust with clients.',
                color: 'blue',
              },
              {
                Icon: MapPin,
                title: 'Nationwide event access',
                desc: 'Browse events across England & Wales. Filter by your service area and only see opportunities you can actually cover.',
                color: 'red',
              },
            ].map(({ Icon, title, desc, color }) => {
              const styles: Record<string, { iconBg: string; iconColor: string }> = {
                blue: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
                green: { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
                orange: { iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
                purple: { iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
                red: { iconBg: 'bg-red-100', iconColor: 'text-red-600' },
              };
              const s = styles[color];
              return (
                <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition">
                  <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── WHAT YOU NEED TO REGISTER ────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-4">
              Registration
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              What you need to register
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Have these ready and you can complete registration in under 10 minutes.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="space-y-4">
              {[
                {
                  title: 'CQC Provider ID',
                  desc: 'Your CQC registration number. We verify this against the CQC register during onboarding.',
                },
                {
                  title: 'Company details',
                  desc: 'Company name, registered address, Companies House number, and primary contact details.',
                },
                {
                  title: 'Compliance documents',
                  desc: 'Public Liability Insurance (PLI), Employer\'s Liability Insurance (ELI), and DBS certificates for key staff.',
                },
                {
                  title: 'Stripe Connect',
                  desc: 'Set up your Stripe Connect account during registration to receive secure, automated payouts.',
                },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── DIRECT JOBS FEATURE ──────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold mb-3">
                Zero Commission
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                Already have your own clients?
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Add your existing client bookings as &quot;direct jobs&quot; on the SiteMedic platform — at 0% commission. Get the same compliance dashboard, treatment logging, RIDDOR flagging, and digital records without any marketplace fees.
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  '0% commission on self-procured work',
                  'Same compliance dashboard and treatment logging',
                  'RIDDOR auto-flagging for all jobs',
                  'Professional digital records for your clients',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/marketplace/register"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition"
              >
                Register to get started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="md:w-64 flex-shrink-0 grid grid-cols-2 gap-3">
              {[
                { label: 'Marketplace Jobs', value: 'Commission', color: 'blue' },
                { label: 'Direct Jobs', value: '0% Fee', color: 'emerald' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className={`${color === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'} rounded-xl p-4 border text-center`}
                >
                  <div className={`text-2xl font-bold ${color === 'emerald' ? 'text-emerald-600' : 'text-blue-600'} mb-1`}>
                    {value}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-emerald-600 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Start receiving event requests today
          </h2>
          <p className="text-emerald-100 text-lg mb-2 max-w-xl mx-auto">
            Register your CQC-verified medical company and start quoting on events across England &amp; Wales.
          </p>
          <p className="text-emerald-300 text-sm mb-10">
            Free to register. Only pay commission when you win work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace/register"
              className="bg-white text-emerald-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-50 active:scale-95 transition shadow-xl"
            >
              Register Your Company
            </Link>
            <Link
              href="/marketplace"
              className="border-2 border-white/70 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-700 hover:border-white transition flex items-center justify-center gap-2"
            >
              Back to Marketplace <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
