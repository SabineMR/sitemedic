'use client';

/**
 * GeofenceMapPicker.tsx
 *
 * Interactive Leaflet map for placing a geofence centre and adjusting radius.
 * MUST be loaded via dynamic(..., { ssr: false }) — never imported directly
 * in a server or page component. (Decision D-05.5-04-003)
 */

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  onChange: (lat: number, lng: number, radius: number) => void;
}

/**
 * Inner component that listens for map click events and calls onPlace.
 * Must be rendered inside MapContainer.
 */
function ClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:20px">📍</div>',
  iconSize: [20, 20],
});

export default function GeofenceMapPicker({ lat, lng, radiusMeters, onChange }: Props) {
  const defaultCenter: [number, number] = [51.5074, -0.1278];
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : defaultCenter;

  function handlePlace(newLat: number, newLng: number) {
    onChange(newLat, newLng, radiusMeters);
  }

  function handleRadiusChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRadius = parseInt(e.target.value, 10);
    onChange(lat ?? defaultCenter[0], lng ?? defaultCenter[1], newRadius);
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={{ height: '300px', width: '100%' }}>
        <MapContainer
          center={center}
          zoom={lat !== null && lng !== null ? 15 : 10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPlace={handlePlace} />
          {lat !== null && lng !== null && (
            <>
              <Marker position={[lat, lng]} icon={pinIcon} />
              <Circle
                center={[lat, lng]}
                radius={radiusMeters}
                pathOptions={{
                  color: '#3B82F6',
                  fillColor: '#3B82F6',
                  fillOpacity: 0.15,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
      <div className="mt-3 space-y-1">
        <input
          type="range"
          min={50}
          max={5000}
          value={radiusMeters}
          onChange={handleRadiusChange}
          className="w-full accent-blue-500"
        />
        <p className="text-gray-500 text-xs">
          Click map to place centre. Drag slider to resize ({radiusMeters}m)
        </p>
      </div>
    </div>
  );
}
