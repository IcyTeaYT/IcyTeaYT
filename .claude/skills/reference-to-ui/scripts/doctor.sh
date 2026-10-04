#!/usr/bin/env bash
# Check (and optionally install) what reference-to-ui needs. Usage: bash doctor.sh [--install]
# Needs: Node 18+, Playwright + Chromium (capture/compare/record/slop-check), ffmpeg + python3 (video-ref, frames).
# Windows: run inside WSL or Git Bash.
HERE="$(cd "$(dirname "$0")" && pwd)"
INSTALL=0; [ "${1:-}" = "--install" ] && INSTALL=1
ok=1
say() { printf '%-12s %s\n' "$1" "$2"; }
os="$(uname -s)"

if command -v node >/dev/null; then
  v=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$v" -ge 18 ]; then say node "ok ($(node -v))"; else say node "too old ($(node -v)), need 18+"; ok=0; fi
else say node "missing: install from https://nodejs.org (LTS)"; ok=0; fi

if command -v node >/dev/null; then
  if node --input-type=module -e "import('$HERE/_browser.mjs').then(m=>{m.loadPlaywright();})" >/dev/null 2>&1; then
    say playwright "ok"
  else
    say playwright "missing"; ok=0
    if [ $INSTALL = 1 ]; then npm i -g playwright && npx playwright install chromium && say playwright "installed"; ok=1
    else echo "             install: npm i -g playwright && npx playwright install chromium"; fi
  fi
  if node --input-type=module -e "import('$HERE/_browser.mjs').then(async m=>{const b=await m.launch(['about:blank']);await b.close();})" >/dev/null 2>&1; then
    say chromium "ok (launches headless)"
  else
    say chromium "cannot launch"; ok=0
    if [ $INSTALL = 1 ]; then npx playwright install --with-deps chromium && say chromium "installed"
    else echo "             install: npx playwright install --with-deps chromium"; fi
  fi
fi

if command -v ffmpeg >/dev/null; then say ffmpeg "ok"
else
  say ffmpeg "missing (needed for video-ref.sh and frames.sh only)"; ok=0
  if [ $INSTALL = 1 ]; then
    if [ "$os" = Darwin ] && command -v brew >/dev/null; then brew install ffmpeg
    elif command -v apt-get >/dev/null; then (sudo -n true 2>/dev/null && sudo apt-get install -y ffmpeg) || apt-get install -y ffmpeg
    else echo "             install ffmpeg from https://ffmpeg.org/download.html"; fi
  else
    [ "$os" = Darwin ] && echo "             install: brew install ffmpeg" || echo "             install: sudo apt-get install -y ffmpeg  (or https://ffmpeg.org)"
  fi
fi

if command -v python3 >/dev/null; then say python3 "ok"; else say python3 "missing (video-ref.sh motion timeline)"; fi

[ $ok = 1 ] && echo "All set." || echo "Some tools are missing. Re-run with --install to install what can be installed automatically."
