---
phase: 07-certification-tracking
plan: 05
subsystem: mobile
tags: [react-native, expo, supabase, certification-validation, offline-first, gap-closure]

# Dependency graph
requires:
  - phase: 07-01
    provides: Certification validation API at /api/certifications/validate
  - phase: 02-04
    provides: Treatment form workflows (new.tsx, templates.tsx)
provides:
  - Mobile treatment forms enforce certification validation before completion
  - Medic ID mapping (user_id → medics.id) for validation API calls
  - Graceful offline degradation preserving offline-first architecture
  - Red error banner UI for expired certification feedback
affects: [Phase 8 - any mobile forms requiring pre-submission validation patterns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mobile-to-web API call pattern using EXPO_PUBLIC_WEB_APP_URL"
    - "User ID to medic ID mapping via Supabase lookup"
    - "Graceful degradation for offline-first validation (return valid: true on network error)"
    - "Red error banner UI pattern for blocking validation errors"

key-files:
  created:
    - src/types/env.d.ts (added EXPO_PUBLIC_WEB_APP_URL)
  modified:
    - app/treatment/new.tsx (added validateMedicCertifications, cert error banner)
    - app/treatment/templates.tsx (added validateMedicCertifications, cert error banner)
    - .env (added EXPO_PUBLIC_WEB_APP_URL=http://localhost:30500)
    - .env.example (added EXPO_PUBLIC_WEB_APP_URL with comment)

key-decisions:
  - "D-07-05-001: Use EXPO_PUBLIC_WEB_APP_URL env var for mobile-to-web API calls (enables dev/prod environment switching)"
  - "D-07-05-002: Look up medic by user_id to get medics.id before calling validation API (medics.id != auth.users.id, API expects medics table primary key)"
  - "D-07-05-003: Gracefully degrade when offline or no medic record (return valid: true to preserve offline-first architecture, don't block construction site workers)"
  - "D-07-05-004: Show red error banner in UI when validation fails (visual feedback alongside Alert for better UX)"
  - "D-07-05-005: Include expired cert types in Alert message (medic sees exact certs needing renewal, e.g., 'CSCS, IPAF')"

patterns-established:
  - "Mobile-to-web API validation pattern: env var for URL, graceful offline fallback, user-friendly error messages"
  - "Medic ID mapping pattern: always use .eq('user_id', user.id) to look up medic record before passing medic.id to APIs"

# Metrics
duration: 4.5min
completed: 2026-02-17
---

# Phase 07 Plan 05: Certification Validation API Integration Summary

**Mobile treatment forms block medics with expired certifications via /api/certifications/validate, with graceful offline fallback preserving offline-first architecture**

## Performance

- **Duration:** 4.5 min
- **Started:** 2026-02-17T01:21:17Z
- **Completed:** 2026-02-17T01:25:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Closed CERT-06 enforcement gap: validation API now wired into mobile treatment forms
- Medic with expired certifications blocked from treatment completion with clear error message
- Offline-first architecture preserved: network errors don't block treatment logging
- Red error banner provides visual feedback for expired certifications

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure EXPO_PUBLIC_WEB_APP_URL environment variable** - `d8b159f` (chore)
2. **Task 2: Add certification validation to treatment completion flow** - `9b0df79` (feat)

## Files Created/Modified
- `src/types/env.d.ts` - Added EXPO_PUBLIC_WEB_APP_URL to both @env module and ProcessEnv interface
- `.env.example` - Added EXPO_PUBLIC_WEB_APP_URL=http://localhost:30500 with usage comment
- `app/treatment/new.tsx` - Added validateMedicCertifications helper, certification validation before completion, red error banner UI
- `app/treatment/templates.tsx` - Added validateMedicCertifications helper, certification validation before template selection, red error banner UI

## Decisions Made

**D-07-05-001: Use EXPO_PUBLIC_WEB_APP_URL env var for mobile-to-web API calls**
- Rationale: Enables environment-specific configuration (dev: localhost:30500, prod: production URL)
- Pattern: All EXPO_PUBLIC_* vars auto-loaded by Expo, accessible via process.env

**D-07-05-002: Look up medic by user_id to get medics.id before calling validation API**
- Rationale: medics.id (primary key) != auth.users.id (user_id foreign key). Validation API expects medics.id via .eq('id', worker_id) query.
- Pattern: Always `.eq('user_id', user.id).single()` to get medic record, then pass `medic.id` to APIs
- Critical: Passing user.id directly would cause 404 from validation API

**D-07-05-003: Gracefully degrade when offline or no medic record**
- Rationale: Construction sites have unreliable connectivity. Blocking treatment logging offline violates offline-first architecture and GDPR data collection requirements.
- Pattern: Return `{ valid: true }` on network error, auth error, or missing medic record
- Console.warn logs reason for skipping validation (debugging visibility without blocking UX)

**D-07-05-004: Show red error banner in UI when validation fails**
- Rationale: Alert alone is dismissible. Persistent banner provides ongoing visual reminder that certifications need renewal.
- Pattern: Red banner (#FEF2F2 background, #EF4444 border, #991B1B text) matches RIDDOR yellow banner pattern

**D-07-05-005: Include expired cert types in Alert message**
- Rationale: Generic "expired certifications" doesn't tell medic what to renew. Specific types (e.g., "CSCS, IPAF") enable immediate action.
- Pattern: `expired_certs?.join(', ')` from API response 403 payload

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - validation API integration worked as designed.

## User Setup Required

None - EXPO_PUBLIC_WEB_APP_URL configured in .env (gitignored, already set locally). Developers cloning repo should copy from .env.example.

## Next Phase Readiness

- Certification tracking Phase 7 now complete with full enforcement (web dashboard + mobile validation)
- Mobile treatment forms enforce cert validation before incident logging
- Ready for Phase 8 territory auto-assignment completion (Wave 2 plans 04-05)

**Blockers/Concerns:** None

---
*Phase: 07-certification-tracking*
*Completed: 2026-02-17*
