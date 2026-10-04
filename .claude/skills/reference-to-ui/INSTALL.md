# Installing reference-to-ui

Builds websites and UIs from an example you give it (screenshot, URL, screen recording, brand), checks the result against the example in a real browser, and writes Higgsfield prompts when the page needs cinematic footage.

## Claude Code (terminal, desktop app, IDE)

Personal install, available in every project:

```bash
mkdir -p ~/.claude/skills
unzip reference-to-ui.zip -d ~/.claude/skills/
```

Or for one project only: unzip into `<project>/.claude/skills/`.

Restart Claude Code (or start a new session). Check it loaded by asking "what skills do you have?", or just say "make a site similar to this" with a screenshot or link.

## Claude.ai (web and desktop chat)

Settings > Capabilities > Skills > Upload skill, and choose `reference-to-ui.zip`. The bundled scripts need a code environment, so use it where code execution is turned on.

## One-time setup on each machine

The skill's scripts need Node 18+, Playwright with Chromium, ffmpeg and python3. Check and install:

```bash
bash ~/.claude/skills/reference-to-ui/scripts/doctor.sh            # check
bash ~/.claude/skills/reference-to-ui/scripts/doctor.sh --install  # install what can be installed
```

- macOS: needs Homebrew for ffmpeg (`brew install ffmpeg`).
- Windows: run Claude Code inside WSL (recommended) or Git Bash, so the `.sh` scripts work.

## Works better with (optional)

If these skills are also installed, reference-to-ui uses them; if not, it works on its own:
`ui-ux-pro-max`, `awesome-design-md`, `awesome-claude-design`, `design-motion-principles`, `taste-skill`, `soft-skill`, `minimalist-skill`, `brutalist-skill`, `gpt-tasteskill`, `ui-styling`, `playwright-cli`.

## What is inside

- `SKILL.md`: the workflow.
- `references/`: skill router, GSAP patterns, example sources (Refero, Godly), Higgsfield prompting.
- `scripts/`: capture, compare, record, slop-check, video-ref, frames, higgsfield-prompts, doctor.
- `assets/scroll-sequence/`: dependency-free scroll-scrubbed footage player and page template.
