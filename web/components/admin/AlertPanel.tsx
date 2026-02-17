/**
 * Alert Panel - Real-time alerts for command center
 *
 * Displays active alerts with severity-based styling, actions, and sound/notification controls.
 * Includes auto-escalation (red pulse + sound) for unacknowledged alerts older than 15 minutes,
 * suggested actions per alert type, and escalation sound that fires once per alert.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useMedicAlertsStore } from '@/stores/useMedicAlertsStore';
import type { MedicAlert } from '@/stores/useMedicAlertsStore';

/**
 * Suggested action text for each alert type.
 * Guides admins on the appropriate response for each alert category.
 */
const SUGGESTED_ACTIONS: Record<string, string> = {
  battery_low: 'Contact medic to ensure device is charging',
  battery_critical: 'Call medic immediately — device may go offline',
  late_arrival: 'Call medic — may need to arrange replacement',
  early_departure: 'Call medic to confirm departure reason',
  connection_lost: 'Call medic — may need assistance',
  not_moving_20min: 'Call medic to check status',
  geofence_failure: 'Verify medic is at the correct site',
  gps_accuracy_poor: 'Ask medic to move to an open area for better signal',
  shift_overrun: 'Confirm whether shift is being extended or medic should depart',
};

export default function AlertPanel() {
  const [dismissNote, setDismissNote] = useState<{ alertId: string; note: string } | null>(null);
  const [resolveNote, setResolveNote] = useState<{ alertId: string; note: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDismissing, setBulkDismissing] = useState(false);

  // Tick state — re-renders every 60 seconds so escalation status stays live
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Ref tracking which alert IDs have already had their escalation sound fired.
  // Using a ref (not state) so it never triggers re-renders and never resets on tick.
  const escalatedSoundRef = useRef<Set<string>>(new Set());

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
  const playAlertSound = useMedicAlertsStore((state) => state.playAlertSound);

  // Subscribe on mount
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  // Clear selection when alerts change (dismissed alerts disappear from list)
  useEffect(() => {
    const activeIds = new Set(alerts.map((a) => a.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => activeIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [alerts]);

  /**
   * Fire escalation sound once per alert when crossing the 15-minute threshold.
   * Re-evaluated every 60 seconds via tick, but each alert's sound fires only once
   * thanks to the escalatedSoundRef Set.
   *
   * Uses triggered_at (server timestamp) — NOT seconds_since_triggered (stale).
   */
  useEffect(() => {
    alerts.forEach((alert) => {
      if (alert.is_dismissed) return;
      const elapsed = Math.floor(
        (Date.now() - new Date(alert.triggered_at).getTime()) / 1000
      );
      if (elapsed >= 900 && !escalatedSoundRef.current.has(alert.id)) {
        escalatedSoundRef.current.add(alert.id);
        playAlertSound(alert.alert_severity);
      }
    });
  }, [alerts, tick, playAlertSound]);

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
   * Handle dismiss with note — two-step: first click opens note input, second click confirms
   */
  const handleDismiss = async (alertId: string) => {
    if (dismissNote && dismissNote.alertId === alertId) {
      await dismissAlert(alertId, dismissNote.note || undefined);
      setDismissNote(null);
    } else {
      // Close any open resolve note for other alerts
      setResolveNote(null);
      setDismissNote({ alertId, note: '' });
    }
  };

  /**
   * Handle resolve with note — two-step: first click opens note input, second click confirms
   */
  const handleResolve = async (alertId: string) => {
    if (resolveNote && resolveNote.alertId === alertId) {
      await resolveAlert(alertId, resolveNote.note || undefined);
      setResolveNote(null);
    } else {
      // Close any open dismiss note for other alerts
      setDismissNote(null);
      setResolveNote({ alertId, note: '' });
    }
  };

  /**
   * Non-critical alerts eligible for bulk dismiss (low and medium severity only)
   */
  const nonCriticalAlerts = alerts.filter(
    (a) => !a.is_dismissed && (a.alert_severity === 'low' || a.alert_severity === 'medium'),
  );

  /**
   * Select all non-critical (low/medium) alerts
   */
  const handleSelectAllNonCritical = () => {
    setSelectedIds(new Set(nonCriticalAlerts.map((a) => a.id)));
  };

  /**
   * Bulk dismiss all selected alerts with a standard note
   */
  const handleBulkDismiss = async () => {
    setBulkDismissing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => dismissAlert(id, 'Bulk dismissed')));
      setSelectedIds(new Set());
    } finally {
      setBulkDismissing(false);
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
            {/* Bulk action bar — shown when at least one non-critical alert is selected */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                <span className="text-sm font-medium text-gray-700">
                  {selectedIds.size} non-critical alert{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkDismiss}
                    disabled={bulkDismissing}
                    className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {bulkDismissing
                      ? 'Dismissing...'
                      : `Dismiss ${selectedIds.size} alert${selectedIds.size !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Select All Non-Critical — shown when there are eligible alerts */}
            {nonCriticalAlerts.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleSelectAllNonCritical}
                  className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2"
                >
                  Select all non-critical ({nonCriticalAlerts.length})
                </button>
              </div>
            )}

            {alerts.map((alert) => {
              const style = getSeverityStyle(alert.alert_severity);
              const icon = getAlertIcon(alert.alert_type);
              const isNonCritical =
                alert.alert_severity === 'low' || alert.alert_severity === 'medium';

              // Compute elapsed seconds from server timestamp (NOT stale seconds_since_triggered)
              const elapsedSeconds = Math.floor(
                (Date.now() - new Date(alert.triggered_at).getTime()) / 1000
              );
              // Alert escalates at 15 minutes (900 seconds) if not dismissed
              const isEscalated = elapsedSeconds >= 900 && !alert.is_dismissed;

              return (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${
                    isEscalated
                      ? 'animate-pulse border-red-600 bg-red-900/20'
                      : `${style.bg} ${style.border}`
                  }`}
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      {/* Checkbox for non-critical alerts only */}
                      {isNonCritical && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(alert.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(alert.id);
                            else next.delete(alert.id);
                            setSelectedIds(next);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 flex-shrink-0"
                          aria-label={`Select alert: ${alert.alert_title}`}
                        />
                      )}
                      <div className="text-2xl">{icon}</div>
                      <div>
                        <h4 className={`font-semibold ${isEscalated ? 'text-red-400' : style.text}`}>
                          {alert.alert_title}
                        </h4>
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

                  {/* Suggested action */}
                  {SUGGESTED_ACTIONS[alert.alert_type] && (
                    <p className="mt-1 mb-3 text-xs italic text-gray-500">
                      Suggested: {SUGGESTED_ACTIONS[alert.alert_type]}
                    </p>
                  )}

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
                    <div className="mt-2 mb-2 space-y-2">
                      <textarea
                        value={dismissNote.note}
                        onChange={(e) => setDismissNote({ alertId: alert.id, note: e.target.value })}
                        placeholder="Reason for dismissal (optional)..."
                        className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white placeholder-gray-500"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
                        >
                          Confirm Dismiss
                        </button>
                        <button
                          onClick={() => setDismissNote(null)}
                          className="rounded border border-gray-600 px-3 py-1 text-sm text-gray-400 hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resolve Note Input */}
                  {resolveNote?.alertId === alert.id && (
                    <div className="mt-2 mb-2 space-y-2">
                      <textarea
                        value={resolveNote.note}
                        onChange={(e) => setResolveNote({ alertId: alert.id, note: e.target.value })}
                        placeholder="Resolution details (optional)..."
                        className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white placeholder-gray-500"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                        >
                          Confirm Resolve
                        </button>
                        <button
                          onClick={() => setResolveNote(null)}
                          className="rounded border border-gray-600 px-3 py-1 text-sm text-gray-400 hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
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
