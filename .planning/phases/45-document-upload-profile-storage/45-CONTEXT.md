# Phase 45: Document Upload & Profile Storage - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Medics upload categorised compliance documents (PDF, image) with expiry dates from either the iOS app or web dashboard. Documents are stored on the medic's profile, visible to their org admin. Uploading a new version of a document type archives the previous version. Expiry status badges and alerts are Phase 46 — this phase handles upload, storage, categorisation, versioning, and display only.

</domain>

<decisions>
## Implementation Decisions

### Upload experience
- Web: Drag-and-drop zone with click-to-browse fallback
- iOS: System document picker + camera capture option (photograph paper certificates)
- Batch upload supported — select multiple files, assign category + expiry to each
- File types: PDF, JPEG, PNG only
- Max file size: 10 MB per file
- Preview shown before confirming upload — thumbnail/preview of the document so medics can catch wrong-file mistakes

### Document categories & expiry
- 5 default categories: Insurance, DBS, Qualification, ID, Other
- Org admins can create custom categories for their org (in addition to the 5 defaults)
- Expiry date entry: required field with a "Does not expire" toggle/checkbox that hides the date picker when checked
- Multiple active documents per category allowed (e.g. a medic can have two current insurance policies)
- Upload flow: both options — medic can upload from a general upload button (choose category from dropdown) OR from within a category section (category pre-set)

### Version history & archiving
- Archived versions retain their original expiry dates (for audit trail)

### Claude's Discretion
- Profile documents layout: how documents are displayed on the medic's profile (grouped by category, table, cards — Claude decides based on existing dashboard patterns)
- Profile placement: whether documents are a new tab or a section on the existing profile page
- Document info density: what info shows at a glance (name, category, expiry, status, thumbnails)
- Admin view: whether org admin sees the same view read-only, or gets a compliance summary on top
- Archive access: how archived versions are surfaced (expandable inline, separate page, etc.)
- Restore capability: whether archived versions can be restored to current, or re-upload is required
- Deletion policy: whether documents can be deleted or only archived (Claude decides based on compliance needs)

</decisions>

<specifics>
## Specific Ideas

- Camera capture on iOS is important for field medics — they often need to photograph paper certificates on-site rather than having digital copies
- Batch upload matters for onboarding — when a new medic joins, they need to upload multiple documents at once (insurance, DBS, ID, qualifications)
- Custom categories give orgs flexibility for industry-specific compliance documents (e.g. motorsport medical licence, construction CSCS card)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 45-document-upload-profile-storage*
*Context gathered: 2026-02-20*
