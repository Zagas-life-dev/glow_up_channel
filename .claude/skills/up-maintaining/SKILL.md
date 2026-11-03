---
name: up-maintaining
description: Platform maintenance and clean-up for UP. Asks what the person wants (full agent sweep, clean-up only, Work with us, analytics, playlists, bugs), then walks the platform by API and browser - hides live listings that are closed, duplicated, dead-linked or don't belong, lists Work with us orders waiting on a reply, checks tracking, push/email and Stories numbers, finds stale playlists, runs tests and fixes small bugs on a branch - and reports back what it fixed and what needs work. Use for /up-maintaining, /up-maintain, "clean up the platform", "platform maintenance", "what needs fixing on UP".
---

# /up-maintaining

Input: nothing, or one of `sweep`, `cleanup`, `work-with-us`, `analytics`, `playlists`, `bugs` to skip the question.

Output: one report (see Output): what was fixed, what needs the owner, and what to improve next.

## Setup (once per laptop)

- Needs Node 18+. The client is `maintain.mjs` in this skill's folder. Below, `M` means `node "<this skill folder>/maintain.mjs"`.
- Same personal key as /up-uploading, from `~/.up-uploader.env` (`UP_UPLOAD_KEY=upk_...`). Never print, paste, ask for or store the key anywhere else. Missing key: stop and tell the person to get one from the UP owner.
- Run `M me` first. 401 = bad or revoked key. 403 = the account is not an active admin; only the owner fixes that. Never change the account's role, status or permissions.
- A 404 on any `maintenance/*` route means the backend with `controllers/maintenanceController.js` is not deployed yet. Say so and continue with the parts that don't need it (bugs, playlists via /up-playlist).
- It works on the **production** backend. A hide takes a listing off the site at once. Every hide is backed up whole in `maintenance_log` and can be restored from the moderation page's Hidden tab.

## Step 0: ask what they want

Unless the input already names a mode, ask with AskUserQuestion (multiSelect) before doing anything:

- **Full sweep (agent)** - every check below, fixes what it safely can, one report.
- **Clean-up only** - dead, closed, duplicate and off-topic live listings; half-dead playlists.
- **Work with us** - orders waiting on a reply, with draft replies.
- **Analytics** - tracking health, content performance, push/email and Stories.

"Other" covers playlists or bugs only. If they name something this skill doesn't cover, say which skill does (/up-approving for the queue, /up-uploading for new listings, /up-playlist for lists) and offer to run it.

Then run only the sections they picked. Full sweep runs A-F in order.

## What it may do without asking

- Hide **up to 50** live listings per run through `M hide`, for the reasons below. Past 50, stop hiding and list the rest under "Needs you".
- Fix small code bugs on a local branch and commit them (rules in F).
- Never: delete anything, edit a live listing's fields, approve or reject a Work with us order, send a message to a customer, push a branch, deploy, change a setting, start the local backend (it talks to the production DB and fires real push crons), or touch `scraper/`, channels/community posts, or promotions billing code (all deprecated).

## A. Health

1. `M all`. It saves every read to `~/up-maintenance/<date>/` and prints counts. Read the saved files for detail, never paste them whole.
2. From `overview.json`: database ping over 1500 ms, or any kind with `oldestPendingDays` over 3, goes in the report. Pending above 0 means the moderation queue needs /up-approving; offer to run it, don't run it inside this skill.

## B. Clean-up (live listings)

From `cleanup.json`. Check each candidate before you hide it. Write the hides to `~/up-maintenance/<date>/hide-plan.json` as `{ "items": [ { "kind", "id", "reason", "note" } ] }`, `reason` from: `closed`, `duplicate`, `dead_link`, `not_for_up`, `broken`.

