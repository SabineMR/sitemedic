---
phase: 43-real-time-push-notifications
plan: 02
subsystem: mobile-notifications
tags: [expo-notifications, push-token, deep-linking, react-context, watermelondb, badge]

# Dependency graph
requires:
  - phase: 42-ios-messaging-offline
    provides: "WatermelonDB conversations/messages models, MessageSync service, tab layout with Messages tab"
  - phase: 40-comms-foundation
    provides: "profiles.push_token column, conversations table, message_recipients table"
provides:
  - "PushTokenService singleton for token registration/cleanup"
  - "NotificationContext provider for foreground/background notification handling"
  - "In-app toast for foreground notifications (not native banner)"
  - "Deep link navigation on notification tap"
  - "App badge count management from WatermelonDB"
  - "Deferred permission prompt on first Messages tab visit"
affects:
  - "43-03 (Edge Function send-push-notification depends on registered tokens)"
  - "Any future screen that calls updateBadgeCount() after mark-as-read"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level setNotificationHandler for foreground suppression"
    - "AsyncStorage flag for one-time permission prompting"
    - "Outer/inner component split for context provider + consumer in same file"

key-files:
  created:
    - "src/services/PushTokenService.ts"
    - "src/contexts/NotificationContext.tsx"
  modified:
    - "app.json"
    - "app/(tabs)/_layout.tsx"

key-decisions:
  - "Permission prompt deferred to first Messages tab focus (not app launch) via AsyncStorage flag + Tabs listener"
  - "Module-level setNotificationHandler with shouldShowAlert:false prevents native banner; custom toast used instead"
  - "Token staleness threshold set to 7 days -- avoids unnecessary DB writes on every app launch"
  - "NotificationProvider wraps tabs layout (not root layout) so it has access to AuthContext/OrgContext"
  - "TabsLayout split into outer wrapper (NotificationProvider) and inner component (TabsLayoutInner) for hook access"

patterns-established:
  - "Lazy require pattern for expo-notifications (graceful degradation in Expo Go)"
  - "In-app toast: absolute-positioned Animated.View, blue #3B82F6, auto-dismiss 4s"
  - "Foreground suppression: compare notification conversationId against current route"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 43 Plan 02: iOS Push Notification Infrastructure Summary

**PushTokenService for Expo push token lifecycle with conditional DB update, NotificationContext for foreground toast / background deep-link / badge management, permission deferred to first Messages tab visit**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T04:24:28Z
- **Completed:** 2026-02-20T04:28:49Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- PushTokenService handles full token lifecycle: permission request, Expo token retrieval, conditional Supabase update (only if changed or >7 days stale), token change listener, logout cleanup
- NotificationContext manages foreground in-app toast (not native banner), background tap deep-links to conversation, app badge count from WatermelonDB
- Permission prompt fires only on first Messages tab visit (not app launch) via AsyncStorage flag and Expo Router tab focus listener
- app.json updated with extra.eas.projectId for Expo push token resolution

## Task Commits

Each task was committed atomically:

1. **Task 1: PushTokenService and permission flow** - `7f52140` (feat)
2. **Task 2: NotificationContext with handlers and deep linking** - `65aa20a` (feat)

## Files Created/Modified
- `src/services/PushTokenService.ts` - Singleton service for push token registration, cleanup, permission check, token change listener
- `src/contexts/NotificationContext.tsx` - React Context provider for notification lifecycle: foreground toast, background tap navigation, badge count, permission prompt
- `app.json` - Added extra.eas.projectId for Expo push token
- `app/(tabs)/_layout.tsx` - Wrapped with NotificationProvider, added Messages tab focus listener for deferred permission prompt

## Decisions Made
- Permission prompt deferred to first Messages tab focus (not app launch) via AsyncStorage flag + Tabs listener -- avoids interrupting users who never use messaging
- Module-level setNotificationHandler with shouldShowAlert:false prevents native banner; custom in-app toast used instead -- keeps UI control within the app
- Token staleness threshold set to 7 days -- avoids unnecessary DB writes on every app launch while ensuring token freshness
- NotificationProvider wraps tabs layout (not root layout) so it has access to AuthContext and OrgContext from the provider tree above
- TabsLayout split into outer wrapper (NotificationProvider) and inner component (TabsLayoutInner) for hook access pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** The following must be set up before push notifications work:

1. **EXPO_PUBLIC_PROJECT_ID** environment variable: Get from Expo dashboard (expo.dev) -> Project Settings -> Project ID (UUID format)
2. **EAS project**: Run `npx eas init` or visit expo.dev -> Projects -> SiteMedic to create/link the EAS project for push credentials
3. **profiles.push_token column**: Must exist in Supabase (created in Phase 40 migration)

## Next Phase Readiness
- Token registration infrastructure is complete -- Plan 43-03 (Edge Function) can now send to registered tokens
- NotificationContext is ready to receive and display push notifications from the server
- Badge count management is wired up and will reflect actual unread counts
- No blockers for Phase 43 Plan 03

---
*Phase: 43-real-time-push-notifications*
*Completed: 2026-02-20*
