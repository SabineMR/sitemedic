/**
 * Zustand store for Marketplace Company Registration Wizard
 * Phase 32: Foundation Schema & Registration
 *
 * WHY: Centralised state management for the 4-step registration wizard.
 * Each step updates a slice of state that persists across step navigation.
 * The store is consumed by the registration page (client component)
 * and reset after successful submission.
 *
 * FEATURES:
 * - Step navigation with forward/back support
 * - Pre-fill from existing SiteMedic org (setExistingOrg)
 * - CQC verification state tracking
 * - Document upload tracking with metadata
 * - Full reset for post-submission cleanup
 */

import { create } from 'zustand';
import type { RegistrationStep, DocumentType } from '@/lib/marketplace/types';

// =============================================================================
// Types
// =============================================================================

export interface UploadedDocument {
  type: DocumentType;
  fileName: string;
  storagePath: string;
  expiryDate: string | null;
  certificateNumber: string | null;
  staffMemberName: string | null; // for DBS certificates
}

interface RegistrationState {
  currentStep: RegistrationStep;

  // Step 1: Company details
  companyName: string;
  companyRegNumber: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyPostcode: string;
  coverageAreas: string[];
  companyDescription: string;

  // Step 2: CQC verification
  cqcProviderId: string;
  cqcVerified: boolean;
  cqcProviderName: string;
  cqcRegistrationStatus: string;

  // Step 3: Document uploads
  uploadedDocuments: UploadedDocument[];

  // Step 4: Stripe Connect (placeholder -- actual onboarding in Plan 04)
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;

  // Metadata
  existingOrgId: string | null; // set when existing SiteMedic org registers
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setStep: (step: RegistrationStep) => void;
  updateCompanyDetails: (data: Partial<RegistrationState>) => void;
  setCqcVerification: (
    providerId: string,
    verified: boolean,
    providerName: string,
    status: string
  ) => void;
  addDocument: (doc: UploadedDocument) => void;
  removeDocument: (storagePath: string) => void;
  setStripeAccount: (accountId: string, complete: boolean) => void;
  setExistingOrg: (
    orgId: string,
    orgData: {
      name: string;
      email: string;
      phone?: string;
      address?: string;
      postcode?: string;
    }
  ) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// =============================================================================
// Default state
// =============================================================================

const DEFAULT_STATE = {
  currentStep: 'company-details' as RegistrationStep,
  companyName: '',
  companyRegNumber: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  companyPostcode: '',
  coverageAreas: [] as string[],
  companyDescription: '',
  cqcProviderId: '',
  cqcVerified: false,
  cqcProviderName: '',
  cqcRegistrationStatus: '',
  uploadedDocuments: [] as UploadedDocument[],
  stripeAccountId: null as string | null,
  stripeOnboardingComplete: false,
  existingOrgId: null as string | null,
  isSubmitting: false,
  error: null as string | null,
};

// =============================================================================
// Store
// =============================================================================

export const useMarketplaceRegistrationStore = create<RegistrationState>(
  (set) => ({
    ...DEFAULT_STATE,

    /**
     * Navigate to a specific wizard step
     */
    setStep: (step: RegistrationStep) => {
      set({ currentStep: step, error: null });
    },

    /**
     * Update company details (Step 1 fields).
     * Accepts a partial state object so the form can update individual fields.
     */
    updateCompanyDetails: (data: Partial<RegistrationState>) => {
      set((state) => ({ ...state, ...data }));
    },

    /**
     * Store CQC verification result from the /api/marketplace/cqc-verify call.
     */
    setCqcVerification: (
      providerId: string,
      verified: boolean,
      providerName: string,
      status: string
    ) => {
      set({
        cqcProviderId: providerId,
        cqcVerified: verified,
        cqcProviderName: providerName,
        cqcRegistrationStatus: status,
      });
    },

    /**
     * Add a successfully uploaded document to the tracking list.
     */
    addDocument: (doc: UploadedDocument) => {
      set((state) => ({
        uploadedDocuments: [
          // Replace existing document of same type (re-upload)
          ...state.uploadedDocuments.filter((d) => d.type !== doc.type),
          doc,
        ],
      }));
    },

    /**
     * Remove a document by its storage path (e.g., after deletion).
     */
    removeDocument: (storagePath: string) => {
      set((state) => ({
        uploadedDocuments: state.uploadedDocuments.filter(
          (d) => d.storagePath !== storagePath
        ),
      }));
    },

    /**
     * Store Stripe Connect account info (placeholder for Plan 04).
     */
    setStripeAccount: (accountId: string, complete: boolean) => {
      set({
        stripeAccountId: accountId,
        stripeOnboardingComplete: complete,
      });
    },

    /**
     * Pre-fill wizard with data from an existing SiteMedic organisation.
     * Called on mount when the user already has an org_id in app_metadata.
     */
    setExistingOrg: (orgId, orgData) => {
      set({
        existingOrgId: orgId,
        companyName: orgData.name,
        companyEmail: orgData.email,
        companyPhone: orgData.phone ?? '',
        companyAddress: orgData.address ?? '',
        companyPostcode: orgData.postcode ?? '',
      });
    },

    /**
     * Toggle submitting state during API calls.
     */
    setSubmitting: (submitting: boolean) => {
      set({ isSubmitting: submitting });
    },

    /**
     * Set or clear error message.
     */
    setError: (error: string | null) => {
      set({ error });
    },

    /**
     * Reset all state to defaults after successful registration submission.
     */
    reset: () => {
      set({ ...DEFAULT_STATE });
    },
  })
);
