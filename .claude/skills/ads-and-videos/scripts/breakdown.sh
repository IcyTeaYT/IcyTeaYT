#!/usr/bin/env bash
# Break down a reference video: cut timestamps, shot lengths, pacing stats, contact sheet, audio loudness.
# Usage: bash breakdown.sh ref.mp4 [out_dir] [scene_threshold=0.1]
# Threshold: 0.1 default. Lower to 0.06 for dark edits or footage shown inside a small frame/laptop; raise to 0.3 if it over-detects.
set -euo pipefail
IN="$1"; OUT="${2:-./breakdown}"; TH="${3:-0.1}"
# Use system ffmpeg if present, otherwise the one bundled with Remotion.
FFMPEG="$(command -v ffmpeg || echo "npx --no-install remotion ffmpeg")"
FFPROBE="$(command -v ffprobe || echo "npx --no-install remotion ffprobe")"
mkdir -p "$OUT"
DUR=$($FFPROBE -v error -show_entries format=duration -of csv=p=0 "$IN")
read W H FPS < <($FFPROBE -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$IN" | tr ',' ' ')
echo "file: $IN"; echo "size: ${W}x${H}  fps: $FPS  duration: ${DUR}s"

# 1) Scene cuts
$FFMPEG -hide_banner -loglevel info -i "$IN" -vf "select='gt(scene,$TH)',showinfo" -an -f null - 2>&1 \
  | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 > "$OUT/cuts.txt" || true
python3 - "$OUT/cuts.txt" "$DUR" <<'PY'
import sys
cuts=[float(x) for x in open(sys.argv[1]).read().split()]
dur=float(sys.argv[2]); pts=[0.0]+cuts+[dur]
shots=[round(b-a,2) for a,b in zip(pts,pts[1:]) if b-a>0.05]
print(f"shots: {len(shots)}  avg: {sum(shots)/len(shots):.2f}s  shortest: {min(shots):.2f}s  longest: {max(shots):.2f}s")
print(f"cuts/sec: {len(shots)/dur:.2f}")
print("shot list (start → length):")
t=0
for i,s in enumerate(shots,1):
    print(f"  {i:>2}. {t:6.2f}s  {s:5.2f}s"); t+=s
PY

# 2) Contact sheet: one frame per shot midpoint is ideal; fall back to 1 fps grid
$FFMPEG -hide_banner -v error -y -i "$IN" -vf "fps=1,scale=240:-1,tile=6x$(( ( ${DUR%.*} + 6 ) / 6 ))" -frames:v 1 "$OUT/contact_sheet.png"
# 3) First 3 seconds at 4 fps (the hook is everything)
$FFMPEG -hide_banner -v error -y -t 3 -i "$IN" -vf "fps=4,scale=240:-1,tile=6x2" -frames:v 1 "$OUT/hook.png"
# 4) Audio: loudness + whether there is speech-level audio
if $FFPROBE -v error -select_streams a -show_entries stream=index -of csv=p=0 "$IN" | grep -q .; then
  $FFMPEG -hide_banner -i "$IN" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | sed 's/^/audio integrated loudness: /'
else echo "audio: none"; fi
echo "wrote: $OUT/cuts.txt $OUT/contact_sheet.png $OUT/hook.png"
