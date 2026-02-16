/**
 * Zustand store for managing real-time medic locations
 *
 * WHY: We need centralized state management for live medic locations that can be
 * accessed by multiple components (map, sidebar, alerts). Zustand provides a simple,
 * performant state store with minimal boilerplate.
 *
 * FEATURES:
 * - Real-time updates via Supabase Realtime
 * - Debouncing (max 1 update per second per medic to prevent map jitter)
 * - Automatic cleanup of stale locations
 * - Connection status tracking
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  last_event?: string; // Last shift event (e.g., "arrived_on_site")
}

interface MedicLocationsState {
  // State
  locations: Map<string, MedicLocation>; // Key: medic_id
  isConnected: boolean;
  lastUpdate: Date | null;
  subscriptionChannel: RealtimeChannel | null;

  // Actions
  updateLocation: (medicId: string, location: Partial<MedicLocation>) => void;
  removeLocation: (medicId: string) => void;
  setConnected: (connected: boolean) => void;
  subscribe: () => void;
  unsubscribe: () => void;
  getActiveMedics: () => MedicLocation[];
  getMedicById: (medicId: string) => MedicLocation | undefined;
}

// Debounce map: Prevents updating same medic more than once per second
const debounceMap = new Map<string, number>();
const DEBOUNCE_MS = 1000; // 1 second

export const useMedicLocationsStore = create<MedicLocationsState>((set, get) => ({
  locations: new Map(),
  isConnected: false,
  lastUpdate: null,
  subscriptionChannel: null,

  /**
   * Update a medic's location (with debouncing)
   */
  updateLocation: (medicId: string, update: Partial<MedicLocation>) => {
    const now = Date.now();
    const lastUpdateTime = debounceMap.get(medicId) || 0;

    // Debounce: Skip if updated less than 1 second ago
    if (now - lastUpdateTime < DEBOUNCE_MS) {
      console.log(`[Realtime] Debounced update for medic ${medicId}`);
      return;
    }

    debounceMap.set(medicId, now);

    set((state) => {
      const locations = new Map(state.locations);
      const existing = locations.get(medicId);

      if (existing) {
        // Merge with existing location
        locations.set(medicId, { ...existing, ...update });
      } else {
        // New location (need full object)
        if (isFullLocation(update)) {
          locations.set(medicId, update as MedicLocation);
        } else {
          console.warn('[Realtime] Received partial update for unknown medic:', medicId);
          return state;
        }
      }

      return {
        locations,
        lastUpdate: new Date(),
      };
    });
  },

  /**
   * Remove a medic's location (when shift ends)
   */
  removeLocation: (medicId: string) => {
    set((state) => {
      const locations = new Map(state.locations);
      locations.delete(medicId);
      debounceMap.delete(medicId);
      return { locations };
    });
  },

  /**
   * Set connection status
   */
  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  /**
   * Subscribe to real-time updates
   */
  subscribe: () => {
    console.log('[Realtime] Setting up subscriptions...');

    // Unsubscribe from existing channel if any
    const existingChannel = get().subscriptionChannel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    // Create new channel for location pings
    const channel = supabase
      .channel('medic-locations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medic_location_pings',
          // Filter to only today's pings (reduce bandwidth)
          filter: `recorded_at=gte.${new Date().toISOString().split('T')[0]}`,
        },
        (payload) => {
          console.log('[Realtime] Location ping received:', payload);
          const ping = payload.new as any;

          // Update location in store
          get().updateLocation(ping.medic_id, {
            medic_id: ping.medic_id,
            latitude: ping.latitude,
            longitude: ping.longitude,
            accuracy_meters: ping.accuracy_meters,
            battery_level: ping.battery_level,
            connection_type: ping.connection_type,
            recorded_at: ping.recorded_at,
            // TODO: Fetch medic name and booking details from joined query
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medic_shift_events',
        },
        (payload) => {
          console.log('[Realtime] Shift event received:', payload);
          const event = payload.new as any;

          // Update medic status based on event
          const existing = get().locations.get(event.medic_id);
          if (existing) {
            let newStatus: MedicLocation['status'] = existing.status;

            switch (event.event_type) {
              case 'arrived_on_site':
                newStatus = 'on_site';
                break;
              case 'left_site':
                newStatus = 'traveling';
                break;
              case 'break_started':
                newStatus = 'break';
                break;
              case 'break_ended':
                newStatus = 'on_site'; // Assume back on site after break
                break;
              case 'battery_critical':
              case 'battery_died':
                newStatus = 'issue';
                break;
              case 'connection_lost':
                newStatus = 'offline';
                break;
              case 'connection_restored':
                newStatus = 'on_site'; // Assume on site when reconnected
                break;
            }

            get().updateLocation(event.medic_id, {
              status: newStatus,
              last_event: event.event_type,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        get().setConnected(status === 'SUBSCRIBED');
      });

    set({ subscriptionChannel: channel });
  },

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe: () => {
    const channel = get().subscriptionChannel;
    if (channel) {
      console.log('[Realtime] Unsubscribing...');
      supabase.removeChannel(channel);
      set({ subscriptionChannel: null, isConnected: false });
    }
  },

  /**
   * Get all active medics
   */
  getActiveMedics: () => {
    return Array.from(get().locations.values());
  },

  /**
   * Get medic by ID
   */
  getMedicById: (medicId: string) => {
    return get().locations.get(medicId);
  },
}));

/**
 * Type guard: Check if update is a full location object
 */
function isFullLocation(update: Partial<MedicLocation>): boolean {
  return !!(
    update.medic_id &&
    update.booking_id &&
    update.latitude !== undefined &&
    update.longitude !== undefined
  );
}

/**
 * Hook for auto-subscribing on mount
 */
export function useRealtimeMedicLocations() {
  const subscribe = useMedicLocationsStore((state) => state.subscribe);
  const unsubscribe = useMedicLocationsStore((state) => state.unsubscribe);
  const locations = useMedicLocationsStore((state) => state.getActiveMedics());
  const isConnected = useMedicLocationsStore((state) => state.isConnected);

  // Subscribe on mount, unsubscribe on unmount
  if (typeof window !== 'undefined') {
    // Only run in browser (not SSR)
    React.useEffect(() => {
      subscribe();
      return () => unsubscribe();
    }, []);
  }

  return { locations, isConnected };
}

// Import React for useEffect
import React from 'react';
