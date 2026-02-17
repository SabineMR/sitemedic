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
  assignMedicToBooking: (bookingId: string, medicId: string) => Promise<void>;
  checkConflicts: (params: ConflictCheckParams) => Promise<ConflictCheckResult>;
  subscribe: () => void;
  unsubscribe: () => void;
  setCurrentConflict: (conflict: ConflictCheckResult | null) => void;

  // Getters
  getBookingsForMedicOnDate: (medicId: string, date: string) => Booking[];
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

/**
 * Generate mock schedule data for local development
 * Used when Supabase edge functions aren't running (Docker not started)
 */
function generateMockScheduleData(weekStart: string): {
  medics: MedicWithStats[];
  bookings: Booking[];
  dates: string[];
} {
  const dates = generateWeekDates(weekStart);

  // Mock medics
  const medics: MedicWithStats[] = [
    {
      id: 'mock-medic-1',
      first_name: 'John',
      last_name: 'Smith',
      star_rating: 4.8,
      has_confined_space_cert: true,
      has_trauma_cert: true,
      weekly_hours: 24,
      utilization_percent: 60,
      shifts_this_week: 3,
    },
    {
      id: 'mock-medic-2',
      first_name: 'Sarah',
      last_name: 'Johnson',
      star_rating: 4.5,
      has_confined_space_cert: false,
      has_trauma_cert: true,
      weekly_hours: 16,
      utilization_percent: 40,
      shifts_this_week: 2,
    },
    {
      id: 'mock-medic-3',
      first_name: 'Mike',
      last_name: 'Davis',
      star_rating: 4.9,
      has_confined_space_cert: true,
      has_trauma_cert: false,
      weekly_hours: 32,
      utilization_percent: 80,
      shifts_this_week: 4,
    },
  ];

  // Mock bookings (some assigned, some unassigned)
  const bookings: Booking[] = [
    // Assigned bookings
    {
      id: 'mock-booking-1',
      medic_id: 'mock-medic-1',
      shift_date: dates[0], // Monday
      shift_start_time: '08:00:00',
      shift_end_time: '16:00:00',
      shift_hours: 8,
      status: 'confirmed',
      site_name: 'Construction Site A',
      confined_space_required: true,
      trauma_specialist_required: false,
      urgency_premium_percent: 0,
      clients: { company_name: 'ABC Construction' },
    },
    {
      id: 'mock-booking-2',
      medic_id: 'mock-medic-1',
      shift_date: dates[2], // Wednesday
      shift_start_time: '09:00:00',
      shift_end_time: '17:00:00',
      shift_hours: 8,
      status: 'confirmed',
      site_name: 'Industrial Park B',
      confined_space_required: false,
      trauma_specialist_required: true,
      urgency_premium_percent: 0,
      clients: { company_name: 'XYZ Industries' },
    },
    {
      id: 'mock-booking-3',
      medic_id: 'mock-medic-2',
      shift_date: dates[1], // Tuesday
      shift_start_time: '07:00:00',
      shift_end_time: '15:00:00',
      shift_hours: 8,
      status: 'confirmed',
      site_name: 'Office Building C',
      confined_space_required: false,
      trauma_specialist_required: false,
      urgency_premium_percent: 0,
      clients: { company_name: 'Tech Corp' },
    },
    {
      id: 'mock-booking-4',
      medic_id: 'mock-medic-3',
      shift_date: dates[0], // Monday
      shift_start_time: '06:00:00',
      shift_end_time: '14:00:00',
      shift_hours: 8,
      status: 'confirmed',
      site_name: 'Factory D',
      confined_space_required: true,
      trauma_specialist_required: false,
      urgency_premium_percent: 0,
      clients: { company_name: 'Manufacturing Ltd' },
    },
    // Unassigned bookings
    {
      id: 'mock-booking-5',
      medic_id: null,
      shift_date: dates[3], // Thursday
      shift_start_time: '08:00:00',
      shift_end_time: '16:00:00',
      shift_hours: 8,
      status: 'pending',
      site_name: 'Warehouse E',
      confined_space_required: false,
      trauma_specialist_required: false,
      urgency_premium_percent: 0,
      clients: { company_name: 'Logistics Co' },
    },
    {
      id: 'mock-booking-6',
      medic_id: null,
      shift_date: dates[4], // Friday
      shift_start_time: '10:00:00',
      shift_end_time: '18:00:00',
      shift_hours: 8,
      status: 'urgent_broadcast',
      site_name: 'Emergency Site F',
      confined_space_required: true,
      trauma_specialist_required: true,
      urgency_premium_percent: 25,
      clients: { company_name: 'Emergency Services' },
    },
    {
      id: 'mock-booking-7',
      medic_id: null,
      shift_date: dates[3], // Thursday
      shift_start_time: '13:00:00',
      shift_end_time: '21:00:00',
      shift_hours: 8,
      status: 'pending',
      site_name: 'Night Shift Site G',
      confined_space_required: false,
      trauma_specialist_required: true,
      urgency_premium_percent: 10,
      clients: { company_name: 'Night Works Ltd' },
    },
  ];

  return { medics, bookings, dates };
}

export const useScheduleBoardStore = create<ScheduleBoardState>((set, get) => ({
  // Initial state
  selectedWeekStart: getMondayOfCurrentWeek(),
  dates: generateWeekDates(getMondayOfCurrentWeek()),
  medics: [],
  bookings: [],
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
   * Falls back to mock data if API unavailable (e.g., Docker/Supabase not running)
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
    } catch (error) {
      console.warn('[ScheduleBoard] API unavailable, using mock data for development:', error);

      // Use mock data for local development when Supabase isn't running
      const mockData = generateMockScheduleData(selectedWeekStart);
      set({
        medics: mockData.medics,
        bookings: mockData.bookings,
        dates: mockData.dates,
        isLoading: false,
        error: 'Using mock data (Supabase not running)',
      });
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
    } catch (error) {
      console.warn('[ScheduleBoard] API unavailable, using basic client-side validation:', error);

      // Fallback: Basic client-side conflict checking for development
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
