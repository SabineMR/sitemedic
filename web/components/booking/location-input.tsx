'use client';

/**
 * Location Input Component
 * Phase 4.5: Site location and contact details
 */

import { Input } from '@/components/ui/input';
import { BookingFormData } from '@/lib/booking/types';
import { What3WordsInput } from '@/components/ui/what3words-input';

interface LocationInputProps {
  formData: BookingFormData;
  onChange: (updates: Partial<BookingFormData>) => void;
}

export function LocationInput({ formData, onChange }: LocationInputProps) {
  // Basic UK postcode validation (letters + numbers, 5-8 chars)
  const validatePostcode = (postcode: string): boolean => {
    const ukPostcodePattern = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
    return ukPostcodePattern.test(postcode.trim());
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="siteName" className="text-sm font-medium">
          Site Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="siteName"
          type="text"
          placeholder="e.g., Westminster Building Project"
          value={formData.siteName}
          onChange={(e) => onChange({ siteName: e.target.value })}
          required
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="siteAddress" className="text-sm font-medium">
          Site Address <span className="text-destructive">*</span>
        </label>
        <textarea
          id="siteAddress"
          placeholder="Full site address"
          value={formData.siteAddress}
          onChange={(e) => onChange({ siteAddress: e.target.value })}
          required
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="sitePostcode" className="text-sm font-medium">
          Site Postcode <span className="text-destructive">*</span>
        </label>
        <Input
          id="sitePostcode"
          type="text"
          placeholder="e.g., SW1A 1AA"
          value={formData.sitePostcode}
          onChange={(e) => onChange({ sitePostcode: e.target.value.toUpperCase() })}
          required
          className={`mt-1.5 ${
            formData.sitePostcode && !validatePostcode(formData.sitePostcode)
              ? 'border-destructive'
              : ''
          }`}
        />
        {formData.sitePostcode && !validatePostcode(formData.sitePostcode) && (
          <p className="mt-1 text-xs text-destructive">Please enter a valid UK postcode</p>
        )}
      </div>

      <div>
        <label htmlFor="what3wordsAddress" className="text-sm font-medium">
          what3words Address (Recommended)
        </label>
        <div className="mt-1.5">
          <What3WordsInput
            value={formData.what3wordsAddress || ''}
            onChange={(value) => onChange({ what3wordsAddress: value })}
            placeholder="e.g., filled.count.soap"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Provides 3m x 3m precision for exact site location. Makes it easier for paramedics to find you.
        </p>
      </div>

      <div>
        <label htmlFor="siteContactName" className="text-sm font-medium">
          Site Contact Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="siteContactName"
          type="text"
          placeholder="On-site contact person"
          value={formData.siteContactName}
          onChange={(e) => onChange({ siteContactName: e.target.value })}
          required
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="siteContactPhone" className="text-sm font-medium">
          Site Contact Phone <span className="text-destructive">*</span>
        </label>
        <Input
          id="siteContactPhone"
          type="tel"
          placeholder="e.g., 07700 900000"
          value={formData.siteContactPhone}
          onChange={(e) => onChange({ siteContactPhone: e.target.value })}
          required
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
