# Hyperframes Composition Brief: UP

## Objective
Create a short, motion-led brag video for **UP** — a single-colour liquid-ink film in which one drop of orange on navy becomes the logo, becomes the product, becomes the community number, and condenses back into the arrow it started as.

## Output
- Composition directory: `brag-output-2026-09-20-143341/composition/`
- Rendered video: `brag-output-2026-09-20-143341/brag.mp4`
- Format: **vertical — 1080x1920 (9:16)**. This is non-negotiable: the film is for Reels / TikTok / Stories. Do not produce a landscape loop.
- Duration: **20.75 seconds**

## Source Material
- Project root: `C:\Users\kachi\OneDrive\Documents\Company grade code\Glowup-diaries-main`
- Primary files read:
  - `components/landing/landing-page.tsx` — `BRAND_VARS` (`--ink #0B1222`, `--orange #FE6700`, `--paper #FDF5ED`), hero H1, `STATS` block, footer nav
  - `app/home-client.tsx` — the five-tab feed strip (`tabs[]`, line 65) and `tabIcons` (line 58)
  - `components/feed-card.tsx` — feed card anatomy, deadline urgency treatment, match/location meta row
  - `components/app-sidebar.tsx` line 134 — the brand lockup tagline
  - `app/layout.tsx` — Inter (`--font-up-display`) + Bricolage Grotesque (`--font-up-body`)
  - `public/images/UP Logo dark background (2).png` — colour sampling + arrow geometry trace
- Product name: **UP**. Always "UP", never "Glow Up Channel" / "Glowup Channel" — that is a legacy SEO name and must not appear as a product name anywhere in the film. The only permitted occurrence of the string is the small URL line `glowupchannel.com` in Scene 6, which is the live address.
- Tagline / strongest claim: `Your growth hub` (verbatim, `components/app-sidebar.tsx:134`)
- Key UI moment to recreate: the five-tab feed strip with **For You** active, plus one ranked feed card whose meta row resolves to `94% match · Lagos, Nigeria`
- Copy that must appear verbatim:
  - `For You` · `Opportunities` · `Jobs` · `Events` · `Resources`
  - `OPPORTUNITY`
  - `3 days left`
  - `Fully Funded Scholarship — Tuition, Housing & Stipend`
  - `94% match`
  - `Lagos, Nigeria`
  - `22,000+`
  - `10k+ active · 22k+ community`
  - `Your growth hub`
  - `glowupchannel.com`
  - `UP is a product by Outside Solutions`

## Creative Direction
- Tone preset: **`cinematic`** for pacing and scene count, executed with **`polished`** restraint.
- Creative direction (user-specified, verbatim): *single-colour liquid ink on near-black navy, orange only, morphs into the UP arrow logo, no gradient rainbow, credit Outside Solutions*
- Interpretation: Big motion, big type, dramatic reveals — but zero hype. No exclamation marks, no "we just launched" energy, no motion for its own sake. The drama comes entirely from **one substance moving**, so every element on screen is either liquid or locked. Sentence case throughout.
- Angle: The brand is exactly two colours, so the film refuses every other one. A single saturated orange does all the work against near-black, and fluidity comes from motion rather than from palette variety. The film is one continuous substance in six states: a drop lands, spreads, climbs, narrows into the logo's arrow, is surrounded by letterforms until it inverts into the wordmark's negative space, liquifies into the product's feed, re-pours as the community number, and condenses back into the arrow. UP is **not** new — 10,000+ active users, 22,000+ community — so the number beat is distance travelled, not a debut.
- Hook: empty navy; one orange drop lands dead centre and blooms with a real liquid meniscus edge. No text competes with it.
- Outro / punchline: everything condenses back into the single orange arrow, the lockup settles, and the credit line lands last.
- **Avoid:**
  - Any colour outside navy `#0B1222`, orange `#FF6700`, white. **No gradient stops, no secondary accent, no coloured glows, no tints of other hues.** This is the single hardest constraint in the brief — the user explicitly rejected a five-stop gradient treatment from a previous run.
  - Generic SaaS language and invented ad copy. Every word on screen is in the verbatim list above.
  - Abstract filler visuals, particle systems, waveform/equaliser graphics.
  - Landscape framing.
  - Naming any third-party organization.
  - Any "launching today" / "introducing" framing.

