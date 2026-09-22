# Brag Plan: UP (Glow Up Channel)

## What is this app?
UP is a platform that connects young Africans (18–35+) to scholarships, grants, jobs, internships, events and free learning resources, and ranks every listing against the individual — their interests, location, language, and how close the deadline is. It has shared 7,500+ opportunities to 8,200+ users, and it works with Nile University, Wema Bank, World Trade Center Abuja, Zedcrest and the Lagos State Ministry of Science and Technology.

## The angle
Shoot it as a 2016-era Series A announcement film — the off-white slide, the centered Helvetica-ish sentence, the hard cuts, the warm corporate bed — and then never announce a round. The video says "Today, we're announcing our Series A," redacts the amount with a black bar, and pivots with "The numbers we can disclose." Every number after that is a real product number: 8,200+ users, 7,500+ opportunities, 700+ upskilled, then the actual feed ranking a listing and the actual tracker asking "Did you get it in?"

The joke is the genre, not the product. The funding slide is the costume; the product is the payload. It lands because the 2016 launch film spent 90 seconds telling you nothing and this one spends 23 seconds showing the working app — and because the last frame admits it: *No round was raised in the making of this video.*

**Honesty guard:** no investor is named, no amount is shown (it's redacted, which is the joke), and the closing footnote states plainly that nothing was raised. The five partner organizations are real, so they do not appear as backers and are not shown at all — attributing a funding round to a real company would be a false claim about a third party, and it isn't needed for the bit.

## Hook (first 2-3 seconds)
Paper-white frame. Dead center, one sentence fades up in Inter: **"Today, we're announcing our Series A."** Under it, in small letterspaced mono: `LAGOS · SEPTEMBER 2016`. Nothing else moves. It reads completely straight — that straightness is the hook, because the viewer is now waiting for a number that never comes.

## Key moments (the middle)
- **The redaction.** `$ 12,000,000` sets in mono, then a hard black bar slams across it left-to-right and the caption under it settles: "Amount undisclosed."
- **The pivot to real numbers.** Eyebrow line "The numbers we can disclose." holds while three tiles land one by one, each figure counting up: 8,200+ Platform users · 7,500+ Opportunities shared · 700+ Young Africans upskilled.
- **The feed doing its job.** The real signed-in feed: "Hey, Amara" / "Picks to help you glow up." A real feed card slides in — `OPPORTUNITY · 3 days left`, the title, then the meta row resolves to **94% match · Lagos, Nigeria**. This is the product's actual claim made visible: it didn't list the thing, it ranked it.
- **The tracker asking the honest question.** The return sheet rises over the dimmed feed: **"Welcome back. Did you get it in?"** with the two real answers — "Submitted it — track this one" and "Not for me — stop suggesting these." A cursor taps the first.

## Outro / punchline
The orange chevron mark draws in on ink-blue. **"Get access. Get UP."** with `glowupchannel.com` beneath it. Then, small and dry at the bottom of the frame, the 2016 blog-footer line: *No round was raised in the making of this video.* Hold. Cut.

## User flow worth showing
Real flow, three beats, taken from `app/home-client.tsx`, `components/feed-card.tsx`, `lib/ranking/weights.ts` and `components/tracker/return-sheet.tsx`:
1. **Entry** — signed-in feed opens: "Hey, Amara" / "Picks to help you glow up."
2. **Key action** — a ranked listing card arrives with its match score and location, i.e. the ranker's output, not a list.
3. **Result** — the user comes back and the tracker's return sheet asks "Did you get it in?", and the answer feeds the ranking.

Scenes 4 and 5 are the centerpiece. The stat tiles (scene 3) are the one landing-page-style frame, used as the setup for the bit, not as a substitute for the app.

## Tone
- Preset: `yc-parody`
- Creative direction: **fake Series A launch from 2016** (user-specified)
- Interpretation: Played entirely straight — no winking, no exclamation marks, no motion for its own sake. Sentence case, Inter at medium weight for the statements, mono for anything numeric (2016's tell). Hard cuts, near-zero crossfade. Generous paper-white space on the announcement slides, then a clean flip to the app's real ink-blue surface when the product shows up — the costume comes off and the product is what's underneath.

## Format: landscape — 1920x1080
## Duration: 24.75 seconds (as rendered)

## Visual identity (from the project)
- Background (announcement slides): `#FDF5ED` — `--paper`, `components/landing/landing-page.tsx` BRAND_VARS
- Background (product scenes): `#0B1222` — `--ink`, the logo blue; app dark surface `#121A2B` for cards
- Accent: `#FE6700` — `--orange` (landing) / `#FF6700` (app `--primary`)
- Text: `#0B1222` on paper; `#F2F4F8` on ink (app `--foreground` 222 25% 95%)
- Display font: Inter (`--font-up-display`, `app/layout.tsx`)
- Body font: Bricolage Grotesque (`--font-up-body`) — fall back to Inter if unavailable
- Mono: any Courier/IBM Plex Mono-adjacent stack, for the dateline, the redacted amount, and the stat figures
- Strongest visual element: the logo mark — a nested orange chevron that is literally an upward arrow (`public/images/logo-icon-transparent.svg`), which is the whole brand argument in one glyph

## Share copy (draft)
We're announcing our Series A. We can't disclose the amount, because there isn't one — so here are the numbers we can: 8,200 users, 7,500 opportunities, and a feed that actually ranks them. Get access. Get UP.

## Audio direction
- Role: Warm corporate bed with sparse, dry accents — the sound of a 2016 announcement video that cost $4,000.
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` ("warm and business-y", 114.84 BPM) at 0.28–0.32, the restrained end of the normal band.
- Music treatment: In from 0.0 with a short fade-up. No ducking. Fade to ~0.12 under the final footnote line so the last thing the viewer hears is the joke landing in near-silence, then out.
- Music cue guidance: bundled preset read — `assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`. Strong-cue locks used: **5.80s** (redaction bar slams) and **12.65s** (feed card arrives). Beat-grid entrances: **16.86s** (return sheet rises), **21.07s** (logo lands). Beat-grid windows for sequential reveals: stat tiles at **7.91 / 8.96 / 10.01** (every other beat, ~1.05s apart — the raw 0.52s grid outruns reading); reason chips at **13.70 / 14.76**.
- Audio-reactive treatment: subtle. Let the orange chevron's glow and the product card's presence breathe with RMS/bass. No waveform, no equalizer bars, no particles.
- SFX posture: sparse — 4 to 6 cues in the whole film, all dry, none above 0.7. This is a corporate film, not a hype reel.
- Audio-coupled moments: the redaction bar slam (one flat impact); each stat tile landing (light, identical, placed); the feed card sliding in (card slide); the cursor tap on "Submitted it" (one mouse click); the logo landing (one soft bell, allowed to ring past the music fade).
- Restraint rule: No swells, no risers, no whooshes, no stingers on text. If a cue would make the video feel excited, cut it — the film must never appear to be in on its own joke.

## Storyboard

### Scene 1 — The announcement — 3.70s
Paper `#FDF5ED`, full bleed. Centered: "Today, we're announcing our Series A." in Inter medium, large, ink. Fades up over ~0.5s and sits. Below it, small mono, letterspaced: `LAGOS · SEPTEMBER 2016`, arriving ~0.4s later. Nothing else in frame. 7-word line → ~2.4s settled; it gets ~2.8s.
Sequential/interaction: none — stillness is the point.
Audio intent: music establishes, warm and unremarkable. Confidence with nothing behind it.
Audio-coupled idea: none.
Music: warm corporate bed, fading up from 0.
Transition mood: hard cut → Scene 2

### Scene 2 — The redaction — 3.68s
Same paper. Centered mono, large: `$ 12,000,000`, settled by 4.1s and held long enough to actually read. At **5.80s (beat-locked strong cue)** a solid ink bar wipes across it left-to-right in 0.24s and stops, fully covering the figure. Caption settles beneath in small Inter: "Amount undisclosed.", and holds to the cut. The pivot line is not read twice — it is scene 3's eyebrow.
Sequential/interaction: yes — the bar wipes across the amount as a single deliberate gesture.
Audio intent: one flat, dry impact on the bar. No comedy sound. The bar is a fact.
Audio-coupled idea: bar slam → one soft/medium impact, ~0.65.
Transition mood: hard cut → Scene 3

### Scene 3 — The numbers we can disclose — 4.22s
Paper. Eyebrow at top in small mono caps: `THE NUMBERS WE CAN DISCLOSE` — present from 0.1s, holds the whole scene. Three tiles land one by one across the frame (**beat-grid: 7.91 / 8.96 / 10.01**), each figure counting up over ~0.5s as it arrives, each label settling under it:
- **8,200+** Platform users
- **7,500+** Opportunities shared
- **700+** Young Africans upskilled

All three hold together until the cut — the last tile gets ~1.6s settled.
Sequential/interaction: yes — three tiles, one by one, with count-up figures.
Audio intent: identical light placement cue per tile — a thing being set down on a table, three times. Rhythm, not excitement.
Audio-coupled idea: card-place or chip-lay per tile at the tile's own start time.
Transition mood: hard cut → Scene 4 (paper → ink; the costume comes off)

### Scene 4 — The feed, working — 4.74s
Ink `#0B1222`. The real feed column, centered, app-accurate: greeting "Hey, Amara" in semibold with "Picks to help you glow up." beneath in muted grey. At **12.65s (beat-locked strong cue)** a real feed card slides up into place on the app's `#121A2B` card surface with its 2xl radius and hairline border:

> `OPPORTUNITY` · **3 days left** (in the urgent red rail treatment)
> **Undergraduate Scholarship — Full Tuition + Monthly Stipend**
> Covers tuition, accommodation and a monthly stipend for African students entering undergraduate study.
> ▸ meta row

The provider name is deliberately omitted (the card renders without one when the listing has no organization). No real organization's name appears anywhere in this film — see the honesty guard in The angle.

Then the meta row resolves (**beat-grid: 13.70 / 14.76**): **94% match** in orange, then `· Lagos, Nigeria`. The action row (heart, bookmark, share) is visible but idle.
Sequential/interaction: yes — card slides in, then the match score and location resolve into the meta row one after the other.
Audio intent: the film's only moment of warmth. A card sliding into place, then two very light ticks as the meta resolves.
Audio-coupled idea: `casino/card-slide-*` on the card entrance; optional single light tick on the 94% match.
Transition mood: hard cut → Scene 5

### Scene 5 — Did you get it in? — 4.20s
Same feed, now dimmed behind a scrim. The tracker return sheet rises from the bottom (**beat-locked ~16.86–17.39s**), rounded top corners, ink card surface. Heading: **"Welcome back. Did you get it in?"** with the listing title small above it. Two real buttons settle in (**beat-grid: 18.44 / 19.49**):
- "Submitted it — track this one" (primary, orange)
- "Not for me — stop suggesting these" (quiet, outlined)

At ~20.0s a cursor moves in and taps the primary; it depresses and flashes its pressed state. Cut before any result — the tap is the last thing the product does.
Sequential/interaction: yes — sheet rises, two buttons arrive in sequence, simulated cursor tap on the first.
Audio intent: a soft rise for the sheet, then one clean mouse click. The click is the most satisfying sound in the film and it's the quietest.
Audio-coupled idea: sheet rise → soft drop/whoosh-free placement; tap → `ui/mouseclick1` at the exact frame of contact.
Transition mood: hard cut → Scene 6

### Scene 6 — Get access. Get UP. — 4.21s
Ink, full bleed. The orange chevron mark lands center at **21.07s (beat-locked strong cue)** — scaling in from 0.94 with a subtle glow that breathes on the bass. Wordmark line beneath at 21.55s: **"Get access. Get UP."** in Inter semibold, then `glowupchannel.com` at 21.80s in small mono muted grey. At 22.05s, bottom of frame, small and grey: *No round was raised in the making of this video.* It holds 2.7s — the scene was lengthened from the first pass specifically so the punchline clears its reading floor. Music has already dropped to 0.13 so the footnote sits in near-silence.
Sequential/interaction: yes — mark, then wordmark, then footnote, in that order.
Audio intent: one soft bell on the mark landing, allowed to ring out past the music fade. Then nothing.
Audio-coupled idea: `impact/impactBell_heavy_000` at the mark's landing frame, ~0.6.
Transition mood: hold, then cut to black.

**Music mood for this video:** parody — warm, business-y, deliberately unremarkable corporate bed that never earns its own optimism.
**Audio summary:** A 2016 announcement bed establishes over a paper-white slide, takes one flat hit on the redaction, ticks along with three placed stat tiles, warms briefly for the product itself, lands a single quiet click on the tap, then rings one bell on the logo and gets out of the way so the last line can be read in silence.

## Timing ledger
| # | Scene | Start | End | Length |
|---|---|---|---|---|
| 1 | The announcement | 0.00 | 3.70 | 3.70 |
| 2 | The redaction | 3.70 | 7.38 | 3.68 |
| 3 | The numbers we can disclose | 7.38 | 11.60 | 4.22 |
| 4 | The feed, working | 11.60 | 16.34 | 4.74 |
| 5 | Did you get it in? | 16.34 | 20.54 | 4.20 |
| 6 | Get access. Get UP. | 20.54 | 24.75 | 4.21 |
| | **Total** | | | **24.75s** |

## Built vs. planned
Three things moved during the build, all of them recorded above:

- **The redaction slams at 5.80s, not 3.70s.** The first render put the bar over the amount 0.07s after it appeared, so `$ 12,000,000` was never readable and the joke had nothing to take away. The amount now holds ~1.7s and the bar lands on the next strong cue.
- **Scene 6 runs 4.21s, not 3.16s.** The closing footnote is a ten-word line and the shorter scene starved it. Total runtime is 24.75s, still inside the 15-25s law.
- **Scene 2's caption no longer swaps to the pivot line.** Scene 3's eyebrow already carries "The numbers we can disclose", and reading it twice in four seconds was the thing the plan was trying to avoid.
