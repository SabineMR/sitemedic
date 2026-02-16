# Phase 3: Sync Engine - Research

**Researched:** 2026-02-15
**Domain:** Background synchronization infrastructure for offline-first React Native apps
**Confidence:** HIGH

## Summary

Phase 3 implements background synchronization for the existing WatermelonDB-based offline-first architecture established in Phase 1. The research reveals that Expo SDK 54's `expo-background-task` module provides the foundation for battery-friendly background sync using iOS's BGTaskScheduler and Android's WorkManager. Photo uploads require a multi-stage approach: progressive upload (thumbnail-first via `expo-image-manipulator` compression), background upload via `react-native-background-upload`, and WiFi-only constraints enforced by `@react-native-community/netinfo`. The sync queue from Phase 1 already handles priority-based operations and exponential backoff, but Phase 3 adds photo upload orchestration, background task scheduling, and enhanced UX feedback patterns.

**Critical finding:** Expo Background Task has a **15-minute minimum interval** on both platforms, which conflicts with the user decision for "batch and sync every 30 seconds." This means foreground sync must handle the 30-second batching, while background sync (when app is backgrounded/closed) happens at 15+ minute intervals.

**Primary recommendation:** Use a hybrid sync architecture: foreground polling (30-second interval) for active use, and Expo Background Task (15-minute minimum) for background-only sync. Photo uploads should be queued separately with progressive encoding (thumbnail → compressed → full) and WiFi-only constraints.

## Standard Stack

The established libraries/tools for React Native background sync with Expo:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-background-task` | SDK 54+ | Background task scheduling | Official Expo module replacing deprecated `expo-background-fetch`, uses native iOS BGTaskScheduler and Android WorkManager |
| `expo-task-manager` | SDK 54+ | Task definition and lifecycle | Required for all Expo background operations, provides task registration and execution context |
| `@react-native-community/netinfo` | Latest | Network connectivity detection | Already in use (Phase 1), provides WiFi vs cellular detection and reachability testing |
| `react-native-background-upload` | Latest | Background photo uploads | Proven cross-platform library for iOS/Android background file uploads that continue when app is backgrounded |
| `expo-image-manipulator` | SDK 54+ | Image compression & thumbnails | Official Expo module for client-side image processing (resize, compress, crop) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-compressor` | Latest | Advanced image/video compression | If `expo-image-manipulator` compression is insufficient (optional, not required for MVP) |
| `expo-file-system` | SDK 54+ | File reading for uploads | Already in use for reading image picker results before upload |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-background-task` | `react-native-background-worker` (Android only) | Expo module is cross-platform and integrates with managed workflow; bare React Native alternative requires ejection |
| `react-native-background-upload` | Custom Supabase Storage upload in background task | Background upload libraries handle iOS/Android upload sessions natively, custom solution would be unreliable |
| `expo-image-manipulator` | `react-native-image-crop-picker` compression | Image crop picker is for selecting photos, not batch compression; use both together |

**Installation:**
```bash
pnpm install expo-background-task expo-task-manager @react-native-community/netinfo react-native-background-upload expo-image-manipulator expo-file-system
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── SyncQueue.ts              # Existing (Phase 1)
│   ├── NetworkMonitor.ts         # Existing (Phase 1)
│   ├── PhotoUploadQueue.ts       # NEW: Photo-specific upload queue
│   └── BackgroundSyncTask.ts     # NEW: Background task registration
├── contexts/
│   └── SyncContext.tsx            # Existing (Phase 1) - enhance with photo upload state
├── utils/
│   ├── imageCompression.ts        # NEW: Progressive image encoding
│   └── syncScheduler.ts           # NEW: Foreground vs background sync coordination
└── tasks/
    └── backgroundSyncTask.ts      # NEW: TaskManager task definition (global scope)
```

### Pattern 1: Hybrid Foreground/Background Sync Architecture
**What:** Separate sync strategies for foreground (app active) vs background (app backgrounded/closed)
**When to use:** Always - required due to 15-minute minimum for background tasks
**Example:**
```typescript
// src/utils/syncScheduler.ts
// Source: Expo Background Task docs + research synthesis

