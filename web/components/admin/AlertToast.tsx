/**
 * Alert Toast - Brief notification for new alerts
 *
 * Shows transient notifications when new alerts are created.
 * Auto-dismisses after 5 seconds (critical alerts stay for 10 seconds).
 */

'use client';

import { useEffect, useState } from 'react';
import { useMedicAlertsStore } from '@/stores/useMedicAlertsStore';
import type { MedicAlert } from '@/stores/useMedicAlertsStore';

interface ToastNotification extends MedicAlert {
  id: string;
  expiresAt: number;
}

export default function AlertToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const alerts = useMedicAlertsStore((state) => state.alerts);

  // Watch for new alerts
  useEffect(() => {
    if (alerts.length === 0) return;

    // Check if we have new alerts that aren't already in toasts
    const latestAlert = alerts[0];
    const alreadyShown = toasts.some((t) => t.id === latestAlert.id);

    if (!alreadyShown) {
      // Add new toast
      const duration = latestAlert.alert_severity === 'critical' ? 10000 : 5000;
      const newToast: ToastNotification = {
        ...latestAlert,
        expiresAt: Date.now() + duration,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, duration);
    }
  }, [alerts, toasts]);

  /**
   * Manually dismiss toast
   */
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * Get severity styling
   */
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-500',
          icon: '🚨',
        };
      case 'high':
        return {
          bg: 'bg-orange-500',
          icon: '⚠️',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500',
          icon: '⚡',
        };
      case 'low':
        return {
          bg: 'bg-blue-500',
          icon: 'ℹ️',
        };
      default:
        return {
          bg: 'bg-gray-500',
          icon: '📢',
        };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 space-y-3 max-w-md">
      {toasts.map((toast) => {
        const style = getSeverityStyle(toast.alert_severity);

        return (
          <div
            key={toast.id}
            className={`${style.bg} text-white rounded-lg shadow-2xl p-4 animate-slide-in-right`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{style.icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm mb-1">{toast.alert_title}</h4>
                <p className="text-sm opacity-90">{toast.alert_message}</p>
                <div className="text-xs opacity-75 mt-2">
                  📍 {toast.site_name} • 👤 {toast.medic_name}
                </div>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-white hover:opacity-75 transition"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
