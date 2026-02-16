/**
 * Alert Panel - Real-time alerts for command center
 *
 * Displays active alerts with severity-based styling, actions, and sound/notification controls.
 */

'use client';

import { useEffect, useState } from 'react';
import { useMedicAlertsStore } from '@/stores/useMedicAlertsStore';
import type { MedicAlert } from '@/stores/useMedicAlertsStore';

export default function AlertPanel() {
  const [dismissNote, setDismissNote] = useState<{ alertId: string; note: string } | null>(null);
  const [resolveNote, setResolveNote] = useState<{ alertId: string; note: string } | null>(null);

  // Store state
  const alerts = useMedicAlertsStore((state) => state.alerts);
  const subscribe = useMedicAlertsStore((state) => state.subscribe);
  const unsubscribe = useMedicAlertsStore((state) => state.unsubscribe);
  const dismissAlert = useMedicAlertsStore((state) => state.dismissAlert);
  const resolveAlert = useMedicAlertsStore((state) => state.resolveAlert);
  const soundEnabled = useMedicAlertsStore((state) => state.soundEnabled);
  const toggleSound = useMedicAlertsStore((state) => state.toggleSound);
  const browserNotificationsEnabled = useMedicAlertsStore((state) => state.browserNotificationsEnabled);
  const requestBrowserNotifications = useMedicAlertsStore((state) => state.requestBrowserNotifications);
  const isConnected = useMedicAlertsStore((state) => state.isConnected);

  // Subscribe on mount
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  /**
   * Get severity styling
   */
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500',
          text: 'text-red-400',
          badge: 'bg-red-500',
        };
      case 'high':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500',
          text: 'text-orange-400',
          badge: 'bg-orange-500',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500',
          text: 'text-yellow-400',
          badge: 'bg-yellow-500',
        };
      case 'low':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500',
          text: 'text-blue-400',
          badge: 'bg-blue-500',
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500',
          text: 'text-gray-400',
          badge: 'bg-gray-500',
        };
    }
  };

  /**
   * Get alert icon
   */
  const getAlertIcon = (type: string) => {
    const icons: Record<string, string> = {
      battery_low: '🔋',
      battery_critical: '🪫',
      late_arrival: '⏰',
      early_departure: '🚪',
      connection_lost: '📡',
      not_moving_20min: '🛑',
      geofence_failure: '📍',
      gps_accuracy_poor: '🎯',
      shift_overrun: '⏱️',
    };
    return icons[type] || '⚠️';
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  /**
   * Handle dismiss with note
   */
  const handleDismiss = async (alertId: string) => {
    if (dismissNote && dismissNote.alertId === alertId) {
      await dismissAlert(alertId, dismissNote.note);
      setDismissNote(null);
    } else {
      setDismissNote({ alertId, note: '' });
    }
  };

  /**
   * Handle resolve with note
   */
  const handleResolve = async (alertId: string) => {
    if (resolveNote && resolveNote.alertId === alertId) {
      await resolveAlert(alertId, resolveNote.note);
      setResolveNote(null);
    } else {
      setResolveNote({ alertId, note: '' });
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
          {/* Connection indicator */}
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
          {/* Alert count */}
          {alerts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
              {alerts.length}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg transition ${
              soundEnabled
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          {/* Browser notifications toggle */}
          <button
            onClick={requestBrowserNotifications}
            className={`p-2 rounded-lg transition ${
              browserNotificationsEnabled
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title={browserNotificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
          >
            🔔
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <p>No active alerts</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {alerts.map((alert) => {
              const style = getSeverityStyle(alert.alert_severity);
              const icon = getAlertIcon(alert.alert_type);

              return (
                <div
                  key={alert.id}
                  className={`${style.bg} border ${style.border} rounded-lg p-4`}
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{icon}</div>
                      <div>
                        <h4 className={`font-semibold ${style.text}`}>{alert.alert_title}</h4>
                        <p className="text-gray-300 text-sm mt-1">{alert.alert_message}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${style.badge} text-white`}>
                      {alert.alert_severity.toUpperCase()}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-gray-400 mb-3 flex items-center gap-4">
                    <span>📍 {alert.site_name}</span>
                    <span>👤 {alert.medic_name}</span>
                    <span>🕒 {formatTimeAgo(alert.seconds_since_triggered)}</span>
                  </div>

                  {/* Additional metadata */}
                  {Object.keys(alert.metadata).length > 0 && (
                    <div className="bg-gray-900/50 rounded p-2 mb-3 text-xs">
                      {Object.entries(alert.metadata).map(([key, value]) => (
                        <div key={key} className="text-gray-400">
                          <span className="text-gray-500">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dismiss Note Input */}
                  {dismissNote?.alertId === alert.id && (
                    <input
                      type="text"
                      value={dismissNote.note}
                      onChange={(e) => setDismissNote({ alertId: alert.id, note: e.target.value })}
                      placeholder="Add dismissal note (optional)"
                      className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-600 text-white text-sm mb-2"
                      autoFocus
                    />
                  )}

                  {/* Resolve Note Input */}
                  {resolveNote?.alertId === alert.id && (
                    <input
                      type="text"
                      value={resolveNote.note}
                      onChange={(e) => setResolveNote({ alertId: alert.id, note: e.target.value })}
                      placeholder="Add resolution note (optional)"
                      className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-600 text-white text-sm mb-2"
                      autoFocus
                    />
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition"
                    >
                      {dismissNote?.alertId === alert.id ? 'Confirm Dismiss' : 'Dismiss'}
                    </button>
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition"
                    >
                      {resolveNote?.alertId === alert.id ? 'Confirm Resolve' : 'Resolve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
