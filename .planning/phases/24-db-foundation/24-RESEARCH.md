# Phase 24: DB Foundation - Research

**Researched:** 2026-02-18
**Domain:** Supabase Postgres migrations, Supabase Storage RLS, Next.js CVE patch
**Confidence:** HIGH

---

## Summary

Phase 24 delivers the database schema foundation for all v3.0 features. It spans three concerns: (1) patching a critical Next.js CVE, (2) creating two new tables (`org_branding`, subscription columns on `organizations`), and (3) creating a public Supabase Storage bucket (`org-logos`) with org-scoped write RLS. All tasks are pure infrastructure — no new npm packages, no frontend code.

The codebase has established patterns for every operation required here. Migration 118 (`org_settings`) is the gold-standard template for a new org-scoped table with backfill and RLS. Migration 131 (`emergency-recordings`) is the template for storage bucket migrations. Both were written recently and reflect the current project convention precisely.

The one surprise finding: **Next.js 15.5.12 is already installed in `node_modules`** (the pnpm lock file resolved it). The `package.json` specifier still reads `^15.1.5` — updating it to `^15.2.3` (or `>=15.2.3`) is still necessary to make the constraint explicit and to update `eslint-config-next` in sync.

**Primary recommendation:** Follow migration 118 as the template for migration 132 (`org_branding`) and migration 133 (subscription columns). Follow migration 131 for migration 134 (`org-logos` bucket). Update `package.json` version specifier and run `pnpm install`.

---

## Standard Stack

### Core Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase local CLI | `supabase` via config.toml | Run migrations locally | Project uses local Supabase at port 54322 |
| pnpm | project default | Package management | Project MEMORY.md mandates pnpm |
| next | currently `^15.1.5` in package.json | Web framework | Core dependency |

### No New Packages Required

All five plans in this phase use only existing infrastructure. No npm additions.

**Installation for plan 24-01 only:**
```bash
# In /Users/sabineresoagli/GitHub/sitemedic/web/
pnpm install
```
(After bumping version in package.json — installs nothing new since 15.5.12 is already in lockfile, but refreshes eslint-config-next)

---

## Architecture Patterns

### Migration File Naming Convention

```
supabase/migrations/
├── 131_emergency_recordings_bucket.sql   # last existing
├── 132_org_branding.sql                  # next: new table
├── 133_subscription_columns.sql          # next: ALTER TABLE organizations
└── 134_org_logos_bucket.sql              # next: storage bucket
```

Naming: `{number}_{snake_case_description}.sql`. No zero-padding for numbers >= 100.

### Pattern 1: New Org-Scoped Table (Use for Migration 132)

From migration 118 (`org_settings`) — the canonical current-codebase template:

```sql
-- Source: supabase/migrations/118_org_settings.sql (project codebase)

CREATE TABLE org_branding (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id    UUID        NOT NULL UNIQUE
            REFERENCES organizations(id) ON DELETE CASCADE,
  -- ... columns ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_branding_org ON org_branding (org_id);

-- Backfill: one empty row per existing org
INSERT INTO org_branding (org_id)
SELECT id FROM organizations
ON CONFLICT (org_id) DO NOTHING;

-- RLS
ALTER TABLE org_branding ENABLE ROW LEVEL SECURITY;

-- Org users: read their own (via get_user_org_id() from JWT app_metadata)
CREATE POLICY "Org users can view their own org branding"
  ON org_branding FOR SELECT
  USING (org_id = get_user_org_id());

-- Org admins: update their own branding
CREATE POLICY "Org admins can update their own org branding"
  ON org_branding FOR UPDATE
  USING (org_id = get_user_org_id() AND is_org_admin())
  WITH CHECK (org_id = get_user_org_id() AND is_org_admin());

-- Platform admins: full access
CREATE POLICY "Platform admins can view all org branding"
  ON org_branding FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert org branding"
  ON org_branding FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all org branding"
  ON org_branding FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
```

