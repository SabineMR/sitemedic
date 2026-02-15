# Architecture Research: Offline-First Medical Compliance Platform

**Domain:** Offline-first mobile + web dashboard for field data capture
**Researched:** 2026-02-15
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐              ┌──────────────────────┐     │
│  │   iOS Mobile App     │              │   Web Dashboard      │     │
│  │  (React Native)      │              │   (React.js)         │     │
│  │                      │              │                      │     │
│  │  ┌────────────────┐  │              │  ┌────────────────┐  │     │
│  │  │ Local SQLite   │  │              │  │  State Mgmt    │  │     │
│  │  │ (WatermelonDB) │  │              │  │  (React Query) │  │     │
│  │  │ [ENCRYPTED]    │  │              │  └────────────────┘  │     │
│  │  └────────────────┘  │              │                      │     │
│  │  ┌────────────────┐  │              │                      │     │
│  │  │  Sync Queue    │  │              │                      │     │
│  │  │ (Background)   │  │              │                      │     │
│  │  └────────────────┘  │              │                      │     │
│  └──────────┬───────────┘              └──────────┬───────────┘     │
│             │                                     │                 │
│             │ HTTPS/TLS 1.3                      │ HTTPS/TLS 1.3   │
│             │                                     │                 │
├─────────────┴─────────────────────────────────────┴─────────────────┤
│                         API Gateway Layer                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Supabase  │  │   Supabase  │  │   Supabase  │                 │
│  │    Auth     │  │  REST API   │  │   Storage   │                 │
│  │ (JWT tokens)│  │ (PostgREST) │  │   (S3-like) │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
├─────────┴────────────────┴────────────────┴─────────────────────────┤
│                      Backend Services Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  Node.js Edge  │  │  PDF Generator │  │ Notification   │        │
│  │   Functions    │  │  (Serverless)  │  │   Service      │        │
│  │                │  │                │  │ (Email/Push)   │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                       Data Storage Layer                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌──────────────────────────┐         │
│  │   PostgreSQL Database    │  │    Object Storage        │         │
│  │   (Supabase Postgres)    │  │  (Photos, PDFs, Assets)  │         │
│  │   [ENCRYPTED AT REST]    │  │  [ENCRYPTED AT REST]     │         │
│  └──────────────────────────┘  └──────────────────────────┘         │
│                                                                      │
│  Schema: Multi-tenant with RLS (Row-Level Security)                 │
│  - organizations (sites)                                             │
│  - users (medics, managers)                                          │
│  - treatments (clinical records)                                     │
│  - workers (health profiles + consent)                               │
│  - near_misses, safety_checks                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **iOS Mobile App** | Offline-first data capture, local storage, sync orchestration | React Native + Expo, WatermelonDB (SQLite + SQLCipher encryption) |
| **Web Dashboard** | Read-only reporting UI, PDF downloads, compliance monitoring | React.js + React Query for server state, direct Supabase client |
| **Local SQLite** | Offline persistence, encrypted at rest, sync source of truth | WatermelonDB with SQLCipher (AES-256), stores treatments/workers/photos locally |
| **Sync Queue** | Background sync job management, conflict resolution, retry logic | React Native Queue, persists operations in AsyncStorage, runs on app resume/network restore |
| **Supabase Auth** | JWT-based authentication, session management, offline token refresh | Supabase Auth with Secure Storage (Keychain/Keystore), handles offline session expiry gracefully |
| **Supabase REST API** | Server-side data access, Row-Level Security enforcement | PostgREST auto-generated from Postgres schema, enforces tenant isolation via RLS policies |
| **Supabase Storage** | Photo upload, compression, CDN delivery | S3-compatible object storage with automatic image optimization and CDN |
| **PDF Generator** | Weekly safety report generation from template + data | Serverless function (Node.js + Puppeteer or PDFKit), triggered by cron or on-demand |
| **Notification Service** | RIDDOR deadline alerts, certification expiry warnings | Email (SendGrid/Postmark) + Push notifications (Expo Notifications) |
| **PostgreSQL** | Multi-tenant relational data, ACID guarantees, RLS policies | Supabase Postgres with Row-Level Security, UK/EU region hosting |
| **Object Storage** | Blob storage for photos and generated PDFs | Supabase Storage with lifecycle policies for archival |

