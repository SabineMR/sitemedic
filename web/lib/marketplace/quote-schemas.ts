/**
 * Marketplace Quote Zod Validation Schemas
 * Phase 34: Quote Submission & Comparison
 *
 * Schemas for:
 *   - quoteSubmissionSchema: Full quote submission validation (pricing + staffing + availability)
 *   - draftSaveSchema: Loose validation for partial draft saves
 *
 * These schemas ensure type-safe validation on both client (form) and server (API) layers.
 */

import { z } from 'zod';

// =============================================================================
// Custom Line Item Schema
// Used in pricing breakdown for additional charges beyond fixed categories
// Example: "Specialist vehicle: £500", "Overnight accommodation: £300"
// =============================================================================

export const customLineItemSchema = z.object({
  id: z.string().optional(),
  label: z.string()
    .min(1, 'Item label required')
    .max(100, 'Item label too long'),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'At least 1 required'),
  unitPrice: z.number()
    .min(0, 'Price cannot be negative')
    .max(100000, 'Price too high'),
  notes: z.string()
    .max(500, 'Notes too long')
    .optional()
    .nullable(),
});

// =============================================================================
// Pricing Breakdown Schema
// Validates itemised pricing: 4 fixed categories + optional custom line items
// Refine: total must be > 0 (no free quotes)
// =============================================================================

export const pricingSchema = z.object({
  staffCost: z.number()
    .min(0, 'Staff cost cannot be negative')
    .max(100000, 'Staff cost too high'),
  equipmentCost: z.number()
    .min(0, 'Equipment cost cannot be negative')
    .max(100000, 'Equipment cost too high'),
  transportCost: z.number()
    .min(0, 'Transport cost cannot be negative')
    .max(100000, 'Transport cost too high'),
  consumablesCost: z.number()
    .min(0, 'Consumables cost cannot be negative')
    .max(100000, 'Consumables cost too high'),
  customLineItems: z.array(customLineItemSchema).default([]),
}).refine(
  (data) => {
    const fixedTotal = data.staffCost + data.equipmentCost + data.transportCost + data.consumablesCost;
    const customTotal = data.customLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const total = fixedTotal + customTotal;
    return total > 0;
  },
  { message: 'Total quote price must be greater than £0' }
);

// =============================================================================
// Staffing Plan Schemas
// Two modes: named medics (specific roster members) or headcount + qualifications
// =============================================================================

/** A named medic from the company roster */
export const namedMedicSchema = z.object({
  medic_id: z.string()
    .uuid('Invalid medic ID'),
  name: z.string()
    .min(1, 'Medic name required')
    .max(200, 'Name too long'),
  qualification: z.enum(['paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other']),
  notes: z.string()
    .max(500, 'Notes too long')
    .optional()
    .nullable(),
});

/** Headcount specification with role and quantity */
export const headcountPlanSchema = z.object({
  role: z.enum(['paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other']),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'At least 1 required'),
});

/**
 * Staffing plan: discriminated union
 * Either named_medics mode (with array of named medics)
 * Or headcount_and_quals mode (with array of headcount plans)
 */
export const staffingPlanSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('named_medics'),
    named_medics: z.array(namedMedicSchema)
      .min(1, 'At least one medic required'),
  }),
  z.object({
    type: z.literal('headcount_and_quals'),
    headcount_plans: z.array(headcountPlanSchema)
      .min(1, 'At least one qualification level required'),
  }),
]);

// =============================================================================
// Full Quote Submission Schema
// Validates a complete quote for submission
// Required: event_id, pricing, staffing, availability_confirmed
// Optional: cover_letter
// =============================================================================

export const quoteSubmissionSchema = z.object({
  event_id: z.string()
    .uuid('Invalid event ID'),
  pricing_breakdown: pricingSchema,
  staffing_plan: staffingPlanSchema,
  cover_letter: z.string()
    .max(5000, 'Cover letter too long')
    .optional()
    .nullable(),
  availability_confirmed: z.boolean()
    .refine((val) => val === true, { message: 'You must confirm availability' }),
});

/** Inferred TypeScript type from quoteSubmissionSchema */
export type QuoteSubmission = z.infer<typeof quoteSubmissionSchema>;

// =============================================================================
// Draft Save Schema (Loose Validation)
// Used for saving partial quotes — allows incomplete data
// Only validates that data which is provided is well-formed
// =============================================================================

/** Loose pricing schema for drafts (no total > 0 refinement, all fields optional) */
const draftPricingSchema = z.object({
  staffCost: z.number().min(0).max(100000).optional(),
  equipmentCost: z.number().min(0).max(100000).optional(),
  transportCost: z.number().min(0).max(100000).optional(),
  consumablesCost: z.number().min(0).max(100000).optional(),
  customLineItems: z.array(customLineItemSchema).optional(),
});

export const draftSaveSchema = z.object({
  event_id: z.string()
    .uuid('Invalid event ID'),
  draft_id: z.string()
    .uuid('Invalid draft ID')
    .optional()
    .nullable(),
  pricing_breakdown: draftPricingSchema.optional(),
  staffing_plan: staffingPlanSchema.optional(),
  cover_letter: z.string()
    .max(5000, 'Cover letter too long')
    .optional()
    .nullable(),
  availability_confirmed: z.boolean().optional(),
});

/** Inferred TypeScript type from draftSaveSchema */
export type DraftSave = z.infer<typeof draftSaveSchema>;
