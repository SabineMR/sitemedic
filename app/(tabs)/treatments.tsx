/**
 * Treatment Log List View
 *
 * Features:
 * - Quick Log and Full Treatment action buttons
 * - Search/filter by worker name and injury type
 * - List of all treatments sorted by most recent
 * - RIDDOR flag indicators
 * - Status badges (draft/complete)
 * - Outcome badges with color coding
 * - Tap to view treatment details
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from '../../src/lib/watermelon';
import Treatment from '../../src/database/models/Treatment';
import Worker from '../../src/database/models/Worker';
import LargeTapButton from '../../components/ui/LargeTapButton';
import StatusBadge from '../../components/ui/StatusBadge';
import SwipeableListItem from '../../components/ui/SwipeableListItem';
import { INJURY_TYPES } from '../../services/taxonomy/injury-types';
import { OUTCOME_CATEGORIES } from '../../services/taxonomy/outcome-categories';

interface TreatmentWithWorker extends Treatment {
  workerName?: string;
}

export default function TreatmentsScreen() {
  const [treatments, setTreatments] = useState<TreatmentWithWorker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTreatments();
  }, []);

  const loadTreatments = async () => {
    try {
      const database = getDatabase();

      // Load all treatments sorted by most recent
      const allTreatments = await database
        .get<Treatment>('treatments')
        .query(Q.sortBy('created_at', Q.desc))
        .fetch();

      // Load worker names for each treatment
      const treatmentsWithWorkers = await Promise.all(
        allTreatments.map(async (treatment) => {
          let workerName = 'Unknown Worker';
          if (treatment.workerId) {
            try {
              const worker = await database.get<Worker>('workers').find(treatment.workerId);
              workerName = `${worker.firstName} ${worker.lastName}`;
            } catch (error) {
              console.error('Failed to load worker:', error);
            }
          }
          return {
            ...treatment,
            id: treatment.id,
            workerName,
          } as TreatmentWithWorker;
        })
      );

      setTreatments(treatmentsWithWorkers);
    } catch (error) {
      console.error('Failed to load treatments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search filter
  const filteredTreatments = useMemo(() => {
    if (!searchQuery.trim()) {
      return treatments;
    }

    const query = searchQuery.toLowerCase().trim();

    return treatments.filter((treatment) => {
      // Search by worker name
      const workerNameMatch = treatment.workerName?.toLowerCase().includes(query);

      // Search by injury type label
      const injuryTypeLabel = INJURY_TYPES.find(
        (it) => it.id === treatment.injuryType
      )?.label.toLowerCase();
      const injuryTypeMatch = injuryTypeLabel?.includes(query);

      // Search by reference number
      const refNumberMatch = treatment.referenceNumber?.toLowerCase().includes(query);

      return workerNameMatch || injuryTypeMatch || refNumberMatch;
    });
  }, [treatments, searchQuery]);

  // Navigate to quick log
  const handleQuickLog = () => {
    router.push('/treatment/templates');
  };

  // Navigate to full treatment form
  const handleFullTreatment = () => {
    router.push('/treatment/new');
  };

  // Navigate to treatment details
  const handleTreatmentPress = (treatmentId: string) => {
    router.push(`/treatment/${treatmentId}`);
  };

  // Delete treatment with confirmation
  const handleDeleteTreatment = async (treatmentId: string, treatmentRef: string) => {
    Alert.alert(
      'Delete Treatment',
      `Are you sure you want to delete treatment ${treatmentRef}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const database = getDatabase();
              const treatment = await database.get<Treatment>('treatments').find(treatmentId);
              await database.write(async () => {
                await treatment.markAsDeleted();
              });
              // Reload treatments list
              await loadTreatments();
            } catch (error) {
              console.error('Failed to delete treatment:', error);
              Alert.alert('Error', 'Failed to delete treatment. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Get outcome badge status color
  const getOutcomeBadgeStatus = (outcomeId: string | undefined): 'green' | 'amber' | 'red' | 'grey' => {
    if (!outcomeId) return 'grey';
    const outcome = OUTCOME_CATEGORIES.find((oc) => oc.id === outcomeId);
    if (!outcome) return 'grey';

    switch (outcome.severity) {
      case 'low':
        return 'green';
      case 'medium':
        return 'amber';
      case 'high':
        return 'red';
      default:
        return 'grey';
    }
  };

  // Render treatment list item
  const renderTreatmentItem = ({ item }: { item: TreatmentWithWorker }) => {
    const injuryLabel = INJURY_TYPES.find((it) => it.id === item.injuryType)?.label || 'Unknown';
    const outcomeLabel = OUTCOME_CATEGORIES.find((oc) => oc.id === item.outcome)?.label || 'Not specified';
    const outcomeBadgeStatus = getOutcomeBadgeStatus(item.outcome);

    const treatmentDate = new Date(item.createdAt);
    const dateStr = treatmentDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = treatmentDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <SwipeableListItem
        onDelete={() => handleDeleteTreatment(item.id, item.referenceNumber || 'Unknown')}
        onEdit={() => handleTreatmentPress(item.id)}
        editLabel="View"
      >
        <Pressable
          style={({ pressed }) => [styles.treatmentItem, pressed && styles.treatmentItemPressed]}
          onPress={() => handleTreatmentPress(item.id)}
        >
          {/* Header: Reference Number + Status */}
          <View style={styles.itemHeader}>
            <Text style={styles.referenceNumber}>{item.referenceNumber}</Text>
            <View style={styles.statusContainer}>
              {item.isRiddorReportable && (
                <View style={styles.riddorBadge}>
                  <Text style={styles.riddorBadgeText}>RIDDOR</Text>
                </View>
              )}
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {item.status === 'complete' ? 'Complete' : 'Draft'}
                </Text>
              </View>
            </View>
          </View>

          {/* Worker + Injury Type */}
          <View style={styles.itemRow}>
            <Text style={styles.workerName}>{item.workerName}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.injuryType}>{injuryLabel}</Text>
          </View>

          {/* Date + Time */}
          <View style={styles.itemRow}>
            <Text style={styles.dateTime}>
              {dateStr} at {timeStr}
            </Text>
          </View>

          {/* Outcome Badge */}
          <View style={styles.itemFooter}>
            <StatusBadge
              status={outcomeBadgeStatus}
              label={outcomeLabel}
              size="small"
            />
          </View>
        </Pressable>
      </SwipeableListItem>
    );
  };

  // Empty state
  if (!loading && treatments.length === 0) {
    return (
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Treatment Log</Text>
        </View>

        {/* Empty state */}
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No treatments logged today</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start logging treatments to build your daily record
          </Text>
          <View style={styles.emptyStateActions}>
            <LargeTapButton
              label="⚡ Quick Log"
              variant="primary"
              onPress={handleQuickLog}
            />
            <LargeTapButton
              label="📋 Full Treatment"
              variant="secondary"
              onPress={handleFullTreatment}
            />
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Treatment Log</Text>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.actionButton} onPress={handleQuickLog}>
            <Text style={styles.actionButtonText}>⚡ Quick Log</Text>
          </Pressable>
          <Pressable style={styles.actionButtonSecondary} onPress={handleFullTreatment}>
            <Text style={styles.actionButtonSecondaryText}>📋 Full Treatment</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by worker, injury type, or reference"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Treatment List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading treatments...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTreatments}
          renderItem={renderTreatmentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptySearchState}>
              <Text style={styles.emptySearchText}>
                No treatments match "{searchQuery}"
              </Text>
            </View>
          }
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonSecondary: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchInput: {
    minHeight: 56,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  treatmentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  treatmentItemPressed: {
    opacity: 0.8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  referenceNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  riddorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 4,
  },
  riddorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  separator: {
    fontSize: 16,
    color: '#D1D5DB',
    marginHorizontal: 8,
  },
  injuryType: {
    fontSize: 16,
    color: '#6B7280',
  },
  dateTime: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  itemFooter: {
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateActions: {
    width: '100%',
    gap: 12,
  },
  emptySearchState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
