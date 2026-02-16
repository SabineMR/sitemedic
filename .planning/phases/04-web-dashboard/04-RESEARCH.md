# Phase 4: Web Dashboard - Research

**Researched:** 2026-02-15
**Domain:** React web dashboard with Supabase backend
**Confidence:** MEDIUM

## Summary

This research investigates the standard stack and best practices for building a Next.js dashboard with Supabase backend, focusing on real-time data display, filtering/sorting large datasets, authentication, and data export capabilities.

**Key Findings:**
- Next.js 15 with App Router (server components) + Supabase is the established pattern for React dashboards in 2026
- shadcn/ui + TanStack Table v8 is the modern standard for data tables with filtering/sorting/pagination
- Supabase provides both realtime subscriptions and polling, but polling (60s interval) is recommended for dashboards to avoid RLS performance overhead
- CSV export uses papaparse/react-papaparse; PDF generation uses jsPDF or react-to-pdf
- Server-side data fetching in React Server Components is the preferred pattern, avoiding unnecessary client-side state

**Primary recommendation:** Build with Next.js 15 App Router using server components for data fetching, shadcn/ui for UI primitives, TanStack Table for data tables, and TanStack Query for client-side caching. Use Supabase client in server components for authenticated queries with RLS, and implement 60-second polling instead of realtime subscriptions for dashboard updates.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | React framework with App Router | Server components reduce client JS, official Supabase integration, cookie-based auth |
| Supabase JS | 2.x+ | Supabase client library | Official client, supports server/client components via @supabase/ssr |
| @supabase/ssr | Latest | SSR-compatible auth helpers | Successor to deprecated auth-helpers, handles cookie-based sessions |
| React | 19.x | UI library | Required by Next.js 15, server components support |
| TypeScript | 5.x | Type safety | Industry standard for React projects, catches errors early |
| Tailwind CSS | 4.x | Utility-first CSS | Rapid styling, responsive utilities, pairs with shadcn/ui |

### UI & Data Display
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | Latest | Unstyled UI primitives | All UI components (buttons, dialogs, cards, tables) |
| TanStack Table | v8 | Headless table library | All data tables with filtering/sorting/pagination |
| Radix UI | Latest | Accessible primitives | Underlying primitives for shadcn/ui components |
| Recharts | 2.x | React charts library | Traffic-light compliance score, summary stats visualization |
| Lucide React | Latest | Icon library | Dashboard icons, status indicators |

### Data Fetching & State
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | v5 | Client-side data caching | Client components needing polling, optimistic updates |
| @supabase-cache-helpers/storage-react-query | Latest | Supabase + TanStack Query integration | Simplifies cache key generation for Supabase queries |

### Data Export
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-papaparse | 4.x | CSV parsing/generation | CSV export (treatment log, worker registry) |
| jsPDF | 2.x | Browser PDF generation | PDF export (treatment log formatted report) |
| jspdf-autotable | 3.x | PDF table generation | Formatted tables in PDF exports |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js | Vite + React | Next.js provides SSR, file-based routing, Supabase integration out-of-box |
| TanStack Table | Material React Table | shadcn/ui + TanStack Table is more customizable, lighter weight |
| Recharts | Chart.js | Recharts is React-native, declarative; Chart.js requires imperative setup |
| TanStack Query | SWR | TanStack Query has richer features (optimistic updates, cache helpers) |
| Polling | Supabase Realtime | Realtime has RLS overhead (100 subscribers = 100 auth checks per insert); polling simpler for dashboard |

