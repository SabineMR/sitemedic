/**
 * Authentication Types
 *
 * Defines TypeScript interfaces for authentication state, user profiles, and roles.
 * Supports offline-first architecture with cached session indicators.
 */

export type UserRole = 'medic' | 'site_manager' | 'admin' | 'org_admin' | 'platform_admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  orgId: string;
  orgName?: string;
  role: UserRole;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  session: any | null; // Supabase Session type
  isOnline: boolean;
  isOfflineSession: boolean; // True when using cached session while offline
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  orgId: string;
  role?: UserRole;
}
