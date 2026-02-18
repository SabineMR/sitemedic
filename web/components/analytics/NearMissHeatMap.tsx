/**
 * Near-Miss Heat Map Component
 *
 * Displays near-miss incidents as CircleMarkers on a Leaflet map, colour-coded
 * and scaled by severity. Designed for org-level site managers to identify
 * geographic clusters of incidents for targeted safety interventions.
 *
 * Severity colour coding:
 *   low      = blue   (#3B82F6) radius 6
 *   medium   = amber  (#F59E0B) radius 10
 *   high     = red    (#EF4444) radius 14
 *   critical = purple (#7C3AED) radius 18
 *
 * Map: UK-centred (54.0, -2.5) zoom 6, auto-fits to data if present.
 * SSR: This component uses leaflet — always import via dynamic({ ssr: false }).
 */

'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNearMissGeoData, NearMissGeoPoint } from '@/lib/queries/analytics/near-miss-geo';

// =============================================================================
// SEVERITY CONFIG
// =============================================================================

const SEVERITY_RADIUS: Record<NearMissGeoPoint['severity'], number> = {
  low: 6,
  medium: 10,
  high: 14,
  critical: 18,
};

const SEVERITY_COLOR: Record<NearMissGeoPoint['severity'], string> = {
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7C3AED',
};

const SEVERITY_LABEL: Record<NearMissGeoPoint['severity'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

// =============================================================================
// MAP BOUNDS ADJUSTER
// =============================================================================

/**
 * MapBoundsAdjuster
 *
 * If GPS points exist, fits the map to show all markers.
 * Falls back to UK centre view when no data is present.
 */
function MapBoundsAdjuster({ points }: { points: NearMissGeoPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView([54.0, -2.5], 6);
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => [p.gps_lat, p.gps_lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [points, map]);

  return null;
}

// =============================================================================
// SEVERITY LEGEND
// =============================================================================

function SeverityLegend() {
  const severities: NearMissGeoPoint['severity'][] = ['low', 'medium', 'high', 'critical'];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        padding: '12px 14px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        zIndex: 1000,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Severity
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {severities.map((sev) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: `${SEVERITY_RADIUS[sev] * 2}px`,
                height: `${SEVERITY_RADIUS[sev] * 2}px`,
                minWidth: `${SEVERITY_RADIUS[sev] * 2}px`,
                borderRadius: '50%',
                backgroundColor: SEVERITY_COLOR[sev],
                opacity: 0.85,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            <span style={{ fontSize: '12px', color: '#E5E7EB' }}>{SEVERITY_LABEL[sev]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAP INNER COMPONENT
// =============================================================================

function NearMissMapInner({ points }: { points: NearMissGeoPoint[] }) {
  const defaultCenter: [number, number] = [54.0, -2.5];
  const defaultZoom = 6;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapBoundsAdjuster points={points} />

      {points.map((point) => (
        <CircleMarker
          key={point.id}
          center={[point.gps_lat, point.gps_lng]}
          radius={SEVERITY_RADIUS[point.severity]}
          pathOptions={{
            fillColor: SEVERITY_COLOR[point.severity],
            fillOpacity: 0.6,
            color: SEVERITY_COLOR[point.severity],
            weight: 1.5,
          }}
        >
          <Popup>
            <div className="text-gray-900 min-w-[200px] text-sm">
              <div className="font-bold text-base mb-1">{point.category}</div>
              <div className="text-xs text-gray-600 mb-2 capitalize">
                Severity: <span className="font-medium">{SEVERITY_LABEL[point.severity]}</span>
              </div>
              {point.description && (
                <div className="text-xs text-gray-700 mb-2 border-t pt-2">
                  {point.description.length > 120
                    ? `${point.description.slice(0, 120)}…`
                    : point.description}
                </div>
              )}
              <div className="text-xs text-gray-400">
                {new Date(point.created_at).toLocaleDateString('en-GB')}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      <SeverityLegend />
    </MapContainer>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * NearMissHeatMap
 *
 * Fetches near-miss GPS data internally and renders severity-coded CircleMarkers.
 * Must be imported via dynamic({ ssr: false }) — leaflet is browser-only.
 */
export default function NearMissHeatMap() {
  const { data: points, isLoading } = useNearMissGeoData();

  if (isLoading) {
    return (
      <div className="h-[500px] bg-gray-800/50 rounded-xl animate-pulse" />
    );
  }

  const resolvedPoints = points ?? [];

  if (resolvedPoints.length === 0) {
    return (
      <div className="h-[500px] bg-gray-800/30 rounded-xl border border-gray-700/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 font-medium">No near-misses with GPS data recorded yet</p>
          <p className="text-gray-500 text-sm mt-1">GPS-located incidents will appear here as markers</p>
        </div>
      </div>
    );
  }

  return <NearMissMapInner points={resolvedPoints} />;
}
