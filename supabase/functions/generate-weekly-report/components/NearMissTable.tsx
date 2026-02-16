/**
 * Near-Miss Incidents Table Component
 * Phase 5: PDF Generation - Plan 01
 */

import { View, Text } from 'npm:@react-pdf/renderer@4.3.2';
import { styles } from '../styles.ts';
import type { NearMissRow } from '../types.ts';

interface NearMissTableProps {
  nearMisses: NearMissRow[];
}

// Map severity to style
function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'low':
      return styles.severityMinor;
    case 'medium':
      return styles.severityModerate;
    case 'high':
      return styles.severityMajor;
    case 'critical':
      return styles.severityCritical;
    default:
      return {};
  }
}

export function NearMissTable({ nearMisses }: NearMissTableProps) {
  const count = nearMisses.length;
  const isTruncated = count >= 50; // Max 50 per queries.ts

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Near-Miss Incidents ({count})</Text>

      {count === 0 ? (
        <Text style={styles.emptyState}>No near-miss incidents recorded this week.</Text>
      ) : (
        <>
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellNarrow}>Date</Text>
              <Text style={styles.tableCellHeader}>Category</Text>
              <Text style={styles.tableCellNarrow}>Severity</Text>
              <Text style={styles.tableCellWide}>Description</Text>
              <Text style={styles.tableCellWide}>Corrective Action</Text>
            </View>

            {/* Table rows */}
            {nearMisses.map((nearMiss, index) => (
              <View
                key={index}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                wrap={false} // Prevent mid-row page breaks
              >
                <Text style={styles.tableCellNarrow}>{nearMiss.date}</Text>
                <Text style={styles.tableCell}>{nearMiss.category}</Text>
                <Text style={[styles.tableCellNarrow, getSeverityStyle(nearMiss.severity)]}>
                  {nearMiss.severity}
                </Text>
                <Text style={styles.tableCellWide}>{nearMiss.description}</Text>
                <Text style={styles.tableCellWide}>{nearMiss.correctiveAction}</Text>
              </View>
            ))}
          </View>

          {isTruncated && (
            <Text style={styles.noteText}>
              Showing first 50 near-miss incidents. Full data available in dashboard.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
