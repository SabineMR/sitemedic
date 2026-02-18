/**
 * Server-side contract data queries
 *
 * Supabase queries for contract management dashboard.
 * All functions use createClient from @/lib/supabase/server.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  Contract,
  ContractWithRelations,
  ContractTemplate,
  ContractStatus,
} from './types';

/**
 * Get all contracts with optional filters
 *
 * @param filters - Optional filters for status, client, search
 * @returns Array of contracts with relations
 */
export async function getContracts(filters?: {
  status?: ContractStatus;
  clientId?: string;
  search?: string;
}): Promise<ContractWithRelations[]> {
  const supabase = await createClient();

  // Build query with relations
  let query = supabase
    .from('contracts')
    .select(
      `
      *,
      booking:bookings!contracts_booking_id_fkey (
        id,
        site_name,
        event_vertical,
        shift_date,
        total,
        subtotal,
        vat,
        site_address,
        site_postcode
      ),
      client:clients!contracts_client_id_fkey (
        id,
        company_name,
        contact_email,
        contact_phone,
        payment_terms
      ),
      template:contract_templates!contracts_template_id_fkey (
        id,
        name,
        version
      ),
      currentVersion:contract_versions!contracts_current_version_id_fkey (
        id,
        version,
        storage_path,
        generated_at,
        client_signature_data,
        client_signed_name,
        signed_at
      )
    `
    )
    .order('created_at', { ascending: false });

  // Apply status filter
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  // Apply client filter
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  // Apply search filter (company name, contract number, site address)
  // Contract number search is handled client-side using formatContractNumber() after fetch
  if (filters?.search) {
    // Fetch all and filter client-side — contract numbers are derived from id + created_at
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching contracts:', error);
    return [];
  }

  // Transform nested relations
  const contracts = (data || []).map((contract: any) => ({
    ...contract,
    booking: Array.isArray(contract.booking)
      ? contract.booking[0]
      : contract.booking,
    client: Array.isArray(contract.client)
      ? contract.client[0]
      : contract.client,
    template: Array.isArray(contract.template)
      ? contract.template[0]
      : contract.template,
    currentVersion: Array.isArray(contract.currentVersion)
      ? contract.currentVersion[0]
      : contract.currentVersion,
  }));

  return contracts;
}

/**
 * Get single contract by ID with all relations
 *
 * @param contractId - Contract UUID
 * @returns Contract with all relations or null if not found
 */
export async function getContractById(
  contractId: string
): Promise<ContractWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contracts')
    .select(
      `
      *,
      booking:bookings!contracts_booking_id_fkey (
        id,
        site_name,
        event_vertical,
        shift_date,
        total,
        subtotal,
        vat,
        site_address,
        site_postcode
      ),
      client:clients!contracts_client_id_fkey (
        id,
        company_name,
        contact_email,
        contact_phone,
        payment_terms
      ),
      template:contract_templates!contracts_template_id_fkey (
        id,
        name,
        description,
        clauses,
        terms_and_conditions,
        cancellation_policy,
        version
      )
    `
    )
    .eq('id', contractId)
    .single();

  if (error) {
    console.error('Error fetching contract:', error);
    return null;
  }

  // Fetch all versions separately
  const { data: versions } = await supabase
    .from('contract_versions')
    .select('*')
    .eq('contract_id', contractId)
    .order('version', { ascending: false });

  // Fetch all events separately
  const { data: events } = await supabase
    .from('contract_events')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  // Transform nested relations
  const contract = {
    ...data,
    booking: Array.isArray(data.booking) ? data.booking[0] : data.booking,
    client: Array.isArray(data.client) ? data.client[0] : data.client,
    template: Array.isArray(data.template) ? data.template[0] : data.template,
    versions: versions || [],
    events: events || [],
  };

  return contract;
}

/**
 * Get all contract templates
 *
 * @returns Array of templates ordered by default first, then name
 */
export async function getContractTemplates(): Promise<ContractTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Get contract statistics by status
 *
 * @returns Count of contracts per status
 */
export async function getContractStats(): Promise<
  Record<ContractStatus, number>
> {
  const supabase = await createClient();

  // Fetch all contracts
  const { data, error } = await supabase.from('contracts').select('status');

  if (error) {
    console.error('Error fetching contract stats:', error);
    return {
      draft: 0,
      sent: 0,
      viewed: 0,
      signed: 0,
      completed: 0,
      active: 0,
      fulfilled: 0,
      amended: 0,
      terminated: 0,
    };
  }

  // Count by status
  const stats: Record<ContractStatus, number> = {
    draft: 0,
    sent: 0,
    viewed: 0,
    signed: 0,
    completed: 0,
    active: 0,
    fulfilled: 0,
    amended: 0,
    terminated: 0,
  };

  (data || []).forEach((contract: { status: ContractStatus }) => {
    stats[contract.status] = (stats[contract.status] || 0) + 1;
  });

  return stats;
}
