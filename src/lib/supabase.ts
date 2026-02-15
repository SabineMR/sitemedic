/**
 * Supabase Client Initialization
 * 
 * GDPR: Supabase project MUST be in eu-west-2 (London) region for UK data residency.
 * UK health data is "special category personal data" under GDPR Article 9 and must
 * remain within UK/EEA jurisdiction.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../types/supabase';

// Read environment variables (Expo automatically loads EXPO_PUBLIC_* prefixed vars)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env file.'
  );
}

/**
 * Supabase client configured for offline-first React Native mobile app.
 * 
 * Configuration notes:
 * - storage: AsyncStorage for session persistence (React Native has no localStorage)
 * - autoRefreshToken: Automatically refresh auth tokens before expiry
 * - persistSession: Keep session across app restarts
 * - detectSessionInUrl: DISABLED for mobile (web-only feature, would break deep links)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // CRITICAL: Mobile apps must NOT use URL-based auth
  },
});
