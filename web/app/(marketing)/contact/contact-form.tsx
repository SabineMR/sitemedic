'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail, MapPin, Clock } from 'lucide-react';

const SITE_SIZES = [
  'Under 10 workers',
  '10–50 workers',
  '50–200 workers',
  '200–500 workers',
  '500+ workers',
  'Multiple sites',
];

const ENQUIRY_TYPES = [
  'Book a site medic',
  'Health surveillance programme',
  'Drug & alcohol testing',
  'Fitness-to-work assessments',
  'Mental health & wellbeing',
  'Custom / multi-site contract',
  'General enquiry',
];

interface FormState {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  siteSize: string;
  enquiryType: string;
  message: string;
}

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  company: '',
  email: '',
  phone: '',
  siteSize: '',
  enquiryType: '',
  message: '',
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: wire up to Supabase contact_requests insert or email edge function
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid lg:grid-cols-3 gap-12">

        {/* Contact form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-5" />
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Enquiry received</h2>
              <p className="text-slate-600 max-w-md mb-8">
                Thanks, {form.firstName}. Someone from the ASG team will be in touch within one
                business day. If your request is urgent, email us directly at{' '}
                <a
                  href="mailto:support@sitemedic.co.uk"
                  className="text-blue-600 font-medium hover:underline"
                >
                  support@sitemedic.co.uk
                </a>
                .
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/book"
                  className="bg-blue-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-blue-700 transition text-sm"
                >
                  Book a Medic Directly
                </Link>
                <button
                  onClick={() => { setSubmitted(false); setForm(emptyForm); }}
                  className="border border-slate-200 text-slate-700 px-7 py-3 rounded-xl font-semibold hover:bg-slate-50 transition text-sm"
                >
                  Send Another Enquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Send us an enquiry</h2>
                <p className="text-slate-500 text-sm">
                  Fill in the form and we&apos;ll get back to you within one business day.
                </p>
              </div>

              {/* Name row */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Smith"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company"
                  required
                  value={form.company}
                  onChange={handleChange}
                  placeholder="Acme Construction Ltd"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Email + Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane@acmeconstruction.co.uk"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="07700 900000"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Site size + Enquiry type */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Typical site workforce size
                  </label>
                  <select
                    name="siteSize"
                    value={form.siteSize}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  >
                    <option value="">Select size…</option>
                    {SITE_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    What can we help with? <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="enquiryType"
                    required
                    value={form.enquiryType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  >
                    <option value="">Select…</option>
                    {ENQUIRY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tell us more
                </label>
                <textarea
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Describe your site, how often you need a medic, any specific compliance requirements…"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send Enquiry'}
              </button>

              <p className="text-xs text-slate-400 mt-2">
                By submitting this form you agree to our{' '}
                <Link href="/privacy-policy" className="underline hover:text-slate-600">
                  Privacy Policy
                </Link>
                . We will never share your details with third parties.
              </p>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Direct contact */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Direct contact</h3>
            <div className="space-y-3">
              <a
                href="mailto:support@sitemedic.co.uk"
                className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition group"
              >
                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition">
                  <Mail className="w-4 h-4 text-blue-600" />
                </span>
                support@sitemedic.co.uk
              </a>
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                </span>
                <span>
                  Apex Safety Group Ltd<br />
                  Registered in England and Wales
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-500" />
                </span>
                Mon–Fri, 8 am–6 pm
              </div>
            </div>
          </div>

          {/* Response time */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <p className="text-blue-800 text-sm font-semibold mb-1">Response time</p>
            <p className="text-blue-700 text-sm leading-relaxed">
              We respond to all enquiries within one business day. For urgent site requests,
              email us directly at support@sitemedic.co.uk.
            </p>
          </div>

          {/* Book directly CTA */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white">
            <p className="font-semibold mb-1.5 text-sm">Ready to book?</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              Skip the form — book a site medic directly and get your compliance dashboard
              active today.
            </p>
            <Link
              href="/book"
              className="block w-full text-center bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition"
            >
              Book a Medic
            </Link>
          </div>

          {/* What happens next */}
          <div className="border border-slate-200 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">What happens next</h3>
            <ol className="space-y-3">
              {[
                'We review your enquiry and match you to the right medic profile',
                'You receive a tailored quote within 24 hours',
                'We confirm site date, access details, and set up your SiteMedic dashboard',
                'Medic attends site — compliance records logged from day one',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
