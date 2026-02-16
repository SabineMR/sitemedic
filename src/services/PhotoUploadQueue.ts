import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { networkMonitor } from './NetworkMonitor';
import { syncQueue } from './SyncQueue';
import { generateProgressiveImages, ProgressiveImages } from '../utils/imageCompression';

export type PhotoStage = 'thumbnail' | 'preview' | 'full';

export interface PhotoUploadTask {
  localUri: string;
  recordId: string;        // Treatment/near-miss/safety-check WatermelonDB ID
  recordType: string;      // 'treatments' | 'near_misses' | 'safety_checks'
  stage: PhotoStage;
  photoIndex: number;      // Position in the photo_uris array (0-3)
}

export interface PhotoUploadProgress {
  total: number;
  completed: number;
  inProgress: number;
  failed: number;
}

export class PhotoUploadQueue {
  private isProcessing = false;
  private maxConcurrent = 2; // Per Research open question 5
  private activeUploads = 0;
  private progress: PhotoUploadProgress = { total: 0, completed: 0, inProgress: 0, failed: 0 };
  private progressListeners: Set<(progress: PhotoUploadProgress) => void> = new Set();

  /**
   * Queue a photo for progressive upload.
   * Immediately generates thumbnail/preview/full versions and queues each stage.
   * Thumbnails and previews queue at normal priority, full at priority 1 with WiFi requirement.
   */
  async enqueuePhoto(
    localUri: string,
    recordId: string,
    recordType: string,
    photoIndex: number
  ): Promise<void> {
    try {
      // Generate progressive images
      const images = await generateProgressiveImages(localUri);

      // Queue thumbnail (uploads on any connection, priority 1 = normal)
      await syncQueue.enqueue(
        'create',
        'photo_uploads',
        `${recordId}-photo-${photoIndex}-thumbnail`,
        {
          localUri: images.thumbnail.uri,
          recordId,
          recordType,
          stage: 'thumbnail',
          photoIndex,
          storagePath: `${recordType}/${recordId}/photo-${photoIndex}-thumbnail.jpg`,
        },
        1 // Normal priority
      );

      // Queue preview (uploads on any connection, priority 1 = normal)
      await syncQueue.enqueue(
        'create',
        'photo_uploads',
        `${recordId}-photo-${photoIndex}-preview`,
        {
          localUri: images.preview.uri,
          recordId,
          recordType,
          stage: 'preview',
          photoIndex,
          storagePath: `${recordType}/${recordId}/photo-${photoIndex}-preview.jpg`,
        },
        1 // Normal priority
      );

      // Queue full quality (WiFi-only by default, priority 1 = normal)
      await syncQueue.enqueue(
        'create',
        'photo_uploads',
        `${recordId}-photo-${photoIndex}-full`,
        {
          localUri: images.full.uri,
          recordId,
          recordType,
          stage: 'full',
          photoIndex,
          storagePath: `${recordType}/${recordId}/photo-${photoIndex}-full.jpg`,
          requiresWiFi: true,
        },
        1 // Normal priority (WiFi constraint handled at upload time)
      );

      console.log(`[PhotoUploadQueue] Queued 3 stages for ${recordType}/${recordId}/photo-${photoIndex}`);
    } catch (error) {
      console.error('[PhotoUploadQueue] Failed to enqueue photo:', error);
    }
  }

  /**
   * Process pending photo uploads from the sync queue.
   * Called by the sync scheduler or background task.
   * Respects WiFi-only constraint for full-quality uploads.
   * Limits concurrent uploads to maxConcurrent (2).
   */
  async processPendingPhotos(): Promise<{ uploaded: number; skipped: number; failed: number }> {
    if (this.isProcessing) {
      return { uploaded: 0, skipped: 0, failed: 0 };
    }

    this.isProcessing = true;
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const { isOnline, isWifi } = networkMonitor.getConnectionInfo();
      if (!isOnline) {
        return { uploaded: 0, skipped: 0, failed: 0 };
      }

      // Get photo upload items from sync queue
      const pendingItems = await syncQueue.getPendingItems();
      const photoItems = pendingItems.filter(item => item.tableName === 'photo_uploads');

      for (const item of photoItems) {
        if (this.activeUploads >= this.maxConcurrent) break;

        const payload = JSON.parse(item.payload);

        // WiFi-only constraint for full-quality uploads
        if (payload.requiresWiFi && !isWifi) {
          skipped++;
          continue;
        }

        try {
          this.activeUploads++;
          await this.uploadToSupabase(payload.localUri, payload.storagePath);
          uploaded++;

          // Remove from queue on success (item is a SyncQueueItem)
          const { getDatabase } = require('../lib/watermelon');
          const database = getDatabase();
          await database.write(async () => {
            await item.destroyPermanently();
          });
        } catch (error) {
          console.error(`[PhotoUploadQueue] Upload failed for ${payload.storagePath}:`, error);
          failed++;
        } finally {
          this.activeUploads--;
        }
      }

      this.updateProgress({ uploaded, skipped, failed });
    } finally {
      this.isProcessing = false;
    }

    return { uploaded, skipped, failed };
  }

  /**
   * Upload a single file to Supabase Storage.
   * Uses expo-file-system to read file and supabase-js to upload.
   */
  private async uploadToSupabase(localUri: string, storagePath: string): Promise<string> {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });

    // Convert base64 to ArrayBuffer for upload
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('treatment-photos')
      .upload(storagePath, bytes.buffer, {
        contentType: 'image/jpeg',
        upsert: true, // Allow re-upload on retry
      });

    if (error) throw error;

    console.log(`[PhotoUploadQueue] Uploaded ${storagePath}`);
    return data.path;
  }

  /**
   * Get aggregate upload progress for UI display.
   */
  getProgress(): PhotoUploadProgress {
    return { ...this.progress };
  }

  /**
   * Add listener for progress updates.
   */
  addProgressListener(callback: (progress: PhotoUploadProgress) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  private updateProgress(result: { uploaded: number; skipped: number; failed: number }): void {
    this.progress = {
      total: this.progress.total,
      completed: this.progress.completed + result.uploaded,
      inProgress: 0,
      failed: this.progress.failed + result.failed,
    };
    this.progressListeners.forEach(cb => cb(this.progress));
  }
}

export const photoUploadQueue = new PhotoUploadQueue();
