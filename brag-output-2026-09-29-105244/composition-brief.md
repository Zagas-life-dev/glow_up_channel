# Hyperframes Composition Brief: UP — the user flow

## Objective
Create a ~41.6s vertical walkthrough of UP, from sign-up to "Submitted" in the Tracker, closing on the UP logo. One continuous phone take, rebuilt from the real UP Design v1 screens.

## Output
- Composition directory: `brag-output-2026-09-29-105244/composition/`
- Rendered video: `brag-output-2026-09-29-105244/brag.mp4`
- Format: vertical, 1080x1920
- Duration: 41.60s (user-approved override of the 15–25s brag default)

## Source Material
- Project root: `Glowup-diaries-main/`
- Primary files read: `app/signup/page.tsx`, `components/up/auth-shell.tsx`, `app/onboarding/page.tsx`, `components/onboarding/step-shell.tsx`, `components/onboarding/interests-step.tsx`, `app/home-client.tsx`, `components/feed-card.tsx`, `components/up/kind.tsx`, `components/add-to-playlist-modal.tsx`, `app/opportunities/[id]/page.tsx`, `components/content-detail/detail-hero.tsx`, `components/tracker/return-sheet.tsx`, `app/tracker/page.tsx`, `lib/tracker/types.ts`, `components/app-bottom-nav.tsx`, `app/globals.css`, `design_platform_up_v1/index.html`, `lib/seo/brand.ts`
- Product name: UP (never "Glowup Channel" as a name; `glowupchannel.com` is fine as a URL)
- Tagline: **Get access. Get UP.**
- Key UI to recreate: auth mobile header, sign-up form with live password rules, onboarding OptionGrid + lime payoff, feed with the UP feed card, playlist bottom sheet, listing detail hero, tracker return sheet, Tracker page, bottom nav
- Copy that must appear verbatim:
  - Get access. Get UP.
  - Create your account / Free for seekers. Takes about a minute.
  - At least 8 characters · One uppercase letter (A-Z) · One lowercase letter (a-z) · One number (0-9)
  - Create account
  - What are you here for? / Pick everything that applies. This is the strongest signal in your feed ranking.
  - categories selected. Your feed is built from these first.
  - Finish setup / Setting up your feed…
  - Hey, Ada / Picks to help you glow up.
  - For You · Opportunities · Jobs · Events · Resources
  - Add to playlist / Create new playlist / Start a new collection / YOUR PLAYLISTS / Added / Added to Scholarships 2027
  - Apply now
  - Welcome back. Did you get it in? / Submitted it — track this one / Started, not finished — remind me / Not for me — stop suggesting these
  - Tracker / Submitted / In, and still open. / Awaiting answer / Closed on their end. Waiting to hear back.
  - glowupchannel.com / UP is a product by Outsidee Solutions

## Creative Direction
- Tone preset: `app-store` with `default` warmth
- Creative direction: a guided tour in UP's own design language: one phone, real screens, taps you can hear, ending by going UP
- Interpretation: snappy entrances, readable holds, and a camera that pushes in on the three payoffs and eases out between them. No hype.
- Angle: see `brag-plan.md`. The flow ends with the Tracker tick becoming the logo's arrow.
- Hook: tiles drop in, the phone rises up through them, "From sign-up to submitted."
- Outro: the tick lifts and becomes the arrow, the U and P lock into the real logo, then "Get access. Get UP." with the URL and credit
- Avoid: generic SaaS language, abstract filler, gradient text, typed "UP" as a logo, any real organisation name, and lime used as text

## Visual Identity
- Stage: navy `#0B1233`; app surfaces cream `#FBFAF7` / white cards; hairline `#F0EDE6`; border `#D8D3C6`; fill `#F2EFE8`
- Orange `#FF6A00`; orange-ink on light `#B8551E`; orange tint `rgba(255,106,0,0.12)`
- Lime `#D6FF3F`; lime tint `rgba(214,255,63,0.35)`; card-stack navy tile `#1C2554`
- Muted text on light `#6B6F80` (approx. from the app's muted-foreground); on navy `rgba(251,250,247,0.65)`
- Display font: Unbounded (variable, `assets/fonts/unbounded.woff2`); body: Plus Jakarta Sans (variable, `assets/fonts/plus-jakarta-sans.woff2`)
- Logos: `assets/brand/up-logo-orange.png`, `up-logo-navy.png`, `up-mark-orange.png`, `up-mark-navy.png`

## Storyboard
Use `brag-plan.md` as the creative contract. Scene summary:
1. Hook — 0.00–3.18 — tiles drop, phone rises (1.60 strong), auth header, caption "From sign-up to submitted."
2. Sign up — 3.18–8.44 — typing, 4 rules tick orange, Create account
3. Onboarding — 8.44–14.22 — Step 4 of 8, three options, payoff 1→3, Finish setup
4. Feed — 14.22–19.49 — greeting, tabs, 3 cards, push-in on 94% match (16.86)
5. Like/Save — 19.49–22.65 — heart 128→129, bookmark 41→42
6. Playlist — 22.65–28.43 — sheet, Add → Added, toast
7. Apply → Tracker — 28.43–35.28 — detail, Apply now, 14 minutes later, return sheet, row lands
8. Get UP — 35.28–41.60 — tick → arrow → logo (37.92), CTA, URL + credit

## Audio
- Role: warm bed plus a consistent light layer of interface sounds
- Music: `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` at ~0.30, fading in over 0–1.2, dipping to ~0.24 across 3.2–14.2, fading to ~0.12 from 39.5 and out by 41.6
- Music cue guidance: preset `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`; strong locks at 1.60, 16.86, 37.92 (+ Added near 25.81); scene boundaries on the beat grid
- Audio-reactive: subtle; RMS/bass drives the orange glow behind the phone and the drift of the background tiles (`assets/audio-data.js`)
- SFX: taps `ui/click2`; ticks/selects `ui/rollover2`, `interface/select_008`; typing `keyboard/keypress-*`; cards/sheets `casino/card-slide-1`; away `casino/card-shove-2`; landings `interface/drop_00x`, `impact/impactSoft_medium_001/002`; Added `impact/impactGlass_light_002`; Submitted `impact/impactPlate_light_002`; logo `impact/impactBell_heavy_000` (the only bell)
