#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
HOLD=1 # keep processes alive until Ctrl+C by default

log() { printf "\033[90m%s\033[0m\n" "$*"; }
ok()  { printf "\033[32m%s\033[0m\n" "$*"; }
warn(){ printf "\033[33m%s\033[0m\n" "$*"; }
err() { printf "\033[31m%s\033[0m\n" "$*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { err "Missing $1"; return 1; }
}

ensure_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then return 0; fi
  warn "cloudflared not found. Downloading local copy to ~/.local/bin..."
  mkdir -p "$HOME/.local/bin"
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$HOME/.local/bin/cloudflared"
  chmod +x "$HOME/.local/bin/cloudflared"
  export PATH="$HOME/.local/bin:$PATH"
  command -v cloudflared >/dev/null 2>&1 || { err "cloudflared install failed"; return 1; }
}

start_server() {
  log "Building server (one-time)";
  npm run -s server:build
  log "Starting server on port ${PORT}"
  PORT="$PORT" node dist/server/index.js >/tmp/gomoku-server.log 2>&1 &
  SVPID=$!
  echo $SVPID > /tmp/gomoku-server.pid
  for i in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null; then ok "S1 OK: /health 200"; return 0; fi
    sleep 1
  done
  err "Server health did not become ready. See /tmp/gomoku-server.log"
  return 1
}

start_tunnel() {
  ensure_cloudflared || return 1
  log "Starting cloudflared (background) with QUIC..."
  rm -f /tmp/gomoku-cf.log /tmp/gomoku-cf.pid /tmp/gomoku-tunnel.url
  cloudflared tunnel --protocol quic --url "http://127.0.0.1:${PORT}" > /tmp/gomoku-cf.log 2>&1 &
  echo $! > /tmp/gomoku-cf.pid
  # wait up to 20s for URL to appear
  local URL=""
  for i in $(seq 1 20); do
    if [ -f /tmp/gomoku-cf.log ]; then
      URL=$(sed -nE 's/.*(https:\/\/[^ ]+trycloudflare\.com).*/\1/p' /tmp/gomoku-cf.log | head -n1)
      if [ -n "$URL" ]; then break; fi
    fi
    sleep 1
  done
  if [ -z "$URL" ]; then
    warn "QUIC didn't yield URL. Restarting with http2..."
    # restart cloudflared with http2
    if [ -f /tmp/gomoku-cf.pid ]; then kill $(cat /tmp/gomoku-cf.pid) >/dev/null 2>&1 || true; fi
    cloudflared tunnel --protocol http2 --url "http://127.0.0.1:${PORT}" > /tmp/gomoku-cf.log 2>&1 &
    echo $! > /tmp/gomoku-cf.pid
    for i in $(seq 1 20); do
      URL=$(sed -nE 's/.*(https:\/\/[^ ]+trycloudflare\.com).*/\1/p' /tmp/gomoku-cf.log | head -n1)
      if [ -n "$URL" ]; then break; fi
      sleep 1
    done
  fi
  if [ -z "$URL" ]; then warn "Tunnel URL not obtained (timed out)."; return 0; fi
  echo "$URL" > /tmp/gomoku-tunnel.url
  if curl -fsS "$URL/health" >/dev/null; then ok "S2 OK: Tunnel /health 200"; else warn "S2 WARN: Tunnel /health not 200"; fi
  printf "\nInvite (Tunnel): %s\n" "$URL"
}

smoke() {
  local LOCAL_WS="ws://127.0.0.1:${PORT}/ws"
  log "Running smoke (local): $LOCAL_WS"
  npm run -s smoke -- --ws "$LOCAL_WS" || warn "Local smoke failed"
  if [ -f /tmp/gomoku-tunnel.url ]; then
    local URL WS
    URL=$(cat /tmp/gomoku-tunnel.url)
    WS="${URL/https:/wss:}/ws"
    log "Running smoke (tunnel): $WS"
    npm run -s smoke -- --ws "$WS" || warn "Tunnel smoke failed"
  fi
}

main() {
  need node || exit 1
  need npm || exit 1
  start_server || exit 1
  start_tunnel || true
  smoke || true
  ok "Ready. Local: http://localhost:${PORT}"
  if [ -f /tmp/gomoku-tunnel.url ]; then ok "Tunnel: $(cat /tmp/gomoku-tunnel.url)"; fi
  if [ "$HOLD" = "1" ]; then
    warn "Hold mode: keep server + tunnel running. Press Ctrl+C to stop."
    # Keep process alive; trap will cleanup
    while :; do sleep 3600; done
  fi
}

for arg in "$@"; do
  case "$arg" in
    --no-hold) HOLD=0 ;;
  esac
done

trap 'test -f /tmp/gomoku-server.pid && kill $(cat /tmp/gomoku-server.pid) >/dev/null 2>&1 || true; test -f /tmp/gomoku-cf.pid && kill $(cat /tmp/gomoku-cf.pid) >/dev/null 2>&1 || true' EXIT
main "$@"
