#!/usr/bin/env node
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const description = `## Task: Implement Forgot Password Flow

**Use Case:** fix-no-forgot-password-flow
**PRD:** docs/PRD-FORGOT-PASSWORD.md
**Priority:** high

## Problem
The login page (/login) has a "Forgot password?" button that shows alert('Forgot password feature coming soon!'). No real reset flow exists.

## Files to create/modify (inside product/lead-response/dashboard/)

### CREATE:
1. app/forgot-password/page.tsx — Email input form. POST /api/auth/forgot-password on submit. Show generic success message regardless of whether email exists.
2. app/reset-password/page.tsx — New password form reading ?token= from URL. POST /api/auth/reset-password. On success redirect to /login after 2s.
3. app/api/auth/forgot-password/route.ts — Look up real_estate_agents by email. If found: generate 32-byte hex token (crypto.randomBytes), SHA-256 hash it, insert into password_reset_tokens (expires_at = now+1h), invalidate old tokens for same agent, send reset email via Resend. Always return 200 (anti-enumeration).
4. app/api/auth/reset-password/route.ts — Validate token hash in password_reset_tokens (not expired, not used). If valid: bcrypt.hash new password (12 rounds), update real_estate_agents.password_hash, mark token used=true. Return 400 on invalid/expired.

### MODIFY:
5. app/login/page.tsx — Replace handleForgotPassword() alert() with router.push('/forgot-password')
6. lib/email-service.ts — Add sendPasswordResetEmail() following existing Resend pattern

### DB Migration (run via Supabase SQL editor):
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_agent_id ON password_reset_tokens(agent_id);

## Email template (password reset)
- Subject: "Reset your LeadFlow AI password"
- Greeting, context sentence, CTA button "Reset My Password" linking to /reset-password?token=<rawToken>
- Security note: expires in 1 hour; if you didn't request this, ignore it
- From: use FROM_EMAIL env var (support@leadflow.ai)

## Acceptance Criteria
1. Clicking "Forgot password?" on /login navigates to /forgot-password (no alert)
2. Submitting registered email triggers reset email via Resend within 30s
3. Non-existent email shows same generic success message (no account leak)
4. Full reset flow: click link -> set new password -> login with new password succeeds
5. Old password fails after reset
6. Reused or expired token shows error on /reset-password page
7. Client-side validation: passwords < 8 chars show error before submit
8. password_reset_tokens table exists in Supabase production`;

async function main() {
  const { data: task, error } = await sb.from('tasks').insert({
    title: 'Dev: Implement Forgot Password / Password Reset Flow',
    description,
    project_id: 'leadflow',
    agent_id: 'dev',
    model: 'sonnet',
    status: 'ready',
    priority: 2,
    use_case_id: 'fix-no-forgot-password-flow',
    prd_id: 'PRD-FORGOT-PASSWORD',
    estimated_hours: 3,
    estimated_cost_usd: 1.5,
    max_retries: 3,
    tags: ['auth', 'forgot-password', 'fix'],
    acceptance_criteria: [
      'Forgot password? button navigates to /forgot-password (no alert)',
      'Registered email triggers reset email sent via Resend',
      'Non-existent email shows same generic success message',
      'Reset link allows setting new password; new password works on login',
      'Old password rejected after reset',
      'Reused or expired token returns error on /reset-password',
      'password_reset_tokens table created in Supabase'
    ],
    metadata: { created_by: 'pm-triage', triage_task_id: '364c55b9-2f71-4f53-be7a-a115e3221503' }
  }).select().single();

  if (error) {
    console.error('Task insert error:', JSON.stringify(error));
    process.exit(1);
  }
  console.log('Dev task created:', task.id, '|', task.title);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
