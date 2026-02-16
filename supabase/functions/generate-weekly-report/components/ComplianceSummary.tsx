/**
 * Compliance Summary Component
 * Phase 5: PDF Generation - Plan 01
 */

import { View, Text } from 'npm:@react-pdf/renderer@4.3.2';
import { styles } from '../styles.ts';
import type { ComplianceScore, WeeklyStats } from '../types.ts';

interface ComplianceSummaryProps {
  complianceScore: ComplianceScore;
  weeklyStats: WeeklyStats;
}

export function ComplianceSummary({ complianceScore, weeklyStats }: ComplianceSummaryProps) {
  const { status, dailyCheckDone, overdueFollowups, expiredCerts, riddorDeadlines } = complianceScore;

  // Get compliance circle style based on status
  const circleStyle = [
    styles.complianceCircle,
    status === 'green' && styles.complianceGreen,
    status === 'amber' && styles.complianceAmber,
    status === 'red' && styles.complianceRed,
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Compliance Summary</Text>

      {/* Traffic light indicator */}
      <View style={styles.complianceContainer}>
        <View style={circleStyle} />
        <Text style={styles.complianceText}>
          Overall Status: {status.toUpperCase()}
        </Text>
      </View>

      {/* Breakdown items */}
      <View style={styles.complianceBreakdown}>
        <Text style={styles.complianceItem}>
          {dailyCheckDone ? '✓' : '✗'} Daily Safety Check: {dailyCheckDone ? 'Completed' : 'Not Completed'}
        </Text>
        {overdueFollowups > 0 && (
          <Text style={styles.complianceItem}>
            ⚠ Overdue Follow-ups: {overdueFollowups}
          </Text>
        )}
        {expiredCerts > 0 && (
          <Text style={styles.complianceItem}>
            ⚠ Expired Certifications: {expiredCerts}
          </Text>
        )}
        {riddorDeadlines > 0 && (
          <Text style={styles.complianceItem}>
            ⚠ RIDDOR Deadlines: {riddorDeadlines}
          </Text>
        )}
      </View>

      {/* Weekly stats summary */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weeklyStats.treatmentCount}</Text>
          <Text style={styles.statLabel}>Treatments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weeklyStats.nearMissCount}</Text>
          <Text style={styles.statLabel}>Near-Misses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weeklyStats.workersOnSite}</Text>
          <Text style={styles.statLabel}>Workers On Site</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {weeklyStats.dailyChecksCompleted}/{weeklyStats.dailyChecksRequired}
          </Text>
          <Text style={styles.statLabel}>Daily Checks</Text>
        </View>
      </View>
    </View>
  );
}
