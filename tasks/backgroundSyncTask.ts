import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue } from '../src/services/SyncQueue';
import { photoUploadQueue } from '../src/services/PhotoUploadQueue';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Task started');

    // RUNTIME CONSTRAINT CHECKS (expo-background-task doesn't expose WorkManager-style constraint APIs)

    // 1. Battery constraint: Skip sync if battery is critically low and not charging
    const batteryLevel = await Battery.getBatteryLevelAsync();
    const batteryState = await Battery.getBatteryStateAsync();

    if (batteryLevel < 0.15 && batteryState !== Battery.BatteryState.CHARGING) {
      console.warn(`[BackgroundSync] Skipping sync - battery critically low (${Math.round(batteryLevel * 100)}%) and not charging`);
      return;
    }

    console.log(`[BackgroundSync] Battery check passed: ${Math.round(batteryLevel * 100)}%, state=${batteryState}`);

    // 2. Network constraint: Check connectivity and network type
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      console.warn('[BackgroundSync] Skipping sync - no network connectivity');
      return;
    }

    const networkType = netState.type;
    console.log(`[BackgroundSync] Network check passed: type=${networkType}, connected=${netState.isConnected}`);

    // 3. Sync structured data (treatments, workers, etc.)
    // Data sync proceeds on any connection type (payloads are small < 1KB)
    const dataResult = await syncQueue.processPendingItems();
    console.log(`[BackgroundSync] Data: ${dataResult.processed} synced, ${dataResult.failed} failed`);

    // 4. Process photo uploads (only on WiFi to avoid cellular data usage)
    if (networkType === 'wifi') {
      const photoResult = await photoUploadQueue.processPendingPhotos();
      console.log(`[BackgroundSync] Photos: ${photoResult.uploaded} uploaded, ${photoResult.skipped} skipped (WiFi), ${photoResult.failed} failed`);
    } else {
      console.log(`[BackgroundSync] Photos: skipped due to cellular-only connectivity (network type: ${networkType})`);
    }

    // Task result communicated via expo-background-task registration
  } catch (error) {
    console.error('[BackgroundSync] Task failed:', error);
    throw error; // Re-throw to mark task as failed
  }
});

export { BACKGROUND_SYNC_TASK };
