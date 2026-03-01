---
title: LeadFlow API Design Document
author: Stojan
date: 2026-02-21
tags: [api, design, leadflow, integration]
project: business-opportunities-2026
priority: high
status: draft
category: technical-spec
---

# LeadFlow API Design

## Overview

LeadFlow is an AI-powered lead response system for real estate agents. This document outlines the API design and integration points.

## Key Integrations

- **Follow Up Boss (FUB)**: CRM webhook integration
- **Twilio**: SMS sending capabilities
- **Cal.com**: Appointment scheduling
- **Anthropic Claude**: AI conversation handling

## Authentication

All API endpoints require authentication via API keys passed in the `Authorization` header.

## Endpoints

### POST /api/webhook/fub

Receives lead updates from Follow Up Boss CRM.

### POST /api/sms/send

Sends SMS messages via Twilio.

## Data Models

### Lead

```json
{
  "id": "string",
  "source": "fub|manual",
  "status": "new|contacted|qualified",
  "assigned_agent": "string"
}
```

## Notes

- Webhook processing should be idempotent
- SMS rate limiting: 10 messages/minute per lead
