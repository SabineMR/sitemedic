/**
 * Treatment View/Edit Screen
 *
 * Features:
 * - Read-only view when status='complete'
 * - Editable view when status='draft'
 * - Display all treatment fields with labels
 * - Photos displayed as full-width images
 * - Signature displayed as image
 * - RIDDOR flag shown prominently
 * - Edit mode switches to editable form
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '../../../src/lib/watermelon';
import Treatment from '../../../src/database/models/Treatment';
import Worker from '../../../src/database/models/Worker';
import LargeTapButton from '../../components/ui/LargeTapButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { INJURY_TYPES } from '../../services/taxonomy/injury-types';
import { TREATMENT_TYPES } from '../../services/taxonomy/treatment-types';
import { OUTCOME_CATEGORIES } from '../../services/taxonomy/outcome-categories';
import { BODY_PARTS } from '../../services/taxonomy/body-parts';
import { useSync } from '../../../src/contexts/SyncContext';

export default function TreatmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTreatment();
  }, [id]);

  const loadTreatment = async () => {
    try {
      const database = getDatabase();
      const treatmentRecord = await database.get<Treatment>('treatments').find(id);
      setTreatment(treatmentRecord);

      // Load associated worker
      if (treatmentRecord.workerId) {
        try {
          const workerRecord = await database.get<Worker>('workers').find(treatmentRecord.workerId);
          setWorker(workerRecord);
        } catch (error) {
          console.error('Failed to load worker:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load treatment:', error);
      Alert.alert('Error', 'Treatment not found', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // Navigate to new.tsx with treatment ID to enable edit mode
    // For now, just show alert (edit mode would need to be built into new.tsx)
    Alert.alert('Edit Mode', 'Edit functionality would allow modifying draft treatments');
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Treatment',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (treatment) {
                await treatment.markAsDeleted();
                router.back();
              }
            } catch (error) {
              console.error('Failed to delete treatment:', error);
              Alert.alert('Error', 'Failed to delete treatment');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading treatment...</Text>
      </View>
    );
  }

  if (!treatment) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Treatment not found</Text>
      </View>
    );
  }

  // Get readable labels from taxonomy
  const injuryTypeLabel = INJURY_TYPES.find((it) => it.id === treatment.injuryType)?.label || 'Unknown';
  const bodyPartLabel = BODY_PARTS.find((bp) => bp.id === treatment.bodyPart)?.label || 'Not specified';
  const outcomeLabel = OUTCOME_CATEGORIES.find((oc) => oc.id === treatment.outcome)?.label || 'Not specified';

  const treatmentTypeLabels = treatment.treatmentTypes
    .map((id: string) => TREATMENT_TYPES.find((tt) => tt.id === id)?.label)
    .filter(Boolean)
    .join(', ') || 'None specified';

  const isComplete = treatment.status === 'complete';
  const isDraft = treatment.status === 'draft';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Treatment Details</Text>
            <Text style={styles.referenceNumber}>{treatment.referenceNumber}</Text>
          </View>
          <StatusBadge
            status={isComplete ? 'green' : 'grey'}
            label={isComplete ? 'Complete' : 'Draft'}
            size="small"
          />
        </View>
        <Text style={styles.headerDate}>
          {new Date(treatment.createdAt).toLocaleDateString('en-GB', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* RIDDOR Flag Banner */}
        {treatment.isRiddorReportable && (
          <View style={styles.riddorBanner}>
            <Text style={styles.riddorText}>
              ⚠️ RIDDOR REPORTABLE - This incident must be reported to HSE within 15 days
            </Text>
          </View>
        )}

        {/* Worker Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Worker Information</Text>
          {worker ? (
            <>
              <DetailRow label="Name" value={`${worker.firstName} ${worker.lastName}`} />
              <DetailRow label="Company" value={worker.company} />
              <DetailRow label="Role" value={worker.role} />
            </>
          ) : (
            <Text style={styles.noDataText}>Worker information not available</Text>
          )}
        </View>

        {/* Injury Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Injury Details</Text>
          <DetailRow label="Injury Type" value={injuryTypeLabel} />
          <DetailRow label="Body Part" value={bodyPartLabel} />
          <DetailRow label="Mechanism" value={treatment.mechanismOfInjury || 'Not specified'} />
          <DetailRow label="Severity" value={treatment.severity.toUpperCase()} />
        </View>

        {/* Treatment Given */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treatment Given</Text>
          <DetailRow label="Treatments" value={treatmentTypeLabels} />
          {treatment.treatmentNotes && (
            <DetailRow label="Notes" value={treatment.treatmentNotes} />
          )}
        </View>

        {/* Photos */}
        {treatment.photoUris && treatment.photoUris.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo Documentation</Text>
            {treatment.photoUris.map((uri: string, index: number) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* Outcome */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outcome</Text>
          <DetailRow label="Result" value={outcomeLabel} />
        </View>

        {/* Signature */}
        {treatment.signatureUri && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signature</Text>
            <Image
              source={{ uri: treatment.signatureUri }}
              style={styles.signature}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isDraft && (
            <LargeTapButton
              label="Edit Treatment"
              variant="primary"
              onPress={handleEdit}
            />
          )}
          {isDraft && (
            <LargeTapButton
              label="Delete Draft"
              variant="danger"
              onPress={handleDelete}
            />
          )}
          <LargeTapButton
            label="Export PDF"
            variant="secondary"
            onPress={() => Alert.alert('Export', 'PDF export coming in Phase 7')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Helper component for displaying field/value pairs
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  referenceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  headerDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  riddorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  riddorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  signature: {
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
});
