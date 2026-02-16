/**
 * Home Dashboard - Medic Command Center
 *
 * Features:
 * - Daily check prompt banner (DAILY-04)
 * - Quick actions grid: Quick Treatment, Full Treatment, Near-Miss, Add Worker
 * - Emergency worker lookup with recent 5 workers (WORK-04: 2-tap access)
 * - Today's summary stats
 * - Sync status indicator
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import SafetyCheck from '../../../src/database/models/SafetyCheck';
import Worker from '../../../src/database/models/Worker';
import Treatment from '../../../src/database/models/Treatment';
import NearMiss from '../../../src/database/models/NearMiss';
import LargeTapButton from '../../components/ui/LargeTapButton';
import { useSync } from '../../../src/contexts/SyncContext';

interface HomeProps {
  todayCheck: SafetyCheck | null;
  recentWorkers: Worker[];
  todayTreatments: Treatment[];
  todayNearMisses: NearMiss[];
}

function HomeScreen({
  todayCheck,
  recentWorkers,
  todayTreatments,
  todayNearMisses,
}: HomeProps) {
  const { state: syncState } = useSync();

  // Daily check status
  const dailyCheckComplete = todayCheck?.overallStatus === 'pass';
  const dailyCheckInProgress =
    !dailyCheckComplete && todayCheck?.overallStatus === 'partial';

  // Navigation handlers
  const handleStartDailyCheck = () => {
    router.push('/safety/daily-check');
  };

  const handleQuickTreatment = () => {
    router.push('/treatment/templates');
  };

  const handleFullTreatment = () => {
    router.push('/treatment/new');
  };

  const handleNearMiss = () => {
    router.push('/safety/near-miss');
  };

  const handleAddWorker = () => {
    router.push('/worker/new');
  };

  const handleWorkerPress = (workerId: string) => {
    router.push(`/worker/${workerId}`);
  };

  const handleViewAllWorkers = () => {
    router.push('/(tabs)/workers');
  };

  // Format date for display
  const formatLastTreatment = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return `Today ${date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Daily Check Prompt Banner */}
      {!dailyCheckComplete && (
        <Pressable
          style={[
            styles.dailyCheckBanner,
            dailyCheckInProgress ? styles.bannerAmber : styles.bannerRed,
          ]}
          onPress={handleStartDailyCheck}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerIcon}>
              {dailyCheckInProgress ? '⚠️' : '❗'}
            </Text>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>
                {dailyCheckInProgress
                  ? 'Daily Check In Progress'
                  : 'Daily Safety Check Not Completed'}
              </Text>
              <Text style={styles.bannerSubtitle}>
                {dailyCheckInProgress
                  ? 'Complete remaining items'
                  : 'Start your daily site inspection'}
              </Text>
            </View>
            <Text style={styles.bannerArrow}>▶</Text>
          </View>
        </Pressable>
      )}

      {dailyCheckComplete && (
        <View style={[styles.dailyCheckBanner, styles.bannerGreen]}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerIcon}>✅</Text>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, styles.bannerTitleGreen]}>
                Daily Check Complete
              </Text>
              <Text style={[styles.bannerSubtitle, styles.bannerSubtitleGreen]}>
                All site safety items verified
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {/* Quick Treatment */}
          <Pressable
            style={[styles.actionCard, styles.actionCardBlue]}
            onPress={handleQuickTreatment}
          >
            <Text style={styles.actionCardIcon}>⚡</Text>
            <Text style={styles.actionCardLabel}>Quick Treatment</Text>
            <Text style={styles.actionCardSubtitle}>&lt;30 sec</Text>
          </Pressable>

          {/* Full Treatment */}
          <Pressable
            style={[styles.actionCard, styles.actionCardBlue]}
            onPress={handleFullTreatment}
          >
            <Text style={styles.actionCardIcon}>📋</Text>
            <Text style={styles.actionCardLabel}>Full Treatment</Text>
            <Text style={styles.actionCardSubtitle}>Complete log</Text>
          </Pressable>

          {/* Near-Miss - NEAR-06: ONE tap from home */}
          <Pressable
            style={[styles.actionCard, styles.actionCardRed]}
            onPress={handleNearMiss}
          >
            <Text style={styles.actionCardIcon}>⚠️</Text>
            <Text style={styles.actionCardLabel}>Near-Miss</Text>
            <Text style={styles.actionCardSubtitle}>Report hazard</Text>
          </Pressable>

          {/* Add Worker */}
          <Pressable
            style={[styles.actionCard, styles.actionCardGreen]}
            onPress={handleAddWorker}
          >
            <Text style={styles.actionCardIcon}>👷</Text>
            <Text style={styles.actionCardLabel}>Add Worker</Text>
            <Text style={styles.actionCardSubtitle}>Site induction</Text>
          </Pressable>
        </View>
      </View>

      {/* Emergency Worker Lookup - WORK-04: 2-tap access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Worker Lookup</Text>
        <Text style={styles.sectionSubtitle}>
          Recently treated workers for quick access
        </Text>

        {recentWorkers.length > 0 ? (
          <>
            {recentWorkers.map((worker) => (
              <Pressable
                key={worker.id}
                style={styles.workerRow}
                onPress={() => handleWorkerPress(worker.id)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>
                    {worker.firstName} {worker.lastName}
                  </Text>
                  <Text style={styles.workerCompany}>{worker.company}</Text>
                </View>
                <Text style={styles.workerMeta}>▶</Text>
              </Pressable>
            ))}
            <Pressable onPress={handleViewAllWorkers} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Workers →</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No workers registered yet</Text>
            <LargeTapButton
              label="Add First Worker"
              variant="primary"
              onPress={handleAddWorker}
            />
          </View>
        )}
      </View>

      {/* Today's Summary Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayTreatments.length}</Text>
            <Text style={styles.statLabel}>Treatments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayNearMisses.length}</Text>
            <Text style={styles.statLabel}>Near-Misses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {recentWorkers.filter((w) => !w.isIncomplete).length}
            </Text>
            <Text style={styles.statLabel}>Workers Inducted</Text>
          </View>
        </View>
      </View>

      {/* Sync Status */}
      <View style={styles.syncSection}>
        <Text style={styles.syncLabel}>Sync Status:</Text>
        <Text style={styles.syncValue}>
          {syncState.status === 'synced' && '✓ Synced'}
          {syncState.status === 'syncing' && '⟳ Syncing...'}
          {syncState.status === 'pending' &&
            `${syncState.pendingCount} items pending`}
          {syncState.status === 'offline' && '⚠️ Offline'}
          {syncState.status === 'error' && '❌ Sync error'}
        </Text>
      </View>
    </ScrollView>
  );
}

