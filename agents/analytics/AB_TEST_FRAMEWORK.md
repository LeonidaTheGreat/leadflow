# 🧪 A/B Testing Framework — AI Lead Response System

**Version:** 1.0  
**Last Updated:** 2026-02-16  
**Owner:** Analytics Agent  
**Tool:** PostHog Feature Flags + Experiments

---

## 🎯 Overview

This document defines the A/B testing methodology, experiment templates, and testing roadmap for the AI Lead Response System.

---

## 🏗️ Testing Framework

### Test Categories

| Category | Examples | Impact Level | Test Duration |
|----------|----------|--------------|---------------|
| **SMS Content** | Templates, tone, CTAs | High | 1-2 weeks |
| **AI Prompts** | Qualification, response style | High | 2-3 weeks |
| **Timing** | Response delays, follow-up cadence | Medium | 1-2 weeks |
| **UI/UX** | Dashboard changes, onboarding | Medium | 2-4 weeks |
| **Pricing** | Plan tiers, free trial length | High | 4-6 weeks |

### Success Metrics by Category

| Category | Primary Metric | Secondary Metrics |
|----------|----------------|-------------------|
| SMS Content | Reply Rate | Booking Conversion, Opt-out Rate |
| AI Prompts | Booking Conversion | AI Confidence, Response Time |
| Timing | Reply Rate | Lead Satisfaction (survey) |
| UI/UX | Feature Adoption | Time-to-Value, NPS |
| Pricing | Conversion Rate | LTV, Churn Rate |

---

## 📋 Experiment Template

### Pre-Experiment Checklist

```markdown
## Experiment: [NAME]

### Hypothesis
We believe that [change] will [effect] because [reasoning].

### Success Criteria
- **Primary Metric:** [metric] improves by [%]
- **Minimum Detectable Effect:** [%]
- **Statistical Significance:** p < 0.05
- **Sample Size:** [N] per variant
- **Runtime:** [X] days

### Variants
- **Control (A):** Current implementation
- **Treatment (B):** [description]
- **Treatment (C):** [if applicable]

### Segment
- **Target:** [all users | new users | segment]
- **Traffic Split:** [50/50 | 33/33/33 | etc.]
- **Exclusions:** [criteria]

### Risk Assessment
- **Risk Level:** [Low | Medium | High]
- **Rollback Plan:** [description]
- **Monitoring:** [metrics to watch]
```

---

## 🧪 Active & Planned Tests

### Test 1: SMS Initial Response Templates

**Status:** 🟡 Ready to Launch  
**Priority:** P0

#### Hypothesis
Using a more casual, emoji-friendly tone in initial SMS responses will increase reply rates among younger demographics (25-40).

#### Variants

**Control (A):** Current Professional
```
Hi [Name], this is [Agent] from [Company]. Thanks for your interest! I'd love to help you find your perfect home. When would be a good time for a quick call? Book here: [Link]
```

**Treatment (B):** Casual + Emoji
```
Hey [Name]! 👋 [Agent] here — excited to help with your home search! 🏡 Want to chat about what you're looking for? Grab a time that works for you: [Link]
```

**Treatment (C):** Ultra-Short
```
Hi [Name], [Agent] here! Ready to help you find your dream home. Quick chat this week? [Link]
```

#### Metrics

| Metric | Target | Minimum Effect |
|--------|--------|----------------|
| Reply Rate | 45% | +5% vs Control |
| Booking Conversion | 15% | No decrease |
| Opt-out Rate | <2% | No increase |

#### Configuration
```javascript
// PostHog Feature Flag
{
  "key": "sms_initial_template_v2",
  "variants": {
    "control": 33,
    "casual_emoji": 33,
    "ultra_short": 34
  },
  "payload": {
    "control": { "template_id": "initial_professional_v1" },
    "casual_emoji": { "template_id": "initial_casual_v2" },
    "ultra_short": { "template_id": "initial_short_v1" }
  }
}
```

#### Runtime
- **Start:** Week 1 of pilot
- **Duration:** 14 days
- **Sample Size:** 500 leads per variant

---

### Test 2: AI Response Timing

**Status:** 🟡 Ready to Launch  
**Priority:** P0

#### Hypothesis
Adding a 15-second delay before sending AI responses will increase perceived "human-ness" and improve reply rates.

#### Variants

**Control (A):** Immediate (<5 seconds)
**Treatment (B):** 15-second delay
**Treatment (C):** 30-second delay

#### Metrics

| Metric | Target | Minimum Effect |
|--------|--------|----------------|
| Reply Rate | 45% | +3% vs Control |
| Response Time | <30s avg | Acceptable increase |
| Agent Satisfaction | >4.0/5 | No decrease |

#### Configuration
```javascript
{
  "key": "ai_response_timing",
  "variants": {
    "immediate": 33,
    "delay_15s": 33,
    "delay_30s": 34
  },
  "payload": {
    "immediate": { "delay_ms": 0 },
    "delay_15s": { "delay_ms": 15000 },
    "delay_30s": { "delay_ms": 30000 }
  }
}
```