**Key helper functions available (confirmed in migration 101 and 028):**
- `get_user_org_id()` — reads `org_id` from JWT `app_metadata`
- `is_platform_admin()` — checks `role = 'platform_admin'` in JWT
- `is_org_admin()` — checks `role = 'org_admin'` in JWT
- `is_admin()` — checks any admin role (backwards-compat)

### Pattern 2: ALTER TABLE for New Columns (Use for Migration 133)

From migration 027 (the precedent for adding columns to `organizations`):

```sql
-- Source: supabase/migrations/027_backfill_asg_org_id.sql (project codebase)
-- Pattern for adding columns to organizations table

ALTER TABLE organizations ADD COLUMN stripe_customer_id        TEXT    DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN stripe_subscription_id    TEXT    DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN subscription_tier         TEXT    DEFAULT NULL
  CHECK (subscription_tier IN ('starter', 'growth', 'enterprise'));
ALTER TABLE organizations ADD COLUMN subscription_status       TEXT    DEFAULT NULL
  CHECK (subscription_status IN ('active', 'past_due', 'cancelled'));

-- All new columns DEFAULT NULL per INFRA-03 decision
```

Note: The `organizations` table already has RLS enabled (migration 00004). The existing policy `"Users can read their own organization"` covers SELECT for the new columns automatically — no new RLS policies needed for migration 133 since org users can already read their own org row and platform admins have separate policies.

### Pattern 3: Storage Bucket Migration (Use for Migration 134)

From migration 131 (`emergency-recordings`) — most recent storage migration:

```sql
-- Source: supabase/migrations/131_emergency_recordings_bucket.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,    -- PUBLIC: logos appear in PDFs/emails with expired signed URLs
  2097152, -- 2 MB max (logos should be small)
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Org admins can INSERT under their {org_id}/ path only
CREATE POLICY "Org admins can upload their org logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (is_org_admin() OR is_platform_admin())
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Public SELECT: no restriction (bucket is public, anyone can read)
-- Supabase public buckets: SELECT is open to anonymous; no RLS policy needed for SELECT
-- But to be explicit and consistent:
CREATE POLICY "Public can view org logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- Org admins can UPDATE (replace) their own logo
CREATE POLICY "Org admins can update their org logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND (is_org_admin() OR is_platform_admin())
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Org admins can DELETE their own logo
CREATE POLICY "Org admins can delete their org logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND (is_org_admin() OR is_platform_admin())
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );
```

**Key fact on public buckets (verified via Supabase docs):** A public bucket allows unauthenticated `GET` (download) without an auth token. All write operations (INSERT/UPDATE/DELETE) still require auth + RLS policies. Setting `public = true` does NOT auto-grant writes to anyone.

### Pattern 4: Backfill Subscription Tiers (Plan 24-05)

```sql
-- Source: Pattern from migration 027/118 — idempotent UPDATE

-- Apex Safety Solutions gets 'growth'
UPDATE organizations
SET subscription_tier = 'growth'
WHERE slug = 'apex'
  AND subscription_tier IS NULL;

-- All other orgs get 'starter'
UPDATE organizations
SET subscription_tier = 'starter'
WHERE slug != 'apex'
  AND subscription_tier IS NULL;

-- Document: NULL stripe_customer_id = legacy access granted,
-- no billing enforcement until onboarding completes
```

**Important:** The slug for Apex is `'apex'` (confirmed: migration 029 references "Apex Safety Group" as the first org; context states slug='apex'). The migrations use `WHERE org_id IS NULL` idiom and `ON CONFLICT DO NOTHING` — replicate this for safe re-runs.

### Pattern 5: Next.js Version Bump (Plan 24-01)

```json
// web/package.json — change:
"next": "^15.1.5"
// to:
"next": "^15.2.3"

// Also update eslint-config-next to match:
"eslint-config-next": "^15.2.3"
```

Then run:
```bash
cd /Users/sabineresoagli/GitHub/sitemedic/web && pnpm install
pnpm build
```

