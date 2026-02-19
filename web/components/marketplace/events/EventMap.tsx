'use client';

import { useEffect, useRef, useState } from 'react';
import type { MarketplaceEventWithDetails } from '@/lib/marketplace/event-types';
import { EVENT_TYPE_LABELS } from '@/lib/marketplace/event-types';

interface EventMapProps {
  events: MarketplaceEventWithDetails[];
  center: { lat: number; lng: number };
  radiusMiles?: number;
}

export default function EventMap({ events, center, radiusMiles }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindowRef.current = new google.maps.InfoWindow();
    setMapReady(true);

    return () => {
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      circleRef.current?.setMap(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when events change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasMarkers = false;

    events.forEach((event) => {
      const coords = event.location_coordinates as { lat?: number; lng?: number } | null;
      if (!coords?.lat || !coords?.lng) return;

      const position = { lat: coords.lat, lng: coords.lng };

      // Use standard Marker as fallback if AdvancedMarkerElement unavailable
      let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
      if (google.maps.marker?.AdvancedMarkerElement) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current!,
          position,
          title: event.event_name,
        });
      } else {
        marker = new google.maps.Marker({
          map: mapInstanceRef.current!,
          position,
          title: event.event_name,
        });
      }

      // InfoWindow content
      const content = `
        <div style="max-width:220px;font-family:system-ui,sans-serif">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(event.event_name)}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${EVENT_TYPE_LABELS[event.event_type] || event.event_type}</div>
          ${event.event_days.length > 0 ? `<div style="font-size:12px;color:#6b7280">${new Date(event.event_days[0].event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${event.event_days.length > 1 ? ` (+${event.event_days.length - 1} more days)` : ''}</div>` : ''}
          <div style="margin-top:6px">
            <a href="/marketplace/events/${event.id}" style="font-size:12px;color:#2563eb;text-decoration:none">View Details →</a>
          </div>
        </div>
      `;

      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(content);
        if (marker instanceof google.maps.Marker) {
          infoWindowRef.current?.open(mapInstanceRef.current!, marker);
        } else {
          infoWindowRef.current?.open({
            map: mapInstanceRef.current!,
            anchor: marker as google.maps.marker.AdvancedMarkerElement,
          });
        }
      });

      markersRef.current.push(marker as google.maps.marker.AdvancedMarkerElement);
      bounds.extend(position);
      hasMarkers = true;
    });

    if (hasMarkers) {
      mapInstanceRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    } else {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(7);
    }
  }, [events, mapReady, center]);

  // Radius circle overlay
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    circleRef.current?.setMap(null);
    circleRef.current = null;

    if (radiusMiles && center.lat && center.lng) {
      circleRef.current = new google.maps.Circle({
        map: mapInstanceRef.current,
        center,
        radius: radiusMiles * 1609.34,
        fillColor: '#3b82f6',
        fillOpacity: 0.06,
        strokeColor: '#3b82f6',
        strokeWeight: 1,
        strokeOpacity: 0.3,
      });
    }
  }, [radiusMiles, center, mapReady]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: 500 }} />;
}

function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}
