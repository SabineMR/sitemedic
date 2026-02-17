/**
 * Client Query Hooks
 *
 * TanStack Query hooks for client management:
 * - Fetch all clients with payment reliability scoring
 * - Upgrade client from prepay to Net 30 credit terms
 * - Downgrade client back to prepay
 * - Fetch client booking history
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRequireOrg } from '@/contexts/org-context';

/**
 * Client record with payment reliability scoring
 */
export interface ClientWithHistory {
  id: string;
  user_id: string | null;
  company_name: string;
  vat_number: string | null;
  billing_address: string;
  billing_postcode: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  payment_terms: 'prepay' | 'net_30';
  credit_limit: number;
  outstanding_balance: number;
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  status: 'active' | 'suspended' | 'closed';
  suspended_reason: string | null;
  suspended_at: string | null;
  total_bookings: number;
  successful_bookings: number;
  cancelled_bookings: number;
  late_payments: number;
  created_at: string;
  updated_at: string;

  // Calculated fields
  payment_reliability_score: number; // 0-100
}

/**
 * Payment terms upgrade payload
 */
export interface PaymentTermsUpgrade {
  clientId: string;
  newTerms: 'net_30';
  creditLimit: number;
  reason: string;
}

/**
 * Payment terms downgrade payload
 */
export interface PaymentTermsDowngrade {
  clientId: string;
  reason: string;
}

/**
 * Booking history for client detail view
 */
export interface ClientBooking {
  id: string;
  site_name: string;
  shift_date: string;
  status: string;
  total: number;
}

/**
 * Calculate payment reliability score
 *
 * Score = 0-100 based on successful bookings and late payments
 * - New clients (0 bookings) get neutral score of 50
 * - Late payments are weighted 2x (heavily penalize unreliability)
 * - Formula: ((successful - late_payments * 2) / total) * 100, clamped to 0-100
 */
function calculateReliabilityScore(client: {
  total_bookings: number;
  successful_bookings: number;
  late_payments: number;
}): number {
  if (client.total_bookings === 0) {
    return 50; // New client, neutral score
  }

  const score =
    ((client.successful_bookings - client.late_payments * 2) / client.total_bookings) * 100;

  return Math.max(0, Math.min(100, score)); // Clamp to 0-100
}

/**
 * Fetch all clients with reliability scoring
 * IMPORTANT: Now accepts orgId parameter for org-scoped filtering
 */
export async function fetchClients(
  supabaseClient: SupabaseClient,
  orgId: string
): Promise<ClientWithHistory[]> {
  const { data, error } = await supabaseClient
    .from('clients')
    .select('*')
    .eq('org_id', orgId) // CRITICAL: Filter by org_id
    .order('company_name', { ascending: true });

  if (error) throw error;

  // Calculate reliability score for each client
  return (data || []).map((client) => ({
    ...client,
    payment_reliability_score: calculateReliabilityScore(client),
  }));
}

/**
 * TanStack Query hook for clients with 60s polling
 * IMPORTANT: Now uses org context to filter clients
 */
export function useClients(initialData?: ClientWithHistory[]) {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useQuery({
    queryKey: ['admin', 'clients', orgId], // Include orgId in cache key
    queryFn: () => fetchClients(supabase, orgId),
    refetchInterval: 60000, // 60 seconds
    initialData,
  });
}

/**
 * Fetch booking history for a specific client
 * IMPORTANT: Now accepts orgId parameter for org-scoped filtering
 */
export async function fetchClientBookingHistory(
  supabaseClient: SupabaseClient,
  orgId: string,
  clientId: string
): Promise<ClientBooking[]> {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select('id, site_name, shift_date, status, total')
    .eq('org_id', orgId) // CRITICAL: Filter by org_id
    .eq('client_id', clientId)
    .order('shift_date', { ascending: false })
    .limit(20);

  if (error) throw error;

  return data || [];
}

