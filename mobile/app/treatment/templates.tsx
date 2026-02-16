/**
 * Treatment Templates - Quick Entry Mode
 *
 * Features:
 * - Worker selection first for speed
 * - 8 preset templates for common construction injuries
 * - One-tap creates pre-filled treatment record
 * - Sub-30-second workflow (TREAT-11)
 * - Navigates to treatment/[id] for quick review/confirmation
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { getDatabase } from '../../src/lib/watermelon';
import Treatment from '../../src/database/models/Treatment';
import WorkerSearchPicker from '../../components/forms/WorkerSearchPicker';
import PresetTemplateCard from '../../components/forms/PresetTemplateCard';
import LargeTapButton from '../../components/ui/LargeTapButton';

// Preset template structure
interface PresetTemplate {
  id: string;
  label: string;
  icon: string;
  subtitle: string;
  defaults: {
    injuryType: string;
    treatment: string;
    bodyPart: string;
    outcome: string;
  };
}

/**
 * PRESET_TEMPLATES
 *
 * 8 common construction site minor injuries with auto-fill defaults
 * Uses taxonomy IDs from Plan 01 (kebab-case)
 */
const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'minor-cut',
    label: 'Minor Cut',
    icon: '🩹',
    subtitle: 'Small laceration, cleaned and dressed',
    defaults: {
      injuryType: 'laceration',
      treatment: 'cleaned-dressed',
      bodyPart: 'wrist-hand',
      outcome: 'returned-to-work-same-duties',
    },
  },
  {
    id: 'bruise',
    label: 'Bruise',
    icon: '💢',
    subtitle: 'Contusion, ice pack applied',
    defaults: {
      injuryType: 'contusion',
      treatment: 'ice-pack',
      bodyPart: 'arm-elbow',
      outcome: 'returned-to-work-same-duties',
    },
  },
  {
    id: 'headache',
    label: 'Headache',
    icon: '🤕',
    subtitle: 'Rest in welfare area',
    defaults: {
      injuryType: 'headache',
      treatment: 'rest-welfare',
      bodyPart: 'head-face',
      outcome: 'returned-to-work-same-duties',
    },
  },
  {
    id: 'splinter',
    label: 'Splinter',
    icon: '🪵',
    subtitle: 'Foreign body removed from finger',
    defaults: {
      injuryType: 'splinter',
      treatment: 'removed-foreign-body',
      bodyPart: 'finger-thumb',
      outcome: 'returned-to-work-same-duties',
    },
  },
  {
    id: 'eye-irritation',
    label: 'Eye Irritation',
    icon: '👁️',
    subtitle: 'Foreign body in eye, eye wash applied',
    defaults: {
      injuryType: 'foreign-body-eye',
      treatment: 'eye-wash',
      bodyPart: 'eye',
      outcome: 'returned-to-work-same-duties',
    },
  },
  {
    id: 'sprain-strain',
    label: 'Sprain/Strain',
    icon: '🦴',
    subtitle: 'Ankle/foot sprain, ice pack applied',
    defaults: {
      injuryType: 'sprain-strain',
      treatment: 'ice-pack',
      bodyPart: 'ankle-foot',
      outcome: 'returned-to-work-light-duties',
    },
  },
  {
    id: 'minor-burn',
    label: 'Minor Burn',
    icon: '🔥',
    subtitle: 'Small burn, cleaned and dressed',
    defaults: {
      injuryType: 'minor-burn',
      treatment: 'cleaned-dressed',
      bodyPart: 'wrist-hand',
      outcome: 'returned-to-work-same-duties',
    },
  },
  {
    id: 'nausea-dizziness',
    label: 'Nausea/Dizziness',
    icon: '😵',
    subtitle: 'Rest in welfare, monitored',
    defaults: {
      injuryType: 'nausea-dizziness',
      treatment: 'rest-welfare',
      bodyPart: 'head-face',
      outcome: 'returned-to-work-same-duties',
    },
  },
];

export default function TreatmentTemplatesScreen() {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  /**
   * Generate sequential reference number: SITE-YYYYMMDD-NNN
   */
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
   * Handle template selection
   * - Creates new Treatment record with preset defaults
   * - Navigates to treatment/[id] for quick review
   */
  const handleTemplateSelect = async (template: PresetTemplate) => {
    // Validate worker selected
    if (!selectedWorkerId) {
      Alert.alert('Select Worker First', 'Please select a worker before choosing a template');
      return;
    }

    try {
      const database = getDatabase();
      const treatmentsCollection = database.get<Treatment>('treatments');

      // Generate reference number
      const refNumber = await generateReferenceNumber();

      // Create new treatment with preset defaults
      const newTreatment = await database.write(async () => {
        return await treatmentsCollection.create((t) => {
          t.orgId = 'temp-org'; // TODO: Get from auth context
          t.medicId = 'temp-medic'; // TODO: Get from auth context
          t.workerId = selectedWorkerId;
          t.referenceNumber = refNumber;
          t.status = 'draft';

          // Apply preset defaults
          t.injuryType = template.defaults.injuryType;
          t.bodyPart = template.defaults.bodyPart;
          t.outcome = template.defaults.outcome;
          t.treatmentTypes = [template.defaults.treatment]; // Single treatment as array

          // Auto-detect RIDDOR (will be false for all presets - they're all minor)
          t.isRiddorReportable = false;
          t.severity = 'minor';

          // Initialize empty fields
          t.mechanismOfInjury = '';
          t.treatmentNotes = '';
          t.photoUris = [];
          t.signatureUri = '';

          // Timestamps
          t.createdAt = Date.now();
          t.updatedAt = Date.now();
          t.lastModifiedAt = Date.now();
        });
      });

      // Navigate to treatment form for quick review/confirmation
      router.push(`/treatment/${newTreatment.id}`);
    } catch (error) {
      console.error('Failed to create treatment from template:', error);
      Alert.alert('Error', 'Failed to create treatment record');
    }
  };

  /**
   * Navigate to full treatment form (non-template)
   */
  const handleFullTreatment = () => {
    router.push('/treatment/new');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quick Treatment Log</Text>
        <Text style={styles.headerSubtitle}>
          Select a worker, then tap a template for instant logging
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Worker Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Worker</Text>
          <WorkerSearchPicker
            onSelect={setSelectedWorkerId}
            selectedWorkerId={selectedWorkerId}
            placeholder="Search worker by name or company"
          />
        </View>

        {/* Step 2: Template Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Select Treatment Template</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a common injury type (all fields auto-filled)
          </Text>

          <View style={styles.templatesGrid}>
            {PRESET_TEMPLATES.map((template) => (
              <PresetTemplateCard
                key={template.id}
                label={template.label}
                icon={template.icon}
                subtitle={template.subtitle}
                onPress={() => handleTemplateSelect(template)}
              />
            ))}
          </View>
        </View>

        {/* Alternative: Full Treatment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need more detail?</Text>
          <LargeTapButton
            label="📋 Full Treatment Form"
            variant="secondary"
            onPress={handleFullTreatment}
          />
          <Text style={styles.helpText}>
            Use the full form for complex injuries, RIDDOR cases, or when you need all fields.
          </Text>
        </View>
      </ScrollView>
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
  headerSubtitle: {
    fontSize: 14,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  templatesGrid: {
    gap: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
