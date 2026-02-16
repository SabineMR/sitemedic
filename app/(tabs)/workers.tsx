/**
 * Workers Registry Tab
 *
 * Searchable alphabetical list of all workers with:
 * - Search bar (filter by name/company/role)
 * - Certification status badges (red if any expired, amber if expiring <30 days, green if all current)
 * - Profile incomplete flag
 * - 56pt min height tap targets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import Worker from '../../src/database/models/Worker';
import LargeTapButton from '../components/ui/LargeTapButton';
import StatusBadge from '../components/ui/StatusBadge';

interface WorkersListProps {
  workers: Worker[];
}

function WorkersList({ workers }: WorkersListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter workers by search query (debounced in real implementation)
  const filteredWorkers = workers.filter((worker) => {
    const query = searchQuery.toLowerCase();
    return (
      worker.firstName.toLowerCase().includes(query) ||
      worker.lastName.toLowerCase().includes(query) ||
      worker.company.toLowerCase().includes(query) ||
      (worker.role && worker.role.toLowerCase().includes(query))
    );
  });

  // Navigate to add worker
  const handleAddWorker = () => {
    router.push('/worker/new');
  };

  // Navigate to worker profile
  const handleWorkerPress = (workerId: string) => {
    router.push(`/worker/${workerId}`);
  };

  // Get certification status for a worker
  const getCertificationStatus = (worker: Worker): 'green' | 'amber' | 'red' => {
    // Parse certifications JSON
    let certifications: Array<{ type: string; expiry: number }> = [];
    if (worker.certifications) {
      try {
        certifications = JSON.parse(worker.certifications);
      } catch {
        certifications = [];
      }
    }

    // Check CSCS card expiry
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (worker.cscsExpiryDate && worker.cscsExpiryDate < now) {
      return 'red'; // CSCS expired
    }

    // Check if any certifications expired
    const hasExpired = certifications.some((cert) => cert.expiry < now);
    if (hasExpired) {
      return 'red';
    }

    // Check if any expiring within 30 days
    if (worker.cscsExpiryDate && worker.cscsExpiryDate < now + thirtyDaysMs) {
      return 'amber';
    }

    const hasExpiringSoon = certifications.some(
      (cert) => cert.expiry < now + thirtyDaysMs
    );
    if (hasExpiringSoon) {
      return 'amber';
    }

    // All current
    return 'green';
  };

  const renderWorkerItem = ({ item }: { item: Worker }) => {
    const certStatus = getCertificationStatus(item);

    return (
      <Pressable
        style={styles.workerCard}
        onPress={() => handleWorkerPress(item.id)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.workerCompany}>{item.company}</Text>
          {item.role && <Text style={styles.workerRole}>{item.role}</Text>}
        </View>

        <View style={styles.workerMeta}>
          {item.isIncomplete && (
            <StatusBadge status="amber" label="Incomplete" size="small" />
          )}
          <StatusBadge
            status={certStatus}
            label={
              certStatus === 'red'
                ? 'Expired'
                : certStatus === 'amber'
                  ? 'Expiring'
                  : 'Current'
            }
            size="small"
          />
          <Text style={styles.arrow}>▶</Text>
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Workers Registered</Text>
      <Text style={styles.emptySubtitle}>
        Add workers during site induction
      </Text>
      <LargeTapButton
        label="Add Worker"
        variant="primary"
        onPress={handleAddWorker}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Add Worker Button */}
      <View style={styles.header}>
        <LargeTapButton
          label="➕ Add Worker"
          variant="primary"
          onPress={handleAddWorker}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, company, or role..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Workers List */}
      <FlatList
        data={filteredWorkers}
        renderItem={renderWorkerItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// Reactive data binding with WatermelonDB
const enhance = withObservables([], ({ database }: { database: any }) => ({
  workers: database.collections
    .get('workers')
    .query(Q.sortBy('first_name', Q.asc))
    .observe(),
}));

export default function WorkersScreen() {
  const database = useDatabase();
  const EnhancedWorkersList = enhance(WorkersList);

  return <EnhancedWorkersList database={database} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInput: {
    minHeight: 56,
    fontSize: 18,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workerInfo: {
    flex: 1,
    marginRight: 12,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  workerCompany: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 2,
  },
  workerRole: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  workerMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  arrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
});
