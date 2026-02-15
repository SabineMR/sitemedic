# Feature Research

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

## Sources

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
- [Best Safety Inspection App (Updated for 2026)](https://www.compliancequest.com/bloglet/safety-inspection-app/)
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

### Mobile UX & Accessibility
- [Top 7 Healthcare UX/UI Design Trends to Watch in 2026](https://www.excellentwebworld.com/healthcare-ux-ui-design-trends/)
- [Mobile App Accessibility: A Comprehensive Guide (2026)](https://www.accessibilitychecker.org/guides/mobile-apps-accessibility/)

### Automated PDF Report Generation
- [Best Compliance Automation Software: Top 12 Tools in 2026 - Cynomi](https://cynomi.com/learn/compliance-automation-tools/)
- [6 Best Safety Audit Software for OSHA Compliance (2026 Guide)](https://www.v-comply.com/blog/best-osha-compliance-software-safety-audit/)
- [Automate the Generation of Safety Reports in PDF Format Using imPDF REST API](https://impdf.com/blog/automate-the-generation-of-safety-reports-in-pdf-format-using-impdf-rest-api/)

### AI & Predictive Analytics in Construction Safety
- [Artificial Intelligence in Construction Health and Safety: Use Cases, Benefits and Barriers](https://www.mdpi.com/2313-576X/12/1/30)
- [AI Is Transforming Construction Safety, but Implementation May Be the Biggest Risk](https://ohsonline.com/articles/2026/02/10/ai-is-transforming-construction-safety-but-implementation-may-be-the-biggest-risk.aspx)
- [Top Workplace Safety Trends for 2026: AI, Wearables, Digital Twins, and the Future of Risk Management](https://www.vanguardehs.com/articles/top-new-trends-in-workplace-safety-for-2026-what-leading-programs-are-adopting-now)
- [Predictive Analytics in Construction: AI's Role in Risk Management](https://www.kwant.ai/blog/ai-predictive-analytics-construction-risk-management)

### Heat Map Visualization & Safety Dashboards
- [Heat Safety Mapping | Meaning & Definition | Protex AI](https://www.protex.ai/glossary/heat-safety-mapping)
- [Risk visualizations in EHS | Heatmaps & Pathways](https://www.intenseye.com/products-reporting/safety-heatmaps)
- [How to Build a Safety KPI Dashboard? 8 Metrics You Should Include | Databox](https://databox.com/safety-kpi-dashboard)

### Toolbox Talks & Pre-Task Planning
- [Pre-Task Planning Toolbox Talk - Raken](https://www.rakenapp.com/features/toolbox-talks/task-planning)
- [#1 Safety Toolbox Talk App For Construction](https://safelyio.com/toolbox-talk-app/)
- [Top 10 construction toolbox talk software in 2026](https://www.getclue.com/blog/construction-toolbox-talk-software)

### Photo Documentation Best Practices
- [Best Practices for Construction Photo Documentation | OpenSpace](https://www.openspace.ai/blog/best-practices-for-construction-site-photo-documentation-what-to-capture-and-why-it-matters/)
- [Why Construction Photo Documentation is Important - Raken](https://www.rakenapp.com/blog/importance-photo-documentation-construction)
- [On-Site to Office: Using Mobile App Photos for Real-Time Reporting](https://buildern.com/resources/blog/mobile-app-photos/)

### Certification Expiry Alerts
- [Construction Project Management Software | Compliance and Efficiency](https://www.expirationreminder.com/industries/construction-management-software)
- [Certification Tracking Software: Comparing Top Solutions for Compliance & Automation](https://www.expirationreminder.com/blog/certification-tracking-software-comparing-top-solutions-for-compliance-automation)
- [Beyond the Filing Cabinet: Professionalizing Construction Through Mobile Certification Management](https://www.skillsignal.com/beyond-the-filing-cabinet-professionalizing-construction-through-mobile-certification-management/)

### Offline vs Real-Time Trade-offs
- [B2W Mobile Apps: Online & Offline Construction Software](https://www.trimble.com/blog/construction/en-US/article/b2w-apps-keep-mobile-construction-software-working-online-or-offline)
- [Construction Management Software with Offline Access (2026)](https://www.getapp.com/construction-software/construction-management/f/offline-access/)

### Pricing Models
- [2026 Construction Management Software Pricing Guide: 7 Platforms Compared](https://softcircles.com/blog/construction-management-software-pricing-guide-2026)
- [A Complete Guide to Construction Software Pricing Models](https://constructioncoverage.com/construction-software-pricing-models)
- [Construction Software Pricing Guide for Contractors in 2026](https://www.kynection.com.au/construction-software-pricing-guide-for-contractors-2026/)

---
*Feature research for: SiteMedic (Medical Compliance & Construction Safety Management Platform)*
*Researched: 2026-02-15*
*Confidence: HIGH (validated against 50+ industry sources, current regulatory requirements, and competitor platforms)*
