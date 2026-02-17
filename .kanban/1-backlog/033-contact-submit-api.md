# Build: Contact Form Submission API

**ID:** TASK-033
**Story:** [STORY-007](../stories/007-lead-crm-completion.md)
**Priority:** medium
**Branch:** `feat/033-contact-submit-api`
**Labels:** backend, leads

## Description
Verify or create `POST /api/contact/submit` endpoint that saves contact form data to `contact_submissions`.

## Acceptance Criteria
- [ ] Endpoint accepts: name, email, company, enquiry_type, message
- [ ] Sets org_id from context, status defaults to 'new'
- [ ] Returns success with the created record ID
- [ ] Uses service role to bypass RLS on INSERT
- [ ] Sends confirmation email to submitter via Resend

## Notes
Check if endpoint already exists at `/web/app/api/contact/submit/route.ts` — create if not.
