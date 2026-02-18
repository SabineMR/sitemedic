/**
 * Report Header Component
 * Phase 28: Branding — PDFs & Emails
 */

import { View, Text } from 'npm:@react-pdf/renderer@4.3.2';
import { styles } from '../styles.ts';
import type { OrgBranding } from '../../_shared/branding-helpers.ts';
import { BrandedPdfHeader } from '../../_shared/pdf-branding.tsx';

interface HeaderProps {
  projectName: string;
  weekEnding: string;
  medicName: string;
  generatedAt: string;
  branding: OrgBranding;
  logoSrc?: string | null;
}

export function Header({ projectName, weekEnding, medicName, generatedAt, branding, logoSrc }: HeaderProps) {
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
    <View>
      <BrandedPdfHeader
        companyName={branding.company_name}
        documentType="Weekly Safety Report"
        logoSrc={logoSrc}
        primaryColour={branding.primary_colour_hex}
      />

      {/* Report-specific details */}
      <View style={styles.headerRight}>
        <Text style={styles.subtitle}>Week Ending: {weekEnding}</Text>
        <Text style={styles.subtitle}>Medic: {medicName}</Text>
        <Text style={styles.subtitle}>Project: {projectName}</Text>
        <Text style={styles.subtitle}>Generated: {formattedGenerated}</Text>
      </View>
    </View>
  );
}
