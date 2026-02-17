# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Documentation happens automatically as the medic does their job, not as separate admin work.
**Current focus:** Phase 2 - Mobile Core

## Current Position
Phase: 7.5 of 8 (Territory Auto-Assignment)
Plan: 4 of 5 in current phase
Status: In progress
Last activity: 2026-02-17 — Completed 07.5-04-PLAN.md (Coverage Gap Alerts & Hiring Recommendations UI)
Progress: [█████████████████░] 96% (81/84 plans across Phases 1-7.5)

## Performance Metrics

**Velocity:**
- Total plans completed: 81
- Average duration: 4.0 min
- Total execution time: 5.65 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5/5 | 20 min | 4 min |
| 01.5-business-foundation | 4/4 | 10 min | 2.5 min |
| 02-mobile-core | 9/9 | 50 min | 5.6 min |
| 03-sync-engine | 7/7 | 24 min | 3.4 min |
| 04-web-dashboard | 6/6 | 46 min | 7.7 min |
| 04.5-marketing-booking | 5/5 | 35 min | 7 min |
| 04.6-customer-onboarding | 7/7 | 52 min | 7.4 min |
| 05-pdf-generation | 4/4 | 18.5 min | 4.6 min |
| 05.5-admin-operations | 6/6 | 16.7 min | 2.8 min |
| 06-riddor-auto-flagging | 8/8 | 50 min | 6.3 min |
| 06.5-payments-payouts | 12/12 | 49.5 min | 4.1 min |
| 07-certification-tracking | 4/9 | 9.3 min | 2.3 min |
| 07.5-territory-auto-assignment | 4/5 | 10 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 07-03 (3 min), 07-04 (2.3 min), 07.5-01 (3 min), 07.5-02 (4 min), 07.5-04 (3 min)
- Trend: Coverage gap alerts with minimum volume filtering (>10 bookings prevents false positives), hiring recommendations grouped by region, summary stats bar for territory health overview

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
- D-01.5-01-004: Platform split on total including VAT (28.6% platform, 71.4% medic) - Fixed in 06.5-06 to match roadmap (£30 medic / £42 client)

**From Plan 01.5-03:**
- D-01.5-03-001: Auto-assignment requires score >= 50 to assign automatically, otherwise manual approval
- D-01.5-03-002: Distance scoring uses 40pts max (40 - travel_time/2) to heavily favor nearby medics
- D-01.5-03-003: Utilization scoring favors under-utilized medics (25pts * (1 - utilization_pct/100))
- D-01.5-03-004: New medics (0 rating) get 15 points benefit-of-doubt vs rating-based 0-20 points
- D-01.5-03-005: Travel bonus is £2/mile beyond 30 miles, room/board is fixed £85 for >90min travel

**From Plan 05.5-01:**
- D-05.5-01-001: Use TanStack Table row selection for bulk operations (handles select all, indeterminate, pagination-aware state)
- D-05.5-01-002: Bulk operations use single .in() query not loops (10-100x faster, avoids N+1 pitfall)
- D-05.5-01-003: 300ms debounced search (optimal balance between responsiveness and efficiency)
- D-01.5-03-006: Deny recommendation when cost >50% of shift value to prevent unprofitable bookings
- D-01.5-03-007: All out-of-territory bookings require admin approval regardless of cost
- D-01.5-03-008: Cache cleanup scheduled daily at 3 AM UTC via pg_cron (manual fallback provided)

**From Plan 05.5-03:**
- D-05.5-03-001: Use single Supabase upsert() for batch timesheet approval (20 timesheets <5s, vs 5-10s with N individual UPDATEs)
- D-05.5-03-002: TanStack Query onMutate for optimistic updates (instant UI feedback vs 1-2s server round-trip)
- D-05.5-03-003: Payout summary card shows total/medic count/timesheet count before approval (financial transparency prevents accidental large payouts)
- D-05.5-03-004: Yellow left border + warning icon for hours discrepancies (visual scan identifies issues without reading every row)
- D-05.5-03-005: Removed toast notifications temporarily (sonner not installed, optimistic updates provide visual feedback)

