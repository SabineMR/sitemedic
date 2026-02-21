/**
 * Zustand store for Event Posting Wizard
 * Phase 33: Event Posting & Discovery
 *
 * Manages the 4-step event posting wizard state with draft persistence.
 * Steps: Basic Info → Schedule & Location → Staffing & Equipment → Review
 */

import { create } from 'zustand';
import { MARKETPLACE_DEFAULTS } from '@/lib/marketplace/admin-settings-defaults';
import type {
  EventType,
  IndoorOutdoor,
  StaffingRole,
  EquipmentItem,
  MarketplaceEventWithDetails,
} from '@/lib/marketplace/event-types';

interface EventDayInput {
  event_date: string;
  start_time: string;
  end_time: string;
}

interface StaffingInput {
  event_day_id: string | null;
  role: StaffingRole | '';
  quantity: number;
  additional_notes: string;
}

interface EventPostingState {
  currentStep: number;

  // Step 1: Basic Info
  event_name: string;
  event_type: EventType | '';
  event_description: string;
  special_requirements: string;
  indoor_outdoor: IndoorOutdoor;
  expected_attendance: number | null;

  // Step 2: Schedule & Location
  event_days: EventDayInput[];
  location_postcode: string;
  location_address: string;
  location_what3words: string;
  location_lat: number | null;
  location_lng: number | null;
  location_display: string;
  quote_deadline: string;

  // Step 3: Staffing & Equipment
  staffing_requirements: StaffingInput[];
  equipment_required: EquipmentItem[];
  budget_min: number | null;
  budget_max: number | null;

  // Meta
  isSubmitting: boolean;
  error: string | null;
  draftId: string | null;

  // Actions
  setStep: (step: number) => void;
  updateField: (field: string, value: unknown) => void;
  addEventDay: () => void;
  removeEventDay: (index: number) => void;
  updateEventDay: (index: number, field: string, value: string) => void;
  addStaffingRequirement: () => void;
  removeStaffingRequirement: (index: number) => void;
  updateStaffingRequirement: (index: number, field: string, value: unknown) => void;
  toggleEquipment: (type: EquipmentItem['type']) => void;
  updateEquipmentNotes: (type: EquipmentItem['type'], notes: string) => void;
  setSubmitting: (v: boolean) => void;
  setError: (e: string | null) => void;
  setDraftId: (id: string | null) => void;
  hydrateDefaults: () => Promise<void>;
  loadDraft: (event: MarketplaceEventWithDetails) => void;
  reset: () => void;
}

function getDefaultQuoteDeadlineValue(defaultHours: number): string {
  const now = new Date();
  now.setHours(now.getHours() + defaultHours, 0, 0, 0);
  return now.toISOString().slice(0, 16);
}

const DEFAULT_STATE = {
  currentStep: 0,
  event_name: '',
  event_type: '' as EventType | '',
  event_description: '',
  special_requirements: '',
  indoor_outdoor: 'outdoor' as IndoorOutdoor,
  expected_attendance: null as number | null,
  event_days: [{ event_date: '', start_time: '', end_time: '' }] as EventDayInput[],
  location_postcode: '',
  location_address: '',
  location_what3words: '',
  location_lat: null as number | null,
  location_lng: null as number | null,
  location_display: '',
  quote_deadline: '',
  staffing_requirements: [{ event_day_id: null, role: '', quantity: 1, additional_notes: '' }] as StaffingInput[],
  equipment_required: [] as EquipmentItem[],
  budget_min: null as number | null,
  budget_max: null as number | null,
  isSubmitting: false,
  error: null as string | null,
  draftId: null as string | null,
};

