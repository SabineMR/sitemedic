/**
 * Treatment Logging Workflow - New Treatment
 *
 * Full treatment form (TREAT-12) capturing all clinical data:
 * - Worker selection with quick-add
 * - Injury category (RIDDOR + minor)
 * - Body part via tappable picker
 * - Mechanism of injury with presets
 * - Treatment types (multi-select)
 * - Photos (up to 4)
 * - Outcome category
 * - Digital signature
 * - Auto-save every 10 seconds
 *
 * Requirements: TREAT-01 through TREAT-12
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '../../src/lib/watermelon';
import Treatment from '../../src/database/models/Treatment';
import { useAutoSave, AutoSaveIndicator } from '../../components/forms/AutoSaveForm';
import WorkerSearchPicker from '../../components/forms/WorkerSearchPicker';
import BottomSheetPicker from '../../components/ui/BottomSheetPicker';
import LargeTapButton from '../../components/ui/LargeTapButton';
import PhotoCapture from '../../components/forms/PhotoCapture';
import SignaturePad from '../../components/forms/SignaturePad';
import BodyDiagramPicker from '../../components/forms/BodyDiagramPicker';
import { INJURY_TYPES } from '../../services/taxonomy/injury-types';
import { TREATMENT_TYPES } from '../../services/taxonomy/treatment-types';
import { OUTCOME_CATEGORIES } from '../../services/taxonomy/outcome-categories';
import { getMechanismPresets } from '../../services/taxonomy/mechanism-presets';
import { getVerticalOutcomeCategories, getPatientLabel } from '../../services/taxonomy/vertical-outcome-labels';
import { getVerticalCompliance } from '../../services/taxonomy/vertical-compliance';
import { useSync } from '../../src/contexts/SyncContext';
import { useOrg } from '../../src/contexts/OrgContext';
import { photoUploadQueue } from '../../src/services/PhotoUploadQueue';
import { supabase } from '../../src/lib/supabase';

export default function NewTreatmentScreen() {
  // Sync context
  const { enqueueSyncItem } = useSync();

  // Treatment record state
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  // Form field states
  const [workerId, setWorkerId] = useState<string>('');
  const [injuryTypeId, setInjuryTypeId] = useState<string>('');
  const [bodyPartId, setBodyPartId] = useState<string>('');
  const [mechanismOfInjury, setMechanismOfInjury] = useState<string>('');
  const [selectedTreatmentTypes, setSelectedTreatmentTypes] = useState<string[]>([]);
  const [treatmentNotes, setTreatmentNotes] = useState<string>('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [outcomeId, setOutcomeId] = useState<string>('');
  const [signatureUri, setSignatureUri] = useState<string>('');

  // UI state
  const [showBodyPartPicker, setShowBodyPartPicker] = useState(false);
  const [showInjuryPicker, setShowInjuryPicker] = useState(false);
  const [showTreatmentPicker, setShowTreatmentPicker] = useState(false);
  const [showOutcomePicker, setShowOutcomePicker] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [riddorFlagged, setRiddorFlagged] = useState(false);
  const [certValidationError, setCertValidationError] = useState<string | null>(null);

  // Film/TV production fields (FILM-01)
  const [productionTitle, setProductionTitle] = useState<string>('');
  const [patientRole, setPatientRole] = useState<string>('');
  const [sfxInvolved, setSfxInvolved] = useState<boolean>(false);
  const [sceneContext, setSceneContext] = useState<string>('');
  const [showPatientRolePicker, setShowPatientRolePicker] = useState(false);

  // Booking route params and org vertical — drives mechanism presets, outcome labels, and section headings
  const params = useLocalSearchParams<{ booking_id?: string; event_vertical?: string }>();
  const { primaryVertical } = useOrg();
  const orgVertical = (params.event_vertical as string | undefined) ?? primaryVertical;
  const bookingId = (params.booking_id as string | undefined) ?? null;

  const FILM_TV_PATIENT_ROLES = [
    { id: 'cast', label: 'Cast' },
    { id: 'stunt-performer', label: 'Stunt Performer' },
    { id: 'director', label: 'Director' },
    { id: 'camera', label: 'Camera' },
    { id: 'grip', label: 'Grip' },
    { id: 'lighting', label: 'Lighting' },
    { id: 'art-dept', label: 'Art Dept' },
    { id: 'costume', label: 'Costume' },
    { id: 'other-crew', label: 'Other Crew' },
  ];

  // Initialize treatment record on mount
  useEffect(() => {
    initializeTreatment();
  }, []);

  const initializeTreatment = async () => {
    try {
      const database = getDatabase();
      const treatmentsCollection = database.get<Treatment>('treatments');

      // Generate reference number: SITE-YYYYMMDD-NNN
      const refNumber = await generateReferenceNumber();
      setReferenceNumber(refNumber);

      // Create new treatment record
      const newTreatment = await database.write(async () => {
        return await treatmentsCollection.create((t) => {
          t.orgId = 'temp-org'; // TODO: Get from auth context
          t.medicId = 'temp-medic'; // TODO: Get from auth context
          t.referenceNumber = refNumber;
          t.status = 'draft';
          t.injuryType = '';
          t.severity = 'minor'; // Default
          t.isRiddorReportable = false;
          t.photoUris = [];
          t.treatmentTypes = [];
          t.createdAt = Date.now();
          t.updatedAt = Date.now();
          t.lastModifiedAt = Date.now();
          t.eventVertical = orgVertical;
          t.bookingId = bookingId ?? undefined;
        });
      });

      setTreatment(newTreatment);
    } catch (error) {
      console.error('Failed to initialize treatment:', error);
      Alert.alert('Error', 'Failed to create treatment record');
    }
  };

  // Generate sequential reference number: SITE-YYYYMMDD-NNN
  const generateReferenceNumber = async (): Promise<string> => {
    try {
      const database = getDatabase();
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

      // Count today's treatments
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const todayEnd = todayStart + 86400000; // +24 hours

      const todayTreatments = await database
        .get<Treatment>('treatments')
        .query()
        .fetch();

      const todayCount = todayTreatments.filter(
        (t) => t.createdAt >= todayStart && t.createdAt < todayEnd
      ).length;

      const sequenceNumber = String(todayCount + 1).padStart(3, '0');
      return `SITE-${dateStr}-${sequenceNumber}`;
    } catch (error) {
      console.error('Failed to generate reference number:', error);
      return `SITE-${Date.now()}-001`; // Fallback
    }
  };

  // Auto-save form values to treatment record
  const formValues = {
    workerId,
    injuryType: injuryTypeId,
    bodyPart: bodyPartId,
    mechanismOfInjury,
    treatmentTypes: selectedTreatmentTypes,
    treatmentNotes,
    photoUris,
    outcome: outcomeId,
    signatureUri,
    isRiddorReportable: riddorFlagged,
    verticalExtraFields: orgVertical === 'tv_film' ? JSON.stringify({
      production_title: productionTitle,
      patient_role: patientRole,
      sfx_involved: sfxInvolved,
      scene_context: sceneContext,
    }) : null,
  };

  const fieldMapping = {
    workerId: 'worker_id',
    injuryType: 'injury_type',
    bodyPart: 'body_part',
    mechanismOfInjury: 'mechanism_of_injury',
    treatmentTypes: 'treatment_types',
    treatmentNotes: 'treatment_notes',
    photoUris: 'photo_uris',
    outcome: 'outcome',
    signatureUri: 'signature_uri',
    isRiddorReportable: 'is_riddor_reportable',
    verticalExtraFields: 'vertical_extra_fields',
  };

  const { isSaving, lastSaved } = useAutoSave(treatment, formValues, fieldMapping, 10000);

  // Handle injury type selection with RIDDOR detection
  const handleInjuryTypeSelect = (injuryId: string) => {
    setInjuryTypeId(injuryId);
    setShowInjuryPicker(false);

    // Check if RIDDOR reportable
    const injuryType = INJURY_TYPES.find((it) => it.id === injuryId);
    if (injuryType?.isRiddorReportable) {
      setRiddorFlagged(true);
    } else {
      setRiddorFlagged(false);
    }
  };

  // Handle mechanism preset selection
  const handleMechanismPreset = (preset: string) => {
    setMechanismOfInjury(mechanismOfInjury ? `${mechanismOfInjury}; ${preset}` : preset);
  };

  // Handle treatment type toggle (multi-select)
  const handleTreatmentTypeToggle = (treatmentId: string) => {
    setSelectedTreatmentTypes((prev) =>
      prev.includes(treatmentId)
        ? prev.filter((id) => id !== treatmentId)
        : [...prev, treatmentId]
    );
  };

  // Handle signature capture
  const handleSignatureSave = (base64: string) => {
    setSignatureUri(base64);
  };

  // Validate medic certifications before allowing treatment completion
  const validateMedicCertifications = async (): Promise<{ valid: boolean; message?: string; expired_certs?: string[] }> => {
    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Offline or unauthenticated - don't block (offline-first architecture)
        console.warn('No authenticated user, skipping cert validation');
        return { valid: true };
      }

      // Look up medic record by user_id to get medics table id
      const { data: medic, error: medicError } = await supabase
        .from('medics')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (medicError || !medic) {
        // No medic record for this user - skip validation
        console.warn('No medic record found for user, skipping cert validation');
        return { valid: true };
      }

      // Call certification validation API with medic table id
      const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || 'http://localhost:30500';
      const response = await fetch(`${webAppUrl}/api/certifications/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: medic.id }),
      });

      // If 403, certifications are expired
      if (response.status === 403) {
        const errorData = await response.json();
        return {
          valid: false,
          message: errorData.message || 'You have expired certifications',
          expired_certs: errorData.expired_certs || [],
        };
      }

      // If 200, certifications are valid
      if (response.ok) {
        return { valid: true };
      }

      // Other errors (404, 500) - don't block offline-first workflow
      console.warn(`Cert validation returned ${response.status}, allowing treatment`);
      return { valid: true };
    } catch (error) {
      // Network error - don't block offline treatment logging
      console.warn('Cert validation network error, allowing treatment:', error);
      return { valid: true };
    }
  };

  // Complete treatment (mark as complete and navigate)
  const handleCompleteTreatment = async () => {
    // Validate medic certifications FIRST
    const certCheck = await validateMedicCertifications();
    if (!certCheck.valid) {
      setCertValidationError(certCheck.message || 'You have expired certifications');
      Alert.alert(
        'Expired Certifications',
        `You cannot log treatments while you have expired certifications: ${certCheck.expired_certs?.join(', ')}. Please renew your certifications to continue.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setCertValidationError(null);

    // Existing validation
    // Validation
    if (!workerId) {
      Alert.alert('Missing Information', 'Please select a worker');
      return;
    }
    if (!injuryTypeId) {
      Alert.alert('Missing Information', 'Please select an injury type');
      return;
    }
    if (!signatureUri) {
      Alert.alert('Missing Information', 'Please capture a signature');
      return;
    }

    try {
      if (treatment) {
        await treatment.update((t) => {
          t.status = 'complete';
          t.updatedAt = Date.now();
          t.lastModifiedAt = Date.now();
        });

        // Enqueue for sync to backend
        await enqueueSyncItem(
          'create',
          'treatments',
          treatment.id,
          {
            org_id: treatment.orgId,
            worker_id: treatment.workerId,
            medic_id: treatment.medicId,
            reference_number: treatment.referenceNumber,
            status: treatment.status,
            injury_type: treatment.injuryType,
            body_part: treatment.bodyPart,
            mechanism_of_injury: treatment.mechanismOfInjury,
            severity: treatment.severity,
            treatment_types: treatment.treatmentTypes,
            treatment_notes: treatment.treatmentNotes,
            outcome: treatment.outcome,
            is_riddor_reportable: treatment.isRiddorReportable,
            signature_uri: treatment.signatureUri,
            created_at: new Date(treatment.createdAt).toISOString(),
            updated_at: new Date(treatment.updatedAt).toISOString(),
            last_modified_at: treatment.lastModifiedAt,
            event_vertical: treatment.eventVertical ?? null,
            vertical_extra_fields: treatment.verticalExtraFields ?? null,
            booking_id: treatment.bookingId ?? null,
          },
          treatment.isRiddorReportable ? 0 : 1 // RIDDOR = priority 0 (immediate)
        );

        // Queue photos for progressive upload
        if (treatment.photoUris && treatment.photoUris.length > 0) {
          for (let i = 0; i < treatment.photoUris.length; i++) {
            await photoUploadQueue.enqueuePhoto(
              treatment.photoUris[i],
              treatment.id,
              'treatments',
              i
            );
          }
        }

        const compliance = getVerticalCompliance(orgVertical);
        Alert.alert(
          'Treatment Logged',
          compliance.postTreatmentGuidance,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Failed to complete treatment:', error);
      Alert.alert('Error', 'Failed to save treatment');
    }
  };

  // Save draft (just navigate back, already auto-saved)
  const handleSaveDraft = () => {
    router.back();
  };

  // Vertical-aware derived values
  const mechanismPresets = getMechanismPresets(orgVertical);
  const verticalOutcomes = getVerticalOutcomeCategories(OUTCOME_CATEGORIES, orgVertical);
  const patientLabel = getPatientLabel(orgVertical);

  // Get selected labels for display
  const selectedInjuryLabel = INJURY_TYPES.find((it) => it.id === injuryTypeId)?.label || 'Select...';
  const selectedBodyPartLabel = bodyPartId || 'Select...';
  const selectedOutcomeLabel = verticalOutcomes.find((oc) => oc.id === outcomeId)?.label || 'Select...';

  return (
    <View style={styles.container}>
      {/* Header with reference number */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Treatment</Text>
        <Text style={styles.referenceNumber}>{referenceNumber}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Auto-save indicator */}
        <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />

        {/* RIDDOR Warning Banner */}
        {riddorFlagged && (
          <View style={styles.riddorBanner}>
            <Text style={styles.riddorText}>
              ⚠️ This may be RIDDOR reportable. It will be flagged for review.
            </Text>
          </View>
        )}

        {/* Certification Error Banner */}
        {certValidationError && (
          <View style={styles.certErrorBanner}>
            <Text style={styles.certErrorText}>
              {certValidationError}
            </Text>
          </View>
        )}

        {/* Section 1: Patient / Worker / Attendee Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. {patientLabel} Information</Text>
          <WorkerSearchPicker
            onSelect={setWorkerId}
            selectedWorkerId={workerId}
            placeholder={`Search ${patientLabel.toLowerCase()} by name or company`}
          />
        </View>

        {/* Film/TV Production Details — FILM-01 */}
        {orgVertical === 'tv_film' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production Details</Text>

            <Text style={styles.fieldLabel}>Production Title</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. The Crown S8"
              value={productionTitle}
              onChangeText={setProductionTitle}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Patient Role *</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowPatientRolePicker(true)}
            >
              <Text style={styles.pickerButtonText}>{patientRole || 'Select role...'}</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>SFX / Pyrotechnic Involved</Text>
            <Pressable
              style={[styles.pickerButton, sfxInvolved && { borderColor: '#F59E0B', borderWidth: 2 }]}
              onPress={() => setSfxInvolved(!sfxInvolved)}
            >
              <Text style={styles.pickerButtonText}>{sfxInvolved ? 'Yes — SFX/Pyrotechnic involved' : 'No'}</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Scene / Shot Context</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Car chase scene, Stage 4"
              value={sceneContext}
              onChangeText={setSceneContext}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Section 2: Injury Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Injury Details</Text>

          {/* Injury Type */}
          <Text style={styles.fieldLabel}>Injury/Illness Category *</Text>
          <Pressable
            style={styles.pickerButton}
            onPress={() => setShowInjuryPicker(true)}
          >
            <Text style={styles.pickerButtonText}>{selectedInjuryLabel}</Text>
          </Pressable>

          {/* Body Part */}
          <Text style={styles.fieldLabel}>Body Part Affected</Text>
          <Pressable
            style={styles.pickerButton}
            onPress={() => setShowBodyPartPicker(true)}
          >
            <Text style={styles.pickerButtonText}>{selectedBodyPartLabel}</Text>
          </Pressable>

          {/* Mechanism of Injury */}
          <Text style={styles.fieldLabel}>How did the injury occur?</Text>
          <View style={styles.mechanismPresetsContainer}>
            {mechanismPresets.map((preset) => (
              <Pressable
                key={preset}
                style={styles.presetChip}
                onPress={() => handleMechanismPreset(preset)}
              >
                <Text style={styles.presetChipText}>{preset}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Describe mechanism of injury..."
            value={mechanismOfInjury}
            onChangeText={setMechanismOfInjury}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Section 3: Treatment Given */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Treatment Given</Text>

          {/* Treatment Types */}
          <Text style={styles.fieldLabel}>Select all treatments applied</Text>
          <View style={styles.treatmentTypesList}>
            {TREATMENT_TYPES.map((treatmentType) => {
              const isSelected = selectedTreatmentTypes.includes(treatmentType.id);
              return (
                <Pressable
                  key={treatmentType.id}
                  style={[styles.treatmentTypeButton, isSelected && styles.treatmentTypeButtonSelected]}
                  onPress={() => handleTreatmentTypeToggle(treatmentType.id)}
                >
                  <Text style={[styles.treatmentTypeText, isSelected && styles.treatmentTypeTextSelected]}>
                    {isSelected ? '✓ ' : ''}{treatmentType.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Additional Notes */}
          <Text style={styles.fieldLabel}>Additional notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Additional treatment details..."
            value={treatmentNotes}
            onChangeText={setTreatmentNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Section 4: Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Photo Documentation</Text>
          <PhotoCapture
            photoUris={photoUris}
            onPhotosChange={setPhotoUris}
            maxPhotos={4}
          />
        </View>

        {/* Section 5: Outcome */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Outcome</Text>
          <Text style={styles.fieldLabel}>What happened after treatment?</Text>
          <Pressable
            style={styles.pickerButton}
            onPress={() => setShowOutcomePicker(true)}
          >
            <Text style={styles.pickerButtonText}>{selectedOutcomeLabel}</Text>
          </Pressable>
        </View>

        {/* Section 6: Signature */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Signature *</Text>
          {signatureUri ? (
            <View style={styles.signaturePreviewContainer}>
              <Image source={{ uri: signatureUri }} style={styles.signaturePreview} />
              <LargeTapButton
                label="Re-capture Signature"
                variant="secondary"
                onPress={() => setShowSignaturePad(true)}
              />
            </View>
          ) : (
            <LargeTapButton
              label="📝 Capture Signature"
              variant="primary"
              onPress={() => setShowSignaturePad(true)}
            />
          )}
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <LargeTapButton
            label="✓ Complete Treatment"
            variant="primary"
            onPress={handleCompleteTreatment}
          />
          <Pressable onPress={handleSaveDraft} style={styles.saveDraftButton}>
            <Text style={styles.saveDraftText}>Save Draft & Exit</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Sheet Pickers */}
      <BottomSheetPicker
        visible={showInjuryPicker}
        onClose={() => setShowInjuryPicker(false)}
        title="Select Injury Type"
        items={INJURY_TYPES.map((it) => ({ id: it.id, label: it.label }))}
        selectedId={injuryTypeId}
        onSelect={handleInjuryTypeSelect}
      />

      <BottomSheetPicker
        visible={showBodyPartPicker}
        onClose={() => setShowBodyPartPicker(false)}
        title="Select Body Part"
        renderCustomContent={() => (
          <BodyDiagramPicker
            selectedBodyPart={bodyPartId}
            onSelect={(id) => {
              setBodyPartId(id);
              setShowBodyPartPicker(false);
            }}
          />
        )}
      />

      <BottomSheetPicker
        visible={showOutcomePicker}
        onClose={() => setShowOutcomePicker(false)}
        title="Select Outcome"
        items={verticalOutcomes.map((oc) => ({ id: oc.id, label: oc.label }))}
        selectedId={outcomeId}
        onSelect={(id) => {
          setOutcomeId(id);
          setShowOutcomePicker(false);
        }}
      />

      {/* Signature Pad Modal */}
      <SignaturePad
        visible={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSignatureSave}
        title="Patient/Medic Signature"
      />

      {/* Film/TV Patient Role Picker */}
      {orgVertical === 'tv_film' && showPatientRolePicker && (
        <BottomSheetPicker
          visible={showPatientRolePicker}
          title="Patient Role"
          items={FILM_TV_PATIENT_ROLES}
          onSelect={(item) => {
            setPatientRole(item.label);
            setShowPatientRolePicker(false);
          }}
          onClose={() => setShowPatientRolePicker(false)}
        />
      )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  riddorBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  riddorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
  certErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  certErrorText: {
    fontSize: 16,
    fontWeight: '600',
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
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
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
  mechanismPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 16,
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  textArea: {
    minHeight: 80,
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  treatmentTypesList: {
    gap: 8,
  },
  treatmentTypeButton: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  treatmentTypeButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  treatmentTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  treatmentTypeTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  signaturePreviewContainer: {
    gap: 12,
  },
  signaturePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    gap: 16,
    marginTop: 16,
  },
  saveDraftButton: {
    minHeight: 44,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveDraftText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
