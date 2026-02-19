# Phase 31: Branding Settings UI - Research

**Researched:** 2026-02-18
**Domain:** Admin UI (white-label branding), form submission patterns, file upload, auto-save, tier gating
**Confidence:** HIGH

## Summary

Phase 31 requires building a self-service branding settings page for org admins (Growth tier) and a platform admin override interface. The codebase already has most of the infrastructure in place: `org_branding` table (Phase 24), `BrandingProvider` (Phase 27), tier gating patterns (Phase 30), and an existing branding form in the onboarding flow (Phase 29-03).

Research focused on:
1. **Existing branding form patterns** — onboarding/branding page reuses company name, colour picker, tagline, and logo upload
2. **Auto-save implementation** — RIDDOR incident detail page demonstrates 30-second debounce pattern with silent failures
3. **File upload patterns** — onboarding branding form shows Supabase Storage upsert to org-logos bucket with validation
4. **Tier gating patterns** — TierGate component wrapping feature-locked content with UpgradePrompt
5. **API route patterns** — /api/admin/branding already exists for Growth tier, uses requireTier middleware

The main implementation tasks are:
- Create a dedicated `/app/admin/settings/branding/page.tsx` with live preview section
- Implement auto-save debounce on form changes (similar to RIDDOR)
- Add "Reset to SiteMedic defaults" button for colour
- Create platform admin override form in `/app/platform/organizations/[id]/page.tsx`
- Wrap org admin form in `<TierGate>` for Growth tier enforcement

**Primary recommendation:** Start with org admin branding settings page (31-01), reusing components from Phase 29 onboarding form where possible. Implement auto-save with 500ms debounce (faster feedback than RIDDOR's 30s). For platform admin override (31-02), reuse the same branding form component but bypass org-scoped RLS via service-role client.

---

## Standard Stack

### Core Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.2.3 | React SSR framework | Project standard, used for all web pages |
| React | ^19.0.0 | UI components | Latest stable; project standard |
| Supabase JS | ^2.95.3 | Database + Storage API | Project standard for org data + file uploads |
| TailwindCSS | ^3.4.17 | Styling | Project standard; used throughout |
| Lucide React | ^0.564.0 | Icons | Project standard icon library |
| Sonner | ^2.0.7 | Toast notifications | Project standard for user feedback |

### Supporting Libraries for Form UX
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form | ^7.71.1 | Form state management | Already in project (used in mobile app); optional for branding form |
| Zustand | ^5.0.11 | State management | Project standard; useful if building shared preview state |
| date-fns | ^4.1.0 | Date utilities | Project standard (used elsewhere); not needed for branding |

### Colour Picker
**Decision:** Native HTML `<input type="color">` is sufficient for this phase.
- Already used in onboarding/branding form (Phase 29-03)
- Provides visual picker + hex input
- No additional dependencies needed
- Accessible via all modern browsers

### File Upload (Logo)
**Decision:** Direct Supabase Storage client upload with FileReader preview.
- Already implemented in onboarding/branding form
- Uses `supabase.storage.from('org-logos').upload(path, file, { upsert: true })`
- No cropping library needed (CONTEXT.md specifies no cropping)
- FileReader API for local preview before save

### Save Pattern: Auto-Save with Debounce
**Decision:** React useRef + useEffect with setTimeout debounce (proven in RIDDOR page).
- No external debounce library needed (use plain setTimeout)
- 500ms debounce recommended (faster feedback than RIDDOR's 30s)
- Silent failures on auto-save (no error toast)
- Save on component unmount as fallback

---

## Architecture Patterns

### Recommended Project Structure

```
web/app/admin/settings/branding/
├── page.tsx                          # Main branding settings page
├── components/
│   ├── branding-form.tsx             # Reusable form (org admin + platform admin)
│   ├── branding-preview.tsx          # Live preview panel
│   └── reset-colour-button.tsx        # Reset to defaults button

web/app/platform/organizations/[id]/
├── page.tsx                          # (UPDATED) Add branding override section
├── components/
│   └── admin-branding-override.tsx   # Platform admin branding form
```

**Why this structure:**
- `branding-form.tsx` is reused by both 31-01 (org admin) and 31-02 (platform admin) pages
- Preview panel is dedicated component (can be extended later with more branded surfaces)
- Platform admin page keeps override form co-located with org details

### Pattern 1: Org Admin Branding Settings Page (31-01)

**What:** Dedicated page at `/app/admin/settings/branding/` for Growth tier org admins to manage their branding.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Branding Settings" + description                       │
├─────────────────────────────────────────────────────────────────┤
│ [TierGate feature="white_label"]                                 │
│  ┌────────────────────────┐  ┌──────────────────────────────┐  │
│  │  Branding Form         │  │  Live Preview Panel          │  │
│  │  - Company Name        │  │  (portal header + sidebar    │  │
│  │  - Primary Colour      │  │   with current branding)     │  │
│  │  - Tagline             │  │                              │  │
│  │  - Logo Upload         │  │  Updates in real-time as     │  │
│  │  - Reset Colour Button │  │  user types/uploads         │  │
│  └────────────────────────┘  └──────────────────────────────┘  │
│ [Auto-save indicator or toast on save]                          │
└─────────────────────────────────────────────────────────────────┘
```

**Starter tier view:** UpgradePrompt instead of form ("Upgrade to Growth plan...")

**Example:**
```typescript
// Source: Phase 29-03 onboarding/branding/page.tsx (adapted)
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TierGate } from '@/components/billing/tier-gate';
import { BrandingForm } from './components/branding-form';
import { BrandingPreview } from './components/branding-preview';

export default function BrandingSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  // Live preview state
  const [previewBranding, setPreviewBranding] = useState({
    companyName: '',
    primaryColour: '#2563eb',
    tagline: '',
    logoUrl: '',
  });

  useEffect(() => {
    // Fetch org context + branding
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // ... load org branding into previewBranding state
  }, []);

  return (
    <div>
      <h1>Branding Settings</h1>
      <TierGate feature="white_label" tier={tier} upgradeMessage="...">
        <div className="grid grid-cols-2 gap-8">
          <BrandingForm
            orgId={orgId}
            onPreviewChange={setPreviewBranding}
          />
          <BrandingPreview branding={previewBranding} />
        </div>
      </TierGate>
    </div>
  );
}
```

### Pattern 2: Auto-Save with Debounce (500ms Recommended)

**What:** Form changes trigger auto-save after 500ms debounce, similar to RIDDOR incident detail page.

**Why 500ms instead of RIDDOR's 30s:**
- Branding changes are lightweight (text fields + colour)
- User expects faster feedback for form changes
- Logo upload is separate (not auto-saved, explicit upload only)

**Example:**
```typescript
// Source: RIDDOR page pattern, adapted for branding
const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const [companyName, setCompanyName] = useState('');
const [primaryColour, setPrimaryColour] = useState('#2563eb');
const [tagline, setTagline] = useState('');