## Recommended Project Structure

### Mobile App (React Native + Expo)

```
mobile-app/
├── src/
│   ├── core/                    # Core business logic (domain layer)
│   │   ├── models/              # WatermelonDB models (Treatment, Worker, etc.)
│   │   ├── repositories/        # Data access layer (abstracts WatermelonDB)
│   │   ├── services/            # Business logic (TreatmentService, SyncService)
│   │   └── validators/          # Input validation, RIDDOR rules
│   ├── sync/                    # Offline sync engine
│   │   ├── SyncQueue.ts         # Queue manager (priority, retry, persistence)
│   │   ├── ConflictResolver.ts  # Conflict resolution strategies
│   │   ├── NetworkMonitor.ts    # Network state detection
│   │   └── BackgroundSync.ts    # Background task orchestration
│   ├── screens/                 # UI screens (TreatmentLogger, NearMiss, etc.)
│   │   ├── TreatmentLoggerScreen.tsx
│   │   ├── WorkerProfileScreen.tsx
│   │   └── SafetyCheckScreen.tsx
│   ├── components/              # Reusable UI components
│   │   ├── forms/               # Form inputs, validation
│   │   ├── common/              # Buttons, cards, lists
│   │   └── offline/             # Offline indicators, sync status
│   ├── api/                     # Backend integration
│   │   ├── supabase.ts          # Supabase client setup
│   │   ├── auth.ts              # Auth flows (login, token refresh)
│   │   └── storage.ts           # Photo upload with compression
│   ├── storage/                 # Local storage & encryption
│   │   ├── database.ts          # WatermelonDB schema & migrations
│   │   ├── encryption.ts        # SQLCipher key management
│   │   └── secure-storage.ts    # Keychain wrapper for sensitive data
│   └── utils/                   # Helpers, constants, types
│       ├── photo-compression.ts # Image optimization before upload
│       ├── riddor-detector.ts   # RIDDOR auto-flagging logic
│       └── constants.ts         # Config, enums
├── app/                         # Expo Router file-based routing
└── assets/                      # Static assets (images, fonts)
```

### Web Dashboard (React.js)

```
web-dashboard/
├── src/
│   ├── features/                # Feature-based organization
│   │   ├── treatments/          # Treatment log & detail views
│   │   │   ├── TreatmentList.tsx
│   │   │   ├── TreatmentDetail.tsx
│   │   │   └── useTreatments.ts # React Query hook
│   │   ├── compliance/          # Compliance score, RIDDOR tracking
│   │   ├── workers/             # Worker registry, certifications
│   │   ├── reports/             # PDF download, weekly reports
│   │   └── dashboard/           # Overview screen, traffic-light score
│   ├── api/                     # API client layer
│   │   ├── supabase.ts          # Supabase client
│   │   ├── treatments.ts        # Treatment API calls
│   │   └── reports.ts           # Report generation API
│   ├── components/              # Shared UI components
│   │   ├── layout/              # Header, sidebar, layout
│   │   ├── charts/              # Compliance score visualization
│   │   └── common/              # Buttons, tables, modals
│   ├── hooks/                   # Shared React hooks
│   ├── utils/                   # Helpers, formatters
│   └── types/                   # TypeScript types (shared with mobile)
├── public/                      # Static assets
└── package.json
```

### Backend (Supabase + Serverless Functions)

```
backend/
├── supabase/
│   ├── migrations/              # SQL schema migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_functions.sql
│   ├── functions/               # Edge Functions (Deno)
│   │   ├── generate-pdf/        # Weekly report generator
│   │   │   └── index.ts
│   │   ├── sync-endpoint/       # Custom sync logic (if needed)
│   │   │   └── index.ts
│   │   └── riddor-alerts/       # RIDDOR deadline notifications
│   │       └── index.ts
│   └── seed.sql                 # Dev/test data seed
└── README.md
```

### Structure Rationale

