#!/usr/bin/env python3
"""
stock.py — free stock footage for montage beats, from several sources. Stdlib + ffmpeg only.

  python3 stock.py pixabay "rocket launch" --n 2 --out public/clips/rocket        # PIXABAY_API_KEY (free, instant)
  python3 stock.py pixabay "earth from space" --photos --n 2 --out public/stills/earth
  python3 stock.py nasa "rocket launch" --n 2 --cut 2.5 --out public/clips/nasa    # no key; NASA footage
  python3 stock.py archive "factory workers" --n 3 --cut 2 --out public/clips/arch # no key; public-domain archival film
  python3 stock.py pexels "human eye macro" --n 2                                  # only if you already have PEXELS_API_KEY

Sources:
  pixabay  free key at pixabay.com/api/docs (log in, the key is shown on that page). Free for commercial use, no attribution needed.
  nasa     images-api.nasa.gov, no key. NASA media is generally not copyrighted; don't use NASA logos or imply endorsement.
  archive  Internet Archive, Prelinger collection by default (--collection to change): vintage public-domain films —
           the black-and-white "archival" look of brand films. Films are long, so use --cut to extract short shots.
  pexels   only for keys issued before Pexels paused new API keys.

--cut S   download the film, find scene changes with ffmpeg, and save --n separate S-second shots from it
          (skips title/credit sections). Without --cut, whole clips are saved (fine for pixabay/pexels).
Writes <out>_1.mp4 … and appends source + licence notes to credits.json next to them.
"""
from __future__ import annotations

import argparse, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

UA = {"User-Agent": "ads-and-videos-skill/1.0"}


