# Brag Plan: UP

## What is this app?
UP is a platform that helps young Africans aged 18–35+ discover and access scholarships, grants, jobs, internships, events and free learning resources in one place, and ranks every listing against the individual — their interests, location, language and how close the deadline is. It is operated by Outside Solutions Ltd. and already carries an established audience rather than a launch-day one.

## The angle
**One motion, one color.**

The brand is two colors — navy `#0B1222` and orange `#FF6700`, sampled straight out of the logo files and confirmed against the app's own `theme-color` (`app/layout.tsx:159`) and `background_color` (`app/manifest.ts:23`). So the video refuses every other color. No gradient stops, no secondary accent, no color-as-variety. A single saturated orange does all the work against near-black, and the *fluidity* comes from motion, not from palette — the way Duolingo and Cash App hold one color and let movement carry the richness.

The whole film is therefore one continuous substance. A single point of orange ink lands on navy and never leaves the frame: it spreads, climbs, narrows into the logo's arrow, gets surrounded by letterforms until it inverts into the wordmark's negative space, liquifies down into the product's own feed, re-pours as the community number, and finally condenses back into the arrow it started as. Same ink, six states.

This is not a "we just launched" film, because UP did not just launch. It has 10,000+ active users and 22,000+ in the community. The number beat is framed as distance travelled, not as a debut — the video's job is *join what's already growing*, and the last frame converts that into a direct ask.

**Honesty guard:** no third-party organization is named anywhere. The feed card in Scene 4 is a real card anatomy carrying a real listing *shape* with the provider deliberately omitted — the product claim being demonstrated is the ranking (`94% match · Lagos, Nigeria`), which is UP's own output about the viewer, not a claim about anyone else.

**Numbers flag (unresolved):** the live landing page still renders `8,200+ Platform Users` and `5,800+ Community Members` from the `STATS` block at `components/landing/landing-page.tsx:43-47`, and the same `8,200` / `5,800+` figures appear in the page's own description copy (lines 197 and 504). The video uses the newer 10k+ / 22k+ figures supplied for this brief. If the video ships before that block is updated, the site and the video will disagree in public.

## Hook (first 2-3 seconds)
Black-navy, empty. A single drop of orange ink hits dead centre and blooms outward — one colour arriving in a colourless frame, with a real liquid meniscus edge, not a scaling circle. Nothing else is on screen and no text competes with it. The hook is the arrival itself: you do not yet know what the orange is going to become, and the spread is already moving toward something.

## Key moments (the middle)
- **The climb.** The pool arrests mid-spread and pulls *upward* against itself, mass gathering into a column with a head — the first moment the motion declares a direction.
- **The inversion.** The orange arrow stands alone; orange floods in from both sides forming the U and the P; and at the instant the letters lock, the arrow flips from orange to navy and is suddenly the negative space inside the wordmark. The logo reveals itself by turning its own subject inside out.
- **The feed doing its job.** The wordmark liquifies downward and re-pours as the product's real tab strip — For You · Opportunities · Jobs · Events · Resources — then one real feed card slides up beneath it and its meta row resolves to **94% match · Lagos, Nigeria**. It didn't list the thing, it ranked it.
- **The number.** Navy holds empty again, and **22,000+** ink-drips into place the same way the first drop did, with `10k+ active · 22k+ community` under it. Same gesture as the opening, four scenes later — the drop became a community.

## Outro / punchline
Everything in frame condenses back into the single orange arrow it started as. The full UP lockup settles, then the ask lands: **Get access. Get UP.** Beneath it `glowupchannel.com` and, small and last, `UP is a product by Outside Solutions`. The loop restarts on the same empty navy it opened on, so the film reads as a closed circuit.

**Change from the 2026-09-20 cut:** the final statement was `Your growth hub` (verbatim from `components/app-sidebar.tsx:134`). It is replaced by the user-chosen CTA `Get access. Get UP.`, so the film now ends on a direct ask rather than a brand descriptor. The verbatim sidebar tagline is therefore no longer in the video; it survives as the share copy's opening line.

