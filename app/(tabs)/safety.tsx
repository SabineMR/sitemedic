/**
 * Safety Tab - Near-Misses and Daily Checks
 *
 * Combined safety view with segmented control:
 * - Near-Misses: List + Report button (NEAR-06: ONE tap access)
 * - Daily Checks: Placeholder for Plan 07
 *
 * All tap targets 56pt minimum
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import NearMiss from '../../../src/database/models/NearMiss';
import LargeTapButton from '../../components/ui/LargeTapButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { NEAR_MISS_CATEGORIES } from '../../services/taxonomy/near-miss-categories';

type TabType = 'near-misses' | 'daily-checks';

function SafetyTab({ nearMisses }: { nearMisses: NearMiss[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('near-misses');

  const handleReportNearMiss = () => {
    // TODO: Navigate to near-miss.tsx
    Alert.alert('Navigation', 'Would navigate to near-miss capture screen');
  };

  const handleNearMissPress = (nearMiss: NearMiss) => {
    // TODO: Navigate to near-miss detail/edit
    Alert.alert('Near-Miss', `Category: ${nearMiss.category}`);
  };

  const handleStartDailyCheck = () => {
    // TODO: Navigate to daily-check.tsx (Plan 07)
    Alert.alert('Coming Soon', 'Daily check workflow will be implemented in Plan 07');
  };

  const getCategoryInfo = (categoryId: string) => {
    return (
      NEAR_MISS_CATEGORIES.find((c) => c.id === categoryId) || {
        id: categoryId,
        label: 'Unknown',
        icon: '❓',
      }
    );
  };

  const getSeverityColor = (severity: string): 'green' | 'amber' | 'red' => {
    switch (severity) {
      case 'minor':
        return 'green';
      case 'major':
        return 'amber';
      case 'fatal':
        return 'red';
      default:
        return 'green';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNearMissItem = ({ item }: { item: NearMiss }) => {
    const category = getCategoryInfo(item.category);
    const firstPhoto = item.photoUris[0];

    return (
      <Pressable
        style={styles.listItem}
        onPress={() => handleNearMissPress(item)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        {/* Photo thumbnail */}
        {firstPhoto && (
          <Image source={{ uri: firstPhoto }} style={styles.thumbnail} />
        )}

        <View style={styles.itemContent}>
          {/* Category with icon */}
          <Text style={styles.categoryText}>
            {category.icon} {category.label}
          </Text>

          {/* Date */}
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

          {/* Severity badge */}
          <View style={styles.badgeRow}>
            <StatusBadge
              status={getSeverityColor(item.severity)}
              label={item.severity.toUpperCase()}
              size="small"
            />
            <Text style={styles.statusText}>
              {item.description ? 'Complete' : 'Draft'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmptyNearMisses = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No near-misses reported</Text>
      <Text style={styles.emptySubtext}>
        Tap "Report Near-Miss" to document hazards
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Screen title */}
      <Text style={styles.screenTitle}>Safety</Text>

      {/* Segmented control */}
      <View style={styles.segmentedControl}>
        <Pressable
          style={[
            styles.segmentButton,
            activeTab === 'near-misses' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('near-misses')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'near-misses' && styles.segmentTextActive,
            ]}
          >
            Near-Misses
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segmentButton,
            activeTab === 'daily-checks' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('daily-checks')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'daily-checks' && styles.segmentTextActive,
            ]}
          >
            Daily Checks
          </Text>
        </Pressable>
      </View>

      {/* Near-Misses Tab */}
      {activeTab === 'near-misses' && (
        <View style={styles.tabContent}>
          {/* Report button (NEAR-06: ONE tap from this tab) */}
          <LargeTapButton
            label="⚠️ Report Near-Miss"
            onPress={handleReportNearMiss}
            variant="danger"
          />

          {/* Near-miss list */}
          <FlatList
            data={nearMisses}
            renderItem={renderNearMissItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyNearMisses}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Daily Checks Tab (Placeholder for Plan 07) */}
      {activeTab === 'daily-checks' && (
        <View style={styles.tabContent}>
          <Text style={styles.placeholderTitle}>Daily Safety Checks</Text>
          <Text style={styles.placeholderSubtext}>
            Complete your daily site safety inspection
          </Text>

          <LargeTapButton
            label="✅ Start Today's Check"
            onPress={handleStartDailyCheck}
            variant="primary"
          />

          {/* Placeholder for recent checks list */}
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>
              Recent daily checks will appear here
            </Text>
            <Text style={styles.placeholderSubtext}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Reactive data binding with WatermelonDB
const enhance = withObservables([], ({ database }: { database: any }) => ({
  nearMisses: database.collections
    .get('near_misses')
    .query(Q.sortBy('created_at', Q.desc))
    .observe(),
}));

export default function SafetyScreen() {
  const database = useDatabase();
  const EnhancedSafetyTab = enhance(SafetyTab);

  return <EnhancedSafetyTab database={database} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    minHeight: 56, // 56pt tap target
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#1F2937',
  },
  tabContent: {
    flex: 1,
  },
  listContent: {
    paddingTop: 16,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 80, // Comfortable tap target
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  placeholderBox: {
    marginTop: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
});
