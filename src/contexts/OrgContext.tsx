/**
 * Organization Context (Mobile)
 *
 * Provides the org's industry_verticals to all components via useOrg() hook.
 * Fetches once at login from Supabase org_settings, then caches in AsyncStorage
 * under 'sitemedic.org.vertical_cache' for offline-first access.
 *
 * Design goals:
 * - No Supabase fetch on every form mount (centralised, single fetch per login)
 * - Cache used directly when device is offline and cache exists
 * - On logout (isAuthenticated=false): context state is cleared
 * - primaryVertical = industryVerticals[0] ?? 'general'
 *
 * Must be mounted:
 *   INSIDE AuthProvider  (depends on useAuth())
 *   OUTSIDE SyncProvider (SyncContext may call useOrg() in Phase 18+)
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const VERTICAL_CACHE_KEY = 'sitemedic.org.vertical_cache';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VerticalId =
  | 'construction'
  | 'tv_film'
  | 'motorsport'
  | 'festivals'
  | 'sporting_events'
  | 'fairs_shows'
  | 'corporate'
  | 'private_events'
  | 'education'
  | 'outdoor_adventure';

interface VerticalCache {
  orgId: string;
  verticals: string[];
}

interface OrgContextValue {
  /** Current user's organization UUID */
  orgId: string | null;
  /** Industry verticals from org_settings (cached) */
  industryVerticals: string[];
  /** First vertical, or 'general' if none configured */
  primaryVertical: string;
  /** True while initial fetch is in progress */
  isLoading: boolean;
  /** Non-null if a network fetch failed and no cache was available */
  error: Error | null;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface OrgProviderProps {
  children: ReactNode;
}

export function OrgProvider({ children }: OrgProviderProps) {
  const { state } = useAuth();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [industryVerticals, setIndustryVerticals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Not yet authenticated or still initialising AuthContext — clear state
    if (!state.isAuthenticated || state.isLoading) {
      if (!state.isAuthenticated && !state.isLoading) {
        // Logged out: clear org state and cached vertical
        setOrgId(null);
        setIndustryVerticals([]);
        setError(null);
        setIsLoading(false);
        AsyncStorage.removeItem(VERTICAL_CACHE_KEY).catch(() => {
          // Non-fatal: cache will be overwritten on next login
        });
      }
      return;
    }

    const currentOrgId = state.user?.orgId;

    // User is authenticated but has no orgId (should not happen in normal flow)
    if (!currentOrgId) {
      console.warn('[OrgContext] Authenticated user has no orgId');
      setOrgId(null);
      setIndustryVerticals([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadVerticals() {
      setIsLoading(true);
      setError(null);

      // Step 1: Try the AsyncStorage cache first
      try {
        const raw = await AsyncStorage.getItem(VERTICAL_CACHE_KEY);
        if (raw) {
          const cached: VerticalCache = JSON.parse(raw);
          // Cache is valid if it belongs to the current org
          if (cached.orgId === currentOrgId && Array.isArray(cached.verticals)) {
            if (!cancelled) {
              setOrgId(currentOrgId);
              setIndustryVerticals(cached.verticals);
              setIsLoading(false);
            }
            // Still attempt a background refresh to keep cache fresh
            // (fire-and-forget, failures are non-fatal)
            fetchAndCacheVerticals(currentOrgId, /* background */ true, cancelled).catch(() => {});
            return;
          }
        }
      } catch {
        // Cache read failure is non-fatal — fall through to network fetch
      }

      // Step 2: No valid cache — fetch from Supabase
      await fetchAndCacheVerticals(currentOrgId, /* background */ false, cancelled);
    }

    /**
     * Fetch industry_verticals from org_settings and update state + cache.
     *
     * @param orgIdToFetch  - The org ID to fetch for
     * @param background    - If true, failures are silent (cache already served UI)
     * @param isCancelled   - Closure over the cancelled flag; avoids stale setState
     */
    async function fetchAndCacheVerticals(
      orgIdToFetch: string,
      background: boolean,
      isCancelled: boolean,
    ) {
      try {
        const { data, error: fetchError } = await supabase
          .from('org_settings')
          .select('industry_verticals')
          .eq('org_id', orgIdToFetch)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        const verticals: string[] =
          data?.industry_verticals && Array.isArray(data.industry_verticals)
            ? (data.industry_verticals as string[])
            : ['construction'];

        // Persist to cache
        const cachePayload: VerticalCache = { orgId: orgIdToFetch, verticals };
        await AsyncStorage.setItem(VERTICAL_CACHE_KEY, JSON.stringify(cachePayload));

        if (!isCancelled) {
          setOrgId(orgIdToFetch);
          setIndustryVerticals(verticals);
          if (!background) {
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (background) {
          // Background refresh failure: silently ignore — UI already has cached data
          console.warn('[OrgContext] Background vertical refresh failed:', err);
          return;
        }

        // Foreground fetch failure: try the cache as offline fallback
        console.warn('[OrgContext] Network fetch failed, checking cache for offline fallback:', err);
        try {
          const raw = await AsyncStorage.getItem(VERTICAL_CACHE_KEY);
          if (raw) {
            const cached: VerticalCache = JSON.parse(raw);
            if (cached.orgId === orgIdToFetch && Array.isArray(cached.verticals)) {
              console.log('[OrgContext] Offline: using stale cache for orgId', orgIdToFetch);
              if (!isCancelled) {
                setOrgId(orgIdToFetch);
                setIndustryVerticals(cached.verticals);
                setError(null);
                setIsLoading(false);
              }
              return;
            }
          }
        } catch {
          // Cache read also failed — fall through to error state
        }

        // No cache, no network — surface the error
        if (!isCancelled) {
          const wrappedErr = err instanceof Error ? err : new Error('Failed to load org verticals');
          setError(wrappedErr);
          setOrgId(orgIdToFetch);
          setIndustryVerticals([]);
          setIsLoading(false);
        }
      }
    }

    loadVerticals();

    return () => {
      cancelled = true;
    };
  }, [state.isAuthenticated, state.isLoading, state.user?.orgId]);

  const primaryVertical = industryVerticals[0] ?? 'general';

  const value: OrgContextValue = {
    orgId,
    industryVerticals,
    primaryVertical,
    isLoading,
    error,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to access the OrgContext in any component.
 *
 * Must be used within OrgProvider (which must be inside AuthProvider).
 *
 * @example
 * ```tsx
 * const { primaryVertical, orgId, isLoading } = useOrg();
 * ```
 */
export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);

  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }

  return context;
}
