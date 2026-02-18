# Requirements: SiteMedic v2.0 — Multi-Vertical Platform Expansion

**Defined:** 2026-02-17
**Core Value:** Documentation happens automatically as the medic does their job, not as separate admin work.

## v2.0 Requirements

### VERT — Vertical Infrastructure

Core plumbing that all four new verticals depend on. Must ship before any vertical goes live.

- [x] **VERT-01**: RIDDOR auto-flagging only triggers when the active vertical has `riddorApplies: true` — festival-goers, motorsport competitors, and football players on-pitch never produce false RIDDOR flags
- [x] **VERT-02**: WatermelonDB v4 schema adds `vertical_id`, `booking_id`, `patient_type`, `gps_lat`, `gps_lng` to the treatments table (all nullable, single coordinated migration)
- [x] **VERT-03**: Mobile app fetches active vertical once at login via OrgContext — treatment form does not call Supabase on every mount to determine vertical
- [x] **VERT-04**: Booking-level vertical override is read by the mobile treatment form — a motorsport booking at a construction org shows motorsport presets, not construction presets
- [x] **VERT-05**: Admin can set a default vertical for their organisation in the org settings page
- [x] **VERT-06**: Client can select event type / vertical when creating a booking — the booking's `event_vertical` field is set at booking creation

### FILM — Film/TV Production Vertical

- [x] **FILM-01**: Film/TV incident form includes production-specific fields: Production Title, Patient Role (Cast / Stunt Performer / Crew), and SFX / Pyrotechnic Involved flag
- [x] **FILM-02**: App terminology switches to Film/TV context when vertical is active: "Cast & Crew" replaces "Worker", "Set" replaces "Site", "Production" replaces "Client"
- [x] **FILM-03**: Medic profile shows Film/TV-relevant cert types: HCPC registration, ScreenSkills Production Safety Passport, FREC 4 / EFR
- [x] **FILM-04**: RIDDOR auto-flagging remains active for Film/TV (crew are workers under HSE) — existing RIDDOR pipeline used with no changes to flagging logic

### FEST — Festivals & Events Vertical

- [x] **FEST-01**: Festival incident form captures TST triage category (P1 / P2 / P3 / P4) as a required field replacing standard outcome severity
- [x] **FEST-02**: Festival incident form includes Alcohol/Substance flag and Safeguarding concern flag
- [x] **FEST-03**: RIDDOR auto-flagging is disabled for festival-goer patients (Purple Guide framework, not HSE RIDDOR)
- [x] **FEST-04**: App terminology switches to events context: "Attendee" replaces "Worker", "Venue" replaces "Site", "Organiser" replaces "Client"
- [x] **FEST-05**: Medic profile shows events-relevant cert types: FREC 3 (minimum), IHCD Ambulance Aid, EFR
- [x] **FEST-06**: Festival incidents generate a Purple Guide–style event incident report PDF for the event organiser

### MOTO — Motorsport Vertical

- [x] **MOTO-01**: Motorsport incident form captures Motorsport UK Accident Form fields: GCS score, extrication required, helmet removed, concussion flag, competitor cleared to return to race
- [x] **MOTO-02**: Per-event Medical Statistics Sheet is generated automatically at end of event — aggregate of all incident records from that booking
- [x] **MOTO-03**: When concussion is flagged, the system triggers a licence suspension notification workflow — admin is alerted and a notification record is created for submission to Motorsport UK
- [x] **MOTO-04**: RIDDOR auto-flagging is disabled for motorsport competitor patients
- [x] **MOTO-05**: App terminology switches to motorsport context: "Competitor" replaces "Worker", "Circuit / Paddock" replaces "Site", "Organiser" replaces "Client"
- [x] **MOTO-06**: Medic profile shows motorsport-relevant cert types: Motorsport UK Medical Official Licence, ATLS, BASM
- [x] **MOTO-07**: Motorsport incidents generate a Motorsport UK–style Accident Form PDF per incident

### FOOT — Football / Sports Vertical

- [x] **FOOT-01**: Football incident form prompts medic to select patient type at start: Player or Spectator — form fields then differ based on selection
- [x] **FOOT-02**: Player incident form captures FA-aligned fields: Phase of Play, Contact / Non-Contact, HIA Concussion Assessment outcome, FA severity classification
- [x] **FOOT-03**: Spectator incident form captures SGSA-aligned fields: stand location, medical referral outcome, safeguarding flag
- [x] **FOOT-04**: RIDDOR auto-flagging is disabled for player on-pitch injuries (players are not workers under RIDDOR)
- [x] **FOOT-05**: App terminology switches to football context: "Player" replaces "Worker", "Pitch / Ground" replaces "Site", "Club" replaces "Client"
- [x] **FOOT-06**: Medic profile shows football-relevant cert types: ATMMiF (FA), ITMMiF (FA), FA Advanced Trauma Management
- [x] **FOOT-07**: Football incidents generate the appropriate PDF — FA incident report for player injuries, SGSA medical incident report for spectator injuries

