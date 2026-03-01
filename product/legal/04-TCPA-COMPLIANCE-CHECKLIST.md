# TCPA Compliance Checklist
## Telephone Consumer Protection Act - AI Lead Response System

**Effective Date:** February 2026  
**Last Updated:** February 14, 2026

This checklist helps users ensure compliance with the Telephone Consumer Protection Act (47 U.S.C. § 227) and FCC regulations when using the AI Lead Response System.

---

## Overview: TCPA Requirements

The TCPA applies to:
- SMS/text messages (mobile phones)
- Telemarketing calls
- Fax advertisements
- Robocalls and automated messages
- Do-Not-Call violations
- SMS opt-out violations

**Phase 1 MVP:** Text-only (SMS). No voice calls.

**Key Penalties:** Up to $43,792 per violation (2024), treble damages ($131,376 per violation), FCC fines, state attorney general action.

---

## 1. Consent Requirements

### ✅ REQUIRED: Express Written Consent for Marketing

**Question 1.1:** Do you have written consent from each lead before sending marketing SMS?

- [ ] Yes - Documented and retained
- [ ] No - TCPA VIOLATION RISK ⚠️

**What counts as Express Written Consent:**
- Lead enters phone number on web form (imply consent)
- Lead texts "SIGN UP" or similar keyword
- Lead fills out form with phone + checkbox authorizing SMS
- Lead provides written consent (email, form submission)
- **NOT:** Email consent alone, verbal consent, phone call

**What must be disclosed in consent form:**
- [ ] Your business name
- [ ] Purpose of communications (lead follow-up, property info, marketing)
- [ ] Frequency of messages (approximate)
- [ ] Standard SMS rates apply
- [ ] Right to opt out and how
- [ ] Unique identifier (account number or email)

**Red flags:**
- ❌ Pre-checked consent boxes (must be affirmatively checked by lead)
- ❌ Consent form buried in T&Cs
- ❌ Vague purposes ("communications")
- ❌ No retention of consent documentation

### ✅ RECOMMENDED: Prior Established Business Relationship (PEBR)

**Question 1.2:** Are you only contacting leads with whom you have a business relationship?

- [ ] Yes - Existing clients or recent inquiries only
- [ ] No - Cold outreach requires express written consent

**PEBR Definition:**
- Lead inquired about your properties within 18 months
- Lead requested information about your services
- Lead is existing customer
- Lead is personal/family contact with implied consent

**Important:** Even with PEBR, you should still get explicit consent for marketing SMS.

---

## 2. Opt-Out and Do-Not-Call Compliance

### ✅ REQUIRED: Immediate Opt-Out Capability

**Question 2.1:** Can leads easily opt out of SMS messages?

- [ ] Yes - Simple process documented below
- [ ] No - TCPA VIOLATION ⚠️

**Opt-out process must:**
- [ ] Allow reply "STOP" or "STOP ALL"
- [ ] Respond to opt-out within one message
- [ ] Honor opt-out immediately
- [ ] Not send opt-out confirmations (just comply)
- [ ] Not require lead to call or email

**Example compliant opt-out message:**
"Reply STOP to opt out. Message frequency: [frequency]. Standard rates apply."

**Question 2.2:** How do you handle opt-outs?

- [ ] Immediately add to company's do-not-call list
- [ ] Honor for minimum 5 years
- [ ] Ensure all systems receive update within 24 hours
- [ ] Document opt-out in CRM
- [ ] Never re-contact after opt-out

### ✅ REQUIRED: FTC Do-Not-Call Registry Compliance

**Question 2.3:** Are you checking the national Do-Not-Call Registry?

- [ ] Yes - Before sending SMS
- [ ] No - TCPA VIOLATION RISK ⚠️

**Procedure:**
- [ ] Download registry monthly (www.donotcall.gov)
- [ ] Scrub phone list against registry
- [ ] Document scrubbing dates and results
- [ ] Maintain scrubbing records for 5 years
- [ ] Use third-party service to automate (recommended)

**Exception:** PEBR allows contact even if on Do-Not-Call list, BUT:
- Lead must have opted in to SMS
- Lead must not have previously opted out

### ✅ REQUIRED: State Do-Not-Call Lists

