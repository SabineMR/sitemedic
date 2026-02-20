'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MarketplaceEventWithDetails } from '@/lib/marketplace/event-types';
import { useEventPostingStore } from '@/stores/useEventPostingStore';
import BasicInfoStep from '@/components/marketplace/event-wizard/BasicInfoStep';
import ScheduleLocationStep from '@/components/marketplace/event-wizard/ScheduleLocationStep';
import StaffingEquipmentStep from '@/components/marketplace/event-wizard/StaffingEquipmentStep';
import ReviewStep from '@/components/marketplace/event-wizard/ReviewStep';
import { basicInfoSchema, schedulingSchema, staffingSchema } from '@/lib/marketplace/event-schemas';

const STEPS = ['Basic Info', 'Schedule & Location', 'Staffing & Equipment', 'Review'];

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const store = useEventPostingStore();
  const [event, setEvent] = useState<MarketplaceEventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  // Post-quote restricted fields
  const [description, setDescription] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/marketplace/events/${params.id}`);
        const data = await res.json();
        if (data.event) {
          setEvent(data.event);
          if (!data.event.has_quotes) {
            store.loadDraft(data.event);
          } else {
            setDescription(data.event.event_description || '');
            setSpecialRequirements(data.event.special_requirements || '');
          }
        }
      } catch {
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
    return () => { store.reset(); };
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSavePreQuotes = async () => {
    setSaving(true);
    setError(null);
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
      };

      const res = await fetch(`/api/marketplace/events/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        return;
      }

      router.push('/my-events');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePostQuotes = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/events/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_description: description || null,
          special_requirements: specialRequirements || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        return;
      }

      router.push('/my-events');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">Event not found.</p>
          <Link href="/my-events" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            Back to My Events
          </Link>
        </div>
      </div>
    );
  }

  // Post-quote restricted editing
  if (event.has_quotes) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Event</h1>
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 mb-6">
          <p className="text-sm text-blue-700">
            Some fields cannot be edited because quotes have been received. You can still update the description and special requirements.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2">{event.event_name}</h3>
            <p className="text-sm text-gray-500">These fields are locked because quotes have been received.</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="special_requirements" className="block text-sm font-medium text-gray-700 mb-1">
              Special Requirements
            </label>
            <textarea
              id="special_requirements"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePostQuotes}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/my-events" className="text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pre-quote full editing (wizard)
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Event</h1>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${index <= store.currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${index <= store.currentStep ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
              {index < STEPS.length - 1 && <div className={`mx-4 h-0.5 w-12 ${index < store.currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        {store.currentStep === 0 && <BasicInfoStep errors={errors} />}
        {store.currentStep === 1 && <ScheduleLocationStep errors={errors} />}
        {store.currentStep === 2 && <StaffingEquipmentStep errors={errors} />}
        {store.currentStep === 3 && <ReviewStep />}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {store.currentStep > 0 && (
            <button type="button" onClick={() => { setErrors({}); store.setStep(store.currentStep - 1); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Previous
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {store.currentStep < 3 ? (
            <button type="button" onClick={() => { if (validateCurrentStep()) store.setStep(store.currentStep + 1); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Next
            </button>
          ) : (
            <>
              <button onClick={handleSavePreQuotes} disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/my-events" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
