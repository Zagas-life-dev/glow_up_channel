# Re-rendering this video

FFmpeg is still not installed on this machine, so the render uses a project-local
copy staged into `composition/.hfbin/`. That staging is ~146 MB of binaries and
does not belong in the repo, so it is removed after the render. To re-render or
re-cut:

```bash
cd composition
npm install --no-save ffmpeg-static ffprobe-static
mkdir -p .hfbin
node -e "const fs=require('fs');fs.copyFileSync(require('ffmpeg-static'),'.hfbin/ffmpeg.exe');fs.copyFileSync(require('ffprobe-static').path,'.hfbin/ffprobe.exe')"
export PATH="$PWD/.hfbin:$PATH"

npm run check                                           # the gate: must be 0 errors
npx hyperframes render --quality looks --output ../brag.mp4
```

The permanent fix is `winget install --id Gyan.FFmpeg -e`, after which none of the
above staging is needed.

## Re-baking the poster after a re-render

`brag.jpg` is frame 0 of `brag.mp4` so that every platform's thumbnail grabber
picks it up. A fresh render overwrites that, so redo both steps:

```bash
ffmpeg -ss 16.9 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg -y
ffmpeg -y -i brag.mp4 -i brag.jpg \
  -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
  -c:a copy -movflags +faststart brag.poster.mp4 && mv brag.poster.mp4 brag.mp4
```

The poster timestamp `16.9s` is the settled window in Scene 6 where the lockup,
the CTA (`Get access. Get UP.`), the URL and the Outside Solutions credit are all
fully animated in and nothing is exiting — the one frame that is postable on its
own. The safe window is roughly `16.9s → 18.0s`.

## What changed from the 2026-09-20 cut

This run is a retime plus a copy change, not a rebuild:

- **20.75s → 18.02s**, to land inside the stated ~15-20s window. All six scenes
  re-timed and re-locked to the same track's beat grid (109.96 BPM).
- **Closing line**: `Your growth hub` (verbatim from `components/app-sidebar.tsx:134`)
  replaced by the chosen CTA **`Get access. Get UP.`**, at 56px/700 instead of
  40px/600 so it reads as a payoff rather than a sub-label. The element id
  changed `#tagline` → `#ctaline`.
- **Strong-cue locks moved** from `8.74 / 10.93 / 17.47` to `9.29` (card),
  `12.55` (figure), `15.84` (CTA).
- **Feed card copy tightened**: the title lost "Housing &", and the body went
  from 14 words to 5 (`Tuition, housing and monthly stipend.`), because a 3.82s
  scene cannot carry a 14-word description above the reading floor.
- **Audio-reactive loop capped** at `18.02s` so the per-frame `tl.call()` chain
  (generated for the 20.73s of `assets/audio-data.js`) no longer extends the
  GSAP timeline past the composition duration.

### Bug fixed in this run (present in the 2026-09-20 cut)

The standalone arrow was displaced up and to the left of frame centre whenever
its scale was not exactly 1 — most visibly in Scene 2, where it locks at scale
1.42 and holds. GSAP measures `transformOrigin` on an **SVG** element from that
element's own bounding box, so `"550.2px 960px"` was not the user-space point it
looks like; it resolved to roughly `(1001, 1716)`, well down-right of the arrow,
and scaling up about that point pushed the shape up-left.

The effect was that the ink pool climbed at frame centre and the arrow it
"became" appeared off-centre — which breaks the film's whole conceit of one
continuous substance. Scene 3 then slid it back into place as it scaled to 1,
reading as an unintended drift.

Fix: `svgOrigin` (user-space) instead of `transformOrigin` for `#arrow`,
`#lockup` and `#goo-layer`. `#bignum` and `#s-number` deliberately keep
`transformOrigin` — they are HTML elements, where px values are already measured
from the element's own box, and `#s-number` is a full-bleed `inset: 0` clip so
`550.2px 960px` is the correct frame point for it.

If you re-render the 2026-09-20 composition for comparison, it still has this
bug.

### Known cost of the retime

The wordmark inversion — the film's brand payoff — now sits at `6.56s`, which is
an ordinary beat, not a strong cue. The track's strong cues do not begin until
`8.74s`, which the shorter cut moves past. The moment is carried by the geometry
and the bell SFX instead of by a musical hit. The 20.75s cut in
`brag-output-2026-09-20-143341/` does land that inversion on a 0.99 strong cue,
if that tradeoff matters more than the duration.

## Two things still open

1. **The numbers disagree with the live site.** The video says 10k+ active /
   22k+ community. `components/landing/landing-page.tsx` still renders
   `8,200+ Platform Users` and `5,800+ Community Members` (the `STATS` block at
   lines 43-47), and repeats `8,200` / `5,800+` in prose at lines 197 and 504.
   Update that block before the video goes public, or the two will contradict
   each other.
2. **`brag-output-*/` is not covered by `.gitignore`.** Add it before any
   `git add -A`.