**From Plan 05.5-06:**
- D-05.5-06-001: Payment reliability score formula: ((successful - late_payments * 2) / total) * 100, clamped 0-100
- D-05.5-06-002: Net 30 upgrade requires active status, <=2 late payments, min £500 credit limit
- D-05.5-06-003: At Risk clients defined as late_payments >2 OR outstanding balance >80% credit limit
- D-05.5-06-004: Admin overview uses parallel queries (Promise.all) for faster load times
- D-05.5-06-005: 60-second polling interval for all admin real-time metrics
- D-05.5-06-006: Monthly revenue calculated from platform_fee sum on completed bookings this month
- D-05.5-06-007: Weekly payouts from timesheets with payout_status='paid' and paid_at >= 7 days ago

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

**From Plan 03-01:**
- D-03-01-001: Hybrid sync strategy with 30-second foreground polling and 15-minute background tasks (iOS BGTaskScheduler minimum)
- D-03-01-002: Background task registration is non-fatal (logs error if fails, foreground sync is primary strategy)
- D-03-01-003: Photo uploads deferred to Plan 03-03 integration phase (different constraints: WiFi-only, progressive upload)

**From Plan 03-02:**
- D-03-02-001: Progressive photo tiers: thumbnail 150px/50%, preview 800px/70%, full original/90%
- D-03-02-002: WiFi-only constraint for full-quality uploads, thumbnails/previews use any connection
- D-03-02-003: Max 2 concurrent uploads to avoid overwhelming device/network
- D-03-02-004: Photo uploads persist in WatermelonDB sync_queue with tableName='photo_uploads'
- D-03-02-005: Use 'base64' string encoding instead of FileSystem.EncodingType for expo-file-system v19

**From Plan 03-03:**
- D-03-03-001: RIDDOR items (priority 0) retry after 30s initial vs 5min normal, cap at 30min vs 4hr
- D-03-03-002: Photo uploads filtered from SyncQueue.processPendingItems (tableName !== 'photo_uploads')
- D-03-03-003: Last-write-wins uses server updated_at vs local last_modified_at, server wins if newer
- D-03-03-004: SyncContext integrates syncScheduler (start/stop) replacing 10s polling with hybrid strategy
- D-03-03-005: Background task processes both syncQueue and photoUploadQueue for complete offline sync

**From Plan 03-04:**
- D-03-04-001: Plain English error messages map technical errors to 4 user-friendly categories (network, auth, server, unknown)
- D-03-04-002: RIDDOR critical alert threshold set to 3+ retry attempts (~3.5 min of sustained failures)
- D-03-04-003: Photo upload progress shows logical photo count (queue items / 3 stages) to avoid confusing medics
- D-03-04-004: SyncStatusIndicator badge shows combined data + photo count for total pending visibility
- D-03-04-005: RiddorSyncAlert is non-dismissible until resolved (legal requirement for RIDDOR reporting)

**From Plan 03-05:**
- D-03-05-001: Only explicit save/complete triggers sync, NOT auto-save (prevents queue overwhelm from 10s auto-save)
- D-03-05-002: RIDDOR treatments use priority 0 (immediate), all else priority 1
- D-03-05-003: Photos enqueued separately via photoUploadQueue (different constraints: WiFi-only, progressive upload)
- D-03-05-004: Background task imported at App.tsx top level (TaskManager.defineTask must run at global scope)

**From Plan 03-06:**
- D-03-06-001: Runtime constraints over registration-time constraints (expo-background-task API limitation)
- D-03-06-002: 15% battery threshold with charging state check (prevents drain on critically low battery)
- D-03-06-003: Cellular allows data sync but blocks photos (data < 1KB, photos can be large)

