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
import {
  MotorsportExtraFields,
  INITIAL_MOTORSPORT_FIELDS,
} from '../../services/taxonomy/motorsport-fields';
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

  // Festival (festivals) vertical state — FEST-01, FEST-02
  const [triagePriority, setTriagePriority] = useState<string>('');
  const [showTriagePicker, setShowTriagePicker] = useState(false);
  const [festivalAlcoholSubstanceFlag, setFestivalAlcoholSubstanceFlag] = useState(false);
  const [festivalSafeguardingFlag, setFestivalSafeguardingFlag] = useState(false);
  const [disposition, setDisposition] = useState<string>('');
  const [showDispositionPicker, setShowDispositionPicker] = useState(false);

  // Football (sporting_events) vertical state — states declared before orgVertical derivation,
  // isFootball constant placed after orgVertical below
  const [footballPatientType, setFootballPatientType] = useState<'player' | 'spectator' | null>(null);

  // Player-specific field states
  const [squadNumber, setSquadNumber] = useState<string>('');
  const [phaseOfPlay, setPhaseOfPlay] = useState<string>('');
  const [contactType, setContactType] = useState<string>('');
  const [hiaPerformed, setHiaPerformed] = useState<boolean>(false);
  const [hiaOutcome, setHiaOutcome] = useState<string>('');
  const [faSeverity, setFaSeverity] = useState<string>('');

  // Spectator-specific field states
  const [standLocation, setStandLocation] = useState<string>('');
  const [standRowSeat, setStandRowSeat] = useState<string>('');
  const [referralOutcome, setReferralOutcome] = useState<string>('');
  const [safeguardingFlag, setSafeguardingFlag] = useState<boolean>(false);
  const [safeguardingNotes, setSafeguardingNotes] = useState<string>('');
  const [alcoholInvolvement, setAlcoholInvolvement] = useState<boolean>(false);

  // Booking route params and org vertical — drives mechanism presets, outcome labels, and section headings
  const params = useLocalSearchParams<{ booking_id?: string; event_vertical?: string }>();
  const { primaryVertical } = useOrg();
  const orgVertical = (params.event_vertical as string | undefined) ?? primaryVertical;
  const bookingId = (params.booking_id as string | undefined) ?? null;

  // Derived: football vertical guard (must be after orgVertical declaration)
  const isFootball = orgVertical === 'sporting_events';

  // Motorsport extra fields (MOTO-01, MOTO-02) — only active when orgVertical === 'motorsport'
  const [motorsportFields, setMotorsportFields] = useState<MotorsportExtraFields>(INITIAL_MOTORSPORT_FIELDS);

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

  const TRIAGE_PRIORITIES = [
    { id: 'P1', label: 'P1 — Immediate (Red)' },
    { id: 'P2', label: 'P2 — Urgent (Yellow)' },
    { id: 'P3', label: 'P3 — Delayed (Green)' },
    { id: 'P4', label: 'P4 — Expectant (Black/Blue)' },
  ];

  const FESTIVAL_DISPOSITIONS = [
    { id: 'discharged_on_site', label: 'Discharged on site' },
    { id: 'transferred_to_hospital', label: 'Transferred to hospital' },
    { id: 'refused_treatment', label: 'Refused treatment' },
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

  /**
   * Build the vertical_extra_fields JSON string for the current vertical.
   * Used for both auto-save (formValues) and the completion sync payload.
   */
  const buildVerticalExtraFields = (): string | null => {
    if (orgVertical === 'motorsport') {
      return JSON.stringify(motorsportFields);
    }
    if (orgVertical === 'tv_film') {
      return JSON.stringify({
        production_title: productionTitle,
        patient_role: patientRole,
        sfx_involved: sfxInvolved,
        scene_context: sceneContext,
      });
    }
    if (orgVertical === 'festivals') {
      return JSON.stringify({
        triage_priority: triagePriority,
        alcohol_substance: festivalAlcoholSubstanceFlag,
        safeguarding_concern: festivalSafeguardingFlag,
        disposition,
      });
    }
    if (isFootball && footballPatientType === 'player') {
      return JSON.stringify({
        patient_type: 'player',
        squad_number: squadNumber || null,
        phase_of_play: phaseOfPlay,
        contact_type: contactType,
        hia_performed: hiaPerformed,
        hia_outcome: hiaPerformed ? hiaOutcome : null,
        fa_severity: faSeverity,
      });
    }
    if (isFootball && footballPatientType === 'spectator') {
      return JSON.stringify({
        patient_type: 'spectator',
        stand_location: standLocation,
        stand_row_seat: standRowSeat || null,
        referral_outcome: referralOutcome,
        safeguarding_flag: safeguardingFlag,
        safeguarding_notes: safeguardingFlag ? safeguardingNotes : null,
        alcohol_involvement: alcoholInvolvement,
      });
    }
    return null;
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
    verticalExtraFields: buildVerticalExtraFields(),
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

    // Check if RIDDOR reportable — suppressed for festivals vertical (Purple Guide protocol instead)
    const injuryType = INJURY_TYPES.find((it) => it.id === injuryId);
    if (injuryType?.isRiddorReportable && orgVertical !== 'festivals') {
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

  /**
   * Toggle a boolean field in motorsportFields.
   * Used by the motorsport section toggle Pressables.
   */
  const toggleMotorsportBool = (field: keyof MotorsportExtraFields) => {
    setMotorsportFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
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

    // MOTO-02: Concussion clearance gate — must pass before any other validation
    if (orgVertical === 'motorsport' && motorsportFields.concussion_suspected) {
      const { hia_conducted, competitor_stood_down, cmo_notified } = motorsportFields;
      if (!hia_conducted || !competitor_stood_down || !cmo_notified) {
        Alert.alert(
          'Concussion Clearance Required',
          'When concussion is suspected, you must confirm:\n- HIA conducted\n- Competitor stood down\n- CMO notified\n\nbefore completing this record.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Existing validation
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

    // Football vertical: patient type required
    if (isFootball && !footballPatientType) {
      Alert.alert('Missing Information', 'Please select patient type: Player or Spectator');
      return;
    }
    // Football player: required fields
    if (isFootball && footballPatientType === 'player') {
      if (!phaseOfPlay) { Alert.alert('Missing Information', 'Please select Phase of Play'); return; }
      if (!contactType) { Alert.alert('Missing Information', 'Please select Contact or Non-contact'); return; }
      if (hiaPerformed && !hiaOutcome) { Alert.alert('Missing Information', 'Please select HIA Outcome'); return; }
      if (!faSeverity) { Alert.alert('Missing Information', 'Please select FA Severity Classification'); return; }
    }
    // Football spectator: required fields
    if (isFootball && footballPatientType === 'spectator') {
      if (!standLocation) { Alert.alert('Missing Information', 'Please select Stand / Location'); return; }
      if (!referralOutcome) { Alert.alert('Missing Information', 'Please select Referral Outcome'); return; }
    }

    // Festival-specific validation (FEST-01, FEST-02)
    if (orgVertical === 'festivals') {
      if (!triagePriority) {
        Alert.alert('Missing Information', 'Please select a triage priority (P1-P4)');
        return;
      }
      if (!disposition) {
        Alert.alert('Missing Information', 'Please select attendee disposition');
        return;
      }
    }

    // Build vertical_extra_fields for football
    let verticalExtraFields: Record<string, unknown> | null = null;
    if (isFootball && footballPatientType === 'player') {
      verticalExtraFields = {
        patient_type: 'player',
        squad_number: squadNumber || null,
        phase_of_play: phaseOfPlay,
        contact_type: contactType,
        hia_performed: hiaPerformed,
        hia_outcome: hiaPerformed ? hiaOutcome : null,
        fa_severity: faSeverity,
      };
    } else if (isFootball && footballPatientType === 'spectator') {
      verticalExtraFields = {
        patient_type: 'spectator',
        stand_location: standLocation,
        stand_row_seat: standRowSeat || null,
        referral_outcome: referralOutcome,
        safeguarding_flag: safeguardingFlag,
        safeguarding_notes: safeguardingFlag ? safeguardingNotes : null,
        alcohol_involvement: alcoholInvolvement,
      };
    }

    try {
      if (treatment) {
        const extraFieldsJson = buildVerticalExtraFields();

        await treatment.update((t) => {
          t.status = 'complete';
          t.updatedAt = Date.now();
          t.lastModifiedAt = Date.now();
          t.eventVertical = orgVertical ?? null;
          // Write all vertical extra fields to WatermelonDB record on completion
          if (extraFieldsJson !== null) {
            t.verticalExtraFields = extraFieldsJson;
          } else if (isFootball && verticalExtraFields) {
            // Football uses the separately built verticalExtraFields object
            t.verticalExtraFields = JSON.stringify(verticalExtraFields);
          }
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
            vertical_extra_fields: extraFieldsJson ?? (verticalExtraFields ? JSON.stringify(verticalExtraFields) : treatment.verticalExtraFields ?? null),
            booking_id: treatment.bookingId ?? null,
          },
          treatment.isRiddorReportable ? 0 : 1 // RIDDOR = priority 0 (immediate)
        );

        // MOTO-03: Non-blocking concussion alert for admin visibility
        if (
          orgVertical === 'motorsport' &&
          motorsportFields.concussion_suspected &&
          treatment.bookingId
        ) {
          try {
            const carNum = motorsportFields.competitor_car_number || 'unknown';
            const section = motorsportFields.circuit_section || 'unknown location';
            await supabase.from('medic_alerts').insert({
              medic_id: treatment.medicId,
              booking_id: treatment.bookingId,
              alert_type: 'motorsport_concussion',
              alert_severity: 'high',
              alert_title: 'Motorsport Concussion Suspected',
              alert_message:
                `Concussion suspected for competitor #${carNum} at ${section}. ` +
                `HIA conducted: ${motorsportFields.hia_conducted ? 'Yes' : 'No'}. ` +
                `Competitor stood down: ${motorsportFields.competitor_stood_down ? 'Yes' : 'No'}. ` +
                `CMO notified: ${motorsportFields.cmo_notified ? 'Yes' : 'No'}.`,
              metadata: {
                treatment_id: treatment.id,
                competitor_car_number: motorsportFields.competitor_car_number,
                circuit_section: motorsportFields.circuit_section,
                gcs_score: motorsportFields.gcs_score,
                hia_conducted: motorsportFields.hia_conducted,
                competitor_stood_down: motorsportFields.competitor_stood_down,
                cmo_notified: motorsportFields.cmo_notified,
              },
            });
          } catch (alertError) {
            // Non-blocking — alert failure must not prevent treatment completion
            console.warn('Motorsport concussion alert insert failed (non-blocking):', alertError);
          }
        }

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

        {/* Football: Patient Type Selector */}
        {isFootball && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Type *</Text>
            <Text style={styles.fieldLabel}>Select who you are treating</Text>
            <View style={styles.patientTypeRow}>
              <Pressable
                style={[
                  styles.patientTypeButton,
                  footballPatientType === 'player' && styles.patientTypeButtonSelected,
                ]}
                onPress={() => setFootballPatientType('player')}
              >
                <Text style={[
                  styles.patientTypeText,
                  footballPatientType === 'player' && styles.patientTypeTextSelected,
                ]}>
                  Player
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.patientTypeButton,
                  footballPatientType === 'spectator' && styles.patientTypeButtonSelected,
                ]}
                onPress={() => setFootballPatientType('spectator')}
              >
                <Text style={[
                  styles.patientTypeText,
                  footballPatientType === 'spectator' && styles.patientTypeTextSelected,
                ]}>
                  Spectator
                </Text>
              </Pressable>
            </View>
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

        {/* Football: Player-specific fields */}
        {isFootball && footballPatientType === 'player' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Player Information</Text>

            <Text style={styles.fieldLabel}>Squad Number (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9"
              value={squadNumber}
              onChangeText={setSquadNumber}
              keyboardType="numeric"
              maxLength={3}
            />

            <Text style={styles.fieldLabel}>Phase of Play *</Text>
            <View style={styles.chipRow}>
              {(['In play', 'Set piece', 'Warm-up', 'Half-time', 'Training', 'Post-match'] as const).map((phase) => {
                const val = phase.toLowerCase().replace(/[- ]/g, '_').replace(/'/g, '');
                const isSelected = phaseOfPlay === val;
                return (
                  <Pressable
                    key={val}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setPhaseOfPlay(val)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{phase}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Contact Type *</Text>
            <View style={styles.chipRow}>
              {[{ label: 'Contact', val: 'contact' }, { label: 'Non-contact', val: 'non_contact' }].map(({ label, val }) => {
                const isSelected = contactType === val;
                return (
                  <Pressable
                    key={val}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setContactType(val)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Head Injury Assessment (HIA)</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, !hiaPerformed && styles.chipSelected]}
                onPress={() => { setHiaPerformed(false); setHiaOutcome(''); }}
              >
                <Text style={[styles.chipText, !hiaPerformed && styles.chipTextSelected]}>No HIA</Text>
              </Pressable>
              <Pressable
                style={[styles.chip, hiaPerformed && styles.chipSelected]}
                onPress={() => setHiaPerformed(true)}
              >
                <Text style={[styles.chipText, hiaPerformed && styles.chipTextSelected]}>HIA Conducted</Text>
              </Pressable>
            </View>

            {hiaPerformed && (
              <>
                <Text style={styles.fieldLabel}>HIA Outcome *</Text>
                <View style={styles.chipRow}>
                  {[
                    { label: 'Cleared to return', val: 'hia_assessed_returned' },
                    { label: 'Concussion confirmed — removed', val: 'hia_concussion_confirmed' },
                    { label: 'Referred to hospital', val: 'hia_hospital_referred' },
                  ].map(({ label, val }) => {
                    const isSelected = hiaOutcome === val;
                    return (
                      <Pressable
                        key={val}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setHiaOutcome(val)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.fieldLabel}>FA Severity Classification *</Text>
            <View style={styles.chipRow}>
              {[
                { label: 'Medical attention only', val: 'medical_attention' },
                { label: 'Minor (1–7 days)', val: 'minor' },
                { label: 'Moderate (8–28 days)', val: 'moderate' },
                { label: 'Severe (29–89 days)', val: 'severe' },
                { label: 'Major (90+ days)', val: 'major' },
              ].map(({ label, val }) => {
                const isSelected = faSeverity === val;
                return (
                  <Pressable
                    key={val}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setFaSeverity(val)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Football: Spectator-specific fields */}
        {isFootball && footballPatientType === 'spectator' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spectator Information</Text>

            <Text style={styles.fieldLabel}>Stand / Location *</Text>
            <View style={styles.chipRow}>
              {['North Stand', 'South Stand', 'East Stand', 'West Stand', 'Concourse', 'Car Park', 'Other'].map((loc) => {
                const isSelected = standLocation === loc;
                return (
                  <Pressable
                    key={loc}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setStandLocation(loc)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{loc}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Row / Seat (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Row G, Seat 14"
              value={standRowSeat}
              onChangeText={setStandRowSeat}
            />

            <Text style={styles.fieldLabel}>Referral Outcome *</Text>
            <View style={styles.chipRow}>
              {[
                { label: 'Treated on site', val: 'treated_on_site' },
                { label: 'Referred to hospital', val: 'referred_to_hospital' },
                { label: 'Ambulance conveyed', val: 'ambulance_conveyed' },
                { label: 'Self-discharged', val: 'self_discharged' },
              ].map(({ label, val }) => {
                const isSelected = referralOutcome === val;
                return (
                  <Pressable
                    key={val}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setReferralOutcome(val)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Safeguarding Concern</Text>
              <Pressable
                style={[styles.toggleButton, safeguardingFlag && styles.toggleButtonOn]}
                onPress={() => { setSafeguardingFlag((v) => !v); if (safeguardingFlag) setSafeguardingNotes(''); }}
              >
                <Text style={styles.toggleText}>{safeguardingFlag ? 'Yes' : 'No'}</Text>
              </Pressable>
            </View>

            {safeguardingFlag && (
              <>
                <Text style={styles.fieldLabel}>Safeguarding Notes</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe the safeguarding concern..."
                  value={safeguardingNotes}
                  onChangeText={setSafeguardingNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </>
            )}

            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Alcohol Involvement</Text>
              <Pressable
                style={[styles.toggleButton, alcoholInvolvement && styles.toggleButtonOn]}
                onPress={() => setAlcoholInvolvement((v) => !v)}
              >
                <Text style={styles.toggleText}>{alcoholInvolvement ? 'Yes' : 'No'}</Text>
              </Pressable>
            </View>
          </View>
        )}

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

        {/* Motorsport Details — MOTO-01, MOTO-02 */}
        {orgVertical === 'motorsport' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motorsport Details</Text>

            {/* Competitor identification */}
            <Text style={styles.fieldLabel}>Competitor Car Number</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. 42"
              value={motorsportFields.competitor_car_number}
              onChangeText={(v) =>
                setMotorsportFields((prev) => ({ ...prev, competitor_car_number: v }))
              }
              keyboardType="default"
            />

            <Text style={styles.fieldLabel}>Circuit Section</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Turn 3, Paddock, Pit Lane"
              value={motorsportFields.circuit_section}
              onChangeText={(v) =>
                setMotorsportFields((prev) => ({ ...prev, circuit_section: v }))
              }
            />

            {/* GCS Score */}
            <Text style={styles.fieldLabel}>GCS Score (3-15, leave blank if not assessed)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. 15"
              value={motorsportFields.gcs_score !== null ? String(motorsportFields.gcs_score) : ''}
              onChangeText={(v) => {
                if (v === '') {
                  setMotorsportFields((prev) => ({ ...prev, gcs_score: null }));
                  return;
                }
                const parsed = parseInt(v, 10);
                if (!isNaN(parsed) && parsed >= 3 && parsed <= 15) {
                  setMotorsportFields((prev) => ({ ...prev, gcs_score: parsed }));
                }
              }}
              keyboardType="number-pad"
            />

            {/* Boolean toggles */}
            <Text style={styles.fieldLabel}>Scene Management</Text>

            <Pressable
              style={[
                styles.treatmentTypeButton,
                motorsportFields.extrication_required && styles.motorsportToggleSelected,
              ]}
              onPress={() => toggleMotorsportBool('extrication_required')}
            >
              <Text style={[
                styles.treatmentTypeText,
                motorsportFields.extrication_required && styles.motorsportToggleTextSelected,
              ]}>
                {motorsportFields.extrication_required ? 'Extrication Required — Yes' : 'Extrication Required — No'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.treatmentTypeButton,
                motorsportFields.helmet_removed && styles.motorsportToggleSelected,
              ]}
              onPress={() => toggleMotorsportBool('helmet_removed')}
            >
              <Text style={[
                styles.treatmentTypeText,
                motorsportFields.helmet_removed && styles.motorsportToggleTextSelected,
              ]}>
                {motorsportFields.helmet_removed ? 'Helmet Removed at Scene — Yes' : 'Helmet Removed at Scene — No'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.treatmentTypeButton,
                motorsportFields.clerk_of_course_notified && styles.motorsportToggleSelected,
              ]}
              onPress={() => toggleMotorsportBool('clerk_of_course_notified')}
            >
              <Text style={[
                styles.treatmentTypeText,
                motorsportFields.clerk_of_course_notified && styles.motorsportToggleTextSelected,
              ]}>
                {motorsportFields.clerk_of_course_notified ? 'Clerk of Course Notified — Yes' : 'Clerk of Course Notified — No'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.treatmentTypeButton,
                motorsportFields.concussion_suspected && styles.concussionToggleSelected,
              ]}
              onPress={() => toggleMotorsportBool('concussion_suspected')}
            >
              <Text style={[
                styles.treatmentTypeText,
                motorsportFields.concussion_suspected && styles.concussionToggleTextSelected,
              ]}>
                {motorsportFields.concussion_suspected ? 'Concussion Suspected — YES' : 'Concussion Suspected — No'}
              </Text>
            </Pressable>

            {/* MOTO-02: Concussion clearance panel */}
            {motorsportFields.concussion_suspected && (
              <View style={styles.concussionClearancePanel}>
                <Text style={styles.concussionClearanceTitle}>Concussion Clearance Required</Text>
                <Text style={styles.concussionClearanceSubtitle}>
                  All three items must be confirmed before completing this record
                </Text>

                <Pressable
                  style={[
                    styles.clearanceCheckbox,
                    motorsportFields.hia_conducted && styles.clearanceCheckboxChecked,
                  ]}
                  onPress={() => toggleMotorsportBool('hia_conducted')}
                >
                  <Text style={[
                    styles.clearanceCheckboxText,
                    motorsportFields.hia_conducted && styles.clearanceCheckboxTextChecked,
                  ]}>
                    {motorsportFields.hia_conducted ? '[X] ' : '[ ] '}
                    HIA (Head Injury Assessment) conducted
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.clearanceCheckbox,
                    motorsportFields.competitor_stood_down && styles.clearanceCheckboxChecked,
                  ]}
                  onPress={() => toggleMotorsportBool('competitor_stood_down')}
                >
                  <Text style={[
                    styles.clearanceCheckboxText,
                    motorsportFields.competitor_stood_down && styles.clearanceCheckboxTextChecked,
                  ]}>
                    {motorsportFields.competitor_stood_down ? '[X] ' : '[ ] '}
                    Competitor stood down from event
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.clearanceCheckbox,
                    motorsportFields.cmo_notified && styles.clearanceCheckboxChecked,
                  ]}
                  onPress={() => toggleMotorsportBool('cmo_notified')}
                >
                  <Text style={[
                    styles.clearanceCheckboxText,
                    motorsportFields.cmo_notified && styles.clearanceCheckboxTextChecked,
                  ]}>
                    {motorsportFields.cmo_notified ? '[X] ' : '[ ] '}
                    Chief Medical Officer (CMO) notified
                  </Text>
                </Pressable>
              </View>
            )}
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

        {/* Section 5b: Purple Guide — Event Triage (festivals vertical only) */}
        {orgVertical === 'festivals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5b. Purple Guide — Event Triage</Text>

            {/* Triage Priority */}
            <Text style={styles.fieldLabel}>Triage Priority *</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowTriagePicker(true)}
            >
              <Text style={triagePriority ? styles.pickerButtonText : styles.pickerButtonText}>
                {triagePriority
                  ? TRIAGE_PRIORITIES.find(p => p.id === triagePriority)?.label
                  : 'Select triage priority...'}
              </Text>
            </Pressable>

            {/* Alcohol/Substance Flag */}
            <Text style={styles.fieldLabel}>Alcohol/Substance Involvement</Text>
            <Pressable
              style={[styles.treatmentTypeButton, festivalAlcoholSubstanceFlag && styles.treatmentTypeButtonSelected]}
              onPress={() => setFestivalAlcoholSubstanceFlag(!festivalAlcoholSubstanceFlag)}
            >
              <Text style={[styles.treatmentTypeText, festivalAlcoholSubstanceFlag && styles.treatmentTypeTextSelected]}>
                {festivalAlcoholSubstanceFlag ? 'Yes — Alcohol/Substance Involved' : 'No Alcohol/Substance'}
              </Text>
            </Pressable>

            {/* Safeguarding Flag */}
            <Text style={styles.fieldLabel}>Safeguarding Concern</Text>
            <Pressable
              style={[styles.treatmentTypeButton, festivalSafeguardingFlag && styles.treatmentTypeButtonSelected]}
              onPress={() => setFestivalSafeguardingFlag(!festivalSafeguardingFlag)}
            >
              <Text style={[styles.treatmentTypeText, festivalSafeguardingFlag && styles.treatmentTypeTextSelected]}>
                {festivalSafeguardingFlag ? 'Yes — Safeguarding Concern' : 'No Safeguarding Concern'}
              </Text>
            </Pressable>

            {/* Disposition */}
            <Text style={styles.fieldLabel}>Attendee Disposition *</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={() => setShowDispositionPicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {disposition
                  ? FESTIVAL_DISPOSITIONS.find(d => d.id === disposition)?.label
                  : 'Select disposition...'}
              </Text>
            </Pressable>
          </View>
        )}

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

      {/* Festival: Triage Priority Picker */}
      {orgVertical === 'festivals' && (
        <BottomSheetPicker
          visible={showTriagePicker}
          title="Triage Priority"
          items={TRIAGE_PRIORITIES}
          selectedId={triagePriority}
          onSelect={(item) => {
            setTriagePriority(item.id);
            setShowTriagePicker(false);
          }}
          onClose={() => setShowTriagePicker(false)}
        />
      )}

      {/* Festival: Attendee Disposition Picker */}
      {orgVertical === 'festivals' && (
        <BottomSheetPicker
          visible={showDispositionPicker}
          title="Attendee Disposition"
          items={FESTIVAL_DISPOSITIONS}
          selectedId={disposition}
          onSelect={(item) => {
            setDisposition(item.id);
            setShowDispositionPicker(false);
          }}
          onClose={() => setShowDispositionPicker(false)}
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
  patientTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  patientTypeButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  patientTypeButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  patientTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  patientTypeTextSelected: {
    color: '#2563EB',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonOn: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
  // Motorsport boolean toggles (green when active) — MOTO-01
  motorsportToggleSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  motorsportToggleTextSelected: {
    color: '#065F46',
    fontWeight: '700',
  },
  // Concussion toggle — amber/orange to indicate clinical alert
  concussionToggleSelected: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  concussionToggleTextSelected: {
    color: '#92400E',
    fontWeight: '700',
  },
  // Concussion clearance panel (MOTO-02) — amber warning theme
  concussionClearancePanel: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  concussionClearanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  concussionClearanceSubtitle: {
    fontSize: 13,
    color: '#B45309',
    marginBottom: 4,
  },
  clearanceCheckbox: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#FCD34D',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  clearanceCheckboxChecked: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  clearanceCheckboxText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78350F',
  },
  clearanceCheckboxTextChecked: {
    color: '#78350F',
    fontWeight: '700',
  },
});
