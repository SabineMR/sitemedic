'use client';

/**
 * Organization Context
 *
 * Provides organization context to client-side components in the React tree.
 * Automatically fetches the current user's org_id from their JWT app_metadata
 * on mount and makes it available to all child components.
 *
 * This prevents prop drilling and ensures consistent org context across
 * client components.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Organization context value shape
 */
interface OrgContextValue {
  /** Current user's organization UUID */
  orgId: string | null;

  /** Organization slug (e.g., 'asg') for routing/branding */
  orgSlug: string | null;

  /** Organization display name (e.g., 'Allied Services Group') */
  orgName: string | null;

  /** Loading state - true while fetching user data */
  loading: boolean;

  /** Error state if org fetch failed */
  error: Error | null;
}

/**
 * Default context value (before provider mounts)
 */
const defaultContextValue: OrgContextValue = {
  orgId: null,
  orgSlug: null,
  orgName: null,
  loading: true,
  error: null,
};

/**
 * Organization context - should not be used directly
 * Use the useOrg() hook instead
 */
const OrgContext = createContext<OrgContextValue>(defaultContextValue);

/**
 * Organization Provider Props
 */
interface OrgProviderProps {
  children: ReactNode;
}

/**
 * Organization Provider Component
 *
 * Wrap your app with this provider to make org context available to all
 * client components. Typically added in app/layout.tsx.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { OrgProvider } from '@/contexts/org-context';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <OrgProvider>
 *           {children}
 *         </OrgProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function OrgProvider({ children }: OrgProviderProps) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchOrgContext() {
      try {
        const supabase = createClient();

        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        // Silently handle missing session (expected on public pages)
        if (userError?.message === 'Auth session missing!' || userError?.name === 'AuthSessionMissingError') {
          if (mounted) {
            setOrgId(null);
            setOrgSlug(null);
            setOrgName(null);
            setLoading(false);
          }
          return;
        }

        if (userError) {
          throw userError;
        }

        if (!user) {
          // Not authenticated - clear org state
          if (mounted) {
            setOrgId(null);
            setOrgSlug(null);
            setOrgName(null);
            setLoading(false);
          }
          return;
        }

        // Extract org_id from JWT app_metadata
        const userOrgId = user.app_metadata?.org_id;
        const userOrgSlug = user.app_metadata?.org_slug;

        if (!userOrgId) {
          console.warn('User authenticated but has no org_id in app_metadata:', user.id);
          if (mounted) {
            setOrgId(null);
            setOrgSlug(null);
            setOrgName(null);
            setLoading(false);
          }
          return;
        }

        // Fetch full org details from database
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, slug, name')
          .eq('id', userOrgId)
          .single();

        if (orgError) {
          throw orgError;
        }

        if (mounted) {
          setOrgId(org.id);
          setOrgSlug(org.slug);
          setOrgName(org.name);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching org context:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch org context'));
          setLoading(false);
        }
      }
    }

    fetchOrgContext();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []);

  const value: OrgContextValue = {
    orgId,
    orgSlug,
    orgName,
    loading,
    error,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

/**
 * Hook to access organization context in client components
 *
 * Returns the current user's organization information. Always check
 * the loading state before using orgId to avoid rendering with stale data.
 *
 * @returns {OrgContextValue} Organization context
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useOrg } from '@/contexts/org-context';
 *
 * export function BookingsList() {
 *   const { orgId, loading, error } = useOrg();
 *
 *   if (loading) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 *
 *   if (!orgId) {
 *     return <div>No organization assigned</div>;
 *   }
 *
 *   // Safe to use orgId here
 *   return <BookingsTable orgId={orgId} />;
 * }
 * ```
 */
export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);

  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }

  return context;
}

/**
 * Hook to get org_id, throwing an error if not available
 *
 * Convenience hook for components that absolutely require org_id.
 * Throws an error if loading, no org, or error state.
 *
 * @returns {string} Organization UUID (guaranteed non-null)
 * @throws {Error} If org is not available
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export function BookingForm() {
 *   const orgId = useRequireOrg();
 *   // orgId is guaranteed to be a string here
 *
 *   async function handleSubmit(formData) {
 *     await createBooking({ ...formData, org_id: orgId });
 *   }
 * }
 * ```
 */
export function useRequireOrg(): string {
  const { orgId, loading, error } = useOrg();

  if (loading) {
    throw new Error('Organization context is still loading');
  }

  if (error) {
    throw error;
  }

  if (!orgId) {
    throw new Error('User is not assigned to an organization');
  }

  return orgId;
}
