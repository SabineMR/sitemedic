/**
 * Daily Safety Checks Section Component
 * Phase 5: PDF Generation - Plan 01
 */

import { View, Text } from 'npm:@react-pdf/renderer@4.3.2';
import { styles, COLORS } from '../styles.ts';
import type { SafetyCheckRow } from '../types.ts';

interface SafetyChecksSectionProps {
  safetyChecks: SafetyCheckRow[];
  dailyChecksCompleted: number;
  dailyChecksRequired: number;
}

// Map status to style and text
function getStatusStyle(status: string) {
  switch (status) {
    case 'pass':
      return { color: COLORS.success };
    case 'fail':
      return { color: COLORS.danger };
    case 'partial':
      return { color: COLORS.warning };
    default:
      return {};
  }
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function SafetyChecksSection({
  safetyChecks,
  dailyChecksCompleted,
  dailyChecksRequired,
}: SafetyChecksSectionProps) {
  const completionRate = dailyChecksRequired > 0
    ? Math.round((dailyChecksCompleted / dailyChecksRequired) * 100)
    : 0;

  // Determine completion color
  let completionColor = COLORS.danger; // <50%
  if (completionRate >= 80) completionColor = COLORS.success;
  else if (completionRate >= 50) completionColor = COLORS.warning;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Daily Safety Checks</Text>

      {/* Summary line */}
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.complianceItem}>
          {dailyChecksCompleted}/{dailyChecksRequired} checks completed this week
        </Text>
        <Text style={[styles.complianceItem, { color: completionColor }]}>
          Completion Rate: {completionRate}%
        </Text>
      </View>

      {/* Checks table */}
      {safetyChecks.length === 0 ? (
        <Text style={styles.emptyState}>No safety checks recorded this week.</Text>
      ) : (
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellNarrow}>Date</Text>
            <Text style={styles.tableCellNarrow}>Status</Text>
            <Text style={styles.tableCellNarrow}>Pass</Text>
            <Text style={styles.tableCellNarrow}>Fail</Text>
            <Text style={styles.tableCellNarrow}>Items</Text>
          </View>

          {/* Table rows */}
          {safetyChecks.map((check, index) => (
            <View
              key={index}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              wrap={false}
            >
              <Text style={styles.tableCellNarrow}>{check.date}</Text>
              <Text style={[styles.tableCellNarrow, getStatusStyle(check.overallStatus)]}>
                {formatStatus(check.overallStatus)}
              </Text>
              <Text style={styles.tableCellNarrow}>{check.passCount}</Text>
              <Text style={styles.tableCellNarrow}>{check.failCount}</Text>
              <Text style={styles.tableCellNarrow}>{check.totalItems}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
