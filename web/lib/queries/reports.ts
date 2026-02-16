/**
 * Weekly Reports data queries and hooks
 *
 * Server-side data fetching for initial page load, client-side hooks for 60-second polling.
 * Provides access to generated weekly safety reports with download URLs and on-demand generation.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types
export interface WeeklyReport {
  id: string;
  week_ending: string;
  storage_path: string;
  signed_url: string | null;
  signed_url_expires_at: string | null;
  file_size_bytes: number | null;
  generation_time_ms: number | null;
  trigger_type: 'cron' | 'manual';
  email_sent: boolean;
  created_at: string;
}

/**
 * Server-side: Fetch weekly reports
 * Returns up to 52 reports (1 year) ordered by week_ending DESC
 */
export async function fetchReports(
  supabase: SupabaseClient
): Promise<WeeklyReport[]> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('week_ending', { ascending: false })
    .limit(52);

  if (error) {
    console.error('Error fetching weekly reports:', error);
    throw error;
  }

  return data || [];
}

/**
 * Client-side: useReports hook with 60-second polling
 * Polls to pick up newly generated reports from cron or manual triggers
 */
export function useReports(initialData?: WeeklyReport[]) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['weekly-reports'],
    queryFn: () => fetchReports(supabase),
    initialData,
    refetchInterval: 60_000, // 60 seconds
  });
}

/**
 * Generate a new weekly report on-demand
 * Calls the generate-weekly-report Edge Function and returns PDF blob
 *
 * @param weekEnding Optional week ending date (defaults to most recent Friday in Edge Function)
 * @returns PDF blob for download
 */
export async function generateReport(
  supabase: SupabaseClient,
  weekEnding?: string
): Promise<Blob> {
  const { data, error } = await supabase.functions.invoke(
    'generate-weekly-report',
    {
      body: {
        trigger: 'manual',
        week_ending: weekEnding,
      },
    }
  );

  if (error) {
    console.error('Error generating report:', error);
    throw error;
  }

  // The Edge Function returns a PDF buffer for manual triggers
  // Supabase client returns it as a Blob
  if (data instanceof Blob) {
    return data;
  }

  // If it's not a Blob, it might be raw bytes - wrap it
  return new Blob([data as BlobPart], { type: 'application/pdf' });
}

/**
 * Get download URL for a report
 * If signed URL exists and not expired, return it
 * Otherwise, regenerate a new signed URL (7-day expiry)
 *
 * @param storagePath Path in safety-reports bucket
 * @returns Signed download URL
 */
export async function getDownloadUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string> {
  // Generate new signed URL (7-day expiry per Plan 05-02)
  const { data, error } = await supabase.storage
    .from('safety-reports')
    .createSignedUrl(storagePath, 604800); // 7 days in seconds

  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error('Failed to create signed URL');
  }

  return data.signedUrl;
}
