/**
 * Booking Confirmation Email Template
 * Phase 4.5: Client-facing confirmation email with booking details
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Text,
} from '@react-email/components';

interface BookingConfirmationEmailProps {
  booking: {
    date: string;
    startTime: string;
    endTime: string;
    siteName: string;
    siteAddress: string;
    what3wordsAddress?: string;
  };
  client: {
    name: string;
  };
  medic: {
    name: string;
  };
  pricing: {
    total: number;
  };
  confirmationUrl?: string;
}

export default function BookingConfirmationEmail({
  booking,
  client,
  medic,
  pricing,
  confirmationUrl,
}: BookingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Booking Confirmed</Heading>

          <Text style={text}>
            Hi {client.name},
          </Text>

          <Text style={text}>
            Your medic booking has been confirmed! Here are the details:
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
              {booking.what3wordsAddress && (
                <>
                  <br />
                  <strong>what3words:</strong>{' '}
                  <a
                    href={`https://what3words.com/${booking.what3wordsAddress.replace(/^\/+/, '')}`}
                    style={{ color: '#2563eb', textDecoration: 'underline' }}
                  >
                    {booking.what3wordsAddress}
                  </a>
                </>
              )}
            </Text>

            <Text style={detailLabel}>Assigned Medic</Text>
            <Text style={detailValue}>{medic.name}</Text>

            <Text style={detailLabel}>Total</Text>
            <Text style={detailValue}>£{pricing.total.toFixed(2)}</Text>
          </Container>

          <Text style={text}>
            Your medic will arrive at the site at {booking.startTime}. A calendar invite has been attached to this email.
          </Text>

          {confirmationUrl && (
            <Button style={button} href={confirmationUrl}>
              View Booking
            </Button>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Apex Safety Group Ltd - UK paramedic staffing with built-in compliance
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
  backgroundColor: '#2563eb',
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