**Installation:**
```bash
# Core framework
pnpm install next@latest react@latest react-dom@latest
pnpm install @supabase/supabase-js @supabase/ssr
pnpm install typescript @types/node @types/react @types/react-dom

# UI & Styling
pnpm install tailwindcss postcss autoprefixer
pnpm install @radix-ui/react-* # installed via shadcn CLI
npx shadcn-ui@latest init
npx shadcn-ui@latest add table button dialog card input select

# Data tables
pnpm install @tanstack/react-table

# Charts
pnpm install recharts

# Data fetching (client-side)
pnpm install @tanstack/react-query
pnpm install @supabase-cache-helpers/storage-react-query

# Export
pnpm install react-papaparse jspdf jspdf-autotable

# Icons
pnpm install lucide-react
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── (auth)/
│   ├── login/              # Login page
│   └── layout.tsx          # Auth layout (no dashboard shell)
├── (dashboard)/
│   ├── layout.tsx          # Dashboard shell with nav, sidebar
│   ├── page.tsx            # Overview/compliance score (default route)
│   ├── treatments/
│   │   ├── page.tsx        # Treatment log list (server component)
│   │   └── [id]/
│   │       └── page.tsx    # Treatment detail view
│   ├── near-misses/
│   │   └── page.tsx        # Near-miss log (server component)
│   └── workers/
│       └── page.tsx        # Worker registry (server component)
├── api/
│   └── export/
│       ├── treatments-csv/route.ts
│       ├── treatments-pdf/route.ts
│       └── workers-csv/route.ts
├── layout.tsx              # Root layout (providers)
└── middleware.ts           # Supabase auth session refresh

components/
├── ui/                     # shadcn/ui components
│   ├── button.tsx
│   ├── table.tsx
│   ├── card.tsx
│   └── ...
├── dashboard/
│   ├── compliance-score.tsx
│   ├── stat-card.tsx
│   ├── treatments-table.tsx     # Client component with TanStack Table
│   ├── near-misses-table.tsx
│   └── workers-table.tsx
└── providers/
    └── query-provider.tsx       # TanStack Query provider

lib/
├── supabase/
│   ├── client.ts           # Browser client
│   ├── server.ts           # Server component client
│   └── middleware.ts       # Middleware client
├── queries/
│   ├── treatments.ts       # Treatment query functions
│   ├── workers.ts          # Worker query functions
│   └── near-misses.ts      # Near-miss query functions
└── utils/
    ├── export-csv.ts       # CSV export utilities
    └── export-pdf.ts       # PDF export utilities

types/
└── database.types.ts       # Generated from Supabase CLI
```

### Pattern 1: Server Components for Data Fetching
**What:** Fetch data in async server components, pass to client components as props
**When to use:** Initial page load, authenticated queries with RLS
**Example:**
```typescript
// app/(dashboard)/treatments/page.tsx (SERVER COMPONENT)
import { createClient } from '@/lib/supabase/server'
import { TreatmentsTable } from '@/components/dashboard/treatments-table'

export default async function TreatmentsPage() {
  const supabase = await createClient()

  // Fetch initial data server-side (uses RLS with user's auth)
  const { data: treatments, error } = await supabase
    .from('treatments')
    .select('*, worker:workers(*)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return (
    <div>
      <h1>Treatment Log</h1>
      {/* Pass server data to client component */}
      <TreatmentsTable initialData={treatments} />
    </div>
  )
}
```

### Pattern 2: Client Component Tables with Filtering/Sorting
**What:** TanStack Table in client component for interactive filtering/sorting
**When to use:** Any data table with user interactions (filters, sort, pagination)
**Example:**
```typescript
// components/dashboard/treatments-table.tsx (CLIENT COMPONENT)
'use client'

import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel } from '@tanstack/react-table'
import { useState } from 'react'

export function TreatmentsTable({ initialData }) {
  const [sorting, setSorting] = useState([])
  const [filtering, setFiltering] = useState('')

  const table = useReactTable({
    data: initialData,
    columns,
    state: {
      sorting,
      globalFilter: filtering,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div>
      <input
        value={filtering}
        onChange={e => setFiltering(e.target.value)}
        placeholder="Search..."
      />
      <table>
        {/* Render table with TanStack Table APIs */}
      </table>
    </div>
  )
}
```

