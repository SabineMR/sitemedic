/**
 * Near-Miss Capture Screen
 *
 * Optimized for <45 second completion (NEAR-01)
 * Photo-first workflow with immediate GPS capture
 *
 * Flow:
 * 1. Photo capture (quick capture component)
 * 2. Category selection (13 hazard types, visible grid)
 * 3. Description (free text)
 * 4. Severity potential (Minor/Major/Fatal)
 * 5. GPS auto-tagged on mount
 *
 * NEAR-01 through NEAR-07
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import NearMiss from '../../src/database/models/NearMiss';
import NearMissQuickCapture from '../components/safety/NearMissQuickCapture';
import LargeTapButton from '../components/ui/LargeTapButton';
import StatusBadge from '../components/ui/StatusBadge';
import { NEAR_MISS_CATEGORIES } from '../services/taxonomy/near-miss-categories';
import { useSync } from '../../src/contexts/SyncContext';
import { photoUploadQueue } from '../../src/services/PhotoUploadQueue';

type SeverityLevel = 'minor' | 'major' | 'fatal';

export default function NearMissCapture() {
  const database = useDatabase();
  const { enqueueSyncItem } = useSync();

  // Form state
  const [record, setRecord] = useState<NearMiss | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<SeverityLevel>('minor');
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'captured' | 'unavailable'>(
    'loading'
  );

  // Create record and start GPS capture on mount
  useEffect(() => {
    createRecord();
    captureGPS();
  }, []);

  const createRecord = async () => {
    try {
      const newRecord = await database.write(async () => {
        return await database.collections
          .get<NearMiss>('near_misses')
          .create((nearMiss) => {
            nearMiss.orgId = 'ORG_ID_PLACEHOLDER'; // TODO: Get from auth context
            nearMiss.reportedBy = 'MEDIC_ID_PLACEHOLDER'; // TODO: Get from auth context
            nearMiss.category = '';
            nearMiss.severity = 'minor';
            nearMiss.description = '';
            nearMiss.photoUris = [];
            nearMiss.createdAt = Date.now();
            nearMiss.updatedAt = Date.now();
            nearMiss.lastModifiedAt = Date.now();
          });
      });
      setRecord(newRecord);
    } catch (error) {
      console.error('Failed to create near-miss record:', error);
      Alert.alert('Error', 'Failed to initialize near-miss report');
    }
  };

  const captureGPS = async () => {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setGpsStatus('unavailable');
        console.warn('Location permission denied');
        return;
      }

      // Get current position with balanced accuracy (fast, not ultra-precise)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setGpsLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setGpsStatus('captured');

      // Save GPS to record
      if (record) {
        await database.write(async () => {
          await record.update((nearMiss) => {
            nearMiss.location = JSON.stringify({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            nearMiss.updatedAt = Date.now();
            nearMiss.lastModifiedAt = Date.now();
          });
        });
      }
    } catch (error) {
      console.error('Failed to capture GPS location:', error);
      setGpsStatus('unavailable');
    }
  };

  // Auto-save handlers
  const handlePhotosChange = async (uris: string[]) => {
    setPhotoUris(uris);
    if (record) {
      await database.write(async () => {
        await record.update((nearMiss) => {
          nearMiss.photoUris = uris;
          nearMiss.updatedAt = Date.now();
          nearMiss.lastModifiedAt = Date.now();
        });
      });
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (record) {
      await database.write(async () => {
        await record.update((nearMiss) => {
          nearMiss.category = categoryId;
          nearMiss.updatedAt = Date.now();
          nearMiss.lastModifiedAt = Date.now();
        });
      });
    }
  };

  const handleDescriptionChange = async (text: string) => {
    setDescription(text);
    // Auto-save description (debounced in production)
    if (record) {
      await database.write(async () => {
        await record.update((nearMiss) => {
          nearMiss.description = text;
          nearMiss.updatedAt = Date.now();
          nearMiss.lastModifiedAt = Date.now();
        });
      });
    }
  };

  const handleSeverityChange = async (level: SeverityLevel) => {
    setSeverity(level);
    if (record) {
      await database.write(async () => {
        await record.update((nearMiss) => {
          nearMiss.severity = level;
          nearMiss.updatedAt = Date.now();
          nearMiss.lastModifiedAt = Date.now();
        });
      });
    }
  };

  const handleReportNearMiss = async () => {
    // Validation
    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select a hazard category');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe what happened');
      return;
    }
    if (photoUris.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one photo');
      return;
    }

    try {
      if (record) {
        // Enqueue for sync to backend
        await enqueueSyncItem(
          'create',
          'near_misses',
          record.id,
          {
            org_id: record.orgId,
            reported_by: record.reportedBy,
            category: record.category,
            severity: record.severity,
            description: record.description,
            location: record.location,
            corrective_action: record.correctiveAction,
            created_at: new Date(record.createdAt).toISOString(),
            updated_at: new Date(record.updatedAt).toISOString(),
            last_modified_at: record.lastModifiedAt,
          },
          1 // Normal priority
        );

        // Queue photos for progressive upload
        if (record.photoUris && record.photoUris.length > 0) {
          for (let i = 0; i < record.photoUris.length; i++) {
            await photoUploadQueue.enqueuePhoto(
              record.photoUris[i],
              record.id,
              'near_misses',
              i
            );
          }
        }

        Alert.alert('Success', 'Near-miss report submitted');
        // TODO: Navigate back to safety tab
      }
    } catch (error) {
      console.error('Failed to submit near-miss report:', error);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const handleSaveDraft = () => {
    Alert.alert('Draft Saved', 'You can complete this report later');
    // TODO: Navigate back to safety tab
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Report Near-Miss</Text>

      {/* GPS Status Indicator */}
      <View style={styles.gpsIndicator}>
        <Text style={styles.gpsText}>
          {gpsStatus === 'loading' && '📍 Capturing location...'}
          {gpsStatus === 'captured' && '✅ Location captured'}
          {gpsStatus === 'unavailable' && '⚠️ Location unavailable'}
        </Text>
      </View>

      {/* 1. Photo Capture (Photo-first design) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Photo Evidence</Text>
        <NearMissQuickCapture
          photoUris={photoUris}
          onPhotosChange={handlePhotosChange}
          maxPhotos={4}
        />
      </View>

      {/* 2. Category Selection (Visible grid, not hidden picker - NEAR-02) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Hazard Category</Text>
        <View style={styles.categoryGrid}>
          {NEAR_MISS_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory === cat.id && styles.categoryButtonSelected,
              ]}
              onPress={() => handleCategoryChange(cat.id)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 3. Description (Free text - NEAR-04) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Description</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe what happened..."
          value={description}
          onChangeText={handleDescriptionChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* 4. Severity Potential (NEAR-05) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. What COULD have happened?</Text>
        <View style={styles.severityButtons}>
          <Pressable
            style={[
              styles.severityButton,
              styles.severityMinor,
              severity === 'minor' && styles.severitySelected,
            ]}
            onPress={() => handleSeverityChange('minor')}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.severityButtonText}>
              Minor{'\n'}
              <Text style={styles.severitySubtext}>Could cause minor injury</Text>
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.severityButton,
              styles.severityMajor,
              severity === 'major' && styles.severitySelected,
            ]}
            onPress={() => handleSeverityChange('major')}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.severityButtonText}>
              Major{'\n'}
              <Text style={styles.severitySubtext}>Could cause serious injury</Text>
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.severityButton,
              styles.severityFatal,
              severity === 'fatal' && styles.severitySelected,
            ]}
            onPress={() => handleSeverityChange('fatal')}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.severityButtonText}>
              Fatal{'\n'}
              <Text style={styles.severitySubtext}>Could cause death</Text>
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Submit Actions */}
      <View style={styles.actions}>
        <LargeTapButton
          label="Report Near-Miss"
          onPress={handleReportNearMiss}
          variant="danger"
        />
        <Pressable onPress={handleSaveDraft} style={styles.saveDraftButton}>
          <Text style={styles.saveDraftText}>Save Draft</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  gpsIndicator: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  gpsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    width: '48%', // 2-column grid
    minHeight: 80, // 56pt + padding for large tap target
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  descriptionInput: {
    minHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    minHeight: 80, // 56pt + padding
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  severityMinor: {
    backgroundColor: '#D1FAE5', // Green tint
  },
  severityMajor: {
    backgroundColor: '#FEF3C7', // Amber tint
  },
  severityFatal: {
    backgroundColor: '#FEE2E2', // Red tint
  },
  severitySelected: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  severityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  severitySubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  actions: {
    marginTop: 24,
  },
  saveDraftButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  saveDraftText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
});
