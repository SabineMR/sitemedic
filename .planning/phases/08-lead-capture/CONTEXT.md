# Phase 08: Lead Capture & Data Persistence

**Milestone:** v1.1
**Priority:** CRITICAL
**Status:** Pending planning

## Problem

Contact form sends email only — no database write. Quote Builder saves to `sessionStorage` only, data lost after session. Zero lead tracking or CRM capability.

## Goal

Persist every contact form and quote builder submission to the database so no lead is ever lost. Give admins a simple follow-up view.

## Gaps Closed

- Contact form data never persisted (only emailed) — `app/(marketing)/contact/contact-form.tsx`
- Quote Builder data lost to `sessionStorage` — `components/QuoteBuilder.tsx`
- No lead history, no conversion tracking, no follow-up status

## Key Files

- `web/app/(marketing)/contact/contact-form.tsx` — contact form (currently emails only)
- `web/components/QuoteBuilder.tsx` — quote builder (sessionStorage only)
- `web/app/api/contact/submit/route.ts` — contact API (currently email-only)
- `web/app/api/quotes/submit/route.ts` — quote API (currently email-only)
- `web/app/admin/customers/page.tsx` — admin customer view (add submissions tab)

## Planned Tasks

1. **08-01:** Create `contact_submissions` and `quote_submissions` tables + migrations
2. **08-02:** Update contact and quote API routes to write to DB before sending email
3. **08-03:** Admin submissions list page with follow-up status (`new` / `contacted` / `converted` / `closed`)
4. **08-04:** Quote-to-booking conversion: admin button pre-fills `/admin/bookings/new` with quote data

## Success Criteria

1. Contact form submission is visible in admin panel within 60 seconds
2. Quote submission survives browser close and is retrievable by admin
3. Admin can mark leads as `new`, `contacted`, `converted`, `closed`
4. Quote data pre-fills the booking form when admin clicks "Convert to Booking"