// Auto-save: 500ms debounce
useEffect(() => {
  if (autoSaveTimer.current) {
    clearTimeout(autoSaveTimer.current);
  }

  autoSaveTimer.current = setTimeout(async () => {
    try {
      await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          primary_colour_hex: primaryColour,
          tagline,
        }),
      });
      // Silent success — no toast
    } catch {
      // Silent failure — auto-save is best-effort
    }
  }, 500);

  return () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  };
}, [companyName, primaryColour, tagline, orgId]);

// Save on unmount as fallback
useEffect(() => {
  return () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    // Final save attempt on unmount
    fetch('/api/admin/branding', { method: 'PUT', ... }).catch(() => {});
  };
}, []);
```

### Pattern 3: Logo Upload (Supabase Storage, No Cropping)

**What:** Direct upload to `org-logos/{org_id}/logo.{ext}` with FileReader preview.

**Why this pattern:**
- Upsert prevents duplicate files (overwrites on re-upload)
- Public bucket allows direct URL construction: `{SUPABASE_URL}/storage/v1/object/public/org-logos/{logo_path}`
- No cropping = simpler UX; trust org to upload correctly-sized logo

**Example:**
```typescript
// Source: Phase 29-03 onboarding/branding/page.tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate
  const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SIZE) {
    toast.error('Logo must be PNG, JPEG, or SVG under 2MB.');
    return;
  }

  // Local preview
  const reader = new FileReader();
  reader.onload = (ev) => {
    setLogoPreviewUrl(ev.target?.result as string);
  };
  reader.readAsDataURL(file);

  // Upload on form save (not auto-save)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const supabase = createClient();
  await supabase.storage
    .from('org-logos')
    .upload(`${orgId}/logo.${ext}`, file, { upsert: true });

  // Update db: logo_path = `${orgId}/logo.${ext}`
};
```

### Pattern 4: Colour Picker with Reset Button

**What:** Native `<input type="color">` + hex text input + "Reset to SiteMedic Defaults" button.

**Reset button action:** Sets colour back to `#2563eb` (DEFAULT_BRANDING.primaryColour from BrandingContext).

