/**
 * Quote Submission Form — Main Component
 * Phase 34: Quote Submission & Comparison
 *
 * Top-level client component that orchestrates the multi-section quote form:
 * - PricingBreakdownSection: Itemised pricing with custom line items
 * - StaffingPlanSection: Named medics or headcount+qualifications
 * - CoverLetterSection: Free-form pitch
 * - Availability confirmation checkbox
 * - Auto-saves draft every 2 seconds
 * - Displays minimum rate violations and blocks submission if present
 * - Redirects on successful submission
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuoteFormStore } from '@/stores/useQuoteFormStore';
import { quoteSubmissionSchema } from '@/lib/marketplace/quote-schemas';
import { validateAgainstMinimumRates } from '@/lib/marketplace/minimum-rates';
import PricingBreakdownSection from './PricingBreakdownSection';
import StaffingPlanSection from './StaffingPlanSection';
import CoverLetterSection from './CoverLetterSection';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuoteSubmissionFormProps {
  eventId: string;
  eventDurationHours: number;
  existingQuoteId?: string;
}

export default function QuoteSubmissionForm({
  eventId,
  eventDurationHours,
  existingQuoteId,
}: QuoteSubmissionFormProps) {
  const router = useRouter();
  const store = useQuoteFormStore();
  const [rateViolations, setRateViolations] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const draftSaveTimerRef = useRef<NodeJS.Timeout>(undefined);

  // =========================================================================
  // Initialization
  // =========================================================================

  useEffect(() => {
    store.setEventId(eventId);

    // If editing an existing quote, we would load it here
    // For now, Phase 34 starts with empty form (Phase 35 will implement quote editing)
  }, [eventId, store]);

  // =========================================================================
  // Auto-save draft with 2-second debounce
  // =========================================================================

  useEffect(() => {
    // Clear existing timer
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }

    // Set new timer — save draft after 2 seconds of inactivity
    draftSaveTimerRef.current = setTimeout(() => {
      if (
        store.staffCost > 0 ||
        store.equipmentCost > 0 ||
        store.transportCost > 0 ||
        store.consumablesCost > 0 ||
        store.customLineItems.length > 0 ||
        store.namedMedics.length > 0 ||
        store.headcountPlans.length > 0 ||
        store.coverLetter.length > 0
      ) {
        store.saveDraft().catch((error) => {
          console.error('Draft save error:', error);
          // Silent failure — don't show toast for auto-save errors
        });
      }
    }, 2000);

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
      }
    };
  }, [
    store.staffCost,
    store.equipmentCost,
    store.transportCost,
    store.consumablesCost,
    store.customLineItems,
    store.staffingPlanType,
    store.namedMedics,
    store.headcountPlans,
    store.coverLetter,
    store.availabilityConfirmed,
  ]);

  // =========================================================================
  // Form Submission
  // =========================================================================

  const handleSubmit = async () => {
    setValidationErrors({});
    setRateViolations([]);

    // Build quote data for validation
    const quoteData = {
      event_id: store.eventId,
      pricing_breakdown: {
        staffCost: store.staffCost,
        equipmentCost: store.equipmentCost,
        transportCost: store.transportCost,
        consumablesCost: store.consumablesCost,
        customLineItems: store.customLineItems,
      },
      staffing_plan: {
        type: store.staffingPlanType,
        named_medics: store.staffingPlanType === 'named_medics' ? store.namedMedics : undefined,
        headcount_plans: store.staffingPlanType === 'headcount_and_quals' ? store.headcountPlans : undefined,
      },
      cover_letter: store.coverLetter || null,
      availability_confirmed: store.availabilityConfirmed,
    };

    // Validate schema
    const schemaValidation = quoteSubmissionSchema.safeParse(quoteData);
    if (!schemaValidation.success) {
      const newErrors: Record<string, string> = {};
      schemaValidation.error.issues.forEach((err) => {
        const path = err.path.join('.');
        newErrors[path] = err.message;
      });
      setValidationErrors(newErrors);
      toast.error('Please fix the errors below');
      return;
    }

    // Validate minimum rates
    const staffingForValidation =
      store.staffingPlanType === 'headcount_and_quals'
        ? store.headcountPlans
        : store.namedMedics.map((m) => ({
            role: m.qualification,
            quantity: 1,
          }));

    const totalPrice =
      store.staffCost +
      store.equipmentCost +
      store.transportCost +
      store.consumablesCost +
      store.customLineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const rateValidation = validateAgainstMinimumRates(
      totalPrice,
      staffingForValidation as any,
      eventDurationHours
    );

    if (!rateValidation.isValid) {
      setRateViolations(rateValidation.violations);
      toast.error('Quote is below minimum rate guidelines');
      return;
    }

    // Submit quote
    try {
      const quoteId = await store.submitQuote();
      toast.success('Quote submitted successfully!');
      // Redirect to event detail or success page
      router.push(`/marketplace/events/${eventId}`);
    } catch (error) {
      toast.error('Failed to submit quote');
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Submit a Quote</h1>
        <p className="text-gray-600 mt-1">
          Provide your itemised pricing, staffing plan, and cover letter
        </p>
      </div>

      {/* Rate Violations Alert */}
      {rateViolations.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Quote is below minimum rate guidelines:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {rateViolations.map((violation, i) => (
                <li key={i}>
                  {violation.role}: Quoted £{violation.quotedRate.toFixed(2)}/hr, minimum is £{violation.minimumRate}/hr
                </li>
              ))}
            </ul>
            <p className="text-sm mt-2">Please increase your quote or contact support.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Draft Saved Indicator */}
      {store.draftSavedAt && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Draft saved {new Date(store.draftSavedAt).toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Form Sections */}
      <PricingBreakdownSection errors={validationErrors} />
      <StaffingPlanSection errors={validationErrors} />
      <CoverLetterSection />

      {/* Availability Confirmation */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={store.availabilityConfirmed}
            onChange={(e) => store.setAvailabilityConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I confirm that my team is available to work the dates and times of this event
            {validationErrors.availability_confirmed && (
              <span className="block text-red-600 text-xs mt-1">{validationErrors.availability_confirmed}</span>
            )}
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={store.isSubmitting || !store.availabilityConfirmed || rateViolations.length > 0}
          size="lg"
          className="flex-1"
        >
          {store.isSubmitting ? 'Submitting...' : 'Submit Quote'}
        </Button>
        <Button
          onClick={() => store.saveDraft()}
          variant="outline"
          disabled={store.isSavingDraft}
          size="lg"
        >
          {store.isSavingDraft ? 'Saving...' : 'Save as Draft'}
        </Button>
      </div>
    </div>
  );
}
