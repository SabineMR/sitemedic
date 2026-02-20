/**
 * Zustand Store for Quote Submission Form
 * Phase 34: Quote Submission & Comparison
 *
 * Manages the multi-section quote submission form state:
 *   - Pricing breakdown (staff, equipment, transport, consumables, custom line items)
 *   - Staffing plan (named medics or headcount + qualifications)
 *   - Cover letter and availability confirmation
 *   - Draft saving and submission
 *
 * Follows the same pattern as useEventPostingStore (Phase 33).
 */

import { create } from 'zustand';
import type { QuoteLineItem, StaffingPlanItem, HeadcountPlan, StaffingPlanType } from '@/lib/marketplace/quote-types';
import type { StaffingRole } from '@/lib/marketplace/event-types';

// =============================================================================
// Type Definitions
// =============================================================================

interface QuoteFormState {
  // Quote metadata
  eventId: string;
  draftId: string | null;
  status: 'draft' | 'submitted';

  // Pricing breakdown — itemised
  staffCost: number;
  equipmentCost: number;
  transportCost: number;
  consumablesCost: number;
  customLineItems: QuoteLineItem[];

  // Staffing plan — either named medics OR headcount+quals
  staffingPlanType: StaffingPlanType;
  namedMedics: StaffingPlanItem[];
  headcountPlans: HeadcountPlan[];

  // Cover letter and availability
  coverLetter: string;
  availabilityConfirmed: boolean;

  // UI state
  isSubmitting: boolean;
  isSavingDraft: boolean;
  error: string | null;
  draftSavedAt: Date | null;

  // Actions: basic setters
  setEventId: (eventId: string) => void;
  updatePricing: (data: {
    staffCost?: number;
    equipmentCost?: number;
    transportCost?: number;
    consumablesCost?: number;
  }) => void;
  addCustomLineItem: (item: Omit<QuoteLineItem, 'id'>) => void;
  removeCustomLineItem: (lineItemId: string) => void;
  updateCustomLineItem: (lineItemId: string, item: Partial<QuoteLineItem>) => void;

  // Actions: staffing plan
  setStaffingPlanType: (type: StaffingPlanType) => void;
  addNamedMedic: (medic: StaffingPlanItem) => void;
  removeNamedMedic: (medicId: string) => void;
  updateNamedMedic: (medicId: string, medic: Partial<StaffingPlanItem>) => void;
  addHeadcountPlan: (plan: HeadcountPlan) => void;
  removeHeadcountPlan: (role: StaffingRole) => void;

  // Actions: cover letter and availability
  setCoverLetter: (text: string) => void;
  setAvailabilityConfirmed: (confirmed: boolean) => void;

  // Actions: submit and draft save
  submitQuote: () => Promise<string>;
  saveDraft: () => Promise<string>;
  loadDraft: (quoteData: any) => void;
  reset: () => void;
  setError: (error: string | null) => void;
}

// =============================================================================
// Zustand Store Implementation
// =============================================================================

