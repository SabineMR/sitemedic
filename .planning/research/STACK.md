# Technology Stack Research

**Domain:** Medical compliance platform with offline-first mobile app and web dashboard
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

SiteMedic requires a proven offline-first stack optimized for UK health data compliance, rapid field data capture, and professional PDF reporting. The 2025-2026 standard for this domain is:

- **Mobile**: React Native + Expo SDK 54 (iOS-first with New Architecture enabled)
- **Offline Storage**: WatermelonDB on SQLite with Supabase sync
- **Backend**: Supabase (PostgreSQL + Auth + Storage) in UK/EU region
- **Web Dashboard**: React 19 + Vite + shadcn/ui (Tailwind)
- **State Management**: Zustand (global) + TanStack Query (server state)
- **PDF Generation**: pdfmake (server-side via Node.js)

This stack prioritizes speed-to-ship, offline reliability, and GDPR compliance over custom infrastructure.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Expo** | SDK 54 (54.0.33) | React Native development framework | Industry standard for rapid iOS/Android development. SDK 54 (Sept 2025) includes React Native 0.81, React 19, precompiled XCFrameworks (10x faster iOS builds), and New Architecture by default. Expo's managed workflow handles native dependencies and updates. |
| **React Native** | 0.81 | Cross-platform mobile framework | Included with Expo SDK 54. Shares JavaScript codebase with web dashboard. New Architecture enabled by default provides better performance and concurrent rendering support. |
| **WatermelonDB** | 0.28.0 | Offline-first reactive database | Built on SQLite, optimized for React Native. Lazy-loads data for instant app launch regardless of dataset size. Fully observable (UI auto-updates on data changes). Handles 10K+ records smoothly. Supabase officially recommends for offline sync pattern. |
| **Supabase** | Latest | Backend-as-a-Service (PostgreSQL) | PostgreSQL + Auth + Storage + Edge Functions in one managed service. UK/EU region support (eu-west-2 London) ensures GDPR compliance for health data. Auto-generates REST/GraphQL APIs. Proven sync pattern with WatermelonDB. SOC 2 compliant (BAA available for PHI handling). |
| **React** | 19 | Web dashboard framework | Latest stable (ships with Expo SDK 54). Concurrent rendering improves dashboard performance. Server components not needed (client-side dashboard). |
| **Vite** | 6.x | Web build tool | Industry standard for React apps in 2026. Fast dev server (instant HMR), optimized production builds. Replaces Create React App (deprecated). |
| **Node.js** | 20 LTS | Backend runtime for Supabase Edge Functions | Recommended by Expo SDK 54. LTS ensures stability for production. Required for server-side PDF generation. |
| **TypeScript** | 5.x | Type safety across stack | Standard for React/React Native in 2026. Catches errors at compile-time. Essential for large codebases with offline sync logic. |
| **Tailwind CSS** | 4.x | Web dashboard styling | Utility-first CSS framework. Industry standard for 2026. Faster than component libraries for custom medical forms. Pairs well with shadcn/ui. |

### Supporting Libraries

#### Mobile App (iOS)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **expo-image-picker** | 17.0.10 | Photo capture and gallery access | Treatment photos, near-miss documentation. Handles permissions, EXIF data, compression. |
| **expo-camera** | Latest (SDK 54) | Direct camera access | Alternative to image-picker for faster capture workflows. |
| **react-native-signature-canvas** | 5.0.2 | Digital signature capture | Treatment consent, document signing. WebView-based, works with Expo. |
| **expo-file-system** | Latest (SDK 54) | File I/O and caching | Photo storage before sync, PDF caching for offline viewing. |
| **expo-document-picker** | 14.0.8 | Document/file selection | Worker certification uploads (PDFs, images). |
| **expo-secure-store** | Latest (SDK 54) | Encrypted key-value storage | Auth tokens, sensitive user preferences. iOS Keychain / Android EncryptedSharedPreferences. |
| **react-native-encrypted-storage** | 4.x | Encrypted AsyncStorage alternative | If expo-secure-store is insufficient. Larger storage capacity than Keychain (use for offline encryption keys). |
| **@tanstack/react-query** | 5.x | Server state management | Network requests, cache management, optimistic updates. Handles offline queue and retry logic. Pairs with WatermelonDB for hybrid local/server state. |
| **@tanstack/query-async-storage-persister** | 5.x | Persist TanStack Query cache | Offline persistence for server state. Survives app restarts. |
| **zustand** | 5.x | Global client state | UI state (active tab, filters, form state). Lightweight (2KB), no provider boilerplate. Standard for React Native in 2026. |
| **react-hook-form** | 7.x | Form validation and state | Treatment forms, near-miss capture, daily safety checklists. Minimal re-renders, TypeScript support. |
| **zod** | 3.x | Schema validation | Runtime type validation for forms. Pairs with react-hook-form. Validates data before WatermelonDB writes. |
| **@react-native-community/netinfo** | 11.x | Network status detection | Triggers sync when connectivity returns. Required for offline-first architecture. |
| **expo-notifications** | Latest (SDK 54) | Push notifications | RIDDOR deadline alerts, certification expiry warnings. |
| **expo-crypto** | Latest (SDK 54) | Cryptographic functions | AES-256 encryption for health data at rest (special category data under UK GDPR). |

