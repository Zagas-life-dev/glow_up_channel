# Hyperframes Composition Brief: UP

## Objective
Create a short launch-style brag video for UP — a retimed, CTA-closed cut of the 2026-09-20 "One motion, one color" film.

## Output
- Composition directory: `brag-output-2026-09-21-172106/composition/`
- Rendered video: `brag-output-2026-09-21-172106/brag.mp4`
- Format: vertical — 1080x1920 (9:16)
- Duration: 18.02 seconds

## Source Material
- Project root: `C:\Users\kachi\OneDrive\Documents\Company grade code\Glowup-diaries-main`
- Primary files read: `app/layout.tsx` (fonts, `theme-color`), `app/manifest.ts` (`background_color`), `app/home-client.tsx` (`tabs[]` at line 65), `components/feed-card.tsx` (card anatomy), `components/app-sidebar.tsx:134`, `components/landing/landing-page.tsx` (`STATS`), `public/images/UP Logo dark background (2).png`, `public/images/UP logo bright background.png`
- Product name: **UP** (never "Glowup Channel" — that is a legacy SEO name and must not appear anywhere in the video)
- Tagline / strongest claim: every listing ranked against the individual — `94% match · Lagos, Nigeria`
- Key UI or visual moment to recreate: the five-tab feed strip plus one ranked feed card, and the logo's internal arrow
- Copy that must appear verbatim:
  - `For You` / `Opportunities` / `Jobs` / `Events` / `Resources`
  - `94% match`
  - `· Lagos, Nigeria`
  - `22,000+`
  - `10k+ active · 22k+ community`
  - `Get access. Get UP.`
  - `glowupchannel.com`
  - `UP is a product by Outside Solutions`

## Creative Direction
- Tone preset: `cinematic`, executed with `polished` restraint
- Creative direction: **single-colour liquid ink on near-black navy, orange only, morphs into the UP arrow logo, no gradient rainbow, credit Outside Solutions**
- Interpretation: big motion and big type, but no hype and no launch-day energy. The drama comes entirely from one substance moving, so every scene is either liquid or locked, never decorative.
- Angle: One motion, one color. The film is a single continuous substance — one orange drop lands on navy and never leaves the frame. It spreads, climbs, narrows into the logo's arrow, gets surrounded by letterforms until it inverts into the wordmark's negative space, liquifies down into the product's own feed, re-pours as the community number, and condenses back into the arrow it started as. Same ink, six states. Not a launch film: UP has 10k+ active users and 22k+ community, so the number beat is distance travelled and the last frame is a direct ask.
- Hook: navy, empty; a single drop of orange ink lands dead centre at `0.56s` and blooms with a real liquid meniscus edge. No text competes with it.
- Outro / punchline: everything condenses back into the orange arrow, the lockup re-forms, and **Get access. Get UP.** lands, with the URL and the Outside Solutions credit beneath it.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - **Any colour that is not navy, orange or white** — no gradient stops, no secondary accent, no coloured glows
  - The name "Glowup Channel"
  - Naming any third-party organization on the feed card

## Visual Identity
- Background: `#0B1222`
- Text: `#FFFFFF`, with `rgba(255,255,255,0.55)` for supporting lines
- Accent: `#FF6700`
- Display font: Inter (local `assets/fonts/inter-latin.woff2`)
- Body font: Bricolage Grotesque (local `assets/fonts/bricolage-grotesque-latin.woff2`)
- Visual references from the project: the logo's internal arrow geometry; the feed tab pills; the feed card surface (2xl radius, hairline border, eyebrow + urgency rail, title, body, match/location meta, idle action row)

## Storyboard
Use the storyboard in `brag-output-2026-09-21-172106/brag-plan.md` as the creative contract.

