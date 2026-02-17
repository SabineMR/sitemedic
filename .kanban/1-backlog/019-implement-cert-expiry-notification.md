# Fix: Implement sendCertExpiry() Notification

**ID:** TASK-019
**Story:** [STORY-005](../stories/005-notification-service.md)
**Priority:** critical
**Branch:** `feat/019-cert-expiry-notification`
**Labels:** backend, notifications, compliance

## Description
`sendCertExpiry()` in notification-service is a stub returning `{ success: true }`.
No actual notification is ever sent when a cert is near expiry.

## Acceptance Criteria
- [ ] Sends push notification to medic via Expo push API
- [ ] Sends email to medic via SendGrid with cert name and days remaining
- [ ] `certification-expiry-checker` edge function calls this after identifying expiring certs
- [ ] Notification sent at 30 days, 14 days, and 7 days before expiry
- [ ] Deduplication prevents duplicate notifications on same day

## Notes
Hook into existing `certification-expiry-checker` edge function scheduled via pg_cron.
