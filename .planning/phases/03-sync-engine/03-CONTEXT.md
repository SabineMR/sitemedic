# Phase 3: Sync Engine - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Background synchronization infrastructure that moves data from mobile app to backend when connectivity is available. This includes treatment logs, worker profiles, near-miss reports, daily safety checks, and photos. The phase delivers automatic sync with photo uploads that don't interrupt the medic's workflow and zero data loss during transitions.

This phase implements sync for existing Phase 2 data capture features. Real-time collaboration, advanced conflict resolution, or selective sync controls belong in future phases.

</domain>

<decisions>
## Implementation Decisions

### Sync Timing and Triggers
- **Connectivity detection:** Start sync immediately (within 1-2 seconds) when connectivity is detected
- **Batching strategy:** Hybrid approach
  - RIDDOR-reportable incidents sync immediately (priority 0)
  - Normal items batch and sync every 30 seconds
  - Reduces network requests while ensuring compliance-critical items sync instantly
- **Retry behavior:** Exponential backoff (1min → 5min → 15min → 1hr)
  - Standard retry pattern with increasing delays
  - Reduces battery drain during extended offline periods
  - Caps at 1 hour per existing Phase 1 decision (D-01-05-002: caps at 240 minutes)
- **Foreground vs background sync:** Claude's discretion
  - Balance between sync speed and UX smoothness
  - Consider device performance and WatermelonDB sync overhead

### User Visibility and Feedback
- **Success feedback:** Silent success (just clear badge)
  - No toast or notification when sync completes
  - Pending count badge updates to zero
  - Clean UX without notification noise
- **Active sync indicator:** Claude's discretion
  - Choose between status bar icon, toast notification, badge updates, or combination
  - Consider construction site gloves-on usability
- **Failure alerts (general):** Claude's discretion
  - Balance between awareness and workflow disruption
  - Consider retry timing (don't alert on first failure if retry in 1 minute)
- **RIDDOR failure alerts:** Claude's discretion
  - Must be "critical alert" per success criteria but intrusion level flexible
  - Options: full-screen modal, persistent banner, push notification, or combination

### Photo Upload Behavior
- **Upload trigger:** WiFi-only by default (user can override to allow cellular)
  - Respects data constraints (construction sites often have limited cellular)
  - Manual override available for urgent situations
  - Aligns with success criteria: "Sync queue respects WiFi-only constraint for large photo uploads"
- **Upload progress visibility:** Claude's discretion
  - Per-photo progress vs aggregate vs badge-only
  - Consider UI clutter vs reassurance trade-off
- **Progressive upload strategy:** Claude's discretion
  - Success criteria specifies "Progressive photo upload syncs preview first, full-quality later"
  - Implementation approach: thumbnail-first, compressed-only, or progressive JPEG streaming

### Manual Sync Controls
- **Claude's discretion:** All aspects of manual sync controls
  - Force sync button placement and behavior
  - Pause/resume sync capability
  - Clear failed items from queue
  - View sync history/log
  - Pull-to-refresh gesture support
  - Balance user control with simplicity

</decisions>

<specifics>
## Specific Ideas

- Sync status badge already implemented in Phase 1 (multi-modal sync status indicators with color, labels, pending count badge)
- Sync queue infrastructure already exists from Phase 1 with priority levels (0 = RIDDOR, 1 = normal, 2 = audit logs)
- Client-generated UUIDs from Phase 1 prevent duplicate records on retry
- Network connectivity detection via NetInfo with Supabase reachability test from Phase 1

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-sync-engine*
*Context gathered: 2026-02-15*
