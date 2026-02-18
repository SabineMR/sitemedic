/**
 * Booking Cancelled Email Template
 * Sprint 5: Cancellation confirmation with refund details
 */

import {
  Body,
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

interface BookingCancelledEmailProps {
  booking: {
    date: string;
    startTime: string;
    endTime: string;
    siteName: string;
  };
  client: {
    name: string;
  };
  refund: {
    percent: number;
    amount: number;
  };
  reason?: string;
  branding: EmailBranding;
}

export default function BookingCancelledEmail({
  booking,
  client,
  refund,
  reason,
  branding,
}: BookingCancelledEmailProps) {
  const accentColour = branding.primaryColourHex || '#2563eb';

  const refundLabel =
    refund.percent === 100
      ? 'Full refund'
      : refund.percent > 0
        ? `${refund.percent}% partial refund`
        : 'No refund applicable';

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

          <Heading style={heading}>Booking Cancelled</Heading>

          <Text style={text}>
            Hi {client.name},
          </Text>

          <Text style={text}>
            Your booking has been cancelled. Here are the details:
          </Text>

          <Container style={detailsBox}>
            <Text style={detailLabel}>Booking</Text>
            <Text style={detailValue}>
              {booking.siteName} — {booking.date}
              <br />
              {booking.startTime} - {booking.endTime}
            </Text>

            {reason && (
              <>
                <Text style={detailLabel}>Reason</Text>
                <Text style={detailValue}>{reason}</Text>
              </>
            )}

            <Text style={detailLabel}>Refund</Text>
            <Text style={detailValue}>
              {refundLabel}
              {refund.amount > 0 && (
                <>
                  {' — '}
                  {'\u00A3'}{refund.amount.toFixed(2)} will be returned to your original payment method within 5-10 business days.
                </>
              )}
              {refund.amount === 0 && (
                <>
                  {' — '}
                  As per our refund policy, cancellations within 72 hours of the shift are non-refundable.
                </>
              )}
            </Text>
          </Container>

          <Text style={text}>
            If you have any questions about this cancellation or need to rebook, please contact us.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            {branding.companyName}{branding.tagline ? ` - ${branding.tagline}` : ''}
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
  backgroundColor: '#fef2f2',
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
