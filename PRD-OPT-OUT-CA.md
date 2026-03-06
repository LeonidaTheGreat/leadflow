# PRD: Lead Opt-Out Compliance Enhancement — Canada Support

**Document ID:** PRD-OPT-OUT-CA  
**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-03-06  
**Owner:** Product Manager  
**Related UC:** UC-5 (Lead Opt-Out)  
**Related PRD:** PRD-CORE-SMS

---

## 1. Overview

### 1.1 Problem Statement
The current Lead Opt-Out feature (UC-5) only handles US compliance (TCPA). Real estate agents in Canada cannot properly configure opt-out compliance for Canadian leads, exposing them to CASL (Canada's Anti-Spam Legislation) violations and potential fines up to $10M CAD per violation.

### 1.2 Product Goal
Extend the Lead Opt-Out feature to support Canadian compliance requirements by adding Canada as a country option in the auth/onboarding flow, enabling proper CASL-compliant opt-out handling.

### 1.3 Target Users
- Canadian real estate agents using LeadFlow AI
- US agents with Canadian leads
- Brokerages operating across US-Canada border

### 1.4 Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| CASL Compliance | 100% | All Canadian leads have proper opt-out handling |
| Opt-out Recognition | >99% | STOP/ARRET keywords recognized |
| Compliance Audit Pass | 100% | Pass CASL compliance review |

---

## 2. User Stories

### US-1: Canadian Agent Onboarding
**As a** Canadian real estate agent  
**I want to** select Canada as my country during onboarding  
**So that** my account is configured for CASL compliance  

**Acceptance Criteria:**
- Country selector visible during Step 2 of onboarding ("Tell us about you")
- Canada appears as an option alongside United States
- Selecting Canada sets default timezone to America/Toronto (or America/Vancouver)
- Selecting Canada configures CASL-compliant opt-out messaging

### US-2: Canadian Lead Opt-Out
**As a** lead receiving SMS from a Canadian agent  
**I want to** opt out by texting "ARRET" or "STOP"  
**So that** I no longer receive messages and my preference is respected  

**Acceptance Criteria:**
- French opt-out keywords recognized: "ARRET", "DESABONNER"
- English opt-out keywords recognized: "STOP", "UNSUBSCRIBE", "QUIT"
- Opt-out confirmation sent in appropriate language
- No further SMS sent after opt-out

### US-3: Compliance Dashboard View
**As an** agent  
**I want to** see which country each lead is from  
**So that** I understand my compliance obligations  

**Acceptance Criteria:**
- Country flag/icon visible in lead detail view
- Country field filterable in lead list
- Compliance status indicator (opted out, opted in, pending)

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: Country Selection in Onboarding
**Priority:** P1  
**Description:** Add country selector to onboarding Step 2

**Specifications:**
- Field label: "Operating Country"
- Field type: Dropdown/select
- Options: United States, Canada
- Default: United States (or auto-detect from IP/browser locale)
- Required: Yes

**Behavior:**
- When Canada selected:
  - Timezone options show Canadian timezones (Eastern, Central, Mountain, Pacific)
  - Default timezone: America/Toronto
  - SMS compliance mode set to "CASL"
  - Opt-out keywords include French variants

#### FR-2: Country Storage in Database
**Priority:** P1  
**Description:** Store country selection in agents and leads tables

**Specifications:**
- Add `country` column to `agents` table (enum: 'US', 'CA')
- Add `country` column to `leads` table (enum: 'US', 'CA')
- Default: 'US' for existing records
- Migration: Set all existing agents to 'US'

#### FR-3: Canadian Opt-Out Keywords
**Priority:** P1  
**Description:** Recognize French and English opt-out keywords for Canadian leads

**Keywords:**
| Language | Keywords |
|----------|----------|
| English | STOP, UNSUBSCRIBE, QUIT, CANCEL, END |
| French | ARRET, DESABONNER, FIN, ANNULER |

**Behavior:**
- Case-insensitive matching
- Partial word matching (e.g., "ARRET" matches "ARRET!" or "je veux ARRET")
- French keywords only checked if lead.country = 'CA' or agent.country = 'CA'

#### FR-4: CASL-Compliant Opt-Out Confirmation
**Priority:** P1  
**Description:** Send bilingual opt-out confirmation for Canadian leads

**Message Template (English):**
```
You have been unsubscribed. You will no longer receive messages from [Agent Name]. Reply HELP for assistance.
```

**Message Template (French):**
```
Vous avez été désabonné. Vous ne recevrez plus de messages de [Agent Name]. Répondez AIDE pour assistance.
```

**Behavior:**
- Send confirmation in language of opt-out keyword
- If English keyword → English confirmation
- If French keyword → French confirmation
- Include agent name for clarity

#### FR-5: Compliance Logging
**Priority:** P2  
**Description:** Log opt-outs with country context for audit purposes

**Log Entry:**
- lead_id
- country (US/CA)
- opt_out_keyword (the exact keyword received)
- language (en/fr)
- timestamp
- compliance_framework (TCPA/CASL)

### 3.2 UI/UX Requirements

#### UI-1: Country Selector Design
- Flag icons next to country names (🇺🇸 United States, 🇨🇦 Canada)
- Clear visual indication of selection
- Help text: "This determines your compliance requirements and default timezone"

#### UI-2: Lead Detail Country Display
- Small flag icon next to phone number
- Hover tooltip shows full country name
- Filter option in lead list: "Country: All / US / Canada"

### 3.3 Technical Requirements

#### TR-1: Database Migration
```sql
-- Add country column to agents table
ALTER TABLE agents ADD COLUMN country VARCHAR(2) DEFAULT 'US' CHECK (country IN ('US', 'CA'));

-- Add country column to leads table  
ALTER TABLE leads ADD COLUMN country VARCHAR(2) DEFAULT 'US' CHECK (country IN ('US', 'CA'));

-- Update existing records
UPDATE agents SET country = 'US' WHERE country IS NULL;
UPDATE leads SET country = 'US' WHERE country IS NULL;
```

#### TR-2: Opt-Out Detection Logic
```javascript
const OPT_OUT_KEYWORDS = {
  US: ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL', 'END'],
  CA: ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL', 'END', 'ARRET', 'DESABONNER', 'FIN', 'ANNULER']
};

function detectOptOut(message, country = 'US') {
  const keywords = OPT_OUT_KEYWORDS[country] || OPT_OUT_KEYWORDS.US;
  const normalizedMessage = message.toUpperCase().trim();
  
  return keywords.some(keyword => 
    normalizedMessage.includes(keyword) ||
    normalizedMessage === keyword
  );
}
```

#### TR-3: API Changes

**Onboarding Endpoint:**
- Accept `country` field in POST /api/agents/onboard
- Validate: must be 'US' or 'CA'
- Store in agents table

**Webhook Handler:**
- Detect lead country from FUB payload (if available)
- Default to agent's country if lead country not specified
- Use country context for opt-out detection

---

## 4. Acceptance Criteria

### AC-1: Onboarding Country Selection
- [ ] Country selector visible on Step 2 of onboarding
- [ ] Canada and United States are the only options
- [ ] Selection is required to proceed
- [ ] Selecting Canada updates timezone options to Canadian timezones
- [ ] Country selection stored in agents table

### AC-2: Canadian Opt-Out Keywords
- [ ] French keywords ARRET, DESABONNER recognized for Canadian leads
- [ ] English keywords work for both US and Canadian leads
- [ ] Case-insensitive matching works
- [ ] Opt-out detected within 1 second of message receipt

### AC-3: Bilingual Confirmation Messages
- [ ] French opt-out keyword triggers French confirmation
- [ ] English opt-out keyword triggers English confirmation
- [ ] Confirmation includes agent name
- [ ] Confirmation sent within 5 seconds

### AC-4: Database Storage
- [ ] agents.country column exists with correct values
- [ ] leads.country column exists with correct values
- [ ] Existing records default to 'US'
- [ ] New records store correct country

### AC-5: Dashboard Display
- [ ] Country flag visible in lead detail
- [ ] Country filter works in lead list
- [ ] Country information visible in compliance logs

### AC-6: Compliance Logging
- [ ] Opt-out logs include country field
- [ ] Opt-out logs include language field
- [ ] Logs queryable by country

---

## 5. E2E Test Specifications

### E2E-1: Canadian Agent Onboarding
**Steps:**
1. Navigate to onboarding
2. Complete Step 1 (email, password)
3. On Step 2, select Canada as country
4. Complete remaining steps
5. Verify agent record has country='CA'

**Expected:** Agent onboarded with Canadian compliance settings

### E2E-2: Canadian Lead Opt-Out (French)
**Steps:**
1. Create Canadian lead (country='CA')
2. Send SMS to lead
3. Lead replies "ARRET"
4. Verify opt-out processed
5. Verify French confirmation sent

**Expected:** Lead opted out, French confirmation received

### E2E-3: US Lead Opt-Out (Unchanged)
**Steps:**
1. Create US lead (country='US')
2. Send SMS to lead
3. Lead replies "STOP"
4. Verify opt-out processed
5. Verify English confirmation sent

**Expected:** Lead opted out, English confirmation received

---

## 6. Open Questions

1. Should we auto-detect country from phone number prefix (+1 for US/CA, but 10-digit could be either)?
2. Do we need to support other countries in the future (UK, Australia)?
3. Should the opt-out confirmation be sent in both languages for Canada?
4. Do we need to store language preference per lead, or infer from keyword?

---

## 7. Release Criteria

- [ ] All acceptance criteria met
- [ ] E2E tests passing
- [ ] Database migrations applied
- [ ] Documentation updated
- [ ] CASL compliance review passed