**Critical finding:** `pnpm-lock.yaml` already has `next@15.5.12` resolved — the lock file is ahead of `package.json`. This is because `^15.1.5` resolves to latest 15.x. Changing the specifier to `^15.2.3` will not change the installed version; it makes the minimum explicit and documents the CVE rationale. After `pnpm install`, verify `next build` passes (TypeScript strict mode is on).

### Recommended Project Structure for New Files

```
supabase/migrations/
├── 132_org_branding.sql         # CREATE TABLE org_branding + RLS + backfill
├── 133_subscription_columns.sql # ALTER TABLE organizations ADD COLUMN x4
└── 134_org_logos_bucket.sql     # INSERT INTO storage.buckets + 4 RLS policies
```

### Anti-Patterns to Avoid

- **Using `gen_random_uuid()` inconsistently:** Recent tables (118, 123, 129) use `uuid_generate_v4()`. Use `uuid_generate_v4()` for the `org_branding.id` primary key to stay consistent with the latest migration pattern.
- **Skipping `ON CONFLICT DO NOTHING` on bucket INSERT:** Migration 131 shows the pattern — always add it so re-running migrations is safe.
- **Adding RLS policies for operations that are already covered:** `organizations` already has SELECT policies from migration 00004. Don't duplicate them in migration 133.
- **Setting `NOT NULL` on new subscription columns:** The decision is `DEFAULT NULL`. Adding `NOT NULL` would break for existing rows. Leave them nullable.
- **Forgetting to run migrations sequentially:** The local Supabase runs at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Apply migrations via `supabase db push` or `supabase migration up`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Org ID extraction in RLS | Custom `auth.jwt()` parse inline | `get_user_org_id()` function | Already defined in migration 028, used everywhere |
| Platform admin check in RLS | Inline JWT role check | `is_platform_admin()` function | Already defined in migration 101, grants are set |
| Org admin check in RLS | Inline JWT role check | `is_org_admin()` function | Already defined in migration 101, grants are set |
| Path-prefix enforcement in storage | Custom logic | `storage.foldername(name)[1]` | Built-in Supabase Storage helper, returns path segment array |
| Idempotent bucket creation | `CREATE IF NOT EXISTS` (invalid SQL) | `INSERT ... ON CONFLICT (id) DO NOTHING` | Standard pattern across all 6+ storage migrations in codebase |
| Backfill with skips | DELETE + re-INSERT | `INSERT ... ON CONFLICT (org_id) DO NOTHING` | Safe for re-runs, matches migration 118 |

**Key insight:** Every reusable helper function (`get_user_org_id`, `is_platform_admin`, `is_org_admin`) is already defined and granted. Never inline JWT parsing in new policies.

---

## Common Pitfalls

### Pitfall 1: Wrong UUID Generator for New Table

**What goes wrong:** Using `gen_random_uuid()` in migration 132 when the recent migrations (118, 123, 129) use `uuid_generate_v4()`.
**Why it happens:** Both work, but inconsistency causes confusion. The `uuid-ossp` extension provides `uuid_generate_v4()`.
**How to avoid:** Use `uuid_generate_v4()` for the `org_branding.id` primary key, matching migrations 118 and 123.
**Warning signs:** Inconsistency in migration SQL vs. prior migrations.

### Pitfall 2: eslint-config-next Version Mismatch

**What goes wrong:** After bumping `next` to `^15.2.3`, leaving `eslint-config-next` at `^15.1.5` creates a peer dependency warning and may cause lint errors in CI.
**Why it happens:** They are separate packages but must match major.minor.
**How to avoid:** Update both `next` and `eslint-config-next` to `^15.2.3` in the same commit.
**Warning signs:** `pnpm install` outputs peer dependency warnings referencing eslint-config-next.

### Pitfall 3: org_branding Backfill Misses New Orgs

