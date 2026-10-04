#!/usr/bin/env bash
# Turn a clip into WebP frame sequences for a scroll-scrubbed canvas.
#   <outDir>/lg/001.webp...  native resolution (up to 3840 wide) and frame rate, quality 90 (desktop)
#   <outDir>/sm/001.webp...  portrait 9:16 crop at full source height (up to 2560), quality 90 (phones)
# Usage: frames.sh <video> <outDir> [--fps N] [--start S] [--end S] [--crop-x 0.5]
#   --fps     lower only if size is a problem (default: source fps; never below 18 or it steps)
#   --start/--end  trim seconds
#   --crop-x  horizontal centre of the phone crop, 0 (left) to 1 (right), default 0.5
set -euo pipefail
IN="$1"; OUT="$2"; shift 2
FPS=""; SS=""; TO=""; CX="0.5"
while [ $# -gt 0 ]; do case "$1" in
  --fps) FPS="$2"; shift 2;; --start) SS="-ss $2"; shift 2;; --end) TO="-to $2"; shift 2;; --crop-x) CX="$2"; shift 2;;
  *) echo "unknown option $1"; exit 1;; esac; done
command -v ffmpeg >/dev/null || { echo "ffmpeg not found. Install: apt-get install -y ffmpeg  (or brew install ffmpeg)"; exit 1; }
mkdir -p "$OUT/lg" "$OUT/sm"
RATE=""; [ -n "$FPS" ] && RATE="fps=$FPS,"
ffmpeg -v error -y $SS $TO -i "$IN" -vf "${RATE}scale='min(3840,iw)':-2:flags=lanczos" -c:v libwebp -quality 90 -compression_level 6 "$OUT/lg/%03d.webp"
ffmpeg -v error -y $SS $TO -i "$IN" -vf "${RATE}crop='min(iw,ih*9/16)':ih:(iw-min(iw\,ih*9/16))*$CX:0,scale=-2:'min(2560,ih)':flags=lanczos" -c:v libwebp -quality 90 -compression_level 6 "$OUT/sm/%03d.webp"
N=$(ls "$OUT/lg" | wc -l)
echo "Frames: $N  |  desktop $(du -sh "$OUT/lg" | cut -f1), phone $(du -sh "$OUT/sm" | cut -f1)"
echo "Set FRAMES = $N in the player."
