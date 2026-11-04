---
name: up-upgrader
description: Code and growth audit for UP. Asks what to focus on (speed, bugs, dead code, growth features, or everything), then sends parallel agents through the backend (latest-glowup-channel/) and the frontend (Next app) to find slow paths, real bugs, code worth deprecating and features that would bring more views and active users. Measures before it claims, ranks every finding by impact and size, asks the owner the open questions, fixes small sure things on a branch, and writes one ranked upgrade report. Use for /up-upgrader, /up-upgrade, "what can we improve", "make UP faster", "find bugs and dead code", "what feature should we launch next".
---

# /up-upgrader

Input: nothing, or one of `speed`, `bugs`, `deprecate`, `growth`, `all` to skip the first question.

Output: one ranked upgrade report (see Output), a local HTML copy in `docs/upgrades/`, and a short list of questions for the owner. Small sure fixes land as commits on a local branch.

This skill improves the **code and the product**. Platform data clean-up (hiding listings, Work with us, playlists) is /up-maintaining; the moderation queue is /up-approving. If the person asks for those, say so and offer to run that skill instead.

## Public name is UP

Everything an UP skill creates, posts, approves or edits shows **UP** as its public name: playlist creators, item "added by", uploads, notes, anything a user can see. Never "Claude", "claude" or "claude.ai". The login email stays `claude.ai@up.com`; only what people see is UP.

- The account's public first name must be `UP`. If a playlist, listing or API reply shows the creator as `claude` (for example `createdBy.firstName`), put it first under "Needs you": the owner renames the account to UP. Do not change the account yourself.
- Never write "Claude" into a name, title, description, hashtag, cover or message on UP.

## Ground rules

- Read the memory index first (`MEMORY.md`). It holds decisions this skill must respect. In particular:
  - Deprecated, never "improve": `scraper/`, channels/community posts, promotions billing (wallet/Paystack), the old in-app Notification model, Locked In, the digest A/B test. Finding more of their code to **remove** is in scope; fixing or extending it is not.
  - Backend max instances stays 3. Fix load with faster requests, never more instances.
  - Feed latency is N+1 round trips, not the ranking algorithm. Count round trips before profiling anything else.
  - Ranking (location/language/NLP) lives on the frontend in `lib/ranking/`.
  - Never start the `backend` launch config: it uses the production DB and fires real push crons.
  - Type checks: use `npx next build`, not `tsc` (a stale `.next/dev/types` reports a false clean).
  - Stories holdout runs to 7 Dec 2026: no verdict on Stories before then, and don't propose changes that break the holdout.
