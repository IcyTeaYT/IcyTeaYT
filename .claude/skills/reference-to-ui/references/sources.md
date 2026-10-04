# Where examples come from

Ranked. Use the first one available.

1. **What the user gave.** Screenshot, URL, video, Figma export, a Refero style link, a DESIGN.md. This always wins.
2. **The project's own assets.** Logo, colours, photos, real copy. Always collected, even with an external example.
3. **A brand system in this repo.** `awesome-design-md/design-md/<brand>/` (74 brands), `awesome-claude-design/design-md/<family>/` (by aesthetic family, plus remixes).
4. **A gallery, then the real site.** Browse a gallery to pick real sites, then capture the real site itself with `scripts/capture.mjs` (or video-record it). Never treat a gallery thumbnail as the spec when the live site is reachable.

## Refero (refero.design, styles.refero.design)

Refero Styles is a library of real websites, each with screenshots, a palette with colour roles, a type scale and a DESIGN.md export. It is a strong source, with one rule:

- **Do not crawl or scrape Refero.** Its robots.txt disallows AI agents (ClaudeBot, anthropic-ai, Claude-Web and others). Never fetch Refero pages in bulk or run capture scripts against them.
- **Use it the ways Refero allows:**
  - The **Refero MCP** (`https://refero.design/mcp`). If a Refero connector is attached to the session, search and read styles through it.
  - The **user** browses Refero and gives you: a style's DESIGN.md export (paste or file), its screenshots, or the original site URL shown on the style page. Then capture the **original site** with `capture.mjs` (that is the real reference; Refero's record is a summary of it).
- When the user only names Refero ("use refero styles"), ask them to pick 1 to 3 styles and paste the DESIGN.md exports or original site URLs, or to connect the Refero MCP. Meanwhile offer close options from `awesome-design-md` / `awesome-claude-design`.

## Godly (godly.website)

Curated motion-heavy sites, good for GSAP-style references. Browse it to find candidates, show the user 2 or 3 picks (name + URL), and once they choose, capture the real site with `capture.mjs` and record its motion (`scripts/record.mjs` against the live URL, then `scripts/video-ref.sh` on the recording).

## Blocked from this environment (as of writing)

Awwwards (connection reset) and Land-book (403). Ask the user for screenshots or the original site URL instead.

## When there is no example

Ask once, concretely: "Send 1 to 3 sites, screenshots or a screen recording you like." In the same message offer 2 or 3 named options that fit the project from `awesome-design-md` / `awesome-claude-design`, each with a one-line description. Do not start building a look without one, unless the user says to go ahead; then the project's own assets are the reference.
