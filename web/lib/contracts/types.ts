/**
 * Contract Management Types
 *
 * TypeScript types mirroring the database schema for contract management.
 * See supabase/migrations/017_contract_management.sql
 */

// ============================================================================
// Core Status and Payment Types
// ============================================================================

export type ContractStatus =
  | 'draft'       // Initial state - being prepared
  | 'sent'        // Sent to client for review
  | 'viewed'      // Client viewed the contract
  | 'signed'      // Client signed the contract
  | 'completed'   // Service completed, awaiting final payment
  | 'active'      // Contract active (all payments received)
  | 'fulfilled'   // Contract fully fulfilled (terminal state)
  | 'amended'     // Contract amended, needs re-sending
  | 'terminated'; // Contract terminated (terminal state)

export type PaymentTerms =
  | 'full_prepay'      // 100% upfront before service
  | 'split_50_50'      // 50% upfront, 50% on completion
  | 'split_50_net30'   // 50% upfront, 50% net 30 days after completion
  | 'full_net30'       // 100% net 30 days after completion
  | 'custom';          // Custom split defined manually

export type ContractTemplateStatus = 'active' | 'archived';

export type ContractEventType =
  | 'status_change'
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'signature_captured'
  | 'payment_captured'
  | 'version_created'
  | 'amendment_created'
  | 'terminated';

// ============================================================================
// Database Table Interfaces
// ============================================================================

export interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  clauses: ContractClause[];
  terms_and_conditions: string;
  cancellation_policy: string;
  is_default: boolean;
  version: number;
  status: ContractTemplateStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractClause {
  title: string;
  body: string;
  required: boolean;
  order: number;
}

export interface Contract {
  id: string;
  booking_id: string;
  client_id: string;
  template_id: string | null;
  current_version_id: string | null;
  status: ContractStatus;
  payment_terms: PaymentTerms;
  custom_terms_description: string | null;
  upfront_amount: number;
  completion_amount: number;
  net30_amount: number;
  upfront_paid_at: string | null;
  completion_paid_at: string | null;
  net30_paid_at: string | null;
  stripe_payment_intent_id: string | null;
  requires_signature_before_booking: boolean;
  internal_review_completed_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  completed_at: string | null;
  fulfilled_at: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  shareable_token: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractVersion {
  id: string;
  contract_id: string;
  version: number;
  storage_path: string;
  generated_at: string;
  generated_by: string | null;
  changes: string | null;
  previous_version_id: string | null;
  client_signature_data: string | null;
  client_signed_name: string | null;
  signed_at: string | null;
  signed_by_email: string | null;
  signed_by_ip: string | null;
}

export interface ContractEvent {
  id: string;
  contract_id: string;
  event_type: ContractEventType;
  event_data: Record<string, unknown>;
  actor_id: string | null;
  actor_ip: string | null;
  created_at: string;
}

// ============================================================================
// Helper Types and Interfaces
// ============================================================================

/**
 * Contract with populated relations for UI display
 */
export interface ContractWithRelations extends Contract {
  booking?: {
    id: string;
    service_type: string;
    scheduled_date: string | null;
    total_price: number;
    address_line1: string;
    address_line2: string | null;
    city: string;
    postcode: string;
  };
  client?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    payment_terms: string;
  };
  template?: ContractTemplate;
  currentVersion?: ContractVersion;
  versions?: ContractVersion[];
  events?: ContractEvent[];
}

/**
 * Input data for PDF generation
 */
export interface ContractData {
  // Contract metadata
  contractId: string;
  contractNumber: string; // e.g., "CON-2024-001"
  version: number;
  generatedDate: string;

  // Client information
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientAddress: string;

  // Site/booking details
  siteAddress: string;
  serviceType: string;
  scheduledDate: string | null;
  estimatedDuration: string | null;

  // Pricing breakdown
  subtotal: number;
  vatAmount: number;
  totalPrice: number;

  // Payment schedule
  paymentSchedule: PaymentSchedule;

  // Contract content
  clauses: ContractClause[];
  termsAndConditions: string;
  cancellationPolicy: string;

  // Signature section
  requiresSignature: boolean;
  signedAt: string | null;
  signedByName: string | null;
  signatureData: string | null; // Base64 PNG
}

/**
 * Payment schedule calculation result
 */
export interface PaymentSchedule {
  terms: PaymentTerms;
  upfrontAmount: number;
  completionAmount: number;
  net30Amount: number;
  description: string; // Human-readable description
}

/**
 * Event data payloads for specific event types
 */
export interface StatusChangeEventData {
  from: ContractStatus;
  to: ContractStatus;
  reason?: string;
}

export interface EmailEventData {
  to: string;
  subject: string;
  template?: string;
  delivered?: boolean;
}

export interface SignatureEventData {
  signedByName: string;
  signedByEmail: string;
  signedByIp: string;
  signatureData?: string; // Base64 PNG
}

export interface PaymentEventData {
  amount: number;
  paymentType: 'upfront' | 'completion' | 'net30';
  stripePaymentIntentId?: string;
}
