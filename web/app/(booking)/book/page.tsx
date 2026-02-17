/**
 * Book a Medic Page
 * Phase 4.5: Customer-facing booking form
 *
 * Server component — exports metadata for SEO.
 * Client-side sessionStorage prefill (from QuoteBuilder "Book Now" CTA)
 * is handled by <BookPageClient>.
 */

import { Metadata } from 'next';
import { BookPageClient } from './book-page-client';

export const metadata: Metadata = {
  title: 'Book a Medic - Apex Safety Group',
  description:
    'Book qualified paramedics for your construction site. Select dates, configure shift requirements, and see real-time pricing.',
};

export default function BookPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Book a Medic</h1>
        <p className="text-lg text-muted-foreground">
          Select your dates and site details
        </p>
      </div>

      {/* Booking Form — reads quoteData from sessionStorage if coming from QuoteBuilder */}
      <BookPageClient />
    </div>
  );
}
