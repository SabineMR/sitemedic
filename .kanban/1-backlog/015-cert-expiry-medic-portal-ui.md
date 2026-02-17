# Build: Certification Expiry Visibility in Medic Portal

**ID:** TASK-015
**Story:** [STORY-004](../stories/004-compliance-enforcement.md)
**Priority:** critical
**Branch:** `feat/015-cert-expiry-medic-ui`
**Labels:** frontend, medic-portal, compliance

## Description
Medics have zero visibility into their own cert expiry dates. Add a certifications section to the medic portal.

## Acceptance Criteria
- [ ] `/web/app/medic/` page or `/web/app/medic/profile/` shows a certifications card
- [ ] Each cert displays: name, expiry date, days remaining, status badge (Valid/Expiring Soon/Expired)
- [ ] Banner alert shown if any cert expires within 30 days
- [ ] Expired certs shown in red with clear "Expired" badge

## Notes
Reuse `useExpiringCertifications()` query hook from admin certifications — filter to current medic's ID.
