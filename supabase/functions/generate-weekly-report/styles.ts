/**
 * React-PDF StyleSheet for professional HSE-audit-ready reports
 * Phase 5: PDF Generation - Plan 01
 */

import { StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';

// Brand colors
const COLORS = {
  primary: '#003366',      // Dark navy for headers
  accent: '#2563EB',       // Blue for highlights
  success: '#10B981',      // Green for pass/minor
  warning: '#F59E0B',      // Amber for partial/moderate
  danger: '#EF4444',       // Red for fail/major/critical
  gray: {
    50: '#F8FAFC',
    100: '#F0F4F8',
    200: '#E5E7EB',
    300: '#D1D5DB',
    600: '#666666',
    900: '#111827',
  },
  white: '#FFFFFF',
  border: '#CCCCCC',
};

export const styles = StyleSheet.create({
  // Page layout
  page: {
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },

  // Header section with branding
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: `2pt solid ${COLORS.primary}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoPlaceholder: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  headerRight: {
    textAlign: 'right',
  },
  reportTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.gray[600],
    marginBottom: 2,
  },

  // Section styling
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1pt solid ${COLORS.border}`,
  },

  // Compliance summary
  complianceContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  complianceCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  complianceGreen: {
    backgroundColor: COLORS.success,
  },
  complianceAmber: {
    backgroundColor: COLORS.warning,
  },
  complianceRed: {
    backgroundColor: COLORS.danger,
  },
  complianceText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  complianceBreakdown: {
    marginTop: 10,
  },
  complianceItem: {
    fontSize: 10,
    marginBottom: 3,
  },

  // Weekly stats grid
  statsGrid: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.gray[50],
    borderRadius: 4,
    border: `1pt solid ${COLORS.gray[200]}`,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    color: COLORS.gray[600],
  },

  // Table styling
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    borderBottom: `1pt solid ${COLORS.border}`,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1pt solid ${COLORS.border}`,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[50],
    borderBottom: `1pt solid ${COLORS.border}`,
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
    flex: 1,
  },
  tableCellHeader: {
    padding: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  tableCellNarrow: {
    padding: 6,
    fontSize: 9,
    width: 60,
  },
  tableCellWide: {
    padding: 6,
    fontSize: 9,
    flex: 2,
  },

  // Severity badges (colored text)
  severityMinor: {
    color: COLORS.success,
  },
  severityModerate: {
    color: COLORS.warning,
  },
  severityMajor: {
    color: COLORS.danger,
  },
  severityCritical: {
    color: COLORS.danger,
    fontFamily: 'Helvetica-Bold',
  },

  // RIDDOR flag
  riddorYes: {
    color: COLORS.danger,
    fontFamily: 'Helvetica-Bold',
  },
  riddorNo: {
    color: COLORS.gray[600],
  },

  // Empty state
  emptyState: {
    fontSize: 10,
    color: COLORS.gray[600],
    fontStyle: 'italic',
    paddingVertical: 10,
  },

  // Note text (for truncated data)
  noteText: {
    fontSize: 8,
    color: COLORS.gray[600],
    fontStyle: 'italic',
    marginTop: 5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    paddingTop: 10,
    borderTop: `1pt solid ${COLORS.border}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: COLORS.gray[600],
  },
  footerCenter: {
    textAlign: 'center',
  },
  footerRight: {
    textAlign: 'right',
  },
});

export { COLORS };
