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

interface QuoteData {
  location?: string;
  siteAddress?: string;
  specialRequirements?: string[];
  confinedSpaceRequired?: boolean;
  traumaSpecialistRequired?: boolean;
}

interface BookingFormProps {
  prefillData?: QuoteData | null;
}

export function BookingForm({ prefillData }: BookingFormProps = {}) {
  const router = useRouter();

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
    confinedSpaceRequired: false,
    traumaSpecialistRequired: false,
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
        baseRate: 42, // Default GBP 42/hr
        urgencyPremiumPercent: urgency.percent,
        travelSurcharge: 0, // Will be calculated after medic assignment in Plan 03
      });
      setPricing(calculatedPricing);
    } else {
      setPricing(null);
    }
  }, [formData.shiftDate, formData.shiftHours]);

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

    // Store form data in sessionStorage for next step
    sessionStorage.setItem('bookingFormData', JSON.stringify(formData));
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