**What goes wrong:** The backfill INSERT runs at migration time. Orgs created after migration 132 will not have an `org_branding` row until a trigger or application code creates one.
**Why it happens:** The backfill is a one-time INSERT at migration apply time.
**How to avoid:** Either add a `DEFAULT` trigger for new org rows, or (simpler) ensure application code does an upsert when reading branding. The context does not require a trigger — document that org_branding row creation is part of org onboarding flow.
**Warning signs:** NULL/missing org_branding for newly created test orgs.

### Pitfall 4: Public Bucket Does Not Mean No RLS for Writes

**What goes wrong:** Developer assumes `public = true` means anyone can upload logos.
**Why it happens:** "Public" only means GET (download) is unauthenticated. All INSERT/UPDATE/DELETE still require auth + RLS policies.
**How to avoid:** Always add explicit INSERT/UPDATE/DELETE policies even for public buckets.
**Warning signs:** Upload fails with 403 / "new row violates row-level security policy".

### Pitfall 5: storage.foldername Returns 1-Indexed Array

**What goes wrong:** Using `[0]` instead of `[1]` for the first path segment check.
**Why it happens:** Postgres arrays are 1-indexed. `(storage.foldername(name))[1]` is correct.
**How to avoid:** Copy the pattern from migration 131: `(storage.foldername(name))[1] = auth.uid()::text`.
**Warning signs:** RLS check always returns false, uploads fail.

### Pitfall 6: Next.js Build Fails After Bump

**What goes wrong:** `pnpm build` fails with TypeScript errors introduced by Next.js type changes in 15.2.x+.
**Why it happens:** Next.js occasionally tightens TypeScript types between minor versions.
**How to avoid:** Run `pnpm build` immediately after version bump. The project has `strict: true` in tsconfig. Most likely no issue since 15.5.12 is already installed in node_modules and presumably running in dev.
**Warning signs:** Build output shows "Type error:" lines. Fix any type errors before proceeding.

### Pitfall 7: Migration 133 Existing RLS Policies Not Updated

**What goes wrong:** New subscription columns are added to `organizations` but the existing SELECT policy only returns the columns that existed when it was created.
**Why it happens:** Postgres RLS SELECT policies are on the row level, not the column level. New columns are automatically included in existing SELECT policies.
**How to avoid:** Nothing to do — the existing `"Users can read their own organization"` policy (migration 00004) already covers any new columns on `organizations`.
**Warning signs:** None — this is a non-issue but worth knowing.

### Pitfall 8: Apex slug assumption

**What goes wrong:** The backfill in plan 24-05 uses `WHERE slug = 'apex'` but the actual slug in the database may differ.
**Why it happens:** The context states slug='apex' for Apex Safety Solutions. Migration 029 calls it "Apex Safety Group" as the first org. There may be a discrepancy.
**How to avoid:** Verify the actual slug in the local database before writing migration 134. Use: `SELECT slug FROM organizations;`. If the slug is not 'apex', use `WHERE name ILIKE '%apex%'` as a safer match, or use a DO block with a variable.
**Warning signs:** Migration 134's UPDATE affects 0 rows for the growth tier update.

---

## Code Examples

### Complete Migration 132 Template (org_branding table)

```sql
-- Source: Pattern from supabase/migrations/118_org_settings.sql
-- Migration 132: org_branding table
-- Creates per-org branding: logo, colours, company identity

CREATE TABLE org_branding (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID          NOT NULL UNIQUE
                      REFERENCES organizations(id) ON DELETE CASCADE,
  logo_path           TEXT,          -- Storage path: {org_id}/logo.{ext} in org-logos bucket
  primary_colour_hex  TEXT
                      CHECK (primary_colour_hex ~ '^#[0-9A-Fa-f]{6}$'),
  company_name        TEXT,          -- Display name (may differ from organizations.name)
  tagline             TEXT,
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE org_branding IS
  'Per-organisation branding. Presentation layer data, separate from operational '
  'config in org_settings. One row per organisation.';

CREATE INDEX idx_org_branding_org ON org_branding (org_id);

-- Backfill: empty row for all existing orgs
INSERT INTO org_branding (org_id)
SELECT id FROM organizations
ON CONFLICT (org_id) DO NOTHING;

-- RLS
ALTER TABLE org_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view their own org branding"
  ON org_branding FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Org admins can update their own org branding"
  ON org_branding FOR UPDATE
  USING (org_id = get_user_org_id() AND is_org_admin())
  WITH CHECK (org_id = get_user_org_id() AND is_org_admin());

CREATE POLICY "Platform admins can view all org branding"
  ON org_branding FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert org branding"
  ON org_branding FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all org branding"
  ON org_branding FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
```

