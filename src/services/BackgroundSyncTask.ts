import * as BackgroundTask from 'expo-background-task';
import { BACKGROUND_SYNC_TASK } from '../../tasks/backgroundSyncTask';

// Constraint Strategy (expo-background-task limitation):
// expo-background-task does NOT expose WorkManager-style constraint APIs.
// Battery and network constraints are enforced at RUNTIME in tasks/backgroundSyncTask.ts:
// - Battery: Skip sync if < 15% and not charging
// - Network: Skip photo uploads if cellular-only (data sync proceeds on any connection)
// - Idle: Not enforced (OS handles via BGTaskScheduler/WorkManager scheduling)

export async function registerBackgroundSync(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (iOS/Android minimum)
    });
    console.log('[BackgroundSyncTask] Registered successfully');
  } catch (error) {
    console.error('[BackgroundSyncTask] Registration failed:', error);
    // Non-fatal: background sync is a nice-to-have, foreground sync is primary
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('[BackgroundSyncTask] Unregistered');
  } catch (error) {
    console.warn('[BackgroundSyncTask] Unregister failed (may not have been registered):', error);
  }
}
