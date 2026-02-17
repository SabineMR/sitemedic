/**
 * Submission query hooks and mutation functions for admin
 *
 * Provides TanStack Query hooks for contact_submissions and quote_submissions tables.
 * 60-second polling for near-real-time lead updates.
 * Mutation for inline status changes with org-scoped defense in depth.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRequireOrg } from '@/contexts/org-context';

// Types

export interface ContactSubmission {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string | null;
  site_size: string | null;
  enquiry_type: string;
  message: string | null;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  follow_up_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteSubmission {
  id: string;
  org_id: string;
  quote_ref: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  worker_count: string | null;
  project_type: string | null;
  medic_count: string | null;
  duration_known: string | null;
  estimated_duration: string | null;
  site_address: string | null;
  coordinates: string | null;
  what3words_address: string | null;
  start_date: string | null;
  end_date: string | null;
  project_phase: string | null;
  special_requirements: string[] | null;
  calculated_price: number | null;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  follow_up_notes: string | null;
  converted_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

// Client-side: useContactSubmissions hook with 60-second polling
export function useContactSubmissions() {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useQuery({
    queryKey: ['contact-submissions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as ContactSubmission[]) || [];
    },
    refetchInterval: 60_000, // 60-second polling
  });
}

// Client-side: useQuoteSubmissions hook with 60-second polling
export function useQuoteSubmissions() {
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useQuery({
    queryKey: ['quote-submissions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_submissions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as QuoteSubmission[]) || [];
    },
    refetchInterval: 60_000, // 60-second polling
  });
}

// Client-side: useUpdateSubmissionStatus mutation
// Updates status (and optionally follow_up_notes) on either submission table
export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = useRequireOrg(); // Get current user's org_id

  return useMutation({
    mutationFn: async ({
      id,
      status,
      table,
      followUpNotes,
    }: {
      id: string;
      status: 'new' | 'contacted' | 'converted' | 'closed';
      table: 'contact_submissions' | 'quote_submissions';
      followUpNotes?: string;
    }) => {
      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Only include follow_up_notes if provided
      if (followUpNotes !== undefined) {
        updatePayload.follow_up_notes = followUpNotes;
      }

      const { data, error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', id)
        .eq('org_id', orgId) // Defense in depth — org-scoped
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // Invalidate both query keys after mutation settles (success or error)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions', orgId] });
      queryClient.invalidateQueries({ queryKey: ['quote-submissions', orgId] });
    },
  });
}