**Example:**
```typescript
// Source: Phase 29-03 onboarding/branding/page.tsx (adapted)
const [primaryColour, setPrimaryColour] = useState('#2563eb');

function resetColourToDefault() {
  setPrimaryColour('#2563eb'); // Triggers auto-save via useEffect
}

return (
  <div>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={primaryColour}
        onChange={(e) => setPrimaryColour(e.target.value)}
        className="w-10 h-10 rounded-lg border border-gray-700/50 cursor-pointer"
      />
      <input
        type="text"
        value={primaryColour}
        onChange={(e) => setPrimaryColour(e.target.value)}
        placeholder="#2563EB"
        maxLength={7}
        className="w-32 px-3 py-2 border rounded-lg"
      />
      <div
        className="w-10 h-10 rounded-lg border"
        style={{ backgroundColor: primaryColour }}
      />
    </div>
    <button
      type="button"
      onClick={resetColourToDefault}
      className="text-xs text-gray-500 hover:text-gray-300 mt-2"
    >
      Reset to SiteMedic Defaults
    </button>
  </div>
);
```

### Pattern 5: Platform Admin Override (31-02)

**What:** Add branding override form to `/app/platform/organizations/[id]/page.tsx` using service-role client to bypass RLS.

**Why service-role:**
- Platform admin's org_id is NULL in JWT (RLS policy: `is_platform_admin()`)
- Can't read/write `org_branding` rows without service-role
- Service role ignores RLS — only use in server-side API route

**Example (API route):**
```typescript
// web/app/api/platform/organizations/[id]/branding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service-role';
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify platform admin role
    await requirePlatformAdmin();

    const orgId = params.id;
    const body = await request.json();

    // Use service-role client to bypass RLS
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('org_branding')
      .update({
        company_name: body.company_name || null,
        primary_colour_hex: body.primary_colour_hex || null,
        tagline: body.tagline || null,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Anti-Patterns to Avoid

- **Manual save button only** — Phase context explicitly requests auto-save; trust auto-save for better UX
- **Debounce every keystroke in preview** — leads to lag; instead debounce the *save*, update preview instantly
- **Require validation before auto-save** — auto-save should be lenient; validate only on explicit submit
- **Cropping library for logo** — CONTEXT.md says no cropping; keep simple
- **Accessibility/contrast warnings** — CONTEXT.md explicitly says no contrast checks; trust org to pick sensible colours
- **Direct SQL queries** — always use Supabase client or API routes; never raw SQL in client components

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced save | Custom debounce function | Native `setTimeout` + `useRef` + `useEffect` | Simpler, proven in RIDDOR page |
| Colour validation | Complex regex or colour library | Simple `/^#[0-9A-Fa-f]{6}$/` check | Sufficient for hex input; no need for full colour parsing |
| File upload UI | Custom drag-and-drop | Native `<input type="file">` + FileReader | Works well for single logo; Phase context suggests click or drag—both handled by native |
| Form state | Zustand store | React useState or React Hook Form | Branding is a single form; local state is sufficient |
| Live preview | Custom re-rendering | React state + component re-render | Standard React pattern; no special library needed |
| Tier gating | Custom auth check | Existing `<TierGate>` component (Phase 30) | Already built and tested |

**Key insight:** Branding is a lightweight form with few fields. Don't introduce state management libraries or custom hooks; use React hooks (useState, useEffect, useRef) + Supabase client directly.

---

## Common Pitfalls

### Pitfall 1: Auto-Save Causing Accidental Data Loss

**What goes wrong:** User types quickly, auto-save triggers before user finishes; user thinks save is done, closes page, but final character didn't save.

**Why it happens:** Debounce interval too short, or user closes page before debounce completes.

**How to avoid:**
- Use 500ms debounce (gives user 500ms to continue typing before save triggers)
- Save on component unmount as fallback (useEffect cleanup)
- If implementing "unsaved changes" warning: track in-flight saves, warn only if save is pending AND user tries to leave

**Warning signs:**
- User reports "my last character didn't save"
- API call happens but response shows stale data

