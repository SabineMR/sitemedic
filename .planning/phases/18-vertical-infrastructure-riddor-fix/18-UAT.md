---
status: testing
phase: 18-vertical-infrastructure-riddor-fix
source: [18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md, 18-04-SUMMARY.md, 18-05-SUMMARY.md]
started: 2026-02-18T03:15:00Z
updated: 2026-02-18T03:15:00Z
---

## Current Test

number: 1
name: Admin Vertical Selector
expected: |
  Go to the web dashboard → Admin → Settings.
  You should see a grid of vertical cards (Construction, Film/TV, Motorsport, Festivals, Sporting Events, Fairs & Shows, Corporate, Private Events, Education, Outdoor Adventure).
  Clicking a card should select/deselect it. Clicking Save should persist the selection.
awaiting: user response

## Tests

### 1. Admin Vertical Selector
expected: Go to web dashboard → Admin → Settings. You should see a grid of 10 vertical cards (Construction, Film/TV, Motorsport, Festivals, Sporting Events, Fairs & Shows, Corporate, Private Events, Education, Outdoor Adventure). Clicking a card selects/deselects it. Clicking Save persists the selection.
result: [pending]

### 2. Client Booking — Event Type Selector
expected: Go through the client booking flow (create a new booking). On the shift config / booking details step, you should see an "Event Type" or "Vertical" dropdown/selector. Selecting an option (e.g., Festivals) and completing the booking should save that vertical — if you view the booking in the admin dashboard, the event type should be recorded.
result: [pending]

### 3. Treatment Form — Vertical Labels Match Org Setting
expected: Open the mobile app and navigate to start a new treatment. The form labels should match the org's configured vertical. For a construction org: "Worker", "Site", "Client". The form should load immediately without a brief loading spinner specifically for the vertical — it should appear as fast as the rest of the form.
result: [pending]

### 4. Treatment Form — Offline Vertical (cache test)
expected: With the mobile app, log in while connected to the internet. Then enable airplane mode. Navigate to start a new treatment. The treatment form should still open and show the correct vertical labels — it should NOT show an error or fall back to generic labels. The cached vertical from login should be used.
result: [pending]

### 5. RIDDOR Gate — Festival/Motorsport Treatment (skip if no test org)
expected: If you have a test org configured with the Festivals or Motorsport vertical: create a treatment on the mobile app, sync it, then check the web dashboard incident list. The treatment should NOT show a RIDDOR flag or "RIDDOR-reportable" badge. Previously, any treatment with an injury_type would trigger RIDDOR — now it should be blocked for non-applicable verticals.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0

## Gaps

[none yet]
