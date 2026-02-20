import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ — SiteMedic Marketplace',
  description:
    'Frequently asked questions about the SiteMedic Marketplace — for event organisers, medical companies, platform compliance, and pricing.',
  openGraph: {
    title: 'FAQ — SiteMedic Marketplace',
    description:
      'Frequently asked questions about posting events, submitting quotes, compliance, and pricing on the SiteMedic Marketplace.',
    type: 'website',
  },
};

export const dynamic = 'force-static';
export const revalidate = 86400;

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  color: string;
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    title: 'For Clients',
    color: 'blue',
    items: [
      {
        q: 'How do I post an event on the marketplace?',
        a: 'Sign up for a free client account, then click "Post an Event". You\'ll be guided through a form covering event type, date, location, expected attendance, and medical requirements. The whole process takes less than 5 minutes.',
      },
      {
        q: 'How long does it take to receive quotes?',
        a: 'Most events receive their first quotes within 24 hours. The quoting window is typically 48 hours, though this can be extended for larger or more complex events.',
      },
      {
        q: 'How do I award a quote?',
        a: 'Review all submitted quotes on your event dashboard. You can compare staffing plans, pricing, equipment, and company profiles side-by-side. When you\'ve found the right fit, click "Award" to confirm your choice.',
      },
      {
        q: 'How do deposits and payments work?',
        a: 'When you award a quote, you\'ll be asked to pay a deposit via Stripe. The deposit amount is specified in the quote. Remaining payments are made according to the agreed schedule. All payments are PCI-compliant and protected by Stripe.',
      },
      {
        q: 'What if I have a dispute with a provider?',
        a: 'Contact our support team through the platform. We mediate disputes between clients and providers. All communication and transaction history is logged for transparency.',
      },
      {
        q: 'Is it free to post an event?',
        a: 'Yes. Posting events is completely free with no obligation to award. You only pay when you choose to award a quote and the booking is confirmed.',
      },
    ],
  },
  {
    title: 'For Companies',
    color: 'emerald',
    items: [
      {
        q: 'How do I register my medical company?',
        a: 'Click "Register Your Company" and follow the onboarding flow. You\'ll need your CQC Provider ID, company details, compliance documents (PLI, ELI), and a Stripe Connect account for payouts. Registration takes about 10 minutes.',
      },
      {
        q: 'How is my CQC status verified?',
        a: 'During registration, you provide your CQC Provider ID. We verify this against the CQC register to confirm your company is actively registered and in good standing. This must be verified before you can submit quotes.',
      },
      {
        q: 'How does the quoting process work?',
        a: 'Browse available events filtered by location, date, and type. When you find a suitable event, submit a detailed quote including your staffing plan, equipment list, itemized pricing, and a cover letter explaining your approach.',
      },
      {
        q: 'How and when do I get paid?',
        a: 'Payments are processed through Stripe Connect. Once the client pays, funds are held securely and released according to the payment schedule. Payouts are sent to your bank account on a weekly cycle.',
      },
      {
        q: 'Can I manage my medic roster on the platform?',
        a: 'Yes. You can add your team members, their qualifications, HCPC numbers, and availability. When quoting, you can assign specific medics to events from your roster.',
      },
      {
        q: 'What if the client cancels after I\'m awarded?',
        a: 'Cancellation terms are defined in the booking agreement. Deposits are non-refundable after a specified period. The platform enforces these terms automatically through Stripe.',
      },
    ],
  },
  {
    title: 'Platform & Compliance',
    color: 'slate',
    items: [
      {
        q: 'How does SiteMedic handle data security?',
        a: 'All data is hosted on UK-based servers. We use encryption at rest and in transit, role-based access controls, and regular security audits. The platform is built to UK GDPR standards.',
      },
      {
        q: 'Is the platform GDPR compliant?',
        a: 'Yes. SiteMedic is fully UK GDPR compliant. We have a dedicated Data Protection Officer, clear data processing agreements, and give users full control over their personal data.',
      },
      {
        q: 'How does CQC monitoring work?',
        a: 'We periodically re-verify CQC registrations for all companies on the marketplace. If a company\'s CQC status changes, they are automatically flagged and may be suspended from quoting until the issue is resolved.',
      },
      {
        q: 'What compliance documentation is generated?',
        a: 'The platform automatically generates treatment logs, incident reports, RIDDOR-flagged events, attendance records, and compliance certificates. All documents are timestamped, signed, and stored for audit purposes.',
      },
    ],
  },
  {
    title: 'Pricing',
    color: 'amber',
    items: [
      {
        q: 'What commission does the marketplace charge?',
        a: 'The marketplace operates on a transparent commission model. The platform fee and medic payout percentages are visible before you submit a quote. There are no hidden fees or surprise charges.',
      },
      {
        q: 'How much deposit does the client pay?',
        a: 'The deposit amount is set by the quoting company as part of their quote. Typical deposits range from 25% to 50% of the total booking value, paid at the point of awarding.',
      },
      {
        q: 'Are there any fees for direct jobs?',
        a: 'No. If you bring your own clients to the platform as "direct jobs", there is 0% commission. You still get full access to the compliance dashboard, treatment logging, and RIDDOR flagging.',
      },
      {
        q: 'What is the refund policy?',
        a: 'Refunds are governed by the booking terms agreed between client and provider. The platform facilitates refund processing through Stripe. For full details, see our Refund Policy page.',
      },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Everything you need to know about posting events, submitting quotes, and using the SiteMedic Marketplace.
          </p>
        </div>
      </section>

      {/* ─── FAQ SECTIONS ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          {faqSections.map(({ title, color, items }) => {
            const tagColors: Record<string, string> = {
              blue: 'bg-blue-50 text-blue-700',
              emerald: 'bg-emerald-50 text-emerald-700',
              slate: 'bg-slate-100 text-slate-700',
              amber: 'bg-amber-50 text-amber-700',
            };

            return (
              <div key={title}>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-6 ${tagColors[color]}`}>
                  {title}
                </div>
                <div className="space-y-3">
                  {items.map(({ q, a }) => (
                    <details
                      key={q}
                      className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition"
                    >
                      <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-sm font-semibold text-slate-900 select-none list-none">
                        <span>{q}</span>
                        <span className="ml-4 flex-shrink-0 text-slate-400 group-open:rotate-45 transition-transform duration-200 text-lg font-light">
                          +
                        </span>
                      </summary>
                      <div className="px-6 pb-5 pt-0 text-sm text-slate-600 leading-relaxed border-t border-slate-100 mt-0 pt-4">
                        {a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── STILL HAVE QUESTIONS CTA ─────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Still have questions?
          </h2>
          <p className="text-slate-600 mb-8">
            Get in touch with our team. We&apos;re here to help event organisers and medical companies get the most out of the marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition text-center"
            >
              Contact Us
            </Link>
            <Link
              href="/"
              className="border border-slate-200 text-slate-700 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white transition flex items-center justify-center gap-2"
            >
              Back to Marketplace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
