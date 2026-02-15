# Pitfalls Research

**Domain:** Medical compliance platform with offline-first mobile capabilities (construction site health and safety)
**Researched:** 2026-02-15
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Data Loss During Offline-to-Online Sync Transitions

**What goes wrong:**
Users capture critical medical data (injury photos, incident reports, worker certifications) while offline. When network connectivity returns, sync conflicts occur or upload failures happen silently. Data appears "saved" locally but never reaches the server, resulting in missing incident reports, lost RIDDOR notifications, and compliance failures. In worst cases, conflicting edits (medic logs incident offline, office staff updates same worker record online) result in one version being overwritten without warning.

**Why it happens:**
Teams implement naive "last-write-wins" conflict resolution or don't handle partial upload failures. Developers test with reliable WiFi, missing edge cases like intermittent mobile signals on construction sites. Sync queue retry logic fails to persist across app crashes. Background upload tasks get killed by OS battery optimization without proper WorkManager constraints.

**How to avoid:**
- Implement robust sync queue with persistent storage (WorkManager for Android, not just in-memory queues)
- Use operational transformation or CRDTs for conflict resolution, never simple "last-write-wins" for health data
- Make sync operations idempotent with client-generated UUIDs (not server auto-increment IDs)
- Add operation tombstones so deletions sync correctly
- Test sync logic with flaky networks: airplane mode toggles, 2G speeds, mid-upload app kills
- Store upload progress per attachment (photos) so partial uploads can resume
- Add "force sync" button for users to manually trigger retry after failures

**Warning signs:**
- User reports "I saved that incident but it's missing from the web dashboard"
- Duplicate records appearing after sync (indicates non-idempotent operations)
- Photos missing from synced incidents (attachment upload failed separately from metadata)
- Database growing indefinitely (sync queue not clearing completed items)
- Users reporting battery drain from constant background sync retries

**Phase to address:**
Phase 1 (Foundation) - Sync architecture must be solid before building features on top. Cannot be retrofitted later without major refactor.

---

### Pitfall 2: GDPR Violations with Health Data Handling

**What goes wrong:**
SiteMedic processes UK GDPR "special category data" (Article 9: health information). Common violations include: storing health data unencrypted on device, missing audit logs of who viewed which worker's medical records, retaining injury photos longer than legally required, failing to report data breaches within 72 hours, processing health data without valid legal basis (consent vs. legitimate interest confusion), and including raw patient data in audit logs themselves (meta-violation).

Fines: up to £20 million or 4% of global revenue, whichever is higher.

**Why it happens:**
Developers treat health data like ordinary user data. UK employment law creates "imbalance of power" - workers can't freely consent to medical data collection (employer-employee power dynamic), so consent is not a valid legal basis. Must rely on "legitimate interest" (workplace safety compliance) but teams forget to document the balancing test. Photo retention defaults to "forever" instead of calculating minimum necessary period. Audit logging seen as "nice to have" feature, deferred to later phases.

**How to avoid:**
- Encrypt health data at rest (AES-256) and in transit (TLS 1.3), even on device
- Plan for post-quantum encryption by 2026 (CRYSTALS-Kyber as GDPR is moving toward quantum-resistant requirements)
- Implement comprehensive audit logging from Day 1: who viewed which worker record, when, and what actions taken
- Audit logs must NOT contain raw health data (log "User ID 47 accessed Worker Record 12345" not "Dr. Smith viewed John's broken arm photo")
- Document legal basis as "legitimate interest" (workplace safety compliance under RIDDOR), not consent
- Conduct and document Legitimate Interest Assessment (LIA) balancing employer safety obligations against worker privacy
- Set data retention policies: RIDDOR records must be retained 3 years minimum (HSE requirement), but calculate maximum based on litigation timeframes
- Auto-delete injury photos after retention period expires
- Implement data breach detection and 72-hour notification workflow (GDPR Article 33)
- Add "right to be forgotten" workflow (with exceptions for legal obligations like RIDDOR)
- If data breach involves encryption keys remaining secure, notification may not be required (Article 34 exemption)

**Warning signs:**
- Database schema stores health data in plaintext
- No audit_log table or access tracking in codebase
- File storage for photos has no encryption
- Data retention policy is "keep everything forever"
- Legal basis for processing documented as "consent" (wrong for employment context)
- No documented LIA or privacy impact assessment
- Breach notification process is "we'll figure it out if it happens"

