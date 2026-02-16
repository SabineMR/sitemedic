# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** Phase 2 - Mobile Core

## Current Position

Phase: 2 of 7 (Mobile Core)
Plan: 7 of 8 in current phase
Status: In progress
Last activity: 2026-02-16 — Completed 02-07-PLAN.md (Daily Safety Checklist)

Progress: [████████░░] 55% (11/20 plans across all active phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 3.6 min
- Total execution time: 0.67 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5/5 | 20 min | 4 min |
| 01.5-business-foundation | 4/4 | 10 min | 2.5 min |
| 02-mobile-core | 2/8 | 11 min | 5.5 min |

**Recent Trend:**
- Last 5 plans: 01.5-04 (3 min), 01.5-02 (4 min), 02-01 (7 min), 02-07 (4 min)
- Trend: Stable at 4 min average for recent plans

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

**From Plan 01.5-01:**
- D-01.5-01-001: Pure calculation pattern for pricing (returns JSON, callers persist to DB)
- D-01.5-01-002: Single global invoice sequence (no yearly reset for simplicity)
- D-01.5-01-003: Deterministic UUIDs for test data idempotency (10000000-..., 20000000-..., 30000000-...)
- D-01.5-01-004: Platform split on total including VAT (40% platform, 60% medic)

**From Plan 01.5-03:**
- D-01.5-03-001: Auto-assignment requires score >= 50 to assign automatically, otherwise manual approval
- D-01.5-03-002: Distance scoring uses 40pts max (40 - travel_time/2) to heavily favor nearby medics
- D-01.5-03-003: Utilization scoring favors under-utilized medics (25pts * (1 - utilization_pct/100))
- D-01.5-03-004: New medics (0 rating) get 15 points benefit-of-doubt vs rating-based 0-20 points
- D-01.5-03-005: Travel bonus is £2/mile beyond 30 miles, room/board is fixed £85 for >90min travel
- D-01.5-03-006: Deny recommendation when cost >50% of shift value to prevent unprofitable bookings
- D-01.5-03-007: All out-of-territory bookings require admin approval regardless of cost
- D-01.5-03-008: Cache cleanup scheduled daily at 3 AM UTC via pg_cron (manual fallback provided)

**From Plan 01.5-04:**
- D-01.5-04-001: Store postcodes at AREA+DISTRICT level (outward code) not full sector for territory granularity
- D-01.5-04-002: Embed compact area definitions in Edge Function, generate sectors programmatically at runtime to avoid size/timeout
- D-01.5-04-003: Use batch inserts of 500 rows for Edge Function efficiency
- D-01.5-04-004: Use upsert with ignoreDuplicates to allow re-running seeder without overwriting medic assignments
- D-01.5-04-005: Set default max_travel_minutes to 30 for all territories
- D-01.5-04-006: Generate CSV for offline reference only (Edge Function doesn't read it)

**From Plan 01.5-02:**
- D-01.5-02-001: Use Stripe v14 for Deno compatibility (older versions have CommonJS issues in Edge Runtime)
- D-01.5-02-002: Action-based routing pattern for stripe-connect (single function, multiple actions via body.action)
- D-01.5-02-003: Store onboarding_url in medics table for re-access (Stripe AccountLinks expire)
- D-01.5-02-004: Verify webhook signatures BEFORE parsing event (security requirement per Stripe docs)
- D-01.5-02-005: Express accounts for medics use GB country and transfers capability (UK-based medics)
- D-01.5-02-006: Payment Intent metadata includes booking_id and client_id for event correlation

**From Plan 02-01:**
- D-02-01-001: Use @gorhom/bottom-sheet (not @gorhom/react-native-bottom-sheet) for picker modals
- D-02-01-002: 56pt minimum tap targets (exceeds iOS 44pt and Android 48pt) for gloves-on construction site use
- D-02-01-003: Extended hit slop (+4pt) on all interactive elements for easier gloved tapping
- D-02-01-004: High contrast colors (#2563EB blue, #EF4444 red, #10B981 green) for outdoor sunlight readability
- D-02-01-005: Taxonomy data as typed const arrays (not database tables) for zero-latency offline access
- D-02-01-006: Kebab-case IDs for all taxonomy items for API/URL consistency
- D-02-01-007: RIDDOR flag on injury types (isRiddorReportable: boolean) for Phase 6 auto-reporting
- D-02-01-008: Severity levels on outcomes (low/medium/high) for escalation decision logic
- D-02-01-009: Emoji icons on near-miss categories for faster visual scanning
- D-02-01-010: Priority order on daily checks (1-10) for systematic inspection workflow

**From Plan 02-07:**
- D-02-07-001: Green/Amber/Red status buttons with borderWidth 4 for selected state (clear visual feedback in sunlight)
- D-02-07-002: Photo and note optional (only appear after status selected) for quick <5 minute completion
- D-02-07-003: Amber/Red items prompt for issue description with context-sensitive placeholder
- D-02-07-004: Visual emphasis on amber/red items with 4px left border for quick issue identification
- D-02-07-005: Daily reset keyed by check_date epoch milliseconds (new checklist per day)
- D-02-07-006: Previous days' incomplete checklists archived as in_progress (not deleted, audit trail)
- D-02-07-007: Completion requires all 10 items to have status (isAllComplete gate)
- D-02-07-008: Auto-save debounce 500ms on field changes (status/photo/note)
- D-02-07-009: Progress indicator shows completed/total count with green progress bar
- D-02-07-010: Complete button shows "Complete X more items" when incomplete for user guidance

### Pending Todos

- Add Stripe API keys to Supabase secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY)
- Configure Stripe webhook endpoint in Stripe Dashboard for 4 event types
- Add Google Maps API key to Supabase secrets (GOOGLE_MAPS_API_KEY)
- Enable Distance Matrix API in Google Cloud Console

### Blockers/Concerns

None. External API key configuration pending but does not block development.

## Session Continuity

Last session: 2026-02-16T00:51:18Z
Stopped at: Completed 02-07-PLAN.md — Daily Safety Checklist
Resume file: None

---
*Phase 1 (Foundation) complete. Phase 1.5 (Business Operations Foundation) complete (4/4 plans). Phase 2 (Mobile Core) in progress (2/8 plans)*
