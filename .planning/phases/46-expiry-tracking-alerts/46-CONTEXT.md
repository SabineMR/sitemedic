# Phase 46: Expiry Tracking & Alerts - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Documents show colour-coded status badges based on expiry proximity, medics and admins receive progressive email alerts as documents approach expiry, and org admins have a bulk view of all documents expiring across their organisation in the next 30 days.

Phase 45 already built basic expiry badges on document list pages (web, iOS, admin view). Phase 46 adds **proactive alerts** (emails) and the **bulk dashboard** (cross-medic view). Badge enhancements beyond existing pages are optional.

</domain>

<decisions>
## Implementation Decisions

### Alert email format
- **Daily digest** (not one email per document) — medic receives one email per day listing all documents that hit a threshold (30/14/7/1 days)
- Send time: **morning 8-9am UK** via pg_cron daily job

### Alert email design
- Claude's discretion on tone escalation (informational → urgent as expiry approaches)
- Claude's discretion on subject line format
- Claude's discretion on call-to-action (link to upload page vs documents page)

### Bulk expiry dashboard
- Claude's discretion on: navigation placement, action set (view-only vs message medic vs download), time range (fixed 30 days vs adjustable), whether to include already-expired docs
- Must be sortable by expiry date and filterable by document category (per requirements)

### Badge display & edge cases
- Phase 45 badges already exist on document list (web), iOS documents tab, and admin document view — Phase 46 may enhance these or add indicators elsewhere at Claude's discretion
- Expired document impact: Claude's discretion (no blocking, warning, or restricted actions)
- "Does not expire" (null expiry) badge treatment: Claude's discretion

### Alert recipients
- Claude's discretion on whether admin gets their own digest or only medics get alerts (admin has bulk dashboard regardless)
- Claude's discretion on medic opt-out (compliance alerts may be mandatory)
- Claude's discretion on whether new upload cancels pending alerts for old document in same category
- Alert deduplication: track which alerts have been sent to avoid duplicates (per roadmap plan)

### Claude's Discretion
Wide latitude on this phase — user wants the core capability (daily digest, morning send, bulk dashboard) and trusts Claude on the details. Key areas of flexibility:
- Email tone, subject lines, and CTAs
- Dashboard layout, nav placement, and action capabilities
- Badge enhancements beyond Phase 45
- Expired document impact level
- Admin alert inclusion
- Alert cancellation on document replacement

</decisions>

<specifics>
## Specific Ideas

- Existing Resend email client with dev mode fallback (no RESEND_API_KEY = console log only) — established pattern from Phase 35
- Existing pg_cron + Vault secrets pattern from migrations 022 and 033 — reuse for daily alert job
- Existing Edge Function patterns for scheduled tasks

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 46-expiry-tracking-alerts*
*Context gathered: 2026-02-20*