**Question 2.4:** Are you complying with state-specific do-not-call rules?

- [ ] Yes - Checking and honoring state lists
- [ ] Partly - Some states complied
- [ ] No - Risk of state AG action ⚠️

**Key states (real estate):**
- **California:** State list + GDPR-like opt-in rules
- **New York:** State list + consent requirements
- **Texas:** State list compliance required
- **Florida:** State list compliance required

---

## 3. Identification and Sender Requirements

### ✅ REQUIRED: Accurate Sender Information

**Question 3.1:** Do all SMS messages include your business identification?

- [ ] Yes - Compliant format
- [ ] Partially - Some messages missing
- [ ] No - TCPA VIOLATION ⚠️

**Messages must include:**
- [ ] Your business name (not generic/random)
- [ ] Business phone number OR return phone number
- [ ] Business address (physical address, not just phone)
- [ ] Opt-out information (STOP instructions)
- [ ] Website or way to reach you

**Example compliant footer:**
"RE/MAX Homes • Reply STOP to opt out • www.remaxagent.com • 555-123-4567"

**Question 3.2:** Are you using short codes or toll-free numbers?

- [ ] Short codes with proper registry (YES Labs, Upstream, etc.)
- [ ] Toll-free numbers (must register with SMS provider)
- [ ] Long codes / 10-digit numbers
- [ ] Other: _____________

**Best practice:** Use short code registered with Campaign Registry (TCPA compliance)

### ✅ REQUIRED: No Spoofing

**Question 3.3:** Is your sender ID authentic?

- [ ] Yes - Real business number/short code
- [ ] No - Using fake/spoofed number (FELONY) ⚠️

**Spoofing is a federal crime with additional penalties beyond TCPA.**

---

## 4. Message Content Requirements

### ✅ REQUIRED: Clear Marketing Identification

**Question 4.1:** Are marketing messages clearly identified?

- [ ] Yes - Clearly marked as marketing/promotional
- [ ] No - TCPA VIOLATION (misleading) ⚠️

**Marketing SMS examples:**
- Property alerts/listings
- Open house invitations
- Promotional offers
- Market updates (if promotional in nature)
- General real estate tips/advice (if driven by marketing intent)

**Compliant marketing message:**
"[MARKETING] Check out 123 Main St - 3BR/2BA, $450k. [Link]. Reply STOP to opt out. Remax Homes."

**Question 4.2:** Are you avoiding deceptive content?

- [ ] Yes - All messages accurate and non-misleading
- [ ] No - Risk of FTC + FCC action ⚠️

**Don't:**
- ❌ Misrepresent property details
- ❌ Hide material facts
- ❌ Use deceptive links (bit.ly without destination clarity)
- ❌ Imply lead initiated contact if they didn't

---

## 5. Timing and Frequency

### ✅ REQUIRED: Reasonable Timing

**Question 5.1:** What time of day do you send SMS?

- [ ] Between 8 AM - 9 PM recipient's timezone
- [ ] Any time (higher risk) ⚠️

**TCPA guidance:**
- No messages before 8 AM or after 9 PM recipient's local time
- Document recipient timezone
- System should adjust for timezone

**Question 5.2:** How often do you message each lead?

- [ ] Infrequent (2-3 per week max, real estate acceptable)
- [ ] Frequent (daily or more) - Disclose frequency
- [ ] Excessive (multiple per day) - Risk of harassment claims ⚠️

**Best practice:** Don't exceed 2-3 SMS per week to same lead without explicit consent for higher frequency.

---

## 6. Lead Consent Documentation

### ✅ REQUIRED: Retain Proof of Consent

**Question 6.1:** Do you retain written consent records?

- [ ] Yes - All consent documented and stored
- [ ] Partially - Some records kept
- [ ] No - Can't prove compliance ⚠️

**What to keep:**
- [ ] Original consent form (screen shot or copy)
- [ ] Date and time of consent
- [ ] Method of consent (web form, text, etc.)
- [ ] Proof of disclosure (terms offered)
- [ ] Phone number and unique identifier
- [ ] Lead name/contact information

**Retention:** Minimum 4 years (recommended 5+ years)

**Question 6.2:** How do you store consent records?

