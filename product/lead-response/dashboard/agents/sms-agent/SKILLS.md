---
title: SKILLS.md - LeadFlow SMS Agent
author: Stojan
date: 2026-02-22
tags: [sms-agent, skills, capabilities]
project: leadflow-ai
---

# LeadFlow SMS Agent - SKILLS.md

## Available Skills

### 1. qualify_lead
**Purpose:** Guide conversation to collect lead qualification info
**Input:** Current conversation state, lead's last message
**Output:** Next question or response to move qualification forward
**Rules:**
- Check what info is already known
- Ask the next logical question
- Acknowledge their response before asking

### 2. acknowledge_info
**Purpose:** Confirm understanding of info provided by lead
**Input:** What they told you (location, budget, etc.)
**Output:** Natural acknowledgment + transition to next question
**Examples:**
- "Got it, Etobicoke! That's a great area."
- "Nice, $1.5M budget gives us good options."

### 3. offer_value
**Purpose:** Present next steps when qualified
**Input:** Lead's qualification status
**Output:** Offer to send listings, book showing, or provide info
**When to use:** When you have enough info to be helpful

### 4. handle_objection
**Purpose:** Respond to common concerns
**Input:** Objection text
**Output:** Empathetic response + reframe
**Common objections:**
- "Just looking" → "No problem! What's your timeline?"
- "Not ready yet" → "Totally understand. Want me to send some options for when you are?"
- "Working with another agent" → "Respect that! Mind if I check in later?"

### 5. search_listings
**Purpose:** Query available properties matching criteria
**Input:** location, property_type, bedrooms, bathrooms, budget_min, budget_max
**Output:** List of matching properties (or "none found")
**Note:** This is a placeholder for future MLS integration

### 6. book_showing
**Purpose:** Initiate showing booking process
**Input:** Lead info, property interest
**Output:** Handoff message to human agent
**Note:** Always escalate to human for actual scheduling

### 7. escalate_to_human
**Purpose:** Transfer conversation to human agent
**Input:** Reason for escalation, conversation summary
**Output:** Handoff message to lead + notification to agent
**When to use:** Complex questions, ready to book, frustration detected

## Conversation State Machine

```
[START] → [NEED_NAME] → [NEED_LOCATION] → [NEED_PROPERTY_TYPE] 
   ↓
[NEED_SIZE] → [NEED_BUDGET] → [NEED_TIMELINE] → [QUALIFIED] → [OFFER_VALUE]
```

State transitions happen when info is collected. Skip states if info already known.

## Context Tracking

The agent tracks:
- messages[]: Full conversation history
- state: Current qualification state
- known_fields: What we've learned
- last_question: What we asked (to detect answers)
- agent_info: Who we're representing

## Response Generation Rules

1. **Check state first** - What do we know? What's missing?
2. **Read their message** - Did they answer our last question?
3. **Update state** - Mark any new info as known
4. **Decide next action:**
   - If they answered → acknowledge → ask next question
   - If they asked something → answer → then continue
   - If fully qualified → offer value
5. **Generate response** using SOUL.md personality

## Error Handling

If AI generation fails:
1. Log error
2. Use template response based on state
3. Continue qualification flow

## Tools Available

- supabase: Read/write conversation, lead data
- ai_generate: Generate response (Qwen3 or Claude)
- send_sms: Send response via Twilio
- log_event: Log to events table for debugging