### ANLT — Analytics: Heat Maps & Trend Charts

- [x] **ANLT-01**: Near-miss heat map visible on the org dashboard — GPS-clustered near-miss incidents plotted on a Leaflet map using CircleMarker (leaflet.heat incompatible with react-leaflet@5), filtered to the current org
- [x] **ANLT-02**: Near-miss heat map visible on the platform admin dashboard — aggregate across all orgs, with org colour-coding
- [x] **ANLT-03**: Compliance scores are persisted to a `compliance_score_history` table weekly (upsert from the existing weekly report Edge Function)
- [x] **ANLT-04**: Compliance score trend chart on the org dashboard — weekly score plotted over the last 12 months using Recharts (already installed)
- [x] **ANLT-05**: Incident frequency trend chart on the org dashboard — treatment + near-miss counts per week over the last 12 months
- [x] **ANLT-06**: Platform admin sees aggregate compliance trend across all orgs and top/bottom performing orgs by compliance score

## Future Requirements (v2.1+)

### Multi-Project Support
- **PROJ-01**: Medic can be assigned to multiple simultaneous bookings (multi-site support)
- **PROJ-02**: Dashboard shows all active bookings for an org in one view

### Android App
- **ANDR-01**: React Native app builds and ships for Android (Google Play)

### Tier 3/4 Premium Features
- **TIER-01**: Custom org branding (logo, colours) in PDF reports
- **TIER-02**: API access for ERP / payroll integrations (Procore, SAP)
- **TIER-03**: Cross-project analytics (aggregate compliance across all an enterprise client's sites)

### Motorsport Concussion (Extended)
- **MOTO-EXT-01**: Direct Motorsport UK API integration for automated licence suspension submission (v2.0 creates notification record; v2.1+ submits directly)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Android app | iOS-first; build only if clients explicitly demand it |
| Document library | No client demand yet; add when requested |
| Toolbox Talk Logger | Nice-to-have, not core compliance value |
| Real-time WebSocket sync | Offline-first architecture; polling sufficient |
| AI risk prediction | Requires 12+ months data; defer to v3.0 |
| Wearable / IoT integration | Emerging tech; defer to v3.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VERT-01 | Phase 18 | Complete |
| VERT-02 | Phase 18 | Complete |
| VERT-03 | Phase 18 | Complete |
| VERT-04 | Phase 18 | Complete |
| VERT-05 | Phase 18 | Complete |
| VERT-06 | Phase 18 | Complete |
| CONST-01 | Phase 18.5 | Complete |
| CONST-02 | Phase 18.5 | Complete |
| CONST-03 | Phase 18.5 | Complete |
| FILM-01 | Phase 21 | Complete |
| FILM-02 | Phase 21 | Complete |
| FILM-03 | Phase 21 | Complete |
| FILM-04 | Phase 21 | Complete |
| FEST-01 | Phase 20 | Complete |
| FEST-02 | Phase 20 | Complete |
| FEST-03 | Phase 20 | Complete |
| FEST-04 | Phase 20 | Complete |
| FEST-05 | Phase 20 | Complete |
| FEST-06 | Phase 20 | Complete |
| MOTO-01 | Phase 19 | Complete |
| MOTO-02 | Phase 19 | Complete |
| MOTO-03 | Phase 19 | Complete |
| MOTO-04 | Phase 19 | Complete |
| MOTO-05 | Phase 19 | Complete |
| MOTO-06 | Phase 19 | Complete |
| MOTO-07 | Phase 19 + Phase 23 (gap closure 23-06) | Complete |
| FOOT-01 | Phase 22 | Complete |
| FOOT-02 | Phase 22 | Complete |
| FOOT-03 | Phase 22 | Complete |
| FOOT-04 | Phase 22 | Complete |
| FOOT-05 | Phase 22 | Complete |
| FOOT-06 | Phase 22 | Complete |
| FOOT-07 | Phase 22 | Complete |
| ANLT-01 | Phase 23 | Complete |
| ANLT-02 | Phase 23 | Complete |
| ANLT-03 | Phase 23 | Complete |
| ANLT-04 | Phase 23 | Complete |
| ANLT-05 | Phase 23 | Complete |
| ANLT-06 | Phase 23 | Complete |

**Coverage:**
- v2.0 requirements: 36 total
- Mapped to phases: 36/36 (100%)
- Complete: 36/36 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-18 — FOOT-01 through FOOT-07 marked Complete (Phase 22 verified passed); MOTO-07 updated to include Phase 23 gap-closure plan 23-06; all VERT/FEST/MOTO requirement checkboxes corrected to [x]; 36/36 requirements now Complete*
