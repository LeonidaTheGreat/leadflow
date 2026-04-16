# LeadFlow API Reference

Manual reference for all API endpoints. Two deployment surfaces:

- **Webhook API** — Express server (`server.js`, `routes/`). Deployed on Vercel as `fub-inbound-webhook.vercel.app`.
- **Dashboard API** — Next.js app router (`product/lead-response/dashboard/app/api/`). Deployed on Vercel as `leadflow-ai-five.vercel.app`.

Auth: `LEADFLOW_API_KEY` header for Webhook API. JWT session cookie or `Authorization: Bearer <token>` for Dashboard API.

---

## Webhook API (`routes/`)

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Root health check |
| GET | `/health` | None | System status (DB, circuit breakers) |
| GET | `/health/breakers` | None | Circuit breaker metrics |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook/stripe` | Stripe signature | Stripe billing events (subscription created/cancelled) |
| POST | `/webhook/calcom` | None | Cal.com booking events (BOOKING_CREATED, BOOKING_CANCELLED) |

### Billing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/billing/checkout` | API key | Create Stripe checkout session |
| POST | `/api/billing/portal` | API key | Create Stripe customer portal session |
| GET | `/api/billing/status/:userId` | API key | Get subscription status for a user |

### Cal.com Webhook Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/calcom/webhooks` | API key | List registered Cal.com webhooks |
| POST | `/api/calcom/webhooks` | API key | Register a new Cal.com webhook |
| DELETE | `/api/calcom/webhooks/:id` | API key | Delete a Cal.com webhook |
| GET | `/api/calcom/webhooks/:id/stats` | API key | Stats for a specific webhook |
| POST | `/api/calcom/webhooks/:id/test` | API key | Send test event to a webhook |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/activation-list` | API key | List agents eligible for activation outreach |
| POST | `/api/admin/send-activation-email` | API key | Send activation email to a pilot agent |

### Cron

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cron/weekly-performance` | API key | Run weekly performance report |
| GET | `/api/cron/weekly-performance/preview` | API key | Preview weekly report (no send) |
| GET | `/api/cron/dead-letter-replay` | API key | Replay dead-letter queue |
| GET | `/api/cron/check-stuck-pilots` | API key | Alert on pilots stuck in onboarding |

---

## Dashboard API (`app/api/`)

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | None | Email/password login, sets session cookie |
| POST | `/api/auth/logout` | Session | Clear session cookie |
| GET | `/api/auth/me` | Session | Get current user profile |
| GET | `/api/auth/session` | Session | Validate session |
| POST | `/api/auth/forgot-password` | None | Send password reset email |
| POST | `/api/auth/reset-password` | None | Reset password with token |
| POST | `/api/auth/verify-email` | None | Verify email address |
| POST | `/api/auth/resend-verification` | None | Resend email verification |
| POST | `/api/auth/accept-invite` | None | Accept pilot invite and set password |
| POST | `/api/auth/pilot-signup` | None | Pilot program signup |
| GET | `/api/auth/pilot-status` | Session | Get pilot program status |
| POST | `/api/auth/trial-signup` | None | Free trial signup |
| GET | `/api/auth/trial-status` | Session | Get trial status |

### Webhooks (Lead Intake)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhook` | None | Generic lead webhook: creates lead, qualifies, sends AI SMS |
| POST | `/api/webhook/fub` | FUB signature | Follow Up Boss lead webhook |
| POST | `/api/webhook/twilio` | Twilio signature | Inbound SMS from Twilio |
| POST | `/api/webhook/stripe` | Stripe signature | Stripe events (dashboard-side) |
| POST | `/api/webhook/calcom` | None | Cal.com booking events (dashboard-side) |
| POST | `/api/webhooks/stripe` | Stripe signature | Stripe webhook (alternate path) |

### Agents (Customer Profile)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/agents/profile` | Session | Get agent profile and settings |
| POST | `/api/agents/create` | None | Create new agent account |
| POST | `/api/agents/onboard` | Session | Submit onboarding data |
| GET | `/api/agents/check-email` | None | Check if email is available |
| POST | `/api/agents/satisfaction-ping` | Session | Record satisfaction signal |