## User flow worth showing
Real flow, two beats, taken from `app/home-client.tsx` (the five-tab strip, `tabs[]` at line 65) and `components/feed-card.tsx` (card anatomy, deadline urgency, match/location meta row):
1. **Entry** — the five-tab feed strip resolves: For You / Opportunities / Jobs / Events / Resources.
2. **Key action + result** — a ranked listing card arrives and its meta resolves to a match score and a location, i.e. the ranker's output rather than a list.

Scene 4 is the centrepiece and is the one scene that must read as the actual product. Scene 5 (the number) is the single landing-page-flavoured frame, used as the payoff, not as a substitute for the app.

## Tone
- Preset: `cinematic` (pacing and scene count), executed with `polished` restraint
- Creative direction (user-specified): **single-colour liquid ink on near-black navy, orange only, morphs into the UP arrow logo, no gradient rainbow, credit Outside Solutions**
- Interpretation: Big motion, big type, dramatic reveals — but no hype, no exclamation marks, no "we just launched" energy. The drama comes entirely from one substance moving, so every scene is either liquid or locked, never decorative. Sentence case. Inter for the statements, Bricolage Grotesque for supporting copy. Transitions are the ink itself carrying from scene to scene — dissolves happen *as liquid*, never as crossfades of unrelated frames.

## Format: vertical — 1080x1920 (9:16)
## Duration: 18.02 seconds

Vertical is explicit: this is for Reels / TikTok / Stories, where UP's audience actually is. Do not fall back to a landscape loop. 18.02s lands inside the stated ~15-20s window and on a beat of the track (beat 33).

## Visual identity (from the project)
- Background: `#0B1222` — sampled from `UP Logo dark background (2).png` (dominant field), matching `background_color` in `app/manifest.ts:23` and `--ink` in `components/landing/landing-page.tsx`
- Accent: `#FF6700` — sampled from the same logo file and matching `theme-color` in `app/layout.tsx:159`
- Text: white `#FFFFFF` for primary copy on navy; `rgba(255,255,255,0.55)` for supporting lines. White is a contrast utility, not a third brand colour — it never appears as a shape or a fill.
- **Hard colour guardrail: navy, orange, white only. No gradient stops, no tints of other hues, no secondary accent, no coloured glows.** A glow, if used, is orange at low alpha.
- Display font: Inter (`--font-up-display`, `app/layout.tsx:43`)
- Body font: Bricolage Grotesque (`--font-up-body`, `app/layout.tsx:49`)
- Strongest visual element: the logo's arrow. Traced from `public/images/UP Logo dark background (2).png` (orange bbox 933×544 px within a 1563-square canvas), the internal navy arrow measures: head height `0.375` of mark height, triangle base half-width `0.2428` of mark height, shaft half-width `0.0849` of mark height. As a standalone path on a `0 0 486 1000` viewBox: `M243,0 L486,375 L328,375 L328,1000 L158,1000 L158,375 L0,375 Z`
- Logo asset: `assets/brand/up-logo-dark.png` — already a flat `#0B1222` field, so it composites seamlessly onto the video's own navy with no matte work

## Share copy (draft)
One colour, one motion. 22,000+ young Africans are already on UP — scholarships, jobs, events and resources, ranked against you before the deadline is. Get access. Get UP.

## Audio direction
- Role: Cinematic support with sparse, dry accents. The film is motion-led and silent of narration; the bed exists to give the liquid weight, not to hype it.
- Voice: **none.** `--voice` was not passed, so this is fully silent / motion-only. No narration, no ducking, no voice track.
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` ("steady and clean", 109.96 BPM) at `0.32`.
- Music treatment: fade up from `0` over the first `0.6s` so the ink drop lands into arriving sound rather than into a running track. Hold `0.32` throughout. Fade to `0.14` from `16.38s` under the URL and credit, out by `18.02s`, so the fine print lands in near-silence.
- Music cue guidance: bundled preset read — `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (tempo 109.96, beat ~0.545s). **Strong-cue locks (3):** `9.29s` (ranked card lands, intensity 0.97), `12.55s` (the figure drips in, 0.94), `15.84s` (the CTA lands, 0.96). **Beat-grid entrances:** arrow locks `3.82`, masses begin pouring `5.34`, wordmark inverts `6.56`, lockup drains `7.64`, tab strip pours `8.19`, meta row resolves `10.37`, subline `13.11`, condense `14.73`, lockup re-forms `15.29`, URL + credit `16.38`.
- **Cue note for this cut:** the wordmark inversion at `6.56` is the film's brand payoff but sits on an ordinary beat, not a strong cue — the track's strong cues do not begin until `8.74`, which the 18s retime moves past. The inversion is carried by the geometry and the bell SFX instead of by a musical hit. This is the one real cost of tightening from 20.75s.
- Audio-reactive treatment: subtle. Let the orange pool's edge bloom and the standing arrow's presence breathe with RMS/bass. No waveform, no equaliser bars, no particles, no strobing.
- SFX posture: sparse — 6 cues in the whole film, all dry, none above `0.70`.
- Audio-coupled moments: the ink drop landing; the arrow locking; the wordmark lock/inversion; the feed card sliding in; the figure landing; the final condense.
- Restraint rule: no risers, no whooshes, no stingers on text, no sound on the tab-strip pour (it is one gesture, not five events). If a cue would make the film feel excited rather than assured, cut it.

