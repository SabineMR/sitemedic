/**
 * Marketplace Award Flow Zod Validation Schemas
 * Phase 35: Award Flow & Payment
 *
 * Schemas for:
 *   - awardRequestSchema: Validates award API request (eventId, quoteId, depositPercent)
 *   - awardConfirmationSchema: Validates client confirmation form before payment
 */

import { z } from 'zod';

// =============================================================================
// Award Request Schema
// Validates the POST body for /api/marketplace/quotes/[id]/award
// =============================================================================

export const awardRequestSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  quoteId: z.string().uuid('Invalid quote ID'),
  depositPercent: z.number()
    .int('Deposit percent must be a whole number')
    .min(1, 'Deposit must be at least 1%')
    .max(100, 'Deposit cannot exceed 100%')
    .optional()
    .default(25),
});

export type AwardRequestInput = z.infer<typeof awardRequestSchema>;

// =============================================================================
// Award Confirmation Schema
// Validates the client form data before proceeding to payment
// =============================================================================

export const awardConfirmationSchema = z.object({
  clientEmail: z.string()
    .email('Valid email required'),
  clientName: z.string()
    .min(1, 'Name required')
    .max(200, 'Name too long'),
  clientPhone: z.string()
    .min(1, 'Phone number required')
    .max(20, 'Phone number too long'),
  cardholderName: z.string()
    .min(1, 'Cardholder name required')
    .max(200, 'Name too long'),
  termsAccepted: z.boolean()
    .refine((val) => val === true, { message: 'You must accept the terms and conditions' }),
});

export type AwardConfirmationInput = z.infer<typeof awardConfirmationSchema>;
