/**
 * Territory Map Component
 *
 * Interactive map showing UK territories with color-coded utilization markers.
 * Uses React Leaflet with dynamic import to avoid SSR issues.
 */

'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TerritoryWithMetrics, getUtilizationColor } from '@/lib/queries/admin/territories';

interface Props {
  territories: TerritoryWithMetrics[];
}

/**
 * Map bounds auto-adjuster
 * Adjusts map to show all territories
 */
function MapBoundsAdjuster({ territories }: { territories: TerritoryWithMetrics[] }) {
  const map = useMap();

  useEffect(() => {
    if (territories.length === 0) {
      // Default: Center on UK
      map.setView([54.0, -2.5], 6);
      return;
    }

    // Create bounds from all territory locations
    const bounds = L.latLngBounds(territories.map((t) => [t.lat, t.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [territories, map]);

  return null;
}

/**
 * TerritoryMapInner - The actual map component
 */
function TerritoryMapInner({ territories }: Props) {
  // Default center: UK center
  const defaultCenter: [number, number] = [54.0, -2.5];
  const defaultZoom = 6;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom={true}
    >
      {/* Map tiles from OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto-adjust bounds */}
      <MapBoundsAdjuster territories={territories} />

      {/* Territory markers */}
      {territories.map((territory) => {
        const fillColor = getUtilizationColor(territory.utilization_pct);

        return (
          <CircleMarker
            key={territory.id}
            center={[territory.lat, territory.lng]}
            radius={12}
            pathOptions={{
              fillColor,
              fillOpacity: 0.7,
              color: '#000',
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-gray-900 min-w-[200px]">
                <div className="font-bold text-base mb-1">{territory.postcode_sector}</div>
                <div className="text-sm text-gray-600 mb-2">{territory.region}</div>

                <div className="text-xs space-y-1 border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>Utilization:</span>
                    <span className="font-medium">{territory.utilization_pct}%</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Primary Medic:</span>
                    <span className="font-medium">{territory.primary_medic_name || 'Unassigned'}</span>
                  </div>

                  {territory.secondary_medic_name && (
                    <div className="flex justify-between">
                      <span>Secondary:</span>
                      <span className="font-medium">{territory.secondary_medic_name}</span>
                    </div>
                  )}

                  <div className="border-t pt-2 mt-2">
                    <div className="font-medium mb-1">Recent Metrics:</div>
                    <div className="flex justify-between">
                      <span>Total Bookings:</span>
                      <span className="font-medium">{territory.recent_metrics.total_bookings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confirmed:</span>
                      <span className="font-medium text-green-600">{territory.recent_metrics.confirmed_bookings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rejected:</span>
                      <span className="font-medium text-red-600">{territory.recent_metrics.rejected_bookings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rejection Rate:</span>
                      <span className="font-medium">{territory.recent_metrics.rejection_rate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fulfillment:</span>
                      <span className="font-medium">{territory.recent_metrics.fulfillment_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
          Utilization
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '1px solid #000',
              }}
            />
            <span>&lt;50% (Low)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#eab308',
                border: '1px solid #000',
              }}
            />
            <span>50-80% (Medium)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                border: '1px solid #000',
              }}
            />
            <span>&gt;80% (High)</span>
          </div>
        </div>
      </div>
    </MapContainer>
  );
}

/**
 * TerritoryMap - Export with dynamic import wrapper
 *
 * This component is exported with dynamic import disabled for SSR.
 * The actual export happens in the parent page component.
 */
export default TerritoryMapInner;
