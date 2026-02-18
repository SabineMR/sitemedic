/**
 * Welcome Email Template
 * Phase 29: Org Onboarding Flow
 *
 * Sent to org admin when platform admin activates their organisation.
 * Supports org branding (logo, primary colour) with SiteMedic defaults.
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
  Section,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  orgAdmin: {
    name: string;
  };
  org: {
    companyName: string;
    planName: string;
    loginUrl: string;
  };
  branding?: {
    primaryColour?: string;
    logoUrl?: string;
  };
}

export default function WelcomeEmail({
  orgAdmin,
  org,
  branding,
}: WelcomeEmailProps) {
  const accentColour = branding?.primaryColour || '#2563eb';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Branded header */}
          <Container style={brandHeader}>
            {branding?.logoUrl ? (
              <Img
                src={branding.logoUrl}
                alt={org.companyName}
                width="150"
                style={logoImg}
              />
            ) : null}
          </Container>

          <Heading style={heading}>Welcome to SiteMedic</Heading>

          <Text style={text}>Hi {orgAdmin.name},</Text>

          <Text style={text}>
            Your {org.companyName} account on SiteMedic is now active! You&apos;re
            on the <strong>{org.planName}</strong> plan.
          </Text>

          {/* Account details box */}
          <Container style={detailsBox}>
            <Text style={detailLabel}>Plan</Text>
            <Text style={detailValue}>{org.planName}</Text>

            <Text style={detailLabel}>Login URL</Text>
            <Text style={detailValue}>{org.loginUrl}</Text>
          </Container>

          {/* Getting Started Guide */}
          <Section style={guideSection}>
            <Text style={guideSectionHeading}>Getting Started</Text>

            <Text style={guideStep}>
              <strong>1. Set up your branding</strong> — Upload your logo and
              choose your brand colour in Settings
            </Text>

            <Text style={guideStep}>
              <strong>2. Invite your team</strong> — Add medics and admins from
              the Users page
            </Text>

            <Text style={guideStep}>
              <strong>3. Create your first booking</strong> — Start managing site
              safety from the Dashboard
            </Text>
          </Section>

          {/* CTA Button */}
          <Button
            style={{ ...button, backgroundColor: accentColour }}
            href={org.loginUrl}
          >
            Log In to Your Dashboard
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            Powered by SiteMedic &mdash; UK paramedic staffing with built-in
            compliance
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const guideSection = {
  padding: '0 48px',
  margin: '8px 0 16px',
};

const guideSectionHeading = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#1e293b',
  margin: '0 0 12px',
};

const guideStep = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#334155',
  margin: '0 0 10px',
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