### Pattern 3: Polling with TanStack Query
**What:** Client-side polling for near-real-time updates (60s interval)
**When to use:** Dashboard pages needing periodic refresh without realtime overhead
**Example:**
```typescript
// components/dashboard/treatments-table.tsx (CLIENT COMPONENT)
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function TreatmentsTable({ initialData }) {
  const supabase = createClient()

  const { data: treatments } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('treatments')
        .select('*, worker:workers(*)')
        .order('created_at', { ascending: false })
      return data
    },
    initialData,
    refetchInterval: 60000, // Poll every 60 seconds
  })

  return <table>{/* render treatments */}</table>
}
```

### Pattern 4: Middleware for Auth Session Refresh
**What:** Refresh Supabase auth tokens in middleware before requests
**When to use:** All Next.js projects with Supabase auth (REQUIRED)
**Example:**
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Always call getUser() (not getSession()) for auth verification
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 5: CSV Export with react-papaparse
**What:** Client-side CSV generation and download
**When to use:** Export treatment log, worker registry as CSV
**Example:**
```typescript
// lib/utils/export-csv.ts
import { jsonToCSV } from 'react-papaparse'

export function exportTreatmentsCSV(treatments: Treatment[]) {
  const csvData = treatments.map(t => ({
    Date: new Date(t.created_at).toLocaleDateString(),
    Worker: t.worker.name,
    'Injury Type': t.injury_type,
    Severity: t.severity,
    Treatment: t.treatment_given,
    Outcome: t.outcome,
  }))

  const csv = jsonToCSV(csvData)

  // Download
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `treatments-${Date.now()}.csv`
  a.click()
}
```

### Pattern 6: PDF Export with jsPDF
**What:** Browser-based PDF generation with formatted tables
**When to use:** Export treatment log as formatted PDF report
**Example:**
```typescript
// lib/utils/export-pdf.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportTreatmentsPDF(treatments: Treatment[]) {
  const doc = new jsPDF()

  doc.text('Treatment Log Report', 14, 15)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22)

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Worker', 'Injury Type', 'Severity', 'Treatment', 'Outcome']],
    body: treatments.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.worker.name,
      t.injury_type,
      t.severity,
      t.treatment_given,
      t.outcome,
    ]),
  })

  doc.save(`treatment-log-${Date.now()}.pdf`)
}
```

