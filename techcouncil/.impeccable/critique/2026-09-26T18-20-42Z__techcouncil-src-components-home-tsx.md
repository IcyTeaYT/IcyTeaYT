---
target: TIS Tech Council site
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 3
target_identity: "file:/home/user/IcyTeaYT/techcouncil/src/components/Home.tsx"
target_fingerprint: "sha256:7c90a9b01033dea5716c4eade87bceecb3845a4e8009c7d361cd0304ed84c379"
target_path: /home/user/IcyTeaYT/techcouncil/src/components/Home.tsx
timestamp: 2026-09-26T18-20-42Z
slug: techcouncil-src-components-home-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | TISMUN badge says "Live" 18 days before the event, beside "Link coming soon" |
| 2 | Match System / Real World | 2 | Invented data: "Wi-Fi uptime 99.4%", "campus.tis" app, "Robotics club · 14 going" |
| 3 | User Control and Freedom | 3 | Intro has no visible skip on first load |
| 4 | Consistency and Standards | 2 | Suggest/Suggestions/Send suggestion; motto ×3; "In the pipeline" ×4 |
| 5 | Error Prevention | 3 | Hint and error duplicate each other |
| 6 | Recognition Rather Than Recall | 3 | Founder "+" buttons unlabelled visually |
| 7 | Flexibility and Efficiency | n/a | One-visit Persuade page |
| 8 | Aesthetic and Minimalist Design | 1 | Six decorative systems stacked in hero; filler bento cells |
| 9 | Error Recovery | 3 | Clear, but duplicated copy |
| 10 | Help and Documentation | n/a | Marketing surface |
| **Total** | | **20/32** | Acceptable (63%) |

## Design Specificity Verdict
Fails. Swap "TIS" for any name and it launches a devtools startup. Template kit: glass "EST. 2026" pill, dot grid + cursor spotlight, 3 blooms, particle canvas, gradient shine text, magnetic shine button, tilted marquee, scroll-lit statement, numbered eyebrows, bento with fake dashboard, spotlight borders, initials-on-bloom founder cards, giant gradient footer wordmark. The school's own asset (the four-petal logo colours) is quarantined to its tile.
Detector: CLI 2 gradient-text (Footer.tsx:77, index.css:113) + 1 false-positive low-contrast (index.html). Browser: 53 hits desktop / 52 mobile — ai-color-palette 20, radial-spotlight-glow 8, undersized-ui-text 11, gradient-text 5, dark-glow 4, kicker-above-heading 4, marquee 3, nested-cards 2. False positives: text-occlusion (overlay labels), tight-leading (sr-only), buried-raster (crossfade imgs, grain).

## Priority Issues
- [P0] Projects H2 invisible on mobile — clip-path mask variant gated on whileInView never fires. Fix: no visibility gated on an observer.
- [P1] Fake data and false status (dashboard mock, 99.4%, "Live", 3/1/3 stats). Fix: delete; show real artefacts; "Launching Oct 15".
- [P1] Template aesthetic, no school identity. Fix: strip hero decoration to one light source; petal colours become the system; owl and motto structural; kill eyebrows/gradient text/footer wordmark gradient.
- [P1] Founders two-thirds empty (initials, "Bio coming soon" ×2, ~2.5 mobile screens). Fix: compact, honest treatment until photos exist.
- [P2] Redundancy/bloat: marquee of hypothetical ideas before real work; purpose said 4×, motto 3×. Fix: say it once; proof right after hero.

## Persona Red Flags
Jordan: can't tell real from mock; faceless founders. Riley: dead "Link coming soon" on a "Live" project; grey 0.16-opacity paragraph when jumping via nav; duplicate error. Casey: missing heading; About ~5 screens; hero pill wraps 3 lines; nav CTA gone on mobile; 40px menu button, 37px chips.

## Minor Observations
mist-500 (#5C6A88) help text + placeholder 3.7:1 fails AA; 10px labels ×11; zero-offset glows; stack chips are developer-speak; Clash at 14–24px looks cramped; ui-monospace varies by OS; intro low value.

## Questions to Consider
What if the four petal colours were the only colour system? Why a Series-B launch page for one shipped project — would an honest "here's what we're starting" read as more trustworthy? What if real anonymised suggestions were the proof?
