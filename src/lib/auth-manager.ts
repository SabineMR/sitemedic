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
    // Set up network connectivity monitoring
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

        // If online, allow logout and clear cache
        console.log('[AuthManager] SIGNED_OUT while online - clearing cache');
        await this.clearCache();
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Cache session for offline restoration
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
   * Get user profile (from Supabase profiles table or cache if offline)
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      // Get current user from Supabase Auth
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        // If offline, return cached profile
        if (!this.isOnline) {
          console.log('[AuthManager] Offline - using cached profile');
          return await this.getCachedProfile();
        }
        return null;
      }

      // Fetch profile from database
      const profile = await this.fetchUserProfile(user.id);

      // Cache it for offline access
      if (profile) {
        await this.cacheProfile(profile);
      }

      return profile;
    } catch (error) {
      console.error('[AuthManager] Get user profile error:', error);

      // If offline, return cached profile
      if (!this.isOnline) {
        console.log('[AuthManager] Exception during getUserProfile, offline - using cached profile');
        return await this.getCachedProfile();
      }

      return null;
    }
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
        console.error('[AuthManager] Error fetching profile:', error);
        return null;
      }

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
   * Get cached profile from AsyncStorage
   */
  private async getCachedProfile(): Promise<UserProfile | null> {
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
        await this.clearCache();
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
   * Clear all cached auth data
   */
  private async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.sessionCacheKey, this.profileCacheKey]);
      console.log('[AuthManager] Cache cleared');
    } catch (error) {
      console.error('[AuthManager] Error clearing cache:', error);
    }
  }
}

// Export singleton instance
export const authManager = new AuthManager();
