#!/bin/bash
# Copies the skills on the default branch into ~/.claude/skills, so a session
# whose branch was cut before a skill was added still gets it. Skills are
# picked up live, so running this mid-session works too:
#   bash <(git show origin/master:.claude/hooks/sync-skills.sh)
set -uo pipefail

# Web sessions only; don't touch ~/.claude on someone's own machine.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || [ "${1:-}" = "--force" ] || exit 0

repo="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$repo" ] && cd "$repo" || exit 0

branch="${SKILLS_BRANCH:-master}"
git fetch --quiet origin "$branch" 2>/dev/null || exit 0

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git archive "origin/$branch" .claude/skills 2>/dev/null | tar -x -C "$tmp" 2>/dev/null || exit 0

dest="$HOME/.claude/skills"
mkdir -p "$dest"
marker=".synced-from-repo"

for src in "$tmp"/.claude/skills/*/; do
  name="$(basename "$src")"
  if [ -d "$repo/.claude/skills/$name" ]; then
    # The checkout already has it; drop our copy so it isn't listed twice.
    [ -f "$dest/$name/$marker" ] && rm -rf "${dest:?}/$name"
    continue
  fi
  # Never overwrite a skill this script didn't put there.
  if [ -e "$dest/$name" ] && [ ! -f "$dest/$name/$marker" ]; then
    continue
  fi
  rm -rf "${dest:?}/$name"
  cp -R "$src" "$dest/$name"
  touch "$dest/$name/$marker"
done

exit 0
