# UP user-flow video: 16:9 cut

The landscape (1920×1080) version of the vertical walkthrough in `../brag-output-2026-09-29-105244/`. The story, copy, timing, music, sound effects and outro are identical; only the layout changes. The storyboard, brand rules and honesty notes are in `../brag-output-2026-09-29-105244/brag-plan.md` and `RENDER-NOTES.md` and still apply.

- Render: `brag.mp4` (41.6s, 1920×1080, 30fps); poster: `brag.jpg` (baked in as frame 0)
- Composition: `composition/index.html`
- Caption: `share-copy.txt` (same as the vertical cut)

## What changed for landscape

| | Vertical | Landscape |
|---|---|---|
| Phone | centred, under a caption band, bleeds toward the bottom | right of centre (x 1055–1545), full height |
| App scale | `zoom: 1.78` | `zoom: 1.2` |
| Captions | top band, 52px | left column (x 150–890), 64px, progress bar and eyebrow above |
| Fade where the phone slides under the captions | top edge (y 372–436) | left edge (x 900–990); slides off left at 35.45s once the captions are gone |
| Camera subject point | (540, 1175) | (1420, 540), clear of the caption column |
| Push-ins (scale) | match 1.5 · Added 1.18 · sheet 1.1 · nav 2.0 | match 1.8 · Added 1.32 · sheet 1.2 · nav 2.6 |
| Logo | 660 wide, centred at (540, 830) | 620 wide, centred at (960, 440); arrow path and disc re-derived from the same trace |
| CTA / URL | 62px at y 1100 / 34px at y 1622 | 76px at y 690 / 38px at y 884 |

## Re-rendering

Same as the vertical cut. FFmpeg isn't installed, so put `ffmpeg-static` on `PATH` first:

```bash
cd composition
npm install --no-save ffmpeg-static ffprobe-static
mkdir -p .hfbin
node -e "const fs=require('fs');fs.copyFileSync(require('ffmpeg-static'),'.hfbin/ffmpeg.exe');fs.copyFileSync(require('ffprobe-static').path,'.hfbin/ffprobe.exe')"
export PATH="$PWD/.hfbin:$PATH"
npm run check
npx hyperframes render --quality looks --output ../brag.mp4
rm -rf .hfbin node_modules
```

Re-bake the poster afterwards (from this folder). 18.0s is the push-in on "94% match":

```bash
ffmpeg -ss 18.0 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg -y
ffmpeg -y -i brag.mp4 -i brag.jpg \
  -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
  -c:a copy -movflags +faststart brag.poster.mp4 && mv brag.poster.mp4 brag.mp4
```

## Check status

`npm run check` passes with 0 errors. The 12 contrast warnings are the same kind as in the vertical cut: text sampled while it is clipped off-screen or mid-slide (the sign-up footer below the fold, the scrolled onboarding title, the listing page sliding out at 30.04s). No visible text fails contrast.

## Note

The vertical composition was opened in HyperFrames Studio, which saved it back with `data-hf-id` attributes on every element. Nothing else changed. This copy carries those IDs too; they're harmless.

## Outro update (2026-09-29)

At the lock (37.92s) the orange arrow now disappears on that same frame instead of turning navy, so the orange glow shows through the logo's gap, and the end frame is the single untouched logo file. The credit reads "UP is a product by Outsidee Solutions". Both changes are in the vertical cut too.
