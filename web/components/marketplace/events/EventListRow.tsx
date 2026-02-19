'use client';

import Link from 'next/link';
import type { MarketplaceEventWithDetails } from '@/lib/marketplace/event-types';
import { EVENT_TYPE_LABELS, STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';

interface EventListRowProps {
  event: MarketplaceEventWithDetails;
  userLat?: number | null;
  userLng?: number | null;
}

/** Haversine distance in miles between two lat/lng pairs */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Relative deadline text */
function deadlineText(deadline: string): { text: string; urgent: boolean } {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: 'Closed', urgent: true };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return { text: `${hours}h left`, urgent: true };
  const days = Math.floor(hours / 24);
  return { text: `${days}d left`, urgent: days <= 2 };
}

/** Format date range for event days */
function formatDateRange(days: MarketplaceEventWithDetails['event_days']): string {
  if (days.length === 0) return '-';
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (days.length === 1) return fmt(days[0].event_date);
  return `${fmt(days[0].event_date)} - ${fmt(days[days.length - 1].event_date)}`;
}

/** Compact staffing summary: "2× Paramedic, 1× EMT" */
function staffingSummary(reqs: MarketplaceEventWithDetails['event_staffing_requirements']): string {
  if (reqs.length === 0) return '-';
  const summary = reqs
    .slice(0, 3)
    .map((r) => `${r.quantity}× ${STAFFING_ROLE_LABELS[r.role] || r.role}`)
    .join(', ');
  return reqs.length > 3 ? `${summary} +${reqs.length - 3} more` : summary;
}

export default function EventListRow({ event, userLat, userLng }: EventListRowProps) {
  const dl = deadlineText(event.quote_deadline);

  // Extract lat/lng from location_coordinates if available (API returns as object)
  let distance: number | null = null;
  if (userLat != null && userLng != null && event.location_coordinates) {
    const coords = event.location_coordinates as { lat?: number; lng?: number };
    if (coords.lat && coords.lng) {
      distance = Math.round(haversineDistance(userLat, userLng, coords.lat, coords.lng));
    }
  }

  return (
    <Link
      href={`/marketplace/events/${event.id}`}
      className="block hover:bg-gray-50 transition-colors"
    >
      <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm">
        {/* Event name + type — 3 cols */}
        <div className="col-span-3">
          <span className="font-medium text-gray-900 block truncate">{event.event_name}</span>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 mt-0.5">
            {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
          </span>
        </div>

        {/* Dates — 2 cols */}
        <div className="col-span-2 text-gray-600">
          {formatDateRange(event.event_days)}
          {event.event_days.length > 1 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {event.event_days.length}d
            </span>
          )}
        </div>

        {/* Staffing — 2 cols */}
        <div className="col-span-2 text-gray-600 truncate" title={staffingSummary(event.event_staffing_requirements)}>
          {staffingSummary(event.event_staffing_requirements)}
        </div>

        {/* Budget — 1 col */}
        <div className="col-span-1 text-gray-600">
          {event.budget_min || event.budget_max ? (
            <span>
              £{event.budget_min?.toLocaleString() || '0'} - £{event.budget_max?.toLocaleString() || '?'}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>

        {/* Location + distance — 2 cols */}
        <div className="col-span-2 text-gray-600">
          <span className="block truncate">{event.location_display || event.location_postcode?.slice(0, -3) + '...' || '-'}</span>
          {distance !== null && (
            <span className="text-xs text-gray-400">~{distance} mi</span>
          )}
        </div>

        {/* Deadline — 1 col */}
        <div className="col-span-1">
          <span className={dl.urgent ? 'text-red-600 font-medium' : 'text-gray-600'}>{dl.text}</span>
        </div>

        {/* Quotes — 1 col */}
        <div className="col-span-1 text-right">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {event.quote_count} {event.quote_count === 1 ? 'quote' : 'quotes'}
          </span>
        </div>
      </div>
    </Link>
  );
}
