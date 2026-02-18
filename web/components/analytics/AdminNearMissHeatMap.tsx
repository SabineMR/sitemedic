/**
 * Admin Near-Miss Heat Map Component
 *
 * Displays near-miss incidents from ALL organisations as CircleMarkers on a
 * Leaflet map. Each organisation gets a distinct colour; severity is shown
 * by circle size. Designed for platform admins to identify cross-org
 * geographic clustering of incidents and systemic safety issues.
 *
 * Colour coding:  per-organisation (deterministic from ORG_COLORS palette)
 * Size coding:    low=6 | medium=10 | high=14 | critical=18
 *
 * Map: UK-centred (54.0, -2.5) zoom 6, auto-fits to data if present.
 * SSR: This component uses leaflet — always import via dynamic({ ssr: false }).
 */

'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  useAdminNearMissGeoData,
  AdminNearMissGeoPoint,
} from '@/lib/queries/analytics/near-miss-geo';

// =============================================================================
// SEVERITY CONFIG
// =============================================================================

const SEVERITY_RADIUS: Record<AdminNearMissGeoPoint['severity'], number> = {
  low: 6,
  medium: 10,
  high: 14,
  critical: 18,
};

const SEVERITY_LABEL: Record<AdminNearMissGeoPoint['severity'], string> = {
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
function MapBoundsAdjuster({ points }: { points: AdminNearMissGeoPoint[] }) {
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
// LEGEND
// =============================================================================

interface LegendProps {
  points: AdminNearMissGeoPoint[];
  orgColorMap: Map<string, string>;
}

function AdminHeatMapLegend({ points, orgColorMap }: LegendProps) {
  const severities: AdminNearMissGeoPoint['severity'][] = ['low', 'medium', 'high', 'critical'];

  // Collect unique orgs present in current data
  const orgsSeen = new Map<string, string>(); // org_id -> org_name
  points.forEach((p) => {
    if (!orgsSeen.has(p.org_id)) {
      orgsSeen.set(p.org_id, p.org_name);
    }
  });

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
        maxWidth: '200px',
        maxHeight: '340px',
        overflowY: 'auto',
      }}
    >
      {/* Org colour section */}
      {orgsSeen.size > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#9CA3AF',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Organisation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[...orgsSeen.entries()].map(([orgId, orgName]) => (
              <div key={orgId} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    minWidth: '10px',
                    borderRadius: '50%',
                    backgroundColor: orgColorMap.get(orgId) ?? '#6B7280',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: '#E5E7EB',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '148px',
                  }}
                  title={orgName}
                >
                  {orgName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Severity size section */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#9CA3AF',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Severity (size)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {severities.map((sev) => (
            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div
                style={{
                  width: `${SEVERITY_RADIUS[sev] * 2}px`,
                  height: `${SEVERITY_RADIUS[sev] * 2}px`,
                  minWidth: `${SEVERITY_RADIUS[sev] * 2}px`,
                  borderRadius: '50%',
                  backgroundColor: '#6B7280',
                  opacity: 0.85,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              <span style={{ fontSize: '11px', color: '#E5E7EB' }}>{SEVERITY_LABEL[sev]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAP INNER COMPONENT
// =============================================================================

interface AdminMapInnerProps {
  points: AdminNearMissGeoPoint[];
  orgColorMap: Map<string, string>;
}

function AdminNearMissMapInner({ points, orgColorMap }: AdminMapInnerProps) {
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

      {points.map((point) => {
        const markerColor = orgColorMap.get(point.org_id) ?? '#6B7280';
        return (
          <CircleMarker
            key={point.id}
            center={[point.gps_lat, point.gps_lng]}
            radius={SEVERITY_RADIUS[point.severity]}
            pathOptions={{
              fillColor: markerColor,
              fillOpacity: 0.6,
              color: markerColor,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-gray-900 min-w-[200px] text-sm">
                <div className="font-bold text-base mb-1">{point.category}</div>
                <div className="text-xs text-gray-600 mb-1 capitalize">
                  Severity: <span className="font-medium">{SEVERITY_LABEL[point.severity]}</span>
                </div>
                <div className="text-xs text-gray-700 mb-2">
                  Org: <span className="font-bold">{point.org_name}</span>
                </div>
                {point.description && (
                  <div className="text-xs text-gray-700 mb-2 border-t pt-2">
                    {point.description.length > 120
                      ? `${point.description.slice(0, 120)}\u2026`
                      : point.description}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {new Date(point.created_at).toLocaleDateString('en-GB')}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      <AdminHeatMapLegend points={points} orgColorMap={orgColorMap} />
    </MapContainer>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * AdminNearMissHeatMap
 *
 * Fetches cross-org near-miss GPS data internally via useAdminNearMissGeoData
 * and renders org-colour-coded, severity-sized CircleMarkers.
 * Must be imported via dynamic({ ssr: false }) — leaflet is browser-only.
 */
export default function AdminNearMissHeatMap() {
  const result = useAdminNearMissGeoData();
  const isLoading = result.isLoading;
  const queryData = result.data;

  if (isLoading) {
    return <div className="h-[500px] bg-gray-800/50 rounded-xl animate-pulse" />;
  }

  const points = queryData?.data ?? [];
  const orgColorMap = queryData?.orgColorMap ?? new Map<string, string>();

  if (points.length === 0) {
    return (
      <div className="h-[500px] bg-gray-800/30 rounded-xl border border-gray-700/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 font-medium">No near-misses with GPS data recorded yet</p>
          <p className="text-gray-500 text-sm mt-1">
            GPS-located incidents from all organisations will appear here as markers
          </p>
        </div>
      </div>
    );
  }

  return <AdminNearMissMapInner points={points} orgColorMap={orgColorMap} />;
}