export const useQuoteFormStore = create<QuoteFormState>((set, get) => ({
  // Initial state
  eventId: '',
  draftId: null,
  status: 'draft',

  staffCost: 0,
  equipmentCost: 0,
  transportCost: 0,
  consumablesCost: 0,
  customLineItems: [],

  staffingPlanType: 'headcount_and_quals',
  namedMedics: [],
  headcountPlans: [],

  coverLetter: '',
  availabilityConfirmed: false,

  isSubmitting: false,
  isSavingDraft: false,
  error: null,
  draftSavedAt: null,

  // =========================================================================
  // Setters
  // =========================================================================

  setEventId: (eventId: string) => set({ eventId }),

  updatePricing: (data) =>
    set((state) => ({
      staffCost: data.staffCost ?? state.staffCost,
      equipmentCost: data.equipmentCost ?? state.equipmentCost,
      transportCost: data.transportCost ?? state.transportCost,
      consumablesCost: data.consumablesCost ?? state.consumablesCost,
    })),

  addCustomLineItem: (item) =>
    set((state) => ({
      customLineItems: [
        ...state.customLineItems,
        { ...item, id: crypto.randomUUID() },
      ],
    })),

  removeCustomLineItem: (lineItemId) =>
    set((state) => ({
      customLineItems: state.customLineItems.filter((item) => item.id !== lineItemId),
    })),

  updateCustomLineItem: (lineItemId, item) =>
    set((state) => ({
      customLineItems: state.customLineItems.map((li) =>
        li.id === lineItemId ? { ...li, ...item } : li
      ),
    })),

  setStaffingPlanType: (type) =>
    set({
      staffingPlanType: type,
      // Clear the other type's data when switching
      namedMedics: type === 'headcount_and_quals' ? [] : undefined,
      headcountPlans: type === 'named_medics' ? [] : undefined,
    }),

  addNamedMedic: (medic) =>
    set((state) => ({
      namedMedics: [...state.namedMedics, medic],
    })),

  removeNamedMedic: (medicId) =>
    set((state) => ({
      namedMedics: state.namedMedics.filter((m) => m.medic_id !== medicId),
    })),

  updateNamedMedic: (medicId, medic) =>
    set((state) => ({
      namedMedics: state.namedMedics.map((m) =>
        m.medic_id === medicId ? { ...m, ...medic } : m
      ),
    })),

  addHeadcountPlan: (plan) =>
    set((state) => ({
      headcountPlans: [...state.headcountPlans, plan],
    })),

  removeHeadcountPlan: (role) =>
    set((state) => ({
      headcountPlans: state.headcountPlans.filter((p) => p.role !== role),
    })),

  setCoverLetter: (text) => set({ coverLetter: text }),

  setAvailabilityConfirmed: (confirmed) => set({ availabilityConfirmed: confirmed }),

  // =========================================================================
  // API Actions: Submit Quote
  // =========================================================================

  submitQuote: async () => {
    const state = get();
    set({ isSubmitting: true, error: null });

    try {
      // Calculate total price
      const fixedTotal = state.staffCost + state.equipmentCost + state.transportCost + state.consumablesCost;
      const customTotal = state.customLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalPrice = fixedTotal + customTotal;

      // Prepare request payload
      const payload = {
        event_id: state.eventId,
        total_price: totalPrice,
        pricing_breakdown: {
          staff_cost: state.staffCost,
          equipment_cost: state.equipmentCost,
          transport_cost: state.transportCost,
          consumables_cost: state.consumablesCost,
          custom_line_items: state.customLineItems,
        },
        staffing_plan: {
          type: state.staffingPlanType,
          named_medics: state.staffingPlanType === 'named_medics' ? state.namedMedics : undefined,
          headcount_plans: state.staffingPlanType === 'headcount_and_quals' ? state.headcountPlans : undefined,
        },
        cover_letter: state.coverLetter || null,
        availability_confirmed: state.availabilityConfirmed,
      };

      // POST to submit endpoint
      const res = await fetch('/api/marketplace/quotes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit quote');
      }

      const { quoteId } = await res.json();
      set({ status: 'submitted', draftId: null });
      return quoteId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit quote';
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // =========================================================================
  // API Actions: Save Draft
  // =========================================================================

  saveDraft: async () => {
    const state = get();
    set({ isSavingDraft: true, error: null });

    try {
      // Calculate total price
      const fixedTotal = state.staffCost + state.equipmentCost + state.transportCost + state.consumablesCost;
      const customTotal = state.customLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalPrice = fixedTotal + customTotal;

      // Prepare request payload
      const payload = {
        event_id: state.eventId,
        draft_id: state.draftId,
        total_price: totalPrice,
        pricing_breakdown: {
          staff_cost: state.staffCost,
          equipment_cost: state.equipmentCost,
          transport_cost: state.transportCost,
          consumables_cost: state.consumablesCost,
          custom_line_items: state.customLineItems,
        },
        staffing_plan: {
          type: state.staffingPlanType,
          named_medics: state.staffingPlanType === 'named_medics' ? state.namedMedics : undefined,
          headcount_plans: state.staffingPlanType === 'headcount_and_quals' ? state.headcountPlans : undefined,
        },
        cover_letter: state.coverLetter || null,
        availability_confirmed: state.availabilityConfirmed,
      };

      // POST to save-draft endpoint
      const res = await fetch('/api/marketplace/quotes/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save draft');
      }

      const { draftId } = await res.json();
      set({ draftId, draftSavedAt: new Date() });
      return draftId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save draft';
      set({ error: message });
      throw error;
    } finally {
      set({ isSavingDraft: false });
    }
  },

  // =========================================================================
  // Utility Actions
  // =========================================================================

  loadDraft: (quoteData: any) =>
    set({
      eventId: quoteData.event_id,
      draftId: quoteData.id,
      status: quoteData.status ?? 'draft',
      staffCost: quoteData.pricing_breakdown?.staff_cost ?? 0,
      equipmentCost: quoteData.pricing_breakdown?.equipment_cost ?? 0,
      transportCost: quoteData.pricing_breakdown?.transport_cost ?? 0,
      consumablesCost: quoteData.pricing_breakdown?.consumables_cost ?? 0,
      customLineItems: quoteData.pricing_breakdown?.custom_line_items ?? [],
      staffingPlanType: quoteData.staffing_plan?.type ?? 'headcount_and_quals',
      namedMedics: quoteData.staffing_plan?.named_medics ?? [],
      headcountPlans: quoteData.staffing_plan?.headcount_plans ?? [],
      coverLetter: quoteData.cover_letter ?? '',
      availabilityConfirmed: quoteData.availability_confirmed ?? false,
      draftSavedAt: new Date(quoteData.updated_at),
    }),

  reset: () =>
    set({
      eventId: '',
      draftId: null,
      status: 'draft',
      staffCost: 0,
      equipmentCost: 0,
      transportCost: 0,
      consumablesCost: 0,
      customLineItems: [],
      staffingPlanType: 'headcount_and_quals',
      namedMedics: [],
      headcountPlans: [],
      coverLetter: '',
      availabilityConfirmed: false,
      isSubmitting: false,
      isSavingDraft: false,
      error: null,
      draftSavedAt: null,
    }),

  setError: (error) => set({ error }),
}));
