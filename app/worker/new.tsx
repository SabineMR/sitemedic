import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { getDatabase } from '../../src/lib/watermelon';
import Worker from '../../src/database/models/Worker';
import LargeTapButton from '../../components/ui/LargeTapButton';
import BottomSheetPicker from '../../components/ui/BottomSheetPicker';
import { useSync } from '../../src/contexts/SyncContext';

interface WorkerInductionFormData {
  // Basic Info
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  cscsCardNumber?: string;
  cscsExpiryDate?: number;
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  // Health Info
  allergies?: string;
  currentMedications?: string;
  preExistingConditions?: string;
  bloodType?: string;
  // Certifications
  certifications?: Array<{ type: string; expiry: number }>;
}

const BLOOD_TYPES = [
  { id: 'a-positive', label: 'A+' },
  { id: 'a-negative', label: 'A-' },
  { id: 'b-positive', label: 'B+' },
  { id: 'b-negative', label: 'B-' },
  { id: 'ab-positive', label: 'AB+' },
  { id: 'ab-negative', label: 'AB-' },
  { id: 'o-positive', label: 'O+' },
  { id: 'o-negative', label: 'O-' },
  { id: 'unknown', label: 'Unknown' },
];

const RELATIONSHIP_TYPES = [
  { id: 'spouse', label: 'Spouse' },
  { id: 'partner', label: 'Partner' },
  { id: 'parent', label: 'Parent' },
  { id: 'child', label: 'Child' },
  { id: 'sibling', label: 'Sibling' },
  { id: 'friend', label: 'Friend' },
  { id: 'other', label: 'Other' },
];

/**
 * WorkerInductionForm - Full site induction form with health screening
 *
 * Features:
 * - Collapsible sections for speed
 * - Auto-save on field change (debounced 500ms)
 * - All WORK-02 required fields
 * - Gloves-on design (56pt inputs, 18px font)
 * - react-hook-form for state management
 */