// Reactive data binding with WatermelonDB
const enhance = withObservables([], ({ database }: { database: any }) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  return {
    // Today's safety check
    todayCheck: database.collections
      .get('safety_checks')
      .query(Q.where('check_date', Q.gte(todayStartMs)), Q.take(1))
      .observe()
      .pipe((checks: any) => checks[0] || null),

    // Recent workers (last 5)
    recentWorkers: database.collections
      .get('workers')
      .query(Q.sortBy('updated_at', Q.desc), Q.take(5))
      .observe(),

    // Today's treatments
    todayTreatments: database.collections
      .get('treatments')
      .query(Q.where('created_at', Q.gte(todayStartMs)))
      .observe(),

    // Today's near-misses
    todayNearMisses: database.collections
      .get('near_misses')
      .query(Q.where('created_at', Q.gte(todayStartMs)))
      .observe(),
  };
});

export default function HomeScreenWrapper() {
  const database = useDatabase();
  const EnhancedHome = enhance(HomeScreen);

  return <EnhancedHome database={database} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  dailyCheckBanner: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    minHeight: 80,
  },
  bannerGreen: {
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  bannerAmber: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  bannerRed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIcon: {
    fontSize: 32,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  bannerTitleGreen: {
    color: '#065F46',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  bannerSubtitleGreen: {
    color: '#047857',
  },
  bannerArrow: {
    fontSize: 20,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    minHeight: 100,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionCardBlue: {
    backgroundColor: '#2563EB',
  },
  actionCardRed: {
    backgroundColor: '#EF4444',
  },
  actionCardGreen: {
    backgroundColor: '#10B981',
  },
  actionCardIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  actionCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  workerCompany: {
    fontSize: 14,
    color: '#6B7280',
  },
  workerMeta: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  syncSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  syncLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  syncValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});
