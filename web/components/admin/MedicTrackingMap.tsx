/**
 * MedicTrackingMap.tsx
 *
 * Interactive map component showing real-time medic locations.
 * Uses React-Leaflet for map rendering.
 */

'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MedicLocation {
  medic_id: string;
  medic_name: string;
  booking_id: string;
  site_name: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  battery_level: number;
  connection_type: string;
  recorded_at: string;
  status: 'on_site' | 'traveling' | 'break' | 'issue' | 'offline';
  issue_type?: 'late_arrival' | 'battery_low' | 'connection_lost' | 'not_moving';
  last_event?: string;
  shift_start_time?: string; // PostgreSQL TIME: "07:00:00" — slice to "07:00" for display
  shift_end_time?: string;   // PostgreSQL TIME: "15:00:00" — slice to "15:00" for display
}

interface Props {
  medics: MedicLocation[];
  onMedicClick: (medic: MedicLocation) => void;
}

/**
 * Custom marker icons for different statuses
 */
const createMarkerIcon = (status: string) => {
  const colors = {
    on_site: '#10B981', // Green
    traveling: '#3B82F6', // Blue
    break: '#F59E0B', // Yellow
    issue: '#EF4444', // Red
    offline: '#6B7280', // Gray
  };

  const color = colors[status as keyof typeof colors] || colors.offline;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${
          status === 'issue'
            ? '<span style="color: white; font-size: 14px; font-weight: bold;">!</span>'
            : ''
        }
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

/**
 * Map bounds auto-adjuster
 * Adjusts map to show all medics
 */
function MapBoundsAdjuster({ medics }: { medics: MedicLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (medics.length === 0) {
      // Default: Center on London
      map.setView([51.5074, -0.1278], 10);
      return;
    }

    // Create bounds from all medic locations
    const bounds = L.latLngBounds(medics.map((m) => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [medics, map]);

  return null;
}

export default function MedicTrackingMap({ medics, onMedicClick }: Props) {
  // Default center: London
  const defaultCenter: [number, number] = [51.5074, -0.1278];
  const defaultZoom = 10;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      {/* Map tiles from OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto-adjust bounds */}
      <MapBoundsAdjuster medics={medics} />

      {/* Medic markers */}
      {medics.map((medic) => (
        <div key={medic.medic_id}>
          {/* Accuracy circle (shows GPS accuracy radius) */}
          <Circle
            center={[medic.latitude, medic.longitude]}
            radius={medic.accuracy_meters}
            pathOptions={{
              color: medic.status === 'issue' ? '#EF4444' : '#3B82F6',
              fillColor: medic.status === 'issue' ? '#EF4444' : '#3B82F6',
              fillOpacity: 0.1,
              weight: 1,
            }}
          />

          {/* Medic marker */}
          <Marker
            position={[medic.latitude, medic.longitude]}
            icon={createMarkerIcon(medic.status)}
            eventHandlers={{
              click: () => onMedicClick(medic),
            }}
          >
            <Popup>
              <div className="text-gray-900">
                <div className="font-bold text-base mb-1">{medic.medic_name}</div>
                <div className="text-sm text-gray-600">{medic.site_name}</div>
                {medic.shift_start_time && medic.shift_end_time && (
                  <div className="text-xs text-gray-500 mb-2">
                    Shift: {medic.shift_start_time.slice(0, 5)}{'\u2013'}{medic.shift_end_time.slice(0, 5)}
                  </div>
                )}
                {(!medic.shift_start_time || !medic.shift_end_time) && (
                  <div className="mb-2" />
                )}
                <div className="text-xs space-y-1">
                  <div>
                    Status:{' '}
                    <span className="font-medium">
                      {medic.status === 'on_site'
                        ? '🟢 On-site'
                        : medic.status === 'traveling'
                        ? '🔵 Traveling'
                        : medic.status === 'issue'
                        ? `🔴 Issue (${medic.issue_type})`
                        : '⚪ Offline'}
                    </span>
                  </div>
                  <div>
                    Battery: <span className="font-medium">{medic.battery_level}%</span>
                  </div>
                  <div>
                    Connection: <span className="font-medium">{medic.connection_type}</span>
                  </div>
                  <div>
                    Updated:{' '}
                    <span className="font-medium">
                      {Math.round(
                        (Date.now() - new Date(medic.recorded_at).getTime()) / 1000 / 60
                      )}
                      m ago
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onMedicClick(medic)}
                  className="mt-3 w-full bg-blue-600 text-white py-1 px-3 rounded text-sm font-medium hover:bg-blue-700"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        </div>
      ))}
    </MapContainer>
  );
}
