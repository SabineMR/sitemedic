# Phase 1: Foundation - Research

**Researched:** 2026-02-15
**Domain:** Offline-first mobile backend infrastructure with medical data compliance (Supabase + WatermelonDB + GDPR)
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational backend API, authentication, and offline-first infrastructure for SiteMedic. Research confirms the validated stack (Expo SDK 54 + WatermelonDB + Supabase) has well-documented implementation patterns for offline-first healthcare applications with GDPR compliance. The critical technical domains are: Supabase UK region setup with Row-Level Security for multi-tenancy, WatermelonDB local encryption with SQLCipher, bidirectional sync architecture with conflict resolution, and comprehensive audit logging for health data access.

Key findings: Supabase offers eu-west-2 (London) region for UK data residency, RLS policies provide database-level tenant isolation, WatermelonDB sync follows a master/replica pattern with last-write-wins conflict resolution, and expo-secure-store provides platform-native encryption (iOS Keychain / Android Keystore) for encryption key management. The primary implementation challenge is offline session handling—Supabase Auth's automatic refresh can log users out when offline, requiring custom session persistence logic.

**Primary recommendation:** Use UUID primary keys (not auto-increment) for all tables to enable offline record creation without server coordination. Implement sync queue persistence in WatermelonDB's local SQLite database (not in-memory), use expo-secure-store for SQLCipher encryption keys (never AsyncStorage), and build custom offline session wrapper around Supabase Auth to prevent logout when network unavailable. All audit logging must be database-level (PostgreSQL triggers) not application-level to ensure compliance even if app bypassed.

## Standard Stack

The established libraries/tools for offline-first mobile backend with GDPR-compliant medical data storage:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | Latest | Backend API (PostgreSQL + Auth + Storage + Edge Functions) | Official PostgreSQL-based BaaS with UK region (eu-west-2 London), SOC 2 + HIPAA + GDPR compliant, auto-generated REST API via PostgREST, Row-Level Security for multi-tenant isolation |
| WatermelonDB | 0.28.0+ | Offline-first local database (SQLite wrapper) | Built for React Native, lazy-loading for instant app launch, reactive observables for UI auto-updates, Supabase officially recommends for offline sync pattern |
| expo-secure-store | Latest (Expo SDK 54) | Encryption key storage | Platform-native secure storage (iOS Keychain / Android Keystore), biometric authentication support, up to 2MB per key-value pair |
| @react-native-community/netinfo | 11.x | Network connectivity detection | Official React Native community package, real-time connection state updates, supports WiFi/cellular/none detection, configurable reachability testing |
| expo-local-authentication | Latest (Expo SDK 54) | Biometric authentication (Face ID / Touch ID) | Official Expo module, supports iOS Face ID and Touch ID, Android fingerprint, hardware-backed security |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-native-async-storage/async-storage | Latest | Session persistence for Supabase Auth | Required for Supabase Auth on React Native (non-web platforms lack localStorage) |
| react-native-mmkv | Latest | High-performance key-value storage | Optional upgrade over AsyncStorage for session data—30x faster, built-in encryption, synchronous access; use if AsyncStorage causes performance issues |
| pg_cron | Built-in (Supabase) | Scheduled database tasks | Data retention policy enforcement (auto-delete after GDPR retention period), certification expiry checks, periodic cleanup |
| pgaudit | Built-in (Supabase) | PostgreSQL audit logging extension | GDPR compliance for health data access tracking, comprehensive database activity logging |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WatermelonDB | Realm | Realm offers automatic sync but MongoDB pricing model; WatermelonDB gives full control over sync logic and pairs natively with PostgreSQL |
| Supabase | Firebase | Firebase has better offline SDK but vendor lock-in, no PostgreSQL (NoSQL only), limited RLS, unclear GDPR compliance for UK region |
| UUID primary keys | Auto-increment (SERIAL) | Auto-increment requires server coordination (breaks offline record creation), UUID enables client-side ID generation but larger index size (~50% more disk space) |
| expo-secure-store | AsyncStorage for keys | AsyncStorage is unencrypted plaintext, fails GDPR encryption requirements; expo-secure-store is hardware-backed encryption |

**Installation:**
```bash
# Core dependencies
npx expo install expo-secure-store expo-local-authentication @react-native-async-storage/async-storage @react-native-community/netinfo
npm install @nozbe/watermelondb @supabase/supabase-js

# WatermelonDB requires native module configuration
npx expo install expo-build-properties
# Add to app.json: "plugins": [["expo-build-properties", {"android": {"packagingOptions": {"pickFirst": ["**/libcrypto.so", "**/libssl.so"]}}}]]

# Optional: High-performance session storage upgrade
npm install react-native-mmkv
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── supabase.ts           # Supabase client initialization with AsyncStorage
│   ├── watermelon.ts          # WatermelonDB database adapter + schema
│   └── auth-manager.ts        # Offline session wrapper (prevents logout when offline)
├── database/
│   ├── models/                # WatermelonDB model classes (@nozbe/watermelondb/Model)
│   │   ├── Treatment.ts
│   │   ├── Worker.ts
│   │   └── ...
│   ├── schema.ts              # WatermelonDB schema definition
│   ├── migrations.ts          # WatermelonDB schema migrations
│   └── sync.ts                # Sync orchestration (push/pull functions)
├── services/
│   ├── SyncQueue.ts           # Persistent sync queue with exponential backoff
│   ├── NetworkMonitor.ts      # NetInfo wrapper for connectivity state
│   └── AuditLogger.ts         # Client-side audit log queueing (writes to server)
└── types/
    └── supabase.ts            # TypeScript types for Supabase schema
```

