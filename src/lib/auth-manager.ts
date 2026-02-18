/**
 * Authentication Manager
 *
 * Offline-safe authentication wrapper around Supabase Auth.
 *
 * CRITICAL: Medics work on construction sites with zero signal. This manager
 * NEVER logs users out when offline (Research Pitfall 2 mitigation). Session
 * cached in AsyncStorage is restored when Supabase triggers SIGNED_OUT event
 * while device is offline.
 *
 * Architecture:
 * - NetInfo monitors connectivity (isOnline flag)
 * - All auth operations cache session to AsyncStorage
 * - SIGNED_OUT event intercepted: if offline, restore cached session
 * - JWT expiry checked locally (no server call needed)
 * - Accepts JWT staleness up to 1 hour (acceptable per research)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './supabase';
import type { UserProfile, SignUpData, UserRole } from '../types/auth';
import type { Session } from '@supabase/supabase-js';

class AuthManager {
  private isOnline: boolean = true;
  private sessionCacheKey = 'sitemedic.auth.session';
  private profileCacheKey = 'sitemedic.auth.profile';

  /**
   * Initialize auth manager
   * Sets up network monitoring and session restoration
   */
  async initialize(): Promise<void> {
    // Set up network connectivity monitoring.
    // NOTE: isConnected (not isInternetReachable) is intentional — isInternetReachable is
    // unreliable on iOS Simulator (often reports false even when internet is accessible).
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        console.log('[AuthManager] Back online - session will sync with server');
      } else if (wasOnline && !this.isOnline) {
        console.log('[AuthManager] Went offline - using cached session');
      }
    });

    // Check initial network state
    const networkState = await NetInfo.fetch();
    this.isOnline = networkState.isConnected ?? false;
    console.log('[AuthManager] Initial network state: isConnected =', networkState.isConnected, '| isOnline =', this.isOnline);

    // If offline on startup, try to restore cached session
    if (!this.isOnline) {
      await this.restoreCachedSession();
    }

    // Set up Supabase auth state listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthManager] Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        // CRITICAL: Prevent offline logout
        // If offline, restore cached session instead of logging out
        if (!this.isOnline) {
          console.log('[AuthManager] SIGNED_OUT while offline - restoring cached session to prevent logout');
          await this.restoreCachedSession();
          return;
        }

        // If online, SIGNED_OUT may fire due to automatic token refresh failure (not a
        // real logout). Only clear the session credential cache — preserve the profile
        // cache so orgId survives token expiry. signOut() explicitly calls clearCache()
        // to wipe everything when the user actually logs out.
        console.log('[AuthManager] SIGNED_OUT while online - clearing session cache only');
        await this.clearSessionCache();
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Cache session for offline restoration.
        // INITIAL_SESSION fires when onAuthStateChange is first set up — important to
        // capture so restoreCachedSession() has something to restore later.
        if (session) {
          console.log('[AuthManager] Caching session after', event);
          await this.cacheSession(session);
        }
      }
    });
  }

  /**
   * Sign up new user with email/password and organization assignment
   */
  async signUp(data: SignUpData): Promise<{ data: any; error: any }> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            org_id: data.orgId,
            role: data.role || 'medic',
          },
        },
      });

      if (error) {
        return { data: null, error };
      }

      // Cache session and profile
      if (authData.session) {
        await this.cacheSession(authData.session);
      }

      if (authData.user) {
        const profile: UserProfile = {
          id: authData.user.id,
          email: authData.user.email!,
          fullName: data.fullName,
          orgId: data.orgId,
          role: data.role || 'medic',
        };
        await this.cacheProfile(profile);
      }

      return { data: authData, error: null };
    } catch (error) {
      console.error('[AuthManager] Sign up error:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign in user with email/password
   */
  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { data: null, error };
      }

      // Cache session
      if (data.session) {
        await this.cacheSession(data.session);
      }

      // Fetch and cache user profile from profiles table
      if (data.user) {
        const profile = await this.fetchUserProfile(data.user.id);
        if (profile) {
          await this.cacheProfile(profile);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('[AuthManager] Sign in error:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign out user (clears cache and Supabase session)
   */
  async signOut(): Promise<void> {
    try {
      await this.clearCache();
      await supabase.auth.signOut();
      console.log('[AuthManager] Signed out successfully');
    } catch (error) {
      console.error('[AuthManager] Sign out error:', error);
    }
  }

  /**
   * Get current session (from Supabase or cache if offline)
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[AuthManager] Error getting session from Supabase:', error);

        // If offline, try to restore from cache
        if (!this.isOnline) {
          console.log('[AuthManager] Offline - using cached session');
          const cachedSession = await this.getCachedSession();
          return cachedSession;
        }

        return null;
      }

      return data.session;
    } catch (error) {
      console.error('[AuthManager] Get session error:', error);

      // If offline, try to restore from cache
      if (!this.isOnline) {
        console.log('[AuthManager] Exception during getSession, offline - using cached session');
        const cachedSession = await this.getCachedSession();
        return cachedSession;
      }

      return null;
    }
  }

  /**
   * Get user profile (from Supabase profiles table, AsyncStorage cache, or JWT metadata)
   *
   * Fallback chain (each step only runs if the previous returned null):
   *   1. Fetch from DB via fetchUserProfile()  — requires network
   *   2. AsyncStorage cached profile           — always available if previously online
   *   3. Build from JWT user_metadata          — always available (JWT is local)
   *
   * The isOnline flag is intentionally NOT used as a gate here. NetInfo can report
   * "connected" while the device cannot actually reach Supabase (e.g. iOS Simulator
   * with Network Link Conditioner, captive portals, etc). We fall back aggressively
   * so state.user is never null for a previously-authenticated user.
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      // getSession() reads from AsyncStorage (local, no network call).
      // Replaces getUser() which makes a live HTTP request — prone to race condition
      // on startup before Supabase has finished loading the session from storage.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Session is null — this can happen when the token refresh fails while offline
        // (Supabase fires SIGNED_OUT, clearing the in-memory session). Fall back to the
        // profile cache so previously-authenticated users aren't broken.
        console.log('[AuthManager] getSession() returned null — trying cache/JWT fallback');
        return await this.getProfileFromCacheOrJwt();
      }

      const userId = session.user.id;
      const jwtOrgId: string | undefined = session.user.user_metadata?.org_id;
      console.log('[AuthManager] getUserProfile: userId =', userId, '| jwtOrgId =', jwtOrgId);

      // Fetch fresh profile from DB (network call — may fail offline)
      const profile = await this.fetchUserProfile(userId);
      console.log('[AuthManager] getUserProfile: fetchUserProfile returned', profile ? `profile with orgId=${profile.orgId}` : 'null');

      if (profile) {
        // Supplement null orgId from JWT metadata (handles users whose profiles
        // row in DB has a null org_id — org_id was stored in JWT at signup)
        if (!profile.orgId && jwtOrgId) {
          profile.orgId = jwtOrgId;
          console.log('[AuthManager] getUserProfile: supplemented null orgId from JWT:', jwtOrgId);
        }
        await this.cacheProfile(profile);
        return profile;
      }

      // DB fetch failed — fall back to cache, then JWT metadata
      return await this.getProfileFromCacheOrJwt();
    } catch (error) {
      console.error('[AuthManager] Get user profile error:', error);
      return await this.getProfileFromCacheOrJwt();
    }
  }

  /**
   * Profile fallback chain used when DB is unavailable:
   * 1. AsyncStorage cache (populated on last successful DB fetch)
   * 2. JWT user_metadata from local session (set at signup, always local)
   */
  private async getProfileFromCacheOrJwt(): Promise<UserProfile | null> {
    // Step 1: AsyncStorage cache
    const cached = await this.getCachedProfile();
    if (cached) {
      console.log('[AuthManager] Using cached profile');
      return cached;
    }

    // Step 2: JWT user_metadata — getSession() reads local storage, no network needed
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        if (meta.org_id) {
          console.log('[AuthManager] Building profile from JWT user_metadata');
          return {
            id: session.user.id,
            email: session.user.email || '',
            fullName: meta.full_name || '',
            orgId: meta.org_id,
            role: ((meta.role as UserRole) || 'medic'),
          };
        }
      }
    } catch (_) {
      console.error('[AuthManager] Could not read session for JWT metadata fallback');
    }

    return null;
  }

  /**
   * Fetch user profile from Supabase profiles table
   */
  private async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, org_id, role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('[AuthManager] fetchUserProfile DB error:', JSON.stringify(error));
        return null;
      }
      console.log('[AuthManager] fetchUserProfile raw DB data: org_id =', (data as any).org_id);

      // Type assertion safe here: we know the structure from migration 00002_profiles_and_roles.sql
      const profile = data as {
        id: string;
        email: string;
        full_name: string;
        org_id: string;
        role: string;
      };

      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        orgId: profile.org_id,
        role: profile.role as UserRole,
      };
    } catch (error) {
      console.error('[AuthManager] Fetch user profile error:', error);
      return null;
    }
  }

  /**
   * Cache session in AsyncStorage for offline restoration
   */
  private async cacheSession(session: Session): Promise<void> {
    try {
      await AsyncStorage.setItem(this.sessionCacheKey, JSON.stringify(session));
      console.log('[AuthManager] Session cached');
    } catch (error) {
      console.error('[AuthManager] Error caching session:', error);
    }
  }

  /**
   * Cache user profile in AsyncStorage for offline access
   */
  private async cacheProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(this.profileCacheKey, JSON.stringify(profile));
      console.log('[AuthManager] Profile cached');
    } catch (error) {
      console.error('[AuthManager] Error caching profile:', error);
    }
  }

  /**
   * Get cached session from AsyncStorage
   */
  private async getCachedSession(): Promise<Session | null> {
    try {
      const cached = await AsyncStorage.getItem(this.sessionCacheKey);
      if (!cached) {
        return null;
      }

      const session = JSON.parse(cached) as Session;

      // Check if token is expired (local check, no server call)
      if (session.expires_at && session.expires_at < Date.now() / 1000) {
        console.log('[AuthManager] Cached session expired');
        return null;
      }

      return session;
    } catch (error) {
      console.error('[AuthManager] Error reading cached session:', error);
      return null;
    }
  }

  /**
   * Get cached profile from AsyncStorage (public — used as fallback in UI layer)
   */
  async getCachedProfile(): Promise<UserProfile | null> {
    try {
      const cached = await AsyncStorage.getItem(this.profileCacheKey);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as UserProfile;
    } catch (error) {
      console.error('[AuthManager] Error reading cached profile:', error);
      return null;
    }
  }

  /**
   * Restore cached session to Supabase (prevents offline logout)
   */
  private async restoreCachedSession(): Promise<void> {
    try {
      const cachedSession = await this.getCachedSession();

      if (!cachedSession) {
        console.log('[AuthManager] No cached session to restore');
        return;
      }

      // Check if token is expired
      if (cachedSession.expires_at && cachedSession.expires_at < Date.now() / 1000) {
        console.log('[AuthManager] Cached session expired - cannot restore');
        // Clear session cache only — profile cache must survive token expiry so that
        // orgId and user data remain accessible even when the JWT has lapsed.
        await this.clearSessionCache();
        return;
      }

      // Restore session to Supabase
      const { error } = await supabase.auth.setSession({
        access_token: cachedSession.access_token,
        refresh_token: cachedSession.refresh_token,
      });

      if (error) {
        console.error('[AuthManager] Error restoring cached session:', error);
        return;
      }

      console.log('[AuthManager] ✓ Cached session restored successfully');
    } catch (error) {
      console.error('[AuthManager] Restore cached session error:', error);
    }
  }

  /**
   * Clear session cache only — preserves profile cache.
   * Use this when the token expires or Supabase forces a SIGNED_OUT.
   * Profile data (including orgId) remains valid even when the JWT lapses.
   */
  private async clearSessionCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.sessionCacheKey);
      console.log('[AuthManager] Session cache cleared (profile cache preserved)');
    } catch (error) {
      console.error('[AuthManager] Error clearing session cache:', error);
    }
  }

  /**
   * Clear all cached auth data — session + profile.
   * Only called on explicit user sign-out.
   */
  private async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.sessionCacheKey, this.profileCacheKey]);
      console.log('[AuthManager] Full cache cleared');
    } catch (error) {
      console.error('[AuthManager] Error clearing cache:', error);
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();
