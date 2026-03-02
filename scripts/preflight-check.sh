#!/bin/bash
# Pre-flight check before creating files in BO2026
# Usage: source scripts/preflight-check.sh

echo "🔍 BO2026 Pre-Flight Check"
echo "=========================="

# Check for existing dashboard files
echo ""
echo "Dashboard files:"
find /Users/clawdbot/projects/leadflow -maxdepth 1 -name "*dashboard*" -type f 2>/dev/null | while read f; do
  echo "  ✅ $(basename $f)"
done

# Check hosted version
echo ""
echo "Hosted dashboard:"
if curl -s http://127.0.0.1:8787/leadflow/dashboard.html > /dev/null 2>&1; then
  echo "  ✅ https://stojanadmins-mac-mini.tail3ca16c.ts.net/leadflow/dashboard.html"
else
  echo "  ⚠️  Not responding on localhost:8787"
fi

# Check manifest exists
echo ""
echo "Manifest:"
if [ -f "/Users/clawdbot/projects/leadflow/FILE_MANIFEST.md" ]; then
  echo "  ✅ FILE_MANIFEST.md exists"
else
  echo "  ❌ FILE_MANIFEST.md missing"
fi

echo ""
echo "=========================="
echo "Before creating new files:"
echo "1. Check FILE_MANIFEST.md"
echo "2. Search: find . -name '*filename*'"
echo "3. Verify hosted version exists"