## Storyboard

### Scene 1 — Ink drop — 2.19s (0.00 → 2.19)
Full-bleed navy `#0B1222`, empty. At **0.56s** a single point of orange `#FF6700` lands dead centre — a real drop: slight squash on contact, one ring of liquid displacement pushing out ahead of the mass. From `0.56` to `2.19` it spreads outward into a widening pool with an organic, uneven meniscus edge (surface tension, not a circle tween). No text, no other colour in frame. The pool is still spreading at the cut — it is not allowed to settle.
Sequential/interaction: none — this is one continuous liquid gesture.
Audio intent: the bed arrives with the drop. One soft, wet placement — weight, not splash.
Audio-coupled idea: drop landing at `0.56` → `interface/drop_001.ogg`, ~`0.60`.
Music: steady and clean, fading up from 0 over 0.6s.
Transition mood: none — the ink carries directly → Scene 2

### Scene 2 — The arrow — 2.20s (2.19 → 4.39)
Same pool, same shot. The spread arrests and the mass begins to pull **upward** against itself — the liquid climbs, the bottom edge drawing in as the top rises. By `~3.2s` it has narrowed into a column with a heavier head. From `3.2` to `3.82` the head resolves into the arrow: apex, triangle, then the shaft drawing down beneath it, edges hardening from liquid to vector. At **3.82s (beat-grid)** it locks — the brand's real arrow geometry, standing alone in orange on navy. Holds `0.57s`.
Sequential/interaction: none — one continuous morph, liquid to hard shape.
Audio intent: the moment the film declares a direction. One dry, medium body hit at the lock. Nothing triumphant yet.
Audio-coupled idea: arrow lock at `3.82` → `impact/impactSoft_medium_001.ogg`, ~`0.55`.
Transition mood: none — the arrow holds through the cut → Scene 3

### Scene 3 — The wordmark — 3.25s (4.39 → 7.64)
The arrow gives up scale from `4.39` to make room, and holds. At **5.34s (beat-grid)** orange liquid floods in from the left and right edges of frame, gathering into the **U** and the **P** around the standing arrow — same substance, arriving as letterforms. As the two masses close in and lock at **6.56s (beat-grid)**, the arrow **inverts**: its fill flips from orange to navy `#0B1222` in a single frame, and it is suddenly the negative space inside the finished UP wordmark. The full lockup settles and holds `1.08s`. Use `assets/brand/up-logo-dark.png` for the settled lockup so the final form is the actual logo file, not an approximation.
Sequential/interaction: yes — U and P pour in from opposite sides and meet; the inversion is the payoff frame.
Audio intent: the brand payoff. One deep bell allowed to ring into the hold — the only genuinely resonant sound in the film so far, and the thing carrying a moment the music does not.
Audio-coupled idea: lock + inversion at `6.56` → `impact/impactBell_heavy_000.ogg`, ~`0.70`.
Transition mood: the wordmark liquifies downward → Scene 4

### Scene 4 — The feed — 3.82s (7.64 → 11.46)
The lockup loses its edges and runs downward from **7.64**, and what it pours into is the product's own tab strip. Beginning at **8.19s (beat-grid)** the five real tabs arrive as one fast waterfall (~`0.12s` apart, settled by `~9.09`) and then **hold as a set** for the rest of the scene — they are read as a group during the hold, never chased one at a time:

