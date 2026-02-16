/**
 * Daily Safety Checklist Screen
 *
 * Green/Amber/Red status for 10 site safety items.
 * Auto-saves progress, daily reset, completion tracking.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from '../../src/lib/watermelon';
import SafetyCheck from '../../src/database/models/SafetyCheck';
import { DAILY_CHECK_ITEMS } from '../services/taxonomy/daily-check-items';
import { DailyChecklistItem } from '../components/safety/DailyChecklistItem';
import { AutoSaveIndicator } from '../components/forms/AutoSaveForm';
import { useSync } from '../../src/contexts/SyncContext';
import { photoUploadQueue } from '../../src/services/PhotoUploadQueue';

interface ChecklistItem {
  id: string;
  status: 'green' | 'amber' | 'red' | null;
  photoUri: string | null;
  note: string;
}

export default function DailyCheckScreen() {
  const router = useRouter();
  const { enqueueSyncItem } = useSync();
  const [isLoading, setIsLoading] = useState(true);
  const [safetyCheck, setSafetyCheck] = useState<SafetyCheck | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // Get today's date string in YYYY-MM-DD format
  const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert date string to epoch milliseconds (for check_date field)
  const dateStringToEpoch = (dateStr: string): number => {
    return new Date(dateStr).getTime();
  };

  // Load or create today's checklist
  useEffect(() => {
    const loadChecklist = async () => {
      try {
        const db = getDatabase();
        const safetyChecksCollection = db.get<SafetyCheck>('safety_checks');
        const todayDateString = getTodayDateString();
        const todayEpoch = dateStringToEpoch(todayDateString);

        // Query for today's checklist
        const existingChecks = await safetyChecksCollection
          .query(Q.where('check_date', todayEpoch))
          .fetch();

        if (existingChecks.length > 0) {
          // Load existing checklist
          const check = existingChecks[0];
          setSafetyCheck(check);
          setItems(check.items as ChecklistItem[]);
        } else {
          // Create new checklist for today
          const newCheck = await db.write(async () => {
            return await safetyChecksCollection.create((record) => {
              // Initialize items with null status
              const initialItems: ChecklistItem[] = DAILY_CHECK_ITEMS.map((item) => ({
                id: item.id,
                status: null,
                photoUri: null,
                note: '',
              }));

              record.orgId = 'temp-org-id'; // TODO: Get from auth context
              record.medicId = 'temp-medic-id'; // TODO: Get from auth context
              record.checkDate = todayEpoch;
              record.items = initialItems;
              record.overallStatus = 'in_progress';
              record.photoUris = [];
              record.createdAt = Date.now();
              record.updatedAt = Date.now();
              record.lastModifiedAt = Date.now();
            });
          });

          setSafetyCheck(newCheck);
          setItems(newCheck.items as ChecklistItem[]);
        }
      } catch (error) {
        console.error('Failed to load daily checklist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChecklist();
  }, []);

  // Auto-save when items change
  useEffect(() => {
    if (!safetyCheck || items.length === 0) return;

    const saveItems = async () => {
      try {
        setIsSaving(true);

        await safetyCheck.update((record) => {
          record.items = items;
          record.updatedAt = Date.now();
          record.lastModifiedAt = Date.now();
        });

        setLastSaved(Date.now());
      } catch (error) {
        console.error('Failed to auto-save checklist:', error);
      } finally {
        setIsSaving(false);
      }
    };

    // Debounce save by 10000ms (10 seconds)
    const timer = setTimeout(saveItems, 10000);
    return () => clearTimeout(timer);
  }, [items, safetyCheck]);

  // Handle status change
  const handleStatusChange = (itemId: string, status: 'green' | 'amber' | 'red') => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, status } : item
      )
    );
  };

  // Handle photo change
  const handlePhotoChange = (itemId: string, uri: string | null) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, photoUri: uri } : item
      )
    );
  };

  // Handle note change
  const handleNoteChange = (itemId: string, note: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, note } : item
      )
    );
  };

  // Calculate completion progress
  const completedCount = items.filter((item) => item.status !== null).length;
  const totalCount = items.length;
  const isAllComplete = completedCount === totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Complete checklist
  const handleComplete = async () => {
    if (!safetyCheck || !isAllComplete) return;

    try {
      await safetyCheck.update((record) => {
        record.overallStatus = 'complete';
        record.updatedAt = Date.now();
        record.lastModifiedAt = Date.now();
      });

      // Enqueue for sync to backend
      await enqueueSyncItem(
        'create',
        'safety_checks',
        safetyCheck.id,
        {
          org_id: safetyCheck.orgId,
          medic_id: safetyCheck.medicId,
          check_date: new Date(safetyCheck.checkDate).toISOString().split('T')[0], // DATE format for server
          items: safetyCheck.items, // Already parsed by WatermelonDB @json decorator
          overall_status: safetyCheck.overallStatus,
          created_at: new Date(safetyCheck.createdAt).toISOString(),
          updated_at: new Date(safetyCheck.updatedAt).toISOString(),
          last_modified_at: safetyCheck.lastModifiedAt,
        },
        1 // Normal priority
      );

      // Queue photos if any
      if (safetyCheck.photoUris && safetyCheck.photoUris.length > 0) {
        for (let i = 0; i < safetyCheck.photoUris.length; i++) {
          await photoUploadQueue.enqueuePhoto(safetyCheck.photoUris[i], safetyCheck.id, 'safety_checks', i);
        }
      }

      // Navigate back to safety tab
      router.back();
    } catch (error) {
      console.error('Failed to complete checklist:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading checklist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Safety Check</Text>
        <Text style={styles.date}>{getTodayDateString()}</Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount} items checked
          </Text>
          <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
      </View>

      {/* Checklist Items */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {DAILY_CHECK_ITEMS.map((checkItem) => {
          const itemData = items.find((item) => item.id === checkItem.id) || {
            id: checkItem.id,
            status: null,
            photoUri: null,
            note: '',
          };

          return (
            <DailyChecklistItem
              key={checkItem.id}
              label={checkItem.label}
              itemId={checkItem.id}
              status={itemData.status}
              photoUri={itemData.photoUri}
              note={itemData.note}
              onStatusChange={handleStatusChange}
              onPhotoChange={handlePhotoChange}
              onNoteChange={handleNoteChange}
            />
          );
        })}
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.completeButton,
            !isAllComplete && styles.completeButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!isAllComplete}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {({ pressed }) => (
            <Text
              style={[
                styles.completeButtonText,
                !isAllComplete && styles.completeButtonTextDisabled,
                pressed && { opacity: 0.7 },
              ]}
            >
              {isAllComplete ? 'Complete Check' : `Complete ${totalCount - completedCount} more items`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completeButton: {
    minHeight: 56,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completeButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
