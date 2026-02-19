/**
 * Marketplace Quote TypeScript Types
 * Phase 34: Quote Submission & Comparison
 *
 * Mirrors the SQL schema from:
 *   - 146_marketplace_quotes.sql (marketplace_quotes table)
 *
 * These types are the single source of truth for TypeScript consumers
 * and ensure consistency between database and application layers.
 */

import type { StaffingRole } from './event-types';

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Quote status lifecycle: draft → submitted → revised | withdrawn */
export type QuoteStatus = 'draft' | 'submitted' | 'revised' | 'withdrawn';

/** Staffing plan type: naming specific medics or specifying headcount + qualifications */
export type StaffingPlanType = 'named_medics' | 'headcount_and_quals';

// =============================================================================
// Nested Data Structures (JSONB fields)
// =============================================================================

/**
 * A custom line item in the pricing breakdown
 * Example: { id: '123', label: 'Specialist vehicle', quantity: 1, unitPrice: 500, notes: 'With driver' }
 */
export interface QuoteLineItem {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

/**
 * Itemised pricing breakdown stored as JSONB in marketplace_quotes.pricing_breakdown
 * Structure: Fixed categories (staff, equipment, transport, consumables) + custom line items
 */
export interface PricingBreakdown {
  staff_cost: number;
  equipment_cost: number;
  transport_cost: number;
  consumables_cost: number;
  custom_line_items: QuoteLineItem[];
}

/**
 * A named medic in the staffing plan
 * Used when company chooses to name specific staff members from their roster
 */
export interface StaffingPlanItem {
  medic_id: string;
  name: string;
  qualification: StaffingRole;
  notes?: string | null;
}

/**
 * A headcount plan entry for the staffing plan
 * Used when company specifies headcount + qualification without naming individuals
 */
export interface HeadcountPlan {
  role: StaffingRole;
  quantity: number;
}

/**
 * Staffing plan stored as JSONB in marketplace_quotes.staffing_plan
 * Discriminated union: either named_medics (with list of individuals) or headcount_and_quals
 */
export type StaffingPlan =
  | {
      type: 'named_medics';
      named_medics: StaffingPlanItem[];
      headcount_plans?: never;
    }
  | {
      type: 'headcount_and_quals';
      named_medics?: never;
      headcount_plans: HeadcountPlan[];
    };

// =============================================================================
// Main Database Row Interfaces
// =============================================================================

/**
 * Mirrors marketplace_quotes table (146_marketplace_quotes.sql)
 * Represents a quote submitted by a company on an event
 */
export interface MarketplaceQuote {
  id: string;
  event_id: string;
  company_id: string;
  total_price: number;
  pricing_breakdown: PricingBreakdown;
  staffing_plan: StaffingPlan;
  cover_letter: string | null;
  availability_confirmed: boolean;
  status: QuoteStatus;
  submitted_at: string | null;
  last_revised_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Extended quote interface with related company information
 * Used in quote list views where we display company profile alongside quote
 * Denormalized for performance (avoids JOIN in query)
 */
export interface MarketplaceQuoteWithCompany extends MarketplaceQuote {
  company_name: string;
  company_rating: number; // 0-5 star rating (placeholder in Phase 34, populated by Phase 36)
  company_review_count: number; // Number of reviews (0 in Phase 34)
  company_verification_status: string; // 'verified', 'pending', 'rejected'
}

// =============================================================================
// Human-Readable Label Maps
// =============================================================================

/** Human-readable labels for quote status */
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  revised: 'Revised',
  withdrawn: 'Withdrawn',
};

/** Human-readable labels for staffing plan type */
export const STAFFING_PLAN_TYPE_LABELS: Record<StaffingPlanType, string> = {
  named_medics: 'Named Medics',
  headcount_and_quals: 'Headcount + Qualifications',
};