**From Plan 03-07:**
- D-03-07-001: Use client-generated UUID (expo-crypto) instead of server-generated ID for idempotency
- D-03-07-002: Include client_id in create payloads immediately, server migration deferred to Phase 4+
- D-03-07-003: Treat PostgreSQL 23505 duplicate error as success, not failure

**From Plan 04-01:**
- D-04-01-001: Use @supabase/ssr instead of deprecated auth-helpers for Next.js 15 compatibility
- D-04-01-002: TanStack Query polling interval 60 seconds (DASH-09 requirement)
- D-04-01-003: Next.js route groups (auth) and (dashboard) for layout isolation
- D-04-01-004: shadcn/ui neutral theme with CSS variables for theming flexibility
- D-04-01-005: Dashboard at root / (protected), existing admin at /admin (public for backward compatibility)
- D-04-01-006: ESLint skip during build (pre-existing lint issues in admin pages, not related to Phase 4)

**From Plan 04-03:**
- D-04-03-001: Client-side date formatting with suppressHydrationWarning to avoid Next.js hydration mismatch
- D-04-03-002: Photo display uses Next.js Image with fill layout and responsive sizes for optimization
- D-04-03-003: Severity and outcome rendered as colored badges (green/yellow/orange/red) for quick visual scanning
- D-04-03-004: Treatment table includes row click handler navigating to detail page for fast access
- D-04-03-005: Filters applied client-side after data fetch for instant filter response without server round-trip

**From Plan 04-02:**
- D-04-02-001: Use 15-day window for RIDDOR deadline tracking (matches UK HSE reporting requirement)
- D-04-02-002: Hard-code expiredCerts to 0 (cert tracking deferred to Phase 7, no cert data exists yet)
- D-04-02-003: Count hospital_referral and sent_home outcomes as overdue follow-ups (7-day window for follow-up verification)
- D-04-02-004: Calculate unique workers from treatments this week (not from workers table - "on site" implies active this week)

**From Plan 04-04:**
- D-04-04-001: Created DataTable component in Plan 04-04 instead of Plan 04-03 (Plan 04-03 not executed, DataTable required for tasks)
- D-04-04-002: Cert status column shows green "Active" placeholder (Phase 7 will add actual certification tracking)
- D-04-04-003: Category and severity filters use shadcn/ui Select components for consistent UI
- D-04-04-004: Worker search filters company and role via text inputs (faster than dropdowns for large datasets)
- D-04-04-005: DateRangeFilter uses native HTML date inputs (simpler, no library dependency)

**From Plan 04-05:**
- D-04-05-001: UK date format (dd/MM/yyyy HH:mm) in CSV and PDF exports for HSE audit compliance
- D-04-05-002: Export filtered data (not all data) so managers export only what they see
- D-04-05-003: react-papaparse for CSV generation with BOM prefix for Excel UTF-8 compatibility
- D-04-05-004: jsPDF + jspdf-autotable for formatted A4 landscape PDF reports
- D-04-05-005: Horizontal table scrolling on narrow viewports (<768px) with min-w-[800px]
- D-04-05-006: Filters stack on mobile (flex-col), inline on desktop (flex-row)
- D-04-05-007: Certification status hard-coded as 'Active' in worker CSV (Phase 7 will implement real tracking)

**From Plan 05-01:**
- D-05-01-001: Use @react-pdf/renderer with npm: specifier for Deno Edge Functions compatibility
- D-05-01-002: Limit treatments and near-misses to 50 rows per table (performance constraint per Research Pitfall 2)
- D-05-01-003: Use renderToBuffer instead of renderToStream for simpler Uint8Array handling in Deno
- D-05-01-004: Calculate week_ending as most recent Friday if not provided (default for manual triggers)
- D-05-01-005: Mirror compliance logic from web/lib/queries/compliance.ts for consistency
- D-05-01-006: UK date format (dd MMM yyyy) for all dates in PDF for HSE audit compliance
- D-05-01-007: Logo placeholder as text 'SiteMedic' (actual logo from Supabase Storage deferred to Plan 02)
- D-05-01-008: Parallel data fetching with Promise.all for <10 second generation constraint
- D-05-01-009: Brand colors: primary #003366 (dark navy), accent #2563EB (blue), success/warning/danger for compliance

