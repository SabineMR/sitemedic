'use client';

/**
 * Organization Context (Marketplace simplified version)
 *
 * Provides user role detection without org branding.
 * Marketplace components use useOrg() to check if user is authenticated
 * and detect their role (medic, site_manager, org_admin, platform_admin).
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'medic' | 'site_manager' | 'org_admin' | 'platform_admin';

export type VerticalId =
  | 'construction' | 'tv_film' | 'motorsport' | 'festivals'
  | 'sporting_events' | 'fairs_shows' | 'corporate'
  | 'private_events' | 'education' | 'outdoor_adventure'
  | 'general';

interface OrgContextValue {
  orgId: string | null;
  orgSlug: string | null;
  orgName: string | null;
  role: UserRole | null;
  industryVerticals: VerticalId[];
  loading: boolean;
  error: Error | null;
}

const defaultContextValue: OrgContextValue = {
  orgId: null,
  orgSlug: null,
  orgName: null,
  role: null,
  industryVerticals: [],
  loading: true,
  error: null,
};

const OrgContext = createContext<OrgContextValue>(defaultContextValue);

interface OrgProviderProps {
  children: ReactNode;
}

export function OrgProvider({ children }: OrgProviderProps) {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [industryVerticals, setIndustryVerticals] = useState<VerticalId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchOrgContext() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError?.message === 'Auth session missing!' || userError?.name === 'AuthSessionMissingError') {
          if (mounted) {
            setOrgId(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }

        if (userError) throw userError;

        if (!user) {
          if (mounted) {
            setOrgId(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }

        const userRole = user.app_metadata?.role as UserRole | undefined;
        const userOrgId = user.app_metadata?.org_id;

        if (userRole === 'platform_admin') {
          if (mounted) {
            setOrgId(null);
            setRole(userRole);
            setLoading(false);
          }
          return;
        }

        if (!userOrgId) {
          if (mounted) {
            setOrgId(null);
            setRole(userRole || null);
            setLoading(false);
          }
          return;
        }

        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, slug, name')
          .eq('id', userOrgId)
          .single();

        if (orgError) throw orgError;

        let verticals: VerticalId[] = ['construction'];
        const { data: orgSettings } = await supabase
          .from('org_settings')
          .select('industry_verticals')
          .eq('org_id', org.id)
          .single();
        if (orgSettings?.industry_verticals && Array.isArray(orgSettings.industry_verticals)) {
          verticals = orgSettings.industry_verticals as VerticalId[];
        }

        if (mounted) {
          setOrgId(org.id);
          setOrgSlug(org.slug);
          setOrgName(org.name);
          setRole(userRole || null);
          setIndustryVerticals(verticals);
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
    return () => { mounted = false; };
  }, []);

  const value: OrgContextValue = {
    orgId,
    orgSlug,
    orgName,
    role,
    industryVerticals,
    loading,
    error,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}

export function useRequireOrg(): string {
  const { orgId, loading, error } = useOrg();
  if (loading) throw new Error('Organization context is still loading');
  if (error) throw error;
  if (!orgId) throw new Error('User is not assigned to an organization');
  return orgId;
}

export function useIsPlatformAdmin(): boolean {
  const { role, loading } = useOrg();
  if (loading) return false;
  return role === 'platform_admin';
}

export function useIsOrgAdmin(): boolean {
  const { role, loading } = useOrg();
  if (loading) return false;
  return role === 'org_admin';
}

export function useRequireRole(): UserRole {
  const { role, loading, error } = useOrg();
  if (loading) throw new Error('Role context is still loading');
  if (error) throw error;
  if (!role) throw new Error('User has no role assigned');
  return role;
}

export function useRequirePlatformAdmin(): void {
  const { role, loading, error } = useOrg();
  if (loading) throw new Error('Role context is still loading');
  if (error) throw error;
  if (role !== 'platform_admin') throw new Error('Access denied: Platform admin role required');
}
