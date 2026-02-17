'use client';

/**
 * BookPageClient
 * Thin client wrapper — reads quoteData from sessionStorage on mount
 * and passes it as prefillData to <BookingForm>.
 * Kept separate so the parent page can remain a Server Component (metadata).
 */

import { useEffect, useState } from 'react';
import { BookingForm } from '@/components/booking/booking-form';

interface QuoteData {
  location?: string;
  siteAddress?: string;
  specialRequirements?: string[];
  confinedSpaceRequired?: boolean;
  traumaSpecialistRequired?: boolean;
}

export function BookPageClient() {
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

  return <BookingForm prefillData={prefillData} />;
}
