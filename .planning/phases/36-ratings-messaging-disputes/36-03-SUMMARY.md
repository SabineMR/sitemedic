# Plan 36-03 Summary: Disputes, Cancellation & Resolution

## Status: COMPLETE

## What Was Built

### Database (Migration 154)
- `marketplace_disputes` table with category, description, evidence_urls, status, resolution fields
- Added `remainder_hold`, `cancellation_reason`, `cancellation_refund_amount`, `cancellation_refund_percent`, `cancelled_at`, `cancelled_by` columns to bookings
- `dispute-evidence` storage bucket (private, 10MB max, PDF/JPEG/PNG/WebP)
- RLS for both parties + platform admin access

### TypeScript Types
- `web/lib/marketplace/dispute-types.ts` — DisputeCategory, DisputeStatus, ResolutionType, CancellationReason, MarketplaceDispute, CancellationBreakdown, label maps

### Cancellation Logic
- `web/lib/marketplace/cancellation.ts` — `calculateMarketplaceCancellationRefund()` (client: >14d=100%, 7-14d=50%, <7d=0%) and `calculateCompanyCancellationRefund()` (always 100%)

### API Routes
- `GET /api/marketplace/events/[id]/dispute` — Fetch disputes for event (participant or admin)
- `POST /api/marketplace/events/[id]/dispute` — File dispute, set remainder_hold=true, notify
- `POST /api/marketplace/events/[id]/cancel` — Cancel event with tiered Stripe refunds
- `POST /api/marketplace/disputes/[id]/resolve` — Admin resolution (full_refund, partial_refund, dismissed, suspend_party)
- `GET /api/marketplace/disputes` — Admin disputes list with status filtering + event name enrichment

### UI Components
- `DisputeForm.tsx` — Category radios, description, evidence upload (drag-drop, max 5 files), payment hold warning
- `DisputeDetail.tsx` — Status badge, timeline, evidence thumbnails, admin resolution form
- `CancellationConfirmation.tsx` — Financial breakdown table, cancellation reason dropdown, two-step confirmation

### Pages
- `web/app/platform/disputes/page.tsx` — Admin disputes queue with status filter pills, table view, click-through detail, days-open indicator

## Files Created
- `supabase/migrations/154_marketplace_disputes.sql`
- `web/lib/marketplace/dispute-types.ts`
- `web/lib/marketplace/cancellation.ts`
- `web/app/api/marketplace/events/[id]/dispute/route.ts`
- `web/app/api/marketplace/events/[id]/cancel/route.ts`
- `web/app/api/marketplace/disputes/[id]/resolve/route.ts`
- `web/app/api/marketplace/disputes/route.ts`
- `web/components/marketplace/disputes/DisputeForm.tsx`
- `web/components/marketplace/disputes/DisputeDetail.tsx`
- `web/components/marketplace/disputes/CancellationConfirmation.tsx`
- `web/app/platform/disputes/page.tsx`

## Files Modified
- `web-marketplace/app/events/[id]/page.tsx` — Added Raise Dispute + Cancel Event buttons, dialog modals, existing dispute display

## Deviations
None.
