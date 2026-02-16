/**
 * Supabase browser client for Client Components
 *
 * Uses @supabase/ssr with browser-based cookie handling.
 * This client should ONLY be used in Client Components ('use client').
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
