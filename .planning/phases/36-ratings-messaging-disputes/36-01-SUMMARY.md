# Plan 36-01 Summary: Marketplace Ratings

## Status: COMPLETE

## What Was Built

### Database (Migration 152)
- Extended `job_ratings` with `blind_window_expires_at`, moderation columns (`moderation_status`, `flagged_at`, `flagged_by`, `flagged_reason`, `moderated_at`, `moderated_by`, `moderation_notes`)
- Added `average_rating` + `review_count` to `marketplace_companies`
- Created `update_company_rating_aggregate()` trigger function — fires on INSERT/UPDATE/DELETE of job_ratings where job_type='marketplace', resolves company via awarded quote, recomputes aggregates

### TypeScript Types
- `web/lib/marketplace/rating-types.ts` — ModerationStatus, RatingVisibility, MarketplaceRating, CompanyRatingAggregates, RatingReportRequest, MarketplaceRatingsResponse

### API Routes
- `GET /api/marketplace/events/[id]/ratings` — Fetch ratings with blind window enforcement
- `POST /api/marketplace/events/[id]/ratings` — Submit rating with rater_type auto-detection and blind_window_expires_at computation
- `POST /api/marketplace/ratings/[id]/report` — Flag review for moderation; admin can remove directly
- `GET /api/marketplace/companies/[id]/reviews` — Paginated company reviews with star distribution

### UI Components
- `MarketplaceRatingForm.tsx` — 5-star selector with blind window info
- `ReviewCard.tsx` — Review display with report button
- `CompanyRatingsSummary.tsx` — Google Reviews-style aggregate with distribution chart

### Integrations
- Company profile page shows real ratings via CompanyRatingsSummary
- Quote list API returns real `average_rating`/`review_count` from marketplace_companies
- Event detail page has Ratings tab with MarketplaceRatingForm

## Files Created
- `supabase/migrations/152_marketplace_ratings.sql`
- `web/lib/marketplace/rating-types.ts`
- `web/app/api/marketplace/events/[id]/ratings/route.ts`
- `web/app/api/marketplace/ratings/[id]/report/route.ts`
- `web/app/api/marketplace/companies/[id]/reviews/route.ts`
- `web/components/marketplace/ratings/MarketplaceRatingForm.tsx`
- `web/components/marketplace/ratings/ReviewCard.tsx`
- `web/components/marketplace/ratings/CompanyRatingsSummary.tsx`

## Files Modified
- `web/lib/marketplace/types.ts` — Added average_rating, review_count to MarketplaceCompany
- `web-marketplace/app/companies/[id]/page.tsx` — Real ratings data + CompanyRatingsSummary
- `web-marketplace/app/api/marketplace/quotes/list/route.ts` — Real rating aggregates

## Deviations
None.
