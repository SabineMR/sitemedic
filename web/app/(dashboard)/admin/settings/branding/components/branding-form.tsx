'use client';

/**
 * Branding Form Component
 *
 * Reusable form for configuring org branding (company name, colour, tagline, logo).
 * Features auto-save (500ms debounce) for text fields and explicit logo upload.
 *
 * Props:
 *   - orgId: Organization ID (required)
 *   - apiEndpoint: API endpoint for save requests (default: /api/admin/branding)
 *   - initialData: Initial form values (company_name, primary_colour_hex, tagline, logo_path)
 *   - onPreviewChange: Callback fired on every state change for live preview updates
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const HEX_COLOUR_REGEX = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

interface BrandingFormProps {
  orgId: string;
  apiEndpoint?: string;
  initialData?: {
    company_name: string | null;
    primary_colour_hex: string | null;
    tagline: string | null;
    logo_path: string | null;
  };
  onPreviewChange?: (branding: PreviewBranding) => void;
}

export interface PreviewBranding {
  companyName: string;
  primaryColour: string;
  tagline: string;
  logoUrl: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export function BrandingForm({
  orgId,
  apiEndpoint = '/api/admin/branding',
  initialData,
  onPreviewChange,
}: BrandingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedRef = useRef(false);

  // Form state
  const [companyName, setCompanyName] = useState(initialData?.company_name ?? '');
  const [primaryColour, setPrimaryColour] = useState(initialData?.primary_colour_hex ?? '#2563eb');
  const [tagline, setTagline] = useState(initialData?.tagline ?? '');

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [existingLogoPath, setExistingLogoPath] = useState<string | null>(
    initialData?.logo_path ?? null
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Initialize logo preview from existing logo_path
  useEffect(() => {
    if (initialData?.logo_path && !logoPreviewUrl) {
      const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/org-logos/${initialData.logo_path}`;
      setLogoPreviewUrl(logoUrl);
    }
  }, [initialData?.logo_path, logoPreviewUrl]);

  // Live preview callback on every change
  useEffect(() => {
    if (onPreviewChange) {
      onPreviewChange({
        companyName: companyName.trim() || 'Your Company',
        primaryColour: HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : '#2563eb',
        tagline: tagline.trim() || '',
        logoUrl: logoPreviewUrl || '',
      });
    }
  }, [companyName, primaryColour, tagline, logoPreviewUrl, onPreviewChange]);

  // Auto-save text fields with 500ms debounce
  useEffect(() => {
    // Skip the first render to avoid saving initial state
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new save timer
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        // Validate hex colour before sending
        const validColour = HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : null;

        const response = await fetch(apiEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: companyName.trim(),
            primary_colour_hex: validColour,
            tagline: tagline.trim() || null,
          }),
        });

        if (!response.ok) {
          console.error('Auto-save failed:', response.statusText);
          setSaveStatus('idle');
          return;
        }

        setSaveStatus('saved');

        // Reset to idle after 2s
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Auto-save error:', error);
        setSaveStatus('idle');
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [companyName, primaryColour, tagline, apiEndpoint]);

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

  async function handleUploadLogo() {
    if (!logoFile || !orgId) return;

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
      const storagePath = `${orgId}/logo.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(storagePath, logoFile, {
          upsert: true,
          contentType: logoFile.type,
        });

      if (uploadError) {
        console.error('Logo upload failed:', uploadError);
        toast.error('Failed to upload logo');
        setUploadingLogo(false);
        return;
      }

      // Update org_branding.logo_path via API
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_path: storagePath,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update logo_path');
        toast.error('Failed to save logo path');
        setUploadingLogo(false);
        return;
      }

      // Update state to reflect saved logo
      setExistingLogoPath(storagePath);
      setLogoFile(null);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleResetColour() {
    setPrimaryColour('#2563eb');
  }

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3 mb-2">
          <input
            type="color"
            value={HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : '#2563eb'}
            onChange={(e) => setPrimaryColour(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-700/50 cursor-pointer bg-transparent p-0.5"
          />
          <input
            id="primary-colour"
            type="text"
            value={primaryColour}
            onChange={(e) => setPrimaryColour(e.target.value)}
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
        <button
          type="button"
          onClick={handleResetColour}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Reset to SiteMedic Defaults
        </button>
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Choose/Change Logo button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-gray-300 text-sm hover:border-blue-600/50 hover:text-white transition-all mb-2"
        >
          {logoPreviewUrl ? (
            <>
              <ImageIcon className="w-4 h-4" />
              Change Logo
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Choose Logo
            </>
          )}
        </button>

        {/* Upload button (shown only when new file selected) */}
        {logoFile && (
          <button
            type="button"
            onClick={handleUploadLogo}
            disabled={uploadingLogo}
            className="ml-2 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white text-sm transition-all"
          >
            {uploadingLogo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Logo
              </>
            )}
          </button>
        )}

        <p className="text-gray-500 text-xs mt-2">
          PNG, JPEG, or SVG. Max 2MB.
        </p>
      </div>

      {/* Save status indicator */}
      <div className="flex items-center gap-2 text-sm">
        {saveStatus === 'saving' && (
          <span className="text-gray-400">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <>
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-gray-300">All changes saved</span>
          </>
        )}
      </div>
    </div>
  );
}
