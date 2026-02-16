# Phase 5: PDF Generation - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Weekly safety reports that auto-generate every Friday and on-demand with professional formatting ready for HSE audits, principal contractors, and insurers. Reports pull from treatment logs, near-misses, daily safety checks, and compliance data captured in Phases 2-4.

This phase implements PDF generation and automated email delivery. Interactive reports or custom report builders belong in future phases.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User explicitly granted full discretion on all implementation details. Claude should make all decisions based on:
- HSE audit requirements and best practices
- Professional safety reporting standards
- Readability and usability for site managers and inspectors
- Technical constraints (10-second generation time, server-side rendering)

**Areas with full discretion:**

**Report structure & sections:**
- Overall structure (executive summary vs chronological vs section-by-section)
- Whether to include actions/follow-ups section
- How near-misses are presented (grouped, individual, or summary)
- How daily safety checks are represented (completion rate, problems only, or full breakdown)

**Visual design & formatting:**
- Overall visual style (professional HSE vs modern corporate vs minimalist)
- Data visualizations (charts/graphs vs tables-only vs minimal)
- Page layout, typography, spacing
- Table formatting and information density

**Data depth & filtering:**
- Which treatments to include (all vs significant only)
- Level of detail for each incident
- Whether to include worker names
- Filtering by severity or other criteria

**Branding & customization:**
- Logo placement and sizing
- Color scheme usage
- Header/footer content
- White-label approach for different clients

</decisions>

<specifics>
## Specific Ideas

- Report must be "audit-ready" for HSE inspectors - prioritize clarity and completeness over aesthetics
- <10 second generation time is a hard constraint (success criterion #2)
- Company branding required (logo, colors) - success criterion #3
- Delivery via both download and email - success criterion #4
- Professional formatting matters for credibility with principal contractors and insurers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-pdf-generation*
*Context gathered: 2026-02-16*
