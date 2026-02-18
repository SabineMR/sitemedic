# Phase 26 Research: Subdomain Routing

## 1. Current Middleware Architecture

**File:** `web/lib/supabase/middleware.ts` — `updateSession()` function
**Entry:** `web/middleware.ts` — thin wrapper calling `updateSession()`

**Current flow:**
1. Create Supabase server client with anon key (cookie-based auth)
2. Call `getUser()` to validate JWT
3. Check public routes list (/, /login, /signup, /auth, /pricing, legal pages, /admin, /api/)
4. Redirect unauthenticated users to `/login` (non-public routes)
5. Redirect authenticated users away from /login and /signup to role-appropriate dashboard
6. Check for `org_id` in app_metadata — redirect to `/setup/organization` if missing

**Middleware matcher** (`web/middleware.ts`):
```
/((?!_next/static|_next/image|favicon.ico|api/|pricing|terms-and-conditions|...)(?!$).*)
```
Excludes static files, images, favicon, API routes, and public marketing pages.

**Key observation:** No header manipulation currently. No service-role client in middleware.

## 2. Supabase Client Architecture

| Client | File | Key | Use Case |
|--------|------|-----|----------|
| Browser | `web/lib/supabase/client.ts` | Anon | Client components |
| Server | `web/lib/supabase/server.ts` | Anon | Server components, route handlers |
| Middleware | `web/lib/supabase/middleware.ts` | Anon | Session refresh |
| Service role | Ad-hoc in API routes | Service role | RLS bypass |

**No service-role helper exists.** API routes create one-off clients with `SUPABASE_SERVICE_ROLE_KEY`. For middleware, use `createClient` from `@supabase/supabase-js` (Edge-compatible, no cookie handling needed for DB lookup).

## 3. Login Page Structure

**File:** `web/app/(auth)/login/page.tsx` — `'use client'` component
**Layout:** `web/app/(auth)/layout.tsx` — server component (centered flex layout)

**Current login page:**
- Hardcoded title: `"SiteMedic"` / subtitle: `"Site Manager Dashboard"`
- Magic link auth via Supabase OTP
- Uses `window.location.origin` for email redirect → correct for subdomains
- Client component — cannot read `next/headers` directly

**Branding approach for login:**
1. Convert `page.tsx` to a server component that reads `x-org-*` headers
2. Extract login UI to `login-form.tsx` client component
3. Server page passes branding props to client form
4. Fallback to SiteMedic defaults when no x-org-* headers present

## 4. org_branding Table Schema (Migration 132)

| Column | Type | Notes |
|--------|------|-------|
| `org_id` | UUID | FK to organizations, UNIQUE |
| `logo_path` | TEXT | Supabase Storage path (NOT a full URL) |
| `primary_colour_hex` | TEXT | `#RRGGBB` format, nullable |
| `company_name` | TEXT | Pre-populated from organizations.name |
| `tagline` | TEXT | Nullable |

**Column name caution:** British spelling `primary_colour_hex` (not `primary_color`). Column is `logo_path` (not `logo_public_url`). Middleware must construct public URL from path.

**Logo URL construction:** `${SUPABASE_URL}/storage/v1/object/public/org-logos/${logo_path}`

## 5. organizations Table (Relevant Columns)

- `id` (UUID), `slug` (TEXT), `name` (TEXT), `status` (TEXT)
- `subscription_tier` (TEXT, nullable) — 'starter' | 'growth' | 'enterprise'
- `subscription_status` (TEXT, nullable) — 'active' | 'past_due' | 'cancelled'

**Legacy org convention:** NULL stripe fields = access granted. NULL subscription_status = treat as active.

## 6. Cookie Scope Analysis

`@supabase/ssr` does NOT set an explicit cookie `domain`. Browser default: cookie is scoped to the exact hostname. A cookie set on `apex.sitemedic.co.uk` is NOT accessible from `another.sitemedic.co.uk`.

**Result:** Cross-org session isolation is automatic. No code changes needed. Verification plan should confirm this by inspecting cookie attributes in dev tools after login.

## 7. Subdomain Extraction Strategy

```typescript
function extractSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') ?? '';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'sitemedic.co.uk';

  // Apex domain and www — no subdomain
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null;

  // Vercel preview deployments — skip
  if (hostname.endsWith('.vercel.app')) return null;

  // Local dev: tenant.localhost:30500 → 'tenant'
  if (hostname.includes('localhost')) {
    const parts = hostname.split(':')[0].split('.');
    return parts.length >= 2 ? parts[0] : null;
  }

  // Production: tenant.sitemedic.co.uk → 'tenant'
  // sitemedic.co.uk has 3 parts already, so subdomain adds a 4th
  if (hostname.endsWith(`.${rootDomain}`)) {
    const subdomain = hostname.replace(`.${rootDomain}`, '');
    return subdomain || null;
  }

  return null;
}
```

**Edge cases handled:**
- `sitemedic.co.uk` → null (apex)
- `www.sitemedic.co.uk` → null
- `apex.sitemedic.co.uk` → 'apex'
- `tenant.localhost:30500` → 'tenant'
- `my-preview-abc.vercel.app` → null (preview deploy)

## 8. Security: Header Stripping (CVE-2025-29927)

All `x-org-*` headers MUST be stripped at the top of middleware before any processing:

```typescript
const ORG_HEADER_PREFIX = 'x-org-';
const headersToStrip = ['x-org-id', 'x-org-slug', 'x-org-tier',
  'x-org-company-name', 'x-org-primary-colour', 'x-org-logo-url', 'x-org-tagline'];
```

Without this, an attacker could inject `x-org-id: <victim-org-id>` in the HTTP request and impersonate another org.

## 9. Service Role Middleware Pattern

```typescript
import { createClient } from '@supabase/supabase-js';

// Inside updateSession(), only when subdomain detected
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Single query: org + branding in one join
const { data } = await adminClient
  .from('organizations')
  .select(`
    id, slug, subscription_tier, subscription_status,
    org_branding ( company_name, primary_colour_hex, logo_path, tagline )
  `)
  .eq('slug', subdomain)
  .maybeSingle();
```

**Performance:** Single DB query per subdomain request (join is efficient). No caching needed at current scale (<20 orgs).

## 10. Env Vars Required

| Var | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_ROOT_DOMAIN` | `sitemedic.co.uk` (prod) / `localhost:30500` (dev) | New — used by extractSubdomain() |
| `SUPABASE_SERVICE_ROLE_KEY` | (existing) | Already in .env.local — needed for middleware org lookup |

## 11. Key Decisions for Planning

1. **Wave structure:** 26-01 (env setup, checkpoint) + 26-02 (middleware) can be wave 1; 26-03 (login) + 26-04 (cookie verify) are wave 2
2. **26-01 is autonomous: false** — requires human to configure Vercel wildcard domain and DNS CNAME
3. **Login page refactor:** Split into server page + client form component for SSR header reading
4. **Single DB query:** Use Supabase join to fetch org + branding in one query (not two separate queries)
5. **Logo URL:** Middleware constructs public URL from `logo_path` before injecting header
6. **Tier check in middleware:** Don't gate subdomain access by tier in this phase — Phase 30 adds tier gating

---
*Research completed: 2026-02-18*
