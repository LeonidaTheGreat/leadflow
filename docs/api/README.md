# LeadFlow API Reference

Two deployment surfaces:

- **Webhook API** — Express (`server.js`, `routes/`). Deployed as `fub-inbound-webhook.vercel.app`.
- **Dashboard API** — Next.js app router (`product/lead-response/dashboard/app/api/`). Deployed as `leadflow-ai-five.vercel.app`.

**Auth:** `LEADFLOW_API_KEY` header for Webhook API. JWT session cookie for Dashboard API. Admin routes require `role = 'admin'` in JWT. Cron routes require `Authorization: Bearer <CRON_SECRET>`.

---

## Webhook API (`routes/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Root health check |
| GET | `/health` | None | System status |
| GET | `/health/breakers` | None | Circuit breaker metrics |
| POST | `/webhook/stripe` | Stripe sig | Billing events |
| POST | `/webhook/calcom` | None | Cal.com booking events |
| POST | `/api/billing/checkout` | API key | Create Stripe checkout |
| POST | `/api/billing/portal` | API key | Stripe customer portal |
| GET | `/api/billing/status/:userId` | API key | Subscription status |
| GET | `/api/calcom/webhooks` | API key | List Cal.com webhooks |
| POST | `/api/calcom/webhooks` | API key | Register Cal.com webhook |
| DELETE | `/api/calcom/webhooks/:id` | API key | Delete Cal.com webhook |
| GET | `/api/calcom/webhooks/:id/stats` | API key | Webhook stats |
| POST | `/api/calcom/webhooks/:id/test` | API key | Test webhook |
| GET | `/api/admin/activation-list` | API key | Agents ready for outreach |
| POST | `/api/admin/send-activation-email` | API key | Send activation email |
| GET | `/api/cron/weekly-performance` | API key | Weekly report |
| GET | `/api/cron/dead-letter-replay` | API key | Replay dead-letter queue |
| GET | `/api/cron/check-stuck-pilots` | API key | Alert on stuck pilots |

---

## Dashboard API (`app/api/`)

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | None | Login, sets session cookie |
| POST | `/api/auth/logout` | Session | Clear session |
| GET | `/api/auth/me` | Session | Current user profile |
| POST | `/api/auth/forgot-password` | None | Send reset email |
| POST | `/api/auth/reset-password` | None | Reset with token |
| POST | `/api/auth/verify-email` | None | Verify email address |
| POST | `/api/auth/accept-invite` | None | Accept pilot invite |
| POST | `/api/auth/pilot-signup` | None | Pilot program signup |
| GET | `/api/auth/pilot-status` | Session | Pilot status |
| POST | `/api/auth/trial-signup` | None | Free trial signup |
| GET | `/api/auth/trial-status` | Session | Trial status |

### Lead Intake (Webhooks)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhook` | None | Generic lead: creates, qualifies, sends AI SMS |
| POST | `/api/webhook/fub` | FUB sig | Follow Up Boss lead webhook |
| POST | `/api/webhook/twilio` | Twilio sig | Inbound SMS |
| POST | `/api/webhook/stripe` | Stripe sig | Stripe events |
| POST | `/api/webhook/calcom` | None | Cal.com bookings |
| POST | `/api/lead-capture` | None | Lead magnet email capture |

### Agents & Onboarding
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/agents/profile` | Session | Agent profile |
| POST | `/api/agents/create` | None | Create account |
| POST | `/api/agents/onboard` | Session | Submit onboarding |
| GET | `/api/agents/check-email` | None | Email availability |
| POST | `/api/onboarding/submit` | Session | Submit onboarding form |
| GET | `/api/onboarding/validate` | Session | Validate state |
| POST | `/api/onboarding/complete` | Session | Mark complete |
| GET | `/api/onboarding/simulator-status` | Session | Simulator status |
| POST | `/api/onboarding/simulator` | Session | Run lead simulator |
| POST | `/api/onboarding/fub/validate-key` | Session | Validate FUB API key |
| GET | `/api/onboarding/fub/status` | Session | FUB connection status |
| POST | `/api/agents/onboarding/provision-phone` | Session | Provision Twilio number |
| POST | `/api/agents/onboarding/verify-sms` | Session | Verify via test SMS |
| GET | `/api/agents/onboarding/status` | Session | Onboarding step status |

### SMS & Leads
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/leads/[id]/messages` | Session | Lead conversation messages |
| POST | `/api/sms/send` | Session | Send manual SMS |
| POST | `/api/sms/ai-suggest` | Session | AI reply suggestions |
| GET | `/api/sms/status` | Twilio sig | Delivery status callback |
| GET | `/api/sample-leads` | Session | Sample/demo leads |

### Billing & Trial
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/billing/create-checkout` | Session | Create Stripe checkout |
| POST | `/api/stripe/upgrade-checkout` | Session | Upgrade subscription |
| GET | `/api/stripe/portal-session` | Session | Customer portal |
| POST | `/api/trial/start` | Session | Start free trial |
| GET | `/api/trial/status` | Session | Trial status + days remaining |
| POST | `/api/trial/dismiss-nudge` | Session | Dismiss upgrade nudge |

### Analytics & Metrics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/analytics/event` | None | Track frontend event |
| GET | `/api/analytics/dashboard` | Session | Dashboard analytics |
| GET | `/api/analytics/sms-stats` | Session | SMS delivery stats |
| GET | `/api/metrics/roi` | Session | ROI metrics |
| POST | `/api/page-views` | None | Record page view |
| POST | `/api/nps/submit` | Session | Submit NPS score |
| GET | `/api/nps/prompt-status` | Session | Whether to show NPS prompt |

### Setup, Satisfaction & Referrals
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/setup/status` | Session | Setup completion status |
| POST | `/api/setup/complete` | Session | Mark setup done |
| POST | `/api/setup/send-test-sms` | Session | Test SMS during setup |
| POST | `/api/satisfaction/events` | Session | Log satisfaction event |
| POST | `/api/referrals/generate` | Session | Generate referral link |
| POST | `/api/sequences/[id]/pause` | Session | Pause email sequence |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/pilots` | Admin | List pilot agents |
| POST | `/api/admin/invite-pilot` | Admin | Invite pilot |
| GET | `/api/admin/conversations` | Admin | All conversations |
| POST | `/api/admin/simulate-lead` | Admin | Trigger lead simulation |
| GET | `/api/admin/funnel` | Admin | Signup funnel metrics |
| GET | `/api/admin/nps` | Admin | NPS aggregate results |
| GET | `/api/admin/pilot-campaigns` | Admin | Outreach campaigns |
| POST | `/api/admin/pilot-campaigns` | Admin | Create campaign |
| POST | `/api/admin/pilot-targets/[id]/invite` | Admin | Send campaign invite |
| GET | `/api/billing/mrr-snapshot` | Admin | MRR snapshot |

### Cron & Internal
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cron/follow-up` | Cron | Lead follow-up sequences |
| GET | `/api/cron/expire-trials` | Cron | Expire ended trials |
| GET | `/api/cron/send-trial-emails` | Cron | Trial nurture emails |
| GET | `/api/cron/nps-surveys` | Cron | Send NPS surveys |
| GET | `/api/cron/inactivity-alerts` | Cron | Alert inactive agents |
| GET | `/api/cron/pilot-stuck-check` | Cron | Alert stuck pilot onboarding |
| POST | `/api/internal/send-activation-emails` | Internal | Activation email batch |
| GET | `/api/smoke/stripe-checkout-e2e` | Internal | Smoke test: Stripe checkout |
