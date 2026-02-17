/**
 * About Apex Safety Group
 *
 * Company background, mission, the SiteMedic platform story,
 * and why ASG is different from traditional OH providers.
 *
 * Route: /about
 */

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us — Apex Safety Group',
  description:
    'Apex Safety Group provides HCPC-registered paramedics for UK construction sites, powered by SiteMedic — the occupational health platform built specifically for construction.',
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
            Apex Safety Group was founded by paramedics who spent years working construction sites and watching
            compliance fall apart — missed RIDDOR reports, site managers drowning in paperwork, workers with expired
            health surveillance nobody tracked. We built SiteMedic to fix that.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              To make occupational health genuinely useful for UK construction — not a box-ticking exercise
              pushed onto site managers, but a practical, digitally-tracked service that actually protects workers
              and keeps your projects compliant.
            </p>
            <p className="text-slate-600 leading-relaxed">
              We believe one highly trained paramedic with the right software can replace the fragmented patchwork
              of mobile OH vans, off-site clinics, and D&A contractors that most construction companies rely on.
              One medic. One contract. One invoice.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '100%', label: 'HCPC-registered medics' },
              { value: '0', label: 'Missed RIDDOR reports' },
              { value: '4-in-1', label: 'Services consolidated' },
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

      {/* Why we built SiteMedic */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Why we built SiteMedic</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              The occupational health industry runs on spreadsheets, paper forms, and WhatsApp messages.
              We replaced all of that.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: '📋',
                title: 'Automatic RIDDOR Detection',
                body: 'Every treatment logged through SiteMedic is automatically screened against RIDDOR 2013 criteria. Reportable incidents are flagged instantly — no more "we forgot to report it."',
              },
              {
                icon: '💸',
                title: 'Weekly Medic Payouts',
                body: 'Medics are paid weekly via UK Faster Payments through Stripe Connect — no more chasing invoices or late payments that drive good medics away from the sector.',
              },
              {
                icon: '🗂️',
                title: 'One Compliance Dashboard',
                body: 'Site managers get a real-time view of every treatment, near-miss, surveillance due date, and D&A test result. Download audit-ready PDFs in one click.',
              },
            ].map((card) => (
              <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{card.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How ASG + SiteMedic works together */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 sm:p-10 text-white">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-2">The ASG + SiteMedic model</p>
              <h2 className="text-2xl font-bold mb-3">
                We're both the service and the software.
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                Most OH providers use paper forms and email you a report a week later. At ASG, our medics
                use SiteMedic — our own digital platform — to log every treatment, surveillance test, and
                D&A result in real time. You see it the moment it's recorded.
              </p>
            </div>
            <div className="space-y-3">
              {[
                'ASG supplies the medic and the software',
                'SiteMedic handles compliance records automatically',
                'You get one invoice covering everything',
                'Your site manager has 24/7 dashboard access',
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5 text-sm text-blue-100">
                  <span className="text-blue-300 flex-shrink-0 mt-0.5">✓</span>
                  {point}
                </div>
              ))}
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
              { icon: '🏥', title: 'Clinical First', body: 'Every decision starts with what\'s best for the worker, not what\'s most convenient for the paperwork.' },
              { icon: '📖', title: 'Honest About the Law', body: 'We don\'t oversell compliance. We tell you exactly what\'s legally required and what\'s optional.' },
              { icon: '⚡', title: 'Real-Time by Default', body: 'Nothing goes in a spreadsheet. If it\'s not in SiteMedic, it didn\'t happen.' },
              { icon: '🤝', title: 'Fair to Medics', body: 'Weekly pay. Transparent rates. We keep good medics by treating them properly.' },
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
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to consolidate your OH?</h2>
          <p className="text-slate-600 mb-6">
            Book a site medic and see how SiteMedic handles the compliance automatically.
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
