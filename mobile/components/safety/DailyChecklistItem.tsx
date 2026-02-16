/**
 * Daily Checklist Item Component
 *
 * Green/Amber/Red status pattern for daily safety checks.
 * Follows Pattern 7 from Phase 2 Research.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, StyleSheet } from 'react-native';
import { takePhotoAndCompress } from '../../services/photo-processor';

interface DailyChecklistItemProps {
  label: string;
  itemId: string;
  status: 'green' | 'amber' | 'red' | null;
  photoUri: string | null;
  note: string;
  onStatusChange: (itemId: string, status: 'green' | 'amber' | 'red') => void;
  onPhotoChange: (itemId: string, uri: string | null) => void;
  onNoteChange: (itemId: string, note: string) => void;
}

export function DailyChecklistItem({
  label,
  itemId,
  status,
  photoUri,
  note,
  onStatusChange,
  onPhotoChange,
  onNoteChange,
}: DailyChecklistItemProps) {
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  const handleStatusPress = (newStatus: 'green' | 'amber' | 'red') => {
    onStatusChange(itemId, newStatus);
  };

  const handleAddPhoto = async () => {
    setIsCapturingPhoto(true);
    try {
      const uri = await takePhotoAndCompress();
      if (uri) {
        onPhotoChange(itemId, uri);
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(itemId, null);
  };

  const notePlaceholder = status === 'amber' || status === 'red'
    ? 'Describe the issue...'
    : 'Add note (optional)';

  // Left border for amber/red items for visual emphasis
  const containerStyle = [
    styles.container,
    status === 'amber' && styles.containerAmber,
    status === 'red' && styles.containerRed,
  ];

  return (
    <View style={containerStyle}>
      {/* Item Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Status Buttons Row */}
      <View style={styles.statusButtonRow}>
        {/* Green Button */}
        <Pressable
          style={[
            styles.statusButton,
            styles.statusButtonGreen,
            status === 'green' && styles.statusButtonSelected,
          ]}
          onPress={() => handleStatusPress('green')}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {({ pressed }) => (
            <View style={[styles.statusButtonContent, pressed && { opacity: 0.7 }]}>
              <Text style={styles.statusButtonIcon}>✓</Text>
              <Text style={styles.statusButtonText}>OK</Text>
            </View>
          )}
        </Pressable>

        {/* Amber Button */}
        <Pressable
          style={[
            styles.statusButton,
            styles.statusButtonAmber,
            status === 'amber' && styles.statusButtonSelected,
          ]}
          onPress={() => handleStatusPress('amber')}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {({ pressed }) => (
            <View style={[styles.statusButtonContent, pressed && { opacity: 0.7 }]}>
              <Text style={styles.statusButtonIcon}>⚠</Text>
              <Text style={styles.statusButtonText}>Issue</Text>
            </View>
          )}
        </Pressable>

        {/* Red Button */}
        <Pressable
          style={[
            styles.statusButton,
            styles.statusButtonRed,
            status === 'red' && styles.statusButtonSelected,
          ]}
          onPress={() => handleStatusPress('red')}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {({ pressed }) => (
            <View style={[styles.statusButtonContent, pressed && { opacity: 0.7 }]}>
              <Text style={styles.statusButtonIcon}>✕</Text>
              <Text style={styles.statusButtonText}>Fail</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Optional Photo and Note (only shown after status selected) */}
      {status && (
        <View style={styles.detailsSection}>
          {/* Add Photo Button */}
          <Pressable
            style={styles.addPhotoButton}
            onPress={handleAddPhoto}
            disabled={isCapturingPhoto}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            {({ pressed }) => (
              <Text style={[styles.addPhotoButtonText, pressed && { opacity: 0.7 }]}>
                {isCapturingPhoto ? 'Taking Photo...' : photoUri ? 'Change Photo' : 'Add Photo'}
              </Text>
            )}
          </Pressable>

          {/* Photo Preview */}
          {photoUri && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
              <Pressable
                style={styles.removePhotoButton}
                onPress={handleRemovePhoto}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                {({ pressed }) => (
                  <Text style={[styles.removePhotoButtonText, pressed && { opacity: 0.7 }]}>
                    Remove
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Note Input */}
          <TextInput
            style={styles.noteInput}
            placeholder={notePlaceholder}
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={(text) => onNoteChange(itemId, text)}
            multiline
            textAlignVertical="top"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  containerAmber: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingLeft: 12,
  },
  containerRed: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    paddingLeft: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statusButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusButtonSelected: {
    borderWidth: 4,
  },
  statusButtonGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  statusButtonAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  statusButtonRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  statusButtonContent: {
    alignItems: 'center',
  },
  statusButtonIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  detailsSection: {
    marginTop: 16,
  },
  addPhotoButton: {
    minHeight: 56,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  photoPreview: {
    marginBottom: 12,
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  removePhotoButton: {
    minHeight: 44,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  noteInput: {
    minHeight: 80,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
});
