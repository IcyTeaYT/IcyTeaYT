#!/usr/bin/env python3
"""
hf_video.py — FREE, fully automatic AI video via Hugging Face Spaces (ZeroGPU). Claude Code runs it itself.

  pip install gradio_client
  export HF_TOKEN=hf_...     # free account → huggingface.co/settings/tokens (gives you the daily free GPU quota)

  python3 hf_video.py --list zerogpu-aoti/wan2-2-fp8da-aoti-faster          # print the Space's endpoints + inputs
  python3 hf_video.py --space zerogpu-aoti/wan2-2-fp8da-aoti-faster --api /generate_video \
      --args '{"input_image": "@frames/hero.png", "prompt": "Slow 45 degree orbit"}' --out public/clips/07_hero_t1.mp4
  python3 hf_video.py --batch shots_free.json [--dry-run]

Batch file = the shots.json format from fal_generate.py, plus:
  "space": "zerogpu-aoti/wan2-2-fp8da-aoti-faster", "api": "/generate_video",
  "video_args": {"input_image": "{image}", "prompt": "{prompt}"}      // names from --list; {image}/{prompt} filled per shot
Every shot needs a "start_image" (your real product photo, or a still from a free image tool).
Existing outputs are skipped, so when the free quota runs out you just run the same command tomorrow.

Spaces come and go: if this one is down or its API changed, search huggingface.co/spaces for
"wan 2.2 image to video" (look for "Running on Zero"), run --list, and update "space"/"api"/"video_args".
Quality: good for B-roll, abstract and atmospheric shots; weaker than Kling/Seedance for close-ups of logos and text.

Also works for FREE image edits (single-call mode, --out ending in .png): e.g. a FLUX Kontext or Qwen-Image-Edit Space
turns the product photo into an environment/lifestyle start frame ("the same cap on a workbench in a sunlit factory").
Find one on huggingface.co/spaces (search "kontext" or "qwen image edit", Running on Zero), then --list it.
"""
from __future__ import annotations

import argparse, json, os, shutil, sys, time


def load_env(path: str = ".env") -> None:
    """Read KEY=value lines from ./.env (keys the user pasted once) without overriding real env vars."""
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

VIDEO_EXT = (".mp4", ".webm", ".mov", ".mkv")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
DRY = False


def client(space: str):
    from gradio_client import Client  # imported lazily so --dry-run works without the package
    return Client(space, token=os.environ.get("HF_TOKEN"), verbose=False)


def to_inputs(v):
    """'@path' → handle_file(path); recurse into lists/dicts."""
    if isinstance(v, str) and v.startswith("@"):
        if DRY:
            return f"<file {v[1:]}>"
        from gradio_client import handle_file
        return handle_file(v[1:])
    if isinstance(v, list):
        return [to_inputs(x) for x in v]
    if isinstance(v, dict):
        return {k: to_inputs(x) for k, x in v.items()}
    return v


def find_file(result, exts=VIDEO_EXT + IMAGE_EXT) -> str | None:
    """Gradio results can be a path, a {'video': path} dict, a {'path': ...} file dict, or tuples of those."""
    if isinstance(result, str):
        return result if result.lower().endswith(exts) and os.path.exists(result) else None
    if isinstance(result, dict):
        for k in ("video", "path", "name", "value", "image"):
            if k in result:
                f = find_file(result[k], exts)
                if f:
                    return f
        for v in result.values():
            f = find_file(v, exts)
            if f:
                return f
    if isinstance(result, (list, tuple)):
        for v in result:
            f = find_file(v, exts)
            if f:
                return f
    return None


def fill(t, **vals):
    if isinstance(t, str) and t.strip() in ("{prompt}", "{image}"):
        return vals[t.strip()[1:-1]]
    if isinstance(t, dict):
        return {k: fill(v, **vals) for k, v in t.items()}
    if isinstance(t, list):
        return [fill(v, **vals) for v in t]
    return t


