import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  FileCheck,
  ClipboardCheck,
  ArrowRight,
  Users,
  CreditCard,
  AlertTriangle,
  Phone,
  Clock,
  Eye,
  CheckCircle2,
  BadgeCheck,
  Building2,
  Headphones,
  Calendar,
  Star,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Event Organisers — SiteMedic Marketplace',
  description:
    'Stop phoning around for medical cover. Post your event once, receive itemized quotes from CQC-verified providers, and compare side-by-side.',
  openGraph: {
    title: 'For Event Organisers — SiteMedic Marketplace',
    description:
      'Post your event once, receive itemized quotes from CQC-verified providers, and compare side-by-side.',
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

export default function ForClients() {
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm text-blue-200 font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            For Event Organisers
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Stop phoning around
            <br />
            <span className="text-blue-400">for medical cover.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 text-center mb-10 max-w-3xl mx-auto leading-relaxed">
            Post your event once. Receive itemized quotes from CQC-verified medical companies. Compare side-by-side and award the best fit.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events/create"
              className="bg-white text-slate-900 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 active:scale-95 transition shadow-xl text-center"
            >
              Post an Event
            </Link>
            <Link
              href="/client-register"
              className="border-2 border-white/50 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 hover:border-white transition text-center"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PAIN POINTS ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Sound familiar?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              These are the problems event organisers deal with every time they need medical cover.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                Icon: Phone,
                title: 'Phoning 5 agencies for 5 different prices',
                desc: 'No standardization. Every provider quotes differently. You can\'t compare like-for-like because every staffing plan uses different terminology.',
              },
              {
                Icon: Eye,
                title: 'No CQC visibility',
                desc: 'You\'re trusting the company when they say they\'re CQC-registered. No easy way to verify before committing. The marketplace pre-verifies every provider.',
              },
              {
                Icon: Clock,
                title: 'Compliance docs arrive late — or never',
                desc: 'Insurance certificates, risk assessments, and event reports promised "after the event" often take weeks of chasing. Or they never arrive at all.',
              },
              {
                Icon: AlertTriangle,
                title: 'Unclear payment terms, no deposit protection',
                desc: 'Bank transfers with no protection. Invoice terms that vary wildly. No visibility into where your deposit went if the provider cancels.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-800 rounded-xl p-6 border border-slate-700/80">
                <div className="w-10 h-10 bg-red-900/50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW POSTING WORKS ────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Step by Step
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How posting an event works
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From sign-up to awarded booking in six simple steps. The whole process takes minutes, not days.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                title: 'Sign up free',
                desc: 'Create a client account in under a minute. No payment details required until you award a quote.',
                color: 'blue',
              },
              {
                step: 2,
                title: 'Describe your event',
                desc: 'Event type, date, location, expected attendance, and specific medical requirements. Our form guides you through it.',
                color: 'blue',
              },
              {
                step: 3,
                title: 'Set your budget range',
                desc: 'Optionally set a budget range so providers can tailor their quotes. Or leave it open to see what the market offers.',
                color: 'blue',
              },
              {
                step: 4,
                title: 'Receive quotes (48h window)',
                desc: 'CQC-verified medical companies review your event and submit detailed, itemized quotes. You\'ll be notified as each arrives.',
                color: 'green',
              },
              {
                step: 5,
                title: 'Compare on your dashboard',
                desc: 'Review staffing plans, qualifications, equipment, pricing, and cover letters side-by-side. All in one place.',
                color: 'green',
              },
              {
                step: 6,
                title: 'Award & pay deposit',
                desc: 'Award your chosen provider. Pay a secure deposit via Stripe. The booking is confirmed and compliance tracking begins.',
                color: 'green',
              },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition">
                <div className={`w-10 h-10 ${color === 'blue' ? 'bg-blue-600' : 'bg-emerald-600'} rounded-full flex items-center justify-center text-white font-bold text-sm mb-4`}>
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHAT'S IN EACH QUOTE ─────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Full Transparency
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              What&apos;s in each quote
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Every quote on the marketplace follows a standardized format so you can compare like-for-like.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                Icon: Users,
                title: 'Staffing Plan',
                desc: 'Exact roles (paramedic, EMT, first aider), qualifications, HCPC numbers, and headcount for your event.',
              },
              {
                Icon: ClipboardCheck,
                title: 'Equipment List',
                desc: 'Medical equipment, vehicles, and supplies included in the quote. No hidden extras.',
              },
              {
                Icon: CreditCard,
                title: 'Itemized Pricing',
                desc: 'Staff costs, equipment, travel, and any additional charges broken down line-by-line.',
              },
              {
                Icon: BadgeCheck,
                title: 'CQC Status & Insurance',
                desc: 'CQC Provider ID verified by the platform. PLI and ELI insurance details visible.',
              },
              {
                Icon: FileCheck,
                title: 'Cover Letter',
                desc: 'The provider\'s approach to your event — why they\'re the right fit, relevant experience, and any added value.',
              },
              {
                Icon: Star,
                title: 'Company Profile',
                desc: 'Company history, specializations, previous event types, and marketplace ratings from other clients.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-xl border border-slate-200 p-6 hover:shadow-sm transition">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE ASSURANCE ─────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium mb-4">
              Trust & Compliance
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Every provider verified before they quote
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              We don&apos;t just list companies — we verify them. Every medical company on the marketplace passes our compliance checks.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                Icon: Shield,
                title: 'CQC-verified before they quote',
                desc: 'Every medical company has their CQC Provider ID verified against the CQC register before they can submit quotes.',
              },
              {
                Icon: BadgeCheck,
                title: 'HCPC registrations confirmed',
                desc: 'Individual medic HCPC numbers are checked. You know the clinical grade of every person on your event.',
              },
              {
                Icon: FileCheck,
                title: 'Insurance reviewed',
                desc: 'Public liability and employer\'s liability insurance documents are uploaded and reviewed during registration.',
              },
              {
                Icon: ClipboardCheck,
                title: 'Full audit trail',
                desc: 'Every action — quote submission, award, payment, treatment log — is timestamped and stored for audit purposes.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-800 rounded-xl p-6 border border-slate-700/80">
                <div className="w-10 h-10 bg-blue-800/60 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ENTERPRISE FEATURES ──────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              Enterprise
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Built for enterprise procurement
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Large organisations with multiple events need more than a simple marketplace. We&apos;ve built features for scale.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                Icon: Calendar,
                title: 'Multi-event packages',
                desc: 'Post a series of events as a package. Providers can quote for individual events or the full season.',
              },
              {
                Icon: Star,
                title: 'Preferred provider lists',
                desc: 'Build a shortlist of trusted providers. Invite them directly to quote on future events.',
              },
              {
                Icon: Building2,
                title: 'Net 30 billing',
                desc: 'Enterprise accounts can be set up with invoice-based billing on Net 30 terms. Talk to our team.',
              },
              {
                Icon: Headphones,
                title: 'Dedicated support',
                desc: 'Enterprise clients get a dedicated account manager and priority support for all marketplace activity.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
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
            Post your first event in 5 minutes
          </h2>
          <p className="text-blue-100 text-lg mb-2 max-w-xl mx-auto">
            Free to post. No obligation to award. Start receiving quotes from CQC-verified medical companies today.
          </p>
          <p className="text-blue-300 text-sm mb-10">
            Join event organisers across England &amp; Wales who source smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events/create"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 active:scale-95 transition shadow-xl"
            >
              Post an Event
            </Link>
            <Link
              href="/"
              className="border-2 border-white/70 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 hover:border-white transition flex items-center justify-center gap-2"
            >
              Back to Marketplace <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
