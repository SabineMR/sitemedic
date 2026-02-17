/**
 * Admin Command Center - Live Medic Tracking
 *
 * Real-time map showing all active medics during their shifts.
 * Color-coded markers, status timeline, alerts, and full audit trail.
 */

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMedicLocationsStore } from '@/stores/useMedicLocationsStore';
import { useMedicAlertsStore } from '@/stores/useMedicAlertsStore';
import MedicTimeline from '@/components/admin/MedicTimeline';
import AlertPanel from '@/components/admin/AlertPanel';
import AlertToast from '@/components/admin/AlertToast';
import { createClient } from '@/lib/supabase/client';

// Import map component dynamically (client-side only - Leaflet doesn't work with SSR)
const MedicTrackingMap = dynamic(() => import('@/components/admin/MedicTrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-white text-xl">Loading command center...</div>
    </div>
  ),
});

export interface MedicLocation {
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
}

export default function CommandCenter() {
  const [selectedMedic, setSelectedMedic] = useState<MedicLocation | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'issues'>('all');
  const [showAlerts, setShowAlerts] = useState(true);
  const [medicPhone, setMedicPhone] = useState<string | null>(null);

  // Real-time medic locations from Zustand store
  const subscribe = useMedicLocationsStore((state) => state.subscribe);
  const unsubscribe = useMedicLocationsStore((state) => state.unsubscribe);
  const locations = useMedicLocationsStore((state) => state.locations);
  const isConnected = useMedicLocationsStore((state) => state.isConnected);

  // Convert Map to array (memoized by Zustand's shallow comparison)
  const activeMedics = Array.from(locations.values());

  // Real-time alerts from Zustand store
  const alerts = useMedicAlertsStore((state) => state.alerts);
  const alertsCount = alerts.length;
  const criticalAlertsCount = alerts.filter((a) => a.alert_severity === 'critical').length;

  // Subscribe to real-time updates on mount
  useEffect(() => {
    subscribe();

    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  /**
   * Handle medic marker click — also fetches phone number from medics table
   */
  const handleMedicClick = async (medic: MedicLocation) => {
    setSelectedMedic(medic);
    setMedicPhone(null);

    const supabase = createClient();
    const { data } = await supabase
      .from('medics')
      .select('phone')
      .eq('id', medic.medic_id)
      .single();

    setMedicPhone(data?.phone ?? null);
  };

  /**
   * Contact medic via call or SMS using device native handler
   */
  const handleContactMedic = (method: 'call' | 'sms') => {
    if (!medicPhone) return;
    const uri = method === 'call' ? `tel:${medicPhone}` : `sms:${medicPhone}`;
    window.location.href = uri;
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
      {/* Toast Notifications */}
      <AlertToast />

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Medic Command Center
              {/* Connection status indicator */}
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={isConnected ? 'Connected' : 'Disconnected'}
              />
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {isConnected ? '🟢 Live tracking' : '🔴 Connecting...'} • {activeMedics.length}{' '}
              active medics
            </p>
          </div>

          {/* Filter Toggle & Alerts */}
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

            {/* Alerts Toggle */}
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`px-4 py-2 rounded-lg font-medium transition relative ${
                showAlerts
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🚨 Alerts
              {alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {alertsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Alerts Panel (if enabled) */}
        {showAlerts && (
          <div className="w-96 border-r border-gray-700 overflow-hidden">
            <AlertPanel />
          </div>
        )}

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
                {medicPhone ? (
                  <>
                    <button
                      onClick={() => handleContactMedic('call')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
                      title={`Call ${medicPhone}`}
                    >
                      📞 Call
                    </button>
                    <button
                      onClick={() => handleContactMedic('sms')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                      title={`SMS ${medicPhone}`}
                    >
                      💬 SMS
                    </button>
                  </>
                ) : (
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`Message for ${selectedMedic.medic_name}`)}&body=${encodeURIComponent(`Hi ${selectedMedic.medic_name},\n\n`)}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-sm font-medium text-white hover:bg-purple-700"
                    title="No phone number on record — send email instead"
                  >
                    ✉️ Send Message
                  </a>
                )}
              </div>
              {medicPhone && (
                <p className="text-xs text-gray-500 -mt-4 mb-4 text-center">{medicPhone}</p>
              )}

              {/* Real-time Timeline */}
              <MedicTimeline
                medicId={selectedMedic.medic_id}
                bookingId={selectedMedic.booking_id}
                medicName={selectedMedic.medic_name}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
