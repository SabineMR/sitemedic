import { AppState, AppStateStatus } from 'react-native';
import { syncQueue } from '../services/SyncQueue';
import { registerBackgroundSync } from '../services/BackgroundSyncTask';
import { networkMonitor } from '../services/NetworkMonitor';

export class SyncScheduler {
  private foregroundInterval: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: any = null;
  private isStarted = false;

  async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    // Register background task (non-blocking, logs error if fails)
    await registerBackgroundSync();

    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Start foreground sync if app is currently active
    if (AppState.currentState === 'active') {
      this.startForegroundSync();
    }

    console.log('[SyncScheduler] Started');
  }

  stop(): void {
    this.stopForegroundSync();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isStarted = false;
    console.log('[SyncScheduler] Stopped');
  }

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === 'active') {
      console.log('[SyncScheduler] App active - starting foreground sync');
      this.startForegroundSync();
      // Immediately process any items that accumulated while backgrounded
      this.syncNow();
    } else {
      console.log('[SyncScheduler] App backgrounded - stopping foreground sync');
      this.stopForegroundSync();
    }
  };

  private startForegroundSync(): void {
    if (this.foregroundInterval) return; // Already running

    // Poll every 30 seconds per user decision (CONTEXT.md batching strategy)
    this.foregroundInterval = setInterval(() => {
      this.syncNow();
    }, 30 * 1000);
  }

  private stopForegroundSync(): void {
    if (this.foregroundInterval) {
      clearInterval(this.foregroundInterval);
      this.foregroundInterval = null;
    }
  }

  /** Trigger immediate sync if online. Called by scheduler and can be called manually. */
  async syncNow(): Promise<{ processed: number; failed: number }> {
    const { isOnline } = networkMonitor.getConnectionInfo();
    if (!isOnline) {
      return { processed: 0, failed: 0 };
    }
    return syncQueue.processPendingItems();
  }
}

export const syncScheduler = new SyncScheduler();