export const useEventPostingStore = create<EventPostingState>((set) => ({
  ...DEFAULT_STATE,

  setStep: (step: number) => set({ currentStep: step, error: null }),

  updateField: (field: string, value: unknown) => set({ [field]: value } as Partial<EventPostingState>),

  addEventDay: () =>
    set((state) => ({
      event_days: [...state.event_days, { event_date: '', start_time: '', end_time: '' }],
    })),

  removeEventDay: (index: number) =>
    set((state) => ({
      event_days: state.event_days.filter((_, i) => i !== index),
    })),

  updateEventDay: (index: number, field: string, value: string) =>
    set((state) => ({
      event_days: state.event_days.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      ),
    })),

  addStaffingRequirement: () =>
    set((state) => ({
      staffing_requirements: [
        ...state.staffing_requirements,
        { event_day_id: null, role: '' as StaffingRole | '', quantity: 1, additional_notes: '' },
      ],
    })),

  removeStaffingRequirement: (index: number) =>
    set((state) => ({
      staffing_requirements: state.staffing_requirements.filter((_, i) => i !== index),
    })),

  updateStaffingRequirement: (index: number, field: string, value: unknown) =>
    set((state) => ({
      staffing_requirements: state.staffing_requirements.map((req, i) =>
        i === index ? { ...req, [field]: value } : req
      ),
    })),

  toggleEquipment: (type: EquipmentItem['type']) =>
    set((state) => {
      const exists = state.equipment_required.find((e) => e.type === type);
      if (exists) {
        return { equipment_required: state.equipment_required.filter((e) => e.type !== type) };
      }
      return { equipment_required: [...state.equipment_required, { type }] };
    }),

  updateEquipmentNotes: (type: EquipmentItem['type'], notes: string) =>
    set((state) => ({
      equipment_required: state.equipment_required.map((e) =>
        e.type === type ? { ...e, notes } : e
      ),
    })),

  setSubmitting: (v: boolean) => set({ isSubmitting: v }),
  setError: (e: string | null) => set({ error: e }),
  setDraftId: (id: string | null) => set({ draftId: id }),
  hydrateDefaults: async () => {
    try {
      const response = await fetch('/api/marketplace/settings/defaults', { cache: 'no-store' });
      if (!response.ok) {
        set((state) => ({
          quote_deadline:
            state.quote_deadline || getDefaultQuoteDeadlineValue(MARKETPLACE_DEFAULTS.defaultQuoteDeadlineHours),
        }));
        return;
      }

      const payload = await response.json();
      const defaultHours = Number(payload?.defaults?.defaultQuoteDeadlineHours);

      set((state) => ({
        quote_deadline:
          state.quote_deadline ||
          getDefaultQuoteDeadlineValue(
            Number.isFinite(defaultHours) && defaultHours > 0
              ? defaultHours
              : MARKETPLACE_DEFAULTS.defaultQuoteDeadlineHours
          ),
      }));
    } catch {
      set((state) => ({
        quote_deadline:
          state.quote_deadline || getDefaultQuoteDeadlineValue(MARKETPLACE_DEFAULTS.defaultQuoteDeadlineHours),
      }));
    }
  },

  loadDraft: (event: MarketplaceEventWithDetails) =>
    set({
      event_name: event.event_name,
      event_type: event.event_type,
      event_description: event.event_description || '',
      special_requirements: event.special_requirements || '',
      indoor_outdoor: event.indoor_outdoor,
      expected_attendance: event.expected_attendance,
      event_days: event.event_days.map((d) => ({
        event_date: d.event_date,
        start_time: d.start_time,
        end_time: d.end_time,
      })),
      location_postcode: event.location_postcode,
      location_address: event.location_address || '',
      location_what3words: event.location_what3words || '',
      location_display: event.location_display || '',
      quote_deadline: event.quote_deadline,
      staffing_requirements: event.event_staffing_requirements.map((s) => ({
        event_day_id: s.event_day_id,
        role: s.role,
        quantity: s.quantity,
        additional_notes: s.additional_notes || '',
      })),
      equipment_required: event.equipment_required,
      budget_min: event.budget_min,
      budget_max: event.budget_max,
      draftId: event.id,
      currentStep: 0,
    }),

  reset: () => set({ ...DEFAULT_STATE }),
}));
