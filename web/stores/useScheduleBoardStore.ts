/**
 * Zustand store for Schedule Board drag-and-drop interface
 *
 * WHY: Centralized state management for schedule data, conflict detection,
 * and real-time booking updates. This store powers the admin schedule board
 * where admins can visually assign medics to bookings.
 *
 * FEATURES:
 * - Week-based view navigation
 * - Real-time booking updates via Supabase Realtime
 * - Conflict detection before assignment
 * - Drag-and-drop state management
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  MedicWithStats,
  Booking,
  BusyBlock,
  ConflictCheckResult,
  Conflict,
  ConflictCheckParams,
  ScheduleBoardData,
} from '@/types/schedule';

interface ScheduleBoardState {
  // View state
  selectedWeekStart: string; // ISO date (Monday)
  dates: string[]; // 7-day array

  // Data from schedule-board-api
  medics: MedicWithStats[];
  bookings: Booking[]; // All bookings for the week
  busyBlocks: Record<string, BusyBlock[]>; // Keyed by medicId
  isLoading: boolean;
  error: string | null;

  // Real-time
  isConnected: boolean;
  realtimeChannel: RealtimeChannel | null;

  // UI state
  draggedBooking: Booking | null;
  currentConflict: ConflictCheckResult | null;

  // Actions
  setWeek: (weekStart: string) => void;
  fetchScheduleData: () => Promise<void>;
  fetchBusyBlocks: () => Promise<void>;
  assignMedicToBooking: (bookingId: string, medicId: string) => Promise<void>;
  checkConflicts: (params: ConflictCheckParams) => Promise<ConflictCheckResult>;
  subscribe: () => void;
  unsubscribe: () => void;
  setCurrentConflict: (conflict: ConflictCheckResult | null) => void;

  // Getters
  getBookingsForMedicOnDate: (medicId: string, date: string) => Booking[];
  getBusyBlocksForMedicOnDate: (medicId: string, date: string) => BusyBlock[];
  getUnassignedBookings: () => Booking[];
  getBookingById: (bookingId: string) => Booking | undefined;
}

/**
 * Get Monday of current week
 */
function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Generate 7-day array starting from Monday
 */
