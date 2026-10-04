# Skill router

Which installed design skill to pull in, when, and for what. All paths are under the skills folder (`.claude/skills/` in a project, `~/.claude/skills/` for a personal install).

**These skills are optional.** Check whether each exists before using it (`ls <skills-dir>`). If one is missing, use the fallback in this file or proceed from the example alone; never block on a missing skill. The scripts and references inside `reference-to-ui` work on their own.

**Precedence, always:** the user's words > the example (reference) > the project's existing design system > anything a skill below suggests. A skill fills gaps the example leaves open; it never overrides what the example shows. If a skill's rule contradicts the example (e.g. it bans a pattern the example uses), the example wins and you say so in one line.

## Design intelligence (use on every build)

### `ui-ux-pro-max`: rules, palettes, type pairings, UX checks, GSAP presets
Python 3, no deps. Run from the folder that contains the skills (fallback if not installed: pick type pairings and UX rules yourself and say so):

```bash
P=<skills-dir>/ui-ux-pro-max/scripts/search.py
python3 $P "<product> <industry> <mood from the example>" --design-system -p "<Name>"   # full system, only to fill gaps
python3 $P "<query>" --domain typography     # font pairing close to the example's fonts (for substitutes)
python3 $P "<query>" --domain google-fonts   # free match for a paid font seen in the example
python3 $P "<query>" --domain color          # only when the example gives no palette
python3 $P "<query>" --domain landing        # section order, only when the example has no structure for that section
python3 $P "<query>" --domain ux             # always: forms, focus, contrast, touch targets, motion safety
python3 $P "<query>" --domain gsap           # GSAP preset matching the motion seen in the example
python3 $P "<query>" --stack <stack>         # stack-specific implementation details
```

Use it for:
- **Substitutions**: closest free font to the example's paid font; palette roles when the example is a single screenshot.
- **Gaps**: sections or states the example does not show (empty states, errors, mobile nav, footer).
- **UX audit before handover**: run 3 to 5 `--domain ux` queries for what you built (forms, focus, contrast, touch, reduced motion) and fix what applies.

Do not use `--design-system` output to replace the example's own palette, type or layout.

## Where the look comes from (pick by what the user gave)

| User gave | Use |
|---|---|
| Screenshot / image | Read it at full size and measure from pixels (see SKILL.md step 1) |
| Website URL | `scripts/capture.mjs` (measured tokens) |
| Video (screen recording, reel, `.mov`, `.mp4`) | `scripts/video-ref.sh` (contact sheet, key frames, motion timeline), then `references/gsap.md` |
| Brand name ("like Stripe", "Apple-style") | `awesome-design-md/design-md/<brand>/DESIGN.md` |
| A feel or family ("editorial", "brutalist", "cinematic", "terminal", "warm", "glass", "playful") | `awesome-claude-design/design-md/<family>/` (and `prompts/family-picker.md` if unsure) |
| Two brands to blend | `awesome-claude-design/design-md/remix/` |
| A Refero style link or DESIGN.md export | Read what the user pasted (see `references/sources.md` for Refero rules) |
| Nothing | Ask for examples; offer options (see `references/sources.md`) |

## Style skills: only when the example (or the user) points there

These carry strong opinions. Use one only when the example clearly belongs to its family, or the user names it. Take its craft rules (spacing, type, detail), not its layout mandates.

| Skill | Use when the example is… | Take | Ignore when an example exists |
|---|---|---|---|
| `soft-skill` | premium agency, soft shadows, refined cards | spacing, shadow and card craft | its fixed font/section prescriptions |
| `minimalist-skill` | warm monochrome, editorial, flat | type contrast, restraint | its palette if the example differs |
| `brutalist-skill` | Swiss grid, terminal, raw | grid rigour, type scale contrast | degradation effects the example lacks |
| `taste-skill` | any landing/portfolio | its anti-slop pre-flight check | its own direction-picking |
| `gpt-tasteskill` | GSAP-heavy, scroll-driven sites | GSAP technique (pinning, scrubbing, stacking) | random layout picks, mandatory AIDA/bento, "static is forbidden" |
| `stitch-skill` | user wants a DESIGN.md for Google Stitch | DESIGN.md format | n/a |
| `redesign-skill` | restyling an existing site | its audit of generic patterns | n/a |
| `ui-styling` | stack is React + Tailwind/shadcn | component implementation | default shadcn look if the example differs |
| `design-system` | user wants tokens/components formalised | three-layer token structure | n/a |

## Motion

| Need | Use |
|---|---|
| Scroll-driven, pinned, scrubbed, image-sequence, text reveals | `references/gsap.md` + `ui-ux-pro-max --domain gsap` |
| Micro-interactions, hover, enter/exit, component transitions | `design-motion-principles` (Create mode) |
| Check the motion you built is not "AI slop motion" | `design-motion-principles` (Audit mode) on the finished page |
| Footage the example has but the user lacks (jet, drone, product shot) | `references/higgsfield.md` + `scripts/higgsfield-prompts.mjs` (built in); then `scripts/frames.sh` and `assets/scroll-sequence/`. `ads-and-videos`, if installed, adds ad-style shot lists |

## Images and concepts

| Need | Use |
|---|---|
| User wants options before committing and has no example | `imagegen-frontend-web` / `imagegen-frontend-mobile` concept images, which then become the reference |
| Logos, icons, banners in the example's style | `design`, `banner-design`, `brandkit` |

## Always on

- `output-skill`: write complete files, no placeholders or truncation.
- `playwright-cli`: interactive browser work if you need to click through a reference site (menus, hover states) before capturing it.
