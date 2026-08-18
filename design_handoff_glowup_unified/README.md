# Handoff: GlowUp Channel — unified mobile screen set (9 screens)

## Overview
A ten-screen mobile redesign of the GlowUp Channel app, reorganised around one question: *what should I do next?* The four sibling content tabs (Opportunities / Jobs / Events / Resources) collapse into one deadline-ranked feed; a save becomes a tracked commitment with a due date.

**Target codebase: the local `Glowup-diaries-main` folder only.** Do not push to, branch from, or open PRs against the GitHub remote — implement against the local working copy.

## About the design files
The files in this bundle are **design references authored in HTML** — prototypes of intended look and behaviour, not production code to lift. Recreate them inside the existing app: Next.js App Router (`app/`), React Server/Client components, Tailwind CSS with the project's semantic tokens (`bg-page`, `text-caption`, `border-border`, `bg-primary`, `text-primary-foreground`), shadcn/ui primitives in `components/ui/`, and `react-icons/ri` for icons. Use those existing patterns rather than transplanting the inline styles from the HTML.

## Fidelity
**High-fidelity.** Colours, type sizes, weights, radii and spacing in the prototypes are final intent. Match them through the project's Tailwind tokens; where a prototype hex has no token, add one rather than hard-coding.

## The unification (what to build, what to delete)
Fourteen explored screens reduce to nine. Four merges:

| Merge | Result | Kept | Dropped |
|---|---|---|---|
| Opportunity detail + Pipeline | **Opportunity** | dark hero, eligibility quote, step counter, due date | the separate pipeline card; the progress strip now sits under the hero |
| Today feed + Detail | **Today** | one-dark-card-a-day hierarchy, quiet list, fit reasons, effort estimate, applicant count | tap-through to a detail page for the top item; the fit percentage |
| Search + Events/RSVP | **Discover** | one dated list across events, jobs, grants and resources; per-type actions; closing-soonest sort | the standalone Events tab and the standalone Search screen — same route, two states |
| Playlists + Profile + Discover | **You** | glow score reframed as application readiness with named gaps, saved search as standing alert, shared playlists with avatars | vanity completeness %, separate Playlists tab |

Removed as duplicates: standalone Detail, second Discover, Me, Playlists tab, Profile tab, and both alternate home screens.

### Platform-wide rule
**Pipeline replaces Save.** Nothing can be bookmarked without a due date. Every "Save" affordance in the app becomes "Track" and creates a pipeline item with a stage and a deadline.

Concretely in this codebase:
- `components/app-bottom-nav.tsx` — `navItems` becomes **Today `/` · Discover `/discover` · Pipeline `/pipeline` · Me `/profile/[id]`** — four items. Events, Playlist and Settings all leave the tab bar (Events is no longer a destination; its content lives in Discover); Playlists moves under Me as a tab, Settings under `/profile/settings` reachable from Me. Keep the existing active-pill treatment, `min-h-[44px]` targets and safe-area padding. The Pipeline item carries a count badge — render it inline beside the label in a `whitespace-nowrap` row, not absolutely positioned over the text.
- `app/events` and `app/search` collapse into `app/discover` (keep redirects from both). The events list is not events-only — it is every dated item; `data/events_rows.json`, `jobs_rows.json`, `opportunities_rows.json` and `resources_rows.json` merge into one date-sorted query.
- New route `app/pipeline/` (list of tracked items grouped **Due this week / Waiting on them / Closed**). It supersedes the saved-items views; see `docs/SAVED_ITEMS_BACKWARD_COMPATIBILITY.md` before migrating existing saved records — existing saves should backfill as pipeline items with a derived due date from the opportunity deadline.
- `components/feed-card.tsx`, `components/engagement-actions.tsx` — save action → track action.
- `components/add-to-playlist-modal.tsx` / `playlist-modal.tsx` stay, reached from Me.

## Screens
Order is build order; each is a 390×844 frame in the prototype. Screen 05 shows two states of the same route.

