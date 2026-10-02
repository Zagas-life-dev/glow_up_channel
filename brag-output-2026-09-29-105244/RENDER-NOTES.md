# UP user-flow video: notes

41.6s, 1080x1920, one phone, one continuous take: sign up → onboarding → feed → like/save → playlist → apply → Tracker → the Tracker's tick becomes the arrow in the logo.

- Plan and storyboard: `brag-plan.md`
- Brief: `composition-brief.md`
- Composition: `composition/index.html` (one file, one GSAP timeline)
- Render: `brag.mp4`; poster: `brag.jpg` (baked in as frame 0)
- Caption: `share-copy.txt`

## Re-rendering

FFmpeg still isn't installed on this machine. The render used a copy from the `ffmpeg-static` npm package placed on `PATH` for that session only; nothing was added to the repo. To re-render:

```bash
cd composition
npm install --no-save ffmpeg-static ffprobe-static
mkdir -p .hfbin
node -e "const fs=require('fs');fs.copyFileSync(require('ffmpeg-static'),'.hfbin/ffmpeg.exe');fs.copyFileSync(require('ffprobe-static').path,'.hfbin/ffprobe.exe')"
export PATH="$PWD/.hfbin:$PATH"

npm run check                                   # the gate: must be 0 errors
npx hyperframes render --quality looks --output ../brag.mp4
rm -rf .hfbin node_modules                      # ~150 MB; doesn't belong in the repo
```

The permanent fix is `winget install --id Gyan.FFmpeg -e`.

A render overwrites the baked poster, so re-bake it afterwards (from this folder):

```bash
ffmpeg -ss 18.0 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg -y
ffmpeg -y -i brag.mp4 -i brag.jpg \
  -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
  -c:a copy -movflags +faststart brag.poster.mp4 && mv brag.poster.mp4 brag.mp4
```

18.0s is the push-in on the feed card: "94% match" held large, under the caption "Ranked for you, not just listed." It's the frame that says what UP does. The final lockup (40.6–41.5s) is the other safe choice.

## How it is built

- **Screens are rebuilt, not screenshotted.** Each screen is HTML built from the real components (auth-shell, step-shell, feed-card, add-to-playlist-modal, detail-hero, return-sheet, tracker page, bottom nav) at app size (390px wide), scaled 1.78× with CSS `zoom` so the text stays sharp when the camera pushes in. Copy is verbatim from those files.
- **Discrete UI state is a pure function of time.** One `render(t)` sets typed text, counters, step labels, payoff copy and button labels, driven by a single linear tween across the whole film, so every frame can be rendered on its own.
- **Camera.** One transform on `#rig`, written in one place (`applyCam`). The pushes (94% match, like/save row, Added pill, return sheet, Tracker icon) use subject positions measured once at build time.
- **Caption rail.** Top 430px. Phone content that slides under it during a push fades out through a CSS mask on `#window`.
- **Outro.** An SVG disc starts exactly on the zoomed nav icon, lifts, and morphs (MorphSVG) into the arrow traced from the logo. Two halves of the real `up-mark-orange.png`, clipped at x = 613/1199 (a line that runs entirely through the arrow gap), slide in and lock at 37.92s. At the lock the orange arrow disappears on that same frame, so the gap becomes the logo's own see-through negative space and the glow shows through it. The halves then hand over to the single, untouched logo file (`#logoFull`), so the end frame is the actual logo.
- **Music.** `happy-beats-business-moves-vol-11` (114.84 BPM). Strong-cue locks at 1.60 (phone lands), 16.86 (push-in on the match) and 37.92 (logo lock). Apply (29.49), the Added pill (25.81), the onboarding taps and the card entrances snap to the beat grid.
- **Audio-reactive.** The orange glow behind the phone and the drift of the background tiles follow the track's RMS/bass (`assets/audio-data.js`).
- **SFX.** 46 static `<audio>` tags. Taps are `ui/click2`, the typing is keypresses on the name fields only, and the only bell is the logo lock.

## Check status

`npm run check` passes with 0 errors. The 13 remaining warnings are all contrast readings on text that is not visible in that frame: the Create account button while it is still scrolled below the fold, the onboarding step label scrolled under the clip, a label hidden under its own "selected" layer, and the detail screen at 30.04s while it slides off-screen. There is no visible low-contrast text.

## Content honesty

Every listing, playlist, person and tracker entry is invented ("Future Leaders Scholarship 2027", "Junior Data Analyst (Remote)", "Tech Careers Meetup", "Ada Okafor"). No real organisation appears. Cards render without a provider, and the Apply button uses the app's own fallback label "Apply now" rather than a made-up domain. The "away" beat shows a deliberately unbranded page.

## Things worth knowing

1. **The onboarding payoff copy has a real plural bug.** With one option selected, `components/onboarding/interests-step.tsx` renders "1 categories selected" and `aspirations-step.tsx` renders "1 goals set." The video shows the app as it is, so "1 goals set." appears for about a second. Fix it in the app, re-render, and it disappears.
2. **Dark mode isn't shown.** Its tokens are still under review, so the phone uses the light theme.
3. **`brag-output-*/` is still not in `.gitignore`.** Add it before any `git add -A`.