> **For You** · Opportunities · Jobs · Events · Resources

"For You" is the active tab, carried in orange on the app's pill treatment; the other four sit in muted white. At **9.29s (beat-locked, strong cue 0.97)** a real feed card slides up beneath the strip on the app's card surface with its 2xl radius and hairline border:

> `OPPORTUNITY` · **3 days left** (urgent rail treatment, orange)
> **Fully Funded Scholarship — Tuition & Stipend**
> Tuition, housing and monthly stipend.

The provider name is deliberately omitted — the card renders without one when the listing has no organization, and no real organization appears anywhere in this film (see the honesty guard). At **10.37s (beat-grid)** the meta row resolves in one move: **94% match** in orange, then `· Lagos, Nigeria`. Card title holds `1.87s` (5 words, floor 1.5s); meta holds `0.79s` settled — two short chips read as a pair, not a sentence. The action row (heart, bookmark, share) is visible but idle.

**Copy tightened for the 18s cut:** the title lost "Housing &" and the body dropped from 14 words to 5, because a 3.82s scene cannot carry a 14-word description above the reading floor. The card anatomy is unchanged.
Sequential/interaction: yes — five tabs pour as one waterfall and hold; card slides in; meta row resolves as a single later beat.
Audio intent: the only warm moment. A card sliding into place. **No sound on the tab pour** — it is one gesture, not five events.
Audio-coupled idea: card entrance at `9.29` → `casino/card-slide-1.ogg`, ~`0.60`.
Transition mood: the card and strip dissolve back into ink → Scene 5

### Scene 5 — The number — 3.27s (11.46 → 14.73)
Navy, empty again — the same frame the film opened on. At **12.55s (beat-locked, strong cue 0.94)** **22,000+** ink-drips into place with the exact gesture of the opening drop: it lands, squashes, and the digits resolve out of the settling liquid rather than fading in. Large, Inter, orange. Settled by `~13.0` and holds `1.7s`. At **13.11s (beat-grid)** a smaller line settles beneath it in white at 55%: `10k+ active · 22k+ community`, holding `1.62s`.

No "we just launched" framing anywhere in this scene. The figure is distance travelled.
Sequential/interaction: yes — figure drips and resolves, then the subline settles.
Audio intent: the rhyme with the opening. The same family of sound as the first drop, slightly heavier — the drop became a community.
Audio-coupled idea: figure landing at `12.55` → `interface/drop_002.ogg`, ~`0.50`.
Transition mood: everything in frame is drawn inward → Scene 6

### Scene 6 — The credit — 3.29s (14.73 → 18.02)
At **14.73s (beat-grid)** the figure and subline are pulled inward and condense into the single orange arrow — the film's substance returning to its first shape. At **15.29s (beat-grid)** the arrow resolves into the full lockup (`assets/brand/up-logo-dark.png`). At **15.84s (beat-locked, strong cue 0.96)** the ask lands beneath it in white: **Get access. Get UP.** — holding `2.18s`, the longest settled hold in the film. At **16.38s (beat-grid)** two small lines settle together at the bottom: `glowupchannel.com` in orange, and beneath it `UP is a product by Outside Solutions` in muted white. They hold `1.64s` / `1.54s` on flat navy, then the frame empties to the same colour it opened on so the loop closes cleanly.
Sequential/interaction: yes — condense, lockup, CTA, then URL and credit together.
Audio intent: the close. One deep bell on the condense, ringing out before the music begins receding at `16.38` so the CTA and credit land on the fade.
Audio-coupled idea: condense at `14.73` → `impact/impactBell_heavy_003.ogg`, ~`0.65`.
Transition mood: hold, then empty → loop

**Music mood for this video:** cinematic — steady, clean, unhurried; present the whole way and deliberately receding at the end.
**Audio summary:** The bed arrives with the first drop and holds one level through the entire film; six dry cues mark only the moments the ink changes state — landing, locking, inverting, delivering the product, rhyming with itself, and condensing — and the last 1.6s deliberately empty out under the CTA and credit.
