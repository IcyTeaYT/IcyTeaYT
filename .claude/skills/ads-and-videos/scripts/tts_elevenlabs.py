#!/usr/bin/env python3
"""
tts_elevenlabs.py — voiceover + word timings in one call (ElevenLabs "with-timestamps"). Stdlib only.

  export ELEVENLABS_API_KEY=...
  python3 tts_elevenlabs.py script.txt --voice VOICE_ID --out public/vo.mp3
  → public/vo.mp3 and public/vo.words.json  ([{text, startMs, endMs}] — feed to WordCaptions or to beat timing)

Voice IDs: elevenlabs.io → Voices (or GET /v1/voices). Default model eleven_multilingual_v2 (check docs for newer).
Write the script with punctuation where you want pauses; "..." gives a longer beat before a reveal.
No key? Record the VO yourself and get word timings with Whisper instead (official Remotion captions skill).
"""
import argparse, base64, json, os, sys, urllib.request, urllib.error


def load_env(path: str = ".env") -> None:
    """Read KEY=value lines from ./.env (keys the user pasted once) without overriding real env vars."""
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def words_from_alignment(al: dict) -> list:
    chars = al["characters"]
    starts = al["character_start_times_seconds"]
    ends = al["character_end_times_seconds"]
    words, cur, s, e = [], "", None, None
    for ch, st, en in zip(chars, starts, ends):
        if ch.isspace():
            if cur:
                words.append({"text": cur, "startMs": round(s * 1000), "endMs": round(e * 1000)})
            cur, s, e = "", None, None
            continue
        if not cur:
            s = st
        cur += ch
        e = en
    if cur:
        words.append({"text": cur, "startMs": round(s * 1000), "endMs": round(e * 1000)})
    return words


def main():
    load_env()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from stock import load_env
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--voice", required=True)
    ap.add_argument("--out", default="public/vo.mp3")
    ap.add_argument("--model", default="eleven_multilingual_v2")
    ap.add_argument("--stability", type=float, default=0.45)
    ap.add_argument("--style", type=float, default=0.2)
    a = ap.parse_args()
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set.")
    text = open(a.script).read().strip()
    body = {"text": text, "model_id": a.model, "voice_settings": {"stability": a.stability, "similarity_boost": 0.8, "style": a.style}}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs error {e.code}: {e.read().decode(errors='ignore')[:500]}")
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    open(a.out, "wb").write(base64.b64decode(res["audio_base64"]))
    al = res.get("alignment") or res.get("normalized_alignment")
    words = words_from_alignment(al) if al else []
    wpath = os.path.splitext(a.out)[0] + ".words.json"
    json.dump(words, open(wpath, "w"), indent=1)
    dur = words[-1]["endMs"] / 1000 if words else 0
    print(f"✓ {a.out}  ({dur:.1f}s, {len(words)} words) → {wpath}")


if __name__ == "__main__":
    main()