### Onboarding

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/onboarding/submit` | Session | Submit onboarding form |
| POST | `/api/onboarding/complete` | Session | Mark onboarding complete |
| GET | `/api/onboarding/validate` | Session | Validate onboarding state |
| POST | `/api/onboarding/draft` | Session | Save onboarding draft |
| GET | `/api/onboarding/check-email` | None | Email availability check |
| POST | `/api/onboarding/log-event` | Session | Log onboarding funnel event |
| GET | `/api/onboarding/health` | Session | Onboarding health check |
| GET | `/api/onboarding/simulator-status` | Session | Status of lead simulator |
| POST | `/api/onboarding/simulator` | Session | Trigger lead simulator |
| GET | `/api/onboarding/simulator/status` | Session | Simulator run status |
| POST | `/api/onboarding/send-aha-day1` | Session | Send Day 1 aha-moment email |
| POST | `/api/onboarding/send-aha-day3` | Session | Send Day 3 aha-moment email |
| GET | `/api/onboarding/fub/status` | Session | FUB connection status |
| POST | `/api/onboarding/fub/validate-key` | Session | Validate FUB API key |
| GET | `/api/onboarding/fub/webhook-url` | Session | Get FUB webhook URL |
| POST | `/api/onboarding/fub/complete` | Session | Mark FUB setup complete |
| GET | `/api/onboarding/fub/test-status` | Session | FUB test connection status |

### Agent Onboarding (Phone Provisioning)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/agents/onboarding/provision-phone` | Session | Provision Twilio phone number |
| POST | `/api/agents/onboarding/configure-phone` | Session | Configure phone settings |
| POST | `/api/agents/onboarding/verify-sms` | Session | Verify SMS with test message |
| GET | `/api/agents/onboarding/status` | Session | Onboarding step status |
| POST | `/api/agents/onboarding/fub-connect` | Session | Connect FUB account |
| POST | `/api/agents/onboarding/complete` | Session | Complete agent onboarding |

### Leads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/lead-capture` | None | Lead magnet email capture |
| GET | `/api/leads/[id]/messages` | Session | Get conversation messages for a lead |
| GET | `/api/leads/sample-status` | Session | Sample lead loading status |
| GET | `/api/sample-leads` | Session | List sample/demo leads |

### SMS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sms/send` | Session | Send manual SMS to a lead |
| POST | `/api/sms/send-manual` | Session | Send agent-authored SMS |
| POST | `/api/sms/ai-suggest` | Session | Get AI reply suggestions |
| GET | `/api/sms/status` | Twilio signature | Twilio delivery status callback |

### Billing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/billing/create-checkout` | Session | Create Stripe checkout session |
| POST | `/api/billing/create-checkout-session` | Session | Create checkout session (alternate) |
| GET | `/api/billing/mrr-snapshot` | Admin | Current MRR snapshot |
| POST | `/api/stripe/upgrade-checkout` | Session | Upgrade subscription checkout |
| GET | `/api/stripe/portal-session` | Session | Stripe customer portal |

### Trial

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/trial/start` | Session | Start free trial |
| GET | `/api/trial/status` | Session | Get trial status and days remaining |
| GET | `/api/trial/nudge` | Session | Get trial upgrade nudge content |
| POST | `/api/trial/dismiss-nudge` | Session | Dismiss trial nudge |
| POST | `/api/trial-signup` | None | Public trial signup (alternate path) |

### NPS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/nps/prompt-status` | Session | Whether NPS prompt should show |
| GET | `/api/nps/prompt` | Session | Get NPS prompt content |
| POST | `/api/nps/submit` | Session | Submit NPS score and comment |
| POST | `/api/nps/dismiss` | Session | Dismiss NPS prompt |
| POST | `/api/nps/verify` | Admin | Verify NPS responses |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/analytics/event` | None | Track frontend analytics event |
| GET | `/api/analytics/dashboard` | Session | Dashboard analytics summary |
| GET | `/api/analytics/sms-stats` | Session | SMS delivery stats |
| POST | `/api/page-views` | None | Record page view |
| POST | `/api/booking` | None | Record booking conversion event |

### Setup

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/setup/status` | Session | Setup completion status |
| GET | `/api/setup/progress` | Session | Setup wizard progress |
| POST | `/api/setup/complete` | Session | Mark setup complete |
| POST | `/api/setup/send-test-sms` | Session | Send test SMS during setup |