function generateWeekDates(mondayDate: string): string[] {
  const dates: string[] = [];
  const monday = new Date(mondayDate);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Basic client-side conflict checking for development mode
 * Only checks double-booking and qualifications (subset of full API checks)
 */
function performBasicConflictCheck(
  params: ConflictCheckParams,
  bookings: Booking[],
  medics: MedicWithStats[]
): ConflictCheckResult {
  const conflicts: Conflict[] = [];

  // Find the medic
  const medic = medics.find((m) => m.id === params.medic_id);
  if (!medic) {
    return {
      can_assign: false,
      total_conflicts: 1,
      critical_conflicts: 1,
      conflicts: [
        {
          type: 'medic_not_found',
          severity: 'critical',
          message: 'Medic not found in system',
          can_override: false,
        },
      ],
      recommendation: 'Cannot assign - medic not found',
    };
  }

  // Check 1: Double-booking (overlapping shifts on same date)
  const overlappingBookings = bookings.filter(
    (b) =>
      b.medic_id === params.medic_id &&
      b.shift_date === params.shift_date &&
      b.id !== params.booking_id
  );

  if (overlappingBookings.length > 0) {
    conflicts.push({
      type: 'double_booking',
      severity: 'critical',
      message: `Medic already has ${overlappingBookings.length} shift(s) on this date`,
      can_override: false,
    });
  }

  // Check 2: Missing qualifications
  if (params.confined_space_required && !medic.has_confined_space_cert) {
    conflicts.push({
      type: 'missing_qualification',
      severity: 'critical',
      message: 'Medic lacks required Confined Space certification',
      can_override: false,
    });
  }

  if (params.trauma_specialist_required && !medic.has_trauma_cert) {
    conflicts.push({
      type: 'missing_qualification',
      severity: 'critical',
      message: 'Medic lacks required Trauma Specialist certification',
      can_override: false,
    });
  }

  // Determine if can assign
  const criticalConflicts = conflicts.filter((c) => c.severity === 'critical').length;
  const canAssign = criticalConflicts === 0;

  return {
    can_assign: canAssign,
    total_conflicts: conflicts.length,
    critical_conflicts: criticalConflicts,
    conflicts,
    recommendation: canAssign
      ? 'No conflicts detected - safe to assign'
      : 'Cannot assign due to critical conflicts',
  };
}


export const useScheduleBoardStore = create<ScheduleBoardState>((set, get) => ({
  // Initial state
  selectedWeekStart: getMondayOfCurrentWeek(),
  dates: generateWeekDates(getMondayOfCurrentWeek()),
  medics: [],
  bookings: [],
  busyBlocks: {},
  isLoading: false,
  error: null,
  isConnected: false,
  realtimeChannel: null,
  draggedBooking: null,
  currentConflict: null,

  /**
   * Set the selected week (Monday date)
   */
  setWeek: (weekStart: string) => {
    set({
      selectedWeekStart: weekStart,
      dates: generateWeekDates(weekStart),
    });
    // Automatically fetch data for new week
    get().fetchScheduleData();
  },

  /**
   * Fetch schedule data from schedule-board-api edge function
   * Sets error state if API unavailable; shows empty grid when no bookings found
   */
  fetchScheduleData: async () => {
    const { selectedWeekStart } = get();
    set({ isLoading: true, error: null });

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/schedule-board-api?view=week&date=${selectedWeekStart}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch schedule data: ${response.statusText}`);
      }

      const data: ScheduleBoardData = await response.json();

      // Convert bookings_by_date to flat array
      const allBookings: Booking[] = [];
      Object.values(data.bookings_by_date || {}).forEach((dayBookings) => {
        allBookings.push(...dayBookings);
      });

      set({
        medics: data.medics || [],
        bookings: allBookings,
        dates: data.dates || get().dates,
        isLoading: false,
      });

      // Also fetch busy blocks for this week
      get().fetchBusyBlocks();
    } catch (error) {
      set({
        medics: [],
        bookings: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load schedule data',
      });
    }
  },

  /**
   * Fetch busy blocks (Google Calendar + manual + time-off) for the current week
   */
  fetchBusyBlocks: async () => {
    const { selectedWeekStart } = get();
    try {
      const response = await fetch(
        `/api/google-calendar/busy-blocks?weekStart=${selectedWeekStart}`
      );

      if (!response.ok) {
        console.error('[ScheduleBoard] Failed to fetch busy blocks:', response.statusText);
        return;
      }

      const data = await response.json();
      set({ busyBlocks: data.busyBlocks || {} });
    } catch (error) {
      console.error('[ScheduleBoard] Error fetching busy blocks:', error);
    }
  },

  /**
   * Check conflicts before assigning a medic to a booking
   * Falls back to basic client-side validation if API unavailable
   */
  checkConflicts: async (params: ConflictCheckParams): Promise<ConflictCheckResult> => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/conflict-detector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Conflict check failed: ${response.statusText}`);
      }

      const result: ConflictCheckResult = await response.json();
      return result;
    } catch {
      return performBasicConflictCheck(params, get().bookings, get().medics);
    }
  },

  /**
   * Assign a medic to a booking (update database)
   */
  assignMedicToBooking: async (bookingId: string, medicId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          medic_id: medicId,
          status: 'confirmed',
        })
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      // Optimistically update local state
      set((state) => ({
        bookings: state.bookings.map((b) =>
          b.id === bookingId
            ? { ...b, medic_id: medicId, status: 'confirmed' as const }
            : b
        ),
      }));

      // Push booking to medic's Google Calendar (fire-and-forget)
      fetch('/api/google-calendar/push-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, medicId }),
      }).catch((err) => {
        console.warn('[ScheduleBoard] Failed to push event to Google Calendar:', err);
      });

    } catch (error) {
      console.error('[ScheduleBoard] Error assigning booking:', error);
      // Re-fetch to ensure consistency
      await get().fetchScheduleData();
      throw error;
    }
  },

  /**
   * Subscribe to real-time booking updates
   */
  subscribe: () => {
    // Unsubscribe from existing channel if any
    const existingChannel = get().realtimeChannel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const { selectedWeekStart, dates } = get();
    const weekEnd = dates[dates.length - 1]; // Sunday

    // Subscribe to bookings changes for the current week
    const channel = supabase
      .channel('schedule-board')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
          filter: `shift_date=gte.${selectedWeekStart}`,
        },
        (payload) => {
          // Re-fetch schedule data to stay in sync
          // (In a production app, you might want to handle INSERTs/UPDATEs/DELETEs individually for better performance)
          get().fetchScheduleData();
        }
      )
      .subscribe((status) => {
        set({ isConnected: status === 'SUBSCRIBED' });
      });

    set({ realtimeChannel: channel });
  },

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ realtimeChannel: null, isConnected: false });
    }
  },

  /**
   * Set current conflict modal state
   */
  setCurrentConflict: (conflict: ConflictCheckResult | null) => {
    set({ currentConflict: conflict });
  },

  /**
   * Get all bookings for a specific medic on a specific date
   */
  getBookingsForMedicOnDate: (medicId: string, date: string): Booking[] => {
    return get().bookings.filter(
      (b) => b.medic_id === medicId && b.shift_date === date
    );
  },

  /**
   * Get all busy blocks for a specific medic on a specific date
   */
  getBusyBlocksForMedicOnDate: (medicId: string, date: string): BusyBlock[] => {
    const medicBlocks = get().busyBlocks[medicId] || [];
    return medicBlocks.filter((b) => b.date === date);
  },

  /**
   * Get all unassigned bookings
   */
  getUnassignedBookings: (): Booking[] => {
    return get().bookings.filter((b) => !b.medic_id);
  },

  /**
   * Get booking by ID
   */
  getBookingById: (bookingId: string): Booking | undefined => {
    return get().bookings.find((b) => b.id === bookingId);
  },
}));
