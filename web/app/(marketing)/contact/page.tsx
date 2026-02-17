/**
 * Contact Apex Safety Group
 *
 * Enquiry form for clients across all sectors looking to book a medic
 * or discuss a custom contract for events, productions, or worksites.
 *
 * Route: /contact
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Contact Us — Apex Safety Group',
  description:
    'Get in touch with Apex Safety Group to book an HCPC-registered paramedic for your event, film production, motorsport event, construction site, festival or sporting competition across England & Wales.',
};

export default function ContactPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-20 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            <span className="text-blue-300 text-sm font-medium">Get in Touch</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">
            Talk to the ASG team
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
            Whether you need a medic on site next week, cover for a one-day event, or want to discuss
            a long-term contract, we&apos;ll get back to you within one business day.
          </p>
        </div>
      </section>

      {/* Form + sidebar */}
      <ContactForm />

      {/* Bottom CTA */}
      <section className="bg-slate-50 border-t border-slate-200 py-14 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Prefer to read about us first?
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            Find out how ASG works, what services we provide across all industries, and why event organisers, production companies and worksites choose us over standard first-aid agencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/about"
              className="border border-slate-200 text-slate-700 px-7 py-3 rounded-xl font-semibold hover:bg-white transition text-sm"
            >
              About ASG
            </Link>
            <Link
              href="/services"
              className="border border-slate-200 text-slate-700 px-7 py-3 rounded-xl font-semibold hover:bg-white transition text-sm"
            >
              Our Services
            </Link>
            <Link
              href="/pricing"
              className="border border-slate-200 text-slate-700 px-7 py-3 rounded-xl font-semibold hover:bg-white transition text-sm"
            >
              Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
