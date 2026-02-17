/**
 * Zustand Store: Medic Alerts
 *
 * Real-time alerts for admin command center.
 *
 * FEATURES:
 * - Real-time Supabase subscriptions for new alerts
 * - Alert filtering by severity/type
 * - Alert dismissal and resolution
 * - Sound and browser notifications
 * - Alert history management
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface MedicAlert {
  id: string;
  medic_id: string;
  medic_name: string;
  booking_id: string;
  site_name: string;
  alert_type:
    | 'battery_low'
    | 'battery_critical'
    | 'late_arrival'
    | 'early_departure'
    | 'connection_lost'
    | 'not_moving_20min'
    | 'geofence_failure'
    | 'gps_accuracy_poor'
    | 'shift_overrun';
  alert_severity: 'low' | 'medium' | 'high' | 'critical';
  alert_title: string;
  alert_message: string;
  triggered_at: string;
  seconds_since_triggered: number;
  metadata: Record<string, any>;
  is_dismissed: boolean;
  is_resolved: boolean;
  dismissed_at?: string;
  resolved_at?: string;
}

interface MedicAlertsState {
  alerts: MedicAlert[];
  isConnected: boolean;
  isLoading: boolean;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  channel: RealtimeChannel | null;

  // Actions
  fetchActiveAlerts: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
  dismissAlert: (alertId: string, notes?: string) => Promise<void>;
  resolveAlert: (alertId: string, notes?: string) => Promise<void>;
  toggleSound: () => void;
  requestBrowserNotifications: () => Promise<void>;
  playAlertSound: (severity: string) => void;
  showBrowserNotification: (alert: MedicAlert) => void;

  // Getters
  getActiveAlerts: () => MedicAlert[];
  getAlertsBySeverity: (severity: string) => MedicAlert[];
  getCriticalAlertsCount: () => number;
}

/**
 * Play alert sound based on severity
 */
const playSound = (severity: string) => {
  if (typeof window === 'undefined') return;

  // Use Web Audio API for cross-browser compatibility
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Different frequencies for different severities
  const frequencies = {
    low: 440,
    medium: 550,
    high: 660,
    critical: 880,
  };

  oscillator.frequency.value = frequencies[severity as keyof typeof frequencies] || 440;
  oscillator.type = 'sine';

  // Quick beep
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
};

export const useMedicAlertsStore = create<MedicAlertsState>((set, get) => ({
  alerts: [],
  isConnected: false,
  isLoading: false,
  soundEnabled: false, // Default off to not annoy admins
  browserNotificationsEnabled: false,
  channel: null,

  /**
   * Fetch all active alerts from database
   */
  fetchActiveAlerts: async () => {
    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from('active_medic_alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (error) {
        console.error('[AlertsStore] Error fetching alerts:', error);
        return;
      }

      set({ alerts: data || [], isLoading: false });
    } catch (error) {
      console.error('[AlertsStore] Unexpected error:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Subscribe to real-time alert updates
   */
  subscribe: () => {
    const existingChannel = get().channel;
    if (existingChannel) {
      return;
    }

    const channel = supabase
      .channel('medic-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medic_alerts',
        },
        (payload) => {
          // Fetch full alert data from view (includes medic name, site name)
          supabase
            .from('active_medic_alerts')
            .select('*')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) {
                set((state) => ({
                  alerts: [data, ...state.alerts],
                }));

                // Play sound if enabled
                if (get().soundEnabled) {
                  get().playAlertSound(data.alert_severity);
                }

                // Show browser notification if enabled
                if (get().browserNotificationsEnabled) {
                  get().showBrowserNotification(data);
                }
              }
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'medic_alerts',
        },
        (payload) => {
          // Remove from active alerts if dismissed or resolved
          if (payload.new.is_dismissed || payload.new.is_resolved) {
            set((state) => ({
              alerts: state.alerts.filter((a) => a.id !== payload.new.id),
            }));
          }
        }
      )
      .subscribe((status) => {
        set({ isConnected: status === 'SUBSCRIBED' });
      });

    set({ channel });

    // Initial fetch
    get().fetchActiveAlerts();
  },

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null, isConnected: false });
    }
  },

  /**
   * Dismiss alert (acknowledge but not resolved)
   */
  dismissAlert: async (alertId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('medic_alerts')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
          dismissal_notes: notes,
        })
        .eq('id', alertId);

      if (error) {
        console.error('[AlertsStore] Error dismissing alert:', error);
        return;
      }

      // Remove from local state
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== alertId),
      }));
    } catch (error) {
      console.error('[AlertsStore] Unexpected error:', error);
    }
  },

  /**
   * Resolve alert (issue fixed)
   */
  resolveAlert: async (alertId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('medic_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', alertId);

      if (error) {
        console.error('[AlertsStore] Error resolving alert:', error);
        return;
      }

      // Remove from local state
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== alertId),
      }));
    } catch (error) {
      console.error('[AlertsStore] Unexpected error:', error);
    }
  },

  /**
   * Toggle alert sound on/off
   */
  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  /**
   * Request browser notification permissions
   */
  requestBrowserNotifications: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      set({ browserNotificationsEnabled: permission === 'granted' });
    } catch (error) {
      console.error('[AlertsStore] Error requesting notification permission:', error);
    }
  },

  /**
   * Play alert sound
   */
  playAlertSound: (severity: string) => {
    playSound(severity);
  },

  /**
   * Show browser notification
   */
  showBrowserNotification: (alert: MedicAlert) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(alert.alert_title, {
      body: alert.alert_message,
      icon: '/medic-alert-icon.png',
      badge: '/medic-alert-badge.png',
      tag: alert.id, // Prevent duplicate notifications
      requireInteraction: alert.alert_severity === 'critical', // Stay visible for critical alerts
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  },

  /**
   * Get all active (non-dismissed, non-resolved) alerts
   */
  getActiveAlerts: () => {
    return get().alerts;
  },

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity: (severity: string) => {
    return get().alerts.filter((a) => a.alert_severity === severity);
  },

  /**
   * Get count of critical alerts
   */
  getCriticalAlertsCount: () => {
    return get().alerts.filter((a) => a.alert_severity === 'critical').length;
  },
}));
