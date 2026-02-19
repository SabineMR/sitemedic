'use client';

import { useEffect, useRef, useState } from 'react';
import { EVENT_TYPE_LABELS, STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import type { EventFilterParams } from '@/lib/queries/marketplace/events';

const UK_REGIONS: { label: string; lat: number; lng: number }[] = [
  { label: 'London', lat: 51.5074, lng: -0.1278 },
  { label: 'South East', lat: 51.3, lng: 0.5 },
  { label: 'South West', lat: 50.95, lng: -3.2 },
  { label: 'East of England', lat: 52.2, lng: 0.9 },
  { label: 'East Midlands', lat: 52.83, lng: -1.33 },
  { label: 'West Midlands', lat: 52.48, lng: -1.9 },
  { label: 'Yorkshire', lat: 53.8, lng: -1.55 },
  { label: 'North West', lat: 53.5, lng: -2.6 },
  { label: 'North East', lat: 54.97, lng: -1.61 },
  { label: 'Scotland', lat: 56.49, lng: -4.2 },
  { label: 'Wales', lat: 52.13, lng: -3.78 },
  { label: 'Northern Ireland', lat: 54.6, lng: -6.65 },
];

const RADIUS_OPTIONS = [10, 25, 50, 75, 100, 150];

interface EventFiltersProps {
  filters: EventFilterParams;
  onFilterChange: (updates: Partial<EventFilterParams>) => void;
  isCompanyOwner: boolean;
  googleMapsLoaded: boolean;
}

export default function EventFilters({
  filters,
  onFilterChange,
  isCompanyOwner,
  googleMapsLoaded,
}: EventFiltersProps) {
  const placeInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [region, setRegion] = useState('');

  // Initialize Google Places Autocomplete for company owner area search
  useEffect(() => {
    if (!isCompanyOwner || !googleMapsLoaded || !placeInputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(placeInputRef.current, {
      componentRestrictions: { country: 'gb' },
      types: ['(cities)'],
      fields: ['geometry', 'name'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        onFilterChange({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          radius_miles: filters.radius_miles || 50,
        });
      }
    });
  }, [isCompanyOwner, googleMapsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegionChange = (value: string) => {
    setRegion(value);
    if (!value) {
      onFilterChange({ lat: undefined, lng: undefined, radius_miles: undefined });
      return;
    }
    const r = UK_REGIONS.find((reg) => reg.label === value);
    if (r) {
      onFilterChange({ lat: r.lat, lng: r.lng, radius_miles: 100 });
    }
  };

  const handleClearFilters = () => {
    setRegion('');
    if (placeInputRef.current) placeInputRef.current.value = '';
    onFilterChange({
      event_type: undefined,
      role: undefined,
      date_from: undefined,
      date_to: undefined,
      lat: undefined,
      lng: undefined,
      radius_miles: undefined,
    });
  };

  return (
    <div className="space-y-3">
      {/* Location search row */}
      <div className="flex flex-wrap gap-3">
        {isCompanyOwner ? (
          <>
            {/* Area search — Google Places Autocomplete */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search area</label>
              <input
                ref={placeInputRef}
                type="text"
                placeholder="City or town name..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* UK Region dropdown */}
            <div className="w-48">
              <label className="block text-xs font-medium text-gray-500 mb-1">UK Region</label>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All regions</option>
                {UK_REGIONS.map((r) => (
                  <option key={r.label} value={r.label}>{r.label}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Near me radius search for individual medics */}
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Near me</label>
                <span className="text-sm text-gray-600">
                  {filters.lat && filters.lng ? 'Using your location' : 'Location not set'}
                </span>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-500 mb-1">Radius</label>
                <select
                  value={filters.radius_miles || 50}
                  onChange={(e) => onFilterChange({ radius_miles: parseInt(e.target.value) })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {RADIUS_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r} miles</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Common filters row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Event type */}
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">Event type</label>
          <select
            value={filters.event_type || ''}
            onChange={(e) => onFilterChange({ event_type: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Qualification / role */}
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Role needed</label>
          <select
            value={filters.role || ''}
            onChange={(e) => onFilterChange({ role: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Any role</option>
            {Object.entries(STAFFING_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => onFilterChange({ date_from: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Date to */}
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => onFilterChange({ date_to: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Clear */}
        <button
          type="button"
          onClick={handleClearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 pb-2"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