## Visual Identity
- Background: `#0B1222` (sampled from the logo PNG's dominant field; matches `--ink`)
- Accent: `#FF6700` (sampled from the same file; matches the app's `--primary`)
- Text: `#FFFFFF` for primary copy; `rgba(255,255,255,0.55)` for supporting lines. White is a contrast utility only — it never appears as a shape or a fill.
- Display font: **Inter** (`--font-up-display`)
- Body font: **Bricolage Grotesque** (`--font-up-body`); fall back to Inter if unavailable
- **The arrow geometry (traced from the real logo file).** The orange mark occupies a 933×544 px bbox inside the 1563² canvas. The internal navy arrow measures, as fractions of mark height: head height `0.375`, triangle base half-width `0.2428`, shaft half-width `0.0849`. Standalone path on a `0 0 486 1000` viewBox:
  ```
  M243,0 L486,375 L328,375 L328,1000 L158,1000 L158,375 L0,375 Z
  ```
  Use this path for every standalone-arrow moment (Scenes 2, 3 pre-lock, and 6) so the mark in the film is the mark in the logo.
- Logo asset: `assets/brand/up-logo-dark.png` — already a flat `#0B1222` field, so it composites onto the film's navy with no matte work. Use it for the *settled* lockup in Scenes 3 and 6 so the final form is the real file, not an approximation. (`assets/brand/up-logo-bright.png` is the orange-field inverse — supplied for reference; not expected in the edit.)
- Visual references from the project: the feed tab pill treatment (active pill in orange), the feed card surface (`#121A2B`, 2xl radius, hairline border), the urgent-deadline rail treatment, the match-score meta row.

## Storyboard
Use the storyboard in `brag-output-2026-09-20-143341/brag-plan.md` as the creative contract. Scene summary:

1. **Ink drop** — 2.19s (0.00 → 2.19) — one orange drop lands on empty navy at `0.56` and spreads into an organic-edged pool. No text.
2. **The arrow** — 2.72s (2.19 → 4.91) — the pool arrests, climbs upward against itself, narrows into a headed column, and resolves into the brand arrow, locking at `4.39`.
3. **The wordmark** — 4.92s (4.91 → 9.83) — the arrow holds alone to `6.56`; orange floods in from both edges forming the U and P; at **`8.74` the letters lock and the arrow inverts orange→navy**, becoming the wordmark's negative space. Settled lockup holds `1.09s`.
4. **The feed** — 4.37s (9.83 → 14.20) — the lockup liquifies downward and re-pours as the five-tab strip (fast waterfall from `10.37`, ~`0.12s` apart, then **held as a set**); a real feed card lands at **`10.93`**; the meta row resolves at `12.55` to `94% match · Lagos, Nigeria`.
5. **The number** — 3.27s (14.20 → 17.47) — empty navy again; `22,000+` ink-drips into place at `14.73` with the opening drop's exact gesture; `10k+ active · 22k+ community` settles at `15.84`.
6. **The credit** — 3.28s (17.47 → 20.75) — everything condenses into the orange arrow at **`17.47`**; lockup at `18.02`; `Your growth hub` at `18.56`; `glowupchannel.com` + `UP is a product by Outside Solutions` together at `19.10`; holds, then empties to the opening colour so the loop closes.

**Readability floors already budgeted — do not compress them:** the Scene 4 card title holds `3.27s`, its meta holds `1.65s`; the Scene 5 figure holds `1.9s` and its subline `1.63s`; the Scene 6 tagline holds `2.19s` and the credit `1.65s`. The five tab labels are revealed fast **as one gesture** and read during the hold — do not space them one-per-beat.

## Audio
- Audio role: cinematic support with sparse, dry accents. Motion-led; the bed gives the liquid weight, it does not hype it.
- **Voice: none.** `--voice` was not passed. Fully silent / motion-only — no narration, no voice track, no ducking.
- Audio arc: the bed arrives *with* the first drop rather than under it, holds one level through the whole film, and deliberately recedes under the credit so the final bell is the last thing heard.
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` at `0.32`.
- Music treatment: fade up from `0` over the first `0.6s`. Hold `0.32`. Fade to `0.14` from `19.10s`, out by `20.75s`, letting the closing bell ring past it.
- Music cue guidance: bundled preset at `<brag-skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (109.96 BPM, 45-point beat grid in the 0–25s window).
  - **Strong-cue locks (3, all ≥0.97):** `8.74` (wordmark locks / arrow inverts), `10.93` (feed card lands), `17.47` (condense to arrow). Mark each `// beat-locked`.
  - **Beat-grid entrances:** `10.37` (tab pour begins), `12.55` (meta resolves), `14.73` (figure drips), `15.84` (subline), `18.02` (lockup), `18.56` (tagline), `19.10` (URL + credit). Mark each `// beat-grid`.
  - Ignore any cue that would compress a readability floor above.
- Audio-reactive treatment: **subtle**. Wire the orange pool's edge bloom (Scenes 1–2) and the standing arrow's presence (Scenes 2, 6) to music RMS/bass so the ink breathes. Nothing else. No waveform, no equaliser, no particles, no strobing, and no audio-reactive scaling on any text.
- Audio-coupled moments:
  - Scene 1 `0.56` — drop landing → soft wet placement
  - Scene 2 `4.39` — arrow locking → dry medium body hit
  - Scene 3 `8.74` — wordmark lock + inversion → deep bell, the brand payoff
  - Scene 4 `10.93` — feed card sliding in → card slide
  - Scene 5 `14.73` — figure landing → the opening drop's sound, slightly heavier
  - Scene 6 `17.47` — condense → deep bell, allowed to outlive the music
- SFX selection guidance: 6 cues in the whole film, all dry, **none above `0.70`**. **No sound on the tab-strip pour** — it is one gesture, not five events. No risers, no whooshes, no stingers on text. If a cue would make the film feel excited rather than assured, cut it.
- Candidates already staged in `assets/sfx/` (swap freely once the animation exists): `interface/drop_001.ogg`, `interface/drop_002.ogg`, `impact/impactSoft_medium_001.ogg`, `impact/impactBell_heavy_000.ogg`, `impact/impactBell_heavy_003.ogg`, `casino/card-slide-1.ogg`.
- SFX analysis guidance: `<brag-skill-dir>/assets/sfx/sfx-analysis.md`. `card-slide-3` was already rejected for **high** high-frequency risk and replaced with `card-slide-1` (medium) — keep that preference for anything polished or repeated.
- Exact SFX choice: yours, after the animation exists.
- Audio files: music and all six SFX candidates are **already copied** into `brag-output-2026-09-20-143341/composition/assets/`. Reference them with paths relative to `composition/`. Never absolute paths.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (check/render). **/brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow.** Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI element from the source project — Scene 4 is that scene and must read as the actual product.
- Keep all text readable; the holds above are floors, not targets.
- Total duration 20.75s.
- Include the planned music + SFX layer.
- Treat `/brag` audio notes as guidance; choose final SFX after the visual animation exists.
- Treat cue metadata as optional timing hints. Three strong-cue locks, marked. Sequential events snap to the beat grid within ±0.10s, marked.
- Honour the music fade-out under the credit and let the final bell ring over it.
- Wire at least one visual element to per-frame audio data (see `hyperframes-creative`'s audio-reactive guidance; it owns its own extraction helper — do not hardcode a path to it). If extraction is unavailable, document it and skip rather than blocking the render.
- Use local assets only.
- **The liquid is the hard part.** The ink drop, spread, climb, arrow-morph, letterform pour, liquify-down and final condense all need to read as one continuous substance with surface tension — not as scaling circles or opacity fades. Use whatever Hyperframes-native approach gives real metaball/goo behaviour (an SVG `feGaussianBlur` + `feColorMatrix` goo filter over merging shapes is the standard trick and is seek-safe). Every liquid state must be deterministic at any seek position.
- Run `npx hyperframes check` before render — it is brag's single gate.
