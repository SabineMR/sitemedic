'use client';

/**
 * Branding Preview Component
 *
 * Displays a live preview of the branding configuration with:
 * - Portal header mockup (with logo, company name, tagline)
 * - Sidebar accent mockup (colour swatches)
 * - Browser tab mockup
 */

import { PreviewBranding } from './branding-form';

interface BrandingPreviewProps {
  branding: PreviewBranding;
}

export function BrandingPreview({ branding }: BrandingPreviewProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Live Preview</h3>

        {/* Browser tab mockup */}
        <div className="mb-6 flex items-center gap-2">
          <div className="text-xs text-gray-500 bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1">
            {branding.companyName} — SiteMedic
          </div>
        </div>

        {/* Portal header mockup */}
        <div
          className="rounded-xl p-6 mb-6 flex items-center gap-4"
          style={{ backgroundColor: branding.primaryColour }}
        >
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt="Logo"
              className="h-8 object-contain"
            />
          ) : (
            <div className="h-8 w-24 bg-white/20 rounded flex items-center justify-center text-white text-xs font-medium">
              Logo
            </div>
          )}
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">{branding.companyName}</div>
            {branding.tagline && (
              <div className="text-white/80 text-xs mt-0.5">{branding.tagline}</div>
            )}
          </div>
        </div>

        {/* Sidebar accent mockup */}
        <div className="space-y-2 mb-6">
          <div
            className="h-8 rounded-lg"
            style={{ backgroundColor: branding.primaryColour }}
          />
          <div className="h-8 rounded-lg bg-gray-700" />
          <div className="h-8 rounded-lg bg-gray-700" />
        </div>

        {/* Footer text */}
        <p className="text-xs text-gray-500">Changes update in real-time</p>
      </div>
    </div>
  );
}