**From Plan 05-02:**
- D-05-02-001: 7-day signed URL expiry for security and UX balance
- D-05-02-002: Upsert strategy for weekly_reports (unique on org_id + week_ending)
- D-05-02-003: Email sent via Resend API (not SMTP) for reliability
- D-05-02-004: PDF attached to email + download link for accessibility
- D-05-02-005: Graceful degradation if RESEND_API_KEY missing (PDF still generated)
- D-05-02-006: GET endpoint regenerates expired signed URLs automatically
- D-05-02-007: Cron trigger returns JSON, manual trigger returns PDF buffer

**From Plan 05-03:**
- D-05-03-001: pg_cron job runs every Friday at 5 PM UTC (end of UK working day, captures all Friday data)
- D-05-03-002: Vault secrets (project_url, service_role_key) for secure Edge Function invocation from pg_cron
- D-05-03-003: Reports list as Card components instead of DataTable (simpler UI for chronological list)
- D-05-03-004: 60-second polling interval for reports list (picks up newly generated reports automatically)
- D-05-03-005: On-demand generation triggers browser download of PDF blob (no need to refetch list, polling handles it)
- D-05-03-006: Manual trigger returns PDF as Blob via Edge Function response (different from cron trigger which returns JSON)

**From Plan 04.5-01:**
- D-04.5-01-001: Use (marketing) route group for shared layout without affecting URL structure
- D-04.5-01-002: Move dashboard to /dashboard path to resolve route group conflict between (marketing) and (dashboard)
- D-04.5-01-003: SSG with force-static and 86400s (24h) revalidation for optimal CDN caching
- D-04.5-01-004: Small client wrapper (quote-button.tsx) for QuoteBuilder modal, keep pages as Server Components
- D-04.5-01-005: shadcn/ui Sheet component for mobile navigation menu

**From Plan 04.5-02:**
- D-04.5-02-001: Client-side pricing calculation mirrors Edge Function exactly for real-time transparency
- D-04.5-02-002: Urgency premium auto-calculated based on days until shift (0%/20%/50%/75%)
- D-04.5-02-003: Minimum 1 day advance booking (tomorrow is earliest, same-day disabled)
- D-04.5-02-004: UK postcode validation with basic pattern check (uppercase, letters+numbers)
- D-04.5-02-005: 8-hour minimum shift with 30-minute time increments
- D-04.5-02-006: Recurring booking toggle shows/hides pattern select and weeks input
- D-04.5-02-007: SessionStorage for form data handoff to payment page (Plan 03)
- D-04.5-02-008: Default base rate GBP 42/hr (GBP 350 for 8hr day)

**From Plan 04.5-03:**
- D-04.5-03-001: Client registration uses auth user ID as client ID for 1:1 mapping
- D-04.5-03-002: Booking created with status='pending' BEFORE Payment Intent to prevent bookings without payment
- D-04.5-03-003: Webhook updates booking from 'pending' to 'confirmed' on payment_intent.succeeded
- D-04.5-03-004: Net 30 clients bypass payment entirely and create booking with status='confirmed'
- D-04.5-03-005: Stripe automatic_payment_methods handles 3D Secure without custom redirect logic
- D-04.5-03-006: Use contact_email/contact_phone (not email/phone) to match clients schema
- D-04.5-03-007: Removed recurring_weeks field (schema uses recurring_until date instead)

