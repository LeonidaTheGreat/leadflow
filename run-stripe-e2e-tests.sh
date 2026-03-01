#!/bin/bash

# Stripe Integration E2E Test Runner
# Runs comprehensive tests with proper environment setup

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧪 STRIPE INTEGRATION E2E TEST SUITE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check required environment variables
echo -e "${YELLOW}📋 Checking environment configuration...${NC}"

if [ -f .env.local ]; then
  echo -e "${GREEN}✓${NC} .env.local file found"
  export $(grep -v '^#' .env.local | xargs)
else
  echo -e "${YELLOW}⚠${NC}  .env.local not found, using system environment"
fi

if [ -f .env ]; then
  echo -e "${GREEN}✓${NC} .env file found"
  export $(grep -v '^#' .env | xargs)
fi

# Display configuration status
echo ""
echo -e "${YELLOW}📊 Configuration Status:${NC}"

if [ -n "$SUPABASE_URL" ]; then
  echo -e "${GREEN}✓${NC} SUPABASE_URL: ${SUPABASE_URL:0:50}..."
else
  echo -e "${RED}✗${NC} SUPABASE_URL: NOT SET"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${GREEN}✓${NC} SUPABASE_SERVICE_ROLE_KEY: Set"
else
  echo -e "${RED}✗${NC} SUPABASE_SERVICE_ROLE_KEY: NOT SET"
fi

if [ -n "$STRIPE_SECRET_KEY" ] && [[ "$STRIPE_SECRET_KEY" != *"your_stripe"* ]]; then
  echo -e "${GREEN}✓${NC} STRIPE_SECRET_KEY: Valid (test key)"
else
  echo -e "${YELLOW}⚠${NC}  STRIPE_SECRET_KEY: Using placeholder (will run mock tests)"
fi

if [ -n "$STRIPE_WEBHOOK_SECRET" ] && [[ "$STRIPE_WEBHOOK_SECRET" != *"your_webhook"* ]]; then
  echo -e "${GREEN}✓${NC} STRIPE_WEBHOOK_SECRET: Set"
else
  echo -e "${YELLOW}⚠${NC}  STRIPE_WEBHOOK_SECRET: Using placeholder"
fi

echo ""
echo -e "${YELLOW}🚀 Starting test execution...${NC}"
echo ""

# Run the tests
node /Users/clawdbot/.openclaw/workspace/projects/leadflow/e2e-stripe-integration-test.js

test_exit_code=$?

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [ $test_exit_code -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}❌ Some tests failed${NC}"
  echo -e "${YELLOW}📋 Check e2e-stripe-test-results.json for details${NC}"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

exit $test_exit_code
