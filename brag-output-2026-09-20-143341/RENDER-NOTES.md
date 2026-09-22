# Re-rendering this video

FFmpeg is not installed on this machine, so the render used a project-local copy
that has since been removed (it was ~146 MB of binaries and did not belong in the
repo). To re-render or re-cut:

```bash
cd composition
npm install --no-save ffmpeg-static ffprobe-static
mkdir -p .hfbin
node -e "const fs=require('fs');fs.copyFileSync(require('ffmpeg-static'),'.hfbin/ffmpeg.exe');fs.copyFileSync(require('ffprobe-static').path,'.hfbin/ffprobe.exe')"
export PATH="$PWD/.hfbin:$PATH"

npx hyperframes check                                   # the gate: must be 0 errors
npx hyperframes render --quality looks --output ../brag.mp4
```

The permanent fix is `winget install --id Gyan.FFmpeg -e`, after which none of the
above staging is needed.

## Re-baking the poster after a re-render

`brag.jpg` is frame 0 of `brag.mp4` so that every platform's thumbnail grabber
picks it up. A fresh render overwrites that, so redo both steps:

```bash
ffmpeg -ss 19.8 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg -y
ffmpeg -y -i brag.mp4 -i brag.jpg \
  -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
  -c:a copy -movflags +faststart brag.poster.mp4 && mv brag.poster.mp4 brag.mp4
```

## Note on version control

`brag-output-*/` is not covered by `.gitignore`. Add it before any `git add -A`.
