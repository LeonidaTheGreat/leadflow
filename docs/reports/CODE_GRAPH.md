# Code Dependency Graph
Generated: 2026-04-21T03:22:27.358Z

## Module Statistics
- Total modules: 31
- Total edges: 71
- Circular dependencies: 0
- Hub modules (>10 dependents): logger.js (17), circuit-breaker.js (11), db.js (10)
- Orphan modules: 14

## Top-Level Dependencies (most imported)
| Module | Dependents | Lines |
|--------|-----------|-------|
| lib/logger.js | 17 | 205 |
| lib/utils/circuit-breaker.js | 11 | 142 |
| lib/db.js | 10 | 349 |
| lib/request-context.js | 7 | 24 |
| lib/config/index.js | 4 | ? |
| lib/errors.js | 3 | 317 |
| lib/services/SequenceService.js | 3 | 185 |
| lib/services/TwilioService.js | 2 | 669 |
| lib/middleware/require-api-key.js | 2 | 34 |
| lib/utils/dead-letter.js | 2 | 29 |
| lib/types/index.js | 1 | ? |
| lib/services/EmailService.js | 1 | 183 |
| lib/services/CalcomClient.js | 1 | 418 |
| lib/services/CalcomEventProcessor.js | 1 | 685 |
| lib/services/SatisfactionService.js | 1 | 183 |

## Per-Module Detail

### lib/db.js (349 lines)
Imported by: BillingService, BookingLinkService, CalcomWebhookHandler, CalcomWebhookManagement, SatisfactionService, SequenceService, StuckPilotsService, TwilioService, WeeklyPerformanceService, dead-letter

### lib/errors.js (317 lines)
Imported by: index, billing, calcom-webhook

### lib/index.js (57 lines)
Imports: errors, logger, index

### lib/logger.js (205 lines)
Imports: request-context
Imported by: index, BillingService, BookingLinkService, CalcomEventProcessor, CalcomWebhookHandler, CalcomWebhookManagement, FUBService, PilotConversionService, SequenceService, TrialActivationService, TwilioService, WeeklyPerformanceService, circuit-breaker, dead-letter-replay, dead-letter, billing, calcom-webhook

### lib/middleware/rate-limiter.js (29 lines)
(no dependencies detected)

### lib/middleware/require-api-key.js (34 lines)
Imported by: billing, calcom-webhook

### lib/middleware/require-cron-secret.js (38 lines)
(no dependencies detected)

### lib/request-context.js (24 lines)
Imported by: logger, CalcomClient, EmailService, FUBService, TwilioService, circuit-breaker, dead-letter-replay

### lib/services/ActivationService.js (203 lines)
Imports: EmailService

### lib/services/BillingService.js (506 lines)
Imports: db, logger, circuit-breaker, index
Imported by: billing

### lib/services/BookingLinkService.js (317 lines)
Imports: db, CalcomClient, logger

### lib/services/CalcomClient.js (418 lines)
Imports: circuit-breaker, request-context, index
Imported by: BookingLinkService

### lib/services/CalcomEventProcessor.js (685 lines)
Imports: logger, circuit-breaker, SequenceService, TwilioService
Imported by: CalcomWebhookHandler

### lib/services/CalcomWebhookHandler.js (295 lines)
Imports: db, logger, index, SequenceService, CalcomEventProcessor, circuit-breaker
Imported by: calcom-webhook

### lib/services/CalcomWebhookManagement.js (750 lines)
Imports: db, logger, circuit-breaker
Imported by: calcom-webhook

### lib/services/EmailService.js (183 lines)
Imports: request-context, circuit-breaker
Imported by: ActivationService

### lib/services/FUBService.js (405 lines)
Imports: logger, circuit-breaker, request-context, TwilioService, SatisfactionService, SequenceService

### lib/services/PilotConversionService.js (250 lines)
Imports: logger, circuit-breaker

### lib/services/SatisfactionService.js (183 lines)
Imports: db
Imported by: FUBService

### lib/services/SequenceService.js (185 lines)
Imports: db, logger
Imported by: CalcomEventProcessor, CalcomWebhookHandler, FUBService

### lib/services/StuckPilotsService.js (167 lines)
Imports: db

### lib/services/SystemStatusService.js (24 lines)
Imported by: system

### lib/services/TrialActivationService.js (301 lines)
Imports: logger, trial-cta-email

### lib/services/TwilioService.js (669 lines)
Imports: db, logger, circuit-breaker, request-context, index
Imported by: CalcomEventProcessor, FUBService

### lib/services/WeeklyPerformanceService.js (582 lines)
Imports: db, logger, circuit-breaker

### lib/utils/circuit-breaker.js (142 lines)
Imports: logger, request-context
Imported by: BillingService, CalcomClient, CalcomEventProcessor, CalcomWebhookHandler, CalcomWebhookManagement, EmailService, FUBService, PilotConversionService, TwilioService, WeeklyPerformanceService, system

### lib/utils/dead-letter-replay.js (130 lines)
Imports: logger, request-context

### lib/utils/dead-letter.js (29 lines)
Imports: db, logger
Imported by: billing, calcom-webhook

### routes/billing.js (136 lines)
Imports: BillingService, require-api-key, dead-letter, logger, errors

### routes/calcom-webhook.js (144 lines)
Imports: CalcomWebhookHandler, CalcomWebhookManagement, require-api-key, dead-letter, logger, errors

### routes/system.js (58 lines)
Imports: SystemStatusService, circuit-breaker