**Phase to address:**
Phase 1 (Foundation) - Cannot launch without GDPR compliance. Retrofitting encryption and audit logging after launch is extremely difficult and may require data migration.

---

### Pitfall 3: Inadequate Offline UX - Users Don't Know What's Synced

**What goes wrong:**
Users capture incident data while offline. App shows "Saved" confirmation but doesn't clarify "saved locally, not yet synced to server." Users assume data is backed up and close the app. When sync finally happens hours later, it fails (validation error, file too large, server timeout), but user never sees the error. Result: medic thinks incident was reported, but it never reached the system. RIDDOR deadline (10 days for serious injuries) is missed because the failure was silent.

**Why it happens:**
Developers focus on making offline mode "work" but neglect communicating state to users. Sync status is shown as loading spinner that disappears, not persistent indicator. Failed uploads don't surface prominently or provide actionable error messages ("Error code 500" means nothing to a site medic). Users can't distinguish between "synced to server" and "saved to device only."

**How to avoid:**
- Use multi-modal sync status indicators: color, labels, and icons (not just color - accessibility)
- Show persistent status: "3 items pending sync" badge always visible, not just during active sync
- Clear status labels in plain language: "Pending", "Syncing", "Failed", "Synced" (not error codes)
- For failures, explain in human terms: "Couldn't upload. No internet." or "Photo too large. Try again on WiFi."
- Provide dedicated "Pending Changes" or "Outbox" screen listing unsynced items: "Incident 104: Photo upload pending" with timestamp and retry option
- Use subtle, non-intrusive indicators (small syncing icon in header, not blocking modal)
- Show progress for large uploads: "Uploading photo 2 of 4 (47%)" so users know it's working
- Add manual "Force Sync" button so users can trigger retry when they have connectivity
- Surface critical failures prominently: RIDDOR-reportable incident failed to sync triggers alert, not buried in sync log
- Provide sync status on each incident/record: green checkmark (synced), orange clock (pending), red exclamation (failed)

**Warning signs:**
- Users asking "Did that save?" or "Is this backed up?"
- Support tickets: "I saved an incident but it's not showing on the dashboard"
- Users force-quitting and reopening app hoping it will sync
- No visibility into sync queue or pending uploads
- Error messages shown only in console logs, not to user
- Users can create new incidents but can't see which old ones are still unsynced

**Phase to address:**
Phase 1 (Foundation) - Offline UX is fundamental to user trust. If users don't trust sync, they'll duplicate work or avoid using offline features entirely.

---

### Pitfall 4: RIDDOR Auto-Flagging Sensitivity Problems

**What goes wrong:**
RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences Regulations) requires reporting specific incidents to HSE within strict deadlines:
- Deaths and specified injuries: within 10 days
- Over-seven-day injuries: within 15 days
- Occupational diseases: without delay upon diagnosis

Auto-flagging that's too sensitive creates alert fatigue: medics get false alarms for minor injuries (cut finger flagged as "specified injury"), leading them to ignore all RIDDOR alerts. Eventually they miss a real reportable incident (fractured bone, loss of consciousness, amputation). Too lenient flagging misses genuinely reportable incidents, causing compliance failures and potential £20,000 fines or 2-year jail terms for responsible persons.

**Why it happens:**
RIDDOR criteria are complex and context-dependent. Example: "fracture other than to fingers, thumbs and toes" is reportable, but finger fractures are not (unless multiple fingers). "Unconsciousness caused by head injury or asphyxia" is reportable, but fainting from heat is not. Developers implement simple keyword matching ("fracture" always flags) without understanding medical nuances. No feedback loop to tune flagging based on medic overrides.

