# Cal.com API Research Report

**Task ID:** edefa2cd-cb8a-476e-ae6e-558e80a3903a  
**Date:** February 26, 2026  
**Status:** Complete

---

## 1. API Overview

Cal.com provides a **REST API v2** with comprehensive endpoints for managing bookings, event types, availability, and scheduling.

**Base URL:** `https://api.cal.com/v2`

**API Versions:**
- v2 (Current) - Recommended for new implementations
- v1 (Legacy) - Still supported but v2 preferred

---

## 2. Authentication Methods

Cal.com supports **3 authentication methods**:

### 2.1 API Key Authentication (Recommended for Server-to-Server)

- **Location:** Settings > Security in Cal.com dashboard
- **Key Prefix:** 
  - Test: `cal_`
  - Live: `cal_live_`
- **Header Format:**
  ```
  Authorization: Bearer YOUR_API_KEY
  ```
- **Rate Limit:** 120 requests/minute (can be increased)

**Pros:**
- Simple to implement
- No user interaction required
- Good for automated systems

**Cons:**
- Less secure for client-side applications
- Cannot act on behalf of users

### 2.2 OAuth 2.0 (Recommended for User-Facing Apps)

- **Approval Required:** OAuth clients must be approved by Cal.com admin
- **Create Client:** https://app.cal.com/settings/developer/oauth
- **Status Flow:** Pending → Reviewed → Approved/Rejected

**Endpoints:**
- **Authorization:** `https://app.cal.com/auth/oauth2/authorize`
- **Token Exchange:** Available after approval
- **PKCE Support:** Yes (required for public clients)

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Your OAuth client ID |
| `redirect_uri` | Yes | Must match registered URI |
| `state` | Recommended | CSRF protection |
| `code_challenge` | Public clients | PKCE S256 method |

**Pros:**
- Secure for user-facing applications
- Can act on behalf of users
- Industry standard

**Cons:**
- Requires approval process
- More complex implementation

### 2.3 Platform (Deprecated)

- **Status:** Deprecated as of December 15, 2025
- **Note:** No new signups; enterprise support only for existing customers

---

## 3. Required Headers

All API v2 requests require:

```
Authorization: Bearer {api_key_or_token}
cal-api-version: 2024-08-13  (for bookings)
cal-api-version: 2024-06-14  (for event types)
```

**Important:** Without the correct `cal-api-version` header, endpoints default to older versions.

---

## 4. Key Endpoints for Booking Links

### 4.1 Event Types (Booking Link Templates)

**Get All Event Types:**
```
GET /v2/event-types
```

**Parameters:**
- `username` - Filter by specific user
- `eventSlug` - Get specific event type
- `usernames` - Multiple users (comma-separated)
- `orgSlug` / `orgId` - Organization context
- `sortCreatedAt` - Sort by creation (asc/desc)

**Response:** Returns event types with their booking URLs, durations, availability settings.

### 4.2 Slots (Available Time Slots)

**Get Available Slots:**
```
GET /v2/slots
```

**Query Methods:**

| Method | Parameters |
|--------|------------|
| By Event Type ID | `?eventTypeId=10&start=2050-09-05&end=2050-09-06` |
| By Slug + Username | `?eventTypeSlug=intro&username=bob&start=2050-09-05` |
| By Organization | Add `organizationSlug=org-slug` |
| By Team | `?eventTypeSlug=intro&teamSlug=team-slug` |

**Optional Parameters:**
- `timeZone` - Return slots in specific timezone (default: UTC)
- `duration` - Slot duration in minutes (default: 30)
- `format` - Use `range` to get start/end times
- `bookingUidToReschedule` - For rescheduling existing bookings

### 4.3 Bookings

**Create a Booking:**
```
POST /v2/bookings
```

**Request Body:**
```json
{
  "eventTypeId": 123,
  "start": "2025-03-15T09:00:00.000Z",
  "attendee": {
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+19876543210"
  },
  "instant": false,
  "metadata": {}
}
```

