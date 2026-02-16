/**
 * NearMissQuickCapture - Photo-first quick capture component
 *
 * Design for speed (<45 seconds total workflow):
 * - Photo FIRST (immediate evidence capture)
 * - Details SECOND (after photo secured)
 * - GPS auto-captured in background on mount
 *
 * NEAR-01, NEAR-03, NEAR-07
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import LargeTapButton from '../ui/LargeTapButton';
import { takePhotoAndCompress, captureAndCompressPhotos } from '../../services/photo-processor';

export interface NearMissQuickCaptureProps {
  photoUris: string[];
  onPhotosChange: (uris: string[]) => void;
  maxPhotos?: number;
}

/**
 * Quick photo capture optimized for speed
 *
 * Shows two large buttons for photo capture, then expands to show preview
 * after first photo is taken. Designed to minimize time from hazard discovery
 * to evidence capture.
 */
export default function NearMissQuickCapture({
  photoUris,
  onPhotosChange,
  maxPhotos = 4,
}: NearMissQuickCaptureProps) {
  const hasPhotos = photoUris.length > 0;
  const remaining = maxPhotos - photoUris.length;
  const isLimitReached = remaining <= 0;

  const handleTakePhoto = async () => {
    const photoUri = await takePhotoAndCompress();
    if (photoUri) {
      onPhotosChange([...photoUris, photoUri]);
    }
  };

  const handleChoosePhoto = async () => {
    const newPhotoUris = await captureAndCompressPhotos(remaining);
    if (newPhotoUris.length > 0) {
      onPhotosChange([...photoUris, ...newPhotoUris]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Photo-first: Large capture buttons prominent at top */}
      <View style={styles.captureButtons}>
        <LargeTapButton
          label="📷 Take Photo"
          onPress={handleTakePhoto}
          variant="primary"
          disabled={isLimitReached}
        />
        <LargeTapButton
          label="📁 Choose Photo"
          onPress={handleChoosePhoto}
          variant="secondary"
          disabled={isLimitReached}
        />
      </View>

      {/* Photo preview appears after first photo (confirm evidence captured) */}
      {hasPhotos && (
        <View style={styles.previewSection}>
          <Text style={styles.photoCount}>
            Photos captured: {photoUris.length}/{maxPhotos}
          </Text>
          <View style={styles.photoPreviewGrid}>
            {photoUris.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      )}

      {/* Limit message */}
      {isLimitReached && (
        <Text style={styles.limitMessage}>
          Photo limit reached ({maxPhotos} max)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  captureButtons: {
    gap: 8,
  },
  previewSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  photoCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  photoPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  limitMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
