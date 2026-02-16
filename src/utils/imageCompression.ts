import * as ImageManipulator from 'expo-image-manipulator';

export interface ProgressiveImages {
  thumbnail: { uri: string; stage: 'thumbnail' };   // ~50KB, fast upload on any connection
  preview: { uri: string; stage: 'preview' };       // ~200KB, good enough for dashboard display
  full: { uri: string; stage: 'full' };             // ~2-5MB, original quality for records
}

/**
 * Generate 3 progressive quality tiers from a photo URI.
 *
 * Stage 1 (thumbnail): 150px width, 50% JPEG - uploads instantly on any connection
 * Stage 2 (preview): 800px width, 70% JPEG - dashboard-quality, uploads on cellular
 * Stage 3 (full): Original size, 90% JPEG - archive quality, WiFi-only upload
 *
 * Per Research Pattern 2: Progressive Photo Upload (Thumbnail-First)
 */
export async function generateProgressiveImages(uri: string): Promise<ProgressiveImages> {
  const [thumbnail, preview, full] = await Promise.all([
    // Stage 1: Thumbnail (~50KB)
    ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 150 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    ),
    // Stage 2: Preview (~200KB)
    ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    ),
    // Stage 3: Full quality (~2-5MB)
    ImageManipulator.manipulateAsync(
      uri,
      [], // No resize - preserve original resolution
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    ),
  ]);

  return {
    thumbnail: { uri: thumbnail.uri, stage: 'thumbnail' },
    preview: { uri: preview.uri, stage: 'preview' },
    full: { uri: full.uri, stage: 'full' },
  };
}