- **Measure before claiming.** A speed finding needs a number (round trips, ms, KB, query count, bundle size). A bug needs a reproduction or a failing test. A "dead code" finding needs a grep showing no live caller. No number, no claim: put it under "Unverified" instead.
- Never: push, deploy, run migrations, change a setting, edit production data, touch secrets (`upload-keys.local.txt`, `.env*`), or delete a file outside the branch commit rules below.
- Production reads are fine (the live site in the built-in browser; `/up-maintaining`'s read-only `M all` for analytics). Writes are not.

## Step 0: ask what they want

Unless the input names a mode, ask with AskUserQuestion (multiSelect):

- **Speed** - slow pages, slow API routes, N+1 calls, heavy bundles, missing indexes and caches.
- **Bugs** - real broken behaviour worth fixing, with a reproduction.
- **Deprecate** - dead code, unused routes, models, packages and files to delete.
- **Growth features** - what to launch next for more views, sign-ups and returning users.

Then a second AskUserQuestion, single select: **May I fix small sure things on a branch?** - "Yes, on a branch (Recommended)" / "Report only".

Everything below runs only for the picked modes. `all` = every mode.

## Step 1: map and baseline (always, ~5 min)

1. `git status` and `git log -15 --oneline` in the repo root and in `latest-glowup-channel/`. Note uncommitted work and don't touch it.
2. Run in the background and keep the output as the baseline:
   - frontend: `npx vitest run`, `npx eslint .`, `npx next build` (keep the route table with first-load JS sizes)
   - backend: `npm test` in `latest-glowup-channel/`
3. If `~/up-maintenance/<today>/analytics.json` exists, read it. Otherwise, and only if the person picked Growth, run `/up-maintaining`'s read-only `M all` (needs `~/.up-uploader.env`; no key = skip and say so). Pull: top pages and kinds by views, zero-view share, save/share/click rates, countries, push open rates, Stories numbers.

## Step 2: send the agents (parallel)

Start one `general-purpose` agent per picked mode, in one message, so they run at once. Give each: its brief below, the ground rules above (paste them), the baseline numbers, and "report findings as a list of {title, evidence, file:line, impact, size, fix}; measure, don't guess; read-only, no edits".

**Speed agent**
- Feed and list endpoints: trace one request from the page (`app/feed`, `app/jobs`, `app/opportunities`, `app/events`, `lib/for-you-feed.ts`, `lib/fetch-*`) to the controller (`latest-glowup-channel/src/controllers/`). Count backend calls per page load and Mongo queries per request. Flag queries in loops, `populate` chains, missing `.lean()`, missing `projection`, unbounded `find()`, and filters with no matching index (check the models' `index()` calls).
- Caching: what is fetched on every request that changes once a day (taxonomy, tags, platform stats, country lists). Check HTTP cache headers and Next `revalidate`/`cache` settings.
- Frontend weight: the `next build` route table. Any route over ~200 KB first-load JS: find the heavy imports (charts, editors, `framer-motion`, icon packs, `@google/genai` in client code). Client components that could be server components. Images without `next/image` or sizes.
- Live check in the built-in browser at mobile width: `/`, `/feed`, `/jobs`, one listing page. `read_network_requests`: count calls, find duplicates and slow ones (time each). Report the slowest 5.
- Cron worker (`cron-worker/`) and backend crons: jobs that scan whole collections without an index or cursor.

**Bugs agent**
- Start from the failing tests, lint errors and build warnings in the baseline.
- Live site in the built-in browser: `/`, `/feed`, `/jobs`, `/opportunities`, `/events`, `/discover`, `/playlists`, `/search`, `/work-with-us`, `/login`, `/signup`, one listing of each kind, at desktop and mobile width. `read_console_messages` (errors), `read_network_requests` (4xx/5xx), `read_page` for "undefined", "NaN", "Invalid Date", empty sections, broken images.
- Code reading for: unhandled promise rejections in controllers, missing `await`, auth/role checks missing on write routes (compare against `PUBLISHER_ROLES` and `lib/roles.ts`), date/timezone mistakes on deadlines, country filter leaks (a feed showing another country's items when a country is picked), tracking beacons that can fire twice or never.
- Every bug: steps to reproduce, or the failing input. Severity: broken for everyone / broken for some / cosmetic.

**Deprecate agent**
- Dead features from memory: list every file, route, model, cron and package still tied to them (`Scraper/`, `app/channels`, `app/community`, `app/locked-in`, `app/notifications` old model, promotions billing, digest test, `app/promotions-demo`, `app/under-construction`).
- Unused code: exported functions with no importer, API routes with no caller in the frontend, models no controller uses, `package.json` dependencies never imported (check both apps), duplicate helpers doing the same job.
- Root clutter: the many `*_SUMMARY.md`, `*_FIXES*.md`, `test-*.js`, `generate-*-posts.js`, `brag-output-*` folders, `README.md.backup`, `temp_settings.tsx`, `tesst.md`. Say which look safe to archive and which are referenced anywhere.
- For each: proof of no live caller (the grep), what breaks if removed, and the saving (files, lines, KB of bundle, a cron that stops costing money).

**Growth agent**
- Use the analytics from Step 1. State the funnel as numbers where the data allows: visit → listing view → save/apply click → sign-up → returns in 7 days.
- Find the biggest leak in that funnel, then propose features that close it. Look at what the code already half-has (playlists, Stories, tracker, saves, push, country filter, AI assistant plan in `AI_ASSISTANT_BUILD_PLAN.html`, PWA install) before inventing new things; finishing a half-built feature usually beats a new one.
- Idea areas to check, keep only the ones the data supports: SEO landing pages per country/kind/tag (sitemap, `llms.txt`, structured data like JobPosting/Event schema), deadline reminders for saved items, "closing this week" surfaces, share cards that bring people back, sign-up prompts at the moment of value (after a save, before an apply), referral loops, WhatsApp/Telegram channels per country, email digest of new matches, application tracker nudges.
- Each feature: who it is for, which funnel number it moves and by roughly how much (say how you guessed), size (days), what exists already, and the first small version that could ship in a week.

## Step 3: check the findings

When the agents return:
1. Drop anything that conflicts with the ground rules or a memory decision.
2. Re-verify the top 10 by impact yourself: open the file at the line, re-run the measurement or the reproduction. Anything that doesn't hold up moves to "Unverified" or is dropped.
3. Merge duplicates across agents. Rank all findings by **impact ÷ size**. Impact scale: users affected × how much (speed in ms/KB saved, bug severity, views/users gained). Size: minutes / hours / a day / a week+.

## Step 4: ask the owner

Collect the decisions only the owner can make (a feature trade-off, whether a deprecated feature can really be deleted, a product question the data can't answer). Ask up to 4 at once with AskUserQuestion, recommendation first in each. Ask before Step 5 when an answer changes what you'd fix; otherwise put them in the report under "Questions for you".

## Step 5: fix small sure things (only if allowed in Step 0)

- Small and sure = one or two files, a clear cause, a test or build or measurement that proves it. Examples: a missing `.lean()`/projection/index on a hot query, a missing `await`, a crash on undefined, an unused dependency, dead files of a deprecated feature with zero importers.
- Before the first fix: branch `upgrade/<date>` from `main` (skip if already on it). Backend changes are committed in `latest-glowup-channel/`'s own repo if it has one, on a branch of the same name.
- After each fix, re-run the check that proves it, and record the before/after number.
- Commit with `git add .` and a message that says what was wrong, the fix, and the number. End with the attribution line from the system reminder.
- Index changes: add them in the model file only. Never run a migration or build an index on production; list them under "Needs you" with the command.
- Anything bigger goes in the report under "To do next" with file:line and the fix.

## Output

Write the full report as a self-contained HTML file at `docs/upgrades/up-upgrade-<date>.html` (light/dark, UP palette, mobile-friendly, no Artifact publish). Then reply in chat in this shape only. Leave out empty sections. Max 5 lines per section in chat; the rest is in the HTML.

```
Upgrade audit <date> - <modes>
Fixed F · Speed S · Bugs B · Deprecate D · Features G

Fixed by me (branch upgrade/<date>):
1. <what was wrong> - <change> - <before → after> (<file>, <sha>)

Fastest wins (impact ÷ size):
1. <finding> - <evidence/number> - <fix> (<file:line>) - <size>

Bugs worth fixing:
1. <bug> - <repro> - <severity> (<file:line>) - <size>

Deprecate:
1. <thing> - <proof unused> - <saving>

Features to launch:
1. <feature> - moves <funnel step> by ~<x> - first version: <one line> - <days>

Needs you:
1. <action only the owner can do> - <where>

Questions for you:
1. <question> - my pick: <recommendation>

Full report: docs/upgrades/up-upgrade-<date>.html
```

End with one line: the single change that would help the most this week, and its size.
