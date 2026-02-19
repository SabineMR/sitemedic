# Phase 31: Branding Settings UI - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Self-service branding configuration UI for org admins (logo upload, primary colour picker, company name, tagline) with live preview. Platform admins can override branding for any org as a white-glove setup service. Growth tier required to access the page (TierGate wrapping).

</domain>

<decisions>
## Implementation Decisions

### Live preview panel
- Claude's discretion on what the preview shows (portal header + sidebar mockup recommended — the two most branded surfaces)
- Claude's discretion on layout positioning (side-by-side vs above form)
- Claude's discretion on real-time vs save-triggered preview updates
- Claude's discretion on mobile preview toggle (desktop-only likely sufficient)

### Logo upload experience
- Claude's discretion on upload zone pattern (drag-and-drop + click recommended for modern feel)
- Claude's discretion on cropping (no cropping is simpler — accept as-is)
- Claude's discretion on file types and max size
- Claude's discretion on current logo display pattern

### Colour picker style
- Claude's discretion on picker type (hex input, visual picker, preset palette, or combination)
- No accessibility/contrast warnings — trust the org to pick sensible colours
- Include a "Reset to SiteMedic defaults" option for the colour — small reset link/button near the picker
- Claude's discretion on whether to show colour swatches (preview panel may already cover this)

### Save & feedback flow
- Auto-save on change — no explicit save button; changes save after a short debounce
- Claude's discretion on save feedback (toast vs inline status indicator)
- Claude's discretion on whether portal immediately reflects changes or shows refresh prompt (depends on BrandingProvider SSR architecture)
- Claude's discretion on unsaved-changes warning (auto-save reduces risk, but in-flight saves may need protection)

### Claude's Discretion
- Live preview content, layout, and update timing
- Logo upload zone pattern, cropping, file constraints, current logo display
- Colour picker type and swatch display
- Save feedback pattern and portal refresh behaviour
- Unsaved changes warning based on auto-save timing

</decisions>

<specifics>
## Specific Ideas

- Auto-save is the preferred save pattern — no manual save button
- "Reset to SiteMedic defaults" button for colour is explicitly requested
- No contrast/accessibility warnings on colour picker — keep it simple, trust the org
- Existing Phase 29 onboarding already has a branding setup step (29-03) — reuse form components where possible

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-branding-settings-ui*
*Context gathered: 2026-02-18*
