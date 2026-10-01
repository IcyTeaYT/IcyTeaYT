#!/usr/bin/env python3
"""
fal_generate.py — OPTIONAL PAID route: generate AI images/videos on fal.ai and download them. Stdlib only.
Use only when the user explicitly opts in to paying; the free routes are hf_video.py and shot_cards.py.

Single job:
  python3 fal_generate.py MODEL_ID --input '{"prompt": "...", "image_url": "@start.png"}' --out public/clips/03.mp4
Batch (start frames → clips, several takes each):
  python3 fal_generate.py --batch shots.json [--concurrency 3]
Add --dry-run to print the exact requests and a cost-free plan without calling the API.

Auth: export FAL_KEY=...   (fal.ai dashboard → API keys)
Input values starting with "@" are local files, sent as data URIs (keep images < 8 MB).
Model input schemas differ: read https://fal.ai/models/<MODEL_ID>/llms.txt first and adapt the templates.

Batch file (shots.json):
{
  "image_model": "fal-ai/nano-banana/edit",                     // any image model; verify id + schema first
  "image_input": {"prompt": "{prompt}", "image_urls": "{refs}"},  // {prompt} {refs} {image} are filled per shot
  "video_model": "bytedance/seedance-2.0/image-to-video",
  "video_input": {"prompt": "{prompt}", "image_url": "{image}", "duration": "5", "aspect_ratio": "9:16"},
  "out_dir": "public/clips",
  "shots": [
    {"id": "03_stitch", "image_prompt": "Extreme macro ... {PRODUCT BIBLE}", "refs": ["refs/cap.jpg"],
     "motion_prompt": "Slow push-in. Needle moves in a steady rhythm...", "takes": 2},
    {"id": "07_hero", "start_image": "frames/hero.png", "motion_prompt": "Slow 45° orbit...", "takes": 3}
  ]
}
Outputs: <out_dir>/<id>_frame.png, <out_dir>/<id>_t1.mp4, _t2.mp4 ... and <out_dir>/manifest.json
"""
from __future__ import annotations

import argparse, base64, json, mimetypes, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor


def load_env(path: str = ".env") -> None:
    """Read KEY=value lines from ./.env (keys the user pasted once) without overriding real env vars."""
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

QUEUE = "https://queue.fal.run"
DRY = False


def data_uri(path: str) -> str:
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"


def resolve_files(v):
    if isinstance(v, str) and v.startswith("@"):
        return data_uri(v[1:]) if not DRY else f"<data-uri of {v[1:]}>"
    if isinstance(v, list):
        return [resolve_files(x) for x in v]
    if isinstance(v, dict):
        return {k: resolve_files(x) for k, x in v.items()}
    return v


def fill(template, **vals):
    """Replace exact "{prompt}" / "{image}" / "{refs}" string values; leave everything else."""
    if isinstance(template, str):
        key = template.strip()
        if key in ("{prompt}", "{image}", "{refs}"):
            return vals.get(key[1:-1])
        return template
    if isinstance(template, list):
        return [fill(x, **vals) for x in template]
    if isinstance(template, dict):
        return {k: fill(v, **vals) for k, v in template.items() if fill(v, **vals) is not None}
    return template