**Key Notes:**
- `start` must be in UTC (no timezone offset)
- Supports regular, recurring, and instant bookings
- Can book by `eventTypeId` OR `eventTypeSlug` + `username`
- SMS reminders require `attendee.phoneNumber`

**Get All Bookings:**
```
GET /v2/bookings
```

**Filter Parameters:**
- `status` - upcoming, past, cancelled, unconfirmed, recurring
- `attendeeEmail`, `attendeeName`
- `eventTypeIds`, `teamIds`
- `afterStart`, `beforeEnd`, `afterCreatedAt`

### 4.4 User Profile

**Get Current User:**
```
GET /v2/me
```

Returns: username, email, timezone, organization info, default schedule

---

## 5. Booking Link Generation

### 5.1 Public Booking URLs

Cal.com booking links follow this pattern:

```
https://cal.com/{username}/{event-slug}
https://cal.com/team/{team-slug}/{event-slug}
https://cal.com/{org-slug}/{username}/{event-slug}
```

### 5.2 Programmatic Generation Flow

1. **Get Event Types** → `GET /v2/event-types` (filter by username/org)
2. **Extract booking URLs** from response (each event type has a public URL)
3. **Get Available Slots** → `GET /v2/slots` (optional, for custom UI)
4. **Create Booking** → `POST /v2/bookings` (server-side)

---

## 6. Implementation Recommendations

### 6.1 For LeadFlow Use Case

**Recommended Architecture:**

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LeadFlow UI   │────▶│  Backend Server  │────▶│   Cal.com API   │
│                 │     │  (API Key Auth)  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Why API Key over OAuth:**
- LeadFlow is server-to-server integration
- No need for end-users to authorize
- Simpler implementation
- Single source of truth for scheduling

### 6.2 Implementation Steps

1. **Get API Key**
   - Create account at cal.com
   - Generate API key (Settings > Security)
   - Note the prefix (cal_ or cal_live_)

2. **Store Credentials Securely**
   - Environment variables
   - Secrets manager (never in code)

3. **Fetch Event Types**
   ```javascript
   const response = await fetch('https://api.cal.com/v2/event-types', {
     headers: {
       'Authorization': 'Bearer ' + process.env.CAL_API_KEY,
       'cal-api-version': '2024-06-14'
     }
   });
   ```

4. **Generate Booking Links**
   - Use `eventType.link` from response, OR
   - Construct: `https://cal.com/{username}/{eventType.slug}`

5. **Optional: Custom Booking Flow**
   - Fetch available slots: `GET /v2/slots`
   - Display custom calendar UI
   - Create booking via API: `POST /v2/bookings`

### 6.3 Error Handling

- All requests require HTTPS
- 401 = Invalid/expired API key
- 429 = Rate limit exceeded (120/min default)
- Always check `cal-api-version` header for version mismatch errors

### 6.4 Webhooks (Recommended)

For real-time updates, set up webhooks to receive:
- Booking created
- Booking rescheduled
- Booking cancelled

---

## 7. API Limitations

| Limit | Value |
|-------|-------|
| Rate Limit (API Key) | 120 req/min |
| Custom Rate Limit | Available on request |
| Max Duration Query | No explicit limit |
| Supported Time Formats | ISO 8601 UTC |

---

## 8. Documentation Resources

- **Main Docs:** https://cal.com/docs/api-reference/v2/introduction
- **API Index:** https://cal.com/docs/llms.txt
- **OAuth Setup:** https://app.cal.com/settings/developer/oauth
- **OpenAPI Spec:** Available at api-reference/v2/openapi.json

---

## 9. Next Steps for LeadFlow

1. ✅ Sign up for Cal.com account
2. ✅ Generate API key
3. ⬜ Implement `GET /v2/event-types` to fetch available booking types
4. ⬜ Generate booking links (public URLs or custom flow)
5. ⬜ Optionally implement `POST /v2/bookings` for server-side booking
6. ⬜ Set up webhooks for booking notifications
7. ⬜ Test with sandbox (cal_ prefix keys)
8. ⬜ Switch to production (cal_live_ prefix keys)

---

**Unblocks:** Cal.com Booking Links implementation  
**Parent Task:** Cal.com Booking Links
