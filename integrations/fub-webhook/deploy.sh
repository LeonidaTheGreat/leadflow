#!/bin/bash
# Deploy FUB webhook to Vercel

set -e

echo "🚀 Deploying FUB Webhook to Vercel..."

# Check if FUB_API_KEY is set
if [ -z "$FUB_API_KEY" ]; then
    echo "❌ ERROR: FUB_API_KEY environment variable not set"
    echo "Get your API key from FUB → Admin → API → API Keys"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to Vercel
echo "🌐 Deploying..."
vercel --prod --yes

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Copy the deployed URL above"
echo "2. Add it to your AI agent configuration"
echo "3. Test with: npm test"
