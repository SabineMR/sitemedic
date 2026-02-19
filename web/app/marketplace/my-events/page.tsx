'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { MarketplaceEventWithDetails, EventStatus } from '@/lib/marketplace/event-types';
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from '@/lib/marketplace/event-types';

const STATUS_COLOURS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  awarded: 'bg-blue-100 text-blue-700',
};

export default function MyEventsPage() {
  const [events, setEvents] = useState<MarketplaceEventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'close' | 'cancel' } | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/marketplace/events?posted_by=me');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter !== 'all' && event.status !== statusFilter) return false;
      if (searchTerm && !event.event_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [events, statusFilter, searchTerm]);

  const handleCloseCancel = async (eventId: string, action: 'close' | 'cancel') => {
    setActionLoading(eventId);
    try {
      const res = await fetch(`/api/marketplace/events/${eventId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchEvents();
      }
    } catch (error) {
      console.error(`Failed to ${action} event:`, error);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handlePublish = async (eventId: string) => {
    setActionLoading(eventId);
    try {
      const res = await fetch(`/api/marketplace/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });
      if (res.ok) {
        await fetchEvents();
      }
    } catch (error) {
      console.error('Failed to publish event:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isDeadlinePast = (deadline: string) => new Date(deadline) < new Date();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
        <Link
          href="/marketplace/events/create"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Post New Event
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by event name..."
          className="flex-1 max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">
              {confirmAction.action === 'cancel' ? 'Cancel Event?' : 'Close Event?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction.action === 'cancel'
                ? 'This will cancel the event. Medics who have quoted will be notified.'
                : 'This will close the event to new quotes.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
              >
                Go Back
              </button>
              <button
                onClick={() => handleCloseCancel(confirmAction.id, confirmAction.action)}
                disabled={actionLoading === confirmAction.id}
                className={`rounded-md px-4 py-2 text-sm text-white ${
                  confirmAction.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
                } disabled:opacity-50`}
              >
                {actionLoading === confirmAction.id ? 'Processing...' : `Yes, ${confirmAction.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && !loading && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-4">
            {events.length === 0
              ? "You haven't posted any events yet. Post your first event to find medical cover."
              : 'No events match your filters.'}
          </p>
          {events.length === 0 && (
            <Link
              href="/marketplace/events/create"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Post Your First Event
            </Link>
          )}
        </div>
      )}

      {/* Events Table */}
      {filteredEvents.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Event</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date(s)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Quotes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Deadline</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{event.event_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {event.event_days.length > 0
                      ? event.event_days.length === 1
                        ? formatDate(event.event_days[0].event_date)
                        : `${formatDate(event.event_days[0].event_date)} - ${formatDate(event.event_days[event.event_days.length - 1].event_date)}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[event.status]}`}>
                      {EVENT_STATUS_LABELS[event.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.quote_count} quotes</td>
                  <td className="px-4 py-3">
                    <span className={isDeadlinePast(event.quote_deadline) ? 'text-red-600' : 'text-gray-600'}>
                      {formatDate(event.quote_deadline)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {event.status === 'draft' && (
                        <>
                          <Link
                            href={`/marketplace/events/${event.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handlePublish(event.id)}
                            disabled={actionLoading === event.id}
                            className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50"
                          >
                            Publish
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: event.id, action: 'cancel' })}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {event.status === 'open' && (
                        <>
                          <Link
                            href={`/marketplace/events/${event.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setConfirmAction({ id: event.id, action: 'close' })}
                            className="text-yellow-600 hover:text-yellow-800 text-xs"
                          >
                            Close
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: event.id, action: 'cancel' })}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {['closed', 'cancelled', 'awarded'].includes(event.status) && (
                        <Link
                          href={`/marketplace/events/${event.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
