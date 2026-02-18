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
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '../../src/lib/watermelon';
import Treatment from '../../src/database/models/Treatment';
import Worker from '../../src/database/models/Worker';
import LargeTapButton from '../../components/ui/LargeTapButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { INJURY_TYPES } from '../../services/taxonomy/injury-types';
import { TREATMENT_TYPES } from '../../services/taxonomy/treatment-types';
import { OUTCOME_CATEGORIES } from '../../services/taxonomy/outcome-categories';
import { BODY_PARTS } from '../../services/taxonomy/body-parts';
import { useSync } from '../../src/contexts/SyncContext';
import RIDDOROverrideModal from '../../components/treatment/RIDDOROverrideModal';
import { fetchRIDDORIncident, RIDDORIncident } from '../../src/lib/riddor-client';
import { supabase } from '../../src/lib/supabase';
import { useOrg } from '../../src/contexts/OrgContext';
import { getPatientLabel } from '../../services/taxonomy/vertical-outcome-labels';

export default function TreatmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [riddorIncident, setRiddorIncident] = useState<RIDDORIncident | null>(null);
  const [showRiddorModal, setShowRiddorModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { primaryVertical } = useOrg();
  const patientLabel = getPatientLabel(primaryVertical);

  useEffect(() => {
    loadTreatment();
    loadCurrentUser();
  }, [id]);

  // Load current user ID for RIDDOR override
  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  // Fetch RIDDOR incident if treatment is flagged
  useEffect(() => {
    if (treatment?.id) {
      fetchRIDDORIncident(treatment.id)
        .then(setRiddorIncident)
        .catch((error) => {
          // Silently fail - not all treatments have RIDDOR incidents
          console.log('No RIDDOR incident for this treatment');
        });
    }
  }, [treatment?.id]);

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
        {/* RIDDOR Flag Indicator - Awaiting Review */}
        {riddorIncident && riddorIncident.medic_confirmed === null && (
          <View style={styles.riddorSection}>
            <View style={styles.riddorHeader}>
              <Text style={styles.riddorBadge}>⚠️ RIDDOR FLAG</Text>
              <Pressable
                style={styles.reviewButton}
                onPress={() => setShowRiddorModal(true)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.reviewButtonText}>Review</Text>
              </Pressable>
            </View>
            <Text style={styles.riddorDetailText}>
              This treatment may be RIDDOR-reportable. Please review and confirm or dismiss.
            </Text>
          </View>
        )}

        {/* RIDDOR Confirmed Badge */}
        {riddorIncident && riddorIncident.medic_confirmed === true && (
          <View style={[styles.riddorSection, styles.riddorConfirmed]}>
            <Text style={styles.riddorBadgeConfirmed}>✓ RIDDOR CONFIRMED</Text>
            <Text style={styles.riddorDetailText}>
              Deadline: {new Date(riddorIncident.deadline_date).toLocaleDateString('en-GB')}
            </Text>
            <Text style={styles.riddorDetailTextSmall}>
              Reason: {riddorIncident.override_reason}
            </Text>
          </View>
        )}

        {/* RIDDOR Dismissed Badge */}
        {riddorIncident && riddorIncident.medic_confirmed === false && (
          <View style={[styles.riddorSection, styles.riddorDismissed]}>
            <Text style={styles.riddorBadgeDismissed}>✗ RIDDOR DISMISSED</Text>
            <Text style={styles.riddorDetailTextSmall}>
              Reason: {riddorIncident.override_reason}
            </Text>
          </View>
        )}

        {/* Patient/Worker Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{patientLabel} Information</Text>
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

      {/* RIDDOR Override Modal */}
      {riddorIncident && (
        <RIDDOROverrideModal
          visible={showRiddorModal}
          onClose={() => setShowRiddorModal(false)}
          incidentId={riddorIncident.id}
          confidenceLevel={riddorIncident.confidence_level}
          detectionReason={`Category: ${riddorIncident.category.replace('_', ' ')}`}
          deadlineDate={riddorIncident.deadline_date}
          medicId={currentUserId}
          onOverrideComplete={async () => {
            // Refresh RIDDOR incident after override
            const updated = await fetchRIDDORIncident(treatment!.id);
            setRiddorIncident(updated);
          }}
        />
      )}
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
  riddorSection: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  riddorConfirmed: {
    backgroundColor: '#FEE2E2',
    borderLeftColor: '#EF4444',
  },
  riddorDismissed: {
    backgroundColor: '#F3F4F6',
    borderLeftColor: '#6B7280',
  },
  riddorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riddorBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  riddorBadgeConfirmed: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 8,
  },
  riddorBadgeDismissed: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  reviewButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  reviewButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  riddorDetailText: {
    fontSize: 14,
    color: '#78350F',
  },
  riddorDetailTextSmall: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
