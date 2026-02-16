/**
 * TanStack Query provider
 *
 * Provides client-side data caching with 60-second default polling interval.
 * Per DASH-09: Dashboard updates via 60-second polling for near-real-time data.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside component to avoid sharing state between requests (SSR)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // 60 seconds (data considered fresh for 1 minute)
            refetchInterval: 60_000, // 60 seconds (poll every minute)
            refetchOnWindowFocus: true, // Refetch when user returns to tab
            retry: 1, // Retry failed queries once
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
