/**
 * About Apex Safety Group
 *
 * Company background, mission, the SiteMedic platform story,
 * and why ASG is different from traditional event medical providers.
 *
 * Route: /about
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Apex Safety Group and the SiteMedic platform. HCPC-registered paramedics, automated compliance, and a better way to staff medical cover.',
  openGraph: {
    title: 'About Us',
    description: 'Learn about Apex Safety Group and the SiteMedic platform. HCPC-registered paramedics, automated compliance, and a better way to staff medical cover.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'About Us',
    description: 'Learn about Apex Safety Group and the SiteMedic platform. HCPC-registered paramedics and automated compliance.',
  },
};

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-20 px-4 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            <span className="text-blue-300 text-sm font-medium">About Apex Safety Group</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">
            We built the medic company<br className="hidden sm:block" /> we always wanted to work for.
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            Apex Safety Group was founded by paramedics who spent years deploying to film sets, festivals, motorsport events, and construction sites — watching compliance fall apart, good medics get paid late, and event organisers scramble for cover at the last minute. We built SiteMedic to fix all of it.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              To make professional paramedic cover genuinely accessible for every event, production, and worksite in England and Wales — not just the big-budget productions that can afford a bespoke service.
            </p>
            <p className="text-slate-600 leading-relaxed">
              We believe one HCPC-registered paramedic with the right software can replace the fragmented patchwork of first-aid agencies, OH vans, and D&A contractors that most organisers rely on. One medic. One contract. One invoice.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '10+', label: 'Industries served' },
              { value: '100%', label: 'HCPC-registered medics' },
              { value: '0', label: 'Missed compliance deadlines' },
              { value: 'Net 30', label: 'Invoicing for established clients' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-slate-500 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The industries we work in */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Every industry. One standard.</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Whether it&apos;s a film set in Pinewood, a motocross circuit in the Midlands, or a music festival in a field in Somerset — the standard of care we deliver is always the same: HCPC-registered, digitally recorded, fully compliant.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🎬', title: 'TV & Film', desc: 'On-set paramedics for productions of every scale.' },
              { icon: '🏁', title: 'Motorsport', desc: 'Circuit medical teams for Motorsport UK events.' },
              { icon: '🏗️', title: 'Construction', desc: 'Full occupational health on-site.' },
              { icon: '🎵', title: 'Festivals & Concerts', desc: 'Purple Guide compliant crowd medicine.' },
              { icon: '🏆', title: 'Sporting Events', desc: 'FA, triathlon, boxing — governing body compliant.' },
              { icon: '🎡', title: 'Public Events', desc: 'Fairs, shows, fireworks, and markets.' },
              { icon: '💼', title: 'Corporate', desc: 'Team building, retreats, executive health.' },
              { icon: '💍', title: 'Private Events', desc: 'Weddings, parties, galas — discreet cover.' },
              { icon: '🎓', title: 'Education & Youth', desc: 'DBS-checked medics for school & university events.' },
              { icon: '⛰️', title: 'Outdoor Adventure', desc: 'Remote & wilderness event medical cover.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-0.5">{item.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why we built SiteMedic */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Why we built SiteMedic</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            The event medical industry runs on paper forms, WhatsApp messages, and PDFs sent three days later.
            We replaced all of that.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: '📋',
              title: 'Automatic Compliance Detection',
              body: 'Every treatment logged through SiteMedic is automatically screened against RIDDOR 2013 criteria and Purple Guide documentation requirements. Reportable incidents are flagged instantly.',
            },
            {
              icon: '💸',
              title: 'Weekly Medic Payouts',
              body: 'Medics are paid weekly via UK Faster Payments through Stripe Connect — no more chasing invoices or late payments that drive good paramedics away from the sector.',
            },
            {
              icon: '🗂️',
              title: 'One Compliance Dashboard',
              body: 'Event organisers, site managers, and production companies get real-time visibility of every treatment, incident, and test result. Download audit-ready PDFs in one click.',
            },
          ].map((card) => (
            <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{card.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How ASG + SiteMedic works together */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 sm:p-10 text-white">
            <div className="grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-blue-200 text-sm font-medium mb-2">The ASG + SiteMedic model</p>
                <h2 className="text-2xl font-bold mb-3">
                  We&apos;re both the service and the software.
                </h2>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Most event medical providers hand you a paper log at the end of the day. At ASG, our medics
                  use SiteMedic — our own digital platform — to log every treatment, test result, and incident
                  in real time. You see it the moment it&apos;s recorded, from any device.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  'ASG supplies the medic and the software',
                  'SiteMedic handles compliance records automatically',
                  'You get one invoice covering everything',
                  'Your team has 24/7 dashboard access',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2.5 text-sm text-blue-100">
                    <span className="text-blue-300 flex-shrink-0 mt-0.5">✓</span>
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">What we stand for</h2>
          <p className="text-slate-600 mb-10">The four principles that guide every decision at ASG.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              { icon: '🏥', title: 'Clinical First', body: 'Every decision starts with what\'s best for the patient — not what\'s most convenient for the paperwork or the budget.' },
              { icon: '📖', title: 'Honest About the Law', body: 'We don\'t oversell compliance. We tell you exactly what\'s legally required for your event type and what\'s optional.' },
              { icon: '⚡', title: 'Real-Time by Default', body: 'Nothing goes in a paper form. If it\'s not in SiteMedic, it didn\'t happen. Every client gets a live compliance trail.' },
              { icon: '🤝', title: 'Fair to Medics', body: 'Weekly pay. Transparent rates. Good kit. We keep excellent paramedics by treating them the way we\'d want to be treated.' },
            ].map((v) => (
              <div key={v.title} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-2xl mb-2">{v.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-1.5 text-sm">{v.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to book cover for your event?</h2>
          <p className="text-slate-600 mb-6">
            Tell us about your event or worksite. We&apos;ll scope the right cover and handle the compliance automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition text-sm"
            >
              Book a Medic
            </Link>
            <Link
              href="/contact"
              className="border border-slate-200 text-slate-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-50 active:scale-95 transition text-sm"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
