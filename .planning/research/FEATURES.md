# Feature Research

**Domain:** Medical Compliance & Multi-Vertical Medic Compliance Platform
**Researched:** 2026-02-17 (v1.1 addendum — four new verticals)
**Confidence:** MEDIUM–HIGH (regulatory frameworks verified via official sources; specific form field schemas are not publicly standardised for all verticals — noted where LOW confidence)

---

## v1.0 Research (Construction Vertical) — Original File

> See sections below for the original v1.0 feature research on the construction vertical.
> The v1.1 multi-vertical research starts at the section titled "v1.1 Addendum".

---

**Domain:** Medical Compliance & Construction Safety Management Platforms
**Researched:** 2026-02-15
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Incident/Treatment Logging** | Core function of all safety/medical compliance platforms; regulatory requirement under RIDDOR/HSE | MEDIUM | Must support photo attachments, GPS timestamps, offline capture; SiteMedic spec ✓ includes this |
| **Digital Forms with Mobile Capture** | Paper-based systems have 35% higher compliance gap rates; industry standard is mobile-first | MEDIUM | Must work offline; auto-save; large tap targets (48x48pt minimum); SiteMedic spec ✓ includes this |
| **Offline-First Operation** | 78% of reviewers rate offline access as important/highly important; construction sites frequently have zero signal | HIGH | Local storage with background sync; zero data loss requirement; SiteMedic spec ✓ includes this |
| **Photo Evidence Attachment** | Legal/insurance requirement; timestamped photos with GPS are standard for incident documentation | LOW | Auto-timestamp, GPS metadata preservation; SiteMedic spec ✓ includes this |
| **PDF Report Generation** | Required for HSE audits, principal contractors, insurers; must be professional-grade and audit-ready | MEDIUM | Auto-generated weekly reports; SiteMedic spec ✓ includes this |
| **User/Worker Registry** | Need to track who was involved in incidents; certification tracking is compliance requirement | MEDIUM | Emergency contacts, health info, treatment history; SiteMedic spec ✓ includes this |
| **Certification/License Tracking** | CSCS, CPCS, IPAF, Gas Safe expiry tracking is regulatory requirement in UK construction | MEDIUM | Auto-alerts 30/14/7 days before expiry via email/SMS; SiteMedic spec ✓ includes this |
| **Compliance Dashboard** | Site managers consume reports, don't create them; traffic-light visual status is industry standard | MEDIUM | Real-time metrics, filterable views, exportable data; SiteMedic spec ✓ includes this |
| **Automated Alerts/Notifications** | Certification expiry, RIDDOR deadlines require proactive notification to avoid compliance breaches | LOW | Email/SMS for critical events (15-day RIDDOR deadline); SiteMedic spec ✓ includes this |
| **Data Encryption & GDPR Compliance** | UK GDPR mandatory for health data (special category); AES-256 at rest, TLS 1.3 in transit | HIGH | Consent flows, retention policies, UK/EU hosting only; SiteMedic spec ✓ includes this |
| **Checklists/Inspections** | Daily safety checks, pre-shift inspections are standard construction practice | MEDIUM | Template library, customizable, photo capture; SiteMedic spec ✓ includes daily safety snapshot |
| **Digital Signature Capture** | Treatment consent, incident acknowledgment require legally-binding signatures | LOW | Touchscreen signature with timestamp; SiteMedic spec ✓ includes this |

**Analysis:** SiteMedic's MVP spec covers ALL table stakes features. This is validation that the spec was well-researched and market-aligned.

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **RIDDOR Auto-Flagging** | Medics may not know all RIDDOR criteria; intelligent auto-detection reduces compliance risk | MEDIUM | SiteMedic spec ✓ includes this; MAJOR differentiator vs generic safety platforms |
| **Clinical Workflow Integration** | Data capture happens DURING treatment, not as separate admin task; <90 second treatment logging | HIGH | SiteMedic's core value prop; unique vs manager-focused dashboards that require manual data entry |
| **Gloves-On Usability** | 48x48pt tap targets, high-contrast for bright sunlight, one-hand operation for medics working | MEDIUM | Field-specific UX rarely prioritized by competitors; SiteMedic spec ✓ addresses this |
| **AI-Powered Risk Prediction** | Predictive analytics identify high-risk activities before work begins; 40-50% incident reduction reported | HIGH | NOT in SiteMedic MVP; Phase 2+ opportunity; requires historical incident data |
| **Heat Map Visualization** | Visual representation of incident concentration by location/area; pattern identification | MEDIUM | SiteMedic deferred to Phase 2; competitive platforms include this (Procore, HammerTech, Intenseye) |
| **Digital Twin Risk Scoring** | Time-based risk score tracking; emerging 2026 trend in construction safety | HIGH | NOT in SiteMedic MVP; cutting-edge feature requiring AI/ML investment |
| **Automated Compliance Audits** | Scheduled safety audits executed automatically; no regulatory standards overlooked | MEDIUM | NOT in SiteMedic MVP; Phase 2+ opportunity for recurring compliance checks |
| **Toolbox Talk Logger** | Digital pre-task safety meetings with attendance tracking, topic library, sign-offs | LOW | SiteMedic explicitly deferred; nice-to-have but not core compliance value |
| **Multi-Project/Multi-Site Support** | Manage multiple active sites from single dashboard; cross-project analytics | MEDIUM | SiteMedic deferred to scaling phase (MVP is single-site); needed when hiring additional medics |
| **API Access for Integration** | Connect to ERP, payroll, project management systems (Procore integration common) | HIGH | Tier 3/4 subscription feature; SiteMedic deferred until product-market fit |
| **Custom Branding (White-Label)** | Client-facing reports with custom logos, colors for larger contracts | LOW | Tier 3/4 subscription feature; SiteMedic deferred; typical premium upsell |
| **Real-Time Collaboration** | Multiple users see live updates; chat/comment on incidents | MEDIUM | NOT in SiteMedic MVP (offline-first architecture conflicts with real-time); competitors offer this |
| **Video Evidence Capture** | Beyond photos; video recording of hazards, toolbox talks, incident scenes | MEDIUM | NOT in SiteMedic MVP; storage/bandwidth intensive; emerging feature in 2026 platforms |
| **Wearable Integration** | IoT sensors, smart PPE for biometric monitoring, fall detection | HIGH | Emerging 2026 trend; NOT in SiteMedic scope; requires hardware partnerships |

**SiteMedic's Competitive Positioning:**
- **Unique differentiator:** RIDDOR auto-flagging + clinical workflow integration (data capture as byproduct of work, not separate admin)
- **Strong field UX:** Gloves-on usability, offline-first, <90 second logging
- **Deferred differentiators:** Heat maps, AI risk prediction, toolbox talks, multi-project (Phase 2+ opportunities)
- **Emerging tech NOT pursued:** Digital twins, wearables, video (appropriate for bootstrap MVP)

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-Time Sync Everywhere** | "Users want instant updates" | Conflicts with offline-first; requires constant connectivity; increases infrastructure cost; construction sites lack reliable signal | **Offline-first with background sync:** Sync when connectivity available; zero data loss; lower cost; proven approach (78% of users prioritize offline access) |
| **Over-50 Separate Tools** | "We need best-of-breed for each function" | Construction companies average 20-50 systems that don't integrate; siloed data; "death by systems" | **Integrated platform:** Core features in one system; defer integrations until scale (SiteMedic approach) |
| **Unlimited Customization** | "Every client is different" | Leads to complexity, slow deployment, training overhead, support burden | **Opinionated templates:** 80/20 rule—cover common cases well, defer edge cases until validated need |
| **AI for Everything** | "AI will solve our problems" | AI systems can identify so many hazards users can't prioritize ("death by data"); algorithmic opacity; requires quality historical data | **Targeted AI:** RIDDOR auto-flagging (high-value, bounded problem); defer predictive analytics until historical data exists |
| **Mobile Web Instead of Native** | "Works everywhere, one codebase" | Poor offline support; slower; lacks device integrations (camera, GPS); inferior UX for field users | **Native iOS (React Native):** Better offline, camera, GPS; SiteMedic chose this correctly |
| **Build Your Own Forms** | "Users want flexibility" | Analysis paralysis; inconsistent data; hard to report on; training overhead | **Pre-built templates:** RIDDOR, HSE, insurance-aligned forms out-of-box; defer custom forms to Phase 2+ |
| **Real-Time Dashboard Updates** | "Managers want live data" | Conflicts with offline-first architecture; increases server load; marginal value (weekly reports sufficient for compliance) | **Daily/weekly sync:** Meets compliance needs; lower cost; reliable offline operation |
| **Everything in One Screen** | "Users want to see everything at once" | Cognitive overload; poor mobile UX; slow performance | **Task-focused workflows:** <30 seconds minor treatment, <90 seconds full treatment; focus on speed, not density |

**Key Insight:** SiteMedic's MVP avoids all common anti-patterns. Offline-first, opinionated templates, task-focused UX, and bounded AI (RIDDOR auto-flagging) demonstrate strong product discipline.

### Adjacencies (Related Features Not in Scope)

Features common in the ecosystem but outside SiteMedic's focus.

| Feature Category | Examples | Why Adjacent | Implication for SiteMedic |
|------------------|----------|--------------|---------------------------|
| **Project Management** | Scheduling, resource allocation, task tracking (Procore core feature) | SiteMedic is compliance-focused, not project management | Potential integration point (Phase 3+); many competitors integrate WITH Procore rather than replace |
| **Financial/Payroll** | Time tracking, invoicing, cost management | Outside medic/safety domain | Defer; focus on compliance value; if needed, integrate don't build |
| **Equipment/Asset Tracking** | Tool checkout, maintenance logs, asset registry | Common in construction platforms (Tenna, SmartBarrel) | NOT core to medic workflow; defer indefinitely unless clients request |
| **Film/TV Mode** | Same platform, different labels/workflows | SiteMedic targets this market but deferred to Phase 2 | Validate construction market first; add industry modes post-PMF |
| **Training/Certification Delivery** | Online courses, competency testing, certification issuance | SiteMedic TRACKS certifications, doesn't DELIVER training | Partner opportunity; integrate with training providers (Phase 2+) |
| **Document Library** | Safety manuals, MSDS, policies, procedures | Common feature but low MVP priority | SiteMedic deferred to Phase 2; add when clients request |
| **Visitor Management** | Site access, induction, sign-in/out | Construction safety platforms often include this (HammerTech) | NOT in medic workflow; defer unless site managers request |
| **Environmental Monitoring** | Air quality, noise, vibration, temperature | Specialized safety systems; requires IoT sensors | Outside scope; medics don't monitor environment |