### Complete Migration 133 Template (subscription columns)

```sql
-- Source: Pattern from supabase/migrations/027_backfill_asg_org_id.sql
-- Migration 133: Add subscription columns to organizations

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_tier       TEXT    DEFAULT NULL
    CHECK (subscription_tier IN ('starter', 'growth', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT    DEFAULT NULL
    CHECK (subscription_status IN ('active', 'past_due', 'cancelled'));

COMMENT ON COLUMN organizations.stripe_customer_id IS
  'Stripe Customer ID. NULL for legacy orgs — access granted without billing enforcement.';
COMMENT ON COLUMN organizations.subscription_tier IS
  'Subscription tier: starter | growth | enterprise. NULL until onboarding.';
COMMENT ON COLUMN organizations.subscription_status IS
  'Stripe subscription status. NULL for legacy orgs pre-onboarding.';

-- No new RLS policies needed: existing SELECT policy on organizations
-- (from migration 00004) covers new columns automatically.
-- No new INSERT/UPDATE policies needed: platform admins manage these via
-- Stripe webhooks or admin UI (addressed in later phases).
```

### Complete Migration 134 Template (org-logos bucket)

```sql
-- Source: Pattern from supabase/migrations/131_emergency_recordings_bucket.sql
-- Migration 134: org-logos public storage bucket

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,     -- PUBLIC: logos embedded in PDFs/emails where signed URLs expire
  2097152,  -- 2 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Write policy: org admins upload under their {org_id}/ prefix
CREATE POLICY "Org admins can upload org logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (is_org_admin() OR is_platform_admin())
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Read policy: public (bucket is public — anon download works; policy for authenticated)
CREATE POLICY "Anyone can view org logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- Update policy: org admins can replace their logo
CREATE POLICY "Org admins can update org logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND (is_org_admin() OR is_platform_admin())
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );

-- Delete policy: org admins can remove their logo
CREATE POLICY "Org admins can delete org logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND (is_org_admin() OR is_platform_admin())
    AND (storage.foldername(name))[1] = get_user_org_id()::text
  );
```

### Plan 24-05 Backfill Template

```sql
-- Source: Pattern from supabase/migrations/118_org_settings.sql (seed block)
-- Part of migration 132 or a separate 135_subscription_backfill.sql

-- Apex Safety Solutions: growth tier (slug = 'apex')
UPDATE organizations
SET subscription_tier = 'growth'
WHERE slug = 'apex';

-- All other orgs: starter tier
UPDATE organizations
SET subscription_tier = 'starter'
WHERE slug IS DISTINCT FROM 'apex';

-- Note: stripe_customer_id remains NULL for all legacy orgs.
-- NULL stripe_customer_id = access granted, no billing enforcement.
-- Billing enforcement begins when org completes onboarding flow.
```

### Plan 24-01: package.json Changes

```json
// web/package.json — before:
"next": "^15.1.5",
...
"eslint-config-next": "^15.1.5",

// web/package.json — after:
"next": "^15.2.3",
...
"eslint-config-next": "^15.2.3",
```

