/**
 * Admin Command Center - Live Medic Tracking
 *
 * Real-time map showing all active medics during their shifts.
 * Color-coded markers, status timeline, alerts, and full audit trail.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Import map component dynamically (client-side only - Leaflet doesn't work with SSR)
const MedicTrackingMap = dynamic(() => import('@/components/admin/MedicTrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-white text-xl">Loading command center...</div>
    </div>
  ),
});

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
}

interface Alert {
  id: string;
  medic_id: string;
  medic_name: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export default function CommandCenter() {
  const [activeMedics, setActiveMedics] = useState<MedicLocation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedMedic, setSelectedMedic] = useState<MedicLocation | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'issues'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Load initial data
    loadActiveMedics();

    // Set up real-time subscription (Supabase Realtime)
    // TODO: Implement Supabase Realtime subscription in Task #4
    // For now, poll every 10 seconds
    const interval = setInterval(loadActiveMedics, 10000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Load all currently active medics
   */
  const loadActiveMedics = async () => {
    try {
      // TODO: Replace with actual Supabase query
      // For now, mock data to show the UI
      const mockData: MedicLocation[] = [
        {
          medic_id: '1',
          medic_name: 'John Smith',
          booking_id: 'booking-1',
          site_name: 'ABC Construction - London E1',
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy_meters: 8.5,
          battery_level: 78,
          connection_type: '4G',
          recorded_at: new Date().toISOString(),
          status: 'on_site',
        },
        {
          medic_id: '2',
          medic_name: 'Sarah Johnson',
          booking_id: 'booking-2',
          site_name: 'XYZ Development - London N1',
          latitude: 51.5354,
          longitude: -0.1426,
          accuracy_meters: 12.3,
          battery_level: 18,
          connection_type: '4G',
          recorded_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          status: 'issue',
          issue_type: 'battery_low',
        },
        {
          medic_id: '3',
          medic_name: 'Mike Williams',
          booking_id: 'booking-3',
          site_name: 'City Tower Project - London EC1',
          latitude: 51.5194,
          longitude: -0.1270,
          accuracy_meters: 6.8,
          battery_level: 92,
          connection_type: '5G',
          recorded_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          status: 'traveling',
        },
      ];

      setActiveMedics(mockData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading active medics:', error);
      setIsLoading(false);
    }
  };

  /**
   * Handle medic marker click
   */
  const handleMedicClick = (medic: MedicLocation) => {
    setSelectedMedic(medic);
  };

  /**
   * Contact medic (call/SMS)
   */
  const handleContactMedic = (medicId: string, method: 'call' | 'sms') => {
    console.log(`Contacting medic ${medicId} via ${method}`);
    // TODO: Implement actual contact functionality
  };

  /**
   * Filter medics based on mode
   */
  const filteredMedics =
    filterMode === 'all'
      ? activeMedics
      : activeMedics.filter((m) => m.status === 'issue' || m.status === 'offline');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Medic Command Center</h1>
            <p className="text-gray-400 text-sm mt-1">
              Live tracking • {activeMedics.length} active medics
            </p>
          </div>

          {/* Filter Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Show All ({activeMedics.length})
            </button>
            <button
              onClick={() => setFilterMode('issues')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterMode === 'issues'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Issues Only ({activeMedics.filter((m) => m.status === 'issue').length})
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Map View */}
        <div className="flex-1 relative">
          <MedicTrackingMap medics={filteredMedics} onMedicClick={handleMedicClick} />

          {/* Legend */}
          <div className="absolute bottom-6 left-6 bg-gray-800 rounded-lg p-4 shadow-lg">
            <h3 className="text-sm font-semibold mb-3">Status Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">On-site at job</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm">Traveling to job</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">On break</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Issue detected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-sm">Offline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Medic Details */}
        {selectedMedic && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setSelectedMedic(null)}
                className="float-right text-gray-400 hover:text-white"
              >
                ✕
              </button>

              {/* Medic Info */}
              <h2 className="text-xl font-bold mb-2">{selectedMedic.medic_name}</h2>
              <p className="text-gray-400 text-sm mb-4">{selectedMedic.site_name}</p>

              {/* Status Badge */}
              <div className="mb-6">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedMedic.status === 'on_site'
                      ? 'bg-green-500/20 text-green-400'
                      : selectedMedic.status === 'traveling'
                      ? 'bg-blue-500/20 text-blue-400'
                      : selectedMedic.status === 'issue'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {selectedMedic.status === 'on_site'
                    ? '🟢 On-site'
                    : selectedMedic.status === 'traveling'
                    ? '🔵 Traveling'
                    : selectedMedic.status === 'issue'
                    ? `🔴 Issue: ${selectedMedic.issue_type?.replace('_', ' ')}`
                    : '⚪ Offline'}
                </span>
              </div>

              {/* Device Info */}
              <div className="bg-gray-900 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold mb-3">Device Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Battery:</span>
                    <span
                      className={
                        selectedMedic.battery_level < 20
                          ? 'text-red-400 font-medium'
                          : 'text-white'
                      }
                    >
                      {selectedMedic.battery_level}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Connection:</span>
                    <span className="text-white">{selectedMedic.connection_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">GPS Accuracy:</span>
                    <span className="text-white">{selectedMedic.accuracy_meters.toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Update:</span>
                    <span className="text-white">
                      {Math.round(
                        (Date.now() - new Date(selectedMedic.recorded_at).getTime()) / 1000 / 60
                      )}
                      m ago
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => handleContactMedic(selectedMedic.medic_id, 'call')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
                >
                  📞 Call
                </button>
                <button
                  onClick={() => handleContactMedic(selectedMedic.medic_id, 'sms')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                >
                  💬 SMS
                </button>
              </div>

              {/* Timeline (placeholder) */}
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Shift Timeline</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <div className="text-gray-400 min-w-[60px]">08:30</div>
                    <div>
                      <div className="text-white font-medium">Shift Started</div>
                      <div className="text-gray-400 text-xs">Location tracking activated</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-gray-400 min-w-[60px]">08:47</div>
                    <div>
                      <div className="text-white font-medium">Arrived On-Site</div>
                      <div className="text-gray-400 text-xs">Geofence auto-detect</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-gray-400 min-w-[60px]">12:03</div>
                    <div>
                      <div className="text-white font-medium">Break Started</div>
                      <div className="text-gray-400 text-xs">Manual button</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