---

### Test 3: Booking CTA Placement

**Status:** 🟢 Planned  
**Priority:** P1

#### Hypothesis
Placing the booking link earlier in the SMS message will increase click-through and booking rates.

#### Variants

**Control (A):** Link at end
```
Hi [Name], this is [Agent]. Thanks for reaching out! I'd love to learn more about what you're looking for. When works for a quick call? Book here: [Link]
```

**Treatment (B):** Link in middle
```
Hi [Name], this is [Agent]. Book a time here: [Link] — I'd love to learn more about what you're looking for in your home search.
```

**Treatment (C):** Link only
```
Hi [Name], [Agent] here. Ready when you are: [Link]
```

#### Metrics

| Metric | Target | Minimum Effect |
|--------|--------|----------------|
| Booking Conversion | 15% | +2% vs Control |
| Reply Rate | 40% | No decrease |
| Opt-out Rate | <2% | No increase |

---

### Test 4: Qualification Threshold

**Status:** 🟢 Planned  
**Priority:** P1

#### Hypothesis
Raising the AI confidence threshold for auto-sending will reduce inappropriate messages and improve overall conversion.

#### Variants

**Control (A):** 0.70 threshold (current)
**Treatment (B):** 0.80 threshold
**Treatment (C):** 0.90 threshold

#### Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Booking Conversion | 18% | Improvement expected |
| Human Handoff Rate | <10% | Acceptable increase |
| Lead Complaints | <0.5% | Reduction expected |

---

### Test 5: Follow-up Cadence

**Status:** 🟢 Planned  
**Priority:** P2

#### Hypothesis
An optimized follow-up sequence with varied timing will re-engage more leads than the current fixed 24-hour interval.

#### Variants

**Control (A):** Fixed 24h
- Day 1: Initial response
- Day 2: Follow-up
- Day 3: Final follow-up

**Treatment (B):** Smart Timing
- Immediate: Initial response
- +4 hours: If no reply
- +24 hours: If no reply
- +72 hours: Final attempt

**Treatment (C):** Value-Add Sequence
- Immediate: Initial
- +24h: Market insight
- +48h: Similar listings
- +72h: Final check-in

#### Metrics

| Metric | Target | Minimum Effect |
|--------|--------|----------------|
| Reply Rate | 45% | +8% vs Control |
| Opt-out Rate | <2% | No increase |
| Booking Conversion | 15% | +3% vs Control |

---

### Test 6: Pricing Page Layout

**Status:** 🟢 Planned  
**Priority:** P2

#### Hypothesis
Highlighting the middle-tier plan with visual emphasis will increase upgrade rates and ARPU.

#### Variants

**Control (A):** Current layout (equal emphasis)
**Treatment (B):** Highlight Growth plan
**Treatment (C):** Show annual discount prominently

#### Metrics

| Metric | Target | Minimum Effect |
|--------|--------|----------------|
| Conversion Rate | 15% | +2% vs Control |
| ARPU | $150 | +$15 vs Control |
| Upgrade Rate | 20% | +5% vs Control |

---

## 🔧 Implementation Guide

### Setting Up a Test in PostHog

```javascript
// 1. Create Feature Flag (in PostHog UI or API)
const featureFlag = {
  key: "experiment_name",
  name: "Descriptive Name",
  filters: {
    groups: [{
      properties: [],
      rollout_percentage: 100
    }]
  },
  multivariate: {
    variants: [
      { key: "control", rollout_percentage: 50 },
      { key: "treatment", rollout_percentage: 50 }
    ]
  }
}

// 2. Check variant in code
import posthog from 'posthog-js'

function getSMSVariant(leadId) {
  const variant = posthog.getFeatureFlag('sms_initial_template_v2')
  
  // Ensure consistent variant per lead
  posthog.capture('experiment_enrolled', {
    experiment: 'sms_initial_template_v2',
    variant: variant,
    lead_id: leadId
  })
  
  return variant
}

// 3. Apply variant
async function sendInitialSMS(lead) {
  const variant = getSMSVariant(lead.id)
  
  const templates = {
    'control': 'initial_professional_v1',
    'casual_emoji': 'initial_casual_v2',
    'ultra_short': 'initial_short_v1'
  }
  
  const templateId = templates[variant] || templates['control']
  await sendSMSTemplate(lead, templateId)
}
```

### Event Tracking for Experiments

```javascript
// Required events for experiment analysis

// When user enters experiment
posthog.capture('experiment_enrolled', {
  experiment: 'sms_initial_template_v2',
  variant: 'casual_emoji',
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789'
})

// When experiment affects behavior
posthog.capture('sms_template_used', {
  experiment: 'sms_initial_template_v2',
  variant: 'casual_emoji',
  template_id: 'initial_casual_v2',
  lead_id: 'lead_abc123'
})

// Conversion event (primary metric)
posthog.capture('appointment_booked', {
  experiment: 'sms_initial_template_v2',
  variant: 'casual_emoji',
  lead_id: 'lead_abc123',
  // ... other properties
})
```