import { AppState } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import { syncQueue } from '../services/SyncQueue';

class SyncScheduler {
  private foregroundInterval: NodeJS.Timeout | null = null;

  start() {
    // Foreground sync: 30-second polling
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        this.startForegroundSync();
      } else {
        this.stopForegroundSync();
      }
    });

    // Background sync: 15+ minute interval via Expo Background Task
    this.registerBackgroundTask();
  }

  private startForegroundSync() {
    this.foregroundInterval = setInterval(async () => {
      await syncQueue.processPendingItems();
    }, 30 * 1000); // 30 seconds
  }

  private stopForegroundSync() {
    if (this.foregroundInterval) {
      clearInterval(this.foregroundInterval);
      this.foregroundInterval = null;
    }
  }

  private async registerBackgroundTask() {
    await BackgroundTask.registerTaskAsync('BACKGROUND_SYNC', {
      minimumInterval: 15 * 60, // 15 minutes (minimum allowed)
    });
  }
}
```

### Pattern 2: Progressive Photo Upload (Thumbnail-First)
**What:** Upload compressed thumbnail first (fast), then full-quality photo later (when WiFi available)
**When to use:** All photo uploads to avoid blocking workflow
**Example:**
```typescript
// src/utils/imageCompression.ts
// Source: Expo ImageManipulator docs + progressive upload research

import * as ImageManipulator from 'expo-image-manipulator';

export async function generateProgressiveImages(uri: string) {
  // Stage 1: Thumbnail (fast upload, ~50KB)
  const thumbnail = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 150 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Stage 2: Compressed preview (medium quality, ~200KB)
  const preview = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Stage 3: Full quality (high quality, ~2-5MB)
  const full = await ImageManipulator.manipulateAsync(
    uri,
    [], // No resize
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );

  return { thumbnail, preview, full };
}
```

### Pattern 3: WiFi-Only Photo Upload Constraint
**What:** Prevent large photo uploads over cellular unless user explicitly overrides
**When to use:** All full-quality photo uploads (thumbnails can use cellular)
**Example:**
```typescript
// src/services/PhotoUploadQueue.ts
// Source: NetInfo docs + background upload research

import NetInfo from '@react-native-community/netinfo';
import { syncQueue } from './SyncQueue';

export class PhotoUploadQueue {
  async enqueuePhotoUpload(
    photoUri: string,
    treatmentId: string,
    stage: 'thumbnail' | 'preview' | 'full',
    userOverrideCellular: boolean = false
  ) {
    const netInfo = await NetInfo.fetch();

    // WiFi-only constraint for full-quality uploads
    if (stage === 'full' && netInfo.type !== 'wifi' && !userOverrideCellular) {
      // Queue for later, don't upload now
      await syncQueue.enqueue(
        'upload_photo',
        'photos',
        `${treatmentId}-${stage}`,
        { photoUri, treatmentId, stage },
        1, // Normal priority
        { requiresWiFi: true } // NEW: WiFi constraint metadata
      );
      return 'queued_wifi';
    }

    // Thumbnails and previews can use cellular
    await this.uploadPhoto(photoUri, treatmentId, stage);
    return 'uploaded';
  }
}
```

### Pattern 4: Background Upload with React Native Background Upload
**What:** Use native upload sessions to continue uploads when app is backgrounded
**When to use:** All photo uploads that may take >10 seconds
**Example:**
```typescript
// src/services/PhotoUploadQueue.ts
// Source: react-native-background-upload docs + Supabase Storage research

import Upload from 'react-native-background-upload';
import { supabase } from '../lib/supabase';