**01 Interest setup** (`app/onboarding`) — runs *before* any auth wall. Three steps, step 2 shown. 3-segment progress bar (filled #FF6700, empty #DEE2EA, 3px). Eyebrow "STEP 2 OF 3 · NO ACCOUNT NEEDED" (JetBrains Mono 11px, 0.1em tracking, #8B95AB). H2 31px/1.12, weight 800, -0.03em. Interest chips: pill, 15px, selected = #FF6700 on white text weight 700, unselected = white bg, 1px #DEE2EA border, #2C3650 text. Live preview panel #FFF1E6, radius 18px: "184 open opportunities match. 12 close in the next 7 days." Primary CTA 56px tall, radius 16, #0F1729 → hover #FF6700. Secondary text link "Skip — browse everything instead". Count must update live as chips toggle.

**02 Today** (`app/page.tsx` + `components/feed-container.tsx`) — greeting header (mono date eyebrow + 25px/800 greeting + 42px avatar circle), filter chips (For you / Closing soon / Funding), then **one dark card** (#0B1222, radius 22) for the most urgent item: eyebrow "CLOSES IN 3 DAYS · 1 OF 5 URGENT" in #FF9448, 23px/800 title, org line #9AA3B8, then an inline fit panel (rgba(248,249,251,0.06), radius 14) with three lines — matched (#7FD9A3), missing (#FFC79E), effort + applicant count (#9AA3B8). Actions: "Start application" (#FF6700, 46px, radius 13) + "Snooze" (transparent, 1px rgba(248,249,251,0.24)). Below it, one-line white rows (radius 18, 1px #DEE2EA) with days-left on the right; resources render at `opacity: 0.55`. Footer link "See all 62" in #FF6700. Card expands/collapses in place — no navigation for the top item.

**03 Opportunity** (`app/opportunities/[id]`) — dark hero #0B1222: back arrow + Share, mono eyebrow "GRANT · CLOSES 31 AUG 2026" (#FF9448), 27px/800 title, org line, then three stat cells (AMOUNT / SPOTS / LEFT); the LEFT cell is rgba(255,103,0,0.16) with #FF9448 value. Immediately under the hero, the pipeline band: #FFF1E6, 1px bottom #FFCFAB, "IN YOUR PIPELINE" (mono, #C24E00) + "Step 2 of 4 · due 22 Aug", and a 4-segment 4px progress strip (#FF6700 filled, #FFC79E empty). Body: "What you still need" rows (white, radius 13) — satisfied rows show "On file" in #1F6E3C, unsatisfied show "Add" in #FF6700 with a #FFC79E border. "Why you're seeing this" card carries the eligibility line verbatim plus two chips: matched (#1F6E3C on #E9F5EC) and missing (#C24E00 on #FFF1E6). Sticky footer: "Continue application" (#FF6700, 54px, radius 15, hover #C24E00) over a gradient fade, with "Snooze 3 days · Not for me" beneath. **No Save button anywhere.**

**04 Pipeline** (`app/pipeline`) — the tracker list, grouped by "DUE THIS WEEK · 2" / "WAITING ON THEM · 3" (mono 11px group headers, #C24E00 for urgent, #8B95AB otherwise). Each row: white, radius 18, title 16.5px/700, a 4-segment stage strip, and a stage action ("Continue", "Prep", "Nudge") in #FF6700. Day counters ("Day 13") in #8B95AB.

**05 Discover** (`app/discover`, absorbing `app/search` and `app/events`) — **one route, two states.**

*Default state — browse:* 44px search control at the **top left** of the header, then title "Discover" / "Everything with a date on it". Type chips All / Events / Jobs / Grants / This week (active = #FF6700 fill). Body is a single dated list grouped "TOMORROW" (#C24E00 mono eyebrow) then "NEXT 30 DAYS · ALL TYPES" (#8B95AB) — **events, jobs, grants and resources interleaved by date**, because a job closing 24 Aug and a mixer on the 16th compete for the same week. Each row: 34px date block (mono month + 17px/800 day), title 15px/700, meta line naming the type, and a type-specific action pill — **RSVP** (event, #FF6700 text on 1px #FFC79E), **Apply** (job, same), **Track** (opportunity, filled #FF6700 white text), **Open** (resource, #5C6780, row at `opacity: 0.6`). Deadline rows carry a #FFC79E border and #C24E00 date. Tomorrow's item renders as the dark featured card (#0B1222, radius 20) with its RSVP state inline ("You're going" + calendar). Footer strip: "4 tracked · 3 RSVPs" + "Add to calendar ↗".

*Search state — after tapping the top-left control:* header swaps for the query field — search field (radius 16, 52px, #EFF2F7) with a Clear affordance; filter chips row (Remote / Paid / Type / Deadline) with the active chip filled #FF6700; "61 results · Sort: closing soon". A saved-search row offers "Save this search?" → Save button; sort defaults to closing-soonest, never relevance. Reuse `components/enhanced-search.tsx` and `hooks/use-search-feed.ts` / `use-search-facets.ts`.

**06 You** (`app/profile/[id]`) — avatar + name (20px/800) + "Product designer · Lagos · 26". Dark readiness card #0B1222 radius 20: mono "APPLICATION READINESS", 30px/800 percentage, a two-part 5px bar (#FF6700 / rgba(248,249,251,0.16)), and the unlock line naming the exact gaps ("Add a pitch deck and a 60-second intro video to unlock **23 more opportunities**"). Then pill tabs **Readiness / Searches / Playlists** (active = #0F1729 fill). Readiness rows mirror screen 03's pattern (Ready in #1F6E3C, Add/Record in #FF6700). Searches tab holds standing searches with alert counts; Playlists holds shared lists with overlapping 22px avatars (−7px margin) and a "+2" chip in #FF6700.

**07 Alerts** (`app/notifications`) — grouped "THIS WEEK" / "THIS YEAR". Only four notification reasons exist and the screen says so explicitly: a deadline you saved is 24h out, a new match on a saved search, the weekly digest, someone touched a shared playlist. Footer states "No 'you might like' pushes." Do not add engagement pushes.

**08 Resources** (`app/resources`) — resources appear inside the flow that needs them, not as a tab: cards name the requirement they satisfy ("The one thing requirement on Vital Impacts, 4 pages, 8 min read") with an Open action, and a "Ready to use — nothing to download" footer note.

**09 Re-entry sheet** — a bottom sheet on return after a deadline passed: "Welcome back. Did you get it in?" with three options — "Submitted it — track this one" (#FF6700 fill), "Started, not finished — remind me Thu", "Not for me — stop suggesting these". This is the only place outcome data is captured; it feeds ranking.

## Interactions & behaviour
- Interest chips update the live match count immediately (client state, no fetch per toggle).
- Today's urgent card expands/collapses in place; chevron rotates 180°, 200ms ease.
- Track/Continue creates or advances a pipeline item; stage strip animates one segment, 250ms.
- Snooze removes the item from Today for N days and keeps it in Pipeline.
- Re-entry sheet fires on first open after a tracked deadline passes; dismissal defers 24h.
- Buttons: `active:scale-95`, 200ms; hover on primary #FF6700 → #C24E00.
- Tap targets ≥44px throughout. Labels `whitespace-nowrap` in the tab bar.

## State
`interests[]`, `matchCount`, `expandedFeedItemId`, `pipelineItems[{id, stage, dueDate, requirements[]}]`, `savedSearches[{query, filters, alertsOn, newCount}]`, `readinessItems[{label, status}]`, `reentryQueue[]`. Existing contexts to extend: `contexts/playlist-context.tsx`, `contexts/page-context.tsx`, `lib/auth-context.tsx`.

## Design tokens
Ink #0F1729 · deep card #0B1222 · body #2C3650 · secondary #3A4358 · muted #5C6780 · faint #8B95AB · on-dark muted #9AA3B8 · on-dark bright #C9CFDD · page #E9ECF2 · alt page #DDE1E9 · surface #FBFCFD · frame #F8F9FB · field #EFF2F7 · border #DEE2EA · strong border #C0C6D2 · accent #FF6700 · accent hover #C24E00 · accent light #FF9448 · accent tint #FFF1E6 · accent tint border #FFCFAB · success #1F6E3C on #E9F5EC · on-dark success #7FD9A3.
Radii 6 / 12 / 13 / 15 / 16 / 18 / 20 / 22 / 28 / 42 / 999px. Spacing 4-based: 5 6 7 9 10 12 14 16 18 20 22 24 26 30 34 56 72. Type: Plus Jakarta Sans 400–800 (UI), JetBrains Mono 400–500 (eyebrows/meta, 0.08–0.1em tracking). Scale 9.5 10.5 11 11.5 12 12.5 13 13.5 14 14.5 15 16 16.5 17 18 19 20 23 25 26 27 30 31 32 43 46. Shadow `0 30px 60px -30px rgba(15,23,41,0.28)` (phone frames only).

## Assets
None. All icons in the prototypes are text or CSS shapes — substitute `react-icons/ri` equivalents already used in the app. No imagery is required; if the events and playlists cards get photography later, they take 16:9 crops at radius 18.

## Files in this bundle
- `GlowUp Unified.dc.html` — **the source of truth**: the nine screens in build order, each with a note on what it kept and dropped.
- `GlowUp Board.dc.html` — full exploration: the three merged screens, the eight shared screens and the original six, for context on rejected alternatives.
