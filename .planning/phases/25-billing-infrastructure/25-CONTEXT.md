# Phase 25: Billing Infrastructure - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the billing webhook handler and register it in Stripe Dashboard before any org completes Stripe Checkout. Create the `FEATURE_GATES` constant and `hasFeature()` helper as the single source of truth for tier gating. Create Stripe Products and Prices for all three tiers (monthly + annual) in GBP, EUR, and USD. No UI in this phase — pure billing plumbing.

</domain>

<decisions>
## Implementation Decisions

### Tier Feature Matrix
- **Claude's discretion** on exact feature-to-tier mapping, with these guidelines:
  - Starter (£149/mo): Core platform value — dashboard, treatment logs, worker registry, weekly PDF reports, compliance features, analytics
  - Growth (£299/mo): Unlocks white-label branding (logo, colour, company name across portal/PDFs/emails) + subdomain routing
  - Enterprise (£599/mo): Everything in Growth + premium features (custom domain, API access, priority support, future premium features)
- Analytics (heat maps, trend charts, compliance trends) — Claude determines sensible gating across tiers

### Payment Failure Behavior
- **7-day grace period** on payment failure — org keeps full access while Stripe retries, sees a "payment failed" banner
- **Access until period end** on cancellation — org paid for the month/year, they keep access until it expires
- **90-day data retention after expiry** — data preserved for 90 days after subscription expires, then purged. Resubscribe within 90 days to recover everything.
- **Dashboard-only admin alerts** — no email notification to platform admin on payment failure or cancellation. Visible in platform admin subscription dashboard (Phase 30).

### Stripe Product Presentation
- **Product names**: "SiteMedic Starter", "SiteMedic Growth", "SiteMedic Enterprise"
- **Billing cycles**: Monthly AND annual (annual = 2 months free, i.e. 10 months price)
- **Currency**: GBP + EUR + USD — 3 currencies x 3 tiers x 2 cycles = 18 Stripe Prices total
- **VAT handling**: Claude's discretion — standard UK B2B SaaS approach (likely VAT-exclusive with Stripe Tax)

### Webhook State Transitions
- **Annual mid-year upgrade**: Claude's discretion — handle prorated upgrade or switch-to-monthly, whichever is best for cash flow and customer experience
- **Downgrades allowed**: Orgs can upgrade AND downgrade. Downgrade takes effect at next billing cycle. Gated features become inaccessible at that point.
- **Downgrade data preservation**: Branding data (and all gated feature data) stays in DB when org downgrades. If they re-upgrade, everything is restored. Data is hidden, not deleted.
- **Event logging**: Log ALL Stripe billing events to `webhook_events` table — full audit trail for debugging and compliance. Not just handled events.

### Claude's Discretion
- Exact feature-to-tier matrix (Starter/Growth/Enterprise boundaries)
- Analytics gating across tiers
- VAT handling approach (likely VAT-exclusive for B2B)
- Annual mid-year upgrade mechanics (prorated vs switch-to-monthly)
- EUR and USD price points (equivalent to GBP or rounded for market)

</decisions>

<specifics>
## Specific Ideas

- Annual upgrade path is important — user specifically flagged: "what happens if someone is on a yearly plan and wants to increase to another yearly plan for a higher tier?" Must handle cleanly.
- Preserve-but-hide pattern for downgraded features encourages re-upgrades — data is an asset that makes the higher tier feel valuable to return to.
- 90-day retention window balances GDPR data minimisation with customer goodwill on a health data platform.
- GBP + EUR + USD from day one signals international readiness even though UK is the primary market.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-billing-infrastructure*
*Context gathered: 2026-02-18*
