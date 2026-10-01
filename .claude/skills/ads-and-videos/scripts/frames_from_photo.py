#!/usr/bin/env python3
"""
frames_from_photo.py — turn 1–2 product photos into every start frame an ad needs. Free, local, exact product.

  pip install pillow "rembg[cpu]"                 (rembg removes the background; first run downloads a ~170 MB model)
  python3 frames_from_photo.py photo.jpg --auto                    # a default set, good for a first look
  python3 frames_from_photo.py photo.jpg [photo2.jpg] --plan frames.json

Why: real-photo frames keep the logo, colour and stitching exactly right — better than any generated frame — so the
user only ever needs to send 1–2 photos (a clear front shot; optionally a close-up of the logo/detail).
Look at the photo first, then write the plan with crop boxes where the interesting details are.

frames.json:
{
  "out_dir": "public/frames", "size": [1080, 1920],
  "frames": [
    {"id": "02_macro_logo", "type": "crop", "photo": 0, "box": [0.30, 0.25, 0.40, 0.30]},  // x, y, w, h as 0–1 of the photo
    {"id": "05_hero", "type": "studio", "style": "pedestal"},                               // pedestal | spotlight | seamless
    {"id": "06_colour", "type": "studio", "style": "seamless", "color": "#c8102e"},
    {"id": "08_full", "type": "cover"}                                                      // whole photo, cropped to fill
  ]
}
Every frame is 9:16 1080×1920 PNG. Use them (a) as start_image for image-to-video (hf_video.py / shot_cards.py), or
(b) directly as `footage` beats with "kind": "image" — a slow push-in on a sharp real crop already looks like a macro shot.
Environment/lifestyle frames (factory, person wearing it) need an image-edit model: see references/ai-video.md › free image edits.
"""
from __future__ import annotations

import argparse, json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageOps

W, H = 1080, 1920


def cover(img: Image.Image, size=(W, H), focus=(0.5, 0.5)) -> Image.Image:
    w, h = img.size
    s = max(size[0] / w, size[1] / h)
    r = img.resize((max(size[0], round(w * s)), max(size[1], round(h * s))), Image.LANCZOS)
    x = min(max(0, round(r.width * focus[0] - size[0] / 2)), r.width - size[0])
    y = min(max(0, round(r.height * focus[1] - size[1] / 2)), r.height - size[1])
    return r.crop((x, y, x + size[0], y + size[1]))


def crop_frame(img: Image.Image, box, size=(W, H)) -> Image.Image:
    """Expand the requested box to the target aspect (never distort), keep it inside the photo, upscale cleanly."""
    iw, ih = img.size
    bx, by, bw, bh = box[0] * iw, box[1] * ih, box[2] * iw, box[3] * ih
    cx, cy = bx + bw / 2, by + bh / 2
    target = size[0] / size[1]
    if bw / bh > target:
        bh = bw / target
    else:
        bw = bh * target
    if bw > iw:
        bw, bh = iw, iw / target
    if bh > ih:
        bh, bw = ih, ih * target
    x0 = min(max(0, cx - bw / 2), iw - bw)
    y0 = min(max(0, cy - bh / 2), ih - bh)
    c = img.crop((round(x0), round(y0), round(x0 + bw), round(y0 + bh))).resize(size, Image.LANCZOS)
    scale_up = size[0] / max(1, bw)
    if scale_up > 1.2:  # sharpen only when we enlarged
        c = c.filter(ImageFilter.UnsharpMask(radius=2, percent=min(90, int(40 * scale_up)), threshold=3))
    if scale_up > 2.5:
        print(f"  ! {scale_up:.1f}× enlargement — fine for a moving macro, but a closer photo would be sharper")
    return c


BG_MODEL = "isnet-general-use"  # ~170 MB, runs on any laptop. Sharper edges with more RAM: --bg-model birefnet-general


def cutout(img: Image.Image) -> Image.Image:
    try:
        from rembg import new_session, remove
    except ImportError:
        sys.exit('studio frames need rembg: pip install "rembg[cpu]"')
    rgba = remove(img.convert("RGB"), session=new_session(BG_MODEL), post_process_mask=True)
    alpha = keep_main_shape(rgba.getchannel("A"))
    rgba.putalpha(alpha)
    check_cutout(alpha)
    bbox = alpha.point(lambda a: 255 if a > 16 else 0).getbbox()
    return rgba.crop(bbox) if bbox else rgba


