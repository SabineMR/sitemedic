# Phase 09: Booking Data Completeness

**Milestone:** v1.1
**Priority:** HIGH
**Status:** Pending planning

## Problem

Many booking fields are stored in the database but never shown in any UI view. Clients don't see their own notes. Admins can't see why a booking needed approval or who cancelled it.

## Goal

Surface all booking data that is already collected — clients see their full booking details, admins see the full operational context.

## Gaps Closed

- `specialNotes`, `recurrencePattern`, `recurringWeeks` not shown on confirmation page
- `what3words_address` collected, stored, never displayed anywhere
- `site_contact_name`, `site_contact_phone` stored but not in admin booking view
- `approval_reason`, `cancellation_reason`, `cancelled_by`, `refund_amount` fetched but hidden
- Recurring booking chain: no view showing all instances in a series

## Key Files

- `web/app/(booking)/book/confirmation/page.tsx` — booking confirmation (missing fields)
- `web/app/admin/bookings/page.tsx` — admin bookings list
- `web/lib/queries/admin/bookings.ts` — `BookingWithRelations` already fetches these fields
- `web/components/booking/booking-confirmation.tsx` — confirmation display component
- `web/components/booking/recurring-summary.tsx` — recurring summary component

## Planned Tasks

1. **09-01:** Update booking confirmation page to show `specialNotes`, `recurrencePattern`, `what3words_address`
2. **09-02:** Update admin booking detail view to surface `site_contact_name/phone`, `approval_reason`, `cancellation_reason`, `refund_amount`
3. **09-03:** Recurring booking chain view: list all bookings in a series with per-instance status
4. **09-04:** What3Words display: formatted address with copy button and link to what3words.com

## Success Criteria

1. Client sees their special notes and what3words address on booking confirmation
2. Admin sees why a booking needed approval and who cancelled it (if applicable)
3. Recurring booking chain shows all N instances with per-instance status
4. Refund amount visible in admin view when applicable
