import * as BackgroundTask from 'expo-background-task';
import { BACKGROUND_SYNC_TASK } from '../../mobile/tasks/backgroundSyncTask';

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
