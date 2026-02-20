'use client';

/**
 * Direct Job Creation Wizard Page
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * 6-step wizard for logging self-procured jobs.
 * Steps: Client Details -> Job Info -> Schedule -> Staffing -> Pricing -> Review
 *
 * Entry point: /dashboard/jobs/create (SiteMedic platform, NOT marketplace)
 * Follows the same pattern as marketplace/events/create/page.tsx.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDirectJobStore } from '@/stores/useDirectJobStore';
import {
  clientDetailsSchema,
  jobInfoSchema,
  jobScheduleSchema,
  jobStaffingSchema,
  jobPricingSchema,
} from '@/lib/direct-jobs/schemas';
import ClientDetailsStep from '@/components/direct-jobs/wizard/ClientDetailsStep';
import JobInfoStep from '@/components/direct-jobs/wizard/JobInfoStep';
import JobScheduleStep from '@/components/direct-jobs/wizard/JobScheduleStep';
import JobStaffingStep from '@/components/direct-jobs/wizard/JobStaffingStep';
import JobPricingStep from '@/components/direct-jobs/wizard/JobPricingStep';
import JobReviewStep from '@/components/direct-jobs/wizard/JobReviewStep';

const STEPS = ['Client', 'Job Info', 'Schedule', 'Staffing', 'Pricing', 'Review'];

export default function CreateDirectJobPage() {
  const router = useRouter();
  const store = useDirectJobStore();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  // Reset on unmount
  useEffect(() => {
    return () => {
      store.reset();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validateCurrentStep = (): boolean => {
    setErrors({});
    let schema;
    let data;

    switch (store.currentStep) {
      case 0:
        schema = clientDetailsSchema;
        data = {
          existing_client_id: store.existing_client_id || undefined,
          client_name: store.client_name,
          contact_name: store.contact_name || null,
          contact_email: store.contact_email || null,
          contact_phone: store.contact_phone || null,
          address_line_1: store.address_line_1 || null,
          address_line_2: store.address_line_2 || null,
          city: store.city || null,
          postcode: store.postcode || null,
        };
        break;
      case 1:
        schema = jobInfoSchema;
        data = {
          event_name: store.event_name,
          event_type: store.event_type || undefined,
          event_description: store.event_description || null,
          special_requirements: store.special_requirements || null,
          indoor_outdoor: store.indoor_outdoor,
          expected_attendance: store.expected_attendance,
        };
        break;
      case 2:
        schema = jobScheduleSchema;
        data = {
          event_days: store.event_days,
          location_postcode: store.location_postcode,
          location_address: store.location_address || null,
          location_what3words: store.location_what3words || null,
          location_lat: store.location_lat,
          location_lng: store.location_lng,
          location_display: store.location_display || null,
        };
        break;
      case 3:
        schema = jobStaffingSchema;
        data = {
          staffing_requirements: store.staffing_requirements.map((r) => ({
            ...r,
            role: r.role || undefined,
            event_day_id: r.event_day_id || null,
            additional_notes: r.additional_notes || null,
          })),
          equipment_required: store.equipment_required,
        };
        break;
      case 4:
        schema = jobPricingSchema;
        data = {
          agreed_price: store.agreed_price,
          deposit_percent: store.deposit_percent,
          notes: store.notes || null,
        };
        break;
      default:
        return true;
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      const flat = result.error.flatten();
      setErrors(flat.fieldErrors as Record<string, string[] | undefined>);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      store.setStep(store.currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setErrors({});
    store.setStep(store.currentStep - 1);
  };

  const handleSubmit = async (saveAsDraft: boolean) => {
    store.setSubmitting(true);
    store.setError(null);

    try {
      const body = {
        // Client
        existing_client_id: store.existing_client_id || undefined,
        client_name: store.client_name,
        contact_name: store.contact_name || null,
        contact_email: store.contact_email || null,
        contact_phone: store.contact_phone || null,
        address_line_1: store.address_line_1 || null,
        address_line_2: store.address_line_2 || null,
        city: store.city || null,
        postcode: store.postcode || null,
        // Job info
        event_name: store.event_name,
        event_type: store.event_type,
        event_description: store.event_description || null,
        special_requirements: store.special_requirements || null,
        indoor_outdoor: store.indoor_outdoor,
        expected_attendance: store.expected_attendance,
        // Schedule
        event_days: store.event_days,
        location_postcode: store.location_postcode,
        location_address: store.location_address || null,
        location_what3words: store.location_what3words || null,
        location_lat: store.location_lat,
        location_lng: store.location_lng,
        location_display: store.location_display || null,
        // Staffing
        staffing_requirements: store.staffing_requirements.map((r) => ({
          ...r,
          role: r.role || undefined,
          event_day_id: r.event_day_id || null,
          additional_notes: r.additional_notes || null,
        })),
        equipment_required: store.equipment_required,
        // Pricing
        agreed_price: store.agreed_price,
        deposit_percent: store.deposit_percent,
        notes: store.notes || null,
        // Meta
        save_as_draft: saveAsDraft,
      };

      const url = store.draftId
        ? `/api/direct-jobs/${store.draftId}`
        : '/api/direct-jobs';
      const method = store.draftId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        store.setError(data.error || 'Failed to save job');
        return;
      }

      store.reset();
      router.push('/dashboard/jobs');
    } catch {
      store.setError('An unexpected error occurred');
    } finally {
      store.setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Log a Job</h1>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  index <= store.currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:inline ${
                  index <= store.currentStep ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 sm:mx-4 h-0.5 w-6 sm:w-12 ${
                    index < store.currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {store.error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{store.error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg border p-6">
        {store.currentStep === 0 && <ClientDetailsStep errors={errors} />}
        {store.currentStep === 1 && <JobInfoStep errors={errors} />}
        {store.currentStep === 2 && <JobScheduleStep errors={errors} />}
        {store.currentStep === 3 && <JobStaffingStep errors={errors} />}
        {store.currentStep === 4 && <JobPricingStep errors={errors} />}
        {store.currentStep === 5 && <JobReviewStep />}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {store.currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {store.currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={store.isSubmitting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {store.isSubmitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={store.isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {store.isSubmitting ? 'Creating...' : 'Create Job'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
