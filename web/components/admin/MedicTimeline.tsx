/**
 * MedicTimeline.tsx
 *
 * Displays chronological timeline of all shift events for a medic with full audit trail.
 *
 * WHY: For accountability and dispute resolution, admins need to see exactly when a medic
 * arrived, took breaks, and left. The audit trail proves medic was on-site for billing.
 *
 * FEATURES:
 * - Chronological event list (newest first)
 * - Color-coded event types (green=arrival, red=departure, yellow=break, gray=system)
 * - Source indicators (geofence auto vs manual button vs system detected)
 * - Device context (battery, connection, GPS accuracy)
 * - Anomaly highlighting (gaps in data, edge cases)
 * - Export to PDF for billing disputes
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ShiftEvent {
  id: string;
  event_type: string;
  event_timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  source: 'geofence_auto' | 'manual_button' | 'system_detected' | 'admin_override';
  triggered_by_user_id?: string;
  geofence_radius_meters?: number;
  distance_from_site_meters?: number;
  notes?: string;
  device_info?: {
    battery_level?: number;
    connection_type?: string;
    app_version?: string;
    os_version?: string;
  };
}

interface Props {
  medicId: string;
  bookingId: string;
  medicName: string;
}

export default function MedicTimeline({ medicId, bookingId, medicName }: Props) {
  const [events, setEvents] = useState<ShiftEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [medicId, bookingId]);

  /**
   * Load shift events from database
   */
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('medic_shift_events')
        .select('*')
        .eq('medic_id', medicId)
        .eq('booking_id', bookingId)
        .order('event_timestamp', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export timeline to PDF using jsPDF
   */
  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Shift Timeline Audit Report', margin, y);
    y += 8;

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Medic: ${medicName}`, margin, y);
    y += 5;
    doc.text(`Booking ID: ${bookingId}`, margin, y);
    y += 5;
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, margin, y);
    y += 5;
    doc.text(`Total events: ${events.length}`, margin, y);
    y += 10;

    // Divider
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Column headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Time', margin, y);
    doc.text('Event', margin + 30, y);
    doc.text('Source', margin + 95, y);
    doc.text('GPS Accuracy', margin + 120, y);
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Events
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const event of events) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const display = getEventDisplay(event.event_type);
      const time = formatTime(event.event_timestamp);
      const source = event.source.replace(/_/g, ' ');
      const accuracy = event.accuracy_meters != null ? `±${event.accuracy_meters.toFixed(1)}m` : '—';

      // Highlight anomalies
      const isAnomaly = ['battery_died', 'connection_lost', 'late_arrival', 'early_departure'].includes(
        event.event_type
      );
      if (isAnomaly) {
        doc.setFillColor(254, 226, 226);
        doc.rect(margin - 2, y - 3, pageWidth - margin * 2 + 4, 7, 'F');
      }

      doc.setTextColor(isAnomaly ? 180 : 0, 0, 0);
      doc.text(time, margin, y);
      doc.text(display.label, margin + 30, y);
      doc.text(source, margin + 95, y);
      doc.text(accuracy, margin + 120, y);
      y += 7;

      // Notes
      if (event.notes) {
        doc.setTextColor(100);
        doc.setFontSize(8);
        doc.text(`  Note: ${event.notes}`, margin + 4, y);
        doc.setFontSize(9);
        y += 5;
      }
    }

    // Footer
    y = doc.internal.pageSize.getHeight() - 12;
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.text('SiteMedic — Confidential audit trail', margin, y);

    doc.save(`timeline-${medicName.replace(/\s+/g, '-')}-${bookingId.slice(0, 8)}.pdf`);
  };

  /**
   * Get event display info (color, icon, label)
   */
  const getEventDisplay = (eventType: string) => {
    const displays: Record<
      string,
      { color: string; bgColor: string; icon: string; label: string }
    > = {
      shift_started: {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        icon: '▶️',
        label: 'Shift Started',
      },
      arrived_on_site: {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        icon: '📍',
        label: 'Arrived On-Site',
      },
      left_site: {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: '🚶',
        label: 'Left Site',
      },
      break_started: {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: '☕',
        label: 'Break Started',
      },
      break_ended: {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: '⏰',
        label: 'Break Ended',
      },
      shift_ended: {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        icon: '⏹️',
        label: 'Shift Ended',
      },
      battery_critical: {
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        icon: '🔋',
        label: 'Battery Critical',
      },
      battery_died: {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: '🪫',
        label: 'Battery Died',
      },
      connection_lost: {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        icon: '📡',
        label: 'Connection Lost',
      },
      connection_restored: {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        icon: '📶',
        label: 'Connection Restored',
      },
      gps_unavailable: {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        icon: '🛰️',
        label: 'GPS Unavailable',
      },
      app_killed: {
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        icon: '❌',
        label: 'App Killed',
      },
      app_restored: {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        icon: '✅',
        label: 'App Restored',
      },
      inactivity_detected: {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: '⏸️',
        label: 'Inactivity Detected',
      },
      late_arrival: {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: '⏰',
        label: 'Late Arrival',
      },
      early_departure: {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: '🚪',
        label: 'Early Departure',
      },
    };

    return (
      displays[eventType] || {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        icon: '📝',
        label: eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      }
    );
  };

  /**
   * Get source badge
   */
  const getSourceBadge = (source: ShiftEvent['source']) => {
    const badges = {
      geofence_auto: { label: 'Auto', color: 'bg-blue-500/20 text-blue-400' },
      manual_button: { label: 'Manual', color: 'bg-purple-500/20 text-purple-400' },
      system_detected: { label: 'System', color: 'bg-gray-500/20 text-gray-400' },
      admin_override: { label: 'Admin', color: 'bg-orange-500/20 text-orange-400' },
    };

    const badge = badges[source];
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
    );
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter events (show only important ones by default)
  const importantEventTypes = [
    'shift_started',
    'arrived_on_site',
    'left_site',
    'break_started',
    'break_ended',
    'shift_ended',
    'late_arrival',
    'early_departure',
  ];
  const displayEvents = showAllEvents
    ? events
    : events.filter((e) => importantEventTypes.includes(e.event_type));

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-gray-400 text-center">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Shift Timeline</h3>
          <p className="text-sm text-gray-400 mt-1">
            {medicName} • {events.length} events recorded
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAllEvents(!showAllEvents)}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            {showAllEvents ? 'Key Events' : 'All Events'}
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* Timeline */}
      {displayEvents.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No events recorded yet</div>
      ) : (
        <div className="space-y-4">
          {displayEvents.map((event, index) => {
            const display = getEventDisplay(event.event_type);
            const isAnomaly = ['battery_died', 'connection_lost', 'late_arrival', 'early_departure'].includes(
              event.event_type
            );

            return (
              <div
                key={event.id}
                className={`relative pl-8 pb-6 ${
                  index !== displayEvents.length - 1 ? 'border-l-2 border-gray-700' : ''
                }`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-0 w-4 h-4 rounded-full border-2 border-gray-900 ${display.bgColor} -translate-x-[9px] flex items-center justify-center text-xs`}
                >
                  {isAnomaly && <span className="text-red-500 font-bold">!</span>}
                </div>

                {/* Event card */}
                <div className={`bg-gray-800 rounded-lg p-4 ${isAnomaly ? 'border-2 border-red-500/30' : ''}`}>
                  {/* Event header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{display.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${display.color}`}>
                            {display.label}
                          </span>
                          {getSourceBadge(event.source)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatDate(event.event_timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono text-white">
                        {formatTime(event.event_timestamp)}
                      </div>
                    </div>
                  </div>

                  {/* Event details */}
                  <div className="mt-3 space-y-2 text-sm">
                    {/* Location */}
                    {event.latitude && event.longitude && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-500">📍</span>
                        <span className="font-mono text-xs">
                          {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                        </span>
                        <span className="text-gray-500 text-xs">
                          (±{event.accuracy_meters?.toFixed(1)}m)
                        </span>
                      </div>
                    )}

                    {/* Distance from site */}
                    {event.distance_from_site_meters !== undefined && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-500">📏</span>
                        <span className="text-xs">{event.distance_from_site_meters.toFixed(1)}m from site</span>
                      </div>
                    )}

                    {/* Device info */}
                    {event.device_info && (
                      <div className="flex flex-wrap gap-3 text-xs text-gray-300">
                        {event.device_info.battery_level !== undefined && (
                          <span>
                            🔋 <span className={event.device_info.battery_level < 20 ? 'text-red-400 font-semibold' : ''}>{event.device_info.battery_level}%</span>
                          </span>
                        )}
                        {event.device_info.connection_type && (
                          <span>📶 {event.device_info.connection_type}</span>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {event.notes && (
                      <div className="text-gray-400 italic bg-gray-900 p-2 rounded mt-2 text-xs">
                        {event.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
