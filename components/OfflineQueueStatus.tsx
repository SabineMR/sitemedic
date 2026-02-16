/**
 * OfflineQueueStatus.tsx
 *
 * Visual indicator for offline queue status.
 *
 * WHY: Medics need to see:
 * - How many pings are waiting to sync
 * - Whether sync is healthy or having issues
 * - When last sync succeeded
 *
 * SHOWS:
 * - Green: Queue empty, all synced
 * - Yellow: Pings queued, will sync when online
 * - Orange: Queue getting full (>50%)
 * - Red: Queue critical (>80% full) or repeated sync failures
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { offlineQueueManager } from '../services/OfflineQueueManager';

export default function OfflineQueueStatus() {
  const [status, setStatus] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Update status every 5 seconds
    const updateStatus = () => {
      const currentStatus = offlineQueueManager.getStatus();
      setStatus(currentStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  // Don't show if queue is empty and healthy
  if (status.queueSize === 0 && status.health === 'healthy') {
    return null;
  }

  /**
   * Get status color based on health
   */
  const getStatusColor = () => {
    switch (status.health) {
      case 'healthy':
        return styles.healthy;
      case 'warning':
        return styles.warning;
      case 'critical':
        return styles.critical;
      default:
        return styles.healthy;
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = () => {
    if (status.queueSize === 0) return '✅';
    switch (status.health) {
      case 'healthy':
        return '🔄';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '🚨';
      default:
        return '🔄';
    }
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Never';
    const minutes = Math.round((Date.now() - new Date(isoString).getTime()) / 1000 / 60);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    return `${hours}h ago`;
  };

  /**
   * Trigger manual sync
   */
  const handleManualSync = async () => {
    try {
      const result = await offlineQueueManager.syncQueue();
      console.log('Manual sync result:', result);
      // Update status immediately
      const newStatus = offlineQueueManager.getStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('Manual sync error:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, getStatusColor()]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      {/* Compact View */}
      <View style={styles.compactRow}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <View style={styles.compactText}>
          {status.queueSize > 0 ? (
            <>
              <Text style={styles.mainText}>{status.queueSize} queued</Text>
              <Text style={styles.subText}>Tap to {expanded ? 'collapse' : 'expand'}</Text>
            </>
          ) : (
            <>
              <Text style={styles.mainText}>All synced</Text>
              <Text style={styles.subText}>No pending data</Text>
            </>
          )}
        </View>
      </View>

      {/* Expanded Details */}
      {expanded && status.queueSize > 0 && (
        <View style={styles.expandedDetails}>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Queue size:</Text>
            <Text style={styles.detailValue}>{status.queueSize} pings</Text>
          </View>

          {status.oldestPingAge && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Oldest ping:</Text>
              <Text style={styles.detailValue}>{status.oldestPingAge}m ago</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last sync:</Text>
            <Text style={styles.detailValue}>
              {formatTimeAgo(status.metadata.lastSuccessfulSync)}
            </Text>
          </View>

          {status.metadata.failedSyncCount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Failed attempts:</Text>
              <Text style={[styles.detailValue, styles.errorText]}>
                {status.metadata.failedSyncCount}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{status.metadata.totalEnqueued}</Text>
              <Text style={styles.statLabel}>Enqueued</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{status.metadata.totalSynced}</Text>
              <Text style={styles.statLabel}>Synced</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{status.metadata.totalDiscarded}</Text>
              <Text style={styles.statLabel}>Discarded</Text>
            </View>
          </View>

          {/* Manual Sync Button */}
          <TouchableOpacity style={styles.syncButton} onPress={handleManualSync}>
            <Text style={styles.syncButtonText}>🔄 Sync Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  healthy: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  critical: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  compactText: {
    flex: 1,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
    color: '#6B7280',
  },
  expandedDetails: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  errorText: {
    color: '#EF4444',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  syncButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
