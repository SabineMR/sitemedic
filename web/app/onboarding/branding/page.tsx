/**
 * Branding Setup Page (Onboarding)
 *
 * Allows new org admins to configure their branding while waiting for
 * platform admin activation. Updates the existing org_branding row
 * (created by the checkout route in 29-01).
 *
 * Features:
 *   - Company name input (pre-populated from org_branding)
 *   - Primary colour picker (hex input + visual picker)
 *   - Tagline input (optional)
 *   - Logo upload (png/jpeg/svg, max 2MB, stored in org-logos bucket)
 *
 * Route: /onboarding/branding
 * Access: Authenticated users with onboarding_completed=false
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const HEX_COLOUR_REGEX = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

interface OrgBranding {
  company_name: string | null;
  primary_colour_hex: string | null;
  tagline: string | null;
  logo_path: string | null;
}

export default function OnboardingBrandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [primaryColour, setPrimaryColour] = useState('#2563eb');
  const [tagline, setTagline] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [existingLogoPath, setExistingLogoPath] = useState<string | null>(null);

  // Load existing branding on mount
  useEffect(() => {
    async function loadBranding() {
      try {
        const supabase = createClient();

        // Get org_id from authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.replace('/login');
          return;
        }

        const userOrgId = user.app_metadata?.org_id;
        if (!userOrgId) {
          toast.error('No organisation found. Please complete signup first.');
          router.replace('/setup/organization');
          return;
        }

        setOrgId(userOrgId);

        // Fetch existing branding
        const { data: branding, error: brandingError } = await supabase
          .from('org_branding')
          .select('company_name, primary_colour_hex, tagline, logo_path')
          .eq('org_id', userOrgId)
          .single();

        if (brandingError) {
          console.warn('Failed to fetch branding:', brandingError);
          // Continue with defaults — row may not exist yet
        }

        if (branding) {
          setCompanyName(branding.company_name ?? '');
          setPrimaryColour(branding.primary_colour_hex ?? '#2563eb');
          setTagline(branding.tagline ?? '');
          setExistingLogoPath(branding.logo_path);

          // Construct preview URL from existing logo
          if (branding.logo_path) {
            const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/org-logos/${branding.logo_path}`;
            setLogoPreviewUrl(logoUrl);
          }
        }
      } catch (err) {
        console.error('Error loading branding:', err);
        toast.error('Failed to load branding settings.');
      } finally {
        setLoading(false);
      }
    }

    loadBranding();
  }, [router]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a PNG, JPEG, or SVG image.');
      return;
    }

    // Validate size
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo must be under 2MB.');
      return;
    }

    setLogoFile(file);

    // Create local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleColourChange(hex: string) {
    // Allow partial typing — only validate on save
    setPrimaryColour(hex);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!orgId) {
      toast.error('Organisation not found. Please refresh the page.');
      return;
    }

    if (!companyName.trim()) {
      toast.error('Company name is required.');
      return;
    }

    // Validate colour format (XSS defence — same regex as BrandingProvider Phase 27-01)
    if (primaryColour && !HEX_COLOUR_REGEX.test(primaryColour)) {
      toast.error('Colour must be a valid hex code (e.g. #2563eb).');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      let logoPath = existingLogoPath;

      // Upload logo if a new file was selected
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
        const storagePath = `${orgId}/logo.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('org-logos')
          .upload(storagePath, logoFile, {
            upsert: true, // Overwrite existing logo
            contentType: logoFile.type,
          });

        if (uploadError) {
          console.error('Logo upload failed:', uploadError);
          toast.error('Failed to upload logo. Saving other settings...');
        } else {
          logoPath = storagePath;
        }
      }

      // Update org_branding row (already exists from checkout route)
      const updateData: Record<string, string | null> = {
        company_name: companyName.trim(),
        primary_colour_hex: primaryColour || null,
        tagline: tagline.trim() || null,
      };

      // Only update logo_path if we uploaded a new one
      if (logoPath !== existingLogoPath) {
        updateData.logo_path = logoPath;
      }

      const { error: updateError } = await supabase
        .from('org_branding')
        .update(updateData)
        .eq('org_id', orgId);

      if (updateError) {
        console.error('Failed to update branding:', updateError);
        toast.error('Failed to save branding. Please try again.');
        setSaving(false);
        return;
      }

      toast.success('Branding saved!');
      setExistingLogoPath(logoPath);
      setLogoFile(null);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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
        href="/onboarding"
        className="inline-flex items-center gap-2 text-gray-400 text-sm hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Set Up Your Branding</h1>
        <p className="text-gray-400 text-sm">
          Customise how your portal looks to your team. You can change these settings later from your admin panel.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-6">
        {/* Company Name */}
        <div>
          <label htmlFor="company-name" className="text-gray-300 text-sm font-medium block mb-1.5">
            Company Name <span className="text-red-400">*</span>
          </label>
          <input
            id="company-name"
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Apex Safety Group Ltd"
            className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Primary Colour */}
        <div>
          <label htmlFor="primary-colour" className="text-gray-300 text-sm font-medium block mb-1.5">
            Primary Colour
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : '#2563eb'}
              onChange={(e) => handleColourChange(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-700/50 cursor-pointer bg-transparent p-0.5"
            />
            <input
              id="primary-colour"
              type="text"
              value={primaryColour}
              onChange={(e) => handleColourChange(e.target.value)}
              placeholder="#2563eb"
              maxLength={7}
              className="flex-1 px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
            <div
              className="w-10 h-10 rounded-lg border border-gray-700/50 flex-shrink-0"
              style={{
                backgroundColor: HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : '#2563eb',
              }}
              title="Colour preview"
            />
          </div>
          <p className="text-gray-500 text-xs mt-1.5">
            Used for buttons, links, and accents across your portal.
          </p>
        </div>

        {/* Tagline */}
        <div>
          <label htmlFor="tagline" className="text-gray-300 text-sm font-medium block mb-1.5">
            Tagline <span className="text-gray-600">(optional)</span>
          </label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Professional event medical services"
            className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="text-gray-300 text-sm font-medium block mb-1.5">
            Logo <span className="text-gray-600">(optional)</span>
          </label>

          {/* Logo preview */}
          {logoPreviewUrl && (
            <div className="mb-3 flex items-center gap-4">
              <div className="w-[120px] h-[120px] rounded-xl border border-gray-700/50 bg-gray-900/50 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreviewUrl}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="text-sm text-gray-400">
                {logoFile ? (
                  <span>{logoFile.name} ({(logoFile.size / 1024).toFixed(0)} KB)</span>
                ) : existingLogoPath ? (
                  <span>Current logo</span>
                ) : null}
              </div>
            </div>
          )}

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-gray-300 text-sm hover:border-blue-600/50 hover:text-white transition-all"
          >
            {logoPreviewUrl ? (
              <>
                <ImageIcon className="w-4 h-4" />
                Change Logo
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Logo
              </>
            )}
          </button>
          <p className="text-gray-500 text-xs mt-1.5">
            PNG, JPEG, or SVG. Max 2MB. Displayed in your portal header, PDFs, and emails.
          </p>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Branding
            </>
          )}
        </button>
      </form>
    </div>
  );
}
