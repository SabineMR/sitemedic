# Phase 32: Foundation Schema & Registration - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Database tables, RLS policies, race-condition prevention, and **company** registration with CQC verification. This phase delivers the marketplace foundation for CQC-compliant medical companies (NOT individual medics) to register, get verified, and onboard onto Stripe Connect. Clients (companies or individuals) can also register to post events.

**Key shift from original roadmap:** Marketplace is companies-only. No individual freelance medics. Phase 37 (Company Accounts) roster management still applies later, but the base entity is a company, not a person.

</domain>

<decisions>
## Implementation Decisions

### Marketplace vs Existing Accounts
- **Companies only** — no individual freelance medics on the marketplace. Only CQC-registered medical companies can register and quote.
- **Bidirectional crossover** — an existing SiteMedic org can register on the marketplace, AND a marketplace company can also become a SiteMedic org.
- **Linked accounts** — when an existing org registers on the marketplace, it links to their existing account (same login, shared medic roster, company info carries over). Not a separate profile.

### Registration Journey
- **Multi-step wizard** for company registration (step 1: company details, step 2: CQC number, step 3: document uploads, step 4: Stripe Connect onboarding)
- **Pre-verified access** — after submitting registration, companies can browse events but cannot quote until admin-verified
- **Client registration** — open to both companies and individuals (anyone can post an event needing medical cover)
- **Claude's Discretion: Client signup weight** — keep it lightweight for low friction; collect billing/company details later when they actually award a job and need to pay

### Verification & Admin Queue
- **CQC auto-verify at signup** — system instantly checks CQC API to confirm number is valid and active. Admin then reviews remaining documents (insurance, DBS) manually.
- **Admin actions: Approve / Reject / Request More Info** — three-way decision. "Request More Info" sends a message asking for specific documents without rejecting the application.
- **Daily automated CQC checks** — scheduled job checks all registered companies' CQC status via the public CQC API (`api.cqc.org.uk`) once per day
- **Auto-suspend on CQC issue** — if CQC status changes to Suspended or Deregistered: instantly block from quoting + send email notification to the company
- **Active jobs on suspension** — flag for admin review (NOT auto-cancel). Admin gets urgent alert to manually decide per-job: reassign, cancel, or contact the company. Human judgement needed because context matters (event timing, nature of CQC issue).

### Document & Qualification Requirements
- **Required documents at registration:**
  1. CQC registration number (auto-verified via API)
  2. Public liability insurance (upload)
  3. Employer's liability insurance (upload)
  4. DBS certificates for key staff (upload)
  5. Professional indemnity insurance (upload)
- **Insurance expiry tracking** — same treatment as CQC: auto-suspend from quoting when insurance lapses + email notification + active jobs flagged for admin review
- **DBS expiry tracking** — same treatment as CQC/insurance: auto-suspend company when key staff DBS certificates expire + email notification + active jobs flagged for admin review
- **All compliance documents follow the same suspension pattern:** expiry/lapse triggers instant block from quoting, email to company, active jobs flagged for admin

</decisions>

<specifics>
## Specific Ideas

- CQC API is free and public — no cost concern for daily checks
- The suspension pattern is consistent across all compliance types (CQC, insurance, DBS): auto-block quoting + email + admin reviews active jobs. One pattern, multiple document types.
- Existing SiteMedic orgs linking to marketplace means the `organisations` table likely gets a marketplace-related flag/columns rather than a completely separate company entity

</specifics>

<deferred>
## Deferred Ideas

- Individual freelance medic registration — explicitly excluded from marketplace scope (companies only)
- Company roster management (adding individual medics to a company, assigning medics to quotes) — remains in Phase 37
- Double-up prevention between company and individual accounts — N/A since no individual accounts exist

</deferred>

---

*Phase: 32-foundation-schema-registration*
*Context gathered: 2026-02-19*
