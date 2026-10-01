#!/usr/bin/env python3
"""
shot_cards.py — turn shots.json into a phone-friendly checklist for FREE AI video apps (Kling, Hailuo, Krea…).
Each card: what to upload as the first frame, the motion prompt with a Copy button, the exact filename to save as.
You generate on your phone/laptop, drop the files into public/clips/, and Claude Code continues the edit.

  python3 shot_cards.py shots.json --out shots.html      (open shots.html on your phone; ticks are remembered)
"""
import argparse, html, json

CSS = """:root{color-scheme:dark}*{box-sizing:border-box;margin:0}body{background:#000;color:#fff;font:16px/1.5 system-ui,-apple-system,sans-serif;padding:24px 16px 64px;max-width:640px;margin:auto}
h1{font-size:28px;letter-spacing:-.03em;font-weight:600}p.note{color:rgb(255 255 255/.6);margin:8px 0 24px}
.card{border:1px solid rgb(255 255 255/.12);border-radius:18px;padding:16px;margin:12px 0;background:rgb(255 255 255/.03)}
.card.done{opacity:.45}.row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.id{font-weight:600;font-size:18px}.file{font:13px ui-monospace,monospace;color:rgb(255 255 255/.7);word-break:break-all;margin-top:4px}
.lbl{font-size:13px;color:rgb(255 255 255/.55);margin-top:12px}.txt{background:rgb(255 255 255/.05);border-radius:12px;padding:10px 12px;margin-top:6px;white-space:pre-wrap}
button{font:inherit;font-size:14px;border:0;border-radius:999px;padding:0 16px;height:40px;background:#fff;color:#000;font-weight:500}
label{display:flex;align-items:center;gap:8px;font-size:14px;min-height:40px}input{width:24px;height:24px}"""

JS = """document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{
try{await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).innerText);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200)}catch(e){b.textContent='Select + copy'}}));
document.querySelectorAll('input[type=checkbox]').forEach(c=>{const k='shot:'+c.id;try{c.checked=localStorage.getItem(k)==='1'}catch(e){}
const card=c.closest('.card');card.classList.toggle('done',c.checked);c.addEventListener('change',()=>{card.classList.toggle('done',c.checked);try{localStorage.setItem(k,c.checked?'1':'0')}catch(e){}})});"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("shots"); ap.add_argument("--out", default="shots.html")
    ap.add_argument("--tool", default="Kling (66 free credits/day) or Hailuo")
    a = ap.parse_args()
    spec = json.load(open(a.shots))
    out_dir = spec.get("out_dir", "public/clips")
    cards = []
    for i, s in enumerate(spec["shots"]):
        e = html.escape
        first = s.get("start_image") or f"{out_dir}/{s['id']}_frame.png (make it first with the image prompt)"
        img = f'<p class="lbl">Image prompt (for the first frame)</p><div class="txt" id="i{i}">{e(s["image_prompt"])}</div><div class="row" style="margin-top:8px"><span></span><button data-copy="i{i}">Copy</button></div>' if s.get("image_prompt") and not s.get("start_image") else ""
        takes = int(s.get("takes", 1))
        names = ", ".join(f"{s['id']}_t{t}.mp4" for t in range(1, takes + 1))
        cards.append(f'''<section class="card"><div class="row"><span class="id">{e(s["id"])}</span><label><input type="checkbox" id="c{e(s["id"])}">Done</label></div>
<p class="lbl">First frame</p><div class="file">{e(first)}</div>{img}
<p class="lbl">Motion prompt</p><div class="txt" id="m{i}">{e(s["motion_prompt"])}</div>
<div class="row" style="margin-top:8px"><span class="file">Save as {e(out_dir)}/{e(names)}</span><button data-copy="m{i}">Copy</button></div></section>''')
    page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#000000"><title>Shot list</title><style>{CSS}</style></head><body>
<h1>Shot list</h1><p class="note">{len(spec["shots"])} shots · use {html.escape(a.tool)}. Image-to-video, 5 s, 9:16. Save each clip with the exact name, then tell Claude Code "clips are in".</p>
{"".join(cards)}<script>{JS}</script></body></html>'''
    open(a.out, "w").write(page)
    print(f"✓ {a.out} ({len(cards)} shots)")


if __name__ == "__main__":
    main()
