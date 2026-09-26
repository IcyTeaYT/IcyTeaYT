---
version: 1
slug: "src-components-home-tsx"
primary_target: "src/components/Home.tsx"
related_targets: []
---

# Home surface brief

Scope: the single-page TIS Tech Council site (Home.tsx). Mode: Persuade.
Audience: TIS students, staff, parents. Job: understand the council, see its real work, send an idea.
Constraints: dark-first; Clash Display + Inter; motion-rich but reduced-motion safe.
User decisions: round 1 petal redesign and round 2 petal + code blend were both superseded. Round 3 (current): the user restored the FIRST version's UI in full (commit 6d3ff4e) and removed the "In the pipeline" project cards because those projects don't exist yet. The campus app mock, stats box and ideas marquee were kept by choice. The pipeline row reappears automatically if a pipeline project is added to src/data/projects.ts; stats never show a zero.

## Direction contract
THESIS: A premium, motion-rich launch page for a student tech council, in the Linear/Vercel register the original brief asked for: near-black navy, TIS blue light, one electric cyan accent.
OWN-WORLD: Ink navy ground (#04060C) with blooms of TIS blue (#2F6FF5) and cyan (#18D4EE); Clash Display headlines with tight tracking, Inter body; numbered mono eyebrows; glass pill nav; bento cards with cursor spotlight borders; the four logo petal colours only in the logo and brand moments; TISMUN keeps its own palette inside its card.
STORY: Headline and particle-network hero, ideas marquee, what the council does (bento), the TISMUN platform with a live countdown, the three founders, the private suggestion box.
FIRST VIEWPORT: "Student-built tech for a smarter TIS." word-by-word over a cursor-reactive particle network and dot grid; "Est. 2026" glass pill; magnetic "Suggest an idea" and "See what we've built"; motto rail and scroll cue at the bottom.
FORM: Code-led; restored by the user from the first build (no concept roll). Signature interaction: particle network and grid light up around the cursor.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
