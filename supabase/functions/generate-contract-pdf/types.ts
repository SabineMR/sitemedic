/**
 * Contract PDF Data Types
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 02
 *
 * Deno-compatible type definitions for contract PDF generation
 * No external imports - pure TypeScript types
 */

export interface ContractPDFData {
  contractId: string;
  contractNumber: string; // e.g., "SA-2026-001"
  generatedAt: string; // ISO timestamp

  client: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    address: string;
    postcode: string;
    vatNumber?: string;
  };

  site: {
    name: string;
    address: string;
    postcode: string;
    contactName?: string;
    contactPhone?: string;
  };

  booking: {
    shiftDate: string;
    shiftStart: string;
    shiftEnd: string;
    hours: number;
    specialRequirements?: string;
    isRecurring: boolean;
    recurrencePattern?: string;
    recurringUntil?: string;
  };

  pricing: {
    baseRate: number;
    hours: number;
    subtotal: number;
    urgencyPremiumPercent: number;
    urgencyPremiumAmount: number;
    travelSurcharge: number;
    outOfTerritoryCost: number;
    netAmount: number;
    vat: number;
    total: number;
  };

  paymentSchedule: {
    terms: string; // 'full_prepay' | 'split_50_50' | 'split_50_net30' | 'full_net30' | 'custom'
    description: string;
    upfrontAmount: number;
    completionAmount: number;
    net30Amount: number;
  };

  template: {
    clauses: Array<{ title: string; body: string; order: number }>;
    termsAndConditions: string;
    cancellationPolicy: string;
  };

  signature?: {
    dataUrl: string; // base64 PNG
    signedName: string;
    signedAt: string;
    signedByEmail: string;
  };

  providerName?: string; // Org company name from branding (defaults to 'SiteMedic Ltd')
}
