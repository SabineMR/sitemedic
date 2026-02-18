/**
 * Motorsport Incident Report PDF Document Component
 * Phase 19: Motorsport Vertical — Plan 03
 *
 * Renders a Motorsport UK Accident Form as PDF using @react-pdf/renderer.
 *
 * DRAFT WATERMARK: This document is rendered with a "DRAFT - Pending Motorsport UK
 * form validation" watermark because the physical Incident Pack V8.0 form was not
 * obtained. Field names are inferred from MOTO-01 requirements.
 *
 * Follows the F2508Document.tsx pattern exactly.
 */

import React from 'npm:react@18.3.1';
import { Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';
import type { MotorsportFormData } from './types.ts';
import type { OrgBranding } from '../_shared/branding-helpers.ts';
import { BrandedPdfHeader, BrandedPdfFooter } from '../_shared/pdf-branding.tsx';
import { showPoweredBySiteMedic } from '../_shared/branding-helpers.ts';

interface MotorsportIncidentDocumentProps {
  data: MotorsportFormData;
  branding?: OrgBranding;
  logoSrc?: string | null;
}

/** Motorsport UK brand red */
const MOTORSPORT_RED = '#e60012';
const DARK_TEXT = '#1F2937';
const MID_TEXT = '#374151';
const MUTED_TEXT = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const TRUE_VALUE = 'Yes';
const FALSE_VALUE = 'No';

function boolLabel(value: boolean): string {
  return value ? TRUE_VALUE : FALSE_VALUE;
}

export function MotorsportIncidentDocument({ data, branding, logoSrc }: MotorsportIncidentDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* DRAFT watermark — rotated 45 degrees, centered on page */}
        <View style={styles.watermarkContainer} fixed>
          <Text style={styles.watermarkText}>
            DRAFT - Pending Motorsport UK form validation
          </Text>
        </View>

        {/* Branded Header */}
        {branding ? (
          <BrandedPdfHeader
            companyName={branding.company_name}
            documentType="Motorsport Incident Report"
            logoSrc={logoSrc}
            primaryColour={branding.primary_colour_hex}
          />
        ) : (
          <View style={styles.header}>
            <Text style={styles.title}>Motorsport Incident Report</Text>
          </View>
        )}
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Motorsport UK — Competitor Accident / Medical Incident Form
          </Text>
          <Text style={styles.draftNotice}>
            DRAFT: Fields inferred from MOTO-01 requirements. Validate against
            official Motorsport UK Incident Pack V8.0 before regulatory submission.
          </Text>
          <Text style={styles.generatedDate}>
            Generated: {data.generated_at}
          </Text>
        </View>

        {/* Section 1: Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Event Details</Text>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Event Name</Text>
              <Text style={styles.value}>{data.event_name}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Event Date</Text>
              <Text style={styles.value}>{data.event_date}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Venue / Circuit</Text>
              <Text style={styles.value}>{data.venue}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Event Organiser</Text>
              <Text style={styles.value}>{data.org_name}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Competitor Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Competitor Details</Text>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Competitor Name</Text>
              <Text style={styles.value}>{data.competitor_name}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Car / Race Number</Text>
              <Text style={styles.value}>{data.competitor_car_number}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Vehicle Type</Text>
              <Text style={styles.value}>{data.vehicle_type}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Circuit Section / Location</Text>
              <Text style={styles.value}>{data.circuit_section}</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Clinical Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Clinical Assessment</Text>

          <View style={styles.row}>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Injury Type</Text>
              <Text style={styles.value}>{data.injury_type}</Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Body Part Affected</Text>
              <Text style={styles.value}>{data.body_part}</Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Severity</Text>
              <Text style={styles.value}>{data.severity}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mechanism of Injury</Text>
            <Text style={styles.value}>{data.mechanism_of_injury}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Treatment Provided</Text>
            <Text style={styles.value}>
              {data.treatment_types.length > 0
                ? data.treatment_types.join(', ')
                : 'None recorded'}
            </Text>
          </View>

          {data.treatment_notes ? (
            <View style={styles.field}>
              <Text style={styles.label}>Clinical Notes</Text>
              <Text style={styles.value}>{data.treatment_notes}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Outcome</Text>
              <Text style={styles.value}>{data.outcome}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.labelGcs}>GCS Score</Text>
              <Text style={styles.valueGcs}>
                {data.gcs_score !== null ? String(data.gcs_score) : 'Not assessed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 4: Motorsport Specifics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Motorsport Specifics</Text>

          <View style={styles.row}>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Extrication Required</Text>
              <Text style={[styles.value, data.extrication_required ? styles.flagYes : styles.flagNo]}>
                {boolLabel(data.extrication_required)}
              </Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Helmet Removed</Text>
              <Text style={[styles.value, data.helmet_removed ? styles.flagYes : styles.flagNo]}>
                {boolLabel(data.helmet_removed)}
              </Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Helmet Condition</Text>
              <Text style={styles.value}>{data.helmet_condition}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Concussion Suspected</Text>
              <Text style={[styles.value, data.concussion_suspected ? styles.flagYes : styles.flagNo]}>
                {boolLabel(data.concussion_suspected)}
              </Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Clerk of Course Notified</Text>
              <Text style={styles.value}>
                {boolLabel(data.clerk_of_course_notified)}
              </Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Competitor Cleared to Return</Text>
              <Text style={[styles.value, data.competitor_cleared_to_return ? styles.flagYes : styles.flagNo]}>
                {boolLabel(data.competitor_cleared_to_return)}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 5: Concussion Clearance Protocol */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Concussion Clearance Protocol</Text>
          <Text style={styles.sectionNote}>
            Complete for all suspected head injuries. Mandatory per Motorsport UK
            standing medical regulations.
          </Text>

          <View style={styles.row}>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>HIA Conducted</Text>
              <Text style={[styles.value, data.hia_conducted ? styles.flagYes : styles.flagNo]}>
                {boolLabel(data.hia_conducted)}
              </Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>Competitor Stood Down</Text>
              <Text style={[styles.value, data.competitor_stood_down ? styles.flagYes : styles.flagNo]}>
                {boolLabel(data.competitor_stood_down)}
              </Text>
            </View>
            <View style={styles.fieldThird}>
              <Text style={styles.label}>CMO Notified</Text>
              <Text style={[styles.value, data.cmo_notified ? styles.flagYes : styles.flagNo]}>
                {boolLabel(data.cmo_notified)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.footerLabel}>Reference Number</Text>
              <Text style={styles.footerValue}>{data.reference_number}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.footerLabel}>Attending Medic</Text>
              <Text style={styles.footerValue}>{data.medic_name}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.fieldHalf}>
              <Text style={styles.footerLabel}>Incident Date</Text>
              <Text style={styles.footerValue}>{data.created_at}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.footerLabel}>Report Generated</Text>
              <Text style={styles.footerValue}>{data.generated_at}</Text>
            </View>
          </View>
          {branding && (
            <BrandedPdfFooter
              companyName={branding.company_name}
              showPoweredBy={showPoweredBySiteMedic(branding.subscription_tier)}
            />
          )}
          <Text style={styles.footerDisclaimer}>
            Review all information before submitting to Motorsport UK or the Clerk of Course.
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
    position: 'relative',
  },

  // DRAFT watermark — absolute, centered, rotated
  watermarkContainer: {
    position: 'absolute',
    top: 280,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-45deg)',
    opacity: 0.08,
    zIndex: -1,
  },
  watermarkText: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 2,
  },

  // Header
  header: {
    marginBottom: 20,
    borderBottom: `2 solid ${MOTORSPORT_RED}`,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: MOTORSPORT_RED,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: MID_TEXT,
    marginBottom: 6,
  },
  draftNotice: {
    fontSize: 8,
    color: MOTORSPORT_RED,
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 4,
    backgroundColor: '#FFF5F5',
    padding: 4,
    borderLeft: `3 solid ${MOTORSPORT_RED}`,
  },
  generatedDate: {
    fontSize: 8,
    color: MUTED_TEXT,
    marginTop: 2,
  },

  // Section container
  section: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: `1 solid ${BORDER_COLOR}`,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK_TEXT,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderLeft: `3 solid ${MOTORSPORT_RED}`,
    paddingLeft: 6,
  },
  sectionNote: {
    fontSize: 8,
    color: MUTED_TEXT,
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 6,
  },

  // Row and field layouts
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 10,
  },
  field: {
    marginBottom: 6,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldThird: {
    flex: 1,
  },

  // Labels and values
  label: {
    fontSize: 8,
    color: MUTED_TEXT,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 10,
    color: DARK_TEXT,
  },

  // GCS score — slightly larger to indicate importance
  labelGcs: {
    fontSize: 8,
    color: MUTED_TEXT,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  valueGcs: {
    fontSize: 14,
    color: DARK_TEXT,
    fontFamily: 'Helvetica-Bold',
  },

  // Boolean flag styling
  flagYes: {
    color: '#166534',
    fontFamily: 'Helvetica-Bold',
  },
  flagNo: {
    color: '#374151',
  },

  // Footer
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTop: `2 solid ${BORDER_COLOR}`,
  },
  footerLabel: {
    fontSize: 8,
    color: MUTED_TEXT,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  footerValue: {
    fontSize: 9,
    color: DARK_TEXT,
  },
  footerDisclaimer: {
    fontSize: 7,
    color: MUTED_TEXT,
    fontFamily: 'Helvetica-Oblique',
    marginTop: 8,
    textAlign: 'center',
  },
});