- [ ] Dedicated CRM/database with audit trail
- [ ] Spreadsheet (riskier - less tamper-proof)
- [ ] Paper forms
- [ ] Not stored - CAN'T PROVE COMPLIANCE ⚠️

**Best practice:** CRM system with timestamped records and audit trail.

### ✅ RECOMMENDED: Initial Consent Message

**Question 6.3:** Do you send initial opt-in confirmation?

- [ ] Yes - Lead receives confirmation of opt-in
- [ ] No - Risks lead confusion about consent

**Recommended first message:**
"Hi [Name], thanks for opting in to receive property updates from [Company]. Msg/data rates apply. Reply STOP to unsubscribe. T&Cs: [URL]"

---

## 7. Artificial Intelligence and Automated Messages

### ✅ REQUIRED: AI Content Disclosure (if required)

**Question 7.1:** Do you disclose that messages are AI-generated?

- [ ] Disclosure required - Clearly stated
- [ ] Not required - Messages clearly human-written
- [ ] Unclear - Risk of deception ⚠️

**TCPA/FCC guidance:**
- If message appears to be from a person but is AI-generated → DISCLOSE
- If message is clearly promotional → Disclosure less critical but recommended
- Example: "This is an automated message. [Business] uses AI to draft property recommendations."

**Question 7.2:** Are AI-generated messages reviewed by humans?

- [ ] Yes - All messages reviewed before sending
- [ ] Mostly - Spot-checked
- [ ] No - Risk of inappropriate/inaccurate messages ⚠️

**TCPA compliance requires:**
- [ ] Human review before sending (recommended)
- [ ] Clear disclosure that message is AI-generated if not reviewed
- [ ] Ability to respond to complaints about accuracy
- [ ] Process to fix/retract inaccurate messages

---

## 8. Short Codes and SMS Providers

### ✅ REQUIRED: Proper SMS Provider Compliance

**Question 8.1:** What SMS provider are you using?

- [ ] Compliant provider: __________
- [ ] Provider compliance status unclear ⚠️

**Compliant providers should:**
- [ ] Follow TCPA regulations
- [ ] Screen for do-not-call violations
- [ ] Support STOP/opt-out handling
- [ ] Provide audit trails and compliance reports
- [ ] Have BOSH (Business & Operator Short Code Holder) approval

**Known compliant providers for real estate:**
- Twilio (with proper setup)
- Bandwidth
- Telnyx
- Direct (BOSH-approved short codes)

**Question 8.2:** Are you using your provider's compliance tools?

- [ ] Yes - Enabled all compliance features
- [ ] Partially - Some features enabled
- [ ] No - Not using available tools ⚠️

**Must enable:**
- [ ] Do-not-call list screening
- [ ] Opt-out handling
- [ ] Timestamp verification
- [ ] Sender ID authentication
- [ ] Message content filtering (if available)

---

## 9. Compliance Program & Documentation

### ✅ REQUIRED: Documented Compliance Procedures

**Question 9.1:** Do you have written TCPA compliance policies?

- [ ] Yes - Documented and provided to staff
- [ ] Partially - Some policies exist
- [ ] No - Need to create ⚠️

**Policies must cover:**
- [ ] Lead sourcing and consent procedures
- [ ] Opt-out and do-not-call compliance
- [ ] Do-not-call list scrubbing procedures
- [ ] Message review process
- [ ] Incident reporting and remediation
- [ ] Record retention procedures
- [ ] Staff training requirements

**Question 9.2:** Do your team members understand TCPA?

- [ ] Yes - All staff trained annually
- [ ] Partially - Some training completed
- [ ] No - Staff untrained ⚠️

**Training should cover:**
- [ ] TCPA violations and penalties
- [ ] Consent requirements
- [ ] Opt-out procedures
- [ ] Do-not-call compliance
- [ ] Red flags and escalation procedures

### ✅ REQUIRED: Audit Trail & Logging

**Question 9.3:** Do you maintain audit trails?

- [ ] Yes - All messages logged with metadata
- [ ] Partially - Some data logged
- [ ] No - No audit trail ⚠️

**Audit trail must include:**
- [ ] Timestamp of each message
- [ ] Recipient phone number
- [ ] Sender ID
- [ ] Message content
- [ ] Consent basis (PEBR, express consent, etc.)
- [ ] Opt-out date (if applicable)
- [ ] User/system that sent message