- **Mobile: Core-first architecture** — Business logic in `core/` is framework-agnostic, making it testable and portable. UI screens are thin, delegating to services.
- **Mobile: Sync isolation** — All sync logic lives in `sync/` module, making it easy to test offline scenarios and swap sync strategies.
- **Web: Feature-based** — Dashboard is organized by features (treatments, workers, reports) rather than technical layers, improving discoverability.
- **Shared types** — TypeScript types are shared between mobile and web via a shared npm package or monorepo to ensure API contract consistency.
- **Backend: Migration-driven** — Database schema lives in SQL migrations, ensuring version control and easy rollback.

## Architectural Patterns

### Pattern 1: Offline-First with Optimistic UI

**What:** All data writes happen to local SQLite first, UI updates immediately (optimistic), then sync happens in background.

**When to use:** For every user interaction that modifies data (treatment logs, near-miss captures, worker edits).

**Trade-offs:**
- **Pro:** Instant UI response, works without network, better UX
- **Pro:** Zero data loss during offline periods
- **Con:** Complexity in conflict resolution when server rejects changes
- **Con:** Must handle failed syncs gracefully (show retry UI)

**Example:**
```typescript
// TreatmentService.ts
async createTreatment(data: TreatmentInput): Promise<Treatment> {
  // 1. Write to local database immediately (optimistic)
  const treatment = await this.repository.createLocal(data);

  // 2. Update UI immediately
  this.eventBus.emit('treatment:created', treatment);

  // 3. Queue for background sync
  await this.syncQueue.enqueue({
    operation: 'CREATE',
    entity: 'treatment',
    localId: treatment.id,
    data: treatment,
    priority: 'HIGH', // Treatments are high-priority
  });

  return treatment;
}
```

### Pattern 2: Last-Write-Wins with Timestamp Conflict Resolution

**What:** When syncing conflicts (same record edited offline on multiple devices), the most recent timestamp wins.

**When to use:** For non-collaborative data where one medic owns the treatment record. Acceptable for SiteMedic because medics work on separate sites.

**Trade-offs:**
- **Pro:** Simple to implement, no manual conflict resolution UI needed
- **Pro:** Works well for single-user-per-site scenarios
- **Con:** Data loss if two medics edit the same worker profile (rare in MVP)
- **Con:** Not suitable for collaborative editing (defer to Phase 2)

**Example:**
```typescript
// ConflictResolver.ts
async resolveConflict(local: Record, remote: Record): Promise<Record> {
  // Compare timestamps
  const localTimestamp = new Date(local.updated_at);
  const remoteTimestamp = new Date(remote.updated_at);

  if (localTimestamp > remoteTimestamp) {
    // Local is newer, push to server
    return { action: 'PUSH', record: local };
  } else {
    // Remote is newer, pull from server
    return { action: 'PULL', record: remote };
  }
}
```

### Pattern 3: Delta Sync with Change Tracking

**What:** Only sync changes (deltas) since last successful sync, not full database. Track `created_at`, `updated_at`, `deleted_at` timestamps on all records.

**When to use:** For efficient sync after app resume or network reconnection. Critical for minimizing bandwidth on construction sites with poor signal.

**Trade-offs:**
- **Pro:** Minimal bandwidth usage, fast sync
- **Pro:** Scales to large datasets (thousands of treatment records)
- **Con:** Requires server-side "last sync" tracking per device
- **Con:** Must handle schema migrations during sync

**Example:**
```typescript
// SyncService.ts
async performSync(): Promise<SyncResult> {
  const lastSyncTime = await this.getLastSyncTimestamp();

  // 1. Pull changes from server (only records updated since last sync)
  const serverChanges = await this.api.fetchChangesSince(lastSyncTime);
  await this.applyRemoteChanges(serverChanges);

  // 2. Push local changes to server
  const localChanges = await this.repository.getChangesSince(lastSyncTime);
  const conflicts = await this.api.pushChanges(localChanges);

  // 3. Resolve conflicts
  for (const conflict of conflicts) {
    await this.conflictResolver.resolve(conflict);
  }

  // 4. Update last sync timestamp
  await this.setLastSyncTimestamp(new Date());

  return { success: true, conflicts: conflicts.length };
}
```

### Pattern 4: Photo Upload with Progressive Compression

**What:** Compress photos on-device before upload, with multiple quality tiers. Low-quality preview syncs first, full-quality later.

**When to use:** For photo-heavy workflows (injury documentation, near-miss evidence) where bandwidth is limited.

