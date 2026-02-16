import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from '../../src/lib/watermelon';
import Worker from '../../src/database/models/Worker';
import Treatment from '../../src/database/models/Treatment';
import LargeTapButton from '../../components/ui/LargeTapButton';
import StatusBadge from '../../components/ui/StatusBadge';

interface CertificationExpiry {
  type: string;
  expiry: number;
}

/**
 * WorkerProfile - Worker details with treatment history
 *
 * Features:
 * - Worker profile info at top
 * - Certification expiry status (green/amber/red)
 * - Treatment history list (sorted by date descending)
 * - Reachable in 2 taps (WORK-04): Home -> Workers -> Worker Profile
 * - Edit profile button
 */
export default function WorkerProfile({
  workerId,
  onEdit,
  onViewTreatment,
}: {
  workerId: string;
  onEdit?: (workerId: string) => void;
  onViewTreatment?: (treatmentId: string) => void;
}) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkerAndTreatments();
  }, [workerId]);

  const loadWorkerAndTreatments = async () => {
    try {
      const database = getDatabase();

      // Load worker
      const workerRecord = await database.get<Worker>('workers').find(workerId);
      setWorker(workerRecord);

      // Load treatments for this worker (sorted by created_at descending)
      const treatmentRecords = await database
        .get<Treatment>('treatments')
        .query(Q.where('worker_id', workerId), Q.sortBy('created_at', Q.desc))
        .fetch();

      setTreatments(treatmentRecords);
    } catch (error) {
      console.error('Failed to load worker profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get certification expiry status
  const getCertificationStatus = (
    expiryDate: number
  ): 'green' | 'amber' | 'red' | 'grey' => {
    const now = Date.now();
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'red'; // Expired
    if (daysUntilExpiry < 30) return 'amber'; // Expiring soon (<30 days)
    return 'green'; // Valid (>30 days)
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatExpiryDate = (timestamp: number): string => {
    const date = formatDate(timestamp);
    const now = Date.now();
    const daysUntilExpiry = Math.floor((timestamp - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return `${date} (Expired)`;
    if (daysUntilExpiry < 30)
      return `${date} (${daysUntilExpiry} days remaining)`;
    return date;
  };

  const parseCertifications = (
    certificationsJson?: string
  ): CertificationExpiry[] => {
    if (!certificationsJson) return [];
    try {
      return JSON.parse(certificationsJson);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Worker not found</Text>
      </View>
    );
  }

  const certifications = parseCertifications(worker.certifications);

  return (
    <ScrollView style={styles.container}>
      {/* Worker Profile Header */}
      <View style={styles.header}>
        <Text style={styles.name}>
          {worker.firstName} {worker.lastName}
        </Text>
        <Text style={styles.company}>{worker.company}</Text>
        {worker.role && <Text style={styles.role}>{worker.role}</Text>}

        <View style={styles.headerActions}>
          <LargeTapButton
            label="Edit Profile"
            variant="secondary"
            onPress={() => onEdit && onEdit(workerId)}
          />
        </View>
      </View>

      {/* Certifications Section */}
      {(worker.cscsCardNumber || certifications.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications</Text>

          {worker.cscsCardNumber && (
            <View style={styles.certificationRow}>
              <View style={styles.certificationInfo}>
                <Text style={styles.certificationLabel}>CSCS Card</Text>
                <Text style={styles.certificationNumber}>
                  {worker.cscsCardNumber}
                </Text>
                {worker.cscsExpiryDate && (
                  <Text style={styles.certificationExpiry}>
                    Expires: {formatExpiryDate(worker.cscsExpiryDate)}
                  </Text>
                )}
              </View>
              {worker.cscsExpiryDate && (
                <StatusBadge
                  status={getCertificationStatus(worker.cscsExpiryDate)}
                  label={
                    getCertificationStatus(worker.cscsExpiryDate) === 'red'
                      ? 'Expired'
                      : getCertificationStatus(worker.cscsExpiryDate) === 'amber'
                      ? 'Expiring'
                      : 'Valid'
                  }
                  size="small"
                />
              )}
            </View>
          )}

          {certifications.map((cert, index) => (
            <View key={index} style={styles.certificationRow}>
              <View style={styles.certificationInfo}>
                <Text style={styles.certificationLabel}>{cert.type}</Text>
                <Text style={styles.certificationExpiry}>
                  Expires: {formatExpiryDate(cert.expiry)}
                </Text>
              </View>
              <StatusBadge
                status={getCertificationStatus(cert.expiry)}
                label={
                  getCertificationStatus(cert.expiry) === 'red'
                    ? 'Expired'
                    : getCertificationStatus(cert.expiry) === 'amber'
                    ? 'Expiring'
                    : 'Valid'
                }
                size="small"
              />
            </View>
          ))}
        </View>
      )}

      {/* Emergency Contact Section */}
      {worker.emergencyContactName && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <Text style={styles.infoText}>{worker.emergencyContactName}</Text>
          {worker.emergencyContactPhone && (
            <Text style={styles.infoText}>{worker.emergencyContactPhone}</Text>
          )}
          {worker.emergencyContactRelationship && (
            <Text style={styles.infoSubtext}>
              {worker.emergencyContactRelationship}
            </Text>
          )}
        </View>
      )}

      {/* Health Information Section */}
      {(worker.allergies ||
        worker.currentMedications ||
        worker.preExistingConditions ||
        worker.bloodType) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Information</Text>

          {worker.bloodType && (
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Blood Type:</Text>
              <Text style={styles.healthValue}>{worker.bloodType}</Text>
            </View>
          )}

          {worker.allergies && (
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Allergies:</Text>
              <Text style={styles.healthValue}>{worker.allergies}</Text>
            </View>
          )}

          {worker.currentMedications && (
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Current Medications:</Text>
              <Text style={styles.healthValue}>{worker.currentMedications}</Text>
            </View>
          )}

          {worker.preExistingConditions && (
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Pre-existing Conditions:</Text>
              <Text style={styles.healthValue}>
                {worker.preExistingConditions}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Treatment History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Treatment History ({treatments.length})
        </Text>

        {treatments.length === 0 ? (
          <Text style={styles.emptyText}>No treatments recorded</Text>
        ) : (
          <FlatList
            data={treatments}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.treatmentRow}
                onPress={() => onViewTreatment && onViewTreatment(item.id)}
              >
                <View style={styles.treatmentInfo}>
                  <Text style={styles.treatmentDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                  <Text style={styles.treatmentType}>{item.injuryType}</Text>
                  {item.outcome && (
                    <Text style={styles.treatmentOutcome}>
                      Outcome: {item.outcome}
                    </Text>
                  )}
                </View>
                <Text style={styles.treatmentArrow}>›</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  company: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 2,
  },
  role: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  headerActions: {
    marginTop: 12,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  certificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  certificationInfo: {
    flex: 1,
  },
  certificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  certificationNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  certificationExpiry: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  infoText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  healthItem: {
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  treatmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 56,
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  treatmentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  treatmentOutcome: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  treatmentArrow: {
    fontSize: 24,
    color: '#D1D5DB',
    marginLeft: 8,
  },
});
