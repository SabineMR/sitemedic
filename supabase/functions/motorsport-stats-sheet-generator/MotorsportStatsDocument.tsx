/**
 * Medical Statistics Sheet PDF Document Component
 * Phase 19: Motorsport Vertical — Plan 04
 *
 * Renders a Medical Statistics Sheet as PDF using @react-pdf/renderer.
 * A4 landscape orientation for the aggregate table.
 *
 * MOTO-02 requirement: per-booking aggregate of all treatment incidents,
 * including severity distribution, concussion count, extrication count,
 * GCS range, and tabular incident list.
 *
 * No emoji. Professional styling. 10pt body, 12pt headers.
 */

import React from 'npm:react@18.3.1';
import { Document, Page, Text, View, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';
import type { MotorsportStatsData } from './types.ts';

interface MotorsportStatsDocumentProps {
  data: MotorsportStatsData;
}

// ── Colour constants ──────────────────────────────────────────────────────────

const MOTORSPORT_RED = '#e60012';
const DARK_TEXT = '#1F2937';
const MID_TEXT = '#374151';
const MUTED_TEXT = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const ALT_ROW_BG = '#F9FAFB';
const CONCUSSION_ROW_BG = '#FEF2F2';
const CONCUSSION_BORDER = '#FECACA';

// ── Helper: capitalise underscore_separated value ────────────────────────────

function formatLabel(raw: string): string {
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MotorsportStatsDocument({ data }: MotorsportStatsDocumentProps) {
  const severityOrder = ['minor', 'moderate', 'major', 'critical'];
  const sortedSeverities = Object.entries(data.severity_counts).sort(
    ([a], [b]) => severityOrder.indexOf(a) - severityOrder.indexOf(b)
  );
  const sortedOutcomes = Object.entries(data.outcome_counts);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Medical Statistics Sheet</Text>
          <Text style={styles.subtitle}>
            Motorsport Medical Coverage — Post-Event Summary
          </Text>

          {/* Event meta row */}
          <View style={styles.headerMeta}>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>Event</Text>
              <Text style={styles.headerMetaValue}>{data.event_name}</Text>
            </View>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>Date</Text>
              <Text style={styles.headerMetaValue}>
                {data.event_date}{data.event_end_date ? ` – ${data.event_end_date}` : ''}
              </Text>
            </View>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>Venue</Text>
              <Text style={styles.headerMetaValue}>{data.venue}</Text>
            </View>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>Event Organiser</Text>
              <Text style={styles.headerMetaValue}>{data.org_name}</Text>
            </View>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>CMO</Text>
              <Text style={styles.headerMetaValue}>{data.cmo_name}</Text>
            </View>
          </View>
        </View>

        {/* ── Summary grid ────────────────────────────────────────────────── */}
        <View style={styles.summaryGrid}>

          {/* Patient counts */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Patient Counts</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Patients</Text>
              <Text style={styles.summaryValueLarge}>{data.total_patients}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Competitors</Text>
              <Text style={styles.summaryValue}>{data.total_competitors}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Spectators / Staff</Text>
              <Text style={styles.summaryValue}>{data.total_spectators_staff}</Text>
            </View>
          </View>

          {/* Severity distribution */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Severity</Text>
            {sortedSeverities.map(([sev, count]) => (
              <View key={sev} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{formatLabel(sev)}</Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            ))}
            {sortedSeverities.length === 0 && (
              <Text style={styles.summaryEmpty}>No data</Text>
            )}
          </View>

          {/* Outcome distribution */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Outcomes</Text>
            {sortedOutcomes.map(([outcome, count]) => (
              <View key={outcome} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{formatLabel(outcome)}</Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            ))}
            {sortedOutcomes.length === 0 && (
              <Text style={styles.summaryEmpty}>No data</Text>
            )}
          </View>

          {/* Motorsport specifics */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Motorsport Specifics</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Concussions</Text>
              <Text style={[styles.summaryValue, data.concussion_count > 0 ? styles.concussionHighlight : {}]}>
                {data.concussion_count}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Extricatons</Text>
              <Text style={styles.summaryValue}>{data.extrication_count}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hospital Referrals</Text>
              <Text style={[styles.summaryValue, data.hospital_referrals > 0 ? styles.warningHighlight : {}]}>
                {data.hospital_referrals}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GCS Range</Text>
              <Text style={styles.summaryValue}>
                {data.gcs_min !== null && data.gcs_max !== null
                  ? `${data.gcs_min} – ${data.gcs_max}`
                  : 'Not assessed'}
              </Text>
            </View>
          </View>

        </View>

        {/* ── Incidents table ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incident Log</Text>

          {/* Table header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colTime]}>Time</Text>
            <Text style={[styles.tableCell, styles.colCar]}>Car No.</Text>
            <Text style={[styles.tableCell, styles.colSection]}>Circuit Section</Text>
            <Text style={[styles.tableCell, styles.colInjury]}>Injury Type</Text>
            <Text style={[styles.tableCell, styles.colSeverity]}>Severity</Text>
            <Text style={[styles.tableCell, styles.colGcs]}>GCS</Text>
            <Text style={[styles.tableCell, styles.colOutcome]}>Outcome</Text>
            <Text style={[styles.tableCell, styles.colConcussion]}>Concussion</Text>
          </View>

          {/* Table rows */}
          {data.incidents.map((incident, idx) => {
            const isConcussion = incident.concussion;
            const isAlt = idx % 2 === 1 && !isConcussion;
            return (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  isConcussion
                    ? styles.concussionRow
                    : isAlt
                    ? styles.altRow
                    : {},
                ]}
              >
                <Text style={[styles.tableCell, styles.colTime]}>{incident.time}</Text>
                <Text style={[styles.tableCell, styles.colCar]}>{incident.competitor_number}</Text>
                <Text style={[styles.tableCell, styles.colSection]}>{incident.circuit_section}</Text>
                <Text style={[styles.tableCell, styles.colInjury]}>{formatLabel(incident.injury_type)}</Text>
                <Text style={[styles.tableCell, styles.colSeverity]}>{formatLabel(incident.severity)}</Text>
                <Text style={[styles.tableCell, styles.colGcs]}>
                  {incident.gcs !== null ? String(incident.gcs) : '--'}
                </Text>
                <Text style={[styles.tableCell, styles.colOutcome]}>{formatLabel(incident.outcome)}</Text>
                <Text style={[styles.tableCell, styles.colConcussion, isConcussion ? styles.concussionText : {}]}>
                  {isConcussion ? 'YES' : 'No'}
                </Text>
              </View>
            );
          })}

          {data.incidents.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 8 }]}>No incidents recorded</Text>
            </View>
          )}
        </View>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            Generated by SiteMedic | Booking ID: {data.booking_id}
          </Text>
          <Text style={styles.footerRight}>
            {data.generated_at}
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 48,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.4,
    position: 'relative',
  },

  // Header
  header: {
    marginBottom: 12,
    borderBottom: `2 solid ${MOTORSPORT_RED}`,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: MOTORSPORT_RED,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 9,
    color: MID_TEXT,
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  headerMetaItem: {
    flex: 1,
  },
  headerMetaLabel: {
    fontSize: 7,
    color: MUTED_TEXT,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  headerMetaValue: {
    fontSize: 9,
    color: DARK_TEXT,
    fontFamily: 'Helvetica-Bold',
  },

  // Summary grid (4 cards side by side)
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    border: `1 solid ${BORDER_COLOR}`,
    borderRadius: 4,
    padding: 8,
  },
  summaryCardTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: MOTORSPORT_RED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    borderBottom: `1 solid ${BORDER_COLOR}`,
    paddingBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 8,
    color: MID_TEXT,
  },
  summaryValue: {
    fontSize: 9,
    color: DARK_TEXT,
    fontFamily: 'Helvetica-Bold',
  },
  summaryValueLarge: {
    fontSize: 14,
    color: DARK_TEXT,
    fontFamily: 'Helvetica-Bold',
  },
  summaryEmpty: {
    fontSize: 8,
    color: MUTED_TEXT,
    fontFamily: 'Helvetica-Oblique',
  },
  concussionHighlight: {
    color: '#DC2626',
  },
  warningHighlight: {
    color: '#D97706',
  },

  // Section
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK_TEXT,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderLeft: `3 solid ${MOTORSPORT_RED}`,
    paddingLeft: 6,
  },

  // Table
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1 solid ${BORDER_COLOR}`,
    minHeight: 18,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#1F2937',
  },
  altRow: {
    backgroundColor: ALT_ROW_BG,
  },
  concussionRow: {
    backgroundColor: CONCUSSION_ROW_BG,
    border: `1 solid ${CONCUSSION_BORDER}`,
  },
  tableCell: {
    fontSize: 8,
    color: DARK_TEXT,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },

  // Column widths (landscape A4 = ~792pt usable = ~720pt after padding)
  colTime:      { width: 44 },
  colCar:       { width: 44 },
  colSection:   { flex: 1 },
  colInjury:    { flex: 1 },
  colSeverity:  { width: 56 },
  colGcs:       { width: 32 },
  colOutcome:   { flex: 1 },
  colConcussion: { width: 62 },

  // Table header cell colour override
  concussionText: {
    color: '#DC2626',
    fontFamily: 'Helvetica-Bold',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `1 solid ${BORDER_COLOR}`,
    paddingTop: 6,
  },
  footerLeft: {
    fontSize: 7,
    color: MUTED_TEXT,
  },
  footerRight: {
    fontSize: 7,
    color: MUTED_TEXT,
  },
});
