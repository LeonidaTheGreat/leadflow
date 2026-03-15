# PRD: Admin Pilot Invite Flow — Direct Recruitment by Stojan

**Status:** Implemented  
**Version:** 1.0  
**Use Case:** feat-admin-pilot-invite-flow  
**Created:** 2026-03-15

---

## Overview

Enable Stojan to directly recruit pilot agents without relying on inbound traffic. Instead of waiting for agents to discover and sign up via the landing page, Stojan can proactively invite specific agents via email with a magic link that bypasses email verification.

## Problem

Pilot recruitment is blocked. We need 3 pilot agents by end of week but have 0 inbound signups. Stojan needs a way to personally invite agents he's already spoken to, without requiring them to find the landing page or go through a standard signup flow.

## Solution

A protected admin endpoint + simple UI that lets Stojan:
1. Enter an agent's name, email, and optional personal note
2. Generate a magic-link invite URL (auto-emailed to the agent)
3. Track invite status (pending / accepted / expired)
4. Agents click the magic link → account auto-activated, email verified → redirect to onboarding

## User Stories

### Stojan (Admin)
- As Stojan, I can navigate to `/admin/invite` and send a pilot invite to any agent by entering their name and email
- As Stojan, I can optionally add a personal note that appears in the invite email
- As Stojan, I receive a magic link URL I can also send manually (via WhatsApp/SMS) in case email fails
- As Stojan, I can see all sent invites and their status (pending/accepted/expired)
- As Stojan, the invite endpoint is protected by a secret token so only I can use it

### Agent (Invitee)
- As an invited agent, I receive a branded email from Stojan inviting me to pilot LeadFlow AI
- As an invited agent, I click the magic link → my account is instantly activated (no email verification needed)
- As an invited agent, I'm redirected to the onboarding dashboard immediately after accepting

## Acceptance Criteria

### AC-1: Admin Auth Protection
- POST `/api/admin/invite-pilot` requires `X-Admin-Token` header matching `ADMIN_SECRET`
- Returns 401 if token is missing or invalid

### AC-2: Input Validation
- `email` and `name` are required fields
- Returns 400 with error message if either is missing or email format is invalid

### AC-3: Successful Invite Creation
- Creates agent record in `real_estate_agents` with `status=invited`, `plan_tier=pilot`, `email_verified=true`
- Creates invite record in `pilot_invites` with 7-day expiring token
- Sends branded pilot invite email with magic link
- Returns `{ success: true, inviteUrl, agentId, expiresAt }`

### AC-4: Duplicate Handling
- If a pending (non-expired) invite already exists for the email, return the existing invite URL
- Do not create duplicate records

### AC-5: Invite Listing
- GET `/api/admin/invite-pilot?action=list` returns all invites (auth required)
- Each invite shows: email, name, message, status, invited_at, accepted_at

### AC-6: Magic Link Acceptance
- Agent visits `/accept-invite?token=<uuid>`
- Token validated against `pilot_invites` table
- Returns 400 if token missing, 404 if invalid, 410 if expired, 409 if already accepted
- On success: updates agent to `status=active, email_verified=true`, marks invite as accepted, returns `{ success: true, agentId }`
- Redirects agent to `/dashboard/onboarding` after 2s

### AC-7: Status Updates
- After acceptance, invite status updates to `accepted` with `accepted_at` timestamp

## Technical Spec

### Database
Table: `pilot_invites` (migration 014)
- `id`, `email`, `name`, `message`, `invited_by`, `invited_at`, `accepted_at`
- `token` (UUID, unique), `token_expires_at` (7 days)
- `status` (pending / accepted / expired), `agent_id` (FK → real_estate_agents)

### API Routes
- `POST /api/admin/invite-pilot` — create invite, send email
- `GET /api/admin/invite-pilot?action=list` — list all invites
- `POST /api/auth/accept-invite` — process magic-link token

### Pages
- `/admin/invite` — Stojan's invite UI (form + invite list)
- `/accept-invite?token=<uuid>` — agent magic-link landing page

### Email
- Template: `sendPilotInviteEmail()` in `lib/email-service.ts`
- Subject: "You're invited to pilot LeadFlow AI, {name}"
- Includes: personal note (if provided), value prop, "Accept Your Invite" CTA, expiry date

## Out of Scope
- Email verification flow (invites bypass this entirely)
- Rate limiting (Stojan is the only user)
- Admin dashboard authentication UI (uses ADMIN_SECRET header)
