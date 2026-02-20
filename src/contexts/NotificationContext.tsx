/**
 * NotificationContext
 *
 * React Context provider that manages the full push notification lifecycle:
 * - Token registration on first Messages tab visit (not on app launch)
 * - Foreground notification handling with custom in-app toast
 * - Background notification tap -> deep link to conversation
 * - App badge count management (foreground + mark-as-read)
 * - Permission status tracking for "enable notifications" UI
 *
 * Phase 43: Real-Time Push Notifications
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter, usePathname } from 'expo-router'
import { Q } from '@nozbe/watermelondb'
import { useAuth } from './AuthContext'
import { useOrg } from './OrgContext'
import { pushTokenService, PermissionStatus } from '../services/PushTokenService'
import { getDatabase } from '../lib/watermelon'
import Conversation from '../database/models/Conversation'

// Lazily require expo-notifications (may not be in all build variants)
let Notifications: typeof import('expo-notifications') | null = null
try {
  Notifications = require('expo-notifications')
} catch (_) {}

// ── Constants ────────────────────────────────────────────────────────────────

const PUSH_PERMISSION_PROMPTED_KEY = 'push_permission_prompted'
const TOAST_AUTO_DISMISS_MS = 4000

// ── Types ────────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  /** Current notification permission status */
  permissionStatus: PermissionStatus
  /** Update app badge count (call after mark-as-read) */
  updateBadgeCount: () => Promise<void>
  /** Request push permission and register token (called on first Messages tab visit) */
  promptForPermission: () => Promise<void>
  /** Open device Settings to enable notifications (when denied) */
  openNotificationSettings: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

// ── Toast State ──────────────────────────────────────────────────────────────

interface ToastData {
  id: string
  senderName: string
  preview: string
  conversationId: string
}