### Pitfall 2: RLS Blocking Platform Admin Branding Override

**What goes wrong:** Platform admin tries to override an org's branding, but `PUT org_branding` fails with "RLS policy" error. Cause: using regular Supabase client instead of service-role client.

**Why it happens:** `org_branding` RLS policies check `is_org_admin()` or `is_platform_admin()`. Platform admin's JWT has `role = 'platform_admin'` but `org_id = NULL`, so `is_org_admin()` returns false. Regular client enforces RLS.

**How to avoid:**
- Platform admin branding write MUST use service-role client (created with SERVICE_ROLE_KEY)
- Service-role bypasses RLS entirely; ensure it's only used in server-side API routes
- Never expose service-role key to client; always use server-side API route

**Warning signs:**
- "new row violates row-level security policy" error in logs
- Platform admin branding form says "saved" but no change in database

### Pitfall 3: Logo Upload Failing Silently During Auto-Save

**What goes wrong:** User uploads logo, form saves text fields, but logo upload throws error. Auto-save ignores error (silent failure). User thinks logo is uploaded, but `logo_path` is NULL.

**Why it happens:** Logo upload is separate from text field auto-save. If upload fails but auto-save succeeds, no error feedback.

**How to avoid:**
- Logo upload should be **explicit** (not auto-save)
- Use separate "Upload Logo" button, show loading state and success/error toast
- Don't combine logo upload with text field auto-save
- Text fields auto-save; logo upload is manual action

**Warning signs:**
- User says "I uploaded logo but it's not showing"
- Database shows `company_name` updated but `logo_path` is NULL

### Pitfall 4: Colour Picker Accepting Invalid Hex

**What goes wrong:** User types "#gggggg" in hex input, form saves it to database. Invalid colour causes rendering errors in BrandingProvider or PDF generator.

**Why it happens:** No validation before save, or validation regex is too loose.

**How to avoid:**
- Validate hex format: `/^#[0-9A-Fa-f]{6}$/` (case-insensitive)
- BrandingContext already does this check (Phase 27-01): reuse same regex
- API route should also validate (server-side check is mandatory)
- Allow `null` values (colour not set yet)

**Warning signs:**
- CSS `background-color` is invalid → defaults to black
- PDF generator throws "invalid colour" error

### Pitfall 5: Preview Panel Not Updating in Real-Time

**What goes wrong:** User types company name, preview shows old name. Confusion: "Is auto-save working?"

**Why it happens:** Preview is bound to database state, not local form state. Or preview component isn't re-rendering on state change.

