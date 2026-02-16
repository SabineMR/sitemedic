/**
 * Main Weekly Report PDF Document Component
 * Phase 5: PDF Generation - Plan 01
 */

import { Document, Page } from 'npm:@react-pdf/renderer@4.3.2';
import { styles } from '../styles.ts';
import type { WeeklyReportData } from '../types.ts';

import { Header } from './Header.tsx';
import { ComplianceSummary } from './ComplianceSummary.tsx';
import { TreatmentTable } from './TreatmentTable.tsx';
import { NearMissTable } from './NearMissTable.tsx';
import { SafetyChecksSection } from './SafetyChecksSection.tsx';
import { Footer } from './Footer.tsx';

interface ReportDocumentProps {
  data: WeeklyReportData;
}

export function ReportDocument({ data }: ReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with branding and report details */}
        <Header
          projectName={data.projectName}
          weekEnding={data.weekEnding}
          medicName={data.medicName}
          generatedAt={data.generatedAt}
        />

        {/* Compliance summary with traffic light and weekly stats */}
        <ComplianceSummary
          complianceScore={data.complianceScore}
          weeklyStats={data.weeklyStats}
        />

        {/* Treatment log table */}
        <TreatmentTable treatments={data.treatments} />

        {/* Near-miss incidents table */}
        <NearMissTable nearMisses={data.nearMisses} />

        {/* Daily safety checks summary */}
        <SafetyChecksSection
          safetyChecks={data.safetyChecks}
          dailyChecksCompleted={data.weeklyStats.dailyChecksCompleted}
          dailyChecksRequired={data.weeklyStats.dailyChecksRequired}
        />

        {/* Page footer with page numbers and generation date */}
        <Footer projectName={data.projectName} />
      </Page>
    </Document>
  );
}