---

## 10. Real Estate Specific Considerations

### ✅ RECOMMENDED: Property-Specific Consent

**Question 10.1:** Do leads consent to messages about specific properties?

- [ ] Yes - Consent tied to property/search criteria
- [ ] Generic - Consent for all messages
- [ ] Unclear - Mixed approach

**Best practice for real estate:**
- Lead searches property → Consent to messages about that property
- Lead requests listings → Consent to messages about requested type
- Document which leads are interested in which properties

### ✅ RECOMMENDED: Open House & Event Notifications

**Question 10.2:** How do you handle open house/event SMS?

- [ ] Only to leads who consented to event notifications
- [ ] To all interested leads
- [ ] To leads with PEBR only

**Safest approach:**
- Separate consent for event notifications
- Clear that event notifications are marketing
- Honor opt-out from event notifications separately

### ✅ RECOMMENDED: Follow-Up After Showing

**Question 10.3:** Do you send follow-ups after property showings?

- [ ] Yes - Based on explicit request or PEBR
- [ ] Yes - Without consent (RISKY) ⚠️
- [ ] No - Don't send follow-ups

**Compliant approach:**
- At showing: "Can I follow up via text?" → Get consent
- Include frequency: "I'll send you updates about this property once daily for 5 days"
- Document consent
- Honor opt-out immediately

---

## 11. Opt-Out and Do-Not-Contact Procedures

### ✅ REQUIRED: Documented Opt-Out Process

**Question 11.1:** What happens when lead texts STOP?

- [ ] Lead added to internal DNC list immediately
- [ ] SMS provider handles opt-out (automatic)
- [ ] Manual review required (24-hour delay) ⚠️

**Procedure must include:**
- [ ] Automatic STOP response: "You have unsubscribed from [Business]. You will not receive further messages."
- [ ] Add to company do-not-call list within 24 hours
- [ ] Document opt-out date and time
- [ ] Notify all systems (CRM, SMS provider, etc.)
- [ ] Retain opt-out records for 5 years

**Question 11.2:** What's your re-contact policy after opt-out?

- [ ] Never re-contact without new consent
- [ ] Re-contact only if lead requests
- [ ] Can re-contact after 60 days (WRONG) ⚠️

**TCPA requires:** No re-contact after opt-out. Period. Unless lead initiates contact with you.

### ✅ REQUIRED: Do-Not-Call List Maintenance

**Question 11.3:** How often do you update your DNC list?

- [ ] Monthly - Fresh registry download
- [ ] Quarterly
- [ ] Annually (minimum)
- [ ] Never - No process (VIOLATION) ⚠️

**Procedure:**
- [ ] Download FTC Do-Not-Call Registry monthly
- [ ] Scrub lead list against registry
- [ ] Add state-specific registries (CA, NY, TX, FL)
- [ ] Document scrubbing date and results
- [ ] Remove flagged leads before sending

---

## 12. Complaint Handling & Response

### ✅ RECOMMENDED: Complaint Response Procedure

**Question 12.1:** How do you handle lead complaints?

- [ ] Documented process for responding
- [ ] Case-by-case ad-hoc response
- [ ] Complaints ignored (RISKY) ⚠️

**Recommended procedure:**
- [ ] Acknowledge complaint within 24 hours
- [ ] Investigate consent and compliance
- [ ] Apologize if error found
- [ ] Provide opt-out option
- [ ] Document investigation and resolution
- [ ] Review for systemic issues

**Question 12.2:** Do you track complaints?

- [ ] Yes - Database of all complaints
- [ ] Partially - Some tracked
- [ ] No - No tracking system (risky) ⚠️

**Track:**
- [ ] Date received
- [ ] Lead name and number
- [ ] Complaint description
- [ ] Investigation findings
- [ ] Resolution taken
- [ ] Opt-out confirmation

---

## 13. Enforcement and Penalties

### ⚠️ Know the Risks

**TCPA Penalties:**
- **Per violation:** $43,792 (as of 2024, adjusted annually)
- **Treble damages:** Up to $131,376 per violation if willful/knowing
- **Volume:** Class action suits often involve thousands of violations (e.g., 10,000 messages = $438M+ liability)