**Trade-offs:**
- **Pro:** Faster sync on slow networks, better UX
- **Pro:** Reduces storage costs (compressed photos are smaller)
- **Con:** Image quality trade-offs (document this in compliance requirements)
- **Con:** CPU overhead for compression on mobile device

**Example:**
```typescript
// photo-compression.ts
async compressAndUpload(photo: Photo): Promise<string> {
  // 1. Compress to low-quality preview (immediate sync)
  const preview = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ resize: { width: 800 } }],
    { compress: 0.5, format: SaveFormat.JPEG }
  );

  const previewUrl = await this.uploadToStorage(preview, 'preview');

  // 2. Queue full-quality upload for later (background task)
  await this.syncQueue.enqueue({
    operation: 'UPLOAD_PHOTO',
    data: { uri: photo.uri, previewUrl },
    priority: 'LOW', // Full-quality is low priority
  });

  return previewUrl;
}
```

### Pattern 5: Multi-Tenant with Row-Level Security (RLS)

**What:** Single database with all tenants (sites/organizations), enforced data isolation via PostgreSQL Row-Level Security policies.

**When to use:** For SaaS applications where tenant data must be strictly isolated. Mandatory for GDPR compliance (prevent cross-site data leakage).

**Trade-offs:**
- **Pro:** Simpler infrastructure (one database, not N databases)
- **Pro:** Easier to query cross-tenant analytics (when needed)
- **Pro:** Built-in Supabase support, no custom auth middleware needed
- **Con:** RLS policies can be complex, must test thoroughly
- **Con:** Performance overhead (RLS adds WHERE clauses to every query)

**Example:**
```sql
-- RLS Policy for treatments table
CREATE POLICY "Users can only access their organization's treatments"
ON treatments
FOR ALL
USING (organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid()
));

-- RLS Policy for workers table
CREATE POLICY "Users can only access their organization's workers"
ON workers
FOR ALL
USING (organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid()
));
```

## Data Flow

### Request Flow: Treatment Logging (Offline → Sync → Dashboard)

```
[Medic logs treatment in mobile app]
    ↓
[TreatmentLoggerScreen] → [TreatmentService.createTreatment()]
    ↓
[Write to WatermelonDB (local SQLite)] → [Return immediately to UI]
    ↓
[Queue in SyncQueue] → [Persist queue to AsyncStorage]
    ↓
--- App resumes or network detected ---
    ↓
[BackgroundSync.start()] → [Process SyncQueue]
    ↓
[POST /treatments via Supabase API] → [Server validates & inserts]
    ↓
[Server returns success/conflict] → [Update local record with server ID]
    ↓
[Dashboard polls Supabase] → [React Query refetch]
    ↓
[Manager sees treatment in dashboard within 60 seconds]
```

### State Management: Mobile App

```
[Local SQLite (WatermelonDB)]
    ↓ (observeWithColumns)
[React Native Components] ←→ [Business Logic Services] → [Sync Queue]
    ↑                               ↓
    └─── UI updates automatically via WatermelonDB observables
```

### State Management: Web Dashboard

```
[Supabase REST API]
    ↓ (React Query)
[React Components] ←→ [useQuery hooks] → [Cache (React Query)]
    ↑                      ↓
    └─── UI updates on cache invalidation
```

### Key Data Flows

1. **Treatment Logging (Mobile → Server):**
   - Medic fills form → Local SQLite write → UI updates immediately → Background sync pushes to Supabase → Dashboard pulls via React Query

2. **Photo Upload (Mobile → Storage → Dashboard):**
   - Medic takes photo → Compress on-device → Upload preview to Supabase Storage → Queue full-quality upload → Dashboard displays preview URL

3. **Worker Consent (Mobile → Server → Compliance):**
   - Medic captures signature → Local SQLite write with consent timestamp → Sync to server → Dashboard shows consent status → GDPR compliance enforced via RLS

4. **PDF Generation (Server → Dashboard):**
   - Weekly cron job triggers Edge Function → Fetch treatments from Postgres → Generate PDF via Puppeteer → Upload to Supabase Storage → Email download link to manager

