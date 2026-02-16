/**
 * Treatment Log Table Component
 * Phase 5: PDF Generation - Plan 01
 */

import { View, Text } from 'npm:@react-pdf/renderer@4.3.2';
import { styles } from '../styles.ts';
import type { TreatmentRow } from '../types.ts';

interface TreatmentTableProps {
  treatments: TreatmentRow[];
}

// Map severity to style
function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'minor':
      return styles.severityMinor;
    case 'moderate':
      return styles.severityModerate;
    case 'major':
      return styles.severityMajor;
    case 'critical':
      return styles.severityCritical;
    default:
      return {};
  }
}

// Format outcome text
function formatOutcome(outcome: string): string {
  switch (outcome) {
    case 'returned_to_work':
      return 'Returned to Work';
    case 'sent_home':
      return 'Sent Home';
    case 'hospital_referral':
      return 'Hospital Referral';
    case 'ambulance_called':
      return 'Ambulance Called';
    default:
      return outcome;
  }
}

export function TreatmentTable({ treatments }: TreatmentTableProps) {
  const count = treatments.length;
  const isTruncated = count >= 50; // Max 50 per queries.ts

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Treatment Log ({count})</Text>

      {count === 0 ? (
        <Text style={styles.emptyState}>No treatments recorded this week.</Text>
      ) : (
        <>
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellNarrow}>Date</Text>
              <Text style={styles.tableCellHeader}>Worker</Text>
              <Text style={styles.tableCellHeader}>Injury Type</Text>
              <Text style={styles.tableCellHeader}>Body Part</Text>
              <Text style={styles.tableCellNarrow}>Severity</Text>
              <Text style={styles.tableCellHeader}>Outcome</Text>
              <Text style={styles.tableCellNarrow}>RIDDOR</Text>
            </View>

            {/* Table rows */}
            {treatments.map((treatment, index) => (
              <View
                key={index}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                wrap={false} // Prevent mid-row page breaks
              >
                <Text style={styles.tableCellNarrow}>{treatment.date}</Text>
                <Text style={styles.tableCell}>{treatment.workerName}</Text>
                <Text style={styles.tableCell}>{treatment.injuryType}</Text>
                <Text style={styles.tableCell}>{treatment.bodyPart}</Text>
                <Text style={[styles.tableCellNarrow, getSeverityStyle(treatment.severity)]}>
                  {treatment.severity}
                </Text>
                <Text style={styles.tableCell}>{formatOutcome(treatment.outcome)}</Text>
                <Text style={[styles.tableCellNarrow, treatment.isRiddor ? styles.riddorYes : styles.riddorNo]}>
                  {treatment.isRiddor ? 'YES' : '-'}
                </Text>
              </View>
            ))}
          </View>

          {isTruncated && (
            <Text style={styles.noteText}>
              Showing first 50 treatments. Full data available in dashboard.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
