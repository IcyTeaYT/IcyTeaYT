#!/usr/bin/env python3
"""
tts_free.py — FREE voiceover + word timings (Microsoft Edge neural voices via the edge-tts package).

  pip install edge-tts
  python3 tts_free.py script.txt --voice en-US-AndrewNeural --out public/vo.mp3 [--rate=-5%]
  → public/vo.mp3 + public/vo.words.json  ([{text, startMs, endMs}] for WordCaptions / beats_from_words.py)

Voices: `edge-tts --list-voices`. Good picks: en-US-AndrewNeural (calm, launch-film), en-US-AvaNeural, en-GB-RyanNeural,
ru-RU-DmitryNeural / ru-RU-SvetlanaNeural, uz-UZ-SardorNeural / uz-UZ-MadinaNeural.
Slightly slower (--rate=-5%) sounds more cinematic. It uses an unofficial free endpoint: fine for personal/school
projects; for paid client work use your own recorded voice or a licensed TTS.
"""
import argparse, os, asyncio, json, os


def load_env(path: str = ".env") -> None:
    """Read KEY=value lines from ./.env (keys the user pasted once) without overriding real env vars."""
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def words_from_chunks(chunks) -> list:
    """edge-tts WordBoundary offsets/durations are in 100-ns ticks."""
    out = []
    for ch in chunks:
        if ch.get("type") == "WordBoundary":
            s = ch["offset"] / 10_000
            out.append({"text": ch["text"], "startMs": round(s), "endMs": round(s + ch["duration"] / 10_000)})
    return out


async def run(text: str, voice: str, rate: str, out: str) -> list:
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    meta = []
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            else:
                meta.append(ch)
    return words_from_chunks(meta)


def polish(path: str) -> None:
    """Broadcast-style chain: rumble cut, warmth, presence, gentle de-ess, compression, -16 LUFS. Timing is unchanged."""
    import shutil, subprocess
    ff = [shutil.which("ffmpeg")] if shutil.which("ffmpeg") else [shutil.which("npx") or "npx", "--no-install", "remotion", "ffmpeg"]
    chain = ("highpass=f=80,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.2:g=2.5,"
             "equalizer=f=7500:t=q:w=2:g=-3,acompressor=threshold=-20dB:ratio=3:attack=5:release=60:makeup=3,"
             "loudnorm=I=-16:TP=-1.5:LRA=7")
    tmp = path + ".tmp.mp3"
    r = subprocess.run(ff + ["-y", "-v", "error", "-i", path, "-af", chain, "-ar", "48000", "-b:a", "256k", tmp])
    if r.returncode == 0:
        os.replace(tmp, path)
        print("✓ voice polished (EQ, de-ess, compression, -16 LUFS)")


def main():
    load_env()
    ap = argparse.ArgumentParser()
    ap.add_argument("script"); ap.add_argument("--voice", default="en-US-AndrewNeural")
    ap.add_argument("--rate", default="-5%"); ap.add_argument("--out", default="public/vo.mp3")
    ap.add_argument("--raw", action="store_true", help="skip the broadcast polish")
    a = ap.parse_args()
    text = " ".join(l.strip() for l in open(a.script) if l.strip())  # one phrase per line → one paragraph
    words = asyncio.run(run(text, a.voice, a.rate, a.out))
    if not a.raw:
        polish(a.out)
    wpath = os.path.splitext(a.out)[0] + ".words.json"
    json.dump(words, open(wpath, "w"), indent=1)
    print(f"✓ {a.out} ({words[-1]['endMs'] / 1000:.1f}s, {len(words)} words) → {wpath}" if words else f"✓ {a.out} (no word timings returned)")


if __name__ == "__main__":
    main()
