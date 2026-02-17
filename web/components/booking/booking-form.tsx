'use client';

/**
 * Booking Form Component
 * Phase 4.5: Main booking form orchestrator
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalendarPicker } from './calendar-picker';
import { LocationInput } from './location-input';
import { ShiftConfig } from './shift-config';
import { PricingBreakdown } from './pricing-breakdown';
import { BookingFormData, PricingBreakdown as PricingData } from '@/lib/booking/types';
import { calculateBookingPrice, getUrgencyPremium } from '@/lib/booking/pricing';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import {
  VERTICAL_REQUIREMENTS,
  requirementsToNotes,
  type BookingVerticalId,
} from '@/lib/booking/vertical-requirements';

interface QuoteData {
  location?: string;
  siteAddress?: string;
  specialRequirements?: string[];
  confinedSpaceRequired?: boolean;
  traumaSpecialistRequired?: boolean;
  /** Vertical ID from QuoteBuilder step 1 event-type selection */
  eventVertical?: string;
}

interface BookingFormProps {
  prefillData?: QuoteData | null;
}

export function BookingForm({ prefillData }: BookingFormProps = {}) {
  const router = useRouter();
  const { industryVerticals } = useOrg();

  // Derive a default vertical: prefill from QuoteBuilder → org primary vertical → empty
  const defaultVertical =
    prefillData?.eventVertical ||
    (industryVerticals && industryVerticals.length > 0 ? industryVerticals[0] : '');

  // Base rate from org_settings (fallback: 42)
  const [baseRate, setBaseRate] = useState<number>(42);

  useEffect(() => {
    async function loadBaseRate() {
      const supabase = createClient();
      const { data } = await supabase
        .from('org_settings')
        .select('base_rate')
        .single();
      if (data?.base_rate) {
        setBaseRate(Number(data.base_rate));
      }
    }
    loadBaseRate();
  }, []);

  // Initialize form state
  const [formData, setFormData] = useState<BookingFormData>({
    shiftDate: undefined,
    shiftStartTime: '',
    shiftEndTime: '',
    shiftHours: 0,
    siteName: '',
    siteAddress: '',
    sitePostcode: '',
    siteContactName: '',
    siteContactPhone: '',
    eventVertical: defaultVertical,
    confinedSpaceRequired: false,
    traumaSpecialistRequired: false,
    selectedRequirements: [],
    specialNotes: '',
    isRecurring: false,
    recurrencePattern: null,
    recurringWeeks: 0,
    clientId: null,
  });

  const [pricing, setPricing] = useState<PricingData | null>(null);

  // Update form data
  const handleChange = (updates: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Pre-populate form from quote data (set by QuoteBuilder "Book Now" CTA)
  useEffect(() => {
    if (!prefillData) return;
    const specialNotes = prefillData.specialRequirements?.length
      ? prefillData.specialRequirements.join(', ')
      : '';
    setFormData((prev) => ({
      ...prev,
      siteAddress: prefillData.siteAddress || prefillData.location || prev.siteAddress,
      specialNotes: specialNotes || prev.specialNotes,
      eventVertical: prefillData.eventVertical || prev.eventVertical || defaultVertical,
      confinedSpaceRequired: prefillData.confinedSpaceRequired ?? prev.confinedSpaceRequired,
      traumaSpecialistRequired: prefillData.traumaSpecialistRequired ?? prev.traumaSpecialistRequired,
    }));
    // Clear sessionStorage after consuming the data
    sessionStorage.removeItem('quoteData');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData]);

  // Recalculate pricing whenever relevant fields change
  useEffect(() => {
    if (formData.shiftDate && formData.shiftHours >= 8) {
      const urgency = getUrgencyPremium(formData.shiftDate);
      const calculatedPricing = calculateBookingPrice({
        shiftHours: formData.shiftHours,
        baseRate, // Fetched from org_settings; fallback default 42
        urgencyPremiumPercent: urgency.percent,
        travelSurcharge: 0, // Will be calculated after medic assignment in Plan 03
      });
      setPricing(calculatedPricing);
    } else {
      setPricing(null);
    }
  }, [formData.shiftDate, formData.shiftHours, baseRate]);

  // Check if all required fields are filled
  const isFormValid = (): boolean => {
    const baseValidation =
      formData.shiftDate !== undefined &&
      formData.shiftStartTime !== '' &&
      formData.shiftEndTime !== '' &&
      formData.shiftHours >= 8 &&
      formData.siteName.trim() !== '' &&
      formData.siteAddress.trim() !== '' &&
      formData.sitePostcode.trim() !== '' &&
      formData.siteContactName.trim() !== '' &&
      formData.siteContactPhone.trim() !== '';

    // If recurring, validate recurring fields
    if (formData.isRecurring) {
      return (
        baseValidation &&
        formData.recurrencePattern !== null &&
        formData.recurringWeeks > 0 &&
        formData.recurringWeeks <= 52
      );
    }

    return baseValidation;
  };

  // Handle continue to payment
  const handleContinue = () => {
    if (!isFormValid()) return;

    // Serialize non-boolean requirements into specialNotes
    const vertical = (formData.eventVertical || 'general') as BookingVerticalId;
    const requirements = VERTICAL_REQUIREMENTS[vertical] ?? VERTICAL_REQUIREMENTS.general;
    const reqNotes = requirementsToNotes(formData.selectedRequirements ?? [], requirements);
    const finalNotes = [reqNotes, formData.specialNotes].filter(Boolean).join('. ');

    const dataToStore = { ...formData, specialNotes: finalNotes };

    // Store form data in sessionStorage for next step
    sessionStorage.setItem('bookingFormData', JSON.stringify(dataToStore));
    sessionStorage.setItem('bookingPricing', JSON.stringify(pricing));

    // Navigate to payment page (created in Plan 03)
    router.push('/book/payment');
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Column: Form Sections (2/3 width on desktop) */}
      <div className="space-y-8 lg:col-span-2">
        {/* Date Selection */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Select Shift Date</h2>
          <CalendarPicker
            selectedDate={formData.shiftDate}
            onDateSelect={(date) => handleChange({ shiftDate: date })}
          />
        </section>

        {/* Site Location */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Site Location</h2>
          <LocationInput formData={formData} onChange={handleChange} />
        </section>

        {/* Shift Configuration */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Shift Details</h2>
          <ShiftConfig formData={formData} onChange={handleChange} />
        </section>

        {/* Continue Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!isFormValid()}
            className="w-full sm:w-auto"
          >
            Continue to Payment
          </Button>
        </div>
      </div>

      {/* Right Column: Pricing Breakdown (1/3 width on desktop, sticky) */}
      <div className="lg:col-span-1">
        <PricingBreakdown pricing={pricing} />
      </div>
    </div>
  );
}
