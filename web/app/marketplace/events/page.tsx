'use client';

import { useEffect, useState, useCallback } from 'react';
import Script from 'next/script';
import { useMarketplaceEvents, type EventFilterParams } from '@/lib/queries/marketplace/events';
import EventListRow from '@/components/marketplace/events/EventListRow';
import EventFilters from '@/components/marketplace/events/EventFilters';
import EventMap from '@/components/marketplace/events/EventMap';

type ViewMode = 'list' | 'map';

export default function BrowseEventsPage() {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [filters, setFilters] = useState<EventFilterParams>({
    status: 'open',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useMarketplaceEvents(filters);

  // Detect user type and set up location
  useEffect(() => {
    const detectUserType = async () => {
      try {
        const res = await fetch('/api/marketplace/register?check=true');
        const data = await res.json();
        if (data.registration?.company_type === 'company') {
          setIsCompanyOwner(true);
        } else if (data.registration?.company_type === 'individual') {
          setIsCompanyOwner(false);
          // For individual medics, try to get their profile postcode location
          if (data.registration?.service_area_lat && data.registration?.service_area_lng) {
            setUserLat(data.registration.service_area_lat);
            setUserLng(data.registration.service_area_lng);
            setFilters((prev) => ({
              ...prev,
              lat: data.registration.service_area_lat,
              lng: data.registration.service_area_lng,
              radius_miles: 50,
            }));
          }
        }
      } catch {
        // Non-blocking — default to showing all events
      }
    };
    detectUserType();
  }, []);

  const handleFilterChange = useCallback((updates: Partial<EventFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
  }, []);

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const events = data?.events || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (filters.limit || 20));

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`}
        onLoad={() => setGoogleMapsLoaded(true)}
      />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Browse Events</h1>
          <div className="flex items-center gap-1 rounded-md border border-gray-300 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <EventFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            isCompanyOwner={isCompanyOwner}
            googleMapsLoaded={googleMapsLoaded}
          />
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">
          {isLoading ? (
            'Searching...'
          ) : (
            <>
              <span className="font-medium text-gray-700">{total}</span> event{total !== 1 ? 's' : ''} found
              {filters.radius_miles && filters.lat ? ` within ${filters.radius_miles} miles` : ''}
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">Failed to load events. Please try again.</p>
          </div>
        )}

        {/* Content */}
        {viewMode === 'list' ? (
          <>
            {/* Loading skeleton */}
            {isLoading && (
              <div className="border rounded-lg divide-y">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-4 py-3 animate-pulse">
                    <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-1/3 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && events.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-500">
                  No events match your filters. Try widening your search area or adjusting filters.
                </p>
              </div>
            )}

            {/* Event list */}
            {!isLoading && events.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                {/* Header row */}
                <div className="bg-gray-50 px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-500">
                  <div className="col-span-3">Event</div>
                  <div className="col-span-2">Date(s)</div>
                  <div className="col-span-2">Staffing</div>
                  <div className="col-span-1">Budget</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-1">Deadline</div>
                  <div className="col-span-1 text-right">Quotes</div>
                </div>
                <div className="divide-y">
                  {events.map((event) => (
                    <EventListRow
                      key={event.id}
                      event={event}
                      userLat={userLat}
                      userLng={userLng}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={(filters.page || 1) <= 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {filters.page || 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={(filters.page || 1) >= totalPages}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          /* Map view */
          <div className="rounded-lg border overflow-hidden" style={{ minHeight: 500 }}>
            {googleMapsLoaded ? (
              <EventMap
                events={events}
                center={
                  filters.lat && filters.lng
                    ? { lat: filters.lat, lng: filters.lng }
                    : { lat: 53.5, lng: -2.0 } // Default: center of UK
                }
                radiusMiles={filters.radius_miles}
              />
            ) : (
              <div className="flex items-center justify-center h-96 bg-gray-50">
                <p className="text-sm text-gray-400">Loading map...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
