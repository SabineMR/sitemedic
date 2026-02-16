# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** Phase 2 - Mobile Core

## Current Position

Phase: 2 of 7 (Mobile Core)
Plan: 10 of 8 in current phase
Status: In progress
Last activity: 2026-02-16 — Completed 02-10-PLAN.md (Import Path Audit & Offline Verification)

Progress: [███████░░░] 65% (13/20 plans across all active phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 4.2 min
- Total execution time: 1.02 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5/5 | 20 min | 4 min |
| 01.5-business-foundation | 4/4 | 10 min | 2.5 min |
| 02-mobile-core | 5/8 | 37 min | 7.4 min |

**Recent Trend:**
- Last 5 plans: 02-04 (7 min), 02-05 (5 min), 02-09 (8 min), 02-10 (5 min)
- Trend: Mobile Core gap closure plans taking longer (8 min) vs feature plans (5-7 min)

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

**From Plan 02-04:**
- D-02-04-001: Auto-save debounce 500ms (exceeds TREAT-10 requirement of 10s for faster UX) — SUPERSEDED by D-02-09-001 (changed to 10000ms)
- D-02-04-002: Reference number format SITE-YYYYMMDD-NNN with daily sequential counter
- D-02-04-003: RIDDOR detection automatic based on isRiddorReportable flag in INJURY_TYPES taxonomy
- D-02-04-004: Treatment status workflow draft→complete (draft editable, complete read-only)
- D-02-04-005: Mechanism presets: 8 common injury scenarios as quick-select chips above free text
- D-02-04-006: Treatment types multi-select checkboxes (not single picker) for combined treatments
- D-02-04-007: Body part selection grid layout (not SVG diagram) for faster build and better gloves-on usability
- D-02-04-008: Signature mandatory for completion, stored as base64 PNG
- D-02-04-009: Photo limit 4 enforced via PhotoCapture maxPhotos prop per TREAT-06
- D-02-04-010: BottomSheetPicker renderCustomContent prop for custom picker UIs like BodyDiagramPicker

**From Plan 02-05:**
- D-02-05-001: 8 preset templates for common construction injuries (Minor Cut, Bruise, Headache, Splinter, Eye Irritation, Sprain/Strain, Minor Burn, Nausea/Dizziness)
- D-02-05-002: Worker selection BEFORE template selection (validates worker before creating treatment record)
- D-02-05-003: Navigate to treatment/[id] for review after template selection (enables quick confirmation + optional additions)
- D-02-05-004: Treatment list sorted by created_at DESC (reverse chronological order, most recent first)
- D-02-05-005: Search filters by worker name, injury type, and reference number (single unified search across 3 fields)
- D-02-05-006: RIDDOR flag shown as red badge in list view (high visibility for compliance-critical flag)
- D-02-05-007: Outcome badge with color coding (green/amber/red) based on severity levels
- D-02-05-008: Empty state with dual CTAs (Quick Log + Full Treatment) to reduce friction for first action
- D-02-05-009: Load worker names via Promise.all for each treatment (parallel loading with fallback to 'Unknown Worker')
- D-02-05-010: Quick Log and Full Treatment buttons side-by-side at top (visual hierarchy emphasizes quick entry)

**From Plan 02-09:**
- D-02-09-001: Auto-save interval 10000ms (10 seconds) instead of 500ms to match TREAT-10, reduce database writes, and prevent UI jank from synchronous WatermelonDB operations
- D-02-09-002: Template taxonomy IDs verified against source files with verification comment added

**From Plan 02-10:**
- D-02-10-001: Verified all files at depth 3 from project root (mobile/app/treatment/, mobile/app/(tabs)/, mobile/components/forms/) require ../../../ to reach src/lib/watermelon.ts
- D-02-10-002: Approved checkpoint via code verification instead of runtime testing when iOS simulator runtime unavailable (grep confirmed all import paths correct, depth calculations validated)

**From Plan 02-07:**

**From Plan 02-06:**
- D-02-06-001: Store GPS as JSON string {latitude, longitude} in location field (schema has string type)
- D-02-06-002: Category grid visible on screen (not bottom sheet) for speed - reduces taps from 2 to 1
- D-02-06-003: GPS failure does NOT block form submission (construction sites have poor GPS coverage)
- D-02-06-004: Photo thumbnails in list (80x80) instead of full-width for compact list view
- D-02-06-005: Severity descriptions clarify potential outcome ('Could cause minor injury' vs abstract 'Minor')
- D-02-06-006: Auto-save on every field change (no manual save button) for offline reliability
- D-02-07-001: Green/Amber/Red status buttons with borderWidth 4 for selected state (clear visual feedback in sunlight)
- D-02-07-002: Photo and note optional (only appear after status selected) for quick <5 minute completion
- D-02-07-003: Amber/Red items prompt for issue description with context-sensitive placeholder
- D-02-07-004: Visual emphasis on amber/red items with 4px left border for quick issue identification
- D-02-07-005: Daily reset keyed by check_date epoch milliseconds (new checklist per day)
- D-02-07-006: Previous days' incomplete checklists archived as in_progress (not deleted, audit trail)
- D-02-07-007: Completion requires all 10 items to have status (isAllComplete gate)
- D-02-07-008: Auto-save debounce 500ms on field changes (status/photo/note) — SUPERSEDED by D-02-09-001 (changed to 10000ms)
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

Last session: 2026-02-16T02:03:09Z
Stopped at: Completed 02-10-PLAN.md — Import Path Audit & Offline Verification
Resume file: None

---
*Phase 1 (Foundation) complete. Phase 1.5 (Business Operations Foundation) complete (4/4 plans). Phase 2 (Mobile Core) in progress (5/8 plans)*