**How to avoid:**
- Study official RIDDOR criteria in detail: [HSE RIDDOR regulations](https://www.hse.gov.uk/riddor/)
- Implement structured incident capture: checkboxes for "injury type" (fracture, burn, amputation, etc.) + "body part" + "mechanism" instead of free text
- Use decision tree logic: "fracture" + "finger/thumb/toes" = not reportable (unless multiple), "fracture" + "arm/leg/skull" = reportable
- Flag as "Possibly reportable - review required" not "Definitely reportable" to reduce false confidence
- Let medics override with reason: "Flagged as reportable fracture but confirmed it's finger fracture only - not reportable"
- Track override patterns to tune algorithm: if 80% of "fall from height" incidents are overridden as "not reportable", review flagging logic
- Provide RIDDOR guidance in-app: when flagging incident, show relevant HSE criteria excerpt so medic can verify
- Add "RIDDOR deadline countdown" for flagged incidents: "7 days remaining to report to HSE"
- Require supervisor review before auto-submitting to HSE (don't auto-report without human verification)

**Warning signs:**
- High false positive rate: most RIDDOR flags get overridden as "not reportable"
- Medics complaining about excessive alerts
- Genuine RIDDOR incidents not flagged (testing against known reportable scenarios)
- No ability to provide feedback on incorrect flags
- Flagging logic is simple string matching without context
- No visibility into flagging decision rationale ("Why was this flagged?")

**Phase to address:**
Phase 2 or 3 (Smart Features) - Requires baseline incident capture (Phase 1) but can be refined iteratively. Start conservative (manual review), add smart flagging later based on real data patterns.

---

### Pitfall 5: Photo Upload Blocking Workflow

**What goes wrong:**
Site medic treats injured worker, opens app to log incident, takes 4 photos of injury (required for documentation), taps Save. App attempts to upload 4 x 3MB photos (12MB total) immediately over construction site mobile data. Upload takes 90+ seconds or times out. Medic can't move to next task - app is stuck on "Uploading..." spinner. Blocking UX violates the 90-second constraint (medics can't spend more than 90 seconds on paperwork). Result: medics skip photo capture entirely, reducing incident documentation quality.

**Why it happens:**
Developers implement synchronous upload: save button triggers upload, UI blocks until complete. Works great on office WiFi in testing, fails on 2G construction site mobile data. Large photo files (modern phones capture 3-5MB images) combined with poor connectivity create unacceptable wait times. No image optimization or background upload strategy.

**How to avoid:**
- Decouple photo capture from photo upload: photos save locally immediately (instant feedback), upload happens in background queue
- Optimize images before upload: resize to max 1200px width (sufficient for incident documentation), compress to 100-200KB JPEG (80% quality)
- Preserve original high-res image locally for later retrieval if needed
- Use background upload queue with WorkManager: requires WiFi or unmetered network for large uploads (battery-friendly constraints)
- Show optimistic UI: "Incident saved. Photos uploading in background." with progress indicator user can check but doesn't block them
- Allow user to continue working immediately after save
- Provide manual "Upload now" option for urgent incidents when on WiFi
- Handle upload failures gracefully: retry automatically on next WiFi connection, show "3 photos pending upload" status
- Consider progressive upload: upload thumbnail first (instant), full-res later in background
- Set WorkManager constraints: NetworkType.UNMETERED (WiFi only for large files), BatteryNotLow, DeviceIdle (optional)

**Warning signs:**
- Medics reporting app is "slow" or "takes forever to save"
- Users on slow connections can't save incidents at all (timeout errors)
- Battery drain from constant photo upload attempts over mobile data
- Users force-quitting app during long uploads
- Photo file sizes are multi-megabyte uncompressed originals
- No background upload queue - everything is synchronous
- Upload progress blocks entire UI, can't navigate away

**Phase to address:**
Phase 1 (Foundation) - Photo capture is core feature, must work efficiently offline and on poor connections from Day 1. Retrofitting background upload after synchronous implementation is built requires significant refactor.

---

### Pitfall 6: PDF Generation Too Slow or Breaks on Mobile

**What goes wrong:**
HSE auditors require PDF incident reports. Medic generates PDF report on mobile device for incident with 4 photos, 3 witness statements, and certification records. PDF generation takes 30+ seconds, freezes UI, drains battery, or crashes app entirely on older devices. Large PDFs (5MB+) fail to open on auditor's software or exceed email attachment limits. Broken PDF generation means reports can't be submitted, causing compliance failures.

**Why it happens:**
PDF generation is CPU and memory intensive. Developers use heavy libraries designed for desktop (not mobile-optimized). Generating PDFs on UI thread blocks app. Including full-resolution photos (3MB each) creates massive PDF files. No pagination or streaming - entire PDF built in memory before saving. Testing only on flagship phones, not mid-range Android devices with limited RAM.

**How to avoid:**
- Use mobile-optimized PDF library: lightweight, async generation
- Generate PDFs on background thread, never UI thread
- Optimize images before embedding in PDF: resize to 800px width max, compress to 100-150KB
- Implement streaming PDF generation if possible: write to disk incrementally, not all in memory
- Set reasonable timeouts and show progress: "Generating report... 3 of 8 pages complete"
- Consider server-side PDF generation for complex reports: mobile app sends data, server generates PDF, returns download link
- Cache PDF locally after generation so re-downloads are instant
- Test on low-end devices: 3-year-old Android with 2GB RAM, not just latest iPhone
- Limit PDF size: max 10 pages or 2MB, paginate long reports across multiple PDFs
- Provide "lightweight" vs "detailed" report options: lightweight excludes high-res photos for email-friendly size

**Warning signs:**
- PDF generation crashes app on older devices
- Users reporting app freezes when generating reports
- Generated PDFs are 10MB+ file size
- PDF generation takes 30+ seconds for simple reports
- OutOfMemory errors in crash logs during PDF generation
- Generated PDFs don't open in Adobe Reader or other viewers (malformed PDF)
- No progress indicator during generation, user thinks app is frozen

**Phase to address:**
Phase 2 (Reporting) - PDF generation is needed for compliance reporting, but not required for basic incident capture (Phase 1). Allows time to test and optimize before launch.

---

### Pitfall 7: Certification Expiry Tracking Misses Deadlines

**What goes wrong:**
Construction site requires valid First Aid certification for all medics. Medic's cert expires on March 15, but notification is only sent on March 15 (too late - medic already on site without valid cert). Or worse: notification sent to medic's email which they never check, not to site manager responsible for compliance. Result: site operates with uncertified medics, OSHA violations, £20,000 RIDDOR fines if incident occurs with uncertified medic.

**Why it happens:**
Teams implement single reminder at exact expiry date, not progressive warnings (30 days, 7 days, day-of). Notifications go to worker only, not supervisors/managers responsible for compliance. Reminder scheduling breaks if user's device is offline on notification date (notification never fires). No escalation if reminder is ignored. Expiry checking happens only quarterly during manual reviews, not continuously. Workers can still log incidents even with expired certifications (no validation).

**How to avoid:**
- Implement progressive notification schedule: 30 days before expiry, 14 days, 7 days, 1 day, day-of, 1 day overdue
- Send notifications to multiple recipients: worker (awareness), site manager (responsibility), compliance officer (oversight)
- Use server-side scheduled jobs for critical reminders (not just device-local notifications that can fail)
- Add expiry validation at point of use: worker with expired cert can't log incidents until renewed
- Visual indicators on worker profiles: green (valid), yellow (expiring soon <30 days), red (expired)
- Dashboard for managers: "3 medics with certifications expiring this month" with drill-down
- Automated expiry tracking runs daily, not quarterly
- Include grace period awareness: some certifications allow 30-day grace period for renewal
- Track renewal-in-progress status: cert expires March 15, renewal submitted March 1, allow continued work during processing
- Generate compliance reports: "All site medics certified as of [date]" for auditors

**Warning signs:**
- Certifications expiring without anyone noticing until too late
- Site managers discovering expired certs during incident (not proactively)
- Single notification at expiry date, no advance warnings
- Notifications only to worker, not supervisors
- Workers with expired certs can still perform duties in system (no validation)
- No dashboard or reporting for upcoming expirations
- Expiry checking is manual process, not automated

**Phase to address:**
Phase 2 (Certification Tracking) - Needed before full production rollout but not for initial MVP incident capture. Allows time to implement robust notification system.

---

### Pitfall 8: Background Upload Causing Battery Drain

**What goes wrong:**
Users install app, capture incidents throughout the day while offline. Background sync process wakes device every 15 minutes attempting to upload even when no WiFi available. Device enters Doze mode overnight, app uses partial wakelocks to keep syncing, draining battery. Users wake to dead phone and blame app. Google Play Store flags app as battery-draining (new 2026 policy), reducing app visibility and downloads. Users uninstall.

**Why it happens:**
Developers implement aggressive sync retry logic: attempt upload every 15 minutes regardless of connectivity. Use AlarmManager with exact intervals instead of WorkManager with constraints. Don't respect Android Doze mode or iOS background execution limits. Partial wakelocks prevent device sleep. Testing on devices plugged into chargers (not real-world battery constraints). Starting March 2026, Google Play Store warns users about battery-draining apps using excessive partial wakelocks.

**How to avoid:**
- Use WorkManager (Android) with proper constraints: NetworkType.UNMETERED (WiFi only for large uploads), BatteryNotLow, RequiresCharging (optional for non-urgent sync)
- Implement exponential backoff for failed sync attempts: 5min, 15min, 1hr, 4hr (not constant 15min retries)
- Respect system Doze mode: sync will run during maintenance windows, don't fight OS battery optimization
- Use WorkManager's built-in retry logic with backoff policies instead of custom alarms
- For iOS, use Background Tasks framework respecting 30-second execution limits
- Prioritize sync: urgent items (RIDDOR-reportable incidents) sync immediately, routine items batch until WiFi
- Add user control: "Sync only on WiFi" setting, "Sync only when charging" option
- Test battery usage: Android Battery Historian, monitor partial wakelocks
- Monitor WorkManager execution: too-frequent runs indicate constraint misconfiguration
- Defer non-critical uploads: worker certification photos can wait for WiFi, incident reports sync sooner

**Warning signs:**
- Battery usage statistics show app using 20%+ battery in background
- Partial wakelock warnings in logcat
- App waking device during Doze mode
- Constant sync attempts even when offline (network logs showing failed retries every 15min)
- WorkManager constraints not set or set too loosely (NetworkType.CONNECTED allows expensive mobile data uploads)
- Users complaining about battery drain
- Google Play Console shows battery usage warnings (2026 policy)

**Phase to address:**
Phase 1 (Foundation) - Background sync architecture must be battery-efficient from start. Fixing battery drain after launch damages reputation and causes user churn.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Simple last-write-wins conflict resolution | Easy to implement, no complex merge logic | Data loss when offline edits conflict, users don't trust sync | Never for health data; maybe acceptable for non-critical settings |
| Store unencrypted health data locally | Faster development, easier debugging | GDPR violation, £20M fine risk, complete rebuild required to add encryption | Never - encryption is non-negotiable for health data |
| Synchronous photo upload on save | Simple flow: tap save, upload, done | Blocks UI, terrible UX on slow connections, medics skip photos | Never for production; OK for prototype/demo only |
| Server-side PDF generation only (no offline) | Easier to maintain one PDF generator | Can't generate reports offline, defeats offline-first architecture | Acceptable for complex auditor reports; not for field incident reports |
| Single expiry reminder at deadline | Minimal notification infrastructure | Misses deadlines, compliance failures | Never - progressive reminders are table stakes |
| No audit logging in MVP | Ship faster, add logging later | Cannot retrofit without breaking changes, GDPR non-compliance from Day 1 | Never for health data - required by GDPR Article 30 |
| Manual RIDDOR flagging (no auto-detection) | Avoid false positive complexity | Relies on medic's RIDDOR knowledge, inconsistent compliance | Acceptable for Phase 1 MVP, must add smart flagging by Phase 2 |
| Client-generated timestamps for sync order | No server clock sync needed | Clock skew causes incorrect conflict resolution, data loss | Acceptable only if paired with server-side validation and vector clocks |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| HSE RIDDOR API (if available) | Assuming real-time submission works offline | Queue submissions locally, retry on connectivity; provide manual fallback |
| Email/PDF delivery | Sending multi-megabyte PDFs that bounce | Optimize PDF size <2MB; provide cloud link for large reports |
| Push notifications (cert expiry) | Using only device-local notifications that fail if app uninstalled | Pair device notifications with email/SMS for critical compliance alerts |
| Photo cloud storage (S3/Azure) | Uploading full-res images (3-5MB each) | Resize to max 1200px, compress to 100-200KB before upload; store originals locally |
| Analytics/crash reporting | Sending PII in crash logs or analytics events | Strip all health data; log only UUIDs and anonymized metadata; configure SDK with privacy mode |
| Authentication (SSO/OAuth) | Assuming always-online for token refresh | Cache credentials securely; handle offline re-auth gracefully; support biometric unlock |
| Third-party compliance APIs | No retry logic for failed compliance checks | Implement retry with exponential backoff; cache last known status; fail open or closed based on risk |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all incidents into memory on app start | Fast for first 10 incidents | OutOfMemory crash, slow startup | 500+ incidents with photos (typical after 6 months on busy site) |
| Syncing entire database on each connection | Simple full-sync logic | Exponentially slower sync, massive battery drain | 1000+ worker records or 200+ incidents with attachments |
| N+1 queries for certification checks | Works fine with 10 workers | Database locks, 5+ second page loads | 200+ workers (medium construction site) |
| Uncompressed photo storage | Fast capture, no processing | 10GB+ app storage, users can't install updates | 500+ incidents with 4 photos each = 2000+ photos @ 5MB each |
| Synchronous validation API calls for every field | Real-time validation UX | 5+ second delays on slow connections, UI jank | Any use on construction site mobile data |
| Linear search through sync queue | Fast for first few items | 30+ second sync times, UI freezes | 100+ pending items in offline queue |
| Full PDF regeneration on each report view | Latest data always included | 10+ second load times, battery drain | Reports with 10+ pages or 5+ photos |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing encryption keys in app code or SharedPreferences | Keys extracted via reverse engineering, all health data exposed | Use Android Keystore/iOS Keychain for key storage; rotate keys periodically |
| Including raw health data in audit logs | Audit logs become high-value target, GDPR violation | Log only UUIDs and actions; never log PII/health data in audit trails |
| No certificate pinning for API | Man-in-the-middle attacks on construction site WiFi networks | Implement certificate pinning; use TLS 1.3 with Perfect Forward Secrecy |
| Allowing screenshot/screen recording of health data | Photos of injuries leaked via screenshots, device screen recording | Disable screenshots in medical record views (FLAG_SECURE on Android) |
| Weak biometric authentication implementation | Spoofed fingerprints, attackers access health records | Use BiometricPrompt with StrongBox requirement; fallback to device credential |
| No session timeout for sensitive views | Unattended device shows health data | Auto-lock after 2 minutes of inactivity on medical record screens |
| Unencrypted cloud backups | Device backups to iCloud/Google Drive expose health data | Disable cloud backup for health database; use encrypted app-controlled backup only |
| Shared device support without multi-user isolation | Worker A can view Worker B's medical records | Require authentication before viewing any health data; no "remember me" for medical views |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring internet for incident capture | Medics can't log incidents on construction sites (no signal), paper forms continue | Full offline capture with background sync |
| Unclear sync status indicators | Users don't know if incident is safely backed up, anxiety and duplicate entries | Multi-modal status: color, label, icon; persistent "3 pending" badge; detailed outbox screen |
| Technical error messages ("Error 500") | Medics don't know what to do, call IT support, waste time | Plain language: "Couldn't upload. No internet." with retry button |
| Complex RIDDOR decision tree UI | Medics avoid RIDDOR reporting due to confusion, compliance failures | Smart auto-flagging with override; show HSE criteria excerpt; progressive disclosure |
| Forcing high-quality photos (slow capture) | Each photo takes 5 seconds to process, medics skip documentation | Allow quick capture of medium-quality images (sufficient for incident docs) |
| No offline visual design feedback | App looks broken when offline (failed loads, empty states), users think it crashed | Offline banner, cached data shown with "Last updated" timestamp, graceful degradation |
| Blocking UI during PDF generation | Medics can't do anything else for 30+ seconds, frustration | Background generation with notification when ready; allow continued work |
| Hidden certification expiry warnings | Medics miss expiry, work with invalid cert, compliance failure | Prominent dashboard badge, block login if critical cert expired, multiple notification channels |
| No bulk operations for site managers | Manager must update 50 workers one-by-one (certification renewal), takes hours | Bulk selection, batch operations, CSV import for certifications |
| Autocomplete suggesting previous injuries | Typing "John" shows "John Smith - fractured arm 2024" exposing medical history in public | Disable autocomplete for medical fields, use ID lookup not name search in public areas |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Offline sync:** Often missing conflict resolution (only happy path tested) — verify concurrent edits, network failures mid-upload, app killed during sync
- [ ] **GDPR compliance:** Often missing audit logging or data retention policies — verify comprehensive access logs, auto-deletion schedules, breach notification workflow
- [ ] **Photo upload:** Often missing background queue (only synchronous tested) — verify upload continues after app backgrounded, retry after failure, resume after partial upload
- [ ] **PDF generation:** Often missing optimization (only tested with 1-page reports) — verify 10-page reports with 8 photos don't crash or timeout
- [ ] **Certification tracking:** Often missing progressive reminders (only single notification) — verify 30-day, 7-day, 1-day warnings sent to multiple recipients
- [ ] **RIDDOR flagging:** Often missing context awareness (simple keyword matching) — verify accuracy against HSE criteria, false positive rate acceptable
- [ ] **Battery optimization:** Often missing WorkManager constraints (runs on mobile data, drains battery) — verify WiFi-only uploads, respects Doze mode, exponential backoff
- [ ] **Encryption:** Often missing key rotation or iOS Keychain integration (keys in code) — verify Android Keystore/iOS Keychain used, keys never in git history
- [ ] **Offline UX:** Often missing failure state communication (errors hidden) — verify failed uploads surfaced prominently, user can retry manually, outbox shows pending items
- [ ] **Audit logging:** Often missing PII filtering (logs raw health data) — verify audit logs contain only UUIDs, no health data in log messages

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Data loss from sync conflicts | HIGH | No automatic recovery; require manual data entry reconstruction; implement conflict resolution for future; communicate transparently with affected users |
| GDPR violation discovered | VERY HIGH | Immediately stop processing if possible; notify DPO and legal; self-report to ICO within 72 hours if breach; implement fix; document corrective actions |
| Unencrypted health data shipped | VERY HIGH | Cannot retroactively encrypt (keys can't be distributed); force app update with encryption; migrate data with user re-authentication; notify ICO of breach |
| Battery drain from poor sync logic | MEDIUM | Ship hotfix update with WorkManager constraints; communicate update to users via in-app message; monitor Play Store reviews for battery complaints |
| PDF generation crashes | LOW | Fall back to server-side generation; cache generated PDFs; queue and retry failed generations; optimize library or switch to lighter alternative |
| Missed RIDDOR deadline | HIGH | Manual submission to HSE with explanation; document incident timeline; implement progressive reminders for future; review all recent incidents for other missed reports |
| Certification expiry not caught | MEDIUM | Immediately flag expired certs; remove affected workers from active duty in system; expedite renewals; implement progressive reminder system |
| Photos too large (storage/upload issues) | MEDIUM | Ship update with image optimization; provide one-time "cleanup" feature to compress existing photos; communicate storage savings to users |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Sync data loss | Phase 1: Foundation | Test concurrent edits, mid-upload failures, app crashes during sync; verify idempotency and conflict resolution |
| GDPR violations | Phase 1: Foundation | Security audit before launch; verify encryption at rest and transit, audit logging functional, data retention policies documented |
| Unclear offline UX | Phase 1: Foundation | User testing with construction site workers; verify sync status always visible, failures communicated clearly |
| Photo upload blocking workflow | Phase 1: Foundation | Test on 2G network speeds; verify background upload functional, UI never blocks on photo operations |
| Battery drain from sync | Phase 1: Foundation | Monitor battery usage with Android Battery Historian; verify WorkManager constraints prevent excessive wakeups |
| RIDDOR flagging issues | Phase 2: Smart Features | Test against 50+ known RIDDOR scenarios from HSE guidance; track false positive/negative rates in production |
| PDF generation performance | Phase 2: Reporting | Stress test: generate 20-page report with 12 photos on 3-year-old Android device; verify <10 second generation time |
| Certification expiry missed | Phase 2: Certification Tracking | Simulate 100+ workers with staggered expiry dates; verify all recipients receive progressive reminders |

---

## Sources

**Offline-First Mobile Apps:**
- [Offline First Apps: Challenges and Solutions | DashDevs](https://dashdevs.com/blog/offline-applications-and-offline-first-design-challenges-and-solutions/)
- [5 critical components for implementing a successful offline-first strategy | Medium](https://medium.com/@therahulpahuja/5-critical-components-for-implementing-a-successful-offline-first-strategy-in-mobile-applications-849a6e1c5d57)
- [Build an offline-first app | Android Developers](https://developer.android.com/topic/architecture/data-layer/offline-first)
- [Offline-First App Guide for Startups | Bright Inventions](https://brightinventions.pl/blog/offline-first-app-guide-for-startups-app-owners-case-studies/)

**Data Sync and Conflict Resolution:**
- [Offline vs. Real-Time Sync: Managing Data Conflicts | Adalo](https://www.adalo.com/posts/offline-vs-real-time-sync-managing-data-conflicts)
- [Implementing Data Sync & Conflict Resolution Offline in Flutter](https://vibe-studio.ai/insights/implementing-data-sync-conflict-resolution-offline-in-flutter)
- [Building Offline Apps: A Fullstack Approach to Mobile Resilience](https://think-it.io/insights/offline-apps)
- [The Complete Guide to Offline-First Architecture in Android](https://www.droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/)

**GDPR Health Data Compliance:**
- [GDPR vs HIPAA: Key Differences & Compliance 2026](https://www.atlassystems.com/blog/gdpr-vs-hipaa)
- [GDPR in Healthcare: A Practical Guide to Global Compliance](https://www.dpo-consulting.com/blog/gdpr-healthcare)
- [GDPR Compliance Checklist for Healthcare](https://drata.com/blog/gdpr-for-healthcare)
- [Health data and the GDPR | Adequacy](https://www.adequacy.app/en/blog/health-data-gdpr-compliance)
- [GDPR Encryption Guide | Data at rest and in transit](https://thecyphere.com/blog/gdpr-encryption/)
- [Data Encryption Requirements 2025: Post-Quantum Protection](https://paperclip.com/data-encryption-requirements-2025-why-data-in-use-protection-is-now-mandatory/)

**RIDDOR Compliance:**
- [Understanding RIDDOR Reporting in Construction Safety | Novade](https://www.novade.net/en/riddor-reporting-timescales/)
- [A Beginner's Guide to RIDDOR for Construction Companies](https://piptfw.co.uk/blogs/news/a-beginners-guide-to-riddor-for-construction-companies)
- [RIDDOR & Risk Assessment 2025: Contractor Manager Guide](https://www.heresafe.com/riddor-risk-assessment-2025-what-every-contractor-manager-needs-to-know/)
- [RIDDOR Reporting Timescales Explained | HASpod](https://www.haspod.com/blog/paperwork/riddor-reporting-timescales-explained)

**Medical Photos and Privacy:**
- [2026 Video Privacy Checklist: Identity Exposure Guard](https://www.secureredact.ai/articles/video-privacy-checklist)
- [GDPR Incident Response Plan: 2026 Guide](https://www.konfirmity.com/blog/gdpr-incident-response-plan)
- [What are the HIPAA Photography Rules? Updated for 2026](https://www.hipaajournal.com/hipaa-photography-rules/)

**Background Sync and Battery Optimization:**
- [Google Play Store to Warn Users of Battery-Draining Apps in 2026](https://www.webpronews.com/google-play-store-to-warn-users-of-battery-draining-apps-in-2026/)
- [These Background Task Patterns Destroy Your App's Battery Life](https://medium.com/@hiren6997/these-background-task-patterns-are-destroying-your-apps-battery-life-cc51318826ff)
- [Optimize battery use for task scheduling APIs | Android Developers](https://developer.android.com/develop/background-work/background-tasks/optimize-battery)
- [Designing a Robust Offline-First Mobile Architecture with Background Sync](https://medium.com/@mkaomwakuni/designing-a-robust-offline-first-mobile-architecture-with-background-sync-a19f7a66b5c3)

**Offline UX and Sync Status:**
- [Offline-first mobile app background sync: UX | AppMaster](https://appmaster.io/blog/offline-first-background-sync-conflict-retries-ux)
- [Design Guidelines for Offline & Sync | Google Open Health Stack](https://developers.google.com/open-health-stack/design/offline-sync-guideline)
- [Offline UX design guidelines | web.dev](https://web.dev/offline-ux-design-guidelines/)
- [Offline Mobile App Design: Challenges and Best Practices](https://leancode.co/blog/offline-mobile-app-design)

**Certification Tracking:**
- [Certification Tracking Software: Top Solutions](https://www.expirationreminder.com/blog/certification-tracking-software-comparing-top-solutions-for-compliance-automation)
- [Certification Tracking: Costs of Expired Training](https://mycomply.net/info/blog/certification-tracking-the-mind-blowing-costs-of-expired-training/)
- [Hidden Costs of Expired Construction Certifications](https://www.builderfax.com/blog/the-hidden-cost-of-expired-certifications-on-construction-projects)

**Medical Audit Trails:**
- [Audit logs and audit trails for digital health applications](https://www.chino.io/post/logs-audit-trails-digital-health-apps)
- [10 Essential Audit Trail Best Practices for 2026](https://signal.opshub.me/audit-trail-best-practices/)
- [Understanding HIPAA Audit Trail Requirements](https://conciergehealthcareattorneysllc.com/blog/hipaa-audit-trail-requirements-what-healthcare-practitioners-need-to-know/)

**GDPR Legal Bases (Consent vs Legitimate Interest):**
- [GDPR Legitimate Interest Explained For Business Owners](https://termly.io/resources/articles/gdpr-legitimate-interest/)
- [Is Employee Consent under EU Data Protection Regulation Possible?](https://www.jacksonlewis.com/insights/employee-consent-under-eu-data-protection-regulation-possible)
- [GDPR in Construction: What You Need to Know](https://www.integrity-software.net/resources-guides/gdpr-in-construction-what-you-need-to-know)

---

*Pitfalls research for: SiteMedic - Medical compliance platform for construction site medics (offline-first, GDPR-compliant, RIDDOR reporting)*

*Researched: 2026-02-15*

*Confidence: HIGH - Based on official GDPR/RIDDOR guidance, Android/iOS official documentation, and 2026 industry best practices*
