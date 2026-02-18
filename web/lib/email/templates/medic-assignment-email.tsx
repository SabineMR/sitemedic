/**
 * Medic Assignment Email Template
 * Phase 28: Branding — PDFs & Emails
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Text,
} from '@react-email/components';
import type { EmailBranding } from '@/lib/email/types';

interface MedicAssignmentEmailProps {
  booking: {
    date: string;
    startTime: string;
    endTime: string;
    siteName: string;
    siteAddress: string;
    what3wordsAddress?: string;
    siteContactName: string;
    siteContactPhone: string;
    specialNotes?: string;
    confinedSpaceRequired: boolean;
    traumaSpecialistRequired: boolean;
  };
  medic: {
    name: string;
  };
  dashboardUrl?: string;
  branding: EmailBranding;
}

export default function MedicAssignmentEmail({
  booking,
  medic,
  dashboardUrl,
  branding,
}: MedicAssignmentEmailProps) {
  const accentColour = branding.primaryColourHex || '#2563eb';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Branded header */}
          <Container style={brandHeader}>
            {branding.logoUrl ? (
              <Img src={branding.logoUrl} alt={branding.companyName} width="150" style={logoImg} />
            ) : (
              <Text style={{ ...companyNameText, color: accentColour }}>{branding.companyName}</Text>
            )}
          </Container>

          <Heading style={heading}>New Booking Assignment</Heading>

          <Text style={text}>
            Hi {medic.name},
          </Text>

          <Text style={text}>
            You have been assigned to a new booking. Please review the details below:
          </Text>

          <Container style={detailsBox}>
            <Text style={detailLabel}>Date</Text>
            <Text style={detailValue}>{booking.date}</Text>

            <Text style={detailLabel}>Time</Text>
            <Text style={detailValue}>{booking.startTime} - {booking.endTime}</Text>

            <Text style={detailLabel}>Site</Text>
            <Text style={detailValue}>
              {booking.siteName}<br />
              {booking.siteAddress}
              {booking.what3wordsAddress && (
                <>
                  <br />
                  <br />
                  <strong>Precise Location (what3words):</strong>{' '}
                  <a
                    href={`https://what3words.com/${booking.what3wordsAddress.replace(/^\/+/, '')}`}
                    style={{ color: accentColour, textDecoration: 'underline', fontWeight: 'bold' }}
                  >
                    {booking.what3wordsAddress}
                  </a>
                  <br />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Use this for exact navigation to the site entrance
                  </span>
                </>
              )}
            </Text>

            <Text style={detailLabel}>Site Contact</Text>
            <Text style={detailValue}>
              {booking.siteContactName}<br />
              {booking.siteContactPhone}
            </Text>

            {(booking.confinedSpaceRequired || booking.traumaSpecialistRequired) && (
              <>
                <Text style={detailLabel}>Special Requirements</Text>
                <Text style={detailValue}>
                  {booking.confinedSpaceRequired && '\u2713 Confined Space Certification Required'}
                  {booking.confinedSpaceRequired && booking.traumaSpecialistRequired && <br />}
                  {booking.traumaSpecialistRequired && '\u2713 Trauma Specialist Required'}
                </Text>
              </>
            )}

            {booking.specialNotes && (
              <>
                <Text style={detailLabel}>Special Notes</Text>
                <Text style={detailValue}>{booking.specialNotes}</Text>
              </>
            )}
          </Container>

          <Text style={text}>
            Please confirm your availability and review the full booking details in your dashboard.
          </Text>

          {dashboardUrl && (
            <Button style={{ ...button, backgroundColor: accentColour }} href={dashboardUrl}>
              View in Dashboard
            </Button>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            {branding.companyName} - You have been assigned to this booking. Please confirm your availability.
            {branding.showPoweredBy && (
              <>
                {' | Powered by '}
                <Link href="https://sitemedic.co.uk" style={{ color: '#64748b' }}>SiteMedic</Link>
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const brandHeader = {
  textAlign: 'center' as const,
  padding: '24px 48px 0',
  margin: '0 0 8px',
};

const logoImg = {
  margin: '0 auto',
  maxHeight: '60px',
};

const companyNameText = {
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1e293b',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  padding: '0 48px',
  margin: '0 0 16px',
};

const detailsBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 48px',
};

const detailLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
};

const detailValue = {
  fontSize: '16px',
  fontWeight: '500',
  color: '#1e293b',
  margin: '0 0 16px',
};

const button = {
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '24px 48px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 48px',
};

const footer = {
  color: '#64748b',
  fontSize: '14px',
  textAlign: 'center' as const,
  padding: '0 48px',
  margin: '0',
};
