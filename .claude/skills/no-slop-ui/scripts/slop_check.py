#!/usr/bin/env python3
"""
slop_check.py — flag the tells that make a UI read as AI-generated or templated.

Usage:
  python3 slop_check.py <file-or-dir> [more paths...] [--strict] [--json]

Scans .html .css .scss .jsx .tsx .js .ts .vue .svelte .astro .md(x) files (skips node_modules, dist, build, .next).
Severity:
  ERROR  quality-floor failures (accessibility, placeholder content) — fix before shipping
  WARN   strong slop tells — change unless the brief explicitly asks for it
  INFO   defaults worth a second look — keep only if it is a deliberate choice
Exit code 1 if any ERROR (or any WARN with --strict).

This is a heuristic linter, not a judge of taste: a clean report is necessary, not sufficient.
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, asdict

EXTS = {".html", ".htm", ".css", ".scss", ".jsx", ".tsx", ".js", ".ts", ".vue", ".svelte", ".astro", ".md", ".mdx"}
SKIP_DIRS = {"node_modules", "dist", "build", ".next", ".git", ".vercel", ".svelte-kit", "coverage", "out"}


@dataclass
class Finding:
    severity: str
    rule: str
    file: str
    line: int
    snippet: str
    fix: str


def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def snippet_at(text: str, idx: int, width: int = 90) -> str:
    start = text.rfind("\n", 0, idx) + 1
    end = text.find("\n", idx)
    end = len(text) if end == -1 else end
    s = text[start:end].strip()
    return (s[: width - 1] + "…") if len(s) > width else s


# ---------------------------------------------------------------- pattern rules
# (severity, rule id, regex, flags, fix)
PATTERNS: list[tuple[str, str, str, int, str]] = [
    # --- colour defaults
    ("WARN", "claude-terracotta", r"#d9775[0-9a-f]\b|#da7756\b|#cc785c\b", re.I,
     "Terracotta/clay accent is the #1 generated-design tell. Derive the accent from the subject, or use light as the accent."),
    ("WARN", "cream-paper-bg", r"#f[45]f[01]e[89a-f]\b|#faf7f0\b|#f5efe6\b", re.I,
     "Warm cream page background is a default. Pure white, pure black, or a colour taken from the subject."),
    ("WARN", "tailwind-default-accent", r"\b(?:bg|text|from|to|via|border|ring)-(?:indigo|violet|purple)-(?:400|500|600)\b", 0,
     "Tailwind indigo/violet/purple is the default 'AI SaaS' accent. Pick a colour that belongs to this brand, or none."),
    ("WARN", "purple-blue-gradient", r"(?:#8b5cf6|#7c3aed|#6366f1|#a855f7|#4f46e5)[^;\n]{0,80}(?:#3b82f6|#06b6d4|#ec4899|#2563eb)|from-(?:purple|violet|indigo)-\d+\s+(?:via-\S+\s+)?to-(?:blue|cyan|pink|fuchsia)-\d+", re.I,
     "Purple→blue/pink gradients read as generated. Use luminance (white at varying alpha) or a subject-derived colour."),
    ("INFO", "tinted-near-black", r"(?:background(?:-color)?\s*:\s*|bg-\[)(?:#0b0b0b|#0a0a0a|#111111|#111\b|#121212|#0d0d0d)", re.I,
     "Tinted near-black standing in for black is a default. Use #000 (the Council style) or a deliberate brand dark with a reason."),
    ("INFO", "acid-accent", r"#(?:c6ff00|d4ff00|ccff00|b8ff00|a3e635|bef264|ff4d1a|ff5a1f|ff4f00)\b", re.I,
     "Acid-lime / vermilion single accent on dark is a default combination. Keep only if it is the brand's colour."),
    # --- typography / labels
    ("WARN", "tracked-uppercase-label", r"\buppercase\b[^\"'\n]{0,60}\btracking-(?:wide|wider|widest|\[0?\.[1-9])|\btracking-(?:wider|widest|\[0?\.[1-9]\d*em\])[^\"'\n]{0,60}\buppercase\b", 0,
     "Tracked-out ALL-CAPS eyebrow labels are template chrome. Sentence case, or remove the label if the heading says it."),
    ("WARN", "tracked-uppercase-css", r"text-transform\s*:\s*uppercase\s*;[^}]{0,120}letter-spacing\s*:\s*0?\.(?:0[6-9]|[1-9])\d*em|letter-spacing\s*:\s*0?\.(?:0[6-9]|[1-9])\d*em\s*;[^}]{0,120}text-transform\s*:\s*uppercase", re.I | re.S,
     "Tracked-out ALL-CAPS labels are template chrome. Sentence case, or remove the label."),
    ("WARN", "numbered-eyebrow", r">\s*0[1-9]\s*(?:—|–|-|/|\.)\s*[A-Za-z]|[\"'`]0[1-9]\s*(?:—|–)\s*[A-Za-z]", 0,
     "'01 — About' numbering is only honest for real sequences (steps, timelines). Remove for ordinary sections."),
    ("WARN", "word-dash-fragment", r">\s*[A-Z][A-Za-z0-9]{1,20}\s+—\s+[a-z]", 0,
     "'WORD — fragment' labels are a template pattern. Write a plain sentence or a real heading."),
    ("INFO", "mono-micro-labels", r"\bfont-mono\b[^\"'\n]{0,40}\btext-(?:xs|\[1[01]px\])|\btext-(?:xs|\[1[01]px\])[^\"'\n]{0,40}\bfont-mono\b", 0,
     "Small monospace data labels are a default. Use mono only for actual code/data."),
    ("INFO", "gradient-text", r"bg-clip-text\s+text-transparent|text-transparent\s+bg-clip-text|-webkit-background-clip\s*:\s*text", re.I,
     "Gradient text: allowed once (e.g. a single display line with a luminance fade). Check it isn't on several headings."),
    # --- copy
    ("WARN", "hype-copy", r"\b(?:unlock(?:s|ing)?|elevate[sd]?|seamless(?:ly)?|supercharge[sd]?|revolutioni[sz]e[sd]?|empower(?:s|ing)?|cutting[- ]edge|game[- ]chang\w*|next[- ]gen(?:eration)?|world[- ]class|unleash\w*|synerg\w*|state[- ]of[- ]the[- ]art|effortless(?:ly)?|harness(?:ing)?|streamline[sd]?|reimagin\w*|transform your|take (?:\w+ ){0,3}to the next level|in today's fast[- ]paced)\b", re.I,
     "Hype words make copy generic. Say concretely what it does and for whom."),
    ("WARN", "arrow-suffix", r"(?:→|&rarr;|-&gt;|\s->)\s*</(?:a|button|span|Link|Button)>|(?:→|&rarr;)\s*[\"'`]\s*[,}\)]", 0,
     "'→' appended to buttons/links is template chrome. The label should say what happens; add an icon only if it adds meaning."),
    ("INFO", "middle-dot-meta", r">[^<\n]{1,40}\s·\s[^<\n]{1,40}\s·\s", 0,
     "'A · B · C' meta strings are a default. Fine in <title>; elsewhere prefer structure (separate elements) or fewer items."),
    ("WARN", "generic-cta", r">\s*(?:Get Started Today|Learn More|Submit|Click Here|Sign Up Now|Book a Demo Today)\s*<", re.I,
     "Generic CTA. Name the action: 'Share your idea', 'Send application', 'Start a free trial'."),
    ("WARN", "welcome-hero", r">\s*Welcome to\b", re.I,
     "'Welcome to…' heroes waste the most valuable line on the page. Lead with what it is or what it does."),
    ("INFO", "single-word-accent", r"<h[1-3][^>]*>[^<]{0,80}<(?:em|i|span[^>]*(?:italic|gradient|text-accent|accent))[^>]*>[^<\s]{2,20}(?:\s[^<\s]{2,20})?</", re.I,
     "Accenting one word of a headline (italic/colour/gradient) is a common generated tell. Let the whole line carry the weight."),
    ("WARN", "blurred-blobs", r"blur-(?:2xl|3xl|\[\d{2,3}px\])[^\"'\n]{0,80}rounded-full|rounded-full[^\"'\n]{0,80}blur-(?:2xl|3xl|\[\d{2,3}px\])", 0,
     "Blurred colour blobs behind the hero are decoration without meaning. Use light that comes from a source (top glow, the product itself)."),
    ("INFO", "tinted-icon-chip", r"rounded-(?:full|lg|xl)\s+bg-[a-z]+-\d{3}/(?:5|10|15|20)\b|bg-[a-z]+-\d{3}/(?:5|10|15|20)\s+[^\"'\n]{0,40}rounded-(?:full|lg|xl)", 0,
     "Icons in tinted rounded chips are the default feature-card look. Show real product detail instead."),
    ("INFO", "sparkles-icon", r"\bSparkles\b|✨", 0,
     "Sparkles = the 'AI' cliché. Only if the product literally has a magic/AI action, and even then consider a specific icon."),
    ("INFO", "announcement-pill", r">\s*(?:Introducing|New:|Now in beta|Announcing)\b[^<]{0,50}<", re.I,
     "Announcement pill above the hero is template chrome unless there's real news."),
    # --- quality floor
    ("ERROR", "placeholder-content", r"\blorem ipsum\b|\bdolor sit amet\b|\bJohn Doe\b|\bJane Doe\b|\bAcme(?: Inc| Corp)?\b|\bYour Company\b|\bCompany Name\b", re.I,
     "Placeholder content. Use the real name and real copy (ask if unknown)."),
    ("ERROR", "img-no-alt", r"<img(?![^>]*\balt=)[^>]*>", re.I,
     "Image without alt. Describe it, or alt=\"\" if purely decorative."),
    ("WARN", "outline-none", r"outline\s*:\s*(?:none|0)\b|\boutline-none\b", re.I,
     "Focus outline removed. Keep a visible :focus-visible ring (2px, offset 2px)."),
    ("INFO", "100vh", r"\b100vh\b|\bh-screen\b|\bmin-h-screen\b", 0,
     "100vh jumps on mobile when the browser bar moves. Prefer svh/dvh (h-svh / min-h-svh)."),
    ("INFO", "emoji-ui", r"<(?:h[1-3]|button|a)\b[^>]*>[^<]*[\U0001F300-\U0001FAFF\u2600-\u27BF][^<]*<", 0,
     "Emoji in headings/buttons/links usually reads as generated filler. Use real icons or nothing."),
]


def scan_text(path: str, text: str) -> list[Finding]:
    out: list[Finding] = []
    seen: set[tuple[str, str, int]] = set()
    for base_sev, rule, rx, flags, fix in PATTERNS:
        for m in re.finditer(rx, text, flags):
            sev = base_sev
            # allow middle dots inside <title>
            if rule == "middle-dot-meta" and "<title" in text[max(0, m.start() - 60): m.start() + 5].lower():
                continue
            if rule == "outline-none" and "focus-visible" in snippet_at(text, m.start(), 10_000):
                continue
            if rule == "outline-none" and (":focus-within" in text or "focus-within:" in text):
                sev = "INFO"  # likely a field whose container shows the focus ring — verify by tabbing through
            key = (rule, path, line_of(text, m.start()))
            if key in seen:
                continue
            seen.add(key)
            out.append(Finding(sev, rule, path, line_of(text, m.start()), snippet_at(text, m.start()), fix))
    return out


def count(rx: str, text: str, flags: int = 0) -> int:
    return len(re.findall(rx, text, flags))


def scan_aggregate(paths_text: dict[str, str]) -> list[Finding]:
    """Rules that need counts across the whole project."""
    out: list[Finding] = []
    allt = "\n".join(paths_text.values())
    where = "(project)"

    # count usages in markup only (not the CSS/JS that implements them)
    reveals = count(r"whileInView\s*=|<[^>]+\sdata-(?:reveal|aos)\b|(?:class|className)\s*=\s*[\"'][^\"']*\b(?:reveal|fade-?up|animate-fade-up)\b", allt)
    sections = max(1, count(r"<section\b|<Section\b", allt))
    if reveals >= 4 and reveals >= sections:
        out.append(Finding("WARN", "reveal-everything", where, 0, f"{reveals} scroll reveals for ~{sections} sections",
                           "Fade-up on every section is the most common generated-motion tell. Keep one orchestrated moment (hero) plus 1–2 reveals that mean something."))

    gradient_text = count(r"bg-clip-text|-webkit-background-clip\s*:\s*text", allt, re.I)
    if gradient_text > 1:
        out.append(Finding("WARN", "gradient-text-repeat", where, 0, f"{gradient_text} gradient-text uses",
                           "Gradient text on multiple headings is decoration, not hierarchy. One at most."))

    blur = count(r"backdrop-blur|backdrop-filter\s*:\s*blur", allt, re.I)
    if blur > 3:
        out.append(Finding("INFO", "glass-everywhere", where, 0, f"{blur} backdrop blurs",
                           "Glassmorphism on everything flattens hierarchy and costs performance. Keep it for the nav/overlays."))

    radii = re.findall(r"\brounded-(?:xl|2xl|3xl)\b|border-radius\s*:\s*(1[6-9]|2[0-4])px", allt)
    shadows = count(r"\bshadow-(?:md|lg|xl)\b|box-shadow\s*:[^;]*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.1\s*\)", allt, re.I)
    if len(radii) >= 8 and shadows >= 4:
        out.append(Finding("WARN", "saas-card-kit", where, 0, f"{len(radii)} large radii + {shadows} soft grey shadows",
                           "Identical rounded cards with the same soft shadow = the SaaS card kit. Vary hierarchy: radius by level, depth by luminance/borders, not grey shadows."))

    grid3 = count(r"grid-cols-3|repeat\(\s*3\s*,", allt)
    icons = count(r"from ['\"]lucide-react['\"]|<(?:svg)\b[^>]*lucide", allt)
    if grid3 >= 2 and icons >= 1:
        out.append(Finding("INFO", "three-feature-grid", where, 0, f"{grid3} three-column grids + icon library",
                           "Icon + title + two lines ×3 is the default feature section. Show the product/subject itself instead."))

    animates = count(r"@keyframes|animate\(|motion\.|whileHover|transition\s*:|gsap\.", allt)
    reduced = count(r"prefers-reduced-motion|useReducedMotion|reducedMotion", allt)
    if animates > 3 and reduced == 0:
        out.append(Finding("ERROR", "no-reduced-motion", where, 0, f"{animates} animation sites, no reduced-motion handling",
                           "Respect prefers-reduced-motion (CSS media query, MotionConfig reducedMotion='user', skip Lenis)."))

    html_docs = {p: t for p, t in paths_text.items() if p.endswith((".html", ".htm")) and "<html" in t.lower()}
    for p, t in html_docs.items():
        missing = [name for name, rx in [("meta description", r"<meta[^>]+name=[\"']description"),
                                          ("og:image", r"property=[\"']og:image"),
                                          ("theme-color", r"name=[\"']theme-color"),
                                          ("viewport", r"name=[\"']viewport")] if not re.search(rx, t, re.I)]
        if missing:
            out.append(Finding("INFO", "meta-missing", p, 0, ", ".join(missing),
                               "Ship the basics: description, og:image, theme-color, viewport (with viewport-fit=cover)."))
        if not re.search(r"<html[^>]+lang=", t, re.I):
            out.append(Finding("ERROR", "html-lang", p, 0, "<html> without lang", "Add lang=\"en\" (or the page language)."))
    return out


def collect(paths: list[str]) -> dict[str, str]:
    files: dict[str, str] = {}
    for root in paths:
        if os.path.isfile(root):
            candidates = [root]
        else:
            candidates = []
            for d, dirs, fs in os.walk(root):
                dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
                candidates += [os.path.join(d, f) for f in fs]
        for f in candidates:
            if os.path.splitext(f)[1].lower() in EXTS:
                try:
                    with open(f, encoding="utf-8", errors="ignore") as fh:
                        files[f] = fh.read()
                except OSError:
                    pass
    return files


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    strict = "--strict" in argv
    as_json = "--json" in argv
    if not args:
        print(__doc__)
        return 2
    files = collect(args)
    findings: list[Finding] = []
    for p, t in files.items():
        findings += scan_text(p, t)
    findings += scan_aggregate(files)

    order = {"ERROR": 0, "WARN": 1, "INFO": 2}
    findings.sort(key=lambda f: (order[f.severity], f.rule, f.file, f.line))
    if as_json:
        print(json.dumps([asdict(f) for f in findings], indent=2))
    else:
        counts = {s: sum(1 for f in findings if f.severity == s) for s in order}
        print(f"slop_check: {len(files)} files · {counts['ERROR']} errors · {counts['WARN']} warnings · {counts['INFO']} info")
        last_rule = None
        for f in findings:
            if f.rule != last_rule:
                print(f"\n[{f.severity}] {f.rule} — {f.fix}")
                last_rule = f.rule
            loc = f"{f.file}:{f.line}" if f.line else f.file
            print(f"   {loc}  {f.snippet}")
        if not findings:
            print("No tells found. Now review it visually — a clean report is necessary, not sufficient.")
    errors = any(f.severity == "ERROR" for f in findings)
    warns = any(f.severity == "WARN" for f in findings)
    return 1 if errors or (strict and warns) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
