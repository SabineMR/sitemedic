/**
 * Zustand Store for Company Roster Management UI
 * Phase 37: Company Accounts — Plan 02
 *
 * WHY: Centralised UI state management for the roster management page.
 * Data fetching is handled by React Query hooks (useCompanyRoster),
 * this store only manages UI concerns: filters, modals, and selections.
 *
 * FEATURES:
 * - Status filter tabs (all, active, pending, inactive)
 * - Search term for client-side name filtering
 * - Modal open/close state for Add and Invite modals
 * - Selected medic tracking for edit flows
 * - Full reset for page cleanup
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export type RosterStatusFilter = 'all' | 'active' | 'pending' | 'inactive';

interface CompanyRosterState {
  // Company context
  companyId: string;

  // Filtering
  statusFilter: RosterStatusFilter;
  searchTerm: string;

  // Modal state
  addModalOpen: boolean;
  inviteModalOpen: boolean;

  // Selection
  selectedMedicId: string | null;

  // Actions
  setCompanyId: (companyId: string) => void;
  setStatusFilter: (filter: RosterStatusFilter) => void;
  setSearchTerm: (term: string) => void;
  openAddModal: () => void;
  closeAddModal: () => void;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  setSelectedMedicId: (id: string | null) => void;
  reset: () => void;
}

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_STATE = {
  companyId: '',
  statusFilter: 'all' as RosterStatusFilter,
  searchTerm: '',
  addModalOpen: false,
  inviteModalOpen: false,
  selectedMedicId: null as string | null,
};

// =============================================================================
// Store
// =============================================================================

export const useCompanyRosterStore = create<CompanyRosterState>((set) => ({
  ...DEFAULT_STATE,

  /**
   * Set the company ID for roster context
   */
  setCompanyId: (companyId: string) => set({ companyId }),

  /**
   * Filter roster by status (all, active, pending, inactive)
   */
  setStatusFilter: (filter: RosterStatusFilter) => set({ statusFilter: filter }),

  /**
   * Client-side search term for filtering roster by medic name
   */
  setSearchTerm: (term: string) => set({ searchTerm: term }),

  /**
   * Open the "Add Medic" modal (direct add from existing SiteMedic medics)
   */
  openAddModal: () => set({ addModalOpen: true }),

  /**
   * Close the "Add Medic" modal
   */
  closeAddModal: () => set({ addModalOpen: false }),

  /**
   * Open the "Invite Medic" modal (email invitation)
   */
  openInviteModal: () => set({ inviteModalOpen: true }),

  /**
   * Close the "Invite Medic" modal
   */
  closeInviteModal: () => set({ inviteModalOpen: false }),

  /**
   * Track selected medic for edit flows
   */
  setSelectedMedicId: (id: string | null) => set({ selectedMedicId: id }),

  /**
   * Reset all state to defaults
   */
  reset: () => set({ ...DEFAULT_STATE }),
}));