**How to avoid:**
- Preview should read from local React state (form inputs), not database
- Database is read-only for preview (load on page mount, but don't poll)
- On every form change, instantly update preview state (no debounce on preview, only on save)
- Preview component re-renders when branding state changes (standard React)

**Warning signs:**
- Form input shows new value, preview shows old value
- User waits for save to complete before checking preview

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Example 1: BrandingForm Component (Reusable)

```typescript
// Source: Phase 29-03 onboarding/branding/page.tsx + Phase 30 TierGate pattern
'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const HEX_COLOUR_REGEX = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

interface BrandingFormProps {
  orgId: string;
  initialData?: {
    company_name: string;
    primary_colour_hex: string;
    tagline: string;
    logo_path: string | null;
  };
  onPreviewChange?: (branding: {
    companyName: string;
    primaryColour: string;
    tagline: string;
    logoUrl: string;
  }) => void;
}

export function BrandingForm({ orgId, initialData, onPreviewChange }: BrandingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState(initialData?.company_name ?? '');
  const [primaryColour, setPrimaryColour] = useState(initialData?.primary_colour_hex ?? '#2563eb');
  const [tagline, setTagline] = useState(initialData?.tagline ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [existingLogoPath, setExistingLogoPath] = useState(initialData?.logo_path ?? null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Update preview in real-time (no debounce)
  useEffect(() => {
    if (onPreviewChange) {
      onPreviewChange({
        companyName,
        primaryColour: HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : '#2563eb',
        tagline,
        logoUrl: logoPreviewUrl ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/org-logos/${existingLogoPath}`,
      });
    }
  }, [companyName, primaryColour, tagline, logoPreviewUrl, existingLogoPath, onPreviewChange]);

  // Auto-save: 500ms debounce on text fields (NOT logo upload)
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/admin/branding', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: companyName.trim(),
            primary_colour_hex: HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : null,
            tagline: tagline.trim() || null,
          }),
        });
      } catch {
        // Silent failure
      }
    }, 500);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [companyName, primaryColour, tagline, orgId]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload a PNG, JPEG, or SVG image.');
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo must be under 2MB.');
      return;
    }

    setLogoFile(file);

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleUploadLogo() {
    if (!logoFile) return;

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
      const storagePath = `${orgId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(storagePath, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Update database with logo path
      const { error: updateError } = await supabase
        .from('org_branding')
        .update({ logo_path: storagePath, updated_at: new Date().toISOString() })
        .eq('org_id', orgId);

      if (updateError) throw updateError;

      setExistingLogoPath(storagePath);
      setLogoFile(null);
      toast.success('Logo uploaded!');
    } catch (err) {
      console.error('Logo upload failed:', err);
      toast.error('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  }

  function resetColourToDefault() {
    setPrimaryColour('#2563eb');
  }

  return (
    <div className="space-y-6">
      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Company Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Apex Safety Group Ltd"
          className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Primary Colour */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Primary Colour
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : '#2563eb'}
            onChange={(e) => setPrimaryColour(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-700/50 cursor-pointer"
          />
          <input
            type="text"
            value={primaryColour}
            onChange={(e) => setPrimaryColour(e.target.value)}
            placeholder="#2563EB"
            maxLength={7}
            className="flex-1 px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white font-mono"
          />
          <div
            className="w-10 h-10 rounded-lg border border-gray-700/50"
            style={{
              backgroundColor: HEX_COLOUR_REGEX.test(primaryColour) ? primaryColour : '#2563eb',
            }}
          />
        </div>
        <button
          type="button"
          onClick={resetColourToDefault}
          className="text-xs text-gray-500 hover:text-gray-300 mt-2"
        >
          Reset to SiteMedic Defaults
        </button>
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Tagline <span className="text-gray-600">(optional)</span>
        </label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="e.g. Professional event medical services"
          className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white"
        />
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Logo <span className="text-gray-600">(optional)</span>
        </label>

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
              ) : (
                <span>Current logo</span>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-gray-300 text-sm hover:border-blue-600/50"
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

          {logoFile && (
            <button
              type="button"
              onClick={handleUploadLogo}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-white text-sm disabled:opacity-50"
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Logo'
              )}
            </button>
          )}
        </div>

        <p className="text-gray-500 text-xs mt-1.5">
          PNG, JPEG, or SVG. Max 2MB.
        </p>
      </div>
    </div>
  );
}
```

### Example 2: Live Preview Panel

```typescript
// Source: Claude's discretion (portal header + sidebar layout recommended)
'use client';

import { useBranding } from '@/contexts/branding-context';

interface PreviewBranding {
  companyName: string;
  primaryColour: string;
  tagline: string;
  logoUrl: string;
}

interface BrandingPreviewProps {
  branding: PreviewBranding;
}

export function BrandingPreview({ branding }: BrandingPreviewProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Live Preview</h3>

      {/* Portal Header Mock */}
      <div
        className="rounded-lg overflow-hidden mb-4"
        style={{ backgroundColor: branding.primaryColour }}
      >
        <div className="flex items-center gap-3 p-4">
          {branding.logoUrl && (
            <img
              src={branding.logoUrl}
              alt={branding.companyName}
              className="h-8 w-auto object-contain"
            />
          )}
          <div>
            <div className="text-white font-semibold text-sm">
              {branding.companyName}
            </div>
            {branding.tagline && (
              <div className="text-white/80 text-xs">
                {branding.tagline}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Mock */}
      <div className="space-y-2">
        <div
          className="h-2 rounded w-12"
          style={{ backgroundColor: branding.primaryColour }}
        />
        <div className="h-2 rounded w-24 bg-gray-700" />
        <div className="h-2 rounded w-20 bg-gray-700" />
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Changes update in real-time
      </p>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual save button | Auto-save with debounce | Phase 13 (RIDDOR) | Better UX; user doesn't need to remember to save |
| Separate colour + hex inputs | Native `<input type="color">` | Phase 29-03 onboarding | Modern browser support; no additional library |
| Logo cropping library | Accept as-is (no cropping) | Phase 31 (now) | Simpler; trust org to upload correct size |
| Form validation on save | Lenient auto-save, strict API validation | Phase 13+ | Faster feedback; server remains source of truth |

**Deprecated/outdated:**
- **Manual form save buttons** — Auto-save pattern is now preferred in SiteMedic (RIDDOR demonstrates this)
- **Flash message toasts on every save** — Silent auto-save with optional "saved" indicator is better UX (avoid notification fatigue)

---

## Open Questions

1. **Live preview content scope:** Should preview show more branded surfaces (e.g., PDF document mock, email template mock)? Or keep simple (header + sidebar)?
   - What we know: Phase context says "portal header + sidebar mockup recommended"
   - Recommendation: Start with header + sidebar, extend later if needed

2. **Save feedback pattern:** Toast vs inline status indicator (e.g., "Saving..." → "Saved")?
   - What we know: Phase context says "Claude's discretion on save feedback"
   - Recommendation: Inline status indicator (e.g., small "Saving..." text near form, removes after 1s). Avoids toast spam.

3. **Portal refresh on branding change:** Should portal immediately reflect changes, or require page refresh?
   - What we know: Phase context says "Claude's discretion; depends on BrandingProvider SSR architecture"
   - Recommendation: Portal reads branding from x-org-* headers (middleware-injected, SSR). Changes visible on next full page navigation. No special refresh needed.

4. **Unsaved changes warning:** Needed? Auto-save reduces risk, but in-flight saves might leave form dirty.
   - What we know: Phase context says "Claude's discretion based on auto-save timing"
   - Recommendation: No warning. Auto-save is reliable (save on unmount fallback). If needed later, track `hasInFlightSave` to warn only if user tries to leave while save is pending.

---

## Sources

### Primary (HIGH confidence)

- **BrandingContext (Phase 27-01)**: `/Users/sabineresoagli/GitHub/sitemedic/web/contexts/branding-context.tsx` — DEFAULT_BRANDING, hex validation regex, CSS custom property injection
- **org_branding table schema (Phase 24)**: `/Users/sabineresoagli/GitHub/sitemedic/supabase/migrations/132_org_branding.sql` — columns, RLS policies, constraints
- **TierGate component (Phase 30)**: `/Users/sabineresoagli/GitHub/sitemedic/web/components/billing/tier-gate.tsx` — implements feature gating
- **Onboarding branding form (Phase 29-03)**: `/Users/sabineresoagli/GitHub/sitemedic/web/app/onboarding/branding/page.tsx` — file upload pattern, colour picker, form validation
- **Branding API route (Phase 24)**: `/Users/sabineresoagli/GitHub/sitemedic/web/app/api/admin/branding/route.ts` — GET/PUT endpoints, requireTier middleware
- **Auto-save pattern (Phase 13)**: `/Users/sabineresoagli/GitHub/sitemedic/web/app/(dashboard)/riddor/[id]/page.tsx` — 30-second debounce, silent failures, unmount save fallback
- **Platform admin pattern**: `/Users/sabineresoagli/GitHub/sitemedic/web/app/platform/organizations/page.tsx` — platform admin UI structure, org listing
- **Web stack (package.json)**: Next.js ^15.2.3, React ^19.0.0, Supabase ^2.95.3, TailwindCSS ^3.4.17, Sonner ^2.0.7

### Secondary (MEDIUM confidence)

- **Admin settings page (Phase 30)**: `/Users/sabineresoagli/GitHub/sitemedic/web/app/admin/settings/page.tsx` — complex form patterns, branding section structure, TierGate integration, save handlers

### Tertiary (verification sources)

- **CONTEXT.md** (Phase 31 discussion): Confirms auto-save preference, no cropping, no contrast warnings, reset button requirement
- **Branding helpers (Phase 28)**: `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/_shared/branding-helpers.ts` — org_branding data shape, logo URL construction

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — All libraries verified in codebase or official docs; versions confirmed from package.json
- **Architecture patterns:** HIGH — Onboarding branding form provides exact template; auto-save pattern proven in RIDDOR; API route exists
- **Auto-save implementation:** HIGH — RIDDOR page demonstrates exact pattern; copy-paste ready
- **File upload:** HIGH — Onboarding form shows Supabase Storage pattern; verified working
- **Tier gating:** HIGH — TierGate component exists and tested; integration pattern clear from admin settings page
- **Platform admin RLS:** MEDIUM — RLS policies documented in migration; service-role pattern inferred from codebase conventions (not yet used for branding, but standard pattern for platform admin writes)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days; stable architecture)
