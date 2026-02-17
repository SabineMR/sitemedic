/**
 * Book a Medic Page
 * Phase 4.5: Customer-facing booking form
 *
 * Reads quoteData from sessionStorage (set by QuoteBuilder "Book Now" CTA)
 * and passes it as prefillData to BookingForm.
 */

'use client';

import { useEffect, useState } from 'react';
import { BookingForm } from '@/components/booking/booking-form';

interface QuoteData {
  location?: string;
  siteAddress?: string;
  specialRequirements?: string[];
  confinedSpaceRequired?: boolean;
  traumaSpecialistRequired?: boolean;
}

export default function BookPage() {
  const [prefillData, setPrefillData] = useState<QuoteData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('quoteData');
    if (raw) {
      try {
        setPrefillData(JSON.parse(raw));
      } catch {
        // Ignore malformed data
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Book a Medic</h1>
        <p className="text-lg text-muted-foreground">
          Select your dates and site details
        </p>
      </div>

      {/* Booking Form */}
      <BookingForm prefillData={prefillData} />
    </div>
  );
}
