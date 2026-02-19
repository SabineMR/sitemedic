/**
 * Client Support Page
 *
 * Self-service help centre with FAQs, contact details, and quick links.
 * Reduces admin support burden by answering common client questions upfront.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HelpCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  CreditCard,
  Shield,
  Clock,
} from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: 'bookings' | 'invoices' | 'account' | 'general';
}

const faqs: FAQ[] = [
  {
    category: 'bookings',
    question: 'How do I make a new booking?',
    answer:
      'Click the "New Booking" button in the top-right corner of any page. Select your site, choose a date, pick your required shift hours, and confirm. You\'ll receive an email confirmation once the booking is processed.',
  },
  {
    category: 'bookings',
    question: 'How far in advance can I book?',
    answer:
      'You can book up to 12 weeks in advance. For recurring or long-term arrangements, please contact our team directly.',
  },
  {
    category: 'bookings',
    question: 'What is the cancellation policy?',
    answer:
      'Cancellations made 7+ days before the shift receive a full refund. Cancellations 3-6 days before receive a 50% refund. Cancellations less than 72 hours before the shift are non-refundable. You can cancel from the booking detail page.',
  },
  {
    category: 'bookings',
    question: 'Can I change the date or time of a booking?',
    answer:
      'Currently you\'ll need to cancel the existing booking and create a new one. We\'re working on an amendment feature. Cancellation refund policies will apply based on the original booking date.',
  },
  {
    category: 'invoices',
    question: 'When will I receive my invoice?',
    answer:
      'For Net 30 clients, invoices are generated after the shift is completed and marked as done. You\'ll receive an email with a PDF invoice attached. All invoices are also available on your Invoices page.',
  },
  {
    category: 'invoices',
    question: 'What payment methods do you accept?',
    answer:
      'We accept bank transfer (BACS) for Net 30 invoices. Prepay clients can pay by card via our secure payment portal powered by Stripe.',
  },
  {
    category: 'invoices',
    question: 'I have a query about an invoice. Who do I contact?',
    answer:
      'For invoice queries, email accounts@sitemedic.co.uk with your invoice number and we\'ll respond within 1 working day.',
  },
  {
    category: 'account',
    question: 'How do I update my company details?',
    answer:
      'Go to the Account page from the sidebar navigation. Click "Edit" to update your company name, contact details, and billing address.',
  },
  {
    category: 'account',
    question: 'Can I change my payment terms?',
    answer:
      'Payment terms (Prepay or Net 30) and credit limits are managed by our team. Contact support@sitemedic.co.uk to request changes.',
  },
  {
    category: 'general',
    question: 'What qualifications do your medics have?',
    answer:
      'All SiteMedic medics hold a minimum of a Level 3 First Aid at Work qualification, plus relevant industry certifications. Certifications are verified and tracked to ensure they remain current.',
  },
  {
    category: 'general',
    question: 'What happens if a medic can\'t make a shift?',
    answer:
      'In the rare event of a medic being unavailable, we\'ll reassign a replacement medic and notify you as soon as possible. Our auto-assignment system prioritises medics closest to your site.',
  },
];

const categoryIcons: Record<string, React.ElementType> = {
  bookings: Calendar,
  invoices: FileText,
  account: CreditCard,
  general: Shield,
};

const categoryLabels: Record<string, string> = {
  bookings: 'Bookings',
  invoices: 'Invoices & Payments',
  account: 'Account',
  general: 'General',
};

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border rounded-lg p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-sm">{faq.question}</p>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        )}
      </div>
      {open && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {faq.answer}
        </p>
      )}
    </button>
  );
}

export default function ClientSupportPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = ['bookings', 'invoices', 'account', 'general'];

  const filteredFaqs = activeCategory
    ? faqs.filter((f) => f.category === activeCategory)
    : faqs;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-blue-600" />
          Help & Support
        </h1>
        <p className="text-muted-foreground mt-1">
          Find answers to common questions or get in touch with our team
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-start gap-4 py-5">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Email Support</p>
              <a
                href="mailto:support@sitemedic.co.uk"
                className="text-sm text-blue-600 hover:underline"
              >
                support@sitemedic.co.uk
              </a>
              <p className="text-xs text-muted-foreground mt-1">
                We respond within 1 working day
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 py-5">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Phone Support</p>
              <a
                href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '+443301234567'}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {process.env.NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY ?? '0330 123 4567'}
              </a>
              <p className="text-xs text-muted-foreground mt-1">
                Mon–Fri, 8am–6pm
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Office Hours */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-center gap-3 py-4">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Office hours:</strong> Monday to Friday, 8:00am – 6:00pm.
            For urgent out-of-hours issues, email{' '}
            <a
              href="mailto:urgent@sitemedic.co.uk"
              className="font-medium underline"
            >
              urgent@sitemedic.co.uk
            </a>
          </p>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const Icon = categoryIcons[cat];
              return (
                <button
                  key={cat}
                  onClick={() =>
                    setActiveCategory(activeCategory === cat ? null : cat)
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {categoryLabels[cat]}
                </button>
              );
            })}
          </div>

          {/* FAQ List */}
          <div className="space-y-2">
            {filteredFaqs.map((faq, i) => (
              <FAQItem key={i} faq={faq} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Still Need Help? */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-5 text-center">
          <p className="text-sm text-blue-800">
            Can't find what you're looking for?{' '}
            <a
              href="mailto:support@sitemedic.co.uk"
              className="font-medium underline"
            >
              Email our support team
            </a>{' '}
            and we'll get back to you within 1 working day.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
