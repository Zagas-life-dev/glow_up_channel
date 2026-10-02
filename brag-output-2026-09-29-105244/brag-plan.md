# Brag Plan: UP — the user flow

## What is this app?
UP puts scholarships, jobs, events and free resources for young Africans in one feed, ranked against each person. It then follows them past the Apply button: when they come back, it asks how the application went. It is a product by Outsidee Solutions Ltd.

## The angle
**One phone, one continuous take, from sign-up to "Submitted".**

The earlier brag films (2026-09-20, 2026-09-21) sold the brand: ink, arrow, lockup. This one sells the product by *using* it. A single phone sits on a navy stage and never cuts away. Every screen is rebuilt from the real UP Design v1 components with the real copy, and every step is a tap you can see and hear. Screens change the way the app changes them: pages push, and the playlist and "Did you get it in?" prompts rise as bottom sheets. A viewer who watches this knows how to use UP.

The flow's own ending is the brand payoff. The last thing a user does is answer "Submitted it — track this one", and the Tracker lights up. Its tick lifts out of the phone, becomes the arrow from the logo, and the U and P lock around it. The product flow ends by going *up*.

**Brand language: UP Design v1** (`design_platform_up_v1/index.html`, tokens in `app/globals.css`). Navy `#0B1233`, orange `#FF6A00`, cream `#FBFAF7`. Lime `#D6FF3F` appears only where the app itself uses it: the event chip, the "Added" pill, the card-stack tile and the onboarding payoff box. Fonts are Unbounded (display) and Plus Jakarta Sans (body). Orange words in headlines are solid orange, never gradient text. The card-stack motif (rotated navy, orange and lime tiles from `components/up/auth-shell.tsx`) is the scene transition. The logo is always the real file, never typed.

