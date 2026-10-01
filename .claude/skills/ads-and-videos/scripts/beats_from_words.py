#!/usr/bin/env python3
"""
beats_from_words.py — time the edit to the voiceover. Each line of the script = one beat; its duration runs
from its first word to the next line's first word (the last beat gets --tail extra frames for the outro hold).

  python3 beats_from_words.py script.txt public/vo.words.json [--fps 30] [--tail 30] > beats.json
  → [{"caption": "Only", "dur": 24, "startFrame": 0}, ...]   merge into ad.json beats (keep type/src per beat)

script.txt: one phrase per line, same words as the voiceover (punctuation is ignored when matching).
"""
import argparse, json, re, sys

norm = lambda s: re.sub(r"[^\w$%]", "", s.lower())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script"); ap.add_argument("words")
    ap.add_argument("--fps", type=int, default=30); ap.add_argument("--tail", type=int, default=30)
    a = ap.parse_args()
    lines = [l.strip() for l in open(a.script) if l.strip()]
    words = json.load(open(a.words))
    wi, starts = 0, []
    for line in lines:
        toks = [norm(t) for t in line.split() if norm(t)]
        if not toks:
            continue
        # find the first token of this line at or after the current word index
        while wi < len(words) and norm(words[wi]["text"]) != toks[0]:
            wi += 1
        if wi >= len(words):
            sys.exit(f"could not find '{line}' in the word timings — check the script matches the voiceover")
        starts.append((line, words[wi]["startMs"]))
        wi += len(toks)
    end_ms = words[-1]["endMs"]
    beats, f0 = [], 0
    for i, (line, ms) in enumerate(starts):
        nxt = starts[i + 1][1] if i + 1 < len(starts) else end_ms
        f_end = round(nxt / 1000 * a.fps) + (a.tail if i + 1 == len(starts) else 0)
        f_start = 0 if i == 0 else round(ms / 1000 * a.fps)
        beats.append({"caption": line, "dur": max(6, f_end - f_start), "startFrame": f_start})
    json.dump(beats, sys.stdout, indent=1)
    print(file=sys.stderr)
    print(f"{len(beats)} beats, {sum(b['dur'] for b in beats) / a.fps:.1f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
