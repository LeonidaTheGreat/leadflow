#!/bin/bash
# =============================================================================
# Stripe Environment Variables Setup Script for Vercel Production
# =============================================================================
# Usage: ./setup-stripe-env-production.sh
# Requires: Vercel CLI (npm i -g vercel) and authentication (vercel login)
# =============================================================================

echo "=============================================="
echo "Stripe Environment Variables Setup for Vercel"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI is not installed.${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

# Check if user is logged into Vercel
echo "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged into Vercel.${NC}"
    echo "Run: vercel login"
    exit 1
fi

echo -e "${GREEN}✓ Vercel CLI authenticated${NC}"
echo ""

# Load environment variables from .env.local if it exists
ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
    echo "Loading values from $ENV_FILE..."
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${YELLOW}Warning: $ENV_FILE not found${NC}"
fi

echo ""
echo "=============================================="
echo "Required Stripe Environment Variables"
echo "=============================================="
echo ""
echo "You need to set the following variables:"
echo ""
echo "1. STRIPE_SECRET_KEY          - Your Stripe test/live secret key"
echo "2. STRIPE_WEBHOOK_SECRET      - Webhook endpoint secret"
echo "3. STRIPE_PRICE_ID_BASIC      - Basic plan ($29) Price ID"
echo "4. STRIPE_PRICE_ID_PRO        - Pro plan ($149) Price ID"
echo "5. STRIPE_PRICE_ID_ENTERPRISE - Enterprise plan ($499) Price ID"
echo ""

# Prompt for confirmation
read -p "Have you copied the Price IDs from Stripe Dashboard? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please go to https://dashboard.stripe.com/test/products and:"
    echo "1. Create or select your Basic ($29), Pro ($149), Enterprise ($499) plans"
    echo "2. Copy the Price ID for each (starts with 'price_')"
    echo "3. Run this script again"
    exit 1
fi

echo ""
echo "Setting up environment variables in Vercel..."
echo ""

# Function to add environment variable to Vercel
add_env_var() {
    local name=$1
    local value=$2
    local sensitive=$3
    
    if [ -z "$value" ]; then
        echo -e "${YELLOW}⚠ Skipping $name (empty value)${NC}"
        return
    fi
    
    if [ "$sensitive" = "true" ]; then
        echo "Adding $name: [HIDDEN]"
    else
        echo "Adding $name: $value"
    fi
    
    echo "$value" | vercel env add "$name" production
}

echo "----------------------------------------------"
echo "Adding Stripe Configuration..."
echo "----------------------------------------------"

# Read values from user if not in .env.local
echo ""
read -p "Enter STRIPE_SECRET_KEY (or press Enter to use current): " STRIPE_SECRET_KEY_INPUT
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY_INPUT:-$STRIPE_SECRET_KEY}

read -p "Enter STRIPE_WEBHOOK_SECRET (or press Enter to use current): " STRIPE_WEBHOOK_SECRET_INPUT
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET_INPUT:-$STRIPE_WEBHOOK_SECRET}

echo ""
echo "Enter Price IDs from your Stripe Dashboard:"
echo "(Find them at: https://dashboard.stripe.com/test/products)"
echo ""

read -p "Enter STRIPE_PRICE_ID_BASIC ($29 plan): " STRIPE_PRICE_ID_BASIC
read -p "Enter STRIPE_PRICE_ID_PRO ($149 plan): " STRIPE_PRICE_ID_PRO
read -p "Enter STRIPE_PRICE_ID_ENTERPRISE ($499 plan): " STRIPE_PRICE_ID_ENTERPRISE

echo ""
echo "----------------------------------------------"
echo "Adding variables to Vercel Production..."
echo "----------------------------------------------"
echo ""

# Add the environment variables
add_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "true"
add_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" "true"
add_env_var "STRIPE_PRICE_ID_BASIC" "$STRIPE_PRICE_ID_BASIC" "false"
add_env_var "STRIPE_PRICE_ID_PRO" "$STRIPE_PRICE_ID_PRO" "false"
add_env_var "STRIPE_PRICE_ID_ENTERPRISE" "$STRIPE_PRICE_ID_ENTERPRISE" "false"

# Also add legacy aliases for compatibility
add_env_var "STRIPE_PRICE_STARTER_MONTHLY" "$STRIPE_PRICE_ID_BASIC" "false"
add_env_var "STRIPE_PRICE_PROFESSIONAL_MONTHLY" "$STRIPE_PRICE_ID_PRO" "false"
add_env_var "STRIPE_PRICE_ENTERPRISE_MONTHLY" "$STRIPE_PRICE_ID_ENTERPRISE" "false"

echo ""
echo "=============================================="
echo -e "${GREEN}Environment variables added!${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Deploy to Vercel: vercel --prod"
echo "2. Verify deployment: ./verify-stripe-env.js"
echo ""
