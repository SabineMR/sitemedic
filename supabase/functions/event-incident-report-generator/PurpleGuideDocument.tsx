/**
 * Purple Guide Patient Contact Log PDF Document Component
 * Phase 20: Festivals & Events Vertical - Plan 03
 *
 * Renders the Purple Guide (Events Industry Forum) patient contact log as PDF
 * using @react-pdf/renderer. Follows the F2508Document structural pattern.
 */

import React from 'npm:react@18.3.1';
import { Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';
import type { PurpleGuideData } from './types.ts';

interface PurpleGuideDocumentProps {
  data: PurpleGuideData;
  generatedAt: string;
}

const TRIAGE_BADGE_COLOURS: Record<string, string> = {
  P1: '#DC2626',
  P2: '#F59E0B',
  P3: '#22C55E',
  P4: '#1F2937',
};

export function PurpleGuideDocument({ data, generatedAt }: PurpleGuideDocumentProps) {
  const badgeColour = TRIAGE_BADGE_COLOURS[data.triageCategory] ?? '#6B7280';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Purple Guide — Patient Contact Log</Text>
          <Text style={styles.subtitle}>
            Events Industry Forum — Health, Safety and Welfare at Events
          </Text>
          <Text style={styles.generatedDate}>Generated: {generatedAt}</Text>
        </View>

        {/* Event Info Bar */}
        <View style={styles.eventInfoBar}>
          <View style={styles.eventInfoItem}>
            <Text style={styles.label}>Organisation:</Text>
            <Text style={styles.value}>{data.organisationName}</Text>
          </View>
          <View style={styles.eventInfoItem}>
            <Text style={styles.label}>Event:</Text>
            <Text style={styles.value}>{data.eventName}</Text>
          </View>
          <View style={styles.eventInfoItem}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{data.eventDate}</Text>
          </View>
          <View style={styles.eventInfoItem}>
            <Text style={styles.label}>Reference:</Text>
            <Text style={styles.value}>{data.referenceNumber}</Text>
          </View>
        </View>

        {/* Section 1: Patient Identifier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Patient Identifier</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value}>{data.patientIdentifier}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Time of Presentation:</Text>
            <Text style={styles.value}>{data.timeOfPresentation}</Text>
          </View>
          {/* Triage Priority Badge */}
          <View style={styles.triageBadgeRow}>
            <Text style={styles.label}>Triage Priority:</Text>
            <View style={[styles.triageBadge, { backgroundColor: badgeColour }]}>
              <Text style={styles.triageBadgeText}>{data.triageCategory}</Text>
            </View>
            <Text style={styles.triageLabelText}>{data.triageLabel}</Text>
          </View>
        </View>

        {/* Section 2: Presenting Complaint */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Presenting Complaint</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Complaint:</Text>
            <Text style={styles.value}>
              {data.presentingComplaint || 'Not recorded'}
            </Text>
          </View>
          {data.mechanismOfInjury ? (
            <View style={styles.field}>
              <Text style={styles.label}>Mechanism of Injury:</Text>
              <Text style={styles.value}>{data.mechanismOfInjury}</Text>
            </View>
          ) : null}
        </View>

        {/* Section 3: Treatment Given */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Treatment Given</Text>
          {data.treatmentGiven.map((treatment, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{treatment}</Text>
            </View>
          ))}
          {data.treatmentNotes ? (
            <View style={styles.field}>
              <Text style={styles.label}>Treatment Notes:</Text>
              <Text style={styles.value}>{data.treatmentNotes}</Text>
            </View>
          ) : null}
        </View>

        {/* Section 4: Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Flags</Text>
          <View style={styles.flagRow}>
            <View style={[styles.flagBadge, data.alcoholSubstanceInvolvement ? styles.flagActive : styles.flagInactive]}>
              <Text style={styles.flagText}>
                {data.alcoholSubstanceInvolvement ? 'ALCOHOL/SUBSTANCE: YES' : 'ALCOHOL/SUBSTANCE: NO'}
              </Text>
            </View>
            <View style={[styles.flagBadge, data.safeguardingConcern ? styles.flagActive : styles.flagInactive]}>
              <Text style={styles.flagText}>
                {data.safeguardingConcern ? 'SAFEGUARDING: YES' : 'SAFEGUARDING: NO'}
              </Text>
            </View>
          </View>
          {data.safeguardingConcern ? (
            <View style={styles.safeguardingWarning}>
              <Text style={styles.safeguardingWarningText}>
                Safeguarding concern raised — refer to designated safeguarding lead per event protocol.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section 5: Disposition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Disposition</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Outcome:</Text>
            <Text style={styles.value}>{data.dispositionLabel}</Text>
          </View>
        </View>

        {/* Section 6: Attending Medic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Attending Medic</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Medic:</Text>
            <Text style={styles.value}>{data.medicName}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This report has been auto-generated from SiteMedic treatment records.
          </Text>
          <Text style={styles.footerText}>
            Purple Guide framework — Events Industry Forum: Health, Safety and Welfare at Events (8th edition).
          </Text>
          <Text style={styles.footerText}>
            Please review all information for accuracy. Retain for event medical records as required by event licence conditions.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 16,
    borderBottom: '2 solid #6B21A8',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B21A8',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
  },
  generatedDate: {
    fontSize: 8,
    color: '#999',
  },
  eventInfoBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    backgroundColor: '#F3E8FF',
    padding: 8,
    borderRadius: 4,
  },
  eventInfoItem: {
    width: '50%',
    marginBottom: 4,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1 solid #E5E7EB',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  field: {
    marginBottom: 6,
  },
  label: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#1F2937',
  },
  triageBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  triageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
    marginRight: 8,
  },
  triageBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  triageLabelText: {
    fontSize: 10,
    color: '#1F2937',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 10,
    marginRight: 6,
    color: '#6B21A8',
  },
  bulletText: {
    fontSize: 10,
    color: '#1F2937',
    flex: 1,
  },
  flagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  flagActive: {
    backgroundColor: '#FEE2E2',
  },
  flagInactive: {
    backgroundColor: '#F3F4F6',
  },
  flagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  safeguardingWarning: {
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  safeguardingWarningText: {
    fontSize: 9,
    color: '#92400E',
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: '1 solid #E5E7EB',
  },
  footerText: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 4,
  },
});
