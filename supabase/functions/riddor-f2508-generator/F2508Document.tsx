/**
 * F2508 PDF Document Component
 * Phase 6: RIDDOR Auto-Flagging - Plan 03
 *
 * Renders HSE F2508 RIDDOR report form as PDF using @react-pdf/renderer
 */

import React from 'npm:react@18.3.1';
import { Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';
import type { F2508Data } from './types.ts';
import type { OrgBranding } from '../_shared/branding-helpers.ts';
import { BrandedPdfHeader, BrandedPdfFooter } from '../_shared/pdf-branding.tsx';
import { showPoweredBySiteMedic } from '../_shared/branding-helpers.ts';

interface F2508DocumentProps {
  data: F2508Data;
  generatedAt: string;
  branding: OrgBranding;
  logoSrc?: string | null;
}

export function F2508Document({ data, generatedAt, branding, logoSrc }: F2508DocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Branded Header */}
        <BrandedPdfHeader
          companyName={branding.company_name}
          documentType="F2508 RIDDOR Report"
          logoSrc={logoSrc}
          primaryColour={branding.primary_colour_hex}
        />
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013
          </Text>
          <Text style={styles.generatedDate}>Generated: {generatedAt}</Text>
        </View>

        {/* Section 1: About the organisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. About the organisation</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Organisation name:</Text>
            <Text style={styles.value}>{data.organisationName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.organisationAddress}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Postcode:</Text>
            <Text style={styles.value}>{data.organisationPostcode}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Telephone:</Text>
            <Text style={styles.value}>{data.organisationPhone}</Text>
          </View>
        </View>

        {/* Section 2: About the incident */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. About the incident</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Date of incident:</Text>
            <Text style={styles.value}>{data.incidentDate}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Time of incident:</Text>
            <Text style={styles.value}>{data.incidentTime}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Location of incident:</Text>
            <Text style={styles.value}>{data.incidentLocation}</Text>
          </View>
        </View>

        {/* Section 3: About the injured person */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. About the injured person</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Full name:</Text>
            <Text style={styles.value}>{data.injuredPersonName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Job title:</Text>
            <Text style={styles.value}>{data.injuredPersonJobTitle}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Employer:</Text>
            <Text style={styles.value}>{data.injuredPersonEmployer}</Text>
          </View>
        </View>

        {/* Section 4: About the injury */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. About the injury</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Injury type:</Text>
            <Text style={styles.value}>{data.injuryType}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Injury detail:</Text>
            <Text style={styles.value}>{data.injuryDetail}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Body part affected:</Text>
            <Text style={styles.value}>{data.bodyPartAffected}</Text>
          </View>
        </View>

        {/* Section 5: About the kind of accident */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. About the kind of accident</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Type of accident:</Text>
            <Text style={styles.value}>{data.accidentType}</Text>
          </View>
        </View>

        {/* Section 6: Describing what happened */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Describing what happened</Text>
          <View style={styles.field}>
            <Text style={styles.value}>{data.incidentDescription}</Text>
          </View>
        </View>

        {/* Footer */}
        <BrandedPdfFooter
          companyName={branding.company_name}
          showPoweredBy={showPoweredBySiteMedic(branding.subscription_tier)}
        />
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Please review all information for accuracy before submitting to HSE.
          </Text>
          <Text style={styles.footerText}>
            Submit online at: https://www.hse.gov.uk/riddor/report.htm
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
    marginBottom: 20,
    borderBottom: '2 solid #003366',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
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
