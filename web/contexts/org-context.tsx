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
 * User role types
 */
export type UserRole = 'medic' | 'site_manager' | 'org_admin' | 'platform_admin';

/**
 * Organization context value shape
 */
interface OrgContextValue {
  /** Current user's organization UUID (null for platform admins) */
  orgId: string | null;

  /** Organization slug (e.g., 'asg') for routing/branding */
  orgSlug: string | null;

  /** Organization display name (e.g., 'Allied Services Group') */
  orgName: string | null;

  /** Current user's role */
  role: UserRole | null;

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
  role: null,
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
  const [role, setRole] = useState<UserRole | null>(null);
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
            setRole(null);
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
            setRole(null);
            setLoading(false);
          }
          return;
        }

        // Extract role and org_id from JWT app_metadata
        const userRole = user.app_metadata?.role as UserRole | undefined;
        const userOrgId = user.app_metadata?.org_id;
        const userOrgSlug = user.app_metadata?.org_slug;

        // Platform admins don't have an org_id - they manage all orgs
        if (userRole === 'platform_admin') {
          if (mounted) {
            setOrgId(null);
            setOrgSlug(null);
            setOrgName(null);
            setRole(userRole);
            setLoading(false);
          }
          return;
        }

        // For non-platform users, org_id is required
        if (!userOrgId) {
          console.warn('User authenticated but has no org_id in app_metadata:', user.id);
          if (mounted) {
            setOrgId(null);
            setOrgSlug(null);
            setOrgName(null);
            setRole(userRole || null);
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
          setRole(userRole || null);
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
    role,
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

/**
 * Hook to check if current user is a platform admin
 *
 * Platform admins have cross-org access and should use /platform routes.
 *
 * @returns {boolean} True if user is a platform admin
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export function AdminNav() {
 *   const isPlatformAdmin = useIsPlatformAdmin();
 *
 *   return (
 *     <nav>
 *       {isPlatformAdmin ? (
 *         <Link href="/platform">Platform Admin</Link>
 *       ) : (
 *         <Link href="/admin">Organization Admin</Link>
 *       )}
 *     </nav>
 *   );
 * }
 * ```
 */
export function useIsPlatformAdmin(): boolean {
  const { role, loading } = useOrg();

  if (loading) {
    return false;
  }

  return role === 'platform_admin';
}

/**
 * Hook to check if current user is an org admin
 *
 * Org admins manage their own organization's data via /admin routes.
 *
 * @returns {boolean} True if user is an org admin
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export function SettingsPage() {
 *   const isOrgAdmin = useIsOrgAdmin();
 *
 *   if (!isOrgAdmin) {
 *     return <div>Access denied: Admin role required</div>;
 *   }
 *
 *   return <SettingsForm />;
 * }
 * ```
 */
export function useIsOrgAdmin(): boolean {
  const { role, loading } = useOrg();

  if (loading) {
    return false;
  }

  return role === 'org_admin';
}

/**
 * Hook to get user role, throwing an error if not available
 *
 * Convenience hook for components that absolutely require role information.
 *
 * @returns {UserRole} User role (guaranteed non-null)
 * @throws {Error} If role is not available
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export function DashboardRouter() {
 *   const role = useRequireRole();
 *
 *   switch (role) {
 *     case 'platform_admin':
 *       return <PlatformDashboard />;
 *     case 'org_admin':
 *       return <OrgDashboard />;
 *     case 'medic':
 *       return <MedicDashboard />;
 *     default:
 *       return <DefaultDashboard />;
 *   }
 * }
 * ```
 */
export function useRequireRole(): UserRole {
  const { role, loading, error } = useOrg();

  if (loading) {
    throw new Error('Role context is still loading');
  }

  if (error) {
    throw error;
  }

  if (!role) {
    throw new Error('User has no role assigned');
  }

  return role;
}

/**
 * Hook to require platform admin access
 *
 * Throws an error if the current user is not a platform admin.
 * Use this in platform admin pages to enforce access control.
 *
 * @throws {Error} If user is not a platform admin
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * export function PlatformOrganizationsPage() {
 *   useRequirePlatformAdmin(); // Throws if not platform admin
 *
 *   return <OrganizationsList />;
 * }
 * ```
 */
export function useRequirePlatformAdmin(): void {
  const { role, loading, error } = useOrg();

  if (loading) {
    throw new Error('Role context is still loading');
  }

  if (error) {
    throw error;
  }

  if (role !== 'platform_admin') {
    throw new Error('Access denied: Platform admin role required');
  }
}
