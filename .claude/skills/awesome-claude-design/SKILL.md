---
name: awesome-claude-design
description: Library of ready-made DESIGN.md design-system inspirations (grouped by aesthetic family), brand remixes, prompts and recipes. Use when starting a UI or design system and you want a concrete visual direction — e.g. "make it feel like Linear", "editorial", "brutalist", "cinematic", "terminal", "warm", "playful", "glass", "data-dense" — or to remix two brands.
---

# Awesome Claude Design

Vendored from [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design) (MIT, see `LICENSE`).
`VOLTAGENT-README.md` is the index from [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design), which links to more DESIGN.md files hosted on getdesign.md.

## Contents

- `design-md/<family>/<brand>.md` — DESIGN.md files (tokens + rules + rationale) grouped by aesthetic family:
  `brutalist`, `cinematic`, `data-dense`, `editorial`, `glass`, `indie`, `playful`, `terminal`, `warm`.
- `design-md/remix/` — two-brand blends (e.g. `linear-x-claude.md`, `stripe-x-a24.md`).
- `prompts/` — reusable prompts: picking a family, breaking the default aesthetic, remixing brands, turning a brand into a DESIGN.md, auditing a live site, a 3-designer debate.
- `recipes/` — step-by-step workflows (repo → design system, landing page in 20 min, wireframe → hi-fi, Figma → DESIGN.md, pitch decks, and more).
- `showcase/` — case studies.
- `README.md` — the full upstream guide.

## How to use

1. Work out the feel the user wants. If it's unclear, follow `prompts/family-picker.md`.
2. `ls design-md/<family>/` and read the closest DESIGN.md (or a `remix/` file).
3. Treat that file as the design spec: apply its tokens (color, type, spacing, radius, elevation) and follow its rules and rationale when building the UI.
4. For multi-step jobs, follow the matching file in `recipes/`.
