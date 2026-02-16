/**
 * PhotoCapture - Multi-photo picker with compression
 *
 * Features:
 * - Full-width photo cards (not small thumbnails - Research anti-pattern)
 * - Camera + gallery capture with on-device compression
 * - Limit enforcement (default 4 photos per TREAT-06)
 * - Large tap targets (56pt) for gloves-on usability
 */

import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import LargeTapButton from '../ui/LargeTapButton';
import { captureAndCompressPhotos, takePhotoAndCompress } from '../../services/photo-processor';

export interface PhotoCaptureProps {
  photoUris: string[];
  onPhotosChange: (uris: string[]) => void;
  maxPhotos?: number;
}

/**
 * PhotoCapture component for multi-photo selection and management
 *
 * Displays existing photos as full-width cards with large remove buttons.
 * Provides camera and gallery capture buttons with remaining photo count.
 */
export default function PhotoCapture({
  photoUris,
  onPhotosChange,
  maxPhotos = 4,
}: PhotoCaptureProps) {
  const remaining = maxPhotos - photoUris.length;
  const isLimitReached = remaining <= 0;

  const handleTakePhoto = async () => {
    const photoUri = await takePhotoAndCompress();
    if (photoUri) {
      onPhotosChange([...photoUris, photoUri]);
    }
  };

  const handleChooseFromLibrary = async () => {
    const newPhotoUris = await captureAndCompressPhotos(remaining);
    if (newPhotoUris.length > 0) {
      onPhotosChange([...photoUris, ...newPhotoUris]);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updatedUris = photoUris.filter((_, index) => index !== indexToRemove);
    onPhotosChange(updatedUris);
  };

  return (
    <View style={styles.container}>
      {/* Photo count label */}
      <Text style={styles.countLabel}>
        Photos: {photoUris.length}/{maxPhotos}
      </Text>

      {/* Existing photos as full-width cards */}
      {photoUris.length > 0 && (
        <ScrollView style={styles.photoList} showsVerticalScrollIndicator={false}>
          {photoUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoCard}>
              <Image
                source={{ uri }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeButtonText}>✕ Remove</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <LargeTapButton
          label="📷 Take Photo"
          onPress={handleTakePhoto}
          variant="primary"
          disabled={isLimitReached}
        />
        <LargeTapButton
          label="📁 Choose from Library"
          onPress={handleChooseFromLibrary}
          variant="secondary"
          disabled={isLimitReached}
        />
      </View>

      {/* Limit reached message */}
      {isLimitReached && (
        <Text style={styles.limitMessage}>
          Photo limit reached. Remove a photo to add more.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  countLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  photoList: {
    marginBottom: 16,
    maxHeight: 400, // Limit scroll height
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200, // Full-width card with consistent height
  },
  removeButton: {
    backgroundColor: '#EF4444', // Red
    minHeight: 56, // Large tap target (56pt for gloves)
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    gap: 8, // Spacing between buttons
  },
  limitMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
