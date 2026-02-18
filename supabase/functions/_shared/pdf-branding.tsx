/**
 * Shared @react-pdf/renderer components for branded PDF headers and footers.
 * Used by all 7 @react-pdf PDF Edge Functions.
 *
 * Phase 28: Branding — PDFs & Emails
 */

import React from 'npm:react@18.3.1';
import { View, Text, Image, StyleSheet } from 'npm:@react-pdf/renderer@4.3.2';

// ---------- Header ----------

interface BrandedPdfHeaderProps {
  companyName: string;
  documentType: string;
  logoSrc?: string | null;
  primaryColour?: string | null;
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    borderBottomStyle: 'solid',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 12,
    objectFit: 'contain',
  },
  textContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  documentType: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#64748b',
  },
  // Text-only variant (no logo) — company name is larger
  companyNameLarge: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 2,
  },
});

export function BrandedPdfHeader({
  companyName,
  documentType,
  logoSrc,
  primaryColour,
}: BrandedPdfHeaderProps) {
  const borderColor = primaryColour || '#1e293b';

  return (
    <View style={[headerStyles.container, { borderBottomColor: borderColor }]}>
      {logoSrc ? (
        <>
          <Image src={logoSrc} style={headerStyles.logo} />
          <View style={headerStyles.textContainer}>
            <Text style={[headerStyles.companyName, primaryColour ? { color: primaryColour } : {}]}>
              {companyName}
            </Text>
            <Text style={headerStyles.documentType}>{documentType}</Text>
          </View>
        </>
      ) : (
        <View style={headerStyles.textContainer}>
          <Text style={[headerStyles.companyNameLarge, primaryColour ? { color: primaryColour } : {}]}>
            {companyName} {'\u2014'} {documentType}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------- Footer ----------

interface BrandedPdfFooterProps {
  companyName: string;
  showPoweredBy: boolean;
  projectName?: string;
}

const footerStyles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    borderTopStyle: 'solid',
    fontSize: 8,
    color: '#666666',
  },
});

export function BrandedPdfFooter({
  companyName,
  showPoweredBy,
  projectName,
}: BrandedPdfFooterProps) {
  return (
    <Text
      style={footerStyles.footer}
      render={({ pageNumber, totalPages }) => {
        const left = showPoweredBy
          ? 'Powered by SiteMedic | sitemedic.co.uk'
          : companyName;
        const center = `Page ${pageNumber} of ${totalPages}`;
        const right = projectName ? `Confidential \u2014 ${projectName}` : '';
        return `${left}                ${center}                ${right}`;
      }}
      fixed
    />
  );
}