5. **RIDDOR Alert (Server → Notification):**
   - Treatment synced with RIDDOR flag → Edge Function checks deadline → Send email alert if <48 hours remain → Dashboard shows alert banner

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 users (MVP)** | Single Supabase instance, shared database, basic RLS policies. Monolithic deployment. No caching needed. |
| **100-1,000 users** | Add Redis caching layer for read-heavy queries (worker registry, compliance scores). Enable Supabase CDN for photo delivery. Optimize database indexes. |
| **1,000-10,000 users** | Separate read replicas for dashboard queries. Move PDF generation to dedicated serverless workers (AWS Lambda). Implement database connection pooling (PgBouncer). |
| **10,000+ users** | Consider sharding by region (UK North, UK South). Move heavy analytics to separate data warehouse (ClickHouse). Implement GraphQL federation for API scalability. |

### Scaling Priorities

1. **First bottleneck: Photo storage costs**
   - **When it breaks:** 1,000+ medics uploading 10+ photos/day = 10k photos/day = 300k/month
   - **How to fix:** Implement lifecycle policies (archive to Glacier after 90 days), aggressive compression (WebP format), CDN caching

2. **Second bottleneck: Database connection limits**
   - **When it breaks:** 1,000+ concurrent mobile app connections to Postgres
   - **How to fix:** Enable Supabase connection pooling (PgBouncer), reduce connection timeout, implement database read replicas

3. **Third bottleneck: PDF generation CPU**
   - **When it breaks:** Weekly PDF generation for 1,000+ sites overwhelms single Edge Function
   - **How to fix:** Move to AWS Lambda with auto-scaling, pre-generate PDFs nightly, cache generated PDFs for 7 days

## Anti-Patterns

### Anti-Pattern 1: Real-Time Sync Instead of Offline-First

**What people do:** Use WebSockets or Firebase Realtime Database for "live updates" instead of offline-first architecture.

**Why it's wrong:**
- Construction sites have zero mobile signal for hours — WebSockets fail immediately
- Battery drain from maintaining persistent connections
- Complexity in reconnection logic
- Data loss when connection drops mid-transaction

**Do this instead:** Offline-first with delta sync. Write to local SQLite, sync in background when network available. UI updates from local database, not server.

### Anti-Pattern 2: Storing Encryption Keys in Code or AsyncStorage

**What people do:** Hard-code SQLCipher encryption key or store it in AsyncStorage (not secure).

**Why it's wrong:**
- AsyncStorage is not encrypted, keys can be extracted via device backup or jailbreak
- Hard-coded keys in source code are visible in decompiled APK/IPA
- GDPR violation for health data (special category data requires encryption at rest with secure key management)

**Do this instead:** Generate encryption key on first launch, store in iOS Keychain (react-native-keychain) or Android Keystore. Never store keys in AsyncStorage or code.

```typescript
// Good: Secure key storage
import * as Keychain from 'react-native-keychain';

async function getEncryptionKey(): Promise<string> {
  const credentials = await Keychain.getGenericPassword({ service: 'sitemedic-db' });
  if (credentials) {
    return credentials.password;
  } else {
    // First launch: generate new key
    const newKey = generateRandomKey(); // 256-bit random
    await Keychain.setGenericPassword('db-key', newKey, { service: 'sitemedic-db' });
    return newKey;
  }
}
```

### Anti-Pattern 3: Server-Side PDF Generation in Synchronous API Calls

**What people do:** Generate PDF on-demand in API endpoint (POST /generate-pdf), blocking until complete.

**Why it's wrong:**
- PDF generation with Puppeteer can take 5-15 seconds for complex reports
- Blocks HTTP connection, risks timeout on slow networks
- Doesn't scale — 100 concurrent PDF requests overwhelm server
- Poor UX (user waits 15 seconds for download)

**Do this instead:** Async job queue pattern. API enqueues job, returns immediately. Background worker generates PDF, stores in S3, sends email notification when ready.

```typescript
// Good: Async PDF generation
async function requestWeeklyReport(siteId: string): Promise<{ jobId: string }> {
  const job = await pdfQueue.enqueue({
    type: 'WEEKLY_REPORT',
    siteId,
    requestedBy: auth.user.id,
  });

  return { jobId: job.id, status: 'PROCESSING' };
}

// Background worker picks up job
async function processPdfJob(job: PdfJob) {
  const pdf = await generatePdf(job.siteId);
  const url = await uploadToStorage(pdf);
  await sendEmail(job.requestedBy, url);
  await updateJobStatus(job.id, 'COMPLETED', url);
}
```