def generate(space: str, api: str, args: dict, out: str, retries: int = 2) -> str:
    if os.path.exists(out):
        print(f"• skip {out} (exists)")
        return out
    if DRY:
        print(f"[dry-run] {space} {api} {json.dumps(to_inputs(args))[:300]} → {out}")
        return out
    c = client(space)
    for attempt in range(retries + 1):
        try:
            t0 = time.time()
            res = c.predict(api_name=api, **to_inputs(args))
            f = find_file(res)
            if not f:
                raise RuntimeError(f"no file in result: {str(res)[:300]}")
            os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
            shutil.copy(f, out)
            print(f"✓ {out} ({time.time() - t0:.0f}s)")
            return out
        except Exception as e:  # quota, queue, cold start
            msg = str(e)
            if "quota" in msg.lower() or "exceeded" in msg.lower():
                sys.exit(f"Free GPU quota used up for today ({msg[:160]}). Re-run the same command later; finished clips are kept.")
            if attempt == retries:
                raise
            print(f"retrying after error: {msg[:160]}", file=sys.stderr)
            time.sleep(20)
    return out


DEFAULT_SPACE = "zerogpu-aoti/wan2-2-fp8da-aoti-faster"


def auto_endpoint(space: str) -> tuple[str, str | None, str]:
    """Find (api_name, image_param, prompt_param) by inspecting the Space's API, so callers needn't know its schema."""
    info = client(space).view_api(print_info=False, return_format="dict") or {}
    best = None
    for api, spec in (info.get("named_endpoints") or {}).items():
        img = prm = None
        for prm_spec in spec.get("parameters", []):
            name = (prm_spec.get("parameter_name") or prm_spec.get("label") or "").lower()
            comp = (prm_spec.get("component") or "").lower()
            if img is None and (comp == "image" or "image" in name):
                img = prm_spec.get("parameter_name")
            if prm is None and comp in ("textbox", "") and "prompt" in name and "neg" not in name:
                prm = prm_spec.get("parameter_name")
        if prm and (best is None or (img and not best[1])):
            best = (api, img, prm)
    if not best:
        raise RuntimeError(f"no prompt endpoint found on {space}; run --list and pass --api/--args yourself")
    return best


def generate_auto(space: str, image: str | None, prompt: str, out: str) -> str:
    """Image(+prompt) → video on any Wan-style Space, schema detected automatically."""
    api, img_param, prompt_param = auto_endpoint(space)
    args = {prompt_param: prompt}
    if img_param and image:
        args[img_param] = f"@{image}"
    return generate(space, api, args, out)


def main():
    load_env()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from stock import load_env
    load_env()
    global DRY
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", metavar="SPACE")
    ap.add_argument("--space"); ap.add_argument("--api"); ap.add_argument("--args"); ap.add_argument("--out")
    ap.add_argument("--batch"); ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    DRY = a.dry_run
    if a.list:
        client(a.list).view_api(print_info=True)
    elif a.batch:
        spec = json.load(open(a.batch))
        out_dir = spec.get("out_dir", "public/clips")
        jobs = []
        for s in spec["shots"]:
            if not s.get("start_image"):
                sys.exit(f"shot {s['id']}: add a start_image (product photo or a still from a free image tool)")
            for t in range(1, int(s.get("takes", 1)) + 1):
                jobs.append((s, f"{out_dir}/{s['id']}_t{t}.mp4"))
        todo = [j for j in jobs if not os.path.exists(j[1])]
        print(f"plan: {len(jobs)} clips on {spec['space']} ({len(todo)} still to make) — free, uses your daily GPU quota")
        for s, out in jobs:
            args = fill(spec["video_args"], prompt=s["motion_prompt"], image=f"@{s['start_image']}")
            generate(spec["space"], spec["api"], args, out)
    elif a.space and a.api and a.args and a.out:
        generate(a.space, a.api, json.loads(a.args), a.out)
    else:
        ap.print_help(); sys.exit(2)


if __name__ == "__main__":
    main()
