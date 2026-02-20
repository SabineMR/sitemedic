/**
 * Zustand store for Direct Job (Self-Procured) Creation Wizard
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * Manages the 6-step wizard state with draft persistence.
 * Steps: Client Details -> Job Info -> Schedule -> Staffing -> Pricing -> Review
 *
 * Follows the same pattern as useEventPostingStore.ts (Phase 33).
 */

import { create } from 'zustand';
import type {
  EventType,
  IndoorOutdoor,
  StaffingRole,
  EquipmentItem,
} from '@/lib/marketplace/event-types';
import type { DirectJob } from '@/lib/direct-jobs/types';

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

interface DirectJobState {
  currentStep: number;

  // Step 0: Client Details
  existing_client_id: string | null;
  client_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postcode: string;

  // Step 1: Job Info
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

  // Step 3: Staffing & Equipment
  staffing_requirements: StaffingInput[];
  equipment_required: EquipmentItem[];

  // Step 4: Pricing
  agreed_price: number | null;
  deposit_percent: number;
  notes: string;

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
  setExistingClient: (client: { id: string; client_name: string; contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null; address_line_1?: string | null; address_line_2?: string | null; city?: string | null; postcode?: string | null } | null) => void;
  setSubmitting: (v: boolean) => void;
  setError: (e: string | null) => void;
  setDraftId: (id: string | null) => void;
  loadDraft: (job: DirectJob) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  currentStep: 0,

  // Step 0: Client Details
  existing_client_id: null as string | null,
  client_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  postcode: '',

  // Step 1: Job Info
  event_name: '',
  event_type: '' as EventType | '',
  event_description: '',
  special_requirements: '',
  indoor_outdoor: 'outdoor' as IndoorOutdoor,
  expected_attendance: null as number | null,

  // Step 2: Schedule & Location
  event_days: [{ event_date: '', start_time: '', end_time: '' }] as EventDayInput[],
  location_postcode: '',
  location_address: '',
  location_what3words: '',
  location_lat: null as number | null,
  location_lng: null as number | null,
  location_display: '',

  // Step 3: Staffing & Equipment
  staffing_requirements: [{ event_day_id: null, role: '', quantity: 1, additional_notes: '' }] as StaffingInput[],
  equipment_required: [] as EquipmentItem[],

  // Step 4: Pricing
  agreed_price: null as number | null,
  deposit_percent: 25,
  notes: '',

  // Meta
  isSubmitting: false,
  error: null as string | null,
  draftId: null as string | null,
};

export const useDirectJobStore = create<DirectJobState>((set) => ({
  ...DEFAULT_STATE,

  setStep: (step: number) => set({ currentStep: step, error: null }),

  updateField: (field: string, value: unknown) => set({ [field]: value } as Partial<DirectJobState>),

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

  setExistingClient: (client) => {
    if (client) {
      set({
        existing_client_id: client.id,
        client_name: client.client_name,
        contact_name: client.contact_name || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        address_line_1: client.address_line_1 || '',
        address_line_2: client.address_line_2 || '',
        city: client.city || '',
        postcode: client.postcode || '',
      });
    } else {
      set({
        existing_client_id: null,
        client_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        postcode: '',
      });
    }
  },

  setSubmitting: (v: boolean) => set({ isSubmitting: v }),
  setError: (e: string | null) => set({ error: e }),
  setDraftId: (id: string | null) => set({ draftId: id }),

  loadDraft: (job: DirectJob) =>
    set({
      existing_client_id: job.client_id,
      client_name: job.client?.client_name || '',
      contact_name: job.client?.contact_name || '',
      contact_email: job.client?.contact_email || '',
      contact_phone: job.client?.contact_phone || '',
      address_line_1: job.client?.address_line_1 || '',
      address_line_2: job.client?.address_line_2 || '',
      city: job.client?.city || '',
      postcode: job.client?.postcode || '',
      event_name: job.event_name,
      event_type: job.event_type,
      event_description: job.event_description || '',
      special_requirements: job.special_requirements || '',
      indoor_outdoor: job.indoor_outdoor,
      expected_attendance: job.expected_attendance,
      event_days: job.event_days.map((d) => ({
        event_date: d.event_date,
        start_time: d.start_time,
        end_time: d.end_time,
      })),
      location_postcode: job.location_postcode,
      location_address: job.location_address || '',
      location_what3words: job.location_what3words || '',
      location_display: job.location_display || '',
      staffing_requirements: job.event_staffing_requirements.map((s) => ({
        event_day_id: s.event_day_id,
        role: s.role,
        quantity: s.quantity,
        additional_notes: s.additional_notes || '',
      })),
      equipment_required: job.equipment_required,
      agreed_price: job.agreed_price,
      deposit_percent: 25,
      notes: '',
      draftId: job.id,
      currentStep: 0,
    }),

  reset: () => set({ ...DEFAULT_STATE }),
}));