1. **Past date still live** (`pastDate`): the feeds already hide these, but they sit in the live collection. Check the source once for a new deadline or edition. New date found: put it under "Needs you" with the date and source (the key can't edit live listings). Otherwise hide, `closed`.
2. **Duplicates** (`duplicates.groups`, most-viewed first in each group): open both. Same organisation and same role/programme/edition: keep the first (most views), hide the others, `duplicate`, note `kept <id>`. Different listings (other city, other edition): leave them.
3. **Dead links**: open `links.json` (most-viewed first) and check the top 100 `url`s, WebFetch first, the built-in browser's `get_page_text` when blocked or JS-rendered. A 404, a parked domain, a login wall or an unrelated page is dead. Web-search the title + organisation for the real page. Found: "Needs you" with the new link. Not found and the listing can't be applied to any other way: hide, `dead_link`.
4. **Doesn't belong** (party, giveaway, sale, MLM, news with nothing to apply to, spam, test post), spotted anywhere above: hide, `not_for_up`.
5. **Missing fields** (`missing.listings`, each with `gaps`): don't hide for this. A listing with no link and no other way to apply is `broken`; the rest go in the report grouped by gap, as fixes for the owner.
6. `M check hide-plan.json`, fix any `invalid`, then `M hide hide-plan.json`. Retry a `failed` item at most once.

## C. Work with us

From `work-with-us.json` (oldest first). For each item: what was bought, who (name, email), status, `waitingDays`.
- `pending_review` or `needs_clarification` waiting over 2 days: urgent.
- `awaiting_payment` over 3 days: probably abandoned; suggest a nudge.
- Draft a short reply for each urgent one, in UP's voice, signed "The UP team". Put it in the report. Never send it.
Approval and rejection stay with the owner on the Work with us admin page (payment is re-checked there).

## D. Analytics

From `analytics.json`:
- **Tracking health**: any day in `tracking.zeroViewDays`, or a day where views fall below 20% of the window's median, is a bug (a beacon broke, not a quiet day). Same for `save`, `like`, `share` and `clicks` going to zero while views continue. Look for the cause in F.
- **Content**: count of `zeroViews` (live a week, never opened); the 5 oldest as examples. `top` 5 by window views. In `supplyByCountry`, countries with under 10 open listings, and any kind at 0 in the top 5 countries: these are where /up-uploading should go next.
- **Push/email**: per kind in `notifications.byKind`, the share that ended `failed`, `no_device` or `capped`. Over 30% failed is a bug. A kind at 0 sends in the window that used to send is a stopped cron. `pushDevices` trend goes in the report.
- **Stories**: report the read-out in `stories` (Stories vs feed, vs holdout) as numbers, no verdict before the holdout ends on 7 Dec 2026.

## E. Playlists

- From `cleanup.json` `playlists.lists`: lists with under half their items live. `mine: true` ones: offer /up-playlist --update. Others: the monthly cleanup worker handles fully dead public lists; report the half-dead ones with their names.

## F. Bugs and code

Work in the repo checkout (`Glowup-diaries-main/`, backend in `latest-glowup-channel/`).

1. Run, in the background where slow, and read the failures:
   - backend: `npm test` in `latest-glowup-channel/`
   - frontend: `npx vitest run`, `npx eslint .`, `npx next build` (not `tsc`: a stale `.next/dev/types` reports a false clean)
2. Browse the live site in the built-in browser: `/`, `/jobs`, `/opportunities`, `/events`, `/discover`, `/work-with-us`, one listing page of each kind. Use `read_console_messages` (errors only), `read_network_requests` (4xx/5xx), and `read_page` for empty sections, broken images and "undefined"/"NaN" in text. Check at mobile width too.
3. Every tracking or push problem from D: find the code path and the cause.
4. **Fix it yourself** when the fix is small and sure: one or two files, a clear cause, and a test or build that proves it. Before the first fix, create branch `maintenance/<date>` from `main` (skip if already on it). After each fix, re-run the check that caught it. Commit with `git add .` and a message that says what broke and why. Never push, never deploy.
5. Anything bigger (a design change, a migration, an unclear cause, more than ~3 files) goes in the report under "To improve", with the file and line and the fix you'd make.

## Output

Reply in this shape, nothing else. Leave out empty sections. More than 10 lines in a section: show 10 and write "+ N more in ~/up-maintenance/<date>/".

```
Maintenance <date> - <modes run>
Fixed F · Hidden H · Needs you N · To improve I

Fixed by me:
1. <what was broken> - <what I changed> (<file>, commit <short sha> on maintenance/<date>)

Hidden (restorable from Moderation > Hidden):
1. <title> (<kind>, <country>) - <reason>

Needs you:
1. <the one thing to do or decide> - <where: link, page or file>

Work with us waiting:
1. <title> - <name, email> - <status>, <N> days - draft reply: "<text>"

Analytics:
- Tracking: <ok, or the broken metric and days>
- Content: <zero-view count>, thin countries: <list>, top: <1-3 titles>
- Push/email: <per kind: sent / failed %>, <devices>
- Stories: <numbers>

To improve:
1. <problem> - <proposed fix> (<file:line>) - <rough size: minutes / hours / a day>
```

End with one line: the single most important next action for the owner.
