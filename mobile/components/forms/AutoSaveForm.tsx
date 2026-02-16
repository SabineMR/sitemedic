/**
 * AutoSaveForm - Auto-save hook and indicator for WatermelonDB forms
 *
 * Features:
 * - Debounced auto-save (default 500ms)
 * - Works with any WatermelonDB Model
 * - Field mapping for form state to model properties
 * - Visual save indicator ("Saving..." / "Saved {time}")
 * - Defensive error handling (logs but doesn't crash)
 *
 * Usage:
 * ```
 * const { isSaving, lastSaved } = useAutoSave(
 *   treatmentRecord,
 *   formValues,
 *   { injuryType: 'injury_type', bodyPart: 'body_part' },
 *   500
 * );
 * ```
 */

import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Model } from '@nozbe/watermelondb';

/**
 * Auto-save hook for WatermelonDB models
 *
 * @param record - WatermelonDB model instance to update
 * @param formValues - Current form values object
 * @param fieldMapping - Map of form field names to model field names
 * @param debounceMs - Debounce delay in milliseconds (default 500ms)
 * @returns Object with isSaving state and lastSaved timestamp
 */
export function useAutoSave<T extends Model>(
  record: T | null,
  formValues: Record<string, any>,
  fieldMapping: Record<string, string>,
  debounceMs: number = 500
): { isSaving: boolean; lastSaved: number | null } {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const previousValues = useRef<Record<string, any>>({});

  useEffect(() => {
    // Skip if no record
    if (!record) return;

    // Check if values actually changed (avoid unnecessary saves)
    const hasChanged = Object.keys(formValues).some(
      (key) => formValues[key] !== previousValues.current[key]
    );

    if (!hasChanged) return;

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(async () => {
      try {
        setIsSaving(true);

        // Map form values to model fields and update
        await record.update((rec: any) => {
          Object.entries(formValues).forEach(([formKey, value]) => {
            const modelKey = fieldMapping[formKey] || formKey;

            // Only update if field exists on model and value changed
            if (rec[modelKey] !== value) {
              rec[modelKey] = value;
            }
          });
        });

        // Update last saved timestamp
        setLastSaved(Date.now());
        previousValues.current = { ...formValues };
      } catch (error) {
        console.error('[AutoSave] Failed to save:', error);
        // Don't crash - just log the error
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [record, formValues, fieldMapping, debounceMs]);

  return { isSaving, lastSaved };
}

/**
 * AutoSaveIndicator component
 *
 * Shows visual feedback for auto-save status:
 * - Nothing initially
 * - "Saving..." during save
 * - "Saved {relative time}" after save
 */
export interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: number | null;
}

export function AutoSaveIndicator({ isSaving, lastSaved }: AutoSaveIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) return;

    // Update relative time every second
    const updateRelativeTime = () => {
      const secondsAgo = Math.floor((Date.now() - lastSaved) / 1000);

      if (secondsAgo < 5) {
        setRelativeTime('just now');
      } else if (secondsAgo < 60) {
        setRelativeTime(`${secondsAgo}s ago`);
      } else {
        const minutesAgo = Math.floor(secondsAgo / 60);
        setRelativeTime(`${minutesAgo}m ago`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 1000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  // Don't show anything if never saved
  if (!isSaving && !lastSaved) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isSaving ? '⏱️ Saving...' : `✓ Saved ${relativeTime}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