### Pattern 7: Traffic-Light Compliance Score
**What:** Visual indicator (red/amber/green) based on rule thresholds
**When to use:** Dashboard overview showing compliance status
**Example:**
```typescript
// components/dashboard/compliance-score.tsx
'use client'

type ComplianceStatus = 'red' | 'amber' | 'green'

interface ComplianceData {
  dailyCheckDone: boolean
  overdueFollowups: number
  expiredCerts: number
  riddorDeadlines: number
}

function calculateStatus(data: ComplianceData): ComplianceStatus {
  // RED: Critical issues
  if (!data.dailyCheckDone || data.riddorDeadlines > 0) {
    return 'red'
  }

  // AMBER: Warning issues
  if (data.overdueFollowups > 0 || data.expiredCerts > 0) {
    return 'amber'
  }

  // GREEN: All clear
  return 'green'
}

export function ComplianceScore({ data }: { data: ComplianceData }) {
  const status = calculateStatus(data)

  const colors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
  }

  return (
    <div className="flex items-center gap-4">
      <div className={`w-16 h-16 rounded-full ${colors[status]}`}
           aria-label={`Compliance status: ${status}`} />
      <div>
        <h2 className="text-2xl font-bold">
          {status === 'green' ? 'Compliant' : status === 'amber' ? 'Attention Required' : 'Critical Issues'}
        </h2>
        {!data.dailyCheckDone && <p>Daily check not completed</p>}
        {data.overdueFollowups > 0 && <p>{data.overdueFollowups} overdue follow-ups</p>}
        {data.expiredCerts > 0 && <p>{data.expiredCerts} expired certifications</p>}
        {data.riddorDeadlines > 0 && <p>{data.riddorDeadlines} RIDDOR deadlines approaching</p>}
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Don't use Supabase Realtime for dashboard polling**: Realtime subscriptions trigger RLS checks for every subscriber on every change (100 users = 100 auth reads per insert). Use 60-second polling with TanStack Query instead.

- **Don't trust `auth.getSession()` in server code**: Session cookies can be spoofed. Always use `auth.getUser()` which validates with Supabase Auth server.

- **Don't add 'use client' to entire pages**: Only mark components needing interactivity as client components. Keep server components for data fetching to reduce client bundle size.

- **Don't fetch data in useEffect**: Use server components for initial data, TanStack Query for client-side refetching. useEffect creates unnecessary loading states and waterfalls.

- **Don't hand-roll virtualization for large tables**: If datasets exceed 1000 rows, use @tanstack/react-virtual or similar. Custom scroll logic is complex and error-prone.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV export | Custom CSV string builder | react-papaparse | Handles escaping, delimiters, BOM encoding, edge cases |
| PDF generation | Canvas rendering | jsPDF + jspdf-autotable | Handles fonts, page breaks, tables, compression |
| Data table filtering | Custom filter state logic | TanStack Table `getFilteredRowModel` | Handles fuzzy search, column filters, global filters |
| Data table sorting | Custom sort functions | TanStack Table `getSortedRowModel` | Handles multi-column sort, custom comparators, stable sort |
| Auth session refresh | Manual token refresh | @supabase/ssr middleware | Handles cookie updates, token expiry, edge cases |
| Image optimization | Manual resizing | Supabase Image Transformations + Next.js Image | Handles WebP conversion, responsive sizes, lazy loading |
| Form validation | Regex + useState | Zod + react-hook-form | Handles nested validation, type inference, async validation |
| Date formatting | Custom date logic | date-fns or Intl.DateTimeFormat | Handles timezones, locales, relative time |

**Key insight:** Dashboard development has mature libraries for common patterns. Hand-rolling CSV/PDF export, table features, or auth refresh creates bugs, security risks, and maintenance burden. Use established libraries and focus effort on domain-specific logic (compliance scoring, treatment workflows).

## Common Pitfalls

### Pitfall 1: RLS Performance Degradation with Realtime
**What goes wrong:** Enabling Supabase Realtime subscriptions on tables with RLS causes every database change to trigger RLS authorization checks for every subscriber. 100 subscribers = 100 authorization reads per insert, creating linear scaling bottleneck.

**Why it happens:** Supabase Realtime uses PostgreSQL logical replication, which broadcasts changes to all subscribers. Each subscriber's RLS policy must be evaluated to determine if they can see the change.

**How to avoid:** Use 60-second polling with TanStack Query instead of Realtime for dashboard updates. Polling is simpler, avoids RLS overhead, and provides "near-real-time" (< 60s delay) which is acceptable for dashboards.

**Warning signs:**
- Slow database performance after adding Realtime subscriptions
- Increasing database CPU usage as user count grows
- Missing indexes on columns used in RLS policies

### Pitfall 2: Server/Client Component Boundary Violations
**What goes wrong:** Adding `'use client'` at page level converts entire page tree to client components, increasing bundle size and losing server-side data fetching benefits. Alternatively, forgetting `'use client'` for interactive components causes "Hooks can only be called inside the body of a function component" errors.

**Why it happens:** Next.js App Router defaults to server components, but interactive features (useState, onClick, useEffect) require client components. Developers either mark too much or too little as client.

**How to avoid:**
1. Keep page.tsx as server component for data fetching
2. Create separate client components for interactive pieces (TreatmentsTable, filters)
3. Pass server-fetched data as props to client components
4. Only add `'use client'` to components using hooks/event handlers

**Warning signs:**
- Large client bundle sizes (>500KB)
- Hydration mismatches
- Can't use async/await in component (marked as client when should be server)

### Pitfall 3: Missing Indexes on RLS Policy Columns
**What goes wrong:** RLS policies reference columns without database indexes (e.g., `WHERE site_id = auth.site_id()`), causing full table scans on every query. Dashboards become slow (>1s query times) even with small datasets.

**Why it happens:** RLS policies are written in SQL but developers forget to create indexes on policy-referenced columns.

**How to avoid:**
1. Create index on every column used in RLS WHERE clauses
2. Use `(select auth.uid())` instead of `auth.uid()` in policies (prevents re-evaluation per row)
3. Test query performance with EXPLAIN ANALYZE in Supabase SQL editor
4. Monitor slow queries in Supabase dashboard

**Warning signs:**
- Dashboard queries taking >500ms on small datasets
- Database CPU spikes during dashboard page loads
- EXPLAIN ANALYZE shows "Seq Scan" instead of "Index Scan"

**Example fix:**
```sql
-- RLS policy (example)
CREATE POLICY "Users can view their site's treatments"
ON treatments FOR SELECT
USING (site_id = (SELECT auth.site_id()));