async function uploadPhotoInBackground(
  localUri: string,
  storagePath: string,
  onProgress?: (progress: number) => void
) {
  // Get Supabase Storage signed upload URL
  const { data: uploadData } = await supabase.storage
    .from('treatment-photos')
    .createSignedUploadUrl(storagePath);

  if (!uploadData) throw new Error('Failed to get upload URL');

  // Use native background upload
  const uploadId = await Upload.startUpload({
    url: uploadData.signedUrl,
    path: localUri,
    method: 'PUT',
    type: 'raw',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    notification: {
      enabled: true,
      onProgressTitle: 'Uploading photo...',
      onCompleteTitle: 'Upload complete',
    },
  });

  // Subscribe to progress
  Upload.addListener('progress', uploadId, (data) => {
    const progress = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
    onProgress?.(progress);
  });

  return uploadId;
}
```

### Anti-Patterns to Avoid
- **Don't use setInterval for background sync** - iOS will suspend timers when app backgrounds; use Expo Background Task instead
- **Don't upload full-quality photos immediately** - Always compress/resize first to avoid blocking workflow
- **Don't retry failed uploads indefinitely** - Cap exponential backoff at 4 hours (already in Phase 1 decision)
- **Don't sync audit logs at high priority** - They use priority 2 (lower than clinical data) per Phase 1 decision
- **Don't assume WiFi detection works without reachability test** - NetInfo must be configured with Supabase URL ping (already done in Phase 1)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background task scheduling | Custom iOS/Android native modules | `expo-background-task` + `expo-task-manager` | Handles iOS BGTaskScheduler and Android WorkManager constraints (15-min minimum, battery checks, system throttling) automatically |
| Photo upload during background | Custom file upload with exponential retry | `react-native-background-upload` | Uses native iOS URLSession and Android DownloadManager for upload sessions that survive app backgrounding |
| Image compression | Manual canvas resizing or FFmpeg | `expo-image-manipulator` | Optimized native implementation, much faster than JS-based solutions |
| Network type detection | Manual iOS/Android network APIs | `@react-native-community/netinfo` | Handles WiFi vs cellular detection, reachability testing, and connection quality estimation |
| Conflict resolution | Custom timestamp comparison logic | Last-Write-Wins with `updated_at` field | Standard pattern for low-risk fields; complexity of CRDTs not justified for medical app use case |
| Duplicate upload prevention | Custom deduplication logic | Client-generated UUIDs (already in Phase 1) | Idempotent operations via UUID prevent duplicate records on retry |

**Key insight:** Background operations on mobile are constrained by OS-level battery optimization and task scheduling policies. Custom solutions fail because they can't access native APIs for background upload sessions, wake locks, or WorkManager scheduling. Always use platform-specific libraries that wrap native functionality.

## Common Pitfalls

### Pitfall 1: Background Task Interval Mismatch
**What goes wrong:** User decision specifies "batch and sync every 30 seconds," but iOS and Android background tasks have a **15-minute minimum interval**
**Why it happens:** Expo Background Task uses BGTaskScheduler (iOS) and WorkManager (Android), both enforce 15-minute minimums to preserve battery life
**How to avoid:** Use hybrid approach - 30-second polling in foreground (when app is active), 15-minute background task when app is backgrounded/closed
**Warning signs:** Sync appears to stop working when app is backgrounded

### Pitfall 2: Background Tasks Don't Run on iOS Simulator
**What goes wrong:** Background tasks never execute during development testing on iOS Simulator
**Why it happens:** BGTaskScheduler API is not available in iOS Simulator, only on physical devices
**How to avoid:** Test background sync on physical iPhones, not simulators; use foreground sync testing in simulator
**Warning signs:** Background task registers successfully but never fires events

### Pitfall 3: Large Photo Uploads Block Sync Queue
**What goes wrong:** 5MB photo uploads take 30+ seconds over LTE, blocking RIDDOR-reportable incident sync
**Why it happens:** Single-threaded sync queue processes items sequentially
**How to avoid:** Separate photo upload queue from data sync queue; use `react-native-background-upload` for concurrent uploads
**Warning signs:** Sync badge shows "pending" for minutes even though treatment data is small

### Pitfall 4: WiFi-Only Constraint Prevents All Sync
**What goes wrong:** Medics toggle WiFi on at construction site, but site WiFi has no internet access, so nothing syncs
**Why it happens:** NetInfo detects WiFi connection but doesn't test actual internet reachability
**How to avoid:** Already mitigated in Phase 1 - NetInfo is configured with Supabase URL reachability test
**Warning signs:** "WiFi" indicator shows connected but sync stays in "pending" state

### Pitfall 5: Sync Queue Persists Across App Updates
**What goes wrong:** Old sync queue items reference outdated Supabase table schema, causing 400 errors on sync
**Why it happens:** WatermelonDB migrations don't automatically clear sync queue on schema changes
**How to avoid:** Add migration step to clear sync queue when Supabase schema changes; validate payloads before sync
**Warning signs:** Sync errors appear immediately after app update, but new records sync fine

### Pitfall 6: Background Upload Notifications Spam User
**What goes wrong:** iOS shows persistent "Uploading photo..." notifications for every photo in queue
**Why it happens:** `react-native-background-upload` enables notifications by default for iOS background session requirements
**How to avoid:** Use a single aggregate notification "Uploading 3 photos..." instead of per-photo notifications
**Warning signs:** User complaints about notification spam during multi-photo treatment logs

### Pitfall 7: Exponential Backoff Delays RIDDOR Sync Too Long
**What goes wrong:** RIDDOR incident fails first sync attempt (e.g., network blip), then waits 5 minutes before retry
**Why it happens:** Standard exponential backoff applies to all priorities equally
**How to avoid:** RIDDOR priority (0) items should have shorter initial retry (30 seconds) before falling back to exponential backoff
**Warning signs:** "Critical alert" shows for 5+ minutes before retry, even though network is restored

### Pitfall 8: Last-Write-Wins Loses Data in Concurrent Edits
**What goes wrong:** Medic A edits treatment notes offline, Medic B edits same treatment offline, one edit is lost when both sync
**Why it happens:** Last-write-wins conflict resolution discards earlier timestamp
**How to avoid:** Phase 3 scope accepts this limitation (per success criteria "last-write-wins tested with airplane mode toggles"); Phase 4+ could add field-level merging for notes fields
**Warning signs:** User reports "my edits disappeared" after syncing

## Code Examples

Verified patterns from official sources:

### Background Task Definition (Global Scope)
```typescript
// src/tasks/backgroundSyncTask.ts
// Source: https://docs.expo.dev/versions/latest/sdk/task-manager/

