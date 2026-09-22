# Hyperframes Composition Brief: UP (Glow Up Channel)

## Objective
Create a short launch-style brag video for UP, shot as a 2016-era Series A announcement film that never announces a round and spends its back half showing the working product instead.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 23.70 seconds

## Source Material
- Project root: `C:\Users\kachi\OneDrive\Documents\Company grade code\Glowup-diaries-main`
- Primary files read: `components/landing/landing-page.tsx` (brand vars, stats, copy), `app/home-client.tsx` (signed-in feed), `components/feed-card.tsx` (card anatomy), `components/tracker/return-sheet.tsx` (return sheet copy), `lib/ranking/weights.ts` (ranking signals), `app/globals.css` (tokens), `app/layout.tsx` (fonts), `public/images/logo-icon-transparent.svg` (mark)
- Product name: **UP** (formerly Glow Up Channel), a product of Outside Solutions Ltd.
- Tagline / strongest claim: **"Get access. Get UP."**
- Key UI or visual moments to recreate:
  1. The signed-in feed header + one ranked feed card (`components/feed-card.tsx` anatomy: type badge · urgency label, title, description, meta row with `94% match` in orange and location)
  2. The tracker return sheet (`components/tracker/return-sheet.tsx`) rising over the dimmed feed
  3. The logo mark — nested orange chevron, `public/images/logo-icon-transparent.svg` (copy it into the composition assets)
- Copy that must appear verbatim:
  - "Today, we're announcing our Series A."
  - "Amount undisclosed."
  - "The numbers we can disclose."
  - "8,200+" / "Platform users"
  - "7,500+" / "Opportunities shared"
  - "700+" / "Young Africans upskilled"
  - "Hey, Amara"
  - "Picks to help you glow up."
  - "94% match"
  - "Welcome back. Did you get it in?"
  - "Submitted it — track this one"
  - "Not for me — stop suggesting these"
  - "Get access. Get UP."
  - "glowupchannel.com"
  - "No round was raised in the making of this video."

## Creative Direction
- Tone preset: `yc-parody`
- Creative direction: **fake Series A launch from 2016** (user-specified)
- Interpretation: Played entirely straight. No winking, no exclamation marks, no motion for its own sake. Sentence case Inter at medium weight for statements; a mono stack for anything numeric (the dateline, the redacted amount, the stat figures, the URL) — mono-for-numbers is the period tell. Hard cuts between every scene, no crossfades over 0.15s. Generous paper-white space for the announcement slides, then a clean flip to the app's ink-blue surface when the product appears: the costume comes off and the product is what's underneath.
- Angle: Shoot the genre faithfully — off-white slide, centered sentence, warm corporate bed — then redact the amount and pivot to real product numbers. The funding slide is the costume; the product is the payload. The final footnote admits the whole thing.
- Hook: Paper-white frame, one centered sentence — "Today, we're announcing our Series A." — with a small mono dateline `LAGOS · SEPTEMBER 2016` beneath. Complete stillness. The viewer is now waiting for a number that never comes.
- Outro / punchline: Orange chevron mark on ink, "Get access. Get UP.", `glowupchannel.com`, then small and dry at the bottom of frame: *No round was raised in the making of this video.*
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals, particles, gradients, glass morphism
  - Any named third-party organization, investor, or funding amount presented as real — the amount is redacted and the footnote states nothing was raised. This is a hard constraint, not a style note.
  - Unrelated visual redesign of the product UI — the feed card and return sheet must match the real components

## Visual Identity
- Background (announcement scenes 1–3): `#FDF5ED` (`--paper`)
- Background (product scenes 4–6): `#0B1222` (`--ink`, the logo blue); card surface `#121A2B`; border `rgba(255,255,255,0.10)`
- Text: `#0B1222` on paper; `#F2F4F8` primary on ink; `#8B93A7` muted on ink
- Accent: `#FE6700` (landing) / `#FF6700` (app primary) — use `#FE6700`
- Urgency red (the "3 days left" rail + label): `#EF4444` at 40% for the rail
- Display font: Inter (400/500/600) — load locally or from Google Fonts
- Body font: Bricolage Grotesque, falling back to Inter if unavailable
- Mono: Courier-adjacent / IBM Plex Mono stack for numerals and the dateline
- Visual references from the project:
  - Feed card: `rounded-2xl`, hairline border, `#121A2B` fill, type badge in uppercase micro-caps, deadline label on the right, title 15–16px semibold, 2-line muted description, meta row separated by `·`, action row (heart / bookmark / share) above a hairline top border
  - Return sheet: bottom sheet with rounded top corners, dimming scrim over the feed, question as heading, primary orange button then quiet outlined button
  - Logo mark: nested orange chevron (an upward arrow), the brand argument in one glyph

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract. It carries the per-scene audio intent, the sequential-reveal commitments, and the reading-time floors.

