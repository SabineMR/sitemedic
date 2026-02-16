import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { getDatabase } from '../../../src/lib/watermelon';
import Worker from '../../../src/database/models/Worker';
import LargeTapButton from '../../components/ui/LargeTapButton';

/**
 * WorkerQuickAdd - Minimal quick-add modal
 *
 * Features:
 * - Name (required), Company (required), Role (optional)
 * - Pre-fills name from search query if available
 * - Creates worker with isIncomplete: true
 * - Returns worker ID to caller
 * - Large 56pt buttons for gloves-on use
 */
export default function WorkerQuickAdd({
  initialName,
  onComplete,
  onCancel,
}: {
  initialName?: string;
  onComplete?: (workerId: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName || '');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddWorker = async () => {
    // Validate required fields
    if (!name.trim() || !company.trim()) {
      alert('Please enter both name and company');
      return;
    }

    setIsSubmitting(true);

    try {
      const database = getDatabase();

      // Split name into first/last (simple heuristic)
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      const newWorker = await database.write(async () => {
        return await database.get<Worker>('workers').create((worker) => {
          worker.firstName = firstName;
          worker.lastName = lastName;
          worker.company = company.trim();
          worker.role = role.trim() || 'Worker';
          worker.consentGiven = false;
          worker.isIncomplete = true; // Mark for follow-up full induction
          worker.orgId = 'temp-org'; // TODO: Get from auth context
          worker.createdAt = Date.now();
          worker.updatedAt = Date.now();
          worker.lastModifiedAt = Date.now();
        });
      });

      if (onComplete) {
        onComplete(newWorker.id);
      }
    } catch (error) {
      console.error('Failed to create worker:', error);
      alert('Failed to add worker. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Quick Add Worker</Text>
        <Text style={styles.subtitle}>
          Add basic details now. Complete full induction later.
        </Text>

        <Text style={styles.label}>
          Full Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., John Smith"
          autoCapitalize="words"
          autoFocus
        />

        <Text style={styles.label}>
          Company <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={company}
          onChangeText={setCompany}
          placeholder="Company name"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Role/Trade (Optional)</Text>
        <TextInput
          style={styles.input}
          value={role}
          onChangeText={setRole}
          placeholder="e.g., Electrician"
          autoCapitalize="words"
        />

        <View style={styles.actions}>
          <LargeTapButton
            label="Add Worker"
            variant="primary"
            onPress={handleAddWorker}
            disabled={isSubmitting || !name.trim() || !company.trim()}
          />

          {onCancel && (
            <LargeTapButton
              label="Cancel"
              variant="secondary"
              onPress={onCancel}
              disabled={isSubmitting}
            />
          )}
        </View>

        <Text style={styles.note}>
          ⚠️ This worker will be marked as incomplete. Remember to complete the
          full induction with health screening details later.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
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
  actions: {
    marginTop: 32,
    gap: 8,
  },
  note: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
});
