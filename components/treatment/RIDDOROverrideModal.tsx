/**
 * RIDDOR Override Modal
 * Phase 6: RIDDOR Auto-Flagging - Plan 02
 *
 * Modal UI for medics to confirm or dismiss auto-flagged RIDDOR incidents.
 * Displays confidence level, detection reason, deadline countdown, and captures
 * mandatory override reason for compliance tracking and algorithm tuning.
 *
 * Gloves-on usability:
 * - 56pt minimum tap targets on all buttons
 * - High contrast colors for outdoor readability
 * - Clear visual feedback for selected action
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { updateRIDDORIncident, daysUntilDeadline } from '../../src/lib/riddor-client';

interface RIDDOROverrideModalProps {
  visible: boolean;
  onClose: () => void;
  incidentId: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  detectionReason: string;
  deadlineDate: string;
  medicId: string;
  onOverrideComplete: () => void;
}

export default function RIDDOROverrideModal({
  visible,
  onClose,
  incidentId,
  confidenceLevel,
  detectionReason,
  deadlineDate,
  medicId,
  onOverrideComplete,
}: RIDDOROverrideModalProps) {
  const [action, setAction] = useState<'confirm' | 'dismiss' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const daysRemaining = daysUntilDeadline(deadlineDate);

  const handleSubmit = async () => {
    if (!action) {
      Alert.alert('Action Required', 'Please select Confirm or Dismiss');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please explain your decision');
      return;
    }

    setLoading(true);
    try {
      await updateRIDDORIncident(
        incidentId,
        action === 'confirm',
        reason,
        medicId
      );

      Alert.alert(
        'RIDDOR Override Saved',
        action === 'confirm'
          ? 'RIDDOR flag confirmed. Site manager will be notified.'
          : 'RIDDOR flag dismissed. Override recorded for review.'
      );

      onOverrideComplete();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save override. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (action || reason.trim()) {
      Alert.alert(
        'Discard Changes?',
        'Your decision and reason will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setAction(null);
              setReason('');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const confidenceColor = {
    HIGH: '#EF4444', // Red
    MEDIUM: '#F59E0B', // Amber
    LOW: '#6B7280', // Gray
  }[confidenceLevel];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>RIDDOR Flag Detected</Text>

            {/* Confidence indicator */}
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
              <Text style={styles.confidenceText}>{confidenceLevel} CONFIDENCE</Text>
            </View>

            {/* Detection reason */}
            <View style={styles.section}>
              <Text style={styles.label}>Why this was flagged:</Text>
              <Text style={styles.detectionReason}>{detectionReason}</Text>
            </View>

            {/* Deadline warning */}
            <View style={[
              styles.deadlineBox,
              daysRemaining <= 3 && styles.deadlineBoxUrgent
            ]}>
              <Text style={[
                styles.deadlineText,
                daysRemaining <= 3 && styles.deadlineTextUrgent
              ]}>
                {daysRemaining > 0
                  ? `HSE Deadline: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                  : daysRemaining === 0
                  ? 'HSE Deadline: TODAY'
                  : `HSE Deadline: OVERDUE by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.section}>
              <Text style={styles.label}>Do you confirm this is RIDDOR-reportable?</Text>

              <Pressable
                style={[
                  styles.actionButton,
                  action === 'confirm' && styles.actionButtonSelected,
                ]}
                onPress={() => setAction('confirm')}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    action === 'confirm' && styles.actionButtonTextSelected,
                  ]}
                >
                  ✓ Yes, Confirm RIDDOR
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionButton,
                  action === 'dismiss' && styles.actionButtonSelected,
                ]}
                onPress={() => setAction('dismiss')}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    action === 'dismiss' && styles.actionButtonTextSelected,
                  ]}
                >
                  ✗ No, Not RIDDOR
                </Text>
              </Pressable>
            </View>

            {/* Reason input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Explain your decision: <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="E.g., 'Worker returned to full duties immediately' or 'Fracture confirmed by X-ray'"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit/Cancel buttons */}
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={loading}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Decision</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  confidenceBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  confidenceText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  detectionReason: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  deadlineBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  deadlineBoxUrgent: {
    backgroundColor: '#FEE2E2',
    borderLeftColor: '#EF4444',
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  deadlineTextUrgent: {
    color: '#991B1B',
  },
  actionButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    minHeight: 56, // Gloves-on tap target
  },
  actionButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  actionButtonTextSelected: {
    color: '#2563EB',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 56, // Gloves-on tap target
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