**From Plan 04.5-04:**
- D-04.5-04-001: 3-step sequence ensures medic_id persisted before email sending (assign -> update -> email)
- D-04.5-04-002: Email endpoint validates medic_id is set before sending (safety check prevents race condition)
- D-04.5-04-003: Calendar invite uses Europe/London timezone for UK operations (handles GMT/BST automatically)
- D-04.5-04-004: Resend client gracefully degrades to console logging without API key (dev mode support)
- D-04.5-04-005: Manual approval fallback when no medics available or low confidence (<50 score)
- D-04.5-04-006: Recurring bookings capped at 52 weeks (1 year maximum)
- D-04.5-04-007: Prepay recurring bookings created as pending_payment, Net 30 as confirmed
- D-04.5-04-008: Calendar invite uses text/calendar MIME type with METHOD=REQUEST

**From Plan 04.5-05:**
- D-04.5-05-001: Fetch booking data after auto-match completes (not before payment) to ensure accurate database state
- D-04.5-05-002: Calculate recurring weeks from recurring_until date field (schema uses date, not week count per D-04.5-03-007)
- D-04.5-05-003: Include medic star_rating in booking detail API to fix hardcoded 4.8 fallback in match route

**From Plan 05.5-02:**
- D-05.5-02-001: Use TanStack Query for data fetching with 60-second polling for near-real-time updates
- D-05.5-02-002: Calculate utilization as (confirmed bookings this week / 5 working days) × 100, capped at 100%
- D-05.5-02-003: Color-code utilization: green <50%, yellow 50-80%, red >80% for quick visual assessment
- D-05.5-02-004: Use parallel queries (Promise.all) to avoid N+1 database calls when fetching metrics

**From Plan 05.5-04:**
- D-05.5-04-001: Use hardcoded UK_POSTCODE_CENTROIDS instead of OS Data Hub or geocoding API (approximate centroids sufficient for postcode-area-level admin overview, avoids external API dependency)
- D-05.5-04-002: Circle markers instead of boundary polygons (OS Data Hub boundary data requires external service, polygons overkill for admin overview)
- D-05.5-04-003: Dynamic import with ssr:false for Leaflet map (Leaflet requires browser APIs, crashes during SSR)
- D-05.5-04-004: Coverage gap threshold at >10% rejection rate (matches Research pattern, severity: warning 10-25%, critical >25%)
- D-05.5-04-005: Color-coded utilization bands green <50%, yellow 50-80%, red >80% (matches existing admin patterns, legend + numeric percentages for accessibility)

**From Plan 04.6-01:**
- D-04.6-01-001: Contract lifecycle uses 9-state machine (draft -> sent -> viewed -> signed -> completed -> active -> fulfilled, with amended and terminated as alternative states)
- D-04.6-01-002: Payment terms support 5 types (full_prepay, split_50_50, split_50_net30, full_net30, custom) with Net 30 eligibility check based on client payment_terms field
- D-04.6-01-003: Contract versions stored as immutable PDFs in storage.contracts bucket with 10MB limit and PDF-only mime type
- D-04.6-01-004: All contract events logged to contract_events table with flexible JSONB event_data payload for audit trail

**From Plan 04.6-02:**
- D-04.6-02-001: Contract number format SA-{YYYY}-{NNN} using UUID-derived sequential
- D-04.6-02-002: Two-mode Edge Function: contractId (database lookup) or previewData (direct render)
- D-04.6-02-003: Payment schedule descriptions hardcoded for standard terms, custom uses database field
- D-04.6-02-004: UK date formatting patterns: long (16 February 2026) for headers, short (16 Feb 2026) for tables
- D-04.6-02-005: Digital signature disclaimer cites UK Electronic Communications Act 2000

**From Plan 04.6-03:**
- D-04.6-03-001: Signature methods - Canvas drawing (primary) and typed name (fallback for accessibility) both produce base64 PNG
- D-04.6-03-002: Auto-update status to 'viewed' when contract opened (server component checks if status === 'sent' on page load)
- D-04.6-03-003: Signature audit trail captures IP, user agent, and timestamp (extract IP from x-forwarded-for or x-real-ip headers)
- D-04.6-03-004: PDF regeneration triggered automatically after signature (non-blocking: signature save succeeds even if PDF fails)

