# Phase 28: Branding — PDFs & Emails - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Org logo and company name replace all hardcoded branding across 8 PDF Edge Functions and 3 email templates. Every generated document fetches `org_branding` before rendering. No hardcoded "Apex Safety Group Ltd" or "SiteMedic" branding remains in any PDF or email output.

</domain>

<decisions>
## Implementation Decisions

### PDF header design
- Header text: company name + document type (e.g. "Apex Safety Solutions — Weekly Report", "Apex Safety Solutions — Invoice")
- Logo position, size, and layout: Claude's discretion — assess each of the 8 PDF types and pick what works best per document
- Header consistency across 8 PDFs: Claude's discretion — use a shared branded header component where sensible, but adapt layout per document type if needed

### Email branding depth
- Colour usage in emails: Claude's discretion — decide how much of the org's primary colour permeates (header, buttons, borders, etc.)
- Logo placement in emails: Claude's discretion — pick the best layout for broad email client compatibility
- Footer content: Claude's discretion — determine what org data to include based on available fields
- Subject lines: Claude's discretion — decide whether org name belongs in subject or just in the "From" field

### White-label attribution
- **Tier-based "Powered by SiteMedic":** Starter tier shows "Powered by SiteMedic" in both PDFs and emails; Growth and Enterprise tiers remove it
- Attribution is a clickable link to sitemedic.co.uk (in emails; standard text in PDFs)
- Consistency across surfaces: Claude's discretion — align with existing web portal attribution pattern

### Missing branding fallback
- No logo configured: Claude's discretion for both PDFs and emails — pick the best fallback (SiteMedic logo, text-only header, etc.)
- No primary colour configured: Claude's discretion — pick an appropriate default
- Branding completion nudge: Claude's discretion — add a reminder if it fits naturally in the existing UI

### Claude's Discretion
- PDF logo position, size, and per-document-type layout decisions
- Email colour depth, logo placement, footer content, subject line format
- Fallback behaviour for missing logo and missing primary colour
- Whether a branding completion nudge appears and where

</decisions>

<specifics>
## Specific Ideas

- PDF headers must include the document type alongside the company name (e.g. "Apex Safety Solutions — Weekly Report") — this was the one firm decision across all PDF questions
- "Powered by SiteMedic" is tier-gated: Starter sees it, Growth/Enterprise do not — this is a deliberate upsell lever
- The attribution link goes to sitemedic.co.uk — lead generation from every Starter-tier document sent
- Technical risk flag from STATE.md: `@react-pdf/renderer` `<Image>` with remote Supabase Storage URL in Deno Edge is MEDIUM confidence — test with a minimal PDF first before updating all 8 functions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-branding-pdfs-emails*
*Context gathered: 2026-02-18*
