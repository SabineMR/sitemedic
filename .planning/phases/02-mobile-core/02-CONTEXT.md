# Phase 2: Mobile Core - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Offline-first mobile workflows for construction site health & safety data capture. Medics can capture treatments, worker profiles, near-misses, and daily safety checks 100% offline with gloves-on usability. This phase focuses on LOCAL data capture - syncing to backend happens in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Treatment Logging Workflow
- Preset templates for quick-entry of common minor injuries (e.g., "Minor Cut", "Bruise", "Headache")
- Auto-save on every field change for zero data loss (immediate persistence)
- Required fields: Worker + Injury type + Treatment + Outcome (ensures HSE-audit ready documentation)
- User mentioned specific workflow structure preference but details not captured - clarify during research

### Worker Selection & Lookup
- Search-first with smart filtering (filters by name, company, role simultaneously as user types)
- Quick-add inline for missing workers: minimal fields (name, company) to continue treatment, full profile later
- Display format in search results: Name + Company + Last treatment date
- Worker history: Claude's discretion on accessibility pattern (optimize for mobile visibility and emergency access)

### Photo & Signature Capture
- Multiple photos per treatment (3-5 limit for different angles/views)
- Simple markup tools: arrow, circle, text labels to highlight injury location (helpful for HSE/manager review)
- Large signature pad area for gloves-on signing (full-screen canvas with thick finger tolerance)
- Photo capture timing in workflow: Claude's discretion (balance between inline and end-of-workflow)

### Daily Safety Checks & Near-Misses
- **All workflow details: Claude's discretion**
- User is not familiar with construction site medic industry practices
- Research industry best practices for:
  - Daily checklist patterns (simple checkboxes vs detailed pass/fail vs photo evidence)
  - Near-miss logging speed optimizations (photo-first vs category-first vs voice-note)
  - Screen organization (separate tabs vs unified section vs dashboard cards)
  - Completion tracking (daily reset vs persistent incomplete items)
- Target: <5 minutes for daily checklist, <45 seconds for near-miss capture (from success criteria)

### Claude's Discretion
- Treatment workflow structure (user has idea but didn't elaborate - research common patterns)
- Worker history accessibility pattern (emergency 2-tap requirement, optimize for mobile)
- Photo capture timing within treatment workflow
- All daily checks & near-miss UX decisions (user defers to industry research)
- Completion tracking for daily checklists
- Screen organization for safety features

</decisions>

<specifics>
## Specific Ideas

- User is building this for Kai (construction site medic) but is not familiar with the industry themselves
- Wants research-driven UX decisions based on construction site health & safety best practices
- Speed is critical: minor treatment <30s, full treatment <90s, near-miss <45s, daily checks <5min
- Gloves-on usability is non-negotiable (48x48pt tap targets from success criteria)

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 02-mobile-core*
*Context gathered: 2026-02-15*
