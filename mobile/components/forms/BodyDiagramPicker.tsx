/**
 * BodyDiagramPicker - Body part selection component
 *
 * Features:
 * - Grid layout with large 56pt tap targets
 * - Uses BODY_PARTS taxonomy from Plan 02-01
 * - Visual selection feedback (blue highlight)
 * - Presented via BottomSheetPicker modal
 * - Gloves-on friendly design
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BODY_PARTS, BodyPart } from '../../services/taxonomy/body-parts';

export interface BodyDiagramPickerProps {
  selectedBodyPart: string | null;
  onSelect: (bodyPartId: string) => void;
}

/**
 * BodyDiagramPicker component for body part selection
 *
 * Renders BODY_PARTS as a 2-column grid with 56pt minimum tap targets.
 * Selected body part is highlighted with blue border and background.
 */
export default function BodyDiagramPicker({
  selectedBodyPart,
  onSelect,
}: BodyDiagramPickerProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        {BODY_PARTS.map((bodyPart) => {
          const isSelected = selectedBodyPart === bodyPart.id;

          return (
            <Pressable
              key={bodyPart.id}
              style={[styles.button, isSelected && styles.buttonSelected]}
              onPress={() => onSelect(bodyPart.id)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
                {bodyPart.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  button: {
    // 2-column grid: (100% - gap) / 2
    width: '48%',
    minHeight: 56, // 56pt tap target for gloves
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2, // Android shadow
  },
  buttonSelected: {
    backgroundColor: '#EFF6FF', // Blue-50
    borderColor: '#2563EB', // Blue-600
    borderWidth: 3, // Thicker border when selected
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  buttonTextSelected: {
    color: '#2563EB', // Blue-600
    fontWeight: '700',
  },
});
