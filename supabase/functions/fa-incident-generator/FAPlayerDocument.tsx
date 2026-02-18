/**
 * FA Match Day Injury Form PDF Component
 * Phase 22: Football / Sports Vertical — FOOT-07
 *
 * Renders the FA-aligned match day injury report for player incidents.
 * Field categories are based on FA/FIFA injury surveillance consensus statement data categories.
 */

import React from 'npm:react@18.3.1';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from 'npm:@react-pdf/renderer@4.3.2';
import type { FAPlayerPDFData } from './types.ts';
import type { OrgBranding } from '../_shared/branding-helpers.ts';
import { BrandedPdfHeader, BrandedPdfFooter } from '../_shared/pdf-branding.tsx';
import { showPoweredBySiteMedic } from '../_shared/branding-helpers.ts';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1F2937' },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#D1D5DB', paddingBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 },
  headerSubtitle: { fontSize: 10, color: '#6B7280' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', paddingBottom: 3 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: '40%', color: '#6B7280', fontWeight: 'bold' },
  value: { width: '60%', color: '#1F2937' },
  warningBox: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', padding: 8, marginBottom: 12, borderRadius: 4 },
  warningText: { fontSize: 9, color: '#92400E' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: '#D1D5DB', paddingTop: 6 },
  footerText: { fontSize: 8, color: '#9CA3AF', textAlign: 'center' },
});

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

interface Props {
  data: FAPlayerPDFData;
  generatedAt: string;
  branding?: OrgBranding;
  logoSrc?: string | null;
}

export function FAPlayerDocument({ data, generatedAt, branding, logoSrc }: Props) {
  return (
    <Document title={`FA Match Day Injury Report — ${data.referenceNumber}`} author={branding?.company_name || 'SiteMedic'}>
      <Page size="A4" style={styles.page}>
        {/* Branded Header */}
        {branding ? (
          <BrandedPdfHeader
            companyName={branding.company_name}
            documentType="FA Match Day Injury Form"
            logoSrc={logoSrc}
            primaryColour={branding.primary_colour_hex}
          />
        ) : (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>FA Match Day Injury Report</Text>
          </View>
        )}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>
            Reference: {data.referenceNumber} | Date: {data.incidentDate} | Club: {data.clubName}
          </Text>
        </View>

        {/* Player Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Player Details</Text>
          <Row label="Player Name" value={data.playerName} />
          <Row label="Squad Number" value={data.squadNumber} />
          <Row label="Club" value={data.clubName} />
        </View>

        {/* Injury Classification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Injury Classification</Text>
          <Row label="Injury Type" value={data.injuryType} />
          <Row label="Body Part" value={data.bodyPart} />
          <Row label="Phase of Play" value={data.phaseOfPlay} />
          <Row label="Mechanism" value={data.contactType} />
          <Row label="FA Severity" value={data.faSeverity} />
        </View>

        {/* Head Injury Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Head Injury Assessment (HIA)</Text>
          <Row label="HIA Conducted" value={data.hiaPerformed ? 'Yes' : 'No'} />
          {data.hiaPerformed && <Row label="HIA Outcome" value={data.hiaOutcome} />}
          {data.hiaOutcome?.includes('Concussion') && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                FA Concussion Protocol: Player must not return to play on the same day.
                Follow-up assessment required before return to training.
              </Text>
            </View>
          )}
        </View>

        {/* Treatment and Outcome */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treatment and Outcome</Text>
          <Row label="Treatment Given" value={data.treatmentGiven} />
          <Row label="Outcome" value={data.outcome} />
          <Row label="Treating Medic" value={data.medicName} />
        </View>

        {/* Footer */}
        {branding && (
          <BrandedPdfFooter
            companyName={branding.company_name}
            showPoweredBy={showPoweredBySiteMedic(branding.subscription_tier)}
          />
        )}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {generatedAt} | FA-aligned match day injury report
          </Text>
          <Text style={styles.footerText}>
            This report is for clinical and FA governance purposes. Retain as part of player medical records.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
