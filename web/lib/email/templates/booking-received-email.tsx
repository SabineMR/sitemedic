/**
 * Booking Received Email Template
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

interface BookingReceivedEmailProps {
  booking: {
    date: string;
    startTime: string;
    endTime: string;
    siteName: string;
    siteAddress: string;
  };
  client: {
    name: string;
  };
  dashboardUrl?: string;
  branding: EmailBranding;
}

export default function BookingReceivedEmail({
  booking,
  client,
  dashboardUrl,
  branding,
}: BookingReceivedEmailProps) {
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

          <Heading style={heading}>Booking Received</Heading>

          <Text style={text}>Hi {client.name},</Text>

          <Text style={text}>
            We&apos;ve received your booking request and are now confirming your medic.
            You&apos;ll receive another email once your medic has been assigned.
          </Text>

          <Container style={detailsBox}>
            <Text style={detailLabel}>Date</Text>
            <Text style={detailValue}>{booking.date}</Text>

            <Text style={detailLabel}>Time</Text>
            <Text style={detailValue}>{booking.startTime} - {booking.endTime}</Text>

            <Text style={detailLabel}>Location</Text>
            <Text style={detailValue}>
              {booking.siteName}<br />
              {booking.siteAddress}
            </Text>
          </Container>

          <Text style={text}>
            Our team typically confirms medic assignments within 2 hours during business hours.
            If you have any urgent queries, please contact us directly.
          </Text>

          {dashboardUrl && (
            <Button style={{ ...button, backgroundColor: accentColour }} href={dashboardUrl}>
              View Dashboard
            </Button>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            {branding.companyName}{branding.tagline ? ` \u2014 ${branding.tagline}` : ''}
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
