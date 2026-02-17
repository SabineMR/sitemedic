# Fix: Footer Legal Links Are Broken Spans

**ID:** TASK-025
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** high
**Branch:** `fix/025-footer-legal-links`
**Labels:** frontend, ux, quick-win

## Description
`/web-app/components/footer.tsx` lines 54-58: Privacy Policy, Terms, Cookie Policy links
are `<span>` elements. They look clickable but navigate nowhere.
Also lines 44-47: Use Cases items are plain `<li>` text styled like links.

## Acceptance Criteria
- [ ] Privacy Policy links to `/privacy-policy`
- [ ] Terms of Service links to `/terms-and-conditions`
- [ ] Cookie Policy links to `/cookie-policy`
- [ ] Security link either removed or points to correct URL
- [ ] Use Cases items either converted to real links or styled as plain non-interactive text

## Notes
10-minute fix. The pages exist at those routes in `/web/app/`.