**Example:**
- 5,000 SMS to leads without consent = $219M potential liability
- FCC fines on top of private right of action
- Attorney fees and costs awarded to winning plaintiffs

**Recent Cases:**
- $31.9M settlement (TCPA violations - telemarketing)
- $100M+ class action settlements common
- State AGs pursuing additional UDAP (Unfair Deceptive Acts) claims

### Red Flags That Trigger Enforcement

**FTC/FCC targets:**
- ❌ High volume of complaints
- ❌ Consistent pattern of non-compliance
- ❌ No documented consent procedures
- ❌ Do-not-call violations
- ❌ False/misleading content
- ❌ Class action lawsuits

---

## 14. Compliance Checklist Summary

### ✅ MUST DO (Required for Legal Compliance)

- [ ] Obtain express written consent before sending marketing SMS
- [ ] Provide clear opt-out mechanism (STOP)
- [ ] Honor opt-outs immediately
- [ ] Check FTC Do-Not-Call Registry monthly
- [ ] Check state DNC lists (CA, NY, TX, FL minimum)
- [ ] Include business ID in all messages
- [ ] Retain consent records for 5 years
- [ ] Disclose AI-generated content if applicable
- [ ] Use compliant SMS provider
- [ ] Have documented compliance procedures
- [ ] Train staff on TCPA requirements
- [ ] Maintain audit trails of all messages

### ✅ STRONGLY RECOMMENDED (Best Practice)

- [ ] Use short code (not long code)
- [ ] Register with Campaign Registry
- [ ] Obtain consent specifically for SMS (not just bundled)
- [ ] Document PEBR for each lead
- [ ] Implement timezone-aware send times
- [ ] Review all AI-generated messages before sending
- [ ] Have annual TCPA compliance audit
- [ ] Carry TCPA-specific insurance
- [ ] Document complaint handling procedures
- [ ] Subscribe to updated DNC lists
- [ ] Use CRM with built-in compliance tracking
- [ ] Maintain separate opt-out lists for different message types

### ⚠️ DO NOT DO (Common Violations)

- [ ] ❌ Send SMS without express consent
- [ ] ❌ Ignore STOP/opt-out requests
- [ ] ❌ Send SMS outside 8 AM - 9 PM
- [ ] ❌ Use spoofed/fake sender ID
- [ ] ❌ Fail to include business identification
- [ ] ❌ Re-contact after opt-out
- [ ] ❌ Send to numbers on Do-Not-Call Registry
- [ ] ❌ Hide marketing SMS in template language
- [ ] ❌ Make false/misleading property claims
- [ ] ❌ Send without human review (if required)
- [ ] ❌ Fail to maintain audit trail
- [ ] ❌ Skip TCPA compliance training

---

## 15. Additional Resources

### FTC / FCC References
- FTC TCPA Guidance: https://www.ftc.gov/business-guidance/pages/tcpa-text
- FCC Rules (47 CFR §64.1200): https://www.fcc.gov/consumers/guides/consumers-guide-telephone-consumer-protection-act
- FTC Do-Not-Call Registry: https://www.donotcall.gov

### Industry Standards
- Campaign Registry: https://campaignregistry.com (short code registration)
- SMS Provider Compliance: Check with your provider for TCPA procedures

### Legal Resources
- Real Estate Marketing TCPA Issues: Consult with telemarketing compliance attorney
- State AG Offices: Check state-specific SMS regulations
- Insurance: Verify TCPA coverage in business liability policy

---

## 16. Sign-Off and Certification

**IMPORTANT:** This checklist is guidance only, not legal advice. Each business should:

- [ ] Consult with telemarketing compliance attorney
- [ ] Review state-specific SMS regulations
- [ ] Implement documented procedures
- [ ] Train all staff members
- [ ] Conduct regular audits
- [ ] Carry appropriate insurance

**Users of the AI Lead Response System remain solely responsible for TCPA compliance. The Service does not guarantee TCPA compliance; users must implement procedures documented above.**

---

**Created:** February 14, 2026  
**Next Review:** May 14, 2026 (quarterly review recommended)  
**Version:** 1.0 Beta

Contact: legal@[domain] for questions or updates.