#### Web Dashboard

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **shadcn/ui** | Latest | React component library (Tailwind) | Pre-built accessible components (tables, forms, dialogs). Copy/paste source code (not npm dependency). Replaces heavier UI libraries like Material-UI. |
| **@tanstack/react-query** | 5.x | Server state management | Dashboard API calls, real-time data fetching, cache invalidation. Same library as mobile app. |
| **zustand** | 5.x | Global client state | Dashboard filters, user preferences, active project selection. |
| **react-hook-form** | 7.x | Form validation | Site manager settings, worker profile creation, certification entry. |
| **zod** | 3.x | Schema validation | Form validation schemas shared with mobile app. |
| **recharts** | 2.x | Charts and visualizations | Future phase: trend analysis, heat maps. Composable React chart components. |
| **@supabase/supabase-js** | 2.x | Supabase client library | Auth, real-time subscriptions, Storage access. |
| **date-fns** | 3.x | Date manipulation | Treatment timestamps, RIDDOR deadline calculations, certification expiry tracking. Tree-shakable, smaller than moment.js. |
| **react-router** | 7.x | Client-side routing | Dashboard navigation (overview, treatments, near-misses, workers). |

#### PDF Generation (Server-Side)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **pdfmake** | 0.2.x | Declarative PDF generation | Weekly safety reports, treatment logs for HSE audits. JSON-based templates, supports tables/headers/footers. Server-side via Supabase Edge Functions (Deno runtime). |
| **@supabase/supabase-js** | 2.x | Supabase client (Edge Functions) | Fetch treatment data, near-miss logs, worker registry for PDF generation. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Xcode** | iOS compilation | Version 16.1+ required for SDK 54 (Xcode 16.2+ recommended). |
| **EAS Build** | Cloud builds for iOS/Android | Expo's managed CI/CD. Handles provisioning profiles, certificates. Free tier available. |
| **EAS Submit** | App Store / Play Store deployment | Automated submission from EAS Build. |
| **Expo Go** | Development client | Test app on physical device without builds. Limited for WatermelonDB (requires dev build). |
| **expo-dev-client** | Custom development build | Required for testing WatermelonDB and native modules. Replaces Expo Go for this project. |
| **ESLint** | Code linting | TypeScript + React rules. Airbnb or Standard config. |
| **Prettier** | Code formatting | Consistent formatting across team. Integrates with ESLint. |
| **Supabase CLI** | Local Supabase development | Run PostgreSQL + Auth + Storage locally. Generate TypeScript types from database schema. |
| **PostgreSQL** | Local database (via Docker) | Supabase CLI includes. Mirrors production schema. |

---

## Installation

### Mobile App (Expo)

```bash
# Initialize Expo project with TypeScript
npx create-expo-app@latest sitemedic-mobile --template expo-template-blank-typescript

# Core dependencies
npm install @nozbe/watermelondb@0.28.0 \
  @supabase/supabase-js@latest \
  @tanstack/react-query@latest \
  @tanstack/query-async-storage-persister@latest \
  zustand@latest \
  react-hook-form@latest \
  zod@latest \
  date-fns@latest

# Expo modules
npx expo install expo-image-picker \
  expo-camera \
  expo-file-system \
  expo-document-picker \
  expo-secure-store \
  expo-notifications \
  expo-crypto \
  @react-native-community/netinfo \
  @react-native-async-storage/async-storage

# Signature capture
npm install react-native-signature-canvas@latest

# WatermelonDB Expo plugin (required for native SQLite)
npm install --save-dev @morrowdigital/watermelondb-expo-plugin@latest

# Encrypted storage (if needed beyond expo-secure-store)
npm install react-native-encrypted-storage@latest

# Dev dependencies
npm install --save-dev @types/react @types/react-native \
  eslint prettier eslint-config-prettier \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**app.json configuration for WatermelonDB:**

```json
{
  "expo": {
    "plugins": [
      "@morrowdigital/watermelondb-expo-plugin",
      [
        "expo-build-properties",
        {
          "ios": {
            "extraPods": [
              {
                "name": "simdjson",
                "configurations": ["Debug", "Release"]
              }
            ]
          }
        }
      ]
    ]
  }
}
```

### Web Dashboard (React + Vite)

```bash
# Initialize Vite project with React + TypeScript
npm create vite@latest sitemedic-dashboard -- --template react-ts

