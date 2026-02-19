'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMarketplaceEvent } from '@/lib/queries/marketplace/events';
import {
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  STAFFING_ROLE_LABELS,
  EQUIPMENT_TYPE_LABELS,
  INDOOR_OUTDOOR_LABELS,
} from '@/lib/marketplace/event-types';
import type { EventDay, EventStaffingRequirement } from '@/lib/marketplace/event-types';

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  awarded: 'bg-blue-100 text-blue-700',
};

function deadlineCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Quotes closed';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `Quotes due in ${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `Quotes due in ${days} day${days !== 1 ? 's' : ''}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data, isLoading, error } = useMarketplaceEvent(eventId);
  const event = data?.event;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">Event not found or could not be loaded.</p>
          <Link href="/marketplace/events" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            Back to Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const isPastDeadline = new Date(event.quote_deadline) < new Date();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <Link href="/marketplace/events" className="text-blue-600 hover:text-blue-800">
          Browse Events
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">{event.event_name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.event_name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[event.status] || ''}`}>
            {EVENT_STATUS_LABELS[event.status]}
          </span>
          <span className="text-sm text-gray-500">|</span>
          <span className={`text-sm ${isPastDeadline ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {deadlineCountdown(event.quote_deadline)}
          </span>
          <span className="text-sm text-gray-500">|</span>
          <span className="text-sm text-gray-600">{event.quote_count} quote{event.quote_count !== 1 ? 's' : ''} received</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* About */}
        <section className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
          <div className="space-y-3 text-sm">
            {event.event_description && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-0.5">Description</dt>
                <dd className="text-gray-700 whitespace-pre-wrap">{event.event_description}</dd>
              </div>
            )}
            <div className="flex flex-wrap gap-6">
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-0.5">Setting</dt>
                <dd>{INDOOR_OUTDOOR_LABELS[event.indoor_outdoor]}</dd>
              </div>
              {event.expected_attendance && (
                <div>
                  <dt className="text-gray-500 text-xs font-medium mb-0.5">Expected Attendance</dt>
                  <dd>{event.expected_attendance.toLocaleString()}</dd>
                </div>
              )}
            </div>
            {event.special_requirements && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-0.5">Special Requirements</dt>
                <dd className="text-gray-700">{event.special_requirements}</dd>
              </div>
            )}
          </div>
        </section>

        {/* Schedule */}
        <section className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Schedule</h2>
          {event.event_days.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Start</th>
                  <th className="pb-2 font-medium">End</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {event.event_days
                  .sort((a: EventDay, b: EventDay) => a.sort_order - b.sort_order)
                  .map((day: EventDay) => (
                    <tr key={day.id}>
                      <td className="py-2">{formatDate(day.event_date)}</td>
                      <td className="py-2 text-gray-600">{day.start_time}</td>
                      <td className="py-2 text-gray-600">{day.end_time}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400">No schedule details provided.</p>
          )}
        </section>

        {/* Location — approximate only */}
        <section className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
          <div className="text-sm">
            <p className="text-gray-700 font-medium">
              {event.location_display || event.location_postcode?.slice(0, -3).trim() || 'Location not specified'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Exact address provided after you submit a quote
            </p>
          </div>
        </section>

        {/* Staffing Requirements */}
        <section className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Staffing Requirements</h2>
          {event.event_staffing_requirements.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs">
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium">Days</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {event.event_staffing_requirements.map((req: EventStaffingRequirement) => (
                  <tr key={req.id}>
                    <td className="py-2">{STAFFING_ROLE_LABELS[req.role] || req.role}</td>
                    <td className="py-2">{req.quantity}</td>
                    <td className="py-2 text-gray-600">
                      {req.event_day_id
                        ? formatDate(event.event_days.find((d: EventDay) => d.id === req.event_day_id)?.event_date || '')
                        : 'All days'}
                    </td>
                    <td className="py-2 text-gray-400">{req.additional_notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400">No staffing requirements specified.</p>
          )}
        </section>

        {/* Equipment */}
        {event.equipment_required && event.equipment_required.length > 0 && (
          <section className="border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Equipment Required</h2>
            <ul className="space-y-1 text-sm">
              {event.equipment_required.map((eq, i) => (
                <li key={i}>
                  <span className="text-gray-700">{EQUIPMENT_TYPE_LABELS[eq.type] || eq.type}</span>
                  {eq.notes && <span className="text-gray-400 ml-1">— {eq.notes}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Budget */}
        <section className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Budget</h2>
          <p className="text-sm">
            {event.budget_min || event.budget_max ? (
              <span className="text-gray-700">
                £{event.budget_min?.toLocaleString() || '0'} - £{event.budget_max?.toLocaleString() || 'Open'}
              </span>
            ) : (
              <span className="text-gray-400">No budget specified</span>
            )}
          </p>
        </section>
      </div>

      {/* Action bar */}
      <div className="mt-8 flex items-center gap-3">
        {event.status === 'open' && !isPastDeadline ? (
          <Link
            href={`/marketplace/events/${eventId}/quote`}
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Submit a Quote
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
            title={isPastDeadline ? 'Quote deadline has passed' : 'Event is not open'}
          >
            Submit a Quote
          </button>
        )}
      </div>
    </div>
  );
}