def get_json(url: str, headers: dict | None = None) -> dict | list:
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def download(url: str, path: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    return path


# ───────────── parsers (pure functions, unit-testable) ─────────────

def pixabay_pick(hit: dict, target: int = 1920) -> dict | None:
    vids = [v for v in (hit.get("videos") or {}).values() if v.get("url") and (v.get("width") or 0) >= 1280]
    return min(vids, key=lambda v: abs(v["width"] - target)) if vids else None


def nasa_pick(manifest: list, photos: bool = False) -> str | None:
    urls = [u.replace("http://", "https://") for u in manifest]
    if photos:
        for tag in ("~large.jpg", "~orig.jpg", "~medium.jpg"):
            for u in urls:
                if u.endswith(tag):
                    return u
        return None
    for tag in ("~large.mp4", "~orig.mp4", "~medium.mp4"):
        for u in urls:
            if u.endswith(tag):
                return u
    mp4 = [u for u in urls if u.endswith(".mp4") and "~mobile" not in u and "~preview" not in u]
    return mp4[0] if mp4 else None


ARCHIVE_FORMATS = ["h.264 HD", "h.264", "MPEG4", "512Kb MPEG4"]


def archive_pick(files: list, max_mb: int = 700) -> dict | None:
    ok = [f for f in files if f.get("format") in ARCHIVE_FORMATS and f.get("name", "").lower().endswith((".mp4", ".mpeg4", ".m4v"))
          and int(f.get("size") or 0) <= max_mb * 1024 * 1024]
    ok.sort(key=lambda f: ARCHIVE_FORMATS.index(f["format"]))
    return ok[0] if ok else None


# ───────────── cutting long films into shots ─────────────

def duration(path: str) -> float:
    out = subprocess.run(ff("ffprobe") + ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip()
    return float(out or 0)


def scene_starts(path: str, th: float = 0.3) -> list[float]:
    err = subprocess.run(ff("ffmpeg") + ["-hide_banner", "-loglevel", "info", "-i", path, "-vf", f"select='gt(scene,{th})',showinfo",
                          "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    return [float(t) for t in re.findall(r"pts_time:([0-9.]+)", err)]


def cut_shots(path: str, n: int, secs: float, prefix: str, start_index: int = 1) -> list[str]:
    dur = duration(path)
    lo, hi = dur * 0.08, dur * 0.92 - secs           # skip titles and end credits
    cands = [t for t in scene_starts(path) if lo < t < hi]
    picked: list[float] = []
    if cands:
        step = max(1, len(cands) // n)
        for t in cands[::step]:
            if all(abs(t - p) > secs * 3 for p in picked):
                picked.append(t)
            if len(picked) == n:
                break
    while len(picked) < n and hi > lo:               # fallback: evenly spaced
        picked.append(lo + (hi - lo) * (len(picked) + 0.5) / n)
    outs = []
    for i, t in enumerate(sorted(picked)[:n]):
        out = f"{prefix}_{start_index + i}.mp4"
        subprocess.run(ff("ffmpeg") + ["-y", "-v", "error", "-ss", f"{t + 0.15:.2f}", "-i", path, "-t", str(secs), "-an",
                        "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-vf", "scale='if(gte(iw,ih),min(1920,iw),-2)':'if(gte(iw,ih),-2,min(1920,ih))'", out], check=True)
        outs.append(out)
    return outs


# ───────────── providers ─────────────

def run_pixabay(a, out_prefix, credits):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        sys.exit("PIXABAY_API_KEY is not set. Free: log in at pixabay.com, open pixabay.com/api/docs, copy the key shown there.")
    q = urllib.parse.quote(a.query)
    per = max(3, min(50, a.n * 3))
    saved = []
    if a.photos:
        data = get_json(f"https://pixabay.com/api/?key={key}&q={q}&image_type=photo&orientation=horizontal&safesearch=true&per_page={per}")
        for h in data.get("hits", [])[: a.n]:
            p = download(h["largeImageURL"], f"{out_prefix}_{len(saved) + 1}.jpg")
            saved.append(p); credits.append({"file": p, "source": h.get("pageURL"), "by": h.get("user"), "license": "Pixabay Content License"})
    else:
        data = get_json(f"https://pixabay.com/api/videos/?key={key}&q={q}&safesearch=true&per_page={per}")
        for h in data.get("hits", []):
            if len(saved) >= a.n:
                break
            if h.get("duration", 0) > a.max_duration:
                continue
            v = pixabay_pick(h, a.target_width)
            if not v:
                continue
            p = download(v["url"], f"{out_prefix}_{len(saved) + 1}.mp4")
            saved.append(p); credits.append({"file": p, "source": h.get("pageURL"), "by": h.get("user"), "license": "Pixabay Content License", "width": v["width"]})
    return saved


def run_nasa(a, out_prefix, credits):
    q = urllib.parse.quote(a.query)
    kind = "image" if a.photos else "video"
    data = get_json(f"https://images-api.nasa.gov/search?q={q}&media_type={kind}")
    saved = []
    for item in data.get("collection", {}).get("items", []):
        if len(saved) >= a.n:
            break
        meta = (item.get("data") or [{}])[0]
        try:
            url = nasa_pick(get_json(item["href"]), a.photos)
        except Exception:
            continue
        if not url:
            continue
        if a.photos:
            p = download(url, f"{out_prefix}_{len(saved) + 1}.jpg"); saved.append(p)
        else:
            with tempfile.TemporaryDirectory() as d:
                src = download(url, os.path.join(d, "src.mp4"))
                if a.cut and duration(src) > a.cut * 2.5:
                    saved += cut_shots(src, 1, a.cut, out_prefix, len(saved) + 1)
                else:
                    p = f"{out_prefix}_{len(saved) + 1}.mp4"; os.replace(src, p); saved.append(p)
        credits.append({"file": saved[-1], "source": f"https://images.nasa.gov/details/{meta.get('nasa_id')}", "title": meta.get("title"),
                        "license": "NASA media (generally not copyrighted; no NASA logos/endorsement)"})
    return saved


def run_archive(a, out_prefix, credits):
    q = urllib.parse.quote(f'collection:({a.collection}) AND ({a.query}) AND mediatype:(movies)')
    data = get_json(f"https://archive.org/advancedsearch.php?q={q}&fl[]=identifier&fl[]=title&rows=20&output=json")
    docs = data.get("response", {}).get("docs", [])
    saved = []
    per_film = max(1, min(a.n, 3))                  # take up to 3 shots per film so the montage varies
    for doc in docs:
        if len(saved) >= a.n:
            break
        ident = doc["identifier"]
        meta = get_json(f"https://archive.org/metadata/{ident}")
        f = archive_pick(meta.get("files", []), a.max_mb)
        if not f:
            continue
        url = f"https://archive.org/download/{ident}/{urllib.parse.quote(f['name'])}"
        print(f"… downloading {ident} ({int(f.get('size') or 0) / 1e6:.0f} MB, {f['format']})")
        with tempfile.TemporaryDirectory() as d:
            src = download(url, os.path.join(d, "film.mp4"))
            got = cut_shots(src, min(per_film, a.n - len(saved)), a.cut or 2.0, out_prefix, len(saved) + 1)
        saved += got
        for p in got:
            credits.append({"file": p, "source": f"https://archive.org/details/{ident}", "title": doc.get("title"),
                            "license": "Internet Archive item — check its licence field (Prelinger films are public domain)"})
    return saved


def run_pexels(a, out_prefix, credits):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        sys.exit("PEXELS_API_KEY not set (Pexels paused new API keys — use pixabay, nasa or archive instead).")
    q = urllib.parse.quote(a.query)
    data = get_json(f"https://api.pexels.com/videos/search?query={q}&orientation=landscape&per_page={a.n * 3}", {"Authorization": key})
    saved = []
    for v in data.get("videos", []):
        if len(saved) >= a.n:
            break
        files = [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4" and (f.get("width") or 0) >= 1280]
        if not files or v.get("duration", 0) > a.max_duration:
            continue
        f = min(files, key=lambda f: abs(f["width"] - a.target_width))
        p = download(f["link"], f"{out_prefix}_{len(saved) + 1}.mp4")
        saved.append(p); credits.append({"file": p, "source": v.get("url"), "by": v.get("user", {}).get("name"), "license": "Pexels License"})
    return saved


def load_env(path: str = ".env") -> None:
    """Read KEY=value lines from ./.env (keys stay out of the code; .env is gitignored)."""
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if v and k.strip() not in os.environ:
                    os.environ[k.strip()] = v


def main():
    load_env()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", choices=["pixabay", "nasa", "archive", "pexels"])
    ap.add_argument("query")
    ap.add_argument("--n", type=int, default=2)
    ap.add_argument("--out", default=None)
    ap.add_argument("--photos", action="store_true")
    ap.add_argument("--cut", type=float, default=None, help="extract shots of this many seconds from long films")
    ap.add_argument("--target-width", type=int, default=1920)
    ap.add_argument("--max-duration", type=int, default=40)
    ap.add_argument("--max-mb", type=int, default=700)
    ap.add_argument("--collection", default="prelinger")
    a = ap.parse_args()
    slug = re.sub(r"\W+", "_", a.query).strip("_")
    out = a.out or os.path.join("public", "stills" if a.photos else "clips", f"{a.source}_{slug}")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    cpath = os.path.join(os.path.dirname(out) or ".", "credits.json")
    credits = json.load(open(cpath)) if os.path.exists(cpath) else []
    fn = {"pixabay": run_pixabay, "nasa": run_nasa, "archive": run_archive, "pexels": run_pexels}[a.source]
    saved = fn(a, out, credits)
    json.dump(credits, open(cpath, "w"), indent=2)
    for p in saved:
        print(f"✓ {p}")
    if not saved:
        print("Nothing suitable found. Try a broader query or another source.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