**Strategic Implication:** SiteMedic's narrow focus on medic workflow + compliance reporting is correct. Avoid scope creep into project management, financial, or equipment tracking domains where competitors already dominate.

## Feature Dependencies

```
[RIDDOR Auto-Flagging]
    └──requires──> [Treatment Logger] (must capture injury details)
                       └──requires──> [Offline Storage] (construction sites lack connectivity)

[Weekly PDF Report]
    └──requires──> [Treatment Log Data]
    └──requires──> [Near-Miss Log Data]
    └──requires──> [Daily Safety Checklists]
    └──requires──> [Worker Registry] (names for report)

[Certification Expiry Alerts]
    └──requires──> [Worker Registry with Certifications]
    └──requires──> [Email System] (notification delivery)

[Compliance Dashboard]
    └──requires──> [All logging features] (data source)
    └──enhances──> [Weekly PDF Report] (data visualization)

[Offline Mode]
    └──enables──> [Treatment Logger] (zero-latency data entry)
    └──enables──> [Near-Miss Capture]
    └──enables──> [Daily Safety Checklists]
    └──conflicts──> [Real-Time Collaboration] (can't sync without connectivity)

[Photo Evidence]
    └──enhances──> [Treatment Logger]
    └──enhances──> [Near-Miss Capture]
    └──enhances──> [Daily Safety Checklists]
    └──requires──> [Offline Storage] (photos taken on-site)

[Multi-Project Support]
    └──requires──> [Single-Project Mode] (foundation)
    └──increases complexity of──> [Offline Sync] (multiple data streams)
```

### Dependency Notes

- **Offline Mode is foundational:** Treatment logger, near-miss, checklists all depend on offline-first architecture. This validates SiteMedic's decision to build offline-first from day one.
- **Weekly PDF Report is the integration point:** Requires data from ALL logging features. Must be built last in MVP (after all data sources exist).
- **RIDDOR Auto-Flagging depends on Treatment Logger:** Can't auto-flag until treatment details captured. Natural Phase 1 → Phase 2 progression.
- **Real-Time features conflict with Offline-First:** Attempting to add real-time collaboration or live dashboards would create architectural tension. Defer these indefinitely.
- **Multi-Project increases complexity:** Validates SiteMedic's decision to defer multi-project until scaling phase (when hiring additional medics).

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [x] **Treatment Logger** — Core medic workflow; RIDDOR/HSE compliance requirement; <90 second completion target
- [x] **Near-Miss Capture** — HSE compliance; <45 second completion target; photo evidence
- [x] **Daily Safety Checklists** — Standard construction practice; 10 items, <5 minute completion
- [x] **Worker Health Profiles** — Treatment history, emergency contacts, certifications
- [x] **Offline Mode with Auto-Sync** — Construction sites lack connectivity; zero data loss requirement
- [x] **RIDDOR Auto-Flagging** — Unique differentiator; reduces compliance risk
- [x] **Weekly PDF Report** — Core client deliverable; justifies premium pricing
- [x] **Compliance Dashboard** — Traffic-light status; filterable logs; site manager consumption
- [x] **Certification Tracking with Expiry Alerts** — UK construction requirement (CSCS, CPCS, etc.)
- [x] **Digital Signatures** — Treatment consent; legally-binding records
- [x] **UK GDPR Compliance** — Mandatory for health data; encryption, consent, retention policy
- [x] **Email Alerts** — RIDDOR deadlines, certification expiry notifications

**Validation:** SiteMedic's spec includes ALL table stakes features + key differentiators (RIDDOR auto-flag, clinical workflow integration). This is a complete, competitive MVP.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Heat Map Visualization** — Pattern identification; already deferred to Phase 2 in spec
- [ ] **Trend Analysis Charts** — Dashboard analytics; deferred to Phase 2 analytics layer in spec
- [ ] **Toolbox Talk Logger** — Pre-task safety meetings; nice-to-have but not core compliance
- [ ] **Document Library** — Safety manuals, MSDS; add when clients request it
- [ ] **Multi-Project Support** — Needed when scaling to multiple medics/sites
- [ ] **Video Evidence Capture** — Beyond photos; storage-intensive; validate need first
- [ ] **Customizable Report Templates** — Beyond standard weekly PDF; client-specific formats
- [ ] **Bulk Worker Import** — CSV upload for large worker registries; efficiency feature
- [ ] **Advanced Search/Filters** — As data volume grows; incident search by body part, injury type, date range
- [ ] **Automated Compliance Audits** — Recurring safety checks executed automatically

**Trigger for adding:** Client requests + revenue validation. Don't build speculatively.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **AI Risk Prediction** — Requires 12+ months historical data; 40-50% incident reduction potential; high complexity
- [ ] **Film/TV Industry Mode** — Same platform, different labels; validate construction first
- [ ] **Android App** — iOS first; add only if clients demand it
- [ ] **Real-Time Collaboration** — Conflicts with offline-first; marginal value for compliance use case
- [ ] **API Access for Integrations** — Tier 3/4 premium feature; ERP/payroll/Procore integrations
- [ ] **Custom Branding/White-Label** — Premium tier upsell; larger contracts
- [ ] **Digital Twin Risk Scoring** — Cutting-edge 2026 feature; requires ML infrastructure
- [ ] **Wearable/IoT Integration** — Smart PPE, biometrics; requires hardware partnerships
- [ ] **Mobile Web Version** — iOS native only for MVP; web dashboard desktop-only
- [ ] **Training Certification Delivery** — Partner opportunity; outside core compliance focus
- [ ] **Visitor Management** — Site access control; outside medic workflow

**Why defer:** These are either unvalidated opportunities (AI risk prediction), adjacent domains (training delivery), or premium features that require scale (API access, white-label). Focus on core compliance value first.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Regulatory Impact | Priority |
|---------|------------|---------------------|-------------------|----------|
| Treatment Logger | HIGH | MEDIUM | HIGH (RIDDOR/HSE) | P1 |
| Offline Mode | HIGH | HIGH | HIGH (enables field use) | P1 |
| RIDDOR Auto-Flagging | HIGH | MEDIUM | HIGH (compliance risk reduction) | P1 |
| Weekly PDF Report | HIGH | MEDIUM | HIGH (HSE audit requirement) | P1 |
| Certification Tracking | HIGH | MEDIUM | HIGH (UK construction requirement) | P1 |
| Near-Miss Capture | HIGH | LOW | MEDIUM (HSE good practice) | P1 |
| Daily Safety Checklists | MEDIUM | MEDIUM | MEDIUM (industry standard) | P1 |
| Compliance Dashboard | HIGH | MEDIUM | MEDIUM (client deliverable) | P1 |
| Digital Signatures | MEDIUM | LOW | HIGH (legal record) | P1 |
| UK GDPR Compliance | HIGH | HIGH | HIGH (mandatory) | P1 |
| Email Alerts | HIGH | LOW | HIGH (deadline management) | P1 |
| Heat Map Visualization | MEDIUM | MEDIUM | LOW | P2 |
| Trend Analysis Charts | MEDIUM | MEDIUM | LOW | P2 |
| Toolbox Talk Logger | MEDIUM | LOW | LOW | P2 |
| Multi-Project Support | HIGH | HIGH | LOW | P2 |
| AI Risk Prediction | HIGH | HIGH | MEDIUM | P3 |
| Video Evidence | MEDIUM | MEDIUM | LOW | P3 |
| API Access | MEDIUM | HIGH | LOW | P3 |
| Film/TV Mode | MEDIUM | MEDIUM | LOW | P3 |
| Android App | MEDIUM | HIGH | LOW | P3 |
| Real-Time Collaboration | LOW | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for launch (all table stakes + key differentiators)
- P2: Should have, add when possible (validated need + client requests)
- P3: Nice to have, future consideration (unvalidated or premium features)

**Key Insight:** All P1 features are in SiteMedic's MVP spec. The spec is correctly scoped—comprehensive enough to be competitive, focused enough to ship quickly.

## Competitor Feature Analysis

| Feature | Procore | HammerTech | SafetyCulture | SiteMedic MVP | Our Approach |
|---------|---------|------------|---------------|---------------|--------------|
| **Incident Logging** | ✓ Basic | ✓ Advanced | ✓ Basic | ✓ | Clinical detail (RIDDOR-aligned) |
| **Offline Mode** | ✓ | ✓ | ✓ | ✓ | Full offline-first architecture |
| **Mobile App** | ✓ | ✓ | ✓ | ✓ iOS | React Native; iOS first, Android deferred |
| **Photo Evidence** | ✓ | ✓ | ✓ | ✓ | GPS + timestamp metadata |
| **PDF Reports** | ✓ | ✓ | ✓ | ✓ | Auto-generated weekly; HSE audit-ready |
| **Certification Tracking** | ✓ | ✓ | ✓ | ✓ | UK-specific (CSCS, CPCS, IPAF, Gas Safe) |
| **RIDDOR Auto-Flagging** | ✗ | ✗ | ✗ | ✓ | **Unique differentiator** |
| **Clinical Workflow Integration** | ✗ | ✗ | ✗ | ✓ | **Unique differentiator** (<90s logging) |
| **Gloves-On UX** | ✗ | ✗ | ✗ | ✓ | 48x48pt targets, high contrast, one-hand |
| **AI Risk Prediction** | ✓ | ✓ | ✗ | Phase 2+ | Defer until historical data exists |
| **Heat Maps** | ✓ | ✓ | ✓ | Phase 2 | Deferred; validate core first |
| **Toolbox Talks** | ✓ | ✓ | ✓ | Phase 2+ | Deferred; not core compliance |
| **Multi-Project** | ✓ | ✓ | ✓ | Phase 2+ | Deferred to scaling phase |
| **API/Integrations** | ✓ | ✓ Procore | ✓ | Phase 3+ | Premium tier feature |
| **Real-Time Collaboration** | ✓ | ✓ | ✓ | ✗ | Conflicts with offline-first; defer indefinitely |
| **Video Evidence** | ✓ | ✓ | ✓ | Phase 2+ | Validate need first; storage-intensive |
| **Target User** | Manager | Manager | Manager | **Medic** | **Field-first, not manager-first** |
| **Data Entry Model** | Manager inputs | Manager inputs | Manager inputs | **Medic workflow** | **Capture during work, not separate admin** |
| **Pricing Model** | Per user ($60+) | Enterprise | Per user (~$20-50) | Per site + medic service | **Bundled with staffing service** |

**Competitive Analysis:**