export default function WorkerInductionForm({
  workerId,
  onComplete,
}: {
  workerId?: string;
  onComplete?: () => void;
}) {
  const { enqueueSyncItem } = useSync();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [showBloodTypePicker, setShowBloodTypePicker] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [sectionExpanded, setSectionExpanded] = useState({
    basic: true,
    emergency: true,
    health: true,
    certifications: true,
  });

  const { control, watch, setValue, reset } = useForm<WorkerInductionFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      company: '',
      role: '',
      allergies: '',
      currentMedications: '',
      preExistingConditions: '',
      certifications: [],
    },
  });

  const formValues = watch();

  // Load existing worker if editing
  useEffect(() => {
    if (workerId) {
      loadWorker(workerId);
    } else {
      createDraftWorker();
    }
  }, [workerId]);

  const loadWorker = async (id: string) => {
    try {
      const database = getDatabase();
      const existingWorker = await database.get<Worker>('workers').find(id);
      setWorker(existingWorker);

      // Populate form with existing data
      reset({
        firstName: existingWorker.firstName,
        lastName: existingWorker.lastName,
        company: existingWorker.company,
        role: existingWorker.role || '',
        cscsCardNumber: existingWorker.cscsCardNumber || '',
        emergencyContactName: existingWorker.emergencyContactName || '',
        emergencyContactPhone: existingWorker.emergencyContactPhone || '',
        emergencyContactRelationship:
          existingWorker.emergencyContactRelationship || '',
        allergies: existingWorker.allergies || '',
        currentMedications: existingWorker.currentMedications || '',
        preExistingConditions: existingWorker.preExistingConditions || '',
        bloodType: existingWorker.bloodType || '',
        certifications: existingWorker.certifications
          ? JSON.parse(existingWorker.certifications)
          : [],
      });
    } catch (error) {
      console.error('Failed to load worker:', error);
    }
  };

  const createDraftWorker = async () => {
    try {
      const database = getDatabase();
      const newWorker = await database.write(async () => {
        return await database.get<Worker>('workers').create((w) => {
          w.firstName = '';
          w.lastName = '';
          w.company = '';
          w.role = '';
          w.consentGiven = false;
          w.isIncomplete = true;
          w.orgId = 'temp-org'; // TODO: Get from auth context
          w.createdAt = Date.now();
          w.updatedAt = Date.now();
          w.lastModifiedAt = Date.now();
        });
      });
      setWorker(newWorker);
    } catch (error) {
      console.error('Failed to create draft worker:', error);
    }
  };

  // Auto-save on field change (debounced 500ms)
  useEffect(() => {
    if (!worker) return;

    const timer = setTimeout(async () => {
      try {
        await worker.update((w) => {
          w.firstName = formValues.firstName || '';
          w.lastName = formValues.lastName || '';
          w.company = formValues.company || '';
          w.role = formValues.role || '';
          w.cscsCardNumber = formValues.cscsCardNumber;
          w.cscsExpiryDate = formValues.cscsExpiryDate;
          w.emergencyContactName = formValues.emergencyContactName;
          w.emergencyContactPhone = formValues.emergencyContactPhone;
          w.emergencyContactRelationship = formValues.emergencyContactRelationship;
          w.allergies = formValues.allergies;
          w.currentMedications = formValues.currentMedications;
          w.preExistingConditions = formValues.preExistingConditions;
          w.bloodType = formValues.bloodType;
          w.certifications = formValues.certifications
            ? JSON.stringify(formValues.certifications)
            : undefined;
          w.updatedAt = Date.now();
          w.lastModifiedAt = Date.now();
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formValues, worker]);

  const handleComplete = async () => {
    if (!worker) return;

    // Validate required fields
    if (!formValues.firstName || !formValues.lastName || !formValues.company) {
      alert('Please fill in all required fields: Name and Company');
      return;
    }

    try {
      const isNew = worker.isIncomplete;

      await worker.update((w) => {
        w.isIncomplete = false;
        w.consentGiven = true;
        w.consentDate = Date.now();
      });

      // Enqueue for sync to backend
      await enqueueSyncItem(
        isNew ? 'create' : 'update',
        'workers',
        worker.id,
        {
          org_id: worker.orgId,
          first_name: worker.firstName,
          last_name: worker.lastName,
          company: worker.company,
          role: worker.role,
          phone: worker.phone,
          emergency_contact_name: worker.emergencyContactName,
          emergency_contact_phone: worker.emergencyContactPhone,
          health_notes: worker.healthNotes,
          consent_given: worker.consentGiven,
          consent_date: worker.consentDate ? new Date(worker.consentDate).toISOString() : null,
          created_at: new Date(worker.createdAt).toISOString(),
          updated_at: new Date(worker.updatedAt).toISOString(),
          last_modified_at: worker.lastModifiedAt,
        },
        1 // Normal priority
      );

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to complete induction:', error);
    }
  };

  const toggleSection = (section: keyof typeof sectionExpanded) => {
    setSectionExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!worker) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Worker - Site Induction</Text>
        <Text style={styles.subtitle}>All fields auto-save</Text>
      </View>

      {/* Section 1: Basic Info */}
      <View style={styles.section}>
        <Pressable
          onPress={() => toggleSection('basic')}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>
            1. Basic Info {sectionExpanded.basic ? '▼' : '▶'}
          </Text>
        </Pressable>

        {sectionExpanded.basic && (
          <View style={styles.sectionContent}>
            <Text style={styles.label}>
              First Name <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="First name"
                  autoCapitalize="words"
                />
              )}
            />

            <Text style={styles.label}>
              Last Name <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Last name"
                  autoCapitalize="words"
                />
              )}
            />

            <Text style={styles.label}>
              Company <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="company"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Company name"
                  autoCapitalize="words"
                />
              )}
            />

            <Text style={styles.label}>Role/Trade</Text>
            <Controller
              control={control}
              name="role"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g., Electrician, Carpenter"
                  autoCapitalize="words"
                />
              )}
            />

            <Text style={styles.label}>CSCS Card Number</Text>
            <Controller
              control={control}
              name="cscsCardNumber"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="CSCS card number"
                  autoCapitalize="characters"
                />
              )}
            />
          </View>
        )}
      </View>

      {/* Section 2: Emergency Contact */}
      <View style={styles.section}>
        <Pressable
          onPress={() => toggleSection('emergency')}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>
            2. Emergency Contact {sectionExpanded.emergency ? '▼' : '▶'}
          </Text>
        </Pressable>

        {sectionExpanded.emergency && (
          <View style={styles.sectionContent}>
            <Text style={styles.label}>Contact Name</Text>
            <Controller
              control={control}
              name="emergencyContactName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Emergency contact name"
                  autoCapitalize="words"
                />
              )}
            />

            <Text style={styles.label}>Contact Phone</Text>
            <Controller
              control={control}
              name="emergencyContactPhone"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              )}
            />

            <Text style={styles.label}>Relationship</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowRelationshipPicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {formValues.emergencyContactRelationship
                  ? RELATIONSHIP_TYPES.find(
                      (r) => r.id === formValues.emergencyContactRelationship
                    )?.label
                  : 'Select relationship'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Section 3: Health Info */}
      <View style={styles.section}>
        <Pressable
          onPress={() => toggleSection('health')}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>
            3. Health Information {sectionExpanded.health ? '▼' : '▶'}
          </Text>
        </Pressable>

        {sectionExpanded.health && (
          <View style={styles.sectionContent}>
            <Text style={styles.label}>Allergies</Text>
            <Controller
              control={control}
              name="allergies"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Any known allergies"
                  multiline
                  numberOfLines={3}
                />
              )}
            />

            <Text style={styles.label}>Current Medications</Text>
            <Controller
              control={control}
              name="currentMedications"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Current medications"
                  multiline
                  numberOfLines={3}
                />
              )}
            />

            <Text style={styles.label}>Pre-existing Conditions</Text>
            <Controller
              control={control}
              name="preExistingConditions"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder="Any pre-existing medical conditions"
                  multiline
                  numberOfLines={3}
                />
              )}
            />

            <Text style={styles.label}>Blood Type</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowBloodTypePicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {formValues.bloodType
                  ? BLOOD_TYPES.find((b) => b.id === formValues.bloodType)?.label
                  : 'Select blood type'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Save Button */}
      <View style={styles.footer}>
        <LargeTapButton
          label="Save & Complete Induction"
          variant="primary"
          onPress={handleComplete}
        />
      </View>

      {/* Blood Type Picker Modal */}
      <BottomSheetPicker
        visible={showBloodTypePicker}
        onClose={() => setShowBloodTypePicker(false)}
        title="Select Blood Type"
        items={BLOOD_TYPES}
        selectedId={formValues.bloodType}
        onSelect={(id) => {
          setValue('bloodType', id);
          setShowBloodTypePicker(false);
        }}
      />

      {/* Relationship Picker Modal */}
      <BottomSheetPicker
        visible={showRelationshipPicker}
        onClose={() => setShowRelationshipPicker(false)}
        title="Select Relationship"
        items={RELATIONSHIP_TYPES}
        selectedId={formValues.emergencyContactRelationship}
        onSelect={(id) => {
          setValue('emergencyContactRelationship', id);
          setShowRelationshipPicker(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    minHeight: 56,
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 18,
    color: '#1F2937',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
});