-- REQUIRED: Index on site_id
CREATE INDEX idx_treatments_site_id ON treatments(site_id);
```

### Pitfall 4: Large Dataset Rendering Without Virtualization
**What goes wrong:** Rendering 1000+ table rows causes browser lag, slow scrolling, and high memory usage. Tables become unusable on slower devices.

**Why it happens:** React creates DOM nodes for every row. Thousands of nodes slow down rendering, reconciliation, and browser layout calculations.

**How to avoid:**
1. Implement pagination (show 50 rows per page)
2. Use virtualization (@tanstack/react-virtual) if infinite scroll required
3. Fetch limited data server-side (don't load entire table)
4. Add loading states with Suspense boundaries

**Warning signs:**
- Scroll lag on table pages
- Browser DevTools Performance tab shows long "Scripting" times
- High memory usage (>200MB for single page)

### Pitfall 5: Forgetting Next.js Image Optimization for Supabase Storage
**What goes wrong:** Loading treatment photos directly from Supabase Storage URLs serves full-resolution images, causing slow page loads and excessive bandwidth usage.

**Why it happens:** Supabase Storage returns original uploaded files unless image transformations are explicitly requested. Developers use raw URLs without optimization.

**How to avoid:**
1. Use Next.js `<Image>` component with Supabase loader
2. Configure Supabase domain in next.config.js `images.remotePatterns`
3. Use Supabase Image Transformations (resize, quality, format) for thumbnails
4. Implement lazy loading for photo grids

**Warning signs:**
- Treatment detail pages load slowly (>2s)
- Large Network tab payloads (>5MB images)
- Mobile users complain about slow photo loading

**Example fix:**
```typescript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-project.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

// Component
import Image from 'next/image'

<Image
  src={`${supabaseUrl}/storage/v1/object/public/photos/${photoId}`}
  width={400}
  height={300}
  alt="Treatment photo"
/>
```

### Pitfall 6: Timezone Mismatches Between Server and Client
**What goes wrong:** Dates rendered server-side show different times than client-side, causing hydration errors ("Text content does not match server-rendered HTML") and confusing users with inconsistent timestamps.

**Why it happens:** Server renders dates in UTC or server timezone, but client JavaScript Date() uses browser timezone. React detects mismatch and throws hydration error.

**How to avoid:**
1. Always format dates consistently (use same timezone on server and client)
2. Store timestamps in UTC in database
3. Format dates client-side only (wrap in client component)
4. Use `suppressHydrationWarning` for date elements if unavoidable

**Warning signs:**
- Console errors: "Hydration failed because the initial UI does not match..."
- Dates shift by hours on page load
- Different dates shown in SSR vs CSR

**Example fix:**
```typescript
// WRONG: Date rendered in server component
export default async function TreatmentPage() {
  const treatment = await fetchTreatment()
  return <p>{new Date(treatment.created_at).toLocaleString()}</p> // HYDRATION ERROR
}