**Honesty guard:** every listing, playlist and person is invented. No real organisation is named, and cards render without a provider, as they do in the app when a listing has none. The Apply button reads "Apply now" (the app's own fallback label) rather than a made-up domain. Nothing claims a number the product doesn't show.

**Duration override:** the brag rule is 15–25s. The user explicitly chose a ~40s walkthrough so that each of the six flow beats gets its real interaction and a readable caption.

## Hook (first 2-3 seconds)
Navy stage. Three card-stack tiles (navy `#1C2554`, orange, lime) drop in at their auth-shell angles. At **1.60s (strong cue)** the phone rises *up* through them into place. Its first screen is the real mobile sign-up header: the orange logo tile and **Get access. Get UP.** At the same moment the caption lands above the phone: **From sign-up to *submitted*.** The hook is a promise of a journey with a visible finish line, and the upward entrance states the brand before any word does.

## Key moments (the middle)
- **Password rules ticking orange** one by one as the password types, then Create account.
- **Onboarding options filling navy with orange ticks**, and the lime payoff box reading "3 categories selected. Your feed is built from these first."
- **The feed arriving ranked**: "Hey, Ada", cards cascading in, and the camera punching in on **94% match**.
- **The heart popping and the bookmark filling** on the same card.
- **The playlist sheet**: Add turns into the lime **✓ Added** pill, then the toast "Added to Scholarships 2027".
- **Apply → away → back**: "14 minutes later", then **"Welcome back. Did you get it in?"**, then "Submitted it — track this one", then the row lands in the Tracker.

## Outro / punchline
The camera punches in on the bottom-nav **Tracker** icon: an orange check-circle on its navy active pill. The tick lifts free and turns into the arrow from the logo, while the phone drops away downward (the only thing in the film that moves *down*). The arrow rises to centre, the U and P lock around it, and the frame resolves to the real logo. **Get access. Get UP.** lands beneath it, then `glowupchannel.com` and `UP is a product by Outsidee Solutions`.

## User flow worth showing
Taken from the code, in order:
1. **Sign up**: `app/signup/page.tsx` in `components/up/auth-shell.tsx` (mobile navy header, "Create your account", live password checklist).
2. **Onboarding**: `app/onboarding/page.tsx` + `components/onboarding/step-shell.tsx` (8-segment bar, "Step N of 8", OptionGrid, lime StepPayoff, "Finish setup" → "Setting up your feed…").
3. **Feed**: `app/home-client.tsx` (greeting "Hey, {firstName}" / "Picks to help you glow up.", five tabs) + `components/feed-card.tsx` (kind chip, deadline pill, meta row with "% match", action row Like/Save/Add to playlist/Share).
4. **Interact**: feed-card Like and Save.
5. **Playlist**: `components/add-to-playlist-modal.tsx` (phone bottom sheet, "Add to playlist", "Create new playlist", "YOUR PLAYLISTS" rows, Add → lime "Added", toast "Added to {name}" with Undo).
6. **Apply → Tracker**: `app/opportunities/[id]/page.tsx` + `components/content-detail/detail-hero.tsx` (navy hero with card-stack tiles, 3 stat tiles, closing tile solid orange when ≤3 days, full-width orange Apply) → `components/tracker/return-sheet.tsx` ("Welcome back. Did you get it in?") → `app/tracker/page.tsx` (buckets).

## Tone
- Preset: `app-store` (feature-clean pacing, one idea per scene), with `default` warmth
- Creative direction: **a guided tour in UP's own design language: one phone, real screens, taps you can hear, ending by going UP**
- Interpretation: Clean, confident and friendly, with no hype words and no exclamation marks. Motion is snappy (0.3–0.5s entrances) and each state holds long enough to read. The camera does the directing with gentle push-ins on the payoffs and eases back out between them. Captions are short verb lines in sentence case. Nothing in the film is decorative; every motion is either the app behaving or the camera pointing at it.

## Format: vertical — 1080x1920
## Duration: 41.60 seconds (user-approved ~40s walkthrough)

## Visual identity (from the project)
- Stage background: navy `#0B1233` (`--up-navy`)
- App surfaces inside the phone: page cream `#FBFAF7`, cards white, hairlines `#F0EDE6`, borders `#D8D3C6` (light mode; dark mode is still under review)
- Accent: orange `#FF6A00` (`--up-orange`); orange text on light surfaces uses `--up-orange-ink` `#B8551E`, exactly as the app does
- Lime `#D6FF3F` / lime tint `rgba(214,255,63,0.35)`: event chip, "Added" pill, payoff box, card-stack tile only
- Text: navy `#0B1233` on light; cream `#FBFAF7` on navy; muted cream `rgba(251,250,247,0.65)`
- Radii: cards `20px` (`rounded-up-xl`), rows/options `18px` (`rounded-up-lg`), buttons full pill
- Display font: **Unbounded** (700); body font: **Plus Jakarta Sans** (500/600/700/800), per `app/layout.tsx` `--font-up-display` / `--font-up-body`
- Strongest visual element: the card-stack motif (three rotated tiles: `#1C2554` at −8°, orange at +5°, lime at −4°, radius 22px) and the navy active pill in the bottom nav
- Logo assets (recoloured to #FF6A00 / #0B1233): `public/images/brand/up-logo-navy.png` (orange mark on navy, 1563²), `up-mark-orange.png` / `up-mark-navy.png` (mark alone, transparent, 1199×701), `up-logo-orange.png` (navy mark on orange tile). **Never a typed "UP" as a logo.**
- Arrow geometry for the tick → arrow morph (traced from the logo on 2026-09-21): viewBox `0 0 486 1000`, path `M243,0 L486,375 L328,375 L328,1000 L158,1000 L158,375 L0,375 Z`

## Share copy (draft)
Sign up, tell it what you're after, and UP ranks every scholarship, job and event against you. Save the good ones to a playlist, tap Apply, and it asks how it went when you get back. Get access. Get UP.

## Audio direction
- Role: warm bed plus a consistent light layer of interface sounds. Every visible tap gets a sound, and each payoff gets a slightly bigger one.
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` ("warm and business-y", 114.84 BPM, 1:28), a different track from the last two films, which both used vol-12.
- Music treatment: fade up over 0.0→1.2s so the tiles drop into arriving sound. Hold ~0.30, dip gently to ~0.24 during the tap-dense scenes (sign-up, onboarding) so taps stay crisp, return to 0.30. Fade to ~0.12 from 39.49 under the URL and credit, out by 41.60.
- Music cue guidance: bundled preset read (`<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`). Beat ≈ 0.522s, bar ≈ 2.09s. The track has strong cues spread evenly through 0–40s, which suits a long walkthrough. **Strong-cue locks (4, one more than usual, justified by the 41s length):** `1.60` phone lands (1.00), `16.86` punch-in on 94% match (0.99), `25.81` "Added" pill (≈ beat; nearest strong `26.33`), `37.92` logo locks (1.00). **Scene boundaries on the beat grid:** 3.18, 8.44, 14.22, 19.49, 22.65, 28.43, 35.28.
- Audio-reactive treatment: subtle. A soft orange glow behind the phone and the drift of the background card-stack tiles breathe with RMS/bass. The phone UI and all text never react. No waveform, bars or particles.
- SFX posture: moderate and consistent. One family for taps (soft clean clicks), one for sheets and cards (card slides and places), one for successes (glass or bell). All at 0.5–0.75, typing lower (~0.35). Repeated taps use low-HF-risk files per `sfx-analysis.md`.
- Audio-coupled moments: typed name and email (key ticks, thinned); four password rules ticking; option taps; cards cascading; heart pop; bookmark; sheet rise; Added; Apply; the "away" swoosh; the return sheet; row landing; tick lift; logo lock.
- Restraint rule: no risers, no whoosh on every transition (only on the Apply → away beat), and no sound on caption changes. The logo lock is the only bell in the film.

## Storyboard

Layout for the whole film: navy stage; a caption rail across the top (~y 140–420, Unbounded 64–72px, cream with one orange word); the phone centred below it, rendering the app at ~2× a 390px-wide phone, its lower edge allowed to bleed off the bottom of the frame when the camera pushes in. The phone is a plain rounded device (navy frame, thin hairline, no manufacturer bezel).

### Scene 1 — Hook — 3.18s (0.00 → 3.18)
Navy, empty. Three card-stack tiles drop in at their auth-shell angles, staggered. At **1.60s (strong cue)** the phone rises up from below the frame through the tiles and settles centre-frame, and the tiles tuck behind it as background. The phone shows the mobile sign-up header: navy panel with rounded bottom, orange logo tile (real `up-logo-orange` art), headline **Get access. Get *UP*.** Caption above: **From sign-up to *submitted*.** It lands with the phone and holds ~1.5s.
Sequential/interaction: yes. Tiles drop one by one, then the phone rises.
Audio intent: arrival. The bed is fading in; one soft landing as the phone settles.
Audio-coupled idea: tiles = light card-place (first one only); phone settle = soft drop.
Music: warm, fading in.
Transition mood: none. The phone stays; the screen content scrolls to the form → Scene 2

### Scene 2 — Sign up — 5.26s (3.18 → 8.44)
The screen shows the form under the header: **Create your account** / "Free for seekers. Takes about a minute." Orange tap ripples. First name types **Ada**, last name **Okafor**, email **ada@example.com**, date of birth fills in one step. Password types as dots, and beneath it the four real rules tick from grey ✕ to orange ✓ one at a time on consecutive beats (`At least 8 characters`, `One uppercase letter (A-Z)`, `One lowercase letter (a-z)`, `One number (0-9)`). The rules stay on screen together once all four pass. **Create account** (full-width orange pill) goes from disabled to live; tap at ~7.38 with a press-scale, and its label swaps to "Creating your account…".
Caption: **Free for seekers. Takes about a *minute*.** (7 words, holds ≥2.1s)
Sequential/interaction: yes. Typing, four rule ticks on the beat grid (non-reading accents, and the list holds), then the button tap.
Audio intent: light and quick; the typing is a texture, not a feature.
Audio-coupled idea: key ticks on the name only (thinned); one soft tick per rule; a clean click on Create account.
Transition mood: clean push to the next screen → Scene 3

### Scene 3 — Onboarding — 5.78s (8.44 → 14.22)
The onboarding screen pushes in. The 8-segment progress bar (5px, orange fill / `#F2EFE8` empty) fast-forwards from 1 to 4 as the eyebrow counts **Step 1 of 8 → Step 4 of 8**. This is a time-lapse; the earlier questions are not shown. It lands on **What are you here for?** / "Pick everything that applies. This is the strongest signal in your feed ranking." The OptionGrid shows real options. Three taps on the beat grid, each filling the row navy with an orange tick circle: **Scholarships & Grants**, **Jobs & Career Opportunities**, **Remote Work & Digital Skills**. The lime payoff box counts up **1 → 2 → 3** and reads "categories selected. Your feed is built from these first." The bar then fills to 8/8, the button reads **Finish setup**, and a tap turns it to "Setting up your feed…" with a spinner.
Caption: **Every answer moves listings *up* or down.** (adapted from the onboarding panel's "Every answer moves real listings up or down.", 7 words, holds ≥2.1s)
Sequential/interaction: yes. Segment fast-forward, three option taps (every other beat, because the labels are read), payoff counter, Finish.
Audio intent: momentum, a sense of building something.
Audio-coupled idea: one select sound per option; a small count tick on the payoff number; a click on Finish setup.
Transition mood: the spinner resolves into the feed (a quick card-stack wipe) → Scene 4

### Scene 4 — The feed — 5.27s (14.22 → 19.49)
The home feed: top bar with the real logo, the segmented tab pill (**For You** active on navy, then Opportunities · Jobs · Events · Resources), and the greeting **Hey, Ada** / "Picks to help you glow up." Three cards cascade up one after another (beat grid, ~0.5s apart), then hold as a set:
1. `Opportunity` chip (orange tint) · deadline pill **3 days left** (urgent: solid orange, navy text) — **Future Leaders Scholarship 2027** — "Tuition, housing and a monthly stipend." — meta: 📍 Lagos, Nigeria · **Fully funded** · **94% match** (orange-ink)
2. `Job` chip (solid navy) — **Junior Data Analyst (Remote)** — meta: Remote · **88% match**
3. `Event` chip (lime tint) — **Tech Careers Meetup** — meta: Sat 12 Oct · Lagos
At **16.86s (strong cue)** the camera pushes in on card 1's meta row so **94% match** reads large, holds ~1.4s, then eases back out.
Caption: **Ranked for *you*, not just listed.** (6 words, holds ≥1.8s)
Sequential/interaction: yes. Three cards arrive one by one (their titles are read during the hold, not during arrival); camera push-in.
Audio intent: the first warm moment, the product doing its job.
Audio-coupled idea: card-slide on the first and last card; a soft accent on the push-in.
Transition mood: continuous; the camera stays on card 1 → Scene 5

### Scene 5 — Like it. Save it. — 3.16s (19.49 → 22.65)
Still on card 1, with the camera slightly pushed in on its action row. Tap **Like**: the heart fills orange with a pop and the count ticks **128 → 129**. Tap **Save**: the bookmark fills and the count ticks **41 → 42**.
Caption: **Like it. *Save* it.** (4 words, holds ≥1.2s)
Sequential/interaction: yes. Two taps on consecutive strong beats (`20.02`, `21.07`).
Audio intent: tactile and satisfying.
Audio-coupled idea: a soft pop on the heart; a lighter click on the bookmark.
Transition mood: continuous; the next tap is on the playlist icon → Scene 6

### Scene 6 — Keep it in a playlist — 5.78s (22.65 → 28.43)
Tap the **Add to playlist** icon on the same action row. The scrim (`rgba(11,18,51,0.55)`) fades in and the **bottom sheet** rises: **Add to playlist**, with the opportunity chip and "Future Leaders Scholarship 2027". Below: the dashed **Create new playlist** row (orange plus tile) and the **YOUR PLAYLISTS** panel:
- card-stack cover · **Scholarships 2027** · 🔒 4 items · outlined **+ Add**
- card-stack cover · **Remote jobs** · 🌐 7 items · outlined **+ Add**
- card-stack cover · **Lagos events** · 🌐 3 items · outlined **+ Add**
Tap **+ Add** on Scholarships 2027. It shows a spinner for a moment, then at **~25.81** turns into the lime **✓ Added** pill and the count goes to 5 items. The sheet slides down, and the toast **Added to Scholarships 2027 · Undo** rises and holds ≥1.4s.
Caption: **Keep it in a *playlist*.** (5 words, holds ≥1.5s)
Sequential/interaction: yes. Sheet rise, rows settle, Add → spinner → Added, sheet down, toast.
Audio intent: a small success.
Audio-coupled idea: card-slide for the sheet; click on Add; a light glass or chip accent on "Added"; a soft drop for the toast.
Transition mood: tap the card → detail push → Scene 7

### Scene 7 — Apply, and we'll ask how it went — 6.85s (28.43 → 35.28)
Tap card 1 and the listing detail pushes in: the navy hero with the orange and lime tiles off the top-right corner, eyebrow "Scholarship · Deadline 2 Oct", title **Future Leaders Scholarship 2027** (Unbounded), and three stat tiles, the closing one **solid orange** because it is ≤3 days away. At the bottom sits the full-width orange **Apply now ↗** next to the round **+** playlist button. Tap **Apply now** at ~29.49.
**Away beat (~1.1s):** the phone's screen slides left to a neutral, unbranded browser page (grey skeleton form, no domain or logo). A small cream chip reads **14 minutes later**. The screen slides back.
The **return sheet** rises: opportunity chip + **Welcome back. Did you get it in?** / "Future Leaders Scholarship 2027 · you were away 14 minutes". Three of the four real options show: **Submitted it — track this one**, "Started, not finished — remind me", "Not for me — stop suggesting these". Tap the first at ~32.65: it fills navy with an orange tick circle.
The sheet dismisses and the **Tracker** tab becomes active in the bottom nav (navy pill, orange filled check-circle). The Tracker page shows the title **Tracker**; the **Submitted** section ("In, and still open.") gains the new row at **~34.23**: opportunity chip · **Future Leaders Scholarship 2027** · orange-tint pill **Closes in 3 days** · status pill **Submitted ▾**. A quiet **Awaiting answer** section sits below it with two invented rows for context.
Caption: **Tap Apply. We'll ask how it *went*.** (from the tracker's own copy "we'll ask how it went when you get back", 7 words, holds ≥2.1s)
Sequential/interaction: yes. Push, Apply tap, away and back, sheet, answer tap, row lands.
Audio intent: the story beat, leaving and coming back.
Audio-coupled idea: click on Apply; the film's only whoosh on the away slide; soft drop for the return sheet; select on the answer; card-place as the tracker row lands.
Transition mood: the camera pushes in on the bottom-nav Tracker icon → Scene 8

### Scene 8 — Get UP — 6.32s (35.28 → 41.60)
The camera pushes in on the active Tracker icon. The orange tick **lifts off** the navy pill, scaling up and out of the phone, and **morphs into the logo's arrow** (the check's strokes straighten into the apex, then the shaft draws down). Meanwhile the phone drops *downward* out of frame and the card-stack tiles slide off, leaving pure navy. The arrow rises to centre. U and P gather in from either side and **lock at 37.92s (strong cue)**, and the frame resolves to the real logo art (`up-logo-navy.png` / `up-mark-orange.png` on navy) with no seam between the morph and the file. At **~38.96** **Get access. Get *UP*.** (Unbounded, cream with orange "UP") settles beneath it and holds ≥2.4s. At **~39.49** two small lines settle together at the bottom: `glowupchannel.com` in orange and `UP is a product by Outsidee Solutions` in muted cream. They hold to the end; the last ~0.5s is a clean, still frame.
Sequential/interaction: yes. Tick lift, morph, rise, lock, CTA, then URL and credit.
Audio intent: the payoff. One deep bell on the lock, ringing out as the music fades under the fine print.
Audio-coupled idea: a light lift accent on the tick; the only bell in the film on the lock.
Transition mood: hold → end

**Music mood for this video:** warm, business-y, upbeat but unhurried
**Audio summary:** The bed arrives with the tiles and carries the whole tour. Every tap has its own small, consistent sound, and each of the three successes (Added, Submitted, logo) gets a bigger one. The film's single whoosh marks leaving for the application, its single bell marks the logo, and the music recedes under the credit.