import * as TaskManager from 'expo-task-manager';
import { syncQueue } from '../services/SyncQueue';
import { photoUploadQueue } from '../services/PhotoUploadQueue';

// CRITICAL: Task definition must be at global scope, NOT inside React lifecycle
TaskManager.defineTask('BACKGROUND_SYNC', async () => {
  try {
    // Sync data queue (treatments, workers, near-misses, etc.)
    const dataResult = await syncQueue.processPendingItems();

    // Sync photo uploads (WiFi-only constraint enforced)
    const photoResult = await photoUploadQueue.processWiFiPhotos();

    console.log(`Background sync: ${dataResult.synced} data items, ${photoResult.synced} photos`);

    return dataResult.failed === 0 && photoResult.failed === 0
      ? TaskManager.TaskResult.NewData
      : TaskManager.TaskResult.Failed;
  } catch (error) {
    console.error('Background sync failed:', error);
    return TaskManager.TaskResult.Failed;
  }
});
```

### Background Task Registration with Constraints
```typescript
// src/services/BackgroundSyncTask.ts
// Source: https://docs.expo.dev/versions/latest/sdk/background-task/

import * as BackgroundTask from 'expo-background-task';

export async function registerBackgroundSync() {
  try {
    await BackgroundTask.registerTaskAsync('BACKGROUND_SYNC', {
      minimumInterval: 15 * 60, // 15 minutes (minimum allowed)
      stopOnTerminate: false,    // Continue scheduling after app is killed
      startOnBoot: true,         // Re-register after device reboot
    });

    console.log('Background sync task registered');
  } catch (error) {
    console.error('Failed to register background task:', error);
  }
}

// Note: Expo Background Task automatically enforces:
// - Battery has enough charge (or device is plugged in)
// - Network is available
// No additional constraints API for WiFi-only or battery percentage
```

### Supabase Storage Upload with Progress Tracking
```typescript
// src/services/PhotoUploadQueue.ts
// Source: https://supabase.com/blog/react-native-storage

