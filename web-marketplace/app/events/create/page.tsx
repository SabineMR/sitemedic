'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEventPostingStore } from '@/stores/useEventPostingStore';
import { basicInfoSchema, schedulingSchema, staffingSchema } from '@/lib/marketplace/event-schemas';
import BasicInfoStep from '@/components/marketplace/event-wizard/BasicInfoStep';
import ScheduleLocationStep from '@/components/marketplace/event-wizard/ScheduleLocationStep';
import StaffingEquipmentStep from '@/components/marketplace/event-wizard/StaffingEquipmentStep';
import ReviewStep from '@/components/marketplace/event-wizard/ReviewStep';

const STEPS = ['Basic Info', 'Schedule & Location', 'Staffing & Equipment', 'Review'];

export default function CreateEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useEventPostingStore();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  // Load draft if draft ID in URL
  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (draftId && draftId !== store.draftId) {
      fetch(`/api/marketplace/events/${draftId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.event) {
            store.loadDraft(data.event);
          }
        })
        .catch(console.error);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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
        schema = basicInfoSchema;
        data = {
          event_name: store.event_name,
          event_type: store.event_type || undefined,
          event_description: store.event_description || null,
          special_requirements: store.special_requirements || null,
          indoor_outdoor: store.indoor_outdoor,
          expected_attendance: store.expected_attendance,
        };
        break;
      case 1:
        schema = schedulingSchema;
        data = {
          event_days: store.event_days,
          location_postcode: store.location_postcode,
          location_address: store.location_address || null,
          location_what3words: store.location_what3words || null,
          location_lat: store.location_lat,
          location_lng: store.location_lng,
          location_display: store.location_display || null,
          quote_deadline: store.quote_deadline,
        };
        break;
      case 2:
        schema = staffingSchema;
        data = {
          staffing_requirements: store.staffing_requirements.map((r) => ({
            ...r,
            role: r.role || undefined,
            event_day_id: r.event_day_id || null,
            additional_notes: r.additional_notes || null,
          })),
          equipment_required: store.equipment_required,
          budget_min: store.budget_min,
          budget_max: store.budget_max,
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
        event_name: store.event_name,
        event_type: store.event_type,
        event_description: store.event_description || null,
        special_requirements: store.special_requirements || null,
        indoor_outdoor: store.indoor_outdoor,
        expected_attendance: store.expected_attendance,
        event_days: store.event_days,
        location_postcode: store.location_postcode,
        location_address: store.location_address || null,
        location_what3words: store.location_what3words || null,
        location_lat: store.location_lat,
        location_lng: store.location_lng,
        location_display: store.location_display || null,
        quote_deadline: store.quote_deadline,
        staffing_requirements: store.staffing_requirements.map((r) => ({
          ...r,
          role: r.role || undefined,
          event_day_id: r.event_day_id || null,
          additional_notes: r.additional_notes || null,
        })),
        equipment_required: store.equipment_required,
        budget_min: store.budget_min,
        budget_max: store.budget_max,
        save_as_draft: saveAsDraft,
      };

      const url = store.draftId
        ? `/api/marketplace/events/${store.draftId}`
        : '/api/marketplace/events';
      const method = store.draftId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        store.setError(data.error || 'Failed to save event');
        return;
      }

      store.reset();
      router.push('/my-events');
    } catch {
      store.setError('An unexpected error occurred');
    } finally {
      store.setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Post an Event</h1>

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
              <span className={`ml-2 text-sm ${index <= store.currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                {step}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`mx-4 h-0.5 w-12 ${index < store.currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
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
        {store.currentStep === 0 && <BasicInfoStep errors={errors} />}
        {store.currentStep === 1 && <ScheduleLocationStep errors={errors} />}
        {store.currentStep === 2 && <StaffingEquipmentStep errors={errors} />}
        {store.currentStep === 3 && <ReviewStep />}
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
          {store.currentStep < 3 ? (
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
                {store.isSubmitting ? 'Publishing...' : 'Publish Event'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