### Satisfaction / Referrals / Sequences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/satisfaction/events` | Session | Log satisfaction event |
| GET | `/api/satisfaction/stats` | Session | Satisfaction stats |
| POST | `/api/referrals/generate` | Session | Generate referral link |
| GET | `/api/referrals/stats` | Session | Referral stats |
| POST | `/api/sequences/[id]/pause` | Session | Pause email sequence |
| POST | `/api/sequences/[id]/resume` | Session | Resume email sequence |

### Metrics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/metrics/roi` | Session | ROI metrics for agent |

### Admin (Dashboard)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/pilots` | Admin | List all pilot agents |
| GET | `/api/admin/pilots/[agentId]` | Admin | Get pilot agent details |
| GET | `/api/admin/conversations` | Admin | List all agent conversations |
| POST | `/api/admin/invite-pilot` | Admin | Invite a new pilot agent |
| GET | `/api/admin/outreach-candidates` | Admin | Agents eligible for outreach |
| POST | `/api/admin/simulate-lead` | Admin | Trigger lead simulation for agent |
| GET | `/api/admin/demo-link` | Admin | Get demo booking link |
| GET | `/api/admin/nps` | Admin | NPS aggregate results |
| GET | `/api/admin/funnel` | Admin | Signup funnel metrics |
| GET | `/api/admin/funnel/checkout-attempts` | Admin | Checkout attempt data |
| GET | `/api/admin/funnel/trial-activation` | Admin | Trial activation funnel |
| GET | `/api/admin/metrics/aha-moment` | Admin | Aha-moment metric stats |
| GET | `/api/admin/a2p-status` | Admin | A2P 10DLC registration status |
| GET | `/api/admin/gtm-status` | Admin | GTM tag status |
| GET | `/api/admin/triage-use-cases` | Admin | Use cases needing triage |
| GET | `/api/admin/pilot-campaigns` | Admin | List pilot outreach campaigns |
| POST | `/api/admin/pilot-campaigns` | Admin | Create pilot campaign |
| GET | `/api/admin/pilot-campaigns/[id]/stats` | Admin | Campaign stats |
| GET | `/api/admin/pilot-campaigns/[id]/targets` | Admin | Campaign targets |
| POST | `/api/admin/pilot-targets/[id]/invite` | Admin | Send invite to campaign target |
| GET | `/api/admin/pilot-targets/[id]` | Admin | Get target details |

### Cron (Dashboard)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cron/follow-up` | Cron key | Run lead follow-up sequences |
| GET | `/api/cron/expire-trials` | Cron key | Expire ended trials |
| GET | `/api/cron/send-trial-emails` | Cron key | Send trial nurture emails |
| GET | `/api/cron/nps-surveys` | Cron key | Send NPS survey emails |
| GET | `/api/cron/inactivity-alerts` | Cron key | Alert on inactive agents |
| GET | `/api/cron/inactivity-check` | Cron key | Check for inactivity signals |
| GET | `/api/cron/pilot-trial-cta` | Cron key | Send pilot conversion CTAs |
| GET | `/api/cron/pilot-stuck-check` | Cron key | Alert on stuck pilot onboarding |
| GET | `/api/cron/check-stuck-agents` | Cron key | Check for stuck agent states |

### Internal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/internal/pilot-usage` | Internal key | Pilot usage stats |
| POST | `/api/internal/send-activation-emails` | Internal key | Trigger activation email batch |

### Test / Smoke

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/test-lead` | None | Submit test lead (dev only) |
| POST | `/api/pilot-signup` | None | Pilot signup form submission |
| GET | `/api/smoke/stripe-checkout-e2e` | Internal key | Smoke test: Stripe checkout flow |

---

## Notes

- **Admin auth**: Routes under `/api/admin/` verify the session has `role = 'admin'` in the JWT payload.
- **Cron auth**: Cron routes verify `Authorization: Bearer <CRON_SECRET>` from Vercel Cron.
- **Internal auth**: Internal routes verify `x-internal-key` header against `INTERNAL_API_KEY`.
- **No rate limits** are currently enforced on the Dashboard API (planned).
- All responses are JSON. Error responses always include `{ error: string }`.
