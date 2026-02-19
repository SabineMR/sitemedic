/**
 * useRole — Centralized role helper hook.
 *
 * Derives role flags from AuthContext so components don't each
 * repeat `state.user?.role === 'admin'` inline.
 *
 * Usage:
 *   const { isAdmin, isMedic, isSiteManager, isLoading } = useRole();
 */

import { useAuth } from '../src/contexts/AuthContext';

export function useRole() {
  const { state } = useAuth();
  const role = state.user?.role ?? null;

  return {
    role,
    isAdmin: role === 'admin' || role === 'org_admin',
    isPlatformAdmin: role === 'platform_admin',
    isMedic: role === 'medic',
    isSiteManager: role === 'site_manager',
    isLoading: state.isLoading,
  };
}