def http(method: str, url: str, body: dict | None = None) -> dict:
    key = os.environ.get("FAL_KEY")
    if not key:
        sys.exit("FAL_KEY is not set. Get one at fal.ai → Dashboard → Keys, then: export FAL_KEY=...")
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Key {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {url} → {e.code}: {e.read().decode(errors='ignore')[:600]}")


def first_url(result) -> str | None:
    if isinstance(result, dict):
        for k in ("video", "image"):
            if isinstance(result.get(k), dict) and result[k].get("url"):
                return result[k]["url"]
        for k in ("videos", "images"):
            if isinstance(result.get(k), list) and result[k] and isinstance(result[k][0], dict):
                return result[k][0].get("url")
        for v in result.values():
            u = first_url(v)
            if u:
                return u
    if isinstance(result, list):
        for v in result:
            u = first_url(v)
            if u:
                return u
    return None


def run(model: str, payload: dict, out: str, timeout: int = 1200) -> str:
    payload = resolve_files(payload)
    if DRY:
        short = json.dumps(payload)[:400]
        print(f"[dry-run] POST {QUEUE}/{model}\n          {short}\n          → {out}")
        return out
    sub = http("POST", f"{QUEUE}/{model}", payload)
    status_url, response_url = sub.get("status_url"), sub.get("response_url")
    if not status_url:
        raise RuntimeError(f"unexpected submit response: {sub}")
    t0 = time.time()
    while True:
        st = http("GET", status_url)
        s = st.get("status")
        if s == "COMPLETED":
            break
        if s not in ("IN_QUEUE", "IN_PROGRESS"):
            raise RuntimeError(f"{model} failed: {st}")
        if time.time() - t0 > timeout:
            raise TimeoutError(f"{model} timed out after {timeout}s (request still running on fal)")
        time.sleep(4)
    result = http("GET", response_url)
    url = first_url(result)
    if not url:
        raise RuntimeError(f"no file URL in result: {json.dumps(result)[:600]}")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    urllib.request.urlretrieve(url, out)
    print(f"✓ {out}  ({time.time() - t0:.0f}s)")
    return out


def batch(spec_path: str, concurrency: int) -> None:
    spec = json.load(open(spec_path))
    out_dir = spec.get("out_dir", "public/clips")
    manifest = []

    def do_shot(shot: dict) -> dict:
        sid = shot["id"]
        rec = {"id": sid, "takes": []}
        try:
            if shot.get("start_image"):
                frame = shot["start_image"]
            else:
                frame = f"{out_dir}/{sid}_frame.png"
                refs = [f"@{r}" if not r.startswith("http") else r for r in shot.get("refs", [])]
                run(spec["image_model"], fill(spec["image_input"], prompt=shot["image_prompt"], refs=refs), frame)
            rec["frame"] = frame
            image = f"@{frame}" if not frame.startswith("http") else frame
            for t in range(1, int(shot.get("takes", 2)) + 1):
                out = f"{out_dir}/{sid}_t{t}.mp4"
                inp = fill(shot.get("video_input", spec["video_input"]), prompt=shot["motion_prompt"], image=image)
                run(shot.get("video_model", spec["video_model"]), inp, out)
                rec["takes"].append(out)
        except Exception as e:  # keep going; report at the end
            rec["error"] = str(e)
            print(f"✗ {sid}: {e}", file=sys.stderr)
        return rec

    shots = spec["shots"]
    n_img = sum(1 for s in shots if not s.get("start_image"))
    n_vid = sum(int(s.get("takes", 2)) for s in shots)
    print(f"plan: {len(shots)} shots → {n_img} start frames + {n_vid} video generations ({spec['video_model']})")
    with ThreadPoolExecutor(max_workers=max(1, concurrency)) as ex:
        manifest = list(ex.map(do_shot, shots))
    if not DRY:
        os.makedirs(out_dir, exist_ok=True)
        json.dump(manifest, open(f"{out_dir}/manifest.json", "w"), indent=2)
        print(f"manifest: {out_dir}/manifest.json")
    failed = [m["id"] for m in manifest if m.get("error")]
    if failed:
        print(f"failed shots: {', '.join(failed)}", file=sys.stderr)


def main():
    load_env()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from stock import load_env
    load_env()
    global DRY
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("model", nargs="?")
    ap.add_argument("--input", help="JSON payload for a single job")
    ap.add_argument("--out", help="output file for a single job")
    ap.add_argument("--batch", help="shots.json for a batch")
    ap.add_argument("--concurrency", type=int, default=3)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    DRY = a.dry_run
    if a.batch:
        batch(a.batch, a.concurrency)
    elif a.model and a.input and a.out:
        run(a.model, json.loads(a.input), a.out)
    else:
        ap.print_help()
        sys.exit(2)


if __name__ == "__main__":
    main()
