# SiteMedic UK Compliance TODO

**Document Purpose:** Track all external compliance tasks that require action outside of codebase development
**Last Updated:** 15 February 2026
**Owner:** Sabine Resoagli
**Priority Legend:** 🔴 Critical | 🟡 Important | 🟢 Nice to Have

---

## 🔴 CRITICAL - Required Before Launch

### Business Registration & Legal

- [ ] **Register Company with Companies House**
  - **Status:** ⏳ Pending
  - **Task:** Register SiteMedic Ltd as a limited company in England and Wales
  - **Website:** [www.gov.uk/limited-company-formation](https://www.gov.uk/limited-company-formation)
  - **Cost:** £12 online / £40 postal
  - **Timeline:** 24 hours (online) or 8-10 days (postal)
  - **Deliverable:** Company Registration Number (to update in footer and legal pages)
  - **Next Step:** Complete online application or use formation agent

- [ ] **Register with ICO (Information Commissioner's Office)**
  - **Status:** ⏳ Pending
  - **Task:** Register as a data controller processing personal data (REQUIRED by UK GDPR)
  - **Website:** [ico.org.uk/registration](https://ico.org.uk/registration)
  - **Cost:** £40-60 per year (depends on company size)
  - **Timeline:** Immediate online registration
  - **Deliverable:** ICO Registration Number (to update in footer and legal pages)
  - **Renewal:** Annual (set calendar reminder)
  - **⚠️ LEGAL REQUIREMENT:** Failure to register is a criminal offense (up to £4,000 fine)
  - **Next Step:** Complete online self-assessment and register

- [ ] **Insert Company Registration Number in Website**
  - **Status:** ⏳ Pending (blocked by Companies House registration)
  - **Files to Update:**
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/page.tsx` (footer)
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/privacy-policy/page.tsx`
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/terms-and-conditions/page.tsx`
  - **Search for:** `[Insert Registration Number]` or `[Company Registration Number]`
  - **Replace with:** Actual 8-digit company number (e.g., 12345678)

- [ ] **Insert ICO Registration Number in Website**
  - **Status:** ⏳ Pending (blocked by ICO registration)
  - **Files to Update:**
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/page.tsx` (footer)
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/privacy-policy/page.tsx`
  - **Search for:** `[Insert ICO Registration Number]` or `[ICO Registration Number]`
  - **Replace with:** Actual ICO registration number (format: Z1234567)

- [ ] **Set Up Business Bank Account**
  - **Status:** ⏳ Pending (requires company registration)
  - **Task:** Open UK business bank account for SiteMedic Ltd
  - **Options:** Tide, Starling Business, NatWest Business, HSBC Business
  - **Required:** Company registration certificate, proof of address, ID
  - **Timeline:** 2-7 days after company registration
  - **Next Step:** Research business bank options and apply after company registration

### Insurance (Professional Services)

- [ ] **Professional Indemnity Insurance**
  - **Status:** ⏳ Pending
  - **Task:** Obtain PI insurance for medic staffing service
  - **Coverage:** £1-5 million (typical for healthcare staffing)
  - **Providers:** Hiscox, AXA, Simply Business, Markel
  - **Cost Estimate:** £500-2000/year (depends on turnover and coverage)
  - **⚠️ CRITICAL:** Required before providing any medic staffing services
  - **Next Step:** Get quotes from 3+ providers

- [ ] **Employers' Liability Insurance**
  - **Status:** ⏳ Pending (only if hiring employees)
  - **Task:** Obtain EL insurance if employing staff (medics as employees, not contractors)
  - **Coverage:** Minimum £5 million (UK legal requirement)
  - **Cost:** £100-500/year
  - **⚠️ LEGAL REQUIREMENT:** If you have employees, this is mandatory (£2,500/day fine if not insured)
  - **Note:** If medics are self-employed contractors (IR35 outside), this may not be needed
  - **Next Step:** Determine employment status (contractor vs employee) first

- [ ] **Public Liability Insurance**
  - **Status:** ⏳ Pending
  - **Task:** Obtain PL insurance for business operations
  - **Coverage:** £2-5 million
  - **Cost:** £150-300/year
  - **Next Step:** Get quote bundled with PI insurance

### Registered Office Address

- [ ] **Confirm Registered Office Address**
  - **Status:** ⏳ Pending
  - **Task:** Decide on registered office address for company registration
  - **Options:**
    - Home address (cost: £0, privacy: low)
    - Virtual office service (cost: £50-200/year, privacy: high)
    - Physical office space (cost: varies)
  - **Required for:** Companies House, legal correspondence, website footer
  - **Next Step:** Choose address and prepare proof of address

- [ ] **Insert Registered Office Address in Website**
  - **Status:** ⏳ Pending (blocked by address confirmation)
  - **Files to Update:**
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/page.tsx` (footer)
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/privacy-policy/page.tsx`
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/terms-and-conditions/page.tsx`
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/refund-policy/page.tsx`
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/complaints/page.tsx`
    - `/Users/sabineresoagli/GitHub/sitemedic/web/app/accessibility-statement/page.tsx`
  - **Search for:** `[Registered Office Address]` or `[Insert Registered Office Address]`
  - **Replace with:** Full postal address

### Contact Information

- [ ] **Set Up Business Email Addresses**
  - **Status:** ⏳ Pending
  - **Task:** Create professional email addresses for different departments
  - **Required Addresses:**
    - `info@sitemedic.co.uk` (general inquiries)
    - `privacy@sitemedic.co.uk` (GDPR/privacy requests)
    - `dpo@sitemedic.co.uk` (Data Protection Officer)
    - `legal@sitemedic.co.uk` (legal inquiries)
    - `support@sitemedic.co.uk` (customer support)
    - `complaints@sitemedic.co.uk` (complaints handling)
    - `refunds@sitemedic.co.uk` (refund requests)
    - `accessibility@sitemedic.co.uk` (accessibility inquiries)
    - `abuse@sitemedic.co.uk` (AUP violations)
    - `security@sitemedic.co.uk` (security issues)
    - `emergency@sitemedic.co.uk` (urgent clinical incidents)
  - **Options:** Google Workspace (£5.75/user/month), Microsoft 365 (£4.50/user/month)
  - **Next Step:** Choose email provider and set up domain

- [ ] **Get Business Phone Number**
  - **Status:** ⏳ Pending
  - **Task:** Obtain UK business phone number for customer contact
  - **Options:**
    - VoIP service (Aircall, RingCentral, Vonage): £10-30/month
    - Traditional landline: £20-40/month
    - Mobile-only: Existing mobile + call forwarding
  - **Next Step:** Choose phone solution and purchase number

- [ ] **Insert Contact Phone Number in Website**
  - **Status:** ⏳ Pending (blocked by phone number acquisition)
  - **Files to Update:** All legal pages and footer
  - **Search for:** `+44 (0) XXXX XXXXXX` or `[Insert Contact Phone]`
  - **Replace with:** Actual phone number

---

## 🟡 IMPORTANT - Required Within 3-6 Months

### VAT Registration

- [ ] **Determine if VAT Registration Required**
  - **Status:** ⏳ Pending
  - **Task:** Monitor turnover and register for VAT if exceeding £90,000 threshold
  - **Threshold:** £90,000 in rolling 12-month period (as of 2026)
  - **Voluntary Registration:** Can register before threshold if reclaiming VAT on expenses
  - **Website:** [www.gov.uk/vat-registration](https://www.gov.uk/vat-registration)
  - **Timeline:** Register within 30 days of exceeding threshold
  - **Next Step:** Track revenue monthly and register when approaching £85k

- [ ] **Insert VAT Number in Website (if registered)**
  - **Status:** ⏳ Pending (only after VAT registration)
  - **Files to Update:** Footer and invoicing templates
  - **Search for:** `[Insert VAT Number]` or `[VAT Number]`
  - **Replace with:** 9-digit VAT number (format: GB123456789)

### Data Protection & Privacy

- [ ] **Appoint Data Protection Officer (DPO)**
  - **Status:** ⏳ Pending
  - **Task:** Appoint DPO (can be internal staff member or external consultant)
  - **Required if:** Processing health data at scale (recommended for SiteMedic)
  - **Cost:** £0 (internal) or £500-2000/year (external DPO service)
  - **Responsibilities:** Advise on GDPR compliance, monitor data processing, liaise with ICO
  - **Next Step:** Decide internal vs external, appoint, and update DPO email

- [ ] **Create Data Processing Records (Article 30)**
  - **Status:** ⏳ Pending
  - **Task:** Document all data processing activities (UK GDPR Article 30 requirement)
  - **Required Info:** Types of data, purposes, retention periods, third-party processors
  - **Template:** Available from ICO website
  - **Timeline:** Complete within first 6 months of operation
  - **Next Step:** Download ICO template and begin documentation

- [ ] **Data Protection Impact Assessment (DPIA)**
  - **Status:** ⏳ Pending
  - **Task:** Conduct DPIA for high-risk data processing (health data qualifies)
  - **Required:** UK GDPR Article 35 (processing special category data)
  - **Template:** [ICO DPIA template](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/accountability-and-governance/data-protection-impact-assessments/)
  - **Timeline:** Before launching health data features
  - **Next Step:** Complete DPIA using ICO template

- [ ] **Data Processing Agreements (DPAs) with Third Parties**
  - **Status:** ⏳ Pending (some may already exist)
  - **Task:** Ensure DPAs are in place with all third-party processors:
    - ✅ Supabase (database hosting)
    - ✅ Vercel (website hosting)
    - ✅ Stripe (payment processing)
    - ⏳ Google Maps API (when implemented)
    - ⏳ Google Analytics (when implemented)
    - ⏳ Facebook Pixel (when implemented)
  - **Next Step:** Review existing agreements, request DPAs where missing

### Compliance Audits & Reviews

- [ ] **Schedule First Privacy Policy Review**
  - **Status:** ⏳ Pending
  - **Task:** Review Privacy Policy in 6 months (August 2026)
  - **Frequency:** Every 6-12 months or when processes change
  - **Checklist:** Ensure all data processing is documented, check for new regulations
  - **Next Step:** Set calendar reminder for August 2026

- [ ] **Schedule Cookie Audit**
  - **Status:** ⏳ Pending
  - **Task:** Audit actual cookies being set vs. Cookie Policy documentation
  - **Frequency:** Quarterly
  - **Tools:** Cookie scanner (e.g., OneTrust, Cookiebot free scan)
  - **Next Step:** Run cookie scan before implementing analytics

- [ ] **Accessibility Audit**
  - **Status:** ⏳ Pending
  - **Task:** Conduct formal WCAG 2.1 AA audit (consider external auditor)
  - **Cost:** £500-2000 for professional audit
  - **Frequency:** Annually
  - **Next Step:** Consider after website is fully built and stable

---

## 🟢 NICE TO HAVE - Enhances Credibility

### Certifications & Accreditations

- [ ] **ISO 27001 Certification (Information Security)**
  - **Status:** ⏳ Pending (mentioned in footer as "ISO 27001 Ready")
  - **Task:** Obtain ISO 27001 certification for information security management
  - **Cost:** £5,000-20,000 (initial certification) + £2,000-5,000 annual maintenance
  - **Timeline:** 6-12 months preparation + audit
  - **Benefits:** Enhances trust, required by some enterprise clients
  - **Next Step:** Research certification bodies (BSI, LRQA, SGS)

- [ ] **Cyber Essentials Certification**
  - **Status:** ⏳ Pending
  - **Task:** Obtain Cyber Essentials (basic) or Cyber Essentials Plus (advanced) certification
  - **Cost:** £300 (basic) or £600+ (plus)
  - **Timeline:** 1-2 weeks
  - **Benefits:** Required for some government contracts, shows cybersecurity commitment
  - **Website:** [www.cyberessentials.ncsc.gov.uk](https://www.cyberessentials.ncsc.gov.uk)
  - **Next Step:** Complete self-assessment questionnaire

- [ ] **Health and Safety Accreditation**
  - **Status:** ⏳ Pending
  - **Task:** Consider CHAS, SafeContractor, or Constructionline accreditation
  - **Cost:** £200-600 per year
  - **Benefits:** Required by many construction clients for contractor approval
  - **Next Step:** Research which accreditation is most valuable for target clients

### Marketing & Analytics Setup

- [ ] **Implement Google Analytics**
  - **Status:** ⏳ Pending (cookie consent banner ready)
  - **Task:** Add Google Analytics tracking code with consent management
  - **Code Update:** `/Users/sabineresoagli/GitHub/sitemedic/web/components/CookieConsent.tsx`
  - **Requirement:** Only initialize GA when user consents to analytics cookies
  - **Next Step:** Create GA4 property, get tracking ID, add to environment variables

- [ ] **Implement Facebook Pixel (if using Meta Ads)**
  - **Status:** ⏳ Pending (cookie consent banner ready)
  - **Task:** Add Facebook Pixel with consent management
  - **Requirement:** Only initialize pixel when user consents to marketing cookies
  - **Next Step:** Create Facebook Business Manager account, get Pixel ID

- [ ] **Set Up Alternative Dispute Resolution (ADR) Membership**
  - **Status:** ⏳ Pending (mentioned in Complaints Procedure)
  - **Task:** Join UK Dispute Resolution (UKDR) or similar ADR service
  - **Cost:** £150-500/year membership
  - **Benefits:** Provides independent complaint resolution, builds customer trust
  - **Website:** [www.ukdr.co.uk](https://www.ukdr.co.uk)
  - **Next Step:** Apply for membership once business is operational

### Ongoing Maintenance Reminders

- [ ] **Set Up Annual ICO Registration Renewal Reminder**
  - **Status:** ⏳ Pending (after initial ICO registration)
  - **Task:** Add calendar reminder 30 days before ICO renewal date
  - **Frequency:** Annual
  - **Cost:** £40-60
  - **Next Step:** Set reminder after completing initial registration

- [ ] **Set Up Quarterly Compliance Review**
  - **Status:** ⏳ Pending
  - **Task:** Schedule recurring quarterly review of:
    - Privacy Policy updates needed
    - Cookie Policy accuracy
    - Terms and Conditions changes
    - New regulations or case law
  - **Frequency:** Quarterly
  - **Next Step:** Create recurring calendar event

- [ ] **Schedule Annual Insurance Renewals**
  - **Status:** ⏳ Pending (after obtaining insurance)
  - **Task:** Set calendar reminders 60 days before insurance renewal dates
  - **Policies to Track:**
    - Professional Indemnity
    - Employers' Liability (if applicable)
    - Public Liability
  - **Next Step:** Add reminders after purchasing insurance

---

## 📋 Placeholder Updates Checklist

**Priority:** Complete after registrations are finalized

### Company Information
- [ ] Company Registration Number → 8 locations
- [ ] VAT Number → 2 locations (if registered)
- [ ] Registered Office Address → 7 locations
- [ ] ICO Registration Number → 2 locations

### Contact Information
- [ ] Business Phone Number → 10+ locations
- [ ] Business Email Addresses → Verify all functional

### Third-Party IDs
- [ ] Google Analytics Tracking ID → Environment variable
- [ ] Facebook Pixel ID → Environment variable

**Affected Files:**
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/privacy-policy/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/cookie-policy/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/terms-and-conditions/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/refund-policy/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/complaints/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/accessibility-statement/page.tsx`
- `/Users/sabineresoagli/GitHub/sitemedic/web/app/acceptable-use/page.tsx`

---

## 📚 Useful Resources

### Government Resources
- **Companies House:** [www.gov.uk/government/organisations/companies-house](https://www.gov.uk/government/organisations/companies-house)
- **ICO (Data Protection):** [ico.org.uk](https://ico.org.uk)
- **HSE (Health & Safety):** [www.hse.gov.uk](https://www.hse.gov.uk)
- **GOV.UK Business Support:** [www.gov.uk/business](https://www.gov.uk/business)

### Compliance Guides
- **ICO Guide to GDPR:** [ico.org.uk/for-organisations/guide-to-data-protection](https://ico.org.uk/for-organisations/guide-to-data-protection)
- **WCAG 2.1 Guidelines:** [www.w3.org/WAI/WCAG21/quickref/](https://www.w3.org/WAI/WCAG21/quickref/)
- **Consumer Rights Act 2015:** [www.legislation.gov.uk/ukpga/2015/15/contents](https://www.legislation.gov.uk/ukpga/2015/15/contents)

### Business Services
- **Business Bank Accounts:** Tide, Starling, NatWest, HSBC
- **Email Hosting:** Google Workspace, Microsoft 365
- **VoIP Phone:** Aircall, RingCentral, Vonage
- **Insurance Brokers:** Hiscox, Simply Business, AXA

---

## 🎯 Next Actions (Priority Order)

1. **Register Company with Companies House** (1-3 days)
2. **Register with ICO** (immediate online)
3. **Confirm Registered Office Address** (same day)
4. **Set Up Business Email Addresses** (1-2 days)
5. **Get Business Phone Number** (1-2 days)
6. **Update Website Placeholders** (1 hour after info gathered)
7. **Obtain Professional Indemnity Insurance** (1-2 weeks)
8. **Open Business Bank Account** (3-7 days)
9. **Appoint Data Protection Officer** (1-2 weeks)
10. **Create Data Processing Records** (1-2 weeks)

---

**Document Maintained By:** Sabine Resoagli
**Next Review:** After company registration and ICO registration are complete
**Questions?** Review this document before each milestone and update status as tasks are completed.
