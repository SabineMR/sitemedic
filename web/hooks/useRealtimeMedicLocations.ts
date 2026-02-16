/**
 * Hook for subscribing to real-time medic locations
 *
 * WHY: Provides a clean React hook interface for components that need live medic data.
 * Auto-subscribes on mount and cleans up on unmount.
 *
 * USAGE:
 * const { locations, isConnected, lastUpdate } = useRealtimeMedicLocations();
 */

import { useEffect } from 'react';
import { useMedicLocationsStore } from '@/stores/useMedicLocationsStore';

export function useRealtimeMedicLocations() {
  const subscribe = useMedicLocationsStore((state) => state.subscribe);
  const unsubscribe = useMedicLocationsStore((state) => state.unsubscribe);
  const locations = useMedicLocationsStore((state) => state.getActiveMedics());
  const isConnected = useMedicLocationsStore((state) => state.isConnected);
  const lastUpdate = useMedicLocationsStore((state) => state.lastUpdate);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  return {
    locations,
    isConnected,
    lastUpdate,
  };
}

/**
 * Hook for getting a specific medic's location
 */
export function useMedicLocation(medicId: string) {
  const medic = useMedicLocationsStore((state) => state.getMedicById(medicId));
  return medic;
}
