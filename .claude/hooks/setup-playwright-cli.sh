#!/bin/bash
# Makes the playwright-cli skill usable in web sessions: installs the CLI,
# points it at the preinstalled Chromium, and has that browser trust the
# session's HTTPS proxy CA.
set -uo pipefail

# Web sessions only; don't touch someone's own machine.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || [ "${1:-}" = "--force" ] || exit 0

if ! command -v playwright-cli >/dev/null 2>&1; then
  npm install -g --silent @playwright/cli@latest >/dev/null 2>&1 || exit 0
fi

# The CLI defaults to Google Chrome, which isn't installed here.
chromium=/opt/pw-browsers/chromium
if [ -x "$chromium" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo "export PLAYWRIGHT_MCP_BROWSER=chromium"
    echo "export PLAYWRIGHT_MCP_EXECUTABLE_PATH=$chromium"
  } >> "$CLAUDE_ENV_FILE"
fi

# Chromium reads trust from the NSS store, not the system CA bundle.
ca=/root/.ccr/agent-proxy-ca.crt
nssdb="$HOME/.pki/nssdb"
if [ -f "$ca" ]; then
  if ! command -v certutil >/dev/null 2>&1; then
    apt-get install -y -q libnss3-tools >/dev/null 2>&1 \
      || { apt-get update -q >/dev/null 2>&1 && apt-get install -y -q libnss3-tools >/dev/null 2>&1; }
  fi
  if command -v certutil >/dev/null 2>&1; then
    mkdir -p "$nssdb"
    [ -f "$nssdb/cert9.db" ] || certutil -d "sql:$nssdb" -N --empty-password >/dev/null 2>&1
    certutil -d "sql:$nssdb" -L -n ccr-agent-proxy >/dev/null 2>&1 \
      || certutil -d "sql:$nssdb" -A -t "C,," -n ccr-agent-proxy -i "$ca" >/dev/null 2>&1
  fi
fi

exit 0