Then:
```bash
cd /Users/sabineresoagli/GitHub/sitemedic/web
pnpm install
pnpm build
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `auth.jwt()` in RLS | Helper functions `get_user_org_id()`, `is_platform_admin()` | Migration 028/101 | All new RLS uses helpers, not inline JWT |
| `gen_random_uuid()` in tables | Mixed: `uuid_generate_v4()` in recent tables | Migration 118+ | Use `uuid_generate_v4()` for new table PKs |
| Next.js `^15.1.5` | Next.js `^15.2.3` (CVE fix) | CVE-2025-29927 patch March 2025 | Middleware header bypass patched |
| Private-only storage buckets | Public bucket support for logos/assets | Migration 134 (this phase) | Public `org-logos` bucket enables PDF/email embedding |

**Deprecated/outdated:**
- `^15.1.5` Next.js specifier: vulnerable to CVE-2025-29927 (CVSS 9.1 Critical). Replace with `^15.2.3`.
- Direct `auth.jwt()` parsing in RLS: replaced by helper functions. Do not add new inline JWT parsing.

---

## Open Questions

1. **Apex org slug verification**
   - What we know: Context states slug='apex' for Apex Safety Solutions
   - What's unclear: Whether the actual database slug matches (migration 029 calls it "Apex Safety Group" not "Apex Safety Solutions")
   - Recommendation: Plan 24-05 should include a verification step — `SELECT id, name, slug FROM organizations;` — before writing the backfill SQL. Use a DO block with `IF EXISTS` guard if slug is uncertain.

2. **org_branding UPDATE policy: should site managers be able to edit?**
   - What we know: RLS pattern from org_settings uses `is_platform_admin()` for write access
   - What's unclear: Whether `org_admin` role only, or also `site_manager` role, should be able to update branding
   - Recommendation: Restrict to `is_org_admin() OR is_platform_admin()` for now. Branding is a high-visibility admin function.

3. **Migration 133 RLS for subscription columns**
   - What we know: Existing `"Users can read their own organization"` SELECT policy covers new columns automatically
   - What's unclear: Whether platform admins already have an UPDATE policy on `organizations`
   - Recommendation: Check migration 112 (`complete_platform_admin_rls`) to confirm platform admins can UPDATE organizations. If no UPDATE policy exists, migration 133 should add one scoped to `is_platform_admin()`.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `supabase/migrations/131_emergency_recordings_bucket.sql` — storage bucket pattern with RLS
- Codebase: `supabase/migrations/118_org_settings.sql` — org-scoped table template with backfill and RLS
- Codebase: `supabase/migrations/101_migrate_to_platform_admin.sql` — `is_platform_admin()`, `is_org_admin()` definitions
- Codebase: `supabase/migrations/028_enable_org_rls.sql` — `get_user_org_id()` definition
- Codebase: `supabase/migrations/00004_rls_policies.sql` — organizations table existing RLS
- Codebase: `web/node_modules/next/package.json` — confirms 15.5.12 already installed
- Supabase Docs: https://supabase.com/docs/guides/storage/buckets/creating-buckets — public vs private buckets
- Supabase Docs: https://supabase.com/docs/guides/storage/security/access-control — storage.foldername, RLS patterns
- Vercel Postmortem: https://vercel.com/blog/postmortem-on-next-js-middleware-bypass — CVE-2025-29927 fix confirmed in 15.2.3+

### Secondary (MEDIUM confidence)

- WebSearch: CVE-2025-29927 CVSS 9.1 Critical, affects Next.js < 15.2.3 — confirmed by Vercel postmortem above
- pnpm registry: `pnpm view next` — confirmed 15.5.12 is latest stable 15.x as of 2026-02-18

### Tertiary (LOW confidence)

- Context states Apex slug='apex' — planner should verify in actual DB before writing migration 24-05

---

## Metadata

**Confidence breakdown:**
- Next.js CVE patch: HIGH — Vercel postmortem confirms 15.2.3+ fixes it; 15.5.12 already in lockfile
- Migration 132 (org_branding): HIGH — directly cloned from migration 118 pattern
- Migration 133 (subscription columns): HIGH — simple ALTER TABLE, existing RLS covers it
- Migration 134 (org-logos bucket): HIGH — directly cloned from migration 131 pattern
- Backfill (plan 24-05): MEDIUM — Apex slug assumption needs verification

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable domain — Supabase storage RLS and Next.js major version unlikely to change significantly in 30 days)