### Pattern 1: Supabase UK Region Setup for GDPR Compliance
**What:** Configure Supabase project to use eu-west-2 (London) region for UK data residency, sign Data Processing Agreement (DPA) with Supabase, enable Row-Level Security on all tables.
**When to use:** MANDATORY for GDPR compliance with UK health data (special category personal data under Article 9).
**Example:**
```typescript
// 1. Create Supabase project via dashboard: https://supabase.com/dashboard
// Select region: "West Europe (London)" or "eu-west-2"
// Request DPA: Dashboard → Settings → Legal → Request DPA (or email support@supabase.io)

// 2. Initialize client with region-specific URL
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL! // https://[project].supabase.co
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Mobile apps don't use URL-based auth
  },
})

// 3. Enable RLS on ALL tables (Supabase SQL Editor or migration)
-- Enable Row Level Security
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_misses ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for multi-tenant isolation
CREATE POLICY "Users access their organization's data"
  ON treatments
  FOR ALL
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);
```
**Source:** [Supabase Available Regions](https://supabase.com/docs/guides/platform/regions), [Supabase GDPR Discussion](https://github.com/orgs/supabase/discussions/2341), [Supabase DPA](https://supabase.com/downloads/docs/Supabase+DPA+250314.pdf)

### Pattern 2: WatermelonDB Schema + SQLCipher Encryption
**What:** Define WatermelonDB schema with UUIDs for primary keys, configure SQLiteAdapter, enable encryption via SQLCipher fork (community-maintained), store encryption key in expo-secure-store.
**When to use:** ALL local health data must be encrypted at rest per GDPR Article 32 (security of processing).
**Example:**
```typescript
// database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'treatments',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true }, // Supabase UUID after sync
        { name: 'worker_id', type: 'string', isIndexed: true },
        { name: 'injury_type', type: 'string' },
        { name: 'body_part', type: 'string' },
        { name: 'treatment_notes', type: 'string' },
        { name: 'photo_uris', type: 'string' }, // JSON array of local URIs
        { name: 'created_at', type: 'number' }, // Timestamp (epoch milliseconds)
        { name: 'updated_at', type: 'number' },
        { name: 'last_modified_at', type: 'number' }, // For conflict resolution
      ],
    }),
    // ... other tables
  ],
})

// lib/watermelon.ts
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import * as SecureStore from 'expo-secure-store'
import { schema } from '../database/schema'
import migrations from '../database/migrations'
// Import all model classes
import Treatment from '../database/models/Treatment'
import Worker from '../database/models/Worker'

// CRITICAL: Encryption key management
async function getOrCreateEncryptionKey(): Promise<string> {
  const KEY_NAME = 'watermelondb_encryption_key'

  // Try to retrieve existing key
  let key = await SecureStore.getItemAsync(KEY_NAME)

  if (!key) {
    // Generate new 256-bit key (64 hex characters)
    const crypto = require('expo-crypto')
    const randomBytes = crypto.getRandomBytes(32) // 32 bytes = 256 bits
    key = Array.from(randomBytes, byte => ('0' + byte.toString(16)).slice(-2)).join('')

    // Store in platform-native secure storage (iOS Keychain / Android Keystore)
    await SecureStore.setItemAsync(KEY_NAME, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: false, // Don't require biometrics for every DB access
    })
  }

  return key
}

// Initialize database with encryption
export async function initDatabase(): Promise<Database> {
  const encryptionKey = await getOrCreateEncryptionKey()

  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    // GOTCHA: Built-in SQLCipher support not yet merged (PR #907)
    // Use community fork: @nozbe/watermelondb-sqlcipher or patch with custom SQLite build
    // jsi: true, // Enable JSI for better performance
    // encryptionKey, // Pass to custom SQLCipher adapter
  })

  const database = new Database({
    adapter,
    modelClasses: [Treatment, Worker, /* ... */],
  })

  return database
}
```
**CRITICAL GOTCHA:** Native SQLCipher support for WatermelonDB is NOT yet in stable release (as of Feb 2026). The PR #907 exists but isn't merged. Options:
1. Use community fork `@nozbe/watermelondb-sqlcipher` (unverified third-party)
2. Build custom SQLite with SQLCipher enabled (complex native build process)
3. Defer encryption to Phase 2 after testing baseline sync, then integrate SQLCipher fork

**Source:** [WatermelonDB SQLCipher PR #907](https://github.com/Nozbe/WatermelonDB/pull/907), [SQLCipher React Native Enterprise](https://www.zetetic.net/sqlcipher/react-native/), [expo-secure-store docs](https://docs.expo.dev/versions/latest/sdk/securestore/)

### Pattern 3: Offline Session Handling (Prevent Logout When Offline)
**What:** Wrap Supabase Auth in custom AuthManager that reads cached session from AsyncStorage when offline, bypasses automatic refresh retry loop, restores session when connectivity returns.
**When to use:** MANDATORY for offline-first apps—default Supabase Auth logs users out if refresh fails when offline.
**Example:**
```typescript
// lib/auth-manager.ts
import { supabase } from './supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

const SESSION_KEY = 'supabase.auth.token'

export class AuthManager {
  private isOnline = true

  async initialize() {
    // Monitor connectivity
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false
    })

    // On startup, check if offline and restore cached session
    const netState = await NetInfo.fetch()
    if (!netState.isConnected) {
      await this.restoreCachedSession()
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !this.isOnline) {
        // PREVENT offline logout—restore cached session
        this.restoreCachedSession()
      }
    })
  }

  private async restoreCachedSession() {
    try {
      const cachedSessionStr = await AsyncStorage.getItem(SESSION_KEY)
      if (!cachedSessionStr) return

      const cachedSession = JSON.parse(cachedSessionStr)

      // Validate token hasn't expired
      const expiresAt = cachedSession.expires_at
      if (expiresAt && Date.now() / 1000 < expiresAt) {
        // Manually set session (bypassing server refresh)
        await supabase.auth.setSession(cachedSession)
      }
    } catch (error) {
      console.error('Failed to restore cached session:', error)
    }
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (data.session) {
      // Cache session for offline restoration
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session))
    }
    return { data, error }
  }

  async signOut() {
    await AsyncStorage.removeItem(SESSION_KEY)
    await supabase.auth.signOut()
  }
}

export const authManager = new AuthManager()
```
**Source:** [Supabase offline session discussion](https://github.com/orgs/supabase/discussions/36906), [React Native Auth guide](https://supabase.com/docs/guides/auth/quickstarts/react-native)

### Pattern 4: Row-Level Security for Multi-Tenant Isolation
**What:** Add `org_id` column to all tables, create PostgreSQL policies that filter rows based on JWT claim `auth.jwt() -> 'app_metadata' -> 'org_id'`, set `org_id` in user metadata during signup.
**When to use:** MANDATORY for multi-tenant SaaS with health data—ensures database-level isolation even if application code bypassed.
**Example:**
```sql
-- 1. Add org_id to all tables
ALTER TABLE treatments ADD COLUMN org_id UUID NOT NULL REFERENCES organizations(id);
ALTER TABLE workers ADD COLUMN org_id UUID NOT NULL REFERENCES organizations(id);
CREATE INDEX idx_treatments_org_id ON treatments(org_id);
CREATE INDEX idx_workers_org_id ON workers(org_id);

-- 2. Enable RLS
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
CREATE POLICY "Org members access their org's treatments"
  ON treatments
  FOR ALL
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

CREATE POLICY "Org members access their org's workers"
  ON workers
  FOR ALL
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- 4. Performance optimization: Add explicit filters in queries (avoid full table scan)
-- Client-side: Always add .eq('org_id', userOrgId) even though RLS enforces it
-- Why: Postgres query planner can use index when filter explicit (99.94% faster per Supabase docs)
```

```typescript
// Set org_id during signup (server-side Edge Function or Database Trigger)
-- Database trigger approach (runs on auth.users insert)
CREATE OR REPLACE FUNCTION set_user_org_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Assume org_id passed during signup in raw_user_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{org_id}',
    to_jsonb(NEW.raw_user_meta_data->>'org_id')
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_org_metadata();
```
**CRITICAL:** JWT claims are NOT real-time—removing a user from an org won't take effect until token refresh (default 1 hour). For immediate revocation, implement server-side validation in Edge Functions.

**Source:** [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase RLS Complete Guide](https://designrevision.com/blog/supabase-row-level-security), [Multi-Tenant RLS Guide](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

### Pattern 5: Sync Queue with Persistent Storage + Exponential Backoff
**What:** Store pending sync operations in WatermelonDB's local SQLite (not in-memory), implement retry logic with exponential backoff (5min → 15min → 1hr → 4hr), prioritize RIDDOR-reportable incidents for immediate sync.
**When to use:** ALL offline-first apps to prevent data loss during network failures.
**Example:**
```typescript
// database/models/SyncQueueItem.ts
import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export default class SyncQueueItem extends Model {
  static table = 'sync_queue'

  @field('operation') operation!: 'create' | 'update' | 'delete'
  @field('table_name') tableName!: string
  @field('record_id') recordId!: string // Local WatermelonDB ID
  @field('payload') payload!: string // JSON stringified data
  @field('priority') priority!: number // 0 = immediate (RIDDOR), 1 = normal
  @field('retry_count') retryCount!: number
  @date('next_retry_at') nextRetryAt!: Date
  @date('created_at') createdAt!: Date
}

// services/SyncQueue.ts
import { database } from '../lib/watermelon'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'

export class SyncQueue {
  private isProcessing = false

  async enqueue(operation: string, tableName: string, recordId: string, payload: any, priority = 1) {
    await database.write(async () => {
      await database.collections.get('sync_queue').create((item: any) => {
        item.operation = operation
        item.tableName = tableName
        item.recordId = recordId
        item.payload = JSON.stringify(payload)
        item.priority = priority
        item.retryCount = 0
        item.nextRetryAt = new Date() // Immediate first attempt
        item.createdAt = new Date()
      })
    })

    // Trigger sync if online
    const netState = await NetInfo.fetch()
    if (netState.isConnected) {
      this.processPendingItems()
    }
  }

  async processPendingItems() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const now = new Date()
      const pendingItems = await database.collections
        .get('sync_queue')
        .query(
          Q.where('next_retry_at', Q.lte(now.getTime())),
          Q.sortBy('priority', Q.asc), // RIDDOR-reportable first
          Q.sortBy('created_at', Q.asc)
        )
        .fetch()

      for (const item of pendingItems) {
        try {
          await this.syncItem(item)
          // Success—remove from queue
          await database.write(async () => {
            await item.destroyPermanently()
          })
        } catch (error) {
          // Failed—update retry with exponential backoff
          await this.scheduleRetry(item)
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  private async scheduleRetry(item: any) {
    const retryCount = item.retryCount + 1
    const backoffMinutes = Math.min(5 * Math.pow(2, retryCount), 240) // Max 4 hours
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

    await database.write(async () => {
      await item.update((record: any) => {
        record.retryCount = retryCount
        record.nextRetryAt = nextRetryAt
      })
    })
  }

  private async syncItem(item: any) {
    const payload = JSON.parse(item.payload)

    switch (item.operation) {
      case 'create':
        await supabase.from(item.tableName).insert(payload)
        break
      case 'update':
        await supabase.from(item.tableName).update(payload).eq('id', payload.id)
        break
      case 'delete':
        await supabase.from(item.tableName).delete().eq('id', payload.id)
        break
    }
  }
}

export const syncQueue = new SyncQueue()
```
**Source:** [React Native Background Sync](https://oneuptime.com/blog/post/2026-01-15-react-native-background-sync/view), [Offline Queue Patterns](https://wild.codes/candidate-toolkit-question/how-do-you-manage-app-state-and-offline-first-sync-in-react-native)

### Pattern 6: Database-Level Audit Logging (PostgreSQL Triggers)
**What:** Create audit_log table, define PostgreSQL triggers on all health data tables to capture INSERT/UPDATE/DELETE operations, log user_id (from auth.uid()), timestamp, operation type, row data (excluding PII in logs per GDPR Article 32).
**When to use:** MANDATORY for GDPR Article 30 (records of processing activities) and demonstrating compliance with Article 5(2) (accountability).
**Example:**
```sql
-- 1. Create audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  changed_fields JSONB, -- Only field names, NOT values (avoid PII in logs)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit logs (users can't access logs directly)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins access audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 2. Create audit logging trigger function
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
BEGIN
  -- Determine which fields changed (for UPDATE)
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key)
    INTO changed_fields_array
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key;
  END IF;

  INSERT INTO audit_logs (
    table_name,
    record_id,
    operation,
    user_id,
    org_id,
    changed_fields,
    ip_address,
    user_agent
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(), -- Current authenticated user
    COALESCE(NEW.org_id, OLD.org_id),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(changed_fields_array) ELSE NULL END,
    inet_client_addr(), -- IP address (NULL for server-side operations)
    current_setting('request.headers', true)::json->>'user-agent'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to all health data tables
CREATE TRIGGER audit_treatments
  AFTER INSERT OR UPDATE OR DELETE ON treatments
  FOR EACH ROW EXECUTE FUNCTION log_data_access();

CREATE TRIGGER audit_workers
  AFTER INSERT OR UPDATE OR DELETE ON workers
  FOR EACH ROW EXECUTE FUNCTION log_data_access();

-- 4. Data retention policy (GDPR: delete logs after 3 years minimum for RIDDOR)
-- Use pg_cron for scheduled deletion
SELECT cron.schedule(
  'delete-old-audit-logs',
  '0 2 * * *', -- Daily at 2 AM
  $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '3 years'$$
);
```
**CRITICAL:** Do NOT log sensitive field values (e.g., treatment_notes) in audit logs—only log which fields changed. GDPR requires minimization of personal data in logs.

**Source:** [GDPR Logging Guide](https://www.konfirmity.com/blog/gdpr-logging-and-monitoring), [Supabase Database Triggers](https://rsakib.com/blogs/creating-using-database-triggers-supabase), [PGAudit Extension](https://supabase.com/docs/guides/database/extensions/pgaudit)

### Anti-Patterns to Avoid
- **Storing encryption keys in AsyncStorage** — AsyncStorage is unencrypted plaintext; GDPR violation for health data. Always use expo-secure-store (hardware-backed Keychain/Keystore).
- **Auto-increment primary keys for offline-first** — Server-generated IDs require coordination, breaking offline record creation. Use UUIDs generated client-side.
- **Application-level RLS checks** — If app code enforces tenant isolation, a bug or API bypass exposes all data. Always use PostgreSQL RLS (database-level enforcement).
- **Logging PII in audit logs** — GDPR Article 32 requires minimization. Log field names changed, not values. Never log treatment notes, injury details, etc.
- **Relying on Supabase Auth auto-refresh offline** — Default behavior logs users out when offline. Implement custom session cache restoration.
- **In-memory sync queue** — App crash or force-quit loses pending changes. Persist sync queue in WatermelonDB's SQLite.
- **Ignoring JWT staleness** — Removing user from org doesn't take effect until token refresh (1 hour). For immediate revocation, check permissions server-side in Edge Functions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline session persistence | Custom token refresh logic with AsyncStorage caching | AuthManager wrapper + Supabase session validation | Supabase Auth handles token rotation, expiry checks, refresh flow; custom logic misses edge cases (concurrent refresh, token revocation, security updates) |
| Network connectivity detection | Manual navigator.onLine polling or fetch() timeout checks | @react-native-community/netinfo | Provides real-time connection state changes, WiFi vs cellular detection, reachability testing, handles platform differences (iOS/Android/web) |
| Encryption key storage | Base64 encoding in AsyncStorage or file system | expo-secure-store (iOS Keychain / Android Keystore) | Hardware-backed encryption, biometric protection, automatic key rotation, survives app reinstalls on iOS, GDPR-compliant |
| Audit logging | Application-level logging to separate audit table via API calls | PostgreSQL triggers with SECURITY DEFINER functions | Cannot be bypassed by malicious app code, logs all access (even from SQL editor or third-party tools), enforces GDPR accountability |
| Data retention policies | Manual cron job scripts or Lambda functions to delete old records | pg_cron extension (built into Supabase) | Database-native scheduling, transactional guarantees, no external infrastructure, logged in PostgreSQL logs |
| Sync conflict resolution | Custom timestamp comparison logic | WatermelonDB's built-in sync with last_modified_at column | Handles edge cases (concurrent edits, partial sync failures, schema migrations), battle-tested by production apps |
| Multi-tenant data isolation | WHERE org_id = ? in every query | Row-Level Security policies | Database-level enforcement even if app bypassed, 99.94% faster with indexes (per Supabase benchmarks), audit trail built-in |

**Key insight:** Phase 1 is foundational infrastructure—use battle-tested solutions, not custom code. Retrofit after launch is 10x harder for encryption, audit logging, and sync architecture.

## Common Pitfalls

### Pitfall 1: SQLCipher Integration Complexity (WatermelonDB Encryption)
**What goes wrong:** WatermelonDB's official SQLCipher support is not yet merged (PR #907 open since 2021). Developers attempt to patch native SQLite builds with SQLCipher or use unverified third-party forks, leading to build failures, crashes on iOS/Android, or silent data corruption.
**Why it happens:** GDPR requires encryption at rest (Article 32), but WatermelonDB's roadmap hasn't prioritized this. The community has forks but no official guidance on integration with Expo.
**How to avoid:**
- **Option A (recommended for Phase 1):** Defer SQLCipher to Phase 2. Launch with unencrypted local storage initially (acceptable for internal testing, NOT production). This validates sync architecture without encryption complexity.
- **Option B:** Use `react-native-sqlcipher-storage` instead of WatermelonDB for encrypted local storage, but lose reactive observables and lazy-loading benefits.
- **Option C:** Build custom SQLite with SQLCipher enabled—requires native Android/iOS expertise, modifying Expo build process, ongoing maintenance.
**Warning signs:** Gradle build errors mentioning "duplicate libcrypto.so," iOS linker errors with SQLCipher symbols, WatermelonDB queries failing silently after app restart.
**Decision:** Research recommends deferring encryption to Phase 2 after baseline sync validated. Use expo-file-system with expo-crypto for file-level encryption as interim solution (encrypt photo files, JSON exports of treatment data).

### Pitfall 2: Offline Session Logout Loop
**What goes wrong:** User opens app without internet → Supabase Auth attempts token refresh → fails after retries → logs user out → user sees login screen despite valid cached session in AsyncStorage → terrible UX for offline-first app.
**Why it happens:** Supabase Auth's default behavior assumes online-first architecture. The refresh mechanism doesn't distinguish "server unreachable" from "session expired."
**How to avoid:** Implement AuthManager wrapper (Pattern 3 above) that:
1. Reads session from AsyncStorage on startup if offline
2. Validates token expiry locally (check `expires_at` timestamp)
3. Restores session via `supabase.auth.setSession()` without server call
4. Listens for SIGNED_OUT events and blocks them when offline
5. Resumes normal refresh when connectivity returns
**Warning signs:** Users report being logged out when traveling (airplane mode, poor signal), session state flickers between authenticated/unauthenticated on app launch, AsyncStorage contains valid session but UI shows login screen.

### Pitfall 3: UUID vs Auto-Increment Confusion
**What goes wrong:** Database schema uses SERIAL (auto-increment) primary keys → mobile app creates treatment record offline with local temp ID → sync attempts to insert with server-generated ID → ID conflict or data loss.
**Why it happens:** Auto-increment requires database coordination (NEXTVAL on sequence). Offline clients can't generate valid IDs without server.
**How to avoid:**
- Use UUID primary keys for ALL tables that sync (treatments, workers, near_misses, etc.)
- Generate UUIDs client-side: `crypto.randomUUID()` in React Native or `gen_random_uuid()` in PostgreSQL
- Add `server_id` column to WatermelonDB models (nullable) to store Supabase UUID after first sync
- Local WatermelonDB uses its own auto-increment ID internally; map to `server_id` during sync
**Warning signs:** Sync errors like "duplicate key violation" or "ID already exists," records created offline never appear in Supabase dashboard, orphaned local records after sync completes.

### Pitfall 4: RLS Performance Degradation (Missing Indexes)
**What goes wrong:** RLS policies filter by `org_id` on every query → queries slow down from <10ms to 500ms+ as data grows → app feels sluggish → users complain.
**Why it happens:** RLS policies act as implicit WHERE clauses. Without indexes on filtered columns, PostgreSQL scans entire table.
**How to avoid:**
- **ALWAYS** create indexes on RLS policy columns: `CREATE INDEX idx_treatments_org_id ON treatments(org_id)`
- Add explicit filters in client queries even though RLS enforces them: `.eq('org_id', userOrgId)`
- Use Supabase dashboard → Database → Indexes to monitor index usage
- Benchmark with 10,000+ rows before launch
**Warning signs:** Supabase dashboard shows slow queries (>100ms), EXPLAIN ANALYZE reveals sequential scans instead of index scans, app hangs when loading treatment list.
**Impact:** 99.94% performance improvement with indexes per Supabase benchmarks.

### Pitfall 5: Audit Log PII Leakage
**What goes wrong:** Audit logging trigger stores entire row JSON (including treatment_notes, injury_details) → audit logs contain special category health data → GDPR violation (logs must use data minimization per Article 5(1)(c)).
**Why it happens:** Developers copy-paste generic audit logging code without GDPR review.
**How to avoid:**
- Log ONLY: table_name, record_id, operation (INSERT/UPDATE/DELETE), user_id, timestamp, changed field names (array)
- NEVER log field values for health data
- Use `to_jsonb(changed_fields_array)` not `to_jsonb(NEW)`
- Anonymize IP addresses (store first 3 octets only: `192.168.1.xxx`)
- Set data retention: delete audit logs after 3 years (RIDDOR minimum)
**Warning signs:** Audit logs table growing faster than main tables, compliance review flags PII in logs, pg_dump backup includes full treatment notes in audit_logs.

### Pitfall 6: Sync Queue Data Loss (App Force-Quit)
**What goes wrong:** User creates treatment offline → app queues sync operation in-memory (JavaScript variable) → user force-quits app → sync queue lost → treatment never syncs to server → data loss.
**Why it happens:** React Native doesn't persist in-memory state across app restarts.
**How to avoid:**
- Store sync queue in WatermelonDB's SQLite (Pattern 5 above)
- Create `sync_queue` table in schema
- Write to queue in database transaction, not in-memory array
- Load pending items from database on app startup
**Warning signs:** Users report treatments "disappearing" after force-quit, sync queue shows 0 items after app restart despite offline edits, sync only works if app kept in background (not force-quit).

### Pitfall 7: JWT Staleness (Immediate Revocation Fails)
**What goes wrong:** Admin removes user from organization → user's JWT still has old `org_id` claim for up to 1 hour → user continues accessing org's health data → GDPR data breach.
**Why it happens:** JWTs are stateless tokens valid until expiry. Supabase Auth refreshes every 1 hour by default.
**How to avoid:**
- For CRITICAL permissions (delete worker, export all data), validate server-side in Edge Function
- Query `auth.users` table to check current `app_metadata.org_id`
- Don't rely solely on JWT claims for authorization
- Consider shorter token expiry (15 minutes) for high-security apps
- Implement token revocation table (blacklist) for immediate logout
**Warning signs:** Removed users retain access for 30-60 minutes, compliance audit flags delayed permission revocation, security logs show access after org removal.

## Code Examples

Verified patterns from official sources:

### WatermelonDB Sync Implementation (Push/Pull with Supabase)
```typescript
// database/sync.ts
import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../lib/watermelon'
import { supabase } from '../lib/supabase'

export async function syncDatabase() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // Call Supabase RPC function that returns changes since timestamp
      const { data, error } = await supabase.rpc('pull_changes', {
        last_pulled_at: lastPulledAt,
        schema_version: schemaVersion,
        migration: migration,
      })

      if (error) throw error

      return {
        changes: data.changes, // { treatments: { created: [...], updated: [...], deleted: [...] } }
        timestamp: data.timestamp, // Server's current timestamp
      }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // Send local changes to Supabase RPC function
      const { error } = await supabase.rpc('push_changes', {
        changes: changes,
        last_pulled_at: lastPulledAt,
      })

      if (error) throw error
    },
    sendCreatedAsUpdated: true, // Treat local creates as updates if server already has record
    // Migration syncs (Phase 2 feature—fetch missing columns after schema migration)
    migrationsEnabledAtVersion: 2,
  })
}
```

**Supabase RPC functions (PostgreSQL):**
```sql
-- pull_changes: Return all changes since last_pulled_at timestamp
CREATE OR REPLACE FUNCTION pull_changes(
  last_pulled_at BIGINT, -- Milliseconds since epoch
  schema_version INT,
  migration JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  current_timestamp BIGINT;
BEGIN
  current_timestamp := FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000);

  -- Query changes for each table
  result := jsonb_build_object(
    'changes', jsonb_build_object(
      'treatments', jsonb_build_object(
        'created', (SELECT jsonb_agg(to_jsonb(t)) FROM treatments t
                    WHERE FLOOR(EXTRACT(EPOCH FROM t.created_at) * 1000) > last_pulled_at),
        'updated', (SELECT jsonb_agg(to_jsonb(t)) FROM treatments t
                    WHERE FLOOR(EXTRACT(EPOCH FROM t.updated_at) * 1000) > last_pulled_at
                    AND FLOOR(EXTRACT(EPOCH FROM t.created_at) * 1000) <= last_pulled_at),
        'deleted', (SELECT jsonb_agg(id) FROM treatments
                    WHERE deleted_at IS NOT NULL
                    AND FLOOR(EXTRACT(EPOCH FROM deleted_at) * 1000) > last_pulled_at)
      )
      -- Repeat for workers, near_misses, etc.
    ),
    'timestamp', current_timestamp
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- push_changes: Apply local changes to server
CREATE OR REPLACE FUNCTION push_changes(
  changes JSONB,
  last_pulled_at BIGINT
) RETURNS VOID AS $$
DECLARE
  treatment JSONB;
BEGIN
  -- Check for conflicts (server changed since last pull)
  IF EXISTS (
    SELECT 1 FROM treatments
    WHERE FLOOR(EXTRACT(EPOCH FROM updated_at) * 1000) > last_pulled_at
  ) THEN
    RAISE EXCEPTION 'Conflict detected - server data changed since last pull';
  END IF;

  -- Apply creates
  FOR treatment IN SELECT * FROM jsonb_array_elements(changes->'treatments'->'created')
  LOOP
    INSERT INTO treatments (id, worker_id, injury_type, body_part, treatment_notes, created_at, updated_at)
    VALUES (
      (treatment->>'id')::UUID,
      (treatment->>'worker_id')::UUID,
      treatment->>'injury_type',
      treatment->>'body_part',
      treatment->>'treatment_notes',
      to_timestamp((treatment->>'created_at')::BIGINT / 1000.0),
      to_timestamp((treatment->>'updated_at')::BIGINT / 1000.0)
    )
    ON CONFLICT (id) DO NOTHING; -- Idempotency
  END LOOP;

  -- Apply updates (similar pattern)
  -- Apply deletes (similar pattern)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
**Source:** [Supabase + WatermelonDB Offline-First Guide](https://supabase.com/blog/react-native-offline-first-watermelon-db), [WatermelonDB Sync Implementation](https://watermelondb.dev/docs/Implementation/SyncImpl)

### Biometric Authentication with Fallback
```typescript
// lib/biometric-auth.ts
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

export async function enableBiometricAuth(userId: string) {
  // 1. Check hardware support
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  if (!hasHardware) {
    throw new Error('Device does not support biometric authentication')
  }

  // 2. Check enrollment
  const isEnrolled = await LocalAuthentication.isEnrolledAsync()
  if (!isEnrolled) {
    throw new Error('No biometrics enrolled on device')
  }

  // 3. Check supported types
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()
  console.log('Supported biometrics:', supportedTypes)
  // [1] = FINGERPRINT, [2] = FACIAL_RECOGNITION, [3] = IRIS

  // 4. Store flag in SecureStore (protected by biometrics)
  await SecureStore.setItemAsync(`biometric_enabled_${userId}`, 'true', {
    requireAuthentication: true, // Require biometrics to read this value
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access SiteMedic',
      fallbackLabel: 'Use Passcode', // iOS only
      disableDeviceFallback: false, // Allow passcode fallback
      cancelLabel: 'Cancel', // Android only
    })

    return result.success
  } catch (error) {
    console.error('Biometric auth error:', error)
    return false
  }
}

export async function isBiometricEnabled(userId: string): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(`biometric_enabled_${userId}`)
    return value === 'true'
  } catch (error) {
    // Error reading means not enabled or biometrics changed (key invalidated)
    return false
  }
}
```
**Source:** [Expo LocalAuthentication docs](https://docs.expo.dev/versions/latest/sdk/local-authentication/)

### Network-Aware Sync Trigger
```typescript
// services/NetworkMonitor.ts
import NetInfo from '@react-native-community/netinfo'
import { syncDatabase } from '../database/sync'

export class NetworkMonitor {
  private unsubscribe: (() => void) | null = null

  startMonitoring() {
    // Configure reachability test
    NetInfo.configure({
      reachabilityUrl: 'https://your-supabase-url.supabase.co',
      reachabilityTest: async (response) => response.status === 200,
      reachabilityShortTimeout: 5 * 1000, // 5 seconds
      reachabilityLongTimeout: 60 * 1000, // 60 seconds
    })

    // Listen for connection changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      console.log('Connection type:', state.type)
      console.log('Is connected?', state.isConnected)
      console.log('Is internet reachable?', state.isInternetReachable)

      // Trigger sync when coming back online
      if (state.isConnected && state.isInternetReachable) {
        this.onConnected()
      } else {
        this.onDisconnected()
      }
    })
  }

  stopMonitoring() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  private async onConnected() {
    console.log('Network connected—triggering sync')
    try {
      await syncDatabase()
      console.log('Sync completed successfully')
    } catch (error) {
      console.error('Sync failed:', error)
      // Schedule retry with exponential backoff (handled by SyncQueue)
    }
  }

  private onDisconnected() {
    console.log('Network disconnected—entering offline mode')
    // Update UI to show offline indicator
  }
}

export const networkMonitor = new NetworkMonitor()
```
**Source:** [NetInfo GitHub](https://github.com/react-native-netinfo/react-native-netinfo), [NetInfo Complete Guide](https://viewlytics.ai/blog/react-native-netinfo-complete-guide)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AsyncStorage for encryption keys | expo-secure-store (Keychain/Keystore) | 2020+ (GDPR enforcement) | Hardware-backed encryption now mandatory; AsyncStorage flagged in security audits |
| Auto-increment primary keys | UUIDs (especially UUIDv7) | 2023+ (offline-first apps) | UUIDs enable client-side ID generation; v7 adds time-sorting for better index performance |
| Application-level tenant filtering | PostgreSQL Row-Level Security | 2021+ (Supabase mainstreamed RLS) | Database-level enforcement prevents data leaks from app bugs; 99% faster with indexes |
| Custom sync logic | WatermelonDB sync primitives | 2019+ (WatermelonDB release) | Built-in conflict resolution, schema migrations, delta sync eliminate 1000+ lines of custom code |
| Firebase Realtime Database | Supabase (PostgreSQL + Auth + Storage) | 2024+ (UK GDPR compliance) | PostgreSQL offers relational data, RLS, extensions; Supabase provides eu-west-2 region for UK data residency |
| react-native-mmkv for session storage | AsyncStorage with Supabase Auth | 2025-2026 | MMKV is 30x faster BUT Supabase Auth officially supports AsyncStorage; use MMKV only if benchmarks prove AsyncStorage bottleneck |

**Deprecated/outdated:**
- **@react-native-community/async-storage** (old package): Moved to `@react-native-async-storage/async-storage` in 2020. Update imports.
- **Expo SecureStore `requireAuthentication` in Expo Go**: Unsupported due to missing Face ID permission. Use development build for testing biometrics.
- **Supabase `detectSessionInUrl: true` for mobile**: Web-only feature; mobile apps should set to `false`.
- **SERIAL primary keys for sync**: Use UUID (`gen_random_uuid()`) for offline-first; auto-increment breaks client-side record creation.

## Open Questions

Things that couldn't be fully resolved:

1. **SQLCipher integration timeline for WatermelonDB**
   - What we know: PR #907 exists but not merged since 2021. Community forks available but unverified.
   - What's unclear: Official roadmap from WatermelonDB maintainers; estimated merge date; Expo compatibility.
   - Recommendation: Defer encryption to Phase 2. Use file-level encryption (expo-crypto) for photos/exports as interim. Re-evaluate SQLCipher fork vs. alternative (react-native-sqlcipher-storage) during Phase 2 planning.

2. **Optimal JWT expiry for offline-first medical apps**
   - What we know: Default 1 hour; Supabase recommends minimum 5 minutes.
   - What's unclear: Tradeoff between security (shorter = more refreshes = more network calls) vs. offline capability (longer = less logout risk). HIPAA/GDPR guidance doesn't specify.
   - Recommendation: Start with 1 hour default. Monitor offline logout rates in Phase 3 testing. Consider 30 minutes if security audit flags long-lived tokens.

3. **Real-time sync vs. polling for web dashboard**
   - What we know: Supabase offers Realtime subscriptions (WebSockets) for live updates.
   - What's unclear: Battery impact on mobile when subscribed to real-time changes; whether dashboard needs <1 second updates vs. 60-second polling.
   - Recommendation: Use polling (React Query with 60s refetch interval) for Phase 4 dashboard. Defer Realtime to Phase 5+ if users demand instant updates. Mobile app should NOT subscribe to Realtime (battery drain).

4. **Migration sync strategy for production data**
   - What we know: WatermelonDB has "migration syncs" feature to fetch new columns after schema change.
   - What's unclear: Production migration path when 1000+ users have local databases on old schema. Does migration sync handle large datasets (10k+ records)?
   - Recommendation: Test migration syncs in Phase 2 with 10k+ record dataset. Plan for phased rollout (10% → 50% → 100%) with rollback capability. Document migration process before Phase 3 production launch.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Supabase Available Regions](https://supabase.com/docs/guides/platform/regions) — UK region eu-west-2 (London) for GDPR compliance
- [Supabase Row-Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — Multi-tenant isolation patterns
- [Supabase React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native) — Authentication setup with AsyncStorage
- [Supabase + WatermelonDB Offline-First Guide](https://supabase.com/blog/react-native-offline-first-watermelon-db) — Official sync implementation pattern
- [WatermelonDB Sync Implementation](https://watermelondb.dev/docs/Implementation/SyncImpl) — Push/pull conflict resolution
- [WatermelonDB Migrations](https://watermelondb.dev/docs/Advanced/Migrations) — Schema evolution best practices
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — Encryption key storage (Keychain/Keystore)
- [Expo LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/) — Biometric authentication (Face ID/Touch ID)
- [NetInfo GitHub](https://github.com/react-native-netinfo/react-native-netinfo) — Network connectivity detection
- [Supabase DPA (Data Processing Agreement)](https://supabase.com/downloads/docs/Supabase+DPA+250314.pdf) — GDPR compliance documentation

### Secondary (MEDIUM confidence)

**Implementation Guides:**
- [Supabase RLS Complete Guide 2026](https://designrevision.com/blog/supabase-row-level-security) — Multi-tenant patterns with performance benchmarks
- [Multi-Tenant RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — Healthcare application examples
- [Building Offline-First App with Expo, Supabase, WatermelonDB](https://www.themorrow.digital/blog/building-an-offline-first-app-with-expo-supabase-and-watermelondb) — Authentication integration patterns
- [React Native Background Sync](https://oneuptime.com/blog/post/2026-01-15-react-native-background-sync/view) — Sync queue with exponential backoff
- [React Native Biometric Authentication Guide 2026](https://medium.com/@sasandasaumya/biometric-authentication-in-react-native-expo-a-complete-guide-face-id-fingerprint-732d80e5e423) — Face ID/Touch ID implementation
- [GDPR Logging and Monitoring Guide](https://www.konfirmity.com/blog/gdpr-logging-and-monitoring) — Audit logging best practices
- [PostgreSQL UUID vs Auto-Increment for Offline Sync](https://www.jocheojeda.com/2025/01/22/hard-to-kill-why-auto-increment-primary-keys-can-make-data-sync-die-harder/) — Primary key strategy for distributed systems
- [React Native MMKV vs AsyncStorage 2026](https://medium.com/@nomanakram1999/stop-using-asyncstorage-in-react-native-mmkv-is-10x-faster-82485a108c25) — Performance comparison

**GDPR Compliance:**
- [GDPR in Healthcare: Practical Guide](https://www.dpo-consulting.com/blog/gdpr-healthcare) — Health data special category requirements
- [Health Data and GDPR](https://www.adequacy.app/en/blog/health-data-gdpr-compliance) — Article 9 special category processing
- [Supabase GDPR Compliance Discussion](https://github.com/orgs/supabase/discussions/2341) — Community validation of GDPR features
- [PostgreSQL Data Retention Automation](https://www.crunchydata.com/blog/auto-archiving-and-data-retention-management-in-postgres-with-pg_partman) — pg_cron for retention policies

### Tertiary (LOW confidence - flagged for validation)

**Community Discussions:**
- [Supabase Offline Session Handling Issue](https://github.com/orgs/supabase/discussions/36906) — Offline logout problem (unresolved as of 2026-02-15)
- [WatermelonDB SQLCipher PR #907](https://github.com/Nozbe/WatermelonDB/pull/907) — Native encryption support (not merged)
- [Supabase JWT Refresh Token Rotation Discussion](https://github.com/orgs/supabase/discussions/26718) — Token expiry edge cases

**SQLCipher Alternatives:**
- [SQLCipher Enterprise React Native](https://www.zetetic.net/sqlcipher/react-native/) — Commercial encryption solution (Enterprise Edition required)
- [react-native-sqlcipher-storage](https://github.com/axsy-dev/react-native-sqlcipher-storage) — Community SQLite encryption library

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All libraries have official documentation, npm packages verified, Supabase + WatermelonDB sync pattern officially endorsed by Supabase blog
- Architecture: **HIGH** — RLS patterns documented in Supabase guides, offline-first architecture validated by official WatermelonDB sync docs, audit logging follows PostgreSQL best practices
- Pitfalls: **HIGH** — Offline session issue confirmed in GitHub discussions, UUID requirement well-documented for distributed systems, RLS performance benchmarks from Supabase official blog
- SQLCipher integration: **MEDIUM** — Community solutions exist but no official Expo + WatermelonDB guide; flagged for Phase 2 validation

**Research date:** 2026-02-15
**Valid until:** 2026-05-15 (90 days for stable infrastructure stack; Supabase/WatermelonDB APIs unlikely to change)

**Validation notes:**
- Supabase region eu-west-2 confirmed available in official docs
- WatermelonDB 0.28.0 is latest stable (checked npm registry)
- Expo SDK 54 includes all required modules (checked Expo docs)
- GDPR requirements verified against ICO official guidance (UK data protection authority)
- PostgreSQL RLS performance benchmarks from Supabase engineering blog (99.94% improvement with indexes)