import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';

async function uploadPhotoToSupabase(
  localUri: string,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Read file as base64 or blob
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to Blob for upload
  const blob = base64ToBlob(base64, 'image/jpeg');

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('treatment-photos')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: false, // Prevent overwriting existing photos
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('treatment-photos')
    .getPublicUrl(storagePath);

  return publicUrl;
}

// Note: Supabase JS client doesn't expose upload progress for React Native
// Use react-native-background-upload for progress tracking on large files
```

### Sync Status UX Patterns
```typescript
// src/components/SyncStatusIndicator.tsx
// Source: UX research synthesis + Material Design badge guidelines

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSync } from '../contexts/SyncContext';

export function SyncStatusIndicator() {
  const { state, triggerSync } = useSync();

  // Color mapping
  const colors = {
    synced: '#22C55E',   // Green
    syncing: '#3B82F6',  // Blue (with pulse animation)
    pending: '#F59E0B',  // Orange
    offline: '#EF4444',  // Red
    error: '#EF4444',    // Red
  };

  // Label mapping
  const labels = {
    synced: 'Synced',
    syncing: 'Syncing...',
    pending: `${state.pendingCount} pending`,
    offline: 'Offline',
    error: 'Sync error',
  };

  return (
    <Pressable
      onPress={state.status === 'pending' || state.status === 'error' ? triggerSync : undefined}
      style={styles.container}
    >
      <View style={[styles.dot, { backgroundColor: colors[state.status] }]} />
      <Text style={styles.label}>{labels[state.status]}</Text>

      {/* Pending count badge */}
      {state.pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{state.pendingCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48, // Gloves-on usability
    minWidth: 48,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-background-fetch` | `expo-background-task` | Expo SDK 53+ (2024) | New module uses modern BGTaskScheduler (iOS) and WorkManager (Android) APIs, more reliable scheduling |
| Manual image compression with Canvas | `expo-image-manipulator` | Expo SDK 40+ (2022) | Native implementation ~10x faster than JS canvas manipulation |
| Single sync queue for all data types | Separate data and photo queues | Current best practice (2026) | Photo uploads don't block critical data sync (RIDDOR incidents) |
| Immediate full-quality photo upload | Progressive upload (thumbnail → preview → full) | Mobile UX trend (2024-2026) | Perceived performance improvement, workflow not blocked by large uploads |
| Simple "Syncing..." spinner | Multi-modal status with pending count badge | Material Design 3 (2023+) | Users can see exact pending item count, not just binary syncing/synced state |

**Deprecated/outdated:**
- `expo-background-fetch`: Deprecated in Expo SDK 53, replaced by `expo-background-task`
- In-memory sync queues: Don't survive app force-quit (already avoided in Phase 1 via WatermelonDB persistence)
- Global WiFi-only toggle: Modern apps default to WiFi-only for large files but allow per-upload override

## Open Questions

Things that couldn't be fully resolved:

1. **Expo Background Task WiFi-only constraint**
   - What we know: Expo Background Task enforces "network is available" but doesn't expose WiFi-only constraint API
   - What's unclear: Can we skip photo uploads in background task if only cellular is available?
   - Recommendation: Check `NetInfo.fetch()` at start of background task, skip photo uploads if not on WiFi

2. **Supabase Storage upload progress in React Native**
   - What we know: Supabase JS client doesn't expose upload progress callbacks for React Native
   - What's unclear: Is there a workaround using Supabase Storage signed URLs + native fetch?
   - Recommendation: Use `react-native-background-upload` for large files (photos), which provides native progress tracking

3. **Background task reliability during Low Power Mode (iOS)**
   - What we know: iOS may disable background fetch/tasks when Low Power Mode is enabled
   - What's unclear: Does this apply to expo-background-task? How should UX communicate this?
   - Recommendation: Show "Low Power Mode may delay sync" message if detected; test on physical device

4. **RIDDOR failure alert intrusiveness level**
   - What we know: Success criteria requires "critical alert" but user decision leaves intrusion level to Claude's discretion
   - What's unclear: Full-screen modal vs persistent banner vs push notification?
   - Recommendation: Start with persistent banner (non-dismissible) + push notification; A/B test with medics for optimal visibility without workflow disruption

5. **Concurrent photo upload limit**
   - What we know: `react-native-background-upload` supports multiple concurrent uploads
   - What's unclear: What's the optimal limit to avoid overwhelming device/network? iOS background upload session limits?
   - Recommendation: Start with 2 concurrent uploads, monitor battery drain and network errors

## Sources

### Primary (HIGH confidence)
- [Expo Background Task Documentation](https://docs.expo.dev/versions/latest/sdk/background-task/) - Official API reference, constraints, and usage
- [Expo Task Manager Documentation](https://docs.expo.dev/versions/latest/sdk/task-manager/) - Task definition and lifecycle patterns
- [Expo Image Manipulator Documentation](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/) - Image compression and resizing capabilities
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) - Upload size limits and constraints (50MB free, 500GB pro)
- [React Native NetInfo GitHub](https://github.com/react-native-netinfo/react-native-netinfo) - WiFi vs cellular detection, reachability testing

### Secondary (MEDIUM confidence)
- [Supabase React Native Storage Blog](https://supabase.com/blog/react-native-storage) - React Native file upload patterns
- [Supabase Offline-First WatermelonDB Blog](https://supabase.com/blog/react-native-offline-first-watermelon-db) - WatermelonDB sync patterns, timestamp conversion, conflict resolution
- [Keep Background Apps Fresh with Expo Background Tasks](https://www.powersync.com/blog/keep-background-apps-fresh-with-expo-background-tasks-and-powersync) - Real-world background sync example with Expo
- [How to Implement Last-Write-Wins](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view) - Conflict resolution strategy explanation
- [Mobile UX/UI Design Patterns 2026](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/) - Sync status indicators, loading feedback patterns
- [Material Design 3 Badge Guidelines](https://m3.material.io/components/badges/guidelines) - Pending count badge UX patterns

### Tertiary (LOW confidence)
- [React Native Background Upload GitHub](https://github.com/Vydia/react-native-background-upload) - Community library for background uploads (verify with physical device testing)
- [React Native Compressor npm](https://www.npmjs.com/package/react-native-compressor) - Alternative image compression library (fallback if expo-image-manipulator insufficient)
- [Offline-First Architecture Medium Article](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79) - General offline-first patterns (not specific to React Native/Expo)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official Expo docs and Supabase docs
- Architecture: HIGH - Patterns verified via official documentation and community tutorials
- Pitfalls: MEDIUM - Mix of documented issues (iOS simulator limitation) and inferred from constraints (15-min minimum)

**Research date:** 2026-02-15
**Valid until:** ~30 days (Expo SDK 54 is stable, but mobile OS updates in iOS 18+ / Android 15+ could change background task behavior)

## Critical Decisions for Planner

Based on research findings, the planner should address:

1. **Hybrid sync architecture**: Implement both foreground (30-second polling) and background (15-minute task) sync
2. **Separate photo queue**: Don't block data sync queue with large photo uploads
3. **Progressive photo upload**: Thumbnail (compress: 0.5, resize: 150px) → Preview (compress: 0.7, resize: 800px) → Full (compress: 0.9, no resize)
4. **WiFi-only enforcement**: Check `NetInfo.fetch().type === 'wifi'` before full-quality uploads, allow user override
5. **RIDDOR priority retry**: Shorter initial retry (30s) for priority 0 items instead of standard 5-minute backoff
6. **Background upload progress**: Use `react-native-background-upload` for photos >500KB, show aggregate progress "Uploading 3 photos..."
7. **Physical device testing**: Background tasks don't work on iOS Simulator, must test on real iPhone

**Phase boundary reminder:** Real-time collaboration (operational transforms, field-level conflict resolution) and selective sync controls (choose which data to sync) belong in future phases. Phase 3 delivers automatic background sync with last-write-wins conflict resolution.