1. **SiteMedic's Unique Position:** RIDDOR auto-flagging + clinical workflow integration + field-first UX. Competitors are manager-focused dashboards requiring manual data entry.

2. **Feature Parity on Table Stakes:** SiteMedic matches competitors on all expected features (incident logging, offline, photos, PDFs, certifications).

3. **Strategic Deferrals:** Heat maps, toolbox talks, multi-project, API access are in competitor products but correctly deferred by SiteMedic until core value validated.

4. **Architectural Differences:**
   - SiteMedic: Offline-first, no real-time collaboration (field-optimized)
   - Competitors: Real-time updates (office-optimized)

5. **Business Model Differences:**
   - SiteMedic: Bundled with medic staffing service (data entry embedded)
   - Competitors: Software-only (clients must do data entry)

**Market Positioning:** SiteMedic is NOT competing with Procore/HammerTech on breadth. It's solving a different problem—automatic compliance documentation as a byproduct of medic work, not a separate admin burden. This is a niche the enterprise platforms don't address.

## Regulatory & Compliance Implications

| Feature | Regulatory Driver | Compliance Requirement | SiteMedic Status |
|---------|-------------------|------------------------|------------------|
| **Treatment Logging** | RIDDOR 2013, Health and Safety at Work Act 1974 | All accidents must be recorded in Accident Book (BI 510); 3-year retention | ✓ MVP |
| **RIDDOR Auto-Flagging** | RIDDOR 2013 reporting timelines | Immediate notification for fatal/specified injuries; 15-day deadline for over-7-day incapacitation | ✓ MVP (unique) |
| **Photo Evidence** | Legal/insurance requirements | Timestamped, GPS-tagged photos for incident documentation | ✓ MVP |
| **Digital Signatures** | Legal record requirements | Treatment consent; legally-binding acknowledgment | ✓ MVP |
| **UK GDPR Compliance** | UK GDPR / Data Protection Act 2018 | Health data is "special category"; explicit consent, AES-256 encryption, UK/EU hosting | ✓ MVP |
| **Certification Tracking** | CDM Regulations 2015 | CSCS, CPCS, IPAF, Gas Safe cards required for site access; expiry tracking mandatory | ✓ MVP |
| **Data Retention** | RIDDOR, insurance requirements | Minimum 3-year retention; audit trail for HSE inspections | ✓ MVP (3-year policy) |
| **Offline Mode** | Field operational requirement | Construction sites lack connectivity; zero data loss for legal records | ✓ MVP |
| **PDF Reports** | HSE audit requirements | Professional-grade, audit-ready reports for HSE inspectors, principal contractors, insurers | ✓ MVP |
| **Email Alerts** | RIDDOR reporting deadlines | 15-day deadline for reportable incidents; certification expiry management | ✓ MVP |

**Key Insight:** Every P1 feature in SiteMedic's MVP has a regulatory or legal driver. There are no "nice-to-have" features in the launch scope. This validates the feature prioritization—focused on compliance risk reduction and legal requirements.

---

## v1.1 Addendum — Multi-Vertical Compliance Requirements

**Researched:** 2026-02-17
**Scope:** Four new industry verticals being added to the platform:
1. Film / TV Production (UK)
2. Festivals & Events (UK)
3. Motorsport (UK)
4. Football / Sports (UK)

**Methodology:** Official regulatory bodies (HSE, Motorsport UK, The FA, SGSA, Events Industry Forum/Purple Guide), academic literature (Glastonbury Festival study, PMC), practitioner websites (BASEM, England Football Learning), and UK medical industry sources. Confidence levels noted per claim.

---

## Vertical 1: Film / TV Production (UK)

### Regulatory Framework

**Primary framework: HSE RIDDOR 2013 (the same as construction)**

Film and TV crew — including actors, stunt performers, directors, camera operators, and all other production crew — are legally classified as workers under the Health and Safety at Work Act 1974. The production company (or broadcaster) is the employer/duty holder. RIDDOR 2013 applies in full to all worker injuries on set. This is confirmed by HSE guidance INDG360 ("Health and Safety in Audio-Visual Production: Your Legal Duties"), which states that H&S legislation applies to all work activities including film and TV production and that employers must assess and manage risks and report and investigate accidents.

