'use client';

import { useEventPostingStore } from '@/stores/useEventPostingStore';
import { EVENT_TYPE_LABELS, INDOOR_OUTDOOR_LABELS } from '@/lib/marketplace/event-types';
import type { EventType, IndoorOutdoor } from '@/lib/marketplace/event-types';

interface Props {
  errors?: Record<string, string[] | undefined>;
}

export default function BasicInfoStep({ errors }: Props) {
  const store = useEventPostingStore();

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-1">
          Event Name <span className="text-red-500">*</span>
        </label>
        <input
          id="event_name"
          type="text"
          value={store.event_name}
          onChange={(e) => store.updateField('event_name', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Summer Music Festival 2026"
        />
        {errors?.event_name && (
          <p className="mt-1 text-sm text-red-600">{errors.event_name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
          Event Type <span className="text-red-500">*</span>
        </label>
        <select
          id="event_type"
          value={store.event_type}
          onChange={(e) => store.updateField('event_type', e.target.value as EventType)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select event type...</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors?.event_type && (
          <p className="mt-1 text-sm text-red-600">{errors.event_type[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="event_description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="event_description"
          value={store.event_description}
          onChange={(e) => store.updateField('event_description', e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Describe your event and what medical cover you need..."
        />
      </div>

      <div>
        <label htmlFor="special_requirements" className="block text-sm font-medium text-gray-700 mb-1">
          Special Requirements
        </label>
        <textarea
          id="special_requirements"
          value={store.special_requirements}
          onChange={(e) => store.updateField('special_requirements', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Any specific requirements, certifications, or equipment needs..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Setting <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          {Object.entries(INDOOR_OUTDOOR_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="indoor_outdoor"
                value={value}
                checked={store.indoor_outdoor === value}
                onChange={() => store.updateField('indoor_outdoor', value as IndoorOutdoor)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="expected_attendance" className="block text-sm font-medium text-gray-700 mb-1">
          Expected Attendance
        </label>
        <input
          id="expected_attendance"
          type="number"
          value={store.expected_attendance ?? ''}
          onChange={(e) => store.updateField('expected_attendance', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. 5000"
          min={1}
        />
      </div>
    </div>
  );
}