Scene summary:
1. **The announcement** — 3.70s (0.00–3.70) — "Today, we're announcing our Series A." + `LAGOS · SEPTEMBER 2016`. Stillness.
2. **The redaction** — 3.68s (3.70–7.38) — `$ 12,000,000` in mono; an ink bar wipes across it left-to-right and stops; "Amount undisclosed." settles beneath, then swaps to "The numbers we can disclose."
3. **The numbers we can disclose** — 4.22s (7.38–11.60) — mono eyebrow holds; three tiles land one by one with count-up figures: 8,200+ Platform users / 7,500+ Opportunities shared / 700+ Young Africans upskilled. All three hold to the cut.
4. **The feed, working** — 4.74s (11.60–16.34) — ink; "Hey, Amara" / "Picks to help you glow up."; a real feed card slides in (`OPPORTUNITY` · **3 days left**, "Undergraduate Scholarship — Full Tuition + Monthly Stipend", 2-line description); then the meta row resolves: **94% match** then `· Lagos, Nigeria`. No provider name on the card.
5. **Did you get it in?** — 4.20s (16.34–20.54) — feed dims behind a scrim; the return sheet rises; "Welcome back. Did you get it in?"; two buttons arrive in sequence; a cursor taps the primary and it shows its pressed state. Cut before any result.
6. **Get access. Get UP.** — 3.16s (20.54–23.70) — chevron mark lands and breathes on the bass; "Get access. Get UP."; `glowupchannel.com`; then the small grey footnote *No round was raised in the making of this video.* Hold, cut to black.

## Audio
- Audio role: Warm corporate bed with sparse, dry accents — a 2016 announcement video that cost $4,000.
- Audio arc: Bed establishes under the still opening slide → one flat hit on the redaction → three identical placement cues as the stat tiles land → a brief warmth as the product appears → one quiet click on the cursor tap → one soft bell on the logo, ringing out past a music fade so the closing footnote reads in near-silence.
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` (114.84 BPM, "warm and business-y")
- Music treatment: volume 0.28–0.32, short fade-up from 0.0, no ducking, fade to ~0.12 from ~22.4s so the footnote lands quiet, out by 23.70s.
- Music cue guidance: bundled preset at `brag-output/composition/assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json` (copied in). Strong-cue locks to target (±0.15s): **3.70s** redaction bar slam, **12.65s** feed card arrival, **17.39s** return sheet rise, **21.07s** logo landing — use 2–3 of these, not all four, if more hurts pacing. Beat-grid snaps (±0.10s): stat tiles at **7.91 / 8.96 / 10.01** (every other beat — the raw 0.52s grid outruns reading), meta-row resolves at **13.70 / 14.76**, return-sheet buttons at **18.44 / 19.49**.
- Audio-reactive treatment: subtle — use music RMS/bass so the chevron's glow and the feed card's presence breathe. No waveform, equalizer bars, musical notes, particles, or strobing.
- Audio-coupled moments:
  - Scene 2, redaction bar slam — one flat dry impact at the bar's first frame
  - Scene 3, each stat tile — identical light placement cue at each tile's own start time (three total)
  - Scene 4, feed card entrance — card slide; optional very light tick when `94% match` resolves
  - Scene 5, cursor tap on "Submitted it" — one clean mouse click at the frame of contact
  - Scene 6, mark landing — one soft bell, allowed to ring past the music fade
- SFX selection guidance: 4–6 cues total, all dry, none above 0.70. Match the gesture: card-like entrances get card sounds, the tap gets a mouse click, the logo gets a single bell. Nothing on text.
- SFX analysis guidance: `C:\Users\kachi\.claude\plugins\cache\brag\brag\0.2.2\skills\brag\assets\sfx\sfx-analysis.md` — prefer low high-frequency-risk files; the stat tiles repeat, so that cue in particular must be a low-risk one.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density and volume once the animation exists.
- Audio files: music and cue preset already copied into `brag-output/composition/assets/music/`; copy any selected SFX into `brag-output/composition/assets/sfx/<family>/`.
- Restraint rule: no swells, risers, whooshes, or stingers on text. If a cue makes the video feel excited, cut it — the film must never appear to be in on its own joke.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (scenes 4 and 5 are the centerpiece — feed card and return sheet, matching the real components).
- Keep all text readable in the final render. Reading floors: short label ~0.8s settled, full sentence ~0.3s per word with a ~1.2s minimum. The hook line gets the most.
- Keep the video within 15–25 seconds (target 23.70s).
- Include the planned music/SFX layer.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints; ignore any cue that hurts readability, pacing, or the product story.
- Lock 2–3 major reveals to strong cues within ±0.15s and mark them `// beat-locked`. Snap sequential events to consecutive beats within ±0.10s and mark them `// beat-grid`.
- Use SFX to support motion and interaction; restraint over density.
- Honor the music fade under the closing footnote and let the final bell ring over it.
- Wire at least one visual element to extracted per-frame audio data (subtle; glow and card presence). If extraction is unavailable, note it and skip — do not block the render.
- Use local assets for audio, fonts, and the logo mark. No absolute paths in the composition.
- Run `hyperframes check` before render — it is brag's single gate.

## Environment notes
- FFmpeg/FFprobe are **not** installed system-wide on this machine. Portable binaries are staged at `C:\Users\kachi\AppData\Local\Temp\claude\c--Users-kachi-OneDrive-Documents-Company-grade-code-Glowup-diaries-main\4edfe1c0-f56a-4747-b1a3-2fdfa802dd87\scratchpad\ffbin\bin`. Prefix that directory onto `PATH` (POSIX form under Git Bash: `/c/Users/kachi/AppData/.../ffbin/bin`) for any command that renders, probes media, or extracts audio.
- Chrome is available at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
