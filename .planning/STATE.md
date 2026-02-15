# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** Phase 1 - Foundation

## Current Position

Phase: 1 of 7 (Foundation)
Plan: 5 of 5 in current phase
Status: Phase complete
Last activity: 2026-02-15 — Completed 01-05-PLAN.md (Sync infrastructure with persistent queue and audit logging)

Progress: [██░░░░░░░░] 25% (5/20 plans across all active phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 4 min
- Total execution time: 0.33 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5/5 | 20 min | 4 min |

**Recent Trend:**
- Last 5 plans: 01-01 (5 min), 01-02 (5 min), 01-03 (2 min), 01-04 (5 min), 01-05 (3 min)
- Trend: Stable (consistent ~3-5 min per plan)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Offline-first architecture: Construction sites have unreliable connectivity; app must work without signal
- iOS-first, no Android: Kai and target medics use iPhones; avoid multi-platform complexity in MVP
- Supabase for backend: PostgreSQL + Auth + Storage + UK hosting in one managed service, fast to ship
- React Native with Expo: Faster iOS development, JavaScript alignment with web dashboard
- Weekly PDF as core deliverable: Site managers need this for HSE audits; auto-generation justifies premium pricing

**From Plan 01-01:**
- D-01-01-001: Use Expo SDK 54 managed workflow for faster iOS development (avoids Xcode complexity)
- D-01-01-002: Enable TypeScript strict mode from Day 1 to catch type errors early
- D-01-01-003: Configure Supabase with detectSessionInUrl: false (mobile apps don't use URL-based auth)
- D-01-01-004: Store encryption keys in expo-secure-store (hardware-backed Keychain/Keystore, GDPR-compliant)
- D-01-01-005: Defer SQLCipher encryption to Plan 01-03 (WatermelonDB PR #907 not yet merged)

**From Plan 01-03:**
- D-01-03-001: Defer SQLCipher encryption to Phase 2 (WatermelonDB PR #907 not merged, per research)
- D-01-03-002: Use epoch milliseconds for all timestamps (number type, not Date objects)
- D-01-03-003: audit_log table has no server_id (write-once, synced via queue, not WatermelonDB sync)
- D-01-03-004: JSON sanitizers return empty arrays on parse failure (defensive programming)
- D-01-03-005: Sync queue priority: 0 = RIDDOR immediate, 1 = normal
- D-01-03-006: Enable JSI adapter for better iOS performance

**From Plan 01-04:**
- D-01-04-001: Session cached in AsyncStorage not SecureStore (Supabase convention, already encrypted with JWT)
- D-01-04-002: Biometric flags in SecureStore with requireAuthentication: true (hardware-backed, auto-invalidates on biometric change)
- D-01-04-003: Local JWT expiry check when offline (accepts staleness up to 1 hour for construction site offline periods)
- D-01-04-004: Type assertion for profiles query result (Supabase TypeScript client type inference issue)

**From Plan 01-05:**
- D-01-05-001: Sync queue persists in WatermelonDB (not in-memory) to survive force-quit per Research Pitfall 6
- D-01-05-002: Exponential backoff caps at 240 minutes (4 hours) to prevent indefinite retry delays during multi-day offline
- D-01-05-003: RIDDOR priority is 0, normal is 1, audit logs are 2 (ensures compliance-critical records sync first)
- D-01-05-004: Audit logs batch-sync 50 at a time to prevent overwhelming sync queue
- D-01-05-005: NetInfo reachability test pings Supabase URL (confirms actual backend connectivity, not just WiFi)
- D-01-05-006: SyncContext polls every 10 seconds (simpler than WatermelonDB observable for initial implementation)
- D-01-05-007: AuditLogger only logs SENSITIVE_TABLES (workers, treatments, near_misses, safety_checks) to reduce audit volume
- D-01-05-008: server_id updated after successful 'create' sync to map local UUID to Supabase UUID

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-15T22:48:48Z
Stopped at: Completed 01-05-PLAN.md — Sync infrastructure with persistent queue and audit logging
Resume file: None

---
*Phase 1 (Foundation) complete. Next step: Plan Phase 2 (Mobile Core UI) work*