// RIGHT: Date rendered in client component
'use client'
export function TreatmentDate({ timestamp }: { timestamp: string }) {
  return <p suppressHydrationWarning>{new Date(timestamp).toLocaleString()}</p>
}
```

### Pitfall 7: Not Handling CSV Special Characters in Export
**What goes wrong:** Exported CSVs break when data contains commas, quotes, or newlines (e.g., treatment notes "Applied ice, elevated limb" splits into two columns).

**Why it happens:** Naive CSV generation uses string concatenation without escaping special characters.

**How to avoid:** Use react-papaparse's `jsonToCSV()` which handles escaping automatically. Never build CSV strings manually.

**Warning signs:**
- CSV columns misaligned in Excel/Sheets
- Data appears split across wrong columns
- Quotes appear doubled in output

## Code Examples

Verified patterns from official sources and search results:

### Supabase Server Component Client Setup
```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### TanStack Table Column Definition
```typescript
// components/dashboard/treatments-columns.tsx
// Source: TanStack Table v8 docs patterns
import { ColumnDef } from '@tanstack/react-table'
import { Treatment } from '@/types/database.types'

export const columns: ColumnDef<Treatment>[] = [
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => {
      return new Date(row.getValue('created_at')).toLocaleDateString()
    },
  },
  {
    accessorKey: 'worker.name',
    header: 'Worker',
    filterFn: 'includesString', // Enable column filtering
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string
      const colors = {
        minor: 'bg-green-100 text-green-800',
        moderate: 'bg-amber-100 text-amber-800',
        major: 'bg-red-100 text-red-800',
      }
      return (
        <span className={`px-2 py-1 rounded ${colors[severity]}`}>
          {severity}
        </span>
      )
    },
  },
]
```

### TanStack Query Polling Setup
```typescript
// app/providers/query-provider.tsx
// Source: https://makerkit.dev/blog/saas/supabase-react-query
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 60 seconds
            refetchInterval: 60 * 1000, // Poll every 60 seconds
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### shadcn/ui Data Table Pattern
```typescript
// components/dashboard/data-table.tsx
// Source: https://ui.shadcn.com/docs/components/radix/data-table
'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function DataTable({ columns, data }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Responsive Dashboard Layout
```typescript
// app/(dashboard)/layout.tsx
// Source: Tailwind CSS responsive dashboard patterns
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <nav className="flex flex-col gap-y-4 p-4">
          {/* Navigation links */}
        </nav>
      </aside>

      {/* Main content - full width on mobile, offset by sidebar on desktop */}
      <main className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b">
          <div className="flex h-16 items-center gap-4 px-4">
            {/* Mobile menu button, user menu */}
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router (pages/) | App Router (app/) with Server Components | Next.js 13 (2022), stable in Next.js 15 (2025) | Fetch data in server components, reduce client JS, better SEO |
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024-2025 | Simplified API, unified SSR package for all frameworks |
| React Query v3/v4 | TanStack Query v5 | 2023-2024 | Renamed, improved TypeScript, better cache control |
| Custom Realtime hooks | Polling with TanStack Query | Ongoing (RLS perf awareness) | Avoid RLS overhead, simpler implementation |
| Material-UI, Ant Design | shadcn/ui + Radix UI | 2023-2025 | Copy-paste components, no runtime bundle, Tailwind-native |
| Client-side filtering/sorting | Server-side with Supabase queries | Ongoing (scale awareness) | Better performance for large datasets, but client-side OK for <1000 rows |
| Chart.js | Recharts | Ongoing (React-native libs) | Declarative React API, no imperative setup |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr` (consolidates all SSR helpers)
- `auth.getSession()` in server code: Use `auth.getUser()` (session can be spoofed)
- Pages Router for new projects: App Router is stable and recommended
- Direct Supabase Realtime for dashboards: Use polling to avoid RLS performance issues

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase Image Transformations Availability**
   - What we know: Supabase Image Transformations (resize, quality, format) require Pro Plan or higher
   - What's unclear: Current project is on Free Plan; need to confirm plan tier before implementing image optimization
   - Recommendation: Check Supabase plan in Phase 4 planning. If Free Plan, use Next.js Image component without Supabase transformations (will work but serve larger files). Upgrade to Pro Plan if budget allows for optimized image delivery.