// ── Provider ─────────────────────────────────────────────────────────────────

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { state: authState } = useAuth()
  const { orgId } = useOrg()
  const router = useRouter()
  const pathname = usePathname()

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined')
  const [toast, setToast] = useState<ToastData | null>(null)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track current conversation for foreground suppression
  const currentConversationRef = useRef<string | null>(null)

  // Update current conversation ref based on route
  useEffect(() => {
    // Route pattern: /messages/<conversationId>
    const match = pathname.match(/\/messages\/([^/]+)$/)
    currentConversationRef.current = match ? match[1] : null
  }, [pathname])

  // ── Permission status check ──────────────────────────────────────────────

  useEffect(() => {
    if (!authState.isAuthenticated) return

    pushTokenService.getPermissionStatus().then(setPermissionStatus).catch(() => {})
  }, [authState.isAuthenticated])

  // ── Token change listener ────────────────────────────────────────────────

  useEffect(() => {
    if (!authState.user) return

    const cleanup = pushTokenService.setupTokenChangeListener(authState.user.id)
    return cleanup
  }, [authState.user?.id])

  // ── Foreground notification handler ──────────────────────────────────────

  useEffect(() => {
    if (!Notifications || !authState.isAuthenticated) return

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, any> | undefined
      const conversationId = data?.conversationId as string | undefined

      // If user is viewing the same conversation, ignore (messages will appear via sync)
      if (conversationId && conversationId === currentConversationRef.current) {
        console.log('[Notification] Suppressed -- user is viewing this conversation')
        return
      }

      // Show in-app toast
      const senderName = (data?.senderName as string) || 'New message'
      const preview =
        (notification.request.content.body as string) ||
        (data?.preview as string) ||
        'Sent you a message'

      showToast({
        id: notification.request.identifier,
        senderName,
        preview,
        conversationId: conversationId || '',
      })
    })

    return () => subscription.remove()
  }, [authState.isAuthenticated])

  // ── Background notification tap handler ──────────────────────────────────

  useEffect(() => {
    if (!Notifications || !authState.isAuthenticated) return

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any> | undefined
      const conversationId = data?.conversationId as string | undefined

      if (conversationId) {
        console.log(`[Notification] Tap -> navigating to messages/${conversationId}`)
        router.push(`/messages/${conversationId}` as any)
      } else {
        console.log('[Notification] Tap -> no conversationId, navigating to messages tab')
        router.push('/(tabs)/messages' as any)
      }
    })

    return () => subscription.remove()
  }, [authState.isAuthenticated, router])

  // ── App badge management ─────────────────────────────────────────────────

  const updateBadgeCount = useCallback(async () => {
    if (!Notifications) return

    try {
      const database = getDatabase()
      const unreadCount = await database.collections
        .get<Conversation>('conversations')
        .query(Q.where('unread_count', Q.gt(0)))
        .fetchCount()

      await Notifications.setBadgeCountAsync(unreadCount)
    } catch (error) {
      console.error('[Notification] Failed to update badge count:', error)
    }
  }, [])

  // Update badge on app foreground
  useEffect(() => {
    if (!authState.isAuthenticated) return

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        updateBadgeCount()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    // Also update badge on mount
    updateBadgeCount()

    return () => subscription.remove()
  }, [authState.isAuthenticated, updateBadgeCount])

  // ── Permission prompt (deferred to first Messages tab visit) ─────────────

  const promptForPermission = useCallback(async () => {
    if (!authState.user) return

    try {
      // Check if we've already prompted
      const alreadyPrompted = await AsyncStorage.getItem(PUSH_PERMISSION_PROMPTED_KEY)
      if (alreadyPrompted === 'true') {
        // Still register token in case permission was granted outside the app
        await pushTokenService.registerPushToken(authState.user.id)
        const status = await pushTokenService.getPermissionStatus()
        setPermissionStatus(status)
        return
      }

      // Prompt for permission (iOS shows native dialog)
      const token = await pushTokenService.registerPushToken(authState.user.id)

      // Mark as prompted (regardless of result -- iOS only shows once)
      await AsyncStorage.setItem(PUSH_PERMISSION_PROMPTED_KEY, 'true')

      // Update status
      const status = await pushTokenService.getPermissionStatus()
      setPermissionStatus(status)

      if (token) {
        console.log('[Notification] Permission granted and token registered')
      }
    } catch (error) {
      console.error('[Notification] Permission prompt failed:', error)
    }
  }, [authState.user])

  // ── Settings link (for when permission is denied) ────────────────────────

  const openNotificationSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openSettings()
    }
  }, [])

  // ── Toast display ────────────────────────────────────────────────────────

  const showToast = useCallback(
    (data: ToastData) => {
      // Clear any existing toast timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }

      setToast(data)

      // Animate in
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()

      // Auto-dismiss
      toastTimeoutRef.current = setTimeout(() => {
        dismissToast()
      }, TOAST_AUTO_DISMISS_MS)
    },
    [toastOpacity]
  )

  const dismissToast = useCallback(() => {
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setToast(null)
    })

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }
  }, [toastOpacity])

  const handleToastTap = useCallback(() => {
    if (!toast) return

    dismissToast()

    if (toast.conversationId) {
      router.push(`/messages/${toast.conversationId}` as any)
    } else {
      router.push('/(tabs)/messages' as any)
    }
  }, [toast, router, dismissToast])

  // ── Context value ────────────────────────────────────────────────────────

  const value: NotificationContextValue = {
    permissionStatus,
    updateBadgeCount,
    promptForPermission,
    openNotificationSettings,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* In-app toast for foreground notifications */}
      {toast && (
        <Animated.View
          style={[styles.toastContainer, { opacity: toastOpacity }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.toast}
            onPress={handleToastTap}
            activeOpacity={0.9}
          >
            <View style={styles.toastContent}>
              <Text style={styles.toastSender} numberOfLines={1}>
                {toast.senderName}
              </Text>
              <Text style={styles.toastPreview} numberOfLines={1}>
                {toast.preview}
              </Text>
            </View>
            <Text style={styles.toastAction}>View</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to access the NotificationContext.
 * Must be used within NotificationProvider.
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastContent: {
    flex: 1,
    marginRight: 12,
  },
  toastSender: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  toastPreview: {
    color: '#DBEAFE',
    fontSize: 13,
    marginTop: 2,
  },
  toastAction: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
})
