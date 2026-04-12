<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from lib/services/. -->
# Services Reference

> Generated: 2026-04-12T19:09:03.978Z | Source: `lib/services/`

**15 services across 15 files**

| Service | File | Methods | Dependencies |
|---------|------|---------|-------------|
| [ActivationService](#activationservice) | `ActivationService.js` | 5 | EmailService |
| [BillingService](#billingservice) | `BillingService.js` | 20 | stripe, db |
| [BookingLinkService](#bookinglinkservice) | `BookingLinkService.js` | 6 | db, CalcomClient |
| [CalcomClient](#calcomclient) | `CalcomClient.js` | 16 | axios |
| [CalcomWebhookHandler](#calcomwebhookhandler) | `CalcomWebhookHandler.js` | 19 | db, SequenceService, crypto |
| [CalcomWebhookManagement](#calcomwebhookmanagement) | `CalcomWebhookManagement.js` | 13 | db, crypto, axios |
| [EmailService](#emailservice) | `EmailService.js` | 7 | - |
| [FUBService](#fubservice) | `FUBService.js` | 15 | crypto, events, axios, TwilioService… |
| [PilotConversionService](#pilotconversionservice) | `PilotConversionService.js` | 12 | - |
| [SatisfactionService](#satisfactionservice) | `SatisfactionService.js` | 5 | db |
| [SequenceService](#sequenceservice) | `SequenceService.js` | 5 | db |
| [StuckPilotsService](#stuckpilotsservice) | `StuckPilotsService.js` | 6 | https, db |
| [SystemStatusService](#systemstatusservice) | `SystemStatusService.js` | 2 | - |
| [TwilioService](#twilioservice) | `TwilioService.js` | 11 | twilio, db |
| [WeeklyPerformanceService](#weeklyperformanceservice) | `WeeklyPerformanceService.js` | 13 | db |

---

## ActivationService

**File:** `lib/services/ActivationService.js`

**Dependencies:** `EmailService`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `verifyAdminAuth()` | `req` | Verify an Express request carries a valid admin bearer token. |
| `getActivationList()` | - | Fetch all agents who are verified but have not completed onboarding. |
| `formatListAsCsv()` | `rows` | Format activation list rows as a CSV string. |
| `formatListAsJson()` | `rows` | Format activation list rows as a JSON summary object. |
| `sendActivationEmail()` | `agentId` | Send a personalized activation email to a single agent, then mark |

---

## BillingService

**File:** `lib/services/BillingService.js`

**Dependencies:** `stripe`, `db`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `initializeBilling()` | - | - |
| `createCompleteSubscription()` | `params` | - |
| `createManagedSubscription()` | `params` | - |
| `getOrCreateCustomer()` | `userId` | - |
| `changePlan()` | `params` | - |
| `changeSubscriptionPlan()` | `params` | - |
| `scheduleSubscriptionChange()` | `params` | - |
| `cancelManagedSubscription()` | `params` | - |
| `reactivateSubscription()` | `subscriptionId` | - |
| `getSubscriptionDetails()` | `subscriptionId` | - |
| `listUserSubscriptions()` | `userId`, `options` | - |
| `previewPlanChange()` | `params` | - |
| `getUserSubscriptionStatus()` | `userId` | - |
| `getSubscriptionAnalytics()` | `userId` | - |
| `getBillingCycleInfo()` | `subscriptionId` | - |
| `calculateProration()` | `params` | - |
| `previewBillingCycleChange()` | `params` | - |
| `updateBillingCycle()` | `params` | - |
| `getRenewalHistory()` | `subscriptionId` | - |
| `getUpcomingRenewals()` | `options` | - |

---

## BookingLinkService

**File:** `lib/services/BookingLinkService.js`

**Dependencies:** `db`, `CalcomClient`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `generateAgentBookingLink()` | `agentId`, `eventTypeSlug`, `options` | Generate booking link for an agent. |
| `getAgentBookingLinks()` | `agentId` | Get all active booking links for an agent. |
| `createPersonalizedBookingLink()` | `agentId`, `eventTypeSlug`, `lead` | Create a personalized booking link for a lead (pre-filled). |
| `deactivateBookingLink()` | `configId` | Deactivate a booking link by config ID. |
| `updateBookingConfig()` | `configId`, `updates` | Update booking configuration fields. |
| `getQuickBookingLink()` | `agentId`, `scenario` | Get a booking link for a common scenario shorthand. |

---

## CalcomClient

**File:** `lib/services/CalcomClient.js`

**Dependencies:** `axios`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `getApiKey()` | - | - |
| `isConfigured()` | - | - |
| `calApiRequest()` | `endpoint`, `options` | - |
| `getEventTypes()` | `filters` | - |
| `getEventType()` | `eventTypeId` | - |
| `generateBookingUrl()` | `eventSlug`, `username` | - |
| `getAvailableSlots()` | `params` | - |
| `createBooking()` | `bookingData` | - |
| `getBooking()` | `bookingId` | - |
| `cancelBooking()` | `bookingId`, `options` | - |
| `rescheduleBooking()` | `bookingId`, `rescheduleData` | - |
| `getMe()` | - | - |
| `getTeamMembers()` | - | - |
| `getMockEventTypes()` | `defaultUsername` | - |
| `getMockSlots()` | - | - |
| `getMockBooking()` | `bookingData` | - |

---

## CalcomWebhookHandler

**File:** `lib/services/CalcomWebhookHandler.js`

**Dependencies:** `db`, `SequenceService`, `crypto`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `getDb()` | - | - |
| `handleCalWebhook()` | `event` | - |
| `calcomWebhookHandler()` | `req`, `res` | - |
| `verifyWebhookSignature()` | `payload`, `signature` | - |
| `handleBookingCreated()` | `booking` | - |
| `handleBookingRescheduled()` | `booking` | - |
| `handleBookingCancelled()` | `booking` | - |
| `handleMeetingEnded()` | `booking` | - |
| `findOrCreateLead()` | `attendee`, `db` | - |
| `findAgentForBooking()` | `booking`, `db` | - |
| `logBookingActivity()` | `activityData`, `db` | - |
| `sendBookingConfirmationSMS()` | `bookingData` | - |
| `sendRescheduleConfirmationSMS()` | `bookingData` | - |
| `scheduleBookingReminders()` | `booking`, `db` | - |
| `cancelExistingReminders()` | `bookingId`, `db` | - |
| `triggerPostMeetingFollowUp()` | `booking` | - |
| `withRetry()` | `fn`, `options`, `operationName` | - |
| `sleep()` | `ms` | - |
| `calculateBackoffDelay()` | `attempt` | - |

---

## CalcomWebhookManagement

**File:** `lib/services/CalcomWebhookManagement.js`

**Dependencies:** `db`, `crypto`, `axios`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `getDb()` | - | - |
| `listWebhooks()` | - | - |
| `registerWebhook()` | `config` | - |
| `deleteWebhook()` | `webhookId` | - |
| `updateWebhook()` | `webhookId`, `updates` | - |
| `getWebhook()` | `webhookId` | - |
| `logWebhookDelivery()` | `logData` | - |
| `getWebhookDeliveryLogs()` | `filters` | - |
| `getWebhookStats()` | `webhookId`, `dateRange` | - |
| `testWebhook()` | `webhookId` | - |
| `generateWebhookSecret()` | - | - |
| `generateId()` | - | - |
| `generateTestSignature()` | `payload`, `secret` | - |

---

## EmailService

**File:** `lib/services/EmailService.js`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `isConfigured()` | - | - |
| `send()` | `params` | - |
| `sendVerification()` | `params` | - |
| `sendPilotConversion()` | `params` | - |
| `sendActivationOutreach()` | `params` | - |
| `buildActivationOutreachHtml()` | `firstName`, `onboardingUrl` | - |
| `getFetch()` | - | - |

---

## FUBService

**File:** `lib/services/FUBService.js`

**Dependencies:** `crypto`, `events`, `axios`, `TwilioService`, `SatisfactionService`, `SequenceService`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `registerEventHandlers()` | - | - |
| `verifyWebhookSignature()` | `req` | - |
| `mapEvent()` | `fubEvent` | - |
| `handleWebhookPayload()` | `payload` | - |
| `handleLeadCreated()` | `leadData` | - |
| `handleLeadUpdated()` | `leadData` | - |
| `handleLeadStatusChanged()` | `leadData` | - |
| `handleLeadAssigned()` | `leadData` | - |
| `fetchLeadFromFub()` | `leadId` | - |
| `checkDncStatus()` | - | - |
| `generateAiSmsResponse()` | `lead`, `options` | - |
| `logSmsInFub()` | `logData` | - |
| `invalidateLeadCache()` | `leadId` | - |
| `cacheLeadContext()` | `lead` | - |
| `logFubEvent()` | `event`, `data` | - |

---

## PilotConversionService

**File:** `lib/services/PilotConversionService.js`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `isDbConfigured()` | - | - |
| `isResendConfigured()` | - | - |
| `getEligibleAgents()` | `milestone` | - |
| `getAgentStats()` | `agentId` | - |
| `hasAgentUpgraded()` | `agentId` | - |
| `generateCheckoutUrl()` | `agent` | - |
| `renderTemplate()` | `template`, `agent`, `stats`, `checkoutUrl` | - |
| `sendEmailViaResend()` | `to`, `subject`, `content` | - |
| `logEmailSend()` | `params` | - |
| `sendConversionEmail()` | `agent`, `milestone` | - |
| `processMilestone()` | `milestone` | - |
| `runConversionSequence()` | - | - |

---

## SatisfactionService

**File:** `lib/services/SatisfactionService.js`

**Dependencies:** `db`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `sendSatisfactionPing()` | `opts` | - |
| `scheduleSatisfactionPing()` | `opts` | - |
| `getPendingSatisfactionPing()` | `leadId` | - |
| `classifyReply()` | `reply` | - |
| `recordSatisfactionReply()` | `eventId`, `rawReply`, `rating` | - |

---

## SequenceService

**File:** `lib/services/SequenceService.js`

**Dependencies:** `db`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `getInitialSendTime()` | `sequenceType` | Get the initial next_send_at timestamp for a sequence type |
| `findLeadByFubId()` | `fubId` | Look up the internal lead UUID from a FUB person ID |
| `findLeadByPhone()` | `phone` | Look up the internal lead UUID from a phone number |
| `hasActiveSequence()` | `leadId`, `sequenceType` | Check if an active sequence of the same type already exists for a lead |
| `createLeadSequence()` | `params` | Create a follow-up sequence for a lead |

---

## StuckPilotsService

**File:** `lib/services/StuckPilotsService.js`

**Dependencies:** `https`, `db`

**Constructor params:** `dbPool`, `botToken`, `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `sendTelegramMessage()` | `text`, `chatId`, `topicId` | - |
| `getStuckPilots()` | - | - |
| `markPilotAlerted()` | `pilotId` | - |
| `buildAlertMessage()` | `pilot`, `dashboardUrl` | - |
| `checkAndAlertStuckPilots()` | `options` | - |
| `createDefaultStuckPilotsService()` | - | - |

---

## SystemStatusService

**File:** `lib/services/SystemStatusService.js`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `getRootStatus()` | - | - |
| `getHealthStatus()` | - | - |

---

## TwilioService

**File:** `lib/services/TwilioService.js`

**Dependencies:** `twilio`, `db`

**Constructor params:** `options`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `getPlatformTwilioClient()` | - | Get the platform-owned Twilio client (lazy init). |
| `resolveTwilioContext()` | `agentId`, `toNumber`, `market` | Resolve the Twilio client and from-number to use for a given agent. |
| `sendSms()` | `toNumber`, `messageContent`, `options` | Send SMS via Twilio. |
| `sendSmsViatwilio()` | `toNumber`, `messageContent`, `options` | - |
| `validateSmsInput()` | `toNumber`, `messageContent` | Validate SMS input parameters. |
| `selectFromNumber()` | `market`, `toNumber` | Select appropriate from number based on market. |
| `truncateMessage()` | `message` | Truncate message to fit SMS limits. |
| `updateSmsStatus()` | `statusData` | Update SMS status from Twilio webhook callback. |
| `getSmsStatus()` | `sid` | Get SMS delivery status by SID. |
| `getSmsHistoryForLead()` | `leadId`, `options` | Fetch SMS history for a lead. |
| `getSmsAnalytics()` | `agentId`, `options` | Get SMS analytics for an agent. |

---

## WeeklyPerformanceService

**File:** `lib/services/WeeklyPerformanceService.js`

**Dependencies:** `db`

**Constructor params:** `dbClient`, `emailService`

### Methods

| Method | Params | Description |
|--------|--------|-------------|
| `createDefaultDbClient()` | - | - |
| `createDefaultEmailService()` | - | - |
| `sendEmail()` | `payload` | - |
| `createDefaultService()` | - | - |
| `isSupabaseConfigured()` | - | - |
| `isResendConfigured()` | - | - |
| `getPreviousWeekRange()` | - | - |
| `getEligibleAgents()` | `weekStarting` | - |
| `getAgentWeeklyStats()` | `agentId`, `weekStarting`, `weekEnding` | - |
| `generateEmailHtml()` | `agent`, `stats`, `weekRange` | - |
| `sendWeeklyEmail()` | `agent`, `stats`, `weekRange` | - |
| `logEmailSend()` | `agent`, `stats`, `weekRange`, `sendResult`, `status`, `errorMessage` | - |
| `processWeeklyEmails()` | - | - |
