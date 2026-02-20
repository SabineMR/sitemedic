/**
 * PushTokenService
 *
 * Singleton service for push notification token lifecycle management.
 *
 * Responsibilities:
 * - Request iOS push notification permission (once, on first Messages tab visit)
 * - Retrieve Expo push token and register it in profiles.push_token
 * - Conditional update: only writes to DB if token changed or >7 days stale
 * - Token change listener for rare mid-session token rotations
 * - Logout cleanup: sets push_token to null to prevent stale delivery
 *
 * Phase 43: Real-Time Push Notifications
 */

import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'

// Lazily require native-backed packages so the service degrades gracefully
// in environments without the native binary (e.g. Expo Go, web).
let Notifications: typeof import('expo-notifications') | null = null
let Constants: typeof import('expo-constants') | null = null

try {
  Notifications = require('expo-notifications')
} catch (_) {}
try {
  Constants = require('expo-constants')
} catch (_) {}

// ── Constants ────────────────────────────────────────────────────────────────

/** Only update the token in Supabase if the existing one is older than 7 days */
const TOKEN_STALENESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

export type PermissionStatus = 'granted' | 'denied' | 'undetermined'

// ── Module-level notification handler ────────────────────────────────────────
// Setting shouldShowAlert: false prevents the native banner from covering the
// app when a notification arrives while the app is in the foreground.
// Sound and badge are still allowed so the user knows something arrived.

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

// ── Service ──────────────────────────────────────────────────────────────────

export class PushTokenService {
  /**
   * Register push token for the given user.
   *
   * Flow:
   * 1. Check current permission status
   * 2. If undetermined, request permission (iOS shows the native dialog once)
   * 3. If denied, return null (do NOT re-prompt -- iOS only shows once)
   * 4. Retrieve Expo push token
   * 5. Compare against profiles.push_token in Supabase
   * 6. Only update if token changed OR push_token_updated_at is stale (>7 days)
   *
   * @param userId - Supabase auth user UUID
   * @returns The Expo push token string on success, null on failure/denial
   */
  async registerPushToken(userId: string): Promise<string | null> {
    if (!Notifications) {
      console.log('[PushToken] expo-notifications not available')
      return null
    }

    try {
      // 1. Check current permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync()

      let finalStatus = existingStatus

      // 2. If undetermined, request permission
      if (existingStatus === 'undetermined') {
        console.log('[PushToken] Requesting permission...')
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        })
        finalStatus = status
      }

      // 3. If denied, return null
      if (finalStatus !== 'granted') {
        console.log(`[PushToken] Permission denied (status: ${finalStatus})`)
        return null
      }

      // 4. Get Expo push token
      const projectId = this.getProjectId()
      if (!projectId) {
        console.warn('[PushToken] No project ID available -- cannot get push token')
        return null
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
      const token = tokenData.data

      console.log(`[PushToken] Token retrieved: ${token.substring(0, 30)}...`)

      // 5. Compare against stored value
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('push_token, push_token_updated_at')
        .eq('id', userId as any)
        .single()

      if (fetchError) {
        console.error('[PushToken] Failed to fetch profile:', fetchError)
        return null
      }

      const storedToken = (profile as any)?.push_token as string | null
      const updatedAt = (profile as any)?.push_token_updated_at as string | null

      // 6. Only update if changed or stale
      const isChanged = storedToken !== token
      const isStale =
        !updatedAt ||
        Date.now() - new Date(updatedAt).getTime() > TOKEN_STALENESS_THRESHOLD_MS

      if (!isChanged && !isStale) {
        console.log('[PushToken] Skipped (unchanged and fresh)')
        return token
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          push_token: token,
          push_token_updated_at: new Date().toISOString(),
        } as any)
        .eq('id', userId as any)

      if (updateError) {
        console.error('[PushToken] Failed to update push_token:', updateError)
        return null
      }

      console.log(
        `[PushToken] Registered: ${token.substring(0, 30)}... (reason: ${isChanged ? 'changed' : 'stale'})`
      )
      return token
    } catch (error) {
      console.error('[PushToken] Registration failed:', error)
      return null
    }
  }

  /**
   * Clear push token on logout.
   * Sets profiles.push_token and push_token_updated_at to null so the server
   * does not attempt to send notifications to a logged-out device.
   *
   * @param userId - Supabase auth user UUID
   */
  async clearPushToken(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: null,
          push_token_updated_at: null,
        } as any)
        .eq('id', userId as any)

      if (error) {
        console.error('[PushToken] Failed to clear push_token:', error)
      } else {
        console.log('[PushToken] Cleared push_token on logout')
      }
    } catch (error) {
      console.error('[PushToken] Clear failed:', error)
    }
  }

  /**
   * Get current notification permission status.
   * Used by UI to show "Enable notifications" banner when denied.
   *
   * @returns 'granted' | 'denied' | 'undetermined'
   */
  async getPermissionStatus(): Promise<PermissionStatus> {
    if (!Notifications) {
      return 'undetermined'
    }

    try {
      const { status } = await Notifications.getPermissionsAsync()
      if (status === 'granted') return 'granted'
      if (status === 'denied') return 'denied'
      return 'undetermined'
    } catch {
      return 'undetermined'
    }
  }

  /**
   * Set up a listener for rare push token changes.
   * iOS may rotate the device token under certain conditions (e.g. after
   * a system restore). When this happens, re-register the new token.
   *
   * @param userId - Supabase auth user UUID
   * @returns Cleanup function to remove the listener
   */
  setupTokenChangeListener(userId: string): () => void {
    if (!Notifications) {
      return () => {}
    }

    const subscription = Notifications.addPushTokenListener((_tokenData: any) => {
      console.log('[PushToken] Token changed -- re-registering')
      this.registerPushToken(userId).catch((err: Error) => {
        console.error('[PushToken] Re-registration after token change failed:', err)
      })
    })

    return () => {
      subscription.remove()
    }
  }

  /**
   * Resolve the EAS project ID from Constants or environment variable.
   * Tries multiple sources in order:
   * 1. expo.extra.eas.projectId (from app.json)
   * 2. EXPO_PUBLIC_PROJECT_ID environment variable
   */
  private getProjectId(): string | undefined {
    if (Constants) {
      const expoConfig = (Constants as any).default?.expoConfig ?? (Constants as any).expoConfig
      const easProjectId = expoConfig?.extra?.eas?.projectId
      if (easProjectId) return easProjectId
    }

    return process.env.EXPO_PUBLIC_PROJECT_ID || undefined
  }
}

// Export singleton instance
export const pushTokenService = new PushTokenService()
