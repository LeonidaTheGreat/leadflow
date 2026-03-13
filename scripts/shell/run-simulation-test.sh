#!/bin/bash
# LeadFlow First Lead Simulation Test Runner
# Usage: ./run-simulation-test.sh [--verbose] [--env=<environment>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  LeadFlow First Lead Simulation Test Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Parse arguments
VERBOSE=""
ENV="test"

for arg in "$@"; do
  case $arg in
    --verbose)
      VERBOSE="--verbose"
      echo -e "${YELLOW}ℹ️  Verbose mode enabled${NC}"
      ;;
    --env=*)
      ENV="${arg#*=}"
      echo -e "${YELLOW}ℹ️  Environment set to: $ENV${NC}"
      ;;
  esac
done

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ to run this test.${NC}"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js version 18+ required. Found: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Check if .env.simulation exists
if [ ! -f ".env.simulation" ]; then
  echo -e "${YELLOW}⚠️  .env.simulation not found. Creating from template...${NC}"
  
  if [ -f ".env.simulation.example" ]; then
    cp .env.simulation.example .env.simulation
    echo -e "${YELLOW}⚠️  Please edit .env.simulation with your actual values before running again.${NC}"
    exit 1
  else
    echo -e "${RED}❌ .env.simulation.example not found. Cannot create configuration.${NC}"
    exit 1
  fi
fi

# Check for required environment variables
echo ""
echo -e "${BLUE}Checking environment configuration...${NC}"

required_vars=(
  "FUB_API_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "CALCOM_API_KEY"
  "POSTHOG_API_KEY"
)

missing_vars=()

for var in "${required_vars[@]}"; do
  if ! grep -q "^$var=" .env.simulation || grep -q "^$var=your_" .env.simulation; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo -e "${RED}❌ Missing or unset required environment variables:${NC}"
  for var in "${missing_vars[@]}"; do
    echo -e "   - $var"
  done
  echo ""
  echo -e "${YELLOW}Please edit .env.simulation and set all required variables.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Load environment variables
export $(grep -v '^#' .env.simulation | xargs)

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Starting Simulation Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run the test
node first-lead-simulation.js $VERBOSE --env=$ENV

EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo -e "${GREEN}   The LeadFlow system is working correctly.${NC}"
elif [ $EXIT_CODE -eq 1 ]; then
  echo -e "${YELLOW}⚠️  Partial success - some tests failed.${NC}"
  echo -e "${YELLOW}   Review the report above for details.${NC}"
else
  echo -e "${RED}❌ Test suite failed.${NC}"
  echo -e "${RED}   Critical issues detected. System requires attention.${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# List generated reports
echo ""
echo -e "${BLUE}Generated Reports:${NC}"
ls -lt first-lead-simulation-report-* 2>/dev/null | head -2 | awk '{print "   " $9}' || echo "   No reports found"

exit $EXIT_CODE
