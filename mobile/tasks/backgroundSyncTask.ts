import * as TaskManager from 'expo-task-manager';
import { syncQueue } from '../../src/services/SyncQueue';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Task started');
    const result = await syncQueue.processPendingItems();
    console.log(`[BackgroundSync] Completed: ${result.processed} synced, ${result.failed} failed`);

    // Photo uploads handled separately in Plan 03-02
    // Will be added here after PhotoUploadQueue is created

    // Return void - task result is communicated via expo-background-task registration
  } catch (error) {
    console.error('[BackgroundSync] Task failed:', error);
    throw error; // Re-throw to mark task as failed
  }
});

export { BACKGROUND_SYNC_TASK };
