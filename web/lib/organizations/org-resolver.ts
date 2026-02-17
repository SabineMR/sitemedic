/**
 * Organization Resolver Utilities
 *
 * Server-side utilities for extracting and validating organization context
 * from authenticated user sessions. Used in API routes and server components
 * to enforce org-level data isolation.
 *
 * Multi-tenant architecture: Every user has an org_id in their JWT app_metadata.
 * These utilities extract that org_id and validate resource ownership.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get the current authenticated user's organization ID from JWT app_metadata
 *
 * @returns {Promise<string | null>} Organization UUID or null if not authenticated or no org assigned
 *
 * @example
 * ```ts
 * const orgId = await getCurrentOrgId();
 * if (orgId) {
 *   // Filter query by org_id
 *   const { data } = await supabase
 *     .from('bookings')
 *     .select('*')
 *     .eq('org_id', orgId);
 * }
 * ```
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Extract org_id from JWT app_metadata
  // This is set during user creation or org assignment
  const orgId = user.app_metadata?.org_id;

  if (!orgId) {
    console.warn('User authenticated but has no org_id in app_metadata:', user.id);
    return null;
  }

  return orgId;
}

/**
 * Get the current user's organization ID, throwing an error if not found
 *
 * Use this in protected API routes where org_id is required.
 * Throws a descriptive error if user is not authenticated or has no org.
 *
 * @returns {Promise<string>} Organization UUID (guaranteed non-null)
 * @throws {Error} If user is not authenticated or has no org_id
 *
 * @example
 * ```ts
 * // In an API route
 * export async function GET(request: Request) {
 *   try {
 *     const orgId = await requireOrgId();
 *
 *     // Safe to use orgId - it's guaranteed to exist
 *     const { data } = await supabase
 *       .from('bookings')
 *       .select('*')
 *       .eq('org_id', orgId);
 *
 *     return Response.json(data);
 *   } catch (error) {
 *     return Response.json({ error: error.message }, { status: 401 });
 *   }
 * }
 * ```
 */
export async function requireOrgId(): Promise<string> {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    throw new Error('Organization ID not found in user session. User may not be assigned to an organization.');
  }

  return orgId;
}

/**
 * Validate that a resource belongs to the current user's organization
 *
 * Use this before allowing access to resources identified by ID to prevent
 * cross-org access attempts.
 *
 * @param {string} resourceOrgId - The org_id of the resource being accessed
 * @returns {Promise<boolean>} true if resource belongs to user's org, false otherwise
 *
 * @example
 * ```ts
 * // Validating access to a booking
 * const { data: booking } = await supabase
 *   .from('bookings')
 *   .select('org_id')
 *   .eq('id', bookingId)
 *   .single();
 *
 * const hasAccess = await validateOrgAccess(booking.org_id);
 * if (!hasAccess) {
 *   return Response.json({ error: 'Access denied' }, { status: 403 });
 * }
 * ```
 */
export async function validateOrgAccess(resourceOrgId: string): Promise<boolean> {
  const currentOrgId = await getCurrentOrgId();

  if (!currentOrgId) {
    return false;
  }

  return currentOrgId === resourceOrgId;
}

/**
 * Get the current user's org_id along with user ID for composite queries
 *
 * Useful when you need both user_id and org_id for filtering.
 *
 * @returns {Promise<{userId: string, orgId: string} | null>} User and org IDs or null
 *
 * @example
 * ```ts
 * const context = await getUserOrgContext();
 * if (context) {
 *   const { userId, orgId } = context;
 *   // Use both for filtering
 * }
 * ```
 */
export async function getUserOrgContext(): Promise<{
  userId: string;
  orgId: string;
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.app_metadata?.org_id) {
    return null;
  }

  return {
    userId: user.id,
    orgId: user.app_metadata.org_id,
  };
}

/**
 * Require org access to a resource, throwing an error if unauthorized
 *
 * Combines resource ownership check with error throwing for cleaner code.
 *
 * @param {string} resourceOrgId - The org_id of the resource being accessed
 * @throws {Error} If user doesn't have access to the resource
 *
 * @example
 * ```ts
 * const { data: invoice } = await supabase
 *   .from('invoices')
 *   .select('org_id')
 *   .eq('id', invoiceId)
 *   .single();
 *
 * await requireOrgAccess(invoice.org_id); // Throws if no access
 *
 * // Continue with authorized operations
 * ```
 */
export async function requireOrgAccess(resourceOrgId: string): Promise<void> {
  const hasAccess = await validateOrgAccess(resourceOrgId);

  if (!hasAccess) {
    throw new Error('Access denied: Resource belongs to a different organization');
  }
}
