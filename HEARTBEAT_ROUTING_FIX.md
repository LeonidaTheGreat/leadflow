# Heartbeat Routing Fix

## Problem
Heartbeat posts going to General instead of topic 10788 (Orchestrator topic).

## Root Cause
The heartbeat session format `agent:...:topic:10788` isn't properly routing to topics.

## Fix

Edit `/Users/clawdbot/.openclaw/openclaw.json` and change:

**FROM:**
```json
"heartbeat": {
  "every": "5m",
  "accountId": "orchestrator",
  "session": "agent:leadflow-orchestrator:telegram:group:-1003852328909:topic:10788",
  "prompt": "..."
}
```

**TO:**
```json
"heartbeat": {
  "every": "5m",
  "accountId": "orchestrator",
  "session": "telegram:-1003852328909:10788",
  "prompt": "..."
}
```

And for PM:

**FROM:**
```json
"heartbeat": {
  "every": "240m",
  "accountId": "pm",
  "session": "agent:product-manager:telegram:group:-1003852328909:topic:10877",
  "prompt": "..."
}
```

**TO:**
```json
"heartbeat": {
  "every": "240m",
  "accountId": "pm",
  "session": "telegram:-1003852328909:10877",
  "prompt": "..."
}
```

## Alternative Fix (If Above Doesn't Work)

If topics still don't work, the fallback is to disable heartbeat auto-posts and have the orchestrator manually post to the correct topic using the `message` tool with explicit topic targeting.

## Current Workaround

Until fixed, the heartbeat posts will continue going to General. The content is still useful but location is wrong.

## To Apply Fix

1. Stop OpenClaw: `openclaw stop`
2. Edit `/Users/clawdbot/.openclaw/openclaw.json`
3. Make the changes above
4. Start OpenClaw: `openclaw start`
