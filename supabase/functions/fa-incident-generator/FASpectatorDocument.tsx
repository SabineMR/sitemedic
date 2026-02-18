/**
 * SGSA Medical Incident Report PDF Component
 * Phase 22: Football / Sports Vertical — FOOT-07
 *
 * Renders the SGSA-aligned medical incident report for spectator incidents.
 * Field categories based on SGSA Medical Incident Report Form (February 2024).
 */

import React from 'npm:react@18.3.1';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from 'npm:@react-pdf/renderer@4.3.2';
import type { SGSASpectatorPDFData } from './types.ts';
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
  safeguardingBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#DC2626', padding: 8, marginBottom: 8, borderRadius: 4 },
  safeguardingTitle: { fontSize: 10, fontWeight: 'bold', color: '#DC2626', marginBottom: 3 },
  safeguardingText: { fontSize: 9, color: '#7F1D1D' },
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
  data: SGSASpectatorPDFData;
  generatedAt: string;
  branding?: OrgBranding;
  logoSrc?: string | null;
}

export function FASpectatorDocument({ data, generatedAt, branding, logoSrc }: Props) {
  return (
    <Document title={`SGSA Medical Incident Report — ${data.referenceNumber}`} author={branding?.company_name || 'SiteMedic'}>
      <Page size="A4" style={styles.page}>
        {/* Branded Header */}
        {branding ? (
          <BrandedPdfHeader
            companyName={branding.company_name}
            documentType="SGSA Medical Incident Report"
            logoSrc={logoSrc}
            primaryColour={branding.primary_colour_hex}
          />
        ) : (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SGSA Medical Incident Report</Text>
          </View>
        )}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>
            Reference: {data.referenceNumber} | Date: {data.incidentDate} | Venue: {data.venueName}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incident Location</Text>
          <Row label="Stand / Area" value={data.standLocation} />
          <Row label="Row / Seat" value={data.standRowSeat} />
        </View>

        {/* Clinical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Details</Text>
          <Row label="Injury / Illness" value={data.injuryType} />
          <Row label="Treatment Given" value={data.treatmentGiven} />
          <Row label="Referral Outcome" value={data.referralOutcome} />
          <Row label="Alcohol Factor" value={data.alcoholInvolvement ? 'Yes' : 'No'} />
        </View>

        {/* Safeguarding — conditional, shown only when flagged */}
        {data.safeguardingFlag && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safeguarding</Text>
            <View style={styles.safeguardingBox}>
              <Text style={styles.safeguardingTitle}>Safeguarding Concern Identified</Text>
              <Text style={styles.safeguardingText}>
                {data.safeguardingNotes || 'See incident record for details.'}
              </Text>
              <Text style={styles.safeguardingText}>
                Refer to designated safeguarding lead. Do not disclose to third parties.
              </Text>
            </View>
          </View>
        )}

        {/* Treating Medic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treating Medic</Text>
          <Row label="Medic" value={data.medicName} />
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
            {generatedAt} | SGSA-aligned Medical Incident Report
          </Text>
          <Text style={styles.footerText}>
            Retain as part of ground medical records. Report to ground Safety Officer if required by venue licence conditions.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
