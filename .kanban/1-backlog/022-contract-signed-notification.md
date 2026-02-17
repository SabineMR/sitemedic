# Fix: Send Notification When Contract Is Signed

**ID:** TASK-022
**Story:** [STORY-005](../stories/005-notification-service.md)
**Priority:** high
**Branch:** `feat/022-contract-signed-notification`
**Labels:** backend, notifications, contracts

## Description
When a client signs a contract, no notification is sent to admin or the contract creator.
The signing UI also falsely tells clients "A copy will be sent to your email shortly."

## Acceptance Criteria
- [ ] After successful signature save in `/api/contracts/[id]/sign/route.ts`, send email to admin
- [ ] Email to contract creator: "[Client name] has signed contract [ref]"
- [ ] Email to signer: copy of the signed contract PDF attached
- [ ] Remove or fulfil the "copy will be sent to your email" UX promise

## Notes
Use Resend email service. Follow pattern of `send-booking-received.ts`.
PDF attachment: signed PDF path is set in `contract_versions` after generation.