/**
 * Mutation hook to upgrade client to Net 30 payment terms
 *
 * Validation:
 * - Client must be active (not suspended or closed)
 * - Client must have <=2 late payments (reliability requirement)
 * - Credit limit must be >= 500 GBP (minimum threshold)
 */
export function useUpgradeToNet30() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useMutation({
    mutationFn: async (upgrade: PaymentTermsUpgrade) => {
      // Fetch client to validate (with org filter for security)
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', upgrade.clientId)
        .eq('org_id', orgId) // CRITICAL: Verify client belongs to org
        .single();

      if (fetchError) throw fetchError;

      // Validation: Must be active
      if (client.status !== 'active') {
        throw new Error('Cannot upgrade inactive client. Client must be active.');
      }

      // Validation: Late payment check
      if (client.late_payments > 2) {
        throw new Error(
          `Cannot upgrade client with ${client.late_payments} late payments. Maximum 2 allowed.`
        );
      }

      // Validation: Minimum credit limit
      if (upgrade.creditLimit < 500) {
        throw new Error('Credit limit must be at least £500.');
      }

      // Update payment terms
      const { data, error } = await supabase
        .from('clients')
        .update({
          payment_terms: 'net_30',
          credit_limit: upgrade.creditLimit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', upgrade.clientId)
        .select()
        .single();

      if (error) throw error;

      // Log the upgrade reason (could be stored in audit log in production)
      console.log(`Client ${upgrade.clientId} upgraded to Net 30. Reason: ${upgrade.reason}`);

      return data;
    },

    // Optimistic update
    onMutate: async (upgrade) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['admin', 'clients', orgId] });

      // Snapshot previous value
      const previousClients = queryClient.getQueryData<ClientWithHistory[]>(['admin', 'clients', orgId]);

      // Optimistically update
      if (previousClients) {
        queryClient.setQueryData<ClientWithHistory[]>(
          ['admin', 'clients', orgId],
          previousClients.map((client) =>
            client.id === upgrade.clientId
              ? {
                  ...client,
                  payment_terms: 'net_30' as const,
                  credit_limit: upgrade.creditLimit,
                }
              : client
          )
        );
      }

      return { previousClients };
    },

    // Rollback on error
    onError: (error, upgrade, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(['admin', 'clients', orgId], context.previousClients);
      }
      console.error('Failed to upgrade payment terms:', error);
    },

    // Refetch on completion
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients', orgId] });
    },
  });
}

/**
 * Mutation hook to downgrade client to prepay terms
 *
 * Use case: Client abuses Net 30 terms, multiple late payments
 */
export function useDowngradeToPrePay() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useMutation({
    mutationFn: async (downgrade: PaymentTermsDowngrade) => {
      // Update payment terms to prepay, reset credit limit (RLS handles org filtering)
      const { data, error } = await supabase
        .from('clients')
        .update({
          payment_terms: 'prepay',
          credit_limit: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', downgrade.clientId)
        .select()
        .single();

      if (error) throw error;

      // Log the downgrade reason
      console.log(`Client ${downgrade.clientId} downgraded to prepay. Reason: ${downgrade.reason}`);

      return data;
    },

    // Optimistic update
    onMutate: async (downgrade) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'clients', orgId] });

      const previousClients = queryClient.getQueryData<ClientWithHistory[]>(['admin', 'clients', orgId]);

      if (previousClients) {
        queryClient.setQueryData<ClientWithHistory[]>(
          ['admin', 'clients', orgId],
          previousClients.map((client) =>
            client.id === downgrade.clientId
              ? {
                  ...client,
                  payment_terms: 'prepay' as const,
                  credit_limit: 0,
                }
              : client
          )
        );
      }

      return { previousClients };
    },

    onError: (error, downgrade, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(['admin', 'clients', orgId], context.previousClients);
      }
      console.error('Failed to downgrade payment terms:', error);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients', orgId] });
    },
  });
}
