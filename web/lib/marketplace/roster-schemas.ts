/**
 * Marketplace Roster Zod Validation Schemas
 * Phase 37: Company Accounts — Plan 01
 *
 * Schemas for:
 *   - rosterAddSchema: Direct add medic to roster (POST /roster)
 *   - rosterInviteSchema: Email invitation (POST /roster/invite)
 *   - rosterUpdateSchema: Update roster medic (PATCH /roster/[id])
 *   - rosterAcceptSchema: Accept invitation (POST /roster/accept)
 *
 * Uses Zod syntax consistent with existing web/lib schemas.
 */

import { z } from 'zod';

// =============================================================================
// Schema: Direct Add Medic to Roster
// Used by: POST /api/marketplace/roster
// =============================================================================

export const rosterAddSchema = z.object({
  companyId: z.string()
    .uuid('Invalid company ID'),
  medicId: z.string()
    .uuid('Invalid medic ID'),
  title: z.string()
    .max(200, 'Title too long')
    .optional()
    .nullable(),
  qualifications: z.array(z.string())
    .optional()
    .nullable(),
  hourlyRate: z.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(10000, 'Hourly rate too high')
    .optional()
    .nullable(),
});

/** Inferred TypeScript type from rosterAddSchema */
export type RosterAdd = z.infer<typeof rosterAddSchema>;

// =============================================================================
// Schema: Email Invitation
// Used by: POST /api/marketplace/roster/invite
// =============================================================================

export const rosterInviteSchema = z.object({
  companyId: z.string()
    .uuid('Invalid company ID'),
  email: z.string()
    .email('Invalid email address'),
  title: z.string()
    .max(200, 'Title too long')
    .optional()
    .nullable(),
  qualifications: z.array(z.string())
    .optional()
    .nullable(),
});

/** Inferred TypeScript type from rosterInviteSchema */
export type RosterInvite = z.infer<typeof rosterInviteSchema>;

// =============================================================================
// Schema: Update Roster Medic
// Used by: PATCH /api/marketplace/roster/[id]
// All fields optional — only provided fields are updated
// =============================================================================

export const rosterUpdateSchema = z.object({
  title: z.string()
    .max(200, 'Title too long')
    .optional()
    .nullable(),
  hourlyRate: z.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(10000, 'Hourly rate too high')
    .optional()
    .nullable(),
  qualifications: z.array(z.string())
    .optional()
    .nullable(),
  available: z.boolean()
    .optional(),
  unavailableFrom: z.string()
    .optional()
    .nullable(),
  unavailableUntil: z.string()
    .optional()
    .nullable(),
  unavailableReason: z.string()
    .max(500, 'Reason too long')
    .optional()
    .nullable(),
});

/** Inferred TypeScript type from rosterUpdateSchema */
export type RosterUpdate = z.infer<typeof rosterUpdateSchema>;

// =============================================================================
// Schema: Accept Invitation
// Used by: POST /api/marketplace/roster/accept
// =============================================================================

export const rosterAcceptSchema = z.object({
  token: z.string()
    .min(1, 'Token is required'),
});

/** Inferred TypeScript type from rosterAcceptSchema */
export type RosterAccept = z.infer<typeof rosterAcceptSchema>;