Scene summary:
1. Ink drop — 2.19s (0.00 → 2.19) — one orange drop lands on empty navy and spreads; no text
2. The arrow — 2.20s (2.19 → 4.39) — the pool climbs and hardens into the logo's arrow, locking at 3.82
3. The wordmark — 3.25s (4.39 → 7.64) — U and P pour in from both edges; at 6.56 the arrow inverts to navy and becomes the wordmark's negative space
4. The feed — 3.82s (7.64 → 11.46) — the lockup drains into the real five-tab strip; a ranked card lands at 9.29; `94% match · Lagos, Nigeria` resolves at 10.37
5. The number — 3.27s (11.46 → 14.73) — `22,000+` ink-drips in at 12.55 with the opening drop's gesture; `10k+ active · 22k+ community` at 13.11
6. The credit — 3.29s (14.73 → 18.02) — everything condenses to the arrow, the lockup re-forms at 15.29, `Get access. Get UP.` lands at 15.84, URL + Outside Solutions credit at 16.38

## Audio
- Audio role: cinematic support with sparse, dry accents
- Audio arc: the bed arrives with the first drop, holds one level through the whole film, and recedes deliberately under the closing CTA and credit
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` at `0.32`
- Music treatment: volume automation `0 → 0.32` over the first `0.6s`; hold `0.32`; fade to `0.14` from `16.38s`; out by `18.02s`
- Music cue guidance: bundled preset `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (tempo 109.96, beat ~0.545s). Strong-cue locks (3): `9.29` card, `12.55` figure, `15.84` CTA. Beat-grid: `3.82`, `5.34`, `6.56`, `7.64`, `8.19`, `10.37`, `13.11`, `14.73`, `15.29`, `16.38`. The wordmark inversion at `6.56` is intentionally *not* on a strong cue — the track's strong cues start at `8.74`, past which this retime moves; the bell SFX carries that moment instead.
- Audio-reactive treatment: subtle — per-frame RMS/bass from `assets/audio-data.js` drives only the arrow's orange drop-shadow and the pool's presence. Never text, never scale on copy. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Scene 1 `0.56` — the ink drop landing (soft wet placement)
  - Scene 2 `3.82` — the arrow locking (dry medium body hit)
  - Scene 3 `6.56` — the wordmark lock + inversion (deep bell, allowed to ring)
  - Scene 4 `9.29` — the ranked card sliding in (card slide); **no sound on the tab pour**
  - Scene 5 `12.55` — the figure landing (the opening drop, heavier)
  - Scene 6 `14.73` — the condense (deep bell, rings out before the music fade)
- SFX selection guidance: 6 cues total, all dry, none above `0.70`. No risers, no whooshes, no stingers on text.
- SFX analysis guidance: `<skill-dir>/assets/sfx/sfx-analysis.md` — prefer low/medium high-frequency risk for this polished tone.
- Exact SFX choice: carried over from the 2026-09-20 cut (validated), retimed to the new beats.
- Audio files: already present under `composition/assets/` (music, 6 SFX, brand PNGs, both fonts, `audio-data.js`)

## Hyperframes Instructions
This composition already exists and passed `hyperframes check` in the 2026-09-20 run. This run is a **retime plus a copy change**, not a rebuild:

1. Retime the single paused GSAP timeline from 20.75s to 18.02s per the scene table above, keeping every tween's character and only compressing/shifting its position and duration.
2. Update `data-duration` on `#root`, `#ink-stage` and the music clip to `18.02`; update `data-start` / `data-duration` on `#s-feed`, `#s-number`, `#s-credit`.
3. Move all 6 SFX `data-start` values to the new cue times.
4. Rewrite the music `data-automation` volume lane for the new fade window.
5. Replace the closing `Your growth hub` line with `Get access. Get UP.` and give it the weight of a payoff line rather than a sub-label.
6. Shorten the feed card title and body so both clear the reading floor inside a 3.82s scene.
7. Cap the audio-reactive per-frame loop at the new duration so it does not extend the timeline past `18.02`.
8. Keep the composition seek-safe: every deferred `fromTo` keeps `immediateRender:false` and a matching resting state set outside the timeline.

Requirements:
- Show at least one real UI, copy, or visual element from the source project. (Scene 4.)
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds. (18.02s.)
- Include the planned music/SFX layer. Voice is off — `--voice` was not passed.
- Run `hyperframes check` before render — it is brag's single gate.
