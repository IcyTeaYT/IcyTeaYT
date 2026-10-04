#!/usr/bin/env bash
# Break a video example (screen recording, reel, .mov/.mp4) into things you can read:
#   info.txt      duration, fps, size
#   sheet.png     16 evenly spaced frames with timestamps (read this first)
#   keys/*.png    a full-size frame at each visual change (cuts, big moves)
#   motion.txt    how much the picture changes per 1/8 s, as a bar chart: shows when motion starts, peaks, settles
# Usage: video-ref.sh <video> <outDir>
set -euo pipefail
IN="$1"; OUT="${2:-ref-video}"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found. Install: apt-get install -y ffmpeg  (or brew install ffmpeg)"; exit 1; }
mkdir -p "$OUT/keys"
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,codec_type -of compact "$IN" | tee "$OUT/info.txt"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
FONT=$(fc-match -f '%{file}' sans 2>/dev/null || true)
STAMP=""
[ -n "$FONT" ] && [ -f "$FONT" ] && STAMP=",drawtext=fontfile=$FONT:text='%{pts\\:hms}':x=8:y=8:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6"
# 16 evenly spaced frames -> 4x4 sheet
FPS=$(python3 -c "print(16/max(float('$DUR'),0.1))")
ffmpeg -v error -y -i "$IN" -vf "fps=$FPS,scale=480:-2${STAMP},tile=4x4:padding=6:color=gray" -frames:v 1 "$OUT/sheet.png"
# key frames at visual changes (always include the first)
ffmpeg -v error -y -i "$IN" -vf "select='eq(n\,0)+gt(scene\,0.12)',scale=1280:-2${STAMP}" -vsync vfr -frames:v 24 "$OUT/keys/%02d.png"
# motion timeline
ffmpeg -v error -i "$IN" -vf "fps=8,scale=160:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$OUT/.yavg" -f null - 2>/dev/null || true
python3 - "$OUT" <<'PY'
import re,sys,os
out=sys.argv[1]; p=os.path.join(out,'.yavg')
if not os.path.exists(p): sys.exit(0)
t=None; rows=[]
for line in open(p):
    m=re.search(r'pts_time:([\d.]+)',line)
    if m: t=float(m.group(1))
    m=re.search(r'YAVG=([\d.]+)',line)
    if m and t is not None: rows.append((t,float(m.group(1))))
os.remove(p)
if not rows: sys.exit(0)
mx=max(v for _,v in rows) or 1
with open(os.path.join(out,'motion.txt'),'w') as f:
    f.write('time   change\n')
    for t,v in rows: f.write(f'{t:5.2f}s {"#"*int(40*v/mx)}\n')
print(f'motion.txt: {len(rows)} samples, peak change at {max(rows,key=lambda r:r[1])[0]:.2f}s')
PY
echo "Saved $OUT/sheet.png, $OUT/keys/ ($(ls "$OUT/keys" | wc -l) frames), $OUT/motion.txt, $OUT/info.txt"