# Core dependencies
npm install @supabase/supabase-js@latest \
  @tanstack/react-query@latest \
  zustand@latest \
  react-hook-form@latest \
  zod@latest \
  date-fns@latest \
  react-router@latest

# UI (Tailwind + shadcn/ui)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui (follow official setup: https://ui.shadcn.com/docs/installation/vite)
npx shadcn-ui@latest init

# Charts (for future phases)
npm install recharts@latest

# Dev dependencies
npm install --save-dev @types/react @types/react-dom \
  eslint prettier eslint-config-prettier \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### Backend (Supabase)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local Supabase project
supabase init

# Start local Supabase (PostgreSQL + Auth + Storage + Studio)
supabase start

# Generate TypeScript types from database schema
supabase gen types typescript --local > src/types/database.types.ts

# Link to remote Supabase project (production)
supabase link --project-ref <your-project-ref>

# Push migrations to production
supabase db push
```

---

## Alternatives Considered

| Decision | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| **Offline Database** | WatermelonDB | Expo SQLite (raw) | Simpler data models with <100 records. WatermelonDB overhead not justified. |
| **Offline Database** | WatermelonDB | RxDB | Need real-time multi-device sync (WatermelonDB is single-device). RxDB has built-in CouchDB/GraphQL sync but larger bundle size. |
| **Offline Database** | WatermelonDB | Realm | Legacy projects already using Realm. Realm is MongoDB-owned, less active community for React Native in 2026. |
| **Backend** | Supabase | Firebase | Already invested in Google ecosystem. Firebase has better offline SDK but vendor lock-in. Supabase is open-source (can self-host). |
| **Backend** | Supabase | Custom Node.js + PostgreSQL | Need custom business logic that Edge Functions can't handle. Adds DevOps complexity. Only if Supabase limitations proven (none identified for MVP). |
| **PDF Generation** | pdfmake (server) | jsPDF (client) | Generate PDFs on mobile device. Not recommended—large bundle size (30KB), slow rendering, drains battery. pdfmake server-side is faster and offloads processing. |
| **PDF Generation** | pdfmake | @react-pdf/renderer | Need React components for PDF templates. More developer-friendly but 3x slower rendering. Use for complex branded PDFs in post-MVP. |
| **State Management** | Zustand | Redux Toolkit | Large team (5+ developers) needing strict patterns. Redux adds boilerplate and complexity not justified for MVP (2-person team). |
| **State Management** | Zustand | Jotai | Need atomic state primitives. Jotai is more granular but less popular than Zustand (smaller ecosystem). |
| **UI Library (Web)** | shadcn/ui (Tailwind) | Material-UI | Prefer Material Design. MUI has larger bundle size (100KB+) and slower performance. shadcn/ui is 2026 standard for custom designs. |
| **UI Library (Web)** | shadcn/ui | Ant Design | Building enterprise dashboards in Asian markets (Ant Design is Alibaba-backed). More opinionated styling than shadcn/ui. |
| **Form Library** | react-hook-form + zod | Formik + Yup | Legacy projects using Formik. react-hook-form has better performance (fewer re-renders) and zod has better TypeScript inference. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **AsyncStorage (unencrypted)** | Stores sensitive health data in plaintext. Violates UK GDPR Article 32 (security of processing) for special category data. | expo-secure-store (iOS Keychain/Android EncryptedSharedPreferences) or react-native-encrypted-storage. |
| **Expo Managed Workflow (pure)** | WatermelonDB requires native modules (SQLite, simdjson). Managed workflow doesn't support custom native code. | expo-dev-client (custom development build) or bare workflow. |
| **Firebase Realtime Database** | NoSQL structure awkward for relational treatment/worker/certification data. Poor offline query support compared to local SQLite. | WatermelonDB (local) + Supabase PostgreSQL (server). |
| **Redux (classic, non-Toolkit)** | Excessive boilerplate for MVP. Steeper learning curve. Slower developer velocity. | Zustand for global state, TanStack Query for server state. Use Redux Toolkit only if team requires Redux patterns. |
| **Create React App** | Deprecated by React team. Slow builds, outdated dependencies. | Vite (10x faster dev server, modern tooling). |
| **Moment.js** | 67KB bundle size, deprecated in 2020. | date-fns (tree-shakable, 10KB) or native Intl API for simple cases. |
| **React Native Paper** | Material Design doesn't fit medical compliance aesthetic. Larger bundle than needed. | Custom components or React Native Elements (more flexible). For web: shadcn/ui. |
| **WebSQL** | Deprecated web standard. Removed from browsers in 2023. | IndexedDB (not applicable—this is a mobile-first app using WatermelonDB). |
| **SQLite3 (direct native modules)** | Requires manual Expo config plugin. WatermelonDB abstracts this and adds reactivity. | WatermelonDB (includes SQLite via JSI bindings). |
| **Axios** | Redundant with native fetch API (React Native 0.60+). fetch has better TypeScript support in 2026. | fetch + TanStack Query (handles retry, caching, offline). |

---

## Stack Patterns by Variant

### Pattern 1: Offline-First Mobile + Server Sync

**Trigger:** Construction site with no mobile signal (MVP requirement).

**Architecture:**
1. **Local writes:** User actions write to WatermelonDB (SQLite) immediately.
2. **Background sync:** NetInfo detects connectivity, triggers `sync()` function.
3. **WatermelonDB sync:** Calls Supabase RPC functions (`push`, `pull`).
   - `push`: Sends local changes (creates, updates, deletes) as JSON.
   - `pull`: Receives server changes since last sync timestamp.
4. **Conflict resolution:** Last-write-wins (sufficient for single-medic-per-site MVP). Phase 2: CRDTs for multi-medic.

**Libraries:**
- WatermelonDB (local state)
- Supabase (server state)
- @react-native-community/netinfo (connectivity detection)
- TanStack Query (optimistic updates for server-dependent actions)

**Performance targets met:**
- Zero data loss (writes always succeed locally).
- <90s treatment logging (no network blocking).
- Sync when connectivity available (background, non-blocking).

---

### Pattern 2: Server-Side PDF Generation

**Trigger:** Site manager clicks "Generate Weekly Report" on dashboard.

**Architecture:**
1. **Dashboard request:** POST to Supabase Edge Function `/generate-weekly-pdf`.
2. **Edge Function (Deno):**
   - Query PostgreSQL for treatments, near-misses, worker certifications.
   - Build pdfmake document definition (JSON template).
   - Generate PDF binary.
   - Upload to Supabase Storage (`/reports/{project_id}/{week}.pdf`).
   - Return signed URL to dashboard.
3. **Dashboard:** Download PDF or send via email (future phase).

**Libraries:**
- pdfmake (PDF generation)
- @supabase/supabase-js (Edge Function client)
- Supabase Storage (PDF hosting)

**Why server-side:**
- Faster rendering (Deno V8 vs mobile JavaScript).
- Smaller mobile app bundle (no PDF library).
- Professional formatting (access to server fonts, templates).

---

### Pattern 3: Encrypted Health Data at Rest

**Trigger:** UK GDPR Article 9 (special category data processing).

**Architecture:**
1. **Mobile encryption:**
   - Treatment data encrypted with AES-256 before WatermelonDB write.
   - Encryption key stored in expo-secure-store (iOS Keychain).
   - Key rotates every 90 days (GDPR best practice).
2. **Server encryption:**
   - Supabase PostgreSQL has encryption at rest (AWS EBS volumes).
   - Application-level encryption for worker health profiles (via pgcrypto extension).
   - Supabase Storage encrypts files (S3 SSE-AES256).
3. **Transit encryption:**
   - TLS 1.3 for all network requests (Supabase enforces HTTPS).

**Libraries:**
- expo-crypto (AES-256 encryption/decryption)
- expo-secure-store (key storage)
- Supabase (server-side encryption)

**Compliance met:**
- UK GDPR Article 32 (security of processing).
- ISO 27001 (Supabase is SOC 2 compliant).
- 3-year data retention (configurable PostgreSQL policies).

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK 54.0.33 | React Native 0.81 | Bundled together. Do not manually upgrade React Native. |
| Expo SDK 54 | React 19 | Expo SDK 54 ships React 19. Concurrent features enabled. |
| Expo SDK 54 | Node.js 20 LTS | Recommended for development. Required for Supabase Edge Functions. |
| Expo SDK 54 | iOS 16+ | Minimum deployment target. Supports iOS 18 features. |
| Expo SDK 54 | Android 16 | Targets Android 16 (edge-to-edge enforced). |
| WatermelonDB 0.28.0 | Expo SDK 54 | Requires @morrowdigital/watermelondb-expo-plugin. Confirm compatibility before upgrading Expo. |
| WatermelonDB 0.28.0 | Supabase | Use RPC-based sync (not Supabase Realtime). Supabase Realtime conflicts with WatermelonDB's local-first model. |
| TanStack Query 5.x | React 18/19 | Works with both. React 19's concurrent features improve performance. |
| pdfmake 0.2.x | Supabase Edge Functions (Deno) | Import as ES module. Deno's npm compatibility handles Node.js packages. |
| shadcn/ui | Tailwind CSS 4.x | Required. shadcn/ui components are Tailwind-based. |
| react-hook-form 7.x | React 19 | Fully compatible. zod integration via @hookform/resolvers. |

---

## Sources

### Context7 & Official Documentation
- [Expo Local-First Guide](https://docs.expo.dev/guides/local-first/) — Database recommendations, TinyBase, Legend-State, Prisma patterns
- [Supabase + WatermelonDB Guide](https://supabase.com/blog/react-native-offline-first-watermelon-db) — Official Supabase offline sync architecture
- [Supabase Regions](https://supabase.com/docs/guides/platform/regions) — UK/EU region codes (eu-west-2 London)
- [Expo Image Picker Docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/) — Features and configuration

### npm Package Registries
- [@nozbe/watermelondb](https://www.npmjs.com/package/@nozbe/watermelondb) — Version 0.28.0
- [react-native-signature-canvas](https://www.npmjs.com/package/react-native-signature-canvas) — Version 5.0.2
- [expo-document-picker](https://www.npmjs.com/package/expo-document-picker) — Version 14.0.8
- [expo-image-picker](https://www.npmjs.com/package/expo-image-picker) — Version 17.0.10

### Ecosystem Research (WebSearch - MEDIUM confidence)
- [Local-first React Native 2025](https://medium.com/@ssshubham660/local-first-apps-why-offline-first-is-becoming-essential-in-2025-and-how-react-native-developers-f03d5cc39e32) — Offline-first trends
- [WatermelonDB vs SQLite](https://www.powersync.com/blog/react-native-local-database-options) — Performance comparison
- [Zustand vs Redux 2026](https://veduis.com/blog/state-management-comparing-zustand-signals-redux/) — State management trends
- [React Admin Dashboards 2026](https://refine.dev/blog/react-admin-dashboard/) — shadcn/ui, Material-UI, Ant Design comparison
- [PDF Libraries 2025](https://blog.react-pdf.dev/6-open-source-pdf-generation-and-modification-libraries-every-react-dev-should-know-in-2025) — pdfmake vs jsPDF vs @react-pdf/renderer
- [GDPR Node.js Best Practices](https://blog.stackademic.com/how-to-build-gdpr-hipaa-compliant-backends-with-node-js-e68196740fd7) — Encryption, key management, access control
- [Expo SDK 54 Release](https://expo.dev/changelog/sdk-54) — React Native 0.81, React 19, XCFrameworks
- [TanStack Query Offline](https://tanstack.com/query/v4/docs/framework/react/examples/offline) — Persistence and network mode
- [React Native Security 2025](https://www.fullstack.com/labs/resources/blog/best-practices-for-scalable-secure-react-node-js-apps-in-2025) — Encryption best practices

### GitHub Repositories
- [WatermelonDB](https://github.com/Nozbe/WatermelonDB) — Reactive database overview
- [react-hook-form](https://github.com/react-hook-form/react-hook-form) — Form validation library
- [react-native-encrypted-storage](https://github.com/emeraldsanto/react-native-encrypted-storage) — Keychain wrapper

---

**Confidence Assessment:**

| Category | Level | Rationale |
|----------|-------|-----------|
| Core Stack (Expo, React, Supabase) | HIGH | Official documentation verified. Industry standard for offline-first React Native in 2026. |
| Offline Database (WatermelonDB) | HIGH | Supabase official guide confirms sync pattern. npm version verified. |
| Supporting Libraries (image-picker, signature-canvas, etc.) | HIGH | npm versions verified. Official Expo docs confirm compatibility. |
| PDF Generation (pdfmake) | MEDIUM | WebSearch-verified as standard for server-side generation. Not tested with Supabase Edge Functions (Deno runtime). |
| UI Libraries (shadcn/ui, Tailwind) | HIGH | 2026 industry standard verified via multiple sources. Official documentation confirms Vite compatibility. |
| GDPR Compliance (encryption, regions) | MEDIUM | Supabase DPA and SOC 2 docs verified. Health data patterns from WebSearch (best practices, not legal advice). Recommend legal review. |

---

*Stack research for: SiteMedic medical compliance platform*
*Researched: 2026-02-15*
*Next step: Create FEATURES.md, ARCHITECTURE.md, PITFALLS.md to complete research phase.*
