#!/bin/bash
# Infrastructure Watchdog — ensure Cloudflare tunnel and API server are running
#
# Checks that:
#   1. cloudflared (Cloudflare tunnel) is running
#   2. Local API server is listening on port 8788
#
# If either is down, attempts a restart. Exits 0 if both are up, 1 if either
# cannot be brought up.
#
# Usage:
#   scripts/infra-watchdog.sh [--check-only] [--quiet]
#
# Called automatically by e2e-flow-tests.sh before running tests.

set -euo pipefail

CLOUDFLARED_BIN="${CLOUDFLARED_BIN:-/opt/homebrew/bin/cloudflared}"
API_SERVER_JS="${API_SERVER_JS:-$HOME/.openclaw/dashboard/api-server.js}"
NODE_BIN="${NODE_BIN:-/opt/homebrew/bin/node}"
TUNNEL_LOG="${TUNNEL_LOG:-/tmp/cloudflared-tunnel.log}"
API_LOG_OUT="${API_LOG_OUT:-$HOME/.openclaw/workspace/logs/api-server.out.log}"
API_LOG_ERR="${API_LOG_ERR:-$HOME/.openclaw/workspace/logs/api-server.err.log}"
API_PORT=8788
STARTUP_WAIT=5  # seconds to wait for service to bind

CHECK_ONLY=false
QUIET=false

for arg in "$@"; do
  case $arg in
    --check-only) CHECK_ONLY=true ;;
    --quiet) QUIET=true ;;
  esac
done

log() {
  $QUIET || echo "$@"
}

ok=true

# ── Check / restart cloudflared ─────────────────────────────────────────────
if pgrep -f "cloudflared tunnel run" >/dev/null 2>&1; then
  log "  ✅ cloudflared: running"
else
  log "  ⚠️  cloudflared: not running"
  if $CHECK_ONLY; then
    log "  ❌ cloudflared is down (--check-only; not restarting)"
    ok=false
  else
    if [ ! -x "$CLOUDFLARED_BIN" ]; then
      log "  ❌ cloudflared binary not found at $CLOUDFLARED_BIN"
      ok=false
    else
      log "  🔄 Starting cloudflared tunnel..."
      "$CLOUDFLARED_BIN" tunnel run leadflow-api >> "$TUNNEL_LOG" 2>&1 &
      sleep 2
      if pgrep -f "cloudflared tunnel run" >/dev/null 2>&1; then
        log "  ✅ cloudflared: started (PID $!)"
      else
        log "  ❌ cloudflared failed to start — check $TUNNEL_LOG"
        ok=false
      fi
    fi
  fi
fi

# ── Check / restart API server ───────────────────────────────────────────────
if lsof -nP -iTCP:$API_PORT -sTCP:LISTEN >/dev/null 2>&1; then
  log "  ✅ api-server: listening on port $API_PORT"
else
  log "  ⚠️  api-server: not listening on port $API_PORT"
  if $CHECK_ONLY; then
    log "  ❌ api-server is down (--check-only; not restarting)"
    ok=false
  else
    if [ ! -f "$API_SERVER_JS" ]; then
      log "  ❌ api-server.js not found at $API_SERVER_JS"
      ok=false
    elif [ ! -x "$NODE_BIN" ]; then
      log "  ❌ node binary not found at $NODE_BIN"
      ok=false
    else
      log "  🔄 Starting API server..."
      # Load env from ~/.env — api-server.js also does this but we need keys for healthcheck
      _local_pg_url=$(grep '^LOCAL_PG_URL=' "$HOME/.env" 2>/dev/null | head -1 | cut -d'=' -f2-)
      _api_key=$(grep '^LEADFLOW_API_KEY=' "$HOME/.env" 2>/dev/null | head -1 | cut -d'=' -f2-)
      LOCAL_PG_URL="$_local_pg_url" LEADFLOW_API_KEY="$_api_key" \
        "$NODE_BIN" "$API_SERVER_JS" >> "$API_LOG_OUT" 2>> "$API_LOG_ERR" &
      # Wait for the port to be bound
      _waited=0
      while [ $_waited -lt $STARTUP_WAIT ]; do
        sleep 1
        _waited=$((_waited + 1))
        lsof -nP -iTCP:$API_PORT -sTCP:LISTEN >/dev/null 2>&1 && break
      done
      if lsof -nP -iTCP:$API_PORT -sTCP:LISTEN >/dev/null 2>&1; then
        log "  ✅ api-server: started on port $API_PORT"
      else
        log "  ❌ api-server failed to bind port $API_PORT — check $API_LOG_ERR"
        ok=false
      fi
    fi
  fi
fi

$ok && exit 0 || exit 1