2. **Server-Side vs Client-Side Filtering for Treatment Log**
   - What we know: Treatment log could have 100s-1000s of entries over time
   - What's unclear: Whether to implement filters server-side (Supabase query) or client-side (TanStack Table)
   - Recommendation: Start with client-side filtering (TanStack Table) for simplicity and responsiveness. If dataset grows beyond 1000 treatments, migrate to server-side filtering with pagination in future phase.

3. **Export Route Handlers vs Client-Side Export**
   - What we know: CSV/PDF can be generated client-side (browser) or server-side (API route)
   - What's unclear: Trade-offs for this specific use case (treatment log export)
   - Recommendation: Use client-side export (react-papaparse, jsPDF) for faster implementation and no server load. If exports become slow (>5s for large datasets), migrate to server-side Route Handler in future.

4. **Tailwind CSS v4 Stability**
   - What we know: Search results mention Tailwind CSS 4.x in 2026 templates
   - What's unclear: Tailwind v4 release status, breaking changes from v3
   - Recommendation: Use latest stable Tailwind version at implementation time. If v4 is stable, use it; if v4 is beta, use v3.x. Check official Tailwind docs before installation.

## Sources

### Primary (HIGH confidence)
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) - Official integration guide, server component patterns
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks) - Performance metrics, RLS overhead documentation
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - Official patterns for component architecture
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) - Official data table component with TanStack Table integration

### Secondary (MEDIUM confidence - WebSearch verified with official sources)
- [Supabase + Next.js Guide (Medium)](https://medium.com/@iamqitmeeer/supabase-next-js-guide-the-real-way-01a7f2bd140c) - Practical implementation patterns
- [Next.js + TanStack Query + Supabase Guide (Silvestri)](https://silvestri.co/blog/nextjs-tanstack-query-supabase-guide) - Integration patterns
- [TanStack Table v8 Docs (Pagination)](https://tanstack.com/table/latest/docs/guide/pagination) - Official API documentation
- [5 Best React Data Grid Libraries (Syncfusion)](https://www.syncfusion.com/blogs/post/top-react-data-grid-libraries) - Library comparison
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Official performance guidance
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Official auth patterns
- [Material React Table CSV Export](https://www.material-react-table.com/docs/examples/export-csv) - Export pattern examples
- [react-papaparse Documentation](https://react-papaparse.js.org/) - Official CSV library docs
- [jsPDF GitHub](https://github.com/parallax/jsPDF) - Official PDF generation library
- [Recharts](https://recharts.org/) - Official charting library docs
- [Tailwind CSS Grid](https://tailwindcss.com/docs/grid-template-columns) - Official responsive layout utilities

### Tertiary (LOW confidence - WebSearch only, marked for validation)
- App Router pitfalls article (imidef.com) - Common mistakes, needs validation against official Next.js docs
- Supabase Row Level Security Complete Guide (DesignRevision) - Third-party tutorial, verify RLS patterns with official docs
- React dashboard performance articles (Syncfusion, Zigpoll) - General guidance, verify specific recommendations
- GitHub templates and community discussions - Implementation examples, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Verified via WebSearch + official docs, but Context7 unavailable. Next.js + Supabase + shadcn/ui + TanStack Table is well-established pattern in 2026 based on multiple sources.
- Architecture: MEDIUM - Server component patterns verified with official Next.js docs, but some integration details (TanStack Query + Supabase) rely on community articles.
- Pitfalls: MEDIUM - RLS performance, server/client boundaries documented officially; other pitfalls inferred from community sources and general React knowledge.
- Export libraries: MEDIUM - react-papaparse and jsPDF verified as standard, but specific integration patterns not in official docs.

**Research date:** 2026-02-15
**Valid until:** ~2026-03-15 (30 days - stable ecosystem, but Next.js and Supabase evolve rapidly)
