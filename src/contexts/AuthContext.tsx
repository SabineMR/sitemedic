/**
 * Authentication Context
 *
 * Provides authentication state and methods to all React components.
 *
 * AuthProvider wraps the AuthManager singleton and exposes:
 * - Authentication state (user, session, loading, online/offline)
 * - Auth methods (signUp, signIn, signOut)
 * - Biometric authentication (enable, disable, authenticate)
 *
 * Usage:
 * 1. Wrap app in <AuthProvider> at root level (App.tsx)
 * 2. Use useAuth() hook in any component to access auth state
 * 3. Check state.isLoading before rendering protected content
 * 4. Check state.isOfflineSession to show offline indicator in UI
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { authManager } from '../lib/auth-manager';
import {
  checkBiometricSupport,
  enableBiometricAuth,
  disableBiometricAuth,
  authenticateWithBiometrics,
} from '../lib/biometric-auth';
import type { AuthState, SignUpData } from '../types/auth';

interface AuthContextType {
  state: AuthState;
  signUp: (data: SignUpData) => Promise<{ error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  enableBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  biometricSupport: { isSupported: boolean; isEnrolled: boolean };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null,
    isOnline: true,
    isOfflineSession: false,
  });

  const [biometricSupport, setBiometricSupport] = useState({
    isSupported: false,
    isEnrolled: false,
  });

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      // Initialize AuthManager (sets up network listeners and session restoration)
      await authManager.initialize();

      // Check biometric support
      const support = await checkBiometricSupport();
      setBiometricSupport({
        isSupported: support.isSupported,
        isEnrolled: support.isEnrolled,
      });

      // Check network status
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected ?? false;

      // Try to get current session
      const session = await authManager.getSession();

      if (session) {
        // Get user profile
        const profile = await authManager.getUserProfile();

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: profile,
          session,
          isOnline,
          isOfflineSession: !isOnline, // If offline and have session, it's from cache
        });
      } else {
        // No session - user not authenticated
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          isOnline,
          isOfflineSession: false,
        });
      }

      // Set up network status listener
      NetInfo.addEventListener((state) => {
        setAuthState((prev) => ({
          ...prev,
          isOnline: state.isConnected ?? false,
          isOfflineSession: prev.isAuthenticated && !(state.isConnected ?? false),
        }));
      });
    } catch (error) {
      console.error('[AuthContext] Initialization error:', error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }

  async function signUp(data: SignUpData): Promise<{ error: any | null }> {
    try {
      const { data: authData, error } = await authManager.signUp(data);

      if (error) {
        return { error };
      }

      // Update auth state with new session
      if (authData?.session) {
        const profile = await authManager.getUserProfile();

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: profile,
          session: authData.session,
          isOnline: authState.isOnline,
          isOfflineSession: false,
        });
      }

      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Sign up error:', error);
      return { error };
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: any | null }> {
    try {
      const { data, error } = await authManager.signIn(email, password);

      if (error) {
        return { error };
      }

      // Update auth state with new session
      if (data?.session) {
        const profile = await authManager.getUserProfile();

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: profile,
          session: data.session,
          isOnline: authState.isOnline,
          isOfflineSession: false,
        });
      }

      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Sign in error:', error);
      return { error };
    }
  }

  async function signOut(): Promise<void> {
    try {
      await authManager.signOut();

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        isOnline: authState.isOnline,
        isOfflineSession: false,
      });
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
    }
  }

  async function enableBiometrics(): Promise<void> {
    try {
      if (!authState.user) {
        console.error('[AuthContext] Cannot enable biometrics: user not authenticated');
        return;
      }

      await enableBiometricAuth(authState.user.id);
      console.log('[AuthContext] Biometric authentication enabled');
    } catch (error) {
      console.error('[AuthContext] Error enabling biometrics:', error);
      throw error;
    }
  }

  async function disableBiometrics(): Promise<void> {
    try {
      if (!authState.user) {
        console.error('[AuthContext] Cannot disable biometrics: user not authenticated');
        return;
      }

      await disableBiometricAuth(authState.user.id);
      console.log('[AuthContext] Biometric authentication disabled');
    } catch (error) {
      console.error('[AuthContext] Error disabling biometrics:', error);
    }
  }

  async function authenticateBiometrically(): Promise<boolean> {
    try {
      const success = await authenticateWithBiometrics();

      if (success) {
        // Biometric authentication succeeded
        // If we have a session, we're good to go
        if (authState.session) {
          return true;
        }

        // If no session, try to restore from cache
        const session = await authManager.getSession();
        if (session) {
          const profile = await authManager.getUserProfile();
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: profile,
            session,
            isOnline: authState.isOnline,
            isOfflineSession: !authState.isOnline,
          });
          return true;
        }

        return false;
      }

      return false;
    } catch (error) {
      console.error('[AuthContext] Biometric authentication error:', error);
      return false;
    }
  }

  const contextValue: AuthContextType = {
    state: authState,
    signUp,
    signIn,
    signOut,
    enableBiometrics,
    disableBiometrics,
    authenticateWithBiometrics: authenticateBiometrically,
    biometricSupport,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
