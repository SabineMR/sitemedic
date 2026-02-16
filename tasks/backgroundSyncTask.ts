import * as TaskManager from 'expo-task-manager';
import { syncQueue } from '../../src/services/SyncQueue';
import { photoUploadQueue } from '../../src/services/PhotoUploadQueue';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Task started');

    // 1. Sync structured data (treatments, workers, etc.)
    const dataResult = await syncQueue.processPendingItems();
    console.log(`[BackgroundSync] Data: ${dataResult.processed} synced, ${dataResult.failed} failed`);

    // 2. Process photo uploads (respects WiFi-only constraint internally)
    const photoResult = await photoUploadQueue.processPendingPhotos();
    console.log(`[BackgroundSync] Photos: ${photoResult.uploaded} uploaded, ${photoResult.skipped} skipped (WiFi), ${photoResult.failed} failed`);

    // Task result communicated via expo-background-task registration
  } catch (error) {
    console.error('[BackgroundSync] Task failed:', error);
    throw error; // Re-throw to mark task as failed
  }
});

export { BACKGROUND_SYNC_TASK };
