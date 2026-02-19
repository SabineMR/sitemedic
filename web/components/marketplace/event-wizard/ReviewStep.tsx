'use client';

import { useEventPostingStore } from '@/stores/useEventPostingStore';
import {
  EVENT_TYPE_LABELS,
  STAFFING_ROLE_LABELS,
  EQUIPMENT_TYPE_LABELS,
  INDOOR_OUTDOOR_LABELS,
} from '@/lib/marketplace/event-types';

export default function ReviewStep() {
  const store = useEventPostingStore();

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Review your event details below. Click &quot;Edit&quot; on any section to make changes.
      </p>

      {/* Basic Info */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Basic Info</h3>
          <button
            type="button"
            onClick={() => store.setStep(0)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Event Name</dt>
          <dd>{store.event_name || '-'}</dd>
          <dt className="text-gray-500">Type</dt>
          <dd>
            {store.event_type ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {EVENT_TYPE_LABELS[store.event_type] || store.event_type}
              </span>
            ) : '-'}
          </dd>
          <dt className="text-gray-500">Setting</dt>
          <dd>{INDOOR_OUTDOOR_LABELS[store.indoor_outdoor]}</dd>
          {store.expected_attendance && (
            <>
              <dt className="text-gray-500">Attendance</dt>
              <dd>{store.expected_attendance.toLocaleString()}</dd>
            </>
          )}
        </dl>
        {store.event_description && (
          <div className="mt-2">
            <dt className="text-xs text-gray-500">Description</dt>
            <dd className="text-sm mt-0.5">{store.event_description}</dd>
          </div>
        )}
        {store.special_requirements && (
          <div className="mt-2">
            <dt className="text-xs text-gray-500">Special Requirements</dt>
            <dd className="text-sm mt-0.5">{store.special_requirements}</dd>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Schedule & Location</h3>
          <button
            type="button"
            onClick={() => store.setStep(1)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-500">Days:</span>
            <ul className="mt-1 space-y-1">
              {store.event_days.map((day, i) => (
                <li key={i}>
                  {day.event_date
                    ? new Date(day.event_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                    : `Day ${i + 1}`}
                  {day.start_time && day.end_time && ` (${day.start_time} - ${day.end_time})`}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-gray-500">Location:</span>{' '}
            {store.location_display || store.location_postcode || '-'}
            {store.location_address && <span className="text-gray-400 ml-1">({store.location_address})</span>}
          </div>
          {store.location_what3words && (
            <div>
              <span className="text-gray-500">what3words:</span>{' '}
              {store.location_what3words}
            </div>
          )}
          <div>
            <span className="text-gray-500">Quote Deadline:</span>{' '}
            {store.quote_deadline
              ? new Date(store.quote_deadline).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '-'}
          </div>
        </div>
      </div>

      {/* Staffing & Equipment */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Staffing & Equipment</h3>
          <button
            type="button"
            onClick={() => store.setStep(2)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Staffing:</span>
            <table className="mt-1 w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs">
                  <th className="pb-1">Role</th>
                  <th className="pb-1">Qty</th>
                  <th className="pb-1">Days</th>
                  <th className="pb-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {store.staffing_requirements.map((req, i) => (
                  <tr key={i}>
                    <td>{req.role ? STAFFING_ROLE_LABELS[req.role] : '-'}</td>
                    <td>{req.quantity}</td>
                    <td>{req.event_day_id ? 'Specific day' : 'All days'}</td>
                    <td className="text-gray-400">{req.additional_notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {store.equipment_required.length > 0 && (
            <div>
              <span className="text-gray-500">Equipment:</span>
              <ul className="mt-1 space-y-0.5">
                {store.equipment_required.map((eq) => (
                  <li key={eq.type}>
                    {EQUIPMENT_TYPE_LABELS[eq.type]}
                    {eq.notes && <span className="text-gray-400 ml-1">- {eq.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <span className="text-gray-500">Budget:</span>{' '}
            {store.budget_min || store.budget_max
              ? `£${store.budget_min?.toLocaleString() || '0'} - £${store.budget_max?.toLocaleString() || 'Open'}`
              : 'Not specified'}
          </div>
        </div>
      </div>
    </div>
  );
}
