# Installing reference-to-ui

Builds websites and UIs from an example you give it (screenshot, URL, screen recording, brand) and checks the result against the example in a real browser. Makes cinematic scroll sites without video tools: it writes ChatGPT / Nano Banana image prompts, turns your stills into 3D camera journeys with depth maps, and has procedural shader scenes as backup.

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
- `references/`: skill router, cinematic playbook, GSAP patterns, example sources (Refero, Godly), Higgsfield prompting (optional).
- `scripts/`: capture, compare, record, slop-check, video-ref, frames, image-prompts, prepare-film, depth, higgsfield-prompts (optional), doctor.
- `assets/cinematic/`: the cinematic engine (stills + depth → scroll film with atmosphere and captions), five shader backup scenes, and a template page.
- `assets/scroll-sequence/`: dependency-free scroll-scrubbed footage player and page template.

The depth tool downloads a free depth model on first use (about 100 MB for the default high-quality version, internet needed once); nothing else needs an account or key. For the sharpest results, generate images at the highest resolution your tool offers, and upscale small ones with the free Upscayl app.
