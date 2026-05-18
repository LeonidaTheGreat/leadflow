# PRD-LEADFLOW-SIGNUP-CONFIRMED-INBOX-LINK-001

## Product State (2026-05-17)
- Mission: first paying customer depends on improving Signup to Activated Rate.
- This use case is P1 and currently not started.
- Existing flow has partial email verification behavior, but this UC requires a hard, testable gate: no login until inbox link confirmation.

## Scope
Require confirmed inbox link before first login, with explicit dependency on verification token persistence and a post-signup check-your-inbox screen.

In scope:
- Token persistence table available and used for verification links.
- Signup routes create unverified account and issue verification token.
- User lands on check-your-inbox page after signup.
- Login blocked until verification is completed.

Out of scope:
- Pricing/trial packaging changes.
- Onboarding redesign beyond redirect behavior.
- New auth provider or session model changes.

## Use Cases Coverage
- Covered: new trial signup with valid email.
- Covered: new pilot signup with valid email.
- Covered: unverified user attempts login.
- Covered: verified user login.
- Covered: expired/used token and resend flow.
- Gap to close in implementation: operational visibility for verification delivery failures.

## User Stories
1. As a new agent, I can sign up and get a clear "check your inbox" next step so I know how to activate my account.
2. As a new agent, I cannot log in until I verify my email, preventing typo/fake signups from entering the product.
3. As a new agent, I can request a new confirmation link if the first link expires or is lost.
4. As LeadFlow, we can prove that only verified inboxes reach onboarding/login.

## Functional Requirements
1. Signup must create account with `email_verified = false` for new signups in both trial and pilot paths.
2. Signup must create one active verification token record tied to the account in token storage.
3. Signup success response must route user to `/check-your-inbox` with email context.
4. Verification endpoint must validate token status (exists, unused, unexpired), mark token used, and set `email_verified = true`.
5. Login endpoint must return `403 EMAIL_NOT_VERIFIED` for unverified accounts and must not issue a session.
6. Resend endpoint must issue a new token and invalidate prior active token(s) for that account.
7. Resend endpoint must enforce abuse guardrail (max 3 requests/hour/account).
8. Expired/invalid token flow must return user-safe error state with path to resend.
9. Existing already-verified accounts must continue to log in unchanged.

## Non-Functional Requirements
- Verification email dispatch target latency: under 30 seconds from signup request completion.
- No auth regression: verified login success rate must not drop.
- Mobile compatibility for `/check-your-inbox` at 375px width.

## Acceptance Criteria
1. New signup creates account with `email_verified = false`.
2. New signup persists a verification token row linked to that account.
3. New signup redirects to `/check-your-inbox` (not authenticated dashboard).
4. Unverified login attempt returns HTTP 403 and `EMAIL_NOT_VERIFIED`.
5. Valid token verification sets `email_verified = true` and enables subsequent login.
6. Used token cannot be reused.
7. Expired token is rejected and user is directed to request resend.
8. Resend capped at 3/hour/account; 4th attempt receives rate-limit response.
9. Existing verified users can still log in with no additional verification step.
10. E2E path passes: signup -> blocked login -> verify link -> successful login.

## Instrumentation / KPIs
- `signup_to_check_inbox_rate`
- `verification_link_click_rate`
- `verified_within_24h_rate`
- `unverified_login_block_count`
- `signup_to_activated_rate` (primary business KPI)

## Risks and Mitigations
- Risk: missing token table in runtime DB blocks flow.
  - Mitigation: migration/table existence is release gate before signup behavior change.
- Risk: delivery failures create dead-end signups.
  - Mitigation: resend + clear error states + metrics for failure detection.

## Release Gates
1. Schema gate: token table exists in runtime database.
2. Functional gate: acceptance criteria 1-10 verified.
3. Revenue gate: no drop in verified login success and measurable increase in signup-to-activated conversion trend.

## Dependencies
- Email delivery provider already configured.
- Token table migration applied to runtime DB.
- Existing auth routes for signup/login/verify/resend.

## Artifact Links
- Use case: `feature-signup-must-require-confirmed-inbox-link`
- Task: `ab325e71-e36a-4f3e-9b78-47df969c86e2`
