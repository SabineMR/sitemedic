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
 * - medicContext Map: populated once at subscribe time with joined medic+booking data
 *   (medic_name, site_name, shift_start_time, shift_end_time) — no N+1 queries
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Per-medic context fetched once at subscribe time from a joined bookings+medics query.
 * Merged into each location ping so map markers can display rich context without
 * issuing per-ping database queries (N+1 anti-pattern avoided).
 */
interface MedicContextEntry {
  medic_name: string;
  booking_id: string;
  site_name: string;
  shift_start_time: string;  // "07:00:00" from PostgreSQL TIME
  shift_end_time: string;    // "15:00:00"
  medic_phone: string | null;
}

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
  shift_start_time?: string; // "07:00:00" from context — for map marker display
  shift_end_time?: string;   // "15:00:00" from context — for map marker display
}

interface MedicLocationsState {
  // State
  locations: Map<string, MedicLocation>; // Key: medic_id
  medicContext: Map<string, MedicContextEntry>; // Key: medic_id — populated once at subscribe time
  isConnected: boolean;
  lastUpdate: Date | null;
  subscriptionChannel: RealtimeChannel | null;

  // Actions
  updateLocation: (medicId: string, location: Partial<MedicLocation>) => void;
  removeLocation: (medicId: string) => void;
  setConnected: (connected: boolean) => void;
  subscribe: () => Promise<void>;
  unsubscribe: () => void;
  getActiveMedics: () => MedicLocation[];
  getMedicById: (medicId: string) => MedicLocation | undefined;
}

// Debounce map: Prevents updating same medic more than once per second
const debounceMap = new Map<string, number>();
const DEBOUNCE_MS = 1000; // 1 second

export const useMedicLocationsStore = create<MedicLocationsState>((set, get) => ({
  locations: new Map(),
  medicContext: new Map(),
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
   * Subscribe to real-time updates.
   *
   * STRATEGY: Fetch medic+booking context ONCE before opening the Realtime channel.
   * Each incoming ping is enriched from the in-memory medicContext Map — no per-ping
   * database queries (N+1 avoided). Context includes medic_name, site_name, and shift
   * times for both 'confirmed' and 'in_progress' bookings so medics whose shifts have
   * not yet started (still 'confirmed') are not silently dropped.
   */
  subscribe: async () => {
    // Unsubscribe from existing channel if any
    const existingChannel = get().subscriptionChannel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    // --- STEP 1: Fetch medic + booking context (single joined query, no N+1) ---
    const today = new Date().toISOString().split('T')[0];

    const { data: bookings, error: contextError } = await supabase
      .from('bookings')
      .select(`
        id,
        site_name,
        shift_start_time,
        shift_end_time,
        medic_id,
        medics!inner (
          first_name,
          last_name,
          phone
        )
      `)
      .in('status', ['confirmed', 'in_progress'])
      .eq('shift_date', today);

    if (contextError) {
      console.error('[Realtime] Failed to fetch medic context:', contextError.message);
    }

    // Build medicContext Map: medic_id → MedicContextEntry
    const medicContext = new Map<string, MedicContextEntry>();
    (bookings ?? []).forEach((b: any) => {
      if (b.medic_id && b.medics) {
        medicContext.set(b.medic_id, {
          medic_name: `${b.medics.first_name} ${b.medics.last_name}`,
          booking_id: b.id,
          site_name: b.site_name,
          shift_start_time: b.shift_start_time,
          shift_end_time: b.shift_end_time,
          medic_phone: b.medics.phone,
        });
      }
    });
    set({ medicContext });

    // --- STEP 2: Open Realtime channel and merge context on each ping ---
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
          const ping = payload.new as any;

          // Merge per-medic context (fetched once above) into location update
          const context = get().medicContext.get(ping.medic_id);

          get().updateLocation(ping.medic_id, {
            medic_id: ping.medic_id,
            latitude: ping.latitude,
            longitude: ping.longitude,
            accuracy_meters: ping.accuracy_meters,
            battery_level: ping.battery_level,
            connection_type: ping.connection_type,
            recorded_at: ping.recorded_at,
            medic_name: context?.medic_name ?? 'Unknown Medic',
            booking_id: context?.booking_id ?? ping.booking_id,
            site_name: context?.site_name ?? 'Unknown Site',
            shift_start_time: context?.shift_start_time,
            shift_end_time: context?.shift_end_time,
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

  // Subscribe on mount, unsubscribe on unmount (always call hook, guard inside)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    subscribe();
    return () => unsubscribe();
  }, []);

  return { locations, isConnected };
}

// Import React for useEffect
import React from 'react';
