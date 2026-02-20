'use client';

/**
 * Step 3: Schedule & Location
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * Collects multi-day schedule, postcode, address, what3words, and display location.
 * No quote_deadline field — direct jobs don't need one.
 * Mirrors ScheduleLocationStep.tsx from the marketplace event wizard.
 */

import { useDirectJobStore } from '@/stores/useDirectJobStore';

interface Props {
  errors?: Record<string, string[] | undefined>;
}

export default function JobScheduleStep({ errors }: Props) {
  const store = useDirectJobStore();

  return (
    <div className="space-y-8">
      {/* Job Days */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Job Days <span className="text-red-500">*</span>
        </h3>
        <div className="space-y-3">
          {store.event_days.map((day, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  value={day.event_date}
                  onChange={(e) => store.updateEventDay(index, 'event_date', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                <input
                  type="time"
                  value={day.start_time}
                  onChange={(e) => store.updateEventDay(index, 'start_time', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">End Time</label>
                <input
                  type="time"
                  value={day.end_time}
                  onChange={(e) => store.updateEventDay(index, 'end_time', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              {store.event_days.length > 1 && (
                <button
                  type="button"
                  onClick={() => store.removeEventDay(index)}
                  className="mt-5 text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {errors?.event_days && (
            <p className="text-sm text-red-600">{errors.event_days[0]}</p>
          )}
        </div>
        <button
          type="button"
          onClick={store.addEventDay}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add another day
        </button>
      </div>

      {/* Location */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Location</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="location_postcode" className="block text-xs text-gray-500 mb-1">
              Postcode <span className="text-red-500">*</span>
            </label>
            <input
              id="location_postcode"
              type="text"
              value={store.location_postcode}
              onChange={(e) => store.updateField('location_postcode', e.target.value.toUpperCase())}
              className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. SW1A 1AA"
            />
            {errors?.location_postcode && (
              <p className="mt-1 text-sm text-red-600">{errors.location_postcode[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="location_address" className="block text-xs text-gray-500 mb-1">
              Address
            </label>
            <input
              id="location_address"
              type="text"
              value={store.location_address}
              onChange={(e) => store.updateField('location_address', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Full address of the job site"
            />
          </div>

          <div>
            <label htmlFor="location_what3words" className="block text-xs text-gray-500 mb-1">
              what3words (optional)
            </label>
            <input
              id="location_what3words"
              type="text"
              value={store.location_what3words}
              onChange={(e) => store.updateField('location_what3words', e.target.value)}
              className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. ///filled.count.soap"
            />
            <p className="mt-1 text-xs text-gray-400">
              For remote locations like fields or festival sites, use what3words or drop a pin
            </p>
          </div>

          <div>
            <label htmlFor="location_display" className="block text-xs text-gray-500 mb-1">
              Display Location
            </label>
            <input
              id="location_display"
              type="text"
              value={store.location_display}
              onChange={(e) => store.updateField('location_display', e.target.value)}
              className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Central London, SW1"
            />
            <p className="mt-1 text-xs text-gray-400">
              Short description of the area for quick reference
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