**From Plan 04.6-04:**
- D-04.6-04-001: Payment terms selector shows live GBP amounts for each option calculated using calculatePaymentSchedule function
- D-04.6-04-002: Prepay clients filtered to full_prepay and split_50_50 options only (no Net 30 without upgrade)
- D-04.6-04-003: Custom payment terms validate upfront + completion + net30 equals booking total (1 penny tolerance)
- D-04.6-04-004: Contract preview uses HTML with draft watermark styled via CSS transform rotate(-45deg)
- D-04.6-04-005: Dashboard page filters bookings without existing contracts by checking contracts table where status != 'terminated'
- D-04.6-04-006: API route generates shareable_token using crypto.randomUUID() for public client signing links
- D-04.6-04-007: PDF generation called asynchronously via Edge Function (doesn't block contract creation)
- D-04.6-04-008: Contract events logged with event_type='version_created' and actor_ip from x-forwarded-for header
- D-04.6-04-009: Supabase query result transformed to handle nested clients relation returned as array

**From Plan 04.6-05:**
- D-04.6-05-001: Send dialog shows copyable shareable link for phone call use
- D-04.6-05-002: Personal message rendered with visual highlight in email
- D-04.6-05-003: email.opened webhook only updates status if currently 'sent' (no regression)
- D-04.6-05-004: All email events logged in contract_events regardless of status change
- D-04.6-05-005: Email template uses inline CSS for maximum client compatibility
- D-04.6-05-006: Security notice warns clients not to share unique signing link
- D-04.6-05-007: Webhook handler returns 200 OK even on processing errors (prevents Resend retries)

**From Plan 06.5-01:**
- D-06.5-01-001: Auto-create Stripe Customer on first payment if client doesn't have stripe_customer_id (seamless prepay experience)
- D-06.5-01-002: Use automatic_payment_methods: { enabled: true } for 3D Secure support (SCA compliance)
- D-06.5-01-003: Store payment record before confirmation with status 'pending' (audit trail of all payment attempts)
- D-06.5-01-004: Use redirect: 'if_required' in confirmPayment (only redirect for 3D Secure when necessary)
- D-06.5-01-005: Update booking status to 'confirmed' after payment success (payment-gated booking confirmation)

**From Plan 06.5-02:**
- D-06.5-02-001: Use pg_cron with Edge Function HTTP POST for Friday 9am automation (Supabase-native cron scheduling)
- D-06.5-02-002: UK Faster Payments via Stripe Transfer API to medic Express accounts (2 business day settlement)
- D-06.5-02-003: 60% medic payout, 40% platform fee based on booking total (revenue split calculation pattern)
- D-06.5-02-004: payout_executions table logs all automated runs for audit trail (compliance and debugging)
- D-06.5-02-005: Manual payout trigger with dry-run preview for admin safety (validation without Stripe calls)
- D-06.5-02-006: Continue processing all payouts even if individual transfers fail (batch resilience pattern)

**From Plan 06.5-04:**
- D-06.5-04-001: Self-employed medics: no tax deductions (£0), medic handles own taxes
- D-06.5-04-002: Umbrella company: payouts to company account, company handles deductions
- D-06.5-04-003: UTR validation: 10-digit format with optional spaces
- D-06.5-04-004: CEST assessment: recommended but not strictly required
- D-06.5-04-005: Auto-refresh Stripe status every 30 seconds until onboarding complete
- D-06.5-04-006: Payslip generation: triggered on timesheet.payout_status = 'paid'

**From Plan 06.5-05:**
- D-06.5-05-001: Travel bonus rate: £2/mile beyond 30-mile free zone (industry standard compensation)
- D-06.5-05-002: Room/board flat rate: £150 for overnight stay when travel >2 hours (simpler than receipts)
- D-06.5-05-003: Auto-deny recommendation at 50% cost threshold (prevents unprofitable bookings)
- D-06.5-05-004: Admin override limit: 75% hard limit (prevents extreme loss-making bookings)
- D-06.5-05-005: Google Maps cache: 7-day TTL for route data (reduces API costs)

**From Plan 06.5-11:**
- D-06.5-11-001: Use gen_random_uuid() substring for payslip_reference instead of sequential numbering (provides uniqueness without database locks, human-readable PS-20260216-a1b2c3d4 format)
- D-06.5-11-002: pg_net HTTP POST for Edge Function invocation from trigger (non-blocking async call, doesn't delay transaction commit)
- D-06.5-11-003: Unschedule and recreate late payment cron instead of ALTER (pg_cron doesn't support ALTER, clean slate approach ensures consistency)

**From Plan 06.5-12:**
- D-06.5-12-001: Email failures do not block invoice status updates (invoice state changes are critical business logic, email is notification enhancement)

**From Plan 07-01:**
- D-07-01-001: Use JSONB with GIN index instead of separate certifications table (better performance for low cardinality ~5 certs per medic, flexible schema for future cert types)
- D-07-01-002: certification_reminders audit table prevents duplicate emails and provides compliance proof (composite index on medic_id, cert_type, days_before, sent_at)
- D-07-01-003: Progressive reminder stages 30/14/7/1 days before expiry (matches construction industry urgency vs healthcare's 90/60/30/15/7)
- D-07-01-004: RPC functions return formatted data (expiry_date_formatted, renewal_url, days_remaining) to reduce client-side processing
- D-07-01-005: All 3 RPC functions marked as STABLE not VOLATILE (enables PostgreSQL query plan caching and optimization)

**From Plan 07-04:**
- D-07-04-001: Workers vs medics certification distinction clarified in UI (workers table shows construction site workers who receive treatment, medics table stores medical professionals with certifications; Phase 7 cert tracking applies to medics, not workers; workers cert status column kept as N/A placeholder with comprehensive comment for future feature guidance)

**From Plan 07.5-01:**
- D-07.5-01-001: Use pg_cron for daily metrics aggregation instead of real-time queries (prevents query timeouts on 11,000+ territories; 3-24 hour staleness acceptable for operational dashboard)
- D-07.5-01-002: Weekly hiring trigger job counts consecutive high utilization weeks (>80% for 3+ weeks indicates structural capacity shortage requiring hiring)
- D-07.5-01-003: Require minimum 10 bookings before flagging coverage gaps (prevents false positives from low-volume territories)
- D-07.5-01-004: Add org_id column to territory_metrics for multi-tenant isolation (all queries filtered by org_id)
- D-07.5-01-005: Pure TypeScript functions (no database calls) for business logic (enables easy unit testing and reuse across UI components)

**From Plan 07.5-02:**
- D-07.5-02-001: Calendar conflict check uses batch query (single .in() for all candidates) not N+1 loop (prevents performance degradation with large candidate pools)
- D-07.5-02-002: Certification expiry validation is hard filter before scoring, not scoring penalty (expired certs are regulatory compliance failure, not performance issue)
- D-07.5-02-003: Updated scoring weights: distance 30% (highest priority), utilization 20% (prefer <70%), qualifications 15% (already hard-filtered), availability 15%, rating 15% (bonus for >4.5 stars), performance 5% (RIDDOR compliance bonus)
- D-07.5-02-004: Utilization scoring prefers <70% utilization (max 100 points) to prevent medic burnout and maintain quality
- D-07.5-02-005: Rating bonus of +10 points for >4.5 stars aligns with quality requirements
- D-07.5-02-006: Fairness score removed from total (was 5%, now 0%) - shift distribution less important than distance/utilization/quality factors
- D-07.5-02-007: Client-side scoring module mirrors Edge Function logic exactly for admin UI transparency (enables "Why this medic?" explanations)

**From Plan 07.5-04:**
- D-07.5-04-001: Severity color scheme: red for critical (>25%), yellow for warning (10-25%), green for healthy (standard severity colors align with user expectations)
- D-07.5-04-002: Region grouping for hiring triggers (admin may want to hire one medic to cover multiple adjacent sectors, e.g., hire 1 Manchester medic for M1, M2, M3)
- D-07.5-04-003: Minimum volume filter: coverage gaps only flagged if total_bookings > 10 (prevents false positives from low-volume territories - 1 booking rejected = 100% but not actionable)
- D-07.5-04-004: Pulsing indicator for critical hiring triggers (draws immediate attention to urgent capacity issues requiring >80% utilization or <90% fulfillment)

**From Plan 06-03:**
- D-06-03-001: Use @react-pdf/renderer instead of pdf-lib with fillable PDF template (HSE F2508 not reliably available; matches Phase 5 pattern)
- D-06-03-002: Store PDFs in {incident_id}/F2508-{timestamp}.pdf format for multiple versions per incident
- D-06-03-003: 7-day signed URL expiry matching weekly report pattern for HSE submission window

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
- Add Google Maps API key to environment variables (GOOGLE_MAPS_API_KEY)
- Enable Distance Matrix API in Google Cloud Console
- Consider adding admin dashboard for out-of-territory override statistics
- Monitor Google Maps API usage and set billing alerts
- Deploy Supabase migration 014_storage_buckets.sql to create treatment-photos bucket (Plan 03-02)
- Add Resend API key to Supabase secrets (RESEND_API_KEY) and verify sitemedic.co.uk domain (Plan 05-02)
- Deploy Supabase migration 015_safety_reports_storage.sql to create safety-reports bucket and weekly_reports table (Plan 05-02)
- Deploy Supabase migration 016_weekly_report_cron.sql to enable pg_cron scheduled job (Plan 05-03)
- Configure Vault secrets in Supabase Dashboard: project_url and service_role_key for pg_cron job authentication (Plan 05-03)
- Configure Resend webhook endpoint for contract email tracking (Plan 04.6-05): Add webhook URL to Resend Dashboard with events: email.sent, email.delivered, email.opened, email.clicked, email.bounced
- Deploy Supabase migration 021_friday_payout_cron.sql to create payout_executions table and enable pg_cron (Plan 06.5-02)
- Configure Friday payout cron job in Supabase Dashboard: Schedule friday-medic-payouts job with '0 9 * * 5' cron expression to invoke friday-payout Edge Function (Plan 06.5-02)
- Store service_role_key as database setting for pg_cron authentication: ALTER DATABASE postgres SET app.service_role_key = 'key' (Plan 06.5-02)

### Blockers/Concerns

None. External API key configuration pending but does not block development.

## Session Continuity

Last session: 2026-02-17T01:11:10Z
Stopped at: Completed 07.5-04-PLAN.md — Coverage Gap Alerts & Hiring Recommendations UI (severity-based alerts with minimum volume filtering, hiring recommendations grouped by region)
Resume file: None

---
*Phase 1 (Foundation) complete. Phase 1.5 (Business Operations Foundation) complete (4/4 plans). Phase 2 (Mobile Core) complete (9/9 plans). Phase 3 (Sync Engine) complete (7/7 plans). Phase 4 (Web Dashboard) complete (6/6 plans). Phase 4.5 (Marketing & Booking) complete (5/5 plans). Phase 4.6 (Customer Onboarding & Contract Management) complete (7/7 plans). Phase 5 (PDF Generation) complete (4/4 plans). Phase 5.5 (Admin Operations) complete (6/6 plans). Phase 6 (RIDDOR Auto-Flagging) complete (8/8 plans). Phase 6.5 (Payments & Payouts) complete (12/12 plans). Phase 7 (Certification Tracking) in progress (4/9 plans). Phase 7.5 (Territory Auto-Assignment) in progress (4/5 plans). Progress: 81/84 plans (96%)*
