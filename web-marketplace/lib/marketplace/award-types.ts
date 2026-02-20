/**
 * Marketplace Award Flow TypeScript Types
 * Phase 35: Award Flow & Payment
 *
 * Types for the award confirmation, deposit payment, and remainder charge flow.
 * These types mirror the schema changes in migration 149_marketplace_award_payment.sql.
 */

// =============================================================================
// Award Checkout Flow
// =============================================================================

/** Steps in the award checkout flow */
export type AwardCheckoutStep = 'confirm' | 'payment' | 'processing' | 'success' | 'error';

/** Full state of the award checkout flow (Zustand store shape) */
export interface AwardCheckoutState {
  step: AwardCheckoutStep;
  quoteId: string | null;
  eventId: string | null;
  companyId: string | null;
  companyName: string | null;
  totalPrice: number;
  depositPercent: number;
  depositAmount: number;
  remainderAmount: number;
  stripeCustomerId: string | null;
  paymentMethodId: string | null;
  depositPaymentIntentId: string | null;
  clientSecret: string | null;
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  isProcessing: boolean;
  error: string | null;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/** Request body for POST /api/marketplace/quotes/[id]/award */
export interface AwardRequest {
  eventId: string;
  quoteId: string;
  depositPercent?: number;
}

/** Response from POST /api/marketplace/quotes/[id]/award */
export interface AwardApiResponse {
  clientSecret: string;
  paymentIntentId: string;
  customerId: string;
  depositAmount: number;
  remainderAmount: number;
  depositPercent: number;
  totalPrice: number;
  mock?: boolean;
}

// =============================================================================
// Payment Calculation Types
// =============================================================================

/** Full payment breakdown for display in award confirmation */
export interface PaymentBreakdown {
  totalPrice: number;
  depositPercent: number;
  depositAmount: number;
  remainderAmount: number;
  vatAmount: number;
  subtotal: number;
}

/** Commission breakdown for marketplace awards */
export interface MarketplaceCommission {
  platformFee: number;
  medicPayout: number;
  platformNet: number;
}

// =============================================================================
// Database Record Types
// =============================================================================

/** Marketplace payment columns on the bookings table */
export interface MarketplaceBookingPayment {
  marketplace_event_id: string | null;
  marketplace_quote_id: string | null;
  deposit_amount: number | null;
  deposit_percent: number;
  remainder_amount: number | null;
  remainder_due_at: string | null;
  remainder_paid_at: string | null;
  remainder_failed_attempts: number;
  remainder_last_failed_at: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  deposit_payment_intent_id: string | null;
  remainder_payment_intent_id: string | null;
}

/** Row from marketplace_award_history table */
export interface MarketplaceAwardHistory {
  id: string;
  event_id: string;
  winning_quote_id: string;
  losing_quote_ids: string[];
  awarded_by: string;
  deposit_amount: number | null;
  total_amount: number | null;
  deposit_percent: number;
  awarded_at: string;
  created_at: string;
}

/** Row from client_payment_methods table */
export interface ClientPaymentMethod {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  card_brand: string | null;
  card_last_four: string | null;
  card_expiry_month: number | null;
  card_expiry_year: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
