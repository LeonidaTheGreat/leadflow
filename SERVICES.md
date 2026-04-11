<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat by generate-services-docs.js. -->
# LeadFlow Services Reference

> Generated: 2026-04-11T13:00:51.793Z | Source: `lib/services/` | 17 services

Auto-generated from source. Edit source files, not this document.

## Table of Contents

- [ActivationService](#activationservice) — `ActivationService.js`
- [BillingService](#billingservice) — `BillingService.js`
- [BookingLinkService](#bookinglinkservice) — `BookingLinkService.js`
- [CalcomClient](#calcomclient) — `CalcomClient.js`
- [CalcomWebhookHandler](#calcomwebhookhandler) — `CalcomWebhookHandler.js`
- [CalcomWebhookManagement](#calcomwebhookmanagement) — `CalcomWebhookManagement.js`
- [EmailService](#emailservice) — `EmailService.js`
- [FUBService](#fubservice) — `FUBService.js`
- [OnboardingTelemetryService](#onboardingtelemetryservice) — `OnboardingTelemetryService.js`
- [PilotConversionService](#pilotconversionservice) — `PilotConversionService.js`
- [PosthogService](#posthogservice) — `PosthogService.js`
- [SatisfactionService](#satisfactionservice) — `SatisfactionService.js`
- [SequenceService](#sequenceservice) — `SequenceService.js`
- [StuckPilotsService](#stuckpilotsservice) — `StuckPilotsService.js`
- [SubscriptionService](#subscriptionservice) — `SubscriptionService.js`
- [TwilioService](#twilioservice) — `TwilioService.js`
- [WeeklyPerformanceService](#weeklyperformanceservice) — `WeeklyPerformanceService.js`

---

## ActivationService

**File:** `lib/services/ActivationService.js`

**Service Dependencies:** `EmailService`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `verifyAdminAuth` |  | `req` | / |
| `getActivationList` | ✓ | — | / |
| `formatListAsCsv` |  | `rows` | / |
| `formatListAsJson` |  | `rows` | / |
| `sendActivationEmail` | ✓ | `agentId` | / |

---

## BillingService

**File:** `lib/services/BillingService.js`

**External Dependencies:** `stripe`, `db`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `initializeBilling` | ✓ | — | — |
| `createCompleteSubscription` | ✓ | `params` | — |
| `createManagedSubscription` | ✓ | `params` | — |
| `getOrCreateCustomer` | ✓ | `userId` | — |
| `changePlan` | ✓ | `params` | — |
| `changeSubscriptionPlan` | ✓ | `params` | — |
| `scheduleSubscriptionChange` | ✓ | `params` | — |
| `cancelManagedSubscription` | ✓ | `params` | — |
| `reactivateSubscription` | ✓ | `subscriptionId` | — |
| `getSubscriptionDetails` | ✓ | `subscriptionId` | — |
| `listUserSubscriptions` | ✓ | `userId, options = {}` | — |
| `previewPlanChange` | ✓ | `params` | — |
| `getUserSubscriptionStatus` | ✓ | `userId` | — |
| `getSubscriptionAnalytics` | ✓ | `userId` | — |
| `getBillingCycleInfo` | ✓ | `subscriptionId` | — |
| `calculateProration` | ✓ | `params` | — |
| `previewBillingCycleChange` | ✓ | `params` | — |
| `updateBillingCycle` | ✓ | `params` | — |
| `getRenewalHistory` | ✓ | `subscriptionId` | — |
| `getUpcomingRenewals` | ✓ | `options = {}` | — |
| `syncAllSubscriptions` | ✓ | — | — |
| `syncBillingCycles` | ✓ | `subscriptionId = null` | — |
| `configurePortal` | ✓ | — | — |
| `createPortalSession` | ✓ | `customerId, options = {}` | — |
| `getPortalConfig` |  | — | — |
| `getSubscriptionManagementConfig` |  | — | — |
| `getPaymentMethodConfig` |  | — | — |
| `getInvoiceHistoryConfig` |  | — | — |
| `updatePortalBranding` |  | `b` | — |
| `getCustomerSubscriptions` | ✓ | `customerId` | — |
| `getCustomerInvoices` | ✓ | `customerId, options = {}` | — |
| `getCustomerPaymentMethods` | ✓ | `customerId` | — |
| `handleWebhook` | ✓ | `event` | — |
| `processWebhookEvent` | ✓ | `event` | — |
| `verifyWebhookSignature` |  | `payload, signature` | — |
| `handleSubscriptionCreated` | ✓ | `subscription` | — |
| `handleSubscriptionUpdated` | ✓ | `subscription` | — |
| `handleSubscriptionDeleted` | ✓ | `subscription` | — |
| `handleSubscriptionPaused` | ✓ | `subscription` | — |
| `handleSubscriptionResumed` | ✓ | `subscription` | — |
| `handlePendingUpdateApplied` | ✓ | `subscription` | — |
| `handlePendingUpdateExpired` | ✓ | `subscription` | — |
| `handleTrialWillEnd` | ✓ | `subscription` | — |
| `handlePaymentSucceeded` | ✓ | `invoice` | — |
| `handlePaymentFailed` | ✓ | `invoice` | — |
| `handleInvoicePaid` | ✓ | — | — |
| `handlePaymentActionRequired` | ✓ | `invoice` | — |
| `handleInvoiceCreated` | ✓ | — | — |
| `handleInvoiceFinalized` | ✓ | — | — |
| `handleInvoiceUpcoming` | ✓ | `invoice` | — |
| `handleInvoiceUncollectible` | ✓ | `invoice` | — |
| `handleInvoiceVoided` | ✓ | — | — |
| `handlePaymentIntentSucceeded` | ✓ | — | — |
| `handlePaymentIntentFailed` | ✓ | — | — |
| `handlePaymentIntentRequiresAction` | ✓ | — | — |
| `handleCustomerCreated` | ✓ | — | — |
| `handleCustomerUpdated` | ✓ | — | — |
| `handleCustomerDeleted` | ✓ | — | — |
| `handlePaymentMethodAttached` | ✓ | — | — |
| `handlePaymentMethodDetached` | ✓ | — | — |
| `handleCheckoutCompleted` | ✓ | `session` | — |
| `handleCheckoutExpired` | ✓ | `session` | — |
| `handleDisputeCreated` | ✓ | — | — |
| `handleDisputeClosed` | ✓ | — | — |
| `createCustomer` | ✓ | `agent` | — |
| `createSubscription` | ✓ | `customerId, priceId` | — |
| `attachPaymentMethod` | ✓ | `customerId, paymentMethodId` | — |
| `createSetupIntent` | ✓ | `customerId` | — |
| `getSubscriptionStatus` | ✓ | `subscriptionId` | — |
| `cancelSubscription` | ✓ | `subscriptionId, immediate = false` | — |
| `createCustomerPortal` | ✓ | `customerId, options = {}` | — |
| `getPriceId` |  | `tier, interval` | — |

---

## BookingLinkService

**File:** `lib/services/BookingLinkService.js`

**Service Dependencies:** `CalcomClient`

**External Dependencies:** `db`

_No public methods found._

---

## CalcomClient

**File:** `lib/services/CalcomClient.js`

**External Dependencies:** `axios`

_No public methods found._

---

## CalcomWebhookHandler

**File:** `lib/services/CalcomWebhookHandler.js`

**Service Dependencies:** `SequenceService`

**External Dependencies:** `db`

_No public methods found._

---

## CalcomWebhookManagement

**File:** `lib/services/CalcomWebhookManagement.js`

**External Dependencies:** `db`, `crypto`

_No public methods found._

---

## EmailService

**File:** `lib/services/EmailService.js`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `isConfigured` |  | — | — |
| `send` | ✓ | `params` | — |
| `sendVerification` | ✓ | `params` | — |
| `sendPilotConversion` | ✓ | `params` | — |
| `sendActivationOutreach` | ✓ | `params` | — |
| `buildActivationOutreachHtml` |  | `firstName, onboardingUrl` | — |
| `getFetch` | ✓ | — | — |

---

## FUBService

**File:** `lib/services/FUBService.js`

**Service Dependencies:** `TwilioService`, `SatisfactionService`, `SequenceService`

**External Dependencies:** `crypto`, `events`, `axios`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `registerEventHandlers` |  | — | — |
| `verifyWebhookSignature` |  | `req` | — |
| `mapEvent` |  | `fubEvent` | — |
| `handleWebhookPayload` |  | `payload = {}` | — |
| `handleLeadCreated` | ✓ | `leadData` | — |
| `handleLeadUpdated` | ✓ | `leadData` | — |
| `handleLeadStatusChanged` | ✓ | `leadData` | — |
| `handleLeadAssigned` | ✓ | `leadData` | — |
| `fetchLeadFromFub` | ✓ | `leadId` | — |
| `checkDncStatus` | ✓ | — | — |
| `generateAiSmsResponse` | ✓ | `lead, options = {}` | — |
| `logSmsInFub` | ✓ | `logData` | — |
| `invalidateLeadCache` | ✓ | `leadId` | — |
| `cacheLeadContext` | ✓ | `lead` | — |
| `logFubEvent` |  | `event, data` | — |

---

## OnboardingTelemetryService

**File:** `lib/services/OnboardingTelemetryService.js`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `isSmokeTestAccount` |  | `email` | — |
| `logOnboardingEvent` | ✓ | `agentId, stepName, status, metadata = {}` | / |
| `getFunnelStatus` | ✓ | — | / |
| `getFunnelConversions` | ✓ | — | / |
| `checkAndAlertStuckAgents` | ✓ | — | / |
| `createStuckAlerts` | ✓ | `stuckAgents` | / |
| `getOnboardingEvents` | ✓ | `agentId = null, limit = 50` | / |

---

## PilotConversionService

**File:** `lib/services/PilotConversionService.js`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `isDbConfigured` |  | — | — |
| `isResendConfigured` |  | — | — |
| `getEligibleAgents` | ✓ | `milestone` | — |
| `getAgentStats` | ✓ | `agentId` | — |
| `hasAgentUpgraded` | ✓ | `agentId` | — |
| `generateCheckoutUrl` |  | `agent` | — |
| `renderTemplate` |  | `template, agent, stats, checkoutUrl` | — |
| `sendEmailViaResend` | ✓ | `to, subject, content` | — |
| `logEmailSend` | ✓ | `params` | — |
| `sendConversionEmail` | ✓ | `agent, milestone` | — |
| `processMilestone` | ✓ | `milestone` | — |
| `runConversionSequence` | ✓ | — | — |

---

## PosthogService

**File:** `lib/services/PosthogService.js`

**External Dependencies:** `posthog-node`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `trackServerEvent` |  | `distinctId, event, properties = {}` | / |
| `trackConversion` |  | `distinctId, conversionType, value = 0, properties = {}` | / |
| `trackLeadCapture` |  | `distinctId, email, variant = null, properties = {}` | / |
| `trackFormSubmission` |  | `distinctId, formName, properties = {}` | / |
| `identifyUser` |  | `distinctId, properties = {}` | / |
| `getFeatureFlag` | ✓ | `distinctId, flagKey` | / |
| `shutdown` | ✓ | — | / |

---

## SatisfactionService

**File:** `lib/services/SatisfactionService.js`

**External Dependencies:** `db`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `sendSatisfactionPing` | ✓ | `opts` | — |
| `scheduleSatisfactionPing` |  | `opts` | — |
| `getPendingSatisfactionPing` | ✓ | `leadId` | — |
| `classifyReply` |  | `reply` | — |
| `recordSatisfactionReply` | ✓ | `eventId, rawReply, rating` | — |

---

## SequenceService

**File:** `lib/services/SequenceService.js`

**External Dependencies:** `db`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `getInitialSendTime` |  | `sequenceType` | / |
| `findLeadByFubId` | ✓ | `fubId` | / |
| `findLeadByPhone` | ✓ | `phone` | / |
| `hasActiveSequence` | ✓ | `leadId, sequenceType` | / |
| `createLeadSequence` | ✓ | `params` | / |

---

## StuckPilotsService

**File:** `lib/services/StuckPilotsService.js`

**External Dependencies:** `https`, `db`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `sendTelegramMessage` | ✓ | `text, chatId, topicId` | — |
| `getStuckPilots` | ✓ | — | — |
| `markPilotAlerted` | ✓ | `pilotId` | — |
| `buildAlertMessage` |  | `pilot, dashboardUrl` | — |
| `checkAndAlertStuckPilots` | ✓ | `options = {}` | — |

---

## SubscriptionService

**File:** `lib/services/SubscriptionService.js`

**External Dependencies:** `db`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `getTierPrices` |  | — | — |
| `createManagedSubscription` | ✓ | `params` | — |
| `getOrCreateCustomer` | ✓ | `userId` | — |
| `attachPaymentMethod` | ✓ | `customerId, paymentMethodId` | — |
| `persistSubscription` | ✓ | `params` | — |
| `updateAgentSubscription` | ✓ | `userId, updates` | — |
| `changeSubscriptionPlan` | ✓ | `params` | — |
| `calculateProrationAmount` |  | `oldSub, newSub` | — |
| `scheduleSubscriptionChange` | ✓ | `params` | — |
| `cancelManagedSubscription` | ✓ | `params` | — |
| `reactivateSubscription` | ✓ | `subscriptionId` | — |
| `updateSubscriptionInDatabase` | ✓ | `stripeSubscriptionId, updates` | — |
| `getSubscriptionDetails` | ✓ | `subscriptionId` | — |
| `listUserSubscriptions` | ✓ | `userId, options = {}` | — |
| `createMockSubscription` |  | `userId, tier, interval` | — |
| `getMockSubscriptionDetails` |  | `subscriptionId` | — |

---

## TwilioService

**File:** `lib/services/TwilioService.js`

**External Dependencies:** `twilio`, `db`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `getPlatformTwilioClient` |  | — | / |
| `resolveTwilioContext` | ✓ | `agentId, toNumber, market` | / |
| `sendSms` | ✓ | `toNumber, messageContent, options = {}` | / |
| `sendSmsViatwilio` | ✓ | `toNumber, messageContent, options = {}` | — |
| `validateSmsInput` |  | `toNumber, messageContent` | / |
| `selectFromNumber` |  | `market, toNumber` | / |
| `truncateMessage` |  | `message` | / |
| `updateSmsStatus` | ✓ | `statusData` | / |
| `getSmsStatus` | ✓ | `sid` | / |
| `getSmsHistoryForLead` | ✓ | `leadId, options = {}` | / |
| `getSmsAnalytics` | ✓ | `agentId, options = {}` | / |

---

## WeeklyPerformanceService

**File:** `lib/services/WeeklyPerformanceService.js`

**External Dependencies:** `db`

### Methods

| Method | Async | Params | Description |
|--------|-------|--------|-------------|
| `isSupabaseConfigured` |  | — | — |
| `isResendConfigured` |  | — | — |
| `getPreviousWeekRange` |  | — | — |
| `getEligibleAgents` | ✓ | `weekStarting` | — |
| `getAgentWeeklyStats` | ✓ | `agentId, weekStarting, weekEnding` | — |
| `generateEmailHtml` |  | `agent, stats, weekRange` | — |
| `sendWeeklyEmail` | ✓ | `agent, stats, weekRange` | — |
| `logEmailSend` | ✓ | `agent, stats, weekRange, sendResult, status, errorMessage = null` | — |
| `processWeeklyEmails` | ✓ | — | — |
| `runWeeklyReportSequence` | ✓ | — | — |
| `getPreviewData` | ✓ | `agentId` | — |

---