def keep_main_shape(alpha: Image.Image, min_share: float = 0.02) -> Image.Image:
    """Drop stray specks: keep connected regions at least 2 % the size of the biggest (handles, straps, multi-part products survive)."""
    small_w = 256
    sm = alpha.resize((small_w, max(1, round(alpha.height * small_w / alpha.width))), Image.BILINEAR).point(lambda a: 1 if a > 64 else 0)
    w, h = sm.size
    px = sm.load()
    label = [[0] * w for _ in range(h)]
    sizes = {}
    cur = 0
    for y in range(h):
        for x in range(w):
            if px[x, y] and not label[y][x]:
                cur += 1
                stack, n = [(x, y)], 0
                label[y][x] = cur
                while stack:
                    cx, cy = stack.pop(); n += 1
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not label[ny][nx]:
                            label[ny][nx] = cur; stack.append((nx, ny))
                sizes[cur] = n
    if not sizes:
        return alpha
    biggest = max(sizes.values())
    keep = {k for k, v in sizes.items() if v >= biggest * min_share}
    dropped = len(sizes) - len(keep)
    m = Image.new("L", (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            if label[y][x] in keep:
                mp[x, y] = 255
    m = m.resize(alpha.size, Image.BILINEAR).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
    if dropped > 6:
        print(f"  ! background removal found {dropped} stray fragments — the photo background is busy")
    return Image.composite(alpha, Image.new("L", alpha.size, 0), m)


def check_cutout(alpha: Image.Image) -> None:
    """Warn when the photo can't make a clean studio shot (product touching the frame edge = cut off)."""
    a = alpha.point(lambda v: 255 if v > 128 else 0)
    w, h = a.size
    edges = {"bottom": a.crop((0, h - 2, w, h)), "left": a.crop((0, 0, 2, h)), "right": a.crop((w - 2, 0, w, h)), "top": a.crop((0, 0, w, 2))}
    cut = [k for k, e in edges.items() if (e.histogram()[255] / max(1, e.width * e.height)) > 0.06]
    if cut:
        print(f"  ! product touches the {', '.join(cut)} edge of the photo — studio shots will look cut off. "
              "Ask for one photo with the whole product visible and some space around it.")


def hex_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def vertical_gradient(top, bottom, size=(W, H)) -> Image.Image:
    g = Image.new("RGB", (1, size[1]))
    for y in range(size[1]):
        t = y / (size[1] - 1)
        g.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize(size)


def radial_light(size=(W, H), center=(0.5, 0.18), radius=0.75, strength=110) -> Image.Image:
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    r = int(size[0] * radius)
    cx, cy = int(size[0] * center[0]), int(size[1] * center[1])
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=strength)
    return m.filter(ImageFilter.GaussianBlur(size[0] * 0.18))


def grain(img: Image.Image, amount=10) -> Image.Image:
    noise = Image.effect_noise(img.size, amount).convert("RGB")
    return Image.blend(img, ImageOps.autocontrast(noise), 0.035)


def studio(prod: Image.Image, style: str, color: str | None = None) -> Image.Image:
    if style == "seamless":
        base = hex_rgb(color or "#d9d6d0")
        top = tuple(min(255, int(c * 1.08) + 8) for c in base)
        bottom = tuple(int(c * 0.72) for c in base)
        bg = vertical_gradient(top, bottom)
        floor_y = int(H * 0.66)
    else:
        bg = vertical_gradient((14, 14, 16), (2, 2, 3))
        bg = Image.composite(Image.new("RGB", (W, H), (70, 70, 76)), bg, radial_light(strength=120 if style == "spotlight" else 90))
        floor_y = int(H * (0.60 if style == "pedestal" else 0.66))
    canvas = bg.copy()
    d = ImageDraw.Draw(canvas)
    if style == "pedestal":
        pw, ph = int(W * 0.62), int(H * 0.30)
        px, top = (W - pw) // 2, floor_y
        body = Image.new("RGB", (pw, ph))
        for x in range(pw):  # cylinder shading: dark edges, lit centre-left
            t = x / (pw - 1)
            v = int(18 + 40 * max(0, 1 - abs(t - 0.42) * 2.2))
            for y in range(ph):
                body.putpixel((x, y), (v, v, v + 2))
        canvas.paste(body, (px, top))
        d.ellipse((px, top - int(pw * 0.09), px + pw, top + int(pw * 0.09)), fill=(58, 58, 62))
        d.ellipse((px + 6, top - int(pw * 0.09) + 4, px + pw - 6, top + int(pw * 0.09) - 4), fill=(34, 34, 38))
    # product size + placement
    scale = min(W * 0.72 / prod.width, H * 0.40 / prod.height)
    p = prod.resize((max(1, round(prod.width * scale)), max(1, round(prod.height * scale))), Image.LANCZOS)
    x = (W - p.width) // 2
    y = floor_y - p.height + int(p.height * 0.04)
    # soft contact shadow
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).ellipse((x + p.width * 0.08, floor_y - 18, x + p.width * 0.92, floor_y + 22), fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), canvas, sh)
    if style == "spotlight":  # faint reflection on the dark floor
        refl = ImageOps.flip(p).copy()
        a = refl.getchannel("A").point(lambda v: int(v * 0.12))
        fade = Image.linear_gradient("L").resize(refl.size).point(lambda v: 255 - v)
        refl.putalpha(Image.composite(a, Image.new("L", refl.size, 0), fade))
        canvas.paste(refl, (x, floor_y), refl)
    canvas.paste(p, (x, y), p)
    return grain(canvas)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("photos", nargs="+")
    ap.add_argument("--plan")
    ap.add_argument("--auto", action="store_true")
    ap.add_argument("--out", default="public/frames")
    ap.add_argument("--bg-model", default=None, help="rembg model (default isnet-general-use)")
    a = ap.parse_args()
    global BG_MODEL
    if a.bg_model:
        BG_MODEL = a.bg_model
    if len(a.photos) > 2:
        print("note: 1–2 photos is enough; using the first two.")
    imgs = [ImageOps.exif_transpose(Image.open(p)).convert("RGB") for p in a.photos[:2]]
    for p, im in zip(a.photos, imgs):
        if min(im.size) < 900:
            print(f"! {p} is small ({im.size[0]}×{im.size[1]}). Fine for studio shots; macro crops will be soft.")
    if a.plan:
        plan = json.load(open(a.plan))
    elif a.auto:
        plan = {"frames": [
            {"id": "full", "type": "cover"},
            {"id": "detail_wide", "type": "crop", "box": [0.2, 0.2, 0.6, 0.6]},
            {"id": "detail_close", "type": "crop", "box": [0.32, 0.32, 0.36, 0.36]},
            {"id": "hero_pedestal", "type": "studio", "style": "pedestal"},
            {"id": "hero_spotlight", "type": "studio", "style": "spotlight"},
            {"id": "hero_seamless", "type": "studio", "style": "seamless"},
        ]}
    else:
        ap.error("use --plan frames.json or --auto")
    out_dir = plan.get("out_dir", a.out)
    size = tuple(plan.get("size", [W, H]))
    os.makedirs(out_dir, exist_ok=True)
    cut_cache: dict[int, Image.Image] = {}
    for f in plan["frames"]:
        src = imgs[min(f.get("photo", 0), len(imgs) - 1)]
        t = f["type"]
        if t == "cover":
            im = cover(src, size, tuple(f.get("focus", (0.5, 0.5))))
        elif t == "crop":
            im = crop_frame(src, f["box"], size)
        elif t == "studio":
            k = f.get("photo", 0)
            if k not in cut_cache:
                print("  removing background…")
                cut_cache[k] = cutout(src)
            im = studio(cut_cache[k], f.get("style", "pedestal"), f.get("color"))
        else:
            print(f"  ? unknown type {t}"); continue
        path = os.path.join(out_dir, f"{f['id']}.png")
        im.save(path)
        print(f"✓ {path}")


if __name__ == "__main__":
    main()