**Source:** [HSE INDG360 - Health and safety in audio-visual production](https://www.hse.gov.uk/pubns/indg360.pdf) (HIGH confidence — official HSE guidance); [HSE Film, TV and broadcasting page](https://www.hse.gov.uk/entertainment/theatre-tv/film.htm) (HIGH confidence)

**Cast members (actors) as workers:** Actors engaged under a contract of employment or PACT/Equity contract are workers under RIDDOR. A-list talent on studio agreements are also workers when on set. RIDDOR applies to cast injuries on set. (MEDIUM confidence — inferred from RIDDOR 2013 definition of "worker" and HSE guidance that H&S law applies to "all work activities")

**Members of the public:** Non-workers who attend a set (e.g., extras who are casual workers, background artists) — RIDDOR requires reporting their injuries only if they are taken from the scene to hospital. (HIGH confidence — HSE RIDDOR reportable incidents guidance)

**RIDDOR reporting thresholds (applies in full):**
- Deaths: Report immediately by phone to HSE
- Specified injuries (fractures, amputations, loss of sight, etc.): Report within 10 days
- Over-7-day incapacitation injuries: Report within 15 days
- Dangerous occurrences (stunt accidents, pyrotechnic incidents, prop vehicle accidents): Report without delay

### Incident Form Fields

There is no single mandated "on-set incident form" distinct from the standard RIDDOR F2508 process. Production companies typically use the standard RIDDOR HSE online form for reportable incidents, supplemented by their own internal incident records. The medic's internal record (the SiteMedic treatment log) must capture:

| Field | Type | Required | Example Values | Notes |
|-------|------|----------|----------------|-------|
| Incident date | Date | Required | 2026-03-15 | Date of incident |
| Incident time | Time | Required | 14:32 | 24-hour format |
| Production title | Text | Required | "The Crown S7" | The name of the film or TV production |
| Episode / shoot day | Text | Optional | "Ep 4, Day 12" | For TV series; useful for scheduling context |
| Location / set name | Text | Required | "Stage 4, Pinewood Studios" / "Location: Whitby Harbour" | Stage number or on-location address |
| Location type | Select | Required | Studio interior / Location exterior / Remote location | Affects emergency access planning |
| Patient full name | Text | Required | — | GDPR-compliant; stored encrypted |
| Patient role | Select | Required | Cast / Stunt performer / Director / Camera / Grip / Lighting / Art dept / Costume / Other crew | Determines RIDDOR worker status |
| Patient date of birth | Date | Required | — | For medic records; RIDDOR does not require but best practice |
| Production company | Text | Required | — | The duty holder for RIDDOR |
| Mechanism of injury | Text + presets | Required | "Stunt incident", "Fall from set structure", "Pyrotechnic/SFX injury", "Prop/equipment laceration", "Manual handling", "Electrical contact", "Vehicle/stunt vehicle incident", "Overexertion" | Presets from mechanism-presets.ts already built |
| Body part affected | Select (multi) | Required | Standard body part taxonomy | As per existing treatment logger |
| Nature of injury | Select | Required | Laceration, Fracture, Burns, Contusion, Sprain/strain, Concussion, Inhalation, Other | |
| Description of incident | Text (long) | Required | Free text | What happened, how it happened, where exactly |
| Scene / stunt being filmed | Text | Optional | "Car chase scene", "Rooftop sequence" | Context for production's H&S record |
| SFX / pyrotechnic involved | Boolean | Conditional | Yes / No | If yes, triggers additional fields |
| Stunt coordinator present | Boolean | Conditional | Yes / No | Relevant if stunt performer is injured |
| Treatment given | Text + presets | Required | Standard treatment taxonomy | As per existing logger |
| Medications administered | Text | Optional | Drug name, dose, route | |
| Outcome | Select | Required | "Returned to set", "Returned to set — restricted duties", "Sent home", "Referred to GP", "Referred to A&E", "Ambulance called", "Hospitalised" | Vertical-specific labels already in vertical-outcome-labels.ts |
| Witness name(s) | Text | Optional | — | For internal production record |
| RIDDOR reportable flag | Auto-calculated | Display only | Yes / No / Possible | Auto-flagging already built for construction; same logic applies |
| Medic name | Auto-populated | Required | — | Logged-in medic |
| Medic signature | Signature | Required | — | Digital signature |

**Source:** RIDDOR 2013 form F2508 (HIGH confidence); HSE INDG360 (HIGH confidence); premier medics.co.uk article (MEDIUM confidence — practitioner source, not regulatory)

### Certification Types

| Certification | Issuing Body | Typical Expiry | Notes |
|--------------|--------------|----------------|-------|
| HCPC Paramedic registration | Health and Care Professions Council (HCPC) | Annual renewal | Mandatory for all HCPC-registered paramedics on set |
| FREC Level 3 | Qualsafe / RCUK-endorsed providers | 3 years | Minimum qualification for set medics on lower-risk productions |
| FREC Level 4 | Qualsafe / RCUK-endorsed providers | 3 years | Recommended for productions with stunt sequences |
| PHEC (Pre-Hospital Emergency Care) | BASICS / Qualsafe | 3 years | Higher-acuity capability; preferred for high-risk productions |
| PHTLS (Pre-Hospital Trauma Life Support) | NAEMT (National Association of EMTs) | 4 years | Common among film medics; trauma-focused |
| ALS Provider | Resuscitation Council UK (RCUK) | 4 years | Advanced cardiac arrest management |
| ATLS (Advanced Trauma Life Support) | American College of Surgeons / Royal College of Surgeons | 5 years (recert every 3-5 years) | Relevant for productions with high trauma risk (stunts) |
| Enhanced DBS | Disclosure and Barring Service (DBS) | No expiry (updated checks recommended every 3 years) | Required when working with under-18 cast |
| First Aid at Work (FAW) | Ofqual-regulated providers | 3 years | Minimum for low-risk productions |
| Production Safety Passport (Level 2) | ScreenSkills / Mark Milsome Foundation | No fixed expiry (CPD-based) | Demonstrates production safety awareness; valued by production companies |

**Which certifications a set medic typically holds:** HCPC Paramedic (or equivalent RGN/NMC) + FREC 4 or PHEC + PHTLS. For stunt-heavy productions: ATLS is strongly preferred. DBS required when under-18s are cast.

**Source:** [ScreenSkills Production Safety Passport](https://www.screenskills.com/training/production-safety-passport/) (HIGH confidence); [Premier Medics UK Film Set Medic Regulations 2025](https://www.premiermedics.co.uk/news/uk-film-set-medic-regulations-legal-must-knows-for-2025/) (MEDIUM confidence); [MEDIREK set medic qualifications](https://www.medirek.co.uk/event-medical-cover-medical-rescue-first-aid/set-medic-unit-nurse-paramedic-film-tv/) (MEDIUM confidence)

### Terminology Mapping

| Platform Generic Term | Film / TV Equivalent | Notes |
|----------------------|---------------------|-------|
| Worker | Crew member | Cast = actors; Crew = all other production staff |
| Site | Set / Location | "Set" for studio; "Location" for on-location shoots |
| Client | Production company | The commissioning studio or broadcaster |
| Employer | Production company | Duty holder under RIDDOR |
| Incident | On-set incident | No specific industry term; "incident" is standard |
| Incident report | Production incident report | Supplementary to HSE RIDDOR form |
| Shift | Shoot day | Standard film industry term |
| Site manager | Production manager / First AD | First Assistant Director manages on-set safety day-to-day |

### Shared Documents Generated

| Document | What Triggers Generation | Who Receives It | Notes |
|----------|--------------------------|-----------------|-------|
| HSE RIDDOR F2508 (online) | RIDDOR-reportable injury (fracture, amputation, over-7-day incapacitation, dangerous occurrence) | HSE online portal — automatic | Production company is the reporting party; SiteMedic flags, medic/company submits |
| On-Set Incident Report (internal) | Any patient contact | Production company / Safety supervisor / Insurance broker | Internal record; not standardised industry-wide; SiteMedic PDF output |
| End-of-Shift / End-of-Shoot-Day Medical Summary | Daily summary if any treatments occurred | First AD / Production manager | Anonymised count of patient contacts with injury categories; SiteMedic can generate this |
| Patient handover record | When patient is sent to hospital or GP | Receiving medical facility | Standard ambulance handover format (SBAR / MIST); SiteMedic should generate this |
| Medication administration record | Any time a drug is administered | Production company's occupational health records | Legal requirement; must be signed |

**Source:** [Premier Medics "What does a set medic do"](https://www.premiermedics.co.uk/news/what-does-a-film-and-tv-set-medic-do/) (MEDIUM confidence); [Location Medical Services unit medics](https://locationmedical.com/film-tv/unit-medics) (MEDIUM confidence — CQC-regulated provider)

### Anti-Features (Things That Would Be Wrong for This Vertical)

- **Do NOT include CSCS / CPCS / IPAF card tracking** as required certs — these are construction site access cards, not relevant to film/TV.
- **Do NOT use "Site manager" as the primary client contact label** — the correct term is "Production manager" or "First Assistant Director".
- **Do NOT assume RIDDOR does NOT apply** — a common misunderstanding. Film/TV crew are workers; RIDDOR applies in full. The system should flag RIDDOR incidents the same way it does for construction.
- **Do NOT classify "dangerous occurrence" differently** — stunt accidents, SFX/pyrotechnic incidents, and prop vehicle accidents are all RIDDOR "dangerous occurrences" and must be reported even if no one is hurt.
- **Do NOT omit "Stunt performer" as a patient role option** — stunt performers are a distinct category with specific injury patterns and RIDDOR implications.

---

## Vertical 2: Festivals & Events (UK)

### Regulatory Framework

**Primary framework: The Purple Guide to Health, Safety and Welfare at Music and Other Events (Events Industry Forum)**

The Purple Guide is published by the Events Industry Forum and is the definitive industry guidance for UK festivals and live events. It is not statute, but local authority Safety Advisory Groups (SAGs) treat compliance with Purple Guide principles as the benchmark for event licensing. Failure to follow Purple Guide recommendations can result in licence refusal.

**Statutory underpinning:**
- Health and Safety at Work Act 1974 (general duty of care)
- Management of Health and Safety at Work Regulations 1999 (risk assessment)
- Event Licensing Act / Licensing Act 2003 (local authority licensing conditions)
- There is NO separate "festival incident reporting" statutory form analogous to RIDDOR

**RIDDOR applicability for festivals:**
- RIDDOR applies to STAFF and CREW at the event (they are workers under their employment contracts)
- RIDDOR does NOT apply to festival-goers / attendees (members of the public)
- However, if an attendee is injured on the premises, RIDDOR 2013 Reg 5 requires reporting if they are taken to hospital from the scene

**Purple Guide tiered medical provision (2024 update):**
The 2024 Purple Guide moved from prescriptive attendance-based tables to a Medical Needs Assessment (MNA) approach. The five tiers (1–5) provide guidance but the actual provision must be determined by a site-specific MNA. The PHEM (Pre-Hospital Emergency Medicine) grading system is used:

| PHEM Grade | Qualification Level | Notes |
|------------|---------------------|-------|
| PHEM C or below | Generally unsuitable at licensed events | Exception: under direct supervision |
| PHEM D | FREC 3 or equivalent Co-Responder level | Minimum for event first aid |
| PHEM E | FREC 4 or Ambulance Emergency Care Assistant (ECA) | Mid-level event responder |
| PHEM F | Ambulance Technician | Higher acuity responder |
| PHEM G | Registered Doctor, Registered Nurse, or HCPC Registered Paramedic | Clinical lead; required at Tier 4-5 events |

**Source:** [The Purple Guide](https://www.thepurpleguide.co.uk/) (HIGH confidence — official publication); [Event First Aid UK — Purple Guide](https://www.eventfirstaiduk.com/event-medical-cover/purple-guide/) (MEDIUM confidence); [Team Medic — Purple Guide updates](https://www.team-medic.com/blog/purple-guide-medical-cover-updates-impact/) (MEDIUM confidence)

### Incident Form Fields

The Purple Guide does not mandate a specific form. The industry standard is a Patient Report Form (PRF) or Patient Contact Log used by event medical teams. There is no single national standard, but the following fields are consistent across UK event medicine providers (confirmed by multiple sources including Glastonbury Festival academic study, UK event PRF suppliers, and Purple Guide principles):

| Field | Type | Required | Example Values | Notes |
|-------|------|----------|----------------|-------|
| Patient reference number | Auto-generated | Required | EV-2026-001 | Anonymised ID for event reporting |
| Date | Date | Required | 2026-06-28 | |
| Time of contact | Time | Required | 14:47 | When patient presented at medical post |
| Festival / event name | Text | Required | "Glastonbury 2026" | |
| Location of incident | Text | Required | "Pyramid Stage area", "Medical Post 2", "Arena North" | Zone/area on site, not precise GPS |
| Location of medical post | Select | Optional | "Main medical centre", "Mobile unit", "Satellite post" | Where patient was treated |
| Patient age (approximate) | Integer or range | Required | 24 / "20–30" | Exact DOB not always captured for attendees; approximate age acceptable |
| Patient sex | Select | Required | Male / Female / Not specified | |
| Presenting complaint | Text | Required | Free text — chief complaint as stated by patient | |
| Triage category | Select | Required | P1 — Immediate (Red) / P2 — Urgent (Yellow) / P3 — Delayed (Green) / P4 — Deceased (White/Black) | Ten Second Triage (TST) categories rolled out 2024 by NHS Ambulance Services; prior system used SMART/START |
| Mechanism / cause | Text + presets | Required | "Crowd crush", "Fall in crowd", "Intoxication (alcohol)", "Substance-related collapse", "Heat exhaustion", "Stage barrier crush", "Assault", "Hypothermia", "Slip/fall", "Medical — pre-existing condition", "Allergic reaction" | Presets already in mechanism-presets.ts |
| Body part affected | Select (multi) | Optional | Standard body part taxonomy | Not always applicable (e.g., intoxication) |
| Observations recorded | Boolean | Optional | Yes / No | Whether vital signs (BP, HR, SpO2, RR, GCS) were taken |
| Vital signs | Structured | Conditional | BP: 120/80, HR: 92, SpO2: 97%, RR: 18, Temp: 37.2°C, GCS: 15/15 | Required if P1 or P2; document time of each observation |
| Treatment given | Text + presets | Required | Wound dressing, fluid, oxygen, AED, IV access, analgesia, monitoring | |
| Medications administered | Text | Conditional | Drug, dose, route, time | Required if medication given |
| Alcohol / substance involvement | Select | Required | None / Alcohol suspected / Drug suspected / Both / Unknown | Key Purple Guide data point for post-event reporting |
| Safeguarding concern | Boolean | Required | Yes / No | Purple Guide emphasises vulnerable adults and children |
| Outcome / disposition | Select | Required | "Discharged back to event", "Discharged to welfare area — monitoring", "Transported to hospital (ambulance)", "Self-discharged against advice", "Left before treatment complete" | |
| Time of discharge | Time | Required | 15:14 | Enables calculation of length of stay |
| Hospital transported to | Text | Conditional | "Royal United Hospital, Bath" | If transported |
| Attending medic | Auto-populated | Required | — | Logged-in medic |
| Medic signature | Signature | Required | — | |

**Source:** Glastonbury Festival EPR study (Prehospital and Disaster Medicine, 2024) (HIGH confidence — peer-reviewed, Glastonbury uses electronic patient records with these fields); [PMC4753976 — Health care at music festivals](https://pmc.ncbi.nlm.nih.gov/articles/PMC4753976/) (MEDIUM confidence); UK PRF suppliers including MediPrintingUK, Reflex Medical (MEDIUM confidence); Purple Guide 2024 (HIGH confidence for field categories)

**Note on Ten Second Triage (TST):** TST was rolled out across NHS Ambulance Services in 2024 as the new mass casualty triage standard for UK events. It replaces START/SMART. Patients are categorised as P1 (Immediate/Red), P2 (Urgent/Yellow), P3 (Delayed/Green), or P4 (Expectant/White). SiteMedic's festivals incident form should use TST categories. (Source: [Nexus Medical — Introduction of Ten Second Triage](https://nexusmedical.uk/introduction-of-ten-second-triage/) — MEDIUM confidence)

### Certification Types

| Certification | Issuing Body | Typical Expiry | Notes |
|--------------|--------------|----------------|-------|
| FREC Level 3 | Qualsafe / RCS Edinburgh Faculty of Pre-Hospital Care (FPHC) | 3 years | Minimum standard under Purple Guide (PHEM D); only FPHC-endorsed qualification listed in Purple Guide |
| FREC Level 4 | Qualsafe / RCS Edinburgh FPHC | 3 years | Recommended for event medical teams (PHEM E) |
| HCPC Paramedic registration | Health and Care Professions Council (HCPC) | Annual renewal | Required for clinical lead role at Tier 4–5 events (PHEM G) |
| ALS Provider | Resuscitation Council UK (RCUK) | 4 years | Required for PHEM G staff |
| PHTLS | NAEMT | 4 years | Trauma capability for festival medical teams |
| Event Safety Awareness | Various (Qualsafe, CIEH, NCSF) | 3 years | Shows awareness of event H&S; not clinical |
| SIA Door Supervisor | Security Industry Authority (SIA) | 3 years | Required only for security/door staff who provide first aid; NOT required for dedicated medics |
| Enhanced DBS | Disclosure and Barring Service | No expiry (3-year refresh recommended) | Required when working with under-18 attendees or vulnerable adults at festivals |

**Note on IHCD:** IHCD qualifications have largely been replaced by FREC. FREC Level 5 is considered equivalent to the previous IHCD Technician course. If a medic holds an older IHCD qualification, verify currency with the Purple Guide PHEM framework.

**Source:** [North West Medical Solutions — FREC 3](https://www.northwestmedicalsolutions.co.uk/shop/level-3-award-in-first-response-emergency-care-frec-3/) (HIGH confidence); [Event First Aid UK — Purple Guide](https://www.eventfirstaiduk.com/event-medical-cover/purple-guide/) (MEDIUM confidence); Purple Guide 2024 (HIGH confidence)

### Terminology Mapping

| Platform Generic Term | Festivals & Events Equivalent | Notes |
|----------------------|-------------------------------|-------|
| Worker | Festival-goer / Attendee | Staff/crew are workers; public attendees are not |
| Site | Site / Venue | "Site" for greenfield festivals; "Venue" for indoor/arena events |
| Client | Event organiser / Promoter | The festival/event company |
| Employer | Event organiser (for staff) | Festival-goers have no employer relationship |
| Incident | Medical contact / Incident | "Patient contact" is standard Purple Guide terminology |
| Incident report | Event incident report / Patient contact record | No single mandated form name |
| Shift | Shift / Watch | Medical teams work watches/shifts |
| Site manager | Event Medical Coordinator (EMC) | EMC is the Purple Guide-specified role |

### Shared Documents Generated

| Document | What Triggers Generation | Who Receives It | Notes |
|----------|--------------------------|-----------------|-------|
| Patient Contact Log (event log) | Every patient contact | Event Medical Coordinator (EMC) / Event organiser | Aggregated log of all contacts; submitted to organiser after event |
| Post-Event Medical Summary Report | End of event | Event organiser / Local authority (SAG) | Purple Guide recommends this; includes total contacts, hospital transports, presenting complaints breakdown |
| RIDDOR report (HSE F2508) | RIDDOR-reportable staff/crew injury | HSE online portal | Only for staff injuries; not for attendee injuries |
| Patient Report Form (individual PRF) | Each patient contact | Medical archive | Individual patient record; stored securely |
| Hospital handover (MIST/SBAR) | Hospital transport | Receiving A&E department | Standard ambulance handover; medic should have template |
| Major incident log | Mass casualty event | NHS Ambulance Service / Police / Event control | JESIP/METHANE format; rare but must be possible |

### Anti-Features (Things That Would Be Wrong for This Vertical)

- **Do NOT auto-flag RIDDOR for festival-goer (attendee) injuries** — RIDDOR applies only to workers. Attendee injuries are not RIDDOR-reportable unless they die or are taken to hospital.
- **Do NOT omit alcohol/substance field** — this is a key data point for Purple Guide post-event reporting and local authority review.
- **Do NOT use "Worker" as the patient label for attendees** — correct label is "Attendee" or "Festival-goer".
- **Do NOT use "Site manager" for the medical lead** — the correct Purple Guide role is "Event Medical Coordinator" (EMC).
- **Do NOT omit triage category** — Purple Guide emphasises triage and TST for mass-casualty readiness; every patient contact must be triaged.
- **Do NOT use START triage terminology** — TST (Ten Second Triage) replaced START/SMART in UK event medicine in 2024.
- **Do NOT omit safeguarding flag** — Purple Guide 2024 places increased emphasis on safeguarding vulnerable adults and children; this field is mandatory.

---

## Vertical 3: Motorsport (UK)

### Regulatory Framework

**Primary framework: Motorsport UK National Competition Rules (NCR) — Chapter 11 Medical, and FIA Medical Code for international events**

Motorsport UK is the national governing body (ASN) for motorsport in the UK, recognised by the FIA (Federation Internationale de l'Automobile). Their NCR Chapter 11 governs all medical provisions at Motorsport UK-permitted events. FIA medical requirements apply additionally for FIA-grade events (F1, WEC, WRC).

**Statutory basis:**
- Health and Safety at Work Act 1974 (duty of care on promoter/circuit)
- Motorsport UK NCR Chapter 11 Medical (regulatory requirement for permitted events)
- FIA International Sporting Code and Medical Code (for FIA-graded events)

**RIDDOR applicability:**
- RIDDOR applies to WORKERS at the event (circuit staff, marshals who are employed, event organisation staff)
- RIDDOR does NOT apply to competitors (drivers), as they are typically not employees of the circuit
- RIDDOR does NOT apply to spectators

**Key regulatory facts verified:**
- A Motorsport UK accident form must be completed for each and every incident treated (Source: Motorsport UK NCR, confirmed via multiple official pages — HIGH confidence)
- The CMO must complete the "Medical Statistics Sheet" for competitor injuries, entering the injury code and updating the Clerk of the Course (Source: Motorsport UK search results — MEDIUM confidence, form not publicly downloadable)
- If concussion is diagnosed, the CMO must note this on the Medical Statistics Sheet and Motorsport UK will remove the competitor's licence per the Motorsport UK Concussion Policy 2024 (Source: Motorsport UK Concussion Policy 2024 — HIGH confidence)
- The CMO must pass a report to Motorsport UK (via Motorsport UK Steward) detailing the nature of injuries/medical condition for any significant incident (Source: Motorsport UK official pages — HIGH confidence)

**Source:** [Motorsport UK Medical Officials page](https://www.motorsportuk.org/volunteers/officials/medical-officials/) (HIGH confidence — official); [Motorsport UK NCR 2025 Chapter 11](https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/11/Motorsport-UK_NCR-2025-Chapter-11.pdf) (HIGH confidence — official document, though PDF not readable by tool); [Motorsport UK Concussion Policy 2024](https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/04/Motorsport-UK-Concussion-Policy-2024.pdf) (HIGH confidence)

### Incident Form Fields

Motorsport UK uses two forms that SiteMedic must replicate:

**Form A: Motorsport UK Accident Form** (per-incident; required for every treated incident)

| Field | Type | Required | Example Values | Notes |
|-------|------|----------|----------------|-------|
| Event name | Text | Required | "British Touring Car Championship — Brands Hatch" | |
| Circuit / venue | Text | Required | "Brands Hatch GP Circuit" | |
| Event date | Date | Required | 2026-08-10 | |
| Incident time | Time | Required | 13:42 | |
| Incident location on circuit | Text | Required | "Turn 1 / Paddock Hill", "Pit lane", "Paddock area", "Marshals post 7" | Location within the circuit |
| Incident number | Auto-generated | Required | MS-2026-001 | Sequential per event |
| Patient name | Text | Required | — | |
| Patient role | Select | Required | Driver / Co-driver / Rider / Navigator / Marshal / Pit crew / Spectator / Official / Other | Determines RIDDOR applicability and reporting chain |
| Competitor licence number | Text | Conditional | — | Required if patient is a licensed competitor |
| Vehicle number | Text | Conditional | — | If incident involved a vehicle |
| Discipline | Select | Required | Circuit racing / Rallying / Karting / Hillclimb / Autocross / Motorcycle / Other | |
| Nature of incident | Select | Required | Vehicle collision / Rollover / Fire / Medical — no vehicle involved / Off-circuit fall | |
| Mechanism of injury | Text + presets | Required | "Vehicle collision", "Rollover/barrel roll", "Driver extraction", "Circuit/track slip or fall", "Thrown from vehicle", "Burns (fuel/exhaust/friction)", "Head impact/helmet contact", "Motorcycle off" | Presets already in mechanism-presets.ts |
| Nature of injury | Text | Required | Free text description of injury | |
| Injury code | Select | Required | Injury code from Motorsport UK injury classification system | MEDIUM confidence — the specific code list is in Motorsport UK Medical Statistics documentation not publicly available |
| Body part affected | Select (multi) | Required | Standard body part taxonomy | |
| GCS score | Integer | Required | 3–15 | Glasgow Coma Scale; critical for head injuries |
| Vital signs at scene | Structured | Required | HR, BP, SpO2, RR | Document time and values |
| Helmet removed | Boolean | Required | Yes / No | Critical safety note |
| Extrication required | Boolean | Required | Yes / No | |
| Treatment given on circuit | Text | Required | Free text | What was done at the scene |
| Transferred to medical centre | Boolean | Required | Yes / No | |
| Transferred to hospital | Boolean | Required | Yes / No | |
| Hospital name | Text | Conditional | — | If transferred |
| Concussion suspected/diagnosed | Boolean | Required | Yes / No | Triggers licence suspension workflow per Motorsport UK Concussion Policy 2024 |
| Competitor cleared to return to race | Boolean | Required | Yes / No | CMO decision |
| CMO / attending medic name | Text | Required | — | |
| CMO / medic signature | Signature | Required | — | |
| Clerk of the Course notified | Boolean | Required | Yes / No | Regulatory requirement |
| Time of notification | Time | Conditional | — | |

**Form B: Medical Statistics Sheet** (per-event aggregate; completed by CMO)

This is the summary document the CMO submits to the Clerk of the Course and ultimately to Motorsport UK. SiteMedic should auto-populate this from individual accident forms.

| Field | Type | Notes |
|-------|------|-------|
| Event name | Text | |
| Circuit | Text | |
| Date | Date | |
| Total incidents treated | Integer | Count of accident forms |
| Competitor incidents (breakdown by injury code) | Structured | Per-injury-code count |
| Marshal / official incidents | Integer | |
| Spectator incidents | Integer | |
| Hospital transports | Integer | |
| Concussions recorded | Integer | |
| Licences suspended (concussion) | Integer | |
| CMO name and signature | Text + Signature | |

**Source:** Search result extracts from Motorsport UK NCR and regulations (MEDIUM confidence for specific field names — the official forms are not publicly downloadable as readable PDFs; field names inferred from regulatory text describing what must be documented); [Motorsport UK Incident Pack V8.0](https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/03/Incident-Pack-V8.0.pdf) (HIGH confidence for the existence of these forms — PDF was not readable by tool but presence confirmed)

### Certification Types

| Certification | Issuing Body | Typical Expiry | Notes |
|--------------|--------------|----------------|-------|
| GMC Full Registration | General Medical Council (GMC) | Annual (revalidation 5-yearly) | For doctors acting as CMO or Medical Officer; FY1/FY2 doctors cannot act as Medical Officers |
| HCPC Paramedic registration | Health and Care Professions Council (HCPC) | Annual renewal | Mandatory for paramedics at Motorsport UK events |
| Motorsport UK Medical Official Licence | Motorsport UK | Annual | Issued by Motorsport UK; requires GMC or HCPC registration + venue CMO support letter for new applicants |
| Professional Indemnity Insurance (£15m aggregate) | Any approved insurer | Annual | Mandatory for all Motorsport UK Medical Officials |
| PHEC (Pre-Hospital Emergency Care) | BASICS Scotland / Qualsafe | 3 years | Specifically listed as recommended for Motorsport UK Medical Assistants |
| PHTLS | NAEMT | 4 years | Recommended for Motorsport UK Medical Officials and Assistants |
| ALS Provider | Resuscitation Council UK (RCUK) | 4 years | Recommended |
| ATLS | Royal College of Surgeons / American College of Surgeons | 3-5 years | Highly valued for CMO role; trauma capability |
| ATNC (Advanced Trauma Nursing Core) | RCN-endorsed providers | 3 years | Listed as desirable for Medical Assistants |
| APLS (Advanced Paediatric Life Support) | RCUK / APLS group | 4 years | Recommended qualification |
| FIA Grade Medical Officer (Grade 1/2/3) | FIA (for international events) / Motorsport UK | Annual | FIA grades apply to events under FIA jurisdiction (F1, WEC, WRC); Grade 1 = F1 circuit doctor; Grade 2 = medical car/track doctor; Grade 3 = national circuit events |
| Motorsport UK Medical Staff Induction Course | Motorsport UK | N/A — one-time | New medical officials strongly encouraged to attend |

**Source:** [Motorsport UK Medical Officials page](https://www.motorsportuk.org/volunteers/officials/medical-officials/) (HIGH confidence); [SMMC Motorsport Medical Group](https://www.motorsportmedics.org.uk/) (MEDIUM confidence); [D4U Medical — Motorsport Medical](https://d4u.org.uk/motorsport-medical/) (MEDIUM confidence)

### Terminology Mapping

| Platform Generic Term | Motorsport Equivalent | Notes |
|----------------------|----------------------|-------|
| Worker | Competitor / Driver | Drivers are not workers; marshals are volunteers or employed |
| Patient | Competitor / Driver / Marshal / Rider / Co-driver / Navigator | Role matters for regulatory purposes |
| Site | Circuit / Venue | "Circuit" for tarmac racing; "stage" for rally; "track" for motorcycles |
| Client | Promoter / Club | The event organiser holding the Motorsport UK permit |
| Employer | Promoter (for marshals/officials) | Competitors are self-employed or team-contracted |
| Incident | Race incident / Medical incident | "Race incident" if vehicle-related |
| Incident report | Motorsport UK Accident Form | Specific mandated form |
| Aggregate report | Medical Statistics Sheet | Submitted to Clerk of the Course and Motorsport UK |
| Site manager | Clerk of the Course | The senior official responsible for the event |
| Medical lead | Chief Medical Officer (CMO) | Specific title used by Motorsport UK |
| Shift | Race day / Practice / Qualifying | Events are structured around sessions |

### Shared Documents Generated

| Document | What Triggers Generation | Who Receives It | Notes |
|----------|--------------------------|-----------------|-------|
| Motorsport UK Accident Form | Every patient contact | Clerk of the Course (CotC) | Regulatory requirement; one per incident |
| Medical Statistics Sheet | End of event | Clerk of the Course → Motorsport UK Steward → Motorsport UK Medical Dept | CMO completion required |
| Concussion notification | Concussion diagnosis | Motorsport UK Medical Department | Triggers automatic licence suspension; competitor cannot continue racing or drive any vehicle |
| Hospital transport report | When patient sent to hospital | Event Steward; Motorsport UK | Immediate notification required |
| Patient handover (MIST/SBAR) | Hospital transport | Receiving A&E department | |

### Anti-Features (Things That Would Be Wrong for This Vertical)

- **Do NOT omit the GCS field** — Motorsport UK and FIA require GCS documentation for all head/concussion incidents; it is central to return-to-race decisions.
- **Do NOT omit the concussion flag** — the Motorsport UK 2024 Concussion Policy requires immediate licence suspension; this is a regulatory trigger, not optional.
- **Do NOT label the patient as "Worker"** — competitors/drivers are not workers in RIDDOR terms; the label should be "Competitor" or by specific role.
- **Do NOT auto-flag RIDDOR for competitor injuries** — competitors are not employees; RIDDOR does not apply. However, marshal and circuit staff injuries may trigger RIDDOR.
- **Do NOT omit "Clerk of the Course notified" checkbox** — this is a Motorsport UK regulatory obligation; medics must document that the CotC was informed.
- **Do NOT omit "Extrication required" and "Helmet removed"** — these are critical motorsport-specific safety fields affecting cervical spine management documentation.
- **Do NOT use Purple Guide triage categories** — motorsport uses GCS, vital signs, and clinical assessment rather than TST/START triage in individual incidents.
- **Do NOT use FIA Grade terminology as a certification type visible to grassroots event medics** — FIA grades apply only to FIA-permitted events; most UK circuit events are under Motorsport UK NCR only.

---

## Vertical 4: Football / Sports (UK)

### Regulatory Framework

**Primary framework: The Football Association (FA) medical guidelines + Sports Grounds Safety Authority (SGSA) for spectator incidents at licensed grounds**

Football operates under two distinct regulatory tracks that SiteMedic must support simultaneously:

**Track A — Player incidents (on-pitch injuries):**
- Governed by: The Football Association (FA), Premier League, EFL, or relevant National Governing Body (NGB)
- The FA mandates that club medical teams maintain injury records
- The FA Injury and Illness Surveillance Study collects time-loss injuries across English football
- No single statutory form is mandated by the FA for grassroots/amateur clubs, but injury report form templates are provided through England Football Learning
- For professional clubs (Premier League / EFL): the relevant competition rules require detailed injury records and season-end reporting

**Track B — Spectator incidents (crowd medicine at licensed grounds):**
- Governed by: Sports Grounds Safety Authority (SGSA) under the Safety of Sports Grounds Act 1975
- Premier League and EFL Championship clubs (and major grounds including Wembley) must report spectator injuries using the SGSA Standard Medical Incident Report Form
- The SGSA collates and publishes annual spectator injury statistics

**RIDDOR applicability:**
- RIDDOR applies to MATCH DAY STAFF and STEWARDS (employed by the club)
- RIDDOR does NOT apply to player injuries (players are workers but player injuries on the pitch are not "workplace accidents" in the RIDDOR sense — they are sports injuries)
- RIDDSA does apply to spectator hospital transports under RIDDOR 2013 Reg 5 (non-worker hospital transport from premises)

**Note:** This is a nuanced area. A player injuring their knee in a tackle is a sports injury, not a RIDDOR incident. However, if scaffolding collapsed and injured a player, that would be RIDDOR. The medic should not auto-flag player tackle injuries as RIDDOR. (MEDIUM confidence — inferred from RIDDOR 2013 definition and HSE guidance on sporting events)

**Source:** [England Football Learning — Medical courses](https://learn.englandfootball.com/courses/medical) (HIGH confidence — official FA platform); [SGSA medical incident report form](https://sgsa.org.uk/document/medical-incident-report-form/) (HIGH confidence — official SGSA); [SGSA spectator injury statistics](https://sgsa.org.uk/spectator-injuries-at-sports-grounds-data/) (HIGH confidence)

### Incident Form Fields

SiteMedic must support two distinct form types for this vertical:

**Form A: Player / Participant Injury Form** (pitch-side)

| Field | Type | Required | Example Values | Notes |
|-------|------|----------|----------------|-------|
| Date of injury | Date | Required | 2026-04-05 | |
| Time of injury | Time | Required | 78:32 (match time) / 14:47 (clock time) | Both match time and actual clock time useful |
| Match / fixture | Text | Required | "Arsenal v Chelsea, Premier League GW30" | |
| Venue / ground | Text | Required | "Emirates Stadium" | |
| Competition | Select | Required | Premier League / Championship / League 1 / League 2 / National League / Amateur / Youth / Training | |
| Phase of play | Select | Required | Match — first half / Match — second half / Warm-up / Training / Pre-season | |
| Patient name | Text | Required | — | |
| Patient role | Select | Required | Player / Substitute / Manager / Coaching staff / Referee / Physiotherapist | |
| Player squad number | Integer | Optional | 9 | For professional clubs |
| Player position | Select | Optional | Goalkeeper / Defender / Midfielder / Forward | |
| Mechanism of injury | Text + presets | Required | "Contact/collision (sport)", "Head impact/concussion", "Overexertion/muscle strain", "Fall during play or warm-up", "Impact from ball/equipment", "Non-contact — ACL/ligament", "Sudden cardiac event", "Heat exhaustion", "Ligament/joint injury" | Presets already in mechanism-presets.ts for sporting_events |
| Contact / non-contact | Select | Required | Contact with another player / Contact with ground/post / Non-contact (spontaneous) | FA injury surveillance uses this classification |
| Body part affected | Select (multi) | Required | Ankle, Knee, Hamstring, Head, Groin, Shoulder, Calf, Lower back, Wrist, Other | FA Injury Surveillance uses body part taxonomy |
| Diagnosis / nature of injury | Text | Required | Free text or select from taxonomy: Fracture, Ligament sprain, Muscle strain, Tendon injury, Laceration, Concussion, Contusion, Dislocation, Cardiac event, Other | |
| Concussion assessment performed | Boolean | Required | Yes / No | FA requires concussion assessment (Head Injury Assessment — HIA) for suspected concussion; protocol since 2023 |
| HIA outcome | Select | Conditional | Player passed HIA — returned to play / Player failed HIA — stood down | Only if concussion assessment performed |
| Severity (time loss) | Select | Required | Minimal (1–3 days) / Mild (4–7 days) / Moderate (8–28 days) / Severe (>28 days) / Career-ending | FA Injury Surveillance severity classification |
| Treatment given on pitch | Text | Required | Free text | |
| Return to play decision | Select | Required | "Returned to play", "Substituted — fit to continue later", "Stood down from play", "Transported to hospital" | |
| Referred to — | Select | Optional | Own club medical / A&E / GP / Specialist / None | |
| Attending medic / physiotherapist | Auto-populated | Required | — | |
| Medic signature | Signature | Required | — | |

**Form B: Spectator / Crowd Medical Incident Form** (SGSA-aligned, for licensed grounds)

The SGSA Standard Medical Incident Report Form is used by Premier League and EFL clubs. Its fields are defined by the SGSA though the exact PDF is not publicly readable. Based on SGSA published annual statistics and guidance documents, the categories captured include:

| Field | Type | Required | Example Values | Notes |
|-------|------|----------|----------------|-------|
| Date | Date | Required | — | |
| Time of incident | Time | Required | — | |
| Ground / venue | Text | Required | — | |
| Fixture | Text | Required | — | |
| Stand / area | Text | Required | "North Stand Upper", "Away End", "Concourse Level 2" | Location within the ground |
| Patient age (approximate) | Integer or range | Required | — | |
| Patient sex | Select | Required | Male / Female / Not specified | |
| Nature of injury / presenting complaint | Select | Required | Cardiac event / Collapse — non-cardiac / Fracture / Laceration / Medical — existing condition / Alcohol/substance / Fall / Head injury / Crush/crowd / Other | Based on SGSA published statistical categories |
| Treatment given | Text | Required | Free text | |
| First aid given by | Select | Required | Trained first aider / Paramedic / Doctor / Ambulance crew | |
| Outcome | Select | Required | Treated and discharged / Transported to hospital (ambulance) / Self-discharged / No treatment required | |
| Hospital transported to | Text | Conditional | — | |
| Safety officer notified | Boolean | Required | Yes / No | SGSA guidance requires safety officer notification |
| Attending medic | Auto-populated | Required | — | |
| Medic signature | Signature | Required | — | |

**Source:** [SGSA Medical Incident Report Form page](https://sgsa.org.uk/document/medical-incident-report-form/) (HIGH confidence — official SGSA resource); [SGSA Crowd Medical Incidents guidance](https://sgsa.org.uk/document/guidance-on-crowd-related-medical-incidents/) (HIGH confidence); [England Football Learning — FA injury report template](https://learn.englandfootball.com/articles-and-resources/welfare//resources/2023/What-does-medical-and-first-aid-support-look-like-in-football) (MEDIUM confidence — template referenced but not fully reproduced)

### Certification Types

| Certification | Issuing Body | Typical Expiry | Notes |
|--------------|--------------|----------------|-------|
| ATMMiF — Advanced Trauma Medical Management in Football | The Football Association (FA), accredited by RCS Edinburgh FPHC | 3 years | Highest FA medical qualification; required for doctors with primary player management responsibility at professional clubs; mandatory for Premier League/WSL pitch-side doctors |
| ITMMiF — Intermediate Trauma Medical Management in Football | The Football Association (FA), accredited by RCS Edinburgh FPHC | 3 years | Mid-level qualification; required for physiotherapists at professional clubs and medics attending at a higher level of grassroots football |
| EFAiF — Emergency First Aid in Football | The Football Association (FA) | 3 years | Required for all coaches and volunteers with first aid responsibility at grassroots clubs |
| IFAiF — Introduction to First Aid in Football | The Football Association (FA) | 3 years | Entry-level; minimum for grassroots coaches with no dedicated first aider |
| FREC Level 3 | Qualsafe / RCS Edinburgh FPHC | 3 years | Accepted as equivalent to EFAiF/IFAiF at renewal stage |
| FREC Level 4 | Qualsafe / RCS Edinburgh FPHC | 3 years | Accepted as equivalent to ITMMiF |
| ATLS | Royal College of Surgeons / American College of Surgeons | 3-5 years | Accepted as equivalent to ATMMiF-level trauma training; required for professional club doctors |
| PHTLS | NAEMT | 4 years | Accepted as equivalent for renewal purposes |
| HCPC Paramedic | Health and Care Professions Council (HCPC) | Annual | For paramedics on club medical teams |
| GMC Registration | General Medical Council (GMC) | Annual (revalidation 5-yearly) | For club doctors |
| ALS Provider | Resuscitation Council UK (RCUK) | 4 years | Required for professional medical staff |
| BASEM / Sports Medicine membership | British Association of Sport and Exercise Medicine (BASEM) | Annual | Professional body membership; indicates specialism but is not a regulatory certification |
| UEFA Football Doctor Education Programme (UEFA FDEP) | UEFA | — | For doctors at UEFA-regulated competitions |
| FA Concussion Module (online) | The Football Association (FA) | Annual | Mandatory addition to ATMMiF since August 2024 for Premier League/WSL pitch-side staff |
| Enhanced DBS | Disclosure and Barring Service | No expiry (3-year refresh recommended) | Required for all medical staff working with under-18 players |

**Source:** [England Football Learning ATMMiF page](https://learn.englandfootball.com/courses/medical/advanced-trauma-medical-management-in-football) (HIGH confidence — official FA); [England Football Learning ITMMiF page](https://learn.englandfootball.com/courses/medical/intermediate-trauma-medical-management-in-football) (HIGH confidence); [England Football Learning accepted non-FA courses](https://learn.englandfootball.com/courses/medical/accepted-non-fa-medical-courses) (HIGH confidence); [BASEM](https://basem.co.uk) (MEDIUM confidence)

### Terminology Mapping

| Platform Generic Term | Football / Sports Equivalent | Notes |
|----------------------|------------------------------|-------|
| Worker | Player / Participant | Players are workers in employment law but on-pitch injuries are not RIDDOR incidents |
| Patient | Player / Athlete | "Player" for football; "Athlete" for other sports |
| Site | Ground / Pitch | "Ground" = the whole venue; "Pitch" = the playing surface |
| Client | Club / Football Club | The employing entity |
| Employer | Club | Players are employed by the club |
| Incident | Injury / Match day incident | "Injury" for player incidents; "incident" for spectator contacts |
| Incident report | Match day injury report / FA injury form | Two separate forms needed |
| Aggregate report | Season injury log / Annual injury audit | Clubs submit to FA for surveillance |
| Site manager | Safety officer | SGSA-designated role at licensed grounds |
| Medical lead | Club doctor / Team physician | "Club doctor" is universal; "Team physician" at higher levels |
| Shift | Match day | "Match day" is universal football terminology |

### Shared Documents Generated

| Document | What Triggers Generation | Who Receives It | Notes |
|----------|--------------------------|-----------------|-------|
| Match Day Injury Form | Each player injury | Club medical records / Club doctor / Head of medical | Internal; FA expects records to be kept |
| SGSA Medical Incident Report | Each spectator/crowd medical contact at licensed ground | Club Safety Officer → SGSA (annual aggregation) | Mandatory for Premier League / EFL Championship clubs |
| RIDDOR Report | RIDDOR-reportable injury to match day staff/steward | HSE online portal | NOT for player injuries; for employed staff only |
| Season Injury Log / Audit | End of season | The FA (for clubs in FA surveillance study) | Annual aggregate injury data; submitted to FA research programme |
| Hospital handover | Any patient transported to hospital | Receiving A&E | SBAR/MIST format |
| Concussion record / HIA form | Suspected concussion | Club records / Competition medical officer | Must be retained; governs return-to-play protocol |

### Anti-Features (Things That Would Be Wrong for This Vertical)

- **Do NOT auto-flag player on-pitch injuries as RIDDOR** — tackle injuries, sprains, and muscle strains during play are not RIDDOR incidents. RIDDOR applies only to structural/environmental workplace incidents (scaffolding collapse, etc.) affecting workers.
- **Do NOT merge the player form and the spectator form** — these are fundamentally different documents for different patients with different regulatory frameworks (FA vs SGSA).
- **Do NOT use "Attendee" as the patient label for players** — correct label is "Player" or "Athlete".
- **Do NOT omit the Head Injury Assessment (HIA) / concussion field** — the FA's concussion protocol has specific return-to-play rules; documenting the assessment outcome is a regulatory obligation at professional level.
- **Do NOT omit "phase of play"** — FA injury surveillance specifically distinguishes match injuries from training injuries; this is a required field for clubs participating in FA data.
- **Do NOT omit "contact/non-contact" classification** — this is a core FA Injury Surveillance field used nationally.
- **Do NOT call the report form "Purple Guide"** — the Purple Guide does not apply to football. Football uses FA guidelines for players and SGSA standards for spectators.

---

## Cross-Vertical Comparison Table

| Aspect | Film / TV | Festivals & Events | Motorsport | Football / Sports |
|--------|-----------|-------------------|------------|-------------------|
| **Regulatory framework** | HSE RIDDOR 2013 | Purple Guide (EIF) | Motorsport UK NCR Ch.11 + FIA | FA guidelines + SGSA |
| **RIDDOR for patients?** | YES (all crew are workers) | NO (attendees) / YES (staff) | NO (competitors) / YES (marshals) | NO (players) / YES (match staff) |
| **Incident form name** | Production Incident Report | Event Patient Report Form | Motorsport UK Accident Form | Match Day Injury Form / SGSA MIR |
| **Aggregate report** | End-of-shoot medical summary | Post-event medical summary | Medical Statistics Sheet | Season injury log / SGSA annual data |
| **Patient label** | Cast member / Crew member | Attendee / Festival-goer | Competitor / Driver | Player / Athlete |
| **Location label** | Set / Location | Site / Venue | Circuit / Track | Ground / Pitch |
| **Client label** | Production company | Event organiser | Promoter / Club | Football club |
| **Medical lead label** | Production manager / First AD | Event Medical Coordinator (EMC) | Chief Medical Officer (CMO) | Club doctor |
| **Key unique field** | Stunt coordinator present / SFX involved | Alcohol/substance involvement / Triage (TST) | GCS score / Extrication required / Concussion flag → licence suspension | Phase of play / Contact vs non-contact / HIA outcome |
| **Triage system** | RIDDOR severity (clinical judgement) | Ten Second Triage (TST) — P1/P2/P3/P4 | GCS + clinical assessment (no population triage) | Clinical assessment (no population triage) |
| **Minimum medic cert** | FREC 4 / HCPC Paramedic | FREC 3 (PHEM D) | HCPC Paramedic or GMC Doctor + Motorsport UK licence | EFAiF (grassroots) / ATMMiF (professional) |
| **Unique regulatory trigger** | Dangerous occurrence reporting (stunts, SFX) | Post-event summary to SAG/local authority | CMO report to Motorsport UK; licence suspension for concussion | FA Injury Surveillance submission |

---

## v1.1 Sources

### Film / TV Production
- [HSE — Film, TV and broadcasting](https://www.hse.gov.uk/entertainment/theatre-tv/film.htm) (HIGH confidence — official HSE)
- [HSE INDG360 — Health and safety in audio-visual production](https://www.hse.gov.uk/pubns/indg360.pdf) (HIGH confidence — official HSE guidance)
- [HSE RIDDOR reportable incidents](https://www.hse.gov.uk/riddor/reportable-incidents.htm) (HIGH confidence — official HSE)
- [Premier Medics — UK Film Set Medic Regulations 2025](https://www.premiermedics.co.uk/news/uk-film-set-medic-regulations-legal-must-knows-for-2025/) (MEDIUM confidence — practitioner source)
- [Premier Medics — What does a film and TV set medic do](https://www.premiermedics.co.uk/news/what-does-a-film-and-tv-set-medic-do/) (MEDIUM confidence)
- [MEDIREK — Unit medic for film or TV](https://www.medirek.co.uk/event-medical-cover-medical-rescue-first-aid/set-medic-unit-nurse-paramedic-film-tv/) (MEDIUM confidence — CQC-regulated provider)
- [Location Medical Services — Unit medics](https://locationmedical.com/film-tv/unit-medics) (MEDIUM confidence — CQC-regulated provider)
- [ScreenSkills — Production Safety Passport](https://www.screenskills.com/training/production-safety-passport/) (HIGH confidence — official ScreenSkills)
- [Team Medic — TV Film Medical Support](https://www.team-medic.com/event-patient-medical-services/tv-film-medical-support/) (LOW confidence — marketing content)

### Festivals & Events (Purple Guide)
- [The Purple Guide — Events Industry Forum](https://www.thepurpleguide.co.uk/) (HIGH confidence — official publication)
- [Event First Aid UK — Purple Guide](https://www.eventfirstaiduk.com/event-medical-cover/purple-guide/) (MEDIUM confidence)
- [Team Medic — Purple Guide updates 2024/2025](https://www.team-medic.com/blog/purple-guide-medical-cover-updates-impact/) (MEDIUM confidence)
- [Nexus Medical — Introduction to Ten Second Triage (TST) 2024](https://nexusmedical.uk/introduction-of-ten-second-triage/) (MEDIUM confidence)
- [Glastonbury Festival: Medical Care at the World's Largest Greenfield Music Festival — Prehospital and Disaster Medicine 2024 (PMC11035920)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11035920/) (HIGH confidence — peer-reviewed)
- [Health care in a unique setting: applying emergency medicine at music festivals (PMC4753976)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4753976/) (HIGH confidence — peer-reviewed)
- [North West Medical Solutions — FREC 3 and Purple Guide](https://www.northwestmedicalsolutions.co.uk/shop/level-3-award-in-first-response-emergency-care-frec-3/) (MEDIUM confidence)
- [Marches Ambulance — Purple Guide Medical Needs Assessment](https://marchesambulance.co.uk/purple-guide-medical-needs-assessment/) (MEDIUM confidence)

### Motorsport
- [Motorsport UK — Medical Officials](https://www.motorsportuk.org/volunteers/officials/medical-officials/) (HIGH confidence — official Motorsport UK)
- [Motorsport UK — NCR 2025 Chapter 11 Medical](https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/11/Motorsport-UK_NCR-2025-Chapter-11.pdf) (HIGH confidence — official document)
- [Motorsport UK — Concussion Policy 2024](https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/04/Motorsport-UK-Concussion-Policy-2024.pdf) (HIGH confidence — official document)
- [Motorsport UK — Incident Pack V8.0 (2025)](https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/03/Incident-Pack-V8.0.pdf) (HIGH confidence — existence confirmed; content not extractable from PDF)
- [Motorsport UK — Chapter 5A Appendix 11 Emergency and Medical Officials (2025)](https://motorsportuk.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/08/Chapter-5A-Appendix-11-Emergency-and-Medical-Officials.pdf) (HIGH confidence — official document; PDF not extractable)
- [SMMC Motorsport Medical Group](https://www.motorsportmedics.org.uk/) (MEDIUM confidence)
- [FIA Medical requirements](https://www.fia.com/medical) (HIGH confidence — official FIA)

### Football / Sports
- [England Football Learning — Medical courses](https://learn.englandfootball.com/courses/medical) (HIGH confidence — official FA)
- [England Football Learning — ATMMiF course page](https://learn.englandfootball.com/courses/medical/advanced-trauma-medical-management-in-football) (HIGH confidence — official FA)
- [England Football Learning — ITMMiF course page](https://learn.englandfootball.com/courses/medical/intermediate-trauma-medical-management-in-football) (HIGH confidence — official FA)
- [England Football Learning — Accepted non-FA medical courses](https://learn.englandfootball.com/courses/medical/accepted-non-fa-medical-courses) (HIGH confidence — official FA)
- [England Football Learning — Medical support in football article](https://learn.englandfootball.com/articles-and-resources/welfare//resources/2023/What-does-medical-and-first-aid-support-look-like-in-football) (HIGH confidence — official FA)
- [SGSA — Medical incident report form](https://sgsa.org.uk/document/medical-incident-report-form/) (HIGH confidence — official SGSA)
- [SGSA — Guidance on crowd-related medical incidents](https://sgsa.org.uk/document/guidance-on-crowd-related-medical-incidents/) (HIGH confidence — official SGSA)
- [SGSA — Spectator injury statistics 2024-25](https://sgsa.org.uk/spectator-injuries-at-sports-grounds-data/) (HIGH confidence — official SGSA)
- [BASEM — Sports Pre-Hospital Immediate Care Courses](https://basem.co.uk/sports-pre-hospital-immediate-care-courses/) (MEDIUM confidence)
- [Football Medicine and Performance Association (FMPA)](https://www.fmpa.co.uk/) (MEDIUM confidence)

---

## v1.0 Sources (Construction Vertical)

### Construction Safety Management Software
- [Procore Construction Management Software](https://www.procore.com/quality-safety)
- [The 7 Best Construction Safety Inspection Software in 2026](https://www.xenia.team/articles/best-construction-safety-inspection-software)
- [8 Best Construction Safety Software for 2026](https://www.compliancequest.com/bloglet/best-construction-safety-software/)
- [Construction Safety Software & Compliance Solutions | HammerTech](https://www.hammertech.com/en-us/)
- [Top 7 Construction Safety Software of 2025 | SafetyCulture](https://safetyculture.com/apps/construction)
- [Procore + HammerTech: The Future of Connected Safety in Construction](https://www.hammertech.com/en-us/blog/procore-hammertech-construction-safety-integration)
- [7 Best HammerTech Alternatives for Construction Safety](https://www.kynection.com.au/7-best-hammertech-alternatives-for-construction-safety-project-compliance/)

### Occupational Health Compliance Platforms (UK)
- [Integrated Occupational Health System | iOH Portal](https://www.tachealthcare.com/ioh-system)
- [Apollo Professional | Occupational Health Software](https://apollopro.co.uk/)
- [Civica Occupational Health Software](https://www.civica.com/en-gb/product-pages/occupational-health-software/)

### RIDDOR Incident Reporting
- [RIDDOR compliance software for workplace incident reporting](https://www.ideagen.com/regulations/riddor)
- [RIDDOR Accident and Incident Reporting | Simple Guide](https://opsbase.com/riddor-accident-incident-reporting/)
- [Understanding RIDDOR Reporting in Construction Safety](https://www.novade.net/en/riddor-reporting-timescales/)
- [Navigating RIDDOR Regulations & incident reporting with Novade](https://www.novade.net/en/navigating-riddor-regulations-better-way-manage-riddor-incident-reporting/)

### Healthcare Compliance & Field Documentation
- [Best HIPAA Compliance Tools in 2026 for Healthcare & MSPs](https://www.complyassistant.com/hipaa-compliance-software/best-hipaa-compliance-tools/)
- [5 Best Healthcare Document Management Software in 2026](https://connecteam.com/best-healthcare-document-software/)
- [10 best healthcare compliance software solutions for 2026 | The Jotform Blog](https://www.jotform.com/blog/healthcare-compliance-software/)

### Offline-First Mobile Apps
- [Top 5 EHS Apps to Ensure Workplace Safety in 2026](https://goaudits.com/blog/best-ehs-apps/)
- [Best Safety Inspection App (Updated for 2026)](https://www.compliancequest.com/bloglet/best-construction-safety-software/)
- [EHS Inspection App - HammerTech Inspect](https://www.hammertech.com/en-us/product/hammertechinspect)

### Worker Certification Tracking
- [Construction Certificate Tracker | Corfix](https://www.corfix.com/certificate-tracker-software-lp/)
- [Certification Management Software for Construction: 5 Key Benefits - myComply](https://mycomply.net/info/blog/certification-management-software/)
- [Safety Training & Skills Tracking Software | HCSS](https://www.hcss.com/products/safety-training-certification-tracking/)
- [Certification Management Software - Raken](https://www.rakenapp.com/features/certification-management)

### First Aid Record Keeping (UK)
- [First Aid Requirements for Workplaces (UK Guide 2026) - PracticalFirstAid](https://practicalfirstaid.co.uk/first-aid-requirements-for-workplaces/)
- [Being First Aid Compliant in the UK: A Guide to Legislation & Law](https://www.growsafetytraining.co.uk/post/being-first-aid-compliant-in-the-uk-a-guide-to-legislation-law)
- [First Aid Documentation Explained (Policies, Records and Evidence – UK Guide)](https://firstaidkitsuk.co.uk/blogs/guides/first-aid-documentation-explained-uk)
- [Legislation - HSE](https://www.hse.gov.uk/firstaid/legislation.htm)

### Construction Safety Software Anti-Patterns
- [5 Costly Digital Mistakes Construction Companies Are Making in 2026 | Sesame Technologies](https://www.sesametechnologies.net/blog/construction-digital-mistakes-2026/)
- [How Reliable Construction Management Software Prevents Chaos 2026](https://diligentic.com/blog/construction-management-software)

---
*Feature research for: SiteMedic (Medical Compliance & Multi-Vertical Medic Platform)*
*v1.0 researched: 2026-02-15 | v1.1 multi-vertical addendum: 2026-02-17*
*v1.0 Confidence: HIGH | v1.1 Confidence: MEDIUM–HIGH (regulatory frameworks HIGH; specific form schemas MEDIUM where not publicly standardised)*