### Statistical Significance

```python
# Using Python for experiment analysis
import numpy as np
from scipy import stats

def calculate_significance(control_conversions, control_total, 
                           treatment_conversions, treatment_total):
    """
    Calculate statistical significance using Z-test for proportions
    """
    # Conversion rates
    control_rate = control_conversions / control_total
    treatment_rate = treatment_conversions / treatment_total
    
    # Pooled probability
    pooled_p = (control_conversions + treatment_conversions) / (control_total + treatment_total)
    
    # Standard error
    se = np.sqrt(pooled_p * (1 - pooled_p) * (1/control_total + 1/treatment_total))
    
    # Z-score
    z_score = (treatment_rate - control_rate) / se
    
    # P-value (two-tailed)
    p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
    
    return {
        'control_rate': control_rate,
        'treatment_rate': treatment_rate,
        'lift': (treatment_rate - control_rate) / control_rate,
        'z_score': z_score,
        'p_value': p_value,
        'significant': p_value < 0.05
    }

# Example usage
result = calculate_significance(
    control_conversions=75, control_total=500,
    treatment_conversions=95, treatment_total=500
)

print(f"Lift: {result['lift']:.1%}")
print(f"P-value: {result['p_value']:.4f}")
print(f"Statistically Significant: {result['significant']}")
```

---

## 📊 Experiment Results Template

```markdown
## Experiment Results: [NAME]

### Summary
- **Status:** [Running | Completed | Stopped]
- **Duration:** [Start] to [End] ([X] days)
- **Sample Size:** [N] total ([N] control, [N] treatment)

### Results

| Metric | Control | Treatment | Lift | P-value | Significant |
|--------|---------|-----------|------|---------|-------------|
| Primary | X% | Y% | +Z% | 0.XXX | ✅ / ❌ |
| Secondary 1 | X% | Y% | +Z% | 0.XXX | ✅ / ❌ |
| Secondary 2 | X% | Y% | +Z% | 0.XXX | ✅ / ❌ |

### Key Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### Recommendations
- [ ] Roll out winning variant
- [ ] Iterate and run follow-up test
- [ ] Revert to control
- [ ] Run longer for more data

### Learnings
[What we learned about our users/product]
```

---

## 🗓️ Testing Roadmap

### Q1 2026

| Week | Test | Priority | Owner |
|------|------|----------|-------|
| 1-2 | SMS Initial Templates | P0 | Analytics |
| 1-2 | Response Timing | P0 | Analytics |
| 3-4 | Booking CTA Placement | P1 | Product |
| 3-4 | Qualification Threshold | P1 | AI Team |

### Q2 2026

| Month | Test | Priority | Owner |
|-------|------|----------|-------|
| April | Follow-up Cadence | P2 | Growth |
| April | Pricing Page Layout | P2 | Growth |
| May | AI Tone Variations | P2 | AI Team |
| May | Dashboard Onboarding | P2 | Product |
| June | SMS Length | P3 | Analytics |
| June | Voice vs SMS Preference | P3 | Product |

---

## ⚠️ Testing Guidelines

### Do's ✅
- Run tests for at least 1 full business cycle (7 days minimum)
- Calculate sample size before starting
- Track guardrail metrics (opt-outs, complaints)
- Document all learnings, even from "failed" tests
- Use consistent randomization keys (lead_id, agent_id)

### Don'ts ❌
- Stop tests early (except for significant negative impact)
- Run multiple tests on the same metric simultaneously
- Ignore segment differences (mobile vs desktop, source, etc.)
- Skip documentation of "failed" experiments

### Sample Size Calculator

```javascript
// Minimum sample size per variant for 80% power
function calculateSampleSize(
  baselineRate,    // e.g., 0.15 for 15%
  minDetectableEffect, // e.g., 0.20 for 20% relative
  alpha = 0.05,    // Significance level
  power = 0.80     // Statistical power
) {
  const p1 = baselineRate
  const p2 = baselineRate * (1 + minDetectableEffect)
  const pooledP = (p1 + p2) / 2
  
  const zAlpha = 1.96  // For alpha = 0.05
  const zPower = 0.84  // For power = 0.80
  
  const n = (
    2 * pooledP * (1 - pooledP) * Math.pow(zAlpha + zPower, 2)
  ) / Math.pow(p2 - p1, 2)
  
  return Math.ceil(n)
}

// Example: Detect 20% improvement on 15% baseline
const sampleSize = calculateSampleSize(0.15, 0.20)
console.log(`Need ${sampleSize} per variant`)
// Output: Need ~2,500 per variant
```

---

## 📝 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-16 | 1.0 | Initial A/B testing framework |

---

**Questions?** Contact @AnalyticsAgent