### Anti-Pattern 4: Syncing Entire Database on Every Reconnection

**What people do:** On network restore, fetch all records from server and replace local database.

**Why it's wrong:**
- Wastes bandwidth (re-downloading unchanged records)
- Slow sync (10,000 treatment records = 5+ MB download)
- Overwrites local changes made offline
- Doesn't scale beyond MVP

**Do this instead:** Delta sync with `updated_at` timestamps. Only fetch records modified since last successful sync. Push local changes first, then pull remote changes.

### Anti-Pattern 5: No Conflict Resolution Strategy

**What people do:** Assume conflicts won't happen, or silently overwrite local with remote (data loss).

**Why it's wrong:**
- Data loss when medic edits worker profile offline, then syncs
- No audit trail of what changed
- Violates GDPR principle of data accuracy

**Do this instead:** Implement Last-Write-Wins with timestamp comparison (simple, works for SiteMedic). For Phase 2, consider CRDT (Conflict-Free Replicated Data Types) if collaborative editing is needed.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Supabase Auth** | JWT tokens via Supabase client SDK | Store tokens in Secure Storage, handle offline token refresh gracefully (don't log out user if offline) |
| **Supabase Storage** | S3-compatible REST API | Use pre-signed URLs for uploads (bypass CORS), enable CDN for photo delivery |
| **SendGrid/Postmark** | Email API via Edge Function | RIDDOR alerts, weekly report delivery, certification expiry warnings |
| **Expo Notifications** | Push notification service | Optional: alert medics when sync fails, notify managers of RIDDOR incidents |
| **Sentry** | Error tracking SDK | Capture sync failures, offline exceptions, performance monitoring |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Mobile App ↔ Supabase API** | HTTPS REST (PostgREST) | Mobile app uses Supabase client SDK, authenticated via JWT tokens. RLS policies enforce tenant isolation. |
| **Mobile App ↔ Local Database** | WatermelonDB ORM | All data access via repositories pattern, abstracts SQLite queries. Never write raw SQL in UI components. |
| **Sync Queue ↔ Backend API** | HTTPS REST (batch operations) | Sync queue batches operations (max 50 per request) to reduce HTTP overhead. Server validates batch atomically. |
| **Web Dashboard ↔ Supabase API** | HTTPS REST + React Query | Dashboard is read-only (no writes). Uses React Query for caching and optimistic updates. |
| **Edge Functions ↔ Postgres** | Supabase client (server-side) | Edge Functions bypass RLS (use service role key), allowing cross-tenant queries for admin tasks. |
| **PDF Generator ↔ Storage** | Supabase Storage SDK | Generated PDFs stored with org-scoped paths (`/{org_id}/reports/{report_id}.pdf`). Public URLs with signed tokens. |

## Security & GDPR Architecture

### Data Classification

| Data Type | Classification | Encryption | Retention |
|-----------|----------------|------------|-----------|
| **Treatment records** | Special category (health data) | AES-256 at rest (SQLite + Postgres), TLS 1.3 in transit | 3 years minimum (HSE requirement) |
| **Worker health profiles** | Special category (health data) | AES-256 at rest, TLS 1.3 in transit | While employed + 3 years post-employment |
| **Photos (injury evidence)** | Special category (biometric/health) | Encrypted at rest (Supabase Storage), TLS 1.3 in transit | 3 years minimum |
| **Consent records** | Personal data | AES-256 at rest, TLS 1.3 in transit | Lifetime (proof of lawful processing) |
| **Near-miss reports** | Non-personal data (unless names included) | Standard encryption | 3 years |

### Consent Management Architecture

```
[Worker onboarding in mobile app]
    ↓
[Medic presents consent form] → [Worker reviews terms]
    ↓
[Digital signature capture] → [Timestamp + medic signature]
    ↓
[Store consent record locally] → [Flag worker as "consented"]
    ↓
[Sync consent to server] → [Enable data processing via RLS]
    ↓
[Dashboard enforces consent] → [Only show consented workers in reports]
```

**RLS Policy for Consent:**
```sql
-- Only process data for workers who have given consent
CREATE POLICY "Only access consented workers"
ON workers
FOR SELECT
USING (
  consent_given = true
  AND consent_timestamp IS NOT NULL
  AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
```

### Data Sovereignty (UK GDPR)

- **Server location:** Supabase EU West (London) region for all databases and storage
- **Backup location:** Backups must remain in UK/EEA (configure Supabase region)
- **Data transfer:** No data leaves UK/EEA (disable Supabase global CDN, use EU-only CDN)
- **Vendor compliance:** Supabase is GDPR-compliant (Data Processing Agreement in place)

## Build Order Implications

### Phase 1: Foundation (Backend + Auth)
**Why first:** Mobile app and web dashboard both depend on backend API and auth.

**Components:**
1. Supabase project setup (UK region)
2. Database schema + RLS policies
3. Auth flows (login, JWT refresh)
4. Basic API endpoints (treatments, workers)

**Deliverable:** Working API with RLS, testable via Postman/Insomnia

---

### Phase 2: Mobile App Core (Offline Storage)
**Why second:** Core value is offline-first mobile app. Must work without backend.

**Components:**
1. WatermelonDB schema + migrations
2. Encryption setup (SQLCipher + Keychain)
3. Treatment logging screen (local-only)
4. Worker profile screen (local-only)

**Deliverable:** Mobile app works 100% offline, stores encrypted data locally

---

### Phase 3: Sync Engine
**Why third:** Connects mobile app to backend, enables data flow to dashboard.

**Components:**
1. Sync queue implementation
2. Delta sync with conflict resolution
3. Background sync orchestration
4. Network monitoring

**Deliverable:** Mobile app syncs data to backend when online

---

### Phase 4: Photo Upload + Compression
**Why fourth:** Builds on sync engine, adds photo handling.

**Components:**
1. On-device compression
2. Supabase Storage integration
3. Progressive upload (preview + full-quality)

**Deliverable:** Photos sync reliably on slow networks

---

### Phase 5: Web Dashboard
**Why fifth:** Depends on backend API having data from mobile app.

**Components:**
1. Treatment log view
2. Worker registry
3. Compliance score calculation
4. Real-time updates (React Query polling)

**Deliverable:** Managers can view treatment data in browser

---

### Phase 6: PDF Generation
**Why sixth:** Depends on dashboard having mature data model.

**Components:**
1. PDF template design
2. Serverless function (Puppeteer/PDFKit)
3. Weekly report logic
4. Email delivery

**Deliverable:** Auto-generated weekly safety PDFs

---

### Phase 7: Compliance Features
**Why seventh:** Polish layer on top of working system.

**Components:**
1. RIDDOR auto-flagging
2. Certification expiry tracking
3. Email alerts
4. Consent management UI

**Deliverable:** Full GDPR + RIDDOR compliance

---

## Technology Recommendations (Context-Specific)

Based on SiteMedic's constraints and requirements:

### Validated Choices

| Technology | Reason | Alternative Considered |
|-----------|--------|------------------------|
| **WatermelonDB** | Best offline-first SQLite ORM for React Native, mature sync support, built-in observable pattern | Realm (sunset in 2023), SQLite direct (too low-level) |
| **Supabase** | PostgreSQL + Auth + Storage + UK hosting in one service, excellent RLS support, fast to ship | Firebase (US-only hosting, GDPR concerns), custom Node.js API (slower MVP) |
| **React Query** | Industry-standard server state management for React, excellent caching, TypeScript support | Redux (overkill for read-only dashboard), SWR (less mature) |
| **Expo** | Fastest React Native DX, handles native builds, OTA updates, great offline testing tools | Bare React Native (slower setup, manual native code), Flutter (non-JavaScript) |
| **SQLCipher** | Industry-standard SQLite encryption (AES-256), FIPS 140-2 validated, GDPR-compliant | Custom encryption (reinventing wheel), Realm Encryption (Realm deprecated) |

### Open Questions (Defer to Implementation Phase)

- **PDF Library:** Puppeteer (headless Chrome, heavy) vs PDFKit (lightweight, manual layout) — test both for performance
- **Push Notifications:** Expo Notifications (simpler) vs Firebase Cloud Messaging (more control) — depends on alert complexity
- **Background Sync:** React Native Background Task (limited to 15-min intervals) vs WorkManager (Android-only) — test iOS background constraints

## Sources

**Offline-First Architecture:**
- [Offline-First Architecture: Designing for Reality, Not Just the Cloud](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79)
- [React Native 2026: Mastering Offline-First Architecture](https://javascript.plainenglish.io/react-native-2026-mastering-offline-first-architecture-ad9df4cb61ae)
- [5 Critical Components for Implementing Offline-First Strategy](https://medium.com/@therahulpahuja/5-critical-components-for-implementing-a-successful-offline-first-strategy-in-mobile-applications-849a6e1c5d57)

**React Native Sync Patterns:**
- [How to Implement Data Sync Between Local and Remote in React Native](https://oneuptime.com/blog/post/2026-01-15-react-native-data-sync/view)
- [Building Offline-First React Native Apps: The Complete Guide (2026)](https://javascript.plainenglish.io/building-offline-first-react-native-apps-the-complete-guide-2026-68ff77c7bb06)

**Conflict Resolution:**
- [How to Build Offline Capabilities](https://oneuptime.com/blog/post/2026-01-30-offline-capabilities/view)
- [Offline-First Done Right: Sync Patterns for Real-World Mobile Networks](https://developersvoice.com/blog/mobile/offline-first-sync-patterns/)

**Supabase + React Native:**
- [Offline-first React Native Apps with Expo, WatermelonDB, and Supabase](https://supabase.com/blog/react-native-offline-first-watermelon-db)
- [PowerSync: Bringing Offline-First To Supabase](https://www.powersync.com/blog/bringing-offline-first-to-supabase)

**Photo Upload & Compression:**
- [Offline File Sync: Developer Guide 2024](https://daily.dev/blog/offline-file-sync-developer-guide-2024)
- [The Future of Image Optimization](https://medium.com/@kocsis.david89/the-future-of-image-optimization-37bc8e390735)

**PDF Generation:**
- [6 Best PDF Generation APIs in 2026](https://craftmypdf.com/blog/best-pdf-generation-apis/)
- [Why Generating PDF Documents Server-Side](https://www.textcontrol.com/blog/2021/12/30/generating-pdf-documents-in-the-browser/)

**GDPR Compliance:**
- [GDPR Mobile App Compliance: Development Guide](https://complydog.com/blog/gdpr-mobile-app-compliance-development-guide)
- [GDPR Compliance for Developers: Practical Implementation in 2026](https://dasroot.net/posts/2026/02/gdpr-compliance-developers-practical-implementation-2026/)
- [Mobile App Consent Management SDK: What You Need to Know in 2025](https://secureprivacy.ai/blog/mobile-app-sdk-consent-management)

**Background Sync:**
- [How to Implement Background Sync in React Native](https://oneuptime.com/blog/post/2026-01-15-react-native-background-sync/view)
- [React Native Queue (GitHub)](https://github.com/billmalarky/react-native-queue)

**Encryption:**
- [React Native Encryption and Encrypted Database/Storage](https://rxdb.info/articles/react-native-encryption.html)
- [Best SQLite Solutions for React Native App Development in 2026](https://vibe.forem.com/eira-wexford/best-sqlite-solutions-for-react-native-app-development-in-2026-3b5l)

**WatermelonDB:**
- [WatermelonDB GitHub](https://github.com/Nozbe/WatermelonDB)
- [Sync Data Offline with WatermelonDB](https://www.somethingsblog.com/2024/10/21/sync-data-offline-with-watermelondb/)
- [Using WatermelonDB for offline data sync](https://blog.logrocket.com/watermelondb-offline-data-sync/)

**Multi-Tenant Architecture:**
- [Multi-Tenant Mobile Architecture](https://medium.com/@ranvirpawar08/multi-tenant-mobile-architecture-c950e793efb7)
- [Architecting Secure Multi-Tenant Data Isolation](https://medium.com/@justhamade/architecting-secure-multi-tenant-data-isolation-d8f36cb0d25e)

---
*Architecture research for: SiteMedic offline-first medical compliance platform*
*Researched: 2026-02-15*
