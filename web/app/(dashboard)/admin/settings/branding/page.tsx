'use client';

/**
 * Branding Settings Page
 *
 * Org admin interface for configuring portal branding.
 * Accessible at /admin/settings/branding for Growth-tier and above orgs.
 *
 * Layout:
 *   - Header with Palette icon and description
 *   - Back link to /admin/settings
 *   - TierGate wrapping responsive grid (form left, preview right sticky)
 *   - Loading state with spinner
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Palette, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TierGate } from '@/components/billing/tier-gate';
import { type SubscriptionTier } from '@/lib/billing/feature-gates';
import { BrandingForm, type PreviewBranding } from './components/branding-form';
import { BrandingPreview } from './components/branding-preview';

interface BrandingData {
  company_name: string | null;
  primary_colour_hex: string | null;
  tagline: string | null;
  logo_path: string | null;
}

export default function BrandingSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialBranding, setInitialBranding] = useState<BrandingData | null>(null);
  const [previewBranding, setPreviewBranding] = useState<PreviewBranding>({
    companyName: '',
    primaryColour: '#2563eb',
    tagline: '',
    logoUrl: '',
  });

  // Load org info and subscription tier on mount
  useEffect(() => {
    async function loadOrgData() {
      try {
        const supabase = createClient();

        // Get org_id from authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return;
        }

        const userOrgId = user.app_metadata?.org_id;
        if (!userOrgId) {
          return;
        }

        setOrgId(userOrgId);

        // Fetch subscription tier
        try {
          const tierRes = await fetch('/api/admin/subscription');
          if (tierRes.ok) {
            const tierData = await tierRes.json();
            setSubscriptionTier(tierData.subscription_tier ?? 'starter');
          }
        } catch (err) {
          console.error('Error fetching subscription tier:', err);
        }

        // Fetch initial branding data
        try {
          const brandingRes = await fetch('/api/admin/branding');
          if (brandingRes.ok) {
            const brandingData: BrandingData = await brandingRes.json();
            setInitialBranding(brandingData);

            // Set initial preview
            const logoUrl = brandingData.logo_path
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/org-logos/${brandingData.logo_path}`
              : '';

            setPreviewBranding({
              companyName: brandingData.company_name || 'Your Company',
              primaryColour: brandingData.primary_colour_hex || '#2563eb',
              tagline: brandingData.tagline || '',
              logoUrl,
            });
          }
        } catch (err) {
          console.error('Error fetching branding:', err);
        }
      } catch (err) {
        console.error('Error loading org data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrgData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading branding settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Back link */}
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-2 text-gray-400 text-sm hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Palette className="w-6 h-6 text-pink-400" />
          Branding Settings
        </h1>
        <p className="text-gray-400 text-sm">
          Customise your portal's look — logo, colours, company name, and tagline. Changes auto-save as you type.
        </p>
      </div>

      {/* Tier gate wrapping form + preview */}
      <TierGate
        feature="white_label"
        tier={subscriptionTier as SubscriptionTier | null}
        upgradeMessage="Upgrade to the Growth plan to customise your portal branding, logo, and colours."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form column */}
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
            {orgId && initialBranding ? (
              <BrandingForm
                orgId={orgId}
                initialData={initialBranding}
                onPreviewChange={setPreviewBranding}
              />
            ) : null}
          </div>

          {/* Preview column (sticky on large screens) */}
          <div className="lg:sticky lg:top-8">
            <BrandingPreview branding={previewBranding} />
          </div>
        </div>
      </TierGate>
    </div>
  );
}
