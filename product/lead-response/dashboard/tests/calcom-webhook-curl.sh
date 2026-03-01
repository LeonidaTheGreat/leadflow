#!/bin/bash

# Cal.com Webhook Integration Test
# Tests UC-6 acceptance criteria using curl

set -e

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/webhook/calcom}"
WEBHOOK_SECRET="${CALCOM_WEBHOOK_SECRET:-test-secret-123}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🧪 Cal.com Webhook Integration Test"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Check if Next.js server is running
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
  echo "❌ Next.js dev server not running at http://localhost:3000"
  echo "   Start with: npm run dev"
  exit 1
fi

echo "✅ Next.js server is running"
echo ""

# Test 1: Mock booking created event
echo "Test 1: BOOKING_CREATED event"
echo "────────────────────────────────────────────────────────────"

BOOKING_ID=$((RANDOM + 10000))
START_TIME=$(date -u -v+1d +"%Y-%m-%dT%H:%M:%SZ")
END_TIME=$(date -u -v+1d -v+30M +"%Y-%m-%dT%H:%M:%SZ")

PAYLOAD=$(cat <<EOF
{
  "triggerEvent": "BOOKING_CREATED",
  "payload": {
    "type": "discovery_call",
    "title": "Discovery Call with Test Lead",
    "description": "Testing Cal.com integration",
    "startTime": "$START_TIME",
    "endTime": "$END_TIME",
    "attendees": [
      {
        "email": "test@example.com",
        "name": "Test Lead",
        "timeZone": "America/New_York",
        "phoneNumber": "+15555551234"
      }
    ],
    "organizer": {
      "email": "agent@leadflow.ai",
      "name": "Sarah Chen",
      "timeZone": "America/Los_Angeles"
    },
    "uid": "test-booking-$(date +%s)",
    "bookingId": $BOOKING_ID,
    "eventTypeId": 12345,
    "status": "ACCEPTED",
    "metadata": {
      "videoCallUrl": "https://meet.google.com/test-call"
    }
  }
}
EOF
)

# Generate HMAC signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

echo "Booking ID: $BOOKING_ID"
echo "Start Time: $START_TIME"
echo "Signature: ${SIGNATURE:0:20}..."
echo ""

# Send webhook request
HTTP_CODE=$(curl -s -o /tmp/webhook-response.txt -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Calcom-Signature: $SIGNATURE" \
  -d "$PAYLOAD")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Webhook accepted (HTTP $HTTP_CODE)"
else
  echo "❌ FAIL: Unexpected HTTP code: $HTTP_CODE"
  echo "Response:"
  cat /tmp/webhook-response.txt
  exit 1
fi

echo ""

# Test 2: Invalid signature rejection
echo "Test 2: Invalid signature rejection"
echo "────────────────────────────────────────────────────────────"

HTTP_CODE=$(curl -s -o /tmp/webhook-invalid.txt -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Calcom-Signature: invalid-signature-12345" \
  -d "$PAYLOAD")

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASS: Invalid signature rejected (HTTP $HTTP_CODE)"
else
  echo "❌ FAIL: Expected 401/403, got HTTP $HTTP_CODE"
  cat /tmp/webhook-invalid.txt
  exit 1
fi

echo ""

# Test 3: Missing signature header
echo "Test 3: Missing signature header"
echo "────────────────────────────────────────────────────────────"

HTTP_CODE=$(curl -s -o /tmp/webhook-no-sig.txt -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PASS: Missing signature rejected (HTTP $HTTP_CODE)"
else
  echo "❌ FAIL: Expected 400/401, got HTTP $HTTP_CODE"
  cat /tmp/webhook-no-sig.txt
  exit 1
fi

echo ""

# Test 4: BOOKING_RESCHEDULED event
echo "Test 4: BOOKING_RESCHEDULED event"
echo "────────────────────────────────────────────────────────────"

RESCHEDULE_PAYLOAD=$(cat <<EOF
{
  "triggerEvent": "BOOKING_RESCHEDULED",
  "payload": {
    "type": "discovery_call",
    "title": "Discovery Call (Rescheduled)",
    "description": "Testing reschedule flow",
    "startTime": "$START_TIME",
    "endTime": "$END_TIME",
    "attendees": [
      {
        "email": "test@example.com",
        "name": "Test Lead",
        "timeZone": "America/New_York"
      }
    ],
    "organizer": {
      "email": "agent@leadflow.ai",
      "name": "Sarah Chen",
      "timeZone": "America/Los_Angeles"
    },
    "uid": "test-reschedule-$(date +%s)",
    "bookingId": $BOOKING_ID,
    "eventTypeId": 12345,
    "status": "ACCEPTED",
    "metadata": {
      "videoCallUrl": "https://meet.google.com/new-call"
    }
  }
}
EOF
)

RESCHEDULE_SIG=$(echo -n "$RESCHEDULE_PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

HTTP_CODE=$(curl -s -o /tmp/webhook-reschedule.txt -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Calcom-Signature: $RESCHEDULE_SIG" \
  -d "$RESCHEDULE_PAYLOAD")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Reschedule event accepted (HTTP $HTTP_CODE)"
else
  echo "❌ FAIL: Unexpected HTTP code: $HTTP_CODE"
  cat /tmp/webhook-reschedule.txt
  exit 1
fi

echo ""

# Test 5: BOOKING_CANCELLED event
echo "Test 5: BOOKING_CANCELLED event"
echo "────────────────────────────────────────────────────────────"

CANCEL_PAYLOAD=$(cat <<EOF
{
  "triggerEvent": "BOOKING_CANCELLED",
  "payload": {
    "type": "discovery_call",
    "title": "Discovery Call (Cancelled)",
    "description": "Testing cancellation flow",
    "startTime": "$START_TIME",
    "endTime": "$END_TIME",
    "attendees": [
      {
        "email": "test@example.com",
        "name": "Test Lead",
        "timeZone": "America/New_York"
      }
    ],
    "organizer": {
      "email": "agent@leadflow.ai",
      "name": "Sarah Chen",
      "timeZone": "America/Los_Angeles"
    },
    "uid": "test-cancel-$(date +%s)",
    "bookingId": $BOOKING_ID,
    "eventTypeId": 12345,
    "status": "CANCELLED",
    "metadata": {}
  }
}
EOF
)

CANCEL_SIG=$(echo -n "$CANCEL_PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

HTTP_CODE=$(curl -s -o /tmp/webhook-cancel.txt -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Calcom-Signature: $CANCEL_SIG" \
  -d "$CANCEL_PAYLOAD")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Cancellation event accepted (HTTP $HTTP_CODE)"
else
  echo "❌ FAIL: Unexpected HTTP code: $HTTP_CODE"
  cat /tmp/webhook-cancel.txt
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ All webhook tests passed!"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if booking was created in database (optional)
echo "💡 To verify database storage:"
echo "   1. Check Supabase dashboard for bookings table"
echo "   2. Look for booking ID: $BOOKING_ID"
echo "   3. Verify all 3 events (created, rescheduled, cancelled) were logged"
echo ""

exit 0
