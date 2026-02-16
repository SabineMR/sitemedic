/**
 * Report Header Component
 * Phase 5: PDF Generation - Plan 01
 */

import { View, Text } from 'npm:@react-pdf/renderer@4.3.2';
import { styles } from '../styles.ts';

interface HeaderProps {
  projectName: string;
  weekEnding: string;
  medicName: string;
  generatedAt: string;
}

export function Header({ projectName, weekEnding, medicName, generatedAt }: HeaderProps) {
  // Format generatedAt timestamp
  const generatedDate = new Date(generatedAt);
  const formattedGenerated = generatedDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.header}>
      {/* Logo placeholder - actual logo from Supabase Storage will be added in Plan 02 */}
      <View>
        <Text style={styles.logoPlaceholder}>SiteMedic</Text>
      </View>

      {/* Report details */}
      <View style={styles.headerRight}>
        <Text style={styles.reportTitle}>Weekly Safety Report</Text>
        <Text style={styles.subtitle}>Week Ending: {weekEnding}</Text>
        <Text style={styles.subtitle}>Medic: {medicName}</Text>
        <Text style={styles.subtitle}>Project: {projectName}</Text>
        <Text style={styles.subtitle}>Generated: {formattedGenerated}</Text>
      </View>
    </View>
  );
}
